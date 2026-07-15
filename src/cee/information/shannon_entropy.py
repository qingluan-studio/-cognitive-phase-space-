"""
shannon_entropy.py — 香农熵计算引擎

实现离散/连续分布的香农熵、联合熵、条件熵、
交叉熵与 KL 散度的完整计算框架。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class ShannonEntropy:
    """香农熵计算引擎。"""

    def __init__(self, base: float = 2.0):
        self.base = base
        self.log_func = math.log2 if base == 2.0 else (lambda x: math.log(x, base))

    def discrete_entropy(self, probabilities: List[float]) -> float:
        """计算离散概率分布的香农熵。"""
        entropy = 0.0
        for p in probabilities:
            if p > 0:
                entropy -= p * self.log_func(p)
        return entropy

    def histogram_entropy(self, data: List[float], bins: int = 20) -> float:
        """基于直方图估算连续分布的熵。"""
        if not data:
            return 0.0
        min_val = min(data)
        max_val = max(data)
        if min_val == max_val:
            return 0.0
        counts = [0] * bins
        for val in data:
            idx = int((val - min_val) / (max_val - min_val) * (bins - 1))
            counts[idx] += 1
        total = len(data)
        probs = [c / total for c in counts if c > 0]
        return self.discrete_entropy(probs) + math.log(max_val - min_val, self.base)

    def joint_entropy(self, joint_probs: Dict[Tuple[int, int], float]) -> float:
        """计算联合熵 H(X, Y)。"""
        entropy = 0.0
        for p in joint_probs.values():
            if p > 0:
                entropy -= p * self.log_func(p)
        return entropy

    def conditional_entropy(self, joint_probs: Dict[Tuple[int, int], float],
                            marginal_y: Dict[int, float]) -> float:
        """计算条件熵 H(X | Y)。"""
        entropy = 0.0
        for (x, y), p_xy in joint_probs.items():
            if p_xy > 0 and marginal_y.get(y, 0) > 0:
                entropy -= p_xy * self.log_func(p_xy / marginal_y[y])
        return entropy

    def cross_entropy(self, p: List[float], q: List[float]) -> float:
        """计算交叉熵 H(p, q)。"""
        ce = 0.0
        for pi, qi in zip(p, q):
            if pi > 0 and qi > 0:
                ce -= pi * self.log_func(qi)
        return ce

    def kl_divergence(self, p: List[float], q: List[float]) -> float:
        """计算 KL 散度 D_KL(p || q)。"""
        kl = 0.0
        for pi, qi in zip(p, q):
            if pi > 0 and qi > 0:
                kl += pi * self.log_func(pi / qi)
        return kl

    def jensen_shannon_divergence(self, p: List[float], q: List[float]) -> float:
        """计算 Jensen-Shannon 散度。"""
        m = [(pi + qi) / 2.0 for pi, qi in zip(p, q)]
        return 0.5 * self.kl_divergence(p, m) + 0.5 * self.kl_divergence(q, m)

    def entropy_rate(self, sequence: List[int], order: int = 1) -> float:
        """估算随机过程的熵率。"""
        from collections import Counter
        if len(sequence) <= order:
            return 0.0
        blocks = Counter()
        transitions = Counter()
        for i in range(len(sequence) - order):
            block = tuple(sequence[i:i + order])
            blocks[block] += 1
            if i + order < len(sequence):
                transitions[(block, sequence[i + order])] += 1
        total = sum(blocks.values())
        entropy = 0.0
        for block, count in blocks.items():
            p_block = count / total
            sub_total = sum(transitions.get((block, s), 0) for s in set(sequence))
            if sub_total > 0:
                for s in set(sequence):
                    p_trans = transitions.get((block, s), 0) / sub_total
                    if p_trans > 0:
                        entropy -= p_block * p_trans * self.log_func(p_trans)
        return entropy

    def differential_entropy_normal(self, sigma: float) -> float:
        """正态分布的微分熵。"""
        return 0.5 * self.log_func(2.0 * math.pi * math.e * sigma ** 2)

    def max_entropy_discrete(self, n: int) -> float:
        """n 个等概率事件的极大熵。"""
        return self.log_func(n)

    def redundancy(self, probabilities: List[float]) -> float:
        """计算冗余度。"""
        h = self.discrete_entropy(probabilities)
        h_max = self.max_entropy_discrete(len(probabilities))
        return 1.0 - h / h_max if h_max > 0 else 0.0

    def effective_alphabet_size(self, probabilities: List[float]) -> float:
        """计算有效字母表大小。"""
        h = self.discrete_entropy(probabilities)
        return self.base ** h

    def entropy_of_mixture(self, components: List[Tuple[float, List[float]]]) -> float:
        """混合分布的熵上界。"""
        mixture = [0.0] * len(components[0][1])
        for weight, probs in components:
            for i, p in enumerate(probs):
                mixture[i] += weight * p
        return self.discrete_entropy(mixture)
