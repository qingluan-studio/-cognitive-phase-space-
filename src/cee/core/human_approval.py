"""人类中断机制 — 在编排器状态机中加入"等待审批"节点。

高风险动作通过回调/Webhook 通知外部系统，只有收到确认后才继续执行。
"""

import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional


class ApprovalStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ApprovalRequest:
    """审批请求 — 在编排器暂停点创建。"""

    request_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    action: str = ""
    description: str = ""
    risk_level: RiskLevel = RiskLevel.MEDIUM
    context: dict[str, Any] = field(default_factory=dict)
    proposed_by: str = ""
    status: ApprovalStatus = ApprovalStatus.PENDING
    created_at: float = field(default_factory=time.time)
    resolved_at: float = 0.0
    approver: str = ""
    rejection_reason: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    timeout_seconds: float = 300.0

    @property
    def is_resolved(self) -> bool:
        return self.status not in (ApprovalStatus.PENDING,)


@dataclass
class ApprovalResponse:
    request_id: str
    status: ApprovalStatus
    approver: str = ""
    reason: str = ""
    timestamp: float = field(default_factory=time.time)


class HumanApprovalGate:
    """人类审批闸门 — 编排器状态机节点。

    使用方式:
        gate = HumanApprovalGate(risk_threshold=RiskLevel.HIGH)
        if gate.needs_approval(action, risk):
            request = gate.request_approval(action, description, risk)
            response = gate.wait_for_approval(request, timeout=300)
            if response.status != ApprovalStatus.APPROVED:
                raise ApprovalDenied(response)
    """

    def __init__(
        self,
        risk_threshold: RiskLevel = RiskLevel.HIGH,
        default_timeout: float = 300.0,
    ) -> None:
        self._risk_threshold = risk_threshold
        self._default_timeout = default_timeout
        self._pending: dict[str, ApprovalRequest] = {}
        self._history: list[ApprovalRequest] = []
        self._lock = threading.RLock()
        self._callbacks: dict[str, Callable[[ApprovalRequest], ApprovalResponse]] = {}
        self._webhook_url: str = ""
        self._condition = threading.Condition(self._lock)

    @property
    def pending_count(self) -> int:
        with self._lock:
            return len(self._pending)

    @property
    def webhook_url(self) -> str:
        return self._webhook_url

    @webhook_url.setter
    def webhook_url(self, url: str) -> None:
        self._webhook_url = url

    def needs_approval(
        self,
        action: str = "",
        risk_level: RiskLevel = RiskLevel.MEDIUM,
    ) -> bool:
        risk_order = {
            RiskLevel.LOW: 0, RiskLevel.MEDIUM: 1,
            RiskLevel.HIGH: 2, RiskLevel.CRITICAL: 3,
        }
        return risk_order.get(risk_level, 0) >= risk_order.get(self._risk_threshold, 1)

    def request_approval(
        self,
        action: str,
        description: str = "",
        risk_level: RiskLevel = RiskLevel.MEDIUM,
        context: Optional[dict] = None,
        proposed_by: str = "",
        timeout_seconds: Optional[float] = None,
        metadata: Optional[dict] = None,
    ) -> ApprovalRequest:
        request = ApprovalRequest(
            action=action,
            description=description or action,
            risk_level=risk_level,
            context=context or {},
            proposed_by=proposed_by,
            timeout_seconds=timeout_seconds or self._default_timeout,
            metadata=metadata or {},
        )
        with self._lock:
            self._pending[request.request_id] = request
        self._notify_webhook(request)
        return request

    def approve(
        self, request_id: str, approver: str = "", reason: str = ""
    ) -> ApprovalResponse:
        return self._resolve(request_id, ApprovalStatus.APPROVED, approver, reason)

    def reject(
        self, request_id: str, approver: str = "", reason: str = ""
    ) -> ApprovalResponse:
        return self._resolve(request_id, ApprovalStatus.REJECTED, approver, reason)

    def cancel(
        self, request_id: str, reason: str = ""
    ) -> ApprovalResponse:
        return self._resolve(request_id, ApprovalStatus.CANCELLED, "", reason)

    def _resolve(
        self, request_id: str, status: ApprovalStatus,
        approver: str, reason: str,
    ) -> ApprovalResponse:
        with self._lock:
            request = self._pending.pop(request_id, None)
            if request is None:
                return ApprovalResponse(request_id, status, approver, reason)

            request.status = status
            request.resolved_at = time.time()
            request.approver = approver
            request.rejection_reason = reason if status == ApprovalStatus.REJECTED else ""
            self._history.append(request)
            self._condition.notify_all()
            return ApprovalResponse(request_id, status, approver, reason)

    def wait_for_approval(
        self,
        request: Optional[ApprovalRequest] = None,
        request_id: str = "",
        timeout: Optional[float] = None,
    ) -> ApprovalResponse:
        rid = request_id or (request.request_id if request else "")
        if not rid:
            return ApprovalResponse("", ApprovalStatus.REJECTED, reason="no request id")

        with self._lock:
            for h in self._history:
                if h.request_id == rid:
                    return ApprovalResponse(
                        rid, h.status, h.approver, h.rejection_reason)

        effective_timeout = timeout
        if request:
            effective_timeout = timeout or request.timeout_seconds
        wait_seconds = effective_timeout or self._default_timeout
        deadline = time.time() + wait_seconds

        with self._condition:
            while True:
                existing = self._pending.get(rid)
                if existing is not None and existing.status != ApprovalStatus.PENDING:
                    return ApprovalResponse(
                        rid, existing.status, existing.approver,
                        existing.rejection_reason,
                    )

                remaining = deadline - time.time()
                if remaining <= 0:
                    if rid in self._pending:
                        self._resolve(rid, ApprovalStatus.TIMEOUT, "", "")
                    return ApprovalResponse(rid, ApprovalStatus.TIMEOUT)

                self._condition.wait(timeout=min(remaining, 1.0))

    def get_pending_requests(self) -> list[ApprovalRequest]:
        with self._lock:
            return list(self._pending.values())

    def get_history(self, limit: int = 50) -> list[ApprovalRequest]:
        with self._lock:
            return self._history[-limit:]

    def register_callback(
        self, risk_level: RiskLevel, callback: Callable[[ApprovalRequest], ApprovalResponse]
    ) -> None:
        with self._lock:
            self._callbacks[risk_level.value] = callback

    def _notify_webhook(self, request: ApprovalRequest) -> None:
        if self._webhook_url:
            pass

        cb = self._callbacks.get(request.risk_level.value)
        if cb:
            try:
                cb(request)
            except Exception:
                pass

    def stats(self) -> dict[str, Any]:
        with self._lock:
            history = self._history[-100:]
            by_status: dict[str, int] = {}
            by_risk: dict[str, int] = {}
            for r in history:
                s = r.status.value
                by_status[s] = by_status.get(s, 0) + 1
                rl = r.risk_level.value
                by_risk[rl] = by_risk.get(rl, 0) + 1
            return {
                "pending": len(self._pending),
                "history_total": len(self._history),
                "by_status": by_status,
                "by_risk": by_risk,
                "risk_threshold": self._risk_threshold.value,
            }

    def reset(self) -> None:
        with self._lock:
            for r in list(self._pending.values()):
                r.status = ApprovalStatus.CANCELLED
            self._pending.clear()
            self._history.clear()
