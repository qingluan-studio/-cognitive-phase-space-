"""
fitness_landscape.py — 适应度景观分析器

实现 NK 模型、Rugged 景观、梯度场分析、
局部最优搜索与中性网络检测。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Callable, Optional


class NKLandscape:
    """NK 适应度景观模型。"""

    def __init__(self, n: int = 20, k: int = 4):
        self.n = n
        self.k = k
        self.interactions = [random.sample([i for i in range(n) if i != j], k)
                             for j in range(n)]
        self.lookup_tables: List[Dict[Tuple[int, ...], float]] = []
        for j in range(n):
            table: Dict[Tuple[int, ...], float] = {}
            for bits in range(2 ** (k + 1)):
                key = tuple((bits >> i) & 1 for i in range(k + 1))
                table[key] = random.random()
            self.lookup_tables.append(table)

    def fitness(self, genotype: List[int]) -> float:
        """计算 NK 景观上的适应度。"""
        total = 0.0
        for j in range(self.n):
            neighbors = [genotype[j]] + [genotype[i] for i in self.interactions[j]]
            key = tuple(neighbors)
            total += self.lookup_tables[j].get(key, 0.0)
        return total / self.n

    def neighbors(self, genotype: List[int]) -> List[List[int]]:
        """返回单点翻转邻居。"""
        nbrs = []
        for i in range(self.n):
            nbr = list(genotype)
            nbr[i] = 1 - nbr[i]
            nbrs.append(nbr)
        return nbrs

    def local_optimum(self, genotype: List[int]) -> List[int]:
        """通过贪心爬山搜索局部最优。"""
        current = list(genotype)
        current_fit = self.fitness(current)
        improved = True
        while improved:
            improved = False
            for nbr in self.neighbors(current):
                f = self.fitness(nbr)
                if f > current_fit:
                    current = nbr
                    current_fit = f
                    improved = True
                    break
        return current

    def ruggedness(self, samples: int = 1000) -> float:
        """通过随机行走的适应度变化估算崎岖度。"""
        genotype = [random.randint(0, 1) for _ in range(self.n)]
        fits = []
        for _ in range(samples):
            i = random.randint(0, self.n - 1)
            genotype[i] = 1 - genotype[i]
            fits.append(self.fitness(genotype))
        diffs = [abs(fits[i] - fits[i - 1]) for i in range(1, len(fits))]
        return sum(diffs) / len(diffs) if diffs else 0.0

    def epistasis_measure(self) -> float:
        """估算上位效应强度。"""
        return self.k / self.n

    def number_of_peaks(self, trials: int = 100) -> int:
        """通过多次随机初始化估算局部最优数量。"""
        peaks: set = set()
        for _ in range(trials):
            g = [random.randint(0, 1) for _ in range(self.n)]
            peak = self.local_optimum(g)
            peaks.add(tuple(peak))
        return len(peaks)

    def autocorrelation(self, walk_length: int = 100) -> float:
        """计算适应度自相关长度。"""
        genotype = [random.randint(0, 1) for _ in range(self.n)]
        fits = [self.fitness(genotype)]
        for _ in range(walk_length):
            i = random.randint(0, self.n - 1)
            genotype[i] = 1 - genotype[i]
            fits.append(self.fitness(genotype))
        mean_f = sum(fits) / len(fits)
        num = sum((fits[i] - mean_f) * (fits[i + 1] - mean_f) for i in range(len(fits) - 1))
        den = sum((f - mean_f) ** 2 for f in fits)
        return num / den if den > 0 else 0.0

    def neutrality(self, genotype: List[int]) -> float:
        """检测中性邻居比例。"""
        f = self.fitness(genotype)
        neutral = sum(1 for nbr in self.neighbors(genotype) if abs(self.fitness(nbr) - f) < 1e-6)
        return neutral / self.n


class ContinuousFitnessLandscape:
    """连续适应度景观。"""

    def __init__(self, dim: int = 2):
        self.dim = dim

    def sphere(self, x: List[float]) -> float:
        """Sphere 函数。"""
        return -sum(xi ** 2 for xi in x)

    def rastrigin(self, x: List[float], A: float = 10.0) -> float:
        """Rastrigin 函数。"""
        return -(A * self.dim + sum(xi ** 2 - A * math.cos(2.0 * math.pi * xi) for xi in x))

    def ackley(self, x: List[float]) -> float:
        """Ackley 函数。"""
        a, b, c = 20.0, 0.2, 2.0 * math.pi
        sum1 = sum(xi ** 2 for xi in x)
        sum2 = sum(math.cos(c * xi) for xi in x)
        term1 = -a * math.exp(-b * math.sqrt(sum1 / self.dim))
        term2 = -math.exp(sum2 / self.dim)
        return term1 + term2 + a + math.e

    def gradient(self, func: Callable[[List[float]], float], x: List[float],
                 eps: float = 1e-5) -> List[float]:
        """数值梯度。"""
        grad = []
        for i in range(len(x)):
            x_plus = list(x)
            x_minus = list(x)
            x_plus[i] += eps
            x_minus[i] -= eps
            grad.append((func(x_plus) - func(x_minus)) / (2.0 * eps))
        return grad

    def hessian_approx(self, func: Callable[[List[float]], float], x: List[float],
                       eps: float = 1e-4) -> List[List[float]]:
        """数值 Hessian 近似。"""
        n = len(x)
        h = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                x_pp = list(x); x_pp[i] += eps; x_pp[j] += eps
                x_pm = list(x); x_pm[i] += eps; x_pm[j] -= eps
                x_mp = list(x); x_mp[i] -= eps; x_mp[j] += eps
                x_mm = list(x); x_mm[i] -= eps; x_mm[j] -= eps
                h[i][j] = (func(x_pp) - func(x_pm) - func(x_mp) + func(x_mm)) / (4.0 * eps * eps)
        return h

    def saddle_point_test(self, x: List[float]) -> str:
        """简易鞍点检测。"""
        hess = self.hessian_approx(self.sphere, x)
        eigvals = [hess[i][i] for i in range(len(hess))]
        pos = sum(1 for v in eigvals if v > 0)
        neg = sum(1 for v in eigvals if v < 0)
        if pos > 0 and neg > 0:
            return "saddle"
        elif pos > 0:
            return "minimum"
        else:
            return "maximum"

    def basin_of_attraction(self, func: Callable[[List[float]], float],
                            x0: List[float], steps: int = 100, lr: float = 0.01) -> List[float]:
        """梯度上升寻找吸引域中心。"""
        x = list(x0)
        for _ in range(steps):
            g = self.gradient(func, x)
            for i in range(len(x)):
                x[i] += lr * g[i]
        return x

    def fitness_correlation_length(self, points: List[List[float]],
                                   func: Callable[[List[float]], float]) -> float:
        """计算空间适应度相关长度。"""
        fits = [func(p) for p in points]
        mean_f = sum(fits) / len(fits)
        var = sum((f - mean_f) ** 2 for f in fits) / len(fits)
        if var == 0:
            return 0.0
        cov_sum = 0.0
        count = 0
        for i in range(len(points)):
            for j in range(i + 1, len(points)):
                dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(points[i], points[j])))
                if dist > 0:
                    cov_sum += (fits[i] - mean_f) * (fits[j] - mean_f) / dist
                    count += 1
        return cov_sum / count if count > 0 else 0.0

    def local_peak_density(self, samples: int = 100, search_steps: int = 50) -> float:
        """估计局部峰密度。"""
        peaks: set = set()
        for _ in range(samples):
            x0 = [random.uniform(-5.0, 5.0) for _ in range(self.dim)]
            peak = tuple(round(v, 2) for v in self.basin_of_attraction(self.rastrigin, x0, search_steps))
            peaks.add(peak)
        return len(peaks) / (10.0 ** self.dim)
