"""
phase_portrait.py — 相图绘制引擎

实现二维动力系统的相图分析、零倾线、
向量场与轨迹积分。
"""

from __future__ import annotations

import math
from typing import List, Tuple, Callable, Optional


class PhasePortrait:
    """二维动力系统相图分析器。"""

    def __init__(self, f: Callable[[float, float], float],
                 g: Callable[[float, float], float]):
        self.f = f
        self.g = g

    def vector_field(self, x_range: Tuple[float, float], y_range: Tuple[float, float],
                     grid: int = 20) -> List[List[Tuple[float, float]]]:
        """计算网格上的向量场。"""
        field = []
        for i in range(grid):
            row = []
            y = y_range[0] + i * (y_range[1] - y_range[0]) / (grid - 1)
            for j in range(grid):
                x = x_range[0] + j * (x_range[1] - x_range[0]) / (grid - 1)
                dx = self.f(x, y)
                dy = self.g(x, y)
                norm = math.sqrt(dx ** 2 + dy ** 2)
                if norm > 0:
                    dx /= norm
                    dy /= norm
                row.append((dx, dy))
            field.append(row)
        return field

    def nullclines(self, x_range: Tuple[float, float], y_range: Tuple[float, float],
                   grid: int = 200) -> Tuple[List[Tuple[float, float]], List[Tuple[float, float]]]:
        """近似计算 x-零倾线与 y-零倾线。"""
        x_null = []
        y_null = []
        for i in range(grid):
            for j in range(grid):
                x = x_range[0] + j * (x_range[1] - x_range[0]) / grid
                y = y_range[0] + i * (y_range[1] - y_range[0]) / grid
                if abs(self.f(x, y)) < 1e-2:
                    x_null.append((x, y))
                if abs(self.g(x, y)) < 1e-2:
                    y_null.append((x, y))
        return x_null, y_null

    def integrate_trajectory(self, x0: float, y0: float, dt: float = 0.01,
                             steps: int = 1000, method: str = "rk4") -> List[Tuple[float, float]]:
        """从初始条件积分轨迹。"""
        trajectory = [(x0, y0)]
        x, y = x0, y0
        for _ in range(steps):
            if method == "rk4":
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
            else:
                x += dt * self.f(x, y)
                y += dt * self.g(x, y)
            trajectory.append((x, y))
        return trajectory

    def equilibrium_points(self, x_range: Tuple[float, float], y_range: Tuple[float, float],
                           grid: int = 100) -> List[Tuple[float, float]]:
        """在网格上搜索平衡点。"""
        points = []
        for i in range(grid):
            for j in range(grid):
                x = x_range[0] + j * (x_range[1] - x_range[0]) / grid
                y = y_range[0] + i * (y_range[1] - y_range[0]) / grid
                if abs(self.f(x, y)) < 1e-2 and abs(self.g(x, y)) < 1e-2:
                    points.append((x, y))
        return points

    def jacobian_at(self, x: float, y: float,
                    eps: float = 1e-5) -> List[List[float]]:
        """数值计算 Jacobian 矩阵。"""
        j = [[0.0, 0.0], [0.0, 0.0]]
        j[0][0] = (self.f(x + eps, y) - self.f(x - eps, y)) / (2.0 * eps)
        j[0][1] = (self.f(x, y + eps) - self.f(x, y - eps)) / (2.0 * eps)
        j[1][0] = (self.g(x + eps, y) - self.g(x - eps, y)) / (2.0 * eps)
        j[1][1] = (self.g(x, y + eps) - self.g(x, y - eps)) / (2.0 * eps)
        return j

    def classify_equilibrium(self, jacobian: List[List[float]]) -> str:
        """根据 Jacobian 特征值分类平衡点。"""
        trace = jacobian[0][0] + jacobian[1][1]
        det = jacobian[0][0] * jacobian[1][1] - jacobian[0][1] * jacobian[1][0]
        disc = trace ** 2 - 4 * det
        if det < 0:
            return "saddle"
        if trace > 0 and det > 0 and disc > 0:
            return "unstable_node"
        if trace < 0 and det > 0 and disc > 0:
            return "stable_node"
        if trace > 0 and det > 0 and disc < 0:
            return "unstable_spiral"
        if trace < 0 and det > 0 and disc < 0:
            return "stable_spiral"
        if trace == 0 and det > 0:
            return "center"
        return "degenerate"

    def flow_map(self, x_range: Tuple[float, float], y_range: Tuple[float, float],
                 t: float, grid: int = 20) -> List[List[Tuple[float, float]]]:
        """计算流映射（将每个点沿流推进时间 t）。"""
        flow = []
        for i in range(grid):
            row = []
            y = y_range[0] + i * (y_range[1] - y_range[0]) / (grid - 1)
            for j in range(grid):
                x = x_range[0] + j * (x_range[1] - x_range[0]) / (grid - 1)
                traj = self.integrate_trajectory(x, y, dt=0.01, steps=int(t / 0.01))
                row.append(traj[-1])
            flow.append(row)
        return flow

    def divergence(self, x: float, y: float, eps: float = 1e-5) -> float:
        """计算散度 div(f, g)。"""
        df_dx = (self.f(x + eps, y) - self.f(x - eps, y)) / (2.0 * eps)
        dg_dy = (self.g(x, y + eps) - self.g(x, y - eps)) / (2.0 * eps)
        return df_dx + dg_dy

    def lyapunov_function_test(self, candidate: Callable[[float, float], float],
                               x_range: Tuple[float, float], y_range: Tuple[float, float],
                               grid: int = 20) -> bool:
        """检验候选 Lyapunov 函数（沿流递减）。"""
        for i in range(grid):
            for j in range(grid):
                x = x_range[0] + j * (x_range[1] - x_range[0]) / grid
                y = y_range[0] + i * (y_range[1] - y_range[0]) / grid
                v0 = candidate(x, y)
                traj = self.integrate_trajectory(x, y, dt=0.01, steps=10)
                v1 = candidate(traj[-1][0], traj[-1][1])
                if v1 > v0 + 1e-6:
                    return False
        return True

    @staticmethod
    def lotka_volterra(alpha: float = 1.0, beta: float = 0.1,
                       delta: float = 0.075, gamma: float = 1.5) -> PhasePortrait:
        """Lotka-Volterra 捕食者-猎物模型。"""
        def f(x, y):
            return alpha * x - beta * x * y
        def g(x, y):
            return delta * x * y - gamma * y
        return PhasePortrait(f, g)

    @staticmethod
    def van_der_pol(mu: float = 1.0) -> PhasePortrait:
        """Van der Pol 振子。"""
        def f(x, y):
            return y
        def g(x, y):
            return mu * (1.0 - x ** 2) * y - x
        return PhasePortrait(f, g)

    @staticmethod
    def pendulum(g: float = 9.81, L: float = 1.0) -> PhasePortrait:
        """单摆。"""
        def f(theta, omega):
            return omega
        def g_eq(theta, omega):
            return -(g / L) * math.sin(theta)
        return PhasePortrait(f, g_eq)
