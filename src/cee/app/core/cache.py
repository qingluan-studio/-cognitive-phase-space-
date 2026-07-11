"""
多级缓存系统

提供 LRU 缓存、TTL 缓存、内存 + 磁盘二级缓存，以及缓存统计功能。

使用示例:
    # LRU 缓存
    cache = LRUCache[str, int](max_size=100)
    cache.put("key", 42)
    value = cache.get("key")

    # TTL 缓存
    ttl_cache = TTLCache[str, bytes](default_ttl=60)
    ttl_cache.put("data", b"hello")

    # 多级缓存
    ml_cache = MultiLevelCache(memory_size=100)
    ml_cache.set("user:1", {"name": "Alice"})
"""

from __future__ import annotations

import json
import os
import pickle
import sqlite3
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Generic, Optional, TypeVar

K = TypeVar("K")
V = TypeVar("V")


# ── 缓存统计 ──────────────────────────────────────────────────────────

@dataclass
class CacheStats:
    """缓存统计信息"""

    hits: int = 0
    misses: int = 0
    evictions: int = 0
    expirations: int = 0
    size: int = 0
    max_size: int = 0

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        if total == 0:
            return 0.0
        return self.hits / total

    @property
    def usage_ratio(self) -> float:
        if self.max_size == 0:
            return 0.0
        return self.size / self.max_size

    def to_dict(self) -> dict[str, Any]:
        return {
            "hits": self.hits,
            "misses": self.misses,
            "evictions": self.evictions,
            "expirations": self.expirations,
            "size": self.size,
            "max_size": self.max_size,
            "hit_rate": round(self.hit_rate, 4),
            "usage_ratio": round(self.usage_ratio, 4),
        }


# ── LRU 缓存 ──────────────────────────────────────────────────────────

class LRUCache(Generic[K, V]):
    """基于 OrderedDict 的 LRU（Least Recently Used）缓存

    当缓存满时，自动淘汰最久未使用的条目。

    Attributes:
        max_size: 最大缓存条目数
        stats: 缓存统计信息
    """

    def __init__(self, max_size: int = 1000):
        if max_size <= 0:
            raise ValueError("max_size 必须大于 0")
        self.max_size = max_size
        self._cache: OrderedDict[K, V] = OrderedDict()
        self._lock = threading.RLock()
        self.stats = CacheStats(max_size=max_size)

    def get(self, key: K, default: V | None = None) -> V | None:
        """获取缓存值，访问时会将该条目移到末尾（最近使用）"""
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                self.stats.hits += 1
                return self._cache[key]

            self.stats.misses += 1
            return default

    def put(self, key: K, value: V) -> None:
        """放入缓存，如果已满则淘汰最久未使用的条目"""
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                self._cache[key] = value
                return

            if len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)
                self.stats.evictions += 1

            self._cache[key] = value
            self.stats.size = len(self._cache)

    def remove(self, key: K) -> bool:
        """移除指定键"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                self.stats.size = len(self._cache)
                return True
            return False

    def peek(self, key: K) -> V | None:
        """查看缓存值但不更新访问记录"""
        with self._lock:
            return self._cache.get(key)

    def clear(self) -> None:
        """清空缓存"""
        with self._lock:
            self._cache.clear()
            self.stats.size = 0
            self.stats.hits = 0
            self.stats.misses = 0
            self.stats.evictions = 0

    def keys(self) -> list[K]:
        """返回所有缓存键"""
        with self._lock:
            return list(self._cache.keys())

    def values(self) -> list[V]:
        """返回所有缓存值"""
        with self._lock:
            return list(self._cache.values())

    def items(self) -> list[tuple[K, V]]:
        """返回所有缓存条目"""
        with self._lock:
            return list(self._cache.items())

    def __contains__(self, key: K) -> bool:
        with self._lock:
            return key in self._cache

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)

    def __repr__(self) -> str:
        with self._lock:
            return f"<LRUCache size={len(self._cache)}/{self.max_size} hit_rate={self.stats.hit_rate:.2%}>"


# ── TTL 缓存 ──────────────────────────────────────────────────────────

@dataclass
class _TTLEntry(Generic[V]):
    """TTL 缓存条目，包含值和过期时间"""

    value: V
    expires_at: float


class TTLCache(Generic[K, V]):
    """带过期时间（TTL）的缓存

    每个条目有独立的过期时间，过期后自动失效。

    Attributes:
        default_ttl: 默认过期时间（秒），0 表示永不过期
        max_size: 最大缓存条目数
        stats: 缓存统计信息
    """

    def __init__(self, default_ttl: float = 300, max_size: int = 1000):
        self.default_ttl = default_ttl
        self.max_size = max_size
        self._cache: dict[K, _TTLEntry[V]] = {}
        self._lock = threading.RLock()
        self.stats = CacheStats(max_size=max_size)

    def get(self, key: K, default: V | None = None) -> V | None:
        """获取缓存值，自动检查过期"""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                self.stats.misses += 1
                return default

            if self._is_expired(entry):
                del self._cache[key]
                self.stats.expirations += 1
                self.stats.size = len(self._cache)
                self.stats.misses += 1
                return default

            self.stats.hits += 1
            return entry.value

    def put(self, key: K, value: V, ttl: float | None = None) -> None:
        """放入缓存，可指定单独的 TTL

        Args:
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒），None 则使用 default_ttl
        """
        with self._lock:
            effective_ttl = ttl if ttl is not None else self.default_ttl
            expires_at = time.monotonic() + effective_ttl if effective_ttl > 0 else float("inf")

            if len(self._cache) >= self.max_size and key not in self._cache:
                self._evict_expired()
                if len(self._cache) >= self.max_size:
                    oldest = min(self._cache.items(), key=lambda x: x[1].expires_at)
                    del self._cache[oldest[0]]
                    self.stats.evictions += 1

            self._cache[key] = _TTLEntry(value=value, expires_at=expires_at)
            self.stats.size = len(self._cache)

    def remove(self, key: K) -> bool:
        """移除指定键"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                self.stats.size = len(self._cache)
                return True
            return False

    def clear(self) -> None:
        """清空缓存"""
        with self._lock:
            self._cache.clear()
            self.stats.size = 0
            self.stats.hits = 0
            self.stats.misses = 0
            self.stats.evictions = 0
            self.stats.expirations = 0

    def cleanup_expired(self) -> int:
        """清理过期条目，返回清理数量"""
        with self._lock:
            expired = [k for k, e in self._cache.items() if self._is_expired(e)]
            for k in expired:
                del self._cache[k]
            self.stats.expirations += len(expired)
            self.stats.size = len(self._cache)
            return len(expired)

    def keys(self) -> list[K]:
        """返回所有有效缓存键"""
        with self._lock:
            return [k for k, e in self._cache.items() if not self._is_expired(e)]

    def __contains__(self, key: K) -> bool:
        with self._lock:
            entry = self._cache.get(key)
            return entry is not None and not self._is_expired(entry)

    def __len__(self) -> int:
        with self._lock:
            return sum(1 for e in self._cache.values() if not self._is_expired(e))

    @staticmethod
    def _is_expired(entry: _TTLEntry[V]) -> bool:
        return entry.expires_at <= time.monotonic()

    def _evict_expired(self) -> int:
        return self.cleanup_expired()

    def __repr__(self) -> str:
        with self._lock:
            alive = sum(1 for e in self._cache.values() if not self._is_expired(e))
            return f"<TTLCache alive={alive}/{len(self._cache)} max={self.max_size}>"


# ── 多级缓存 ──────────────────────────────────────────────────────────

_SERIALIZERS: dict[str, Callable[[Any], bytes]] = {
    "pickle": lambda v: pickle.dumps(v),
    "json": lambda v: json.dumps(v).encode("utf-8"),
}

_DESERIALIZERS: dict[str, Callable[[bytes], Any]] = {
    "pickle": lambda b: pickle.loads(b),
    "json": lambda b: json.loads(b.decode("utf-8")),
}


class DiskCacheStore:
    """基于 SQLite 的磁盘缓存"""

    def __init__(self, path: str | Path = "/tmp/cee_cache/disk.db"):
        self.path = str(path)
        self._conn: sqlite3.Connection | None = None
        self._lock = threading.Lock()

    def _ensure_conn(self) -> sqlite3.Connection:
        if self._conn is None:
            db_dir = Path(self.path).parent
            db_dir.mkdir(parents=True, exist_ok=True)
            self._conn = sqlite3.connect(self.path, timeout=10)
            self._conn.execute(
                """CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value BLOB NOT NULL,
                    metadata TEXT DEFAULT '{}',
                    expires_at REAL,
                    created_at REAL NOT NULL
                )"""
            )
            self._conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at)"
            )
            self._conn.commit()
        return self._conn

    def get(self, key: str) -> bytes | None:
        with self._lock:
            conn = self._ensure_conn()
            row = conn.execute(
                "SELECT value FROM cache WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)",
                (key, time.time()),
            ).fetchone()
            return row[0] if row else None

    def set(self, key: str, value: bytes, ttl: float | None = None) -> None:
        with self._lock:
            conn = self._ensure_conn()
            expires_at = (time.time() + ttl) if ttl and ttl > 0 else None
            conn.execute(
                "INSERT OR REPLACE INTO cache (key, value, expires_at, created_at) VALUES (?, ?, ?, ?)",
                (key, value, expires_at, time.time()),
            )
            conn.commit()

    def delete(self, key: str) -> bool:
        with self._lock:
            conn = self._ensure_conn()
            cursor = conn.execute("DELETE FROM cache WHERE key = ?", (key,))
            conn.commit()
            return cursor.rowcount > 0

    def cleanup_expired(self) -> int:
        with self._lock:
            conn = self._ensure_conn()
            cursor = conn.execute(
                "DELETE FROM cache WHERE expires_at IS NOT NULL AND expires_at <= ?",
                (time.time(),),
            )
            conn.commit()
            return cursor.rowcount

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None


class MultiLevelCache:
    """多级缓存系统

    内存 LRU 缓存（L1） + 磁盘 SQLite 缓存（L2）。
    读路径: L1 hit → 返回; L1 miss → 查 L2 → 回填 L1 → 返回
    写路径: 同时写入 L1 和 L2
    """

    def __init__(
        self,
        memory_size: int = 1000,
        default_ttl: float = 300,
        disk_path: str | Path = "/tmp/cee_cache/disk.db",
        serializer: str = "pickle",
    ):
        self.memory = LRUCache[str, Any](max_size=memory_size)
        self.default_ttl = default_ttl
        self.disk = DiskCacheStore(disk_path)
        self._serializer_name = serializer
        self._serialize = _SERIALIZERS.get(serializer, _SERIALIZERS["pickle"])
        self._deserialize = _DESERIALIZERS.get(serializer, _DESERIALIZERS["pickle"])
        self._lock = threading.RLock()
        self.stats = self.memory.stats

    def get(self, key: str) -> Any | None:
        """多级读取"""
        with self._lock:
            value = self.memory.get(key)
            if value is not None:
                return value

            raw = self.disk.get(key)
            if raw is not None:
                try:
                    value = self._deserialize(raw)
                except Exception:
                    return None
                self.memory.put(key, value)
                return value

            return None

    def set(self, key: str, value: Any, ttl: float | None = None) -> None:
        """多级写入"""
        effective_ttl = ttl if ttl is not None else self.default_ttl

        with self._lock:
            self.memory.put(key, value)
            try:
                self.disk.set(key, self._serialize(value), effective_ttl)
            except Exception:
                pass

    def delete(self, key: str) -> bool:
        """多级删除"""
        with self._lock:
            mem_removed = self.memory.remove(key)
            disk_removed = self.disk.delete(key)
            return mem_removed or disk_removed

    def clear(self) -> None:
        """清空所有级别的缓存"""
        with self._lock:
            self.memory.clear()
            self.disk.cleanup_expired()

    def cleanup(self) -> dict[str, int]:
        """清理过期条目"""
        with self._lock:
            disk_count = self.disk.cleanup_expired()
            return {"disk_expired": disk_count}

    def close(self) -> None:
        """关闭磁盘缓存"""
        self.disk.close()

    def __contains__(self, key: str) -> bool:
        return self.get(key) is not None

    def __repr__(self) -> str:
        return f"<MultiLevelCache memory={self.memory} disk={self.disk.path}>"


# ── 缓存装饰器 ────────────────────────────────────────────────────────

def cached(
    cache: LRUCache[Any, Any] | MultiLevelCache | None = None,
    ttl: float | None = None,
    key_func: Callable[..., str] | None = None,
):
    """函数结果缓存装饰器

    Args:
        cache: 缓存实例，None 则创建新的 LRUCache
        ttl: TTL（秒），仅 MultiLevelCache 时生效
        key_func: 自定义键生成函数，接收 (*args, **kwargs)
    """

    _cache = cache or LRUCache(max_size=256)

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__module__}.{func.__qualname__}:{args}:{sorted(kwargs.items())}"

            result = _cache.get(cache_key)
            if result is not None:
                return result

            result = func(*args, **kwargs)

            if isinstance(_cache, MultiLevelCache):
                _cache.set(cache_key, result, ttl)
            elif isinstance(_cache, LRUCache):
                _cache.put(cache_key, result)

            return result

        wrapper.__name__ = func.__name__
        wrapper.__doc__ = func.__doc__
        return wrapper

    return decorator
