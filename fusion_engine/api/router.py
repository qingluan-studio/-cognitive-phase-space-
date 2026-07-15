"""
Dynamic router for selecting model ensembles based on task constraints.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set


class RoutingMode(Enum):
    """Enumeration of supported routing modes."""

    FAST = "fast"
    STANDARD = "standard"
    DEEP = "deep"


class TaskType(Enum):
    """High-level task categories."""

    CHAT = "chat"
    CODING = "coding"
    REASONING = "reasoning"
    CREATIVE = "creative"
    SUMMARIZATION = "summarization"
    TRANSLATION = "translation"
    CLASSIFICATION = "classification"
    EXTRACTION = "extraction"
    AGENT = "agent"


@dataclass
class ModelInfo:
    """Metadata for a single model endpoint."""

    id: str
    provider: str
    task_scores: Dict[TaskType, float] = field(default_factory=dict)
    cost_per_1k_input: float = 0.0
    cost_per_1k_output: float = 0.0
    avg_latency_ms: float = 500.0
    context_length: int = 8192
    supports_streaming: bool = True
    supports_tools: bool = False
    tags: List[str] = field(default_factory=list)

    def score_for(self, task: TaskType) -> float:
        return self.task_scores.get(task, 0.5)

    def estimated_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Return estimated cost in USD."""
        return (
            (input_tokens / 1000.0) * self.cost_per_1k_input
            + (output_tokens / 1000.0) * self.cost_per_1k_output
        )


class DynamicRouter:
    """
    Selects a subset of models given a task, budget, latency target,
    and optional blacklist/whitelist constraints.

    Modes:
      - fast:   1 model
      - standard: 3 models
      - deep:   5-7 models
    """

    DEFAULT_MODELS: List[ModelInfo] = [
        ModelInfo(
            id="gpt-4o",
            provider="openai",
            task_scores={t: 0.95 for t in TaskType},
            cost_per_1k_input=5.0,
            cost_per_1k_output=15.0,
            avg_latency_ms=600,
            context_length=128000,
            supports_streaming=True,
            supports_tools=True,
            tags=["general", "strong"],
        ),
        ModelInfo(
            id="gpt-4o-mini",
            provider="openai",
            task_scores={t: 0.85 for t in TaskType},
            cost_per_1k_input=0.15,
            cost_per_1k_output=0.60,
            avg_latency_ms=300,
            context_length=128000,
            supports_streaming=True,
            supports_tools=True,
            tags=["general", "cheap", "fast"],
        ),
        ModelInfo(
            id="deepseek-chat",
            provider="deepseek",
            task_scores={
                TaskType.CHAT: 0.90,
                TaskType.CODING: 0.92,
                TaskType.REASONING: 0.88,
                TaskType.CREATIVE: 0.80,
                TaskType.SUMMARIZATION: 0.85,
                TaskType.TRANSLATION: 0.85,
                TaskType.CLASSIFICATION: 0.82,
                TaskType.EXTRACTION: 0.84,
                TaskType.AGENT: 0.86,
            },
            cost_per_1k_input=0.14,
            cost_per_1k_output=0.28,
            avg_latency_ms=700,
            context_length=64000,
            supports_streaming=True,
            supports_tools=True,
            tags=["general", "cheap", "coding"],
        ),
        ModelInfo(
            id="deepseek-reasoner",
            provider="deepseek",
            task_scores={
                TaskType.CHAT: 0.88,
                TaskType.CODING: 0.94,
                TaskType.REASONING: 0.95,
                TaskType.CREATIVE: 0.75,
                TaskType.SUMMARIZATION: 0.82,
                TaskType.TRANSLATION: 0.80,
                TaskType.CLASSIFICATION: 0.85,
                TaskType.EXTRACTION: 0.86,
                TaskType.AGENT: 0.84,
            },
            cost_per_1k_input=0.55,
            cost_per_1k_output=2.19,
            avg_latency_ms=1200,
            context_length=64000,
            supports_streaming=True,
            supports_tools=False,
            tags=["reasoning", "coding", "strong"],
        ),
        ModelInfo(
            id="moonshot-v1-128k",
            provider="kimi",
            task_scores={t: 0.88 for t in TaskType},
            cost_per_1k_input=0.60,
            cost_per_1k_output=0.60,
            avg_latency_ms=650,
            context_length=128000,
            supports_streaming=True,
            supports_tools=True,
            tags=["general", "long_context"],
        ),
        ModelInfo(
            id="qwen-max",
            provider="qwen",
            task_scores={t: 0.90 for t in TaskType},
            cost_per_1k_input=0.50,
            cost_per_1k_output=1.00,
            avg_latency_ms=550,
            context_length=32000,
            supports_streaming=True,
            supports_tools=True,
            tags=["general", "strong"],
        ),
        ModelInfo(
            id="qwen-coder-plus",
            provider="qwen",
            task_scores={
                TaskType.CHAT: 0.82,
                TaskType.CODING: 0.93,
                TaskType.REASONING: 0.85,
                TaskType.CREATIVE: 0.78,
                TaskType.SUMMARIZATION: 0.80,
                TaskType.TRANSLATION: 0.80,
                TaskType.CLASSIFICATION: 0.81,
                TaskType.EXTRACTION: 0.83,
                TaskType.AGENT: 0.82,
            },
            cost_per_1k_input=0.20,
            cost_per_1k_output=0.60,
            avg_latency_ms=500,
            context_length=32000,
            supports_streaming=True,
            supports_tools=False,
            tags=["coding", "cheap"],
        ),
        ModelInfo(
            id="doubao-pro-128k",
            provider="doubao",
            task_scores={t: 0.87 for t in TaskType},
            cost_per_1k_input=0.50,
            cost_per_1k_output=0.80,
            avg_latency_ms=400,
            context_length=128000,
            supports_streaming=True,
            supports_tools=True,
            tags=["general", "fast"],
        ),
        ModelInfo(
            id="glm-4",
            provider="zhipu",
            task_scores={t: 0.88 for t in TaskType},
            cost_per_1k_input=1.00,
            cost_per_1k_output=1.00,
            avg_latency_ms=600,
            context_length=128000,
            supports_streaming=True,
            supports_tools=True,
            tags=["general", "agent"],
        ),
        ModelInfo(
            id="glm-4-flash",
            provider="zhipu",
            task_scores={t: 0.80 for t in TaskType},
            cost_per_1k_input=0.10,
            cost_per_1k_output=0.10,
            avg_latency_ms=300,
            context_length=128000,
            supports_streaming=True,
            supports_tools=False,
            tags=["general", "cheap", "fast"],
        ),
        ModelInfo(
            id="abab6.5s-chat",
            provider="minimax",
            task_scores={t: 0.85 for t in TaskType},
            cost_per_1k_input=0.15,
            cost_per_1k_output=0.60,
            avg_latency_ms=500,
            context_length=8192,
            supports_streaming=True,
            supports_tools=False,
            tags=["general", "cheap"],
        ),
        ModelInfo(
            id="abab6.5t-chat",
            provider="minimax",
            task_scores={t: 0.86 for t in TaskType},
            cost_per_1k_input=0.30,
            cost_per_1k_output=0.90,
            avg_latency_ms=550,
            context_length=32000,
            supports_streaming=True,
            supports_tools=False,
            tags=["general"],
        ),
    ]

    def __init__(
        self,
        models: Optional[List[ModelInfo]] = None,
        blacklist: Optional[Set[str]] = None,
        whitelist: Optional[Set[str]] = None,
        custom_scorer: Optional[Callable[[ModelInfo, TaskType, Dict[str, Any]], float]] = None,
    ) -> None:
        self.models = models if models is not None else list(self.DEFAULT_MODELS)
        self.blacklist: Set[str] = blacklist or set()
        self.whitelist: Set[str] = whitelist or set()
        self.custom_scorer = custom_scorer
        self._mode_counts: Dict[RoutingMode, int] = {
            RoutingMode.FAST: 1,
            RoutingMode.STANDARD: 3,
            RoutingMode.DEEP: 7,
        }

    def set_mode_count(self, mode: RoutingMode, count: int) -> None:
        """Override the default number of models returned for a given mode."""
        if count < 1:
            raise ValueError("Model count must be >= 1")
        self._mode_counts[mode] = count

    def _filter_models(self, require_streaming: bool = False, require_tools: bool = False) -> List[ModelInfo]:
        """Apply blacklist/whitelist and capability filters."""
        candidates: List[ModelInfo] = []
        for m in self.models:
            if m.id in self.blacklist:
                continue
            if self.whitelist and m.id not in self.whitelist:
                continue
            if require_streaming and not m.supports_streaming:
                continue
            if require_tools and not m.supports_tools:
                continue
            candidates.append(m)
        return candidates

    def _score(
        self,
        model: ModelInfo,
        task: TaskType,
        mode: RoutingMode,
        budget_usd: Optional[float],
        max_latency_ms: Optional[float],
        meta: Dict[str, Any],
    ) -> float:
        """Compute a composite score; higher is better."""
        score = model.score_for(task)

        if self.custom_scorer is not None:
            score = self.custom_scorer(model, task, meta)

        if budget_usd is not None:
            estimated = model.estimated_cost(
                meta.get("input_tokens", 1000),
                meta.get("output_tokens", 500),
            )
            if estimated > budget_usd:
                return -1.0
            score += 0.1 * (1.0 - min(estimated / max(budget_usd, 1e-6), 1.0))

        if max_latency_ms is not None:
            if model.avg_latency_ms > max_latency_ms:
                return -1.0
            score += 0.1 * (1.0 - min(model.avg_latency_ms / max(max_latency_ms, 1.0), 1.0))

        if mode == RoutingMode.FAST:
            score += 0.15 * (1.0 - min(model.avg_latency_ms / 2000.0, 1.0))
        elif mode == RoutingMode.DEEP:
            score += 0.05 * model.score_for(task)

        return score

    def route(
        self,
        task: Union[str, TaskType],
        mode: Union[str, RoutingMode] = RoutingMode.STANDARD,
        budget_usd: Optional[float] = None,
        max_latency_ms: Optional[float] = None,
        require_streaming: bool = False,
        require_tools: bool = False,
        meta: Optional[Dict[str, Any]] = None,
    ) -> List[ModelInfo]:
        """
        Return an ordered list of selected models for the given constraints.

        Args:
            task: Task type string or enum.
            mode: Routing mode string or enum.
            budget_usd: Maximum acceptable estimated cost in USD.
            max_latency_ms: Maximum acceptable latency in milliseconds.
            require_streaming: If True, drop models that do not support streaming.
            require_tools: If True, drop models that do not support tool calling.
            meta: Additional context (e.g. token estimates) for scoring.
        """
        if isinstance(task, str):
            task = TaskType(task)
        if isinstance(mode, str):
            mode = RoutingMode(mode)

        meta = meta or {}
        candidates = self._filter_models(require_streaming, require_tools)
        if not candidates:
            raise RuntimeError("No models match the given blacklist/whitelist/capability filters.")

        scored: List[tuple[float, ModelInfo]] = []
        for model in candidates:
            s = self._score(model, task, mode, budget_usd, max_latency_ms, meta)
            if s >= 0:
                scored.append((s, model))

        scored.sort(key=lambda x: x[0], reverse=True)

        count = self._mode_counts[mode]
        if mode == RoutingMode.DEEP:
            count = min(count, max(5, len(scored)))
        count = min(count, len(scored))

        selected = [model for _, model in scored[:count]]
        return selected

    def route_ids(
        self,
        task: Union[str, TaskType],
        mode: Union[str, RoutingMode] = RoutingMode.STANDARD,
        budget_usd: Optional[float] = None,
        max_latency_ms: Optional[float] = None,
        require_streaming: bool = False,
        require_tools: bool = False,
        meta: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """Convenience method returning only model IDs."""
        models = self.route(
            task=task,
            mode=mode,
            budget_usd=budget_usd,
            max_latency_ms=max_latency_ms,
            require_streaming=require_streaming,
            require_tools=require_tools,
            meta=meta,
        )
        return [m.id for m in models]

    def add_model(self, model: ModelInfo) -> None:
        """Register a new model into the router pool."""
        for existing in self.models:
            if existing.id == model.id:
                raise ValueError(f"Model {model.id} already registered.")
        self.models.append(model)

    def remove_model(self, model_id: str) -> None:
        """Remove a model from the router pool."""
        self.models = [m for m in self.models if m.id != model_id]

    def update_blacklist(self, model_ids: List[str]) -> None:
        """Replace the current blacklist."""
        self.blacklist = set(model_ids)

    def update_whitelist(self, model_ids: List[str]) -> None:
        """Replace the current whitelist."""
        self.whitelist = set(model_ids)

    def get_model_by_id(self, model_id: str) -> Optional[ModelInfo]:
        """Lookup a registered model by its ID."""
        for m in self.models:
            if m.id == model_id:
                return m
        return None
