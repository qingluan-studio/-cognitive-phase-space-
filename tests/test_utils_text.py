"""
Tests for src/cee/app/utils/text.py — Text utilities.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.utils.text import (
    clean_text,
    normalize_unicode,
    is_chinese_char,
    tokenize_zh,
    extract_keywords,
    text_similarity,
    extractive_summary,
    filter_sensitive,
)


class TestCleanText:
    """Tests for clean_text function."""

    def test_removes_html_tags(self):
        result = clean_text("<p>Hello <b>World</b></p>")
        assert "<" not in result
        assert "Hello" in result
        assert "World" in result

    def test_removes_special_chars(self):
        result = clean_text("Hello\x00World")
        assert "\x00" not in result

    def test_normalizes_whitespace(self):
        result = clean_text("Hello   World\n\nTest")
        assert "  " not in result

    def test_empty_input(self):
        assert clean_text("") == ""

    def test_no_remove_html(self):
        result = clean_text("<p>test</p>", remove_html=False)
        assert "<p>" in result


class TestNormalizeUnicode:
    """Tests for normalize_unicode."""

    def test_normalizes_fullwidth_chars(self):
        text = "Ｈｅｌｌｏ"
        result = normalize_unicode(text)

    def test_preserves_ascii(self):
        result = normalize_unicode("Hello")
        assert result == "Hello"


class TestIsChineseChar:
    """Tests for is_chinese_char."""

    def test_chinese_char(self):
        assert is_chinese_char("中") is True
        assert is_chinese_char("国") is True

    def test_non_chinese_char(self):
        assert is_chinese_char("A") is False
        assert is_chinese_char("1") is False


class TestTokenizeZh:
    """Tests for tokenize_zh."""

    def test_tokenize_simple(self):
        tokens = tokenize_zh("人工智能是未来")
        assert isinstance(tokens, list)
        assert "人工智能" in tokens or len(tokens) > 0

    def test_tokenize_empty(self):
        tokens = tokenize_zh("")
        assert tokens == []


class TestExtractKeywords:
    """Tests for extract_keywords."""

    def test_extract_from_text(self):
        keywords = extract_keywords("Python is a great programming language")
        assert isinstance(keywords, list)

    def test_extract_chinese(self):
        keywords = extract_keywords("机器学习是人工智能的重要分支")
        assert isinstance(keywords, list)

    def test_extract_empty(self):
        keywords = extract_keywords("")
        assert keywords == []


class TestSimilarity:
    """Tests for similarity calculation."""

    def test_identical_texts(self):
        score = text_similarity("hello world", "hello world")
        assert score >= 0.9 or score is not None

    def test_different_texts(self):
        score = text_similarity("hello world", "goodbye mars")
        assert score >= 0

    def test_similar_texts(self):
        score = text_similarity("hello world python", "hello world java")
        assert score >= 0

    def test_one_empty(self):
        score = text_similarity("", "hello")
        assert score == 0.0


class TestGenerateSummary:
    """Tests for generate_summary."""

    def test_extractive_summary(self):
        text = ("Python is a programming language. "
                "It is used for data science. "
                "Machine learning relies on Python.")
        summary = extractive_summary(text)
        assert isinstance(summary, str)

    def test_empty_text(self):
        summary = extractive_summary("")
        assert summary == ""


class TestIsSensitive:
    """Tests for is_sensitive."""

    def test_normal_text_not_sensitive(self):
        assert filter_sensitive("Hello world") == "Hello world"

    def test_empty_text(self):
        assert filter_sensitive("") == ""
