"""
lyapunov.py — 李雅普诺夫指数计算引擎

实现一维/多维系统的 Lyapunov 指数谱计算、
Wolf 算法、QR 分解法与条件 Lyapunov 指数。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Callable, Optional


class LyapunovAnalyzer:
    """Lyapunov 指数分析引擎。"""

    def __init__(self, dt: float = 0.01):
        self.dt = dt

    def max_lyapunov_1d(self, f: Callable[[float], float],
                        df: Callable[[float], float],
                        x0: float = 0.5, steps: int = 10000,
                        transient: int = 1000) -> float:
        """一维映射的最大 Lyapunov 指数。"""
        x = x0
        for _ in range(transient):
            x = f(x)
        lyap_sum = 0.0
        for _ in range(steps):
            x = f(x)
            derivative = abs(df(x))
            if derivative > 0:
                lyap_sum += math.log(derivative)
        return lyap_sum / steps

    def spectrum_ode_qr(self, derivatives: Callable[[List[float]], List[float]],
                        jacobian: Callable[[List[float]], List[List[float]]],
                        x0: List[float], dim: int, steps: int = 5000,
                        transient: int = 1000) -> List[float]:
        """使用 QR 分解法计算 ODE 系统的 Lyapunov 指数谱。"""
        x = list(x0)
        Q = [[1.0 if i == j else 0.0 for j in range(dim)] for i in range(dim)]
        lyap_sums = [0.0] * dim

        for _ in range(transient):
            x = self._rk4_step(derivatives, x)
        for _ in range(steps):
            x = self._rk4_step(derivatives, x)
            J = jacobian(x)
            M = [[sum(J[i][k] * Q[k][j] for k in range(dim)) for j in range(dim)] for i in range(dim)]
            for j in range(dim):
                for i in range(j):
                    dot = sum(M[k][i] * Q[k][j] for k in range(dim))
                    for k in range(dim):
                        M[k][j] -= dot * Q[k][i]
                norm = math.sqrt(sum(M[k][j] ** 2 for k in range(dim)))
                if norm > 0:
                    for k in range(dim):
                        Q[k][j] = M[k][j] / norm
                    lyap_sums[j] += math.log(norm)
        return [l / (steps * self.dt) for l in lyap_sums]

    def _rk4_step(self, derivatives: Callable[[List[float]], List[float]], x: List[float]) -> List[float]:
        """RK4 单步。"""
        k1 = derivatives(x)
        k2 = derivatives([x[i] + 0.5 * self.dt * k1[i] for i in range(len(x))])
        k3 = derivatives([x[i] + 0.5 * self.dt * k2[i] for i in range(len(x))])
        k4 = derivatives([x[i] + self.dt * k3[i] for i in range(len(x))])
        return [x[i] + self.dt / 6.0 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) for i in range(len(x))]

    def wolf_algorithm(self, trajectory: List[List[float]],
                       nearest_neighbors: int = 5,
                       max_sep: float = 1.0) -> float:
        """Wolf 算法估算最大 Lyapunov 指数。"""
        if len(trajectory) < 100:
            return 0.0
        lyap_sum = 0.0
        count = 0
        for t in range(len(trajectory) - 1):
            ref = trajectory[t]
            candidates = [(math.sqrt(sum((ref[i] - trajectory[s][i]) ** 2 for i in range(len(ref)))), s)
                          for s in range(max(0, t - 50), min(len(trajectory), t + 50)) if s != t]
            candidates.sort()
            if not candidates:
                continue
            neighbor = candidates[0][1]
            d0 = candidates[0][0]
            if d0 == 0:
                continue
            d1 = math.sqrt(sum((trajectory[t + 1][i] - trajectory[neighbor + 1][i]) ** 2
                               for i in range(len(ref)))) if neighbor + 1 < len(trajectory) else 0
            if d1 > 0 and d1 < max_sep:
                lyap_sum += math.log(d1 / d0)
                count += 1
        return lyap_sum / count if count > 0 else 0.0

    def conditional_lyapunov(self, driver: Callable[[float], float],
                             response: Callable[[float, float], float],
                             x0: float, y0: float, steps: int = 5000) -> float:
        """计算条件 Lyapunov 指数（同步稳定性）。"""
        x, y = x0, y0
        perturbation = 1e-10
        y_pert = y + perturbation
        lyap_sum = 0.0
        for _ in range(steps):
            x = driver(x)
            y = response(x, y)
            y_pert = response(x, y_pert)
            diff = abs(y_pert - y)
            if diff > 0:
                lyap_sum += math.log(diff / perturbation)
            y_pert = y + perturbation
        return lyap_sum / steps

    def finite_time_lyapunov(self, f: Callable[[float], float],
                             df: Callable[[float], float],
                             x0: float, T: int = 100) -> List[float]:
        """计算有限时间 Lyapunov 指数序列。"""
        x = x0
        ftle = []
        lyap_sum = 0.0
        for t in range(1, T + 1):
            x = f(x)
            derivative = abs(df(x))
            if derivative > 0:
                lyap_sum += math.log(derivative)
            ftle.append(lyap_sum / t)
        return ftle

    def divergence_rate(self, f: Callable[[List[float]], List[float]],
                        x0: List[float], pert: float = 1e-10,
                        steps: int = 1000) -> List[float]:
        """计算两个邻近轨迹的发散率。"""
        main = list(x0)
        perturbed = [main[i] + (pert if i == 0 else 0.0) for i in range(len(x0))]
        divergences = []
        for _ in range(steps):
            main = f(main)
            perturbed = f(perturbed)
            dist = math.sqrt(sum((main[i] - perturbed[i]) ** 2 for i in range(len(main))))
            divergences.append(math.log(max(dist, 1e-15)))
        return divergences

    def kaplan_yorke_dimension(self, spectrum: List[float]) -> float:
        """计算 Kaplan-Yorke 维数。"""
        sorted_spec = sorted(spectrum, reverse=True)
        D = 0.0
        cumsum = 0.0
        for i, le in enumerate(sorted_spec):
            cumsum += le
            if cumsum < 0:
                if i > 0:
                    D = i - 1 + (cumsum + abs(le)) / abs(le) if le != 0 else float(i - 1)
                break
            D = float(i + 1)
        else:
            if cumsum >= 0:
                D = len(sorted_spec)
        return D

    def entropy_production(self, spectrum: List[float]) -> float:
        """计算 Kolmogorov-Sinai 熵生产近似。"""
        return sum(max(0.0, le) for le in spectrum)

    @staticmethod
    def _gram_schmidt(vectors: List[List[float]]) -> Tuple[List[List[float]], List[float]]:
        """Gram-Schmidt 正交化。"""
        ortho = []
        norms = []
        for v in vectors:
            u = list(v)
            for o in ortho:
                dot = sum(u[i] * o[i] for i in range(len(u)))
                u = [u[i] - dot * o[i] for i in range(len(u))]
            norm = math.sqrt(sum(ui ** 2 for ui in u))
            if norm > 0:
                u = [ui / norm for ui in u]
            ortho.append(u)
            norms.append(norm)
        return ortho, norms

    def predictability_time(self, max_le: float, precision: float = 1e-6) -> float:
        """基于最大 Lyapunov 指数估算可预测时间。"""
        if max_le <= 0:
            return float('inf')
        return -math.log(precision) / max_le

    def synchronization_threshold(self, conditional_le: float) -> bool:
        """判断同步是否稳定。"""
        return conditional_le < 0
