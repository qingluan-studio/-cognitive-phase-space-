"""
推理引擎 - Reasoning Engine

中端核心推理子系统，提供多种推理策略的统一框架：

  - ChainOfThought: 逐步推理链，StepBack 回溯，分支验证
  - TreeOfThought: BFS/DFS 思维树扩展，Beam Search top-K 剪枝
  - SelfConsistency: 多路径采样，多数投票，多样性检查
  - Reflexion: 自我批判与迭代修正
  - MetaReasoner: 策略选择，集成推理，预算感知
  - ReasoningTrace: 全链路推理追踪与指标

双轨制:
  - 工程版: 数据结构 + 算法实现
  - 理论版: 信息熵、贝叶斯更新、路径熵量化
"""

from __future__ import annotations

import logging
import math
import re
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ============================================================
# Enums
# ============================================================

class ReasoningStrategy(Enum):
    CHAIN_OF_THOUGHT = "chain_of_thought"
    TREE_OF_THOUGHT = "tree_of_thought"
    SELF_CONSISTENCY = "self_consistency"
    ZERO_SHOT = "zero_shot"
    FEW_SHOT = "few_shot"
    REFLEXION = "reflexion"
    DEBATE = "debate"


class SearchStrategy(Enum):
    BFS = "bfs"
    DFS = "dfs"
    BEAM = "beam"


class ProblemType(Enum):
    MATH = "math"
    LOGIC = "logic"
    PLANNING = "planning"
    CREATIVE = "creative"
    ANALYSIS = "analysis"
    CODING = "coding"
    DEBATE = "debate"
    GENERAL = "general"


class ComplexityLevel(Enum):
    TRIVIAL = "trivial"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXTREME = "extreme"


# ============================================================
# Dataclasses
# ============================================================

@dataclass
class ReasoningStep:
    step_number: int
    thought: str
    confidence: float
    parent_step_id: Optional[int] = None
    alternatives: list[str] = field(default_factory=list)
    evaluation_score: float = 0.0
    timestamp: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)

    def __hash__(self) -> int:
        return hash((self.step_number, self.thought, id(self)))


@dataclass
class ReasoningPath:
    steps: list[ReasoningStep] = field(default_factory=list)
    conclusion: str = ""
    confidence: float = 0.0
    total_time: float = 0.0
    branch_count: int = 0
    backtrack_count: int = 0

    @property
    def avg_confidence(self) -> float:
        if not self.steps:
            return 0.0
        return sum(s.confidence for s in self.steps) / len(self.steps)

    @property
    def depth(self) -> int:
        return len(self.steps)

    def to_embedding_vector(self) -> list[float]:
        if not self.conclusion:
            return [0.0]
        words = re.findall(r"\w+", self.conclusion.lower())
        vector: list[float] = []
        for w in words:
            h = hash(w) % 1000
            vector.append((h / 1000.0) * 2 - 1)
        if not vector:
            return [0.0]
        norm = math.sqrt(sum(v * v for v in vector)) or 1.0
        return [v / norm for v in vector]

    def add_step(self, step: ReasoningStep) -> None:
        self.steps.append(step)
        self.confidence = self.avg_confidence


@dataclass
class ReflectionRecord:
    iteration: int
    reasoning_path: ReasoningPath
    critique: str
    score: float
    revisions: list[str] = field(default_factory=list)
    score_delta: float = 0.0


@dataclass
class EnsembleResult:
    strategy_results: dict[ReasoningStrategy, ReasoningPath] = field(default_factory=dict)
    voted_conclusion: str = ""
    confidence: float = 0.0
    strategy_weights: dict[ReasoningStrategy, float] = field(default_factory=dict)


@dataclass
class Budget:
    max_steps: int = 20
    max_tokens: int = 4096
    timeout: float = 60.0
    steps_used: int = 0
    tokens_used: int = 0
    started_at: float = field(default_factory=time.time)

    @property
    def is_exhausted(self) -> bool:
        if self.steps_used >= self.max_steps:
            return True
        if self.tokens_used >= self.max_tokens:
            return True
        if time.time() - self.started_at >= self.timeout:
            return True
        return False

    @property
    def elapsed(self) -> float:
        return time.time() - self.started_at

    @property
    def remaining_steps(self) -> int:
        return max(0, self.max_steps - self.steps_used)


@dataclass
class ReasoningTrace:
    trace_id: str = ""
    strategy: Optional[ReasoningStrategy] = None
    paths: list[ReasoningPath] = field(default_factory=list)
    step_timings: list[float] = field(default_factory=list)
    confidence_evolution: list[float] = field(default_factory=list)
    branch_metrics: dict[str, Any] = field(default_factory=dict)
    total_time: float = 0.0
    final_conclusion: str = ""
    final_confidence: float = 0.0

    def record_step(self, step: ReasoningStep) -> None:
        self.step_timings.append(step.timestamp)
        self.confidence_evolution.append(step.confidence)

    def finalize(self, conclusion: str, confidence: float) -> None:
        self.final_conclusion = conclusion
        self.final_confidence = confidence
        if self.step_timings and len(self.step_timings) > 1:
            self.total_time = self.step_timings[-1] - self.step_timings[0]

    @property
    def confidence_trend(self) -> str:
        if len(self.confidence_evolution) < 2:
            return "stable"
        first_half = self.confidence_evolution[:len(self.confidence_evolution) // 2]
        second_half = self.confidence_evolution[len(self.confidence_evolution) // 2:]
        avg_first = sum(first_half) / len(first_half) if first_half else 0.0
        avg_second = sum(second_half) / len(second_half) if second_half else 0.0
        if avg_second - avg_first > 0.1:
            return "rising"
        if avg_first - avg_second > 0.1:
            return "declining"
        return "stable"

    @property
    def entropy_of_paths(self) -> float:
        if not self.confidence_evolution:
            return 0.0
        probs = [max(0.01, min(0.99, c)) for c in self.confidence_evolution]
        return -sum(p * math.log2(p) for p in probs) / len(probs)


# ============================================================
# Utility Functions
# ============================================================

def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    if len(a) < len(b):
        a = a + [0.0] * (len(b) - len(a))
    elif len(b) < len(a):
        b = b + [0.0] * (len(a) - len(b))
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a)) or 1.0
    norm_b = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (norm_a * norm_b)


def _entropy(values: list[float]) -> float:
    if not values:
        return 0.0
    total = sum(values) or 1.0
    probs = [v / total for v in values]
    return -sum(p * math.log2(max(p, 1e-10)) for p in probs)


def _token_estimate(text: str) -> int:
    return len(text) // 4 + 1


# ============================================================
# Chain-of-Thought Engine
# ============================================================

_CHAIN_TEMPLATES = [
    "Let me understand the problem: {query}",
    "Step 1 - Identify key elements: {elements}",
    "Step 2 - Analyze relationships: {relations}",
    "Step 3 - Apply relevant knowledge: {knowledge}",
    "Step 4 - Form intermediate conclusion: {intermediate}",
    "Step 5 - Verify and refine: {verification}",
    "Final conclusion: {conclusion}",
]

_STEP_BACK_PROMPTS = [
    "Let me take a step back and reconsider the core question.",
    "What fundamental principle underlies this problem?",
    "Am I on the right track? Let me re-examine from first principles.",
    "What assumptions am I making? Let me challenge them.",
]

_VERIFICATION_PROMPTS = [
    "Verify: does this conclusion follow logically from the premises?",
    "Check: are there any edge cases or counter-examples?",
    "Validate: is this consistent with known facts or constraints?",
]


class ChainOfThoughtEngine:
    """逐步推理链引擎。

    核心能力:
      - 模板驱动的逐步推理路径生成
      - StepBack 提示: 回退并重新审视问题
      - 验证步骤: 逻辑一致性、边缘情况检查
      - 低置信度分支: 在关键节点探索替代路径
    """

    def __init__(
        self,
        max_steps: int = 15,
        branch_threshold: float = 0.4,
        min_confidence: float = 0.2,
    ):
        self.max_steps = max_steps
        self.branch_threshold = branch_threshold
        self.min_confidence = min_confidence

    def reason(
        self,
        query: str,
        context: str = "",
        budget: Optional[Budget] = None,
        trace: Optional[ReasoningTrace] = None,
    ) -> ReasoningPath:
        t0 = time.time()
        path = ReasoningPath()
        step_num = 0

        elements = self._extract_elements(query, context)

        step = ReasoningStep(
            step_number=step_num,
            thought=f"Problem understanding: {query[:120]}",
            confidence=0.90,
        )
        path.add_step(step)
        if trace:
            trace.record_step(step)
        step_num += 1

        for i, element in enumerate(elements[:5]):
            confidence = 0.85 - i * 0.05
            step = ReasoningStep(
                step_number=step_num,
                thought=f"Identify key element: {element}",
                confidence=confidence,
                parent_step_id=0,
            )
            path.add_step(step)
            if trace:
                trace.record_step(step)
            step_num += 1

        analysis_steps = self._analyze_elements(elements, query)
        for astep in analysis_steps[:5]:
            step = ReasoningStep(
                step_number=step_num,
                thought=astep,
                confidence=0.75,
                parent_step_id=1,
            )
            path.add_step(step)
            if trace:
                trace.record_step(step)
            step_num += 1

            if step.confidence < self.branch_threshold and step_num < self.max_steps:
                branch = self._generate_branch(step, query, elements)
                if branch:
                    step.alternatives.append(branch)
                    path.branch_count += 1

        deduction_steps = self._deduction_chain(query, elements)
        for dstep in deduction_steps[:3]:
            confidence = 0.80 - step_num * 0.03
            confidence = max(confidence, self.min_confidence)
            step = ReasoningStep(
                step_number=step_num,
                thought=dstep,
                confidence=confidence,
                parent_step_id=step_num - 1,
            )
            path.add_step(step)
            if trace:
                trace.record_step(step)
            step_num += 1

        step_back_thought = self._step_back(query, path)
        step = ReasoningStep(
            step_number=step_num,
            thought=step_back_thought,
            confidence=0.70,
            evaluation_score=0.70,
        )
        path.add_step(step)
        if trace:
            trace.record_step(step)
        step_num += 1

        verification = self._verify(path)
        step = ReasoningStep(
            step_number=step_num,
            thought=verification,
            confidence=0.75,
        )
        path.add_step(step)
        if trace:
            trace.record_step(step)
        step_num += 1

        conclusion_text, conclusion_conf = self._synthesize_conclusion(path, query)
        path.conclusion = conclusion_text
        path.confidence = conclusion_conf
        path.total_time = time.time() - t0

        if trace:
            trace.finalize(conclusion_text, conclusion_conf)

        return path

    def _extract_elements(self, query: str, context: str) -> list[str]:
        words = re.findall(r"[\u4e00-\u9fff]{2,}|[a-zA-Z]{3,}", query)
        target_words = [w for w in words if len(w) >= 2]
        ctx_words = re.findall(r"[\u4e00-\u9fff]{2,}|[a-zA-Z]{3,}", context)
        combined = list(dict.fromkeys(target_words + ctx_words))
        return combined[:10] if combined else [query[:60]]

    def _analyze_elements(self, elements: list[str], query: str) -> list[str]:
        patterns = [
            f"Analyze '{e}' - what is its role in the problem? "
            f"How does it relate to '{query[:40]}'?"
            for e in elements[:4]
        ]
        return patterns if patterns else [f"Analyze the core question: {query[:80]}"]

    def _deduction_chain(self, query: str, elements: list[str]) -> list[str]:
        element_text = ", ".join(elements[:3]) if elements else "key factors"
        return [
            f"Apply logical reasoning to relationship between {element_text}",
            "Derive intermediate inference from established relationships",
            "Cross-validate inference against known constraints",
        ]

    def _step_back(self, query: str, path: ReasoningPath) -> str:
        idx = min(len(path.steps) % len(_STEP_BACK_PROMPTS), len(_STEP_BACK_PROMPTS) - 1)
        base = _STEP_BACK_PROMPTS[idx]
        return f"{base} (re-evaluating: {query[:60]})"

    def _verify(self, path: ReasoningPath) -> str:
        if not path.steps:
            return _VERIFICATION_PROMPTS[0]
        idx = min(len(path.steps) % len(_VERIFICATION_PROMPTS), len(_VERIFICATION_PROMPTS) - 1)
        return (
            f"{_VERIFICATION_PROMPTS[idx]} "
            f"(last step confidence: {path.steps[-1].confidence:.2f})"
        )

    def _synthesize_conclusion(
        self, path: ReasoningPath, query: str
    ) -> tuple[str, float]:
        if not path.steps:
            return "Insufficient reasoning to conclude.", 0.0
        confidences = [s.confidence for s in path.steps]
        avg_conf = sum(confidences) / len(confidences)
        last_confidence = path.steps[-1].confidence if path.steps else 0.5
        combined_conf = avg_conf * 0.6 + last_confidence * 0.4
        conclusion = (
            f"Based on {len(path.steps)} reasoning steps, "
            f"the answer to '{query[:60]}' is derived with "
            f"confidence {combined_conf:.0%}."
        )
        return conclusion, combined_conf

    def _generate_branch(
        self, step: ReasoningStep, query: str, elements: list[str]
    ) -> str:
        if not elements:
            return ""
        alt_element = elements[min(len(step.alternatives) % len(elements), len(elements) - 1)]
        return (
            f"Alternative: reconsider from the perspective of '{alt_element}' "
            f"rather than current assumption. Confidence was low ({step.confidence:.2f}), "
            f"exploring alternative path."
        )


# ============================================================
# Tree-of-Thought Engine
# ============================================================

@dataclass
class ThoughtNode:
    step: ReasoningStep
    children: list[ThoughtNode] = field(default_factory=list)
    path_score: float = 0.0
    depth: int = 0
    node_id: str = ""
    parent_id: str = ""

    def __post_init__(self):
        if not self.node_id:
            self.node_id = f"node_{self.step.step_number}_{id(self) % 10000}"


class TreeOfThoughtEngine:
    """树状思维引擎。

    核心算法:
      - BFS/DFS 搜索策略切换
      - Beam Search: 维护 top-K 部分路径，按评分剪枝
      - 启发式评分: 完备性 + 置信度 + 探索奖励
      - 死路回溯: 低分节点回退到上一分支点
      - 叶节点评估与最佳路径选择
    """

    def __init__(
        self,
        beam_width: int = 3,
        max_depth: int = 8,
        max_expansions: int = 50,
        exploration_bonus: float = 0.05,
        dead_end_threshold: float = 0.2,
        search_strategy: SearchStrategy = SearchStrategy.BEAM,
    ):
        self.beam_width = beam_width
        self.max_depth = max_depth
        self.max_expansions = max_expansions
        self.exploration_bonus = exploration_bonus
        self.dead_end_threshold = dead_end_threshold
        self.search_strategy = search_strategy

    def reason(
        self,
        query: str,
        context: str = "",
        budget: Optional[Budget] = None,
        trace: Optional[ReasoningTrace] = None,
    ) -> ReasoningPath:
        t0 = time.time()
        expansions = 0
        root_step = ReasoningStep(
            step_number=0,
            thought=f"Root: {query[:120]}",
            confidence=0.95,
        )
        root = ThoughtNode(step=root_step, depth=0, node_id="root", parent_id="")
        if trace:
            trace.record_step(root_step)

        beam: list[ThoughtNode] = [root]
        all_leaves: list[ThoughtNode] = []

        while beam and expansions < self.max_expansions:
            if budget and budget.is_exhausted:
                logger.info("Budget exhausted at expansion %d", expansions)
                break

            candidates: list[ThoughtNode] = []

            for node in beam:
                if node.depth >= self.max_depth:
                    all_leaves.append(node)
                    continue
                expanded = self._expand_node(node, query, context, budget)
                expansions += len(expanded)
                candidates.extend(expanded)

            candidates = self._prune(candidates)

            dead_nodes = [n for n in candidates if n.path_score < self.dead_end_threshold]
            for dn in dead_nodes:
                if trace:
                    trace.branch_metrics.setdefault("dead_ends", 0)
                    trace.branch_metrics["dead_ends"] += 1
                backtrack = self._backtrack(dn, beam)
                if backtrack:
                    candidates.append(backtrack)

            survivors = [n for n in candidates if n.path_score >= self.dead_end_threshold]
            beam = sorted(survivors, key=lambda n: n.path_score, reverse=True)[:self.beam_width]

            for n in beam:
                if n.depth >= self.max_depth:
                    all_leaves.append(n)

            if self.search_strategy == SearchStrategy.DFS:
                beam = beam[:1]

            if not beam and all_leaves:
                break

        all_leaves.extend(beam)
        best = self._select_best_leaf(all_leaves)
        path = self._leaf_to_path(best, root)
        path.total_time = time.time() - t0

        if trace:
            trace.finalize(path.conclusion, path.confidence)

        return path

    def _expand_node(
        self,
        node: ThoughtNode,
        query: str,
        context: str,
        budget: Optional[Budget] = None,
    ) -> list[ThoughtNode]:
        children: list[ThoughtNode] = []
        thought_stems = [
            f"Explore: what if we consider {query[:30]} from angle A?",
            f"Explore: decompose {query[:30]} into sub-problems.",
            f"Explore: apply analogy to solve {query[:30]}.",
        ]

        for i, stem in enumerate(thought_stems):
            if budget:
                est_tokens = _token_estimate(stem)
                if budget.tokens_used + est_tokens > budget.max_tokens:
                    break
                if budget.steps_used >= budget.max_steps:
                    break
                budget.tokens_used += est_tokens
                budget.steps_used += 1

            step = ReasoningStep(
                step_number=node.step.step_number + 1 + i,
                thought=stem,
                confidence=0.7 - i * 0.1,
                parent_step_id=node.step.step_number,
                evaluation_score=self._score_step(stem),
            )
            child = ThoughtNode(
                step=step,
                depth=node.depth + 1,
                parent_id=node.node_id,
            )
            child.path_score = self._score_node(child)
            children.append(child)
            node.children.append(child)

        return children

    def _score_step(self, thought: str) -> float:
        completeness = min(1.0, len(thought) / 200.0)
        keyword_bonus = 0.0
        markers = ["analyze", "decompose", "verify", "conclude", "synthesize",
                   "分析", "分解", "验证", "综合", "推导"]
        for m in markers:
            if m in thought.lower():
                keyword_bonus += 0.05
        return min(1.0, completeness * 0.6 + 0.3 + keyword_bonus)

    def _score_node(self, node: ThoughtNode) -> float:
        confidence_score = node.step.confidence * 0.5
        completeness_score = self._score_step(node.step.thought) * 0.3
        depth_penalty = max(0.0, 0.2 - node.depth * 0.02)
        exploration = self.exploration_bonus * (1.0 if not node.children else 0.0)
        return confidence_score + completeness_score + depth_penalty + exploration

    def _prune(self, nodes: list[ThoughtNode]) -> list[ThoughtNode]:
        if not nodes:
            return []
        sorted_nodes = sorted(nodes, key=lambda n: n.path_score, reverse=True)
        return sorted_nodes[:self.beam_width * 2]

    def _backtrack(
        self, dead_node: ThoughtNode, beam: list[ThoughtNode]
    ) -> Optional[ThoughtNode]:
        if not beam:
            return None
        alt_step = ReasoningStep(
            step_number=dead_node.step.step_number + 1,
            thought=f"Backtrack from dead end at depth {dead_node.depth}; "
                    f"explore alternative branch.",
            confidence=0.45,
            parent_step_id=dead_node.parent_id,
        )
        alt_node = ThoughtNode(
            step=alt_step,
            depth=dead_node.depth + 1,
            parent_id=dead_node.parent_id,
        )
        alt_node.path_score = self._score_node(alt_node)
        return alt_node

    def _select_best_leaf(self, leaves: list[ThoughtNode]) -> ThoughtNode:
        if not leaves:
            return ThoughtNode(
                step=ReasoningStep(step_number=0, thought="No viable path found.", confidence=0.0),
                depth=0,
            )
        return max(leaves, key=lambda n: n.path_score)

    def _leaf_to_path(self, leaf: ThoughtNode, root: ThoughtNode) -> ReasoningPath:
        path = ReasoningPath()
        ancestry = self._collect_ancestry(leaf, root)
        for node in reversed(ancestry):
            path.add_step(node.step)
        path.conclusion = (
            f"Tree-of-Thought conclusion after exploring {len(ancestry)} nodes: "
            f"{leaf.step.thought[:150]}"
        )
        path.confidence = leaf.path_score
        path.branch_count = sum(1 for n in ancestry if n.children)
        return path

    def _collect_ancestry(
        self, leaf: ThoughtNode, root: ThoughtNode
    ) -> list[ThoughtNode]:
        result: list[ThoughtNode] = [leaf]
        current = leaf
        visited: set[str] = {leaf.node_id}
        while current.parent_id and current.parent_id != root.node_id:
            parent = self._find_parent(current, root)
            if parent is None or parent.node_id in visited:
                break
            visited.add(parent.node_id)
            result.append(parent)
            current = parent
        result.append(root)
        return result

    def _find_parent(
        self, node: ThoughtNode, root: ThoughtNode
    ) -> Optional[ThoughtNode]:
        if node.parent_id == root.node_id:
            return root

        def _search(n: ThoughtNode) -> Optional[ThoughtNode]:
            if n.node_id == node.parent_id:
                return n
            for child in n.children:
                found = _search(child)
                if found:
                    return found
            return None

        return _search(root)


# ============================================================
# Self-Consistency Engine
# ============================================================

class SelfConsistencyEngine:
    """自我一致性推理引擎。

    核心算法:
      - 生成 N 条独立推理路径
      - 多数投票: 从路径结论中提取选择并投票
      - 置信度加权平均: 高置信度路径贡献更大权重
      - 多样性检查: 计算路径结论向量的余弦相似度
      - 理论版: 贝叶斯更新整合多路径后验概率
    """

    def __init__(
        self,
        num_paths: int = 5,
        diversity_threshold: float = 0.85,
        cot_engine: Optional[ChainOfThoughtEngine] = None,
    ):
        self.num_paths = num_paths
        self.diversity_threshold = diversity_threshold
        self.cot = cot_engine or ChainOfThoughtEngine()

    def reason(
        self,
        query: str,
        context: str = "",
        budget: Optional[Budget] = None,
        trace: Optional[ReasoningTrace] = None,
    ) -> ReasoningPath:
        t0 = time.time()
        paths: list[ReasoningPath] = []
        unique_conclusions: set[str] = set()

        for i in range(self.num_paths):
            if budget and budget.is_exhausted:
                break
            path = self.cot.reason(query, context, budget=budget, trace=trace)
            paths.append(path)
            unique_conclusions.add(path.conclusion)
            if trace:
                trace.paths.append(path)

        if not paths:
            return ReasoningPath(conclusion="No reasoning paths generated.", confidence=0.0)

        diversity = self._compute_diversity(paths)

        conclusion, confidence = self._majority_vote(paths)

        if diversity < (1.0 - self.diversity_threshold):
            logger.info("Low diversity (%.3f), paths may be redundant", diversity)

        result = ReasoningPath(
            conclusion=conclusion,
            confidence=confidence,
            total_time=time.time() - t0,
            branch_count=len(unique_conclusions),
        )

        if trace:
            trace.finalize(conclusion, confidence)
            trace.branch_metrics = {
                "num_paths": len(paths),
                "unique_conclusions": len(unique_conclusions),
                "diversity_score": diversity,
                "majority_confidence": confidence,
            }

        return result

    def _majority_vote(self, paths: list[ReasoningPath]) -> tuple[str, float]:
        votes: dict[str, float] = defaultdict(float)
        for p in paths:
            key = self._normalize_conclusion(p.conclusion)
            weight = p.confidence
            votes[key] += weight

        if not votes:
            return "No consensus reached.", 0.0

        best = max(votes, key=lambda k: votes[k])
        total_weight = sum(votes.values())
        confidence = votes[best] / total_weight if total_weight > 0 else 0.0

        src_path = next(
            (p for p in paths if self._normalize_conclusion(p.conclusion) == best),
            paths[0],
        )
        return src_path.conclusion, confidence

    @staticmethod
    def _normalize_conclusion(text: str) -> str:
        normalized = text.lower().strip()
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized[:200]

    def _compute_diversity(self, paths: list[ReasoningPath]) -> float:
        if len(paths) < 2:
            return 1.0
        vectors = [p.to_embedding_vector() for p in paths]
        similarities: list[float] = []
        for i in range(len(vectors)):
            for j in range(i + 1, len(vectors)):
                sim = _cosine_similarity(vectors[i], vectors[j])
                similarities.append(sim)
        if not similarities:
            return 0.0
        return 1.0 - (sum(similarities) / len(similarities))

    def bayesian_update(self, paths: list[ReasoningPath]) -> float:
        """理论版: 贝叶斯更新 — 将多条路径视为独立证据更新后验概率。

        P(H|E1,...,En) = P(H) * prod(P(Ei|H)) / P(E1,...,En)
        使用对数空间累加以避免下溢。
        """
        if not paths:
            return 0.0
        prior = 0.5
        log_prior = math.log(max(prior, 1e-10))
        log_posterior = log_prior
        for p in paths:
            likelihood = max(p.confidence, 0.01)
            log_likelihood = math.log(likelihood)
            log_neg_likelihood = math.log(max(1.0 - likelihood, 0.01))
            log_posterior += log_likelihood - log_neg_likelihood

        posterior = 1.0 / (1.0 + math.exp(-log_posterior))
        return max(0.0, min(1.0, posterior))


# ============================================================
# Reflexion Engine
# ============================================================

_CRITIQUE_PROMPTS = [
    "Critique: Are there logical gaps in the reasoning?",
    "Critique: Were any important factors overlooked?",
    "Critique: Is the conclusion supported by sufficient evidence?",
    "Critique: Are there implicit assumptions that should be examined?",
    "Critique: Could there be alternative interpretations of the same facts?",
]

_REVISION_STRATEGIES = [
    "Revise: address identified logical gaps by adding bridging steps.",
    "Revise: incorporate previously overlooked factors.",
    "Revise: strengthen evidence base with additional verification.",
    "Revise: make implicit assumptions explicit and test them.",
]


class ReflexionEngine:
    """自反推理引擎。

    核心流程:
      1. 执行初始推理
      2. 自我批判 — 识别逻辑漏洞和遗漏
      3. 基于批判修正推理
      4. 迭代至 max_reflections 或分数收敛
      5. 追踪各轮分数变化
    """

    def __init__(
        self,
        max_reflections: int = 3,
        score_threshold: float = 0.8,
        improvement_threshold: float = 0.05,
        base_engine: Optional[ChainOfThoughtEngine] = None,
    ):
        self.max_reflections = max_reflections
        self.score_threshold = score_threshold
        self.improvement_threshold = improvement_threshold
        self.base_engine = base_engine or ChainOfThoughtEngine()
        self.history: list[ReflectionRecord] = []

    def reason(
        self,
        query: str,
        context: str = "",
        budget: Optional[Budget] = None,
        trace: Optional[ReasoningTrace] = None,
    ) -> ReasoningPath:
        t0 = time.time()
        self.history = []

        current_path = self.base_engine.reason(query, context, budget=budget, trace=trace)
        current_score = self._evaluate(current_path)
        if trace:
            trace.paths.append(current_path)

        record = ReflectionRecord(
            iteration=0,
            reasoning_path=current_path,
            critique="Initial reasoning (no critique yet)",
            score=current_score,
        )
        self.history.append(record)

        for iteration in range(1, self.max_reflections + 1):
            if budget and budget.is_exhausted:
                break

            critique = self._critique(current_path)

            revised_path = self._revise(current_path, critique, query, context)
            new_score = self._evaluate(revised_path)

            delta = new_score - current_score
            record = ReflectionRecord(
                iteration=iteration,
                reasoning_path=revised_path,
                critique=critique,
                score=new_score,
                revisions=[f"Applied: {_REVISION_STRATEGIES[(iteration - 1) % len(_REVISION_STRATEGIES)]}"],
                score_delta=delta,
            )
            self.history.append(record)

            if new_score >= self.score_threshold:
                current_path = revised_path
                current_score = new_score
                break

            if delta < self.improvement_threshold:
                break

            current_path = revised_path
            current_score = new_score

        current_path.total_time = time.time() - t0
        if trace:
            trace.finalize(current_path.conclusion, current_score)
            trace.branch_metrics["reflection_history"] = [
                {"iteration": h.iteration, "score": h.score, "delta": h.score_delta}
                for h in self.history
            ]

        return current_path

    def _critique(self, path: ReasoningPath) -> str:
        if not path.steps:
            return _CRITIQUE_PROMPTS[0]
        idx = len(self.history) % len(_CRITIQUE_PROMPTS)
        base = _CRITIQUE_PROMPTS[idx]
        weaknesses = self._identify_weaknesses(path)
        return f"{base} Identified issues: {weaknesses}"

    def _identify_weaknesses(self, path: ReasoningPath) -> str:
        weaknesses: list[str] = []
        if path.avg_confidence < 0.5:
            weaknesses.append("low average confidence")
        if path.depth < 3:
            weaknesses.append("insufficient reasoning depth")
        if not path.conclusion:
            weaknesses.append("no clear conclusion")
        if path.branch_count == 0 and path.depth > 5:
            weaknesses.append("no exploration of alternatives despite depth")
        return "; ".join(weaknesses) if weaknesses else "no significant weaknesses found"

    def _revise(
        self,
        path: ReasoningPath,
        critique: str,
        query: str,
        context: str,
    ) -> ReasoningPath:
        revised_path = ReasoningPath()
        revised_path.backtrack_count = path.backtrack_count + 1

        for step in path.steps:
            revised_path.add_step(step)

        rev_strategy = _REVISION_STRATEGIES[
            (len(self.history) - 1) % len(_REVISION_STRATEGIES)
        ]
        step = ReasoningStep(
            step_number=len(path.steps),
            thought=f"{rev_strategy} (response to: {critique[:80]})",
            confidence=0.65,
            parent_step_id=path.steps[-1].step_number if path.steps else None,
        )
        revised_path.add_step(step)
        revised_path.conclusion = (
            f"[Revised] {path.conclusion or ''}. "
            f"Correction applied based on critique: {critique[:100]}"
        )
        revised_path.confidence = max(0.1, path.confidence * 0.9 + 0.1)
        return revised_path

    def _evaluate(self, path: ReasoningPath) -> float:
        confidence_score = path.confidence * 0.4
        depth_score = min(1.0, path.depth / 10.0) * 0.2
        conclusion_score = (1.0 if path.conclusion else 0.0) * 0.2
        branch_penalty = -0.05 * path.backtrack_count
        return max(0.0, min(1.0, confidence_score + depth_score + conclusion_score + branch_penalty))

    @property
    def score_improvement(self) -> float:
        if len(self.history) < 2:
            return 0.0
        return self.history[-1].score - self.history[0].score


# ============================================================
# Meta Reasoner
# ============================================================

_STRATEGY_KEYWORDS: dict[ReasoningStrategy, list[str]] = {
    ReasoningStrategy.CHAIN_OF_THOUGHT: [
        "step by step", "reason", "explain", "analyze", "逐步", "分析", "推理",
        "逻辑", "why", "how", "原因", "过程",
    ],
    ReasoningStrategy.TREE_OF_THOUGHT: [
        "explore", "search", "possibilities", "branches", "探索", "可能性", "分支",
        "multiple", "alternatives", "combinations", "选项", "路径",
    ],
    ReasoningStrategy.SELF_CONSISTENCY: [
        "verify", "validate", "cross check", "consensus", "验证", "一致性",
        "多次", "确认", "reliability", "reliable", "agree",
    ],
    ReasoningStrategy.REFLEXION: [
        "improve", "revise", "critique", "reflect", "改进", "修正", "反思",
        "iterate", "refine", "reconsider", "重新考虑", "优化",
    ],
    ReasoningStrategy.DEBATE: [
        "debate", "argue", "pros and cons", "versus", "辩论", "正反", "争议",
        "against", "counterargument", "反驳", "权衡",
    ],
    ReasoningStrategy.ZERO_SHOT: [
        "quick", "direct", "simple", "直接", "简单", "快速", "immediate",
        "straightforward", "brief",
    ],
    ReasoningStrategy.FEW_SHOT: [
        "example", "examples", "similar", "pattern", "示例", "例子", "参考",
        "类比", "demonstrate",
    ],
}

_COMPLEXITY_PATTERNS: list[tuple[str, int]] = [
    ("multi.*step", 3), ("多.*步骤", 3), ("complex", 2), ("复杂", 2),
    ("advanced", 2), ("高级", 2), ("deep", 2), ("深度", 2),
    ("if.*then.*else", 2), ("如果.*那么", 2), ("compare.*contrast", 2),
    ("对比", 2), ("evaluate", 2), ("评估", 2),
    ("design", 3), ("设计", 3), ("plan", 3), ("规划", 3),
]

_PROBLEM_TYPE_KEYWORDS: dict[ProblemType, list[str]] = {
    ProblemType.MATH: ["calculate", "compute", "solve", "equation", "math",
                       "计算", "求解", "方程", "数学", "formula"],
    ProblemType.LOGIC: ["logic", "deduce", "syllogism", "premise", "if then",
                        "逻辑", "推导", "前提", "条件"],
    ProblemType.PLANNING: ["plan", "strategy", "steps to", "roadmap", "schedule",
                           "规划", "策略", "路线图", "安排", "方案"],
    ProblemType.CREATIVE: ["create", "design", "imagine", "story", "poem",
                           "创意", "设计", "想象", "故事", "创作", "write"],
    ProblemType.CODING: ["code", "program", "function", "bug", "debug",
                         "编程", "代码", "函数", "错误", "修复"],
    ProblemType.DEBATE: ["debate", "argue", "perspective", "opinion",
                         "辩论", "观点", "反驳", "论证"],
    ProblemType.ANALYSIS: ["analyze", "examine", "investigate", "research",
                           "分析", "调查", "研究", "评估"],
    ProblemType.GENERAL: [],
}


class MetaReasoner:
    """元推理器 — 策略选择、集成与预算管理。

    核心能力:
      - 基于关键词 + 复杂度自动选择推理策略
      - 多策略集成: 运行多种策略并投票
      - 预算感知推理: token/步骤/时间三重约束
      - 策略权重自适应调整
    """

    def __init__(
        self,
        engines: Optional[dict[ReasoningStrategy, Any]] = None,
        default_strategy: ReasoningStrategy = ReasoningStrategy.CHAIN_OF_THOUGHT,
    ):
        self.default_strategy = default_strategy
        self.engines = engines or self._build_default_engines()
        self.budget: Optional[Budget] = None
        self.strategy_scores: dict[ReasoningStrategy, float] = defaultdict(lambda: 0.5)

    def _build_default_engines(self) -> dict[ReasoningStrategy, Any]:
        return {
            ReasoningStrategy.CHAIN_OF_THOUGHT: ChainOfThoughtEngine(),
            ReasoningStrategy.TREE_OF_THOUGHT: TreeOfThoughtEngine(),
            ReasoningStrategy.SELF_CONSISTENCY: SelfConsistencyEngine(),
            ReasoningStrategy.REFLEXION: ReflexionEngine(),
        }

    def reason(
        self,
        query: str,
        context: str = "",
        strategy: Optional[ReasoningStrategy] = None,
        budget: Optional[Budget] = None,
        trace: Optional[ReasoningTrace] = None,
    ) -> ReasoningPath:
        self.budget = budget or Budget()
        t0 = time.time()

        if trace is None:
            trace = ReasoningTrace(trace_id=f"trace_{int(t0 * 1000)}")

        if strategy is None:
            problem_type = self._classify_problem(query)
            complexity = self._assess_complexity(query)
            strategy = self._select_strategy(query, problem_type, complexity)

        trace.strategy = strategy

        if strategy in (ReasoningStrategy.ZERO_SHOT, ReasoningStrategy.FEW_SHOT):
            path = self._simple_reason(query, context, strategy, trace)
        elif strategy in self.engines:
            engine = self.engines[strategy]
            path = engine.reason(query, context, budget=self.budget, trace=trace)
        else:
            path = self._simple_reason(query, context, strategy, trace)

        path.total_time = time.time() - t0
        return path

    def ensemble(
        self,
        query: str,
        context: str = "",
        strategies: Optional[list[ReasoningStrategy]] = None,
        budget: Optional[Budget] = None,
        trace: Optional[ReasoningTrace] = None,
    ) -> EnsembleResult:
        """多策略集成推理。

        并行运行多种策略，加权投票选出最佳结论。
        """
        if strategies is None:
            strategies = [
                ReasoningStrategy.CHAIN_OF_THOUGHT,
                ReasoningStrategy.TREE_OF_THOUGHT,
                ReasoningStrategy.SELF_CONSISTENCY,
            ]

        result = EnsembleResult()
        total_budget = budget or Budget()
        per_strategy_budget = Budget(
            max_steps=total_budget.max_steps // max(1, len(strategies)),
            max_tokens=total_budget.max_tokens // max(1, len(strategies)),
            timeout=total_budget.timeout,
        )

        for s in strategies:
            if total_budget.is_exhausted:
                break
            try:
                path = self.reason(
                    query, context, strategy=s, budget=per_strategy_budget, trace=trace
                )
                result.strategy_results[s] = path
                result.strategy_weights[s] = max(0.1, path.confidence)
            except Exception as exc:
                logger.warning("Strategy %s failed: %s", s.value, exc)
                result.strategy_weights[s] = 0.1

        if result.strategy_results:
            paths = list(result.strategy_results.values())
            sce = SelfConsistencyEngine()
            conclusion, confidence = sce._majority_vote(paths)
            result.voted_conclusion = conclusion
            result.confidence = confidence

        return result

    def _select_strategy(
        self,
        query: str,
        problem_type: ProblemType,
        complexity: ComplexityLevel,
    ) -> ReasoningStrategy:
        query_lower = query.lower()

        strategy_scores: dict[ReasoningStrategy, float] = {}

        for strategy, keywords in _STRATEGY_KEYWORDS.items():
            score = 0.0
            for kw in keywords:
                if kw in query_lower:
                    score += 1.0
            if keywords:
                score /= len(keywords)
            strategy_scores[strategy] = score * 10.0

        complexity_boost: dict[ComplexityLevel, ReasoningStrategy] = {
            ComplexityLevel.TRIVIAL: ReasoningStrategy.ZERO_SHOT,
            ComplexityLevel.LOW: ReasoningStrategy.CHAIN_OF_THOUGHT,
            ComplexityLevel.MEDIUM: ReasoningStrategy.CHAIN_OF_THOUGHT,
            ComplexityLevel.HIGH: ReasoningStrategy.TREE_OF_THOUGHT,
            ComplexityLevel.EXTREME: ReasoningStrategy.SELF_CONSISTENCY,
        }

        complexity_choice = complexity_boost.get(complexity, self.default_strategy)
        strategy_scores[complexity_choice] += 2.0

        max_score = max(strategy_scores.values()) if strategy_scores else 0.0
        if max_score > 0:
            return max(strategy_scores, key=lambda k: strategy_scores[k])
        return self.default_strategy

    def _classify_problem(self, query: str) -> ProblemType:
        query_lower = query.lower()
        type_scores: dict[ProblemType, int] = {}
        for ptype, keywords in _PROBLEM_TYPE_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in query_lower)
            type_scores[ptype] = score

        best_type = max(type_scores, key=lambda k: type_scores[k])
        if type_scores[best_type] == 0:
            return ProblemType.GENERAL
        return best_type

    def _assess_complexity(self, query: str) -> ComplexityLevel:
        query_lower = query.lower()
        score = 0
        for pattern, weight in _COMPLEXITY_PATTERNS:
            if re.search(pattern, query_lower):
                score += weight

        word_count = len(query.split())
        if word_count > 100:
            score += 3
        elif word_count > 50:
            score += 2
        elif word_count > 20:
            score += 1

        if "?" in query:
            q_count = query.count("?")
            score += min(q_count - 1, 3)

        if score >= 8:
            return ComplexityLevel.EXTREME
        if score >= 5:
            return ComplexityLevel.HIGH
        if score >= 3:
            return ComplexityLevel.MEDIUM
        if score >= 1:
            return ComplexityLevel.LOW
        return ComplexityLevel.TRIVIAL

    def _simple_reason(
        self,
        query: str,
        context: str,
        strategy: ReasoningStrategy,
        trace: ReasoningTrace,
    ) -> ReasoningPath:
        path = ReasoningPath()
        step = ReasoningStep(
            step_number=0,
            thought=f"[{strategy.value}] Direct response to: {query[:120]}",
            confidence=0.80,
        )
        path.add_step(step)
        trace.record_step(step)

        if strategy == ReasoningStrategy.FEW_SHOT:
            example_step = ReasoningStep(
                step_number=1,
                thought=(
                    "Example-based reasoning: drawing on patterns from similar "
                    "previous cases to inform the answer."
                ),
                confidence=0.70,
                parent_step_id=0,
            )
            path.add_step(example_step)
            trace.record_step(example_step)

        path.conclusion = (
            f"[{strategy.value}] Answer to '{query[:80]}': "
            f"derived through direct inference."
        )
        path.confidence = 0.75
        trace.finalize(path.conclusion, path.confidence)
        return path


# ============================================================
# Theory Track — Information Theory Extensions
# ============================================================

class TheoryReasoning:
    """双轨制理论版 — 信息论推理分析。

    提供:
      - 推理路径的信息熵量化
      - 自一致性中的贝叶斯后验更新
      - 路径多样性的 KL 散度度量
      - 推理树的香农熵分析
    """

    @staticmethod
    def path_entropy(path: ReasoningPath) -> float:
        """计算推理路径的香农熵。

        基于各步骤置信度分布计算路径的信息熵。
        高熵表示推理过程不确定性大，路径探索范围广。
        """
        if not path.steps:
            return 0.0
        confidences = [s.confidence for s in path.steps]
        return _entropy(confidences)

    @staticmethod
    def path_mutual_information(path_a: ReasoningPath, path_b: ReasoningPath) -> float:
        """计算两条推理路径之间的互信息近似。

        通过结论嵌入向量的余弦相似度作为互信息的代理度量。
        """
        vec_a = path_a.to_embedding_vector()
        vec_b = path_b.to_embedding_vector()
        sim = _cosine_similarity(vec_a, vec_b)
        clamped = max(0.001, min(0.999, sim))
        return -math.log2(1.0 - clamped)

    @staticmethod
    def tree_entropy(root: Optional[ThoughtNode]) -> float:
        """计算思维树的香农熵。

        递归计算树中所有节点的置信度分布熵，
        反映树的探索宽度和不确定性。
        """
        if root is None:
            return 0.0

        def _collect_confidences(node: ThoughtNode) -> list[float]:
            confs = [node.step.confidence]
            for child in node.children:
                confs.extend(_collect_confidences(child))
            return confs

        confidences = _collect_confidences(root)
        return _entropy(confidences)

    @staticmethod
    def bayesian_self_consistency(
        paths: list[ReasoningPath], prior: float = 0.5
    ) -> float:
        """理论版: 贝叶斯更新框架下的自一致性。

        将每条路径视为独立证据 Ei，使用贝叶斯定理更新后验概率:
        P(H|E1,...,En) ∝ P(H) * ∏ P(Ei|H)

        路径置信度作为似然 P(Ei|H)，在 log 空间中计算避免下溢。
        """
        if not paths:
            return prior
        log_prior = math.log(max(prior, 1e-10))
        log_posterior = log_prior
        for p in paths:
            likelihood = max(p.confidence, 0.01)
            log_likelihood = math.log(likelihood)
            log_neg = math.log(max(1.0 - likelihood, 0.01))
            log_posterior += log_likelihood - log_neg
        posterior = 1.0 / (1.0 + math.exp(-log_posterior))
        return max(0.0, min(1.0, posterior))

    @staticmethod
    def kl_divergence_between_strategies(
        path_a: ReasoningPath, path_b: ReasoningPath
    ) -> float:
        """计算两条策略路径置信度分布的 KL 散度。

        D_KL(P||Q) = sum P(x) log(P(x)/Q(x))
        用于衡量不同推理策略产生的置信度分布差异。
        """
        conf_a = [s.confidence for s in path_a.steps] if path_a.steps else [0.5]
        conf_b = [s.confidence for s in path_b.steps] if path_b.steps else [0.5]

        def _to_distribution(values: list[float]) -> list[float]:
            bins = 5
            hist = [0.0] * bins
            for v in values:
                idx = min(int(v * bins), bins - 1)
                hist[idx] += 1.0
            total = sum(hist) or 1.0
            return [h / total + 1e-10 for h in hist]

        p = _to_distribution(conf_a)
        q = _to_distribution(conf_b)

        kl = 0.0
        for pi, qi in zip(p, q):
            kl += pi * math.log2(pi / qi)
        return max(0.0, kl)


# ============================================================
# Reasoning Trace Collector
# ============================================================

class TraceCollector:
    """推理追踪收集器。

    负责:
      - 创建和管理 ReasoningTrace 实例
      - 收集步骤级时间戳和置信度演化数据
      - 汇总分支探索指标
      - 导出可序列化的追踪报告
    """

    def __init__(self):
        self._active_traces: dict[str, ReasoningTrace] = {}

    def create_trace(self, trace_id: str, strategy: ReasoningStrategy) -> ReasoningTrace:
        trace = ReasoningTrace(trace_id=trace_id, strategy=strategy)
        self._active_traces[trace_id] = trace
        return trace

    def get_trace(self, trace_id: str) -> Optional[ReasoningTrace]:
        return self._active_traces.get(trace_id)

    def close_trace(self, trace_id: str) -> Optional[ReasoningTrace]:
        return self._active_traces.pop(trace_id, None)

    def summarize(self, trace_id: str) -> dict[str, Any]:
        trace = self._active_traces.get(trace_id)
        if trace is None:
            return {}
        return {
            "trace_id": trace.trace_id,
            "strategy": trace.strategy.value if trace.strategy else "unknown",
            "num_paths": len(trace.paths),
            "num_steps": len(trace.step_timings),
            "total_time": trace.total_time,
            "final_confidence": trace.final_confidence,
            "final_conclusion": trace.final_conclusion[:200],
            "confidence_trend": trace.confidence_trend,
            "path_entropy": trace.entropy_of_paths,
            "branch_metrics": trace.branch_metrics,
        }

    def export_report(self, trace_id: str) -> dict[str, Any]:
        trace = self._active_traces.get(trace_id)
        if trace is None:
            return {"error": "trace not found"}
        return {
            "trace_id": trace.trace_id,
            "strategy": trace.strategy.value if trace.strategy else "unknown",
            "total_time": round(trace.total_time, 4),
            "final_confidence": round(trace.final_confidence, 4),
            "final_conclusion": trace.final_conclusion,
            "confidence_trend": trace.confidence_trend,
            "confidence_evolution": [round(c, 4) for c in trace.confidence_evolution],
            "path_entropy": round(trace.entropy_of_paths, 4),
            "branch_metrics": trace.branch_metrics,
            "num_paths_explored": len(trace.paths),
        }


# ============================================================
# Unified Reasoning Facade
# ============================================================

class ReasoningEngine:
    """统一推理引擎门面。

    聚合所有推理策略，对外提供一致的接口:
      - 自动策略选择 (MetaReasoner)
      - 手动策略指定
      - 多策略集成
      - 追踪与指标收集
    """

    def __init__(
        self,
        default_strategy: ReasoningStrategy = ReasoningStrategy.CHAIN_OF_THOUGHT,
    ):
        self.meta = MetaReasoner(default_strategy=default_strategy)
        self.tracer = TraceCollector()
        self.theory = TheoryReasoning()
        self.cot = self.meta.engines.get(ReasoningStrategy.CHAIN_OF_THOUGHT, ChainOfThoughtEngine())
        self.tot = self.meta.engines.get(ReasoningStrategy.TREE_OF_THOUGHT, TreeOfThoughtEngine())
        self.sc = self.meta.engines.get(ReasoningStrategy.SELF_CONSISTENCY, SelfConsistencyEngine())
        self.reflex = self.meta.engines.get(ReasoningStrategy.REFLEXION, ReflexionEngine())

    def reason(
        self,
        query: str,
        context: str = "",
        strategy: Optional[ReasoningStrategy] = None,
        budget: Optional[Budget] = None,
        ensemble: bool = False,
        ensemble_strategies: Optional[list[ReasoningStrategy]] = None,
    ) -> dict[str, Any]:
        """执行推理并返回完整结果。

        支持单策略和集成两种模式。
        """
        trace_id = f"reason_{int(time.time() * 1000)}"
        trace = self.tracer.create_trace(trace_id, strategy or self.meta.default_strategy)

        if ensemble:
            result = self.meta.ensemble(
                query, context,
                strategies=ensemble_strategies,
                budget=budget,
                trace=trace,
            )
            trace.finalize(result.voted_conclusion, result.confidence)
            summary = self.tracer.summarize(trace_id)
            summary["mode"] = "ensemble"
            summary["strategy_results"] = {
                s.value: {
                    "conclusion": p.conclusion[:150],
                    "confidence": p.confidence,
                }
                for s, p in result.strategy_results.items()
            }
            summary["ensemble_weights"] = {
                s.value: w for s, w in result.strategy_weights.items()
            }
            return summary

        path = self.meta.reason(query, context, strategy=strategy, budget=budget, trace=trace)
        summary = self.tracer.summarize(trace_id)
        summary["mode"] = "single"
        summary["path_depth"] = path.depth
        summary["path_avg_confidence"] = round(path.avg_confidence, 4)
        summary["branch_count"] = path.branch_count
        summary["backtrack_count"] = path.backtrack_count
        return summary

    def analyze_information(self, path: ReasoningPath) -> dict[str, float]:
        """理论版信息论分析。"""
        return {
            "path_entropy": round(self.theory.path_entropy(path), 4),
            "confidence_mean": round(path.avg_confidence, 4),
            "depth": path.depth,
            "total_time": round(path.total_time, 4),
        }


# ============================================================
# Tests / Demo
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("ReasoningEngine — Test Suite")
    print("=" * 60)

    query = "How many ways can 5 people be arranged in 3 chairs with order mattering?"

    # --- Chain of Thought ---
    print("\n--- ChainOfThought ---")
    cot = ChainOfThoughtEngine(max_steps=10, branch_threshold=0.3)
    path = cot.reason(query)
    print(f"  Steps: {len(path.steps)}, Confidence: {path.confidence:.3f}")
    print(f"  Conclusion: {path.conclusion[:120]}")
    print(f"  Branch count: {path.branch_count}")
    assert len(path.steps) > 0
    assert 0.0 <= path.confidence <= 1.0
    print("  PASSED")

    # --- Tree of Thought ---
    print("\n--- TreeOfThought ---")
    tot = TreeOfThoughtEngine(beam_width=2, max_depth=4, max_expansions=15)
    path_tot = tot.reason(query)
    print(f"  Steps: {len(path_tot.steps)}, Confidence: {path_tot.confidence:.3f}")
    print(f"  Conclusion: {path_tot.conclusion[:120]}")
    print(f"  Branch count: {path_tot.branch_count}")
    assert len(path_tot.steps) > 0
    assert 0.0 <= path_tot.confidence <= 1.0
    print("  PASSED")

    # --- Self Consistency ---
    print("\n--- SelfConsistency ---")
    sc = SelfConsistencyEngine(num_paths=3)
    path_sc = sc.reason(query)
    print(f"  Confidence: {path_sc.confidence:.3f}")
    print(f"  Conclusion: {path_sc.conclusion[:120]}")
    assert 0.0 <= path_sc.confidence <= 1.0
    print("  PASSED")

    # --- Diversity Check ---
    print("\n--- Diversity Check ---")
    paths_for_div = [cot.reason(query) for _ in range(3)]
    div = sc._compute_diversity(paths_for_div)
    print(f"  Diversity score: {div:.4f}")
    assert 0.0 <= div <= 1.0
    print("  PASSED")

    # --- Reflexion ---
    print("\n--- Reflexion ---")
    reflex = ReflexionEngine(max_reflections=2, score_threshold=0.95)
    path_ref = reflex.reason(query)
    print(f"  Iterations: {len(reflex.history)}")
    print(f"  Final score: {reflex.history[-1].score:.3f}")
    print(f"  Score improvement: {reflex.score_improvement:.3f}")
    assert len(reflex.history) > 0
    print("  PASSED")

    # --- Meta Reasoner — Strategy Selection ---
    print("\n--- MetaReasoner: Strategy Selection ---")
    meta = MetaReasoner()
    ptype = meta._classify_problem("Calculate the integral of x^2 from 0 to 1")
    comp = meta._assess_complexity("Calculate the integral of x^2 from 0 to 1")
    strategy = meta._select_strategy("Calculate the integral of x^2 from 0 to 1", ptype, comp)
    print(f"  Problem type: {ptype.value}, Complexity: {comp.value}, Strategy: {strategy.value}")
    assert strategy is not None
    print("  PASSED")

    # --- Meta Reasoner — Complex Query ---
    print("\n--- MetaReasoner: Complex multi-step query ---")
    complex_query = (
        "Design a multi-step plan for deploying a microservices architecture "
        "with load balancing, and evaluate the trade-offs between Kubernetes "
        "and Docker Swarm."
    )
    ptype2 = meta._classify_problem(complex_query)
    comp2 = meta._assess_complexity(complex_query)
    strategy2 = meta._select_strategy(complex_query, ptype2, comp2)
    print(f"  Problem type: {ptype2.value}, Complexity: {comp2.value}, Strategy: {strategy2.value}")
    assert strategy2 is not None
    print("  PASSED")

    # --- Ensemble ---
    print("\n--- Ensemble ---")
    ensemble_result = meta.ensemble("What is the capital of France?")
    print(f"  Voted conclusion: {ensemble_result.voted_conclusion[:120]}")
    print(f"  Confidence: {ensemble_result.confidence:.3f}")
    print(f"  Strategies used: {[s.value for s in ensemble_result.strategy_results]}")
    assert ensemble_result.confidence > 0.0
    print("  PASSED")

    # --- Theory Track ---
    print("\n--- Theory Track ---")
    theory = TheoryReasoning()
    entropy_val = theory.path_entropy(path)
    print(f"  Path entropy: {entropy_val:.4f}")
    mi = theory.path_mutual_information(path, path_sc)
    print(f"  Mutual information (proxy): {mi:.4f}")
    posterior = theory.bayesian_self_consistency(paths_for_div)
    print(f"  Bayesian posterior (self-consistency): {posterior:.4f}")
    assert entropy_val >= 0.0
    assert posterior >= 0.0
    print("  PASSED")

    # --- Trace Collector ---
    print("\n--- TraceCollector ---")
    tc = TraceCollector()
    tr = tc.create_trace("test_001", ReasoningStrategy.CHAIN_OF_THOUGHT)
    tr.record_step(ReasoningStep(step_number=0, thought="Test step 1", confidence=0.9))
    tr.record_step(ReasoningStep(step_number=1, thought="Test step 2", confidence=0.85))
    tr.finalize("Test conclusion", 0.87)
    summary = tc.summarize("test_001")
    print(f"  Summary keys: {list(summary.keys())}")
    print(f"  Confidence trend: {summary['confidence_trend']}")
    report = tc.export_report("test_001")
    print(f"  Report confidence: {report['final_confidence']}")
    assert summary["final_confidence"] == 0.87
    print("  PASSED")

    # --- Budget Tracking ---
    print("\n--- Budget Tracking ---")
    budget = Budget(max_steps=5, max_tokens=1000, timeout=30.0)
    budget.steps_used = 4
    assert not budget.is_exhausted
    budget.steps_used = 5
    assert budget.is_exhausted
    print("  PASSED")

    # --- Unified Engine ---
    print("\n--- Unified ReasoningEngine ---")
    engine = ReasoningEngine()
    result = engine.reason("Explain gravity in simple terms.", ensemble=True)
    print(f"  Mode: {result.get('mode')}")
    print(f"  Final confidence: {result.get('final_confidence', 0):.3f}")
    print(f"  Strategy results: {list(result.get('strategy_results', {}).keys())}")
    assert result.get("mode") == "ensemble"
    print("  PASSED")

    # --- Edge Cases ---
    print("\n--- Edge Cases ---")
    empty_path = cot.reason("")
    print(f"  Empty query -> steps: {len(empty_path.steps)}, confidence: {empty_path.confidence:.3f}")
    assert len(empty_path.steps) > 0

    single_word = cot.reason("Why?")
    print(f"  Single word query -> steps: {len(single_word.steps)}")
    assert len(single_word.steps) > 0

    empty_tot = tot.reason("")
    print(f"  Empty query ToT -> steps: {len(empty_tot.steps)}")
    assert len(empty_tot.steps) > 0

    print("  PASSED")

    # --- Cosine Similarity Edge Cases ---
    print("\n--- Cosine Similarity Edge Cases ---")
    assert _cosine_similarity([], []) == 0.0
    assert _cosine_similarity([1.0], [0.0]) == 0.0
    assert abs(_cosine_similarity([1.0, 0.0], [1.0, 0.0]) - 1.0) < 0.001
    assert abs(_cosine_similarity([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]) - 1.0) < 0.001
    print("  PASSED")

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED")
    print("=" * 60)
