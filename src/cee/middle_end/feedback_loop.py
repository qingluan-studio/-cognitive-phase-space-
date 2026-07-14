"""
反馈闭环引擎 - Feedback Loop Engine

核心理念:
  将用户反馈转化为模型改进的闭环系统。收集显式/隐式信号,
  聚合分析, 模式学习, A/B 测试, 自动优化。

  显式信号: 点赞/点踩, 星级评分, 用户编辑, 重新生成
  隐式信号: 停留时长, 滚动行为, 复制操作, 无交互离开

  闭环流程:
    Collect -> Aggregate -> Learn -> Apply -> Measure -> Repeat

  信号归一化: 所有信号统一映射到 [-1, 1] 区间
    -1 = 强负面, 0 = 中性, +1 = 强正面

双轨制:
  - 工程版: 移动平均 + 模式匹配 + 简单 Z-test A/B 测试
  - 理论版: RLHF (Bradley-Terry 偏好模型) + 策略梯度

RLHF 理论基础 (理论版注释):
  Bradley-Terry 模型: P(i > j) = exp(r_i) / (exp(r_i) + exp(r_j))
  DPO 损失: L = -E[log sigma(beta * (log pi(y_w|x)/pi_ref(y_w|x) - log pi(y_l|x)/pi_ref(y_l|x)))]
  奖励模型: r(x, y) = w^T * phi(x, y), 通过偏好对训练
  PPO 微调: max E[r(x, y)] - beta * KL(pi || pi_ref)
"""
from __future__ import annotations

import hashlib
import logging
import math
import statistics
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
# 枚举
# ═══════════════════════════════════════════════════════════════════════


class FeedbackType(Enum):
    EXPLICIT = "explicit"
    IMPLICIT = "implicit"
    RATING = "rating"
    CORRECTION = "correction"
    REGENERATION = "regeneration"
    ABANDON = "abandon"

    @property
    def is_direct(self) -> bool:
        return self in (
            FeedbackType.EXPLICIT,
            FeedbackType.RATING,
            FeedbackType.CORRECTION,
        )

    @property
    def default_weight(self) -> float:
        return {
            FeedbackType.EXPLICIT: 1.0,
            FeedbackType.IMPLICIT: 0.3,
            FeedbackType.RATING: 0.8,
            FeedbackType.CORRECTION: 1.2,
            FeedbackType.REGENERATION: 0.7,
            FeedbackType.ABANDON: 0.5,
        }[self]


class ExperimentStatus(Enum):
    DRAFT = "draft"
    RUNNING = "running"
    STOPPED = "stopped"
    ARCHIVED = "archived"
    PROMOTED = "promoted"


class SignalSource(Enum):
    API = "api"
    BEHAVIOR = "behavior"
    INFERENCE = "inference"


# ═══════════════════════════════════════════════════════════════════════
# 数据结构
# ═══════════════════════════════════════════════════════════════════════


@dataclass
class FeedbackSignal:
    feedback_type: FeedbackType
    session_id: str
    request_id: str
    rating: float = 0.0
    comment: str = ""
    correction: str = ""
    timestamp: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)
    source: SignalSource = SignalSource.API
    processed: bool = False

    def __post_init__(self) -> None:
        self.rating = max(-1.0, min(1.0, self.rating))

    @property
    def is_positive(self) -> bool:
        return self.rating > 0.05

    @property
    def is_negative(self) -> bool:
        return self.rating < -0.05

    @property
    def is_neutral(self) -> bool:
        return -0.05 <= self.rating <= 0.05

    @property
    def weight(self) -> float:
        base = self.feedback_type.default_weight
        if self.comment:
            base *= 1.3
        if self.correction:
            base *= 1.5
        return base

    @property
    def fingerprint(self) -> str:
        raw = f"{self.session_id}:{self.request_id}:{self.feedback_type.value}"
        return hashlib.md5(raw.encode()).hexdigest()

    def to_dict(self) -> dict[str, Any]:
        return {
            "feedback_type": self.feedback_type.value,
            "session_id": self.session_id,
            "request_id": self.request_id,
            "rating": self.rating,
            "comment": self.comment,
            "correction": self.correction,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
            "source": self.source.value,
        }


@dataclass
class FeedbackReport:
    period: str
    total_signals: int
    positive_ratio: float
    negative_ratio: float
    neutral_ratio: float = 0.0
    top_improvements: list[str] = field(default_factory=list)
    regression_alerts: list[str] = field(default_factory=list)
    avg_rating: float = 0.0
    rating_trend: float = 0.0
    generated_at: float = field(default_factory=time.time)

    @property
    def health_score(self) -> float:
        if self.total_signals == 0:
            return 0.0
        return max(0.0, min(1.0, self.positive_ratio - self.negative_ratio * 2.0 + 0.5))

    def to_dict(self) -> dict[str, Any]:
        return {
            "period": self.period,
            "total_signals": self.total_signals,
            "positive_ratio": self.positive_ratio,
            "negative_ratio": self.negative_ratio,
            "neutral_ratio": self.neutral_ratio,
            "top_improvements": self.top_improvements,
            "regression_alerts": self.regression_alerts,
            "avg_rating": self.avg_rating,
            "rating_trend": self.rating_trend,
            "health_score": self.health_score,
            "generated_at": self.generated_at,
        }


@dataclass
class LearnedPattern:
    key: str
    description: str
    signals: list[FeedbackSignal] = field(default_factory=list)
    confidence: float = 0.0
    created_at: float = field(default_factory=time.time)
    last_matched: float = field(default_factory=time.time)
    match_count: int = 0
    decay_rate: float = 0.01
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def decayed_confidence(self) -> float:
        days_since_match = (time.time() - self.last_matched) / 86400.0
        decay = math.exp(-self.decay_rate * days_since_match)
        return self.confidence * decay

    @property
    def is_stale(self) -> bool:
        return self.decayed_confidence < 0.05


@dataclass
class ExperimentVariant:
    name: str
    weight: float = 1.0
    signals: list[FeedbackSignal] = field(default_factory=list)
    impressions: int = 0
    wins: int = 0
    rating_sum: float = 0.0
    active: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def avg_rating(self) -> float:
        count = len(self.signals)
        return self.rating_sum / count if count > 0 else 0.0

    @property
    def win_rate(self) -> float:
        return self.wins / self.impressions if self.impressions > 0 else 0.0


# ═══════════════════════════════════════════════════════════════════════
# FeedbackCollector - 反馈采集器
# ═══════════════════════════════════════════════════════════════════════


class FeedbackCollector:
    def __init__(self, dedup_window: float = 300.0) -> None:
        self.signals: list[FeedbackSignal] = []
        self._lock = threading.Lock()
        self._fingerprints: dict[str, float] = {}
        self._dedup_window = dedup_window

    def collect_explicit(
        self,
        session_id: str,
        request_id: str,
        feedback_type: FeedbackType,
        rating: float = 0.0,
        comment: str = "",
        correction: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> FeedbackSignal | None:
        signal = FeedbackSignal(
            feedback_type=feedback_type,
            session_id=session_id,
            request_id=request_id,
            rating=self._normalize_explicit(feedback_type, rating),
            comment=comment,
            correction=correction,
            metadata=metadata or {},
            source=SignalSource.API,
        )
        return self._record(signal)

    def infer_implicit(
        self,
        session_id: str,
        request_id: str,
        dwell_time_ms: float = 0.0,
        scroll_depth: float = 0.0,
        did_copy: bool = False,
        did_abandon: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> FeedbackSignal | None:
        rating = self._infer_from_behavior(
            dwell_time_ms=dwell_time_ms,
            scroll_depth=scroll_depth,
            did_copy=did_copy,
            did_abandon=did_abandon,
        )
        fb_type = FeedbackType.ABANDON if did_abandon else FeedbackType.IMPLICIT
        signal = FeedbackSignal(
            feedback_type=fb_type,
            session_id=session_id,
            request_id=request_id,
            rating=rating,
            metadata=metadata or {},
            source=SignalSource.BEHAVIOR,
        )
        return self._record(signal)

    def collect_rating(
        self,
        session_id: str,
        request_id: str,
        stars: int,
        comment: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> FeedbackSignal | None:
        rating = self._normalize_rating(stars)
        signal = FeedbackSignal(
            feedback_type=FeedbackType.RATING,
            session_id=session_id,
            request_id=request_id,
            rating=rating,
            comment=comment,
            metadata=metadata or {},
            source=SignalSource.API,
        )
        return self._record(signal)

    def _normalize_explicit(self, fb_type: FeedbackType, raw_rating: float) -> float:
        if fb_type == FeedbackType.EXPLICIT:
            return max(-1.0, min(1.0, raw_rating))
        if fb_type == FeedbackType.CORRECTION:
            if raw_rating == 0.0:
                return -0.6
            return max(-1.0, min(1.0, raw_rating))
        if fb_type == FeedbackType.REGENERATION:
            if raw_rating == 0.0:
                return -0.4
            return max(-1.0, min(1.0, raw_rating))
        return 0.0

    def _normalize_rating(self, stars: int) -> float:
        clamped = max(1, min(5, stars))
        return (clamped - 3) / 2.0

    def _infer_from_behavior(
        self,
        dwell_time_ms: float,
        scroll_depth: float,
        did_copy: bool,
        did_abandon: bool,
    ) -> float:
        if did_abandon:
            return -0.7
        score = 0.0
        if dwell_time_ms > 30000:
            score += 0.3
        elif dwell_time_ms > 10000:
            score += 0.15
        elif dwell_time_ms < 2000:
            score -= 0.2
        if scroll_depth > 0.8:
            score += 0.2
        elif scroll_depth < 0.2:
            score -= 0.1
        if did_copy:
            score += 0.25
        return max(-1.0, min(1.0, score))

    def _is_duplicate(self, fingerprint: str) -> bool:
        now = time.time()
        expired = [
            fp for fp, ts in self._fingerprints.items() if now - ts > self._dedup_window
        ]
        for fp in expired:
            del self._fingerprints[fp]
        if fingerprint in self._fingerprints:
            return True
        self._fingerprints[fingerprint] = now
        return False

    def _record(self, signal: FeedbackSignal) -> FeedbackSignal | None:
        if self._is_duplicate(signal.fingerprint):
            logger.debug("Duplicate signal filtered: %s", signal.fingerprint)
            return None
        with self._lock:
            self.signals.append(signal)
        logger.debug(
            "Signal recorded: type=%s rating=%.2f session=%s",
            signal.feedback_type.value,
            signal.rating,
            signal.session_id,
        )
        return signal

    def get_signals(
        self,
        session_id: str | None = None,
        feedback_type: FeedbackType | None = None,
        since: float | None = None,
    ) -> list[FeedbackSignal]:
        with self._lock:
            results = self.signals
        if session_id:
            results = [s for s in results if s.session_id == session_id]
        if feedback_type:
            results = [s for s in results if s.feedback_type == feedback_type]
        if since:
            results = [s for s in results if s.timestamp >= since]
        return results

    def clear(self) -> None:
        with self._lock:
            self.signals.clear()
            self._fingerprints.clear()


# ═══════════════════════════════════════════════════════════════════════
# SignalAggregator - 信号聚合器
# ═══════════════════════════════════════════════════════════════════════


class SignalAggregator:
    def __init__(self, window_size: int = 100, ewma_alpha: float = 0.3) -> None:
        self._window: deque[float] = deque(maxlen=window_size)
        self._ewma: float = 0.0
        self._ewma_alpha = ewma_alpha
        self._ema_initialized = False
        self._lock = threading.Lock()
        self._anomaly_history: deque[tuple[float, float]] = deque(maxlen=500)
        self._baseline_mean: float = 0.0
        self._baseline_std: float = 1.0
        self._baseline_samples: int = 0

    def consume(self, signal: FeedbackSignal) -> None:
        self.consume_value(signal.rating, signal.weight)

    def consume_value(self, value: float, weight: float = 1.0) -> None:
        weighted = max(-1.0, min(1.0, value)) * weight
        with self._lock:
            self._window.append(weighted)
            if not self._ema_initialized:
                self._ewma = weighted
                self._ema_initialized = True
            else:
                self._ewma = (
                    self._ewma_alpha * weighted + (1 - self._ewma_alpha) * self._ewma
                )
            self._anomaly_history.append((time.time(), weighted))
            self._update_baseline(weighted)

    def moving_average(self) -> float:
        with self._lock:
            if not self._window:
                return 0.0
            return sum(self._window) / len(self._window)

    def exponential_weighted_average(self) -> float:
        with self._lock:
            return self._ewma

    def aggregate_by_session(
        self, signals: list[FeedbackSignal]
    ) -> dict[str, float]:
        by_session: dict[str, list[float]] = defaultdict(list)
        for s in signals:
            by_session[s.session_id].append(s.rating * s.weight)
        return {sid: statistics.mean(vals) for sid, vals in by_session.items()}

    def aggregate_by_type(
        self, signals: list[FeedbackSignal]
    ) -> dict[FeedbackType, float]:
        by_type: dict[FeedbackType, list[float]] = defaultdict(list)
        for s in signals:
            by_type[s.feedback_type].append(s.rating * s.weight)
        return {ft: statistics.mean(vals) for ft, vals in by_type.items()}

    def aggregate_by_time_window(
        self, signals: list[FeedbackSignal], window_seconds: float
    ) -> list[tuple[float, float]]:
        if not signals:
            return []
        sorted_signals = sorted(signals, key=lambda s: s.timestamp)
        buckets: dict[int, list[float]] = defaultdict(list)
        start = sorted_signals[0].timestamp
        for s in sorted_signals:
            bucket = int((s.timestamp - start) / window_seconds)
            buckets[bucket].append(s.rating * s.weight)
        result: list[tuple[float, float]] = []
        for bucket_idx in sorted(buckets):
            ts = start + bucket_idx * window_seconds + window_seconds / 2
            avg = statistics.mean(buckets[bucket_idx])
            result.append((ts, avg))
        return result

    def _update_baseline(self, value: float) -> None:
        self._baseline_samples += 1
        old_mean = self._baseline_mean
        self._baseline_mean += (value - old_mean) / self._baseline_samples
        if self._baseline_samples > 1:
            self._baseline_std = math.sqrt(
                (self._baseline_samples - 2) / (self._baseline_samples - 1)
                * self._baseline_std ** 2
                + (value - old_mean) * (value - self._baseline_mean)
                / (self._baseline_samples - 1)
            )

    def detect_anomaly(self, threshold_std: float = 2.5) -> bool:
        with self._lock:
            if self._baseline_samples < 10 or self._baseline_std < 1e-6:
                return False
            recent = list(self._window)[-5:] if len(self._window) >= 5 else list(self._window)
            if not recent:
                return False
            recent_mean = sum(recent) / len(recent)
            z_score = abs(recent_mean - self._baseline_mean) / self._baseline_std
            return z_score > threshold_std

    def get_stats(self) -> dict[str, float]:
        with self._lock:
            return {
                "ma": self.moving_average(),
                "ewma": self._ewma,
                "baseline_mean": self._baseline_mean,
                "baseline_std": self._baseline_std,
                "sample_count": self._baseline_samples,
                "window_count": len(self._window),
            }

    def reset(self) -> None:
        with self._lock:
            self._window.clear()
            self._ewma = 0.0
            self._ema_initialized = False
            self._anomaly_history.clear()
            self._baseline_mean = 0.0
            self._baseline_std = 1.0
            self._baseline_samples = 0


# ═══════════════════════════════════════════════════════════════════════
# PatternStore - 模式存储
# ═══════════════════════════════════════════════════════════════════════


class PatternStore:
    def __init__(self, default_decay_rate: float = 0.01) -> None:
        self.patterns: dict[str, LearnedPattern] = {}
        self._lock = threading.Lock()
        self._default_decay_rate = default_decay_rate

    def store(
        self,
        key: str,
        description: str,
        signals: list[FeedbackSignal] | None = None,
        confidence: float = 0.5,
        decay_rate: float | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> LearnedPattern:
        with self._lock:
            pattern = LearnedPattern(
                key=key,
                description=description,
                signals=signals or [],
                confidence=confidence,
                decay_rate=decay_rate or self._default_decay_rate,
                metadata=metadata or {},
            )
            self.patterns[key] = pattern
            return pattern

    def retrieve(self, key: str) -> LearnedPattern | None:
        with self._lock:
            pattern = self.patterns.get(key)
            if pattern is None:
                return None
            if pattern.is_stale:
                del self.patterns[key]
                return None
            return pattern

    def similarity_search(
        self, query: str, top_k: int = 5, min_confidence: float = 0.1
    ) -> list[tuple[LearnedPattern, float]]:
        query_tokens = set(query.lower().split())
        scored: list[tuple[LearnedPattern, float]] = []
        with self._lock:
            for pattern in self.patterns.values():
                if pattern.is_stale:
                    continue
                if pattern.decayed_confidence < min_confidence:
                    continue
                desc_tokens = set(pattern.description.lower().split())
                if not query_tokens or not desc_tokens:
                    continue
                overlap = len(query_tokens & desc_tokens)
                score = overlap / max(len(query_tokens | desc_tokens), 1)
                score *= pattern.decayed_confidence
                if score > 0:
                    scored.append((pattern, score))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def update_confidence(self, key: str, delta: float) -> None:
        with self._lock:
            pattern = self.patterns.get(key)
            if pattern:
                pattern.confidence = max(0.0, min(1.0, pattern.confidence + delta))
                pattern.last_matched = time.time()
                pattern.match_count += 1

    def apply_decay(self) -> int:
        removed = 0
        with self._lock:
            stale_keys = [
                k for k, p in self.patterns.items() if p.is_stale
            ]
            for key in stale_keys:
                del self.patterns[key]
                removed += 1
        return removed

    def get_all_active(self, min_confidence: float = 0.1) -> list[LearnedPattern]:
        with self._lock:
            return [
                p
                for p in self.patterns.values()
                if not p.is_stale and p.decayed_confidence >= min_confidence
            ]

    def clear(self) -> None:
        with self._lock:
            self.patterns.clear()


# ═══════════════════════════════════════════════════════════════════════
# LearningEngine - 学习引擎
# ═══════════════════════════════════════════════════════════════════════


class LearningEngine:
    def __init__(self, pattern_store: PatternStore | None = None) -> None:
        self.pattern_store = pattern_store or PatternStore()
        self.feature_weights: dict[str, float] = {}
        self._feature_gradients: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()
        self.improvement_suggestions: list[str] = []
        self._training_iterations: int = 0

    def extract_patterns(
        self, signals: list[FeedbackSignal], top_k: int = 5
    ) -> list[LearnedPattern]:
        positive = [s for s in signals if s.is_positive]
        negative = [s for s in signals if s.is_negative]

        positives = self._extract_positive_patterns(positive, top_k)
        negatives = self._extract_negative_patterns(negative, top_k)

        return positives + negatives

    def _extract_positive_patterns(
        self, signals: list[FeedbackSignal], top_k: int
    ) -> list[LearnedPattern]:
        if not signals:
            return []
        patterns: list[LearnedPattern] = []
        avg_rating = statistics.mean(s.rating for s in signals)
        pattern = self.pattern_store.store(
            key=f"positive_{self._training_iterations}",
            description=self._summarize_signals(signals, positive=True),
            signals=signals,
            confidence=min(1.0, avg_rating * 0.8 + 0.5),
        )
        patterns.append(pattern)

        sorted_by_rating = sorted(signals, key=lambda s: s.rating, reverse=True)
        for i in range(min(top_k - 1, len(sorted_by_rating))):
            s = sorted_by_rating[i]
            self.pattern_store.store(
                key=f"top_positive_{self._training_iterations}_{i}",
                description=f"High-rated: {s.comment}" if s.comment else f"Rating: {s.rating:.2f}",
                signals=[s],
                confidence=s.rating * 0.9,
            )
        return patterns

    def _extract_negative_patterns(
        self, signals: list[FeedbackSignal], top_k: int
    ) -> list[LearnedPattern]:
        if not signals:
            return []
        patterns: list[LearnedPattern] = []
        avg_abs_rating = statistics.mean(abs(s.rating) for s in signals)
        pattern = self.pattern_store.store(
            key=f"negative_{self._training_iterations}",
            description=self._summarize_signals(signals, positive=False),
            signals=signals,
            confidence=min(1.0, avg_abs_rating * 0.8 + 0.3),
        )
        patterns.append(pattern)

        for s in signals:
            if s.correction:
                self.pattern_store.store(
                    key=f"correction_{self._training_iterations}_{hash(s.correction) % 10000}",
                    description=f"User corrected: {s.correction[:120]}",
                    signals=[s],
                    confidence=0.7,
                )

        for i in range(min(top_k - 1, len(signals))):
            s = sorted(signals, key=lambda s: s.rating)[i]
            self.pattern_store.store(
                key=f"worst_{self._training_iterations}_{i}",
                description=f"Low-rated: {s.comment}" if s.comment else f"Rating: {s.rating:.2f}",
                signals=[s],
                confidence=abs(s.rating) * 0.9,
            )
        return patterns

    def _summarize_signals(
        self, signals: list[FeedbackSignal], positive: bool
    ) -> str:
        label = "Positive" if positive else "Negative"
        comments = [s.comment for s in signals if s.comment]
        corrections = [s.correction for s in signals if s.correction]
        parts: list[str] = [
            f"{label} pattern from {len(signals)} signals",
            f"Avg rating: {statistics.mean(s.rating for s in signals):.2f}",
        ]
        if comments:
            parts.append(f"Comments: {'; '.join(comments[:3])}")
        if corrections:
            parts.append(f"Corrections: {'; '.join(corrections[:3])}")
        return " | ".join(parts)

    def update_feature_weights(
        self, signals: list[FeedbackSignal], feature_names: list[str] | None = None
    ) -> dict[str, float]:
        with self._lock:
            if feature_names is None:
                feature_names = [
                    fname
                    for s in signals
                    for fname in s.metadata.get("features", [])
                ]
            for s in signals:
                feats = s.metadata.get("features", [])
                if not feats and feature_names:
                    feats = feature_names
                for feat in feats:
                    gradient = s.rating * s.weight * 0.01
                    self._feature_gradients[feat].append(gradient)
                    current = self.feature_weights.get(feat, 0.0)
                    self.feature_weights[feat] = current + gradient

            result = dict(self.feature_weights)
            self._training_iterations += 1
            return result

    def generate_improvement_suggestions(
        self, min_confidence: float = 0.3
    ) -> list[str]:
        suggestions: list[str] = []
        negative_patterns = [
            p for p in self.pattern_store.get_all_active(min_confidence)
            if "negative" in p.key or "correction" in p.key
        ]
        for p in sorted(negative_patterns, key=lambda x: x.decayed_confidence, reverse=True):
            suggestions.append(
                f"[conf={p.decayed_confidence:.2f}] Improve: {p.description[:200]}"
            )
        positive_patterns = [
            p for p in self.pattern_store.get_all_active(min_confidence)
            if "positive" in p.key or "top_positive" in p.key
        ]
        for p in sorted(positive_patterns, key=lambda x: x.decayed_confidence, reverse=True):
            suggestions.append(
                f"[conf={p.decayed_confidence:.2f}] Keep doing: {p.description[:200]}"
            )

        with self._lock:
            if self._feature_gradients:
                trend_feats = sorted(
                    self._feature_gradients.items(),
                    key=lambda kv: sum(kv[1]),
                )
                for feat, grads in trend_feats[:3]:
                    total = sum(grads)
                    if total < -0.05:
                        suggestions.append(
                            f"[feature] {feat}: declining (sum={total:.3f}), needs attention"
                        )

        self.improvement_suggestions = suggestions
        return suggestions

    def get_feature_weights(self) -> dict[str, float]:
        with self._lock:
            return dict(self.feature_weights)

    def reset(self) -> None:
        with self._lock:
            self.feature_weights.clear()
            self._feature_gradients.clear()
            self.improvement_suggestions.clear()
            self._training_iterations = 0


# ═══════════════════════════════════════════════════════════════════════
# ABTestFramework - A/B 测试框架
# ═══════════════════════════════════════════════════════════════════════


class ABTestFramework:
    def __init__(self) -> None:
        self.variants: dict[str, ExperimentVariant] = {}
        self.status: ExperimentStatus = ExperimentStatus.DRAFT
        self._history: list[dict[str, Any]] = []
        self._lock = threading.Lock()
        self._hash_seed: str = "ab_test_seed_v1"

    def create_variant(
        self, name: str, weight: float = 1.0, metadata: dict[str, Any] | None = None
    ) -> ExperimentVariant:
        with self._lock:
            variant = ExperimentVariant(
                name=name,
                weight=weight,
                metadata=metadata or {},
            )
            self.variants[name] = variant
            return variant

    def assign_user(self, user_id: str) -> str:
        with self._lock:
            active = [v for v in self.variants.values() if v.active]
            if not active:
                return "__no_variant__"

            total_weight = sum(v.weight for v in active)
            hash_val = int(
                hashlib.sha256(f"{self._hash_seed}:{user_id}".encode()).hexdigest(), 16
            )
            point = (hash_val % 10000) / 10000.0

            cumulative = 0.0
            for v in active:
                cumulative += v.weight / total_weight
                if point <= cumulative:
                    return v.name

            return active[-1].name

    def record_impression(self, variant_name: str) -> None:
        with self._lock:
            if variant_name in self.variants:
                self.variants[variant_name].impressions += 1

    def record_signal(
        self, variant_name: str, signal: FeedbackSignal
    ) -> None:
        with self._lock:
            if variant_name in self.variants:
                variant = self.variants[variant_name]
                variant.signals.append(signal)
                variant.rating_sum += signal.rating
                if signal.is_positive:
                    variant.wins += 1

    def z_test(
        self, variant_a: str, variant_b: str, alpha: float = 0.05
    ) -> dict[str, Any]:
        with self._lock:
            va = self.variants.get(variant_a)
            vb = self.variants.get(variant_b)
        if not va or not vb:
            return {"significant": False, "error": "variant not found"}

        ratings_a = [s.rating for s in va.signals]
        ratings_b = [s.rating for s in vb.signals]
        if len(ratings_a) < 5 or len(ratings_b) < 5:
            return {"significant": False, "error": "insufficient data"}

        mean_a = statistics.mean(ratings_a)
        mean_b = statistics.mean(ratings_b)
        var_a = statistics.variance(ratings_a) if len(ratings_a) > 1 else 0.0
        var_b = statistics.variance(ratings_b) if len(ratings_b) > 1 else 0.0

        se_a = var_a / len(ratings_a)
        se_b = var_b / len(ratings_b)
        se_diff = math.sqrt(se_a + se_b)
        if se_diff < 1e-10:
            return {"significant": False, "error": "zero variance"}

        z_stat = abs(mean_a - mean_b) / se_diff
        z_critical = 1.96 if alpha == 0.05 else 1.645

        significant = z_stat > z_critical
        winner = variant_a if mean_a > mean_b else variant_b
        loser = variant_b if winner == variant_a else variant_a

        return {
            "significant": significant,
            "z_statistic": z_stat,
            "z_critical": z_critical,
            "winner": winner if significant else None,
            "loser": loser if significant else None,
            "mean_a": mean_a,
            "mean_b": mean_b,
            "sample_a": len(ratings_a),
            "sample_b": len(ratings_b),
        }

    def auto_promote(
        self, control: str, treatment: str, alpha: float = 0.05
    ) -> dict[str, Any]:
        result = self.z_test(control, treatment, alpha=alpha)
        if result["significant"] and result.get("winner") == treatment:
            with self._lock:
                self.variants[treatment].weight = max(
                    self.variants[treatment].weight, self.variants[control].weight * 2.0
                )
                self.variants[control].active = False
            self.status = ExperimentStatus.PROMOTED
            self._history.append(
                {
                    "timestamp": time.time(),
                    "event": "auto_promote",
                    "winner": treatment,
                    "loser": control,
                    "z_stat": result["z_statistic"],
                }
            )
            logger.info(
                "Auto-promoted variant %s over %s (z=%.3f)", treatment, control, result["z_statistic"]
            )
        return result

    def start(self) -> None:
        with self._lock:
            self.status = ExperimentStatus.RUNNING
            self._history.append({"timestamp": time.time(), "event": "start"})
            for v in self.variants.values():
                v.active = True
                v.signals.clear()
                v.impressions = 0
                v.wins = 0
                v.rating_sum = 0.0

    def stop(self) -> None:
        with self._lock:
            self.status = ExperimentStatus.STOPPED
            self._history.append({"timestamp": time.time(), "event": "stop"})

    def archive(self) -> None:
        with self._lock:
            self.status = ExperimentStatus.ARCHIVED
            for v in self.variants.values():
                v.active = False
            self._history.append({"timestamp": time.time(), "event": "archive"})

    def get_summary(self) -> dict[str, Any]:
        with self._lock:
            variants = []
            for v in self.variants.values():
                variants.append(
                    {
                        "name": v.name,
                        "active": v.active,
                        "impressions": v.impressions,
                        "wins": v.wins,
                        "avg_rating": v.avg_rating,
                        "win_rate": v.win_rate,
                        "signal_count": len(v.signals),
                    }
                )
            return {
                "status": self.status.value,
                "variants": variants,
                "total_impressions": sum(v.impressions for v in self.variants.values()),
                "history_count": len(self._history),
            }

    def reset(self) -> None:
        with self._lock:
            self.variants.clear()
            self.status = ExperimentStatus.DRAFT
            self._history.clear()


# ═══════════════════════════════════════════════════════════════════════
# ImprovementCycle - 改进循环
# ═══════════════════════════════════════════════════════════════════════


@dataclass
class ActionItem:
    description: str
    priority: float
    implemented: bool = False
    implemented_at: float = 0.0
    impact_measured: bool = False
    pre_metric: float = 0.0
    post_metric: float = 0.0


class ImprovementCycle:
    def __init__(
        self,
        collector: FeedbackCollector,
        aggregator: SignalAggregator,
        engine: LearningEngine,
        pattern_store: PatternStore,
    ) -> None:
        self.collector = collector
        self.aggregator = aggregator
        self.engine = engine
        self.pattern_store = pattern_store
        self.action_items: list[ActionItem] = []
        self._cycle_count: int = 0
        self._lock = threading.Lock()

    def analyze(self, period: str = "auto") -> FeedbackReport:
        signals = self.collector.get_signals()
        total = len(signals)
        if total == 0:
            return FeedbackReport(period=period, total_signals=0, positive_ratio=0.0, negative_ratio=0.0)

        positive = sum(1 for s in signals if s.is_positive)
        negative = sum(1 for s in signals if s.is_negative)
        neutral = total - positive - negative

        avg_rating = statistics.mean(s.rating for s in signals)

        trends = self.aggregator.aggregate_by_time_window(signals, 3600.0)
        trend = 0.0
        if len(trends) >= 2:
            trend = trends[-1][1] - trends[0][1]

        patterns = self.engine.extract_patterns(signals)
        suggestions = self.engine.generate_improvement_suggestions()

        improvements = [
            s for s in suggestions
            if s.startswith("[conf=") and "Keep doing" in s
        ][:3]
        if not improvements:
            improvements = [f"Positive pattern: {p.description[:120]}" for p in patterns if "positive" in p.key]

        regressions = [
            s for s in suggestions
            if s.startswith("[conf=") and "Improve" in s
        ][:3]
        if not regressions:
            regressions = [f"Negative pattern: {p.description[:120]}" for p in patterns if "negative" in p.key or "correction" in p.key]

        return FeedbackReport(
            period=period,
            total_signals=total,
            positive_ratio=positive / total,
            negative_ratio=negative / total,
            neutral_ratio=neutral / total,
            top_improvements=improvements,
            regression_alerts=regressions,
            avg_rating=avg_rating,
            rating_trend=trend,
        )

    def generate_action_items(self) -> list[ActionItem]:
        with self._lock:
            suggestions = self.engine.generate_improvement_suggestions()
            items: list[ActionItem] = []
            for sug in suggestions[:5]:
                if sug.startswith("[conf="):
                    parts = sug.split("] ", 1)
                    conf_str = parts[0].replace("[conf=", "")
                    try:
                        conf = float(conf_str)
                    except ValueError:
                        conf = 0.5
                    desc = parts[1] if len(parts) > 1 else sug
                else:
                    conf = 0.5
                    desc = sug
                items.append(
                    ActionItem(
                        description=desc,
                        priority=conf,
                    )
                )
            self.action_items = items
            return items

    def track_implementation(self, item_index: int) -> None:
        with self._lock:
            if 0 <= item_index < len(self.action_items):
                item = self.action_items[item_index]
                if not item.implemented:
                    item.pre_metric = self.aggregator.moving_average()
                item.implemented = True
                item.implemented_at = time.time()

    def measure_impact(self, item_index: int) -> float:
        with self._lock:
            if item_index < 0 or item_index >= len(self.action_items):
                return 0.0
            item = self.action_items[item_index]
            if not item.implemented:
                return 0.0
            item.post_metric = self.aggregator.moving_average()
            item.impact_measured = True
            return item.post_metric - item.pre_metric

    def run_cycle(self) -> FeedbackReport:
        self._cycle_count += 1
        report = self.analyze(period=f"cycle_{self._cycle_count}")
        signals = self.collector.get_signals()
        self.engine.extract_patterns(signals)
        self.engine.update_feature_weights(signals)
        self.pattern_store.apply_decay()
        self.generate_action_items()

        if report.negative_ratio > 0.3 and self.aggregator.detect_anomaly():
            logger.warning(
                "Quality anomaly detected: negative_ratio=%.2f", report.negative_ratio
            )

        return report

    def get_unimplemented_items(self) -> list[ActionItem]:
        with self._lock:
            return [item for item in self.action_items if not item.implemented]

    def reset(self) -> None:
        with self._lock:
            self.action_items.clear()
            self._cycle_count = 0


# ═══════════════════════════════════════════════════════════════════════
# 双轨制理论: RLHF 数学框架
# ═══════════════════════════════════════════════════════════════════════


class RLHFTheory:
    """RLHF 理论轨道 —— 为工程实现提供数学注释和参考实现。

    不直接驱动生产系统, 而是作为理论对标的参考基准。
    """

    @staticmethod
    def bradley_terry_probability(r_i: float, r_j: float) -> float:
        """Bradley-Terry 偏好概率。

        P(i preferred over j | r_i, r_j) = exp(r_i) / (exp(r_i) + exp(r_j))
        = sigmoid(r_i - r_j)

        其中 r_i, r_j 是响应 i 和 j 的隐含奖励分数。
        """
        return 1.0 / (1.0 + math.exp(r_j - r_i))

    @staticmethod
    def dpo_loss(
        log_policy_win: float,
        log_policy_lose: float,
        log_ref_win: float,
        log_ref_lose: float,
        beta: float = 0.1,
    ) -> float:
        """DPO (Direct Preference Optimization) 损失。

        L_DPO = -E[ log sigma( beta * (delta_win - delta_lose) ) ]
        其中 delta = log pi(y|x) - log pi_ref(y|x)
        """
        delta_win = log_policy_win - log_ref_win
        delta_lose = log_policy_lose - log_ref_lose
        logit = beta * (delta_win - delta_lose)
        return -math.log(1.0 / (1.0 + math.exp(-logit)))

    @staticmethod
    def reward_from_bradley_terry(
        preferences: list[tuple[int, int, float]],
    ) -> dict[int, float]:
        """从偏好对中通过 Bradley-Terry 模型拟合奖励分数。

        preferences: [(i, j, weight), ...] 表示在 weight 次比较中 i 优于 j。
        使用简单迭代求解（Elastic 评分）。
        """
        players: set[int] = set()
        for i, j, _ in preferences:
            players.add(i)
            players.add(j)
        n = len(players)
        player_list = sorted(players)
        idx_map = {p: idx for idx, p in enumerate(player_list)}

        w = [[0.0] * n for _ in range(n)]
        for i, j, weight in preferences:
            w[idx_map[i]][idx_map[j]] += weight

        ratings = [0.0] * n
        for _iter in range(100):
            new_ratings = [0.0] * n
            for a in range(n):
                total = 0.0
                count = 0
                for b in range(n):
                    if a == b:
                        continue
                    w_ab = w[a][b]
                    w_ba = w[b][a]
                    total_weight = w_ab + w_ba
                    if total_weight > 0:
                        p_ab = RLHFTheory.bradley_terry_probability(
                            ratings[a], ratings[b]
                        )
                        observed = w_ab / total_weight
                        total += total_weight * (observed - p_ab) * 0.5
                        count += total_weight
                if count > 0:
                    new_ratings[a] = ratings[a] + total / count * 0.1
                else:
                    new_ratings[a] = ratings[a]
            if max(abs(new_ratings[k] - ratings[k]) for k in range(n)) < 1e-6:
                ratings = new_ratings
                break
            ratings = new_ratings

        return {player_list[k]: ratings[k] for k in range(n)}

    @staticmethod
    def kl_divergence(p: list[float], q: list[float]) -> float:
        """KL 散度: KL(p||q) = sum_i p_i * log(p_i / q_i)。

        RLHF PPO 目标中用于约束策略不偏离参考策略太远。
        """
        eps = 1e-10
        return sum(
            pi * math.log((pi + eps) / (qi + eps)) for pi, qi in zip(p, q) if pi > 0
        )

    @staticmethod
    def ppo_objective(
        advantage: float,
        policy_ratio: float,
        clip_epsilon: float = 0.2,
        kl_penalty_coef: float = 0.01,
        kl_div: float = 0.0,
    ) -> float:
        """PPO 裁剪目标函数。

        L_CLIP = E[ min(r*A, clip(r, 1-eps, 1+eps)*A) - beta*KL ]
        其中 r = pi_new(a|s) / pi_old(a|s)
        """
        clipped_ratio = max(1.0 - clip_epsilon, min(1.0 + clip_epsilon, policy_ratio))
        surrogate = policy_ratio * advantage
        clipped = clipped_ratio * advantage
        clipped_objective = min(surrogate, clipped)
        return clipped_objective - kl_penalty_coef * kl_div

    @staticmethod
    def expected_satisfaction(
        ratings: list[float], temperature: float = 1.0
    ) -> float:
        """基于 softmax 的期望满意度。

        将评分序列转换为 softmax 分布, 计算期望值。
        温度控制对极端评分的敏感度。
        """
        if not ratings:
            return 0.0
        exp_ratings = [math.exp(r / temperature) for r in ratings]
        total = sum(exp_ratings)
        if total == 0:
            return 0.0
        probs = [e / total for e in exp_ratings]
        return sum(r * p for r, p in zip(ratings, probs))

    @staticmethod
    def uncertainty_estimate(preferences: list[tuple[int, int, float]]) -> float:
        """基于偏好矩阵一致性估计标注不确定性。

        利用偏好矩阵的对称性: 如果 i > j 有 w_ij 票, j > i 有 w_ji 票,
        则不一致性比例 = min(w_ij, w_ji) / max(w_ij, w_ji)。
        返回平均不一致性比例, 用于评估标注质量。
        """
        pairs: dict[tuple[int, int], tuple[float, float]] = defaultdict(lambda: (0.0, 0.0))
        for i, j, w in preferences:
            a, b = pairs[(i, j)]
            pairs[(i, j)] = (a + w, b)
            ba, bb = pairs[(j, i)]
            pairs[(j, i)] = (ba, bb + 0.0)

        inconsistencies: list[float] = []
        for (i, j), (w_ij, _) in pairs.items():
            w_ji, _ = pairs.get((j, i), (0.0, 0.0))
            if w_ij > 0 or w_ji > 0:
                total_weight = w_ij + w_ji
                if total_weight > 0:
                    inconsistencies.append(
                        min(w_ij, w_ji) / max(w_ij, w_ji) if max(w_ij, w_ji) > 0 else 0.0
                    )

        return statistics.mean(inconsistencies) if inconsistencies else 0.0


# ═══════════════════════════════════════════════════════════════════════
# FeedbackLoop - 顶层编排
# ═══════════════════════════════════════════════════════════════════════


class FeedbackLoop:
    """反馈闭环顶层编排器。

    将 Collector / Aggregator / PatternStore / LearningEngine /
    ABTestFramework / ImprovementCycle 串联为完整闭环。
    """

    def __init__(self) -> None:
        self.collector = FeedbackCollector()
        self.aggregator = SignalAggregator()
        self.pattern_store = PatternStore()
        self.engine = LearningEngine(self.pattern_store)
        self.ab_test = ABTestFramework()
        self.improvement_cycle = ImprovementCycle(
            collector=self.collector,
            aggregator=self.aggregator,
            engine=self.engine,
            pattern_store=self.pattern_store,
        )
        self.rlhf = RLHFTheory()
        self._lock = threading.Lock()

    def ingest_signal(self, signal: FeedbackSignal) -> None:
        self.collector._record(signal)
        self.aggregator.consume(signal)

        variant_name = signal.metadata.get("ab_variant", "__default__")
        self.ab_test.record_signal(variant_name, signal)
        self.ab_test.record_impression(variant_name)

    def run_improvement_cycle(self) -> FeedbackReport:
        return self.improvement_cycle.run_cycle()

    def generate_report(self) -> FeedbackReport:
        return self.improvement_cycle.analyze()

    def get_rlhf_theory(self) -> RLHFTheory:
        return self.rlhf

    def get_summary(self) -> dict[str, Any]:
        return {
            "signals_collected": len(self.collector.signals),
            "aggregator_stats": self.aggregator.get_stats(),
            "active_patterns": len(self.pattern_store.get_all_active()),
            "ab_test": self.ab_test.get_summary(),
            "action_items": len(self.improvement_cycle.action_items),
            "action_pending": len(self.improvement_cycle.get_unimplemented_items()),
        }

    def reset(self) -> None:
        self.collector.clear()
        self.aggregator.reset()
        self.pattern_store.clear()
        self.engine.reset()
        self.ab_test.reset()
        self.improvement_cycle.reset()
