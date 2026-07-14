"""
CEE Python SDK — 认知涌现引擎客户端 v2.0

面向 Python 应用的轻量级集成接口。
支持 同步/异步、批量操作、流式、WebSocket、自动重试。
"""

from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Callable, Optional, Self

import httpx


class SDKError(Exception):
    pass


class AuthenticationError(SDKError):
    pass


class RateLimitError(SDKError):
    pass


class TimeoutError(SDKError):
    pass


@dataclass
class CEEConfig:
    endpoint: str = "http://localhost:8899"
    timeout: float = 30.0
    api_prefix: str = "/api/v1"
    api_key: str = ""
    max_retries: int = 3
    retry_delay: float = 1.0
    headers: dict[str, str] = field(default_factory=dict)

    @classmethod
    def from_env(cls) -> Self:
        import os
        return cls(
            endpoint=os.getenv("CEE_ENDPOINT", "http://localhost:8899"),
            api_key=os.getenv("CEE_API_KEY", ""),
            timeout=float(os.getenv("CEE_TIMEOUT", "30")),
        )


class AsyncCEEClient:
    """CEE 异步客户端"""

    def __init__(self, config: CEEConfig | None = None):
        self.config = config or CEEConfig()
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            headers = {**self.config.headers}
            if self.config.api_key:
                headers["Authorization"] = f"Bearer {self.config.api_key}"
            self._client = httpx.AsyncClient(
                base_url=self.config.endpoint,
                timeout=self.config.timeout,
                headers=headers,
            )
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _retry(self, fn: Callable) -> Any:
        last_err = None
        for attempt in range(self.config.max_retries):
            try:
                return await fn()
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    raise RateLimitError("Rate limit exceeded") from e
                if e.response.status_code == 401:
                    raise AuthenticationError("Invalid API key") from e
                last_err = e
            except httpx.TimeoutException as e:
                last_err = e
            if attempt < self.config.max_retries - 1:
                await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
        raise SDKError(f"Request failed after {self.config.max_retries} retries") from last_err

    async def health(self) -> dict:
        async def _req():
            client = await self._get_client()
            r = await client.get(f"{self.config.api_prefix}/health")
            r.raise_for_status()
            return r.json()
        return await self._retry(_req)

    async def evaluate(self, text: str) -> dict:
        async def _req():
            client = await self._get_client()
            r = await client.post(f"{self.config.api_prefix}/evaluate", json={"text": text})
            r.raise_for_status()
            return r.json()
        return await self._retry(_req)

    async def optimize(self, text: str, threshold: float = 0.7) -> dict:
        async def _req():
            client = await self._get_client()
            r = await client.post(f"{self.config.api_prefix}/optimize", json={"text": text, "threshold": threshold})
            r.raise_for_status()
            return r.json()
        return await self._retry(_req)

    async def compare(self, text_a: str, text_b: str) -> dict:
        async def _req():
            client = await self._get_client()
            r = await client.post(f"{self.config.api_prefix}/compare", json={"text_a": text_a, "text_b": text_b})
            r.raise_for_status()
            return r.json()
        return await self._retry(_req)

    async def evaluate_batch(self, texts: list[str]) -> list[dict]:
        async def _evaluate_single(text):
            return await self.evaluate(text)
        return await asyncio.gather(*[_evaluate_single(t) for t in texts])

    async def quality_loop(self, text: str, threshold: float = 0.8) -> dict:
        eval_result = await self.evaluate(text)
        current_score = eval_result["scores"]["composite"]
        if current_score >= threshold:
            return {"action": "no_optimization_needed", "evaluation": eval_result, "text": text}
        opt_result = await self.optimize(text, threshold=threshold)
        return {"action": "optimized", "original_evaluation": eval_result, "optimization": opt_result, "text": opt_result["optimized_text"]}

    async def stream_evaluate(self, text: str) -> AsyncIterator[dict]:
        client = await self._get_client()
        async with client.stream("POST", f"{self.config.api_prefix}/evaluate", json={"text": text}) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    yield json.loads(line[6:])

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()


class CEEClient:
    """CEE 同步客户端 — 增强版"""

    def __init__(self, config: CEEConfig | None = None):
        self.config = config or CEEConfig()
        headers = {**self.config.headers}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        self._client = httpx.Client(
            base_url=self.config.endpoint,
            timeout=self.config.timeout,
            headers=headers,
        )
        self._async_client: AsyncCEEClient | None = None

    @property
    def prefix(self) -> str:
        return self.config.api_prefix

    @property
    def async_(self) -> AsyncCEEClient:
        if self._async_client is None:
            self._async_client = AsyncCEEClient(self.config)
        return self._async_client

    def _retry(self, fn: Callable) -> Any:
        last_err = None
        for attempt in range(self.config.max_retries):
            try:
                return fn()
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    raise RateLimitError("Rate limit exceeded") from e
                if e.response.status_code == 401:
                    raise AuthenticationError("Invalid API key") from e
                last_err = e
            except httpx.TimeoutException as e:
                last_err = e
            if attempt < self.config.max_retries - 1:
                time.sleep(self.config.retry_delay * (2 ** attempt))
        raise SDKError(f"Request failed after {self.config.max_retries} retries") from last_err

    def health(self) -> dict:
        return self._retry(lambda: self._client.get(f"{self.prefix}/health").json())

    def evaluate(self, text: str) -> dict:
        return self._retry(lambda: self._client.post(f"{self.prefix}/evaluate", json={"text": text}).json())

    def is_quality_ok(self, text: str, threshold: float = 0.7) -> bool:
        result = self.evaluate(text)
        return result["scores"]["composite"] >= threshold

    def get_score(self, text: str) -> float:
        result = self.evaluate(text)
        return result["scores"]["composite"]

    def evaluate_batch(self, texts: list[str], concurrency: int = 5) -> list[dict]:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            return list(executor.map(self.evaluate, texts))

    def compare(self, text_a: str, text_b: str) -> dict:
        return self._retry(lambda: self._client.post(f"{self.prefix}/compare", json={"text_a": text_a, "text_b": text_b}).json())

    def optimize(self, text: str, threshold: float = 0.7) -> dict:
        return self._retry(lambda: self._client.post(f"{self.prefix}/optimize", json={"text": text, "threshold": threshold}).json())

    def crystallize(self, fragments: list[str], temperature: float = 1.0, iterations: int = 100) -> dict:
        return self._retry(lambda: self._client.post(f"{self.prefix}/crystallize", json={"fragments": fragments, "temperature": temperature, "iterations": iterations}).json())

    def evolve(self, text: str, generations: int = 3, n_branches: int = 5) -> dict:
        return self._retry(lambda: self._client.post(f"{self.prefix}/evolve", json={"text": text, "generations": generations, "n_branches": n_branches}).json())

    def quality_loop(self, text: str, threshold: float = 0.8) -> dict:
        eval_result = self.evaluate(text)
        current_score = eval_result["scores"]["composite"]
        if current_score >= threshold:
            return {"action": "no_optimization_needed", "evaluation": eval_result, "text": text}
        opt_result = self.optimize(text, threshold=threshold)
        return {"action": "optimized", "original_evaluation": eval_result, "optimization": opt_result, "text": opt_result["optimized_text"]}

    def quality_loop_batch(self, texts: list[str], threshold: float = 0.8, concurrency: int = 5) -> list[dict]:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            return list(executor.map(lambda t: self.quality_loop(t, threshold), texts))

    def stream_evaluate(self, text: str):
        with self._client.stream("POST", f"{self.prefix}/evaluate", json={"text": text}) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if line.startswith("data: "):
                    yield json.loads(line[6:])

    def set_api_key(self, api_key: str) -> None:
        self.config.api_key = api_key
        self._client.headers["Authorization"] = f"Bearer {api_key}"

    def close(self):
        self._client.close()
        if self._async_client:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(self._async_client.close())
                else:
                    loop.run_until_complete(self._async_client.close())
            except RuntimeError:
                pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
