"""
知识图谱引擎 - Knowledge Graph Engine

核心理念:
  将信息组织为实体-关系网络，支持结构化推理。

  实体 (Entity): 概念、人物、地点、事件、物体、属性
  关系 (Relation): IS_A / HAS / PART_OF / CAUSES / RELATED / SYNONYM / OPPOSITE
  图谱 (Graph): 邻接表存储的有向加权图

  能力:
  - 实体与关系的增删
  - 按类型/谓词/置信度查询
  - BFS 路径查找
  - N-hop 邻域子图提取
  - 规则实体抽取 + 共现关系提取
  - 传递推理、对称检测、矛盾检测、置信度传播
  - JSON 序列化 / DOT 可视化导出

双轨制:
  - 工程版: 邻接表 BFS + 规则抽取 + 传递闭包
  - 理论版: PageRank 中心性 + 谱聚类 + 图论数学基础

图论基础 (理论版注释):
  邻接矩阵 A: A[i][j] = weight if edge(i,j) exists else 0
  度矩阵 D: D[i][i] = sum of outgoing weights from node i
  拉普拉斯矩阵 L = D - A,  归一化拉普拉斯 L_norm = I - D^(-1/2) A D^(-1/2)
  PageRank: r = (1-d)/N * 1 + d * A * D^(-1) * r
  谱聚类: 对 L_norm 的前 k 个最小非零特征值对应的特征向量做 k-means
"""

from __future__ import annotations

import itertools
import json
import logging
import re
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
# 枚举
# ═══════════════════════════════════════════════════════════════════════


class EntityType(Enum):
    CONCEPT = "concept"
    PERSON = "person"
    PLACE = "place"
    EVENT = "event"
    OBJECT = "object"
    ATTRIBUTE = "attribute"


class Predicate(Enum):
    IS_A = "is_a"
    HAS = "has"
    PART_OF = "part_of"
    CAUSES = "causes"
    RELATED = "related"
    SYNONYM = "synonym"
    OPPOSITE = "opposite"

    @property
    def is_transitive(self) -> bool:
        return self in (Predicate.IS_A, Predicate.PART_OF)

    @property
    def is_symmetric(self) -> bool:
        return self in (Predicate.SYNONYM, Predicate.RELATED)

    @property
    def inverse(self) -> Predicate | None:
        _inverse_map: dict[Predicate, Predicate] = {
            Predicate.IS_A: Predicate.HAS,
            Predicate.HAS: Predicate.IS_A,
            Predicate.PART_OF: Predicate.HAS,
            Predicate.SYNONYM: Predicate.SYNONYM,
            Predicate.OPPOSITE: Predicate.OPPOSITE,
        }
        return _inverse_map.get(self)


class QueryOperator(Enum):
    AND = "and"
    OR = "or"


# ═══════════════════════════════════════════════════════════════════════
# 数据结构
# ═══════════════════════════════════════════════════════════════════════


@dataclass
class Entity:
    """知识图谱中的实体节点。

    理论视角: 图 G=(V,E) 中的顶点 v ∈ V。
    每个顶点携带类型标签 l(v) ∈ EntityType 和置信度 c(v) ∈ [0,1]。
    """

    id: str
    name: str
    type: EntityType = EntityType.CONCEPT
    properties: dict[str, Any] = field(default_factory=dict)
    confidence: float = 1.0
    source: str = ""

    def __post_init__(self) -> None:
        self.confidence = max(0.0, min(1.0, self.confidence))

    def __hash__(self) -> int:
        return hash(self.id)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type.value,
            "properties": self.properties,
            "confidence": self.confidence,
            "source": self.source,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Entity:
        return cls(
            id=data["id"],
            name=data["name"],
            type=EntityType(data["type"]),
            properties=data.get("properties", {}),
            confidence=data.get("confidence", 1.0),
            source=data.get("source", ""),
        )


@dataclass
class Relation:
    """知识图谱中的有向加权边。

    理论视角: 图 G=(V,E) 中的有向边 e=(u,v) ∈ E，
    标签为谓词 p(e) ∈ Predicate，权重 w(e) ∈ [0,1]。
    """

    subject_id: str
    predicate: Predicate
    object_id: str
    weight: float = 1.0
    evidence: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.weight = max(0.0, min(1.0, self.weight))

    @property
    def key(self) -> tuple[str, str, str]:
        return (self.subject_id, self.predicate.value, self.object_id)

    def to_dict(self) -> dict[str, Any]:
        return {
            "subject_id": self.subject_id,
            "predicate": self.predicate.value,
            "object_id": self.object_id,
            "weight": self.weight,
            "evidence": self.evidence,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Relation:
        return cls(
            subject_id=data["subject_id"],
            predicate=Predicate(data["predicate"]),
            object_id=data["object_id"],
            weight=data.get("weight", 1.0),
            evidence=data.get("evidence", []),
        )


@dataclass
class GraphQuery:
    """图谱查询条件。

    支持按实体类型、谓词、置信度区间、权重区间、深度限制过滤。
    """

    entity_types: list[EntityType] = field(default_factory=list)
    predicates: list[Predicate] = field(default_factory=list)
    confidence_range: tuple[float, float] = (0.0, 1.0)
    weight_range: tuple[float, float] = (0.0, 1.0)
    depth_limit: int = 5
    operator: QueryOperator = QueryOperator.AND
    entity_id_pattern: str = ""
    max_results: int = 100

    def matches_entity(self, entity: Entity) -> bool:
        if self.entity_types and entity.type not in self.entity_types:
            return False
        if not (self.confidence_range[0] <= entity.confidence <= self.confidence_range[1]):
            return False
        if self.entity_id_pattern and not re.search(self.entity_id_pattern, entity.id):
            return False
        return True

    def matches_relation(self, relation: Relation) -> bool:
        if self.predicates and relation.predicate not in self.predicates:
            return False
        if not (self.weight_range[0] <= relation.weight <= self.weight_range[1]):
            return False
        return True


class GraphQueryBuilder:
    """流式查询构建器。"""

    def __init__(self) -> None:
        self._query = GraphQuery()

    def with_entity_type(self, *types: EntityType) -> GraphQueryBuilder:
        self._query.entity_types = list(types)
        return self

    def with_predicate(self, *predicates: Predicate) -> GraphQueryBuilder:
        self._query.predicates = list(predicates)
        return self

    def with_confidence(self, min_c: float, max_c: float = 1.0) -> GraphQueryBuilder:
        self._query.confidence_range = (max(0.0, min_c), min(1.0, max_c))
        return self

    def with_weight(self, min_w: float, max_w: float = 1.0) -> GraphQueryBuilder:
        self._query.weight_range = (max(0.0, min_w), min(1.0, max_w))
        return self

    def with_depth(self, depth: int) -> GraphQueryBuilder:
        self._query.depth_limit = depth
        return self

    def with_operator(self, op: QueryOperator) -> GraphQueryBuilder:
        self._query.operator = op
        return self

    def with_id_pattern(self, pattern: str) -> GraphQueryBuilder:
        self._query.entity_id_pattern = pattern
        return self

    def with_max_results(self, n: int) -> GraphQueryBuilder:
        self._query.max_results = n
        return self

    def build(self) -> GraphQuery:
        return self._query


# ═══════════════════════════════════════════════════════════════════════
# 知识图谱核心
# ═══════════════════════════════════════════════════════════════════════


class KnowledgeGraph:
    """知识图谱核心数据结构。

    存储模型:
      - 邻接表: dict[str, set[tuple[str, str, float]]]
        from_id -> {(to_id, predicate_value, weight)}
      - 反向邻接表: 用于高效查询入边
      - 实体字典: dict[str, Entity]
      - 类型索引: dict[EntityType, set[str]]

    理论视角:
      有向加权图 G = (V, E, w, l)
      V: 实体节点集合, E: 关系边集合
      w: E -> [0,1] 权重函数
      l: V -> EntityType 类型函数
    """

    def __init__(self) -> None:
        self._entities: dict[str, Entity] = {}
        self._adjacency: dict[str, set[tuple[str, str, float]]] = {}
        self._reverse_adjacency: dict[str, set[tuple[str, str, float]]] = {}
        self._type_index: dict[EntityType, set[str]] = {t: set() for t in EntityType}

    # ---- 实体操作 ----

    def add_entity(self, entity: Entity) -> None:
        """添加实体节点。"""
        self._entities[entity.id] = entity
        self._type_index[entity.type].add(entity.id)
        if entity.id not in self._adjacency:
            self._adjacency[entity.id] = set()
        if entity.id not in self._reverse_adjacency:
            self._reverse_adjacency[entity.id] = set()
        logger.debug("Added entity: %s (%s)", entity.id, entity.type.value)

    def remove_entity(self, entity_id: str) -> None:
        """移除实体及其所有关联边。"""
        entity = self._entities.pop(entity_id, None)
        if entity is None:
            return

        self._type_index[entity.type].discard(entity_id)

        for to_id, pred, _ in list(self._adjacency.get(entity_id, set())):
            rev_set = self._reverse_adjacency.get(to_id, set())
            rev_set.discard((entity_id, pred, 0.0))
        self._adjacency.pop(entity_id, None)

        for from_id, pred, _ in list(self._reverse_adjacency.get(entity_id, set())):
            fwd_set = self._adjacency.get(from_id, set())
            fwd_set.discard((entity_id, pred, 0.0))
        self._reverse_adjacency.pop(entity_id, None)

    def get_entity(self, entity_id: str) -> Entity | None:
        return self._entities.get(entity_id)

    def has_entity(self, entity_id: str) -> bool:
        return entity_id in self._entities

    @property
    def entity_count(self) -> int:
        return len(self._entities)

    # ---- 关系操作 ----

    def add_relation(self, relation: Relation) -> None:
        """添加关系边。

        若端点不存在则自动创建占位实体。
        """
        if relation.subject_id not in self._entities:
            self.add_entity(Entity(
                id=relation.subject_id,
                name=relation.subject_id,
                confidence=0.5,
                source="auto",
            ))
        if relation.object_id not in self._entities:
            self.add_entity(Entity(
                id=relation.object_id,
                name=relation.object_id,
                confidence=0.5,
                source="auto",
            ))

        edge_tuple = (relation.object_id, relation.predicate.value, relation.weight)
        self._adjacency.setdefault(relation.subject_id, set()).add(edge_tuple)

        rev_tuple = (relation.subject_id, relation.predicate.value, relation.weight)
        self._reverse_adjacency.setdefault(relation.object_id, set()).add(rev_tuple)

    def remove_relation(
        self, subject_id: str, predicate: Predicate, object_id: str
    ) -> bool:
        """移除关系边，返回是否成功。"""
        fwd_set = self._adjacency.get(subject_id, set())
        removed = False
        for to_id, pred_val, weight in list(fwd_set):
            if to_id == object_id and pred_val == predicate.value:
                fwd_set.discard((to_id, pred_val, weight))
                removed = True
                break

        rev_set = self._reverse_adjacency.get(object_id, set())
        for from_id, pred_val, weight in list(rev_set):
            if from_id == subject_id and pred_val == predicate.value:
                rev_set.discard((from_id, pred_val, weight))
                break

        return removed

    def get_outgoing_relations(self, entity_id: str) -> list[tuple[str, Predicate, float]]:
        """获取指定实体的所有出边。"""
        edges = self._adjacency.get(entity_id, set())
        return [(to_id, Predicate(pred), weight) for to_id, pred, weight in edges]

    def get_incoming_relations(self, entity_id: str) -> list[tuple[str, Predicate, float]]:
        """获取指定实体的所有入边。"""
        edges = self._reverse_adjacency.get(entity_id, set())
        return [(from_id, Predicate(pred), weight) for from_id, pred, weight in edges]

    def get_relation(
        self, subject_id: str, predicate: Predicate, object_id: str
    ) -> Relation | None:
        """查找指定关系。"""
        for to_id, pred_val, weight in self._adjacency.get(subject_id, set()):
            if to_id == object_id and pred_val == predicate.value:
                return Relation(
                    subject_id=subject_id,
                    predicate=predicate,
                    object_id=object_id,
                    weight=weight,
                )
        return None

    @property
    def relation_count(self) -> int:
        return sum(len(edges) for edges in self._adjacency.values())

    # ---- 查询 ----

    def query_entities(self, query: GraphQuery | None = None) -> list[Entity]:
        """按查询条件过滤实体。"""
        if query is None:
            query = GraphQuery()
        results = []
        for entity in self._entities.values():
            if query.matches_entity(entity):
                results.append(entity)
                if len(results) >= query.max_results:
                    break
        return results

    def query_relations(self, query: GraphQuery | None = None) -> list[Relation]:
        """按查询条件过滤关系。"""
        if query is None:
            query = GraphQuery()
        results = []
        for subj_id, edges in self._adjacency.items():
            subj_entity = self._entities.get(subj_id)
            for to_id, pred_val, weight in edges:
                obj_entity = self._entities.get(to_id)
                relation = Relation(
                    subject_id=subj_id,
                    predicate=Predicate(pred_val),
                    object_id=to_id,
                    weight=weight,
                )
                if query.matches_relation(relation):
                    if subj_entity is not None and query.entity_types:
                        if not query.matches_entity(subj_entity):
                            if obj_entity is None or not query.matches_entity(obj_entity):
                                continue
                    results.append(relation)
                    if len(results) >= query.max_results:
                        return results
        return results

    def get_entities_by_type(self, entity_type: EntityType) -> list[Entity]:
        """按类型获取实体。"""
        return [
            self._entities[eid]
            for eid in self._type_index.get(entity_type, set())
            if eid in self._entities
        ]

    def get_relations_by_predicate(self, predicate: Predicate) -> list[Relation]:
        """按谓词获取所有关系。"""
        results = []
        for subj_id, edges in self._adjacency.items():
            for to_id, pred_val, weight in edges:
                if pred_val == predicate.value:
                    results.append(Relation(
                        subject_id=subj_id,
                        predicate=predicate,
                        object_id=to_id,
                        weight=weight,
                    ))
        return results

    # ---- 路径查找 ----

    def find_path(
        self,
        from_id: str,
        to_id: str,
        max_depth: int = 5,
        predicate_filter: list[Predicate] | None = None,
    ) -> list[tuple[str, Predicate, str]] | None:
        """BFS 最短路径查找。

        Returns:
            路径边列表 [(from, predicate, to), ...]，或 None 表示不可达。

        理论视角:
          无权 BFS 保证了无权图的最短路径。
          若需加权最短路径，应使用 Dijkstra 算法。
        """
        if from_id not in self._entities or to_id not in self._entities:
            return None
        if from_id == to_id:
            return []

        pred_values: set[str] | None = None
        if predicate_filter:
            pred_values = {p.value for p in predicate_filter}

        queue: deque[tuple[str, list[tuple[str, Predicate, str]]]] = deque()
        queue.append((from_id, []))
        visited: set[str] = {from_id}

        while queue:
            current, path = queue.popleft()
            if len(path) >= max_depth:
                continue

            for neighbor_id, pred_val, weight in self._adjacency.get(current, set()):
                if pred_values is not None and pred_val not in pred_values:
                    continue
                if neighbor_id in visited:
                    continue

                predicate = Predicate(pred_val)
                new_path = path + [(current, predicate, neighbor_id)]

                if neighbor_id == to_id:
                    return new_path

                visited.add(neighbor_id)
                queue.append((neighbor_id, new_path))

        return None

    def find_all_paths(
        self,
        from_id: str,
        to_id: str,
        max_depth: int = 5,
        max_paths: int = 10,
    ) -> list[list[tuple[str, Predicate, str]]]:
        """查找所有路径 (DFS with depth limit)。"""
        if from_id not in self._entities or to_id not in self._entities:
            return []
        if from_id == to_id:
            return [[]]

        results: list[list[tuple[str, Predicate, str]]] = []

        def _dfs(
            current: str,
            path: list[tuple[str, Predicate, str]],
            visited: set[str],
        ) -> None:
            if len(results) >= max_paths:
                return
            if len(path) >= max_depth:
                return
            for neighbor_id, pred_val, weight in self._adjacency.get(current, set()):
                if neighbor_id in visited:
                    continue
                predicate = Predicate(pred_val)
                new_path = path + [(current, predicate, neighbor_id)]
                if neighbor_id == to_id:
                    results.append(new_path)
                    if len(results) >= max_paths:
                        return
                    continue
                visited.add(neighbor_id)
                _dfs(neighbor_id, new_path, visited)
                visited.discard(neighbor_id)

        _dfs(from_id, [], {from_id})
        return results

    # ---- 子图提取 ----

    def subgraph(self, center_id: str, hops: int = 1) -> KnowledgeGraph:
        """提取以 center_id 为中心的 N-hop 邻域子图。

        理论视角:
          N-hop 邻域: N_hop(v) = {u ∈ V | dist(v,u) ≤ hops}
          子图 G_sub = (V_sub, E_sub) 其中 V_sub = N_hop(v)
          E_sub = {(u,v,w) ∈ E | u,v ∈ V_sub}
        """
        sub = KnowledgeGraph()
        if center_id not in self._entities:
            return sub

        center = self._entities[center_id]
        sub.add_entity(Entity(
            id=center.id,
            name=center.name,
            type=center.type,
            properties=dict(center.properties),
            confidence=center.confidence,
            source=center.source,
        ))

        visited: set[str] = {center_id}
        frontier: set[str] = {center_id}

        for _ in range(hops):
            next_frontier: set[str] = set()
            for node_id in frontier:
                for to_id, pred_val, weight in self._adjacency.get(node_id, set()):
                    if to_id not in visited and to_id in self._entities:
                        e = self._entities[to_id]
                        sub.add_entity(Entity(
                            id=e.id, name=e.name, type=e.type,
                            properties=dict(e.properties),
                            confidence=e.confidence, source=e.source,
                        ))
                        visited.add(to_id)
                        next_frontier.add(to_id)
                    if to_id in self._entities:
                        sub.add_relation(Relation(
                            subject_id=node_id,
                            predicate=Predicate(pred_val),
                            object_id=to_id,
                            weight=weight,
                        ))
                for from_id, pred_val, weight in self._reverse_adjacency.get(node_id, set()):
                    if from_id not in visited and from_id in self._entities:
                        e = self._entities[from_id]
                        sub.add_entity(Entity(
                            id=e.id, name=e.name, type=e.type,
                            properties=dict(e.properties),
                            confidence=e.confidence, source=e.source,
                        ))
                        visited.add(from_id)
                        next_frontier.add(from_id)
                    if from_id in self._entities:
                        re = self.get_relation(from_id, Predicate(pred_val), node_id)
                        sub.add_relation(Relation(
                            subject_id=from_id,
                            predicate=Predicate(pred_val),
                            object_id=node_id,
                            weight=weight,
                            evidence=re.evidence if re else [],
                        ))
            frontier = next_frontier

        return sub

    # ---- 遍历 ----

    def bfs_traverse(
        self, start_id: str, max_depth: int = 5
    ) -> list[tuple[str, int]]:
        """BFS 遍历，返回 (entity_id, depth) 列表。"""
        if start_id not in self._entities:
            return []
        result: list[tuple[str, int]] = []
        visited: set[str] = {start_id}
        queue: deque[tuple[str, int]] = deque([(start_id, 0)])
        while queue:
            current, depth = queue.popleft()
            result.append((current, depth))
            if depth >= max_depth:
                continue
            for neighbor_id, _, _ in self._adjacency.get(current, set()):
                if neighbor_id not in visited:
                    visited.add(neighbor_id)
                    queue.append((neighbor_id, depth + 1))
        return result

    # ---- 工具 ----

    def clear(self) -> None:
        self._entities.clear()
        self._adjacency.clear()
        self._reverse_adjacency.clear()
        self._type_index = {t: set() for t in EntityType}

    def iter_entities(self):
        """惰性迭代所有实体。"""
        return iter(self._entities.values())

    def iter_relations(self):
        """惰性迭代所有关系。"""
        for subj_id, edges in self._adjacency.items():
            for to_id, pred_val, weight in edges:
                yield Relation(
                    subject_id=subj_id,
                    predicate=Predicate(pred_val),
                    object_id=to_id,
                    weight=weight,
                )

    def __contains__(self, entity_id: str) -> bool:
        return entity_id in self._entities

    def __len__(self) -> int:
        return len(self._entities)


# ═══════════════════════════════════════════════════════════════════════
# 实体抽取器
# ═══════════════════════════════════════════════════════════════════════


class EntityExtractor:
    """基于规则的实体抽取器。

    双轨制:
      工程版: 正则 + 关键词匹配
      理论版: 命名实体识别 (NER) + 条件随机场 (CRF) 序列标注
         P(y|x) = exp(Σ λ_k f_k(y_i, y_{i-1}, x, i)) / Z(x)
         其中 f_k 为特征函数, λ_k 为学得的权重。
    """

    _PERSON_TITLES = {
        "先生", "女士", "教授", "博士", "总统", "主席", "总理",
        "局长", "部长", "经理", "CEO", "CFO", "CTO", "院长", "校长",
        "mr", "mrs", "ms", "dr", "prof", "mr.", "mrs.", "ms.", "dr.", "prof.",
    }

    _PERSON_FIRST_NAMES = {
        "alice", "bob", "charlie", "david", "emma", "frank", "grace",
        "henry", "iris", "jack", "kate", "leo", "mary", "nancy", "oliver",
        "peter", "quincy", "rose", "sam", "tom", "uma", "victor", "wendy",
        "xavier", "yvonne", "zack", "john", "jane", "michael", "sarah",
        "william", "elizabeth", "james", "susan", "robert", "linda",
    }

    _PLACE_SUFFIXES = {
        "国", "省", "市", "县", "区", "镇", "村", "岛", "洲",
        "山", "河", "湖", "海", "洋", "沙漠", "森林", "平原",
        "city", "town", "village", "mountain", "river", "lake",
        "ocean", "sea", "island", "desert", "forest", "valley",
        "country", "state", "province", "county", "region", "peninsula",
    }

    _EVENT_KEYWORDS = {
        "会议", "峰会", "战争", "革命", "选举", "比赛", "节日",
        "地震", "洪水", "疫情", "爆发", "发射", "发布", "开幕",
        "conference", "summit", "war", "revolution", "election",
        "festival", "earthquake", "flood", "pandemic", "launch", "release",
        "ceremony", "olympics", "championship", "treaty", "declaration",
    }

    _OBJECT_KEYWORDS = {
        "计算机", "手机", "汽车", "飞机", "书籍", "工具", "机器",
        "建筑物", "桥梁", "道路", "武器", "药物", "芯片", "卫星",
        "computer", "phone", "car", "airplane", "book", "tool", "machine",
        "building", "bridge", "road", "weapon", "drug", "chip", "satellite",
        "robot", "camera", "sensor", "engine", "battery", "printer",
    }

    _ATTRIBUTE_KEYWORDS = {
        "颜色", "大小", "重量", "速度", "温度", "价格", "质量",
        "效率", "密度", "高度", "深度", "频率", "能量", "压力",
        "color", "size", "weight", "speed", "temperature", "price",
        "quality", "efficiency", "density", "height", "depth", "frequency",
        "energy", "pressure", "volume", "length", "capacity", "luminosity",
    }

    _CONCEPT_KEYWORDS = {
        "理论", "算法", "模型", "系统", "方法", "框架", "协议",
        "标准", "定律", "原理", "策略", "范式", "架构", "模式",
        "theory", "algorithm", "model", "system", "method", "framework",
        "protocol", "standard", "law", "principle", "strategy", "paradigm",
        "architecture", "pattern", "philosophy", "ideology", "doctrine",
    }

    _DATE_PATTERN = re.compile(
        r"\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b"
        r"|\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b"
        r"|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b"
        r"|\b\d{4}年\d{1,2}月\d{1,2}日\b",
        re.IGNORECASE,
    )

    _NUMBER_PATTERN = re.compile(
        r"\b[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?"
        r"\s*(?:%|kg|km|m|cm|mm|s|ms|h|min|°C|°F|K|g|t|L|mL|W|kW|MW|Hz|kHz|MHz|GHz|"
        r"元|美元|欧元|日元|英镑|万|亿|兆)?\b"
    )

    _URL_PATTERN = re.compile(
        r"https?://[^\s<>\"']+|www\.[^\s<>\"']+"
    )

    _CAPITALIZED_PATTERN = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b")

    def __init__(
        self,
        confidence: float = 0.7,
        source_label: str = "rule_extractor",
    ) -> None:
        self._default_confidence = confidence
        self._source_label = source_label
        self._entity_counter = itertools.count(1)

    def extract_entities(self, text: str) -> list[Entity]:
        """从文本中抽取实体。"""
        entities: list[Entity] = []
        entities.extend(self._extract_dates(text))
        entities.extend(self._extract_urls(text))
        entities.extend(self._extract_numbers(text))
        entities.extend(self._extract_named_patterns(text))

        date_values = {
            e.properties.get("raw", "")
            for e in entities
            if e.type == EntityType.EVENT
        }
        entities = [
            e for e in entities
            if e.type != EntityType.ATTRIBUTE
            or not any(str(e.properties.get("raw", "")) in dv for dv in date_values)
        ]

        return entities

    def extract_relations(
        self, text: str, entities: list[Entity]
    ) -> list[Relation]:
        """基于共现抽取实体间关系。

        理论视角:
          共现关系: 若实体 u 和 v 出现在同一句子 s 中，
          则添加 RELATED(u, v) 边，权重 = 1 / |s| (句内实体数)。
          这是最简单的无监督关系抽取方法。
        """
        if len(entities) < 2:
            return []

        relations: list[Relation] = []
        entity_ids = {e.id for e in entities}
        seen_pairs: set[tuple[str, str]] = set()

        sentences = re.split(r'[.!?。！？\n]+', text)

        for sentence in sentences:
            sentence_entities = [e for e in entities if e.name.lower() in sentence.lower()]
            if len(sentence_entities) < 2:
                continue

            weight = 1.0 / len(sentence_entities)

            for i in range(len(sentence_entities)):
                for j in range(i + 1, len(sentence_entities)):
                    a, b = sentence_entities[i], sentence_entities[j]
                    pair_key = tuple(sorted([a.id, b.id]))
                    if pair_key in seen_pairs:
                        continue
                    seen_pairs.add(pair_key)

                    if a.type == b.type:
                        pred = Predicate.RELATED
                    else:
                        pred = Predicate.RELATED

                    relations.append(Relation(
                        subject_id=a.id,
                        predicate=pred,
                        object_id=b.id,
                        weight=min(weight, 1.0),
                        evidence=[sentence.strip()],
                    ))

        return relations

    # ---- 内部抽取方法 ----

    def _extract_dates(self, text: str) -> list[Entity]:
        entities: list[Entity] = []
        for match in self._DATE_PATTERN.finditer(text):
            date_str = match.group().strip()
            eid = f"date_{next(self._entity_counter)}"
            entities.append(Entity(
                id=eid,
                name=date_str,
                type=EntityType.EVENT,
                properties={"raw": date_str},
                confidence=0.95,
                source=self._source_label,
            ))
        return entities

    def _extract_numbers(self, text: str) -> list[Entity]:
        entities: list[Entity] = []
        seen: set[str] = set()
        for match in self._NUMBER_PATTERN.finditer(text):
            num_str = match.group().strip()
            if num_str in seen:
                continue
            seen.add(num_str)
            eid = f"num_{next(self._entity_counter)}"
            entities.append(Entity(
                id=eid,
                name=num_str,
                type=EntityType.ATTRIBUTE,
                properties={"raw": num_str},
                confidence=0.9,
                source=self._source_label,
            ))
        return entities

    def _extract_urls(self, text: str) -> list[Entity]:
        entities: list[Entity] = []
        for match in self._URL_PATTERN.finditer(text):
            url_str = match.group().strip()
            eid = f"url_{next(self._entity_counter)}"
            entities.append(Entity(
                id=eid,
                name=url_str,
                type=EntityType.OBJECT,
                properties={"raw": url_str},
                confidence=0.95,
                source=self._source_label,
            ))
        return entities

    def _extract_named_patterns(self, text: str) -> list[Entity]:
        """基于规则抽取命名实体 (人名、地名、概念等)。"""
        entities: list[Entity] = []
        seen_names: set[str] = set()

        for match in self._CAPITALIZED_PATTERN.finditer(text):
            name = match.group(1).strip()
            words_lower = name.lower().split()
            if len(words_lower) == 1 and words_lower[0] in {
                "the", "a", "an", "in", "on", "at", "by", "to", "of", "for",
                "this", "that", "these", "those", "it", "he", "she", "they",
                "we", "you", "i", "is", "are", "was", "were", "be", "been",
                "has", "have", "had", "do", "does", "did", "will", "would",
                "can", "could", "may", "might", "shall", "should", "not",
                "no", "yes", "or", "and", "but", "if", "when", "where",
                "which", "who", "whom", "whose", "what", "why", "how",
            }:
                continue
            if name in seen_names:
                continue
            seen_names.add(name)

            entity_type = self._infer_type(name)
            confidence = self._default_confidence

            if entity_type == EntityType.PERSON:
                confidence = 0.6
            elif entity_type == EntityType.PLACE:
                confidence = 0.65

            eid = f"named_{next(self._entity_counter)}"
            entities.append(Entity(
                id=eid,
                name=name,
                type=entity_type,
                properties={"raw": name},
                confidence=confidence,
                source=self._source_label,
            ))

        return entities

    def _infer_type(self, name: str) -> EntityType:
        """基于关键词推断实体类型。"""
        name_lower = name.lower()
        words = set(name_lower.split())
        first_word = name_lower.split()[0] if name_lower else ""

        if first_word in self._PERSON_FIRST_NAMES:
            return EntityType.PERSON
        if any(t in words for t in self._PERSON_TITLES):
            return EntityType.PERSON

        if any(name_lower.endswith(s) for s in self._PLACE_SUFFIXES):
            return EntityType.PLACE
        if any(s in words for s in self._PLACE_SUFFIXES):
            return EntityType.PLACE

        if any(kw in words for kw in self._EVENT_KEYWORDS):
            return EntityType.EVENT

        if any(kw in words for kw in self._OBJECT_KEYWORDS):
            return EntityType.OBJECT

        if any(kw in words for kw in self._ATTRIBUTE_KEYWORDS):
            return EntityType.ATTRIBUTE

        if any(kw in words for kw in self._CONCEPT_KEYWORDS):
            return EntityType.CONCEPT

        return EntityType.CONCEPT


# ═══════════════════════════════════════════════════════════════════════
# 图谱推理器
# ═══════════════════════════════════════════════════════════════════════


@dataclass
class InferenceResult:
    """推理结果。"""

    inferred_relations: list[Relation] = field(default_factory=list)
    symmetric_pairs: list[tuple[str, str, Predicate]] = field(default_factory=list)
    contradictions: list[tuple[str, str]] = field(default_factory=list)
    centrality_scores: dict[str, float] = field(default_factory=dict)


class GraphReasoner:
    """基于知识图谱的推理引擎。

    推理类型:
      1. 传递推理: A IS_A B, B IS_A C => A IS_A C
      2. 对称检测: 检测双向对称关系
      3. 矛盾检测: A IS_A B AND A OPPOSITE B
      4. 置信度传播: 沿路径传播置信度

    理论视角:
      传递闭包 (Transitive Closure):
        R* = ∪_{k=1}^{∞} R^k
        其中 R^k = R ∘ R^{k-1},  R ∘ S = {(a,c) | ∃b: (a,b)∈R ∧ (b,c)∈S}

      PageRank 中心性:
        PR(v) = (1-d)/N + d * Σ_{u∈in(v)} PR(u) / out_degree(u)
        其中 d 为阻尼因子 (默认 0.85)
    """

    def __init__(
        self,
        max_transitive_depth: int = 5,
        decay_factor: float = 0.8,
        contradiction_threshold: float = 0.5,
    ) -> None:
        self._max_transitive_depth = max_transitive_depth
        self._decay_factor = decay_factor
        self._contradiction_threshold = contradiction_threshold

    def reason(self, graph: KnowledgeGraph) -> InferenceResult:
        """执行完整推理流水线。"""
        result = InferenceResult()
        result.inferred_relations = self.transitive_inference(graph)
        result.symmetric_pairs = self.detect_symmetry(graph)
        result.contradictions = self.detect_contradictions(graph)
        result.centrality_scores = self.compute_centrality(graph)
        return result

    def transitive_inference(self, graph: KnowledgeGraph) -> list[Relation]:
        """传递推理。

        对于传递性谓词 (IS_A, PART_OF)，若存在 A->B 和 B->C，
        则推断 A->C，置信度为 min(conf_A, conf_B) * weight_AB * weight_BC * decay。
        """
        inferred: list[Relation] = []
        seen: set[tuple[str, str, str]] = set()

        for entity_id in graph._entities:
            if entity_id not in graph._adjacency:
                continue

            paths = self._bfs_transitive(graph, entity_id)
            for target_id, (path_edges, path_confidence) in paths.items():
                if len(path_edges) < 2:
                    continue

                first_pred = path_edges[0][1]
                key = (entity_id, first_pred.value, target_id)
                if key in seen:
                    continue

                existing = graph.get_relation(entity_id, first_pred, target_id)
                if existing is not None:
                    continue

                seen.add(key)
                source_entity = graph.get_entity(entity_id)
                base_conf = source_entity.confidence if source_entity else 1.0

                inferred.append(Relation(
                    subject_id=entity_id,
                    predicate=first_pred,
                    object_id=target_id,
                    weight=path_confidence,
                    evidence=[f"transitive inference via {len(path_edges)} hops"],
                ))

        return inferred

    def _bfs_transitive(
        self, graph: KnowledgeGraph, start_id: str
    ) -> dict[str, tuple[list[tuple[str, Predicate, str]], float]]:
        """BFS 查找传递路径，仅沿传递性谓词遍历。"""
        results: dict[str, tuple[list[tuple[str, Predicate, str]], float]] = {}
        queue: deque[tuple[str, list[tuple[str, Predicate, str]], float]] = deque()
        queue.append((start_id, [], 1.0))
        visited: set[str] = {start_id}

        while queue:
            current, path, path_conf = queue.popleft()
            if len(path) >= self._max_transitive_depth:
                continue

            for neighbor_id, pred_val, weight in graph._adjacency.get(current, set()):
                predicate = Predicate(pred_val)
                if not predicate.is_transitive:
                    continue
                if neighbor_id in visited:
                    continue

                new_path = path + [(current, predicate, neighbor_id)]
                new_conf = path_conf * weight * self._decay_factor

                if len(new_path) >= 2:
                    if neighbor_id not in results or new_conf > results[neighbor_id][1]:
                        results[neighbor_id] = (new_path, new_conf)

                visited.add(neighbor_id)
                queue.append((neighbor_id, new_path, new_conf))

        return results

    def detect_symmetry(
        self, graph: KnowledgeGraph
    ) -> list[tuple[str, str, Predicate]]:
        """检测对称关系。

        若存在 A -pred-> B 且 B -pred-> A，则为对称关系。
        若存在 A -pred-> B 但不存在 B -pred-> A，则为潜在非对称。
        """
        symmetric: list[tuple[str, str, Predicate]] = []
        checked: set[tuple[str, str, str]] = set()

        for subj_id, edges in graph._adjacency.items():
            for obj_id, pred_val, weight in edges:
                pair_key = tuple(sorted([subj_id, obj_id]) + [pred_val])
                if pair_key in checked:
                    continue
                checked.add(pair_key)

                predicate = Predicate(pred_val)

                reverse_exists = False
                for r_obj_id, r_pred_val, _ in graph._adjacency.get(obj_id, set()):
                    if r_obj_id == subj_id and r_pred_val == pred_val:
                        reverse_exists = True
                        break

                if reverse_exists:
                    symmetric.append((subj_id, obj_id, predicate))

            for obj_id, pred_val, _ in graph._adjacency.get(subj_id, set()):
                predicate = Predicate(pred_val)
                if predicate.is_symmetric:
                    pair_key = tuple(sorted([subj_id, obj_id]) + [pred_val])
                    if pair_key not in checked:
                        symmetric.append((subj_id, obj_id, predicate))

        return symmetric

    def detect_contradictions(self, graph: KnowledgeGraph) -> list[tuple[str, str]]:
        """检测矛盾关系。

        矛盾检测规则:
          1. A IS_A B 且 A OPPOSITE B => 矛盾
          2. A SYNONYM B 且 A OPPOSITE B => 矛盾
        """
        contradictions: list[tuple[str, str]] = []
        processed: set[tuple[str, str]] = set()

        for subj_id, edges in graph._adjacency.items():
            edge_map: dict[str, list[Predicate]] = {}
            for obj_id, pred_val, _ in edges:
                edge_map.setdefault(obj_id, []).append(Predicate(pred_val))

            for obj_id, preds in edge_map.items():
                pair_key = tuple(sorted([subj_id, obj_id]))
                if pair_key in processed:
                    continue

                has_is_a = Predicate.IS_A in preds
                has_opposite = Predicate.OPPOSITE in preds
                has_synonym = Predicate.SYNONYM in preds

                if (has_is_a and has_opposite) or (has_synonym and has_opposite):
                    contradictions.append((subj_id, obj_id))
                    processed.add(pair_key)

        return contradictions

    def propagate_confidence(self, graph: KnowledgeGraph) -> dict[str, float]:
        """置信度传播。

        从高置信度实体出发，沿边传播置信度。
        child_confidence = parent_confidence * relation_weight * decay_factor.

        理论视角:
          这近似于图上的标签传播 (Label Propagation) 算法。
          收敛条件: 两次迭代间最大变化 < ε。
        """
        confidences: dict[str, float] = {
            eid: entity.confidence for eid, entity in graph._entities.items()
        }

        for _iteration in range(10):
            updated: dict[str, float] = {}
            max_delta = 0.0

            for entity_id in graph._entities:
                if entity_id not in graph._reverse_adjacency:
                    continue

                best_incoming = confidences.get(entity_id, 1.0)
                for from_id, _, weight in graph._reverse_adjacency.get(entity_id, set()):
                    propagated = confidences.get(from_id, 1.0) * weight * self._decay_factor
                    if propagated > best_incoming:
                        best_incoming = propagated

                delta = abs(best_incoming - confidences.get(entity_id, 1.0))
                max_delta = max(max_delta, delta)
                updated[entity_id] = best_incoming

            confidences.update(updated)
            if max_delta < 0.001:
                break

            for entity_id in graph._entities:
                entity = graph._entities[entity_id]
                new_conf = confidences.get(entity_id, entity.confidence)
                entity.confidence = max(0.0, min(1.0, new_conf))

        return confidences

    def compute_centrality(
        self,
        graph: KnowledgeGraph,
        damping: float = 0.85,
        max_iterations: int = 100,
        tolerance: float = 1e-6,
    ) -> dict[str, float]:
        """PageRank 式中心性计算。

        理论视角:
          PageRank 是一个稳态分布 π，满足 π = π * P，
          其中 P 是转移概率矩阵:
            P[i][j] = (1-d)/N + d * w(i->j) / Σ_k w(i->k)
          迭代至 ||π_new - π_old||_1 < tolerance。
        """
        entity_ids = list(graph._entities.keys())
        n = len(entity_ids)
        if n == 0:
            return {}

        scores = {eid: 1.0 / n for eid in entity_ids}
        id_to_idx = {eid: i for i, eid in enumerate(entity_ids)}

        out_weights: dict[str, float] = {}
        for eid, edges in graph._adjacency.items():
            out_weights[eid] = sum(weight for _, _, weight in edges)

        for _iteration in range(max_iterations):
            new_scores: dict[str, float] = {}
            for eid in entity_ids:
                rank = (1.0 - damping) / n
                for from_id, _, weight in graph._reverse_adjacency.get(eid, set()):
                    out_w = out_weights.get(from_id, 1.0)
                    if out_w > 0:
                        rank += damping * scores.get(from_id, 0.0) * (weight / out_w)
                new_scores[eid] = rank

            total_diff = sum(abs(new_scores[eid] - scores[eid]) for eid in entity_ids)
            scores = new_scores
            if total_diff < tolerance:
                break

        return scores


# ═══════════════════════════════════════════════════════════════════════
# 图谱序列化器
# ═══════════════════════════════════════════════════════════════════════


class GraphSerializer:
    """知识图谱的 JSON 序列化和 DOT 可视化导出。"""

    @staticmethod
    def to_json(graph: KnowledgeGraph, indent: int = 2) -> str:
        """将图谱序列化为 JSON 字符串。"""
        data: dict[str, Any] = {
            "version": "1.0",
            "entities": [e.to_dict() for e in graph.iter_entities()],
            "relations": [r.to_dict() for r in graph.iter_relations()],
        }
        return json.dumps(data, ensure_ascii=False, indent=indent)

    @staticmethod
    def from_json(json_str: str) -> KnowledgeGraph:
        """从 JSON 字符串反序列化图谱。"""
        data = json.loads(json_str)
        graph = KnowledgeGraph()
        for e_data in data.get("entities", []):
            graph.add_entity(Entity.from_dict(e_data))
        for r_data in data.get("relations", []):
            graph.add_relation(Relation.from_dict(r_data))
        return graph

    @staticmethod
    def save(graph: KnowledgeGraph, filepath: str) -> None:
        """保存图谱到 JSON 文件。"""
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(GraphSerializer.to_json(graph))

    @staticmethod
    def load(filepath: str) -> KnowledgeGraph:
        """从 JSON 文件加载图谱。"""
        with open(filepath, "r", encoding="utf-8") as f:
            return GraphSerializer.from_json(f.read())

    @staticmethod
    def to_dot(graph: KnowledgeGraph, title: str = "KnowledgeGraph") -> str:
        """导出 DOT 格式用于 Graphviz 可视化。

        输出示例:
          digraph KnowledgeGraph {
            rankdir=LR;
            node [shape=box];
            "entity_1" [label="Alice", color=blue];
            "entity_1" -> "entity_2" [label="IS_A", weight=0.9];
          }
        """
        _TYPE_COLORS: dict[EntityType, str] = {
            EntityType.CONCEPT: "lightblue",
            EntityType.PERSON: "lightgreen",
            EntityType.PLACE: "lightsalmon",
            EntityType.EVENT: "lightyellow",
            EntityType.OBJECT: "lightgray",
            EntityType.ATTRIBUTE: "plum",
        }

        lines: list[str] = [
            f"digraph {title.replace(' ', '_')} {{",
            "    rankdir=LR;",
            '    node [shape=box, style=filled, fontname="Helvetica"];',
            '    edge [fontname="Helvetica", fontsize=10];',
            "",
        ]

        for entity in graph.iter_entities():
            color = _TYPE_COLORS.get(entity.type, "white")
            label = entity.name.replace('"', '\\"')
            lines.append(
                f'    "{entity.id}" [label="{label}", fillcolor={color}];'
            )

        lines.append("")

        for relation in graph.iter_relations():
            lines.append(
                f'    "{relation.subject_id}" -> "{relation.object_id}" '
                f'[label="{relation.predicate.value}\\n({relation.weight:.2f})"];'
            )

        lines.append("}")
        return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════
# 理论版扩展 (Theory Track)
# ═══════════════════════════════════════════════════════════════════════
#
# SpectralClusteringEngine (谱聚类引擎):
#
#   def build_laplacian(graph: KnowledgeGraph) -> tuple[list[list[float]], list[str]]:
#       """构造归一化拉普拉斯矩阵 L_norm = I - D^(-1/2) A D^(-1/2)"""
#       n = graph.entity_count
#       ids = list(graph._entities.keys())
#       id_to_idx = {eid: i for i, eid in enumerate(ids)}
#       A = [[0.0] * n for _ in range(n)]
#       D = [[0.0] * n for _ in range(n)]
#       for subj_id, edges in graph._adjacency.items():
#           i = id_to_idx[subj_id]
#           for obj_id, _, weight in edges:
#               j = id_to_idx[obj_id]
#               A[i][j] += weight
#               D[i][i] += weight
#       # D^(-1/2): 对每个对角元 d, 若 d > 0 则 d = 1/sqrt(d)
#       for i in range(n):
#           if D[i][i] > 0:
#               D[i][i] = 1.0 / math.sqrt(D[i][i])
#       # L = I - D * A * D
#       L = [[float(i == j) for j in range(n)] for i in range(n)]
#       for i in range(n):
#           for k in range(n):
#               for j in range(n):
#                   if D[i][i] > 0:
#                       L[i][j] -= D[i][i] * A[i][k] * D[k][k]
#       return L, ids
#
#   Power iteration for dominant eigenvector:
#     v_{k+1} = A * v_k / ||A * v_k||
#
#   k-means on k smallest eigenvectors of L_norm yields spectral clusters.
#   每个簇对应一个语义社区 (semantic community)。
#
#
# BetweennessCentrality (介数中心性):
#
#   C_B(v) = Σ_{s≠t≠v} σ_{st}(v) / σ_{st}
#   其中 σ_{st} 为 s 到 t 的最短路径数,
#   σ_{st}(v) 为经过 v 的最短路径数。
#   高介数节点是图谱中的"桥接"实体。
#
#
# EdgeWeightNormalization:
#
#   w_normalized(e) = w(e) / max_{e' ∈ out(u)} w(e')
#   归一化后每条出边的权重之和 ≤ 1。


# ═══════════════════════════════════════════════════════════════════════
# 便捷构建函数
# ═══════════════════════════════════════════════════════════════════════


def build_knowledge_graph(
    entities: list[Entity] | None = None,
    relations: list[Relation] | None = None,
) -> KnowledgeGraph:
    """便捷构建函数: 从实体和关系列表创建知识图谱。"""
    graph = KnowledgeGraph()
    for e in (entities or []):
        graph.add_entity(e)
    for r in (relations or []):
        graph.add_relation(r)
    return graph


def extract_and_build(text: str, extractor: EntityExtractor | None = None) -> KnowledgeGraph:
    """从文本中抽取实体和关系并构建知识图谱。"""
    if extractor is None:
        extractor = EntityExtractor()
    entities = extractor.extract_entities(text)
    relations = extractor.extract_relations(text, entities)
    return build_knowledge_graph(entities, relations)
