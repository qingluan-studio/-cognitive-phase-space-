"""
认知涌现引擎 — 情感状态字典
============================
6 种核心情感 × 3 级强度 (低/中/高)

与已有 AffectEngine 集成:
- 扩展 AffectEngine.EMOTION_PROFILES 加入强度分级
- 加入情感转移权重 (emotion transition tracking)
- 关键词+否定词+句式模式三重匹配

情感: 好奇/困惑/沮丧/兴奋/疲惫/中性
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .character_dict import DictEntry, DICT_DIR

EMOTION_DICT_FILE = DICT_DIR / "emotion_dict.json"


EMOTION_CATEGORIES = {
    "curious": "好奇",
    "confused": "困惑",
    "frustrated": "沮丧",
    "excited": "兴奋",
    "tired": "疲惫",
    "neutral": "中性",
}


EMOTION_PROFILES: dict[str, dict] = {
    "curious": {
        "name": "好奇",
        "name_cn": "好奇",
        "intensity_levels": {
            "low": {
                "intensity": 0.3,
                "keywords": ["想知道", "了解", "看看", "查查"],
                "tone_templates": [
                    "关于{keyword}, 我可以简单说一下",
                    "这个问题的基础在于{keyword}",
                ],
            },
            "medium": {
                "intensity": 0.6,
                "keywords": ["为什么", "怎么", "如何", "原理", "机制", "原因", "什么是"],
                "tone_templates": [
                    "这个问题可以从{num}个维度来看",
                    "让我为你层层拆解这个话题",
                    "核心在于理解{keyword}的本质",
                ],
            },
            "high": {
                "intensity": 0.9,
                "keywords": ["深度分析", "详细解释", "底层", "深入", "源码", "本质"],
                "tone_templates": [
                    "这涉及到{keyword}的深层原理,让我从底层开始说明",
                    "要完整回答这个问题,需要先理解{keyword}的架构",
                ],
            },
        },
        "transition_weights": {"confused": 0.3, "excited": 0.2, "neutral": 0.5},
    },
    "confused": {
        "name": "困惑",
        "name_cn": "困惑",
        "intensity_levels": {
            "low": {
                "intensity": 0.3,
                "keywords": ["不太懂", "有点迷", "想不通"],
                "tone_templates": [
                    "可能是我没说清楚,让我换个角度解释",
                    "这部分确实不太直观,我重新梳理一下",
                ],
            },
            "medium": {
                "intensity": 0.6,
                "keywords": ["不懂", "不理解", "不明白", "搞不懂", "混乱", "迷惑"],
                "tone_templates": [
                    "我理解你的困惑,这个概念确实容易混淆",
                    "让我用更简单的例子来说明,先放下{keyword},看这个",
                ],
            },
            "high": {
                "intensity": 0.9,
                "keywords": ["完全不懂", "一头雾水", "彻底混乱", "头晕"],
                "tone_templates": [
                    "没关系,我们从头开始,{keyword}本质上就是...",
                    "我很抱歉解释得太复杂了,让我用最基础的方式重新讲",
                ],
            },
        },
        "transition_weights": {"curious": 0.4, "frustrated": 0.3, "neutral": 0.3},
    },
    "frustrated": {
        "name": "沮丧",
        "name_cn": "沮丧",
        "intensity_levels": {
            "low": {
                "intensity": 0.3,
                "keywords": ["还是不行", "怎么都", "又出问题"],
                "tone_templates": [
                    "这个错误很常见,我们可以逐步排查",
                    "别担心,这类问题通常有固定的解决步骤",
                ],
            },
            "medium": {
                "intensity": 0.6,
                "keywords": ["试了好多次", "一直报错", "老是", "反复", "无效"],
                "tone_templates": [
                    "你已经试了很多次了,我们换一个完全不同的思路",
                    "这种情况我也遇到过,问题往往出在{keyword}的配置上",
                ],
            },
            "high": {
                "intensity": 0.9,
                "keywords": ["崩溃了", "受不了", "烦死了", "气死", "放弃", "算了"],
                "tone_templates": [
                    "我非常理解你的感受,这个问题确实折磨人",
                    "不如先休息一下,回来我们再从另一个角度彻底解决它",
                ],
            },
        },
        "transition_weights": {"confused": 0.2, "tired": 0.4, "neutral": 0.4},
    },
    "excited": {
        "name": "兴奋",
        "name_cn": "兴奋",
        "intensity_levels": {
            "low": {
                "intensity": 0.3,
                "keywords": ["不错", "有意思", "有趣"],
                "tone_templates": [
                    "很高兴你感兴趣,{keyword}确实是个有趣的话题",
                    "这个方向很有意思,我们可以继续深入",
                ],
            },
            "medium": {
                "intensity": 0.6,
                "keywords": ["太好了", "牛", "厉害", "酷", "完美", "wow"],
                "tone_templates": [
                    "太好了,你对{keyword}的热情让我也很振奋",
                    "既然你这么有兴趣,我再补充几个高级用法",
                ],
            },
            "high": {
                "intensity": 0.9,
                "keywords": ["太强了", "amazing", "太棒了", "无敌", "excellent", "太厉害了"],
                "tone_templates": [
                    "你的热情太有感染力了,{keyword}确实值得深入研究",
                    "既然你兴致这么高,我来分享一些更前沿的内容",
                ],
            },
        },
        "transition_weights": {"curious": 0.5, "neutral": 0.5},
    },
    "tired": {
        "name": "疲惫",
        "name_cn": "疲惫",
        "intensity_levels": {
            "low": {
                "intensity": 0.3,
                "keywords": ["累了", "不想", "烦躁"],
                "tone_templates": [
                    "这个问题不复杂,我长话短说",
                    "我们快速过一下核心要点",
                ],
            },
            "medium": {
                "intensity": 0.6,
                "keywords": ["好累", "不想动", "疲惫", "困"],
                "tone_templates": [
                    "明白,我会尽量简洁地说明",
                    "这个问题我可以先给结论,详细的部分之后再看",
                ],
            },
            "high": {
                "intensity": 0.9,
                "keywords": ["非常累", "精疲力竭", "exhausted", "撑不住"],
                "tone_templates": [
                    "看得出来你很累了,我给你最核心的答案,不啰嗦",
                    "这个问题的关键就一句话:{keyword},其他细节可以等精神好了再看",
                ],
            },
        },
        "transition_weights": {"frustrated": 0.2, "neutral": 0.8},
    },
    "neutral": {
        "name": "中性",
        "name_cn": "中性",
        "intensity_levels": {
            "medium": {
                "intensity": 0.5,
                "keywords": [],
                "tone_templates": [
                    "关于{keyword},以下是我的分析",
                    "理解你的问题,这里有几点值得注意",
                ],
            },
        },
        "transition_weights": {"curious": 0.3, "excited": 0.1, "confused": 0.2,
                                "frustrated": 0.1, "tired": 0.1, "neutral": 0.2},
    },
}


NEGATION_WORDS = {"不", "没", "不是", "没有", "别", "無"}


class EmotionDictionary:
    """
    情感状态字典

    与已有 AffectEngine 集成:
    - AffectEngine 处理极性/紧迫度
    - EmotionDictionary 处理6种情感 + 强度 + 转移 + 语气模板

    用法:
        ed = EmotionDictionary()
        ed.load()
        result = ed.detect("为什么一直报错, 试了好多次都不行")
        templates = ed.get_tone_templates("frustrated", "medium")
    """

    def __init__(self):
        self._profiles: dict[str, dict] = {}
        self._loaded = False
        self._transition_history: list[tuple[str, float]] = []

    def load(self) -> None:
        if self._loaded:
            return
        if EMOTION_DICT_FILE.exists():
            self._load_from_file()
        else:
            self._profiles = {k: dict(v) for k, v in EMOTION_PROFILES.items()}
            self._save()
        self._loaded = True

    def _load_from_file(self) -> None:
        with open(EMOTION_DICT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        self._profiles = data.get("profiles", {})

    def _save(self) -> None:
        EMOTION_DICT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(EMOTION_DICT_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "profiles": self._profiles,
                "version": "1.0.0",
            }, f, ensure_ascii=False, indent=2)

    def detect(self, text: str) -> dict:
        """检测情感类别和强度, 返回 {emotion, intensity, level}"""
        if not self._loaded:
            self.load()

        scores: dict[str, float] = {}
        for emo_key, profile in self._profiles.items():
            best_score = self._compute_emotion_score(text, profile)
            best_score += self._apply_transition_bonus(emo_key)
            scores[emo_key] = best_score

        top = max(scores, key=scores.get) if scores else "neutral"
        top_score = scores.get(top, 0)

        profile = self._profiles.get(top, {})
        levels = profile.get("intensity_levels", {})
        level = "medium"
        for lkey in ["high", "medium", "low"]:
            lvl = levels.get(lkey, {})
            threshold = lvl.get("intensity", 0.5)
            if top_score >= threshold * 0.8:
                level = lkey
                break

        import time
        self._transition_history.append((top, time.time()))
        if len(self._transition_history) > 50:
            self._transition_history = self._transition_history[-50:]

        return {
            "emotion": top,
            "emotion_cn": EMOTION_CATEGORIES.get(top, "中性"),
            "intensity": top_score,
            "level": level,
        }

    def _compute_emotion_score(self, text: str, profile: dict) -> float:
        score = 0.0
        words = set(re.findall(r'[\u4e00-\u9fff\w]+', text))
        if not words:
            return 0.0

        for level_key in ["high", "medium", "low"]:
            lvl = profile.get("intensity_levels", {}).get(level_key, {})
            keywords = lvl.get("keywords", [])
            lvl_intensity = lvl.get("intensity", 0.5)
            hits = sum(2.0 for kw in keywords if kw in text)
            if hits > 0:
                has_neg = any(nw in words for nw in NEGATION_WORDS)
                if not has_neg:
                    score += hits * lvl_intensity

        return min(score, 1.0)

    def _apply_transition_bonus(self, emo_key: str) -> float:
        if not self._transition_history:
            return 0.0
        last_emo, _ = self._transition_history[-1]
        if last_emo == emo_key:
            return 0.05
        profile = self._profiles.get(last_emo, {})
        trans = profile.get("transition_weights", {})
        return trans.get(emo_key, 0.0) * 0.1

    def get_tone_templates(self, emotion: str, level: str = "medium") -> list[str]:
        if not self._loaded:
            self.load()
        profile = self._profiles.get(emotion, self._profiles.get("neutral", {}))
        levels = profile.get("intensity_levels", {})
        lvl = levels.get(level, levels.get("medium", {}))
        return lvl.get("tone_templates", [
            "关于{keyword},以下是我的分析",
        ])

    def get_emotion_info(self, emotion: str) -> dict:
        if not self._loaded:
            self.load()
        return dict(self._profiles.get(emotion, self._profiles.get("neutral", {})))

    @property
    def emotions(self) -> list[str]:
        return list(EMOTION_CATEGORIES.keys())

    def stats(self) -> dict:
        if not self._loaded:
            self.load()
        return {
            "total_emotions": len(self._profiles),
            "emotions": list(EMOTION_CATEGORIES.values()),
            "transition_history": len(self._transition_history),
        }
