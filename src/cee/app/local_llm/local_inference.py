"""
认知涌现引擎 — 本地推理引擎 v8.0
===============================
双六层智能管线 + 十八引擎协同 + 自进化循环

前六层(感知/响应):
  情感感知 → 突显网络 → 加速缓存 → 意图澄清 → 阅读理解 → CEE合成

后六层(认知/学习):
  记忆召回 → 用户画像 → 知识图谱 → 知识库检索 → 规则模板 → 元认知

进化四环(自动闭环):
  相变检测 → 自学习管道 → 反思调参 → 梦境巩固

创造三叉戟(按需激活):
  概念融合 → 反事实推理 → 对话流追踪

v8.0 新增(6个原创引擎):
- 相变检测: 探索↔利用/发散↔收敛/感性↔理性 三维模式切换
- 元认知: 置信度校准+未知觉察+6维信号估计
- 概念融合: 双域混合产生涌现洞察
- 梦境巩固: 闲置期知识回放/随机重组/抽象爬梯/异常侦测
- 反事实推理: 条件反转→后果投射→因果洞察
- 突显网络: 六维显著性评分+动态注意力预算
"""

from __future__ import annotations

import re
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
from .auto_learner import AutoLearner
from .conversation_flow import ConversationFlow
from .phase_transition import PhaseTransitionDetector
from .metacognition import MetaCognition
from .conceptual_blending import ConceptualBlending
from .dream_consolidator import DreamConsolidator
from .counterfactual import CounterfactualReasoning
from .salience_network import SalienceNetwork
from .dictionary_assembler import DictionaryAssembler
from .composited_dict import CompositedDictionaryEngine
from .inference_pipeline import DictionaryInferencePipeline
from .self_dialogue import SelfDialogueSimulator
from .learning_daemon import BackgroundLearningDaemon
from .data_tracker import RealtimeDataTracker


class LocalInferenceEngine:
    def __init__(self, quality_threshold: float = 0.70,
                 t1_engine=None, t2_engine=None, t5_engine=None,
                 t6_engine=None, controller=None,
                 session_id: str = "default"):
        self.store = SelfLearningKnowledgeStore(quality_threshold=quality_threshold)
        self._quality_threshold = quality_threshold
        self._stats = {"total_queries": 0, "cache_hits": 0, "fallback_uses": 0,
                       "engine_uses": 0}

        self._t1 = t1_engine
        self._t2 = t2_engine
        self._t5 = t5_engine
        self._t6 = t6_engine
        self._controller = controller

        self._session_id = session_id

        self._affect = AffectEngine()
        self._salience = SalienceNetwork()
        self._speedup = InferenceSpeedup()
        self._clarifier = ClarificationEngine()
        self._memory = MemoryEngine(session_id=session_id)
        self._reader = ReadingComprehension()
        self._profile = UserProfile(session_id=session_id)
        self._kgraph = KnowledgeGraph()
        self._reflection = ReflectionEngine()
        self._feedback = FeedbackLearner()
        self._auto_learner = AutoLearner(self.store)
        self._conversation = ConversationFlow(session_id=session_id)
        self._phase = PhaseTransitionDetector()
        self._metacog = MetaCognition()
        self._blender = ConceptualBlending(self._kgraph)
        self._dreamer = DreamConsolidator(self.store, self._auto_learner,
                                          self._kgraph, self._blender)
        self._counterfactual = CounterfactualReasoning(self._kgraph, self._auto_learner)
        self._assembler = DictionaryAssembler(self)
        self._composited = CompositedDictionaryEngine(legacy_da=self._assembler)
        self._dict_pipeline = DictionaryInferencePipeline(self._composited, self._t6)
        self._simulator = SelfDialogueSimulator(
            self._composited, self._dict_pipeline, self.store)
        self._learning_daemon = BackgroundLearningDaemon(
            self._composited, self._dict_pipeline, self._simulator,
            self.store, None)
        self._data_tracker = RealtimeDataTracker(self._composited)

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
        self._conversation = ConversationFlow(session_id=session_id)

    def chat(self, user_text: str, history: list[dict] | None = None,
             deep_think: bool = False) -> dict[str, Any]:
        start = time.perf_counter()
        self._stats["total_queries"] += 1

        # ── 第0层：情感感知 ──
        affect = self._affect.detect(user_text)
        tone = self._affect.choose_tone(affect)

        # ── 第0层：突显网络 — 计算显著性+分配预算 ──
        self._salience.set_context(
            profile={"interests": self._profile._interests},
            current_topic=self._conversation._current_topic or "",
        )
        sscore = self._salience.score(user_text, affect)
        budget = self._salience.allocate_budget(sscore)

        # ── 第0层：相变检测 ──
        phase_state = self._phase.push(user_text, affect)
        phase_event = self._phase.detect_transition()
        phase_strategy = self._phase.get_phase_strategy()

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
            self._metacog.calibrate(user_text, 0.8, cached.cee_tier)
            return {
                "content": cached.content,
                "cee_scores": cached.cee_scores, "cee_tier": cached.cee_tier,
                "model": "空间引擎 v8.0 (缓存命中)",
                "source": cached.source, "learned": False, "optimized": False,
                "retries": 0, "knowledge_hits": 0, "intent": cached.intent,
                "elapsed_s": elapsed,
                "total_learned": self.store.stats()["total_pairs"],
                "cached": True, "speedup_stats": self._speedup.stats(),
                "affect": affect, "salience": sscore,
                "phase": phase_event, "phase_strategy": phase_strategy,
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
                "cee_tier": "CLARIFY", "model": "空间引擎 v8.0 (需要澄清)",
                "source": "clarification", "learned": False, "optimized": False,
                "retries": 0, "knowledge_hits": 0,
                "intent": "needs_clarification", "elapsed_s": elapsed,
                "total_learned": self.store.stats()["total_pairs"],
                "clarification": True, "affect": affect, "salience": sscore,
                "phase_event": phase_event, "phase_strategy": phase_strategy,
            }

        # ── 第0.6层：阅读理解 ──
        reading = self._reader.analyze(user_text, history or [])
        if reading["continuity"] and reading["entity_ref"]:
            user_text = f"{reading['entity_ref']}：{user_text}"

        # ── 第0.7层：对话流追踪 ──
        flow = self._conversation.push_query(user_text)
        flow_context = self._conversation.enrich_context()

        # ── 第0.8层：记忆召回 ──
        episodic_facts = self._memory.recall(user_text, top_k=3)
        memory_context = self._memory.get_context_for_inference()

        # ── 第0.9层：用户画像 ──
        self._profile.update_from_query(user_text)
        profile_context = self._profile.get_context()

        # ── 第1层：元认知 — 置信度估计 ──
        cee_comp = 0.5
        metacog_confidence = self._metacog.estimate(
            user_text, kg_stats=self._kgraph.stats(),
            learner_stats=self._auto_learner.stats(),
            feedback_score=self._feedback.get_query_weight(user_text),
            cee_composite=cee_comp, memory_hits=len(episodic_facts),
        )
        unknowns = self._metacog.detect_unknown(user_text)
        metacog_strategy = self._metacog.get_adaptive_strategy(metacog_confidence, unknowns)

        # ── 第1层：反事实推理 ──
        cf_result = None
        if self._counterfactual.is_counterfactual(user_text):
            cf_result = self._counterfactual.reason(user_text)

        # ── 第1层：知识图谱扩展 ──
        kg_enrichment = self._enrich_with_kgraph(user_text)
        if "kg_bidirectional_expand" in budget["pipeline"] and "知识图谱" not in kg_enrichment:
            kg_enrichment += self._kgraph_bidi_enrich(user_text)

        # ── 自学习管道事实查询 ──
        learner_facts = self._auto_learner.query(user_text, top_k=3)
        learner_context = self._auto_learner.get_enrichment(user_text)

        # ── 第2层：知识库检索 ──
        intent = detect_intent(user_text)
        retrieved = self.store.retrieve(user_text, top_k=3, min_similarity=0.25)

        if retrieved and len(retrieved) > 0 and not self._is_trivial_match(user_text, retrieved[0]):
            self._stats["cache_hits"] += 1
            content = self._enrich_with_history(
                user_text, retrieved, episodic_facts, memory_context,
                profile_context, kg_enrichment, learner_context, flow_context,
                tone, affect, cf_result, metacog_strategy, phase_strategy,
            )
            source = "knowledge_base"
        else:
            self._stats["fallback_uses"] += 1
            content = self._assembler.assemble(
                user_text, affect=affect,
                conversation_depth=flow["depth"],
                profile=self._profile.get_profile_dict(),
            )

            if flow["depth"] >= 3:
                followup = self._conversation.suggest_followup()
                content += f"\n\n{followup}"

            if cf_result:
                content += f"\n\n【反事实视角】{cf_result.insight[:300]}"

            source = "fallback_rules"

        # ── 第X层：概念融合 ──
        blend_result = None
        if "conceptual_blend" in budget["pipeline"] and sscore >= 0.55:
            blend_result = self._blender.try_blend_from_text(user_text)
        if blend_result and blend_result.score > 0.6:
            content += f"\n\n{blend_result.insight}"

        # ── 第X层：自学习 ──
        self._auto_learner.learn_from(user_text, content,
                                       composite=self._evaluate_composite(content),
                                       source=source)

        # ── 知识图谱吸收 ──
        self._absorb_to_kgraph(user_text, content)

        # ── 情感语气注入 ──
        content = self._inject_tone(content, tone, affect)

        # ── CEE 评估 ──
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

        # ── 自学习 (反馈判断) ──
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

        if source == "knowledge_base":
            self._speedup.store(user_text, content, cee_scores, tier, source, intent,
                                vectorizer=vectorizer)

        self._memory.add_exchange(user_text, content)

        self._last_reply = {"content": content, "cee_scores": cee_scores,
                            "cee_tier": tier, "source": source,
                            "intent": intent, "elapsed_s": elapsed,
                            "metacog_confidence": metacog_confidence}
        self._reflection.push_reply(self._last_reply)

        result = {
            "content": content,
            "cee_scores": cee_scores, "cee_tier": tier,
            "model": "空间引擎 v8.0 (本地推理)",
            "source": source, "learned": learned, "optimized": optimized,
            "retries": retries, "knowledge_hits": len(retrieved) if retrieved else 0,
            "intent": intent, "elapsed_s": elapsed,
            "total_learned": self.store.stats()["total_pairs"],
            "cached": False, "speedup_stats": self._speedup.stats(),
            "episodic_facts": episodic_facts,
            "has_profile": bool(self._profile.get_context()),
            "clarification": False, "affect": affect, "tone": tone,
            "conversation_flow": flow,
            "learner_facts": len(learner_facts),
            "learner_total": self._auto_learner.stats()["total_facts"],
            "salience": sscore, "salience_budget": budget,
            "phase_state": phase_state.label(), "phase_event": phase_event,
            "phase_strategy": phase_strategy,
            "metacog_confidence": metacog_confidence,
            "metacog_strategy": metacog_strategy,
            "has_counterfactual": cf_result is not None,
            "has_blend": blend_result is not None,
        }

        # ── 周期反思 + 自动调参 ──
        if self._reflection.should_reflect():
            _, tunings = self._reflection.reflect()
            if tunings:
                self._reflection.auto_tune()
                new_params = self._reflection.get_tuner_params()
                if new_params.get("quality_threshold"):
                    self._quality_threshold = new_params["quality_threshold"]
                    self.store._quality_threshold = self._quality_threshold

        # ── 周期梦境巩固 ──
        if self._stats["total_queries"] % 40 == 0:
            self._dreamer.dream_cycle()

        return result

    def feedback(self, query: str, rating: str):
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
        self._metacog.calibrate(
            query, self._last_reply.get("metacog_confidence", 0.5), rating,
        )
        self._assembler.feedback(query, rating)

    # ── 内部方法 ─────────────────────────────────────────────

    def _evaluate_composite(self, text: str) -> float:
        scores = self._evaluate(text)
        return (scores["itc"] + scores["scs"] + scores["iec"] + scores["pfft"]) / 4

    def _enrich_with_kgraph(self, query: str) -> str:
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

    def _kgraph_bidi_enrich(self, query: str) -> str:
        from .fallback_rules import BUILTIN_KNOWLEDGE
        for keyword in BUILTIN_KNOWLEDGE:
            if keyword.replace(" ", "").lower() in query.replace(" ", "").lower():
                expanded = self._kgraph.bidirectional_expand(keyword, max_nodes=4)
                if expanded:
                    lines = [f"【双向关联 — {keyword}】"]
                    for node, rel, direction, weight in expanded:
                        arrow = "→" if direction == "out" else "←"
                        lines.append(f"- {keyword} {arrow} {node}: {rel} ({weight:.0%})")
                    return "\n".join(lines)
                return ""
        return ""

    def _absorb_to_kgraph(self, query: str, response: str):
        combined = query + " " + response[:300]
        from .fallback_rules import BUILTIN_KNOWLEDGE
        keywords = []
        for kw in BUILTIN_KNOWLEDGE:
            if kw.replace(" ", "").lower() in combined.replace(" ", "").lower():
                keywords.append(kw)
        tech_terms = re.findall(r'\b([A-Z][a-zA-Z]{2,}|[a-z]{3,}(?:\.(?:js|py|ts|rs|go)|[A-Z][a-z]+))\b', response[:500])
        keywords.extend(tech_terms[:5])
        if keywords:
            self._kgraph.absorb_from(combined, keywords=list(set(keywords)))

    def _enrich_with_history(self, query: str, retrieved: list[ConversationPair],
                             episodic_facts: list[str], memory_context: str,
                             profile_context: str, kg_text: str,
                             learner_context: str, flow_context: str,
                             tone: str, affect: dict,
                             cf_result, metacog_strategy: str,
                             phase_strategy: str) -> str:
        best = retrieved[0]
        lines: list[str] = []

        if phase_strategy and phase_strategy != "常规对话":
            lines.append(f"[相变策略: {phase_strategy}]")
            lines.append("")

        if metacog_strategy:
            lines.append(f"[元认知: {metacog_strategy}]")
            lines.append("")

        if kg_text:
            lines.append(kg_text)
            lines.append("")

        if learner_context:
            lines.append(learner_context)
            lines.append("")

        lines.append(best.ai_response)

        if cf_result:
            lines.append(f"\n【反事实推演】{cf_result.insight[:300]}")

        if episodic_facts:
            facts_str = "；".join(episodic_facts)
            lines.append(f"\n--- 此前你提到: {facts_str} ---")

        if len(retrieved) > 1:
            lines.append(f"\n补充参考: {retrieved[1].ai_response[:200]}")

        return "\n".join(lines)

    def _inject_tone(self, content: str, tone: str, affect: dict) -> str:
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
        markers = ["关于这个问题，让我从几个维度分析",
                    "让我推荐几个方案", "学习路线建议",
                    "用 T5 反事实生长引擎"]
        return any(m in content for m in markers)

    # ── 公开接口 ─────────────────────────────────────────────

    def search(self, query: str, top_k: int = 5) -> list[ConversationPair]:
        return self.store.retrieve(query, top_k=top_k, min_similarity=0.05)

    def dream(self) -> dict:
        return self._dreamer.dream_cycle()

    def get_counterfactual(self, query: str):
        return self._counterfactual.reason(query)

    def get_blend(self, concept_a: str, concept_b: str, blend_type: str = "auto"):
        return self._blender.blend(concept_a, concept_b, blend_type)

    def get_salience_score(self, query: str) -> float:
        return self._salience.score(query)

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
        s["auto_learner"] = self._auto_learner.stats()
        s["conversation"] = self._conversation.stats()
        s["phase_transition"] = self._phase.stats()
        s["metacognition"] = self._metacog.stats()
        s["blender"] = self._blender.stats()
        s["dreamer"] = self._dreamer.stats()
        s["counterfactual"] = self._counterfactual.stats()
        s["salience"] = self._salience.stats()
        s["assembler"] = self._assembler.stats()
        s["composited"] = self._composited.stats()
        s["dict_pipeline"] = self._dict_pipeline.stats()
        s["simulator"] = self._simulator.stats()
        s["learning_daemon"] = self._learning_daemon.stats()
        s["data_tracker"] = self._data_tracker.stats()
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

    def get_auto_learner_stats(self) -> dict:
        return self._auto_learner.stats()

    def get_conversation_summary(self) -> str:
        return self._conversation.get_topic_summary()

    def get_followup_suggestion(self) -> str:
        return self._conversation.suggest_followup()

    def get_metacog_confidence(self, query: str = "") -> dict:
        if query:
            conf = self._metacog.estimate(query, kg_stats=self._kgraph.stats(),
                                          learner_stats=self._auto_learner.stats(),
                                          feedback_score=self._feedback.get_query_weight(query))
            unknowns = self._metacog.detect_unknown(query)
            return {"confidence": conf, "unknowns": unknowns,
                    "strategy": self._metacog.get_adaptive_strategy(conf, unknowns)}
        return self._metacog.stats()

    def get_dream_insights(self) -> list:
        return [{"type": i.dream_type, "content": i.content[:120],
                 "confidence": i.confidence, "verified": i.verified}
                for i in self._dreamer.get_pending_insights(5)]

    def clear_speedup_cache(self):
        self._speedup.clear()
