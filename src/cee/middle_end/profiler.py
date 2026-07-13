"""
用户画像系统 - User Profiling System

核心理念:
  用户行为数据分级存储:
  - 低频数据 → 留存在中端内存 (HotCache)
  - 高频数据 → 同步到后端持久化 (ColdStorage)

  冷热分离减少数据库读写压力，同时保持画像的实时性。

双轨制:
  - 工程版: LRU Cache + 定时批量同步
  - 理论版: 强化学习优化的淘汰策略 + 预测性预加载

画像分层:
  ProfileTier:
    - ANONYMOUS: 未登录/新用户
    - LIGHT: 注册但低活跃
    - STANDARD: 正常活跃用户
    - HEAVY: 高频活跃，频繁使用复杂功能
    - POWER: 核心用户，需要全量画像

特性:
  - 行为事件记录 (点击/搜索/对话/浏览)
  - 兴趣标签提取与衰减
  - 活跃度评分
  - 冷热数据自动迁移
  - LRU 淘汰 + 批量同步
"""

from __future__ import annotations

import json
import logging
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class ProfileTier(Enum):
    ANONYMOUS = (0, 0, "anonymous")
    LIGHT = (1, 100, "light")
    STANDARD = (2, 500, "standard")
    HEAVY = (3, 2000, "heavy")
    POWER = (4, 10000, "power")

    def __init__(self, level: int, event_threshold: int, label: str):
        self.level = level
        self.event_threshold = event_threshold
        self.label = label

    @classmethod
    def from_event_count(cls, count: int) -> ProfileTier:
        tiers = sorted(cls, key=lambda t: t.event_threshold, reverse=True)
        for tier in tiers:
            if count >= tier.event_threshold:
                return tier
        return cls.ANONYMOUS


class BehaviorCategory(Enum):
    SEARCH = "search"
    DIALOGUE = "dialogue"
    BROWSE = "browse"
    CLICK = "click"
    UPLOAD = "upload"
    FEEDBACK = "feedback"
    SETTINGS = "settings"
    SHARE = "share"
    ANNOTATION = "annotation"
    CUSTOM = "custom"


@dataclass
class BehaviorEvent:
    """用户行为事件"""

    event_id: str
    user_id: str
    category: BehaviorCategory
    action: str
    timestamp: float = field(default_factory=time.time)
    duration_ms: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)
    session_id: str = ""

    @property
    def weight(self) -> float:
        weights: dict[BehaviorCategory, float] = {
            BehaviorCategory.DIALOGUE: 1.5,
            BehaviorCategory.SEARCH: 1.2,
            BehaviorCategory.UPLOAD: 1.3,
            BehaviorCategory.FEEDBACK: 2.0,
            BehaviorCategory.SHARE: 1.4,
            BehaviorCategory.ANNOTATION: 1.6,
            BehaviorCategory.SETTINGS: 0.5,
            BehaviorCategory.CLICK: 0.3,
            BehaviorCategory.BROWSE: 0.4,
            BehaviorCategory.CUSTOM: 1.0,
        }
        base = weights.get(self.category, 1.0)
        if self.duration_ms > 30000:
            base *= 1.5
        elif self.duration_ms > 10000:
            base *= 1.2
        return base


@dataclass
class InterestTag:
    """兴趣标签"""

    name: str
    score: float
    first_seen: float = field(default_factory=time.time)
    last_updated: float = field(default_factory=time.time)
    hit_count: int = 0

    HALF_LIFE_DAYS = 14.0

    def decay(self, now: float | None = None) -> float:
        now = now or time.time()
        elapsed_days = (now - self.last_updated) / 86400.0
        decay_factor = 0.5 ** (elapsed_days / self.HALF_LIFE_DAYS)
        self.score *= decay_factor
        return self.score

    def boost(self, amount: float = 1.0) -> None:
        self.score += amount
        self.hit_count += 1
        self.last_updated = time.time()


@dataclass
class UserProfile:
    """用户画像"""

    user_id: str
    tier: ProfileTier = ProfileTier.ANONYMOUS
    interests: dict[str, InterestTag] = field(default_factory=dict)
    events: list[BehaviorEvent] = field(default_factory=list)
    total_events: int = 0
    active_days: set[str] = field(default_factory=set)
    first_seen: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def activity_score(self) -> float:
        days = len(self.active_days)
        if days == 0:
            return 0.0
        return min(100.0, self.total_events / max(days, 1) * 10)

    def top_interests(self, n: int = 10) -> list[InterestTag]:
        now = time.time()
        for tag in self.interests.values():
            tag.decay(now)
        sorted_tags = sorted(self.interests.values(), key=lambda t: t.score, reverse=True)
        return sorted_tags[:n]

    @property
    def is_hot(self) -> bool:
        return (time.time() - self.last_seen) < 300

    @property
    def is_cold(self) -> bool:
        return (time.time() - self.last_seen) > 3600

    def add_event(self, event: BehaviorEvent) -> None:
        self.events.append(event)
        self.total_events += 1
        self.last_seen = event.timestamp
        day = time.strftime("%Y-%m-%d", time.localtime(event.timestamp))
        self.active_days.add(day)
        if self.total_events % 100 == 0:
            new_tier = ProfileTier.from_event_count(self.total_events)
            if new_tier.level > self.tier.level:
                self.tier = new_tier

    def add_interest(self, name: str, score: float = 1.0) -> None:
        if name in self.interests:
            self.interests[name].boost(score)
        else:
            self.interests[name] = InterestTag(name=name, score=score)

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "tier": self.tier.label,
            "total_events": self.total_events,
            "active_days": len(self.active_days),
            "activity_score": round(self.activity_score, 2),
            "top_interests": [(t.name, round(t.score, 2)) for t in self.top_interests(5)],
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
        }


class HotCache:
    """热数据缓存 - 中端内存存储活跃用户画像"""

    MAX_SIZE = 100
    EVICTION_AGE = 600

    def __init__(self) -> None:
        self._cache: OrderedDict[str, UserProfile] = OrderedDict()
        self._lock = threading.RLock()

    def get(self, user_id: str) -> UserProfile | None:
        with self._lock:
            profile = self._cache.get(user_id)
            if profile:
                self._cache.move_to_end(user_id)
            return profile

    def put(self, profile: UserProfile) -> None:
        with self._lock:
            if profile.user_id in self._cache:
                self._cache.move_to_end(profile.user_id)
                self._cache[profile.user_id] = profile
            else:
                self._cache[profile.user_id] = profile
                if len(self._cache) > self.MAX_SIZE:
                    self._evict()

    def remove(self, user_id: str) -> UserProfile | None:
        with self._lock:
            return self._cache.pop(user_id, None)

    def _evict(self) -> None:
        now = time.time()
        for user_id in list(self._cache.keys()):
            profile = self._cache[user_id]
            if profile.is_cold and (now - profile.last_seen) > self.EVICTION_AGE:
                del self._cache[user_id]
                logger.debug(f"Evicted cold profile: {user_id}")
                return
        self._cache.popitem(last=False)

    @property
    def size(self) -> int:
        return len(self._cache)

    @property
    def cold_candidates(self) -> list[UserProfile]:
        now = time.time()
        with self._lock:
            return [p for p in self._cache.values() if (now - p.last_seen) > self.EVICTION_AGE]


class ColdStorage:
    """冷数据存储 - 批量同步到后端"""

    def __init__(self, storage_path: str | None = None) -> None:
        self._storage: dict[str, dict[str, Any]] = {}
        self._storage_path = storage_path
        self._lock = threading.RLock()
        self._pending_sync: dict[str, dict[str, Any]] = {}
        self._load()

    def _load(self) -> None:
        if self._storage_path:
            try:
                with open(self._storage_path, "r") as f:
                    self._storage = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                pass

    def _save(self) -> None:
        if self._storage_path:
            try:
                with open(self._storage_path, "w") as f:
                    json.dump(self._storage, f, ensure_ascii=False, indent=2)
            except OSError as e:
                logger.error(f"Failed to save cold storage: {e}")

    def archive(self, profile: UserProfile) -> None:
        with self._lock:
            self._storage[profile.user_id] = profile.to_dict()
            self._pending_sync[profile.user_id] = profile.to_dict()

    def retrieve(self, user_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._storage.get(user_id)

    def sync(self) -> int:
        count = len(self._pending_sync)
        if count > 0:
            self._save()
            self._pending_sync.clear()
            logger.info(f"Synced {count} profiles to cold storage")
        return count

    @property
    def size(self) -> int:
        return len(self._storage)


class UserProfilingSystem:
    """用户画像系统 - 冷热分离调度"""

    BATCH_SYNC_INTERVAL = 300
    INTEREST_KEYWORDS = {
        "ai": ["人工智能", "机器学习", "深度学习", "神经网络"],
        "programming": ["编程", "代码", "开发", "Python", "Java", "Go"],
        "data": ["数据", "分析", "可视化", "统计", "SQL"],
        "design": ["设计", "UI", "UX", "用户体验", "界面"],
        "research": ["研究", "论文", "学术", "实验", "理论"],
        "business": ["商业", "市场", "产品", "运营", "营销"],
        "philosophy": ["哲学", "认知", "意识", "思维", "逻辑"],
    }

    def __init__(self, storage_path: str | None = None) -> None:
        self.hot = HotCache()
        self.cold = ColdStorage(storage_path)
        self._event_counter = 0
        self._lock = threading.RLock()

    def track_event(
        self,
        user_id: str,
        category: BehaviorCategory,
        action: str,
        **metadata: Any,
    ) -> BehaviorEvent:
        event = BehaviorEvent(
            event_id=f"evt-{self._event_counter:08d}",
            user_id=user_id,
            category=category,
            action=action,
            metadata=metadata,
        )
        self._event_counter += 1

        profile = self.hot.get(user_id)
        if profile is None:
            profile = self.cold.retrieve(user_id)
            if profile:
                profile = UserProfile(
                    user_id=user_id,
                    tier=ProfileTier.from_event_count(profile.get("total_events", 0)),
                    total_events=profile.get("total_events", 0),
                )
            else:
                profile = UserProfile(user_id=user_id)

        profile.add_event(event)
        self._extract_interests(event, profile)
        self.hot.put(profile)
        return event

    def get_profile(self, user_id: str) -> UserProfile | None:
        profile = self.hot.get(user_id)
        if profile:
            return profile
        data = self.cold.retrieve(user_id)
        if data:
            profile = UserProfile(
                user_id=user_id,
                tier=ProfileTier.from_event_count(data.get("total_events", 0)),
                total_events=data.get("total_events", 0),
                metadata=data,
            )
            self.hot.put(profile)
            return profile
        return None

    def _extract_interests(self, event: BehaviorEvent, profile: UserProfile) -> None:
        text = event.action + " " + json.dumps(event.metadata, ensure_ascii=False)
        text_lower = text.lower()
        for category_name, keywords in self.INTEREST_KEYWORDS.items():
            for kw in keywords:
                if kw.lower() in text_lower:
                    profile.add_interest(category_name, event.weight)

    def sync_cold(self) -> int:
        candidates = self.hot.cold_candidates
        for profile in candidates:
            self.cold.archive(profile)
            self.hot.remove(profile.user_id)
        self.cold.sync()
        return len(candidates)

    def get_behavior_summary(self, user_id: str) -> dict[str, Any]:
        profile = self.get_profile(user_id)
        if not profile:
            return {"user_id": user_id, "status": "unknown"}
        return profile.to_dict()

    @property
    def stats(self) -> dict[str, Any]:
        return {
            "hot_cache_size": self.hot.size,
            "cold_storage_size": self.cold.size,
            "total_events": self._event_counter,
            "cold_candidates": len(self.hot.cold_candidates),
        }
