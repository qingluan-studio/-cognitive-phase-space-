"""
bayesian_optimization.py — 贝叶斯优化引擎

实现基于高斯过程的贝叶斯优化，
支持多种采集函数与核函数。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Callable, Optional


class GaussianProcess:
    """简化高斯过程回归。"""

    def __init__(self, kernel: Callable[[List[float], List[float]], float],
                 noise: float = 1e-5):
        self.kernel = kernel
        self.noise = noise
        self.X: List[List[float]] = []
        self.y: List[float] = []
        self.K_inv: Optional[List[List[float]]] = None

    def fit(self, X: List[List[float]], y: List[float]) -> None:
        """拟合高斯过程。"""
        self.X = X
        self.y = y
        n = len(X)
        K = [[self.kernel(X[i], X[j]) + (self.noise if i == j else 0.0)
              for j in range(n)] for i in range(n)]
        self.K_inv = self._invert_matrix(K)

    def _invert_matrix(self, M: List[List[float]]) -> List[List[float]]:
        """简化矩阵求逆（Jacobi 迭代近似）。"""
        n = len(M)
        I = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
        inv = [row[:] for row in I]
        alpha = 0.01
        for _ in range(100):
            inv = [[inv[i][j] + alpha * (I[i][j] - sum(M[i][k] * inv[k][j] for k in range(n)))
                    for j in range(n)] for i in range(n)]
        return inv

    def predict(self, x: List[float]) -> Tuple[float, float]:
        """预测均值与方差。"""
        if not self.X or self.K_inv is None:
            return 0.0, 1.0
        k_star = [self.kernel(self.X[i], x) for i in range(len(self.X))]
        mean = sum(self.K_inv[i][j] * k_star[j] * self.y[i]
                   for i in range(len(self.X)) for j in range(len(self.X)))
        k_star_star = self.kernel(x, x)
        var = k_star_star - sum(k_star[i] * self.K_inv[i][j] * k_star[j]
                                for i in range(len(self.X)) for j in range(len(self.X)))
        return mean, max(1e-10, var)

    @staticmethod
    def rbf_kernel(length_scale: float = 1.0) -> Callable[[List[float], List[float]], float]:
        """RBF 核函数工厂。"""
        def kernel(x1: List[float], x2: List[float]) -> float:
            dist_sq = sum((a - b) ** 2 for a, b in zip(x1, x2))
            return math.exp(-dist_sq / (2.0 * length_scale ** 2))
        return kernel

    @staticmethod
    def matern_kernel(length_scale: float = 1.0) -> Callable[[List[float], List[float]], float]:
        """Matern 3/2 核函数工厂。"""
        def kernel(x1: List[float], x2: List[float]) -> float:
            dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(x1, x2)))
            scaled = math.sqrt(3.0) * dist / length_scale
            return (1.0 + scaled) * math.exp(-scaled)
        return kernel


class BayesianOptimizer:
    """贝叶斯优化引擎。"""

    def __init__(self, gp: GaussianProcess, bounds: List[Tuple[float, float]]):
        self.gp = gp
        self.bounds = bounds
        self.X: List[List[float]] = []
        self.y: List[float] = []
        self.best_x: Optional[List[float]] = None
        self.best_y = float('inf')

    def acquisition_ucb(self, x: List[float], beta: float = 2.0) -> float:
        """上置信界采集函数。"""
        mean, var = self.gp.predict(x)
        return mean + beta * math.sqrt(var)

    def acquisition_ei(self, x: List[float], xi: float = 0.01) -> float:
        """期望改进采集函数。"""
        mean, var = self.gp.predict(x)
        std = math.sqrt(var)
        if std == 0:
            return 0.0
        improvement = self.best_y - mean - xi
        z = improvement / std
        return improvement * (0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))) + std * math.exp(-z ** 2 / 2.0) / math.sqrt(2.0 * math.pi)

    def acquisition_pi(self, x: List[float], xi: float = 0.01) -> float:
        """改进概率采集函数。"""
        mean, var = self.gp.predict(x)
        std = math.sqrt(var)
        if std == 0:
            return 0.0
        z = (self.best_y - mean - xi) / std
        return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))

    def optimize_acquisition(self, acquisition: Callable[[List[float]], float],
                             samples: int = 1000) -> List[float]:
        """通过随机采样优化采集函数。"""
        best_x = None
        best_val = float('inf') if acquisition == self.acquisition_ucb else float('-inf')
        for _ in range(samples):
            x = [random.uniform(lo, hi) for lo, hi in self.bounds]
            val = acquisition(x)
            if acquisition == self.acquisition_ucb:
                if val < best_val:
                    best_val = val
                    best_x = x
            else:
                if val > best_val:
                    best_val = val
                    best_x = x
        return best_x or [random.uniform(lo, hi) for lo, hi in self.bounds]

    def optimize(self, f: Callable[[List[float]], float],
                 n_iter: int = 50, n_init: int = 5,
                 acquisition_type: str = "ei") -> List[float]:
        """运行贝叶斯优化。"""
        for _ in range(n_init):
            x = [random.uniform(lo, hi) for lo, hi in self.bounds]
            y = f(x)
            self.X.append(x)
            self.y.append(y)
            if y < self.best_y:
                self.best_y = y
                self.best_x = x

        self.gp.fit(self.X, self.y)

        for _ in range(n_iter):
            if acquisition_type == "ucb":
                acq = lambda x: self.acquisition_ucb(x)
            elif acquisition_type == "pi":
                acq = lambda x: self.acquisition_pi(x)
            else:
                acq = lambda x: self.acquisition_ei(x)

            x_next = self.optimize_acquisition(acq)
            y_next = f(x_next)
            self.X.append(x_next)
            self.y.append(y_next)
            if y_next < self.best_y:
                self.best_y = y_next
                self.best_x = x_next
            self.gp.fit(self.X, self.y)

        return self.best_x

    def convergence_curve(self) -> List[float]:
        """返回最优值历史。"""
        best_so_far = []
        current_best = float('inf')
        for y in self.y:
            current_best = min(current_best, y)
            best_so_far.append(current_best)
        return best_so_far

    def regret_analysis(self, true_optimum: float) -> List[float]:
        """计算遗憾值。"""
        return [abs(true_optimum - y) for y in self.convergence_curve()]

    def expected_improvement_surface(self, grid_size: int = 50) -> List[List[float]]:
        """计算 EI 表面（二维）。"""
        if len(self.bounds) != 2:
            return []
        surface = []
        for i in range(grid_size):
            row = []
            y = self.bounds[1][0] + i * (self.bounds[1][1] - self.bounds[1][0]) / grid_size
            for j in range(grid_size):
                x = self.bounds[0][0] + j * (self.bounds[0][1] - self.bounds[0][0]) / grid_size
                ei = self.acquisition_ei([x, y])
                row.append(ei)
            surface.append(row)
        return surface

    @staticmethod
    def log_likelihood_approx(X: List[List[float]], y: List[float],
                              length_scale: float) -> float:
        """近似对数似然。"""
        gp = GaussianProcess(GaussianProcess.rbf_kernel(length_scale))
        gp.fit(X, y)
        n = len(y)
        return -sum((y[i] - sum(gp.K_inv[i][j] * y[j] for j in range(n))) ** 2 for i in range(n)) / (2.0 * n)
