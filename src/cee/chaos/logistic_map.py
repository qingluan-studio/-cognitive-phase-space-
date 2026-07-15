"""
logistic_map.py — 逻辑斯蒂映射分析器

实现迭代、分岔图生成、Lyapunov 指数计算、
周期检测与符号动力学编码。
"""

from __future__ import annotations

import math
from typing import List, Tuple, Dict, Optional


class LogisticMap:
    """逻辑斯蒂映射 x_{n+1} = r * x_n * (1 - x_n)。"""

    def __init__(self, r: float = 3.8, x0: float = 0.5):
        self.r = r
        self.x = x0
        self.history: List[float] = []

    def iterate(self, steps: int = 100) -> List[float]:
        """迭代指定步数。"""
        for _ in range(steps):
            self.x = self.r * self.x * (1.0 - self.x)
            self.history.append(self.x)
        return self.history

    def next_value(self, x: float) -> float:
        """计算下一个值。"""
        return self.r * x * (1.0 - x)

    def fixed_points(self) -> List[float]:
        """解析计算不动点。"""
        points = [0.0]
        if self.r != 1.0:
            points.append(1.0 - 1.0 / self.r)
        return points

    def stability(self, x_star: float) -> float:
        """计算不动点的稳定性（导数绝对值）。"""
        return abs(self.r * (1.0 - 2.0 * x_star))

    def lyapunov_exponent(self, steps: int = 10000, transient: int = 1000) -> float:
        """计算 Lyapunov 指数。"""
        x = self.x
        for _ in range(transient):
            x = self.next_value(x)
        lyap_sum = 0.0
        for _ in range(steps):
            x = self.next_value(x)
            derivative = abs(self.r * (1.0 - 2.0 * x))
            if derivative > 0:
                lyap_sum += math.log(derivative)
        return lyap_sum / steps

    def bifurcation_diagram(self, r_min: float = 2.5, r_max: float = 4.0,
                            num_r: int = 2000, steps: int = 1000,
                            last: int = 100) -> Dict[float, List[float]]:
        """生成分岔图数据。"""
        diagram = {}
        for i in range(num_r):
            r = r_min + i * (r_max - r_min) / num_r
            x = 0.5
            for _ in range(steps - last):
                x = r * x * (1.0 - x)
            values = []
            for _ in range(last):
                x = r * x * (1.0 - x)
                values.append(x)
            diagram[r] = values
        return diagram

    def period_detection(self, max_period: int = 16, tolerance: float = 1e-6) -> int:
        """检测当前 r 下的吸引周期。"""
        x = 0.5
        for _ in range(1000):
            x = self.next_value(x)
        orbit = []
        for _ in range(max_period * 3):
            x = self.next_value(x)
            orbit.append(x)
        for p in range(1, max_period + 1):
            if all(abs(orbit[-1 - i] - orbit[-1 - i - p]) < tolerance for i in range(p)):
                return p
        return -1

    def symbol_dynamics(self, partition: float = 0.5, steps: int = 100) -> str:
        """生成符号动力学序列。"""
        x = self.x
        symbols = []
        for _ in range(steps):
            x = self.next_value(x)
            symbols.append("1" if x > partition else "0")
        return "".join(symbols)

    def entropy_rate(self, symbol_string: str, order: int = 3) -> float:
        """计算符号序列的熵率。"""
        from collections import Counter
        counts = Counter()
        for i in range(len(symbol_string) - order):
            counts[symbol_string[i:i + order]] += 1
        total = sum(counts.values())
        if total == 0:
            return 0.0
        entropy = 0.0
        for count in counts.values():
            p = count / total
            entropy -= p * math.log(p, 2)
        return entropy / order

    def histogram(self, bins: int = 100, steps: int = 100000) -> List[float]:
        """计算不变测度的直方图近似。"""
        x = 0.5
        for _ in range(1000):
            x = self.next_value(x)
        counts = [0] * bins
        for _ in range(steps):
            x = self.next_value(x)
            idx = int(x * bins)
            if 0 <= idx < bins:
                counts[idx] += 1
        total = sum(counts)
        return [c / total for c in counts] if total > 0 else counts

    def critical_r_values(self) -> List[float]:
        """返回已知的关键 r 值。"""
        return [1.0, 3.0, 1.0 + math.sqrt(6.0), 3.5699456718709449, 4.0]

    def topological_entropy_estimate(self, partition: float = 0.5, steps: int = 5000) -> float:
        """估算拓扑熵。"""
        sym = self.symbol_dynamics(partition, steps)
        unique_blocks = set()
        for length in range(1, 8):
            for i in range(len(sym) - length):
                unique_blocks.add(sym[i:i + length])
        if len(unique_blocks) == 0:
            return 0.0
        return math.log(len(unique_blocks), 2) / 7.0

    def cobweb_data(self, x0: float, steps: int = 50) -> List[Tuple[float, float]]:
        """生成蛛网图数据。"""
        points = []
        x = x0
        for _ in range(steps):
            y = self.next_value(x)
            points.append((x, x))
            points.append((x, y))
            x = y
        return points

    def reset(self, x0: float = 0.5) -> None:
        """重置状态。"""
        self.x = x0
        self.history.clear()

    def superstable_parameter(self, period: int) -> float:
        """返回指定周期的超稳定参数近似。"""
        approx = {1: 2.0, 2: 1.0 + math.sqrt(5.0), 4: 3.498561699}
        return approx.get(period, 3.5)
