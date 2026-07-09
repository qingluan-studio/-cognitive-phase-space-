"""CEE Learning — Automatic learning and continuous improvement engine.

Enables the CEE system to learn from its own outputs and user feedback:
- Feedback collection and weighting
- Pattern recognition from historical data
- Hyper-parameter auto-tuning
- Model versioning and rollback
"""

from __future__ import annotations

import json
import logging
import math
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class FeedbackType(Enum):
    EXPLICIT = "explicit"
    IMPLICIT = "implicit"
    A_B_TEST = "a_b_test"
    AUTOMATIC = "automatic"


class FeedbackSentiment(Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


@dataclass
class FeedbackRecord:
    record_id: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"))
    feedback_type: FeedbackType = FeedbackType.EXPLICIT
    sentiment: FeedbackSentiment = FeedbackSentiment.NEUTRAL
    score: float = 0.5
    context: dict[str, Any] = field(default_factory=dict)
    message: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    weight: float = 1.0
    tags: list[str] = field(default_factory=list)


@dataclass
class LearningInsight:
    insight_id: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"))
    name: str = ""
    description: str = ""
    confidence: float = 0.5
    evidence_count: int = 0
    recommendation: str = ""
    category: str = "general"
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class ModelSnapshot:
    snapshot_id: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"))
    name: str = ""
    params: dict[str, Any] = field(default_factory=dict)
    score: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: dict[str, Any] = field(default_factory=dict)


class FeedbackStore:
    """Collects, weights, and queries user and system feedback."""

    def __init__(self, max_records: int = 10000) -> None:
        self._records: list[FeedbackRecord] = []
        self._max_records = max_records
        self._positive_count: int = 0
        self._negative_count: int = 0
        self._neutral_count: int = 0

    def add_feedback(self, record: FeedbackRecord) -> None:
        self._records.append(record)
        if record.sentiment == FeedbackSentiment.POSITIVE:
            self._positive_count += 1
        elif record.sentiment == FeedbackSentiment.NEGATIVE:
            self._negative_count += 1
        else:
            self._neutral_count += 1
        if len(self._records) > self._max_records:
            removed = self._records.pop(0)
            self._adjust_counts(removed, -1)

    def add(self, score: float, feedback_type: FeedbackType = FeedbackType.EXPLICIT,
            message: str = "", context: dict | None = None,
            tags: list[str] | None = None) -> FeedbackRecord:
        sentiment = FeedbackSentiment.NEUTRAL
        if score >= 0.7:
            sentiment = FeedbackSentiment.POSITIVE
        elif score <= 0.3:
            sentiment = FeedbackSentiment.NEGATIVE
        record = FeedbackRecord(
            feedback_type=feedback_type,
            sentiment=sentiment,
            score=score,
            message=message,
            context=context or {},
            tags=tags or [],
        )
        self.add_feedback(record)
        return record

    def _adjust_counts(self, record: FeedbackRecord, delta: int) -> None:
        if record.sentiment == FeedbackSentiment.POSITIVE:
            self._positive_count += delta
        elif record.sentiment == FeedbackSentiment.NEGATIVE:
            self._negative_count += delta
        else:
            self._neutral_count += delta

    def get_recent(self, limit: int = 50) -> list[FeedbackRecord]:
        return self._records[-limit:]

    def get_positive_ratio(self, window: int | None = None) -> float:
        records = self._records[-window:] if window else self._records
        if not records:
            return 0.5
        positive = sum(1 for r in records if r.sentiment == FeedbackSentiment.POSITIVE)
        return positive / len(records)

    def get_average_score(self, window: int | None = None) -> float:
        records = self._records[-window:] if window else self._records
        if not records:
            return 0.5
        return sum(r.score * r.weight for r in records) / sum(r.weight for r in records)

    def get_by_tags(self, tags: list[str]) -> list[FeedbackRecord]:
        return [r for r in self._records if any(t in r.tags for t in tags)]

    def get_stats(self) -> dict[str, Any]:
        total = len(self._records)
        return {
            "total": total,
            "positive": self._positive_count,
            "negative": self._negative_count,
            "neutral": self._neutral_count,
            "positive_ratio": self._positive_count / max(1, total),
            "average_score": self.get_average_score(),
            "recent_positive_ratio": self.get_positive_ratio(window=100),
        }

    def reset(self) -> None:
        self._records.clear()
        self._positive_count = 0
        self._negative_count = 0
        self._neutral_count = 0


class AutoLearner:
    """Automatic learning engine that discovers patterns and generates insights.

    Analyzes feedback history, performance data, and execution logs to:
    - Identify patterns in success/failure
    - Generate actionable improvement insights
    - Recommend parameter adjustments
    - Track learning progress over time
    """

    def __init__(self, feedback_store: FeedbackStore | None = None) -> None:
        self._feedback_store = feedback_store or FeedbackStore()
        self._insights: list[LearningInsight] = []
        self._param_history: deque[ModelSnapshot] = deque(maxlen=100)
        self._best_snapshot: ModelSnapshot | None = None

    @property
    def feedback(self) -> FeedbackStore:
        return self._feedback_store

    @property
    def insights(self) -> list[LearningInsight]:
        return list(self._insights)

    def record_performance(self, name: str, params: dict[str, Any],
                           score: float, metadata: dict | None = None) -> ModelSnapshot:
        snapshot = ModelSnapshot(
            name=name,
            params=params,
            score=score,
            metadata=metadata or {},
        )
        self._param_history.append(snapshot)
        if self._best_snapshot is None or score > self._best_snapshot.score:
            self._best_snapshot = snapshot
        return snapshot

    def analyze(self) -> list[LearningInsight]:
        new_insights: list[LearningInsight] = []
        feedback_insight = self._analyze_feedback()
        if feedback_insight:
            new_insights.append(feedback_insight)
        param_insight = self._analyze_params()
        if param_insight:
            new_insights.append(param_insight)
        trend_insight = self._analyze_trends()
        if trend_insight:
            new_insights.append(trend_insight)
        self._insights.extend(new_insights)
        return new_insights

    def _analyze_feedback(self) -> LearningInsight | None:
        stats = self._feedback_store.get_stats()
        if stats["total"] < 5:
            return None
        pos_ratio = stats["positive_ratio"]
        if pos_ratio < 0.3:
            return LearningInsight(
                name="low_satisfaction_alert",
                description=f"User satisfaction is critically low ({pos_ratio:.1%} positive)",
                confidence=1.0 - pos_ratio,
                evidence_count=stats["total"],
                recommendation="Review recent output quality and adjust thresholds downward",
                category="quality",
            )
        if pos_ratio > 0.85:
            return LearningInsight(
                name="high_satisfaction",
                description=f"User satisfaction is high ({pos_ratio:.1%} positive)",
                confidence=pos_ratio,
                evidence_count=stats["total"],
                recommendation="Current configuration is working well; consider increasing CEE threshold",
                category="quality",
            )
        return None

    def _analyze_params(self) -> LearningInsight | None:
        if len(self._param_history) < 3:
            return None
        recent = list(self._param_history)[-10:]
        scores = [s.score for s in recent]
        if not scores:
            return None
        trend = self._linear_trend(scores)
        if trend > 0.01:
            return LearningInsight(
                name="improving_trend",
                description=f"Performance trend is positive (slope={trend:.3f})",
                confidence=min(0.9, abs(trend) * 10),
                evidence_count=len(recent),
                recommendation="Continue current parameter direction",
                category="optimization",
            )
        return None

    def _analyze_trends(self) -> LearningInsight | None:
        if self._best_snapshot:
            return LearningInsight(
                name="best_config_available",
                description=f"Best known configuration: {self._best_snapshot.name} (score={self._best_snapshot.score:.3f})",
                confidence=0.8,
                evidence_count=len(self._param_history),
                recommendation="Use best-known configuration as baseline",
                category="reference",
            )
        return None

    def _linear_trend(self, values: list[float]) -> float:
        n = len(values)
        if n < 2:
            return 0.0
        x_mean = (n - 1) / 2
        y_mean = sum(values) / n
        num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
        den = sum((i - x_mean) ** 2 for i in range(n))
        return num / den if den != 0 else 0.0

    def recommend(self) -> dict[str, Any]:
        recommendations: dict[str, Any] = {}
        stats = self._feedback_store.get_stats()
        recs: list[str] = []
        if stats["positive_ratio"] < 0.4:
            recs.append("Lower CEE quality threshold to be more lenient")
        if stats["positive_ratio"] > 0.8:
            recs.append("Raise CEE quality threshold for higher quality output")
        if self._best_snapshot:
            recs.append(f"Best params: {self._best_snapshot.params}")
        return {"recommendations": recs, "stats": stats, "insight_count": len(self._insights)}

    def export_state(self) -> dict[str, Any]:
        return {
            "feedback_stats": self._feedback_store.get_stats(),
            "insights": [
                {"name": i.name, "confidence": i.confidence, "recommendation": i.recommendation}
                for i in self._insights
            ],
            "best_snapshot": {
                "name": self._best_snapshot.name,
                "params": self._best_snapshot.params,
                "score": self._best_snapshot.score,
            } if self._best_snapshot else None,
        }

    def reset(self) -> None:
        self._feedback_store.reset()
        self._insights.clear()
        self._param_history.clear()
        self._best_snapshot = None


class HyperOptimizer:
    """Hyper-parameter auto-tuning via grid search and simulated annealing.

    Discovers optimal parameter combinations for CEE engines through
    iterative experimentation with feedback-driven refinement.
    """

    def __init__(self, param_space: dict[str, list[Any]] | None = None) -> None:
        self._param_space = param_space or {}
        self._history: list[tuple[dict[str, Any], float]] = []
        self._best_params: dict[str, Any] = {}
        self._best_score: float = 0.0

    def set_param_space(self, **ranges: list[Any]) -> None:
        self._param_space = ranges

    def grid_search(self, eval_fn: Callable[[dict[str, Any]], float],
                    top_k: int = 5) -> list[tuple[dict[str, Any], float]]:
        keys = list(self._param_space.keys())
        values = list(self._param_space.values())
        results: list[tuple[dict[str, Any], float]] = []
        self._search_grid(results, keys, values, 0, {}, eval_fn)
        results.sort(key=lambda x: -x[1])
        if results:
            self._best_params, self._best_score = results[0]
        self._history = results
        return results[:top_k]

    def _search_grid(self, results: list, keys: list[str], values: list[list],
                     depth: int, current: dict, eval_fn: Callable) -> None:
        if depth == len(keys):
            score = eval_fn(current)
            results.append((dict(current), score))
            return
        for v in values[depth]:
            current[keys[depth]] = v
            self._search_grid(results, keys, values, depth + 1, current, eval_fn)

    def simulated_annealing(self, eval_fn: Callable[[dict[str, Any]], float],
                            iterations: int = 100, initial_temp: float = 1.0,
                            cooling_rate: float = 0.95) -> dict[str, Any]:
        import random
        current = {k: random.choice(v) for k, v in self._param_space.items()}
        current_score = eval_fn(current)
        best_params = dict(current)
        best_score = current_score
        temp = initial_temp
        for _ in range(iterations):
            neighbor = dict(current)
            key = random.choice(list(self._param_space.keys()))
            neighbor[key] = random.choice(self._param_space[key])
            neighbor_score = eval_fn(neighbor)
            delta = neighbor_score - current_score
            if delta > 0 or random.random() < math.exp(delta / temp):
                current, current_score = neighbor, neighbor_score
                if current_score > best_score:
                    best_params, best_score = dict(current), current_score
            temp *= cooling_rate
            if temp < 1e-6:
                break
        self._best_params = best_params
        self._best_score = best_score
        return best_params

    def get_best(self) -> tuple[dict[str, Any], float]:
        return self._best_params, self._best_score

    def get_history(self) -> list[tuple[dict[str, Any], float]]:
        return list(self._history)
