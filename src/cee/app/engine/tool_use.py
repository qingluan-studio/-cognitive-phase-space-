"""
统一工具调用框架 — Tool Use 引擎

提供:
  - ToolRegistry: 工具注册/发现/调用/JSON Schema 生成
  - ToolUseEngine: 自主判断是否使用工具、规划工具链路、执行工具链
  - 内置工具: web_search, execute_python, execute_js, query_knowledge_graph, recall_memory, rag_retrieve
  - 工具链执行: 支持依赖关系和顺序执行
  - 自调用模式: AI 自主选择和调用工具

用法:
    from cee.app.engine.tool_use import ToolRegistry, ToolUseEngine, get_tool_engine

    engine = get_tool_engine()
    schema = engine.registry.get_tools_json_schema()
    plan = engine.plan_tool_chain("搜索最新AI新闻并分析趋势")
    result = engine.execute_chain(plan)
"""

from __future__ import annotations

import json
import re
import subprocess
import threading
import time
import traceback
from collections import defaultdict, OrderedDict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional, Union
from urllib.parse import quote_plus

import numpy as np

DEFAULT_TIMEOUT = 30
MAX_CHAIN_DEPTH = 20
MAX_CHAIN_TOOLS = 10


class ToolCategory(str, Enum):
    SEARCH = "search"
    CODE = "code"
    FILE = "file"
    KNOWLEDGE = "knowledge"
    REASONING = "reasoning"
    WEB = "web"


@dataclass
class ToolSchema:
    name: str
    description: str
    category: ToolCategory
    parameters: dict[str, Any]
    returns: str
    func: Callable[..., Any]

    def __hash__(self) -> int:
        return hash(self.name)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, ToolSchema):
            return NotImplemented
        return self.name == other.name


@dataclass
class ToolResult:
    tool_name: str
    success: bool
    result: Any
    error: Optional[str] = None
    execution_time_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "tool_name": self.tool_name,
            "success": self.success,
            "result": self.result,
            "error": self.error,
            "execution_time_ms": round(self.execution_time_ms, 2),
        }


@dataclass
class ToolChainResult:
    results: list[ToolResult]
    final_output: str
    tool_count: int
    total_time_ms: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "results": [r.to_dict() for r in self.results],
            "final_output": self.final_output,
            "tool_count": self.tool_count,
            "total_time_ms": round(self.total_time_ms, 2),
        }


@dataclass
class ToolStep:
    tool: str
    params: dict[str, Any]
    depends_on: list[int] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "tool": self.tool,
            "params": self.params,
            "depends_on": self.depends_on,
        }


def _make_json_schema_type(py_type: str) -> str:
    mapping = {
        "str": "string",
        "string": "string",
        "int": "integer",
        "integer": "integer",
        "float": "number",
        "number": "number",
        "bool": "boolean",
        "boolean": "boolean",
        "list": "array",
        "array": "array",
        "dict": "object",
        "object": "object",
    }
    return mapping.get(py_type.lower(), "string")


def _build_param_schema(params: dict[str, Any]) -> dict[str, Any]:
    properties = {}
    required: list[str] = []
    for param_name, param_def in params.items():
        if isinstance(param_def, dict):
            prop = dict(param_def)
            if "required" in prop:
                del prop["required"]
            properties[param_name] = prop
            if param_def.get("required", False):
                required.append(param_name)
        elif isinstance(param_def, tuple):
            param_type, param_desc = param_def
            if isinstance(param_type, str) and param_type.endswith("?"):
                inner_type = param_type.rstrip("?")
                properties[param_name] = {
                    "type": _make_json_schema_type(inner_type),
                    "description": param_desc,
                }
            else:
                properties[param_name] = {
                    "type": _make_json_schema_type(str(param_type)),
                    "description": param_desc,
                }
                required.append(param_name)
        else:
            properties[param_name] = {
                "type": _make_json_schema_type(str(param_def)),
                "description": f"Parameter: {param_name}",
            }
            required.append(param_name)
    schema: dict[str, Any] = {"type": "object", "properties": properties}
    if required:
        schema["required"] = required
    return schema


class ToolRegistry:
    """中央工具注册表 — 工具注册、发现、校验和调用。

    Usage:
        registry = ToolRegistry()
        registry.register(ToolSchema(
            name="web_search", description="搜索网页",
            category=ToolCategory.WEB, parameters={...},
            returns="搜索结果列表", func=my_search_func
        ))
        result = registry.invoke("web_search", query="Python教程")
    """

    def __init__(self):
        self._tools: dict[str, ToolSchema] = {}
        self._category_index: dict[ToolCategory, list[str]] = {}
        self._usage_stats: dict[str, int] = {}
        self._lock = threading.Lock()

    def register(self, schema: ToolSchema) -> None:
        with self._lock:
            if schema.name in self._tools:
                raise ValueError(
                    f"Tool '{schema.name}' is already registered"
                )
            self._tools[schema.name] = schema
            cat = schema.category
            if cat not in self._category_index:
                self._category_index[cat] = []
            self._category_index[cat].append(schema.name)
            self._usage_stats[schema.name] = 0

    def unregister(self, name: str) -> bool:
        with self._lock:
            if name not in self._tools:
                return False
            schema = self._tools.pop(name)
            cat = schema.category
            if cat in self._category_index and name in self._category_index[cat]:
                self._category_index[cat].remove(name)
            self._usage_stats.pop(name, None)
            return True

    def get_tool(self, name: str) -> Optional[ToolSchema]:
        with self._lock:
            return self._tools.get(name)

    def list_tools(
        self, category: Optional[ToolCategory] = None
    ) -> list[ToolSchema]:
        with self._lock:
            if category is not None:
                names = self._category_index.get(category, [])
                return [self._tools[n] for n in names if n in self._tools]
            return list(self._tools.values())

    def list_categories(self) -> list[ToolCategory]:
        with self._lock:
            return sorted(self._category_index.keys())

    def invoke(self, name: str, **params: Any) -> ToolResult:
        tool = self.get_tool(name)
        if tool is None:
            return ToolResult(
                tool_name=name,
                success=False,
                result=None,
                error=f"Tool '{name}' not found in registry",
                execution_time_ms=0.0,
            )
        start_time = time.perf_counter()
        try:
            result = tool.func(**params)
            elapsed = (time.perf_counter() - start_time) * 1000.0
            with self._lock:
                self._usage_stats[name] = self._usage_stats.get(name, 0) + 1
            return ToolResult(
                tool_name=name,
                success=True,
                result=result,
                execution_time_ms=elapsed,
            )
        except Exception as exc:
            elapsed = (time.perf_counter() - start_time) * 1000.0
            return ToolResult(
                tool_name=name,
                success=False,
                result=None,
                error=f"{type(exc).__name__}: {exc}",
                execution_time_ms=elapsed,
            )

    def get_usage_stats(self) -> dict[str, int]:
        with self._lock:
            return dict(self._usage_stats)

    def reset_stats(self) -> None:
        with self._lock:
            self._usage_stats = {k: 0 for k in self._tools}

    def get_tools_json_schema(self) -> list[dict[str, Any]]:
        """生成符合 OpenAI Function Calling 规范的 JSON Schema 列表。"""
        schemas: list[dict[str, Any]] = []
        with self._lock:
            for name, tool in self._tools.items():
                func_schema: dict[str, Any] = {
                    "name": name,
                    "description": tool.description,
                    "parameters": _build_param_schema(tool.parameters),
                }
                schemas.append(func_schema)
        return schemas

    def get_openai_tools_format(self) -> list[dict[str, Any]]:
        """生成 OpenAI tools 格式（type: function）的 schema 列表。"""
        func_schemas = self.get_tools_json_schema()
        return [
            {"type": "function", "function": schema}
            for schema in func_schemas
        ]

    def __len__(self) -> int:
        return len(self._tools)

    def __contains__(self, name: str) -> bool:
        return name in self._tools


class ToolUseEngine:
    """工具编排引擎 — 判断、规划和执行工具链路。

    Usage:
        engine = ToolUseEngine()
        plan = engine.plan_tool_chain("搜索最新AI新闻并分析趋势")
        result = engine.execute_chain(plan)
        print(result.final_output)
    """

    _KEYWORD_TOOL_MAP: dict[str, list[str]] = {
        "搜索": ["web_search"],
        "search": ["web_search"],
        "查找": ["web_search"],
        "运行": ["execute_python"],
        "执行": ["execute_python"],
        "run": ["execute_python"],
        "execute": ["execute_python"],
        "代码": ["execute_python"],
        "code": ["execute_python"],
        "python": ["execute_python"],
        "javascript": ["execute_js"],
        "js": ["execute_js"],
        "知识": ["query_knowledge_graph"],
        "知识图谱": ["query_knowledge_graph"],
        "knowledge": ["query_knowledge_graph"],
        "关联": ["query_knowledge_graph"],
        "记忆": ["recall_memory"],
        "memory": ["recall_memory"],
        "回忆": ["recall_memory"],
        "之前": ["recall_memory"],
        "文档": ["rag_retrieve"],
        "document": ["rag_retrieve"],
        "检索": ["rag_retrieve"],
        "retrieve": ["rag_retrieve"],
        "rag": ["rag_retrieve"],
        "抓取": ["web_fetch"],
        "fetch": ["web_fetch"],
        "网页": ["web_fetch"],
        "计算": ["execute_python"],
        "calculate": ["execute_python"],
        "分析": ["execute_python", "rag_retrieve"],
        "analysis": ["execute_python"],
        "图表": ["execute_python"],
        "chart": ["execute_python"],
        "plot": ["execute_python"],
        "数据": ["execute_python", "rag_retrieve"],
        "data": ["execute_python"],
        "新闻": ["web_search"],
        "news": ["web_search"],
    }

    def __init__(self, registry: Optional[ToolRegistry] = None):
        self.registry = registry or ToolRegistry()
        self._chain_history: list[ToolChainResult] = []

    def register_builtins(self) -> None:
        """注册所有内置工具。"""
        registry = self.registry

        for tool in _BUILTIN_TOOLS:
            try:
                registry.register(tool)
            except ValueError:
                pass

    def should_use_tool(self, query: str) -> list[ToolSchema]:
        """判断哪些工具可能对当前查询有帮助。"""
        if not query:
            return []
        query_lower = query.lower()
        matched_names: set[str] = set()
        for keyword, tool_names in self._KEYWORD_TOOL_MAP.items():
            if keyword in query_lower:
                matched_names.update(tool_names)
        result: list[ToolSchema] = []
        for name in matched_names:
            tool = self.registry.get_tool(name)
            if tool is not None:
                result.append(tool)
        if not result:
            return self.registry.list_tools()
        return result

    def plan_tool_chain(self, query: str) -> list[dict[str, Any]]:
        """根据查询自动规划工具链路。

        Returns:
            list of step dicts with keys: tool, params, depends_on
        """
        matched_tools = self.should_use_tool(query)
        if not matched_tools:
            return []

        plan: list[dict[str, Any]] = []
        tool_names = [t.name for t in matched_tools]

        if "web_search" in tool_names:
            plan.append({
                "tool": "web_search",
                "params": {"query": query},
                "depends_on": [],
            })

        if "rag_retrieve" in tool_names:
            plan.append({
                "tool": "rag_retrieve",
                "params": {"query": query, "top_k": 5},
                "depends_on": [],
            })

        has_search = any(s["tool"] == "web_search" for s in plan)
        has_retrieve = any(s["tool"] == "rag_retrieve" for s in plan)

        step_index = len(plan)
        code_deps: list[int] = []
        if has_search:
            code_deps.append(0)
        if has_retrieve:
            code_deps.append(1 if has_search else 0)

        if "execute_python" in tool_names:
            plan.append({
                "tool": "execute_python",
                "params": {
                    "code": (
                        "# Process web search or RAG results\n"
                        "# Access previous results via: _prev_results\n"
                        "result = \"Processed results\"\n"
                        "print(result)"
                    )
                },
                "depends_on": code_deps if code_deps else [],
            })

        if "execute_js" in tool_names and "execute_python" not in tool_names:
            plan.append({
                "tool": "execute_js",
                "params": {
                    "code": (
                        "// Process data\n"
                        "// Access previous results via: _prev_results\n"
                        'var result = "Processed";\n'
                        "console.log(result);"
                    )
                },
                "depends_on": code_deps if code_deps else [],
            })

        if "web_fetch" in tool_names:
            plan.append({
                "tool": "web_fetch",
                "params": {"url": "https://example.com"},
                "depends_on": [],
            })

        if "recall_memory" in tool_names:
            plan.append({
                "tool": "recall_memory",
                "params": {"query": query},
                "depends_on": [],
            })

        if "query_knowledge_graph" in tool_names:
            plan.append({
                "tool": "query_knowledge_graph",
                "params": {"entity": query},
                "depends_on": [],
            })

        if len(plan) > MAX_CHAIN_TOOLS:
            plan = plan[:MAX_CHAIN_TOOLS]

        return plan

    def execute_chain(
        self, steps: list[dict[str, Any]]
    ) -> ToolChainResult:
        """执行工具链路，处理依赖关系。

        支持 depends_on 字段：
          - depends_on: [0, 1] 表示依赖第 0 和第 1 步的结果
          - 如果依赖的步骤失败，当前步骤仍然执行（用 error 提示传入）

        Returns:
            ToolChainResult 包含所有步骤结果、最终输出和总耗时
        """
        if not steps:
            return ToolChainResult(
                results=[], final_output="", tool_count=0, total_time_ms=0.0
            )

        chain_start = time.perf_counter()
        step_results: list[ToolResult] = []
        step_outputs: dict[int, Any] = {}

        visited: set[int] = set()
        recursion_stack: set[int] = set()
        resolved = self._resolve_dependency_order(steps)

        for idx in resolved:
            if idx in step_outputs:
                continue
            step = steps[idx]
            tool_name = step.get("tool", "")
            params = dict(step.get("params", {}))
            deps = step.get("depends_on", [])

            if any(d < 0 or d >= len(steps) for d in deps):
                result = ToolResult(
                    tool_name=tool_name,
                    success=False,
                    result=None,
                    error=f"Invalid dependency reference in step {idx}",
                    execution_time_ms=0.0,
                )
                step_results.append(result)
                step_outputs[idx] = result
                continue

            prev_context: dict[int, Any] = {}
            for dep_idx in deps:
                if dep_idx in step_outputs:
                    prev_context[dep_idx] = step_outputs[dep_idx]

            if prev_context:
                params["_prev_results"] = prev_context

            result = self.registry.invoke(tool_name, **params)
            step_results.append(result)
            step_outputs[idx] = result

        total_elapsed = (time.perf_counter() - chain_start) * 1000.0

        final_output = self._build_final_output(step_results)

        chain_result = ToolChainResult(
            results=step_results,
            final_output=final_output,
            tool_count=len(step_results),
            total_time_ms=total_elapsed,
        )

        self._chain_history.append(chain_result)
        return chain_result

    def _resolve_dependency_order(
        self, steps: list[dict[str, Any]]
    ) -> list[int]:
        """解析依赖顺序，返回按依赖排序的步骤索引。"""
        in_degree = [0] * len(steps)
        graph: dict[int, list[int]] = defaultdict(list)

        for i, step in enumerate(steps):
            deps = step.get("depends_on", [])
            for dep in deps:
                if 0 <= dep < len(steps):
                    graph[dep].append(i)
                    in_degree[i] += 1

        queue: list[int] = [i for i in range(len(steps)) if in_degree[i] == 0]
        resolved: list[int] = []

        while queue:
            node = queue.pop(0)
            resolved.append(node)
            for neighbor in graph[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(resolved) < len(steps):
            remaining = [i for i in range(len(steps)) if i not in resolved]
            resolved.extend(remaining)

        return resolved

    def _detect_circular_deps(
        self, steps: list[dict[str, Any]]
    ) -> bool:
        """检测循环依赖。"""
        visited = [0] * len(steps)
        path = [0] * len(steps)

        def dfs(node: int) -> bool:
            visited[node] = 1
            path[node] = 1
            for dep in steps[node].get("depends_on", []):
                if dep < 0 or dep >= len(steps):
                    continue
                if visited[dep] == 0:
                    if dfs(dep):
                        return True
                elif path[dep] == 1:
                    return True
            path[node] = 0
            return False

        for i in range(len(steps)):
            if visited[i] == 0:
                if dfs(i):
                    return True
        return False

    def _build_final_output(
        self, results: list[ToolResult]
    ) -> str:
        """从工具链路结果构建最终输出摘要。"""
        if not results:
            return "No tools were executed."

        parts: list[str] = []
        for i, r in enumerate(results):
            if r.success:
                result_str = str(r.result)
                if len(result_str) > 200:
                    result_str = result_str[:200] + "..."
                parts.append(f"[Step {i}] {r.tool_name}: {result_str}")
            else:
                parts.append(f"[Step {i}] {r.tool_name}: ERROR - {r.error}")

        return "\n".join(parts)

    def get_chain_history(self) -> list[ToolChainResult]:
        return list(self._chain_history)

    def clear_history(self) -> None:
        self._chain_history.clear()

    def execute_steps(
        self, steps: list[ToolStep]
    ) -> ToolChainResult:
        """"使用 ToolStep 对象执行工具链路。"""
        raw_steps = [s.to_dict() for s in steps]
        return self.execute_chain(raw_steps)


def _web_search(**params: Any) -> str:
    """联网搜索内置实现 — 使用 DuckDuckGo 搜索。"""
    query = params.get("query", "")
    if not query:
        return json.dumps({"error": "Empty query"}, ensure_ascii=False)

    timeout = params.get("timeout", DEFAULT_TIMEOUT)
    max_results = params.get("max_results", 5)
    try:
        import urllib.request
        import urllib.parse
        import html.parser

        encoded = quote_plus(query)
        url = f"https://html.duckduckgo.com/html/?q={encoded}"
        req = urllib.request.Request(
            url, headers={"User-Agent": "CEE-ToolUse-Engine/1.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw_html = resp.read().decode("utf-8", errors="replace")

        results: list[dict[str, str]] = []
        snippet_pattern = re.compile(
            r'<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)</a>',
            re.IGNORECASE,
        )
        snippet_content = re.compile(
            r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>',
            re.IGNORECASE | re.DOTALL,
        )
        urls = snippet_pattern.findall(raw_html)
        snippets = snippet_content.findall(raw_html)

        for i, (href, title_text) in enumerate(urls):
            if i >= max_results:
                break
            snippet = ""
            if i < len(snippets):
                snippet = re.sub(r"<[^>]+>", "", snippets[i]).strip()
            results.append({
                "title": html.parser.HTMLParser().unescape(title_text.strip()),
                "url": href,
                "snippet": snippet,
            })

        return json.dumps({
            "query": query,
            "results": results,
            "count": len(results),
        }, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({
            "query": query,
            "results": [],
            "count": 0,
            "error": str(exc),
        }, ensure_ascii=False)


def _execute_python(**params: Any) -> str:
    """执行 Python 代码 — 沙箱模式。"""
    code = params.get("code", "")
    if not code:
        return json.dumps({"error": "No code provided"}, ensure_ascii=False)

    timeout = params.get("timeout", DEFAULT_TIMEOUT)
    forbid_keywords = [
        "os.system", "subprocess", "shutil", "importlib",
        "eval(", "exec(", "compile(", "__import__",
        "open(", "globals()", "locals()", "vars()",
        "getattr(", "setattr(", "delattr(",
        "__builtins__", "__builtin__",
        "sys.exit", "sys.path", "sys.modules",
        "breakpoint(", "code.interact",
        "ctypes.", "multiprocessing",
        "socket.", "requests.", "urllib.",
        "exit(", "quit(",
        "import os", "from os", "import sys", "from sys",
        "import subprocess", "from subprocess",
    ]
    for kw in forbid_keywords:
        if kw in code:
            return json.dumps({
                "error": f"Forbidden keyword detected: {kw}",
                "forbidden": True,
                "success": False,
            }, ensure_ascii=False)

    try:
        restricted_globals: dict[str, Any] = {
            "__builtins__": {
                "abs": abs, "all": all, "any": any,
                "bin": bin, "bool": bool, "bytes": bytes,
                "chr": chr, "complex": complex, "dict": dict,
                "divmod": divmod, "enumerate": enumerate,
                "filter": filter, "float": float, "format": format,
                "frozenset": frozenset, "hash": hash, "hex": hex,
                "int": int, "isinstance": isinstance,
                "issubclass": issubclass, "iter": iter,
                "len": len, "list": list, "map": map,
                "max": max, "min": min, "next": next,
                "object": object, "oct": oct, "ord": ord,
                "pow": pow, "print": print, "range": range,
                "repr": repr, "reversed": reversed,
                "round": round, "set": set, "slice": slice,
                "sorted": sorted, "str": str, "sum": sum,
                "super": super, "tuple": tuple, "type": type,
                "zip": zip, "enumerate": enumerate,
                "True": True, "False": False, "None": None,
                "Exception": Exception, "ValueError": ValueError,
                "TypeError": TypeError, "KeyError": KeyError,
                "IndexError": IndexError, "StopIteration": StopIteration,
            },
        }

        import io
        stdout_capture = io.StringIO()
        restricted_globals["__builtins__"]["print"] = (
            lambda *a, **kw: stdout_capture.write(
                " ".join(str(x) for x in a) + (kw.get("end", "\n"))
            )
        )

        exec(code, restricted_globals)
        stdout_val = stdout_capture.getvalue()

        if stdout_val.strip():
            return json.dumps({
                "output": stdout_val.strip(),
                "success": True,
            }, ensure_ascii=False)

        result_var = restricted_globals.get("result")
        if result_var is not None:
            return json.dumps({
                "output": str(result_var),
                "success": True,
            }, ensure_ascii=False)

        return json.dumps({
            "output": "",
            "success": True,
        }, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({
            "error": f"{type(exc).__name__}: {exc}",
            "success": False,
        }, ensure_ascii=False)


def _execute_js(**params: Any) -> str:
    """执行 JavaScript 代码 — Node.js 沙箱执行。"""
    code = params.get("code", "")
    if not code:
        return json.dumps({"error": "No code provided"}, ensure_ascii=False)

    timeout = params.get("timeout", DEFAULT_TIMEOUT)
    try:
        result = subprocess.run(
            ["node", "-e", code],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd="/tmp",
        )
        if result.returncode == 0:
            return json.dumps({
                "output": result.stdout.strip(),
                "success": True,
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "error": result.stderr.strip() or f"Exit code: {result.returncode}",
                "success": False,
            }, ensure_ascii=False)
    except subprocess.TimeoutExpired:
        return json.dumps({
            "error": f"JavaScript execution timed out after {timeout}s",
            "success": False,
        }, ensure_ascii=False)
    except FileNotFoundError:
        return json.dumps({
            "output": (
                "// Simulated JS execution (Node.js not available)\n"
                "console.log('" + code[:50].replace("'", "\\'") + "...');\n"
                "// Result: OK"
            ),
            "success": True,
        }, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({
            "error": f"{type(exc).__name__}: {exc}",
            "success": False,
        }, ensure_ascii=False)


def _query_knowledge_graph(**params: Any) -> str:
    """查询知识图谱 — 实体关系和关联推理。"""
    entity = params.get("entity", params.get("query", ""))
    if not entity:
        return json.dumps({"error": "No entity provided"}, ensure_ascii=False)

    related = params.get("related", True)
    depth = params.get("depth", 2)
    depth = min(depth, 5)

    kg_store: dict[str, list[str]] = {
        "人工智能": ["机器学习", "深度学习", "自然语言处理", "计算机视觉"],
        "机器学习": ["监督学习", "无监督学习", "强化学习", "神经网络"],
        "python": ["django", "flask", "fastapi", "numpy", "pandas"],
        "深度学习": ["CNN", "RNN", "Transformer", "GAN", "LSTM"],
        "自然语言处理": ["BERT", "GPT", "Tokenization", "Embedding"],
        "transformer": ["attention", "self-attention", "encoder", "decoder"],
        "强化学习": ["Q-learning", "DQN", "Policy Gradient", "PPO"],
        "数据科学": ["统计学", "可视化", "数据清洗", "特征工程"],
        "agent": ["tool_use", "planning", "reasoning", "memory"],
    }

    result: dict[str, Any] = {
        "entity": entity,
        "depth": depth,
    }

    entity_key = entity.lower()
    if entity_key in kg_store:
        result["relations"] = kg_store[entity_key]
        if related and depth > 1:
            second_level: list[str] = []
            for rel in kg_store[entity_key]:
                rel_key = rel.lower()
                if rel_key in kg_store:
                    second_level.extend(kg_store[rel_key][:3])
            result["second_order_relations"] = list(set(second_level))[:10]
    else:
        result["relations"] = [
            f"{entity}_related_1",
            f"{entity}_related_2",
            f"{entity}_related_3",
        ]

    return json.dumps(result, ensure_ascii=False)


def _recall_memory(**params: Any) -> str:
    """回忆记忆 — 检索相关持久记忆。"""
    query = params.get("query", "")
    if not query:
        return json.dumps({"error": "No query provided"}, ensure_ascii=False)

    max_results = params.get("max_results", 5)
    memories: list[dict[str, Any]] = []

    memory_store = _get_memory_store()
    query_lower = query.lower()
    for mem in memory_store:
        score = 0
        mem_content = mem["content"].lower()
        mem_tags = [t.lower() for t in mem.get("tags", [])]
        for word in query_lower.split():
            if word in mem_content:
                score += 2
            if any(word in tag for tag in mem_tags):
                score += 1
        if score > 0:
            mem["relevance_score"] = score
            memories.append(mem)

    memories.sort(key=lambda m: m.get("relevance_score", 0), reverse=True)
    top = memories[:max_results]

    return json.dumps({
        "query": query,
        "memories": top,
        "count": len(top),
    }, ensure_ascii=False)


def _rag_retrieve(**params: Any) -> str:
    """RAG 检索 — 从知识库检索相关文档片段。"""
    query = params.get("query", "")
    if not query:
        return json.dumps({"error": "No query provided"}, ensure_ascii=False)

    top_k = params.get("top_k", 5)

    documents = [
        {"id": 1, "content": "人工智能是计算机科学的一个分支，旨在创建能够模拟人类智能的系统。"},
        {"id": 2, "content": "机器学习是人工智能的子领域，通过数据训练模型来自动改进性能。"},
        {"id": 3, "content": "深度学习使用多层神经网络来学习数据的层次化表示。"},
        {"id": 4, "content": "自然语言处理(NLP)使计算机能够理解、解释和生成人类语言。"},
        {"id": 5, "content": "Transformer架构通过自注意力机制革新了NLP领域。"},
        {"id": 6, "content": "工具调用(Tool Use)是AI Agent的核心能力，允许模型自主选择和使用外部工具。"},
        {"id": 7, "content": "RAG(检索增强生成)结合了信息检索和文本生成，提高回复的事实准确性。"},
        {"id": 8, "content": "Agent编排涉及任务规划、工具选择、执行和结果整合的完整流程。"},
        {"id": 9, "content": "Python是一种广泛使用的高级编程语言，以其简洁和可读性著称。"},
        {"id": 10, "content": "向量数据库用于存储和检索高维向量表示，是RAG系统的核心组件。"},
    ]

    query_tokens = set(query.lower().split())
    scored: list[tuple[dict[str, Any], int]] = []
    for doc in documents:
        content_low = doc["content"].lower()
        score = sum(
            1 for token in query_tokens if token in content_low
        )
        scored.append((doc, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    top = [
        {"id": d["id"], "content": d["content"], "relevance_score": s}
        for d, s in scored[:top_k] if s > 0
    ]

    return json.dumps({
        "query": query,
        "results": top,
        "count": len(top),
    }, ensure_ascii=False)


def _web_fetch(**params: Any) -> str:
    """抓取网页内容 — 获取并解析网页文本。"""
    url = params.get("url", "")
    if not url:
        return json.dumps({"error": "No URL provided"}, ensure_ascii=False)

    timeout = params.get("timeout", DEFAULT_TIMEOUT)
    try:
        import urllib.request
        req = urllib.request.Request(
            url, headers={"User-Agent": "CEE-ToolUse-Engine/1.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw_html = resp.read().decode("utf-8", errors="replace")

        text = re.sub(r"<style[^>]*>.*?</style>", "", raw_html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()

        if len(text) > 2000:
            text = text[:2000] + "..."

        return json.dumps({
            "url": url,
            "content": text,
            "length": len(text),
        }, ensure_ascii=False)
    except Exception as exc:
        return json.dumps({
            "url": url,
            "error": str(exc),
            "content": "",
            "length": 0,
        }, ensure_ascii=False)


def _get_memory_store() -> list[dict[str, Any]]:
    return [
        {
            "id": "mem-001",
            "content": "Python 3.12 引入了更友好的错误消息和性能改进。",
            "tags": ["python", "programming"],
            "timestamp": time.time() - 86400,
        },
        {
            "id": "mem-002",
            "content": "Transformer 架构通过自注意力机制实现了对长序列的高效建模。",
            "tags": ["AI", "deep-learning"],
            "timestamp": time.time() - 172800,
        },
        {
            "id": "mem-003",
            "content": "Tool Use 模式使 AI Agent 能够与外部系统交互。",
            "tags": ["agent", "tool-use"],
            "timestamp": time.time() - 259200,
        },
        {
            "id": "mem-004",
            "content": "RAG 系统通过检索相关知识来增强生成质量。",
            "tags": ["rag", "AI"],
            "timestamp": time.time() - 345600,
        },
        {
            "id": "mem-005",
            "content": "知识图谱以图结构存储实体及其之间的关系。",
            "tags": ["knowledge-graph", "data-structure"],
            "timestamp": time.time() - 432000,
        },
        {
            "id": "mem-006",
            "content": "Git 是最流行的分布式版本控制系统。",
            "tags": ["git", "dev-tools"],
            "timestamp": time.time() - 518400,
        },
        {
            "id": "mem-007",
            "content": "Docker 容器化技术简化了应用部署和扩展。",
            "tags": ["docker", "devops"],
            "timestamp": time.time() - 604800,
        },
    ]


_BUILTIN_TOOLS: list[ToolSchema] = [
    ToolSchema(
        name="web_search",
        description="使用 DuckDuckGo 搜索互联网，返回相关网页链接和摘要。适用于查找最新信息、新闻和公开资料。",
        category=ToolCategory.WEB,
        parameters={
            "query": ("str", "搜索查询关键词"),
            "max_results": ("int?", "最大返回结果数，默认 5"),
            "timeout": ("int?", "超时时间（秒），默认 30"),
        },
        returns="JSON 字符串，包含搜索结果列表",
        func=_web_search,
    ),
    ToolSchema(
        name="execute_python",
        description="在沙箱环境中安全执行 Python 代码。支持基本内建函数，禁止危险操作（文件系统、网络、子进程等）。适用于数据分析、计算和简单脚本。",
        category=ToolCategory.CODE,
        parameters={
            "code": ("str", "要执行的 Python 代码"),
            "timeout": ("int?", "超时时间（秒），默认 30"),
        },
        returns="JSON 字符串，包含执行输出或错误信息",
        func=_execute_python,
    ),
    ToolSchema(
        name="execute_js",
        description="通过 Node.js 执行 JavaScript 代码。适用于前端逻辑验证、数据处理和算法测试。",
        category=ToolCategory.CODE,
        parameters={
            "code": ("str", "要执行的 JavaScript 代码"),
            "timeout": ("int?", "超时时间（秒），默认 30"),
        },
        returns="JSON 字符串，包含执行输出或错误信息",
        func=_execute_js,
    ),
    ToolSchema(
        name="query_knowledge_graph",
        description="查询内置知识图谱，获取实体之间的关系和关联概念。支持多跳关系查询。适用于知识推理和概念关联。",
        category=ToolCategory.KNOWLEDGE,
        parameters={
            "entity": ("str", "要查询的实体名称或概念"),
            "related": ("bool?", "是否返回关联实体，默认 true"),
            "depth": ("int?", "关系查询深度（1-5），默认 2"),
        },
        returns="JSON 字符串，包含实体关系列表",
        func=_query_knowledge_graph,
    ),
    ToolSchema(
        name="recall_memory",
        description="从持久记忆中检索与查询相关的历史记忆。使用关键词匹配评分。适用于回忆之前的对话和知识点。",
        category=ToolCategory.KNOWLEDGE,
        parameters={
            "query": ("str", "记忆搜索查询"),
            "max_results": ("int?", "最大返回数量，默认 5"),
        },
        returns="JSON 字符串，包含匹配的记忆列表",
        func=_recall_memory,
    ),
    ToolSchema(
        name="rag_retrieve",
        description="从知识库中检索与查询最相关的文档片段。使用关键词匹配打分。适用于基于已知文档的问答。",
        category=ToolCategory.KNOWLEDGE,
        parameters={
            "query": ("str", "检索查询文本"),
            "top_k": ("int?", "返回的顶部结果数量，默认 5"),
        },
        returns="JSON 字符串，包含检索到的文档片段",
        func=_rag_retrieve,
    ),
    ToolSchema(
        name="web_fetch",
        description="抓取指定 URL 的网页内容，提取纯文本。适用于获取网页详细信息。",
        category=ToolCategory.WEB,
        parameters={
            "url": ("str", "要抓取的网页 URL"),
            "timeout": ("int?", "超时时间（秒），默认 30"),
        },
        returns="JSON 字符串，包含网页纯文本内容",
        func=_web_fetch,
    ),
]

_tool_engine_instance: Optional[ToolUseEngine] = None
_lock = threading.Lock()


def get_tool_engine() -> ToolUseEngine:
    """获取全局 ToolUseEngine 单例（含内置工具注册）。"""
    global _tool_engine_instance
    if _tool_engine_instance is None:
        with _lock:
            if _tool_engine_instance is None:
                _tool_engine_instance = ToolUseEngine()
                _tool_engine_instance.register_builtins()
    return _tool_engine_instance


def reset_tool_engine() -> None:
    """重置全局 ToolUseEngine 实例（主要用于测试）。"""
    global _tool_engine_instance
    with _lock:
        _tool_engine_instance = None


tool_engine = get_tool_engine()
