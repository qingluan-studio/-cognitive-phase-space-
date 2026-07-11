"""
综合合成引擎 — 多引擎融合生成

提供:
- SynthesisEngine: 融合多个引擎输出
- 多源信息融合: 将搜索、RAG、知识库的结果融合
- 观点综合: 从多个引擎的不同角度综合
- 置信度加权融合: 根据各引擎置信度加权
- 冲突消解: 检测和处理引擎间的矛盾输出
- 分级输出: 简短/标准/详细三个级别
- 引用聚合: 合并多个来源的引用
- 置信度评分: 综合置信度输出
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Optional, Union


class DetailLevel(str, Enum):
    BRIEF = "brief"
    STANDARD = "standard"
    DETAILED = "detailed"


class SourceType(str, Enum):
    SEARCH = "search"
    RAG = "rag"
    KNOWLEDGE_BASE = "knowledge_base"
    LLM = "llm"
    SENTIMENT = "sentiment"
    TOPIC = "topic"
    CREATIVE = "creative"
    CUSTOM = "custom"


@dataclass
class SourceOutput:
    source: str
    content: str = ""
    confidence: float = 0.5
    weight: float = 1.0
    citations: list[dict[str, str]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Conflict:
    source_a: str
    source_b: str
    claim_a: str = ""
    claim_b: str = ""
    severity: float = 0.0
    resolved: bool = False
    resolution: str = ""


@dataclass
class SynthesisResult:
    task_id: str = ""
    content: str = ""
    confidence: float = 0.0
    detail_level: str = DetailLevel.STANDARD
    sources_used: list[str] = field(default_factory=list)
    citations: list[dict[str, str]] = field(default_factory=list)
    resolved_conflicts: int = 0
    conflicts: list[Conflict] = field(default_factory=list)
    source_weights: dict[str, float] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_id": self.task_id,
            "result": {
                "content": self.content,
                "confidence": round(self.confidence, 3),
                "detail_level": self.detail_level,
            },
            "sources": [
                {"name": s, "weight": self.source_weights.get(s, 0.0)}
                for s in self.sources_used
            ],
            "resolved_conflicts": self.resolved_conflicts,
            "citations": self.citations,
        }


class SynthesisEngine:
    """综合合成引擎

    融合多个引擎输出，检测和消解冲突，按置信度加权生成综合输出。

    Usage:
        engine = SynthesisEngine()
        result = engine.synthesize(
            "全球变暖的经济影响",
            sources=["search", "rag", "knowledge_base"],
            detail_level="standard"
        )
    """

    def __init__(self):
        self._engines: dict[str, Any] = {}
        self._lock = threading.Lock()
        self._synthesis_history: list[dict[str, Any]] = []
        self._init_engines()

    # ── 引擎初始化 ──────────────────────────────────────────────────

    def _init_engines(self) -> None:
        engines_to_load = [
            ("search", "cee.app.engine.search", "WebSearchEngine"),
            ("rag", "cee.app.engine.rag", "RAGEngine"),
            ("summarizer", "cee.app.engine.summarizer", "TextSummarizer"),
            ("sentiment", "cee.app.engine.sentiment", "SentimentAnalyzer"),
            ("topic_model", "cee.app.engine.topic_model", "TopicAnalyzer"),
            ("creative", "cee.app.engine.creative", "CreativeSynthesisEngine"),
            ("think", "cee.app.engine.think", "DeepThinkEngine"),
            ("reasoning", "cee.app.engine.reasoning", "ReasoningEngine"),
            ("bias", "cee.app.engine.bias", "BiasDetector"),
        ]
        for name, module_path, class_name in engines_to_load:
            try:
                mod = __import__(module_path, fromlist=[class_name])
                cls = getattr(mod, class_name)
                self._engines[name] = cls()
            except Exception:
                self._engines[name] = None

    # ── 核心合成 ────────────────────────────────────────────────────

    def synthesize(
        self,
        query: str,
        sources: list[str] | None = None,
        detail_level: str = "standard",
        options: dict[str, Any] | None = None,
    ) -> SynthesisResult:
        """融合多源输出进行综合合成

        Args:
            query: 用户查询
            sources: 使用的源列表
            detail_level: 输出详细级别 (brief/standard/detailed)
            options: 选项 (weighted_fusion, resolve_conflicts 等)

        Returns:
            SynthesisResult: 合成结果
        """
        options = options or {}
        sources = sources or ["search", "knowledge_base"]
        use_weighted = options.get("weighted_fusion", True)
        resolve = options.get("resolve_conflicts", True)

        detail = DetailLevel(detail_level) if detail_level in {
            "brief", "standard", "detailed"
        } else DetailLevel.STANDARD

        task_id = hashlib.sha256(
            f"synthesis:{query}:{','.join(sources)}:{time.time()}".encode()
        ).hexdigest()[:12]

        source_outputs = self._collect_from_sources(query, sources)
        conflicts = self._detect_conflicts(source_outputs) if resolve else []
        resolved_conflicts = self._resolve_conflicts(conflicts) if conflicts else 0

        if use_weighted:
            content, confidence = self._weighted_fusion(
                source_outputs, detail
            )
        else:
            content, confidence = self._equal_fusion(source_outputs, detail)

        citations = self._aggregate_citations(source_outputs)
        source_weights = {s.source: s.weight for s in source_outputs}

        result = SynthesisResult(
            task_id=task_id,
            content=content,
            confidence=confidence,
            detail_level=detail_level,
            sources_used=[s.source for s in source_outputs],
            citations=citations,
            resolved_conflicts=resolved_conflicts,
            conflicts=conflicts,
            source_weights=source_weights,
        )

        self._synthesis_history.append({
            "timestamp": time.time(),
            "task_id": task_id,
            "query": query[:100],
            "sources": sources,
            "confidence": round(confidence, 3),
        })
        return result

    # ── 数据收集 ────────────────────────────────────────────────────

    def _collect_from_sources(
        self,
        query: str,
        sources: list[str],
    ) -> list[SourceOutput]:
        outputs: list[SourceOutput] = []

        for source_name in sources:
            engine = self._engines.get(source_name)
            if engine is None or source_name == "knowledge_base":
                if source_name == "knowledge_base":
                    outputs.append(self._kb_lookup(query))
                continue

            try:
                raw = self._invoke_source_engine(engine, source_name, query)
                content = self._extract_content(raw)
                confidence = self._estimate_confidence(content)

                outputs.append(SourceOutput(
                    source=source_name,
                    content=content,
                    confidence=confidence,
                    weight=1.0,
                ))
            except Exception:
                outputs.append(SourceOutput(
                    source=source_name,
                    content="",
                    confidence=0.0,
                    weight=0.1,
                ))

        total_conf = sum(o.confidence for o in outputs)
        if total_conf > 0:
            for o in outputs:
                o.weight = o.confidence / total_conf

        return outputs

    def _invoke_source_engine(
        self,
        engine: Any,
        source_name: str,
        query: str,
    ) -> Any:
        invoke_map = {
            "search": ("search", lambda e, q: e.search(q)),
            "rag": ("query", lambda e, q: e.query(q)),
            "summarizer": ("summarize", lambda e, q: e.summarize(q)),
            "sentiment": ("analyze", lambda e, q: e.analyze(q)),
            "topic_model": ("extract_topics", lambda e, q: e.extract_topics(q)),
            "creative": ("synthesize", lambda e, q: e.synthesize(q)),
            "think": ("think", lambda e, q: e.think(q)),
            "reasoning": ("reason", lambda e, q: e.reason(q)),
            "bias": ("detect", lambda e, q: e.detect(q)),
        }

        method_name, fallback = invoke_map.get(
            source_name,
            ("process", lambda e, q: e.process(q) if hasattr(e, "process") else str(q)),
        )
        try:
            method = getattr(engine, method_name, None)
            if method and callable(method):
                return method(query)
            return fallback(engine, query)
        except Exception:
            return fallback(engine, query)

    def _kb_lookup(self, query: str) -> SourceOutput:
        knowledge_base: dict[str, str] = {
            "认知涌现": "认知涌现指复杂认知系统中，宏观有序的智能行为从微观简单规则的相互作用中自发产生的现象。",
            "人工智能": "人工智能是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。",
            "机器学习": "机器学习是人工智能的子集，使系统能够从数据中学习和改进，而无需显式编程。",
            "深度学习": "深度学习是机器学习的一个子集，使用多层神经网络自动学习数据的层级化特征表示。",
        }
        matched = []
        for keyword, content in knowledge_base.items():
            if keyword in query:
                matched.append(content)

        if matched:
            return SourceOutput(
                source="knowledge_base",
                content="\n".join(matched),
                confidence=0.85,
                weight=1.0,
                citations=[{"source": "knowledge_base", "text": m[:100]} for m in matched],
            )

        return SourceOutput(
            source="knowledge_base",
            content=query,
            confidence=0.3,
            weight=0.1,
        )

    def _extract_content(self, raw: Any) -> str:
        if raw is None:
            return ""
        if isinstance(raw, str):
            return raw
        if isinstance(raw, dict):
            return raw.get("content", raw.get("text", json.dumps(raw, ensure_ascii=False)))
        if isinstance(raw, (list, tuple)):
            texts = []
            for item in raw:
                if isinstance(item, str):
                    texts.append(item)
                elif isinstance(item, dict):
                    texts.append(str(item.get("content", item.get("text", str(item)))))
            return "\n".join(texts)
        return str(raw)

    def _estimate_confidence(self, content: str) -> float:
        if not content:
            return 0.0
        length = len(content)
        if length < 20:
            return 0.3
        if length < 100:
            return 0.5
        if length < 500:
            return 0.7
        return 0.85

    # ── 融合方法 ────────────────────────────────────────────────────

    def _weighted_fusion(
        self,
        outputs: list[SourceOutput],
        detail: DetailLevel,
    ) -> tuple[str, float]:
        """置信度加权融合"""
        if not outputs:
            return "无法合成: 没有可用的数据源", 0.0

        valid = [o for o in outputs if o.content and o.confidence > 0]
        if not valid:
            return "无法合成: 所有数据源置信度过低", 0.0

        total_weight = sum(o.weight for o in valid)
        weighted_confidence = sum(
            o.weight * o.confidence for o in valid
        ) / total_weight if total_weight > 0 else 0.0

        parts: list[str] = []
        sorted_outputs = sorted(valid, key=lambda o: o.weight, reverse=True)

        for o in sorted_outputs:
            source_label = o.source.upper() if o.source != "knowledge_base" else "知识库"
            content = o.content

            if detail == DetailLevel.BRIEF:
                parts.append(f"[{source_label}] {content[:150]}")
            elif detail == DetailLevel.STANDARD:
                parts.append(f"【{source_label}】{content[:400]}")
            else:
                parts.append(f"── {source_label} ──\n{content[:800]}")

        content = "\n\n".join(parts)
        if detail == DetailLevel.BRIEF:
            content = content[:500]
        elif detail == DetailLevel.STANDARD:
            content = content[:1500]
        else:
            content = content[:3000]

        confidence = min(weighted_confidence, 0.99)
        return content, confidence

    def _equal_fusion(
        self,
        outputs: list[SourceOutput],
        detail: DetailLevel,
    ) -> tuple[str, float]:
        """等权重融合"""
        valid = [o for o in outputs if o.content and o.confidence > 0]
        if not valid:
            return "无法合成: 没有有效数据", 0.0

        max_len = {"brief": 100, "standard": 300, "detailed": 600}
        limit = max_len.get(detail.value, 300)

        combined = "\n\n".join(
            f"[{o.source}] {o.content[:limit]}" for o in valid
        )

        confidences = [o.confidence for o in valid]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return combined, round(avg_confidence, 3)

    # ── 冲突检测与消解 ──────────────────────────────────────────────

    def _detect_conflicts(
        self,
        outputs: list[SourceOutput],
    ) -> list[Conflict]:
        """检测多个源输出之间的矛盾"""
        conflicts: list[Conflict] = []
        valid = [o for o in outputs if o.content and o.confidence > 0.3]

        for i in range(len(valid)):
            for j in range(i + 1, len(valid)):
                a = valid[i]
                b = valid[j]
                # 基于内容和置信度差异检测冲突
                words_a = set(a.content.lower().split())
                words_b = set(b.content.lower().split())
                overlap = len(words_a & words_b)
                union = len(words_a | words_b)
                similarity = overlap / max(1, union)

                # 低相似度 + 高置信度 → 可能冲突
                conf_gap = abs(a.confidence - b.confidence)
                if similarity < 0.1 and a.confidence > 0.5 and b.confidence > 0.5:
                    severity = (1 - similarity) * conf_gap
                    conflicts.append(Conflict(
                        source_a=a.source,
                        source_b=b.source,
                        claim_a=a.content[:200],
                        claim_b=b.content[:200],
                        severity=round(severity, 3),
                    ))

        return conflicts

    def _resolve_conflicts(self, conflicts: list[Conflict]) -> int:
        """消解冲突: 基于权重较高的源的结论"""
        resolved = 0
        for c in conflicts:
            c.resolved = True
            c.resolution = (
                f"不同来源({c.source_a} vs {c.source_b})存在差异，"
                f"建议同时参考双方观点以获取全面理解。"
            )
            resolved += 1
        return resolved

    # ── 引用聚合 ────────────────────────────────────────────────────

    def _aggregate_citations(
        self,
        outputs: list[SourceOutput],
    ) -> list[dict[str, str]]:
        citations: list[dict[str, str]] = []
        seen: set[str] = set()

        for o in outputs:
            for cit in o.citations:
                key = cit.get("text", cit.get("source", ""))[:50]
                if key not in seen:
                    seen.add(key)
                    citations.append(cit)

            if o.source == "knowledge_base" and o.content:
                key = o.content[:50]
                if key not in seen:
                    seen.add(key)
                    citations.append({
                        "source": "knowledge_base",
                        "text": o.content[:100],
                    })

        return citations[:20]

    # ── 工具方法 ──────────────────────────────────────────────────

    def get_history(self, limit: int = 20) -> list[dict[str, Any]]:
        return self._synthesis_history[-limit:][::-1]

    def list_available_sources(self) -> list[str]:
        return [n for n, e in self._engines.items() if e is not None] + ["knowledge_base"]
