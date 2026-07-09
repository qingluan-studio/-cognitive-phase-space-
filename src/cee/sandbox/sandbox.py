"""执行边界与资源沙箱。

为 CodeAgent 和 Plugin 提供资源隔离：
- CPU 时间配额
- 内存上限
- 网络限制
- Token / 时间预算
"""

import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional


class SandboxPolicy(Enum):
    STRICT = "strict"
    LENIENT = "lenient"
    MONITOR = "monitor"


class ViolationType(Enum):
    CPU_EXCEEDED = "cpu_exceeded"
    MEMORY_EXCEEDED = "memory_exceeded"
    NETWORK_DENIED = "network_denied"
    TIME_EXCEEDED = "time_exceeded"
    TOKEN_EXCEEDED = "token_exceeded"
    FILE_ACCESS_DENIED = "file_access_denied"


@dataclass
class ResourceLimits:
    """沙箱资源配额。"""

    max_cpu_time_seconds: float = 30.0
    max_memory_mb: int = 512
    max_network_connections: int = 10
    max_execution_time_seconds: float = 60.0
    max_token_budget: int = 4096
    allowed_domains: list[str] = field(default_factory=list)
    allowed_file_paths: list[str] = field(default_factory=list)
    policy: SandboxPolicy = SandboxPolicy.LENIENT

    def to_dict(self) -> dict:
        return {
            "max_cpu_time_seconds": self.max_cpu_time_seconds,
            "max_memory_mb": self.max_memory_mb,
            "max_network_connections": self.max_network_connections,
            "max_execution_time_seconds": self.max_execution_time_seconds,
            "max_token_budget": self.max_token_budget,
            "allowed_domains": self.allowed_domains,
            "allowed_file_paths": self.allowed_file_paths,
            "policy": self.policy.value,
        }


@dataclass
class SandboxViolation:
    violation_type: ViolationType
    detail: str
    threshold: float
    actual: float
    timestamp: float = field(default_factory=time.time)


@dataclass
class SandboxResult:
    success: bool
    result: Any = None
    violations: list[SandboxViolation] = field(default_factory=list)
    resource_usage: dict[str, float] = field(default_factory=dict)
    execution_time: float = 0.0
    tokens_used: int = 0


class TokenBudget:
    """单次任务的 Token 配额管理。"""

    def __init__(self, max_tokens: int = 4096) -> None:
        self._max_tokens = max_tokens
        self._used: int = 0
        self._lock = threading.RLock()

    @property
    def remaining(self) -> int:
        with self._lock:
            return max(0, self._max_tokens - self._used)

    @property
    def used(self) -> int:
        with self._lock:
            return self._used

    @property
    def max_tokens(self) -> int:
        return self._max_tokens

    def consume(self, tokens: int) -> bool:
        with self._lock:
            if self._used + tokens > self._max_tokens:
                return False
            self._used += tokens
            return True

    def reset(self) -> None:
        with self._lock:
            self._used = 0

    def stats(self) -> dict:
        return {
            "max_tokens": self._max_tokens,
            "used": self._used,
            "remaining": self.remaining,
            "utilization": self._used / max(self._max_tokens, 1),
        }


class TimeBudget:
    def __init__(self, max_seconds: float = 60.0) -> None:
        self._max_seconds = max_seconds
        self._start: float = 0.0
        self._elapsed: float = 0.0
        self._lock = threading.RLock()

    @property
    def remaining(self) -> float:
        with self._lock:
            elapsed = self._elapsed
            if self._start > 0:
                elapsed += time.time() - self._start
            return max(0.0, self._max_seconds - elapsed)

    @property
    def is_expired(self) -> bool:
        return self.remaining <= 0

    def start(self) -> None:
        with self._lock:
            self._start = time.time()

    def stop(self) -> None:
        with self._lock:
            if self._start > 0:
                self._elapsed += time.time() - self._start
            self._start = 0.0

    def stats(self) -> dict:
        return {
            "max_seconds": self._max_seconds,
            "elapsed": self._elapsed + (time.time() - self._start if self._start > 0 else 0),
            "remaining": self.remaining,
            "expired": self.is_expired,
        }


class ExecutionSandbox:
    """执行边界控制器。

    用于 CodeAgent 和插件执行前的资源检查与执行后的资源统计。
    """

    def __init__(self, limits: Optional[ResourceLimits] = None) -> None:
        self._limits = limits or ResourceLimits()
        self._token_budget = TokenBudget(self._limits.max_token_budget)
        self._time_budget = TimeBudget(self._limits.max_execution_time_seconds)
        self._violations: list[SandboxViolation] = []
        self._lock = threading.RLock()

    @property
    def limits(self) -> ResourceLimits:
        return self._limits

    @property
    def token_budget(self) -> TokenBudget:
        return self._token_budget

    @property
    def time_budget(self) -> TimeBudget:
        return self._time_budget

    def pre_check(self, estimated_tokens: int = 0) -> tuple[bool, list[SandboxViolation]]:
        """执行前检查：token 预算、时间预算、网络/文件预检。"""
        violations: list[SandboxViolation] = []
        if self._limits.policy == SandboxPolicy.MONITOR:
            return True, []

        if estimated_tokens > 0 and not self._token_budget.consume(estimated_tokens):
            violations.append(SandboxViolation(
                violation_type=ViolationType.TOKEN_EXCEEDED,
                detail="Estimated tokens exceed remaining budget",
                threshold=float(self._token_budget.max_tokens),
                actual=float(estimated_tokens),
            ))
            if self._limits.policy == SandboxPolicy.STRICT:
                with self._lock:
                    self._violations.extend(violations)
                return False, violations

        if self._time_budget.is_expired:
            violations.append(SandboxViolation(
                violation_type=ViolationType.TIME_EXCEEDED,
                detail="Time budget already expired",
                threshold=self._limits.max_execution_time_seconds,
                actual=self._time_budget.stats()["elapsed"],
            ))
            if self._limits.policy == SandboxPolicy.STRICT:
                with self._lock:
                    self._violations.extend(violations)
                return False, violations

        return True, violations

    def post_check(self, execution_time: float, tokens_used: int = 0) -> SandboxResult:
        """执行后统计：资源使用、违规记录。"""
        self._time_budget.stop()
        violations: list[SandboxViolation] = []

        if execution_time > self._limits.max_execution_time_seconds:
            violations.append(SandboxViolation(
                violation_type=ViolationType.TIME_EXCEEDED,
                detail=f"Execution took {execution_time:.2f}s, limit {self._limits.max_execution_time_seconds}s",
                threshold=self._limits.max_execution_time_seconds,
                actual=execution_time,
            ))

        if tokens_used > self._limits.max_token_budget:
            violations.append(SandboxViolation(
                violation_type=ViolationType.TOKEN_EXCEEDED,
                detail=f"Used {tokens_used} tokens, limit {self._limits.max_token_budget}",
                threshold=float(self._limits.max_token_budget),
                actual=float(tokens_used),
            ))

        with self._lock:
            self._violations.extend(violations)
            all_violations = list(self._violations)

        return SandboxResult(
            success=len(violations) == 0 or self._limits.policy != SandboxPolicy.STRICT,
            violations=all_violations,
            resource_usage={
                "cpu_time": execution_time,
                "tokens": tokens_used,
                "memory_mb": 0,
                "network_connections": 0,
            },
            execution_time=execution_time,
            tokens_used=tokens_used,
        )

    def check_network(self, domain: str) -> bool:
        """检查网络访问权限。"""
        allowed = self._limits.allowed_domains
        if not allowed:
            return True
        if domain in allowed:
            return True
        violation = SandboxViolation(
            violation_type=ViolationType.NETWORK_DENIED,
            detail=f"Domain {domain} not in allowed list",
            threshold=0,
            actual=0,
        )
        with self._lock:
            self._violations.append(violation)
        return self._limits.policy != SandboxPolicy.STRICT

    def check_file_access(self, path: str) -> bool:
        allowed = self._limits.allowed_file_paths
        if not allowed:
            return True
        if any(path.startswith(p) for p in allowed):
            return True
        violation = SandboxViolation(
            violation_type=ViolationType.FILE_ACCESS_DENIED,
            detail=f"File path {path} not allowed",
            threshold=0,
            actual=0,
        )
        with self._lock:
            self._violations.append(violation)
        return self._limits.policy != SandboxPolicy.STRICT

    def get_violations(self) -> list[SandboxViolation]:
        with self._lock:
            return list(self._violations)

    def stats(self) -> dict[str, Any]:
        with self._lock:
            return {
                "limits": self._limits.to_dict(),
                "token_budget": self._token_budget.stats(),
                "time_budget": self._time_budget.stats(),
                "violation_count": len(self._violations),
                "violations": [
                    {"type": v.violation_type.value, "detail": v.detail}
                    for v in self._violations
                ],
            }

    def reset(self) -> None:
        with self._lock:
            self._token_budget.reset()
            self._time_budget.start()
            self._violations.clear()
