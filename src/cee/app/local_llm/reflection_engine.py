"""
认知涌现引擎 — 自我反思引擎
=============================
定期反思最近回复质量，生成改进建议并自动调整参数

机制:
1. 每 N 轮对话后触发反思
2. 回顾最近回复的 CEE 分数趋势
3. 发现低质量模式 → 调整 quality_threshold
4. 生成改进建议文本注入未来回复
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .knowledge_store import STORAGE_DIR

REFLECTION_FILE = STORAGE_DIR / "reflection_log.json"


@dataclass
class ReflectionEntry:
    timestamp: str
    round_number: int
    avg_composite: float
    tier_dist: dict
    insight: str
    action: str


class ReflectionEngine:
    """
    自我反思引擎

    用法:
        re = ReflectionEngine()
        re.push_reply({"cee_scores": {...}, "cee_tier": "B", ...})

        if re.should_reflect():
            insight = re.reflect()
            # -> "最近3轮CEE均值0.72, 偏低。建议..."
    """

    def __init__(self, reflect_interval: int = 8):
        self._interval = reflect_interval
        self._reply_log: list[dict] = []
        self._reflections: list[ReflectionEntry] = []
        self._advice: str = ""
        self._param_adjustments: dict = {}
        self._load()

    def push_reply(self, reply: dict):
        entry = {
            "cee_scores": reply.get("cee_scores", {}),
            "cee_tier": reply.get("cee_tier", "?"),
            "elapsed_s": reply.get("elapsed_s", 0),
            "source": reply.get("source", "?"),
            "ts": time.time(),
        }
        self._reply_log.append(entry)
        if len(self._reply_log) > 50:
            self._reply_log = self._reply_log[-50:]

    def should_reflect(self) -> bool:
        return len(self._reply_log) > 0 and len(self._reply_log) % self._interval == 0

    def reflect(self) -> str:
        if not self._reply_log:
            return ""

        recent = self._reply_log[-8:]
        composites = []
        tier_counts = {"S": 0, "A": 0, "B": 0, "C": 0, "D": 0}

        for r in recent:
            scores = r["cee_scores"]
            c = (scores.get("itc", 0) + scores.get("scs", 0) +
                 scores.get("iec", 0) + scores.get("pfft", 0)) / 4
            composites.append(c)
            tier_counts[r["cee_tier"]] = tier_counts.get(r["cee_tier"], 0) + 1

        avg = sum(composites) / len(composites) if composites else 0

        insight = self._generate_insight(avg, tier_counts, recent)
        action = self._generate_action(avg, tier_counts)

        entry = ReflectionEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            round_number=len(self._reply_log),
            avg_composite=round(avg, 3),
            tier_dist=tier_counts,
            insight=insight,
            action=action,
        )
        self._reflections.append(entry)
        self._advice = insight

        self._save()
        return insight

    def _generate_insight(self, avg: float, tiers: dict, recent: list) -> str:
        parts = []

        if avg >= 0.85:
            parts.append("最近回复质量优秀，保持在S/A级。")
        elif avg >= 0.75:
            parts.append("最近回复质量良好，稳定在B+级。")
        elif avg >= 0.65:
            parts.append("最近回复质量中等偏下，注意提升内容深度。")
        else:
            parts.append("最近回复质量偏低，需要优化推理策略。")

        # 引擎使用分布
        sources = {}
        for r in recent:
            s = r.get("source", "?")
            sources[s] = sources.get(s, 0) + 1
        if sources:
            dominant = max(sources, key=sources.get)
            parts.append(f"主要来源: {dominant}({sources[dominant]}/{len(recent)}轮)。")

        # 速度分析
        avg_elapsed = sum(r.get("elapsed_s", 0) for r in recent) / len(recent)
        if avg_elapsed > 0.5:
            parts.append(f"平均耗时 {avg_elapsed:.1f}s")

        return " ".join(parts)

    def _generate_action(self, avg: float, tiers: dict) -> str:
        dc = tiers.get("D", 0) + tiers.get("C", 0)
        if dc >= 3:
            return "增加知识库检索深度，提高min_similarity阈值"
        if avg < 0.7:
            return "启用T5反事实优化，增加引擎合成比例"
        return "维持当前策略"

    def get_advice(self) -> str:
        """获取当前改进建议，可供推理时注入"""
        return self._advice

    def get_param_adjustments(self) -> dict:
        """获取建议的参数调整值"""
        if not self._reply_log:
            return {}
        recent = self._reply_log[-8:]
        composites = []
        for r in recent:
            scores = r["cee_scores"]
            c = (scores.get("itc", 0) + scores.get("scs", 0) +
                 scores.get("iec", 0) + scores.get("pfft", 0)) / 4
            composites.append(c)
        avg = sum(composites) / len(composites) if composites else 0.75

        adj = {}
        if avg < 0.65:
            adj["quality_threshold"] = max(0.50, 0.68 - 0.05)
            adj["min_similarity"] = 0.15
        elif avg > 0.85:
            adj["quality_threshold"] = min(0.85, 0.68 + 0.05)
        return adj

    def _load(self):
        if REFLECTION_FILE.exists():
            try:
                with open(REFLECTION_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._reflections = [ReflectionEntry(**r) for r in data.get("entries", [])]
                self._advice = data.get("current_advice", "")
            except Exception:
                pass

    def _save(self):
        try:
            data = {
                "entries": [{
                    "timestamp": r.timestamp,
                    "round_number": r.round_number,
                    "avg_composite": r.avg_composite,
                    "tier_dist": r.tier_dist,
                    "insight": r.insight,
                    "action": r.action,
                } for r in self._reflections[-20:]],
                "current_advice": self._advice,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(REFLECTION_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def stats(self) -> dict:
        return {
            "reflections": len(self._reflections),
            "reply_log_size": len(self._reply_log),
            "last_advice": self._advice[:100] if self._advice else "",
        }
