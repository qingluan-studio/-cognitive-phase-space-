"""
联网搜索引擎 — 多源搜索聚合、网页抓取、结果排序

模拟 Kimi 的联网搜索能力，提供:
  - 多源搜索聚合 (DuckDuckGo, Bing, Google)
  - TF-IDF 基础相关性评分
  - 搜索结果去重、排序
  - 网页内容抓取和 HTML→纯文本提取
  - 搜索结果缓存
  - 来源引用格式化
  - 搜索查询优化建议
  - 安全搜索过滤
  - 并行搜索支持
"""

from __future__ import annotations

import concurrent.futures
import hashlib
import html.parser
import json
import math
import re
import threading
import time
import urllib.parse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from abc import ABC, abstractmethod
from collections import OrderedDict
from dataclasses import dataclass, field
from dataclasses import asdict
from typing import Any, Callable, Optional, Union

DEFAULT_TIMEOUT = 15
MAX_CONTENT_SIZE = 2 * 1024 * 1024
USER_AGENT = (
    "Mozilla/5.0 (compatible; CEE-Engine/4.0; +https://cee.ai/bot)"
)


# ============================================================
# Data Classes
# ============================================================

@dataclass
class SearchResult:
    url: str
    title: str
    snippet: str
    source: str = ""
    relevance_score: float = 0.0
    published_date: str = ""
    cached: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)

    def __hash__(self) -> int:
        return hash(self.url)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, SearchResult):
            return NotImplemented
        return self.url == other.url


@dataclass
class WebPage:
    url: str
    title: str = ""
    content: str = ""
    text: str = ""
    fetch_time: float = 0.0
    status_code: int = 200
    error: str = ""

    @property
    def success(self) -> bool:
        return self.status_code == 200 and bool(self.text)


@dataclass
class SearchConfig:
    max_results: int = 20
    timeout: int = DEFAULT_TIMEOUT
    enable_cache: bool = True
    cache_ttl: int = 3600
    safe_search: bool = True
    language: str = "zh"
    providers: list[str] = field(default_factory=lambda: ["duckduckgo"])
    parallel: bool = True
    max_workers: int = 5
    dedup_threshold: float = 0.85


# ============================================================
# HTML → Plain Text Parser
# ============================================================

class _HTMLTextExtractor(html.parser.HTMLParser):
    """Extract plain text from HTML, removing scripts and styles."""

    def __init__(self) -> None:
        super().__init__()
        self._text: list[str] = []
        self._skip_tags: set[str] = {"script", "style", "noscript", "iframe"}
        self._skip_depth: int = 0

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag in self._skip_tags:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in self._skip_tags and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            text = data.strip()
            if text:
                self._text.append(text)

    def get_text(self) -> str:
        return "\n".join(self._text)


def _html_to_text(html_content: str) -> str:
    parser = _HTMLTextExtractor()
    try:
        parser.feed(html_content)
    except Exception:
        pass
    text = parser.get_text()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ============================================================
# TF-IDF Utilities (inline to keep search.py self-contained)
# ============================================================

def _tokenize(text: str) -> list[str]:
    """Tokenize text into words (supports Chinese and English)."""
    tokens: list[str] = []
    text_lower = text.lower()
    for token in re.findall(r"[\u4e00-\u9fff]+|[a-zA-Z0-9]+", text_lower):
        t = token.strip()
        if t and len(t) > 1:
            tokens.append(t)
    return tokens


def _compute_tfidf_scores(
    query: str, documents: list[str]
) -> list[float]:
    """Compute TF-IDF cosine similarity scores between query and documents."""
    if not documents:
        return []

    query_tokens = _tokenize(query)
    if not query_tokens:
        return [0.0] * len(documents)

    doc_tokens_list = [_tokenize(d) for d in documents]
    all_terms = set(query_tokens)
    for dt in doc_tokens_list:
        all_terms.update(dt)
    term_list = list(all_terms)

    N = len(documents)

    def _idf(term: str) -> float:
        df = sum(1 for dt in doc_tokens_list if term in dt)
        return math.log((N + 1) / (df + 1)) + 1.0

    query_vec = []
    for term in term_list:
        tf = query_tokens.count(term) / max(len(query_tokens), 1)
        query_vec.append(tf * _idf(term))

    doc_vecs: list[list[float]] = []
    for dt in doc_tokens_list:
        vec = []
        for term in term_list:
            tf = dt.count(term) / max(len(dt), 1)
            vec.append(tf * _idf(term))
        doc_vecs.append(vec)

    scores: list[float] = []
    for dv in doc_vecs:
        dot = sum(a * b for a, b in zip(query_vec, dv))
        norm_q = math.sqrt(sum(a * a for a in query_vec))
        norm_d = math.sqrt(sum(b * b for b in dv))
        if norm_q == 0 or norm_d == 0:
            scores.append(0.0)
        else:
            scores.append(dot / (norm_q * norm_d))
    return scores


# ============================================================
# SearchResult Cache (thread-safe LRU)
# ============================================================

class _SearchCache:
    """Thread-safe search result cache with TTL."""

    def __init__(self, max_size: int = 500) -> None:
        self._cache: OrderedDict[str, tuple[float, list[SearchResult]]] = (
            OrderedDict()
        )
        self._max_size = max_size
        self._lock = threading.Lock()

    def _make_key(self, query: str) -> str:
        return hashlib.md5(query.encode("utf-8")).hexdigest()

    def get(self, query: str, ttl: int) -> Optional[list[SearchResult]]:
        key = self._make_key(query)
        with self._lock:
            if key not in self._cache:
                return None
            ts, results = self._cache[key]
            if time.time() - ts > ttl:
                del self._cache[key]
                return None
            self._cache.move_to_end(key)
            return results

    def set(self, query: str, results: list[SearchResult]) -> None:
        key = self._make_key(query)
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = (time.time(), results)
            while len(self._cache) > self._max_size:
                self._cache.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()


# ============================================================
# Abstract Search Provider
# ============================================================

class SearchProvider(ABC):
    """基类：搜索提供商抽象接口。"""

    @abstractmethod
    def search(self, query: str, config: SearchConfig) -> list[SearchResult]:
        """执行搜索并返回结果列表。"""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """提供商名称。"""
        ...

    def _fetch_url(self, url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                content = resp.read(MAX_CONTENT_SIZE)
                return content.decode("utf-8", errors="replace")
        except Exception:
            return ""


# ============================================================
# DuckDuckGo Provider (via HTML instant answer API)
# ============================================================

class DuckDuckGoProvider(SearchProvider):
    """DuckDuckGo 搜索提供商 (HTML接口)。"""

    BASE_URL = "https://html.duckduckgo.com/html/"

    @property
    def name(self) -> str:
        return "duckduckgo"

    def search(self, query: str, config: SearchConfig) -> list[SearchResult]:
        params = urllib.parse.urlencode({"q": query})
        url = f"{self.BASE_URL}?{params}"
        html_content = self._fetch_url(url, config.timeout)
        if not html_content:
            return []

        results: list[SearchResult] = []
        link_pattern = re.compile(
            r'<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>'
            r'(.*?)</a>',
            re.DOTALL | re.IGNORECASE,
        )
        snippet_pattern = re.compile(
            r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>',
            re.DOTALL | re.IGNORECASE,
        )

        links = link_pattern.findall(html_content)
        snippets = snippet_pattern.findall(html_content)

        for i, (href, title) in enumerate(links):
            clean_title = re.sub(r"<[^>]+>", "", title).strip()
            if not clean_title:
                continue
            snippet = ""
            if i < len(snippets):
                snippet = re.sub(r"<[^>]+>", "", snippets[i]).strip()
            results.append(
                SearchResult(
                    url=urllib.parse.unquote(href),
                    title=clean_title,
                    snippet=snippet,
                    source=self.name,
                )
            )
            if len(results) >= config.max_results:
                break

        return results


# ============================================================
# Bing Provider (via basic web search heuristics placeholder)
# ============================================================

class BingProvider(SearchProvider):
    """Bing 搜索提供商 — 基于纯 Python HTTP 请求的轻量实现。"""

    BASE_URL = "https://www.bing.com/search"

    @property
    def name(self) -> str:
        return "bing"

    def search(self, query: str, config: SearchConfig) -> list[SearchResult]:
        params = urllib.parse.urlencode({"q": query, "count": config.max_results})
        url = f"{self.BASE_URL}?{params}"
        html_content = self._fetch_url(url, config.timeout)
        if not html_content:
            return []

        results: list[SearchResult] = []
        cite_pattern = re.compile(
            r'<cite[^>]*>(.*?)</cite>',
            re.DOTALL | re.IGNORECASE,
        )
        h2_pattern = re.compile(
            r'<h2[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>',
            re.DOTALL | re.IGNORECASE,
        )
        p_pattern = re.compile(
            r'<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>(.*?)</p>',
            re.DOTALL | re.IGNORECASE,
        )

        links = h2_pattern.findall(html_content)
        snippets = p_pattern.findall(html_content)

        for i, (href, title) in enumerate(links):
            clean_title = re.sub(r"<[^>]+>", "", title).strip()
            if not clean_title:
                continue
            snippet = ""
            if i < len(snippets):
                snippet = re.sub(r"<[^>]+>", "", snippets[i]).strip()
            results.append(
                SearchResult(
                    url=href,
                    title=clean_title,
                    snippet=snippet,
                    source=self.name,
                )
            )
            if len(results) >= config.max_results:
                break

        return results


# ============================================================
# Google Provider (via basic web search heuristics placeholder)
# ============================================================

class GoogleProvider(SearchProvider):
    """Google 搜索提供商 — 基于纯 Python HTTP 请求的轻量实现。"""

    BASE_URL = "https://www.google.com/search"

    @property
    def name(self) -> str:
        return "google"

    def search(self, query: str, config: SearchConfig) -> list[SearchResult]:
        params = urllib.parse.urlencode({
            "q": query,
            "num": config.max_results,
            "hl": config.language,
        })
        url = f"{self.BASE_URL}?{params}"
        html_content = self._fetch_url(url, config.timeout)
        if not html_content:
            return []

        results: list[SearchResult] = []
        h3_pattern = re.compile(
            r'<h3[^>]*>(?:<a[^>]*href="([^"]*)"[^>]*>)?(.*?)(?:</a>)?</h3>',
            re.DOTALL | re.IGNORECASE,
        )
        span_pattern = re.compile(
            r'<span[^>]*class="[^"]*st[^"]*"[^>]*>(.*?)</span>',
            re.DOTALL | re.IGNORECASE,
        )

        titles = h3_pattern.findall(html_content)
        snippets = span_pattern.findall(html_content)

        for i, (href, title) in enumerate(titles):
            clean_title = re.sub(r"<[^>]+>", "", title).strip()
            if not clean_title:
                continue
            snippet = ""
            if i < len(snippets):
                snippet = re.sub(r"<[^>]+>", "", snippets[i]).strip()
            results.append(
                SearchResult(
                    url=urllib.parse.unquote(href),
                    title=clean_title,
                    snippet=snippet,
                    source=self.name,
                )
            )
            if len(results) >= config.max_results:
                break

        return results


# ============================================================
# Safe Search Filtering
# ============================================================

_SAFE_SEARCH_BLACKLIST: set[str] = {
    "porn", "xxx", "adult", "gambling", "casino",
    "drugs", "weapon", "hacking", "malware",
}


def _is_safe_result(result: SearchResult) -> bool:
    text = (result.title + " " + result.snippet).lower()
    for term in _SAFE_SEARCH_BLACKLIST:
        if term in text:
            return False
    return True


# ============================================================
# Web Search Engine (Main Class)
# ============================================================

class WebSearchEngine:
    """联网搜索引擎主类。

    支持多源搜索聚合、结果去重、TF-IDF 相关性排序、
    网页内容抓取和 HTML 提取、结果缓存等。

    Usage:
        engine = WebSearchEngine()
        results = engine.search("Python asyncio tutorial")
        for r in results:
            print(f"  {r.title}: {r.url}")
    """

    _PROVIDER_MAP: dict[str, type[SearchProvider]] = {
        "duckduckgo": DuckDuckGoProvider,
        "bing": BingProvider,
        "google": GoogleProvider,
    }

    def __init__(self, config: Optional[SearchConfig] = None) -> None:
        self.config = config or SearchConfig()
        self._cache = _SearchCache()
        self._provider_instances: dict[str, SearchProvider] = {}
        self._init_providers()

    def _init_providers(self) -> None:
        for name, cls in self._PROVIDER_MAP.items():
            if name in self.config.providers:
                self._provider_instances[name] = cls()

    # ----- Public API -----

    def search(
        self,
        query: str,
        config: Optional[SearchConfig] = None,
    ) -> list[SearchResult]:
        """执行搜索，返回去重排序后的结果列表。"""
        cfg = config or self.config
        if not query.strip():
            return []

        if cfg.enable_cache:
            cached = self._cache.get(query, cfg.cache_ttl)
            if cached is not None:
                for r in cached:
                    r.cached = True
                return cached[: cfg.max_results]

        all_results = self._search_all(query, cfg)
        all_results = self._deduplicate(all_results, cfg.dedup_threshold)
        all_results = self._score_and_sort(query, all_results)
        all_results = all_results[: cfg.max_results]

        if cfg.enable_cache:
            self._cache.set(query, all_results)

        return all_results

    def search_with_suggestions(
        self, query: str, config: Optional[SearchConfig] = None
    ) -> tuple[list[SearchResult], list[str]]:
        """搜索并返回优化建议。"""
        results = self.search(query, config)
        suggestions = self._generate_suggestions(query, results)
        return results, suggestions

    def fetch_page(self, url: str, timeout: int = DEFAULT_TIMEOUT) -> WebPage:
        """抓取并提取网页内容。"""
        page = WebPage(url=url)
        start = time.time()
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                page.status_code = resp.status
                raw = resp.read(MAX_CONTENT_SIZE)
                content_type = resp.headers.get("Content-Type", "")
                charset = "utf-8"
                if "charset=" in content_type:
                    m = re.search(r"charset=([^\s;]+)", content_type)
                    if m:
                        charset = m.group(1)
                page.content = raw.decode(charset, errors="replace")
                page.text = _html_to_text(page.content)
                title_m = re.search(
                    r"<title[^>]*>(.*?)</title>",
                    page.content,
                    re.IGNORECASE | re.DOTALL,
                )
                if title_m:
                    page.title = re.sub(r"<[^>]+>", "", title_m.group(1)).strip()
        except urllib.error.HTTPError as e:
            page.status_code = e.code
            page.error = str(e)
        except Exception as e:
            page.status_code = -1
            page.error = str(e)
        page.fetch_time = time.time() - start
        return page

    def fetch_pages(
        self,
        urls: list[str],
        timeout: int = DEFAULT_TIMEOUT,
        max_workers: int = 5,
    ) -> list[WebPage]:
        """并行抓取多个网页。"""
        pages: list[WebPage] = []
        with concurrent.futures.ThreadPoolExecutor(
            max_workers=max_workers
        ) as executor:
            futures = {
                executor.submit(self.fetch_page, url, timeout): url
                for url in urls
            }
            for future in concurrent.futures.as_completed(futures):
                try:
                    pages.append(future.result())
                except Exception:
                    pages.append(
                        WebPage(
                            url=futures[future],
                            status_code=-1,
                            error="Fetch failed",
                        )
                    )
        return pages

    def format_citation(self, result: SearchResult, index: int = 1) -> str:
        """格式化来源引用。"""
        parts = [f"[{index}] {result.title}"]
        if result.url:
            parts.append(f"    URL: {result.url}")
        if result.snippet:
            parts.append(f"    {result.snippet[:200]}")
        if result.source:
            parts.append(f"    Source: {result.source}")
        return "\n".join(parts)

    def format_citations(self, results: list[SearchResult]) -> str:
        """批量格式化来源引用。"""
        if not results:
            return "No citations available."
        lines = ["## References", ""]
        for i, r in enumerate(results, 1):
            lines.append(self.format_citation(r, i))
            lines.append("")
        return "\n".join(lines)

    def clear_cache(self) -> None:
        """清除搜索缓存。"""
        self._cache.clear()

    # ----- Internal Methods -----

    def _search_all(
        self, query: str, config: SearchConfig
    ) -> list[SearchResult]:
        all_results: list[SearchResult] = []

        if (
            config.parallel
            and len(self._provider_instances) > 1
        ):
            with concurrent.futures.ThreadPoolExecutor(
                max_workers=config.max_workers
            ) as executor:
                futures = {
                    executor.submit(p.search, query, config): name
                    for name, p in self._provider_instances.items()
                }
                for future in concurrent.futures.as_completed(futures):
                    try:
                        all_results.extend(future.result())
                    except Exception:
                        pass
        else:
            for provider in self._provider_instances.values():
                try:
                    all_results.extend(provider.search(query, config))
                except Exception:
                    pass

        return all_results

    def _deduplicate(
        self,
        results: list[SearchResult],
        threshold: float,
    ) -> list[SearchResult]:
        seen_urls: set[str] = set()
        deduped: list[SearchResult] = []

        for r in results:
            normalized = r.url.rstrip("/").lower()
            if normalized in seen_urls:
                continue

            is_dup = False
            for existing in deduped:
                if self._similarity(r.title, existing.title) > threshold:
                    is_dup = True
                    break
                if (
                    r.snippet
                    and existing.snippet
                    and self._similarity(r.snippet, existing.snippet) > threshold
                ):
                    is_dup = True
                    break

            if not is_dup:
                seen_urls.add(normalized)
                deduped.append(r)

        return deduped

    def _score_and_sort(
        self, query: str, results: list[SearchResult]
    ) -> list[SearchResult]:
        if not results:
            return results

        documents = [
            f"{r.title} {r.snippet}" for r in results
        ]
        scores = _compute_tfidf_scores(query, documents)

        for r, s in zip(results, scores):
            r.relevance_score = round(s, 4)

        results.sort(key=lambda x: x.relevance_score, reverse=True)
        return results

    @staticmethod
    def _similarity(a: str, b: str) -> float:
        if not a or not b:
            return 0.0
        a_set = set(_tokenize(a))
        b_set = set(_tokenize(b))
        if not a_set or not b_set:
            return 0.0
        intersection = a_set & b_set
        return len(intersection) / min(len(a_set), len(b_set))

    def _generate_suggestions(
        self, query: str, results: list[SearchResult]
    ) -> list[str]:
        suggestions: list[str] = []
        tokens = _tokenize(query)
        if not tokens:
            return suggestions

        if len(results) < 3:
            suggestions.append(f"Try broader query for '{' '.join(tokens[:2])}'")
            suggestions.append(f"Try English query for '{query}'")
        elif len(results) > 15:
            suggestions.append(
                f"Narrow search: '{query} site:wikipedia.org'"
            )

        if len(tokens) >= 3:
            suggestions.append(f"Shorten query: '{' '.join(tokens[:2])}'")
        if tokens:
            suggestions.append(
                f"Add context: '{query} tutorial example'"
            )

        return suggestions[:5]
