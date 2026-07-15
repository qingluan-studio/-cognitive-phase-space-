"""
speciation.py — 物种形成引擎

实现基于遗传距离的物种划分、生态位模型、
生殖隔离演化与适应性辐射模拟。
"""

from __future__ import annotations

import math
import random
from typing import List, Dict, Tuple, Optional, Set


class Organism:
    """单个生物体，带有基因组与物种标识。"""

    def __init__(self, genome: List[float], species_id: int = 0):
        self.genome = list(genome)
        self.species_id = species_id
        self.fitness = 0.0
        self.age = 0

    def genetic_distance(self, other: Organism) -> float:
        """计算与另一个体的遗传距离。"""
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(self.genome, other.genome)))

    def mutate(self, rate: float = 0.1, sigma: float = 0.1) -> None:
        """基因组高斯变异。"""
        for i in range(len(self.genome)):
            if random.random() < rate:
                self.genome[i] += random.gauss(0.0, sigma)

    def copy(self) -> Organism:
        """返回副本。"""
        o = Organism(list(self.genome), self.species_id)
        o.fitness = self.fitness
        o.age = self.age
        return o


class Species:
    """物种：一组共享基因库的有机体。"""

    def __init__(self, species_id: int, representative: Organism):
        self.species_id = species_id
        self.representative = representative.copy()
        self.members: List[Organism] = [representative]
        self.age = 0
        self.stagnation = 0
        self.best_fitness = representative.fitness
        self.avg_fitness = 0.0

    def add_member(self, org: Organism) -> None:
        """添加成员。"""
        org.species_id = self.species_id
        self.members.append(org)

    def update_representative(self) -> None:
        """更新代表个体为当前最优。"""
        if self.members:
            best = max(self.members, key=lambda o: o.fitness)
            self.representative = best.copy()

    def compute_stats(self) -> None:
        """计算物种统计。"""
        if not self.members:
            return
        self.best_fitness = max(o.fitness for o in self.members)
        self.avg_fitness = sum(o.fitness for o in self.members) / len(self.members)
        self.age += 1

    def cull(self, proportion: float = 0.5) -> None:
        """淘汰适应度最低的个体。"""
        self.members.sort(key=lambda o: o.fitness, reverse=True)
        keep = max(1, int(len(self.members) * (1.0 - proportion)))
        self.members = self.members[:keep]

    def offspring_quota(self, total_fitness: float, total_offspring: int) -> int:
        """根据适应度份额分配后代数量。"""
        if total_fitness <= 0:
            return 1
        share = sum(o.fitness for o in self.members) / total_fitness
        return max(1, int(share * total_offspring))

    def compatibility_distance(self, org: Organism, threshold: float = 3.0) -> bool:
        """判断个体是否属于本物种。"""
        return self.representative.genetic_distance(org) < threshold

    def diversity(self) -> float:
        """物种内部多样性。"""
        if len(self.members) < 2:
            return 0.0
        total = 0.0
        count = 0
        for i in range(len(self.members)):
            for j in range(i + 1, len(self.members)):
                total += self.members[i].genetic_distance(self.members[j])
                count += 1
        return total / count if count > 0 else 0.0


class SpeciationEngine:
    """物种形成引擎：管理多物种共进化。"""

    def __init__(self, compatibility_threshold: float = 3.0):
        self.compatibility_threshold = compatibility_threshold
        self.species_list: List[Species] = []
        self.next_species_id = 1
        self.extinction_count = 0

    def speciate(self, population: List[Organism]) -> None:
        """对整个种群进行物种划分。"""
        for sp in self.species_list:
            sp.members.clear()
        for org in population:
            assigned = False
            for sp in self.species_list:
                if sp.compatibility_distance(org, self.compatibility_threshold):
                    sp.add_member(org)
                    assigned = True
                    break
            if not assigned:
                new_sp = Species(self.next_species_id, org)
                self.next_species_id += 1
                self.species_list.append(new_sp)
        self.species_list = [sp for sp in self.species_list if sp.members]

    def update_stats(self) -> None:
        """更新所有物种统计。"""
        for sp in self.species_list:
            sp.compute_stats()

    def stagnation_check(self, max_stagnation: int = 15) -> None:
        """清除长期停滞的物种。"""
        surviving = []
        for sp in self.species_list:
            if sp.stagnation < max_stagnation:
                surviving.append(sp)
            else:
                self.extinction_count += 1
        self.species_list = surviving

    def adjust_threshold(self, target_species: int = 5) -> None:
        """动态调整兼容性阈值以维持目标物种数。"""
        if len(self.species_list) < target_species:
            self.compatibility_threshold *= 0.95
        elif len(self.species_list) > target_species:
            self.compatibility_threshold *= 1.05
        self.compatibility_threshold = max(0.3, min(10.0, self.compatibility_threshold))

    def reproductive_isolation(self, sp1: int, sp2: int, strength: float = 0.9) -> bool:
        """模拟物种间的生殖隔离。"""
        return random.random() < strength

    def hybrid_fitness(self, parent1: Organism, parent2: Organism) -> float:
        """计算杂交后代的适应度（通常低于亲本）。"""
        if parent1.species_id == parent2.species_id:
            return (parent1.fitness + parent2.fitness) / 2.0
        return (parent1.fitness + parent2.fitness) / 4.0

    def adaptive_radiation(self, ancestral: Organism, environments: List[List[float]],
                           generations: int = 50) -> List[Species]:
        """模拟适应性辐射。"""
        pops = []
        for env in environments:
            pop = [Organism([g + random.gauss(0.0, 0.1) for g in ancestral.genome]) for _ in range(20)]
            for _ in range(generations):
                for org in pop:
                    org.fitness = -sum((g - e) ** 2 for g, e in zip(org.genome, env))
                pop.sort(key=lambda o: o.fitness, reverse=True)
                survivors = pop[:10]
                pop = [o.copy() for o in survivors]
                for o in pop:
                    o.mutate()
            pops.extend(pop)
        self.speciate(pops)
        return self.species_list

    def species_richness(self) -> int:
        """当前物种丰富度。"""
        return len(self.species_list)

    def shannon_diversity(self) -> float:
        """计算 Shannon 多样性指数。"""
        total = sum(len(sp.members) for sp in self.species_list)
        if total == 0:
            return 0.0
        h = 0.0
        for sp in self.species_list:
            p = len(sp.members) / total
            if p > 0:
                h -= p * math.log(p)
        return h

    def phylodistance_matrix(self) -> List[List[float]]:
        """返回物种间遗传距离矩阵。"""
        n = len(self.species_list)
        mat = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                mat[i][j] = self.species_list[i].representative.genetic_distance(
                    self.species_list[j].representative)
        return mat

    def coevolution_pressure(self, sp_idx: int, competitor_idx: int) -> float:
        """计算来自竞争物种的进化压力。"""
        if sp_idx >= len(self.species_list) or competitor_idx >= len(self.species_list):
            return 0.0
        dist = self.species_list[sp_idx].representative.genetic_distance(
            self.species_list[competitor_idx].representative)
        return 1.0 / (1.0 + dist)
