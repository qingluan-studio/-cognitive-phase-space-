"""
CEE 认知引擎核心模块

提供 AI 对话应用的核心引擎能力：
  - search: 联网搜索引擎，多源搜索聚合
  - rag: RAG 检索增强生成，向量化知识检索
  - files: 文件处理引擎，多格式文件解析
  - think: 深度思考引擎，Chain-of-Thought 推理
  - creative: 创意合成引擎，跨领域知识融合
  - bias: 认知偏差检测器，推理偏差识别
  - memory: 持久记忆系统，跨会话记忆管理
  - debate: 辩论引擎，多角色辩证推理
  - fact_checker: 事实核查引擎，声明验证
  - curriculum: 课程学习引擎，自适应难度排序
  - analogy: 类比推理引擎，跨域映射
  - explainability: 可解释性引擎，AI推理透明度
"""

from cee.app.engine.search import (
    WebSearchEngine, SearchProvider, SearchResult,
    DuckDuckGoProvider, BingProvider, GoogleProvider, SearchConfig,
)

from cee.app.engine.rag import (
    RAGEngine, TextChunker, SimpleVectorStore,
    TFIDFVectorizer, BM25Ranker, RAGConfig, ChunkInfo,
)

from cee.app.engine.files import (
    FileProcessor, FileParseResult, PDFParser, DocxParser,
    ImageParser, CodeParser, CSVParser, ExcelParser, FileBatchResult,
)

from cee.app.engine.think import (
    DeepThinkEngine, SubQuestion, ThinkingChain,
    Hypothesis, MultiAngleAnalysis, ThinkingResult, ThinkConfig,
)

from cee.app.engine.creative import (
    CreativeSynthesisEngine, ConceptNode, ConceptGraph,
    AnalogyResult, SCAMPERResult, CreativeIdea,
    SynthesisResult, CreativeConfig,
)

from cee.app.engine.bias import (
    BiasDetector, BiasReport, BiasItem,
    BiasType, BiasSeverity, CorrectionAdvice,
)

from cee.app.engine.memory import (
    MemorySystem, MemoryEntry, MemoryType,
    ShortTermMemory, LongTermMemory, UserProfile, MemoryConfig,
)

from cee.app.engine.context_memory import (
    ContextAwareMemory, ContextMemoryConfig, get_global_context,
)

from cee.app.engine.debate import (
    DebateEngine, ArgumentAnalyzer, StanceDetector,
    DebateArgument, DebateResult, ArgumentQuality, ArgumentType, Stance,
)

from cee.app.engine.fact_checker import (
    FactChecker, ClaimExtractor, CredibilityScorer, CrossValidator,
    FactClaim, VerificationResult, Verdict, CredibilityLevel, SourceEvidence,
)

from cee.app.engine.curriculum import (
    CurriculumLearningEngine, CurriculumPlanner, DifficultyEstimator,
    SpacedRepetition, Concept, LearningMaterial, LearnerProfile,
    DifficultyLevel, MasteryState,
)

from cee.app.engine.analogy import (
    AnalogyEngine, StructureMapper,
    AnalogyMapping, AnalogyResult, AnalogyType, MappingQuality, Domain,
)

from cee.app.engine.explainability import (
    ExplainabilityEngine, FeatureAttributor, DecisionPathTracer,
    ExplanationResult, FeatureAttribution, DecisionNode,
    CounterfactualExplanation, ExplanationType, AttributionMethod,
)

__all__ = [
    "WebSearchEngine", "SearchProvider", "SearchResult",
    "DuckDuckGoProvider", "BingProvider", "GoogleProvider", "SearchConfig",
    "RAGEngine", "TextChunker", "SimpleVectorStore",
    "TFIDFVectorizer", "BM25Ranker", "RAGConfig", "ChunkInfo",
    "FileProcessor", "FileParseResult", "PDFParser", "DocxParser",
    "ImageParser", "CodeParser", "CSVParser", "ExcelParser", "FileBatchResult",
    "DeepThinkEngine", "SubQuestion", "ThinkingChain",
    "Hypothesis", "MultiAngleAnalysis", "ThinkingResult", "ThinkConfig",
    "CreativeSynthesisEngine", "ConceptNode", "ConceptGraph",
    "AnalogyResult", "SCAMPERResult", "CreativeIdea",
    "SynthesisResult", "CreativeConfig",
    "BiasDetector", "BiasReport", "BiasItem",
    "BiasType", "BiasSeverity", "CorrectionAdvice",
    "MemorySystem", "MemoryEntry", "MemoryType",
    "ShortTermMemory", "LongTermMemory", "UserProfile", "MemoryConfig",
    "ContextAwareMemory", "ContextMemoryConfig", "get_global_context",
    "DebateEngine", "ArgumentAnalyzer", "StanceDetector",
    "DebateArgument", "DebateResult", "ArgumentQuality", "ArgumentType", "Stance",
    "FactChecker", "ClaimExtractor", "CredibilityScorer", "CrossValidator",
    "FactClaim", "VerificationResult", "Verdict", "CredibilityLevel", "SourceEvidence",
    "CurriculumLearningEngine", "CurriculumPlanner", "DifficultyEstimator",
    "SpacedRepetition", "Concept", "LearningMaterial", "LearnerProfile",
    "DifficultyLevel", "MasteryState",
    "AnalogyEngine", "StructureMapper",
    "AnalogyMapping", "AnalogyResult", "AnalogyType", "MappingQuality", "Domain",
    "ExplainabilityEngine", "FeatureAttributor", "DecisionPathTracer",
    "ExplanationResult", "FeatureAttribution", "DecisionNode",
    "CounterfactualExplanation", "ExplanationType", "AttributionMethod",
]
