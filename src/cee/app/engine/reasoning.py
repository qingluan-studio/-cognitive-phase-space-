"""
逻辑推理引擎。

提供多类型逻辑推理能力，包括演绎推理、归纳推理、
溯因推理、类比推理、因果推理、三段论推理等功能。
"""

import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Optional

import numpy as np


class ReasoningType(Enum):
    DEDUCTIVE = "deductive"
    INDUCTIVE = "inductive"
    ABDUCTIVE = "abductive"
    ANALOGICAL = "analogical"
    CAUSAL = "causal"
    SYLLOGISTIC = "syllogistic"


@dataclass
class Premise:
    text: str = ""
    category: str = ""
    confidence: float = 1.0
    source: str = ""


@dataclass
class InferenceNode:
    id: str = ""
    statement: str = ""
    from_nodes: list[str] = field(default_factory=list)
    reasoning_type: str = ""
    confidence: float = 0.0


@dataclass
class ReasoningChain:
    nodes: list[InferenceNode] = field(default_factory=list)
    start_premises: list[Premise] = field(default_factory=list)
    conclusion: str = ""
    confidence: float = 0.0
    reasoning_path: list[str] = field(default_factory=list)


@dataclass
class ReasoningResult:
    reasoning_type: ReasoningType = ReasoningType.DEDUCTIVE
    input_premises: list[Premise] = field(default_factory=list)
    conclusion: str = ""
    confidence: float = 0.0
    chain: Optional[ReasoningChain] = None
    explanation: str = ""
    alternatives: list[str] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)
    counter_examples: list[str] = field(default_factory=list)


@dataclass
class CausalGraph:
    nodes: list[str] = field(default_factory=list)
    edges: list[tuple[str, str, str]] = field(default_factory=list)
    root_causes: list[str] = field(default_factory=list)


class ReasoningEngine:
    """多类型逻辑推理引擎。"""

    _syllogism_rules = {
        ("all(A,B)", "all(B,C)"): ("all(A,C)", 1.0),
        ("all(A,B)", "some(A,C)"): ("some(B,C)", 0.7),
        ("all(A,B)", "no(B,C)"): ("no(A,C)", 1.0),
        ("no(A,B)", "all(C,A)"): ("no(C,B)", 1.0),
        ("some(A,B)", "all(B,C)"): ("some(A,C)", 0.8),
        ("no(A,B)", "some(C,A)"): ("some(C,not_B)", 0.6),
        ("all(A,B)", "some(not_B,C)"): ("some(C,not_A)", 0.5),
    }

    def __init__(self, confidence_threshold: float = 0.3):
        self.confidence_threshold = confidence_threshold

    def reason(self, premises: list[str],
               reasoning_type: ReasoningType = ReasoningType.DEDUCTIVE,
               context: str = "") -> ReasoningResult:
        parsed_premises = [self._parse_premise(p) for p in premises]

        if reasoning_type == ReasoningType.DEDUCTIVE:
            result = self._deductive_reasoning(parsed_premises, context)
        elif reasoning_type == ReasoningType.INDUCTIVE:
            result = self._inductive_reasoning(parsed_premises, context)
        elif reasoning_type == ReasoningType.ABDUCTIVE:
            result = self._abductive_reasoning(parsed_premises, context)
        elif reasoning_type == ReasoningType.ANALOGICAL:
            result = self._analogical_reasoning(parsed_premises, context)
        elif reasoning_type == ReasoningType.CAUSAL:
            result = self._causal_reasoning(parsed_premises, context)
        elif reasoning_type == ReasoningType.SYLLOGISTIC:
            result = self._syllogistic_reasoning(parsed_premises)
        else:
            result = self._deductive_reasoning(parsed_premises, context)

        return result

    def _parse_premise(self, premise_text: str) -> Premise:
        category = "general"
        confidence = 1.0

        if "可能" in premise_text or "也许" in premise_text:
            confidence = 0.6
            category = "uncertain"
        elif "必定" in premise_text or "一定" in premise_text:
            confidence = 1.0
            category = "certain"
        elif "所有" in premise_text or "全部" in premise_text:
            category = "universal"
        elif "有些" in premise_text or "部分" in premise_text:
            category = "particular"
            confidence = 0.7
        elif "如果" in premise_text and "那么" in premise_text:
            category = "conditional"
            confidence = 0.8

        return Premise(text=premise_text, category=category, confidence=confidence)

    def _deductive_reasoning(self, premises: list[Premise],
                             context: str) -> ReasoningResult:
        result = ReasoningResult(
            reasoning_type=ReasoningType.DEDUCTIVE,
            input_premises=premises,
        )

        universal_premises = [p for p in premises if p.category in ("universal", "certain")]
        particular_premises = [p for p in premises if p.category == "particular"]
        conditional_premises = [p for p in premises if p.category == "conditional"]

        if universal_premises:
            candidates = []
            for p in universal_premises:
                if "所有" in p.text:
                    extracted = self._extract_universal_conclusion(p.text)
                    if extracted:
                        candidates.append(extracted)
            if candidates:
                result.conclusion = "且".join(candidates)
                result.confidence = min(p.confidence for p in universal_premises)

        if conditional_premises and not result.conclusion:
            for p in conditional_premises:
                match = re.search(r"如果(.+?)那么(.+?)(?:$|[。，,])", p.text)
                if match:
                    condition = match.group(1).strip()
                    consequent = match.group(2).strip()
                    if any(condition in prem.text for prem in premises if prem != p):
                        result.conclusion = consequent
                        result.confidence = 0.8
                    else:
                        result.conclusion = "若 {} 成立，则 {}".format(condition, consequent)
                        result.confidence = 0.5

        if not result.conclusion:
            result.conclusion = self._infer_conclusion_heuristic(premises)
            result.confidence = 0.3

        result.explanation = self._generate_deductive_explanation(premises, result.conclusion)
        result.alternatives = self._generate_alternatives(premises)
        result.assumptions = self._extract_assumptions(premises)
        result.chain = self._build_chain(premises, result.conclusion, "deductive")

        return result

    def _inductive_reasoning(self, premises: list[Premise],
                             context: str) -> ReasoningResult:
        result = ReasoningResult(
            reasoning_type=ReasoningType.INDUCTIVE,
            input_premises=premises,
        )

        patterns = self._extract_patterns([p.text for p in premises])
        if patterns:
            result.conclusion = "基于观察到的模式：{}，推测一般规律为——{}".format(
                "、".join(patterns[:3]),
                self._generalize_pattern(patterns),
            )
            result.confidence = min(1.0, len(premises) * 0.1)
        else:
            result.conclusion = "基于 {} 个观察样本，归纳得出上述现象具有相关性".format(len(premises))
            result.confidence = min(0.5, len(premises) * 0.05)

        result.explanation = self._generate_inductive_explanation(premises, result.conclusion)
        result.alternatives = self._generate_inductive_alternatives(premises)
        result.counter_examples = self._search_counter_examples(premises)
        result.assumptions = ["观测样本具有代表性", "样本量足够支持归纳", "未观察到的样本遵循相同模式"]
        result.chain = self._build_chain(premises, result.conclusion, "inductive")

        return result

    def _abductive_reasoning(self, premises: list[Premise],
                             context: str) -> ReasoningResult:
        result = ReasoningResult(
            reasoning_type=ReasoningType.ABDUCTIVE,
            input_premises=premises,
        )

        observations = [p.text for p in premises]
        best_explanations = self._generate_best_explanations(observations)

        if best_explanations:
            result.conclusion = best_explanations[0]["explanation"]
            result.confidence = best_explanations[0]["plausibility"]
            result.alternatives = [e["explanation"] for e in best_explanations[1:]]
        else:
            result.conclusion = "最可能的解释是前提条件中存在未知因素"
            result.confidence = 0.2

        result.explanation = "溯因推理从观察结果出发，寻找最合理的解释原因"
        result.assumptions = self._extract_abductive_assumptions(premises)
        result.chain = self._build_chain(premises, result.conclusion, "abductive")

        return result

    def _analogical_reasoning(self, premises: list[Premise],
                              context: str) -> ReasoningResult:
        result = ReasoningResult(
            reasoning_type=ReasoningType.ANALOGICAL,
            input_premises=premises,
        )

        if len(premises) >= 2:
            source = premises[0].text
            target = premises[1].text if len(premises) > 1 else ""

            mapping = self._find_structural_mapping(source, target)
            if mapping:
                result.conclusion = "通过结构映射发现：{}".format(mapping)
                result.confidence = 0.6
            else:
                result.conclusion = "源域和目标的相似性不足以建立有力的类比推理"
                result.confidence = 0.2
        else:
            result.conclusion = "需要至少两个前提来进行类比推理"
            result.confidence = 0.0

        result.explanation = self._generate_analogical_explanation(premises)
        result.alternatives = self._generate_analogical_alternatives(premises)
        result.assumptions = ["源域和目标域在结构上相似", "类比映射是有效的"]
        result.chain = self._build_chain(premises, result.conclusion, "analogical")

        return result

    def _causal_reasoning(self, premises: list[Premise],
                          context: str) -> ReasoningResult:
        result = ReasoningResult(
            reasoning_type=ReasoningType.CAUSAL,
            input_premises=premises,
        )

        causal_relations = self._extract_causal_relations([p.text for p in premises])
        graph = self._build_causal_graph(causal_relations)

        if graph.root_causes:
            result.conclusion = "根因分析结果：{}。因果关系链包含 {} 个节点和 {} 条边。".format(
                "、".join(graph.root_causes),
                len(graph.nodes),
                len(graph.edges),
            )
            result.confidence = 0.7
        else:
            result.conclusion = "未能从给定前提中提取足够的因果关系"
            result.confidence = 0.2

        result.explanation = self._generate_causal_explanation(premises, graph)
        result.alternatives = ["可能存在未观测到的混杂变量", "因果关系方向可能需要反向考虑"]
        result.assumptions = ["因果关系是确定性的", "没有遗漏关键的因果变量"]
        result.chain = self._build_chain(premises, result.conclusion, "causal")

        return result

    def _syllogistic_reasoning(self, premises: list[Premise]) -> ReasoningResult:
        result = ReasoningResult(
            reasoning_type=ReasoningType.SYLLOGISTIC,
            input_premises=premises,
        )

        if len(premises) < 2:
            result.conclusion = "三段论推理需要至少两个前提"
            result.confidence = 0.0
            return result

        p1_norm = self._normalize_syllogism(premises[0].text)
        p2_norm = self._normalize_syllogism(premises[1].text)

        key = (p1_norm, p2_norm)
        if key in self._syllogism_rules:
            conclusion, conf = self._syllogism_rules[key]
            result.conclusion = conclusion
            result.confidence = conf
        else:
            key_rev = (p2_norm, p1_norm)
            if key_rev in self._syllogism_rules:
                conclusion, conf = self._syllogism_rules[key_rev]
                result.conclusion = conclusion
                result.confidence = conf
            else:
                result.conclusion = "无法从给定前提推导出有效三段论结论"
                result.confidence = 0.1

        result.explanation = self._generate_syllogistic_explanation(premises, result.conclusion)
        result.assumptions = ["三段论前提为真", "类别关系符合经典逻辑"]
        result.chain = self._build_chain(premises, result.conclusion, "syllogistic")

        return result

    def _extract_universal_conclusion(self, text: str) -> str:
        match = re.search(r"所有(.+?)都(.+)", text)
        if match:
            return "{}是{}的".format(match.group(1).strip(), match.group(2).strip())
        match = re.search(r"全部(.+?)都(.+)", text)
        if match:
            return "{}具有{}属性".format(match.group(1).strip(), match.group(2).strip())
        return ""

    def _extract_patterns(self, texts: list[str]) -> list[str]:
        patterns = []
        keywords = Counter()
        for text in texts:
            words = re.findall(r"[\u4e00-\u9fff\w]+", text)
            keywords.update(words)

        common = [w for w, c in keywords.most_common(5) if c >= 2 and len(w) > 1]
        if common:
            patterns.append("共同关键词: {}".format("、".join(common)))

        return patterns

    def _generalize_pattern(self, patterns: list[str]) -> str:
        return "在相似条件下通常会重复出现的模式"

    def _extract_causal_relations(self, texts: list[str]) -> list[tuple[str, str, str]]:
        relations = []
        causal_markers = {
            "导致": "direct",
            "引起": "direct",
            "造成": "direct",
            "因为": "reverse",
            "由于": "reverse",
            "所以": "forward",
            "因此": "forward",
            "结果是": "forward",
        }

        for text in texts:
            for marker, direction in causal_markers.items():
                if marker in text:
                    parts = text.split(marker, 1)
                    if len(parts) == 2:
                        if direction == "forward":
                            relations.append((parts[0].strip()[-20:], marker, parts[1].strip()[:50]))
                        elif direction == "reverse":
                            relations.append((parts[1].strip()[:50], marker, parts[0].strip()[-20:]))
                        else:
                            relations.append((parts[0].strip()[-20:], marker, parts[1].strip()[:50]))
        return relations

    def _build_causal_graph(self, relations: list[tuple[str, str, str]]) -> CausalGraph:
        graph = CausalGraph()
        seen_causes = set()
        seen_effects = set()

        for cause, marker, effect in relations:
            if cause not in graph.nodes:
                graph.nodes.append(cause)
            if effect not in graph.nodes:
                graph.nodes.append(effect)

            seen_causes.add(cause)
            seen_effects.add(effect)
            graph.edges.append((cause, effect, marker))

        graph.root_causes = sorted(seen_causes - seen_effects)

        return graph

    def _generate_best_explanations(self, observations: list[str]) -> list[dict]:
        explanations = []

        for obs in observations:
            words = re.findall(r"[\u4e00-\u9fff]+", obs)
            if len(words) > 3:
                explanations.append({
                    "explanation": "观察到的「{}」可能由底层机制「{}」引起".format(
                        obs[:30],
                        "与{}相关的内在规律".format(words[0]),
                    ),
                    "plausibility": min(0.7, len(words) * 0.05),
                })

        if not explanations:
            explanations.append({
                "explanation": "观测结果可能由多种因素共同导致",
                "plausibility": 0.3,
            })

        explanations.sort(key=lambda x: x["plausibility"], reverse=True)
        return explanations

    def _find_structural_mapping(self, source: str, target: str) -> str:
        src_words = set(re.findall(r"[\u4e00-\u9fff]+", source))
        tgt_words = set(re.findall(r"[\u4e00-\u9fff]+", target))
        overlap = src_words & tgt_words

        if overlap:
            return "源域和目标域共享关键要素: {}".format("、".join(sorted(overlap)[:5]))
        return ""

    def _infer_conclusion_heuristic(self, premises: list[Premise]) -> str:
        texts = [p.text for p in premises]
        if len(texts) == 1:
            return "基于前提「{}」可以推断该陈述为真".format(texts[0][:30])
        return "基于 {} 个前提条件，推测结论成立".format(len(texts))

    def _generate_deductive_explanation(self, premises: list[Premise],
                                        conclusion: str) -> str:
        return "从 {} 个前提出发，应用演绎逻辑规则，推导出上述结论".format(len(premises))

    def _generate_inductive_explanation(self, premises: list[Premise],
                                        conclusion: str) -> str:
        return "基于 {} 个具体观察案例，通过模式识别和泛化得出一般性结论".format(len(premises))

    def _generate_analogical_explanation(self, premises: list[Premise]) -> str:
        return "通过比较源域和目标域的结构相似性，推断目标域具有源域的某些属性"

    def _generate_causal_explanation(self, premises: list[Premise],
                                     graph: CausalGraph) -> str:
        return "从因果关系网络中识别出 {} 个根因和 {} 个因果边".format(
            len(graph.root_causes), len(graph.edges))

    def _generate_syllogistic_explanation(self, premises: list[Premise],
                                          conclusion: str) -> str:
        return "基于三段论逻辑规则，从两个前提出发推导结论"

    def _generate_alternatives(self, premises: list[Premise]) -> list[str]:
        return [
            "可能存在未包含在前提中的例外情况",
            "前提可能不完整，导致其他可能的结论",
        ]

    def _generate_inductive_alternatives(self,
                                         premises: list[Premise]) -> list[str]:
        return [
            "样本可能存在选择偏差，导致不同的泛化结果",
            "增加样本量后可能得出不同结论",
        ]

    def _generate_analogical_alternatives(self,
                                          premises: list[Premise]) -> list[str]:
        return [
            "源域和目标域可能在一些关键维度上不同",
            "可能存在更合适的类比域",
        ]

    def _extract_assumptions(self, premises: list[Premise]) -> list[str]:
        return ["所有前提陈述为真", "前提覆盖了所有相关情况"]

    def _extract_abductive_assumptions(self, premises: list[Premise]) -> list[str]:
        return ["所选择的解释是最简洁的", "没有遗漏更合理的解释"]

    def _search_counter_examples(self, premises: list[Premise]) -> list[str]:
        return ["可能存在与归纳结论矛盾的未观测案例"]

    def _build_chain(self, premises: list[Premise], conclusion: str,
                     reasoning_type: str) -> ReasoningChain:
        chain = ReasoningChain(
            start_premises=list(premises),
            conclusion=conclusion,
            reasoning_path=[reasoning_type],
        )

        for i, p in enumerate(premises):
            node = InferenceNode(
                id="premise_{}".format(i + 1),
                statement=p.text,
                reasoning_type=reasoning_type,
                confidence=p.confidence,
            )
            chain.nodes.append(node)

        conclusion_node = InferenceNode(
            id="conclusion",
            statement=conclusion,
            from_nodes=[n.id for n in chain.nodes],
            reasoning_type=reasoning_type,
            confidence=chain.confidence,
        )
        chain.nodes.append(conclusion_node)

        return chain

    def _normalize_syllogism(self, text: str) -> str:
        text = text.strip()

        if "所有" in text:
            match = re.search(r"所有(.+?)(?:都|是|属于)(.+)", text)
            if match:
                a = match.group(1).strip()
                b = match.group(2).strip()
                return "all({},{})".format(a, b)

        if "有些" in text or "一些" in text:
            match = re.search(r"(?:有些|一些)(.+?)(?:是|属于)(.+)", text)
            if match:
                a = match.group(1).strip()
                b = match.group(2).strip()
                return "some({},{})".format(a, b)

        if "没有" in text or "不是" in text:
            match = re.search(r"(.+?)(?:没有|不是)(.+)", text)
            if match:
                a = match.group(1).strip()
                b = match.group(2).strip()
                return "no({},{})".format(a, b)

        return "statement({})".format(text[:20])

    def assess_confidence(self, result: ReasoningResult) -> float:
        score = result.confidence

        if result.chain:
            node_count = len(result.chain.nodes)
            if node_count > 5:
                score *= 0.9

        if result.counter_examples:
            score *= 0.8

        if result.alternatives and len(result.alternatives) > 3:
            score *= 0.85

        return round(max(0.0, min(1.0, score)), 4)

    def visualize_chain(self, chain: ReasoningChain) -> str:
        lines = []
        lines.append("推理链可视化:")
        lines.append("=" * 40)

        for node in chain.nodes:
            if node.statement.startswith("premise_"):
                lines.append("  [前提] {}".format(node.statement[:60]))
            else:
                lines.append("  [结论] {}".format(node.statement[:60]))
                if node.from_nodes:
                    lines.append("    前置: {}".format(" -> ".join(node.from_nodes)))
                lines.append("    置信度: {:.2%}".format(node.confidence))

        lines.append("=" * 40)
        return "\n".join(lines)

    def get_reasoning_types(self) -> list[str]:
        return [rt.value for rt in ReasoningType]
