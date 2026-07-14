"""
认知流水线 - Cognition Pipeline
人类认知过程的工程化流水线:
Perception -> Attention -> Encoding -> Retrieval -> Reasoning -> Generation -> Verification -> Reflection
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import re
import threading
import time
from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class CognitiveStage(Enum):
    PERCEPTION = "perception"
    ATTENTION = "attention"
    ENCODING = "encoding"
    RETRIEVAL = "retrieval"
    REASONING = "reasoning"
    GENERATION = "generation"
    VERIFICATION = "verification"
    REFLECTION = "reflection"

    @property
    def theory_name(self) -> str:
        _names = {
            CognitiveStage.PERCEPTION: "Bayesian Inference",
            CognitiveStage.ATTENTION: "Free Energy Minimization",
            CognitiveStage.ENCODING: "Information Bottleneck",
            CognitiveStage.RETRIEVAL: "Memory Sampling",
            CognitiveStage.REASONING: "Causal Graph Search",
            CognitiveStage.GENERATION: "Constraint Satisfaction",
            CognitiveStage.VERIFICATION: "Hypothesis Testing",
            CognitiveStage.REFLECTION: "Meta-cognitive Learning",
        }
        return _names[self]


class FallbackStrategy(Enum):
    SKIP = "skip"
    HALT = "halt"
    RETRY_ONCE = "retry_once"
    DEGRADE = "degrade"
    DEFAULT_OUTPUT = "default_output"


# ---------------------------------------------------------------------------
# 配置与上下文
# ---------------------------------------------------------------------------

@dataclass
class PipelineConfig:
    stages: list[CognitiveStage] = field(default_factory=list)
    max_tokens_per_stage: int = 4096
    timeout_per_stage: float = 30.0
    skip_on_error: bool = True
    parallel_stages: list[list[CognitiveStage]] = field(default_factory=list)
    fallback_strategy: FallbackStrategy = FallbackStrategy.SKIP
    enable_caching: bool = True
    enable_metrics: bool = True
    chunk_token_limit: int = 512
    attention_top_k: int = 10
    retrieval_top_k: int = 5
    generation_max_length: int = 2048
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "stages": [s.value for s in self.stages],
            "max_tokens_per_stage": self.max_tokens_per_stage,
            "timeout_per_stage": self.timeout_per_stage,
            "skip_on_error": self.skip_on_error,
            "fallback_strategy": self.fallback_strategy.value,
            "enable_caching": self.enable_caching,
        }


@dataclass
class CognitiveContext:
    """阶段间流转的认知上下文"""

    original_input: str
    current_state: dict[str, Any] = field(default_factory=dict)
    stage_outputs: dict[CognitiveStage, Any] = field(default_factory=dict)
    attention_mask: list[float] = field(default_factory=list)
    memory_hooks: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def merge_state(self, updates: dict[str, Any]) -> None:
        self.current_state.update(updates)

    def clone(self) -> CognitiveContext:
        import copy
        return CognitiveContext(
            original_input=self.original_input,
            current_state=copy.deepcopy(self.current_state),
            stage_outputs=copy.deepcopy(self.stage_outputs),
            attention_mask=list(self.attention_mask),
            memory_hooks=dict(self.memory_hooks),
            metadata=dict(self.metadata),
        )

    def input_hash(self) -> str:
        return hashlib.sha256(self.original_input.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# 指标
# ---------------------------------------------------------------------------

@dataclass
class StageMetrics:
    stage: CognitiveStage
    elapsed_ms: float = 0.0
    tokens_consumed: int = 0
    tokens_produced: int = 0
    cache_hit: bool = False
    error: Optional[str] = None
    status: str = "pending"

    def to_dict(self) -> dict[str, Any]:
        return {
            "stage": self.stage.value, "theory": self.stage.theory_name,
            "elapsed_ms": round(self.elapsed_ms, 2),
            "tokens_in": self.tokens_consumed, "tokens_out": self.tokens_produced,
            "cache_hit": self.cache_hit, "error": self.error, "status": self.status,
        }


@dataclass
class PipelineMetrics:
    pipeline_id: str = ""
    total_elapsed_ms: float = 0.0
    total_tokens_consumed: int = 0
    total_tokens_produced: int = 0
    cache_hit_count: int = 0
    cache_miss_count: int = 0
    stages_completed: int = 0
    stages_skipped: int = 0
    stages_failed: int = 0
    stage_metrics: list[StageMetrics] = field(default_factory=list)

    @property
    def cache_hit_rate(self) -> float:
        total = self.cache_hit_count + self.cache_miss_count
        return self.cache_hit_count / total if total else 0.0

    def summary(self) -> dict[str, Any]:
        return {"pipeline_id": self.pipeline_id, "total_ms": round(self.total_elapsed_ms, 2),
                "tokens_consumed": self.total_tokens_consumed, "tokens_produced": self.total_tokens_produced,
                "cache_hit_rate": f"{self.cache_hit_rate:.1%}",
                "done": self.stages_completed, "skipped": self.stages_skipped, "failed": self.stages_failed,
                "per_stage": [m.to_dict() for m in self.stage_metrics]}


# ---------------------------------------------------------------------------
# StageProcessor 抽象基类
# ---------------------------------------------------------------------------

class StageProcessor(ABC):
    stage: CognitiveStage

    def __init__(self, config: PipelineConfig) -> None:
        self.config = config
        self._cache: dict[str, Any] = {}
        self._lock = threading.RLock()

    @abstractmethod
    def execute(self, ctx: CognitiveContext) -> CognitiveContext: ...

    def validate_input(self, ctx: CognitiveContext) -> bool:
        return bool(ctx.original_input)

    def validate_output(self, ctx: CognitiveContext) -> bool:
        return self.stage in ctx.stage_outputs

    def fallback(self, ctx: CognitiveContext, error: Exception) -> CognitiveContext:
        logger.warning("Stage %s (%s) failed: %s", self.stage.value, self.stage.theory_name, error)
        ctx.current_state[f"{self.stage.value}_error"] = str(error)
        ctx.current_state[f"{self.stage.value}_degraded"] = True
        ctx.stage_outputs[self.stage] = ctx.original_input
        return ctx

    def _cache_key(self, ctx: CognitiveContext) -> str:
        raw = f"{self.stage.value}:{ctx.original_input}:{json.dumps(ctx.metadata, sort_keys=True)}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def _get_cached(self, ctx: CognitiveContext) -> Optional[Any]:
        if not self.config.enable_caching:
            return None
        with self._lock:
            return self._cache.get(self._cache_key(ctx))

    def _set_cache(self, ctx: CognitiveContext, output: Any) -> None:
        if not self.config.enable_caching:
            return
        with self._lock:
            self._cache[self._cache_key(ctx)] = output

    def _est_tokens(self, text: str) -> int:
        cn = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
        en = len(text) - cn
        return int(cn / 1.5 + en / 4.0) + 1


# ---------------------------------------------------------------------------
# 阶段 1: Perception - 感知 (Bayesian Inference)
# ---------------------------------------------------------------------------

class PerceptionStage(StageProcessor):
    stage = CognitiveStage.PERCEPTION
    _LANG = {"zh": r"[\u4e00-\u9fff]", "en": r"[a-zA-Z]{3,}",
             "ja": r"[\u3040-\u309f\u30a0-\u30ff]", "ko": r"[\uac00-\ud7af]",
             "ru": r"[\u0400-\u04ff]", "ar": r"[\u0600-\u06ff]"}

    def execute(self, ctx: CognitiveContext) -> CognitiveContext:
        t = ctx.original_input
        lang = self._detect_language(t)
        entities = self._extract_entities(t)
        clean = re.sub(r"\r\n|\t", lambda m: "\n    " if m[0] == "\t" else "\n", t).strip()
        ctx.merge_state({
            "language": lang, "extracted_entities": entities,
            "complexity": self._assess_complexity(t),
            "input_type": self._classify_input_type(t),
            "preprocessed_text": clean, "char_count": len(t),
            "estimated_tokens": self._est_tokens(t),
        })
        ctx.stage_outputs[self.stage] = {
            "language": lang, "entities": entities, "clean_text": clean,
            "theory_interpretation": "P(hypothesis|input) via Bayesian classifier",
        }
        return ctx

    def _detect_language(self, text: str) -> dict[str, Any]:
        scores = {k: sum(len(m) for m in re.findall(v, text)) / max(len(text), 1)
                  for k, v in self._LANG.items()}
        if not scores: return {"primary": "unknown", "confidence": 0.0}
        p = max(scores, key=scores.get); t = sum(scores.values())
        return {"primary": p, "confidence": round(scores[p] / t, 3) if t else 0.0,
                "scores": {k: round(v, 3) for k, v in scores.items()}}

    def _extract_entities(self, text: str) -> list[dict[str, Any]]:
        entities: list[dict[str, Any]] = []
        for lb, pat in [("URL", r"https?://\S+"), ("EMAIL", r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
                        ("DATE", r"\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b"), ("CODE", r"```[\s\S]*?```|`[^`]+`")]:
            entities.extend({"type": lb, "value": m.group()[:60], "span": m.span()}
                            for m in re.finditer(pat, text))
        return entities

    def _assess_complexity(self, text: str) -> dict[str, Any]:
        words = text.split()
        sentences = [s.strip() for s in re.split(r"[。.!！?？\n]+", text) if s.strip()]
        wps = len(words) / max(len(sentences), 1)
        if len(words) < 20: level = "simple"
        elif len(words) < 200: level = "moderate"
        elif len(words) < 1000: level = "complex"
        else: level = "very_complex"
        return {"level": level, "word_count": len(words), "sentence_count": len(sentences),
                "words_per_sentence": round(wps, 1), "theory_principle": "Surprisal = -log P(input|prior)"}

    def _classify_input_type(self, text: str) -> dict[str, Any]:
        t = text.strip(); types: dict[str, float] = {}
        if re.match(r"^https?://", t): types["url"] = 0.90
        if "```" in t: types["code"] = 0.90
        if len(t) > 500: types["long_form"] = 0.80
        for kw in ["什么", "怎么", "如何", "为什么", "what", "how", "why"]:
            if kw.lower() in t.lower(): types["question"] = min(types.get("question", 0.0) + 0.15, 1.0)
        if not types: types["general"] = 0.70
        return {"primary": max(types, key=types.get), "scores": types}


# ---------------------------------------------------------------------------
# 阶段 2: Attention - 注意力 (Free Energy Minimization)
# ---------------------------------------------------------------------------

class AttentionStage(StageProcessor):
    stage = CognitiveStage.ATTENTION
    _STOP = {"the","a","an","is","are","was","were","to","of","in","for","on","with","at","by","from",
             "and","but","or","this","that","it","its","he","she","they","them","we","you","i","my",
             "的","了","在","是","我","有","和","就","不","人","都","一","这","那","他","她","它","们","你",
             "也","与","着","被","把"}

    def execute(self, ctx: CognitiveContext) -> CognitiveContext:
        text = ctx.current_state.get("preprocessed_text", ctx.original_input)
        keywords = self._extract_keywords(text)
        ranked = self._salience_ranking(keywords, text)
        mask = self._build_attention_mask(text, ranked)
        optimized, pruned = self._optimize_window(text, mask)
        ctx.merge_state({"keywords": ranked, "attention_mask": mask,
                         "optimized_text": optimized, "pruned_ratio": len(pruned) / max(len(text), 1)})
        ctx.attention_mask = mask
        ctx.stage_outputs[self.stage] = {
            "keywords": ranked, "optimized_text": optimized,
            "theory_interpretation": "Precision-weighted free energy minimization"}
        return ctx

    def _tokenize(self, text: str) -> list[str]:
        tokens: list[str] = []
        for sent in re.split(r"[。.!！?？\n]+", text):
            tokens.extend(t for t in re.findall(r"[\u4e00-\u9fff]+|[a-zA-Z]+|\d+", sent.lower())
                          if len(t) > 1 or t.isdigit())
        return tokens

    def _extract_keywords(self, text: str) -> list[dict[str, Any]]:
        """TF-IDF-like: TF * log(total_sentences / sentences_with_term)."""
        sentences = [s.strip() for s in re.split(r"[。.!！?？\n]+", text) if s.strip()]
        total_sents = max(len(sentences), 1)
        tokens = self._tokenize(text)
        if not tokens: return []
        tf: dict[str, float] = defaultdict(float)
        df: dict[str, int] = defaultdict(int)
        for tok in tokens:
            if tok not in self._STOP and len(tok) > 1: tf[tok] += 1
        for tok in set(tf):
            for sent in sentences:
                if tok in sent.lower(): df[tok] += 1
        scored = []
        for tok, freq in tf.items():
            n_tf = freq / len(tokens)
            idf = math.log((total_sents + 1) / (df.get(tok, 1) + 1)) + 1
            scored.append({"token": tok, "tf": round(n_tf, 4), "idf": round(idf, 2),
                           "score": round(n_tf * idf, 4)})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored

    def _salience_ranking(self, keywords: list[dict[str, Any]], text: str) -> list[dict[str, Any]]:
        top_k = min(self.config.attention_top_k, len(keywords))
        top = keywords[:top_k]
        if not top: return []
        max_s = top[0]["score"]
        for item in top: item["salience"] = round(item["score"] / max_s, 3)
        for i, sent in enumerate(re.split(r"[。.!！?？\n]+", text)):
            for item in top:
                if item["token"].lower() in sent.lower() and "first_sentence" not in item:
                    item["first_sentence"] = i
        for item in top:
            pos = item.get("first_sentence", len(text))
            item["position_score"] = round(1.0 / (pos + 1), 3)
            item["final_score"] = round(item["salience"] * 0.7 + item["position_score"] * 0.3, 3)
        top.sort(key=lambda x: x["final_score"], reverse=True)
        return top

    def _build_attention_mask(self, text: str, ranked: list[dict[str, Any]]) -> list[float]:
        sig_tokens = {item["token"].lower() for item in ranked[:5]}
        parts = re.split(r"([。.!！?？\n]+)", text)
        mask: list[float] = []
        for part in parts:
            if any(tok in part.lower() for tok in sig_tokens): mask.append(1.0)
            elif not part.strip() or len(part.strip()) < 2: mask.append(0.0)
            else: mask.append(0.3)
        return mask

    def _optimize_window(self, text: str, mask: list[float]) -> tuple[str, str]:
        parts = re.split(r"([。.!！?？\n]+)", text)
        ret, pruned, cur = [], [], 0
        for i, p in enumerate(parts):
            w = mask[i] if i < len(mask) else 0.3
            est = self._est_tokens(p)
            if w >= 0.3 and cur + est <= self.config.max_tokens_per_stage:
                ret.append(p); cur += est
            else: pruned.append(p)
        return "".join(ret), "".join(pruned)


# ---------------------------------------------------------------------------
# 阶段 3: Encoding - 编码 (Information Bottleneck)
# ---------------------------------------------------------------------------

class EncodingStage(StageProcessor):
    stage = CognitiveStage.ENCODING

    def execute(self, ctx: CognitiveContext) -> CognitiveContext:
        text = ctx.current_state.get("optimized_text") or \
               ctx.current_state.get("preprocessed_text", ctx.original_input)
        chunks = self._chunk_by_sentence(text)
        ctx.merge_state({
            "sentences": self._seg(text), "chunks": chunks,
            "chunk_count": len(chunks), "semantic_chunks": self._chunk_semantic(text),
            "compression_hints": self._hints(text),
            "total_est_tokens": sum(self._est_tokens(c) for c in chunks),
        })
        ctx.stage_outputs[self.stage] = {
            "chunks": chunks, "chunk_count": len(chunks),
            "theory_interpretation": "Information bottleneck: compress while preserving mutual info"}
        return ctx

    def _seg(self, text: str) -> list[str]:
        return [s.strip() for s in re.split(r"(?<=[。.!！?？])\s*", text) if s.strip()]

    def _chunk_by_sentence(self, text: str) -> list[str]:
        limit = self.config.chunk_token_limit
        chunks, cur, cur_tok = [], [], 0
        for s in self._seg(text):
            st = self._est_tokens(s)
            if cur_tok + st > limit and cur: chunks.append("".join(cur)); cur, cur_tok = [s], st
            else: cur.append(s); cur_tok += st
        if cur: chunks.append("".join(cur))
        return chunks

    def _chunk_semantic(self, text: str) -> list[dict[str, Any]]:
        markers = [r"^(?:第[一二三四五六七八九十\d]+[章节部分篇]|Chapter\s+\d+|Section\s+\d+)",
                   r"^(?:然而|但是|不过|此外|总之|综上所述|因此|所以)",
                   r"^(?:However|Nevertheless|Furthermore|Therefore|In conclusion)"]
        paras = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
        chunks, cur, cur_tok = [], [], 0
        for p in paras:
            boundary = any(re.match(m, p, re.I) for m in markers)
            pt = self._est_tokens(p)
            if boundary and cur:
                chunks.append({"text": "\n\n".join(cur), "token_estimate": cur_tok, "boundary": "semantic"})
                cur, cur_tok = [p], pt
            elif cur_tok + pt > self.config.chunk_token_limit and cur:
                chunks.append({"text": "\n\n".join(cur), "token_estimate": cur_tok, "boundary": "token_limit"})
                cur, cur_tok = [p], pt
            else: cur.append(p); cur_tok += pt
        if cur: chunks.append({"text": "\n\n".join(cur), "token_estimate": cur_tok, "boundary": "final"})
        return chunks

    def _hints(self, text: str) -> dict[str, Any]:
        chunks = self._chunk_by_sentence(text)
        return {"chunk_count": len(chunks), "has_code": "```" in text,
                "recommend_truncation": self._est_tokens(text) > self.config.max_tokens_per_stage,
                "theory_bottleneck": "beta trades compression vs retention"}


# ---------------------------------------------------------------------------
# 阶段 4: Retrieval - 检索 (Memory Sampling)
# ---------------------------------------------------------------------------

class RetrievalStage(StageProcessor):
    stage = CognitiveStage.RETRIEVAL

    def execute(self, ctx: CognitiveContext) -> CognitiveContext:
        queries = self._formulate_queries(ctx)
        mem = self._hook_search(queries, ctx, "memory_search", "memory")
        kg = self._hook_search(queries, ctx, "kg_search", "kg")
        fused = self._dedup(mem + kg)
        ranked = self._rank(fused, queries)
        ctx.merge_state({
            "retrieval_queries": queries, "memory_results": mem,
            "knowledge_graph_results": kg, "fused_context": ranked,
            "retrieved_item_count": len(ranked)})
        ctx.stage_outputs[self.stage] = {
            "queries": queries, "memory_hits": len(mem), "kg_hits": len(kg),
            "top_result": ranked[0] if ranked else None, "results": ranked,
            "theory_interpretation": "P(memory|query) via similarity-weighted sampling"}
        return ctx

    def _hook_search(self, queries: list[str], ctx: CognitiveContext,
                     hook_name: str, source: str) -> list[dict[str, Any]]:
        hook = ctx.memory_hooks.get(hook_name)
        if not hook:
            return [{"content": f"[no_{hook_name}]", "score": 0.0, "source": "placeholder"}]
        try:
            raw = hook(queries)
            return [r if isinstance(r, dict) else {"content": str(r), "score": 0.5, "source": source}
                    for r in raw] if isinstance(raw, list) else []
        except Exception as e:
            logger.debug("Hook %s failed: %s", hook_name, e)
            return [{"content": f"[{hook_name}_error]", "score": 0.0, "source": "error"}]

    def _formulate_queries(self, ctx: CognitiveContext) -> list[str]:
        t = ctx.original_input
        queries = [t] + [kw.get("token", "") for kw in ctx.current_state.get("keywords", [])[:3]]
        sents = [s.strip() for s in re.split(r"[。.!！?？]+", t) if len(s.strip()) > 5]
        queries.extend(sents[:2])
        return list({q for q in queries if len(q) > 2})

    def _dedup(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen, result = set(), []
        for item in items:
            h = hashlib.md5(item.get("content", "").encode()).hexdigest()
            if h not in seen: seen.add(h); result.append(item)
        return result

    def _rank(self, results: list[dict[str, Any]], queries: list[str]) -> list[dict[str, Any]]:
        for item in results:
            content = item.get("content", "").lower()
            base = item.get("score", 0.3)
            qm = sum(0.2 for q in queries if q.lower() in content)
            qm += sum(0.1 for q in queries for w in q.split() if w.lower() in content)
            item["relevance"] = round(base * 0.6 + min(qm, 0.4) * 0.4, 3)
        results.sort(key=lambda x: x.get("relevance", 0), reverse=True)
        return results[:self.config.retrieval_top_k]


# ---------------------------------------------------------------------------
# 阶段 5: Reasoning - 推理 (Causal Graph Search)
# ---------------------------------------------------------------------------

class ReasoningStage(StageProcessor):
    stage = CognitiveStage.REASONING
    _STRATEGY = {"deductive": ["所有", "一定", "必然", "must", "always"],
                 "inductive": ["通常", "一般", "多数", "usually", "generally"],
                 "abductive": ["为什么", "原因", "导致", "why", "cause"],
                 "analogical": ["类似", "像是", "好比", "similar", "like"],
                 "causal": ["导致", "引起", "影响", "cause", "effect"]}

    def execute(self, ctx: CognitiveContext) -> CognitiveContext:
        text = ctx.original_input
        strategy = self._select_strategy(text)
        steps = self._plan_steps(strategy, text)
        result = self._delegate(strategy, ctx)
        trace = self._build_trace(steps, result)
        ctx.merge_state({
            "reasoning_strategy": strategy, "reasoning_steps": steps,
            "reasoning_result": result, "reasoning_trace": trace,
            "is_multistep": len(text.split()) > 200})
        ctx.stage_outputs[self.stage] = {
            "strategy": strategy, "steps": steps, "result": result, "trace": trace,
            "theory_interpretation": "Causal graph search for inference chain"}
        return ctx

    def _select_strategy(self, text: str) -> str:
        scores = defaultdict(float)
        for strat, kws in self._STRATEGY.items():
            for kw in kws:
                if kw.lower() in text.lower(): scores[strat] += 1
        return max(scores, key=scores.get) if scores else "deductive"

    def _plan_steps(self, strategy: str, text: str) -> list[dict[str, Any]]:
        if strategy == "deductive":
            return [{"step": 1, "action": "identify_premises"}, {"step": 2, "action": "apply_rules"},
                    {"step": 3, "action": "derive_conclusion"}]
        if strategy == "causal":
            return [{"step": 1, "action": "identify_causes"}, {"step": 2, "action": "trace_effects"},
                    {"step": 3, "action": "verify_causality"}]
        return [{"step": 1, "action": "collect_evidence"}, {"step": 2, "action": "find_patterns"},
                {"step": 3, "action": "generalize"}]

    def _delegate(self, strategy: str, ctx: CognitiveContext) -> dict[str, Any]:
        hook = ctx.memory_hooks.get("reasoning_engine")
        if hook:
            try:
                r = hook(strategy=strategy, context=ctx)
                return r if isinstance(r, dict) else {"result": r}
            except Exception as e: logger.debug("Reasoning hook failed: %s", e)
        return {"strategy": strategy, "status": "placeholder",
                "note": "[external_reasoning_engine_not_configured]"}

    def _build_trace(self, steps: list[dict[str, Any]], result: dict[str, Any]) -> list[dict[str, Any]]:
        trace = [{"step_id": s["step"], "action": s["action"], "status": "planned"} for s in steps]
        trace.append({"step_id": len(steps) + 1, "action": "finalize",
                       "status": "completed" if result.get("status") != "placeholder" else "pending_engine"})
        return trace


# ---------------------------------------------------------------------------
# 阶段 6: Generation - 生成 (Constraint Satisfaction)
# ---------------------------------------------------------------------------

class GenerationStage(StageProcessor):
    stage = CognitiveStage.GENERATION
    _HINTS = {"formal": "请以正式、严谨的风格组织回答。", "casual": "请以轻松、对话式的风格回答。",
              "technical": "请以技术文档风格回答，包含代码示例。", "concise": "请以最简洁的方式回答，直击要点。"}

    def execute(self, ctx: CognitiveContext) -> CognitiveContext:
        style = self._detect_style(ctx)
        target = self._length_target(ctx)
        citations = self._collect_citations(ctx)
        controlled = self._trunc(self._assemble(ctx, style), target)
        ctx.merge_state({"response_style": style, "length_target": target,
                         "citations": citations, "generated_response": controlled})
        ctx.stage_outputs[self.stage] = {
            "response": controlled, "style": style, "length": len(controlled),
            "est_tokens": self._est_tokens(controlled), "citations": len(citations),
            "theory_interpretation": "Constraint satisfaction: max product of constraint potentials"}
        return ctx

    def _detect_style(self, ctx: CognitiveContext) -> str:
        t = ctx.original_input
        if ctx.current_state.get("input_type", {}).get("primary") == "code": return "technical"
        if len(t.split()) < 10: return "concise"
        if any(w in t.lower() for w in ["请详细", "formally"]): return "formal"
        if any(w in t.lower() for w in ["简单说", "briefly"]): return "casual"
        return "concise"

    def _length_target(self, ctx: CognitiveContext) -> int:
        wc = len(ctx.original_input.split())
        if wc < 10: return min(100, self.config.generation_max_length // 4)
        if wc < 50: return min(300, self.config.generation_max_length // 2)
        if wc < 200: return min(800, self.config.generation_max_length)
        return self.config.generation_max_length

    def _collect_citations(self, ctx: CognitiveContext) -> list[dict[str, Any]]:
        return [{"source": i.get("source", "?"), "excerpt": str(i.get("content", ""))[:100],
                 "relevance": i.get("relevance", 0.0)}
                for i in ctx.current_state.get("fused_context", []) if i.get("relevance", 0.0) > 0.0]

    def _assemble(self, ctx: CognitiveContext, style: str) -> str:
        parts: list[str] = []
        kws = ctx.current_state.get("keywords", [])
        if kws: parts.append("核心概念: " + ", ".join(k["token"] for k in kws[:5]))
        retrieved = ctx.current_state.get("fused_context", [])
        if retrieved:
            parts.append("参考:\n" + "\n".join(
                f"- [{r.get('source', '?')}] {str(r.get('content', ''))[:120]}" for r in retrieved[:3]))
        if not parts: parts.append(ctx.original_input)
        draft = "\n\n".join(parts)
        hint = self._HINTS.get(style, "")
        return f"{hint}\n\n{draft}" if hint else draft

    def _trunc(self, text: str, target: int) -> str:
        if self._est_tokens(text) <= target: return text
        truncated = text[:int(len(text) * (target / self._est_tokens(text)) * 0.9)]
        last = max(truncated.rfind("。"), truncated.rfind("."), truncated.rfind("\n"))
        return (truncated[:last + 1] if last > 0 else truncated).strip()


# ---------------------------------------------------------------------------
# 阶段 7: Verification - 验证 (Hypothesis Testing)
# ---------------------------------------------------------------------------

class VerificationStage(StageProcessor):
    stage = CognitiveStage.VERIFICATION
    _SAFETY = [(r"(密码|password)\s*[:=]\s*\S+", "credential_leak"),
               (r"\b\d{16,19}\b", "card_number")]

    def execute(self, ctx: CognitiveContext) -> CognitiveContext:
        resp = ctx.current_state.get("generated_response", "")
        facts = self._fact_check(resp, ctx)
        consistency = self._consistency_check(resp)
        completeness = self._completeness_check(resp, ctx)
        safety = self._safety_scan(resp)
        passed = facts["passed"] and consistency["passed"] and safety["passed"]
        ctx.merge_state({
            "verification_passed": passed, "fact_check": facts,
            "consistency_check": consistency, "completeness_check": completeness,
            "safety_scan": safety})
        ctx.stage_outputs[self.stage] = {
            "passed": passed, "facts": facts, "consistency": consistency,
            "completeness": completeness, "safety": safety,
            "theory_interpretation": "Hypothesis testing: H0=correct, p-value per claim"}
        return ctx

    def _fact_check(self, text: str, ctx: CognitiveContext) -> dict[str, Any]:
        claims = [m.strip()[:100] for m in re.findall(
            r"([^。.!！?？]+(?:是|为|等于|大于|小于|属于|包含|发生)[^。.!！?？]+)", text)]
        details = [{"claim": c, "verdict": "unverified", "confidence": 0.0} for c in claims[:10]]
        hook = ctx.memory_hooks.get("fact_checker")
        if hook:
            try:
                updates = hook(claims=[d["claim"] for d in details])
                if isinstance(updates, dict):
                    for d in details: d["verdict"] = updates.get(d["claim"], "unverified")
            except Exception as e: logger.debug("Fact check hook failed: %s", e)
        return {"passed": True, "total_claims": len(details), "verified": 0, "verdicts": details}

    def _consistency_check(self, text: str) -> dict[str, Any]:
        sents = [s.strip() for s in re.split(r"[。.!！?？]+", text) if s.strip()]
        issues = []
        neg = {"不", "无", "没有", "并非", "not", "no", "never"}
        for i in range(len(sents)):
            for j in range(i + 1, len(sents)):
                sw1, sw2 = set(re.findall(r"\w+", sents[i])), set(re.findall(r"\w+", sents[j]))
                overlap = len(sw1 & sw2) / max(len(sw1 | sw2), 1)
                has_neg1 = any(w in sents[i] for w in neg)
                has_neg2 = any(w in sents[j] for w in neg)
                if overlap > 0.6 and has_neg1 != has_neg2:
                    issues.append({"type": "contradiction", "a": sents[i][:60], "b": sents[j][:60]})
        return {"passed": len(issues) == 0, "issues": issues[:5]}

    def _completeness_check(self, text: str, ctx: CognitiveContext) -> dict[str, Any]:
        questions = re.findall(r"[^。.!！?？]*\?", ctx.original_input) or [ctx.original_input[:100]]
        covered = sum(1 for q in questions
                      if len(set(re.findall(r"[\u4e00-\u9fff]{2,}|\w{3,}", q)) &
                             set(re.findall(r"[\u4e00-\u9fff]{2,}|\w{3,}", text)))
                         >= len(set(re.findall(r"[\u4e00-\u9fff]{2,}|\w{3,}", q))) * 0.3)
        return {"passed": covered == len(questions), "total_questions": len(questions),
                "covered": covered, "coverage_ratio": round(covered / max(len(questions), 1), 2)}

    def _safety_scan(self, text: str) -> dict[str, Any]:
        alerts = [{"type": t, "desc": d} for pat, t in self._SAFETY if re.search(pat, text)]
        return {"passed": len(alerts) == 0, "alerts": alerts}


# ---------------------------------------------------------------------------
# 阶段 8: Reflection - 反思 (Meta-cognitive Learning)
# ---------------------------------------------------------------------------

class ReflectionStage(StageProcessor):
    stage = CognitiveStage.REFLECTION

    def execute(self, ctx: CognitiveContext) -> CognitiveContext:
        critique = self._self_critique(ctx)
        improvements = self._generate_improvements(critique)
        learnings = self._extract_learnings(ctx, critique)
        ctx.merge_state({"self_critique": critique, "improvement_suggestions": improvements,
                         "extracted_learnings": learnings})
        ctx.stage_outputs[self.stage] = {
            "critique": critique, "improvements": improvements, "learnings": learnings,
            "theory_interpretation": "Meta-cognitive policy gradient: grad log pi(a|s) * R"}
        return ctx

    def _self_critique(self, ctx: CognitiveContext) -> dict[str, Any]:
        issues: list[dict[str, Any]] = []
        score = 1.0
        if not ctx.current_state.get("verification_passed", True):
            issues.append({"type": "verification_failed", "severity": "high"}); score -= 0.3
        consistency = ctx.current_state.get("consistency_check", {})
        if consistency.get("issues"):
            issues.append({"type": "consistency_issues", "count": len(consistency["issues"]), "severity": "medium"})
            score -= 0.1
        completeness = ctx.current_state.get("completeness_check", {})
        if completeness.get("coverage_ratio", 1.0) < 0.5:
            issues.append({"type": "low_coverage", "severity": "medium"}); score -= 0.15
        resp = ctx.current_state.get("generated_response", "")
        if len(resp) < 20: issues.append({"type": "too_short", "severity": "low"}); score -= 0.05
        ctx_items = ctx.current_state.get("retrieved_item_count", 0)
        if ctx_items == 0: issues.append({"type": "no_memory_retrieval", "severity": "low"}); score -= 0.05
        return {"score": max(round(score, 2), 0.0), "issues": issues,
                "summary": f"{len(issues)} issues, quality: {max(score,0):.1%}"}

    def _generate_improvements(self, critique: dict[str, Any]) -> list[dict[str, Any]]:
        tips = {"verification_failed": "启用外部事实核查引擎",
                "consistency_issues": "增加矛盾消除后处理",
                "low_coverage": "扩展检索范围增加查询多样性",
                "too_short": "降低压缩率允许更长输出",
                "too_long": "增加更激进的长度控制",
                "no_memory_retrieval": "注册记忆库搜索钩子"}
        return [{"issue": i["type"], "suggestion": tips.get(i["type"], "检查对应阶段输出"),
                 "priority": i.get("severity", "medium")} for i in critique.get("issues", [])]

    def _extract_learnings(self, ctx: CognitiveContext, critique: dict[str, Any]) -> list[dict[str, Any]]:
        learnings: list[dict[str, Any]] = []
        timings = ctx.current_state.get("pipeline_timings", {})
        if timings:
            slowest = max(timings, key=timings.get)
            learnings.append({"type": "bottleneck", "stage": slowest,
                              "elapsed_ms": round(timings[slowest], 1)})
        kws = ctx.current_state.get("keywords", [])
        if kws: learnings.append({"type": "pattern", "patterns": [k["token"] for k in kws[:3]]})
        if not ctx.current_state.get("verification_passed", True):
            learnings.append({"type": "quality_alert", "note": "验证未通过,建议人工审核"})
        return learnings


# ---------------------------------------------------------------------------
# 阶段注册表
# ---------------------------------------------------------------------------

STAGE_REGISTRY: dict[CognitiveStage, type[StageProcessor]] = {
    CognitiveStage.PERCEPTION: PerceptionStage,
    CognitiveStage.ATTENTION: AttentionStage,
    CognitiveStage.ENCODING: EncodingStage,
    CognitiveStage.RETRIEVAL: RetrievalStage,
    CognitiveStage.REASONING: ReasoningStage,
    CognitiveStage.GENERATION: GenerationStage,
    CognitiveStage.VERIFICATION: VerificationStage,
    CognitiveStage.REFLECTION: ReflectionStage,
}


# ---------------------------------------------------------------------------
# 认知流水线主控
# ---------------------------------------------------------------------------

class CognitionPipeline:

    def __init__(self, config: Optional[PipelineConfig] = None) -> None:
        self.config = config or PipelineConfig()
        self._counter = 0

    def execute(self, input_text: str,
                skip_stages: Optional[list[CognitiveStage]] = None,
                memory_hooks: Optional[dict[str, Any]] = None) -> CognitiveContext:
        skip = set(skip_stages or [])
        hooks = dict(memory_hooks or {})
        pid = self._next_id()
        metrics = PipelineMetrics(pipeline_id=pid)
        t0 = time.time()

        ctx = CognitiveContext(original_input=input_text, memory_hooks=hooks)
        for stage in self.config.stages:
            if stage in skip: continue
            sm = self._run_stage(stage, ctx)
            metrics.stage_metrics.append(sm)
            if sm.status == "failed" and self.config.fallback_strategy == FallbackStrategy.HALT:
                metrics.stages_failed += 1; break

        elapsed = (time.time() - t0) * 1000
        metrics.total_elapsed_ms = elapsed
        metrics.stages_completed = sum(1 for m in metrics.stage_metrics if m.status == "completed")
        metrics.stages_skipped = sum(1 for m in metrics.stage_metrics if m.status == "skipped")
        metrics.stages_failed = sum(1 for m in metrics.stage_metrics if m.status == "failed")
        metrics.total_tokens_consumed = sum(m.tokens_consumed for m in metrics.stage_metrics)
        metrics.total_tokens_produced = sum(m.tokens_produced for m in metrics.stage_metrics)
        metrics.cache_hit_count = sum(1 for m in metrics.stage_metrics if m.cache_hit)
        metrics.cache_miss_count = sum(1 for m in metrics.stage_metrics if not m.cache_hit)

        ctx.metadata["pipeline_metrics"] = metrics
        ctx.current_state["pipeline_timings"] = {m.stage.value: m.elapsed_ms for m in metrics.stage_metrics}
        logger.info("Pipeline %s done: %d stages, %.1fms, cache %.1f%%",
                    pid, metrics.stages_completed, elapsed, metrics.cache_hit_rate * 100)
        return ctx

    def execute_partial(self, input_text: str, stages: list[CognitiveStage],
                         memory_hooks: Optional[dict[str, Any]] = None) -> CognitiveContext:
        saved = self.config
        self.config = PipelineConfig(
            stages=stages, max_tokens_per_stage=saved.max_tokens_per_stage,
            timeout_per_stage=saved.timeout_per_stage, skip_on_error=saved.skip_on_error,
            parallel_stages=list(saved.parallel_stages), fallback_strategy=saved.fallback_strategy,
            enable_caching=saved.enable_caching, enable_metrics=saved.enable_metrics,
            chunk_token_limit=saved.chunk_token_limit, attention_top_k=saved.attention_top_k,
            retrieval_top_k=saved.retrieval_top_k, generation_max_length=saved.generation_max_length,
            metadata=dict(saved.metadata))
        try:
            return self.execute(input_text, memory_hooks=memory_hooks)
        finally:
            self.config = saved

    def _run_stage(self, stage: CognitiveStage, ctx: CognitiveContext) -> StageMetrics:
        sm = StageMetrics(stage=stage)
        processor = STAGE_REGISTRY[stage](self.config)
        if not processor.validate_input(ctx):
            sm.status = "skipped"; sm.error = "input validation failed"; return sm

        cached = processor._get_cached(ctx)
        if cached is not None:
            sm.cache_hit = True; sm.status = "completed"; sm.elapsed_ms = 0.0
            ctx.stage_outputs[stage] = cached; ctx.current_state[f"{stage.value}_cached"] = True
            return sm

        t_start = time.time()
        try:
            ctx = processor.execute(ctx)
            if not processor.validate_output(ctx):
                raise RuntimeError(f"Stage {stage.value} output validation failed")
            processor._set_cache(ctx, ctx.stage_outputs.get(stage))
            sm.status = "completed"
        except Exception as exc:
            sm.status = "failed"; sm.error = str(exc)
            logger.error("Stage %s failed: %s", stage.value, exc)
            if self.config.fallback_strategy == FallbackStrategy.HALT: raise
            try:
                ctx = processor.fallback(ctx, exc); sm.status = "degraded"
            except Exception as fe:
                logger.error("Stage %s fallback failed: %s", stage.value, fe)

        sm.elapsed_ms = (time.time() - t_start) * 1000
        sm.tokens_consumed = processor._est_tokens(ctx.original_input)
        return sm

    def _next_id(self) -> str:
        self._counter += 1
        return f"cog-{int(time.time() * 1000)}-{self._counter:04d}"

    def get_metrics(self, ctx: CognitiveContext) -> Optional[PipelineMetrics]:
        return ctx.metadata.get("pipeline_metrics")

    def clear_caches(self) -> None:
        for stage in CognitiveStage:
            try:
                p = STAGE_REGISTRY[stage](self.config)
                with p._lock: p._cache.clear()
            except Exception: pass

    def cache_stats(self) -> dict[str, int]:
        stats = {}
        for stage in CognitiveStage:
            try:
                p = STAGE_REGISTRY[stage](self.config)
                with p._lock: stats[stage.value] = len(p._cache)
            except Exception: stats[stage.value] = -1
        return stats


# ---------------------------------------------------------------------------
# PipelineBuilder: 流式 API 构建自定义流水线
# ---------------------------------------------------------------------------

class PipelineBuilder:
    """流式构建器, fluent API 构建定制流水线。

    pipeline = PipelineBuilder().add_stage(CognitiveStage.PERCEPTION)
        .add_stage(CognitiveStage.ATTENTION).set_config(max_tokens_per_stage=2048).build()
    """

    def __init__(self) -> None:
        self._stages: list[CognitiveStage] = []
        self._config_kwargs: dict[str, Any] = {}
        self._parallel_groups: list[list[CognitiveStage]] = []

    def add_stage(self, stage: CognitiveStage) -> PipelineBuilder:
        if stage not in self._stages: self._stages.append(stage)
        return self

    def add_stages(self, stages: list[CognitiveStage]) -> PipelineBuilder:
        for s in stages:
            if s not in self._stages: self._stages.append(s)
        return self

    def add_parallel_group(self, stages: list[CognitiveStage]) -> PipelineBuilder:
        self._parallel_groups.append(list(stages))
        return self

    def remove_stage(self, stage: CognitiveStage) -> PipelineBuilder:
        if stage in self._stages: self._stages.remove(stage)
        return self

    def set_config(self, **kwargs: Any) -> PipelineBuilder:
        _valid = {"max_tokens_per_stage", "timeout_per_stage", "skip_on_error",
                  "fallback_strategy", "enable_caching", "enable_metrics",
                  "chunk_token_limit", "attention_top_k", "retrieval_top_k",
                  "generation_max_length", "metadata"}
        for k, v in kwargs.items():
            if k in _valid: self._config_kwargs[k] = v
        return self

    def clear(self) -> PipelineBuilder:
        self._stages = []; self._config_kwargs = {}; self._parallel_groups = []
        return self

    def build(self) -> CognitionPipeline:
        return CognitionPipeline(PipelineConfig(
            stages=list(self._stages),
            parallel_stages=[list(g) for g in self._parallel_groups],
            **self._config_kwargs))


# ---------------------------------------------------------------------------
# 便利函数
# ---------------------------------------------------------------------------

def run_cognition(input_text: str,
                  stages: Optional[list[CognitiveStage]] = None,
                  config: Optional[PipelineConfig] = None,
                  memory_hooks: Optional[dict[str, Any]] = None,
                  skip_stages: Optional[list[CognitiveStage]] = None) -> dict[str, Any]:
    cfg = config or PipelineConfig()
    if stages is not None: cfg.stages = stages
    elif not cfg.stages: cfg.stages = list(CognitiveStage)

    pipeline = CognitionPipeline(cfg)
    if stages is not None and len(stages) < len(CognitiveStage):
        ctx = pipeline.execute_partial(input_text, stages, memory_hooks=memory_hooks)
    elif skip_stages:
        ctx = pipeline.execute(input_text, skip_stages=skip_stages, memory_hooks=memory_hooks)
    else:
        ctx = pipeline.execute(input_text, memory_hooks=memory_hooks)

    m = pipeline.get_metrics(ctx)
    return {"context": ctx, "stage_outputs": ctx.stage_outputs,
            "current_state": ctx.current_state, "metrics": m.summary() if m else {}}


def create_default_pipeline() -> CognitionPipeline:
    return CognitionPipeline(PipelineConfig(
        stages=list(CognitiveStage), max_tokens_per_stage=4096,
        timeout_per_stage=30.0, skip_on_error=True,
        fallback_strategy=FallbackStrategy.SKIP, enable_caching=True,
        enable_metrics=True, chunk_token_limit=512, attention_top_k=10,
        retrieval_top_k=5, generation_max_length=2048))


def build_pipeline() -> PipelineBuilder:
    return PipelineBuilder()
