"""
bacterial_foraging.py — 细菌觅食优化引擎

实现 BFO 的趋化、繁殖、驱散三阶段，
支持自适应步长与多营养层级模拟。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Callable, Optional


class Bacterium:
    """单个细菌个体。"""

    def __init__(self, dim: int, bounds: List[Tuple[float, float]]):
        self.dim = dim
        self.bounds = bounds
        self.position = [random.uniform(lo, hi) for lo, hi in bounds]
        self.fitness = float('inf')
        self.health = 0.0
        self.step_size = 0.1

    def tumble(self) -> List[float]:
        """随机选择游动方向。"""
        vec = [random.gauss(0.0, 1.0) for _ in range(self.dim)]
        norm = math.sqrt(sum(v ** 2 for v in vec))
        if norm > 0:
            return [v / norm for v in vec]
        return [0.0] * self.dim

    def swim(self, direction: List[float], step: float) -> None:
        """沿方向游动一步。"""
        for i in range(self.dim):
            self.position[i] += step * direction[i]
            lo, hi = self.bounds[i]
            self.position[i] = max(lo, min(hi, self.position[i]))

    def evaluate(self, func: Callable[[List[float]], float]) -> None:
        """评估适应度。"""
        self.fitness = func(self.position)

    def reset(self, bounds: Optional[List[Tuple[float, float]]] = None) -> None:
        """重置位置。"""
        if bounds:
            self.bounds = bounds
        self.position = [random.uniform(lo, hi) for lo, hi in self.bounds]
        self.fitness = float('inf')
        self.health = 0.0

    def copy(self) -> Bacterium:
        """返回副本。"""
        b = Bacterium(self.dim, self.bounds)
        b.position = list(self.position)
        b.fitness = self.fitness
        b.health = self.health
        b.step_size = self.step_size
        return b

    def distance_to(self, other: Bacterium) -> float:
        """计算与另一细菌的距离。"""
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(self.position, other.position)))

    def chemotactic_step_size(self, iteration: int, max_iter: int) -> float:
        """自适应步长衰减。"""
        return self.step_size * (1.0 - iteration / max_iter)


class BacterialForagingOptimizer:
    """细菌觅食优化主引擎。"""

    def __init__(self, num_bacteria: int = 50, dim: int = 10,
                 bounds: Optional[List[Tuple[float, float]]] = None):
        self.num_bacteria = num_bacteria
        self.dim = dim
        self.bounds = bounds or [(-5.0, 5.0)] * dim
        self.bacteria = [Bacterium(dim, self.bounds) for _ in range(num_bacteria)]
        self.best_position: List[float] = [0.0] * dim
        self.best_fitness = float('inf')
        self.history: List[float] = []

    def optimize(self, func: Callable[[List[float]], float],
                 chemotactic_steps: int = 100, swim_length: int = 4,
                 reproductive_steps: int = 4, elimination_steps: int = 2,
                 elimination_prob: float = 0.25) -> List[float]:
        """运行 BFO 优化。"""
        for _ in range(elimination_steps):
            for _ in range(reproductive_steps):
                for chemo in range(chemotactic_steps):
                    for b in self.bacteria:
                        b.evaluate(func)
                        if b.fitness < self.best_fitness:
                            self.best_fitness = b.fitness
                            self.best_position = list(b.position)

                        direction = b.tumble()
                        step = b.chemotactic_step_size(chemo, chemotactic_steps)
                        for _ in range(swim_length):
                            old_fitness = b.fitness
                            b.swim(direction, step)
                            b.evaluate(func)
                            if b.fitness < old_fitness:
                                b.health += b.fitness
                                if b.fitness < self.best_fitness:
                                    self.best_fitness = b.fitness
                                    self.best_position = list(b.position)
                            else:
                                break
                self._reproduce()
                self.history.append(self.best_fitness)
            self._eliminate_dispersal(elimination_prob, func)
        return self.best_position

    def _reproduce(self) -> None:
        """健康度最高的细菌繁殖，替代最差的。"""
        self.bacteria.sort(key=lambda b: b.health)
        half = self.num_bacteria // 2
        for i in range(half):
            self.bacteria[i] = self.bacteria[half + i].copy()

    def _eliminate_dispersal(self, prob: float, func: Callable[[List[float]], float]) -> None:
        """以一定概率驱散细菌到随机位置。"""
        for b in self.bacteria:
            if random.random() < prob:
                b.reset()
                b.evaluate(func)
                if b.fitness < self.best_fitness:
                    self.best_fitness = b.fitness
                    self.best_position = list(b.position)

    def population_diversity(self) -> float:
        """计算种群多样性。"""
        center = [sum(b.position[i] for b in self.bacteria) / self.num_bacteria
                  for i in range(self.dim)]
        total = sum(math.sqrt(sum((b.position[i] - center[i]) ** 2 for i in range(self.dim)))
                    for b in self.bacteria)
        return total / self.num_bacteria

    def average_health(self) -> float:
        """计算平均健康度。"""
        return sum(b.health for b in self.bacteria) / self.num_bacteria

    def chemotaxis_efficiency(self, window: int = 10) -> float:
        """趋化效率：近期改进比例。"""
        if len(self.history) < window + 1:
            return 0.0
        improvements = sum(1 for i in range(1, window + 1)
                           if self.history[-i] < self.history[-i - 1])
        return improvements / window

    def nutrient_gradient(self, func: Callable[[List[float]], float],
                          position: List[float], eps: float = 1e-4) -> List[float]:
        """数值估算营养梯度。"""
        grad = []
        for i in range(self.dim):
            p_plus = list(position)
            p_minus = list(position)
            p_plus[i] += eps
            p_minus[i] -= eps
            grad.append((func(p_plus) - func(p_minus)) / (2.0 * eps))
        return grad

    def adaptive_elimination_prob(self, base_prob: float = 0.25) -> float:
        """基于多样性的自适应驱散概率。"""
        div = self.population_diversity()
        max_span = math.sqrt(sum((hi - lo) ** 2 for lo, hi in self.bounds))
        ratio = div / max_span if max_span > 0 else 0.0
        return base_prob * (1.5 - ratio)

    def best_bacterium(self) -> Bacterium:
        """返回最优细菌。"""
        return min(self.bacteria, key=lambda b: b.fitness)
