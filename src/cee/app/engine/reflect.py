"""
Self-Reflection Metacognition Engine
- Output quality evaluation
- Iterative self-improvement loop
- Metacognitive monitoring
- Confidence calibration
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class ReflectionDimension(str, Enum):
    ACCURACY = "accuracy"
    COMPLETENESS = "completeness"
    CLARITY = "clarity"
    RELEVANCE = "relevance"
    CONCISENESS = "conciseness"
    CONSISTENCY = "consistency"
    HELPFULNESS = "helpfulness"


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNSURE = "unsure"

    @classmethod
    def from_score(cls, score: float) -> ConfidenceLevel:
        if score > 0.8:
            return cls.HIGH
        if score > 0.5:
            return cls.MEDIUM
        if score > 0.3:
            return cls.LOW
        return cls.UNSURE


@dataclass
class ReflectionResult:
    dimension_scores: dict[str, float]
    overall_score: float
    confidence: ConfidenceLevel
    issues: list[str]
    suggestions: list[str]
    improved_version: Optional[str] = None
    iteration_count: int = 0


@dataclass
class MetacognitiveState:
    session_id: str
    total_reflections: int = 0
    avg_scores: dict[str, float] = field(default_factory=dict)
    improvement_trend: list[float] = field(default_factory=list)
    patterns: dict[str, int] = field(default_factory=dict)


class SelfCritic:
    def __init__(self):
        self._dimension_weights = {
            ReflectionDimension.ACCURACY.value: 0.25,
            ReflectionDimension.COMPLETENESS.value: 0.20,
            ReflectionDimension.CLARITY.value: 0.20,
            ReflectionDimension.RELEVANCE.value: 0.15,
            ReflectionDimension.HELPFULNESS.value: 0.10,
            ReflectionDimension.CONCISENESS.value: 0.10,
        }

    def evaluate(
        self, query: str, response: str, context: Optional[str] = None
    ) -> ReflectionResult:
        scores: dict[str, float] = {}
        issues: list[str] = []
        suggestions: list[str] = []

        scores["accuracy"] = self._check_accuracy(query, response)
        scores["completeness"] = self._check_completeness(query, response)
        scores["clarity"] = self._check_clarity(response)
        scores["relevance"] = self._check_relevance(query, response)
        scores["conciseness"] = self._check_conciseness(response)
        scores["helpfulness"] = self._check_helpfulness(query, response)
        scores["consistency"] = self._check_consistency(response, context)

        overall = sum(
            scores[k] * self._dimension_weights.get(k, 0.1) for k in scores
        )

        self._collect_issues(scores, issues, suggestions)

        confidence = ConfidenceLevel.from_score(overall)

        return ReflectionResult(
            dimension_scores=scores,
            overall_score=round(overall, 4),
            confidence=confidence,
            issues=issues,
            suggestions=suggestions,
        )

    def _collect_issues(
        self,
        scores: dict[str, float],
        issues: list[str],
        suggestions: list[str],
    ) -> None:
        if scores["accuracy"] < 0.5:
            issues.append(
                "accuracy: Response contains hedging or lacks concrete claims"
            )
            suggestions.append(
                "accuracy: Include more specific facts and reduce uncertainty language"
            )
        if scores["completeness"] < 0.5:
            issues.append(
                "completeness: Response may be too brief to fully address the query"
            )
            suggestions.append(
                "completeness: Expand on key points and provide more detail"
            )
        if scores["clarity"] < 0.5:
            issues.append(
                "clarity: Sentences may be too long or difficult to parse"
            )
            suggestions.append(
                "clarity: Break long sentences into shorter, clearer ones"
            )
        if scores["relevance"] < 0.5:
            issues.append(
                "relevance: Response has low term overlap with the query"
            )
            suggestions.append(
                "relevance: Stay focused on the query topic"
            )
        if scores["conciseness"] < 0.5:
            issues.append(
                "conciseness: Response is unnecessarily long"
            )
            suggestions.append(
                "conciseness: Remove redundant content and tighten the message"
            )
        if scores["helpfulness"] < 0.5:
            issues.append(
                "helpfulness: Response lacks actionable advice or explanations"
            )
            suggestions.append(
                "helpfulness: Add concrete examples, steps, or recommendations"
            )
        if scores["consistency"] < 0.5:
            issues.append(
                "consistency: Potential contradictions detected in the response"
            )
            suggestions.append(
                "consistency: Review for internal contradictions and resolve them"
            )

    def _check_accuracy(self, query: str, response: str) -> float:
        hedging = len(
            re.findall(
                r"(可能|也许|大概|不确定|maybe|perhaps|或许|不太确定)",
                response,
                re.IGNORECASE,
            )
        )
        concrete_patterns = len(re.findall(r"\d+", response))
        vague_patterns = len(
            re.findall(
                r"(some|many|few|several|一些|很多|大概|左右)",
                response,
                re.IGNORECASE,
            )
        )
        if len(response) < 50:
            return 0.4
        score = 0.7
        if hedging > 3:
            score -= 0.15
        if concrete_patterns > 3:
            score += 0.1
        if vague_patterns > 5:
            score -= 0.1
        return max(0.1, min(1.0, score))

    def _check_completeness(self, query: str, response: str) -> float:
        resp_len = len(response)
        if resp_len < 100:
            return 0.3
        if resp_len < 300:
            return 0.5
        if resp_len < 500:
            return 0.7
        return 0.85

    def _check_clarity(self, response: str) -> float:
        sentences = re.split(r"[.!?。!?？]+", response)
        sentences = [s.strip() for s in sentences if s.strip()]
        if not sentences:
            return 0.3
        avg_len = sum(len(s) for s in sentences) / len(sentences)
        if avg_len > 100:
            return 0.5
        if avg_len > 60:
            return 0.7
        return 0.9

    def _check_relevance(self, query: str, response: str) -> float:
        query_terms = set(query.lower().split())
        resp_terms = set(response.lower().split())
        if not query_terms:
            return 1.0
        overlap = len(query_terms & resp_terms) / len(query_terms)
        return min(1.0, overlap * 1.5)

    def _check_conciseness(self, response: str) -> float:
        resp_len = len(response)
        if resp_len < 100:
            return 0.9
        if resp_len < 300:
            return 0.8
        if resp_len < 500:
            return 0.6
        return 0.4

    def _check_helpfulness(self, query: str, response: str) -> float:
        actionable = len(
            re.findall(
                r"(你可以|建议|推荐|步骤|示例|例子|example|step|try|可以尝试|试试)",
                response,
                re.IGNORECASE,
            )
        )
        has_explanation = len(
            re.findall(
                r"(因为|所以|因此|这是因为|because|therefore|由于)",
                response,
                re.IGNORECASE,
            )
        )
        score = 0.5
        if actionable > 0:
            score += 0.2
        if actionable > 2:
            score += 0.1
        if has_explanation > 0:
            score += 0.1
        return min(1.0, score)

    def _check_consistency(
        self, response: str, context: Optional[str]
    ) -> float:
        if not context:
            return 0.8
        contradictions = 0
        opposing_pairs = [
            (r"是", r"不是"),
            (r"可以", r"不可以"),
            (r"能", r"不能"),
            (r"yes", r"no"),
            (r"true", r"false"),
        ]
        for pos, neg in opposing_pairs:
            if re.search(pos, response, re.IGNORECASE) and re.search(
                neg, context, re.IGNORECASE
            ):
                contradictions += 1
        return max(0.3, 0.9 - contradictions * 0.2)


class ReflectionLoop:
    def __init__(
        self,
        critic: Optional[SelfCritic] = None,
        max_iterations: int = 3,
        improvement_threshold: float = 0.7,
    ):
        self.critic = critic or SelfCritic()
        self.max_iterations = max_iterations
        self.improvement_threshold = improvement_threshold
        self.history: list[ReflectionResult] = []

    def reflect_and_improve(
        self,
        query: str,
        response: str,
        context: Optional[str] = None,
    ) -> ReflectionResult:
        result = self.critic.evaluate(query, response, context)
        result.iteration_count = 0
        self.history.append(result)

        if result.overall_score >= self.improvement_threshold:
            return result

        for iteration in range(1, self.max_iterations + 1):
            improved = self._generate_improvement(query, response, result)
            if not improved or improved == response:
                break

            improved_result = self.critic.evaluate(query, improved, context)
            improved_result.iteration_count = iteration
            self.history.append(improved_result)

            if improved_result.overall_score > result.overall_score:
                improved_result.improved_version = improved
                return improved_result

            result = improved_result
            response = improved

        return result

    def _generate_improvement(
        self,
        query: str,
        response: str,
        result: ReflectionResult,
    ) -> Optional[str]:
        if not result.issues:
            return None

        improved = response

        for issue in result.issues:
            low = issue.lower()
            if "clarity" in low and len(response) > 500:
                sentences = re.split(r"(?<=[.!?。!?？])\s+", improved)
                if len(sentences) > 3:
                    improved = " ".join(
                        sentences[: max(3, len(sentences) // 2)]
                    )
            if "completeness" in low or "accuracy" in low:
                if not re.search(
                    r"(例如|比如|示例|example|for example)",
                    improved,
                    re.IGNORECASE,
                ):
                    improved += (
                        f"\n\n例如：基于对 "
                        f'"{query[:min(len(query), 30)]}'
                        f'" 的分析，这里提供更多细节以增强回答的完整性。'
                    )
            if "conciseness" in low:
                sentences = re.split(r"(?<=[.!?。!?？])\s+", improved)
                if len(sentences) > 5:
                    improved = " ".join(
                        sentences[: max(3, len(sentences) * 2 // 3)]
                    )

        return improved if improved != response else None

    def get_trend(self) -> list[float]:
        return [r.overall_score for r in self.history[-20:]]

    def reset(self) -> None:
        self.history.clear()


class MetacognitiveMonitor:
    def __init__(self):
        self.sessions: dict[str, MetacognitiveState] = {}

    def record_reflection(
        self, session_id: str, result: ReflectionResult
    ) -> None:
        if session_id not in self.sessions:
            self.sessions[session_id] = MetacognitiveState(
                session_id=session_id
            )

        state = self.sessions[session_id]
        state.total_reflections += 1

        for dim, score in result.dimension_scores.items():
            prev = state.avg_scores.get(dim, 0.0)
            n = state.total_reflections
            state.avg_scores[dim] = prev * (n - 1) / n + score / n

        state.improvement_trend.append(result.overall_score)

        for issue in result.issues:
            pattern = issue[:min(len(issue), 50)]
            state.patterns[pattern] = state.patterns.get(pattern, 0) + 1

    def get_session_report(self, session_id: str) -> dict:
        if session_id not in self.sessions:
            return {}
        state = self.sessions[session_id]
        trend_len = len(state.improvement_trend)
        if trend_len >= 2:
            if state.improvement_trend[-1] > state.improvement_trend[-2]:
                direction = "improving"
            elif state.improvement_trend[-1] < state.improvement_trend[-2]:
                direction = "degrading"
            else:
                direction = "stable"
        else:
            direction = "initial"

        return {
            "session_id": session_id,
            "total_reflections": state.total_reflections,
            "average_scores": state.avg_scores,
            "trend": state.improvement_trend[-10:],
            "top_issues": sorted(
                state.patterns.items(), key=lambda x: x[1], reverse=True
            )[:5],
            "trend_direction": direction,
        }

    def get_global_stats(self) -> dict:
        total = sum(s.total_reflections for s in self.sessions.values())
        avg_scores: dict[str, float] = {}
        for state in self.sessions.values():
            for dim, score in state.avg_scores.items():
                avg_scores[dim] = avg_scores.get(dim, 0.0) + score
        for dim in avg_scores:
            avg_scores[dim] /= max(1, len(self.sessions))

        return {
            "total_sessions": len(self.sessions),
            "total_reflections": total,
            "average_scores": avg_scores,
        }

    def reset(self) -> None:
        self.sessions.clear()


_reflect_engine: Optional[ReflectionLoop] = None
_monitor: Optional[MetacognitiveMonitor] = None


def get_reflect_engine() -> ReflectionLoop:
    global _reflect_engine
    if _reflect_engine is None:
        _reflect_engine = ReflectionLoop()
    return _reflect_engine


def get_metacognitive_monitor() -> MetacognitiveMonitor:
    global _monitor
    if _monitor is None:
        _monitor = MetacognitiveMonitor()
    return _monitor


def reset_singletons() -> None:
    global _reflect_engine, _monitor
    _reflect_engine = None
    _monitor = None
