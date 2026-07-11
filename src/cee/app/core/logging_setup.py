"""
结构化日志系统

支持 JSON 格式和彩色终端格式的输出，提供请求上下文追踪、
性能计时装饰器、日志轮转、敏感信息过滤等功能。

使用示例:
    from cee.app.core.logging_setup import setup_logging, get_logger

    setup_logging(level="DEBUG", format="colored")
    logger = get_logger(__name__)
    logger.info("服务启动", extra={"port": 8000})

    @log_execution_time
    async def heavy_task():
        ...
"""

from __future__ import annotations

import functools
import inspect
import json
import logging
import logging.handlers
import os
import re
import sys
import threading
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional


# ── 日志配置 ──────────────────────────────────────────────────────────

@dataclass
class LogConfig:
    """日志配置"""

    level: str = "INFO"
    format: str = "colored"
    json_output: bool = False
    log_file: str | None = None
    max_file_size_mb: int = 10
    backup_count: int = 5
    sensitive_fields: list[str] = field(default_factory=lambda: [
        "password", "api_key", "token", "secret",
        "authorization", "credential",
    ])


# ── ANSI 颜色码 ───────────────────────────────────────────────────────

_COLORS = {
    "DEBUG": "\033[36m",
    "INFO": "\033[32m",
    "WARNING": "\033[33m",
    "ERROR": "\033[31m",
    "CRITICAL": "\033[35m",
    "RESET": "\033[0m",
    "BOLD": "\033[1m",
    "DIM": "\033[2m",
    "CYAN": "\033[36m",
    "GREEN": "\033[32m",
    "YELLOW": "\033[33m",
    "RED": "\033[31m",
    "MAGENTA": "\033[35m",
    "BLUE": "\033[34m",
    "WHITE": "\033[37m",
    "GRAY": "\033[90m",
}


# ── 敏感信息过滤器 ───────────────────────────────────────────────────

_SENSITIVE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r'(password|passwd|secret|token|api_key|apikey|auth|credential)\s*[:=]\s*["\']?([^"\'&\s]+)', re.IGNORECASE),
    re.compile(r'(bearer\s+)([A-Za-z0-9_\-\.]+)', re.IGNORECASE),
    re.compile(r'(sk-[A-Za-z0-9]+)', re.IGNORECASE),
    re.compile(r'(-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY-----)', re.IGNORECASE),
]


def _mask_sensitive(text: str) -> str:
    """屏蔽敏感信息"""
    for pattern in _SENSITIVE_PATTERNS:
        text = pattern.sub(lambda m: m.group(0)[: len(m.group(0)) // 2] + "***", text)
    return text


class SensitiveFilter(logging.Filter):
    """日志敏感信息过滤 Filter"""

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = _mask_sensitive(str(record.msg))
        if record.args and isinstance(record.args, dict):
            record.args = {
                k: _mask_sensitive(str(v)) if k in _SENSITIVE_FIELDS_SET else v
                for k, v in record.args.items()
            }
        return True


_SENSITIVE_FIELDS_SET: set[str] = set()


def _update_sensitive_fields(fields: list[str]) -> None:
    global _SENSITIVE_FIELDS_SET
    _SENSITIVE_FIELDS_SET = set(fields)
    for field in fields:
        _SENSITIVE_PATTERNS.insert(
            0, re.compile(rf'("{re.escape(field)}"\s*:\s*)"[^"]*"', re.IGNORECASE)
        )


# ── 请求上下文 ────────────────────────────────────────────────────────

_request_local = threading.local()


class RequestContextFilter(logging.Filter):
    """将请求上下文（request_id 等）注入日志记录"""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = getattr(_request_local, "request_id", "-")
        record.user_id = getattr(_request_local, "user_id", "-")
        record.session_id = getattr(_request_local, "session_id", "-")
        return True


def set_request_context(
    request_id: str | None = None,
    user_id: str | None = None,
    session_id: str | None = None,
) -> dict[str, str | None]:
    """设置当前线程的请求上下文

    Args:
        request_id: 请求 ID，None 则自动生成
        user_id: 用户 ID
        session_id: 会话 ID

    Returns:
        设置的上下文字典
    """
    _request_local.request_id = request_id or uuid.uuid4().hex[:12]
    _request_local.user_id = user_id or "-"
    _request_local.session_id = session_id or "-"
    return {
        "request_id": _request_local.request_id,
        "user_id": _request_local.user_id,
        "session_id": _request_local.session_id,
    }


def clear_request_context() -> None:
    """清除请求上下文"""
    _request_local.request_id = "-"
    _request_local.user_id = "-"
    _request_local.session_id = "-"


def get_request_id() -> str:
    """获取当前请求 ID"""
    return getattr(_request_local, "request_id", "-")


@contextmanager
def request_context(
    request_id: str | None = None,
    user_id: str | None = None,
    session_id: str | None = None,
):
    """请求上下文上下文管理器"""
    ctx = set_request_context(request_id, user_id, session_id)
    try:
        yield ctx
    finally:
        clear_request_context()


# ── 彩色格式化器 ──────────────────────────────────────────────────────

class ColoredFormatter(logging.Formatter):
    """彩色终端日志格式化器"""

    def format(self, record: logging.LogRecord) -> str:
        level_color = _COLORS.get(record.levelname, _COLORS["RESET"])
        level_name = f"{level_color}{record.levelname:<8}{_COLORS['RESET']}"

        timestamp = f"{_COLORS['DIM']}{self.formatTime(record, '%Y-%m-%d %H:%M:%S')}{_COLORS['RESET']}"

        name_color = _COLORS["CYAN"]
        req_id = getattr(record, "request_id", "-")
        req_info = ""
        if req_id and req_id != "-":
            req_info = f" {_COLORS['MAGENTA']}[{req_id}]{_COLORS['RESET']}"

        location = f"{_COLORS['BLUE']}{record.name}{_COLORS['RESET']}"

        message = record.getMessage()

        return f"{timestamp} {level_name} {location}{req_info} {message}"


class JsonFormatter(logging.Formatter):
    """JSON 格式日志格式化器"""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
            "user_id": getattr(record, "user_id", "-"),
            "session_id": getattr(record, "session_id", "-"),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = str(record.exc_info[1])

        if hasattr(record, "extra_data"):
            log_entry["extra"] = record.extra_data

        return json.dumps(log_entry, ensure_ascii=False, default=str)


# ── FastAPI 中间件 ────────────────────────────────────────────────────

class FastAPILoggingMiddleware:
    """FastAPI 日志中间件

    自动为每个请求设置 request_id 并记录请求日志。
    """

    def __init__(self, app: Any):
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = uuid.uuid4().hex[:12]
        _request_local.request_id = request_id
        start_time = time.monotonic()

        logger = get_logger("http")

        async def _send(message: dict[str, Any]) -> None:
            if message["type"] == "http.response.start":
                elapsed = (time.monotonic() - start_time) * 1000
                status = message.get("status", 0)
                method = scope.get("method", "?")
                path = scope.get("path", "?")

                level = logging.WARNING if status >= 400 else logging.INFO
                logger.log(
                    level,
                    f"{method} {path} → {status} ({elapsed:.1f}ms)",
                )

            await send(message)

        try:
            await self.app(scope, receive, _send)
        finally:
            _request_local.request_id = "-"


# ── 性能计时装饰器 ────────────────────────────────────────────────────

def log_execution_time(
    level: int = logging.DEBUG,
    threshold_ms: float = 0,
) -> Callable:
    """记录函数执行时间的装饰器

    Args:
        level: 日志级别
        threshold_ms: 时间阈值（毫秒），仅当执行时间超过此值时才记录
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        func_name = f"{func.__module__}.{func.__qualname__}"

        if inspect.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                start = time.monotonic()
                try:
                    return await func(*args, **kwargs)
                finally:
                    elapsed = (time.monotonic() - start) * 1000
                    if elapsed >= threshold_ms:
                        logger = get_logger("performance")
                        logger.log(level, f"{func_name} took {elapsed:.2f}ms")

            return async_wrapper
        else:

            @functools.wraps(func)
            def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
                start = time.monotonic()
                try:
                    return func(*args, **kwargs)
                finally:
                    elapsed = (time.monotonic() - start) * 1000
                    if elapsed >= threshold_ms:
                        logger = get_logger("performance")
                        logger.log(level, f"{func_name} took {elapsed:.2f}ms")

            return sync_wrapper

    return decorator


# ── 日志系统初始化 ────────────────────────────────────────────────────

_logging_initialized = False
_logging_lock = threading.Lock()

_ROOT_LOGGER_NAME = "cee"


def setup_logging(
    level: str = "INFO",
    fmt: str = "colored",
    json_output: bool = False,
    log_file: str | None = None,
    max_file_size_mb: int = 10,
    backup_count: int = 5,
    sensitive_fields: list[str] | None = None,
    force: bool = False,
) -> None:
    """初始化结构化日志系统

    Args:
        level: 日志级别 (DEBUG/INFO/WARNING/ERROR/CRITICAL)
        fmt: 输出格式 ("colored" / "json" / "plain")
        json_output: 是否输出 JSON 格式
        log_file: 日志文件路径，None 表示不写入文件
        max_file_size_mb: 单个日志文件最大大小（MB）
        backup_count: 保留的备份文件数
        sensitive_fields: 需要过滤的敏感字段名
        force: 强制重新初始化
    """
    global _logging_initialized

    with _logging_lock:
        if _logging_initialized and not force:
            return

        root_logger = logging.getLogger(_ROOT_LOGGER_NAME)
        root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))
        root_logger.handlers.clear()

        if json_output:
            fmt = "json"

        handler: logging.Handler

        if fmt == "json":
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(JsonFormatter())
        elif fmt == "colored" and sys.stdout.isatty():
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(ColoredFormatter())
        else:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(
                logging.Formatter(
                    "%(asctime)s %(levelname)-8s %(name)s [%(request_id)s] %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S",
                )
            )

        handler.addFilter(RequestContextFilter())
        handler.addFilter(SensitiveFilter())
        root_logger.addHandler(handler)

        if log_file:
            log_path = Path(log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)

            rotating_handler = logging.handlers.RotatingFileHandler(
                log_file,
                maxBytes=max_file_size_mb * 1024 * 1024,
                backupCount=backup_count,
                encoding="utf-8",
            )
            rotating_handler.setFormatter(
                JsonFormatter() if json_output else logging.Formatter(
                    "%(asctime)s %(levelname)-8s %(name)s [%(request_id)s] %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S",
                )
            )
            rotating_handler.addFilter(RequestContextFilter())
            rotating_handler.addFilter(SensitiveFilter())
            root_logger.addHandler(rotating_handler)

        _update_sensitive_fields(sensitive_fields or [
            "password", "api_key", "token", "secret",
            "authorization", "credential",
        ])

        _logging_initialized = True


def get_logger(name: str | None = None) -> logging.Logger:
    """获取结构化日志记录器

    自动继承 root logger（cee）的 handler 和 filter 配置。

    Args:
        name: 日志记录器名称，None 则自动从调用栈推断

    Returns:
        配置好的 Logger 实例
    """
    if name is None:
        frame = inspect.currentframe()
        if frame and frame.f_back:
            name = frame.f_back.f_globals.get("__name__", "cee")
        else:
            name = "cee"

    if not name.startswith(_ROOT_LOGGER_NAME):
        name = f"{_ROOT_LOGGER_NAME}.{name}"

    return logging.getLogger(name)


def set_log_level(level: str) -> None:
    """动态调整日志级别

    Args:
        level: 日志级别字符串
    """
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logging.getLogger(_ROOT_LOGGER_NAME).setLevel(numeric_level)


def get_log_level() -> str:
    """获取当前根日志级别"""
    return logging.getLevelName(
        logging.getLogger(_ROOT_LOGGER_NAME).level
    )
