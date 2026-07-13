"""
类比推理引擎 — 结构化类比生成与跨域映射

实现类似结构映射理论 (SMT) 的类比推理:
  - 类比映射: 识别源域和目标域之间的结构对应关系
  - 类比生成: 基于目标概念自动检索/生成合适的类比
  - 类比评估: 多维度(结构一致性/语义相似性/实用性/新颖性)评分
  - 跨域迁移: 将源域知识迁移到目标域
  - 类比库: 预构建的跨领域类比知识库
  - 反类比检测: 识别不恰当的/误导性的类比
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


logger = logging.getLogger(__name__)


class AnalogyType(Enum):
    STRUCTURAL = "structural"
    FUNCTIONAL = "functional"
    CAUSAL = "causal"
    VISUAL = "visual"
    METAPHORICAL = "metaphorical"
    MATHEMATICAL = "mathematical"


class MappingQuality(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    ADEQUATE = "adequate"
    WEAK = "weak"
    MISLEADING = "misleading"


@dataclass
class Domain:
    name: str
    entities: list[str] = field(default_factory=list)
    relations: list[tuple[str, str, str]] = field(default_factory=list)
    attributes: dict[str, list[str]] = field(default_factory=dict)
    constraints: list[str] = field(default_factory=list)


@dataclass
class AnalogyMapping:
    source_domain: Domain
    target_domain: Domain
    entity_mappings: dict[str, str] = field(default_factory=dict)
    relation_mappings: dict[tuple, tuple] = field(default_factory=dict)
    structural_score: float = 0.0
    semantic_score: float = 0.0
    pragmatic_score: float = 0.0
    novelty_score: float = 0.0
    quality: MappingQuality = MappingQuality.ADEQUATE
    explanation: str = ""


@dataclass
class AnalogyResult:
    source: str
    target: str
    mapping: AnalogyMapping
    analogy_type: AnalogyType
    overall_score: float = 0.0
    key_insight: str = ""
    limitations: list[str] = field(default_factory=list)
    application: str = ""


BUILTIN_ANALOGIES: list[dict[str, Any]] = [
    {
        "source": "水流",
        "target": "电流",
        "type": AnalogyType.FUNCTIONAL,
        "mappings": {"水流": "电流", "水压": "电压", "水管粗细": "电阻",
                      "水流量": "电流量", "水泵": "电池"},
        "relations": [("水泵", "产生", "水压"), ("水压", "驱动", "水流"),
                      ("水管粗细", "阻碍", "水流")],
    },
    {
        "source": "电脑CPU",
        "target": "人脑",
        "type": AnalogyType.FUNCTIONAL,
        "mappings": {"CPU": "神经元", "内存": "短期记忆", "硬盘": "长期记忆",
                      "计算": "思考", "总线": "神经网络连接"},
    },
    {
        "source": "生态系统",
        "target": "经济市场",
        "type": AnalogyType.STRUCTURAL,
        "mappings": {"物种": "企业", "资源": "资本", "捕食": "竞争",
                      "共生": "合作", "进化": "创新"},
    },
    {
        "source": "建筑蓝图",
        "target": "DNA",
        "type": AnalogyType.STRUCTURAL,
        "mappings": {"蓝图": "DNA序列", "房间": "器官", "建筑": "生物体",
                      "建筑师": "进化", "施工": "蛋白质合成"},
    },
    {
        "source": "战争",
        "target": "体育比赛",
        "type": AnalogyType.METAPHORICAL,
        "mappings": {"军队": "队伍", "武器": "技能", "战术": "策略",
                      "胜利": "胜利", "战场": "赛场"},
    },
    {
        "source": "树",
        "target": "知识体系",
        "type": AnalogyType.STRUCTURAL,
        "mappings": {"树根": "基础原理", "树干": "核心理论", "树枝": "分支学科",
                      "树叶": "具体知识", "果实": "应用成果"},
    },
    {
        "source": "河流",
        "target": "时间",
        "type": AnalogyType.METAPHORICAL,
        "mappings": {"水流": "时间流逝", "源头": "过去", "入海": "未来",
                      "漩涡": "关键时刻", "支流": "不同人生选择"},
    },
    {
        "source": "锁与钥匙",
        "target": "酶与底物",
        "type": AnalogyType.STRUCTURAL,
        "mappings": {"锁": "酶", "钥匙": "底物", "钥匙齿": "分子结构",
                      "开锁": "催化反应", "锁孔": "活性位点"},
    },
]


class StructureMapper:
    """结构映射引擎 — 实现类比映射的核心算法"""

    def map_structures(self, source: Domain, target: Domain) -> dict[str, Any]:
        entity_mapping, entity_score = self._map_entities(source, target)
        rel_mapping, rel_score = self._map_relations(source, target, entity_mapping)
        attr_mapping, attr_score = self._map_attributes(source, target)

        structural = self._structural_consistency(entity_mapping, rel_mapping)
        semantic = (entity_score + rel_score + attr_score) / 3

        return {
            "entity_mappings": entity_mapping,
            "relation_mappings": rel_mapping,
            "structural_score": structural,
            "semantic_score": semantic,
        }

    def _map_entities(self, source: Domain, target: Domain) -> tuple[dict, float]:
        mapping = {}
        score = 0.0
        matched = set()

        for s_ent in source.entities:
            best_match = None
            best_similarity = 0.0
            s_words = set(s_ent.lower().split())
            t_words_all = [t.lower().split() for t in target.entities]

            for i, (t_ent, t_words) in enumerate(zip(target.entities, t_words_all)):
                if t_ent in matched:
                    continue
                sim = self._word_similarity(s_words, set(t_words))
                if sim > best_similarity:
                    best_similarity = sim
                    best_match = t_ent

            if best_match and best_similarity > 0.05:
                mapping[s_ent] = best_match
                matched.add(best_match)
                score += best_similarity

        final_score = score / max(len(source.entities), 1) if source.entities else 0.5
        return mapping, min(final_score, 1.0)

    def _map_relations(self, source: Domain, target: Domain,
                        entity_mapping: dict) -> tuple[dict, float]:
        mapping = {}
        score = 0.0

        for rel in source.relations:
            s_a, s_rel, s_b = rel
            t_a = entity_mapping.get(s_a, s_a)
            t_b = entity_mapping.get(s_b, s_b)

            for t_rel in target.relations:
                t_ta, t_rel_type, t_tb = t_rel
                if (t_a == t_ta and t_b == t_tb) or (
                    self._word_similarity({t_a}, {t_ta}) > 0.5
                    and self._word_similarity({t_b}, {t_tb}) > 0.5
                ):
                    mapping[(s_a, s_rel, s_b)] = t_rel
                    score += 1.0
                    break

        final_score = score / max(len(source.relations), 1) if source.relations else 0.5
        return mapping, min(final_score, 1.0)

    def _map_attributes(self, source: Domain, target: Domain) -> tuple[dict, float]:
        score = 0.0
        count = 0
        for key, s_attrs in source.attributes.items():
            if key in target.attributes:
                s_set = set(a.lower() for a in s_attrs)
                t_set = set(a.lower() for a in target.attributes[key])
                overlap = len(s_set & t_set)
                score += overlap / max(len(s_set | t_set), 1)
                count += 1
        return {}, score / max(count, 1) if count > 0 else 0.5

    @staticmethod
    def _word_similarity(words_a: set, words_b: set) -> float:
        if not words_a or not words_b:
            return 0.0

        direct_overlap = len(words_a & words_b) / min(len(words_a), len(words_b))

        partial_score = 0.0
        for wa in words_a:
            for wb in words_b:
                if len(wa) > 1 and len(wb) > 1:
                    if wa[:2] == wb[:2] or wa[-2:] == wb[-2:]:
                        partial_score += 0.3
                    if abs(len(wa) - len(wb)) <= 1 and (
                        wa[0] == wb[0] or wa[-1] == wb[-1]
                    ):
                        partial_score += 0.2

        n_pairs = len(words_a) * len(words_b)
        partial_score = partial_score / max(n_pairs, 1) if n_pairs > 0 else 0.0

        return direct_overlap * 0.7 + partial_score * 0.3

    @staticmethod
    def _structural_consistency(entity_mapping: dict,
                                 rel_mapping: dict) -> float:
        if not entity_mapping:
            return 0.3

        one_to_one = len(entity_mapping.values()) == len(set(entity_mapping.values()))
        one_to_one_score = 0.8 if one_to_one else 0.3

        mapped_entities = len(entity_mapping)
        mapped_relations = len(rel_mapping)
        relation_score = min(mapped_relations / max(mapped_entities, 1), 1.0) if mapped_entities else 0.0

        return (one_to_one_score * 0.6 + relation_score * 0.4)


class AnalogyEngine:
    """类比推理引擎主类"""

    def __init__(self):
        self.mapper = StructureMapper()
        self._analogy_library: list[dict[str, Any]] = list(BUILTIN_ANALOGIES)
        self._custom_analogies: dict[str, list[dict[str, Any]]] = defaultdict(list)

    def search_analogies(self, target_concept: str, k: int = 5) -> list[dict[str, Any]]:
        results = []
        target_words = set(target_concept.lower().split())

        for analogy in self._analogy_library:
            target_text = analogy["target"].lower()
            source_text = analogy["source"].lower()

            target_relevance = self._calculate_relevance(target_words, target_text)
            source_relevance = self._calculate_relevance(target_words, source_text)

            combined_relevance = max(target_relevance, source_relevance * 0.5)

            if combined_relevance > 0.1:
                results.append((combined_relevance, analogy))

        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:k]]

    @staticmethod
    def _calculate_relevance(query_words: set, text: str) -> float:
        text_words = set(text.split())
        if not query_words:
            return 0.0
        return len(query_words & text_words) / len(query_words)

    def generate_analogy(self, source: Domain, target: Domain) -> AnalogyResult:
        mapping_raw = self.mapper.map_structures(source, target)

        mapping = AnalogyMapping(
            source_domain=source,
            target_domain=target,
            entity_mappings=mapping_raw["entity_mappings"],
            relation_mappings=mapping_raw["relation_mappings"],
            structural_score=mapping_raw["structural_score"],
            semantic_score=mapping_raw["semantic_score"],
        )

        mapping.pragmatic_score = self._pragmatic_score(mapping)
        mapping.novelty_score = self._novelty_score(mapping)
        mapping.quality = self._assess_quality(mapping)
        mapping.explanation = self._generate_explanation(mapping)

        overall = (
            mapping.structural_score * 0.30
            + mapping.semantic_score * 0.30
            + mapping.pragmatic_score * 0.25
            + mapping.novelty_score * 0.15
        )

        analogy_type = self._classify_analogy_type(mapping)

        return AnalogyResult(
            source=source.name,
            target=target.name,
            mapping=mapping,
            analogy_type=analogy_type,
            overall_score=overall,
            key_insight=self._generate_insight(mapping),
            limitations=self._identify_limitations(mapping),
            application=self._suggest_application(mapping, analogy_type),
        )

    def quick_analogy(self, target: str) -> AnalogyResult | None:
        results = self.search_analogies(target, k=1)
        if not results:
            return None

        analogy = results[0]
        source_domain = Domain(
            name=analogy["source"],
            entities=list(analogy["mappings"].keys()),
            relations=[(a, r, b) for a, r, b in analogy.get("relations", [])],
        )
        target_domain = Domain(
            name=analogy["target"],
            entities=list(analogy["mappings"].values()),
            attributes={},
        )

        result = self.generate_analogy(source_domain, target_domain)
        result.mapping.entity_mappings = analogy["mappings"]
        return result

    def add_analogy(self, source: str, target: str,
                     mappings: dict[str, str],
                     analogy_type: AnalogyType = AnalogyType.STRUCTURAL) -> None:
        self._analogy_library.append({
            "source": source, "target": target,
            "type": analogy_type,
            "mappings": mappings,
            "relations": [],
        })

    def _pragmatic_score(self, mapping: AnalogyMapping) -> float:
        score = 0.0

        entity_coverage = len(mapping.entity_mappings) / max(
            len(mapping.source_domain.entities), 1
        )
        score += entity_coverage * 0.5

        relation_coverage = len(mapping.relation_mappings) / max(
            len(mapping.source_domain.relations), 1
        ) if mapping.source_domain.relations else 0.5
        score += relation_coverage * 0.5

        return min(score, 1.0)

    def _novelty_score(self, mapping: AnalogyMapping) -> float:
        if not self._analogy_library:
            return 0.8

        s_name = mapping.source_domain.name.lower()
        t_name = mapping.target_domain.name.lower()

        for analogy in self._analogy_library:
            if (analogy["source"].lower() == s_name
                    and analogy["target"].lower() == t_name):
                return 0.1
            if s_name in analogy["source"].lower() or t_name in analogy["target"].lower():
                return 0.4

        return 0.7

    def _assess_quality(self, mapping: AnalogyMapping) -> MappingQuality:
        avg = (mapping.structural_score + mapping.semantic_score
               + mapping.pragmatic_score) / 3

        if avg > 0.8:
            return MappingQuality.EXCELLENT
        if avg > 0.6:
            return MappingQuality.GOOD
        if avg > 0.4:
            return MappingQuality.ADEQUATE
        if avg > 0.2:
            return MappingQuality.WEAK
        return MappingQuality.MISLEADING

    def _classify_analogy_type(self, mapping: AnalogyMapping) -> AnalogyType:
        rel_count = len(mapping.relation_mappings)
        ent_count = len(mapping.entity_mappings)

        if rel_count > ent_count * 0.8:
            return AnalogyType.CAUSAL
        if rel_count > ent_count * 0.4:
            return AnalogyType.STRUCTURAL
        if ent_count > 5:
            return AnalogyType.FUNCTIONAL
        return AnalogyType.METAPHORICAL

    def _generate_explanation(self, mapping: AnalogyMapping) -> str:
        parts = []
        s_name = mapping.source_domain.name
        t_name = mapping.target_domain.name

        parts.append(f"'{s_name}'与'{t_name}'之间存在类比关系")

        if mapping.entity_mappings:
            sample = list(mapping.entity_mappings.items())[:3]
            ent_desc = "、".join(
                f"{s}对应{t}" for s, t in sample
            )
            parts.append(f"核心映射: {ent_desc}")

        parts.append(
            f"结构一致性: {mapping.structural_score:.2f}, "
            f"语义匹配度: {mapping.semantic_score:.2f}"
        )

        return "。".join(parts) + "。"

    def _generate_insight(self, mapping: AnalogyMapping) -> str:
        s_name = mapping.source_domain.name
        t_name = mapping.target_domain.name

        if mapping.quality == MappingQuality.EXCELLENT:
            return f"通过观察'{s_name}'的结构，可以深入理解'{t_name}'的运行机制"
        if mapping.quality == MappingQuality.GOOD:
            return f"'{s_name}'为理解'{t_name}'提供了一种有用的视角"
        if mapping.quality == MappingQuality.ADEQUATE:
            return f"'{s_name}'的部分特征可用于类比'{t_name}'，但存在差异"
        return f"'{s_name}'与'{t_name}'的类比需要谨慎使用"

    def _identify_limitations(self, mapping: AnalogyMapping) -> list[str]:
        limitations = []

        if mapping.structural_score < 0.5:
            limitations.append("结构对应性较弱，源域与目标域的关系模式差异较大")

        if mapping.semantic_score < 0.4:
            limitations.append("语义匹配度不足，实体间的深层含义可能存在差异")

        if mapping.pragmatic_score < 0.5:
            limitations.append("实际应用价值有限，类比涵盖的维度不够全面")

        unmapped_source = len(mapping.source_domain.entities) - len(mapping.entity_mappings)
        if unmapped_source > 0:
            limitations.append(f"源域中有 {unmapped_source} 个实体未找到对应映射")

        if not limitations:
            limitations.append("当前类比质量良好，无明显局限性")

        return limitations

    def _suggest_application(self, mapping: AnalogyMapping,
                              analogy_type: AnalogyType) -> str:
        suggestions = {
            AnalogyType.STRUCTURAL: "可用于学习新概念的结构框架，帮助初学者建立系统认识",
            AnalogyType.FUNCTIONAL: "适合解释系统的工作原理，适用于技术文档和教学场景",
            AnalogyType.CAUSAL: "可用于分析因果关系链条，适用于科学推理和问题诊断",
            AnalogyType.METAPHORICAL: "适合用于创意写作和概念传播，增强表达的表现力",
            AnalogyType.MATHEMATICAL: "适用于科学建模和定量分析场景",
            AnalogyType.VISUAL: "适合需要空间想象和可视化呈现的场景",
        }
        return suggestions.get(analogy_type, "可用于通用认知辅助和概念理解")

    def batch_analogies(self, targets: list[str]) -> list[dict[str, Any]]:
        results = []
        for target in targets:
            analogy = self.quick_analogy(target)
            if analogy:
                results.append({
                    "target": target,
                    "source": analogy.source,
                    "score": round(analogy.overall_score, 4),
                    "insight": analogy.key_insight,
                })
            else:
                results.append({
                    "target": target,
                    "source": None,
                    "score": 0.0,
                    "insight": "未找到合适的类比",
                })
        return results
