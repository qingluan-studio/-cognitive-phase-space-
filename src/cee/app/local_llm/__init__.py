"""
认知涌现引擎 — 本地推理模块
===========================
零 API 依赖的自学习对话引擎

用法:
    from cee.app.local_llm import LocalInferenceEngine, AutoTrainer

    engine = LocalInferenceEngine()
    engine.set_engines(t1=t1_engine, t2=t2_engine, t5=t5_engine,
                       t6=t6_engine, controller=controller)

    result = engine.chat("你好")
    # -> {"content": "...", "cee_scores": {...}, "learned": True, ...}

    trainer = AutoTrainer(engine, interval_minutes=30)
    trainer.start()  # 后台自学习，即使浏览器关闭也继续
"""

from .local_inference import LocalInferenceEngine
from .auto_train import AutoTrainer
from .knowledge_store import SelfLearningKnowledgeStore, ConversationPair
from .fallback_rules import generate_fallback, detect_intent

__all__ = [
    "LocalInferenceEngine",
    "AutoTrainer",
    "SelfLearningKnowledgeStore",
    "ConversationPair",
    "generate_fallback",
    "detect_intent",
]
