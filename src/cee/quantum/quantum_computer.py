"""
quantum_computer.py — 量子计算模拟器

提供基于状态矢量的通用量子电路模拟，支持单/多量子门、
测量、密度矩阵演化及基本的量子纠错码演示。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class Qubit:
    """单量子比特的抽象表示，存储振幅 alpha 与 beta。"""

    def __init__(self, alpha: complex = 1.0 + 0j, beta: complex = 0.0 + 0j):
        self.alpha = alpha
        self.beta = beta
        self._normalize()

    def _normalize(self) -> None:
        """归一化振幅，确保 |alpha|^2 + |beta|^2 = 1。"""
        norm = math.sqrt(abs(self.alpha) ** 2 + abs(self.beta) ** 2)
        if norm > 0:
            self.alpha /= norm
            self.beta /= norm

    def measure(self) -> int:
        """对当前量子比特进行投影测量，返回 0 或 1。"""
        prob_zero = abs(self.alpha) ** 2
        return 0 if random.random() < prob_zero else 1

    def bloch_coordinates(self) -> Tuple[float, float, float]:
        """将量子态映射到布洛赫球坐标 (x, y, z)。"""
        a, b = self.alpha, self.beta
        x = 2 * (a.real * b.real + a.imag * b.imag)
        y = 2 * (a.real * b.imag - a.imag * b.real)
        z = abs(a) ** 2 - abs(b) ** 2
        return x, y, z

    def apply_gate(self, matrix: List[List[complex]]) -> None:
        """应用一个 2x2 复数矩阵到当前量子比特。"""
        a = matrix[0][0] * self.alpha + matrix[0][1] * self.beta
        b = matrix[1][0] * self.alpha + matrix[1][1] * self.beta
        self.alpha, self.beta = a, b
        self._normalize()

    def fidelity(self, other: Qubit) -> float:
        """计算与另一个量子态的保真度。"""
        inner = abs(self.alpha.conjugate() * other.alpha +
                    self.beta.conjugate() * other.beta)
        return inner ** 2

    def to_statevector(self) -> List[complex]:
        """将单量子比特展开为状态矢量 [alpha, beta]。"""
        return [self.alpha, self.beta]

    def reset(self) -> None:
        """将量子比特重置为 |0> 态。"""
        self.alpha = 1.0 + 0j
        self.beta = 0.0 + 0j


class QuantumGate:
    """常用单/双量子门矩阵工厂。"""

    @staticmethod
    def hadamard() -> List[List[complex]]:
        """Hadamard 门 H = 1/sqrt(2) * [[1, 1], [1, -1]]。"""
        s = 1.0 / math.sqrt(2.0)
        return [[s, s], [s, -s]]

    @staticmethod
    def pauli_x() -> List[List[complex]]:
        """Pauli-X (NOT) 门。"""
        return [[0.0 + 0j, 1.0 + 0j], [1.0 + 0j, 0.0 + 0j]]

    @staticmethod
    def pauli_y() -> List[List[complex]]:
        """Pauli-Y 门。"""
        return [[0.0 + 0j, -0.0 - 1.0j], [0.0 + 1.0j, 0.0 + 0j]]

    @staticmethod
    def pauli_z() -> List[List[complex]]:
        """Pauli-Z 门。"""
        return [[1.0 + 0j, 0.0 + 0j], [0.0 + 0j, -1.0 + 0j]]

    @staticmethod
    def phase_shift(theta: float) -> List[List[complex]]:
        """相位门 P(theta) = [[1, 0], [0, exp(i*theta)]]。"""
        return [[1.0 + 0j, 0.0 + 0j], [0.0 + 0j, complex(math.cos(theta), math.sin(theta))]]

    @staticmethod
    def cnot() -> List[List[complex]]:
        """受控非门 CNOT 的 4x4 矩阵。"""
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1],
            [0, 0, 1, 0],
        ]

    @staticmethod
    def swap() -> List[List[complex]]:
        """SWAP 门的 4x4 矩阵。"""
        return [
            [1, 0, 0, 0],
            [0, 0, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1],
        ]

    @staticmethod
    def identity() -> List[List[complex]]:
        """2x2 单位门。"""
        return [[1.0 + 0j, 0.0 + 0j], [0.0 + 0j, 1.0 + 0j]]


class QuantumCircuit:
    """多量子比特电路模拟器，维护完整的 2^n 维状态矢量。"""

    def __init__(self, num_qubits: int):
        self.num_qubits = num_qubits
        self.dim = 2 ** num_qubits
        self.state: List[complex] = [0.0 + 0j] * self.dim
        self.state[0] = 1.0 + 0j
        self.history: List[Dict] = []

    def _tensor_identity(self, gate: List[List[complex]], target: int) -> List[List[complex]]:
        """将单量子门嵌入到 n 量子位希尔伯特空间中。"""
        result = [[1.0 + 0j if i == j else 0.0 + 0j for j in range(self.dim)] for i in range(self.dim)]
        for i in range(self.dim):
            for j in range(self.dim):
                diff = i ^ j
                if diff == 0:
                    continue
                bit_i = (i >> target) & 1
                bit_j = (j >> target) & 1
                if diff == (1 << target):
                    result[i][j] = gate[bit_i][bit_j]
                    result[i][i] = 0.0 + 0j
        return result

    def apply_single(self, gate: List[List[complex]], target: int) -> None:
        """对指定量子位应用单量子门。"""
        new_state = [0.0 + 0j] * self.dim
        for i in range(self.dim):
            bit = (i >> target) & 1
            base = i & ~(1 << target)
            new_state[base | (0 << target)] += gate[0][bit] * self.state[i]
            new_state[base | (1 << target)] += gate[1][bit] * self.state[i]
        self.state = new_state
        self._normalize_state()
        self.history.append({"op": "single", "target": target})

    def apply_cnot(self, control: int, target: int) -> None:
        """应用受控非门。"""
        new_state = [0.0 + 0j] * self.dim
        for i in range(self.dim):
            c_bit = (i >> control) & 1
            if c_bit == 1:
                flipped = i ^ (1 << target)
                new_state[flipped] = self.state[i]
            else:
                new_state[i] = self.state[i]
        self.state = new_state
        self._normalize_state()
        self.history.append({"op": "cnot", "control": control, "target": target})

    def _normalize_state(self) -> None:
        """归一化完整状态矢量。"""
        norm = math.sqrt(sum(abs(x) ** 2 for x in self.state))
        if norm > 0:
            self.state = [x / norm for x in self.state]

    def measure(self, target: int) -> int:
        """对指定量子位进行偏迹测量并坍缩。"""
        prob_zero = 0.0
        for i in range(self.dim):
            if ((i >> target) & 1) == 0:
                prob_zero += abs(self.state[i]) ** 2
        outcome = 0 if random.random() < prob_zero else 1
        mask = 1 << target
        for i in range(self.dim):
            if ((i >> target) & 1) != outcome:
                self.state[i] = 0.0 + 0j
        self._normalize_state()
        self.history.append({"op": "measure", "target": target, "outcome": outcome})
        return outcome

    def density_matrix(self) -> List[List[complex]]:
        """从纯态构造密度矩阵 rho = |psi><psi|。"""
        dim = self.dim
        rho = [[0.0 + 0j] * dim for _ in range(dim)]
        for i in range(dim):
            for j in range(dim):
                rho[i][j] = self.state[i] * self.state[j].conjugate()
        return rho

    def partial_trace(self, trace_out: List[int]) -> List[List[complex]]:
        """对指定量子位求偏迹，返回约化密度矩阵。"""
        keep = [q for q in range(self.num_qubits) if q not in trace_out]
        keep_dim = 2 ** len(keep)
        rho = self.density_matrix()
        reduced = [[0.0 + 0j] * keep_dim for _ in range(keep_dim)]
        for i in range(self.dim):
            for j in range(self.dim):
                if any(((i >> q) & 1) != ((j >> q) & 1) for q in trace_out):
                    continue
                idx_i = sum(((i >> q) & 1) << pos for pos, q in enumerate(keep))
                idx_j = sum(((j >> q) & 1) << pos for pos, q in enumerate(keep))
                reduced[idx_i][idx_j] += rho[i][j]
        return reduced

    def von_neumann_entropy(self, trace_out: List[int]) -> float:
        """计算约化密度矩阵的 von Neumann 熵 S = -Tr(rho log rho)。"""
        reduced = self.partial_trace(trace_out)
        vals = self._eigenvalues_2x2(reduced) if len(reduced) == 2 else self._eigenvalues_approx(reduced)
        entropy = 0.0
        for v in vals:
            if v > 1e-12:
                entropy -= v * math.log2(v)
        return entropy

    @staticmethod
    def _eigenvalues_2x2(m: List[List[complex]]) -> List[float]:
        """解析求解 2x2 厄米矩阵的特征值。"""
        a, b, c, d = m[0][0].real, m[0][1], m[1][0], m[1][1].real
        trace = a + d
        det = a * d - abs(b) ** 2
        disc = trace * trace - 4 * det
        disc = max(disc, 0.0)
        return [(trace + math.sqrt(disc)) / 2.0, (trace - math.sqrt(disc)) / 2.0]

    @staticmethod
    def _eigenvalues_approx(m: List[List[complex]]) -> List[float]:
        """简易幂迭代近似最大两个特征值。"""
        dim = len(m)
        vec = [random.random() for _ in range(dim)]
        norm = math.sqrt(sum(x * x for x in vec))
        vec = [x / norm for x in vec]
        for _ in range(20):
            new = [sum(m[i][j].real * vec[j] for j in range(dim)) for i in range(dim)]
            norm = math.sqrt(sum(x * x for x in new))
            vec = [x / norm for x in new]
        lambda1 = sum(vec[i] * sum(m[i][j].real * vec[j] for j in range(dim)) for i in range(dim))
        return [max(lambda1, 0.0), max(1.0 - lambda1, 0.0)]

    def bell_state(self, a: int = 0, b: int = 1) -> None:
        """在 qubit a, b 上制备 Bell 态 |Φ+> = (|00> + |11>)/sqrt(2)。"""
        self.reset()
        self.apply_single(QuantumGate.hadamard(), a)
        self.apply_cnot(a, b)

    def reset(self) -> None:
        """将电路重置为 |0...0>。"""
        self.state = [0.0 + 0j] * self.dim
        self.state[0] = 1.0 + 0j
        self.history.clear()

    def probabilities(self) -> List[float]:
        """返回所有计算基矢上的测量概率。"""
        return [abs(x) ** 2 for x in self.state]
