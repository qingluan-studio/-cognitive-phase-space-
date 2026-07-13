"""
CEE Knowledge — 知识引擎扩展

新增:
  - KnowledgeGraph: 概念关系图构建与查询
  - OntologyBuilder: 本体论构建器
  - SemanticIndex: 语义索引
  - ConceptLattice: 概念格(形式概念分析)
  - CrossLingualMapper: 跨语言概念映射
"""

from __future__ import annotations

import logging
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class Concept:
    name: str
    definition: str = ""
    aliases: list[str] = field(default_factory=list)
    category: str = "general"
    confidence: float = 0.5
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass
class Relation:
    source: str
    target: str
    relation_type: str
    weight: float = 1.0
    confidence: float = 0.5
    evidence: str = ""


class KnowledgeGraph:
    """概念关系图"""

    def __init__(self):
        self._concepts: dict[str, Concept] = {}
        self._relations: list[Relation] = []
        self._adjacency: dict[str, dict[str, list[Relation]]] = defaultdict(
            lambda: defaultdict(list)
        )

    def add_concept(self, concept: Concept) -> None:
        self._concepts[concept.name] = concept

    def add_relation(self, relation: Relation) -> None:
        self._relations.append(relation)
        self._adjacency[relation.source]["out"].append(relation)
        self._adjacency[relation.target]["in"].append(relation)

    def get_concept(self, name: str) -> Concept | None:
        return self._concepts.get(name)

    def get_related(self, concept_name: str, relation_type: str = "",
                     max_depth: int = 2) -> list[dict[str, Any]]:
        visited = {concept_name}
        queue = deque([(concept_name, 0)])
        results = []

        while queue:
            current, depth = queue.popleft()
            if depth >= max_depth:
                continue

            for direction in ("out",):
                for rel in self._adjacency[current].get(direction, []):
                    if relation_type and rel.relation_type != relation_type:
                        continue
                    neighbor = rel.target if direction == "out" else rel.source
                    if neighbor not in visited:
                        visited.add(neighbor)
                        results.append({
                            "concept": neighbor,
                            "relation": rel.relation_type,
                            "distance": depth + 1,
                            "weight": rel.weight,
                        })
                        queue.append((neighbor, depth + 1))

        return sorted(results, key=lambda x: x["distance"])

    def path_between(self, source: str, target: str,
                      max_depth: int = 5) -> list[list[str]]:
        queue = deque([(source, [source])])
        paths = []

        while queue:
            current, path = queue.popleft()
            if len(path) > max_depth:
                continue

            for rel in self._adjacency[current].get("out", []):
                neighbor = rel.target
                if neighbor == target:
                    paths.append(path + [neighbor])
                elif neighbor not in path:
                    queue.append((neighbor, path + [neighbor]))

        return paths[:10]

    def centrality(self) -> dict[str, float]:
        degrees = {}
        for name in self._concepts:
            degrees[name] = len(self._adjacency[name].get("out", [])) + len(self._adjacency[name].get("in", []))
        max_deg = max(degrees.values()) if degrees else 1
        return {k: v / max(max_deg, 1) for k, v in degrees.items()}

    def export(self) -> dict[str, Any]:
        return {
            "concepts": list(self._concepts.keys()),
            "total_relations": len(self._relations),
            "relation_types": list(set(r.relation_type for r in self._relations)),
            "top_central_concepts": sorted(
                self.centrality().items(), key=lambda x: x[1], reverse=True
            )[:10],
        }


class OntologyBuilder:
    """本体论(ontology)构建器"""

    def __init__(self):
        self._classes: dict[str, dict[str, Any]] = {}
        self._instances: dict[str, dict[str, Any]] = {}
        self._taxonomy: dict[str, list[str]] = defaultdict(list)
        self._properties: dict[str, dict[str, str]] = {}

    def add_class(self, class_id: str, label: str,
                   parent_class: str = "", properties: dict[str, str] | None = None) -> None:
        self._classes[class_id] = {
            "id": class_id, "label": label,
            "parent": parent_class, "properties": properties or {},
        }
        if parent_class:
            self._taxonomy[parent_class].append(class_id)

    def add_instance(self, instance_id: str, class_id: str,
                      values: dict[str, Any] | None = None) -> None:
        if class_id not in self._classes:
            raise ValueError(f"Class '{class_id}' not defined")

        self._instances[instance_id] = {
            "id": instance_id, "class": class_id, "values": values or {},
        }

    def get_subclasses(self, class_id: str, recursive: bool = False) -> list[str]:
        result = list(self._taxonomy.get(class_id, []))
        if recursive:
            for subclass in list(result):
                result.extend(self.get_subclasses(subclass, recursive=True))
        return result

    def get_instances(self, class_id: str,
                       include_subclasses: bool = False) -> list[dict[str, Any]]:
        target_classes = {class_id}
        if include_subclasses:
            target_classes.update(self.get_subclasses(class_id, recursive=True))

        return [
            inst for inst in self._instances.values()
            if inst["class"] in target_classes
        ]

    def is_subclass_of(self, class_a: str, class_b: str) -> bool:
        if class_a == class_b:
            return True
        parent = self._classes.get(class_a, {}).get("parent", "")
        if not parent:
            return False
        return self.is_subclass_of(parent, class_b)

    def hierarchy_depth(self, class_id: str) -> int:
        parent = self._classes.get(class_id, {}).get("parent", "")
        if not parent:
            return 0
        return 1 + self.hierarchy_depth(parent)

    def export_tree(self, root_class: str = "") -> dict[str, Any]:
        root = root_class or next(
            (cid for cid, cls in self._classes.items() if not cls["parent"]), ""
        )
        return self._build_tree(root)

    def _build_tree(self, class_id: str) -> dict[str, Any]:
        cls = self._classes.get(class_id, {})
        children = {}
        for subclass in self._taxonomy.get(class_id, []):
            children[subclass] = self._build_tree(subclass)

        instances = self.get_instances(class_id)

        return {
            "label": cls.get("label", class_id),
            "subclasses": children,
            "instance_count": len(instances),
            "properties": cls.get("properties", {}),
        }


class SemanticIndex:
    """语义索引 — 倒排 + 向量混合索引"""

    def __init__(self, dim: int = 128):
        self.dim = dim
        self._inverted_index: dict[str, set[str]] = defaultdict(set)
        self._documents: dict[str, dict[str, Any]] = {}
        self._vectors: dict[str, np.ndarray] = {}

    def add(self, doc_id: str, doc: dict[str, Any],
             vector: np.ndarray | None = None) -> None:
        self._documents[doc_id] = doc

        text = doc.get("text", doc.get("content", ""))
        for word in set(text.lower().split()):
            if len(word) > 1:
                self._inverted_index[word].add(doc_id)

        if vector is not None:
            self._vectors[doc_id] = vector.astype(np.float32)

    def search_by_keywords(self, query: str, top_k: int = 10) -> list[dict[str, Any]]:
        query_words = set(query.lower().split())
        if not query_words:
            return []

        scores = defaultdict(float)
        for word in query_words:
            if word in self._inverted_index:
                idf = np.log(len(self._documents) / max(len(self._inverted_index[word]), 1))
                for doc_id in self._inverted_index[word]:
                    scores[doc_id] += idf

        sorted_docs = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]

        return [
            {
                "doc_id": doc_id,
                "score": score,
                "doc": self._documents.get(doc_id),
            }
            for doc_id, score in sorted_docs
        ]

    def search_by_vector(self, query_vector: np.ndarray,
                          top_k: int = 10) -> list[dict[str, Any]]:
        if not self._vectors:
            return []

        query = query_vector.astype(np.float32)
        scores = []

        for doc_id, vector in self._vectors.items():
            norm = np.linalg.norm(query) * np.linalg.norm(vector)
            if norm < 1e-8:
                similarity = 0.0
            else:
                similarity = float(np.dot(query, vector) / norm)
            scores.append((doc_id, similarity))

        scores.sort(key=lambda x: x[1], reverse=True)

        return [
            {
                "doc_id": doc_id,
                "score": score,
                "doc": self._documents.get(doc_id),
            }
            for doc_id, score in scores[:top_k]
        ]

    def count(self) -> int:
        return len(self._documents)

    def stats(self) -> dict[str, Any]:
        return {
            "documents": len(self._documents),
            "indexed_terms": len(self._inverted_index),
            "vectorized": len(self._vectors),
            "avg_term_posting": (
                np.mean([len(v) for v in self._inverted_index.values()])
                if self._inverted_index else 0.0
            ),
        }


class CrossLingualMapper:
    """跨语言概念映射器"""

    def __init__(self):
        self._mappings: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
        self._lang_pairs: set[tuple[str, str]] = set()

    def add_mapping(self, source_lang: str, target_lang: str,
                     source_term: str, target_terms: list[str]) -> None:
        key = f"{source_lang}:{target_lang}"
        self._mappings[key][source_term] = target_terms
        self._lang_pairs.add((source_lang, target_lang))

    def translate(self, term: str, source_lang: str,
                   target_lang: str) -> str:
        key = f"{source_lang}:{target_lang}"
        mappings = self._mappings.get(key, {})
        translations = mappings.get(term, [term])
        return translations[0] if translations else term

    def get_related_terms(self, term: str, lang: str) -> list[str]:
        """获取跨语言关联术语"""
        related = []
        for (src, tgt), mappings in self._mappings.items():
            if src == lang:
                related.extend(mappings.get(term, []))
        return list(set(related))

    @property
    def supported_languages(self) -> list[str]:
        langs = set()
        for src, tgt in self._lang_pairs:
            langs.add(src)
            langs.add(tgt)
        return list(langs)

    @property
    def supported_pairs(self) -> list[tuple[str, str]]:
        return list(self._lang_pairs)
