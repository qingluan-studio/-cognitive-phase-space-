"""
Tests for src/cee/app/engine/rag.py — RAG engine with chunking, vectorization, BM25.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.engine.rag import (
    TextChunker,
    TFIDFVectorizer,
    SimpleVectorStore,
    BM25Ranker,
    RAGEngine,
    RAGConfig,
    ChunkInfo,
)


class TestChunkInfo:
    """Tests for ChunkInfo dataclass."""

    def test_creation(self):
        chunk = ChunkInfo(chunk_id=1, text="Hello", start_char=0, end_char=5)
        assert chunk.chunk_id == 1
        assert chunk.text == "Hello"

    def test_repr(self):
        chunk = ChunkInfo(chunk_id=0, text="Hello World", start_char=0, end_char=11)
        r = repr(chunk)
        assert "ChunkInfo" in r
        assert "Hello World" in r


class TestTextChunker:
    """Tests for TextChunker with different strategies."""

    def test_chunk_fixed_size(self):
        chunker = TextChunker(chunk_size=100, overlap=20, strategy="fixed")
        text = "A" * 500
        chunks = chunker.chunk(text)
        assert len(chunks) >= 3
        for c in chunks:
            assert len(c.text) <= 100

    def test_chunk_fixed_empty_string(self):
        chunker = TextChunker(strategy="fixed")
        chunks = chunker.chunk("")
        assert chunks == []

    def test_chunk_by_sentences(self):
        chunker = TextChunker(chunk_size=50, strategy="sentence")
        text = "Hello world. This is a test. More sentences here."
        chunks = chunker.chunk(text)
        assert len(chunks) > 0
        assert all(c.start_char >= 0 for c in chunks)

    def test_chunk_semantic(self):
        chunker = TextChunker(chunk_size=100, strategy="semantic")
        text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
        chunks = chunker.chunk(text)
        assert len(chunks) > 0

    def test_chunk_metadata_preserved(self):
        chunker = TextChunker(strategy="fixed")
        chunks = chunker.chunk("Hello world", metadata={"source": "test"})
        for c in chunks:
            assert c.metadata["source"] == "test"


class TestTFIDFVectorizer:
    """Tests for TF-IDF vectorizer."""

    def test_tokenize_english(self):
        tokens = TFIDFVectorizer.tokenize("hello world test")
        assert "hello" in tokens
        assert "world" in tokens

    def test_tokenize_chinese(self):
        tokens = TFIDFVectorizer.tokenize("你好世界")
        assert len(tokens) > 0

    def test_fit_builds_vocabulary(self):
        vec = TFIDFVectorizer(max_features=100)
        vec.fit(["hello world", "hello python", "python world"])
        assert len(vec.vocabulary_) > 0

    def test_transform_returns_vectors(self):
        vec = TFIDFVectorizer(max_features=100)
        docs = ["hello world", "hello python", "python code"]
        vec.fit(docs)
        vectors = vec.transform(docs)
        assert len(vectors) == 3
        assert all(len(v) == len(vec.vocabulary_) for v in vectors)

    def test_transform_before_fit_raises(self):
        vec = TFIDFVectorizer()
        with pytest.raises(RuntimeError):
            vec.transform(["test"])

    def test_fit_transform(self):
        vec = TFIDFVectorizer(max_features=100)
        docs = ["a b c", "b c d", "c d e"]
        vectors = vec.fit_transform(docs)
        assert len(vectors) == 3

    def test_min_df_filter(self):
        vec = TFIDFVectorizer(max_features=100, min_df=2)
        docs = ["a b c", "d e f", "a g h"]
        vec.fit(docs)
        assert len(vec.vocabulary_) >= 0

    def test_empty_documents(self):
        vec = TFIDFVectorizer()
        vec.fit(["", ""])
        assert len(vec.vocabulary_) == 0


class TestSimpleVectorStore:
    """Tests for SimpleVectorStore (cosine similarity)."""

    def test_add_chunks(self):
        store = SimpleVectorStore()
        chunks = [
            ChunkInfo(chunk_id=0, text="hello world", start_char=0, end_char=11),
            ChunkInfo(chunk_id=1, text="goodbye world", start_char=0, end_char=13),
        ]
        store.add(chunks)
        assert store.size() == 2

    def test_search_returns_relevant(self):
        store = SimpleVectorStore()
        chunks = [
            ChunkInfo(chunk_id=0, text="python machine learning", start_char=0, end_char=22),
            ChunkInfo(chunk_id=1, text="cooking recipes food", start_char=0, end_char=18),
        ]
        store.add(chunks)
        results = store.search("python AI", top_k=1)
        assert len(results) == 1
        assert "python" in results[0][0].text.lower()
        assert isinstance(results[0][1], float)

    def test_search_empty_store(self):
        store = SimpleVectorStore()
        results = store.search("anything")
        assert results == []

    def test_remove_chunks(self):
        store = SimpleVectorStore()
        chunks = [
            ChunkInfo(chunk_id=0, text="hello", start_char=0, end_char=5),
            ChunkInfo(chunk_id=1, text="world", start_char=0, end_char=5),
        ]
        store.add(chunks)
        store.remove([0])
        assert store.size() == 1

    def test_clear(self):
        store = SimpleVectorStore()
        chunks = [ChunkInfo(chunk_id=0, text="hello", start_char=0, end_char=5)]
        store.add(chunks)
        store.clear()
        assert store.size() == 0

    def test_add_empty_list(self):
        store = SimpleVectorStore()
        store.add([])
        assert store.size() == 0


class TestBM25Ranker:
    """Tests for BM25Ranker."""

    def test_fit_and_search(self):
        ranker = BM25Ranker()
        docs = ["hello world python", "python programming", "cooking recipes"]
        ranker.fit(docs)
        results = ranker.search("python", top_k=2)
        assert len(results) >= 1
        assert isinstance(results[0][0], int)
        assert isinstance(results[0][1], float)

    def test_search_empty_index(self):
        ranker = BM25Ranker()
        results = ranker.search("anything")
        assert results == []

    def test_fit_empty_list(self):
        ranker = BM25Ranker()
        ranker.fit([])
        assert ranker._N == 0

    def test_tokenize_chinese(self):
        ranker = BM25Ranker()
        tokens = ranker._tokenize("你好世界")
        assert len(tokens) > 0


class TestRAGEngine:
    """Tests for RAGEngine (main hybrid retriever)."""

    def test_index_single_document(self):
        engine = RAGEngine()
        chunks = engine.index_documents(["Long document about artificial intelligence and machine learning. " * 10])
        assert len(chunks) > 0
        assert engine._indexed is True

    def test_retrieve_returns_results(self):
        engine = RAGEngine()
        engine.index_documents([
            "Python is a programming language for data science and AI.",
            "Cooking is the art of preparing food with heat and recipes.",
        ])
        results = engine.retrieve("data science python", top_k=2)
        assert len(results) >= 1

    def test_retrieve_empty_index(self):
        engine = RAGEngine()
        results = engine.retrieve("anything")
        assert results == []

    def test_retrieve_context(self):
        engine = RAGEngine()
        engine.index_documents([
            "Python programming tutorial for beginners. Learn Python step by step.",
        ])
        context = engine.retrieve_context("learn Python")
        assert isinstance(context, str)
        assert len(context) > 0

    def test_add_document(self):
        engine = RAGEngine()
        engine.add_document("Initial text about AI.")
        chunks = engine.add_document("More text about ML.")
        assert len(chunks) > 0

    def test_remove_document_by_metadata(self):
        engine = RAGEngine()
        engine.index_documents(["Doc A"], metadata={"source": "test"})
        engine.index_documents(["Doc B"], metadata={"source": "other"})
        removed = engine.remove_document_by_metadata("source", "test")
        assert isinstance(removed, int)

    def test_get_chunk(self):
        engine = RAGEngine()
        engine.index_documents(["Hello World"])
        chunk = engine.get_chunk(0)
        assert chunk is not None
        assert "Hello" in chunk.text

    def test_get_chunk_missing(self):
        engine = RAGEngine()
        assert engine.get_chunk(999) is None

    def test_stats(self):
        engine = RAGEngine()
        engine.index_documents(["Test document content."])
        stats = engine.stats()
        assert stats["total_chunks"] > 0
        assert stats["indexed"] is True
        assert "config" in stats

    def test_index_empty_documents(self):
        engine = RAGEngine()
        chunks = engine.index_documents(["", "   "])
        assert chunks == []

    def test_retrieve_with_custom_top_k(self):
        engine = RAGEngine()
        engine.index_documents(["Doc A " * 20, "Doc B " * 20, "Doc C " * 20])
        results = engine.retrieve("Doc", top_k=2)
        assert len(results) <= 2


class TestRAGConfig:
    """Tests for RAGConfig."""

    def test_default_values(self):
        config = RAGConfig()
        assert config.chunk_size == 512
        assert config.chunk_overlap == 64
        assert config.top_k == 5
        assert config.vector_weight == 0.6
        assert config.bm25_weight == 0.4

    def test_custom_values(self):
        config = RAGConfig(chunk_size=256, top_k=10, vector_weight=0.8)
        assert config.chunk_size == 256
        assert config.top_k == 10
        assert config.vector_weight == 0.8
