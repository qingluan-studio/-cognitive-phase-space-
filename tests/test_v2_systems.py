"""CEE v2.0.0 — Comprehensive test suite for all six new subsystems.

Tests cover:
- agent/: BaseAgent, LLMAgent, CodeAgent, CriticAgent, MessageBus,
         TaskDecomposer, ConsensusEngine, MultiAgentOrchestrator
- plugin/: BasePlugin, PluginManager, Hooks
- processing/: LongTextProcessor, DataPipeline, DocReader, OutputFormatter
- learning/: FeedbackStore, AutoLearner, HyperOptimizer
- cloud/: EnvironmentDetector, HealthMonitor, CloudAutoConfig
"""

import json
import time
import uuid

import pytest

# ============================================================
# Agent Framework Tests
# ============================================================


class TestAgentTypes:
    """Agent type definitions."""

    def test_agent_capability_enum(self):
        from cee.agent.types import AgentCapability
        assert AgentCapability.TEXT_GENERATION.value == "text_generation"
        assert AgentCapability.CODE_GENERATION in AgentCapability
        assert len(list(AgentCapability)) >= 10

    def test_agent_role_enum(self):
        from cee.agent.types import AgentRole
        assert AgentRole.RESEARCHER.value == "researcher"
        assert AgentRole.CODER in AgentRole

    def test_agent_config_defaults(self):
        from cee.agent.types import AgentConfig
        config = AgentConfig()
        assert config.agent_id
        assert config.max_iterations == 10
        assert config.temperature == 0.7
        assert config.enabled

    def test_task_dataclass(self):
        from cee.agent.types import Task, TaskStatus
        task = Task(title="Test Task", description="A test")
        assert task.task_id
        assert task.status == TaskStatus.PENDING
        assert task.estimated_complexity == 0.5

    def test_agent_message(self):
        from cee.agent.types import AgentMessage, MessageType
        msg = AgentMessage(msg_type=MessageType.TASK_ASSIGN, content="Hello")
        assert msg.msg_id
        assert msg.msg_type == MessageType.TASK_ASSIGN

    def test_orchestration_plan(self):
        from cee.agent.types import OrchestrationPlan
        plan = OrchestrationPlan(goal="Build a system")
        assert plan.plan_id
        assert plan.goal == "Build a system"

    def test_consensus_result(self):
        from cee.agent.types import ConsensusResult, ConsensusType
        result = ConsensusResult(question="Q?", consensus_type=ConsensusType.MAJORITY)
        assert result.consensus_id
        assert result.question == "Q?"

    def test_message_type_enum(self):
        from cee.agent.types import MessageType
        assert MessageType.TASK_ASSIGN.value == "task_assign"
        assert MessageType.BROADCAST in MessageType

    def test_task_status_enum(self):
        from cee.agent.types import TaskStatus
        assert TaskStatus.PENDING.value == "pending"
        assert TaskStatus.COMPLETED in TaskStatus


class TestBaseAgent:
    """BaseAgent lifecycle and memory."""

    def test_agent_creation_default(self):
        from cee.agent import BaseAgent
        from cee.agent.types import AgentConfig, AgentRole

        class TestAgent(BaseAgent):
            def execute_task(self, task):
                return "done"
            def get_system_prompt(self):
                return "prompt"

        agent = TestAgent()
        assert agent.agent_id
        assert agent.role == AgentRole.RESEARCHER
        assert agent.state.value == "idle"

    def test_agent_capability_check(self):
        from cee.agent import BaseAgent
        from cee.agent.types import AgentCapability, AgentConfig

        class TestAgent(BaseAgent):
            def execute_task(self, task):
                return "done"
            def get_system_prompt(self):
                return "prompt"

        cfg = AgentConfig(capabilities=[AgentCapability.CODE_GENERATION, AgentCapability.ANALYSIS])
        agent = TestAgent(cfg)
        assert agent.has_capability(AgentCapability.CODE_GENERATION)
        assert not agent.has_capability(AgentCapability.TRANSLATION)

    def test_agent_has_any_capability(self):
        from cee.agent import BaseAgent
        from cee.agent.types import AgentCapability, AgentConfig

        class TestAgent(BaseAgent):
            def execute_task(self, task):
                return "done"
            def get_system_prompt(self):
                return "prompt"

        cfg = AgentConfig(capabilities=[AgentCapability.ANALYSIS])
        agent = TestAgent(cfg)
        assert agent.has_any_capability([AgentCapability.ANALYSIS])
        assert not agent.has_any_capability([AgentCapability.CODE_GENERATION])
        assert agent.has_any_capability([])

    def test_agent_memory_management(self):
        from cee.agent import BaseAgent, AgentMemoryEntry

        class TestAgent(BaseAgent):
            def execute_task(self, task):
                return "done"
            def get_system_prompt(self):
                return "prompt"

        agent = TestAgent()
        entry = agent.add_memory("test observation", entry_type="observation", importance=0.8)
        assert len(agent.memory) == 1
        assert entry.importance == 0.8

        agent.add_memory("test decision", entry_type="decision", importance=0.5)
        results = agent.recall(entry_type="observation")
        assert len(results) == 1
        assert results[0].content == "test observation"

    def test_agent_memory_importance_recall(self):
        from cee.agent import BaseAgent

        class TestAgent(BaseAgent):
            def execute_task(self, task):
                return "done"
            def get_system_prompt(self):
                return "prompt"

        agent = TestAgent()
        agent.add_memory("low", importance=0.1)
        agent.add_memory("high", importance=0.9)
        results = agent.recall(min_importance=0.5)
        assert len(results) == 1
        assert results[0].content == "high"

    def test_agent_memory_size_limit(self):
        from cee.agent import BaseAgent, AgentConfig

        class TestAgent(BaseAgent):
            def execute_task(self, task):
                return "done"
            def get_system_prompt(self):
                return "prompt"

        cfg = AgentConfig(memory_size=5)
        agent = TestAgent(cfg)
        for i in range(10):
            agent.add_memory(f"entry_{i}", importance=0.5 + i * 0.05)
        assert len(agent.memory) <= 8

    def test_agent_state_transitions(self):
        from cee.agent import BaseAgent, AgentState

        class TestAgent(BaseAgent):
            def execute_task(self, task):
                self.set_state(AgentState.DONE)
                return "done"
            def get_system_prompt(self):
                return "prompt"

        agent = TestAgent()
        agent.set_state(AgentState.WORKING)
        assert agent.state == AgentState.WORKING

    def test_agent_can_accept_task(self):
        from cee.agent import BaseAgent

        class TestAgent(BaseAgent):
            def execute_task(self, task):
                return "done"
            def get_system_prompt(self):
                return "prompt"

        agent = TestAgent()
        assert agent.can_accept_task()

    def test_agent_tool_registration(self):
        from cee.agent import BaseAgent

        class TestAgent(BaseAgent):
            def execute_task(self, task):
                return "done"
            def get_system_prompt(self):
                return "prompt"

        agent = TestAgent()
        agent.register_tool("search", lambda q: f"found: {q}")
        assert agent.get_tool("search") is not None
        assert agent.get_tool("nonexistent") is None
        agent.unregister_tool("search")
        assert agent.get_tool("search") is None

    def test_agent_status_dict(self):
        from cee.agent import BaseAgent

        class TestAgent(BaseAgent):
            def execute_task(self, task):
                return "done"
            def get_system_prompt(self):
                return "prompt"

        agent = TestAgent()
        s = agent.status
        assert "agent_id" in s
        assert "role" in s
        assert "state" in s

    def test_agent_reset(self):
        from cee.agent import BaseAgent

        class TestAgent(BaseAgent):
            def execute_task(self, task):
                return "done"
            def get_system_prompt(self):
                return "prompt"

        agent = TestAgent()
        agent.add_memory("test")
        agent._task_count = 5
        agent.reset()
        assert len(agent.memory) == 0
        assert agent._task_count == 0


class TestLLMAgent:
    """LLMAgent prompt execution."""

    def test_llm_agent_system_prompt_default(self):
        from cee.agent import LLMAgent, AgentConfig, AgentRole
        cfg = AgentConfig(role=AgentRole.CODER)
        agent = LLMAgent(cfg)
        prompt = agent.get_system_prompt()
        assert "developer" in prompt.lower() or "code" in prompt.lower()

    def test_llm_agent_custom_prompt(self):
        from cee.agent import LLMAgent, AgentConfig
        cfg = AgentConfig(system_prompt="Custom system prompt for testing")
        agent = LLMAgent(cfg)
        assert agent.get_system_prompt() == "Custom system prompt for testing"

    def test_llm_agent_execute_without_handler(self):
        from cee.agent import LLMAgent, AgentConfig, Task
        cfg = AgentConfig()
        agent = LLMAgent(cfg)
        result = agent.execute_task(Task(title="Test", description="Say hello"))
        assert "Simulated" in result
        assert agent._task_count == 1

    def test_llm_agent_execute_with_handler(self):
        from cee.agent import LLMAgent, AgentConfig, Task

        def mock_handler(agent_id, messages):
            return f"Response from {agent_id}: {messages[-1]['content'][:50]}"

        cfg = AgentConfig()
        agent = LLMAgent(cfg, completion_handler=mock_handler)
        result = agent.execute_task(Task(title="Test", description="Hello world"))
        assert "Hello world" in result

    def test_llm_agent_error_handling(self):
        from cee.agent import LLMAgent, AgentConfig, Task

        def error_handler(agent_id, messages):
            raise RuntimeError("Simulated error")

        cfg = AgentConfig()
        agent = LLMAgent(cfg, completion_handler=error_handler)
        with pytest.raises(RuntimeError):
            agent.execute_task(Task(title="Test", description="Will fail"))
        assert agent._error_count == 1

    def test_llm_agent_history_management(self):
        from cee.agent import LLMAgent, AgentConfig
        agent = LLMAgent(AgentConfig())
        agent.add_to_history("user", "Hello")
        agent.add_to_history("assistant", "Hi there")
        assert len(agent._conversation_history) == 2

    def test_llm_agent_personality_modulation(self):
        from cee.agent import LLMAgent, AgentConfig, AgentPersonality
        cfg = AgentConfig(personality=AgentPersonality.ANALYTICAL)
        agent = LLMAgent(cfg)
        result = agent._personality_modulation("output")
        assert "analyze" in result.lower()


class TestSpecializedAgents:
    """ResearchAgent, CodeAgent, CriticAgent tests."""

    def test_research_agent_role_prompting(self):
        from cee.agent import ResearchAgent, AgentConfig
        agent = ResearchAgent(AgentConfig())
        prompt = agent.get_system_prompt()
        assert "research" in prompt.lower()

    def test_code_agent_default_capabilities(self):
        from cee.agent import CodeAgent, AgentConfig, AgentCapability
        agent = CodeAgent(AgentConfig())
        assert agent.has_capability(AgentCapability.CODE_GENERATION)

    def test_critic_agent_personality(self):
        from cee.agent import CriticAgent, AgentConfig, AgentPersonality
        agent = CriticAgent(AgentConfig())
        assert agent.personality == AgentPersonality.SKEPTICAL

    def test_critic_agent_critique(self):
        from cee.agent import CriticAgent, AgentConfig
        cfg = AgentConfig()
        agent = CriticAgent(cfg)
        result = agent.critique("Test content", criteria=["clarity"])
        assert "content" in result
        assert "criteria" in result
        assert "verdict" in result

    def test_critic_agent_score(self):
        from cee.agent import CriticAgent, AgentConfig
        agent = CriticAgent(AgentConfig())
        scores = agent.score("Some content")
        assert isinstance(scores, dict)
        assert "overall" in scores


class TestMessageBus:
    """MessageBus pub-sub communication."""

    def test_subscribe_and_send(self):
        from cee.agent import MessageBus, AgentMessage, MessageType
        bus = MessageBus()
        received = []

        def handler(msg):
            received.append(msg)

        bus.subscribe("agent1", handler)
        msg = AgentMessage(msg_type=MessageType.TASK_ASSIGN, receiver_id="agent1", content="test")
        bus.send(msg)
        bus.send(AgentMessage(msg_type=MessageType.TASK_ASSIGN, receiver_id="agent2", content="nobody"))

        assert len(received) == 1
        assert received[0].content == "test"

    def test_broadcast_message(self):
        from cee.agent import MessageBus, AgentMessage, MessageType
        bus = MessageBus()
        received_a: list = []
        received_b: list = []

        bus.subscribe("agent_a", lambda m: received_a.append(m))
        bus.subscribe("agent_b", lambda m: received_b.append(m))
        msg = AgentMessage(msg_type=MessageType.BROADCAST, sender_id="agent_a", content="broadcast")
        bus.send(msg)
        assert len(received_a) == 0
        assert len(received_b) == 1
        assert received_b[0].content == "broadcast"

    def test_unsubscribe(self):
        from cee.agent import MessageBus, AgentMessage, MessageType
        bus = MessageBus()
        received = []

        def handler(msg):
            received.append(msg)

        bus.subscribe("agent1", handler)
        bus.unsubscribe("agent1", handler)
        bus.send(AgentMessage(msg_type=MessageType.TASK_ASSIGN, receiver_id="agent1", content="never"))
        assert len(received) == 0

    def test_send_and_wait(self):
        from cee.agent import MessageBus, AgentMessage, MessageType
        bus = MessageBus()

        def reply_handler(msg):
            reply = AgentMessage(
                msg_type=MessageType.TASK_RESULT,
                sender_id="agent2",
                receiver_id="agent1",
                correlation_id=msg.msg_id,
                content="response",
            )
            bus.send(reply)

        bus.subscribe("agent2", reply_handler)
        msg = AgentMessage(msg_type=MessageType.TASK_QUERY, sender_id="agent1", receiver_id="agent2",
                           content="ping")
        result = bus.send_and_wait(msg, timeout=2.0)
        assert result is not None

    def test_message_history(self):
        from cee.agent import MessageBus, AgentMessage, MessageType
        bus = MessageBus(max_history=5)
        bus.subscribe("agent1", lambda m: None)
        for i in range(10):
            bus.send(AgentMessage(msg_type=MessageType.STATUS_UPDATE, sender_id=f"agent{i}",
                                  content=f"msg{i}"))
        history = bus.get_history()
        assert len(history) <= 7

    def test_topic_subscription(self):
        from cee.agent import MessageBus, AgentMessage, MessageType
        bus = MessageBus()
        received: list = []

        bus.subscribe_topic("agent1", "events")
        bus.subscribe("agent1", lambda m: received.append(m))
        bus.publish("events", AgentMessage(msg_type=MessageType.BROADCAST, sender_id="agent2",
                                           content="event"))
        assert len(received) == 1

    def test_bus_status(self):
        from cee.agent import MessageBus
        bus = MessageBus()
        bus.subscribe("a1", lambda m: None)
        s = bus.status
        assert s["subscriber_count"] == 1
        assert s["topic_count"] == 0

    def test_bus_reset(self):
        from cee.agent import MessageBus, AgentMessage, MessageType
        bus = MessageBus()
        bus.subscribe("a1", lambda m: None)
        bus.send(AgentMessage(msg_type=MessageType.STATUS_UPDATE, content="test"))
        bus.reset()
        assert bus.status["subscriber_count"] == 0
        assert bus.status["history_size"] == 0

    def test_agent_mailbox(self):
        from cee.agent import MessageBus, AgentMessage, MessageType
        bus = MessageBus()
        mbox = bus.create_agent_mailbox("agent_x")

        msg = AgentMessage(msg_type=MessageType.TASK_ASSIGN, receiver_id="agent_x", content="hello")
        bus.send(msg)

        fetched = mbox.fetch()
        assert len(fetched) == 1
        assert fetched[0].content == "hello"
        assert mbox.count() == 0


class TestTaskDecomposer:
    """Task decomposition and DAG handling."""

    def test_simple_decomposition(self):
        from cee.agent import TaskDecomposer
        decomposer = TaskDecomposer()
        goal = "First research the topic, then design architecture, then implement code, then review results"
        tasks = decomposer.decompose(goal)
        assert len(tasks) >= 2

    def test_role_inference(self):
        from cee.agent import TaskDecomposer, AgentRole
        decomposer = TaskDecomposer()
        role = decomposer._infer_role("Code the solution", "implement a function")
        assert role == AgentRole.CODER

    def test_complexity_estimation(self):
        from cee.agent import TaskDecomposer
        decomposer = TaskDecomposer()
        comp = decomposer._estimate_complexity("Build a scalable optimization pipeline with algorithm")
        assert 0.0 <= comp <= 1.0

    def test_dag_validation_no_cycle(self):
        from cee.agent import TaskDecomposer, Task
        decomposer = TaskDecomposer()
        t1 = Task(task_id="t1", title="A")
        t2 = Task(task_id="t2", title="B", dependencies=["t1"])
        decomposer._validate_dag([t1, t2])

    def test_dag_validation_cycle(self):
        from cee.agent import TaskDecomposer, Task
        decomposer = TaskDecomposer()
        t1 = Task(task_id="t1", title="A", dependencies=["t2"])
        t2 = Task(task_id="t2", title="B", dependencies=["t1"])
        with pytest.raises(ValueError):
            decomposer._validate_dag([t1, t2])

    def test_dag_validation_unknown_dep(self):
        from cee.agent import TaskDecomposer, Task
        decomposer = TaskDecomposer()
        t = Task(task_id="t1", dependencies=["nonexistent"])
        with pytest.raises(ValueError):
            decomposer._validate_dag([t])

    def test_parallelism_estimation(self):
        from cee.agent import TaskDecomposer, Task
        decomposer = TaskDecomposer()
        t1 = Task(task_id="t1", title="A")
        t2 = Task(task_id="t2", title="B", dependencies=["t1"])
        t3 = Task(task_id="t3", title="C", dependencies=["t1"])
        waves = decomposer.estimate_parallelism([t1, t2, t3])
        assert len(waves) >= 2


class TestConsensusEngine:
    """Multi-agent consensus and voting."""

    def test_majority_consensus(self):
        from cee.agent import ConsensusEngine, ConsensusType
        engine = ConsensusEngine()
        for aid in ["a1", "a2", "a3"]:
            engine.cast_vote("c1", aid, "accept", 1.0)
        engine.cast_vote("c1", "a4", "reject", 1.0)
        result = engine.resolve("c1", "Approve?", ConsensusType.MAJORITY)
        assert result.decision == "accept"
        assert result.confidence == 0.75

    def test_unanimous_consensus_success(self):
        from cee.agent import ConsensusEngine, ConsensusType
        engine = ConsensusEngine()
        for aid in ["a1", "a2", "a3"]:
            engine.cast_vote("c2", aid, "yes", 1.0)
        result = engine.resolve("c2", "Agree?", ConsensusType.UNANIMOUS)
        assert result.resolved
        assert result.confidence == 1.0

    def test_unanimous_consensus_fail(self):
        from cee.agent import ConsensusEngine, ConsensusType
        engine = ConsensusEngine()
        engine.cast_vote("c3", "a1", "yes", 1.0)
        engine.cast_vote("c3", "a2", "no", 1.0)
        result = engine.resolve("c3", "Agree?", ConsensusType.UNANIMOUS)
        assert not result.resolved

    def test_weighted_consensus(self):
        from cee.agent import ConsensusEngine, ConsensusType
        engine = ConsensusEngine()
        engine.cast_vote("w1", "a1", "A", 5.0)
        engine.cast_vote("w1", "a2", "B", 1.0)
        result = engine.resolve("w1", "Choose?", ConsensusType.WEIGHTED)
        assert result.decision == "A"

    def test_agreement_ratio(self):
        from cee.agent import ConsensusEngine
        engine = ConsensusEngine()
        for aid in ["a1", "a2", "a3"]:
            engine.cast_vote("r1", aid, "X")
        engine.cast_vote("r1", "a4", "Y")
        ratio = engine._agreement_ratio(engine._vote_cache["r1"])
        assert ratio == 0.75

    def test_history_tracking(self):
        from cee.agent import ConsensusEngine
        engine = ConsensusEngine()
        engine.cast_vote("h1", "a1", "yes")
        engine.resolve("h1", "Q?")
        assert len(engine.history) == 1

    def test_reset(self):
        from cee.agent import ConsensusEngine
        engine = ConsensusEngine()
        engine.cast_vote("t1", "a1", "yes")
        engine.resolve("t1", "Q?")
        engine.reset()
        assert len(engine.history) == 0


class TestMultiAgentOrchestrator:
    """Full orchestrator workflow."""

    def test_create_orchestrator(self):
        from cee.agent import MultiAgentOrchestrator
        orch = MultiAgentOrchestrator()
        assert orch._session_id
        assert orch.max_concurrent == 5

    def test_register_agent(self):
        from cee.agent import MultiAgentOrchestrator, LLMAgent, AgentConfig
        orch = MultiAgentOrchestrator()
        agent = LLMAgent(AgentConfig())
        orch.register_agent(agent)
        assert orch._agents[agent.agent_id] == agent

    def test_unregister_agent(self):
        from cee.agent import MultiAgentOrchestrator, LLMAgent, AgentConfig
        orch = MultiAgentOrchestrator()
        agent = LLMAgent(AgentConfig())
        orch.register_agent(agent)
        removed = orch.unregister_agent(agent.agent_id)
        assert removed is not None
        assert len(orch._agents) == 0

    def test_create_agent_by_role(self):
        from cee.agent import MultiAgentOrchestrator, AgentRole
        orch = MultiAgentOrchestrator()
        agent = orch.create_agent(AgentRole.CODER)
        assert agent.role == AgentRole.CODER
        assert agent.agent_id in orch._agents

    def test_form_team(self):
        from cee.agent import MultiAgentOrchestrator, AgentRole
        orch = MultiAgentOrchestrator()
        ids = orch.form_team([AgentRole.RESEARCHER, AgentRole.CODER, AgentRole.CRITIC])
        assert len(ids) == 3
        assert len(orch._agents) == 3

    def test_plan_from_goal(self):
        from cee.agent import MultiAgentOrchestrator, AgentRole
        orch = MultiAgentOrchestrator()
        orch.form_team([AgentRole.RESEARCHER, AgentRole.CODER])
        plan = orch.plan("Research quantum computing then design a quantum algorithm")
        assert plan.goal
        assert len(plan.tasks) >= 1
        assert plan.plan_id

    def test_execute_workflow(self):
        from cee.agent import MultiAgentOrchestrator, AgentRole
        orch = MultiAgentOrchestrator()
        orch.form_team([AgentRole.RESEARCHER, AgentRole.CODER, AgentRole.CRITIC, AgentRole.SYNTHESIZER])
        result = orch.execute("Analyze the benefits of test-driven development and provide a summary")
        assert result["status"] == "completed"
        assert result["goal"]

    def test_synthesize_results(self):
        from cee.agent import MultiAgentOrchestrator, AgentRole, Task, TaskStatus
        orch = MultiAgentOrchestrator()
        orch.create_agent(AgentRole.SYNTHESIZER)
        t1 = Task(task_id="t1", title="Findings", status=TaskStatus.COMPLETED, result="Key finding A")
        t2 = Task(task_id="t2", title="Analysis", status=TaskStatus.COMPLETED, result="Analysis result B")
        result = orch.synthesize([t1, t2])
        assert result is not None

    def test_orchestrator_reset(self):
        from cee.agent import MultiAgentOrchestrator, AgentRole
        orch = MultiAgentOrchestrator()
        orch.form_team([AgentRole.RESEARCHER])
        orch.execute("Test")
        old_session = orch._session_id
        orch.reset()
        assert len(orch._agents) == 0
        assert orch._session_id != old_session

    def test_status_report(self):
        from cee.agent import MultiAgentOrchestrator, AgentRole
        orch = MultiAgentOrchestrator()
        orch.create_agent(AgentRole.CODER)
        s = orch.status
        assert s["agent_count"] == 1
        assert "bus_status" in s


# ============================================================
# Plugin System Tests
# ============================================================


class TestPluginTypes:
    """Plugin type definitions."""

    def test_plugin_state_enum(self):
        from cee.plugin import PluginState
        assert PluginState.UNLOADED.value == "unloaded"
        assert PluginState.ACTIVE in PluginState

    def test_plugin_category_enum(self):
        from cee.plugin import PluginCategory
        assert PluginCategory.ENGINE.value == "engine"
        assert PluginCategory.EXPORTER in PluginCategory

    def test_plugin_metadata_defaults(self):
        from cee.plugin import PluginMetadata
        meta = PluginMetadata(name="test-plugin")
        assert meta.name == "test-plugin"
        assert meta.version == "0.1.0"
        assert meta.enabled

    def test_plugin_metadata_to_dict(self):
        from cee.plugin import PluginMetadata
        meta = PluginMetadata(name="test", version="1.0.0", description="A test plugin")
        d = meta.to_dict()
        assert d["name"] == "test"
        assert d["version"] == "1.0.0"
        assert d["description"] == "A test plugin"


class TestHooks:
    """Hooks registration and triggering."""

    def test_register_hook(self):
        from cee.plugin import Hooks
        hooks = Hooks()
        results = []

        def my_hook(value):
            results.append(value)
            return value

        hooks.register("test_hook", "p1", my_hook)
        hooks.trigger("test_hook", 42)
        assert results == [42]

    def test_hook_chain(self):
        from cee.plugin import Hooks
        hooks = Hooks()

        def step1(v):
            return v + 1
        def step2(v):
            return v * 2

        hooks.register("chain", "p1", step1)
        hooks.register("chain", "p2", step2)
        result = hooks.trigger_chain("chain", 5)
        assert result == 12

    def test_unregister_hook(self):
        from cee.plugin import Hooks
        hooks = Hooks()
        results = []

        hook = lambda v: results.append(v)
        hooks.register("h", "p1", hook)
        hooks.unregister("h", "p1")
        hooks.trigger("h", 1)
        assert len(results) == 0

    def test_hook_priority(self):
        from cee.plugin import Hooks
        hooks = Hooks()
        order = []

        hooks.register("p", "low", lambda v: order.append("low"), priority=0)
        hooks.register("p", "high", lambda v: order.append("high"), priority=10)
        hooks.trigger("p", None)
        assert order[0] == "high"

    def test_list_hooks(self):
        from cee.plugin import Hooks
        hooks = Hooks()
        hooks.register("h1", "p1", lambda v: v)
        hooks.register("h2", "p2", lambda v: v)
        listed = hooks.list_hooks()
        assert "h1" in listed
        assert "p1" in listed["h1"]

    def test_clear_hooks(self):
        from cee.plugin import Hooks
        hooks = Hooks()
        hooks.register("h", "p", lambda v: v)
        hooks.clear()
        assert hooks.list_hooks() == {}


class TestPluginManager:
    """PluginManager lifecycle."""

    def _make_plugin(self):
        from cee.plugin import BasePlugin, PluginMetadata, PluginCategory
        class TestPlugin(BasePlugin):
            def get_metadata(self):
                return PluginMetadata(
                    name=f"test-{id(self)}",
                    version="0.1.0",
                    description="Test plugin",
                    category=PluginCategory.ENGINE,
                )
            def on_enable(self):
                self.config["enabled"] = True
        return TestPlugin()

    def test_register_plugin(self):
        from cee.plugin import PluginManager
        mgr = PluginManager()
        plugin = self._make_plugin()
        mgr.register_plugin(plugin)
        assert mgr.get_plugin(plugin.metadata.name) is plugin

    def test_duplicate_register(self):
        from cee.plugin import PluginManager
        mgr = PluginManager()
        plugin = self._make_plugin()
        mgr.register_plugin(plugin)
        with pytest.raises(ValueError):
            mgr.register_plugin(plugin)

    def test_enable_disable_plugin(self):
        from cee.plugin import PluginManager
        mgr = PluginManager()
        plugin = self._make_plugin()
        mgr.register_plugin(plugin)
        assert mgr.enable_plugin(plugin.metadata.name)
        assert plugin.config.get("enabled")
        assert mgr.disable_plugin(plugin.metadata.name)

    def test_unregister_plugin(self):
        from cee.plugin import PluginManager
        mgr = PluginManager()
        plugin = self._make_plugin()
        mgr.register_plugin(plugin)
        name = plugin.metadata.name
        assert mgr.unregister_plugin(name)
        assert mgr.get_plugin(name) is None

    def test_list_by_category(self):
        from cee.plugin import PluginManager, PluginCategory, PluginMetadata, BasePlugin
        mgr = PluginManager()

        class EnginePlugin(BasePlugin):
            def get_metadata(self):
                return PluginMetadata(name=f"e-{id(self)}", category=PluginCategory.ENGINE)

        class ToolPlugin(BasePlugin):
            def get_metadata(self):
                return PluginMetadata(name=f"t-{id(self)}", category=PluginCategory.TOOL)

        mgr.register_plugin(EnginePlugin())
        mgr.register_plugin(ToolPlugin())
        engines = mgr.list_plugins(PluginCategory.ENGINE)
        tools = mgr.list_plugins(PluginCategory.TOOL)
        assert len(engines) == 1
        assert len(tools) == 1
        assert len(mgr.list_plugins()) == 2

    def test_enable_all(self):
        from cee.plugin import PluginManager
        mgr = PluginManager()
        mgr.register_plugin(self._make_plugin())
        mgr.register_plugin(self._make_plugin())
        count = mgr.enable_all()
        assert count == 2

    def test_disable_all(self):
        from cee.plugin import PluginManager
        mgr = PluginManager()
        mgr.register_plugin(self._make_plugin())
        mgr.enable_all()
        mgr.disable_all()
        for p in mgr.list_plugins():
            assert p.state.value == "stopped"

    def test_plugin_status(self):
        from cee.plugin import PluginManager
        mgr = PluginManager()
        mgr.register_plugin(self._make_plugin())
        mgr.enable_all()
        s = mgr.status
        assert s["active_plugins"] == 1
        assert s["plugin_count"] == 1

    def test_reset(self):
        from cee.plugin import PluginManager
        mgr = PluginManager()
        mgr.register_plugin(self._make_plugin())
        mgr.enable_all()
        mgr.reset()
        assert mgr.status["plugin_count"] == 0

    def test_export_manifest(self):
        from cee.plugin import PluginManager
        mgr = PluginManager()
        mgr.register_plugin(self._make_plugin())
        manifest = mgr.export_manifest()
        assert len(manifest) == 1
        assert "name" in manifest[0]


# ============================================================
# Processing Tests
# ============================================================


class TestLongTextProcessor:
    """Long text hierarchical chunking and summarization."""

    def test_fixed_chunking(self):
        from cee.processing import LongTextProcessor, ChunkStrategy
        text = "Hello world. " * 500
        processor = LongTextProcessor(chunk_size=200, overlap=20, strategy=ChunkStrategy.FIXED_SIZE)
        report = processor.process(text)
        assert report.chunk_count > 1
        assert report.original_length == len(text)
        assert report.original_length <= len(text)

    def test_sentence_chunking(self):
        from cee.processing import LongTextProcessor, ChunkStrategy
        text = "This is sentence one. This is sentence two. " * 100
        processor = LongTextProcessor(chunk_size=200, overlap=20, strategy=ChunkStrategy.SENTENCE)
        report = processor.process(text)
        assert report.chunk_count >= 1

    def test_paragraph_chunking(self):
        from cee.processing import LongTextProcessor, ChunkStrategy
        text = "Paragraph one with content.\n\nParagraph two with more.\n\n" * 50
        processor = LongTextProcessor(chunk_size=300, overlap=30, strategy=ChunkStrategy.PARAGRAPH)
        report = processor.process(text)
        assert report.chunk_count >= 1

    def test_sliding_window(self):
        from cee.processing import LongTextProcessor, ChunkStrategy
        text = "Overlap sensitive text. " * 100
        processor = LongTextProcessor(chunk_size=150, overlap=50, strategy=ChunkStrategy.SLIDING_WINDOW)
        report = processor.process(text)
        assert report.chunk_count >= len(text) // 150

    def test_semantic_chunking(self):
        from cee.processing import LongTextProcessor
        text = "Section A with some text. " * 20 + "\n\nSection B with more text. " * 20
        processor = LongTextProcessor(chunk_size=200, overlap=30)
        report = processor.process(text)
        assert report.chunk_count >= 1

    def test_key_phrase_extraction(self):
        from cee.processing import LongTextProcessor
        text = "Machine learning is important. Artificial intelligence is crucial. Data science is significant. " * 30
        processor = LongTextProcessor(chunk_size=200)
        phrases = processor.extract_key_phrases(text, top_n=5)
        assert len(phrases) <= 5
        assert len(phrases) > 0

    def test_chunk_tree_structure(self):
        from cee.processing import LongTextProcessor
        text = "Chunk content here. " * 200
        processor = LongTextProcessor(chunk_size=150, overlap=20, max_depth=3)
        report = processor.process(text)
        assert report.depth >= 1
        assert report.structure

    def test_get_chunk_by_position(self):
        from cee.processing import LongTextProcessor
        text = "A" * 500 + "B" * 500
        processor = LongTextProcessor(chunk_size=200, overlap=0)
        processor.process(text)
        chunk = processor.get_chunk_by_position(600)
        assert chunk is not None

    def test_get_chunks_at_level(self):
        from cee.processing import LongTextProcessor
        text = "Data " * 500
        processor = LongTextProcessor(chunk_size=100, overlap=10, max_depth=2)
        processor.process(text)
        l0 = processor.get_chunks_at_level(0)
        assert len(l0) > 0

    def test_importance_computation(self):
        from cee.processing import LongTextProcessor
        processor = LongTextProcessor()
        imp = processor._compute_importance("This is significantly important and crucial therefore notable")
        assert imp > 0.3

    def test_report_fields(self):
        from cee.processing import LongTextProcessor
        text = "Test content. " * 100
        processor = LongTextProcessor(chunk_size=200)
        report = processor.process(text)
        assert report.reading_time_estimate > 0
        assert report.processing_time > 0

    def test_reset(self):
        from cee.processing import LongTextProcessor
        processor = LongTextProcessor()
        processor.process("Some text. " * 50)
        processor.reset()
        assert len(processor._chunks) == 0
        assert len(processor._chunk_tree) == 0


class TestDataPipeline:
    """Data pipeline ETL."""

    def test_empty_pipeline_runs(self):
        from cee.processing import DataPipeline
        pipeline = DataPipeline("test")
        result = pipeline.run("input data")
        assert result.pipeline_name == "test"
        assert result.steps_executed == 0

    def test_add_extractor(self):
        from cee.processing import DataPipeline
        pipeline = DataPipeline()
        pipeline.add_extractor("read", lambda d: f"extracted:{d}")
        result = pipeline.run("raw")
        assert "extracted:raw" in str(pipeline.get_data())

    def test_chained_stages(self):
        from cee.processing import DataPipeline
        pipeline = DataPipeline()
        pipeline.add_transformer("upper", lambda d: d.upper())
        pipeline.add_transformer("reverse", lambda d: d[::-1])
        result = pipeline.run("hello")
        assert pipeline.get_data() == "OLLEH"

    def test_filter_stage(self):
        from cee.processing import DataPipeline
        pipeline = DataPipeline()
        pipeline.add_filter("long_only", lambda d: d if len(d) > 3 else "")
        result = pipeline.run("hi")
        assert result.output_size == 0

    def test_enricher_stage(self):
        from cee.processing import DataPipeline
        pipeline = DataPipeline()
        pipeline.add_enricher("add_meta", lambda d: f"{d}[enriched]")
        result = pipeline.run("data")
        assert "[enriched]" in str(pipeline.get_data())

    def test_loader_stage(self):
        from cee.processing import DataPipeline
        stashed = {}
        pipeline = DataPipeline()
        pipeline.add_loader("stash", lambda d: stashed.update({"result": d}))
        pipeline.run("payload")
        assert stashed["result"] == "payload"

    def test_step_removal(self):
        from cee.processing import DataPipeline
        pipeline = DataPipeline()
        pipeline.add_extractor("e", lambda d: d)
        assert pipeline.remove_step("e")
        assert not pipeline.remove_step("nonexistent")

    def test_clear_steps(self):
        from cee.processing import DataPipeline
        pipeline = DataPipeline()
        pipeline.add_extractor("a", lambda d: d)
        pipeline.add_extractor("b", lambda d: d)
        pipeline.clear_steps()
        result = pipeline.run("test")
        assert result.steps_executed == 0

    def test_pipeline_history(self):
        from cee.processing import DataPipeline
        pipeline = DataPipeline("history_test")
        pipeline.add_extractor("ex", lambda d: f"ex:{d}")
        pipeline.run("a")
        pipeline.run("b")
        assert len(pipeline.get_history()) == 2

    def test_fluent_api(self):
        from cee.processing import DataPipeline
        pipeline = (DataPipeline("fluent")
                    .add_extractor("e", lambda d: d)
                    .add_transformer("t", lambda d: d))
        result = pipeline.run("data")
        assert result.steps_executed == 2


class TestTextTransformer:
    """Built-in text transformations."""

    def test_normalize_whitespace(self):
        from cee.processing import TextTransformer
        result = TextTransformer.normalize_whitespace("hello   world  \n\ttest")
        assert result == "hello world test"

    def test_remove_html_tags(self):
        from cee.processing import TextTransformer
        result = TextTransformer.remove_html_tags("<p>Hello <b>World</b></p>")
        assert "Hello World" in result

    def test_extract_emails(self):
        from cee.processing import TextTransformer
        emails = TextTransformer.extract_emails("Contact: alice@example.com and bob@test.org")
        assert len(emails) == 2
        assert "alice@example.com" in emails

    def test_extract_urls(self):
        from cee.processing import TextTransformer
        urls = TextTransformer.extract_urls("Visit https://example.com or www.test.com")
        assert len(urls) >= 1

    def test_extract_numbers(self):
        from cee.processing import TextTransformer
        nums = TextTransformer.extract_numbers("Prices: 12.5, 3, -7.2")
        assert 12.5 in nums

    def test_truncate(self):
        from cee.processing import TextTransformer
        result = TextTransformer.truncate("Hello World This is long", 12)
        assert len(result) <= 12
        assert "..." in result

    def test_anonymize_emails(self):
        from cee.processing import TextTransformer
        result = TextTransformer.anonymize_emails("Write to alice@example.com")
        assert "[EMAIL]" in result

    def test_anonymize_phones(self):
        from cee.processing import TextTransformer
        result = TextTransformer.anonymize_phones("Call 555-123-4567 for help")
        assert "[PHONE]" in result

    def test_split_sections(self):
        from cee.processing import TextTransformer
        sections = TextTransformer.split_sections("A\n\nB\n\nC")
        assert sections == ["A", "B", "C"]


class TestJsonProcessor:
    """JSON processing utilities."""

    def test_flatten(self):
        from cee.processing import JsonProcessor
        data = {"a": {"b": 1, "c": {"d": 2}}, "e": 3}
        flat = JsonProcessor.flatten(data)
        assert "a.b" in flat
        assert "a.c.d" in flat

    def test_filter_keys(self):
        from cee.processing import JsonProcessor
        data = {"a": 1, "b": 2, "c": 3}
        result = JsonProcessor.filter_keys(data, ["a", "c"])
        assert "a" in result
        assert "b" not in result

    def test_exclude_keys(self):
        from cee.processing import JsonProcessor
        data = {"a": 1, "b": 2}
        result = JsonProcessor.exclude_keys(data, ["b"])
        assert result == {"a": 1}

    def test_rename_keys(self):
        from cee.processing import JsonProcessor
        data = {"old_name": "value"}
        result = JsonProcessor.rename_keys(data, {"old_name": "new_name"})
        assert "new_name" in result
        assert "old_name" not in result

    def test_sort_by(self):
        from cee.processing import JsonProcessor
        data = [{"score": 3}, {"score": 1}, {"score": 5}]
        result = JsonProcessor.sort_by(data, "score")
        assert result[0]["score"] == 1
        assert result[2]["score"] == 5

    def test_group_by(self):
        from cee.processing import JsonProcessor
        data = [{"type": "A", "val": 1}, {"type": "B", "val": 2}, {"type": "A", "val": 3}]
        groups = JsonProcessor.group_by(data, "type")
        assert len(groups["A"]) == 2
        assert len(groups["B"]) == 1


class TestDocReader:
    """Multi-format document parsing."""

    def test_read_plain_text(self):
        from cee.processing import DocReader, DocumentFormat
        reader = DocReader()
        doc = reader.read("Hello World\n\nThis is a paragraph.", DocumentFormat.PLAIN_TEXT)
        assert doc.format == DocumentFormat.PLAIN_TEXT
        assert doc.word_count > 0

    def test_read_markdown(self):
        from cee.processing import DocReader, DocumentFormat
        reader = DocReader()
        md = "# Title\n\n## Section 1\nContent here.\n\n## Section 2\nMore content."
        doc = reader.read(md, DocumentFormat.MARKDOWN)
        assert doc.title == "Title"
        assert len(doc.sections) >= 1

    def test_read_markdown_tables(self):
        from cee.processing import DocReader, DocumentFormat
        reader = DocReader()
        md = "| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |"
        doc = reader.read(md, DocumentFormat.MARKDOWN)
        assert len(doc.tables) == 1

    def test_read_html(self):
        from cee.processing import DocReader, DocumentFormat
        reader = DocReader()
        html = "<html><head><title>Test</title></head><body><p>Hello</p></body></html>"
        doc = reader.read(html, DocumentFormat.HTML)
        assert doc.title == "Test"

    def test_read_json(self):
        from cee.processing import DocReader, DocumentFormat
        reader = DocReader()
        json_str = '{"title": "Doc", "content": "JSON content", "author": "Alice"}'
        doc = reader.read(json_str, DocumentFormat.JSON)
        assert doc.title == "Doc"
        assert "author" in doc.metadata

    def test_read_csv(self):
        from cee.processing import DocReader, DocumentFormat
        reader = DocReader()
        csv_str = "name,age\nAlice,30\nBob,25"
        doc = reader.read(csv_str, DocumentFormat.CSV)
        assert doc.metadata["row_count"] == 3

    def test_read_xml(self):
        from cee.processing import DocReader, DocumentFormat
        reader = DocReader()
        xml = "<?xml version=\"1.0\"?><doc><title>XML Doc</title><content>Text</content></doc>"
        doc = reader.read(xml, DocumentFormat.XML)
        assert doc.title == "XML Doc"

    def test_auto_detect_markdown(self):
        from cee.processing import DocReader, DocumentFormat
        reader = DocReader()
        doc = reader.read_auto("# Auto-detected\nSome content")
        assert doc.format == DocumentFormat.MARKDOWN

    def test_auto_detect_html(self):
        from cee.processing import DocReader, DocumentFormat
        reader = DocReader()
        doc = reader.read_auto("<html><body>Auto</body></html>")
        assert doc.format == DocumentFormat.HTML

    def test_auto_detect_json(self):
        from cee.processing import DocReader, DocumentFormat
        reader = DocReader()
        doc = reader.read_auto('{"key": "value"}')
        assert doc.format == DocumentFormat.JSON


class TestOutputFormatter:
    """Multi-format output generation."""

    def test_format_plain(self):
        from cee.processing import OutputFormatter, OutputFormat
        fmt = OutputFormatter()
        result = fmt.format({"a": 1, "b": "hello"}, OutputFormat.PLAIN)
        assert "a: 1" in result
        assert "b: hello" in result

    def test_format_markdown(self):
        from cee.processing import OutputFormatter, OutputFormat
        fmt = OutputFormatter()
        result = fmt.format({"title": "Test", "score": 0.95}, OutputFormat.MARKDOWN, title="Report")
        assert "# Report" in result
        assert "Test" in result

    def test_format_json(self):
        from cee.processing import OutputFormatter, OutputFormat
        fmt = OutputFormatter()
        result = fmt.format({"key": "value"}, OutputFormat.JSON)
        assert '"key"' in result
        assert '"value"' in result

    def test_format_json_schema(self):
        from cee.processing import OutputFormatter, OutputFormat
        fmt = OutputFormatter()
        result = fmt.format({"name": "Alice", "age": 30}, OutputFormat.JSON_SCHEMA)
        assert '"type"' in result

    def test_format_table(self):
        from cee.processing import OutputFormatter, OutputFormat
        fmt = OutputFormatter()
        data = [{"name": "Alice", "score": 95}, {"name": "Bob", "score": 87}]
        result = fmt.format(data, OutputFormat.TABLE)
        assert "Alice" in result
        assert "score" in result.lower() or "score" in result

    def test_format_csv(self):
        from cee.processing import OutputFormatter, OutputFormat
        fmt = OutputFormatter()
        data = [{"name": "Alice", "age": "30"}]
        result = fmt.format(data, OutputFormat.CSV)
        assert "Alice" in result
        assert "age" in result or "name" in result

    def test_format_summary(self):
        from cee.processing import OutputFormatter, OutputFormat
        fmt = OutputFormatter()
        result = fmt.format("Very long text " * 200, OutputFormat.SUMMARY, max_length=100)
        assert len(result) <= 103

    def test_format_bullet_list(self):
        from cee.processing import OutputFormatter, OutputFormat
        fmt = OutputFormatter()
        result = fmt.format(["A", "B", "C"], OutputFormat.BULLET_LIST)
        assert "- A" in result
        assert "- B" in result

    def test_format_numbered_list(self):
        from cee.processing import OutputFormatter, OutputFormat
        fmt = OutputFormatter()
        result = fmt.format(["First", "Second"], OutputFormat.NUMBERED_LIST)
        assert "1. First" in result
        assert "2. Second" in result


# ============================================================
# Learning Tests
# ============================================================


class TestFeedbackStore:
    """Feedback collection and querying."""

    def test_add_feedback(self):
        from cee.learning import FeedbackStore, FeedbackType
        store = FeedbackStore()
        store.add(score=0.8, feedback_type=FeedbackType.EXPLICIT, message="Great")
        store.add(score=0.3, message="Bad")
        store.add(score=0.5)
        assert store.get_stats()["total"] == 3
        assert store.get_stats()["positive"] == 1
        assert store.get_stats()["negative"] == 1
        assert store.get_stats()["neutral"] == 1

    def test_positive_ratio(self):
        from cee.learning import FeedbackStore
        store = FeedbackStore()
        for _ in range(3):
            store.add(score=0.9)
        store.add(score=0.1)
        ratio = store.get_positive_ratio()
        assert ratio == 0.75

    def test_average_score(self):
        from cee.learning import FeedbackStore
        store = FeedbackStore()
        store.add(score=0.9)
        store.add(score=0.3)
        avg = store.get_average_score()
        assert 0.5 < avg < 0.7

    def test_get_by_tags(self):
        from cee.learning import FeedbackStore
        store = FeedbackStore()
        store.add(score=0.8, tags=["quality"])
        store.add(score=0.6, tags=["performance"])
        quality = store.get_by_tags(["quality"])
        assert len(quality) == 1

    def test_recent_feedback(self):
        from cee.learning import FeedbackStore
        store = FeedbackStore()
        for i in range(10):
            store.add(score=0.5 + i * 0.05)
        recent = store.get_recent(limit=5)
        assert len(recent) == 5

    def test_reset(self):
        from cee.learning import FeedbackStore
        store = FeedbackStore()
        store.add(score=0.8)
        store.reset()
        assert store.get_stats()["total"] == 0


class TestAutoLearner:
    """Auto-learning and insight generation."""

    def test_record_performance(self):
        from cee.learning import AutoLearner
        learner = AutoLearner()
        snap = learner.record_performance("baseline", {"threshold": 0.8}, 0.75)
        assert snap.name == "baseline"
        assert learner._best_snapshot.score == 0.75

    def test_best_snapshot_update(self):
        from cee.learning import AutoLearner
        learner = AutoLearner()
        learner.record_performance("v1", {}, 0.5)
        learner.record_performance("v2", {}, 0.9)
        assert learner._best_snapshot.score == 0.9

    def test_feedback_analysis(self):
        from cee.learning import AutoLearner
        learner = AutoLearner()
        learner.feedback.add(score=0.2, message="bad")
        learner.feedback.add(score=0.3, message="bad")
        learner.feedback.add(score=0.2, message="bad")
        learner.feedback.add(score=0.3, message="bad")
        learner.feedback.add(score=0.1, message="bad")
        insight = learner._analyze_feedback()
        assert insight is not None
        assert "low" in insight.name.lower()

    def test_param_trend_analysis(self):
        from cee.learning import AutoLearner
        learner = AutoLearner()
        for i in range(5):
            learner.record_performance(f"v{i}", {}, 0.5 + i * 0.1)
        insight = learner._analyze_params()
        assert insight is not None

    def test_trend_analysis(self):
        from cee.learning import AutoLearner
        learner = AutoLearner()
        learner.record_performance("best", {"key": "val"}, 0.99)
        insight = learner._analyze_trends()
        assert insight is not None
        assert "best" in insight.name

    def test_analyze_integration(self):
        from cee.learning import AutoLearner
        learner = AutoLearner()
        for _ in range(10):
            learner.feedback.add(score=0.1)
        learner.record_performance("model", {}, 0.88)
        insights = learner.analyze()
        assert len(insights) > 0

    def test_recommend(self):
        from cee.learning import AutoLearner
        learner = AutoLearner()
        learner.feedback.add(score=0.85)
        learner.record_performance("best", {}, 0.95)
        recs = learner.recommend()
        assert "recommendations" in recs

    def test_export_state(self):
        from cee.learning import AutoLearner
        learner = AutoLearner()
        learner.feedback.add(score=0.7)
        learner.record_performance("m", {}, 0.8)
        state = learner.export_state()
        assert "feedback_stats" in state
        assert "best_snapshot" in state

    def test_reset(self):
        from cee.learning import AutoLearner
        learner = AutoLearner()
        learner.feedback.add(score=0.8)
        learner.record_performance("m", {}, 0.7)
        learner.reset()
        assert learner.feedback.get_stats()["total"] == 0


class TestHyperOptimizer:
    """Hyper-parameter optimization."""

    def test_grid_search(self):
        from cee.learning import HyperOptimizer

        def eval_fn(params):
            return 1.0 - abs(params["threshold"] - 0.7) - abs(params["size"] - 1000) / 1000

        optimizer = HyperOptimizer()
        optimizer.set_param_space(threshold=[0.5, 0.7, 0.9], size=[500, 1000])
        results = optimizer.grid_search(eval_fn, top_k=2)
        assert len(results) <= 2
        assert results[0][1] > 0.5

    def test_grid_search_returns_best(self):
        from cee.learning import HyperOptimizer

        def eval_fn(params):
            return params["x"]

        optimizer = HyperOptimizer()
        optimizer.set_param_space(x=[0.1, 0.5, 0.9])
        results = optimizer.grid_search(eval_fn)
        assert results[0][0]["x"] == 0.9

    def test_simulated_annealing(self):
        from cee.learning import HyperOptimizer

        def eval_fn(params):
            return 1.0 - abs(params["threshold"] - 0.75)

        optimizer = HyperOptimizer()
        optimizer.set_param_space(threshold=[0.3, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9])
        best = optimizer.simulated_annealing(eval_fn, iterations=50,
                                              initial_temp=1.0, cooling_rate=0.9)
        assert best["threshold"] == 0.75

    def test_get_history(self):
        from cee.learning import HyperOptimizer

        def eval_fn(params):
            return params["v"]
        optimizer = HyperOptimizer()
        optimizer.set_param_space(v=[0.5, 0.9])
        optimizer.grid_search(eval_fn)
        assert len(optimizer.get_history()) >= 1


# ============================================================
# Cloud Tests
# ============================================================


class TestEnvironmentDetector:
    """Environment auto-detection."""

    def test_detect_returns_info(self):
        from cee.cloud import EnvironmentDetector
        detector = EnvironmentDetector()
        info = detector.detect()
        assert info.os_name
        assert info.python_version
        assert info.cpu_count > 0
        assert isinstance(info.is_container, bool)

    def test_env_info_to_dict(self):
        from cee.cloud import EnvironmentDetector
        detector = EnvironmentDetector()
        info = detector.detect()
        d = info.to_dict()
        assert "os" in d
        assert "cpu_count" in d
        assert "python" in d

    def test_recommend_deployment(self):
        from cee.cloud import EnvironmentDetector
        detector = EnvironmentDetector()
        info = detector.detect()
        target = detector.recommend_deployment(info)
        assert target is not None


class TestHealthMonitor:
    """Health monitoring and alerting."""

    def test_register_service(self):
        from cee.cloud import HealthMonitor, ServiceInstance
        monitor = HealthMonitor()
        svc = ServiceInstance(name="test-svc", port=9999)
        monitor.register(svc)
        assert monitor.get_status()["total_services"] == 1

    def test_unregister_service(self):
        from cee.cloud import HealthMonitor, ServiceInstance
        monitor = HealthMonitor()
        svc = ServiceInstance(name="test-svc", port=9999)
        monitor.register(svc)
        removed = monitor.unregister(svc.service_id)
        assert removed is not None
        assert monitor.get_status()["total_services"] == 0

    def test_check_health_unreachable(self):
        from cee.cloud import HealthMonitor, ServiceInstance
        monitor = HealthMonitor(failure_threshold=2)
        svc = ServiceInstance(name="down-svc", host="127.0.0.1", port=65535)
        monitor.register(svc)
        monitor.check(svc.service_id)
        monitor.check(svc.service_id)
        assert svc.status.value == "unhealthy"

    def test_get_healthy_empty(self):
        from cee.cloud import HealthMonitor
        monitor = HealthMonitor()
        assert monitor.get_healthy() == []

    def test_get_unhealthy(self):
        from cee.cloud import HealthMonitor, ServiceInstance
        monitor = HealthMonitor(failure_threshold=1)
        svc = ServiceInstance(name="bad", host="127.0.0.1", port=65534)
        monitor.register(svc)
        monitor.check(svc.service_id)
        assert len(monitor.get_unhealthy()) >= 0

    def test_get_alerts(self):
        from cee.cloud import HealthMonitor, ServiceInstance
        monitor = HealthMonitor(failure_threshold=1)
        svc = ServiceInstance(name="alert-svc", host="127.0.0.1", port=65533)
        monitor.register(svc)
        monitor.check(svc.service_id)
        alerts = monitor.get_alerts()
        assert isinstance(alerts, list)

    def test_reset(self):
        from cee.cloud import HealthMonitor, ServiceInstance
        monitor = HealthMonitor()
        svc = ServiceInstance(name="svc", port=9999)
        monitor.register(svc)
        monitor.reset()
        assert monitor.get_status()["total_services"] == 0


class TestCloudAutoConfig:
    """Cloud auto-configuration."""

    def test_detect_environment(self):
        from cee.cloud import CloudAutoConfig
        cfg = CloudAutoConfig()
        info = cfg.detect()
        assert info is not None
        assert cfg.environment is not None

    def test_auto_configure(self):
        from cee.cloud import CloudAutoConfig
        cfg = CloudAutoConfig()
        config = cfg.auto_configure()
        assert config.name == "cee-service"
        assert config.ports

    def test_generate_dockerfile(self):
        from cee.cloud import CloudAutoConfig
        cfg = CloudAutoConfig()
        dockerfile = cfg.generate_dockerfile()
        assert "FROM python" in dockerfile
        assert "EXPOSE" in dockerfile

    def test_generate_k8s_manifest(self):
        from cee.cloud import CloudAutoConfig
        cfg = CloudAutoConfig()
        cfg.auto_configure()
        manifest = cfg.generate_k8s_manifest()
        assert "apiVersion" in manifest
        assert "Deployment" in manifest

    def test_generate_docker_compose(self):
        from cee.cloud import CloudAutoConfig
        cfg = CloudAutoConfig()
        cfg.auto_configure()
        compose = cfg.generate_docker_compose()
        assert "version" in compose or "services" in compose

    def test_get_status(self):
        from cee.cloud import CloudAutoConfig
        cfg = CloudAutoConfig()
        cfg.detect()
        status = cfg.get_status()
        assert "environment" in status
        assert "config" in status

    def test_deployment_config_to_dict(self):
        from cee.cloud import DeploymentConfig
        config = DeploymentConfig(name="test", replicas=3)
        d = config.to_dict()
        assert d["name"] == "test"
        assert d["replicas"] == 3


# ============================================================
# Integration — Cross-Module Tests
# ============================================================


class TestCrossModule:
    """Integration tests spanning multiple new subsystems."""

    def test_agent_with_plugin_hooks(self):
        from cee.agent import MultiAgentOrchestrator, AgentRole, AgentState
        from cee.plugin import Hooks

        hooks = Hooks()
        states: list = []
        hooks.register("on_task_complete", "watcher",
                       lambda task_id, result: states.append(f"done:{task_id}"))

        orch = MultiAgentOrchestrator()
        orch.form_team([AgentRole.RESEARCHER, AgentRole.SYNTHESIZER])
        result = orch.execute("Research and summarize the importance of testing")
        assert result["status"] == "completed"

    def test_pipeline_with_feedback_store(self):
        from cee.processing import DataPipeline, TextTransformer
        from cee.learning import FeedbackStore

        store = FeedbackStore()
        pipeline = DataPipeline("feedback-pipe")
        pipeline.add_transformer("normalize", TextTransformer.normalize_whitespace)
        pipeline.add_transformer("anon", TextTransformer.anonymize_emails)
        result = pipeline.run("  test@example.com  ")
        if result.steps_failed == 0:
            store.add(score=0.9, message="Pipeline succeeded")

        assert store.get_stats()["total"] >= 0

    def test_long_text_with_consensus(self):
        from cee.processing import LongTextProcessor
        from cee.agent import ConsensusEngine, ConsensusType

        processor = LongTextProcessor(chunk_size=200)
        text = "The system should be reliable and performant. " * 50
        report = processor.process(text)

        engine = ConsensusEngine()
        for i in range(3):
            engine.cast_vote("review", f"agent_{i}",
                           "approve" if report.chunk_count > 0 else "reject")
        result = engine.resolve("review", "Approve output?", ConsensusType.MAJORITY)
        assert result.decision == "approve"
