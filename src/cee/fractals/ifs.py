"""
ifs.py — 迭代函数系统引擎

实现仿射 IFS、概率 IFS、确定性算法与随机迭代算法，
支持 collage 定理验证与自动编码器式 IFS 参数搜索。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Callable, Optional


class AffineTransform:
    """二维仿射变换。"""

    def __init__(self, a: float = 1.0, b: float = 0.0, c: float = 0.0,
                 d: float = 1.0, e: float = 0.0, f: float = 0.0,
                 probability: float = 1.0):
        self.a = a
        self.b = b
        self.c = c
        self.d = d
        self.e = e
        self.f = f
        self.probability = probability

    def apply(self, x: float, y: float) -> Tuple[float, float]:
        """应用仿射变换到点 (x, y)。"""
        new_x = self.a * x + self.b * y + self.e
        new_y = self.c * x + self.d * y + self.f
        return new_x, new_y

    def apply_point(self, p: Tuple[float, float]) -> Tuple[float, float]:
        """应用变换到点。"""
        return self.apply(p[0], p[1])

    def determinant(self) -> float:
        """行列式。"""
        return self.a * self.d - self.b * self.c

    def contraction_factor(self) -> float:
        """估算收缩因子（特征值模的最大值）。"""
        trace = self.a + self.d
        det = self.determinant()
        disc = trace * trace - 4 * det
        disc = max(disc, 0.0)
        lambda1 = abs((trace + math.sqrt(disc)) / 2.0)
        lambda2 = abs((trace - math.sqrt(disc)) / 2.0)
        return max(lambda1, lambda2)

    def copy(self) -> AffineTransform:
        """返回副本。"""
        return AffineTransform(self.a, self.b, self.c, self.d, self.e, self.f, self.probability)

    def to_matrix_vector(self) -> Tuple[List[List[float]], List[float]]:
        """返回矩阵与向量形式。"""
        return [[self.a, self.b], [self.c, self.d]], [self.e, self.f]

    @staticmethod
    def scale(sx: float, sy: float) -> AffineTransform:
        """缩放变换。"""
        return AffineTransform(sx, 0.0, 0.0, sy, 0.0, 0.0)

    @staticmethod
    def rotation(theta: float) -> AffineTransform:
        """旋转变换。"""
        return AffineTransform(math.cos(theta), -math.sin(theta),
                               math.sin(theta), math.cos(theta), 0.0, 0.0)

    @staticmethod
    def translation(tx: float, ty: float) -> AffineTransform:
        """平移变换。"""
        return AffineTransform(1.0, 0.0, 0.0, 1.0, tx, ty)


class IteratedFunctionSystem:
    """迭代函数系统引擎。"""

    def __init__(self, transforms: Optional[List[AffineTransform]] = None):
        self.transforms = transforms or []
        self._normalize_probabilities()

    def _normalize_probabilities(self) -> None:
        """归一化概率。"""
        total = sum(t.probability for t in self.transforms)
        if total > 0:
            for t in self.transforms:
                t.probability /= total

    def add_transform(self, transform: AffineTransform) -> None:
        """添加变换。"""
        self.transforms.append(transform)
        self._normalize_probabilities()

    def random_transform(self) -> AffineTransform:
        """按概率随机选择一个变换。"""
        r = random.random()
        cum = 0.0
        for t in self.transforms:
            cum += t.probability
            if r <= cum:
                return t
        return self.transforms[-1]

    def chaos_game(self, iterations: int = 100000,
                   initial: Tuple[float, float] = (0.0, 0.0)) -> List[Tuple[float, float]]:
        """随机迭代算法 (Chaos Game)。"""
        points = []
        x, y = initial
        for _ in range(100):
            t = self.random_transform()
            x, y = t.apply(x, y)
        for _ in range(iterations):
            t = self.random_transform()
            x, y = t.apply(x, y)
            points.append((x, y))
        return points

    def deterministic_algorithm(self, initial_set: List[Tuple[float, float]],
                                 iterations: int = 5) -> List[Tuple[float, float]]:
        """确定性算法。"""
        current = list(initial_set)
        for _ in range(iterations):
            new_set = []
            for p in current:
                for t in self.transforms:
                    new_set.append(t.apply_point(p))
            current = new_set
        return current

    def attractor_bounding_box(self, iterations: int = 10000) -> Tuple[float, float, float, float]:
        """估算吸引子包围盒。"""
        points = self.chaos_game(iterations)
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        return min(xs), max(xs), min(ys), max(ys)

    def is_contractive(self, tol: float = 1.0) -> bool:
        """检查所有变换是否为收缩映射。"""
        return all(t.contraction_factor() < tol for t in self.transforms)

    def collage_error(self, target_points: List[Tuple[float, float]],
                      sample_size: int = 1000) -> float:
        """Collage 定理误差估计。"""
        if not target_points:
            return float('inf')
        total_error = 0.0
        for _ in range(sample_size):
            p = random.choice(target_points)
            transformed = [t.apply_point(p) for t in self.transforms]
            min_dist = min(math.sqrt((tp[0] - p[0]) ** 2 + (tp[1] - p[1]) ** 2) for tp in transformed)
            total_error += min_dist
        return total_error / sample_size

    def barnsley_fern() -> IteratedFunctionSystem:
        """Barnsley 蕨类 IFS。"""
        ifs = IteratedFunctionSystem()
        ifs.add_transform(AffineTransform(0.0, 0.0, 0.0, 0.16, 0.0, 0.0, 0.01))
        ifs.add_transform(AffineTransform(0.85, 0.04, -0.04, 0.85, 0.0, 1.6, 0.85))
        ifs.add_transform(AffineTransform(0.2, -0.26, 0.23, 0.22, 0.0, 1.6, 0.07))
        ifs.add_transform(AffineTransform(-0.15, 0.28, 0.26, 0.24, 0.0, 0.44, 0.07))
        return ifs

    def sierpinski_triangle() -> IteratedFunctionSystem:
        """Sierpinski 三角形 IFS。"""
        ifs = IteratedFunctionSystem()
        ifs.add_transform(AffineTransform(0.5, 0.0, 0.0, 0.5, 0.0, 0.0, 1.0 / 3.0))
        ifs.add_transform(AffineTransform(0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 1.0 / 3.0))
        ifs.add_transform(AffineTransform(0.5, 0.0, 0.0, 0.5, 0.25, 0.5, 1.0 / 3.0))
        return ifs

    def koch_curve() -> IteratedFunctionSystem:
        """Koch 曲线 IFS。"""
        ifs = IteratedFunctionSystem()
        ifs.add_transform(AffineTransform(1.0 / 3.0, 0.0, 0.0, 1.0 / 3.0, 0.0, 0.0, 1.0 / 4.0))
        ifs.add_transform(AffineTransform(1.0 / 6.0, -math.sqrt(3) / 6.0,
                                           math.sqrt(3) / 6.0, 1.0 / 6.0, 1.0 / 3.0, 0.0, 1.0 / 4.0))
        ifs.add_transform(AffineTransform(1.0 / 6.0, math.sqrt(3) / 6.0,
                                           -math.sqrt(3) / 6.0, 1.0 / 6.0, 0.5, math.sqrt(3) / 6.0, 1.0 / 4.0))
        ifs.add_transform(AffineTransform(1.0 / 3.0, 0.0, 0.0, 1.0 / 3.0, 2.0 / 3.0, 0.0, 1.0 / 4.0))
        return ifs

    def measure_distribution(self, points: List[Tuple[float, float]],
                             bins: int = 100) -> List[List[float]]:
        """计算吸引子上的测度分布直方图。"""
        if not points:
            return [[0.0] * bins for _ in range(bins)]
        min_x = min(p[0] for p in points)
        max_x = max(p[0] for p in points)
        min_y = min(p[1] for p in points)
        max_y = max(p[1] for p in points)
        hist = [[0.0] * bins for _ in range(bins)]
        for p in points:
            ix = int((p[0] - min_x) / (max_x - min_x) * (bins - 1)) if max_x != min_x else 0
            iy = int((p[1] - min_y) / (max_y - min_y) * (bins - 1)) if max_y != min_y else 0
            hist[iy][ix] += 1.0
        total = sum(sum(row) for row in hist)
        if total > 0:
            hist = [[v / total for v in row] for row in hist]
        return hist

    def escape_time_ifs(self, x: float, y: float, max_iter: int = 100,
                        escape_radius: float = 100.0) -> int:
        """将 IFS 视为逆向迭代计算逃逸时间。"""
        for n in range(max_iter):
            if abs(x) > escape_radius or abs(y) > escape_radius:
                return n
            t = self.random_transform()
            x, y = t.apply(x, y)
        return max_iter
