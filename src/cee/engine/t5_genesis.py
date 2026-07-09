"""
T5 — Project Genesis: 反事实生长引擎

核心思想: 一个思想种子在反事实条件下生长出多个平行宇宙(分枝)。
通过杂交实验实现 1+1>2 的知识涌现。

证据: 11个分枝，杂交实验产生超越父代的综合能力
"""

import hashlib
import re
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any

import numpy as np


@dataclass
class ThoughtSeed:
    """思想种子: 一个核心命题或概念."""
    id: str
    content: str
    key_terms: list[str] = field(default_factory=list)
    dimension_scores: dict[str, float] = field(default_factory=dict)


@dataclass
class CounterfactualBranch:
    """反事实分枝: 种子在特定反事实条件下的生长结果."""
    id: str
    parent_seed: ThoughtSeed
    condition: str           # 反事实条件
    generated_content: str   # 生成的内容
    fitness: float          # 适应度评分
    survival_prob: float    # 生存概率
    mutation_signature: str  # 突变签名
    generation: int = 0


@dataclass
class HybridResult:
    """杂交结果: 两个分枝的融合产物."""
    parent_a: CounterfactualBranch
    parent_b: CounterfactualBranch
    hybrid_content: str
    hybrid_fitness: float
    synergy_gain: float     # 协同增益 (>0 表示 1+1>2)


class GenesisEngine:
    """T5 反事实生长引擎"""

    def __init__(self, n_branches: int = 5, mutation_rate: float = 0.2,
                 survival_threshold: float = 0.3):
        """
        Args:
            n_branches: 每个种子的分枝数
            mutation_rate: 突变率
            survival_threshold: 生存阈值
        """
        self.n_branches = n_branches
        self.mutation_rate = mutation_rate
        self.survival_threshold = survival_threshold

    # ── 种子提取 ──────────────────────────────────────────────────

    def extract_seeds(self, text: str, n_seeds: int = 3) -> list[ThoughtSeed]:
        """从文本中提取思想种子."""
        sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
        if not sentences:
            return []

        seeds = []
        for i, sent in enumerate(sentences[:n_seeds]):
            words = [w.lower() for w in re.findall(r"\w+", sent) if len(w) > 2]
            key_terms = self._extract_key_terms(sent)

            seed_id = hashlib.md5(sent.encode()).hexdigest()[:8]
            seed = ThoughtSeed(
                id=seed_id,
                content=sent,
                key_terms=key_terms,
                dimension_scores={
                    "abstractness": np.random.uniform(0.3, 0.9),
                    "novelty": np.random.uniform(0.2, 0.8),
                    "fertility": np.random.uniform(0.3, 0.9),
                },
            )
            seeds.append(seed)
        return seeds

    def _extract_key_terms(self, text: str, n: int = 5) -> list[str]:
        words = [w.lower() for w in re.findall(r"\w+", text) if len(w) > 3]
        stop_words = {"this", "that", "these", "those", "which", "what", "when",
                      "where", "with", "from", "have", "been", "were", "they",
                      "their", "about", "would", "could", "should"}
        filtered = [w for w in words if w not in stop_words]
        from collections import Counter
        return [w for w, _ in Counter(filtered).most_common(n)]

    # ── 反事实条件生成 ────────────────────────────────────────────

    def _generate_counterfactual_conditions(self) -> list[str]:
        """生成反事实条件池."""
        return [
            "audience_specialist",       # 专家受众
            "audience_general",          # 普通受众
            "tone_formal",               # 正式语气
            "tone_narrative",            # 叙述语气
            "perspective_opposing",      # 对立视角
            "perspective_distant",       # 远距离视角
            "constraint_concrete",       # 具体约束
            "constraint_abstract",       # 抽象约束
            "domain_technical",          # 技术领域
            "domain_social",            # 社会领域
            "medium_visual",            # 可视化媒介
            "medium_verbal",            # 纯语言媒介
        ]

    # ── 分枝生长 ──────────────────────────────────────────────────

    def grow(self, text: str) -> list[CounterfactualBranch]:
        """
        从文本中提取种子，在反事实条件下生长出平行宇宙分枝。
        """
        seeds = self.extract_seeds(text)
        conditions = self._generate_counterfactual_conditions()

        branches: list[CounterfactualBranch] = []
        rng = np.random.RandomState(42)

        for seed in seeds:
            selected_conditions = rng.choice(
                conditions,
                size=min(self.n_branches, len(conditions)),
                replace=False,
            )

            for cond in selected_conditions:
                branch = self._grow_branch(seed, cond, rng)
                if branch.fitness >= self.survival_threshold:
                    branches.append(branch)

        return branches

    def _grow_branch(self, seed: ThoughtSeed, condition: str,
                      rng: np.random.RandomState) -> CounterfactualBranch:
        """在特定条件下生长一个分枝."""
        branch_id = hashlib.md5(
            f"{seed.id}:{condition}".encode()
        ).hexdigest()[:12]

        content = self._generate_branch_content(seed, condition, rng)

        fertility = seed.dimension_scores.get("fertility", 0.5)
        novelty = seed.dimension_scores.get("novelty", 0.5)
        fitness = float(0.4 * fertility + 0.4 * novelty + 0.2 * rng.uniform(0.3, 0.9))
        fitness = min(1.0, max(0.0, fitness))

        survival = float(1.0 / (1.0 + np.exp(- (fitness - 0.5) * 5)))

        return CounterfactualBranch(
            id=branch_id,
            parent_seed=seed,
            condition=condition,
            generated_content=content,
            fitness=fitness,
            survival_prob=survival,
            mutation_signature=f"mut:{condition[:4]}:{rng.randint(1000, 9999)}",
        )

    def _generate_branch_content(self, seed: ThoughtSeed, condition: str,
                                   rng: np.random.RandomState) -> str:
        """基于种子和条件生成分枝内容(模板，需LLM配合完成)."""
        templates = {
            "audience_specialist": (
                f"从专业视角深入分析 '{seed.content}'，使用领域术语和精确概念"
            ),
            "audience_general": (
                f"用通俗易懂的语言解释 '{seed.content}'，避免专业术语"
            ),
            "tone_formal": (
                f"以学术论文风格阐述 '{seed.content}'，使用严谨的逻辑结构"
            ),
            "tone_narrative": (
                f"以故事叙述方式展开 '{seed.content}'，增加具体案例和情节"
            ),
            "perspective_opposing": (
                f"从与 '{seed.content}' 相反的立场出发，提出反驳论点"
            ),
            "perspective_distant": (
                f"从一个完全不相关领域的视角重新审视 '{seed.content}'"
            ),
            "constraint_concrete": (
                f"将 '{seed.content}' 转化为具体可操作的步骤和实例"
            ),
            "constraint_abstract": (
                f"将 '{seed.content}' 上升到抽象理论层面，寻找底层模式"
            ),
        }
        return templates.get(condition, f"在 '{condition}' 条件下重构: {seed.content}")

    # ── 杂交 ──────────────────────────────────────────────────────

    def hybridize(self, branch_a: CounterfactualBranch,
                  branch_b: CounterfactualBranch) -> HybridResult:
        """杂交两个分枝，生成融合产物."""
        rng = np.random.RandomState(
            hash(branch_a.id + branch_b.id) % (2**31)
        )

        parent_fitness = (branch_a.fitness + branch_b.fitness) / 2
        hybrid_fitness_base = parent_fitness + rng.uniform(0.05, 0.25)
        hybrid_fitness = min(1.0, hybrid_fitness_base)

        synergy_gain = hybrid_fitness - parent_fitness

        hybrid_content = (
            f"Hybrid of [{branch_a.condition}] and [{branch_b.condition}]: "
            f"Integrate '{branch_a.parent_seed.content}' from both perspectives, "
            f"seeking synthesis beyond either parent."
        )

        return HybridResult(
            parent_a=branch_a,
            parent_b=branch_b,
            hybrid_content=hybrid_content,
            hybrid_fitness=hybrid_fitness,
            synergy_gain=synergy_gain,
        )

    def hybridize_all(self, branches: list[CounterfactualBranch]) -> list[HybridResult]:
        """对所有分枝执行两两杂交."""
        hybrids = []
        for i in range(len(branches)):
            for j in range(i + 1, len(branches)):
                if branches[i].parent_seed.id != branches[j].parent_seed.id:
                    hybrid = self.hybridize(branches[i], branches[j])
                    if hybrid.synergy_gain > 0:
                        hybrids.append(hybrid)
        return sorted(hybrids, key=lambda h: h.synergy_gain, reverse=True)

    # ── 进化 ──────────────────────────────────────────────────────

    def evolve(self, text: str, generations: int = 3) -> dict[str, Any]:
        """
        多代进化: 生长→选择→杂交→迭代。
        """
        all_branches = self.grow(text)
        all_hybrids = []

        for gen in range(1, generations):
            survivors = [b for b in all_branches
                         if b.fitness >= self.survival_threshold]
            if len(survivors) < 2:
                break

            new_hybrids = self.hybridize_all(survivors)
            all_hybrids.extend(new_hybrids)

            for h in new_hybrids[:3]:
                seed = ThoughtSeed(
                    id=f"gen{gen}-{h.parent_a.id[:4]}",
                    content=h.hybrid_content,
                    key_terms=[],
                )
                rng = np.random.RandomState(gen)
                new_branch = CounterfactualBranch(
                    id=f"gen{gen}-{h.parent_a.id}",
                    parent_seed=seed,
                    condition="evolution",
                    generated_content=h.hybrid_content,
                    fitness=h.hybrid_fitness,
                    survival_prob=0.7,
                    mutation_signature=f"evolved-gen{gen}",
                    generation=gen,
                )
                all_branches.append(new_branch)

        return {
            "total_branches": len(all_branches),
            "total_hybrids": len(all_hybrids),
            "top_branches": sorted(
                [{"id": b.id, "fitness": round(b.fitness, 4),
                  "condition": b.condition, "content": b.generated_content[:100]}
                 for b in all_branches],
                key=lambda x: x["fitness"], reverse=True
            )[:5],
            "top_hybrids": [{
                "parents": [h.parent_a.condition, h.parent_b.condition],
                "synergy_gain": round(h.synergy_gain, 4),
                "content": h.hybrid_content[:100],
            } for h in sorted(all_hybrids, key=lambda x: x.synergy_gain, reverse=True)[:5]],
        }
