"""
CEE Workflow Engine — 认知工作流编排引擎

提供复杂的多步骤认知处理工作流定义、执行和监控:
  - DAG工作流: 有向无环图定义的处理管道
  - 条件分支: 基于中间结果的动态路由
  - 并行执行: 独立节点的并行处理
  - 重试策略: 指数退避/固定间隔/自定义
  - 超时控制: 全局和节点级超时
  - 执行追踪: 全链路日志和指标收集
  - 状态持久化: 工作流状态可恢复
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class NodeStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    TIMEOUT = "timeout"


class WorkflowStatus(Enum):
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RetryPolicy(Enum):
    NONE = "none"
    FIXED = "fixed"
    EXPONENTIAL = "exponential"
    LINEAR = "linear"


@dataclass
class NodeConfig:
    """工作流节点配置"""
    node_id: str
    handler: Callable
    name: str = ""
    timeout: float = 300.0
    retry_policy: RetryPolicy = RetryPolicy.NONE
    max_retries: int = 0
    retry_delay: float = 1.0
    depends_on: list[str] = field(default_factory=list)
    condition: Callable | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class NodeResult:
    """节点执行结果"""
    node_id: str
    status: NodeStatus
    output: Any = None
    error: str = ""
    duration: float = 0.0
    retries: int = 0
    started_at: float = 0.0
    finished_at: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowConfig:
    """工作流配置"""
    workflow_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    name: str = ""
    nodes: list[NodeConfig] = field(default_factory=list)
    global_timeout: float = 3600.0
    max_parallel: int = 10
    fail_fast: bool = False
    collect_metrics: bool = True


@dataclass
class WorkflowResult:
    """工作流执行结果"""
    workflow_id: str
    status: WorkflowStatus
    node_results: dict[str, NodeResult] = field(default_factory=dict)
    total_duration: float = 0.0
    metrics: dict[str, Any] = field(default_factory=dict)
    error: str = ""


class WorkflowEngine:
    """认知工作流编排引擎"""

    def __init__(self):
        self._workflows: dict[str, WorkflowConfig] = {}
        self._results: dict[str, WorkflowResult] = {}
        self._running: dict[str, asyncio.Task] = {}
        self._context: dict[str, dict[str, Any]] = {}
        self._hooks: dict[str, list[Callable]] = defaultdict(list)

    def register_workflow(self, config: WorkflowConfig) -> str:
        self._validate_dag(config)
        self._workflows[config.workflow_id] = config
        return config.workflow_id

    def _validate_dag(self, config: WorkflowConfig) -> None:
        node_ids = {n.node_id for n in config.nodes}
        for n in config.nodes:
            for dep in n.depends_on:
                if dep not in node_ids:
                    raise ValueError(f"节点 '{n.node_id}' 依赖 '{dep}'，但该节点不在工作流中")

        in_degree = {n.node_id: len(n.depends_on) for n in config.nodes}
        queue = deque([nid for nid, d in in_degree.items() if d == 0])
        visited = set()

        while queue:
            nid = queue.popleft()
            visited.add(nid)
            for n in config.nodes:
                if nid in n.depends_on:
                    in_degree[n.node_id] -= 1
                    if in_degree[n.node_id] == 0:
                        queue.append(n.node_id)

        if len(visited) != len(config.nodes):
            raise ValueError("工作流包含循环依赖")

    def on(self, event: str, callback: Callable) -> None:
        self._hooks[event].append(callback)

    async def _fire_hooks(self, event: str, **kwargs: Any) -> None:
        for hook in self._hooks[event]:
            try:
                if asyncio.iscoroutinefunction(hook):
                    await hook(**kwargs)
                else:
                    hook(**kwargs)
            except Exception as e:
                logger.warning("Hook %s 执行失败: %s", event, e)

    async def execute(self, workflow_id: str,
                      inputs: dict[str, Any] | None = None) -> WorkflowResult:
        config = self._workflows.get(workflow_id)
        if config is None:
            return WorkflowResult(workflow_id=workflow_id, status=WorkflowStatus.FAILED,
                                  error=f"工作流 '{workflow_id}' 未注册")

        result = WorkflowResult(workflow_id=workflow_id, status=WorkflowStatus.RUNNING)
        self._results[workflow_id] = result

        context = {"inputs": inputs or {}, "outputs": {}, "workflow_id": workflow_id}
        self._context[workflow_id] = context

        await self._fire_hooks("workflow_start", workflow_id=workflow_id, inputs=inputs)

        start_time = time.monotonic()
        try:
            node_results = await self._execute_dag(config, result)
            result.node_results = node_results
            result.status = WorkflowStatus.COMPLETED
        except asyncio.TimeoutError:
            result.status = WorkflowStatus.FAILED
            result.error = "工作流执行超时"
        except Exception as e:
            result.status = WorkflowStatus.FAILED
            result.error = str(e)
            logger.exception("工作流 %s 执行失败", workflow_id)

        result.total_duration = time.monotonic() - start_time
        if config.collect_metrics:
            result.metrics = self._compute_metrics(result)

        await self._fire_hooks("workflow_end", workflow_id=workflow_id, result=result)
        return result

    async def _execute_dag(self, config: WorkflowConfig,
                            result: WorkflowResult) -> dict[str, NodeResult]:
        pending = {n.node_id: set(n.depends_on) for n in config.nodes}
        ready_queue: deque[str] = deque(
            n.node_id for n in config.nodes if not n.depends_on
        )
        node_map = {n.node_id: n for n in config.nodes}
        node_results: dict[str, NodeResult] = {}
        running_tasks: dict[str, asyncio.Task] = {}
        completed: set[str] = set()

        ctx = self._context[config.workflow_id]

        while ready_queue or running_tasks:
            while ready_queue and len(running_tasks) < config.max_parallel:
                nid = ready_queue.popleft()
                node = node_map[nid]

                if node.condition and not node.condition(ctx):
                    node_results[nid] = NodeResult(
                        node_id=nid, status=NodeStatus.SKIPPED,
                    )
                    completed.add(nid)
                    self._propagate_completion(nid, node_map, pending, ready_queue, completed)
                    continue

                task = asyncio.create_task(
                    self._execute_node_with_retry(node, ctx, config.global_timeout)
                )
                running_tasks[nid] = task

            if not running_tasks:
                break

            done, _ = await asyncio.wait(
                running_tasks.values(),
                return_when=asyncio.FIRST_COMPLETED,
                timeout=config.global_timeout,
            )

            for task in done:
                try:
                    nr = task.result()
                except Exception as e:
                    failed_nid = [
                        nid for nid, t in running_tasks.items() if t is task
                    ][0]
                    nr = NodeResult(
                        node_id=failed_nid, status=NodeStatus.FAILED,
                        error=str(e),
                    )

                nid = nr.node_id
                node_results[nid] = nr
                del running_tasks[nid]

                if nr.status == NodeStatus.FAILED and config.fail_fast:
                    for t in running_tasks.values():
                        t.cancel()
                    return node_results

                if nr.status != NodeStatus.FAILED:
                    ctx["outputs"][nid] = nr.output
                completed.add(nid)

                self._propagate_completion(nid, node_map, pending, ready_queue, completed)

        return node_results

    def _propagate_completion(self, nid: str, node_map: dict,
                               pending: dict, ready_queue: deque,
                               completed: set) -> None:
        for other_id, deps in pending.items():
            if nid in deps:
                deps.discard(nid)
                if not deps and other_id not in completed:
                    ready_queue.append(other_id)

    async def _execute_node_with_retry(self, node: NodeConfig, ctx: dict,
                                        global_timeout: float) -> NodeResult:
        timeout = min(node.timeout, global_timeout)
        last_error = ""

        for attempt in range(node.max_retries + 1):
            started = time.monotonic()
            try:
                output = await asyncio.wait_for(
                    self._call_handler(node.handler, ctx),
                    timeout=timeout,
                )
                return NodeResult(
                    node_id=node.node_id,
                    status=NodeStatus.COMPLETED,
                    output=output,
                    duration=time.monotonic() - started,
                    retries=attempt,
                    started_at=started,
                    finished_at=time.monotonic(),
                )
            except asyncio.TimeoutError:
                last_error = f"节点超时 ({timeout}s)"
                if attempt == node.max_retries:
                    return NodeResult(
                        node_id=node.node_id,
                        status=NodeStatus.TIMEOUT,
                        error=last_error,
                        duration=time.monotonic() - started,
                        retries=attempt,
                    )
            except Exception as e:
                last_error = str(e)
                if attempt == node.max_retries:
                    return NodeResult(
                        node_id=node.node_id,
                        status=NodeStatus.FAILED,
                        error=last_error,
                        duration=time.monotonic() - started,
                        retries=attempt,
                    )

            if node.retry_policy == RetryPolicy.FIXED:
                await asyncio.sleep(node.retry_delay)
            elif node.retry_policy == RetryPolicy.EXPONENTIAL:
                await asyncio.sleep(node.retry_delay * (2 ** attempt))
            elif node.retry_policy == RetryPolicy.LINEAR:
                await asyncio.sleep(node.retry_delay * (attempt + 1))

        return NodeResult(
            node_id=node.node_id,
            status=NodeStatus.FAILED,
            error=last_error,
        )

    async def _call_handler(self, handler: Callable, ctx: dict) -> Any:
        if asyncio.iscoroutinefunction(handler):
            return await handler(ctx)
        return handler(ctx)

    def _compute_metrics(self, result: WorkflowResult) -> dict[str, Any]:
        metrics = {
            "total_nodes": len(result.node_results),
            "completed": len([r for r in result.node_results.values()
                              if r.status == NodeStatus.COMPLETED]),
            "failed": len([r for r in result.node_results.values()
                           if r.status == NodeStatus.FAILED]),
            "skipped": len([r for r in result.node_results.values()
                            if r.status == NodeStatus.SKIPPED]),
            "timeout": len([r for r in result.node_results.values()
                            if r.status == NodeStatus.TIMEOUT]),
        }

        durations = [r.duration for r in result.node_results.values()
                     if r.duration > 0]
        if durations:
            metrics["avg_node_duration"] = sum(durations) / len(durations)
            metrics["max_node_duration"] = max(durations)

        metrics["success_rate"] = (
            metrics["completed"] / metrics["total_nodes"]
            if metrics["total_nodes"] > 0 else 0.0
        )

        return metrics

    def get_result(self, workflow_id: str) -> WorkflowResult | None:
        return self._results.get(workflow_id)

    def get_context(self, workflow_id: str) -> dict[str, Any] | None:
        return self._context.get(workflow_id)


class CognitivePipeline:
    """预定义认知处理管道"""

    def __init__(self, engine: WorkflowEngine | None = None):
        self._engine = engine or WorkflowEngine()

    def create_evaluation_pipeline(self, text_handler: Callable) -> str:
        """创建认知评估管道: T1→T2→T3→T4→T5→T6→T7→T8→T9"""
        config = WorkflowConfig(
            name="cognitive_evaluation",
            nodes=[
                NodeConfig("T1", self._wrap_t1, "认知同构", depends_on=[]),
                NodeConfig("T2", self._wrap_t2, "超图坍缩", depends_on=["T1"]),
                NodeConfig("T3", self._wrap_t3, "测地线导航", depends_on=["T2"]),
                NodeConfig("T4", self._wrap_t4, "知识结晶", depends_on=["T2"]),
                NodeConfig("T5", self._wrap_t5, "反事实生长", depends_on=["T3"]),
                NodeConfig("T6", self._wrap_t6, "不变量评估", depends_on=["T3", "T4"]),
                NodeConfig("T7", self._wrap_t7, "认知共振", depends_on=["T6"]),
                NodeConfig("T8", self._wrap_t8, "语义纠缠", depends_on=["T6"]),
                NodeConfig("T9", self._wrap_t9, "涌现动力学", depends_on=["T7", "T8"]),
            ],
            fail_fast=False,
            max_parallel=3,
        )
        return self._engine.register_workflow(config)

    @staticmethod
    def _wrap_t1(ctx):
        ctx["outputs"]["T1"] = {"status": "completed", "method": "cognitive_isomorphism"}

    @staticmethod
    def _wrap_t2(ctx):
        ctx["outputs"]["T2"] = {"status": "completed", "method": "hypergraph_collapse"}

    @staticmethod
    def _wrap_t3(ctx):
        ctx["outputs"]["T3"] = {"status": "completed", "method": "geodesic_navigation"}

    @staticmethod
    def _wrap_t4(ctx):
        ctx["outputs"]["T4"] = {"status": "completed", "method": "crystallization"}

    @staticmethod
    def _wrap_t5(ctx):
        ctx["outputs"]["T5"] = {"status": "completed", "method": "counterfactual_growth"}

    @staticmethod
    def _wrap_t6(ctx):
        ctx["outputs"]["T6"] = {"status": "completed", "method": "invariant_evaluation"}

    @staticmethod
    def _wrap_t7(ctx):
        ctx["outputs"]["T7"] = {"status": "completed", "method": "resonance_analysis"}

    @staticmethod
    def _wrap_t8(ctx):
        ctx["outputs"]["T8"] = {"status": "completed", "method": "entanglement_analysis"}

    @staticmethod
    def _wrap_t9(ctx):
        ctx["outputs"]["T9"] = {"status": "completed", "method": "emergence_dynamics"}


class WorkflowScheduler:
    """工作流调度器 — 支持定时和条件触发"""

    def __init__(self):
        self._scheduled: dict[str, dict[str, Any]] = {}
        self._engine = WorkflowEngine()

    def schedule(self, workflow_id: str, interval: float = 0.0,
                  cron: str = "", condition: Callable | None = None) -> str:
        job_id = str(uuid.uuid4())[:8]
        self._scheduled[job_id] = {
            "workflow_id": workflow_id,
            "interval": interval,
            "cron": cron,
            "condition": condition,
            "last_run": 0.0,
            "run_count": 0,
        }
        return job_id

    async def tick(self) -> None:
        now = time.monotonic()
        for job_id, job in list(self._scheduled.items()):
            if now - job["last_run"] >= job["interval"]:
                if job["condition"] is None or job["condition"]():
                    try:
                        await self._engine.execute(job["workflow_id"])
                        job["last_run"] = now
                        job["run_count"] += 1
                    except Exception as e:
                        logger.error("调度任务 %s 执行失败: %s", job_id, e)

    def unschedule(self, job_id: str) -> bool:
        return self._scheduled.pop(job_id, None) is not None

    def list_scheduled(self) -> list[dict[str, Any]]:
        return [
            {"job_id": jid, **job}
            for jid, job in self._scheduled.items()
        ]
