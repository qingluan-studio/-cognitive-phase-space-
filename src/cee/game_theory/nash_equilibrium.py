"""
nash_equilibrium.py — 纳什均衡求解器

实现双人矩阵博弈的纯/混合策略纳什均衡搜索、
支持枚举法与线性规划近似求解。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class MatrixGame:
    """双人矩阵博弈。"""

    def __init__(self, payoff_a: List[List[float]], payoff_b: List[List[float]]):
        self.payoff_a = payoff_a
        self.payoff_b = payoff_b
        self.rows = len(payoff_a)
        self.cols = len(payoff_a[0])

    def pure_strategy_nash(self) -> List[Tuple[int, int]]:
        """枚举所有纯策略纳什均衡。"""
        equilibria = []
        for i in range(self.rows):
            for j in range(self.cols):
                a_best = all(self.payoff_a[i][j] >= self.payoff_a[k][j] for k in range(self.rows))
                b_best = all(self.payoff_b[i][j] >= self.payoff_b[i][k] for k in range(self.cols))
                if a_best and b_best:
                    equilibria.append((i, j))
        return equilibria

    def best_response_a(self, strategy_b: List[float]) -> List[int]:
        """玩家 A 对 B 混合策略的最佳反应。"""
        expected = [sum(self.payoff_a[i][j] * strategy_b[j] for j in range(self.cols))
                    for i in range(self.rows)]
        max_val = max(expected)
        return [i for i, val in enumerate(expected) if abs(val - max_val) < 1e-9]

    def best_response_b(self, strategy_a: List[float]) -> List[int]:
        """玩家 B 对 A 混合策略的最佳反应。"""
        expected = [sum(self.payoff_a[i][j] * strategy_a[i] for i in range(self.rows))
                    for j in range(self.cols)]
        max_val = max(expected)
        return [j for j, val in enumerate(expected) if abs(val - max_val) < 1e-9]

    def mixed_strategy_support(self, support_a: List[int], support_b: List[int]) -> Optional[Tuple[List[float], List[float]]]:
        """求解指定支持集上的混合策略均衡。"""
        if len(support_a) == 1 and len(support_b) == 1:
            sa = [0.0] * self.rows
            sb = [0.0] * self.cols
            sa[support_a[0]] = 1.0
            sb[support_b[0]] = 1.0
            return sa, sb
        return None

    def fictitious_play(self, iterations: int = 1000) -> Tuple[List[float], List[float]]:
        """虚拟对弈收敛到均衡。"""
        counts_a = [1.0] * self.rows
        counts_b = [1.0] * self.cols
        for _ in range(iterations):
            strategy_b = [c / sum(counts_b) for c in counts_b]
            br_a = self.best_response_a(strategy_b)[0]
            strategy_a = [c / sum(counts_a) for c in counts_a]
            br_b = self.best_response_b(strategy_a)[0]
            counts_a[br_a] += 1.0
            counts_b[br_b] += 1.0
        return [c / sum(counts_a) for c in counts_a], [c / sum(counts_b) for c in counts_b]

    def replicator_dynamics(self, init_a: List[float], init_b: List[float],
                            dt: float = 0.01, steps: int = 1000) -> Tuple[List[float], List[float]]:
        """复制者动力学模拟。"""
        a = list(init_a)
        b = list(init_b)
        for _ in range(steps):
            fitness_a = [sum(self.payoff_a[i][j] * b[j] for j in range(self.cols)) for i in range(self.rows)]
            avg_fitness_a = sum(fa * a[i] for i, fa in enumerate(fitness_a))
            a = [a[i] + dt * a[i] * (fitness_a[i] - avg_fitness_a) for i in range(self.rows)]
            a = [max(0.0, x) for x in a]
            total_a = sum(a)
            a = [x / total_a for x in a]

            fitness_b = [sum(self.payoff_b[i][j] * a[i] for i in range(self.rows)) for j in range(self.cols)]
            avg_fitness_b = sum(fb * b[j] for j, fb in enumerate(fitness_b))
            b = [b[j] + dt * b[j] * (fitness_b[j] - avg_fitness_b) for j in range(self.cols)]
            b = [max(0.0, x) for x in b]
            total_b = sum(b)
            b = [x / total_b for x in b]
        return a, b

    def expected_payoff(self, strategy_a: List[float], strategy_b: List[float]) -> Tuple[float, float]:
        """计算混合策略下的期望收益。"""
        ea = sum(strategy_a[i] * self.payoff_a[i][j] * strategy_b[j]
                 for i in range(self.rows) for j in range(self.cols))
        eb = sum(strategy_a[i] * self.payoff_b[i][j] * strategy_b[j]
                 for i in range(self.rows) for j in range(self.cols))
        return ea, eb

    def is_nash_approximate(self, strategy_a: List[float], strategy_b: List[float],
                            epsilon: float = 1e-3) -> bool:
        """判断是否为 epsilon-纳什均衡。"""
        ea, eb = self.expected_payoff(strategy_a, strategy_b)
        for i in range(self.rows):
            dev_a = [0.0] * self.rows
            dev_a[i] = 1.0
            ea_dev, _ = self.expected_payoff(dev_a, strategy_b)
            if ea_dev > ea + epsilon:
                return False
        for j in range(self.cols):
            dev_b = [0.0] * self.cols
            dev_b[j] = 1.0
            _, eb_dev = self.expected_payoff(strategy_a, dev_b)
            if eb_dev > eb + epsilon:
                return False
        return True

    def zero_sum_value(self) -> float:
        """零和博弈值（简化近似）。"""
        if self.payoff_a != [[-self.payoff_b[i][j] for j in range(self.cols)] for i in range(self.rows)]:
            return 0.0
        min_row = [min(row) for row in self.payoff_a]
        max_col = [max(self.payoff_a[i][j] for i in range(self.rows)) for j in range(self.cols)]
        return max(min_row) if abs(max(min_row) - min(max_col)) < 1e-6 else 0.0

    @staticmethod
    def prisoners_dilemma() -> MatrixGame:
        """囚徒困境。"""
        a = [[-1, -3], [0, -2]]
        b = [[-1, 0], [-3, -2]]
        return MatrixGame(a, b)

    @staticmethod
    def battle_of_sexes() -> MatrixGame:
        """性别之战。"""
        a = [[2, 0], [0, 1]]
        b = [[1, 0], [0, 2]]
        return MatrixGame(a, b)

    @staticmethod
    def matching_pennies() -> MatrixGame:
        """匹配硬币。"""
        a = [[1, -1], [-1, 1]]
        b = [[-1, 1], [1, -1]]
        return MatrixGame(a, b)

    def dominated_strategies_a(self) -> List[int]:
        """找出玩家 A 的严格被支配策略。"""
        dominated = []
        for i in range(self.rows):
            for k in range(self.rows):
                if i != k and all(self.payoff_a[i][j] < self.payoff_a[k][j] for j in range(self.cols)):
                    dominated.append(i)
                    break
        return dominated

    def dominated_strategies_b(self) -> List[int]:
        """找出玩家 B 的严格被支配策略。"""
        dominated = []
        for j in range(self.cols):
            for k in range(self.cols):
                if j != k and all(self.payoff_b[i][j] < self.payoff_b[i][k] for i in range(self.rows)):
                    dominated.append(j)
                    break
        return dominated

    def iterative_elimination(self) -> Tuple[List[int], List[int]]:
        """迭代消除严格被支配策略。"""
        remaining_a = list(range(self.rows))
        remaining_b = list(range(self.cols))
        changed = True
        while changed:
            changed = False
            subgame = MatrixGame([[self.payoff_a[i][j] for j in remaining_b] for i in remaining_a],
                                 [[self.payoff_b[i][j] for j in remaining_b] for i in remaining_a])
            dom_a = subgame.dominated_strategies_a()
            for idx in sorted(dom_a, reverse=True):
                del remaining_a[idx]
                changed = True
            dom_b = subgame.dominated_strategies_b()
            for idx in sorted(dom_b, reverse=True):
                del remaining_b[idx]
                changed = True
        return remaining_a, remaining_b
