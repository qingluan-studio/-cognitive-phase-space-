"""
工具注册中心 - Tool Registry

核心理念:
  工具是 Agent 的手与足。注册中心是所有工具的中央索引，
  负责工具的注册、发现、参数校验、执行调度和结果缓存。

  每个工具由定义驱动的声明式 schema 描述，运行时通过统一
  executor 安全执行，支持超时控制、重试、缓存和沙箱隔离。

架构:
  ToolDefinition (声明) --> ToolRegistry (索引)
                      --> ToolExecutor (执行)
                      --> ToolChain (编排)
  BuiltinTools 提供开箱即用的基础工具集。

双轨制:
  - 工程版: 确定性注册 + 条件分支编排
  - 理论版: 工具选择的 MDP 建模 + Thompson 采样探索
"""

from __future__ import annotations

import ast
import hashlib
import json
import logging
import math
import operator
import os
import re
import threading
import time
from collections import OrderedDict, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Callable
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

# ==============================================================================
# Enums & Dataclasses
# ==============================================================================


class ToolCategory(Enum):
    SEARCH = "search"
    CODE = "code"
    FILE = "file"
    API = "api"
    DATABASE = "database"
    MEDIA = "media"
    SYSTEM = "system"
    CUSTOM = "custom"


@dataclass
class ToolParameter:
    name: str
    type: str
    required: bool = True
    default: Any = None
    description: str = ""
    enum_values: list[str] = field(default_factory=list)

    def validate(self, value: Any) -> list[str]:
        errors: list[str] = []
        if value is None:
            if self.required and self.default is None:
                errors.append(f"Parameter '{self.name}' is required but missing")
            return errors
        type_map = {"str": str, "int": int, "float": (int, float), "bool": bool}
        if self.type in type_map and not isinstance(value, type_map[self.type]):
            errors.append(f"Parameter '{self.name}' expected {self.type}, got {type(value).__name__}")
        elif self.type == "enum" and self.enum_values and value not in self.enum_values:
            errors.append(f"Parameter '{self.name}' value '{value}' not in allowed: {self.enum_values}")
        return errors


@dataclass
class ToolDefinition:
    name: str
    description: str
    category: ToolCategory = ToolCategory.CUSTOM
    parameters: list[ToolParameter] = field(default_factory=list)
    return_description: str = ""
    examples: list[str] = field(default_factory=list)
    requires_approval: bool = False
    timeout_seconds: float = 30.0

    def to_json_schema(self) -> dict[str, Any]:
        type_mapping = {"str": "string", "int": "integer", "float": "number", "bool": "boolean", "enum": "string"}
        required_names: list[str] = []
        props: dict[str, Any] = {}
        for p in self.parameters:
            prop: dict[str, Any] = {"type": type_mapping.get(p.type, "string"), "description": p.description}
            if p.default is not None:
                prop["default"] = p.default
            if p.enum_values:
                prop["enum"] = p.enum_values
            props[p.name] = prop
            if p.required and p.default is None:
                required_names.append(p.name)
        schema: dict[str, Any] = {"type": "object", "title": self.name, "description": self.description, "properties": props}
        if required_names:
            schema["required"] = required_names
        return schema


@dataclass
class ToolExecutionResult:
    success: bool
    data: Any = None
    error: str = ""
    execution_time_ms: float = 0.0
    tokens_used: int = 0
    cache_hit: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {"success": self.success, "data": self.data, "error": self.error, "execution_time_ms": self.execution_time_ms, "tokens_used": self.tokens_used, "cache_hit": self.cache_hit}


class ToolRegistryError(Exception):
    """工具注册中心异常"""


class ToolExecutionError(Exception):
    """工具执行异常"""


class ToolChainError(Exception):
    """工具链编排异常"""


# ==============================================================================
# Tool Registry
# ==============================================================================


class ToolRegistry:
    """工具注册中心 - 集中管理所有工具定义"""

    def __init__(self) -> None:
        self._tools: dict[str, ToolDefinition] = OrderedDict()
        self._category_index: dict[ToolCategory, list[str]] = defaultdict(list)
        self._keyword_index: dict[str, list[str]] = defaultdict(list)
        self._lock = threading.Lock()

    def register(self, tool: ToolDefinition) -> None:
        with self._lock:
            if tool.name in self._tools:
                raise ToolRegistryError(f"Tool '{tool.name}' is already registered")
            self._tools[tool.name] = tool
            self._category_index[tool.category].append(tool.name)
            kws = re.findall(r"[a-z_]{3,}", f"{tool.name} {tool.description} {' '.join(tool.examples)}".lower())
            stop = {"the", "and", "for", "with", "that", "this", "from", "tool"}
            for kw in {w for w in kws if w not in stop}:
                self._keyword_index[kw].append(tool.name)
        logger.info("Registered tool: %s (category=%s)", tool.name, tool.category.value)

    def unregister(self, name: str) -> None:
        with self._lock:
            if name not in self._tools:
                raise ToolRegistryError(f"Tool '{name}' is not registered")
            tool = self._tools.pop(name)
            self._category_index[tool.category].remove(name)
            kws = re.findall(r"[a-z_]{3,}", f"{tool.name} {tool.description} {' '.join(tool.examples)}".lower())
            stop = {"the", "and", "for", "with", "that", "this", "from", "tool"}
            for kw in {w for w in kws if w not in stop}:
                cat = self._keyword_index[kw]
                cat.remove(name)
                if not cat:
                    del self._keyword_index[kw]
        logger.info("Unregistered tool: %s", name)

    def get(self, name: str) -> ToolDefinition:
        with self._lock:
            if name not in self._tools:
                raise ToolRegistryError(f"Tool '{name}' not found")
            return self._tools[name]

    def find_by_name(self, name: str) -> ToolDefinition | None:
        try:
            return self.get(name)
        except ToolRegistryError:
            return None

    def find_by_category(self, category: ToolCategory) -> list[ToolDefinition]:
        with self._lock:
            return [self._tools[n] for n in self._category_index.get(category, [])]

    def find_by_keyword(self, query: str) -> list[ToolDefinition]:
        q = query.lower()
        tokens = set(q.split())
        scores: dict[str, float] = defaultdict(float)
        with self._lock:
            for token in tokens:
                for ikw, names in self._keyword_index.items():
                    if token in ikw:
                        for n in names:
                            scores[n] += 1.0
            for name, tool in self._tools.items():
                nl, dl = name.lower(), tool.description.lower()
                if q in nl:
                    scores[name] += 3.0
                if q in dl:
                    scores[name] += 2.0
                for t in tokens:
                    if t in nl:
                        scores[name] += 0.5
                    if t in dl:
                        scores[name] += 0.5
            ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
            return [self._tools[n] for n, _ in ranked if scores.get(n, 0) > 0]

    def list_all(self) -> list[ToolDefinition]:
        with self._lock:
            return list(self._tools.values())

    def validate_parameters(self, tool_name: str, params: dict[str, Any]) -> list[str]:
        tool = self.get(tool_name)
        errors: list[str] = []
        known = {p.name for p in tool.parameters}
        for p in tool.parameters:
            errors.extend(p.validate(params.get(p.name)))
        for extra in set(params.keys()) - known:
            errors.append(f"Unknown parameter '{extra}' for tool '{tool_name}'")
        return errors

    def generate_schema(self, tool_name: str) -> dict[str, Any]:
        return self.get(tool_name).to_json_schema()

    def generate_all_schemas(self) -> dict[str, Any]:
        return {t.name: t.to_json_schema() for t in self.list_all()}

    @property
    def count(self) -> int:
        return len(self._tools)


# ==============================================================================
# Tool Executor
# ==============================================================================


class ToolExecutor:
    """工具执行引擎 - 超时控制、结果缓存、重试与回退、沙箱隔离"""

    _SAFE_MATH: dict[str, Any] = {
        "abs": abs, "round": round, "min": min, "max": max, "sum": sum, "pow": pow,
        "sqrt": math.sqrt, "log": math.log, "log10": math.log10, "log2": math.log2, "exp": math.exp,
        "sin": math.sin, "cos": math.cos, "tan": math.tan,
        "asin": math.asin, "acos": math.acos, "atan": math.atan,
        "sinh": math.sinh, "cosh": math.cosh, "tanh": math.tanh,
        "degrees": math.degrees, "radians": math.radians,
        "pi": math.pi, "e": math.e, "tau": math.tau, "inf": math.inf, "nan": math.nan,
        "ceil": math.ceil, "floor": math.floor, "trunc": math.trunc,
        "gcd": math.gcd, "lcm": math.lcm,
    }

    def __init__(self, registry: ToolRegistry, cache_ttl: float = 300.0) -> None:
        self._registry = registry
        self._handlers: dict[str, Callable[..., Any]] = {}
        self._cache: OrderedDict[tuple[str, str], tuple[float, Any]] = OrderedDict()
        self._cache_ttl = cache_ttl
        self._lock = threading.Lock()

    def register_handler(self, tool_name: str, handler: Callable[..., Any]) -> None:
        self._handlers[tool_name] = handler

    def execute(
        self, tool_name: str, params: dict[str, Any] | None = None, *,
        use_cache: bool = True, max_retries: int = 2, backoff_base: float = 0.5,
    ) -> ToolExecutionResult:
        params = params or {}
        tool = self._registry.get(tool_name)
        errors = self._registry.validate_parameters(tool_name, params)
        if errors:
            return ToolExecutionResult(success=False, error="; ".join(errors))

        resolved = {p.name: params.get(p.name) if params.get(p.name) is not None else p.default for p in tool.parameters if p.name in params or p.default is not None}
        params_hash = hashlib.sha256(json.dumps(resolved, sort_keys=True, default=str).encode()).hexdigest()

        if use_cache:
            cached = self._cache_lookup(tool_name, params_hash)
            if cached is not None:
                return ToolExecutionResult(success=True, data=cached, execution_time_ms=0.0, cache_hit=True)

        handler = self._handlers.get(tool_name)
        if handler is None:
            return ToolExecutionResult(success=False, error=f"No handler registered for tool '{tool_name}'")

        last_error: Exception | None = None
        for attempt in range(max_retries + 1):
            try:
                start = time.perf_counter()
                result = self._run_with_timeout(handler, resolved, tool.timeout_seconds)
                elapsed = (time.perf_counter() - start) * 1000.0
                if use_cache:
                    self._cache_store(tool_name, params_hash, result)
                return ToolExecutionResult(success=True, data=result, execution_time_ms=elapsed)
            except ToolExecutionError as e:
                last_error = e
                if attempt < max_retries:
                    wait = backoff_base * (2 ** attempt)
                    logger.warning("Tool '%s' attempt %d/%d failed: %s. Retrying in %.1fs", tool_name, attempt + 1, max_retries, e, wait)
                    time.sleep(wait)
        return ToolExecutionResult(success=False, error=str(last_error))

    def execute_sandboxed(self, tool_name: str, params: dict[str, Any] | None = None) -> ToolExecutionResult:
        handler = self._handlers.get(tool_name)
        if handler is None:
            return ToolExecutionResult(success=False, error=f"No handler for '{tool_name}'")
        restricted = {"__builtins__": {
            "True": True, "False": False, "None": None, "abs": abs, "round": round,
            "min": min, "max": max, "len": len, "range": range, "enumerate": enumerate,
            "zip": zip, "map": map, "filter": filter, "int": int, "float": float,
            "str": str, "bool": bool, "list": list, "dict": dict, "tuple": tuple, "set": set,
            "print": print, "isinstance": isinstance, "type": type,
            "Exception": Exception, "ValueError": ValueError, "TypeError": TypeError,
        }}
        try:
            result = handler(params or {}, __sandbox_globals__=restricted)
            return ToolExecutionResult(success=True, data=result)
        except Exception as e:
            return ToolExecutionResult(success=False, error=str(e))

    def _run_with_timeout(self, handler: Callable[..., Any], params: dict[str, Any], timeout: float) -> Any:
        container: dict[str, Any] = {}
        exc: dict[str, Exception | None] = {"e": None}

        def _target() -> None:
            try:
                container["value"] = handler(params)
            except Exception as e:
                exc["e"] = e

        t = threading.Thread(target=_target, daemon=True)
        t.start()
        t.join(timeout=timeout)
        if t.is_alive():
            raise ToolExecutionError(f"Execution timed out after {timeout}s")
        if exc["e"] is not None:
            raise ToolExecutionError(str(exc["e"])) from exc["e"]
        return container["value"]

    def _cache_lookup(self, tool_name: str, ph: str) -> Any | None:
        key = (tool_name, ph)
        with self._lock:
            self._evict_expired()
            entry = self._cache.get(key)
            if entry is None:
                return None
            ts, val = entry
            if time.time() - ts > self._cache_ttl:
                del self._cache[key]
                return None
            return val

    def _cache_store(self, tool_name: str, ph: str, value: Any) -> None:
        with self._lock:
            self._cache[(tool_name, ph)] = (time.time(), value)
            self._evict_expired()

    def _evict_expired(self) -> None:
        now = time.time()
        expired = [k for k, (ts, _) in self._cache.items() if now - ts > self._cache_ttl]
        for k in expired:
            del self._cache[k]

    def invalidate_cache(self, tool_name: str | None = None) -> int:
        with self._lock:
            if tool_name is None:
                n = len(self._cache)
                self._cache.clear()
                return n
            to_remove = [k for k in self._cache if k[0] == tool_name]
            for k in to_remove:
                del self._cache[k]
            return len(to_remove)

    @staticmethod
    def safe_eval(expression: str) -> float:
        _OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv, ast.FloorDiv: operator.floordiv, ast.Mod: operator.mod, ast.Pow: operator.pow, ast.USub: operator.neg, ast.UAdd: operator.pos}
        _ALLOWED = {"abs", "round", "min", "max", "sqrt", "log", "log10", "log2", "exp", "sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "degrees", "radians", "ceil", "floor", "trunc"}

        def _eval(node: ast.AST) -> float:
            match node:
                case ast.Expression(body=b):
                    return _eval(b)
                case ast.Constant(value=v) if isinstance(v, (int, float)):
                    return float(v)
                case ast.BinOp(left=l, op=op, right=r) if type(op) in _OPS:
                    return _OPS[type(op)](_eval(l), _eval(r))
                case ast.UnaryOp(op=op, operand=o) if type(op) in _OPS:
                    return _OPS[type(op)](_eval(o))
                case ast.Call(func=ast.Name(id=fn), args=args) if fn in _ALLOWED and fn in ToolExecutor._SAFE_MATH:
                    return ToolExecutor._SAFE_MATH[fn](*[_eval(a) for a in args])
                case ast.Name(id=name) if name in ToolExecutor._SAFE_MATH and isinstance(ToolExecutor._SAFE_MATH[name], (int, float)):
                    return float(ToolExecutor._SAFE_MATH[name])
                case _:
                    raise ValueError(f"Unsupported: {type(node).__name__}")

        try:
            return _eval(ast.parse(expression, mode="eval"))
        except (SyntaxError, ValueError, ZeroDivisionError, OverflowError) as e:
            raise ToolExecutionError(f"Safe eval error: {e}") from e


# ==============================================================================
# Tool Chain
# ==============================================================================


class ChainStepStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class ChainStep:
    tool_name: str
    params: dict[str, Any] = field(default_factory=dict)
    output_key: str = ""
    depends_on: list[str] = field(default_factory=list)
    condition: Callable[[dict[str, Any]], bool] | None = None
    status: ChainStepStatus = ChainStepStatus.PENDING
    result: ToolExecutionResult | None = None
    pipe_from: str | None = None

    def __post_init__(self) -> None:
        if not self.output_key:
            self.output_key = self.tool_name


@dataclass
class ChainResult:
    steps: dict[str, ChainStep]
    final_output: Any = None
    success: bool = False
    execution_order: list[str] = field(default_factory=list)


class ToolChain:
    """工具链编排 - 串行管道、条件执行、并行调度"""

    def __init__(self, executor: ToolExecutor) -> None:
        self._executor = executor
        self._steps: dict[str, ChainStep] = OrderedDict()

    def add_step(self, step: ChainStep) -> ToolChain:
        if step.output_key in self._steps:
            raise ToolChainError(f"Duplicate output_key: {step.output_key}")
        self._steps[step.output_key] = step
        return self

    def add_sequential(self, tool_name: str, params: dict[str, Any] | None = None, *, output_key: str = "", pipe_from: str | None = None) -> ToolChain:
        deps = [pipe_from] if pipe_from else []
        if pipe_from and pipe_from not in self._steps:
            raise ToolChainError(f"pipe_from '{pipe_from}' references unknown step")
        return self.add_step(ChainStep(tool_name=tool_name, params=params or {}, output_key=output_key or tool_name, depends_on=deps, pipe_from=pipe_from))

    def add_conditional(self, tool_name: str, params: dict[str, Any] | None = None, *, output_key: str = "", depends_on: list[str] | None = None, condition: Callable[[dict[str, Any]], bool] | None = None) -> ToolChain:
        return self.add_step(ChainStep(tool_name=tool_name, params=params or {}, output_key=output_key or tool_name, depends_on=depends_on or [], condition=condition))

    def execute(self) -> ChainResult:
        order = self._topological_sort()
        smap: dict[str, ChainStep] = OrderedDict((k, self._steps[k]) for k in order)
        outputs: dict[str, Any] = {}

        for key in order:
            s = smap[key]
            if s.depends_on and any(smap[d].status == ChainStepStatus.FAILED for d in s.depends_on):
                s.status = ChainStepStatus.SKIPPED
                continue
            if s.condition is not None:
                try:
                    if not s.condition(outputs):
                        s.status = ChainStepStatus.SKIPPED
                        continue
                except Exception as e:
                    logger.warning("Condition check failed '%s': %s", key, e)
                    s.status = ChainStepStatus.SKIPPED
                    continue

            resolved = dict(s.params)
            if s.pipe_from and s.pipe_from in outputs:
                prev = outputs[s.pipe_from]
                if isinstance(prev, ToolExecutionResult):
                    prev = prev.data
                resolved["input"] = prev
            for dep in s.depends_on:
                if dep in outputs:
                    resolved[f"_{dep}_output"] = outputs[dep]

            s.status = ChainStepStatus.RUNNING
            s.result = self._executor.execute(s.tool_name, resolved)
            s.status = ChainStepStatus.COMPLETED if s.result.success else ChainStepStatus.FAILED
            outputs[key] = s.result.data if s.result.success else s.result

        ok = all(s.status in (ChainStepStatus.COMPLETED, ChainStepStatus.SKIPPED) for s in smap.values())
        final_keys = [k for k in order if smap[k].status == ChainStepStatus.COMPLETED]
        return ChainResult(steps=smap, final_output=outputs.get(final_keys[-1]) if final_keys else None, success=ok, execution_order=order)

    def execute_parallel(self, step_keys: list[str]) -> dict[str, ToolExecutionResult]:
        unknown = [k for k in step_keys if k not in self._steps]
        if unknown:
            raise ToolChainError(f"Unknown steps: {unknown}")
        results: dict[str, ToolExecutionResult] = {}
        lock = threading.Lock()
        ts = []

        def _run(k: str) -> None:
            r = self._executor.execute(self._steps[k].tool_name, self._steps[k].params)
            with lock:
                results[k] = r

        for k in step_keys:
            t = threading.Thread(target=_run, args=(k,), daemon=True)
            ts.append(t)
            t.start()
        for t in ts:
            t.join()
        return results

    def _topological_sort(self) -> list[str]:
        in_deg = {k: 0 for k in self._steps}
        adj: dict[str, list[str]] = {k: [] for k in self._steps}
        for key, s in self._steps.items():
            for dep in s.depends_on:
                if dep not in self._steps:
                    raise ToolChainError(f"Step '{key}' depends on unknown '{dep}'")
                adj[dep].append(key)
                in_deg[key] += 1
        queue = [k for k, d in in_deg.items() if d == 0]
        order: list[str] = []
        while queue:
            node = queue.pop(0)
            order.append(node)
            for nb in adj[node]:
                in_deg[nb] -= 1
                if in_deg[nb] == 0:
                    queue.append(nb)
        if len(order) != len(self._steps):
            raise ToolChainError("Tool chain has circular dependency")
        return order


# ==============================================================================
# Builtin Tools
# ==============================================================================


class BuiltinTools:
    """内置基础工具集"""

    # ---- Calculator ----
    @staticmethod
    def calculator(params: dict[str, Any]) -> dict[str, Any]:
        expr = params.get("expression", "")
        if not expr:
            raise ToolExecutionError("expression is required")
        return {"expression": expr, "result": ToolExecutor.safe_eval(expr)}

    @staticmethod
    def calculator_def() -> ToolDefinition:
        return ToolDefinition(name="calculator", description="Safely evaluate a mathematical expression", category=ToolCategory.CODE, parameters=[ToolParameter(name="expression", type="str", required=True, description="Mathematical expression to evaluate")], return_description="Computed numeric result", examples=["2 + 3 * 4", "sqrt(16) + sin(pi/2)", "log(100, 10)"], timeout_seconds=5.0)

    # ---- Web Search ----
    @staticmethod
    def web_search(params: dict[str, Any]) -> dict[str, Any]:
        query = params.get("query", "")
        engine = params.get("engine", "google")
        if not query:
            raise ToolExecutionError("query is required")
        bases = {"google": "https://www.google.com/search", "bing": "https://www.bing.com/search", "duckduckgo": "https://duckduckgo.com/", "baidu": "https://www.baidu.com/s"}
        search_url = f"{bases.get(engine, bases['google'])}?{urlencode({'q': query})}"
        return {"query": query, "engine": engine, "search_url": search_url, "note": "Placeholder search - implement actual search backend"}

    @staticmethod
    def web_search_def() -> ToolDefinition:
        return ToolDefinition(name="web_search", description="Search the web using a specified search engine", category=ToolCategory.SEARCH, parameters=[ToolParameter(name="query", type="str", required=True, description="Search query string"), ToolParameter(name="engine", type="enum", required=False, default="google", description="Search engine to use", enum_values=["google", "bing", "duckduckgo", "baidu"])], return_description="Search results with query URL", examples=['web_search(query="Python dataclasses", engine="google")'], timeout_seconds=15.0)

    # ---- File Read ----
    @staticmethod
    def file_read(params: dict[str, Any]) -> dict[str, Any]:
        path = params.get("path", "")
        encoding = params.get("encoding", "utf-8")
        if not path:
            raise ToolExecutionError("path is required")
        ws = os.environ.get("WORKSPACE", "/workspace")
        abs_path = os.path.abspath(os.path.join(ws, path))
        if not abs_path.startswith(os.path.abspath(ws)):
            raise ToolExecutionError(f"Access denied: path outside workspace: {path}")
        if not os.path.exists(abs_path):
            raise ToolExecutionError(f"File not found: {path}")
        try:
            with open(abs_path, encoding=encoding) as f:
                content = f.read(2000)
                truncated = len(content) >= 2000
                if truncated:
                    content += "\n... (truncated)"
        except UnicodeDecodeError:
            with open(abs_path, "rb") as f:
                content = repr(f.read(2000))
                truncated = True
        return {"path": path, "content": content, "size_bytes": os.path.getsize(abs_path), "truncated": truncated}

    @staticmethod
    def file_read_def() -> ToolDefinition:
        return ToolDefinition(name="file_read", description="Read content from a file within the workspace", category=ToolCategory.FILE, parameters=[ToolParameter(name="path", type="str", required=True, description="Relative path within workspace"), ToolParameter(name="encoding", type="str", required=False, default="utf-8", description="File encoding")], return_description="File content with metadata", examples=['file_read(path="src/main.py")'], timeout_seconds=10.0)

    # ---- File Write ----
    @staticmethod
    def file_write(params: dict[str, Any]) -> dict[str, Any]:
        path = params.get("path", "")
        content = params.get("content", "")
        if not path:
            raise ToolExecutionError("path is required")
        ws = os.environ.get("WORKSPACE", "/workspace")
        abs_path = os.path.abspath(os.path.join(ws, path))
        if not abs_path.startswith(os.path.abspath(ws)):
            raise ToolExecutionError(f"Access denied: path outside workspace: {path}")
        os.makedirs(os.path.dirname(abs_path) or ws, exist_ok=True)
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"path": path, "bytes_written": len(content.encode("utf-8")), "success": True}

    @staticmethod
    def file_write_def() -> ToolDefinition:
        return ToolDefinition(name="file_write", description="Write content to a file within the workspace", category=ToolCategory.FILE, parameters=[ToolParameter(name="path", type="str", required=True, description="Relative path within workspace"), ToolParameter(name="content", type="str", required=True, description="Content to write")], return_description="Write confirmation with byte count", examples=['file_write(path="output.txt", content="Hello World")'], timeout_seconds=10.0)

    # ---- Datetime ----
    @staticmethod
    def datetime_tool(params: dict[str, Any]) -> dict[str, Any]:
        op = params.get("operation", "now")
        fmt = params.get("format", "%Y-%m-%dT%H:%M:%S")
        tz = timezone(timedelta(hours=params.get("timezone_offset", 0)))
        now = datetime.now(tz)
        if op == "now":
            return {"operation": "now", "datetime": now.strftime(fmt), "iso": now.isoformat(), "timestamp": now.timestamp()}
        elif op == "format":
            src = params.get("source", "")
            dt = datetime.fromisoformat(src) if src else now
            return {"operation": "format", "formatted": dt.strftime(fmt)}
        elif op == "compare":
            d1 = params.get("datetime1", "")
            d2 = params.get("datetime2", "")
            if not d1 or not d2:
                raise ToolExecutionError("datetime1 and datetime2 required")
            dt1, dt2 = datetime.fromisoformat(d1), datetime.fromisoformat(d2)
            diff = dt2 - dt1
            return {"operation": "compare", "difference_seconds": diff.total_seconds(), "difference_human": str(diff), "is_before": dt1 < dt2}
        raise ToolExecutionError(f"Unknown operation: {op}")

    @staticmethod
    def datetime_def() -> ToolDefinition:
        return ToolDefinition(name="datetime", description="Get current time, format dates, or compare two datetimes", category=ToolCategory.SYSTEM, parameters=[ToolParameter(name="operation", type="enum", required=False, default="now", enum_values=["now", "format", "compare"], description="Operation type"), ToolParameter(name="format", type="str", required=False, default="%Y-%m-%dT%H:%M:%S", description="Output format string"), ToolParameter(name="timezone_offset", type="float", required=False, default=0.0, description="UTC offset in hours"), ToolParameter(name="source", type="str", required=False, default="", description="Source ISO string for format"), ToolParameter(name="datetime1", type="str", required=False, default="", description="First ISO string for compare"), ToolParameter(name="datetime2", type="str", required=False, default="", description="Second ISO string for compare")], return_description="Formatted datetime or comparison result", examples=['datetime(operation="now")', 'datetime(operation="compare", datetime1="2024-01-01T00:00:00", datetime2="2024-01-02T00:00:00")'], timeout_seconds=5.0)

    # ---- Text Processing ----
    @staticmethod
    def text_processing(params: dict[str, Any]) -> dict[str, Any]:
        text = params.get("text", "")
        op = params.get("operation", "summary")
        if not text:
            raise ToolExecutionError("text is required")
        if op == "summary":
            sentences = [s.strip() for s in re.split(r"[.!?。！？]+", text) if len(s.strip()) > 5]
            n = params.get("num_sentences", 3)
            sel = sentences[:n]
            smry = ". ".join(sel) + ("." if sel else "")
            return {"operation": "summary", "original_length": len(text), "summary_length": len(smry), "summary": smry, "num_sentences_used": len(sel)}
        elif op == "extract":
            et = params.get("extract_type", "emails")
            patterns = {"emails": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "urls": r"https?://[^\s]+", "numbers": r"-?\d+\.?\d*"}
            if et not in patterns:
                raise ToolExecutionError(f"Unknown extract_type: {et}")
            matches = re.findall(patterns[et], text)
            return {"operation": "extract", "extract_type": et, "matches": matches, "count": len(matches)}
        elif op == "count":
            ct = params.get("count_type", "chars")
            if ct == "chars":
                return {"operation": "count", "count_type": ct, "count": len(text), "count_no_spaces": len(text.replace(" ", ""))}
            elif ct == "words":
                return {"operation": "count", "count_type": ct, "count": len(text.split())}
            elif ct == "lines":
                return {"operation": "count", "count_type": ct, "count": len(text.splitlines())}
            raise ToolExecutionError(f"Unknown count_type: {ct}")
        raise ToolExecutionError(f"Unknown operation: {op}")

    @staticmethod
    def text_processing_def() -> ToolDefinition:
        return ToolDefinition(name="text_processing", description="Summarize, extract patterns, or count elements in text", category=ToolCategory.FILE, parameters=[ToolParameter(name="text", type="str", required=True, description="Input text to process"), ToolParameter(name="operation", type="enum", required=False, default="summary", enum_values=["summary", "extract", "count"], description="Operation type"), ToolParameter(name="num_sentences", type="int", required=False, default=3, description="Sentences for summary"), ToolParameter(name="extract_type", type="enum", required=False, default="emails", enum_values=["emails", "urls", "numbers"], description="Entity to extract"), ToolParameter(name="count_type", type="enum", required=False, default="chars", enum_values=["chars", "words", "lines"], description="What to count")], return_description="Processed text result", examples=['text_processing(text="Long article...", operation="summary", num_sentences=2)', 'text_processing(text="Contact: test@example.com", operation="extract", extract_type="emails")'], timeout_seconds=10.0)

    @classmethod
    def register_all(cls, registry: ToolRegistry) -> None:
        for name, dfn in [("calculator", cls.calculator_def()), ("web_search", cls.web_search_def()), ("file_read", cls.file_read_def()), ("file_write", cls.file_write_def()), ("datetime", cls.datetime_def()), ("text_processing", cls.text_processing_def())]:
            registry.register(dfn)


# ==============================================================================
# Theory Track: MDP + Thompson Sampling
# ==============================================================================


@dataclass
class ToolBandit:
    tool_name: str
    alpha: float = 1.0
    beta: float = 1.0
    total_selections: int = 0
    total_successes: int = 0
    avg_execution_ms: float = 0.0

    @property
    def success_rate(self) -> float:
        return self.total_successes / self.total_selections if self.total_selections > 0 else 0.0

    def update(self, success: bool, execution_ms: float = 0.0) -> None:
        self.total_selections += 1
        if success:
            self.total_successes += 1
            self.alpha += 1.0
        else:
            self.beta += 1.0
        n = self.total_selections
        self.avg_execution_ms = (self.avg_execution_ms * (n - 1) + execution_ms) / n


class ToolSelectionMDP:
    """
    工具选择的 MDP 建模（理论版）

    S_t: 上下文 (任务类型, 耗时预算, 历史成功率)
    A_t: 工具选择 (已注册的工具)
    R_t: 执行奖励 = success_weight * is_success - latency_penalty * elapsed

    使用 Thompson Sampling:
      theta_i ~ Beta(alpha_i, beta_i), 选择 argmax
    """

    def __init__(self, registry: ToolRegistry, epsilon: float = 0.1, success_weight: float = 10.0, latency_penalty: float = 0.01) -> None:
        self._registry = registry
        self._epsilon = epsilon
        self._success_weight = success_weight
        self._latency_penalty = latency_penalty
        self._arms: dict[str, ToolBandit] = {}
        self._lock = threading.Lock()
        for t in registry.list_all():
            self._arms[t.name] = ToolBandit(tool_name=t.name)

    def select_tool(self, candidates: list[str] | None = None) -> str:
        import random as _r
        cands = candidates or list(self._arms.keys())
        if not cands:
            raise ToolRegistryError("No candidates")
        with self._lock:
            if _r.random() < self._epsilon:
                return _r.choice(cands)
            best_tool, best_sample = cands[0], -float("inf")
            for name in cands:
                arm = self._arms.get(name)
                if arm is None:
                    continue
                sample = _r.betavariate(arm.alpha, arm.beta)
                if sample > best_sample:
                    best_sample, best_tool = sample, name
            return best_tool

    def record_result(self, tool_name: str, success: bool, execution_ms: float = 0.0) -> None:
        with self._lock:
            arm = self._arms.get(tool_name)
            if arm is None:
                arm = ToolBandit(tool_name=tool_name)
                self._arms[tool_name] = arm
            arm.update(success, execution_ms)

    def get_statistics(self) -> dict[str, dict[str, Any]]:
        stats: dict[str, dict[str, Any]] = {}
        with self._lock:
            for name, arm in self._arms.items():
                stats[name] = {"alpha": arm.alpha, "beta": arm.beta, "estimated_success_rate": arm.alpha / (arm.alpha + arm.beta), "empirical_success_rate": arm.success_rate, "total_selections": arm.total_selections, "total_successes": arm.total_successes, "avg_execution_ms": arm.avg_execution_ms}
        return stats

    def compute_expected_value(self, tool_name: str) -> float:
        with self._lock:
            arm = self._arms.get(tool_name)
            if arm is None or arm.total_selections == 0:
                return 0.0
            return self._success_weight * arm.alpha / (arm.alpha + arm.beta) - self._latency_penalty * arm.avg_execution_ms


# ==============================================================================
# Factory
# ==============================================================================


def create_default_registry() -> tuple[ToolRegistry, ToolExecutor]:
    registry = ToolRegistry()
    BuiltinTools.register_all(registry)
    executor = ToolExecutor(registry, cache_ttl=300.0)
    executor.register_handler("calculator", BuiltinTools.calculator)
    executor.register_handler("web_search", BuiltinTools.web_search)
    executor.register_handler("file_read", BuiltinTools.file_read)
    executor.register_handler("file_write", BuiltinTools.file_write)
    executor.register_handler("datetime", BuiltinTools.datetime_tool)
    executor.register_handler("text_processing", BuiltinTools.text_processing)
    return registry, executor
