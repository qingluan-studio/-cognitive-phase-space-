import time
import threading
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

@dataclass
class CacheEntry:
    key: str
    value: Any
    expiry: float = 0.0
    hit_count: int = 0
    created_at: float = field(default_factory=time.time)

    @property
    def expired(self) -> bool:
        return self.expiry > 0 and time.time() > self.expiry


class LRUCacheStore:
    def __init__(self, max_size: int = 1024, ttl_seconds: float = 300.0):
        self._store: OrderedDict[str, CacheEntry] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._lock = threading.RLock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if entry.expired:
                del self._store[key]
                return None
            self._store.move_to_end(key)
            entry.hit_count += 1
            return entry.value

    def set(self, key: str, value: Any, ttl_seconds: Optional[float] = None) -> None:
        with self._lock:
            actual_ttl = ttl_seconds if ttl_seconds is not None else self._ttl
            entry = CacheEntry(
                key=key,
                value=value,
                expiry=time.time() + actual_ttl if actual_ttl > 0 else 0,
            )
            if key in self._store:
                self._store.move_to_end(key)
            self._store[key] = entry
            while len(self._store) > self._max_size:
                self._store.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def stats(self) -> dict:
        with self._lock:
            total_hits = sum(e.hit_count for e in self._store.values())
            return {
                "size": len(self._store),
                "max_size": self._max_size,
                "total_hits": total_hits,
                "ttl": self._ttl,
            }


class ResponseCache:
    def __init__(self, max_size: int = 1024, ttl_seconds: float = 300.0):
        self._store = LRUCacheStore(max_size=max_size, ttl_seconds=ttl_seconds)

    def get_or_compute(self, key: str, computer: Callable[[], Any],
                       ttl_seconds: Optional[float] = None) -> Any:
        cached = self._store.get(key)
        if cached is not None:
            return cached
        result = computer()
        self._store.set(key, result, ttl_seconds=ttl_seconds)
        return result

    @staticmethod
    def make_key(*parts: str) -> str:
        return "::".join(str(p) for p in parts)

    def stats(self) -> dict:
        return self._store.stats()


@dataclass
class ComprehensionSummary:
    topic: str
    key_points: list[str]
    sentiment: str = "neutral"
    complexity: str = "medium"
    estimated_time_ms: float = 0.0
    source_length: int = 0


class QuickComprehension:
    KEYWORD_PATTERNS: dict[str, list[str]] = {
        "urgent": ["urgent", "asap", "immediately", "critical", "now"],
        "question": ["how", "what", "why", "when", "where", "who", "?"],
        "instruction": ["do", "run", "execute", "build", "create", "fix"],
        "analysis": ["analyze", "review", "check", "examine", "investigate"],
    }

    def __init__(self, cache: Optional[ResponseCache] = None):
        self._cache = cache or ResponseCache(max_size=512)

    def comprehend(self, text: str, context: Optional[dict] = None) -> ComprehensionSummary:
        cache_key = self._cache.make_key("comprehend", text[:200])
        cached = self._cache.get_or_compute(
            cache_key,
            lambda: self._do_comprehend(text, context),
        )
        return cached

    def _do_comprehend(self, text: str, context: Optional[dict] = None) -> ComprehensionSummary:
        start = time.time()
        text_lower = text.lower()
        key_points = self._extract_key_points(text)
        sentiment = self._detect_sentiment(text_lower)
        pattern_type = self._classify_intent(text_lower)
        elapsed_ms = (time.time() - start) * 1000
        return ComprehensionSummary(
            topic=pattern_type,
            key_points=key_points,
            sentiment=sentiment,
            complexity=self._estimate_complexity(text),
            estimated_time_ms=elapsed_ms,
            source_length=len(text),
        )

    def _extract_key_points(self, text: str) -> list[str]:
        sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]
        return sentences[:5]

    def _detect_sentiment(self, text_lower: str) -> str:
        pos = sum(1 for w in ["good", "great", "excellent", "love", "thanks"] if w in text_lower)
        neg = sum(1 for w in ["bad", "error", "fail", "broken", "bug"] if w in text_lower)
        if pos > neg:
            return "positive"
        if neg > pos:
            return "negative"
        return "neutral"

    def _classify_intent(self, text_lower: str) -> str:
        scores: dict[str, int] = {}
        for intent, keywords in self.KEYWORD_PATTERNS.items():
            scores[intent] = sum(1 for kw in keywords if kw in text_lower)
        if not scores:
            return "general"
        return max(scores, key=scores.get)

    def _estimate_complexity(self, text: str) -> str:
        length = len(text)
        if length < 100:
            return "simple"
        if length < 500:
            return "medium"
        return "complex"


@dataclass
class OutputTiming:
    phase: str
    duration_ms: float
    char_count: int = 0
    chars_per_second: float = 0.0


class SpeedOutput:
    def __init__(self, target_cps: float = 200.0):
        self._target_cps = target_cps
        self._history: list[OutputTiming] = []
        self._lock = threading.RLock()

    def record(self, phase: str, duration_ms: float, char_count: int = 0) -> OutputTiming:
        timing = OutputTiming(
            phase=phase,
            duration_ms=duration_ms,
            char_count=char_count,
            chars_per_second=char_count / (duration_ms / 1000) if duration_ms > 0 else 0.0,
        )
        with self._lock:
            self._history.append(timing)
        return timing

    def average_speed(self) -> float:
        with self._lock:
            if not self._history:
                return 0.0
            return sum(t.chars_per_second for t in self._history) / len(self._history)

    def is_fast_enough(self) -> bool:
        return self.average_speed() >= self._target_cps

    def stats(self) -> dict:
        with self._lock:
            return {
                "target_cps": self._target_cps,
                "average_cps": self.average_speed(),
                "total_phases": len(self._history),
                "fast_enough": self.is_fast_enough(),
            }

    def reset(self) -> None:
        with self._lock:
            self._history.clear()


class PerformanceProfiler:
    def __init__(self):
        self._timers: dict[str, float] = {}
        self._metrics: dict[str, list[float]] = {}
        self._lock = threading.RLock()

    def start(self, name: str) -> None:
        with self._lock:
            self._timers[name] = time.time()

    def stop(self, name: str) -> float:
        elapsed = time.time() - self._timers.pop(name, time.time())
        with self._lock:
            self._metrics.setdefault(name, []).append(elapsed)
        return elapsed * 1000

    def get_stats(self, name: str) -> dict:
        with self._lock:
            values = self._metrics.get(name, [])
            if not values:
                return {"name": name, "count": 0}
            return {
                "name": name,
                "count": len(values),
                "min_ms": min(values) * 1000,
                "max_ms": max(values) * 1000,
                "avg_ms": (sum(values) / len(values)) * 1000,
            }

    def all_stats(self) -> list[dict]:
        return [self.get_stats(name) for name in self._metrics]

    def reset(self) -> None:
        with self._lock:
            self._timers.clear()
            self._metrics.clear()


class FastResponse:
    def __init__(self):
        self._cache = ResponseCache(max_size=2048, ttl_seconds=120.0)
        self._comprehension = QuickComprehension(self._cache)
        self._output = SpeedOutput(target_cps=300.0)
        self._profiler = PerformanceProfiler()

    def respond(self, query: str, generate: Callable[[], str]) -> str:
        self._profiler.start("total_response")
        self._profiler.start("comprehension")
        summary = self._comprehension.comprehend(query)
        self._profiler.stop("comprehension")
        cache_key = self._cache.make_key("fast_response", query[:300])
        self._profiler.start("generation")
        result = self._cache.get_or_compute(cache_key, generate)
        gen_ms = self._profiler.stop("generation")
        self._output.record("generation", gen_ms, len(result))
        total_ms = self._profiler.stop("total_response")
        self._output.record("total", total_ms, len(result))
        return result

    @property
    def comprehension(self) -> QuickComprehension:
        return self._comprehension

    @property
    def output(self) -> SpeedOutput:
        return self._output

    @property
    def profiler(self) -> PerformanceProfiler:
        return self._profiler

    def stats(self) -> dict:
        return {
            "cache": self._cache.stats(),
            "output_speed": self._output.stats(),
            "profiling": self._profiler.all_stats(),
        }

    def reset(self) -> None:
        self._output.reset()
        self._profiler.reset()
