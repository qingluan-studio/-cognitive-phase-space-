"""CEE Agent Framework — Multi-agent orchestration for cognitive emergence.

Provides:
- BaseAgent: Abstract agent with memory, tools, and lifecycle
- LLMAgent: LLM-backed agent with prompt-based execution
- CodeAgent, ResearchAgent, CriticAgent: Specialized agents
- MessageBus: Inter-agent pub-sub communication
- TaskDecomposer: Goal-to-task DAG decomposition
- ConsensusEngine: Multi-agent voting and agreement
- MultiAgentOrchestrator: Full workflow orchestration
- CriticAgent: Multi-dimensional quality assessment
- SynthesizerAgent: Multi-source information fusion
- MediatorAgent: Conflict resolution and coordination
- CuratorAgent: Information curation and prioritization
- EthicistAgent: Ethical compliance review
"""

from .base_agent import BaseAgent, CodeAgent, CriticAgent, LLMAgent, ResearchAgent
from .consensus import ConsensusEngine
from .message_bus import MessageBus
from .orchestrator import MultiAgentOrchestrator
from .specialized import (
    CuratorAgent,
    EthicistAgent,
    MediatorAgent,
    SynthesizerAgent,
)
from .task_decomposer import TaskDecomposer
from .types import (
    AgentCapability,
    AgentConfig,
    AgentMemoryEntry,
    AgentMessage,
    AgentPersonality,
    AgentRole,
    AgentState,
    ConsensusResult,
    ConsensusType,
    MessageType,
    OrchestrationPlan,
    Task,
    TaskStatus,
)

__all__ = [
    "BaseAgent",
    "LLMAgent",
    "CodeAgent",
    "ResearchAgent",
    "CriticAgent",
    "SynthesizerAgent",
    "MediatorAgent",
    "CuratorAgent",
    "EthicistAgent",
    "MessageBus",
    "TaskDecomposer",
    "ConsensusEngine",
    "MultiAgentOrchestrator",
    "AgentCapability",
    "AgentConfig",
    "AgentMemoryEntry",
    "AgentMessage",
    "AgentPersonality",
    "AgentRole",
    "AgentState",
    "ConsensusResult",
    "ConsensusType",
    "MessageType",
    "OrchestrationPlan",
    "Task",
    "TaskStatus",
]
