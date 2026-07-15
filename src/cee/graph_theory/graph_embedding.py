"""
graph_embedding.py — 图嵌入引擎

实现随机游走嵌入 (DeepWalk 简化版)、Laplacian Eigenmaps、
node2vec 风格游走与图神经网络的初始特征构建。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class GraphEmbedding:
    """图嵌入引擎。"""

    def __init__(self, adjacency: List[List[float]]):
        self.adj = adjacency
        self.n = len(adjacency)
        self.degrees = [sum(row) for row in adjacency]
        self.embeddings: Dict[int, List[float]] = {}

    def laplacian_eigenmaps(self, dim: int = 2) -> List[List[float]]:
        """Laplacian Eigenmaps 嵌入。"""
        L = [[0.0] * self.n for _ in range(self.n)]
        for i in range(self.n):
            L[i][i] = self.degrees[i]
            for j in range(self.n):
                if i != j:
                    L[i][j] = -self.adj[i][j]

        eigvals = []
        vecs = []
        M = [row[:] for row in L]
        for d in range(dim + 1):
            vec = [random.random() for _ in range(self.n)]
            norm = math.sqrt(sum(v ** 2 for v in vec))
            vec = [v / norm for v in vec]
            for _ in range(100):
                new = [sum(M[i][j] * vec[j] for j in range(self.n)) for i in range(self.n)]
                norm = math.sqrt(sum(v ** 2 for v in new))
                vec = [v / norm for v in new]
            eigvals.append(sum(vec[i] * sum(M[i][j] * vec[j] for j in range(self.n)) for i in range(self.n)))
            vecs.append(vec)
            for i in range(self.n):
                for j in range(self.n):
                    M[i][j] -= eigvals[-1] * vec[i] * vec[j]

        embedding = [[vecs[d][i] for d in range(1, dim + 1)] for i in range(self.n)]
        return embedding

    def random_walk_embedding(self, dim: int = 2, walk_length: int = 10,
                              num_walks: int = 10, window: int = 2) -> List[List[float]]:
        """简化 DeepWalk 嵌入。"""
        walks = []
        for _ in range(num_walks):
            for start in range(self.n):
                walk = [start]
                current = start
                for _ in range(walk_length):
                    neighbors = [j for j in range(self.n) if self.adj[current][j] > 0]
                    if neighbors:
                        current = random.choice(neighbors)
                        walk.append(current)
                    else:
                        break
                walks.append(walk)

        cooccurrence: Dict[Tuple[int, int], float] = {}
        for walk in walks:
            for i, node in enumerate(walk):
                for j in range(max(0, i - window), min(len(walk), i + window + 1)):
                    if i != j:
                        pair = (node, walk[j])
                        cooccurrence[pair] = cooccurrence.get(pair, 0.0) + 1.0

        embedding = [[random.uniform(-0.1, 0.1) for _ in range(dim)] for _ in range(self.n)]
        lr = 0.01
        for _ in range(100):
            for (u, v), count in cooccurrence.items():
                dot = sum(embedding[u][d] * embedding[v][d] for d in range(dim))
                sigmoid = 1.0 / (1.0 + math.exp(-dot))
                grad = lr * (count / 10.0 - sigmoid)
                for d in range(dim):
                    embedding[u][d] += grad * embedding[v][d]
                    embedding[v][d] += grad * embedding[u][d]
        return embedding

    def node2vec_walk(self, start: int, length: int, p: float = 1.0, q: float = 1.0) -> List[int]:
        """node2vec 偏置随机游走。"""
        walk = [start]
        if length <= 1:
            return walk
        neighbors = [j for j in range(self.n) if self.adj[start][j] > 0]
        if not neighbors:
            return walk
        walk.append(random.choice(neighbors))
        for _ in range(length - 2):
            current = walk[-1]
            prev = walk[-2]
            candidates = [j for j in range(self.n) if self.adj[current][j] > 0]
            if not candidates:
                break
            weights = []
            for candidate in candidates:
                if candidate == prev:
                    weights.append(1.0 / p)
                elif self.adj[prev][candidate] > 0:
                    weights.append(1.0)
                else:
                    weights.append(1.0 / q)
            total = sum(weights)
            r = random.random() * total
            cum = 0.0
            for candidate, w in zip(candidates, weights):
                cum += w
                if r <= cum:
                    walk.append(candidate)
                    break
        return walk

    def structural_equivalence(self, dim: int = 2) -> List[List[float]]:
        """基于结构等价的简单嵌入。"""
        features = []
        for i in range(self.n):
            ego_vector = [1.0 if self.adj[i][j] > 0 else 0.0 for j in range(self.n)]
            features.append(ego_vector)
        embedding = []
        for vec in features:
            emb = [sum(vec[j] * math.sin(j * math.pi / self.n) for j in range(self.n))]
            emb.append(sum(vec[j] * math.cos(j * math.pi / self.n) for j in range(self.n)))
            embedding.append(emb)
        return embedding

    def embedding_distance(self, emb1: List[float], emb2: List[float]) -> float:
        """嵌入空间欧氏距离。"""
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(emb1, emb2)))

    def link_prediction_score(self, embedding: List[List[float]], i: int, j: int) -> float:
        """基于嵌入的点积链接预测分数。"""
        return sum(embedding[i][d] * embedding[j][d] for d in range(len(embedding[i])))

    def k_nearest_neighbors(self, embedding: List[List[float]], node: int, k: int = 5) -> List[Tuple[int, float]]:
        """在嵌入空间中找到 k 近邻。"""
        distances = []
        for i in range(self.n):
            if i != node:
                dist = self.embedding_distance(embedding[node], embedding[i])
                distances.append((i, dist))
        distances.sort(key=lambda x: x[1])
        return distances[:k]

    def visualize_2d_projection(self, embedding: List[List[float]]) -> List[Tuple[float, float]]:
        """提取 2D 投影用于可视化。"""
        return [(e[0], e[1]) if len(e) >= 2 else (e[0], 0.0) for e in embedding]

    def cosine_similarity_matrix(self, embedding: List[List[float]]) -> List[List[float]]:
        """计算嵌入向量的余弦相似度矩阵。"""
        sim = [[0.0] * self.n for _ in range(self.n)]
        for i in range(self.n):
            for j in range(self.n):
                dot = sum(embedding[i][d] * embedding[j][d] for d in range(len(embedding[i])))
                norm_i = math.sqrt(sum(e ** 2 for e in embedding[i]))
                norm_j = math.sqrt(sum(e ** 2 for e in embedding[j]))
                sim[i][j] = dot / (norm_i * norm_j) if norm_i > 0 and norm_j > 0 else 0.0
        return sim

    def reconstruct_adjacency(self, embedding: List[List[float]], threshold: float = 0.5) -> List[List[float]]:
        """从嵌入重构邻接矩阵。"""
        recon = [[0.0] * self.n for _ in range(self.n)]
        for i in range(self.n):
            for j in range(i + 1, self.n):
                score = self.link_prediction_score(embedding, i, j)
                if score > threshold:
                    recon[i][j] = recon[j][i] = 1.0
        return recon
