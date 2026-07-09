"""CEE Agent Framework — Type definitions for multi-agent orchestration."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable


class AgentCapability(Enum):
    """Atomic capabilities that agents can declare."""

    TEXT_GENERATION = "text_generation"
    CODE_GENERATION = "code_generation"
    ANALYSIS = "analysis"
    SYNTHESIS = "synthesis"
    CRITIQUE = "critique"
    RESEARCH = "research"
    SUMMARIZATION = "summarization"
    TRANSLATION = "translation"
    DATA_PROCESSING = "data_processing"
    CREATIVE_WRITING = "creative_writing"
    REASONING = "reasoning"
    PLANNING = "planning"
    EXECUTION = "execution"
    VERIFICATION = "verification"
    ORCHESTRATION = "orchestration"


class AgentPersonality(Enum):
    """Personality archetypes for agent behavior modulation."""

    ANALYTICAL = "analytical"
    CREATIVE = "creative"
    SKEPTICAL = "skeptical"
    OPTIMISTIC = "optimistic"
    PRAGMATIC = "pragmatic"
    EXPLORATORY = "exploratory"
    PRECISE = "precise"
    BALANCED = "balanced"


class AgentRole(Enum):
    """Pre-defined agent roles in the multi-agent system."""

    RESEARCHER = "researcher"
    ARCHITECT = "architect"
    CODER = "coder"
    REVIEWER = "reviewer"
    SYNTHESIZER = "synthesizer"
    CRITIC = "critic"
    ORCHESTRATOR = "orchestrator"
    DATA_ANALYST = "data_analyst"
    WRITER = "writer"
    TRANSLATOR = "translator"
    TESTER = "tester"
    DEVOPS = "devops"


class AgentState(Enum):
    """Lifecycle states of an agent."""

    IDLE = "idle"
    LOADING = "loading"
    THINKING = "thinking"
    WORKING = "working"
    WAITING = "waiting"
    DONE = "done"
    ERROR = "error"
    TERMINATED = "terminated"


class TaskStatus(Enum):
    """Task execution status."""

    PENDING = "pending"
    DELEGATED = "delegated"
    IN_PROGRESS = "in_progress"
    AWAITING_INPUT = "awaiting_input"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MessageType(Enum):
    """Types of inter-agent messages."""

    TASK_ASSIGN = "task_assign"
    TASK_RESULT = "task_result"
    TASK_QUERY = "task_query"
    TASK_RESPONSE = "task_response"
    STATUS_UPDATE = "status_update"
    CONSENSUS_VOTE = "consensus_vote"
    BROADCAST = "broadcast"
    ERROR = "error"
    HEARTBEAT = "heartbeat"
    SHUTDOWN = "shutdown"


class ConsensusType(Enum):
    """Consensus decision-making methods."""

    MAJORITY = "majority"
    SUPERMAJORITY = "supermajority"
    WEIGHTED = "weighted"
    UNANIMOUS = "unanimous"
    DELEGATED = "delegated"
    RANKED_CHOICE = "ranked_choice"


@dataclass
class AgentConfig:
    """Configuration for an individual agent."""

    agent_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    role: AgentRole = AgentRole.RESEARCHER
    personality: AgentPersonality = AgentPersonality.BALANCED
    capabilities: list[AgentCapability] = field(default_factory=list)
    max_iterations: int = 10
    temperature: float = 0.7
    system_prompt: str = ""
    tools: list[str] = field(default_factory=list)
    memory_size: int = 1000
    enabled: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentMessage:
    """A message passed between agents via the message bus."""

    msg_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    msg_type: MessageType = MessageType.STATUS_UPDATE
    sender_id: str = ""
    receiver_id: str = ""
    task_id: str = ""
    content: Any = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    priority: int = 0
    correlation_id: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Task:
    """A decomposable task unit for multi-agent execution."""

    task_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    parent_id: str = ""
    title: str = ""
    description: str = ""
    status: TaskStatus = TaskStatus.PENDING
    assigned_agent: str = ""
    required_capabilities: list[AgentCapability] = field(default_factory=list)
    estimated_complexity: float = 0.5
    dependencies: list[str] = field(default_factory=list)
    result: Any = None
    attempts: int = 0
    max_attempts: int = 3
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    deadline: str = ""
    priority: int = 0
    context: dict[str, Any] = field(default_factory=dict)


@dataclass
class OrchestrationPlan:
    """A complete plan for multi-agent task execution."""

    plan_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    goal: str = ""
    tasks: list[Task] = field(default_factory=list)
    task_dag: dict[str, list[str]] = field(default_factory=dict)
    agent_assignments: dict[str, str] = field(default_factory=dict)
    estimated_duration: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class ConsensusResult:
    """Result of a multi-agent consensus process."""

    consensus_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    question: str = ""
    consensus_type: ConsensusType = ConsensusType.MAJORITY
    votes: dict[str, Any] = field(default_factory=dict)
    weights: dict[str, float] = field(default_factory=dict)
    decision: Any = None
    confidence: float = 0.0
    agreement_ratio: float = 0.0
    dissenting_opinions: list[str] = field(default_factory=list)
    rounds: int = 1
    resolved: bool = False
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class AgentMemoryEntry:
    """A single entry in an agent's memory."""

    entry_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    content: Any = None
    entry_type: str = "observation"
    importance: float = 0.5
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    tags: list[str] = field(default_factory=list)
    embedding: list[float] | None = None


AgentToolHandler = Callable[[dict[str, Any]], dict[str, Any]]
AgentCompletionHandler = Callable[[str, list[dict[str, str]]], str]
