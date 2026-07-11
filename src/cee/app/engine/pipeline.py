"""
引擎管线编排器 — 整合所有引擎模块

提供:
- PipelineOrchestrator: 编排引擎执行顺序
- 管线定义: 配置化管线（预定义 + 动态构建）
- 并行执行: 无依赖步骤并行执行
- 条件执行: 基于前一步结果决定是否执行下一步
- 管线监控: 每步耗时、状态追踪
- 管线缓存: 相同输入复用结果
- 管线执行日志
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Callable, Optional, Union


class StepStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    SKIPPED = "skipped"


class PipelineStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"


@dataclass
class StepResult:
    name: str
    status: StepStatus = StepStatus.PENDING
    output: Any = None
    elapsed: float = 0.0
    error: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status.value,
            "elapsed": round(self.elapsed, 3),
            "error": self.error,
        }


@dataclass
class PipelineResult:
    pipeline: str = ""
    status: PipelineStatus = PipelineStatus.IDLE
    steps: list[StepResult] = field(default_factory=list)
    output: Any = None
    total_elapsed: float = 0.0
    cached: bool = False
    task_id: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_id": self.task_id,
            "pipeline": self.pipeline,
            "status": self.status.value,
            "result": self.output,
            "steps": [s.to_dict() for s in self.steps],
            "total_elapsed": round(self.total_elapsed, 3),
            "cached": self.cached,
        }


@dataclass
class PipelineStep:
    name: str
    engine: str = ""
    depends_on: list[str] = field(default_factory=list)
    condition: Optional[Callable[[dict[str, StepResult]], bool]] = None
    config: dict[str, Any] = field(default_factory=dict)


class PredefinedPipelines:
    """预定义管线配置"""

    DEEP_RESEARCH: str = "deep_research"
    CODE_ASSIST: str = "code_assist"
    CONTENT_ANALYSIS: str = "content_analysis"
    CREATIVE_BRAINSTORM: str = "creative_brainstorm"
    FACT_CHECK: str = "fact_check"

    @classmethod
    def all_names(cls) -> list[str]:
        return [
            cls.DEEP_RESEARCH,
            cls.CODE_ASSIST,
            cls.CONTENT_ANALYSIS,
            cls.CREATIVE_BRAINSTORM,
            cls.FACT_CHECK,
        ]


class PipelineOrchestrator:
    """引擎管线编排器

    管理多个引擎模块的执行顺序，支持并行执行、条件执行和管线缓存。

    Usage:
        orchestrator = PipelineOrchestrator()
        result = orchestrator.execute(
            "量子计算在药物发现中的应用",
            pipeline_name="deep_research"
        )
    """

    def __init__(
        self,
        max_workers: int = 4,
        cache_enabled: bool = True,
        cache_ttl: int = 300,
        log_enabled: bool = True,
    ):
        self._max_workers = max_workers
        self._cache_enabled = cache_enabled
        self._cache_ttl = cache_ttl
        self._log_enabled = log_enabled

        self._cache: dict[str, tuple[float, PipelineResult]] = {}
        self._cache_lock = threading.Lock()
        self._execution_log: list[dict[str, Any]] = []

        self._engines: dict[str, Any] = {}
        self._steps: dict[str, list[PipelineStep]] = {}
        self._results: dict[str, StepResult] = {}
        self._init_engines()

    # ── 引擎初始化 ──────────────────────────────────────────────────

    def _init_engines(self) -> None:
        """延迟加载引擎实例"""
        try:
            from cee.app.engine.search import WebSearchEngine
            self._engines["search"] = WebSearchEngine()
        except Exception:
            self._engines["search"] = None

        try:
            from cee.app.engine.think import DeepThinkEngine
            self._engines["think"] = DeepThinkEngine()
        except Exception:
            self._engines["think"] = None

        try:
            from cee.app.engine.rag import RAGEngine
            self._engines["rag"] = RAGEngine()
        except Exception:
            self._engines["rag"] = None

        try:
            from cee.app.engine.summarizer import TextSummarizer
            self._engines["summarizer"] = TextSummarizer()
        except Exception:
            self._engines["summarizer"] = None

        try:
            from cee.app.engine.creative import CreativeSynthesisEngine
            self._engines["creative"] = CreativeSynthesisEngine()
        except Exception:
            self._engines["creative"] = None

        try:
            from cee.app.engine.code_interpreter import CodeInterpreter
            self._engines["code_interpreter"] = CodeInterpreter()
        except Exception:
            self._engines["code_interpreter"] = None

        try:
            from cee.app.engine.reasoning import ReasoningEngine
            self._engines["reasoning"] = ReasoningEngine()
        except Exception:
            self._engines["reasoning"] = None

        try:
            from cee.app.engine.bias import BiasDetector
            self._engines["bias"] = BiasDetector()
        except Exception:
            self._engines["bias"] = None

        try:
            from cee.app.engine.files import FileProcessor
            self._engines["files"] = FileProcessor()
        except Exception:
            self._engines["files"] = None

        try:
            from cee.app.engine.sentiment import SentimentAnalyzer
            self._engines["sentiment"] = SentimentAnalyzer()
        except Exception:
            self._engines["sentiment"] = None

        try:
            from cee.app.engine.topic_model import TopicAnalyzer
            self._engines["topic_model"] = TopicAnalyzer()
        except Exception:
            self._engines["topic_model"] = None

        try:
            from cee.app.engine.contradiction import ContradictionDetector
            self._engines["contradiction"] = ContradictionDetector()
        except Exception:
            self._engines["contradiction"] = None

    # ── 管线定义 ──────────────────────────────────────────────────────

    def _get_pipeline_steps(self, pipeline_name: str) -> list[PipelineStep]:
        pipelines: dict[str, list[PipelineStep]] = {
            PredefinedPipelines.DEEP_RESEARCH: [
                PipelineStep("search", "search", depends_on=[]),
                PipelineStep("think", "think", depends_on=["search"]),
                PipelineStep("rag", "rag", depends_on=["search"]),
                PipelineStep("summarizer", "summarizer", depends_on=["think", "rag"]),
                PipelineStep("creative", "creative", depends_on=["summarizer"]),
            ],
            PredefinedPipelines.CODE_ASSIST: [
                PipelineStep("code_interpreter", "code_interpreter", depends_on=[]),
                PipelineStep("reasoning", "reasoning", depends_on=["code_interpreter"]),
                PipelineStep("bias", "bias", depends_on=["reasoning"]),
            ],
            PredefinedPipelines.CONTENT_ANALYSIS: [
                PipelineStep("files", "files", depends_on=[]),
                PipelineStep("sentiment", "sentiment", depends_on=["files"]),
                PipelineStep("topic_model", "topic_model", depends_on=["files"]),
                PipelineStep("summarizer", "summarizer", depends_on=["sentiment", "topic_model"]),
            ],
            PredefinedPipelines.CREATIVE_BRAINSTORM: [
                PipelineStep("creative", "creative", depends_on=[]),
                PipelineStep("contradiction", "contradiction", depends_on=["creative"]),
                PipelineStep("reasoning", "reasoning", depends_on=["contradiction"]),
                PipelineStep("bias", "bias", depends_on=["reasoning"]),
            ],
            PredefinedPipelines.FACT_CHECK: [
                PipelineStep("search", "search", depends_on=[]),
                PipelineStep("contradiction", "contradiction", depends_on=["search"]),
                PipelineStep("reasoning", "reasoning", depends_on=["contradiction"]),
                PipelineStep("bias", "bias", depends_on=["reasoning"]),
            ],
        }

        return pipelines.get(pipeline_name, [])

    # ── 缓存方法 ──────────────────────────────────────────────────────

    def _cache_key(self, pipeline_name: str, input_text: str) -> str:
        raw = f"{pipeline_name}:{input_text}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def _get_cached(self, key: str) -> Optional[PipelineResult]:
        if not self._cache_enabled:
            return None
        with self._cache_lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            timestamp, result = entry
            if time.time() - timestamp > self._cache_ttl:
                del self._cache[key]
                return None
            return result

    def _set_cache(self, key: str, result: PipelineResult) -> None:
        if not self._cache_enabled:
            return
        with self._cache_lock:
            self._cache[key] = (time.time(), result)

    # ── 核心执行 ──────────────────────────────────────────────────────

    def execute(
        self,
        input_text: str,
        pipeline_name: str = "deep_research",
        options: dict[str, Any] | None = None,
        steps: list[dict[str, Any]] | None = None,
    ) -> PipelineResult:
        """执行引擎管线

        Args:
            input_text: 输入文本
            pipeline_name: 预定义管线名称或自定义管线标识
            options: 选项字典 (cache, parallel, max_workers 等)
            steps: 自定义管线步骤（如果不使用预定义管线）

        Returns:
            PipelineResult: 管线执行结果
        """
        options = options or {}
        use_cache = options.get("cache", True)
        run_parallel = options.get("parallel", True)
        max_workers_cfg = options.get("max_workers", self._max_workers)
        task_id = options.get("task_id", hashlib.sha256(
            f"{pipeline_name}:{input_text}:{time.time()}".encode()
        ).hexdigest()[:12])

        cache_key = self._cache_key(pipeline_name, input_text)

        if use_cache:
            cached = self._get_cached(cache_key)
            if cached is not None:
                cached.cached = True
                self._log_execution(pipeline_name, task_id, "cache_hit", 0)
                return cached

        pipeline_steps = (
            [PipelineStep(**s) for s in steps] if steps
            else self._get_pipeline_steps(pipeline_name)
        )

        if not pipeline_steps:
            return PipelineResult(
                pipeline=pipeline_name,
                status=PipelineStatus.FAILED,
                task_id=task_id,
                metadata={"error": f"未知管线: {pipeline_name}"},
            )

        start_time = time.time()
        self._log_execution(pipeline_name, task_id, "started", 0)

        step_results: dict[str, StepResult] = {}
        step_map: dict[str, PipelineStep] = {s.name: s for s in pipeline_steps}

        try:
            # 构建依赖图并逐层执行
            executed: set[str] = set()
            while len(executed) < len(pipeline_steps):
                ready_steps = [
                    s for s in pipeline_steps
                    if s.name not in executed
                    and all(d in executed for d in s.depends_on)
                ]

                if not ready_steps:
                    break

                if run_parallel and len(ready_steps) > 1:
                    self._execute_parallel(
                        ready_steps, step_map, step_results,
                        input_text, max_workers_cfg
                    )
                else:
                    for step in ready_steps:
                        self._execute_step(
                            step, step_map, step_results, input_text
                        )

                for step in ready_steps:
                    executed.add(step.name)

            output = self._aggregate_results(list(step_results.values()), input_text)
            total_elapsed = time.time() - start_time

            # 确定管线状态
            failed_count = sum(
                1 for r in step_results.values()
                if r.status == StepStatus.FAILED
            )
            if failed_count == 0:
                status = PipelineStatus.COMPLETED
            elif failed_count < len(pipeline_steps):
                status = PipelineStatus.PARTIAL
            else:
                status = PipelineStatus.FAILED

            result = PipelineResult(
                pipeline=pipeline_name,
                status=status,
                steps=list(step_results.values()),
                output=output,
                total_elapsed=total_elapsed,
                task_id=task_id,
            )

            self._set_cache(cache_key, result)
            self._log_execution(pipeline_name, task_id, "completed", total_elapsed)
            return result

        except Exception as e:
            total_elapsed = time.time() - start_time
            self._log_execution(pipeline_name, task_id, f"error: {str(e)}", total_elapsed)
            return PipelineResult(
                pipeline=pipeline_name,
                status=PipelineStatus.FAILED,
                steps=list(step_results.values()),
                total_elapsed=total_elapsed,
                task_id=task_id,
                metadata={"error": str(e)},
            )

    def _execute_parallel(
        self,
        ready_steps: list[PipelineStep],
        step_map: dict[str, PipelineStep],
        step_results: dict[str, StepResult],
        input_text: str,
        max_workers: int,
    ) -> None:
        with ThreadPoolExecutor(max_workers=min(max_workers, len(ready_steps))) as executor:
            futures = {
                executor.submit(
                    self._execute_step_inner, step, step_results, input_text
                ): step
                for step in ready_steps
            }
            for future in as_completed(futures):
                step = futures[future]
                try:
                    step_results[step.name] = future.result()
                except Exception as e:
                    step_results[step.name] = StepResult(
                        name=step.name,
                        status=StepStatus.FAILED,
                        error=str(e),
                    )

    def _execute_step(
        self,
        step: PipelineStep,
        step_map: dict[str, PipelineStep],
        step_results: dict[str, StepResult],
        input_text: str,
    ) -> None:
        result = self._execute_step_inner(step, step_results, input_text)
        step_results[step.name] = result

    def _execute_step_inner(
        self,
        step: PipelineStep,
        step_results: dict[str, StepResult],
        input_text: str,
    ) -> StepResult:
        # 条件检查
        if step.condition is not None:
            try:
                should_run = step.condition(step_results)
                if not should_run:
                    return StepResult(
                        name=step.name,
                        status=StepStatus.SKIPPED,
                    )
            except Exception:
                pass

        result = StepResult(name=step.name, status=StepStatus.RUNNING)
        start = time.time()

        try:
            engine = self._engines.get(step.engine)
            if engine is None:
                raise ValueError(f"引擎 '{step.engine}' 不可用")

            step_input = self._prepare_step_input(
                step, step_results, input_text
            )

            assert hasattr(engine, "process") or hasattr(engine, "analyze") \
                or hasattr(engine, "search") or hasattr(engine, "execute") \
                or hasattr(engine, "query") or hasattr(engine, "evaluate") \
                or hasattr(engine, "generate") or hasattr(engine, "summarize") \
                or hasattr(engine, "synthesize") or hasattr(engine, "think") \
                or hasattr(engine, "detect")

            output = self._invoke_engine(engine, step_input, step.engine)

            result.status = StepStatus.DONE
            result.output = output
        except Exception as e:
            result.status = StepStatus.FAILED
            result.error = str(e)[:200]

        result.elapsed = time.time() - start
        return result

    # ── 输入准备 ──────────────────────────────────────────────────────

    def _prepare_step_input(
        self,
        step: PipelineStep,
        step_results: dict[str, StepResult],
        input_text: str,
    ) -> str:
        """为当前步骤准备输入：优先使用依赖步骤的输出"""
        if step.depends_on:
            deps_outputs = []
            for dep in step.depends_on:
                if dep in step_results and step_results[dep].status == StepStatus.DONE:
                    output = step_results[dep].output
                    if isinstance(output, str):
                        deps_outputs.append(output)
                    elif isinstance(output, dict):
                        deps_outputs.append(json.dumps(output, ensure_ascii=False))
                    elif output is not None:
                        deps_outputs.append(str(output))
            if deps_outputs:
                return "\n".join(deps_outputs)
        return input_text

    # ── 引擎调用 ──────────────────────────────────────────────────────

    def _invoke_engine(self, engine: Any, input_text: str, engine_name: str) -> Any:
        """调用引擎的统一入口，自动匹配方法"""
        # 简单输入映射
        simple_methods = [
            ("process", [str]),
            ("analyze", [str]),
            ("evaluate", [str]),
            ("generate", [str]),
            ("execute", [str]),
            ("summarize", [str]),
            ("search", [str]),
            ("synthesize", [str]),
            ("think", [str]),
            ("detect", [str]),
            ("query", [str]),
        ]

        for method_name, arg_types in simple_methods:
            method = getattr(engine, method_name, None)
            if method is not None and callable(method):
                try:
                    return method(input_text)
                except Exception:
                    continue

        # 特殊引擎处理
        if engine_name == "files":
            parse_method = getattr(engine, "parse", None)
            if parse_method and callable(parse_method):
                try:
                    return parse_method(input_text)
                except Exception:
                    pass

        if engine_name == "contradiction":
            check_method = getattr(engine, "check", None)
            if check_method and callable(check_method):
                try:
                    return check_method(input_text)
                except Exception:
                    pass
            detect_method = getattr(engine, "detect_contradictions", None)
            if detect_method and callable(detect_method):
                try:
                    return detect_method(input_text)
                except Exception:
                    pass

        return f"[{engine_name}] 处理完成: {input_text[:100]}"

    # ── 结果聚合 ──────────────────────────────────────────────────────

    def _aggregate_results(
        self,
        step_results: list[StepResult],
        input_text: str,
    ) -> dict[str, Any]:
        """聚合所有步骤的输出"""
        completed = [r for r in step_results if r.status == StepStatus.DONE]
        step_outputs: list[str] = []

        for r in completed:
            if isinstance(r.output, str):
                step_outputs.append(r.output)
            elif isinstance(r.output, dict):
                content = r.output.get("content", r.output.get("text", str(r.output)))
                step_outputs.append(str(content)[:500])
            elif r.output is not None:
                step_outputs.append(str(r.output)[:500])

        summary = input_text[:200]
        if step_outputs:
            summary = step_outputs[-1] if len(step_outputs[-1]) < 500 else step_outputs[-1][:500]

        return {
            "summary": summary,
            "step_count": len(completed),
            "total_steps": len(step_results),
            "step_names": [r.name for r in completed],
            "step_elapsed": {r.name: round(r.elapsed, 3) for r in step_results},
            "raw_input": input_text[:200],
        }

    # ── 执行日志 ──────────────────────────────────────────────────────

    def _log_execution(
        self,
        pipeline: str,
        task_id: str,
        event: str,
        elapsed: float,
    ) -> None:
        if not self._log_enabled:
            return
        entry = {
            "timestamp": time.time(),
            "pipeline": pipeline,
            "task_id": task_id,
            "event": event,
            "elapsed": round(elapsed, 3),
        }
        self._execution_log.append(entry)

    def get_execution_log(self, limit: int = 50) -> list[dict[str, Any]]:
        return self._execution_log[-limit:][::-1]

    def clear_cache(self) -> int:
        with self._cache_lock:
            count = len(self._cache)
            self._cache.clear()
            return count

    def get_predefined_pipelines(self) -> list[str]:
        return PredefinedPipelines.all_names()

    def add_custom_steps(
        self,
        name: str,
        steps: list[PipelineStep],
    ) -> None:
        self._steps[name] = steps

    def get_pipeline_info(self, pipeline_name: str) -> dict[str, Any]:
        steps = self._get_pipeline_steps(pipeline_name)
        return {
            "name": pipeline_name,
            "steps": [
                {
                    "name": s.name,
                    "engine": s.engine,
                    "depends_on": s.depends_on,
                }
                for s in steps
            ],
            "predefined": pipeline_name in PredefinedPipelines.all_names(),
        }
