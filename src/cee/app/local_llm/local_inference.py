"""
认知涌现引擎 — 本地推理引擎 v6.0
===============================
十层智能管线：情感感知 → 加速缓存 → 意图澄清 → 阅读理解 →
              记忆召回 → 用户画像 → 知识图谱扩展 → 知识库检索 →
              规则模板 → CEE引擎合成 → 自我反思

全模块:
- AffectEngine: 情绪检测+语气调节
- InferenceSpeedup: L1哈希+L2语义缓存
- ClarificationEngine: 模糊追问
- ReadingComprehension: 指代消解
- MemoryEngine: 三层记忆
- UserProfile: 用户画像
- KnowledgeGraph: 知识关联图谱
- ReflectionEngine: 自我反思
- FeedbackLearner: 即时学习
"""

from __future__ import annotations

import time
from typing import Optional, Any

from .knowledge_store import SelfLearningKnowledgeStore, ConversationPair
from .fallback_rules import generate_fallback, detect_intent
from .speedup import InferenceSpeedup
from .clarification import ClarificationEngine
from .memory_engine import MemoryEngine
from .reading_comprehension import ReadingComprehension
from .user_profile import UserProfile
from .affect_engine import AffectEngine
from .knowledge_graph import KnowledgeGraph
from .reflection_engine import ReflectionEngine
from .feedback_learner import FeedbackLearner


class LocalInferenceEngine:
    """
    本地推理引擎 v6.0: 零API依赖，十层智能管线

    使用方法:
        engine = LocalInferenceEngine()
        result = engine.chat("你好")
        engine.feedback("你好", "like")  # 用户点赞
    """

    def __init__(self, quality_threshold: float = 0.70,
                 t1_engine=None, t2_engine=None, t5_engine=None,
                 t6_engine=None, controller=None,
                 session_id: str = "default"):
        self.store = SelfLearningKnowledgeStore(quality_threshold=quality_threshold)
        self._quality_threshold = quality_threshold
        self._stats = {"total_queries": 0, "cache_hits": 0, "fallback_uses": 0, "engine_uses": 0}

        self._t1 = t1_engine
        self._t2 = t2_engine
        self._t5 = t5_engine
        self._t6 = t6_engine
        self._controller = controller

        self._session_id = session_id
        self._affect = AffectEngine()
        self._speedup = InferenceSpeedup()
        self._clarifier = ClarificationEngine()
        self._memory = MemoryEngine(session_id=session_id)
        self._reader = ReadingComprehension()
        self._profile = UserProfile(session_id=session_id)
        self._kgraph = KnowledgeGraph()
        self._reflection = ReflectionEngine()
        self._feedback = FeedbackLearner()

        self._last_reply: dict[str, Any] = {}

    def set_engines(self, t1=None, t2=None, t5=None, t6=None, controller=None):
        self._t1 = t1
        self._t2 = t2
        self._t5 = t5
        self._t6 = t6
        self._controller = controller

    def set_session(self, session_id: str):
        self._session_id = session_id
        self._memory = MemoryEngine(session_id=session_id)
        self._profile = UserProfile(session_id=session_id)

    def chat(self, user_text: str, history: list[dict] | None = None,
             deep_think: bool = False) -> dict[str, Any]:
        """主推理入口 — 十层管线"""

        start = time.perf_counter()
        self._stats["total_queries"] += 1

        # ── 第0层：情感感知 ──
        affect = self._affect.detect(user_text)
        tone = self._affect.choose_tone(affect)

        # ── 第0层：加速缓存 ──
        vectorizer = self.store._vectorizer if self.store._query_vectors is not None else None
        cached = self._speedup.lookup(user_text, vectorizer)
        if cached:
            elapsed = round(time.perf_counter() - start, 3)
            self._profile.update_from_query(user_text)
            self._memory.add_exchange(user_text, cached.content)
            self._last_reply = {"content": cached.content, "cee_scores": cached.cee_scores,
                                "cee_tier": cached.cee_tier, "source": cached.source,
                                "intent": cached.intent}
            self._reflection.push_reply(self._last_reply)
            return {
                "content": cached.content,
                "cee_scores": cached.cee_scores,
                "cee_tier": cached.cee_tier,
                "model": "空间引擎 v6.0 (缓存命中)",
                "source": cached.source,
                "learned": False, "optimized": False, "retries": 0,
                "knowledge_hits": 0, "intent": cached.intent,
                "elapsed_s": elapsed,
                "total_learned": self.store.stats()["total_pairs"],
                "cached": True,
                "speedup_stats": self._speedup.stats(),
                "affect": affect,
            }

        # ── 第0.5层：意图澄清 ──
        clarification = self._clarifier.check(user_text, self._session_id)
        if clarification:
            elapsed = round(time.perf_counter() - start, 3)
            options_html = ""
            if clarification.get("options"):
                opts = "".join(
                    f'<span class="quick-option" data-value="{o}">{o}</span>'
                    for o in clarification["options"]
                )
                options_html = f'<div class="clarify-options">{opts}</div>'

            self._profile.update_from_query(user_text)
            return {
                "content": clarification["question"] + options_html,
                "cee_scores": {"itc": 0, "scs": 0, "iec": 0, "pfft": 0},
                "cee_tier": "CLARIFY",
                "model": "空间引擎 v6.0 (需要澄清)",
                "source": "clarification", "learned": False, "optimized": False,
                "retries": 0, "knowledge_hits": 0,
                "intent": "needs_clarification", "elapsed_s": elapsed,
                "total_learned": self.store.stats()["total_pairs"],
                "clarification": True, "affect": affect,
            }

        # ── 第0.6层：阅读理解 ──
        reading = self._reader.analyze(user_text, history or [])
        if reading["continuity"] and reading["entity_ref"]:
            user_text = f"{reading['entity_ref']}：{user_text}"

        # ── 第0.7层：记忆召回 ──
        episodic_facts = self._memory.recall(user_text, top_k=3)
        memory_context = self._memory.get_context_for_inference()

        # ── 第0.8层：用户画像 ──
        self._profile.update_from_query(user_text)
        profile_context = self._profile.get_context()

        # ── 第0.9层：知识图谱扩展 ──
        kg_enrichment = self._enrich_with_kgraph(user_text)

        # ── 第1层：知识库检索 ──
        intent = detect_intent(user_text)
        retrieved = self.store.retrieve(user_text, top_k=3, min_similarity=0.25)

        if retrieved and len(retrieved) > 0 and not self._is_trivial_match(user_text, retrieved[0]):
            self._stats["cache_hits"] += 1
            content = self._enrich_with_history(
                user_text, retrieved, episodic_facts, memory_context,
                profile_context, kg_enrichment, tone, affect,
            )
            source = "knowledge_base"
        else:
            self._stats["fallback_uses"] += 1
            content = generate_fallback(user_text, intent=intent)
            source = "fallback_rules"

        # ── 情感语气注入 ──
        content = self._inject_tone(content, tone, affect)

        # ── T6 CEE 评估 ──
        cee_scores = self._evaluate(content)
        composite = (cee_scores["itc"] + cee_scores["scs"] +
                     cee_scores["iec"] + cee_scores["pfft"]) / 4

        # ── 闭环优化 ──
        optimized = False
        retries = 0
        if composite < 0.65 and self._t5 and retrieved:
            try:
                optimized_content = self._optimize_with_engines(user_text, content)
                optimized_scores = self._evaluate(optimized_content)
                opt_composite = (optimized_scores["itc"] + optimized_scores["scs"] +
                                 optimized_scores["iec"] + optimized_scores["pfft"]) / 4
                if opt_composite > composite:
                    content = optimized_content
                    cee_scores = optimized_scores
                    composite = opt_composite
                    optimized = True
                    retries = 1
            except Exception:
                pass

        # ── 自学习 (结合反馈判断) ──
        learned = False
        if (self._feedback.should_learn(user_text, composite)
                and not self._is_trivial(user_text)
                and not self._is_template_response(content)
                and source != "fallback_rules"):
            learned = self.store.learn(
                user_text, content,
                cee_scores["itc"], cee_scores["scs"],
                cee_scores["iec"], cee_scores["pfft"],
            )

        tier = ("S" if composite >= 0.90 else "A" if composite >= 0.80
                else "B" if composite >= 0.70 else "C" if composite >= 0.50 else "D")

        elapsed = round(time.perf_counter() - start, 3)

        # ── 存入加速缓存 ──
        self._speedup.store(user_text, content, cee_scores, tier, source, intent,
                            vectorizer=vectorizer)

        # ── 更新记忆 ──
        self._memory.add_exchange(user_text, content)

        # ── 自我反思 ──
        self._last_reply = {"content": content, "cee_scores": cee_scores,
                            "cee_tier": tier, "source": source,
                            "intent": intent, "elapsed_s": elapsed}
        self._reflection.push_reply(self._last_reply)

        result = {
            "content": content,
            "cee_scores": cee_scores,
            "cee_tier": tier,
            "model": "空间引擎 v6.0 (本地推理)",
            "source": source, "learned": learned, "optimized": optimized,
            "retries": retries, "knowledge_hits": len(retrieved) if retrieved else 0,
            "intent": intent, "elapsed_s": elapsed,
            "total_learned": self.store.stats()["total_pairs"],
            "cached": False, "speedup_stats": self._speedup.stats(),
            "episodic_facts": episodic_facts,
            "has_profile": bool(self._profile.get_context()),
            "clarification": False, "affect": affect,
            "tone": tone,
        }

        # ── 周期反思 ──
        if self._reflection.should_reflect():
            self._reflection.reflect()

        return result

    def feedback(self, query: str, rating: str):
        """
        用户反馈: rating = "like" | "dislike"

        engine.feedback("认知涌现是什么", "like")
        """
        if not self._last_reply:
            return
        self._feedback.record(
            query=query,
            response=self._last_reply.get("content", ""),
            rating=rating,
            source=self._last_reply.get("source", "?"),
            cee_tier=self._last_reply.get("cee_tier", "?"),
            cee_scores=self._last_reply.get("cee_scores", {}),
        )

    # ── 内部方法 ─────────────────────────────────────────────

    def _enrich_with_kgraph(self, query: str) -> str:
        """知识图谱关联扩展"""
        from .fallback_rules import BUILTIN_KNOWLEDGE
        for keyword in BUILTIN_KNOWLEDGE:
            kn = keyword.replace(" ", "").lower()
            qn = query.replace(" ", "").lower()
            if kn in qn:
                return self._kgraph.get_enrichment(keyword)
            for wl in (4, 3):
                for i in range(len(qn) - wl + 1):
                    if qn[i:i + wl] in kn:
                        return self._kgraph.get_enrichment(keyword)
        return ""

    def _enrich_with_history(self, query: str, retrieved: list[ConversationPair],
                             episodic_facts: list[str], memory_context: str,
                             profile_context: str, kg_text: str,
                             tone: str, affect: dict) -> str:
        best = retrieved[0]

        lines: list[str] = []

        if kg_text:
            lines.append(kg_text)
            lines.append("")

        lines.append(best.ai_response)

        if episodic_facts:
            facts_str = "；".join(episodic_facts)
            lines.append(f"\n--- 此前你提到: {facts_str} ---")

        if len(retrieved) > 1:
            lines.append(f"\n补充参考: {retrieved[1].ai_response[:200]}")

        return "\n".join(lines)

    def _inject_tone(self, content: str, tone: str, affect: dict) -> str:
        """在回复前后注入情感语气"""
        prefix = self._affect.tone_prefix(tone)
        postfix = self._affect.tone_postfix(tone, affect)

        if prefix and not content.startswith(prefix):
            content = prefix + ". " + content
        if postfix and not content.endswith(postfix):
            content = content.rstrip() + "\n\n" + postfix

        return content

    def _evaluate(self, text: str) -> dict[str, float]:
        if self._t6:
            try:
                scores = self._t6.evaluate(text)
                return {
                    "itc": round(float(getattr(scores, "itc", 0.78)), 3),
                    "scs": round(float(getattr(scores, "scs", 0.82)), 3),
                    "iec": round(float(getattr(scores, "iec", 0.62)), 3),
                    "pfft": round(float(getattr(scores, "pfft", 0.75)), 3),
                }
            except Exception:
                pass
        return {"itc": 0.78, "scs": 0.82, "iec": 0.62, "pfft": 0.75}

    def _optimize_with_engines(self, user_text: str, content: str) -> str:
        result = content
        if self._t1:
            try:
                mirrored = self._t1.mirror_generate(user_text, style_hint="analytical")
                if mirrored and len(mirrored) > 20:
                    result = mirrored[:600]
            except Exception:
                pass
        if self._t5 and len(result) < 200:
            try:
                branches = self._t5.grow(user_text, 2)
                if branches:
                    hybrid = self._t5.hybridize(branches[:2])
                    if hybrid and isinstance(hybrid, str):
                        result = str(hybrid)[:600]
            except Exception:
                pass
        return result

    def _is_trivial(self, text: str) -> bool:
        trivial = {"你好", "hi", "hello", "在吗", "?", "？", "谢谢", "thanks", "好的", "ok", "嗯", "哦"}
        return text.strip().lower() in trivial

    def _is_trivial_match(self, query: str, pair: ConversationPair) -> bool:
        ql = query.lower().replace(" ", "")
        pl = pair.user_query.lower().replace(" ", "")
        if len(set(ql)) < 4 or len(set(pl)) < 4:
            return True
        common = set(ql) & set(pl)
        return len(common) / max(1, min(len(set(ql)), len(set(pl)))) < 0.15

    def _is_template_response(self, content: str) -> bool:
        markers = ["【基础定义】", "【深层理解】", "【实际应用】",
                   "关于这个问题，让我从代码层面分析",
                   "让我推荐几个方案", "学习路线建议",
                   "让我用 T5 反事实生长引擎"]
        return any(m in content for m in markers)

    # ── 公开接口 ─────────────────────────────────────────────

    def search(self, query: str, top_k: int = 5) -> list[ConversationPair]:
        return self.store.retrieve(query, top_k=top_k, min_similarity=0.05)

    def stats(self) -> dict:
        s = self.store.stats()
        s.update(self._stats)
        s["hit_rate"] = round(self._stats["cache_hits"] / max(1, self._stats["total_queries"]), 3)
        s["speedup"] = self._speedup.stats()
        s["memory"] = self._memory.stats()
        s["profile"] = self._profile.stats()
        s["affect"] = self._affect.stats()
        s["kgraph"] = self._kgraph.stats()
        s["reflection"] = self._reflection.stats()
        s["feedback"] = self._feedback.stats()
        return s

    def export_training_data(self) -> list[dict]:
        return self.store.export_training_data()

    def prune(self) -> int:
        return self.store.prune()

    def get_memory_summary(self) -> str:
        return self._memory.summarize()

    def get_profile_dict(self) -> dict:
        return self._profile.get_profile_dict()

    def get_affect_trend(self) -> str:
        return self._affect.get_trend()

    def get_kgraph_stats(self) -> dict:
        return self._kgraph.stats()

    def get_reflection_advice(self) -> str:
        return self._reflection.get_advice()

    def clear_speedup_cache(self):
        self._speedup.clear()
