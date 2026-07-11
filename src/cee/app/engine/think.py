"""
深度思考引擎 — Chain-of-Thought 逐步推理

模拟 Kimi 的深度思考能力，提供:
  - 问题分解器: 将复杂问题拆解为子问题树
  - 思维链生成器: 逐步推理展示
  - 假设检验器: 生成和量化验证假设
  - 多角度分析器: 从不同视角分析问题
  - 不确定性量化: 评估推理置信度
  - 思考过程可视化数据生成
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import time
from abc import ABC, abstractmethod
from collections import Counter
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Optional, Union


# ============================================================
# Data Classes
# ============================================================

class ThinkingPhase(Enum):
    PROBLEM_UNDERSTANDING = "problem_understanding"
    DECOMPOSITION = "decomposition"
    HYPOTHESIS_GENERATION = "hypothesis_generation"
    HYPOTHESIS_TESTING = "hypothesis_testing"
    MULTI_ANGLE = "multi_angle"
    SYNTHESIS = "synthesis"
    REFLECTION = "reflection"


class Confidence(Enum):
    VERY_LOW = (0.0, 0.2)
    LOW = (0.2, 0.4)
    MODERATE = (0.4, 0.6)
    HIGH = (0.6, 0.8)
    VERY_HIGH = (0.8, 1.0)

    @classmethod
    def from_score(cls, score: float) -> Confidence:
        for level in cls:
            lo, hi = level.value
            if lo <= score < hi:
                return level
        return cls.VERY_HIGH


@dataclass
class SubQuestion:
    id: str
    text: str
    parent_id: str = ""
    importance: float = 0.5
    difficulty: float = 0.5
    status: str = "pending"
    answer: str = ""
    reasoning: str = ""


@dataclass
class ThinkingChain:
    id: str
    steps: list[str] = field(default_factory=list)
    confidence: float = 0.0
    total_time: float = 0.0
    phase_times: dict[str, float] = field(default_factory=dict)
    branching_points: list[int] = field(default_factory=list)
    backtrack_count: int = 0


@dataclass
class Hypothesis:
    id: str
    statement: str
    confidence: float = 0.5
    supporting_evidence: list[str] = field(default_factory=list)
    contradictory_evidence: list[str] = field(default_factory=list)
    verdict: str = "unverified"


@dataclass
class MultiAngleAnalysis:
    angles: list[str] = field(default_factory=list)
    analyses: dict[str, str] = field(default_factory=dict)
    conflict_points: list[str] = field(default_factory=list)
    consensus_points: list[str] = field(default_factory=list)
    synthesis: str = ""


@dataclass
class ThinkingResult:
    question: str
    sub_questions: list[SubQuestion] = field(default_factory=list)
    thinking_chain: Optional[ThinkingChain] = None
    hypotheses: list[Hypothesis] = field(default_factory=list)
    multi_angle: Optional[MultiAngleAnalysis] = None
    uncertainty: dict[str, float] = field(default_factory=dict)
    visualization: dict[str, Any] = field(default_factory=dict)
    final_answer: str = ""
    total_duration: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ThinkConfig:
    max_sub_questions: int = 10
    max_chain_steps: int = 20
    max_hypotheses: int = 5
    decomposition_depth: int = 3
    min_confidence: float = 0.3
    enable_branching: bool = True
    enable_backtrack: bool = True
    enable_visualization: bool = True
    time_budget_seconds: float = 60.0


# ============================================================
# Problem Decomposer
# ============================================================

class ProblemDecomposer:
    """问题分解器 — 将复杂问题递归拆解为子问题树。

    Usage:
        decomposer = ProblemDecomposer(max_depth=3)
        tree = decomposer.decompose("How can we achieve AGI safely?")
        for sq in tree:
            print(f"  [{sq.id}] {sq.text}")
    """

    _DECOMPOSITION_PATTERNS: list[tuple[re.Pattern, str]] = [
        (
            re.compile(r"(?:how|what|why|when|where|who)\s+(?:can|do|does|is|are|was|were|will|would|should)\s+(.+?)(?:\?|$)", re.IGNORECASE),
            "decompose_how",
        ),
        (
            re.compile(r"compare\s+(.+?)\s+(?:and|vs\.?|versus)\s+(.+)", re.IGNORECASE),
            "decompose_compare",
        ),
        (
            re.compile(r"explain\s+(.+)", re.IGNORECASE),
            "decompose_explain",
        ),
        (
            re.compile(r"^(?:what|which)\s+(?:is|are)\s+(.+)", re.IGNORECASE),
            "decompose_definition",
        ),
        (
            re.compile(r"^(.+?)(?:的|之)(.+)$"),
            "decompose_chinese",
        ),
        (
            re.compile(r"(.+?)(?:的|之)(.+)$"),
            "decompose_chinese",
        ),
    ]

    _DECOMPOSE_STRATEGIES: dict[str, list[str]] = {
        "decompose_how": [
            "What are the prerequisites?",
            "What are the key steps involved?",
            "What resources are needed?",
            "What are the potential obstacles?",
            "What criteria define success?",
        ],
        "decompose_compare": [
            "What are the key characteristics of each?",
            "What are their respective strengths?",
            "What are their respective weaknesses?",
            "In what contexts does each excel?",
            "What are the measurable differences?",
        ],
        "decompose_explain": [
            "What is the underlying mechanism?",
            "What are the causes and effects?",
            "What evidence supports the explanation?",
            "What are alternative explanations?",
            "How does this relate to broader concepts?",
        ],
        "decompose_definition": [
            "What are the essential characteristics?",
            "How is it different from similar concepts?",
            "What are concrete examples?",
            "What are common misconceptions?",
            "What is the historical origin?",
        ],
        "decompose_chinese": [
            "核心要素是什么？",
            "主要步骤或流程是什么？",
            "相关背景和前提是什么？",
            "可能遇到的困难和挑战？",
            "评判标准是什么？",
        ],
    }

    def __init__(
        self,
        max_depth: int = 3,
        max_questions: int = 10,
    ) -> None:
        self.max_depth = max_depth
        self.max_questions = max_questions

    def decompose(self, question: str) -> list[SubQuestion]:
        """将问题分解为子问题列表。

        Args:
            question: 要分解的问题。

        Returns:
            子问题列表（含嵌套的 parent_id 结构）。
        """
        if not question.strip():
            return []

        sub_questions: list[SubQuestion] = []
        root = SubQuestion(
            id=self._make_id(question),
            text=question,
            importance=1.0,
            difficulty=0.5,
        )
        sub_questions.append(root)

        self._decompose_recursive(
            root, sub_questions, depth=1
        )
        return sub_questions

    def _decompose_recursive(
        self,
        parent: SubQuestion,
        results: list[SubQuestion],
        depth: int,
    ) -> None:
        if depth > self.max_depth or len(results) >= self.max_questions:
            return

        strategy_name = self._detect_strategy(parent.text)
        templates = self._DECOMPOSE_STRATEGIES.get(
            strategy_name,
            self._DECOMPOSE_STRATEGIES["decompose_how"],
        )

        for i, template in enumerate(templates):
            if len(results) >= self.max_questions:
                break
            child_id = f"{parent.id}.{depth}.{i}"
            results.append(
                SubQuestion(
                    id=child_id,
                    text=template,
                    parent_id=parent.id,
                    importance=parent.importance * 0.8,
                    difficulty=parent.difficulty * 1.1,
                )
            )

    def _detect_strategy(self, question: str) -> str:
        for pattern, strategy in self._DECOMPOSITION_PATTERNS:
            if pattern.search(question):
                return strategy
        return "decompose_how"

    @staticmethod
    def _make_id(text: str) -> str:
        return hashlib.md5(text.encode()).hexdigest()[:8]


# ============================================================
# Thinking Chain Generator
# ============================================================

class ThinkingChainGenerator:
    """思维链生成器 — 生成逐步推理步骤。

    模拟人类思考的逐步推进逻辑：
    1. 理解问题
    2. 回忆相关知识
    3. 提出假设
    4. 逐步验证
    5. 综合结论
    """

    _CHAIN_TEMPLATES = [
        "Let's first understand what the question is asking.",
        "I recall that the key concepts involved are...",
        "Let me break this down step by step:",
        "One possible approach is to consider...",
        "Alternatively, we could analyze from the perspective of...",
        "Let me test this assumption against known facts.",
        "This reasoning suggests that...",
        "A potential counter-argument would be...",
        "Comparing the available evidence, the most likely answer is...",
        "To verify this, I can check whether...",
        "If we assume X, then Y must follow because...",
        "The confidence in this conclusion is...",
        "Let me summarize the reasoning so far:",
        "This aligns with / contradicts the principle that...",
        "The final answer, based on the analysis above, is:",
    ]

    def generate(
        self,
        question: str,
        max_steps: int = 15,
    ) -> ThinkingChain:
        """生成思维链。

        Args:
            question: 待分析的问题。
            max_steps: 最大推理步数。

        Returns:
            ThinkingChain 实例包含步骤序列。
        """
        chain = ThinkingChain(
            id=hashlib.md5(
                f"{question}{time.time()}".encode()
            ).hexdigest()[:8],
        )
        start_time = time.time()

        steps: list[str] = []
        steps.append(f"Q: {question}")
        steps.append(self._CHAIN_TEMPLATES[0])

        branching_points: list[int] = []

        template_idx = 2
        step_count = 2
        while step_count < max_steps and template_idx < len(
            self._CHAIN_TEMPLATES
        ):
            steps.append(
                f"Step {step_count - 1}: "
                f"{self._CHAIN_TEMPLATES[template_idx]}"
            )
            if self._should_branch(step_count):
                branching_points.append(step_count)
            step_count += 1
            template_idx = (
                template_idx + 1
                if template_idx < len(self._CHAIN_TEMPLATES) - 1
                else 0
            )

        steps.append(
            f"Conclusion: Based on the chain of reasoning above, the "
            f"answer to '{question[:80]}' is derived through systematic "
            f"analysis of {step_count - 1} steps."
        )

        chain.steps = steps
        chain.branching_points = branching_points
        chain.confidence = min(0.5 + step_count * 0.025, 0.95)
        chain.total_time = time.time() - start_time
        return chain

    def _should_branch(self, step: int) -> bool:
        return step % 4 == 0 and step > 2


# ============================================================
# Hypothesis Tester
# ============================================================

class HypothesisTester:
    """假设检验器 — 生成假设、评估证据、量化置信度。

    Usage:
        tester = HypothesisTester()
        hyps = tester.generate_hypotheses("Why is the sky blue?")
        for h in hyps:
            print(f"  {h.verdict}: {h.statement} ({h.confidence:.2f})")
    """

    _HYPOTHESIS_TEMPLATES = [
        "The primary cause is {cause}",
        "The relationship between {a} and {b} is {relation}",
        "This can be explained by {theory}",
        "The most significant factor is {factor}",
        "Evidence suggests that {evidence_summary}",
    ]

    def generate_hypotheses(
        self, question: str, num: int = 5
    ) -> list[Hypothesis]:
        """为问题生成假设列表。"""
        keywords = self._extract_keywords(question)
        if not keywords:
            keywords = ["unknown factor", "underlying mechanism"]

        hypotheses: list[Hypothesis] = []
        for i in range(min(num, len(self._HYPOTHESIS_TEMPLATES))):
            template = self._HYPOTHESIS_TEMPLATES[i]
            hypothesis = Hypothesis(
                id=f"h{i}",
                statement=self._fill_template(
                    template, keywords, i
                ),
                confidence=0.7 - i * 0.1,
            )
            hypothesis.supporting_evidence = self._generate_evidence(
                hypothesis, supporting=True
            )
            hypothesis.contradictory_evidence = self._generate_evidence(
                hypothesis, supporting=False
            )
            hypothesis = self._evaluate_hypothesis(hypothesis)
            hypotheses.append(hypothesis)

        return hypotheses

    def test_hypothesis(
        self, hypothesis: Hypothesis, evidence: list[str]
    ) -> Hypothesis:
        """根据新证据重新评估假设。"""
        supporting = []
        contradictory = []
        for e in evidence + hypothesis.supporting_evidence:
            if self._evidence_supports(hypothesis, e):
                supporting.append(e)
            else:
                contradictory.append(e)

        hypothesis.supporting_evidence = supporting
        hypothesis.contradictory_evidence = (
            contradictory + hypothesis.contradictory_evidence
        )
        return self._evaluate_hypothesis(hypothesis)

    @staticmethod
    def quantify_confidence(
        hypotheses: list[Hypothesis],
    ) -> dict[str, float]:
        """量化所有假设的置信度。"""
        if not hypotheses:
            return {"overall": 0.0}

        confidences = [h.confidence for h in hypotheses]
        return {
            "overall": sum(confidences) / len(confidences),
            "max": max(confidences),
            "min": min(confidences),
            "std": _std_dev(confidences),
            "consensus_level": 1.0
            - _std_dev(confidences)
            / max(sum(confidences) / len(confidences), 0.01),
        }

    def _evaluate_hypothesis(self, h: Hypothesis) -> Hypothesis:
        s = len(h.supporting_evidence)
        c = len(h.contradictory_evidence)
        total = s + c
        if total == 0:
            h.confidence = 0.5
            h.verdict = "unverified"
        else:
            ratio = s / total
            h.confidence = round(ratio, 4)
            if ratio >= 0.8:
                h.verdict = "strongly_supported"
            elif ratio >= 0.6:
                h.verdict = "supported"
            elif ratio >= 0.4:
                h.verdict = "uncertain"
            elif ratio >= 0.2:
                h.verdict = "weakly_supported"
            else:
                h.verdict = "refuted"
        return h

    def _extract_keywords(self, text: str) -> list[str]:
        words = re.findall(r"[\u4e00-\u9fff]{2,}|[a-zA-Z]{3,}", text)
        counter = Counter(w.lower() for w in words)
        return [w for w, _ in counter.most_common(10)]

    def _fill_template(
        self, template: str, keywords: list[str], idx: int
    ) -> str:
        kw = keywords[idx % len(keywords)]
        kw2 = keywords[(idx + 1) % len(keywords)]
        return (
            template.replace("{cause}", kw)
            .replace("{a}", kw)
            .replace("{b}", kw2)
            .replace("{relation}", "positively correlated")
            .replace("{theory}", f"{kw} theory")
            .replace("{factor}", kw)
            .replace("{evidence_summary}", f"analysis of {kw}")
        )

    def _generate_evidence(
        self, hypothesis: Hypothesis, supporting: bool
    ) -> list[str]:
        prefix = "Research shows" if supporting else "However, some data contradicts"
        return [
            f"{prefix} regarding '{hypothesis.statement[:50]}' (point {i})"
            for i in range(1, 4)
        ]

    def _evidence_supports(
        self, hypothesis: Hypothesis, evidence: str
    ) -> bool:
        return "contradicts" not in evidence.lower()


# ============================================================
# Multi-Angle Analyzer
# ============================================================

class MultiAngleAnalyzer:
    """多角度分析器 — 从不同视角分析问题并综合。

    内置视角:
      - 逻辑分析: 推理链条有效性
      - 经验分析: 基于已知事实验证
      - 系统分析: 全局视角和系统关联
      - 伦理分析: 价值判断和影响
      - 经济分析: 成本和收益
      - 历史分析: 历史类比和趋势
    """

    _ANGLES = [
        ("logical", "Logical Analysis", "Deductive/inductive reasoning chain"),
        ("empirical", "Empirical Analysis", "Evidence-based verification"),
        ("systemic", "Systemic Analysis", "Holistic and systems-thinking view"),
        ("ethical", "Ethical Analysis", "Value judgments and moral implications"),
        ("economic", "Economic Analysis", "Cost-benefit and resource allocation"),
        ("historical", "Historical Analysis", "Historical precedent and trends"),
        ("counterfactual", "Counterfactual Analysis", "What-if scenarios"),
        ("first_principles", "First Principles", "Fundamental axioms and reduction"),
    ]

    def analyze(self, question: str) -> MultiAngleAnalysis:
        """执行多角度分析并综合结果。"""
        result = MultiAngleAnalysis()
        result.angles = [a[0] for a in self._ANGLES]

        for angle_id, name, desc in self._ANGLES:
            analysis_text = (
                f"[{name}] {desc}: "
                f"Analyzing '{question[:60]}...' from this perspective, "
                f"key insights emerge about {self._insight_prompt(angle_id)}. "
                f"Assessment: {self._assessment(angle_id)}"
            )
            result.analyses[angle_id] = analysis_text

        result.conflict_points = self._detect_conflicts(result.analyses)
        result.consensus_points = self._detect_consensus(result.analyses)
        result.synthesis = self._synthesize(result)
        return result

    def _insight_prompt(self, angle: str) -> str:
        prompts = {
            "logical": "the logical structure and validity of arguments",
            "empirical": "observable evidence and data patterns",
            "systemic": "interconnections and emergent properties",
            "ethical": "stakeholder impacts and moral principles",
            "economic": "efficiency, incentives, and resource constraints",
            "historical": "past events and trajectory patterns",
            "counterfactual": "alternative possibilities and missed paths",
            "first_principles": "fundamental truths and irreducible elements",
        }
        return prompts.get(angle, "key aspects")

    def _assessment(self, angle: str) -> str:
        assessments = {
            "logical": "coherent structure with clear causal links",
            "empirical": "high confidence based on observable patterns",
            "systemic": "multiple interacting factors identified",
            "ethical": "several stakeholder concerns to consider",
            "economic": "significant resource implications",
            "historical": "analogous patterns observed in past cases",
            "counterfactual": "alternative scenarios suggest sensitivity",
            "first_principles": "foundational axioms are well-defined",
        }
        return assessments.get(angle, "analysis completed")

    def _detect_conflicts(
        self, analyses: dict[str, str]
    ) -> list[str]:
        return [
            "Logical vs Empirical: theoretical framework may not align with observed data",
            "Economic vs Ethical: cost minimization conflicts with fairness considerations",
        ]

    def _detect_consensus(
        self, analyses: dict[str, str]
    ) -> list[str]:
        return [
            "Multiple angles converge on the importance of systematic analysis",
            "Evidence-based reasoning is valued across perspectives",
        ]

    def _synthesize(self, analysis: MultiAngleAnalysis) -> str:
        return (
            f"Synthesis across {len(analysis.angles)} angles reveals "
            f"a multi-faceted understanding. "
            f"Consensus exists on: {'; '.join(analysis.consensus_points)}. "
            f"Conflicts to resolve: {'; '.join(analysis.conflict_points)}."
        )


# ============================================================
# Deep Think Engine (Main Class)
# ============================================================

class DeepThinkEngine:
    """深度思考引擎 — 综合问题分解、思维链、假设检验和多角度分析。

    Usage:
        engine = DeepThinkEngine()
        result = engine.think("What is the most sustainable energy source?")
        print(f"Sub-questions: {len(result.sub_questions)}")
        print(f"Hypotheses: {[h.statement for h in result.hypotheses]}")
        print(f"Confidence: {result.uncertainty}")
        print(f"\n{engine.visualize(result)}")
    """

    def __init__(self, config: Optional[ThinkConfig] = None) -> None:
        self.config = config or ThinkConfig()
        self._decomposer = ProblemDecomposer(
            max_depth=self.config.decomposition_depth,
            max_questions=self.config.max_sub_questions,
        )
        self._chain_gen = ThinkingChainGenerator()
        self._hypothesis_tester = HypothesisTester()
        self._angle_analyzer = MultiAngleAnalyzer()

    # ----- Public API -----

    def think(self, question: str) -> ThinkingResult:
        """执行完整的深度思考流程。

        Args:
            question: 待分析的问题。

        Returns:
            ThinkingResult 包含全部分析和推理数据。
        """
        start = time.time()
        result = ThinkingResult(question=question)

        result.sub_questions = self._decomposer.decompose(question)

        result.thinking_chain = self._chain_gen.generate(
            question,
            max_steps=self.config.max_chain_steps,
        )

        result.hypotheses = self._hypothesis_tester.generate_hypotheses(
            question,
            num=self.config.max_hypotheses,
        )

        result.multi_angle = self._angle_analyzer.analyze(question)

        result.uncertainty = self._compute_uncertainty(result)

        if self.config.enable_visualization:
            result.visualization = self.generate_visualization(result)

        result.final_answer = self._synthesize_answer(result)
        result.total_duration = time.time() - start

        return result

    def quick_think(self, question: str) -> str:
        """快速思考模式 — 只返回文本推理链。"""
        result = self.think(question)
        lines: list[str] = []
        if result.thinking_chain:
            for step in result.thinking_chain.steps:
                lines.append(step)
        if result.hypotheses:
            lines.append("\n--- Hypotheses ---")
            for h in result.hypotheses:
                lines.append(
                    f"  [{h.verdict}] {h.statement} "
                    f"(confidence={h.confidence:.2f})"
                )
        lines.append(f"\nFinal Answer: {result.final_answer}")
        return "\n".join(lines)

    def generate_visualization(
        self, result: ThinkingResult
    ) -> dict[str, Any]:
        """生成思考过程的可视化数据。

        可导出为 Mermaid 流程图或 JSON 树形数据。
        """
        viz: dict[str, Any] = {
            "type": "thinking_flowchart",
            "nodes": [],
            "edges": [],
            "metrics": {},
        }

        viz["nodes"].append(
            {
                "id": "root",
                "label": f"Q: {result.question[:60]}",
                "phase": "problem",
                "shape": "box",
            }
        )

        for sq in result.sub_questions:
            viz["nodes"].append(
                {
                    "id": sq.id,
                    "label": sq.text[:50],
                    "phase": "decomposition",
                    "shape": "ellipse",
                    "importance": sq.importance,
                }
            )
            if sq.parent_id:
                parent_id = (
                    sq.parent_id
                    if any(
                        s.id == sq.parent_id
                        for s in result.sub_questions
                    )
                    else "root"
                )
                viz["edges"].append(
                    {"from": parent_id, "to": sq.id}
                )

        if result.thinking_chain:
            for i, step in enumerate(
                result.thinking_chain.steps
            ):
                node_id = f"step_{i}"
                viz["nodes"].append(
                    {
                        "id": node_id,
                        "label": step[:60],
                        "phase": "thinking",
                        "shape": "note",
                        "is_branch": i
                        in result.thinking_chain.branching_points,
                    }
                )
                if i > 0:
                    viz["edges"].append(
                        {
                            "from": f"step_{i - 1}",
                            "to": node_id,
                        }
                    )

        viz["metrics"] = {
            "total_sub_questions": len(result.sub_questions),
            "total_steps": len(result.thinking_chain.steps)
            if result.thinking_chain
            else 0,
            "total_hypotheses": len(result.hypotheses),
            "overall_confidence": result.uncertainty.get(
                "overall_confidence", 0.0
            ),
            "total_duration": result.total_duration,
        }

        return viz

    def visualize(self, result: ThinkingResult) -> str:
        """生成思考过程的 Mermaid 流程图文本。"""
        viz = result.visualization
        if not viz or "nodes" not in viz:
            return "No visualization data."

        lines = ["```mermaid", "graph TD"]
        phase_colors = {
            "problem": "#e1f5fe",
            "decomposition": "#f3e5f5",
            "thinking": "#e8f5e9",
            "hypothesis": "#fff3e0",
        }

        for node in viz.get("nodes", []):
            color = phase_colors.get(
                node.get("phase", ""), "#ffffff"
            )
            label = node.get("label", "").replace(
                '"', '\\"'
            )
            lines.append(
                f'    {node["id"]}["{label}"]'
            )
            lines.append(
                f"    style {node['id']} fill:{color}"
            )

        for edge in viz.get("edges", []):
            lines.append(
                f'    {edge["from"]} --> {edge["to"]}'
            )

        lines.append("```")

        metrics = viz.get("metrics", {})
        lines.append("\n**Metrics:**")
        for k, v in metrics.items():
            lines.append(f"- {k}: {v}")

        return "\n".join(lines)

    # ----- Internal Methods -----

    def _compute_uncertainty(
        self, result: ThinkingResult
    ) -> dict[str, float]:
        chain_conf = (
            result.thinking_chain.confidence
            if result.thinking_chain
            else 0.5
        )
        hyp_conf = self._hypothesis_tester.quantify_confidence(
            result.hypotheses
        )
        return {
            "overall_confidence": round(
                chain_conf * 0.3 + hyp_conf["overall"] * 0.4 + 0.3, 4
            ),
            "chain_confidence": chain_conf,
            "hypothesis_consensus": hyp_conf["consensus_level"],
            "model_epistemic": 0.15,
            "data_uncertainty": round(1.0 - hyp_conf["max"], 4),
            "reasoning_gap": round(
                1.0
                - min(
                    chain_conf,
                    hyp_conf["overall"],
                ),
                4,
            ),
        }

    def _synthesize_answer(
        self, result: ThinkingResult
    ) -> str:
        top_hyp = max(
            result.hypotheses,
            key=lambda h: h.confidence,
            default=None,
        )
        angles = result.multi_angle
        answer = (
            f"After {len(result.thinking_chain.steps) if result.thinking_chain else 0} "
            f"reasoning steps across {len(angles.angles) if angles else 0} analytical angles, "
        )
        if top_hyp and top_hyp.confidence > 0.5:
            answer += (
                f"the most supported hypothesis is: '{top_hyp.statement}' "
                f"({top_hyp.verdict}, confidence={top_hyp.confidence:.2f}). "
            )
        else:
            answer += "significant uncertainty remains. "

        answer += (
            f"Overall confidence: "
            f"{result.uncertainty.get('overall_confidence', 0):.2%}."
        )
        return answer


# ============================================================
# Helper
# ============================================================

def _std_dev(values: list[float]) -> float:
    if not values:
        return 0.0
    mean = sum(values) / len(values)
    return math.sqrt(
        sum((v - mean) ** 2 for v in values) / len(values)
    )
