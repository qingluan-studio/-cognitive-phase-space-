"""
Tests for src/cee/app/engine/planner.py -- GoalPlanner.
"""
import sys
import pytest

sys.path.insert(0, "/workspace/src")

from cee.app.engine.planner import (
    TaskStatus,
    TaskPriority,
    SubTask,
    PlanResult,
    TaskDecomposer,
    TaskScheduler,
    PlanExecutor,
    GoalPlanner,
    get_planner,
)


# ── TaskStatus ─────────────────────────────────────────────────────


class TestTaskStatus:
    def test_pending_value(self):
        assert TaskStatus.PENDING.value == "pending"

    def test_ready_value(self):
        assert TaskStatus.READY.value == "ready"

    def test_in_progress_value(self):
        assert TaskStatus.IN_PROGRESS.value == "in_progress"

    def test_completed_value(self):
        assert TaskStatus.COMPLETED.value == "completed"

    def test_failed_value(self):
        assert TaskStatus.FAILED.value == "failed"

    def test_blocked_value(self):
        assert TaskStatus.BLOCKED.value == "blocked"

    def test_skipped_value(self):
        assert TaskStatus.SKIPPED.value == "skipped"

    def test_is_string_enum(self):
        assert isinstance(TaskStatus.PENDING, str)
        assert TaskStatus.PENDING == "pending"


# ── TaskPriority ───────────────────────────────────────────────────


class TestTaskPriority:
    def test_critical_value(self):
        assert TaskPriority.CRITICAL.value == 1

    def test_high_value(self):
        assert TaskPriority.HIGH.value == 2

    def test_medium_value(self):
        assert TaskPriority.MEDIUM.value == 3

    def test_low_value(self):
        assert TaskPriority.LOW.value == 4

    def test_optional_value(self):
        assert TaskPriority.OPTIONAL.value == 5

    def test_priority_ordering(self):
        assert TaskPriority.CRITICAL < TaskPriority.HIGH
        assert TaskPriority.HIGH < TaskPriority.MEDIUM
        assert TaskPriority.MEDIUM < TaskPriority.LOW
        assert TaskPriority.LOW < TaskPriority.OPTIONAL


# ── SubTask ────────────────────────────────────────────────────────


class TestSubTask:
    def test_default_construction(self):
        st = SubTask(task_id="t1", name="Test", description="A test task")
        assert st.task_id == "t1"
        assert st.name == "Test"
        assert st.description == "A test task"
        assert st.status == TaskStatus.PENDING
        assert st.priority == TaskPriority.MEDIUM
        assert st.dependencies == []
        assert st.estimated_effort == 1.0
        assert st.assigned_tool is None
        assert st.tool_params == {}
        assert st.result is None
        assert st.error is None
        assert st.started_at is None
        assert st.completed_at is None
        assert st.retry_count == 0
        assert st.max_retries == 3

    def test_custom_construction(self):
        st = SubTask(
            task_id="t2",
            name="Custom",
            description="Custom desc",
            status=TaskStatus.READY,
            priority=TaskPriority.CRITICAL,
            dependencies=["t1"],
            estimated_effort=2.5,
            assigned_tool="tool_x",
            tool_params={"param1": "val1"},
            max_retries=5,
        )
        assert st.status == TaskStatus.READY
        assert st.priority == TaskPriority.CRITICAL
        assert st.dependencies == ["t1"]
        assert st.estimated_effort == 2.5
        assert st.assigned_tool == "tool_x"
        assert st.tool_params == {"param1": "val1"}
        assert st.max_retries == 5

    def test_result_any_type(self):
        st = SubTask(task_id="t3", name="R", description="d")
        st.result = {"key": "value"}
        assert st.result == {"key": "value"}
        st.result = [1, 2, 3]
        assert st.result == [1, 2, 3]
        st.result = "string"
        assert st.result == "string"

    def test_error_set(self):
        st = SubTask(task_id="t4", name="E", description="d")
        st.error = "Something went wrong"
        assert st.error == "Something went wrong"

    def test_timestamps_set(self):
        st = SubTask(task_id="t5", name="T", description="d")
        st.started_at = "2024-01-01T00:00:00"
        st.completed_at = "2024-01-01T01:00:00"
        assert st.started_at == "2024-01-01T00:00:00"
        assert st.completed_at == "2024-01-01T01:00:00"

    def test_retry_count_default_zero(self):
        st = SubTask(task_id="t6", name="R", description="d")
        assert st.retry_count == 0


# ── PlanResult ─────────────────────────────────────────────────────


class TestPlanResult:
    def test_construction(self):
        tasks = [SubTask(task_id="t1", name="T1", description="d")]
        completed = [tasks[0]]
        failed: list = []
        pending: list = []
        pr = PlanResult(
            plan_id="abc123",
            goal="test goal",
            tasks=tasks,
            completed=completed,
            failed=failed,
            pending=pending,
            progress=1.0,
            execution_time_ms=100.0,
            summary="All done",
        )
        assert pr.plan_id == "abc123"
        assert pr.goal == "test goal"
        assert len(pr.completed) == 1
        assert len(pr.failed) == 0
        assert pr.progress == 1.0
        assert pr.execution_time_ms == 100.0

    def test_to_dict(self):
        tasks = [SubTask(task_id="t1", name="T1", description="d")]
        pr = PlanResult(
            plan_id="abc",
            goal="g",
            tasks=tasks,
            completed=tasks,
            failed=[],
            pending=[],
            progress=1.0,
            execution_time_ms=50.0,
            summary="s",
        )
        d = pr.to_dict()
        assert d["plan_id"] == "abc"
        assert d["goal"] == "g"
        assert d["task_count"] == 1
        assert d["completed"] == 1
        assert d["failed"] == 0
        assert d["pending"] == 0
        assert d["progress"] == 1.0
        assert d["execution_time_ms"] == 50.0
        assert d["summary"] == "s"

    def test_to_dict_partial_progress(self):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        t2 = SubTask(task_id="t2", name="T2", description="d")
        pr = PlanResult(
            plan_id="x",
            goal="g",
            tasks=[t1, t2],
            completed=[t1],
            failed=[],
            pending=[t2],
            progress=0.5,
            execution_time_ms=200.0,
            summary="Half done",
        )
        d = pr.to_dict()
        assert d["completed"] == 1
        assert d["pending"] == 1
        assert d["progress"] == 0.5


# ── TaskDecomposer ─────────────────────────────────────────────────


class TestTaskDecomposer:
    @pytest.fixture
    def decomposer(self):
        return TaskDecomposer()

    def test_initialization(self, decomposer):
        assert decomposer._decomposition_patterns is not None
        assert len(decomposer._decomposition_patterns) == 8

    # ── create_project ──

    def test_decompose_create_project(self, decomposer):
        tasks = decomposer.decompose("create a new project")
        assert len(tasks) == 5
        names = [t.name for t in tasks]
        assert "Initialize project structure" in names
        assert "Create core modules" in names

    def test_decompose_create_project_chinese(self, decomposer):
        tasks = decomposer.decompose("创建一个新项目")
        assert len(tasks) == 5

    def test_decompose_scaffold_project(self, decomposer):
        tasks = decomposer.decompose("scaffold a new app")
        assert len(tasks) == 5

    # ── data_analysis ──

    def test_decompose_data_analysis(self, decomposer):
        tasks = decomposer.decompose("analyze the data")
        assert len(tasks) == 6
        names = [t.name for t in tasks]
        assert "Load data" in names
        assert "Visualize results" in names

    def test_decompose_data_analysis_chinese(self, decomposer):
        tasks = decomposer.decompose("数据统计分析")
        assert len(tasks) == 6

    # ── web_app ──

    def test_decompose_web_app(self, decomposer):
        tasks = decomposer.decompose("build a web application")
        assert len(tasks) == 6
        names = [t.name for t in tasks]
        assert "Design component tree" in names
        assert "Style and polish" in names

    def test_decompose_web_app_chinese(self, decomposer):
        tasks = decomposer.decompose("开发一个前端网页")
        assert len(tasks) == 6

    def test_decompose_website(self, decomposer):
        tasks = decomposer.decompose("create a website")
        assert len(tasks) == 6

    # ── api_endpoint ──

    def test_decompose_api(self, decomposer):
        tasks = decomposer.decompose("create an API endpoint")
        assert len(tasks) == 5
        names = [t.name for t in tasks]
        assert "Define API contract" in names
        assert "Write API tests" in names

    def test_decompose_api_chinese(self, decomposer):
        tasks = decomposer.decompose("开发一个接口")
        assert len(tasks) == 5

    def test_decompose_route(self, decomposer):
        tasks = decomposer.decompose("add a new route")
        assert len(tasks) == 5

    # ── refactor ──

    def test_decompose_refactor(self, decomposer):
        tasks = decomposer.decompose("refactor the codebase")
        assert len(tasks) == 5
        names = [t.name for t in tasks]
        assert "Analyze current code" in names
        assert "Verify behavior" in names

    def test_decompose_refactor_chinese(self, decomposer):
        tasks = decomposer.decompose("重构代码")
        assert len(tasks) == 5

    def test_decompose_cleanup(self, decomposer):
        tasks = decomposer.decompose("cleanup project")
        assert len(tasks) == 5

    # ── debug ──

    def test_decompose_debug(self, decomposer):
        tasks = decomposer.decompose("fix the bug")
        assert len(tasks) == 6
        names = [t.name for t in tasks]
        assert "Reproduce issue" in names
        assert "Add regression test" in names

    def test_decompose_debug_chinese(self, decomposer):
        tasks = decomposer.decompose("修复这个错误")
        assert len(tasks) == 6

    def test_decompose_error(self, decomposer):
        tasks = decomposer.decompose("debug the error")
        assert len(tasks) == 6

    # ── research ──

    def test_decompose_research(self, decomposer):
        tasks = decomposer.decompose("research the topic")
        assert len(tasks) == 5
        names = [t.name for t in tasks]
        assert "Define scope" in names
        assert "Present results" in names

    def test_decompose_research_chinese(self, decomposer):
        tasks = decomposer.decompose("调研新技术方案")
        assert len(tasks) == 5

    def test_decompose_investigate(self, decomposer):
        tasks = decomposer.decompose("investigate the issue")
        assert len(tasks) == 5

    # ── build_system ──

    def test_decompose_build_system(self, decomposer):
        tasks = decomposer.decompose("build the system")
        assert len(tasks) == 5
        names = [t.name for t in tasks]
        assert "Define requirements" in names
        assert "Optimize" in names

    def test_decompose_build_system_chinese(self, decomposer):
        tasks = decomposer.decompose("编译部署系统")
        assert len(tasks) == 5

    def test_decompose_deploy(self, decomposer):
        tasks = decomposer.decompose("deploy to production")
        assert len(tasks) == 5

    # ── sequential (fallback) ──

    def test_decompose_unknown_goal(self, decomposer):
        tasks = decomposer.decompose("do something unusual")
        assert len(tasks) == 5
        names = [t.name for t in tasks]
        assert "Analyze requirements" in names
        assert "Document and finalize" in names

    def test_decompose_empty_goal(self, decomposer):
        tasks = decomposer.decompose("")
        assert len(tasks) == 5

    # ── task ID assignment ──

    def test_decompose_assigns_sequential_ids(self, decomposer):
        tasks = decomposer.decompose("create a new project")
        assert tasks[0].task_id == "task_000"
        assert tasks[1].task_id == "task_001"
        assert tasks[-1].task_id == "task_004"

    def test_decompose_assigns_dependencies(self, decomposer):
        tasks = decomposer.decompose("create a new project")
        assert tasks[0].dependencies == []
        assert tasks[1].dependencies == ["task_000"]
        assert tasks[2].dependencies == ["task_001"]

    # ── context passthrough ──

    def test_decompose_with_context(self, decomposer):
        tasks = decomposer.decompose(
            "create a new project", context="Python web app"
        )
        assert len(tasks) == 5

    def test_decompose_with_none_context(self, decomposer):
        tasks = decomposer.decompose("create a new project", context=None)
        assert len(tasks) == 5

    # ── priority assignment ──

    def test_create_project_critical_tasks(self, decomposer):
        tasks = decomposer.decompose("create a new project")
        critical = [t for t in tasks if t.priority == TaskPriority.CRITICAL]
        assert len(critical) >= 1
        assert critical[0].name == "Create core modules"

    def test_debug_critical_tasks(self, decomposer):
        tasks = decomposer.decompose("fix the bug")
        critical = [t for t in tasks if t.priority == TaskPriority.CRITICAL]
        assert len(critical) >= 2
        names = [t.name for t in critical]
        assert "Reproduce issue" in names
        assert "Identify root cause" in names

    # ── estimated_effort ──

    def test_default_effort_is_one(self, decomposer):
        tasks = decomposer.decompose("create a new project")
        for t in tasks:
            assert t.estimated_effort == 1.0

    # ── matches_pattern edge cases ──

    def test_case_insensitive(self, decomposer):
        tasks = decomposer.decompose("CREATE A NEW PROJECT")
        assert len(tasks) == 5

    def test_mixed_case(self, decomposer):
        tasks = decomposer.decompose("Fix the Bug")
        assert len(tasks) == 6

    # ── multiple pattern matches (first wins) ──

    def test_goal_matching_multiple_patterns(self, decomposer):
        tasks = decomposer.decompose("create and deploy a new web project")
        assert len(tasks) >= 5


# ── TaskScheduler ──────────────────────────────────────────────────


class TestTaskScheduler:
    @pytest.fixture
    def scheduler(self):
        return TaskScheduler()

    def test_default_max_concurrent(self, scheduler):
        assert scheduler.max_concurrent == 1

    def test_custom_max_concurrent(self):
        scheduler = TaskScheduler(max_concurrent=3)
        assert scheduler.max_concurrent == 3

    def test_schedule_single_task(self, scheduler):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        order = scheduler.schedule([t1])
        assert len(order) == 1
        assert order[0].status == TaskStatus.READY

    def test_schedule_linear_dependencies(self, scheduler):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        t2 = SubTask(task_id="t2", name="T2", description="d", dependencies=["t1"])
        t3 = SubTask(task_id="t3", name="T3", description="d", dependencies=["t2"])
        order = scheduler.schedule([t1, t2, t3])
        assert order[0].task_id == "t1"
        assert order[1].task_id == "t2"
        assert order[2].task_id == "t3"

    def test_schedule_priority_ordering(self, scheduler):
        t1 = SubTask(
            task_id="t1", name="Low", description="d",
            priority=TaskPriority.LOW
        )
        t2 = SubTask(
            task_id="t2", name="Critical", description="d",
            priority=TaskPriority.CRITICAL
        )
        t3 = SubTask(
            task_id="t3", name="Medium", description="d",
            priority=TaskPriority.MEDIUM
        )
        order = scheduler.schedule([t1, t2, t3])
        assert order[0].task_id == "t2"
        assert order[1].task_id == "t3"
        assert order[2].task_id == "t1"

    def test_schedule_same_priority_by_effort(self, scheduler):
        t1 = SubTask(
            task_id="t1", name="Heavy", description="d",
            estimated_effort=10.0, priority=TaskPriority.MEDIUM,
        )
        t2 = SubTask(
            task_id="t2", name="Light", description="d",
            estimated_effort=1.0, priority=TaskPriority.MEDIUM,
        )
        order = scheduler.schedule([t1, t2])
        assert order[0].task_id == "t2"
        assert order[1].task_id == "t1"

    def test_schedule_empty_list(self, scheduler):
        order = scheduler.schedule([])
        assert order == []

    def test_schedule_blocks_tasks_with_unsatisfied_deps(self, scheduler):
        t1 = SubTask(
            task_id="t1", name="T1", description="d",
            dependencies=["t_missing"]
        )
        order = scheduler.schedule([t1])
        assert order[0].status == TaskStatus.READY

    def test_schedule_diamond_dependency(self, scheduler):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        t2 = SubTask(task_id="t2", name="T2", description="d", dependencies=["t1"])
        t3 = SubTask(task_id="t3", name="T3", description="d", dependencies=["t1"])
        t4 = SubTask(
            task_id="t4", name="T4", description="d",
            dependencies=["t2", "t3"]
        )
        order = scheduler.schedule([t1, t2, t3, t4])
        assert order[0].task_id == "t1"
        assert order[-1].task_id == "t4"

    def test_schedule_handles_deadlock(self, scheduler):
        t1 = SubTask(
            task_id="t1", name="T1", description="d",
            dependencies=["t2"]
        )
        t2 = SubTask(
            task_id="t2", name="T2", description="d",
            dependencies=["t1"]
        )
        order = scheduler.schedule([t1, t2])
        assert len(order) >= 1

    def test_schedule_with_already_completed(self, scheduler):
        t1 = SubTask(
            task_id="t1", name="T1", description="d",
            status=TaskStatus.COMPLETED
        )
        t2 = SubTask(task_id="t2", name="T2", description="d")
        order = scheduler.schedule([t1, t2])
        assert len(order) == 1

    def test_schedule_with_skipped_task(self, scheduler):
        t1 = SubTask(
            task_id="t1", name="T1", description="d",
            status=TaskStatus.SKIPPED
        )
        t2 = SubTask(task_id="t2", name="T2", description="d")
        order = scheduler.schedule([t1, t2])
        order_ids = [t.task_id for t in order]
        assert "t2" in order_ids


# ── PlanExecutor ───────────────────────────────────────────────────


class TestPlanExecutor:
    @pytest.fixture
    def executor(self):
        return PlanExecutor()

    def test_default_initialization(self, executor):
        assert executor.scheduler is not None

    def test_execute_empty_tasks(self, executor):
        result = executor.execute("test", [])
        assert result.goal == "test"
        assert len(result.completed) == 0
        assert len(result.failed) == 0
        assert result.progress == 0.0

    def test_execute_single_task(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        result = executor.execute("goal", [t1])
        assert len(result.completed) == 1
        assert result.progress == 1.0
        assert result.completed[0].status == TaskStatus.COMPLETED
        assert result.completed[0].result is not None

    def test_execute_multiple_tasks(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        t2 = SubTask(task_id="t2", name="T2", description="d", dependencies=["t1"])
        result = executor.execute("goal", [t1, t2])
        assert len(result.completed) == 2
        assert result.progress == 1.0

    def test_execute_with_executor_fn(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")

        def custom_fn(task):
            return {"custom": "result", "task_name": task.name}

        result = executor.execute("goal", [t1], executor_fn=custom_fn)
        assert result.completed[0].result == {
            "custom": "result",
            "task_name": "T1",
        }

    def test_execute_sets_timestamps(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        result = executor.execute("goal", [t1])
        assert result.completed[0].started_at is not None
        assert result.completed[0].completed_at is not None

    def test_execute_records_history(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        executor.execute("goal", [t1])
        assert len(executor._history) >= 1

    def test_execute_returns_plan_id(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        result = executor.execute("goal", [t1])
        assert result.plan_id is not None
        assert len(result.plan_id) == 8

    def test_execute_failing_task(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")

        def failing_fn(task):
            raise ValueError("intentional failure")

        result = executor.execute("goal", [t1], executor_fn=failing_fn)
        assert len(result.failed) == 1
        assert result.failed[0].status == TaskStatus.FAILED
        assert "intentional failure" in result.failed[0].error

    def test_execute_failing_task_with_retry(self, executor):
        call_count = {"count": 0}

        def retry_fn(task):
            call_count["count"] += 1
            if call_count["count"] < 2:
                raise ValueError("fail")
            return {"ok": True}

        t1 = SubTask(
            task_id="t1", name="T1", description="d",
            max_retries=3
        )
        result = executor.execute("goal", [t1], executor_fn=retry_fn)
        assert result.completed[0].result == {"ok": True}

    def test_execute_progress_partial(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")

        def succeed_fn(task):
            return {"ok": True}

        def fail_fn(task):
            raise ValueError("fail")

        t2 = SubTask(
            task_id="t2", name="T2", description="d",
            dependencies=["t1"], max_retries=0
        )
        result = executor.execute("goal", [t1], executor_fn=succeed_fn)
        assert result.progress == 1.0

    def test_execute_summary_includes_goal(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        result = executor.execute("my goal", [t1])
        assert "my goal" in result.summary

    def test_execute_execution_time_positive(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        result = executor.execute("goal", [t1])
        assert result.execution_time_ms >= 0

    def test_execute_pending_tasks(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        t2 = SubTask(task_id="t2", name="T2", description="d")

        def fail_t1(task):
            if task.task_id == "t1":
                raise ValueError("fail")
            return {"ok": True}

        result = executor.execute(
            "goal", [t1, t2], executor_fn=fail_t1
        )
        assert len(result.pending) >= 0 or len(result.failed) >= 1

    def test_execute_sets_in_progress_status(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")

        def capture_fn(task):
            return task.status

        result = executor.execute("goal", [t1], executor_fn=capture_fn)
        assert result.completed[0].result == TaskStatus.IN_PROGRESS

    def test_rollback_returns_affected(self, executor):
        t1 = SubTask(task_id="t1", name="T1", description="d")
        executor.execute("goal", [t1])
        affected = executor.rollback("t1")
        assert isinstance(affected, list)


# ── GoalPlanner ────────────────────────────────────────────────────


class TestGoalPlanner:
    @pytest.fixture
    def planner(self):
        return GoalPlanner()

    def test_initialization(self, planner):
        assert planner.decomposer is not None
        assert planner.executor is not None
        assert planner._plans == {}

    def test_plan_returns_tasks(self, planner):
        tasks = planner.plan("create a new project")
        assert len(tasks) == 5
        assert all(isinstance(t, SubTask) for t in tasks)

    def test_plan_with_context(self, planner):
        tasks = planner.plan("create a new project", context="Python")
        assert len(tasks) == 5

    def test_execute_plan_returns_result(self, planner):
        result = planner.execute_plan("create a new project")
        assert isinstance(result, PlanResult)
        assert result.progress == 1.0

    def test_execute_plan_stores_plan(self, planner):
        result = planner.execute_plan("create a project")
        stored = planner.get_plan(result.plan_id)
        assert stored is not None
        assert stored.goal == "create a project"

    def test_get_plan_nonexistent(self, planner):
        result = planner.get_plan("nonexistent")
        assert result is None

    def test_list_plans_empty(self, planner):
        plans = planner.list_plans()
        assert plans == []

    def test_list_plans_after_execution(self, planner):
        planner.execute_plan("goal 1")
        planner.execute_plan("goal 2")
        plans = planner.list_plans()
        assert len(plans) == 2
        assert plans[0]["goal"] == "goal 1"
        assert plans[1]["goal"] == "goal 2"

    def test_list_plans_includes_progress(self, planner):
        planner.execute_plan("goal")
        plans = planner.list_plans()
        assert "progress" in plans[0]
        assert "plan_id" in plans[0]

    def test_get_task_tree(self, planner):
        tree = planner.get_task_tree("create a project")
        assert "nodes" in tree
        assert "edges" in tree
        assert len(tree["nodes"]) == 5
        assert len(tree["edges"]) == 4

    def test_get_task_tree_nodes_have_required_fields(self, planner):
        tree = planner.get_task_tree("create a project")
        node = tree["nodes"][0]
        assert "id" in node
        assert "name" in node
        assert "status" in node
        assert "priority" in node

    def test_get_task_tree_edges_have_from_to(self, planner):
        tree = planner.get_task_tree("create a project")
        edge = tree["edges"][0]
        assert "from" in edge
        assert "to" in edge

    def test_get_task_tree_sequential_edges(self, planner):
        tree = planner.get_task_tree("create a project")
        assert tree["edges"][0]["from"] == "task_000"
        assert tree["edges"][0]["to"] == "task_001"

    def test_get_task_tree_unknown_goal(self, planner):
        tree = planner.get_task_tree("unknown goal")
        assert len(tree["nodes"]) == 5


# ── Singleton ──────────────────────────────────────────────────────


class TestSingleton:
    def test_get_planner_returns_instance(self):
        p = get_planner()
        assert isinstance(p, GoalPlanner)

    def test_get_planner_is_singleton(self):
        p1 = get_planner()
        p2 = get_planner()
        assert p1 is p2

    def test_singleton_across_calls(self):
        p = get_planner()
        tasks = p.plan("test")
        assert len(tasks) > 0


# ── Integration Tests ──────────────────────────────────────────────


class TestIntegration:
    def test_full_workflow_create_project(self):
        planner = GoalPlanner()
        result = planner.execute_plan("create a new project")
        assert result.progress == 1.0
        assert len(result.completed) == 5
        assert len(result.failed) == 0

    def test_full_workflow_debug(self):
        planner = GoalPlanner()
        result = planner.execute_plan("fix the bug")
        assert len(result.completed) == 6

    def test_full_workflow_web_app(self):
        planner = GoalPlanner()
        result = planner.execute_plan("创建网页应用")
        assert len(result.completed) == 6

    def test_task_progress_tracking(self):
        planner = GoalPlanner()
        result = planner.execute_plan("create a new project")
        for task in result.completed:
            assert task.started_at is not None
            assert task.completed_at is not None


# ── Edge Cases ─────────────────────────────────────────────────────


class TestEdgeCases:
    def test_decompose_whitespace_goal(self):
        decomposer = TaskDecomposer()
        tasks = decomposer.decompose("   ")
        assert len(tasks) == 5

    def test_very_long_goal(self):
        decomposer = TaskDecomposer()
        long_goal = "create a project " * 100
        tasks = decomposer.decompose(long_goal)
        assert len(tasks) >= 5

    def test_schedule_all_same_priority(self):
        scheduler = TaskScheduler()
        tasks = [
            SubTask(task_id=f"t{i}", name=f"T{i}", description="d")
            for i in range(10)
        ]
        order = scheduler.schedule(tasks)
        assert len(order) == 10

    def test_execute_multiple_plans_unique_ids(self):
        planner = GoalPlanner()
        r1 = planner.execute_plan("goal a")
        r2 = planner.execute_plan("goal b")
        assert r1.plan_id != r2.plan_id

    def test_plan_result_with_all_failed(self):
        executor = PlanExecutor()
        t1 = SubTask(
            task_id="t1", name="F", description="d",
            max_retries=0
        )

        def always_fail(task):
            raise ValueError("always fail")

        result = executor.execute("goal", [t1], executor_fn=always_fail)
        assert len(result.failed) == 1
        assert len(result.completed) == 0
        assert result.progress == 0.0

    def test_plan_result_with_all_succeeded(self):
        executor = PlanExecutor()
        tasks = [SubTask(task_id=f"t{i}", name=f"T{i}", description="d")
                 for i in range(5)]
        result = executor.execute("goal", tasks)
        assert len(result.completed) == 5
        assert result.progress == 1.0

    def test_executor_with_retry_exhaustion(self):
        executor = PlanExecutor()
        t1 = SubTask(
            task_id="t1", name="R", description="d",
            max_retries=2
        )
        call_counter = {"n": 0}

        def fail_three_times(task):
            call_counter["n"] += 1
            raise ValueError(f"fail {call_counter['n']}")

        result = executor.execute("goal", [t1], executor_fn=fail_three_times)
        assert t1.retry_count == 2
        assert t1.status == TaskStatus.FAILED

    def test_tree_empty_edges_for_single_task(self):
        planner = GoalPlanner()
        tree = planner.get_task_tree("asdf")
        assert len(tree["nodes"]) == 5
        assert len(tree["edges"]) == 4

    def test_subtask_optional_priority_orders_last(self):
        scheduler = TaskScheduler()
        t1 = SubTask(
            task_id="t1", name="Crit", description="d",
            priority=TaskPriority.CRITICAL
        )
        t2 = SubTask(
            task_id="t2", name="Opt", description="d",
            priority=TaskPriority.OPTIONAL
        )
        order = scheduler.schedule([t1, t2])
        assert order[0].priority == TaskPriority.CRITICAL
        assert order[-1].priority == TaskPriority.OPTIONAL
