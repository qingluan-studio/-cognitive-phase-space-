"""
API adapters for various LLM providers.
Provides unified interfaces for OpenAI-compatible, Zhipu (GLM), and MiniMax APIs.
"""

from __future__ import annotations

import abc
import json
import os
import time
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional, Union

import aiohttp
import requests


class AdapterError(Exception):
    """Base exception for adapter errors."""

    def __init__(self, message: str, status_code: Optional[int] = None, raw_body: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.raw_body = raw_body


class AuthenticationError(AdapterError):
    """Raised when API key is invalid or missing."""


class RateLimitError(AdapterError):
    """Raised when rate limit is exceeded."""


class BadRequestError(AdapterError):
    """Raised when the request is malformed."""


class ServerError(AdapterError):
    """Raised when the server returns a 5xx error."""


class BaseAdapter(abc.ABC):
    """Abstract base adapter for all LLM providers."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        timeout: float = 60.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay

    @abc.abstractmethod
    def send_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Send a synchronous chat-completion request."""
        raise NotImplementedError

    @abc.abstractmethod
    def stream_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Iterator[str]:
        """Send a synchronous streaming request and yield SSE chunks."""
        raise NotImplementedError

    @abc.abstractmethod
    async def asend_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Send an asynchronous chat-completion request."""
        raise NotImplementedError

    @abc.abstractmethod
    async def astream_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> AsyncIterator[str]:
        """Send an async streaming request and yield SSE chunks."""
        raise NotImplementedError

    @abc.abstractmethod
    def parse_response(self, raw_response: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize provider-specific response into a common schema."""
        raise NotImplementedError

    def _raise_for_status(self, status_code: int, body: str) -> None:
        """Map HTTP status codes to AdapterError subclasses."""
        if status_code == 401:
            raise AuthenticationError("Invalid or missing API key", status_code, body)
        if status_code == 429:
            raise RateLimitError("Rate limit exceeded", status_code, body)
        if status_code == 400:
            raise BadRequestError("Bad request", status_code, body)
        if status_code >= 500:
            raise ServerError(f"Server error {status_code}", status_code, body)
        if status_code >= 400:
            raise AdapterError(f"HTTP error {status_code}", status_code, body)

    def _build_headers(self) -> Dict[str, str]:
        """Default headers; subclasses may override."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }


class OpenAIAdapter(BaseAdapter):
    """
    Adapter for OpenAI-compatible APIs.
    Covers DeepSeek, Kimi (Moonshot), Qwen (Alibaba), Doubao (ByteDance),
    and OpenAI itself.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.openai.com/v1",
        timeout: float = 60.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        super().__init__(api_key, base_url, timeout, max_retries, retry_delay)

    def _build_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _build_payload(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: Optional[int],
        top_p: Optional[float],
        stream: bool,
        extra_params: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if top_p is not None:
            payload["top_p"] = top_p
        if extra_params:
            payload.update(extra_params)
        return payload

    def send_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, False, extra_params)

        for attempt in range(self.max_retries):
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
                self._raise_for_status(resp.status_code, resp.text)
                data = resp.json()
                return self.parse_response(data)
            except (requests.RequestException, AdapterError) as exc:
                if attempt == self.max_retries - 1:
                    raise
                if isinstance(exc, AdapterError) and isinstance(exc, (RateLimitError, ServerError)):
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    time.sleep(self.retry_delay)
        return {}

    def stream_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Iterator[str]:
        url = f"{self.base_url}/chat/completions"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, True, extra_params)

        with requests.post(url, headers=headers, json=payload, stream=True, timeout=self.timeout) as resp:
            self._raise_for_status(resp.status_code, resp.text or "")
            for line in resp.iter_lines():
                if line:
                    decoded = line.decode("utf-8")
                    if decoded.startswith("data: "):
                        chunk = decoded[len("data: "):]
                        if chunk == "[DONE]":
                            break
                        yield chunk

    async def asend_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, False, extra_params)

        for attempt in range(self.max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=self.timeout)) as resp:
                        body = await resp.text()
                        self._raise_for_status(resp.status, body)
                        data = json.loads(body)
                        return self.parse_response(data)
            except (aiohttp.ClientError, AdapterError) as exc:
                if attempt == self.max_retries - 1:
                    raise
                if isinstance(exc, AdapterError) and isinstance(exc, (RateLimitError, ServerError)):
                    await __import__("asyncio").sleep(self.retry_delay * (2 ** attempt))
                else:
                    await __import__("asyncio").sleep(self.retry_delay)
        return {}

    async def astream_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> AsyncIterator[str]:
        url = f"{self.base_url}/chat/completions"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, True, extra_params)

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=self.timeout)) as resp:
                body = await resp.text()
                self._raise_for_status(resp.status, body)
                async for line in resp.content:
                    decoded = line.decode("utf-8").strip()
                    if decoded.startswith("data: "):
                        chunk = decoded[len("data: "):]
                        if chunk == "[DONE]":
                            break
                        yield chunk

    def parse_response(self, raw_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize OpenAI-style response.
        Expected common schema:
          {
            "id": str,
            "model": str,
            "content": str,
            "usage": {"prompt_tokens": int, "completion_tokens": int, "total_tokens": int},
            "finish_reason": str,
          }
        """
        choice = raw_response.get("choices", [{}])[0]
        message = choice.get("message", {})
        usage = raw_response.get("usage", {})
        return {
            "id": raw_response.get("id", ""),
            "model": raw_response.get("model", ""),
            "content": message.get("content", ""),
            "usage": {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            },
            "finish_reason": choice.get("finish_reason", ""),
            "raw": raw_response,
        }


class GLMAdapter(BaseAdapter):
    """
    Adapter for Zhipu AI (GLM) API.
    GLM uses an OpenAI-like structure but with its own auth and minor payload differences.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://open.bigmodel.cn/api/paas/v4",
        timeout: float = 60.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        api_key = api_key or os.getenv("ZHIPU_API_KEY", "")
        super().__init__(api_key, base_url, timeout, max_retries, retry_delay)

    def _build_headers(self) -> Dict[str, str]:
        return {
            "Authorization": self.api_key,
            "Content-Type": "application/json",
        }

    def _build_payload(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: Optional[int],
        top_p: Optional[float],
        stream: bool,
        extra_params: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if top_p is not None:
            payload["top_p"] = top_p
        if extra_params:
            payload.update(extra_params)
        return payload

    def send_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, False, extra_params)

        for attempt in range(self.max_retries):
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
                self._raise_for_status(resp.status_code, resp.text)
                data = resp.json()
                return self.parse_response(data)
            except (requests.RequestException, AdapterError) as exc:
                if attempt == self.max_retries - 1:
                    raise
                if isinstance(exc, AdapterError) and isinstance(exc, (RateLimitError, ServerError)):
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    time.sleep(self.retry_delay)
        return {}

    def stream_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Iterator[str]:
        url = f"{self.base_url}/chat/completions"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, True, extra_params)

        with requests.post(url, headers=headers, json=payload, stream=True, timeout=self.timeout) as resp:
            self._raise_for_status(resp.status_code, resp.text or "")
            for line in resp.iter_lines():
                if line:
                    decoded = line.decode("utf-8")
                    if decoded.startswith("data: "):
                        chunk = decoded[len("data: "):]
                        if chunk == "[DONE]":
                            break
                        yield chunk

    async def asend_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, False, extra_params)

        for attempt in range(self.max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=self.timeout)) as resp:
                        body = await resp.text()
                        self._raise_for_status(resp.status, body)
                        data = json.loads(body)
                        return self.parse_response(data)
            except (aiohttp.ClientError, AdapterError) as exc:
                if attempt == self.max_retries - 1:
                    raise
                if isinstance(exc, AdapterError) and isinstance(exc, (RateLimitError, ServerError)):
                    await __import__("asyncio").sleep(self.retry_delay * (2 ** attempt))
                else:
                    await __import__("asyncio").sleep(self.retry_delay)
        return {}

    async def astream_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> AsyncIterator[str]:
        url = f"{self.base_url}/chat/completions"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, True, extra_params)

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=self.timeout)) as resp:
                body = await resp.text()
                self._raise_for_status(resp.status, body)
                async for line in resp.content:
                    decoded = line.decode("utf-8").strip()
                    if decoded.startswith("data: "):
                        chunk = decoded[len("data: "):]
                        if chunk == "[DONE]":
                            break
                        yield chunk

    def parse_response(self, raw_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize GLM response to common schema.
        GLM shares OpenAI structure but may include extra fields like "created".
        """
        choice = raw_response.get("choices", [{}])[0]
        message = choice.get("message", {})
        usage = raw_response.get("usage", {})
        return {
            "id": raw_response.get("id", ""),
            "model": raw_response.get("model", ""),
            "content": message.get("content", ""),
            "usage": {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            },
            "finish_reason": choice.get("finish_reason", ""),
            "created": raw_response.get("created"),
            "raw": raw_response,
        }


class MiniMaxAdapter(BaseAdapter):
    """
    Adapter for MiniMax API.
    MiniMax uses a custom payload shape with 'model' and 'messages' but groups
    parameters under a 'chat_completion_config' object in some versions.
    We target the standard v1 chat completion endpoint.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        group_id: Optional[str] = None,
        base_url: str = "https://api.minimax.chat/v1",
        timeout: float = 60.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        api_key = api_key or os.getenv("MINIMAX_API_KEY", "")
        self.group_id = group_id or os.getenv("MINIMAX_GROUP_ID", "")
        super().__init__(api_key, base_url, timeout, max_retries, retry_delay)

    def _build_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _build_payload(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: Optional[int],
        top_p: Optional[float],
        stream: bool,
        extra_params: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream,
        }
        if max_tokens is not None:
            payload["tokens_to_generate"] = max_tokens
        if top_p is not None:
            payload["top_p"] = top_p
        if self.group_id:
            payload["group_id"] = self.group_id
        if extra_params:
            payload.update(extra_params)
        return payload

    def send_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/text/chatcompletion_v2"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, False, extra_params)

        for attempt in range(self.max_retries):
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
                self._raise_for_status(resp.status_code, resp.text)
                data = resp.json()
                return self.parse_response(data)
            except (requests.RequestException, AdapterError) as exc:
                if attempt == self.max_retries - 1:
                    raise
                if isinstance(exc, AdapterError) and isinstance(exc, (RateLimitError, ServerError)):
                    time.sleep(self.retry_delay * (2 ** attempt))
                else:
                    time.sleep(self.retry_delay)
        return {}

    def stream_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Iterator[str]:
        url = f"{self.base_url}/text/chatcompletion_v2"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, True, extra_params)

        with requests.post(url, headers=headers, json=payload, stream=True, timeout=self.timeout) as resp:
            self._raise_for_status(resp.status_code, resp.text or "")
            for line in resp.iter_lines():
                if line:
                    decoded = line.decode("utf-8")
                    if decoded.startswith("data: "):
                        chunk = decoded[len("data: "):]
                        if chunk == "[DONE]":
                            break
                        yield chunk

    async def asend_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/text/chatcompletion_v2"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, False, extra_params)

        for attempt in range(self.max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=self.timeout)) as resp:
                        body = await resp.text()
                        self._raise_for_status(resp.status, body)
                        data = json.loads(body)
                        return self.parse_response(data)
            except (aiohttp.ClientError, AdapterError) as exc:
                if attempt == self.max_retries - 1:
                    raise
                if isinstance(exc, AdapterError) and isinstance(exc, (RateLimitError, ServerError)):
                    await __import__("asyncio").sleep(self.retry_delay * (2 ** attempt))
                else:
                    await __import__("asyncio").sleep(self.retry_delay)
        return {}

    async def astream_request(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> AsyncIterator[str]:
        url = f"{self.base_url}/text/chatcompletion_v2"
        headers = self._build_headers()
        payload = self._build_payload(model, messages, temperature, max_tokens, top_p, True, extra_params)

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=self.timeout)) as resp:
                body = await resp.text()
                self._raise_for_status(resp.status, body)
                async for line in resp.content:
                    decoded = line.decode("utf-8").strip()
                    if decoded.startswith("data: "):
                        chunk = decoded[len("data: "):]
                        if chunk == "[DONE]":
                            break
                        yield chunk

    def parse_response(self, raw_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize MiniMax response to common schema.
        MiniMax nests choices under "choices" and text under "message" similarly,
        but also includes a "base_resp" status wrapper.
        """
        base_resp = raw_response.get("base_resp", {})
        status_code = base_resp.get("status_code", 0)
        if status_code != 0:
            raise AdapterError(
                f"MiniMax error {status_code}: {base_resp.get('status_msg', '')}",
                status_code,
                json.dumps(raw_response),
            )

        choice = raw_response.get("choices", [{}])[0]
        message = choice.get("message", {})
        usage = raw_response.get("usage", {})
        return {
            "id": raw_response.get("id", ""),
            "model": raw_response.get("model", ""),
            "content": message.get("content", ""),
            "usage": {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            },
            "finish_reason": choice.get("finish_reason", ""),
            "raw": raw_response,
        }
