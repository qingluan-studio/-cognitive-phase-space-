"""
artificial_bee.py — 人工蜂群优化引擎

实现标准 ABC 算法，包含雇佣蜂、观察蜂与侦察蜂三个阶段，
支持动态极限值调整与多峰函数优化。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Callable, Optional


class Bee:
    """单只蜜蜂。"""

    def __init__(self, dim: int, bounds: List[Tuple[float, float]]):
        self.dim = dim
        self.bounds = bounds
        self.position = [random.uniform(lo, hi) for lo, hi in bounds]
        self.fitness = float('inf')
        self.trial = 0

    def copy(self) -> Bee:
        """返回副本。"""
        b = Bee(self.dim, self.bounds)
        b.position = list(self.position)
        b.fitness = self.fitness
        b.trial = self.trial
        return b

    def evaluate(self, func: Callable[[List[float]], float]) -> None:
        """评估位置。"""
        self.fitness = func(self.position)

    def reset(self) -> None:
        """随机重置位置。"""
        self.position = [random.uniform(lo, hi) for lo, hi in self.bounds]
        self.fitness = float('inf')
        self.trial = 0

    def produce_new_solution(self, partner: Bee, dim_idx: int) -> List[float]:
        """基于伙伴位置产生新解。"""
        phi = random.uniform(-1.0, 1.0)
        new_pos = list(self.position)
        new_pos[dim_idx] += phi * (self.position[dim_idx] - partner.position[dim_idx])
        lo, hi = self.bounds[dim_idx]
        new_pos[dim_idx] = max(lo, min(hi, new_pos[dim_idx]))
        return new_pos

    def distance_to(self, other: Bee) -> float:
        """与另一只蜜蜂的距离。"""
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(self.position, other.position)))

    def nectar_quality(self) -> float:
        """花蜜质量（用于轮盘赌）。"""
        return 1.0 / (1.0 + abs(self.fitness)) if self.fitness >= 0 else 1.0 + abs(self.fitness)

    def exploitation_potential(self) -> float:
        """开发潜力估计。"""
        return 1.0 / (1.0 + self.trial)


class ArtificialBeeColony:
    """人工蜂群优化主引擎。"""

    def __init__(self, num_employed: int = 50, dim: int = 10,
                 bounds: Optional[List[Tuple[float, float]]] = None):
        self.num_employed = num_employed
        self.dim = dim
        self.bounds = bounds or [(-5.0, 5.0)] * dim
        self.employed_bees = [Bee(dim, self.bounds) for _ in range(num_employed)]
        self.onlooker_bees = [Bee(dim, self.bounds) for _ in range(num_employed)]
        self.best_position: List[float] = [0.0] * dim
        self.best_fitness = float('inf')
        self.limit = num_employed * dim
        self.history: List[float] = []
        self.scout_count = 0

    def optimize(self, func: Callable[[List[float]], float],
                 max_cycles: int = 1000) -> List[float]:
        """运行 ABC 优化。"""
        for bee in self.employed_bees:
            bee.evaluate(func)
            if bee.fitness < self.best_fitness:
                self.best_fitness = bee.fitness
                self.best_position = list(bee.position)

        for cycle in range(max_cycles):
            self._employed_bee_phase(func)
            self._onlooker_bee_phase(func)
            self._scout_bee_phase(func)
            self.history.append(self.best_fitness)
        return self.best_position

    def _employed_bee_phase(self, func: Callable[[List[float]], float]) -> None:
        """雇佣蜂阶段。"""
        for bee in self.employed_bees:
            partner = random.choice(self.employed_bees)
            dim_idx = random.randint(0, self.dim - 1)
            new_pos = bee.produce_new_solution(partner, dim_idx)
            new_fitness = func(new_pos)
            if new_fitness < bee.fitness:
                bee.position = new_pos
                bee.fitness = new_fitness
                bee.trial = 0
                if new_fitness < self.best_fitness:
                    self.best_fitness = new_fitness
                    self.best_position = list(new_pos)
            else:
                bee.trial += 1

    def _onlooker_bee_phase(self, func: Callable[[List[float]], float]) -> None:
        """观察蜂阶段。"""
        fitnesses = [b.nectar_quality() for b in self.employed_bees]
        total = sum(fitnesses)
        probs = [f / total for f in fitnesses] if total > 0 else [1.0 / len(fitnesses)] * len(fitnesses)
        for i, bee in enumerate(self.onlooker_bees):
            selected = self._roulette_select(probs)
            source = self.employed_bees[selected]
            partner = random.choice(self.employed_bees)
            dim_idx = random.randint(0, self.dim - 1)
            new_pos = source.produce_new_solution(partner, dim_idx)
            new_fitness = func(new_pos)
            if new_fitness < source.fitness:
                source.position = new_pos
                source.fitness = new_fitness
                source.trial = 0
                if new_fitness < self.best_fitness:
                    self.best_fitness = new_fitness
                    self.best_position = list(new_pos)
            else:
                source.trial += 1
            bee.position = list(source.position)
            bee.fitness = source.fitness

    def _scout_bee_phase(self, func: Callable[[List[float]], float]) -> None:
        """侦察蜂阶段。"""
        for bee in self.employed_bees:
            if bee.trial >= self.limit:
                bee.reset()
                bee.evaluate(func)
                self.scout_count += 1
                if bee.fitness < self.best_fitness:
                    self.best_fitness = bee.fitness
                    self.best_position = list(bee.position)

    def _roulette_select(self, probs: List[float]) -> int:
        """轮盘赌选择索引。"""
        r = random.random()
        cum = 0.0
        for i, p in enumerate(probs):
            cum += p
            if r <= cum:
                return i
        return len(probs) - 1

    def convergence_curve(self) -> List[float]:
        """返回收敛曲线。"""
        return list(self.history)

    def population_diversity(self) -> float:
        """计算种群多样性。"""
        center = [sum(b.position[i] for b in self.employed_bees) / self.num_employed
                  for i in range(self.dim)]
        total = sum(math.sqrt(sum((b.position[i] - center[i]) ** 2 for i in range(self.dim)))
                    for b in self.employed_bees)
        return total / self.num_employed

    def adaptive_limit(self, base_limit: int, cycle: int, max_cycles: int) -> int:
        """基于进度的自适应 limit。"""
        return int(base_limit * (0.5 + 0.5 * (1.0 - cycle / max_cycles)))

    def abandonment_rate(self) -> float:
        """计算被放弃解的比例。"""
        abandoned = sum(1 for b in self.employed_bees if b.trial > self.limit / 2)
        return abandoned / self.num_employed

    def exploitation_ratio(self) -> float:
        """计算开发比例。"""
        avg_trial = sum(b.trial for b in self.employed_bees) / self.num_employed
        return avg_trial / self.limit if self.limit > 0 else 0.0

    def neighborhood_search(self, func: Callable[[List[float]], float],
                            center: List[float], radius: float = 0.1,
                            samples: int = 10) -> Tuple[List[float], float]:
        """在中心附近进行邻域搜索。"""
        best = list(center)
        best_fit = func(center)
        for _ in range(samples):
            candidate = [center[i] + random.uniform(-radius, radius) for i in range(self.dim)]
            for i in range(self.dim):
                lo, hi = self.bounds[i]
                candidate[i] = max(lo, min(hi, candidate[i]))
            fit = func(candidate)
            if fit < best_fit:
                best_fit = fit
                best = candidate
        return best, best_fit

    def reset_colony(self) -> None:
        """重置整个蜂群。"""
        for bee in self.employed_bees:
            bee.reset()
        for bee in self.onlooker_bees:
            bee.reset()
        self.best_fitness = float('inf')
        self.history.clear()
        self.scout_count = 0
