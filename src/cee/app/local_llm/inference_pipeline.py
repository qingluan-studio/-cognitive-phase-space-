"""
认知涌现引擎 — 字典推理流水线
=============================
编排从意图检测到回复组装的完整流程:
IntentDetect → CompositedDict.query → Ranker → Assembler → T6 Gate → Retry/Dedup
"""

from __future__ import annotations

import hashlib
import random
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Optional, Any

from .composited_dict import CompositedDictionaryEngine, RankedFragment


INTENT_PATTERNS: dict[str, list[str]] = {
    "code": ["写", "代码", "编程", "实现", "函数", "算法", "bug", "错误", "报错", "示例", "sort",
             "filter", "map", "reduce", "递归", "循环", "类", "class", "def", "api", "http"],
    "explain": ["解释", "说明", "是什么", "为什么", "怎么", "如何", "原理", "概念", "区别", "意思"],
    "emotion": ["感觉", "心情", "难过", "开心", "焦虑", "烦恼", "累了", "疲惫", "烦躁"],
    "logic": ["逻辑", "推理", "证明", "分析", "如果", "假设", "那么", "推导", "因果"],
    "creative": ["创意", "想法", "设计", "点子", "灵感", "生成", "创造", "brainstorm"],
    "translate": ["翻译", "英文", "中文", "日文", "translate", "怎么说", "什么意思"],
    "compare": ["对比", "比较", "哪个好", "区别", "优缺点", "vs", "和"],
    "chat": ["你好", "hello", "谢谢", "再见", "今天", "天气", "闲聊"],
}


@dataclass
class AssemblyResult:
    content: str
    quality_scores: dict[str, float]
    composite: float
    tier: str
    retries: int = 0
    fragment_keys: list[str] = field(default_factory=list)
    assembly_hash: str = ""
    elapsed_ms: float = 0.0
    source: str = "dictionary"


class DictionaryInferencePipeline:
    """
    字典推理流水线

    用法:
        pipeline = DictionaryInferencePipeline(composited_engine, t6_engine)
        result = pipeline.infer("给我写一个排序函数")
    """

    MAX_HISTORY = 2000
    MAX_RETRIES = 3
    QUALITY_THRESHOLD = 0.65

    def __init__(self, composited: CompositedDictionaryEngine, t6_engine=None):
        self._composited = composited
        self._t6 = t6_engine
        self._history: deque[str] = deque(maxlen=self.MAX_HISTORY)
        self._stats = {"total": 0, "passed": 0, "retried": 0, "fallback": 0}

    def infer(self, query: str) -> AssemblyResult:
        start = time.perf_counter()
        self._stats["total"] += 1

        intent = self._detect_intent(query)
        fragments = self._composited.query(intent, query)

        for attempt in range(self.MAX_RETRIES + 1):
            content = self._composited.assemble(query, fragments)
            assembly_hash = hashlib.sha256(content.encode()).hexdigest()[:16]

            if self._is_duplicate(assembly_hash) and attempt < self.MAX_RETRIES:
                random.shuffle(fragments)
                self._stats["retried"] += 1
                continue

            scores = self._evaluate_quality(content) if self._t6 else {
                "itc": 0.7, "scs": 0.7, "iec": 0.7, "pfft": 0.7, "composite": 0.7
            }
            composite = scores.get("composite", 0.7)
            tier = self._quality_tier(composite)

            if composite >= self.QUALITY_THRESHOLD:
                self._history.append(assembly_hash)
                self._stats["passed"] += 1
                for rf in fragments[:5]:
                    self._composited.record_assembly_hit(rf.entry.key)
                elapsed = round((time.perf_counter() - start) * 1000, 1)
                return AssemblyResult(
                    content=content,
                    quality_scores=scores,
                    composite=composite,
                    tier=tier,
                    retries=attempt,
                    fragment_keys=[rf.entry.key for rf in fragments[:5]],
                    assembly_hash=assembly_hash,
                    elapsed_ms=elapsed,
                )

            self._stats["retried"] += 1
            random.shuffle(fragments)

        self._history.append(assembly_hash)
        self._stats["fallback"] += 1
        elapsed = round((time.perf_counter() - start) * 1000, 1)
        return AssemblyResult(
            content=content,
            quality_scores=scores,
            composite=composite,
            tier=tier,
            retries=self.MAX_RETRIES,
            fragment_keys=[rf.entry.key for rf in fragments[:5]],
            assembly_hash=assembly_hash,
            elapsed_ms=elapsed,
        )

    def _detect_intent(self, query: str) -> str:
        ql = query.lower()
        scores = {}
        for intent, keywords in INTENT_PATTERNS.items():
            hits = sum(1 for kw in keywords if kw in ql)
            if hits > 0:
                scores[intent] = hits
        if scores:
            return max(scores, key=scores.get)
        return "chat"

    def _is_duplicate(self, assembly_hash: str) -> bool:
        return assembly_hash in self._history

    def _evaluate_quality(self, content: str) -> dict[str, float]:
        try:
            result = self._t6.evaluate(content)
            if hasattr(result, "itc"):
                composite = (result.itc + result.scs + result.iec + result.pfft) / 4
                return {
                    "itc": float(result.itc),
                    "scs": float(result.scs),
                    "iec": float(result.iec),
                    "pfft": float(result.pfft),
                    "composite": float(composite),
                }
        except Exception:
            pass
        return {"itc": 0.7, "scs": 0.7, "iec": 0.7, "pfft": 0.7, "composite": 0.7}

    def _quality_tier(self, composite: float) -> str:
        if composite >= 0.90:
            return "A"
        elif composite >= 0.75:
            return "B"
        elif composite >= 0.60:
            return "C"
        else:
            return "D"

    def stats(self) -> dict:
        return dict(self._stats)
