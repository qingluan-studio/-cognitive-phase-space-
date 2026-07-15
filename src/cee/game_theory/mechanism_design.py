"""
mechanism_design.py — 机制设计引擎

实现 VCG 机制、拍卖设计、激励相容性验证、
以及社会福利最大化与收益最大化机制。
"""

from __future__ import annotations

import math
from typing import List, Tuple, Dict, Callable, Optional


class MechanismDesign:
    """机制设计分析引擎。"""

    def __init__(self, num_agents: int):
        self.num_agents = num_agents

    def vcg_mechanism(self, valuations: List[Dict[int, float]],
                      outcomes: List[int],
                      welfare_func: Callable[[int, List[Dict[int, float]]], float]) -> Tuple[int, List[float]]:
        """VCG 机制：选择社会福利最大化结果并计算支付。"""
        best_outcome = max(outcomes, key=lambda o: sum(welfare_func(o, valuations)))
        total_welfare = sum(welfare_func(best_outcome, valuations))
        payments = []
        for i in range(self.num_agents):
            others_welfare = sum(welfare_func(best_outcome, [v if j != i else {} for j, v in enumerate(valuations)]))
            without_i = max(outcomes, key=lambda o: sum(welfare_func(o, [v if j != i else {} for j, v in enumerate(valuations)])))
            without_i_welfare = sum(welfare_func(without_i, [v if j != i else {} for j, v in enumerate(valuations)]))
            payment = without_i_welfare - others_welfare
            payments.append(payment)
        return best_outcome, payments

    def incentive_compatibility_check(self, valuations: List[float],
                                      mechanism: Callable[[List[float]], Tuple[int, List[float]]]) -> bool:
        """检查机制是否满足激励相容性（简化版）。"""
        outcome, payments = mechanism(valuations)
        for i in range(self.num_agents):
            for deviated in [valuations[i] * 0.9, valuations[i] * 1.1]:
                new_vals = list(valuations)
                new_vals[i] = deviated
                new_outcome, new_payments = mechanism(new_vals)
                old_utility = valuations[i] - payments[i]
                new_utility = valuations[i] - new_payments[i]
                if new_utility > old_utility + 1e-6:
                    return False
        return True

    def individual_rationality_check(self, valuations: List[float],
                                     payments: List[float],
                                     outcomes: List[int],
                                     allocation: int) -> bool:
        """检查个体理性。"""
        for i in range(self.num_agents):
            utility = valuations[i] - payments[i]
            if utility < 0:
                return False
        return True

    def budget_balance(self, payments: List[float]) -> float:
        """计算预算平衡。"""
        return sum(payments)

    def efficiency_ratio(self, mechanism_welfare: float, optimal_welfare: float) -> float:
        """计算效率比率。"""
        return mechanism_welfare / optimal_welfare if optimal_welfare > 0 else 0.0

    def revenue_maximization_reserve(self, valuations: List[float],
                                     reserve_prices: List[float]) -> Tuple[float, List[float]]:
        """基于保留价的收益最大化。"""
        effective = [max(0.0, v - r) for v, r in zip(valuations, reserve_prices)]
        winner = max(range(self.num_agents), key=lambda i: effective[i])
        revenue = reserve_prices[winner] if effective[winner] > 0 else 0.0
        payments = [0.0] * self.num_agents
        if effective[winner] > 0:
            payments[winner] = revenue
        return revenue, payments

    def groves_payment(self, agent_id: int, chosen_outcome: int,
                       valuations: List[Dict[int, float]],
                       welfare_func: Callable[[int, List[Dict[int, float]]], float]) -> float:
        """计算 Groves 支付。"""
        others = [v if j != agent_id else {} for j, v in enumerate(valuations)]
        total_with = sum(welfare_func(chosen_outcome, others))
        best_without = max(range(len(valuations)), key=lambda o: sum(welfare_func(o, others)))
        total_without = sum(welfare_func(best_without, others))
        return total_without - total_with

    def social_welfare(self, outcome: int, valuations: List[float]) -> float:
        """计算社会福利。"""
        return sum(valuations)

    def allocation_efficiency(self, allocations: List[int], valuations: List[float]) -> float:
        """计算分配效率。"""
        return sum(v for i, v in enumerate(valuations) if allocations[i] > 0)

    def strategy_proofness_test(self, mechanism: Callable[[List[float]], Tuple[List[int], List[float]]],
                                valuation_space: List[List[float]], samples: int = 100) -> float:
        """测试策略证明性。"""
        violations = 0
        for _ in range(samples):
            vals = random.choice(valuation_space)
            alloc, payments = mechanism(vals)
            for i in range(self.num_agents):
                for deviated in [vals[i] - 1.0, vals[i] + 1.0]:
                    new_vals = list(vals)
                    new_vals[i] = deviated
                    new_alloc, new_pay = mechanism(new_vals)
                    old_util = vals[i] * alloc[i] - payments[i]
                    new_util = vals[i] * new_alloc[i] - new_pay[i]
                    if new_util > old_util + 1e-6:
                        violations += 1
        return 1.0 - violations / (samples * self.num_agents * 2)

    def expected_revenue(self, valuation_distribution: Callable[[], List[float]],
                         mechanism: Callable[[List[float]], Tuple[List[int], List[float]]],
                         trials: int = 1000) -> float:
        """估算期望收益。"""
        total = 0.0
        for _ in range(trials):
            vals = valuation_distribution()
            _, payments = mechanism(vals)
            total += sum(payments)
        return total / trials
