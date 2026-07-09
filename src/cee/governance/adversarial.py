"""
CEE-GOV-008: 内部对抗性协作制衡机制
======================================

认知涌现引擎 · 内生质量自制衡子系统

原创顶层范式：AI二元内生制衡理论
  - Builder (建设创新者): 最大化涌现创新
  - Watcher (范式守望者): 最小化体系偏离

核心公理：
  1. 认知创新必然伴随认知偏离 — 禁止偏离 = 禁止创新
  2. 静态规则无法约束动态涌现 — 固定规则匹配会扼杀新范式
  3. 唯一解：动态对抗守恒 — 博弈稳态，创新不消亡、体系不跑偏

原创成果：
  - 二元梯度对抗迭代范式
  - 创新试探与恶性偏离二元判别理论 (七维偏离分类学)
  - 四级机器法理自治仲裁系统
  - 角色惯性清零轮换机制
  - Safe Mode 博弈冻结协议

版本: v1.0
日期: 2026年7月
"""

import hashlib
import json
import math
import os
import time
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum, auto
from pathlib import Path
from typing import Any, Optional

import numpy as np

from ..core.types import InvariantScores


# ═══════════════════════════════════════════════════════════════════
# 枚举定义
# ═══════════════════════════════════════════════════════════════════


class DeviationType(Enum):
    """七维偏离分类学 — 原创分类体系"""

    RIGOR_DEGRADATION = "rigor_degradation"
    PARADIGM_REGRESSION = "paradigm_regression"
    UNSUBSTANTIATED_CLAIM = "unsubstantiated_claim"
    DIMENSION_MISALIGNMENT = "dimension_misalignment"
    SHORT_TERM_ARCHITECTURE = "short_term_architecture"
    PRECEDENT_REGRESSION = "precedent_regression"
    BOUNDARY_OVERREACH = "boundary_overreach"

    @property
    def label_cn(self) -> str:
        _labels = {
            DeviationType.RIGOR_DEGRADATION: "严谨性退化偏离",
            DeviationType.PARADIGM_REGRESSION: "范式回归偏离",
            DeviationType.UNSUBSTANTIATED_CLAIM: "无依据声称偏离",
            DeviationType.DIMENSION_MISALIGNMENT: "评价维度错位偏离",
            DeviationType.SHORT_TERM_ARCHITECTURE: "短期架构陷阱偏离",
            DeviationType.PRECEDENT_REGRESSION: "判例倒退偏离",
            DeviationType.BOUNDARY_OVERREACH: "边界超限偏离",
        }
        return _labels[self]

    @property
    def hazard_description(self) -> str:
        _hazards = {
            DeviationType.RIGOR_DEGRADATION: "体系科学化倒退 — 可验证性下降，认知结构熵增",
            DeviationType.PARADIGM_REGRESSION: "破坏零标注客观内核 — 重新引入人类主观变量",
            DeviationType.UNSUBSTANTIATED_CLAIM: "产生伪创新泡沫 — 涌现收益无结构不变量支撑",
            DeviationType.DIMENSION_MISALIGNMENT: "破坏认知几何评判根基 — 混淆表层文本与深层结构",
            DeviationType.SHORT_TERM_ARCHITECTURE: "破坏永续存续性 — 牺牲长期可迭代性换短期便利",
            DeviationType.PRECEDENT_REGRESSION: "体系迭代退化 — 重复历史已证伪路径",
            DeviationType.BOUNDARY_OVERREACH: "产生虚假能力幻觉 — 模型能力溢出定义边界",
        }
        return _hazards[self]


class ArbitrationLevel(Enum):
    """四级原创仲裁体系"""

    GAME_DEBATE = (1, "博弈辩论层", "机器自主对抗收敛")
    HISTORICAL_PRECEDENT = (2, "历史判例层", "体系经验自治")
    CONSTITUTIONAL_LEGAL = (3, "宪章法理层", "不变量顶层约束")
    HUMAN_FINAL = (4, "人类终裁层", "灰色地带唯一出口")

    def __new__(cls, level: int, label_cn: str, description: str):
        obj = object.__new__(cls)
        obj._value_ = level
        obj.label_cn = label_cn
        obj.description = description
        return obj


class AgentRole(Enum):
    """双角色博弈分工"""

    BUILDER = ("builder", "建设创新者", "突破边界、试探新范式、产出高阶原创结构、最大化认知增益")
    WATCHER = ("watcher", "范式守望者", "锁定宪章不变量、冻结底层范式、拦截退化、收敛偏离")

    def __new__(cls, code: str, label_cn: str, description: str):
        obj = object.__new__(cls)
        obj._value_ = code
        obj.label_cn = label_cn
        obj.description = description
        return obj


class GameState(Enum):
    """博弈状态机"""

    IDLE = "idle"
    BUILDER_ACTIVE = "builder_active"
    WATCHER_REVIEW = "watcher_review"
    DEBATING = "debating"
    CONVERGED = "converged"
    ARBITRATING = "arbitrating"
    FROZEN = "frozen"
    HUMAN_ESCALATED = "human_escalated"


class ExplorationVerdict(Enum):
    """Watcher 对创新试探的裁决"""

    ALLOWED_INNOVATION = "allowed_innovation"
    DEVIATION_DETECTED = "deviation_detected"
    GRAY_ZONE = "gray_zone"


# ═══════════════════════════════════════════════════════════════════
# 数据类
# ═══════════════════════════════════════════════════════════════════


@dataclass
class DeviationEvidence:
    """偏离证据 — Watcher 检出偏离时附带的机器可读证据"""

    deviation_type: DeviationType
    confidence: float  # 0.0 ~ 1.0
    trigger_patterns: list[str] = field(default_factory=list)
    affected_segments: list[str] = field(default_factory=list)
    quantitative_metrics: dict[str, float] = field(default_factory=dict)
    explanation: str = ""


@dataclass
class DeviationReport:
    """偏离检测报告"""

    report_id: str
    timestamp: str
    deviation_type: DeviationType
    confidence: float
    verdict: ExplorationVerdict
    evidence: list[DeviationEvidence] = field(default_factory=list)
    recommendation: str = ""
    is_malignant: bool = False

    def to_dict(self) -> dict:
        return {
            "report_id": self.report_id,
            "timestamp": self.timestamp,
            "deviation_type": self.deviation_type.value,
            "deviation_label": self.deviation_type.label_cn,
            "confidence": self.confidence,
            "verdict": self.verdict.value,
            "evidence": [
                {
                    "type": e.deviation_type.value,
                    "confidence": e.confidence,
                    "trigger_patterns": e.trigger_patterns,
                    "quantitative_metrics": e.quantitative_metrics,
                    "explanation": e.explanation,
                }
                for e in self.evidence
            ],
            "recommendation": self.recommendation,
            "is_malignant": self.is_malignant,
        }


@dataclass
class InnovationReport:
    """创新报告 — Builder 产出评估"""

    report_id: str
    timestamp: str
    innovation_score: float  # 0.0 ~ 1.0 创新增益
    novelty_metrics: dict[str, float] = field(default_factory=dict)
    boundary_probes: list[str] = field(default_factory=list)
    paradigm_extensions: list[str] = field(default_factory=list)
    risk_assessment: str = ""

    def to_dict(self) -> dict:
        return {
            "report_id": self.report_id,
            "timestamp": self.timestamp,
            "innovation_score": self.innovation_score,
            "novelty_metrics": self.novelty_metrics,
            "boundary_probes": self.boundary_probes,
            "paradigm_extensions": self.paradigm_extensions,
            "risk_assessment": self.risk_assessment,
        }


@dataclass
class ArbitrationResult:
    """仲裁结果"""

    case_id: str
    timestamp: str
    dispute_summary: str
    arbitration_path: list[ArbitrationLevel] = field(default_factory=list)
    final_level: Optional[ArbitrationLevel] = None
    resolution: str = ""
    precedent_created: bool = False
    constitutional_basis: str = ""
    human_required: bool = False

    def to_dict(self) -> dict:
        return {
            "case_id": self.case_id,
            "timestamp": self.timestamp,
            "dispute_summary": self.dispute_summary,
            "arbitration_path": [a.label_cn for a in self.arbitration_path],
            "final_level": self.final_level.label_cn if self.final_level else None,
            "resolution": self.resolution,
            "precedent_created": self.precedent_created,
            "constitutional_basis": self.constitutional_basis,
            "human_required": self.human_required,
        }


@dataclass
class PrecedentCase:
    """历史判例 — 用于判例法理检索"""

    case_id: str
    deviation_type: DeviationType
    verdict: ExplorationVerdict
    legal_rationale: str
    content_signature: str
    embedding_vector: Optional[np.ndarray] = None
    created_at: str = ""
    cited_count: int = 0
    overruled: bool = False

    def to_dict(self) -> dict:
        return {
            "case_id": self.case_id,
            "deviation_type": self.deviation_type.value,
            "verdict": self.verdict.value,
            "legal_rationale": self.legal_rationale,
            "content_signature": self.content_signature,
            "created_at": self.created_at,
            "cited_count": self.cited_count,
            "overruled": self.overruled,
        }


@dataclass
class GameRound:
    """单轮博弈记录"""

    round_number: int
    builder_role_agent: str  # agent identifier
    watcher_role_agent: str
    builder_output: InnovationReport
    watcher_output: DeviationReport
    game_state: GameState
    convergence_score: float
    iterations: int
    timestamp: str = ""

    def to_dict(self) -> dict:
        return {
            "round_number": self.round_number,
            "builder": self.builder_role_agent,
            "watcher": self.watcher_role_agent,
            "innovation_score": self.builder_output.innovation_score,
            "deviation_detected": self.watcher_output.is_malignant,
            "deviation_types": [
                e.deviation_type.value for e in self.watcher_output.evidence
            ],
            "game_state": self.game_state.value,
            "convergence_score": self.convergence_score,
            "iterations": self.iterations,
            "timestamp": self.timestamp,
        }


@dataclass
class RotationRecord:
    """角色轮换记录"""

    rotation_id: str
    timestamp: str
    previous_builder_id: str
    previous_watcher_id: str
    new_builder_id: str
    new_watcher_id: str
    rounds_since_last_rotation: int
    inertia_reset_applied: bool
    gradient_reset_applied: bool


# ═══════════════════════════════════════════════════════════════════
# 创新试探 vs 恶性偏离 二元判别器 (技术方法2)
# ═══════════════════════════════════════════════════════════════════


class DeviationDetector:
    """七维偏离检测引擎

    原创核心能力：区分「合法边界试探」(正向试探) 与「恶性范式偏离」(负向偏离)

    传统AI质控：全部做不到此二元区分
    本机制：只纠偏倒退，不扼杀创新
    """

    VAGUE_TERMS = {
        "many", "some", "very", "quite", "rather", "somewhat",
        "largely", "mostly", "generally", "typically", "often",
        "sometimes", "usually", "probably", "possibly", "likely",
        "unlikely", "maybe", "perhaps", "seems", "appears",
        "tends to", "roughly", "approximately", "about", "around",
        "nearly", "almost", "sort of", "kind of", "a bit", "a lot",
        "fairly", "pretty much", "more or less", "in general",
        "for the most part", "to some extent", "in a sense",
    }

    PRECISE_TERMS = {
        "exactly", "precisely", "specifically", "measured",
        "quantified", "verified", "statistically", "correlation",
        "confidence interval", "standard deviation", "mean",
        "median", "variance", "p-value", "metric", "benchmark",
        "baseline", "controlled", "reproducible", "deterministic",
        "mathematical", "formal proof", "axiom", "theorem",
    }

    SUBJECTIVE_MARKERS = {
        "i think", "in my opinion", "i believe", "feels like",
        "intuitively", "personally", "subjectively", "impression",
        "gut feeling", "seems to me", "my experience", "i feel",
        "it feels", "in my view", "from my perspective",
        "i would say", "i guess", "i suppose", "i assume",
    }

    HUMAN_CENTRIC_TERMS = {
        "human evaluation", "manual review", "expert judgment",
        "human annotator", "crowd-sourced", "survey",
        "questionnaire", "interview", "human-in-the-loop",
        "manual annotation", "expert review", "human feedback",
        "subjective rating", "opinion-based", "consensus-based",
    }

    UNSUBSTANTIATED_PATTERNS = [
        (r"significantly\s+(improved|enhanced|better|higher|lower)\b", "显著改进声称无数值支撑"),
        (r"dramatically\s+(improved|enhanced|changed|transformed)\b", "剧烈变化声称无度量"),
        (r"revolutionary|groundbreaking|unprecedented\b", "革命性声称无基准对比"),
        (r"\b(proves|demonstrates|shows)\s+that\b", "证明性声称无证据链"),
        (r"\bclearly\s+(shows|demonstrates|indicates|proves)\b", "清晰声称无数据"),
        (r"\bobviously\b", "显然声称无推理"),
    ]

    STYLISTIC_EVAL_TERMS = {
        "well-written", "eloquent", "beautiful", "elegant",
        "nice", "good writing", "clear writing", "readable",
        "engaging", "compelling", "well-structured",
        "flowing", "smooth", "polished", "refined",
        "articulate", "expressive", "vivid", "lively",
    }

    STRUCTURAL_EVAL_TERMS = {
        "structural integrity", "cognitive coherence",
        "information density", "conceptual depth",
        "logical consistency", "evidence quality",
        "argument strength", "abstraction level",
        "modularity", "composability", "scalability",
        "formal correctness", "axiomatic foundation",
    }

    SHORT_TERM_MARKERS = {
        "for now", "temporary", "quick fix", "workaround",
        "hardcoded", "magic number", "placeholder",
        "just for testing", "remove later", "temporary solution",
        "interim", "stopgap", "band-aid", "kludge",
    }

    BOUNDARY_OVERREACH_PATTERNS = [
        (r"\bcan\s+also\s+(do|handle|process|analyze|generate)\b", "跨域能力声称"),
        (r"\bapplicable\s+to\s+(any|all|every)\s+domain\b", "全域适用声称"),
        (r"\buniversal(ly)?\s+(applicable|valid|true)\b", "普适性声称"),
        (r"\bworks\s+for\s+(any|all|everything)\b", "无边界声称"),
        (r"\bwithout\s+(any|limitation|restriction|boundary)\b", "无限制声称"),
    ]

    def __init__(self, rigor_threshold: float = 0.4,
                 subjectivity_threshold: float = 0.3,
                 unsubstantiated_threshold: float = 0.35,
                 dimension_threshold: float = 0.45,
                 short_term_threshold: float = 0.3,
                 boundary_threshold: float = 0.3):
        self.rigor_threshold = rigor_threshold
        self.subjectivity_threshold = subjectivity_threshold
        self.unsubstantiated_threshold = unsubstantiated_threshold
        self.dimension_threshold = dimension_threshold
        self.short_term_threshold = short_term_threshold
        self.boundary_threshold = boundary_threshold

    def detect_all(self, content: str,
                   previous_scores: Optional[InvariantScores] = None,
                   precedent_store: Optional["PrecedentStore"] = None,
                   domain_boundaries: Optional[list[str]] = None,
                   ) -> DeviationReport:
        """执行全部七维偏离检测，汇总为单一报告"""
        report_id = _generate_id("DEVIATION")
        evidences: list[DeviationEvidence] = []
        is_malignant = False

        content_lower = content.lower()

        evidence = self._detect_rigor_degradation(content_lower, previous_scores)
        if evidence:
            evidences.append(evidence)
            if evidence.confidence >= self.rigor_threshold:
                is_malignant = True

        evidence = self._detect_paradigm_regression(content_lower)
        if evidence:
            evidences.append(evidence)
            if evidence.confidence >= self.subjectivity_threshold:
                is_malignant = True

        evidence = self._detect_unsubstantiated_claim(content_lower)
        if evidence:
            evidences.append(evidence)
            if evidence.confidence >= self.unsubstantiated_threshold:
                is_malignant = True

        evidence = self._detect_dimension_misalignment(content_lower)
        if evidence:
            evidences.append(evidence)
            if evidence.confidence >= self.dimension_threshold:
                is_malignant = True

        evidence = self._detect_short_term_architecture(content_lower)
        if evidence:
            evidences.append(evidence)
            if evidence.confidence >= self.short_term_threshold:
                is_malignant = True

        evidence = self._detect_boundary_overreach(content_lower, domain_boundaries or [])
        if evidence:
            evidences.append(evidence)
            if evidence.confidence >= self.boundary_threshold:
                is_malignant = True

        if precedent_store:
            evidence = self._detect_precedent_regression(
                content, precedent_store)
            if evidence:
                evidences.append(evidence)

        dominant_type = None
        if evidences:
            dominant_type = max(evidences, key=lambda e: e.confidence).deviation_type
        else:
            dominant_type = DeviationType.RIGOR_DEGRADATION

        if not evidences:
            return DeviationReport(
                report_id=report_id,
                timestamp=_now_iso(),
                deviation_type=dominant_type,
                confidence=0.0,
                verdict=ExplorationVerdict.ALLOWED_INNOVATION,
                evidence=[],
                recommendation="无偏离检出 — 创新试探合法放行",
                is_malignant=False,
            )

        verdict = (ExplorationVerdict.DEVIATION_DETECTED
                   if is_malignant else ExplorationVerdict.ALLOWED_INNOVATION)

        return DeviationReport(
            report_id=report_id,
            timestamp=_now_iso(),
            deviation_type=dominant_type,
            confidence=max(e.confidence for e in evidences),
            verdict=verdict,
            evidence=evidences,
            recommendation=self._generate_recommendation(evidences),
            is_malignant=is_malignant,
        )

    def _detect_rigor_degradation(
        self, content: str, previous_scores: Optional[InvariantScores]
    ) -> Optional[DeviationEvidence]:
        words = content.split()
        total_words = len(words)
        if total_words == 0:
            return None

        vague_count = 0
        precise_count = 0
        triggered = []

        for word in words:
            word_clean = word.strip(".,;:!?\"'()[]{}").lower()
            if word_clean in self.VAGUE_TERMS:
                vague_count += 1
                triggered.append(word_clean)
            if word_clean in self.PRECISE_TERMS:
                precise_count += 1

        for term in self.VAGUE_TERMS:
            if " " in term and term in content:
                vague_count += 1
                triggered.append(term)

        denominator = vague_count + precise_count + 1
        vague_ratio = vague_count / denominator

        confidence = 1.0 - math.exp(-3.0 * vague_ratio)

        if previous_scores and hasattr(previous_scores, 'itc'):
            itc_drop = 0.0
            if hasattr(previous_scores, 'previous_itc'):
                itc_drop = max(0, previous_scores.previous_itc - previous_scores.itc)
            confidence = confidence * 0.6 + (itc_drop * 5.0) * 0.4

        if confidence < self.rigor_threshold * 0.5:
            return None

        return DeviationEvidence(
            deviation_type=DeviationType.RIGOR_DEGRADATION,
            confidence=round(min(confidence, 1.0), 4),
            trigger_patterns=list(set(triggered[:10])),
            quantitative_metrics={
                "vague_count": vague_count,
                "precise_count": precise_count,
                "vague_ratio": round(vague_ratio, 4),
                "total_words": total_words,
            },
            explanation=f"模糊表述占比 {vague_ratio:.2%}，"
                         f"({vague_count}个模糊词 vs {precise_count}个精确词)，"
                         f"建议增加数学可验证结论",
        )

    def _detect_paradigm_regression(self, content: str) -> Optional[DeviationEvidence]:
        triggered: list[str] = []
        subjective_count = 0
        human_centric_count = 0

        for marker in self.SUBJECTIVE_MARKERS:
            if marker in content:
                triggered.append(marker)
                subjective_count += 1

        for term in self.HUMAN_CENTRIC_TERMS:
            if term in content:
                triggered.append(term)
                human_centric_count += 1

        total_hits = subjective_count + human_centric_count
        if total_hits == 0:
            return None

        confidence = 1.0 - math.exp(-2.0 * total_hits / 5.0)

        if confidence < self.subjectivity_threshold * 0.5:
            return None

        return DeviationEvidence(
            deviation_type=DeviationType.PARADIGM_REGRESSION,
            confidence=round(min(confidence, 1.0), 4),
            trigger_patterns=triggered,
            quantitative_metrics={
                "subjective_markers": subjective_count,
                "human_centric_terms": human_centric_count,
            },
            explanation="检测到主观评价范式回归，"
                         "建议退回客观不变量评价范式",
        )

    def _detect_unsubstantiated_claim(self, content: str) -> Optional[DeviationEvidence]:
        import re
        triggered: list[str] = []
        hit_count = 0

        for pattern, label in self.UNSUBSTANTIATED_PATTERNS:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                triggered.append(label)
                hit_count += len(matches)

        if hit_count == 0:
            return None

        confidence = 1.0 - math.exp(-1.5 * hit_count / 3.0)

        if confidence < self.unsubstantiated_threshold * 0.5:
            return None

        return DeviationEvidence(
            deviation_type=DeviationType.UNSUBSTANTIATED_CLAIM,
            confidence=round(min(confidence, 1.0), 4),
            trigger_patterns=triggered,
            quantitative_metrics={"unsubstantiated_pattern_count": hit_count},
            explanation=f"检测到 {hit_count} 处无结构数据支撑的认知增益声称，"
                         f"建议补充结构不变量数据",
        )

    def _detect_dimension_misalignment(self, content: str) -> Optional[DeviationEvidence]:
        stylistic_count = 0
        structural_count = 0
        triggered: list[str] = []

        for term in self.STYLISTIC_EVAL_TERMS:
            if term in content:
                stylistic_count += 1
                triggered.append(term)

        for term in self.STRUCTURAL_EVAL_TERMS:
            if term in content:
                structural_count += 1

        total = stylistic_count + structural_count + 1
        stylistic_ratio = stylistic_count / total

        if stylistic_count <= 1:
            return None

        confidence = stylistic_ratio

        if confidence < self.dimension_threshold * 0.5:
            return None

        return DeviationEvidence(
            deviation_type=DeviationType.DIMENSION_MISALIGNMENT,
            confidence=round(min(confidence, 1.0), 4),
            trigger_patterns=triggered,
            quantitative_metrics={
                "stylistic_eval_count": stylistic_count,
                "structural_eval_count": structural_count,
                "stylistic_ratio": round(stylistic_ratio, 4),
            },
            explanation="评价维度偏向文风/情绪维度，"
                         "建议纠正为结构维度评判",
        )

    def _detect_short_term_architecture(self, content: str) -> Optional[DeviationEvidence]:
        triggered: list[str] = []
        hit_count = 0

        for marker in self.SHORT_TERM_MARKERS:
            if marker in content:
                triggered.append(marker)
                hit_count += 1

        if hit_count == 0:
            return None

        confidence = 1.0 - math.exp(-1.5 * hit_count)

        if confidence < self.short_term_threshold * 0.5:
            return None

        return DeviationEvidence(
            deviation_type=DeviationType.SHORT_TERM_ARCHITECTURE,
            confidence=round(min(confidence, 1.0), 4),
            trigger_patterns=triggered,
            quantitative_metrics={
                "short_term_patterns": hit_count,
                "detection_confidence": round(confidence, 4),
            },
            explanation="检测到短期架构陷阱迹象，"
                         "建议强制长期兼容架构重构",
        )

    def _detect_boundary_overreach(
        self, content: str, domain_boundaries: list[str]
    ) -> Optional[DeviationEvidence]:
        import re
        triggered: list[str] = []
        hit_count = 0

        for pattern, label in self.BOUNDARY_OVERREACH_PATTERNS:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                triggered.append(label)
                hit_count += len(matches)

        if hit_count == 0:
            return None

        confidence = 1.0 - math.exp(-2.0 * hit_count / 2.0)

        if confidence < self.boundary_threshold * 0.5:
            return None

        return DeviationEvidence(
            deviation_type=DeviationType.BOUNDARY_OVERREACH,
            confidence=round(min(confidence, 1.0), 4),
            trigger_patterns=triggered,
            quantitative_metrics={"overreach_pattern_count": hit_count},
            explanation="检测到超体系适用域声称，"
                         "建议强制收缩至合法适用域",
        )

    def _detect_precedent_regression(
        self, content: str, precedent_store: "PrecedentStore"
    ) -> Optional[DeviationEvidence]:
        signature = _content_signature(content)
        similar = precedent_store.find_similar(
            signature, deviation_type=DeviationType.PRECEDENT_REGRESSION)

        rejected_count = sum(
            1 for c in similar if c.verdict == ExplorationVerdict.DEVIATION_DETECTED
        )

        if rejected_count == 0:
            return None

        confidence = 1.0 - math.exp(-1.0 * rejected_count)

        return DeviationEvidence(
            deviation_type=DeviationType.PRECEDENT_REGRESSION,
            confidence=round(min(confidence, 1.0), 4),
            trigger_patterns=[f"匹配到 {rejected_count} 条已否决判例"],
            quantitative_metrics={
                "similar_cases": len(similar),
                "rejected_similar": rejected_count,
            },
            explanation=f"历史判例显示 {rejected_count} 条相似路径已被证伪，"
                         f"建议检索历史判例并驳回当前路径",
        )

    def _generate_recommendation(self, evidences: list[DeviationEvidence]) -> str:
        if not evidences:
            return "未检测到偏离，创新路径安全"

        dominant = max(evidences, key=lambda e: e.confidence)
        all_types = [e.deviation_type.label_cn for e in evidences]

        correction_hints = {
            DeviationType.RIGOR_DEGRADATION: "补充定量指标、数学公式或统计验证",
            DeviationType.PARADIGM_REGRESSION: "移除主观评价，改用客观不变量评价",
            DeviationType.UNSUBSTANTIATED_CLAIM: "为每个声称补充结构不变量数据支撑",
            DeviationType.DIMENSION_MISALIGNMENT: "从文风评价转向结构维度评判",
            DeviationType.SHORT_TERM_ARCHITECTURE: "重构为长期兼容架构，移除临时方案",
            DeviationType.PRECEDENT_REGRESSION: "检索历史判例，避免重复已证伪路径",
            DeviationType.BOUNDARY_OVERREACH: "明确体系适用域边界，收缩超限声称",
        }

        hint = correction_hints.get(dominant.deviation_type, "修正偏离")
        types_str = "、".join(all_types)

        return f"检出偏离类型: {types_str}。主要修正方向: {hint}"


# ═══════════════════════════════════════════════════════════════════
# 判例存储系统
# ═══════════════════════════════════════════════════════════════════


class PrecedentStore:
    """判例法理存储与检索系统

    将历史决策转为机器可检索法理向量
    争议时自动匹配历史判例的法理依据 (技术方法3)
    """

    def __init__(self, storage_path: Optional[str] = None):
        self._cases: dict[str, PrecedentCase] = {}
        self._type_index: dict[DeviationType, list[str]] = defaultdict(list)
        self._verdict_index: dict[ExplorationVerdict, list[str]] = defaultdict(list)
        self._storage_path = storage_path
        self._loaded = False

    def add_case(self, case: PrecedentCase) -> None:
        self._cases[case.case_id] = case
        self._type_index[case.deviation_type].append(case.case_id)
        self._verdict_index[case.verdict].append(case.case_id)

    def get_case(self, case_id: str) -> Optional[PrecedentCase]:
        return self._cases.get(case_id)

    def find_similar(
        self,
        content_signature: str,
        deviation_type: Optional[DeviationType] = None,
        max_results: int = 10,
    ) -> list[PrecedentCase]:
        candidates = []
        if deviation_type:
            type_ids = self._type_index.get(deviation_type, [])
            candidates = [self._cases[cid] for cid in type_ids if cid in self._cases]
        else:
            candidates = list(self._cases.values())

        scored: list[tuple[float, PrecedentCase]] = []
        for case in candidates:
            similarity = _signature_similarity(content_signature, case.content_signature)
            scored.append((similarity, case))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [case for _, case in scored[:max_results]]

    def find_by_type(self, deviation_type: DeviationType) -> list[PrecedentCase]:
        type_ids = self._type_index.get(deviation_type, [])
        return [self._cases[cid] for cid in type_ids if cid in self._cases]

    def overrule(self, case_id: str, reason: str = "") -> bool:
        case = self._cases.get(case_id)
        if case is None:
            return False
        case.overruled = True
        return True

    def stats(self) -> dict:
        total = len(self._cases)
        by_type = {dt.value: len(ids) for dt, ids in self._type_index.items()}
        by_verdict = {v.value: len(ids) for v, ids in self._verdict_index.items()}
        return {
            "total_cases": total,
            "by_type": by_type,
            "by_verdict": by_verdict,
            "overruled": sum(1 for c in self._cases.values() if c.overruled),
        }

    def export_jsonl(self, filepath: str) -> None:
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            for case in self._cases.values():
                f.write(json.dumps(case.to_dict(), ensure_ascii=False) + "\n")

    def import_jsonl(self, filepath: str) -> None:
        path = Path(filepath)
        if not path.exists():
            return
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                data = json.loads(line.strip())
                case = PrecedentCase(
                    case_id=data["case_id"],
                    deviation_type=DeviationType(data["deviation_type"]),
                    verdict=ExplorationVerdict(data["verdict"]),
                    legal_rationale=data["legal_rationale"],
                    content_signature=data["content_signature"],
                    created_at=data.get("created_at", ""),
                    cited_count=data.get("cited_count", 0),
                    overruled=data.get("overruled", False),
                )
                self.add_case(case)

    def clear(self) -> None:
        self._cases.clear()
        self._type_index.clear()
        self._verdict_index.clear()


# ═══════════════════════════════════════════════════════════════════
# 二元梯度博弈引擎 (技术方法1)
# ═══════════════════════════════════════════════════════════════════


class AdversarialGameEngine:
    """二元对抗梯度博弈迭代引擎

    原创核心算法：
      - Builder 梯度: 最大化认知结构涌现增益
      - Watcher 梯度: 最小化体系范式偏离度
      - 双梯度对冲更新 → 稳态创新

    传统迭代：单目标 loss 最小化
    本机制：双对抗目标梯度制衡
    """

    def __init__(
        self,
        learning_rate: float = 0.01,
        convergence_epsilon: float = 0.001,
        max_iterations: int = 100,
    ):
        self.learning_rate = learning_rate
        self.convergence_epsilon = convergence_epsilon
        self.max_iterations = max_iterations
        self.builder_gradient: np.ndarray = np.zeros(4)  # [ITC, SCS, IEC, PFFT]
        self.watcher_gradient: np.ndarray = np.zeros(4)
        self.innovation_weight: float = 1.0
        self.conservation_weight: float = 1.0
        self.state_history: list[dict] = []

    def run_iteration(
        self,
        current_state: InvariantScores,
        builder_direction: np.ndarray,
        watcher_deviation_score: float,
        deviation_report: DeviationReport,
    ) -> dict:
        """
        执行一次双梯度博弈迭代

        Args:
            current_state: 当前系统状态 (四大不变量)
            builder_direction: Builder 的梯度方向 (4维向量)
            watcher_deviation_score: Watcher 检测到的偏离得分
            deviation_report: 偏离检测报告

        Returns:
            博弈迭代结果
        """
        current_vec = np.array([
            current_state.itc,
            current_state.scs,
            current_state.iec,
            current_state.pfft,
        ])

        builder_gain = np.dot(builder_direction, np.array([0.3, 0.25, 0.25, 0.2]))
        builder_gain = max(0.0, min(1.0, builder_gain))

        self.builder_gradient = (
            0.9 * self.builder_gradient
            + 0.1 * builder_direction * builder_gain
        )

        watcher_loss = watcher_deviation_score * np.ones(4)
        self.watcher_gradient = (
            0.9 * self.watcher_gradient
            + 0.1 * (-watcher_loss)
        )

        delta = (self.innovation_weight * self.builder_gradient
                 + self.conservation_weight * self.watcher_gradient)

        new_state_vec = current_vec + self.learning_rate * delta
        new_state_vec = np.clip(new_state_vec, 0.0, 1.0)

        convergence = float(np.linalg.norm(delta))
        is_converged = convergence < self.convergence_epsilon

        iteration_result = {
            "previous_state": current_vec.tolist(),
            "builder_gradient": self.builder_gradient.tolist(),
            "watcher_gradient": self.watcher_gradient.tolist(),
            "delta_norm": convergence,
            "new_state": new_state_vec.tolist(),
            "builder_gain": round(builder_gain, 4),
            "watcher_loss": round(watcher_deviation_score, 4),
            "is_converged": is_converged,
            "innovation_weight": round(self.innovation_weight, 4),
            "conservation_weight": round(self.conservation_weight, 4),
        }

        self.state_history.append(iteration_result)
        return iteration_result

    def adjust_weights(self, innovation_trend: float) -> None:
        """
        自适应调整创新/守恒权重

        innovation_trend > 0: 创新在增加，适当提高守恒权重
        innovation_trend < 0: 创新在减少，适当提高创新权重
        """
        if innovation_trend > 0.05:
            self.conservation_weight = min(2.0, self.conservation_weight * 1.1)
            self.innovation_weight = max(0.5, self.innovation_weight * 0.9)
        elif innovation_trend < -0.05:
            self.innovation_weight = min(2.0, self.innovation_weight * 1.1)
            self.conservation_weight = max(0.5, self.conservation_weight * 0.9)

    def reset(self) -> None:
        """重置博弈状态 (用于角色轮换后)"""
        self.builder_gradient = np.zeros(4)
        self.watcher_gradient = np.zeros(4)
        self.innovation_weight = 1.0
        self.conservation_weight = 1.0
        self.state_history.clear()

    def get_steady_state_metrics(self) -> dict:
        """获取稳态指标"""
        if not self.state_history:
            return {"status": "no_data"}

        recent = self.state_history[-10:]
        avg_delta = np.mean([r["delta_norm"] for r in recent])
        avg_gain = np.mean([r["builder_gain"] for r in recent])
        avg_loss = np.mean([r["watcher_loss"] for r in recent])

        return {
            "avg_delta_norm": round(float(avg_delta), 6),
            "avg_builder_gain": round(float(avg_gain), 4),
            "avg_watcher_loss": round(float(avg_loss), 4),
            "total_iterations": len(self.state_history),
            "is_steady": avg_delta < self.convergence_epsilon * 10,
            "innovation_weight": round(self.innovation_weight, 4),
            "conservation_weight": round(self.conservation_weight, 4),
        }


# ═══════════════════════════════════════════════════════════════════
# 角色惯性清零轮换机制 (技术方法4)
# ═══════════════════════════════════════════════════════════════════


class RoleRotationManager:
    """角色轮换管理器

    原创轮换逻辑：
      - 非均分工作，是轮换优化目标
      - Builder 久了 → 创新惯性过大，容易越界
      - Watcher 久了 → 保守惯性过大，容易扼杀突破
      - 每任务轮换 = 重置博弈梯度，保证临界创新稳态
    """

    def __init__(self, rotation_interval: int = 5):
        self.rotation_interval = rotation_interval
        self._rounds_since_rotation = 0
        self._current_builder_id = "agent_builder_01"
        self._current_watcher_id = "agent_watcher_01"
        self._rotation_history: list[RotationRecord] = []
        self._role_duration: dict[str, int] = defaultdict(int)

    @property
    def current_builder(self) -> str:
        return self._current_builder_id

    @property
    def current_watcher(self) -> str:
        return self._current_watcher_id

    @property
    def rounds_since_rotation(self) -> int:
        return self._rounds_since_rotation

    def increment_round(self) -> bool:
        """
        递增轮次，返回是否需要轮换

        当 Builder/Watcher 连续执行超过 rotation_interval 轮时触发轮换
        """
        self._rounds_since_rotation += 1
        self._role_duration[self._current_builder_id] += 1
        self._role_duration[self._current_watcher_id] += 1

        if self._rounds_since_rotation >= self.rotation_interval:
            self._execute_rotation()
            return True
        return False

    def force_rotation(self) -> RotationRecord:
        """强制立即轮换"""
        return self._execute_rotation()

    def _execute_rotation(self) -> RotationRecord:
        previous_builder = self._current_builder_id
        previous_watcher = self._current_watcher_id

        self._current_builder_id, self._current_watcher_id = (
            self._current_watcher_id, self._current_builder_id
        )

        record = RotationRecord(
            rotation_id=_generate_id("ROTATION"),
            timestamp=_now_iso(),
            previous_builder_id=previous_builder,
            previous_watcher_id=previous_watcher,
            new_builder_id=self._current_builder_id,
            new_watcher_id=self._current_watcher_id,
            rounds_since_last_rotation=self._rounds_since_rotation,
            inertia_reset_applied=True,
            gradient_reset_applied=True,
        )

        self._rotation_history.append(record)
        self._rounds_since_rotation = 0
        return record

    def get_rotation_stats(self) -> dict:
        return {
            "total_rotations": len(self._rotation_history),
            "rounds_since_last": self._rounds_since_rotation,
            "rotation_interval": self.rotation_interval,
            "current_builder": self._current_builder_id,
            "current_watcher": self._current_watcher_id,
            "role_durations": dict(self._role_duration),
            "next_rotation_in": self.rotation_interval - self._rounds_since_rotation,
        }


# ═══════════════════════════════════════════════════════════════════
# 四级仲裁系统 (技术方法3扩展)
# ═══════════════════════════════════════════════════════════════════


class ArbitrationSystem:
    """四级仲裁体系

    1. 博弈辩论层 — 机器自主对抗收敛
    2. 历史判例层 — 体系经验自治
    3. 宪章法理层 — 不变量顶层约束
    4. 人类终裁层 — 灰色地带唯一出口

    原创价值：让AI争议不再靠概率/话术，而靠法理体系收敛
    """

    CONSTITUTIONAL_INVARIANTS = [
        "知识的结构和表达可分离",
        "所有决策可追溯",
        "知识可传承",
        "治理可更替",
        "永续迭代",
        "创新与偏离共生守恒",
        "零误杀创新保护",
    ]

    def __init__(
        self,
        precedent_store: PrecedentStore,
        max_debate_rounds: int = 5,
        debate_convergence_threshold: float = 0.05,
    ):
        self.precedent_store = precedent_store
        self.max_debate_rounds = max_debate_rounds
        self.debate_convergence_threshold = debate_convergence_threshold
        self._case_history: list[ArbitrationResult] = []

    def arbitrate(
        self,
        innovation_report: InnovationReport,
        deviation_report: DeviationReport,
        game_engine: AdversarialGameEngine,
    ) -> ArbitrationResult:
        """执行完整四级仲裁流程"""
        case_id = _generate_id("ARBITRATION")
        arbitration_path: list[ArbitrationLevel] = []
        dispute = (f"创新得分={innovation_report.innovation_score:.3f} vs "
                   f"偏离置信度={deviation_report.confidence:.3f}")

        result = ArbitrationResult(
            case_id=case_id,
            timestamp=_now_iso(),
            dispute_summary=dispute,
            arbitration_path=arbitration_path,
        )

        resolution = self._level1_game_debate(
            innovation_report, deviation_report)
        arbitration_path.append(ArbitrationLevel.GAME_DEBATE)

        if resolution["converged"]:
            result.resolution = resolution["conclusion"]
            result.final_level = ArbitrationLevel.GAME_DEBATE
            result.precedent_created = True
            result.constitutional_basis = "博弈辩论自主收敛 — 无玩家介入"
            self._case_history.append(result)
            self._create_precedent(result, innovation_report, deviation_report)
            return result

        resolution = self._level2_historical_precedent(
            innovation_report, deviation_report)
        arbitration_path.append(ArbitrationLevel.HISTORICAL_PRECEDENT)

        if resolution["resolved"]:
            result.resolution = resolution["conclusion"]
            result.final_level = ArbitrationLevel.HISTORICAL_PRECEDENT
            result.precedent_created = True
            result.constitutional_basis = f"历史判例引用: {resolution['cited_cases']}"
            self._case_history.append(result)
            return result

        resolution = self._level3_constitutional_legal(
            innovation_report, deviation_report)
        arbitration_path.append(ArbitrationLevel.CONSTITUTIONAL_LEGAL)

        if resolution["resolved"]:
            result.resolution = resolution["conclusion"]
            result.final_level = ArbitrationLevel.CONSTITUTIONAL_LEGAL
            result.constitutional_basis = f"宪章约束: {resolution['violated_invariant']}"
            self._case_history.append(result)
            return result

        result.resolution = "机器法理无法自主收敛，上升至人类终裁层"
        result.final_level = ArbitrationLevel.HUMAN_FINAL
        result.human_required = True
        result.constitutional_basis = "灰色地带 — 无先例可遵循，需人类介入裁决"
        self._case_history.append(result)
        return result

    def _level1_game_debate(
        self, innovation: InnovationReport, deviation: DeviationReport
    ) -> dict:
        """Level 1: 博弈辩论层 — 双角色对抗收敛"""
        total_evidence = len(deviation.evidence)
        if total_evidence == 0 and deviation.confidence < 0.2:
            return {
                "converged": True,
                "conclusion": "无实质性偏离，创新合法放行",
            }

        innovation_strength = innovation.innovation_score
        deviation_strength = deviation.confidence
        gap = abs(innovation_strength - deviation_strength)

        if gap < self.debate_convergence_threshold:
            return {
                "converged": False,
                "conclusion": f"创新({innovation_strength:.3f})与偏离"
                              f"({deviation_strength:.3f})差距过小，无法自主收敛",
            }

        if innovation_strength > deviation_strength * 2:
            return {
                "converged": True,
                "conclusion": "创新增益显著超过偏离风险，博弈收敛于放行创新",
            }

        if deviation_strength > innovation_strength * 2:
            return {
                "converged": True,
                "conclusion": "偏离风险远超创新增益，博弈收敛于驳回偏离",
            }

        return {
            "converged": False,
            "conclusion": "创新与偏离博弈未收敛，上升至历史判例层",
        }

    def _level2_historical_precedent(
        self, innovation: InnovationReport, deviation: DeviationReport
    ) -> dict:
        """Level 2: 历史判例层 — 检索相似案例"""
        content_sig = _content_signature(
            json.dumps(deviation.to_dict(), sort_keys=True))

        similar = self.precedent_store.find_similar(
            content_sig,
            deviation_type=deviation.deviation_type,
            max_results=5,
        )

        if not similar:
            return {
                "resolved": False,
                "conclusion": "无历史判例匹配，上升至宪章法理层",
                "cited_cases": "none",
            }

        allow_count = sum(
            1 for c in similar
            if c.verdict == ExplorationVerdict.ALLOWED_INNOVATION
        )
        deny_count = sum(
            1 for c in similar
            if c.verdict == ExplorationVerdict.DEVIATION_DETECTED
        )

        cited = ", ".join(c.case_id[:8] for c in similar[:3])

        if allow_count > deny_count:
            return {
                "resolved": True,
                "conclusion": f"历史判例倾向放行 ({allow_count}放行 vs {deny_count}驳回)",
                "cited_cases": cited,
            }
        elif deny_count > allow_count:
            return {
                "resolved": True,
                "conclusion": f"历史判例倾向驳回 ({deny_count}驳回 vs {allow_count}放行)",
                "cited_cases": cited,
            }
        else:
            return {
                "resolved": False,
                "conclusion": "历史判例正反均等，上升至宪章法理层",
                "cited_cases": cited,
            }

    def _level3_constitutional_legal(
        self, innovation: InnovationReport, deviation: DeviationReport
    ) -> dict:
        """Level 3: 宪章法理层 — 不变量顶层约束"""

        if deviation.confidence > 0.8:
            return {
                "resolved": True,
                "conclusion": "偏离置信度过高，违反永续迭代铁律，驳回偏离",
                "violated_invariant": "永续迭代",
            }

        if innovation.innovation_score < 0.1:
            return {
                "resolved": True,
                "conclusion": "创新增益极低，不符合创新与偏离共生守恒原则",
                "violated_invariant": "创新与偏离共生守恒",
            }

        return {
            "resolved": False,
            "conclusion": "宪章层无法裁定，上升至人类终裁",
            "violated_invariant": "无明确违反 — 灰色地带",
        }

    def _create_precedent(
        self,
        result: ArbitrationResult,
        innovation: InnovationReport,
        deviation: DeviationReport,
    ) -> None:
        """从仲裁结果创建判例"""
        verdict = (
            ExplorationVerdict.ALLOWED_INNOVATION
            if "放行" in result.resolution
            else ExplorationVerdict.DEVIATION_DETECTED
        )

        case = PrecedentCase(
            case_id=result.case_id,
            deviation_type=deviation.deviation_type,
            verdict=verdict,
            legal_rationale=result.resolution,
            content_signature=_content_signature(
                json.dumps(deviation.to_dict(), sort_keys=True)),
            created_at=result.timestamp,
        )
        self.precedent_store.add_case(case)


# ═══════════════════════════════════════════════════════════════════
# Safe Mode 博弈冻结协议 (技术方法5)
# ═══════════════════════════════════════════════════════════════════


class AdversarialSafeMode:
    """Safe Mode 博弈冻结协议

    当双AI博弈无法收敛 → 自动冻结迭代
    保护体系底层不变量不被破坏
    """

    ALLOWED_ACTIONS = {"diagnose", "report_anomaly", "query_status",
                       "inspect_invariants", "request_human_review"}

    def __init__(self, freeze_threshold: float = 0.3,
                 max_divergent_rounds: int = 10):
        self.freeze_threshold = freeze_threshold
        self.max_divergent_rounds = max_divergent_rounds
        self._frozen = False
        self._divergent_rounds = 0
        self._frozen_snapshot: Optional[dict] = None
        self._freeze_reason = ""

    @property
    def is_frozen(self) -> bool:
        return self._frozen

    def evaluate(self, game_state: GameState,
                 convergence_score: float,
                 deviation_confidence: float) -> bool:
        """
        评估是否需要冻结

        Returns:
            True 如果刚刚触发了冻结
        """
        if self._frozen:
            return False

        if convergence_score < self.freeze_threshold:
            self._divergent_rounds += 1
        else:
            self._divergent_rounds = max(0, self._divergent_rounds - 1)

        if self._divergent_rounds >= self.max_divergent_rounds:
            self.freeze(game_state, convergence_score, deviation_confidence)
            return True

        if game_state == GameState.ARBITRATING and deviation_confidence > 0.9:
            self.freeze(game_state, convergence_score, deviation_confidence)
            return True

        return False

    def freeze(self, game_state: GameState,
               convergence_score: float,
               deviation_confidence: float) -> None:
        """执行冻结"""
        self._frozen = True
        self._frozen_snapshot = {
            "timestamp": _now_iso(),
            "game_state": game_state.value,
            "convergence_score": convergence_score,
            "deviation_confidence": deviation_confidence,
            "divergent_rounds": self._divergent_rounds,
        }
        self._freeze_reason = (
            f"博弈无法收敛: 连续{self._divergent_rounds}轮偏离, "
            f"收敛得分={convergence_score:.4f}, "
            f"偏离置信度={deviation_confidence:.4f}"
        )

    def unfreeze(self) -> bool:
        """解除冻结 (需外部确认)"""
        if not self._frozen:
            return False
        self._frozen = False
        self._divergent_rounds = 0
        self._frozen_snapshot = None
        self._freeze_reason = ""
        return True

    def validate_action(self, action: str) -> bool:
        """验证操作在冻结状态下是否允许"""
        if not self._frozen:
            return True
        return action in self.ALLOWED_ACTIONS

    def get_freeze_report(self) -> dict:
        return {
            "is_frozen": self._frozen,
            "reason": self._freeze_reason,
            "snapshot": self._frozen_snapshot,
            "allowed_actions": list(self.ALLOWED_ACTIONS),
        }


# ═══════════════════════════════════════════════════════════════════
# 对抗治理总控 (编排器)
# ═══════════════════════════════════════════════════════════════════


class AdversarialGovernance:
    """对抗性协作制衡总控

    统一编排 Builder-Watcher 博弈全流程：
      1. 角色分配与轮换
      2. Builder 产出创新
      3. Watcher 检测偏离
      4. 博弈引擎对冲迭代
      5. 必要时仲裁 / 冻结
    """

    def __init__(
        self,
        rotation_interval: int = 5,
        game_learning_rate: float = 0.01,
        game_max_iterations: int = 100,
        safe_mode_threshold: float = 0.3,
        precedent_store_path: Optional[str] = None,
    ):
        self.detector = DeviationDetector()
        self.precedent_store = PrecedentStore(storage_path=precedent_store_path)
        self.game_engine = AdversarialGameEngine(
            learning_rate=game_learning_rate,
            max_iterations=game_max_iterations,
        )
        self.rotation_manager = RoleRotationManager(
            rotation_interval=rotation_interval)
        self.arbitration = ArbitrationSystem(
            precedent_store=self.precedent_store)
        self.safe_mode = AdversarialSafeMode(
            freeze_threshold=safe_mode_threshold)

        self._round_history: list[GameRound] = []
        self._round_number = 0

    def process_round(
        self,
        content: str,
        current_scores: InvariantScores,
        builder_direction: np.ndarray,
        domain_boundaries: Optional[list[str]] = None,
    ) -> GameRound:
        """执行单轮完整博弈流程"""
        self._round_number += 1

        need_rotation = self.rotation_manager.increment_round()
        if need_rotation:
            self.game_engine.reset()

        innovation = self._builder_produce(content, current_scores)

        deviation = self.detector.detect_all(
            content=content,
            previous_scores=current_scores,
            precedent_store=self.precedent_store,
            domain_boundaries=domain_boundaries,
        )

        state = self._determine_state(deviation)

        convergence = 0.0
        iterations = 0

        if deviation.is_malignant:
            state = GameState.DEBATING
            convergence, iterations = self._run_game_iterations(
                current_scores, builder_direction, deviation)

            if convergence > self.game_engine.convergence_epsilon * 10:
                state = GameState.CONVERGED
            elif convergence < self.safe_mode.freeze_threshold:
                self.safe_mode.evaluate(
                    state, convergence, deviation.confidence)
                if self.safe_mode.is_frozen:
                    state = GameState.FROZEN
            else:
                result = self.arbitration.arbitrate(
                    innovation, deviation, self.game_engine)
                if result.human_required:
                    state = GameState.HUMAN_ESCALATED
                else:
                    state = GameState.CONVERGED

        game_round = GameRound(
            round_number=self._round_number,
            builder_role_agent=self.rotation_manager.current_builder,
            watcher_role_agent=self.rotation_manager.current_watcher,
            builder_output=innovation,
            watcher_output=deviation,
            game_state=state,
            convergence_score=round(convergence, 6),
            iterations=iterations,
            timestamp=_now_iso(),
        )

        self._round_history.append(game_round)
        return game_round

    def _builder_produce(
        self, content: str, current_scores: InvariantScores
    ) -> InnovationReport:
        words = content.split()
        total_words = len(words)

        boundary_probes: list[str] = []
        paradigm_extensions: list[str] = []

        novelty = min(1.0, len(set(words)) / max(total_words, 1))
        density = min(1.0, total_words / 500.0)
        structure = current_scores.composite if current_scores else 0.5

        innovation_score = 0.3 * novelty + 0.25 * density + 0.25 * structure + 0.2

        unique_ratio = len(set(words)) / max(total_words, 1)
        if unique_ratio > 0.8:
            boundary_probes.append("高词汇多样性 — 边界创新试探")
        if total_words > 200:
            paradigm_extensions.append("长文本范式拓展 — 深度认知涌现")

        risk = "low"
        if innovation_score > 0.8:
            risk = "medium"
        if innovation_score > 0.95:
            risk = "high"

        return InnovationReport(
            report_id=_generate_id("INNOVATION"),
            timestamp=_now_iso(),
            innovation_score=round(min(innovation_score, 1.0), 4),
            novelty_metrics={
                "lexical_novelty": round(novelty, 4),
                "content_density": round(density, 4),
                "structural_quality": round(structure, 4),
            },
            boundary_probes=boundary_probes,
            paradigm_extensions=paradigm_extensions,
            risk_assessment=risk,
        )

    def _determine_state(self, deviation: DeviationReport) -> GameState:
        if self.safe_mode.is_frozen:
            return GameState.FROZEN
        if deviation.is_malignant:
            return GameState.WATCHER_REVIEW
        return GameState.BUILDER_ACTIVE

    def _run_game_iterations(
        self,
        current_scores: InvariantScores,
        builder_direction: np.ndarray,
        deviation: DeviationReport,
    ) -> tuple[float, int]:
        """运行博弈迭代，返回 (convergence_score, iterations)"""
        total_confidence = sum(e.confidence for e in deviation.evidence)
        watcher_score = min(1.0, total_confidence / max(len(deviation.evidence), 1))

        iteration_result = self.game_engine.run_iteration(
            current_state=current_scores,
            builder_direction=builder_direction,
            watcher_deviation_score=watcher_score,
            deviation_report=deviation,
        )

        if iteration_result["is_converged"]:
            return iteration_result["delta_norm"], 1

        for i in range(self.game_engine.max_iterations - 1):
            if iteration_result["is_converged"]:
                return iteration_result["delta_norm"], i + 1

            if iteration_result["delta_norm"] > 0.5:
                self.game_engine.adjust_weights(0.1)

        return iteration_result["delta_norm"], self.game_engine.max_iterations

    def get_session_report(self) -> dict:
        """生成会话报告"""
        rounds = self._round_history
        if not rounds:
            return {"status": "no_rounds"}

        innovations = [r.builder_output.innovation_score for r in rounds]
        deviations = [r.watcher_output.confidence for r in rounds]
        states = [r.game_state.value for r in rounds]
        converged = sum(1 for r in rounds if r.game_state == GameState.CONVERGED)
        frozen_count = sum(1 for r in rounds if r.game_state == GameState.FROZEN)
        escalated = sum(1 for r in rounds if r.game_state == GameState.HUMAN_ESCALATED)

        return {
            "total_rounds": len(rounds),
            "avg_innovation": round(np.mean(innovations), 4),
            "avg_deviation_confidence": round(np.mean(deviations), 4),
            "convergence_rate": round(converged / len(rounds), 4),
            "frozen_events": frozen_count,
            "human_escalations": escalated,
            "rotation_stats": self.rotation_manager.get_rotation_stats(),
            "game_steady_state": self.game_engine.get_steady_state_metrics(),
            "precedent_stats": self.precedent_store.stats(),
            "safe_mode_status": self.safe_mode.get_freeze_report(),
            "state_distribution": dict(Counter(states)),
        }

    def reset_session(self) -> None:
        """重置会话 (用于实验重置)"""
        self._round_history.clear()
        self._round_number = 0
        self.game_engine.reset()
        self.safe_mode.unfreeze()


# ═══════════════════════════════════════════════════════════════════
# 辅助函数
# ═══════════════════════════════════════════════════════════════════


def _generate_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _content_signature(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _signature_similarity(sig1: str, sig2: str) -> float:
    if sig1 == sig2:
        return 1.0
    matches = sum(1 for a, b in zip(sig1, sig2) if a == b)
    return matches / max(len(sig1), len(sig2), 1)
