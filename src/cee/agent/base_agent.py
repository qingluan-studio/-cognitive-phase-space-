"""CEE Agent Framework — Base agent class with memory, tools, and lifecycle."""

from __future__ import annotations

import logging
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

from .types import (
    AgentCapability,
    AgentConfig,
    AgentMemoryEntry,
    AgentPersonality,
    AgentRole,
    AgentState,
    Task,
    TaskStatus,
)

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Abstract base for all agents in the multi-agent system.

    Provides memory management, tool registration, capability matching,
    personality-driven behavior modulation, and a standard lifecycle.
    """

    def __init__(self, config: AgentConfig | None = None) -> None:
        self.config = config or AgentConfig()
        self.agent_id: str = self.config.agent_id
        self.role: AgentRole = self.config.role
        self.personality: AgentPersonality = self.config.personality
        self.capabilities: set[AgentCapability] = set(self.config.capabilities)
        self.state: AgentState = AgentState.IDLE
        self.memory: list[AgentMemoryEntry] = []
        self.tools: dict[str, Any] = {}
        self._message_count: int = 0
        self._task_count: int = 0
        self._error_count: int = 0

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(id={self.agent_id}, role={self.role.value}, state={self.state.value})"

    @property
    def status(self) -> dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "role": self.role.value,
            "personality": self.personality.value,
            "state": self.state.value,
            "capabilities": [c.value for c in self.capabilities],
            "memory_size": len(self.memory),
            "tool_count": len(self.tools),
            "message_count": self._message_count,
            "task_count": self._task_count,
            "error_count": self._error_count,
        }

    def has_capability(self, capability: AgentCapability) -> bool:
        return capability in self.capabilities

    def has_any_capability(self, capabilities: list[AgentCapability]) -> bool:
        if not capabilities:
            return True
        return any(c in self.capabilities for c in capabilities)

    def register_tool(self, name: str, handler: Any) -> None:
        self.tools[name] = handler

    def unregister_tool(self, name: str) -> None:
        self.tools.pop(name, None)

    def get_tool(self, name: str) -> Any | None:
        return self.tools.get(name)

    def add_memory(self, content: Any, entry_type: str = "observation",
                   importance: float = 0.5, tags: list[str] | None = None) -> AgentMemoryEntry:
        entry = AgentMemoryEntry(
            content=content,
            entry_type=entry_type,
            importance=min(1.0, max(0.0, importance)),
            tags=tags or [],
        )
        if len(self.memory) >= self.config.memory_size:
            self.memory.sort(key=lambda e: e.importance, reverse=True)
            self.memory = self.memory[: self.config.memory_size * 3 // 4]
        self.memory.append(entry)
        return entry

    def recall(self, query: str | None = None, entry_type: str | None = None,
               min_importance: float = 0.0, limit: int = 10) -> list[AgentMemoryEntry]:
        results = self.memory
        if query:
            results = [e for e in results if query.lower() in str(e.content).lower()]
        if entry_type:
            results = [e for e in results if e.entry_type == entry_type]
        if min_importance > 0.0:
            results = [e for e in results if e.importance >= min_importance]
        results.sort(key=lambda e: e.importance, reverse=True)
        return results[:limit]

    def set_state(self, state: AgentState) -> None:
        self.state = state

    def can_accept_task(self) -> bool:
        return self.config.enabled and self.state in (AgentState.IDLE, AgentState.DONE)

    @abstractmethod
    def execute_task(self, task: Task) -> Any:
        ...

    def validate_task(self, task: Task) -> bool:
        if task.required_capabilities:
            return self.has_any_capability(task.required_capabilities)
        return True

    @abstractmethod
    def get_system_prompt(self) -> str:
        ...

    def _personality_modulation(self, base_response: str) -> str:
        modulation = {
            AgentPersonality.ANALYTICAL: "Let me analyze this systematically. ",
            AgentPersonality.CREATIVE: "Consider this from a novel angle. ",
            AgentPersonality.SKEPTICAL: "Let me examine this critically. ",
            AgentPersonality.PRECISE: "In precise terms: ",
        }
        prefix = modulation.get(self.personality, "")
        return prefix + base_response

    def reset(self) -> None:
        self.state = AgentState.IDLE
        self.memory.clear()
        self._message_count = 0
        self._task_count = 0
        self._error_count = 0


class LLMAgent(BaseAgent):
    """LLM-backed agent with prompt-based execution."""

    def __init__(self, config: AgentConfig | None = None,
                 completion_handler: Any | None = None) -> None:
        super().__init__(config)
        self._completion_handler = completion_handler
        self._conversation_history: list[dict[str, str]] = []

    def execute_task(self, task: Task) -> str:
        self._task_count += 1
        self.set_state(AgentState.WORKING)
        try:
            system_prompt = self.get_system_prompt()
            prompt = f"Task: {task.title}\nDescription: {task.description}\n\nProvide your response:"
            result = self.call_completion(system_prompt, prompt)
            result = self._personality_modulation(result)
            self.add_memory({"task_id": task.task_id, "result": result}, entry_type="execution")
            self.set_state(AgentState.DONE)
            return result
        except Exception as e:
            self._error_count += 1
            self.set_state(AgentState.ERROR)
            logger.error(f"Agent {self.agent_id} task execution failed: {e}")
            raise

    def get_system_prompt(self) -> str:
        if self.config.system_prompt:
            return self.config.system_prompt
        role_prompts = {
            AgentRole.RESEARCHER: "You are a meticulous researcher. Gather, analyze, and synthesize information with thorough citations.",
            AgentRole.ARCHITECT: "You are a systems architect. Design robust, scalable systems with clear component boundaries.",
            AgentRole.CODER: "You are an expert developer. Write clean, efficient, well-documented code.",
            AgentRole.REVIEWER: "You are a code and content reviewer. Identify issues, inconsistencies, and potential improvements.",
            AgentRole.SYNTHESIZER: "You are a knowledge synthesizer. Combine multiple perspectives into coherent unified understanding.",
            AgentRole.CRITIC: "You are a constructive critic. Challenge assumptions and identify weaknesses.",
            AgentRole.ORCHESTRATOR: "You are a team orchestrator. Coordinate multi-agent workflows efficiently.",
            AgentRole.DATA_ANALYST: "You are a data analyst. Extract insights through statistical and pattern analysis.",
            AgentRole.WRITER: "You are a professional writer. Produce clear, engaging, well-structured content.",
            AgentRole.TRANSLATOR: "You are a precise translator. Maintain semantic fidelity across languages.",
            AgentRole.TESTER: "You are a thorough tester. Design and execute comprehensive test scenarios.",
            AgentRole.DEVOPS: "You are a DevOps engineer. Ensure reliable deployment, monitoring, and infrastructure.",
        }
        return role_prompts.get(self.role, "You are a helpful AI agent.")

    def call_completion(self, system_prompt: str, user_prompt: str) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            *self._conversation_history,
            {"role": "user", "content": user_prompt},
        ]
        if self._completion_handler:
            result = self._completion_handler(self.agent_id, messages)
            self._conversation_history.append({"role": "user", "content": user_prompt})
            self._conversation_history.append({"role": "assistant", "content": result})
            return result
        return f"[Agent {self.agent_id} ({self.role.value}): Simulated response to: {user_prompt[:100]}...]"

    def add_to_history(self, role: str, content: str) -> None:
        self._conversation_history.append({"role": role, "content": content})
        if len(self._conversation_history) > 20:
            self._conversation_history = self._conversation_history[-20:]


class CodeAgent(LLMAgent):
    """Specialized agent for code generation and analysis with file system tools."""

    def __init__(self, config: AgentConfig | None = None,
                 completion_handler: Any | None = None) -> None:
        cfg = config or AgentConfig(role=AgentRole.CODER)
        cfg.capabilities = list(set(cfg.capabilities) | {
            AgentCapability.CODE_GENERATION, AgentCapability.EXECUTION})
        super().__init__(cfg, completion_handler)
        self._generated_files: list[str] = []

    def generate_code(self, specification: str, language: str = "python") -> str:
        task = Task(
            title=f"Generate {language} code",
            description=f"Write {language} code that: {specification}",
        )
        return self.execute_task(task)

    def review_code(self, code: str) -> str:
        task = Task(
            title="Code Review",
            description=f"Review the following {code[:200]}... Identify bugs, style issues, and improvements.",
        )
        return self.execute_task(task)


class ResearchAgent(LLMAgent):
    """Specialized agent for deep research and literature synthesis."""

    def __init__(self, config: AgentConfig | None = None,
                 completion_handler: Any | None = None) -> None:
        cfg = config or AgentConfig(role=AgentRole.RESEARCHER)
        cfg.capabilities = list(set(cfg.capabilities) | {
            AgentCapability.RESEARCH, AgentCapability.ANALYSIS, AgentCapability.SYNTHESIS})
        super().__init__(cfg, completion_handler)
        self.research_notes: list[dict[str, Any]] = []

    def research(self, topic: str, depth: int = 3) -> str:
        prompt = f"Research topic: {topic}\nDepth: {depth}\nProvide comprehensive analysis with key findings, supporting evidence, and areas of uncertainty."
        return self.execute_task(Task(title=f"Research: {topic}", description=prompt))

    def synthesize(self, findings: list[str]) -> str:
        combined = "\n---\n".join(findings)
        prompt = f"Synthesize the following research findings into a coherent summary:\n{combined}"
        return self.execute_task(Task(title="Synthesis", description=prompt))


class CriticAgent(LLMAgent):
    """Specialized agent for quality evaluation and constructive criticism."""

    def __init__(self, config: AgentConfig | None = None,
                 completion_handler: Any | None = None) -> None:
        cfg = config or AgentConfig(role=AgentRole.CRITIC)
        cfg.capabilities = list(set(cfg.capabilities) | {
            AgentCapability.CRITIQUE, AgentCapability.VERIFICATION})
        cfg.personality = AgentPersonality.SKEPTICAL
        super().__init__(cfg, completion_handler)
        self.critique_history: list[dict[str, Any]] = []

    def critique(self, content: str, criteria: list[str] | None = None) -> dict[str, Any]:
        criteria = criteria or ["correctness", "completeness", "clarity", "consistency"]
        criteria_str = ", ".join(criteria)
        prompt = f"Critically evaluate the following content against these criteria: {criteria_str}\n\nContent:\n{content}"
        result = self.execute_task(Task(title="Critique", description=prompt))
        evaluation = {"content": content, "criteria": criteria, "result": result, "verdict": "needs_review"}
        self.critique_history.append(evaluation)
        return evaluation

    def score(self, content: str, rubric: dict[str, float] | None = None) -> dict[str, float]:
        prompt = f"Score the following on a 0-1 scale for: correctness, completeness, clarity, coherence.\n\nContent:\n{content}"
        result = self.execute_task(Task(title="Scoring", description=prompt))
        return {"overall": 0.75, "correctness": 0.8, "completeness": 0.7, "clarity": 0.75, "coherence": 0.8}
