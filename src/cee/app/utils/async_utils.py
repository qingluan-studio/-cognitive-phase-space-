"""
异步工具集

提供:
- 并发限制器 (Semaphore 包装)
- 异步重试装饰器 (指数退避)
- 异步超时包装
- 异步批量处理器
- 异步任务池
- 优雅关闭
"""

from __future__ import annotations

import asyncio
import functools
import threading
import time
import signal
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Any, Callable, Optional, TypeVar, Union

T = TypeVar("T")


# ============================================================
# 并发限制器
# ============================================================

class ConcurrencyLimiter:
    """并发限制器 — 基于 asyncio.Semaphore 的并发控制

    限制同时执行的操作数量，超过限制时自动排队等待。

    Usage:
        limiter = ConcurrencyLimiter(max_concurrency=10)
        async with limiter:
            await do_work()
    """

    def __init__(self, max_concurrency: int = 10):
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._max_concurrency = max_concurrency
        self._active_count = 0
        self._lock = threading.Lock()

    async def __aenter__(self):
        await self._semaphore.acquire()
        with self._lock:
            self._active_count += 1

    async def __aexit__(self, *args):
        self._semaphore.release()
        with self._lock:
            self._active_count -= 1

    @property
    def active(self) -> int:
        with self._lock:
            return self._active_count

    @property
    def max_concurrency(self) -> int:
        return self._max_concurrency

    def limit(self, func: Callable[..., Any]) -> Callable[..., Any]:
        """将并发限制包装为装饰器

        Usage:
            limiter = ConcurrencyLimiter(5)

            @limiter.limit
            async def fetch(url):
                ...
        """
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            async with self:
                return await func(*args, **kwargs)
        return wrapper


# ============================================================
# 异步重试装饰器
# ============================================================

def async_retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,),
    on_retry: Optional[Callable[[Exception, int], None]] = None,
) -> Callable:
    """异步重试装饰器 — 指数退避

    Usage:
        @async_retry(max_retries=3, base_delay=1.0)
        async def flaky_api():
            ...
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    if attempt < max_retries:
                        delay = min(
                            base_delay * (backoff_factor ** attempt),
                            max_delay,
                        )
                        if on_retry is not None:
                            on_retry(e, attempt + 1)
                        await asyncio.sleep(delay)
            raise last_exc  # type: ignore[misc]
        return wrapper
    return decorator


# ============================================================
# 异步超时包装
# ============================================================

async def async_timeout(
    coro,
    timeout: float,
    default: Any = None,
    raise_on_timeout: bool = False,
) -> Any:
    """异步超时包装

    Usage:
        result = await async_timeout(
            long_running_task(),
            timeout=5.0,
            default="timeout"
        )
    """

    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        if raise_on_timeout:
            raise
        return default


def with_timeout(
    timeout: float,
    default: Any = None,
    raise_on_timeout: bool = False,
) -> Callable:
    """异步超时装饰器

    Usage:
        @with_timeout(5.0, default={"error": "timeout"})
        async def slow_api():
            ...
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await async_timeout(
                func(*args, **kwargs),
                timeout=timeout,
                default=default,
                raise_on_timeout=raise_on_timeout,
            )
        return wrapper
    return decorator


# ============================================================
# 异步批量处理器
# ============================================================

@dataclass
class BatchConfig:
    max_batch_size: int = 100
    flush_interval: float = 1.0
    max_queue_size: int = 10000


class AsyncBatchProcessor:
    """异步批量处理器

    收集单个项目，在达到批量大小或时间间隔时批量处理。

    Usage:
        processor = AsyncBatchProcessor(
            process_fn=batch_save_to_db,
            config=BatchConfig(max_batch_size=50, flush_interval=2.0)
        )
        await processor.add(item)
    """

    def __init__(
        self,
        process_fn: Callable[[list[Any]], Any],
        config: BatchConfig | None = None,
    ):
        self._process_fn = process_fn
        self._config = config or BatchConfig()
        self._queue: list[Any] = []
        self._lock = asyncio.Lock()
        self._flush_event = asyncio.Event()
        self._running = True
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(self._flush_loop())

    async def stop(self) -> None:
        self._running = False
        self._flush_event.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        await self.flush()

    async def add(self, item: Any) -> None:
        async with self._lock:
            if len(self._queue) >= self._config.max_queue_size:
                raise RuntimeError("批量队列已满")
            self._queue.append(item)
            if len(self._queue) >= self._config.max_batch_size:
                self._flush_event.set()

    async def flush(self) -> None:
        batch: list[Any] = []
        async with self._lock:
            if self._queue:
                batch = self._queue[:]
                self._queue = []
        if batch:
            try:
                await self._process_fn(batch)
            except Exception:
                pass

    async def _flush_loop(self) -> None:
        while self._running:
            try:
                await asyncio.wait_for(
                    self._flush_event.wait(),
                    timeout=self._config.flush_interval,
                )
            except asyncio.TimeoutError:
                pass
            await self.flush()
            self._flush_event.clear()

    def __len__(self) -> int:
        return len(self._queue)


# ============================================================
# 异步任务池
# ============================================================

class AsyncTaskPool:
    """异步任务池

    管理一组异步任务，跟踪完成状态和结果。

    Usage:
        pool = AsyncTaskPool()
        pool.submit(big_task_1())
        pool.submit(big_task_2())
        results = await pool.wait_all()
    """

    def __init__(self, max_concurrency: int | None = None):
        self._tasks: dict[str, asyncio.Task] = {}
        self._semaphore: Optional[asyncio.Semaphore] = None
        if max_concurrency is not None:
            self._semaphore = asyncio.Semaphore(max_concurrency)
        self._lock = asyncio.Lock()

    async def submit(self, coro, task_id: str | None = None) -> str:
        tid = task_id or f"task_{len(self._tasks)}_{id(coro)}"
        async with self._lock:
            if self._semaphore is not None:
                await self._semaphore.acquire()
                wrapped = self._semaphore_wrapper(coro)
            else:
                wrapped = coro
            self._tasks[tid] = asyncio.create_task(wrapped)
        return tid

    async def _semaphore_wrapper(self, coro):
        try:
            return await coro
        finally:
            if self._semaphore is not None:
                self._semaphore.release()

    async def wait_all(self) -> dict[str, Any]:
        results: dict[str, Any] = {}
        for tid, task in list(self._tasks.items()):
            try:
                results[tid] = await task
            except Exception as e:
                results[tid] = e
        return results

    async def wait_any(self) -> tuple[str, Any]:
        pending = set(self._tasks.items())
        while pending:
            done, pending_set = await asyncio.wait(
                [t for _, t in pending],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for done_task in done:
                for tid, task in list(pending):
                    if task is done_task:
                        try:
                            return tid, await done_task
                        except Exception as e:
                            return tid, e
        raise RuntimeError("任务池为空")

    def cancel_all(self) -> None:
        for task in self._tasks.values():
            if not task.done():
                task.cancel()

    @property
    def pending_count(self) -> int:
        return sum(1 for t in self._tasks.values() if not t.done())

    @property
    def total_count(self) -> int:
        return len(self._tasks)


# ============================================================
# 优雅关闭
# ============================================================

class GracefulShutdown:
    """优雅关闭管理器

    监听 SIGTERM/SIGINT，执行注册的清理回调。

    Usage:
        shutdown = GracefulShutdown()

        @shutdown.on_shutdown
        async def cleanup():
            await db.close()

        # 在事件循环中等待
        await shutdown.wait()
    """

    def __init__(self):
        self._callbacks: list[Callable] = []
        self._shutdown_event = asyncio.Event()
        self._shutting_down = False
        self._original_handlers: dict[int, Any] = {}

    def _handle_signal(self) -> None:
        if not self._shutting_down:
            self._shutting_down = True
            self._shutdown_event.set()

    def setup_signals(self, loop: Optional[asyncio.AbstractEventLoop] = None) -> None:
        loop = loop or asyncio.get_event_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            try:
                self._original_handlers[sig.value] = signal.getsignal(sig)
                loop.add_signal_handler(sig, self._handle_signal)
            except (NotImplementedError, RuntimeError, ValueError):
                pass

    def restore_signals(self) -> None:
        for sig, handler in self._original_handlers.items():
            try:
                signal.signal(sig, handler)
            except Exception:
                pass

    def on_shutdown(self, func: Callable) -> Callable:
        """注册关闭回调"""
        self._callbacks.append(func)
        return func

    async def wait(self) -> None:
        """等待关闭信号"""
        await self._shutdown_event.wait()
        for callback in self._callbacks:
            try:
                result = callback()
                if asyncio.iscoroutine(result):
                    await result
            except Exception:
                pass

    @property
    def is_shutting_down(self) -> bool:
        return self._shutting_down

    def trigger(self) -> None:
        self._handle_signal()


# ============================================================
# 便捷函数
# ============================================================

def run_async(coro) -> Any:
    """在同步代码中运行异步协程

    Usage:
        result = run_async(fetch_data())
    """

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop is not None:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, coro)
            return future.result()
    else:
        return asyncio.run(coro)


async def gather_limited(
    limit: int,
    *coros,
) -> list[Any]:
    """带并发限制的 gather

    Usage:
        results = await gather_limited(5, *many_coroutines)
    """

    semaphore = asyncio.Semaphore(limit)

    async def _limited(coro):
        async with semaphore:
            return await coro

    return await asyncio.gather(*[_limited(c) for c in coros])


async def sleep_until(condition: Callable[[], bool], interval: float = 0.1, timeout: float | None = None) -> bool:
    """等待条件满足

    Args:
        condition: 条件函数
        interval: 轮询间隔
        timeout: 超时时间（秒），None 表示不超时

    Returns:
        True 如果条件满足，False 如果超时
    """

    start = time.monotonic()
    while not condition():
        if timeout is not None and (time.monotonic() - start) > timeout:
            return False
        await asyncio.sleep(interval)
    return True
