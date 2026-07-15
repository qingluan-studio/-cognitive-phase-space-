"""
ant_colony.py — 蚁群优化引擎

实现 ACO 的蚂蚁系统 (Ant System) 与最大最小蚂蚁系统 (MMAS)，
支持 TSP、路径规划与动态环境适应。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Callable, Optional


class Ant:
    """单只蚂蚁，维护路径与信息素记忆。"""

    def __init__(self, num_nodes: int):
        self.num_nodes = num_nodes
        self.path: List[int] = []
        self.visited: set = set()
        self.path_length = 0.0

    def reset(self) -> None:
        """重置蚂蚁状态。"""
        self.path.clear()
        self.visited.clear()
        self.path_length = 0.0

    def visit(self, node: int, distance: float = 0.0) -> None:
        """访问节点。"""
        self.path.append(node)
        self.visited.add(node)
        self.path_length += distance

    def can_visit(self, node: int) -> bool:
        """检查节点是否可访问。"""
        return node not in self.visited

    def choose_next(self, current: int, pheromone: List[List[float]],
                    heuristic: List[List[float]], alpha: float = 1.0,
                    beta: float = 2.0) -> int:
        """根据信息素与启发式选择下一节点。"""
        candidates = [i for i in range(self.num_nodes) if i not in self.visited]
        if not candidates:
            return -1
        probabilities = []
        total = 0.0
        for j in candidates:
            tau = max(pheromone[current][j], 1e-10)
            eta = max(heuristic[current][j], 1e-10)
            val = (tau ** alpha) * (eta ** beta)
            probabilities.append(val)
            total += val
        if total == 0:
            return random.choice(candidates)
        r = random.random() * total
        cum = 0.0
        for j, p in zip(candidates, probabilities):
            cum += p
            if r <= cum:
                return j
        return candidates[-1]

    def complete_tour(self, distances: List[List[float]]) -> None:
        """闭合 TSP 回路。"""
        if len(self.path) > 1:
            self.path_length += distances[self.path[-1]][self.path[0]]

    def local_search_2opt(self, distances: List[List[float]]) -> None:
        """2-opt 局部搜索改进路径。"""
        improved = True
        while improved:
            improved = False
            for i in range(1, len(self.path) - 2):
                for j in range(i + 1, len(self.path)):
                    if j - i == 1:
                        continue
                    old_len = (distances[self.path[i - 1]][self.path[i]] +
                               distances[self.path[j - 1]][self.path[j]] if j < len(self.path) else 0)
                    new_len = (distances[self.path[i - 1]][self.path[j - 1]] +
                               distances[self.path[i]][self.path[j]] if j < len(self.path) else 0)
                    if new_len < old_len:
                        self.path[i:j] = reversed(self.path[i:j])
                        improved = True
                        break
                if improved:
                    break
        self._recalculate_length(distances)

    def _recalculate_length(self, distances: List[List[float]]) -> None:
        """重新计算路径长度。"""
        self.path_length = 0.0
        for i in range(len(self.path) - 1):
            self.path_length += distances[self.path[i]][self.path[i + 1]]
        if self.path:
            self.path_length += distances[self.path[-1]][self.path[0]]

    def path_quality(self) -> float:
        """路径质量（越短越好）。"""
        return 1.0 / (1.0 + self.path_length)


class AntColonyOptimizer:
    """蚁群优化主引擎。"""

    def __init__(self, num_ants: int = 20, num_nodes: int = 20,
                 evaporation: float = 0.5, alpha: float = 1.0, beta: float = 2.0):
        self.num_ants = num_ants
        self.num_nodes = num_nodes
        self.evaporation = evaporation
        self.alpha = alpha
        self.beta = beta
        self.pheromone: List[List[float]] = [[1.0] * num_nodes for _ in range(num_nodes)]
        self.heuristic: List[List[float]] = [[1.0] * num_nodes for _ in range(num_nodes)]
        self.distances: List[List[float]] = [[0.0] * num_nodes for _ in range(num_nodes)]
        self.best_path: List[int] = []
        self.best_length = float('inf')
        self.history: List[float] = []

    def set_distances(self, distances: List[List[float]]) -> None:
        """设置距离矩阵并更新启发式信息。"""
        self.distances = distances
        self.num_nodes = len(distances)
        self.pheromone = [[1.0] * self.num_nodes for _ in range(self.num_nodes)]
        self.heuristic = [[0.0] * self.num_nodes for _ in range(self.num_nodes)]
        for i in range(self.num_nodes):
            for j in range(self.num_nodes):
                if i != j and distances[i][j] > 0:
                    self.heuristic[i][j] = 1.0 / distances[i][j]

    def solve_tsp(self, iterations: int = 100, use_local_search: bool = False) -> Tuple[List[int], float]:
        """求解 TSP。"""
        for it in range(iterations):
            ants = [Ant(self.num_nodes) for _ in range(self.num_ants)]
            for ant in ants:
                start = random.randint(0, self.num_nodes - 1)
                ant.visit(start)
                current = start
                while len(ant.path) < self.num_nodes:
                    next_node = ant.choose_next(current, self.pheromone, self.heuristic, self.alpha, self.beta)
                    if next_node == -1:
                        break
                    ant.visit(next_node, self.distances[current][next_node])
                    current = next_node
                ant.complete_tour(self.distances)
                if use_local_search:
                    ant.local_search_2opt(self.distances)
                if ant.path_length < self.best_length:
                    self.best_length = ant.path_length
                    self.best_path = list(ant.path)
            self._update_pheromone(ants)
            self.history.append(self.best_length)
        return self.best_path, self.best_length

    def _update_pheromone(self, ants: List[Ant]) -> None:
        """全局信息素更新。"""
        for i in range(self.num_nodes):
            for j in range(self.num_nodes):
                self.pheromone[i][j] *= (1.0 - self.evaporation)
        for ant in ants:
            deposit = 1.0 / ant.path_length if ant.path_length > 0 else 0.0
            for k in range(len(ant.path) - 1):
                a, b = ant.path[k], ant.path[k + 1]
                self.pheromone[a][b] += deposit
                self.pheromone[b][a] += deposit

    def mmas_update(self, ants: List[Ant], tau_min: float = 0.1, tau_max: float = 5.0) -> None:
        """最大最小蚂蚁系统更新。"""
        for i in range(self.num_nodes):
            for j in range(self.num_nodes):
                self.pheromone[i][j] = max(tau_min, min(tau_max,
                    self.pheromone[i][j] * (1.0 - self.evaporation)))
        if self.best_path:
            deposit = 1.0 / self.best_length if self.best_length > 0 else 0.0
            for k in range(len(self.best_path) - 1):
                a, b = self.best_path[k], self.best_path[k + 1]
                self.pheromone[a][b] = min(tau_max, self.pheromone[a][b] + deposit)
                self.pheromone[b][a] = self.pheromone[a][b]

    def pheromone_entropy(self) -> float:
        """计算信息素分布的熵。"""
        flat = [self.pheromone[i][j] for i in range(self.num_nodes) for j in range(self.num_nodes) if i != j]
        total = sum(flat)
        if total == 0:
            return 0.0
        probs = [v / total for v in flat]
        return -sum(p * math.log(p) for p in probs if p > 0)

    def stagnation_detect(self, window: int = 10) -> bool:
        """检测停滞。"""
        if len(self.history) < window:
            return False
        recent = self.history[-window:]
        return max(recent) - min(recent) < 1e-6

    def reset_pheromone(self, value: float = 1.0) -> None:
        """重置信息素。"""
        for i in range(self.num_nodes):
            for j in range(self.num_nodes):
                self.pheromone[i][j] = value

    def convergence_curve(self) -> List[float]:
        """返回最优路径长度历史。"""
        return list(self.history)

    def average_tour_length(self, ants: List[Ant]) -> float:
        """计算当前迭代蚂蚁的平均路径长度。"""
        return sum(ant.path_length for ant in ants) / len(ants) if ants else 0.0
