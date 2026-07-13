"""
认知涌现引擎 — 自模拟对话生成器
===============================
从9本字典随机种子生成提问并自答
8种query类别, 质量门控, 自动存入KnowledgeStore
"""

from __future__ import annotations

import hashlib
import random
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Optional, Any

from .composited_dict import CompositedDictionaryEngine
from .inference_pipeline import DictionaryInferencePipeline


QUERY_TEMPLATES: dict[str, list[str]] = {
    "explain": [
        "什么是{keyword}?",
        "{keyword}的原理是什么?",
        "能否解释一下{keyword}的概念?",
        "{keyword}和{keyword2}有什么区别?",
        "为什么{keyword}这么重要?",
    ],
    "code": [
        "如何用{lang}实现{keyword}?",
        "写一个{keyword}的{lang}代码示例",
        "这段{lang}代码为什么报错?",
        "{lang}中{keyword}的最佳实践是什么?",
        "帮我优化这个{keyword}函数",
    ],
    "emotion": [
        "我觉得{emotion},有什么建议吗?",
        "最近做项目一直{emotion},怎么办?",
        "编程时{emotion}是正常的吗?",
        "为什么学{keyword}让人{emotion}?",
    ],
    "logic": [
        "如果{condition},那么会发生什么?",
        "请推理一下{keyword}的因果链",
        "从{keyword}能推导出什么结论?",
        "假设{assumption},会有什么结果?",
    ],
    "creative": [
        "给我一些关于{keyword}的创新想法",
        "如何把{keyword}应用到不相关的领域?",
        "设计一个结合{keyword}和{keyword2}的新方案",
        "有什么脑洞大开的使用{keyword}的方式?",
    ],
    "translate": [
        "{keyword}用英文怎么说?",
        "{keyword}的中文翻译是什么?",
        "{keyword}在不同语言中的表达有什么区别?",
    ],
    "compare": [
        "{keyword}和{keyword2}哪个更适合?",
        "比较一下{keyword}和{keyword2}的优缺点",
        "在什么情况下用{keyword}而不是{keyword2}?",
    ],
    "chat": [
        "最近{keyword}有什么新闻?",
        "你对{keyword}怎么看?",
        "{keyword}未来会怎样发展?",
        "你有什么关于{keyword}的建议?",
    ],
}


EMOTION_TERMS: list[str] = ["好奇", "困惑", "沮丧", "兴奋", "疲惫", "迷茫", "焦虑", "满足"]

LANGUAGE_NAMES: list[str] = ["Python", "JavaScript", "C", "Rust", "Go", "Bash"]


@dataclass
class SelfDialogueRecord:
    id: str
    simulated_query: str
    assembled_response: str
    itc: float = 0.0
    scs: float = 0.0
    iec: float = 0.0
    pfft: float = 0.0
    composite: float = 0.0
    tier: str = "D"
    seed_fragments: list[str] = field(default_factory=list)
    generated_at: str = ""
    stored: bool = False


class SelfDialogueSimulator:
    """
    自模拟对话生成器

    用法:
        sim = SelfDialogueSimulator(composited_engine, inference_pipeline, knowledge_store)
        record = sim.simulate_one()
        results = sim.simulate_batch(count=100)
    """

    MAX_QUERY_HISTORY = 3000
    QUALITY_STORE_THRESHOLD = 0.65
    QUALITY_DISCARD_THRESHOLD = 0.50

    def __init__(self, composited: CompositedDictionaryEngine,
                 inference: DictionaryInferencePipeline,
                 knowledge_store=None):
        self._composited = composited
        self._inference = inference
        self._knowledge_store = knowledge_store
        self._query_history: deque[str] = deque(maxlen=self.MAX_QUERY_HISTORY)
        self._stats = {"generated": 0, "stored": 0, "discarded": 0, "cached": 0}

    def simulate_one(self) -> Optional[SelfDialogueRecord]:
        self._composited.load_all()

        for _ in range(10):
            query, seed_keys = self._generate_query()
            query_hash = hashlib.md5(query.encode()).hexdigest()[:12]
            if query_hash not in self._query_history:
                self._query_history.append(query_hash)
                break
        else:
            self._stats["generated"] += 1
            return None

        result = self._inference.infer(query)
        record = SelfDialogueRecord(
            id=query_hash,
            simulated_query=query,
            assembled_response=result.content,
            itc=result.quality_scores.get("itc", 0.0),
            scs=result.quality_scores.get("scs", 0.0),
            iec=result.quality_scores.get("iec", 0.0),
            pfft=result.quality_scores.get("pfft", 0.0),
            composite=result.composite,
            tier=result.tier,
            seed_fragments=seed_keys,
            generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )

        self._stats["generated"] += 1

        if result.composite >= self.QUALITY_STORE_THRESHOLD:
            record.stored = True
            self._stats["stored"] += 1
            if self._knowledge_store:
                try:
                    self._knowledge_store.add_pair(query, result.content, result.quality_scores)
                except Exception:
                    pass
        elif result.composite >= self.QUALITY_DISCARD_THRESHOLD:
            self._stats["cached"] += 1
        else:
            self._stats["discarded"] += 1

        return record

    def simulate_batch(self, count: int = 100) -> list[SelfDialogueRecord]:
        results = []
        for _ in range(count):
            record = self.simulate_one()
            if record:
                results.append(record)
        return results

    def _generate_query(self) -> tuple[str, list[str]]:
        seed_keys: list[str] = []
        category = random.choice(list(QUERY_TEMPLATES.keys()))

        top_chars = self._composited._char.top_by_frequency(random.randint(50, 200))
        if top_chars:
            seed = random.choice(top_chars)
            seed_keys.append(seed.key)

        code_matches = self._composited._code.match_pattern(
            random.choice(["sort", "filter", "map", "reduce", "async", "loop", "json",
                           "error", "http", "file", "regex", "test", "log", "config"])
        )
        if code_matches:
            cm = random.choice(code_matches)
            seed_keys.append(cm.get("type", ""))

        templates = QUERY_TEMPLATES.get(category, QUERY_TEMPLATES["chat"])
        template = random.choice(templates)

        keyword = ""
        if top_chars and len(top_chars) > 1:
            keyword = random.choice(top_chars).key
        if hasattr(self._composited._code, "_symbols"):
            all_symbols = list(self._composited._code._symbols.keys())
            if all_symbols:
                keyword += random.choice(all_symbols)
        if not keyword:
            keyword = random.choice(["编程", "学习", "算法", "系统", "架构", "设计"])

        keyword2 = keyword
        if top_chars and len(top_chars) > 2:
            keyword2 = random.choice(top_chars).key

        query = template.format(
            keyword=keyword,
            keyword2=keyword2,
            lang=random.choice(LANGUAGE_NAMES),
            emotion=random.choice(EMOTION_TERMS),
            condition=f"{keyword}改变了",
            assumption=f"{keyword}不存在",
        )

        return query, seed_keys

    def stats(self) -> dict:
        return dict(self._stats)
