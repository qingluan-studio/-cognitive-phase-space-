"""
MLOps Module — 模型运维全生命周期管理

实验追踪、模型版本管理、漂移检测、模型评估、特征存储。
"""
from __future__ import annotations

import hashlib
import json
import threading
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional, Self

import numpy as np


class ModelStage(Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    ARCHIVED = "archived"
    DEPRECATED = "deprecated"


class DriftType(Enum):
    DATA_DRIFT = "data_drift"
    CONCEPT_DRIFT = "concept_drift"
    PREDICTION_DRIFT = "prediction_drift"
    FEATURE_DRIFT = "feature_drift"
    LABEL_DRIFT = "label_drift"


class MetricDirection(Enum):
    HIGHER_IS_BETTER = 1
    LOWER_IS_BETTER = -1
    TARGET = 0


@dataclass
class ExperimentRun:
    run_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    name: str = ""
    tags: dict[str, str] = field(default_factory=dict)
    params: dict[str, Any] = field(default_factory=dict)
    metrics: dict[str, float] = field(default_factory=dict)
    artifacts: list[str] = field(default_factory=list)
    status: str = "running"
    start_time: float = field(default_factory=time.time)
    end_time: float | None = None
    parent_run_id: str = ""

    @property
    def duration(self) -> float:
        return (self.end_time or time.time()) - self.start_time

    def log_metric(self, name: str, value: float, step: int = 0) -> None:
        self.metrics[name] = value

    def log_params(self, **kwargs) -> None:
        self.params.update(kwargs)

    def log_artifact(self, path: str) -> None:
        self.artifacts.append(path)

    def finish(self, status: str = "completed") -> None:
        self.status = status
        self.end_time = time.time()

    def to_dict(self) -> dict:
        return {
            "run_id": self.run_id, "name": self.name, "status": self.status,
            "params": self.params, "metrics": self.metrics,
            "duration": self.duration, "tags": self.tags,
        }


@dataclass
class ModelVersion:
    model_id: str
    version: int
    stage: ModelStage = ModelStage.DEVELOPMENT
    run_id: str = ""
    metrics: dict[str, float] = field(default_factory=dict)
    artifact_path: str = ""
    framework: str = "cee"
    created_at: float = field(default_factory=time.time)
    description: str = ""
    signature: str = ""

    def promote(self, stage: ModelStage) -> None:
        self.stage = stage

    @property
    def is_production(self) -> bool:
        return self.stage == ModelStage.PRODUCTION


class ExperimentTracker:
    """实验追踪器"""

    def __init__(self) -> None:
        self._runs: dict[str, ExperimentRun] = {}
        self._metrics_history: dict[str, list[tuple[int, float]]] = defaultdict(list)
        self._lock = threading.Lock()

    def create_run(self, name: str = "", tags: dict[str, str] | None = None, parent_run_id: str = "") -> ExperimentRun:
        run = ExperimentRun(name=name, tags=tags or {}, parent_run_id=parent_run_id)
        with self._lock:
            self._runs[run.run_id] = run
        return run

    def get_run(self, run_id: str) -> ExperimentRun | None:
        return self._runs.get(run_id)

    def log_metric(self, run_id: str, name: str, value: float, step: int = 0) -> None:
        run = self._runs.get(run_id)
        if run:
            run.log_metric(name, value, step)
            self._metrics_history[name].append((step, value))

    def get_best_run(self, metric: str, direction: MetricDirection = MetricDirection.HIGHER_IS_BETTER) -> ExperimentRun | None:
        best_run = None
        best_value = float("-inf") if direction == MetricDirection.HIGHER_IS_BETTER else float("inf")
        sign = direction.value
        for run in self._runs.values():
            if metric in run.metrics:
                val = run.metrics[metric] * sign
                if val > best_value:
                    best_value = val
                    best_run = run
        return best_run

    def compare_runs(self, run_ids: list[str], metrics: list[str]) -> dict:
        result = {}
        for rid in run_ids:
            run = self._runs.get(rid)
            if run:
                result[rid] = {m: run.metrics.get(m) for m in metrics}
        return result

    def list_runs(self, status: str | None = None, tag_filter: dict[str, str] | None = None) -> list[ExperimentRun]:
        runs = list(self._runs.values())
        if status:
            runs = [r for r in runs if r.status == status]
        if tag_filter:
            runs = [r for r in runs if all(r.tags.get(k) == v for k, v in tag_filter.items())]
        return sorted(runs, key=lambda r: r.start_time, reverse=True)

    def export_csv(self, filepath: str) -> None:
        import csv
        with open(filepath, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["run_id", "name", "status", "metrics", "params", "duration"])
            for run in self._runs.values():
                writer.writerow([
                    run.run_id, run.name, run.status,
                    json.dumps(run.metrics), json.dumps(run.params), run.duration,
                ])

    @property
    def active_runs(self) -> int:
        return sum(1 for r in self._runs.values() if r.status == "running")


class ModelRegistry:
    """模型注册中心"""

    def __init__(self) -> None:
        self._models: dict[str, list[ModelVersion]] = defaultdict(list)
        self._lock = threading.Lock()

    def register(
        self,
        model_id: str,
        run: ExperimentRun | None = None,
        metrics: dict[str, float] | None = None,
        artifact_path: str = "",
        framework: str = "cee",
    ) -> ModelVersion:
        with self._lock:
            versions = self._models[model_id]
            version_num = len(versions) + 1
            mv = ModelVersion(
                model_id=model_id,
                version=version_num,
                run_id=run.run_id if run else "",
                metrics=metrics or (run.metrics if run else {}),
                artifact_path=artifact_path,
                framework=framework,
            )
            mv.signature = hashlib.md5(
                json.dumps(mv.metrics, sort_keys=True).encode()
            ).hexdigest()[:16]
            versions.append(mv)
            return mv

    def get_latest(self, model_id: str, stage: ModelStage | None = None) -> ModelVersion | None:
        versions = self._models.get(model_id)
        if not versions:
            return None
        if stage:
            candidates = [v for v in versions if v.stage == stage]
            return candidates[-1] if candidates else None
        return versions[-1]

    def get_by_stage(self, stage: ModelStage) -> list[ModelVersion]:
        result = []
        for versions in self._models.values():
            result.extend(v for v in versions if v.stage == stage)
        return result

    def promote(self, model_id: str, version: int, stage: ModelStage) -> bool:
        versions = self._models.get(model_id, [])
        for v in versions:
            if v.version == version:
                v.promote(stage)
                return True
        return False

    def get_stage_transition_history(self, model_id: str) -> list[dict]:
        versions = self._models.get(model_id, [])
        return [
            {"version": v.version, "stage": v.stage.value, "metrics": v.metrics, "signature": v.signature}
            for v in versions
        ]

    def compare_versions(self, model_id: str, v1: int, v2: int) -> dict:
        versions = self._models.get(model_id, [])
        ver1 = next((v for v in versions if v.version == v1), None)
        ver2 = next((v for v in versions if v.version == v2), None)
        if not ver1 or not ver2:
            return {}
        result = {"model_id": model_id, "v1": v1, "v2": v2, "diffs": {}}
        all_metrics = set(ver1.metrics.keys()) | set(ver2.metrics.keys())
        for m in all_metrics:
            result["diffs"][m] = {
                "v1": ver1.metrics.get(m), "v2": ver2.metrics.get(m),
                "delta": (ver2.metrics.get(m, 0) - ver1.metrics.get(m, 0)) if m in ver1.metrics and m in ver2.metrics else None,
            }
        return result

    @property
    def model_count(self) -> int:
        return len(self._models)

    @property
    def version_count(self) -> int:
        return sum(len(v) for v in self._models.values())


class DriftDetector:
    """多维度模型漂移检测"""

    def __init__(self, reference_data: np.ndarray | None = None, threshold: float = 0.1) -> None:
        self.reference: np.ndarray | None = reference_data
        self._reference_stats: dict[str, float] = {}
        self.threshold = threshold
        self._history: list[dict] = []
        if reference_data is not None:
            self._compute_reference_stats()

    def set_reference(self, data: np.ndarray) -> None:
        self.reference = data
        self._compute_reference_stats()

    def _compute_reference_stats(self) -> None:
        if self.reference is None:
            return
        self._reference_stats = {
            "mean": float(np.mean(self.reference)),
            "std": float(np.std(self.reference)),
            "median": float(np.median(self.reference)),
            "min": float(np.min(self.reference)),
            "max": float(np.max(self.reference)),
            "p5": float(np.percentile(self.reference, 5)),
            "p95": float(np.percentile(self.reference, 95)),
        }

    def detect(self, current_data: np.ndarray, drift_type: DriftType = DriftType.DATA_DRIFT) -> dict:
        if self.reference is None:
            self.set_reference(current_data)
            return {"drift_detected": False, "reason": "reference_initialized"}

        stats = {
            "mean": float(np.mean(current_data)),
            "std": float(np.std(current_data)),
            "median": float(np.median(current_data)),
            "min": float(np.min(current_data)),
            "max": float(np.max(current_data)),
            "p5": float(np.percentile(current_data, 5)),
            "p95": float(np.percentile(current_data, 95)),
        }

        ks_stat = self._kolmogorov_smirnov(self.reference, current_data)
        mean_shift = abs(stats["mean"] - self._reference_stats["mean"]) / max(self._reference_stats["std"], 1e-8)
        psi = self._population_stability_index(self.reference, current_data)

        drift_detected = ks_stat > self.threshold or mean_shift > 2.0 or psi > 0.25

        result = {
            "drift_detected": drift_detected,
            "drift_type": drift_type.value,
            "ks_statistic": float(ks_stat),
            "mean_shift_sigma": float(mean_shift),
            "psi": float(psi),
            "reference_stats": dict(self._reference_stats),
            "current_stats": stats,
            "timestamp": time.time(),
        }
        self._history.append(result)
        return result

    def _kolmogorov_smirnov(self, x: np.ndarray, y: np.ndarray) -> float:
        combined = np.sort(np.concatenate([x.flatten(), y.flatten()]))
        n1, n2 = len(x.flatten()), len(y.flatten())
        cdf1 = np.searchsorted(np.sort(x.flatten()), combined, side="right") / n1
        cdf2 = np.searchsorted(np.sort(y.flatten()), combined, side="right") / n2
        return float(np.max(np.abs(cdf1 - cdf2)))

    def _population_stability_index(self, expected: np.ndarray, actual: np.ndarray, bins: int = 10) -> float:
        e_flat = expected.flatten()
        a_flat = actual.flatten()
        all_data = np.concatenate([e_flat, a_flat])
        bin_edges = np.linspace(all_data.min(), all_data.max(), bins + 1)
        e_hist, _ = np.histogram(e_flat, bins=bin_edges)
        a_hist, _ = np.histogram(a_flat, bins=bin_edges)
        e_prop = np.clip(e_hist / max(len(e_flat), 1), 0.001, None)
        a_prop = np.clip(a_hist / max(len(a_flat), 1), 0.001, None)
        return float(np.sum((a_prop - e_prop) * np.log(a_prop / e_prop)))

    @property
    def drift_history(self) -> list[dict]:
        return self._history

    @property
    def latest_drift(self) -> dict | None:
        return self._history[-1] if self._history else None


class ABTestEngine:
    """A/B 测试框架"""

    def __init__(self) -> None:
        self._experiments: dict[str, dict] = {}
        self._lock = threading.Lock()

    def create_experiment(
        self,
        name: str,
        variants: list[str],
        metrics: list[str],
        traffic_split: list[float] | None = None,
        min_sample_size: int = 1000,
        significance_level: float = 0.05,
    ) -> str:
        exp_id = uuid.uuid4().hex[:8]
        n = len(variants)
        if traffic_split is None:
            traffic_split = [1.0 / n] * n
        with self._lock:
            self._experiments[exp_id] = {
                "name": name,
                "variants": variants,
                "metrics": metrics,
                "traffic_split": traffic_split,
                "min_sample_size": min_sample_size,
                "significance_level": significance_level,
                "results": {v: {m: [] for m in metrics} for v in variants},
                "assignments": {},
                "created_at": time.time(),
            }
        return exp_id

    def assign(self, experiment_id: str, user_id: str) -> str | None:
        exp = self._experiments.get(experiment_id)
        if not exp:
            return None
        if user_id in exp["assignments"]:
            return exp["assignments"][user_id]
        r = np.random.random()
        cumulative = 0.0
        for variant, split in zip(exp["variants"], exp["traffic_split"]):
            cumulative += split
            if r <= cumulative:
                exp["assignments"][user_id] = variant
                return variant
        return exp["variants"][-1]

    def log_result(self, experiment_id: str, variant: str, metric: str, value: float) -> None:
        exp = self._experiments.get(experiment_id)
        if exp and variant in exp["results"] and metric in exp["results"][variant]:
            exp["results"][variant][metric].append(value)

    def analyze(self, experiment_id: str) -> dict:
        exp = self._experiments.get(experiment_id)
        if not exp:
            return {"error": "experiment not found"}
        analysis = {}
        for metric in exp["metrics"]:
            if all(len(exp["results"][v][metric]) >= exp["min_sample_size"] for v in exp["variants"]):
                control = exp["variants"][0]
                control_data = np.array(exp["results"][control][metric])
                control_mean = float(np.mean(control_data))
                control_std = float(np.std(control_data))
                analysis[metric] = {"control": {"mean": control_mean, "std": control_std, "n": len(control_data)}}
                for variant in exp["variants"][1:]:
                    vdata = np.array(exp["results"][variant][metric])
                    vmean = float(np.mean(vdata))
                    vstd = float(np.std(vdata))
                    n1, n2 = len(control_data), len(vdata)
                    se = np.sqrt(control_std**2 / n1 + vstd**2 / n2) if n1 > 0 and n2 > 0 else 1.0
                    t_stat = (vmean - control_mean) / max(se, 1e-8)
                    p_value = float(2 * (1 - 0.5 * (1 + np.math.erf(abs(t_stat) / np.sqrt(2)))))
                    analysis[metric][variant] = {
                        "mean": vmean, "std": vstd, "n": n2,
                        "lift": float((vmean - control_mean) / max(abs(control_mean), 1e-8) * 100),
                        "p_value": p_value,
                        "significant": p_value < exp["significance_level"],
                    }
        return analysis


__all__ = [
    "ExperimentTracker", "ExperimentRun",
    "ModelRegistry", "ModelVersion", "ModelStage",
    "DriftDetector", "DriftType",
    "ABTestEngine",
    "MetricDirection",
]
