"""
coevolution.py — 协同进化引擎

实现竞争协同进化、互利共生模型、军备竞赛模拟、
以及基于宿主-寄主关系的 Red Queen 动力学。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Callable, Optional


class CoevolutionAgent:
    """协同进化中的单个智能体。"""

    def __init__(self, genome: List[float], agent_id: int, species: str = "default"):
        self.genome = list(genome)
        self.agent_id = agent_id
        self.species = species
        self.fitness = 0.0
        self.scores: List[float] = []

    def copy(self) -> CoevolutionAgent:
        """深拷贝。"""
        a = CoevolutionAgent(list(self.genome), self.agent_id, self.species)
        a.fitness = self.fitness
        return a

    def mutate(self, rate: float = 0.1, sigma: float = 0.1) -> None:
        """高斯变异。"""
        for i in range(len(self.genome)):
            if random.random() < rate:
                self.genome[i] += random.gauss(0.0, sigma)

    def phenotypic_distance(self, other: CoevolutionAgent) -> float:
        """表型距离。"""
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(self.genome, other.genome)))


class CompetitiveCoevolution:
    """竞争协同进化：两个种群相互对抗。"""

    def __init__(self, pop_size: int = 50, genome_len: int = 10):
        self.pop_size = pop_size
        self.genome_len = genome_len
        self.pop_a: List[CoevolutionAgent] = []
        self.pop_b: List[CoevolutionAgent] = []
        self.generation = 0
        self._init_populations()

    def _init_populations(self) -> None:
        """初始化两个种群。"""
        for i in range(self.pop_size):
            self.pop_a.append(CoevolutionAgent([random.uniform(-1.0, 1.0) for _ in range(self.genome_len)], i, "A"))
            self.pop_b.append(CoevolutionAgent([random.uniform(-1.0, 1.0) for _ in range(self.genome_len)], i, "B"))

    def interact(self, a: CoevolutionAgent, b: CoevolutionAgent) -> Tuple[float, float]:
        """计算对抗得分：距离越近，A 得分越高（模拟捕食）。"""
        dist = a.phenotypic_distance(b)
        score_a = 1.0 / (1.0 + dist)
        score_b = dist / (1.0 + dist)
        return score_a, score_b

    def evaluate(self) -> None:
        """评估所有对抗组合。"""
        for a in self.pop_a:
            a.scores.clear()
        for b in self.pop_b:
            b.scores.clear()
        for a in self.pop_a:
            opponents = random.sample(self.pop_b, min(5, len(self.pop_b)))
            for b in opponents:
                sa, sb = self.interact(a, b)
                a.scores.append(sa)
                b.scores.append(sb)
        for a in self.pop_a:
            a.fitness = sum(a.scores) / len(a.scores) if a.scores else 0.0
        for b in self.pop_b:
            b.fitness = sum(b.scores) / len(b.scores) if b.scores else 0.0

    def select_and_reproduce(self, population: List[CoevolutionAgent]) -> List[CoevolutionAgent]:
        """锦标赛选择生成新种群。"""
        new_pop = []
        for _ in range(self.pop_size):
            contestants = random.sample(population, 3)
            winner = max(contestants, key=lambda x: x.fitness)
            child = winner.copy()
            child.mutate()
            new_pop.append(child)
        return new_pop

    def evolve(self, generations: int = 100) -> Tuple[List[float], List[float]]:
        """运行协同进化。"""
        history_a = []
        history_b = []
        for _ in range(generations):
            self.generation += 1
            self.evaluate()
            history_a.append(max(a.fitness for a in self.pop_a))
            history_b.append(max(b.fitness for b in self.pop_b))
            self.pop_a = self.select_and_reproduce(self.pop_a)
            self.pop_b = self.select_and_reproduce(self.pop_b)
        return history_a, history_b

    def red_queen_metric(self, history_a: List[float], history_b: List[float]) -> float:
        """Red Queen 指标：双方适应度的持续竞争。"""
        if len(history_a) < 2:
            return 0.0
        improvements = sum(1 for i in range(1, len(history_a))
                           if history_a[i] > history_a[i - 1] or history_b[i] > history_b[i - 1])
        return improvements / (len(history_a) - 1)

    def arms_race_intensity(self, history: List[float]) -> float:
        """军备竞赛强度：适应度增长率的方差。"""
        if len(history) < 3:
            return 0.0
        deltas = [history[i] - history[i - 1] for i in range(1, len(history))]
        mean_d = sum(deltas) / len(deltas)
        var = sum((d - mean_d) ** 2 for d in deltas) / len(deltas)
        return math.sqrt(var)

    def dominant_strategy(self, population: List[CoevolutionAgent]) -> List[float]:
        """计算优势策略（种群平均基因组）。"""
        n = self.genome_len
        return [sum(a.genome[i] for a in population) / len(population) for i in range(n)]

    def niche_overlap(self) -> float:
        """计算两个种群之间的生态位重叠。"""
        mean_a = self.dominant_strategy(self.pop_a)
        mean_b = self.dominant_strategy(self.pop_b)
        dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(mean_a, mean_b)))
        return 1.0 / (1.0 + dist)

    def evolutionary_rate(self, old_pop: List[CoevolutionAgent], new_pop: List[CoevolutionAgent]) -> float:
        """计算代际进化速率。"""
        total = 0.0
        for a, b in zip(old_pop, new_pop):
            total += a.phenotypic_distance(b)
        return total / len(old_pop)


class MutualisticCoevolution:
    """互利共生协同进化。"""

    def __init__(self, pop_size: int = 50, genome_len: int = 10):
        self.pop_size = pop_size
        self.genome_len = genome_len
        self.hosts: List[CoevolutionAgent] = []
        self.symbionts: List[CoevolutionAgent] = []
        self._init_populations()

    def _init_populations(self) -> None:
        for i in range(self.pop_size):
            self.hosts.append(CoevolutionAgent([random.uniform(-1.0, 1.0) for _ in range(self.genome_len)], i, "host"))
            self.symbionts.append(CoevolutionAgent([random.uniform(-1.0, 1.0) for _ in range(self.genome_len)], i, "symbiont"))

    def mutual_benefit(self, host: CoevolutionAgent, symbiont: CoevolutionAgent) -> float:
        """互利收益：基因组互补性。"""
        alignment = sum(h * s for h, s in zip(host.genome, symbiont.genome))
        return max(0.0, alignment)

    def evaluate(self) -> None:
        """评估互利配对。"""
        for i in range(self.pop_size):
            benefit = self.mutual_benefit(self.hosts[i], self.symbionts[i])
            self.hosts[i].fitness = benefit
            self.symbionts[i].fitness = benefit

    def evolve(self, generations: int = 100, shuffle: bool = True) -> Tuple[List[float], List[float]]:
        """运行互利共进化。"""
        host_history = []
        sym_history = []
        for _ in range(generations):
            self.evaluate()
            host_history.append(max(h.fitness for h in self.hosts))
            sym_history.append(max(s.fitness for s in self.symbionts))
            if shuffle:
                random.shuffle(self.symbionts)
            self.hosts = self._tournament_select(self.hosts)
            self.symbionts = self._tournament_select(self.symbionts)
        return host_history, sym_history

    def _tournament_select(self, population: List[CoevolutionAgent]) -> List[CoevolutionAgent]:
        new_pop = []
        for _ in range(self.pop_size):
            contestants = random.sample(population, 3)
            winner = max(contestants, key=lambda x: x.fitness)
            child = winner.copy()
            child.mutate(rate=0.05)
            new_pop.append(child)
        return new_pop

    def specialization_index(self) -> float:
        """计算宿主与共生体的特化指数。"""
        host_var = sum(math.sqrt(sum((h.genome[i] - sum(hh.genome[i] for hh in self.hosts) / len(self.hosts)) ** 2
                                     for h in self.hosts)) for i in range(self.genome_len)) / self.genome_len
        return host_var

    def coevolutionary_stability(self, history: List[float]) -> float:
        """评估共进化稳定性：历史适应度的标准差。"""
        if len(history) < 2:
            return 0.0
        mean_h = sum(history) / len(history)
        var = sum((h - mean_h) ** 2 for h in history) / len(history)
        return 1.0 / (1.0 + math.sqrt(var))
