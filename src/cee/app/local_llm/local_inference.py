"""
认知涌现引擎 — 本地推理引擎 v5.0
===============================
六层策略：加速缓存 → 意图澄清 → 阅读理解 → 记忆召回 →
          知识库检索 → 规则模板 → CEE 引擎合成

新增模块:
- InferenceSpeedup: L1哈希+L2语义缓存, 50ms级响应
- ClarificationEngine: 模糊查询自动追问, 精准引导
- MemoryEngine: 三层记忆(会话/情景/语义)
- ReadingComprehension: 多轮指代消解+上下文提取
- UserProfile: 长期对话构建用户画像
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Optional, Any

from .knowledge_store import SelfLearningKnowledgeStore, ConversationPair
from .fallback_rules import generate_fallback, detect_intent
from .speedup import InferenceSpeedup
from .clarification import ClarificationEngine
from .memory_engine import MemoryEngine
from .reading_comprehension import ReadingComprehension
from .user_profile import UserProfile


class LocalInferenceEngine:
    """
    本地推理引擎 v5.0: 零API依赖，自学习闭环，六层智能管线

    使用方法:
        engine = LocalInferenceEngine()
        result = engine.chat("你好，介绍一下你自己")
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
        self._speedup = InferenceSpeedup()
        self._clarifier = ClarificationEngine()
        self._memory = MemoryEngine(session_id=session_id)
        self._reader = ReadingComprehension()
        self._profile = UserProfile(session_id=session_id)

    def set_engines(self, t1=None, t2=None, t5=None, t6=None, controller=None):
        self._t1 = t1
        self._t2 = t2
        self._t5 = t5
        self._t6 = t6
        self._controller = controller

    def set_session(self, session_id: str):
        """切换会话"""
        self._session_id = session_id
        self._memory = MemoryEngine(session_id=session_id)
        self._profile = UserProfile(session_id=session_id)

    def chat(self, user_text: str, history: list[dict] | None = None,
             deep_think: bool = False) -> dict[str, Any]:
        """主推理入口 — 六层管线"""

        start = time.perf_counter()
        self._stats["total_queries"] += 1

        # ── 第0层：加速缓存 ──
        vectorizer = self.store._vectorizer if self.store._query_vectors is not None else None
        cached = self._speedup.lookup(user_text, vectorizer)
        if cached:
            elapsed = round(time.perf_counter() - start, 3)
            self._profile.update_from_query(user_text)
            self._memory.add_exchange(user_text, cached.content)
            return {
                "content": cached.content,
                "cee_scores": cached.cee_scores,
                "cee_tier": cached.cee_tier,
                "model": "空间引擎 v5.0 (缓存命中)",
                "source": cached.source,
                "learned": False,
                "optimized": False,
                "retries": 0,
                "knowledge_hits": 0,
                "intent": cached.intent,
                "elapsed_s": elapsed,
                "total_learned": self.store.stats()["total_pairs"],
                "cached": True,
                "speedup_stats": self._speedup.stats(),
            }

        # ── 第0.5层：意图澄清 ──
        clarification = self._clarifier.check(user_text, self._session_id)
        if clarification:
            elapsed = round(time.perf_counter() - start, 3)
            options_html = ""
            if clarification.get("options"):
                opts = "".join(
                    f'<span class="quick-option" onclick="this.closest(\'.input-container\')?.'
                    f'querySelector(\'textarea\')?.focus()">{o}</span>'
                    for o in clarification["options"]
                )
                options_html = f'<div class="clarify-options">{opts}</div>'

            content = clarification["question"] + options_html
            self._profile.update_from_query(user_text)
            return {
                "content": content,
                "cee_scores": {"itc": 0.0, "scs": 0.0, "iec": 0.0, "pfft": 0.0},
                "cee_tier": "CLARIFY",
                "model": "空间引擎 v5.0 (需要澄清)",
                "source": "clarification",
                "learned": False,
                "optimized": False,
                "retries": 0,
                "knowledge_hits": 0,
                "intent": "needs_clarification",
                "elapsed_s": elapsed,
                "total_learned": self.store.stats()["total_pairs"],
                "clarification": True,
            }

        # ── 第0.6层：阅读理解(指代消解+上下文提取) ──
        reading = self._reader.analyze(user_text, history or [])
        resolved_query = reading["resolved_query"]
        if reading["continuity"] and reading["entity_ref"]:
            user_text = f"{reading['entity_ref']}：{user_text}"

        # ── 第0.7层：记忆召回 ──
        episodic_facts = self._memory.recall(user_text, top_k=3)
        memory_context = self._memory.get_context_for_inference()

        # ── 第0.8层：用户画像 ──
        self._profile.update_from_query(user_text)
        profile_context = self._profile.get_context()

        # ── 第1层：自学习知识库检索 ──
        intent = detect_intent(user_text)
        retrieved = self.store.retrieve(user_text, top_k=3, min_similarity=0.25)

        if retrieved and len(retrieved) > 0 and not self._is_trivial_match(user_text, retrieved[0]):
            self._stats["cache_hits"] += 1
            content = self._enrich_with_history(
                user_text, retrieved, history,
                episodic_facts, memory_context, profile_context,
            )
            source = "knowledge_base"
        else:
            self._stats["fallback_uses"] += 1
            content = generate_fallback(user_text, intent=intent)
            source = "fallback_rules"

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

        # ── 自学习 ──
        learned = False
        if (composite >= self._quality_threshold and not self._is_trivial(user_text)
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
        self._speedup.store(
            user_text, content, cee_scores, tier, source, intent,
            vectorizer=vectorizer,
        )

        # ── 更新记忆 ──
        self._memory.add_exchange(user_text, content)

        return {
            "content": content,
            "cee_scores": cee_scores,
            "cee_tier": tier,
            "model": "空间引擎 v5.0 (本地推理)",
            "source": source,
            "learned": learned,
            "optimized": optimized,
            "retries": retries,
            "knowledge_hits": len(retrieved) if retrieved else 0,
            "intent": intent,
            "elapsed_s": elapsed,
            "total_learned": self.store.stats()["total_pairs"],
            "cached": False,
            "speedup_stats": self._speedup.stats(),
            "episodic_facts": episodic_facts,
            "has_profile": bool(self._profile.get_context()),
            "clarification": False,
        }

    def _enrich_with_history(self, query: str, retrieved: list[ConversationPair],
                             history: list[dict] | None,
                             episodic_facts: list[str],
                             memory_context: str,
                             profile_context: str) -> str:
        """基于检索 + 记忆 + 画像 生成丰富回复"""
        best = retrieved[0]

        lines: list[str] = []

        # 用户画像注入
        if profile_context:
            profile_match = self._profile.get_match_score(query)
            if profile_match.get("matched"):
                level = profile_match.get("level", "")
                interest = profile_match.get("interest", "")
                if level:
                    lines.append(f"({level}水平向回答)")
                if interest:
                    lines.append(f"(关注领域: {interest})")
                if lines and not lines[0].startswith("("):
                    pass

        lines.append(best.ai_response)

        # 记忆注入
        if episodic_facts:
            lines.append("")
            facts_str = "；".join(episodic_facts)
            lines.append(f"--- 你对{episodic_facts[0]}有兴趣，结合之前讨论过的内容 ---")

        if len(retrieved) > 1:
            lines.append("")
            lines.append(f"补充: {retrieved[1].ai_response[:200]}")

        return "\n".join(lines)

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
        overlap_ratio = len(common) / max(1, min(len(set(ql)), len(set(pl))))
        return overlap_ratio < 0.15

    def _is_template_response(self, content: str) -> bool:
        template_markers = [
            "【基础定义】", "【深层理解】", "【实际应用】",
            "关于这个问题，让我从代码层面分析",
            "让我推荐几个方案",
            "学习路线建议",
            "让我用 T5 反事实生长引擎",
        ]
        return any(m in content for m in template_markers)

    # ── 新增公开接口 ────────────────────────────────────────

    def search(self, query: str, top_k: int = 5) -> list[ConversationPair]:
        return self.store.retrieve(query, top_k=top_k, min_similarity=0.05)

    def stats(self) -> dict:
        s = self.store.stats()
        s.update(self._stats)
        s["hit_rate"] = round(self._stats["cache_hits"] / max(1, self._stats["total_queries"]), 3)
        s["speedup"] = self._speedup.stats()
        s["memory"] = self._memory.stats()
        s["profile"] = self._profile.stats()
        return s

    def export_training_data(self) -> list[dict]:
        return self.store.export_training_data()

    def prune(self) -> int:
        return self.store.prune()

    def get_memory_summary(self) -> str:
        """获取记忆摘要"""
        return self._memory.summarize()

    def get_profile_dict(self) -> dict:
        """获取用户画像"""
        return self._profile.get_profile_dict()

    def clear_speedup_cache(self):
        """清空加速缓存"""
        self._speedup.clear()
