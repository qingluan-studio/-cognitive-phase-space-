"""
多模型协作系统 - Multi-Model Collaboration System

核心理念:
  单一模型有盲区，多模型可互补。三层能力:
  - Router: 智能路由，按能力/成本/延迟/质量选模型
  - Pool: 模型池管理，健康检查+配额+成本
  - Ensemble: 多模型投票、加权、多样性奖励

双轨制:
  - 工程版: 加权评分 + 多数投票 + 置信度加权
  - 理论版: 混合专家(MoE) + 贝叶斯模型平均(BMA)

公式:
  score = w_q*quality + w_s*(1-latency/max) + w_c*(1-cost/max) + w_cap*match
  diversity = unique_claims / total_claims
"""

from __future__ import annotations

import logging
import math
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class ModelCapability(Enum):
    TEXT_GENERATION = "text_generation"
    CODE = "code"
    REASONING = "reasoning"
    CREATIVE = "creative"
    FAST = "fast"
    CHEAP = "cheap"
    MULTIMODAL = "multimodal"
    LONG_CONTEXT = "long_context"


class FailoverStrategy(Enum):
    RETRY_SAME = "retry_same"
    NEXT_CHEAPEST = "next_cheapest"
    NEXT_FASTEST = "next_fastest"
    NEXT_HIGHEST_QUALITY = "next_highest_quality"
    CASCADE = "cascade"


class FinishReason(Enum):
    STOP = "stop"
    LENGTH = "length"
    CONTENT_FILTER = "content_filter"
    ERROR = "error"
    TIMEOUT = "timeout"
    QUOTA_EXCEEDED = "quota_exceeded"


@dataclass
class ModelInfo:
    name: str
    provider: str
    capabilities: set[ModelCapability] = field(default_factory=set)
    max_tokens: int = 4096
    cost_per_1k_input: float = 0.0
    cost_per_1k_output: float = 0.0
    latency_ms_avg: float = 1000.0
    quality_score: float = 0.5
    available: bool = True
    quota_remaining: int = 1000
    weight: float = 1.0

    @property
    def avg_cost_per_1k(self) -> float:
        return (self.cost_per_1k_input + self.cost_per_1k_output) / 2.0

    @property
    def is_available(self) -> bool:
        return self.available and self.quota_remaining > 0

    def has_capability(self, capability: ModelCapability) -> bool:
        return capability in self.capabilities

    def has_all_capabilities(self, caps: set[ModelCapability]) -> bool:
        return caps.issubset(self.capabilities)


@dataclass
class ModelResponse:
    model_name: str
    content: str
    tokens_used: int = 0
    latency_ms: float = 0.0
    cost: float = 0.0
    confidence: float = 0.5
    finish_reason: FinishReason = FinishReason.STOP
    metadata: dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)

    @property
    def is_success(self) -> bool:
        return self.finish_reason in (FinishReason.STOP, FinishReason.LENGTH)


@dataclass
class RouterPreference:
    quality_weight: float = 0.4
    speed_weight: float = 0.2
    cost_weight: float = 0.2
    capability_weight: float = 0.2
    max_latency_ms: float = 5000.0
    max_budget_per_1k: float = 0.10
    required_capabilities: set[ModelCapability] = field(default_factory=set)
    failover_strategy: FailoverStrategy = FailoverStrategy.NEXT_CHEAPEST
    max_retries: int = 3

    def validate(self) -> None:
        total = sum([
            self.quality_weight, self.speed_weight,
            self.cost_weight, self.capability_weight,
        ])
        if not math.isclose(total, 1.0, abs_tol=1e-6):
            raise ValueError(f"weights must sum to 1.0, got {total}")


@dataclass
class EnsembleArtifacts:
    responses: list[ModelResponse] = field(default_factory=list)
    aggregated_content: str = ""
    agreement_score: float = 0.0
    diversity_score: float = 0.0
    dissenting_opinions: list[str] = field(default_factory=list)
    confidence_scores: dict[str, float] = field(default_factory=dict)
    selected_model: str = ""
    ensemble_method: str = "majority"

    @property
    def model_count(self) -> int:
        return len(self.responses)

    @property
    def avg_confidence(self) -> float:
        if not self.responses:
            return 0.0
        return sum(r.confidence for r in self.responses) / len(self.responses)


class QuotaTracker:
    """配额追踪器 - 简单计数器 + 重置周期"""

    def __init__(self) -> None:
        self._quotas: dict[str, tuple[int, float, float]] = {}
        self._lock = threading.RLock()

    def register(self, name: str, initial: int, period_s: float = 3600.0) -> None:
        with self._lock:
            self._quotas[name] = (initial, time.time(), period_s)

    def consume(self, name: str, tokens: int = 1) -> bool:
        with self._lock:
            entry = self._quotas.get(name)
            if entry is None:
                return False
            remaining, last_reset, period = entry
            if time.time() - last_reset >= period:
                remaining = self._quotas[name][0]
                self._quotas[name] = (remaining, time.time(), period)
            if remaining < tokens:
                return False
            self._quotas[name] = (remaining - tokens, last_reset, period)
            return True

    def remaining(self, name: str) -> int:
        with self._lock:
            entry = self._quotas.get(name)
            if entry is None:
                return 0
            return entry[0]

    @property
    def snapshot(self) -> dict[str, dict[str, Any]]:
        with self._lock:
            return {
                name: {
                    "remaining": entry[0],
                    "seconds_since_reset": time.time() - entry[1],
                    "period_s": entry[2],
                }
                for name, entry in self._quotas.items()
            }


class CostTracker:
    """成本追踪器"""

    def __init__(self) -> None:
        self._total: float = 0.0
        self._per_model: dict[str, tuple[float, int]] = defaultdict(lambda: (0.0, 0))
        self._lock = threading.RLock()

    def record(self, name: str, cost: float) -> None:
        with self._lock:
            self._total += cost
            prev_cost, prev_calls = self._per_model[name]
            self._per_model[name] = (prev_cost + cost, prev_calls + 1)

    @property
    def total(self) -> float:
        return self._total

    @property
    def breakdown(self) -> dict[str, dict[str, Any]]:
        with self._lock:
            return {
                name: {"cost": c, "calls": n}
                for name, (c, n) in self._per_model.items()
            }

    def cost_for(self, name: str) -> float:
        return self._per_model.get(name, (0.0, 0))[0]

    def reset(self) -> None:
        with self._lock:
            self._total = 0.0
            self._per_model.clear()


class ModelPool:
    """模型池 - 管理模型实例、健康检查、配额、成本"""

    def __init__(self) -> None:
        self._models: dict[str, ModelInfo] = {}
        self._health: dict[str, bool] = {}
        self._last_ping: dict[str, float] = {}
        self._ping_handlers: dict[str, Callable[[], bool]] = {}
        self._quota = QuotaTracker()
        self._cost = CostTracker()
        self._rr_index: dict[frozenset, int] = defaultdict(int)
        self._lock = threading.RLock()
        logger.info("ModelPool initialized")

    def register(self, model: ModelInfo) -> None:
        with self._lock:
            self._models[model.name] = model
            self._health[model.name] = model.available
            self._last_ping[model.name] = time.time()
            self._quota.register(model.name, model.quota_remaining)

    def register_handler(self, name: str, handler: Callable[[], bool]) -> None:
        self._ping_handlers[name] = handler

    def get(self, name: str) -> ModelInfo | None:
        return self._models.get(name)

    def ping(self, name: str) -> bool:
        handler = self._ping_handlers.get(name)
        try:
            healthy = handler() if handler else (
                self._models.get(name) is not None
                and self._models[name].available
                and self._models[name].quota_remaining > 0
            )
        except Exception:
            healthy = False
        with self._lock:
            self._health[name] = healthy
            self._last_ping[name] = time.time()
        return healthy

    def ping_all(self) -> dict[str, bool]:
        return {n: self.ping(n) for n in list(self._models.keys())}

    def is_healthy(self, name: str) -> bool:
        return self._health.get(name, False)

    def list_available(self) -> list[ModelInfo]:
        with self._lock:
            return [m for m in self._models.values() if m.is_available and self.is_healthy(m.name)]

    def list_by_capability(self, cap: ModelCapability) -> list[ModelInfo]:
        return [m for m in self.list_available() if m.has_capability(cap)]

    def list_by_capabilities(self, caps: set[ModelCapability]) -> list[ModelInfo]:
        return [m for m in self.list_available() if m.has_all_capabilities(caps)]

    def consume_quota(self, name: str, tokens: int) -> bool:
        ok = self._quota.consume(name, tokens)
        if ok:
            model = self._models.get(name)
            if model:
                model.quota_remaining = self._quota.remaining(name)
        return ok

    def record_cost(self, name: str, cost: float) -> None:
        self._cost.record(name, cost)

    def pick_round_robin(self, names: list[str]) -> str:
        if not names:
            raise ValueError("empty name list")
        key = frozenset(names)
        self._rr_index[key] += 1
        return names[self._rr_index[key] % len(names)]

    def auto_scaling_hints(self) -> dict[str, Any]:
        hints: dict[str, Any] = {"scale_up": [], "scale_down": []}
        for name in self._models:
            r = self._quota.remaining(name)
            c = self._cost.cost_for(name)
            if r < 100:
                hints["scale_up"].append({"model": name, "reason": f"low quota ({r})"})
            if r > 5000 and c < 0.01:
                hints["scale_down"].append({"model": name, "reason": "underutilized"})
        return hints

    @property
    def models(self) -> list[ModelInfo]:
        return list(self._models.values())

    @property
    def health_report(self) -> dict[str, Any]:
        return {
            name: {
                "healthy": self._health.get(name, False),
                "quota": self._quota.remaining(name),
                "cost": self._cost.cost_for(name),
            }
            for name in self._models
        }

    @property
    def total_cost(self) -> float:
        return self._cost.total

    @property
    def cost_breakdown(self) -> dict[str, dict[str, Any]]:
        return self._cost.breakdown


class ModelRouter:
    """模型路由器 - 按能力/成本/延迟/质量选模型"""

    def __init__(self, pool: ModelPool) -> None:
        self._pool = pool
        self._preference = RouterPreference()
        self._calls: dict[str, int] = defaultdict(int)
        self._errors: dict[str, int] = defaultdict(int)
        self._lock = threading.RLock()

    @property
    def preference(self) -> RouterPreference:
        return self._preference

    @preference.setter
    def preference(self, v: RouterPreference) -> None:
        v.validate()
        self._preference = v

    def score_model(self, model: ModelInfo, required: set[ModelCapability] | None = None) -> float:
        required = required or self._preference.required_capabilities
        p = self._preference
        cap_match = (len(required & model.capabilities) / len(required)) if required else 1.0
        speed_norm = max(0.0, 1.0 - model.latency_ms_avg / max(1.0, p.max_latency_ms))
        cost_norm = max(0.0, 1.0 - model.avg_cost_per_1k / max(0.001, p.max_budget_per_1k))
        score = (
            p.quality_weight * model.quality_score
            + p.speed_weight * speed_norm
            + p.cost_weight * cost_norm
            + p.capability_weight * cap_match
        )
        score -= min(0.5, self._errors.get(model.name, 0) * 0.1)
        return max(0.0, score)

    def select(self, required: set[ModelCapability] | None = None, top_k: int = 1) -> list[ModelInfo]:
        candidates = self._pool.list_available()
        if required:
            candidates = [m for m in candidates if m.has_all_capabilities(required)]
        if not candidates:
            return []
        scored = [(m, self.score_model(m, required)) for m in candidates]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [m for m, _ in scored[:top_k]]

    def select_one(self, required: set[ModelCapability] | None = None) -> ModelInfo:
        results = self.select(required, top_k=1)
        if not results:
            raise ValueError("No available model")
        return results[0]

    def _build_chain(self, required: set[ModelCapability], strategy: FailoverStrategy) -> list[ModelInfo]:
        candidates = self._pool.list_available()
        if required:
            candidates = [m for m in candidates if m.has_all_capabilities(required)]
        if strategy == FailoverStrategy.NEXT_CHEAPEST:
            candidates.sort(key=lambda m: m.avg_cost_per_1k)
        elif strategy == FailoverStrategy.NEXT_FASTEST:
            candidates.sort(key=lambda m: m.latency_ms_avg)
        elif strategy == FailoverStrategy.NEXT_HIGHEST_QUALITY:
            candidates.sort(key=lambda m: m.quality_score, reverse=True)
        else:
            scored = [(m, self.score_model(m, required)) for m in candidates]
            scored.sort(key=lambda x: x[1], reverse=True)
            candidates = [m for m, _ in scored]
        return candidates

    def execute_with_fallback(
        self,
        prompt: str,
        execute_fn: Callable[[ModelInfo, str], Any],
        required: set[ModelCapability] | None = None,
    ) -> tuple[Any, ModelInfo, list[str]]:
        pref = self._preference
        req = required or pref.required_capabilities
        chain = self._build_chain(req, pref.failover_strategy)
        if not chain:
            raise RuntimeError("No models in fallback chain")
        primary = chain[0]
        errors: list[str] = []
        retries = pref.max_retries
        while retries > 0:
            try:
                result = execute_fn(primary, prompt)
                self._calls[primary.name] += 1
                return result, primary, errors
            except Exception as e:
                errors.append(f"{primary.name}: {e}")
                self._errors[primary.name] += 1
                retries -= 1
                if pref.failover_strategy == FailoverStrategy.RETRY_SAME:
                    logger.warning(f"Retrying {primary.name} ({retries} left)")
                    continue
                if primary in chain:
                    idx = chain.index(primary)
                    if idx + 1 < len(chain):
                        primary = chain[idx + 1]
                        logger.warning(f"Falling back to {primary.name}")
                        continue
        raise RuntimeError(f"All models exhausted: {errors}")

    def load_balance_select(self, cap: ModelCapability) -> ModelInfo | None:
        models = self._pool.list_by_capability(cap)
        if not models:
            return None
        name = self._pool.pick_round_robin([m.name for m in models])
        return self._pool.get(name)

    @property
    def stats(self) -> dict[str, Any]:
        return {
            "calls": dict(self._calls),
            "errors": dict(self._errors),
            "total_calls": sum(self._calls.values()),
            "total_errors": sum(self._errors.values()),
        }

    @property
    def pool(self) -> ModelPool:
        return self._pool


def _extract_claims(text: str, min_len: int = 20) -> list[str]:
    sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".")]
    return [s for s in sentences if len(s) >= min_len]


def _jaccard(a: str, b: str) -> float:
    sa, sb = set(a.lower().split()), set(b.lower().split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _cluster_claims(claims: list[str], threshold: float = 0.3) -> list[list[int]]:
    n = len(claims)
    if n <= 1:
        return [[0]] if n == 1 else []
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: int, y: int) -> None:
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    for i in range(n):
        for j in range(i + 1, n):
            if _jaccard(claims[i], claims[j]) >= threshold:
                union(i, j)
    clusters: dict[int, list[int]] = defaultdict(list)
    for i in range(n):
        clusters[find(i)].append(i)
    return list(clusters.values())


class ModelEnsemble:
    """模型集成 - 投票、加权、多样性奖励、Best-of-N"""

    def __init__(self, pool: ModelPool) -> None:
        self._pool = pool
        self._history: list[EnsembleArtifacts] = []

    @property
    def history(self) -> list[EnsembleArtifacts]:
        return list(self._history)

    def majority_vote(self, responses: list[ModelResponse]) -> EnsembleArtifacts:
        valid = [r for r in responses if r.is_success]
        if not valid:
            return EnsembleArtifacts(responses=responses)
        groups: dict[str, list[ModelResponse]] = defaultdict(list)
        for r in valid:
            groups[r.content.strip()].append(r)
        best_content, best_resps = max(groups.items(), key=lambda kv: len(kv[1]))
        agreement = len(best_resps) / len(valid)
        dissenting: list[str] = []
        for content, resps in groups.items():
            if content != best_content:
                dissenting.extend(f"[{r.model_name}] {content[:200]}" for r in resps)
        art = EnsembleArtifacts(
            responses=valid, aggregated_content=best_content,
            agreement_score=agreement, diversity_score=self._diversity(valid),
            dissenting_opinions=dissenting,
            confidence_scores={r.model_name: r.confidence for r in valid},
            selected_model=best_resps[0].model_name,
            ensemble_method="majority",
        )
        self._history.append(art)
        return art

    def confidence_weighted(self, responses: list[ModelResponse]) -> EnsembleArtifacts:
        valid = [r for r in responses if r.is_success]
        if not valid:
            return EnsembleArtifacts(responses=responses)
        total_conf = sum(r.confidence for r in valid)
        weights = {r.model_name: (r.confidence / total_conf) if total_conf > 0 else 1.0 / len(valid)
                   for r in valid}
        agg = "\n\n".join(
            f"[{r.model_name} w={weights[r.model_name]:.2f}] {r.content}"
            for r in sorted(valid, key=lambda x: weights[x.model_name], reverse=True)
        )
        art = EnsembleArtifacts(
            responses=valid, aggregated_content=agg,
            agreement_score=self._agreement(valid),
            diversity_score=self._diversity(valid),
            dissenting_opinions=self._dissenting(valid),
            confidence_scores={r.model_name: r.confidence for r in valid},
            ensemble_method="confidence_weighted",
        )
        self._history.append(art)
        return art

    def best_of_n(self, responses: list[ModelResponse]) -> EnsembleArtifacts:
        valid = [r for r in responses if r.is_success]
        if not valid:
            return EnsembleArtifacts(responses=responses)
        best = max(valid, key=lambda r: r.confidence)
        art = EnsembleArtifacts(
            responses=valid, aggregated_content=best.content,
            agreement_score=self._agreement(valid),
            diversity_score=self._diversity(valid),
            confidence_scores={r.model_name: r.confidence for r in valid},
            selected_model=best.model_name,
            ensemble_method="best_of_n",
        )
        self._history.append(art)
        return art

    def weighted_aggregate(
        self,
        responses: list[ModelResponse],
        extract_fn: Callable[[ModelResponse], list[str]] | None = None,
    ) -> EnsembleArtifacts:
        valid = [r for r in responses if r.is_success]
        if not valid:
            return EnsembleArtifacts(responses=responses)
        all_claims: list[tuple[str, float]] = []
        for r in valid:
            claims = extract_fn(r) if extract_fn else _extract_claims(r.content)
            all_claims.extend((c, r.confidence) for c in claims)
        if not all_claims:
            return self.confidence_weighted(valid)
        clusters = _cluster_claims([c[0] for c in all_claims])
        lines: list[str] = []
        for cluster in clusters:
            subset = [all_claims[i] for i in cluster]
            avg_conf = sum(c[1] for c in subset) / len(subset)
            lines.append(f"[conf={avg_conf:.2f}] {max(subset, key=lambda x: x[1])[0]}")
        art = EnsembleArtifacts(
            responses=valid, aggregated_content="\n".join(lines),
            agreement_score=self._agreement(valid),
            diversity_score=self._diversity(valid),
            dissenting_opinions=self._dissenting(valid),
            confidence_scores={r.model_name: r.confidence for r in valid},
            ensemble_method="weighted_aggregate",
        )
        self._history.append(art)
        return art

    def _agreement(self, responses: list[ModelResponse]) -> float:
        if len(responses) < 2:
            return 1.0
        claims_map: dict[int, list[str]] = {}
        for i, r in enumerate(responses):
            claims_map[i] = _extract_claims(r.content)
        sims: list[float] = []
        indices = list(claims_map.keys())
        for i in range(len(indices)):
            for j in range(i + 1, len(indices)):
                ca, cb = claims_map[indices[i]], claims_map[indices[j]]
                if ca and cb:
                    sims.append(sum(max(_jaccard(x, y) for y in cb) for x in ca) / len(ca))
        return sum(sims) / len(sims) if sims else 0.0

    def _diversity(self, responses: list[ModelResponse]) -> float:
        if len(responses) < 2:
            return 0.0
        claim_sets = [set(_extract_claims(r.content)) for r in responses]
        union = set()
        for cs in claim_sets:
            union |= cs
        if not union:
            return 0.0
        intersection = union.copy()
        for cs in claim_sets:
            intersection &= cs
        return min(1.0, 1.0 - len(intersection) / len(union))

    def _dissenting(self, responses: list[ModelResponse]) -> list[str]:
        if len(responses) < 2:
            return []
        claims_map = {r.model_name: _extract_claims(r.content) for r in responses}
        names = list(claims_map.keys())
        consensus: set[str] = set()
        for claim in claims_map.get(names[0], []):
            if all(
                any(_jaccard(claim, c) >= 0.3 for c in claims_map[n])
                for n in names[1:]
            ):
                consensus.add(claim)
        result: list[str] = []
        for name in names:
            for claim in claims_map[name]:
                if not any(_jaccard(claim, cc) >= 0.3 for cc in consensus):
                    result.append(f"[{name}] {claim[:200]}")
                    if len(result) >= 5:
                        return result
        return result

    def ensemble(
        self, responses: list[ModelResponse], method: str = "majority",
        extract_fn: Callable[[ModelResponse], list[str]] | None = None,
    ) -> EnsembleArtifacts:
        if method == "majority":
            return self.majority_vote(responses)
        elif method == "weighted":
            return self.confidence_weighted(responses)
        elif method == "best_of_n":
            return self.best_of_n(responses)
        elif method == "aggregate":
            return self.weighted_aggregate(responses, extract_fn)
        return self.majority_vote(responses)


# ============================================================
# 理论版: 混合专家模型 (Mixture of Experts)
# ============================================================


@dataclass
class ExpertGate:
    model_name: str
    specialization: set[ModelCapability] = field(default_factory=set)
    bias: float = 0.0


class MixtureOfExperts:
    """理论版 MoE - 每个模型是专家，Router 是门控网络"""

    def __init__(self, pool: ModelPool) -> None:
        self._pool = pool
        self._experts: dict[str, ExpertGate] = {}
        self._temperature: float = 1.0

    @property
    def temperature(self) -> float:
        return self._temperature

    @temperature.setter
    def temperature(self, v: float) -> None:
        if v <= 0:
            raise ValueError("temperature > 0 required")
        self._temperature = v

    def register_expert(self, name: str, specialization: set[ModelCapability] | None = None,
                        bias: float = 0.0) -> None:
        model = self._pool.get(name)
        caps = specialization or (model.capabilities if model else set())
        self._experts[name] = ExpertGate(name, caps, bias)

    def gate(self, task_embedding: list[float] | None = None,
             required: set[ModelCapability] | None = None) -> dict[str, float]:
        emb = task_embedding or [0.5] * 8
        scores: dict[str, float] = {}
        for name, expert in self._experts.items():
            model = self._pool.get(name)
            if model is None or not model.is_available:
                continue
            if required and not required.issubset(model.capabilities):
                continue
            dim = min(len(emb), len(expert.specialization))
            spec_idx = [i for i, c in enumerate(ModelCapability) if c in expert.specialization][:dim]
            cap_overlap = sum(emb[i] for i in spec_idx) / dim if spec_idx and dim > 0 else 0.5
            scores[name] = cap_overlap * model.quality_score + expert.bias
        if not scores:
            return {}
        scaled = {k: v / self._temperature for k, v in scores.items()}
        mx = max(scaled.values())
        exps = {k: math.exp(v - mx) for k, v in scaled.items()}
        total = sum(exps.values())
        return {k: v / total for k, v in exps.items()}

    def aggregate(self, outputs: dict[str, str],
                  task_embedding: list[float] | None = None,
                  required: set[ModelCapability] | None = None) -> tuple[str, dict[str, float]]:
        weights = self.gate(task_embedding, required)
        valid = {k: v for k, v in outputs.items() if k in weights}
        if not valid:
            return "", {}
        total = sum(weights[k] for k in valid)
        norm = {k: weights[k] / total for k in valid} if total > 0 else {}
        agg = "\n\n".join(f"[{k} w={norm.get(k, 0):.3f}] {v}" for k, v in valid.items())
        return agg, norm


# ============================================================
# 理论版: 贝叶斯模型平均 (Bayesian Model Averaging)
# ============================================================


@dataclass
class BMAPrior:
    model_name: str
    prior_prob: float
    prior_variance: float = 0.1


class BayesianModelAveraging:
    """理论版 BMA - 后验概率加权，量化模型不确定性"""

    def __init__(self, pool: ModelPool) -> None:
        self._pool = pool
        self._priors: dict[str, BMAPrior] = {}
        self._history: dict[str, list[float]] = defaultdict(list)

    def set_prior(self, name: str, prob: float, variance: float = 0.1) -> None:
        self._priors[name] = BMAPrior(name, prob, variance)

    def record(self, name: str, score: float) -> None:
        self._history[name].append(score)
        if len(self._history[name]) > 100:
            self._history[name] = self._history[name][-100:]

    def posteriors(self, task_embedding: list[float] | None = None,
                   required: set[ModelCapability] | None = None,
                   prior_reg: float = 0.1) -> dict[str, float]:
        total_prior = sum(p.prior_prob for p in self._priors.values())
        if total_prior <= 0:
            return {}
        posts: dict[str, float] = {}
        for name, bma_p in self._priors.items():
            model = self._pool.get(name)
            if model is None or not model.is_available:
                posts[name] = 0.0
                continue
            if required and not required.issubset(model.capabilities):
                posts[name] = 0.0
                continue
            perf = self._history.get(name, [])
            if perf:
                mu = sum(perf) / len(perf)
                ev = (sum((p - mu) ** 2 for p in perf) / len(perf)) if len(perf) > 1 else bma_p.prior_variance
            else:
                mu = bma_p.prior_prob
                ev = bma_p.prior_variance
            log_like = -(mu ** 2) / (2 * (ev + bma_p.prior_variance) + 1e-8)
            log_prior = math.log(bma_p.prior_prob / total_prior + prior_reg)
            posts[name] = math.exp(log_like + log_prior)
        total = sum(posts.values())
        return {k: v / total for k, v in posts.items()} if total > 0 else {}

    def expected_output(self, outputs: dict[str, str],
                        task_embedding: list[float] | None = None,
                        required: set[ModelCapability] | None = None) -> tuple[str, dict[str, float]]:
        weights = self.posteriors(task_embedding, required)
        valid = {k: v for k, v in outputs.items() if k in weights and weights[k] > 0}
        if not valid:
            return "", {}
        total = sum(weights[k] for k in valid)
        norm = {k: weights[k] / total for k in valid}
        agg = "\n\n".join(f"[{k} post={norm[k]:.3f}] {v}" for k, v in valid.items())
        return agg, norm

    def uncertainty(self) -> dict[str, float]:
        unc: dict[str, float] = {}
        for name in self._priors:
            perf = self._history.get(name, [])
            if len(perf) >= 2:
                mu = sum(perf) / len(perf)
                unc[name] = sum((p - mu) ** 2 for p in perf) / len(perf)
            else:
                unc[name] = self._priors[name].prior_variance
        return unc


# ============================================================
# 预置模型 & 工厂函数
# ============================================================


def _preset_models() -> list[ModelInfo]:
    return [
        ModelInfo("gpt-4", "openai",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.REASONING,
                   ModelCapability.CODE, ModelCapability.CREATIVE},
                  max_tokens=8192, cost_per_1k_input=0.03, cost_per_1k_output=0.06,
                  latency_ms_avg=1200.0, quality_score=0.95, quota_remaining=10000),
        ModelInfo("gpt-4-turbo", "openai",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.REASONING,
                   ModelCapability.CODE, ModelCapability.CREATIVE, ModelCapability.FAST},
                  max_tokens=128000, cost_per_1k_input=0.01, cost_per_1k_output=0.03,
                  latency_ms_avg=600.0, quality_score=0.93, quota_remaining=50000),
        ModelInfo("gpt-3.5-turbo", "openai",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.FAST, ModelCapability.CHEAP},
                  max_tokens=4096, cost_per_1k_input=0.0005, cost_per_1k_output=0.0015,
                  latency_ms_avg=300.0, quality_score=0.7, quota_remaining=200000),
        ModelInfo("gpt-4o", "openai",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.REASONING,
                   ModelCapability.CODE, ModelCapability.CREATIVE,
                   ModelCapability.MULTIMODAL, ModelCapability.FAST},
                  max_tokens=128000, cost_per_1k_input=0.0025, cost_per_1k_output=0.01,
                  latency_ms_avg=400.0, quality_score=0.94),
        ModelInfo("claude-3-opus", "anthropic",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.REASONING,
                   ModelCapability.CODE, ModelCapability.CREATIVE,
                   ModelCapability.LONG_CONTEXT},
                  max_tokens=200000, cost_per_1k_input=0.015, cost_per_1k_output=0.075,
                  latency_ms_avg=1500.0, quality_score=0.96, quota_remaining=5000),
        ModelInfo("claude-3.5-sonnet", "anthropic",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.REASONING,
                   ModelCapability.CODE, ModelCapability.CREATIVE,
                   ModelCapability.FAST, ModelCapability.LONG_CONTEXT},
                  max_tokens=200000, cost_per_1k_input=0.003, cost_per_1k_output=0.015,
                  latency_ms_avg=450.0, quality_score=0.92),
        ModelInfo("claude-3-haiku", "anthropic",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.FAST,
                   ModelCapability.CHEAP, ModelCapability.LONG_CONTEXT},
                  max_tokens=200000, cost_per_1k_input=0.00025, cost_per_1k_output=0.00125,
                  latency_ms_avg=200.0, quality_score=0.72),
        ModelInfo("gemini-1.5-pro", "google",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.REASONING,
                   ModelCapability.CODE, ModelCapability.MULTIMODAL,
                   ModelCapability.LONG_CONTEXT},
                  max_tokens=1000000, cost_per_1k_input=0.0035, cost_per_1k_output=0.0105,
                  latency_ms_avg=700.0, quality_score=0.91),
        ModelInfo("gemini-1.5-flash", "google",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.FAST,
                   ModelCapability.CHEAP, ModelCapability.MULTIMODAL,
                   ModelCapability.LONG_CONTEXT},
                  max_tokens=1000000, cost_per_1k_input=0.000075, cost_per_1k_output=0.0003,
                  latency_ms_avg=250.0, quality_score=0.78),
        ModelInfo("llama-3-70b", "meta",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.REASONING,
                   ModelCapability.CODE, ModelCapability.CREATIVE, ModelCapability.CHEAP},
                  max_tokens=8192, cost_per_1k_input=0.00059, cost_per_1k_output=0.00079,
                  latency_ms_avg=400.0, quality_score=0.82),
        ModelInfo("mixtral-8x7b", "mistral",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.REASONING,
                   ModelCapability.CODE, ModelCapability.CHEAP, ModelCapability.FAST},
                  max_tokens=32768, cost_per_1k_input=0.00024, cost_per_1k_output=0.00024,
                  latency_ms_avg=350.0, quality_score=0.76),
        ModelInfo("deepseek-v3", "deepseek",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.REASONING,
                   ModelCapability.CODE, ModelCapability.CHEAP, ModelCapability.LONG_CONTEXT},
                  max_tokens=128000, cost_per_1k_input=0.00014, cost_per_1k_output=0.00028,
                  latency_ms_avg=500.0, quality_score=0.87),
        ModelInfo("qwen-2.5-72b", "alibaba",
                  {ModelCapability.TEXT_GENERATION, ModelCapability.REASONING,
                   ModelCapability.CODE, ModelCapability.CHEAP, ModelCapability.LONG_CONTEXT},
                  max_tokens=131072, cost_per_1k_input=0.00053, cost_per_1k_output=0.00053,
                  latency_ms_avg=380.0, quality_score=0.84),
    ]


def build_default_pool() -> ModelPool:
    pool = ModelPool()
    for m in _preset_models():
        pool.register(m)
    return pool


def build_standard_ensemble(pool: ModelPool | None = None) -> tuple[ModelPool, ModelRouter, ModelEnsemble]:
    p = pool or build_default_pool()
    router = ModelRouter(p)
    ensemble = ModelEnsemble(p)
    return p, router, ensemble
