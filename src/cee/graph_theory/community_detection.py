"""
community_detection.py — 社区检测引擎

实现 Louvain 算法、模块度优化、标签传播、
Girvan-Newman 边介数方法与社区质量评估。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Set, Optional


class CommunityDetector:
    """社区检测引擎。"""

    def __init__(self, adjacency: List[List[float]]):
        self.adj = adjacency
        self.n = len(adjacency)
        self.m = sum(sum(row) for row in adjacency) / 2.0

    def modularity(self, communities: List[Set[int]]) -> float:
        """计算模块度 Q。"""
        Q = 0.0
        for comm in communities:
            internal = sum(self.adj[i][j] for i in comm for j in comm) / 2.0
            degree_sum = sum(sum(self.adj[i]) for i in comm)
            Q += internal / self.m - (degree_sum / (2.0 * self.m)) ** 2
        return Q

    def louvain(self, resolution: float = 1.0, max_iter: int = 100) -> List[Set[int]]:
        """Louvain 社区检测算法。"""
        communities = [{i} for i in range(self.n)]
        node_comm = list(range(self.n))
        improved = True
        iteration = 0
        while improved and iteration < max_iter:
            improved = False
            iteration += 1
            for i in range(self.n):
                best_gain = 0.0
                best_comm = node_comm[i]
                current_comm = node_comm[i]
                neighbors = [j for j in range(self.n) if self.adj[i][j] > 0 and j != i]
                comm_neighbors: Dict[int, List[int]] = {}
                for j in neighbors:
                    c = node_comm[j]
                    if c not in comm_neighbors:
                        comm_neighbors[c] = []
                    comm_neighbors[c].append(j)

                for comm, nbrs in comm_neighbors.items():
                    if comm == current_comm:
                        continue
                    k_i_in = sum(self.adj[i][j] for j in nbrs)
                    sigma_tot = sum(sum(self.adj[v]) for v in communities[comm])
                    k_i = sum(self.adj[i])
                    gain = k_i_in / self.m - resolution * sigma_tot * k_i / (2.0 * self.m ** 2)
                    if gain > best_gain:
                        best_gain = gain
                        best_comm = comm

                if best_comm != current_comm:
                    communities[current_comm].discard(i)
                    communities[best_comm].add(i)
                    node_comm[i] = best_comm
                    improved = True

            communities = [c for c in communities if c]
        return communities

    def label_propagation(self, max_iter: int = 100) -> List[Set[int]]:
        """标签传播算法。"""
        labels = list(range(self.n))
        for _ in range(max_iter):
            order = list(range(self.n))
            random.shuffle(order)
            changed = False
            for i in order:
                neighbor_labels: Dict[int, float] = {}
                for j in range(self.n):
                    if self.adj[i][j] > 0 and i != j:
                        neighbor_labels[labels[j]] = neighbor_labels.get(labels[j], 0.0) + self.adj[i][j]
                if neighbor_labels:
                    best_label = max(neighbor_labels.items(), key=lambda x: x[1])[0]
                    if best_label != labels[i]:
                        labels[i] = best_label
                        changed = True
            if not changed:
                break

        comm_map: Dict[int, Set[int]] = {}
        for i, lab in enumerate(labels):
            if lab not in comm_map:
                comm_map[lab] = set()
            comm_map[lab].add(i)
        return list(comm_map.values())

    def girvan_newman_step(self, communities: List[Set[int]]) -> Tuple[List[Set[int]], Tuple[int, int]]:
        """单步 Girvan-Newman 边移除。"""
        edge_betweenness: Dict[Tuple[int, int], float] = {}
        for i in range(self.n):
            for j in range(i + 1, self.n):
                if self.adj[i][j] > 0:
                    edge_betweenness[(i, j)] = self._edge_betweenness(i, j)
        if not edge_betweenness:
            return communities, (-1, -1)
        max_edge = max(edge_betweenness.items(), key=lambda x: x[1])[0]
        return communities, max_edge

    def _edge_betweenness(self, u: int, v: int) -> float:
        """近似边介数。"""
        betweenness = 0.0
        for s in range(self.n):
            for t in range(s + 1, self.n):
                if s != u and t != v:
                    path = self._shortest_path(s, t)
                    if path and (u, v) in [(min(path[i], path[i + 1]), max(path[i], path[i + 1]))
                                           for i in range(len(path) - 1)]:
                        betweenness += 1.0
        return betweenness

    def _shortest_path(self, start: int, end: int) -> List[int]:
        """BFS 最短路径。"""
        from collections import deque
        visited = {start: None}
        queue = deque([start])
        while queue:
            node = queue.popleft()
            if node == end:
                path = []
                while node is not None:
                    path.append(node)
                    node = visited[node]
                return path[::-1]
            for neighbor in range(self.n):
                if self.adj[node][neighbor] > 0 and neighbor not in visited:
                    visited[neighbor] = node
                    queue.append(neighbor)
        return []

    def conductance(self, community: Set[int]) -> float:
        """计算社区的 conductance。"""
        internal = sum(self.adj[i][j] for i in community for j in community if i != j) / 2.0
        external = sum(self.adj[i][j] for i in community for j in range(self.n) if j not in community)
        denominator = min(2.0 * internal + external, 2.0 * (self.m - internal) + external)
        return external / denominator if denominator > 0 else 0.0

    def normalized_cut(self, communities: List[Set[int]]) -> float:
        """计算归一化割。"""
        ncut = 0.0
        for comm in communities:
            cut = sum(self.adj[i][j] for i in comm for j in range(self.n) if j not in comm)
            volume = sum(sum(self.adj[i]) for i in comm)
            ncut += cut / volume if volume > 0 else 0.0
        return ncut

    def partition_density(self, communities: List[Set[int]]) -> float:
        """计算分割密度。"""
        densities = []
        for comm in communities:
            n_c = len(comm)
            if n_c <= 1:
                continue
            internal_edges = sum(1 for i in comm for j in comm if i < j and self.adj[i][j] > 0)
            max_edges = n_c * (n_c - 1) / 2.0
            densities.append(internal_edges / max_edges if max_edges > 0 else 0.0)
        return sum(densities) / len(densities) if densities else 0.0

    def resolution_limit_test(self, communities: List[Set[int]]) -> bool:
        """检测是否受分辨率限制影响。"""
        for comm in communities:
            internal = sum(self.adj[i][j] for i in comm for j in comm) / 2.0
            if internal < math.sqrt(2.0 * self.m):
                return True
        return False

    def consensus_clustering(self, runs: int = 10) -> List[Set[int]]:
        """基于多次运行的共识聚类。"""
        cooccurrence = [[0.0] * self.n for _ in range(self.n)]
        for _ in range(runs):
            comms = self.louvain()
            for comm in comms:
                for i in comm:
                    for j in comm:
                        cooccurrence[i][j] += 1.0
        threshold = runs / 2.0
        communities = []
        visited = set()
        for i in range(self.n):
            if i in visited:
                continue
            comm = {j for j in range(self.n) if cooccurrence[i][j] >= threshold}
            communities.append(comm)
            visited |= comm
        return communities
