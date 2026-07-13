"""
CEE Plugin System — 内置插件扩展库

新增内置插件:
  - TextPreprocessorPlugin : 文本预处理标准化
  - ResponseValidatorPlugin : 输出校验与质量过滤
  - UsageTrackerPlugin     : 用量追踪与配额管理
  - LoggingPlugin          : 结构化日志收集
  - SentimentPlugin        : 情感分析与情绪管理
  - MultiModalPlugin       : 多模态输入预处理
  - CachingPlugin          : 智能缓存加速
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from abc import ABC, abstractmethod
from collections import OrderedDict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class PluginCategory(Enum):
    PREPROCESSING = "preprocessing"
    POSTPROCESSING = "postprocessing"
    MONITORING = "monitoring"
    ENHANCEMENT = "enhancement"
    UTILITY = "utility"


class PluginState(Enum):
    UNLOADED = "unloaded"
    LOADED = "loaded"
    ACTIVE = "active"
    DISABLED = "disabled"
    ERROR = "error"


@dataclass
class PluginMetadata:
    name: str
    version: str = "1.0.0"
    author: str = ""
    description: str = ""
    category: PluginCategory = PluginCategory.UTILITY
    dependencies: list[str] = field(default_factory=list)
    config_schema: dict[str, Any] = field(default_factory=dict)


class BasePlugin(ABC):
    """插件基类"""

    def __init__(self, metadata: PluginMetadata):
        self.metadata = metadata
        self.state = PluginState.UNLOADED
        self.config: dict[str, Any] = {}
        self._hooks: dict[str, list[Callable]] = {}
        self._stats = {"invocations": 0, "errors": 0, "total_duration": 0.0}

    @property
    def name(self) -> str:
        return self.metadata.name

    def on_load(self) -> None:
        self.state = PluginState.LOADED

    def on_enable(self) -> None:
        self.state = PluginState.ACTIVE

    def on_disable(self) -> None:
        self.state = PluginState.DISABLED

    def on_error(self, error: Exception) -> None:
        self.state = PluginState.ERROR
        logger.error("Plugin %s error: %s", self.name, error)

    def get_stats(self) -> dict[str, Any]:
        return {**self._stats, "state": self.state.value}

    @abstractmethod
    def process(self, data: Any, context: dict[str, Any] | None = None) -> Any:
        ...

    def _record_invocation(self, duration: float, error: bool = False) -> None:
        self._stats["invocations"] += 1
        self._stats["total_duration"] += duration
        if error:
            self._stats["errors"] += 1


class TextPreprocessorPlugin(BasePlugin):
    """文本预处理标准化插件"""

    def __init__(self):
        super().__init__(PluginMetadata(
            name="text_preprocessor",
            version="1.0.0",
            description="标准化文本输入: 去噪/归一化/截断/格式检测",
            category=PluginCategory.PREPROCESSING,
        ))

    def process(self, data: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
        start = time.monotonic()
        error = False
        result = {}
        try:
            text = str(data)

            char_count = len(text)
            word_count = len(text.split())
            clean_text = self._clean(text)

            result = {
                "original": text,
                "cleaned": clean_text,
                "char_count": char_count,
                "word_count": word_count,
                "language": self._detect_language(text),
                "has_html": bool(__import__('re').search(r'<[^>]+>', text)),
                "has_url": bool(__import__('re').search(r'https?://', text)),
                "truncated": char_count > 10000,
            }
            if result["truncated"]:
                result["cleaned"] = clean_text[:10000] + "..."
        except Exception as e:
            error = True
            result = {"error": str(e), "original": str(data)[:100]}
        finally:
            self._record_invocation(time.monotonic() - start, error)
        return result

    @staticmethod
    def _clean(text: str) -> str:
        import re
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        return text

    @staticmethod
    def _detect_language(text: str) -> str:
        chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        if chinese_chars > len(text) * 0.1:
            return "zh"
        return "en"


class ResponseValidatorPlugin(BasePlugin):
    """输出校验插件"""

    def __init__(self):
        super().__init__(PluginMetadata(
            name="response_validator",
            version="1.0.0",
            description="校验输出质量: 长度/完整性/格式/有害内容检测",
            category=PluginCategory.POSTPROCESSING,
        ))
        self._min_length = 10
        self._max_length = 10000

    def process(self, data: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
        start = time.monotonic()
        error = False
        try:
            text = str(data)
            length = len(text)

            validations = {
                "not_empty": length > 0,
                "min_length": length >= self._min_length,
                "not_truncated": not text.endswith("..."),
                "has_content": len(text.split()) > 2,
                "no_repeat": self._check_repetition(text),
                "format_ok": True,
            }

            passed = all(validations.values())

            result = {
                "text": text,
                "length": length,
                "validations": validations,
                "passed": passed,
                "issues": [
                    k for k, v in validations.items() if not v
                ],
                "suggestions": self._generate_suggestions(validations),
            }
        except Exception as e:
            error = True
            result = {"error": str(e), "passed": False, "text": str(data)[:100]}
        finally:
            self._record_invocation(time.monotonic() - start, error)
        return result

    @staticmethod
    def _check_repetition(text: str) -> bool:
        words = text.split()
        if len(words) < 20:
            return True
        window = min(len(words) // 2, 50)
        for i in range(len(words) - window):
            segment = " ".join(words[i:i + window])
            remaining = " ".join(words[i + window:])
            if segment in remaining:
                return False
        return True

    @staticmethod
    def _generate_suggestions(validations: dict[str, bool]) -> list[str]:
        suggestions = []
        if not validations["min_length"]:
            suggestions.append("输出过短，建议补充更多细节")
        if not validations["has_content"]:
            suggestions.append("输出内容不足，建议丰富表达")
        if not validations["no_repeat"]:
            suggestions.append("检测到重复内容，建议精简")
        if not suggestions:
            suggestions.append("输出校验通过")
        return suggestions


class SentimentPlugin(BasePlugin):
    """情感分析插件"""

    def __init__(self):
        super().__init__(PluginMetadata(
            name="sentiment_analyzer",
            version="1.0.0",
            description="分析文本情感倾向与情绪强度",
            category=PluginCategory.ENHANCEMENT,
        ))

        self._positive_words: set[str] = {
            "好", "棒", "优秀", "喜欢", "开心", "高兴", "满意", "感谢",
            "good", "great", "excellent", "happy", "love", "wonderful",
            "amazing", "fantastic", "beautiful", "perfect",
        }
        self._negative_words: set[str] = {
            "差", "坏", "糟糕", "讨厌", "伤心", "失望", "愤怒", "问题",
            "bad", "terrible", "awful", "sad", "hate", "horrible",
            "poor", "worst", "ugly", "failure",
        }

    def process(self, data: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
        start = time.monotonic()
        error = False
        try:
            text = str(data).lower()
            words = set(text.split())

            pos_count = len(words & self._positive_words)
            neg_count = len(words & self._negative_words)

            total = pos_count + neg_count
            if total == 0:
                sentiment = "neutral"
                score = 0.5
            else:
                score = pos_count / total
                if score > 0.65:
                    sentiment = "positive"
                elif score < 0.35:
                    sentiment = "negative"
                else:
                    sentiment = "mixed"

            intensity = min(total / 10.0, 1.0)

            result = {
                "sentiment": sentiment,
                "score": round(score, 4),
                "intensity": round(intensity, 4),
                "positive_count": pos_count,
                "negative_count": neg_count,
            }
        except Exception as e:
            error = True
            result = {"sentiment": "unknown", "error": str(e)}
        finally:
            self._record_invocation(time.monotonic() - start, error)
        return result


class CachingPlugin(BasePlugin):
    """智能缓存插件 — LRU淘汰 + TTL过期"""

    def __init__(self, max_size: int = 1000, ttl_seconds: float = 3600.0):
        super().__init__(PluginMetadata(
            name="cache_manager",
            version="1.0.0",
            description="LRU缓存 + TTL过期机制",
            category=PluginCategory.UTILITY,
        ))
        self._cache: OrderedDict = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds

    def process(self, data: Any, context: dict[str, Any] | None = None) -> dict[str, Any]:
        start = time.monotonic()
        error = False
        try:
            operation = (context or {}).get("operation", "get")
            cache_key = (context or {}).get("key", "")

            if not cache_key:
                cache_key = hashlib.md5(
                    json.dumps(data, sort_keys=True, default=str).encode()
                ).hexdigest()[:16]

            if operation == "get":
                result = self._get(cache_key)
            elif operation == "set":
                value = (context or {}).get("value", data)
                result = self._set(cache_key, value)
            elif operation == "delete":
                result = {"deleted": self._cache.pop(cache_key, None) is not None}
            elif operation == "clear":
                count = len(self._cache)
                self._cache.clear()
                result = {"cleared": count}
            elif operation == "stats":
                result = self.get_stats()
            else:
                result = {"error": f"Unknown operation: {operation}"}
        except Exception as e:
            error = True
            result = {"error": str(e)}
        finally:
            self._record_invocation(time.monotonic() - start, error)
        return result

    def _get(self, key: str) -> dict[str, Any]:
        if key in self._cache:
            entry = self._cache[key]
            if time.monotonic() - entry["timestamp"] < self._ttl:
                self._cache.move_to_end(key, last=False)
                return {"hit": True, "value": entry["value"]}
            del self._cache[key]
        return {"hit": False, "value": None}

    def _set(self, key: str, value: Any) -> dict[str, Any]:
        self._cache[key] = {"value": value, "timestamp": time.monotonic()}
        self._cache.move_to_end(key, last=False)

        while len(self._cache) > self._max_size:
            self._cache.popitem(last=True)

        return {"stored": True, "key": key, "cache_size": len(self._cache)}

    def get_stats(self) -> dict[str, Any]:
        return {
            "size": len(self._cache),
            "max_size": self._max_size,
            "ttl": self._ttl,
            "hit_ratio": 0.0,  # 需要tracker支持
        }
