"""
limit_cycle.py — 极限环检测引擎

实现 Poincare-Bendixson 条件检验、极限环追踪、
周期估算与 Floquet 乘子计算。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Callable, Optional


class LimitCycleDetector:
    """极限环检测与分析引擎。"""

    def __init__(self, f: Callable[[float, float], float],
                 g: Callable[[float, float], float]):
        self.f = f
        self.g = g

    def integrate(self, x0: float, y0: float, dt: float = 0.01,
                  steps: int = 5000) -> List[Tuple[float, float]]:
        """RK4 积分。"""
        traj = [(x0, y0)]
        x, y = x0, y0
        for _ in range(steps):
            k1x = self.f(x, y)
            k1y = self.g(x, y)
            k2x = self.f(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y)
            k2y = self.g(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y)
            k3x = self.f(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y)
            k3y = self.g(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y)
            k4x = self.f(x + dt * k3x, y + dt * k3y)
            k4y = self.g(x + dt * k3x, y + dt * k3y)
            x += dt / 6.0 * (k1x + 2 * k2x + 2 * k3x + k4x)
            y += dt / 6.0 * (k1y + 2 * k2y + 2 * k3y + k4y)
            traj.append((x, y))
        return traj

    def detect_limit_cycle(self, x0: float, y0: float, dt: float = 0.01,
                           steps: int = 10000, tol: float = 1e-3) -> Optional[Tuple[float, float]]:
        """通过返回检测寻找极限环上的点。"""
        traj = self.integrate(x0, y0, dt, steps)
        for i in range(len(traj) // 2, len(traj)):
            dist = math.sqrt((traj[i][0] - traj[0][0]) ** 2 + (traj[i][1] - traj[0][1]) ** 2)
            if dist < tol:
                return traj[i]
        return None

    def poincare_bendixson_check(self, region: Tuple[float, float, float, float],
                                 grid: int = 50) -> bool:
        """检验 Poincare-Bendixson 条件（简化版）：散度变号。"""
        x_min, x_max, y_min, y_max = region
        signs = []
        for i in range(grid):
            for j in range(grid):
                x = x_min + j * (x_max - x_min) / grid
                y = y_min + i * (y_max - y_min) / grid
                eps = 1e-6
                df_dx = (self.f(x + eps, y) - self.f(x - eps, y)) / (2.0 * eps)
                dg_dy = (self.g(x, y + eps) - self.g(x, y - eps)) / (2.0 * eps)
                div = df_dx + dg_dy
                signs.append(1 if div > 0 else -1)
        return 1 in signs and -1 in signs

    def period_estimate(self, traj: List[Tuple[float, float]], tol: float = 1e-3) -> float:
        """从轨迹估算周期。"""
        if len(traj) < 100:
            return 0.0
        ref = traj[-1]
        for i in range(len(traj) - 2, len(traj) // 2, -1):
            dist = math.sqrt((traj[i][0] - ref[0]) ** 2 + (traj[i][1] - ref[1]) ** 2)
            if dist < tol:
                return (len(traj) - 1 - i) * 0.01
        return 0.0

    def amplitude_estimate(self, traj: List[Tuple[float, float]]) -> Tuple[float, float]:
        """估算 x 与 y 方向的振幅。"""
        xs = [p[0] for p in traj]
        ys = [p[1] for p in traj]
        return (max(xs) - min(xs)) / 2.0, (max(ys) - min(ys)) / 2.0

    def floquet_multipliers(self, traj: List[Tuple[float, float]],
                            period_steps: int) -> Tuple[float, float]:
        """估算 Floquet 乘子（简化单值矩阵）。"""
        n = period_steps
        if len(traj) < n + 1:
            return 1.0, 1.0
        M = [[1.0, 0.0], [0.0, 1.0]]
        dt = 0.01
        for i in range(n):
            x, y = traj[i]
            eps = 1e-6
            j = [[(self.f(x + eps, y) - self.f(x - eps, y)) / (2.0 * eps),
                  (self.f(x, y + eps) - self.f(x, y - eps)) / (2.0 * eps)],
                 [(self.g(x + eps, y) - self.g(x - eps, y)) / (2.0 * eps),
                  (self.g(x, y + eps) - self.g(x, y - eps)) / (2.0 * eps)]]
            I = [[1.0 + dt * j[0][0], dt * j[0][1]],
                 [dt * j[1][0], 1.0 + dt * j[1][1]]]
            M = [[I[0][0] * M[0][0] + I[0][1] * M[1][0],
                  I[0][0] * M[0][1] + I[0][1] * M[1][1]],
                 [I[1][0] * M[0][0] + I[1][1] * M[1][0],
                  I[1][0] * M[0][1] + I[1][1] * M[1][1]]]
        trace = M[0][0] + M[1][1]
        det = M[0][0] * M[1][1] - M[0][1] * M[1][0]
        disc = trace * trace - 4 * det
        if disc >= 0:
            return (trace + math.sqrt(disc)) / 2.0, (trace - math.sqrt(disc)) / 2.0
        return trace / 2.0, trace / 2.0

    def is_stable(self, multipliers: Tuple[float, float]) -> bool:
        """根据 Floquet 乘子判断稳定性。"""
        return all(abs(m) < 1.0 for m in multipliers)

    def radius_function(self, traj: List[Tuple[float, float]], center: Tuple[float, float] = (0.0, 0.0)) -> List[float]:
        """计算到中心的距离序列。"""
        return [math.sqrt((p[0] - center[0]) ** 2 + (p[1] - center[1]) ** 2) for p in traj]

    def isochrons_approx(self, traj: List[Tuple[float, float]],
                         num_isochrons: int = 8) -> List[List[Tuple[float, float]]]:
        """近似等时线。"""
        if len(traj) < 100:
            return []
        period = self.period_estimate(traj)
        if period == 0:
            return []
        isochrons = [[] for _ in range(num_isochrons)]
        for i, p in enumerate(traj):
            phase = (i * 0.01 % period) / period
            idx = int(phase * num_isochrons) % num_isochrons
            isochrons[idx].append(p)
        return isochrons

    def winding_number(self, traj: List[Tuple[float, float]], center: Tuple[float, float] = (0.0, 0.0)) -> int:
        """计算轨迹绕中心点的卷绕数。"""
        total_angle = 0.0
        for i in range(1, len(traj)):
            dx1 = traj[i - 1][0] - center[0]
            dy1 = traj[i - 1][1] - center[1]
            dx2 = traj[i][0] - center[0]
            dy2 = traj[i][1] - center[1]
            angle1 = math.atan2(dy1, dx1)
            angle2 = math.atan2(dy2, dx2)
            delta = angle2 - angle1
            if delta > math.pi:
                delta -= 2 * math.pi
            elif delta < -math.pi:
                delta += 2 * math.pi
            total_angle += delta
        return int(round(total_angle / (2.0 * math.pi)))

    def shooting_method(self, initial_guess: Tuple[float, float],
                        target_radius: float, dt: float = 0.01,
                        max_iter: int = 50) -> Tuple[float, float]:
        """打靶法寻找极限环起始点。"""
        x, y = initial_guess
        for _ in range(max_iter):
            traj = self.integrate(x, y, dt, 2000)
            if len(traj) < 2:
                break
            final_r = math.sqrt(traj[-1][0] ** 2 + traj[-1][1] ** 2)
            error = final_r - target_radius
            if abs(error) < 1e-4:
                break
            dr = 1e-4
            traj_plus = self.integrate(x + dr, y, dt, 2000)
            r_plus = math.sqrt(traj_plus[-1][0] ** 2 + traj_plus[-1][1] ** 2)
            sensitivity = (r_plus - final_r) / dr
            if sensitivity != 0:
                x -= error / sensitivity
        return x, y
