"""CEE Processing — Long text processing engine with hierarchical chunking and summarization.

Handles documents of arbitrary length through:
- Adaptive chunking with overlap
- Hierarchical summarization (bottom-up tree)
- Sliding window processing
- Key-sentence extraction
"""

from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ChunkStrategy(Enum):
    FIXED_SIZE = "fixed_size"
    SENTENCE = "sentence"
    PARAGRAPH = "paragraph"
    SEMANTIC = "semantic"
    SLIDING_WINDOW = "sliding_window"


@dataclass
class TextChunk:
    chunk_id: str
    content: str
    start_pos: int
    end_pos: int
    index: int
    level: int = 0
    summary: str = ""
    keywords: list[str] = field(default_factory=list)
    importance: float = 0.5
    parent_id: str = ""
    children_ids: list[str] = field(default_factory=list)

    @property
    def char_count(self) -> int:
        return len(self.content)

    @property
    def word_count(self) -> int:
        return len(self.content.split())

    @property
    def content_hash(self) -> str:
        return hashlib.sha256(self.content.encode()).hexdigest()[:16]


@dataclass
class LongTextReport:
    original_length: int
    chunk_count: int
    depth: int
    summary: str
    structure: list[dict[str, Any]]
    key_phrases: list[str]
    reading_time_estimate: float
    processing_time: float


class LongTextProcessor:
    """Processes documents of arbitrary length via hierarchical chunking.

    Supports multiple chunking strategies and builds a tree structure
    for bottom-up summarization of arbitrarily long documents.
    """

    def __init__(self, chunk_size: int = 1000, overlap: int = 100,
                 max_depth: int = 4, strategy: ChunkStrategy = ChunkStrategy.SEMANTIC,
                 summarizer: Any | None = None) -> None:
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.max_depth = max_depth
        self.strategy = strategy
        self.summarizer = summarizer
        self._chunks: list[TextChunk] = []
        self._chunk_tree: dict[str, TextChunk] = {}

    def process(self, text: str) -> LongTextReport:
        import time
        start = time.time()
        self._chunks = self._chunk(text)
        self._build_tree()
        if self.summarizer:
            self._summarize_tree()
        root_summary = self._get_root_summary()
        structure = self._build_structure_report()
        processing_time = time.time() - start
        return LongTextReport(
            original_length=len(text),
            chunk_count=len(self._chunks),
            depth=self._compute_depth(),
            summary=root_summary,
            structure=structure,
            key_phrases=self.extract_key_phrases(text),
            reading_time_estimate=len(text.split()) / 250,
            processing_time=processing_time,
        )

    def _chunk(self, text: str) -> list[TextChunk]:
        if self.strategy == ChunkStrategy.SENTENCE:
            return self._chunk_by_sentence(text)
        elif self.strategy == ChunkStrategy.PARAGRAPH:
            return self._chunk_by_paragraph(text)
        elif self.strategy == ChunkStrategy.SLIDING_WINDOW:
            return self._chunk_sliding_window(text)
        elif self.strategy == ChunkStrategy.SEMANTIC:
            return self._chunk_semantic(text)
        return self._chunk_fixed(text)

    def _chunk_fixed(self, text: str) -> list[TextChunk]:
        chunks: list[TextChunk] = []
        step = self.chunk_size - self.overlap
        for i in range(0, len(text), step):
            end = min(i + self.chunk_size, len(text))
            content = text[i:end]
            chunks.append(TextChunk(
                chunk_id=f"c{len(chunks):05d}",
                content=content,
                start_pos=i,
                end_pos=end,
                index=len(chunks),
                importance=self._compute_importance(content),
            ))
        return chunks

    def _chunk_by_sentence(self, text: str) -> list[TextChunk]:
        sentences = re.split(r'(?<=[.!?。！？])\s+', text)
        chunks: list[TextChunk] = []
        buf = ""
        pos = 0
        for sent in sentences:
            if len(buf) + len(sent) > self.chunk_size and buf:
                chunks.append(TextChunk(
                    chunk_id=f"c{len(chunks):05d}",
                    content=buf.strip(),
                    start_pos=pos,
                    end_pos=pos + len(buf),
                    index=len(chunks),
                    importance=self._compute_importance(buf),
                ))
                pos += len(buf)
                buf = sent
            else:
                buf += " " + sent if buf else sent
        if buf.strip():
            chunks.append(TextChunk(
                chunk_id=f"c{len(chunks):05d}",
                content=buf.strip(),
                start_pos=pos,
                end_pos=pos + len(buf),
                index=len(chunks),
                importance=self._compute_importance(buf),
            ))
        return chunks

    def _chunk_by_paragraph(self, text: str) -> list[TextChunk]:
        paragraphs = re.split(r'\n\s*\n', text)
        chunks: list[TextChunk] = []
        buf = ""
        pos = 0
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if len(buf) + len(para) > self.chunk_size and buf:
                chunks.append(TextChunk(
                    chunk_id=f"c{len(chunks):05d}",
                    content=buf.strip(),
                    start_pos=pos,
                    end_pos=pos + len(buf),
                    index=len(chunks),
                    importance=self._compute_importance(buf),
                ))
                pos += len(buf)
                buf = para
            else:
                buf += "\n\n" + para if buf else para
        if buf.strip():
            chunks.append(TextChunk(
                chunk_id=f"c{len(chunks):05d}",
                content=buf.strip(),
                start_pos=pos,
                end_pos=pos + len(buf),
                index=len(chunks),
                importance=self._compute_importance(buf),
            ))
        return chunks

    def _chunk_sliding_window(self, text: str) -> list[TextChunk]:
        chunks: list[TextChunk] = []
        step = max(1, self.chunk_size // 2)
        for i in range(0, len(text), step):
            end = min(i + self.chunk_size, len(text))
            content = text[i:end]
            chunks.append(TextChunk(
                chunk_id=f"c{len(chunks):05d}",
                content=content,
                start_pos=i,
                end_pos=end,
                index=len(chunks),
                importance=self._compute_importance(content),
            ))
        return chunks

    def _chunk_semantic(self, text: str) -> list[TextChunk]:
        separators = ["\n\n", "\n", "。", ". ", "? ", "! ", "；", "; ", "，"]
        chunks: list[TextChunk] = []
        start = 0
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            if end < len(text):
                best = end
                for sep in separators:
                    pos = text.rfind(sep, start + self.chunk_size // 2, end)
                    if pos > best - self.chunk_size // 4:
                        best = pos + len(sep)
                        break
                end = min(best, start + self.chunk_size + self.overlap)
            content = text[start:end]
            chunks.append(TextChunk(
                chunk_id=f"c{len(chunks):05d}",
                content=content,
                start_pos=start,
                end_pos=end,
                index=len(chunks),
                importance=self._compute_importance(content),
            ))
            start = end - self.overlap if end < len(text) else end
        return chunks

    def _build_tree(self) -> None:
        self._chunk_tree = {}
        for c in self._chunks:
            c.level = 0
            c.children_ids = []
            c.parent_id = ""
            self._chunk_tree[c.chunk_id] = c
        level = 0
        current = list(self._chunks)
        while len(current) > 1 and level < self.max_depth:
            next_level: list[TextChunk] = []
            group_size = 3
            for i in range(0, len(current), group_size):
                group = current[i:i + group_size]
                merged_content = " ".join(c.content for c in group)
                parent = TextChunk(
                    chunk_id=f"l{level + 1}_{len(next_level):05d}",
                    content=merged_content,
                    start_pos=group[0].start_pos,
                    end_pos=group[-1].end_pos,
                    index=len(next_level),
                    level=level + 1,
                    children_ids=[c.chunk_id for c in group],
                    importance=sum(c.importance for c in group) / len(group),
                )
                for c in group:
                    c.parent_id = parent.chunk_id
                self._chunk_tree[parent.chunk_id] = parent
                next_level.append(parent)
            current = next_level
            level += 1

    def _summarize_tree(self) -> None:
        if not self.summarizer:
            return
        all_ids = list(self._chunk_tree.keys())
        for chunk_id in sorted(all_ids, key=lambda cid: self._chunk_tree[cid].level, reverse=True):
            chunk = self._chunk_tree[chunk_id]
            if chunk.children_ids:
                child_summaries = [self._chunk_tree[cid].summary for cid in chunk.children_ids
                                   if self._chunk_tree[cid].summary]
                context = " ".join(child_summaries) if child_summaries else chunk.content
            else:
                context = chunk.content
            if len(context) > 200:
                chunk.summary = str(self.summarizer(context))[:200]

    def _get_root_summary(self) -> str:
        roots = [c for c in self._chunk_tree.values() if not c.parent_id and c.level == self._compute_depth() - 1]
        if not roots:
            roots = [c for c in self._chunks if not c.parent_id]
        if roots:
            return roots[0].summary or roots[0].content[:500]
        return ""

    def _build_structure_report(self) -> list[dict[str, Any]]:
        roots = [c for c in self._chunk_tree.values() if not c.parent_id and c.level > 0]
        if not roots:
            roots = [c for c in self._chunk_tree.values()
                     if not c.parent_id][:5]
        report: list[dict[str, Any]] = []
        for root in roots:
            report.append({
                "id": root.chunk_id,
                "level": root.level,
                "content_preview": root.content[:100],
                "child_count": len(root.children_ids),
                "importance": root.importance,
                "summary": root.summary[:200] if root.summary else "",
            })
        return report

    def _compute_depth(self) -> int:
        if not self._chunk_tree:
            return 1
        return max(c.level for c in self._chunk_tree.values()) + 1

    def _compute_importance(self, text: str) -> float:
        words = text.lower().split()
        if not words:
            return 0.0
        key_indicators = [
            "therefore", "conclusion", "important", "significant", "key",
            "critical", "essential", "notably", "particularly", "crucial",
            "therefore", "thus", "hence", "consequently",
        ]
        key_count = sum(1 for w in words if w.strip(".,;:!?") in key_indicators)
        unique_ratio = len(set(words)) / max(1, len(words))
        return min(1.0, 0.3 + (key_count / max(1, len(words))) * 5 + unique_ratio * 0.2)

    def extract_key_phrases(self, text: str, top_n: int = 10) -> list[str]:
        words = re.findall(r'\b[a-zA-Z\u4e00-\u9fff]{2,}\b', text.lower())
        word_freq = Counter(words)
        stopwords = {"the", "and", "that", "this", "with", "for", "from",
                     "are", "was", "were", "been", "have", "has", "had",
                     "not", "but", "all", "can", "may", "will", "would",
                     "的", "是", "在", "了", "和", "也", "就", "都", "而", "及"}
        filtered = [(w, c) for w, c in word_freq.most_common(top_n * 3) if w not in stopwords]
        return [w for w, _ in filtered[:top_n]]

    def get_chunk_by_position(self, pos: int) -> TextChunk | None:
        for c in self._chunks:
            if c.start_pos <= pos < c.end_pos:
                return c
        return None

    def get_chunks_at_level(self, level: int) -> list[TextChunk]:
        return [c for c in self._chunk_tree.values() if c.level == level]

    def reset(self) -> None:
        self._chunks.clear()
        self._chunk_tree.clear()
