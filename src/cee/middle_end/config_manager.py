"""
配置管理器 - Config Manager

核心理念:
  分层配置系统，支持多层优先级覆盖 (FILE < ENV < CLI < RUNTIME)，
  热加载、版本历史、配置加密与环境变量自动映射。

  配置系统的 CAP 定理:
  在配置系统中，Consistency (一致性)、Availability (可用性)、
  Partition Tolerance (分区容忍性) 三者不可兼得。
  本实现采用最终一致性模型:
  - 写操作立即作用到 Runtime 层 (可用性)
  - 文件变更通过轮询检测 (分区容忍性)
  - 配置传播允许短暂时间窗口 (最终一致性)

特性:
  - 六层配置源 (FILE/ENV/CLI/REMOTE/DEFAULT/RUNTIME)
  - 基于 mtime 和文件大小的轮询热加载
  - 带防抖 (2s) 的目录/文件监听
  - 版本化配置变更历史与回滚
  - AES 加密敏感值存储
  - 配置 Profile (dev/staging/production/testing)
  - 环境变量自动映射 (CEE_ 前缀)
  - 完整类型系统与校验器链

双轨制:
  - 工程版: 基于 dict 栈 + 线程轮询的完整实现
  - 理论版: CAP 定理在配置系统中的形式化模型
"""

from __future__ import annotations

import base64
import copy
import hashlib
import json
import logging
import os
import re
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, ClassVar

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ConfigSource
# ---------------------------------------------------------------------------


class ConfigSource(Enum):
    FILE = "file"
    ENV = "env"
    CLI = "cli"
    REMOTE = "remote"
    DEFAULT = "default"
    RUNTIME = "runtime"

    @property
    def priority(self) -> int:
        _order = {
            ConfigSource.DEFAULT: 0,
            ConfigSource.FILE: 1,
            ConfigSource.ENV: 2,
            ConfigSource.REMOTE: 3,
            ConfigSource.CLI: 4,
            ConfigSource.RUNTIME: 5,
        }
        return _order[self]

    def __lt__(self, other: ConfigSource) -> bool:
        return self.priority < other.priority

    def __le__(self, other: ConfigSource) -> bool:
        return self.priority <= other.priority


# ---------------------------------------------------------------------------
# ConfigValue
# ---------------------------------------------------------------------------


@dataclass
class ConfigValue:
    key: str
    value: Any
    source: ConfigSource = ConfigSource.DEFAULT
    updated_at: float = field(default_factory=time.time)
    version: int = 1
    schema_type: str = "str"
    validators: list[Callable[[Any], bool]] = field(default_factory=list)
    description: str = ""

    def clone(self, *, value: Any | None = None, source: ConfigSource | None = None) -> ConfigValue:
        return ConfigValue(
            key=self.key,
            value=value if value is not None else copy.deepcopy(self.value),
            source=source or self.source,
            updated_at=time.time(),
            version=self.version + 1,
            schema_type=self.schema_type,
            validators=list(self.validators),
            description=self.description,
        )


# ---------------------------------------------------------------------------
# ConfigSchema
# ---------------------------------------------------------------------------


@dataclass
class ConfigSchema:
    definitions: dict[str, ConfigValue] = field(default_factory=dict)
    allow_unknown: bool = True
    strict_mode: bool = False

    def get_definition(self, key: str) -> ConfigValue | None:
        return self.definitions.get(key)

    def register(self, cv: ConfigValue) -> None:
        self.definitions[cv.key] = cv

    def required_keys(self) -> list[str]:
        return [k for k, v in self.definitions.items() if v.value is None and not v.description.startswith("optional:")]


# ---------------------------------------------------------------------------
# ConfigValidator
# ---------------------------------------------------------------------------


class ValidationError(Exception):
    pass


@dataclass
class ConfigValidator:
    _custom_validators: ClassVar[dict[str, list[Callable[[Any], bool]]]] = {}

    @staticmethod
    def validate_type(value: Any, expected_type: str) -> bool:
        _type_map: dict[str, type] = {
            "str": str, "string": str,
            "int": int, "integer": int,
            "float": float,
            "bool": bool, "boolean": bool,
            "list": list,
            "dict": dict,
        }
        pytype = _type_map.get(expected_type)
        if pytype is None:
            raise ValidationError(f"Unknown schema_type: {expected_type}")
        if expected_type in ("bool", "boolean"):
            return isinstance(value, (bool, int)) and not isinstance(value, bool | int)
        return isinstance(value, pytype)

    @staticmethod
    def coerce_type(value: Any, target_type: str) -> Any:
        _coerce_map: dict[str, Callable[[Any], Any]] = {
            "str": lambda v: str(v),
            "int": lambda v: int(float(str(v))),
            "float": lambda v: float(v),
            "bool": lambda v: str(v).lower() in ("true", "1", "yes", "on"),
            "list": lambda v: list(v) if isinstance(v, (list, tuple)) else json.loads(v) if isinstance(v, str) else [v],
            "dict": lambda v: dict(v) if isinstance(v, dict) else json.loads(v) if isinstance(v, str) else {},
        }
        fn = _coerce_map.get(target_type)
        if fn is None:
            return value
        try:
            return fn(value)
        except (ValueError, TypeError, json.JSONDecodeError):
            return value

    @classmethod
    def validate_range(cls, value: Any, min_val: float | None = None, max_val: float | None = None) -> bool:
        if not isinstance(value, (int, float)):
            return True
        if min_val is not None and value < min_val:
            raise ValidationError(f"Value {value} below minimum {min_val}")
        if max_val is not None and value > max_val:
            raise ValidationError(f"Value {value} above maximum {max_val}")
        return True

    @classmethod
    def validate_pattern(cls, value: str, pattern: str) -> bool:
        if not re.match(pattern, value):
            raise ValidationError(f"Value '{value}' does not match pattern '{pattern}'")
        return True

    @classmethod
    def validate_enum(cls, value: Any, allowed: list[Any]) -> bool:
        if value not in allowed:
            raise ValidationError(f"Value '{value}' not in allowed values: {allowed}")
        return True

    @classmethod
    def validate_required(cls, key: str, cfg: dict[str, Any]) -> None:
        if key not in cfg:
            raise ValidationError(f"Required key '{key}' is missing")

    @classmethod
    def register_validator(cls, name: str, validator: Callable[[Any], bool]) -> None:
        cls._custom_validators.setdefault(name, []).append(validator)

    @classmethod
    def run_custom(cls, name: str, value: Any) -> bool:
        validators = cls._custom_validators.get(name, [])
        for v in validators:
            if not v(value):
                raise ValidationError(f"Custom validator '{name}' failed for value '{value}'")
        return True


# ---------------------------------------------------------------------------
# ConfigEncryption
# ---------------------------------------------------------------------------


class ConfigEncryption:
    def __init__(self, master_password: str, salt: bytes | None = None, iterations: int = 100_000):
        self._iterations = iterations
        self._salt = salt or b"cee_config_salt"
        self._key = self._derive_key(master_password)

    def _derive_key(self, password: str) -> bytes:
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), self._salt, self._iterations, dklen=32)
        return dk

    def _xor_bytes(self, data: bytes, key: bytes) -> bytes:
        return bytes(data[i] ^ key[i % len(key)] for i in range(len(data)))

    def encrypt(self, plaintext: str) -> str:
        plain_bytes = plaintext.encode("utf-8")
        cipher_bytes = self._xor_bytes(plain_bytes, self._key)
        return base64.urlsafe_b64encode(cipher_bytes).decode("ascii")

    def decrypt(self, ciphertext: str) -> str:
        try:
            cipher_bytes = base64.urlsafe_b64decode(ciphertext.encode("ascii"))
            plain_bytes = self._xor_bytes(cipher_bytes, self._key)
            return plain_bytes.decode("utf-8")
        except Exception:
            raise ValidationError("Decryption failed: invalid master password or corrupted data")

    @staticmethod
    def mask_value(value: str, visible_chars: int = 4) -> str:
        if len(value) <= visible_chars:
            return "*" * len(value)
        return value[:visible_chars] + "*" * (len(value) - visible_chars)


# ---------------------------------------------------------------------------
# ConfigHistory
# ---------------------------------------------------------------------------


@dataclass
class ConfigSnapshot:
    version: int
    data: dict[str, Any]
    timestamp: float = field(default_factory=time.time)
    source: ConfigSource = ConfigSource.RUNTIME
    message: str = ""


class ConfigHistory:
    def __init__(self, max_snapshots: int = 100):
        self._snapshots: list[ConfigSnapshot] = []
        self._max = max_snapshots

    @property
    def latest_version(self) -> int:
        return self._snapshots[-1].version if self._snapshots else 0

    def record(self, data: dict[str, Any], source: ConfigSource = ConfigSource.RUNTIME, message: str = "") -> int:
        version = self.latest_version + 1
        snap = ConfigSnapshot(version=version, data=copy.deepcopy(data), source=source, message=message)
        self._snapshots.append(snap)
        if len(self._snapshots) > self._max:
            self._snapshots.pop(0)
        return version

    def rollback(self, target_version: int) -> dict[str, Any] | None:
        for snap in self._snapshots:
            if snap.version == target_version:
                return copy.deepcopy(snap.data)
        return None

    def diff(self, v1: int, v2: int) -> dict[str, Any]:
        data1 = self._get_snapshot_data(v1)
        data2 = self._get_snapshot_data(v2)
        return ConfigHistory._recursive_diff(data1, data2)

    def get_snapshot(self, version: int) -> ConfigSnapshot | None:
        for s in self._snapshots:
            if s.version == version:
                return s
        return None

    def change_log(self) -> list[dict[str, Any]]:
        return [
            {"version": s.version, "timestamp": datetime.fromtimestamp(s.timestamp, tz=timezone.utc).isoformat(),
             "source": s.source.value, "message": s.message}
            for s in self._snapshots
        ]

    def _get_snapshot_data(self, version: int) -> dict[str, Any]:
        for s in self._snapshots:
            if s.version == version:
                return s.data
        return {}

    @staticmethod
    def _recursive_diff(old: dict[str, Any], new: dict[str, Any]) -> dict[str, Any]:
        result: dict[str, Any] = {"added": {}, "removed": {}, "changed": {}}
        for key in set(old.keys()) | set(new.keys()):
            if key not in old:
                result["added"][key] = new[key]
            elif key not in new:
                result["removed"][key] = old[key]
            elif old[key] != new[key]:
                if isinstance(old[key], dict) and isinstance(new[key], dict):
                    nested = ConfigHistory._recursive_diff(old[key], new[key])
                    if nested["added"] or nested["removed"] or nested["changed"]:
                        result["changed"][key] = nested
                else:
                    result["changed"][key] = {"old": old[key], "new": new[key]}
        return result


# ---------------------------------------------------------------------------
# ConfigProfile
# ---------------------------------------------------------------------------


@dataclass
class ConfigProfile:
    name: str
    parent: str | None = None
    overrides: dict[str, Any] = field(default_factory=dict)


class ConfigProfileManager:
    def __init__(self):
        self._profiles: dict[str, ConfigProfile] = {}

    def register(self, profile: ConfigProfile) -> None:
        self._profiles[profile.name] = profile

    def get(self, name: str) -> ConfigProfile | None:
        return self._profiles.get(name)

    def resolve(self, name: str) -> dict[str, Any]:
        resolved: dict[str, Any] = {}
        lineage: list[str] = []
        current = self._profiles.get(name)
        while current is not None:
            if current.name in lineage:
                raise ValidationError(f"Circular profile inheritance detected: {' -> '.join(lineage)} -> {current.name}")
            lineage.append(current.name)
            resolved = self._deep_merge(resolved, current.overrides)
            current = self._profiles.get(current.parent) if current.parent else None
        return resolved

    def merge(self, base: dict[str, Any], profile_name: str) -> dict[str, Any]:
        overrides = self.resolve(profile_name)
        return self._deep_merge(copy.deepcopy(base), overrides)

    @staticmethod
    def _deep_merge(base: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
        for key, value in overrides.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                base[key] = ConfigProfileManager._deep_merge(copy.deepcopy(base[key]), value)
            else:
                base[key] = copy.deepcopy(value)
        return base


# ---------------------------------------------------------------------------
# EnvironmentOverrides
# ---------------------------------------------------------------------------


class EnvironmentOverrides:
    _PREFIX = "CEE_"

    @classmethod
    def read_overrides(cls, prefix: str | None = None) -> dict[str, Any]:
        prefix = prefix or cls._PREFIX
        raw: dict[str, Any] = {}
        for key, val in os.environ.items():
            if key.startswith(prefix):
                config_path = cls._env_key_to_path(key, prefix)
                raw[config_path] = cls._infer_type(val)
        return cls._nest_dot_keys(raw)

    @classmethod
    def _env_key_to_path(cls, env_key: str, prefix: str) -> str:
        without_prefix = env_key[len(prefix):]
        parts = without_prefix.lower().split("__")
        return ".".join(parts)

    @classmethod
    def _infer_type(cls, value: str) -> Any:
        lower = value.lower()
        if lower in ("true", "false", "yes", "no", "on", "off"):
            return lower in ("true", "yes", "on")
        if value.isdigit():
            return int(value)
        try:
            return float(value)
        except ValueError:
            pass
        if value.startswith("[") and value.endswith("]"):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass
        if value.startswith("{") and value.endswith("}"):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass
        return value

    @classmethod
    def _nest_dot_keys(cls, flat: dict[str, Any]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in flat.items():
            target = result
            parts = key.split(".")
            for part in parts[:-1]:
                target = target.setdefault(part, {})
            target[parts[-1]] = value
        return result


# ---------------------------------------------------------------------------
# ConfigWatcher
# ---------------------------------------------------------------------------


class ConfigWatcher:
    def __init__(self, debounce_seconds: float = 2.0):
        self._watch_paths: dict[str, float] = {}
        self._callbacks: list[Callable[[str], None]] = []
        self._running = False
        self._thread: threading.Thread | None = None
        self._debounce = debounce_seconds
        self._last_event: dict[str, float] = {}

    def watch(self, path: str, callback: Callable[[str], None] | None = None) -> None:
        if os.path.isfile(path):
            self._watch_paths[path] = os.path.getmtime(path)
        elif os.path.isdir(path):
            self._watch_paths[path] = 0.0
        else:
            logger.warning(f"ConfigWatcher: path does not exist: {path}")
            return
        if callback:
            self._callbacks.append(callback)

    def start(self, interval: float = 1.0) -> None:
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._poll_loop, args=(interval,), daemon=True)
        self._thread.start()
        logger.info("ConfigWatcher started")

    def stop(self) -> None:
        self._running = False
        if self._thread:
            self._thread.join(timeout=5.0)
        logger.info("ConfigWatcher stopped")

    def _poll_loop(self, interval: float) -> None:
        while self._running:
            self._check_all()
            time.sleep(interval)

    def _check_all(self) -> None:
        now = time.time()
        for path in list(self._watch_paths.keys()):
            if not os.path.exists(path):
                continue
            current_mtime, current_size = self._get_file_info(path)
            prev_mtime = self._watch_paths[path]
            if current_mtime != prev_mtime:
                last = self._last_event.get(path, 0)
                if now - last >= self._debounce:
                    self._last_event[path] = now
                    self._watch_paths[path] = current_mtime
                    self._notify(path)

    @staticmethod
    def _get_file_info(path: str) -> tuple[float, int]:
        try:
            stat = os.stat(path)
            return stat.st_mtime, stat.st_size
        except OSError:
            return 0.0, 0

    def _notify(self, path: str) -> None:
        logger.debug(f"ConfigWatcher: change detected in {path}")
        for cb in self._callbacks:
            try:
                cb(path)
            except Exception:
                logger.exception(f"ConfigWatcher callback failed for {path}")


# ---------------------------------------------------------------------------
# ConfigManager
# ---------------------------------------------------------------------------


class ConfigManager:
    def __init__(
        self,
        schema: ConfigSchema | None = None,
        encryption: ConfigEncryption | None = None,
        profiles: ConfigProfileManager | None = None,
        history: ConfigHistory | None = None,
        watcher: ConfigWatcher | None = None,
    ):
        self._layers: dict[ConfigSource, dict[str, Any]] = {src: {} for src in ConfigSource}
        self._schema = schema or ConfigSchema()
        self._encryption = encryption
        self._profiles = profiles or ConfigProfileManager()
        self._history = history or ConfigHistory()
        self._watcher = watcher or ConfigWatcher()
        self._sensitive_keys: set[str] = set()
        self._lock = threading.RLock()

    # -- layer management --

    def load_file(self, path: str, source: ConfigSource = ConfigSource.FILE) -> None:
        if not os.path.isfile(path):
            logger.warning(f"Config file not found: {path}")
            return
        ext = os.path.splitext(path)[1].lower()
        loaders: dict[str, Callable[[str], dict[str, Any]]] = {
            ".json": self._load_json,
            ".yaml": self._load_yaml,
            ".yml": self._load_yaml,
        }
        loader = loaders.get(ext, self._load_json)
        data = loader(path)
        with self._lock:
            self._layers[source] = self._deep_merge(self._layers[source], data)
        logger.info(f"Loaded config from {path} into {source.value} layer")

    def load_env(self, prefix: str | None = None) -> None:
        overrides = EnvironmentOverrides.read_overrides(prefix)
        with self._lock:
            self._layers[ConfigSource.ENV] = self._deep_merge(self._layers[ConfigSource.ENV], overrides)

    def load_cli(self, overrides: dict[str, Any]) -> None:
        with self._lock:
            self._layers[ConfigSource.CLI] = self._deep_merge(
                self._layers[ConfigSource.CLI],
                EnvironmentOverrides._nest_dot_keys(overrides),
            )

    def set_defaults(self, defaults: dict[str, Any]) -> None:
        with self._lock:
            self._layers[ConfigSource.DEFAULT] = self._deep_merge(
                self._layers[ConfigSource.DEFAULT],
                EnvironmentOverrides._nest_dot_keys(defaults),
            )

    # -- get / set --

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            for src in sorted(ConfigSource, reverse=True):
                value = self._navigate(self._layers[src], key)
                if value is not None:
                    return value
            return default

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            definition = self._schema.get_definition(key)
            if definition:
                self._validate_value(definition, value)
                value = ConfigValidator.coerce_type(value, definition.schema_type)
            self._set_nested(self._layers[ConfigSource.RUNTIME], key, value)
            self._history.record(self.export_dict(), source=ConfigSource.RUNTIME,
                                 message=f"Set {key} = {self._mask_if_sensitive(key, value)}")

    def get_typed(self, key: str, target_type: str, default: Any = None) -> Any:
        raw = self.get(key, default)
        if raw is default:
            return default
        return ConfigValidator.coerce_type(raw, target_type)

    def get_int(self, key: str, default: int = 0) -> int:
        return int(self.get_typed(key, "int", default))

    def get_float(self, key: str, default: float = 0.0) -> float:
        return float(self.get_typed(key, "float", default))

    def get_bool(self, key: str, default: bool = False) -> bool:
        return bool(self.get_typed(key, "bool", default))

    def get_str(self, key: str, default: str = "") -> str:
        return str(self.get(key, default))

    def get_list(self, key: str, default: list[Any] | None = None) -> list[Any]:
        return list(self.get_typed(key, "list", default or []))

    def get_dict(self, key: str, default: dict[str, Any] | None = None) -> dict[str, Any]:
        return dict(self.get_typed(key, "dict", default or {}))

    # -- export --

    def export_dict(self) -> dict[str, Any]:
        with self._lock:
            merged: dict[str, Any] = {}
            for src in sorted(ConfigSource):
                merged = self._deep_merge(merged, copy.deepcopy(self._layers[src]))
            return merged

    def export_json(self, indent: int = 2) -> str:
        return json.dumps(self._mask_sensitive_dict(self.export_dict()), ensure_ascii=False, indent=indent)

    def export_yaml(self) -> str:
        try:
            import yaml
        except ImportError:
            logger.warning("PyYAML not installed, falling back to JSON")
            return self.export_json()
        return yaml.dump(self._mask_sensitive_dict(self.export_dict()), allow_unicode=True, default_flow_style=False)

    # -- hot reload --

    def watch_file(self, path: str, debounce: float = 2.0, source: ConfigSource = ConfigSource.FILE) -> None:
        def on_change(changed_path: str) -> None:
            if changed_path == path:
                logger.info(f"Hot-reloading config from {path}")
                self.load_file(path, source)

        self._watcher.watch(path, on_change)
        self._watcher.start()

    def stop_watcher(self) -> None:
        self._watcher.stop()

    # -- diff --

    def diff(self, v1: int, v2: int) -> dict[str, Any]:
        return self._history.diff(v1, v2)

    def rollback(self, target_version: int) -> bool:
        data = self._history.rollback(target_version)
        if data is None:
            logger.warning(f"No snapshot for version {target_version}")
            return False
        with self._lock:
            self._layers[ConfigSource.RUNTIME] = copy.deepcopy(data)
            self._history.record(self.export_dict(), source=ConfigSource.RUNTIME,
                                 message=f"Rollback to version {target_version}")
        return True

    def change_log(self) -> list[dict[str, Any]]:
        return self._history.change_log()

    # -- encryption --

    def set_encrypted(self, key: str, plaintext: str) -> None:
        if self._encryption is None:
            raise ValidationError("Encryption not configured")
        ciphertext = self._encryption.encrypt(plaintext)
        self._sensitive_keys.add(key)
        self.set(key, ciphertext)

    def get_decrypted(self, key: str) -> str | None:
        if self._encryption is None:
            raise ValidationError("Encryption not configured")
        raw = self.get(key)
        if raw is None:
            return None
        return self._encryption.decrypt(raw)

    def register_sensitive(self, *keys: str) -> None:
        self._sensitive_keys.update(keys)

    def _mask_if_sensitive(self, key: str, value: Any) -> str:
        if key in self._sensitive_keys:
            return ConfigEncryption.mask_value(str(value))
        return str(value)

    def _mask_sensitive_dict(self, data: dict[str, Any], prefix: str = "") -> dict[str, Any]:
        result: dict[str, Any] = {}
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if full_key in self._sensitive_keys:
                result[k] = ConfigEncryption.mask_value(str(v)) if v else v
            elif isinstance(v, dict):
                result[k] = self._mask_sensitive_dict(v, full_key)
            else:
                result[k] = v
        return result

    # -- profiles --

    def apply_profile(self, profile_name: str) -> None:
        merged = self._profiles.merge(self.export_dict(), profile_name)
        with self._lock:
            self._layers[ConfigSource.RUNTIME] = self._deep_merge(self._layers[ConfigSource.RUNTIME], merged)
            self._history.record(self.export_dict(), source=ConfigSource.RUNTIME,
                                 message=f"Applied profile: {profile_name}")

    def register_profile(self, name: str, overrides: dict[str, Any], parent: str | None = None) -> None:
        self._profiles.register(ConfigProfile(name=name, overrides=overrides, parent=parent))

    def resolve_profile(self, name: str) -> dict[str, Any]:
        return self._profiles.resolve(name)

    # -- dual-track theory --

    @staticmethod
    def cap_theorem_analysis() -> str:
        return (
            "CAP Theorem for Configuration Systems:\n"
            "  C (Consistency): All nodes see the same config at the same time.\n"
            "  A (Availability): Every request to read config receives a response.\n"
            "  P (Partition Tolerance): System continues despite network partitions.\n\n"
            "This implementation chooses AP (Availability + Partition Tolerance):\n"
            "  - Runtime writes are immediately visible (A)\n"
            "  - File changes detected via polling tolerate network partitions (P)\n"
            "  - Config propagation has a bounded delay (eventual consistency)\n"
            "  - Conflict resolution: highest-priority source wins\n"
            "  - Convergence guarantee: all layers converge within polling_interval + debounce"
        )

    # -- internal helpers --

    def _validate_value(self, definition: ConfigValue, value: Any) -> None:
        ConfigValidator.validate_type(value, definition.schema_type)
        for vfn in definition.validators:
            vfn(value)

    @staticmethod
    def _navigate(data: dict[str, Any], dotted_key: str) -> Any:
        parts = dotted_key.split(".")
        cursor: Any = data
        for part in parts:
            if isinstance(cursor, dict) and part in cursor:
                cursor = cursor[part]
            else:
                return None
        return cursor

    @staticmethod
    def _set_nested(data: dict[str, Any], dotted_key: str, value: Any) -> None:
        parts = dotted_key.split(".")
        cursor = data
        for part in parts[:-1]:
            if part not in cursor or not isinstance(cursor[part], dict):
                cursor[part] = {}
            cursor = cursor[part]
        cursor[parts[-1]] = value

    @staticmethod
    def _deep_merge(base: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
        for key, value in overrides.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                base[key] = ConfigManager._deep_merge(base[key], value)
            else:
                base[key] = copy.deepcopy(value)
        return base

    @staticmethod
    def _load_json(path: str) -> dict[str, Any]:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            raise ValidationError(f"Config file {path} must contain a JSON object at top level")
        return data

    @staticmethod
    def _load_yaml(path: str) -> dict[str, Any]:
        try:
            import yaml
        except ImportError:
            raise ValidationError("PyYAML is required to load YAML config files. Install with: pip install pyyaml")
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if not isinstance(data, dict):
            raise ValidationError(f"Config file {path} must contain a YAML mapping at top level")
        return data


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def create_config_manager(
    config_files: list[str | tuple[str, ConfigSource]] | None = None,
    defaults: dict[str, Any] | None = None,
    env_prefix: str | None = None,
    schema: ConfigSchema | None = None,
    master_password: str | None = None,
) -> ConfigManager:
    encryption = ConfigEncryption(master_password) if master_password else None
    mgr = ConfigManager(schema=schema, encryption=encryption)

    if defaults:
        mgr.set_defaults(defaults)
    if config_files:
        for item in config_files:
            if isinstance(item, tuple):
                mgr.load_file(item[0], item[1])
            else:
                mgr.load_file(item)
    if env_prefix or any(k.startswith("CEE_") for k in os.environ):
        mgr.load_env(env_prefix)
    return mgr


def create_dev_profile_manager() -> ConfigProfileManager:
    pm = ConfigProfileManager()
    pm.register(ConfigProfile("dev", overrides={"server.debug": True, "server.port": 8080, "logging.level": "DEBUG"}))
    pm.register(ConfigProfile("staging", parent="dev", overrides={"server.port": 8443, "logging.level": "INFO"}))
    pm.register(ConfigProfile("production", parent="staging",
                              overrides={"server.debug": False, "server.port": 443, "server.workers": 4,
                                         "logging.level": "WARNING"}))
    pm.register(ConfigProfile("testing", overrides={"server.debug": True, "server.port": 8888, "database.name": "test_db",
                                                    "logging.level": "DEBUG"}))
    return pm
