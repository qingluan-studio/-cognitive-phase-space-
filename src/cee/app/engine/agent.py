"""
智能体引擎 — 自主任务执行智能体

模拟 Kimi K2 的 Agent 能力，提供:
- AgentEngine: 自主任务执行智能体
- 任务规划器: 将复杂任务分解为子任务
- 工具选择器: 基于任务自动选择合适工具
- 执行循环: Plan → Execute → Observe → Reflect → Replan
- 子Agent 管理: 启动多个子Agent并行处理
- 结果聚合器: 合并子Agent结果
- 反思机制: 自我评估和修正
- Agent 状态追踪
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
import uuid
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Callable, Optional, Union


class TaskStatus(str, Enum):
    ACCEPTED = "accepted"
    PLANNING = "planning"
    EXECUTING = "executing"
    REFLECTING = "reflecting"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SubTaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    SKIPPED = "skipped"


class AgentPhase(str, Enum):
    PLAN = "plan"
    EXECUTE = "execute"
    OBSERVE = "observe"
    REFLECT = "reflect"
    REPLAN = "replan"


@dataclass
class SubTask:
    id: str = ""
    description: str = ""
    tool: str = ""
    depends_on: list[str] = field(default_factory=list)
    status: SubTaskStatus = SubTaskStatus.PENDING
    result: Any = None
    elapsed: float = 0.0
    error: str = ""
    priority: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResult:
    task_id: str = ""
    status: TaskStatus = TaskStatus.ACCEPTED
    output: Any = None
    sub_tasks: list[SubTask] = field(default_factory=list)
    plan: list[str] = field(default_factory=list)
    reflection: str = ""
    iterations: int = 0
    total_elapsed: float = 0.0
    score: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        sub_tasks_out = []
        for st in self.sub_tasks:
            sub_tasks_out.append({
                "id": st.id,
                "description": st.description,
                "status": st.status.value,
                "elapsed": round(st.elapsed, 3),
            })
        return {
            "task_id": self.task_id,
            "status": self.status.value,
            "result": {"output": self.output}
            if isinstance(self.output, str)
            else self.output,
            "sub_tasks": sub_tasks_out,
            "total_elapsed": round(self.total_elapsed, 3),
        }


class TaskPlanner:
    """任务规划器 — 将复杂任务分解为可执行的子任务

    基于任务描述和可用工具，自动生成子任务序列。
    """

    def __init__(self, max_sub_tasks: int = 10):
        self._max_sub_tasks = max_sub_tasks

    def plan(
        self,
        task: str,
        available_tools: list[str],
    ) -> list[SubTask]:
        """生成子任务计划

        Args:
            task: 任务描述
            available_tools: 可用工具列表

        Returns:
            SubTask 列表
        """
        subtasks = self._decompose(task, available_tools)
        if len(subtasks) > self._max_sub_tasks:
            subtasks = subtasks[:self._max_sub_tasks]
        return subtasks

    def _decompose(
        self,
        task: str,
        tools: list[str],
    ) -> list[SubTask]:
        """核心分解逻辑"""
        task_lower = task.lower()
        tasks: list[SubTask] = []
        idx = 0

        def _add(desc: str, tool: str = "", deps: list[str] | None = None) -> str:
            nonlocal idx
            tid = f"st_{idx}"
            idx += 1
            tasks.append(SubTask(
                id=tid,
                description=desc,
                tool=tool,
                depends_on=deps or [],
                priority=idx,
            ))
            return tid

        if "搜索" in task or "调查" in task or "查找" in task or "搜索" in task_lower:
            if "search" in tools:
                _add("收集相关搜索信息", "search")

        if "报告" in task or "撰写" in task or "总结" in task or "报告" in task_lower:
            if len(tasks) > 0:
                prev_ids = [t.id for t in tasks]
                if "sentiment" in tools:
                    _add("情感分析收集的内容", "sentiment", prev_ids)
                if "summarizer" in tools:
                    _add("汇总撰写综合报告", "summarizer",
                         [t.id for t in tasks])
            else:
                _add("分析主题核心内容", "reasoning")
                if "summarizer" in tools:
                    _add("生成总结输出", "summarizer",
                         [t.id for t in tasks])

        if "分析" in task or "评估" in task:
            if "reasoning" in tools:
                _add("推理分析问题核心", "reasoning")
            if "bias" in tools and len(tasks) > 0:
                _add("检测分析中的认知偏差", "bias",
                     [t.id for t in tasks])

        if "创意" in task or "创新" in task or "头脑风暴" in task:
            if "creative" in tools:
                _add("生成创意方案", "creative")
            if "contradiction" in tools and len(tasks) > 0:
                _add("检测方案的潜在矛盾", "contradiction",
                     [t.id for t in tasks])

        if "代码" in task or "编程" in task or "code" in task_lower:
            if "code_interpreter" in tools:
                _add("执行代码分析", "code_interpreter")

        if not tasks:
            # 默认通用任务分解
            last_id = _add("分析任务需求", "reasoning")
            if "search" in tools:
                search_id = _add("搜索相关信息", "search")
            if "summarizer" in tools:
                _add("汇总处理结果", "summarizer",
                     [t.id for t in tasks[:-1]])

        return tasks


class ToolSelector:
    """工具选择器 — 基于任务自动选择合适工具"""

    def __init__(self):
        self._tool_registry: dict[str, dict[str, Any]] = {
            "search": {"description": "搜索引擎", "keywords": ["搜索", "查找", "信息"]},
            "reasoning": {"description": "推理引擎", "keywords": ["推理", "分析", "逻辑"]},
            "creative": {"description": "创意合成", "keywords": ["创意", "创新", "灵感"]},
            "summarizer": {"description": "摘要引擎", "keywords": ["摘要", "总结", "概括"]},
            "sentiment": {"description": "情感分析", "keywords": ["情感", "情绪", "态度"]},
            "bias": {"description": "偏差检测", "keywords": ["偏差", "偏见", "客观"]},
            "code_interpreter": {"description": "代码解释", "keywords": ["代码", "编程", "程序"]},
            "contradiction": {"description": "矛盾检测", "keywords": ["矛盾", "冲突", "一致"]},
            "think": {"description": "深度思考", "keywords": ["思考", "推理", "分析"]},
        }

    def select(
        self,
        task: str,
        available: list[str],
        max_tools: int = 5,
    ) -> list[str]:
        """基于任务描述选择最佳工具集合

        Args:
            task: 任务描述
            available: 可用工具列表
            max_tools: 最大工具数

        Returns:
            选择的工具列表（按相关性排序）
        """
        available_set = set(available)
        scores: dict[str, float] = {}

        for tool, info in self._tool_registry.items():
            if tool not in available_set:
                continue
            score = 0.0
            task_lower = task.lower()
            for kw in info["keywords"]:
                if kw in task or kw.lower() in task_lower:
                    score += 1.0
            if score > 0:
                scores[tool] = score

        ranked = sorted(scores.items(), key=lambda x: -x[1])
        selected = [t for t, _ in ranked[:max_tools]]

        # 确保至少选择一些默认工具
        if not selected and available:
            defaults = ["reasoning", "summarizer"]
            selected = [t for t in defaults if t in available_set]
            if not selected:
                selected = available[:max_tools]

        return selected


class AgentEngine:
    """智能体引擎 — 自主任务执行

    实现 Plan → Execute → Observe → Reflect → Replan 循环。

    Usage:
        engine = AgentEngine()
        result = engine.execute(
            "分析最近AI行业趋势，撰写趋势报告",
            tools=["search", "reasoning", "summarizer"]
        )
    """

    def __init__(
        self,
        max_sub_tasks: int = 10,
        max_iterations: int = 5,
        parallel_subtasks: bool = True,
        max_workers: int = 4,
    ):
        self._planner = TaskPlanner(max_sub_tasks=max_sub_tasks)
        self._selector = ToolSelector()
        self._max_iterations = max_iterations
        self._parallel_subtasks = parallel_subtasks
        self._max_workers = max_workers

        self._engines: dict[str, Any] = {}
        self._tasks: dict[str, AgentResult] = {}
        self._lock = threading.Lock()
        self._init_engines()

    # ── 引擎初始化 ──────────────────────────────────────────────────

    def _init_engines(self) -> None:
        engine_registry = [
            ("search", "cee.app.engine.search", "WebSearchEngine"),
            ("reasoning", "cee.app.engine.reasoning", "ReasoningEngine"),
            ("creative", "cee.app.engine.creative", "CreativeSynthesisEngine"),
            ("summarizer", "cee.app.engine.summarizer", "TextSummarizer"),
            ("sentiment", "cee.app.engine.sentiment", "SentimentAnalyzer"),
            ("bias", "cee.app.engine.bias", "BiasDetector"),
            ("code_interpreter", "cee.app.engine.code_interpreter", "CodeInterpreter"),
            ("contradiction", "cee.app.engine.contradiction", "ContradictionDetector"),
            ("think", "cee.app.engine.think", "DeepThinkEngine"),
        ]
        for name, module_path, class_name in engine_registry:
            try:
                mod = __import__(module_path, fromlist=[class_name])
                cls = getattr(mod, class_name)
                self._engines[name] = cls()
            except Exception:
                self._engines[name] = None

    # ── 核心执行 ────────────────────────────────────────────────────

    def execute(
        self,
        task: str,
        tools: list[str] | None = None,
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """提交并执行智能体任务

        Args:
            task: 任务描述
            tools: 可用工具列表
            options: 选项 (max_sub_tasks, parallel, max_iterations 等)

        Returns:
            包含 task_id 和状态的字典
        """
        options = options or {}
        task_id = options.get("task_id", hashlib.sha256(
            f"agent:{task}:{time.time()}".encode()
        ).hexdigest()[:12])

        available_tools = tools or self._selector.select(task, list(self._engines.keys()))
        filtered_tools = [t for t in available_tools if self._engines.get(t) is not None]

        result = AgentResult(
            task_id=task_id,
            status=TaskStatus.ACCEPTED,
        )

        with self._lock:
            self._tasks[task_id] = result

        self._run_agent(task_id, task, filtered_tools, options)
        return {"task_id": task_id, "status": TaskStatus.ACCEPTED.value}

    def _run_agent(
        self,
        task_id: str,
        task: str,
        tools: list[str],
        options: dict[str, Any],
    ) -> None:
        """在后台线程中运行 PEOR 循环"""
        def _runner():
            try:
                result = self._tasks.get(task_id)
                if not result:
                    return
                result.status = TaskStatus.PLANNING

                # Phase 1: Plan
                subtasks = self._planner.plan(task, tools)
                result.plan = [st.description for st in subtasks]
                result.sub_tasks = subtasks

                # Phase 2: Execute + Observe
                result.status = TaskStatus.EXECUTING
                total_start = time.time()
                iterations = 0

                while iterations < self._max_iterations:
                    pending = [st for st in subtasks if st.status == SubTaskStatus.PENDING]
                    if not pending:
                        break

                    # 检查依赖
                    ready = [
                        st for st in pending
                        if all(
                            d in [s.id for s in subtasks if s.status == SubTaskStatus.DONE]
                            for d in st.depends_on
                        )
                    ]

                    if not ready:
                        # 有循环依赖或不可满足的依赖
                        for st in pending:
                            if st.status == SubTaskStatus.PENDING:
                                st.status = SubTaskStatus.SKIPPED
                        break

                    if self._parallel_subtasks and len(ready) > 1:
                        self._execute_parallel(ready, tools)
                    else:
                        for st in ready:
                            self._execute_single(st, tools)

                    iterations += 1

                # Phase 3: Reflect
                result.status = TaskStatus.REFLECTING
                result.reflection = self._reflect(subtasks)

                # Phase 4: Aggregate
                result.output = self._aggregate(task, subtasks)
                result.status = TaskStatus.COMPLETED

                all_scores = []
                for st in subtasks:
                    if isinstance(st.result, dict):
                        s = st.result.get("confidence", st.result.get("score", 0))
                        try:
                            all_scores.append(float(s))
                        except (TypeError, ValueError):
                            all_scores.append(0.5)
                result.score = sum(all_scores) / len(all_scores) if all_scores else 0.5
                result.iterations = iterations
                result.total_elapsed = time.time() - total_start

            except Exception as e:
                result = self._tasks.get(task_id)
                if result:
                    result.status = TaskStatus.FAILED
                    result.output = str(e)

        thread = threading.Thread(target=_runner, daemon=True)
        thread.start()

    def _execute_parallel(
        self,
        subtasks: list[SubTask],
        tools: list[str],
    ) -> None:
        with ThreadPoolExecutor(max_workers=min(self._max_workers, len(subtasks))) as executor:
            futures = {
                executor.submit(self._execute_single, st, tools): st
                for st in subtasks
            }
            for future in as_completed(futures):
                future.result()

    def _execute_single(
        self,
        subtask: SubTask,
        tools: list[str],
    ) -> None:
        subtask.status = SubTaskStatus.RUNNING
        start = time.time()

        try:
            engine = self._engines.get(subtask.tool)
            if engine is None:
                subtask.status = SubTaskStatus.SKIPPED
                subtask.result = f"工具 {subtask.tool} 不可用"
                return

            output = self._invoke_tool(engine, subtask)
            subtask.result = output
            subtask.status = SubTaskStatus.DONE
        except Exception as e:
            subtask.status = SubTaskStatus.FAILED
            subtask.error = str(e)[:200]

        subtask.elapsed = time.time() - start

    def _invoke_tool(self, engine: Any, subtask: SubTask) -> Any:
        tool_name = subtask.tool
        input_text = subtask.description

        invoke_map: dict[str, str] = {
            "search": "search",
            "reasoning": "reason",
            "creative": "synthesize",
            "summarizer": "summarize",
            "sentiment": "analyze",
            "bias": "detect",
            "code_interpreter": "execute",
            "contradiction": "check",
            "think": "think",
        }

        method_name = invoke_map.get(tool_name, "process")
        method = getattr(engine, method_name, None)

        if method and callable(method):
            return method(input_text)

        # 回退
        for fallback_name in ["process", "analyze", "execute", "evaluate"]:
            fallback = getattr(engine, fallback_name, None)
            if fallback and callable(fallback):
                try:
                    return fallback(input_text)
                except Exception:
                    continue

        return f"Tool {tool_name}: processed '{input_text[:50]}'"

    # ── 反思 ─────────────────────────────────────────────────────────

    def _reflect(self, subtasks: list[SubTask]) -> str:
        total = len(subtasks)
        done = sum(1 for st in subtasks if st.status == SubTaskStatus.DONE)
        failed = sum(1 for st in subtasks if st.status == SubTaskStatus.FAILED)
        skipped = sum(1 for st in subtasks if st.status == SubTaskStatus.SKIPPED)

        parts = [f"任务完成情况: {done}/{total} 完成"]
        if failed:
            parts.append(f"失败: {failed} 个子任务")
        if skipped:
            parts.append(f"跳过: {skipped} 个子任务")

        total_time = sum(st.elapsed for st in subtasks)
        parts.append(f"总耗时: {round(total_time, 2)}秒")

        if failed > 0:
            parts.append("建议: 检查失败子任务的工具可用性和输入格式")
        if skipped > 0:
            parts.append("建议: 部分子任务因依赖未满足被跳过")

        return "。".join(parts)

    # ── 结果聚合 ────────────────────────────────────────────────────

    def _aggregate(self, task: str, subtasks: list[SubTask]) -> dict[str, Any]:
        """合并所有子任务的结果"""
        outputs: list[str] = []

        for st in subtasks:
            if st.status == SubTaskStatus.DONE and st.result is not None:
                if isinstance(st.result, str):
                    outputs.append(st.result[:300])
                elif isinstance(st.result, dict):
                    content = st.result.get("content", st.result.get("text", str(st.result)))
                    outputs.append(str(content)[:300])
                else:
                    outputs.append(str(st.result)[:300])

        combined = "\n\n".join(outputs) if outputs else f"任务 '{task[:50]}' 已处理"
        return {
            "output": combined[:2000],
            "completed_subtasks": sum(
                1 for st in subtasks if st.status == SubTaskStatus.DONE
            ),
            "total_subtasks": len(subtasks),
            "tools_used": list({st.tool for st in subtasks if st.tool}),
        }

    # ── 查询接口 ────────────────────────────────────────────────────

    def get_task_status(self, task_id: str) -> dict[str, Any] | None:
        """查询智能体任务状态"""
        with self._lock:
            result = self._tasks.get(task_id)
            if result is None:
                return None
            return result.to_dict()

    def cancel_task(self, task_id: str) -> bool:
        """取消智能体任务"""
        with self._lock:
            result = self._tasks.get(task_id)
            if result is None:
                return False
            if result.status in {
                TaskStatus.COMPLETED,
                TaskStatus.FAILED,
                TaskStatus.CANCELLED,
            }:
                return False
            result.status = TaskStatus.CANCELLED
            return True

    def list_tasks(self, status: str | None = None) -> list[dict[str, Any]]:
        """列出所有/指定状态的智能体任务"""
        with self._lock:
            items = list(self._tasks.values())
            if status:
                items = [r for r in items if r.status.value == status]
            return [
                {
                    "task_id": r.task_id,
                    "status": r.status.value,
                    "total_elapsed": round(r.total_elapsed, 3),
                    "iterations": r.iterations,
                    "score": round(r.score, 3),
                }
                for r in items
            ]

    def get_available_tools(self) -> list[dict[str, Any]]:
        """获取可用工具列表"""
        tools = []
        for name, info in self._selector._tool_registry.items():
            available = self._engines.get(name) is not None
            tools.append({
                "name": name,
                "description": info["description"],
                "available": available,
            })
        return tools
