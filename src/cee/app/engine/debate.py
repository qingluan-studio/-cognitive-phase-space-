"""
辩论引擎 — 多角色辩证推理与观点碰撞

提供结构化的辩论框架，支持:
  - 多角色辩论: 正反方交替发言，支持多轮
  - 论证质量评估: 逻辑有效性、证据支持度、反驳力度
  - 立场检测: 自动识别文本的隐含立场
  - 辩证综合: 从正反观点中提取共识和高阶认知
  - 苏格拉底式追问: 基于反诘的深度推理引导
  - 辩论回合管理: 时间/轮次/字数控制
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


class Stance(Enum):
    PRO = "pro"
    CON = "con"
    NEUTRAL = "neutral"
    UNDECIDED = "undecided"


class ArgumentType(Enum):
    FACTUAL = "factual"
    LOGICAL = "logical"
    EMOTIONAL = "emotional"
    ANALOGICAL = "analogical"
    AUTHORITATIVE = "authoritative"
    COUNTERFACTUAL = "counterfactual"


class ArgumentQuality(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    WEAK = "weak"
    FALLACIOUS = "fallacious"


FALLACY_PATTERNS: dict[str, str] = {
    "straw_man": "曲解对方观点",
    "ad_hominem": "人身攻击",
    "false_dichotomy": "虚假二分",
    "slippery_slope": "滑坡谬误",
    "appeal_to_authority": "诉诸权威",
    "bandwagon": "从众谬误",
    "circular_reasoning": "循环论证",
    "hasty_generalization": "仓促概括",
    "red_herring": "转移话题",
    "appeal_to_emotion": "诉诸情感",
}

LOGICAL_CONNECTORS: dict[str, float] = {
    "因此": 1.0, "所以": 1.0, "因为": 1.0, "由于": 0.8,
    "如果": 0.6, "那么": 0.6, "则": 0.5, "从而": 0.8,
    "由此": 0.8, "导致": 0.7, "必然": 0.9, "显然": 0.4,
    "because": 1.0, "therefore": 1.0, "since": 0.8,
    "thus": 0.9, "hence": 0.9, "consequently": 0.9,
}

EVIDENCE_MARKERS: dict[str, float] = {
    "研究表明": 0.8, "数据显示": 0.8, "根据": 0.7, "证据表明": 0.9,
    "实验": 0.6, "统计": 0.7, "论文": 0.6, "报告": 0.5,
    "research": 0.8, "study": 0.7, "data": 0.7, "evidence": 0.9,
    "experiment": 0.6, "according to": 0.7, "published": 0.6,
}

EMOTIONAL_MARKERS: dict[str, float] = {
    "可怕": 0.8, "令人震惊": 0.9, "悲剧": 0.7, "不可思议": 0.6,
    "令人发指": 0.9, "荒谬": 0.7, "灾难": 0.8, "希望": 0.3,
    "horrific": 0.9, "outrageous": 0.8, "devastating": 0.8,
    "incredible": 0.5, "unbelievable": 0.6,
}


@dataclass
class DebateArgument:
    text: str
    stance: Stance
    arg_type: ArgumentType
    quality: ArgumentQuality
    fallacies: list[str] = field(default_factory=list)
    evidence_score: float = 0.0
    logic_score: float = 0.0
    emotional_load: float = 0.0
    refutation_power: float = 0.0
    novelty: float = 0.5
    round_number: int = 0


@dataclass
class DebateResult:
    topic: str
    rounds: int
    pro_arguments: list[DebateArgument] = field(default_factory=list)
    con_arguments: list[DebateArgument] = field(default_factory=list)
    winner: str = ""
    pro_score: float = 0.0
    con_score: float = 0.0
    synthesis: str = ""
    key_insights: list[str] = field(default_factory=list)
    unresolved_issues: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "topic": self.topic,
            "rounds": self.rounds,
            "pro_count": len(self.pro_arguments),
            "con_count": len(self.con_arguments),
            "winner": self.winner,
            "pro_score": round(self.pro_score, 4),
            "con_score": round(self.con_score, 4),
            "synthesis": self.synthesis,
            "key_insights": self.key_insights,
            "unresolved_issues": self.unresolved_issues,
        }


class ArgumentAnalyzer:
    """论证质量分析器"""

    def analyze(self, text: str) -> DebateArgument:
        arg_type = self._classify_type(text)
        fallacies = self._detect_fallacies(text)
        evidence = self._evidence_score(text)
        logic = self._logic_score(text)
        emotional = self._emotional_load(text)

        base_quality = (evidence + logic) / 2
        fallacy_penalty = len(fallacies) * 0.15

        quality_score = base_quality - fallacy_penalty
        quality = (
            ArgumentQuality.EXCELLENT if quality_score > 0.8 else
            ArgumentQuality.GOOD if quality_score > 0.6 else
            ArgumentQuality.FAIR if quality_score > 0.4 else
            ArgumentQuality.WEAK if quality_score > 0.2 else
            ArgumentQuality.FALLACIOUS
        )

        return DebateArgument(
            text=text,
            stance=Stance.NEUTRAL,
            arg_type=arg_type,
            quality=quality,
            fallacies=fallacies,
            evidence_score=evidence,
            logic_score=logic,
            emotional_load=emotional,
            refutation_power=self._refutation_power(text),
        )

    def _classify_type(self, text: str) -> ArgumentType:
        text_lower = text.lower()

        evidence_count = sum(
            1 for kw in EVIDENCE_MARKERS if kw.lower() in text_lower
        )
        logic_count = sum(
            1 for kw in LOGICAL_CONNECTORS if kw.lower() in text_lower
        )
        emotional_count = sum(
            1 for kw in EMOTIONAL_MARKERS if kw.lower() in text_lower
        )

        if evidence_count >= 2:
            return ArgumentType.FACTUAL
        if logic_count >= 3:
            return ArgumentType.LOGICAL
        if emotional_count >= 2:
            return ArgumentType.EMOTIONAL
        if "就像" in text or "如同" in text or "好比" in text:
            return ArgumentType.ANALOGICAL
        if evidence_count >= 1:
            return ArgumentType.AUTHORITATIVE
        return ArgumentType.LOGICAL

    def _detect_fallacies(self, text: str) -> list[str]:
        found = []
        text_lower = text.lower()

        if any(p in text_lower for p in ["稻草人", "straw man", "strawman"]):
            found.append("straw_man")

        ad_hominem_patterns = ["愚蠢", "无知", "不懂", "你不", "你没", "you don't", "you are"]
        if sum(1 for p in ad_hominem_patterns if p in text_lower) >= 2:
            found.append("ad_hominem")

        if len(re.split(r'[.!?。！？]', text)) < 2 and ("要么" in text or "either" in text):
            found.append("false_dichotomy")

        if "大家都" in text or "每个人都" in text or "everyone" in text:
            found.append("bandwagon")

        words = text_lower.split()
        if len(words) > 50:
            unique_ratio = len(set(words)) / len(words)
            if unique_ratio < 0.35:
                found.append("circular_reasoning")

        if "总是" in text or "从不" in text or "必然" in text:
            found.append("hasty_generalization")

        emotional_count = sum(1 for kw in EMOTIONAL_MARKERS if kw.lower() in text_lower)
        if emotional_count >= 3 and "证据" not in text and "数据" not in text:
            found.append("appeal_to_emotion")

        return found[:3]

    def _evidence_score(self, text: str) -> float:
        text_lower = text.lower()
        score = 0.0
        count = 0
        for kw, weight in EVIDENCE_MARKERS.items():
            if kw.lower() in text_lower:
                score += weight
                count += 1

        if count == 0:
            return 0.2

        has_specific = any(
            p in text_lower for p in [
                r"\d{4}年", r"\d+%", r"\d+人", r"\$\d+", r"\d+次", r"\d+个"
            ]
        )
        if has_specific:
            score += 0.2

        return min(score / max(count, 1), 1.0)

    def _logic_score(self, text: str) -> float:
        text_lower = text.lower()
        score = 0.0
        count = 0
        for kw, weight in LOGICAL_CONNECTORS.items():
            if kw.lower() in text_lower:
                score += weight
                count += 1

        if count == 0:
            return 0.3

        sentences = len(re.split(r'[.!?。！？]', text))
        structure_bonus = min(sentences / 5, 0.3)
        score = min(score / max(count, 1) + structure_bonus, 1.0)

        return score

    def _emotional_load(self, text: str) -> float:
        text_lower = text.lower()
        score = 0.0
        count = 0
        for kw, weight in EMOTIONAL_MARKERS.items():
            if kw.lower() in text_lower:
                score += weight
                count += 1
        return min(score / max(count, 1), 1.0) if count > 0 else 0.1

    def _refutation_power(self, text: str) -> float:
        text_lower = text.lower()
        indicators = [
            "然而", "但是", "不过", "相反", "实际上", "事实上",
            "however", "but", "on the contrary", "in fact",
            "并非", "不是", "不对",
        ]
        count = sum(1 for p in indicators if p in text_lower)
        return min(count / 3.0, 1.0)


class StanceDetector:
    """立场检测器"""

    @staticmethod
    def detect(text: str, topic: str = "") -> Stance:
        text_lower = text.lower()

        pro_indicators = [
            "支持", "赞同", "同意", "应该", "必须", "有利于",
            "好处", "优势", "重要", "必要", "积极作用",
            "support", "agree", "should", "must", "beneficial",
            "advantage", "important", "necessary", "positive",
        ]
        con_indicators = [
            "反对", "不同意", "不应该", "有害", "弊端", "劣势",
            "问题", "风险", "危险", "消极", "负面影响",
            "oppose", "disagree", "should not", "harmful",
            "disadvantage", "problem", "risk", "danger", "negative",
        ]

        pro_score = sum(1 for p in pro_indicators if p in text_lower)
        con_score = sum(1 for p in con_indicators if p in text_lower)

        if pro_score > con_score * 1.5:
            return Stance.PRO
        if con_score > pro_score * 1.5:
            return Stance.CON
        if pro_score > 0 or con_score > 0:
            return Stance.NEUTRAL
        return Stance.UNDECIDED


class DebateEngine:
    """辩论引擎"""

    def __init__(self):
        self.analyzer = ArgumentAnalyzer()
        self.stance_detector = StanceDetector()

    def evaluate_argument(self, text: str) -> DebateArgument:
        arg = self.analyzer.analyze(text)
        arg.stance = self.stance_detector.detect(text)
        return arg

    def judge_debate(self, topic: str, arguments: list[str],
                     stances: list[str] | None = None) -> DebateResult:
        if stances is None:
            stances = ["pro", "con"] * ((len(arguments) + 1) // 2)

        result = DebateResult(topic=topic, rounds=max(1, len(arguments)))

        for i, (text, stance_str) in enumerate(zip(arguments, stances)):
            arg = self.analyzer.analyze(text)
            arg.stance = Stance.PRO if stance_str.lower() == "pro" else Stance.CON
            arg.round_number = i + 1

            if arg.stance == Stance.PRO:
                result.pro_arguments.append(arg)
            else:
                result.con_arguments.append(arg)

        result.pro_score = self._calculate_side_score(result.pro_arguments)
        result.con_score = self._calculate_side_score(result.con_arguments)

        if abs(result.pro_score - result.con_score) < 0.05:
            result.winner = "draw"
        elif result.pro_score > result.con_score:
            result.winner = "pro"
        else:
            result.winner = "con"

        result.key_insights = self._extract_insights(result)
        result.unresolved_issues = self._find_unresolved(result)
        result.synthesis = self._generate_synthesis(result)

        return result

    def _calculate_side_score(self, arguments: list[DebateArgument]) -> float:
        if not arguments:
            return 0.0

        scores = []
        for arg in arguments:
            quality_map = {
                ArgumentQuality.EXCELLENT: 1.0, ArgumentQuality.GOOD: 0.8,
                ArgumentQuality.FAIR: 0.5, ArgumentQuality.WEAK: 0.3,
                ArgumentQuality.FALLACIOUS: 0.1,
            }
            base = quality_map[arg.quality]
            evidence_bonus = arg.evidence_score * 0.1
            logic_bonus = arg.logic_score * 0.1
            fallacy_penalty = len(arg.fallacies) * 0.1
            refutation_bonus = arg.refutation_power * 0.1

            scores.append(min(max(base + evidence_bonus + logic_bonus
                                   - fallacy_penalty + refutation_bonus, 0.0), 1.0))

        return float(np.mean(scores))

    def _extract_insights(self, result: DebateResult) -> list[str]:
        insights = []

        all_args = result.pro_arguments + result.con_arguments

        strong_args = [a for a in all_args if a.quality in
                       (ArgumentQuality.EXCELLENT, ArgumentQuality.GOOD)]
        for a in strong_args[:3]:
            summary = a.text[:80]
            insights.append(f"[{a.arg_type.value}] {summary}...")

        if not insights:
            insights.append("双方论证均不够有力")

        return insights

    def _find_unresolved(self, result: DebateResult) -> list[str]:
        issues = []
        if abs(result.pro_score - result.con_score) < 0.1:
            issues.append("正反双方势均力敌，核心争议未充分解决")

        all_args = result.pro_arguments + result.con_arguments
        fallacies_count = sum(len(a.fallacies) for a in all_args)
        if fallacies_count > 0:
            issues.append(f"发现 {fallacies_count} 个逻辑谬误，论证质量有待提升")

        factual = sum(1 for a in all_args if a.arg_type == ArgumentType.FACTUAL)
        if factual < len(all_args) / 3:
            issues.append("事实论据不足，建议增加数据和研究支撑")

        return issues

    def _generate_synthesis(self, result: DebateResult) -> str:
        parts = []

        if result.winner == "draw":
            parts.append("双方论证旗鼓相当，各有合理之处")
        elif result.winner == "pro":
            parts.append(f"正方辩论稍占上风 (得分: {result.pro_score:.2f} vs {result.con_score:.2f})")
        else:
            parts.append(f"反方辩论稍占上风 (得分: {result.con_score:.2f} vs {result.pro_score:.2f})")

        if result.key_insights:
            parts.append(f"关键洞见: {'; '.join(result.key_insights)}")

        if result.unresolved_issues:
            parts.append(f"待解决问题: {'; '.join(result.unresolved_issues)}")

        return "。".join(parts) + "。"

    def socratic_dialogue(self, topic: str, depth: int = 3) -> list[str]:
        """生成苏格拉底式追问链"""
        questions = [
            f"关于'{topic}'，你认为最核心的问题是什么？",
            "这个观点背后的假设是什么？",
            "有没有反例可以反驳这个假设？",
            "如果你站在相反的立场，你会如何论证？",
            "这个概念的定义是否足够清晰？能否更精确？",
            "这个问题在不同条件下是否仍然成立？",
            "你的结论是绝对成立的还是概率性的？",
            "这个推理链条中哪一步最薄弱？",
        ]
        return questions[:depth * 2]

    def cross_examination(self, argument: str, stance: Stance) -> list[dict[str, Any]]:
        """生成交叉质询问题"""
        opposite = Stance.CON if stance == Stance.PRO else Stance.PRO
        questions = []

        arg_analysis = self.analyzer.analyze(argument)

        if arg_analysis.evidence_score < 0.4:
            questions.append({
                "question": "你能提供支持这个观点的具体证据或数据吗？",
                "target": "evidence",
            })

        if arg_analysis.arg_type == ArgumentType.EMOTIONAL:
            questions.append({
                "question": "除了情感诉求，你有哪些逻辑或事实层面的论据？",
                "target": "reasoning",
            })

        if arg_analysis.fallacies:
            for f in arg_analysis.fallacies:
                questions.append({
                    "question": f"你的论证似乎存在'{FALLACY_PATTERNS.get(f, f)}'，能进一步澄清吗？",
                    "target": "fallacy",
                })

        questions.append({
            "question": f"如果你站在{opposite.value}立场，这些论证是否仍然成立？",
            "target": "perspective",
        })

        return questions[:5]

