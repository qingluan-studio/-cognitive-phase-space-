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
"""

from cee.app.engine.search import (
    WebSearchEngine,
    SearchProvider,
    SearchResult,
    DuckDuckGoProvider,
    BingProvider,
    GoogleProvider,
    SearchConfig,
)

from cee.app.engine.rag import (
    RAGEngine,
    TextChunker,
    SimpleVectorStore,
    TFIDFVectorizer,
    BM25Ranker,
    RAGConfig,
    ChunkInfo,
)

from cee.app.engine.files import (
    FileProcessor,
    FileParseResult,
    PDFParser,
    DocxParser,
    ImageParser,
    CodeParser,
    CSVParser,
    ExcelParser,
    FileBatchResult,
)

from cee.app.engine.think import (
    DeepThinkEngine,
    SubQuestion,
    ThinkingChain,
    Hypothesis,
    MultiAngleAnalysis,
    ThinkingResult,
    ThinkConfig,
)

from cee.app.engine.creative import (
    CreativeSynthesisEngine,
    ConceptNode,
    ConceptGraph,
    AnalogyResult,
    SCAMPERResult,
    CreativeIdea,
    SynthesisResult,
    CreativeConfig,
)

from cee.app.engine.bias import (
    BiasDetector,
    BiasReport,
    BiasItem,
    BiasType,
    BiasSeverity,
    CorrectionAdvice,
)

from cee.app.engine.memory import (
    MemorySystem,
    MemoryEntry,
    MemoryType,
    ShortTermMemory,
    LongTermMemory,
    UserProfile,
    MemoryConfig,
)

from cee.app.engine.context_memory import (
    ContextAwareMemory,
    ContextMemoryConfig,
    get_global_context,
)

__all__ = [
    # search
    "WebSearchEngine", "SearchProvider", "SearchResult",
    "DuckDuckGoProvider", "BingProvider", "GoogleProvider", "SearchConfig",
    # rag
    "RAGEngine", "TextChunker", "SimpleVectorStore",
    "TFIDFVectorizer", "BM25Ranker", "RAGConfig", "ChunkInfo",
    # files
    "FileProcessor", "FileParseResult", "PDFParser", "DocxParser",
    "ImageParser", "CodeParser", "CSVParser", "ExcelParser", "FileBatchResult",
    # think
    "DeepThinkEngine", "SubQuestion", "ThinkingChain",
    "Hypothesis", "MultiAngleAnalysis", "ThinkingResult", "ThinkConfig",
    # creative
    "CreativeSynthesisEngine", "ConceptNode", "ConceptGraph",
    "AnalogyResult", "SCAMPERResult", "CreativeIdea",
    "SynthesisResult", "CreativeConfig",
    # bias
    "BiasDetector", "BiasReport", "BiasItem",
    "BiasType", "BiasSeverity", "CorrectionAdvice",
    # memory
    "MemorySystem", "MemoryEntry", "MemoryType",
    "ShortTermMemory", "LongTermMemory", "UserProfile", "MemoryConfig",
    # context_memory
    "ContextAwareMemory", "ContextMemoryConfig", "get_global_context",
]
