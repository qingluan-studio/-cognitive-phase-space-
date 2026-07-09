"""CEE Agent Framework — Multi-agent orchestrator with workflow engine.

The MultiAgentOrchestrator coordinates sub-agents through a complete
workflow: plan → delegate → execute → review → synthesize.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from .base_agent import BaseAgent, CodeAgent, CriticAgent, LLMAgent, ResearchAgent
from .consensus import ConsensusEngine
from .message_bus import MessageBus
from .task_decomposer import TaskDecomposer
from .types import (
    AgentCapability,
    AgentConfig,
    AgentMessage,
    AgentRole,
    AgentState,
    ConsensusResult,
    ConsensusType,
    MessageType,
    OrchestrationPlan,
    Task,
    TaskStatus,
)

logger = logging.getLogger(__name__)


class MultiAgentOrchestrator:
    """Orchestrates multiple specialized agents to accomplish complex goals.

    Manages the full lifecycle:
      1. Analyze goal → decompose into tasks via TaskDecomposer
      2. Form team → instantiate agents with appropriate roles/capabilities
      3. Execute plan → delegate tasks, monitor progress, handle failures
      4. Review → run multi-agent critique and consensus
      5. Synthesize → combine results into unified output
    """

    def __init__(self, completion_handler: Any | None = None,
                 max_concurrent: int = 5) -> None:
        self._agents: dict[str, BaseAgent] = {}
        self._bus = MessageBus()
        self._decomposer = TaskDecomposer()
        self._consensus = ConsensusEngine()
        self._completion_handler = completion_handler
        self.max_concurrent = max_concurrent
        self._plans: list[OrchestrationPlan] = []
        self._completed_tasks: list[Task] = []
        self._failed_tasks: list[Task] = []
        self._session_id: str = str(uuid.uuid4())[:8]

    @property
    def status(self) -> dict[str, Any]:
        return {
            "session_id": self._session_id,
            "agent_count": len(self._agents),
            "bus_status": self._bus.status,
            "plan_count": len(self._plans),
            "completed_tasks": len(self._completed_tasks),
            "failed_tasks": len(self._failed_tasks),
            "agents": {aid: a.status for aid, a in self._agents.items()},
        }

    def register_agent(self, agent: BaseAgent) -> None:
        self._agents[agent.agent_id] = agent
        self._bus.subscribe(agent.agent_id, self._default_message_handler(agent.agent_id))

    def unregister_agent(self, agent_id: str) -> BaseAgent | None:
        self._bus.unsubscribe(agent_id)
        return self._agents.pop(agent_id, None)

    def create_agent(self, role: AgentRole, personality: Any = None,
                     **kwargs: Any) -> BaseAgent:
        from .types import AgentPersonality
        config = AgentConfig(
            role=role,
            personality=personality or AgentPersonality.BALANCED,
            capabilities=list(TaskDecomposer.ROLE_CAPABILITIES.get(role, [])),
            **kwargs,
        )
        agent_map = {
            AgentRole.RESEARCHER: ResearchAgent,
            AgentRole.CODER: CodeAgent,
            AgentRole.CRITIC: CriticAgent,
        }
        agent_cls = agent_map.get(role, LLMAgent)
        agent = agent_cls(config, self._completion_handler)
        self.register_agent(agent)
        return agent

    def form_team(self, roles: list[AgentRole]) -> list[str]:
        ids: list[str] = []
        for role in roles:
            agent = self.create_agent(role)
            ids.append(agent.agent_id)
        return ids

    def execute(self, goal: str, context: dict[str, Any] | None = None
                ) -> dict[str, Any]:
        plan = self.plan(goal, context)
        tasks = plan.tasks
        self._execute_sequential(tasks)
        review = self.review(tasks)
        synthesis = self.synthesize(tasks, review)
        return {
            "goal": goal,
            "plan_id": plan.plan_id,
            "status": "completed",
            "tasks": [{"id": t.task_id, "title": t.title, "status": t.status.value,
                        "result": str(t.result)[:200] if t.result else None}
                       for t in tasks],
            "review": review.decision if review else None,
            "synthesis": str(synthesis)[:500] if synthesis else None,
            "session_id": self._session_id,
        }

    def plan(self, goal: str, context: dict[str, Any] | None = None
             ) -> OrchestrationPlan:
        tasks = self._decomposer.decompose(goal, context)
        plan = OrchestrationPlan(
            goal=goal,
            tasks=tasks,
            task_dag=self._build_dag(tasks),
            agent_assignments=self._assign_agents(tasks),
        )
        self._plans.append(plan)
        return plan

    def _build_dag(self, tasks: list[Task]) -> dict[str, list[str]]:
        dag: dict[str, list[str]] = {}
        for t in tasks:
            dag[t.task_id] = t.dependencies
        return dag

    def _assign_agents(self, tasks: list[Task]) -> dict[str, str]:
        assignments: dict[str, str] = {}
        idle_agents = [a for a in self._agents.values() if a.can_accept_task()]
        for task in tasks:
            for agent in idle_agents:
                if agent.has_any_capability(task.required_capabilities):
                    assignments[task.task_id] = agent.agent_id
                    task.assigned_agent = agent.agent_id
                    idle_agents.remove(agent)
                    break
            if task.task_id not in assignments and idle_agents:
                assignments[task.task_id] = idle_agents[0].agent_id
                task.assigned_agent = idle_agents[0].agent_id
                idle_agents.pop(0)
        return assignments

    def _execute_sequential(self, tasks: list[Task]) -> None:
        for task in tasks:
            task.status = TaskStatus.IN_PROGRESS
            agent = self._agents.get(task.assigned_agent)
            if agent is None:
                task.status = TaskStatus.FAILED
                self._failed_tasks.append(task)
                continue
            task.attempts += 1
            try:
                task.result = agent.execute_task(task)
                task.status = TaskStatus.COMPLETED
                self._completed_tasks.append(task)
            except Exception as e:
                if task.attempts < task.max_attempts:
                    logger.warning(f"Task {task.task_id} failed attempt {task.attempts}: {e}")
                    task.status = TaskStatus.FAILED
                    self._failed_tasks.append(task)
                else:
                    task.status = TaskStatus.FAILED
                    self._failed_tasks.append(task)

    def review(self, tasks: list[Task]) -> ConsensusResult | None:
        critics = [a for a in self._agents.values()
                   if a.has_capability(AgentCapability.CRITIQUE) and a.can_accept_task()]
        if not critics:
            critic = self.create_agent(AgentRole.CRITIC)
            critics = [critic]
        question = "Are the task results acceptable?"
        for task in tasks:
            if task.status == TaskStatus.COMPLETED:
                question += f"\n[{task.title}]: {str(task.result)[:300]}"
        for c_agent in critics:
            vote = "accept" if len(self._failed_tasks) == 0 else "reject"
            rationale = f"Review by {c_agent.agent_id}: {len(self._completed_tasks)}/{len(tasks)} completed"
            cid = f"review_{self._session_id}"
            self._consensus.cast_vote(cid, c_agent.agent_id, vote, 1.0, rationale)
        return self._consensus.resolve(cid, question, ConsensusType.MAJORITY)

    def synthesize(self, tasks: list[Task],
                   review: ConsensusResult | None = None) -> str | None:
        synthesizers = [a for a in self._agents.values()
                        if a.has_capability(AgentCapability.SYNTHESIS) and a.can_accept_task()]
        if not synthesizers:
            synthesizer = self.create_agent(AgentRole.SYNTHESIZER)
            synthesizers = [synthesizer]
        parts: list[str] = []
        for task in tasks:
            if task.status == TaskStatus.COMPLETED and task.result:
                parts.append(f"## {task.title}\n{task.result}")
        synthesis_task = Task(
            title="Synthesize Results",
            description="Combine the following completed task results into a unified output:\n\n" + "\n\n".join(parts),
        )
        return synthesizers[0].execute_task(synthesis_task)

    def _default_message_handler(self, agent_id: str) -> Any:
        def _handler(message: AgentMessage) -> None:
            pass
        return _handler

    def reset(self) -> None:
        for agent in self._agents.values():
            agent.reset()
        self._agents.clear()
        self._bus.reset()
        self._consensus.reset()
        self._plans.clear()
        self._completed_tasks.clear()
        self._failed_tasks.clear()
        self._session_id = str(uuid.uuid4())[:8]
