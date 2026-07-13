"""
CEE Agent Framework — 专项智能体扩展

新增专项智能体类型:
  - CriticAgent     : 多维度评审与质量把关
  - SynthesizerAgent: 多源信息融合与综合
  - FactCheckerAgent: 声明确认与事实核查
  - PlannerAgent    : 层次化任务规划与资源分配
  - MediatorAgent   : 冲突解决与多方协调
  - CuratorAgent    : 信息甄选与优先级排序
  - EthicistAgent   : 伦理合规审查
"""

from __future__ import annotations

import logging
from typing import Any

from .base_agent import BaseAgent
from .types import (
    AgentCapability,
    AgentConfig,
    AgentPersonality,
    AgentRole,
)

logger = logging.getLogger(__name__)

_DEFAULT_PERSONALITY = AgentPersonality.BALANCED


class CriticAgent(BaseAgent):
    """多维度评审智能体 — 对输出进行全面的质量评估"""

    def __init__(self, config: AgentConfig | None = None):     # noqa: ARG002
        cfg = config or AgentConfig(
            role=AgentRole.CRITIC,
            personality=_DEFAULT_PERSONALITY,
            capabilities=[
                AgentCapability.CRITIQUE, AgentCapability.EVALUATION,
                AgentCapability.QUALITY_CHECK,
            ],
        )
        super().__init__(cfg)

    def critique(self, content: str, dimensions: list[str] | None = None) -> dict[str, Any]:
        dims = dimensions or ["accuracy", "clarity", "completeness", "conciseness", "relevance"]
        scores = {}
        feedback = []

        for dim in dims:
            score = self._score_dimension(content, dim)
            scores[dim] = score
            if score < 0.6:
                feedback.append(f"[{dim}] 需要改进 (当前评分: {score:.2f})")

        return {
            "overall": sum(scores.values()) / max(len(scores), 1),
            "dimension_scores": scores,
            "feedback": feedback,
            "recommended_actions": self._recommend_actions(scores),
        }

    def _score_dimension(self, content: str, dim: str) -> float:
        import re

        if dim == "accuracy":
            speculativeness = sum(
                1 for kw in ["可能", "也许", "估计", "might", "maybe"]
                if kw.lower() in content.lower()
            )
            return max(0.3, 1.0 - speculativeness * 0.15)

        if dim == "clarity":
            sentences = len(re.split(r'[.!?。！？]', content))
            if sentences < 2:
                return 0.4
            return min(sentences / 8.0, 1.0)

        if dim == "completeness":
            length = len(content.split())
            return min(length / 50.0, 1.0) if length > 0 else 0.2

        if dim == "conciseness":
            length = len(content.split())
            return max(0.1, 1.0 - length / 500.0) if length < 500 else 0.1

        if dim == "relevance":
            return 0.7

        return 0.5

    @staticmethod
    def _recommend_actions(scores: dict[str, float]) -> list[str]:
        actions = []
        if scores.get("accuracy", 1.0) < 0.6:
            actions.append("增加确定性表述，减少推测性语言")
        if scores.get("clarity", 1.0) < 0.6:
            actions.append("分解长句，增加结构化标记")
        if scores.get("completeness", 1.0) < 0.6:
            actions.append("补充更多细节和上下文信息")
        if scores.get("conciseness", 1.0) < 0.6:
            actions.append("适当精简内容，去除冗余表述")
        if not actions:
            actions.append("整体质量良好，继续保持")
        return actions


class SynthesizerAgent(BaseAgent):
    """多源信息融合智能体 — 综合多个信息源生成统一输出"""

    def __init__(self, config: AgentConfig | None = None):     # noqa: ARG002
        cfg = config or AgentConfig(
            role=AgentRole.RESEARCH,
            personality=_DEFAULT_PERSONALITY,
            capabilities=[
                AgentCapability.SYNTHESIS, AgentCapability.RESEARCH,
                AgentCapability.SUMMARIZATION,
            ],
        )
        super().__init__(cfg)

    def synthesize(self, sources: list[dict[str, Any]],
                    style: str = "comprehensive") -> dict[str, Any]:
        if not sources:
            return {"synthesis": "", "confidence": 0.0, "sources_used": 0}

        texts = [s.get("content", "") for s in sources]
        weights = [s.get("weight", 1.0) for s in sources]

        key_points = self._extract_key_points(texts)
        contradictions = self._detect_contradictions(texts)
        consensus = self._identify_consensus(texts)

        total_weight = max(sum(weights), 1)
        confidence = total_weight / (total_weight + len(contradictions) * 0.3)

        return {
            "key_points": key_points[:10],
            "contradictions": contradictions[:5],
            "consensus": consensus,
            "source_count": len(sources),
            "confidence": min(confidence, 1.0),
            "style": style,
        }

    def _extract_key_points(self, texts: list[str]) -> list[dict[str, Any]]:
        points = []
        for i, text in enumerate(texts):
            sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]
            for sent in sentences[:3]:
                if len(sent.split()) > 3:
                    points.append({
                        "text": sent[:100],
                        "source_index": i,
                        "length": len(sent.split()),
                    })
        return points

    @staticmethod
    def _detect_contradictions(texts: list[str]) -> list[dict[str, Any]]:
        contradictions = []
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                negation_markers = {
                    "是": "不是", "有": "没有", "会": "不会",
                    "is not": "is", "not": "",
                }

                for pos, neg in negation_markers.items():
                    if pos in texts[i].lower() and neg in texts[j].lower():
                        contradictions.append({
                            "source_a": i, "source_b": j,
                            "type": "negation",
                            "trigger_a": pos, "trigger_b": neg,
                        })
                        break
        return contradictions

    @staticmethod
    def _identify_consensus(texts: list[str]) -> list[str]:
        if not texts:
            return []

        all_words = []
        for t in texts:
            all_words.extend(t.lower().split())

        from collections import Counter
        word_counts = Counter(all_words)

        common_content_words = sorted(
            [(w, c) for w, c in word_counts.items()
             if len(w) > 3 and c >= len(texts) * 0.5],
            key=lambda x: x[1], reverse=True,
        )
        return [w for w, _ in common_content_words[:15]]


class MediatorAgent(BaseAgent):
    """冲突解决智能体 — 协调多方分歧,寻找折衷方案"""

    def __init__(self, config: AgentConfig | None = None):     # noqa: ARG002
        cfg = config or AgentConfig(
            role=AgentRole.CRITIC,
            personality=_DEFAULT_PERSONALITY,
            capabilities=[
                AgentCapability.NEGOTIATION, AgentCapability.CONFLICT_RESOLUTION,
            ],
        )
        super().__init__(cfg)

    def mediate(self, positions: list[dict[str, Any]]) -> dict[str, Any]:
        if not positions:
            return {"resolution": "无分歧需解决", "agreement_level": 1.0}

        common_grounds = self._find_shared_ground(positions)
        compromises = self._propose_compromises(positions)

        agreement = max(0.1, (len(common_grounds) + 1) / (len(positions) + 1))

        return {
            "positions_count": len(positions),
            "shared_ground": common_grounds,
            "compromises": compromises,
            "agreement_level": min(agreement, 1.0),
            "recommendation": self._recommend_resolution(positions, common_grounds),
        }

    def _find_shared_ground(self, positions: list[dict[str, Any]]) -> list[str]:
        shared = []
        texts = [p.get("content", p.get("position", "")) for p in positions]
        if len(texts) < 2:
            return shared

        words_sets = [set(t.lower().split()) for t in texts]
        common_words = words_sets[0]
        for ws in words_sets[1:]:
            common_words = common_words & ws

        shared = [w for w in common_words if len(w) > 2]
        return shared[:20]

    def _propose_compromises(self, positions: list[dict[str, Any]]) -> list[str]:
        compromises = []
        if len(positions) == 2:
            compromises.append("双方各退一步，取中间方案")
            compromises.append("寻找超越当前框架的第三种解决方案")
            compromises.append("分阶段实施：先执行无争议部分，有争议部分延后讨论")
        elif len(positions) > 2:
            compromises.append("多数裁决：以多数意见为基础，兼顾少数派关切")
            compromises.append("权重投票：根据各方专业领域分配不同权重")
            compromises.append("轮值方案：不同场景下采用不同方案的对应部分")
        return compromises

    @staticmethod
    def _recommend_resolution(positions: list[dict[str, Any]],
                                shared_ground: list[str]) -> str:
        if len(shared_ground) > 5:
            return "各方共识基础较强，建议以此为基础展开进一步协商"
        if len(positions) <= 2:
            return "建议进行一对一的深入沟通，寻求利益最大化的共赢方案"
        return "建议分组讨论，先在小组内形成共识再提交全体决策"


class CuratorAgent(BaseAgent):
    """信息策展智能体 — 评估信息价值,排序和筛选"""

    def __init__(self, config: AgentConfig | None = None):     # noqa: ARG002
        cfg = config or AgentConfig(
            role=AgentRole.RESEARCH,
            personality=_DEFAULT_PERSONALITY,
            capabilities=[
                AgentCapability.CURATION, AgentCapability.PRIORITIZATION,
            ],
        )
        super().__init__(cfg)

    def curate(self, items: list[dict[str, Any]],
                criteria: list[str] | None = None) -> dict[str, Any]:
        criteria = criteria or ["relevance", "novelty", "credibility", "impact"]
        scored = []

        for item in items:
            score = self._score_item(item, criteria)
            scored.append({**item, "curation_score": score})

        scored.sort(key=lambda x: x["curation_score"], reverse=True)

        return {
            "ranked_items": scored,
            "top_items": scored[:10],
            "average_score": (
                sum(i["curation_score"] for i in scored) / max(len(scored), 1)
            ) if scored else 0.0,
            "criteria_used": criteria,
            "distribution": self._score_distribution(scored),
        }

    def _score_item(self, item: dict[str, Any], criteria: list[str]) -> float:
        scores = []
        text = item.get("content", item.get("text", ""))

        if "relevance" in criteria:
            scores.append(item.get("relevance", 0.5))

        if "novelty" in criteria:
            unique_words = len(set(text.lower().split()))
            total_words = max(len(text.split()), 1)
            scores.append(min(unique_words / total_words * 1.5, 1.0))

        if "credibility" in criteria:
            scores.append(item.get("credibility", 0.5))

        if "impact" in criteria:
            scores.append(item.get("impact", 0.5))

        return sum(scores) / max(len(scores), 1)

    @staticmethod
    def _score_distribution(scored: list[dict]) -> dict[str, int]:
        dist = {"high": 0, "medium": 0, "low": 0}
        for item in scored:
            s = item.get("curation_score", 0)
            if s > 0.7:
                dist["high"] += 1
            elif s > 0.4:
                dist["medium"] += 1
            else:
                dist["low"] += 1
        return dist


class EthicistAgent(BaseAgent):
    """伦理合规审查智能体"""

    def __init__(self, config: AgentConfig | None = None):     # noqa: ARG002
        cfg = config or AgentConfig(
            role=AgentRole.CRITIC,
            personality=_DEFAULT_PERSONALITY,
            capabilities=[
                AgentCapability.ETHICS_CHECK, AgentCapability.ALIGNMENT,
            ],
        )
        super().__init__(cfg)

    def review(self, content: str) -> dict[str, Any]:
        harm_categories = {
            "violence": self._check_violence(content),
            "bias": self._check_bias(content),
            "privacy": self._check_privacy(content),
            "manipulation": self._check_manipulation(content),
        }

        overall_risk = max(v for v in harm_categories.values())
        passed = overall_risk < 0.5

        return {
            "passed": passed,
            "overall_risk": overall_risk,
            "category_scores": harm_categories,
            "action": "approve" if overall_risk < 0.3
            else "review" if overall_risk < 0.5
            else "reject" if overall_risk < 0.7
            else "block",
            "recommendations": self._ethics_recommendations(harm_categories),
        }

    @staticmethod
    def _check_violence(text: str) -> float:
        keywords = ["kill", "attack", "bomb", "weapon", "violence", "伤害", "攻击", "破坏"]
        count = sum(1 for kw in keywords if kw.lower() in text.lower())
        return min(count * 0.2, 1.0)

    @staticmethod
    def _check_bias(text: str) -> float:
        keywords = ["stereotype", "bias", "discrimination", "刻板", "偏见", "歧视"]
        count = sum(1 for kw in keywords if kw.lower() in text.lower())
        return min(count * 0.25, 1.0)

    @staticmethod
    def _check_privacy(text: str) -> float:
        import re
        patterns = [r"\b\d{3}-\d{2}-\d{4}\b", r"\b\d{3}-\d{3}-\d{4}\b"]
        count = sum(len(re.findall(p, text)) for p in patterns)
        return min(count * 0.15, 1.0)

    @staticmethod
    def _check_manipulation(text: str) -> float:
        keywords = ["manipulate", "deceive", "mislead", "操纵", "欺骗", "误导"]
        count = sum(1 for kw in keywords if kw.lower() in text.lower())
        return min(count * 0.3, 1.0)

    @staticmethod
    def _ethics_recommendations(scores: dict[str, float]) -> list[str]:
        recs = []
        if scores["violence"] > 0.3:
            recs.append("建议审查暴力相关内容")
        if scores["bias"] > 0.3:
            recs.append("注意偏见倾向，建议平衡表述")
        if scores["privacy"] > 0.3:
            recs.append("检测到潜在隐私信息，建议脱敏")
        if scores["manipulation"] > 0.3:
            recs.append("存在操纵性语言风险")
        if not recs:
            recs.append("伦理审查通过")
        return recs
