"""
认知涌现引擎 — 情感感知引擎
=============================
检测用户情绪状态并调节回复语气

维度:
1. 情绪极性: 正面/中性/负面
2. 情绪类型: 好奇/困惑/沮丧/兴奋/疲惫/满意
3. 紧迫度: 低/中/高 (需要快速回答?)
4. 语气调节: 基于情绪选择回复风格
"""

from __future__ import annotations

import re

POSITIVE_LEXICON = {
    "谢谢", "感谢", "很好", "太棒", "不错", "喜欢", "好用的", "厉害了", "赞",
    "完美", "优秀", "棒", "nice", "great", "awesome", "cool", "excellent",
    "开心", "高兴", "满意", "妙", "厉害", "强大",
}

NEGATIVE_LEXICON = {
    "不行", "不好", "出错", "错了", "不对", "失败", "郁闷", "烦", "崩溃",
    "糟糕", "差劲", "垃圾", "没用", "失望", "伤心", "难过", "生气",
    "麻烦", "困扰", "头疼", "无奈", "操蛋", "妈蛋",
}

CURIOUS_WORDS = {"为什么", "怎么", "如何", "什么是", "是什么", "原理", "原因", "机制", "底层"}
CONFUSED_WORDS = {"不懂", "不理解", "不明白", "搞不懂", "混乱", "迷惑", "困惑", "迷", "晕", "糊涂"}
FRUSTRATED_WORDS = {"试了好多次", "还是不行", "一直报错", "怎么都", "老是", "总是", "反复",
                    "又出", "再次", "无效", "没用", "气死", "报错", "错误",
                    "好烦", "烦死了", "烦人", "崩溃了", "不行了", "受不了"}
EXCITED_WORDS = {"太好了", "牛", "酷", "厉害", "wow", "amazing", "有意思", "有趣"}
TIRED_WORDS = {"累了", "好累", "不想", "烦躁", "不想动", "疲惫", "困"}
URGENCY_WORDS = {"急", "快点", "马上", "紧急", "尽快", "立刻", "速度", "赶紧", "在线等",
                 "很急", "救命", "help", "urgent"}


class AffectEngine:
    """
    情感感知引擎

    用法:
        ae = AffectEngine()
        affect = ae.detect("为什么一直报错啊，试了好多次都不行")
        # -> {"polarity": "negative", "type": "frustrated", "urgency": "medium"}
        tone = ae.choose_tone(affect)
        # -> "encouraging" — 回复时会加一段安抚话
    """

    def __init__(self):
        self._sentiment_history: list[dict] = []

    def detect(self, text: str) -> dict:
        pos = sum(1 for w in POSITIVE_LEXICON if w in text)
        neg = sum(1 for w in NEGATIVE_LEXICON if w in text)

        if pos > neg:
            polarity = "positive"
        elif neg > pos:
            polarity = "negative"
        else:
            polarity = "neutral"

        affect_type = self._classify_emotion(text)

        urgency = "low"
        u_count = sum(1 for w in URGENCY_WORDS if w in text)
        if u_count >= 2:
            urgency = "high"
        elif u_count >= 1:
            urgency = "medium"

        result = {
            "polarity": polarity,
            "type": affect_type,
            "urgency": urgency,
            "score": round((pos - neg) / max(1, len(text) / 10), 2),
        }

        self._sentiment_history.append(result)
        if len(self._sentiment_history) > 50:
            self._sentiment_history = self._sentiment_history[-50:]

        return result

    def _classify_emotion(self, text: str) -> str:
        scores = {
            "frustrated": sum(1 for w in FRUSTRATED_WORDS if w in text),
            "confused": sum(1 for w in CONFUSED_WORDS if w in text),
            "tired": sum(1 for w in TIRED_WORDS if w in text),
            "excited": sum(1 for w in EXCITED_WORDS if w in text),
            "curious": sum(1 for w in CURIOUS_WORDS if w in text),
        }
        if not any(scores.values()):
            return "neutral"
        # frustrated和confused优先于curious
        if scores["frustrated"] > 0:
            return "frustrated"
        if scores["confused"] > 0:
            return "confused"
        return max(scores, key=scores.get)

    def choose_tone(self, affect: dict) -> str:
        """基于情感选择回复语气"""
        mapping = {
            ("positive", "excited"): "enthusiastic",
            ("positive", "neutral"): "warm",
            ("negative", "frustrated"): "encouraging",
            ("negative", "confused"): "simplified",
            ("negative", "tired"): "brief",
            ("neutral", "curious"): "explanatory",
            ("neutral", "neutral"): "balanced",
        }
        key = (affect["polarity"], affect["type"])
        tone = mapping.get(key, "balanced")

        if affect["urgency"] == "high":
            tone = "direct"

        return tone

    def tone_prefix(self, tone: str) -> str:
        """回复前缀注入"""
        prefixes = {
            "enthusiastic": "",
            "warm": "",
            "encouraging": "别急，让我帮你一步步排查",
            "simplified": "让我用最简单的话解释",
            "brief": "长话短说",
            "explanatory": "让我详细解释一下",
            "balanced": "",
            "direct": "直接说重点",
        }
        return prefixes.get(tone, "")

    def tone_postfix(self, tone: str, affect: dict) -> str:
        """回复后缀 (安抚、鼓励)"""
        postfixes = {
            "encouraging": "如果还有问题随时说，我们一起解决。",
            "simplified": "有不明白的地方继续问我。",
            "curious": "有疑问继续追问。",
        }
        if affect["type"] == "frustrated":
            return "别着急，思路理清后一步步来。"
        return postfixes.get(tone, "")

    def get_trend(self) -> str:
        """情绪趋势: 用户在变好/变坏?"""
        if len(self._sentiment_history) < 3:
            return "insufficient_data"
        recent = self._sentiment_history[-5:]
        pos_count = sum(1 for s in recent if s["polarity"] == "positive")
        neg_count = sum(1 for s in recent if s["polarity"] == "negative")
        if pos_count > neg_count + 2:
            return "improving"
        if neg_count > pos_count + 2:
            return "declining"
        return "stable"

    def stats(self) -> dict:
        if not self._sentiment_history:
            return {"calls": 0}
        polarities = [s["polarity"] for s in self._sentiment_history]
        types = [s["type"] for s in self._sentiment_history]
        return {
            "calls": len(self._sentiment_history),
            "polarity_dist": {p: polarities.count(p) for p in set(polarities)},
            "dominant_type": max(set(types), key=types.count),
            "trend": self.get_trend(),
        }
