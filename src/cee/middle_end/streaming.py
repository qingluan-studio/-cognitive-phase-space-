"""
流式处理引擎 - Streaming Engine

LLM 流式输出的中端处理管道:
  流式数据(SSE/Chunked/WebSocket) --> StreamBuffer(缓冲/断句) 
  --> StreamHandler(格式化/分发) --> StreamMerger(多流合并) 
  --> StreamController(流控) --> ResponseCollector(汇聚)

双轨制:
  - 工程版: 基于生成器/异步的实用流式管道
  - 理论版: 文本生成的信息论模型, 基于熵率与信道容量

核心理念:
  流式不是简单的逐字推送，而是面向人类阅读体验的智能分块:
  - 按句子边界断句 (Sentence boundary chunking)
  - 按 token 数量限制分片
  - 按时间窗口刷新 (Time-based flush)
  - 合并策略消除碎块
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import re
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Generator, Iterator, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. StreamMode 枚举
# ---------------------------------------------------------------------------


class StreamMode(Enum):
    """流式传输模式"""
    SSE = "sse"
    CHUNKED = "chunked"
    WEBSOCKET = "websocket"
    POLLING = "polling"
    CALLBACK = "callback"

    @property
    def is_push(self) -> bool:
        return self in (StreamMode.SSE, StreamMode.WEBSOCKET, StreamMode.CHUNKED)

    @property
    def is_pull(self) -> bool:
        return self in (StreamMode.POLLING, StreamMode.CALLBACK)

    @property
    def theory_channel_type(self) -> str:
        """理论轨道: 从信息论角度对信道分类"""
        return {
            StreamMode.SSE: "simplex_digital",
            StreamMode.CHUNKED: "block_coded",
            StreamMode.WEBSOCKET: "full_duplex",
            StreamMode.POLLING: "discrete_observation",
            StreamMode.CALLBACK: "event_driven",
        }[self]


# ---------------------------------------------------------------------------
# 2. StreamChunk 数据类
# ---------------------------------------------------------------------------


@dataclass
class StreamChunk:
    """流式数据块。每个 chunk 代表一次推送的数据单元。"""
    content: str
    is_final: bool = False
    chunk_index: int = 0
    token_count: int = 0
    latency_ms: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)

    def __repr__(self) -> str:
        return (f"StreamChunk(idx={self.chunk_index}, tokens={self.token_count}, "
                f"final={self.is_final}, len={len(self.content)})")


# ---------------------------------------------------------------------------
# 辅助: 句子边界检测
# ---------------------------------------------------------------------------

_SENTENCE_END_PATTERN = re.compile(
    r'[。！？；\n](?![\s\S]*[。！？；\n])|'
    r'(?<=[.!?;])\s+(?=[A-Z])|'
    r'(?<=\n)(?=[^\s])',
    re.MULTILINE,
)


def _find_sentence_boundaries(text: str) -> list[int]:
    """检测文本中的句子边界位置,返回切割点索引列表。"""
    boundaries: list[int] = []
    for ch in ('.', '!', '?', ';'):
        idx = 0
        while True:
            idx = text.find(ch, idx)
            if idx == -1:
                break
            boundaries.append(idx + 1)
            idx += 1
    for pattern in (r'[。！？；]', r'\n(?=\S)'):
        for m in re.finditer(pattern, text):
            bp = m.end()
            boundaries.append(bp)
    return sorted(set(boundaries))


# ---------------------------------------------------------------------------
# 3. StreamBuffer
# ---------------------------------------------------------------------------


class BufferFlushStrategy(Enum):
    TOKEN_COUNT = "token_count"
    TIME_INTERVAL = "time_interval"
    SENTENCE_BOUNDARY = "sentence_boundary"
    FORCE = "force"


@dataclass
class StreamBuffer:
    """流式缓冲区: 累积分块,按策略刷新输出。

    默认三态刷新策略:
      - token 累积达到阈值 -> 输出
      - 时间间隔超过阈值 -> 输出
      - 遇到句子边界 -> 输出

    Theory: 缓冲区是 Shannon 编码器的实现,将 token 流打包为最优传输单元。
      刷新策略 = 寻找编码块边界使得传输效率 E = H / L 最大化,
      其中 H 为块内信息量, L 为块长度(含协议头开销)。
    """

    max_tokens: int = 64
    flush_interval_s: float = 0.5
    enable_sentence_boundary: bool = True
    min_chunk_tokens: int = 1

    _buffer: deque[str] = field(default_factory=deque)
    _token_count: int = field(default=0, init=False)
    _last_flush_time: float = field(default_factory=time.time, init=False)
    _current_sentence: str = field(default="", init=False)

    def push(self, text: str, estimated_tokens: Optional[int] = None) -> list[str]:
        """推入文本,返回可以刷新的块列表。

        Args:
            text: 增量文本
            estimated_tokens: 估算 token 数,未提供时按字符/2.5 估算
        """
        est = estimated_tokens or max(1, len(text) // 3)
        self._buffer.append(text)
        self._token_count += est
        self._current_sentence += text

        flushed: list[str] = []

        if self.enable_sentence_boundary and self._current_sentence:
            boundaries = _find_sentence_boundaries(self._current_sentence)
            if boundaries:
                consumed = 0
                for bp in sorted(boundaries):
                    chunk = self._current_sentence[consumed:bp]
                    if chunk.strip():
                        flushed.append(chunk)
                        consumed = bp
                    if len(flushed) >= 1:
                        break
                if consumed > 0:
                    self._current_sentence = self._current_sentence[consumed:]
                    # 句子边界触发时仅输出该句子,不消耗 token 计数
                    return flushed

        now = time.time()
        if self._token_count >= self.max_tokens or \
           (now - self._last_flush_time) >= self.flush_interval_s:
            if self._token_count >= self.min_chunk_tokens:
                flushed.append(self._drain_buffer())
                self._current_sentence = ""
            self._last_flush_time = now
            self._token_count = 0

        return flushed

    def flush(self, force: bool = False) -> list[str]:
        """强制刷新缓冲区中所有剩余内容。"""
        result: list[str] = []
        if self._token_count > 0 or force:
            drained = self._drain_buffer()
            if drained.strip():
                result.append(drained)
            self._token_count = 0
            self._last_flush_time = time.time()
        if self._current_sentence.strip():
            result.append(self._current_sentence)
            self._current_sentence = ""
        return result

    def _drain_buffer(self) -> str:
        joined = "".join(self._buffer)
        self._buffer.clear()
        return joined

    def clear(self) -> None:
        self._buffer.clear()
        self._token_count = 0
        self._current_sentence = ""
        self._last_flush_time = time.time()

    @property
    def pending_tokens(self) -> int:
        return self._token_count

    @property
    def pending_text(self) -> str:
        return "".join(self._buffer)

    @property
    def idle_ms(self) -> float:
        return (time.time() - self._last_flush_time) * 1000


# ---------------------------------------------------------------------------
# 4. StreamHandler
# ---------------------------------------------------------------------------


class StreamHandler:
    """流式数据处理器: 将原始文本流转换为 StreamChunk 序列。

    支持三种输出格式:
      - generator: Python 生成器, 逐个产出 StreamChunk
      - sse: Server-Sent Events 格式 (data: {...}\n\n)
      - json_stream: 换行分隔 JSON (NDJSON)
    """

    def __init__(self, mode: StreamMode = StreamMode.SSE,
                 buffer_config: Optional[dict[str, Any]] = None) -> None:
        self._mode = mode
        buf_cfg = buffer_config or {}
        self._buffer = StreamBuffer(
            max_tokens=buf_cfg.get("max_tokens", 64),
            flush_interval_s=buf_cfg.get("flush_interval_s", 0.5),
            enable_sentence_boundary=buf_cfg.get("enable_sentence_boundary", True),
            min_chunk_tokens=buf_cfg.get("min_chunk_tokens", 1),
        )
        self._chunk_index = 0
        self._total_tokens = 0
        self._start_time = time.time()

    def feed(self, text: str, estimated_tokens: int = 0,
             metadata: Optional[dict[str, Any]] = None) -> Generator[StreamChunk, None, None]:
        """喂入原始文本增量,产出 StreamChunk。"""
        est = estimated_tokens or max(1, len(text) // 3)
        flushed_texts = self._buffer.push(text, est)
        for ft in flushed_texts:
            tk = max(1, len(ft) // 3)
            self._total_tokens += tk
            now = time.time()
            yield StreamChunk(
                content=ft,
                is_final=False,
                chunk_index=self._chunk_index,
                token_count=tk,
                latency_ms=(now - self._start_time) * 1000,
                metadata=dict(metadata or {}),
            )
            self._chunk_index += 1

    def finalize(self, metadata: Optional[dict[str, Any]] = None) -> Generator[StreamChunk, None, None]:
        """结束流,产出剩余缓冲和最终块。"""
        final_texts = self._buffer.flush(force=True)
        for ft in final_texts:
            tk = max(1, len(ft) // 3)
            self._total_tokens += tk
            yield StreamChunk(
                content=ft,
                is_final=False,
                chunk_index=self._chunk_index,
                token_count=tk,
                latency_ms=(time.time() - self._start_time) * 1000,
                metadata=dict(metadata or {}),
            )
            self._chunk_index += 1
        yield StreamChunk(
            content="",
            is_final=True,
            chunk_index=self._chunk_index,
            token_count=0,
            latency_ms=(time.time() - self._start_time) * 1000,
            metadata=dict(metadata or {}),
        )

    def process(self, text_stream: Iterator[str],
                estimated_tokens_per_item: Optional[Callable[[str], int]] = None,
                metadata: Optional[dict[str, Any]] = None) -> Generator[StreamChunk, None, None]:
        """处理整个文本迭代器,产出全生命周期 StreamChunk。"""
        for item in text_stream:
            est = estimated_tokens_per_item(item) if estimated_tokens_per_item else max(1, len(item) // 3)
            yield from self.feed(item, est, metadata)
        yield from self.finalize(metadata)

    @staticmethod
    def to_sse(chunk: StreamChunk) -> str:
        """将 StreamChunk 转为 SSE 格式字符串。"""
        payload = json.dumps({
            "content": chunk.content,
            "is_final": chunk.is_final,
            "chunk_index": chunk.chunk_index,
            "token_count": chunk.token_count,
            "latency_ms": round(chunk.latency_ms, 2),
        }, ensure_ascii=False)
        return f"data: {payload}\n\n"

    @staticmethod
    def to_json_stream(chunk: StreamChunk) -> str:
        """将 StreamChunk 转为 NDJSON 格式字符串。"""
        return json.dumps({
            "content": chunk.content,
            "is_final": chunk.is_final,
            "chunk_index": chunk.chunk_index,
            "token_count": chunk.token_count,
            "latency_ms": round(chunk.latency_ms, 2),
        }, ensure_ascii=False) + "\n"

    @staticmethod
    def format_chunks(chunks: Iterator[StreamChunk],
                      fmt: str = "generator") -> Any:
        """按指定格式输出 chunk 序列。

        Args:
            chunks: StreamChunk 迭代器
            fmt: "generator" | "sse" | "json_stream"

        Returns:
            如果是 generator,返回原迭代器; 否则返回格式化的字符串生成器
        """
        if fmt == "sse":
            return (StreamHandler.to_sse(c) for c in chunks)
        elif fmt == "json_stream":
            return (StreamHandler.to_json_stream(c) for c in chunks)
        return chunks

    def reset(self) -> None:
        self._buffer.clear()
        self._chunk_index = 0
        self._total_tokens = 0
        self._start_time = time.time()

    @property
    def total_tokens(self) -> int:
        return self._total_tokens

    @property
    def mode(self) -> StreamMode:
        return self._mode


# ---------------------------------------------------------------------------
# 5. StreamMerger
# ---------------------------------------------------------------------------


class MergeStrategy(Enum):
    ROUND_ROBIN = "round_robin"
    PRIORITY = "priority"
    INTERLEAVING = "interleaving"


@dataclass
class StreamMerger:
    """多流合并器: 将多个输入流合并为单一输出流。

    合并策略:
      - round_robin: 轮询各输入流,循环取出
      - priority: 按优先级排序,优先处理高优先级流
      - interleaving: 按时间戳交织,保持各流间的时序

    Theory: 多流合并 = 多信道多路复用 (Multiplexing)。
      在信息论框架中, k 个独立生成的 token 流 X1,...,Xk
      的总熵率为 sum_i H(Xi|X<1:i-1)。
      合并器的目标是最大化信息吞吐率同时保持可读性。
    """

    strategy: MergeStrategy = MergeStrategy.ROUND_ROBIN
    max_buffer_per_stream: int = 256
    backpressure_limit: int = 512

    _streams: dict[str, deque[StreamChunk]] = field(default_factory=dict)
    _priorities: dict[str, int] = field(default_factory=dict)
    _drained: set[str] = field(default_factory=set)
    _total_buffered: int = field(default=0, init=False)

    def register(self, stream_id: str, priority: int = 0) -> None:
        self._streams[stream_id] = deque()
        self._priorities[stream_id] = priority

    def push(self, stream_id: str, chunk: StreamChunk) -> bool:
        """向指定流推入一个 chunk。超出背压限制时返回 False。"""
        if stream_id not in self._streams:
            self.register(stream_id)
        if self._total_buffered >= self.backpressure_limit:
            return False
        self._streams[stream_id].append(chunk)
        self._total_buffered += 1
        if chunk.is_final:
            self._drained.add(stream_id)
        return True

    def pull(self) -> Optional[StreamChunk]:
        """按合并策略取一个 chunk。无数据时返回 None。"""
        if self.strategy == MergeStrategy.ROUND_ROBIN:
            return self._round_robin_pull()
        elif self.strategy == MergeStrategy.PRIORITY:
            return self._priority_pull()
        elif self.strategy == MergeStrategy.INTERLEAVING:
            return self._interleaving_pull()
        return None

    def _round_robin_pull(self) -> Optional[StreamChunk]:
        for sid, q in self._streams.items():
            if q:
                chunk = q.popleft()
                self._total_buffered -= 1
                return chunk
        return None

    def _priority_pull(self) -> Optional[StreamChunk]:
        ordered = sorted(self._streams.items(),
                         key=lambda kv: self._priorities.get(kv[0], 0), reverse=True)
        for sid, q in ordered:
            if q:
                chunk = q.popleft()
                self._total_buffered -= 1
                return chunk
        return None

    def _interleaving_pull(self) -> Optional[StreamChunk]:
        candidates = [chunk for q in self._streams.values() for chunk in ([q[0]] if q else [])]
        if not candidates:
            return None
        selected = min(candidates, key=lambda c: c.latency_ms)
        for sid, q in self._streams.items():
            if q and q[0] is selected:
                self._total_buffered -= 1
                return q.popleft()
        return None

    def merge_all(self, timeout_s: float = 0.0) -> Generator[StreamChunk, None, None]:
        """持续拉取合并后的流,直到所有输入流都已耗尽。

        Args:
            timeout_s: 超时秒数, 0 表示不等待直接结束
        """
        wait_until = time.time() + timeout_s if timeout_s > 0 else 0
        while self._total_buffered > 0 or \
              len(self._drained) < len(self._streams):
            chunk = self.pull()
            if chunk is not None:
                yield chunk
            elif timeout_s > 0:
                if time.time() >= wait_until:
                    break
                time.sleep(0.01)
            else:
                break

    def reset(self) -> None:
        self._streams.clear()
        self._priorities.clear()
        self._drained.clear()
        self._total_buffered = 0

    @property
    def buffered_count(self) -> int:
        return self._total_buffered

    @property
    def active_streams(self) -> int:
        return len(self._streams) - len(self._drained)


# ---------------------------------------------------------------------------
# 6. StreamController
# ---------------------------------------------------------------------------


class StreamState(Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    ABORTED = "aborted"
    COMPLETED = "completed"
    TIMED_OUT = "timed_out"


@dataclass
class StreamController:
    """流控制器: 暂停/恢复/中止流, 超时管理, 进度追踪。

    功能:
      - pause(): 暂停输出, 允许缓冲区累积
      - resume(): 恢复输出
      - abort(): 中止流
      - 超时检测: 无数据推送超过 threshold 则触发超时

    Theory: 流控制 = 信道反馈机制。在 Shannon 的信道容量模型中,
      接收方通过 ACK/NACK 反馈信号控制发送速率。
      理想吞吐 = C - log(1 + P/N), 其中 C 为信道容量。
    """

    timeout_s: float = 30.0
    total_expected_tokens: int = 0
    state: StreamState = field(default=StreamState.IDLE, init=False)
    tokens_generated: int = field(default=0, init=False)
    elapsed_s: float = field(default=0.0, init=False)
    _start_time: float = field(default=0.0, init=False)
    _last_chunk_time: float = field(default=0.0, init=False)
    _progress_callbacks: list[Callable[[int, int, float], None]] = field(default_factory=list)
    _state_callbacks: list[Callable[[StreamState, StreamState], None]] = field(default_factory=list)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def start(self) -> None:
        with self._lock:
            self._start_time = time.time()
            self._last_chunk_time = time.time()
            self._transition(StreamState.RUNNING)

    def record_chunk(self, tokens: int) -> None:
        with self._lock:
            self.tokens_generated += tokens
            self._last_chunk_time = time.time()
            self._notify_progress()

    def pause(self) -> None:
        with self._lock:
            self._transition(StreamState.PAUSED)

    def resume(self) -> None:
        with self._lock:
            self._transition(StreamState.RUNNING)

    def abort(self) -> None:
        with self._lock:
            self._transition(StreamState.ABORTED)

    def complete(self) -> None:
        with self._lock:
            self._transition(StreamState.COMPLETED)

    def check_timeout(self) -> bool:
        """检查是否超时。超时则自动转为 TIMED_OUT 状态。"""
        with self._lock:
            if self.state not in (StreamState.RUNNING, StreamState.PAUSED):
                return False
            self.elapsed_s = time.time() - self._start_time
            if (time.time() - self._last_chunk_time) > self.timeout_s:
                self._transition(StreamState.TIMED_OUT)
                return True
            return False

    @property
    def progress(self) -> float:
        """进度百分比 (0-100)。"""
        if self.total_expected_tokens <= 0:
            return 0.0
        return min(100.0, self.tokens_generated / self.total_expected_tokens * 100)

    @property
    def tokens_per_second(self) -> float:
        if self.elapsed_s <= 0:
            return 0.0
        return self.tokens_generated / self.elapsed_s

    @property
    def is_active(self) -> bool:
        return self.state == StreamState.RUNNING

    @property
    def idle_since_s(self) -> float:
        return time.time() - self._last_chunk_time

    def on_progress(self, callback: Callable[[int, int, float], None]) -> None:
        self._progress_callbacks.append(callback)

    def on_state_change(self, callback: Callable[[StreamState, StreamState], None]) -> None:
        self._state_callbacks.append(callback)

    def _transition(self, new_state: StreamState) -> None:
        old = self.state
        if old == new_state:
            return
        self.state = new_state
        for cb in self._state_callbacks:
            try:
                cb(old, new_state)
            except Exception:
                logger.exception("State callback error")

    def _notify_progress(self) -> None:
        self.elapsed_s = time.time() - self._start_time
        for cb in self._progress_callbacks:
            try:
                cb(self.tokens_generated, self.total_expected_tokens, self.elapsed_s)
            except Exception:
                logger.exception("Progress callback error")


# ---------------------------------------------------------------------------
# 7. ResponseCollector
# ---------------------------------------------------------------------------


@dataclass
class ResponseCollector:
    """响应收集器: 将所有 chunk 汇聚为完整响应。

    功能:
      - 收集所有 StreamChunk
      - 按 chunk_index 排序去重
      - 拼接完整文本
      - 计算延迟统计

    Theory: 收集器 = 解码器的逆过程, 将编码为 (index, content) 的块重组成原始消息。
      在信源编码理论中, 这是一个有损到无损的可逆变换:
      M = Decode({ (i, c_i) | i in [0,N] })
      排序纠错基于 chunk_index, 容忍一定乱序。
    """

    _chunks: dict[int, StreamChunk] = field(default_factory=dict)
    _final_received: bool = field(default=False, init=False)
    _start_time: float = field(default_factory=time.time, init=False)
    _metadata: dict[str, Any] = field(default_factory=dict)

    def add(self, chunk: StreamChunk) -> None:
        if chunk.is_final:
            self._final_received = True
        if chunk.chunk_index in self._chunks:
            existing = self._chunks[chunk.chunk_index]
            # 保留内容更长的版本, 用于去重
            if len(chunk.content) > len(existing.content):
                self._chunks[chunk.chunk_index] = chunk
            return
        self._chunks[chunk.chunk_index] = chunk

    def add_many(self, chunks: Iterator[StreamChunk]) -> None:
        for c in chunks:
            self.add(c)

    @property
    def full_text(self) -> str:
        """按 chunk_index 排序后的完整文本。"""
        if not self._chunks:
            return ""
        ordered = sorted(self._chunks.items(), key=lambda kv: kv[0])
        return "".join(c.content for _, c in ordered)

    @property
    def total_tokens(self) -> int:
        return sum(c.token_count for c in self._chunks.values())

    @property
    def chunk_count(self) -> int:
        return len(self._chunks)

    @property
    def total_latency_ms(self) -> float:
        return sum(c.latency_ms for c in self._chunks.values())

    @property
    def avg_latency_ms(self) -> float:
        if not self._chunks:
            return 0.0
        return self.total_latency_ms / len(self._chunks)

    @property
    def is_complete(self) -> bool:
        return self._final_received

    @property
    def first_token_latency_ms(self) -> float:
        """首个 token 的延迟 (TTFT)。"""
        if 0 not in self._chunks:
            sorted_keys = sorted(self._chunks.keys())
            if not sorted_keys:
                return 0.0
            return self._chunks[sorted_keys[0]].latency_ms
        return self._chunks[0].latency_ms

    def sorted_chunks(self) -> list[StreamChunk]:
        return [c for _, c in sorted(self._chunks.items(), key=lambda kv: kv[0])]

    def gaps(self) -> list[int]:
        """检测缺失的 chunk_index。"""
        if not self._chunks:
            return []
        indices = sorted(self._chunks.keys())
        return [i for i in range(indices[0], indices[-1] + 1) if i not in indices]

    def to_dict(self) -> dict[str, Any]:
        return {
            "full_text": self.full_text,
            "total_tokens": self.total_tokens,
            "chunk_count": self.chunk_count,
            "total_latency_ms": round(self.total_latency_ms, 2),
            "avg_latency_ms": round(self.avg_latency_ms, 2),
            "first_token_latency_ms": round(self.first_token_latency_ms, 2),
            "is_complete": self.is_complete,
            "gaps": self.gaps(),
            "metadata": self._metadata,
        }

    def reset(self) -> None:
        self._chunks.clear()
        self._final_received = False
        self._start_time = time.time()
        self._metadata.clear()


# ---------------------------------------------------------------------------
# 8. StreamCache
# ---------------------------------------------------------------------------


@dataclass
class StreamCache:
    """流式响应缓存: 按请求哈希缓存响应, 支持 TTL 过期。

    用途: 相同请求的流式响应可以被重放, 避免重复生成。

    Theory: 缓存 = 有损信源编码。通过对请求进行哈希分桶,
      实现 O(1) 查找, 等同于内容可寻址存储器 (CAM)。
      TTL 过期策略基于信息时效性, 过期后视为熵增导致不可用。
    """

    ttl_s: float = 3600.0
    max_entries: int = 1000

    _store: dict[str, tuple[float, list[StreamChunk]]] = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)
    _hit_count: int = field(default=0, init=False)
    _miss_count: int = field(default=0, init=False)

    @staticmethod
    def request_hash(prompt: str, model: str = "", params: Optional[dict[str, Any]] = None) -> str:
        raw = f"{prompt}|{model}|{json.dumps(params or {}, sort_keys=True)}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, request_key: str) -> Optional[list[StreamChunk]]:
        with self._lock:
            entry = self._store.get(request_key)
            if entry is None:
                self._miss_count += 1
                return None
            expiry, chunks = entry
            if time.time() > expiry:
                del self._store[request_key]
                self._miss_count += 1
                return None
            self._hit_count += 1
            return chunks

    def put(self, request_key: str, chunks: list[StreamChunk]) -> None:
        with self._lock:
            self._evict_if_needed()
            self._store[request_key] = (time.time() + self.ttl_s, chunks)

    def replay(self, request_key: str) -> Generator[StreamChunk, None, None]:
        """重放缓存的响应流。"""
        chunks = self.get(request_key)
        if chunks is None:
            return
        for c in chunks:
            yield c

    def _evict_if_needed(self) -> None:
        if len(self._store) < self.max_entries:
            return
        # 逐出最早过期的条目
        sorted_keys = sorted(self._store.keys(),
                             key=lambda k: self._store[k][0])
        to_remove = len(self._store) - self.max_entries + 1
        for k in sorted_keys[:to_remove]:
            del self._store[k]

    @property
    def hit_rate(self) -> float:
        total = self._hit_count + self._miss_count
        if total == 0:
            return 0.0
        return self._hit_count / total

    @property
    def size(self) -> int:
        return len(self._store)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()
            self._hit_count = 0
            self._miss_count = 0

    def cleanup_expired(self) -> int:
        now = time.time()
        removed = 0
        with self._lock:
            expired = [k for k, (exp, _) in self._store.items() if now > exp]
            for k in expired:
                del self._store[k]
                removed += 1
        return removed


# ---------------------------------------------------------------------------
# 9. StreamAnalytics
# ---------------------------------------------------------------------------


@dataclass
class StreamAnalytics:
    """流式分析器: tokens_per_second, latency_per_chunk, 
    卡顿检测 (超过阈值无数据), 质量监控。

    Theory: 流式分析 = 生成过程的统计推断。
      tokens/s = 熵率近似, 反映模型解码速度
      延迟分布 = 传输信道的可靠性指标
      卡顿 = 信道中断, 可能是后端过载或网络拥塞
    """

    stall_threshold_s: float = 5.0
    window_size: int = 50
    _chunks: deque[StreamChunk] = field(default_factory=deque)
    _token_window: deque[tuple[float, int]] = field(default_factory=deque)
    _latency_window: deque[float] = field(default_factory=deque)
    _stall_count: int = field(default=0, init=False)
    _first_chunk_at: float = field(default=0.0, init=False)
    _last_chunk_at: float = field(default=0.0, init=False)
    _total_tokens: int = field(default=0, init=False)

    def record(self, chunk: StreamChunk) -> None:
        now = time.time()
        if self._first_chunk_at == 0.0:
            self._first_chunk_at = now
        self._last_chunk_at = now
        self._chunks.append(chunk)
        self._total_tokens += chunk.token_count

        self._token_window.append((now, chunk.token_count))
        while len(self._token_window) > self.window_size:
            self._token_window.popleft()

        self._latency_window.append(chunk.latency_ms)
        while len(self._latency_window) > self.window_size:
            self._latency_window.popleft()

    def check_stall(self) -> Optional[float]:
        """返回卡顿时长(秒)。无卡顿时返回 None。"""
        if self._last_chunk_at == 0.0:
            return None
        gap = time.time() - self._last_chunk_at
        if gap > self.stall_threshold_s:
            self._stall_count += 1
            return gap
        return None

    @property
    def tokens_per_second(self) -> float:
        if len(self._token_window) < 2:
            return 0.0
        t0 = self._token_window[0][0]
        t1 = self._token_window[-1][0]
        if t1 <= t0:
            return 0.0
        total = sum(tk for _, tk in self._token_window)
        return total / (t1 - t0)

    @property
    def avg_latency_per_chunk_ms(self) -> float:
        if not self._latency_window:
            return 0.0
        return sum(self._latency_window) / len(self._latency_window)

    @property
    def p95_latency_ms(self) -> float:
        if not self._latency_window:
            return 0.0
        sorted_lat = sorted(self._latency_window)
        idx = int(len(sorted_lat) * 0.95)
        return sorted_lat[min(idx, len(sorted_lat) - 1)]

    @property
    def stall_count(self) -> int:
        return self._stall_count

    @property
    def total_elapsed_s(self) -> float:
        if self._first_chunk_at == 0.0:
            return 0.0
        return self._last_chunk_at - self._first_chunk_at

    @property
    def quality_score(self) -> float:
        """综合质量评分 0-100, 基于延迟和卡顿。"""
        if not self._latency_window:
            return 100.0
        p95 = self.p95_latency_ms
        latency_score = max(0, 100.0 - p95 * 0.1)
        stall_penalty = self._stall_count * 10
        return max(0, latency_score - stall_penalty)

    def summary(self) -> dict[str, Any]:
        return {
            "tokens_per_second": round(self.tokens_per_second, 2),
            "avg_latency_per_chunk_ms": round(self.avg_latency_per_chunk_ms, 2),
            "p95_latency_ms": round(self.p95_latency_ms, 2),
            "stall_count": self.stall_count,
            "total_elapsed_s": round(self.total_elapsed_s, 2),
            "total_tokens": self._total_tokens,
            "quality_score": round(self.quality_score, 1),
        }

    def reset(self) -> None:
        self._chunks.clear()
        self._token_window.clear()
        self._latency_window.clear()
        self._stall_count = 0
        self._first_chunk_at = 0.0
        self._last_chunk_at = 0.0
        self._total_tokens = 0


# ---------------------------------------------------------------------------
# 10. StreamingParser
# ---------------------------------------------------------------------------


class StreamingParser:
    """流式协议解析器: 解析 SSE 流, 处理重连与 Last-Event-ID,
    容错恢复。

    SSE 格式: data: {...}\n\n

    处理以下场景:
      - 增量解析: 不完整的 SSE 帧等待更多数据
      - 断线重连: 携带 Last-Event-ID 恢复
      - 错误恢复: 跳过非法帧, 从下一个合法帧继续

    Theory: SSE 解析器 = 帧同步器 (Frame Synchronizer)。
      在数字通信理论中, 帧同步器从连续比特流中定位帧边界。
      这里从字节流中定位 "\n\n" 边界, 容忍数据到达时的分片。
    """

    def __init__(self, reconnect_enabled: bool = True) -> None:
        self._reconnect_enabled = reconnect_enabled
        self._last_event_id: str = ""
        self._buffer: str = ""
        self._event_id_counter: int = 0
        self._error_count: int = 0
        self._success_count: int = 0

    def feed(self, raw_data: str) -> list[dict[str, Any]]:
        """喂入原始 SSE 文本, 返回解析出的完整事件列表。"""
        self._buffer += raw_data
        events: list[dict[str, Any]] = []

        while "\n\n" in self._buffer:
            frame, self._buffer = self._buffer.split("\n\n", 1)
            event = self._parse_frame(frame)
            if event is not None:
                events.append(event)
        return events

    def _parse_frame(self, frame: str) -> Optional[dict[str, Any]]:
        lines = frame.strip().split("\n")
        event: dict[str, Any] = {"id": "", "event": "message", "data": ""}
        data_lines: list[str] = []

        for line in lines:
            if line.startswith("id:"):
                event["id"] = line[3:].strip()
            elif line.startswith("event:"):
                event["event"] = line[6:].strip()
            elif line.startswith("data:"):
                data_lines.append(line[5:].strip())
            elif line.startswith("retry:"):
                try:
                    event["retry"] = int(line[6:].strip())
                except ValueError:
                    pass

        if data_lines:
            event["data"] = "\n".join(data_lines)

        if event["id"]:
            self._last_event_id = event["id"]

        if not event["data"]:
            return None

        try:
            event["parsed_data"] = json.loads(event["data"])
            self._success_count += 1
        except json.JSONDecodeError:
            event["parsed_data"] = {}
            self._error_count += 1

        self._event_id_counter += 1
        return event

    @property
    def last_event_id(self) -> str:
        return self._last_event_id

    def reconnect_headers(self) -> dict[str, str]:
        """生成重连请求头, 携带 Last-Event-ID。"""
        if not self._reconnect_enabled or not self._last_event_id:
            return {}
        return {"Last-Event-ID": self._last_event_id}

    @property
    def error_count(self) -> int:
        return self._error_count

    @property
    def success_count(self) -> int:
        return self._success_count

    @property
    def error_rate(self) -> float:
        total = self._error_count + self._success_count
        if total == 0:
            return 0.0
        return self._error_count / total

    def reset(self) -> None:
        self._buffer = ""
        self._last_event_id = ""
        self._event_id_counter = 0
        self._error_count = 0
        self._success_count = 0

    def parse_complete(self, raw_data: str) -> list[dict[str, Any]]:
        """一次性解析完整 SSE 文本。"""
        self.reset()
        self._buffer = raw_data
        events: list[dict[str, Any]] = []
        frames = self._buffer.split("\n\n")
        for frame in frames:
            if not frame.strip():
                continue
            event = self._parse_frame(frame.strip())
            if event is not None:
                events.append(event)
        self._buffer = ""
        return events


# ---------------------------------------------------------------------------
# 11. 双轨制理论: 流式文本生成的信息论
# ---------------------------------------------------------------------------

@dataclass
class _StreamTheory:
    """流式文本生成的信息论模型。

    核心洞察: LLM 流式生成是遍历 token 概率分布树的过程。
      每个 token 的选择对应熵 H(X) = -sum p(x) log p(x)。
      流式推送频率 = 熵率 bits/s。

    三个关键概念:
      1. 熵率 (Entropy Rate): 
         lim_{n->inf} H(X_n | X_{n-1},...,X_1) / n
         衡量生成文本的平均不确定性, tokens/s 是其实例化。

      2. 信道容量 (Channel Capacity):
         C = max_{p(x)} I(X;Y)
         流式 pipeline 的信道容量由最慢组件决定 (data-rate bottleneck)。

      3. 失真率 (Rate-Distortion):
         R(D) = min_{p(y|x): E[d(x,y)] <= D} I(X;Y)
         缓冲和分块策略是在速率和延迟之间的失真优化。
    """

    @staticmethod
    def estimate_entropy_rate(tokens: list[float]) -> np_optional_float:
        """估算 token 序列的熵率。

        基于滑动窗口的局部熵估计:
          H_local(w) = -sum p(t) log2 p(t),  t in window w
        """
        if not tokens:
            return 0.0
        log_probs = [-math.log2(max(p, 1e-12)) for p in tokens if p > 0]
        if not log_probs:
            return 0.0
        return sum(log_probs) / len(log_probs)

    @staticmethod
    def optimal_chunk_size(entropy_rate: float, overhead: float,
                           min_size: int = 1, max_size: int = 256) -> int:
        """基于熵率计算最优分块大小。

        目标: 最大化信息效率 E = H(chunk) / (|chunk| + overhead)
          解: |chunk|* = sqrt(overhead / entropy_rate)

        Args:
            entropy_rate: 每 token 的熵 (bits)
            overhead: 协议头部开销 (bytes)
            min_size/max_size: 分块大小边界
        """
        if entropy_rate <= 0:
            return max_size
        optimal = int(math.sqrt(overhead / entropy_rate))
        return max(min_size, min(optimal, max_size))

    @staticmethod
    def channel_efficiency(actual_throughput: float,
                           theoretical_capacity: float) -> float:
        """信道效率 = 实际吞吐 / 理论容量。"""
        if theoretical_capacity <= 0:
            return 0.0
        return min(1.0, actual_throughput / theoretical_capacity)

    @staticmethod
    def stall_probability(arrival_rate: float, service_rate: float,
                          buffer_size: int) -> float:
        """基于 M/M/1/B 队列模型估算卡顿概率。

        Args:
            arrival_rate: token 生成速率 (tokens/s)
            service_rate: 传输速率 (tokens/s)
            buffer_size: 缓冲区容量
        """
        if service_rate <= 0 or arrival_rate <= 0:
            return 0.0
        rho = arrival_rate / service_rate
        if rho >= 1.0:
            return 1.0
        return (rho ** buffer_size) * (1 - rho) / (1 - rho ** (buffer_size + 1))

    @staticmethod
    def information_density(text: str) -> float:
        """估算文本的信息密度 (bits/char)。

        基于字符频率的零阶熵估计:
          H0 = -sum p(c) log2 p(c), c in alphabet
        """
        if not text:
            return 0.0
        freq: dict[str, int] = {}
        for c in text:
            freq[c] = freq.get(c, 0) + 1
        n = len(text)
        entropy = 0.0
        for count in freq.values():
            p = count / n
            entropy -= p * math.log2(p)
        return entropy


_DEFAULT_THEORY = _StreamTheory()


# 类型别名与向后兼容
from typing import Union as _U
try:
    import numpy as np
    np_optional_float: object = _U[float, "np.floating[Any]"]
except ImportError:
    np_optional_float = float


# ---------------------------------------------------------------------------
# 便利函数
# ---------------------------------------------------------------------------


class StreamPipeline:
    """一站式流式管道: 将解析、缓冲、合并、控制、收集、分析串联。"""

    def __init__(self,
                 mode: StreamMode = StreamMode.SSE,
                 buffer_max_tokens: int = 64,
                 buffer_flush_interval_s: float = 0.5,
                 merge_strategy: MergeStrategy = MergeStrategy.ROUND_ROBIN,
                 timeout_s: float = 30.0,
                 stall_threshold_s: float = 5.0,
                 cache_ttl_s: float = 3600.0) -> None:
        self.handler = StreamHandler(mode=mode, buffer_config={
            "max_tokens": buffer_max_tokens,
            "flush_interval_s": buffer_flush_interval_s,
        })
        self.merger = StreamMerger(strategy=merge_strategy)
        self.collector = ResponseCollector()
        self.analytics = StreamAnalytics(stall_threshold_s=stall_threshold_s)
        self.cache = StreamCache(ttl_s=cache_ttl_s)
        self.parser = StreamingParser()
        self.controller = StreamController(timeout_s=timeout_s)
        self._mode = mode

    def process(self, text_iterator: Iterator[str],
                stream_id: str = "main",
                metadata: Optional[dict[str, Any]] = None) -> Generator[StreamChunk, None, None]:
        """完整流式处理: 喂入文本,经过整个管道处理后输出 chunk。"""
        self.controller.start()
        meta = dict(metadata or {})

        for item in text_iterator:
            est = max(1, len(item) // 3)
            for chunk in self.handler.feed(item, est, meta):
                self._consume_chunk(chunk, stream_id)
                yield chunk

        for chunk in self.handler.finalize(meta):
            self._consume_chunk(chunk, stream_id)
            yield chunk

        self.controller.complete()

    def _consume_chunk(self, chunk: StreamChunk, stream_id: str) -> None:
        self.controller.record_chunk(chunk.token_count)
        self.collector.add(chunk)
        self.analytics.record(chunk)
        self.merger.push(stream_id, chunk)

    def to_sse_stream(self, text_iterator: Iterator[str],
                      stream_id: str = "main",
                      metadata: Optional[dict[str, Any]] = None) -> Generator[str, None, None]:
        """便捷方法: 输出 SSE 格式字符串流。"""
        for chunk in self.process(text_iterator, stream_id=stream_id, metadata=metadata):
            yield StreamHandler.to_sse(chunk)

    def to_json_stream(self, text_iterator: Iterator[str],
                       stream_id: str = "main",
                       metadata: Optional[dict[str, Any]] = None) -> Generator[str, None, None]:
        """便捷方法: 输出 NDJSON 格式字符串流。"""
        for chunk in self.process(text_iterator, stream_id=stream_id, metadata=metadata):
            yield StreamHandler.to_json_stream(chunk)

    @property
    def full_response(self) -> str:
        return self.collector.full_text

    @property
    def stats(self) -> dict[str, Any]:
        return {
            "analytics": self.analytics.summary(),
            "tokens_generated": self.controller.tokens_generated,
            "tokens_per_second": round(self.controller.tokens_per_second, 2),
            "progress": round(self.controller.progress, 1),
            "collector": {
                "chunk_count": self.collector.chunk_count,
                "total_tokens": self.collector.total_tokens,
                "is_complete": self.collector.is_complete,
            },
            "cache_hit_rate": round(self.cache.hit_rate, 3),
            "cache_size": self.cache.size,
            "parser_errors": self.parser.error_count,
        }

    def reset(self) -> None:
        self.handler.reset()
        self.merger.reset()
        self.collector.reset()
        self.analytics.reset()
        self.controller = StreamController(timeout_s=self.controller.timeout_s)


def infer_optimal_chunk_settings(text_sample: str,
                                 overhead_bytes: int = 80,
                                 target_latency_ms: float = 200) -> dict[str, Any]:
    """从文本样本推断最优分块设置。

    使用信息论方法: 分析字符熵, 计算最优 chunk size。
    """
    entropy_rate = _DEFAULT_THEORY.information_density(text_sample)
    if entropy_rate <= 0:
        entropy_rate = 4.0  # 英文默认 ~4 bits/char

    optimal_tokens = _DEFAULT_THEORY.optimal_chunk_size(
        entropy_rate, overhead_bytes, min_size=8, max_size=128)
    optimal_interval = max(0.1, target_latency_ms / 1000.0 * 0.5)

    return {
        "entropy_rate_bits_per_char": round(entropy_rate, 2),
        "recommended_max_tokens": optimal_tokens,
        "recommended_flush_interval_s": round(optimal_interval, 2),
        "overhead_bytes": overhead_bytes,
    }
