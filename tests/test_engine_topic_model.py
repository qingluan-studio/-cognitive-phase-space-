"""
Tests for src/cee/app/engine/topic_model.py -- Topic analyzer.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.engine.topic_model import (
    TopicAnalyzer,
    Topic,
    DocumentTopic,
    TopicEvolution,
    TopicAnalysisResult,
    VisualizationData,
)


class TestTopicAnalyzer:
    """Tests for TopicAnalyzer."""

    @pytest.fixture
    def analyzer(self):
        return TopicAnalyzer(num_topics=5)

    def test_extract_topics(self, analyzer):
        docs = [
            "Python machine learning data science AI deep learning",
            "Artificial intelligence neural networks deep learning",
            "Cooking recipes food cuisine baking kitchen",
            "Baking bread cake cookies dessert recipe",
            "React JavaScript frontend web development components",
        ]
        result = analyzer.fit_transform(docs)
        assert isinstance(result, TopicAnalysisResult)
        assert len(result.topics) > 0

    def test_extract_topics_single_doc(self, analyzer):
        docs = ["Python programming language"]
        result = analyzer.fit_transform(docs)
        assert isinstance(result, TopicAnalysisResult)

    def test_extract_topics_empty(self, analyzer):
        result = analyzer.fit_transform([])
        assert isinstance(result, TopicAnalysisResult)

    def test_topics_have_keywords(self, analyzer):
        docs = ["machine learning AI Python", "deep learning neural networks"]
        result = analyzer.fit_transform(docs)
        for topic in result.topics:
            assert len(topic.keywords) > 0

    def test_topics_have_weights(self, analyzer):
        docs = ["topic a text", "topic b text", "topic c text"]
        result = analyzer.fit_transform(docs)
        for topic in result.topics:
            assert topic.weight >= 0

    def test_document_topics(self, analyzer):
        docs = ["Python coding", "cooking food", "sports football"]
        result = analyzer.fit_transform(docs)
        assert len(result.document_topics) > 0
        for dt in result.document_topics:
            assert dt.primary_topic != ""

    def test_topic_graph(self, analyzer):
        docs = ["AI and machine learning", "deep learning neural networks",
                "data science statistics"]
        result = analyzer.fit_transform(docs)
        assert isinstance(result.topic_graph, dict)

    def test_hot_topics(self, analyzer):
        docs = ["AI revolution", "AI future", "AI breakthrough"]
        result = analyzer.fit_transform(docs)
        assert isinstance(result.hot_topics, list)

    def test_visualization_data(self, analyzer):
        docs = ["Topic one text", "Topic two text"]
        result = analyzer.fit_transform(docs)
        viz = analyzer.generate_visualization_data(result)
        assert isinstance(viz, VisualizationData)

    def test_topic_evolution(self, analyzer):
        documents_by_time = {
            "2020": ["machine learning AI"],
            "2021": ["deep learning transformer"],
            "2022": ["large language models GPT"],
        }
        evolution = analyzer.track_evolution(documents_by_time)
        assert isinstance(evolution, TopicEvolution) or evolution is not None

    def test_num_topics_respected(self, analyzer):
        docs = ["a", "b", "c", "d", "e", "f"]
        analyzer2 = TopicAnalyzer(num_topics=2)
        result = analyzer2.fit_transform(docs)
        assert len(result.topics) <= 2


class TestTopic:
    """Tests for Topic dataclass."""

    def test_creation(self):
        topic = Topic(id="t1", label="AI", keywords=[("ml", 0.9)])
        assert topic.id == "t1"


class TestDocumentTopic:
    """Tests for DocumentTopic."""

    def test_creation(self):
        dt = DocumentTopic(doc_id="d1", primary_topic="t1")
        assert dt.doc_id == "d1"
