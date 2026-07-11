"""
Tests for src/cee/app/engine/summarizer.py — Text summarizer.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.engine.summarizer import (
    TextSummarizer,
    SummaryResult,
    BatchSummaryResult,
    SentenceInfo,
)


class TestTextSummarizer:
    """Tests for TextSummarizer."""

    @pytest.fixture
    def summarizer(self):
        return TextSummarizer(default_method="extractive", default_ratio=0.5, min_sentences=1)

    def test_summarize_short_text(self, summarizer):
        text = "Python is a programming language. It is widely used in data science. Machine learning relies on Python."
        result = summarizer.summarize(text)
        assert isinstance(result, SummaryResult)
        assert result.summary != ""
        assert result.compression_ratio >= 0

    def test_summarize_extractive_method(self, summarizer):
        text = ("Artificial intelligence is transforming industries. "
                "Healthcare benefits from AI diagnostics. "
                "Education uses AI for personalized learning. "
                "Finance employs AI for fraud detection.")
        result = summarizer.summarize(text, method="extractive", ratio=0.5)
        assert result.method == "extractive"
        assert len(result.summary) > 0

    def test_summarize_with_keywords(self, summarizer):
        text = ("Python is great for web development. "
                "Django is a Python web framework. Flask is also popular.")
        result = summarizer.summarize(text, keywords=["Python", "web"])
        assert len(result.summary) > 0

    def test_summarize_with_max_sentences(self, summarizer):
        text = ". ".join([f"Sentence {i}" for i in range(10)])
        result = summarizer.summarize(text, max_sentences=2)
        assert len(result.sentences) > 0

    def test_summarize_empty_text(self, summarizer):
        result = summarizer.summarize("")
        assert result.summary == ""

    def test_summarize_length_control(self, summarizer):
        text = ("Long text about technology. " * 20)
        result = summarizer.summarize(text, ratio=0.1)
        assert result.summary_length < result.original_length

    def test_summarize_batch(self, summarizer):
        texts = [
            "A short text about Python programming.",
            "Another text about data science and AI.",
        ]
        result = summarizer.batch_summarize(texts)
        assert isinstance(result, BatchSummaryResult)
        assert len(result.results) == 2

    def test_summarize_batch_empty(self, summarizer):
        result = summarizer.batch_summarize([])
        assert len(result.results) == 0


class TestSummaryResult:
    """Tests for SummaryResult."""

    def test_defaults(self):
        result = SummaryResult()
        assert result.summary == ""
        assert result.compression_ratio == 0.0


class TestSentenceInfo:
    """Tests for SentenceInfo."""

    def test_defaults(self):
        info = SentenceInfo()
        assert info.text == ""


class TestBatchSummaryResult:
    """Tests for BatchSummaryResult."""

    def test_defaults(self):
        result = BatchSummaryResult()
        assert result.results == []
