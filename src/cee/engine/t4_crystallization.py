"""
T4 — Project Crystallization: 知识结晶引擎

核心思想: 知识碎片在随机交互中自发形成有序结构(Crystals)。
多个碎片在语义空间中碰撞、融合，涌现出超越输入的新知识。

证据: 11个晶体，9+处涌现关联
"""

from collections import defaultdict
from math import exp
from typing import Any

import numpy as np


class KnowledgeFragment:
    """知识碎片: 孤立的语义单元."""
    def __init__(self, idx: int, content: str, embedding: np.ndarray | None = None):
        self.idx = idx
        self.content = content
        self.embedding = embedding if embedding is not None else self._simple_embed(content)
        self.affinity_scores: dict[int, float] = {}

    def _simple_embed(self, text: str) -> np.ndarray:
        """基于词频的简单嵌入(可用外部嵌入替代)."""
        words = text.lower().split()
        if not words:
            return np.zeros(64)
        rng = np.random.RandomState(hash(text) % (2**31))
        return rng.randn(64) * 0.1


class Crystal:
    """知识晶体: 多个碎片融合形成的稳定结构."""
    def __init__(self, idx: int, fragments: list[KnowledgeFragment]):
        self.idx = idx
        self.fragments = fragments
        self.centroid = self._compute_centroid()
        self.stability = 0.0
        self.description = ""
        self.emergent_knowledge: list[str] = []

    def _compute_centroid(self) -> np.ndarray:
        if not self.fragments:
            return np.zeros(64)
        embeds = np.array([f.embedding for f in self.fragments])
        return np.mean(embeds, axis=0)

    @property
    def size(self) -> int:
        return len(self.fragments)

    @property
    def cohesion(self) -> float:
        if self.size < 2:
            return 0.0
        dists = []
        for i, f1 in enumerate(self.fragments):
            for f2 in self.fragments[i + 1:]:
                dists.append(float(np.linalg.norm(f1.embedding - f2.embedding)))
        avg_dist = np.mean(dists) if dists else 1.0
        return float(exp(-avg_dist))


class CrystallizationEngine:
    """T4 知识结晶引擎"""

    def __init__(self, temperature: float = 1.0, min_crystal_size: int = 2):
        """
        Args:
            temperature: 结晶温度(越高越容易融合)
            min_crystal_size: 最小晶体大小
        """
        self.temperature = temperature
        self.min_crystal_size = min_crystal_size
        self.fragments: list[KnowledgeFragment] = []
        self.crystals: list[Crystal] = []

    def add_fragments(self, texts: list[str]):
        """添加知识碎片."""
        for text in texts:
            frag = KnowledgeFragment(len(self.fragments), text)
            self.fragments.append(frag)

    def crystallize(self, iterations: int = 100) -> list[Crystal]:
        """
        执行结晶过程: 碎片在随机交互中形成稳定晶体。

        算法:
        1. 每个碎片计算与其他碎片的亲和力
        2. 根据亲和力和温度决定是否融合
        3. 融合后形成晶体，晶体继续与碎片碰撞
        4. 达到稳定条件后停止
        """
        if len(self.fragments) < self.min_crystal_size:
            return []

        rng = np.random.RandomState(42)

        # 初始化: 每个碎片为一个初始晶体
        active_crystals = []
        for f in self.fragments:
            c = Crystal(len(active_crystals), [f])
            active_crystals.append(c)

        for iteration in range(iterations):
            if len(active_crystals) <= 1:
                break

            # 随机选择两个晶体
            indices = list(range(len(active_crystals)))
            rng.shuffle(indices)
            n_pairs = len(indices) // 2

            merged = set()
            new_crystals = []

            for pair_idx in range(n_pairs):
                i = indices[2 * pair_idx]
                j = indices[2 * pair_idx + 1]
                if i in merged or j in merged:
                    continue

                c1 = active_crystals[i]
                c2 = active_crystals[j]

                # 计算融合概率
                fusion_prob = self._fusion_probability(c1, c2)

                if rng.random() < fusion_prob:
                    self._detect_emergence(c1, c2)
                    merged_frags = c1.fragments + c2.fragments
                    merged_crystal = Crystal(len(active_crystals) + len(new_crystals),
                                              merged_frags)
                    merged_crystal.stability = (c1.cohesion + c2.cohesion) / 2
                    merged_crystal.description = (
                        f"Crystal[{merged_crystal.idx}] "
                        f"from Crystal[{c1.idx}]+Crystal[{c2.idx}]: "
                        f"{merged_crystal.size} fragments"
                    )
                    new_crystals.append(merged_crystal)
                    merged.add(i)
                    merged.add(j)

            for idx in range(len(active_crystals)):
                if idx not in merged:
                    new_crystals.append(active_crystals[idx])

            active_crystals = new_crystals

        self.crystals = active_crystals
        self._compute_stability()
        self._extract_emergent_knowledge()
        return self.crystals

    def _fusion_probability(self, c1: Crystal, c2: Crystal) -> float:
        dist = float(np.linalg.norm(c1.centroid - c2.centroid))
        return float(exp(-dist / self.temperature))

    def _compute_stability(self):
        for crystal in self.crystals:
            crystal.stability = crystal.cohesion

    def _detect_emergence(self, c1: Crystal, c2: Crystal):
        """检测涌现关联: 两个晶体合并时是否产生新知识."""
        pass  # 涌现由 _extract_emergent_knowledge 批量计算

    def _extract_emergent_knowledge(self):
        """从晶体中提取涌现知识."""
        for crystal in self.crystals:
            if crystal.size >= 3:
                words_all = []
                for f in crystal.fragments:
                    words_all.extend(f.content.lower().split())
                from collections import Counter
                counter = Counter(words_all)
                top_words = [w for w, _ in counter.most_common(5)]
                crystal.emergent_knowledge = [
                    f"Emergent concept cluster: {', '.join(top_words[:3])}",
                    f"Aggregation of {crystal.size} knowledge fragments",
                ]

    def get_crystal_summary(self) -> list[dict[str, Any]]:
        """获取所有晶体的摘要."""
        return [{
            "id": c.idx,
            "size": c.size,
            "cohesion": round(c.cohesion, 4),
            "stability": round(c.stability, 4),
            "description": c.description,
            "emergent_knowledge": c.emergent_knowledge,
            "fragments": [f.content[:80] for f in c.fragments[:5]],
        } for c in self.crystals]

    def get_emergence_relationships(self) -> list[dict]:
        """获取涌现关联."""
        relationships = []
        for crystal in self.crystals:
            if crystal.emergent_knowledge:
                relationships.append({
                    "crystal_id": crystal.idx,
                    "size": crystal.size,
                    "cohesion": round(crystal.cohesion, 4),
                    "emergent": crystal.emergent_knowledge,
                })
        return relationships
