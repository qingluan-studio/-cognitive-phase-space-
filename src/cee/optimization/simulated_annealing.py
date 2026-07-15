"""
simulated_annealing.py — 模拟退火引擎

实现经典 SA、快速 SA、自适应冷却调度、
以及多目标退火与约束处理。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Callable, Optional


class SimulatedAnnealing:
    """模拟退火优化器。"""

    def __init__(self, initial_temp: float = 100.0, cooling_rate: float = 0.95):
        self.temp = initial_temp
        self.cooling_rate = cooling_rate
        self.history: List[Tuple[float, float]] = []

    def acceptance_probability(self, delta: float, temperature: float) -> float:
        """Metropolis 接受概率。"""
        if delta < 0:
            return 1.0
        return math.exp(-delta / temperature)

    def optimize(self, f: Callable[[List[float]], float],
                 x0: List[float], bounds: List[Tuple[float, float]],
                 steps: int = 10000, step_size: float = 0.1) -> List[float]:
        """经典模拟退火。"""
        x = list(x0)
        best_x = list(x0)
        current_energy = f(x)
        best_energy = current_energy
        temperature = self.temp

        for _ in range(steps):
            neighbor = [x[i] + random.uniform(-step_size, step_size) for i in range(len(x))]
            for i in range(len(x)):
                neighbor[i] = max(bounds[i][0], min(bounds[i][1], neighbor[i]))
            neighbor_energy = f(neighbor)
            delta = neighbor_energy - current_energy
            if random.random() < self.acceptance_probability(delta, temperature):
                x = neighbor
                current_energy = neighbor_energy
                if current_energy < best_energy:
                    best_energy = current_energy
                    best_x = list(x)
            temperature *= self.cooling_rate
            self.history.append((temperature, current_energy))

        return best_x

    def fast_sa(self, f: Callable[[List[float]], float],
                x0: List[float], bounds: List[Tuple[float, float]],
                steps: int = 10000) -> List[float]:
        """快速模拟退火（柯西分布扰动）。"""
        x = list(x0)
        best_x = list(x0)
        current_energy = f(x)
        best_energy = current_energy

        for t in range(1, steps + 1):
            temperature = self.temp / t
            neighbor = [x[i] + temperature * math.tan(math.pi * (random.random() - 0.5))
                        for i in range(len(x))]
            for i in range(len(x)):
                neighbor[i] = max(bounds[i][0], min(bounds[i][1], neighbor[i]))
            neighbor_energy = f(neighbor)
            delta = neighbor_energy - current_energy
            if random.random() < self.acceptance_probability(delta, temperature):
                x = neighbor
                current_energy = neighbor_energy
                if current_energy < best_energy:
                    best_energy = current_energy
                    best_x = list(x)
            self.history.append((temperature, current_energy))

        return best_x

    def adaptive_schedule(self, f: Callable[[List[float]], float],
                          x0: List[float], bounds: List[Tuple[float, float]],
                          steps: int = 10000, target_rate: float = 0.44) -> List[float]:
        """自适应冷却调度。"""
        x = list(x0)
        best_x = list(x0)
        current_energy = f(x)
        best_energy = current_energy
        temperature = self.temp
        accepted = 0
        total = 0

        for _ in range(steps):
            neighbor = [x[i] + random.uniform(-0.1, 0.1) for i in range(len(x))]
            for i in range(len(x)):
                neighbor[i] = max(bounds[i][0], min(bounds[i][1], neighbor[i]))
            neighbor_energy = f(neighbor)
            delta = neighbor_energy - current_energy
            total += 1
            if random.random() < self.acceptance_probability(delta, temperature):
                x = neighbor
                current_energy = neighbor_energy
                accepted += 1
                if current_energy < best_energy:
                    best_energy = current_energy
                    best_x = list(x)
            if total % 100 == 0:
                rate = accepted / total
                if rate > target_rate:
                    temperature *= 0.9
                else:
                    temperature *= 1.1
            self.history.append((temperature, current_energy))

        return best_x

    def constrained_sa(self, f: Callable[[List[float]], float],
                       constraint: Callable[[List[float]], float],
                       x0: List[float], bounds: List[Tuple[float, float]],
                       steps: int = 10000, penalty: float = 1000.0) -> List[float]:
        """带约束的模拟退火。"""
        def penalized(x):
            c = constraint(x)
            return f(x) + penalty * max(0.0, c) ** 2
        return self.optimize(penalized, x0, bounds, steps)

    def multi_objective_sa(self, objectives: List[Callable[[List[float]], float]],
                           x0: List[float], bounds: List[Tuple[float, float]],
                           steps: int = 10000) -> List[List[float]]:
        """多目标模拟退火（返回 Pareto 前沿近似）。"""
        x = list(x0)
        archive = [list(x0)]
        temperature = self.temp

        for _ in range(steps):
            neighbor = [x[i] + random.uniform(-0.1, 0.1) for i in range(len(x))]
            for i in range(len(x)):
                neighbor[i] = max(bounds[i][0], min(bounds[i][1], neighbor[i]))
            neighbor_obj = [obj(neighbor) for obj in objectives]
            current_obj = [obj(x) for obj in objectives]
            dominated = False
            for a in archive:
                a_obj = [obj(a) for obj in objectives]
                if all(ao <= no for ao, no in zip(a_obj, neighbor_obj)) and any(ao < no for ao, no in zip(a_obj, neighbor_obj)):
                    dominated = True
                    break
            if not dominated:
                archive.append(neighbor)
                to_remove = []
                for a in archive:
                    a_obj = [obj(a) for obj in objectives]
                    if all(no <= ao for no, ao in zip(neighbor_obj, a_obj)) and any(no < ao for no, ao in zip(neighbor_obj, a_obj)):
                        to_remove.append(a)
                for r in to_remove:
                    if r in archive:
                        archive.remove(r)
            if random.random() < self.acceptance_probability(sum(neighbor_obj) - sum(current_obj), temperature):
                x = neighbor
            temperature *= self.cooling_rate

        return archive

    def reheating(self, f: Callable[[List[float]], float],
                  x0: List[float], bounds: List[Tuple[float, float]],
                  cycles: int = 5, steps_per_cycle: int = 2000) -> List[float]:
        """循环再加热模拟退火。"""
        x = list(x0)
        best_x = list(x0)
        best_energy = f(x)
        for _ in range(cycles):
            x = self.optimize(f, x, bounds, steps_per_cycle)
            energy = f(x)
            if energy < best_energy:
                best_energy = energy
                best_x = list(x)
            self.temp *= 2.0
        return best_x

    def convergence_curve(self) -> List[float]:
        """返回能量历史。"""
        return [e for _, e in self.history]

    @staticmethod
    def boltzmann_distribution(energies: List[float], temperature: float) -> List[float]:
        """Boltzmann 分布。"""
        weights = [math.exp(-e / temperature) for e in energies]
        total = sum(weights)
        return [w / total for w in weights] if total > 0 else weights
