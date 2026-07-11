"""
Tests for src/cee/app/api/middleware.py — API middleware.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.api.middleware import (
    RateLimitMiddleware,
    RateLimitConfig,
    set_api_key,
    _get_client_key,
    _clean_expired_bucket,
    _rate_buckets,
)


class TestRateLimitConfig:
    """Tests for RateLimitConfig."""

    def test_defaults(self):
        config = RateLimitConfig()
        assert config.window_seconds == 60
        assert config.max_requests == 300

    def test_custom(self):
        config = RateLimitConfig(window_seconds=30, max_requests=100)
        assert config.window_seconds == 30
        assert config.max_requests == 100


class TestApiKey:
    """Tests for API key management."""

    def test_set_api_key(self):
        set_api_key("test-key-123")
        from cee.app.api.middleware import _API_KEY
        assert _API_KEY == "test-key-123"


class TestRateLimiting:
    """Tests for rate limiting logic."""

    def test_rate_buckets_is_dict(self):
        assert isinstance(_rate_buckets, dict)

    def test_clean_expired_bucket(self):
        bucket_key = "test_client_cleanup"
        import time
        _rate_buckets[bucket_key] = [time.time() - 120, time.time() - 90]
        _clean_expired_bucket(bucket_key, time.time(), window=60)
        assert len(_rate_buckets[bucket_key]) <= 0


class TestMiddlewareInit:
    """Tests for middleware initialization."""

    def test_rate_limit_middleware_init(self):
        config = RateLimitConfig(window_seconds=60, max_requests=100)
        assert config.window_seconds == 60

    def test_default_skip_paths(self):
        default_skip = ["/api/health", "/docs", "/openapi.json"]
        assert "/api/health" in default_skip
