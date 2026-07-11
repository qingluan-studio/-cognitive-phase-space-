import hashlib
import re
import time
from dataclasses import dataclass, field
from typing import Any, Optional
from urllib.parse import urlparse, urlunparse

import httpx

_USER_AGENTS: list[str] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) "
    "Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:126.0) "
    "Gecko/20100101 Firefox/126.0",
]


_ROBOTS_CACHE: dict[str, tuple[float, bool]] = {}
_ROBOTS_CACHE_TTL: float = 3600.0

_USER_AGENT_INDEX: int = 0


@dataclass
class HttpClientConfig:
    timeout: float = 30.0
    max_retries: int = 3
    retry_delay: float = 1.0
    backoff_factor: float = 2.0
    follow_redirects: bool = True
    max_redirects: int = 5
    verify_ssl: bool = True
    headers: dict = field(default_factory=dict)


@dataclass
class HttpResponse:
    status_code: int = 0
    url: str = ""
    headers: dict = field(default_factory=dict)
    content: str = ""
    elapsed_ms: float = 0.0
    content_type: str = ""
    encoding: str = "utf-8"


@dataclass
class HtmlMetadata:
    title: str = ""
    description: str = ""
    keywords: list[str] = field(default_factory=list)
    author: str = ""
    og_title: str = ""
    og_description: str = ""
    og_image: str = ""
    og_url: str = ""
    language: str = ""


def get_user_agent() -> str:
    global _USER_AGENT_INDEX
    ua = _USER_AGENTS[_USER_AGENT_INDEX % len(_USER_AGENTS)]
    _USER_AGENT_INDEX += 1
    return ua


def rotate_user_agent() -> str:
    return get_user_agent()


def _build_client(config: HttpClientConfig) -> httpx.Client:
    transport = httpx.HTTPTransport(
        retries=0,
        verify=config.verify_ssl,
    )
    return httpx.Client(
        transport=transport,
        timeout=config.timeout,
        follow_redirects=config.follow_redirects,
        max_redirects=config.max_redirects,
        headers=config.headers,
    )


def _compute_retry_delay(attempt: int, config: HttpClientConfig) -> float:
    return config.retry_delay * (config.backoff_factor ** attempt)


def http_get(url: str,
             config: Optional[HttpClientConfig] = None) -> HttpResponse:
    if config is None:
        config = HttpClientConfig()
    client = _build_client(config)
    last_error: Optional[Exception] = None
    for attempt in range(config.max_retries + 1):
        try:
            start = time.monotonic()
            response = client.get(url)
            elapsed = (time.monotonic() - start) * 1000
            content_type = response.headers.get("content-type", "")
            encoding = response.encoding or "utf-8"
            return HttpResponse(
                status_code=response.status_code,
                url=str(response.url),
                headers=dict(response.headers),
                content=response.text,
                elapsed_ms=elapsed,
                content_type=content_type,
                encoding=encoding,
            )
        except Exception as e:
            last_error = e
            if attempt < config.max_retries:
                time.sleep(_compute_retry_delay(attempt, config))
    raise RuntimeError(
        f"HTTP GET failed for {url}: {last_error}"
    ) from last_error


def http_post(url: str, json_data: Optional[dict] = None,
              form_data: Optional[dict] = None,
              config: Optional[HttpClientConfig] = None) -> HttpResponse:
    if config is None:
        config = HttpClientConfig()
    client = _build_client(config)
    last_error: Optional[Exception] = None
    for attempt in range(config.max_retries + 1):
        try:
            start = time.monotonic()
            if form_data is not None:
                response = client.post(url, data=form_data)
            else:
                response = client.post(url, json=json_data)
            elapsed = (time.monotonic() - start) * 1000
            content_type = response.headers.get("content-type", "")
            encoding = response.encoding or "utf-8"
            return HttpResponse(
                status_code=response.status_code,
                url=str(response.url),
                headers=dict(response.headers),
                content=response.text,
                elapsed_ms=elapsed,
                content_type=content_type,
                encoding=encoding,
            )
        except Exception as e:
            last_error = e
            if attempt < config.max_retries:
                time.sleep(_compute_retry_delay(attempt, config))
    raise RuntimeError(
        f"HTTP POST failed for {url}: {last_error}"
    ) from last_error


def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    scheme = parsed.scheme.lower() or "https"
    hostname = parsed.hostname or ""
    hostname = hostname.lower()
    if hostname.startswith("www."):
        hostname = hostname[4:]
    port: Optional[int] = None
    if parsed.port:
        if scheme == "https" and parsed.port == 443:
            port = None
        elif scheme == "http" and parsed.port == 80:
            port = None
        else:
            port = parsed.port
    netloc = hostname
    if port is not None:
        netloc = f"{hostname}:{port}"
    path = parsed.path.rstrip("/") or "/"
    query = parsed.query
    normalized = urlunparse((scheme, netloc, path, parsed.params, query, ""))
    return normalized


def is_valid_url(url: str) -> bool:
    try:
        result = urlparse(url)
        return all([result.scheme in ("http", "https"), result.hostname])
    except Exception:
        return False


def extract_domain(url: str) -> str:
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    if hostname.startswith("www."):
        hostname = hostname[4:]
    return hostname.lower()


def extract_title_from_html(html_content: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>",
                      html_content, re.IGNORECASE | re.DOTALL)
    if match:
        return clean_html_strip(match.group(1))
    return ""


def extract_body_text(html_content: str) -> str:
    text = re.sub(r"<script[^>]*>[\s\S]*?</script>", "",
                  html_content, flags=re.IGNORECASE)
    text = re.sub(r"<style[^>]*>[\s\S]*?</style>", "",
                  text, flags=re.IGNORECASE)
    text = re.sub(r"<noscript[^>]*>[\s\S]*?</noscript>", "",
                  text, flags=re.IGNORECASE)
    text = re.sub(r"<!--[\s\S]*?-->", "", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&[a-zA-Z]+;|&#\d+;", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_metadata(html_content: str) -> HtmlMetadata:
    meta = HtmlMetadata()
    title_match = re.search(r"<title[^>]*>(.*?)</title>",
                            html_content, re.IGNORECASE | re.DOTALL)
    if title_match:
        meta.title = clean_html_strip(title_match.group(1))

    desc_match = re.search(
        r'<meta\s+[^>]*name=[\'"]description[\'"][^>]*content=[\'"]([^\'"]*)[\'"][^>]*/?>',
        html_content, re.IGNORECASE,
    )
    if not desc_match:
        desc_match = re.search(
            r'<meta\s+[^>]*content=[\'"]([^\'"]*)[\'"][^>]*name=[\'"]description[\'"][^>]*/?>',
            html_content, re.IGNORECASE,
        )
    if desc_match:
        meta.description = clean_html_strip(desc_match.group(1))

    kw_match = re.search(
        r'<meta\s+[^>]*name=[\'"]keywords[\'"][^>]*content=[\'"]([^\'"]*)[\'"][^>]*/?>',
        html_content, re.IGNORECASE,
    )
    if kw_match:
        meta.keywords = [k.strip()
                         for k in kw_match.group(1).split(",") if k.strip()]

    author_match = re.search(
        r'<meta\s+[^>]*name=[\'"]author[\'"][^>]*content=[\'"]([^\'"]*)[\'"][^>]*/?>',
        html_content, re.IGNORECASE,
    )
    if author_match:
        meta.author = clean_html_strip(author_match.group(1))

    for og_prop in [
        ("og:title", "og_title"),
        ("og:description", "og_description"),
        ("og:image", "og_image"),
        ("og:url", "og_url"),
    ]:
        match = re.search(
            r'<meta\s+[^>]*property=[\'"]{}[\'"][^>]*content=[\'"]([^\'"]*)[\'"][^>]*/?>'.format(
                og_prop[0]
            ),
            html_content,
            re.IGNORECASE,
        )
        if match:
            setattr(meta, og_prop[1], match.group(1))

    lang_match = re.search(r'<html[^>]*lang=[\'"]([^\'"]*)[\'"]',
                           html_content, re.IGNORECASE)
    if lang_match:
        meta.language = lang_match.group(1)

    return meta


def clean_html_strip(html_text: str) -> str:
    text = re.sub(r"<[^>]+>", "", html_text)
    text = re.sub(r"&[a-zA-Z]+;|&#\d+;", " ", text)
    return " ".join(text.split())


def check_robots_txt(url: str) -> bool:
    domain = extract_domain(url)
    now = time.time()
    if domain in _ROBOTS_CACHE:
        cached_time, cached_result = _ROBOTS_CACHE[domain]
        if now - cached_time < _ROBOTS_CACHE_TTL:
            return cached_result

    robots_url = f"https://{domain}/robots.txt"
    try:
        response = http_get(
            robots_url,
            config=HttpClientConfig(timeout=5.0, max_retries=1),
        )
    except Exception:
        _ROBOTS_CACHE[domain] = (now, True)
        return True

    if response.status_code != 200:
        _ROBOTS_CACHE[domain] = (now, True)
        return True

    content = response.content.lower()
    disallow_all = re.search(
        r"^User-agent:\s*\*\s*\nDisallow:\s*/",
        content, re.MULTILINE,
    )
    result = disallow_all is None
    _ROBOTS_CACHE[domain] = (now, result)
    return result


def url_hash(url: str) -> str:
    normalized = normalize_url(url)
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def get_url_scheme(url: str) -> str:
    return urlparse(url).scheme.lower()


def strip_query_params(url: str) -> str:
    parsed = urlparse(url)
    clean = urlunparse((parsed.scheme, parsed.netloc,
                        parsed.path, parsed.params, "", ""))
    return clean


def is_same_domain(url_a: str, url_b: str) -> bool:
    return extract_domain(url_a) == extract_domain(url_b)
