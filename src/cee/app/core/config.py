"""
配置管理系统

支持 YAML/JSON/env 多来源配置加载、配置合并、热重载。

配置优先级（从低到高）：
    默认值 → JSON 文件 → YAML 文件 → 环境变量 → 命令行参数

使用示例:
    loader = ConfigLoader()
    loader.load_json("config.json")
    loader.load_yaml("config.yaml")
    loader.load_env("CEE_")
    timeout = loader.get("engine.search.timeout")
"""

from __future__ import annotations

import copy
import json
import os
import re
import threading
from pathlib import Path
from typing import Any, Callable, Optional

try:
    import yaml

    HAS_YAML = True
except ImportError:
    HAS_YAML = False


# ── 默认配置 ──────────────────────────────────────────────────────────

DEFAULT_CONFIG: dict[str, Any] = {
    "engine": {
        "search": {
            "timeout": 30,
            "max_results": 10,
            "embedding_model": "text-embedding-3-small",
            "similarity_threshold": 0.7,
            "rerank_enabled": True,
            "rerank_top_k": 5,
        },
        "generation": {
            "model": "gpt-4",
            "temperature": 0.7,
            "max_tokens": 4096,
            "top_p": 0.95,
            "frequency_penalty": 0.0,
            "presence_penalty": 0.0,
            "stream": True,
        },
        "invariant": {
            "itc_weight": 0.25,
            "scs_weight": 0.25,
            "iec_weight": 0.25,
            "pfft_weight": 0.25,
            "s_threshold": 0.9,
            "a_threshold": 0.8,
            "b_threshold": 0.7,
        },
    },
    "models": {
        "primary": {
            "provider": "openai",
            "model": "gpt-4",
            "api_base": "https://api.openai.com/v1",
            "timeout": 60,
            "max_retries": 3,
            "retry_delay": 1.0,
        },
        "fallback": {
            "provider": "ollama",
            "model": "llama3",
            "api_base": "http://localhost:11434",
            "timeout": 120,
            "max_retries": 2,
            "retry_delay": 2.0,
        },
    },
    "cache": {
        "memory": {
            "enabled": True,
            "max_size": 1000,
            "default_ttl": 300,
        },
        "disk": {
            "enabled": True,
            "path": "/tmp/cee_cache",
            "max_size_mb": 500,
            "cleanup_interval": 3600,
        },
    },
    "database": {
        "path": "/tmp/cee_data/cee.db",
        "pool_size": 5,
        "timeout": 30,
        "journal_mode": "WAL",
        "synchronous": "NORMAL",
        "cache_size": -64000,
    },
    "rate_limit": {
        "enabled": True,
        "default": {
            "requests_per_minute": 60,
            "burst_size": 10,
        },
        "per_ip": {
            "requests_per_minute": 100,
            "burst_size": 20,
        },
        "per_user": {
            "requests_per_minute": 300,
            "burst_size": 50,
        },
        "per_endpoint": {
            "evaluate": {"requests_per_minute": 30, "burst_size": 5},
            "optimize": {"requests_per_minute": 20, "burst_size": 3},
            "search": {"requests_per_minute": 60, "burst_size": 10},
        },
    },
    "logging": {
        "level": "INFO",
        "format": "colored",
        "json_output": False,
        "log_file": None,
        "max_file_size_mb": 10,
        "backup_count": 5,
        "sensitive_fields": [
            "password", "api_key", "token", "secret",
            "authorization", "credential",
        ],
    },
    "server": {
        "host": "0.0.0.0",
        "port": 8000,
        "workers": 4,
        "cors_origins": ["*"],
        "trusted_proxies": 1,
    },
    "session": {
        "max_sessions": 100,
        "session_timeout": 3600,
        "cleanup_interval": 600,
    },
    "knowledge": {
        "max_items": 10000,
        "enable_auto_index": True,
        "index_interval": 300,
    },
    "analytics": {
        "enabled": True,
        "batch_size": 50,
        "flush_interval": 30,
    },
}


class ConfigError(Exception):
    """配置相关错误"""

    pass


class ConfigValidationError(ConfigError):
    """配置校验错误"""

    pass


class ConfigLoader:
    """多来源配置加载器

    支持从 JSON/YAML 文件、环境变量、字典等多种来源加载配置，
    并支持嵌套键访问、配置合并、热重载。

    Attributes:
        _data: 合并后的配置数据
        _sources: 已加载的配置来源列表
        _required_keys: 必须存在的配置键列表
        _validators: 配置校验器列表
        _watchers: 配置变更监听器列表
    """

    def __init__(self, defaults: dict[str, Any] | None = None):
        self._data: dict[str, Any] = copy.deepcopy(defaults or DEFAULT_CONFIG)
        self._sources: list[str] = ["defaults"]
        self._required_keys: list[str] = []
        self._validators: list[Callable[[dict[str, Any]], None]] = []
        self._watchers: list[Callable[[str, Any, Any], None]] = []
        self._lock = threading.RLock()
        self._file_timestamps: dict[str, float] = {}

    # ── 加载方法 ──────────────────────────────────────────────────

    def load_dict(self, data: dict[str, Any], source: str = "dict") -> ConfigLoader:
        """从字典加载配置并合并"""
        with self._lock:
            self._deep_merge(self._data, copy.deepcopy(data))
            self._sources.append(source)
            return self

    def load_json(self, path: str | Path) -> ConfigLoader:
        """从 JSON 文件加载配置"""
        path = Path(path)
        if not path.exists():
            raise ConfigError(f"JSON 配置文件不存在: {path}")

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        with self._lock:
            self._deep_merge(self._data, data)
            self._sources.append(f"json:{path}")
            self._file_timestamps[str(path)] = path.stat().st_mtime

        return self

    def load_yaml(self, path: str | Path) -> ConfigLoader:
        """从 YAML 文件加载配置"""
        if not HAS_YAML:
            raise ConfigError("yaml 库未安装，无法加载 YAML 配置。pip install pyyaml")

        path = Path(path)
        if not path.exists():
            raise ConfigError(f"YAML 配置文件不存在: {path}")

        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        if data is None:
            data = {}

        with self._lock:
            self._deep_merge(self._data, data)
            self._sources.append(f"yaml:{path}")
            self._file_timestamps[str(path)] = path.stat().st_mtime

        return self

    def load_env(self, prefix: str = "CEE_") -> ConfigLoader:
        """从环境变量加载配置

        环境变量命名规则: {PREFIX}{SECTION}__{KEY}
        例如: CEE_ENGINE__SEARCH__TIMEOUT=60

        支持的类型转换:
            - 纯数字 → int
            - 数字.数字 → float
            - true/false → bool
            - null/none → None
            - JSON 字符串（以 [ 或 { 开头）→ 解析为对象
        """
        env_data: dict[str, Any] = {}

        for key, value in os.environ.items():
            if not key.startswith(prefix):
                continue

            config_key = key[len(prefix):].lower()
            parts = [p for p in config_key.split("__") if p]

            if not parts:
                continue

            parsed_value = self._parse_env_value(value)
            current = env_data
            for part in parts[:-1]:
                current = current.setdefault(part, {})
            current[parts[-1]] = parsed_value

        with self._lock:
            if env_data:
                self._deep_merge(self._data, env_data)
                self._sources.append(f"env:{prefix}*")

        return self

    def load_cli(self, args: dict[str, Any]) -> ConfigLoader:
        """从命令行参数加载配置"""
        if args:
            with self._lock:
                self._deep_merge(self._data, copy.deepcopy(args))
                self._sources.append("cli")
        return self

    # ── 访问方法 ──────────────────────────────────────────────────

    def get(self, key: str, default: Any = None) -> Any:
        """获取配置值，支持嵌套键访问

        Args:
            key: 配置键，支持点号分隔的嵌套键，如 "engine.search.timeout"
            default: 默认值

        Returns:
            配置值，如果不存在则返回 default
        """
        with self._lock:
            return self._get_nested(self._data, key, default)

    def set(self, key: str, value: Any) -> None:
        """设置配置值，支持嵌套键

        Args:
            key: 配置键，支持点号分隔
            value: 新值
        """
        with self._lock:
            old_value = self.get(key)
            self._set_nested(self._data, key, value)
            self._notify_watchers(key, old_value, value)

    def get_all(self) -> dict[str, Any]:
        """获取完整配置的深拷贝"""
        with self._lock:
            return copy.deepcopy(self._data)

    def get_section(self, section: str) -> dict[str, Any]:
        """获取配置的某个 section"""
        result = self.get(section)
        if result is None:
            return {}
        if not isinstance(result, dict):
            raise ConfigError(f"配置键 '{section}' 不是字典类型")
        return copy.deepcopy(result)

    # ── 校验方法 ──────────────────────────────────────────────────

    def require_keys(self, *keys: str) -> ConfigLoader:
        """注册必须存在的配置键"""
        self._required_keys.extend(keys)
        return self

    def add_validator(self, validator: Callable[[dict[str, Any]], None]) -> ConfigLoader:
        """添加配置校验器"""
        self._validators.append(validator)
        return self

    def validate(self) -> list[str]:
        """执行配置校验，返回所有错误信息"""
        errors: list[str] = []

        with self._lock:
            for key in self._required_keys:
                if self.get(key) is None:
                    errors.append(f"必需的配置键 '{key}' 缺失")

            for validator in self._validators:
                try:
                    validator(self._data)
                except ConfigValidationError as e:
                    errors.append(str(e))
                except Exception as e:
                    errors.append(f"校验器执行异常: {e}")

        return errors

    def validate_or_raise(self) -> None:
        """校验配置，有错误时抛出异常"""
        errors = self.validate()
        if errors:
            raise ConfigValidationError("\n".join(errors))

    # ── 导出方法 ──────────────────────────────────────────────────

    def export_json(self, path: str | Path, indent: int = 2) -> None:
        """导出配置为 JSON 文件"""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self._data, f, ensure_ascii=False, indent=indent)

    def export_yaml(self, path: str | Path) -> None:
        """导出配置为 YAML 文件"""
        if not HAS_YAML:
            raise ConfigError("yaml 库未安装。pip install pyyaml")
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            yaml.dump(self._data, f, allow_unicode=True, default_flow_style=False)

    def export_env(self, prefix: str = "CEE_") -> str:
        """导出配置为环境变量格式的字符串"""
        lines: list[str] = []

        def _flatten(data: dict[str, Any], parents: list[str]) -> None:
            for k, v in data.items():
                key_parts = parents + [k.upper()]
                if isinstance(v, dict):
                    _flatten(v, key_parts)
                else:
                    env_key = prefix + "__".join(key_parts)
                    lines.append(f"{env_key}={v}")

        with self._lock:
            _flatten(self._data, [])

        return "\n".join(lines)

    # ── 热重载方法 ──────────────────────────────────────────────────

    def watch(self, callback: Callable[[str, Any, Any], None]) -> ConfigLoader:
        """注册配置变更监听器

        Args:
            callback: 回调函数，参数为 (key, old_value, new_value)
        """
        self._watchers.append(callback)
        return self

    def reload(self) -> list[str]:
        """重新加载所有文件来源的配置

        检查所有 JSON/YAML 文件是否变更，如有变更则重新加载。
        """
        reloaded: list[str] = []

        with self._lock:
            for source in self._sources:
                if source.startswith("json:") or source.startswith("yaml:"):
                    file_path = source.split(":", 1)[1]
                    path = Path(file_path)
                    if not path.exists():
                        continue

                    current_mtime = path.stat().st_mtime
                    if self._file_timestamps.get(file_path) == current_mtime:
                        continue

                    try:
                        if source.startswith("json:"):
                            self.load_json(path)
                        else:
                            self.load_yaml(path)
                        self._file_timestamps[file_path] = current_mtime
                        reloaded.append(file_path)
                    except Exception:
                        continue

        return reloaded

    # ── 工具方法 ──────────────────────────────────────────────────

    @property
    def sources(self) -> list[str]:
        """获取已加载的配置来源列表"""
        return list(self._sources)

    def __repr__(self) -> str:
        return f"<ConfigLoader sources={self._sources}>"

    def __contains__(self, key: str) -> bool:
        return self.get(key) is not None

    # ── 私有方法 ──────────────────────────────────────────────────

    @staticmethod
    def _get_nested(data: dict[str, Any], key: str, default: Any = None) -> Any:
        parts = key.split(".")
        current: Any = data
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
                if current is None:
                    return default
            else:
                return default
        return current

    @staticmethod
    def _set_nested(data: dict[str, Any], key: str, value: Any) -> None:
        parts = key.split(".")
        current = data
        for part in parts[:-1]:
            if part not in current or not isinstance(current[part], dict):
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value

    @staticmethod
    def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> None:
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                ConfigLoader._deep_merge(base[key], value)
            else:
                base[key] = copy.deepcopy(value)

    @staticmethod
    def _parse_env_value(value: str) -> Any:
        if value.isdigit():
            return int(value)

        if re.match(r"^-?\d+\.\d+$", value):
            return float(value)

        lower = value.lower()
        if lower in ("true", "yes", "on"):
            return True
        if lower in ("false", "no", "off"):
            return False
        if lower in ("null", "none", "nil"):
            return None

        if (value.startswith("[") and value.endswith("]")) or (
            value.startswith("{") and value.endswith("}")
        ):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass

        return value

    def _notify_watchers(self, key: str, old_value: Any, new_value: Any) -> None:
        for watcher in self._watchers:
            try:
                watcher(key, old_value, new_value)
            except Exception:
                pass


# ── 便捷函数 ──────────────────────────────────────────────────────────


def create_default_loader() -> ConfigLoader:
    """创建预配置的 ConfigLoader

    自动加载默认配置并设置常见必需键和校验器。
    """
    loader = ConfigLoader()

    loader.require_keys(
        "server.host",
        "server.port",
        "engine.search.timeout",
        "engine.generation.model",
    )

    def _validate_port(config: dict[str, Any]) -> None:
        port = config.get("server", {}).get("port", 0)
        if not isinstance(port, int) or port < 1 or port > 65535:
            raise ConfigValidationError(f"server.port 无效: {port}，应为 1-65535 之间的整数")

    def _validate_engine(config: dict[str, Any]) -> None:
        weights = config.get("engine", {}).get("invariant", {})
        total = (
            weights.get("itc_weight", 0)
            + weights.get("scs_weight", 0)
            + weights.get("iec_weight", 0)
            + weights.get("pfft_weight", 0)
        )
        if abs(total - 1.0) > 1e-9:
            raise ConfigValidationError(
                f"engine.invariant 权重之和不为 1.0: {total}"
            )

    loader.add_validator(_validate_port)
    loader.add_validator(_validate_engine)

    return loader


# ── 单例 ──────────────────────────────────────────────────────────────

_config_loader: ConfigLoader | None = None
_config_lock = threading.Lock()


def get_config_loader() -> ConfigLoader:
    """获取全局单例 ConfigLoader"""
    global _config_loader
    if _config_loader is None:
        with _config_lock:
            if _config_loader is None:
                _config_loader = create_default_loader()
    return _config_loader


def reset_config_loader() -> None:
    """重置全局 ConfigLoader（主要用于测试）"""
    global _config_loader
    with _config_lock:
        _config_loader = None
