"""CEE Plugin System — Dynamic extension framework with hooks and lifecycle management.

Provides hot-reloadable plugin architecture for extending CEE capabilities
without modifying core code.
"""

from __future__ import annotations

import importlib
import inspect
import json
import logging
import sys
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger(__name__)


class PluginState(Enum):
    UNLOADED = "unloaded"
    LOADING = "loading"
    LOADED = "loaded"
    INITIALIZING = "initializing"
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"


class PluginCategory(Enum):
    ENGINE = "engine"
    TOOL = "tool"
    PROCESSOR = "processor"
    CONNECTOR = "connector"
    VISUALIZER = "visualizer"
    TRANSFORMER = "transformer"
    FILTER = "filter"
    EXPORTER = "exporter"
    IMPORTER = "importer"
    MONITOR = "monitor"
    CUSTOM = "custom"


@dataclass
class PluginMetadata:
    """Metadata describing a plugin."""

    name: str
    version: str = "0.1.0"
    description: str = ""
    author: str = ""
    category: PluginCategory = PluginCategory.CUSTOM
    dependencies: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    min_cee_version: str = "1.0.0"
    entry_point: str = ""
    config_schema: dict[str, Any] = field(default_factory=dict)
    enabled: bool = True
    priority: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "author": self.author,
            "category": self.category.value,
            "dependencies": self.dependencies,
            "tags": self.tags,
            "min_cee_version": self.min_cee_version,
            "entry_point": self.entry_point,
            "enabled": self.enabled,
            "priority": self.priority,
        }


class Hooks:
    """System-wide hook registry for extension points.

    Hooks allow plugins to inject behavior at specific lifecycle points:
    - pre_engine_execute / post_engine_execute
    - pre_optimize / post_optimize
    - pre_governance_check / post_governance_check
    - on_startup / on_shutdown
    - on_agent_create / on_agent_destroy
    - on_task_start / on_task_complete / on_task_fail
    """

    def __init__(self) -> None:
        self._hooks: dict[str, list[tuple[str, Callable, int]]] = {}
        self._lock = threading.RLock()

    def register(self, hook_name: str, plugin_name: str,
                 callback: Callable, priority: int = 0) -> None:
        with self._lock:
            entry = (plugin_name, callback, priority)
            hooks = self._hooks.setdefault(hook_name, [])
            hooks.append(entry)
            hooks.sort(key=lambda x: -x[2])

    def unregister(self, hook_name: str, plugin_name: str) -> None:
        with self._lock:
            if hook_name in self._hooks:
                self._hooks[hook_name] = [
                    (p, c, pri) for p, c, pri in self._hooks[hook_name]
                    if p != plugin_name
                ]

    def trigger(self, hook_name: str, *args: Any, **kwargs: Any) -> list[Any]:
        results: list[Any] = []
        with self._lock:
            for plugin_name, callback, _ in self._hooks.get(hook_name, []):
                try:
                    result = callback(*args, **kwargs)
                    if result is not None:
                        results.append((plugin_name, result))
                except Exception as e:
                    logger.error(f"Hook {hook_name} error in plugin {plugin_name}: {e}")
        return results

    def trigger_chain(self, hook_name: str, initial_value: Any,
                      *args: Any, **kwargs: Any) -> Any:
        value = initial_value
        with self._lock:
            for plugin_name, callback, _ in self._hooks.get(hook_name, []):
                try:
                    value = callback(value, *args, **kwargs)
                except Exception as e:
                    logger.error(f"Hook chain {hook_name} error in {plugin_name}: {e}")
        return value

    def list_hooks(self) -> dict[str, list[str]]:
        with self._lock:
            return {
                name: [p for p, _, _ in entries]
                for name, entries in self._hooks.items()
            }

    def clear(self) -> None:
        with self._lock:
            self._hooks.clear()


class BasePlugin(ABC):
    """Abstract base class for all CEE plugins.

    Plugins have a well-defined lifecycle:
      on_load → on_enable → [on_pause ↔ on_resume] → on_disable → on_unload
    """

    def __init__(self) -> None:
        self.metadata: PluginMetadata | None = None
        self.state: PluginState = PluginState.UNLOADED
        self.config: dict[str, Any] = {}
        self._started_at: str = ""
        self._error_message: str = ""

    @property
    def status(self) -> dict[str, Any]:
        return {
            "name": self.metadata.name if self.metadata else "unnamed",
            "state": self.state.value,
            "started_at": self._started_at,
            "error": self._error_message,
        }

    @abstractmethod
    def get_metadata(self) -> PluginMetadata:
        ...

    def on_load(self, hooks: Hooks, config: dict[str, Any] | None = None) -> None:
        self.metadata = self.get_metadata()
        self.config = config or {}

    def on_enable(self) -> None:
        pass

    def on_disable(self) -> None:
        pass

    def on_pause(self) -> None:
        pass

    def on_resume(self) -> None:
        pass

    def on_unload(self) -> None:
        pass

    def get_config_schema(self) -> dict[str, Any]:
        return self.metadata.config_schema if self.metadata else {}

    def run_action(self, action: str, **params: Any) -> Any:
        method = getattr(self, f"action_{action}", None)
        if callable(method):
            return method(**params)
        return f"No such action: {action}"


class PluginManager:
    """Manages the full lifecycle of all CEE plugins.

    Handles discovery, loading, dependency resolution, enabling/disabling,
    hot-reloading, and status monitoring.
    """

    def __init__(self, plugin_dirs: list[str] | None = None,
                 hooks: Hooks | None = None) -> None:
        self._plugins: dict[str, BasePlugin] = {}
        self._plugin_dirs: list[str] = plugin_dirs or []
        self._hooks = hooks or Hooks()
        self._lock = threading.RLock()
        self._load_count: int = 0
        self._error_count: int = 0

    @property
    def status(self) -> dict[str, Any]:
        with self._lock:
            return {
                "plugin_count": len(self._plugins),
                "active_plugins": sum(1 for p in self._plugins.values() if p.state == PluginState.ACTIVE),
                "load_count": self._load_count,
                "error_count": self._error_count,
                "plugins": {name: p.status for name, p in self._plugins.items()},
                "hooks": self._hooks.list_hooks(),
            }

    def register_plugin(self, plugin: BasePlugin, config: dict[str, Any] | None = None) -> None:
        with self._lock:
            metadata = plugin.get_metadata()
            if metadata.name in self._plugins:
                raise ValueError(f"Plugin {metadata.name} already registered")
            plugin.on_load(self._hooks, config)
            self._plugins[metadata.name] = plugin

    def enable_plugin(self, name: str) -> bool:
        with self._lock:
            plugin = self._plugins.get(name)
            if not plugin:
                return False
            try:
                plugin.state = PluginState.ACTIVE
                plugin.on_enable()
                self._load_count += 1
                return True
            except Exception as e:
                plugin.state = PluginState.ERROR
                plugin._error_message = str(e)
                self._error_count += 1
                logger.error(f"Failed to enable plugin {name}: {e}")
                return False

    def disable_plugin(self, name: str) -> bool:
        with self._lock:
            plugin = self._plugins.get(name)
            if not plugin:
                return False
            try:
                plugin.on_disable()
                plugin.state = PluginState.STOPPED
                return True
            except Exception as e:
                plugin.state = PluginState.ERROR
                plugin._error_message = str(e)
                logger.error(f"Failed to disable plugin {name}: {e}")
                return False

    def unregister_plugin(self, name: str) -> bool:
        with self._lock:
            plugin = self._plugins.pop(name, None)
            if not plugin:
                return False
            self._hooks.unregister(name, name)
            try:
                plugin.on_unload()
            except Exception as e:
                logger.error(f"Failed to unload plugin {name}: {e}")
            return True

    def get_plugin(self, name: str) -> BasePlugin | None:
        return self._plugins.get(name)

    def list_plugins(self, category: PluginCategory | None = None) -> list[BasePlugin]:
        plugins = list(self._plugins.values())
        if category:
            plugins = [p for p in plugins if p.metadata and p.metadata.category == category]
        return plugins

    def register_hook(self, hook_name: str, plugin_name: str,
                      callback: Callable, priority: int = 0) -> None:
        self._hooks.register(hook_name, plugin_name, callback, priority)

    def trigger_hook(self, hook_name: str, *args: Any, **kwargs: Any) -> list[Any]:
        return self._hooks.trigger(hook_name, *args, **kwargs)

    def trigger_hook_chain(self, hook_name: str, initial: Any,
                           *args: Any, **kwargs: Any) -> Any:
        return self._hooks.trigger_chain(hook_name, initial, *args, **kwargs)

    def discover_plugins(self, search_paths: list[str] | None = None) -> int:
        paths = search_paths or self._plugin_dirs
        count = 0
        for sp in paths:
            p = Path(sp)
            if not p.exists():
                continue
            for item in p.iterdir():
                if item.is_dir() and (item / "__init__.py").exists():
                    try:
                        sys.path.insert(0, str(p))
                        module_name = item.name
                        mod = importlib.import_module(module_name)
                        for _, obj in inspect.getmembers(mod, inspect.isclass):
                            if (issubclass(obj, BasePlugin) and obj is not BasePlugin
                                    and not inspect.isabstract(obj)):
                                plugin = obj()
                                self.register_plugin(plugin)
                                count += 1
                        sys.path.pop(0)
                    except Exception as e:
                        logger.error(f"Failed to discover plugin from {item}: {e}")
        return count

    def enable_all(self) -> int:
        count = 0
        for name in list(self._plugins.keys()):
            if self.enable_plugin(name):
                count += 1
        return count

    def disable_all(self) -> None:
        for name in list(self._plugins.keys()):
            self.disable_plugin(name)

    def reset(self) -> None:
        self.disable_all()
        with self._lock:
            self._plugins.clear()
            self._hooks.clear()
            self._load_count = 0
            self._error_count = 0

    def export_manifest(self) -> list[dict[str, Any]]:
        return [p.get_metadata().to_dict() for p in self._plugins.values() if p.metadata]
