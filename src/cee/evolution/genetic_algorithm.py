"""
genetic_algorithm.py — 遗传算法引擎

实现标准 GA、精英保留、多种选择策略（轮盘赌、锦标赛、排序选择）、
多种交叉与变异算子，以及自适应参数调节。
"""

from __future__ import annotations

import math
import random
from typing import List, Callable, Tuple, Optional, Dict


class Chromosome:
    """实数编码染色体。"""

    def __init__(self, genes: List[float], bounds: Optional[List[Tuple[float, float]]] = None):
        self.genes = list(genes)
        self.bounds = bounds
        self.fitness: Optional[float] = None
        self.age = 0

    def copy(self) -> Chromosome:
        """返回基因副本。"""
        c = Chromosome(list(self.genes), self.bounds)
        c.fitness = self.fitness
        c.age = self.age
        return c

    def clamp(self) -> None:
        """将基因限制在边界内。"""
        if self.bounds is None:
            return
        for i, (lo, hi) in enumerate(self.bounds):
            self.genes[i] = max(lo, min(hi, self.genes[i]))

    def mutate_gaussian(self, rate: float = 0.1, sigma: float = 0.1) -> None:
        """高斯变异。"""
        for i in range(len(self.genes)):
            if random.random() < rate:
                self.genes[i] += random.gauss(0.0, sigma)
        self.clamp()

    def mutate_uniform(self, rate: float = 0.1) -> None:
        """均匀变异。"""
        if self.bounds is None:
            return
        for i in range(len(self.genes)):
            if random.random() < rate:
                lo, hi = self.bounds[i]
                self.genes[i] = random.uniform(lo, hi)

    def crossover_single_point(self, other: Chromosome) -> Tuple[Chromosome, Chromosome]:
        """单点交叉。"""
        if len(self.genes) < 2:
            return self.copy(), other.copy()
        point = random.randint(1, len(self.genes) - 1)
        g1 = self.genes[:point] + other.genes[point:]
        g2 = other.genes[:point] + self.genes[point:]
        c1 = Chromosome(g1, self.bounds)
        c2 = Chromosome(g2, self.bounds)
        return c1, c2

    def crossover_uniform(self, other: Chromosome, p: float = 0.5) -> Tuple[Chromosome, Chromosome]:
        """均匀交叉。"""
        g1, g2 = [], []
        for a, b in zip(self.genes, other.genes):
            if random.random() < p:
                g1.append(a)
                g2.append(b)
            else:
                g1.append(b)
                g2.append(a)
        return Chromosome(g1, self.bounds), Chromosome(g2, self.bounds)

    def distance(self, other: Chromosome) -> float:
        """欧氏距离。"""
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(self.genes, other.genes)))

    def to_dict(self) -> Dict:
        """序列化为字典。"""
        return {"genes": self.genes, "fitness": self.fitness, "age": self.age}


class GeneticAlgorithm:
    """遗传算法主引擎。"""

    def __init__(self, population_size: int = 100, chromosome_length: int = 10,
                 bounds: Optional[List[Tuple[float, float]]] = None,
                 maximize: bool = True):
        self.pop_size = population_size
        self.chromo_len = chromosome_length
        self.bounds = bounds or [(-5.0, 5.0)] * chromosome_length
        self.maximize = maximize
        self.population: List[Chromosome] = []
        self.generation = 0
        self.best_fitness_history: List[float] = []
        self.avg_fitness_history: List[float] = []
        self._init_population()

    def _init_population(self) -> None:
        """随机初始化种群。"""
        self.population = []
        for _ in range(self.pop_size):
            genes = [random.uniform(lo, hi) for lo, hi in self.bounds]
            self.population.append(Chromosome(genes, self.bounds))

    def evaluate(self, fitness_func: Callable[[List[float]], float]) -> None:
        """评估种群适应度。"""
        for chrom in self.population:
            if chrom.fitness is None:
                chrom.fitness = fitness_func(chrom.genes)

    def select_roulette(self, num: int) -> List[Chromosome]:
        """轮盘赌选择。"""
        fitnesses = [c.fitness or 0.0 for c in self.population]
        if not self.maximize:
            min_f = min(fitnesses)
            fitnesses = [f - min_f + 1e-6 for f in fitnesses]
        total = sum(fitnesses)
        probs = [f / total for f in fitnesses]
        selected = []
        for _ in range(num):
            r = random.random()
            cum = 0.0
            for chrom, p in zip(self.population, probs):
                cum += p
                if r <= cum:
                    selected.append(chrom.copy())
                    break
            else:
                selected.append(self.population[-1].copy())
        return selected

    def select_tournament(self, num: int, tournament_size: int = 3) -> List[Chromosome]:
        """锦标赛选择。"""
        selected = []
        for _ in range(num):
            contestants = random.sample(self.population, min(tournament_size, len(self.population)))
            winner = max(contestants, key=lambda c: c.fitness or float('-inf')) if self.maximize else min(contestants, key=lambda c: c.fitness or float('inf'))
            selected.append(winner.copy())
        return selected

    def select_rank(self, num: int) -> List[Chromosome]:
        """排序选择。"""
        sorted_pop = sorted(self.population, key=lambda c: c.fitness or 0.0, reverse=self.maximize)
        ranks = list(range(len(sorted_pop), 0, -1))
        total = sum(ranks)
        probs = [r / total for r in ranks]
        selected = []
        for _ in range(num):
            r = random.random()
            cum = 0.0
            for chrom, p in zip(sorted_pop, probs):
                cum += p
                if r <= cum:
                    selected.append(chrom.copy())
                    break
            else:
                selected.append(sorted_pop[-1].copy())
        return selected

    def evolve(self, fitness_func: Callable[[List[float]], float],
               generations: int = 100, crossover_rate: float = 0.8,
               mutation_rate: float = 0.1, elitism: int = 2,
               selection: str = "tournament") -> Chromosome:
        """运行遗传算法演化。"""
        self.evaluate(fitness_func)
        for _ in range(generations):
            self.generation += 1
            if selection == "roulette":
                parents = self.select_roulette(self.pop_size - elitism)
            elif selection == "rank":
                parents = self.select_rank(self.pop_size - elitism)
            else:
                parents = self.select_tournament(self.pop_size - elitism)

            offspring = []
            for i in range(0, len(parents) - 1, 2):
                p1, p2 = parents[i], parents[i + 1]
                if random.random() < crossover_rate:
                    c1, c2 = p1.crossover_single_point(p2)
                else:
                    c1, c2 = p1.copy(), p2.copy()
                c1.mutate_gaussian(mutation_rate)
                c2.mutate_gaussian(mutation_rate)
                offspring.extend([c1, c2])

            if elitism > 0:
                sorted_pop = sorted(self.population, key=lambda c: c.fitness or 0.0, reverse=self.maximize)
                offspring.extend([c.copy() for c in sorted_pop[:elitism]])

            self.population = offspring[:self.pop_size]
            for chrom in self.population:
                chrom.fitness = None
                chrom.age += 1
            self.evaluate(fitness_func)

            best = self.best_chromosome()
            avg = sum(c.fitness or 0.0 for c in self.population) / self.pop_size
            self.best_fitness_history.append(best.fitness or 0.0)
            self.avg_fitness_history.append(avg)

        return self.best_chromosome()

    def best_chromosome(self) -> Chromosome:
        """返回当前最优个体。"""
        if self.maximize:
            return max(self.population, key=lambda c: c.fitness or float('-inf'))
        return min(self.population, key=lambda c: c.fitness or float('inf'))

    def diversity(self) -> float:
        """计算种群多样性（平均 pairwise 距离）。"""
        total = 0.0
        count = 0
        for i in range(len(self.population)):
            for j in range(i + 1, len(self.population)):
                total += self.population[i].distance(self.population[j])
                count += 1
        return total / count if count > 0 else 0.0

    def adaptive_mutation(self, base_rate: float = 0.1) -> float:
        """基于多样性自适应调整变异率。"""
        div = self.diversity()
        max_dist = math.sqrt(sum((hi - lo) ** 2 for lo, hi in self.bounds))
        ratio = div / max_dist if max_dist > 0 else 0.0
        return base_rate * (1.5 - ratio)

    def convergence_rate(self, window: int = 10) -> float:
        """计算最近 window 代的收敛速度。"""
        if len(self.best_fitness_history) < window + 1:
            return 0.0
        recent = self.best_fitness_history[-window:]
        return abs(recent[-1] - recent[0]) / window
