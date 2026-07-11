"""
认知涌现引擎 — 本地推理模块 v8.1
===========================
零 API 依赖的自学习对话引擎，六本字典+去模板化组装

新七引擎(v8.0+):
  PhaseTransitionDetector — 相变检测
  MetaCognition            — 元认知校准
  ConceptualBlending       — 概念融合
  DreamConsolidator        — 梦境巩固
  CounterfactualReasoning   — 反事实推理
  SalienceNetwork          — 突显网络
  DictionaryAssembler      — 字典组装引擎(六本字典: 句子/感情/符号/字母/模式/意图)

用法:
    from cee.app.local_llm import LocalInferenceEngine, DictionaryAssembler
    engine = LocalInferenceEngine()
    result = engine.chat("给我一个排序代码，要详细解释")
"""

from .local_inference import LocalInferenceEngine
from .auto_train import AutoTrainer
from .knowledge_store import SelfLearningKnowledgeStore, ConversationPair
from .fallback_rules import generate_fallback, detect_intent
from .speedup import InferenceSpeedup
from .clarification import ClarificationEngine
from .memory_engine import MemoryEngine
from .reading_comprehension import ReadingComprehension
from .user_profile import UserProfile
from .affect_engine import AffectEngine
from .knowledge_graph import KnowledgeGraph
from .reflection_engine import ReflectionEngine, AutoTuner
from .feedback_learner import FeedbackLearner
from .auto_learner import AutoLearner
from .conversation_flow import ConversationFlow
from .phase_transition import PhaseTransitionDetector
from .metacognition import MetaCognition
from .conceptual_blending import ConceptualBlending
from .dream_consolidator import DreamConsolidator
from .counterfactual import CounterfactualReasoning
from .salience_network import SalienceNetwork
from .dictionary_assembler import DictionaryAssembler

__all__ = [
    "LocalInferenceEngine",
    "AutoTrainer",
    "SelfLearningKnowledgeStore",
    "ConversationPair",
    "generate_fallback",
    "detect_intent",
    "InferenceSpeedup",
    "ClarificationEngine",
    "MemoryEngine",
    "ReadingComprehension",
    "UserProfile",
    "AffectEngine",
    "KnowledgeGraph",
    "ReflectionEngine",
    "AutoTuner",
    "FeedbackLearner",
    "AutoLearner",
    "ConversationFlow",
    "PhaseTransitionDetector",
    "MetaCognition",
    "ConceptualBlending",
    "DreamConsolidator",
    "CounterfactualReasoning",
    "SalienceNetwork",
    "DictionaryAssembler",
]
