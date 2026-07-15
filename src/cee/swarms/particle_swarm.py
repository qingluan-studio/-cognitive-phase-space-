"""
particle_swarm.py — 粒子群优化引擎

实现标准 PSO、惯性权重衰减、拓扑结构变体（全局、环形、星形）、
以及约束处理与多目标扩展。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Callable, Optional, Dict


class Particle:
    """PSO 中的单个粒子。"""

    def __init__(self, dim: int, bounds: List[Tuple[float, float]]):
        self.dim = dim
        self.bounds = bounds
        self.position = [random.uniform(lo, hi) for lo, hi in bounds]
        self.velocity = [random.uniform(-abs(hi - lo), abs(hi - lo)) for lo, hi in bounds]
        self.best_position = list(self.position)
        self.fitness = float('inf')
        self.best_fitness = float('inf')

    def update_velocity(self, global_best: List[float], w: float = 0.7,
                        c1: float = 1.5, c2: float = 1.5) -> None:
        """更新速度。"""
        for i in range(self.dim):
            r1 = random.random()
            r2 = random.random()
            cognitive = c1 * r1 * (self.best_position[i] - self.position[i])
            social = c2 * r2 * (global_best[i] - self.position[i])
            self.velocity[i] = w * self.velocity[i] + cognitive + social

    def update_position(self) -> None:
        """更新位置并限制在边界内。"""
        for i in range(self.dim):
            self.position[i] += self.velocity[i]
            lo, hi = self.bounds[i]
            if self.position[i] < lo:
                self.position[i] = lo
                self.velocity[i] *= -0.5
            elif self.position[i] > hi:
                self.position[i] = hi
                self.velocity[i] *= -0.5

    def evaluate(self, func: Callable[[List[float]], float]) -> None:
        """评估当前位置。"""
        self.fitness = func(self.position)
        if self.fitness < self.best_fitness:
            self.best_fitness = self.fitness
            self.best_position = list(self.position)

    def reset(self, bounds: Optional[List[Tuple[float, float]]] = None) -> None:
        """重置粒子。"""
        if bounds:
            self.bounds = bounds
        self.position = [random.uniform(lo, hi) for lo, hi in self.bounds]
        self.velocity = [random.uniform(-abs(hi - lo), abs(hi - lo)) for lo, hi in self.bounds]
        self.best_position = list(self.position)
        self.fitness = float('inf')
        self.best_fitness = float('inf')

    def distance_to(self, other: Particle) -> float:
        """与另一个粒子的欧氏距离。"""
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(self.position, other.position)))

    def convergence_measure(self) -> float:
        """返回速度范数作为收敛度量。"""
        return math.sqrt(sum(v ** 2 for v in self.velocity))


class ParticleSwarmOptimizer:
    """粒子群优化主引擎。"""

    def __init__(self, num_particles: int = 30, dim: int = 10,
                 bounds: Optional[List[Tuple[float, float]]] = None):
        self.num_particles = num_particles
        self.dim = dim
        self.bounds = bounds or [(-5.0, 5.0)] * dim
        self.particles = [Particle(dim, self.bounds) for _ in range(num_particles)]
        self.global_best_position: List[float] = [0.0] * dim
        self.global_best_fitness = float('inf')
        self.iteration = 0
        self.fitness_history: List[float] = []

    def optimize(self, func: Callable[[List[float]], float], max_iter: int = 100,
                 w: float = 0.7, c1: float = 1.5, c2: float = 1.5,
                 w_decay: bool = True) -> List[float]:
        """运行 PSO 优化。"""
        for p in self.particles:
            p.evaluate(func)
            if p.fitness < self.global_best_fitness:
                self.global_best_fitness = p.fitness
                self.global_best_position = list(p.position)

        for it in range(max_iter):
            self.iteration = it
            current_w = w * (1.0 - it / max_iter) if w_decay else w
            for p in self.particles:
                p.update_velocity(self.global_best_position, current_w, c1, c2)
                p.update_position()
                p.evaluate(func)
                if p.fitness < self.global_best_fitness:
                    self.global_best_fitness = p.fitness
                    self.global_best_position = list(p.position)
            self.fitness_history.append(self.global_best_fitness)
        return self.global_best_position

    def inertia_weight_adaptive(self, base_w: float = 0.9, min_w: float = 0.4) -> float:
        """基于种群多样性的自适应惯性权重。"""
        diversity = self.swarm_diversity()
        max_dist = math.sqrt(sum((hi - lo) ** 2 for lo, hi in self.bounds))
        ratio = diversity / max_dist if max_dist > 0 else 0.0
        return min_w + (base_w - min_w) * ratio

    def swarm_diversity(self) -> float:
        """计算 swarm 的位置多样性。"""
        center = [sum(p.position[i] for p in self.particles) / self.num_particles
                  for i in range(self.dim)]
        total = sum(math.sqrt(sum((p.position[i] - center[i]) ** 2 for i in range(self.dim)))
                    for p in self.particles)
        return total / self.num_particles

    def topology_ring_optimize(self, func: Callable[[List[float]], float],
                               max_iter: int = 100) -> List[float]:
        """环形拓扑 PSO。"""
        local_bests = [list(p.best_position) for p in self.particles]
        local_best_fits = [p.best_fitness for p in self.particles]

        for it in range(max_iter):
            for idx, p in enumerate(self.particles):
                left = local_bests[(idx - 1) % self.num_particles]
                right = local_bests[(idx + 1) % self.num_particles]
                if local_best_fits[(idx - 1) % self.num_particles] < local_best_fits[idx]:
                    neighbor_best = left
                else:
                    neighbor_best = local_bests[idx]
                if local_best_fits[(idx + 1) % self.num_particles] < local_best_fits[idx]:
                    if local_best_fits[(idx + 1) % self.num_particles] < local_best_fits[(idx - 1) % self.num_particles]:
                        neighbor_best = right

                for i in range(self.dim):
                    r1 = random.random()
                    r2 = random.random()
                    p.velocity[i] = (0.7 * p.velocity[i]
                                     + 1.5 * r1 * (p.best_position[i] - p.position[i])
                                     + 1.5 * r2 * (neighbor_best[i] - p.position[i]))
                p.update_position()
                p.evaluate(func)
                if p.fitness < local_best_fits[idx]:
                    local_best_fits[idx] = p.fitness
                    local_bests[idx] = list(p.position)
            self.fitness_history.append(min(local_best_fits))
        self.global_best_fitness = min(local_best_fits)
        self.global_best_position = local_bests[local_best_fits.index(self.global_best_fitness)]
        return self.global_best_position

    def convergence_curve(self) -> List[float]:
        """返回收敛历史。"""
        return list(self.fitness_history)

    def stagnation_detect(self, window: int = 10, tol: float = 1e-6) -> bool:
        """检测是否停滞。"""
        if len(self.fitness_history) < window:
            return False
        recent = self.fitness_history[-window:]
        return max(recent) - min(recent) < tol

    def reinitialize_stagnant(self, func: Callable[[List[float]], float], threshold: int = 20) -> None:
        """对停滞粒子重新初始化。"""
        if len(self.fitness_history) < threshold:
            return
        stagnant = [p for p in self.particles if p.convergence_measure() < 1e-4]
        for p in stagnant:
            p.reset()
            p.evaluate(func)

    def multi_objective_pareto(self, objectives: List[Callable[[List[float]], float]], max_iter: int = 100) -> List[Particle]:
        """简易多目标 PSO，返回近似 Pareto 前沿。"""
        archive: List[Particle] = []
        for _ in range(max_iter):
            for p in self.particles:
                p.fitness = sum(obj(p.position) for obj in objectives)
                dominated = False
                to_remove = []
                for a in archive:
                    if all(obj(p.position) >= obj(a.position) for obj in objectives) and any(obj(p.position) > obj(a.position) for obj in objectives):
                        dominated = True
                        break
                    if all(obj(a.position) >= obj(p.position) for obj in objectives) and any(obj(a.position) > obj(p.position) for obj in objectives):
                        to_remove.append(a)
                for r in to_remove:
                    if r in archive:
                        archive.remove(r)
                if not dominated:
                    archive.append(p.copy())
            for p in self.particles:
                p.update_position()
        return archive
