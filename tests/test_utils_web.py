"""
Tests for src/cee/app/utils/web.py — Web utilities.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.utils.web import (
    get_user_agent,
    rotate_user_agent,
    HttpClientConfig,
    HttpResponse,
    HtmlMetadata,
)


class TestUserAgent:
    """Tests for User-Agent utilities."""

    def test_get_user_agent(self):
        ua = get_user_agent()
        assert isinstance(ua, str)
        assert len(ua) > 0

    def test_rotate_user_agent(self):
        ua1 = rotate_user_agent()
        ua2 = rotate_user_agent()
        assert isinstance(ua1, str)


class TestHttpClientConfig:
    """Tests for HttpClientConfig."""

    def test_defaults(self):
        config = HttpClientConfig()
        assert config.timeout == 30.0
        assert config.max_retries == 3

    def test_custom(self):
        config = HttpClientConfig(timeout=10.0, max_retries=2)
        assert config.timeout == 10.0


class TestHttpResponse:
    """Tests for HttpResponse."""

    def test_defaults(self):
        resp = HttpResponse()
        assert resp.status_code == 0

    def test_custom(self):
        resp = HttpResponse(status_code=200, url="http://example.com", content="test")
        assert resp.status_code == 200


class TestHtmlMetadata:
    """Tests for HtmlMetadata."""

    def test_defaults(self):
        meta = HtmlMetadata()
        assert meta.title == ""

    def test_custom(self):
        meta = HtmlMetadata(title="Test Page", description="A test page")
        assert meta.title == "Test Page"
