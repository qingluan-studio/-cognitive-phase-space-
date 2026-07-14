"""
对话记忆模块 - Conversation Memory Module

CEE 认知涌现引擎中端核心模块。管理对话会话从短时工作记忆到长时归档的完整记忆层级。

双轨制:
  - 工程版: LFU/LRU 驱逐 + token 预算管理 + JSON 归档
  - 理论版: 记忆巩固假说 (MCH) + 艾宾浩斯遗忘曲线 + 激活扩散模型

零外部依赖, 纯标准库实现, 手动实现余弦相似度。
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import re
import threading
import time
from collections import OrderedDict, defaultdict
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_MAX_MESSAGES = 500
DEFAULT_TOKEN_BUDGET = 32000
DEFAULT_STORAGE_DIR = "~/.cee_storage/conversations/"
DEFAULT_CHINESE_CHARS_PER_TOKEN = 4.0
DEFAULT_ENGLISH_WORDS_PER_TOKEN = 1.3
DEFAULT_CONTEXT_WINDOW = 4096


class MessageRole(Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class MemoryTier(Enum):
    WORKING = "working"
    SHORT_TERM = "short_term"
    LONG_TERM = "long_term"
    ARCHIVE = "archive"


class EvictionPolicy(Enum):
    LFU = "lfu"
    LRU = "lru"
    HYBRID = "hybrid"


# ═══════════════════════════════════════════════════════════════════
# 理论版公式注释块
# ═══════════════════════════════════════════════════════════════════

_MEMORY_THEORY = r"""
理论版: 记忆巩固假说 (Memory Consolidation Hypothesis)

1. 突触巩固: dw_ij/dt = -λ·w_ij + η·(pre_i · post_j)
2. 系统巩固: P(transfer | age=t, access=k) = σ(α·log(t) + β·k)
3. 艾宾浩斯遗忘曲线: R(t) = exp(-t / S), S_k = S_0 · (1 + γ·k)
4. 激活扩散: threshold_i(t+1) = threshold_i(t) · exp(-d_ij · a_j)
"""


# ═══════════════════════════════════════════════════════════════════
# 工具函数
# ═══════════════════════════════════════════════════════════════════


def estimate_tokens(text: str) -> int:
    r"""估算文本 token 数。中文 ~4 chars/token, 英文 ~1.3 words/token。

    理论版: tokens ≈ H(text) / H_avg(token), H(text) = -Σ p(w_i) · log₂(p(w_i))
    """
    if not text:
        return 0
    chinese = sum(1 for c in text if "\u4e00" <= c <= "\u9fff" or "\u3400" <= c <= "\u4dbf")
    english = len(re.findall(r"[a-zA-Z]+", text))
    other = len(text) - chinese - english
    return max(1, math.ceil(chinese / DEFAULT_CHINESE_CHARS_PER_TOKEN
                            + english * DEFAULT_ENGLISH_WORDS_PER_TOKEN
                            + other * 0.25))


def cosine_similarity(a: list[float], b: list[float]) -> float:
    r"""手动实现余弦相似度: dot(a,b) / (||a|| · ||b||)。

    理论版: 超球面测地线距离变换: sim = 1 - θ/π, θ = arccos(dot/(||a||·||b||))
    """
    if not a or not b:
        return 0.0
    n = min(len(a), len(b))
    if n == 0:
        return 0.0
    dot = sum(a[i] * b[i] for i in range(n))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(0.0, dot / (norm_a * norm_b))


def _extract_keywords(text: str, max_kw: int = 20) -> list[str]:
    words = re.findall(r"\b\w{2,}\b", text.lower())
    freq: dict[str, int] = {}
    for w in words:
        if len(w) > 1:
            freq[w] = freq.get(w, 0) + 1
    return [w for w, _ in sorted(freq.items(), key=lambda x: x[1], reverse=True)[:max_kw]]


# ═══════════════════════════════════════════════════════════════════
# Message
# ═══════════════════════════════════════════════════════════════════


@dataclass
class Message:
    """单条对话消息。每条消息是认知图式的一个实例, embedding 是其高维语义坐标。"""

    role: MessageRole
    content: str
    timestamp: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)
    token_count: int = 0
    embedding: list[float] = field(default_factory=list)
    message_id: str = ""

    def __post_init__(self) -> None:
        if not self.message_id:
            raw = f"{self.timestamp}-{self.role.value}-{self.content[:20]}"
            self.message_id = hashlib.sha256(raw.encode()).hexdigest()[:16]
        if self.token_count == 0 and self.content:
            self.token_count = estimate_tokens(self.content)

    def to_dict(self) -> dict[str, Any]:
        return {
            "role": self.role.value, "content": self.content,
            "timestamp": self.timestamp, "metadata": self.metadata,
            "token_count": self.token_count, "embedding": self.embedding,
            "message_id": self.message_id,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Message:
        return cls(
            role=MessageRole(data["role"]), content=data["content"],
            timestamp=data.get("timestamp", time.time()),
            metadata=data.get("metadata", {}),
            token_count=data.get("token_count", 0),
            embedding=data.get("embedding", []),
            message_id=data.get("message_id", ""),
        )


@dataclass
class SearchResult:
    """检索结果, 包含相关性评分和来源消息。"""
    message: Message
    score: float
    source_tier: MemoryTier
    match_type: str = "semantic"

    def __lt__(self, other: SearchResult) -> bool:
        return self.score < other.score


# ═══════════════════════════════════════════════════════════════════
# MemoryStore — 消息存储 (LFU/LRU 驱逐 + token 预算)
# ═══════════════════════════════════════════════════════════════════


class MemoryStore:
    r"""消息存储, 固定容量 + LFU/LRU 混合驱逐 + token 预算管理。

    理论版: 记忆强度 S_i = α·log(1+access_i) + β·exp(-age_i/τ) + γ·importance_i
            强度最低者优先驱逐。
    """

    def __init__(
        self,
        max_messages: int = DEFAULT_MAX_MESSAGES,
        token_budget: int = DEFAULT_TOKEN_BUDGET,
        policy: EvictionPolicy = EvictionPolicy.HYBRID,
    ) -> None:
        self._max_messages = max_messages
        self._token_budget = token_budget
        self._policy = policy
        self._messages: OrderedDict[str, Message] = OrderedDict()
        self._access_counts: dict[str, int] = defaultdict(int)
        self._last_access: dict[str, float] = {}
        self._total_tokens: int = 0
        self._lock = threading.RLock()

    @property
    def size(self) -> int:
        with self._lock: return len(self._messages)

    @property
    def total_tokens(self) -> int:
        with self._lock: return self._total_tokens

    @property
    def is_full(self) -> bool:
        with self._lock: return len(self._messages) >= self._max_messages

    @property
    def budget_exceeded(self) -> bool:
        with self._lock: return self._total_tokens > self._token_budget

    def add(self, message: Message) -> None:
        with self._lock:
            if message.message_id in self._messages:
                old = self._messages[message.message_id]
                self._total_tokens -= old.token_count
                self._messages[message.message_id] = message
                self._total_tokens += message.token_count
                return
            while len(self._messages) >= self._max_messages:
                self._evict_one()
            self._messages[message.message_id] = message
            self._access_counts[message.message_id] = 1
            self._last_access[message.message_id] = time.time()
            self._total_tokens += message.token_count
            while self._total_tokens > self._token_budget and len(self._messages) > 1:
                self._evict_lowest_priority()

    def get(self, message_id: str) -> Message | None:
        with self._lock:
            msg = self._messages.get(message_id)
            if msg:
                self._access_counts[message_id] += 1
                self._last_access[message_id] = time.time()
            return msg

    def remove(self, message_id: str) -> bool:
        with self._lock:
            msg = self._messages.pop(message_id, None)
            if msg:
                self._total_tokens -= msg.token_count
                self._access_counts.pop(message_id, None)
                self._last_access.pop(message_id, None)
                return True
            return False

    def get_all(self) -> list[Message]:
        with self._lock: return list(self._messages.values())

    def get_recent(self, n: int = 10) -> list[Message]:
        with self._lock:
            msgs = sorted(self._messages.values(), key=lambda m: m.timestamp, reverse=True)
            for m in msgs[:n]:
                self._access_counts[m.message_id] += 1
                self._last_access[m.message_id] = time.time()
            return msgs[:n]

    def get_by_role(self, role: MessageRole) -> list[Message]:
        with self._lock: return [m for m in self._messages.values() if m.role == role]

    def search_by_keyword(self, query: str, limit: int = 10) -> list[SearchResult]:
        keywords = _extract_keywords(query)
        results: list[SearchResult] = []
        with self._lock:
            for msg in self._messages.values():
                score = 0.0
                cl = msg.content.lower()
                for kw in keywords:
                    cnt = cl.count(kw)
                    if cnt > 0:
                        score += cnt * (len(kw) / max(len(cl), 1)) * 10
                if score > 0:
                    results.append(SearchResult(msg, score, MemoryTier.WORKING, "keyword"))
            results.sort(key=lambda r: r.score, reverse=True)
            for r in results[:limit]:
                self._access_counts[r.message.message_id] += 1
                self._last_access[r.message.message_id] = time.time()
            return results[:limit]

    def search_by_time(self, start: float | None = None,
                       end: float | None = None) -> list[Message]:
        with self._lock:
            msgs = list(self._messages.values())
            if start is not None:
                msgs = [m for m in msgs if m.timestamp >= start]
            if end is not None:
                msgs = [m for m in msgs if m.timestamp <= end]
            return sorted(msgs, key=lambda m: m.timestamp)

    def search_by_embedding(self, query_emb: list[float], limit: int = 10,
                            min_sim: float = 0.0) -> list[SearchResult]:
        with self._lock:
            results: list[SearchResult] = []
            for msg in self._messages.values():
                if not msg.embedding:
                    continue
                sim = cosine_similarity(query_emb, msg.embedding)
                if sim >= min_sim:
                    results.append(SearchResult(msg, sim, MemoryTier.WORKING, "embedding"))
            results.sort(key=lambda r: r.score, reverse=True)
            for r in results[:limit]:
                self._access_counts[r.message.message_id] += 1
                self._last_access[r.message.message_id] = time.time()
            return results[:limit]

    def get_token_usage(self) -> dict[str, Any]:
        with self._lock:
            return {"total_tokens": self._total_tokens, "budget": self._token_budget,
                    "utilization": self._total_tokens / max(1, self._token_budget),
                    "message_count": len(self._messages)}

    def clear(self) -> None:
        with self._lock:
            self._messages.clear(); self._access_counts.clear()
            self._last_access.clear(); self._total_tokens = 0

    def to_list(self) -> list[dict[str, Any]]:
        with self._lock: return [m.to_dict() for m in self._messages.values()]

    # ── 内部驱逐方法 ──────────────────────────────────────────────

    def _evict_one(self) -> None:
        if not self._messages: return
        if self._policy == EvictionPolicy.LFU:
            vid = min(self._messages, key=lambda m: self._access_counts.get(m, 0))
        elif self._policy == EvictionPolicy.LRU:
            vid = min(self._messages, key=lambda m: self._last_access.get(m, 0.0))
        else:
            now = time.time()
            vid = min(self._messages,
                      key=lambda m: math.log(1 + self._access_counts.get(m, 0))
                      / (1 + (now - self._last_access.get(m, 0.0)) / 60.0))
        if vid:
            self._do_evict(vid)

    def _evict_lowest_priority(self) -> None:
        rp = {MessageRole.SYSTEM: 4.0, MessageRole.USER: 2.0,
              MessageRole.ASSISTANT: 1.0, MessageRole.TOOL: 0.5}
        now = time.time()
        lowest_id, lowest_score = None, float("inf")
        for mid, msg in self._messages.items():
            s = rp.get(msg.role, 1.0) * math.exp(-(now - self._last_access.get(mid, msg.timestamp)) / 3600.0)
            if s < lowest_score:
                lowest_score, lowest_id = s, mid
        if lowest_id:
            self._do_evict(lowest_id)

    def _do_evict(self, mid: str) -> None:
        msg = self._messages.pop(mid, None)
        if msg:
            self._total_tokens -= msg.token_count
            self._access_counts.pop(mid, None)
            self._last_access.pop(mid, None)


# ═══════════════════════════════════════════════════════════════════
# MemoryRetriever — 语义检索 + 上下文组装
# ═══════════════════════════════════════════════════════════════════


class MemoryRetriever:
    r"""基于嵌入的语义检索器。手动实现余弦相似度, 多层检索 (WORKING → SHORT_TERM → LONG_TERM)。

    理论版: 激活扩散 A_i(t+1) = Σ_j A_j(t) · w_ji · exp(-d_ji / σ)
    """

    def __init__(self, min_similarity: float = 0.3) -> None:
        self._min_sim = min_similarity

    def search(self, query_emb: list[float], stores: dict[MemoryTier, MemoryStore],
               limit: int = 10,
               tiers: list[MemoryTier] | None = None) -> list[SearchResult]:
        if tiers is None:
            tiers = [MemoryTier.WORKING, MemoryTier.SHORT_TERM, MemoryTier.LONG_TERM]
        all_results: list[SearchResult] = []
        for tier in tiers:
            store = stores.get(tier)
            if store is None:
                continue
            for r in store.search_by_embedding(query_emb, limit * 2, self._min_sim):
                r.source_tier = tier
                all_results.append(r)
        return sorted(all_results, key=lambda r: r.score, reverse=True)[:limit]

    def compute_relevance(self, query_emb: list[float], msg: Message,
                          role_weights: dict[MessageRole, float] | None = None,
                          time_decay_lambda: float = 0.0001) -> float:
        if role_weights is None:
            role_weights = {MessageRole.SYSTEM: 1.5, MessageRole.USER: 1.2,
                            MessageRole.ASSISTANT: 1.0, MessageRole.TOOL: 0.8}
        sim = cosine_similarity(query_emb, msg.embedding)
        if sim == 0.0:
            return 0.0
        return sim * math.exp(-time_decay_lambda * (time.time() - msg.timestamp)) \
               * role_weights.get(msg.role, 1.0)

    @staticmethod
    def assemble_context(messages: list[Message], max_tokens: int = DEFAULT_CONTEXT_WINDOW,
                         system_first: bool = True) -> list[Message]:
        r"""组装上下文窗口。系统消息永远保留最前, 从最新消息向前填充至 token 预算。

        理论版: 注意力视场 attention_i = softmax(exp(-λ·(now-t_i)) / temperature)
        """
        if not messages:
            return []
        sys_msgs = [m for m in messages if m.role == MessageRole.SYSTEM]
        other = sorted([m for m in messages if m.role != MessageRole.SYSTEM],
                       key=lambda m: m.timestamp, reverse=True)
        selected: list[Message] = list(sys_msgs) if system_first else []
        token_sum = sum(m.token_count for m in selected)
        for msg in other:
            if token_sum + msg.token_count > max_tokens:
                break
            selected.append(msg)
            token_sum += msg.token_count
        if system_first:
            sp = [m for m in selected if m.role == MessageRole.SYSTEM]
            rp = sorted([m for m in selected if m.role != MessageRole.SYSTEM],
                        key=lambda m: m.timestamp)
            return sp + rp
        return sorted(selected, key=lambda m: m.timestamp)

    @staticmethod
    def format_for_prompt(messages: list[Message]) -> str:
        return "\n".join(f"[{m.role.value.capitalize()}]: {m.content}" for m in messages)


# ═══════════════════════════════════════════════════════════════════
# ConversationSession — 单个对话会话
# ═══════════════════════════════════════════════════════════════════


class ConversationSession:
    r"""单个对话会话管理。标题从首条消息提取, 摘要基于关键句提取。

    理论版: 每次会话是一个认知图式的激活序列, 形成该会话的主题场 (thematic field)。
    """

    def __init__(self, session_id: str | None = None,
                 max_messages: int = DEFAULT_MAX_MESSAGES,
                 token_budget: int = DEFAULT_TOKEN_BUDGET,
                 context_window: int = DEFAULT_CONTEXT_WINDOW) -> None:
        self.session_id = session_id or self._gen_id()
        self._store = MemoryStore(max_messages, token_budget)
        self._context_window = context_window
        self._title: str = ""
        self._summary: str = ""
        self._created_at: float = time.time()
        self._updated_at: float = time.time()
        self._lock = threading.RLock()
        self._retriever = MemoryRetriever()

    @property
    def title(self) -> str: return self._title or "Untitled"

    @property
    def summary(self) -> str: return self._summary

    @property
    def context_window(self) -> int: return self._context_window

    @context_window.setter
    def context_window(self, v: int) -> None: self._context_window = max(1, v)

    @property
    def message_count(self) -> int:
        with self._lock: return self._store.size

    @property
    def total_tokens(self) -> int:
        with self._lock: return self._store.total_tokens

    @property
    def created_at(self) -> float: return self._created_at

    @property
    def updated_at(self) -> float: return self._updated_at

    def add_message(self, message: Message) -> None:
        with self._lock:
            self._store.add(message)
            self._updated_at = time.time()
            if not self._title and message.role == MessageRole.USER and message.content:
                self._title = self._extract_title(message.content)

    def get_messages(self) -> list[Message]:
        return self._store.get_all()

    def get_context_window(self) -> list[Message]:
        return self._retriever.assemble_context(
            self._store.get_all(), self._context_window, True)

    def generate_summary(self) -> str:
        r"""基于关键句提取生成摘要: 3 最长的句子 + 首句 + 尾句。"""
        msgs = self._store.get_all()
        non_sys = [m for m in msgs if m.role != MessageRole.SYSTEM]
        if not non_sys:
            self._summary = ""; return ""

        sentences: list[str] = []
        for m in non_sys:
            for s in re.split(r"[。！？.!?\n]+", m.content):
                if len(s.strip()) > 5:
                    sentences.append(s.strip())

        if not sentences:
            self._summary = non_sys[0].content[:200]; return self._summary

        by_len = sorted(set(sentences), key=len, reverse=True)[:3]
        first, last = sentences[0], sentences[-1]
        parts: list[str] = []
        seen: set[str] = set()
        for p in [first] + by_len + [last]:
            if p and p not in seen:
                seen.add(p); parts.append(p)
        self._summary = "。".join(parts[:5]) + "。"
        return self._summary

    def search(self, query: str = "", query_embedding: list[float] | None = None,
               limit: int = 10) -> list[SearchResult]:
        if query_embedding:
            return self._retriever.search(query_embedding, {MemoryTier.WORKING: self._store}, limit)
        return self._store.search_by_keyword(query, limit)

    def get_token_usage(self) -> dict[str, Any]:
        return {"session_id": self.session_id, "title": self.title,
                "token_usage": self._store.get_token_usage(),
                "message_count": self._store.size,
                "created_at": self._created_at, "updated_at": self._updated_at}

    def to_dict(self) -> dict[str, Any]:
        with self._lock:
            return {"session_id": self.session_id, "title": self._title,
                    "summary": self._summary, "created_at": self._created_at,
                    "updated_at": self._updated_at, "message_count": self._store.size,
                    "messages": self._store.to_list(),
                    "context_window": self._context_window}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ConversationSession:
        s = cls(session_id=data["session_id"],
                context_window=data.get("context_window", DEFAULT_CONTEXT_WINDOW))
        s._title = data.get("title", ""); s._summary = data.get("summary", "")
        s._created_at = data.get("created_at", time.time())
        s._updated_at = data.get("updated_at", time.time())
        for md in data.get("messages", []):
            s._store.add(Message.from_dict(md))
        return s

    def clear(self) -> None:
        with self._lock:
            self._store.clear(); self._title = ""; self._summary = ""

    @staticmethod
    def _gen_id() -> str:
        return hashlib.sha256(f"{time.time()}-{os.urandom(8).hex()}".encode()).hexdigest()[:20]

    @staticmethod
    def _extract_title(content: str) -> str:
        text = content.strip()[:200]
        if len(content) > 200:
            for sep in "。！？.!?\n":
                idx = text.rfind(sep)
                if idx > 20:
                    text = text[:idx + 1]; break
        return text


# ═══════════════════════════════════════════════════════════════════
# MemoryManager — 全局记忆编排器
# ═══════════════════════════════════════════════════════════════════


class MemoryManager:
    r"""全局记忆管理器。编排多会话, 四级存储, 归档与恢复。

    理论版: 系统级记忆巩固 — 不活跃会话从海马体 (WORKING/SHORT_TERM)
            转移到新皮层 (ARCHIVE), 释放计算资源。
    """

    def __init__(self, storage_dir: str = DEFAULT_STORAGE_DIR) -> None:
        self._storage_dir = Path(storage_dir).expanduser()
        self._storage_dir.mkdir(parents=True, exist_ok=True)
        self._sessions: dict[str, ConversationSession] = {}
        self._tier_map: dict[str, MemoryTier] = {}
        self._lock = threading.RLock()
        self._retriever = MemoryRetriever()

    @property
    def session_count(self) -> int:
        with self._lock: return len(self._sessions)

    @property
    def active_sessions(self) -> list[str]:
        with self._lock:
            return [sid for sid, t in self._tier_map.items() if t != MemoryTier.ARCHIVE]

    @property
    def storage_dir(self) -> Path: return self._storage_dir

    def create_session(self, session_id: str | None = None,
                       max_messages: int = DEFAULT_MAX_MESSAGES,
                       token_budget: int = DEFAULT_TOKEN_BUDGET,
                       context_window: int = DEFAULT_CONTEXT_WINDOW) -> ConversationSession:
        s = ConversationSession(session_id, max_messages, token_budget, context_window)
        with self._lock:
            self._sessions[s.session_id] = s
            self._tier_map[s.session_id] = MemoryTier.WORKING
        logger.info("Created session: %s", s.session_id)
        return s

    def get_session(self, session_id: str) -> ConversationSession | None:
        with self._lock:
            s = self._sessions.get(session_id)
            if s is None:
                s = self._load_archived(session_id)
                if s:
                    self._sessions[session_id] = s
                    self._tier_map[session_id] = MemoryTier.SHORT_TERM
            return s

    def archive_session(self, session_id: str) -> bool:
        with self._lock:
            s = self._sessions.get(session_id)
            if s is None:
                return False
            if not s.summary:
                s.generate_summary()
            fp = self._storage_dir / f"{session_id}.json"
            data = s.to_dict()
            data["archived_at"] = time.time()
            data["tier"] = MemoryTier.ARCHIVE.value
            with open(fp, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            del self._sessions[session_id]
            self._tier_map[session_id] = MemoryTier.ARCHIVE
            logger.info("Archived session: %s -> %s", session_id, fp)
            return True

    def load_archived_session(self, session_id: str) -> ConversationSession | None:
        return self._load_archived(session_id)

    def _load_archived(self, session_id: str) -> ConversationSession | None:
        fp = self._storage_dir / f"{session_id}.json"
        if not fp.exists():
            return None
        try:
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
            s = ConversationSession.from_dict(data)
            if not s.summary:
                s.generate_summary()
            return s
        except (json.JSONDecodeError, KeyError, OSError) as e:
            logger.error("Failed to load archived session %s: %s", session_id, e)
            return None

    def list_archived_sessions(self) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for fp in self._storage_dir.glob("*.json"):
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    d = json.load(f)
                result.append({"session_id": d.get("session_id", fp.stem),
                               "title": d.get("title", ""),
                               "summary": d.get("summary", ""),
                               "message_count": d.get("message_count", 0),
                               "created_at": d.get("created_at", 0),
                               "archived_at": d.get("archived_at", 0)})
            except (json.JSONDecodeError, OSError):
                continue
        result.sort(key=lambda x: x.get("archived_at", 0), reverse=True)
        return result

    def add_message(self, session_id: str, message: Message) -> None:
        with self._lock:
            s = self.get_session(session_id)
            if s is None:
                raise ValueError(f"Session not found: {session_id}")
            s.add_message(message)
            self._tier_map[session_id] = MemoryTier.WORKING

    def search(self, query: str = "", query_embedding: list[float] | None = None,
               session_id: str | None = None, limit: int = 10,
               include_archived: bool = False) -> list[SearchResult]:
        if session_id:
            s = self.get_session(session_id)
            return s.search(query, query_embedding, limit) if s else []

        all_results: list[SearchResult] = []
        with self._lock:
            for sid, s in self._sessions.items():
                if not include_archived and self._tier_map.get(sid) == MemoryTier.ARCHIVE:
                    continue
                for r in s.search(query, query_embedding, limit):
                    r.source_tier = self._tier_map.get(sid, MemoryTier.WORKING)
                    all_results.append(r)
        return sorted(all_results, key=lambda r: r.score, reverse=True)[:limit]

    def get_global_token_usage(self) -> dict[str, Any]:
        with self._lock:
            active_tokens = sum(s.total_tokens for sid, s in self._sessions.items()
                                if self._tier_map.get(sid) != MemoryTier.ARCHIVE)
            return {"active_sessions": len(self.active_sessions),
                    "total_sessions": len(self._sessions),
                    "active_tokens": active_tokens,
                    "storage_dir": str(self._storage_dir)}

    def promote_tier(self, session_id: str, target: MemoryTier) -> bool:
        with self._lock:
            if session_id not in self._sessions:
                return False
            if target == MemoryTier.ARCHIVE:
                return self.archive_session(session_id)
            self._tier_map[session_id] = target
            return True

    def auto_tier_management(self, idle_threshold: float = 3600.0) -> dict[str, str]:
        r"""自动层级管理: 空闲 >1h → SHORT_TERM, >24h → LONG_TERM, >7d → ARCHIVE。

        理论版: 记忆巩固的睡眠效应, 低活跃期自动将记忆转入持久存储。
        """
        changes: dict[str, str] = {}
        now = time.time()
        with self._lock:
            for sid, s in list(self._sessions.items()):
                ct = self._tier_map.get(sid, MemoryTier.WORKING)
                idle = now - s.updated_at
                nt = ct
                if ct == MemoryTier.WORKING and idle > idle_threshold:
                    nt = MemoryTier.SHORT_TERM
                elif ct == MemoryTier.SHORT_TERM and idle > idle_threshold * 24:
                    nt = MemoryTier.LONG_TERM
                elif ct == MemoryTier.LONG_TERM and idle > idle_threshold * 168:
                    self.archive_session(sid)
                    changes[sid] = f"{ct.value} -> archive"; continue
                if nt != ct:
                    self._tier_map[sid] = nt
                    changes[sid] = f"{ct.value} -> {nt.value}"
        return changes

    def cleanup_empty_sessions(self) -> int:
        with self._lock:
            to_rm = [sid for sid, s in self._sessions.items() if s.message_count == 0]
            for sid in to_rm:
                del self._sessions[sid]; self._tier_map.pop(sid, None)
            return len(to_rm)

    def stats(self) -> dict[str, Any]:
        with self._lock:
            tiers = defaultdict(int)
            for sid in self._sessions:
                tiers[self._tier_map.get(sid, MemoryTier.WORKING).value] += 1
            return {"total_sessions": len(self._sessions),
                    "tier_distribution": dict(tiers),
                    "archived_files": len(list(self._storage_dir.glob("*.json"))),
                    "total_tokens_active": sum(s.total_tokens for s in self._sessions.values()),
                    "storage_dir": str(self._storage_dir)}


# ═══════════════════════════════════════════════════════════════════
# 便捷函数
# ═══════════════════════════════════════════════════════════════════


def create_message(role: str, content: str,
                   metadata: dict[str, Any] | None = None,
                   embedding: list[float] | None = None) -> Message:
    return Message(MessageRole(role), content, metadata=metadata or {},
                   embedding=embedding or [])
