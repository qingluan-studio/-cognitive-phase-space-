"""
持久记忆系统 — 跨会话记忆管理与用户画像

提供:
  - MemorySystem: 记忆管理中枢
  - 短期记忆 (会话内)
  - 长期记忆 (跨会话持久化)
  - 记忆提取 (相关性检索)
  - 记忆衰减 (时间加权)
  - 记忆整合 (去重、合并)
  - 用户画像构建
  - 记忆重要性评分
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import threading
import time
from collections import OrderedDict, Counter
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Optional, Union


# ============================================================
# Data Classes & Enums
# ============================================================

class MemoryType(Enum):
    FACT = "fact"
    PREFERENCE = "preference"
    EVENT = "event"
    INSIGHT = "insight"
    INSTRUCTION = "instruction"
    CONVERSATION = "conversation"


class MemoryScope(Enum):
    SESSION = "session"
    SHORT_TERM = "short_term"
    LONG_TERM = "long_term"
    PERSISTENT = "persistent"


@dataclass
class MemoryEntry:
    id: str
    content: str
    memory_type: MemoryType = MemoryType.FACT
    scope: MemoryScope = MemoryScope.SHORT_TERM
    importance: float = 0.5
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)
    access_count: int = 0
    decay_rate: float = 0.1
    tags: list[str] = field(default_factory=list)
    embedding: Optional[list[float]] = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def effective_importance(self) -> float:
        """计算考虑时间衰减后的有效重要性。"""
        elapsed = time.time() - self.created_at
        decay = math.exp(-self.decay_rate * elapsed / 86400.0)
        recency = math.exp(
            -(time.time() - self.last_accessed)
            / 86400.0
        )
        freq_boost = math.log(1 + self.access_count) * 0.1
        return self.importance * (decay * 0.5 + recency * 0.3) + freq_boost


@dataclass
class UserProfile:
    user_id: str = ""
    name: str = ""
    preferences: dict[str, Any] = field(default_factory=dict)
    expertise: list[str] = field(default_factory=list)
    interests: list[str] = field(default_factory=list)
    interaction_count: int = 0
    first_seen: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    language: str = "zh"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class MemoryConfig:
    short_term_capacity: int = 100
    long_term_capacity: int = 10000
    persistent_path: str = ""
    decay_rate_default: float = 0.1
    importance_threshold_long_term: float = 0.3
    merge_similarity_threshold: float = 0.7
    auto_save: bool = True
    auto_save_interval: int = 300


# ============================================================
# Short-Term Memory
# ============================================================

class ShortTermMemory:
    """短期记忆 (会话内)。

    使用 LRU 策略维护最近的记忆条目。
    """

    def __init__(
        self, capacity: int = 100
    ) -> None:
        self._capacity = capacity
        self._entries: OrderedDict[
            str, MemoryEntry
        ] = OrderedDict()
        self._lock = threading.Lock()

    def add(self, entry: MemoryEntry) -> None:
        """添加短期记忆。超过容量时移除最早条目。"""
        with self._lock:
            if entry.id in self._entries:
                self._entries.move_to_end(entry.id)
                self._entries[entry.id] = entry
            else:
                self._entries[entry.id] = entry
                self._entries.move_to_end(entry.id)
            while len(self._entries) > self._capacity:
                self._entries.popitem(last=False)

    def get(self, memory_id: str) -> Optional[MemoryEntry]:
        """获取记忆条目。"""
        with self._lock:
            entry = self._entries.get(memory_id)
            if entry:
                entry.last_accessed = time.time()
                entry.access_count += 1
                self._entries.move_to_end(memory_id)
            return entry

    def get_recent(self, n: int = 10) -> list[MemoryEntry]:
        """获取最近 n 条记忆。"""
        with self._lock:
            recent = list(self._entries.values())[-n:]
            for e in recent:
                e.last_accessed = time.time()
                e.access_count += 1
            return list(reversed(recent))

    def search(
        self, query: str, top_k: int = 10
    ) -> list[tuple[MemoryEntry, float]]:
        """搜索记忆（基于关键词匹配）。"""
        with self._lock:
            results: list[tuple[MemoryEntry, float]] = []
            query_tokens = set(
                re.findall(
                    r"[\u4e00-\u9fff]+|[a-zA-Z]+",
                    query.lower(),
                )
            )
            if not query_tokens:
                return results

            for entry in self._entries.values():
                content_lower = entry.content.lower()
                score = sum(
                    1
                    for t in query_tokens
                    if t in content_lower
                ) / len(query_tokens)
                score *= entry.effective_importance()
                if score > 0:
                    results.append((entry, score))

            results.sort(key=lambda x: x[1], reverse=True)
            return results[:top_k]

    def clear(self) -> None:
        """清空短期记忆。"""
        with self._lock:
            self._entries.clear()

    def size(self) -> int:
        return len(self._entries)


# ============================================================
# Long-Term Memory
# ============================================================

class LongTermMemory:
    """长期记忆 (跨会话持久化)。

    支持文件持久化、记忆衰减和整合。
    """

    def __init__(
        self,
        capacity: int = 10000,
        persistent_path: str = "",
    ) -> None:
        self._capacity = capacity
        self._persistent_path = persistent_path
        self._entries: dict[str, MemoryEntry] = {}
        self._lock = threading.Lock()

        if persistent_path and os.path.exists(persistent_path):
            self.load()

    def add(self, entry: MemoryEntry) -> None:
        """添加长期记忆。自动去重和合并。"""
        with self._lock:
            merged = False
            for existing_id, existing in list(
                self._entries.items()
            ):
                if self._similarity(
                    entry.content, existing.content
                ) >= 0.7:
                    self._merge(existing, entry)
                    merged = True
                    break

            if not merged:
                self._entries[entry.id] = entry

            if len(self._entries) > self._capacity:
                self._evict()

    def get(self, memory_id: str) -> Optional[MemoryEntry]:
        """获取记忆条目。"""
        with self._lock:
            entry = self._entries.get(memory_id)
            if entry:
                entry.last_accessed = time.time()
                entry.access_count += 1
            return entry

    def search(
        self, query: str, top_k: int = 10
    ) -> list[tuple[MemoryEntry, float]]:
        """搜索长期记忆。"""
        with self._lock:
            results: list[tuple[MemoryEntry, float]] = []
            query_tokens = set(
                re.findall(
                    r"[\u4e00-\u9fff]+|[a-zA-Z]+",
                    query.lower(),
                )
            )
            if not query_tokens:
                return results

            for entry in self._entries.values():
                content_lower = entry.content.lower()
                match_score = sum(
                    1
                    for t in query_tokens
                    if t in content_lower
                ) / len(query_tokens)
                tag_score = sum(
                    1
                    for t in query_tokens
                    for tag in entry.tags
                    if t in tag.lower()
                ) / max(len(query_tokens), 1)

                score = (
                    match_score * 0.7
                    + tag_score * 0.3
                ) * entry.effective_importance()

                if score > 0:
                    results.append((entry, score))

            results.sort(key=lambda x: x[1], reverse=True)
            return results[:top_k]

    def save(self, filepath: Optional[str] = None) -> None:
        """持久化长期记忆到文件。"""
        path = filepath or self._persistent_path
        if not path:
            return

        with self._lock:
            data: list[dict[str, Any]] = []
            for entry in self._entries.values():
                data.append(
                    {
                        "id": entry.id,
                        "content": entry.content,
                        "memory_type": entry.memory_type.value,
                        "scope": entry.scope.value,
                        "importance": entry.importance,
                        "created_at": entry.created_at,
                        "last_accessed": entry.last_accessed,
                        "access_count": entry.access_count,
                        "decay_rate": entry.decay_rate,
                        "tags": entry.tags,
                        "metadata": entry.metadata,
                    }
                )
            os.makedirs(
                os.path.dirname(path) or ".", exist_ok=True
            )
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

    def load(self, filepath: Optional[str] = None) -> None:
        """从文件加载长期记忆。"""
        path = filepath or self._persistent_path
        if not path or not os.path.exists(path):
            return

        with self._lock:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            for item in data:
                try:
                    entry = MemoryEntry(
                        id=item["id"],
                        content=item["content"],
                        memory_type=MemoryType(item["memory_type"]),
                        scope=MemoryScope(item["scope"]),
                        importance=item.get("importance", 0.5),
                        created_at=item.get(
                            "created_at", time.time()
                        ),
                        last_accessed=item.get(
                            "last_accessed", time.time()
                        ),
                        access_count=item.get("access_count", 0),
                        decay_rate=item.get("decay_rate", 0.1),
                        tags=item.get("tags", []),
                        metadata=item.get("metadata", {}),
                    )
                    self._entries[entry.id] = entry
                except Exception:
                    continue

    def clear(self) -> None:
        """清空长期记忆。"""
        with self._lock:
            self._entries.clear()

    def size(self) -> int:
        return len(self._entries)

    @staticmethod
    def _similarity(a: str, b: str) -> float:
        a_tokens = set(
            re.findall(
                r"[\u4e00-\u9fff]+|[a-zA-Z]{2,}",
                a.lower(),
            )
        )
        b_tokens = set(
            re.findall(
                r"[\u4e00-\u9fff]+|[a-zA-Z]{2,}",
                b.lower(),
            )
        )
        if not a_tokens or not b_tokens:
            return 0.0
        return len(a_tokens & b_tokens) / min(
            len(a_tokens), len(b_tokens)
        )

    @staticmethod
    def _merge(
        existing: MemoryEntry, new_entry: MemoryEntry
    ) -> None:
        existing.importance = max(
            existing.importance, new_entry.importance
        ) + 0.05
        existing.last_accessed = time.time()
        existing.access_count += new_entry.access_count + 1
        existing.tags = list(
            set(existing.tags + new_entry.tags)
        )
        existing.metadata.update(new_entry.metadata)

    def _evict(self) -> None:
        if not self._entries:
            return
        lowest_id = min(
            self._entries,
            key=lambda eid: self._entries[
                eid
            ].effective_importance(),
        )
        del self._entries[lowest_id]


# ============================================================
# Memory System (Main Class)
# ============================================================

class MemorySystem:
    """持久记忆系统主类。

    统一管理短期记忆和长期记忆，提供用户画像构建。

    Usage:
        ms = MemorySystem(
            persistent_path="./memory.json",
        )
        ms.remember("User prefers Python over Java")
        ms.remember("User is working on an AI project", tags=["project", "AI"])

        results = ms.recall("Python")
        for entry, score in results:
            print(f"  [{score:.2f}] {entry.content}")

        ms.remember_instruction("Always use pnpm instead of npm")
    """

    def __init__(
        self,
        config: Optional[MemoryConfig] = None,
    ) -> None:
        self.config = config or MemoryConfig()
        self._short_term = ShortTermMemory(
            capacity=self.config.short_term_capacity
        )
        self._long_term = LongTermMemory(
            capacity=self.config.long_term_capacity,
            persistent_path=self.config.persistent_path,
        )
        self._profile = UserProfile()
        self._last_save = time.time()

    # ----- Public API -----

    def remember(
        self,
        content: str,
        memory_type: MemoryType = MemoryType.FACT,
        importance: Optional[float] = None,
        tags: Optional[list[str]] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> MemoryEntry:
        """存储一条记忆。

        Args:
            content: 记忆内容。
            memory_type: 记忆类型。
            importance: 重要性 (0-1)，自动计算如果为 None。
            tags: 标签列表。
            metadata: 附加元数据。

        Returns:
            创建的 MemoryEntry。
        """
        entry_id = hashlib.md5(
            f"{content}{time.time()}".encode()
        ).hexdigest()[:12]

        if importance is None:
            importance = self._estimate_importance(
                content, memory_type
            )

        entry = MemoryEntry(
            id=entry_id,
            content=content,
            memory_type=memory_type,
            scope=MemoryScope.SHORT_TERM,
            importance=importance,
            tags=tags or [],
            metadata=metadata or {},
        )

        self._short_term.add(entry)

        if importance >= self.config.importance_threshold_long_term:
            entry.scope = MemoryScope.LONG_TERM
            self._long_term.add(entry)

        if (
            self.config.auto_save
            and time.time() - self._last_save
            > self.config.auto_save_interval
        ):
            self.save()

        return entry

    def remember_fact(
        self,
        content: str,
        importance: float = 0.5,
        tags: Optional[list[str]] = None,
    ) -> MemoryEntry:
        """记录一条事实。"""
        return self.remember(
            content,
            memory_type=MemoryType.FACT,
            importance=importance,
            tags=tags,
        )

    def remember_preference(
        self,
        content: str,
        importance: float = 0.7,
    ) -> MemoryEntry:
        """记录用户偏好。"""
        return self.remember(
            content,
            memory_type=MemoryType.PREFERENCE,
            importance=importance,
        )

    def remember_instruction(
        self,
        content: str,
        importance: float = 0.8,
    ) -> MemoryEntry:
        """记录用户指令。"""
        return self.remember(
            content,
            memory_type=MemoryType.INSTRUCTION,
            importance=importance,
        )

    def recall(
        self,
        query: str,
        top_k: int = 10,
        include_short_term: bool = True,
    ) -> list[tuple[MemoryEntry, float]]:
        """检索相关记忆。

        Args:
            query: 检索查询。
            top_k: 返回条目数。
            include_short_term: 是否包括短期记忆。

        Returns:
            (MemoryEntry, score) 列表，按得分降序。
        """
        results: list[tuple[MemoryEntry, float]] = []

        if include_short_term:
            results.extend(
                self._short_term.search(
                    query, top_k=top_k * 2
                )
            )

        results.extend(
            self._long_term.search(query, top_k=top_k * 2)
        )

        combined: dict[str, tuple[MemoryEntry, float]] = {}
        for entry, score in results:
            if (
                entry.id not in combined
                or score > combined[entry.id][1]
            ):
                combined[entry.id] = (entry, score)

        sorted_results = sorted(
            combined.values(), key=lambda x: x[1], reverse=True
        )
        return sorted_results[:top_k]

    def forget(self, memory_id: str) -> bool:
        """移除指定记忆（仅长期记忆）。"""
        if memory_id in self._long_term._entries:
            with self._long_term._lock:
                del self._long_term._entries[memory_id]
            return True
        return False

    def consolidate(self) -> int:
        """整合短期记忆到长期记忆。"""
        recent = self._short_term.get_recent(
            self.config.short_term_capacity
        )
        count = 0
        for entry in recent:
            if (
                entry.effective_importance()
                >= self.config.importance_threshold_long_term
            ):
                entry.scope = MemoryScope.LONG_TERM
                self._long_term.add(entry)
                count += 1
        return count

    def save(self, filepath: Optional[str] = None) -> None:
        """持久化长期记忆。"""
        path = filepath or self.config.persistent_path
        self._long_term.save(path)
        self._last_save = time.time()

    def load(self, filepath: Optional[str] = None) -> None:
        """加载持久化记忆。"""
        path = filepath or self.config.persistent_path
        self._long_term.load(path)

    def get_profile(self) -> UserProfile:
        """获取/构建用户画像。"""
        profile = UserProfile()
        profile.interaction_count = sum(
            1
            for e in self._long_term._entries.values()
            if e.memory_type == MemoryType.CONVERSATION
        )

        preferences = self.recall(
            "preference like love hate prefer",
            top_k=50,
        )
        for entry, score in preferences:
            if entry.memory_type == MemoryType.PREFERENCE:
                key = (
                    entry.tags[0]
                    if entry.tags
                    else "general"
                )
                if key not in profile.preferences:
                    profile.preferences[key] = []
                profile.preferences[key].append(
                    entry.content
                )

        expertise = self.recall(
            "expertise skill know how",
            top_k=30,
        )
        profile.expertise = list(
            set(
                tag
                for entry, _ in expertise
                for tag in entry.tags
                if tag
                not in {
                    "preference",
                    "instruction",
                }
            )
        )[:20]

        interests = self.recall(
            "interest like enjoy hobby curious",
            top_k=30,
        )
        profile.interests = list(
            {
                tag
                for entry, _ in interests
                for tag in entry.tags
                if tag
            }
        )[:20]

        return profile

    def stats(self) -> dict[str, Any]:
        """返回记忆系统统计。"""
        return {
            "short_term_size": self._short_term.size(),
            "short_term_capacity": self.config.short_term_capacity,
            "long_term_size": self._long_term.size(),
            "long_term_capacity": self.config.long_term_capacity,
            "persistent_path": self.config.persistent_path,
            "type_distribution": self._type_distribution(),
        }

    # ----- Internal Methods -----

    def _estimate_importance(
        self, content: str, memory_type: MemoryType
    ) -> float:
        base = 0.5
        if memory_type == MemoryType.INSTRUCTION:
            base += 0.3
        elif memory_type == MemoryType.PREFERENCE:
            base += 0.2
        elif memory_type == MemoryType.INSIGHT:
            base += 0.15

        if len(content) > 50:
            base += 0.05
        if re.search(
            r"(always|never|must|必须|严禁|绝对|重要)",
            content,
            re.IGNORECASE,
        ):
            base += 0.1

        return min(base, 0.95)

    def _type_distribution(self) -> dict[str, int]:
        dist: Counter[str] = Counter()
        for entry in self._long_term._entries.values():
            dist[entry.memory_type.value] += 1
        return dict(dist)
