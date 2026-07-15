"""
auction.py — 拍卖理论引擎

实现第一价格、第二价格（Vickrey）、全支付、
 ascending 与组合拍卖模型。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Callable, Optional


class Auction:
    """拍卖基类。"""

    def __init__(self, num_bidders: int):
        self.num_bidders = num_bidders
        self.valuations: List[float] = [0.0] * num_bidders
        self.bids: List[float] = [0.0] * num_bidders
        self.winner = -1
        self.price = 0.0

    def set_valuations(self, valuations: List[float]) -> None:
        """设置估价。"""
        self.valuations = list(valuations)

    def set_bids(self, bids: List[float]) -> None:
        """设置报价。"""
        self.bids = list(bids)

    def allocate(self) -> int:
        """分配赢家。"""
        raise NotImplementedError

    def calculate_payment(self) -> float:
        """计算支付。"""
        raise NotImplementedError

    def bidder_utility(self, bidder_id: int) -> float:
        """计算投标人效用。"""
        if bidder_id == self.winner:
            return self.valuations[bidder_id] - self.price
        return 0.0

    def revenue(self) -> float:
        """拍卖收益。"""
        return self.price

    def efficiency(self) -> float:
        """效率：赢家是否为估价最高者。"""
        if self.winner < 0:
            return 0.0
        return 1.0 if self.valuations[self.winner] == max(self.valuations) else 0.0


class FirstPriceAuction(Auction):
    """第一价格密封拍卖。"""

    def allocate(self) -> int:
        """最高价者得。"""
        self.winner = max(range(self.num_bidders), key=lambda i: self.bids[i])
        return self.winner

    def calculate_payment(self) -> float:
        """赢家支付自己的报价。"""
        if self.winner >= 0:
            self.price = self.bids[self.winner]
        return self.price

    def equilibrium_bid(self, valuation: float,
                        distribution_cdf: Callable[[float], float]) -> float:
        """估算对称均衡报价策略（简化）。"""
        return valuation * 0.8

    def expected_revenue_symmetric(self, num_bidders: int,
                                   valuation_dist: Callable[[], float],
                                   trials: int = 1000) -> float:
        """估算期望收益。"""
        total = 0.0
        for _ in range(trials):
            vals = [valuation_dist() for _ in range(num_bidders)]
            self.set_valuations(vals)
            bids = [v * 0.8 for v in vals]
            self.set_bids(bids)
            self.allocate()
            self.calculate_payment()
            total += self.price
        return total / trials


class SecondPriceAuction(Auction):
    """第二价格密封拍卖 (Vickrey)。"""

    def allocate(self) -> int:
        """最高价者得。"""
        self.winner = max(range(self.num_bidders), key=lambda i: self.bids[i])
        return self.winner

    def calculate_payment(self) -> float:
        """赢家支付第二高价。"""
        if self.winner >= 0:
            sorted_bids = sorted(self.bids, reverse=True)
            self.price = sorted_bids[1] if len(sorted_bids) > 1 else 0.0
        return self.price

    def dominant_strategy(self, valuation: float) -> float:
        """真实报价是占优策略。"""
        return valuation

    def truth_telling_equilibrium(self) -> bool:
        """检验是否所有人都真实报价。"""
        return all(abs(self.bids[i] - self.valuations[i]) < 1e-6 for i in range(self.num_bidders))


class AllPayAuction(Auction):
    """全支付拍卖。"""

    def allocate(self) -> int:
        """最高价者得。"""
        self.winner = max(range(self.num_bidders), key=lambda i: self.bids[i])
        return self.winner

    def calculate_payment(self) -> float:
        """所有人支付报价。"""
        self.price = sum(self.bids)
        return self.price

    def bidder_utility(self, bidder_id: int) -> float:
        """全支付效用。"""
        if bidder_id == self.winner:
            return self.valuations[bidder_id] - self.bids[bidder_id]
        return -self.bids[bidder_id]

    def expected_effort(self, num_bidders: int,
                        valuation_dist: Callable[[], float],
                        trials: int = 1000) -> float:
        """估算期望总努力。"""
        total = 0.0
        for _ in range(trials):
            vals = [valuation_dist() for _ in range(num_bidders)]
            bids = [v / num_bidders for v in vals]
            total += sum(bids)
        return total / trials


class AscendingAuction(Auction):
    """升价拍卖（英式拍卖）。"""

    def __init__(self, num_bidders: int, increment: float = 0.1):
        super().__init__(num_bidders)
        self.increment = increment

    def run(self, max_price: float = 1000.0) -> Tuple[int, float]:
        """模拟升价过程。"""
        current_price = 0.0
        active = set(range(self.num_bidders))
        while len(active) > 1 and current_price < max_price:
            current_price += self.increment
            dropping = {i for i in active if self.valuations[i] < current_price}
            active -= dropping
        if active:
            self.winner = min(active)
            self.price = current_price - self.increment
        else:
            self.winner = -1
            self.price = 0.0
        return self.winner, self.price

    def allocate(self) -> int:
        """运行拍卖并返回赢家。"""
        self.run()
        return self.winner

    def calculate_payment(self) -> float:
        """返回最终价格。"""
        return self.price


class CombinatorialAuction:
    """组合拍卖（简化版）。"""

    def __init__(self, num_items: int, num_bidders: int):
        self.num_items = num_items
        self.num_bidders = num_bidders
        self.valuations: Dict[int, Dict[Tuple[int, ...], float]] = {i: {} for i in range(num_bidders)}

    def set_valuation(self, bidder: int, bundle: Tuple[int, ...], value: float) -> None:
        """设置对某个组合的估价。"""
        self.valuations[bidder][tuple(sorted(bundle))] = value

    def vcg_payments(self, allocation: Dict[int, Tuple[int, ...]]) -> Dict[int, float]:
        """计算 VCG 支付。"""
        total_welfare = sum(self.valuations[bidder].get(bundle, 0.0)
                            for bidder, bundle in allocation.items())
        payments = {}
        for bidder in range(self.num_bidders):
            without_bidder = {b: bundle for b, bundle in allocation.items() if b != bidder}
            welfare_without = sum(self.valuations[b].get(bundle, 0.0)
                                  for b, bundle in without_bidder.items())
            others_welfare = total_welfare - self.valuations[bidder].get(allocation.get(bidder, ()), 0.0)
            payments[bidder] = welfare_without - others_welfare
        return payments

    def greedy_allocation(self, bids: List[Tuple[int, Tuple[int, ...], float]]) -> Dict[int, Tuple[int, ...]]:
        """贪心分配算法。"""
        sorted_bids = sorted(bids, key=lambda x: x[2], reverse=True)
        allocated_items: set = set()
        allocation: Dict[int, Tuple[int, ...]] = {}
        for bidder, bundle, value in sorted_bids:
            if not any(item in allocated_items for item in bundle):
                allocation[bidder] = bundle
                allocated_items.update(bundle)
        return allocation

    def social_welfare(self, allocation: Dict[int, Tuple[int, ...]]) -> float:
        """计算社会福利。"""
        return sum(self.valuations[bidder].get(bundle, 0.0)
                   for bidder, bundle in allocation.items())

    def revenue(self, allocation: Dict[int, Tuple[int, ...]], payments: Dict[int, float]) -> float:
        """计算收益。"""
        return sum(payments.values())

    def envy_free_check(self, allocation: Dict[int, Tuple[int, ...]],
                        payments: Dict[int, float]) -> bool:
        """检查是否无嫉妒。"""
        for i in range(self.num_bidders):
            my_bundle = allocation.get(i, ())
            my_utility = self.valuations[i].get(my_bundle, 0.0) - payments.get(i, 0.0)
            for j in range(self.num_bidders):
                if i != j:
                    other_bundle = allocation.get(j, ())
                    other_utility = self.valuations[i].get(other_bundle, 0.0) - payments.get(j, 0.0)
                    if other_utility > my_utility + 1e-6:
                        return False
        return True
