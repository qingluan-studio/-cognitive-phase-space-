"""
令牌桶限流器

提供令牌桶算法、滑动窗口限流、多维度限流（IP / 用户 / API 端点）、
FastAPI 中间件适配和限流状态查询。

使用示例:
    # 令牌桶
    bucket = TokenBucket(rate=10, capacity=10)
    allowed = bucket.consume()

    # 多维度限流
    limiter = RateLimiter()
    limiter.add_rule("default", rate=60, burst=10)
    status = await limiter.check("user:123")

    # FastAPI 中间件
    app.add_middleware(RateLimitMiddleware, limiter=limiter)
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Any, Optional
from collections import defaultdict


# ── 令牌桶 ────────────────────────────────────────────────────────────

class TokenBucket:
    """标准令牌桶限流器

    以固定速率生成令牌，请求消耗令牌。当令牌不足时拒绝请求。
    突发容忍由 capacity 控制。

    Attributes:
        rate: 每秒生成的令牌数
        capacity: 桶的最大令牌容量（突发上限）
        tokens: 当前可用令牌数
        last_refill: 上次补充时间
    """

    def __init__(self, rate: float, capacity: int | None = None):
        if rate <= 0:
            raise ValueError("rate 必须大于 0")

        self.rate = rate
        self.capacity = capacity if capacity is not None else int(rate)
        self.tokens = float(self.capacity)
        self.last_refill = time.monotonic()
        self._lock = threading.Lock()

        self._total_consumed = 0
        self._total_rejected = 0
        self._total_allowed = 0

    def consume(self, tokens: float = 1.0) -> bool:
        """尝试消费令牌

        Args:
            tokens: 需要消费的令牌数

        Returns:
            True 表示允许通过，False 表示被限流
        """
        with self._lock:
            self._refill()
            if self.tokens >= tokens:
                self.tokens -= tokens
                self._total_allowed += 1
                self._total_consumed += tokens
                return True

            self._total_rejected += 1
            return False

    def try_consume(self, tokens: float = 1.0, timeout: float = 0) -> bool:
        """尝试消费令牌，可等待

        Args:
            tokens: 令牌数
            timeout: 最大等待时间（秒），0 表示不等待

        Returns:
            是否允许
        """
        deadline = time.monotonic() + timeout

        while True:
            with self._lock:
                self._refill()
                if self.tokens >= tokens:
                    self.tokens -= tokens
                    self._total_allowed += 1
                    self._total_consumed += tokens
                    return True

            if timeout <= 0:
                self._total_rejected += 1
                return False

            if time.monotonic() >= deadline:
                self._total_rejected += 1
                return False

            time.sleep(0.01)

    def reset(self) -> None:
        """重置桶状态"""
        with self._lock:
            self.tokens = float(self.capacity)
            self.last_refill = time.monotonic()

    def status(self) -> dict[str, Any]:
        """获取桶状态"""
        with self._lock:
            self._refill()
            return {
                "tokens": round(self.tokens, 2),
                "capacity": self.capacity,
                "rate": self.rate,
                "available_percent": round(self.tokens / self.capacity * 100, 1),
                "total_allowed": self._total_allowed,
                "total_rejected": self._total_rejected,
            }

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_refill = now

    def __repr__(self) -> str:
        with self._lock:
            return (
                f"<TokenBucket tokens={self.tokens:.1f}/{self.capacity} "
                f"rate={self.rate}/s allowed={self._total_allowed} "
                f"rejected={self._total_rejected}>"
            )


# ── 滑动窗口 ──────────────────────────────────────────────────────────

class SlidingWindow:
    """滑动窗口限流器

    使用滑动窗口算法，记录每次请求的时间戳，
    统计窗口内的请求数。比固定窗口更平滑。

    Attributes:
        window_size: 窗口大小（秒）
        max_requests: 窗口内允许的最大请求数
    """

    def __init__(self, max_requests: int, window_size: float = 60.0):
        if max_requests <= 0:
            raise ValueError("max_requests 必须大于 0")
        if window_size <= 0:
            raise ValueError("window_size 必须大于 0")

        self.max_requests = max_requests
        self.window_size = window_size
        self._timestamps: list[float] = []
        self._lock = threading.Lock()
        self._total_allowed = 0
        self._total_rejected = 0

    def allow(self) -> bool:
        """检查当前请求是否允许

        Returns:
            True 表示允许通过
        """
        now = time.monotonic()
        with self._lock:
            cutoff = now - self.window_size
            self._timestamps = [t for t in self._timestamps if t > cutoff]

            if len(self._timestamps) < self.max_requests:
                self._timestamps.append(now)
                self._total_allowed += 1
                return True

            self._total_rejected += 1
            return False

    def current_count(self) -> int:
        """获取当前窗口内的请求数"""
        with self._lock:
            cutoff = time.monotonic() - self.window_size
            self._timestamps = [t for t in self._timestamps if t > cutoff]
            return len(self._timestamps)

    def reset(self) -> None:
        """重置窗口"""
        with self._lock:
            self._timestamps.clear()

    def status(self) -> dict[str, Any]:
        """获取窗口状态"""
        with self._lock:
            cutoff = time.monotonic() - self.window_size
            self._timestamps = [t for t in self._timestamps if t > cutoff]
            return {
                "current_requests": len(self._timestamps),
                "max_requests": self.max_requests,
                "window_size_sec": self.window_size,
                "available": self.max_requests - len(self._timestamps),
                "usage_percent": round(
                    len(self._timestamps) / self.max_requests * 100, 1
                ),
                "total_allowed": self._total_allowed,
                "total_rejected": self._total_rejected,
            }

    def __repr__(self) -> str:
        return (
            f"<SlidingWindow {self.current_count()}/{self.max_requests} "
            f"window={self.window_size}s>"
        )


# ── 速率限制规则 ──────────────────────────────────────────────────────

@dataclass
class RateLimitRule:
    """限流规则"""

    key: str
    rate: float
    burst: int = 10
    window: float = 60.0
    description: str = ""


# ── 多维度限流器 ──────────────────────────────────────────────────────

class RateLimiter:
    """多维度限流器

    支持按 IP、用户 ID、API 端点等多维度独立限流。
    每个维度使用独立的令牌桶。

    Attributes:
        rules: 限流规则字典
        _buckets: 令牌桶实例字典，key 为 "dimension:identifier"
    """

    def __init__(self):
        self.rules: dict[str, RateLimitRule] = {}
        self._buckets: dict[str, TokenBucket] = {}
        self._windows: dict[str, SlidingWindow] = {}
        self._lock = threading.RLock()

    def add_rule(
        self,
        key: str,
        rate: float,
        burst: int = 10,
        window: float = 60.0,
        description: str = "",
    ) -> None:
        """添加限流规则

        Args:
            key: 规则键（如 "default"、"per_ip"、"per_endpoint/evaluate"）
            rate: 每分钟允许的请求数
            burst: 突发上限
            window: 滑动窗口大小（秒）
            description: 规则描述
        """
        with self._lock:
            self.rules[key] = RateLimitRule(
                key=key, rate=rate, burst=burst, window=window, description=description
            )

    def remove_rule(self, key: str) -> bool:
        """移除限流规则"""
        with self._lock:
            if key in self.rules:
                del self.rules[key]
                self._buckets = {k: v for k, v in self._buckets.items() if not k.startswith(key + ":")}
                return True
            return False

    def check(
        self,
        identifier: str,
        rule_key: str = "default",
        tokens: float = 1.0,
    ) -> bool:
        """检查指定标识符是否被限流

        Args:
            identifier: 限流标识符（如 IP、用户 ID）
            rule_key: 规则键
            tokens: 消耗的令牌数

        Returns:
            True 表示允许通过
        """
        rule = self.rules.get(rule_key)
        if rule is None:
            return True

        bucket_key = f"{rule_key}:{identifier}"

        with self._lock:
            bucket = self._buckets.get(bucket_key)
            if bucket is None:
                per_second_rate = rule.rate / 60.0
                bucket = TokenBucket(rate=per_second_rate, capacity=rule.burst)
                self._buckets[bucket_key] = bucket

        return bucket.consume(tokens)

    def check_window(
        self,
        identifier: str,
        rule_key: str = "default",
    ) -> bool:
        """使用滑动窗口检查限流

        Args:
            identifier: 限流标识符
            rule_key: 规则键

        Returns:
            True 表示允许通过
        """
        rule = self.rules.get(rule_key)
        if rule is None:
            return True

        window_key = f"{rule_key}:window:{identifier}"

        with self._lock:
            window = self._windows.get(window_key)
            if window is None:
                max_requests = int(rule.rate / (60.0 / rule.window))
                window = SlidingWindow(
                    max_requests=max(1, max_requests),
                    window_size=rule.window,
                )
                self._windows[window_key] = window

        return window.allow()

    def status(self, identifier: str | None = None, rule_key: str = "default") -> dict[str, Any]:
        """获取限流状态

        Args:
            identifier: 指定标识符，None 则返回全局统计
            rule_key: 规则键
        """
        with self._lock:
            if identifier:
                bucket_key = f"{rule_key}:{identifier}"
                bucket = self._buckets.get(bucket_key)
                if bucket:
                    return bucket.status()
                return {"error": f"未找到 {bucket_key} 的限流桶"}

            result: dict[str, Any] = {
                "rules": {
                    k: {
                        "rate": v.rate,
                        "burst": v.burst,
                        "window": v.window,
                        "description": v.description,
                    }
                    for k, v in self.rules.items()
                },
                "active_buckets": len(self._buckets),
                "rule_count": len(self.rules),
            }

            if rule_key in self.rules:
                buckets_for_rule = {
                    k: v.status()
                    for k, v in self._buckets.items()
                    if k.startswith(rule_key + ":")
                }
                result["buckets"] = buckets_for_rule

            return result

    def reset(self, identifier: str | None = None, rule_key: str | None = None) -> None:
        """重置限流状态

        Args:
            identifier: 指定标识符，None 则重置所有
            rule_key: 指定规则键，None 则重置所有
        """
        with self._lock:
            if identifier and rule_key:
                bucket_key = f"{rule_key}:{identifier}"
                if bucket_key in self._buckets:
                    self._buckets[bucket_key].reset()
                window_key = f"{rule_key}:window:{identifier}"
                if window_key in self._windows:
                    self._windows[window_key].reset()
            elif rule_key:
                to_remove = [
                    k for k in self._buckets if k.startswith(rule_key + ":")
                ]
                for k in to_remove:
                    self._buckets[k].reset()
                to_remove_win = [
                    k for k in self._windows if k.startswith(rule_key + ":window:")
                ]
                for k in to_remove_win:
                    self._windows[k].reset()
            else:
                for bucket in self._buckets.values():
                    bucket.reset()
                for window in self._windows.values():
                    window.reset()

    def cleanup_stale(self, max_idle_seconds: float = 3600) -> int:
        """清理长时间未使用的限流桶

        Args:
            max_idle_seconds: 最大空闲时间

        Returns:
            清理的桶数量
        """
        now = time.monotonic()
        removed = 0
        with self._lock:
            stale_keys = [
                k
                for k, b in self._buckets.items()
                if now - b.last_refill > max_idle_seconds
            ]
            for k in stale_keys:
                del self._buckets[k]
                removed += 1
        return removed

    def __repr__(self) -> str:
        with self._lock:
            return f"<RateLimiter rules={len(self.rules)} buckets={len(self._buckets)}>"


# ── 限流状态 ──────────────────────────────────────────────────────────

@dataclass
class RateLimitStatus:
    """限流状态信息"""

    allowed: bool
    remaining: int
    limit: int
    reset_at: float
    retry_after: float = 0.0

    def to_headers(self) -> dict[str, str]:
        """转换为 HTTP 响应头"""
        return {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(self.remaining),
            "X-RateLimit-Reset": str(int(self.reset_at)),
            "Retry-After": str(int(self.retry_after)),
        }


# ── FastAPI 中间件适配器 ───────────────────────────────────────────────

class RateLimitMiddleware:
    """FastAPI 限流中间件

    使用示例:
        limiter = RateLimiter()
        limiter.add_rule("default", rate=60, burst=10)
        limiter.add_rule("per_ip", rate=100, burst=20)
        app.add_middleware(RateLimitMiddleware, limiter=limiter)

    限流维度（按优先级）:
        1. per_endpoint — 按 API 端点
        2. per_user — 按用户 ID（从请求头 X-User-ID 获取）
        3. per_ip — 按 IP
        4. default — 全局默认
    """

    def __init__(
        self,
        app: Any,
        limiter: RateLimiter | None = None,
        exclude_paths: list[str] | None = None,
    ):
        self.app = app
        self.limiter = limiter or RateLimiter()
        self.exclude_paths = set(exclude_paths or ["/health", "/metrics"])

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "/")

        if path in self.exclude_paths:
            await self.app(scope, receive, send)
            return

        client_ip = self._get_client_ip(scope)
        user_id = self._get_header(scope, "x-user-id") or client_ip

        endpoint = path.split("/")[1] if len(path) > 1 else "root"
        endpoint_key = f"per_endpoint/{endpoint}"

        allowed = True

        if endpoint_key in self.limiter.rules:
            if not self.limiter.check(endpoint, endpoint_key):
                allowed = False

        if allowed and "per_user" in self.limiter.rules:
            if not self.limiter.check(user_id, "per_user"):
                allowed = False

        if allowed and "per_ip" in self.limiter.rules:
            if not self.limiter.check(client_ip, "per_ip"):
                allowed = False

        if allowed and "default" in self.limiter.rules:
            if not self.limiter.check(client_ip, "default"):
                allowed = False

        if not allowed:
            await self._send_rate_limited(send)
            return

        await self.app(scope, receive, send)

    @staticmethod
    def _get_client_ip(scope: dict[str, Any]) -> str:
        headers = dict(scope.get("headers", []))
        forwarded = headers.get(b"x-forwarded-for")
        if forwarded:
            return forwarded.decode("utf-8").split(",")[0].strip()

        real_ip = headers.get(b"x-real-ip")
        if real_ip:
            return real_ip.decode("utf-8")

        client = scope.get("client")
        if client:
            return client[0]

        return "unknown"

    @staticmethod
    def _get_header(scope: dict[str, Any], name: str) -> str | None:
        headers = dict(scope.get("headers", []))
        value = headers.get(name.encode("utf-8"))
        return value.decode("utf-8") if value else None

    @staticmethod
    async def _send_rate_limited(send: Any) -> None:
        body = b'{"error":"rate limited","message":"Too many requests. Please try again later."}'

        await send({
            "type": "http.response.start",
            "status": 429,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
                (b"retry-after", b"60"),
            ],
        })
        await send({
            "type": "http.response.body",
            "body": body,
        })
