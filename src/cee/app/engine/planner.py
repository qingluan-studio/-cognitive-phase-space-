"""
Goal-Oriented Task Planner
- Task decomposition into subgoals (DAG)
- Priority-based scheduling
- Dependency resolution
- Progress tracking with rollback
- Integration with ToolUse for execution
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any, Set, Callable
from enum import Enum
import uuid
import heapq
import time as _time
from datetime import datetime
from collections import defaultdict


class TaskStatus(str, Enum):
    PENDING = "pending"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"
    SKIPPED = "skipped"


class TaskPriority(int, Enum):
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4
    OPTIONAL = 5


@dataclass
class SubTask:
    task_id: str = ""
    name: str = ""
    description: str = ""
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    dependencies: List[str] = field(default_factory=list)
    estimated_effort: float = 1.0
    assigned_tool: Optional[str] = None
    tool_params: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Any] = None
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3


@dataclass
class PlanResult:
    plan_id: str
    goal: str
    tasks: List[SubTask]
    completed: List[SubTask]
    failed: List[SubTask]
    pending: List[SubTask]
    progress: float
    execution_time_ms: float
    summary: str

    def to_dict(self) -> Dict:
        return {
            "plan_id": self.plan_id,
            "goal": self.goal,
            "task_count": len(self.tasks),
            "completed": len(self.completed),
            "failed": len(self.failed),
            "pending": len(self.pending),
            "progress": self.progress,
            "execution_time_ms": self.execution_time_ms,
            "summary": self.summary,
        }


class TaskDecomposer:
    """Decompose high-level goals into executable subtasks."""

    def __init__(self):
        self._decomposition_patterns = self._build_patterns()

    def decompose(self, goal: str, context: Optional[str] = None) -> List[SubTask]:
        tasks: List[SubTask] = []
        best_match: Optional[str] = None
        best_score = 0

        for pattern_name, pattern_fn in self._decomposition_patterns.items():
            score = self._match_score(goal, pattern_name)
            is_better = score > best_score
            # On tie, prefer non-generic patterns over catch-all "create_project"
            if score == best_score and score > 0 and pattern_name != "create_project" and best_match == "create_project":
                is_better = True
            if is_better:
                best_score = score
                best_match = pattern_name

        if best_match and best_score > 0:
            tasks = self._decomposition_patterns[best_match](goal, context)

        if not tasks:
            tasks = self._sequential_decompose(goal)

        for i, task in enumerate(tasks):
            task.task_id = f"task_{i:03d}"
            if i > 0:
                task.dependencies = [f"task_{i - 1:03d}"]

        return tasks

    def _build_patterns(self) -> Dict[str, Callable]:
        return {
            "create_project": self._decompose_project_creation,
            "data_analysis": self._decompose_data_analysis,
            "web_app": self._decompose_web_app,
            "api_endpoint": self._decompose_api,
            "refactor": self._decompose_refactor,
            "debug": self._decompose_debug,
            "research": self._decompose_research,
            "build_system": self._decompose_build_system,
        }

    def _matches_pattern(self, goal: str, pattern: str) -> bool:
        keywords: Dict[str, List[str]] = {
            "create_project": [
                "创建", "新建", "搭建", "初始化",
                "create", "new", "init", "scaffold",
            ],
            "data_analysis": [
                "分析", "数据", "统计", "可视化",
                "analyze", "data", "statistics", "visualize",
            ],
            "web_app": [
                "网页", "web", "前端", "页面", "网站",
                "frontend", "page", "site",
            ],
            "api_endpoint": [
                "api", "接口", "端点", "endpoint", "路由", "route",
            ],
            "refactor": [
                "重构", "优化", "整理", "清理",
                "refactor", "cleanup", "restructure",
            ],
            "debug": [
                "修复", "bug", "调试", "报错",
                "fix", "debug", "错误", "异常", "error",
            ],
            "research": [
                "研究", "调研", "对比", "调查",
                "research", "investigate", "compare", "survey",
            ],
            "build_system": [
                "编译", "构建", "打包", "部署",
                "build", "deploy", "package", "compile",
            ],
        }
        pattern_keywords = keywords.get(pattern, [])
        goal_lower = goal.lower()
        return any(kw in goal_lower for kw in pattern_keywords)

    def _match_score(self, goal: str, pattern: str) -> int:
        keywords = {
            "create_project": ["创建", "新建", "搭建", "初始化", "create", "new", "init", "scaffold"],
            "data_analysis": ["数据", "分析", "统计", "可视化", "data", "analyze", "statistics", "visualize"],
            "web_app": ["网页", "web", "前端", "页面", "网站", "frontend", "page", "site", "界面", "spa", "react", "vue"],
            "api_endpoint": ["api", "接口", "端点", "endpoint", "路由", "route"],
            "refactor": ["重构", "优化", "整理", "清理", "refactor", "cleanup", "restructure"],
            "debug": ["bug", "修复", "调试", "报错", "fix", "debug", "错误", "异常", "error"],
            "research": ["研究", "调研", "对比", "调查", "research", "investigate", "compare", "survey"],
            "build_system": ["编译", "构建", "打包", "部署", "build", "deploy", "package", "compile"],
        }
        pattern_keywords = keywords.get(pattern, [])
        goal_lower = goal.lower()
        return sum(1 for kw in pattern_keywords if kw in goal_lower)

    def _decompose_project_creation(
        self, goal: str, ctx: Optional[str]
    ) -> List[SubTask]:
        return [
            SubTask(
                name="Initialize project structure",
                description="Create directory layout",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Setup configuration files",
                description="Add config for linters, formatters",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Create core modules",
                description="Implement main functionality",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Add tests",
                description="Write unit tests",
                priority=TaskPriority.MEDIUM,
            ),
            SubTask(
                name="Add documentation",
                description="Write README and API docs",
                priority=TaskPriority.LOW,
            ),
        ]

    def _decompose_data_analysis(
        self, goal: str, ctx: Optional[str]
    ) -> List[SubTask]:
        return [
            SubTask(
                name="Load data",
                description="Import and validate data source",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Clean data",
                description="Handle missing values, outliers",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Exploratory analysis",
                description="Compute summary statistics",
                priority=TaskPriority.MEDIUM,
            ),
            SubTask(
                name="Model/Analyze",
                description="Apply analysis method",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Visualize results",
                description="Create charts and graphs",
                priority=TaskPriority.MEDIUM,
            ),
            SubTask(
                name="Report findings",
                description="Summarize conclusions",
                priority=TaskPriority.LOW,
            ),
        ]

    def _decompose_web_app(
        self, goal: str, ctx: Optional[str]
    ) -> List[SubTask]:
        return [
            SubTask(
                name="Design component tree",
                description="Plan UI component hierarchy",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Setup routing",
                description="Configure page routes",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Build layout components",
                description="Header, footer, sidebar",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Implement core pages",
                description="Main feature pages",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Add state management",
                description="Global state and data flow",
                priority=TaskPriority.MEDIUM,
            ),
            SubTask(
                name="Style and polish",
                description="CSS, animations, responsive",
                priority=TaskPriority.MEDIUM,
            ),
        ]

    def _decompose_api(
        self, goal: str, ctx: Optional[str]
    ) -> List[SubTask]:
        return [
            SubTask(
                name="Define API contract",
                description="Request/response schemas",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Implement handler",
                description="Business logic",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Add validation",
                description="Input validation and sanitization",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Add error handling",
                description="Error responses and logging",
                priority=TaskPriority.MEDIUM,
            ),
            SubTask(
                name="Write API tests",
                description="Integration and unit tests",
                priority=TaskPriority.MEDIUM,
            ),
        ]

    def _decompose_refactor(
        self, goal: str, ctx: Optional[str]
    ) -> List[SubTask]:
        return [
            SubTask(
                name="Analyze current code",
                description="Identify pain points",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Plan refactoring",
                description="Design target architecture",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Extract interfaces",
                description="Define clear boundaries",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Migrate incrementally",
                description="Move code piece by piece",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Verify behavior",
                description="Run tests, check parity",
                priority=TaskPriority.HIGH,
            ),
        ]

    def _decompose_debug(
        self, goal: str, ctx: Optional[str]
    ) -> List[SubTask]:
        return [
            SubTask(
                name="Reproduce issue",
                description="Create minimal reproduction",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Identify root cause",
                description="Trace error to source",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Design fix",
                description="Plan solution approach",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Implement fix",
                description="Apply the fix",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Verify fix",
                description="Test the fix works",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Add regression test",
                description="Prevent recurrence",
                priority=TaskPriority.MEDIUM,
            ),
        ]

    def _decompose_research(
        self, goal: str, ctx: Optional[str]
    ) -> List[SubTask]:
        return [
            SubTask(
                name="Define scope",
                description="Clarify research questions",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Gather information",
                description="Search, read, collect data",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Analyze findings",
                description="Compare, synthesize, evaluate",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Draw conclusions",
                description="Formulate recommendations",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Present results",
                description="Write summary report",
                priority=TaskPriority.MEDIUM,
            ),
        ]

    def _decompose_build_system(
        self, goal: str, ctx: Optional[str]
    ) -> List[SubTask]:
        return [
            SubTask(
                name="Define requirements",
                description="Build targets and dependencies",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Configure build tool",
                description="Setup build config files",
                priority=TaskPriority.HIGH,
            ),
            SubTask(
                name="Setup CI/CD",
                description="Automated pipeline",
                priority=TaskPriority.MEDIUM,
            ),
            SubTask(
                name="Test build",
                description="Verify build succeeds",
                priority=TaskPriority.CRITICAL,
            ),
            SubTask(
                name="Optimize",
                description="Speed up build, reduce size",
                priority=TaskPriority.LOW,
            ),
        ]

    def _sequential_decompose(self, goal: str) -> List[SubTask]:
        """Generic sequential decomposition for unrecognized patterns."""
        tasks = []
        steps = [
            "Analyze requirements",
            "Plan approach",
            "Implement solution",
            "Test and validate",
            "Document and finalize",
        ]
        for step in steps:
            tasks.append(
                SubTask(
                    name=step,
                    description=f"{step} for: {goal[:50]}",
                )
            )
        return tasks


class TaskScheduler:
    """Priority-based dependency-aware task scheduler."""

    def __init__(self, max_concurrent: int = 1):
        self.max_concurrent = max_concurrent
        self._ready_queue: List[Tuple[int, str, SubTask]] = []

    def schedule(self, tasks: List[SubTask]) -> List[SubTask]:
        completed_ids: Set[str] = set()
        in_progress: List[SubTask] = []
        scheduled_order: List[SubTask] = []

        remaining = [
            t for t in tasks
            if t.status not in (TaskStatus.COMPLETED, TaskStatus.SKIPPED)
        ]

        while remaining:
            ready = self._get_ready_tasks(remaining, completed_ids, in_progress)

            if not ready:
                blocked = [
                    t
                    for t in remaining
                    if t.status == TaskStatus.BLOCKED
                ]
                if blocked:
                    blocked.sort(key=lambda t: t.priority.value)
                    ready = [blocked[0]]
                else:
                    break

            ready.sort(key=lambda t: (t.priority.value, t.estimated_effort))

            for task in ready[: self.max_concurrent]:
                task.status = TaskStatus.READY
                scheduled_order.append(task)
                remaining.remove(task)
                completed_ids.add(task.task_id)

        return scheduled_order

    def _get_ready_tasks(
        self,
        tasks: List[SubTask],
        completed: Set[str],
        in_progress: List[SubTask],
    ) -> List[SubTask]:
        """Find tasks whose dependencies are all satisfied."""
        ready = []
        for task in tasks:
            if task.status == TaskStatus.COMPLETED:
                continue
            if all(dep in completed for dep in task.dependencies):
                ready.append(task)
            else:
                task.status = TaskStatus.BLOCKED
        return ready


class PlanExecutor:
    """Execute a plan with progress tracking and rollback."""

    def __init__(self, scheduler: Optional[TaskScheduler] = None):
        self.scheduler = scheduler or TaskScheduler()
        self._history: List[Tuple[str, TaskStatus, Optional[str]]] = []

    def execute(
        self,
        goal: str,
        tasks: List[SubTask],
        executor_fn: Optional[Callable] = None,
    ) -> PlanResult:
        """Execute a task plan."""
        t0 = _time.time()

        scheduled = self.scheduler.schedule(tasks)
        completed: List[SubTask] = []
        failed: List[SubTask] = []

        for task in scheduled:
            while task.status != TaskStatus.COMPLETED and task.status != TaskStatus.FAILED:
                task.status = TaskStatus.IN_PROGRESS
                task.started_at = datetime.now().isoformat()

                try:
                    if executor_fn:
                        result_val = executor_fn(task)
                        task.result = result_val
                    else:
                        task.result = {
                            "status": "ok",
                            "output": f"Completed: {task.name}",
                        }

                    task.status = TaskStatus.COMPLETED
                    task.completed_at = datetime.now().isoformat()
                    completed.append(task)

                except Exception as e:
                    task.error = str(e)
                    task.retry_count += 1
                    if task.retry_count >= task.max_retries:
                        task.status = TaskStatus.FAILED
                        failed.append(task)

                self._history.append((task.task_id, task.status, task.error))

        pending = [t for t in tasks if t.status == TaskStatus.PENDING]
        elapsed = (_time.time() - t0) * 1000
        progress = len(completed) / max(1, len(tasks))

        summary = self._generate_summary(goal, completed, failed, pending)

        return PlanResult(
            plan_id=str(uuid.uuid4())[:8],
            goal=goal,
            tasks=tasks,
            completed=completed,
            failed=failed,
            pending=pending,
            progress=progress,
            execution_time_ms=elapsed,
            summary=summary,
        )

    def _generate_summary(
        self,
        goal: str,
        completed: List[SubTask],
        failed: List[SubTask],
        pending: List[SubTask],
    ) -> str:
        parts = [f"Goal: {goal}"]
        if completed:
            parts.append(f"Completed: {len(completed)} tasks")
        if failed:
            parts.append(
                f"Failed: {len(failed)} tasks - {[t.name for t in failed]}"
            )
        if pending:
            parts.append(f"Pending: {len(pending)} tasks")
        return " | ".join(parts)

    def rollback(self, task_id: str) -> List[SubTask]:
        """Rollback a completed task and its dependents."""
        affected: List[SubTask] = []
        for task_id_h, status, error in reversed(self._history):
            for task_tuple in self._history:
                tid, _, _ = task_tuple
                if tid == task_id:
                    affected.append(
                        SubTask(
                            task_id=task_id,
                            name="rollback",
                            description="Rollback task",
                            status=TaskStatus.PENDING,
                        )
                    )
                    return affected
        return affected


class GoalPlanner:
    """Top-level goal planning orchestrator."""

    def __init__(self):
        self.decomposer = TaskDecomposer()
        self.executor = PlanExecutor()
        self._plans: Dict[str, PlanResult] = {}

    def plan(self, goal: str, context: Optional[str] = None) -> List[SubTask]:
        """Create a plan for a goal."""
        return self.decomposer.decompose(goal, context)

    def execute_plan(
        self, goal: str, executor_fn: Optional[Callable] = None
    ) -> PlanResult:
        """Plan and execute a goal."""
        tasks = self.plan(goal)
        result = self.executor.execute(goal, tasks, executor_fn)
        self._plans[result.plan_id] = result
        return result

    def get_plan(self, plan_id: str) -> Optional[PlanResult]:
        return self._plans.get(plan_id)

    def list_plans(self) -> List[Dict]:
        return [
            {
                "plan_id": p.plan_id,
                "goal": p.goal,
                "progress": p.progress,
            }
            for p in self._plans.values()
        ]

    def get_task_tree(self, goal: str) -> Dict:
        """Get tasks as a tree (for DAG visualization)."""
        tasks = self.plan(goal)
        nodes = []
        edges = []
        for t in tasks:
            nodes.append(
                {
                    "id": t.task_id,
                    "name": t.name,
                    "status": t.status.value,
                    "priority": t.priority.value,
                }
            )
            for dep in t.dependencies:
                edges.append({"from": dep, "to": t.task_id})
        return {"nodes": nodes, "edges": edges}


# Singleton
_planner: Optional[GoalPlanner] = None


def get_planner() -> GoalPlanner:
    global _planner
    if _planner is None:
        _planner = GoalPlanner()
    return _planner
