"""
认知涌现引擎 — 元认知引擎
=========================
让系统"知道自己不知道什么" — 置信度校准、未知觉察、自适应策略

三个子系统:
1. 置信度估计器: 综合6维信号预测回复质量
   - 知识图谱密度: 该话题在KG中的节点数+边密度
   - 反馈历史: 该话题历史的like/dislike比例
   - 自学习事实: AutoLearner中该话题的事实置信度均值
   - CEE分数趋势: 最近N轮CEE分数的均值和方差
   - 问题复杂度: 查询字符数/专业术语密度
   - 缓存命中模式: 是否有匹配的已知问答对

2. 校准器: 对比预估置信度与实际反馈结果
   - 校准误差 = √Σ(预测-实际)^2/N
   - 自适应修正因子

3. 未知觉察: 识别知识盲区
   - "这个话题我知道什么?"
   - "这个话题我不知道什么?"
   - 输出探索建议

用法:
    mc = MetaCognition()
    conf = mc.estimate(query, kg_stats, learner_stats, feedback_hist, cee_scores)
    mc.calibrate(query, predicted_confidence, actual_rating)
    unknowns = mc.detect_unknown(query)
"""

from __future__ import annotations

import json
import math
from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .knowledge_store import STORAGE_DIR

META_FILE = STORAGE_DIR / "metacognition.json"

COMPLEXITY_MARKERS = [
    "架构", "设计模式", "分布式", "高并发", "数学", "证明", "底层",
    "编译", "内核", "量子", "密码", "NP", "复杂度", "黎曼",
]
SIMPLE_MARKERS = [
    "什么是", "怎么", "能做什么", "好不好", "行不行", "可以吗",
    "你好", "hi", "hello", "谢谢", "好的", "OK",
]

DOMAIN_KW = {
    "认知涌现": ["认知", "涌现", "混沌边缘", "自组织", "复杂系统"],
    "深度学习": ["神经网络", "反向传播", "梯度", "损失", "激活", "卷积", "RNN", "LSTM"],
    "编程语言": ["python", "javascript", "go", "rust", "typescript", "语法", "编译"],
    "软件工程": ["架构", "部署", "docker", "k8s", "CI", "测试", "重构", "设计模式"],
    "数学基础": ["线性代数", "概率", "微积分", "优化", "信息论"],
    "哲学逻辑": ["认知论", "本体", "逻辑", "辩证法", "现象学", "分析哲学"],
}


@dataclass
class CalibrationPoint:
    query: str
    predicted: float
    actual: float
    gap: float
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class MetaCognition:
    def __init__(self):
        self._history: deque[CalibrationPoint] = deque(maxlen=100)
        self._calibration_error: float = 0.0
        self._correction_factor: float = 1.0
        self._domain_knowledge: dict[str, dict[str, float]] = {}
        self._load()

    def estimate(self, query: str, kg_stats: dict | None = None,
                 learner_stats: dict | None = None,
                 feedback_score: float = 0.0,
                 cee_composite: float = 0.5,
                 memory_hits: int = 0) -> float:
        signals = []

        kg_signal = self._kg_density(query, kg_stats)
        signals.append(("kg_density", kg_signal, 0.2))

        learner_signal = self._learner_coverage(query, learner_stats)
        signals.append(("learner_coverage", learner_signal, 0.2))

        feedback_signal = min(1.0, 0.5 + feedback_score * 0.5)
        signals.append(("feedback", feedback_signal, 0.15))

        cee_signal = cee_composite
        signals.append(("cee", cee_signal, 0.15))

        complexity = self._complexity(query)
        complexity_signal = max(0.2, min(1.0, 1.0 - complexity * 0.3))
        signals.append(("complexity", complexity_signal, 0.15))

        if memory_hits > 0:
            hit_signal = min(1.0, 0.6 + memory_hits * 0.15)
        else:
            hit_signal = 0.4
        signals.append(("memory_hit", hit_signal, 0.15))

        raw = sum(s * w for _, s, w in signals) / sum(w for _, _, w in signals)
        adjusted = raw * self._correction_factor
        return round(max(0.1, min(1.0, adjusted)), 3)

    def calibrate(self, query: str, predicted: float, actual_rating: str):
        if actual_rating == "like":
            actual = 0.85
        elif actual_rating == "dislike":
            actual = 0.25
        else:
            actual = 0.5

        gap = predicted - actual
        self._history.append(CalibrationPoint(query=query, predicted=predicted,
                                               actual=actual, gap=gap))

        if len(self._history) >= 5:
            mse = sum(p.gap ** 2 for p in self._history) / len(self._history)
            self._calibration_error = round(math.sqrt(mse), 3)

            errors = [p.gap for p in self._history]
            avg_error = sum(errors) / len(errors)
            self._correction_factor = max(0.3, min(2.0, 1.0 - avg_error * 0.8))

        self._save()

    def detect_unknown(self, query: str) -> dict:
        results: dict[str, list[str]] = {"known": [], "unknown": [], "gap": []}
        ql = query.lower()

        for domain, keywords in DOMAIN_KW.items():
            hits = sum(1 for kw in keywords if kw.lower() in ql)
            if hits == 0:
                continue
            dk = self._domain_knowledge.get(domain, {})
            coverage = dk.get("coverage", 0.0)
            depth = dk.get("depth", 0.0)

            if coverage > 0.6 and depth > 0.5:
                results["known"].append(domain)
            elif coverage < 0.3 or depth < 0.2:
                results["unknown"].append(domain)
            else:
                results["gap"].append(domain)

        return results

    def get_adaptive_strategy(self, confidence: float,
                               unknowns: dict | None = None) -> str:
        if confidence >= 0.8:
            base = "高置信度 — 直接输出详细解答，主动关联周边知识"
        elif confidence >= 0.55:
            base = "中置信度 — 提供回答并附带'准确度有限'提示"
        elif confidence >= 0.3:
            base = "低置信度 — 使用保守模板，建议用户自行验证"
        else:
            base = "极低置信度 — 坦诚表示不了解，推荐外部资源方向"

        if unknowns and unknowns.get("unknown"):
            domains = "、".join(unknowns["unknown"][:3])
            base += f"；已知盲区: {domains}"

        return base

    def record_domain_coverage(self, domain: str, covered_terms: int,
                                total_terms: int, depth_estimate: float):
        coverage = covered_terms / max(1, total_terms)
        if domain not in self._domain_knowledge:
            self._domain_knowledge[domain] = {"coverage": 0.0, "depth": 0.0, "updates": 0}
        dk = self._domain_knowledge[domain]
        alpha = 0.3
        dk["coverage"] = dk["coverage"] * (1 - alpha) + coverage * alpha
        dk["depth"] = dk["depth"] * (1 - alpha) + depth_estimate * alpha
        dk["updates"] += 1
        self._save()

    def _kg_density(self, query: str, kg_stats: dict | None) -> float:
        if not kg_stats:
            return 0.3
        nodes = kg_stats.get("nodes", 0)
        edges = kg_stats.get("edges", 0)
        if nodes == 0:
            return 0.2
        density = edges / max(1, nodes * (nodes - 1) / 2)
        return max(0.1, min(1.0, density * 2.5))

    def _learner_coverage(self, query: str, learner_stats: dict | None) -> float:
        if not learner_stats:
            return 0.2
        total = learner_stats.get("total_facts", 0)
        avg_conf = learner_stats.get("avg_confidence", 0.0)
        return max(0.1, min(1.0, 0.3 * (total / 50) + 0.7 * avg_conf))

    def _complexity(self, query: str) -> float:
        ql = query.lower()
        score = len(query) / 200.0
        for m in COMPLEXITY_MARKERS:
            if m.lower() in ql:
                score += 0.15
        for m in SIMPLE_MARKERS:
            if m.lower() in ql:
                score -= 0.1
        return max(0.0, min(1.0, score))

    def stats(self) -> dict:
        return {
            "calibration_error": self._calibration_error,
            "correction_factor": round(self._correction_factor, 3),
            "history_size": len(self._history),
            "domains_tracked": len(self._domain_knowledge),
            "domain_coverage": {k: round(v["coverage"], 2)
                                for k, v in self._domain_knowledge.items()},
        }

    def _load(self):
        if META_FILE.exists():
            try:
                with open(META_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for p in data.get("history", []):
                    self._history.append(CalibrationPoint(**p))
                self._calibration_error = data.get("calibration_error", 0.0)
                self._correction_factor = data.get("correction_factor", 1.0)
                self._domain_knowledge = data.get("domain_knowledge", {})
            except Exception:
                pass

    def _save(self):
        try:
            data = {
                "history": [{"query": p.query, "predicted": p.predicted,
                             "actual": p.actual, "gap": p.gap, "ts": p.ts}
                            for p in list(self._history)[-50:]],
                "calibration_error": self._calibration_error,
                "correction_factor": self._correction_factor,
                "domain_knowledge": self._domain_knowledge,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(META_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
