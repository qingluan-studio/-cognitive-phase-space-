"""
evolutionary_strategy.py — 进化策略引擎

实现 (mu, lambda) 与 (mu+lambda) 进化策略、
CMA-ES 简化版、以及自适应步长控制。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Callable, Optional


class ESIndividual:
    """进化策略个体：包含解向量与策略参数（步长）。"""

    def __init__(self, x: List[float], sigma: List[float]):
        self.x = list(x)
        self.sigma = list(sigma)
        self.fitness: Optional[float] = None

    def copy(self) -> ESIndividual:
        """深拷贝个体。"""
        ind = ESIndividual(list(self.x), list(self.sigma))
        ind.fitness = self.fitness
        return ind

    def mutate(self, tau: float = 1.0 / math.sqrt(2.0 * len(self.x)),
               tau_prime: float = 1.0 / math.sqrt(2.0 * len(self.x))) -> None:
        """对数正态自适应变异。"""
        n = len(self.x)
        global_noise = random.gauss(0.0, 1.0) * tau_prime
        for i in range(n):
            local_noise = random.gauss(0.0, 1.0) * tau
            self.sigma[i] *= math.exp(global_noise + local_noise)
            self.sigma[i] = max(1e-10, self.sigma[i])
            self.x[i] += self.sigma[i] * random.gauss(0.0, 1.0)

    def recombination_discrete(self, other: ESIndividual) -> ESIndividual:
        """离散重组。"""
        child_x = [random.choice([self.x[i], other.x[i]]) for i in range(len(self.x))]
        child_sigma = [random.choice([self.sigma[i], other.sigma[i]]) for i in range(len(self.sigma))]
        return ESIndividual(child_x, child_sigma)

    def recombination_intermediate(self, other: ESIndividual) -> ESIndividual:
        """中间重组。"""
        child_x = [(self.x[i] + other.x[i]) / 2.0 for i in range(len(self.x))]
        child_sigma = [(self.sigma[i] + other.sigma[i]) / 2.0 for i in range(len(self.sigma))]
        return ESIndividual(child_x, child_sigma)

    def distance(self, other: ESIndividual) -> float:
        """解空间欧氏距离。"""
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(self.x, other.x)))


class EvolutionaryStrategy:
    """标准 (mu, lambda) / (mu+lambda) 进化策略。"""

    def __init__(self, dim: int, mu: int = 10, lambda_: int = 70,
                 plus_selection: bool = False, bounds: Optional[List[Tuple[float, float]]] = None):
        self.dim = dim
        self.mu = mu
        self.lambda_ = lambda_
        self.plus_selection = plus_selection
        self.bounds = bounds
        self.population: List[ESIndividual] = []
        self.generation = 0
        self.fitness_history: List[float] = []
        self._init_population()

    def _init_population(self) -> None:
        """初始化父代种群。"""
        for _ in range(self.mu):
            x = [random.uniform(-5.0, 5.0) for _ in range(self.dim)]
            sigma = [random.uniform(0.5, 1.5) for _ in range(self.dim)]
            self.population.append(ESIndividual(x, sigma))

    def evaluate(self, fitness_func: Callable[[List[float]], float]) -> None:
        """评估种群。"""
        for ind in self.population:
            if ind.fitness is None:
                ind.fitness = fitness_func(ind.x)

    def evolve(self, fitness_func: Callable[[List[float]], float],
               generations: int = 100) -> ESIndividual:
        """运行 ES 演化。"""
        self.evaluate(fitness_func)
        for _ in range(generations):
            self.generation += 1
            offspring = []
            for _ in range(self.lambda_):
                p1, p2 = random.sample(self.population, 2)
                child = p1.recombination_intermediate(p2)
                child.mutate()
                if self.bounds:
                    for i, (lo, hi) in enumerate(self.bounds):
                        child.x[i] = max(lo, min(hi, child.x[i]))
                child.fitness = fitness_func(child.x)
                offspring.append(child)

            if self.plus_selection:
                pool = self.population + offspring
            else:
                pool = offspring

            pool.sort(key=lambda ind: ind.fitness or float('inf'))
            self.population = [ind.copy() for ind in pool[:self.mu]]
            best = self.population[0]
            self.fitness_history.append(best.fitness or float('inf'))
        return self.best_individual()

    def best_individual(self) -> ESIndividual:
        """返回当前最优个体。"""
        return min(self.population, key=lambda ind: ind.fitness or float('inf'))

    def average_step_size(self) -> float:
        """计算平均步长。"""
        total = sum(sum(ind.sigma) / len(ind.sigma) for ind in self.population)
        return total / len(self.population)

    def success_rate(self, window: int = 10) -> float:
        """估算最近的成功 rate。"""
        if len(self.fitness_history) < window + 1:
            return 0.0
        improvements = sum(1 for i in range(1, window + 1)
                           if self.fitness_history[-i] < self.fitness_history[-i - 1])
        return improvements / window

    def adaptation_quality(self) -> float:
        """评估步长自适应质量。"""
        avg_sigma = self.average_step_size()
        if avg_sigma < 0.01:
            return 0.0
        if avg_sigma > 10.0:
            return 1.0
        return avg_sigma / 10.0

    def restart(self) -> None:
        """重新初始化种群。"""
        self.population.clear()
        self.fitness_history.clear()
        self.generation = 0
        self._init_population()

    def covariance_estimate(self) -> List[List[float]]:
        """估算当前种群的协方差矩阵。"""
        n = self.dim
        means = [sum(ind.x[i] for ind in self.population) / len(self.population) for i in range(n)]
        cov = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                cov[i][j] = sum((ind.x[i] - means[i]) * (ind.x[j] - means[j])
                                for ind in self.population) / len(self.population)
        return cov

    def step_size_control_1_5th(self, target_rate: float = 0.2, c: float = 0.8) -> None:
        """1/5 成功规则调整步长。"""
        rate = self.success_rate()
        factor = math.exp((rate - target_rate) / (1.0 - target_rate))
        for ind in self.population:
            for i in range(len(ind.sigma)):
                ind.sigma[i] *= factor ** c


class SimpleCMAES:
    """简化版 CMA-ES 实现。"""

    def __init__(self, dim: int, sigma: float = 0.5):
        self.dim = dim
        self.sigma = sigma
        self.mean = [random.uniform(-3.0, 3.0) for _ in range(dim)]
        self.C = [[1.0 if i == j else 0.0 for j in range(dim)] for i in range(dim)]
        self.pc = [0.0] * dim
        self.ps = [0.0] * dim
        self.generation = 0
        self.mu_eff = 4.0
        self.cc = 4.0 / (dim + 4.0)
        self.cs = self.mu_eff / (dim + self.mu_eff)
        self.c1 = 2.0 / ((dim + 1.3) ** 2 + self.mu_eff)
        self.cmu = min(1.0 - self.c1, 2.0 * (self.mu_eff - 2.0 + 1.0 / self.mu_eff) /
                       ((dim + 2.0) ** 2 + self.mu_eff))
        self.damps = 1.0 + 2.0 * max(0.0, math.sqrt((self.mu_eff - 1.0) / (dim + 1.0)) - 1.0) + self.cs

    def sample(self, num: int) -> List[List[float]]:
        """从当前分布采样 num 个个体。"""
        samples = []
        for _ in range(num):
            z = [random.gauss(0.0, 1.0) for _ in range(self.dim)]
            y = [sum(self.C[i][j] * z[j] for j in range(self.dim)) for i in range(self.dim)]
            x = [self.mean[i] + self.sigma * y[i] for i in range(self.dim)]
            samples.append(x)
        return samples

    def update(self, sorted_solutions: List[Tuple[List[float], float]], weights: Optional[List[float]] = None) -> None:
        """使用排序后的解更新分布参数。"""
        if weights is None:
            weights = [math.log(self.mu_eff + 0.5) - math.log(i + 1.0) for i in range(len(sorted_solutions))]
            total = sum(weights)
            weights = [w / total for w in weights]

        old_mean = list(self.mean)
        for i in range(self.dim):
            self.mean[i] = sum(w * sol[0][i] for w, sol in zip(weights, sorted_solutions))

        self.pc = [(1.0 - self.cc) * self.pc[i] + math.sqrt(self.cc * (2.0 - self.cc) * self.mu_eff) *
                   (self.mean[i] - old_mean[i]) / self.sigma for i in range(self.dim)]

        for i in range(self.dim):
            for j in range(self.dim):
                rank_one = self.c1 * self.pc[i] * self.pc[j]
                rank_mu = self.cmu * sum(w * (sol[0][i] - old_mean[i]) * (sol[0][j] - old_mean[j]) / (self.sigma ** 2)
                                         for w, sol in zip(weights, sorted_solutions))
                self.C[i][j] = (1.0 - self.c1 - self.cmu) * self.C[i][j] + rank_one + rank_mu

        self.generation += 1

    def eigen_decomposition_approx(self) -> List[float]:
        """近似特征值分解，返回特征值列表。"""
        trace = sum(self.C[i][i] for i in range(self.dim))
        det_approx = trace / self.dim
        return [det_approx] * self.dim

    def condition_number(self) -> float:
        """返回条件数估计。"""
        eigvals = self.eigen_decomposition_approx()
        max_eig = max(eigvals)
        min_eig = min(eigvals)
        return max_eig / min_eig if min_eig > 0 else float('inf')

    def reset(self, dim: Optional[int] = None) -> None:
        """重置分布。"""
        if dim:
            self.dim = dim
        self.mean = [random.uniform(-3.0, 3.0) for _ in range(self.dim)]
        self.C = [[1.0 if i == j else 0.0 for j in range(self.dim)] for i in range(self.dim)]
        self.pc = [0.0] * self.dim
        self.ps = [0.0] * self.dim
        self.generation = 0
