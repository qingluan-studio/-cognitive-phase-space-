"""
synaptic_plasticity.py — 突触可塑性引擎

实现长时程增强 (LTP)、长时程抑制 (LTD)、
稳态可塑性、结构可塑性及突触标记与捕获模型。
"""

from __future__ import annotations

import math
import random
from typing import List, Dict, Tuple, Optional


class Synapse:
    """单个突触的完整可塑性状态。"""

    def __init__(self, weight: float = 0.5, w_max: float = 1.0, w_min: float = 0.0):
        self.weight = weight
        self.w_max = w_max
        self.w_min = w_min
        self.tag = 0.0
        self.protein_synthesis = 0.0
        self.last_active = 0.0
        self.stability = 0.5

    def potentiate(self, amount: float) -> None:
        """长时程增强 (LTP)。"""
        self.weight = min(self.w_max, self.weight + amount)
        self.tag = min(1.0, self.tag + amount * 2.0)
        self.last_active = 0.0

    def depress(self, amount: float) -> None:
        """长时程抑制 (LTD)。"""
        self.weight = max(self.w_min, self.weight - amount)
        self.tag = max(0.0, self.tag - amount)
        self.last_active = 0.0

    def decay_tag(self, dt: float, tau_tag: float = 30.0) -> None:
        """突触标记的时间衰减。"""
        self.tag *= math.exp(-dt / tau_tag)

    def capture_protein(self, protein_level: float) -> None:
        """捕获蛋白质以巩固突触。"""
        if self.tag > 0.3:
            consolidation = protein_level * self.tag
            self.stability = min(1.0, self.stability + consolidation)
            self.weight = min(self.w_max, self.weight + consolidation * 0.1)

    def structural_elimination(self, threshold: float = 0.05) -> bool:
        """若权重过低，标记为结构消除候选。"""
        return self.weight < threshold

    def scaling(self, target: float, rate: float = 0.01) -> None:
        """突触缩放：稳态调节。"""
        self.weight += rate * (target - self.weight)
        self.weight = max(self.w_min, min(self.w_max, self.weight))

    def eligibility_trace(self, dt: float, tau_e: float = 10.0) -> float:
        """计算资格迹。"""
        return math.exp(-self.last_active / tau_e)

    def reset(self) -> None:
        """重置突触状态。"""
        self.weight = 0.5
        self.tag = 0.0
        self.protein_synthesis = 0.0
        self.last_active = 0.0
        self.stability = 0.5


class SynapticPlasticityEngine:
    """突触可塑性引擎：管理突触群的可塑性演化。"""

    def __init__(self, num_synapses: int = 100):
        self.synapses = [Synapse(random.uniform(0.1, 0.9)) for _ in range(num_synapses)]
        self.time = 0.0
        self.dt = 1.0
        self.protein_pool = 0.0

    def stimulate(self, indices: List[int], intensity: float = 0.1) -> None:
        """对指定突触施加刺激，触发 LTP/LTD。"""
        for idx in indices:
            syn = self.synapses[idx]
            if intensity > 0:
                syn.potentiate(intensity)
            else:
                syn.depress(abs(intensity))

    def heterosynaptic_ltd(self, active_indices: List[int], global_rate: float = 0.001) -> None:
        """异突触 LTD：未激活突触轻微减弱。"""
        active_set = set(active_indices)
        for i, syn in enumerate(self.synapses):
            if i not in active_set:
                syn.depress(global_rate)

    def synaptic_tagging(self, dt: float) -> None:
        """更新所有突触标记的衰减。"""
        for syn in self.synapses:
            syn.decay_tag(dt)
            syn.last_active += dt

    def protein_synthesis_wave(self, strength: float = 0.5, delay: float = 30.0) -> None:
        """模拟蛋白质合成波。"""
        self.protein_pool = strength
        for syn in self.synapses:
            if syn.last_active > delay:
                syn.capture_protein(self.protein_pool)

    def synaptic_scaling(self, target_average: float = 0.5) -> None:
        """对所有突触执行缩放以维持平均权重。"""
        avg = sum(s.weight for s in self.synapses) / len(self.synapses)
        for syn in self.synapses:
            syn.scaling(target_average)

    def metaplastic_transition(self, idx: int, state: str) -> None:
        """修改突触的元可塑性状态。"""
        syn = self.synapses[idx]
        if state == "down":
            syn.stability = max(0.0, syn.stability - 0.1)
        elif state == "up":
            syn.stability = min(1.0, syn.stability + 0.1)

    def structural_plasticity(self, birth_rate: float = 0.01, death_rate: float = 0.01) -> None:
        """结构可塑性：随机生成或消除突触。"""
        for syn in self.synapses:
            if syn.structural_elimination() and random.random() < death_rate:
                syn.reset()
                syn.weight = random.uniform(0.0, 0.1)
        for syn in self.synapses:
            if syn.weight < 0.1 and random.random() < birth_rate:
                syn.weight = random.uniform(0.1, 0.3)

    run_step = synaptic_tagging

    def weight_distribution(self) -> Dict[str, float]:
        """返回权重分布统计。"""
        weights = [s.weight for s in self.synapses]
        return {
            "mean": sum(weights) / len(weights),
            "min": min(weights),
            "max": max(weights),
            "std": math.sqrt(sum((w - sum(weights) / len(weights)) ** 2 for w in weights) / len(weights)),
        }

    def prune_weak_synapses(self, threshold: float = 0.05) -> int:
        """剪除弱突触并返回剪除数量。"""
        count = 0
        for syn in self.synapses:
            if syn.weight < threshold:
                syn.reset()
                count += 1
        return count

    def reward_modulated_update(self, indices: List[int], reward: float,
                                 baseline: float = 0.0, lr: float = 0.01) -> None:
        """奖励调制可塑性 (R-STDP)。"""
        delta_r = reward - baseline
        for idx in indices:
            self.synapses[idx].weight += lr * delta_r * self.synapses[idx].eligibility_trace(self.time)
            self.synapses[idx].weight = max(0.0, min(1.0, self.synapses[idx].weight))
