import os
import time
import threading
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional


class ModelProvider(Enum):
    KIMI = "kimi"
    OPENAI = "openai"
    DEEPSEEK = "deepseek"
    QWEN = "qwen"
    CLAUDE = "claude"
    CUSTOM = "custom"


@dataclass
class LLMConfig:
    provider: ModelProvider
    model_name: str = ""
    api_key: str = ""
    base_url: str = ""
    max_tokens: int = 4096
    temperature: float = 0.7
    extra: dict = field(default_factory=dict)

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)


KIMI_DEFAULTS: dict = {
    "base_url": "https://api.moonshot.cn/v1",
    "model_name": "moonshot-v1-8k",
    "max_tokens": 4096,
    "temperature": 0.7,
}


class KimiProvider:
    def __init__(self, config: Optional[LLMConfig] = None):
        if config is None:
            config = LLMConfig(
                provider=ModelProvider.KIMI,
                api_key=os.getenv("KIMI_API_KEY", ""),
                base_url=os.getenv("KIMI_BASE_URL", KIMI_DEFAULTS["base_url"]),
                model_name=os.getenv("KIMI_MODEL", KIMI_DEFAULTS["model_name"]),
                max_tokens=KIMI_DEFAULTS["max_tokens"],
                temperature=KIMI_DEFAULTS["temperature"],
            )
        self._config = config

    @property
    def config(self) -> LLMConfig:
        return self._config

    def chat(self, messages: list[dict], stream: bool = False,
             **kwargs) -> dict:
        if not self._config.is_configured and not stream:
            return self._mock_response(messages)
        return {
            "role": "assistant",
            "content": self._mock_completion(messages),
            "model": self._config.model_name,
            "usage": {"prompt_tokens": 100, "completion_tokens": 200, "total_tokens": 300},
        }

    @staticmethod
    def _mock_completion(messages: list[dict]) -> str:
        last = messages[-1]["content"] if messages else ""
        return f"[Kimi] Received: {last[:100]}..."

    @staticmethod
    def _mock_response(messages: list[dict]) -> dict:
        last = messages[-1]["content"] if messages else ""
        return {
            "role": "assistant",
            "content": f"[Kimi Mock] Received {len(messages)} messages. Last: '{last[:80]}...'",
            "model": "moonshot-v1-8k",
            "usage": {"prompt_tokens": 100, "completion_tokens": 200, "total_tokens": 300},
        }

    @staticmethod
    def from_env() -> "KimiProvider":
        return KimiProvider()

    def stats(self) -> dict:
        return {
            "provider": self._config.provider.value,
            "model": self._config.model_name,
            "configured": self._config.is_configured,
            "base_url": self._config.base_url,
        }


@dataclass
class ModelEntry:
    provider: ModelProvider
    model_name: str
    description: str = ""
    capabilities: list[str] = field(default_factory=list)
    max_tokens: int = 4096
    supports_vision: bool = False
    supports_streaming: bool = True
    registered_at: float = field(default_factory=time.time)


class ModelRegistry:
    _PRELOADED: list[ModelEntry] = [
        ModelEntry(
            provider=ModelProvider.KIMI,
            model_name="moonshot-v1-8k",
            description="Moonshot AI Kimi - 超强长文理解",
            capabilities=["chat", "long-context", "chinese-expert"],
            max_tokens=8192,
        ),
        ModelEntry(
            provider=ModelProvider.KIMI,
            model_name="moonshot-v1-32k",
            description="Moonshot AI Kimi 32K - 超长上下文",
            capabilities=["chat", "long-context", "chinese-expert", "analysis"],
            max_tokens=32768,
        ),
        ModelEntry(
            provider=ModelProvider.KIMI,
            model_name="moonshot-v1-128k",
            description="Moonshot AI Kimi 128K - 超长上下文旗舰",
            capabilities=["chat", "long-context", "chinese-expert", "analysis", "research"],
            max_tokens=131072,
        ),
        ModelEntry(
            provider=ModelProvider.OPENAI,
            model_name="gpt-4o",
            description="GPT-4o 多模态模型",
            capabilities=["chat", "vision", "code"],
            max_tokens=128000,
            supports_vision=True,
        ),
        ModelEntry(
            provider=ModelProvider.DEEPSEEK,
            model_name="deepseek-chat",
            description="DeepSeek 通用对话",
            capabilities=["chat", "code", "chinese-expert"],
            max_tokens=32768,
        ),
        ModelEntry(
            provider=ModelProvider.QWEN,
            model_name="qwen-turbo",
            description="通义千问 Turbo",
            capabilities=["chat", "chinese-expert"],
            max_tokens=8192,
        ),
    ]

    def __init__(self):
        self._entries: dict[str, ModelEntry] = {}
        self._lock = threading.RLock()
        for entry in self._PRELOADED:
            self._entries[self._make_key(entry)] = entry

    @staticmethod
    def _make_key(entry: ModelEntry) -> str:
        return f"{entry.provider.value}:{entry.model_name}"

    def register(self, entry: ModelEntry) -> None:
        with self._lock:
            self._entries[self._make_key(entry)] = entry

    def get(self, provider: ModelProvider, model_name: str) -> Optional[ModelEntry]:
        key = f"{provider.value}:{model_name}"
        return self._entries.get(key)

    def list_by_provider(self, provider: ModelProvider) -> list[ModelEntry]:
        return [e for e in self._entries.values() if e.provider == provider]

    def list_all(self) -> list[ModelEntry]:
        return list(self._entries.values())

    def find_by_capability(self, capability: str) -> list[ModelEntry]:
        return [e for e in self._entries.values() if capability in e.capabilities]

    def create_provider(self, provider: ModelProvider,
                        model_name: str = "",
                        api_key_env: str = "") -> Any:
        if provider == ModelProvider.KIMI:
            config = LLMConfig(
                provider=provider,
                api_key=os.getenv(api_key_env or "KIMI_API_KEY", ""),
                base_url=os.getenv("KIMI_BASE_URL", KIMI_DEFAULTS["base_url"]),
                model_name=model_name or KIMI_DEFAULTS["model_name"],
            )
            return KimiProvider(config)
        return KimiProvider() if provider == ModelProvider.KIMI else KimiProvider()

    def stats(self) -> dict:
        with self._lock:
            return {
                "total_models": len(self._entries),
                "providers": len(set(e.provider.value for e in self._entries.values())),
                "preloaded": len(self._PRELOADED),
            }

    @property
    def kimi_models(self) -> list[ModelEntry]:
        return self.list_by_provider(ModelProvider.KIMI)

    def model_names(self) -> list[str]:
        return [self._make_key(e) for e in self._entries.values()]
