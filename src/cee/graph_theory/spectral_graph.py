"""
spectral_graph.py — 谱图理论引擎

实现图 Laplacian 构建、特征值计算、
谱聚类与图连通性分析。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class SpectralGraph:
    """谱图分析引擎。"""

    def __init__(self, adjacency: List[List[float]]):
        self.adj = adjacency
        self.n = len(adjacency)
        self.laplacian = self._build_laplacian()
        self.degree_matrix = self._build_degree_matrix()

    def _build_degree_matrix(self) -> List[List[float]]:
        """构建度矩阵。"""
        D = [[0.0] * self.n for _ in range(self.n)]
        for i in range(self.n):
            D[i][i] = sum(self.adj[i])
        return D

    def _build_laplacian(self) -> List[List[float]]:
        """构建非归一化 Laplacian L = D - A。"""
        L = [[0.0] * self.n for _ in range(self.n)]
        for i in range(self.n):
            degree = sum(self.adj[i])
            L[i][i] = degree
            for j in range(self.n):
                if i != j:
                    L[i][j] = -self.adj[i][j]
        return L

    def normalized_laplacian(self) -> List[List[float]]:
        """构建对称归一化 Laplacian L_sym = D^{-1/2} L D^{-1/2}。"""
        L_sym = [[0.0] * self.n for _ in range(self.n)]
        degrees = [sum(self.adj[i]) for i in range(self.n)]
        for i in range(self.n):
            for j in range(self.n):
                if degrees[i] > 0 and degrees[j] > 0:
                    L_sym[i][j] = self.laplacian[i][j] / math.sqrt(degrees[i] * degrees[j])
        return L_sym

    def random_walk_laplacian(self) -> List[List[float]]:
        """构建随机游走 Laplacian L_rw = D^{-1} L。"""
        L_rw = [[0.0] * self.n for _ in range(self.n)]
        degrees = [sum(self.adj[i]) for i in range(self.n)]
        for i in range(self.n):
            for j in range(self.n):
                if degrees[i] > 0:
                    L_rw[i][j] = self.laplacian[i][j] / degrees[i]
        return L_rw

    def power_iteration_eigenvalues(self, matrix: List[List[float]], k: int = 3, steps: int = 100) -> List[float]:
        """幂迭代近似前 k 个特征值。"""
        eigenvalues = []
        M = [row[:] for row in matrix]
        for _ in range(k):
            vec = [random.random() for _ in range(self.n)]
            norm = math.sqrt(sum(v ** 2 for v in vec))
            vec = [v / norm for v in vec]
            for _ in range(steps):
                new = [sum(M[i][j] * vec[j] for j in range(self.n)) for i in range(self.n)]
                norm = math.sqrt(sum(v ** 2 for v in new))
                vec = [v / norm for v in new]
            eig = sum(vec[i] * sum(M[i][j] * vec[j] for j in range(self.n)) for i in range(self.n))
            eigenvalues.append(eig)
            for i in range(self.n):
                for j in range(self.n):
                    M[i][j] -= eig * vec[i] * vec[j]
        return eigenvalues

    def fiedler_value(self) -> float:
        """估算 Fiedler 值（代数连通度）。"""
        eigvals = self.power_iteration_eigenvalues(self.laplacian, k=2)
        return eigvals[1] if len(eigvals) > 1 else 0.0

    def spectral_gap(self) -> float:
        """计算谱间隙。"""
        eigvals = self.power_iteration_eigenvalues(self.laplacian, k=2)
        return eigvals[1] - eigvals[0] if len(eigvals) > 1 else 0.0

    def effective_resistance(self, i: int, j: int) -> float:
        """估算有效电阻（使用伪逆近似）。"""
        if i == j:
            return 0.0
        L_pseudo = self._pseudoinverse_approx(self.laplacian)
        return L_pseudo[i][i] + L_pseudo[j][j] - 2.0 * L_pseudo[i][j]

    def _pseudoinverse_approx(self, M: List[List[float]]) -> List[List[float]]:
        """通过截断特征展开近似 Moore-Penrose 伪逆。"""
        n = len(M)
        I = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
        alpha = 0.01
        pseudo = [[0.0] * n for _ in range(n)]
        current = [row[:] for row in I]
        for _ in range(50):
            current = [[current[i][j] + alpha * (I[i][j] - sum(M[i][k] * current[k][j] for k in range(n)))
                        for j in range(n)] for i in range(n)]
        for i in range(n):
            for j in range(n):
                pseudo[i][j] = current[i][j] - sum(current[i][k] for k in range(n)) / n - sum(current[l][j] for l in range(n)) / n + sum(sum(current[a][b] for b in range(n)) for a in range(n)) / (n * n)
        return pseudo

    def spectral_clustering(self, k: int = 2) -> List[int]:
        """基于归一化 Laplacian 的谱聚类（简化 k-means）。"""
        L_sym = self.normalized_laplacian()
        eigvals = self.power_iteration_eigenvalues(L_sym, k=k)
        vecs = []
        M = [row[:] for row in L_sym]
        for idx in range(k):
            vec = [random.random() for _ in range(self.n)]
            norm = math.sqrt(sum(v ** 2 for v in vec))
            vec = [v / norm for v in vec]
            for _ in range(100):
                new = [sum(M[i][j] * vec[j] for j in range(self.n)) for i in range(self.n)]
                norm = math.sqrt(sum(v ** 2 for v in new))
                vec = [v / norm for v in new]
            vecs.append(vec)
            for i in range(self.n):
                for j in range(self.n):
                    M[i][j] -= (eigvals[idx] if idx < len(eigvals) else 0) * vec[i] * vec[j]

        embedding = [[vecs[d][i] for d in range(k)] for i in range(self.n)]
        centroids = [embedding[i] for i in random.sample(range(self.n), k)]
        labels = [0] * self.n
        for _ in range(20):
            new_labels = []
            for point in embedding:
                distances = [math.sqrt(sum((point[d] - centroids[c][d]) ** 2 for d in range(k))) for c in range(k)]
                new_labels.append(distances.index(min(distances)))
            labels = new_labels
            for c in range(k):
                cluster_points = [embedding[i] for i in range(self.n) if labels[i] == c]
                if cluster_points:
                    centroids[c] = [sum(p[d] for p in cluster_points) / len(cluster_points) for d in range(k)]
        return labels

    def cheeger_constant_estimate(self) -> float:
        """估算 Cheeger 常数下界。"""
        fiedler = self.fiedler_value()
        return math.sqrt(2.0 * fiedler) if fiedler > 0 else 0.0

    def heat_kernel_trace(self, t: float = 1.0) -> float:
        """估算热核迹。"""
        eigvals = self.power_iteration_eigenvalues(self.laplacian, k=min(5, self.n))
        return sum(math.exp(-t * ev) for ev in eigvals)

    def von_neumann_graph_entropy(self) -> float:
        """计算图的 von Neumann 熵。"""
        degrees = [sum(self.adj[i]) for i in range(self.n)]
        total = sum(degrees)
        if total == 0:
            return 0.0
        entropy = 0.0
        for d in degrees:
            p = d / total
            if p > 0:
                entropy -= p * math.log(p)
        return entropy
