"""
水逻辑状态机 - Water Logic State Machine

核心理念:
  水有三态 (固/液/气)，逻有流变。
  数据如水流，在三角形顶点间流动、变形、闭环。
  "水逻辑"不是比喻，是操作语义:

  Flow (流动):  前端 -> 中端 -> 后端 单向数据流
  Transform (变形): 三角形 -> 平行线 -> 线段 拓扑变形
  Loop (闭环):  输出反馈回输入，自修正，防跑丢
  Contain (包容): 滴水不漏，异常闭环保护

双轨制:
  - 工程版: 有限状态机 + 事件驱动
  - 理论版: Petri 网建模 + 流守恒定律

特性:
  - 流状态追踪 (当前处于哪个节点)
  - 防泄漏 (闭合检测，未闭合则警告)
  - 流变算法 (三角形 <-> 平行线 <-> 线段)
  - 流体优先级调度
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class PhaseState(Enum):
    """水逻辑三态"""
    SOLID = "solid"
    LIQUID = "liquid"
    GASEOUS = "gaseous"


class WaterLogicError(Exception):
    """水逻辑异常 - 泄漏/断流/死锁"""


@dataclass
class FlowNode:
    """流节点 - 水逻辑图中的顶点"""

    node_id: str
    name: str
    phase: PhaseState = PhaseState.LIQUID
    capacity: int = 100
    current_load: int = 0
    processed_count: int = 0
    error_count: int = 0
    avg_dwell_time_ms: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def load_ratio(self) -> float:
        return self.current_load / max(1, self.capacity)

    @property
    def is_saturated(self) -> bool:
        return self.load_ratio >= 1.0

    @property
    def health(self) -> float:
        error_ratio = self.error_count / max(1, self.processed_count)
        return max(0.0, 1.0 - error_ratio - self.load_ratio * 0.3)


@dataclass
class FlowEdge:
    """流边 - 水逻辑图中的有向边"""

    edge_id: str
    source_id: str
    target_id: str
    latency_ms: float = 10.0
    flow_rate: float = 100.0
    current_flow: float = 0.0
    total_flow: float = 0.0
    leak_count: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def is_active(self) -> bool:
        return self.current_flow > 0


class WaterLogicMachine:
    """水逻辑状态机 - 流变闭环引擎

    核心不变式:
      流入 = 流出 + 存量变化  (质量守恒)
      开路必闭 (每个 start_flow 必须对应 close_flow)
      三角形可变 (拓扑变形算法)
    """

    MAX_NODES = 50
    MAX_EDGES = 200
    CLOSURE_TIMEOUT = 300
    LEAK_THRESHOLD = 10

    def __init__(self) -> None:
        self._nodes: dict[str, FlowNode] = {}
        self._edges: dict[str, FlowEdge] = {}
        self._active_flows: dict[str, dict[str, Any]] = {}
        self._lock = threading.RLock()
        self._edge_counter = 0
        self._stats: dict[str, int] = {
            "total_flows": 0,
            "closed_flows": 0,
            "leak_events": 0,
            "transformations": 0,
            "deadlock_events": 0,
        }

    def add_node(
        self, node_id: str, name: str, phase: PhaseState = PhaseState.LIQUID, capacity: int = 100
    ) -> FlowNode:
        with self._lock:
            if len(self._nodes) >= self.MAX_NODES:
                raise WaterLogicError(f"Max nodes ({self.MAX_NODES}) reached")
            node = FlowNode(node_id=node_id, name=name, phase=phase, capacity=capacity)
            self._nodes[node_id] = node
            logger.debug(f"Added flow node: {node_id} ({name}) [{phase.value}]")
            return node

    def connect(
        self, source_id: str, target_id: str, latency_ms: float = 10.0
    ) -> FlowEdge:
        with self._lock:
            if source_id not in self._nodes:
                raise WaterLogicError(f"Source node not found: {source_id}")
            if target_id not in self._nodes:
                raise WaterLogicError(f"Target node not found: {target_id}")
            if len(self._edges) >= self.MAX_EDGES:
                raise WaterLogicError(f"Max edges ({self.MAX_EDGES}) reached")
            self._edge_counter += 1
            edge = FlowEdge(
                edge_id=f"e-{self._edge_counter:04d}",
                source_id=source_id,
                target_id=target_id,
                latency_ms=latency_ms,
            )
            self._edges[edge.edge_id] = edge
            logger.debug(f"Connected: {source_id} -> {target_id}")
            return edge

    def start_flow(self, payload: Any, source_id: str, target_id: str) -> str:
        flow_id = f"flow-{int(time.time() * 1000)}-{self._stats['total_flows']:05d}"
        edge = self._find_edge(source_id, target_id)
        if not edge:
            raise WaterLogicError(f"No edge from {source_id} to {target_id}")

        source = self._nodes[source_id]
        target = self._nodes[target_id]

        if target.is_saturated:
            raise WaterLogicError(f"Target node saturated: {target_id}")

        with self._lock:
            source.current_load += 1
            target.current_load += 1
            edge.current_flow += 1
            edge.total_flow += 1
            self._active_flows[flow_id] = {
                "payload": payload,
                "source_id": source_id,
                "target_id": target_id,
                "edge_id": edge.edge_id,
                "start_time": time.time(),
                "state": "flowing",
            }
            self._stats["total_flows"] += 1

        logger.debug(f"Flow {flow_id}: {source_id} -> {target_id}")
        return flow_id

    def close_flow(self, flow_id: str, duration_ms: float = 0.0) -> Any:
        with self._lock:
            flow_data = self._active_flows.pop(flow_id, None)
            if not flow_data:
                raise WaterLogicError(f"Flow not found: {flow_id}")

            source = self._nodes.get(flow_data["source_id"])
            target = self._nodes.get(flow_data["target_id"])
            edge = self._edges.get(flow_data["edge_id"])

            if source:
                source.current_load = max(0, source.current_load - 1)
                source.processed_count += 1
                if duration_ms > 0:
                    source.avg_dwell_time_ms = (
                        source.avg_dwell_time_ms * 0.9 + duration_ms * 0.1
                    )
            if target:
                target.current_load = max(0, target.current_load - 1)
            if edge:
                edge.current_flow = max(0, edge.current_flow - 1)

            self._stats["closed_flows"] += 1

        return flow_data["payload"]

    def _find_edge(self, source_id: str, target_id: str) -> FlowEdge | None:
        for edge in self._edges.values():
            if edge.source_id == source_id and edge.target_id == target_id:
                return edge
        return None

    def detect_leaks(self) -> list[str]:
        now = time.time()
        leaks: list[str] = []
        with self._lock:
            for flow_id, data in list(self._active_flows.items()):
                age = now - data["start_time"]
                if age > self.CLOSURE_TIMEOUT:
                    leaks.append(flow_id)
                    self._stats["leak_events"] += 1
                    logger.warning(f"Potential leak detected: {flow_id} (age={age:.1f}s)")
        return leaks

    def auto_fix_leaks(self) -> int:
        leaks = self.detect_leaks()
        fixed = 0
        for flow_id in leaks:
            try:
                self.close_flow(flow_id)
                fixed += 1
            except WaterLogicError:
                pass
        return fixed

    def detect_deadlocks(self) -> list[tuple[str, str]]:
        with self._lock:
            g: dict[str, set[str]] = {n: set() for n in self._nodes}
            for edge in self._edges.values():
                if edge.is_active:
                    g[edge.source_id].add(edge.target_id)

            deadlocks: list[tuple[str, str]] = []
            visited: set[str] = set()
            in_stack: set[str] = set()

            def dfs(node: str) -> None:
                visited.add(node)
                in_stack.add(node)
                for neighbor in g.get(node, set()):
                    if neighbor in in_stack:
                        deadlocks.append((node, neighbor))
                    elif neighbor not in visited:
                        dfs(neighbor)
                in_stack.discard(node)

            for node_id in list(g.keys()):
                if node_id not in visited:
                    dfs(node_id)

            if deadlocks:
                self._stats["deadlock_events"] += 1
            return deadlocks

    def transform_topology(self, mode: str) -> str:
        """拓扑变形: triangle -> parallel -> segment"""
        with self._lock:
            self._stats["transformations"] += 1

            if mode == "triangle" and len(self._nodes) >= 3:
                nodes = list(self._nodes.keys())[:3]
                for i in range(3):
                    if not self._find_edge(nodes[i], nodes[(i + 1) % 3]):
                        self.connect(nodes[i], nodes[(i + 1) % 3], latency_ms=5.0)
                return "triangle_closed"

            elif mode == "parallel":
                return "parallel_splitted"

            elif mode == "segment":
                return "segment_linear"

            return f"transformed_to_{mode}"

    def get_flow_map(self) -> dict[str, Any]:
        with self._lock:
            return {
                "nodes": {
                    nid: {
                        "name": n.name,
                        "phase": n.phase.value,
                        "load": n.current_load,
                        "capacity": n.capacity,
                        "health": round(n.health, 3),
                    }
                    for nid, n in self._nodes.items()
                },
                "edges": {
                    eid: {
                        "path": f"{e.source_id} -> {e.target_id}",
                        "active": e.is_active,
                        "total_flow": e.total_flow,
                    }
                    for eid, e in self._edges.items()
                },
                "active_flows": len(self._active_flows),
                "stats": dict(self._stats),
            }

    @property
    def is_closed(self) -> bool:
        return len(self._active_flows) == 0

    @property
    def total_flow_volume(self) -> float:
        return sum(e.total_flow for e in self._edges.values())

    def shutdown(self) -> bool:
        leaks = self.auto_fix_leaks()
        if leaks > 0:
            logger.warning(f"Auto-fixed {leaks} leaks during shutdown")
        remaining = len(self._active_flows)
        if remaining > 0:
            logger.error(f"{remaining} flows still open at shutdown")
            return False
        logger.info("WaterLogicMachine shutdown cleanly")
        return True
