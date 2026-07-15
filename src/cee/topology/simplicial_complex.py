"""
simplicial_complex.py — 单纯复形引擎

实现抽象单纯复形的构建、边界算子、同调群计算接口、
以及星形、闭包与链接操作。
"""

from __future__ import annotations

import math
from typing import List, Tuple, Dict, Set, Optional


class SimplicialComplex:
    """抽象单纯复形。"""

    def __init__(self):
        self.simplices: Dict[int, Set[Tuple[int, ...]]] = {}
        self.max_dim = -1

    def add_simplex(self, vertices: Tuple[int, ...]) -> None:
        """添加单纯形及其所有面。"""
        simplex = tuple(sorted(vertices))
        dim = len(simplex) - 1
        if dim not in self.simplices:
            self.simplices[dim] = set()
        self.simplices[dim].add(simplex)
        self.max_dim = max(self.max_dim, dim)
        if dim > 0:
            for i in range(len(simplex)):
                face = tuple(v for j, v in enumerate(simplex) if j != i)
                self.add_simplex(face)

    def remove_simplex(self, vertices: Tuple[int, ...]) -> None:
        """移除单纯形。"""
        simplex = tuple(sorted(vertices))
        dim = len(simplex) - 1
        if dim in self.simplices and simplex in self.simplices[dim]:
            self.simplices[dim].remove(simplex)

    def contains(self, vertices: Tuple[int, ...]) -> bool:
        """判断复形是否包含指定单纯形。"""
        simplex = tuple(sorted(vertices))
        dim = len(simplex) - 1
        return dim in self.simplices and simplex in self.simplices[dim]

    def boundary_operator(self, dim: int) -> Dict[Tuple[int, ...], List[Tuple[int, Tuple[int, ...]]]]:
        """构建第 dim 维边界算子。"""
        if dim <= 0 or dim not in self.simplices:
            return {}
        boundary = {}
        for simplex in self.simplices[dim]:
            faces = []
            for i in range(len(simplex)):
                face = tuple(v for j, v in enumerate(simplex) if j != i)
                sign = 1 if i % 2 == 0 else -1
                faces.append((sign, face))
            boundary[simplex] = faces
        return boundary

    def euler_characteristic(self) -> int:
        """计算欧拉示性数。"""
        chi = 0
        for dim, simplices in self.simplices.items():
            chi += ((-1) ** dim) * len(simplices)
        return chi

    def f_vector(self) -> List[int]:
        """返回 f-向量。"""
        return [len(self.simplices.get(d, set())) for d in range(self.max_dim + 1)]

    def betti_number_approx(self, dim: int) -> int:
        """近似 Betti 数。"""
        n_simplices = len(self.simplices.get(dim, set()))
        n_boundary = len(self.simplices.get(dim + 1, set())) if dim + 1 in self.simplices else 0
        return max(0, n_simplices - n_boundary)

    def star(self, vertex: int) -> Set[Tuple[int, ...]]:
        """计算顶点的开星形。"""
        result = set()
        for dim, simplices in self.simplices.items():
            for simplex in simplices:
                if vertex in simplex:
                    result.add(simplex)
        return result

    def closure(self, subset: Set[Tuple[int, ...]]) -> Set[Tuple[int, ...]]:
        """计算子集的闭包（包含所有面）。"""
        result = set(subset)
        for simplex in subset:
            dim = len(simplex) - 1
            if dim > 0:
                for i in range(len(simplex)):
                    face = tuple(v for j, v in enumerate(simplex) if j != i)
                    result.add(face)
                    result |= self.closure({face})
        return result

    def link(self, vertex: int) -> Set[Tuple[int, ...]]:
        """计算顶点的链接。"""
        star_set = self.star(vertex)
        link_set = set()
        for simplex in star_set:
            if vertex in simplex:
                reduced = tuple(v for v in simplex if v != vertex)
                if reduced:
                    link_set.add(reduced)
        return link_set

    def is_pure(self, dim: int) -> bool:
        """判断复形是否为 dim 维纯复形。"""
        if dim not in self.simplices:
            return False
        for simplex in self.simplices[dim]:
            if len(simplex) - 1 != dim:
                return False
        for d in range(dim):
            if d in self.simplices:
                for simplex in self.simplices[d]:
                    contained = False
                    for higher in self.simplices.get(dim, set()):
                        if all(v in higher for v in simplex):
                            contained = True
                            break
                    if not contained:
                        return False
        return True

    def dimension(self) -> int:
        """返回复形维数。"""
        return self.max_dim

    def vertex_count(self) -> int:
        """返回顶点数。"""
        return len(self.simplices.get(0, set()))

    def edge_count(self) -> int:
        """返回边数。"""
        return len(self.simplices.get(1, set()))

    def facet_list(self) -> Set[Tuple[int, ...]]:
        """返回所有面（不被其他单纯形包含的极大单纯形）。"""
        facets = set()
        for dim in range(self.max_dim, -1, -1):
            for simplex in self.simplices.get(dim, set()):
                is_facet = True
                for higher_dim in range(dim + 1, self.max_dim + 1):
                    for higher in self.simplices.get(higher_dim, set()):
                        if all(v in higher for v in simplex):
                            is_facet = False
                            break
                    if not is_facet:
                        break
                if is_facet:
                    facets.add(simplex)
        return facets

    def barycentric_subdivision(self) -> SimplicialComplex:
        """重心细分（简化版）。"""
        new_complex = SimplicialComplex()
        simplex_list = []
        for dim, simplices in self.simplices.items():
            simplex_list.extend(simplices)
        for i, simplex in enumerate(simplex_list):
            new_complex.add_simplex((i,))
        for i, s1 in enumerate(simplex_list):
            for j, s2 in enumerate(simplex_list):
                if i < j and all(v in s2 for v in s1):
                    new_complex.add_simplex((i, j))
        return new_complex

    @staticmethod
    def n_simplex(n: int) -> SimplicialComplex:
        """构造标准 n-单纯形。"""
        sc = SimplicialComplex()
        sc.add_simplex(tuple(range(n + 1)))
        return sc

    @staticmethod
    def sphere_triangulation(n: int) -> SimplicialComplex:
        """构造 n-球面的简化三角剖分。"""
        sc = SimplicialComplex()
        vertices = tuple(range(n + 2))
        for i in range(n + 2):
            face = tuple(v for j, v in enumerate(vertices) if j != i)
            sc.add_simplex(face)
        return sc
