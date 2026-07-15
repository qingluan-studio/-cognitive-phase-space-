"""
bifurcation.py — 分岔分析引擎

实现鞍结分岔、跨临界分岔、叉式分岔与 Hopf 分岔的
标准形式分析，以及数值分岔追踪与延拓。
"""

from __future__ import annotations

import math
from typing import List, Tuple, Dict, Callable, Optional


class BifurcationAnalyzer:
    """分岔分析引擎。"""

    def __init__(self):
        self.branches: List[List[Tuple[float, float]]] = []

    def saddle_node_normal_form(self, mu: float, x: float) -> float:
        """鞍结分岔标准形式: dx/dt = mu + x^2。"""
        return mu + x * x

    def transcritical_normal_form(self, mu: float, x: float) -> float:
        """跨临界分岔标准形式: dx/dt = mu*x - x^2。"""
        return mu * x - x * x

    def pitchfork_normal_form(self, mu: float, x: float, supercritical: bool = True) -> float:
        """叉式分岔标准形式。"""
        if supercritical:
            return mu * x - x ** 3
        else:
            return mu * x + x ** 3

    def hopf_normal_form_polar(self, mu: float, r: float) -> float:
        """Hopf 分岔极坐标径向方程: dr/dt = mu*r - r^3。"""
        return mu * r - r ** 3

    def fixed_point_stability(self, f: Callable[[float, float], float],
                              mu: float, x_star: float, eps: float = 1e-6) -> float:
        """计算不动点处的稳定性（导数）。"""
        fp = f(mu, x_star + eps)
        fm = f(mu, x_star - eps)
        return (fp - fm) / (2.0 * eps)

    def continuation_fixed_points(self, f: Callable[[float, float], float],
                                  mu_range: Tuple[float, float], mu_steps: int = 200,
                                  x_guess: float = 0.0, tol: float = 1e-6) -> Dict[float, List[float]]:
        """通过简单延拓追踪不动点分支。"""
        results = {}
        for i in range(mu_steps):
            mu = mu_range[0] + i * (mu_range[1] - mu_range[0]) / mu_steps
            roots = self._find_roots(lambda x: f(mu, x), x_guess, tol)
            results[mu] = roots
        return results

    def _find_roots(self, g: Callable[[float], float], guess: float,
                    tol: float, max_iter: int = 100) -> List[float]:
        """牛顿法找根。"""
        roots = []
        for shift in [-0.5, 0.0, 0.5]:
            x = guess + shift
            for _ in range(max_iter):
                fx = g(x)
                dfx = (g(x + tol) - g(x - tol)) / (2.0 * tol)
                if abs(dfx) < 1e-12:
                    break
                x_new = x - fx / dfx
                if abs(x_new - x) < tol:
                    roots.append(x_new)
                    break
                x = x_new
        return list(set(round(r, 6) for r in roots))

    def bifurcation_diagram_1d(self, f: Callable[[float, float], float],
                               mu_range: Tuple[float, float], mu_steps: int = 500,
                               x0: float = 0.5, transient: int = 500,
                               last: int = 100) -> Dict[float, List[float]]:
        """生成一维映射的分岔图。"""
        diagram = {}
        for i in range(mu_steps):
            mu = mu_range[0] + i * (mu_range[1] - mu_range[0]) / mu_steps
            x = x0
            for _ in range(transient):
                x = f(mu, x)
            values = []
            for _ in range(last):
                x = f(mu, x)
                values.append(x)
            diagram[mu] = values
        return diagram

    def detect_bifurcation_points(self, diagram: Dict[float, List[float]],
                                  window: int = 5, threshold: float = 1e-4) -> List[float]:
        """从分岔图数据中检测分岔点。"""
        mus = sorted(diagram.keys())
        bifurcations = []
        for i in range(window, len(mus) - window):
            prev_unique = len(set(round(v, 4) for v in diagram[mus[i - window]]))
            curr_unique = len(set(round(v, 4) for v in diagram[mus[i]]))
            next_unique = len(set(round(v, 4) for v in diagram[mus[i + window]]))
            if curr_unique != prev_unique or curr_unique != next_unique:
                if abs(curr_unique - prev_unique) > 1:
                    bifurcations.append(mus[i])
        return bifurcations

    def lyapunov_vs_parameter(self, f: Callable[[float, float], float],
                              df: Callable[[float, float], float],
                              mu_range: Tuple[float, float], mu_steps: int = 200,
                              x0: float = 0.5, steps: int = 5000) -> Dict[float, float]:
        """计算不同参数下的 Lyapunov 指数。"""
        results = {}
        for i in range(mu_steps):
            mu = mu_range[0] + i * (mu_range[1] - mu_range[0]) / mu_steps
            x = x0
            for _ in range(1000):
                x = f(mu, x)
            lyap_sum = 0.0
            for _ in range(steps):
                x = f(mu, x)
                derivative = abs(df(mu, x))
                if derivative > 0:
                    lyap_sum += math.log(derivative)
            results[mu] = lyap_sum / steps
        return results

    def normal_form_coefficients(self, f: Callable[[float, float], float],
                                 df: Callable[[float, float], float],
                                 d2f: Callable[[float, float], float],
                                 mu_c: float, x_c: float) -> Dict[str, float]:
        """计算标准形式系数。"""
        a = df(mu_c, x_c)
        b = d2f(mu_c, x_c)
        return {"linear": a, "quadratic": b, "critical_mu": mu_c, "critical_x": x_c}

    def hysteresis_loop(self, f: Callable[[float, float], float],
                        mu_range: Tuple[float, float], mu_steps: int = 100,
                        x0: float = 0.0) -> Tuple[List[Tuple[float, float]], List[Tuple[float, float]]]:
        """检测滞后环（正向与反向扫描）。"""
        forward = []
        x = x0
        for i in range(mu_steps):
            mu = mu_range[0] + i * (mu_range[1] - mu_range[0]) / mu_steps
            for _ in range(500):
                x = f(mu, x)
            forward.append((mu, x))
        backward = []
        for i in range(mu_steps):
            mu = mu_range[1] - i * (mu_range[1] - mu_range[0]) / mu_steps
            for _ in range(500):
                x = f(mu, x)
            backward.append((mu, x))
        return forward, backward

    def codimension_two_analysis(self, f: Callable[[float, float, float], float],
                                 mu1_range: Tuple[float, float],
                                 mu2_range: Tuple[float, float],
                                 grid: int = 50) -> List[List[float]]:
        """双参数分岔分析。"""
        results = []
        for i in range(grid):
            row = []
            mu2 = mu2_range[0] + i * (mu2_range[1] - mu2_range[0]) / grid
            for j in range(grid):
                mu1 = mu1_range[0] + j * (mu1_range[1] - mu1_range[0]) / grid
                x = 0.5
                for _ in range(500):
                    x = f(mu1, mu2, x)
                row.append(x)
            results.append(row)
        return results

    @staticmethod
    def classification(stability_before: float, stability_after: float) -> str:
        """根据稳定性变化分类分岔类型。"""
        if stability_before < 1.0 and stability_after > 1.0:
            return "loss_of_stability"
        elif stability_before > 1.0 and stability_after < 1.0:
            return "gain_of_stability"
        return "no_change"
