"""
认知涌现引擎 — 阅读理解引擎
=============================
多轮对话上下文理解 + 指代消解 + 话题追踪

能力:
1. 上下文感知: 将"它""那个""之前说的"解析为具体对象
2. 话题连续性: 检测当前问题是否延续上一轮话题
3. 关键信息提取: 从历史对话中提取与当前问题相关的片段
"""

from __future__ import annotations

import re
from collections import Counter


class ReadingComprehension:
    """
    多轮对话阅读理解

    用法:
        rc = ReadingComprehension()
        ctx = rc.analyze("那它怎么用？", history, current_answer_candidate)
        # -> {"resolved_query": "Python怎么用？", "context_snippets": [...], "continuity": True}
    """

    # 指代词模式
    REFERENCE_PATTERNS = [
        (r"那[这那]个", "entity"),
        (r"它(是|的|怎么|有|会|能|可以)", "entity"),
        (r"这[是个种些]", "entity"),
        (r"那个", "entity"),
        (r"这个", "entity"),
        (r"上面[说的提到的讲的]", "text_ref"),
        (r"前面[说的提到的讲的]", "text_ref"),
        (r"刚才[说的提到的讲的]", "text_ref"),
        (r"之前[说的提到的讲的]", "text_ref"),
        (r"继续", "continuation"),
        (r"再说[说点点]", "continuation"),
        (r"还有[吗呢](?!什么)", "continuation"),
    ]

    REFERENCE_WORDS = {"它", "这个", "那个", "这", "那", "这些", "那些"}

    def __init__(self, context_window: int = 10):
        self._context_window = context_window

    def analyze(self, query: str, history: list[dict],
                current_candidate: str = "") -> dict:
        """
        分析当前查询的上下文

        返回:
            - resolved_query: 指代消解后的查询
            - context_snippets: 相关历史片段
            - continuity: 是否为上一轮的延续
            - entity_ref: 消解后的实体名
        """

        result = {
            "resolved_query": query,
            "context_snippets": [],
            "continuity": False,
            "entity_ref": None,
        }

        if not history or len(history) < 2:
            return result

        ql = query.strip().lower()

        # 1. 检测话题延续性
        result["continuity"] = self._is_continuation(ql, history)

        # 2. 指代消解
        entity = self._resolve_reference(ql, history)
        if entity:
            result["entity_ref"] = entity
            result["resolved_query"] = self._rewrite_query(query, entity)

        # 3. 提取相关上下文片段
        result["context_snippets"] = self._extract_relevant(ql, query, history)

        return result

    def _is_continuation(self, query_lower: str, history: list[dict]) -> bool:
        """检测是否为上一轮对话的延续"""
        if not history:
            return False

        # 形态 1: 指代词开头
        if any(q.startswith(rw) for rw in self.REFERENCE_WORDS for q in [query_lower]):
            return True

        # 形态 2: 继续追问词
        continuation_words = {"继续", "还有呢", "然后呢", "接着说", "再讲讲", "详细点",
                               "具体点", "展开说说", "详细说说"}
        if any(cw in query_lower for cw in continuation_words):
            return True

        # 形态 3: 省略主语的问题(如"怎么实现？" — 没说是实现什么)
        if len(query_lower) < 6 and ("怎么" in query_lower or "如何" in query_lower):
            return True

        return False

    def _resolve_reference(self, query_lower: str, history: list[dict]) -> str:
        """指代消解: 将代词替换为上文中最近提到的实体"""
        # 先检测是否有指代词
        has_ref = False
        for pattern, _ in self.REFERENCE_PATTERNS:
            if re.search(pattern, query_lower):
                has_ref = True
                break

        if not has_ref:
            return ""

        # 从上文提取最近的关键名词/实体
        candidates = []
        for msg in reversed(history):
            if msg.get("role") == "user":
                text = msg.get("content", "")
                entities = self._extract_entities(text)
                if entities:
                    candidates.append(entities[-1])
                    break
            elif msg.get("role") == "assistant":
                text = msg.get("content", "")
                entities = self._extract_entities(text)
                if entities:
                    candidates.extend(entities)

        if not candidates:
            return ""

        # 返回最相关的实体
        return candidates[0] if candidates else ""

    def _extract_entities(self, text: str) -> list[str]:
        entities = []
        en_words = re.findall(r'\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})?\b', text)
        entities.extend(en_words)

        cn_phrases = re.findall(r'[\u4e00-\u9fff]{2,6}', text)
        stop_words = {"这个", "那个", "可以", "应该", "所以", "因为", "如果", "但是",
                       "什么", "怎么", "如何", "为什么", "还有", "然后", "就是",
                       "已经", "还是", "不是", "没有", "不过", "虽然", "而且"}
        stop_suffixes = {"是一种", "是一个", "是指", "是", "可以", "能够", "需要", "应该",
                          "会", "能", "很", "非常", "比较", "较为", "最为", "并不"}
        for phrase in cn_phrases:
            if phrase in stop_words or len(phrase) < 2:
                continue
            cleaned = phrase
            for sfx in stop_suffixes:
                if cleaned.endswith(sfx):
                    cleaned = cleaned[:-len(sfx)]
                    break
            if len(cleaned) >= 2 and cleaned not in stop_words:
                entities.append(cleaned)

        return entities[:5]

    def _rewrite_query(self, original: str, entity: str) -> str:
        """用消解后的实体重写查询"""
        rewritten = original
        for rw in self.REFERENCE_WORDS:
            if rw in rewritten:
                rewritten = rewritten.replace(rw, entity, 1)
                break
        return rewritten

    def _extract_relevant(self, query_lower: str, original: str,
                          history: list[dict]) -> list[str]:
        """从历史中提取与当前查询相关的片段"""
        snippets = []
        keywords = self._extract_keywords(original)

        for msg in reversed(history[-self._context_window:]):
            content = msg.get("content", "")
            if not content:
                continue

            score = 0
            for kw in keywords:
                if kw.lower() in content.lower():
                    score += 2

            if score >= 2:
                snippet = content[:200] + ("..." if len(content) > 200 else "")
                snippets.append(snippet)

            if len(snippets) >= 3:
                break

        return snippets

    def _extract_keywords(self, text: str) -> list[str]:
        """提取关键词"""
        words = re.findall(r'[\u4e00-\u9fff]{2,}|[a-zA-Z]{3,}', text.lower())
        stop = {"什么", "怎么", "如何", "这个", "那个", "可以", "应该", "还有", "然后",
                "已经", "还是", "没有", "不过", "虽然", "而且", "因为", "所以", "但是",
                "就是", "不是", "the", "and", "for", "that", "this", "with", "what",
                "how", "when", "where", "which", "will", "have", "has", "been"}
        return [w for w in words if w not in stop][:8]
