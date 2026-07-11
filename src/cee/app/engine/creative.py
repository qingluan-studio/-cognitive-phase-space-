"""
创意合成引擎 — 跨领域知识融合与创新生成

提供:
  - 概念关联图: 构建概念之间的关联网络
  - 类比推理器: 基于结构映射的类比生成
  - 逆向思维生成器: 从结果反推原因
  - 随机组合创意器: 强制关联产生新想法
  - SCAMPER 方法: 替代/组合/适应/修改/他用/消除/重排
  - 创意评估器: 新颖性、可行性、影响力评分
  - 创意输出格式化
"""

from __future__ import annotations

import hashlib
import itertools
import math
import random
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Optional, Union


# ============================================================
# Data Classes
# ============================================================

@dataclass
class ConceptNode:
    id: str
    name: str
    domain: str = ""
    weight: float = 1.0
    attributes: dict[str, Any] = field(default_factory=dict)
    neighbors: set[str] = field(default_factory=set)


@dataclass
class ConceptGraph:
    nodes: dict[str, ConceptNode] = field(default_factory=dict)
    edges: list[tuple[str, str, float]] = field(default_factory=list)

    def add_node(self, node: ConceptNode) -> None:
        self.nodes[node.id] = node

    def add_edge(
        self, from_id: str, to_id: str, weight: float = 1.0
    ) -> None:
        if from_id in self.nodes and to_id in self.nodes:
            self.edges.append((from_id, to_id, weight))
            self.nodes[from_id].neighbors.add(to_id)
            self.nodes[to_id].neighbors.add(from_id)

    def get_neighbors(
        self, node_id: str, depth: int = 1
    ) -> set[str]:
        if depth <= 0 or node_id not in self.nodes:
            return set()
        visited: set[str] = {node_id}
        frontier = {node_id}
        for _ in range(depth):
            next_frontier: set[str] = set()
            for nid in frontier:
                node = self.nodes.get(nid)
                if node:
                    for nb in node.neighbors:
                        if nb not in visited:
                            visited.add(nb)
                            next_frontier.add(nb)
            frontier = next_frontier
        visited.discard(node_id)
        return visited


@dataclass
class AnalogyResult:
    source_domain: str
    target_domain: str
    mapping: dict[str, str] = field(default_factory=dict)
    insights: list[str] = field(default_factory=list)
    creativity_score: float = 0.0
    structural_score: float = 0.0


@dataclass
class SCAMPERResult:
    technique: str
    original: str
    transformed: str
    rationale: str
    creativity_score: float = 0.0


@dataclass
class CreativeIdea:
    id: str
    title: str
    description: str
    method: str
    source_concepts: list[str] = field(default_factory=list)
    scores: dict[str, float] = field(default_factory=dict)
    generated_at: float = field(default_factory=time.time)


@dataclass
class SynthesisResult:
    title: str
    ideas: list[CreativeIdea] = field(default_factory=list)
    concept_graph: Optional[ConceptGraph] = None
    overall_score: float = 0.0
    summary: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CreativeConfig:
    max_ideas: int = 10
    novelty_weight: float = 0.4
    feasibility_weight: float = 0.35
    impact_weight: float = 0.25
    enable_analogy: bool = True
    enable_scamper: bool = True
    enable_reverse: bool = True
    enable_random: bool = True
    creativity_threshold: float = 0.3


# ============================================================
# Concept Graph Builder
# ============================================================

class ConceptGraphBuilder:
    """概念关联图构建器。

    构建概念节点及其语义关联边。
    """

    _DOMAIN_KEYWORDS: dict[str, list[str]] = {
        "technology": ["AI", "algorithm", "data", "compute", "network", "software", "hardware", "cloud", "automation"],
        "biology": ["cell", "DNA", "evolution", "ecosystem", "organism", "genome", "mutation", "adaptation"],
        "economics": ["market", "trade", "value", "currency", "supply", "demand", "investment", "growth"],
        "psychology": ["mind", "behavior", "cognition", "emotion", "memory", "perception", "learning", "motivation"],
        "physics": ["energy", "force", "matter", "wave", "field", "quantum", "entropy", "momentum"],
        "art": ["design", "aesthetic", "composition", "color", "form", "texture", "harmony", "expression"],
        "philosophy": ["logic", "ethics", "existence", "knowledge", "truth", "meaning", "consciousness", "reality"],
    }

    @classmethod
    def build(
        cls, concepts: list[str]
    ) -> ConceptGraph:
        """从概念列表构建关联图。"""
        graph = ConceptGraph()

        for concept in concepts:
            domain = cls._classify_domain(concept)
            node = ConceptNode(
                id=cls._make_id(concept),
                name=concept,
                domain=domain,
                weight=1.0,
            )
            graph.add_node(node)

        node_ids = list(graph.nodes.keys())
        for i, a_id in enumerate(node_ids):
            for j, b_id in enumerate(node_ids[i + 1 :], i + 1):
                sim = cls._concept_similarity(
                    graph.nodes[a_id].name,
                    graph.nodes[b_id].name,
                )
                if sim > 0.1:
                    graph.add_edge(a_id, b_id, round(sim, 4))

        return graph

    @classmethod
    def extend(
        cls,
        graph: ConceptGraph,
        new_concepts: list[str],
    ) -> ConceptGraph:
        """向已有图添加新概念节点。"""
        for concept in new_concepts:
            node_id = cls._make_id(concept)
            if node_id in graph.nodes:
                continue
            node = ConceptNode(
                id=node_id,
                name=concept,
                domain=cls._classify_domain(concept),
            )
            graph.add_node(node)
            for existing_id, existing_node in graph.nodes.items():
                if existing_id == node_id:
                    continue
                sim = cls._concept_similarity(
                    node.name, existing_node.name
                )
                if sim > 0.1:
                    graph.add_edge(
                        node_id, existing_id, round(sim, 4)
                    )
        return graph

    @classmethod
    def _classify_domain(cls, concept: str) -> str:
        concept_lower = concept.lower()
        best_domain = "general"
        best_score = 0
        for domain, keywords in cls._DOMAIN_KEYWORDS.items():
            score = sum(
                1
                for kw in keywords
                if kw.lower() in concept_lower
            )
            if score > best_score:
                best_score = score
                best_domain = domain
        return best_domain

    @classmethod
    def _concept_similarity(cls, a: str, b: str) -> float:
        a_words = set(a.lower().split())
        b_words = set(b.lower().split())
        if not a_words or not b_words:
            return 0.0
        intersection = a_words & b_words
        union = a_words | b_words
        return len(intersection) / len(union) if union else 0.0

    @staticmethod
    def _make_id(name: str) -> str:
        return hashlib.md5(name.encode()).hexdigest()[:8]


# ============================================================
# Analogy Reasoner
# ============================================================

class AnalogyReasoner:
    """类比推理器 — 基于结构映射理论生成跨域类比。

    实现系统性的域间映射和新洞见生成。
    """

    _DOMAIN_STRUCTURES: dict[str, dict[str, list[str]]] = {
        "technology": {
            "components": ["hardware", "software", "network", "data"],
            "functions": ["compute", "store", "transmit", "display"],
            "properties": ["efficiency", "scalability", "reliability"],
        },
        "biology": {
            "components": ["cell", "organ", "system", "organism"],
            "functions": ["metabolize", "reproduce", "adapt", "regulate"],
            "properties": ["diversity", "resilience", "complexity"],
        },
        "economics": {
            "components": ["producer", "consumer", "market", "currency"],
            "functions": ["produce", "consume", "trade", "invest"],
            "properties": ["efficiency", "growth", "stability"],
        },
        "psychology": {
            "components": ["perception", "memory", "emotion", "cognition"],
            "functions": ["perceive", "remember", "feel", "reason"],
            "properties": ["plasticity", "subjectivity", "development"],
        },
    }

    def generate_analogies(
        self,
        source_concept: str,
        target_domains: Optional[list[str]] = None,
        max_results: int = 5,
    ) -> list[AnalogyResult]:
        """生成 source 到 target 的类比映射。"""
        source_domain = ConceptGraphBuilder._classify_domain(
            source_concept
        )
        source_struct = self._DOMAIN_STRUCTURES.get(
            source_domain,
            self._DOMAIN_STRUCTURES["technology"],
        )

        targets = (
            target_domains
            or [
                d
                for d in self._DOMAIN_STRUCTURES
                if d != source_domain
            ]
        )

        results: list[AnalogyResult] = []
        for target_domain in targets[:max_results]:
            target_struct = self._DOMAIN_STRUCTURES.get(
                target_domain,
                self._DOMAIN_STRUCTURES["biology"],
            )

            mapping: dict[str, str] = {}
            insights: list[str] = []

            for role, source_terms in source_struct.items():
                target_terms = target_struct.get(role, [])
                for i, st in enumerate(source_terms):
                    if i < len(target_terms):
                        mapping[st] = target_terms[i]

            for src, tgt in mapping.items():
                insights.append(
                    f"Just as {src} functions in {source_domain}, "
                    f"{tgt} plays a similar role in {target_domain}"
                )

            structural_score = min(
                len(mapping) / 12.0, 1.0
            )
            creativity_score = self._creativity_from_distance(
                source_domain, target_domain
            )

            results.append(
                AnalogyResult(
                    source_domain=source_domain,
                    target_domain=target_domain,
                    mapping=mapping,
                    insights=insights,
                    creativity_score=creativity_score,
                    structural_score=structural_score,
                )
            )

        results.sort(
            key=lambda r: r.creativity_score + r.structural_score,
            reverse=True,
        )
        return results[:max_results]

    def _creativity_from_distance(
        self, domain_a: str, domain_b: str
    ) -> float:
        dist_map = {
            ("technology", "biology"): 0.8,
            ("technology", "economy"): 0.6,
            ("biology", "psychology"): 0.5,
            ("biology", "physiology"): 0.2,
            ("biology", "art"): 0.9,
            ("technology", "physics"): 0.4,
        }
        key = tuple(sorted([domain_a, domain_b]))
        base = dist_map.get(key, 0.7)
        return base + random.uniform(-0.1, 0.1)


# ============================================================
# Reverse Thinking Generator
# ============================================================

class ReverseThinkingGenerator:
    """逆向思维生成器 — 从期望结果反推必要条件和路径。

    Usage:
        rtg = ReverseThinkingGenerator()
        paths = rtg.generate_paths("achieving carbon neutrality")
        for path in paths:
            print(f"  Path: {path}")
    """

    def generate_paths(
        self, goal: str, num_paths: int = 5
    ) -> list[dict[str, Any]]:
        """生成从结果反推的因果路径。"""
        paths: list[dict[str, Any]] = []

        templates = [
            "To achieve {goal}, first ensure that the fundamental preconditions are met.",
            "Working backwards from {goal}, the immediate prior conditions are: {preconditions}.",
            "If we imagine {goal} is already achieved, what must have happened differently?",
            "Identify the minimal necessary conditions for {goal}: {conditions}.",
            "Reverse cause-effect chain: {goal} ← {step1} ← {step2} ← {step3}.",
        ]

        for i in range(num_paths):
            template = templates[i % len(templates)]
            path = {
                "id": f"rev_{i}",
                "goal": goal,
                "type": "reverse_causal",
                "steps": self._build_reverse_chain(goal, depth=3 + i),
                "template": template,
            }
            paths.append(path)

        return paths

    def _build_reverse_chain(
        self, goal: str, depth: int = 3
    ) -> list[str]:
        chain = [f"Goal: {goal}"]
        current = goal
        for i in range(1, depth + 1):
            predecessor = (
                f"Prerequisite_{i}: understanding of "
                f"{current[:30]} and its enabling factors"
            )
            chain.append(predecessor)
            current = predecessor
        chain.reverse()
        return chain


# ============================================================
# Random Combinator (Forced Association)
# ============================================================

class RandomCombinator:
    """随机组合创意器 — 通过强制关联产生新想法。

    使用随机概念配对创造意外关联。
    """

    _CONCEPT_POOL: list[str] = [
        "blockchain", "neural network", "quantum computing", "CRISPR",
        "virtual reality", "autonomous vehicles", "solar energy",
        "microbiome", "synthetic biology", "edge computing",
        "digital twin", "circular economy", "biomimicry",
        "gamification", "crowdsourcing", "augmented reality",
        "3D printing", "IoT sensors", "cryptography",
        "machine ethics", "spatial computing", "genetic algorithm",
        "swarm intelligence", "haptic feedback", "edge AI",
        "carbon capture", "fusion energy", "telemedicine",
        "personalized learning", "decentralized governance",
    ]

    def generate_combinations(
        self,
        concepts: Optional[list[str]] = None,
        num: int = 10,
    ) -> list[tuple[str, str]]:
        """生成随机概念组合。"""
        pool = concepts or self._CONCEPT_POOL
        if len(pool) < 2:
            return []

        combinations: list[tuple[str, str]] = []
        shuffled = list(pool)
        random.shuffle(shuffled)

        for i in range(0, len(shuffled) - 1, 2):
            if len(combinations) >= num:
                break
            combinations.append(
                (shuffled[i], shuffled[i + 1])
            )

        return combinations

    def generate_ideas_from_combinations(
        self,
        combinations: list[tuple[str, str]],
    ) -> list[CreativeIdea]:
        """从概念组合生成创意想法。"""
        ideas: list[CreativeIdea] = []

        for i, (a, b) in enumerate(combinations):
            title = f"{a.capitalize()} meets {b.capitalize()}"
            description = (
                f"Combine {a} principles with {b} applications to "
                f"create a novel hybrid solution. "
                f"The {a} component provides the foundation while "
                f"{b} offers a new use-case dimension."
            )
            idea = CreativeIdea(
                id=f"random_{i}_{hashlib.md5(title.encode()).hexdigest()[:6]}",
                title=title,
                description=description,
                method="random_combination",
                source_concepts=[a, b],
            )
            ideas.append(idea)

        return ideas


# ============================================================
# SCAMPER Method Implementation
# ============================================================

class SCAMPEREngine:
    """SCAMPER 创意法实现。

    七种创新思维操作:
      S - Substitute (替代)
      C - Combine (组合)
      A - Adapt (适应)
      M - Modify / Magnify (修改/放大)
      P - Put to another use (他用)
      E - Eliminate (消除)
      R - Reverse / Rearrange (逆转/重排)
    """

    _TECHNIQUES = [
        ("substitute", "Substitute", "What if we replace X with Y?"),
        ("combine", "Combine", "What if we merge X with Y?"),
        ("adapt", "Adapt", "How can we adjust X to fit context Y?"),
        ("modify", "Modify", "What if we change the properties of X?"),
        ("put_to_use", "Put to Another Use", "How else could X be applied?"),
        ("eliminate", "Eliminate", "What if we remove X entirely?"),
        ("reverse", "Reverse/Rearrange", "What if we invert the order or logic?"),
    ]

    def apply(
        self, concept: str, techniques: Optional[list[str]] = None
    ) -> list[SCAMPERResult]:
        """对概念应用所有 SCAMPER 技法。"""
        techs_to_apply = techniques or [
            t[0] for t in self._TECHNIQUES
        ]
        results: list[SCAMPERResult] = []

        for tech_id, name, prompt in self._TECHNIQUES:
            if tech_id not in techs_to_apply:
                continue
            transformed, rationale = self._apply_technique(
                concept, tech_id
            )
            results.append(
                SCAMPERResult(
                    technique=name,
                    original=concept,
                    transformed=transformed,
                    rationale=rationale,
                    creativity_score=self._score_technique(
                        tech_id
                    ),
                )
            )

        return results

    def _apply_technique(
        self, concept: str, technique: str
    ) -> tuple[str, str]:
        handlers = {
            "substitute": (
                f"Replaced-{concept} with alternative components",
                f"Identify interchangeable parts and swap them for new outcomes",
            ),
            "combine": (
                f"{concept}-Plus (merged with complementary element)",
                f"Find synergies by combining with related concepts",
            ),
            "adapt": (
                f"Adapted-{concept} (modified for new context)",
                f"Transfer core principles to a different domain or use case",
            ),
            "modify": (
                f"Enhanced-{concept} (amplified key attributes)",
                f"Magnify strengths or alter properties for different results",
            ),
            "put_to_use": (
                f"{concept}-Repurposed (new application)",
                f"Identify unexpected applications beyond original intent",
            ),
            "eliminate": (
                f"Essential-{concept} (pared down to core)",
                f"Remove non-essential elements to reveal core value",
            ),
            "reverse": (
                f"Inverted-{concept} (reversed logic)",
                f"Flip assumptions or reverse the process to gain new insights",
            ),
        }
        return handlers.get(
            technique,
            (f"SCAMPER-{concept}", f"Apply {technique} to {concept}"),
        )

    def _score_technique(self, technique: str) -> float:
        scores = {
            "substitute": 0.6,
            "combine": 0.8,
            "adapt": 0.7,
            "modify": 0.5,
            "put_to_use": 0.85,
            "eliminate": 0.75,
            "reverse": 0.9,
        }
        return scores.get(technique, 0.5) + random.uniform(
            -0.1, 0.1
        )


# ============================================================
# Creativity Evaluator
# ============================================================

class CreativityEvaluator:
    """创意评估器 — 多维度评估创意质量。

    评估维度:
      - novelty (新颖性): 与已知方案的差异度
      - feasibility (可行性): 技术和资源可实现程度
      - impact (影响力): 潜在的正面影响范围
      - elegance (简洁性): 方案的简洁和优雅程度
      - surprise (意外性): 超出预期的程度
    """

    def evaluate(
        self, idea: CreativeIdea
    ) -> dict[str, float]:
        """评估一个创意在各维度的得分。"""
        scores = {
            "novelty": self._score_novelty(idea),
            "feasibility": self._score_feasibility(idea),
            "impact": self._score_impact(idea),
            "elegance": self._score_elegance(idea),
            "surprise": self._score_surprise(idea),
        }
        return scores

    def evaluate_batch(
        self, ideas: list[CreativeIdea]
    ) -> list[CreativeIdea]:
        """批量评估并排序。"""
        for idea in ideas:
            idea.scores = self.evaluate(idea)

        ideas.sort(
            key=lambda i: self._weighted_score(i),
            reverse=True,
        )
        return ideas

    def _score_novelty(self, idea: CreativeIdea) -> float:
        base = 0.5
        if len(idea.source_concepts) >= 2:
            base += 0.2
        if idea.method == "random_combination":
            base += 0.15
        if idea.method == "analogy":
            base += 0.1
        return min(base + random.uniform(0, 0.15), 1.0)

    def _score_feasibility(self, idea: CreativeIdea) -> float:
        base = 0.6
        if idea.method == "scamper":
            base += 0.1
        if idea.method == "analogy":
            base += 0.05
        return min(base + random.uniform(-0.1, 0.1), 1.0)

    def _score_impact(self, idea: CreativeIdea) -> float:
        base = 0.4
        if len(idea.description) > 100:
            base += 0.1
        if len(idea.source_concepts) > 2:
            base += 0.1
        return min(base + random.uniform(-0.1, 0.2), 1.0)

    def _score_elegance(self, idea: CreativeIdea) -> float:
        return min(0.5 + random.uniform(-0.2, 0.3), 1.0)

    def _score_surprise(self, idea: CreativeIdea) -> float:
        base = 0.3
        if idea.method == "random_combination":
            base += 0.3
        if idea.method == "reverse_thinking":
            base += 0.2
        return min(base + random.uniform(-0.1, 0.15), 1.0)

    @staticmethod
    def _weighted_score(idea: CreativeIdea) -> float:
        s = idea.scores
        return (
            s.get("novelty", 0) * 0.3
            + s.get("feasibility", 0) * 0.25
            + s.get("impact", 0) * 0.2
            + s.get("elegance", 0) * 0.15
            + s.get("surprise", 0) * 0.1
        )


# ============================================================
# Creative Synthesis Engine (Main Class)
# ============================================================

class CreativeSynthesisEngine:
    """创意合成引擎主类。

    综合概念关联、类比推理、逆向思维、随机组合和 SCAMPER 方法，
    生成跨领域的创新想法并评估。

    Usage:
        engine = CreativeSynthesisEngine()
        result = engine.synthesize(
            "How can AI improve education?",
            ["AI", "education", "personalization", "engagement"],
        )
        for idea in result.ideas[:3]:
            print(f"  {idea.title}: {idea.description[:80]}")
    """

    def __init__(
        self, config: Optional[CreativeConfig] = None
    ) -> None:
        self.config = config or CreativeConfig()
        self._graph_builder = ConceptGraphBuilder()
        self._analogy = AnalogyReasoner()
        self._reverse = ReverseThinkingGenerator()
        self._random_combinator = RandomCombinator()
        self._scamper = SCAMPEREngine()
        self._evaluator = CreativityEvaluator()

    # ----- Public API -----

    def synthesize(
        self,
        prompt: str,
        concepts: list[str],
    ) -> SynthesisResult:
        """执行创意合成主流程。

        Args:
            prompt: 创意目标或问题描述。
            concepts: 相关概念列表。

        Returns:
            SynthesisResult 包含生成的创意和评估数据。
        """
        result = SynthesisResult(
            title=f"Synthesis: {prompt[:60]}",
            metadata={"prompt": prompt, "input_concepts": concepts},
        )

        result.concept_graph = self._graph_builder.build(concepts)

        ideas: list[CreativeIdea] = []

        if self.config.enable_analogy:
            for concept in concepts[:3]:
                analogies = self._analogy.generate_analogies(
                    concept, max_results=2
                )
                for a in analogies:
                    ideas.extend(
                        self._analogies_to_ideas(
                            a, concepts
                        )
                    )

        if self.config.enable_reverse:
            paths = self._reverse.generate_paths(
                prompt, num_paths=2
            )
            for path in paths:
                ideas.append(
                    CreativeIdea(
                        id=f"rev_{path['id']}",
                        title=f"Reverse Path to {path['goal'][:50]}",
                        description=path["template"]
                        .replace("{goal}", path["goal"])
                        .replace("{preconditions}", "key requirements")
                        .replace("{conditions}", "minimal conditions")
                        .replace("{step1}", "step 1")
                        .replace("{step2}", "step 2")
                        .replace("{step3}", "step 3"),
                        method="reverse_thinking",
                        source_concepts=concepts,
                    )
                )

        if self.config.enable_scamper:
            for concept in concepts[:3]:
                scamper_results = self._scamper.apply(concept)
                for sr in scamper_results:
                    ideas.append(
                        CreativeIdea(
                            id=f"scamper_{hashlib.md5(sr.transformed.encode()).hexdigest()[:8]}",
                            title=sr.transformed,
                            description=sr.rationale,
                            method=f"scamper_{sr.technique.lower()}",
                            source_concepts=[concept],
                            scores={
                                "creativity_score": sr.creativity_score
                            },
                        )
                    )

        if self.config.enable_random:
            combos = self._random_combinator.generate_combinations(
                concepts + self._random_combinator._CONCEPT_POOL[:10],
                num=5,
            )
            random_ideas = (
                self._random_combinator.generate_ideas_from_combinations(
                    combos
                )
            )
            ideas.extend(random_ideas)

        ideas = self._deduplicate_ideas(ideas)
        ideas = self._evaluator.evaluate_batch(ideas)
        ideas = [
            i
            for i in ideas
            if self._evaluator._weighted_score(i)
            >= self.config.creativity_threshold
        ]
        result.ideas = ideas[: self.config.max_ideas]

        result.overall_score = self._compute_overall_score(result)
        result.summary = self._generate_summary(result)

        return result

    def evaluate_idea(
        self, idea: CreativeIdea
    ) -> dict[str, float]:
        """单独评估一个创意。"""
        return self._evaluator.evaluate(idea)

    def format_ideas(
        self, result: SynthesisResult
    ) -> str:
        """格式化创意结果为可读文本。"""
        lines = [
            f"# {result.title}",
            f"Overall Score: {result.overall_score:.2f}",
            f"Generated {len(result.ideas)} ideas",
            "",
        ]

        for i, idea in enumerate(result.ideas, 1):
            lines.append(f"## Idea {i}: {idea.title}")
            lines.append(f"Method: {idea.method}")
            lines.append(f"Description: {idea.description}")
            if idea.source_concepts:
                lines.append(
                    f"Concepts: {', '.join(idea.source_concepts)}"
                )
            if idea.scores:
                score_str = ", ".join(
                    f"{k}={v:.2f}" for k, v in idea.scores.items()
                )
                lines.append(f"Scores: {score_str}")
            lines.append("")

        if result.concept_graph:
            lines.append("## Concept Graph")
            lines.append(
                f"Nodes: {len(result.concept_graph.nodes)}"
            )
            lines.append(
                f"Edges: {len(result.concept_graph.edges)}"
            )

        return "\n".join(lines)

    # ----- Internal Methods -----

    def _analogies_to_ideas(
        self,
        analogy: AnalogyResult,
        source_concepts: list[str],
    ) -> list[CreativeIdea]:
        ideas: list[CreativeIdea] = []
        for insight in analogy.insights:
            ideas.append(
                CreativeIdea(
                    id=f"analogy_{hashlib.md5(insight.encode()).hexdigest()[:8]}",
                    title=f"Analogy: {analogy.source_domain} → {analogy.target_domain}",
                    description=insight,
                    method="analogy",
                    source_concepts=source_concepts,
                    scores={
                        "creativity": analogy.creativity_score,
                        "structure": analogy.structural_score,
                    },
                )
            )
        return ideas

    def _deduplicate_ideas(
        self, ideas: list[CreativeIdea]
    ) -> list[CreativeIdea]:
        seen: set[str] = set()
        unique: list[CreativeIdea] = []
        for idea in ideas:
            key = f"{idea.title}|{idea.method}"
            if key not in seen:
                seen.add(key)
                unique.append(idea)
        return unique

    def _compute_overall_score(
        self, result: SynthesisResult
    ) -> float:
        if not result.ideas:
            return 0.0
        weighted_scores = [
            self._evaluator._weighted_score(i)
            for i in result.ideas
        ]
        return sum(weighted_scores) / len(weighted_scores)

    def _generate_summary(
        self, result: SynthesisResult
    ) -> str:
        methods = Counter(i.method for i in result.ideas)
        return (
            f"Generated {len(result.ideas)} creative ideas using "
            f"{len(methods)} methods: "
            + ", ".join(
                f"{m}({c})" for m, c in methods.most_common()
            )
            + f". Overall creativity score: {result.overall_score:.2f}"
        )
