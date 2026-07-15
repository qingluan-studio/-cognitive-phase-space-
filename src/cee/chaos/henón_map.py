"""
henón_map.py — 埃农映射分析器

实现二维 Henón 映射的迭代、吸引子重建、
不稳定流形追踪与参数空间扫描。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class HenonMap:
    """Henón 映射: x_{n+1} = 1 - a*x_n^2 + y_n, y_{n+1} = b*x_n。"""

    def __init__(self, a: float = 1.4, b: float = 0.3):
        self.a = a
        self.b = b
        self.x = 0.0
        self.y = 0.0
        self.history: List[Tuple[float, float]] = []

    def iterate(self, steps: int = 10000) -> List[Tuple[float, float]]:
        """迭代指定步数。"""
        for _ in range(steps):
            x_new = 1.0 - self.a * self.x ** 2 + self.y
            y_new = self.b * self.x
            self.x, self.y = x_new, y_new
            self.history.append((self.x, self.y))
        return self.history

    def next_point(self, x: float, y: float) -> Tuple[float, float]:
        """计算下一个点。"""
        return 1.0 - self.a * x ** 2 + y, self.b * x

    def fixed_points(self) -> List[Tuple[float, float]]:
        """解析计算不动点。"""
        disc = (self.b - 1.0) ** 2 + 4.0 * self.a
        if disc < 0:
            return []
        sqrt_disc = math.sqrt(disc)
        x1 = (-(self.b - 1.0) + sqrt_disc) / (2.0 * self.a)
        x2 = (-(self.b - 1.0) - sqrt_disc) / (2.0 * self.a)
        return [(x1, self.b * x1), (x2, self.b * x2)]

    def jacobian(self, x: float, y: float) -> List[List[float]]:
        """计算 Jacobian 矩阵。"""
        return [[-2.0 * self.a * x, 1.0], [self.b, 0.0]]

    def eigenvalues_at(self, x: float, y: float) -> Tuple[complex, complex]:
        """计算某点的特征值。"""
        j = self.jacobian(x, y)
        trace = j[0][0] + j[1][1]
        det = j[0][0] * j[1][1] - j[0][1] * j[1][0]
        disc = trace * trace - 4.0 * det
        if disc >= 0:
            return ((trace + math.sqrt(disc)) / 2.0, (trace - math.sqrt(disc)) / 2.0)
        return (complex(trace / 2.0, math.sqrt(-disc) / 2.0),
                complex(trace / 2.0, -math.sqrt(-disc) / 2.0))

    def lyapunov_exponents(self, steps: int = 10000, transient: int = 1000) -> Tuple[float, float]:
        """计算两个 Lyapunov 指数。"""
        x, y = self.x, self.y
        for _ in range(transient):
            x, y = self.next_point(x, y)
        M = [[1.0, 0.0], [0.0, 1.0]]
        lyap_sum = [0.0, 0.0]
        for _ in range(steps):
            x, y = self.next_point(x, y)
            j = self.jacobian(x, y)
            M = [[j[0][0] * M[0][0] + j[0][1] * M[1][0],
                  j[0][0] * M[0][1] + j[0][1] * M[1][1]],
                 [j[1][0] * M[0][0] + j[1][1] * M[1][0],
                  j[1][0] * M[0][1] + j[1][1] * M[1][1]]]
            norm1 = math.sqrt(M[0][0] ** 2 + M[1][0] ** 2)
            if norm1 > 0:
                M[0][0] /= norm1
                M[1][0] /= norm1
            lyap_sum[0] += math.log(max(norm1, 1e-10))
            dot = M[0][0] * M[0][1] + M[1][0] * M[1][1]
            M[0][1] -= dot * M[0][0]
            M[1][1] -= dot * M[1][0]
            norm2 = math.sqrt(M[0][1] ** 2 + M[1][1] ** 2)
            if norm2 > 0:
                M[0][1] /= norm2
                M[1][1] /= norm2
            lyap_sum[1] += math.log(max(norm2, 1e-10))
        return lyap_sum[0] / steps, lyap_sum[1] / steps

    def basin_of_attraction(self, x_range: Tuple[float, float] = (-2.0, 2.0),
                            y_range: Tuple[float, float] = (-2.0, 2.0),
                            grid: int = 100, steps: int = 1000) -> List[List[bool]]:
        """计算吸引域。"""
        basin = []
        for iy in range(grid):
            row = []
            y0 = y_range[0] + iy * (y_range[1] - y_range[0]) / grid
            for ix in range(grid):
                x0 = x_range[0] + ix * (x_range[1] - x_range[0]) / grid
                x, y = x0, y0
                bounded = True
                for _ in range(steps):
                    x, y = self.next_point(x, y)
                    if abs(x) > 10.0 or abs(y) > 10.0:
                        bounded = False
                        break
                row.append(bounded)
            basin.append(row)
        return basin

    def reset(self, x: float = 0.0, y: float = 0.0) -> None:
        """重置状态。"""
        self.x = x
        self.y = y
        self.history.clear()

    def correlation_dimension(self, r_min: float = 0.001, r_max: float = 1.0,
                              num_r: int = 20) -> float:
        """估算关联维数。"""
        if len(self.history) < 100:
            return 0.0
        points = self.history[::10]
        rs = []
        cors = []
        for i in range(num_r):
            r = r_max * (r_min / r_max) ** (i / (num_r - 1))
            rs.append(math.log(r))
            count = 0
            n = len(points)
            for a in range(n):
                for b in range(a + 1, n):
                    dist = math.sqrt((points[a][0] - points[b][0]) ** 2 + (points[a][1] - points[b][1]) ** 2)
                    if dist < r:
                        count += 1
            cors.append(math.log(max(1, 2.0 * count / (n * (n - 1)))))
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

    def unstable_manifold(self, steps: int = 1000, length: float = 0.01) -> List[Tuple[float, float]]:
        """追踪不稳定流形。"""
        fps = self.fixed_points()
        if not fps:
            return []
        fp = fps[0]
        eigs = self.eigenvalues_at(fp[0], fp[1])
        unstable = [e for e in eigs if abs(e) > 1.0]
        if not unstable:
            return []
        manifold = []
        x, y = fp[0] + length, fp[1]
        for _ in range(steps):
            x, y = self.next_point(x, y)
            manifold.append((x, y))
            if abs(x) > 10 or abs(y) > 10:
                break
        return manifold

    def parameter_space_scan(self, a_range: Tuple[float, float, int] = (0.8, 1.6, 40),
                             b_range: Tuple[float, float, int] = (0.1, 0.4, 20)) -> List[List[bool]]:
        """扫描参数空间判断有界性。"""
        a_vals = [a_range[0] + i * (a_range[1] - a_range[0]) / a_range[2] for i in range(a_range[2])]
        b_vals = [b_range[0] + i * (b_range[1] - b_range[0]) / b_range[2] for i in range(b_range[2])]
        results = []
        for b in b_vals:
            row = []
            for a in a_vals:
                old_a, old_b = self.a, self.b
                self.a, self.b = a, b
                self.reset()
                bounded = True
                for _ in range(500):
                    self.next_point(self.x, self.y)
                    if abs(self.x) > 10:
                        bounded = False
                        break
                row.append(bounded)
                self.a, self.b = old_a, old_b
            results.append(row)
        return results
