"""
decoherence.py — 退相干处理引擎

实现退相干通道（去极化、相位阻尼、振幅阻尼）、
主方程模拟、以及量子纠错码的简并校验。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class DecoherenceChannel:
    """单量子比特退相干通道基类。"""

    def __init__(self, gamma: float = 0.01):
        self.gamma = gamma

    def apply(self, rho: List[List[complex]]) -> List[List[complex]]:
        """对密度矩阵施加退相干通道。"""
        raise NotImplementedError

    def apply_statevector(self, psi: List[complex]) -> List[complex]:
        """对状态矢量进行概率性退相干演化。"""
        raise NotImplementedError


class DepolarizingChannel(DecoherenceChannel):
    """去极化通道: rho -> (1-p) * rho + p/2 * I。"""

    def apply(self, rho: List[List[complex]]) -> List[List[complex]]:
        p = self.gamma
        dim = len(rho)
        I = [[1.0 + 0j if i == j else 0.0 + 0j for j in range(dim)] for i in range(dim)]
        new_rho = [[(1.0 - p) * rho[i][j] + (p / dim) * I[i][j]
                    for j in range(dim)] for i in range(dim)]
        return new_rho

    def apply_statevector(self, psi: List[complex]) -> List[complex]:
        if random.random() < self.gamma:
            dim = len(psi)
            angle = random.random() * 2.0 * math.pi
            new_psi = [complex(math.cos(angle + i * 2.0 * math.pi / dim),
                               math.sin(angle + i * 2.0 * math.pi / dim)) for i in range(dim)]
            norm = math.sqrt(sum(abs(x) ** 2 for x in new_psi))
            return [x / norm for x in new_psi]
        return psi


class PhaseDampingChannel(DecoherenceChannel):
    """相位阻尼通道。"""

    def apply(self, rho: List[List[complex]]) -> List[List[complex]]:
        p = self.gamma
        dim = len(rho)
        new_rho = [[0.0 + 0j] * dim for _ in range(dim)]
        for i in range(dim):
            for j in range(dim):
                if i == j:
                    new_rho[i][j] = rho[i][j]
                else:
                    new_rho[i][j] = (1.0 - p) * rho[i][j]
        return new_rho

    def apply_statevector(self, psi: List[complex]) -> List[complex]:
        if random.random() < self.gamma:
            for i in range(len(psi)):
                theta = random.random() * 2.0 * math.pi
                psi[i] *= complex(math.cos(theta), math.sin(theta))
            norm = math.sqrt(sum(abs(x) ** 2 for x in psi))
            return [x / norm for x in psi]
        return psi


class AmplitudeDampingChannel(DecoherenceChannel):
    """振幅阻尼通道。"""

    def apply(self, rho: List[List[complex]]) -> List[List[complex]]:
        gamma = self.gamma
        dim = len(rho)
        new_rho = [[0.0 + 0j] * dim for _ in range(dim)]
        for i in range(dim):
            for j in range(dim):
                if i == 0 and j == 0:
                    new_rho[i][j] = rho[0][0] + gamma * rho[1][1]
                elif i == 0 and j == 1:
                    new_rho[i][j] = math.sqrt(1.0 - gamma) * rho[0][1]
                elif i == 1 and j == 0:
                    new_rho[i][j] = math.sqrt(1.0 - gamma) * rho[1][0]
                elif i == 1 and j == 1:
                    new_rho[i][j] = (1.0 - gamma) * rho[1][1]
                else:
                    new_rho[i][j] = rho[i][j]
        return new_rho

    def apply_statevector(self, psi: List[complex]) -> List[complex]:
        if len(psi) >= 2 and random.random() < self.gamma * abs(psi[1]) ** 2:
            new_psi = list(psi)
            new_psi[0] = psi[1]
            new_psi[1] = 0.0 + 0j
            norm = math.sqrt(sum(abs(x) ** 2 for x in new_psi))
            return [x / norm for x in new_psi]
        return psi


class DecoherenceSimulator:
    """退相干演化模拟器，支持连续时间主方程与离散通道组合。"""

    def __init__(self, num_qubits: int = 1, dt: float = 0.01):
        self.num_qubits = num_qubits
        self.dim = 2 ** num_qubits
        self.dt = dt
        self.channels: List[Tuple[str, DecoherenceChannel]] = []
        self.time = 0.0

    def add_channel(self, qubit: int, channel: DecoherenceChannel) -> None:
        """为指定量子比特添加退相干通道。"""
        self.channels.append((qubit, channel))

    def step(self, rho: List[List[complex]]) -> List[List[complex]]:
        """单步演化：应用所有已注册通道。"""
        new_rho = [[rho[i][j] for j in range(self.dim)] for i in range(self.dim)]
        for qubit, ch in self.channels:
            new_rho = self._apply_local(new_rho, qubit, ch)
        self.time += self.dt
        return new_rho

    def _apply_local(self, rho: List[List[complex]], qubit: int, ch: DecoherenceChannel) -> List[List[complex]]:
        """将单比特通道扩展到全空间。"""
        new_rho = [[0.0 + 0j] * self.dim for _ in range(self.dim)]
        for i in range(self.dim):
            for j in range(self.dim):
                bi = (i >> qubit) & 1
                bj = (j >> qubit) & 1
                mask_i = i & ~(1 << qubit)
                mask_j = j & ~(1 << qubit)
                for ki in range(2):
                    for kj in range(2):
                        ii = mask_i | (ki << qubit)
                        jj = mask_j | (kj << qubit)
                        new_rho[i][j] += ch.apply([[1.0 + 0j if bi == ki and bj == kj else 0.0 + 0j
                                                    for bj in range(2)] for bi in range(2)])[bi][bj] * rho[ii][jj]
        return new_rho

    def lindblad_evolve(self, rho: List[List[complex]], H: List[List[complex]], L_ops: List[List[List[complex]]], t_final: float) -> List[List[complex]]:
        """通过 Lindblad 主方程演化密度矩阵。"""
        steps = int(t_final / self.dt)
        current = rho
        for _ in range(steps):
            current = self._lindblad_step(current, H, L_ops)
        return current

    def _lindblad_step(self, rho: List[List[complex]], H: List[List[complex]], L_ops: List[List[List[complex]]]) -> List[List[complex]]:
        """单步 Lindblad 演化。"""
        commutator = self._matrix_add(self._matrix_mult(H, rho), self._matrix_mult(rho, H), sign=-1.0)
        dissipator = [[0.0 + 0j] * self.dim for _ in range(self.dim)]
        for L in L_ops:
            Ld = self._dagger(L)
            term1 = self._matrix_mult(L, self._matrix_mult(rho, Ld))
            term2 = self._matrix_mult(self._matrix_mult(Ld, L), rho)
            term3 = self._matrix_mult(rho, self._matrix_mult(Ld, L))
            for i in range(self.dim):
                for j in range(self.dim):
                    dissipator[i][j] += term1[i][j] - 0.5 * (term2[i][j] + term3[i][j])
        new_rho = [[rho[i][j] + self.dt * (-1.0j * commutator[i][j] + dissipator[i][j])
                    for j in range(self.dim)] for i in range(self.dim)]
        return new_rho

    def _matrix_mult(self, a: List[List[complex]], b: List[List[complex]]) -> List[List[complex]]:
        n = len(a)
        return [[sum(a[i][k] * b[k][j] for k in range(n)) for j in range(n)] for i in range(n)]

    def _matrix_add(self, a: List[List[complex]], b: List[List[complex]], sign: float = 1.0) -> List[List[complex]]:
        n = len(a)
        return [[a[i][j] + sign * b[i][j] for j in range(n)] for i in range(n)]

    def _dagger(self, m: List[List[complex]]) -> List[List[complex]]:
        n = len(m)
        return [[m[j][i].conjugate() for j in range(n)] for i in range(n)]

    def fidelity_decay(self, rho0: List[List[complex]], rho_t: List[List[complex]]) -> float:
        """计算初始态与演化态之间的保真度衰减。"""
        f = 0.0
        for i in range(self.dim):
            for j in range(self.dim):
                f += (rho0[i][j].conjugate() * rho_t[j][i]).real
        return max(0.0, f)

    def t1_estimate(self, gamma_amp: float) -> float:
        """基于振幅阻尼估算能量弛豫时间 T1。"""
        if gamma_amp <= 0:
            return float('inf')
        return 1.0 / gamma_amp

    def t2_estimate(self, gamma_phase: float) -> float:
        """基于相位阻尼估算退相位时间 T2。"""
        if gamma_phase <= 0:
            return float('inf')
        return 1.0 / gamma_phase

    def coherence_time_scale(self, rho_history: List[List[List[complex]]]) -> float:
        """从密度矩阵历史中提取相干时间尺度。"""
        if len(rho_history) < 2:
            return 0.0
        coherences = [sum(abs(rho[i][j]) for i in range(self.dim) for j in range(self.dim) if i != j)
                      for rho in rho_history]
        if coherences[0] <= 1e-12:
            return 0.0
        for idx, c in enumerate(coherences):
            if c < coherences[0] / math.e:
                return idx * self.dt
        return len(rho_history) * self.dt
