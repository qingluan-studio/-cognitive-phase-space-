"""
morse_theory.py — 莫尔斯理论引擎

实现离散 Morse 函数、梯度向量场、
临界点检测与 Morse 复形简化。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Set, Optional


class MorseFunction:
    """离散 Morse 函数定义。"""

    def __init__(self, values: Dict[Tuple[int, ...], float]):
        self.values = values

    def value(self, simplex: Tuple[int, ...]) -> float:
        """获取单纯形的 Morse 函数值。"""
        return self.values.get(simplex, 0.0)

    def gradient(self, simplex: Tuple[int, ...],
                 cofaces: List[Tuple[int, ...]]) -> Optional[Tuple[int, ...]]:
        """计算离散梯度方向（指向函数值更大的共面）。"""
        if not cofaces:
            return None
        current = self.value(simplex)
        candidates = [cf for cf in cofaces if self.value(cf) > current]
        if not candidates:
            return None
        return min(candidates, key=lambda cf: self.value(cf))

    def is_critical(self, simplex: Tuple[int, ...],
                    faces: List[Tuple[int, ...]],
                    cofaces: List[Tuple[int, ...]]) -> bool:
        """判断是否为临界点。"""
        val = self.value(simplex)
        lower_faces = [f for f in faces if self.value(f) < val]
        lower_cofaces = [cf for cf in cofaces if self.value(cf) < val]
        return len(lower_faces) == 0 and len(lower_cofaces) == 0

    def index(self, simplex: Tuple[int, ...]) -> int:
        """临界点的 Morse 指数。"""
        return len(simplex) - 1

    def witten_laplacian_approx(self, simplex: Tuple[int, ...],
                                 neighbors: List[Tuple[int, ...]]) -> float:
        """近似 Witten Laplacian 值。"""
        val = self.value(simplex)
        lap = 0.0
        for nb in neighbors:
            lap += (self.value(nb) - val) ** 2
        return lap

    def sublevel_set(self, threshold: float) -> Set[Tuple[int, ...]]:
        """获取子水平集。"""
        return {s for s, v in self.values.items() if v <= threshold}

    def superlevel_set(self, threshold: float) -> Set[Tuple[int, ...]]:
        """获取超水平集。"""
        return {s for s, v in self.values.items() if v >= threshold}

    def persistence_pairing(self) -> List[Tuple[Tuple[int, ...], Tuple[int, ...]]]:
        """简化版 Morse 持续配对。"""
        sorted_simplices = sorted(self.values.items(), key=lambda x: x[1])
        pairs = []
        unmatched = set()
        for simplex, _ in sorted_simplices:
            if simplex in unmatched:
                continue
            neighbors = [s for s, _ in sorted_simplices if s != simplex and self._adjacent(simplex, s)]
            for nb in neighbors:
                if nb not in unmatched:
                    pairs.append((simplex, nb))
                    unmatched.add(simplex)
                    unmatched.add(nb)
                    break
        return pairs

    @staticmethod
    def _adjacent(a: Tuple[int, ...], b: Tuple[int, ...]) -> bool:
        """判断两个单纯形是否相邻。"""
        return len(set(a) & set(b)) == min(len(a), len(b)) - 1

    def random_morse_function(num_vertices: int, seed: Optional[int] = None) -> MorseFunction:
        """生成随机 Morse 函数。"""
        if seed is not None:
            random.seed(seed)
        values = {}
        for v in range(num_vertices):
            values[(v,)] = random.random()
        return MorseFunction(values)

    def smooth_extension(self, vertex_values: Dict[int, float],
                         simplex: Tuple[int, ...]) -> float:
        """将顶点值线性扩展到单纯形。"""
        return sum(vertex_values.get(v, 0.0) for v in simplex) / len(simplex)

    def hessian_approx(self, simplex: Tuple[int, ...],
                       neighbors: List[Tuple[int, ...]], eps: float = 1e-4) -> List[List[float]]:
        """近似 Hessian 矩阵。"""
        n = len(simplex)
        h = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                p_plus_i = tuple(v + (eps if k == i else 0.0) for k, v in enumerate(simplex))
                p_plus_j = tuple(v + (eps if k == j else 0.0) for k, v in enumerate(simplex))
                p_plus_ij = tuple(v + (eps if k in (i, j) else 0.0) for k, v in enumerate(simplex))
                h[i][j] = (self.value(p_plus_ij) - self.value(p_plus_i) - self.value(p_plus_j) + self.value(simplex)) / (eps ** 2)
        return h


class MorseComplex:
    """Morse 复形简化。"""

    def __init__(self, critical_points: List[Tuple[int, ...]]):
        self.critical_points = list(critical_points)
        self.connections: Dict[Tuple[int, ...], List[Tuple[int, ...]]] = {}

    def add_connection(self, cp1: Tuple[int, ...], cp2: Tuple[int, ...]) -> None:
        """添加临界点之间的连接。"""
        if cp1 not in self.connections:
            self.connections[cp1] = []
        self.connections[cp1].append(cp2)

    def morse_inequalities(self, max_dim: int = 2) -> Dict[int, int]:
        """统计各维临界点数量。"""
        counts = {}
        for cp in self.critical_points:
            dim = len(cp) - 1
            counts[dim] = counts.get(dim, 0) + 1
        return counts

    def euler_characteristic(self) -> int:
        """通过 Morse 不等式计算欧拉示性数。"""
        return sum(((-1) ** (len(cp) - 1)) for cp in self.critical_points)

    def gradient_path(self, start: Tuple[int, ...],
                      gradient_field: Dict[Tuple[int, ...], Optional[Tuple[int, ...]]],
                      max_steps: int = 100) -> List[Tuple[int, ...]]:
        """沿梯度向量场追踪路径。"""
        path = [start]
        current = start
        for _ in range(max_steps):
            if current not in gradient_field or gradient_field[current] is None:
                break
            current = gradient_field[current]
            path.append(current)
        return path

    def cancel_pairs(self, pairs: List[Tuple[Tuple[int, ...], Tuple[int, ...]]]) -> List[Tuple[int, ...]]:
        """取消 Morse 对以简化复形。"""
        remaining = set(self.critical_points)
        for cp1, cp2 in pairs:
            remaining.discard(cp1)
            remaining.discard(cp2)
        return list(remaining)

    def betti_numbers_from_morse(self, max_dim: int = 2) -> Dict[int, int]:
        """从 Morse 理论近似 Betti 数。"""
        counts = self.morse_inequalities(max_dim)
        return {d: counts.get(d, 0) for d in range(max_dim + 1)}

    def morse_homology_rank(self, dim: int) -> int:
        """估算 Morse 同调秩。"""
        c_dim = sum(1 for cp in self.critical_points if len(cp) - 1 == dim)
        c_dim_plus = sum(1 for cp in self.critical_points if len(cp) - 1 == dim + 1)
        return max(0, c_dim - c_dim_plus)

    def gradient_flow_volume(self, gradient_field: Dict[Tuple[int, ...], Optional[Tuple[int, ...]]],
                             source: Tuple[int, ...], max_depth: int = 50) -> int:
        """计算从源点出发的梯度流覆盖体积。"""
        visited = {source}
        frontier = {source}
        for _ in range(max_depth):
            new_frontier = set()
            for point in frontier:
                for p, target in gradient_field.items():
                    if target == point and p not in visited:
                        visited.add(p)
                        new_frontier.add(p)
            if not new_frontier:
                break
            frontier = new_frontier
        return len(visited)
