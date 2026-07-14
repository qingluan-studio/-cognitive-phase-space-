"""
Cognitive Emergence Engine (CEE)
================================

认知涌现引擎 — 自我宪法、可追溯决策、可传承思想、可更替治理、可永续迭代

Module Index:
  engine/       T1-T6 六大认知引擎
  governance/   六层治理 + 对抗性协作制衡
  agent/        子代理编排框架 (Multi-Agent Orchestration)
  plugin/       插件/工具动态扩展系统
  processing/   长文处理 + 数据管道 + 文档读写
  learning/     自动学习 + 超参优化 + 反馈分析
  cloud/        云端自配 + 环境感知 + 部署管理
  performance/  极速响应 + 缓存加速 + 性能分析
  multimodal/   多模态处理 (图像/音频/视频/表格)
  models/       模型注册 + Kimi 大模型集成
  knowledge/    知识图谱 + 自创新知 + 超强大脑
  output/       灵活输出 + 文件保存 + 可复制格式化
  api/          REST API 服务
  sdk/          Python SDK 客户端
  app/          AI 对话应用
  core/         核心类型 + 控制器 + CLI

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

from cee.performance import (
    ResponseCache, LRUCacheStore, QuickComprehension,
    SpeedOutput, PerformanceProfiler, FastResponse,
)

from cee.multimodal import (
    ModalityType, ModalityContent, MultimodalInput, MultimodalOutput,
    ImageProcessor, AudioProcessor, VideoProcessor, TableProcessor,
    MultimodalRouter, MultiModal,
)

from cee.models import (
    ModelProvider, LLMConfig, KimiProvider,
    ModelEntry, ModelRegistry,
)

from cee.knowledge import (
    RelationType, KnowledgeNode, KnowledgeEdge,
    KnowledgeGraph, KnowledgeSynthesizer,
    SynthesisResult, MassiveBrain,
)

from cee.output import (
    ResponseStyle, OutputConfig, FlexibleFormatter,
    FileSaver, CopyableFormatter, AdaptiveResponder,
)

from cee.agent.memory_bank import (
    MemoryBank, ShortTermMemory, LongTermMemory,
    MemoryEntry, MemoryScope, MemoryType,
)

from cee.sandbox import (
    ExecutionSandbox, ResourceLimits, SandboxPolicy,
    SandboxResult, SandboxViolation, TimeBudget, TokenBudget, ViolationType,
)

from cee.trace import (
    TraceLog, DecisionPoint, DecisionType, DecisionMethod,
    DecisionContext, DecisionAlternatives, DecisionEvidence,
)

from cee.core.human_approval import (
    HumanApprovalGate, ApprovalRequest, ApprovalResponse,
    ApprovalStatus, RiskLevel,
)

from cee.learning.explore_exploit import (
    EpsilonGreedyController, NoveltyTracker,
    StrategyRecord, StrategyStatus, GreedyStrategy,
)

from cee.core.meta_router import (
    MetaRouter, WorkflowTemplate, WorkflowCategory, RouteResult,
)

from cee.plugin.skill_market import (
    SkillRegistry, SkillManifest, SkillCategory, ToolDefinition,
)

from cee.agent.post_mortem import (
    PostMortemAgent, PostMortemReport, ExecutionTrace,
    Lesson, LessonType, StrategyQuality,
)

from cee.agent.parliament import (
    DebateOrchestrator, DebateSessionManager,
    DebateSession, DebateRound, DebateRole, Argument,
)

from cee.learning.shadow_ops import (
    ShadowRunner, ShadowConfig, ShadowTrial,
    OptimizationAdvice, OptimizationDimension,
)

from cee.middle_end import (
    MiddleEndOrchestrator, IndependentAlarmSystem, HumanHands,
    UserProfilingSystem, DualEngineRouter,
    WaterLogicMachine, TriangleTopologyEngine,
    CognitionPipeline, PipelineBuilder,
    ConfigManager, ConfigHistory,
    MemoryManager, ConversationSession, MemoryRetriever,
    DataPipelineOrchestrator, DataRecord, Extractor,
    ValueAlignment, EthicalAnalyzer, ConstitutionalAI,
    EventBus, DeadLetterQueue,
    FeedbackLoop, FeedbackCollector, ABTestFramework,
    KnowledgeGraph as MiddleEndKG, EntityExtractor, GraphReasoner,
    ModelRouter, ModelEnsemble, ModelPool,
    ReasoningEngine, ChainOfThoughtEngine, TreeOfThoughtEngine,
    SecurityGuardEngine, ContentSanitizer, InputGuard, OutputGuard,
    SemanticCache, TieredCache,
    StreamPipeline, StreamHandler,
    TaskDecomposer as MiddleTaskDecomposer, TaskScheduler, AgentRegistry,
    ToolRegistry, ToolExecutor, ToolChain,
)

# v4.4: WebSocket / Storage / Auth / Causal / MQ / MLOps
from cee.websocket import (
    WebSocketHub, ChannelManager, MessageRouter,
    TokenValidator, HeartbeatMonitor, MessageSerializer,
    WSMessage, WSMessageType, WSConnection, WSConnectionState,
    WSRole, TokenPayload, get_ws_hub,
)

from cee.storage import (
    StorageEngine, SQLiteBackend, MemoryBackend,
    BaseBackend, ConnectionConfig, QueryResult,
    BackendType, IsolationLevel,
    DatabaseError, ConnectionError, QueryError, TransactionError,
)

from cee.auth import (
    AuthGuard, JWTEngine, APIKeyManager, HMACSigner, SessionManager,
    UserIdentity, AuthToken, AuthStrategy, Permission, Role,
)

from cee.causal import (
    CausalInferenceEngine, PCEngine, LiNGAMEngine,
    DoCalculus, PropensityScoreMatcher, CounterfactualEngine,
    CausalGraph, CausalVariable, CausalEdge,
    CausalMethod, CausalEffectType,
)

from cee.mq import (
    MessageQueue, MessagePublisher, MessageSubscriber,
    DeadLetterQueue as MQDeadLetterQueue,
    RetryPolicy, MemoryAdapter, RedisAdapter, KafkaAdapter,
    BaseMQAdapter, Message, ConsumerGroup, MQBackend, DeliveryMode,
)

from cee.mlops import (
    ExperimentTracker, ExperimentRun,
    ModelRegistry, ModelVersion, ModelStage,
    DriftDetector, DriftType,
    ABTestEngine, MetricDirection,
)

from cee.models.open_source import (
    OpenAIAdapter, OllamaAdapter, MultiProviderRouter,
    BaseLLMAdapter as LLMAdapter,
    ChatMessage as LLMChatMessage,
    CompletionResponse as LLMCompletionResponse,
    CompletionChoice as LLMCompletionChoice,
    CompletionUsage as LLMCompletionUsage,
    EmbeddingResponse as LLMEmbeddingResponse,
    ProviderType as LLMProviderType,
)

from cee.trace.data_lineage import (
    LineageTracker, DataLineageGraph, LineageRecord,
    DataNode, DataEdge, NodeType, LineageStatus,
)

__version__ = "4.4.0"
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
    # Performance
    "ResponseCache", "LRUCacheStore", "QuickComprehension",
    "SpeedOutput", "PerformanceProfiler", "FastResponse",
    # Multimodal
    "ModalityType", "ModalityContent", "MultimodalInput", "MultimodalOutput",
    "ImageProcessor", "AudioProcessor", "VideoProcessor", "TableProcessor",
    "MultimodalRouter", "MultiModal",
    # Models
    "ModelProvider", "LLMConfig", "KimiProvider",
    "ModelEntry", "ModelRegistry",
    # Knowledge
    "RelationType", "KnowledgeNode", "KnowledgeEdge",
    "KnowledgeGraph", "KnowledgeSynthesizer",
    "SynthesisResult", "MassiveBrain",
    # Output
    "ResponseStyle", "OutputConfig", "FlexibleFormatter",
    "FileSaver", "CopyableFormatter", "AdaptiveResponder",
    # v2.2.0: 深层缺陷修复 + 创新功能
    # MemoryBank
    "MemoryBank", "ShortTermMemory", "LongTermMemory",
    "MemoryEntry", "MemoryScope", "MemoryType",
    # Sandbox
    "ExecutionSandbox", "ResourceLimits", "SandboxPolicy",
    "SandboxResult", "SandboxViolation", "TimeBudget", "TokenBudget",
    "ViolationType",
    # TraceLog
    "TraceLog", "DecisionPoint", "DecisionType", "DecisionMethod",
    "DecisionContext", "DecisionAlternatives", "DecisionEvidence",
    # HumanApproval
    "HumanApprovalGate", "ApprovalRequest", "ApprovalResponse",
    "ApprovalStatus", "RiskLevel",
    # ExploreExploit
    "EpsilonGreedyController", "NoveltyTracker",
    "StrategyRecord", "StrategyStatus", "GreedyStrategy",
    # MetaRouter
    "MetaRouter", "WorkflowTemplate", "WorkflowCategory", "RouteResult",
    # SkillMarket
    "SkillRegistry", "SkillManifest", "SkillCategory", "ToolDefinition",
    # PostMortem
    "PostMortemAgent", "PostMortemReport", "ExecutionTrace",
    "Lesson", "LessonType", "StrategyQuality",
    # AgentParliament
    "DebateOrchestrator", "DebateSessionManager",
    "DebateSession", "DebateRound", "DebateRole", "Argument",
    # ShadowOps
    "ShadowRunner", "ShadowConfig", "ShadowTrial",
    "OptimizationAdvice", "OptimizationDimension",
    # Middle-End v4.3
    "MiddleEndOrchestrator", "IndependentAlarmSystem", "HumanHands",
    "UserProfilingSystem", "DualEngineRouter",
    "WaterLogicMachine", "TriangleTopologyEngine",
    "CognitionPipeline", "PipelineBuilder",
    "ConfigManager", "ConfigHistory",
    "MemoryManager", "ConversationSession", "MemoryRetriever",
    "DataPipelineOrchestrator", "DataRecord", "Extractor",
    "ValueAlignment", "EthicalAnalyzer", "ConstitutionalAI",
    "EventBus", "DeadLetterQueue",
    "FeedbackLoop", "FeedbackCollector", "ABTestFramework",
    "MiddleEndKG", "EntityExtractor", "GraphReasoner",
    "ModelRouter", "ModelEnsemble", "ModelPool",
    "ReasoningEngine", "ChainOfThoughtEngine", "TreeOfThoughtEngine",
    "SecurityGuardEngine", "ContentSanitizer", "InputGuard", "OutputGuard",
    "SemanticCache", "TieredCache",
    "StreamPipeline", "StreamHandler",
    "MiddleTaskDecomposer", "TaskScheduler", "AgentRegistry",
    "ToolRegistry", "ToolExecutor", "ToolChain",
    # v4.4: WebSocket / Storage / Auth / Causal / MQ / MLOps / OpenSource LLM
    "WebSocketHub", "ChannelManager", "MessageRouter",
    "TokenValidator", "HeartbeatMonitor", "MessageSerializer",
    "WSMessage", "WSMessageType", "WSConnection", "WSConnectionState",
    "WSRole", "TokenPayload", "get_ws_hub",
    "StorageEngine", "SQLiteBackend", "MemoryBackend", "BaseBackend",
    "ConnectionConfig", "QueryResult", "BackendType", "IsolationLevel",
    "DatabaseError", "ConnectionError", "QueryError", "TransactionError",
    "AuthGuard", "JWTEngine", "APIKeyManager", "HMACSigner", "SessionManager",
    "UserIdentity", "AuthToken", "AuthStrategy", "Permission", "Role",
    "CausalInferenceEngine", "PCEngine", "LiNGAMEngine",
    "DoCalculus", "PropensityScoreMatcher", "CounterfactualEngine",
    "CausalGraph", "CausalVariable", "CausalEdge",
    "CausalMethod", "CausalEffectType",
    "MessageQueue", "MessagePublisher", "MessageSubscriber",
    "MQDeadLetterQueue", "RetryPolicy", "MemoryAdapter", "RedisAdapter",
    "KafkaAdapter", "BaseMQAdapter", "Message", "ConsumerGroup",
    "MQBackend", "DeliveryMode",
    "ExperimentTracker", "ExperimentRun",
    "ModelRegistry", "ModelVersion", "ModelStage",
    "DriftDetector", "DriftType", "ABTestEngine", "MetricDirection",
    "OpenAIAdapter", "OllamaAdapter", "MultiProviderRouter",
    "LLMAdapter", "LLMChatMessage", "LLMCompletionResponse",
    "LLMCompletionChoice", "LLMCompletionUsage", "LLMEmbeddingResponse",
    "LLMProviderType",
    "LineageTracker", "DataLineageGraph", "LineageRecord",
    "DataNode", "DataEdge", "NodeType", "LineageStatus",
]
