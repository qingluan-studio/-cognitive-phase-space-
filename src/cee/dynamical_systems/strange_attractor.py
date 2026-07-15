"""
strange_attractor.py — 奇异吸引子引擎

实现 Rossler、Chen、Lu 等吸引子的数值模拟，
支持 Kaplan-Yorke 维数估算与吸引子重构。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class StrangeAttractor:
    """奇异吸引子模拟器。"""

    def __init__(self, params: Dict[str, float], system: str = "rossler"):
        self.params = params
        self.system = system
        self.state = [1.0, 1.0, 1.0]
        self.history: List[List[float]] = []

    def derivatives(self, state: List[float]) -> List[float]:
        """计算当前系统的导数。"""
        x, y, z = state
        if self.system == "rossler":
            a = self.params.get("a", 0.2)
            b = self.params.get("b", 0.2)
            c = self.params.get("c", 5.7)
            return [-y - z, x + a * y, b + z * (x - c)]
        elif self.system == "chen":
            a = self.params.get("a", 35.0)
            b = self.params.get("b", 3.0)
            c = self.params.get("c", 28.0)
            return [a * (y - x), (c - a) * x - x * z + c * y, x * y - b * z]
        elif self.system == "lu":
            a = self.params.get("a", 36.0)
            b = self.params.get("b", 3.0)
            c = self.params.get("c", 20.0)
            return [a * (y - x), -x * z + c * y, x * y - b * z]
        return [0.0, 0.0, 0.0]

    def step_rk4(self, dt: float = 0.01) -> None:
        """RK4 单步。"""
        x = self.state
        k1 = self.derivatives(x)
        k2 = self.derivatives([x[i] + 0.5 * dt * k1[i] for i in range(3)])
        k3 = self.derivatives([x[i] + 0.5 * dt * k2[i] for i in range(3)])
        k4 = self.derivatives([x[i] + dt * k3[i] for i in range(3)])
        self.state = [x[i] + dt / 6.0 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) for i in range(3)]
        self.history.append(list(self.state))

    def integrate(self, steps: int, dt: float = 0.01) -> List[List[float]]:
        """积分指定步数。"""
        for _ in range(steps):
            self.step_rk4(dt)
        return self.history

    def kaplan_yorke_dim(self, lyapunov_spectrum: List[float]) -> float:
        """计算 Kaplan-Yorke 维数。"""
        sorted_le = sorted(lyapunov_spectrum, reverse=True)
        D = 0.0
        cumsum = 0.0
        for i, le in enumerate(sorted_le):
            cumsum += le
            if cumsum < 0:
                if i > 0:
                    D = i - 1 + (cumsum + abs(le)) / abs(le) if le != 0 else float(i - 1)
                break
            D = float(i + 1)
        else:
            if cumsum >= 0:
                D = len(sorted_le)
        return D

    def lyapunov_spectrum_approx(self, dt: float = 0.01, steps: int = 5000,
                                  transient: int = 1000) -> List[float]:
        """近似 Lyapunov 指数谱。"""
        main = list(self.state)
        perturbations = [[1.0 if i == j else 0.0 for j in range(3)] for i in range(3)]
        lyap_sums = [0.0] * 3
        for _ in range(transient):
            main = self._rk4_step_state(main, dt)
        for _ in range(steps):
            main = self._rk4_step_state(main, dt)
            for i in range(3):
                pert = [main[j] + 1e-10 * perturbations[i][j] for j in range(3)]
                pert = self._rk4_step_state(pert, dt)
                diff = [pert[j] - main[j] for j in range(3)]
                norm = math.sqrt(sum(d ** 2 for d in diff))
                if norm > 0:
                    lyap_sums[i] += math.log(norm / 1e-10)
                    perturbations[i] = [d / norm for d in diff]
        return [l / (steps * dt) for l in lyap_sums]

    def _rk4_step_state(self, state: List[float], dt: float) -> List[float]:
        """对任意状态 RK4 单步。"""
        old = self.state
        self.state = state
        k1 = self.derivatives(state)
        k2 = self.derivatives([state[i] + 0.5 * dt * k1[i] for i in range(3)])
        k3 = self.derivatives([state[i] + 0.5 * dt * k2[i] for i in range(3)])
        k4 = self.derivatives([state[i] + dt * k3[i] for i in range(3)])
        result = [state[i] + dt / 6.0 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) for i in range(3)]
        self.state = old
        return result

    def correlation_dimension(self, r_min: float = 0.1, r_max: float = 10.0,
                              num_r: int = 20) -> float:
        """估算关联维数。"""
        if len(self.history) < 100:
            return 0.0
        points = self.history[::10]
        rs = []
        cors = []
        for i in range(num_r):
            r = r_max * (r_min / r_max) ** (i / (num_r - 1))
            rs.append(math.log(r))
            count = 0
            n = len(points)
            for a in range(n):
                for b in range(a + 1, n):
                    dist = math.sqrt(sum((points[a][k] - points[b][k]) ** 2 for k in range(3)))
                    if dist < r:
                        count += 1
            cors.append(math.log(max(1, 2.0 * count / (n * (n - 1)))))
        return self._linear_regression(rs, cors)

    @staticmethod
    def _linear_regression(x: List[float], y: List[float]) -> float:
        n = len(x)
        if n < 2:
            return 0.0
        mx = sum(x) / n
        my = sum(y) / n
        num = sum((x[i] - mx) * (y[i] - my) for i in range(n))
        den = sum((x[i] - mx) ** 2 for i in range(n))
        return num / den if den != 0 else 0.0

    def embedding_dimension_test(self, max_dim: int = 10, delay: int = 5) -> List[float]:
        """虚假邻点法估算嵌入维数。"""
        if len(self.history) < max_dim * delay + 10:
            return []
        series = [h[0] for h in self.history]
        false_neighbor_ratios = []
        for dim in range(1, max_dim + 1):
            false_neighbors = 0
            total = 0
            for i in range(len(series) - dim * delay - 1):
                vec_i = [series[i + d * delay] for d in range(dim)]
                distances = []
                for j in range(len(series) - dim * delay):
                    if i != j:
                        vec_j = [series[j + d * delay] for d in range(dim)]
                        dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(vec_i, vec_j)))
                        distances.append((dist, j))
                if distances:
                    distances.sort()
                    nearest_dist, nearest_idx = distances[0]
                    vec_i_next = vec_i + [series[i + dim * delay]]
                    vec_j_next = [series[nearest_idx + d * delay] for d in range(dim + 1)]
                    new_dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(vec_i_next, vec_j_next)))
                    if nearest_dist > 0 and new_dist / nearest_dist > 10.0:
                        false_neighbors += 1
                    total += 1
            ratio = false_neighbors / total if total > 0 else 0.0
            false_neighbor_ratios.append(ratio)
        return false_neighbor_ratios

    def attractor_stats(self) -> Dict[str, float]:
        """计算吸引子统计信息。"""
        if not self.history:
            return {}
        xs = [h[0] for h in self.history]
        ys = [h[1] for h in self.history]
        zs = [h[2] for h in self.history]
        return {
            "x_range": max(xs) - min(xs),
            "y_range": max(ys) - min(ys),
            "z_range": max(zs) - min(zs),
            "volume_approx": (max(xs) - min(xs)) * (max(ys) - min(ys)) * (max(zs) - min(zs)),
        }

    def reset(self, x: float = 1.0, y: float = 1.0, z: float = 1.0) -> None:
        """重置状态。"""
        self.state = [x, y, z]
        self.history.clear()

    @staticmethod
    def rossler(a: float = 0.2, b: float = 0.2, c: float = 5.7) -> StrangeAttractor:
        """Rossler 吸引子。"""
        return StrangeAttractor({"a": a, "b": b, "c": c}, "rossler")

    @staticmethod
    def chen(a: float = 35.0, b: float = 3.0, c: float = 28.0) -> StrangeAttractor:
        """Chen 吸引子。"""
        return StrangeAttractor({"a": a, "b": b, "c": c}, "chen")

    @staticmethod
    def lu(a: float = 36.0, b: float = 3.0, c: float = 20.0) -> StrangeAttractor:
        """Lu 吸引子。"""
        return StrangeAttractor({"a": a, "b": b, "c": c}, "lu")

    def recurrence_plot(self, threshold: float = 0.5, max_points: int = 500) -> List[List[int]]:
        """生成递归图。"""
        points = self.history[:max_points]
        n = len(points)
        rp = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                dist = math.sqrt(sum((points[i][k] - points[j][k]) ** 2 for k in range(3)))
                if dist < threshold:
                    rp[i][j] = 1
        return rp

    def recurrence_quantification(self, rp: List[List[int]]) -> Dict[str, float]:
        """递归定量分析。"""
        n = len(rp)
        recurrence_rate = sum(sum(row) for row in rp) / (n * n)
        diagonal_lines = []
        for i in range(n - 1):
            length = 0
            for j in range(n - i):
                if rp[j][j + i] == 1:
                    length += 1
                else:
                    if length > 1:
                        diagonal_lines.append(length)
                    length = 0
        determinism = sum(diagonal_lines) / sum(sum(row) for row in rp) if recurrence_rate > 0 else 0.0
        return {"recurrence_rate": recurrence_rate, "determinism": determinism}
