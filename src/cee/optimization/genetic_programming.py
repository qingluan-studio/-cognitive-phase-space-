"""
genetic_programming.py — 遗传编程引擎

实现基于树表示的符号回归、交叉、变异、
适应度评估与 bloat 控制。
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple, Dict, Callable, Optional, Union


class GPNode:
    """遗传编程树节点。"""

    def __init__(self, value: Union[str, float], children: Optional[List[GPNode]] = None):
        self.value = value
        self.children = children or []
        self.depth = 0
        self._update_depth()

    def _update_depth(self) -> None:
        """更新节点深度。"""
        if self.children:
            self.depth = 1 + max(c.depth for c in self.children)
        else:
            self.depth = 0

    def copy(self) -> GPNode:
        """深拷贝。"""
        return GPNode(self.value, [c.copy() for c in self.children])

    def evaluate(self, variables: Dict[str, float]) -> float:
        """求值。"""
        if isinstance(self.value, float) or isinstance(self.value, int):
            return float(self.value)
        if self.value in variables:
            return variables[self.value]
        if self.value == "+":
            return sum(c.evaluate(variables) for c in self.children)
        if self.value == "-" and len(self.children) == 2:
            return self.children[0].evaluate(variables) - self.children[1].evaluate(variables)
        if self.value == "*":
            result = 1.0
            for c in self.children:
                result *= c.evaluate(variables)
            return result
        if self.value == "/" and len(self.children) == 2:
            denom = self.children[1].evaluate(variables)
            return self.children[0].evaluate(variables) / denom if denom != 0 else 1.0
        if self.value == "sin" and self.children:
            return math.sin(self.children[0].evaluate(variables))
        if self.value == "cos" and self.children:
            return math.cos(self.children[0].evaluate(variables))
        if self.value == "exp" and self.children:
            return math.exp(self.children[0].evaluate(variables))
        if self.value == "log" and self.children:
            val = self.children[0].evaluate(variables)
            return math.log(abs(val)) if val != 0 else 0.0
        return 0.0

    def to_string(self) -> str:
        """字符串表示。"""
        if isinstance(self.value, float) or isinstance(self.value, int):
            return str(self.value)
        if not self.children:
            return str(self.value)
        return f"({self.value} {', '.join(c.to_string() for c in self.children)})"

    def node_count(self) -> int:
        """节点数。"""
        return 1 + sum(c.node_count() for c in self.children)

    def get_nodes(self) -> List[GPNode]:
        """获取所有节点。"""
        nodes = [self]
        for c in self.children:
            nodes.extend(c.get_nodes())
        return nodes

    def get_random_node(self) -> GPNode:
        """随机选择一个节点。"""
        nodes = self.get_nodes()
        return random.choice(nodes)


class GeneticProgramming:
    """遗传编程引擎。"""

    def __init__(self, population_size: int = 100, max_depth: int = 5):
        self.pop_size = population_size
        self.max_depth = max_depth
        self.population: List[GPNode] = []
        self.functions = ["+", "-", "*", "/", "sin", "cos"]
        self.terminals = ["x", 1.0, 2.0, 0.5, -1.0]
        self._init_population()

    def _init_population(self) -> None:
        """随机初始化种群。"""
        for _ in range(self.pop_size):
            self.population.append(self._grow_tree(0))

    def _grow_tree(self, depth: int, max_depth: int = 5) -> GPNode:
        """递归生成随机树。"""
        if depth >= max_depth or random.random() < 0.3:
            return GPNode(random.choice(self.terminals))
        func = random.choice(self.functions)
        arity = 2 if func in ["+", "-", "*", "/"] else 1
        children = [self._grow_tree(depth + 1, max_depth) for _ in range(arity)]
        return GPNode(func, children)

    def fitness_mse(self, tree: GPNode, data: List[Tuple[Dict[str, float], float]]) -> float:
        """均方误差适应度。"""
        errors = []
        for variables, target in data:
            try:
                pred = tree.evaluate(variables)
                errors.append((pred - target) ** 2)
            except:
                errors.append(1e10)
        return sum(errors) / len(errors) if errors else float('inf')

    def tournament_select(self, fitnesses: List[float], size: int = 3) -> int:
        """锦标赛选择。"""
        contestants = random.sample(range(len(fitnesses)), min(size, len(fitnesses)))
        return min(contestants, key=lambda i: fitnesses[i])

    def crossover(self, parent1: GPNode, parent2: GPNode) -> Tuple[GPNode, GPNode]:
        """子树交叉。"""
        child1 = parent1.copy()
        child2 = parent2.copy()
        node1 = child1.get_random_node()
        node2 = child2.get_random_node()
        node1.value, node2.value = node2.value, node1.value
        node1.children, node2.children = node2.children, node1.children
        child1._update_depth()
        child2._update_depth()
        return child1, child2

    def mutate(self, tree: GPNode, max_depth: int = 3) -> GPNode:
        """子树变异。"""
        mutant = tree.copy()
        node = mutant.get_random_node()
        new_subtree = self._grow_tree(0, max_depth)
        node.value = new_subtree.value
        node.children = new_subtree.children
        mutant._update_depth()
        return mutant

    def evolve(self, data: List[Tuple[Dict[str, float], float]],
               generations: int = 50, crossover_rate: float = 0.9,
               mutation_rate: float = 0.1) -> GPNode:
        """运行遗传编程。"""
        for _ in range(generations):
            fitnesses = [self.fitness_mse(tree, data) for tree in self.population]
            new_pop = []
            while len(new_pop) < self.pop_size:
                p1_idx = self.tournament_select(fitnesses)
                p2_idx = self.tournament_select(fitnesses)
                p1 = self.population[p1_idx].copy()
                p2 = self.population[p2_idx].copy()
                if random.random() < crossover_rate:
                    c1, c2 = self.crossover(p1, p2)
                else:
                    c1, c2 = p1, p2
                if random.random() < mutation_rate:
                    c1 = self.mutate(c1)
                if random.random() < mutation_rate:
                    c2 = self.mutate(c2)
                new_pop.extend([c1, c2])
            self.population = new_pop[:self.pop_size]
        fitnesses = [self.fitness_mse(tree, data) for tree in self.population]
        best_idx = min(range(len(fitnesses)), key=lambda i: fitnesses[i])
        return self.population[best_idx]

    def bloat_control(self, tree: GPNode, max_nodes: int = 50) -> GPNode:
        """控制膨胀。"""
        if tree.node_count() > max_nodes:
            return self._grow_tree(0, 3)
        return tree

    def parsimony_pressure(self, tree: GPNode, base_fitness: float, alpha: float = 0.01) -> float:
        """简约压力。"""
        return base_fitness + alpha * tree.node_count()

    def symbolic_derivative_approx(self, tree: GPNode, var: str = "x", h: float = 1e-5) -> float:
        """数值符号导数近似。"""
        return (tree.evaluate({var: h}) - tree.evaluate({var: 0.0})) / h

    def complexity_measure(self, tree: GPNode) -> int:
        """复杂度度量。"""
        return tree.node_count()

    def semantic_distance(self, tree1: GPNode, tree2: GPNode,
                          test_points: List[Dict[str, float]]) -> float:
        """语义距离。"""
        return math.sqrt(sum((tree1.evaluate(p) - tree2.evaluate(p)) ** 2 for p in test_points) / len(test_points))
