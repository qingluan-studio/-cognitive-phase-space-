"""
认知涌现引擎 — 本地推理模块 v5.0
============================
零 API 依赖的自学习对话引擎

六层智能管线:
  第0层: 加速缓存 (L1哈希+L2语义)
  第0.5层: 意图澄清 (模糊追问)
  第0.6层: 阅读理解 (指代消解+上下文)
  第0.7层: 记忆召回 (三层记忆)
  第0.8层: 用户画像 (个性化)
  第1层: 知识库检索 (TF-IDF)
  第2层: 规则模板 (fallback)
  第3层: CEE引擎合成 (T1-T6)

用法:
    from cee.app.local_llm import LocalInferenceEngine, AutoTrainer

    engine = LocalInferenceEngine()
    engine.set_engines(t1=t1_engine, t2=t2_engine, t5=t5_engine,
                        t6=t6_engine, controller=controller)

    result = engine.chat("你好")
    # -> {"content": "...", "cee_scores": {...}, "learned": True, ...}

    # 记忆和画像
    summary = engine.get_memory_summary()
    profile = engine.get_profile_dict()

    # 后台自学习
    trainer = AutoTrainer(engine, interval_minutes=30)
    trainer.start()
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
]
