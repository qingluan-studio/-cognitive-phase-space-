"""
random_walk.py — 随机游走引擎

实现图上随机游走、命中时间、覆盖时间、
PageRank 与混合时间分析。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class RandomWalk:
    """图上随机游走模拟器。"""

    def __init__(self, adjacency: List[List[float]]):
        self.adj = adjacency
        self.n = len(adjacency)
        self.degrees = [sum(row) for row in adjacency]
        self.transition = self._build_transition_matrix()
        self.position = 0
        self.history = [0]

    def _build_transition_matrix(self) -> List[List[float]]:
        """构建转移概率矩阵。"""
        P = [[0.0] * self.n for _ in range(self.n)]
        for i in range(self.n):
            if self.degrees[i] > 0:
                for j in range(self.n):
                    P[i][j] = self.adj[i][j] / self.degrees[i]
        return P

    def step(self) -> int:
        """单步随机游走。"""
        probs = self.transition[self.position]
        r = random.random()
        cum = 0.0
        for j, p in enumerate(probs):
            cum += p
            if r <= cum:
                self.position = j
                self.history.append(j)
                return j
        self.position = self.n - 1
        self.history.append(self.n - 1)
        return self.n - 1

    def walk(self, steps: int) -> List[int]:
        """游走指定步数。"""
        for _ in range(steps):
            self.step()
        return self.history

    def stationary_distribution(self) -> List[float]:
        """计算平稳分布（正则图近似）。"""
        total = sum(self.degrees)
        if total == 0:
            return [1.0 / self.n] * self.n
        return [d / total for d in self.degrees]

    def hitting_time(self, target: int, trials: int = 100, max_steps: int = 10000) -> float:
        """估算从当前位置到目标的平均命中时间。"""
        times = []
        start = self.position
        for _ in range(trials):
            self.position = start
            steps = 0
            while self.position != target and steps < max_steps:
                self.step()
                steps += 1
            times.append(steps)
        return sum(times) / len(times)

    def cover_time_estimate(self, trials: int = 50, max_steps: int = 50000) -> float:
        """估算覆盖时间。"""
        times = []
        for _ in range(trials):
            self.position = random.randint(0, self.n - 1)
            visited = {self.position}
            steps = 0
            while len(visited) < self.n and steps < max_steps:
                self.step()
                visited.add(self.position)
                steps += 1
            times.append(steps)
        return sum(times) / len(times)

    def commute_time(self, i: int, j: int) -> float:
        """计算往返时间。"""
        self.position = i
        h_ij = self.hitting_time(j)
        self.position = j
        h_ji = self.hitting_time(i)
        return h_ij + h_ji

    def pagerank(self, alpha: float = 0.85, iterations: int = 100) -> List[float]]:
        """计算 PageRank。"""
        pr = [1.0 / self.n] * self.n
        for _ in range(iterations):
            new_pr = [0.0] * self.n
            for j in range(self.n):
                for i in range(self.n):
                    if self.degrees[i] > 0:
                        new_pr[j] += alpha * pr[i] * self.adj[i][j] / self.degrees[i]
            leak = (1.0 - alpha) / self.n
            for j in range(self.n):
                new_pr[j] += leak
            pr = new_pr
        return pr

    def mixing_time(self, epsilon: float = 0.01, trials: int = 100) -> int:
        """估算混合时间。"""
        stat = self.stationary_distribution()
        max_steps = 0
        for _ in range(trials):
            self.position = random.randint(0, self.n - 1)
            dist = [0.0] * self.n
            dist[self.position] = 1.0
            for t in range(1, 1000):
                new_dist = [0.0] * self.n
                for i in range(self.n):
                    for j in range(self.n):
                        new_dist[j] += dist[i] * self.transition[i][j]
                dist = new_dist
                tv = 0.5 * sum(abs(dist[i] - stat[i]) for i in range(self.n))
                if tv < epsilon:
                    max_steps = max(max_steps, t)
                    break
        return max_steps

    def return_probability(self, node: int, steps: int) -> float:
        """计算 t 步返回概率。"""
        dist = [0.0] * self.n
        dist[node] = 1.0
        for _ in range(steps):
            new_dist = [0.0] * self.n
            for i in range(self.n):
                for j in range(self.n):
                    new_dist[j] += dist[i] * self.transition[i][j]
            dist = new_dist
        return dist[node]

    def mean_first_passage_time(self, target: int) -> List[float]:
        """计算到目标节点的平均首达时间（近似）。"""
        m = [0.0] * self.n
        for _ in range(100):
            new_m = [0.0] * self.n
            for i in range(self.n):
                if i == target:
                    new_m[i] = 0.0
                else:
                    new_m[i] = 1.0 + sum(self.transition[i][j] * m[j] for j in range(self.n))
            m = new_m
        return m

    def reset(self, node: int = 0) -> None:
        """重置位置。"""
        self.position = node
        self.history = [node]

    def edge_visit_frequency(self, steps: int = 10000) -> Dict[Tuple[int, int], float]:
        """估算边访问频率。"""
        counts: Dict[Tuple[int, int], int] = {}
        self.reset(random.randint(0, self.n - 1))
        prev = self.position
        for _ in range(steps):
            curr = self.step()
            edge = (min(prev, curr), max(prev, curr))
            counts[edge] = counts.get(edge, 0) + 1
            prev = curr
        total = sum(counts.values())
        return {edge: count / total for edge, count in counts.items()}
