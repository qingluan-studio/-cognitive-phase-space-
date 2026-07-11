"""
认知涌现引擎 — 突显网络
========================
模拟人脑突显网络(Salience Network) — 动态分配认知资源

核心机制: 每个信息片段获得一个显著性分数，分数决定它被处理的优先级和深度

六维评分:
1. 新颖度(novelty): 该信息是否首次出现 | 与已知知识的距离
2. 即时性(recency): 最近多久被提及 | 指数衰减
3. 情感负荷(emotional_charge): 携带的情绪强度 | 触发情感引擎
4. 话题相关性(relevance): 与当前对话主题的相关度
5. 知识点密度(density): 携带有意义的实体/概念数量
6. 用户兴趣匹配(interest_match): 与用户画像的兴趣重叠度

突显预算模型:
- 每个信息片段获得一个 0.0~1.0 的salience分数
- 高salience → 深度处理: KG扩展+学习者查询+反事实推演
- 中salience → 常规处理: 知识库检索+记忆召回
- 低salience → 快速通道: 直达fallback/缓存

用法:
    sn = SalienceNetwork()
    sn.set_context(profile={"interests":["认知科学","AI"]}, current_topic="深度学习")
    score = sn.score("卷积神经网络怎么理解图片的", affect={"emotion":"curiosity","polarity":0.2})
    budget = sn.allocate_budget(score)
    # -> {"priority":"high","budget":0.8,"pipeline":["kg_expand","learner_query","blend"]}
"""

from __future__ import annotations

import difflib
import json
import math
import re
from collections import OrderedDict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .knowledge_store import STORAGE_DIR

SALIENCE_FILE = STORAGE_DIR / "salience_network.json"

EMOTION_LOAD = {
    "curiosity": 0.5, "confusion": 0.4, "frustration": 0.6,
    "excitement": 0.7, "exhaustion": 0.3, "neutral": 0.2,
}

INTEREST_WEIGHTS = {
    "AI/机器学习": ["深度学习", "大模型", "LLM", "transformer", "训练", "推理",
                    "神经网络", "agent", "prompt", "embedding", "token"],
    "认知科学": ["认知", "涌现", "思维", "意识", "哲学", "第一性", "逻辑",
                 "推理", "记忆", "学习", "智能"],
    "Python开发": ["python", "django", "fastapi", "flask", "pytorch", "numpy",
                   "装饰器", "异步", "类型"],
    "软件架构": ["架构", "设计模式", "分布式", "微服务", "容器", "k8s", "CI"],
}


@dataclass
class SalienceRecord:
    query: str
    scores: dict[str, float]
    total: float
    priority: str
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SalienceNetwork:
    def __init__(self, capacity: int = 128):
        self._capacity = capacity
        self._seen: OrderedDict[str, str] = OrderedDict()
        self._history: deque[SalienceRecord] = deque(maxlen=200)
        self._context: dict = {}
        self._budget_stats: dict[str, int] = {"high": 0, "medium": 0, "low": 0}
        self._load()

    def set_context(self, profile: dict | None = None,
                    current_topic: str = "",
                    recent_topics: list[str] | None = None):
        self._context = {
            "profile": profile or {},
            "current_topic": current_topic,
            "recent_topics": recent_topics or [],
        }

    def score(self, query: str, affect: dict | None = None) -> float:
        novelty = self._novelty_score(query)
        recency = self._recency_score(query)
        emotional = self._emotional_score(affect)
        relevance = self._relevance_score(query)
        density = self._density_score(query)
        interest = self._interest_score(query)

        weights = {"novelty": 0.15, "recency": 0.10, "emotional": 0.15,
                   "relevance": 0.25, "density": 0.15, "interest": 0.20}

        total = (novelty * weights["novelty"] + recency * weights["recency"]
                 + emotional * weights["emotional"] + relevance * weights["relevance"]
                 + density * weights["density"] + interest * weights["interest"])

        self._add_to_seen(query)

        record = SalienceRecord(
            query=query,
            scores={"novelty": novelty, "recency": recency, "emotional": emotional,
                    "relevance": relevance, "density": density, "interest": interest},
            total=round(total, 3),
            priority=self._priority_label(total),
        )
        self._history.append(record)
        if self._history and self._history[-1].priority:
            self._budget_stats[self._history[-1].priority] += 1
        self._save()

        return record.total

    def allocate_budget(self, salience: float) -> dict:
        if salience >= 0.65:
            pipeline = ["kg_bidirectional_expand", "learner_deep_query",
                        "conceptual_blend", "counterfactual_try",
                        "knowledge_retrieve", "memory_recall"]
            budget = 0.8 + salience * 0.1
            priority = "high"
        elif salience >= 0.35:
            pipeline = ["kg_expand", "learner_query",
                        "knowledge_retrieve", "memory_recall",
                        "context_enrich"]
            budget = 0.5 + salience * 0.2
            priority = "medium"
        else:
            pipeline = ["cache_check", "simple_retrieve", "fallback"]
            budget = 0.2 + salience * 0.3
            priority = "low"

        return {"priority": priority, "budget": round(budget, 3),
                "pipeline": pipeline}

    def _novelty_score(self, query: str) -> float:
        qn = query.replace(" ", "").lower()
        if not self._seen:
            return 0.85

        best_score = 0.0
        for prev in list(self._seen.values())[-10:]:
            pn = prev.replace(" ", "").lower()
            similarity = difflib.SequenceMatcher(None, qn[:30], pn[:30]).ratio()
            best_score = max(best_score, similarity)

        return max(0.15, 1.0 - best_score)

    def _recency_score(self, query: str) -> float:
        if not self._history:
            return 0.5
        lookback = min(10, len(self._history))
        recent = list(self._history)[-lookback:]
        for i, r in enumerate(reversed(recent)):
            if r.query.replace(" ", "").lower() in query.replace(" ", "").lower():
                return 1.0 * (0.9 ** i)
        return 0.15

    def _emotional_score(self, affect: dict | None) -> float:
        if not affect:
            return 0.2
        emotion = affect.get("emotion", "neutral")
        polarity_str = affect.get("polarity", "neutral")
        if isinstance(polarity_str, str):
            polarity = {"positive": 0.7, "negative": 0.7, "neutral": 0.2}.get(polarity_str, 0.2)
        else:
            polarity = abs(float(polarity_str))
        base = EMOTION_LOAD.get(emotion, 0.2)
        return max(0.1, min(1.0, base + polarity * 0.3))

    def _relevance_score(self, query: str) -> float:
        topic = self._context.get("current_topic", "")
        if not topic:
            return 0.3
        ql = query.lower()
        if topic.lower() in ql:
            return 0.9

        topic_kw = {
            "认知科学": ["认知", "涌现", "思维", "意识", "记忆", "学习", "推理"],
            "AI与ML": ["深度学习", "大模型", "神经网络", "训练", "推理", "LLM", "agent"],
            "编程": ["代码", "编程", "python", "函数", "类", "接口", "算法"],
        }
        keywords = topic_kw.get(topic, [])
        hits = sum(1 for kw in keywords if kw.lower() in ql)
        return min(0.9, 0.3 + hits * 0.15)

    def _density_score(self, query: str) -> float:
        entities = re.findall(r'[\u4e00-\u9fa5a-zA-Z]{2,16}', query)
        density = len(entities) / max(1, len(query) / 5)
        return min(1.0, density * 1.2)

    def _interest_score(self, query: str) -> float:
        profile = self._context.get("profile", {})
        if not profile:
            return 0.3

        interests = profile.get("interests", {})
        if not interests:
            return 0.3

        ql = query.lower()
        best = 0.0
        for interest, weight in interests.items():
            keywords = INTEREST_WEIGHTS.get(interest, [])
            hits = sum(1 for kw in keywords if kw.lower() in ql)
            if hits > 0:
                w = weight / max(1, sum(interests.values()))
                best = max(best, min(1.0, 0.4 + hits * 0.15 * w * 10))
        return max(0.2, best)

    def _add_to_seen(self, query: str):
        norm = query.replace(" ", "").lower()
        self._seen[norm] = query
        if len(self._seen) > self._capacity:
            self._seen.popitem(last=False)

    def _priority_label(self, salience: float) -> str:
        if salience >= 0.65:
            return "high"
        if salience >= 0.35:
            return "medium"
        return "low"

    def stats(self) -> dict:
        return {
            "seen_count": len(self._seen),
            "history_size": len(self._history),
            "budget_allocations": dict(self._budget_stats),
            "context": {k: str(v)[:60] for k, v in self._context.items()},
            "recent_avg_salience": round(
                sum(r.total for r in list(self._history)[-10:])
                / max(1, min(10, len(self._history))), 3
            ),
        }

    def _load(self):
        if SALIENCE_FILE.exists():
            try:
                with open(SALIENCE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._seen = OrderedDict(data.get("seen", {}))
                self._budget_stats = data.get("budget", {"high": 0, "medium": 0, "low": 0})
                history_data = data.get("history", [])
                self._history = deque(
                    [SalienceRecord(**r) for r in history_data[-50:]], maxlen=200
                )
            except Exception:
                pass

    def _save(self):
        try:
            data = {
                "seen": dict(self._seen),
                "budget": self._budget_stats,
                "history": [{"query": r.query, "scores": r.scores,
                             "total": r.total, "priority": r.priority, "ts": r.ts}
                            for r in list(self._history)[-50:]],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(SALIENCE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
