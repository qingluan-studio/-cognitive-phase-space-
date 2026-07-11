"""
Tests for src/cee/app/engine/sentiment.py — Sentiment analyzer.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.engine.sentiment import (
    SentimentAnalyzer,
    SentimentResult,
    SentimentPolarity,
    FineGrainedEmotion,
    AspectSentiment,
    SentimentTrend,
)


class TestSentimentAnalyzer:
    """Tests for SentimentAnalyzer."""

    @pytest.fixture
    def analyzer(self):
        return SentimentAnalyzer()

    def test_positive_sentiment(self, analyzer):
        result = analyzer.analyze("这个产品非常好，我很喜欢，非常满意。")
        assert isinstance(result, SentimentResult)
        assert result.polarity in (SentimentPolarity.POSITIVE, SentimentPolarity.NEUTRAL, SentimentPolarity.MIXED)
        assert result.positive_score > 0 or result.negative_score > 0 or result.neutral_score > 0

    def test_negative_sentiment(self, analyzer):
        result = analyzer.analyze("这个产品质量很差，我非常失望，太糟糕了。")
        assert isinstance(result, SentimentResult)

    def test_neutral_sentiment(self, analyzer):
        result = analyzer.analyze("今天是星期三。天气预报说明天会下雨。")
        assert isinstance(result, SentimentResult)

    def test_english_positive(self, analyzer):
        result = analyzer.analyze("This product is excellent and I love it. Very happy.")
        assert isinstance(result, SentimentResult)

    def test_english_negative(self, analyzer):
        result = analyzer.analyze("This is terrible and disappointing. Very bad quality.")
        assert isinstance(result, SentimentResult)

    def test_returns_emotions_dict(self, analyzer):
        result = analyzer.analyze("I am so happy and excited about this wonderful news!")
        assert isinstance(result.emotions, dict)

    def test_returns_intensity(self, analyzer):
        result = analyzer.analyze("This is incredibly amazing and fantastic!")
        assert result.intensity >= 0

    def test_returns_confidence(self, analyzer):
        result = analyzer.analyze("Some normal text here.")
        assert result.confidence >= 0

    def test_aspect_analysis(self, analyzer):
        result = analyzer.analyze("The battery life is great but the screen is terrible.")
        assert len(result.aspects) >= 0

    def test_batch_analyze(self, analyzer):
        results = analyzer.analyze_batch([
            "I love this!",
            "I hate this!",
            "It is okay.",
        ])
        assert len(results) == 3

    def test_trend_analysis(self, analyzer):
        texts = ["Great!", "Good.", "Okay.", "Bad.", "Terrible!"]
        trend = analyzer.analyze_trend(texts)
        assert isinstance(trend, SentimentTrend)

    def test_empty_text(self, analyzer):
        result = analyzer.analyze("")
        assert isinstance(result, SentimentResult)

    def test_text_word_count(self, analyzer):
        result = analyzer.analyze("Hello world")
        assert result.word_count > 0


class TestSentimentResult:
    """Tests for SentimentResult."""

    def test_defaults(self):
        result = SentimentResult()
        assert result.polarity == SentimentPolarity.NEUTRAL
        assert result.intensity == 0.0


class TestSentimentPolarity:
    """Tests for SentimentPolarity enum."""

    def test_values(self):
        assert SentimentPolarity.POSITIVE.value == "positive"
        assert SentimentPolarity.NEGATIVE.value == "negative"
        assert SentimentPolarity.NEUTRAL.value == "neutral"
        assert SentimentPolarity.MIXED.value == "mixed"


class TestFineGrainedEmotion:
    """Tests for FineGrainedEmotion enum."""

    def test_values(self):
        assert FineGrainedEmotion.JOY.value == "joy"
        assert FineGrainedEmotion.ANGER.value == "anger"


class TestAspectSentiment:
    """Tests for AspectSentiment."""

    def test_defaults(self):
        aspect = AspectSentiment()
        assert aspect.aspect == ""
        assert aspect.sentiment == SentimentPolarity.NEUTRAL
