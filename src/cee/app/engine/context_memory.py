"""
认知涌现引擎 — 统一上下文感知记忆系统
======================================
整合 AutoLearner + MemorySystem + KnowledgeGraph + UserProfile
实现自动学习、上下文记忆、知识关联和用户理解的一体化管道

功能:
  1. 双向自动学习: 从用户提问和AI回复中提取知识
  2. 上下文记忆: 短期/长期记忆交织，跨会话持久化
  3. 知识关联: 知识图谱自动建边，联想推理
  4. 用户画像: 逐步构建兴趣领域、知识水平、风格偏好
  5. 记忆增强: 为每次推理注入相关记忆和知识上下文
  6. 自动学习开关: 可控制学习管道的启停

用法:
    cm = ContextAwareMemory(session_id="user_abc")
    cm.learn_from_conversation("Python装饰器是什么?", "装饰器是...")
    ctx = cm.get_context("Python 性能优化")  # 返回增强上下文
    cm.toggle_learning(True)  # 打开自动学习
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from .memory import MemorySystem, MemoryType, MemoryConfig
from ..local_llm.auto_learner import AutoLearner
from ..local_llm.knowledge_graph import KnowledgeGraph
from ..local_llm.user_profile import UserProfile

STORAGE_DIR = Path(__file__).parent.parent.parent.parent.parent / ".cee_storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
CONTEXT_CONFIG_FILE = STORAGE_DIR / "context_memory_config.json"


@dataclass
class ContextMemoryConfig:
    auto_learn_enabled: bool = True
    auto_graph_enabled: bool = True
    auto_profile_enabled: bool = True
    max_context_facts: int = 5
    max_context_memories: int = 3
    max_graph_nodes: int = 5
    persist_interval: int = 60
    learn_from_user: bool = True
    learn_from_ai: bool = True
    learn_min_confidence: float = 0.3

    def to_dict(self) -> dict:
        return {
            "auto_learn_enabled": self.auto_learn_enabled,
            "auto_graph_enabled": self.auto_graph_enabled,
            "auto_profile_enabled": self.auto_profile_enabled,
            "max_context_facts": self.max_context_facts,
            "max_context_memories": self.max_context_memories,
            "max_graph_nodes": self.max_graph_nodes,
            "persist_interval": self.persist_interval,
            "learn_from_user": self.learn_from_user,
            "learn_from_ai": self.learn_from_ai,
            "learn_min_confidence": self.learn_min_confidence,
        }

    @classmethod
    def from_dict(cls, d: dict) -> ContextMemoryConfig:
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


class ContextAwareMemory:
    """
    统一上下文感知记忆系统

    整合四个子系统:
      - AutoLearner: 知识自学习管道
      - MemorySystem: 短期/长期记忆管理
      - KnowledgeGraph: 知识关联图谱
      - UserProfile: 用户画像引擎

    Usage:
        cm = ContextAwareMemory(session_id="user_abc")

        # 从对话中学习
        cm.learn_from_conversation("什么是涌现?", "涌现是指复杂系统在混沌边缘...")

        # 获取增强上下文
        ctx = cm.get_context("认知涌现的应用")

        # 控制自动学习
        cm.toggle_learning(True)
        stats = cm.stats()
    """

    def __init__(
        self,
        session_id: str = "default",
        config: Optional[ContextMemoryConfig] = None,
    ):
        self._session_id = session_id
        self._config = config or ContextMemoryConfig()
        self._load_config()

        self._memory = MemorySystem(
            config=MemoryConfig(
                persistent_path=str(STORAGE_DIR / f"memory_{session_id}.json"),
                short_term_capacity=200,
                long_term_capacity=20000,
            )
        )

        self._auto_learner = AutoLearner()
        self._knowledge_graph = KnowledgeGraph()
        self._user_profile = UserProfile(session_id=session_id)

        self._last_persist = time.time()
        self._session_msg_count = 0
        self._conversation_buffer: list[dict] = []
        self._lock = threading.RLock()

    def learn_from_conversation(
        self,
        user_text: str,
        ai_response: str = "",
        scores: Optional[dict] = None,
    ) -> dict[str, Any]:
        """
        从一轮对话中全方位学习

        1. AutoLearner 提取事实
        2. MemorySystem 存储对话记忆
        3. KnowledgeGraph 更新关联
        4. UserProfile 更新画像
        """
        result = {"facts": [], "memories": 0, "graph_nodes": 0}

        with self._lock:
            self._session_msg_count += 1
            composite = (scores or {}).get("composite", 0.7)

            # 1. 自动学习 — 从用户输入提取知识
            if self._config.auto_learn_enabled and self._config.learn_from_user:
                facts = self._auto_learner.learn_from(
                    user_text=user_text,
                    composite=composite,
                    source="user_input",
                )
                result["facts"] = [f.fact for f in facts]

            # 2. 从AI回复也学习
            if self._config.auto_learn_enabled and self._config.learn_from_ai and ai_response:
                facts = self._auto_learner.learn_from(
                    user_text=ai_response,
                    composite=max(composite, 0.65),
                    source="ai_response",
                )
                result["facts"].extend([f.fact for f in facts])

            # 3. 存储对话记忆
            if user_text.strip():
                self._memory.remember(
                    content=f"用户说: {user_text[:200]}",
                    memory_type=MemoryType.CONVERSATION,
                    importance=min(0.7, composite * 1.2),
                    tags=["conversation", f"session:{self._session_id}"],
                )

            if ai_response.strip():
                self._memory.remember(
                    content=f"AI回复: {ai_response[:200]}",
                    memory_type=MemoryType.FACT,
                    importance=min(0.7, composite * 1.2),
                    tags=["conversation", "ai_response"],
                    metadata={"scores": scores or {}},
                )
            result["memories"] = 2 if ai_response else 1

            # 4. 更新知识图谱
            if self._config.auto_graph_enabled:
                keywords = self._extract_keywords(user_text + " " + ai_response)
                if keywords:
                    self._knowledge_graph.learn_cooccurrence(keywords, weight=0.35)
                    self._knowledge_graph.absorb_from(
                        user_text + " " + ai_response, keywords
                    )
                    result["graph_nodes"] = len(keywords)

            # 5. 更新用户画像
            if self._config.auto_profile_enabled:
                self._user_profile.update_from_query(user_text)

            # 6. 缓冲对话
            self._conversation_buffer.append({
                "user": user_text[:500],
                "ai": ai_response[:500],
                "ts": time.time(),
            })
            if len(self._conversation_buffer) > 100:
                self._conversation_buffer = self._conversation_buffer[-100:]

            # 7. 定期持久化
            if time.time() - self._last_persist > self._config.persist_interval:
                self._persist()

        return result

    def get_context(self, query: str) -> str:
        """
        为当前查询生成增强上下文

        返回的上下文文本可直接注入到 system prompt 中
        """
        parts = []

        with self._lock:
            # 1. 自动学习的知识扩充
            if self._config.auto_learn_enabled:
                enrichment = self._auto_learner.get_enrichment(
                    query, max_facts=self._config.max_context_facts
                )
                if enrichment:
                    parts.append(enrichment)

            # 2. 长期记忆检索
            memories = self._memory.recall(query, top_k=self._config.max_context_memories)
            if memories:
                lines = ["【相关记忆】"]
                for entry, score in memories:
                    if score > 0.15:
                        lines.append(f"- [{score:.2f}] {entry.content[:150]}")
                if len(lines) > 1:
                    parts.append("\n".join(lines))

            # 3. 知识图谱扩展
            if self._config.auto_graph_enabled:
                for kw in self._extract_keywords(query, max_kw=3):
                    enrichment = self._knowledge_graph.get_enrichment(kw)
                    if enrichment:
                        parts.append(enrichment)
                        break

            # 4. 用户画像上下文
            profile_ctx = self._user_profile.get_context()
            if profile_ctx:
                parts.append(profile_ctx)

        return "\n\n".join(parts) if parts else ""

    def remember_instruction(self, content: str):
        """记忆用户指令"""
        with self._lock:
            self._memory.remember_instruction(content, importance=0.85)
            self._auto_learner.learn_from(
                user_text=content,
                composite=0.85,
                source="user_instruction",
            )

    def recall(self, query: str, top_k: int = 5) -> list[str]:
        """检索相关记忆"""
        with self._lock:
            memory_results = self._memory.recall(query, top_k=top_k)
            fact_results = self._auto_learner.query(query, top_k=top_k)

            seen: set[str] = set()
            combined = []
            for entry, score in memory_results:
                if entry.content not in seen:
                    combined.append(f"[记忆] {entry.content[:200]}")
                    seen.add(entry.content)
            for fact in fact_results:
                if fact not in seen:
                    combined.append(f"[知识] {fact}")
                    seen.add(fact)
            return combined[:top_k]

    def toggle_learning(self, enabled: bool):
        """打开/关闭自动学习"""
        self._config.auto_learn_enabled = enabled
        self._save_config()

    def toggle_graph(self, enabled: bool):
        """打开/关闭知识图谱"""
        self._config.auto_graph_enabled = enabled
        self._save_config()

    def toggle_profile(self, enabled: bool):
        """打开/关闭用户画像"""
        self._config.auto_profile_enabled = enabled
        self._save_config()

    def set_config(self, **kwargs):
        """批量设置配置"""
        for k, v in kwargs.items():
            if hasattr(self._config, k):
                setattr(self._config, k, v)
        self._save_config()

    def get_config(self) -> dict:
        return self._config.to_dict()

    def stats(self) -> dict:
        with self._lock:
            return {
                "session_id": self._session_id,
                "session_msg_count": self._session_msg_count,
                "auto_learn": {
                    "enabled": self._config.auto_learn_enabled,
                    **self._auto_learner.stats(),
                },
                "memory": self._memory.stats(),
                "knowledge_graph": self._knowledge_graph.stats(),
                "user_profile": self._user_profile.stats(),
                "conversation_buffer": len(self._conversation_buffer),
            }

    def _persist(self):
        try:
            self._memory.save()
            self._last_persist = time.time()
        except Exception:
            pass

    def _extract_keywords(self, text: str, max_kw: int = 6) -> list[str]:
        """简单关键词提取"""
        import re
        words = re.findall(r'[\u4e00-\u9fa5]{2,4}|[a-zA-Z]{3,}', text.lower())
        from collections import Counter
        freq = Counter(w for w in words if len(w) >= 2)
        stopwords = {
            "这个", "那个", "什么", "怎么", "一个", "可以", "已经", "还是",
            "the", "and", "for", "that", "this", "with", "from", "have",
        }
        keywords = [w for w, _ in freq.most_common(max_kw * 2) if w not in stopwords]
        return keywords[:max_kw]

    def _save_config(self):
        try:
            CONTEXT_CONFIG_FILE.write_text(
                json.dumps(self._config.to_dict(), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except Exception:
            pass

    def _load_config(self):
        if CONTEXT_CONFIG_FILE.exists():
            try:
                data = json.loads(CONTEXT_CONFIG_FILE.read_text(encoding="utf-8"))
                self._config = ContextMemoryConfig.from_dict(data)
            except Exception:
                pass

    def mark_feedback(self, query: str, response: str, rating: str):
        """
        用户对回复的点赞/点踩反馈
        用于强化/弱化相关记忆
        """
        with self._lock:
            if rating == "like":
                self._memory.remember(
                    content=f"用户喜欢的回复: {response[:150]}",
                    memory_type=MemoryType.PREFERENCE,
                    importance=0.75,
                    tags=["feedback", "positive"],
                )
                keywords = self._extract_keywords(query + " " + response)
                for i in range(len(keywords)):
                    for j in range(i + 1, len(keywords)):
                        self._knowledge_graph.strengthen_edge(
                            keywords[i], keywords[j], boost=0.15
                        )
            elif rating == "dislike":
                self._memory.remember(
                    content=f"用户不喜欢的回复: {response[:150]}",
                    memory_type=MemoryType.PREFERENCE,
                    importance=0.6,
                    tags=["feedback", "negative"],
                )

    def crystallize_knowledge(self) -> dict:
        """Periodic knowledge crystallization -- consolidate recent learning into long-term knowledge.

        This method:
        1. Takes conversation buffer items from recent session
        2. Extracts key topics from the buffer using the knowledge graph
        3. Creates consolidated "crystal" memories from AutoLearner facts
        4. Strengthens important edges in the knowledge graph
        5. Returns crystallization summary
        """
        with self._lock:
            result = {
                "session_id": self._session_id,
                "timestamp": time.time(),
                "buffer_items": len(self._conversation_buffer),
                "facts_crystallized": 0,
                "edges_strengthened": 0,
                "low_quality_removed": 0,
            }

            if not self._conversation_buffer:
                result["status"] = "no_buffer"
                return result

            combined_text = " ".join(
                item.get("user", "") + " " + item.get("ai", "")
                for item in self._conversation_buffer
            )

            keywords = self._extract_keywords(combined_text, max_kw=10)
            if keywords:
                seed_keywords = keywords[:5]
                activated = self._knowledge_graph.hot_activation(seed_keywords, spread=2)

                for kw, activation in activated:
                    if activation >= 0.2:
                        for seed in seed_keywords:
                            if seed in self._knowledge_graph._graph:
                                self._knowledge_graph.strengthen_edge(seed, kw, boost=0.05)
                                result["edges_strengthened"] += 1

                for i in range(len(seed_keywords)):
                    for j in range(i + 1, len(seed_keywords)):
                        self._knowledge_graph.strengthen_edge(
                            seed_keywords[i], seed_keywords[j], boost=0.05
                        )
                        result["edges_strengthened"] += 1

            facts = self._auto_learner._facts
            crystallized_count = 0

            if facts:
                for fact in facts:
                    for item in self._conversation_buffer:
                        user_text = item.get("user", "")
                        if any(word in user_text for word in fact.fact.split()[:3]):
                            fact.recalled_count += 1
                            fact.confidence = min(1.0, fact.confidence + 0.03)
                            crystallized_count += 1
                            break

                result["facts_crystallized"] = crystallized_count

                self._auto_learner._save()

            removed = self._auto_learner.consolidate()
            result["low_quality_removed"] = removed

            self._conversation_buffer = []
            self._save_config()

            result["status"] = "ok"
            return result

    def schedule_crystallization(self, interval_seconds: int = 3600):
        """Schedule periodic knowledge crystallization every interval_seconds."""
        def _run():
            self.crystallize_knowledge()
            self._crystallization_timer = threading.Timer(interval_seconds, _run)
            self._crystallization_timer.daemon = True
            self._crystallization_timer.start()

        if hasattr(self, "_crystallization_timer") and self._crystallization_timer is not None:
            self._crystallization_timer.cancel()

        self._crystallization_timer = threading.Timer(interval_seconds, _run)
        self._crystallization_timer.daemon = True
        self._crystallization_timer.start()

    def get_session_summary(self, max_items: int = 10) -> str:
        """获取当前会话摘要"""
        with self._lock:
            recent = self._conversation_buffer[-max_items:]
            if not recent:
                return ""
            lines = ["【当前会话摘要】"]
            for item in recent:
                lines.append(f"问: {item['user'][:80]}")
                lines.append(f"答: {item['ai'][:80]}")
            return "\n".join(lines)


# 全局单例
_global_context_memory: Optional[ContextAwareMemory] = None
_global_lock = threading.Lock()


def get_global_context(session_id: str = "default") -> ContextAwareMemory:
    global _global_context_memory
    with _global_lock:
        if _global_context_memory is None or _global_context_memory._session_id != session_id:
            _global_context_memory = ContextAwareMemory(session_id=session_id)
        return _global_context_memory
