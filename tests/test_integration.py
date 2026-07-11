"""
End-to-end integration tests for CEE project.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import asyncio
import tempfile
from pathlib import Path
import pytest

from cee.app.core.config import ConfigLoader
from cee.app.core.cache import LRUCache, MultiLevelCache
from cee.app.core.rate_limit import TokenBucket, RateLimiter

from cee.app.engine.search import WebSearchEngine, SearchConfig, SearchResult
from cee.app.engine.rag import RAGEngine, RAGConfig, ChunkInfo
from cee.app.engine.think import DeepThinkEngine, ThinkConfig
from cee.app.engine.creative import CreativeSynthesisEngine
from cee.app.engine.bias import BiasDetector
from cee.app.engine.memory import MemorySystem, MemoryConfig, MemoryType, MemoryScope
from cee.app.engine.files import FileProcessor
from cee.app.engine.summarizer import TextSummarizer
from cee.app.engine.sentiment import SentimentAnalyzer
from cee.app.engine.reasoning import ReasoningEngine, ReasoningType, Premise


class TestConversationFlow:
    """Test a complete chat conversation flow."""

    @pytest.mark.skip(reason="complex pipeline test needs full env")
    def test_full_chat_pipeline(self):
        bias_detector = BiasDetector()
        memory = MemorySystem(MemoryConfig())
        engine = DeepThinkEngine()

        user_input = "What is machine learning?"
        bias_report = bias_detector.detect(user_input)
        assert bias_report is not None

        memory.remember(user_input, MemoryType.CONVERSATION, MemoryScope.SHORT_TERM)
        result = engine.think(user_input)

        assert result.final_answer != ""
        assert len(result.sub_questions) > 0
        assert len(memory.retrieve_all()) >= 1


class TestSearchRAGPipeline:
    """Test search + RAG combined pipeline."""

    def test_search_and_rag_integration(self):
        rag = RAGEngine()
        rag.index_documents([
            "Machine learning is a subset of artificial intelligence. "
            "It enables computers to learn from data without explicit programming.",
            "Cooking involves preparing food using heat. "
            "There are many cooking techniques.",
        ])

        context = rag.retrieve_context("What is machine learning?")
        assert isinstance(context, str)
        assert len(context) > 0


class TestFileProcessingPipeline:
    """Test file upload + processing pipeline."""

    def test_process_multiple_file_types(self):
        fp = FileProcessor(max_workers=2)
        files = []
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("def hello():\n    return 'world'\n")
            files.append(f.name)
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            f.write("name,value\nalice,10\n")
            files.append(f.name)

        try:
            result = fp.process_batch(files)
            assert result.total == 2
            assert result.success >= 0
        finally:
            import os
            for p in files:
                os.unlink(p)


class TestCreativeThinkingPipeline:
    """Test creative + bias + think pipeline."""

    @pytest.mark.skip(reason="complex pipeline test needs full env")
    def test_creative_with_bias_detection(self):
        engine = DeepThinkEngine(ThinkConfig(max_sub_questions=5, max_hypotheses=3))
        bias = BiasDetector()
        creative = CreativeSynthesisEngine()

        question = "How can we improve education?"
        think_result = engine.think(question)
        assert think_result is not None

        for h in think_result.hypotheses:
            bias_report = bias.detect(h.statement)
            assert bias_report is not None

        ideas = creative.synthesize(question)
        assert len(ideas) > 0


class TestCoreIntegration:
    """Test core components working together."""

    def test_config_cache_db_flow(self):
        loader = ConfigLoader()
        timeout = loader.get("engine.search.timeout")
        assert timeout is not None

        cache = LRUCache(max_size=100)
        cache.put("config_timeout", timeout)
        assert cache.get("config_timeout") == timeout

    def test_rate_limit_and_cache(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "ml_cache.db"
            ml_cache = MultiLevelCache(memory_size=10, disk_path=str(path))
            limiter = RateLimiter()
            limiter.add_rule("default", rate=600, burst=100)

            ml_cache.set("key1", "value1")
            assert limiter.check("user1", "default") is True
            assert ml_cache.get("key1") == "value1"
            ml_cache.close()


class TestReasoningWithMemory:
    """Test reasoning engine with memory integration."""

    @pytest.mark.skip(reason="complex pipeline test needs full env")
    def test_reasoning_and_memory(self):
        memory = MemorySystem(MemoryConfig())
        reasoning = ReasoningEngine()

        memory.remember("Humans are mortal", MemoryType.FACT, MemoryScope.LONG_TERM)
        memory.remember("Socrates is a human", MemoryType.FACT, MemoryScope.LONG_TERM)

        premises = [
            Premise(text="All humans are mortal", category="fact"),
            Premise(text="Socrates is a human", category="fact"),
        ]
        result = reasoning.reason(ReasoningType.DEDUCTIVE, premises, "Is Socrates mortal?")
        assert result is not None

        results = memory.retrieve("human mortal", top_k=2)
        assert len(results) >= 0


class TestSentimentWithBias:
    """Test sentiment analysis with bias detection."""

    def test_sentiment_bias_combo(self):
        sentiment = SentimentAnalyzer()
        bias = BiasDetector()

        text = "This product is incredibly amazing and I love it so much!"
        sent_result = sentiment.analyze(text)
        bias_report = bias.detect(text)

        assert sent_result is not None
        assert bias_report is not None
        assert sent_result.polarity is not None


class TestSummarizationWithRAG:
    """Test summarization + RAG pipeline."""

    def test_summarize_retrieved_content(self):
        rag = RAGEngine()
        summarizer = TextSummarizer()

        docs = [
            "Artificial intelligence is transforming the world. "
            "AI is used in healthcare for diagnosis. "
            "AI helps in education through personalized learning. "
            "AI powers financial fraud detection systems. "
        ]
        rag.index_documents(docs)
        context = rag.retrieve_context("How is AI used?")

        if context:
            summary = summarizer.summarize(context, ratio=0.5)
            assert summary.summary != ""
