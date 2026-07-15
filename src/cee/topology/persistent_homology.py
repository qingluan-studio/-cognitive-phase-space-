"""
persistent_homology.py — 持续同调计算引擎

实现 Vietoris-Rips 复形构建、条形码生成、
持久图计算与 Betti 数序列提取。
"""

from __future__ import annotations

import math
from typing import List, Tuple, Dict, Set, Optional


class Simplex:
    """单纯形：顶点的有序集合。"""

    def __init__(self, vertices: Tuple[int, ...], filtration: float = 0.0):
        self.vertices = tuple(sorted(vertices))
        self.dim = len(self.vertices) - 1
        self.filtration = filtration
        self.boundary: List[Simplex] = []

    def faces(self) -> List[Tuple[int, ...]]:
        """返回所有 (dim-1) 维面。"""
        if self.dim <= 0:
            return []
        return [tuple(v for j, v in enumerate(self.vertices) if j != i)
                for i in range(len(self.vertices))]

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Simplex):
            return self.vertices == other.vertices
        return False

    def __hash__(self) -> int:
        return hash(self.vertices)

    def __repr__(self) -> str:
        return f"Simplex({self.vertices}, f={self.filtration:.4f})"


class VietorisRipsComplex:
    """Vietoris-Rips 复形构建器。"""

    def __init__(self, points: List[Tuple[float, ...]], max_dim: int = 2):
        self.points = points
        self.max_dim = max_dim
        self.n = len(points)
        self.distance_matrix = self._compute_distances()
        self.simplices: Dict[int, List[Simplex]] = {d: [] for d in range(max_dim + 1)}

    def _compute_distances(self) -> List[List[float]]:
        """计算所有点对的欧氏距离。"""
        dist = [[0.0] * self.n for _ in range(self.n)]
        for i in range(self.n):
            for j in range(i + 1, self.n):
                d = math.sqrt(sum((self.points[i][k] - self.points[j][k]) ** 2
                                  for k in range(len(self.points[i]))))
                dist[i][j] = d
                dist[j][i] = d
        return dist

    def build(self, max_radius: float) -> None:
        """构建 Vietoris-Rips 复形到指定半径。"""
        self.simplices[0] = [Simplex((i,), 0.0) for i in range(self.n)]
        edges = []
        for i in range(self.n):
            for j in range(i + 1, self.n):
                if self.distance_matrix[i][j] <= max_radius:
                    edges.append(Simplex((i, j), self.distance_matrix[i][j]))
        self.simplices[1] = edges
        for dim in range(2, self.max_dim + 1):
            candidates = []
            for simplex in self.simplices[dim - 1]:
                for v in range(self.n):
                    if v not in simplex.vertices:
                        new_vertices = simplex.vertices + (v,)
                        if all(tuple(sorted(new_vertices[:j] + new_vertices[j + 1:])) in [s.vertices for s in self.simplices[dim - 1]]
                               for j in range(len(new_vertices))):
                            max_edge = max(self.distance_matrix[new_vertices[i]][new_vertices[j]]
                                           for i in range(len(new_vertices))
                                           for j in range(i + 1, len(new_vertices)))
                            if max_edge <= max_radius:
                                candidates.append(Simplex(new_vertices, max_edge))
            self.simplices[dim] = candidates

    def betti_numbers(self) -> Dict[int, int]:
        """计算各维 Betti 数（简化版，基于欧拉示性数估算）。"""
        betti = {}
        for d in range(self.max_dim + 1):
            count = len(self.simplices.get(d, []))
            betti[d] = max(0, count - len(self.simplices.get(d + 1, [])))
        return betti

    def euler_characteristic(self) -> int:
        """计算欧拉示性数。"""
        chi = 0
        for d, simplices in self.simplices.items():
            chi += ((-1) ** d) * len(simplices)
        return chi

    def edge_count(self) -> int:
        """返回边数。"""
        return len(self.simplices.get(1, []))

    def triangle_count(self) -> int:
        """返回三角形数。"""
        return len(self.simplices.get(2, []))

    def connected_components(self) -> int:
        """估算连通分量数。"""
        parent = list(range(self.n))

        def find(x: int) -> int:
            if parent[x] != x:
                parent[x] = find(parent[x])
            return parent[x]

        def union(x: int, y: int) -> None:
            rx, ry = find(x), find(y)
            if rx != ry:
                parent[rx] = ry

        for edge in self.simplices.get(1, []):
            union(edge.vertices[0], edge.vertices[1])
        roots = set(find(i) for i in range(self.n))
        return len(roots)


class PersistentHomology:
    """持续同调分析器。"""

    def __init__(self, complex_builder: VietorisRipsComplex):
        self.complex = complex_builder
        self.barcodes: Dict[int, List[Tuple[float, float]]] = {}

    def compute_persistence(self, max_dim: int = 2) -> Dict[int, List[Tuple[float, float]]]:
        """计算持续条形码（简化配对算法）。"""
        for d in range(max_dim + 1):
            self.barcodes[d] = []
        all_simplices = []
        for dim, simplices in self.complex.simplices.items():
            all_simplices.extend(simplices)
        all_simplices.sort(key=lambda s: s.filtration)
        birth: Dict[Tuple[int, ...], float] = {}
        for simplex in all_simplices:
            if simplex.dim == 0:
                birth[simplex.vertices] = simplex.filtration
            else:
                faces = simplex.faces()
                if faces:
                    oldest = max((birth.get(f, 0.0), f) for f in faces)
                    if oldest[0] > 0:
                        self.barcodes[simplex.dim - 1].append((oldest[0], simplex.filtration))
                        birth.pop(oldest[1], None)
                    else:
                        birth[simplex.vertices] = simplex.filtration
        for vertices, b in birth.items():
            dim = len(vertices) - 1
            self.barcodes[dim].append((b, float('inf')))
        return self.barcodes

    def persistence_diagram(self, dim: int = 0) -> List[Tuple[float, float]]:
        """返回指定维数的持续图。"""
        return [(b, d if d != float('inf') else max(b * 2, b + 1.0))
                for b, d in self.barcodes.get(dim, [])]

    def persistence_statistics(self, dim: int = 0) -> Dict[str, float]:
        """计算持续时间的统计信息。"""
        intervals = [(d - b) for b, d in self.barcodes.get(dim, []) if d != float('inf')]
        if not intervals:
            return {"mean": 0.0, "max": 0.0, "count": 0}
        return {
            "mean": sum(intervals) / len(intervals),
            "max": max(intervals),
            "count": len(intervals),
        }

    def bottleneck_distance_approx(self, other_barcodes: List[Tuple[float, float]], dim: int = 0) -> float:
        """估算瓶颈距离。"""
        pairs1 = [(b, d) for b, d in self.barcodes.get(dim, []) if d != float('inf')]
        pairs2 = [(b, d) for b, d in other_barcodes if d != float('inf')]
        if not pairs1 or not pairs2:
            return 0.0
        max_dist = 0.0
        for b1, d1 in pairs1:
            min_pair_dist = min(max(abs(b1 - b2), abs(d1 - d2)) for b2, d2 in pairs2)
            max_dist = max(max_dist, min_pair_dist)
        return max_dist

    def significant_features(self, threshold: float = 0.1, dim: int = 0) -> List[Tuple[float, float]]:
        """提取显著持续特征。"""
        return [(b, d) for b, d in self.barcodes.get(dim, [])
                if d == float('inf') or (d - b) > threshold]
