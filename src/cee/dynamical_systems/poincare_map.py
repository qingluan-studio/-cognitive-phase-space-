"""
poincare_map.py — 庞加莱映射引擎

实现超平面截面的 Poincare 映射计算、截面映射迭代、
不动点检测与周期轨道重构。
"""

from __future__ import annotations

import math
from typing import List, Tuple, Callable, Optional


class PoincareMap:
    """Poincare 映射分析器。"""

    def __init__(self, f: Callable[[List[float]], List[float]],
                 section_func: Callable[[List[float]], float],
                 direction: str = "both"):
        self.f = f
        self.section_func = section_func
        self.direction = direction

    def integrate_to_section(self, x0: List[float], dt: float = 0.01,
                             max_steps: int = 10000) -> Optional[Tuple[List[float], int]]:
        """从初始条件积分到首次穿过截面。"""
        x = list(x0)
        prev_val = self.section_func(x)
        for step in range(max_steps):
            k1 = self.f(x)
            k2 = self.f([x[i] + 0.5 * dt * k1[i] for i in range(len(x))])
            k3 = self.f([x[i] + 0.5 * dt * k2[i] for i in range(len(x))])
            k4 = self.f([x[i] + dt * k3[i] for i in range(len(x))])
            x_new = [x[i] + dt / 6.0 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
                     for i in range(len(x))]
            new_val = self.section_func(x_new)
            crossed = False
            if self.direction == "up" and prev_val < 0 <= new_val:
                crossed = True
            elif self.direction == "down" and prev_val > 0 >= new_val:
                crossed = True
            elif self.direction == "both" and prev_val * new_val <= 0:
                crossed = True
            if crossed:
                alpha = abs(prev_val) / (abs(prev_val) + abs(new_val)) if (abs(prev_val) + abs(new_val)) > 0 else 0.0
                intersection = [x[i] + alpha * (x_new[i] - x[i]) for i in range(len(x))]
                return intersection, step
            x = x_new
            prev_val = new_val
        return None

    def iterate_map(self, x0: List[float], n_iter: int = 100,
                    dt: float = 0.01) -> List[List[float]]:
        """迭代 Poincare 映射 n 次。"""
        points = []
        current = list(x0)
        for _ in range(n_iter):
            result = self.integrate_to_section(current, dt)
            if result is None:
                break
            point, _ = result
            points.append(point)
            current = point
        return points

    def find_fixed_point(self, x0: List[float], tol: float = 1e-6,
                         max_iter: int = 100) -> Optional[List[float]]:
        """通过迭代搜索 Poincare 映射的不动点。"""
        x = list(x0)
        for _ in range(max_iter):
            result = self.integrate_to_section(x)
            if result is None:
                return None
            next_x, _ = result
            dist = math.sqrt(sum((next_x[i] - x[i]) ** 2 for i in range(len(x))))
            if dist < tol:
                return next_x
            x = [x[i] + 0.5 * (next_x[i] - x[i]) for i in range(len(x))]
        return None

    def period_detection(self, points: List[List[float]], tol: float = 1e-4) -> int:
        """从截面点序列检测周期。"""
        if len(points) < 2:
            return 0
        for p in range(1, min(len(points), 50)):
            if all(math.sqrt(sum((points[-1 - i][j] - points[-1 - i - p][j]) ** 2 for j in range(len(points[0])))) < tol
                   for i in range(p)):
                return p
        return -1

    def jacobian_approx(self, x: List[float], eps: float = 1e-6,
                        dt: float = 0.01) -> List[List[float]]:
        """数值近似 Poincare 映射的 Jacobian。"""
        n = len(x)
        jacobian = [[0.0] * n for _ in range(n)]
        base = self.integrate_to_section(x, dt)
        if base is None:
            return jacobian
        base_point = base[0]
        for i in range(n):
            perturbed = list(x)
            perturbed[i] += eps
            result = self.integrate_to_section(perturbed, dt)
            if result:
                next_point = result[0]
                for j in range(n):
                    jacobian[j][i] = (next_point[j] - base_point[j]) / eps
        return jacobian

    def stability_eigenvalues(self, x: List[float]) -> List[complex]:
        """计算不动点的稳定性特征值。"""
        j = self.jacobian_approx(x)
        if len(j) == 2:
            trace = j[0][0] + j[1][1]
            det = j[0][0] * j[1][1] - j[0][1] * j[1][0]
            disc = trace * trace - 4 * det
            if disc >= 0:
                return [(trace + math.sqrt(disc)) / 2.0, (trace - math.sqrt(disc)) / 2.0]
            return [complex(trace / 2.0, math.sqrt(-disc) / 2.0),
                    complex(trace / 2.0, -math.sqrt(-disc) / 2.0)]
        return [j[i][i] for i in range(len(j))]

    def section_histogram(self, points: List[List[float]], coord: int = 0,
                          bins: int = 50) -> List[int]:
        """计算截面点在指定坐标上的直方图。"""
        values = [p[coord] for p in points]
        min_v = min(values)
        max_v = max(values)
        hist = [0] * bins
        for v in values:
            idx = int((v - min_v) / (max_v - min_v) * (bins - 1)) if max_v != min_v else 0
            hist[idx] += 1
        return hist

    def first_return_time(self, x0: List[float], dt: float = 0.01,
                          max_steps: int = 10000) -> Optional[int]:
        """计算首次返回时间。"""
        result = self.integrate_to_section(x0, dt, max_steps)
        return result[1] if result else None

    @staticmethod
    def plane_section(normal: List[float], offset: float) -> Callable[[List[float]], float]:
        """构造平面截面函数。"""
        def section(x: List[float]) -> float:
            return sum(normal[i] * x[i] for i in range(len(normal))) - offset
        return section

    def reconstruct_orbit(self, points: List[List[float]], dim: int = 3) -> List[List[float]]:
        """从截面点重构完整轨道片段。"""
        orbits = []
        for p in points:
            result = self.integrate_to_section(p)
            if result:
                orbits.append(result[0][:dim])
        return orbits

    def lyapunov_exponent_from_map(self, x0: List[float], n_iter: int = 500) -> float:
        """从 Poincare 映射估算 Lyapunov 指数。"""
        points = self.iterate_map(x0, n_iter)
        if len(points) < 2:
            return 0.0
        distances = [math.sqrt(sum((points[i][j] - points[i - 1][j]) ** 2 for j in range(len(points[0]))))
                     for i in range(1, len(points))]
        if not distances or distances[0] == 0:
            return 0.0
        return sum(math.log(d / distances[0]) for d in distances if d > 0) / len(distances)
