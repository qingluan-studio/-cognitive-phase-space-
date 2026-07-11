from __future__ import annotations

import importlib
import inspect
import json
import time
import sys
from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar, Optional


@dataclass
class PluginMetadata:
    name: str = ""
    version: str = "0.1.0"
    description: str = ""
    author: str = ""
    dependencies: list[str] = field(default_factory=list)
    enabled: bool = True


@dataclass
class PluginStats:
    calls: int = 0
    total_time_ms: float = 0.0
    errors: int = 0
    last_called_at: str = ""
    avg_time_ms: float = 0.0

    def record(self, elapsed_ms: float, success: bool) -> None:
        self.calls += 1
        self.total_time_ms += elapsed_ms
        self.avg_time_ms = self.total_time_ms / self.calls
        if not success:
            self.errors += 1
        from datetime import datetime, timezone
        self.last_called_at = datetime.now(timezone.utc).isoformat()


class PluginBase(ABC):
    metadata: ClassVar[PluginMetadata]

    def __init_subclass__(cls) -> None:
        super().__init_subclass__()
        if not hasattr(cls, "metadata"):
            cls.metadata = PluginMetadata(name=cls.__name__)

    @abstractmethod
    def initialize(self) -> bool: ...

    @abstractmethod
    def execute(self, **kwargs: Any) -> Any: ...

    @abstractmethod
    def cleanup(self) -> None: ...


class PluginManager:
    def __init__(self, plugin_dirs: Optional[list[str]] = None) -> None:
        self._plugins: dict[str, tuple[type[PluginBase], PluginBase | None]] = {}
        self._stats: dict[str, PluginStats] = defaultdict(PluginStats)
        self._configs: dict[str, dict[str, Any]] = {}
        self._plugin_dirs = plugin_dirs or []
        self._register_builtins()

    def _register_builtins(self) -> None:
        for cls in _BUILTIN_PLUGINS:
            name = cls.metadata.name
            self._plugins[name] = (cls, None)

    def discover(self, directory: str) -> list[str]:
        found: list[str] = []
        path = Path(directory)
        if not path.exists():
            return found
        for f in path.glob("*.py"):
            if f.name.startswith("_"):
                continue
            found.append(str(f))
        for f in path.glob("*/plugin.py"):
            found.append(str(f))
        return found

    def load_from_file(self, filepath: str) -> Optional[str]:
        spec = importlib.util.spec_from_file_location(
            f"cee_plugin_{Path(filepath).stem}", filepath,
        )
        if spec is None or spec.loader is None:
            return None
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        for _name, obj in inspect.getmembers(module, inspect.isclass):
            if issubclass(obj, PluginBase) and obj is not PluginBase:
                name = obj.metadata.name
                self._plugins[name] = (obj, None)
                return name
        return None

    def load(self, plugin_name: str) -> bool:
        if plugin_name not in self._plugins:
            return False
        cls, instance = self._plugins[plugin_name]
        if instance is not None:
            return True
        try:
            inst = cls()
            if inst.initialize():
                self._plugins[plugin_name] = (cls, inst)
                return True
            return False
        except Exception:
            return False

    def unload(self, plugin_name: str) -> bool:
        if plugin_name not in self._plugins:
            return False
        _cls, instance = self._plugins[plugin_name]
        if instance is not None:
            instance.cleanup()
        self._plugins[plugin_name] = (_cls, None)
        return True

    def reload(self, plugin_name: str) -> bool:
        return self.unload(plugin_name) and self.load(plugin_name)

    def execute(self, plugin_name: str, **kwargs: Any) -> Any:
        if plugin_name not in self._plugins:
            raise ValueError(f"Plugin '{plugin_name}' not found")
        _cls, instance = self._plugins[plugin_name]
        if instance is None:
            if not self.load(plugin_name):
                raise RuntimeError(f"Failed to load plugin '{plugin_name}'")
            _cls, instance = self._plugins[plugin_name]
        if instance is None:
            raise RuntimeError(f"Plugin instance '{plugin_name}' is None")
        ok = True
        start = time.monotonic()
        try:
            result = instance.execute(**kwargs)
        except Exception:
            ok = False
            raise
        finally:
            elapsed = (time.monotonic() - start) * 1000
            self._stats[plugin_name].record(elapsed, ok)
        return result

    def resolve_dependencies(self, plugin_name: str) -> list[str]:
        if plugin_name not in self._plugins:
            return []
        cls, _inst = self._plugins[plugin_name]
        deps: list[str] = []
        for dep in cls.metadata.dependencies:
            deps.append(dep)
            deps.extend(self.resolve_dependencies(dep))
        return list(dict.fromkeys(deps))

    def load_with_deps(self, plugin_name: str) -> bool:
        deps = self.resolve_dependencies(plugin_name)
        for dep in deps:
            if not self.load(dep):
                return False
        return self.load(plugin_name)

    def is_loaded(self, plugin_name: str) -> bool:
        return plugin_name in self._plugins and self._plugins[plugin_name][1] is not None

    def set_config(self, plugin_name: str, config: dict[str, Any]) -> None:
        self._configs[plugin_name] = config

    def get_config(self, plugin_name: str) -> dict[str, Any]:
        return self._configs.get(plugin_name, {})

    def get_stats(self, plugin_name: str) -> PluginStats:
        return self._stats[plugin_name]

    def get_all_stats(self) -> dict[str, PluginStats]:
        return dict(self._stats)

    def list_plugins(self) -> list[str]:
        return list(self._plugins.keys())

    def list_loaded(self) -> list[str]:
        return [n for n, (c, i) in self._plugins.items() if i is not None]

    def list_unloaded(self) -> list[str]:
        return [n for n, (c, i) in self._plugins.items() if i is None]

    def shutdown_all(self) -> None:
        for name in list(self._plugins.keys()):
            self.unload(name)


# —— Built-in Plugin Registry ——

class WebSearchPlugin(PluginBase):
    metadata = PluginMetadata(
        name="web_search",
        version="1.0.0",
        description="Web search capability for retrieving online information",
        author="CEE Team",
        dependencies=[],
    )

    def initialize(self) -> bool:
        return True

    def execute(self, **kwargs: Any) -> Any:
        query = kwargs.get("query", "")
        return {"query": query, "results": [], "provider": "builtin"}

    def cleanup(self) -> None:
        pass


class RAGPlugin(PluginBase):
    metadata = PluginMetadata(
        name="rag",
        version="1.0.0",
        description="Retrieval-Augmented Generation for knowledge-enhanced responses",
        author="CEE Team",
        dependencies=["web_search"],
    )

    def initialize(self) -> bool:
        return True

    def execute(self, **kwargs: Any) -> Any:
        query = kwargs.get("query", "")
        documents = kwargs.get("documents", [])
        return {"query": query, "documents": len(documents), "augmented": True}

    def cleanup(self) -> None:
        pass


class CodeInterpreterPlugin(PluginBase):
    metadata = PluginMetadata(
        name="code_interpreter",
        version="1.0.0",
        description="Execute and analyze code in sandboxed environment",
        author="CEE Team",
        dependencies=[],
    )

    def initialize(self) -> bool:
        return True

    def execute(self, **kwargs: Any) -> Any:
        code = kwargs.get("code", "")
        language = kwargs.get("language", "python")
        return {"code": code, "language": language, "output": "", "executed": True}

    def cleanup(self) -> None:
        pass


class FileProcessorPlugin(PluginBase):
    metadata = PluginMetadata(
        name="file_processor",
        version="1.0.0",
        description="Process and analyze files in multiple formats",
        author="CEE Team",
        dependencies=[],
    )

    def initialize(self) -> bool:
        return True

    def execute(self, **kwargs: Any) -> Any:
        filepath = kwargs.get("filepath", "")
        return {"filepath": filepath, "processed": True, "type": "auto"}

    def cleanup(self) -> None:
        pass


class TranslatorPlugin(PluginBase):
    metadata = PluginMetadata(
        name="translator",
        version="1.0.0",
        description="Multi-language translation with context awareness",
        author="CEE Team",
        dependencies=[],
    )

    def initialize(self) -> bool:
        return True

    def execute(self, **kwargs: Any) -> Any:
        text = kwargs.get("text", "")
        source = kwargs.get("source", "auto")
        target = kwargs.get("target", "en")
        return {"original": text, "translated": "", "source_lang": source, "target_lang": target}

    def cleanup(self) -> None:
        pass


class SentimentPlugin(PluginBase):
    metadata = PluginMetadata(
        name="sentiment",
        version="1.0.0",
        description="Analyze sentiment and emotion in text content",
        author="CEE Team",
        dependencies=[],
    )

    def initialize(self) -> bool:
        return True

    def execute(self, **kwargs: Any) -> Any:
        text = kwargs.get("text", "")
        return {"text": text, "sentiment": "neutral", "score": 0.5, "emotions": {}}

    def cleanup(self) -> None:
        pass


class SummarizerPlugin(PluginBase):
    metadata = PluginMetadata(
        name="summarizer",
        version="1.0.0",
        description="Generate concise summaries of long-form content",
        author="CEE Team",
        dependencies=[],
    )

    def initialize(self) -> bool:
        return True

    def execute(self, **kwargs: Any) -> Any:
        text = kwargs.get("text", "")
        max_length = kwargs.get("max_length", 200)
        return {"original_length": len(text), "summary": "", "max_length": max_length}

    def cleanup(self) -> None:
        pass


class CreativeSynthesisPlugin(PluginBase):
    metadata = PluginMetadata(
        name="creative_synthesis",
        version="1.0.0",
        description="Generate creative content by combining multiple knowledge sources",
        author="CEE Team",
        dependencies=["rag"],
    )

    def initialize(self) -> bool:
        return True

    def execute(self, **kwargs: Any) -> Any:
        topic = kwargs.get("topic", "")
        style = kwargs.get("style", "general")
        return {"topic": topic, "style": style, "generated": "", "sources_used": 0}

    def cleanup(self) -> None:
        pass


class BiasDetectorPlugin(PluginBase):
    metadata = PluginMetadata(
        name="bias_detector",
        version="1.0.0",
        description="Detect cognitive biases in text and arguments",
        author="CEE Team",
        dependencies=[],
    )

    def initialize(self) -> bool:
        return True

    def execute(self, **kwargs: Any) -> Any:
        text = kwargs.get("text", "")
        return {"text": text, "biases_detected": [], "confidence": 0.0}

    def cleanup(self) -> None:
        pass


class MemoryPlugin(PluginBase):
    metadata = PluginMetadata(
        name="memory",
        version="1.0.0",
        description="Persistent context memory for cross-session continuity",
        author="CEE Team",
        dependencies=[],
    )

    def initialize(self) -> bool:
        return True

    def execute(self, **kwargs: Any) -> Any:
        operation = kwargs.get("operation", "recall")
        key = kwargs.get("key", "")
        value = kwargs.get("value", None)
        return {"operation": operation, "key": key, "value": value, "status": "ok"}

    def cleanup(self) -> None:
        pass


_BUILTIN_PLUGINS: list[type[PluginBase]] = [
    WebSearchPlugin,
    RAGPlugin,
    CodeInterpreterPlugin,
    FileProcessorPlugin,
    TranslatorPlugin,
    SentimentPlugin,
    SummarizerPlugin,
    CreativeSynthesisPlugin,
    BiasDetectorPlugin,
    MemoryPlugin,
]
