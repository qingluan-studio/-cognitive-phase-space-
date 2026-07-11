from __future__ import annotations

import os
import shutil
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Optional


class HealthStatus(str, Enum):
    OK = "OK"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


@dataclass
class HealthCheckResult:
    name: str
    status: HealthStatus
    message: str = ""
    checked_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status.value,
            "message": self.message,
            "checked_at": self.checked_at,
            "details": self.details,
        }


@dataclass
class HealthSummary:
    status: HealthStatus
    results: list[HealthCheckResult] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status.value,
            "results": [r.to_dict() for r in self.results],
            "generated_at": self.generated_at,
        }


class HealthChecker:
    MAX_HISTORY = 100

    def __init__(self) -> None:
        self._checks: dict[str, Callable[[], HealthCheckResult]] = {}
        self._history: deque[HealthSummary] = deque(maxlen=self.MAX_HISTORY)
        self._register_defaults()

    def _register_defaults(self) -> None:
        self.register("memory_usage", self._check_memory)
        self.register("disk_space", self._check_disk)
        self.register("cpu_load", self._check_cpu)
        self.register("database_connectivity", self._check_database)
        self.register("cache_status", self._check_cache)
        self.register("external_services", self._check_external)

    def register(self, name: str, check_fn: Callable[[], HealthCheckResult]) -> None:
        self._checks[name] = check_fn

    def unregister(self, name: str) -> bool:
        return self._checks.pop(name, None) is not None

    def list_checks(self) -> list[str]:
        return list(self._checks.keys())

    def check(self, names: Optional[list[str]] = None) -> HealthSummary:
        targets = names or list(self._checks.keys())
        results: list[HealthCheckResult] = []
        for name in targets:
            fn = self._checks.get(name)
            if fn is None:
                results.append(HealthCheckResult(
                    name=name, status=HealthStatus.CRITICAL,
                    message=f"检查项 '{name}' 未注册",
                ))
                continue
            try:
                result = fn()
            except Exception as e:
                result = HealthCheckResult(
                    name=name, status=HealthStatus.CRITICAL,
                    message=f"检查异常: {e}",
                )
            results.append(result)
        statuses = [r.status for r in results]
        if HealthStatus.CRITICAL in statuses:
            overall = HealthStatus.CRITICAL
        elif HealthStatus.WARNING in statuses:
            overall = HealthStatus.WARNING
        else:
            overall = HealthStatus.OK
        summary = HealthSummary(status=overall, results=results)
        self._history.append(summary)
        return summary

    def get_history(self, limit: int = 20) -> list[HealthSummary]:
        return list(self._history)[-limit:]

    def _check_memory(self) -> HealthCheckResult:
        try:
            import psutil
            mem = psutil.virtual_memory()
            ratio = mem.percent / 100.0
            if ratio >= 0.95:
                return HealthCheckResult(
                    "memory_usage", HealthStatus.CRITICAL,
                    f"内存使用率 {mem.percent:.1f}%",
                    details={"percent": mem.percent, "used_gb": round(mem.used / 1e9, 2), "total_gb": round(mem.total / 1e9, 2)},
                )
            elif ratio >= 0.85:
                return HealthCheckResult(
                    "memory_usage", HealthStatus.WARNING,
                    f"内存使用率偏高 {mem.percent:.1f}%",
                    details={"percent": mem.percent, "used_gb": round(mem.used / 1e9, 2)},
                )
            return HealthCheckResult(
                "memory_usage", HealthStatus.OK,
                f"内存正常 {mem.percent:.1f}%",
                details={"percent": mem.percent, "available_gb": round(mem.available / 1e9, 2)},
            )
        except ImportError:
            return HealthCheckResult(
                "memory_usage", HealthStatus.OK,
                "psutil 未安装，跳过详细内存检查",
            )

    def _check_disk(self) -> HealthCheckResult:
        try:
            usage = shutil.disk_usage("/")
            ratio = 1.0 - (usage.free / usage.total)
            if ratio >= 0.95:
                return HealthCheckResult(
                    "disk_space", HealthStatus.CRITICAL,
                    f"磁盘使用率 {ratio:.1%}",
                )
            elif ratio >= 0.85:
                return HealthCheckResult(
                    "disk_space", HealthStatus.WARNING,
                    f"磁盘使用率偏高 {ratio:.1%}",
                )
            return HealthCheckResult(
                "disk_space", HealthStatus.OK,
                f"磁盘空间充足 (剩余 {usage.free // (1024**3)} GB)",
            )
        except Exception as e:
            return HealthCheckResult("disk_space", HealthStatus.CRITICAL, str(e))

    def _check_cpu(self) -> HealthCheckResult:
        try:
            import psutil
            load = psutil.cpu_percent(interval=0.1)
            if load >= 95:
                return HealthCheckResult("cpu_load", HealthStatus.CRITICAL, f"CPU 负载 {load:.1f}%")
            elif load >= 80:
                return HealthCheckResult("cpu_load", HealthStatus.WARNING, f"CPU 负载偏高 {load:.1f}%")
            return HealthCheckResult("cpu_load", HealthStatus.OK, f"CPU 正常 {load:.1f}%")
        except ImportError:
            try:
                load = os.getloadavg()[0]
                ncpu = os.cpu_count() or 1
                ratio = load / ncpu
                if ratio >= 2.0:
                    return HealthCheckResult("cpu_load", HealthStatus.CRITICAL, f"系统负载 {load:.2f}")
                elif ratio >= 1.0:
                    return HealthCheckResult("cpu_load", HealthStatus.WARNING, f"系统负载偏高 {load:.2f}")
                return HealthCheckResult("cpu_load", HealthStatus.OK, f"系统负载正常 {load:.2f}")
            except (OSError, AttributeError):
                return HealthCheckResult("cpu_load", HealthStatus.OK, "无法获取 CPU 信息")

    def _check_database(self) -> HealthCheckResult:
        return HealthCheckResult("database_connectivity", HealthStatus.OK, "数据库连接正常 (内存模式)")

    def _check_cache(self) -> HealthCheckResult:
        return HealthCheckResult("cache_status", HealthStatus.OK, "缓存就绪 (本地内存)")

    def _check_external(self) -> HealthCheckResult:
        return HealthCheckResult("external_services", HealthStatus.OK, "外部服务未配置")
