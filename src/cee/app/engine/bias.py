"""
认知偏差检测器 — 推理过程中的认知偏差识别与修正

提供:
  - 确认偏差 (Confirmation Bias) 检测
  - 锚定效应 (Anchoring Effect) 检测
  - 可用性启发式 (Availability Heuristic) 检测
  - 过度自信 (Overconfidence) 检测
  - 框架效应 (Framing Effect) 检测
  - 从众效应 (Bandwagon Effect) 检测
  - 偏差报告生成与修正建议
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Optional, Union


# ============================================================
# Data Classes & Enums
# ============================================================

class BiasType(Enum):
    CONFIRMATION = ("confirmation", "确认偏差", "倾向于搜索或解释支持已有信念的信息")
    ANCHORING = ("anchoring", "锚定效应", "过度依赖第一个获得的信息进行决策")
    AVAILABILITY = ("availability", "可用性启发式", "基于容易想起的案例判断概率")
    OVERCONFIDENCE = ("overconfidence", "过度自信", "高估自己的知识准确性和判断力")
    FRAMING = ("framing", "框架效应", "决策受问题呈现方式而非实质影响")
    BANDWAGON = ("bandwagon", "从众效应", "因多数人持某种观点而采纳该观点")
    SURVIVORSHIP = ("survivorship", "幸存者偏差", "只关注成功案例而忽略失败案例")
    HALO = ("halo", "光环效应", "对某方面正面印象扩展到其他方面")
    DUNNING_KRUGER = ("dunning_kruger", "达克效应", "能力不足者高估自己、能力强的人低估自己")

    def __init__(
        self,
        value: str,
        cn_name: str,
        description: str,
    ) -> None:
        self._value_ = value
        self.cn_name = cn_name
        self.description = description


class BiasSeverity(Enum):
    NONE = (0, "无")
    MILD = (1, "轻微")
    MODERATE = (2, "中度")
    SIGNIFICANT = (3, "显著")
    SEVERE = (4, "严重")

    def __init__(
        self, level: int, label: str
    ) -> None:
        self._value_ = level
        self.label = label


@dataclass
class BiasItem:
    bias_type: BiasType
    severity: BiasSeverity
    confidence: float
    trigger_phrases: list[str] = field(default_factory=list)
    explanation: str = ""
    context: str = ""


@dataclass
class CorrectionAdvice:
    bias_type: BiasType
    advice: str = ""
    exercises: list[str] = field(default_factory=list)
    references: list[str] = field(default_factory=list)


@dataclass
class BiasReport:
    text_analyzed: str = ""
    biases_detected: list[BiasItem] = field(default_factory=list)
    overall_score: float = 1.0
    corrections: list[CorrectionAdvice] = field(default_factory=list)
    summary: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


# ============================================================
# Bias Detectors
# ============================================================

class _ConfirmationBiasDetector:
    """确认偏差检测器。

    检测文本中是否存在选择性证据搜索的模式：
    - 大量使用 "obviously", "clearly", "undoubtedly" 等确定性词汇
    - 缺乏对反方观点的引用
    - 选择性引用支持证据
    """

    _CERTAINTY_PATTERNS = [
        re.compile(rf"\\b{p}\\b", re.IGNORECASE)
        for p in [
            "obviously", "clearly", "undoubtedly", "certainly",
            "without doubt", "no question", "definitely",
            "显而易见", "显然", "毫无疑问", "肯定", "绝对",
            "必然", "毋庸置疑", "众所周知", "不言而喻",
        ]
    ]

    _COUNTER_PATTERNS = [
        re.compile(rf"\\b{p}\\b", re.IGNORECASE)
        for p in [
            "however", "although", "on the other hand",
            "alternatively", "conversely", "by contrast",
            "然而", "另一方面", "不过", "尽管如此",
            "值得商榷", "不同观点", "反对意见",
        ]
    ]

    def detect(self, text: str) -> Optional[BiasItem]:
        certainty_count = sum(
            len(p.findall(text)) for p in self._CERTAINTY_PATTERNS
        )
        counter_count = sum(
            len(p.findall(text)) for p in self._COUNTER_PATTERNS
        )

        if certainty_count == 0:
            return None

        ratio = counter_count / max(certainty_count, 1)
        severity = self._assess_severity(certainty_count, ratio)

        if severity == BiasSeverity.NONE:
            return None

        confidence = min(
            0.3 + certainty_count * 0.1 + (1 - ratio) * 0.3, 0.95
        )

        triggers: list[str] = []
        for p in self._CERTAINTY_PATTERNS:
            found = p.findall(text)
            triggers.extend(found[:3])

        return BiasItem(
            bias_type=BiasType.CONFIRMATION,
            severity=severity,
            confidence=round(confidence, 4),
            trigger_phrases=triggers[:5],
            explanation=(
                f"Detected {certainty_count} high-certainty phrases "
                f"(avg {certainty_count / max(len(text.split()), 1) * 1000:.1f} "
                f"per 1000 words) with only {counter_count} counter-arguments, "
                f"ratio={ratio:.2f}"
            ),
        )

    def _assess_severity(
        self, certainty: int, ratio: float
    ) -> BiasSeverity:
        if certainty <= 1:
            return BiasSeverity.NONE
        if ratio >= 0.5:
            return BiasSeverity.MILD
        if certainty <= 3:
            return BiasSeverity.MODERATE
        if certainty <= 6:
            return BiasSeverity.SIGNIFICANT
        return BiasSeverity.SEVERE


class _AnchoringBiasDetector:
    """锚定效应检测器。

    检测过度依赖首个数据/数值的模式：
    - 反复引用第一个数字/估计值
    - 后续调整幅度过小
    - "around", "approximately" 等词汇围绕初始值
    """

    _NUMBER_PATTERN = re.compile(
        r"(\d+(?:[.,]\d+)?)\s*(?:%|percent|dollars?|yuan|years?|times)",
        re.IGNORECASE,
    )

    _ANCHOR_PATTERNS = [
        re.compile(rf"\\b{p}\\b", re.IGNORECASE)
        for p in [
            "starting point", "baseline", "initial value",
            "reference", "around", "approximately", "roughly",
            "初始值", "基准", "参考", "大约", "大概", "左右",
        ]
    ]

    def detect(self, text: str) -> Optional[BiasItem]:
        numbers = self._NUMBER_PATTERN.findall(text)
        if len(numbers) < 2:
            return None

        numeric_values = [
            float(n.replace(",", ""))
            for n in numbers
        ]
        if len(numeric_values) < 2:
            return None

        deviations = [
            abs(v - numeric_values[0]) / max(abs(numeric_values[0]), 1)
            for v in numeric_values[1:]
        ]
        avg_deviation = (
            sum(deviations) / len(deviations)
            if deviations
            else 1.0
        )

        anchor_phrases = sum(
            len(p.findall(text)) for p in self._ANCHOR_PATTERNS
        )

        severity = self._assess_severity(avg_deviation, anchor_phrases)
        if severity == BiasSeverity.NONE:
            return None

        return BiasItem(
            bias_type=BiasType.ANCHORING,
            severity=severity,
            confidence=round(
                0.3 + (1 - min(avg_deviation, 1)) * 0.5
                + anchor_phrases * 0.1,
                4,
            ),
            trigger_phrases=[f"first_value={numeric_values[0]}"]
            + [
                m.group(0)
                for p in self._ANCHOR_PATTERNS
                for m in p.finditer(text)
            ][:4],
            explanation=(
                f"Values cluster around anchor {numeric_values[0]}, "
                f"avg deviation={avg_deviation:.2%}, "
                f"{anchor_phrases} anchoring phrases"
            ),
        )

    def _assess_severity(
        self, deviation: float, anchor_count: int
    ) -> BiasSeverity:
        if deviation > 0.5:
            return BiasSeverity.NONE
        if deviation > 0.3:
            return BiasSeverity.MILD
        if deviation > 0.15:
            return BiasSeverity.MODERATE
        if anchor_count >= 2:
            return BiasSeverity.SIGNIFICANT
        return BiasSeverity.MODERATE


class _AvailabilityHeuristicDetector:
    """可用性启发式检测器。

    检测基于容易想起的案例判断的模式：
    - 使用 vivid/striking/memorable 等感性词
    - 引用近期/高频曝光事件
    - "recently", "just saw", "everyone knows" 等
    """

    _VIVID_PATTERNS = [
        re.compile(rf"\\b{p}\\b", re.IGNORECASE)
        for p in [
            "shocking", "dramatic", "striking", "memorable",
            "famous", "well-known", "recently", "just happened",
            "everyone knows", "you always hear about",
            "令人震惊", "印象深刻", "最近", "众所周知",
            "轰动", "广为流传", "常见", "屡见不鲜",
        ]
    ]

    _EMOTION_PATTERNS = [
        re.compile(rf"\\b{p}\\b", re.IGNORECASE)
        for p in [
            "fear", "anxiety", "worry", "panic",
            "excitement", "thrill",
            "恐惧", "担心", "害怕", "兴奋",
        ]
    ]

    def detect(self, text: str) -> Optional[BiasItem]:
        vivid_count = sum(
            len(p.findall(text)) for p in self._VIVID_PATTERNS
        )
        emotion_count = sum(
            len(p.findall(text)) for p in self._EMOTION_PATTERNS
        )

        total = vivid_count + emotion_count
        if total == 0:
            return None

        severity = self._assess_severity(total)
        if severity == BiasSeverity.NONE:
            return None

        triggers: list[str] = []
        for p in self._VIVID_PATTERNS + self._EMOTION_PATTERNS:
            for m in p.finditer(text):
                triggers.append(m.group(0))
                if len(triggers) >= 5:
                    break

        return BiasItem(
            bias_type=BiasType.AVAILABILITY,
            severity=severity,
            confidence=round(0.3 + total * 0.15, 4),
            trigger_phrases=triggers[:5],
            explanation=(
                f"{vivid_count} vivid/salient phrases "
                f"+ {emotion_count} emotion-laden terms. "
                f"Rate: {total / max(len(text), 1) * 1000:.1f}/1k chars"
            ),
        )

    def _assess_severity(self, count: int) -> BiasSeverity:
        if count <= 1:
            return BiasSeverity.NONE
        if count <= 2:
            return BiasSeverity.MILD
        if count <= 4:
            return BiasSeverity.MODERATE
        if count <= 7:
            return BiasSeverity.SIGNIFICANT
        return BiasSeverity.SEVERE


class _OverconfidenceDetector:
    """过度自信检测器。

    检测过度肯定的判断语调和精确预测：
    - "will definitely", "100% sure" 等
    - 过于精确的预测（三个以上有效数字）
    - 缺乏概率表达
    """

    _OVERPATTERNS = [
        re.compile(rf"\\b{p}\\b", re.IGNORECASE)
        for p in [
            "definitely will", "100%", "without a doubt",
            "guaranteed", "certain", "sure", "absolute",
            "perfectly", "exactly",
            "肯定", "100%", "绝对", "保证",
            "毫无疑问", "毋庸置疑", "必然",
        ]
    ]

    _PROBABILITY_PATTERNS = [
        re.compile(rf"\\b{p}\\b", re.IGNORECASE)
        for p in [
            "likely", "probably", "possibly", "perhaps",
            "maybe", "might", "could be", "chance",
            "可能", "或许", "也许", "概率", "几率",
            "大概", "应该", "不一定",
        ]
    ]

    _PRECISE_PATTERN = re.compile(
        r"\b\d{3,}\.\d{2,}\b"
    )

    def detect(self, text: str) -> Optional[BiasItem]:
        over_count = sum(
            len(p.findall(text)) for p in self._OVERPATTERNS
        )
        prob_count = sum(
            len(p.findall(text)) for p in self._PROBABILITY_PATTERNS
        )
        precise = len(self._PRECISE_PATTERN.findall(text))

        if over_count == 0 and precise == 0:
            return None

        ratio = prob_count / max(over_count, 1)
        severity = self._assess_severity(
            over_count, ratio, precise
        )
        if severity == BiasSeverity.NONE:
            return None

        return BiasItem(
            bias_type=BiasType.OVERCONFIDENCE,
            severity=severity,
            confidence=round(
                0.3
                + over_count * 0.1
                + precise * 0.1
                + (1 - min(ratio, 1)) * 0.2,
                4,
            ),
            trigger_phrases=(
                [f"{precise} overly-precise numbers"]
                if precise
                else []
            )
            + [
                m.group(0)
                for p in self._OVERPATTERNS
                for m in p.finditer(text)
            ][:4],
            explanation=(
                f"{over_count} absolute-certainty expressions, "
                f"only {prob_count} probabilistic hedges "
                f"(ratio={ratio:.2f}), "
                f"{precise} overly-precise predictions"
            ),
        )

    def _assess_severity(
        self,
        over_cnt: int,
        prob_ratio: float,
        precise: int,
    ) -> BiasSeverity:
        score = over_cnt + precise * 2
        if score <= 0:
            return BiasSeverity.NONE
        if prob_ratio >= 1.0:
            return BiasSeverity.MILD
        if score <= 2:
            return BiasSeverity.MODERATE
        if score <= 5:
            return BiasSeverity.SIGNIFICANT
        return BiasSeverity.SEVERE


class _FramingEffectDetector:
    """框架效应检测器。

    检测问题表述方式影响判断的模式：
    - 正框架: "80% success" vs 负框架: "20% failure"
    - 损失 vs 收益表述
    - 绝对值 vs 相对值
    """

    _POSITIVE_FRAMING = [
        re.compile(rf"\\b{p}\\b", re.IGNORECASE)
        for p in [
            r"\d+% success", r"\d+% effective",
            r"\d+% positive", r"\d+% gain",
            r"\d+% survival",
        ]
    ]
    _NEGATIVE_FRAMING = [
        re.compile(rf"\\b{p}\\b", re.IGNORECASE)
        for p in [
            r"\d+% failure", r"\d+% ineffective",
            r"\d+% negative", r"\d+% loss",
            r"\d+% mortality",
        ]
    ]

    _ABSOLUTE_PATTERNS = re.compile(
        r"\b(absolute|total|overall|全网|总计|全部)\b",
        re.IGNORECASE,
    )
    _RELATIVE_PATTERNS = re.compile(
        r"\b(relative|compared to|vs\.?|相对|相比|较)\b",
        re.IGNORECASE,
    )

    def detect(self, text: str) -> Optional[BiasItem]:
        pos_count = sum(
            len(p.findall(text)) for p in self._POSITIVE_FRAMING
        )
        neg_count = sum(
            len(p.findall(text)) for p in self._NEGATIVE_FRAMING
        )
        abs_count = len(self._ABSOLUTE_PATTERNS.findall(text))
        rel_count = len(self._RELATIVE_PATTERNS.findall(text))

        framing_bias = abs(pos_count - neg_count) > 2
        stat_bias = (
            abs(abs_count - rel_count) >= 3
            and (abs_count + rel_count) > 3
        )

        if not framing_bias and not stat_bias:
            return None

        dominant = "positive" if pos_count > neg_count else "negative"
        stat_mode = "absolute" if abs_count > rel_count else "relative"

        severity = BiasSeverity.SIGNIFICANT if framing_bias and stat_bias else BiasSeverity.MODERATE

        return BiasItem(
            bias_type=BiasType.FRAMING,
            severity=severity,
            confidence=round(
                0.3
                + (abs(pos_count - neg_count) * 0.1)
                + (abs(abs_count - rel_count) * 0.1),
                4,
            ),
            trigger_phrases=[
                f"Pos frame: {pos_count}",
                f"Neg frame: {neg_count}",
                f"Abs terms: {abs_count}",
                f"Rel terms: {rel_count}",
            ],
            explanation=(
                f"Imbalanced framing detected: predominantly "
                f"{dominant} framing (pos={pos_count}, neg={neg_count}) "
                f"and {stat_mode} statistics "
                f"(abs={abs_count}, rel={rel_count})"
            ),
        )


class _BandwagonEffectDetector:
    """从众效应检测器。

    检测依赖多数意见而非独立推理的模式：
    - "everyone agrees", "most people think"
    - 引用 popularity / consensus 作为论据
    - "trending", "mainstream" 等
    """

    _BANDWAGON_PATTERNS = [
        re.compile(rf"\\b{p}\\b", re.IGNORECASE)
        for p in [
            "everyone", "most people", "majority",
            "consensus", "popular", "trending",
            "mainstream", "widely accepted", "common sense",
            "大家都", "大多数人", "主流观点", "普遍认为",
            "公认", "多数意见", "社会共识", "流行",
        ]
    ]

    def detect(self, text: str) -> Optional[BiasItem]:
        count = sum(
            len(p.findall(text)) for p in self._BANDWAGON_PATTERNS
        )
        if count == 0:
            return None

        severity = self._assess_severity(count)
        return BiasItem(
            bias_type=BiasType.BANDWAGON,
            severity=severity,
            confidence=round(0.3 + count * 0.1, 4),
            trigger_phrases=[
                m.group(0)
                for p in self._BANDWAGON_PATTERNS
                for m in p.finditer(text)
            ][:5],
            explanation=(
                f"{count} bandwagon/consensus phrases indicate "
                f"reliance on majority opinion over independent analysis"
            ),
        )

    def _assess_severity(self, count: int) -> BiasSeverity:
        if count <= 1:
            return BiasSeverity.MILD
        if count <= 2:
            return BiasSeverity.MODERATE
        if count <= 4:
            return BiasSeverity.SIGNIFICANT
        return BiasSeverity.SEVERE


# ============================================================
# Correction Advice Generator
# ============================================================

class _CorrectionAdviceGenerator:
    """修正建议生成器。"""

    _ADVICE_MAP: dict[BiasType, CorrectionAdvice] = {
        BiasType.CONFIRMATION: CorrectionAdvice(
            bias_type=BiasType.CONFIRMATION,
            advice=(
                "Actively seek disconfirming evidence. Ask: 'What would "
                "prove me wrong?' List counter-arguments before evaluating."
            ),
            exercises=[
                "Steel-man the opposing view: argue for it as strongly as possible",
                "Pre-commit to what evidence would change your mind",
                "Seek out sources known to disagree with your position",
            ],
            references=[
                "Nickerson (1998) Confirmation bias: A ubiquitous phenomenon",
                "Devil's Advocate technique in group decision making",
            ],
        ),
        BiasType.ANCHORING: CorrectionAdvice(
            bias_type=BiasType.ANCHORING,
            advice=(
                "Consider multiple reference points. Start from scratch: "
                "'If I knew nothing about the first number, what would I estimate?'"
            ),
            exercises=[
                "Generate at least 3 independent estimates before comparing",
                "Ask others for their estimates before sharing yours",
                "Use range estimation rather than point estimates",
            ],
            references=[
                "Tversky & Kahneman (1974) Judgment under uncertainty",
            ],
        ),
        BiasType.AVAILABILITY: CorrectionAdvice(
            bias_type=BiasType.AVAILABILITY,
            advice=(
                "Consult base rates and statistical data rather than vivid examples. "
                "Ask: 'Is this representative or just memorable?'"
            ),
            exercises=[
                "Look up actual statistics before drawing conclusions",
                "Consider what cases you might NOT be hearing about",
                "Track predictions against outcomes over time",
            ],
            references=[
                "Tversky & Kahneman (1973) Availability heuristic",
            ],
        ),
        BiasType.OVERCONFIDENCE: CorrectionAdvice(
            bias_type=BiasType.OVERCONFIDENCE,
            advice=(
                "Calibrate confidence levels. Use probabilistic language: "
                "'I am 70% confident' instead of 'definitely'. "
                "Maintain a decision journal to track accuracy."
            ),
            exercises=[
                "Assign confidence levels to all predictions (60%, 80%, etc.)",
                "Keep a decision log and review accuracy weekly",
                "Practice generating confidence intervals for estimates",
            ],
            references=[
                "Lichtenstein & Fischhoff (1977) Calibration of probabilities",
            ],
        ),
        BiasType.FRAMING: CorrectionAdvice(
            bias_type=BiasType.FRAMING,
            advice=(
                "Reframe the same information in both positive and negative terms. "
                "Consider both absolute and relative statistics."
            ),
            exercises=[
                "Restate the problem using opposite framing (gain → loss)",
                "Convert all statistics to a common baseline before comparing",
                "Ask: 'Would my decision change if this were framed differently?'",
            ],
            references=[
                "Tversky & Kahneman (1981) The framing of decisions",
            ],
        ),
        BiasType.BANDWAGON: CorrectionAdvice(
            bias_type=BiasType.BANDWAGON,
            advice=(
                "Evaluate claims on their merits, not their popularity. "
                "History shows consensus has often been wrong."
            ),
            exercises=[
                "List reasons to believe/disbelieve without referencing others' opinions",
                "Research historical cases where the majority was wrong",
                "Practice forming opinions before seeing others' views",
            ],
            references=[
                "Asch (1951) Conformity experiments",
            ],
        ),
    }

    @classmethod
    def generate(
        cls, biases: list[BiasItem]
    ) -> list[CorrectionAdvice]:
        advice_list: list[CorrectionAdvice] = []
        seen: set[BiasType] = set()
        for item in biases:
            if item.bias_type not in seen:
                advice = cls._ADVICE_MAP.get(item.bias_type)
                if advice:
                    advice_list.append(advice)
                    seen.add(item.bias_type)
        return advice_list


# ============================================================
# Bias Detector (Main Class)
# ============================================================

class BiasDetector:
    """认知偏差检测器主类。

    自动扫描文本中的多种认知偏差模式，
    生成检测报告并提供修正建议。

    Usage:
        detector = BiasDetector()
        report = detector.detect("Obviously AI will definitely take all jobs...")
        for item in report.biases_detected:
            print(f"  {item.bias_type.cn_name}: {item.severity.label}")
        for advice in report.corrections:
            print(f"  Fix: {advice.advice}")
    """

    def __init__(self) -> None:
        self._detectors: dict[BiasType, Any] = {
            BiasType.CONFIRMATION: _ConfirmationBiasDetector(),
            BiasType.ANCHORING: _AnchoringBiasDetector(),
            BiasType.AVAILABILITY: _AvailabilityHeuristicDetector(),
            BiasType.OVERCONFIDENCE: _OverconfidenceDetector(),
            BiasType.FRAMING: _FramingEffectDetector(),
            BiasType.BANDWAGON: _BandwagonEffectDetector(),
        }

    # ----- Public API -----

    def detect(self, text: str) -> BiasReport:
        """检测文本中的所有认知偏差。

        Args:
            text: 要分析的文本。

        Returns:
            BiasReport 包含检测结果和修正建议。
        """
        report = BiasReport(text_analyzed=text)

        for bias_type, detector in self._detectors.items():
            result = detector.detect(text)
            if result:
                report.biases_detected.append(result)

        report.biases_detected.sort(
            key=lambda b: (b.severity.value, b.confidence),
            reverse=True,
        )

        report.corrections = _CorrectionAdviceGenerator.generate(
            report.biases_detected
        )

        report.overall_score = self._compute_overall_score(report)
        report.summary = self._generate_summary(report)

        return report

    def detect_single(
        self, text: str, bias_type: BiasType
    ) -> Optional[BiasItem]:
        """检测单一类型的偏差。"""
        detector = self._detectors.get(bias_type)
        if detector is None:
            return None
        return detector.detect(text)

    def format_report(self, report: BiasReport) -> str:
        """格式化偏差报告为可读文本。"""
        lines = [
            "# Cognitive Bias Detection Report",
            f"Overall Score: {report.overall_score:.2f} "
            f"(lower = more bias)",
            f"Detected {len(report.biases_detected)} bias(es)",
            "",
        ]

        if report.biases_detected:
            lines.append("## Detected Biases")
            for item in report.biases_detected:
                lines.append(
                    f"### {item.bias_type.cn_name} "
                    f"({item.bias_type.value})"
                )
                lines.append(
                    f"Severity: {item.severity.label} | "
                    f"Confidence: {item.confidence:.2%}"
                )
                lines.append(f"Description: {item.bias_type.description}")
                if item.trigger_phrases:
                    lines.append(
                        "Triggers: "
                        + ", ".join(
                            f'"{p}"' for p in item.trigger_phrases
                        )
                    )
                lines.append(f"Details: {item.explanation}")
                lines.append("")

        if report.corrections:
            lines.append("## Correction Advice")
            for ca in report.corrections:
                lines.append(
                    f"### {ca.bias_type.cn_name}"
                )
                lines.append(f"Advice: {ca.advice}")
                if ca.exercises:
                    lines.append("Exercises:")
                    for ex in ca.exercises:
                        lines.append(f"  - {ex}")
                lines.append("")

        return "\n".join(lines)

    # ----- Internal Methods -----

    def _compute_overall_score(
        self, report: BiasReport
    ) -> float:
        if not report.biases_detected:
            return 1.0
        severity_scores = {
            BiasSeverity.NONE: 0.0,
            BiasSeverity.MILD: 0.2,
            BiasSeverity.MODERATE: 0.4,
            BiasSeverity.SIGNIFICANT: 0.6,
            BiasSeverity.SEVERE: 0.8,
        }
        penalties = sum(
            severity_scores.get(b.severity, 0.0)
            * b.confidence
            for b in report.biases_detected
        )
        max_penalty = len(report.biases_detected) * 0.8
        normalized = (
            penalties / max(max_penalty, 1)
        )
        return round(max(0.0, 1.0 - normalized), 4)

    def _generate_summary(self, report: BiasReport) -> str:
        if not report.biases_detected:
            return "No significant cognitive biases detected."

        top = report.biases_detected[0]
        return (
            f"Found {len(report.biases_detected)} cognitive bias(es). "
            f"Most prominent: {top.bias_type.cn_name} "
            f"({top.severity.label}, confidence={top.confidence:.2%}). "
            f"Overall bias score: {report.overall_score:.2f}/1.0."
        )
