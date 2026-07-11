"""
RAG 检索增强生成 — 向量化知识检索与混合排序

提供:
  - TextChunker: 文本分块（固定大小、语义分块、句子分块）
  - TFIDFVectorizer: TF-IDF 向量化（纯 Python 实现）
  - SimpleVectorStore: 基于余弦相似度的向量存储
  - BM25Ranker: BM25 关键词排序
  - RAGEngine: 混合检索（向量 + 关键词）、重排序、上下文组装
"""

from __future__ import annotations

import json
import math
import os
import re
import threading
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Optional, Union

_DEFAULT_TOP_K = 5
_DEFAULT_CHUNK_SIZE = 512
_DEFAULT_CHUNK_OVERLAP = 64


# ============================================================
# Data Classes
# ============================================================

@dataclass
class ChunkInfo:
    chunk_id: int
    text: str
    start_char: int
    end_char: int
    metadata: dict[str, Any] = field(default_factory=dict)
    embedding: Optional[list[float]] = None

    def __repr__(self) -> str:
        preview = self.text[:60].replace("\n", " ")
        return (
            f"ChunkInfo(id={self.chunk_id}, "
            f"text='{preview}...', "
            f"range=[{self.start_char}, {self.end_char}])"
        )


@dataclass
class RAGConfig:
    chunk_size: int = _DEFAULT_CHUNK_SIZE
    chunk_overlap: int = _DEFAULT_CHUNK_OVERLAP
    top_k: int = _DEFAULT_TOP_K
    vector_weight: float = 0.6
    bm25_weight: float = 0.4
    min_score: float = 0.0
    re_rank: bool = True
    context_window: int = 4096


# ============================================================
# Text Chunker
# ============================================================

class TextChunker:
    """文本分块器 — 支持固定大小分块、句子分块和语义分块。

    Usage:
        chunker = TextChunker(chunk_size=512, overlap=64)
        chunks = chunker.chunk(long_text)
        for ch in chunks:
            print(f"  {ch.chunk_id}: {len(ch.text)} chars")
    """

    def __init__(
        self,
        chunk_size: int = _DEFAULT_CHUNK_SIZE,
        overlap: int = _DEFAULT_CHUNK_OVERLAP,
        strategy: str = "fixed",
    ) -> None:
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.strategy = strategy

    def chunk(
        self,
        text: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> list[ChunkInfo]:
        """将文本分割为 ChunkInfo 列表。"""
        if not text:
            return []
        meta = metadata or {}
        if self.strategy == "sentence":
            return self._chunk_by_sentences(text, meta)
        elif self.strategy == "semantic":
            return self._chunk_semantic(text, meta)
        else:
            return self._chunk_fixed(text, meta)

    def _chunk_fixed(
        self, text: str, meta: dict[str, Any]
    ) -> list[ChunkInfo]:
        chunks: list[ChunkInfo] = []
        text_len = len(text)
        chunk_id = 0
        start = 0
        while start < text_len:
            end = min(start + self.chunk_size, text_len)
            if end < text_len and self.overlap > 0:
                boundary = text.rfind("\n", end - self.overlap, end)
                if boundary == -1:
                    boundary = text.rfind(".", end - self.overlap, end)
                if boundary == -1:
                    boundary = text.rfind("。", end - self.overlap, end)
                if boundary != -1 and boundary > start:
                    end = boundary + 1
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append(
                    ChunkInfo(
                        chunk_id=chunk_id,
                        text=chunk_text,
                        start_char=start,
                        end_char=end,
                        metadata=dict(meta),
                    )
                )
                chunk_id += 1
            start = end - self.overlap
            if start >= text_len or end >= text_len:
                break
        return chunks

    def _chunk_by_sentences(
        self, text: str, meta: dict[str, Any]
    ) -> list[ChunkInfo]:
        sentences = re.split(r"(?<=[.!?。！？\n])\s*", text)
        sentences = [s.strip() for s in sentences if s.strip()]
        chunks: list[ChunkInfo] = []
        chunk_id = 0
        current = ""
        current_start = 0
        pos = 0

        for sent in sentences:
            sent_start = text.find(sent, pos) if pos < len(text) else pos
            if sent_start == -1:
                sent_start = pos
            if (
                current
                and len(current) + len(sent) > self.chunk_size
            ):
                chunks.append(
                    ChunkInfo(
                        chunk_id=chunk_id,
                        text=current.strip(),
                        start_char=current_start,
                        end_char=sent_start,
                        metadata=dict(meta),
                    )
                )
                chunk_id += 1
                current = sent
                current_start = sent_start
            else:
                if not current:
                    current_start = sent_start
                current += (" " if current else "") + sent
            pos = sent_start + len(sent)

        if current.strip():
            chunks.append(
                ChunkInfo(
                    chunk_id=chunk_id,
                    text=current.strip(),
                    start_char=current_start,
                    end_char=len(text),
                    metadata=dict(meta),
                )
            )

        return chunks

    def _chunk_semantic(
        self, text: str, meta: dict[str, Any]
    ) -> list[ChunkInfo]:
        paragraphs = re.split(r"\n\s*\n", text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        chunks: list[ChunkInfo] = []
        chunk_id = 0
        current = ""
        pos = 0

        for para in paragraphs:
            para_start = text.find(para, pos)
            if para_start == -1:
                para_start = pos
            if (
                current
                and len(current) + len(para) > self.chunk_size
            ):
                chunks.append(
                    ChunkInfo(
                        chunk_id=chunk_id,
                        text=current.strip(),
                        start_char=current_start,
                        end_char=para_start,
                        metadata=dict(meta),
                    )
                )
                chunk_id += 1
                current = para
                current_start = para_start
            else:
                if not current:
                    current_start = para_start
                current += "\n\n" + para if current else para
            pos = para_start + len(para)

        if current.strip():
            chunks.append(
                ChunkInfo(
                    chunk_id=chunk_id,
                    text=current.strip(),
                    start_char=current_start,
                    end_char=len(text),
                    metadata=dict(meta),
                )
            )
        return chunks


# ============================================================
# TF-IDF Vectorizer (Pure Python)
# ============================================================

class TFIDFVectorizer:
    """纯 Python 实现的 TF-IDF 向量化器。

    支持中英文分词。
    """

    _CHINESE_PATTERN = re.compile(r"[\u4e00-\u9fff]+")
    _WORD_PATTERN = re.compile(r"[a-zA-Z0-9]+")

    def __init__(
        self,
        max_features: int = 5000,
        min_df: int = 1,
    ) -> None:
        self.max_features = max_features
        self.min_df = min_df
        self.vocabulary_: dict[str, int] = {}
        self.idf_: dict[str, float] = {}
        self._fitted = False

    @staticmethod
    def tokenize(text: str) -> list[str]:
        """分词：支持中文（按字符n-gram）和英文。"""
        tokens: list[str] = []
        text = text.lower()

        for match in TFIDFVectorizer._CHINESE_PATTERN.finditer(text):
            chunk = match.group()
            for i in range(len(chunk)):
                if i + 2 <= len(chunk):
                    tokens.append(chunk[i : i + 2])
                if i + 1 <= len(chunk):
                    tokens.append(chunk[i])

        for match in TFIDFVectorizer._WORD_PATTERN.finditer(text):
            word = match.group()
            if len(word) > 1:
                tokens.append(word)

        return tokens

    def fit(self, documents: list[str]) -> TFIDFVectorizer:
        """在文档集合上拟合词表和 IDF。"""
        tokenized = [self.tokenize(doc) for doc in documents]
        N = len(documents)

        doc_freq: Counter[str] = Counter()
        all_tokens: list[str] = []
        for tokens in tokenized:
            unique = set(tokens)
            doc_freq.update(unique)
            all_tokens.extend(tokens)

        freq = Counter(all_tokens)
        candidates = [
            (t, f) for t, f in freq.most_common(self.max_features)
            if doc_freq[t] >= self.min_df
        ]

        self.vocabulary_ = {t: i for i, (t, _) in enumerate(candidates)}
        for term, idx in self.vocabulary_.items():
            df = doc_freq.get(term, 1)
            self.idf_[term] = math.log((N + 1) / (df + 1)) + 1.0

        self._fitted = True
        return self

    def fit_transform(self, documents: list[str]) -> list[list[float]]:
        """拟合并返回向量。"""
        self.fit(documents)
        return self.transform(documents)

    def transform(self, documents: list[str]) -> list[list[float]]:
        """将文档转为 TF-IDF 向量。"""
        if not self._fitted:
            raise RuntimeError("TFIDFVectorizer not fitted yet")
        vecs: list[list[float]] = []
        for doc in documents:
            tokens = self.tokenize(doc)
            tf = Counter(tokens)
            total = max(len(tokens), 1)
            vec = [0.0] * len(self.vocabulary_)
            for term, idx in self.vocabulary_.items():
                if term in tf:
                    vec[idx] = (tf[term] / total) * self.idf_.get(
                        term, 1.0
                    )
            vecs.append(vec)
        return vecs


# ============================================================
# Simple Vector Store (Cosine Similarity)
# ============================================================

class SimpleVectorStore:
    """基于余弦相似度的内存向量存储。

    将文本使用 TF-IDF 向量化后存储，支持向量检索。
    """

    def __init__(self) -> None:
        self._vectors: list[list[float]] = []
        self._chunks: list[ChunkInfo] = []
        self._vectorizer: Optional[TFIDFVectorizer] = None
        self._lock = threading.Lock()

    def add(self, chunks: list[ChunkInfo]) -> None:
        """添加分块到向量存储。"""
        if not chunks:
            return
        with self._lock:
            # Rebuild vectorizer with all documents for consistency
            self._chunks.extend(chunks)
            all_texts = [c.text for c in self._chunks]
            self._vectorizer = TFIDFVectorizer()
            self._vectors = self._vectorizer.fit_transform(all_texts)
            for i, chunk in enumerate(self._chunks):
                chunk.embedding = self._vectors[i]

    def search(
        self, query: str, top_k: int = _DEFAULT_TOP_K
    ) -> list[tuple[ChunkInfo, float]]:
        """向量搜索 — 返回按余弦相似度降序的 (ChunkInfo, score) 列表。"""
        if not self._vectorizer or not self._vectors:
            return []
        query_vec = self._vectorizer.transform([query])[0]
        scores = self._cosine_similarities(query_vec, self._vectors)
        indexed = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        top = indexed[:top_k]
        return [(self._chunks[i], s) for i, s in top if s > 0.0001]

    def remove(self, chunk_ids: list[int]) -> None:
        """按 chunk_id 移除分块。"""
        with self._lock:
            ids_to_remove = set(chunk_ids)
            self._chunks = [
                c for c in self._chunks if c.chunk_id not in ids_to_remove
            ]
            if self._chunks:
                all_texts = [c.text for c in self._chunks]
                self._vectorizer = TFIDFVectorizer()
                self._vectors = self._vectorizer.fit_transform(all_texts)
                for i, chunk in enumerate(self._chunks):
                    chunk.embedding = self._vectors[i]
            else:
                self._vectors = []
                self._vectorizer = None

    def clear(self) -> None:
        """清空所有向量。"""
        with self._lock:
            self._vectors = []
            self._chunks = []
            self._vectorizer = None

    def size(self) -> int:
        """返回已索引分块数。"""
        return len(self._chunks)

    @staticmethod
    def _cosine_similarities(
        query_vec: list[float], doc_vecs: list[list[float]]
    ) -> list[float]:
        if not doc_vecs:
            return []
        scores: list[float] = []
        q_norm = math.sqrt(sum(v * v for v in query_vec))
        if q_norm == 0:
            return [0.0] * len(doc_vecs)
        for dv in doc_vecs:
            dot = sum(a * b for a, b in zip(query_vec, dv))
            d_norm = math.sqrt(sum(v * v for v in dv))
            if d_norm == 0:
                scores.append(0.0)
            else:
                scores.append(dot / (q_norm * d_norm))
        return scores


# ============================================================
# BM25 Ranker
# ============================================================

class BM25Ranker:
    """BM25 排序器 — 基于关键词匹配的概率检索模型。

    k1: 词频饱和度参数 (default 1.5)
    b: 文档长度归一化参数 (default 0.75)
    """

    _CHINESE_RE = re.compile(r"[\u4e00-\u9fff]+")
    _WORD_RE = re.compile(r"[a-zA-Z0-9]+")

    def __init__(
        self,
        k1: float = 1.5,
        b: float = 0.75,
    ) -> None:
        self.k1 = k1
        self.b = b
        self._documents: list[str] = []
        self._tokenized: list[list[str]] = []
        self._avg_dl: float = 0.0
        self._N: int = 0

    def fit(self, documents: list[str]) -> BM25Ranker:
        """在文档集合上计算统计量。"""
        self._documents = documents
        self._N = len(documents)
        self._tokenized = [self._tokenize(d) for d in documents]
        total_len = sum(len(t) for t in self._tokenized)
        self._avg_dl = total_len / max(self._N, 1)
        return self

    def search(
        self, query: str, top_k: int = _DEFAULT_TOP_K
    ) -> list[tuple[int, float]]:
        """BM25 搜索 — 返回 (doc_index, score) 列表。"""
        if self._N == 0:
            return []
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []
        scores: list[float] = []
        for i, tokens in enumerate(self._tokenized):
            score = self._bm25_score(query_tokens, tokens, i)
            scores.append((i, score))
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]

    def _tokenize(self, text: str) -> list[str]:
        tokens: list[str] = []
        text_lower = text.lower()
        for m in self._CHINESE_RE.finditer(text_lower):
            chunk = m.group()
            for i in range(len(chunk)):
                if i + 2 <= len(chunk):
                    tokens.append(chunk[i : i + 2])
                tokens.append(chunk[i])
        for m in self._WORD_RE.finditer(text_lower):
            word = m.group()
            if len(word) > 1:
                tokens.append(word)
        return tokens

    def _bm25_score(
        self,
        query_tokens: list[str],
        doc_tokens: list[str],
        doc_idx: int,
    ) -> float:
        score = 0.0
        dl = len(doc_tokens)
        tf_counter = Counter(doc_tokens)
        for qt in query_tokens:
            df = sum(1 for t in self._tokenized if qt in t)
            if df == 0:
                continue
            idf = math.log(
                (self._N - df + 0.5) / (df + 0.5) + 1.0
            )
            tf = tf_counter.get(qt, 0)
            numerator = tf * (self.k1 + 1)
            denominator = tf + self.k1 * (
                1 - self.b + self.b * (dl / max(self._avg_dl, 1))
            )
            score += idf * numerator / max(denominator, 0.001)
        return score


# ============================================================
# RAG Engine (Main Class)
# ============================================================

class RAGEngine:
    """RAG 检索增强生成引擎。

    支持:
      - 混合检索（向量相似度 + BM25 关键词匹配）
      - 段落重排序
      - 上下文窗口组装
      - 可配置的索引管理

    Usage:
        engine = RAGEngine()
        engine.index_documents(["Long text about AI...", "Another doc..."])
        context = engine.retrieve("What is machine learning?")
    """

    def __init__(self, config: Optional[RAGConfig] = None) -> None:
        self.config = config or RAGConfig()
        self._chunker = TextChunker(
            chunk_size=self.config.chunk_size,
            overlap=self.config.chunk_overlap,
        )
        self._vector_store = SimpleVectorStore()
        self._bm25 = BM25Ranker()
        self._chunks: list[ChunkInfo] = []
        self._indexed = False

    # ----- Public API -----

    def index_documents(
        self,
        documents: list[str],
        metadata: Optional[dict[str, Any]] = None,
    ) -> list[ChunkInfo]:
        """索引文档列表。

        Args:
            documents: 要索引的文档文本列表。
            metadata: 附加到所有分块的元数据。

        Returns:
            生成的分块列表。
        """
        all_chunks: list[ChunkInfo] = []
        for doc in documents:
            if not doc.strip():
                continue
            chunks = self._chunker.chunk(doc, metadata)
            all_chunks.extend(chunks)

        self._chunks = all_chunks
        self._vector_store.clear()
        self._vector_store.add(all_chunks)
        self._bm25.fit([c.text for c in all_chunks])
        self._indexed = True
        return all_chunks

    def retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
    ) -> list[tuple[ChunkInfo, float]]:
        """混合检索 — 返回按得分降序的 (ChunkInfo, score) 列表。

        Args:
            query: 检索查询。
            top_k: 返回结果数，默认使用 config.top_k。

        Returns:
            排序后的 (ChunkInfo, score) 列表。
        """
        if not self._indexed or not self._chunks:
            return []
        k = top_k or self.config.top_k

        vector_results = self._vector_store.search(query, top_k=k * 2)
        bm25_results = self._bm25.search(query, top_k=k * 2)

        combined: dict[int, float] = {}
        for chunk, score in vector_results:
            combined[chunk.chunk_id] = (
                combined.get(chunk.chunk_id, 0.0)
                + self.config.vector_weight * score
            )

        bm25_max = max((s for _, s in bm25_results), default=1.0)
        for idx, score in bm25_results:
            if idx < len(self._chunks):
                chunk_id = self._chunks[idx].chunk_id
                normalized = score / max(bm25_max, 0.001)
                combined[chunk_id] = (
                    combined.get(chunk_id, 0.0)
                    + self.config.bm25_weight * normalized
                )

        chunk_map = {c.chunk_id: c for c in self._chunks}
        scored = [
            (chunk_map[cid], s)
            for cid, s in combined.items()
            if cid in chunk_map and s >= self.config.min_score
        ]
        scored.sort(key=lambda x: x[1], reverse=True)

        if self.config.re_rank:
            scored = self._re_rank(query, scored, top_k=k)

        return scored[:k]

    def retrieve_context(
        self, query: str, top_k: Optional[int] = None
    ) -> str:
        """检索并组装上下文窗口。

        Args:
            query: 检索查询。
            top_k: 返回结果数。

        Returns:
            组装好的上下文字符串。
        """
        results = self.retrieve(query, top_k)
        return self._assemble_context(results)

    def add_document(
        self,
        text: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> list[ChunkInfo]:
        """增量添加单个文档并重建索引。

        Args:
            text: 文档文本。
            metadata: 附加元数据。

        Returns:
            新增的分块列表。
        """
        new_chunks = self._chunker.chunk(text, metadata)
        self._chunks.extend(new_chunks)
        self._vector_store.clear()
        self._vector_store.add(self._chunks)
        self._bm25.fit([c.text for c in self._chunks])
        self._indexed = True
        return new_chunks

    def remove_document_by_metadata(
        self, key: str, value: Any
    ) -> int:
        """移除匹配元数据的分块。需要重建索引。

        Args:
            key: 元数据键。
            value: 元数据值。

        Returns:
            移除的分块数。
        """
        removed_ids = [
            c.chunk_id
            for c in self._chunks
            if c.metadata.get(key) == value
        ]
        self._chunks = [
            c for c in self._chunks if c.metadata.get(key) != value
        ]
        self._vector_store.remove(removed_ids)
        self._bm25.fit([c.text for c in self._chunks])
        return len(removed_ids)

    def get_chunk(self, chunk_id: int) -> Optional[ChunkInfo]:
        """按 ID 获取分块。"""
        for c in self._chunks:
            if c.chunk_id == chunk_id:
                return c
        return None

    def stats(self) -> dict[str, Any]:
        """返回引擎统计信息。"""
        return {
            "total_chunks": len(self._chunks),
            "vector_store_size": self._vector_store.size(),
            "indexed": self._indexed,
            "config": {
                "chunk_size": self.config.chunk_size,
                "chunk_overlap": self.config.chunk_overlap,
                "top_k": self.config.top_k,
                "vector_weight": self.config.vector_weight,
                "bm25_weight": self.config.bm25_weight,
            },
        }

    # ----- Internal Methods -----

    def _re_rank(
        self,
        query: str,
        results: list[tuple[ChunkInfo, float]],
        top_k: int,
    ) -> list[tuple[ChunkInfo, float]]:
        """使用启发式规则进行重排序。

        考虑因素:
          - 查询词覆盖率
          - 文本长度惩罚（短文本有时是噪声）
          - 信息密度
        """
        query_tokens = set(TFIDFVectorizer.tokenize(query))
        if not query_tokens:
            return results

        scored: list[tuple[ChunkInfo, float]] = []
        for chunk, base_score in results:
            chunk_tokens = set(TFIDFVectorizer.tokenize(chunk.text))
            coverage = (
                len(query_tokens & chunk_tokens) / len(query_tokens)
                if query_tokens
                else 0
            )
            length_bonus = min(len(chunk.text) / 200.0, 1.5)
            if len(chunk.text) < 50:
                length_bonus = 0.5
            rerank_score = (
                base_score * 0.6
                + coverage * 0.3
                + math.log(1 + length_bonus) * 0.1
            )
            scored.append((chunk, rerank_score))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def _assemble_context(
        self, results: list[tuple[ChunkInfo, float]]
    ) -> str:
        """组装上下文窗口，截断到上下文窗口大小。"""
        if not results:
            return ""

        parts: list[str] = []
        total = 0
        for i, (chunk, score) in enumerate(results, 1):
            segment = f"[Chunk {i}, Score: {score:.4f}]\n{chunk.text}\n"
            if total + len(segment) > self.config.context_window:
                remaining = self.config.context_window - total
                if remaining > 100:
                    segment = segment[:remaining] + "\n..."
                else:
                    break
            parts.append(segment)
            total += len(segment)

        return "\n".join(parts)
