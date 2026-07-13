"""
可解释性引擎 — AI 推理过程的解释与可视化

提供模型推理决策的可解释性分析:
  - 特征归因: 使用梯度/注意力/LIME 风格的特征重要性分析
  - 决策路径: 可视化从输入到输出的推理链
  - 反事实解释: "如果输入是X而不是Y，结果会怎样"
  - 概念归因: 将低层特征映射到高层概念
  - 对比解释: 为什么是A而不是B的解释
  - 置信度分解: 分解整体置信度为各组成部分的贡献
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


class ExplanationType(Enum):
    FEATURE_ATTRIBUTION = "feature_attribution"
    DECISION_PATH = "decision_path"
    COUNTERFACTUAL = "counterfactual"
    CONTRASTIVE = "contrastive"
    CONCEPT_BASED = "concept_based"
    CHAIN_OF_REASONING = "chain_of_reasoning"
    CONFIDENCE_DECOMPOSITION = "confidence_decomposition"


class AttributionMethod(Enum):
    GRADIENT = "gradient"
    ATTENTION = "attention"
    OCCLUSION = "occlusion"
    LIME_STYLE = "lime_style"
    SHAP_STYLE = "shap_style"


@dataclass
class FeatureAttribution:
    feature_name: str
    attribution_score: float
    direction: str = "positive"
    confidence: float = 0.5
    evidence: str = ""


@dataclass
class DecisionNode:
    step: int
    description: str
    reasoning: str
    confidence: float = 0.5
    alternatives: list[str] = field(default_factory=list)
    depends_on: list[int] = field(default_factory=list)
    evidence: list[str] = field(default_factory=list)


@dataclass
class CounterfactualExplanation:
    original_input: str
    altered_input: str
    original_output: str
    altered_output: str
    change_description: str
    sensitivity: float = 0.5


@dataclass
class ExplanationResult:
    text: str
    explanation_type: ExplanationType
    feature_attributions: list[FeatureAttribution] = field(default_factory=list)
    decision_path: list[DecisionNode] = field(default_factory=list)
    counterfactuals: list[CounterfactualExplanation] = field(default_factory=list)
    contrastive_pairs: list[dict[str, Any]] = field(default_factory=list)
    concepts_used: list[dict[str, Any]] = field(default_factory=list)
    confidence_breakdown: dict[str, float] = field(default_factory=dict)
    overall_confidence: float = 0.5
    summary: str = ""
    readability_score: float = 0.5
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "explanation_type": self.explanation_type.value,
            "feature_count": len(self.feature_attributions),
            "decision_nodes": len(self.decision_path),
            "counterfactuals": len(self.counterfactuals),
            "overall_confidence": round(self.overall_confidence, 4),
            "readability_score": round(self.readability_score, 4),
            "summary": self.summary,
            "confidence_breakdown": {
                k: round(v, 4) for k, v in self.confidence_breakdown.items()
            },
        }


class FeatureAttributor:
    """特征归因器 — 分析文本中哪些部分对最终结论贡献最大"""

    def __init__(self, method: AttributionMethod = AttributionMethod.LIME_STYLE):
        self.method = method

    def attribute(self, input_text: str, output_text: str) -> list[FeatureAttribution]:
        if self.method == AttributionMethod.LIME_STYLE:
            return self._lime_style_attribution(input_text, output_text)
        if self.method == AttributionMethod.OCCLUSION:
            return self._occlusion_attribution(input_text, output_text)
        return self._attention_style_attribution(input_text, output_text)

    def _lime_style_attribution(self, input_text: str,
                                  output_text: str) -> list[FeatureAttribution]:
        attributions = []

        input_sentences = [s.strip() for s in
                           input_text.replace("!", ".").replace("?", ".").split(".")
                           if s.strip()]
        if not input_sentences:
            return []

        input_words = set(input_text.lower().split())
        output_words = set(output_text.lower().split())

        for sent in input_sentences:
            sent_words = set(sent.lower().split())
            if len(sent_words) < 2:
                continue

            overlap_with_output = len(sent_words & output_words)
            influence = overlap_with_output / len(sent_words)

            key_terms_in_sent = {
                w for w in sent_words
                if w in output_words and len(w) > 2
            }
            key_term_influence = len(key_terms_in_sent) / max(len(sent_words), 1)

            score = influence * 0.4 + key_term_influence * 0.6

            if score > 0.05:
                attributions.append(FeatureAttribution(
                    feature_name=sent[:50],
                    attribution_score=float(score),
                    direction="positive" if overlap_with_output > 0 else "negative",
                    confidence=float(score * 0.8 + 0.2),
                ))

        for word in output_words & input_words:
            if len(word) > 2:
                attributions.append(FeatureAttribution(
                    feature_name=f"关键词: {word}",
                    attribution_score=0.5,
                    direction="positive",
                    confidence=0.6,
                ))

        return sorted(attributions, key=lambda a: a.attribution_score, reverse=True)[:15]

    def _occlusion_attribution(self, input_text: str,
                                 output_text: str) -> list[FeatureAttribution]:
        attributions = []
        words = input_text.split()
        if len(words) < 5:
            return []

        full_overlap = len(set(input_text.lower().split()) & set(output_text.lower().split()))

        for i in range(0, len(words), max(1, len(words) // 10)):
            end = min(i + max(1, len(words) // 10), len(words))
            masked = words[:i] + ["[MASK]"] * (end - i) + words[end:]
            masked_text = " ".join(masked)
            masked_overlap = len(
                set(masked_text.lower().split()) & set(output_text.lower().split())
            )

            importance = (full_overlap - masked_overlap) / max(full_overlap, 1)

            if importance > 0.05:
                segment = " ".join(words[i:end])
                attributions.append(FeatureAttribution(
                    feature_name=segment[:50],
                    attribution_score=float(importance),
                    direction="positive",
                    confidence=float(abs(importance) * 0.7 + 0.3),
                ))

        return sorted(attributions, key=lambda a: a.attribution_score, reverse=True)[:15]

    def _attention_style_attribution(self, input_text: str,
                                       output_text: str) -> list[FeatureAttribution]:
        attributions = []
        output_words = set(output_text.lower().split())
        input_words_list = input_text.lower().split()

        word_attention: dict[str, float] = {}
        for i, word in enumerate(input_words_list):
            if word in output_words and len(word) > 1:
                position_weight = 1.0 - (i / max(len(input_words_list), 1)) * 0.3
                frequency = input_words_list.count(word)
                tfidf_like = 1.0 / (1.0 + np.log(max(frequency, 1)))

                attention = position_weight * tfidf_like
                if word in word_attention:
                    word_attention[word] = max(word_attention[word], attention)
                else:
                    word_attention[word] = attention

        for word, attn in sorted(word_attention.items(),
                                  key=lambda x: x[1], reverse=True)[:15]:
            attributions.append(FeatureAttribution(
                feature_name=word,
                attribution_score=attn,
                direction="positive",
                confidence=float(attn * 0.8),
            ))

        return attributions

    @staticmethod
    def _find_word_positions(text: str, word: str) -> list[int]:
        positions = []
        text_lower = text.lower()
        word_lower = word.lower()
        start = 0
        while True:
            idx = text_lower.find(word_lower, start)
            if idx == -1:
                break
            positions.append(idx)
            start = idx + 1
        return positions


class DecisionPathTracer:
    """决策路径追踪器"""

    def trace(self, reasoning_text: str) -> list[DecisionNode]:
        nodes = []

        step_markers = [
            r"(?:第[一二三四五六七八九十\d]+[步个]|[S|s]tep\s*\d+|^\d+[\.、)])",
            r"(?:首先|然后|接着|接下来|之后|最后|最终|因此|所以)",
            r"(?:Firstly|Then|Next|After|Finally|Therefore|Thus)",
        ]

        segments = self._split_by_markers(reasoning_text, step_markers)
        dependency_graph = self._build_dependency_graph(segments)

        for i, seg in enumerate(segments):
            conf = self._estimate_confidence(seg)
            alternatives = self._extract_alternatives(seg)
            evidence = self._extract_evidence_phrases(seg)
            deps = dependency_graph.get(i, [])

            nodes.append(DecisionNode(
                step=i + 1,
                description=seg[:80],
                reasoning=seg,
                confidence=conf,
                alternatives=alternatives,
                depends_on=deps,
                evidence=evidence,
            ))

        return nodes

    @staticmethod
    def _split_by_markers(text: str, markers: list[str]) -> list[str]:
        import re
        combined = "|".join(f"(?:{m})" for m in markers)
        parts = re.split(combined, text)
        return [p.strip() for p in parts if p.strip() and len(p.strip()) > 5]

    @staticmethod
    def _estimate_confidence(text: str) -> float:
        confidence_boosters = [
            "显然", "确定", "毫无疑问", "必然", "可以确认",
            "clearly", "certainly", "undoubtedly", "must",
        ]
        confidence_dampeners = [
            "可能", "也许", "大概", "估计", "似乎", "不确定",
            "possibly", "perhaps", "maybe", "uncertain",
        ]

        boost_count = sum(1 for kw in confidence_boosters if kw.lower() in text.lower())
        dampen_count = sum(1 for kw in confidence_dampeners if kw.lower() in text.lower())

        base = 0.6
        adjusted = base + boost_count * 0.1 - dampen_count * 0.15
        return float(np.clip(adjusted, 0.1, 1.0))

    @staticmethod
    def _extract_alternatives(text: str) -> list[str]:
        alternatives = []
        markers = ["或者", "要么", "另一种可能", "也可以", "alternatively", "or"]
        for marker in markers:
            idx = text.lower().find(marker.lower())
            if idx >= 0:
                end = min(idx + 80, len(text))
                alternatives.append(text[idx:end].strip())
        return alternatives[:3]

    @staticmethod
    def _extract_evidence_phrases(text: str) -> list[str]:
        evidence = []
        markers = ["因为", "根据", "引用", "数据", "研究", "because", "since", "evidence", "data"]
        for marker in markers:
            idx = text.lower().find(marker.lower())
            if idx >= 0:
                end = min(idx + 60, len(text))
                evidence.append(text[idx:end].strip())
        return evidence[:5]

    @staticmethod
    def _build_dependency_graph(segments: list[str]) -> dict[int, list[int]]:
        graph = defaultdict(list)
        for i in range(1, len(segments)):
            for prev in range(i):
                prev_words = set(segments[prev].lower().split())
                curr_words = set(segments[i].lower().split())
                if not prev_words or not curr_words:
                    continue
                overlap = len(prev_words & curr_words) / min(len(prev_words), len(curr_words))
                if overlap > 0.15:
                    graph[i].append(prev)
        return dict(graph)


class ExplainabilityEngine:
    """可解释性引擎主类"""

    def __init__(self):
        self.attributor = FeatureAttributor()
        self.tracer = DecisionPathTracer()

    def explain(self, input_text: str, output_text: str,
                 reasoning: str = "") -> ExplanationResult:
        attributions = self.attributor.attribute(input_text, output_text)

        if reasoning:
            decision_path = self.tracer.trace(reasoning)
        else:
            decision_path = self._synthesize_path(input_text, output_text)

        counterfactuals = self._generate_counterfactuals(input_text, output_text)

        confidence_breakdown = self._decompose_confidence(
            input_text, output_text, attributions, decision_path
        )
        overall_confidence = float(np.mean(list(confidence_breakdown.values()))) if confidence_breakdown else 0.5

        summary = self._summarize_explanation(attributions, decision_path, overall_confidence)
        readability = self._assess_readability(output_text)

        return ExplanationResult(
            text=output_text,
            explanation_type=ExplanationType.FEATURE_ATTRIBUTION,
            feature_attributions=attributions,
            decision_path=decision_path,
            counterfactuals=counterfactuals,
            confidence_breakdown=confidence_breakdown,
            overall_confidence=overall_confidence,
            summary=summary,
            readability_score=readability,
        )

    def feature_importance(self, input_text: str,
                            output_text: str) -> list[FeatureAttribution]:
        return self.attributor.attribute(input_text, output_text)

    def trace_decision(self, reasoning_text: str) -> list[DecisionNode]:
        return self.tracer.trace(reasoning_text)

    def contrastive_explain(self, output_a: str, output_b: str,
                              question: str = "") -> dict[str, Any]:
        words_a = set(output_a.lower().split())
        words_b = set(output_b.lower().split())

        shared = words_a & words_b
        unique_a = words_a - words_b
        unique_b = words_b - words_a

        return {
            "output_a_length": len(output_a),
            "output_b_length": len(output_b),
            "shared_terms": len(shared),
            "unique_to_a": len(unique_a),
            "unique_to_b": len(unique_b),
            "key_differences": {
                "a_unique_keywords": list(unique_a)[:10],
                "b_unique_keywords": list(unique_b)[:10],
            },
            "similarity": len(shared) / max(len(words_a | words_b), 1),
        }

    def _synthesize_path(self, input_text: str,
                           output_text: str) -> list[DecisionNode]:
        nodes = []

        nodes.append(DecisionNode(
            step=1, description="接收输入并解析",
            reasoning=f"处理输入: {input_text[:60]}...",
            confidence=1.0,
        ))

        input_sentences = [s.strip() for s in
                           input_text.replace("!", ".").replace("?", ".").split(".")
                           if s.strip()]
        for i, sent in enumerate(input_sentences[:5]):
            nodes.append(DecisionNode(
                step=i + 2,
                description=f"分析输入段 {i+1}",
                reasoning=f"理解: {sent[:80]}",
                confidence=0.8,
                depends_on=[1],
            ))

        nodes.append(DecisionNode(
            step=len(input_sentences[:5]) + 2,
            description="综合信息生成输出",
            reasoning=f"基于以上分析, 生成回答: {output_text[:80]}",
            confidence=0.7,
            depends_on=list(range(2, min(len(input_sentences) + 2, 7))),
        ))

        return nodes

    def _generate_counterfactuals(self, input_text: str,
                                    output_text: str) -> list[CounterfactualExplanation]:
        counterfactuals = []

        sent_markers = r'[。！？.!?]'
        sentences = __import__('re').split(sent_markers, input_text)
        sentences = [s.strip() for s in sentences if s.strip()]

        for sent in sentences[:3]:
            if len(sent.split()) < 3:
                continue
            negated = self._negate_sentence(sent)
            if negated != sent:
                counterfactuals.append(CounterfactualExplanation(
                    original_input=sent,
                    altered_input=negated,
                    original_output=f"基于 '{sent[:30]}...' 的推理",
                    altered_output="条件改变，推理结果可能不同",
                    change_description=f"将 '{sent[:30]}...' 的条件取反",
                    sensitivity=0.6,
                ))

        return counterfactuals[:5]

    @staticmethod
    def _negate_sentence(sentence: str) -> str:
        negations = {
            "是": "不是", "有": "没有", "会": "不会", "能": "不能",
            "is": "is not", "are": "are not", "has": "does not have",
            "can": "cannot", "will": "will not",
        }
        result = sentence
        for pos, neg in negations.items():
            if pos in result:
                result = result.replace(pos, neg, 1)
                break
        return result

    def _decompose_confidence(self, input_text: str, output_text: str,
                                attributions: list[FeatureAttribution],
                                decision_path: list[DecisionNode]) -> dict[str, float]:
        breakdown = {}

        if attributions:
            attr_confidence = np.mean([a.confidence for a in attributions])
            breakdown["feature_attribution"] = float(attr_confidence)

        if decision_path:
            path_confidence = np.mean([n.confidence for n in decision_path])
            breakdown["decision_path"] = float(path_confidence)

        input_words = set(input_text.lower().split())
        output_words = set(output_text.lower().split())
        consistency = len(input_words & output_words) / max(len(output_words), 1)
        breakdown["input_output_alignment"] = float(min(consistency, 1.0))

        output_sentences = len(output_text.split("."))
        if output_sentences > 5:
            breakdown["verbosity_penalty"] = 0.7
        elif output_sentences > 2:
            breakdown["verbosity_penalty"] = 0.9

        return breakdown

    def _summarize_explanation(self, attributions: list[FeatureAttribution],
                                 decision_path: list[DecisionNode],
                                 confidence: float) -> str:
        parts = []

        if attributions:
            top_attrs = sorted(attributions, key=lambda a: a.attribution_score, reverse=True)[:3]
            parts.append(
                f"最显著的影响因素: {'; '.join(a.feature_name[:30] for a in top_attrs)}"
            )

        if decision_path:
            parts.append(f"推理过程共 {len(decision_path)} 步")

        parts.append(f"整体置信度: {confidence:.2f}")

        return "。".join(parts) + "。"

    @staticmethod
    def _assess_readability(text: str) -> float:
        words = text.split()
        if not words:
            return 0.5

        avg_word_len = np.mean([len(w) for w in words])
        readability = 1.0 - max(0, (avg_word_len - 4) / 10.0)

        sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]
        if sentences:
            avg_sent_len = np.mean([len(s.split()) for s in sentences])
            if avg_sent_len > 25:
                readability *= 0.8

        return float(np.clip(readability, 0.1, 1.0))
