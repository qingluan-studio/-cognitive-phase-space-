"""中央记忆银行 — 短期工作记忆 + 长期向量化记忆。

BaseAgent 可主动读写记忆，orchestrator 规划前先查记忆库，
避免反复分解相同子目标。
"""

import hashlib
import math
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class MemoryScope(Enum):
    AGENT = "agent"
    TEAM = "team"
    GLOBAL = "global"


class MemoryType(Enum):
    FACT = "fact"
    PLAN = "plan"
    EXPERIENCE = "experience"
    PATTERN = "pattern"
    WARNING = "warning"


@dataclass
class MemoryEntry:
    memory_id: str
    content: str
    memory_type: MemoryType = MemoryType.FACT
    scope: MemoryScope = MemoryScope.GLOBAL
    importance: float = 0.5
    tags: list[str] = field(default_factory=list)
    source_agent: str = ""
    timestamp: float = field(default_factory=time.time)
    access_count: int = 0
    last_accessed: float = 0.0
    embedding: list[float] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def touch(self) -> None:
        self.access_count += 1
        self.last_accessed = time.time()


class ShortTermMemory:
    """短期工作记忆 — 固定容量环形缓冲区，聚焦最近上下文。"""

    def __init__(self, capacity: int = 100) -> None:
        self._capacity = capacity
        self._buffer: list[MemoryEntry] = []
        self._index: dict[str, int] = {}
        self._lock = threading.RLock()

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._buffer)

    @property
    def capacity(self) -> int:
        return self._capacity

    def store(self, entry: MemoryEntry) -> None:
        with self._lock:
            if entry.memory_id in self._index:
                idx = self._index[entry.memory_id]
                self._buffer[idx] = entry
            else:
                if len(self._buffer) >= self._capacity:
                    oldest = self._buffer.pop(0)
                    del self._index[oldest.memory_id]
                self._buffer.append(entry)
                self._index[entry.memory_id] = len(self._buffer) - 1

    def recall(
        self,
        memory_type: Optional[MemoryType] = None,
        tags: Optional[list[str]] = None,
        limit: int = 10,
    ) -> list[MemoryEntry]:
        with self._lock:
            results = self._buffer[:]
            if memory_type:
                results = [e for e in results if e.memory_type == memory_type]
            if tags:
                results = [e for e in results if any(t in e.tags for t in tags)]
            results.sort(key=lambda e: e.timestamp, reverse=True)
            return results[:limit]

    def clear(self) -> None:
        with self._lock:
            self._buffer.clear()
            self._index.clear()

    def to_list(self) -> list[dict]:
        with self._lock:
            return [{"memory_id": e.memory_id, "content": e.content,
                     "memory_type": e.memory_type.value,
                     "importance": e.importance, "tags": e.tags} for e in self._buffer]


class LongTermMemory:
    """长期向量化记忆 — 基于 TF-IDF 余弦相似度的语义检索。

    不依赖外部向量库，使用自建索引。支持衰减遗忘：越久未访问的记忆检索权重越低。
    """

    def __init__(self, max_entries: int = 10000, decay_lambda: float = 0.001) -> None:
        self._max_entries = max_entries
        self._decay_lambda = decay_lambda
        self._entries: dict[str, MemoryEntry] = OrderedDict()
        self._doc_freq: dict[str, int] = {}
        self._lock = threading.RLock()

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._entries)

    def store(self, entry: MemoryEntry) -> None:
        with self._lock:
            if entry.memory_id in self._entries:
                old = self._entries.pop(entry.memory_id)
                self._remove_from_index(old)
            elif len(self._entries) >= self._max_entries:
                oldest_id, _ = self._entries.popitem(last=False)
                self._remove_from_index(self._entries.pop(oldest_id, None) if oldest_id else None)

            tokens = self._tokenize(entry.content)
            entry.embedding = self._compute_tfidf(tokens)
            self._add_to_index(tokens)
            self._entries[entry.memory_id] = entry

    def recall(
        self,
        query: str,
        memory_type: Optional[MemoryType] = None,
        tags: Optional[list[str]] = None,
        min_importance: float = 0.0,
        limit: int = 10,
    ) -> list[MemoryEntry]:
        with self._lock:
            query_tokens = self._tokenize(query)
            query_vec = self._compute_tfidf(query_tokens)

            scored: list[tuple[float, MemoryEntry]] = []
            now = time.time()
            for entry in self._entries.values():
                if memory_type and entry.memory_type != memory_type:
                    continue
                if tags and not any(t in entry.tags for t in tags):
                    continue
                if entry.importance < min_importance:
                    continue
                sim = self._cosine_similarity(query_vec, entry.embedding)
                time_decay = math.exp(-self._decay_lambda * (now - entry.last_accessed))
                score = sim * time_decay * entry.importance
                scored.append((score, entry))

            scored.sort(key=lambda x: x[0], reverse=True)
            results = [e for _, e in scored[:limit]]
            for e in results:
                e.touch()
            return results

    def get_by_id(self, memory_id: str) -> Optional[MemoryEntry]:
        with self._lock:
            entry = self._entries.get(memory_id)
            if entry:
                entry.touch()
            return entry

    def forget_low_importance(self, threshold: float = 0.1) -> int:
        with self._lock:
            to_remove = [mid for mid, e in self._entries.items()
                         if e.importance < threshold]
            for mid in to_remove:
                self._remove_from_index(self._entries.pop(mid))
            return len(to_remove)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
            self._doc_freq.clear()

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return [t.strip().lower() for t in text.split() if len(t.strip()) > 1]

    def _compute_tfidf(self, tokens: list[str]) -> list[float]:
        total = max(len(tokens), 1)
        tf = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
        n = max(len(self._entries), 1)
        vec = []
        for t in sorted(tf):
            tf_val = tf[t] / total
            idf_val = math.log((n + 1) / (self._doc_freq.get(t, 0) + 1)) + 1
            vec.append(tf_val * idf_val)
        return vec if vec else [0.0]

    def _add_to_index(self, tokens: list[str]) -> None:
        for t in set(tokens):
            self._doc_freq[t] = self._doc_freq.get(t, 0) + 1

    def _remove_from_index(self, entry: Optional[MemoryEntry]) -> None:
        if entry is None:
            return
        for t in set(self._tokenize(entry.content)):
            if t in self._doc_freq:
                self._doc_freq[t] -= 1
                if self._doc_freq[t] <= 0:
                    del self._doc_freq[t]

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        if not a or not b or sum(x * x for x in a) == 0 or sum(x * x for x in b) == 0:
            return 0.0
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        n = min(len(a), len(b))
        dot = sum(a[i] * b[i] for i in range(n))
        return max(0.0, dot / (norm_a * norm_b))


class MemoryBank:
    """中央记忆银行 — 统一管理短期和长期记忆。

    使用方式:
        bank = MemoryBank()
        bank.remember("任务X被分解为A→B→C", MemoryType.PLAN, tags=["decompose"])
        results = bank.recall("任务X 分解", memory_type=MemoryType.PLAN)
    """

    def __init__(
        self,
        stm_capacity: int = 100,
        ltm_max: int = 10000,
        decay_lambda: float = 0.001,
    ) -> None:
        self._stm = ShortTermMemory(capacity=stm_capacity)
        self._ltm = LongTermMemory(max_entries=ltm_max, decay_lambda=decay_lambda)
        self._lock = threading.RLock()
        self._id_counter = 0

    @property
    def stm(self) -> ShortTermMemory:
        return self._stm

    @property
    def ltm(self) -> LongTermMemory:
        return self._ltm

    @property
    def total_entries(self) -> int:
        return self._stm.size + self._ltm.size

    def _next_id(self) -> str:
        with self._lock:
            self._id_counter += 1
            return hashlib.sha256(f"{time.time()}-{self._id_counter}".encode()).hexdigest()[:12]

    def remember(
        self,
        content: str,
        memory_type: MemoryType = MemoryType.FACT,
        scope: MemoryScope = MemoryScope.GLOBAL,
        importance: float = 0.5,
        tags: Optional[list[str]] = None,
        source_agent: str = "",
        metadata: Optional[dict] = None,
    ) -> MemoryEntry:
        entry = MemoryEntry(
            memory_id=self._next_id(),
            content=content,
            memory_type=memory_type,
            scope=scope,
            importance=max(0.0, min(1.0, importance)),
            tags=tags or [],
            source_agent=source_agent,
            metadata=metadata or {},
        )
        with self._lock:
            self._stm.store(entry)
            self._ltm.store(entry)
        return entry

    def recall(
        self,
        query: str = "",
        memory_type: Optional[MemoryType] = None,
        tags: Optional[list[str]] = None,
        min_importance: float = 0.0,
        limit: int = 10,
        search_ltm: bool = True,
    ) -> list[MemoryEntry]:
        """搜索记忆：STM 精确标签匹配 + LTM 语义检索。"""
        if query and search_ltm:
            return self._ltm.recall(query, memory_type, tags, min_importance, limit)

        results = self._stm.recall(memory_type, tags, limit)
        if len(results) < limit and search_ltm:
            ltm_results = self._ltm.recall(query or " ".join(tags or []),
                                           memory_type, tags, min_importance,
                                           limit - len(results))
            stm_ids = {e.memory_id for e in results}
            results.extend(e for e in ltm_results if e.memory_id not in stm_ids)
        return results[:limit]

    def recall_by_ids(self, memory_ids: list[str]) -> list[MemoryEntry]:
        results = []
        for mid in memory_ids:
            entry = self._ltm.get_by_id(mid)
            if entry:
                results.append(entry)
            else:
                stm_results = self._stm.recall(limit=100)
                matched = [e for e in stm_results if e.memory_id == mid]
                if matched:
                    results.append(matched[0])
        return results

    def query_ltm(
        self,
        query: str,
        memory_type: Optional[MemoryType] = None,
        limit: int = 10,
    ) -> list[MemoryEntry]:
        return self._ltm.recall(query, memory_type=memory_type, limit=limit)

    def consolidate(self) -> int:
        """长期记忆维护：清除低重要性条目。"""
        return self._ltm.forget_low_importance()

    def stats(self) -> dict[str, Any]:
        with self._lock:
            return {
                "stm_size": self._stm.size,
                "stm_capacity": self._stm.capacity,
                "ltm_size": self._ltm.size,
                "ltm_max": self._ltm._max_entries,
                "total": self.total_entries,
            }

    def clear(self) -> None:
        with self._lock:
            self._stm.clear()
            self._ltm.clear()

    def export_snapshot(self) -> dict[str, Any]:
        return {
            "stm": self._stm.to_list(),
            "ltm_size": self._ltm.size,
            "stats": self.stats(),
        }
