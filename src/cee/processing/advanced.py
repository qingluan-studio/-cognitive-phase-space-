"""
CEE Processing — 高级数据处理管道扩展

新增:
  - StreamProcessor: 流式数据处理
  - ETLPipeline: 提取-转换-加载管道
  - DataCleaner: 智能数据清洗
  - FeatureEngineer: 自动特征工程
  - SchemaValidator: JSON/YAML schema校验
  - Normalizer: 多语言文本归一化
"""

from __future__ import annotations

import logging
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Generator, Iterator

import numpy as np

logger = logging.getLogger(__name__)


class ProcessingStage(Enum):
    EXTRACT = "extract"
    TRANSFORM = "transform"
    LOAD = "load"
    VALIDATE = "validate"
    ENRICH = "enrich"
    NORMALIZE = "normalize"


@dataclass
class ProcessingRecord:
    data: Any
    stage: ProcessingStage = ProcessingStage.TRANSFORM
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    original: Any = None

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0


class StreamProcessor:
    """流式处理器 — 逐记录处理大数据流"""

    def __init__(self, batch_size: int = 100):
        self.batch_size = batch_size
        self._pipeline: list[tuple[ProcessingStage, Callable]] = []
        self._stats: dict[str, int] = defaultdict(int)

    def add_stage(self, stage: ProcessingStage, fn: Callable) -> None:
        self._pipeline.append((stage, fn))

    def process_stream(self, items: Iterator[Any]) -> Generator[ProcessingRecord, None, None]:
        for item in items:
            record = ProcessingRecord(data=item, original=item)
            try:
                for stage, fn in self._pipeline:
                    record.stage = stage
                    record.data = fn(record.data)
            except Exception as e:
                record.errors.append(f"[{stage.value}] {e}")
                self._stats["errors"] += 1

            self._stats["processed"] += 1
            yield record

    def process_batch(self, items: list[Any]) -> list[ProcessingRecord]:
        results = []
        for i in range(0, len(items), self.batch_size):
            batch = items[i:i + self.batch_size]
            results.extend(list(self.process_stream(iter(batch))))
        return results

    def stats(self) -> dict[str, int]:
        return dict(self._stats)


class DataCleaner:
    """智能数据清洗器"""

    def __init__(self):
        self._cleaning_rules: list[Callable] = [
            self._strip_whitespace,
            self._normalize_unicode,
            self._remove_control_chars,
            self._fix_encoding_errors,
            self._deduplicate_lines,
        ]

    def clean(self, text: str) -> str:
        result = text
        for rule in self._cleaning_rules:
            try:
                result = rule(result)
            except Exception:
                pass
        return result

    @staticmethod
    def _strip_whitespace(text: str) -> str:
        return re.sub(r'\s+', ' ', text).strip()

    @staticmethod
    def _normalize_unicode(text: str) -> str:
        import unicodedata
        return unicodedata.normalize('NFKC', text)

    @staticmethod
    def _remove_control_chars(text: str) -> str:
        return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)

    @staticmethod
    def _fix_encoding_errors(text: str) -> str:
        return text.encode('utf-8', errors='replace').decode('utf-8')

    @staticmethod
    def _deduplicate_lines(text: str) -> str:
        lines = text.split('\n')
        seen = set()
        unique = []
        for line in lines:
            stripped = line.strip()
            if stripped and stripped not in seen:
                seen.add(stripped)
                unique.append(line)
            elif not stripped:
                unique.append(line)
        return '\n'.join(unique)


class FeatureEngineer:
    """自动特征工程"""

    def __init__(self):
        self._features: list[tuple[str, Callable]] = []

    def add_feature(self, name: str, extractor: Callable) -> None:
        self._features.append((name, extractor))

    def extract(self, text: str) -> dict[str, Any]:
        features = {
            "char_count": len(text),
            "word_count": len(text.split()),
            "avg_word_length": (
                np.mean([len(w) for w in text.split()])
                if text.split() else 0.0
            ),
            "unique_word_ratio": (
                len(set(text.lower().split())) / max(len(text.split()), 1)
            ),
            "sentence_count": len(re.findall(r'[.!?。！？]', text)),
            "has_numbers": bool(re.search(r'\d', text)),
            "has_urls": bool(re.search(r'https?://', text)),
            "uppercase_ratio": (
                sum(1 for c in text if c.isupper()) / max(len(text), 1)
            ),
        }

        for name, extractor in self._features:
            try:
                features[name] = extractor(text)
            except Exception:
                features[name] = None

        return features

    @staticmethod
    def ngram_features(text: str, n_range: tuple[int, int] = (2, 3)) -> dict[str, float]:
        features = {}
        words = text.lower().split()
        for n in range(n_range[0], n_range[1] + 1):
            if len(words) < n:
                continue
            ngrams = ["_".join(words[i:i + n]) for i in range(len(words) - n + 1)]
            unique = len(set(ngrams))
            features[f"unique_{n}grams"] = unique / max(len(ngrams), 1)
        return features


class SchemaValidator:
    """Schema校验器"""

    def __init__(self):
        self._schemas: dict[str, dict[str, Any]] = {}

    def register_schema(self, name: str, schema: dict[str, Any]) -> None:
        self._schemas[name] = schema

    def validate(self, data: Any, schema_name: str) -> dict[str, Any]:
        schema = self._schemas.get(schema_name)
        if schema is None:
            return {"valid": False, "error": f"Schema '{schema_name}' not found"}

        errors = []
        schema_type = schema.get("type", "object")

        if schema_type == "object" and isinstance(data, dict):
            errors.extend(self._validate_object(data, schema))
        elif schema_type == "array" and isinstance(data, list):
            item_schema = schema.get("items", {})
            for i, item in enumerate(data):
                errors.extend(self._validate_item(item, item_schema, f"[{i}]"))
        elif schema_type == "string" and isinstance(data, str):
            errors.extend(self._validate_string(data, schema))
        elif schema_type == "number" and isinstance(data, (int, float)):
            errors.extend(self._validate_number(data, schema))
        else:
            errors.append(f"Expected {schema_type}, got {type(data).__name__}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "schema": schema_name,
        }

    def _validate_object(self, data: dict, schema: dict) -> list[str]:
        errors = []
        required = schema.get("required", [])
        for field_name in required:
            if field_name not in data:
                errors.append(f"Missing required field: {field_name}")

        properties = schema.get("properties", {})
        for field_name, field_schema in properties.items():
            if field_name in data:
                field_type = field_schema.get("type", "string")
                value = data[field_name]
                type_map = {
                    "string": str, "number": (int, float), "integer": int,
                    "boolean": bool, "array": list, "object": dict,
                }
                expected = type_map.get(field_type)
                if expected and not isinstance(value, expected):
                    errors.append(f"Field '{field}': expected {field_type}, got {type(value).__name__}")

        return errors

    def _validate_item(self, item: Any, schema: dict, path: str) -> list[str]:
        errors = []
        if schema.get("type") == "object" and isinstance(item, dict):
            errors.extend(self._validate_object(item, schema))
        return [f"{path}: {e}" for e in errors]

    @staticmethod
    def _validate_string(data: str, schema: dict) -> list[str]:
        errors = []
        min_len = schema.get("minLength")
        max_len = schema.get("maxLength")
        pattern = schema.get("pattern")

        if min_len is not None and len(data) < min_len:
            errors.append(f"String too short: {len(data)} < {min_len}")
        if max_len is not None and len(data) > max_len:
            errors.append(f"String too long: {len(data)} > {max_len}")
        if pattern and not re.match(pattern, data):
            errors.append(f"String does not match pattern: {pattern}")

        return errors

    @staticmethod
    def _validate_number(data: float, schema: dict) -> list[str]:
        errors = []
        minimum = schema.get("minimum")
        maximum = schema.get("maximum")
        if minimum is not None and data < minimum:
            errors.append(f"Number too small: {data} < {minimum}")
        if maximum is not None and data > maximum:
            errors.append(f"Number too large: {data} > {maximum}")
        return errors


class Normalizer:
    """多语言文本归一化器"""

    _DATE_PATTERNS = [
        (re.compile(r'\d{4}年\d{1,2}月\d{1,2}日'), lambda m: m.group()),
        (re.compile(r'\d{4}-\d{2}-\d{2}'), lambda m: m.group()),
        (re.compile(r'\d{2}/\d{2}/\d{4}'), lambda m: m.group()),
    ]

    _URL_PATTERN = re.compile(r'https?://\S+')

    @staticmethod
    def normalize_whitespace(text: str) -> str:
        return re.sub(r'[\s\u3000]+', ' ', text).strip()

    @staticmethod
    def normalize_punctuation(text: str) -> str:
        replacements = {
            '，': ',', '。': '.', '！': '!', '？': '?',
            '；': ';', '：': ':', '"': '"',
            ''': "'", ''': "'", '（': '(', '）': ')',
            '【': '[', '】': ']', '《': '<', '》': '>',
        }
        result = text
        for old, new in replacements.items():
            result = result.replace(old, new)
        return result

    @staticmethod
    def normalize_numbers(text: str) -> str:
        cn_digits = {'零': '0', '一': '1', '二': '2', '三': '3', '四': '4',
                      '五': '5', '六': '6', '七': '7', '八': '8', '九': '9'}
        result = text
        for cn, digit in cn_digits.items():
            result = result.replace(cn, digit)
        return result

    @staticmethod
    def normalize_urls(text: str) -> str:
        return Normalizer._URL_PATTERN.sub('[URL]', text)

    @staticmethod
    def to_ascii(text: str) -> str:
        try:
            return text.encode('ascii', errors='ignore').decode('ascii')
        except Exception:
            return text

    def normalize(self, text: str, options: dict[str, bool] | None = None) -> str:
        options = options or {
            "whitespace": True, "punctuation": True,
            "numbers": False, "urls": True, "ascii_only": False,
        }
        result = text

        if options.get("whitespace", True):
            result = self.normalize_whitespace(result)
        if options.get("punctuation", True):
            result = self.normalize_punctuation(result)
        if options.get("numbers", False):
            result = self.normalize_numbers(result)
        if options.get("urls", True):
            result = self.normalize_urls(result)
        if options.get("ascii_only", False):
            result = self.to_ascii(result)

        return result
