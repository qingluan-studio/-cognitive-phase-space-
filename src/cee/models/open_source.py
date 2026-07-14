"""
Open-Source LLM Adapters — 支持 Ollama, vLLM, OpenAI-compatible API

提供统一的 chat/completion/embeddings 接口，支持流式输出。
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncIterator, Optional

import httpx


class ProviderType(Enum):
    OPENAI = "openai"
    OLLAMA = "ollama"
    VLLM = "vllm"
    DEEPSEEK = "deepseek"
    QWEN = "qwen"
    CLAUDE = "claude"
    LMSTUDIO = "lmstudio"
    GROQ = "groq"
    TOGETHER = "together"


@dataclass
class ChatMessage:
    role: str = "user"
    content: str = ""

    def to_dict(self) -> dict:
        return {"role": self.role, "content": self.content}


@dataclass
class CompletionChoice:
    index: int = 0
    message: ChatMessage = field(default_factory=ChatMessage)
    finish_reason: str = "stop"
    logprobs: Any = None


@dataclass
class CompletionUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass
class CompletionResponse:
    id: str = ""
    object: str = "chat.completion"
    created: int = 0
    model: str = ""
    choices: list[CompletionChoice] = field(default_factory=list)
    usage: CompletionUsage = field(default_factory=CompletionUsage)
    system_fingerprint: str = ""

    @property
    def text(self) -> str:
        return self.choices[0].message.content if self.choices else ""

    @classmethod
    def from_openai(cls, data: dict) -> CompletionResponse:
        return cls(
            id=data.get("id", ""), created=data.get("created", 0),
            model=data.get("model", ""),
            choices=[CompletionChoice(
                index=c.get("index", 0),
                message=ChatMessage(
                    role=c.get("message", {}).get("role", "assistant"),
                    content=c.get("message", {}).get("content", ""),
                ),
                finish_reason=c.get("finish_reason", "stop"),
            ) for c in data.get("choices", [])],
            usage=CompletionUsage(
                prompt_tokens=data.get("usage", {}).get("prompt_tokens", 0),
                completion_tokens=data.get("usage", {}).get("completion_tokens", 0),
                total_tokens=data.get("usage", {}).get("total_tokens", 0),
            ),
        )


@dataclass
class EmbeddingResponse:
    object: str = "list"
    data: list[dict] = field(default_factory=list)
    model: str = ""
    usage: dict = field(default_factory=dict)

    @property
    def embeddings(self) -> list[list[float]]:
        return [item.get("embedding", []) for item in self.data]


class BaseLLMAdapter(ABC):
    @abstractmethod
    def chat(self, messages: list[dict], **kwargs) -> CompletionResponse: ...
    @abstractmethod
    async def achat(self, messages: list[dict], **kwargs) -> CompletionResponse: ...
    @abstractmethod
    def stream_chat(self, messages: list[dict], **kwargs): ...
    @abstractmethod
    async def astream_chat(self, messages: list[dict], **kwargs) -> AsyncIterator[str]: ...


class OpenAIAdapter(BaseLLMAdapter):
    """OpenAI-compatible API 适配器"""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o",
        timeout: float = 60.0,
    ) -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self._client: httpx.Client | None = None
        self._aclient: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.Client:
        if self._client is None:
            self._client = httpx.Client(
                base_url=self.base_url,
                timeout=self.timeout,
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            )
        return self._client

    def _get_aclient(self) -> httpx.AsyncClient:
        if self._aclient is None:
            self._aclient = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            )
        return self._aclient

    def chat(self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096, **kwargs) -> CompletionResponse:
        client = self._get_client()
        r = client.post("/chat/completions", json={
            "model": kwargs.get("model", self.model),
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        })
        r.raise_for_status()
        return CompletionResponse.from_openai(r.json())

    async def achat(self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096, **kwargs) -> CompletionResponse:
        client = self._get_aclient()
        r = await client.post("/chat/completions", json={
            "model": kwargs.get("model", self.model),
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        })
        r.raise_for_status()
        return CompletionResponse.from_openai(r.json())

    def stream_chat(self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096, **kwargs):
        client = self._get_client()
        with client.stream("POST", "/chat/completions", json={
            "model": kwargs.get("model", self.model),
            "messages": messages, "temperature": temperature, "max_tokens": max_tokens, "stream": True,
        }) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    chunk = json.loads(line[6:])
                    delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if delta:
                        yield delta

    async def astream_chat(self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096, **kwargs) -> AsyncIterator[str]:
        client = self._get_aclient()
        async with client.stream("POST", "/chat/completions", json={
            "model": kwargs.get("model", self.model),
            "messages": messages, "temperature": temperature, "max_tokens": max_tokens, "stream": True,
        }) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    chunk = json.loads(line[6:])
                    delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if delta:
                        yield delta

    def embeddings(self, texts: list[str], model: str = "text-embedding-3-small") -> EmbeddingResponse:
        client = self._get_client()
        r = client.post("/embeddings", json={"model": model, "input": texts})
        r.raise_for_status()
        data = r.json()
        return EmbeddingResponse(
            data=data.get("data", []), model=data.get("model", ""),
            usage=data.get("usage", {}),
        )

    def close(self) -> None:
        if self._client:
            self._client.close()
        if self._aclient:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                loop.run_until_complete(self._aclient.aclose())
            except RuntimeError:
                pass


class OllamaAdapter(BaseLLMAdapter):
    """Ollama 本地模型适配器"""

    def __init__(self, host: str = "http://localhost:11434", model: str = "llama3", timeout: float = 120.0) -> None:
        self.host = host.rstrip("/")
        self.model = model
        self.timeout = timeout
        self._client: httpx.Client | None = None
        self._aclient: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.Client:
        if self._client is None:
            self._client = httpx.Client(base_url=self.host, timeout=self.timeout)
        return self._client

    def _get_aclient(self) -> httpx.AsyncClient:
        if self._aclient is None:
            self._aclient = httpx.AsyncClient(base_url=self.host, timeout=self.timeout)
        return self._aclient

    def chat(self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096, **kwargs) -> CompletionResponse:
        client = self._get_client()
        r = client.post("/api/chat", json={
            "model": kwargs.get("model", self.model),
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        })
        r.raise_for_status()
        data = r.json()
        return CompletionResponse(
            id=uuid.uuid4().hex[:8],
            model=data.get("model", self.model),
            choices=[CompletionChoice(message=ChatMessage(role="assistant", content=data.get("message", {}).get("content", "")))],
        )

    async def achat(self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096, **kwargs) -> CompletionResponse:
        client = self._get_aclient()
        r = await client.post("/api/chat", json={
            "model": kwargs.get("model", self.model),
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        })
        r.raise_for_status()
        data = r.json()
        return CompletionResponse(
            id=uuid.uuid4().hex[:8],
            model=data.get("model", self.model),
            choices=[CompletionChoice(message=ChatMessage(role="assistant", content=data.get("message", {}).get("content", "")))],
        )

    def stream_chat(self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096, **kwargs):
        client = self._get_client()
        with client.stream("POST", "/api/chat", json={
            "model": kwargs.get("model", self.model),
            "messages": messages, "stream": True,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                try:
                    chunk = json.loads(line)
                    delta = chunk.get("message", {}).get("content", "")
                    if delta:
                        yield delta
                except json.JSONDecodeError:
                    pass

    async def astream_chat(self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 4096, **kwargs) -> AsyncIterator[str]:
        client = self._get_aclient()
        async with client.stream("POST", "/api/chat", json={
            "model": kwargs.get("model", self.model),
            "messages": messages, "stream": True,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                try:
                    chunk = json.loads(line)
                    delta = chunk.get("message", {}).get("content", "")
                    if delta:
                        yield delta
                except json.JSONDecodeError:
                    pass

    def embeddings(self, texts: list[str], model: str = "") -> EmbeddingResponse:
        client = self._get_client()
        model_name = model or self.model
        emb_data = []
        for text in texts:
            r = client.post("/api/embeddings", json={"model": model_name, "prompt": text})
            r.raise_for_status()
            emb_data.append({"embedding": r.json().get("embedding", [])})
        return EmbeddingResponse(data=emb_data, model=model_name)

    def list_models(self) -> list[dict]:
        client = self._get_client()
        r = client.get("/api/tags")
        r.raise_for_status()
        return r.json().get("models", [])

    def pull_model(self, model_name: str) -> dict:
        client = self._get_client()
        r = client.post("/api/pull", json={"name": model_name, "stream": False})
        r.raise_for_status()
        return r.json()

    def close(self) -> None:
        if self._client:
            self._client.close()
        if self._aclient:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                loop.run_until_complete(self._aclient.aclose())
            except RuntimeError:
                pass


class MultiProviderRouter:
    """多模型智能路由"""

    def __init__(self) -> None:
        self._adapters: dict[str, BaseLLMAdapter] = {}
        self._routing_rules: list[dict] = []
        self._default: str = ""

    def register(self, name: str, adapter: BaseLLMAdapter, is_default: bool = False) -> None:
        self._adapters[name] = adapter
        if is_default or not self._default:
            self._default = name

    def route(self, messages: list[dict], preferred: str = "", task_type: str = "") -> BaseLLMAdapter:
        if preferred and preferred in self._adapters:
            return self._adapters[preferred]
        for rule in self._routing_rules:
            if all(kw in str(messages).lower() for kw in rule.get("keywords", [])):
                return self._adapters.get(rule.get("adapter", self._default), self._adapters[self._default])
        return self._adapters[self._default]

    def chat(self, messages: list[dict], model: str = "", task_type: str = "", **kwargs) -> CompletionResponse:
        adapter_name = model or self._default
        adapter = self._adapters.get(adapter_name, self._adapters[self._default])
        return adapter.chat(messages, **kwargs)

    def stream_chat(self, messages: list[dict], model: str = "", **kwargs):
        adapter_name = model or self._default
        adapter = self._adapters.get(adapter_name, self._adapters[self._default])
        return adapter.stream_chat(messages, **kwargs)

    def list_providers(self) -> list[str]:
        return list(self._adapters.keys())

    def close_all(self) -> None:
        for adapter in self._adapters.values():
            if hasattr(adapter, 'close'):
                adapter.close()


__all__ = [
    "OpenAIAdapter",
    "OllamaAdapter",
    "MultiProviderRouter",
    "BaseLLMAdapter",
    "ChatMessage",
    "CompletionResponse",
    "CompletionChoice",
    "CompletionUsage",
    "EmbeddingResponse",
    "ProviderType",
]
