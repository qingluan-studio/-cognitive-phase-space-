"""
情感分析引擎。

提供基于词典+规则的文本情感分析能力，包括情感极性检测、
细粒度情感分类、情感强度评分、方面级情感分析等功能。
"""

import re
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Optional

import numpy as np


class SentimentPolarity(Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    MIXED = "mixed"


class FineGrainedEmotion(Enum):
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    DISGUST = "disgust"
    ANTICIPATION = "anticipation"
    TRUST = "trust"


@dataclass
class AspectSentiment:
    aspect: str = ""
    sentiment: SentimentPolarity = SentimentPolarity.NEUTRAL
    intensity: float = 0.0
    keywords: list[str] = field(default_factory=list)
    confidence: float = 0.0


@dataclass
class SentimentResult:
    text: str = ""
    polarity: SentimentPolarity = SentimentPolarity.NEUTRAL
    intensity: float = 0.0
    confidence: float = 0.0
    emotions: dict[str, float] = field(default_factory=dict)
    aspects: list[AspectSentiment] = field(default_factory=list)
    positive_score: float = 0.0
    negative_score: float = 0.0
    neutral_score: float = 0.0
    dominant_emotion: str = "neutral"
    word_count: int = 0


@dataclass
class SentimentTrend:
    timestamps: list[str] = field(default_factory=list)
    polarity_scores: list[float] = field(default_factory=list)
    intensity_scores: list[float] = field(default_factory=list)
    trend_direction: str = "stable"
    volatility: float = 0.0


class SentimentAnalyzer:
    """基于词典+规则的文本情感分析引擎。"""

    _positive_words = {
        "好", "优秀", "出色", "棒", "赞", "喜欢", "爱", "开心",
        "快乐", "幸福", "满意", "完美", "精彩", "厉害", "强大",
        "美丽", "漂亮", "帅", "聪明", "智慧", "勇敢", "善良",
        "温暖", "舒适", "方便", "高效", "专业", "可靠", "稳定",
        "创新", "突破", "进步", "成功", "胜利", "希望", "光明",
        "积极", "乐观", "幽默", "有趣", "惊喜", "感动", "感谢",
        "感恩", "祝福", "美好", "完美", "卓越", "杰出", "顶尖",
        "优质", "实惠", "划算", "超值", "实惠", "便宜", "好用",
        "方便", "快捷", "迅速", "及时", "准确", "清晰", "简洁",
        "强大", "灵活", "丰富", "全面", "周到", "贴心", "细致",
        "great", "good", "excellent", "wonderful", "amazing",
        "fantastic", "beautiful", "love", "happy", "joy",
        "awesome", "perfect", "brilliant", "outstanding",
        "nice", "superb", "splendid", "delightful", "pleasant",
    }

    _negative_words = {
        "差", "坏", "糟糕", "烂", "讨厌", "恨", "烦", "生气",
        "愤怒", "悲伤", "难过", "失望", "沮丧", "后悔", "焦虑",
        "担心", "害怕", "恐惧", "紧张", "恶心", "厌恶", "无聊",
        "愚蠢", "笨", "懒", "弱", "丑", "脏", "乱", "吵",
        "贵", "浪费", "麻烦", "困难", "复杂", "混乱", "不稳定",
        "失败", "错误", "问题", "故障", "崩溃", "危险", "风险",
        "损失", "伤害", "痛苦", "折磨", "累", "困", "饿", "渴",
        "bad", "terrible", "awful", "horrible", "hate",
        "sad", "angry", "upset", "disappointed", "poor",
        "worst", "ugly", "broken", "useless", "boring",
        "frustrating", "annoying", "painful", "horrible",
    }

    _intensifiers = {
        "很": 1.5, "非常": 2.0, "特别": 1.8, "极其": 2.5,
        "太": 1.5, "超级": 2.0, "最": 1.8, "十分": 1.7,
        "异常": 2.0, "格外": 1.6, "相当": 1.3, "挺": 1.2,
        "有点": 0.7, "稍微": 0.5, "略微": 0.5, "不太": 0.6,
        "very": 1.5, "extremely": 2.0, "really": 1.5,
        "so": 1.5, "quite": 1.2, "rather": 1.2,
        "slightly": 0.7, "a bit": 0.7, "somewhat": 0.7,
        "absolutely": 2.0, "totally": 2.0, "highly": 1.8,
    }

    _negators = {
        "不": -1, "没": -1, "无": -1, "非": -1,
        "未": -1, "别": -1, "莫": -1, "勿": -1,
        "not": -1, "no": -1, "never": -1, "neither": -1,
        "nor": -1, "nothing": -1, "nowhere": -1,
        "hardly": -0.5, "barely": -0.5, "scarcely": -0.5,
    }

    _emotion_keywords = {
        FineGrainedEmotion.JOY: {
            "开心", "快乐", "高兴", "喜悦", "兴奋", "愉快",
            "欢喜", "满足", "幸福", "兴高采烈", "欢快", "雀跃",
            "happy", "joy", "delight", "cheerful", "elated",
        },
        FineGrainedEmotion.SADNESS: {
            "悲伤", "难过", "伤心", "痛苦", "难过", "忧愁",
            "沮丧", "失落", "消沉", "哀伤", "凄凉", "忧郁",
            "sad", "sorrow", "grief", "depressed", "unhappy",
        },
        FineGrainedEmotion.ANGER: {
            "愤怒", "生气", "恼怒", "气愤", "暴怒", "恼火",
            "发怒", "暴躁", "狂怒", "愤慨", "怒气", "火大",
            "angry", "furious", "rage", "irritated", "mad",
        },
        FineGrainedEmotion.FEAR: {
            "害怕", "恐惧", "恐惧", "恐慌", "惊恐", "畏惧",
            "担忧", "焦虑", "不安", "紧张", "胆怯", "战栗",
            "fear", "scared", "afraid", "terrified", "anxious",
        },
        FineGrainedEmotion.SURPRISE: {
            "惊讶", "惊奇", "吃惊", "意外", "震惊", "惊异",
            "诧异", "愕然", "惊喜", "惊叹", "出乎意料",
            "surprise", "amazed", "astonished", "shocked", "stunned",
        },
        FineGrainedEmotion.DISGUST: {
            "厌恶", "恶心", "讨厌", "反感", "憎恶", "嫌弃",
            "厌烦", "憎恨", "鄙视", "不屑", "轻蔑", "鄙夷",
            "disgust", "disgusted", "revolting", "repulsive", "nauseating",
        },
        FineGrainedEmotion.ANTICIPATION: {
            "期待", "盼望", "期望", "憧憬", "希望", "期盼",
            "向往", "渴望", "等待", "翘首", "预想",
            "anticipation", "expect", "hope", "looking forward",
        },
        FineGrainedEmotion.TRUST: {
            "信任", "相信", "信赖", "可靠", "诚信", "忠诚",
            "信心", "依赖", "托付", "确信", "坚信",
            "trust", "believe", "reliable", "confident", "faith",
        },
    }

    _aspect_keywords = {
        "价格": ["价格", "价钱", "费用", "成本", "收费", "贵", "便宜", "划算", "price", "cost", "cheap", "expensive"],
        "质量": ["质量", "品质", "做工", "材质", "精细", "粗糙", "quality", "build", "material"],
        "服务": ["服务", "态度", "接待", "响应", "售后", "客服", "service", "support", "staff"],
        "速度": ["速度", "快速", "缓慢", "效率", "延迟", "speed", "fast", "slow", "performance"],
        "设计": ["设计", "外观", "造型", "风格", "美学", "颜值", "design", "style", "look", "appearance"],
        "功能": ["功能", "特性", "能力", "用途", "实用性", "feature", "function", "capability"],
        "体验": ["体验", "感受", "使用感", "易用性", "舒适", "experience", "usability", "feel"],
        "安全": ["安全", "保护", "隐私", "风险", "security", "safety", "protection", "privacy"],
        "稳定性": ["稳定性", "可靠", "稳定", "崩溃", "卡顿", "stability", "reliable", "crash"],
        "文档": ["文档", "教程", "说明", "手册", "指南", "documentation", "guide", "tutorial", "manual"],
    }

    def __init__(self, sensitivity: float = 0.5):
        self.sensitivity = sensitivity
        self._custom_positive: set[str] = set()
        self._custom_negative: set[str] = set()

    def analyze(self, text: str) -> SentimentResult:
        if not text.strip():
            return SentimentResult(text=text)

        tokens = self._tokenize(text)
        word_count = len(tokens)
        if word_count == 0:
            return SentimentResult(text=text)

        positive_count = 0
        negative_count = 0
        intensity_sum = 0.0
        negator_active = False
        emotion_scores: dict[FineGrainedEmotion, float] = defaultdict(float)

        all_positive = self._positive_words | self._custom_positive
        all_negative = self._negative_words | self._custom_negative

        for i, token in enumerate(tokens):
            if token in self._negators:
                negator_active = True
                continue

            intensifier = self._intensifiers.get(token, 1.0)

            if token in all_positive:
                weight = intensifier
                if negator_active:
                    negative_count += weight
                    negator_active = False
                else:
                    positive_count += weight
                intensity_sum += abs(weight)
            elif token in all_negative:
                weight = intensifier
                if negator_active:
                    positive_count += weight
                    negator_active = False
                else:
                    negative_count += weight
                intensity_sum += abs(weight)
            else:
                negator_active = False

        for emotion, keywords in self._emotion_keywords.items():
            score = 0.0
            for token in tokens:
                if token in keywords:
                    score += 1.0
            emotion_scores[emotion] = score / max(1, word_count)

        total = positive_count + negative_count
        if total == 0:
            polarity = SentimentPolarity.NEUTRAL
            intensity = 0.0
        else:
            net = (positive_count - negative_count) / total
            if net > self.sensitivity:
                polarity = SentimentPolarity.POSITIVE
            elif net < -self.sensitivity:
                polarity = SentimentPolarity.NEGATIVE
            elif net != 0:
                polarity = SentimentPolarity.MIXED
            else:
                polarity = SentimentPolarity.NEUTRAL
            intensity = min(1.0, intensity_sum / word_count)

        if total > 0:
            pos_score = positive_count / total
            neg_score = negative_count / total
            neu_score = 1.0 - pos_score - neg_score
        else:
            pos_score = 0.0
            neg_score = 0.0
            neu_score = 1.0

        dominant = max(emotion_scores, key=emotion_scores.get)
        dom_score = emotion_scores.get(dominant, 0.0)
        if dom_score < 0.05:
            dominant_emotion = "neutral"
        else:
            dominant_emotion = dominant.value

        confidence = min(1.0, total / max(1, word_count * 0.3))

        aspects = self._extract_aspects(text, tokens)

        emotion_dict = {e.value: round(s, 4) for e, s in emotion_scores.items()}

        return SentimentResult(
            text=text,
            polarity=polarity,
            intensity=round(intensity, 4),
            confidence=round(confidence, 4),
            emotions=emotion_dict,
            aspects=aspects,
            positive_score=round(pos_score, 4),
            negative_score=round(neg_score, 4),
            neutral_score=round(neu_score, 4),
            dominant_emotion=dominant_emotion,
            word_count=word_count,
        )

    def _tokenize(self, text: str) -> list[str]:
        tokens = []
        for match in re.finditer(r"[\u4e00-\u9fff]+|[a-zA-Z]+|\d+", text.lower()):
            tokens.append(match.group())
        return tokens

    def _extract_aspects(self, text: str, tokens: list[str]) -> list[AspectSentiment]:
        aspects = []
        text_lower = text.lower()

        for aspect_name, keywords in self._aspect_keywords.items():
            matched_keywords = []
            for kw in keywords:
                if kw in text_lower or kw in tokens:
                    matched_keywords.append(kw)

            if matched_keywords:
                aspect_text = text
                idx = min(
                    (text_lower.find(kw) for kw in matched_keywords if kw in text_lower),
                    default=0,
                )

                context_start = max(0, idx - 20)
                context_end = min(len(text), idx + 40)
                context = text[context_start:context_end]

                aspect_sentiment = self._classify_aspect_sentiment(aspect_name, context, tokens)
                aspects.append(AspectSentiment(
                    aspect=aspect_name,
                    sentiment=aspect_sentiment["polarity"],
                    intensity=aspect_sentiment["intensity"],
                    keywords=matched_keywords[:5],
                    confidence=aspect_sentiment["confidence"],
                ))

        return aspects

    def _classify_aspect_sentiment(self, aspect: str, context: str,
                                   tokens: list[str]) -> dict:
        pos_count = 0
        neg_count = 0

        all_positive = self._positive_words | self._custom_positive
        all_negative = self._negative_words | self._custom_negative

        for token in tokens:
            if token in all_positive:
                pos_count += 1
            elif token in all_negative:
                neg_count += 1

        total = pos_count + neg_count
        if total == 0:
            polarity = SentimentPolarity.NEUTRAL
            intensity = 0.0
        else:
            net = (pos_count - neg_count) / total
            if net > 0.1:
                polarity = SentimentPolarity.POSITIVE
            elif net < -0.1:
                polarity = SentimentPolarity.NEGATIVE
            else:
                polarity = SentimentPolarity.NEUTRAL
            intensity = min(1.0, total / max(1, len(tokens)))

        return {
            "polarity": polarity,
            "intensity": round(intensity, 4),
            "confidence": min(1.0, total / max(1, len(tokens) * 0.3)),
        }

    def analyze_batch(self, texts: list[str]) -> list[SentimentResult]:
        return [self.analyze(t) for t in texts]

    def analyze_trend(self, texts: list[str],
                      timestamps: list[str] | None = None) -> SentimentTrend:
        results = self.analyze_batch(texts)

        polarity_scores = []
        intensity_scores = []
        for r in results:
            if r.polarity == SentimentPolarity.POSITIVE:
                polarity_scores.append(r.intensity)
            elif r.polarity == SentimentPolarity.NEGATIVE:
                polarity_scores.append(-r.intensity)
            else:
                polarity_scores.append(0.0)
            intensity_scores.append(r.intensity)

        tss = timestamps or [str(i) for i in range(len(texts))]

        if len(polarity_scores) > 1:
            diffs = np.diff(polarity_scores)
            volatility = float(np.std(diffs)) if len(diffs) > 0 else 0.0
            trend_val = polarity_scores[-1] - polarity_scores[0]
            if trend_val > 0.1:
                direction = "upward"
            elif trend_val < -0.1:
                direction = "downward"
            else:
                direction = "stable"
        else:
            volatility = 0.0
            direction = "stable"

        return SentimentTrend(
            timestamps=tss,
            polarity_scores=polarity_scores,
            intensity_scores=intensity_scores,
            trend_direction=direction,
            volatility=round(volatility, 4),
        )

    def add_positive_words(self, words: set[str]):
        self._custom_positive.update(words)

    def add_negative_words(self, words: set[str]):
        self._custom_negative.update(words)

    def clear_custom_words(self):
        self._custom_positive.clear()
        self._custom_negative.clear()

    def get_emotion_labels(self) -> list[str]:
        return [e.value for e in FineGrainedEmotion]

    def get_aspect_labels(self) -> list[str]:
        return list(self._aspect_keywords.keys())

    def get_vocabulary_size(self) -> dict:
        return {
            "positive_words": len(self._positive_words) + len(self._custom_positive),
            "negative_words": len(self._negative_words) + len(self._custom_negative),
            "intensifiers": len(self._intensifiers),
            "negators": len(self._negators),
            "aspects": len(self._aspect_keywords),
            "emotions": sum(len(v) for v in self._emotion_keywords.values()),
        }
