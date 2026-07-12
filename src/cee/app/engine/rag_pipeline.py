"""
RAG Document Pipeline
- Document chunker with multiple strategies
- Embedding engine (TF-IDF + optional sentence-transformers)
- Vector store with cosine similarity search
- Re-ranking and fusion
- Context window management
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import uuid
from collections import Counter
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class ChunkStrategy(str, Enum):
    FIXED_SIZE = "fixed"
    SENTENCE = "sentence"
    PARAGRAPH = "paragraph"
    SEMANTIC = "semantic"
    SLIDING_WINDOW = "sliding_window"


@dataclass
class Document:
    doc_id: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    chunks: List[Chunk] = field(default_factory=list)

    def __repr__(self) -> str:
        preview = self.content[:80].replace("\n", " ")
        return f"Document(id={self.doc_id}, content='{preview}...', chunks={len(self.chunks)})"


@dataclass
class Chunk:
    chunk_id: str
    doc_id: str
    content: str
    index: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    embedding: Optional[List[float]] = None

    def __repr__(self) -> str:
        preview = self.content[:60].replace("\n", " ")
        return f"Chunk(id={self.chunk_id}, doc={self.doc_id}, idx={self.index}, text='{preview}...')"


@dataclass
class SearchResult:
    chunk: Chunk
    score: float
    rank: int = 0

    def __repr__(self) -> str:
        return f"SearchResult(rank={self.rank}, score={self.score:.4f}, chunk={self.chunk.chunk_id})"


@dataclass
class RetrievalContext:
    results: List[SearchResult]
    formatted_context: str
    total_tokens_estimate: int

    def __repr__(self) -> str:
        return f"RetrievalContext(results={len(self.results)}, tokens≈{self.total_tokens_estimate})"


class TfidfEmbedder:
    """Lightweight TF-IDF based embedding - no external deps needed."""

    _CHINESE_PATTERN = re.compile(r"[\u4e00-\u9fff]+")
    _WORD_PATTERN = re.compile(r"[a-zA-Z0-9]+")

    def __init__(self, max_features: int = 5000):
        self.vocabulary: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.max_features = max_features
        self._doc_count = 0
        self._fitted = False

    @staticmethod
    def tokenize(text: str) -> List[str]:
        tokens: List[str] = []
        text_lower = text.lower()

        for match in TfidfEmbedder._CHINESE_PATTERN.finditer(text_lower):
            chunk = match.group()
            for i in range(len(chunk)):
                if i + 2 <= len(chunk):
                    tokens.append(chunk[i:i + 2])
                if i + 1 <= len(chunk):
                    tokens.append(chunk[i])

        for match in TfidfEmbedder._WORD_PATTERN.finditer(text_lower):
            word = match.group()
            if len(word) > 1:
                tokens.append(word)

        return tokens

    def fit(self, documents: List[str]) -> TfidfEmbedder:
        tokenized = [self.tokenize(doc) for doc in documents]
        N = len(documents)
        self._doc_count = N

        doc_freq: Counter[str] = Counter()
        all_tokens: List[str] = []
        for tokens in tokenized:
            unique = set(tokens)
            doc_freq.update(unique)
            all_tokens.extend(tokens)

        freq = Counter(all_tokens)
        candidates = freq.most_common(self.max_features)

        self.vocabulary = {t: i for i, (t, _) in enumerate(candidates)}
        for term in self.vocabulary:
            df = doc_freq.get(term, 1)
            self.idf[term] = math.log((N + 1) / (df + 1)) + 1.0

        self._fitted = True
        return self

    def transform(self, documents: Union[str, List[str]]) -> List[List[float]]:
        if not self._fitted:
            raise RuntimeError("TfidfEmbedder not fitted yet")

        texts = [documents] if isinstance(documents, str) else documents
        vecs: List[List[float]] = []
        for doc in texts:
            tokens = self.tokenize(doc)
            tf = Counter(tokens)
            total = max(len(tokens), 1)
            vec = [0.0] * len(self.vocabulary)
            for term, idx in self.vocabulary.items():
                if term in tf:
                    vec[idx] = (tf[term] / total) * self.idf.get(term, 1.0)
            vecs.append(vec)
        return vecs

    def fit_transform(self, documents: List[str]) -> List[List[float]]:
        self.fit(documents)
        return self.transform(documents)


class DocumentChunker:
    """Multi-strategy document chunking."""

    _SENTENCE_RE = re.compile(r"(?<=[.!?;。！？；\n])\s*")

    def __init__(
        self,
        strategy: ChunkStrategy = ChunkStrategy.SENTENCE,
        chunk_size: int = 500,
        chunk_overlap: int = 100,
    ):
        self.strategy = strategy
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document(self, doc: Document) -> Document:
        texts = self.chunk_text(doc.content)
        doc.chunks = [
            Chunk(
                chunk_id=f"{doc.doc_id}_chunk_{i}",
                doc_id=doc.doc_id,
                content=t,
                index=i,
                metadata=dict(doc.metadata),
            )
            for i, t in enumerate(texts)
        ]
        return doc

    def chunk_text(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []

        dispatch = {
            ChunkStrategy.SENTENCE: self._sentence_chunk,
            ChunkStrategy.PARAGRAPH: self._paragraph_chunk,
            ChunkStrategy.SEMANTIC: self._paragraph_chunk,
            ChunkStrategy.SLIDING_WINDOW: self._sliding_window_chunk,
            ChunkStrategy.FIXED_SIZE: self._fixed_chunk,
        }
        handler = dispatch.get(self.strategy, self._fixed_chunk)
        return handler(text)

    def _sentence_chunk(self, text: str) -> List[str]:
        sentences = [s.strip() for s in self._SENTENCE_RE.split(text) if s.strip()]
        if not sentences:
            return []
        return self._merge_segments(sentences)

    def _paragraph_chunk(self, text: str) -> List[str]:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        if not paragraphs:
            return []
        return self._merge_segments(paragraphs)

    def _merge_segments(self, segments: List[str]) -> List[str]:
        chunks: List[str] = []
        current = ""
        for seg in segments:
            if current and len(current) + len(seg) + 1 > self.chunk_size:
                chunks.append(current.strip())
                current = seg
            else:
                current = f"{current} {seg}".strip() if current else seg
        if current.strip():
            chunks.append(current.strip())
        return chunks

    def _sliding_window_chunk(self, text: str) -> List[str]:
        chunks: List[str] = []
        text_len = len(text)
        if text_len <= self.chunk_size:
            return [text]

        step = max(self.chunk_size - self.chunk_overlap, 1)
        start = 0
        while start < text_len:
            end = min(start + self.chunk_size, text_len)
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append(chunk_text)
            if end >= text_len:
                break
            start += step
        return chunks

    def _fixed_chunk(self, text: str) -> List[str]:
        chunks: List[str] = []
        text_len = len(text)
        if text_len <= self.chunk_size:
            return [text]

        start = 0
        while start < text_len:
            end = min(start + self.chunk_size, text_len)
            if end < text_len:
                lookup_start = end - min(self.chunk_overlap, end - start)
                boundary = text.rfind("\n", lookup_start, end)
                if boundary == -1:
                    boundary = text.rfind(".", lookup_start, end)
                if boundary == -1:
                    boundary = text.rfind("。", lookup_start, end)
                if boundary != -1 and boundary > start:
                    end = boundary + 1

            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append(chunk_text)

            if end >= text_len:
                break

            next_start = end - self.chunk_overlap
            if next_start <= start:
                start = end
            else:
                start = next_start
        return chunks


class VectorStore:
    """In-memory vector store with cosine similarity."""

    def __init__(self, embedder: Optional[TfidfEmbedder] = None):
        self.embedder = embedder or TfidfEmbedder()
        self._chunks: Dict[str, Chunk] = {}
        self._doc_index: Dict[str, List[str]] = {}
        self._vectors: Dict[str, List[float]] = {}
        self._fitted = False

    def add_document(self, doc: Document) -> int:
        if not doc.chunks:
            return 0

        self._doc_index[doc.doc_id] = []
        for chunk in doc.chunks:
            self._chunks[chunk.chunk_id] = chunk
            self._doc_index[doc.doc_id].append(chunk.chunk_id)

        all_texts = [
            c.content for c in self._chunks.values()
        ]
        self.embedder.fit(all_texts)
        vectors = self.embedder.transform(all_texts)
        for chunk, vec in zip(self._chunks.values(), vectors):
            chunk.embedding = vec
            self._vectors[chunk.chunk_id] = vec
        self._fitted = True
        return len(doc.chunks)

    def search(
        self, query: str, top_k: int = 5, min_score: float = 0.0
    ) -> List[SearchResult]:
        if not self._fitted or not self._chunks:
            return []

        query_vec = self.embedder.transform([query])[0]
        scored: List[Tuple[Chunk, float]] = []
        q_norm = math.sqrt(sum(v * v for v in query_vec))

        if q_norm == 0:
            return []

        for chunk_id, chunk in self._chunks.items():
            dv = self._vectors.get(chunk_id, [])
            if not dv:
                continue
            d_norm = math.sqrt(sum(v * v for v in dv))
            if d_norm == 0:
                continue
            dot = sum(a * b for a, b in zip(query_vec, dv))
            score = dot / (q_norm * d_norm)
            if score >= min_score:
                scored.append((chunk, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [
            SearchResult(chunk=c, score=s, rank=i)
            for i, (c, s) in enumerate(scored[:top_k])
        ]

    def batch_search(
        self, queries: List[str], top_k: int = 5
    ) -> List[List[SearchResult]]:
        return [self.search(q, top_k=top_k) for q in queries]

    def remove_document(self, doc_id: str) -> bool:
        if doc_id not in self._doc_index:
            return False

        chunk_ids = self._doc_index.pop(doc_id)
        for cid in chunk_ids:
            self._chunks.pop(cid, None)
            self._vectors.pop(cid, None)

        if self._chunks:
            all_texts = [c.content for c in self._chunks.values()]
            self.embedder.fit(all_texts)
            vectors = self.embedder.transform(all_texts)
            for chunk, vec in zip(self._chunks.values(), vectors):
                chunk.embedding = vec
                self._vectors[chunk.chunk_id] = vec
        else:
            self._fitted = False
            self.embedder = TfidfEmbedder()
        return True

    def get_stats(self) -> Dict:
        return {
            "total_chunks": len(self._chunks),
            "total_documents": len(self._doc_index),
            "vocabulary_size": len(self.embedder.vocabulary),
            "fitted": self._fitted,
            "doc_ids": list(self._doc_index.keys()),
        }


class Reranker:
    """Re-rank search results using multiple strategies."""

    _CHINESE_RE = re.compile(r"[\u4e00-\u9fff]+")
    _WORD_RE = re.compile(r"[a-zA-Z0-9]+")

    def __init__(self):
        self._strategies = ["tfidf", "bm25_like", "position_bias"]

    def _tokenize(self, text: str) -> List[str]:
        tokens: List[str] = []
        text_lower = text.lower()
        for m in self._CHINESE_RE.finditer(text_lower):
            chunk = m.group()
            for i in range(len(chunk)):
                if i + 2 <= len(chunk):
                    tokens.append(chunk[i:i + 2])
                tokens.append(chunk[i])
        for m in self._WORD_RE.finditer(text_lower):
            word = m.group()
            if len(word) > 1:
                tokens.append(word)
        return tokens

    def rerank(
        self, query: str, results: List[SearchResult], top_k: int = 5
    ) -> List[SearchResult]:
        if not results:
            return []

        mmr_results = self._mmr_rerank(query, results, lambda_param=0.7)
        cross_results = self._cross_encoder_rerank(query, mmr_results)

        cross_results.sort(key=lambda x: x.score, reverse=True)
        for i, r in enumerate(cross_results[:top_k]):
            r.rank = i
        return cross_results[:top_k]

    def _mmr_rerank(
        self, query: str, results: List[SearchResult], lambda_param: float = 0.7
    ) -> List[SearchResult]:
        if len(results) <= 1:
            return results

        selected: List[SearchResult] = [results[0]]
        remaining = results[1:]

        query_tokens = set(self._tokenize(query))

        while remaining and len(selected) < len(results):
            best_score = -math.inf
            best_idx = 0
            for i, r in enumerate(remaining):
                sim_query = r.score
                sim_selected = max(
                    self._jaccard_sim(r.chunk.content, s.chunk.content)
                    for s in selected
                )
                mmr_score = lambda_param * sim_query - (1 - lambda_param) * sim_selected
                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = i
            selected.append(remaining.pop(best_idx))

        return selected

    def _jaccard_sim(self, text_a: str, text_b: str) -> float:
        set_a = set(self._tokenize(text_a))
        set_b = set(self._tokenize(text_b))
        if not set_a or not set_b:
            return 0.0
        intersection = set_a & set_b
        union = set_a | set_b
        return len(intersection) / len(union) if union else 0.0

    def _cross_encoder_rerank(
        self, query: str, results: List[SearchResult]
    ) -> List[SearchResult]:
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return results

        q_counter = Counter(query_tokens)
        for r in results:
            doc_tokens = self._tokenize(r.chunk.content)
            d_counter = Counter(doc_tokens)
            overlap = sum(min(q_counter[t], d_counter.get(t, 0)) for t in q_counter)
            r.score = r.score * 0.5 + (overlap / max(len(query_tokens), 1)) * 0.5

        return results


class RAGPipeline:
    """Complete RAG pipeline orchestrator."""

    def __init__(
        self,
        chunker: Optional[DocumentChunker] = None,
        vector_store: Optional[VectorStore] = None,
        reranker: Optional[Reranker] = None,
    ):
        self.chunker = chunker or DocumentChunker()
        self.vector_store = vector_store or VectorStore()
        self.reranker = reranker or Reranker()
        self.documents: Dict[str, Document] = {}

    def ingest(
        self,
        content: str,
        metadata: Optional[Dict] = None,
        doc_id: Optional[str] = None,
    ) -> Document:
        did = doc_id or uuid.uuid4().hex[:12]
        doc = Document(doc_id=did, content=content, metadata=metadata or {})
        self.chunker.chunk_document(doc)
        self.vector_store.add_document(doc)
        self.documents[did] = doc
        return doc

    def ingest_file(self, filepath: str) -> Document:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")

        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        filename = os.path.basename(filepath)
        did = hashlib.md5(filepath.encode()).hexdigest()[:12]
        metadata = {"source": filepath, "filename": filename}

        return self.ingest(content, metadata=metadata, doc_id=did)

    def query(
        self, query: str, top_k: int = 5, use_rerank: bool = True
    ) -> RetrievalContext:
        if not query.strip():
            return RetrievalContext(
                results=[], formatted_context="", total_tokens_estimate=0
            )

        search_top_k = top_k * 3 if use_rerank else top_k
        results = self.vector_store.search(query, top_k=search_top_k)

        if use_rerank and results:
            results = self.reranker.rerank(query, results, top_k=top_k)

        formatted = self._format_context(results)

        token_estimate = sum(
            len(r.chunk.content.split()) for r in results
        )

        return RetrievalContext(
            results=results,
            formatted_context=formatted,
            total_tokens_estimate=token_estimate,
        )

    def multi_query(self, queries: List[str], top_k: int = 5) -> str:
        all_results: List[List[SearchResult]] = self.vector_store.batch_search(
            queries, top_k=top_k * 2
        )

        fused: Dict[str, Tuple[Chunk, float]] = {}
        for results in all_results:
            max_score = max((r.score for r in results), default=1.0)
            for r in results:
                normalized = r.score / max(max_score, 0.001)
                if r.chunk.chunk_id in fused:
                    prev_chunk, prev_score = fused[r.chunk.chunk_id]
                    fused[r.chunk.chunk_id] = (prev_chunk, prev_score + normalized)
                else:
                    fused[r.chunk.chunk_id] = (r.chunk, normalized)

        sorted_results = sorted(
            fused.values(), key=lambda x: x[1], reverse=True
        )[:top_k]

        final_results = [
            SearchResult(chunk=c, score=s, rank=i)
            for i, (c, s) in enumerate(sorted_results)
        ]

        return self._format_context(final_results)

    def get_context_for_llm(self, query: str, max_tokens: int = 2000) -> str:
        ctx = self.query(query, top_k=5, use_rerank=True)
        if not ctx.results:
            return ""

        parts: List[str] = []
        char_estimate = 0
        chars_per_token = 4

        for r in ctx.results:
            chunk_text = r.chunk.content
            chunk_tokens = len(chunk_text) / chars_per_token
            if char_estimate + chunk_tokens > max_tokens:
                remaining = int((max_tokens - char_estimate) * chars_per_token)
                if remaining > 50:
                    chunk_text = chunk_text[:remaining] + "..."
                else:
                    break
            parts.append(
                f"[{r.chunk.doc_id}:{r.chunk.index}] (score={r.score:.3f})\n{chunk_text}"
            )
            char_estimate += chunk_tokens

        return "\n\n".join(parts)

    def stats(self) -> Dict:
        vs_stats = self.vector_store.get_stats()
        return {
            "total_documents": len(self.documents),
            "total_chunks": vs_stats["total_chunks"],
            "vocabulary_size": vs_stats["vocabulary_size"],
            "chunk_strategy": self.chunker.strategy.value,
            "chunk_size": self.chunker.chunk_size,
            "chunk_overlap": self.chunker.chunk_overlap,
            "fitted": vs_stats["fitted"],
        }

    def _format_context(self, results: List[SearchResult]) -> str:
        if not results:
            return ""
        parts = [
            f"[{r.rank}] [{r.chunk.doc_id}] (score={r.score:.4f})\n{r.chunk.content}"
            for r in results
        ]
        return "\n\n---\n\n".join(parts)
