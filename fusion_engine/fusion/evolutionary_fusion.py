"""
进化融合算法

模拟自然选择过程，通过交叉、变异和选择操作，
从多个响应中提取优点片段并重组为更优的新响应。
"""

from __future__ import annotations

import random
import re
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..core.model_collector import ModelResponse
    from ..core.quality_assessor import AssessmentResult


@dataclass
class ResponseGene:
    """响应基因：代表响应中的一个片段"""

    content: str
    source_model: str
    fragment_type: str  # e.g., "introduction", "argument", "conclusion", "code", "explanation"
    quality_score: float = 0.0

    def clone(self) -> ResponseGene:
        """创建基因副本"""
        return ResponseGene(
            content=self.content,
            source_model=self.source_model,
            fragment_type=self.fragment_type,
            quality_score=self.quality_score,
        )


@dataclass
class Individual:
    """进化个体：由多个基因片段组成的完整响应"""

    genes: list[ResponseGene] = field(default_factory=list)
    fitness: float = 0.0
    generation: int = 0

    def to_text(self) -> str:
        """将基因片段组合为完整文本"""
        return "\n\n".join(g.content for g in self.genes if g.content.strip())

    def estimate_length(self) -> int:
        """估计文本长度"""
        return sum(len(g.content) for g in self.genes)


class EvolutionaryFusion:
    """
    进化融合器

    工作原理：
    1. 初始化种群：将每个原始响应解析为基因片段，构成初始个体
    2. 评估适应度：基于 QualityAssessor 的维度评分计算每个个体的适应度
    3. 选择：使用锦标赛选择或轮盘赌选择优秀个体
    4. 交叉：交换两个个体的基因片段，产生新组合
    5. 变异：对基因内容进行轻微修改（如顺序调整、片段精简）
    6. 迭代多代后，输出适应度最高的个体
    """

    def __init__(
        self,
        population_size: int = 20,
        generations: int = 10,
        crossover_rate: float = 0.7,
        mutation_rate: float = 0.2,
        elitism_count: int = 2,
        tournament_size: int = 3,
    ):
        self.population_size = population_size
        self.generations = generations
        self.crossover_rate = crossover_rate
        self.mutation_rate = mutation_rate
        self.elitism_count = elitism_count
        self.tournament_size = tournament_size
        self._population: list[Individual] = []
        self._fitness_history: list[float] = []

    def _parse_response(
        self, response: ModelResponse, assessment: AssessmentResult
    ) -> Individual:
        """
        将响应解析为基因片段

        采用基于段落和代码块的简单分割策略。
        """
        text = response.output
        genes: list[ResponseGene] = []

        # 尝试按代码块分割
        code_blocks = re.findall(r"```[\w]*\n[\s\S]*?\n```", text)
        plain_text = re.split(r"```[\w]*\n[\s\S]*?\n```", text)

        # 交替组合
        idx = 0
        for pt in plain_text:
            pt = pt.strip()
            if pt:
                # 进一步按空行分割段落
                paragraphs = [p.strip() for p in pt.split("\n\n") if p.strip()]
                for para in paragraphs:
                    # 判断片段类型
                    if para.startswith("#") or para.startswith("**"):
                        ftype = "introduction"
                    elif any(
                        kw in para.lower()
                        for kw in ["结论", "总结", "conclusion", "summary", "因此"]
                    ):
                        ftype = "conclusion"
                    elif any(
                        kw in para.lower()
                        for kw in ["证明", "推导", "because", "since", "reason"]
                    ):
                        ftype = "argument"
                    else:
                        ftype = "explanation"

                    genes.append(
                        ResponseGene(
                            content=para,
                            source_model=response.model_name,
                            fragment_type=ftype,
                            quality_score=assessment.dimensions.overall,
                        )
                    )

            if idx < len(code_blocks):
                genes.append(
                    ResponseGene(
                        content=code_blocks[idx],
                        source_model=response.model_name,
                        fragment_type="code",
                        quality_score=assessment.dimensions.overall,
                    )
                )
                idx += 1

        # 如果没有解析出任何基因，将整个文本作为一个基因
        if not genes:
            genes.append(
                ResponseGene(
                    content=text,
                    source_model=response.model_name,
                    fragment_type="unknown",
                    quality_score=assessment.dimensions.overall,
                )
            )

        return Individual(
            genes=genes, fitness=assessment.dimensions.overall, generation=0
        )

    def _evaluate_fitness(
        self, individual: Individual, assessments: list[AssessmentResult]
    ) -> float:
        """评估个体适应度"""
        # 基础适应度：基因来源的平均质量
        if not individual.genes:
            return 0.0

        avg_gene_quality = sum(g.quality_score for g in individual.genes) / len(
            individual.genes
        )

        # 结构奖励：包含多种片段类型
        unique_types = len(set(g.fragment_type for g in individual.genes))
        diversity_bonus = 0.05 * unique_types

        # 连贯性惩罚：基因数量过多可能导致碎片化
        fragmentation_penalty = max(0, len(individual.genes) - 8) * 0.02

        # 长度适中奖励
        length = individual.estimate_length()
        length_penalty = 0.0
        if length < 50:
            length_penalty = 0.2
        elif length > 5000:
            length_penalty = 0.1

        fitness = (
            avg_gene_quality
            + diversity_bonus
            - fragmentation_penalty
            - length_penalty
        )
        return max(0.0, min(1.0, fitness))

    def _tournament_select(self) -> Individual:
        """锦标赛选择"""
        contestants = random.sample(
            self._population, min(self.tournament_size, len(self._population))
        )
        return max(contestants, key=lambda ind: ind.fitness)

    def _crossover(
        self, parent1: Individual, parent2: Individual
    ) -> tuple[Individual, Individual]:
        """单点交叉：交换基因片段"""
        if not parent1.genes or not parent2.genes:
            return parent1, parent2

        # 随机选择交叉点
        cut1 = (
            random.randint(1, len(parent1.genes) - 1)
            if len(parent1.genes) > 1
            else 1
        )
        cut2 = (
            random.randint(1, len(parent2.genes) - 1)
            if len(parent2.genes) > 1
            else 1
        )

        child1_genes = parent1.genes[:cut1] + parent2.genes[cut2:]
        child2_genes = parent2.genes[:cut2] + parent1.genes[cut1:]

        child1 = Individual(
            genes=[g.clone() for g in child1_genes],
            generation=max(parent1.generation, parent2.generation) + 1,
        )
        child2 = Individual(
            genes=[g.clone() for g in child2_genes],
            generation=max(parent1.generation, parent2.generation) + 1,
        )

        return child1, child2

    def _mutate(self, individual: Individual) -> Individual:
        """变异操作"""
        if not individual.genes:
            return individual

        genes = [g.clone() for g in individual.genes]

        mutation_type = random.choice(
            ["reorder", "trim", "boost", "remove_redundant"]
        )

        if mutation_type == "reorder" and len(genes) > 2:
            # 交换两个相邻基因
            idx = random.randint(0, len(genes) - 2)
            genes[idx], genes[idx + 1] = genes[idx + 1], genes[idx]

        elif mutation_type == "trim":
            # 随机截断一个过长的基因
            long_genes = [i for i, g in enumerate(genes) if len(g.content) > 200]
            if long_genes:
                idx = random.choice(long_genes)
                content = genes[idx].content
                # 保留前200字符并在合适位置截断
                truncated = content[:200].rsplit(".", 1)[0] + "."
                genes[idx].content = truncated
                genes[idx].quality_score *= 1.02  # 简洁性奖励

        elif mutation_type == "boost":
            # 随机提升一个基因的质量分（模拟局部优化）
            idx = random.randint(0, len(genes) - 1)
            genes[idx].quality_score = min(1.0, genes[idx].quality_score + 0.05)

        elif mutation_type == "remove_redundant":
            # 移除重复的基因（基于片段类型和来源）
            seen: set[tuple[str, str]] = set()
            filtered = []
            for g in genes:
                key = (g.fragment_type, g.source_model)
                if key not in seen:
                    seen.add(key)
                    filtered.append(g)
                else:
                    # 保留质量更高的
                    existing = next(
                        x
                        for x in filtered
                        if (x.fragment_type, x.source_model) == key
                    )
                    if g.quality_score > existing.quality_score:
                        existing.content = g.content
                        existing.quality_score = g.quality_score
            genes = filtered

        mutated = Individual(
            genes=genes, fitness=individual.fitness, generation=individual.generation
        )
        return mutated

    def _initialize_population(
        self,
        responses: list[ModelResponse],
        assessments: list[AssessmentResult],
    ) -> None:
        """初始化种群"""
        self._population = []

        # 初始个体：原始响应
        for resp, assess in zip(responses, assessments):
            individual = self._parse_response(resp, assess)
            self._population.append(individual)

        # 填充到种群大小：复制并轻微变异
        while len(self._population) < self.population_size:
            base = random.choice(self._population[: len(responses)])
            mutated = self._mutate(base)
            self._population.append(mutated)

    def _evolve_generation(self, assessments: list[AssessmentResult]) -> None:
        """进化一代"""
        # 评估适应度
        for ind in self._population:
            ind.fitness = self._evaluate_fitness(ind, assessments)

        # 排序
        self._population.sort(key=lambda ind: ind.fitness, reverse=True)

        # 记录最佳适应度
        best_fitness = self._population[0].fitness
        self._fitness_history.append(best_fitness)

        # 精英保留
        new_population = [ind for ind in self._population[: self.elitism_count]]

        # 生成新个体
        while len(new_population) < self.population_size:
            parent1 = self._tournament_select()
            parent2 = self._tournament_select()

            # 交叉
            if random.random() < self.crossover_rate:
                child1, child2 = self._crossover(parent1, parent2)
            else:
                child1 = Individual(
                    genes=[g.clone() for g in parent1.genes],
                    fitness=parent1.fitness,
                    generation=parent1.generation + 1,
                )
                child2 = Individual(
                    genes=[g.clone() for g in parent2.genes],
                    fitness=parent2.fitness,
                    generation=parent2.generation + 1,
                )

            # 变异
            if random.random() < self.mutation_rate:
                child1 = self._mutate(child1)
            if random.random() < self.mutation_rate:
                child2 = self._mutate(child2)

            new_population.append(child1)
            if len(new_population) < self.population_size:
                new_population.append(child2)

        self._population = new_population

    def fuse(
        self,
        responses: list[ModelResponse],
        assessments: list[AssessmentResult] | None = None,
    ) -> str:
        """
        执行进化融合

        Args:
            responses: 原始模型响应
            assessments: 质量评估结果

        Returns:
            进化后的最优响应文本（含元数据注释）
        """
        if not responses:
            return ""

        if len(responses) == 1:
            return responses[0].output

        if assessments is None or len(assessments) != len(responses):
            raise ValueError("evolutionary fusion 需要与 responses 一一对应的 assessments")

        # 初始化
        self._initialize_population(responses, assessments)

        # 多代进化
        for _gen in range(self.generations):
            self._evolve_generation(assessments)

        # 最终评估并选择最优
        for ind in self._population:
            ind.fitness = self._evaluate_fitness(ind, assessments)

        self._population.sort(key=lambda ind: ind.fitness, reverse=True)
        best = self._population[0]

        # 统计来源模型
        source_models = list(set(g.source_model for g in best.genes))
        fragment_types = [g.fragment_type for g in best.genes]

        metadata = f"""
<!-- 融合信息: 进化融合 -->
<!-- 进化代数: {self.generations} -->
<!-- 种群大小: {self.population_size} -->
<!-- 最终适应度: {best.fitness:.4f} -->
<!-- 基因来源模型: {", ".join(source_models)} -->
<!-- 片段类型分布: {", ".join(fragment_types)} -->
<!-- 交叉率: {self.crossover_rate} | 变异率: {self.mutation_rate} -->
"""

        return best.to_text() + metadata

    def get_fitness_history(self) -> list[float]:
        """获取适应度历史"""
        return self._fitness_history.copy()
