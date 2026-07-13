"""
三角形拓扑引擎 - Triangle Topology Engine

核心理念:
  前端 ↔ 中端 ↔ 后端 不是一条线，而是一个三角形。

  顶点就是三个端，边是数据流通道。
  内角 = 权重分配 (前端:中端:后端的算力/存储/带宽分配)
  外环 = 防护盾 (防火墙/认证/审计)
  内核 = 锁 (核心知识产权、闭源逻辑、安全密钥)

  三角形可变形:
  - Triangle: 标准三角 (稳定态, 1:1:1)
  - Parallel Lines: 高并发态 (前端+后端水平扩展, 中端瘦身)
  - Line Segment: 流水线态 (数据单向轻量传递)

双轨制:
  - 工程版: 几何变换 + 权重分配矩阵
  - 理论版: 黎曼流形上的信息测地线 + 微分几何

顶点角色:
  FRONT: 输入输出, 用户界面, 渲染层
  MIDDLE: 所有智能逻辑, 认知引擎, 记忆, 防御
  BACK: 持久化存储, 外部 API 调用, 数据湖
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class AxisRole(Enum):
    FRONT = "front"
    MIDDLE = "middle"
    BACK = "back"


class DeformationMode(Enum):
    TRIANGLE = "triangle"
    PARALLEL = "parallel"
    SEGMENT = "segment"


@dataclass
class TriangleVertex:
    """三角形顶点 - 代表前端/中端/后端"""

    role: AxisRole
    name: str
    weight: float = 1.0
    load: float = 0.0
    capacity: float = 100.0
    latency_ms: float = 0.0
    error_rate: float = 0.0
    health_score: float = 1.0
    metadata: dict[str, Any] = field(default_factory=dict)
    last_heartbeat: float = field(default_factory=time.time)

    @property
    def is_alive(self) -> bool:
        return (time.time() - self.last_heartbeat) < 30.0

    @property
    def saturation(self) -> float:
        return self.load / max(1.0, self.capacity)

    def heartbeat(self) -> None:
        self.last_heartbeat = time.time()

    def compute_health(self) -> float:
        alive_score = 1.0 if self.is_alive else 0.0
        sat_penalty = max(0.0, self.saturation - 0.8) * 0.5
        error_penalty = self.error_rate * 0.5
        self.health_score = max(0.0, alive_score - sat_penalty - error_penalty)
        return self.health_score


@dataclass
class OuterShield:
    """外环防护盾

    包围三角形的防护层:
    - 认证/授权
    - 请求限流
    - 输入清洗
    - DDoS 防御
    - 数据加密
    """

    shield_id: str = "default"
    auth_enabled: bool = True
    rate_limit: int = 1000
    rate_window_s: float = 60.0
    max_payload_bytes: int = 10 * 1024 * 1024
    blocked_ips: set[str] = field(default_factory=set)
    request_count: int = 0
    blocked_count: int = 0
    last_check: float = field(default_factory=time.time)

    def check_rate(self) -> bool:
        now = time.time()
        if now - self.last_check > self.rate_window_s:
            self.request_count = 0
            self.last_check = now
        self.request_count += 1
        return self.request_count <= self.rate_limit

    def is_blocked(self, ip: str) -> bool:
        return ip in self.blocked_ips

    def block(self, ip: str) -> None:
        self.blocked_ips.add(ip)
        self.blocked_count += 1

    def unblock(self, ip: str) -> None:
        self.blocked_ips.discard(ip)


@dataclass
class KernelLock:
    """内核锁 - 保护核心知识产权

    锁住的是:
    - 核心算法参数
    - 私有训练数据
    - 安全密钥
    - 闭源逻辑

    锁定级别:
    - SEALED: 完全封闭，外部不可见
    - GUARDED: 有审计日志的访问
    - OPEN: 开源部分
    """

    class LockLevel(Enum):
        SEALED = "sealed"
        GUARDED = "guarded"
        OPEN = "open"

    core_assets: dict[str, LockLevel] = field(default_factory=dict)
    access_log: list[dict[str, Any]] = field(default_factory=list)
    tamper_attempts: int = 0
    integrity_hash: str = ""

    def register_asset(self, name: str, level: LockLevel) -> None:
        self.core_assets[name] = level

    def check_access(self, asset_name: str, level: LockLevel) -> bool:
        cls = KernelLock.LockLevel
        required = self.core_assets.get(asset_name, cls.SEALED)
        level_order = {
            cls.OPEN: 0,
            cls.GUARDED: 1,
            cls.SEALED: 2,
        }
        granted = level_order.get(level, 0) <= level_order.get(required, 2)
        self.access_log.append({
            "asset": asset_name,
            "requested_level": level.value,
            "required_level": required.value,
            "granted": granted,
            "time": time.time(),
        })
        if not granted:
            self.tamper_attempts += 1
        return granted


@dataclass
class TopologyDeformation:
    """拓扑变形记录 - 三角形形态变化的历史"""

    from_mode: DeformationMode
    to_mode: DeformationMode
    timestamp: float = field(default_factory=time.time)
    trigger: str = ""
    vertex_weights: dict[str, float] = field(default_factory=dict)
    transition_ms: float = 0.0


class TriangleTopologyEngine:
    """三角形拓扑引擎 - 三端结构的管理与变形

    稳定态 (Triangle):
            Front
            /    \
           /      \
        Mid ----- Back

    高并发态 (Parallel Lines):
        Front[1] --- Back[1]
        Front[2] --- Back[2]
        Front[n] --- Back[n]
            (Mid 瘦身, 分发协调)

    流水线态 (Line Segment):
        Front ---> Mid ---> Back
        (单向流水, 无关闭环)
    """

    def __init__(self) -> None:
        self._vertices: dict[AxisRole, TriangleVertex] = {
            AxisRole.FRONT: TriangleVertex(role=AxisRole.FRONT, name="Frontend"),
            AxisRole.MIDDLE: TriangleVertex(role=AxisRole.MIDDLE, name="Middle-End"),
            AxisRole.BACK: TriangleVertex(role=AxisRole.BACK, name="Backend"),
        }
        self.shield = OuterShield()
        self.kernel = KernelLock()
        self.current_mode: DeformationMode = DeformationMode.TRIANGLE
        self._deformation_history: list[TopologyDeformation] = []
        self._lock = threading.RLock()
        self._stats: dict[str, Any] = {
            "deformations": 0,
            "shield_blocks": 0,
            "kernel_tampers": 0,
            "vertex_crashes": 0,
        }

    @property
    def front(self) -> TriangleVertex:
        return self._vertices[AxisRole.FRONT]

    @property
    def middle(self) -> TriangleVertex:
        return self._vertices[AxisRole.MIDDLE]

    @property
    def back(self) -> TriangleVertex:
        return self._vertices[AxisRole.BACK]

    def set_weights(self, front_w: float, middle_w: float, back_w: float) -> None:
        total = front_w + middle_w + back_w
        with self._lock:
            self._vertices[AxisRole.FRONT].weight = front_w / total
            self._vertices[AxisRole.MIDDLE].weight = middle_w / total
            self._vertices[AxisRole.BACK].weight = back_w / total
        logger.info(
            f"Weights: F={self.front.weight:.2f} M={self.middle.weight:.2f} B={self.back.weight:.2f}"
        )

    def compute_inner_angles(self) -> dict[str, float]:
        fw = self.front.weight
        mw = self.middle.weight
        bw = self.back.weight
        total = fw + mw + bw
        if total == 0:
            return {"front": 60.0, "middle": 60.0, "back": 60.0}
        return {
            "front": round(180.0 * fw / total, 2),
            "middle": round(180.0 * mw / total, 2),
            "back": round(180.0 * bw / total, 2),
        }

    @property
    def stability_metric(self) -> float:
        angles = self.compute_inner_angles()
        max_deviation = max(abs(v - 60.0) for v in angles.values())
        return max(0.0, 1.0 - max_deviation / 60.0)

    def deform(self, to_mode: DeformationMode, trigger: str = "") -> TopologyDeformation:
        start = time.time()
        old_mode = self.current_mode
        self.current_mode = to_mode

        vertex_weights = {}
        if to_mode == DeformationMode.TRIANGLE:
            self.set_weights(1.0, 1.0, 1.0)
            vertex_weights = {"front": 1.0, "middle": 1.0, "back": 1.0}
        elif to_mode == DeformationMode.PARALLEL:
            self.set_weights(2.0, 0.5, 2.0)
            vertex_weights = {"front": 2.0, "middle": 0.5, "back": 2.0}
        elif to_mode == DeformationMode.SEGMENT:
            self.set_weights(1.0, 1.5, 1.0)
            vertex_weights = {"front": 1.0, "middle": 1.5, "back": 1.0}

        deformation = TopologyDeformation(
            from_mode=old_mode,
            to_mode=to_mode,
            trigger=trigger,
            vertex_weights=vertex_weights,
            transition_ms=(time.time() - start) * 1000,
        )

        with self._lock:
            self._deformation_history.append(deformation)
            self._stats["deformations"] += 1

        logger.info(f"Topology: {old_mode.value} -> {to_mode.value} ({trigger})")
        return deformation

    def route_request(
        self, request_size: float = 1.0
    ) -> dict[str, Any]:
        if not self.shield.check_rate():
            self._stats["shield_blocks"] += 1
            return {"accepted": False, "reason": "rate_limited"}

        fw = self.front.weight
        mw = self.middle.weight
        bw = self.back.weight

        front_load = request_size * fw / (fw + mw + bw)
        middle_load = request_size * mw / (fw + mw + bw)
        back_load = request_size * bw / (fw + mw + bw)

        with self._lock:
            self.front.load += front_load
            self.middle.load += middle_load
            self.back.load += back_load

        return {
            "accepted": True,
            "front_allocation": round(front_load, 4),
            "middle_allocation": round(middle_load, 4),
            "back_allocation": round(back_load, 4),
            "mode": self.current_mode.value,
        }

    def release_request(self, request_size: float = 1.0) -> None:
        fw = self.front.weight
        mw = self.middle.weight
        bw = self.back.weight
        total = fw + mw + bw
        with self._lock:
            self.front.load = max(0, self.front.load - request_size * fw / total)
            self.middle.load = max(0, self.middle.load - request_size * mw / total)
            self.back.load = max(0, self.back.load - request_size * bw / total)

    def health_check(self) -> dict[str, Any]:
        with self._lock:
            for vertex in self._vertices.values():
                vertex.compute_health()
                if vertex.health_score < 0.3:
                    self._stats["vertex_crashes"] += 1

        return {
            "front": {
                "health": round(self.front.health_score, 3),
                "saturation": round(self.front.saturation, 3),
                "alive": self.front.is_alive,
            },
            "middle": {
                "health": round(self.middle.health_score, 3),
                "saturation": round(self.middle.saturation, 3),
                "alive": self.middle.is_alive,
            },
            "back": {
                "health": round(self.back.health_score, 3),
                "saturation": round(self.back.saturation, 3),
                "alive": self.back.is_alive,
            },
            "shield": {
                "request_count": self.shield.request_count,
                "blocked_count": self.shield.blocked_count,
            },
            "kernel": {
                "assets": len(self.kernel.core_assets),
                "tamper_attempts": self.kernel.tamper_attempts,
            },
            "topology": {
                "mode": self.current_mode.value,
                "stability": round(self.stability_metric, 3),
                "inner_angles": self.compute_inner_angles(),
                "deformations": self._stats["deformations"],
            },
        }

    def get_deformation_history(self) -> list[dict[str, Any]]:
        with self._lock:
            return [
                {
                    "from": d.from_mode.value,
                    "to": d.to_mode.value,
                    "trigger": d.trigger,
                    "transition_ms": round(d.transition_ms, 2),
                    "timestamp": d.timestamp,
                }
                for d in self._deformation_history[-20:]
            ]

    @property
    def stats(self) -> dict[str, Any]:
        return {**self._stats, "current_mode": self.current_mode.value}

    @property
    def is_stable(self) -> bool:
        return self.stability_metric > 0.7 and all(
            v.is_alive for v in self._vertices.values()
        )
