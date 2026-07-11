import json
import time
import traceback
from collections import defaultdict
from typing import Awaitable, Callable, Optional

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette import status as http_status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

_RATE_LIMIT_WINDOW = 60
_RATE_LIMIT_MAX_REQUESTS = 300

_MAX_BODY_SIZE = 10 * 1024 * 1024

_rate_buckets: dict[str, list[float]] = defaultdict(list)

_API_KEY: Optional[str] = None

_COLOR_START = "\033[94m"
_COLOR_END = "\033[0m"
_METHOD_COLORS: dict[str, str] = {
    "GET": "\033[92m",
    "POST": "\033[93m",
    "PUT": "\033[94m",
    "PATCH": "\033[95m",
    "DELETE": "\033[91m",
}


class RateLimitConfig:
    window_seconds: int = 60
    max_requests: int = 300

    def __init__(self, window_seconds: int = 60, max_requests: int = 300):
        self.window_seconds = window_seconds
        self.max_requests = max_requests


def set_api_key(key: str) -> None:
    global _API_KEY
    _API_KEY = key


def _get_client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    client = request.client
    return client.host if client else "unknown"


def _clean_expired_bucket(client_key: str, now: float,
                          window: int = _RATE_LIMIT_WINDOW):
    _rate_buckets[client_key] = [
        ts for ts in _rate_buckets[client_key]
        if now - ts < window
    ]


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        config: Optional[RateLimitConfig] = None,
        skip_paths: Optional[list[str]] = None,
    ):
        super().__init__(app)
        self.config = config or RateLimitConfig()
        self.skip_paths = skip_paths or ["/api/health", "/docs", "/openapi.json"]

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path
        for prefix in self.skip_paths:
            if path.startswith(prefix):
                return await call_next(request)

        client_key = _get_client_key(request)
        now = time.time()
        _clean_expired_bucket(client_key, now, self.config.window_seconds)
        requests_in_window = len(_rate_buckets[client_key])

        if requests_in_window >= self.config.max_requests:
            return JSONResponse(
                status_code=http_status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": True,
                    "code": "rate_limit_exceeded",
                    "message": "请求过于频繁，请稍后再试。",
                    "retry_after": self.config.window_seconds,
                },
                headers={"Retry-After": str(self.config.window_seconds)},
            )

        _rate_buckets[client_key].append(now)
        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, log_level: str = "info"):
        super().__init__(app)
        self.log_level = log_level

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.time()
        method = request.method
        path = request.url.path
        client_key = _get_client_key(request)
        method_color = _METHOD_COLORS.get(method, "")
        print(
            f"{method_color}{method}{_COLOR_END} "
            f"{path} "
            f"from={client_key}"
        )
        response = await call_next(request)
        elapsed_ms = (time.time() - start) * 1000
        status_code = response.status_code
        status_color = (
            "\033[92m" if 200 <= status_code < 300
            else "\033[93m" if 300 <= status_code < 400
            else "\033[91m"
        )
        print(
            f"{status_color}{status_code}{_COLOR_END} "
            f"{method} {path} "
            f"{elapsed_ms:.1f}ms"
        )
        return response


class RequestTimingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.time()
        response = await call_next(request)
        elapsed_ms = (time.time() - start) * 1000
        response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.2f}"
        return response


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_size_bytes: int = _MAX_BODY_SIZE):
        super().__init__(app)
        self.max_size_bytes = max_size_bytes

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > self.max_size_bytes:
                    return JSONResponse(
                        status_code=http_status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={
                            "error": True,
                            "code": "payload_too_large",
                            "message": f"请求体过大，最大允许 {self.max_size_bytes // 1024 // 1024}MB。",
                        },
                    )
            except ValueError:
                pass
        return await call_next(request)


class AuthenticationMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, skip_paths: Optional[list[str]] = None):
        super().__init__(app)
        self.skip_paths = skip_paths or [
            "/api/health",
            "/docs",
            "/openapi.json",
            "/redoc",
        ]

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if _API_KEY is None:
            return await call_next(request)

        path = request.url.path
        for prefix in self.skip_paths:
            if path.startswith(prefix):
                return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                content={
                    "error": True,
                    "code": "unauthorized",
                    "message": "缺少认证凭据，请提供 Bearer Token。",
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = auth_header[7:]
        if not _validate_token(token):
            return JSONResponse(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                content={
                    "error": True,
                    "code": "invalid_token",
                    "message": "认证凭据无效或已过期。",
                },
            )

        return await call_next(request)


def _validate_token(token: str) -> bool:
    if _API_KEY is None:
        return True
    return token == _API_KEY


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, include_traceback: bool = False):
        super().__init__(app)
        self.include_traceback = include_traceback

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            return await call_next(request)
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": True,
                    "code": f"http_{exc.status_code}",
                    "message": exc.detail if isinstance(exc.detail, str)
                    else "Request failed",
                    "status_code": exc.status_code,
                    "path": request.url.path,
                },
            )
        except Exception as exc:
            detail = {}
            if self.include_traceback:
                detail["traceback"] = traceback.format_exc()
            return JSONResponse(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": True,
                    "code": "internal_error",
                    "message": "服务器内部错误",
                    "status_code": 500,
                    "path": request.url.path,
                    **detail,
                },
            )


def configure_middleware(
    app: FastAPI,
    enable_cors: bool = True,
    cors_origins: list[str] | None = None,
    enable_rate_limit: bool = True,
    rate_limit_config: Optional[RateLimitConfig] = None,
    enable_logging: bool = True,
    enable_timing: bool = True,
    enable_auth: bool = True,
    api_key: Optional[str] = None,
    enable_body_limit: bool = True,
    max_body_size: int = _MAX_BODY_SIZE,
    enable_error_handler: bool = True,
    include_traceback: bool = False,
) -> None:

    if enable_error_handler:
        app.add_middleware(ErrorHandlerMiddleware, include_traceback=include_traceback)

    if enable_cors:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_origins or ["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["X-Response-Time-Ms", "X-Request-Id"],
        )

    if enable_auth:
        if api_key is not None:
            set_api_key(api_key)
        app.add_middleware(AuthenticationMiddleware)

    if enable_body_limit:
        app.add_middleware(BodySizeLimitMiddleware, max_size_bytes=max_body_size)

    if enable_rate_limit:
        app.add_middleware(
            RateLimitMiddleware, config=rate_limit_config or RateLimitConfig()
        )

    if enable_timing:
        app.add_middleware(RequestTimingMiddleware)

    if enable_logging:
        app.add_middleware(RequestLoggingMiddleware)
