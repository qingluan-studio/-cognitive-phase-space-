"""
Streaming utilities for aggregating multi-model SSE streams.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Callable, Dict, Iterator, List, Optional, Tuple, Union


class SSEParseError(Exception):
    """Raised when an SSE chunk cannot be parsed."""


@dataclass
class StreamChunk:
    """A single token / fragment emitted by one model stream."""

    model_id: str
    provider: str
    index: int
    delta: str
    finish_reason: Optional[str] = None
    usage: Optional[Dict[str, int]] = None
    timestamp: float = field(default_factory=time.time)
    raw: Optional[Dict[str, Any]] = None


@dataclass
class AggregatedSegment:
    """A segment of aggregated text from multiple models at a given time slice."""

    timestamp: float
    segments: Dict[str, str] = field(default_factory=dict)
    merged_text: str = ""
    consensus_score: float = 0.0


class SSEParser:
    """
    Parse Server-Sent Event (SSE) raw lines into dictionaries.
    Handles 'data:', 'event:', 'id:', and 'retry:' fields.
    """

    def __init__(self) -> None:
        self._buffer: List[str] = []

    def feed(self, line: str) -> Optional[Dict[str, Any]]:
        """
        Feed a single line of SSE text. Returns a parsed JSON dict when a complete
        event is available, otherwise None.
        """
        if line.startswith("data: "):
            data = line[len("data: "):]
            if data == "[DONE]":
                return {"__done__": True}
            try:
                return json.loads(data)
            except json.JSONDecodeError as exc:
                raise SSEParseError(f"Invalid JSON in SSE data: {exc}") from exc
        if line.startswith("event: ") or line.startswith("id: ") or line.startswith("retry: "):
            return None
        if line == "":
            return None
        return None

    def feed_bytes(self, data: bytes) -> List[Dict[str, Any]]:
        """
        Feed a byte chunk that may contain multiple lines.
        Returns a list of parsed events.
        """
        events: List[Dict[str, Any]] = []
        text = data.decode("utf-8", errors="replace")
        for line in text.splitlines():
            parsed = self.feed(line)
            if parsed is not None:
                events.append(parsed)
        return events


class StreamAggregator:
    """
    Manage and aggregate streaming outputs from multiple LLM models.

    Responsibilities:
      - Consume per-model iterators / async iterators.
      - Parse SSE chunks into StreamChunk objects.
      - Maintain per-model buffers and emit AggregatedSegment slices.
      - Compute simple consensus / overlap statistics.
    """

    def __init__(
        self,
        merge_strategy: str = "concat",
        consensus_window: int = 5,
    ) -> None:
        """
        Args:
            merge_strategy: How to merge texts across models.
                - "concat": concatenate unique model outputs (default).
                - "vote": character-level voting (placeholder).
            consensus_window: Number of recent chunks to keep for overlap analysis.
        """
        self.merge_strategy = merge_strategy
        self.consensus_window = consensus_window
        self._buffers: Dict[str, List[StreamChunk]] = {}
        self._completed_models: set[str] = set()
        self._parser = SSEParser()
        self._chunk_counters: Dict[str, int] = {}
        self._start_time: Optional[float] = None
        self._total_usage: Dict[str, Dict[str, int]] = {}

    def start(self) -> None:
        """Mark the start of aggregation."""
        self._start_time = time.time()

    @property
    def elapsed_ms(self) -> float:
        if self._start_time is None:
            return 0.0
        return (time.time() - self._start_time) * 1000.0

    def register_model(self, model_id: str, provider: str = "unknown") -> None:
        """Pre-register a model stream so buffers are ready."""
        if model_id not in self._buffers:
            self._buffers[model_id] = []
            self._chunk_counters[model_id] = 0
            self._total_usage[model_id] = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

    def ingest_sse_line(
        self,
        model_id: str,
        provider: str,
        line: str,
    ) -> Optional[StreamChunk]:
        """
        Parse a single SSE line and append it to the internal buffer.
        Returns the StreamChunk if parsing succeeds, else None.
        """
        self.register_model(model_id, provider)
        parsed = self._parser.feed(line)
        if parsed is None:
            return None
        if parsed.get("__done__"):
            self._completed_models.add(model_id)
            return None

        return self._ingest_dict(model_id, provider, parsed)

    def _ingest_dict(
        self,
        model_id: str,
        provider: str,
        parsed: Dict[str, Any],
    ) -> StreamChunk:
        """Convert a parsed SSE dict into a StreamChunk and store it."""
        choices = parsed.get("choices", [{}])
        choice = choices[0] if choices else {}
        delta = choice.get("delta", {})
        content = delta.get("content", "")
        finish_reason = choice.get("finish_reason")
        usage = parsed.get("usage")

        idx = self._chunk_counters[model_id]
        self._chunk_counters[model_id] = idx + 1

        chunk = StreamChunk(
            model_id=model_id,
            provider=provider,
            index=idx,
            delta=content,
            finish_reason=finish_reason,
            usage=usage,
            raw=parsed,
        )
        self._buffers[model_id].append(chunk)

        if usage:
            for key in ("prompt_tokens", "completion_tokens", "total_tokens"):
                val = usage.get(key, 0)
                if isinstance(val, int):
                    self._total_usage[model_id][key] += val

        if finish_reason is not None:
            self._completed_models.add(model_id)

        return chunk

    def ingest_iterator(
        self,
        model_id: str,
        provider: str,
        iterator: Iterator[str],
    ) -> Iterator[StreamChunk]:
        """
        Consume a synchronous string iterator (yielding SSE lines or JSON strings)
        and yield StreamChunk objects as they are parsed.
        """
        self.register_model(model_id, provider)
        for line in iterator:
            line = line.strip()
            if not line:
                continue
            if line.startswith("data: "):
                chunk = self.ingest_sse_line(model_id, provider, line)
                if chunk is not None:
                    yield chunk
            else:
                try:
                    parsed = json.loads(line)
                    yield self._ingest_dict(model_id, provider, parsed)
                except json.JSONDecodeError:
                    continue

    async def ingest_async_iterator(
        self,
        model_id: str,
        provider: str,
        iterator: AsyncIterator[str],
    ) -> AsyncIterator[StreamChunk]:
        """
        Consume an async string iterator and yield StreamChunk objects.
        """
        self.register_model(model_id, provider)
        async for line in iterator:
            line = line.strip()
            if not line:
                continue
            if line.startswith("data: "):
                chunk = self.ingest_sse_line(model_id, provider, line)
                if chunk is not None:
                    yield chunk
            else:
                try:
                    parsed = json.loads(line)
                    yield self._ingest_dict(model_id, provider, parsed)
                except json.JSONDecodeError:
                    continue

    def get_buffer(self, model_id: str) -> List[StreamChunk]:
        """Return the accumulated buffer for a single model."""
        return list(self._buffers.get(model_id, []))

    def all_completed(self) -> bool:
        """True when every registered model has sent a finish_reason."""
        if not self._buffers:
            return False
        return all(mid in self._completed_models for mid in self._buffers)

    def completion_fraction(self) -> float:
        """Fraction of registered models that have completed."""
        if not self._buffers:
            return 0.0
        return len(self._completed_models) / len(self._buffers)

    def aggregate_text(self, model_id: Optional[str] = None) -> str:
        """
        Concatenate all deltas for a given model (or all models) into a single string.
        """
        if model_id is not None:
            return "".join(c.delta for c in self._buffers.get(model_id, []))
        parts: List[str] = []
        for mid in sorted(self._buffers.keys()):
            parts.append(f"[{mid}]\n")
            parts.append(self.aggregate_text(mid))
            parts.append("\n")
        return "".join(parts)

    def snapshot(self) -> AggregatedSegment:
        """
        Create a current AggregatedSegment containing per-model accumulated text
        and a merged view.
        """
        segments: Dict[str, str] = {}
        for mid in sorted(self._buffers.keys()):
            segments[mid] = self.aggregate_text(mid)

        merged = self._merge_segments(segments)
        score = self._compute_consensus(segments)
        return AggregatedSegment(
            timestamp=time.time(),
            segments=segments,
            merged_text=merged,
            consensus_score=score,
        )

    def _merge_segments(self, segments: Dict[str, str]) -> str:
        if self.merge_strategy == "concat":
            parts: List[str] = []
            seen: set[str] = set()
            for text in segments.values():
                if text and text not in seen:
                    parts.append(text)
                    seen.add(text)
            return "\n".join(parts)
        if self.merge_strategy == "vote":
            return self._char_vote_merge(list(segments.values()))
        return "\n".join(segments.values())

    def _char_vote_merge(self, texts: List[str]) -> str:
        """Simple character-level voting (placeholder for advanced merging)."""
        if not texts:
            return ""
        max_len = max(len(t) for t in texts) if texts else 0
        result: List[str] = []
        for i in range(max_len):
            votes: Dict[str, int] = {}
            for t in texts:
                if i < len(t):
                    ch = t[i]
                    votes[ch] = votes.get(ch, 0) + 1
            if votes:
                best = max(votes.items(), key=lambda x: x[1])[0]
                result.append(best)
        return "".join(result)

    def _compute_consensus(self, segments: Dict[str, str]) -> float:
        """
        Compute a naive consensus score based on n-gram overlap between outputs.
        Returns a float in [0, 1].
        """
        texts = [t for t in segments.values() if t]
        if len(texts) < 2:
            return 1.0
        n = 3
        sets: List[set] = []
        for t in texts:
            grams = set(t[i : i + n] for i in range(max(len(t) - n + 1, 1)))
            sets.append(grams)
        total_pairs = 0
        overlap_sum = 0.0
        for i in range(len(sets)):
            for j in range(i + 1, len(sets)):
                union = sets[i] | sets[j]
                inter = sets[i] & sets[j]
                if union:
                    overlap_sum += len(inter) / len(union)
                total_pairs += 1
        return overlap_sum / total_pairs if total_pairs else 1.0

    def get_usage_totals(self) -> Dict[str, Dict[str, int]]:
        """Return aggregated usage totals per model."""
        return {k: dict(v) for k, v in self._total_usage.items()}

    def stats(self) -> Dict[str, Any]:
        """Return high-level statistics about the aggregation session."""
        return {
            "elapsed_ms": self.elapsed_ms,
            "models_registered": len(self._buffers),
            "models_completed": len(self._completed_models),
            "completion_fraction": self.completion_fraction(),
            "total_chunks": sum(len(v) for v in self._buffers.values()),
            "usage_totals": self.get_usage_totals(),
            "consensus_score": self.snapshot().consensus_score,
        }
