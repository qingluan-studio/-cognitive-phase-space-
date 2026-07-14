"""
任务委托引擎 - Task Delegator

双轨制理论:
  工程版: DAG 调度 + Critical Path Method + EDF 调度算法
  理论版: 任务分解视为有向无环图(DAG)上的调度问题,
          关键路径法(CPM)确定最小完成时间,
          Amdahl 定律约束并行加速比上限

核心模块:
  TaskDecomposer  - 将复杂任务递归分解为子任务 DAG
  AgentRegistry   - 注册和管理可用智能体
  TaskScheduler   - 基于 EDF + 能力匹配 + 负载均衡的调度器
  ProgressTracker - 进度追踪、停滞检测、瓶颈识别
  ResultAssembler - 子任务结果聚合、冲突消解、去重

调度理论:
  - DAG 拓扑排序 (Kahn's Algorithm): 确定执行顺序
  - Critical Path Method (CPM): 识别瓶颈子任务
  - Earliest Deadline First (EDF): 截止时间感知调度
  - Amdahl's Law: S = 1 / ((1 - p) + p / n)
    其中 p = 可并行化比例, n = 并行度
"""

from __future__ import annotations

import heapq
import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


# ============================================================================
# Enums
# ============================================================================

class TaskComplexity(Enum):
    TRIVIAL = "trivial"
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    EXPERT = "expert"

    @property
    def weight(self) -> float:
        _weights = {
            TaskComplexity.TRIVIAL: 0.5,
            TaskComplexity.SIMPLE: 1.0,
            TaskComplexity.MODERATE: 2.0,
            TaskComplexity.COMPLEX: 4.0,
            TaskComplexity.EXPERT: 8.0,
        }
        return _weights[self]

    @property
    def estimated_tokens(self) -> int:
        _tokens = {
            TaskComplexity.TRIVIAL: 200,
            TaskComplexity.SIMPLE: 800,
            TaskComplexity.MODERATE: 3000,
            TaskComplexity.COMPLEX: 12000,
            TaskComplexity.EXPERT: 50000,
        }
        return _tokens[self]


class TaskPriority(Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"

    @property
    def numeric(self) -> int:
        return {
            TaskPriority.LOW: 1,
            TaskPriority.NORMAL: 2,
            TaskPriority.HIGH: 3,
            TaskPriority.URGENT: 4,
            TaskPriority.CRITICAL: 5,
        }[self]


class SubtaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    FAILED = "failed"
    BLOCKED = "blocked"


class DecompositionStrategy(Enum):
    SEQUENTIAL = "sequential"
    HIERARCHICAL = "hierarchical"
    PARALLEL = "parallel"
    ADAPTIVE = "adaptive"


class AgentStatus(Enum):
    IDLE = "idle"
    BUSY = "busy"
    OFFLINE = "offline"
    DEGRADED = "degraded"


# ============================================================================
# Dataclasses
# ============================================================================

@dataclass
class Subtask:
    id: str
    title: str
    description: str
    complexity: TaskComplexity = TaskComplexity.SIMPLE
    priority: TaskPriority = TaskPriority.NORMAL
    dependencies: list[str] = field(default_factory=list)
    assigned_agent: str = ""
    status: SubtaskStatus = SubtaskStatus.PENDING
    result: Any = None
    deadline: float = 0.0
    created_at: float = field(default_factory=time.time)
    started_at: float = 0.0
    completed_at: float = 0.0
    retry_count: int = 0
    max_retries: int = 3
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def elapsed(self) -> float:
        if self.started_at == 0.0:
            return 0.0
        end = self.completed_at if self.completed_at > 0 else time.time()
        return end - self.started_at

    @property
    def is_terminal(self) -> bool:
        return self.status in (SubtaskStatus.DONE, SubtaskStatus.FAILED)


@dataclass
class TaskPlan:
    original_task: str
    decomposed_at: float = field(default_factory=time.time)
    subtasks: list[Subtask] = field(default_factory=list)
    estimated_total_tokens: int = 0
    execution_order: list[list[str]] = field(default_factory=list)
    strategy: DecompositionStrategy = DecompositionStrategy.SEQUENTIAL
    critical_path: list[str] = field(default_factory=list)
    max_parallelism: int = 1

    @property
    def subtask_count(self) -> int:
        return len(self.subtasks)

    @property
    def completed_count(self) -> int:
        return sum(1 for s in self.subtasks if s.status == SubtaskStatus.DONE)

    def get_subtask(self, subtask_id: str) -> Subtask | None:
        for s in self.subtasks:
            if s.id == subtask_id:
                return s
        return None


@dataclass
class DelegationReport:
    tasks_delegated: int = 0
    tasks_completed: int = 0
    tasks_failed: int = 0
    tasks_pending: int = 0
    avg_completion_time: float = 0.0
    agent_utilization: dict[str, float] = field(default_factory=dict)
    bottleneck_subtasks: list[str] = field(default_factory=list)
    total_tokens_consumed: int = 0
    estimated_cost: float = 0.0
    parallel_efficiency: float = 1.0
    generated_at: float = field(default_factory=time.time)

    @property
    def success_rate(self) -> float:
        total = self.tasks_completed + self.tasks_failed
        if total == 0:
            return 1.0
        return self.tasks_completed / total

    @property
    def completion_ratio(self) -> float:
        delegated = self.tasks_delegated
        if delegated == 0:
            return 0.0
        return self.tasks_completed / delegated


@dataclass
class AgentInfo:
    agent_id: str
    capabilities: set[str] = field(default_factory=set)
    cost_per_token: float = 0.0
    available: bool = True
    reliability_score: float = 1.0
    status: AgentStatus = AgentStatus.IDLE
    total_tasks_completed: int = 0
    total_tokens_used: int = 0
    avg_response_time: float = 0.0
    current_load: int = 0
    max_concurrency: int = 1
    registered_at: float = field(default_factory=time.time)
    last_heartbeat: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def effective_cost(self) -> float:
        return self.cost_per_token / max(self.reliability_score, 0.01)

    @property
    def load_ratio(self) -> float:
        return self.current_load / max(self.max_concurrency, 1)


# ============================================================================
# Dependency Detection
# ============================================================================

_DEPENDENCY_PATTERNS: list[tuple[str, float]] = [
    ("first", 0.9),
    ("然后", 0.9),
    ("接下来", 0.85),
    ("之后", 0.85),
    ("before", 0.9),
    ("after", 0.9),
    ("depends on", 0.95),
    ("requires", 0.9),
    ("依赖于", 0.95),
    ("需要先", 0.9),
    ("前置", 0.85),
    ("precondition", 0.9),
    ("prerequisite", 0.9),
    ("blocked by", 0.9),
    ("第二步", 0.8),
    ("第三步", 0.8),
    ("step 1", 0.85),
    ("step 2", 0.85),
    ("阶段一", 0.8),
    ("阶段二", 0.8),
    ("phase 1", 0.85),
    ("phase 2", 0.85),
    ("基于", 0.8),
    ("based on", 0.85),
    ("接着", 0.8),
    ("继而", 0.8),
]

_REDUNDANCY_THRESHOLD: float = 0.8


# ============================================================================
# TaskDecomposer
# ============================================================================

class TaskDecomposer:
    """
    任务分解器: 将复杂任务拆分为有依赖关系的子任务 DAG。

    工程实现:
      - 关键词匹配依赖检测
      - Kahn 算法拓扑排序
      - Jaccard 相似度合并冗余子任务
      - 复杂度启发式估算

    理论支撑:
      - DAG 调度: 子任务构成有向无环图 G = (V, E)
      - CPM: 关键路径 = 从入度为 0 到出度为 0 的最长路径
      - Amdahl: S_max = 1 / ((1-p) + p/n), p 为可并行比例
    """

    def __init__(self, strategy: DecompositionStrategy = DecompositionStrategy.SEQUENTIAL):
        self.strategy = strategy

    def decompose(self, task_description: str, max_subtasks: int = 20) -> TaskPlan:
        """
        将任务描述分解为 TaskPlan。

        流程:
          1. 提取子任务边界
          2. 检测依赖关系
          3. 估算复杂度
          4. 拓扑排序
          5. 合并冗余
          6. 计算关键路径
        """
        raw_subtasks = self._extract_subtasks(task_description, max_subtasks)
        subtasks = self._build_subtask_objects(raw_subtasks)
        subtasks = self._detect_dependencies(subtasks, task_description)
        subtasks = self._merge_redundant(subtasks)
        subtasks = self._estimate_complexity(subtasks)
        execution_order = self._topological_sort(subtasks)
        critical_path = self._find_critical_path(subtasks)
        max_parallelism = self._compute_max_parallelism(execution_order)
        total_tokens = sum(s.complexity.estimated_tokens for s in subtasks)

        plan = TaskPlan(
            original_task=task_description,
            subtasks=subtasks,
            estimated_total_tokens=total_tokens,
            execution_order=execution_order,
            strategy=self.strategy,
            critical_path=critical_path,
            max_parallelism=max_parallelism,
        )
        logger.info(
            "Decomposed into %d subtasks, %d levels, critical_path=%s",
            len(subtasks), len(execution_order), critical_path,
        )
        return plan

    def _extract_subtasks(self, description: str, max_count: int) -> list[str]:
        """
        从自然语言描述中提取子任务片段。

        使用启发式分割:
          - 编号前缀 (1., 2., - )
          - 换行符
          - 步骤指示词
        """
        lines = description.strip().split("\n")
        subtask_texts: list[str] = []
        current: list[str] = []

        step_markers = [
            "step", "步骤", "task", "任务",
            "phase", "阶段", "part", "部分",
        ]

        for line in lines:
            stripped = line.strip()
            if not stripped:
                if current:
                    subtask_texts.append(" ".join(current))
                    current = []
                continue

            is_new_step = any(
                stripped.lower().startswith(marker) for marker in step_markers
            )
            if is_new_step or (stripped and stripped[0].isdigit() and ". " in stripped[:5]):
                if current:
                    subtask_texts.append(" ".join(current))
                current = [stripped]
            else:
                current.append(stripped)

        if current:
            subtask_texts.append(" ".join(current))

        if not subtask_texts:
            subtask_texts = [description]

        if len(subtask_texts) > max_count:
            subtask_texts = subtask_texts[:max_count]

        return subtask_texts

    def _build_subtask_objects(self, raw: list[str]) -> list[Subtask]:
        subtasks: list[Subtask] = []
        for i, text in enumerate(raw):
            title = self._extract_title(text)
            subtasks.append(Subtask(
                id=f"subtask_{i}",
                title=title,
                description=text,
            ))
        return subtasks

    def _extract_title(self, text: str) -> str:
        clean = text.strip()
        if ". " in clean[:8]:
            clean = clean.split(". ", 1)[1]
        if ":" in clean:
            clean = clean.split(":", 1)[0]
        if len(clean) > 80:
            clean = clean[:77] + "..."
        return clean

    def _detect_dependencies(
        self, subtasks: list[Subtask], original_description: str
    ) -> list[Subtask]:
        """
        基于关键词模式检测子任务间依赖关系。

        对于每对 (A, B)，检查 B 的描述是否包含对 A 的依赖指示词。
        同时利用子任务之间的顺序信息: 后面的默认依赖前面的。
        """
        n = len(subtasks)
        for i in range(n):
            for j in range(i + 1, n):
                if self._has_dependency_indicator(subtasks[j].description, subtasks[i]):
                    if subtasks[i].id not in subtasks[j].dependencies:
                        subtasks[j].dependencies.append(subtasks[i].id)
                        logger.debug(
                            "Detected dependency: %s -> %s",
                            subtasks[i].id, subtasks[j].id,
                        )

        if self.strategy == DecompositionStrategy.SEQUENTIAL:
            for i in range(n - 1):
                if subtasks[i + 1].id not in subtasks[i + 1].dependencies:
                    prev_ids = [s.id for s in subtasks[:i + 1]]
                    if subtasks[i].id not in subtasks[i + 1].dependencies:
                        subtasks[i + 1].dependencies.append(subtasks[i].id)

        return subtasks

    def _has_dependency_indicator(self, text: str, candidate: Subtask) -> bool:
        text_lower = text.lower()
        for pattern, threshold in _DEPENDENCY_PATTERNS:
            if pattern in text_lower:
                if self._mentions_candidate(text_lower, candidate):
                    return True
        return False

    def _mentions_candidate(self, text_lower: str, candidate: Subtask) -> bool:
        title_words = set(candidate.title.lower().split())
        desc_words = set(text_lower.split())
        if len(title_words) <= 1:
            return False
        overlap = title_words & desc_words
        return len(overlap) >= max(1, len(title_words) // 2)

    @staticmethod
    def _jaccard(a: set[str], b: set[str]) -> float:
        if not a and not b:
            return 1.0
        intersection = len(a & b)
        union = len(a | b)
        if union == 0:
            return 0.0
        return intersection / union

    def _merge_redundant(self, subtasks: list[Subtask]) -> list[Subtask]:
        """
        合并冗余子任务。使用 Jaccard 相似度判断重复,
        超过阈值则合并。
        """
        if len(subtasks) <= 1:
            return subtasks

        merged: list[Subtask] = []
        indices_to_skip: set[int] = set()

        for i, s_a in enumerate(subtasks):
            if i in indices_to_skip:
                continue
            for j, s_b in enumerate(subtasks):
                if j <= i or j in indices_to_skip:
                    continue
                words_a = set(s_a.description.lower().split())
                words_b = set(s_b.description.lower().split())
                sim = self._jaccard(words_a, words_b)
                if sim >= _REDUNDANCY_THRESHOLD:
                    if s_a.complexity.weight < s_b.complexity.weight:
                        s_a.complexity = s_b.complexity
                    s_a.description = f"{s_a.description}\n[merged: {s_b.title}]"
                    for dep in s_b.dependencies:
                        if dep not in s_a.dependencies and dep != s_a.id:
                            s_a.dependencies.append(dep)
                    indices_to_skip.add(j)
                    logger.debug("Merged %s into %s (sim=%.2f)", s_b.id, s_a.id, sim)
            merged.append(s_a)

        for i, s in enumerate(merged):
            s.id = f"subtask_{i}"

        return merged

    def _estimate_complexity(self, subtasks: list[Subtask]) -> list[Subtask]:
        for s in subtasks:
            text = s.description.lower()
            length = len(s.description)
            keyword_scores = {
                TaskComplexity.EXPERT: ["expert", "专家", "advanced", "高级", "cutting-edge"],
                TaskComplexity.COMPLEX: ["complex", "复杂", "difficult", "困难", "hard", "large"],
                TaskComplexity.MODERATE: ["moderate", "中等", "standard", "标准", "normal"],
                TaskComplexity.SIMPLE: ["simple", "简单", "basic", "基础", "easy", "easily"],
                TaskComplexity.TRIVIAL: ["trivial", "微小", "minimal", "最小"],
            }

            for level, indicators in keyword_scores.items():
                score = sum(1 for kw in indicators if kw in text)
                if score > 0:
                    s.complexity = level
                    break

            if length < 30:
                s.complexity = TaskComplexity.TRIVIAL
            elif length > 500:
                current = s.complexity
                _upgrade = {
                    TaskComplexity.TRIVIAL: TaskComplexity.SIMPLE,
                    TaskComplexity.SIMPLE: TaskComplexity.MODERATE,
                    TaskComplexity.MODERATE: TaskComplexity.COMPLEX,
                    TaskComplexity.COMPLEX: TaskComplexity.EXPERT,
                }
                if current in _upgrade:
                    s.complexity = _upgrade[current]

            dep_count = len(s.dependencies)
            if dep_count >= 5:
                _upgrade = {
                    TaskComplexity.TRIVIAL: TaskComplexity.MODERATE,
                    TaskComplexity.SIMPLE: TaskComplexity.COMPLEX,
                    TaskComplexity.MODERATE: TaskComplexity.EXPERT,
                }
                if s.complexity in _upgrade:
                    s.complexity = _upgrade[s.complexity]

        return subtasks

    def _topological_sort(self, subtasks: list[Subtask]) -> list[list[str]]:
        """
        Kahn 算法拓扑排序，返回按层级分组的执行顺序。

        层级定义:
          Level 0: 无依赖的节点
          Level k: 所有依赖都在前 k-1 层的节点
        """
        id_to_subtask = {s.id: s for s in subtasks}
        in_degree: dict[str, int] = {s.id: len(s.dependencies) for s in subtasks}
        reverse_deps: dict[str, list[str]] = defaultdict(list)

        for s in subtasks:
            for dep_id in s.dependencies:
                if dep_id in id_to_subtask:
                    reverse_deps[dep_id].append(s.id)

        queue: deque[str] = deque(
            s.id for s in subtasks if in_degree[s.id] == 0
        )
        levels: list[list[str]] = []
        processed: set[str] = set()

        while queue:
            current_level: list[str] = []
            for _ in range(len(queue)):
                node_id = queue.popleft()
                if node_id in processed:
                    continue
                processed.add(node_id)
                current_level.append(node_id)
                for dependent in reverse_deps.get(node_id, []):
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        queue.append(dependent)
            levels.append(current_level)

        remaining = [s.id for s in subtasks if s.id not in processed]
        if remaining:
            logger.warning("Cycle detected among: %s, breaking cycle", remaining)
            levels.append(remaining)

        return levels

    def _find_critical_path(self, subtasks: list[Subtask]) -> list[str]:
        """
        Critical Path Method: 找到从入度为0到出度为0的最长路径(按复杂度权重)。
        """
        id_to_subtask = {s.id: s for s in subtasks}
        rev_deps: dict[str, list[str]] = defaultdict(list)
        for s in subtasks:
            for dep_id in s.dependencies:
                if dep_id in id_to_subtask:
                    rev_deps[dep_id].append(s.id)

        topo = self._topological_sort(subtasks)
        flat_order: list[str] = []
        for level in topo:
            flat_order.extend(level)

        longest: dict[str, float] = {}
        predecessor: dict[str, str | None] = {}

        for node_id in flat_order:
            subtask = id_to_subtask.get(node_id)
            if subtask is None:
                continue
            weight = subtask.complexity.weight
            max_pred_cost = 0.0
            best_pred: str | None = None
            for dep_id in subtask.dependencies:
                if dep_id in longest and longest[dep_id] > max_pred_cost:
                    max_pred_cost = longest[dep_id]
                    best_pred = dep_id
            longest[node_id] = weight + max_pred_cost
            predecessor[node_id] = best_pred

        if not longest:
            return []

        end_node = max(longest, key=lambda k: longest[k])
        path: list[str] = []
        current: str | None = end_node
        while current is not None:
            path.append(current)
            current = predecessor.get(current)
        path.reverse()
        return path

    @staticmethod
    def _compute_max_parallelism(execution_order: list[list[str]]) -> int:
        if not execution_order:
            return 1
        return max(len(level) for level in execution_order)


# ============================================================================
# AgentRegistry
# ============================================================================

class AgentRegistry:
    """
    智能体注册中心。

    功能:
      - 注册智能体及其能力标签
      - 按能力查询匹配的智能体
      - 可用性检查与心跳管理
      - 可靠性评分维护
    """

    def __init__(self) -> None:
        self._agents: dict[str, AgentInfo] = {}

    def register(
        self,
        agent_id: str,
        capabilities: set[str] | None = None,
        cost_per_token: float = 0.0,
        reliability_score: float = 1.0,
        max_concurrency: int = 1,
        metadata: dict[str, Any] | None = None,
    ) -> AgentInfo:
        if agent_id in self._agents:
            logger.warning("Agent %s already registered, updating", agent_id)

        agent = AgentInfo(
            agent_id=agent_id,
            capabilities=capabilities or set(),
            cost_per_token=cost_per_token,
            reliability_score=reliability_score,
            max_concurrency=max_concurrency,
            metadata=metadata or {},
        )
        self._agents[agent_id] = agent
        logger.info("Registered agent: %s (caps=%s)", agent_id, agent.capabilities)
        return agent

    def unregister(self, agent_id: str) -> bool:
        if agent_id in self._agents:
            del self._agents[agent_id]
            logger.info("Unregistered agent: %s", agent_id)
            return True
        return False

    def get(self, agent_id: str) -> AgentInfo | None:
        return self._agents.get(agent_id)

    def heartbeat(self, agent_id: str) -> None:
        agent = self._agents.get(agent_id)
        if agent:
            agent.last_heartbeat = time.time()

    def mark_unavailable(self, agent_id: str) -> None:
        agent = self._agents.get(agent_id)
        if agent:
            agent.available = False
            agent.status = AgentStatus.OFFLINE

    def mark_available(self, agent_id: str) -> None:
        agent = self._agents.get(agent_id)
        if agent:
            agent.available = True
            agent.status = AgentStatus.IDLE

    def record_completion(self, agent_id: str, tokens: int, response_time: float) -> None:
        agent = self._agents.get(agent_id)
        if agent:
            agent.total_tasks_completed += 1
            agent.total_tokens_used += tokens
            n = agent.total_tasks_completed
            agent.avg_response_time = (
                (agent.avg_response_time * (n - 1) + response_time) / n
            )
            agent.current_load = max(0, agent.current_load - 1)

    def _capability_similarity(self, agent: AgentInfo, keywords: set[str]) -> float:
        """
        Jaccard 相似度: |capabilities ∩ keywords| / |capabilities ∪ keywords|
        """
        if not agent.capabilities or not keywords:
            return 0.0
        intersection = len(agent.capabilities & keywords)
        union = len(agent.capabilities | keywords)
        return intersection / union if union > 0 else 0.0

    def find_capable(
        self, keywords: set[str], min_similarity: float = 0.0
    ) -> list[AgentInfo]:
        scored: list[tuple[float, AgentInfo]] = []
        for agent in self._agents.values():
            if not agent.available:
                continue
            if agent.current_load >= agent.max_concurrency:
                continue
            sim = self._capability_similarity(agent, keywords)
            if sim >= min_similarity:
                scored.append((sim, agent))
        scored.sort(key=lambda x: -x[0])
        return [agent for _, agent in scored]

    @property
    def all_agents(self) -> list[AgentInfo]:
        return list(self._agents.values())

    @property
    def available_agents(self) -> list[AgentInfo]:
        return [a for a in self._agents.values() if a.available]

    @property
    def agent_count(self) -> int:
        return len(self._agents)


# ============================================================================
# TaskScheduler
# ============================================================================

@dataclass(order=True)
class _EDFEntry:
    deadline: float
    subtask_id: str
    priority: int = field(compare=False)
    keywords: set[str] = field(compare=False)
    agent_id: str = field(compare=False)


class TaskScheduler:
    """
    任务调度器: 将子任务分配给最优智能体。

    调度策略:
      1. EDF (Earliest Deadline First): 截止时间最早的优先
      2. 能力匹配: Jaccard 相似度选择最匹配的智能体
      3. 负载均衡: 避免过载单个智能体
      4. 依赖保证: 所有依赖完成后方可调度
    """

    def __init__(self, registry: AgentRegistry) -> None:
        self._registry = registry
        self._assignments: dict[str, str] = {}
        self._deadline_queue: list[_EDFEntry] = []

    def schedule(
        self,
        plan: TaskPlan,
        deadline_overrides: dict[str, float] | None = None,
        agent_prefs: dict[str, str] | None = None,
    ) -> dict[str, str]:
        deadline_map = deadline_overrides or {}
        agent_prefs = agent_prefs or {}
        id_to_subtask = {s.id: s for s in plan.subtasks}
        assignments: dict[str, str] = {}
        completed: set[str] = set()
        scheduled: set[str] = set()

        ready_heap: list[_EDFEntry] = []

        def _enqueue_ready() -> None:
            for st in plan.subtasks:
                if st.id in scheduled or st.id in completed:
                    continue
                if st.status in (SubtaskStatus.DONE, SubtaskStatus.FAILED):
                    completed.add(st.id)
                    continue
                deps_met = all(d in completed for d in st.dependencies)
                if deps_met:
                    scheduled.add(st.id)
                    deadline = deadline_map.get(st.id, st.deadline or float("inf"))
                    pref_agent = agent_prefs.get(st.id, "")
                    kw = set(st.description.lower().split())
                    entry = _EDFEntry(
                        deadline=deadline,
                        subtask_id=st.id,
                        priority=st.priority.numeric,
                        keywords=kw,
                        agent_id=pref_agent,
                    )
                    heapq.heappush(ready_heap, entry)

        _enqueue_ready()

        while ready_heap:
            entry = heapq.heappop(ready_heap)
            st = id_to_subtask.get(entry.subtask_id)
            if st is None:
                continue

            if entry.agent_id and self._can_assign(entry.agent_id):
                agent_id = entry.agent_id
            else:
                capable = self._registry.find_capable(entry.keywords, min_similarity=0.0)
                if not capable:
                    logger.warning("No capable agent for %s, skipping", entry.subtask_id)
                    continue
                agent_id = self._select_best_agent(capable)

            assignments[st.id] = agent_id
            agent = self._registry.get(agent_id)
            if agent:
                agent.current_load += 1
                if agent.current_load >= agent.max_concurrency:
                    agent.status = AgentStatus.BUSY
            st.assigned_agent = agent_id
            st.status = SubtaskStatus.IN_PROGRESS
            st.started_at = time.time()
            completed.add(st.id)

            _enqueue_ready()

        self._assignments = assignments
        logger.info(
            "Scheduled %d/%d subtasks across %d agents",
            len(assignments), len(plan.subtasks),
            len(set(assignments.values())),
        )
        return assignments

    def _can_assign(self, agent_id: str) -> bool:
        agent = self._registry.get(agent_id)
        if agent is None:
            return False
        return agent.available and agent.current_load < agent.max_concurrency

    def _select_best_agent(self, capable: list[AgentInfo]) -> str:
        """
        选择最优智能体: 综合 cost + load + reliability 评分。
        Score = sim * reliability / (cost * (1 + load_ratio))
        """
        best_agent = capable[0]
        best_score = -float("inf")
        for agent in capable:
            sim = 0.5
            load = agent.load_ratio
            score = agent.reliability_score / max(
                agent.effective_cost * (1 + load), 0.0001
            )
            if score > best_score:
                best_score = score
                best_agent = agent
        return best_agent.agent_id

    def get_assignment(self, subtask_id: str) -> str | None:
        return self._assignments.get(subtask_id)

    @property
    def assignments(self) -> dict[str, str]:
        return dict(self._assignments)


# ============================================================================
# ProgressTracker
# ============================================================================

class ProgressTracker:
    """
    进度追踪器。

    功能:
      - 追踪子任务完成情况(加权进度)
      - 停滞检测: 超时未完成则标记
      - 进度百分比: completed_weight / total_weight
      - 瓶颈检测: 识别阻塞最多下游的未完成子任务
    """

    DEFAULT_TIMEOUT: float = 300.0

    def __init__(self, task_plan: TaskPlan, timeout: float | None = None) -> None:
        self._plan = task_plan
        self._timeout = timeout or self.DEFAULT_TIMEOUT
        self._start_time = time.time()

    @property
    def total_weight(self) -> float:
        return sum(s.complexity.weight for s in self._plan.subtasks)

    @property
    def completed_weight(self) -> float:
        return sum(
            s.complexity.weight
            for s in self._plan.subtasks
            if s.status == SubtaskStatus.DONE
        )

    @property
    def progress(self) -> float:
        tw = self.total_weight
        if tw == 0:
            return 0.0
        return self.completed_weight / tw

    @property
    def percentage(self) -> float:
        return self.progress * 100.0

    def complete_subtask(self, subtask_id: str, result: Any = None) -> None:
        st = self._plan.get_subtask(subtask_id)
        if st is None:
            logger.warning("Subtask %s not found", subtask_id)
            return
        st.status = SubtaskStatus.DONE
        st.result = result
        st.completed_at = time.time()
        logger.debug("Subtask %s completed (%.1f%%)", subtask_id, self.percentage)

    def fail_subtask(self, subtask_id: str, error: str = "") -> None:
        st = self._plan.get_subtask(subtask_id)
        if st is None:
            return
        if st.retry_count < st.max_retries:
            st.retry_count += 1
            st.status = SubtaskStatus.PENDING
            st.assigned_agent = ""
            logger.info("Subtask %s retry %d/%d", subtask_id, st.retry_count, st.max_retries)
        else:
            st.status = SubtaskStatus.FAILED
            st.result = error
            st.completed_at = time.time()
            logger.warning("Subtask %s failed after %d retries", subtask_id, st.max_retries)

    def block_subtask(self, subtask_id: str, blocked_by: str) -> None:
        st = self._plan.get_subtask(subtask_id)
        if st:
            st.status = SubtaskStatus.BLOCKED
            st.metadata["blocked_by"] = blocked_by

    def unblock_subtask(self, subtask_id: str) -> None:
        st = self._plan.get_subtask(subtask_id)
        if st and st.status == SubtaskStatus.BLOCKED:
            st.status = SubtaskStatus.PENDING

    def detect_stalled(self) -> list[str]:
        now = time.time()
        stalled: list[str] = []
        for st in self._plan.subtasks:
            if st.status != SubtaskStatus.IN_PROGRESS:
                continue
            if st.started_at > 0 and (now - st.started_at) > self._timeout:
                stalled.append(st.id)
                logger.warning("Stalled subtask: %s (%.0fs)", st.id, now - st.started_at)
        return stalled

    def detect_bottlenecks(self, top_n: int = 5) -> list[tuple[str, int]]:
        downstream_counts: dict[str, int] = defaultdict(int)
        for st in self._plan.subtasks:
            if st.status == SubtaskStatus.DONE:
                continue
            for dep_id in st.dependencies:
                dep = self._plan.get_subtask(dep_id)
                if dep and dep.status != SubtaskStatus.DONE:
                    downstream_counts[dep_id] += 1

        sorted_bottlenecks = sorted(
            downstream_counts.items(), key=lambda x: -x[1]
        )
        return sorted_bottlenecks[:top_n]

    @property
    def elapsed(self) -> float:
        return time.time() - self._start_time

    def summary(self) -> dict[str, Any]:
        status_counts: dict[str, int] = defaultdict(int)
        for st in self._plan.subtasks:
            status_counts[st.status.value] += 1
        return {
            "total": len(self._plan.subtasks),
            "completed": status_counts.get("done", 0),
            "in_progress": status_counts.get("in_progress", 0),
            "pending": status_counts.get("pending", 0),
            "failed": status_counts.get("failed", 0),
            "blocked": status_counts.get("blocked", 0),
            "progress_pct": round(self.percentage, 1),
            "elapsed": round(self.elapsed, 1),
            "stalled": len(self.detect_stalled()),
        }

    def is_complete(self) -> bool:
        return all(
            s.is_terminal for s in self._plan.subtasks
        )


# ============================================================================
# ResultAssembler
# ============================================================================

class ResultAssembler:
    """
    结果组装器: 聚合所有子任务结果, 合并冲突, 去重, 格式化输出。

    处理流程:
      1. 按执行顺序收集子任务结果
      2. 冲突检测与消解 (同一问题多个答案取置信度高的)
      3. 去重 (Jaccard 相似度检测重叠工作)
      4. 格式化最终输出
    """

    CONFLICT_SIMILARITY_THRESHOLD: float = 0.7

    def assemble(self, plan: TaskPlan) -> dict[str, Any]:
        ordered_results: list[dict[str, Any]] = []
        for level in plan.execution_order:
            for subtask_id in level:
                st = plan.get_subtask(subtask_id)
                if st is None or st.status != SubtaskStatus.DONE:
                    continue
                ordered_results.append({
                    "subtask_id": st.id,
                    "title": st.title,
                    "complexity": st.complexity.value,
                    "result": st.result,
                    "assigned_agent": st.assigned_agent,
                    "elapsed": st.elapsed,
                })

        deduped = self._deduplicate(ordered_results)
        resolved = self._resolve_conflicts(deduped)
        final_output = self._format_output(resolved)

        return {
            "original_task": plan.original_task,
            "subtask_count": plan.subtask_count,
            "completed_count": plan.completed_count,
            "failed_count": sum(
                1 for s in plan.subtasks if s.status == SubtaskStatus.FAILED
            ),
            "results": resolved,
            "formatted_output": final_output,
            "assembled_at": time.time(),
        }

    def _deduplicate(
        self, results: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        if len(results) <= 1:
            return results

        kept: list[dict[str, Any]] = []
        skip: set[int] = set()

        for i, r_a in enumerate(results):
            if i in skip:
                continue
            for j, r_b in enumerate(results):
                if j <= i or j in skip:
                    continue
                text_a = str(r_a.get("result", ""))
                text_b = str(r_b.get("result", ""))
                sim = self._text_similarity(text_a, text_b)
                if sim >= self.CONFLICT_SIMILARITY_THRESHOLD:
                    comp_a = TaskComplexity(r_a.get("complexity", "simple"))
                    comp_b = TaskComplexity(r_b.get("complexity", "simple"))
                    if comp_b.weight > comp_a.weight:
                        r_a["result"] = r_b["result"]
                        r_a["merged_from"] = r_b["subtask_id"]
                    else:
                        r_a.setdefault("merged_from", [])
                        if isinstance(r_a.get("merged_from"), list):
                            r_a["merged_from"].append(r_b["subtask_id"])
                    skip.add(j)
            kept.append(r_a)

        return kept

    def _resolve_conflicts(
        self, results: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """
        冲突消解: 保留每个 subtask 的最优版本。
        如果是来自可靠智能体的结果则提升权重。
        """
        by_id: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for r in results:
            by_id[r["subtask_id"]].append(r)

        resolved: list[dict[str, Any]] = []
        for candidates in by_id.values():
            if len(candidates) == 1:
                resolved.extend(candidates)
            else:
                best = candidates[0]
                max_weight = TaskComplexity(best.get("complexity", "simple")).weight
                for c in candidates[1:]:
                    w = TaskComplexity(c.get("complexity", "simple")).weight
                    if w > max_weight:
                        best = c
                        max_weight = w
                resolved.append(best)

        resolved.sort(key=lambda r: r["subtask_id"])
        return resolved

    @staticmethod
    def _text_similarity(text_a: str, text_b: str) -> float:
        a_words = set(text_a.lower().split())
        b_words = set(text_b.lower().split())
        if not a_words and not b_words:
            return 0.0
        inter = len(a_words & b_words)
        union = len(a_words | b_words)
        return inter / union if union > 0 else 0.0

    def _format_output(self, results: list[dict[str, Any]]) -> str:
        parts: list[str] = []
        for r in results:
            title = r.get("title", "Unknown")
            result_val = r.get("result")
            agent = r.get("assigned_agent", "N/A")
            parts.append(f"[{title}] (agent: {agent})\n{result_val}\n")
        return "\n".join(parts)


# ============================================================================
# DelegationReport Generator
# ============================================================================

def generate_report(
    plan: TaskPlan,
    tracker: ProgressTracker,
    registry: AgentRegistry,
    scheduler: TaskScheduler | None = None,
) -> DelegationReport:
    completed = [s for s in plan.subtasks if s.status == SubtaskStatus.DONE]
    failed = [s for s in plan.subtasks if s.status == SubtaskStatus.FAILED]
    pending = [s for s in plan.subtasks if s.status == SubtaskStatus.PENDING]

    total_time = sum(s.elapsed for s in completed)
    avg_time = total_time / len(completed) if completed else 0.0

    utilization: dict[str, float] = {}
    for agent in registry.all_agents:
        if agent.max_concurrency > 0:
            utilization[agent.agent_id] = agent.load_ratio
        else:
            utilization[agent.agent_id] = 0.0

    bottlenecks = [b[0] for b in tracker.detect_bottlenecks(top_n=5)]

    total_tokens = sum(
        s.complexity.estimated_tokens for s in plan.subtasks
        if s.status == SubtaskStatus.DONE
    )

    total_cost = 0.0
    assignments = scheduler.assignments if scheduler else {}
    for st_id, agent_id in assignments.items():
        agent = registry.get(agent_id)
        st = plan.get_subtask(st_id)
        if agent and st:
            total_cost += agent.cost_per_token * st.complexity.estimated_tokens

    sequential_time = total_time
    if plan.max_parallelism > 0:
        parallel_time = tracker.elapsed
        if parallel_time > 0:
            parallel_efficiency = sequential_time / (parallel_time * plan.max_parallelism)
        else:
            parallel_efficiency = 1.0
    else:
        parallel_efficiency = 1.0

    return DelegationReport(
        tasks_delegated=len(plan.subtasks),
        tasks_completed=len(completed),
        tasks_failed=len(failed),
        tasks_pending=len(pending),
        avg_completion_time=avg_time,
        agent_utilization=utilization,
        bottleneck_subtasks=bottlenecks,
        total_tokens_consumed=total_tokens,
        estimated_cost=total_cost,
        parallel_efficiency=parallel_efficiency,
    )


# ============================================================================
# Dual-Track Theory: Amdahl's Law & CPM Analysis
# ============================================================================

def amdahl_speedup(parallelizable_fraction: float, num_agents: int) -> float:
    """
    Amdahl 定律计算理论最大加速比。

    S = 1 / ((1 - p) + p / n)
      p = 可并行化比例
      n = 并行度 (智能体数量)
    """
    if num_agents <= 0:
        return 1.0
    p = max(0.0, min(1.0, parallelizable_fraction))
    serial = 1.0 - p
    return 1.0 / (serial + p / num_agents)


def compute_parallelization_potential(plan: TaskPlan) -> float:
    """
    计算任务计划的可并行化比例。

    p = (独立子任务总权重) / (所有子任务总权重)
    独立子任务: 无依赖, 或与其他子任务在同一拓扑层级。
    """
    total_w = sum(s.complexity.weight for s in plan.subtasks)
    if total_w == 0:
        return 0.0

    independent_w = sum(
        s.complexity.weight
        for s in plan.subtasks
        if not s.dependencies
    )

    parallel_w = 0.0
    for level in plan.execution_order:
        if len(level) > 1:
            for sid in level:
                st = plan.get_subtask(sid)
                if st:
                    parallel_w += st.complexity.weight

    p = max(independent_w, parallel_w) / total_w
    return min(p, 1.0)


def estimate_min_completion_time(plan: TaskPlan, num_agents: int) -> float:
    """
    基于 CPM + Amdahl 估算最小完成时间。

    关键路径长度 / 基础速率 为串行下界,
    再除以 Amdahl 加速比得到并行下界。
    """
    cp_weight = sum(
        plan.get_subtask(sid).complexity.weight
        for sid in plan.critical_path
        if plan.get_subtask(sid)
    ) if plan.critical_path else 0.0

    base_rate = 1.0
    serial_time = cp_weight / base_rate

    p = compute_parallelization_potential(plan)
    speedup = amdahl_speedup(p, num_agents)

    return serial_time / speedup if speedup > 0 else serial_time
