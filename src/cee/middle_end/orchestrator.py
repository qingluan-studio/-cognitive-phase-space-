"""
中端核心编排器 - Middle-End Orchestrator

核心理念:
  中端是三端架构的灵魂。它不是中间件，而是"第二大脑"。
  编排器将所有中端子系统串联成一个自洽的生命体:

  AlarmClock (心跳) --\
  HumanHands (感官) ---\
  UserProfiling (记忆) ---+--> TriangleTopology (骨架)
  DualRouter (决策) -----/
  WaterLogic (血液) ----/

  这个自洽生命体:
  - 有自己的时间感知 (独立闹钟)
  - 有自己的感官 (模拟人手触网)
  - 有自己的记忆 (冷热用户画像)
  - 有自己的决策 (双引擎路由)
  - 有自己的血液 (水逻辑数据流)
  - 有自己的骨架 (三角形拓扑)
  - 有自己的免疫 (外环防护盾)
  - 有自己的灵魂 (内核锁)

双轨制:
  - 工程版: 事件循环 + 状态机
  - 理论版: 自组织临界性 + 耗散结构理论

生命周期:
  BOOT -> INIT -> RUNNING -> PAUSED -> SHUTDOWN
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from cee.middle_end.alarm import IndependentAlarmSystem
from cee.middle_end.human_hands import HumanHands
from cee.middle_end.profiler import BehaviorCategory, UserProfilingSystem
from cee.middle_end.router import DualEngineRouter, EngineMode
from cee.middle_end.triangle import DeformationMode, TriangleTopologyEngine
from cee.middle_end.water_logic import PhaseState, WaterLogicMachine

logger = logging.getLogger(__name__)


class OrchestratorPhase(Enum):
    BOOT = "boot"
    INIT = "init"
    RUNNING = "running"
    PAUSED = "paused"
    SHUTDOWN = "shutdown"
    ERROR = "error"


@dataclass
class OrchestratorEvent:
    event_id: str
    event_type: str
    source: str
    timestamp: float = field(default_factory=time.time)
    data: dict[str, Any] = field(default_factory=dict)


@dataclass
class SystemHealth:
    alarm_ok: bool = False
    hands_ok: bool = False
    profiler_ok: bool = False
    router_ok: bool = False
    water_ok: bool = False
    triangle_ok: bool = False
    overall: float = 0.0
    last_check: float = field(default_factory=time.time)

    @property
    def all_ok(self) -> bool:
        return all([
            self.alarm_ok,
            self.hands_ok,
            self.profiler_ok,
            self.router_ok,
            self.water_ok,
            self.triangle_ok,
        ])

    @property
    def failed_components(self) -> list[str]:
        failures: list[str] = []
        if not self.alarm_ok:
            failures.append("alarm")
        if not self.hands_ok:
            failures.append("hands")
        if not self.profiler_ok:
            failures.append("profiler")
        if not self.router_ok:
            failures.append("router")
        if not self.water_ok:
            failures.append("water")
        if not self.triangle_ok:
            failures.append("triangle")
        return failures


class MiddleEndOrchestrator:
    """中端核心编排器 - 中端生命体的大脑"""

    HEALTH_CHECK_INTERVAL = 30.0
    SYNC_INTERVAL = 60.0
    LEAK_CHECK_INTERVAL = 15.0
    MAX_EVENT_LOG = 1000

    def __init__(self, storage_path: str | None = None) -> None:
        self.alarm = IndependentAlarmSystem()
        self.hands = HumanHands()
        self.profiler = UserProfilingSystem(storage_path)
        self.router = DualEngineRouter()
        self.water = WaterLogicMachine()
        self.triangle = TriangleTopologyEngine()

        self.phase: OrchestratorPhase = OrchestratorPhase.BOOT
        self._events: list[OrchestratorEvent] = []
        self._event_id_counter = 0
        self._lock = threading.RLock()
        self._watchdog_thread: threading.Thread | None = None
        self._stop_event = threading.Event()

        self.system_health = SystemHealth()

        self._setup_water_nodes()
        self._emit_event("orchestrator", "created", {"phase": "boot"})

    def _emit_event(self, source: str, event_type: str, data: dict[str, Any] | None = None) -> str:
        self._event_id_counter += 1
        event_id = f"evt-{self._event_id_counter:08d}"
        event = OrchestratorEvent(
            event_id=event_id,
            event_type=event_type,
            source=source,
            data=data or {},
        )
        with self._lock:
            self._events.append(event)
            if len(self._events) > self.MAX_EVENT_LOG:
                self._events = self._events[-self.MAX_EVENT_LOG // 2 :]
        return event_id

    def _setup_water_nodes(self) -> None:
        self.water.add_node("front_in", "Front Input", PhaseState.LIQUID, capacity=200)
        self.water.add_node("middle_proc", "Middle Processing", PhaseState.SOLID, capacity=500)
        self.water.add_node("back_store", "Back Storage", PhaseState.GASEOUS, capacity=300)
        self.water.add_node("output_sink", "Output Sink", PhaseState.LIQUID, capacity=200)
        self.water.connect("front_in", "middle_proc", latency_ms=5.0)
        self.water.connect("middle_proc", "back_store", latency_ms=10.0)
        self.water.connect("middle_proc", "output_sink", latency_ms=3.0)
        self.water.connect("back_store", "middle_proc", latency_ms=8.0)

    def bootstrap(self) -> str:
        """启动中端生命体"""
        if self.phase not in (OrchestratorPhase.BOOT, OrchestratorPhase.INIT):
            return f"Already in {self.phase.value}"

        self.phase = OrchestratorPhase.INIT
        self._emit_event("orchestrator", "bootstrap_start", {})

        self.alarm.start()
        self._emit_event("alarm", "started", self.alarm.stats)

        self.triangle.deform(DeformationMode.TRIANGLE, "bootstrap")
        self._emit_event("triangle", "initialized", {"mode": self.triangle.current_mode.value})

        self.triangle.kernel.register_asset("cognitive_engine", self.triangle.kernel.LockLevel.SEALED)
        self.triangle.kernel.register_asset("governance_rules", self.triangle.kernel.LockLevel.GUARDED)
        self.triangle.kernel.register_asset("local_model", self.triangle.kernel.LockLevel.SEALED)
        self.triangle.kernel.register_asset("public_api", self.triangle.kernel.LockLevel.OPEN)
        self._emit_event("kernel", "assets_registered", {"count": 4})

        self._register_cron_tasks()

        self.phase = OrchestratorPhase.RUNNING
        self._start_watchdog()
        self._emit_event("orchestrator", "running", {})

        logger.info("MiddleEndOrchestrator bootstrapped and running")
        return "running"

    def _register_cron_tasks(self) -> None:
        self.alarm.register_cron(
            "health_check",
            self.HEALTH_CHECK_INTERVAL,
            self._health_check_task,
            start_immediately=True,
        )
        self.alarm.register_cron(
            "profiler_sync",
            self.SYNC_INTERVAL,
            self._sync_task,
        )
        self.alarm.register_cron(
            "leak_detection",
            self.LEAK_CHECK_INTERVAL,
            self._leak_check_task,
        )

    def _health_check_task(self) -> None:
        try:
            health = self.check_health()
            if not health.all_ok:
                logger.warning(f"Unhealthy components: {health.failed_components}")
                self._emit_event("health", "degraded", {"failed": health.failed_components})
            if len(self.water._active_flows) > 0:
                self.water.auto_fix_leaks()
        except Exception as e:
            self._emit_event("health", "check_failed", {"error": str(e)})

    def _sync_task(self) -> None:
        try:
            synced = self.profiler.sync_cold()
            if synced > 0:
                self._emit_event("profiler", "synced", {"count": synced})
        except Exception as e:
            self._emit_event("profiler", "sync_failed", {"error": str(e)})

    def _leak_check_task(self) -> None:
        try:
            leaks = self.water.detect_leaks()
            if leaks:
                self._emit_event("water", "leaks_detected", {"count": len(leaks)})
                self.water.auto_fix_leaks()
            deadlocks = self.water.detect_deadlocks()
            if deadlocks:
                self._emit_event("water", "deadlocks_detected", {"count": len(deadlocks)})
        except Exception as e:
            self._emit_event("water", "check_failed", {"error": str(e)})

    def _start_watchdog(self) -> None:
        if self._watchdog_thread and self._watchdog_thread.is_alive():
            return
        self._stop_event.clear()
        self._watchdog_thread = threading.Thread(
            target=self._watchdog_loop, daemon=True, name="middle-end-watchdog"
        )
        self._watchdog_thread.start()

    def _watchdog_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                self.system_health = self.check_health()
                if not self.system_health.all_ok and self.phase == OrchestratorPhase.RUNNING:
                    self._emit_event("watchdog", "health_warning", {
                        "failed": self.system_health.failed_components,
                        "overall": self.system_health.overall,
                    })
            except Exception:
                logger.exception("Watchdog loop error")
            self._stop_event.wait(10.0)

    def check_health(self) -> SystemHealth:
        health = SystemHealth()

        try:
            health.alarm_ok = self.alarm.is_running
        except Exception:
            health.alarm_ok = False

        try:
            health.hands_ok = self.hands.stats["searches"] >= 0
        except Exception:
            health.hands_ok = False

        try:
            health.profiler_ok = self.profiler.hot.size >= 0
        except Exception:
            health.profiler_ok = False

        try:
            health.router_ok = self.router.stats["total_requests"] >= 0
        except Exception:
            health.router_ok = False

        try:
            health.water_ok = all(
                n.health > 0 for n in self.water._nodes.values()
            )
        except Exception:
            health.water_ok = False

        try:
            health.triangle_ok = self.triangle.is_stable
        except Exception:
            health.triangle_ok = False

        components = [
            health.alarm_ok, health.hands_ok, health.profiler_ok,
            health.router_ok, health.water_ok, health.triangle_ok,
        ]
        health.overall = sum(components) / len(components)
        return health

    def process_request(
        self,
        prompt: str,
        user_id: str = "anonymous",
        **kwargs: Any,
    ) -> dict[str, Any]:
        """全流程处理一个请求 - 贯穿中端六层"""
        flow_id = self.water.start_flow(prompt, "front_in", "middle_proc")

        self.profiler.track_event(
            user_id=user_id,
            category=BehaviorCategory.DIALOGUE,
            action=prompt[:200],
            **kwargs,
        )

        decision = self.router.route(prompt, user_id=user_id)
        allocation = self.triangle.route_request(request_size=len(prompt) / 100.0)

        start_time = time.time()
        try:
            if decision.mode == EngineMode.LIGHT:
                result_text = f"[LightEngine] Processed: {prompt[:100]}"
            else:
                result_text = f"[HeavyEngine] Deep analysis: {prompt[:100]}"
        except Exception as e:
            result_text = f"Error: {e}"
            self._emit_event("process", "error", {"error": str(e)})

        elapsed_ms = (time.time() - start_time) * 1000
        self.water.close_flow(flow_id, duration_ms=elapsed_ms)
        self.triangle.release_request(request_size=len(prompt) / 100.0)

        return {
            "result": result_text,
            "decision": {
                "mode": decision.mode.value,
                "category": decision.task_category.value,
                "complexity": round(decision.complexity_score, 3),
            },
            "allocation": allocation,
            "elapsed_ms": round(elapsed_ms, 2),
            "flow_id": flow_id,
        }

    def search_web(self, query: str, fetch_pages: bool = True) -> dict[str, Any]:
        """通过模拟人手搜索网络"""
        result = self.hands.search_and_fetch(query, fetch_pages=fetch_pages)
        self._emit_event("hands", "search_completed", {
            "query": query,
            "results": len(result.get("search_results", [])),
            "pages": result.get("total_pages", 0),
        })
        return result

    def pause(self) -> str:
        self.phase = OrchestratorPhase.PAUSED
        self._emit_event("orchestrator", "paused", {})
        return "paused"

    def resume(self) -> str:
        self.phase = OrchestratorPhase.RUNNING
        self._emit_event("orchestrator", "resumed", {})
        return "running"

    def shutdown(self, timeout: float = 10.0) -> dict[str, Any]:
        """安全关闭 - 确保闭环"""
        self.phase = OrchestratorPhase.SHUTDOWN
        self._emit_event("orchestrator", "shutdown_start", {})

        self._stop_event.set()

        water_clean = self.water.shutdown()

        self.alarm.stop(timeout)

        self._emit_event("orchestrator", "shutdown_complete", {
            "water_clean": water_clean,
        })

        logger.info("MiddleEndOrchestrator shutdown complete")
        return {
            "phase": "shutdown",
            "water_clean": water_clean,
            "total_events": len(self._events),
        }

    def get_dashboard(self) -> dict[str, Any]:
        """获取中端全景仪表板"""
        return {
            "phase": self.phase.value,
            "uptime": self.alarm.stats.get("uptime_seconds", 0),
            "health": {
                "overall": round(self.system_health.overall, 3),
                "components": {
                    "alarm": self.system_health.alarm_ok,
                    "human_hands": self.system_health.hands_ok,
                    "profiler": self.system_health.profiler_ok,
                    "router": self.system_health.router_ok,
                    "water_logic": self.system_health.water_ok,
                    "triangle": self.system_health.triangle_ok,
                },
            },
            "alarm": self.alarm.stats,
            "hands": self.hands.stats,
            "profiler": self.profiler.stats,
            "router": self.router.stats,
            "water": self.water.get_flow_map(),
            "triangle": self.triangle.health_check(),
            "events_total": len(self._events),
            "latest_events": [
                {
                    "type": e.event_type,
                    "source": e.source,
                    "timestamp": e.timestamp,
                }
                for e in self._events[-10:]
            ],
        }

    @property
    def is_alive(self) -> bool:
        return self.phase in (OrchestratorPhase.RUNNING, OrchestratorPhase.PAUSED)

    @property
    def summary(self) -> str:
        h = self.system_health
        return (
            f"MiddleEnd[{self.phase.value}] "
            f"Health={h.overall:.0%} "
            f"Mode={self.triangle.current_mode.value} "
            f"Alarms={self.alarm.stats.get('pending_tasks', 0)} "
            f"Flows={len(self.water._active_flows)}"
        )
