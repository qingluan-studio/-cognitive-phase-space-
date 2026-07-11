"""
认知涌现引擎 — 知识关联图谱
=============================
为内置知识库条目构建关联网络，支持联想式推理

功能:
1. 关联发现: "涌现" 与 "混沌边缘" 有关系 → 回答时自动扩展
2. 语义距离: 计算两个知识条目的"认知距离"
3. 知识链: 从起点概念沿关联边到达目标概念的最短路径
4. 热点激活: 根据当前话题激活周边知识节点
"""

from __future__ import annotations

import json
from pathlib import Path

from .knowledge_store import STORAGE_DIR

GRAPH_FILE = STORAGE_DIR / "knowledge_graph.json"

RELATIONS = {
    "认知涌现": {
        "混沌边缘": ("前提条件", 0.9),
        "认知几何": ("理论基础", 0.85),
        "T6 认知不变量": ("量化工具", 0.8),
        "T5 反事实生长": ("应用场景", 0.7),
    },
    "认知几何": {
        "T6 认知不变量": ("核心指标", 0.95),
        "T1 认知同构": ("理论基础", 0.8),
        "T2 超图坍缩": ("多视角分析", 0.75),
        "T3 测地线导航": ("导航路径", 0.75),
    },
    "混沌边缘": {
        "认知涌现": ("产物", 0.9),
        "T5 反事实生长": ("演化环境", 0.85),
        "T6 认知不变量": ("检测指标", 0.7),
    },
    "T1 认知同构": {
        "T2 超图坍缩": ("互补操作", 0.8),
        "认知几何": ("数学框架", 0.8),
    },
    "T2 超图坍缩": {
        "T1 认知同构": ("互补操作", 0.8),
        "T4 知识结晶": ("后续步骤", 0.7),
    },
    "T3 测地线导航": {
        "T2 超图坍缩": ("路径规划", 0.7),
        "认知几何": ("数学基础", 0.85),
    },
    "T4 知识结晶": {
        "认知涌现": ("目标产物", 0.7),
        "T2 超图坍缩": ("多视角输入", 0.65),
    },
    "T5 反事实生长": {
        "混沌边缘": ("最优区间", 0.85),
        "认知涌现": ("潜在产物", 0.75),
        "T6 认知不变量": ("适应度评估", 0.8),
    },
    "T6 认知不变量": {
        "认知几何": ("评估对象", 0.95),
        "认知涌现": ("检测目标", 0.85),
    },
    "Python": {
        "深度学习": ("AI框架生态", 0.8),
        "AI编程代理": ("实现语言", 0.75),
        "项目宪章": ("开发规范", 0.5),
    },
    "深度学习": {
        "Python": ("首选语言", 0.8),
        "AI编程代理": ("技术基础", 0.75),
    },
    "AI编程代理": {
        "Python": ("常用语言", 0.75),
        "深度学习": ("底层模型", 0.75),
        "敏捷开发": ("开发模式", 0.6),
    },
    "第一性原理": {
        "项目宪章": ("思维基础", 0.7),
        "认知涌现": ("思考路径", 0.6),
    },
    "敏捷开发": {
        "项目宪章": ("开发原则互补", 0.65),
        "AI编程代理": ("协同工作", 0.6),
    },
    "项目宪章": {
        "第一性原理": ("指导思想", 0.7),
        "认知几何": ("抽象框架", 0.5),
    },
}


class KnowledgeGraph:
    """
    知识关联图谱

    用法:
        kg = KnowledgeGraph()
        related = kg.expand("认知涌现")
        # -> [("混沌边缘", "前提条件", 0.9), ("认知几何", "理论基础", 0.85), ...]
    """

    def __init__(self):
        self._graph: dict[str, dict[str, tuple[str, float]]] = dict(RELATIONS)
        self._load()

    def expand(self, keyword: str, max_nodes: int = 5) -> list[tuple[str, str, float]]:
        """展开一个知识节点，返回关联节点列表"""
        keyword = self._normalize(keyword)
        if keyword not in self._graph:
            return []
        neighbors = sorted(self._graph[keyword].items(),
                           key=lambda x: x[1][1], reverse=True)
        return [(k, v[0], v[1]) for k, v in neighbors[:max_nodes]]

    def bidirectional_expand(self, keyword: str, max_nodes: int = 5) -> list[tuple[str, str, str, float]]:
        """
        双向展开: 同时查找 keyword->X 和 X->keyword 的关系
        返回: [(related_node, relation_name, direction, strength), ...]
        """
        keyword = self._normalize(keyword)
        results = []

        if keyword in self._graph:
            for node, (rel, weight) in self._graph[keyword].items():
                results.append((node, rel, "out", weight))

        for node, neighbors in self._graph.items():
            if keyword in neighbors:
                rel, weight = neighbors[keyword]
                results.append((node, rel, "in", weight))

        results.sort(key=lambda x: x[3], reverse=True)
        return results[:max_nodes]

    def find_path(self, start: str, end: str, max_depth: int = 4) -> list[str] | None:
        """BFS 最短路径"""
        start = self._normalize(start)
        end = self._normalize(end)
        if start == end:
            return [start]

        from collections import deque
        queue = deque([(start, [start])])
        visited = {start}

        while queue:
            node, path = queue.popleft()
            if len(path) > max_depth:
                continue
            if node in self._graph:
                for neighbor in self._graph[node]:
                    if neighbor == end:
                        return path + [neighbor]
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append((neighbor, path + [neighbor]))
        return None

    def hot_activation(self, seed_keywords: list[str], spread: int = 2) -> list[tuple[str, float]]:
        """
        热点激活: 从种子词出发，沿关联边传播激活值
        传播次数=spread，每步衰减50%
        """
        activations: dict[str, float] = {}
        for kw in seed_keywords:
            kw = self._normalize(kw)
            activations[kw] = activations.get(kw, 0.0) + 1.0

        for _ in range(spread):
            new_activations: dict[str, float] = dict(activations)
            for node, val in activations.items():
                if node in self._graph:
                    for neighbor, (_, weight) in self._graph[node].items():
                        spread_val = val * weight * 0.5
                        new_activations[neighbor] = new_activations.get(neighbor, 0.0) + spread_val
            activations = new_activations

        seed_set = {self._normalize(k) for k in seed_keywords}
        results = [(k, round(v, 2)) for k, v in activations.items()
                   if k not in seed_set and v >= 0.1]
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:8]

    def get_enrichment(self, keyword: str) -> str:
        """生成某知识点的关联扩充文本，注入回复"""
        keyword = self._normalize(keyword)
        expanded = self.expand(keyword, max_nodes=3)
        if not expanded:
            return ""

        lines = [f"【关联知识 — {keyword}】"]
        for node, rel, weight in expanded:
            if weight >= 0.7:
                lines.append(f"- {node}: {rel} (关联度: {weight:.0%})")

        return "\n".join(lines) if len(lines) > 1 else ""

    def add_relation(self, source: str, target: str, relation: str, weight: float = 0.5):
        source = self._normalize(source)
        target = self._normalize(target)
        if source not in self._graph:
            self._graph[source] = {}
        self._graph[source][target] = (relation, min(max(weight, 0.1), 1.0))
        self._save()

    def _normalize(self, keyword: str) -> str:
        """标准化关键词"""
        kw = keyword.strip()
        for k in self._graph:
            if k.replace(" ", "").lower() in kw.replace(" ", "").lower():
                return k
        return kw

    def _load(self):
        if GRAPH_FILE.exists():
            try:
                with open(GRAPH_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for k, v in data.items():
                    self._graph[k] = {}
                    for target, (rel, w) in v.items():
                        if isinstance((rel, w), tuple):
                            self._graph[k][target] = (rel, w)
                        else:
                            self._graph[k][target] = (str(rel), float(w))
            except Exception:
                pass

    def _save(self):
        try:
            data = {}
            for k, v in self._graph.items():
                data[k] = {target: list(info) for target, info in v.items()}
            with open(GRAPH_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def stats(self) -> dict:
        return {
            "nodes": len(self._graph),
            "edges": sum(len(v) for v in self._graph.values()),
            "avg_degree": round(sum(len(v) for v in self._graph.values()) / max(1, len(self._graph)), 1),
        }
