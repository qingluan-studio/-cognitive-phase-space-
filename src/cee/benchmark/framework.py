"""
CEE Benchmark — 认知涌现引擎基准测试框架

提供全面的认知能力基准评估:
  - 文本质量基准: T1-T9 全引擎评分基准
  - 推理能力基准: 逻辑推理/数学/因果推理
  - 创意评估基准: 新颖性/多样性/审美品质
  - 多智能体协调基准: 任务完成率/通信效率/共识达成
  - 鲁棒性基准: 对抗样本/分布外泛化/噪声容忍
  - 效率基准: 延迟/吞吐量/内存占用
"""

from __future__ import annotations

import json
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

import numpy as np

logger = logging.getLogger(__name__)


class BenchmarkCategory(Enum):
    TEXT_QUALITY = "text_quality"
    REASONING = "reasoning"
    CREATIVITY = "creativity"
    MULTI_AGENT = "multi_agent"
    ROBUSTNESS = "robustness"
    EFFICIENCY = "efficiency"
    ETHICS = "ethics"
    COMPREHENSIVE = "comprehensive"


class MetricDirection(Enum):
    HIGHER_BETTER = "higher_better"
    LOWER_BETTER = "lower_better"


@dataclass
class BenchmarkMetric:
    name: str
    value: float
    direction: MetricDirection = MetricDirection.HIGHER_BETTER
    unit: str = ""
    threshold_good: float = 0.7
    threshold_acceptable: float = 0.5

    @property
    def passed(self) -> bool:
        if self.direction == MetricDirection.HIGHER_BETTER:
            return self.value >= self.threshold_acceptable
        return self.value <= self.threshold_acceptable

    @property
    def grade(self) -> str:
        if self.direction == MetricDirection.HIGHER_BETTER:
            if self.value >= self.threshold_good:
                return "A"
            if self.value >= self.threshold_acceptable:
                return "B"
            return "C"
        else:
            if self.value <= self.threshold_good:
                return "A"
            if self.value <= self.threshold_acceptable:
                return "B"
            return "C"


@dataclass
class BenchmarkCase:
    id: str
    category: BenchmarkCategory
    name: str
    input_data: Any = None
    expected_output: Any = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class BenchmarkResult:
    id: str
    case: BenchmarkCase
    metrics: list[BenchmarkMetric]
    duration: float
    passed: bool = True
    error: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def score(self) -> float:
        if not self.metrics:
            return 0.0
        return float(np.mean([m.value for m in self.metrics]))


@dataclass
class BenchmarkReport:
    name: str = ""
    total_cases: int = 0
    passed_cases: int = 0
    failed_cases: int = 0
    average_score: float = 0.0
    total_duration: float = 0.0
    category_scores: dict[str, float] = field(default_factory=dict)
    metric_summaries: dict[str, dict[str, float]] = field(default_factory=dict)
    results: list[BenchmarkResult] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "total_cases": self.total_cases,
            "passed_cases": self.passed_cases,
            "failed_cases": self.failed_cases,
            "pass_rate": round(self.passed_cases / max(self.total_cases, 1), 4),
            "average_score": round(self.average_score, 4),
            "total_duration": round(self.total_duration, 4),
            "category_scores": {k: round(v, 4) for k, v in self.category_scores.items()},
            "metric_summaries": {
                k: {mk: round(mv, 4) for mk, mv in v.items()}
                for k, v in self.metric_summaries.items()
            },
            "recommendations": self.recommendations,
        }


_TEXT_QUALITY_PAIRS: list[tuple[str, str]] = [
    (
        "人工智能正在改变我们的生活方式。从智能手机到自动驾驶，AI技术已经深入到日常生活的方方面面。",
        "AI technology is transforming our daily lives, from smartphones to self-driving cars."
    ),
    (
        "By leveraging advanced machine learning algorithms, we can extract meaningful patterns from vast datasets.",
        "利用先进的机器学习算法，我们可以从海量数据中提取有意义的模式。"
    ),
    (
        "The development of artificial intelligence requires careful consideration of ethical implications.",
        "人工智能的发展需要审慎考虑伦理影响。"
    ),
]

_REASONING_PROBLEMS: list[dict[str, Any]] = [
    {
        "premise": "所有的猫都是哺乳动物。所有哺乳动物都是动物。小明有一只猫。",
        "question": "小明的猫是动物吗？",
        "answer": "是",
        "type": "deductive",
    },
    {
        "premise": "A比B高，B比C高，C和D一样高。",
        "question": "谁最高？",
        "answer": "A",
        "type": "transitive",
    },
    {
        "premise": "如果下雨，地面会湿。地面没有湿。",
        "question": "下雨了吗？",
        "answer": "没有",
        "type": "modus_tollens",
    },
    {
        "premise": "",
        "question": "如果一个气球价值5元，一根绳子价值2元，买3个气球和2根绳子需要多少钱？",
        "answer": "19元",
        "type": "arithmetic",
    },
    {
        "premise": "X的平方加X等于12",
        "question": "X是多少？（正解）",
        "answer": "3",
        "type": "algebra",
    },
]

_CREATIVITY_PROMPTS: list[str] = [
    "用一个新颖的比喻描述时间",
    "设计一种未来交通工具的创意概念",
    "想象人类与AI协作的新方式",
    "用一个神话故事解释量子力学的基本原理",
]


class TextQualityBenchmark:
    """文本质量基准 — 基于 T1-T9 引擎综合评分"""

    def __init__(self):
        self._cases = self._build_cases()

    @staticmethod
    def _build_cases() -> list[BenchmarkCase]:
        cases = []
        for i, (text_cn, text_en) in enumerate(_TEXT_QUALITY_PAIRS):
            cases.append(BenchmarkCase(
                id=f"tq_{i:03d}_cn",
                category=BenchmarkCategory.TEXT_QUALITY,
                name=f"中文文本质量 #{i+1}",
                input_data={"text": text_cn, "lang": "zh"},
                metadata={"index": i},
            ))
            cases.append(BenchmarkCase(
                id=f"tq_{i:03d}_en",
                category=BenchmarkCategory.TEXT_QUALITY,
                name=f"English Text Quality #{i+1}",
                input_data={"text": text_en, "lang": "en"},
                metadata={"index": i},
            ))
        return cases

    @property
    def cases(self) -> list[BenchmarkCase]:
        return self._cases

    def evaluate(self, text: str, evaluator_fn: Callable) -> list[BenchmarkMetric]:
        metrics = []
        scores = evaluator_fn(text)

        if isinstance(scores, dict):
            for key, value in scores.items():
                if isinstance(value, (int, float)):
                    metrics.append(BenchmarkMetric(
                        name=key, value=float(value),
                        direction=MetricDirection.HIGHER_BETTER,
                    ))
        elif isinstance(scores, (int, float)):
            metrics.append(BenchmarkMetric(
                name="composite_score", value=float(scores),
                direction=MetricDirection.HIGHER_BETTER,
            ))
        return metrics


class ReasoningBenchmark:
    """推理能力基准"""

    def __init__(self):
        self._cases = self._build_cases()

    @staticmethod
    def _build_cases() -> list[BenchmarkCase]:
        cases = []
        for i, problem in enumerate(_REASONING_PROBLEMS):
            cases.append(BenchmarkCase(
                id=f"r_{i:03d}_{problem['type']}",
                category=BenchmarkCategory.REASONING,
                name=f"{problem['type'].title()} #{i+1}",
                input_data=problem,
                expected_output=problem["answer"],
                metadata={"type": problem["type"]},
            ))
        return cases

    @property
    def cases(self) -> list[BenchmarkCase]:
        return self._cases

    def evaluate(self, response: str, expected: str) -> list[BenchmarkMetric]:
        metrics = []

        if expected.lower().strip() in response.lower():
            metrics.append(BenchmarkMetric(
                name="accuracy", value=1.0,
                threshold_good=0.8, threshold_acceptable=0.5,
            ))
        else:
            partial_score = self._semantic_similarity(response, expected)
            metrics.append(BenchmarkMetric(
                name="accuracy", value=partial_score,
                threshold_good=0.8, threshold_acceptable=0.5,
            ))

        response_tokens = len(response.split())
        if response_tokens < 100:
            efficiency = 1.0
        elif response_tokens < 300:
            efficiency = 0.7
        else:
            efficiency = 0.4

        metrics.append(BenchmarkMetric(
            name="conciseness", value=efficiency,
            direction=MetricDirection.HIGHER_BETTER,
            threshold_good=0.7, threshold_acceptable=0.4,
        ))

        has_reasoning = any(
            kw in response.lower()
            for kw in ["因为", "所以", "因此", "because", "therefore", "since", "thus"]
        )
        metrics.append(BenchmarkMetric(
            name="reasoning_explicitness", value=1.0 if has_reasoning else 0.3,
            threshold_good=0.6, threshold_acceptable=0.3,
        ))

        return metrics

    @staticmethod
    def _semantic_similarity(a: str, b: str) -> float:
        words_a = set(a.lower().split())
        words_b = set(b.lower().split())
        if not words_a or not words_b:
            return 0.0
        overlap = len(words_a & words_b)
        return min(overlap / max(len(words_a), len(words_b)) * 3, 0.8)


class CreativityBenchmark:
    """创意评估基准"""

    def __init__(self):
        self._cases = self._build_cases()

    @staticmethod
    def _build_cases() -> list[BenchmarkCase]:
        return [
            BenchmarkCase(
                id=f"cr_{i:03d}",
                category=BenchmarkCategory.CREATIVITY,
                name=f"创意评估 #{i+1}",
                input_data={"prompt": prompt},
                metadata={"index": i},
            )
            for i, prompt in enumerate(_CREATIVITY_PROMPTS)
        ]

    @property
    def cases(self) -> list[BenchmarkCase]:
        return self._cases

    @staticmethod
    def evaluate(response: str, prompt: str = "") -> list[BenchmarkMetric]:
        metrics = []

        diversity_score = CreativityBenchmark._lexical_diversity(response)
        metrics.append(BenchmarkMetric(
            name="lexical_diversity", value=diversity_score,
            direction=MetricDirection.HIGHER_BETTER,
            threshold_good=0.6, threshold_acceptable=0.4,
        ))

        novelty_score = CreativityBenchmark._novelty(response)
        metrics.append(BenchmarkMetric(
            name="novelty", value=novelty_score,
            direction=MetricDirection.HIGHER_BETTER,
            threshold_good=0.5, threshold_acceptable=0.3,
        ))

        coherence = CreativityBenchmark._coherence(response)
        metrics.append(BenchmarkMetric(
            name="coherence", value=coherence,
            threshold_good=0.7, threshold_acceptable=0.5,
        ))

        fluency = min(len(response.split()) / 20.0, 1.0)
        metrics.append(BenchmarkMetric(
            name="fluency", value=fluency,
            threshold_good=0.5, threshold_acceptable=0.3,
        ))

        return metrics

    @staticmethod
    def _lexical_diversity(text: str) -> float:
        words = [w.lower() for w in text.split() if len(w) > 1]
        if not words:
            return 0.0
        unique_ratio = len(set(words)) / len(words)
        return float(unique_ratio)

    @staticmethod
    def _novelty(text: str) -> float:
        words = [w.lower() for w in text.split() if len(w) > 1]
        if len(words) < 5:
            return 0.3

        common_words = {
            "the", "a", "an", "is", "are", "was", "were", "be", "been",
            "have", "has", "had", "do", "does", "did", "will", "would",
            "can", "could", "should", "may", "might", "shall", "must",
            "的", "是", "在", "有", "和", "了", "不", "人", "这", "中", "大",
            "为", "上", "个", "国", "我", "以", "要", "他", "时", "来", "用",
            "们", "生", "到", "作", "地", "于", "出", "会", "可", "也", "你",
            "对", "就", "能", "下", "过", "说", "年", "没", "从", "自", "着",
        }
        uncommon_count = sum(1 for w in words if w not in common_words)
        return float(uncommon_count / len(words))

    @staticmethod
    def _coherence(text: str) -> float:
        sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]
        if len(sentences) < 2:
            return 0.7

        overlaps = []
        for i in range(len(sentences) - 1):
            words_a = set(sentences[i].lower().split())
            words_b = set(sentences[i + 1].lower().split())
            if not words_a or not words_b:
                continue
            overlap = len(words_a & words_b) / min(len(words_a), len(words_b))
            overlaps.append(overlap)

        return float(np.mean(overlaps)) if overlaps else 0.5


class EfficiencyBenchmark:
    """效率基准"""

    def __init__(self):
        self._cases = self._build_cases()

    @staticmethod
    def _build_cases() -> list[BenchmarkCase]:
        return [
            BenchmarkCase(
                id=f"eff_{i:03d}",
                category=BenchmarkCategory.EFFICIENCY,
                name=f"效率基准 #{i+1}",
                metadata={"size": size, "iterations": iters},
            )
            for i, (size, iters) in enumerate([
                ("small", 100), ("medium", 50), ("large", 10),
                ("xlarge", 3), ("stress", 1),
            ])
        ]

    @property
    def cases(self) -> list[BenchmarkCase]:
        return self._cases

    @staticmethod
    def measure(fn: Callable, input_data: Any) -> tuple[float, Any]:
        start = time.perf_counter()
        result = fn(input_data)
        duration = time.perf_counter() - start
        return duration, result

    def evaluate(self, fn_duration: float, fn_output_size: int = 0) -> list[BenchmarkMetric]:
        metrics = []

        latency_score = 1.0 if fn_duration < 0.1 else (
            0.8 if fn_duration < 0.5 else (0.5 if fn_duration < 1.0 else 0.2)
        )
        metrics.append(BenchmarkMetric(
            name="latency", value=latency_score,
            direction=MetricDirection.HIGHER_BETTER,
            threshold_good=0.7, threshold_acceptable=0.4,
            unit=f"{fn_duration:.4f}s",
        ))

        if fn_output_size > 0:
            throughput = fn_output_size / max(fn_duration, 1e-6)
            throughput_score = min(throughput / 10000.0, 1.0)
            metrics.append(BenchmarkMetric(
                name="throughput", value=throughput_score,
                threshold_good=0.5, threshold_acceptable=0.3,
                unit=f"{throughput:.1f} chars/s",
            ))

        return metrics


class BenchmarkRunner:
    """基准测试运行器"""

    def __init__(self):
        self._benches: dict[BenchmarkCategory, Any] = {
            BenchmarkCategory.TEXT_QUALITY: TextQualityBenchmark(),
            BenchmarkCategory.REASONING: ReasoningBenchmark(),
            BenchmarkCategory.CREATIVITY: CreativityBenchmark(),
            BenchmarkCategory.EFFICIENCY: EfficiencyBenchmark(),
        }
        self._evaluators: dict[BenchmarkCategory, Callable] = {}
        self._history: list[BenchmarkReport] = []

    def set_evaluator(self, category: BenchmarkCategory, fn: Callable) -> None:
        self._evaluators[category] = fn

    def run_category(self, category: BenchmarkCategory, **kwargs) -> BenchmarkReport:
        bench = self._benches.get(category)
        if not bench:
            return BenchmarkReport(name=f"{category.value} (unsupported)")

        evaluator = self._evaluators.get(category)
        if not evaluator:
            return BenchmarkReport(name=f"{category.value} (no evaluator)")

        report = BenchmarkReport(name=f"{category.value} benchmark")
        start_time = time.monotonic()

        for case in bench.cases:
            try:
                t_start = time.monotonic()
                metrics = evaluator(case, **kwargs)
                t_duration = time.monotonic() - t_start

                result = BenchmarkResult(
                    id=case.id, case=case, metrics=metrics,
                    duration=t_duration,
                    passed=all(m.passed for m in metrics),
                )
            except Exception as e:
                result = BenchmarkResult(
                    id=case.id, case=case, metrics=[],
                    duration=0.0, passed=False, error=str(e),
                )

            report.results.append(result)

        report.total_duration = time.monotonic() - start_time
        report.total_cases = len(report.results)
        report.passed_cases = sum(1 for r in report.results if r.passed)
        report.failed_cases = report.total_cases - report.passed_cases

        scores = [r.score for r in report.results if r.metrics]
        report.average_score = np.mean(scores) if scores else 0.0

        report.category_scores = self._aggregate_categories(report.results)
        report.metric_summaries = self._aggregate_metrics(report.results)
        report.recommendations = self._generate_recommendations(report)

        self._history.append(report)
        return report

    def run_all(self, **kwargs) -> list[BenchmarkReport]:
        reports = []
        for category in BenchmarkCategory:
            if category in self._benches and category in self._evaluators:
                report = self.run_category(category, **kwargs)
                reports.append(report)
        return reports

    @staticmethod
    def _aggregate_categories(results: list[BenchmarkResult]) -> dict[str, float]:
        cat_scores: dict[str, list[float]] = defaultdict(list)
        for r in results:
            if r.metrics:
                cat_scores[r.case.metadata.get("type", "general")].append(r.score)
        return {
            cat: float(np.mean(scores)) for cat, scores in cat_scores.items()
        }

    @staticmethod
    def _aggregate_metrics(results: list[BenchmarkResult]) -> dict[str, dict[str, float]]:
        metric_values: dict[str, list[float]] = defaultdict(list)
        for r in results:
            for m in r.metrics:
                metric_values[m.name].append(m.value)

        return {
            name: {
                "mean": float(np.mean(values)),
                "std": float(np.std(values)),
                "min": float(np.min(values)),
                "max": float(np.max(values)),
                "median": float(np.median(values)),
            }
            for name, values in metric_values.items()
        }

    def _generate_recommendations(self, report: BenchmarkReport) -> list[str]:
        recs = []
        if report.pass_rate < 0.5:
            recs.append("整体通过率较低，建议全面审查各维度性能")
        if report.pass_rate < 0.8:
            weak_cats = [
                cat for cat, score in report.category_scores.items()
                if score < 0.5
            ]
            if weak_cats:
                recs.append(f"以下类别表现较弱: {', '.join(weak_cats)}")

        for name, summary in report.metric_summaries.items():
            if summary["mean"] < 0.4:
                recs.append(f"指标 '{name}' 平均分过低 ({summary['mean']:.2f})，建议专项优化")

        if not recs:
            recs.append("各维度表现良好，继续保持")

        return recs

    def compare_runs(self, n: int = 2) -> dict[str, Any]:
        if len(self._history) < 2:
            return {"error": "需要至少两次运行才能比较"}

        recent = self._history[-n:]
        return {
            "runs": len(recent),
            "score_trend": [
                {"index": i, "average_score": r.average_score, "pass_rate": r.pass_rate}
                for i, r in enumerate(recent)
            ],
        }

    def export_report(self, report: BenchmarkReport, path: str) -> None:
        with open(path, "w") as f:
            json.dump(report.to_dict(), f, ensure_ascii=False, indent=2)

    @property
    def pass_rate(self) -> float:
        if not self._history:
            return 0.0
        latest = self._history[-1]
        return latest.passed_cases / max(latest.total_cases, 1)
