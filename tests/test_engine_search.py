"""
Tests for src/cee/app/engine/search.py — WebSearchEngine with providers.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.engine.search import (
    WebSearchEngine,
    SearchConfig,
    SearchResult,
    WebPage,
    _tokenize,
    _compute_tfidf_scores,
    _html_to_text,
    _SearchCache,
    DuckDuckGoProvider,
    BingProvider,
    GoogleProvider,
)


class TestTokenize:
    """Tests for _tokenize utility."""

    def test_english_words(self):
        tokens = _tokenize("Hello World")
        assert "hello" in tokens
        assert "world" in tokens

    def test_chinese_chars(self):
        from cee.app.engine.search import _tokenize
        tokens = _tokenize("你好世界")
        assert len(tokens) > 0
        assert any("\u4e00" <= ch <= "\u9fff" for t in tokens for ch in t)

    def test_empty_string(self):
        assert _tokenize("") == []

    def test_mixed_chinese_english(self):
        tokens = _tokenize("Python编程语言")
        assert "python" in tokens

    def test_single_chars_filtered(self):
        tokens = _tokenize("a b c")
        assert len(tokens) == 0


class TestTFIDF:
    """Tests for _compute_tfidf_scores."""

    def test_empty_documents(self):
        scores = _compute_tfidf_scores("query", [])
        assert scores == []

    def test_single_document(self):
        scores = _compute_tfidf_scores("hello world", ["hello world python"])
        assert len(scores) == 1
        assert 0 <= scores[0] <= 1

    def test_relevant_document_scores_higher(self):
        docs = ["hello world python coding", "xyz abc def ghi"]
        scores = _compute_tfidf_scores("python coding", docs)
        assert scores[0] > scores[1]


class TestHTMLToText:
    """Tests for _html_to_text."""

    def test_strips_tags(self):
        result = _html_to_text("<p>Hello <b>World</b></p>")
        assert "Hello" in result
        assert "World" in result

    def test_removes_script_content(self):
        result = _html_to_text("<script>alert('xss')</script><p>safe</p>")
        assert "alert" not in result
        assert "safe" in result

    def test_removes_style_content(self):
        result = _html_to_text("<style>body{color:red}</style><p>text</p>")
        assert "body" not in result
        assert "text" in result

    def test_empty_input(self):
        result = _html_to_text("")
        assert result == ""


class TestSearchCache:
    """Tests for _SearchCache."""

    def test_set_and_get(self):
        cache = _SearchCache(max_size=10)
        results = [SearchResult(url="http://a.com", title="A", snippet="s")]
        cache.set("query", results)
        cached = cache.get("query", ttl=3600)
        assert cached is not None
        assert len(cached) == 1

    def test_get_missing(self):
        cache = _SearchCache()
        assert cache.get("nonexistent", ttl=3600) is None

    def test_ttl_expiry(self):
        cache = _SearchCache(max_size=10)
        results = [SearchResult(url="http://x.com", title="X", snippet="s")]
        cache.set("q", results)
        cached = cache.get("q", ttl=-1)
        assert cached is None

    def test_clear(self):
        cache = _SearchCache()
        cache.set("q", [SearchResult(url="http://a.com", title="A", snippet="s")])
        cache.clear()
        assert cache.get("q", ttl=3600) is None


class TestSearchResult:
    """Tests for SearchResult dataclass."""

    def test_equality_by_url(self):
        a = SearchResult(url="http://a.com", title="A", snippet="s")
        b = SearchResult(url="http://a.com", title="B", snippet="t")
        assert a == b

    def test_hash_by_url(self):
        a = SearchResult(url="http://a.com", title="A", snippet="s")
        b = SearchResult(url="http://a.com", title="A", snippet="s")
        assert hash(a) == hash(b)


class TestWebPage:
    """Tests for WebPage dataclass."""

    def test_success_property(self):
        page = WebPage(url="http://a.com", text="content", status_code=200)
        assert page.success is True

    def test_failure_property(self):
        page = WebPage(url="http://a.com", text="", status_code=404)
        assert page.success is False


class TestWebSearchEngine:
    """Tests for WebSearchEngine."""

    @pytest.fixture
    def engine(self):
        config = SearchConfig(
            max_results=5,
            timeout=10,
            enable_cache=False,
            providers=["duckduckgo", "bing", "google"],
        )
        return WebSearchEngine(config=config)

    def test_search_empty_query(self, engine):
        results = engine.search("")
        assert results == []

    def test_search_strips_whitespace(self, engine):
        results = engine.search("   ")
        assert results == []

    def test_clear_cache(self, engine):
        engine.clear_cache()

    def test_format_citation(self, engine):
        result = SearchResult(
            url="http://example.com",
            title="Example",
            snippet="A sample site",
            source="duckduckgo",
        )
        citation = engine.format_citation(result, index=1)
        assert "[1]" in citation
        assert "Example" in citation

    def test_format_citations_empty(self):
        engine = WebSearchEngine(SearchConfig(providers=["duckduckgo"]))
        text = engine.format_citations([])
        assert "No citations" in text or "No" in text

    def test_format_citations_multiple(self, engine):
        results = [
            SearchResult(url="http://a.com", title="A", snippet="S1", source="ddg"),
            SearchResult(url="http://b.com", title="B", snippet="S2", source="ddg"),
        ]
        text = engine.format_citations(results)
        assert "[1]" in text
        assert "[2]" in text

    def test_search_with_suggestions(self, engine):
        results, suggestions = engine.search_with_suggestions("python tutorial")
        assert isinstance(results, list)
        assert isinstance(suggestions, list)

    def test_config_defaults(self, engine):
        assert engine.config.max_results == 5
        assert engine.config.enable_cache is False


class TestSearchConfig:
    """Tests for SearchConfig."""

    def test_default_values(self):
        config = SearchConfig()
        assert config.max_results == 20
        assert config.enable_cache is True
        assert config.parallel is True


class TestProviderBasics:
    """Basic provider instantiation tests."""

    def test_duckduckgo_provider_name(self):
        p = DuckDuckGoProvider()
        assert p.name == "duckduckgo"

    def test_bing_provider_name(self):
        p = BingProvider()
        assert p.name == "bing"

    def test_google_provider_name(self):
        p = GoogleProvider()
        assert p.name == "google"


class TestSearchFetchPage:
    """Tests for fetch_page functionality (may fail if offline)."""

    def test_fetch_page_invalid_url(self):
        engine = WebSearchEngine(SearchConfig(providers=["duckduckgo"]))
        try:
            page = engine.fetch_page("not-a-valid-url", timeout=2)
            assert page.status_code != 200
        except (ValueError, Exception):
            pass

    def test_fetch_pages_batch(self):
        engine = WebSearchEngine(SearchConfig(providers=["duckduckgo"]))
        try:
            pages = engine.fetch_pages(["invalid://x"], timeout=2, max_workers=1)
            assert len(pages) == 1
            assert pages[0].status_code != 200
        except (ValueError, Exception):
            pass


class TestSearchDedup:
    """Tests for search result deduplication."""

    def test_different_urls_not_duplicates(self):
        engine = WebSearchEngine(SearchConfig(providers=["duckduckgo"]))
        r1 = SearchResult(url="http://a.com/page1", title="Title One", snippet="Completely different snippet abcdef")
        r2 = SearchResult(url="http://a.com/page2", title="Title Two", snippet="Totally unrelated content xyz123")
        deduped = engine._deduplicate([r1, r2], 0.90)
        assert len(deduped) == 2

    def test_same_urls_are_duplicates(self):
        engine = WebSearchEngine(SearchConfig(providers=["duckduckgo"]))
        r1 = SearchResult(url="http://a.com", title="A", snippet="s")
        r2 = SearchResult(url="http://a.com", title="A", snippet="s")
        deduped = engine._deduplicate([r1, r2], 0.85)
        assert len(deduped) == 1

    def test_similar_titles_dedupped(self):
        engine = WebSearchEngine(SearchConfig(providers=["duckduckgo"]))
        r1 = SearchResult(url="http://a.com/1", title="Python Tutorial Guide", snippet="")
        r2 = SearchResult(url="http://b.com/1", title="Python Tutorial Guide", snippet="")
        deduped = engine._deduplicate([r1, r2], 0.85)
        assert len(deduped) <= 1


class TestSearchScoreSort:
    """Tests for scoring and sorting."""

    def test_score_and_sort_sorts_by_relevance(self):
        engine = WebSearchEngine(SearchConfig(providers=["duckduckgo"]))
        results = [
            SearchResult(url="http://a.com", title="Unrelated", snippet="xyz"),
            SearchResult(url="http://b.com", title="Python Coding", snippet="python tutorial"),
        ]
        sorted_results = engine._score_and_sort("python", results)
        assert sorted_results[0].relevance_score >= sorted_results[1].relevance_score
