"""
认知涌现引擎 — 本地推理模块 v8.0
===========================
零 API 依赖的自学习对话引擎，十八引擎协同

新六引擎(v8.0):
  PhaseTransitionDetector — 相变检测 (探索↔利用/发散↔收敛/感性↔理性)
  MetaCognition            — 元认知 (置信度校准+未知觉察+自适应策略)
  ConceptualBlending       — 概念融合 (双域混合创造涌现洞察)
  DreamConsolidator        — 梦境巩固 (知识回放+随机重组+抽象爬梯)
  CounterfactualReasoning   — 反事实推理 (条件反转+后果投射+因果洞察)
  SalienceNetwork          — 突显网络 (六维评分+动态注意力预算)

用法:
    from cee.app.local_llm import LocalInferenceEngine, ConceptualBlending

    engine = LocalInferenceEngine()
    result = engine.chat("如果深度学习没有GPU会怎样")
    engine.feedback("如果深度学习没有GPU会怎样", "like")
    engine.dream()  # 手动触发梦境巩固
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
]
