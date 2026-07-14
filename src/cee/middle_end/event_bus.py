"""
事件总线 - Event Bus

核心理念:
  事件总线是中端各子系统之间的"神经系统"。每个子系统既是事件的生产者，
  也是事件的消费者。通过发布-订阅模式实现松耦合的协同工作:

  AlarmClock   --+                  +--> Router
  HumanHands   --+                  +--> Profiler
  Orchestrator --+--> EventBus -->--+--> WaterLogic
  Cognition    --+                  +--> KnowledgeGraph
  Router       --+                  +--> ToolRegistry
  Triangle     --+

  事件总线特性:
  - 同步/异步发布
  - 通配符主题匹配
  - 事件溯源与回放
  - 死信队列与重试
  - 指标采集
  - 中间件链

双轨制:
  - 工程版: 线程安全的事件总线实现
  - 理论版: 事件溯源 + CQRS 模式
"""

from __future__ import annotations

import collections
import logging
import re
import threading
import time
import uuid
from collections import deque
from concurrent.futures import ThreadPoolExecutor, Future
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Pattern

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# EventType
# ---------------------------------------------------------------------------


class EventType(Enum):
    REQUEST_RECEIVED = "request_received"
    PRE_PROCESSED = "pre_processed"
    POST_PROCESSED = "post_processed"
    RESPONSE_GENERATED = "response_generated"
    ERROR_OCCURRED = "error_occurred"
    SECURITY_ALERT = "security_alert"
    RATE_LIMITED = "rate_limited"
    MODEL_SWITCHED = "model_switched"
    CACHE_HIT = "cache_hit"
    CACHE_MISS = "cache_miss"
    PIPELINE_STAGE_START = "pipeline_stage_start"
    PIPELINE_STAGE_END = "pipeline_stage_end"
    SYSTEM_HEARTBEAT = "system_heartbeat"
    CONFIG_CHANGED = "config_changed"
    SHUTDOWN_INITIATED = "shutdown_initiated"


# ---------------------------------------------------------------------------
# Event
# ---------------------------------------------------------------------------


@dataclass
class Event:
    event_type: EventType
    source: str
    timestamp: float = field(default_factory=time.time)
    payload: dict[str, Any] = field(default_factory=dict)
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    correlation_id: str = ""

    def __post_init__(self) -> None:
        if not self.correlation_id:
            self.correlation_id = str(uuid.uuid4())

    @property
    def topic(self) -> str:
        return self.event_type.value

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_type": self.event_type.value,
            "source": self.source,
            "timestamp": self.timestamp,
            "payload": self.payload,
            "event_id": self.event_id,
            "correlation_id": self.correlation_id,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Event:
        return cls(
            event_type=EventType(data["event_type"]),
            source=data["source"],
            timestamp=data["timestamp"],
            payload=data.get("payload", {}),
            event_id=data["event_id"],
            correlation_id=data.get("correlation_id", ""),
        )


# ---------------------------------------------------------------------------
# EventHandler
# ---------------------------------------------------------------------------


@dataclass
class EventHandler:
    callback: Callable[[Event], None]
    priority: int = 0
    topic_filter: str = "*"
    source_filter: str | None = None
    handler_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def matches(self, event: Event) -> bool:
        if self.source_filter is not None and self.source_filter != event.source:
            return False
        return TopicRouter.match(self.topic_filter, event.topic)

    def __call__(self, event: Event) -> None:
        self.callback(event)

    def __hash__(self) -> int:
        return hash(self.handler_id)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, EventHandler):
            return False
        return self.handler_id == other.handler_id


# ---------------------------------------------------------------------------
# TopicRouter
# ---------------------------------------------------------------------------


class TopicRouter:
    _compiled_patterns: dict[str, Pattern[str]] = {}
    _patterns_lock: threading.Lock = threading.Lock()

    @classmethod
    def match(cls, pattern: str, topic: str) -> bool:
        if pattern == "*":
            return True
        if pattern == topic:
            return True
        if pattern.endswith(".*"):
            prefix = pattern[:-2]
            return topic == prefix or topic.startswith(prefix + ".")
        if pattern.startswith("*."):
            suffix = pattern[2:]
            return topic.endswith("." + suffix)
        if "/" in pattern:
            return cls._match_hierarchy(pattern, topic)
        if "*" in pattern or "?" in pattern or "[" in pattern:
            return cls._match_glob(pattern, topic)
        if pattern.startswith("^") or pattern.endswith("$"):
            return cls._match_regex(pattern, topic)
        return False

    @classmethod
    def _match_hierarchy(cls, pattern: str, topic: str) -> bool:
        pattern_parts = pattern.split("/")
        topic_parts = topic.split("/")
        p_len = len(pattern_parts)
        t_len = len(topic_parts)

        if pattern_parts[-1] == "#":
            p_len -= 1
            if t_len < p_len:
                return False
        elif pattern_parts[-1] == "*":
            p_len -= 1
            if t_len > p_len + 1:
                return False
        elif pattern_parts[-1] == ">":
            p_len -= 1
            if t_len <= p_len:
                return False
        elif t_len != p_len:
            return False

        match_len = min(p_len, t_len)
        for i in range(match_len):
            pp = pattern_parts[i]
            tp = topic_parts[i]
            if pp == "*":
                continue
            if pp != tp:
                return False
        return True

    @classmethod
    def _match_glob(cls, pattern: str, topic: str) -> bool:
        import fnmatch
        return fnmatch.fnmatch(topic, pattern)

    @classmethod
    def _match_regex(cls, pattern: str, topic: str) -> bool:
        with cls._patterns_lock:
            compiled = cls._compiled_patterns.get(pattern)
            if compiled is None:
                compiled = re.compile(pattern)
                if len(cls._compiled_patterns) > 256:
                    cls._compiled_patterns.clear()
                cls._compiled_patterns[pattern] = compiled
        return bool(compiled.match(topic))


# ---------------------------------------------------------------------------
# EventStore (Ring Buffer)
# ---------------------------------------------------------------------------


@dataclass
class EventRecord:
    event: Event
    sequence: int
    recorded_at: float = field(default_factory=time.time)
    handler_results: list[tuple[str, str, float]] = field(default_factory=list)


class EventStore:
    def __init__(self, max_size: int = 1000) -> None:
        self._max_size = max_size
        self._ring: deque[EventRecord] = deque(maxlen=max_size)
        self._sequence: int = 0
        self._lock = threading.Lock()
        self._type_index: dict[EventType, list[int]] = collections.defaultdict(list)
        self._correlation_index: dict[str, list[int]] = collections.defaultdict(list)

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._ring)

    def append(self, event: Event) -> None:
        with self._lock:
            self._sequence += 1
            seq = self._sequence
            record = EventRecord(event=event, sequence=seq)
            self._ring.append(record)
            self._type_index[event.event_type].append(seq)
            if event.correlation_id:
                self._correlation_index[event.correlation_id].append(seq)
            self._trim_indices()

    def _trim_indices(self) -> None:
        if len(self._ring) == 0:
            return
        min_seq = self._ring[0].sequence
        for typ in list(self._type_index.keys()):
            self._type_index[typ] = [s for s in self._type_index[typ] if s >= min_seq]
            if not self._type_index[typ]:
                del self._type_index[typ]
        for cid in list(self._correlation_index.keys()):
            self._correlation_index[cid] = [
                s for s in self._correlation_index[cid] if s >= min_seq
            ]
            if not self._correlation_index[cid]:
                del self._correlation_index[cid]

    def query(
        self,
        event_type: EventType | None = None,
        correlation_id: str | None = None,
        start_time: float | None = None,
        end_time: float | None = None,
        limit: int = 100,
    ) -> list[EventRecord]:
        results: list[EventRecord] = []
        with self._lock:
            for record in self._ring:
                if event_type is not None and record.event.event_type != event_type:
                    continue
                if correlation_id is not None and record.event.correlation_id != correlation_id:
                    continue
                if start_time is not None and record.event.timestamp < start_time:
                    continue
                if end_time is not None and record.event.timestamp > end_time:
                    continue
                results.append(record)
                if len(results) >= limit:
                    break
        return results

    def get_by_sequence(self, sequence: int) -> EventRecord | None:
        with self._lock:
            for record in self._ring:
                if record.sequence == sequence:
                    return record
        return None

    def get_recent(self, count: int = 100) -> list[EventRecord]:
        with self._lock:
            items = list(self._ring)
            return items[-count:] if len(items) > count else items

    def replay(
        self,
        handler: Callable[[Event], None],
        event_type: EventType | None = None,
        correlation_id: str | None = None,
        start_sequence: int = 0,
    ) -> int:
        count = 0
        with self._lock:
            for record in self._ring:
                if record.sequence <= start_sequence:
                    continue
                if event_type is not None and record.event.event_type != event_type:
                    continue
                if correlation_id is not None and record.event.correlation_id != correlation_id:
                    continue
                try:
                    handler(record.event)
                    count += 1
                except Exception:
                    logger.exception("Replay handler failed for event %s", record.event.event_id)
        return count

    def record_handler_result(
        self, event_id: str, handler_id: str, status: str, latency: float
    ) -> None:
        with self._lock:
            for record in self._ring:
                if record.event.event_id == event_id:
                    record.handler_results.append((handler_id, status, latency))
                    return


# ---------------------------------------------------------------------------
# DeadLetterQueue
# ---------------------------------------------------------------------------


@dataclass
class DeadLetterEntry:
    event: Event
    handler_id: str
    error: str
    attempt: int = 0
    first_failed_at: float = field(default_factory=time.time)
    last_failed_at: float = field(default_factory=time.time)
    next_retry_at: float = 0.0


class DeadLetterQueue:
    def __init__(
        self,
        max_retries: int = 3,
        base_backoff: float = 1.0,
        max_backoff: float = 60.0,
        capacity: int = 500,
    ) -> None:
        self._max_retries = max_retries
        self._base_backoff = base_backoff
        self._max_backoff = max_backoff
        self._capacity = capacity
        self._queue: deque[DeadLetterEntry] = deque()
        self._lock = threading.Lock()

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._queue)

    def push(self, entry: DeadLetterEntry) -> None:
        with self._lock:
            if len(self._queue) >= self._capacity:
                self._queue.popleft()
            self._queue.append(entry)

    def get_pending(self, now: float | None = None) -> list[DeadLetterEntry]:
        if now is None:
            now = time.time()
        pending: list[DeadLetterEntry] = []
        with self._lock:
            candidates = list(self._queue)
        for entry in candidates:
            if entry.attempt >= self._max_retries:
                continue
            if entry.next_retry_at <= now:
                pending.append(entry)
        return pending

    def mark_succeeded(self, event_id: str, handler_id: str) -> None:
        with self._lock:
            self._queue = deque(
                e
                for e in self._queue
                if not (e.event.event_id == event_id and e.handler_id == handler_id)
            )

    def mark_retried(self, event_id: str, handler_id: str) -> DeadLetterEntry | None:
        with self._lock:
            for entry in self._queue:
                if entry.event.event_id == event_id and entry.handler_id == handler_id:
                    entry.attempt += 1
                    entry.last_failed_at = time.time()
                    if entry.attempt < self._max_retries:
                        backoff = min(
                            self._base_backoff * (2 ** (entry.attempt - 1)),
                            self._max_backoff,
                        )
                        entry.next_retry_at = time.time() + backoff
                        logger.warning(
                            "Dead letter retry #%d for %s/%s, next in %.1fs",
                            entry.attempt,
                            event_id,
                            handler_id,
                            backoff,
                        )
                    else:
                        logger.error(
                            "Dead letter exhausted for %s/%s after %d retries",
                            event_id,
                            handler_id,
                            entry.attempt,
                        )
                    return entry
        return None

    @property
    def exhausted(self) -> list[DeadLetterEntry]:
        with self._lock:
            return [e for e in self._queue if e.attempt >= self._max_retries]


# ---------------------------------------------------------------------------
# MetricsCollector
# ---------------------------------------------------------------------------


@dataclass
class MetricsSnapshot:
    events_per_second: float = 0.0
    handler_latency_p50_ms: float = 0.0
    handler_latency_p99_ms: float = 0.0
    error_rate_per_type: dict[str, float] = field(default_factory=dict)
    queue_depth: int = 0
    dead_letter_count: int = 0
    handler_count: int = 0
    total_events_processed: int = 0
    taken_at: float = field(default_factory=time.time)


class MetricsCollector:
    def __init__(self, window_seconds: float = 60.0) -> None:
        self._window = window_seconds
        self._lock = threading.Lock()
        self._event_times: deque[float] = deque()
        self._handler_latencies: list[float] = []
        self._errors_by_type: dict[str, int] = collections.defaultdict(int)
        self._success_by_type: dict[str, int] = collections.defaultdict(int)
        self._total_processed: int = 0
        self._queue_depth_snapshots: deque[float] = deque()
        self._dead_letter_count: int = 0

    def record_event(self) -> None:
        with self._lock:
            now = time.time()
            self._event_times.append(now)
            while self._event_times and self._event_times[0] < now - self._window:
                self._event_times.popleft()
            self._total_processed += 1

    def record_handler_latency(self, latency_ms: float) -> None:
        with self._lock:
            self._handler_latencies.append(latency_ms)
            if len(self._handler_latencies) > 10000:
                self._handler_latencies = self._handler_latencies[-5000:]

    def record_error(self, event_type: str) -> None:
        with self._lock:
            self._errors_by_type[event_type] += 1

    def record_success(self, event_type: str) -> None:
        with self._lock:
            self._success_by_type[event_type] += 1

    def record_queue_depth(self, depth: int) -> None:
        with self._lock:
            self._queue_depth_snapshots.append(float(depth))
            if len(self._queue_depth_snapshots) > 1000:
                self._queue_depth_snapshots = deque(
                    list(self._queue_depth_snapshots)[-500:], maxlen=1000
                )

    def set_dead_letter_count(self, count: int) -> None:
        with self._lock:
            self._dead_letter_count = count

    @property
    def events_per_second(self) -> float:
        with self._lock:
            now = time.time()
            while self._event_times and self._event_times[0] < now - self._window:
                self._event_times.popleft()
            if not self._event_times:
                return 0.0
            elapsed = now - self._event_times[0]
            return len(self._event_times) / elapsed if elapsed > 0 else 0.0

    def _percentile(self, values: list[float], pct: float) -> float:
        if not values:
            return 0.0
        sorted_vals = sorted(values)
        index = int(len(sorted_vals) * pct / 100.0)
        index = min(index, len(sorted_vals) - 1)
        return sorted_vals[index]

    def get_error_rate(self, event_type: str) -> float:
        with self._lock:
            total = self._success_by_type.get(event_type, 0) + self._errors_by_type.get(
                event_type, 0
            )
            if total == 0:
                return 0.0
            return self._errors_by_type.get(event_type, 0) / total

    def snapshot(self) -> MetricsSnapshot:
        with self._lock:
            latencies = list(self._handler_latencies)
            depth = self._queue_depth_snapshots[-1] if self._queue_depth_snapshots else 0.0
            error_rates: dict[str, float] = {}
            all_types = set(self._errors_by_type.keys()) | set(self._success_by_type.keys())
            for typ in all_types:
                error_rates[typ] = self.get_error_rate(typ)
            return MetricsSnapshot(
                events_per_second=self.events_per_second,
                handler_latency_p50_ms=self._percentile(latencies, 50),
                handler_latency_p99_ms=self._percentile(latencies, 99),
                error_rate_per_type=error_rates,
                queue_depth=int(depth),
                dead_letter_count=self._dead_letter_count,
                total_events_processed=self._total_processed,
            )


# ---------------------------------------------------------------------------
# EventMiddleware
# ---------------------------------------------------------------------------


class EventMiddleware:
    def process(self, event: Event, next_handler: Callable[[Event], None]) -> None:
        raise NotImplementedError


class LoggingMiddleware(EventMiddleware):
    def __init__(self, log_level: int = logging.DEBUG) -> None:
        self._log_level = log_level

    def process(self, event: Event, next_handler: Callable[[Event], None]) -> None:
        logger.log(
            self._log_level,
            "Event %s from %s (id=%s corr=%s)",
            event.event_type.value,
            event.source,
            event.event_id[:8],
            event.correlation_id[:8],
        )
        next_handler(event)


class MetricsMiddleware(EventMiddleware):
    def __init__(self, collector: MetricsCollector | None = None) -> None:
        self._collector = collector

    def process(self, event: Event, next_handler: Callable[[Event], None]) -> None:
        start = time.time()
        try:
            next_handler(event)
            if self._collector:
                self._collector.record_success(event.event_type.value)
        except Exception as exc:
            if self._collector:
                self._collector.record_error(event.event_type.value)
            raise exc
        finally:
            elapsed_ms = (time.time() - start) * 1000.0
            if self._collector:
                self._collector.record_handler_latency(elapsed_ms)


class RateLimitingMiddleware(EventMiddleware):
    def __init__(self, max_per_second: float = 100.0) -> None:
        self._max_per_second = max_per_second
        self._tokens = max_per_second
        self._last_refill = time.time()
        self._lock = threading.Lock()

    def _refill(self) -> None:
        now = time.time()
        elapsed = now - self._last_refill
        self._tokens = min(self._max_per_second, self._tokens + elapsed * self._max_per_second)
        self._last_refill = now

    def process(self, event: Event, next_handler: Callable[[Event], None]) -> None:
        with self._lock:
            self._refill()
            if self._tokens >= 1.0:
                self._tokens -= 1.0
                next_handler(event)
            else:
                logger.warning("Rate limited event type=%s source=%s", event.event_type.value, event.source)


class MiddlewareChain(EventMiddleware):
    def __init__(self, middlewares: list[EventMiddleware] | None = None) -> None:
        self._middlewares: list[EventMiddleware] = middlewares or []

    def add(self, middleware: EventMiddleware) -> None:
        self._middlewares.append(middleware)

    def process(self, event: Event, next_handler: Callable[[Event], None]) -> None:
        chain: list[EventMiddleware] = list(self._middlewares)

        def _dispatch(idx: int) -> None:
            if idx < len(chain):
                chain[idx].process(event, lambda e: _dispatch(idx + 1))
            else:
                next_handler(event)

        _dispatch(0)


# ---------------------------------------------------------------------------
# EventBus
# ---------------------------------------------------------------------------


class EventBus:
    def __init__(
        self,
        name: str = "default",
        store_max_size: int = 1000,
        dlq_max_retries: int = 3,
        dlq_base_backoff: float = 1.0,
        max_workers: int = 4,
    ) -> None:
        self._name = name
        self._handlers: dict[str, list[EventHandler]] = collections.defaultdict(list)
        self._handlers_lock = threading.RLock()
        self._store = EventStore(max_size=store_max_size)
        self._dead_letter_queue = DeadLetterQueue(
            max_retries=dlq_max_retries,
            base_backoff=dlq_base_backoff,
        )
        self._metrics = MetricsCollector()
        self._middleware_chain = MiddlewareChain()
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="evbus")
        self._running = True
        self._retry_interval = 5.0
        self._retry_scheduled: bool = False
        self._retry_lock = threading.Lock()
        self._default_middlewares_installed: bool = False

    # --- properties ---

    @property
    def name(self) -> str:
        return self._name

    @property
    def store(self) -> EventStore:
        return self._store

    @property
    def dead_letter_queue(self) -> DeadLetterQueue:
        return self._dead_letter_queue

    @property
    def metrics(self) -> MetricsCollector:
        return self._metrics

    # --- middleware setup ---

    def _ensure_default_middlewares(self) -> None:
        if self._default_middlewares_installed:
            return
        self._middleware_chain.add(LoggingMiddleware())
        self._middleware_chain.add(MetricsMiddleware(self._metrics))
        self._default_middlewares_installed = True

    def add_middleware(self, middleware: EventMiddleware) -> None:
        self._middleware_chain.add(middleware)

    def set_middleware_chain(self, chain: MiddlewareChain) -> None:
        self._middleware_chain = chain

    # --- subscription ---

    def subscribe(
        self,
        topic: str,
        handler_callback: Callable[[Event], None],
        priority: int = 0,
        source_filter: str | None = None,
    ) -> EventHandler:
        handler = EventHandler(
            callback=handler_callback,
            priority=priority,
            topic_filter=topic,
            source_filter=source_filter,
        )
        with self._handlers_lock:
            self._handlers[topic].append(handler)
            self._handlers[topic].sort(key=lambda h: -h.priority)
        logger.debug(
            "Subscribed handler %s to topic '%s' priority=%d",
            handler.handler_id[:8],
            topic,
            priority,
        )
        return handler

    def unsubscribe(self, handler_or_id: EventHandler | str) -> bool:
        handler_id = handler_or_id if isinstance(handler_or_id, str) else handler_or_id.handler_id
        removed = False
        with self._handlers_lock:
            for topic in list(self._handlers.keys()):
                before = len(self._handlers[topic])
                self._handlers[topic] = [
                    h for h in self._handlers[topic] if h.handler_id != handler_id
                ]
                if len(self._handlers[topic]) < before:
                    removed = True
                if not self._handlers[topic]:
                    del self._handlers[topic]
        return removed

    # --- matching ---

    def _get_matching_handlers(self, event: Event) -> list[EventHandler]:
        matching: list[EventHandler] = []
        with self._handlers_lock:
            for topic_filter, handlers in self._handlers.items():
                if TopicRouter.match(topic_filter, event.topic):
                    for handler in handlers:
                        if handler.matches(event):
                            matching.append(handler)
        matching.sort(key=lambda h: -h.priority)
        return matching

    # --- publish (sync) ---

    def publish(self, event: Event) -> int:
        if not self._running:
            logger.warning("EventBus '%s' is stopped, ignoring event", self._name)
            return 0

        self._metrics.record_event()

        self._ensure_default_middlewares()
        handlers = self._get_matching_handlers(event)

        dispatched = 0
        event_id = event.event_id

        for handler in handlers:
            try:

                def _make_invoke(h: EventHandler, e: Event) -> Callable[[Event], None]:
                    def _invoke(_: Event) -> None:
                        nonlocal dispatched
                        start_ts = time.time()
                        try:
                            h(e)
                            status = "ok"
                        except Exception as exc:
                            status = "error"
                            dlq_entry = DeadLetterEntry(
                                event=e,
                                handler_id=h.handler_id,
                                error=str(exc),
                            )
                            dlq_entry.next_retry_at = time.time() + self._dead_letter_queue._base_backoff
                            self._dead_letter_queue.push(dlq_entry)
                            self._schedule_retry()
                            logger.exception(
                                "Handler %s failed for event %s", h.handler_id[:8], e.event_id[:8]
                            )
                        finally:
                            elapsed = (time.time() - start_ts) * 1000.0
                            self._store.record_handler_result(
                                event_id, h.handler_id, status, elapsed
                            )

                    return _invoke

                invoker = _make_invoke(handler, event)
                self._middleware_chain.process(event, invoker)
                dispatched += 1
            except Exception:
                logger.exception("Middleware chain failed for handler %s", handler.handler_id[:8])

        self._store.append(event)
        self._metrics.set_dead_letter_count(self._dead_letter_queue.size)

        if dispatched == 0:
            logger.debug("No handlers matched event %s (topic=%s)", event.event_id[:8], event.topic)

        return dispatched

    # --- publish async ---

    def publish_async(self, event: Event) -> Future[int]:
        return self._executor.submit(self.publish, event)

    # --- retry ---

    def _schedule_retry(self) -> None:
        with self._retry_lock:
            if self._retry_scheduled:
                return
            self._retry_scheduled = True
        self._executor.submit(self._retry_loop)

    def _retry_loop(self) -> None:
        while self._running:
            pending = self._dead_letter_queue.get_pending()
            if not pending:
                with self._retry_lock:
                    self._retry_scheduled = False
                return
            for entry in pending:
                if not self._running:
                    return
                handler = self._find_handler_by_id(entry.handler_id)
                if handler is None:
                    self._dead_letter_queue.mark_succeeded(
                        entry.event.event_id, entry.handler_id
                    )
                    continue
                try:
                    handler(entry.event)
                    self._dead_letter_queue.mark_succeeded(
                        entry.event.event_id, entry.handler_id
                    )
                    logger.info(
                        "Dead letter retry succeeded for %s/%s",
                        entry.event.event_id[:8],
                        entry.handler_id[:8],
                    )
                except Exception:
                    self._dead_letter_queue.mark_retried(
                        entry.event.event_id, entry.handler_id
                    )
            time.sleep(self._retry_interval)

    def _find_handler_by_id(self, handler_id: str) -> EventHandler | None:
        with self._handlers_lock:
            for handlers in self._handlers.values():
                for h in handlers:
                    if h.handler_id == handler_id:
                        return h
        return None

    # --- lifecycle ---

    @property
    def running(self) -> bool:
        return self._running

    def shutdown(self, wait: bool = True) -> None:
        logger.info("Shutting down EventBus '%s'", self._name)
        self._running = False
        self._executor.shutdown(wait=wait)

    # --- introspection ---

    def handler_count(self) -> int:
        with self._handlers_lock:
            return sum(len(h) for h in self._handlers.values())

    def topic_count(self) -> int:
        with self._handlers_lock:
            return len(self._handlers)

    def list_topics(self) -> list[str]:
        with self._handlers_lock:
            return sorted(self._handlers.keys())

    def list_handlers(self) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        with self._handlers_lock:
            for topic_filter, handlers in self._handlers.items():
                for h in handlers:
                    result.append(
                        {
                            "handler_id": h.handler_id,
                            "topic_filter": topic_filter,
                            "priority": h.priority,
                            "source_filter": h.source_filter,
                        }
                    )
        return result

    def snapshot(self) -> dict[str, Any]:
        metrics_snap = self._metrics.snapshot()
        return {
            "name": self._name,
            "running": self._running,
            "handler_count": self.handler_count(),
            "topic_count": self.topic_count(),
            "store_size": self._store.size,
            "dead_letter_size": self._dead_letter_queue.size,
            "dead_letter_exhausted": len(self._dead_letter_queue.exhausted),
            "events_per_second": round(metrics_snap.events_per_second, 2),
            "handler_latency_p50_ms": round(metrics_snap.handler_latency_p50_ms, 2),
            "handler_latency_p99_ms": round(metrics_snap.handler_latency_p99_ms, 2),
            "total_events_processed": metrics_snap.total_events_processed,
        }


# ---------------------------------------------------------------------------
# Dual-Track Theory
# ---------------------------------------------------------------------------

"""
理论版: 事件溯源 + CQRS

工程版 EventBus 适合中端内子系统间的实时通信。在理论层面，事件总线
可以扩展为完整的事件溯源(Event Sourcing)架构，配合命令查询职责分离
(CQRS)实现更高级的数据一致性模型。

事件溯源(Event Sourcing):
  - 不直接修改聚合根的状态，而是将所有状态变更建模为不可变事件
  - 聚合根的当前状态 = 折叠(fold)所有历史事件
  - EventStore 的 ring buffer 可以扩展为 append-only event log
  - 每次状态查询都从 event log 回放重建，天然支持审计和时间旅行

CQRS:
  - 命令侧(Write Side): 验证命令，生成事件，写入 event log
  - 查询侧(Read Side): 订阅事件，构建投影(projection)，提供优化查询
  - EventBus 作为命令侧和查询侧之间的异步桥梁
  - 查询侧的投影可以针对不同用例分别优化(关系型视图、全文搜索、缓存)

自组织临界性:
  - 大量子系统通过 EventBus 互联，形成复杂网络
  - 事件流速的波动类似沙堆模型，小事件可能触发级联效应
  - 中端通过限流中间件(RateLimitingMiddleware)维持系统在临界态附近
  - 这是"可控混沌"——系统既不死寂(完全隔离)也不爆炸(完全耦合)

耗散结构:
  - 中端是远离平衡态的开放系统，持续与外界交换信息
  - EventBus 是信息流的通道，维持系统的非平衡稳态
  - 死信队列(DeadLetterQueue)是系统的"废物排出"机制
  - 指标采集(MetricsCollector)是系统的"自我感知"机制
"""


# Event Sourcing Aggregates


@dataclass
class AggregateRoot:
    aggregate_id: str
    aggregate_type: str
    version: int = 0
    _pending_events: list[Event] = field(default_factory=list, repr=False)

    def apply_event(self, event: Event) -> None:
        self.version += 1
        self._pending_events.append(event)

    def collect_events(self) -> list[Event]:
        events = list(self._pending_events)
        self._pending_events.clear()
        return events


class Projection:
    def __init__(self, name: str) -> None:
        self._name = name
        self._state: dict[str, Any] = {}

    @property
    def name(self) -> str:
        return self._name

    def handle(self, event: Event) -> None:
        raise NotImplementedError

    @property
    def state(self) -> dict[str, Any]:
        return dict(self._state)


class CQRSStateMachine:
    """
    概念性 CQRS 状态机: 演示命令如何生成事件、事件如何更新投影。
    实际生产环境可扩展为真正的 event sourcing + CQRS 框架。
    """

    def __init__(self, event_bus: EventBus) -> None:
        self._event_bus = event_bus
        self._aggregates: dict[str, AggregateRoot] = {}
        self._projections: dict[str, Projection] = {}

    def register_aggregate(self, aggregate: AggregateRoot) -> None:
        self._aggregates[aggregate.aggregate_id] = aggregate

    def register_projection(self, projection: Projection) -> None:
        self._projections[projection.name] = projection
        self._event_bus.subscribe(
            topic="*",
            handler_callback=projection.handle,
        )

    def dispatch_command(self, aggregate_id: str, command: dict[str, Any]) -> list[Event]:
        aggregate = self._aggregates.get(aggregate_id)
        if aggregate is None:
            raise KeyError(f"Aggregate '{aggregate_id}' not found")
        events: list[Event] = []
        event_type = EventType(command.get("type", "request_received"))
        event = Event(
            event_type=event_type,
            source="cqrs.command",
            payload={**command, "aggregate_id": aggregate_id, "version": aggregate.version + 1},
            correlation_id=command.get("correlation_id", ""),
        )
        aggregate.apply_event(event)
        events.append(event)
        collected = aggregate.collect_events()
        for evt in collected:
            self._event_bus.publish(evt)
            events.append(evt)
        return events

    def rebuild_projections(self, event_bus: EventBus) -> None:
        for projection in self._projections.values():
            projection._state.clear()
        stored_events = event_bus.store.query(limit=100000)
        for record in stored_events:
            for projection in self._projections.values():
                try:
                    projection.handle(record.event)
                except Exception:
                    logger.exception(
                        "Projection %s failed on event %s",
                        projection.name,
                        record.event.event_id[:8],
                    )


# ---------------------------------------------------------------------------
# Singleton Factory
# ---------------------------------------------------------------------------


_bus_registry: dict[str, EventBus] = {}
_bus_registry_lock = threading.Lock()
_bus_default_name = "default"


def get_event_bus(name: str | None = None, **kwargs: Any) -> EventBus:
    bus_name = name or _bus_default_name
    with _bus_registry_lock:
        if bus_name not in _bus_registry:
            _bus_registry[bus_name] = EventBus(name=bus_name, **kwargs)
            logger.info("Created EventBus '%s'", bus_name)
        return _bus_registry[bus_name]


def reset_event_bus_registry() -> None:
    with _bus_registry_lock:
        for bus in _bus_registry.values():
            bus.shutdown(wait=False)
        _bus_registry.clear()


def list_event_buses() -> list[dict[str, Any]]:
    with _bus_registry_lock:
        return [
            {"name": name, "running": bus.running, "handler_count": bus.handler_count()}
            for name, bus in _bus_registry.items()
        ]
