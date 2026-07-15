"""Knowledge graph construction and reasoning utilities.

Builds directed knowledge graphs from structured triples, performs
traversal, pathfinding, transitive closure, and basic inference
using graph algorithms.
"""

from __future__ import annotations

from collections import defaultdict, deque
from typing import Dict, List, Optional, Set, Tuple


class KnowledgeGraph:
    """Directed knowledge graph with triple-based storage.

    Represents entities as nodes and relationships as labeled edges.
Supports graph traversal, pathfinding, transitive inference, and
basic cycle detection.
    """

    def __init__(self) -> None:
        """Initialize empty adjacency structures and entity index."""
        self.outgoing: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
        self.incoming: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
        self.entities: Set[str] = set()
        self.relations: Set[str] = set()
        self.triples: List[Tuple[str, str, str]] = []

    def add_triple(self, subject: str, relation: str, obj: str) -> None:
        """Add a (subject, relation, object) triple to the graph.

        Args:
            subject: Source entity.
            relation: Edge label.
            obj: Target entity.
        """
        self.outgoing[subject][relation].append(obj)
        self.incoming[obj][relation].append(subject)
        self.entities.add(subject)
        self.entities.add(obj)
        self.relations.add(relation)
        self.triples.append((subject, relation, obj))

    def add_triples(self, triples: Sequence[Tuple[str, str, str]]) -> None:
        """Batch insert triples.

        Args:
            triples: Iterable of (subject, relation, object).
        """
        for s, r, o in triples:
            self.add_triple(s, r, o)

    def get_neighbors(self, entity: str, relation: Optional[str] = None) -> List[str]:
        """Retrieve neighbor entities reachable via outgoing edges.

        Args:
            entity: Source entity.
            relation: Optional relation filter.

        Returns:
            List of neighboring entity names.
        """
        if entity not in self.outgoing:
            return []
        if relation is None:
            result: List[str] = []
            for targets in self.outgoing[entity].values():
                result.extend(targets)
            return result
        return self.outgoing[entity].get(relation, [])

    def get_predecessors(self, entity: str, relation: Optional[str] = None) -> List[str]:
        """Retrieve predecessor entities via incoming edges.

        Args:
            entity: Target entity.
            relation: Optional relation filter.

        Returns:
            List of predecessor entity names.
        """
        if entity not in self.incoming:
            return []
        if relation is None:
            result: List[str] = []
            for sources in self.incoming[entity].values():
                result.extend(sources)
            return result
        return self.incoming[entity].get(relation, [])

    def bfs_path(self, start: str, end: str, max_depth: int = 5) -> Optional[List[Tuple[str, str, str]]]:
        """Find shortest path between two entities using BFS.

        Args:
            start: Starting entity.
            end: Target entity.
            max_depth: Maximum search depth.

        Returns:
            List of triples representing the path, or None.
        """
        if start == end:
            return []
        visited: Set[str] = {start}
        queue: deque[Tuple[str, List[Tuple[str, str, str]]]] = deque([(start, [])])
        while queue:
            current, path = queue.popleft()
            if len(path) >= max_depth:
                continue
            for rel, targets in self.outgoing.get(current, {}).items():
                for target in targets:
                    step = (current, rel, target)
                    if target == end:
                        return path + [step]
                    if target not in visited:
                        visited.add(target)
                        queue.append((target, path + [step]))
        return None

    def transitive_closure(self, relation: str) -> Dict[str, Set[str]]:
        """Compute transitive closure for a specific relation.

        Args:
            relation: Relation label to follow.

        Returns:
            Mapping from entity to all reachable entities.
        """
        closure: Dict[str, Set[str]] = {}
        for entity in self.entities:
            reachable: Set[str] = set()
            stack = list(self.outgoing.get(entity, {}).get(relation, []))
            while stack:
                node = stack.pop()
                if node in reachable:
                    continue
                reachable.add(node)
                for nxt in self.outgoing.get(node, {}).get(relation, []):
                    if nxt not in reachable:
                        stack.append(nxt)
            closure[entity] = reachable
        return closure

    def infer_symmetric(self, relation: str) -> List[Tuple[str, str, str]]:
        """Infer symmetric triples: if A r B then B r A.

        Args:
            relation: Relation assumed symmetric.

        Returns:
            List of inferred triples not already in graph.
        """
        inferred: List[Tuple[str, str, str]] = []
        existing = set(self.triples)
        for s, r, o in self.triples:
            if r == relation:
                if (o, r, s) not in existing:
                    inferred.append((o, r, s))
        return inferred

    def infer_transitive(self, relation: str) -> List[Tuple[str, str, str]]:
        """Infer transitive triples: if A r B and B r C then A r C.

        Args:
            relation: Relation assumed transitive.

        Returns:
            List of inferred triples not already in graph.
        """
        inferred: List[Tuple[str, str, str]] = []
        existing = set(self.triples)
        closure = self.transitive_closure(relation)
        for s, reachable in closure.items():
            for o in reachable:
                if (s, relation, o) not in existing and s != o:
                    inferred.append((s, relation, o))
        return inferred

    def detect_cycles(self, relation: Optional[str] = None) -> List[List[str]]:
        """Detect elementary cycles in the graph.

        Args:
            relation: Optional relation to restrict cycle detection.

        Returns:
            List of cycles, each a list of entities.
        """
        cycles: List[List[str]] = []
        visited: Set[str] = set()
        rec_stack: Set[str] = set()
        path: List[str] = []

        def dfs(node: str) -> None:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            rels = self.outgoing.get(node, {})
            targets: List[str] = []
            if relation is None:
                for tlist in rels.values():
                    targets.extend(tlist)
            else:
                targets = rels.get(relation, [])
            for target in targets:
                if target not in visited:
                    dfs(target)
                elif target in rec_stack:
                    idx = path.index(target)
                    cycles.append(path[idx:] + [target])
            path.pop()
            rec_stack.remove(node)

        for entity in self.entities:
            if entity not in visited:
                dfs(entity)
        return cycles

    def pagerank(self, iterations: int = 20, damping: float = 0.85) -> Dict[str, float]:
        """Compute PageRank scores for entities.

        Args:
            iterations: Number of power iterations.
            damping: Damping factor.

        Returns:
            Mapping from entity to PageRank score.
        """
        n = len(self.entities)
        if n == 0:
            return {}
        scores = {e: 1.0 / n for e in self.entities}
        for _ in range(iterations):
            new_scores: Dict[str, float] = {}
            for entity in self.entities:
                rank = (1.0 - damping) / n
                for src, rels in self.incoming.get(entity, {}).items():
                    out_degree = sum(len(v) for v in self.outgoing.get(src, {}).values())
                    if out_degree > 0:
                        rank += damping * scores[src] * len(rels) / out_degree
                new_scores[entity] = rank
            scores = new_scores
        return scores

    def degree_centrality(self) -> Dict[str, int]:
        """Compute total degree centrality for each entity.

        Returns:
            Mapping from entity to total degree.
        """
        centrality: Dict[str, int] = {}
        for e in self.entities:
            out_deg = sum(len(v) for v in self.outgoing.get(e, {}).values())
            in_deg = sum(len(v) for v in self.incoming.get(e, {}).values())
            centrality[e] = out_deg + in_deg
        return centrality
