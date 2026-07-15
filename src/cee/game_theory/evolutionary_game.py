"""
evolutionary_game.py — 演化博弈引擎

实现复制者动力学、进化稳定策略 (ESS) 检测、
多群体博弈与网络博弈模拟。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Optional


class EvolutionaryGame:
    """演化博弈分析引擎。"""

    def __init__(self, payoff_matrix: List[List[float]]):
        self.payoff_matrix = payoff_matrix
        self.n = len(payoff_matrix)

    def fitness(self, strategy: int, population: List[float]) -> float:
        """计算策略在种群中的适应度。"""
        return sum(self.payoff_matrix[strategy][j] * population[j] for j in range(self.n))

    def average_fitness(self, population: List[float]) -> float:
        """计算种群平均适应度。"""
        return sum(self.fitness(i, population) * population[i] for i in range(self.n))

    def replicator_dynamics(self, population: List[float], dt: float = 0.01,
                            steps: int = 1000) -> List[List[float]]:
        """模拟复制者动力学。"""
        history = [list(population)]
        pop = list(population)
        for _ in range(steps):
            fit = [self.fitness(i, pop) for i in range(self.n)]
            avg_fit = sum(f * pop[i] for i, f in enumerate(fit))
            pop = [pop[i] + dt * pop[i] * (fit[i] - avg_fit) for i in range(self.n)]
            pop = [max(0.0, p) for p in pop]
            total = sum(pop)
            if total > 0:
                pop = [p / total for p in pop]
            history.append(list(pop))
        return history

    def is_ess(self, strategy: int, epsilon: float = 1e-3) -> bool:
        """检测纯策略是否为进化稳定策略。"""
        for mutant in range(self.n):
            if mutant == strategy:
                continue
            pop = [epsilon if i == mutant else (1.0 - epsilon if i == strategy else 0.0)
                   for i in range(self.n)]
            fit_strategy = self.fitness(strategy, pop)
            fit_mutant = self.fitness(mutant, pop)
            if fit_strategy <= fit_mutant:
                return False
        return True

    def ess_set(self) -> List[int]:
        """找出所有纯策略 ESS。"""
        return [i for i in range(self.n) if self.is_ess(i)]

    def rest_points(self, grid: int = 100) -> List[List[float]]:
        """搜索内部不动点（简化版）。"""
        points = []
        for i in range(grid + 1):
            for j in range(grid + 1 - i):
                if self.n == 3:
                    pop = [i / grid, j / grid, 1.0 - (i + j) / grid]
                    fit = [self.fitness(k, pop) for k in range(3)]
                    avg = sum(f * pop[k] for k, f in enumerate(fit))
                    if all(abs(pop[k] * (fit[k] - avg)) < 1e-3 for k in range(3)):
                        points.append(pop)
        return points

    def stable_equilibria(self, candidates: List[List[float]], dt: float = 0.01) -> List[List[float]]:
        """通过扰动测试稳定性。"""
        stable = []
        for eq in candidates:
            perturbed = [eq[i] + random.gauss(0.0, 0.01) for i in range(self.n)]
            perturbed = [max(0.0, p) for p in perturbed]
            total = sum(perturbed)
            perturbed = [p / total for p in perturbed]
            history = self.replicator_dynamics(perturbed, dt, 500)
            final = history[-1]
            if all(abs(final[i] - eq[i]) < 0.05 for i in range(self.n)):
                stable.append(eq)
        return stable

    def lyapunov_function(self, population: List[float]) -> float:
        """计算势能函数（对称博弈）。"""
        pot = 0.0
        for i in range(self.n):
            for j in range(self.n):
                pot += self.payoff_matrix[i][j] * population[i] * population[j]
        return pot

    def convergence_time(self, init: List[float], target: List[float],
                         tolerance: float = 1e-3, max_steps: int = 10000) -> int:
        """估算收敛时间。"""
        pop = list(init)
        for t in range(max_steps):
            if all(abs(pop[i] - target[i]) < tolerance for i in range(self.n)):
                return t
            fit = [self.fitness(i, pop) for i in range(self.n)]
            avg_fit = sum(f * pop[i] for i, f in enumerate(fit))
            pop = [pop[i] + 0.01 * pop[i] * (fit[i] - avg_fit) for i in range(self.n)]
            total = sum(pop)
            if total > 0:
                pop = [p / total for p in pop]
        return max_steps

    def network_game(self, network_adj: List[List[int]],
                     initial_strategies: List[int],
                     steps: int = 100) -> List[int]:
        """网络博弈模拟（最佳反应更新）。"""
        n = len(network_adj)
        strategies = list(initial_strategies)
        for _ in range(steps):
            new_strategies = list(strategies)
            for i in range(n):
                neighbor_payoffs = {}
                for j in range(n):
                    if network_adj[i][j] == 1:
                        s = strategies[j]
                        neighbor_payoffs[s] = neighbor_payoffs.get(s, 0) + self.payoff_matrix[strategies[i]][s]
                if neighbor_payoffs:
                    best = max(neighbor_payoffs.items(), key=lambda x: x[1])[0]
                    new_strategies[i] = best
            if new_strategies == strategies:
                break
            strategies = new_strategies
        return strategies

    def public_goods_game(self, contribution: float, multiplier: float,
                          n_players: int, population: List[float]) -> List[float]:
        """公共品博弈的复制者动力学。"""
        coop_payoff = multiplier * contribution * n_players * population[0] / n_players - contribution
        defector_payoff = multiplier * contribution * n_players * population[0] / n_players
        avg = population[0] * coop_payoff + population[1] * defector_payoff
        return [population[0] * (coop_payoff - avg), population[1] * (defector_payoff - avg)]

    def snowdrift_game(b: float = 2.0, c: float = 1.0) -> EvolutionaryGame:
        """雪堆博弈。"""
        return EvolutionaryGame([[b - c / 2.0, b - c], [b, 0.0]])

    def hawk_dove_game(v: float = 2.0, c: float = 4.0) -> EvolutionaryGame:
        """鹰鸽博弈。"""
        return EvolutionaryGame([[(v - c) / 2.0, v], [0.0, v / 2.0]])

    def coordination_game(a: float = 2.0, b: float = 0.0, c: float = 0.0, d: float = 1.0) -> EvolutionaryGame:
        """协调博弈。"""
        return EvolutionaryGame([[a, b], [c, d]])

    def mutation_influx(self, population: List[float], mutation_rate: float = 0.001) -> List[float]:
        """引入突变。"""
        new_pop = [(1.0 - mutation_rate) * p + mutation_rate / self.n for p in population]
        total = sum(new_pop)
        return [p / total for p in new_pop]

    def stationary_distribution_approx(self, mutation_rate: float = 0.001,
                                       steps: int = 5000) -> List[float]:
        """近似平稳分布。"""
        pop = [1.0 / self.n] * self.n
        for _ in range(steps):
            fit = [self.fitness(i, pop) for i in range(self.n)]
            avg = sum(f * pop[i] for i, f in enumerate(fit))
            pop = [pop[i] + 0.01 * pop[i] * (fit[i] - avg) for i in range(self.n)]
            pop = self.mutation_influx(pop, mutation_rate)
        return pop
