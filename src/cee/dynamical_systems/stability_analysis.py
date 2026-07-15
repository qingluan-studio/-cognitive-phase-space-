"""
stability_analysis.py — 稳定性分析引擎

实现线性化稳定性、Lyapunov 间接法、
中心流形理论与分岔稳定性判据。
"""

from __future__ import annotations

import math
from typing import List, Tuple, Dict, Callable, Optional


class StabilityAnalyzer:
    """动力系统稳定性分析引擎。"""

    def __init__(self):
        self.results: List[Dict] = []

    def linearize(self, f: Callable[[List[float]], List[float]],
                  x0: List[float], eps: float = 1e-6) -> List[List[float]]:
        """在 x0 处数值线性化。"""
        n = len(x0)
        jacobian = [[0.0] * n for _ in range(n)]
        base = f(x0)
        for j in range(n):
            perturbed = list(x0)
            perturbed[j] += eps
            fp = f(perturbed)
            for i in range(n):
                jacobian[i][j] = (fp[i] - base[i]) / eps
        return jacobian

    def eigenvalues_2d(self, jacobian: List[List[float]]) -> Tuple[complex, complex]:
        """解析计算 2x2 矩阵特征值。"""
        a, b, c, d = jacobian[0][0], jacobian[0][1], jacobian[1][0], jacobian[1][1]
        trace = a + d
        det = a * d - b * c
        disc = trace * trace - 4 * det
        if disc >= 0:
            return (trace + math.sqrt(disc)) / 2.0, (trace - math.sqrt(disc)) / 2.0
        return complex(trace / 2.0, math.sqrt(-disc) / 2.0), complex(trace / 2.0, -math.sqrt(-disc) / 2.0)

    def classify_2d(self, eigenvalues: Tuple[complex, complex]) -> str:
        """根据 2D 特征值分类稳定性。"""
        e1, e2 = eigenvalues
        re1, re2 = e1.real, e2.real
        im1, im2 = e1.imag, e2.imag
        if re1 * re2 < 0:
            return "saddle (unstable)"
        if re1 < 0 and re2 < 0:
            if im1 != 0:
                return "stable spiral"
            return "stable node"
        if re1 > 0 and re2 > 0:
            if im1 != 0:
                return "unstable spiral"
            return "unstable node"
        if re1 == 0 and re2 == 0:
            return "center (marginally stable)"
        return "non-hyperbolic"

    def lyapunov_stability_test(self, f: Callable[[List[float]], List[float]],
                                x_eq: List[float], candidate: Callable[[List[float]], float],
                                domain: List[Tuple[float, float]], grid: int = 20) -> bool:
        """通过候选 Lyapunov 函数测试稳定性。"""
        for i in range(grid):
            for j in range(grid):
                x = domain[0][0] + i * (domain[0][1] - domain[0][0]) / grid
                y = domain[1][0] + j * (domain[1][1] - domain[1][0]) / grid
                point = [x, y]
                v = candidate(point)
                if v < 0:
                    return False
                fx = f(point)
                grad = [(candidate([x + 1e-6, y]) - candidate([x - 1e-6, y])) / 2e-6,
                        (candidate([x, y + 1e-6]) - candidate([x, y - 1e-6])) / 2e-6]
                dv = sum(grad[k] * fx[k] for k in range(len(point)))
                if dv > 1e-6:
                    return False
        return True

    def roa_estimate(self, f: Callable[[List[float]], List[float]],
                     x_eq: List[float], candidate: Callable[[List[float]], float],
                     max_level: float = 1.0, grid: int = 50) -> float:
        """估算吸引域 (Region of Attraction)。"""
        best_level = 0.0
        for level in [max_level * i / grid for i in range(1, grid + 1)]:
            stable = True
            for i in range(grid):
                for j in range(grid):
                    x = -2.0 + 4.0 * i / grid
                    y = -2.0 + 4.0 * j / grid
                    point = [x, y]
                    if candidate(point) <= level:
                        fx = f(point)
                        grad = [(candidate([x + 1e-6, y]) - candidate([x - 1e-6, y])) / 2e-6,
                                (candidate([x, y + 1e-6]) - candidate([x, y - 1e-6])) / 2e-6]
                        dv = sum(grad[k] * fx[k] for k in range(2))
                        if dv > 0:
                            stable = False
                            break
                if not stable:
                    break
            if stable:
                best_level = level
        return best_level

    def hurwitz_criterion(self, coefficients: List[float]) -> bool:
        """Hurwitz 稳定性判据（3 阶及以下）。"""
        n = len(coefficients) - 1
        if n == 1:
            return coefficients[0] > 0 and coefficients[1] > 0
        if n == 2:
            return (coefficients[0] > 0 and coefficients[1] > 0 and coefficients[2] > 0)
        if n == 3:
            a0, a1, a2, a3 = coefficients
            return a0 > 0 and a1 > 0 and a2 > 0 and a3 > 0 and a1 * a2 > a0 * a3
        return True

    def routh_hurwitz_4th(self, coeffs: List[float]) -> bool:
        """4 阶 Routh-Hurwitz 判据。"""
        if len(coeffs) != 5:
            return False
        a0, a1, a2, a3, a4 = coeffs
        if any(c <= 0 for c in coeffs):
            return False
        delta1 = a1
        delta2 = a1 * a2 - a0 * a3
        delta3 = a3 * delta2 - a1 ** 2 * a4
        return delta1 > 0 and delta2 > 0 and delta3 > 0

    def bifurcation_indicator(self, jacobian_history: List[List[List[float]]]) -> List[float]:
        """从 Jacobian 历史检测分岔迹象。"""
        indicators = []
        for j in jacobian_history:
            eigs = self.eigenvalues_2d(j)
            re_max = max(abs(e.real) for e in eigs)
            indicators.append(re_max)
        return indicators

    def exponential_stability_rate(self, jacobian: List[List[float]]) -> float:
        """估算指数稳定率。"""
        eigs = self.eigenvalues_2d(jacobian)
        re_max = max(e.real for e in eigs)
        return -re_max if re_max < 0 else 0.0

    def asymptotic_stability_check(self, f: Callable[[List[float]], List[float]],
                                   x_eq: List[float], trials: int = 50,
                                   dt: float = 0.01, steps: int = 500) -> bool:
        """通过数值模拟检验渐近稳定性。"""
        for _ in range(trials):
            x = [x_eq[i] + random.uniform(-0.1, 0.1) for i in range(len(x_eq))]
            for _ in range(steps):
                fx = f(x)
                x = [x[i] + dt * fx[i] for i in range(len(x))]
            dist = math.sqrt(sum((x[i] - x_eq[i]) ** 2 for i in range(len(x_eq))))
            if dist > 0.1:
                return False
        return True

    def structural_stability(self, jacobian: List[List[float]], perturbation: float = 0.1) -> bool:
        """检验结构稳定性。"""
        eigs = self.eigenvalues_2d(jacobian)
        for e in eigs:
            if abs(e.real) < perturbation and e.imag == 0:
                return False
        return True

    def center_manifold_approximation(self, f: Callable[[List[float]], List[float]],
                                      x_eq: List[float], center_idx: int = 0) -> Callable[[float], float]:
        """近似中心流形（简化二次近似）。"""
        j = self.linearize(f, x_eq)
        def manifold(y: float) -> float:
            return j[1][0] / (j[0][0] - j[1][1]) * y ** 2 if (j[0][0] - j[1][1]) != 0 else 0.0
        return manifold

    def basin_boundary_approx(self, f: Callable[[List[float]], List[float]],
                              x_eq: List[float], grid: int = 100,
                              domain: Tuple[float, float, float, float] = (-2.0, 2.0, -2.0, 2.0)) -> List[Tuple[float, float]]:
        """近似吸引域边界。"""
        boundary = []
        x_min, x_max, y_min, y_max = domain
        for i in range(grid):
            for j in range(grid):
                x = x_min + j * (x_max - x_min) / grid
                y = y_min + i * (y_max - y_min) / grid
                point = [x, y]
                test_point = list(point)
                for _ in range(200):
                    fx = f(test_point)
                    test_point = [test_point[k] + 0.01 * fx[k] for k in range(len(test_point))]
                dist_to_eq = math.sqrt(sum((test_point[k] - x_eq[k]) ** 2 for k in range(len(x_eq))))
                if 0.05 < dist_to_eq < 0.5:
                    boundary.append((x, y))
        return boundary
