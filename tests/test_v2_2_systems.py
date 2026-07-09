"""CEE v2.2.0 系统测试 — 深层缺陷修复 + 创新功能 (10 模块)。

测试覆盖:
  ...
"""

import time
import pytest


class TestMemoryBank:
    """中央记忆银行测试。"""

    def setup_method(self):
        from cee.agent.memory_bank import MemoryBank, MemoryType
        self.bank = MemoryBank(stm_capacity=10, ltm_max=100)
        self.MemoryType = MemoryType

    def test_remember_stm(self):
        entry = self.bank.remember("任务分解: A->B->C", self.MemoryType.PLAN)
        assert entry.memory_id
        assert self.bank.stm.size == 1

    def test_remember_ltm(self):
        self.bank.remember("事实: 水在100度沸腾", self.MemoryType.FACT, importance=0.8)
        assert self.bank.ltm.size == 1

    def test_recall_by_query(self):
        self.bank.remember("任务X被分解为A->B->C", self.MemoryType.PLAN, tags=["decompose"])
        self.bank.remember("任务Y被分解为D->E->F", self.MemoryType.PLAN, tags=["decompose"])
        results = self.bank.recall("任务X 分解", memory_type=self.MemoryType.PLAN, limit=5)
        assert len(results) >= 1

    def test_recall_by_tags(self):
        self.bank.remember("经验: 质量审查有效", self.MemoryType.EXPERIENCE, tags=["review"])
        self.bank.remember("事实: 代码已提交", self.MemoryType.FACT, tags=["git"])
        results = self.bank.recall("", tags=["review"])
        assert len(results) == 1
        assert results[0].tags == ["review"]

    def test_consolidate(self):
        self.bank.remember("不重要", self.MemoryType.FACT, importance=0.05)
        self.bank.remember("重要", self.MemoryType.FACT, importance=0.9)
        removed = self.bank.consolidate()
        assert removed == 1

    def test_stats(self):
        self.bank.remember("测试1", self.MemoryType.FACT)
        self.bank.remember("测试2", self.MemoryType.FACT)
        stats = self.bank.stats()
        assert stats["stm_size"] >= 1
        assert stats["ltm_size"] >= 1
        assert stats["total"] >= 1

    def test_stm_capacity(self):
        for i in range(15):
            self.bank.remember(f"测试{i}", self.MemoryType.FACT)
        assert self.bank.stm.size <= self.bank.stm.capacity

    def test_recall_empty(self):
        results = self.bank.recall("不存在的查询")
        assert results == []

    def test_export_snapshot(self):
        self.bank.remember("测试", self.MemoryType.FACT)
        snapshot = self.bank.export_snapshot()
        assert "stm" in snapshot
        assert "ltm_size" in snapshot
        assert snapshot["ltm_size"] == 1

    def test_ltm_similarity_search(self):
        self.bank.remember("多智能体协作提升结果鲁棒性", self.MemoryType.PATTERN, importance=0.9)
        self.bank.remember("Python 代码审查流程", self.MemoryType.PATTERN, importance=0.7)
        results = self.bank.recall("智能体 协作")
        assert len(results) > 0


class TestSandbox:
    """执行沙箱测试。"""

    def setup_method(self):
        from cee.sandbox import (
            ExecutionSandbox, ResourceLimits, SandboxPolicy,
            TokenBudget, TimeBudget, ViolationType,
        )
        self.Sandbox = ExecutionSandbox
        self.Limits = ResourceLimits
        self.Policy = SandboxPolicy
        self.TokenBudget = TokenBudget
        self.TimeBudget = TimeBudget
        self.VType = ViolationType

    def test_token_budget(self):
        tb = self.TokenBudget(max_tokens=1000)
        assert tb.remaining == 1000
        assert tb.consume(300)
        assert tb.remaining == 700
        assert not tb.consume(800)
        assert tb.used == 300

    def test_token_budget_reset(self):
        tb = self.TokenBudget(max_tokens=100)
        tb.consume(50)
        assert tb.remaining == 50
        tb.reset()
        assert tb.remaining == 100

    def test_time_budget(self):
        tb = self.TimeBudget(max_seconds=1.0)
        assert not tb.is_expired
        tb.start()
        assert not tb.is_expired
        tb.stop()
        assert not tb.is_expired

    def test_sandbox_pre_check_ok(self):
        sandbox = self.Sandbox(self.Limits(max_token_budget=1000))
        ok, violations = sandbox.pre_check(estimated_tokens=100)
        assert ok

    def test_sandbox_pre_check_token_exceeded(self):
        sandbox = self.Sandbox(self.Limits(max_token_budget=100, policy=self.Policy.STRICT))
        ok, violations = sandbox.pre_check(estimated_tokens=200)
        assert not ok
        assert len(violations) > 0

    def test_sandbox_post_check(self):
        sandbox = self.Sandbox()
        result = sandbox.post_check(execution_time=10.0, tokens_used=512)
        assert result.success

    def test_sandbox_network_check(self):
        sandbox = self.Sandbox(self.Limits(
            allowed_domains=["api.example.com"],
            policy=self.Policy.STRICT,
        ))
        assert sandbox.check_network("api.example.com")
        assert not sandbox.check_network("evil.com")

    def test_sandbox_file_check(self):
        sandbox = self.Sandbox(self.Limits(
            allowed_file_paths=["/tmp"],
            policy=self.Policy.STRICT,
        ))
        assert sandbox.check_file_access("/tmp/test.py")
        assert not sandbox.check_file_access("/etc/passwd")

    def test_sandbox_stats(self):
        sandbox = self.Sandbox()
        stats = sandbox.stats()
        assert "limits" in stats
        assert "token_budget" in stats
        assert "violation_count" in stats

    def test_sandbox_reset(self):
        sandbox = self.Sandbox()
        sandbox.reset()
        stats = sandbox.stats()
        assert stats["violation_count"] == 0

    def test_monitor_mode_allows_all(self):
        sandbox = self.Sandbox(self.Limits(max_token_budget=10, policy=self.Policy.MONITOR))
        ok, violations = sandbox.pre_check(estimated_tokens=999999)
        assert ok


class TestTraceLog:
    """决策轨迹日志测试。"""

    def setup_method(self):
        from cee.trace import (
            TraceLog, DecisionType, DecisionMethod,
            DecisionContext, DecisionAlternatives,
        )
        self.log = TraceLog()
        self.DType = DecisionType
        self.DMethod = DecisionMethod

    def test_record_decision(self):
        dp = self.log.record(
            self.DType.TASK_DECOMPOSITION,
            self.DMethod.HEURISTIC,
            question="如何分解任务X?",
            chosen=["A", "B", "C"],
            confidence=0.85,
            reasoning="按阶段分解",
        )
        assert dp.decision_id.startswith("dp-")
        assert self.log.size == 1

    def test_query_by_type(self):
        self.log.record(self.DType.TASK_DECOMPOSITION, question="Q1")
        self.log.record(self.DType.CONSENSUS_SELECTION, question="Q2")
        self.log.record(self.DType.AGENT_ASSIGNMENT, question="Q3")

        results = self.log.query(decision_type=self.DType.TASK_DECOMPOSITION)
        assert len(results) == 1
        assert results[0].decision_type == self.DType.TASK_DECOMPOSITION

    def test_trace_chain(self):
        root = self.log.record(self.DType.TASK_DECOMPOSITION, question="根决策")
        child = self.log.record(
            self.DType.AGENT_ASSIGNMENT,
            question="子决策",
            parent_decision_id=root.decision_id,
        )
        chain = self.log.trace(child.decision_id)
        assert len(chain) == 2
        assert chain[0].decision_id == root.decision_id
        assert chain[1].decision_id == child.decision_id

    def test_get_reasoning_chain(self):
        dp = self.log.record(
            self.DType.STRATEGY_CHOICE,
            question="选择策略?",
            chosen="A",
            reasoning="A比B更好因为...",
        )
        chain = self.log.get_reasoning_chain(dp.decision_id)
        assert len(chain) == 1
        assert chain[0]["chosen"] == "A"

    def test_stats(self):
        self.log.record(self.DType.TASK_DECOMPOSITION)
        self.log.record(self.DType.TASK_DECOMPOSITION)
        self.log.record(self.DType.CONSENSUS_SELECTION)
        stats = self.log.stats()
        assert stats["total_decisions"] == 3
        assert "by_type" in stats
        assert stats["by_type"]["task_decomposition"] == 2

    def test_export(self):
        self.log.record(self.DType.TASK_DECOMPOSITION, question="测试")
        exported = self.log.export()
        assert len(exported) == 1
        assert exported[0]["question"] == "测试"

    def test_non_existent_trace(self):
        chain = self.log.trace("不存在的ID")
        assert chain == []

    def test_query_with_session(self):
        from cee.trace import DecisionContext
        ctx = DecisionContext(session_id="sess-1")
        self.log.record(self.DType.TASK_DECOMPOSITION, context=ctx, question="Q1")
        results = self.log.query(session_id="sess-1")
        assert len(results) == 1


class TestHumanApproval:
    """人类审批闸门测试。"""

    def setup_method(self):
        from cee.core.human_approval import (
            HumanApprovalGate, ApprovalStatus, RiskLevel,
        )
        self.gate = HumanApprovalGate(risk_threshold=RiskLevel.HIGH)
        self.ApprovalStatus = ApprovalStatus
        self.RiskLevel = RiskLevel

    def test_needs_approval(self):
        assert self.gate.needs_approval("test", self.RiskLevel.HIGH)
        assert not self.gate.needs_approval("test", self.RiskLevel.MEDIUM)

    def test_request_and_approve(self):
        req = self.gate.request_approval("发送邮件", "发送报告给客户", self.RiskLevel.HIGH)
        assert req.status == self.ApprovalStatus.PENDING
        assert self.gate.pending_count == 1

        resp = self.gate.approve(req.request_id, approver="admin")
        assert resp.status == self.ApprovalStatus.APPROVED
        assert self.gate.pending_count == 0

    def test_request_and_reject(self):
        req = self.gate.request_approval("执行交易", risk_level=self.RiskLevel.CRITICAL)
        resp = self.gate.reject(req.request_id, reason="风险太高")
        assert resp.status == self.ApprovalStatus.REJECTED

    def test_wait_for_approval(self):
        req = self.gate.request_approval("操作X", risk_level=self.RiskLevel.HIGH)
        self.gate.approve(req.request_id)
        resp = self.gate.wait_for_approval(request_id=req.request_id)
        assert resp.status == self.ApprovalStatus.APPROVED

    def test_wait_timeout(self):
        req = self.gate.request_approval(
            "操作Y", risk_level=self.RiskLevel.HIGH, timeout_seconds=0.1)
        start = time.time()
        resp = self.gate.wait_for_approval(request=req, timeout=0.2)
        elapsed = time.time() - start
        assert resp.status == self.ApprovalStatus.TIMEOUT
        assert elapsed < 1.0

    def test_pending_requests(self):
        self.gate.request_approval("A", risk_level=self.RiskLevel.HIGH)
        self.gate.request_approval("B", risk_level=self.RiskLevel.HIGH)
        pending = self.gate.get_pending_requests()
        assert len(pending) == 2

    def test_history(self):
        req = self.gate.request_approval("C", risk_level=self.RiskLevel.HIGH)
        self.gate.approve(req.request_id)
        history = self.gate.get_history()
        assert len(history) == 1

    def test_stats(self):
        req = self.gate.request_approval("D", risk_level=self.RiskLevel.HIGH)
        self.gate.approve(req.request_id)
        stats = self.gate.stats()
        assert stats["pending"] == 0
        assert stats["history_total"] >= 1

    def test_reset(self):
        self.gate.request_approval("E", risk_level=self.RiskLevel.HIGH)
        self.gate.reset()
        assert self.gate.pending_count == 0

    def test_low_risk_bypasses_gate(self):
        req = self.gate.request_approval("低风险操作", risk_level=self.RiskLevel.LOW)
        assert req.status == self.ApprovalStatus.PENDING


class TestExploreExploit:
    """探索-利用控制器测试。"""

    def setup_method(self):
        from cee.learning.explore_exploit import (
            EpsilonGreedyController, GreedyStrategy, NoveltyTracker,
        )
        self.eg = EpsilonGreedyController(epsilon=0.2, decay=0.999)
        self.GS = GreedyStrategy
        self.NoveltyTracker = NoveltyTracker

    def test_register_strategy(self):
        record = self.eg.register_strategy("baseline", {"a": 1})
        assert record.strategy_id
        assert self.eg.strategy_count == 1

    def test_select_strategy(self):
        self.eg.register_strategy("baseline", {"a": 1})
        self.eg.register_strategy("experiment", {"a": 2})
        chosen = self.eg.select_strategy()
        assert chosen is not None
        assert chosen.status.value in ("untested", "testing")

    def test_update_and_proven(self):
        self.eg.register_strategy("good", {"x": 10})
        sid = list(self.eg._strategies.keys())[0]
        for _ in range(5):
            self.eg.update(sid, score=0.85, success=True)
        record = self.eg._strategies[sid]
        assert record.avg_score > 0.7
        assert record.status.value in ("proven", "testing")

    def test_get_best_strategies(self):
        s1 = self.eg.register_strategy("best", {"q": 1})
        for _ in range(5):
            self.eg.update(s1.strategy_id, score=0.9, success=True)
        s2 = self.eg.register_strategy("worst", {"q": 2})
        for _ in range(3):
            self.eg.update(s2.strategy_id, score=0.2, success=False)

        best = self.eg.get_best_strategies(top_k=2)
        assert len(best) == 2
        assert best[0].avg_score >= best[1].avg_score

    def test_novelty_tracker(self):
        nt = self.NoveltyTracker(threshold=0.2)
        nt.update_baseline("s1", 0.5)
        is_novel, surprise = nt.check_novelty("s1", 0.85)
        assert is_novel
        assert surprise > 0.2

    def test_epsilon_decay(self):
        from cee.learning.explore_exploit import EpsilonGreedyController
        eg = EpsilonGreedyController(epsilon=0.5, decay=0.5, min_epsilon=0.01)
        for _ in range(5):
            eg.select_strategy()
        assert eg.epsilon < 0.5

    def test_thompson_sampling(self):
        from cee.learning.explore_exploit import EpsilonGreedyController
        eg = EpsilonGreedyController(strategy=self.GS.THOMPSON_SAMPLING)
        eg.register_strategy("ts", {"a": 1})
        chosen = eg.select_strategy()
        assert chosen is not None

    def test_stats(self):
        self.eg.register_strategy("s1", {"a": 1})
        self.eg.register_strategy("s2", {"a": 2})
        stats = self.eg.stats()
        assert stats["total_strategies"] == 2
        assert "epsilon" in stats

    def test_empty_select(self):
        from cee.learning.explore_exploit import EpsilonGreedyController
        eg = EpsilonGreedyController()
        chosen = eg.select_strategy()
        assert chosen is None

    def test_reset(self):
        self.eg.register_strategy("s", {"a": 1})
        self.eg.reset()
        assert self.eg.strategy_count == 0
        assert self.eg.epsilon == 0.2


class TestMetaRouter:
    """元认知路由器测试。"""

    def setup_method(self):
        from cee.core.meta_router import MetaRouter, WorkflowCategory
        self.router = MetaRouter()
        self.WC = WorkflowCategory

    def test_route_code_generation(self):
        result = self.router.route("写 Python 代码")
        assert result.category == self.WC.CODE_GENERATION
        assert "coder" in result.template.roles

    def test_route_translation(self):
        result = self.router.route("翻译这段英文到中文")
        assert result.category == self.WC.TRANSLATION

    def test_route_debate(self):
        result = self.router.route("发起一场关于AI的辩论")
        assert result.category == self.WC.DEBATE

    def test_route_data_analysis(self):
        result = self.router.route("分析数据")
        assert result.category == self.WC.DATA_ANALYSIS

    def test_route_research(self):
        result = self.router.route("研究量子计算方向")
        assert result.category == self.WC.RESEARCH

    def test_route_devops(self):
        result = self.router.route("部署到 Docker")
        assert result.category == self.WC.DEVOPS

    def test_route_default(self):
        result = self.router.route("你好")
        assert result.category == self.WC.GENERAL
        assert result.confidence <= 0.3

    def test_route_confidence(self):
        result = self.router.route("写代码")
        assert result.confidence >= 0.7

    def test_list_templates(self):
        templates = self.router.list_templates()
        assert len(templates) >= 10

    def test_stats(self):
        self.router.route("写代码")
        self.router.route("翻译")
        stats = self.router.stats()
        assert stats["total_routes"] == 2

    def test_reset(self):
        self.router.route("写代码")
        self.router.reset()
        assert self.router.stats()["total_routes"] == 0


class TestSkillMarket:
    """技能市场测试。"""

    def setup_method(self):
        from cee.plugin.skill_market import (
            SkillRegistry, SkillManifest, SkillCategory, ToolDefinition,
        )
        self.registry = SkillRegistry()
        self.SkillManifest = SkillManifest
        self.SkillCategory = SkillCategory
        self.ToolDef = ToolDefinition

    def test_register_skill(self):
        skill = self.SkillManifest(
            name="客服专家",
            category=self.SkillCategory.SUPPORT,
            prompt_fragment="你是专业客服。",
        )
        assert self.registry.register(skill)
        assert self.registry.skill_count == 1

    def test_duplicate_register(self):
        s1 = self.SkillManifest(name="技能A", prompt_fragment="A")
        assert self.registry.register(s1)
        assert not self.registry.register(s1)

    def test_unregister(self):
        skill = self.SkillManifest(name="临时技能", prompt_fragment="T")
        self.registry.register(skill)
        assert self.registry.unregister("临时技能")
        assert self.registry.skill_count == 0

    def test_assign_to_agent(self):
        self.registry.register(self.SkillManifest(
            name="代码审查", category=self.SkillCategory.CODING,
            prompt_fragment="审查代码质量。"))
        count = self.registry.assign_to_agent("agent_1", ["代码审查"])
        assert count == 1
        skills = self.registry.get_agent_skills("agent_1")
        assert len(skills) == 1
        assert skills[0].name == "代码审查"

    def test_hot_swap(self):
        self.registry.register(self.SkillManifest(name="A", prompt_fragment="PA"))
        self.registry.register(self.SkillManifest(name="B", prompt_fragment="PB"))
        self.registry.hot_swap("agent_1", ["A"])
        assert len(self.registry.get_agent_skills("agent_1")) == 1
        self.registry.hot_swap("agent_1", ["B"])
        assert len(self.registry.get_agent_skills("agent_1")) == 1
        assert self.registry.get_agent_skills("agent_1")[0].name == "B"

    def test_get_agent_prompt(self):
        self.registry.register(self.SkillManifest(
            name="客服", prompt_fragment="友善回答。"))
        self.registry.assign_to_agent("a1", ["客服"])
        prompt = self.registry.get_agent_prompt("a1")
        assert "客服" in prompt
        assert "友善回答" in prompt

    def test_list_by_category(self):
        self.registry.register(self.SkillManifest(
            name="C1", category=self.SkillCategory.CODING, prompt_fragment="C"))
        self.registry.register(self.SkillManifest(
            name="W1", category=self.SkillCategory.WRITING, prompt_fragment="W"))
        coding = self.registry.list_by_category(self.SkillCategory.CODING)
        assert len(coding) == 1
        assert coding[0].name == "C1"

    def test_list_by_tag(self):
        self.registry.register(self.SkillManifest(
            name="Python", tags=["python", "coding"], prompt_fragment="P"))
        self.registry.register(self.SkillManifest(
            name="Java", tags=["java", "coding"], prompt_fragment="J"))
        results = self.registry.list_by_tag("python")
        assert len(results) == 1

    def test_stats(self):
        self.registry.register(self.SkillManifest(
            name="S1", prompt_fragment="A",
            tools=[self.ToolDef(name="tool1", description="d")]))
        stats = self.registry.stats()
        assert stats["total_skills"] == 1
        assert stats["total_tools"] == 1

    def test_reset(self):
        self.registry.register(self.SkillManifest(name="S", prompt_fragment="X"))
        self.registry.reset()
        assert self.registry.skill_count == 0

    def test_dependency_check(self):
        dep_skill = self.SkillManifest(name="dep", prompt_fragment="D")
        main_skill = self.SkillManifest(name="main", prompt_fragment="M", dependencies=["dep"])
        assert not self.registry.register(main_skill)
        self.registry.register(dep_skill)
        assert self.registry.register(main_skill)


class TestPostMortem:
    """事后复盘器测试。"""

    def setup_method(self):
        from cee.agent.post_mortem import PostMortemAgent, ExecutionTrace
        self.pm = PostMortemAgent()
        self.ET = ExecutionTrace

    def test_analyze_success(self):
        trace = self.ET(
            session_id="s1",
            goal="测试任务",
            status="success",
            tasks=[
                {"status": "COMPLETED"},
                {"status": "COMPLETED"},
                {"status": "COMPLETED"},
            ],
            duration_seconds=30.0,
            consensus_rounds=2,
            agent_count=3,
        )
        report = self.pm.analyze(trace)
        assert report.summary
        assert len(report.lessons) >= 1
        assert "成功完成" in report.summary

    def test_analyze_failure(self):
        trace = self.ET(
            session_id="s2",
            goal="失败任务",
            status="failed",
            tasks=[
                {"status": "FAILED"},
                {"status": "COMPLETED"},
            ],
            error_messages=["连接超时"],
            duration_seconds=60.0,
            consensus_rounds=4,
            agent_count=1,
        )
        report = self.pm.analyze(trace)
        assert "失败" in report.summary
        assert len(report.ineffective_strategies) >= 1
        assert report.recommendations

    def test_lessons_extracted(self):
        trace = self.ET(
            session_id="s3",
            goal="复杂任务",
            status="success",
            tasks=[{"status": "COMPLETED"}] * 5,
            duration_seconds=45.0,
            consensus_rounds=2,
            agent_count=4,
        )
        report = self.pm.analyze(trace)
        lesson_types = {l.lesson_type.value for l in report.lessons}
        assert len(lesson_types) >= 1

    def test_recommendations(self):
        trace = self.ET(
            session_id="s4",
            goal="慢任务",
            status="success",
            tasks=[{"status": "COMPLETED"}],
            duration_seconds=500.0,
            consensus_rounds=5,
            agent_count=1,
        )
        report = self.pm.analyze(trace)
        assert len(report.recommendations) >= 1

    def test_risk_identification(self):
        trace = self.ET(
            session_id="s5",
            goal="大规模任务",
            status="success",
            tasks=[],
            agent_count=15,
            consensus_rounds=0,
            duration_seconds=700,
        )
        report = self.pm.analyze(trace)
        assert len(report.risk_alerts) >= 1

    def test_query_lessons(self):
        trace = self.ET(
            session_id="s6",
            goal="Q",
            status="success",
            tasks=[{"status": "COMPLETED"}] * 3,
            duration_seconds=10,
            consensus_rounds=1,
            agent_count=2,
        )
        self.pm.analyze(trace)
        lessons = self.pm.query_lessons(limit=5)
        assert len(lessons) >= 1

    def test_stats(self):
        trace = self.ET(
            session_id="s7", goal="S", status="success",
            tasks=[], duration_seconds=5, consensus_rounds=1, agent_count=1)
        self.pm.analyze(trace)
        stats = self.pm.stats()
        assert stats["total_reports"] == 1
        assert stats["total_lessons"] >= 1

    def test_metrics(self):
        trace = self.ET(
            session_id="s8",
            goal="M",
            status="success",
            tasks=[
                {"status": "COMPLETED"},
                {"status": "COMPLETED"},
                {"status": "FAILED"},
            ],
            error_messages=["err1"],
            duration_seconds=10,
            consensus_rounds=1,
            agent_count=2,
        )
        report = self.pm.analyze(trace)
        assert report.metrics["tasks_completed"] == 2
        assert report.metrics["tasks_failed"] == 1
        assert report.metrics["tasks_total"] == 3
        assert report.metrics["error_count"] == 1


class TestAgentParliament:
    """智能体议会测试。"""

    def setup_method(self):
        from cee.agent.parliament import (
            DebateOrchestrator, DebateSessionManager, DebateRole, ArgumentQuality,
        )
        self.orch = DebateOrchestrator()
        self.mgr = DebateSessionManager()
        self.DRole = DebateRole
        self.AQ = ArgumentQuality

    def test_create_session(self):
        session = self.mgr.create_session("AI 应该自主决策吗?", max_rounds=3)
        assert session.session_id
        assert session.status == "active"

    def test_add_argument(self):
        session = self.mgr.create_session("测试辩论")
        arg = self.mgr.add_argument(
            session.session_id, 1, self.DRole.PROPONENT,
            "观点A", evidence=["证据1"],
        )
        assert arg is not None
        assert arg.role == self.DRole.PROPONENT
        assert len(session.rounds) == 1

    def test_add_both_sides(self):
        session = self.mgr.create_session("T")
        self.mgr.add_argument(session.session_id, 1, self.DRole.PROPONENT, "正方")
        self.mgr.add_argument(session.session_id, 1, self.DRole.OPPONENT, "反方")
        assert session.rounds[0].proponent_argument.content == "正方"
        assert session.rounds[0].opponent_argument.content == "反方"

    def test_cross_examination(self):
        session = self.mgr.create_session("T")
        self.mgr.add_argument(session.session_id, 1, self.DRole.PROPONENT, "P")
        self.mgr.add_argument(session.session_id, 1, self.DRole.OPPONENT, "O")
        assert self.mgr.add_cross_examination(session.session_id, 1, "有何漏洞?")
        assert len(session.rounds[0].cross_examination) == 1

    def test_resolve(self):
        session = self.mgr.create_session("T")
        self.mgr.add_argument(session.session_id, 1, self.DRole.PROPONENT, "强观点" * 100)
        self.mgr.add_argument(session.session_id, 1, self.DRole.OPPONENT, "弱")
        resolution, winner, pro_score, opp_score = self.mgr.resolve(session.session_id)
        assert winner is not None
        assert pro_score > 0
        assert opp_score > 0
        assert session.status == "resolved"

    def test_run_debate(self):
        result = self.orch.run_debate(
            topic="是否使用加权共识?",
            proponent_content=["加权减少噪声", "更精确的决策"],
            opponent_content=["多数投票简单高效", "加权引入偏见"],
            max_rounds=2,
        )
        assert result["resolution"]
        assert result["rounds"] == 2
        assert result["winner"] in ("proponent", "opponent", "draw")

    def test_stats(self):
        self.orch.run_debate(
            "T",
            proponent_content=["P1"],
            opponent_content=["O1"],
            max_rounds=1,
        )
        stats = self.orch.stats()
        assert stats["total_sessions"] == 1
        assert stats["resolved"] == 1

    def test_reset(self):
        self.mgr.create_session("T")
        self.mgr.reset()
        assert self.mgr.stats()["total_sessions"] == 0

    def test_empty_round_handling(self):
        session = self.mgr.create_session("空辩论")
        self.mgr.add_argument(session.session_id, 3, self.DRole.PROPONENT, "跳过") # round 3
        assert len(session.rounds) == 3


class TestShadowOps:
    """影子运维测试。"""

    def setup_method(self):
        from cee.learning.shadow_ops import (
            ShadowRunner, ShadowConfig, HyperOptimizer, OptimizationDimension,
        )
        self.runner = ShadowRunner()
        self.ShadowConfig = ShadowConfig
        self.HyperOptimizer = HyperOptimizer
        self.OD = OptimizationDimension

    def test_set_shadow_config(self):
        config = self.ShadowConfig(
            name="finer",
            params={"task_granularity": "fine"},
            description="更细粒度",
        )
        self.runner.set_shadow_config(config)
        assert len(self.runner.get_shadow_configs()) == 1

    def test_replace_config(self):
        self.runner.set_shadow_config(self.ShadowConfig(name="A", params={"x": 1}))
        self.runner.set_shadow_config(self.ShadowConfig(name="A", params={"x": 2}))
        configs = self.runner.get_shadow_configs()
        assert len(configs) == 1
        assert configs[0].params["x"] == 2

    def test_compare_shadow_wins(self):
        self.runner.set_shadow_config(self.ShadowConfig(name="better", params={"x": 2}))
        result = self.runner.compare(
            main_output="short result",
            shadow_output="detailed analysis with conclusion and recommendations",
            main_cost={"time": 1.0},
            shadow_cost={"time": 1.5},
        )
        assert result.shadow_wins
        assert result.improvement > 0
        assert result.winner == "shadow"

    def test_compare_main_wins(self):
        self.runner.set_shadow_config(self.ShadowConfig(name="worse", params={"x": -1}))
        result = self.runner.compare(
            main_output="comprehensive analysis with detailed conclusions and recommendations",
            shadow_output="short",
            config_name="worse",
        )
        assert not result.shadow_wins

    def test_trial_count(self):
        self.runner.set_shadow_config(self.ShadowConfig(name="s", params={"a": 1}))
        self.runner.compare("a", "b")
        assert self.runner.trial_count == 1

    def test_generate_advice_no_data(self):
        advice = self.runner.generate_advice(min_trials=5)
        assert advice == []

    def test_hyper_optimizer_grid_search(self):
        ho = self.HyperOptimizer()
        ho.set_param_space(x=[1, 2, 3], y=[10, 20])

        def eval_fn(params):
            return params.get("x", 0) * 10 + params.get("y", 0)

        results = ho.grid_search(eval_fn, top_k=3)
        assert len(results) >= 1

    def test_hyper_optimizer_simulated_annealing(self):
        ho = self.HyperOptimizer()
        ho.set_param_space(temp=[0.5, 0.7, 0.9])

        def eval_fn(params):
            return 1.0 - abs(params.get("temp", 0.5) - 0.7)

        best = ho.simulated_annealing(eval_fn, iterations=30, initial_temp=1.0)
        assert "temp" in best

    def test_stats(self):
        self.runner.set_shadow_config(self.ShadowConfig(name="s", params={"a": 1}))
        self.runner.compare("main output", "shadow output with more content")
        stats = self.runner.stats()
        assert stats["total_trials"] == 1
        assert "avg_improvement" in stats

    def test_reset(self):
        self.runner.set_shadow_config(self.ShadowConfig(name="s", params={"a": 1}))
        self.runner.compare("a", "b")
        self.runner.reset()
        assert self.runner.trial_count == 0
        assert len(self.runner.get_shadow_configs()) == 0
