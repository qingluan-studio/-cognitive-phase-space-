"""
认知涌现引擎 — 意图澄清引擎
=============================
检测模糊/过短/歧义输入，生成精准追问

策略:
1. 长度分析: <8字 → 必定追问
2. 歧义词检测: 多义词/指代词 → 追问具体含义
3. 领域模糊: "怎么学编程" 太宽 → 追问语言/方向
4. 澄清内存: 同一会话不重复追问同类问题
"""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Optional

AMBIGUOUS_WORDS = {
    "那个": "你说的'那个'具体指什么？",
    "这个": "能具体说说'这个'指的是什么吗？",
    "它": "你说的是哪个东西？",
    "这样": "你期望的结果具体是什么样子？",
    "怎么做": "你想了解哪方面的具体做法？",
    "弄": "你说的'弄'具体是什么操作？",
    "搞": "能具体描述你想做什么吗？",
    "处理": "你想处理什么类型的问题？",
    "那个东西": "能换个说法描述一下吗？",
}

BROAD_TOPICS = {
    r"怎么学(编程|代码|开发)": ("编程方向很多，你更关注：前端/后端/数据科学/移动开发 哪个方向？",
                                   ["前端", "后端", "数据科学", "移动开发"]),
    r"推荐.*(书|课程|教程|资源)": ("你感兴趣的是哪个领域？",
                                     ["技术编程", "认知科学", "AI/机器学习", "思维方式"]),
    r"(推荐|有什么).*(工具|软件).*推荐": ("你用在什么场景？具体需求是什么？",
                                     ["代码开发", "设计创作", "日常办公", "视频编辑"]),
    r"怎么.*(提高|提升|改善)": ("你想提高哪方面的能力？",
                                  ["编程能力", "思维方式", "学习效率", "工作效率"]),
    r"我该(选|用).*哪个": ("你在对比哪几个方案？分别看重什么？",
                               ["性能和速度", "易用性", "免费开源", "生态完善"]),
    r"帮我.*(写|生成|做一个)": ("想做什么类型的东西？能描述一下具体需求吗？",
                                  ["代码/脚本", "设计方案", "文字内容", "分析报告"]),
}

CLARIFY_MEMORY: dict[str, set[str]] = defaultdict(set)


class ClarificationEngine:
    """
    意图澄清引擎：在推理前判断是否需要追问

    用法:
        ce = ClarificationEngine()
        result = ce.check("怎么学编程")
        if result.needs_clarify:
            return result.question  # 返回追问而非推理

        # 用户回答后:
        ce.record_clarified(user_query, "选择方向")
    """

    def __init__(self):
        pass

    def check(self, text: str, session_id: str = "default") -> Optional[dict]:
        """
        检查是否需要追问。返回 None 表示无需追问，可以正常推理。
        返回 dict 表示需要追问: {"question": "...", "options": [...]}
        """
        t = text.strip()
        if not t:
            return None

        # 1. 歧义词检测 (优先)
        ambig = self._check_ambiguous(t)
        if ambig:
            return ambig

        # 2. 宽泛话题检测 (优先于长度)
        broad = self._check_broad(t)
        if broad:
            return broad

        # 3. 长度检测: <8 字大概率需要追问 (但含疑问词/关键词的放行)
        if len(t) < 8:
            if self._is_search_query(t):
                return None
            return self._short_query_clarify(t)

        # 4. 检测是否已在本会话追问过
        key = (session_id, self._topic_key(t))
        if key in CLARIFY_MEMORY:
            return None

        return None

    def _short_query_clarify(self, text: str) -> dict:
        t = text.lower()
        if t in {"嗯", "哦", "好", "是", "对", "ok", "yes", "no"}:
            return {"question": "还有什么想深入了解的吗？继续说吧。", "options": []}
        import random
        templates = [
            ("能多说一点吗？我想更准确地理解你的需求。", []),
            ("具体是什么场景呢？多说几个字让我理解更准确。", []),
            ("看起来你想问什么但没说清楚，能展开说说吗？", []),
        ]
        q, opts = random.choice(templates)
        return {"question": q, "options": opts}

    def _is_search_query(self, text: str) -> bool:
        """检测是否是有明确查询意图的短句 (放行)"""
        question_words = {"什么", "怎么", "如何", "为什么", "谁", "哪个", "哪", "何时", "定义", "解释"}
        if any(qw in text for qw in question_words):
            return True
        # 检查是否为已知知识库关键词
        from .fallback_rules import BUILTIN_KNOWLEDGE
        for keyword in BUILTIN_KNOWLEDGE:
            kn = keyword.replace(" ", "").lower()
            tn = text.replace(" ", "").lower()
            if kn in tn or tn in kn:
                return True
            for wl in (4, 3, 2):
                for i in range(len(tn) - wl + 1):
                    if tn[i:i + wl] in kn:
                        return True
        return False

    def _check_ambiguous(self, text: str) -> Optional[dict]:
        for word, question in AMBIGUOUS_WORDS.items():
            if word in text:
                return {"question": question, "options": []}
        return None

    def _check_broad(self, text: str) -> Optional[dict]:
        for pattern, (question, options) in BROAD_TOPICS.items():
            if re.search(pattern, text, re.IGNORECASE):
                return {"question": question, "options": options}
        return None

    def _topic_key(self, text: str) -> str:
        """提取话题的简略标识"""
        words = re.findall(r"[\u4e00-\u9fff]{2,}|[a-zA-Z]{3,}", text.lower())
        if words:
            return words[0][:6]
        return text[:10]

    def record_clarified(self, user_query: str, chosen_direction: str,
                         session_id: str = "default"):
        """记录用户已澄清方向，同会话内不再追问同类"""
        key = (session_id, self._topic_key(user_query))
        CLARIFY_MEMORY[key].add(chosen_direction)
        if len(CLARIFY_MEMORY) > 200:
            oldest = min(CLARIFY_MEMORY.keys())
            del CLARIFY_MEMORY[oldest]

    def clear_session(self, session_id: str):
        keys = [k for k in CLARIFY_MEMORY if k[0] == session_id]
        for k in keys:
            del CLARIFY_MEMORY[k]
