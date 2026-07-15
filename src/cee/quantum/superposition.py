"""
superposition.py — 叠加态管理器

提供叠加态的创建、演化、干涉分析、
退相干时间估算与量子行走模拟。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Callable


class SuperpositionState:
    """离散基矢上的叠加态，维护振幅列表与相位信息。"""

    def __init__(self, amplitudes: List[complex], labels: Optional[List[str]] = None):
        self.amplitudes = list(amplitudes)
        self.dim = len(amplitudes)
        self.labels = labels or [str(i) for i in range(self.dim)]
        self._normalize()

    def _normalize(self) -> None:
        """归一化振幅。"""
        norm = math.sqrt(sum(abs(a) ** 2 for a in self.amplitudes))
        if norm > 0:
            self.amplitudes = [a / norm for a in self.amplitudes]

    def probability(self, index: int) -> float:
        """获取指定基矢的测量概率。"""
        return abs(self.amplitudes[index]) ** 2

    def phase(self, index: int) -> float:
        """获取指定基矢的相位角（弧度）。"""
        return math.atan2(self.amplitudes[index].imag, self.amplitudes[index].real)

    def collapse(self, index: int) -> None:
        """将叠加态坍缩到指定基矢。"""
        self.amplitudes = [0.0 + 0j] * self.dim
        self.amplitudes[index] = 1.0 + 0j

    def measure(self) -> int:
        """根据概率分布进行测量并返回索引。"""
        r = random.random()
        cumulative = 0.0
        for i, a in enumerate(self.amplitudes):
            cumulative += abs(a) ** 2
            if r <= cumulative:
                return i
        return self.dim - 1

    def apply_phase_shift(self, index: int, theta: float) -> None:
        """对指定基矢施加相位旋转。"""
        self.amplitudes[index] *= complex(math.cos(theta), math.sin(theta))

    def apply_global_phase(self, theta: float) -> None:
        """施加全局相位（物理不可观测，但用于数值追踪）。"""
        phase = complex(math.cos(theta), math.sin(theta))
        self.amplitudes = [a * phase for a in self.amplitudes]

    def coherence(self) -> float:
        """计算相干度：非对角元绝对值之和。"""
        rho = self.density_matrix()
        total = 0.0
        for i in range(self.dim):
            for j in range(self.dim):
                if i != j:
                    total += abs(rho[i][j])
        return total

    def density_matrix(self) -> List[List[complex]]:
        """构造密度矩阵。"""
        return [[self.amplitudes[i] * self.amplitudes[j].conjugate()
                 for j in range(self.dim)] for i in range(self.dim)]

    def overlap(self, other: SuperpositionState) -> complex:
        """与另一个态计算内积。"""
        return sum(self.amplitudes[i].conjugate() * other.amplitudes[i]
                   for i in range(self.dim))

    def clone_labels(self) -> SuperpositionState:
        """返回保持相同标签的浅拷贝态（|0>）。"""
        return SuperpositionState([1.0 + 0j] + [0.0 + 0j] * (self.dim - 1), self.labels)


class SuperpositionManager:
    """叠加态管理引擎：批量创建、演化与分析量子叠加。"""

    def __init__(self, max_dim: int = 256):
        self.max_dim = max_dim
        self.registry: Dict[str, SuperpositionState] = {}

    def create_uniform(self, name: str, n: int) -> SuperpositionState:
        """创建 n 维等权叠加态。"""
        amp = 1.0 / math.sqrt(n)
        state = SuperpositionState([amp + 0j] * n)
        self.registry[name] = state
        return state

    def create_ghz(self, name: str, n: int) -> SuperpositionState:
        """创建 GHZ 型叠加态 (|0...0> + |1...1>)/sqrt(2)。"""
        if n > self.max_dim:
            raise ValueError("维度超过限制")
        amps = [0.0 + 0j] * n
        amps[0] = 1.0 / math.sqrt(2.0)
        amps[n - 1] = 1.0 / math.sqrt(2.0)
        state = SuperpositionState(amps)
        self.registry[name] = state
        return state

    def create_w_state(self, name: str, n: int) -> SuperpositionState:
        """创建 W 态。"""
        if n > self.max_dim:
            raise ValueError("维度超过限制")
        coeff = 1.0 / math.sqrt(n)
        amps = [coeff + 0j] * n
        state = SuperpositionState(amps)
        self.registry[name] = state
        return state

    def evolve_unitary(self, name: str, matrix: List[List[complex]]) -> None:
        """对注册态应用酉演化。"""
        state = self.registry[name]
        new_amps = [sum(matrix[i][j] * state.amplitudes[j]
                        for j in range(state.dim)) for i in range(state.dim)]
        state.amplitudes = new_amps
        state._normalize()

    def interference_pattern(self, name: str, slits: int = 2) -> List[float]:
        """模拟多缝干涉的概率分布。"""
        state = self.registry[name]
        positions = []
        for x in range(-50, 51):
            prob = 0.0
            for s in range(slits):
                phase = 2.0 * math.pi * s * x / 100.0
                prob += abs(state.amplitudes[s % state.dim]) ** 2 * (1.0 + math.cos(phase))
            positions.append(prob)
        total = sum(positions)
        if total > 0:
            positions = [p / total for p in positions]
        return positions

    def dephasing_time(self, name: str, gamma: float = 0.01) -> float:
        """基于指数退相位模型估算退相位时间 T_2*。"""
        if gamma <= 0:
            return float('inf')
        return 1.0 / gamma

    def coherence_metric(self, name: str) -> float:
        """返回注册态的相干度。"""
        return self.registry[name].coherence()

    def entanglement_entropy_single(self, name: str, split: int) -> float:
        """对单粒子分割计算纠缠熵。"""
        state = self.registry[name]
        rho = state.density_matrix()
        reduced = self._partial_trace_single(rho, split)
        vals = self._eigenvalues_2x2(reduced)
        entropy = 0.0
        for v in vals:
            if v > 1e-12:
                entropy -= v * math.log2(v)
        return entropy

    def _partial_trace_single(self, rho: List[List[complex]], split: int) -> List[List[complex]]:
        """对单个 qubit 分割做偏迹。"""
        reduced = [[0.0 + 0j] * 2 for _ in range(2)]
        dim = len(rho)
        for i in range(dim):
            for j in range(dim):
                bit = (i >> split) & 1
                bjt = (j >> split) & 1
                if (i & ~(1 << split)) == (j & ~(1 << split)):
                    reduced[bit][bjt] += rho[i][j]
        return reduced

    @staticmethod
    def _eigenvalues_2x2(m: List[List[complex]]) -> List[float]:
        a, b, c, d = m[0][0].real, m[0][1], m[1][0], m[1][1].real
        trace = a + d
        det = a * d - abs(b) ** 2
        disc = trace * trace - 4 * det
        disc = max(disc, 0.0)
        return [(trace + math.sqrt(disc)) / 2.0, (trace - math.sqrt(disc)) / 2.0]

    def quantum_walk(self, name: str, steps: int, coin_type: str = "hadamard") -> List[float]:
        """模拟一维离散时间量子行走。"""
        if coin_type == "hadamard":
            coin = [[1.0 / math.sqrt(2.0), 1.0 / math.sqrt(2.0)],
                    [1.0 / math.sqrt(2.0), -1.0 / math.sqrt(2.0)]]
        else:
            coin = [[1.0 + 0j, 0.0 + 0j], [0.0 + 0j, 1.0 + 0j]]
        positions = {0: [1.0 + 0j, 0.0 + 0j]}
        for _ in range(steps):
            new_pos: Dict[int, List[complex]] = {}
            for pos, vec in positions.items():
                c0 = coin[0][0] * vec[0] + coin[0][1] * vec[1]
                c1 = coin[1][0] * vec[0] + coin[1][1] * vec[1]
                left = pos - 1
                right = pos + 1
                if left not in new_pos:
                    new_pos[left] = [0.0 + 0j, 0.0 + 0j]
                if right not in new_pos:
                    new_pos[right] = [0.0 + 0j, 0.0 + 0j]
                new_pos[left][0] += c0
                new_pos[right][1] += c1
            positions = new_pos
        probs = [0.0] * (2 * steps + 1)
        offset = steps
        for pos, vec in positions.items():
            probs[pos + offset] = abs(vec[0]) ** 2 + abs(vec[1]) ** 2
        return probs

    def destroy(self, name: str) -> None:
        """从注册表中移除指定态。"""
        if name in self.registry:
            del self.registry[name]
