"""
lorenz_system.py — 洛伦兹系统模拟器

实现经典 Lorenz 吸引子的数值积分、Poincare 截面、
Lyapunov 指数估算与参数分岔扫描。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Callable, Optional


class LorenzSystem:
    """洛伦兹混沌系统。"""

    def __init__(self, sigma: float = 10.0, rho: float = 28.0,
                 beta: float = 8.0 / 3.0, dt: float = 0.01):
        self.sigma = sigma
        self.rho = rho
        self.beta = beta
        self.dt = dt
        self.state = [1.0, 1.0, 1.0]
        self.history: List[List[float]] = []

    def derivatives(self, state: List[float]) -> List[float]:
        """计算 Lorenz 方程的导数。"""
        x, y, z = state
        dx = self.sigma * (y - x)
        dy = x * (self.rho - z) - y
        dz = x * y - self.beta * z
        return [dx, dy, dz]

    def step_rk4(self) -> None:
        """使用四阶 Runge-Kutta 积分一步。"""
        x = self.state
        k1 = self.derivatives(x)
        k2 = self.derivatives([x[i] + 0.5 * self.dt * k1[i] for i in range(3)])
        k3 = self.derivatives([x[i] + 0.5 * self.dt * k2[i] for i in range(3)])
        k4 = self.derivatives([x[i] + self.dt * k3[i] for i in range(3)])
        self.state = [x[i] + self.dt / 6.0 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
                      for i in range(3)]
        self.history.append(list(self.state))

    def step_euler(self) -> None:
        """欧拉法积分一步。"""
        d = self.derivatives(self.state)
        self.state = [self.state[i] + self.dt * d[i] for i in range(3)]
        self.history.append(list(self.state))

    def integrate(self, steps: int, method: str = "rk4") -> List[List[float]]:
        """积分指定步数。"""
        for _ in range(steps):
            if method == "rk4":
                self.step_rk4()
            else:
                self.step_euler()
        return self.history

    def poincare_section(self, plane: str = "z", threshold: float = 27.0,
                         direction: str = "up") -> List[Tuple[float, float]]:
        """计算 Poincare 截面。"""
        section = []
        for i in range(1, len(self.history)):
            prev = self.history[i - 1]
            curr = self.history[i]
            idx = {"x": 0, "y": 1, "z": 2}[plane]
            crossed = (prev[idx] < threshold <= curr[idx]) if direction == "up" else (prev[idx] > threshold >= curr[idx])
            if crossed:
                alpha = (threshold - prev[idx]) / (curr[idx] - prev[idx]) if curr[idx] != prev[idx] else 0.0
                p1 = prev[0] + alpha * (curr[0] - prev[0])
                p2 = prev[1] + alpha * (curr[1] - prev[1])
                if plane == "z":
                    section.append((p1, p2))
                elif plane == "y":
                    section.append((p1, prev[2] + alpha * (curr[2] - prev[2])))
                else:
                    section.append((prev[1] + alpha * (curr[1] - prev[1]), prev[2] + alpha * (curr[2] - prev[2])))
        return section

    def lyapunov_exponent_approx(self, steps: int = 5000, pert: float = 1e-10) -> float:
        """估算最大 Lyapunov 指数。"""
        main = list(self.state)
        perturbed = [main[i] + pert if i == 0 else main[i] for i in range(3)]
        lyap_sum = 0.0
        for _ in range(steps):
            d_main = self.derivatives(main)
            main = [main[i] + self.dt * d_main[i] for i in range(3)]
            d_pert = self.derivatives(perturbed)
            perturbed = [perturbed[i] + self.dt * d_pert[i] for i in range(3)]
            diff = math.sqrt(sum((perturbed[i] - main[i]) ** 2 for i in range(3)))
            if diff > 0:
                lyap_sum += math.log(diff / pert)
            for i in range(3):
                perturbed[i] = main[i] + pert * (perturbed[i] - main[i]) / diff if diff > 0 else main[i]
        return lyap_sum / (steps * self.dt)

    def attractor_stats(self) -> Dict[str, float]:
        """计算吸引子统计。"""
        if not self.history:
            return {}
        xs = [h[0] for h in self.history]
        ys = [h[1] for h in self.history]
        zs = [h[2] for h in self.history]
        return {
            "x_range": max(xs) - min(xs),
            "y_range": max(ys) - min(ys),
            "z_range": max(zs) - min(zs),
            "x_mean": sum(xs) / len(xs),
            "y_mean": sum(ys) / len(ys),
            "z_mean": sum(zs) / len(zs),
        }

    def reset(self, x: float = 1.0, y: float = 1.0, z: float = 1.0) -> None:
        """重置初始条件。"""
        self.state = [x, y, z]
        self.history.clear()

    def parameter_bifurcation(self, rho_values: List[float], steps: int = 2000,
                              transient: int = 1000) -> Dict[float, List[float]]:
        """扫描 rho 参数的分岔行为。"""
        results = {}
        old_rho = self.rho
        for rho in rho_values:
            self.rho = rho
            self.reset()
            for _ in range(transient):
                self.step_rk4()
            z_values = []
            for _ in range(steps):
                self.step_rk4()
                z_values.append(self.state[2])
            results[rho] = z_values
        self.rho = old_rho
        return results

    def correlation_dimension_estimate(self, r_min: float = 0.1, r_max: float = 10.0,
                                       num_r: int = 20) -> float:
        """估算吸引子关联维数。"""
        if len(self.history) < 100:
            return 0.0
        points = self.history[::10]
        rs = []
        cors = []
        for i in range(num_r):
            r = r_max * (r_min / r_max) ** (i / (num_r - 1))
            rs.append(math.log(r))
            count = 0
            total = 0
            n = len(points)
            for a in range(n):
                for b in range(a + 1, n):
                    total += 1
                    dist = math.sqrt(sum((points[a][k] - points[b][k]) ** 2 for k in range(3)))
                    if dist < r:
                        count += 1
            cors.append(math.log(max(1, count) / max(1, total)))
        return self._linear_regression(rs, cors)

    @staticmethod
    def _linear_regression(x: List[float], y: List[float]) -> float:
        n = len(x)
        if n < 2:
            return 0.0
        mx = sum(x) / n
        my = sum(y) / n
        num = sum((x[i] - mx) * (y[i] - my) for i in range(n))
        den = sum((x[i] - mx) ** 2 for i in range(n))
        return num / den if den != 0 else 0.0

    def predictability_horizon(self, lyap: float) -> float:
        """基于 Lyapunov 指数估算可预测时间范围。"""
        if lyap <= 0:
            return float('inf')
        return 1.0 / lyap

    def is_chaotic(self, lyap_threshold: float = 0.01) -> bool:
        """判断系统是否处于混沌状态。"""
        lyap = self.lyapunov_exponent_approx(steps=2000)
        return lyap > lyap_threshold
