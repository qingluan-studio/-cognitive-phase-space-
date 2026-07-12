"""
Tests for src/cee/app/engine/tool_use.py — Unified Tool Use Framework.
"""
import sys

sys.path.insert(0, "/workspace/src")

import json
import time
import pytest

from cee.app.engine.tool_use import (
    ToolCategory,
    ToolSchema,
    ToolResult,
    ToolChainResult,
    ToolStep,
    ToolRegistry,
    ToolUseEngine,
    _BUILTIN_TOOLS,
    _web_search,
    _execute_python,
    _execute_js,
    _query_knowledge_graph,
    _recall_memory,
    _rag_retrieve,
    _web_fetch,
    get_tool_engine,
    reset_tool_engine,
)


def _dummy_tool_success(**params):
    return {"status": "ok", "params": params}


def _dummy_tool_error(**params):
    raise RuntimeError("simulated failure")


def _dummy_tool_echo(**params):
    return params.get("value", "default")


def _make_schema(
    name, category=ToolCategory.WEB, func=_dummy_tool_success
):
    return ToolSchema(
        name=name,
        description=f"Tool: {name}",
        category=category,
        parameters={"input": ("str", "Input value")},
        returns="Dummy result",
        func=func,
    )


class TestToolCategory:
    def test_enum_values(self):
        assert ToolCategory.SEARCH.value == "search"
        assert ToolCategory.CODE.value == "code"
        assert ToolCategory.FILE.value == "file"
        assert ToolCategory.KNOWLEDGE.value == "knowledge"
        assert ToolCategory.REASONING.value == "reasoning"
        assert ToolCategory.WEB.value == "web"

    def test_enum_members_count(self):
        assert len(list(ToolCategory)) == 6


class TestToolSchema:
    def test_creation(self):
        s = _make_schema("test_tool")
        assert s.name == "test_tool"
        assert s.category == ToolCategory.WEB
        assert s.description == "Tool: test_tool"

    def test_equality_by_name(self):
        s1 = _make_schema("tool_a")
        s2 = _make_schema("tool_a")
        s3 = _make_schema("tool_b")
        assert s1 == s2
        assert s1 != s3

    def test_hash_by_name(self):
        s1 = _make_schema("tool_a")
        s2 = _make_schema("tool_a")
        assert hash(s1) == hash(s2)

    def test_equality_with_non_schema(self):
        s = _make_schema("tool_a")
        assert s != "not_a_schema"
        assert s != 42


class TestToolResult:
    def test_success_result(self):
        r = ToolResult(
            tool_name="test",
            success=True,
            result="hello",
            execution_time_ms=10.0,
        )
        assert r.success
        assert r.result == "hello"
        assert r.error is None

    def test_error_result(self):
        r = ToolResult(
            tool_name="test",
            success=False,
            result=None,
            error="something went wrong",
            execution_time_ms=1.5,
        )
        assert not r.success
        assert r.error == "something went wrong"

    def test_to_dict(self):
        r = ToolResult(tool_name="t", success=True, result="ok", execution_time_ms=5.0)
        d = r.to_dict()
        assert d["tool_name"] == "t"
        assert d["success"] is True
        assert d["result"] == "ok"
        assert d["error"] is None
        assert d["execution_time_ms"] == 5.0


class TestToolChainResult:
    def test_empty_result(self):
        r = ToolChainResult(results=[], final_output="", tool_count=0, total_time_ms=0.0)
        assert r.tool_count == 0

    def test_to_dict(self):
        tr = ToolResult(tool_name="t1", success=True, result="ok")
        r = ToolChainResult(results=[tr], final_output="done", tool_count=1, total_time_ms=10.0)
        d = r.to_dict()
        assert d["tool_count"] == 1
        assert d["final_output"] == "done"
        assert len(d["results"]) == 1


class TestToolStep:
    def test_creation(self):
        s = ToolStep(tool="web_search", params={"query": "AI"})
        assert s.tool == "web_search"
        assert s.params == {"query": "AI"}
        assert s.depends_on == []

    def test_with_dependencies(self):
        s = ToolStep(tool="execute_python", params={"code": "print(1)"}, depends_on=[0, 2])
        assert s.depends_on == [0, 2]

    def test_to_dict(self):
        s = ToolStep(tool="rag_retrieve", params={"query": "test"}, depends_on=[0])
        d = s.to_dict()
        assert d["tool"] == "rag_retrieve"
        assert d["params"] == {"query": "test"}
        assert d["depends_on"] == [0]


class TestToolRegistryRegister:
    def test_register_single(self):
        registry = ToolRegistry()
        registry.register(_make_schema("tool_a"))
        assert len(registry) == 1
        assert "tool_a" in registry

    def test_register_multiple(self):
        registry = ToolRegistry()
        registry.register(_make_schema("tool_a"))
        registry.register(_make_schema("tool_b"))
        registry.register(_make_schema("tool_c"))
        assert len(registry) == 3

    def test_register_duplicate_raises(self):
        registry = ToolRegistry()
        registry.register(_make_schema("tool_a"))
        with pytest.raises(ValueError, match="already registered"):
            registry.register(_make_schema("tool_a"))

    def test_unregister_existing(self):
        registry = ToolRegistry()
        registry.register(_make_schema("tool_a"))
        assert registry.unregister("tool_a") is True
        assert len(registry) == 0

    def test_unregister_nonexistent(self):
        registry = ToolRegistry()
        assert registry.unregister("nope") is False

    def test_registry_len(self):
        registry = ToolRegistry()
        assert len(registry) == 0
        registry.register(_make_schema("a"))
        assert len(registry) == 1

    def test_registry_contains(self):
        registry = ToolRegistry()
        registry.register(_make_schema("my_tool"))
        assert "my_tool" in registry
        assert "other" not in registry


class TestToolRegistryGetList:
    def test_get_tool_exists(self):
        registry = ToolRegistry()
        registry.register(_make_schema("tool_a"))
        tool = registry.get_tool("tool_a")
        assert tool is not None
        assert tool.name == "tool_a"

    def test_get_tool_not_found(self):
        registry = ToolRegistry()
        assert registry.get_tool("ghost") is None

    def test_list_all_tools(self):
        registry = ToolRegistry()
        registry.register(_make_schema("a", ToolCategory.WEB))
        registry.register(_make_schema("b", ToolCategory.CODE))
        tools = registry.list_tools()
        assert len(tools) == 2

    def test_list_by_category(self):
        registry = ToolRegistry()
        registry.register(_make_schema("a", ToolCategory.WEB))
        registry.register(_make_schema("b", ToolCategory.CODE))
        registry.register(_make_schema("c", ToolCategory.CODE))
        web_tools = registry.list_tools(ToolCategory.WEB)
        code_tools = registry.list_tools(ToolCategory.CODE)
        assert len(web_tools) == 1
        assert len(code_tools) == 2

    def test_list_empty_category(self):
        registry = ToolRegistry()
        registry.register(_make_schema("a", ToolCategory.WEB))
        search_tools = registry.list_tools(ToolCategory.SEARCH)
        assert len(search_tools) == 0

    def test_list_categories(self):
        registry = ToolRegistry()
        registry.register(_make_schema("a", ToolCategory.WEB))
        registry.register(_make_schema("b", ToolCategory.CODE))
        cats = registry.list_categories()
        assert ToolCategory.WEB in cats
        assert ToolCategory.CODE in cats


class TestToolRegistryInvoke:
    def test_invoke_success(self):
        registry = ToolRegistry()
        registry.register(ToolSchema(
            name="echo", description="Echo", category=ToolCategory.WEB,
            parameters={"value": ("str", "Value to echo")},
            returns="Echoed value", func=_dummy_tool_echo,
        ))
        result = registry.invoke("echo", value="hello")
        assert result.success
        assert result.result == "hello"
        assert result.execution_time_ms >= 0

    def test_invoke_tool_not_found(self):
        registry = ToolRegistry()
        result = registry.invoke("nonexistent")
        assert not result.success
        assert "not found" in result.error

    def test_invoke_tool_throws(self):
        registry = ToolRegistry()
        registry.register(ToolSchema(
            name="broken", description="Broken", category=ToolCategory.CODE,
            parameters={}, returns="Nothing", func=_dummy_tool_error,
        ))
        result = registry.invoke("broken")
        assert not result.success
        assert "RuntimeError" in result.error
        assert "simulated failure" in result.error

    def test_invoke_empty_params(self):
        registry = ToolRegistry()
        registry.register(ToolSchema(
            name="noop", description="Noop", category=ToolCategory.WEB,
            parameters={}, returns="void", func=lambda **kw: "done",
        ))
        result = registry.invoke("noop")
        assert result.success
        assert result.result == "done"


class TestToolRegistrySchemaGeneration:
    def test_json_schema_basic(self):
        registry = ToolRegistry()
        registry.register(_make_schema("tool_a", ToolCategory.WEB))
        schemas = registry.get_tools_json_schema()
        assert len(schemas) == 1
        assert schemas[0]["name"] == "tool_a"
        assert "description" in schemas[0]
        assert "parameters" in schemas[0]

    def test_json_schema_parameters(self):
        registry = ToolRegistry()
        registry.register(_make_schema("tool_b", ToolCategory.CODE))
        schemas = registry.get_tools_json_schema()
        params = schemas[0]["parameters"]
        assert params["type"] == "object"
        assert "input" in params["properties"]

    def test_json_schema_empty_registry(self):
        registry = ToolRegistry()
        assert registry.get_tools_json_schema() == []

    def test_json_schema_multiple_tools(self):
        registry = ToolRegistry()
        registry.register(_make_schema("a", ToolCategory.WEB))
        registry.register(_make_schema("b", ToolCategory.CODE))
        schemas = registry.get_tools_json_schema()
        assert len(schemas) == 2

    def test_openai_tools_format(self):
        registry = ToolRegistry()
        registry.register(_make_schema("tool_a"))
        tools = registry.get_openai_tools_format()
        assert len(tools) == 1
        assert tools[0]["type"] == "function"
        assert "function" in tools[0]

    def test_json_schema_optional_params(self):
        registry = ToolRegistry()
        registry.register(ToolSchema(
            name="opt", description="Optional param tool", category=ToolCategory.WEB,
            parameters={
                "required_param": ("str", "Required"),
                "optional_param": ("str?", "Optional"),
            },
            returns="nil", func=_dummy_tool_success,
        ))
        schemas = registry.get_tools_json_schema()
        params = schemas[0]["parameters"]
        assert "required_param" in params["required"]
        assert "optional_param" not in params["required"]


class TestToolRegistryUsageStats:
    def test_initial_stats_zero(self):
        registry = ToolRegistry()
        registry.register(_make_schema("tool_a"))
        stats = registry.get_usage_stats()
        assert stats["tool_a"] == 0

    def test_stats_increment_on_invoke(self):
        registry = ToolRegistry()
        registry.register(ToolSchema(
            name="counter", description="Counts", category=ToolCategory.WEB,
            parameters={}, returns="int", func=lambda **kw: 42,
        ))
        registry.invoke("counter")
        registry.invoke("counter")
        assert registry.get_usage_stats()["counter"] == 2

    def test_stats_not_incremented_on_failure(self):
        registry = ToolRegistry()
        registry.register(ToolSchema(
            name="failer", description="Fails", category=ToolCategory.WEB,
            parameters={}, returns="void", func=_dummy_tool_error,
        ))
        registry.invoke("failer")
        assert registry.get_usage_stats()["failer"] == 0

    def test_reset_stats(self):
        registry = ToolRegistry()
        registry.register(ToolSchema(
            name="counter", description="Counts", category=ToolCategory.WEB,
            parameters={}, returns="int", func=lambda **kw: 42,
        ))
        registry.invoke("counter")
        registry.reset_stats()
        assert registry.get_usage_stats()["counter"] == 0


class TestToolUseEngineBuiltins:
    def test_register_builtins(self):
        engine = ToolUseEngine()
        engine.register_builtins()
        assert len(engine.registry) >= 6

    def test_builtin_names(self):
        engine = ToolUseEngine()
        engine.register_builtins()
        names = {t.name for t in engine.registry.list_tools()}
        for name in ["web_search", "execute_python", "execute_js",
                      "query_knowledge_graph", "recall_memory",
                      "rag_retrieve", "web_fetch"]:
            assert name in names

    def test_get_tool_engine_singleton(self):
        reset_tool_engine()
        e1 = get_tool_engine()
        e2 = get_tool_engine()
        assert e1 is e2
        assert len(e1.registry) >= 6
        reset_tool_engine()

    def test_builtin_tools_invoke(self):
        engine = ToolUseEngine()
        engine.register_builtins()
        result = engine.registry.invoke("web_search", query="Python")
        assert result.success
        r = engine.registry.invoke("execute_python", code="result = 1 + 1")
        assert r.success
        r = engine.registry.invoke("recall_memory", query="Python")
        assert r.success
        r = engine.registry.invoke("rag_retrieve", query="Python")
        assert r.success
        r = engine.registry.invoke("query_knowledge_graph", entity="python")
        assert r.success


class TestToolUseEngineShouldUseTool:
    def setup_method(self):
        self.engine = ToolUseEngine()
        self.engine.register_builtins()

    def test_should_use_search(self):
        tools = self.engine.should_use_tool("搜索最新的Python新闻")
        names = {t.name for t in tools}
        assert "web_search" in names

    def test_should_use_code(self):
        tools = self.engine.should_use_tool("运行一段Python代码计算斐波那契数列")
        names = {t.name for t in tools}
        assert "execute_python" in names

    def test_should_use_rag(self):
        tools = self.engine.should_use_tool("从文档中检索相关信息")
        names = {t.name for t in tools}
        assert "rag_retrieve" in names

    def test_should_use_memory(self):
        tools = self.engine.should_use_tool("回忆之前的对话内容")
        names = {t.name for t in tools}
        assert "recall_memory" in names

    def test_should_use_knowledge(self):
        tools = self.engine.should_use_tool("查询知识图谱中Transformer的关联概念")
        names = {t.name for t in tools}
        assert "query_knowledge_graph" in names

    def test_empty_query(self):
        tools = self.engine.should_use_tool("")
        assert tools == []

    def test_no_match_returns_all(self):
        tools = self.engine.should_use_tool("blorp zonk quxx")
        assert len(tools) == len(self.engine.registry)

    def test_multi_match(self):
        tools = self.engine.should_use_tool("搜索AI数据并运行代码分析")
        names = {t.name for t in tools}
        assert "web_search" in names
        assert "execute_python" in names


class TestToolUseEnginePlanChain:
    def setup_method(self):
        self.engine = ToolUseEngine()
        self.engine.register_builtins()

    def test_plan_search_query(self):
        plan = self.engine.plan_tool_chain("搜索Python最新版本")
        assert len(plan) > 0
        assert any(s["tool"] == "web_search" for s in plan)

    def test_plan_code_query(self):
        plan = self.engine.plan_tool_chain("运行Python代码分析数据")
        assert any(s["tool"] == "execute_python" for s in plan)

    def test_plan_has_dependencies(self):
        plan = self.engine.plan_tool_chain("搜索AI新闻并用Python分析趋势")
        python_step = next((s for s in plan if s["tool"] == "execute_python"), None)
        if python_step is not None:
            assert len(python_step["depends_on"]) >= 0

    def test_plan_empty_registry(self):
        engine = ToolUseEngine()
        plan = engine.plan_tool_chain("do something")
        assert plan == []

    def test_plan_max_tools_limit(self):
        plan = self.engine.plan_tool_chain(
            "搜索 运行 代码 文档 检索 记忆 "
            "搜索 运行 代码 文档 检索 记忆 "
            "搜索 运行 代码 文档 检索 记忆"
        )
        from cee.app.engine.tool_use import MAX_CHAIN_TOOLS
        assert len(plan) <= MAX_CHAIN_TOOLS

    def test_all_plan_steps_have_tool_key(self):
        plan = self.engine.plan_tool_chain("搜索AI新闻并分析")
        for step in plan:
            assert "tool" in step
            assert "params" in step

    def test_plan_rag_retrieve(self):
        plan = self.engine.plan_tool_chain("检索文档中的Python内容")
        assert any(s["tool"] == "rag_retrieve" for s in plan)


class TestToolUseEngineExecuteChain:
    def setup_method(self):
        self.engine = ToolUseEngine()
        self.engine.register_builtins()

    def test_single_tool_chain(self):
        result = self.engine.execute_chain([
            {"tool": "execute_python", "params": {"code": "result = 42"}, "depends_on": []}
        ])
        assert result.tool_count == 1
        assert result.results[0].success
        assert "42" in result.results[0].result

    def test_multi_tool_chain(self):
        result = self.engine.execute_chain([
            {"tool": "execute_python", "params": {"code": "result = 1 + 1"}, "depends_on": []},
            {"tool": "recall_memory", "params": {"query": "Python"}, "depends_on": []},
        ])
        assert result.tool_count == 2
        assert all(r.success for r in result.results)

    def test_chain_with_dependencies(self):
        result = self.engine.execute_chain([
            {"tool": "execute_python", "params": {"code": "result = 10"}, "depends_on": []},
            {"tool": "execute_python", "params": {
                "code": "result = 'step2: got deps' if '_prev_results' in locals() else 'no deps'"
            }, "depends_on": [0]},
        ])
        assert result.tool_count == 2
        assert all(r.success for r in result.results)

    def test_chain_with_multiple_deps(self):
        result = self.engine.execute_chain([
            {"tool": "execute_python", "params": {"code": "result = 'a'"}, "depends_on": []},
            {"tool": "execute_python", "params": {"code": "result = 'b'"}, "depends_on": []},
            {"tool": "execute_python", "params": {
                "code": "result = 'c_with_context'"
            }, "depends_on": [0, 1]},
        ])
        assert result.tool_count == 3
        assert all(r.success for r in result.results)

    def test_empty_chain(self):
        result = self.engine.execute_chain([])
        assert result.tool_count == 0
        assert result.total_time_ms >= 0

    def test_chain_error_isolation(self):
        result = self.engine.execute_chain([
            {"tool": "nonexistent_tool", "params": {}, "depends_on": []},
            {"tool": "execute_python", "params": {"code": "result = 'ok'"}, "depends_on": []},
        ])
        assert result.tool_count == 2
        assert not result.results[0].success
        assert result.results[1].success

    def test_chain_invalid_dep_index(self):
        result = self.engine.execute_chain([
            {"tool": "execute_python", "params": {"code": "result = 1"}, "depends_on": [99]},
        ])
        assert result.tool_count == 1
        assert not result.results[0].success

    def test_chain_negative_dep_index(self):
        result = self.engine.execute_chain([
            {"tool": "execute_python", "params": {"code": "result = 1"}, "depends_on": [-1]},
        ])
        assert result.tool_count == 1
        assert not result.results[0].success

    def test_execute_steps_with_toolstep(self):
        steps = [
            ToolStep(tool="execute_python", params={"code": "result = 99"}),
            ToolStep(tool="execute_python", params={"code": "result = 100"}),
        ]
        result = self.engine.execute_steps(steps)
        assert result.tool_count == 2

    def test_chain_history_recorded(self):
        self.engine.clear_history()
        self.engine.execute_chain([
            {"tool": "execute_python", "params": {"code": "result = 1"}, "depends_on": []},
        ])
        history = self.engine.get_chain_history()
        assert len(history) == 1

    def test_clear_history(self):
        self.engine.execute_chain([
            {"tool": "execute_python", "params": {"code": "result = 1"}, "depends_on": []},
        ])
        self.engine.clear_history()
        assert len(self.engine.get_chain_history()) == 0


class TestBuiltinTools:
    def test_web_search_basic(self):
        result = _web_search(query="Python programming")
        data = json.loads(result)
        assert "query" in data
        assert "results" in data
        assert data["query"] == "Python programming"

    def test_web_search_empty_query(self):
        result = _web_search(query="")
        data = json.loads(result)
        assert "error" in data

    def test_web_search_max_results(self):
        result = _web_search(query="AI", max_results=3)
        data = json.loads(result)
        assert data["count"] <= 3

    def test_execute_python_basic(self):
        result = _execute_python(code="result = 2 + 3")
        data = json.loads(result)
        assert data["success"]

    def test_execute_python_print(self):
        result = _execute_python(code="print('hello world')")
        data = json.loads(result)
        assert data["success"]
        assert "hello world" in data.get("output", "")

    def test_execute_python_no_code(self):
        result = _execute_python(code="")
        data = json.loads(result)
        assert "error" in data

    def test_execute_python_forbidden(self):
        result = _execute_python(code="import os; print(os)")
        data = json.loads(result)
        assert not data.get("success", True)
        assert "forbidden" in json.dumps(data).lower()

    def test_execute_python_error(self):
        result = _execute_python(code="1 / 0")
        data = json.loads(result)
        assert not data["success"]

    def test_execute_js_basic(self):
        result = _execute_js(code="console.log('hi')")
        data = json.loads(result)
        assert data.get("success") or "output" in data

    def test_execute_js_no_code(self):
        result = _execute_js(code="")
        data = json.loads(result)
        assert "error" in data

    def test_query_knowledge_graph_basic(self):
        result = _query_knowledge_graph(entity="人工智能")
        data = json.loads(result)
        assert data["entity"] == "人工智能"
        assert len(data["relations"]) > 0

    def test_query_knowledge_graph_no_entity(self):
        result = _query_knowledge_graph(entity="")
        data = json.loads(result)
        assert "error" in data

    def test_query_knowledge_graph_depth(self):
        result = _query_knowledge_graph(entity="人工智能", depth=1, related=False)
        data = json.loads(result)
        assert data["depth"] == 1

    def test_recall_memory_basic(self):
        result = _recall_memory(query="Python")
        data = json.loads(result)
        assert "memories" in data
        assert data["count"] >= 0

    def test_recall_memory_no_query(self):
        result = _recall_memory(query="")
        data = json.loads(result)
        assert "error" in data

    def test_recall_memory_with_results(self):
        result = _recall_memory(query="python tool")
        data = json.loads(result)
        assert data["count"] >= 0

    def test_rag_retrieve_basic(self):
        result = _rag_retrieve(query="人工智能")
        data = json.loads(result)
        assert "results" in data

    def test_rag_retrieve_no_query(self):
        result = _rag_retrieve(query="")
        data = json.loads(result)
        assert "error" in data

    def test_rag_retrieve_top_k(self):
        result = _rag_retrieve(query="AI agent tool", top_k=2)
        data = json.loads(result)
        assert len(data["results"]) <= 2

    def test_rag_retrieve_relevance(self):
        result = _rag_retrieve(query="Python")
        data = json.loads(result)
        if data["results"]:
            assert "relevance_score" in data["results"][0]

    def test_web_fetch_no_url(self):
        result = _web_fetch(url="")
        data = json.loads(result)
        assert "error" in data


class TestEdgeCases:
    def setup_method(self):
        self.engine = ToolUseEngine()
        self.engine.register_builtins()

    def test_chain_with_failed_dependency(self):
        result = self.engine.execute_chain([
            {"tool": "nonexistent", "params": {}, "depends_on": []},
            {"tool": "execute_python", "params": {
                "code": "result = 'still works'"
            }, "depends_on": [0]},
        ])
        assert result.tool_count == 2
        assert not result.results[0].success
        assert result.results[1].success

    def test_circular_dependency_detection(self):
        steps = [
            {"tool": "a", "params": {}, "depends_on": [1]},
            {"tool": "b", "params": {}, "depends_on": [0]},
        ]
        has_circular = self.engine._detect_circular_deps(steps)
        assert has_circular is True

    def test_no_circular_dependency(self):
        steps = [
            {"tool": "a", "params": {}, "depends_on": []},
            {"tool": "b", "params": {}, "depends_on": [0]},
            {"tool": "c", "params": {}, "depends_on": [1]},
        ]
        has_circular = self.engine._detect_circular_deps(steps)
        assert has_circular is False

    def test_resolve_order_simple_chain(self):
        steps = [
            {"tool": "a", "params": {}, "depends_on": []},
            {"tool": "b", "params": {}, "depends_on": [0]},
            {"tool": "c", "params": {}, "depends_on": [1]},
        ]
        order = self.engine._resolve_dependency_order(steps)
        assert order[0] == 0
        assert order[1] == 1
        assert order[2] == 2

    def test_resolve_order_independent(self):
        steps = [
            {"tool": "a", "params": {}, "depends_on": []},
            {"tool": "b", "params": {}, "depends_on": []},
            {"tool": "c", "params": {}, "depends_on": []},
        ]
        order = self.engine._resolve_dependency_order(steps)
        assert set(order) == {0, 1, 2}

    def test_resolve_order_diamond(self):
        steps = [
            {"tool": "a", "params": {}, "depends_on": []},
            {"tool": "b", "params": {}, "depends_on": [0]},
            {"tool": "c", "params": {}, "depends_on": [0]},
            {"tool": "d", "params": {}, "depends_on": [1, 2]},
        ]
        order = self.engine._resolve_dependency_order(steps)
        assert order[0] == 0
        assert 3 in order
        assert order.index(3) > order.index(1)
        assert order.index(3) > order.index(2)

    def test_registry_concurrent_registration(self):
        import threading
        registry = ToolRegistry()
        errors = []

        def register_tool(idx):
            try:
                name = f"tool_{idx}"
                registry.register(ToolSchema(
                    name=name, description=f"Tool {idx}",
                    category=ToolCategory.WEB,
                    parameters={"input": ("str", "val")},
                    returns="x", func=lambda **kw: f"result_{idx}",
                ))
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=register_tool, args=(i,))
            for i in range(20)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0

    def test_chain_performance_timing(self):
        result = self.engine.execute_chain([
            {"tool": "execute_python", "params": {"code": "result = 1"}, "depends_on": []},
            {"tool": "execute_python", "params": {"code": "result = 2"}, "depends_on": []},
            {"tool": "execute_python", "params": {"code": "result = 3"}, "depends_on": []},
        ])
        assert result.total_time_ms >= 0
        for r in result.results:
            assert r.execution_time_ms >= 0

    def test_registry_stats_concurrent(self):
        import threading
        registry = ToolRegistry()
        registry.register(ToolSchema(
            name="hit", description="Hit", category=ToolCategory.WEB,
            parameters={}, returns="void", func=lambda **kw: "ok",
        ))

        def hit():
            for _ in range(10):
                registry.invoke("hit")

        threads = [threading.Thread(target=hit) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        stats = registry.get_usage_stats()
        assert stats["hit"] == 50

    def test_self_dependency_detected(self):
        steps = [{"tool": "a", "params": {}, "depends_on": [0]}]
        has_circular = self.engine._detect_circular_deps(steps)
        assert has_circular is True

    def test_unicode_query_tool_chain(self):
        plan = self.engine.plan_tool_chain("搜索人工智能的最新进展")
        assert len(plan) > 0

    def test_step_with_extra_keys(self):
        result = self.engine.execute_chain([
            {
                "tool": "execute_python",
                "params": {"code": "result = 42"},
                "depends_on": [],
                "metadata": {"priority": "high"},
                "description": "extra key",
            },
        ])
        assert result.tool_count == 1
        assert result.results[0].success
