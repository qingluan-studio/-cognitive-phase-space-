import hashlib
import json
import time
import threading
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class RelationType(Enum):
    IS_A = "is_a"
    HAS_A = "has_a"
    DEPENDS_ON = "depends_on"
    CAUSES = "causes"
    PRECEDES = "precedes"
    CONTRADICTS = "contradicts"
    SUPPORTS = "supports"
    RELATED = "related"
    DERIVED_FROM = "derived_from"


@dataclass
class KnowledgeNode:
    node_id: str
    content: str
    node_type: str = "fact"
    confidence: float = 1.0
    source: str = ""
    tags: list[str] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    access_count: int = 0


@dataclass
class KnowledgeEdge:
    source_id: str
    target_id: str
    relation: RelationType = RelationType.RELATED
    weight: float = 1.0
    metadata: dict = field(default_factory=dict)


@dataclass
class SynthesisResult:
    topic: str
    insight: str
    confidence: float
    supporting_nodes: list[str] = field(default_factory=list)
    novel: bool = False
    methodology: str = "pattern_match"


class KnowledgeGraph:
    def __init__(self, name: str = "default"):
        self.name = name
        self._nodes: dict[str, KnowledgeNode] = {}
        self._edges: dict[str, list[KnowledgeEdge]] = defaultdict(list)
        self._lock = threading.RLock()

    @staticmethod
    def generate_id(content: str) -> str:
        h = hashlib.sha256(content.encode("utf-8")).hexdigest()
        return h[:12]

    def add_node(self, content: str, node_type: str = "fact",
                 confidence: float = 1.0, source: str = "",
                 tags: Optional[list[str]] = None) -> KnowledgeNode:
        node_id = self.generate_id(content)
        with self._lock:
            if node_id in self._nodes:
                self._nodes[node_id].access_count += 1
                self._nodes[node_id].updated_at = time.time()
                return self._nodes[node_id]
            node = KnowledgeNode(
                node_id=node_id,
                content=content,
                node_type=node_type,
                confidence=confidence,
                source=source,
                tags=tags or [],
            )
            self._nodes[node_id] = node
            return node

    def add_edge(self, source_id: str, target_id: str,
                 relation: RelationType = RelationType.RELATED,
                 weight: float = 1.0) -> Optional[KnowledgeEdge]:
        with self._lock:
            if source_id not in self._nodes or target_id not in self._nodes:
                return None
            edge = KnowledgeEdge(
                source_id=source_id,
                target_id=target_id,
                relation=relation,
                weight=weight,
            )
            self._edges[source_id].append(edge)
            return edge

    def get_node(self, node_id: str) -> Optional[KnowledgeNode]:
        with self._lock:
            node = self._nodes.get(node_id)
            if node:
                node.access_count += 1
            return node

    def query(self, keyword: str, limit: int = 10) -> list[KnowledgeNode]:
        with self._lock:
            results = [
                n for n in self._nodes.values()
                if keyword.lower() in n.content.lower()
            ]
            results.sort(key=lambda n: (n.confidence, n.access_count), reverse=True)
            return results[:limit]

    def get_neighbors(self, node_id: str, depth: int = 1) -> list[tuple[KnowledgeNode, KnowledgeEdge]]:
        with self._lock:
            if node_id not in self._nodes:
                return []
            result: list[tuple[KnowledgeNode, KnowledgeEdge]] = []
            visited: set[str] = {node_id}
            frontier = [node_id]
            for _ in range(depth):
                next_frontier: list[str] = []
                for nid in frontier:
                    for edge in self._edges.get(nid, []):
                        target = self._nodes.get(edge.target_id)
                        if target and edge.target_id not in visited:
                            visited.add(edge.target_id)
                            result.append((target, edge))
                            next_frontier.append(edge.target_id)
                frontier = next_frontier
            return result

    def find_paths(self, source_id: str, target_id: str, max_depth: int = 5) -> list[list[str]]:
        with self._lock:
            if source_id not in self._nodes or target_id not in self._nodes:
                return []
            paths: list[list[str]] = []
            self._dfs_paths(source_id, target_id, [source_id], set(), max_depth, paths)
            return paths

    def _dfs_paths(self, current: str, target: str, path: list[str],
                   visited: set[str], max_depth: int, results: list[list[str]]) -> None:
        if len(path) > max_depth:
            return
        if current == target and len(path) > 1:
            results.append(list(path))
            return
        visited.add(current)
        for edge in self._edges.get(current, []):
            if edge.target_id not in visited:
                self._dfs_paths(edge.target_id, target, path + [edge.target_id],
                                visited, max_depth, results)

    def to_dict(self) -> dict:
        with self._lock:
            return {
                "name": self.name,
                "nodes": len(self._nodes),
                "edges": sum(len(e) for e in self._edges.values()),
                "node_types": list(set(n.node_type for n in self._nodes.values())),
            }

    def stats(self) -> dict:
        return self.to_dict()


class KnowledgeSynthesizer:
    SEQUENCE_PATTERNS: list[str] = [
        "studying * leads to *",
        "when * then *",
        "* causes *",
        "* enables *",
        "* requires *",
        "first *, then *",
    ]

    def __init__(self, graph: Optional[KnowledgeGraph] = None):
        self._graph = graph or KnowledgeGraph("synthesizer")

    def synthesize(self, topic: str, source_texts: list[str]) -> SynthesisResult:
        self._graph.add_node(f"topic:{topic}", node_type="topic", source="synthesizer")
        for text in source_texts:
            self._graph.add_node(text, node_type="evidence", source="input")

        patterns_found = self._extract_patterns(source_texts)
        insight_parts: list[str] = []
        novel = False

        if patterns_found:
            insight_parts.append("基于模式分析发现: ")
            insight_parts.extend(f"  - {p}" for p in patterns_found[:5])
            novel = len(patterns_found) > 3

        if not patterns_found:
            insight_parts.append(f"整合了 {len(source_texts)} 个知识源，形成综合理解。")
            key_terms = self._extract_key_terms(source_texts)
            if key_terms:
                insight_parts.append(f"关键概念: {', '.join(key_terms[:8])}")

        return SynthesisResult(
            topic=topic,
            insight="\n".join(insight_parts) if insight_parts else "综合分析完成",
            confidence=min(1.0, 0.5 + 0.1 * len(source_texts)),
            supporting_nodes=[self._graph.generate_id(t) for t in source_texts],
            novel=novel,
            methodology="pattern_match" if patterns_found else "aggregation",
        )

    def _extract_patterns(self, texts: list[str]) -> list[str]:
        patterns: list[str] = []
        for text in texts:
            text_lower = text.lower()
            if "leads to" in text_lower or "导致" in text_lower:
                patterns.append(f"因果链条: {text[:80]}...")
            elif "when" in text_lower and "then" in text_lower:
                patterns.append(f"条件模式: {text[:80]}...")
            elif "first" in text_lower or "首先" in text_lower:
                patterns.append(f"序列模式: {text[:80]}...")
        return patterns

    @staticmethod
    def _extract_key_terms(texts: list[str]) -> list[str]:
        combined = " ".join(texts).lower()
        words = combined.replace(",", " ").replace(".", " ").split()
        freq: dict[str, int] = {}
        for w in words:
            if len(w) > 3:
                freq[w] = freq.get(w, 0) + 1
        return [w for w, _ in sorted(freq.items(), key=lambda x: -x[1])[:10]]

    def stats(self) -> dict:
        return {
            "graph": self._graph.stats(),
            "type": "KnowledgeSynthesizer",
        }


class MassiveBrain:
    def __init__(self, storage_path: Optional[str] = None):
        self._graphs: dict[str, KnowledgeGraph] = {}
        self._synthesizers: dict[str, KnowledgeSynthesizer] = {}
        self._storage_path = storage_path
        self._lock = threading.RLock()
        self._total_operations = 0

    def get_graph(self, name: str = "default") -> KnowledgeGraph:
        with self._lock:
            if name not in self._graphs:
                self._graphs[name] = KnowledgeGraph(name)
            return self._graphs[name]

    def get_synthesizer(self, name: str = "default") -> KnowledgeSynthesizer:
        with self._lock:
            if name not in self._synthesizers:
                self._synthesizers[name] = KnowledgeSynthesizer(self.get_graph(name))
            return self._synthesizers[name]

    def learn(self, text: str, domain: str = "general",
              tags: Optional[list[str]] = None) -> KnowledgeNode:
        graph = self.get_graph(domain)
        self._total_operations += 1
        return graph.add_node(
            content=text,
            node_type="learned",
            tags=tags or [],
            source="massive_brain",
        )

    def query_all(self, keyword: str, limit: int = 10) -> list[KnowledgeNode]:
        results: list[KnowledgeNode] = []
        with self._lock:
            for graph in self._graphs.values():
                results.extend(graph.query(keyword, limit=limit))
        results.sort(key=lambda n: (n.confidence, n.access_count), reverse=True)
        return results[:limit]

    def create_new_knowledge(self, topic: str, source_texts: list[str]) -> SynthesisResult:
        synth = self.get_synthesizer("discovery")
        result = synth.synthesize(topic, source_texts)
        graph = self.get_graph("discovered")
        graph.add_node(
            content=result.insight,
            node_type="insight",
            confidence=result.confidence,
            source="auto_synthesis",
            tags=["auto_discovered", "novel" if result.novel else "synthesized"],
        )
        return result

    def to_dict(self) -> dict:
        with self._lock:
            return {
                "graphs": len(self._graphs),
                "total_nodes": sum(len(g._nodes) for g in self._graphs.values()),
                "total_edges": sum(sum(len(e) for e in g._edges.values()) for g in self._graphs.values()),
                "domains": list(self._graphs.keys()),
                "total_operations": self._total_operations,
            }

    def stats(self) -> dict:
        return self.to_dict()

    def save(self, path: Optional[str] = None) -> str:
        target = path or self._storage_path
        if not target:
            target = "/tmp/cee_brain.json"
        with self._lock:
            data = {
                "nodes": {},
                "edges": {},
                "meta": self.to_dict(),
            }
            for gname, graph in self._graphs.items():
                data["nodes"][gname] = {
                    nid: {
                        "content": n.content,
                        "node_type": n.node_type,
                        "confidence": n.confidence,
                        "tags": n.tags,
                    }
                    for nid, n in graph._nodes.items()
                }
                data["edges"][gname] = {
                    sid: [
                        {"target_id": e.target_id, "relation": e.relation.value, "weight": e.weight}
                        for e in edges
                    ]
                    for sid, edges in graph._edges.items()
                }
            with open(target, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return target

    def reset(self) -> None:
        with self._lock:
            self._graphs.clear()
            self._synthesizers.clear()
            self._total_operations = 0
