"""
mapper.py — Mapper 算法引擎

实现基于滤子函数和覆盖的拓扑 Mapper 构造，
支持聚类、图构建与网络分析。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Set, Callable, Optional


class MapperNode:
    """Mapper 图节点。"""

    def __init__(self, node_id: int, points: List[int], level: Tuple[float, float]):
        self.node_id = node_id
        self.points = set(points)
        self.level = level
        self.neighbors: Set[int] = set()

    def overlap(self, other: MapperNode) -> bool:
        """判断两个节点是否有交集。"""
        return len(self.points & other.points) > 0

    def size(self) -> int:
        """节点包含的点数。"""
        return len(self.points)

    def add_neighbor(self, node_id: int) -> None:
        """添加邻居。"""
        self.neighbors.add(node_id)

    def to_dict(self) -> Dict:
        """序列化为字典。"""
        return {
            "id": self.node_id,
            "size": self.size(),
            "level": self.level,
            "neighbors": list(self.neighbors),
        }


class MapperGraph:
    """Mapper 图结构。"""

    def __init__(self):
        self.nodes: Dict[int, MapperNode] = {}
        self.edges: Set[Tuple[int, int]] = set()
        self.next_id = 0

    def add_node(self, points: List[int], level: Tuple[float, float]) -> int:
        """添加节点并返回 ID。"""
        node_id = self.next_id
        self.next_id += 1
        self.nodes[node_id] = MapperNode(node_id, points, level)
        return node_id

    def add_edge(self, u: int, v: int) -> None:
        """添加边。"""
        if u != v and u in self.nodes and v in self.nodes:
            self.edges.add((min(u, v), max(u, v)))
            self.nodes[u].add_neighbor(v)
            self.nodes[v].add_neighbor(u)

    def connected_components(self) -> List[Set[int]]:
        """计算连通分量。"""
        visited: Set[int] = set()
        components = []
        for node_id in self.nodes:
            if node_id not in visited:
                comp = set()
                stack = [node_id]
                while stack:
                    cur = stack.pop()
                    if cur in visited:
                        continue
                    visited.add(cur)
                    comp.add(cur)
                    stack.extend(self.nodes[cur].neighbors - visited)
                components.append(comp)
        return components

    def node_degrees(self) -> Dict[int, int]:
        """返回各节点度数。"""
        return {nid: len(node.neighbors) for nid, node in self.nodes.items()}

    def graph_stats(self) -> Dict[str, float]:
        """返回图统计信息。"""
        degrees = list(self.node_degrees().values())
        if not degrees:
            return {}
        return {
            "num_nodes": len(self.nodes),
            "num_edges": len(self.edges),
            "avg_degree": sum(degrees) / len(degrees),
            "max_degree": max(degrees),
            "min_degree": min(degrees),
        }

    def filter_nodes_by_size(self, min_size: int = 1) -> List[int]:
        """按大小过滤节点。"""
        return [nid for nid, node in self.nodes.items() if node.size() >= min_size]

    def get_cluster_sizes(self) -> List[int]:
        """返回所有节点大小列表。"""
        return [node.size() for node in self.nodes.values()]


class MapperEngine:
    """Mapper 算法主引擎。"""

    def __init__(self, filter_func: Callable[[List[float]], float],
                 clusterer: Optional[Callable[[List[int]], List[List[int]]]] = None):
        self.filter_func = filter_func
        self.clusterer = clusterer or self._default_clusterer

    def _default_clusterer(self, indices: List[int]) -> List[List[int]]:
        """默认聚类：基于滤子值的分箱。"""
        return [indices]

    def fit(self, data: List[List[float]],
            cover_intervals: List[Tuple[float, float]],
            overlap: float = 0.2) -> MapperGraph:
        """构建 Mapper 图。"""
        graph = MapperGraph()
        filters = [self.filter_func(point) for point in data]
        extended_intervals = []
        for lo, hi in cover_intervals:
            span = hi - lo
            ext_lo = lo - overlap * span
            ext_hi = hi + overlap * span
            extended_intervals.append((ext_lo, ext_hi))

        level_nodes: Dict[int, List[int]] = {}
        for level_idx, (lo, hi) in enumerate(extended_intervals):
            level_nodes[level_idx] = []
            cover_points = [i for i, f in enumerate(filters) if lo <= f <= hi]
            clusters = self.clusterer(cover_points)
            for cluster in clusters:
                if cluster:
                    node_id = graph.add_node(cluster, (lo, hi))
                    level_nodes[level_idx].append(node_id)

        for level_idx, nodes in level_nodes.items():
            for i, u in enumerate(nodes):
                for v in nodes[i + 1:]:
                    if graph.nodes[u].overlap(graph.nodes[v]):
                        graph.add_edge(u, v)
            if level_idx + 1 in level_nodes:
                for u in nodes:
                    for v in level_nodes[level_idx + 1]:
                        if graph.nodes[u].overlap(graph.nodes[v]):
                            graph.add_edge(u, v)

        return graph

    def lens_projection(self, data: List[List[float]],
                        axis: int = 0) -> List[float]:
        """使用坐标轴投影作为滤子函数。"""
        return [point[axis] for point in data]

    def eccentricity_lens(self, data: List[List[float]], p: int = 2) -> List[float]:
        """离心率滤子。"""
        n = len(data)
        ecc = []
        for i in range(n):
            total = sum(math.sqrt(sum((data[i][k] - data[j][k]) ** 2 for k in range(len(data[i])))) ** p
                        for j in range(n)) / n
            ecc.append(total ** (1.0 / p))
        return ecc

    def density_lens(self, data: List[List[float]], sigma: float = 1.0) -> List[float]:
        """高斯密度估计滤子。"""
        densities = []
        for i in range(len(data)):
            density = sum(math.exp(-sum((data[i][k] - data[j][k]) ** 2 for k in range(len(data[i]))) / (2.0 * sigma ** 2))
                          for j in range(len(data)))
            densities.append(density)
        return densities

    def create_cover(self, values: List[float], num_intervals: int = 10) -> List[Tuple[float, float]]:
        """基于滤子值范围创建均匀覆盖。"""
        min_v = min(values)
        max_v = max(values)
        span = (max_v - min_v) / num_intervals
        return [(min_v + i * span, min_v + (i + 1) * span) for i in range(num_intervals)]

    def adaptive_cover(self, values: List[float], num_intervals: int = 10) -> List[Tuple[float, float]]:
        """基于分位数的自适应覆盖。"""
        sorted_vals = sorted(values)
        n = len(sorted_vals)
        intervals = []
        for i in range(num_intervals):
            start_idx = int(i * n / num_intervals)
            end_idx = int((i + 1) * n / num_intervals)
            intervals.append((sorted_vals[start_idx], sorted_vals[min(end_idx, n - 1)]))
        return intervals

    def merge_small_nodes(self, graph: MapperGraph, min_size: int = 2) -> MapperGraph:
        """合并过小节点到最近的大节点。"""
        small_nodes = [nid for nid, node in graph.nodes.items() if node.size() < min_size]
        for nid in small_nodes:
            if nid not in graph.nodes:
                continue
            node = graph.nodes[nid]
            best_neighbor = None
            best_overlap = 0
            for neighbor_id in list(node.neighbors):
                if neighbor_id in graph.nodes:
                    overlap = len(node.points & graph.nodes[neighbor_id].points)
                    if overlap > best_overlap:
                        best_overlap = overlap
                        best_neighbor = neighbor_id
            if best_neighbor is not None:
                graph.nodes[best_neighbor].points |= node.points
                del graph.nodes[nid]
        graph.edges = {(min(u, v), max(u, v)) for u, v in graph.edges
                       if u in graph.nodes and v in graph.nodes}
        return graph
