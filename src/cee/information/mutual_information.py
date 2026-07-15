"""
mutual_information.py — 互信息计算引擎

实现互信息、条件互信息、多变量互信息、
传递熵与信息分解框架。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class MutualInformation:
    """互信息计算引擎。"""

    def __init__(self, base: float = 2.0):
        self.base = base
        self.log_func = math.log2 if base == 2.0 else (lambda x: math.log(x, base))

    def mi_discrete(self, joint_probs: Dict[Tuple[int, int], float],
                    marginal_x: Dict[int, float],
                    marginal_y: Dict[int, float]) -> float:
        """计算离散互信息 I(X; Y)。"""
        mi = 0.0
        for (x, y), p_xy in joint_probs.items():
            p_x = marginal_x.get(x, 0.0)
            p_y = marginal_y.get(y, 0.0)
            if p_xy > 0 and p_x > 0 and p_y > 0:
                mi += p_xy * self.log_func(p_xy / (p_x * p_y))
        return mi

    def mi_from_data(self, x: List[int], y: List[int]) -> float:
        """从样本数据估算互信息。"""
        from collections import Counter
        joint = Counter(zip(x, y))
        marginal_x = Counter(x)
        marginal_y = Counter(y)
        total = len(x)
        joint_probs = {k: v / total for k, v in joint.items()}
        mx = {k: v / total for k, v in marginal_x.items()}
        my = {k: v / total for k, v in marginal_y.items()}
        return self.mi_discrete(joint_probs, mx, my)

    def conditional_mi(self, joint_xyz: Dict[Tuple[int, int, int], float],
                       marginal_xz: Dict[Tuple[int, int], float],
                       marginal_yz: Dict[Tuple[int, int], float],
                       marginal_z: Dict[int, float]) -> float:
        """计算条件互信息 I(X; Y | Z)。"""
        cmi = 0.0
        for (x, y, z), p_xyz in joint_xyz.items():
            p_xz = marginal_xz.get((x, z), 0.0)
            p_yz = marginal_yz.get((y, z), 0.0)
            p_z = marginal_z.get(z, 0.0)
            if p_xyz > 0 and p_xz > 0 and p_yz > 0 and p_z > 0:
                cmi += p_xyz * self.log_func((p_xyz * p_z) / (p_xz * p_yz))
        return cmi

    def transfer_entropy(self, x: List[float], y: List[float],
                         delay: int = 1, bins: int = 10) -> float:
        """计算 Schreiber 传递熵。"""
        from collections import Counter
        def discretize(values: List[float]) -> List[int]:
            min_v, max_v = min(values), max(values)
            if min_v == max_v:
                return [0] * len(values)
            return [min(bins - 1, int((v - min_v) / (max_v - min_v) * bins)) for v in values]

        x_d = discretize(x)
        y_d = discretize(y)
        n = len(x_d)
        if n <= delay + 1:
            return 0.0

        joint = Counter()
        marginal_future = Counter()
        marginal_past = Counter()
        conditional = Counter()
        for t in range(delay, n - 1):
            future = y_d[t + 1]
            past_y = y_d[t]
            past_x = x_d[t - delay]
            joint[(future, past_y, past_x)] += 1
            marginal_future[future] += 1
            marginal_past[(past_y, past_x)] += 1
            conditional[(future, past_y)] += 1

        total = sum(joint.values())
        te = 0.0
        for (f, py, px), count in joint.items():
            p_joint = count / total
            p_cond = conditional.get((f, py), 0) / sum(conditional.values())
            p_past = marginal_past.get((py, px), 0) / sum(marginal_past.values())
            p_future = marginal_future.get(f, 0) / sum(marginal_future.values())
            if p_joint > 0 and p_cond > 0 and p_past > 0:
                te += p_joint * self.log_func((p_joint * sum(marginal_future.values()) / total) / (p_cond * p_past))
        return te

    def multi_information(self, joint_probs: Dict[Tuple[int, ...], float],
                          marginals: List[Dict[int, float]]) -> float:
        """计算多变量互信息（全依赖）。"""
        mi = 0.0
        for state, p_joint in joint_probs.items():
            if p_joint > 0:
                product = 1.0
                for i, marginal in enumerate(marginals):
                    product *= marginal.get(state[i], 0.0)
                if product > 0:
                    mi += p_joint * self.log_func(p_joint / product)
        return mi

    def interaction_information(self, joint: Dict[Tuple[int, int, int], float],
                                marginals: List[Dict[int, float]],
                                pairwise_joints: List[Dict[Tuple[int, int], float]]) -> float:
        """计算交互信息（协同/冗余）。"""
        mi_pairwise = 0.0
        for i, j in [(0, 1), (0, 2), (1, 2)]:
            mi_pairwise += self.mi_discrete(pairwise_joints[i], marginals[i], marginals[j])
        mi_full = self.multi_information(joint, marginals)
        return mi_pairwise - mi_full

    def normalized_mi(self, mi: float, entropy_x: float, entropy_y: float) -> float:
        """归一化互信息。"""
        if entropy_x == 0 or entropy_y == 0:
            return 0.0
        return 2.0 * mi / (entropy_x + entropy_y)

    def variation_of_information(self, joint_probs: Dict[Tuple[int, int], float],
                                 marginal_x: Dict[int, float],
                                 marginal_y: Dict[int, float]) -> float:
        """计算信息变化距离。"""
        hx = 0.0
        for p in marginal_x.values():
            if p > 0:
                hx -= p * self.log_func(p)
        hy = 0.0
        for p in marginal_y.values():
            if p > 0:
                hy -= p * self.log_func(p)
        mi = self.mi_discrete(joint_probs, marginal_x, marginal_y)
        return hx + hy - 2.0 * mi

    def pointwise_mi(self, p_xy: float, p_x: float, p_y: float) -> float:
        """计算点态互信息。"""
        if p_xy > 0 and p_x > 0 and p_y > 0:
            return self.log_func(p_xy / (p_x * p_y))
        return 0.0

    def directed_information(self, x: List[int], y: List[int]) -> float:
        """计算有向信息。"""
        di = 0.0
        for t in range(1, len(x)):
            past_x = tuple(x[:t])
            past_y = tuple(y[:t])
            di += self.pointwise_mi(1.0 / len(x), 1.0 / len(past_x), 1.0 / len(past_y))
        return di
