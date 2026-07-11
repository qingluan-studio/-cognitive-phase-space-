"""
认知涌现引擎 — 对话相变检测器
=============================
将"认知相空间"概念落到实处 — 追踪对话在三个轴上的模式切换

三个检测轴:
1. 探索↔利用: 用户是在探索新领域还是深化已知知识
2. 发散↔收敛: 对话在扩展话题还是聚焦核心问题
3. 感性↔理性: 情感驱动还是逻辑驱动

相变事件: 当任一轴跨越阈值(>0.6)时触发事件
- 探索→利用: "exploit" — 用户可能找到了感兴趣的方向
- 利用→探索: "diverge"  — 当前方向已穷尽，需要跳转
- 发散→收敛: "converge" — 从广泛搜索进入深度分析
- 感性→理性: "detach"  — 情绪消退，进入分析模式

用法:
    from cee.app.local_llm import PhaseTransition
    pt = PhaseTransition()
    pt.push("什么是深度学习")
    pt.push("它怎么训练")
    event = pt.detect_transition()  # -> {"type":"exploit","from":"探索","to":"利用"}
"""

from __future__ import annotations

import json
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum, auto
from pathlib import Path

from .knowledge_store import STORAGE_DIR

PHASE_FILE = STORAGE_DIR / "phase_transition.json"


class Phase(Enum):
    EXPLORE = auto()
    EXPLOIT = auto()
    DIVERGE = auto()
    CONVERGE = auto()
    EMOTIONAL = auto()
    RATIONAL = auto()
    NEUTRAL = auto()


EXPLORE_MARKERS = [
    "什么是", "怎么", "如何", "为什么", "能不能", "可以吗", "推荐", "哪个好",
    "怎么选", "有哪些", "怎样的", "新手", "入门", "试试", "大概", "可能",
    "what is", "how to", "why", "which", "recommend", "suggest",
    "explain", "difference", "compare", "alternative",
]
EXPLOIT_MARKERS = [
    "实现", "解决", "改了", "优化", "配置", "部署", "运行", "测试", "具体",
    "怎么做", "用什么", "步骤", "代码", "示例", "遇到", "报错", "bug",
    "性能", "调优", "参数", "设置", "安装",
]
DIVERGE_MARKERS = [
    "另外", "对了", "顺便", "换个", "跳转", "回到", "之前说到", "还有",
    "那", "说起来", "突然想到", "扩展一下", "发散一下",
]
CONVERGE_MARKERS = [
    "具体来说", "深入", "细说", "展开", "细节", "详细", "本质",
    "核心", "关键", "底层", "原理", "根源", "根本",
]
EMOTIONAL_MARKERS = [
    "烦", "累", "焦虑", "兴奋", "激动", "担心", "害怕", "绝望", "开心",
    "爽", "棒", "厉害", "气人", "无语", "崩溃", "感动", "讨厌",
]
RATIONAL_MARKERS = [
    "逻辑", "推理", "分析", "证明", "验证", "数据", "实验", "事实",
    "证据", "结论", "假设", "公式", "定理", "统计", "概率",
]

TOPIC_KW = {
    "认知科学": ["认知", "涌现", "思维", "意识", "记忆", "学习", "智能"],
    "AI与ML": ["深度学习", "大模型", "LLM", "transformer", "训练", "推理",
                "神经网络", "agent", "prompt", "embedding"],
    "编程": ["代码", "编程", "python", "javascript", "算法", "数据结构",
             "函数", "类", "接口", "api"],
    "工具": ["软件", "工具", "框架", "库", "推荐", "替代", "免费", "开源"],
    "哲学": ["哲学", "第一性", "原理", "本质", "本体", "认识", "伦理"],
    "日常闲聊": [],
}


@dataclass
class PhaseState:
    explore_exploit: float = 0.0
    diverge_converge: float = 0.0
    emotional_rational: float = 0.0

    def label(self) -> dict[str, str]:
        def _l(v, left, right, neutral):
            if v > 0.35:
                return right
            if v < -0.35:
                return left
            return neutral

        return {
            "ee": _l(self.explore_exploit, "探索", "利用", "中性"),
            "dc": _l(self.diverge_converge, "发散", "收敛", "中性"),
            "er": _l(self.emotional_rational, "感性", "理性", "中性"),
        }


class PhaseTransitionDetector:
    def __init__(self, window_size: int = 8, threshold: float = 0.55):
        self._window = deque(maxlen=window_size)
        self._threshold = threshold
        self._state = PhaseState()
        self._history: list[dict] = []
        self._event_count: int = 0
        self._load()

    def push(self, query: str, affect: dict | None = None) -> PhaseState:
        scores = self._score(query, affect)
        self._window.append(scores)

        decay = 0.85 ** len(self._window)
        self._state = PhaseState(
            explore_exploit=sum(s[0] for s in self._window) / max(1, len(self._window)) * decay,
            diverge_converge=sum(s[1] for s in self._window) / max(1, len(self._window)) * decay,
            emotional_rational=sum(s[2] for s in self._window) / max(1, len(self._window)) * decay,
        )
        self._save()
        return self._state

    def detect_transition(self) -> dict | None:
        if len(self._window) < 3:
            return None

        t = self._threshold
        s = self._state
        labels = s.label()
        events = []

        if s.explore_exploit > t and labels["ee"] == "利用":
            events.append({"type": "exploit", "from": "探索", "to": "利用",
                           "signal": "用户进入执行模式，可能已找到答案方向"})
        elif s.explore_exploit < -t and labels["ee"] == "探索":
            events.append({"type": "diverge", "from": "利用", "to": "探索",
                           "signal": "用户切换方向，可能需要引入新知识域"})

        if s.diverge_converge < -t and labels["dc"] == "收敛":
            events.append({"type": "converge", "from": "发散", "to": "收敛",
                           "signal": "聚焦核心问题，应提供深度分析"})
        elif s.diverge_converge > t and labels["dc"] == "发散":
            events.append({"type": "branch", "from": "收敛", "to": "发散",
                           "signal": "话题扩张中，可引导知识图谱关联"})

        if s.emotional_rational > t and labels["er"] == "理性":
            events.append({"type": "detach", "from": "感性", "to": "理性",
                           "signal": "情绪消退分析模式，可深入技术细节"})

        if events:
            self._event_count += len(events)
            self._history.append({
                "ts": datetime.now(timezone.utc).isoformat(),
                "events": events,
                "state": labels,
            })
            if len(self._history) > 200:
                self._history = self._history[-100:]
            return events[0] if len(events) == 1 else {"type": "multi", "events": events}

        return None

    def get_phase_strategy(self) -> str:
        labels = self._state.label()
        strategies = []
        if labels["ee"] == "探索":
            strategies.append("开放引导,提供多方向选择")
        elif labels["ee"] == "利用":
            strategies.append("精准解答,提供具体实现细节")
        if labels["dc"] == "收敛":
            strategies.append("深层分析,追溯第一性原理")
        elif labels["dc"] == "发散":
            strategies.append("知识关联,激活图谱周边节点")
        if labels["er"] == "感性":
            strategies.append("共情回馈,关注情绪而非内容")
        elif labels["er"] == "理性":
            strategies.append("逻辑推演,引用事实和数据")
        return "；".join(strategies) if strategies else "常规对话"

    def _score(self, query: str, affect: dict | None) -> tuple[float, float, float]:
        ql = query.lower()
        ee, dc, er = 0.0, 0.0, 0.0

        for m in EXPLORE_MARKERS:
            if m.lower() in ql:
                ee -= 0.12
        for m in EXPLOIT_MARKERS:
            if m.lower() in ql:
                ee += 0.12

        for m in DIVERGE_MARKERS:
            if m.lower() in ql:
                dc += 0.15
        for m in CONVERGE_MARKERS:
            if m.lower() in ql:
                dc -= 0.15

        for m in EMOTIONAL_MARKERS:
            if m.lower() in ql:
                er -= 0.18
        for m in RATIONAL_MARKERS:
            if m.lower() in ql:
                er += 0.18

        if affect:
            polarity_str = affect.get("polarity", "neutral")
            polarity = {"positive": 0.7, "negative": -0.7, "neutral": 0.0}.get(
                str(polarity_str).lower(), 0.0)
            er += polarity * 0.2

        ee = max(-1.0, min(1.0, ee))
        dc = max(-1.0, min(1.0, dc))
        er = max(-1.0, min(1.0, er))
        return (round(ee, 3), round(dc, 3), round(er, 3))

    def stats(self) -> dict:
        return {
            "window_size": len(self._window),
            "state": self._state.label(),
            "raw_scores": {
                "explore_exploit": self._state.explore_exploit,
                "diverge_converge": self._state.diverge_converge,
                "emotional_rational": self._state.emotional_rational,
            },
            "events_detected": self._event_count,
            "strategy": self.get_phase_strategy(),
        }

    def _load(self):
        if PHASE_FILE.exists():
            try:
                with open(PHASE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._history = data.get("history", [])[-50:]
                self._event_count = data.get("event_count", 0)
            except Exception:
                pass

    def _save(self):
        try:
            data = {
                "history": self._history[-50:],
                "event_count": self._event_count,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(PHASE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
