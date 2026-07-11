from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional


@dataclass
class MetricsSnapshot:
    total_requests: int = 0
    total_errors: int = 0
    error_rate: float = 0.0
    avg_response_ms: float = 0.0
    p50_response_ms: float = 0.0
    p95_response_ms: float = 0.0
    p99_response_ms: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0
    cache_hit_rate: float = 0.0
    total_tokens: int = 0
    concurrent_connections: int = 0
    engine_stats: dict[str, dict[str, Any]] = field(default_factory=dict)
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_requests": self.total_requests,
            "total_errors": self.total_errors,
            "error_rate": round(self.error_rate, 4),
            "avg_response_ms": round(self.avg_response_ms, 1),
            "p50_response_ms": round(self.p50_response_ms, 1),
            "p95_response_ms": round(self.p95_response_ms, 1),
            "p99_response_ms": round(self.p99_response_ms, 1),
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_rate": round(self.cache_hit_rate, 4),
            "total_tokens": self.total_tokens,
            "concurrent_connections": self.concurrent_connections,
            "engine_stats": self.engine_stats,
            "generated_at": self.generated_at,
        }


class MetricsCollector:
    MAX_RESPONSE_WINDOW = 10000

    def __init__(self) -> None:
        self._request_count: int = 0
        self._error_count: int = 0
        self._response_times: deque[float] = deque(maxlen=self.MAX_RESPONSE_WINDOW)
        self._cache_hits: int = 0
        self._cache_misses: int = 0
        self._total_tokens: int = 0
        self._concurrent: int = 0
        self._engine_calls: dict[str, int] = defaultdict(int)
        self._engine_times: dict[str, float] = defaultdict(float)
        self._engine_errors: dict[str, int] = defaultdict(int)

    def record_request(self, response_ms: float, success: bool = True) -> None:
        self._request_count += 1
        self._response_times.append(response_ms)
        if not success:
            self._error_count += 1

    def record_cache_hit(self) -> None:
        self._cache_hits += 1

    def record_cache_miss(self) -> None:
        self._cache_misses += 1

    def record_tokens(self, count: int) -> None:
        self._total_tokens += count

    def record_engine_call(self, engine_name: str, elapsed_ms: float, success: bool = True) -> None:
        self._engine_calls[engine_name] += 1
        self._engine_times[engine_name] += elapsed_ms
        if not success:
            self._engine_errors[engine_name] += 1

    def set_concurrent(self, count: int) -> None:
        self._concurrent = count

    def inc_concurrent(self) -> None:
        self._concurrent += 1

    def dec_concurrent(self) -> None:
        self._concurrent = max(0, self._concurrent - 1)

    def snapshot(self) -> MetricsSnapshot:
        req = max(self._request_count, 1)
        cache_total = max(self._cache_hits + self._cache_misses, 1)
        engine_stats: dict[str, dict[str, Any]] = {}
        for name in self._engine_calls:
            calls = self._engine_calls[name]
            engine_stats[name] = {
                "calls": calls,
                "total_time_ms": round(self._engine_times[name], 2),
                "avg_time_ms": round(self._engine_times[name] / max(calls, 1), 2),
                "errors": self._engine_errors.get(name, 0),
            }

        sorted_times = sorted(self._response_times) if self._response_times else [0.0]
        n = len(sorted_times)

        return MetricsSnapshot(
            total_requests=self._request_count,
            total_errors=self._error_count,
            error_rate=self._error_count / req,
            avg_response_ms=sum(self._response_times) / max(len(self._response_times), 1),
            p50_response_ms=sorted_times[int(n * 0.50)] if n > 0 else 0,
            p95_response_ms=sorted_times[int(n * 0.95)] if n > 1 else sorted_times[0],
            p99_response_ms=sorted_times[int(n * 0.99)] if n > 1 else sorted_times[0],
            cache_hits=self._cache_hits,
            cache_misses=self._cache_misses,
            cache_hit_rate=self._cache_hits / cache_total,
            total_tokens=self._total_tokens,
            concurrent_connections=self._concurrent,
            engine_stats=engine_stats,
        )

    def reset(self) -> None:
        self._request_count = 0
        self._error_count = 0
        self._response_times.clear()
        self._cache_hits = 0
        self._cache_misses = 0
        self._total_tokens = 0
        self._concurrent = 0
        self._engine_calls.clear()
        self._engine_times.clear()
        self._engine_errors.clear()

    def to_prometheus(self) -> str:
        snap = self.snapshot()
        lines = [
            "# HELP cee_requests_total Total number of requests",
            "# TYPE cee_requests_total counter",
            f"cee_requests_total {snap.total_requests}",
            "# HELP cee_errors_total Total number of errors",
            "# TYPE cee_errors_total counter",
            f"cee_errors_total {snap.total_errors}",
            "# HELP cee_response_time_avg_ms Average response time in milliseconds",
            "# TYPE cee_response_time_avg_ms gauge",
            f"cee_response_time_avg_ms {snap.avg_response_ms:.1f}",
            "# HELP cee_cache_hit_rate Cache hit rate",
            "# TYPE cee_cache_hit_rate gauge",
            f"cee_cache_hit_rate {snap.cache_hit_rate:.4f}",
            "# HELP cee_tokens_total Total tokens consumed",
            "# TYPE cee_tokens_total counter",
            f"cee_tokens_total {snap.total_tokens}",
            "# HELP cee_concurrent_connections Current concurrent connections",
            "# TYPE cee_concurrent_connections gauge",
            f"cee_concurrent_connections {snap.concurrent_connections}",
        ]
        for name, stats in snap.engine_stats.items():
            engine_label = name.replace("-", "_").replace(" ", "_")
            lines.append(f"# HELP cee_engine_{engine_label}_calls Engine call count")
            lines.append(f"# TYPE cee_engine_{engine_label}_calls counter")
            lines.append(f"cee_engine_{engine_label}_calls {stats['calls']}")
        return "\n".join(lines) + "\n"

    @property
    def total_requests(self) -> int:
        return self._request_count

    @property
    def total_errors(self) -> int:
        return self._error_count

    @property
    def cache_hit_rate(self) -> float:
        total = self._cache_hits + self._cache_misses
        return self._cache_hits / max(total, 1)
