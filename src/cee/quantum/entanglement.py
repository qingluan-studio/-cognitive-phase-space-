"""
entanglement.py — 量子纠缠引擎

实现纠缠检测、纠缠熵计算、纠缠蒸馏协议、
以及基于 CHSH 不等式的贝尔不等式检验。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class EntanglementEngine:
    """纠缠分析引擎：检测、量化并操作量子纠缠。"""

    def __init__(self, tol: float = 1e-9):
        self.tol = tol
        self._bell_basis = self._build_bell_basis()

    def _build_bell_basis(self) -> List[List[List[complex]]]:
        """构建四个标准 Bell 态的密度矩阵表示。"""
        s = 1.0 / math.sqrt(2.0)
        states = [
            [s, 0.0 + 0j, 0.0 + 0j, s],
            [s, 0.0 + 0j, 0.0 + 0j, -s],
            [0.0 + 0j, s, s, 0.0 + 0j],
            [0.0 + 0j, s, -s, 0.0 + 0j],
        ]
        matrices = []
        for st in states:
            rho = [[st[i] * st[j].conjugate() for j in range(4)] for i in range(4)]
            matrices.append(rho)
        return matrices

    def is_separable(self, rho: List[List[complex]]) -> bool:
        """通过 PPT (正偏转置) 判据检测 2x2 系统的可分离性。"""
        ppt = self._partial_transpose(rho)
        eigenvalues = self._eigenvalues_4x4(ppt)
        return all(v >= -self.tol for v in eigenvalues)

    def _partial_transpose(self, rho: List[List[complex]]) -> List[List[complex]]:
        """对 2-qubit 密度矩阵的第二个子系统做偏转置。"""
        ppt = [[0.0 + 0j] * 4 for _ in range(4)]
        for i in range(2):
            for j in range(2):
                for k in range(2):
                    for l in range(2):
                        row = i * 2 + k
                        col = j * 2 + l
                        nrow = i * 2 + l
                        ncol = j * 2 + k
                        ppt[nrow][ncol] = rho[row][col]
        return ppt

    def _eigenvalues_4x4(self, m: List[List[complex]]) -> List[float]:
        """通过特征多项式近似求解 4x4 厄米矩阵特征值。"""
        import numpy as np
        arr = np.array([[x.real for x in row] for row in m], dtype=float)
        vals = np.linalg.eigvalsh(arr)
        return [float(v) for v in vals]

    def concurrence(self, rho: List[List[complex]]) -> float:
        """计算 Wootters 纠缠并发度。"""
        sigma_y = [[0.0 + 0j, -0.0 - 1.0j], [0.0 + 1.0j, 0.0 + 0j]]
        rtilde = self._spin_flip(rho, sigma_y)
        R = self._matrix_sqrt(self._matrix_mult(rho, rtilde))
        eigenvalues = sorted(self._eigenvalues_4x4(R), reverse=True)
        val = max(0.0, eigenvalues[0] - eigenvalues[1] - eigenvalues[2] - eigenvalues[3])
        return val

    def _spin_flip(self, rho: List[List[complex]], sy: List[List[complex]]) -> List[List[complex]]:
        """对密度矩阵执行自旋翻转操作。"""
        sy_t = [[sy[i][j].conjugate() for j in range(2)] for i in range(2)]
        rtilde = [[0.0 + 0j] * 4 for _ in range(4)]
        for i1 in range(2):
            for j1 in range(2):
                for i2 in range(2):
                    for j2 in range(2):
                        for k1 in range(2):
                            for l1 in range(2):
                                for k2 in range(2):
                                    for l2 in range(2):
                                        rtilde[i1 * 2 + i2][j1 * 2 + j2] += (
                                            sy_t[i1][k1] * sy_t[i2][k2] *
                                            rho[k1 * 2 + k2][l1 * 2 + l2].conjugate() *
                                            sy[l1][j1] * sy[l2][j2]
                                        )
        return rtilde

    def _matrix_mult(self, a: List[List[complex]], b: List[List[complex]]) -> List[List[complex]]:
        """矩阵乘法。"""
        n = len(a)
        return [[sum(a[i][k] * b[k][j] for k in range(n)) for j in range(n)] for i in range(n)]

    def _matrix_sqrt(self, m: List[List[complex]]) -> List[List[complex]]:
        """通过幂级数近似矩阵平方根。"""
        n = len(m)
        I = [[1.0 + 0j if i == j else 0.0 + 0j for j in range(n)] for i in range(n)]
        X = [[m[i][j] for j in range(n)] for i in range(n)]
        result = [[I[i][j] for j in range(n)] for i in range(n)]
        coeff = 1.0
        for k in range(1, 10):
            coeff *= (0.5 - k + 1) / k
            X = self._matrix_mult(X, m)
            for i in range(n):
                for j in range(n):
                    result[i][j] += coeff * X[i][j]
        return result

    def entanglement_entropy(self, rho: List[List[complex]], party: str = "A") -> float:
        """计算约化密度矩阵的纠缠熵。"""
        reduced = self._partial_trace(rho, party)
        vals = self._eigenvalues_2x2(reduced)
        entropy = 0.0
        for v in vals:
            if v > self.tol:
                entropy -= v * math.log2(v)
        return entropy

    def _partial_trace(self, rho: List[List[complex]], party: str) -> List[List[complex]]:
        """对指定方求偏迹。"""
        reduced = [[0.0 + 0j] * 2 for _ in range(2)]
        for i in range(2):
            for j in range(2):
                if party == "A":
                    reduced[i][j] = rho[0 * 2 + i][0 * 2 + j] + rho[1 * 2 + i][1 * 2 + j]
                else:
                    reduced[i][j] = rho[i * 2 + 0][j * 2 + 0] + rho[i * 2 + 1][j * 2 + 1]
        return reduced

    @staticmethod
    def _eigenvalues_2x2(m: List[List[complex]]) -> List[float]:
        a, b, c, d = m[0][0].real, m[0][1], m[1][0], m[1][1].real
        trace = a + d
        det = a * d - abs(b) ** 2
        disc = trace * trace - 4 * det
        disc = max(disc, 0.0)
        return [(trace + math.sqrt(disc)) / 2.0, (trace - math.sqrt(disc)) / 2.0]

    def chsh_inequality(self, rho: List[List[complex]], angles: Optional[List[float]] = None) -> Tuple[float, bool]:
        """计算 CHSH 量 S，若 |S| > 2 则违反贝尔不等式。"""
        if angles is None:
            angles = [0.0, math.pi / 4.0, math.pi / 8.0, 3.0 * math.pi / 8.0]
        a, a_prime, b, b_prime = angles
        S = (
            self._correlator(rho, a, b)
            + self._correlator(rho, a, b_prime)
            + self._correlator(rho, a_prime, b)
            - self._correlator(rho, a_prime, b_prime)
        )
        return S, abs(S) > 2.0 + self.tol

    def _correlator(self, rho: List[List[complex]], theta_a: float, theta_b: float) -> float:
        """计算关联函数 E = Tr(rho * A(theta_a) ⊗ B(theta_b))。"""
        A = [math.cos(2 * theta_a), math.sin(2 * theta_a)]
        B = [math.cos(2 * theta_b), math.sin(2 * theta_b)]
        E = 0.0
        for i in range(2):
            for j in range(2):
                for k in range(2):
                    for l in range(2):
                        coeff = ((-1) ** i) * A[i] * ((-1) ** k) * B[k]
                        idx_i = i * 2 + k
                        idx_j = j * 2 + l
                        if i == j and k == l:
                            E += coeff * rho[idx_i][idx_j].real
        return E

    def distill(self, noisy_states: List[List[List[complex]]], rounds: int = 3) -> List[List[complex]]:
        """简易纠缠蒸馏：迭代去极化并提纯。"""
        if not noisy_states:
            raise ValueError("需要至少一个输入态")
        rho = noisy_states[0]
        for _ in range(rounds):
            rho = self._twirl_depolarize(rho)
            rho = self._bilateral_cnot_purify(rho)
        return rho

    def _twirl_depolarize(self, rho: List[List[complex]]) -> List[List[complex]]:
        """对 Bell 对角态进行 twirling 操作。"""
        diag = [rho[i][i].real for i in range(4)]
        total = sum(diag)
        if total > 0:
            diag = [d / total for d in diag]
        new_rho = [[0.0 + 0j] * 4 for _ in range(4)]
        for i in range(4):
            new_rho[i][i] = diag[i] + 0j
        return new_rho

    def _bilateral_cnot_purify(self, rho: List[List[complex]]) -> List[List[complex]]:
        """双边 CNOT 提纯步骤的近似实现。"""
        p = rho[0][0].real + rho[3][3].real
        if p < self.tol:
            p = self.tol
        new_rho = [[0.0 + 0j] * 4 for _ in range(4)]
        new_rho[0][0] = rho[0][0] / p
        new_rho[3][3] = rho[3][3] / p
        return new_rho

    def negativity(self, rho: List[List[complex]]) -> float:
        """计算纠缠负性 N = (||rho^{T_A}||_1 - 1) / 2。"""
        ppt = self._partial_transpose(rho)
        eigenvalues = self._eigenvalues_4x4(ppt)
        norm = sum(abs(v) for v in eigenvalues)
        return (norm - 1.0) / 2.0

    def fidelity_with_bell(self, rho: List[List[complex]], bell_idx: int = 0) -> float:
        """计算给定态与指定 Bell 态的保真度。"""
        bell = self._bell_basis[bell_idx]
        f = 0.0
        for i in range(4):
            for j in range(4):
                f += (bell[i][j] * rho[j][i]).real
        return f
