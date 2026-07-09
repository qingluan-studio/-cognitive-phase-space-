"""CEE Processing — Data pipeline engine for ETL and transformation chains."""

from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable


class PipelineStage(Enum):
    EXTRACT = "extract"
    TRANSFORM = "transform"
    LOAD = "load"
    VALIDATE = "validate"
    ENRICH = "enrich"
    FILTER = "filter"
    AGGREGATE = "aggregate"
    EXPORT = "export"


class DataSource(Enum):
    TEXT = "text"
    JSON = "json"
    CSV = "csv"
    XML = "xml"
    DATABASE = "database"
    API = "api"
    FILE = "file"
    STREAM = "stream"


@dataclass
class PipelineStep:
    name: str
    stage: PipelineStage
    handler: Callable[[Any], Any]
    config: dict[str, Any] = field(default_factory=dict)
    enabled: bool = True
    retry_count: int = 1
    timeout: float = 30.0

    def execute(self, data: Any) -> Any:
        if callable(self.handler):
            return self.handler(data)
        return data


@dataclass
class PipelineResult:
    pipeline_name: str
    input_size: int
    output_size: int
    steps_executed: int
    steps_failed: int
    duration: float
    error_messages: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class DataPipeline:
    """Composable data processing pipeline for ETL operations.

    Supports chained stages: extract → transform → validate → enrich → load.
    Each stage can have multiple steps executed sequentially.
    """

    def __init__(self, name: str = "default") -> None:
        self.name = name
        self._steps: list[PipelineStep] = []
        self._loaded_data: Any = None
        self._history: list[PipelineResult] = []

    def add_step(self, step: PipelineStep) -> "DataPipeline":
        self._steps.append(step)
        return self

    def add_extractor(self, name: str, handler: Callable, **config: Any) -> "DataPipeline":
        return self.add_step(PipelineStep(name, PipelineStage.EXTRACT, handler, config))

    def add_transformer(self, name: str, handler: Callable, **config: Any) -> "DataPipeline":
        return self.add_step(PipelineStep(name, PipelineStage.TRANSFORM, handler, config))

    def add_validator(self, name: str, handler: Callable, **config: Any) -> "DataPipeline":
        return self.add_step(PipelineStep(name, PipelineStage.VALIDATE, handler, config))

    def add_filter(self, name: str, handler: Callable, **config: Any) -> "DataPipeline":
        return self.add_step(PipelineStep(name, PipelineStage.FILTER, handler, config))

    def add_enricher(self, name: str, handler: Callable, **config: Any) -> "DataPipeline":
        return self.add_step(PipelineStep(name, PipelineStage.ENRICH, handler, config))

    def add_loader(self, name: str, handler: Callable, **config: Any) -> "DataPipeline":
        return self.add_step(PipelineStep(name, PipelineStage.LOAD, handler, config))

    def remove_step(self, name: str) -> bool:
        before = len(self._steps)
        self._steps = [s for s in self._steps if s.name != name]
        return len(self._steps) < before

    def clear_steps(self) -> None:
        self._steps.clear()

    def run(self, initial_data: Any = None) -> PipelineResult:
        import time
        start = time.time()
        data = initial_data
        input_size = self._measure_size(data)
        steps_exec = 0
        steps_fail = 0
        errors: list[str] = []
        for step in self._steps:
            if not step.enabled:
                continue
            try:
                data = step.execute(data)
                steps_exec += 1
            except Exception as e:
                steps_fail += 1
                errors.append(f"[{step.name}] {e}")
                for _ in range(step.retry_count - 1):
                    try:
                        data = step.execute(data)
                        steps_fail -= 1
                        errors.pop()
                        steps_exec += 1
                        break
                    except Exception:
                        pass
        self._loaded_data = data
        result = PipelineResult(
            pipeline_name=self.name,
            input_size=input_size,
            output_size=self._measure_size(data),
            steps_executed=steps_exec,
            steps_failed=steps_fail,
            duration=time.time() - start,
            error_messages=errors,
        )
        self._history.append(result)
        return result

    def get_data(self) -> Any:
        return self._loaded_data

    def get_history(self) -> list[PipelineResult]:
        return list(self._history)

    def _measure_size(self, data: Any) -> int:
        if data is None:
            return 0
        if isinstance(data, str):
            return len(data)
        if isinstance(data, (list, tuple, set)):
            return len(data)
        if isinstance(data, dict):
            return len(data)
        return 1


class TextTransformer:
    """Built-in text transformation functions for data pipelines."""

    @staticmethod
    def normalize_whitespace(text: str) -> str:
        return re.sub(r'\s+', ' ', text).strip()

    @staticmethod
    def remove_html_tags(text: str) -> str:
        return re.sub(r'<[^>]+>', '', text)

    @staticmethod
    def extract_emails(text: str) -> list[str]:
        return re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)

    @staticmethod
    def extract_urls(text: str) -> list[str]:
        return re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+', text)

    @staticmethod
    def extract_numbers(text: str) -> list[float]:
        nums = re.findall(r'-?\d+\.?\d*', text)
        return [float(n) for n in nums]

    @staticmethod
    def split_sections(text: str, delimiter: str = "\n\n") -> list[str]:
        return [s.strip() for s in text.split(delimiter) if s.strip()]

    @staticmethod
    def truncate(text: str, max_length: int = 1000, suffix: str = "...") -> str:
        if len(text) <= max_length:
            return text
        return text[:max_length - len(suffix)] + suffix

    @staticmethod
    def anonymize_emails(text: str) -> str:
        return re.sub(
            r'([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})',
            r'[EMAIL]@\2',
            text,
        )

    @staticmethod
    def anonymize_phones(text: str) -> str:
        return re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', text)


class JsonProcessor:
    """JSON data processing utilities for pipelines."""

    @staticmethod
    def flatten(data: dict, sep: str = ".", prefix: str = "") -> dict:
        items: dict[str, Any] = {}
        for k, v in data.items():
            key = f"{prefix}{sep}{k}" if prefix else k
            if isinstance(v, dict):
                items.update(JsonProcessor.flatten(v, sep, key))
            elif isinstance(v, list):
                for i, item in enumerate(v):
                    items[f"{key}[{i}]"] = item
            else:
                items[key] = v
        return items

    @staticmethod
    def filter_keys(data: dict, keys: list[str]) -> dict:
        return {k: v for k, v in data.items() if k in keys}

    @staticmethod
    def exclude_keys(data: dict, keys: list[str]) -> dict:
        return {k: v for k, v in data.items() if k not in keys}

    @staticmethod
    def rename_keys(data: dict, mapping: dict[str, str]) -> dict:
        result: dict[str, Any] = {}
        for k, v in data.items():
            result[mapping.get(k, k)] = v
        return result

    @staticmethod
    def sort_by(data: list[dict], key: str, reverse: bool = False) -> list[dict]:
        return sorted(data, key=lambda x: x.get(key, 0), reverse=reverse)

    @staticmethod
    def group_by(data: list[dict], key: str) -> dict[str, list[dict]]:
        groups: dict[str, list[dict]] = {}
        for item in data:
            group_key = str(item.get(key, "unknown"))
            groups.setdefault(group_key, []).append(item)
        return groups
