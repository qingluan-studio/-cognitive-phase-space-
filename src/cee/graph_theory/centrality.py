"""
centrality.py — 中心性分析引擎

实现度中心性、接近中心性、介数中心性、特征向量中心性、
Katz 中心性与 PageRank 中心性。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class CentralityAnalyzer:
    """图中心性分析引擎。"""

    def __init__(self, adjacency: List[List[float]]):
        self.adj = adjacency
        self.n = len(adjacency)

    def degree_centrality(self, normalized: bool = True) -> List[float]]:
        """度中心性。"""
        degrees = [sum(row) for row in self.adj]
        if normalized and self.n > 1:
            max_deg = max(degrees)
            if max_deg > 0:
                return [d / max_deg for d in degrees]
        return degrees

    def closeness_centrality(self, normalized: bool = True) -> List[float]]:
        """接近中心性。"""
        centrality = []
        for i in range(self.n):
            dists = self._bfs_distances(i)
            reachable = [d for d in dists if d > 0 and d != float('inf')]
            if reachable:
                avg_dist = sum(reachable) / len(reachable)
                cent = 1.0 / avg_dist if avg_dist > 0 else 0.0
            else:
                cent = 0.0
            centrality.append(cent)
        if normalized:
            max_c = max(centrality)
            if max_c > 0:
                centrality = [c / max_c for c in centrality]
        return centrality

    def _bfs_distances(self, start: int) -> List[float]:
        """BFS 距离。"""
        dist = [float('inf')] * self.n
        dist[start] = 0
        queue = [start]
        visited = {start}
        while queue:
            node = queue.pop(0)
            for neighbor in range(self.n):
                if self.adj[node][neighbor] > 0 and neighbor not in visited:
                    visited.add(neighbor)
                    dist[neighbor] = dist[node] + 1
                    queue.append(neighbor)
        return dist

    def betweenness_centrality(self, normalized: bool = True) -> List[float]]:
        """介数中心性（基于最短路径计数近似）。"""
        betweenness = [0.0] * self.n
        for s in range(self.n):
            for t in range(s + 1, self.n):
                paths = self._all_shortest_paths(s, t)
                if paths:
                    for path in paths:
                        for node in path[1:-1]:
                            betweenness[node] += 1.0
        if normalized and self.n > 2:
            factor = 2.0 / ((self.n - 1) * (self.n - 2))
            betweenness = [b * factor for b in betweenness]
        return betweenness

    def _all_shortest_paths(self, start: int, end: int) -> List[List[int]]:
        """BFS 获取所有最短路径。"""
        from collections import deque
        dist = {start: 0}
        parents: Dict[int, List[int]] = {start: []}
        queue = deque([start])
        while queue:
            node = queue.popleft()
            if node == end:
                break
            for neighbor in range(self.n):
                if self.adj[node][neighbor] > 0:
                    if neighbor not in dist:
                        dist[neighbor] = dist[node] + 1
                        parents[neighbor] = [node]
                        queue.append(neighbor)
                    elif dist[neighbor] == dist[node] + 1:
                        parents[neighbor].append(node)

        paths = []
        def backtrack(node: int, path: List[int]):
            if node == start:
                paths.append(path[::-1])
                return
            for parent in parents.get(node, []):
                backtrack(parent, path + [node])
        backtrack(end, [end])
        return paths

    def eigenvector_centrality(self, iterations: int = 100, tol: float = 1e-6) -> List[float]]:
        """特征向量中心性（幂迭代）。"""
        centrality = [1.0] * self.n
        for _ in range(iterations):
            new_cent = [sum(self.adj[i][j] * centrality[j] for j in range(self.n)) for i in range(self.n)]
            norm = math.sqrt(sum(c ** 2 for c in new_cent))
            if norm > 0:
                new_cent = [c / norm for c in new_cent]
            if max(abs(new_cent[i] - centrality[i]) for i in range(self.n)) < tol:
                break
            centrality = new_cent
        return centrality

    def katz_centrality(self, alpha: float = 0.1, beta: float = 1.0,
                        iterations: int = 100) -> List[float]]:
        """Katz 中心性。"""
        centrality = [beta] * self.n
        for _ in range(iterations):
            new_cent = [beta + alpha * sum(self.adj[i][j] * centrality[j] for j in range(self.n))
                        for i in range(self.n)]
            centrality = new_cent
        return centrality

    def pagerank_centrality(self, alpha: float = 0.85, iterations: int = 100) -> List[float]]:
        """PageRank 中心性。"""
        degrees = [sum(row) for row in self.adj]
        pr = [1.0 / self.n] * self.n
        for _ in range(iterations):
            new_pr = [0.0] * self.n
            for j in range(self.n):
                for i in range(self.n):
                    if degrees[i] > 0:
                        new_pr[j] += alpha * pr[i] * self.adj[i][j] / degrees[i]
            leak = (1.0 - alpha) / self.n
            for j in range(self.n):
                new_pr[j] += leak
            pr = new_pr
        return pr

    def harmonic_centrality(self) -> List[float]]:
        """Harmonic 中心性。"""
        centrality = []
        for i in range(self.n):
            dists = self._bfs_distances(i)
            hc = sum(1.0 / d for d in dists if d > 0 and d != float('inf'))
            centrality.append(hc)
        return centrality

    def percolation_centrality(self, infected: Set[int]) -> List[float]]:
        """渗透中心性（简化版）。"""
        pc = [0.0] * self.n
        for s in range(self.n):
            for t in range(s + 1, self.n):
                paths = self._all_shortest_paths(s, t)
                if paths:
                    num_through = sum(1 for path in paths for node in path[1:-1] if node in infected)
                    for path in paths:
                        for node in path[1:-1]:
                            if node in infected:
                                pc[node] += 1.0 / len(paths)
        return pc

    def centrality_correlation(self, cent1: List[float], cent2: List[float]) -> float:
        """计算两种中心性的 Pearson 相关系数。"""
        n = len(cent1)
        mean1 = sum(cent1) / n
        mean2 = sum(cent2) / n
        num = sum((cent1[i] - mean1) * (cent2[i] - mean2) for i in range(n))
        den1 = math.sqrt(sum((c - mean1) ** 2 for c in cent1))
        den2 = math.sqrt(sum((c - mean2) ** 2 for c in cent2))
        return num / (den1 * den2) if den1 > 0 and den2 > 0 else 0.0

    def top_k_nodes(self, centrality: List[float], k: int = 5) -> List[Tuple[int, float]]:
        """返回中心性最高的 k 个节点。"""
        indexed = [(i, centrality[i]) for i in range(self.n)]
        indexed.sort(key=lambda x: x[1], reverse=True)
        return indexed[:k]

    def centralization(self, centrality: List[float]) -> float:
        """计算中心性集中指数。"""
        max_c = max(centrality)
        diff_sum = sum(max_c - c for c in centrality)
        max_possible = (self.n - 1) * (self.n - 2) / self.n if self.n > 1 else 1.0
        return diff_sum / max_possible if max_possible > 0 else 0.0
