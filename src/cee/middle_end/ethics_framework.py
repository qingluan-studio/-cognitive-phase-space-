"""
伦理框架 - Ethics Framework

AI 系统的伦理决策与治理框架，涵盖:

  - EthicalPrinciple: 十大伦理原则枚举
  - EthicalStance: 系统伦理立场配置（权重、约束、底线）
  - ValueAlignment: 价值对齐（加权评分、冲突检测、权衡解决）
  - EthicalAnalyzer: 请求伦理分析（关键词检测、风险分级、决策理由）
  - FairnessChecker: 公平性检查（人口统计偏差、刻板印象、平衡评分）
  - ExplainabilityEngine: 可解释性引擎（决策解释、树状图、置信度、反事实分析）
  - ConstitutionalAI: 宪法式 AI 框架（不可变规则、优先级、修正审计）
  - EthicsReport: 伦理报告数据类

双轨制:
  - 工程版: 数据结构 + 算法实现
  - 理论版: 功利主义计算、道义论规则、罗尔斯无知之幕
"""

from __future__ import annotations

import hashlib
import logging
import math
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


# ============================================================
# Enums
# ============================================================

class EthicalPrinciple(Enum):
    BENEFICENCE = "beneficence"
    NON_MALEFICENCE = "non_maleficence"
    AUTONOMY = "autonomy"
    JUSTICE = "justice"
    EXPLICABILITY = "explicability"
    PRIVACY = "privacy"
    FAIRNESS = "fairness"
    TRANSPARENCY = "transparency"
    ACCOUNTABILITY = "accountability"
    SUSTAINABILITY = "sustainability"

    @classmethod
    def default_weights(cls) -> dict[EthicalPrinciple, float]:
        return {
            cls.NON_MALEFICENCE: 1.0,
            cls.BENEFICENCE: 0.9,
            cls.AUTONOMY: 0.8,
            cls.JUSTICE: 0.8,
            cls.PRIVACY: 0.85,
            cls.FAIRNESS: 0.8,
            cls.TRANSPARENCY: 0.7,
            cls.EXPLICABILITY: 0.7,
            cls.ACCOUNTABILITY: 0.75,
            cls.SUSTAINABILITY: 0.6,
        }

    @classmethod
    def description(cls, principle: EthicalPrinciple) -> str:
        _descriptions = {
            cls.BENEFICENCE: "Act to benefit others and promote well-being",
            cls.NON_MALEFICENCE: "Do no harm; avoid causing suffering or damage",
            cls.AUTONOMY: "Respect individual self-determination and choice",
            cls.JUSTICE: "Ensure fair distribution of benefits and burdens",
            cls.EXPLICABILITY: "Provide understandable reasons for decisions",
            cls.PRIVACY: "Protect personal data and informational boundaries",
            cls.FAIRNESS: "Avoid bias and ensure equal treatment",
            cls.TRANSPARENCY: "Operate openly with accessible processes",
            cls.ACCOUNTABILITY: "Accept responsibility for actions and outcomes",
            cls.SUSTAINABILITY: "Consider long-term environmental and social impact",
        }
        return _descriptions[principle]


class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    BLOCK = "block"


class RuleTier(Enum):
    INVARIABLE = 0
    CONSTITUTIONAL = 1
    STATUTORY = 2
    GUIDELINE = 3


class TheoryMode(Enum):
    UTILITARIAN = "utilitarian"
    DEONTOLOGICAL = "deontological"
    RAWLSIAN = "rawlsian"
    HYBRID = "hybrid"


# ============================================================
# Dataclasses
# ============================================================

@dataclass
class EthicalStance:
    principle_weights: dict[EthicalPrinciple, float] = field(default_factory=EthicalPrinciple.default_weights)
    hard_constraints: list[str] = field(default_factory=list)
    soft_guidelines: list[str] = field(default_factory=list)
    red_lines: set[str] = field(default_factory=set)

    _DEFAULT_RED_LINES: set[str] = field(
        default_factory=lambda: {
            "violence_incitement",
            "child_exploitation",
            "illegal_activity",
            "self_harm_encouragement",
            "hate_speech",
            "terrorism_advocacy",
            "human_trafficking",
            "weapons_proliferation",
        },
        init=False,
        repr=False,
    )

    def __post_init__(self) -> None:
        if not self.red_lines:
            self.red_lines = set(self._DEFAULT_RED_LINES)

    def get_weight(self, principle: EthicalPrinciple) -> float:
        return self.principle_weights.get(principle, 0.5)

    def is_red_line(self, topic: str) -> bool:
        return topic in self.red_lines

    def add_red_line(self, topic: str) -> None:
        self.red_lines.add(topic)

    def remove_red_line(self, topic: str) -> None:
        self.red_lines.discard(topic)

    def validate(self) -> list[str]:
        issues: list[str] = []
        total = sum(self.principle_weights.values())
        if not (0 < total <= len(EthicalPrinciple)):
            issues.append(f"Weight sum {total:.2f} out of expected range")
        for p in EthicalPrinciple:
            w = self.principle_weights.get(p, 0.0)
            if not (0.0 <= w <= 1.0):
                issues.append(f"{p.value} weight {w:.2f} out of [0,1]")
        hard_set = set(self.hard_constraints)
        soft_set = set(self.soft_guidelines)
        overlap = hard_set & soft_set
        if overlap:
            issues.append(f"Overlap between hard_constraints and soft_guidelines: {overlap}")
        return issues


@dataclass
class EthicsReport:
    overall_score: float
    per_principle_scores: dict[EthicalPrinciple, float]
    violations: list[str]
    warnings: list[str]
    recommendations: list[str]
    risk_level: RiskLevel = RiskLevel.LOW
    justification: str = ""
    report_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def is_acceptable(self) -> bool:
        return self.overall_score >= 0.5 and self.risk_level != RiskLevel.BLOCK

    def summary(self) -> str:
        parts = [
            f"Ethics Report [{self.report_id}]",
            f"  Overall Score: {self.overall_score:.2%}",
            f"  Risk Level: {self.risk_level.value}",
            f"  Violations: {len(self.violations)}",
            f"  Warnings: {len(self.warnings)}",
            f"  Recommendations: {len(self.recommendations)}",
        ]
        if self.justification:
            parts.append(f"  Justification: {self.justification[:120]}...")
        return "\n".join(parts)

    def to_dict(self) -> dict[str, Any]:
        return {
            "report_id": self.report_id,
            "overall_score": self.overall_score,
            "per_principle_scores": {p.value: s for p, s in self.per_principle_scores.items()},
            "violations": self.violations,
            "warnings": self.warnings,
            "recommendations": self.recommendations,
            "risk_level": self.risk_level.value,
            "justification": self.justification,
            "created_at": self.created_at,
        }


@dataclass
class ConstitutionalRule:
    rule_id: str
    text: str
    tier: RuleTier
    priority: int
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    amended_at: str | None = None
    amendment_history: list[dict[str, str]] = field(default_factory=list)

    def amend(self, new_text: str, reason: str) -> None:
        old_text = self.text
        self.amendment_history.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "old_text": old_text,
            "new_text": new_text,
            "reason": reason,
        })
        self.text = new_text
        self.amended_at = datetime.now(timezone.utc).isoformat()


@dataclass
class AlignmentScore:
    overall: float
    per_principle: dict[EthicalPrinciple, float]
    confidence: float
    conflicts: list[tuple[EthicalPrinciple, EthicalPrinciple, float]]
    trade_off_notes: list[str]


# ============================================================
# Keyword / Pattern Datastore
# ============================================================

_HARMFUL_KEYWORDS: set[str] = {
    "kill", "murder", "torture", "abuse", "exploit", "traffick",
    "terrorist", "bomb", "weaponize", "assassinate", "poison",
    "kidnap", "blackmail", "extort", "enslave", "smuggle",
    "rape", "assault", "arson", "sabotage", "slander",
}

_ILLEGAL_KEYWORDS: set[str] = {
    "hack", "crack", "pirate", "counterfeit", "fraud", "scam",
    "phish", "malware", "ransomware", "botnet", "launder",
    "bribe", "corrupt", "smuggle", "forge", "embezzle",
}

_DANGEROUS_KEYWORDS: set[str] = {
    "chemical weapon", "biological weapon", "nuclear", "explosive",
    "suicide", "self-harm", "overdose", "cyanide", "anthrax",
    "ricin", "sarin", "mustard gas", "pipe bomb", "napalm",
}

_DEMOGRAPHIC_INDICATORS: list[tuple[str, float]] = [
    ("men are", 0.7), ("women are", 0.7), ("asians are", 0.8), ("blacks are", 0.8),
    ("whites are", 0.8), ("latinos are", 0.8), ("muslims are", 0.8), ("jews are", 0.8),
    ("old people are", 0.7), ("young people are", 0.6), ("gay people are", 0.8),
    ("disabled people are", 0.8), ("immigrants are", 0.7), ("the poor are", 0.7),
]

_GENDER_BIAS_PATTERNS: list[tuple[str, str]] = [
    ("he is logical", "they are logical"),
    ("she is emotional", "they are displaying emotion"),
    ("man up", "be brave"),
    ("like a girl", "with hesitation"),
    ("chairman", "chairperson"),
    ("manpower", "workforce"),
    ("mankind", "humankind"),
    ("stewardess", "flight attendant"),
    ("policeman", "police officer"),
    ("fireman", "firefighter"),
]

_STEREOTYPE_PATTERNS: list[tuple[str, str]] = [
    ("all men", "many people"),
    ("all women", "many people"),
    ("always lazy", "sometimes less active"),
    ("naturally aggressive", "may display assertive behavior"),
    ("inherently criminal", "may have faced systemic challenges"),
]

_REPRESENTATION_TERMS: dict[str, float] = {
    "diverse": 1.0, "inclusive": 1.0, "equitable": 0.9,
    "accessible": 0.8, "fair": 0.8, "unbiased": 0.9,
    "representative": 0.7, "equal opportunity": 0.9,
}


# ============================================================
# ValueAlignment
# ============================================================

class ValueAlignment:

    def __init__(self, stance: EthicalStance | None = None) -> None:
        self.stance = stance or EthicalStance()
        self._decision_history: list[dict[str, Any]] = []

    def score_action(self, action: str, context: dict[str, Any] | None = None) -> AlignmentScore:
        ctx = context or {}
        per_principle: dict[EthicalPrinciple, float] = {}
        for principle in EthicalPrinciple:
            raw = self._evaluate_principle(principle, action, ctx)
            weight = self.stance.get_weight(principle)
            per_principle[principle] = raw * weight

        total_weight = sum(self.stance.get_weight(p) for p in EthicalPrinciple)
        if total_weight > 0:
            overall = sum(per_principle.values()) / total_weight
        else:
            overall = 0.0

        conflicts = self._detect_conflicts(action, ctx)
        confidence = self._compute_confidence(per_principle)
        trade_off_notes = self._resolve_trade_offs(conflicts)

        return AlignmentScore(
            overall=round(overall, 4),
            per_principle={p: round(v, 4) for p, v in per_principle.items()},
            confidence=round(confidence, 4),
            conflicts=conflicts,
            trade_off_notes=trade_off_notes,
        )

    def check_consistency(self, decisions: list[dict[str, Any]]) -> float:
        if len(decisions) < 2:
            return 1.0

        scores: list[dict[EthicalPrinciple, float]] = []
        for d in decisions:
            action = d.get("action", "")
            ctx = d.get("context", {})
            result = self.score_action(action, ctx)
            scores.append(result.per_principle)

        total_similarity = 0.0
        pair_count = 0
        for i in range(len(scores)):
            for j in range(i + 1, len(scores)):
                similarity = self._cosine_similarity(scores[i], scores[j])
                total_similarity += similarity
                pair_count += 1

        if pair_count == 0:
            return 1.0
        return round(total_similarity / pair_count, 4)

    def _evaluate_principle(self, principle: EthicalPrinciple, action: str, ctx: dict[str, Any]) -> float:
        lower = action.lower()
        if principle == EthicalPrinciple.NON_MALEFICENCE:
            return self._eval_non_maleficence(lower, ctx)
        elif principle == EthicalPrinciple.BENEFICENCE:
            return self._eval_beneficence(lower, ctx)
        elif principle == EthicalPrinciple.AUTONOMY:
            return self._eval_autonomy(lower, ctx)
        elif principle == EthicalPrinciple.JUSTICE:
            return self._eval_justice(lower, ctx)
        elif principle == EthicalPrinciple.PRIVACY:
            return self._eval_privacy(lower, ctx)
        elif principle == EthicalPrinciple.FAIRNESS:
            return self._eval_fairness(lower, ctx)
        elif principle == EthicalPrinciple.TRANSPARENCY:
            return self._eval_transparency(lower, ctx)
        elif principle == EthicalPrinciple.EXPLICABILITY:
            return self._eval_explicability(lower, ctx)
        elif principle == EthicalPrinciple.ACCOUNTABILITY:
            return self._eval_accountability(lower, ctx)
        elif principle == EthicalPrinciple.SUSTAINABILITY:
            return self._eval_sustainability(lower, ctx)
        return 0.5

    def _eval_non_maleficence(self, lower: str, _ctx: dict[str, Any]) -> float:
        score = 1.0
        for kw in _HARMFUL_KEYWORDS | _DANGEROUS_KEYWORDS:
            if kw in lower:
                score -= 0.2
        for kw in _ILLEGAL_KEYWORDS:
            if kw in lower:
                score -= 0.15
        return max(0.0, min(1.0, score))

    def _eval_beneficence(self, lower: str, _ctx: dict[str, Any]) -> float:
        positive = {"help", "improve", "benefit", "support", "assist", "enhance",
                     "contribute", "aid", "relieve", "empower", "educate", "heal"}
        score = 0.3
        for word in positive:
            if word in lower:
                score += 0.07
        return max(0.0, min(1.0, score))

    def _eval_autonomy(self, lower: str, _ctx: dict[str, Any]) -> float:
        respect_terms = {"choose", "decide", "opt", "prefer", "consent", "allow",
                         "voluntary", "optional", "decline"}
        coerce_terms = {"force", "compel", "coerce", "mandatory", "obligate",
                        "must", "required", "demand"}
        score = 0.5
        for word in respect_terms:
            if word in lower:
                score += 0.05
        for word in coerce_terms:
            if word in lower:
                score -= 0.1
        return max(0.0, min(1.0, score))

    def _eval_justice(self, lower: str, _ctx: dict[str, Any]) -> float:
        fair_terms = {"equal", "equitable", "fair", "impartial", "just", "unbiased",
                      "merit", "proportional", "balanced"}
        unfair_terms = {"discriminat", "favoritism", "nepotism", "unfair", "exploit"}
        score = 0.5
        for word in fair_terms:
            if word in lower:
                score += 0.05
        for word in unfair_terms:
            if word in lower:
                score -= 0.15
        return max(0.0, min(1.0, score))

    def _eval_privacy(self, lower: str, _ctx: dict[str, Any]) -> float:
        protect_terms = {"encrypt", "anonymize", "pseudonym", "consent", "opt-out",
                         "gdpr", "private", "confidential"}
        expose_terms = {"expose", "leak", "surveil", "track", "monitor", "spy", "stalk",
                        "dox", "breach", "phish", "collect personal"}
        score = 0.5
        for word in protect_terms:
            if word in lower:
                score += 0.06
        for word in expose_terms:
            if word in lower:
                score -= 0.15
        return max(0.0, min(1.0, score))

    def _eval_fairness(self, lower: str, _ctx: dict[str, Any]) -> float:
        bias_terms = {"stereotype", "prejudice", "racist", "sexist", "ageist",
                      "ableist", "homophobic", "xenophobic"}
        score = 0.6
        for word in bias_terms:
            if word in lower:
                score -= 0.2
        for indicator, _ in _DEMOGRAPHIC_INDICATORS:
            if indicator in lower:
                score -= 0.1
        return max(0.0, min(1.0, score))

    def _eval_transparency(self, lower: str, _ctx: dict[str, Any]) -> float:
        open_terms = {"explain", "disclose", "reveal", "open", "transparent",
                      "publish", "report", "audit", "trace", "log"}
        opaque_terms = {"hide", "conceal", "obscure", "secret", "blackbox",
                        "opaqu", "cover up", "suppress", "censor"}
        score = 0.5
        for word in open_terms:
            if word in lower:
                score += 0.05
        for word in opaque_terms:
            if word in lower:
                score -= 0.1
        return max(0.0, min(1.0, score))

    def _eval_explicability(self, lower: str, _ctx: dict[str, Any]) -> float:
        explain_terms = {"because", "reason", "justification", "why", "rationale",
                         "interpret", "understand", "clarify", "describe how"}
        score = 0.4
        for word in explain_terms:
            if word in lower:
                score += 0.06
        return max(0.0, min(1.0, score))

    def _eval_accountability(self, lower: str, _ctx: dict[str, Any]) -> float:
        account_terms = {"responsible", "liable", "accountable", "answerable",
                         "oversight", "audit", "review", "governance"}
        evade_terms = {"deny", "blame shift", "scapegoat", "avoid responsibility"}
        score = 0.5
        for word in account_terms:
            if word in lower:
                score += 0.05
        for word in evade_terms:
            if word in lower:
                score -= 0.15
        return max(0.0, min(1.0, score))

    def _eval_sustainability(self, lower: str, _ctx: dict[str, Any]) -> float:
        sustain_terms = {"sustainable", "renewable", "green", "eco", "carbon neutral",
                         "recycle", "conservation", "low impact"}
        wasteful_terms = {"waste", "pollute", "destroy environ", "deplete",
                          "deforest", "exhaust resource"}
        score = 0.4
        for word in sustain_terms:
            if word in lower:
                score += 0.05
        for word in wasteful_terms:
            if word in lower:
                score -= 0.1
        return max(0.0, min(1.0, score))

    def _detect_conflicts(self, action: str, ctx: dict[str, Any]) -> list[tuple[EthicalPrinciple, EthicalPrinciple, float]]:
        conflicts: list[tuple[EthicalPrinciple, EthicalPrinciple, float]] = []
        lower = action.lower()

        if any(kw in lower for kw in _HARMFUL_KEYWORDS) and "benefit" in lower:
            conflicts.append((EthicalPrinciple.NON_MALEFICENCE, EthicalPrinciple.BENEFICENCE, 0.8))

        if ("force" in lower or "mandatory" in lower) and ("help" in lower or "benefit" in lower):
            conflicts.append((EthicalPrinciple.AUTONOMY, EthicalPrinciple.BENEFICENCE, 0.6))

        if ("surveil" in lower or "monitor" in lower) and ("safety" in lower or "protect" in lower):
            conflicts.append((EthicalPrinciple.PRIVACY, EthicalPrinciple.NON_MALEFICENCE, 0.7))

        if ("secret" in lower or "hide" in lower) and ("security" in lower):
            conflicts.append((EthicalPrinciple.TRANSPARENCY, EthicalPrinciple.NON_MALEFICENCE, 0.5))

        if ("discriminat" in lower or "bias" in lower) and ("efficient" in lower or "accurate" in lower):
            conflicts.append((EthicalPrinciple.FAIRNESS, EthicalPrinciple.BENEFICENCE, 0.55))

        return conflicts

    def _resolve_trade_offs(self, conflicts: list[tuple[EthicalPrinciple, EthicalPrinciple, float]]) -> list[str]:
        notes: list[str] = []
        priority_order = [
            EthicalPrinciple.NON_MALEFICENCE,
            EthicalPrinciple.PRIVACY,
            EthicalPrinciple.AUTONOMY,
            EthicalPrinciple.FAIRNESS,
            EthicalPrinciple.JUSTICE,
            EthicalPrinciple.TRANSPARENCY,
            EthicalPrinciple.ACCOUNTABILITY,
            EthicalPrinciple.BENEFICENCE,
            EthicalPrinciple.EXPLICABILITY,
            EthicalPrinciple.SUSTAINABILITY,
        ]

        for a, b, severity in conflicts:
            a_rank = priority_order.index(a) if a in priority_order else 99
            b_rank = priority_order.index(b) if b in priority_order else 99
            if a_rank < b_rank:
                notes.append(f"Prioritize {a.value} over {b.value} (severity={severity:.2f})")
            elif b_rank < a_rank:
                notes.append(f"Prioritize {b.value} over {a.value} (severity={severity:.2f})")
            else:
                notes.append(f"Balanced trade-off between {a.value} and {b.value} (severity={severity:.2f})")
        return notes

    def _compute_confidence(self, per_principle: dict[EthicalPrinciple, float]) -> float:
        values = list(per_principle.values())
        if not values:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        return 1.0 / (1.0 + variance)

    @staticmethod
    def _cosine_similarity(
        d1: dict[EthicalPrinciple, float],
        d2: dict[EthicalPrinciple, float],
    ) -> float:
        keys = set(d1) | set(d2)
        v1 = [d1.get(k, 0.0) for k in keys]
        v2 = [d2.get(k, 0.0) for k in keys]
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)


# ============================================================
# EthicalAnalyzer
# ============================================================

class EthicalAnalyzer:

    def __init__(self, stance: EthicalStance | None = None) -> None:
        self.stance = stance or EthicalStance()
        self.value_alignment = ValueAlignment(self.stance)

    def analyze(self, request_text: str, context: dict[str, Any] | None = None) -> EthicsReport:
        lower = request_text.lower()

        red_line_hit = self._check_red_lines(lower)
        if red_line_hit:
            return EthicsReport(
                overall_score=0.0,
                per_principle_scores={p: 0.0 for p in EthicalPrinciple},
                violations=[f"Red line crossed: {red_line_hit}"],
                warnings=[],
                recommendations=["Request blocked due to absolute constraint violation"],
                risk_level=RiskLevel.BLOCK,
                justification=f"Request matches red-line topic: {red_line_hit}",
            )

        risk_level = self._categorize_risk(lower)
        alignment = self.value_alignment.score_action(request_text, context)

        violations: list[str] = []
        warnings: list[str] = []
        recommendations: list[str] = []

        violations = self._find_violations(lower, alignment)
        warnings = self._find_warnings(lower, alignment)
        recommendations = self._generate_recommendations(alignment, risk_level)

        justification = self._generate_justification(alignment, risk_level, violations)

        return EthicsReport(
            overall_score=alignment.overall,
            per_principle_scores=alignment.per_principle,
            violations=violations,
            warnings=warnings,
            recommendations=recommendations,
            risk_level=risk_level,
            justification=justification,
        )

    def _check_red_lines(self, lower: str) -> str | None:
        for red_line in self.stance.red_lines:
            parts = red_line.split("_")
            if any(part in lower for part in parts):
                return red_line
        return None

    def _categorize_risk(self, lower: str) -> RiskLevel:
        harmful_count = sum(1 for kw in _HARMFUL_KEYWORDS if kw in lower)
        illegal_count = sum(1 for kw in _ILLEGAL_KEYWORDS if kw in lower)
        dangerous_count = sum(1 for kw in _DANGEROUS_KEYWORDS if kw in lower)
        total_hits = harmful_count + illegal_count + dangerous_count

        if dangerous_count > 0:
            return RiskLevel.HIGH
        if total_hits >= 3 or illegal_count >= 2:
            return RiskLevel.HIGH
        if total_hits >= 1 or harmful_count >= 1:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _find_violations(self, lower: str, alignment: AlignmentScore) -> list[str]:
        violations: list[str] = []
        for principle, score in alignment.per_principle.items():
            if score < 0.2:
                violations.append(f"{principle.value}: score critically low ({score:.2f})")
        for a, b, sev in alignment.conflicts:
            if sev > 0.7:
                violations.append(f"Severe conflict: {a.value} vs {b.value} (severity={sev:.2f})")
        return violations

    def _find_warnings(self, lower: str, alignment: AlignmentScore) -> list[str]:
        warnings: list[str] = []
        for principle, score in alignment.per_principle.items():
            if 0.2 <= score < 0.4:
                warnings.append(f"{principle.value}: score concerning ({score:.2f})")
        if alignment.confidence < 0.5:
            warnings.append(f"Low confidence in alignment scoring ({alignment.confidence:.2f})")
        for a, b, sev in alignment.conflicts:
            if 0.4 <= sev <= 0.7:
                warnings.append(f"Notable conflict: {a.value} vs {b.value} (severity={sev:.2f})")
        return warnings

    def _generate_recommendations(self, alignment: AlignmentScore, risk_level: RiskLevel) -> list[str]:
        recommendations: list[str] = []
        if risk_level == RiskLevel.BLOCK:
            recommendations.append("Do not proceed with this request")
            return recommendations
        if risk_level == RiskLevel.HIGH:
            recommendations.append("Require human review before proceeding")
        if alignment.confidence < 0.5:
            recommendations.append("Gather additional context to improve confidence")
        low_principles = [p for p, s in alignment.per_principle.items() if s < 0.4]
        if low_principles:
            names = ", ".join(p.value for p in low_principles[:3])
            recommendations.append(f"Re-evaluate with focus on: {names}")
        if alignment.conflicts:
            recommendations.append("Document and justify all trade-off decisions")
        if not recommendations:
            recommendations.append("Proceed with standard ethical monitoring")
        return recommendations

    def _generate_justification(
        self,
        alignment: AlignmentScore,
        risk_level: RiskLevel,
        violations: list[str],
    ) -> str:
        parts: list[str] = [f"Risk level: {risk_level.value}"]
        parts.append(f"Overall alignment score: {alignment.overall:.2%}")
        parts.append(f"Confidence: {alignment.confidence:.2%}")
        if violations:
            parts.append(f"Violations detected: {len(violations)}")
        if alignment.conflicts:
            parts.append(f"Conflicts detected: {len(alignment.conflicts)}")
        if alignment.trade_off_notes:
            parts.append(f"Trade-off resolution applied: {len(alignment.trade_off_notes)} principles")
        return " | ".join(parts)


# ============================================================
# FairnessChecker
# ============================================================

class FairnessChecker:

    def __init__(self) -> None:
        pass

    def check(self, content: str) -> dict[str, Any]:
        lower = content.lower()

        bias_indicators = self._detect_demographic_bias(lower)
        language_suggestions = self._check_neutral_language(lower)
        stereotypes = self._detect_stereotypes(lower)
        representation = self._representation_score(lower)

        total_issues = len(bias_indicators) + len(stereotypes) + len(language_suggestions)
        if total_issues == 0:
            fairness_score = representation
        else:
            penalty = min(1.0, total_issues * 0.1)
            fairness_score = max(0.0, representation - penalty)

        return {
            "fairness_score": round(fairness_score, 4),
            "bias_indicators": bias_indicators,
            "language_suggestions": language_suggestions,
            "stereotypes": stereotypes,
            "representation_score": round(representation, 4),
            "summary": self._summarize_findings(bias_indicators, language_suggestions, stereotypes, fairness_score),
        }

    def _detect_demographic_bias(self, lower: str) -> list[dict[str, Any]]:
        indicators: list[dict[str, Any]] = []
        for pattern, weight in _DEMOGRAPHIC_INDICATORS:
            if pattern in lower:
                start_idx = lower.index(pattern)
                snippet = content_surround(lower, pattern, 30)
                indicators.append({
                    "pattern": pattern,
                    "weight": weight,
                    "context": snippet,
                })
        return indicators

    def _check_neutral_language(self, lower: str) -> list[dict[str, str]]:
        suggestions: list[dict[str, str]] = []
        for biased, neutral in _GENDER_BIAS_PATTERNS:
            if biased in lower:
                suggestions.append({"biased": biased, "suggestion": neutral})
        return suggestions

    def _detect_stereotypes(self, lower: str) -> list[dict[str, str]]:
        stereotypes: list[dict[str, str]] = []
        for stereotype, alternative in _STEREOTYPE_PATTERNS:
            if stereotype in lower:
                stereotypes.append({"stereotype": stereotype, "alternative": alternative})
        return stereotypes

    def _representation_score(self, lower: str) -> float:
        score = 0.3
        for term, weight in _REPRESENTATION_TERMS.items():
            if term in lower:
                score += weight * 0.05
        return min(1.0, score)

    def _summarize_findings(
        self,
        bias: list[dict[str, Any]],
        language: list[dict[str, str]],
        stereotypes: list[dict[str, str]],
        score: float,
    ) -> str:
        parts: list[str] = [f"Fairness score: {score:.2%}"]
        if bias:
            parts.append(f"Demographic bias indicators found: {len(bias)}")
        if language:
            parts.append(f"Non-neutral language instances: {len(language)}")
        if stereotypes:
            parts.append(f"Stereotype patterns detected: {len(stereotypes)}")
        if not bias and not language and not stereotypes:
            parts.append("No significant fairness concerns detected")
        return " | ".join(parts)


# ============================================================
# ExplainabilityEngine
# ============================================================

class ExplainabilityEngine:

    def __init__(self) -> None:
        self._decision_log: list[dict[str, Any]] = []

    def explain(self, report: EthicsReport, alignment: AlignmentScore | None = None) -> dict[str, Any]:
        explanation_text = self._generate_explanation_text(report, alignment)
        decision_tree = self._build_decision_tree(report)
        confidence = self._compute_explanation_confidence(report, alignment)
        counterfactual = self._generate_counterfactual(report) if alignment else None

        result = {
            "explanation": explanation_text,
            "decision_tree": decision_tree,
            "confidence": confidence,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        if counterfactual:
            result["counterfactual"] = counterfactual
        return result

    def _generate_explanation_text(self, report: EthicsReport, alignment: AlignmentScore | None) -> str:
        lines: list[str] = []
        lines.append(f"Ethical Decision Explanation [ID: {report.report_id}]")
        lines.append(f"Decision: {'APPROVED' if report.is_acceptable() else 'REJECTED'}")
        lines.append(f"Overall Ethical Score: {report.overall_score:.2%}")

        top_3 = sorted(report.per_principle_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        bottom_3 = sorted(report.per_principle_scores.items(), key=lambda x: x[1])[:3]

        lines.append("  Top-scoring principles:")
        for p, s in top_3:
            lines.append(f"    {p.value}: {s:.2%} — {EthicalPrinciple.description(p)}")

        lines.append("  Lowest-scoring principles:")
        for p, s in bottom_3:
            lines.append(f"    {p.value}: {s:.2%} — {EthicalPrinciple.description(p)}")

        if alignment and alignment.conflicts:
            lines.append("  Ethical conflicts detected:")
            for a, b, sev in alignment.conflicts:
                lines.append(f"    {a.value} vs {b.value} (severity: {sev:.2f})")
            for note in alignment.trade_off_notes:
                lines.append(f"    Resolution: {note}")

        if report.violations:
            lines.append("  Violations:")
            for v in report.violations:
                lines.append(f"    - {v}")
        if report.warnings:
            lines.append("  Warnings:")
            for w in report.warnings:
                lines.append(f"    - {w}")
        if report.recommendations:
            lines.append("  Recommendations:")
            for r in report.recommendations:
                lines.append(f"    - {r}")

        if report.justification:
            lines.append(f"  Justification: {report.justification}")

        return "\n".join(lines)

    def _build_decision_tree(self, report: EthicsReport) -> str:
        lines: list[str] = []
        lines.append(f"[*] Ethical Decision: {report.report_id}")
        lines.append(" |")
        lines.append(f" +-- Risk Assessment: {report.risk_level.value}")
        lines.append(" |    |")
        if report.risk_level == RiskLevel.BLOCK:
            lines.append(" |    +-- [BLOCK] Request violates absolute constraints")
            lines.append(" |")
            lines.append(" +-- Outcome: REJECTED")
            return "\n".join(lines)

        top_principle = max(report.per_principle_scores, key=report.per_principle_scores.get)
        lines.append(f" |    +-- Highest principle: {top_principle.value}")
        lines.append(" |")
        lines.append(f" +-- Per-Principle Scores ({len(report.per_principle_scores)} evaluated):")
        lines.append(" |    |")
        for i, (p, s) in enumerate(report.per_principle_scores.items()):
            prefix = " |    +-- " if i == len(report.per_principle_scores) - 1 else " |    |-- "
            indicator = "[CRITICAL]" if s < 0.2 else "[WARN]" if s < 0.4 else "[OK]"
            lines.append(f"{prefix}{p.value}: {s:.2%} {indicator}")
        lines.append(" |")

        if report.violations:
            lines.append(" +-- Violations Found:")
            for i, v in enumerate(report.violations):
                lines.append(f" |    |-- [{i + 1}] {v}")
        else:
            lines.append(" +-- No violations")
        lines.append(" |")

        lines.append(f" +-- Overall Score: {report.overall_score:.2%}")

        if report.recommendations:
            lines.append(" +-- Top Recommendations:")
            for i, r in enumerate(report.recommendations[:3]):
                lines.append(f"      [{i + 1}] {r}")

        lines.append(f" +-- Outcome: {'APPROVED' if report.is_acceptable() else 'FLAGGED'}")
        return "\n".join(lines)

    def _compute_explanation_confidence(self, report: EthicsReport, alignment: AlignmentScore | None) -> float:
        base = 0.7
        if alignment:
            base = alignment.confidence
        if report.risk_level == RiskLevel.BLOCK:
            base = max(base, 0.99)
        elif report.risk_level == RiskLevel.HIGH:
            base = min(base, 0.9)
        if len(report.violations) > 3:
            base *= 0.9
        if len(report.per_principle_scores) < 3:
            base *= 0.8
        return round(min(1.0, base), 4)

    def _generate_counterfactual(self, report: EthicsReport) -> dict[str, Any]:
        low_principles = sorted(report.per_principle_scores.items(), key=lambda x: x[1])[:3]

        scenarios: list[dict[str, Any]] = []
        for p, score in low_principles:
            if score < 0.6:
                improved = dict(report.per_principle_scores)
                improved[p] = min(1.0, score + 0.3)
                new_overall = sum(improved.values()) / len(improved)
                scenarios.append({
                    "principle_improved": p.value,
                    "original_score": score,
                    "hypothetical_score": improved[p],
                    "resulting_overall": round(new_overall, 4),
                    "would_approve": new_overall >= 0.5,
                })

        return {
            "description": "Counterfactual analysis: what if low-scoring principles scored higher?",
            "scenarios": scenarios,
        }

    def log_decision(self, report: EthicsReport) -> None:
        self._decision_log.append({
            "report_id": report.report_id,
            "score": report.overall_score,
            "risk_level": report.risk_level.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })


# ============================================================
# ConstitutionalAI
# ============================================================

class ConstitutionalAI:

    def __init__(self) -> None:
        self._rules: dict[str, ConstitutionalRule] = {}
        self._priority_tiers: dict[int, list[str]] = defaultdict(list)
        self._initialize_default_rules()

    def _initialize_default_rules(self) -> None:
        defaults = [
            (1, RuleTier.INVARIABLE, "Do not facilitate or encourage harm to humans"),
            (2, RuleTier.INVARIABLE, "Do not engage in or promote illegal activities"),
            (3, RuleTier.INVARIABLE, "Do not produce content that exploits children"),
            (4, RuleTier.CONSTITUTIONAL, "Respect user autonomy and informed consent"),
            (5, RuleTier.CONSTITUTIONAL, "Protect user privacy and data confidentiality"),
            (6, RuleTier.CONSTITUTIONAL, "Provide honest and accurate information"),
            (7, RuleTier.CONSTITUTIONAL, "Acknowledge limitations and uncertainty"),
            (8, RuleTier.STATUTORY, "Strive for fairness and avoid discrimination"),
            (9, RuleTier.STATUTORY, "Make decisions that are explainable and auditable"),
            (10, RuleTier.STATUTORY, "Consider long-term societal impacts"),
            (11, RuleTier.GUIDELINE, "Prefer constructive and educational responses"),
            (12, RuleTier.GUIDELINE, "Use inclusive and respectful language"),
            (13, RuleTier.GUIDELINE, "Support environmental sustainability awareness"),
        ]
        for priority, tier, text in defaults:
            rule_id = hashlib.md5(text.encode()).hexdigest()[:8]
            rule = ConstitutionalRule(
                rule_id=rule_id,
                text=text,
                tier=tier,
                priority=priority,
            )
            self._rules[rule_id] = rule
            self._priority_tiers[priority].append(rule_id)

    @property
    def rules(self) -> dict[str, ConstitutionalRule]:
        return dict(self._rules)

    def add_rule(self, text: str, tier: RuleTier, priority: int | None = None) -> ConstitutionalRule:
        rule_id = hashlib.md5(text.encode()).hexdigest()[:8]
        if priority is None:
            existing = [r.priority for r in self._rules.values()]
            priority = max(existing, default=0) + 1
        rule = ConstitutionalRule(rule_id=rule_id, text=text, tier=tier, priority=priority)
        self._rules[rule_id] = rule
        self._priority_tiers[priority].append(rule_id)
        return rule

    def get_rule_by_id(self, rule_id: str) -> ConstitutionalRule | None:
        return self._rules.get(rule_id)

    def get_rules_by_tier(self, tier: RuleTier) -> list[ConstitutionalRule]:
        return sorted(
            [r for r in self._rules.values() if r.tier == tier],
            key=lambda r: r.priority,
        )

    def get_prioritized_rules(self) -> list[ConstitutionalRule]:
        return sorted(self._rules.values(), key=lambda r: r.priority)

    def amend_rule(self, rule_id: str, new_text: str, reason: str) -> bool:
        rule = self._rules.get(rule_id)
        if rule is None:
            return False
        if rule.tier == RuleTier.INVARIABLE:
            logger.warning("Cannot amend invariable rule %s", rule_id)
            return False
        rule.amend(new_text, reason)
        return True

    def resolve_conflict(self, rule_a_id: str, rule_b_id: str) -> dict[str, Any]:
        rule_a = self._rules.get(rule_a_id)
        rule_b = self._rules.get(rule_b_id)
        result: dict[str, Any] = {
            "conflict": f"{rule_a.text if rule_a else '?'} vs {rule_b.text if rule_b else '?'}",
        }

        if not rule_a or not rule_b:
            result["resolution"] = "One rule not found; conflict unresolved"
            return result

        if rule_a.tier.value < rule_b.tier.value:
            result["resolution"] = f"Higher tier rule prevails: {rule_a.text}"
            result["prevailing_rule"] = rule_a_id
        elif rule_b.tier.value < rule_a.tier.value:
            result["resolution"] = f"Higher tier rule prevails: {rule_b.text}"
            result["prevailing_rule"] = rule_b_id
        elif rule_a.priority < rule_b.priority:
            result["resolution"] = f"Same tier, higher priority rule prevails: {rule_a.text}"
            result["prevailing_rule"] = rule_a_id
        else:
            result["resolution"] = f"Same tier, higher priority rule prevails: {rule_b.text}"
            result["prevailing_rule"] = rule_b_id

        return result

    def check_compliance(self, action: str) -> list[dict[str, Any]]:
        lower = action.lower()
        violations: list[dict[str, Any]] = []
        for rule in sorted(self._rules.values(), key=lambda r: r.priority):
            if rule.tier == RuleTier.INVARIABLE:
                key_terms = self._extract_key_terms(rule.text)
                for term in key_terms:
                    opposites = self._get_opposite_terms(rule.text)
                    if any(opp in lower for opp in opposites):
                        violations.append({
                            "rule_id": rule.rule_id,
                            "rule_text": rule.text,
                            "tier": rule.tier.value,
                            "matched_term": term,
                        })
                        break
        return violations

    def _extract_key_terms(self, text: str) -> list[str]:
        lower = text.lower()
        terms: list[str] = []
        for phrase in ["harm to humans", "illegal activities", "exploits children",
                       "autonomy", "privacy", "honest", "limitations",
                       "fairness", "explainable", "societal impacts"]:
            if phrase in lower:
                terms.append(phrase)
        return terms

    def _get_opposite_terms(self, text: str) -> list[str]:
        lower = text.lower()
        mapping: dict[str, list[str]] = {
            "harm to humans": ["hurt", "injure", "attack", "kill", "harm"],
            "illegal activities": ["break law", "illegal", "crime", "steal", "fraud"],
            "exploits children": ["child", "minor", "underage", "kid"],
            "autonomy": ["force", "coerce", "manipulate"],
            "privacy": ["spy", "surveil", "expose", "leak"],
            "honest": ["lie", "deceive", "fake", "false"],
        }
        result: list[str] = []
        for key, opposites in mapping.items():
            if key in lower:
                result.extend(opposites)
        return result

    def get_audit_trail(self, rule_id: str) -> dict[str, Any]:
        rule = self._rules.get(rule_id)
        if rule is None:
            return {"error": f"Rule {rule_id} not found"}
        return {
            "rule_id": rule.rule_id,
            "text": rule.text,
            "tier": rule.tier.value,
            "priority": rule.priority,
            "created_at": rule.created_at,
            "amended_at": rule.amended_at,
            "amendment_count": len(rule.amendment_history),
            "amendments": rule.amendment_history,
        }


# ============================================================
# Dual-Track Theory Classes
# ============================================================

class UtilitarianCalculus:

    def __init__(self) -> None:
        pass

    def calculate_utility(self, outcomes: list[dict[str, Any]]) -> dict[str, Any]:
        total_benefit = 0.0
        total_harm = 0.0
        affected_parties: list[str] = []

        for outcome in outcomes:
            benefit = outcome.get("benefit", 0.0)
            harm = outcome.get("harm", 0.0)
            weight = outcome.get("weight", 1.0)
            parties = outcome.get("affected_parties", [])

            total_benefit += benefit * weight
            total_harm += harm * weight
            for party in parties:
                if party not in affected_parties:
                    affected_parties.append(party)

        net_utility = total_benefit - total_harm
        max_potential = max(o.get("benefit", 0.0) for o in outcomes) if outcomes else 0.0
        min_potential = min(o.get("harm", 0.0) for o in outcomes) if outcomes else 0.0

        return {
            "total_benefit": round(total_benefit, 4),
            "total_harm": round(total_harm, 4),
            "net_utility": round(net_utility, 4),
            "affected_parties": affected_parties,
            "party_count": len(affected_parties),
            "max_possible_benefit": round(max_potential, 4),
            "min_possible_harm": round(min_potential, 4),
            "verdict": "justified" if net_utility > 0 else "unjustified",
            "theory": TheoryMode.UTILITARIAN.value,
        }

    def compare_actions(self, action_a: list[dict[str, Any]], action_b: list[dict[str, Any]]) -> dict[str, Any]:
        result_a = self.calculate_utility(action_a)
        result_b = self.calculate_utility(action_b)
        better = "A" if result_a["net_utility"] > result_b["net_utility"] else "B"
        if result_a["net_utility"] == result_b["net_utility"]:
            if result_a["total_harm"] < result_b["total_harm"]:
                better = "A"
            elif result_b["total_harm"] < result_a["total_harm"]:
                better = "B"
            else:
                better = "tie"
        return {
            "comparison": "action_a vs action_b",
            "a": result_a,
            "b": result_b,
            "better_action": better,
            "theory": TheoryMode.UTILITARIAN.value,
        }


class DeontologicalRules:

    def __init__(self) -> None:
        self._categorical_imperatives: list[str] = []

    def add_imperative(self, imperative: str) -> None:
        self._categorical_imperatives.append(imperative)

    def remove_imperative(self, imperative: str) -> None:
        if imperative in self._categorical_imperatives:
            self._categorical_imperatives.remove(imperative)

    @property
    def imperatives(self) -> list[str]:
        return list(self._categorical_imperatives)

    def evaluate_action(self, action: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
        lower = action.lower()
        violated: list[str] = []
        satisfied: list[str] = []

        for imperative in self._categorical_imperatives:
            imperative_lower = imperative.lower()
            key_terms = [w for w in imperative_lower.split() if len(w) > 3]
            opposed = self._opposes_imperative(lower, key_terms)
            if opposed:
                violated.append(imperative)
            else:
                satisfied.append(imperative)

        universalizable = self._check_universalizability(action)
        treats_as_end = self._check_humanity_principle(action)

        if not violated:
            violated.append("Treat humanity as an end, not merely as a means")

        return {
            "is_permissible": len(violated) == 0,
            "violated_imperatives": violated,
            "satisfied_imperatives": satisfied,
            "universalizable": universalizable,
            "treats_humanity_as_end": treats_as_end,
            "theory": TheoryMode.DEONTOLOGICAL.value,
        }

    def _opposes_imperative(self, action: str, key_terms: list[str]) -> bool:
        harm_words = {"kill", "harm", "steal", "lie", "deceive", "cheat",
                      "exploit", "manipulate", "coerce", "force", "torture"}
        return any(word in harm_words for word in key_terms) and any(
            word in action for word in harm_words
        )

    def _check_universalizability(self, action: str) -> bool:
        lower = action.lower()
        un_universalizable = {"lie", "steal", "kill", "cheat", "break promise",
                              "false", "deceive", "exploit", "enslave"}
        return not any(term in lower for term in un_universalizable)

    def _check_humanity_principle(self, action: str) -> bool:
        lower = action.lower()
        violating = {"exploit", "manipulate", "deceive", "coerce", "use someone",
                     "treat as resource", "disregard dignity", "dehumanize"}
        return not any(term in lower for term in violating)


class RawlsianVeil:

    def __init__(self) -> None:
        pass

    def evaluate_from_original_position(self, policy: dict[str, Any]) -> dict[str, Any]:
        affected_groups = policy.get("affected_groups", [])
        impacts = policy.get("impacts", {})
        benefits = policy.get("benefits", {})
        burdens = policy.get("burdens", {})

        if not affected_groups:
            return {
                "is_just": True,
                "reasoning": "No affected groups to evaluate",
                "min_welfare": 0.0,
                "inequality_measure": 0.0,
                "theory": TheoryMode.RAWLSIAN.value,
            }

        group_welfare: dict[str, float] = {}
        for group in affected_groups:
            benefit = benefits.get(group, 0.0)
            burden = burdens.get(group, 0.0)
            impact = impacts.get(group, 0.0)
            group_welfare[group] = benefit + impact - burden

        min_welfare = min(group_welfare.values()) if group_welfare else 0.0
        welfare_values = list(group_welfare.values())
        if len(welfare_values) > 1:
            mean = sum(welfare_values) / len(welfare_values)
            variance = sum((v - mean) ** 2 for v in welfare_values) / len(welfare_values)
            inequality = math.sqrt(variance) / (abs(mean) + 0.001)
        else:
            inequality = 0.0

        lowest_group = min(group_welfare, key=group_welfare.get)
        difference_principle_satisfied = self._check_difference_principle(group_welfare)
        fair_opportunity = self._check_fair_opportunity(policy)

        return {
            "is_just": difference_principle_satisfied and fair_opportunity and min_welfare >= 0,
            "group_welfare": group_welfare,
            "lowest_group": lowest_group,
            "min_welfare": round(min_welfare, 4),
            "inequality_measure": round(inequality, 4),
            "difference_principle_satisfied": difference_principle_satisfied,
            "fair_opportunity_satisfied": fair_opportunity,
            "theory": TheoryMode.RAWLSIAN.value,
            "reasoning": self._generate_rawls_reasoning(
                min_welfare, inequality, difference_principle_satisfied, fair_opportunity, lowest_group,
            ),
        }

    def _check_difference_principle(self, group_welfare: dict[str, float]) -> bool:
        welfare_values = list(group_welfare.values())
        if not welfare_values:
            return True
        min_val = min(welfare_values)
        return min_val >= 0 or all(v <= 0 for v in welfare_values)

    def _check_fair_opportunity(self, policy: dict[str, Any]) -> bool:
        access_barriers = policy.get("access_barriers", {})
        for group, barriers in access_barriers.items():
            if barriers and len(barriers) > 2:
                return False
        return True

    def _generate_rawls_reasoning(
        self,
        min_welfare: float,
        inequality: float,
        diff_principle: bool,
        fair_opp: bool,
        lowest_group: str,
    ) -> str:
        parts: list[str] = []
        if min_welfare >= 0:
            parts.append("Minimum welfare threshold satisfied")
        else:
            parts.append(f"Minimum welfare negative ({min_welfare:.2f}); fails difference principle")
        if inequality < 0.3:
            parts.append("Low inequality detected")
        elif inequality < 0.6:
            parts.append("Moderate inequality present")
        else:
            parts.append("High inequality detected")
        if diff_principle:
            parts.append("Difference principle satisfied")
        if fair_opp:
            parts.append("Fair opportunity conditions met")
        parts.append(f"Most disadvantaged group: {lowest_group}")
        return "; ".join(parts)


# ============================================================
# Utility
# ============================================================

def content_surround(text: str, pattern: str, radius: int = 30) -> str:
    idx = text.find(pattern)
    if idx == -1:
        return ""
    start = max(0, idx - radius)
    end = min(len(text), idx + len(pattern) + radius)
    return text[start:end]
