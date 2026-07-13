"""
CEE Learning — 高级自学习扩展模块

新增:
  - MetaLearner: 学会如何学习 — 优化自身的学习策略
  - ReinforcementTuner: 基于反馈信号的强化学习参数调优
  - AnomalyDetector: 异常检测 — 识别输出中的异常模式
  - KnowledgeDistiller: 知识蒸馏 — 将复杂模型知识压缩迁移
  - TransferAdapter: 迁移学习适配器
"""

from __future__ import annotations

import logging
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

import numpy as np


logger = logging.getLogger(__name__)


class LearningStrategy(Enum):
    EXPLORATION = "exploration"
    EXPLOITATION = "exploitation"
    BALANCED = "balanced"
    CURRICULUM = "curriculum"
    ACTIVE = "active"


@dataclass
class MetaLearningProfile:
    """元学习画像 — 描述学习器自身的学习偏好"""
    preferred_strategy: LearningStrategy = LearningStrategy.BALANCED
    learning_rate: float = 0.01
    exploration_ratio: float = 0.2
    adaptation_speed: float = 0.5
    confidence_threshold: float = 0.6
    success_history: list[float] = field(default_factory=list)
    strategy_performance: dict[str, list[float]] = field(default_factory=dict)

    def update(self, strategy: LearningStrategy, outcome: float) -> None:
        self.success_history.append(outcome)
        if len(self.success_history) > 100:
            self.success_history = self.success_history[-100:]

        key = strategy.value
        if key not in self.strategy_performance:
            self.strategy_performance[key] = []
        self.strategy_performance[key].append(outcome)
        if len(self.strategy_performance[key]) > 50:
            self.strategy_performance[key] = self.strategy_performance[key][-50:]

    @property
    def average_success_rate(self) -> float:
        return float(np.mean(self.success_history)) if self.success_history else 0.5

    def best_strategy(self) -> LearningStrategy:
        best = LearningStrategy.BALANCED
        best_score = -1.0
        for strategy_name, scores in self.strategy_performance.items():
            if scores:
                mean = np.mean(scores)
                if mean > best_score:
                    best_score = mean
                    for s in LearningStrategy:
                        if s.value == strategy_name:
                            best = s
                            break
        return best


class MetaLearner:
    """元学习器 — 优化自身的学习策略"""

    def __init__(self):
        self._profile = MetaLearningProfile()
        self._learning_history: list[dict[str, Any]] = []

    def select_strategy(self, task_complexity: float = 0.5) -> LearningStrategy:
        if len(self._profile.success_history) < 10:
            return (
                LearningStrategy.EXPLORATION if np.random.random() < 0.3
                else LearningStrategy.BALANCED
            )

        if task_complexity > 0.7:
            return (
                LearningStrategy.ACTIVE if self._profile.average_success_rate > 0.6
                else LearningStrategy.CURRICULUM
            )

        if self._profile.exploration_ratio > 0.3:
            return LearningStrategy.EXPLORATION

        return self._profile.best_strategy()

    def learn_from_outcome(self, strategy: LearningStrategy,
                            outcome: float, task_info: dict[str, Any] | None = None) -> dict[str, Any]:
        self._profile.update(strategy, outcome)
        self._learning_history.append({
            "strategy": strategy.value,
            "outcome": outcome,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "task_info": task_info or {},
        })

        if outcome < 0.4:
            self._profile.exploration_ratio = min(1.0, self._profile.exploration_ratio + 0.1)
        elif outcome > 0.7:
            self._profile.exploration_ratio = max(0.05, self._profile.exploration_ratio - 0.05)

        return {
            "selected_strategy": strategy.value,
            "avg_success_rate": round(self._profile.average_success_rate, 4),
            "new_exploration_ratio": round(self._profile.exploration_ratio, 4),
            "best_strategy_so_far": self._profile.best_strategy().value,
        }

    def profile(self) -> dict[str, Any]:
        return {
            "preferred_strategy": self._profile.preferred_strategy.value,
            "learning_rate": self._profile.learning_rate,
            "exploration_ratio": round(self._profile.exploration_ratio, 4),
            "average_success_rate": round(self._profile.average_success_rate, 4),
            "total_learning_events": len(self._profile.success_history),
            "best_strategy": self._profile.best_strategy().value,
        }


class ReinforcementTuner:
    """强化学习参数调优器 — 基于反馈信号自动调参"""

    def __init__(self, learning_rate: float = 0.01):
        self.learning_rate = learning_rate
        self._param_history: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._param_values: dict[str, float] = {}
        self._param_gradients: dict[str, float] = defaultdict(float)

    def register_parameter(self, name: str, initial_value: float = 0.5,
                            bounds: tuple[float, float] = (0.0, 1.0)) -> None:
        self._param_values[name] = initial_value

    def get_parameter(self, name: str) -> float:
        return self._param_values.get(name, 0.5)

    def update(self, name: str, reward: float,
                context: dict[str, Any] | None = None) -> float:
        if name not in self._param_values:
            self.register_parameter(name)

        current = self._param_values[name]
        noise = np.random.normal(0, 0.05)
        exploration = noise * (1.0 - min(1.0, len(self._param_history[name]) / 100.0))

        gradient = reward * noise
        self._param_gradients[name] = (
            self._param_gradients[name] * 0.9 + gradient * 0.1
        )

        new_value = current + self.learning_rate * self._param_gradients[name] + exploration
        new_value = np.clip(new_value, 0.0, 1.0)

        self._param_values[name] = float(new_value)
        self._param_history[name].append({
            "value": current, "reward": reward, "gradient": gradient,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return float(new_value)

    def get_all_params(self) -> dict[str, dict[str, Any]]:
        return {
            name: {
                "value": value,
                "gradient": round(self._param_gradients.get(name, 0.0), 6),
                "history_length": len(self._param_history[name]),
            }
            for name, value in self._param_values.items()
        }


class AnomalyDetector:
    """异常检测器 — 基于统计方法检测输出异常"""

    def __init__(self, window_size: int = 100, sensitivity: float = 3.0):
        self.window_size = window_size
        self.sensitivity = sensitivity
        self._observations: dict[str, deque] = defaultdict(
            lambda: deque(maxlen=window_size)
        )
        self._baselines: dict[str, dict[str, float]] = {}
        self._anomaly_log: list[dict[str, Any]] = []

    def observe(self, metric_name: str, value: float,
                 context: dict[str, Any] | None = None) -> dict[str, Any]:
        self._observations[metric_name].append(value)

        if len(self._observations[metric_name]) < 10:
            return {"anomaly": False, "metric": metric_name, "reason": "insufficient_data"}

        values = np.array(list(self._observations[metric_name]))
        mean = np.mean(values)
        std = np.std(values) if len(values) > 1 else 1e-6

        self._baselines[metric_name] = {"mean": float(mean), "std": float(std)}

        z_score = abs(value - mean) / max(std, 1e-6)
        is_anomaly = z_score > self.sensitivity

        if is_anomaly:
            self._anomaly_log.append({
                "metric": metric_name,
                "value": value,
                "z_score": float(z_score),
                "baseline_mean": float(mean),
                "baseline_std": float(std),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "context": context or {},
            })

        return {
            "anomaly": is_anomaly,
            "metric": metric_name,
            "z_score": float(z_score),
            "baseline_mean": float(mean),
            "value": value,
            "severity": "high" if z_score > 5.0 else "medium" if z_score > 4.0 else "low",
        }

    def get_baselines(self) -> dict[str, dict[str, float]]:
        return dict(self._baselines)

    def get_recent_anomalies(self, n: int = 10) -> list[dict[str, Any]]:
        return self._anomaly_log[-n:]

    def reset_metric(self, metric_name: str) -> None:
        self._observations.pop(metric_name, None)
        self._baselines.pop(metric_name, None)


class KnowledgeDistiller:
    """知识蒸馏器 — 将复杂模型知识压缩为更简洁的形式"""

    def __init__(self, temperature: float = 3.0):
        self.temperature = temperature
        self._distilled_knowledge: dict[str, dict[str, Any]] = {}
        self._distillation_history: list[dict[str, Any]] = []

    def distill(self, teacher_outputs: list[dict[str, Any]],
                 target_concept: str = "") -> dict[str, Any]:
        if not teacher_outputs:
            return {"error": "no teacher outputs to distill"}

        key_insights = self._extract_core_insights(teacher_outputs)
        confidence_patterns = self._analyze_confidence(teacher_outputs)
        distilled_rules = self._derive_rules(key_insights)

        result = {
            "concept": target_concept,
            "teacher_count": len(teacher_outputs),
            "key_insights": key_insights,
            "confidence_patterns": confidence_patterns,
            "distilled_rules": distilled_rules,
            "compression_ratio": len(distilled_rules) / max(len(key_insights), 1),
            "temperature": self.temperature,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if target_concept:
            self._distilled_knowledge[target_concept] = result
        self._distillation_history.append(result)

        return result

    def _extract_core_insights(self, outputs: list[dict[str, Any]]) -> list[str]:
        insights = []
        for output in outputs:
            text = output.get("content", output.get("text", output.get("result", "")))
            if text:
                sentences = [s.strip() for s in str(text).split(".") if len(s.strip()) > 10]
                insights.extend(sentences[:3])
        return self._deduplicate_similar(insights)[:10]

    def _analyze_confidence(self, outputs: list[dict[str, Any]]) -> dict[str, float]:
        confidences = [
            o.get("confidence", o.get("score", 0.5)) for o in outputs
        ]
        if not confidences:
            return {"mean": 0.5, "std": 0.0, "min": 0.5, "max": 0.5}

        return {
            "mean": round(float(np.mean(confidences)), 4),
            "std": round(float(np.std(confidences)), 4),
            "min": round(float(np.min(confidences)), 4),
            "max": round(float(np.max(confidences)), 4),
        }

    def _derive_rules(self, insights: list[str]) -> list[dict[str, Any]]:
        rules = []
        for insight in insights[:5]:
            words = set(insight.lower().split())
            key_terms = [w for w in words if len(w) > 3 and w.isalpha()]
            rules.append({
                "insight": insight[:100],
                "key_terms": key_terms[:5],
                "generality": min(len(key_terms) / 10.0, 1.0),
            })
        return rules

    @staticmethod
    def _deduplicate_similar(strings: list[str]) -> list[str]:
        seen_hashes = set()
        unique = []
        for s in strings:
            h = hash(s.lower()[:50])
            if h not in seen_hashes:
                seen_hashes.add(h)
                unique.append(s)
        return unique

    def get_distilled(self, concept: str) -> dict[str, Any] | None:
        return self._distilled_knowledge.get(concept)

    def export(self) -> dict[str, Any]:
        return {
            "concepts": list(self._distilled_knowledge.keys()),
            "total_distillations": len(self._distillation_history),
            "knowledge": self._distilled_knowledge,
        }


class TransferAdapter:
    """迁移学习适配器 — 将源域知识适配到目标域"""

    def __init__(self):
        self._adaptations: dict[str, dict[str, Any]] = {}
        self._mapping_rules: list[dict[str, Any]] = []

    def adapt(self, source_knowledge: dict[str, Any],
               target_domain: str, adaptation_type: str = "domain") -> dict[str, Any]:
        source_domain = source_knowledge.get("domain", source_knowledge.get("concept", "unknown"))
        key_mappings = self._generate_mappings(
            source_knowledge.get("key_insights", []), target_domain
        )

        adapted = {
            "source_domain": source_domain,
            "target_domain": target_domain,
            "adaptation_type": adaptation_type,
            "mappings": key_mappings,
            "confidence": self._adaptation_confidence(key_mappings),
            "preserved_knowledge_ratio": 0.7,
        }

        self._adaptations[f"{source_domain}->{target_domain}"] = adapted
        return adapted

    def _generate_mappings(self, insights: list[str],
                            target_domain: str) -> list[dict[str, str]]:
        mappings = []
        target_terms = target_domain.lower().replace("_", " ").split()

        for insight in insights[:5]:
            mapped = self._map_insight(insight, target_terms)
            if mapped:
                mappings.append(mapped)

        return mappings

    @staticmethod
    def _map_insight(insight: str, target_terms: list[str]) -> dict[str, str] | None:
        words = insight.lower().split()
        key_words = [w for w in words if len(w) > 3 and w not in {"this", "that", "with", "from"}]
        if not key_words:
            return None
        return {"original_concept": " ".join(key_words[:2]),
                 "mapped_concept": " ".join(target_terms[:2]),
                 "insight": insight[:80]}

    @staticmethod
    def _adaptation_confidence(mappings: list[dict]) -> float:
        if not mappings:
            return 0.2
        return 0.5 + min(len(mappings) * 0.1, 0.5)

    def get_adaptation(self, source: str, target: str) -> dict[str, Any] | None:
        return self._adaptations.get(f"{source}->{target}")
