"""
fractal_dimension.py — 分形维数计算器

实现盒计数维数、信息维数、关联维数、
Hausdorff 维数估计与多重分形谱分析。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class FractalDimension:
    """分形维数计算引擎。"""

    def __init__(self):
        self.data: List[Tuple[float, ...]] = []

    def load_points(self, points: List[Tuple[float, ...]]) -> None:
        """加载点集数据。"""
        self.data = list(points)

    def box_counting(self, min_scale: float = 1e-3, max_scale: float = 1.0,
                     num_scales: int = 20) -> Tuple[float, List[float], List[float]]:
        """计算盒计数维数 D0。"""
        if not self.data:
            return 0.0, [], []
        dim = len(self.data[0])
        scales = []
        counts = []
        for i in range(num_scales):
            eps = max_scale * (min_scale / max_scale) ** (i / (num_scales - 1))
            scales.append(math.log(1.0 / eps))
            count = self._count_boxes(eps, dim)
            counts.append(math.log(max(1, count)))
        slope = self._linear_regression(scales, counts)
        return slope, scales, counts

    def _count_boxes(self, eps: float, dim: int) -> int:
        """统计覆盖点集所需 epsilon 盒子数。"""
        boxes: set = set()
        for p in self.data:
            key = tuple(int(p[d] / eps) for d in range(dim))
            boxes.add(key)
        return len(boxes)

    def information_dimension(self, min_scale: float = 1e-3, max_scale: float = 1.0,
                              num_scales: int = 20) -> float:
        """计算信息维数 D1。"""
        if not self.data:
            return 0.0
        dim = len(self.data[0])
        scales = []
        infos = []
        for i in range(num_scales):
            eps = max_scale * (min_scale / max_scale) ** (i / (num_scales - 1))
            scales.append(math.log(1.0 / eps))
            info = self._box_entropy(eps, dim)
            infos.append(info)
        return self._linear_regression(scales, infos)

    def _box_entropy(self, eps: float, dim: int) -> float:
        """计算盒子分布的香农熵。"""
        box_counts: Dict = {}
        for p in self.data:
            key = tuple(int(p[d] / eps) for d in range(dim))
            box_counts[key] = box_counts.get(key, 0) + 1
        total = len(self.data)
        entropy = 0.0
        for count in box_counts.values():
            p = count / total
            if p > 0:
                entropy -= p * math.log(p)
        return entropy

    def correlation_dimension(self, r_min: float = 1e-3, r_max: float = 1.0,
                              num_r: int = 20, sample_size: int = 1000) -> float:
        """计算 Grassberger-Procaccia 关联维数 D2。"""
        if not self.data:
            return 0.0
        n = min(len(self.data), sample_size)
        indices = random.sample(range(len(self.data)), n)
        rs = []
        cors = []
        for i in range(num_r):
            r = r_max * (r_min / r_max) ** (i / (num_r - 1))
            rs.append(math.log(r))
            corr = self._correlation_sum(r, indices)
            cors.append(math.log(max(1e-10, corr)))
        return self._linear_regression(rs, cors)

    def _correlation_sum(self, r: float, indices: List[int]) -> float:
        """计算关联和 C(r)。"""
        count = 0
        total_pairs = 0
        n = len(indices)
        for i in range(n):
            for j in range(i + 1, n):
                total_pairs += 1
                dist = math.sqrt(sum((self.data[indices[i]][d] - self.data[indices[j]][d]) ** 2
                                     for d in range(len(self.data[0]))))
                if dist < r:
                    count += 1
        return 2.0 * count / (n * (n - 1)) if n > 1 else 0.0

    def hausdorff_estimate(self, iterations: int = 5) -> float:
        """使用覆盖法估算 Hausdorff 维数。"""
        if not self.data:
            return 0.0
        dim = len(self.data[0])
        eps = 1.0
        dims = []
        for _ in range(iterations):
            count = self._count_boxes(eps, dim)
            if count > 0:
                dims.append(math.log(count) / math.log(1.0 / eps))
            eps /= 2.0
        return sum(dims) / len(dims) if dims else 0.0

    def multifractal_spectrum(self, q_values: List[float], min_scale: float = 1e-3,
                              max_scale: float = 1.0, num_scales: int = 15) -> Dict[float, float]:
        """计算多重分形谱 f(alpha) 的近似。"""
        spectrum = {}
        for q in q_values:
            Dq = self._generalized_dimension(q, min_scale, max_scale, num_scales)
            spectrum[q] = Dq
        return spectrum

    def _generalized_dimension(self, q: float, min_scale: float, max_scale: float,
                               num_scales: int) -> float:
        """计算广义维数 Dq。"""
        if not self.data:
            return 0.0
        dim = len(self.data[0])
        scales = []
        vals = []
        for i in range(num_scales):
            eps = max_scale * (min_scale / max_scale) ** (i / (num_scales - 1))
            scales.append(math.log(1.0 / eps))
            partition = self._partition_function(eps, dim, q)
            vals.append(math.log(max(1e-10, partition)) / (1.0 - q) if q != 1 else self._box_entropy(eps, dim))
        return self._linear_regression(scales, vals)

    def _partition_function(self, eps: float, dim: int, q: float) -> float:
        """计算配分函数。"""
        box_counts: Dict = {}
        for p in self.data:
            key = tuple(int(p[d] / eps) for d in range(dim))
            box_counts[key] = box_counts.get(key, 0) + 1
        total = len(self.data)
        z = 0.0
        for count in box_counts.values():
            p = count / total
            if p > 0:
                z += p ** q
        return z

    @staticmethod
    def _linear_regression(x: List[float], y: List[float]) -> float:
        """最小二乘法求斜率。"""
        n = len(x)
        if n < 2:
            return 0.0
        mean_x = sum(x) / n
        mean_y = sum(y) / n
        num = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
        den = sum((x[i] - mean_x) ** 2 for i in range(n))
        return num / den if den != 0 else 0.0

    def lacunarity(self, box_sizes: List[int], grid_dim: int = 256) -> List[Tuple[int, float]]:
        """计算空隙度 (Lacunarity)。"""
        results = []
        for size in box_sizes:
            counts = []
            for i in range(0, grid_dim, size):
                for j in range(0, grid_dim, size):
                    count = sum(1 for p in self.data
                                if i <= p[0] < i + size and j <= p[1] < j + size)
                    counts.append(count)
            mean_c = sum(counts) / len(counts)
            var_c = sum((c - mean_c) ** 2 for c in counts) / len(counts)
            lac = var_c / (mean_c ** 2) if mean_c > 0 else 0.0
            results.append((size, lac))
        return results

    def self_similarity_ratio(self, scales: List[float]) -> float:
        """计算自相似比。"""
        counts = [self._count_boxes(s, len(self.data[0])) for s in scales]
        ratios = [counts[i] / counts[i + 1] for i in range(len(counts) - 1) if counts[i + 1] > 0]
        return sum(ratios) / len(ratios) if ratios else 0.0
