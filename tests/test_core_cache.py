"""
Tests for src/cee/app/core/cache.py — LRU, TTL, MultiLevel cache.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import json
import tempfile
import threading
import time
from pathlib import Path

import pytest

from cee.app.core.cache import (
    LRUCache,
    TTLCache,
    DiskCacheStore,
    MultiLevelCache,
    CacheStats,
    cached,
)


class TestCacheStats:
    """Tests for CacheStats dataclass."""

    def test_initial_values(self):
        stats = CacheStats()
        assert stats.hits == 0
        assert stats.misses == 0
        assert stats.evictions == 0
        assert stats.expirations == 0

    def test_hit_rate_zero_div(self):
        stats = CacheStats(hits=0, misses=0)
        assert stats.hit_rate == 0.0

    def test_hit_rate_calculation(self):
        stats = CacheStats(hits=3, misses=1)
        assert stats.hit_rate == 0.75

    def test_usage_ratio(self):
        stats = CacheStats(size=5, max_size=10)
        assert stats.usage_ratio == 0.5

    def test_to_dict(self):
        stats = CacheStats(hits=5, misses=2, size=3, max_size=10)
        d = stats.to_dict()
        assert d["hits"] == 5
        assert d["hit_rate"] == round(5 / 7, 4)


class TestLRUCache:
    """Tests for LRUCache."""

    def test_init_rejects_non_positive_size(self):
        with pytest.raises(ValueError):
            LRUCache(max_size=0)
        with pytest.raises(ValueError):
            LRUCache(max_size=-1)

    def test_put_and_get(self):
        cache = LRUCache[str, int](max_size=10)
        cache.put("a", 1)
        cache.put("b", 2)
        assert cache.get("a") == 1
        assert cache.get("b") == 2

    def test_get_missing_returns_default(self):
        cache = LRUCache[str, int](max_size=5)
        assert cache.get("x") is None
        assert cache.get("x", 100) == 100

    def test_eviction_when_full(self):
        cache = LRUCache[str, int](max_size=2)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.put("c", 3)
        assert cache.get("a") is None
        assert cache.get("b") == 2
        assert cache.get("c") == 3

    def test_recently_used_not_evicted(self):
        cache = LRUCache[str, int](max_size=2)
        cache.put("a", 1)
        cache.put("b", 2)
        assert cache.get("a") == 1
        cache.put("c", 3)
        assert cache.get("a") == 1
        assert cache.get("b") is None

    def test_remove_existing_key(self):
        cache = LRUCache[str, int](max_size=5)
        cache.put("a", 1)
        assert cache.remove("a") is True
        assert cache.get("a") is None

    def test_remove_nonexistent_key(self):
        cache = LRUCache[str, int](max_size=5)
        assert cache.remove("x") is False

    def test_peek_does_not_update_access(self):
        cache = LRUCache[str, int](max_size=2)
        cache.put("a", 1)
        cache.put("b", 2)
        assert cache.peek("a") == 1
        cache.put("c", 3)
        assert cache.get("a") is None

    def test_clear_resets_all(self):
        cache = LRUCache[str, int](max_size=5)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.clear()
        assert len(cache) == 0
        assert cache.stats.hits == 0
        assert cache.stats.misses == 0

    def test_keys_values_items(self):
        cache = LRUCache[str, int](max_size=5)
        cache.put("a", 1)
        cache.put("b", 2)
        assert set(cache.keys()) == {"a", "b"}
        assert set(cache.values()) == {1, 2}

    def test_contains_operator(self):
        cache = LRUCache[str, int](max_size=5)
        cache.put("a", 1)
        assert "a" in cache
        assert "b" not in cache

    def test_len(self):
        cache = LRUCache[str, int](max_size=10)
        assert len(cache) == 0
        cache.put("a", 1)
        assert len(cache) == 1

    def test_hit_miss_stats(self):
        cache = LRUCache[str, int](max_size=5)
        cache.put("a", 1)
        cache.get("a")
        cache.get("b")
        assert cache.stats.hits == 1
        assert cache.stats.misses == 1

    def test_eviction_stats(self):
        cache = LRUCache[str, int](max_size=2)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.put("c", 3)
        assert cache.stats.evictions >= 1


class TestTTLCache:
    """Tests for TTLCache with time-based expiry."""

    def test_put_and_get_within_ttl(self):
        cache = TTLCache[str, str](default_ttl=300)
        cache.put("key", "value")
        assert cache.get("key") == "value"

    def test_get_expired_item(self):
        cache = TTLCache[str, str](default_ttl=0.01)
        cache.put("key", "value")
        time.sleep(0.02)
        assert cache.get("key") is None
        assert cache.stats.expirations >= 1

    def test_custom_ttl_per_item(self):
        cache = TTLCache[str, str](default_ttl=300)
        cache.put("short", "short_val", ttl=0.01)
        time.sleep(0.02)
        assert cache.get("short") is None

    def test_remove_key(self):
        cache = TTLCache[str, str](default_ttl=300)
        cache.put("key", "value")
        assert cache.remove("key") is True
        assert cache.get("key") is None

    def test_clear(self):
        cache = TTLCache[str, int](default_ttl=300)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.clear()
        assert len(cache) == 0

    def test_cleanup_expired(self):
        cache = TTLCache[str, int](default_ttl=0.01)
        cache.put("a", 1)
        time.sleep(0.02)
        count = cache.cleanup_expired()
        assert count >= 1

    def test_keys_returns_valid_only(self):
        cache = TTLCache[str, int](default_ttl=0.01)
        cache.put("expired", 1)
        cache.put("valid", 2, ttl=300)
        time.sleep(0.02)
        keys = cache.keys()
        assert "valid" in keys

    def test_contains_with_expired(self):
        cache = TTLCache[str, int](default_ttl=0.01)
        cache.put("key", 1)
        time.sleep(0.02)
        assert "key" not in cache

    def test_eviction_when_full(self):
        cache = TTLCache[str, int](default_ttl=300, max_size=2)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.put("c", 3)
        assert len(cache) <= 2


class TestDiskCacheStore:
    """Tests for DiskCacheStore (SQLite-based)."""

    @pytest.fixture
    def disk_cache(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "cache.db"
            store = DiskCacheStore(path=str(path))
            yield store
            store.close()

    def test_set_and_get(self, disk_cache):
        disk_cache.set("key", b"hello world")
        assert disk_cache.get("key") == b"hello world"

    def test_get_missing(self, disk_cache):
        assert disk_cache.get("missing") is None

    def test_delete(self, disk_cache):
        disk_cache.set("key", b"data")
        assert disk_cache.delete("key") is True
        assert disk_cache.get("key") is None

    def test_delete_missing(self, disk_cache):
        assert disk_cache.delete("missing") is False

    def test_ttl_expiry(self, disk_cache):
        disk_cache.set("key", b"data", ttl=0.01)
        time.sleep(0.05)
        assert disk_cache.get("key") is None

    def test_cleanup_expired(self, disk_cache):
        disk_cache.set("key", b"data", ttl=0.01)
        time.sleep(0.05)
        count = disk_cache.cleanup_expired()
        assert count >= 1


class TestMultiLevelCache:
    """Tests for MultiLevelCache (L1 memory + L2 disk)."""

    @pytest.fixture
    def ml_cache(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "ml_cache.db"
            cache = MultiLevelCache(
                memory_size=100,
                default_ttl=300,
                disk_path=str(path),
                serializer="pickle",
            )
            yield cache
            cache.close()

    def test_set_and_get(self, ml_cache):
        ml_cache.set("k1", {"a": 1, "b": 2})
        result = ml_cache.get("k1")
        assert result == {"a": 1, "b": 2}

    def test_get_missing(self, ml_cache):
        assert ml_cache.get("missing") is None

    def test_delete(self, ml_cache):
        ml_cache.set("k1", "value")
        assert ml_cache.delete("k1") is True
        assert ml_cache.get("k1") is None

    def test_clear(self, ml_cache):
        ml_cache.set("k1", "a")
        ml_cache.set("k2", "b")
        ml_cache.clear()
        assert True

    def test_contains(self, ml_cache):
        ml_cache.set("k1", "v")
        assert "k1" in ml_cache
        assert "k2" not in ml_cache

    def test_disk_fallback_on_memory_clear(self, ml_cache):
        ml_cache.set("k1", "disk_only_value")
        ml_cache.memory.clear()
        result = ml_cache.get("k1")
        assert result == "disk_only_value"

    def test_json_serializer(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "json_cache.db"
            cache = MultiLevelCache(
                disk_path=str(path), serializer="json"
            )
            cache.set("k1", {"a": 1})
            assert cache.get("k1") == {"a": 1}
            cache.close()

    def test_cleanup(self, ml_cache):
        result = ml_cache.cleanup()
        assert "disk_expired" in result


class TestDecorator:
    """Tests for cached decorator."""

    def test_cached_decorator_lru(self):
        call_count = 0

        @cached(cache=LRUCache(max_size=10))
        def heavy_func(x):
            nonlocal call_count
            call_count += 1
            return x * 2

        assert heavy_func(5) == 10
        assert heavy_func(5) == 10
        assert call_count == 1

    def test_cached_decorator_multilevel(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "dec.db"
            ml = MultiLevelCache(disk_path=str(path))
            call_count = 0

            @cached(cache=ml, ttl=300)
            def expensive(x):
                nonlocal call_count
                call_count += 1
                return x ** 2

            assert expensive(3) == 9
            assert expensive(3) == 9
            assert call_count == 1
            ml.close()
