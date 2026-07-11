"""
认知涌现引擎 — 反事实推理引擎
===============================
认知科学核心能力之一: "如果...会怎样?" 的推理

三阶段流程:
1. 条件反转: 识别查询中的关键假设，构造反事实条件
   - "如果Python没有GIL" → 识别关键变量(GIL), 反转条件(无GIL)
   - "如果深度学习没有大数据" → 反转条件(数据稀缺)

2. 后果投射: 在反事实条件下推演可能的连锁效应
   - 基于知识图谱中该概念的上下游关系链
   - 基于自学习事实中的因果链

3. 对比洞察: 对比反事实推演 vs 实际世界，生成因果洞察
   - "GIL的存在其实是双刃剑: 简化了CPython实现但限制了多线程"

反事实类型:
- 减法型: 移除某个因素 → "如果没有X..."
- 加法型: 添加某个因素 → "如果有X..."
- 替换型: 替换某个因素 → "如果X换成Y..."
- 幅度型: 改变某个因素的量 → "如果X增强/减弱..."

用法:
    cfr = CounterfactualReasoning(kgraph, auto_learner)
    result = cfr.reason("如果Python没有GIL会怎样")
    # -> {"counterfactual":"删除GIL的影响链: 内存管理→复杂化|多线程→解锁", "insight":"..."}
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from .knowledge_store import STORAGE_DIR

if TYPE_CHECKING:
    from .knowledge_graph import KnowledgeGraph
    from .auto_learner import AutoLearner

CF_FILE = STORAGE_DIR / "counterfactual.json"

COUNTERFACTUAL_PATTERNS = [
    r"(如果|假如|假设|要是)(.{2,40})(会|怎么|怎样|如何)(.{2,60})",
    r"(如果|假如|假设|要是)(.{2,40})(呢|？|\?)",
    r"(.{2,20})(没有|不存在|不会|不能)(.{2,30})(会|怎么|如何)(.{2,40})",
    r"为什么(不能|不可以|不行)(.{2,40})",
    r"能不能(不|换|改|去掉|移除|删除)(.{2,40})",
    r"(应该|能|可以)(不|换|改|去掉)(.+吗)",
]

CAUSAL_CHAINS: dict[str, list[str]] = {
    "GIL": [
        "GIL → CPython内存管理安全 → 无法真正多线程 → CPU密集型任务受限 → 多进程/异步方案",
    ],
    "大数据": [
        "大数据 → 深度学习成功条件 → 海量标注 → 模型泛化 → 数据依赖成为瓶颈",
    ],
    "注意力机制": [
        "注意力机制 → Transformer核心 → 长程依赖捕捉 → 算力消耗巨大 → 线性注意力/稀疏方案",
    ],
    "图灵完备": [
        "图灵完备 → 可计算 → 停机问题不可判定 → 静态分析受限 → 运行时检查/类型系统",
    ],
    "类型系统": [
        "类型系统 → 编译期错误检测 → 代码可靠性 → 灵活性降级 → 泛型/类型推断",
    ],
    "分布式": [
        "分布式 → CAP定理 → 一致性/可用性取舍 → 最终一致性策略 → 复杂度剧增",
    ],
}


@dataclass
class CounterFactualResult:
    query: str
    fact_type: str
    condition_inverted: str
    consequence_chain: list[str]
    insight: str
    confidence: float
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CounterfactualReasoning:
    def __init__(self, kgraph: KnowledgeGraph | None = None,
                 learner: AutoLearner | None = None):
        self._kgraph = kgraph
        self._learner = learner
        self._history: list[CounterFactualResult] = []
        self._causal_chains: dict[str, list[str]] = dict(CAUSAL_CHAINS)
        self._load()

    def reason(self, query: str) -> CounterFactualResult | None:
        parsed = self._parse_counterfactual(query)
        if not parsed:
            return None

        fact_type, condition, consequence = parsed
        inverted = self._invert_condition(condition, fact_type)

        chain = self._project_consequences(inverted, condition)

        insight = self._generate_insight(condition, inverted, chain, fact_type)
        confidence = self._estimate_confidence(query, chain)

        result = CounterFactualResult(
            query=query, fact_type=fact_type,
            condition_inverted=inverted,
            consequence_chain=chain,
            insight=insight, confidence=confidence,
        )
        self._history.append(result)
        if len(self._history) > 100:
            self._history = self._history[-50:]
        self._save()
        return result

    def is_counterfactual(self, query: str) -> bool:
        ql = query.lower()
        cf_markers = ["如果", "假如", "假设", "要是", "要是没有",
                       "为什么不能", "能不能不用", "会怎样", "会怎么样",
                       "what if", "if only", "suppose",
                       "换一种", "换一种方式", "换个角度"]
        return any(m in ql for m in cf_markers)

    def _parse_counterfactual(self, query: str) -> tuple[str, str, str] | None:
        for pattern in COUNTERFACTUAL_PATTERNS[:3]:
            m = re.search(pattern, query)
            if m:
                groups = m.groups()
                condition = groups[1] if len(groups) > 1 else groups[0]
                consequence = groups[3] if len(groups) > 3 else ""

                if any(w in query for w in ["没有", "不存在", "不会", "不能", "去掉", "移除"]):
                    return ("subtractive", condition.strip(), consequence.strip())

                if any(w in query for w in ["换成", "替代", "代替", "改成"]):
                    return ("substitution", condition.strip(), consequence.strip())

                if any(w in query for w in ["更强", "更多", "更大", "更快", "增强"]):
                    return ("amplification", condition.strip(), consequence.strip())

                return ("additive", condition.strip(), consequence.strip())

        if "如果" in query and "会怎样" in query:
            parts = re.split(r'如果|会怎样', query)
            if len(parts) >= 2:
                return ("additive", parts[1].strip(), "")

        return None

    def _invert_condition(self, condition: str, fact_type: str) -> str:
        if fact_type == "subtractive":
            return f"移除 {condition}"
        if fact_type == "substitution":
            return f"替换 {condition}"
        if fact_type == "amplification":
            return f"增强 {condition}"
        return f"引入 {condition}"

    def _project_consequences(self, inverted: str, condition: str) -> list[str]:
        chain: list[str] = []

        kw = self._extract_key_concept(condition, inverted)
        if kw and kw in self._causal_chains:
            raw_chains = self._causal_chains[kw]
            for raw in raw_chains:
                steps = [s.strip() for s in raw.split("→")]
                chain.extend(steps[:5])

        if self._kgraph and kw:
            related = self._kgraph.bidirectional_expand(kw, max_nodes=4)
            for node, rel, direction, weight in related:
                if weight >= 0.6:
                    if direction == "out":
                        chain.append(f"{kw}→{node} ({rel})")
                    else:
                        chain.append(f"{node}→{kw} ({rel})")

        if not chain:
            chain.append(f"{inverted}的直接后果尚不明确，需更多上下文推演")

        return chain[:6]

    def _generate_insight(self, condition: str, inverted: str,
                           chain: list[str], fact_type: str) -> str:
        key = self._extract_key_concept(condition, inverted)
        real_state = condition
        counter_state = inverted

        paths = [c for c in chain if "→" in c]
        if paths:
            effects = "；".join(paths[-3:])
            return (f"在'{inverted}'的反事实世界中，{key}不再存在/"
                    f"被改变，导致连锁反应: {effects}。"
                    f"现实世界中{real_state}之所以如此，正是因为这些约束共同塑造了当前的设计取舍。")
        return (f"'{inverted}'的反事实情景下，原有围绕'{condition}'建立的整个系统结构都将需要重新设计。"
                f"这意味着{real_state}不仅是偶然，而是系统级约束的必然产物。")

    def _extract_key_concept(self, condition: str, inverted: str) -> str:
        for kw in self._causal_chains:
            if kw.lower() in condition.lower() or kw.lower() in inverted.lower():
                return kw

        matches = re.findall(r'[\u4e00-\u9fa5a-zA-Z]{2,12}', condition)
        for m in matches:
            if m.lower() not in ["如果", "假如", "假设", "要是", "没有", "不会", "不能",
                                    "换成", "替代", "有没有", "怎么样", "会怎样"]:
                if self._kgraph and m.strip() in self._kgraph._graph:
                    return m.strip()

        if matches:
            return matches[0]
        return "未知因素"

    def _estimate_confidence(self, query: str, chain: list[str]) -> float:
        base = 0.5
        if len(chain) > 3:
            base += 0.1
        if any("→" in c for c in chain):
            base += 0.15
        if self._learner:
            facts = self._learner.query(query, top_k=3)
            if facts:
                base += 0.1
        return round(min(0.95, base), 3)

    def stats(self) -> dict:
        return {
            "total_reasonings": len(self._history),
            "recent": [{"query": h.query[:40], "type": h.fact_type,
                        "confidence": h.confidence}
                       for h in self._history[-4:]],
        }

    def _load(self):
        if CF_FILE.exists():
            try:
                with open(CF_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._history = [CounterFactualResult(**r)
                                 for r in data.get("history", [])[-50:]]
                self._causal_chains.update(data.get("causal_chains", {}))
            except Exception:
                pass

    def _save(self):
        try:
            data = {
                "history": [{"query": h.query, "fact_type": h.fact_type,
                             "condition_inverted": h.condition_inverted,
                             "consequence_chain": h.consequence_chain,
                             "insight": h.insight, "confidence": h.confidence,
                             "created_at": h.created_at}
                            for h in self._history[-30:]],
                "causal_chains": {k: v for k, v in self._causal_chains.items()
                                  if k not in CAUSAL_CHAINS},
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(CF_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
