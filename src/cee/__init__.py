"""
Cognitive Emergence Engine (CEE)
================================

认知涌现引擎 — 自我宪法、可追溯决策、可传承思想、可更替治理、可永续迭代

Module Index:
  engine/     T1-T6 六大认知引擎
  governance/ 六层治理 + 对抗性协作制衡
  agent/      子代理编排框架 (Multi-Agent Orchestration)
  plugin/     插件/工具动态扩展系统
  processing/ 长文处理 + 数据管道 + 文档读写
  learning/   自动学习 + 超参优化 + 反馈分析
  cloud/      云端自配 + 环境感知 + 部署管理
  api/        REST API 服务
  sdk/        Python SDK 客户端
  app/        AI 对话应用
  core/       核心类型 + 控制器 + CLI

Usage:
  from cee import InvariantEngine
  engine = InvariantEngine()
  scores = engine.evaluate("your text here")
"""

from cee.core.types import (
    InvariantScores, QualityTier, OptimizationPath,
    TextArtifact, OptimizationResult, EvaluationReport,
    DecisionRecord, GovernanceConfig, EngineStatus,
)

from cee.engine.t6_invariant import InvariantEngine, InvariantTheoretical
from cee.engine.t1_mirror import CognitiveIsomorphismEngine
from cee.engine.t2_prism import HyperGraphCollapseEngine
from cee.engine.t3_geodesic import GeodesicNavigationEngine
from cee.engine.t4_crystallization import CrystallizationEngine
from cee.engine.t5_genesis import GenesisEngine
from cee.core.controller import ClosedLoopController
from cee.sdk.client import CEEClient, CEEConfig

from cee.governance.adversarial import (
    AdversarialGovernance, DeviationDetector, AdversarialGameEngine,
    RoleRotationManager, ArbitrationSystem, AdversarialSafeMode,
    PrecedentStore, AgentRole, DeviationType, ArbitrationLevel,
    GameState, ExplorationVerdict, DeviationReport,
    InnovationReport, ArbitrationResult, GameRound,
)

from cee.agent import (
    BaseAgent, LLMAgent, CodeAgent, ResearchAgent, CriticAgent,
    MessageBus, TaskDecomposer, ConsensusEngine,
    MultiAgentOrchestrator, AgentCapability, AgentConfig,
    AgentPersonality, AgentRole as AgentSystemRole, AgentState,
    Task, TaskStatus, OrchestrationPlan, ConsensusResult,
)

from cee.plugin import (
    BasePlugin, PluginManager, Hooks,
    PluginCategory, PluginState, PluginMetadata,
)

from cee.processing import (
    LongTextProcessor, LongTextReport, TextChunk, ChunkStrategy,
    DataPipeline, PipelineStage, PipelineStep, PipelineResult,
    TextTransformer, JsonProcessor,
    DocReader, Document, DocumentFormat,
    OutputFormatter, OutputFormat,
)

from cee.learning import (
    AutoLearner, FeedbackStore, FeedbackRecord,
    FeedbackSentiment, FeedbackType,
    HyperOptimizer, LearningInsight, ModelSnapshot,
)

from cee.cloud import (
    CloudAutoConfig, DeploymentConfig, DeploymentTarget,
    EnvironmentDetector, EnvironmentInfo,
    HealthMonitor, ServiceInstance, ServiceStatus,
)

__version__ = "2.0.0"
__all__ = [
    # T1-T6 Engines
    "InvariantEngine", "InvariantTheoretical",
    "CognitiveIsomorphismEngine", "HyperGraphCollapseEngine",
    "GeodesicNavigationEngine", "CrystallizationEngine", "GenesisEngine",
    # Core
    "ClosedLoopController", "CEEClient", "CEEConfig",
    "InvariantScores", "QualityTier", "OptimizationPath",
    "TextArtifact", "OptimizationResult", "EvaluationReport",
    "DecisionRecord", "GovernanceConfig", "EngineStatus",
    # Governance
    "AdversarialGovernance", "DeviationDetector",
    "AdversarialGameEngine", "RoleRotationManager",
    "ArbitrationSystem", "AdversarialSafeMode", "PrecedentStore",
    "AgentRole", "DeviationType", "ArbitrationLevel",
    "GameState", "ExplorationVerdict", "DeviationReport",
    "InnovationReport", "ArbitrationResult", "GameRound",
    # Agent Framework
    "BaseAgent", "LLMAgent", "CodeAgent", "ResearchAgent", "CriticAgent",
    "MessageBus", "TaskDecomposer", "ConsensusEngine",
    "MultiAgentOrchestrator", "AgentCapability", "AgentConfig",
    "AgentPersonality", "AgentSystemRole", "AgentState",
    "Task", "TaskStatus", "OrchestrationPlan", "ConsensusResult",
    # Plugin System
    "BasePlugin", "PluginManager", "Hooks",
    "PluginCategory", "PluginState", "PluginMetadata",
    # Processing
    "LongTextProcessor", "LongTextReport", "TextChunk", "ChunkStrategy",
    "DataPipeline", "PipelineStage", "PipelineStep", "PipelineResult",
    "TextTransformer", "JsonProcessor",
    "DocReader", "Document", "DocumentFormat",
    "OutputFormatter", "OutputFormat",
    # Learning
    "AutoLearner", "FeedbackStore", "FeedbackRecord",
    "FeedbackSentiment", "FeedbackType",
    "HyperOptimizer", "LearningInsight", "ModelSnapshot",
    # Cloud
    "CloudAutoConfig", "DeploymentConfig", "DeploymentTarget",
    "EnvironmentDetector", "EnvironmentInfo",
    "HealthMonitor", "ServiceInstance", "ServiceStatus",
]
