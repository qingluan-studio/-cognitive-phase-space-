"""
Tests for src/cee/app/engine/rag_pipeline.py — Comprehensive RAG Pipeline.
"""
import sys
sys.path.insert(0, '/workspace/src')

import json
import math
import os
import pytest
import tempfile
from collections import Counter
from unittest.mock import patch, MagicMock

from cee.app.engine.rag_pipeline import (
    ChunkStrategy,
    Document,
    Chunk,
    SearchResult,
    RetrievalContext,
    TfidfEmbedder,
    DocumentChunker,
    VectorStore,
    Reranker,
    RAGPipeline,
)


# ============================================================
# Helper: fixed test texts
# ============================================================

SAMPLE_ENGLISH = (
    "Python is a powerful programming language. "
    "It is widely used for data science and machine learning. "
    "Many developers love Python for its simplicity and readability. "
    "The language supports multiple programming paradigms including "
    "object-oriented, functional, and procedural programming. "
    "Python has a rich ecosystem of libraries and frameworks such as "
    "NumPy, Pandas, TensorFlow, PyTorch, and Django."
)

SAMPLE_CHINESE = (
    "Python是一种强大的编程语言。"
    "它广泛用于数据科学和机器学习。"
    "许多开发人员喜欢Python是因为它的简洁和可读性。"
    "这种语言支持多种编程范式，包括面向对象、函数式和过程式编程。"
    "Python拥有丰富的库和框架生态系统，如NumPy、Pandas和TensorFlow。"
)

SAMPLE_MIXED = (
    "Machine learning 是人工智能的一个分支。"
    "It focuses on building systems that learn from data. "
    "深度学习和神经网络(neural networks)是现代ML的重要组成部分。"
    "The transformer architecture revolutionized NLP tasks."
)

VERY_LONG_ENGLISH = ("This is sentence number %d. " * 50) % tuple(range(50))

# ============================================================
# Test: ChunkStrategy Enum
# ============================================================

class TestChunkStrategy:
    def test_has_five_strategies(self):
        assert ChunkStrategy.FIXED_SIZE.value == "fixed"
        assert ChunkStrategy.SENTENCE.value == "sentence"
        assert ChunkStrategy.PARAGRAPH.value == "paragraph"
        assert ChunkStrategy.SEMANTIC.value == "semantic"
        assert ChunkStrategy.SLIDING_WINDOW.value == "sliding_window"


# ============================================================
# Test: Document Dataclass
# ============================================================

class TestDocument:
    def test_create_document(self):
        doc = Document(doc_id="d1", content="Hello world")
        assert doc.doc_id == "d1"
        assert doc.content == "Hello world"
        assert doc.chunks == []

    def test_metadata_default(self):
        doc = Document(doc_id="d1", content="Test")
        assert doc.metadata == {}

    def test_metadata_custom(self):
        doc = Document(doc_id="d1", content="Test", metadata={"source": "file.txt"})
        assert doc.metadata["source"] == "file.txt"

    def test_repr(self):
        doc = Document(doc_id="abc123", content="Some content here for testing")
        r = repr(doc)
        assert "Document" in r
        assert "abc123" in r

    def test_empty_content(self):
        doc = Document(doc_id="empty", content="")
        assert len(doc.content) == 0
        assert doc.chunks == []


# ============================================================
# Test: Chunk Dataclass
# ============================================================

class TestChunk:
    def test_create_chunk(self):
        c = Chunk(chunk_id="c0", doc_id="d1", content="text", index=0)
        assert c.chunk_id == "c0"
        assert c.doc_id == "d1"
        assert c.content == "text"
        assert c.index == 0

    def test_embedding_default_none(self):
        c = Chunk(chunk_id="c0", doc_id="d1", content="x", index=0)
        assert c.embedding is None

    def test_repr(self):
        c = Chunk(chunk_id="xyz", doc_id="d1", content="Hello world", index=0)
        r = repr(c)
        assert "Chunk" in r
        assert "xyz" in r

    def test_metadata_preserved(self):
        c = Chunk(chunk_id="c0", doc_id="d1", content="text", index=0, metadata={"k": "v"})
        assert c.metadata["k"] == "v"


# ============================================================
# Test: SearchResult Dataclass
# ============================================================

class TestSearchResult:
    def test_create_search_result(self):
        c = Chunk(chunk_id="c0", doc_id="d1", content="text", index=0)
        sr = SearchResult(chunk=c, score=0.95, rank=0)
        assert sr.chunk == c
        assert sr.score == 0.95
        assert sr.rank == 0

    def test_default_rank(self):
        c = Chunk(chunk_id="c0", doc_id="d1", content="text", index=0)
        sr = SearchResult(chunk=c, score=0.5)
        assert sr.rank == 0

    def test_repr(self):
        c = Chunk(chunk_id="c0", doc_id="d1", content="text", index=0)
        sr = SearchResult(chunk=c, score=0.88, rank=2)
        r = repr(sr)
        assert "SearchResult" in r


# ============================================================
# Test: RetrievalContext Dataclass
# ============================================================

class TestRetrievalContext:
    def test_create_empty(self):
        ctx = RetrievalContext(results=[], formatted_context="", total_tokens_estimate=0)
        assert ctx.results == []
        assert ctx.formatted_context == ""
        assert ctx.total_tokens_estimate == 0

    def test_create_with_results(self):
        c = Chunk(chunk_id="c0", doc_id="d1", content="text", index=0)
        sr = SearchResult(chunk=c, score=0.9, rank=0)
        ctx = RetrievalContext(
            results=[sr],
            formatted_context="[0] text",
            total_tokens_estimate=5
        )
        assert len(ctx.results) == 1
        assert ctx.total_tokens_estimate == 5

    def test_repr(self):
        ctx = RetrievalContext(results=[], formatted_context="", total_tokens_estimate=0)
        r = repr(ctx)
        assert "RetrievalContext" in r


# ============================================================
# Test: TfidfEmbedder
# ============================================================

class TestTfidfEmbedder:
    def test_init_defaults(self):
        emb = TfidfEmbedder()
        assert emb.max_features == 5000
        assert emb._fitted is False
        assert emb.vocabulary == {}

    def test_init_custom_max_features(self):
        emb = TfidfEmbedder(max_features=100)
        assert emb.max_features == 100

    def test_tokenize_english(self):
        tokens = TfidfEmbedder.tokenize("hello world test")
        assert "hello" in tokens
        assert "world" in tokens
        assert "test" in tokens

    def test_tokenize_chinese(self):
        tokens = TfidfEmbedder.tokenize("你好世界")
        assert len(tokens) > 0
        assert "你好" in tokens

    def test_tokenize_mixed(self):
        tokens = TfidfEmbedder.tokenize("hello 你好")
        assert "hello" in tokens
        assert "你好" in tokens

    def test_tokenize_empty_string(self):
        tokens = TfidfEmbedder.tokenize("")
        assert tokens == []

    def test_tokenize_single_char_words_ignored(self):
        tokens = TfidfEmbedder.tokenize("a b c")
        assert "a" not in tokens

    def test_tokenize_numbers(self):
        tokens = TfidfEmbedder.tokenize("test123 abc456")
        assert "test123" in tokens or "abc456" in tokens

    def test_fit_builds_vocabulary(self):
        emb = TfidfEmbedder(max_features=100)
        emb.fit(["hello world", "hello python", "python world"])
        assert len(emb.vocabulary) > 0
        assert emb._fitted is True

    def test_fit_empty_documents(self):
        emb = TfidfEmbedder()
        emb.fit(["", "", ""])
        assert emb._fitted is True

    def test_transform_returns_vectors(self):
        emb = TfidfEmbedder(max_features=100)
        docs = ["hello world", "hello python", "python code"]
        emb.fit(docs)
        vectors = emb.transform(docs)
        assert len(vectors) == 3
        assert all(len(v) == len(emb.vocabulary) for v in vectors)

    def test_transform_single_string(self):
        emb = TfidfEmbedder(max_features=100)
        emb.fit(["hello world", "python code"])
        vecs = emb.transform("hello world")
        assert len(vecs) == 1
        assert len(vecs[0]) == len(emb.vocabulary)

    def test_transform_before_fit_raises(self):
        emb = TfidfEmbedder()
        with pytest.raises(RuntimeError, match="not fitted"):
            emb.transform(["test"])

    def test_fit_transform(self):
        emb = TfidfEmbedder(max_features=100)
        docs = ["a b c", "b c d", "c d e"]
        vectors = emb.fit_transform(docs)
        assert len(vectors) == 3
        assert emb._fitted is True

    def test_idf_values_positive(self):
        emb = TfidfEmbedder(max_features=100)
        docs = ["hello world", "goodbye world", "python code"]
        emb.fit(docs)
        for term, idf_val in emb.idf.items():
            assert idf_val > 0, f"IDF for '{term}' should be positive"

    def test_vocabulary_size_respects_max_features(self):
        emb = TfidfEmbedder(max_features=10)
        many_docs = [f"term_{i}" for i in range(100)]
        emb.fit(many_docs)
        assert len(emb.vocabulary) <= 10

    def test_embedding_vector_is_sparse(self):
        emb = TfidfEmbedder(max_features=200)
        docs = ["a single short sentence", "another short phrase here"]
        emb.fit(docs)
        vecs = emb.transform(docs)
        for vec in vecs:
            non_zero = sum(1 for v in vec if v > 0)
            assert non_zero <= len(emb.vocabulary)


# ============================================================
# Test: DocumentChunker
# ============================================================

class TestDocumentChunker:
    def test_init_defaults(self):
        dc = DocumentChunker()
        assert dc.strategy == ChunkStrategy.SENTENCE
        assert dc.chunk_size == 500
        assert dc.chunk_overlap == 100

    def test_chunk_document_empty_text(self):
        dc = DocumentChunker()
        doc = Document(doc_id="d1", content="")
        dc.chunk_document(doc)
        assert doc.chunks == []

    def test_chunk_document_whitespace_only(self):
        dc = DocumentChunker()
        doc = Document(doc_id="d1", content="   \n  \t  ")
        dc.chunk_document(doc)
        assert doc.chunks == []

    def test_sentence_strategy(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE, chunk_size=500)
        texts = dc.chunk_text(SAMPLE_ENGLISH)
        assert len(texts) > 0
        for t in texts:
            assert len(t) <= 500

    def test_sentence_strategy_chinese(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE, chunk_size=200)
        texts = dc.chunk_text(SAMPLE_CHINESE)
        assert len(texts) > 0

    def test_paragraph_strategy(self):
        dc = DocumentChunker(strategy=ChunkStrategy.PARAGRAPH, chunk_size=500)
        text = "Para one.\n\nPara two.\n\nPara three."
        texts = dc.chunk_text(text)
        assert len(texts) > 0

    def test_fixed_strategy(self):
        dc = DocumentChunker(strategy=ChunkStrategy.FIXED_SIZE, chunk_size=50, chunk_overlap=10)
        text = "A" * 200
        texts = dc.chunk_text(text)
        assert len(texts) >= 3
        for t in texts:
            assert len(t) <= 50

    def test_sliding_window_strategy(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SLIDING_WINDOW, chunk_size=100, chunk_overlap=20)
        text = "X" * 300
        texts = dc.chunk_text(text)
        assert len(texts) > 2

    def test_semantic_strategy_handles_paragraphs(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SEMANTIC, chunk_size=500)
        text = "A.\n\nB.\n\nC."
        texts = dc.chunk_text(text)
        assert len(texts) > 0

    def test_chunk_document_preserves_doc_id(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="my_doc", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        for c in doc.chunks:
            assert c.doc_id == "my_doc"

    def test_chunk_document_preserves_metadata(self):
        dc = DocumentChunker()
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH, metadata={"src": "api"})
        dc.chunk_document(doc)
        for c in doc.chunks:
            assert c.metadata["src"] == "api"

    def test_chunk_indices_sequential(self):
        dc = DocumentChunker(strategy=ChunkStrategy.FIXED_SIZE, chunk_size=50, chunk_overlap=10)
        doc = Document(doc_id="d1", content="A" * 200)
        dc.chunk_document(doc)
        for i, c in enumerate(doc.chunks):
            assert c.index == i

    def test_short_text_single_chunk(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE, chunk_size=500)
        texts = dc.chunk_text("Hello world.")
        assert len(texts) == 1

    def test_chunk_size_not_exceeded_fixed(self):
        dc = DocumentChunker(strategy=ChunkStrategy.FIXED_SIZE, chunk_size=80, chunk_overlap=0)
        texts = dc.chunk_text("B" * 300)
        for t in texts:
            assert len(t) <= 80

    def test_chunk_overlap_respected_sliding(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SLIDING_WINDOW, chunk_size=100, chunk_overlap=30)
        text = "C" * 250
        texts = dc.chunk_text(text)
        assert len(texts) >= 2

    def test_special_characters(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        texts = dc.chunk_text("Line with @#$% special chars! More text here.")
        assert len(texts) > 0

    def test_newline_splitting(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        texts = dc.chunk_text("Line one.\nLine two.\nLine three.")
        assert len(texts) >= 1

    def test_large_overlap_value(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SLIDING_WINDOW, chunk_size=100, chunk_overlap=90)
        text = "D" * 200
        texts = dc.chunk_text(text)
        assert len(texts) > 0


# ============================================================
# Test: VectorStore
# ============================================================

class TestVectorStore:
    def test_init(self):
        vs = VectorStore()
        assert vs._fitted is False
        assert vs._chunks == {}

    def test_add_document(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        count = vs.add_document(doc)
        assert count > 0
        assert vs._fitted is True

    def test_add_document_no_chunks(self):
        vs = VectorStore()
        doc = Document(doc_id="d1", content="")
        count = vs.add_document(doc)
        assert count == 0

    def test_search_returns_relevant(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc1 = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        doc2 = Document(doc_id="d2", content="Cooking is the art of preparing delicious food with recipes.")
        dc.chunk_document(doc1)
        dc.chunk_document(doc2)
        vs.add_document(doc1)
        vs.add_document(doc2)

        results = vs.search("python programming", top_k=2)
        assert len(results) >= 1

    def test_search_empty_store(self):
        vs = VectorStore()
        results = vs.search("anything")
        assert results == []

    def test_search_empty_query(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        vs.add_document(doc)

        results = vs.search("")
        assert results == []

    def test_search_with_min_score(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc1 = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        doc2 = Document(doc_id="d2", content="totally unrelated topic text")
        dc.chunk_document(doc1)
        dc.chunk_document(doc2)
        vs.add_document(doc1)
        vs.add_document(doc2)

        results = vs.search("python programming", top_k=10, min_score=0.5)
        assert all(r.score >= 0.5 for r in results)

    def test_search_scores_descending(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.FIXED_SIZE, chunk_size=200, chunk_overlap=50)
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        vs.add_document(doc)

        results = vs.search("Python", top_k=5)
        scores = [r.score for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_search_result_has_rank(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        vs.add_document(doc)

        results = vs.search("Python", top_k=3)
        for i, r in enumerate(results):
            assert r.rank == i

    def test_batch_search(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        vs.add_document(doc)

        queries = ["Python", "programming", "machine learning"]
        batch_results = vs.batch_search(queries, top_k=2)
        assert len(batch_results) == 3
        for results in batch_results:
            assert len(results) <= 2

    def test_batch_search_empty_queries(self):
        vs = VectorStore()
        results = vs.batch_search([], top_k=5)
        assert results == []

    def test_remove_document(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc1 = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        doc2 = Document(doc_id="d2", content="Another test document.")
        dc.chunk_document(doc1)
        dc.chunk_document(doc2)
        vs.add_document(doc1)
        vs.add_document(doc2)

        initial_stats = vs.get_stats()
        assert initial_stats["total_documents"] == 2

        removed = vs.remove_document("d1")
        assert removed is True

        stats = vs.get_stats()
        assert stats["total_documents"] == 1

    def test_remove_nonexistent_document(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        vs.add_document(doc)

        removed = vs.remove_document("nonexistent")
        assert removed is False

    def test_remove_all_documents(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        vs.add_document(doc)

        vs.remove_document("d1")
        assert vs._fitted is False
        assert vs._chunks == {}

    def test_get_stats(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        vs.add_document(doc)

        stats = vs.get_stats()
        assert "total_chunks" in stats
        assert "total_documents" in stats
        assert "vocabulary_size" in stats
        assert "fitted" in stats
        assert "doc_ids" in stats
        assert stats["fitted"] is True

    def test_add_multiple_documents(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        for i in range(5):
            doc = Document(doc_id=f"d{i}", content=f"Document number {i}. " * 5)
            dc.chunk_document(doc)
            vs.add_document(doc)
        stats = vs.get_stats()
        assert stats["total_documents"] == 5

    def test_embeddings_set_after_add(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        vs.add_document(doc)
        for chunk in doc.chunks:
            assert chunk.embedding is not None

    def test_custom_embedder(self):
        emb = TfidfEmbedder(max_features=200)
        vs = VectorStore(embedder=emb)
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        vs.add_document(doc)
        assert vs.embedder is emb


# ============================================================
# Test: Reranker
# ============================================================

class TestReranker:
    def test_init(self):
        rr = Reranker()
        assert len(rr._strategies) == 3
        assert "tfidf" in rr._strategies

    def test_rerank_empty_list(self):
        rr = Reranker()
        result = rr.rerank("query", [], top_k=5)
        assert result == []

    def test_rerank_single_result(self):
        rr = Reranker()
        c = Chunk(chunk_id="c0", doc_id="d1", content="text", index=0)
        sr = SearchResult(chunk=c, score=0.9, rank=0)
        result = rr.rerank("query", [sr], top_k=5)
        assert len(result) == 1
        assert result[0].rank == 0

    def test_rerank_respects_top_k(self):
        rr = Reranker()
        chunks = [
            Chunk(chunk_id=f"c{i}", doc_id="d1", content=f"Chunk number {i} with unique content.", index=i)
            for i in range(10)
        ]
        results = [SearchResult(chunk=c, score=0.9 - i * 0.05, rank=i) for i, c in enumerate(chunks)]
        reranked = rr.rerank("unique content", results, top_k=3)
        assert len(reranked) <= 3

    def test_mmr_diversity(self):
        rr = Reranker()
        chunks = [
            Chunk(chunk_id="c0", doc_id="d1", content="python machine learning AI deep learning", index=0),
            Chunk(chunk_id="c1", doc_id="d2", content="python machine learning AI neural networks", index=0),
            Chunk(chunk_id="c2", doc_id="d3", content="cooking food recipes kitchen baking", index=0),
        ]
        results = [SearchResult(chunk=c, score=0.9, rank=i) for i, c in enumerate(chunks)]
        reranked = rr.rerank("python AI", results, top_k=3)
        assert len(reranked) == 3

        first_ids = {reranked[0].chunk.chunk_id}
        remaining_texts = [r.chunk.content for r in reranked[1:]]
        assert any("cooking" in t or "baking" in t for t in remaining_texts)

    def test_cross_encoder_boosts_overlap(self):
        rr = Reranker()
        chunks = [
            Chunk(chunk_id="c0", doc_id="d1", content="python is great for data science", index=0),
            Chunk(chunk_id="c1", doc_id="d2", content="completely unrelated topic about sports", index=0),
        ]
        results = [
            SearchResult(chunk=chunks[0], score=0.5, rank=0),
            SearchResult(chunk=chunks[1], score=0.5, rank=1),
        ]
        reranked = rr.rerank("python data science", results, top_k=2)
        assert reranked[0].chunk.chunk_id == "c0"

    def test_rerank_scores_decrease(self):
        rr = Reranker()
        chunks = [
            Chunk(chunk_id="c0", doc_id="d1", content="python programming AI ML", index=0),
            Chunk(chunk_id="c1", doc_id="d2", content="python coding language", index=0),
            Chunk(chunk_id="c2", doc_id="d3", content="food recipes cooking", index=0),
        ]
        results = [SearchResult(chunk=c, score=1.0, rank=i) for i, c in enumerate(chunks)]
        reranked = rr.rerank("python coding", results, top_k=3)
        for i in range(len(reranked) - 1):
            assert reranked[i].score >= reranked[i + 1].score - 0.001

    def test_rerank_ranks_sequential(self):
        rr = Reranker()
        chunks = [
            Chunk(chunk_id=f"c{i}", doc_id="d1", content=f"Topic {i} content here.", index=i)
            for i in range(5)
        ]
        results = [SearchResult(chunk=c, score=0.8, rank=0) for c in chunks]
        reranked = rr.rerank("Topic 0", results, top_k=5)
        for i, r in enumerate(reranked):
            assert r.rank == i

    def test_tokenize_handles_empty(self):
        rr = Reranker()
        tokens = rr._tokenize("")
        assert tokens == []

    def test_tokenize_chinese(self):
        rr = Reranker()
        tokens = rr._tokenize("中文测试")
        assert len(tokens) > 0

    def test_tokenize_mixed_language(self):
        rr = Reranker()
        tokens = rr._tokenize("hello 你好 world")
        assert "hello" in tokens
        assert "world" in tokens

    def test_jaccard_sim_identical(self):
        rr = Reranker()
        sim = rr._jaccard_sim("hello world", "hello world")
        assert sim == 1.0

    def test_jaccard_sim_disjoint(self):
        rr = Reranker()
        sim = rr._jaccard_sim("hello world", "foo bar")
        assert sim == 0.0

    def test_jaccard_sim_empty(self):
        rr = Reranker()
        sim = rr._jaccard_sim("", "")
        assert sim == 0.0


# ============================================================
# Test: RAGPipeline
# ============================================================

class TestRAGPipeline:
    def test_init_defaults(self):
        pipe = RAGPipeline()
        assert pipe.chunker is not None
        assert pipe.vector_store is not None
        assert pipe.reranker is not None

    def test_init_custom_components(self):
        chunker = DocumentChunker(strategy=ChunkStrategy.FIXED_SIZE, chunk_size=200, chunk_overlap=50)
        vs = VectorStore()
        rr = Reranker()
        pipe = RAGPipeline(chunker=chunker, vector_store=vs, reranker=rr)
        assert pipe.chunker is chunker
        assert pipe.vector_store is vs
        assert pipe.reranker is rr

    def test_ingest(self):
        pipe = RAGPipeline()
        doc = pipe.ingest(SAMPLE_ENGLISH, metadata={"source": "test"})
        assert doc.doc_id is not None
        assert len(doc.chunks) > 0
        assert doc.metadata["source"] == "test"

    def test_ingest_with_custom_id(self):
        pipe = RAGPipeline()
        doc = pipe.ingest(SAMPLE_ENGLISH, doc_id="my_custom_id")
        assert doc.doc_id == "my_custom_id"

    def test_ingest_empty_content(self):
        pipe = RAGPipeline()
        doc = pipe.ingest("")
        assert doc.chunks == []

    def test_ingest_stores_document(self):
        pipe = RAGPipeline()
        doc = pipe.ingest(SAMPLE_ENGLISH)
        assert doc.doc_id in pipe.documents

    def test_query_returns_retrieval_context(self):
        pipe = RAGPipeline()
        pipe.ingest(SAMPLE_ENGLISH)
        pipe.ingest("Completely unrelated cooking topic.")
        ctx = pipe.query("python programming")
        assert isinstance(ctx, RetrievalContext)
        assert len(ctx.results) >= 1

    def test_query_empty(self):
        pipe = RAGPipeline()
        pipe.ingest(SAMPLE_ENGLISH)
        ctx = pipe.query("")
        assert ctx.results == []
        assert ctx.total_tokens_estimate == 0

    def test_query_no_rerank(self):
        pipe = RAGPipeline()
        pipe.ingest(SAMPLE_ENGLISH)
        ctx = pipe.query("python", use_rerank=False, top_k=3)
        assert len(ctx.results) <= 3

    def test_query_formatted_context(self):
        pipe = RAGPipeline()
        pipe.ingest(SAMPLE_ENGLISH)
        pipe.ingest("Cooking is the art of preparing food.")
        ctx = pipe.query("Python", top_k=2)
        assert len(ctx.formatted_context) > 0
        if len(ctx.results) > 1:
            assert "---" in ctx.formatted_context

    def test_query_token_estimate(self):
        pipe = RAGPipeline()
        pipe.ingest(SAMPLE_ENGLISH)
        ctx = pipe.query("Python")
        assert ctx.total_tokens_estimate > 0

    def test_multi_query(self):
        pipe = RAGPipeline()
        pipe.ingest(SAMPLE_ENGLISH)
        pipe.ingest("Food recipes for cooking enthusiasts.")
        result = pipe.multi_query(["python", "programming"], top_k=2)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_multi_query_empty_queries(self):
        pipe = RAGPipeline()
        pipe.ingest(SAMPLE_ENGLISH)
        result = pipe.multi_query([], top_k=5)
        assert result == ""

    def test_get_context_for_llm(self):
        pipe = RAGPipeline()
        pipe.ingest(SAMPLE_ENGLISH)
        ctx = pipe.get_context_for_llm("Python", max_tokens=500)
        assert isinstance(ctx, str)
        assert len(ctx) > 0
        assert "score=" in ctx

    def test_get_context_for_llm_empty(self):
        pipe = RAGPipeline()
        ctx = pipe.get_context_for_llm("No documents indexed")
        assert ctx == ""

    def test_stats(self):
        pipe = RAGPipeline()
        pipe.ingest(SAMPLE_ENGLISH)
        pipe.ingest("Another document.")
        stats = pipe.stats()
        assert stats["total_documents"] == 2
        assert stats["total_chunks"] > 0
        assert stats["fitted"] is True

    def test_ingest_file(self):
        pipe = RAGPipeline()
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".txt", delete=False, encoding="utf-8"
        ) as f:
            f.write(SAMPLE_ENGLISH)
            f.flush()
            tmp_path = f.name

        try:
            doc = pipe.ingest_file(tmp_path)
            assert doc.metadata["filename"] == os.path.basename(tmp_path)
            assert doc.metadata["source"] == tmp_path
            assert len(doc.chunks) > 0
        finally:
            os.unlink(tmp_path)

    def test_ingest_file_not_found(self):
        pipe = RAGPipeline()
        with pytest.raises(FileNotFoundError):
            pipe.ingest_file("/nonexistent/path/file.txt")

    def test_pipeline_end_to_end(self):
        pipe = RAGPipeline()
        docs = [
            "Python is used for AI and ML applications.",
            "JavaScript is for web development.",
            "Rust is a systems programming language.",
        ]
        for d in docs:
            pipe.ingest(d)

        ctx = pipe.query("AI machine learning", top_k=2)
        assert len(ctx.results) >= 1
        top_text = ctx.results[0].chunk.content.lower()
        assert "python" in top_text or "ai" in top_text

    def test_context_does_not_exceed_max_tokens(self):
        pipe = RAGPipeline()
        pipe.ingest(VERY_LONG_ENGLISH)
        ctx = pipe.get_context_for_llm("sentence", max_tokens=100)
        token_count = len(ctx.split())
        assert token_count <= 100 + 10  # allow minor margin

    def test_pipeline_with_chinese(self):
        pipe = RAGPipeline(
            chunker=DocumentChunker(strategy=ChunkStrategy.SENTENCE, chunk_size=200)
        )
        pipe.ingest(SAMPLE_CHINESE)
        ctx = pipe.query("Python")
        assert len(ctx.results) >= 1

    def test_pipeline_with_mixed_language(self):
        pipe = RAGPipeline()
        pipe.ingest(SAMPLE_MIXED)
        ctx = pipe.query("machine learning")
        assert len(ctx.results) >= 1

    def test_duplicate_ingest(self):
        pipe = RAGPipeline()
        doc1 = pipe.ingest(SAMPLE_ENGLISH)
        doc2 = pipe.ingest(SAMPLE_ENGLISH)
        assert doc1.doc_id != doc2.doc_id

    def test_many_documents(self):
        pipe = RAGPipeline()
        for i in range(20):
            pipe.ingest(f"Document {i} about topic {i % 5}. " * 3)
        stats = pipe.stats()
        assert stats["total_documents"] == 20

    def test_special_characters_in_query(self):
        pipe = RAGPipeline()
        pipe.ingest(SAMPLE_ENGLISH)
        ctx = pipe.query("Python @ # $ % ^ & *")
        assert isinstance(ctx, RetrievalContext)

    def test_unicode_text(self):
        pipe = RAGPipeline()
        pipe.ingest("Café résumé naïve über. Python programming.")
        ctx = pipe.query("Python")
        assert len(ctx.results) >= 1

    def test_strategy_switching(self):
        for strategy in ChunkStrategy:
            pipe = RAGPipeline(
                chunker=DocumentChunker(strategy=strategy, chunk_size=200, chunk_overlap=50)
            )
            doc = pipe.ingest(SAMPLE_ENGLISH)
            assert len(doc.chunks) >= 0  # at minimum no crash
            assert pipe.stats()["chunk_strategy"] == strategy.value


# ============================================================
# Test: Edge Cases
# ============================================================

class TestEdgeCases:
    def test_empty_string_in_pipeline(self):
        pipe = RAGPipeline()
        doc = pipe.ingest("")
        assert doc.chunks == []
        ctx = pipe.query("anything")
        assert ctx.results == []

    def test_single_character_document(self):
        pipe = RAGPipeline()
        doc = pipe.ingest("x")
        assert len(doc.chunks) <= 1  # minimal content
        stats = pipe.stats()
        assert stats["total_documents"] == 1

    def test_single_word_document(self):
        pipe = RAGPipeline()
        doc = pipe.ingest("Python")
        # May or may not produce chunks depending on strategy
        assert doc.doc_id is not None

    def test_only_whitespace(self):
        pipe = RAGPipeline()
        doc = pipe.ingest("   \n\t  \n  ")
        assert doc.chunks == []

    def test_only_special_characters(self):
        pipe = RAGPipeline()
        doc = pipe.ingest("@#$%^&*()")
        assert doc.doc_id is not None

    def test_repeated_identical_chunks(self):
        pipe = RAGPipeline()
        repeated = "Same sentence. " * 50
        doc = pipe.ingest(repeated)
        assert len(doc.chunks) > 0

    def test_very_long_single_line(self):
        pipe = RAGPipeline()
        long_line = "word " * 500
        doc = pipe.ingest(long_line)
        assert doc.doc_id is not None

    def test_html_tags_in_text(self):
        pipe = RAGPipeline()
        text = "<html><body><p>Hello world</p><p>Python is great.</p></body></html>"
        doc = pipe.ingest(text)
        assert len(doc.chunks) > 0

    def test_markdown_text(self):
        pipe = RAGPipeline()
        text = "# Heading\n\n## Subheading\n\nSome **bold** and *italic* text.\n\n- List item 1\n- List item 2"
        doc = pipe.ingest(text)
        assert len(doc.chunks) > 0

    def test_code_snippets(self):
        pipe = RAGPipeline()
        text = "def hello():\n    print('hello')\n    return True\n\nclass Foo:\n    pass"
        doc = pipe.ingest(text)
        assert len(doc.chunks) > 0

    def test_json_content(self):
        pipe = RAGPipeline()
        text = json.dumps({"key": "value", "nested": {"inner": "data"}})
        doc = pipe.ingest(text)
        assert doc.doc_id is not None

    def test_numeric_content(self):
        pipe = RAGPipeline()
        text = "12345 67890 111213. Python 3.11 is the latest."
        doc = pipe.ingest(text)
        ctx = pipe.query("Python")
        assert isinstance(ctx, RetrievalContext)

    def test_multiple_newlines(self):
        pipe = RAGPipeline()
        text = "Para A.\n\n\n\nPara B.\n\n\n\nPara C."
        doc = pipe.ingest(text)
        assert len(doc.chunks) > 0


# ============================================================
# Test: Performance (search speed)
# ============================================================

class TestPerformance:
    def test_search_speed_1000_chunks(self):
        pipe = RAGPipeline(
            chunker=DocumentChunker(strategy=ChunkStrategy.FIXED_SIZE, chunk_size=100, chunk_overlap=0)
        )

        large_text = " ".join(
            f"Document number {i} contains information about topic {i % 10}. "
            for i in range(200)
        )
        pipe.ingest(large_text)

        stats = pipe.stats()

        import time
        start = time.time()
        ctx = pipe.query("topic 5 information", top_k=5)
        elapsed = time.time() - start

        assert elapsed < 5.0, f"Search took {elapsed:.3f}s, expected < 5.0s"
        assert ctx.results is not None


# ============================================================
# Test: Sliding Window Overlap Correctness
# ============================================================

class TestSlidingWindow:
    def test_window_step_calculation(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SLIDING_WINDOW, chunk_size=100, chunk_overlap=20)
        text = "X" * 200
        texts = dc.chunk_text(text)
        assert len(texts) == 3  # 0-100, 80-180, 160-200
        assert texts[0] == "X" * 100
        assert texts[1] == "X" * 100

    def test_window_no_overlap(self):
        dc = DocumentChunker(strategy=ChunkStrategy.SLIDING_WINDOW, chunk_size=50, chunk_overlap=0)
        text = "Y" * 120
        texts = dc.chunk_text(text)
        assert len(texts) == 3
        assert texts[0] == "Y" * 50
        assert texts[1] == "Y" * 50
        assert texts[2] == "Y" * 20


# ============================================================
# Test: Vector Store Document Index Integrity
# ============================================================

class TestVectorStoreIndex:
    def test_doc_index_after_add(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        dc.chunk_document(doc)
        vs.add_document(doc)
        assert "d1" in vs._doc_index
        assert len(vs._doc_index["d1"]) == len(doc.chunks)

    def test_doc_index_after_remove(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc1 = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        doc2 = Document(doc_id="d2", content="Other doc.")
        for doc in [doc1, doc2]:
            dc.chunk_document(doc)
            vs.add_document(doc)

        vs.remove_document("d1")
        assert "d1" not in vs._doc_index
        assert "d2" in vs._doc_index

    def test_remove_then_search(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc1 = Document(doc_id="d1", content=SAMPLE_ENGLISH)
        doc2 = Document(doc_id="d2", content="Cooking recipes for delicious meals.")
        dc.chunk_document(doc1)
        dc.chunk_document(doc2)
        vs.add_document(doc1)
        vs.add_document(doc2)

        vs.remove_document("d2")
        results = vs.search("cooking", top_k=5)
        assert len(results) == 0


# ============================================================
# Test: Cosine Similarity Edge Cases
# ============================================================

class TestCosineSimilarity:
    def test_identical_vectors_score_one(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content="hello world")
        dc.chunk_document(doc)
        vs.add_document(doc)

        results = vs.search("hello world", top_k=1)
        assert len(results) > 0
        assert abs(results[0].score - 1.0) < 0.01

    def test_completely_different_text_low_score(self):
        vs = VectorStore()
        dc = DocumentChunker(strategy=ChunkStrategy.SENTENCE)
        doc = Document(doc_id="d1", content="python programming AI machine learning")
        dc.chunk_document(doc)
        vs.add_document(doc)

        results = vs.search("quantum physics thermodynamics entropy", top_k=5)
        if results:
            assert results[0].score < 0.5, f"Expected low score, got {results[0].score}"


# ============================================================
# Test: MMR Algorithm Correctness
# ============================================================

class TestMMR:
    def test_mmr_keeps_first_result_unchanged(self):
        rr = Reranker()
        chunks = [
            Chunk(chunk_id="c0", doc_id="d1", content="AAA BBB CCC", index=0),
            Chunk(chunk_id="c1", doc_id="d2", content="DDD EEE FFF", index=0),
            Chunk(chunk_id="c2", doc_id="d3", content="GGG HHH III", index=0),
        ]
        results = [SearchResult(chunk=c, score=0.9 - i * 0.1, rank=0) for i, c in enumerate(chunks)]
        reranked = rr.rerank("AAA", results, top_k=3)
        assert reranked[0].chunk.chunk_id == "c0"

    def test_mmr_diversifies_high_similarity(self):
        rr = Reranker()
        chunks = [
            Chunk(chunk_id="c0", doc_id="d1", content="python AI ML deep neural network training", index=0),
            Chunk(chunk_id="c1", doc_id="d2", content="python AI ML shallow neural network training", index=0),
        ]
        results = [
            SearchResult(chunk=chunks[0], score=0.95, rank=0),
            SearchResult(chunk=chunks[1], score=0.93, rank=1),
        ]
        reranked = rr.rerank("python AI ML", results, top_k=2)
        assert reranked[0].chunk.chunk_id == "c0"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
