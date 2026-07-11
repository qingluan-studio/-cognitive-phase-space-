"""
Tests for src/cee/app/core/rate_limit.py — TokenBucket, SlidingWindow, RateLimiter.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import time
import threading

import pytest

from cee.app.core.rate_limit import (
    TokenBucket,
    SlidingWindow,
    RateLimiter,
    RateLimitRule,
    RateLimitStatus,
    RateLimitMiddleware,
)


class TestTokenBucket:
    """Tests for TokenBucket rate limiter."""

    def test_init_defaults(self):
        bucket = TokenBucket(rate=10, capacity=10)
        assert bucket.rate == 10
        assert bucket.capacity == 10
        assert bucket.tokens == 10

    def test_init_capacity_defaults_to_rate(self):
        bucket = TokenBucket(rate=5)
        assert bucket.capacity == 5

    def test_init_rejects_non_positive_rate(self):
        with pytest.raises(ValueError):
            TokenBucket(rate=0)
        with pytest.raises(ValueError):
            TokenBucket(rate=-1)

    def test_consume_allows_when_tokens_available(self):
        bucket = TokenBucket(rate=10, capacity=10)
        assert bucket.consume() is True
        assert bucket.consume() is True

    def test_consume_blocks_when_empty(self):
        bucket = TokenBucket(rate=100, capacity=0)
        bucket.tokens = 0
        assert bucket.consume() is False

    def test_consume_multiple_tokens(self):
        bucket = TokenBucket(rate=10, capacity=10)
        assert bucket.consume(5) is True
        assert bucket.tokens < 5.01

    def test_consume_counts_stats(self):
        bucket = TokenBucket(rate=10, capacity=10)
        bucket.consume()
        bucket.consume(100)
        status = bucket.status()
        assert status["total_allowed"] >= 1
        assert status["total_rejected"] >= 1

    def test_reset_restores_tokens(self):
        bucket = TokenBucket(rate=10, capacity=10)
        bucket.consume(5)
        bucket.reset()
        assert bucket.tokens == 10

    def test_status_returns_info(self):
        bucket = TokenBucket(rate=10, capacity=10)
        status = bucket.status()
        assert "tokens" in status
        assert "capacity" in status
        assert "rate" in status
        assert "available_percent" in status

    def test_try_consume_with_timeout(self):
        bucket = TokenBucket(rate=100, capacity=0)
        bucket.tokens = 0
        assert bucket.try_consume(timeout=0) is False

    def test_try_consume_no_wait(self):
        bucket = TokenBucket(rate=100, capacity=10)
        assert bucket.try_consume(timeout=0) is True

    def test_repr(self):
        bucket = TokenBucket(rate=5, capacity=5)
        assert "TokenBucket" in repr(bucket)


class TestSlidingWindow:
    """Tests for SlidingWindow rate limiter."""

    def test_init_requires_positive_max(self):
        with pytest.raises(ValueError):
            SlidingWindow(max_requests=0)
        with pytest.raises(ValueError):
            SlidingWindow(max_requests=10, window_size=0)

    def test_allow_permits_under_limit(self):
        window = SlidingWindow(max_requests=5, window_size=60)
        for i in range(3):
            assert window.allow() is True

    def test_allow_blocks_over_limit(self):
        window = SlidingWindow(max_requests=3, window_size=60)
        for i in range(3):
            assert window.allow() is True
        assert window.allow() is False

    def test_current_count(self):
        window = SlidingWindow(max_requests=10, window_size=60)
        assert window.current_count() == 0
        window.allow()
        assert window.current_count() == 1

    def test_reset(self):
        window = SlidingWindow(max_requests=10, window_size=60)
        window.allow()
        window.reset()
        assert window.current_count() == 0

    def test_status(self):
        window = SlidingWindow(max_requests=10, window_size=60)
        window.allow()
        s = window.status()
        assert s["current_requests"] >= 1
        assert s["max_requests"] == 10
        assert s["window_size_sec"] == 60


class TestRateLimiter:
    """Tests for multi-dimensional RateLimiter."""

    def test_add_rule(self):
        limiter = RateLimiter()
        limiter.add_rule("default", rate=60, burst=10)
        assert "default" in limiter.rules
        assert limiter.rules["default"].rate == 60

    def test_remove_rule(self):
        limiter = RateLimiter()
        limiter.add_rule("default", rate=60, burst=10)
        assert limiter.remove_rule("default") is True
        assert "default" not in limiter.rules

    def test_remove_nonexistent_rule(self):
        limiter = RateLimiter()
        assert limiter.remove_rule("nonexistent") is False

    def test_check_with_rule_allows(self):
        limiter = RateLimiter()
        limiter.add_rule("default", rate=600, burst=100)
        assert limiter.check("user1", "default") is True

    def test_check_without_rule_allows(self):
        limiter = RateLimiter()
        assert limiter.check("user1", "nonexistent") is True

    def test_check_rejects_when_exhausted(self):
        limiter = RateLimiter()
        limiter.add_rule("default", rate=60, burst=0)
        assert limiter.check("user1", "default") is False

    def test_check_window_allows(self):
        limiter = RateLimiter()
        limiter.add_rule("default", rate=600, burst=10)
        assert limiter.check_window("user1", "default") is True

    def test_multiple_identifiers_independent(self):
        limiter = RateLimiter()
        limiter.add_rule("default", rate=600, burst=10)
        assert limiter.check("user1", "default") is True
        assert limiter.check("user2", "default") is True

    def test_status_with_identifier(self):
        limiter = RateLimiter()
        limiter.add_rule("default", rate=600, burst=10)
        limiter.check("user1", "default")
        status = limiter.status(identifier="user1", rule_key="default")
        assert "tokens" in status

    def test_status_without_identifier(self):
        limiter = RateLimiter()
        limiter.add_rule("default", rate=60, burst=10)
        status = limiter.status()
        assert "rules" in status
        assert "active_buckets" in status

    def test_status_unknown_identifier(self):
        limiter = RateLimiter()
        status = limiter.status(identifier="unknown")
        assert "error" in status

    def test_reset_all(self):
        limiter = RateLimiter()
        limiter.add_rule("default", rate=600, burst=10)
        limiter.check("user1", "default")
        limiter.reset()
        status = limiter.status(identifier="user1", rule_key="default")
        assert status["available_percent"] == 100.0

    def test_reset_by_rule_key(self):
        limiter = RateLimiter()
        limiter.add_rule("default", rate=600, burst=10)
        limiter.check("user1", "default")
        limiter.reset(rule_key="default")
        status = limiter.status(identifier="user1", rule_key="default")
        assert status["available_percent"] == 100.0

    def test_cleanup_stale(self):
        limiter = RateLimiter()
        limiter.add_rule("default", rate=600, burst=10)
        limiter.check("user1", "default")
        count = limiter.cleanup_stale(max_idle_seconds=0)
        assert count >= 1


class TestRateLimitStatus:
    """Tests for RateLimitStatus dataclass."""

    def test_to_headers(self):
        status = RateLimitStatus(allowed=True, remaining=5, limit=10, reset_at=100.0)
        headers = status.to_headers()
        assert headers["X-RateLimit-Limit"] == "10"
        assert headers["X-RateLimit-Remaining"] == "5"
        assert headers["X-RateLimit-Reset"] == "100"
