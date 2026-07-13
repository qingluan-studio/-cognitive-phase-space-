"""
模拟人手系统 - Simulated Human Hands

核心理念:
  不用 API，不耗 Token。用浏览器自动化技术模拟真实人类上网行为：
  搜索 -> 浏览 -> 抓取 -> 提炼 -> 输出。

  如同一个真实的人在用浏览器：看到的是网页，不是 JSON。

双轨制:
  - 工程版: requests + BeautifulSoup 直接抓取
  - 理论版: Selenium/Playwright 完整浏览器模拟（可选）

角色伪装:
  - NetizenIdentity: 模拟不同身份上网（学生/研究者/普通用户）
  - UserAgent 轮换池
  - 请求间隔随机化
  - Cookie 管理

特性:
  - 多搜索引擎支持 (Google/Bing/DuckDuckGo/Baidu)
  - 内容提取: 正文/标题/关键句/元数据
  - 反爬对抗: 随机延迟/UA轮换/Referer伪装
  - 结果去重与融合
  - 全流程 Token-Free
"""

from __future__ import annotations

import logging
import random
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class SearchEngine(Enum):
    GOOGLE = "google"
    BING = "bing"
    DUCKDUCKGO = "duckduckgo"
    BAIDU = "baidu"

    @property
    def search_url(self) -> str:
        return {
            SearchEngine.GOOGLE: "https://www.google.com/search",
            SearchEngine.BING: "https://www.bing.com/search",
            SearchEngine.DUCKDUCKGO: "https://html.duckduckgo.com/html/",
            SearchEngine.BAIDU: "https://www.baidu.com/s",
        }[self]

    @property
    def query_param(self) -> str:
        return {
            SearchEngine.GOOGLE: "q",
            SearchEngine.BING: "q",
            SearchEngine.DUCKDUCKGO: "q",
            SearchEngine.BAIDU: "wd",
        }[self]


class NetizenIdentity(Enum):
    STUDENT = ("college_student", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")
    RESEARCHER = ("academic_researcher", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
    CASUAL = ("casual_user", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    DEVELOPER = ("developer", "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36")
    MOBILE = ("mobile_user", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)")

    def __init__(self, profile: str, base_ua: str):
        self.profile = profile
        self.base_ua = base_ua


_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0",
    "Mozilla/5.0 (X11; Linux i686; rv:120.0) Gecko/20100101 Firefox/120.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
]


@dataclass
class SearchResult:
    """搜索结果"""

    title: str
    url: str
    snippet: str
    engine: SearchEngine
    rank: int
    timestamp: float = field(default_factory=time.time)

    @property
    def domain(self) -> str:
        parsed = urlparse(self.url)
        return parsed.netloc or ""


@dataclass
class ExtractedContent:
    """提取后的网页内容"""

    url: str
    title: str = ""
    text_content: str = ""
    key_sentences: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    word_count: int = 0
    extraction_time: float = 0.0
    status_code: int = 0

    @property
    def summary(self) -> str:
        if len(self.text_content) <= 500:
            return self.text_content
        return self.text_content[:500] + "..."


@dataclass
class BrowserSession:
    """浏览器会话状态"""

    session_id: str
    user_agent: str
    cookies: dict[str, str] = field(default_factory=dict)
    last_request_time: float = 0.0
    request_count: int = 0
    referer: str = ""


class ContentExtractor:
    """网页内容提取器"""

    @staticmethod
    def extract_main_text(html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        for tag_name in ("script", "style", "nav", "footer", "header", "aside"):
            for tag in soup.find_all(tag_name):
                tag.decompose()
        body = soup.find("body")
        if not body:
            return soup.get_text(separator="\n", strip=True)
        return body.get_text(separator="\n", strip=True)

    @staticmethod
    def extract_title(html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        title_tag = soup.find("title")
        return title_tag.get_text(strip=True) if title_tag else ""

    @staticmethod
    def extract_key_sentences(text: str, max_sentences: int = 5) -> list[str]:
        sentences = re.split(r"[。！？\n.!?]+", text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        if len(sentences) <= max_sentences:
            return sentences
        scored = [(s, len(s), sum(1 for c in s if "\u4e00" <= c <= "\u9fff")) for s in sentences]
        scored.sort(key=lambda x: x[2], reverse=True)
        return [s for s, _, _ in scored[:max_sentences]]

    @staticmethod
    def extract_metadata(html: str) -> dict[str, Any]:
        soup = BeautifulSoup(html, "html.parser")
        meta: dict[str, Any] = {}
        for tag in soup.find_all("meta"):
            name = tag.get("name") or tag.get("property") or ""
            content = tag.get("content") or ""
            if name and content:
                meta[name] = content
        return meta

    @classmethod
    def extract_all(cls, html: str, url: str = "") -> ExtractedContent:
        text = cls.extract_main_text(html)
        title = cls.extract_title(html)
        key_sentences = cls.extract_key_sentences(text)
        metadata = cls.extract_metadata(html)
        return ExtractedContent(
            url=url,
            title=title,
            text_content=text,
            key_sentences=key_sentences,
            metadata=metadata,
            word_count=len(text),
        )

    @staticmethod
    def deduplicate(results: list[SearchResult]) -> list[SearchResult]:
        seen_urls: set[str] = set()
        unique: list[SearchResult] = []
        for r in results:
            normalized = r.url.rstrip("/").lower()
            if normalized not in seen_urls:
                seen_urls.add(normalized)
                unique.append(r)
        return unique

    @staticmethod
    def merge_search_results(results_list: list[list[SearchResult]]) -> list[SearchResult]:
        if not results_list:
            return []
        max_len = max(len(r) for r in results_list) if results_list else 0
        merged: list[SearchResult] = []
        seen: set[str] = set()
        for i in range(max_len):
            for results in results_list:
                if i < len(results):
                    r = results[i]
                    key = r.url.rstrip("/").lower()
                    if key not in seen:
                        seen.add(key)
                        merged.append(r)
        return merged


class HumanHands:
    """模拟人手浏览器自动化引擎 - 零 Token 上网"""

    TIMEOUT = 15
    MAX_RETRIES = 3
    RETRY_DELAY = 2.0
    MIN_REQUEST_INTERVAL = 1.0

    def __init__(
        self,
        identity: NetizenIdentity = NetizenIdentity.CASUAL,
        engines: list[SearchEngine] | None = None,
    ) -> None:
        self.identity = identity
        self.engines = engines or [
            SearchEngine.DUCKDUCKGO,
            SearchEngine.BING,
        ]
        self.session = BrowserSession(
            session_id=f"hands-{int(time.time())}",
            user_agent=random.choice(_USER_AGENTS),
        )
        self.extractor = ContentExtractor()
        self._session_obj = requests.Session()
        self._session_obj.headers.update(
            {
                "User-Agent": self.session.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Accept-Encoding": "gzip, deflate",
                "DNT": "1",
            }
        )
        self._stats: dict[str, int] = {"searches": 0, "pages_fetched": 0, "bytes_downloaded": 0}

    def _respect_rate_limit(self) -> None:
        elapsed = time.time() - self.session.last_request_time
        if elapsed < self.MIN_REQUEST_INTERVAL:
            jitter = random.uniform(0.5, 2.0)
            time.sleep(self.MIN_REQUEST_INTERVAL - elapsed + jitter)

    def _random_delay(self, base: float = 1.0) -> None:
        time.sleep(base * random.uniform(0.8, 2.5))

    def _rotate_ua(self) -> None:
        self.session.user_agent = random.choice(_USER_AGENTS)
        self._session_obj.headers["User-Agent"] = self.session.user_agent

    def search(
        self,
        query: str,
        max_results: int = 10,
    ) -> list[SearchResult]:
        """搜索 - 多引擎聚合"""
        all_results: list[list[SearchResult]] = []
        for engine in self.engines:
            try:
                results = self._search_single(engine, query, max_results)
                all_results.append(results)
                self._stats["searches"] += 1
            except Exception as e:
                logger.warning(f"Search engine {engine.value} failed: {e}")
        return self.extractor.merge_search_results(all_results)

    def _search_single(
        self, engine: SearchEngine, query: str, max_results: int
    ) -> list[SearchResult]:
        self._rotate_ua()
        self._respect_rate_limit()
        self._random_delay()

        params: dict[str, str | int] = {engine.query_param: query}
        if engine == SearchEngine.GOOGLE:
            params["hl"] = "zh-CN"
            params["num"] = min(max_results, 20)
        elif engine == SearchEngine.BING:
            params["count"] = min(max_results, 20)
            params["setlang"] = "zh-Hans"
        elif engine == SearchEngine.BAIDU:
            params["rn"] = min(max_results, 20)

        resp = self._session_obj.get(
            engine.search_url,
            params=params,
            timeout=self.TIMEOUT,
        )
        resp.raise_for_status()
        self.session.last_request_time = time.time()
        self.session.request_count += 1
        self._stats["bytes_downloaded"] += len(resp.content)
        return self._parse_search_results(resp.text, engine)

    def _parse_search_results(self, html: str, engine: SearchEngine) -> list[SearchResult]:
        soup = BeautifulSoup(html, "html.parser")
        results: list[SearchResult] = []
        rank = 0

        if engine == SearchEngine.DUCKDUCKGO:
            for item in soup.select(".result"):
                title_tag = item.select_one(".result__title .result__a")
                snippet_tag = item.select_one(".result__snippet")
                link_tag = item.select_one(".result__url")
                if title_tag:
                    rank += 1
                    results.append(
                        SearchResult(
                            title=title_tag.get_text(strip=True),
                            url=link_tag.get_text(strip=True) if link_tag else "",
                            snippet=snippet_tag.get_text(strip=True) if snippet_tag else "",
                            engine=engine,
                            rank=rank,
                        )
                    )
        elif engine in (SearchEngine.GOOGLE, SearchEngine.BING, SearchEngine.BAIDU):
            for item in soup.select("h3"):
                parent = item.find_parent("a")
                if parent and parent.get("href"):
                    rank += 1
                    snippet_parent = parent.find_parent("div") or parent.find_parent("li") or parent.parent  # type: ignore[assignment]
                    snippet = snippet_parent.get_text(strip=True) if snippet_parent else ""
                    results.append(
                        SearchResult(
                            title=item.get_text(strip=True),
                            url=parent["href"],
                            snippet=snippet,
                            engine=engine,
                            rank=rank,
                        )
                    )

        return results[:50]

    def fetch_page(self, url: str) -> ExtractedContent:
        """抓取单页"""
        self._rotate_ua()
        self._respect_rate_limit()
        self._random_delay(0.5)

        for attempt in range(self.MAX_RETRIES):
            try:
                resp = self._session_obj.get(url, timeout=self.TIMEOUT)
                resp.raise_for_status()
                if resp.encoding and resp.encoding.lower() != "utf-8":
                    resp.encoding = resp.apparent_encoding or "utf-8"
                self.session.last_request_time = time.time()
                self.session.request_count += 1
                self._stats["pages_fetched"] += 1
                self._stats["bytes_downloaded"] += len(resp.content)
                self.session.referer = url

                content = self.extractor.extract_all(resp.text, url)
                content.status_code = resp.status_code
                return content
            except Exception as e:
                if attempt < self.MAX_RETRIES - 1:
                    wait = self.RETRY_DELAY * (2**attempt)
                    logger.debug(f"Retry {attempt + 1} for {url} in {wait}s: {e}")
                    time.sleep(wait)
                else:
                    logger.error(f"Failed to fetch {url}: {e}")
                    return ExtractedContent(url=url, text_content=f"Fetch failed: {e}")

        return ExtractedContent(url=url, text_content="Max retries exceeded")

    def search_and_fetch(
        self,
        query: str,
        max_results: int = 5,
        fetch_pages: bool = True,
    ) -> dict[str, Any]:
        """搜索并抓取 - 全流程自动化"""
        search_results = self.search(query, max_results)
        pages: list[ExtractedContent] = []
        if fetch_pages:
            for sr in search_results[:max_results]:
                if sr.url:
                    try:
                        page = self.fetch_page(sr.url)
                        pages.append(page)
                    except Exception as e:
                        logger.warning(f"Skip {sr.url}: {e}")

        combined_text = " ".join(p.text_content for p in pages)
        return {
            "query": query,
            "search_results": [{"title": sr.title, "url": sr.url, "snippet": sr.snippet} for sr in search_results],
            "pages": [{"title": p.title, "text": p.text_content[:2000], "word_count": p.word_count} for p in pages],
            "combined_text": combined_text[:10000],
            "total_pages": len(pages),
            "stats": dict(self._stats),
        }

    def quick_search(self, query: str) -> str:
        """快速搜索 - 返回提炼摘要"""
        result = self.search_and_fetch(query, max_results=3, fetch_pages=True)
        if not result["pages"]:
            snippets = [r["snippet"] for r in result["search_results"][:3] if r["snippet"]]
            return " | ".join(snippets) if snippets else f"No results for: {query}"

        texts: list[str] = []
        for p in result["pages"]:
            if p["text"]:
                texts.append(p["text"][:500])
        return "\n---\n".join(texts)

    @property
    def stats(self) -> dict[str, int]:
        return dict(self._stats)

    def close(self) -> None:
        self._session_obj.close()
