"""
认知涌现引擎 — 自我反思引擎 v2.0
=============================
定期反思最近回复质量，生成改进建议并自动调整参数

v2.0 新增:
- AutoTuner: 参数历史追踪 + 自动校准
- 调节效果追踪: 记录每次调整后质量变化
- 自适应阈值: 基于历史数据自动学习最优阈值
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .knowledge_store import STORAGE_DIR

REFLECTION_FILE = STORAGE_DIR / "reflection_log.json"
TUNER_FILE = STORAGE_DIR / "auto_tuner.json"


@dataclass
class ReflectionEntry:
    timestamp: str
    round_number: int
    avg_composite: float
    tier_dist: dict
    insight: str
    action: str
    params_snapshot: dict = field(default_factory=dict)


@dataclass
class TuningRecord:
    timestamp: str
    param_name: str
    old_value: float
    new_value: float
    quality_change: float
    reason: str


class AutoTuner:
    """
    自动参数调节器 — 基于历史调整效果自主学习

    用法:
        tuner = AutoTuner()
        tuner.record_adjustment("quality_threshold", 0.70, 0.65, +0.05, "质量持续偏低")
        suggestion = tuner.suggest(["quality_threshold", "min_similarity"],
                                    avg_composite=0.62, tier_dist={"D": 3, "C": 4})
    """

    def __init__(self):
        self._params: dict[str, float] = {}
        self._history: list[TuningRecord] = []
        self._effectiveness: dict[str, list[float]] = {}
        self._load()

    def set_param(self, name: str, value: float):
        self._params[name] = value

    def get_param(self, name: str, default: float = 0.7) -> float:
        return self._params.get(name, default)

    def getAllParams(self) -> dict[str, float]:
        return dict(self._params)

    def record_adjustment(self, param_name: str, old_value: float,
                          new_value: float, quality_change: float, reason: str = ""):
        """记录一次参数调整及其效果"""
        record = TuningRecord(
            timestamp=datetime.now(timezone.utc).isoformat(),
            param_name=param_name,
            old_value=old_value,
            new_value=new_value,
            quality_change=quality_change,
            reason=reason,
        )
        self._history.append(record)

        if param_name not in self._effectiveness:
            self._effectiveness[param_name] = []
        self._effectiveness[param_name].append(quality_change)

        if len(self._history) > 100:
            self._history = self._history[-100]

        self._save()

    def suggest(self, param_names: list[str], avg_composite: float = 0.75,
                tier_dist: dict | None = None) -> dict[str, tuple[float, float, str]]:
        """
        建议参数调整
        返回: {param_name: (当前值, 建议值, 原因)}
        """
        suggestions: dict[str, tuple[float, float, str]] = {}

        if "quality_threshold" in param_names:
            current = self._params.get("quality_threshold", 0.70)
            if avg_composite < 0.65:
                new_val = max(0.45, current - 0.08)
                if abs(new_val - current) > 0.01:
                    suggestions["quality_threshold"] = (
                        current, new_val,
                        f"CEE均值{avg_composite:.2f}<0.65,降低阈值以便学习更多"
                    )
            elif avg_composite > 0.85:
                new_val = min(0.88, current + 0.05)
                if abs(new_val - current) > 0.01:
                    suggestions["quality_threshold"] = (
                        current, new_val,
                        f"CEE均值{avg_composite:.2f}>0.85,提高阈值保证质量"
                    )

        if "min_similarity" in param_names:
            current = self._params.get("min_similarity", 0.25)
            dc_count = (tier_dist or {}).get("D", 0) + (tier_dist or {}).get("C", 0)
            total = sum((tier_dist or {}).values()) if tier_dist else 1

            if dc_count / max(1, total) > 0.4:
                new_val = max(0.12, current - 0.08)
                if abs(new_val - current) > 0.01:
                    suggestions["min_similarity"] = (
                        current, new_val,
                        f"低质回复占比{dc_count/total:.0%},降低检索门槛"
                    )
            elif avg_composite > 0.82 and current < 0.35:
                new_val = min(0.40, current + 0.05)
                if abs(new_val - current) > 0.01:
                    suggestions["min_similarity"] = (
                        current, new_val,
                        "回复质量高，适当提高检索精确度"
                    )

        if "cache_ttl" in param_names:
            current = self._params.get("cache_ttl", 3600)
            if avg_composite < 0.68:
                new_val = max(600, int(current * 0.7))
                if abs(new_val - current) > 10:
                    suggestions["cache_ttl"] = (
                        current, new_val,
                        f"质量偏低,缩短缓存有效期以强制重新推理"
                    )

        for name in suggestions:
            eff_list = self._effectiveness.get(name, [])
            if eff_list and sum(1 for e in eff_list[-5:] if e < 0) > sum(1 for e in eff_list[-5:] if e >= 0):
                suggestions.pop(name, None)

        return suggestions

    def apply(self, suggestions: dict[str, tuple[float, float, str]]) -> dict[str, float]:
        """应用调整建议，返回实际更改"""
        changes = {}
        for name, (current, suggested, reason) in suggestions.items():
            self._params[name] = suggested
            changes[name] = suggested
        return changes

    def stats(self) -> dict:
        return {
            "params": dict(self._params),
            "history_len": len(self._history),
            "effectiveness": {
                k: {
                    "avg": round(sum(v) / len(v), 3) if v else 0,
                    "positive": sum(1 for x in v if x > 0),
                    "negative": sum(1 for x in v if x < 0),
                }
                for k, v in self._effectiveness.items()
            },
        }

    def _load(self):
        if TUNER_FILE.exists():
            try:
                with open(TUNER_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._params = data.get("params", {})
                for r in data.get("history", []):
                    self._history.append(TuningRecord(**r))
                self._effectiveness = data.get("effectiveness", {})
            except Exception:
                pass

    def _save(self):
        try:
            data = {
                "params": self._params,
                "history": [{
                    "timestamp": r.timestamp, "param_name": r.param_name,
                    "old_value": r.old_value, "new_value": r.new_value,
                    "quality_change": r.quality_change, "reason": r.reason,
                } for r in self._history[-50:]],
                "effectiveness": self._effectiveness,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(TUNER_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass


class ReflectionEngine:
    """
    自我反思引擎 v2.0

    用法:
        re = ReflectionEngine()
        re.push_reply({"cee_scores": {...}, "cee_tier": "B", ...})

        if re.should_reflect():
            insight, tunings = re.reflect()
            # insight: 质量分析文本
            # tunings: {param: (old, new, reason)} 待应用
    """

    def __init__(self, reflect_interval: int = 8):
        self._interval = reflect_interval
        self._reply_log: list[dict] = []
        self._reflections: list[ReflectionEntry] = []
        self._advice: str = ""
        self._param_adjustments: dict = {}
        self._tuner = AutoTuner()
        self._last_composite_avg: float = 0.75
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

    def reflect(self) -> tuple[str, dict]:
        """
        执行反思，返回 (质量分析, 参数调优建议)
        """
        if not self._reply_log:
            return "", {}

        recent = self._reply_log[-8:]
        composites = []
        tier_counts = {"S": 0, "A": 0, "B": 0, "C": 0, "D": 0}

        for r in recent:
            scores = r["cee_scores"]
            c = (scores.get("itc", 0) + scores.get("scs", 0) +
                 scores.get("iec", 0) + scores.get("pfft", 0)) / 4
            composites.append(c)
            tier_counts[r["cee_tier"]] = tier_counts.get(r["cee_tier"], 0) + 1

        avg = sum(composites) / len(composites)
        old_avg = self._last_composite_avg
        self._last_composite_avg = avg

        insight = self._generate_insight(avg, tier_counts, recent)
        action = self._generate_action(avg, tier_counts)

        tuner_suggestions = self._tuner.suggest(
            ["quality_threshold", "min_similarity", "cache_ttl"],
            avg_composite=avg, tier_dist=tier_counts,
        )

        quality_delta = avg - old_avg
        self._tuner.record_adjustment(
            param_name="composite_trend",
            old_value=old_avg,
            new_value=avg,
            quality_change=quality_delta,
            reason=f"周期反思 #{len(self._reflections) + 1}",
        )

        entry = ReflectionEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            round_number=len(self._reply_log),
            avg_composite=round(avg, 3),
            tier_dist=tier_counts,
            insight=insight,
            action=action,
            params_snapshot=self._tuner.getAllParams(),
        )
        self._reflections.append(entry)
        self._advice = insight

        self._save()
        return insight, tuner_suggestions

    def auto_tune(self) -> dict[str, float]:
        """
        自动调参: 基于最近反思直接应用参数调整
        返回被修改的参数及新值
        """
        if not self._reply_log:
            return {}

        recent = self._reply_log[-8:]
        composites = []
        tier_counts = {"S": 0, "A": 0, "B": 0, "C": 0, "D": 0}
        for r in recent:
            scores = r["cee_scores"]
            composites.append((scores.get("itc", 0) + scores.get("scs", 0) +
                               scores.get("iec", 0) + scores.get("pfft", 0)) / 4)
            tier_counts[r["cee_tier"]] = tier_counts.get(r["cee_tier"], 0) + 1
        avg = sum(composites) / len(composites) if composites else 0.75

        suggestions = self._tuner.suggest(
            ["quality_threshold", "min_similarity"],
            avg_composite=avg, tier_dist=tier_counts,
        )

        if suggestions:
            return self._tuner.apply(suggestions)
        return {}

    def get_tuner_params(self) -> dict[str, float]:
        return self._tuner.getAllParams()

    def _generate_insight(self, avg: float, tiers: dict, recent: list) -> str:
        parts = []

        if avg >= 0.85:
            parts.append("回复质量优秀，S/A级主导。")
        elif avg >= 0.75:
            parts.append("回复质量良好，B+级稳定。")
        elif avg >= 0.65:
            parts.append("回复质量中等偏下，需提升深度。")
        else:
            parts.append("回复质量偏低，必须优化策略。")

        sources = {}
        for r in recent:
            s = r.get("source", "?")
            sources[s] = sources.get(s, 0) + 1
        if sources:
            dominant = max(sources, key=sources.get)
            ratio = sources[dominant] / len(recent)
            if dominant == "fallback_rules" and ratio > 0.6:
                parts.append(f"过度依赖降级规则({ratio:.0%}),需扩大知识库。")

        avg_elapsed = sum(r.get("elapsed_s", 0) for r in recent) / len(recent)
        if avg_elapsed > 0.5:
            parts.append(f"平均耗时{avg_elapsed:.1f}s,偏慢。")

        return " ".join(parts)

    def _generate_action(self, avg: float, tiers: dict) -> str:
        dc = tiers.get("D", 0) + tiers.get("C", 0)
        if dc >= 4:
            return "降低quality_threshold+min_similarity,全力扩大知识库"
        if dc >= 2:
            return "启用T5反事实优化,T1-T6全引擎重评估"
        if avg < 0.68:
            return "降低检索阈值,增加知识库深度"
        if avg > 0.82:
            return "维持当前策略,仅微调质量门"
        return "维持当前策略"

    def get_advice(self) -> str:
        return self._advice

    def get_param_adjustments(self) -> dict:
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
                    "timestamp": r.timestamp, "round_number": r.round_number,
                    "avg_composite": r.avg_composite, "tier_dist": r.tier_dist,
                    "insight": r.insight, "action": r.action,
                    "params_snapshot": r.params_snapshot,
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
            "last_advice": self._advice[:120] if self._advice else "",
            "tuner": self._tuner.stats(),
        }
