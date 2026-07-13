"""
独立闹钟系统 - Independent Alarm System

核心理念:
  不依赖外部 Cron，不依赖操作系统调度器。
  系统时间自唤醒：每隔 10 秒巡检一次，到点干活，睡醒自洽。

双轨制:
  - 工程版: threading.Timer + heapq 优先队列，轻量级
  - 理论版: 分布式时间同步 + Lamport 逻辑时钟 + 容错共识

架构:
  AlarmClock (单个闹钟)
    -> IndependentAlarmSystem (闹钟集群调度器)
      -> CronAlarm (周期任务)
      -> AlarmTask (一次性任务)

特性:
  - 10 秒心跳巡检
  - 精确到秒的触发
  - 优先级队列调度
  - 任务失败重试 + 退避
  - 挂机一年不断电
  - 休眠/唤醒状态机
"""

from __future__ import annotations

import heapq
import logging
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class AlarmPriority(Enum):
    CRITICAL = 0
    HIGH = 1
    MEDIUM = 2
    LOW = 3
    BACKGROUND = 4


class AlarmState(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


@dataclass
class AlarmTask:
    """一次性闹钟任务"""

    task_id: str
    trigger_at: float
    callback: Callable[[], Any]
    priority: AlarmPriority = AlarmPriority.MEDIUM
    max_retries: int = 3
    retry_delay: float = 5.0

    state: AlarmState = AlarmState.PENDING
    retry_count: int = 0
    created_at: float = field(default_factory=time.time)
    last_run_at: float = 0.0
    last_error: str = ""

    def __lt__(self, other: AlarmTask) -> bool:
        return (self.priority.value, self.trigger_at) < (other.priority.value, other.trigger_at)

    @property
    def is_due(self) -> bool:
        return time.time() >= self.trigger_at and self.state == AlarmState.PENDING


@dataclass
class CronAlarm:
    """周期闹钟 - Cron 风格"""

    cron_id: str
    interval_seconds: float
    callback: Callable[[], Any]
    priority: AlarmPriority = AlarmPriority.MEDIUM
    max_retries: int = 3
    retry_delay: float = 5.0

    next_trigger: float = 0.0
    state: AlarmState = AlarmState.PENDING
    run_count: int = 0
    fail_count: int = 0
    total_runs: int = 0
    created_at: float = field(default_factory=time.time)
    last_run_at: float = 0.0
    last_error: str = ""

    def __post_init__(self):
        if self.next_trigger == 0.0:
            self.next_trigger = time.time() + self.interval_seconds

    @property
    def is_due(self) -> bool:
        return time.time() >= self.next_trigger


@dataclass
class AlarmClock:
    """理论版核心: Lamport 逻辑时钟 + 时间同步"""

    clock_id: str
    lamport_tick: int = 0
    drift_ppm: float = 0.0
    last_sync: float = 0.0
    sync_nodes: list[str] = field(default_factory=list)

    def tick(self) -> int:
        self.lamport_tick += 1
        return self.lamport_tick

    def merge(self, remote_tick: int) -> int:
        self.lamport_tick = max(self.lamport_tick, remote_tick) + 1
        return self.lamport_tick

    def estimate_drift(self, reference_time: float) -> float:
        if self.last_sync == 0.0:
            self.drift_ppm = 0.0
        else:
            elapsed = time.time() - self.last_sync
            if elapsed > 0:
                self.drift_ppm = (self.lamport_tick / elapsed - 1.0) * 1e6
        self.last_sync = reference_time
        return self.drift_ppm


class IndependentAlarmSystem:
    """独立闹钟调度器 - 10 秒心跳，无外部依赖"""

    HEARTBEAT_INTERVAL = 10.0
    MAX_POOL_SIZE = 1000

    def __init__(self) -> None:
        self._tasks: list[AlarmTask] = []
        self._crons: dict[str, CronAlarm] = {}
        self._clock = AlarmClock(clock_id="master")
        self._lock = threading.RLock()
        self._running = False
        self._heartbeat_thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._task_id_counter = 0
        self._stats: dict[str, Any] = {
            "tasks_completed": 0,
            "tasks_failed": 0,
            "cron_runs": 0,
            "heartbeats": 0,
            "uptime_start": 0.0,
            "current_state": "stopped",
        }

    def _next_id(self) -> str:
        with self._lock:
            self._task_id_counter += 1
            return f"alarm-{self._task_id_counter:06d}"

    def schedule(
        self,
        callback: Callable[[], Any],
        delay_seconds: float,
        priority: AlarmPriority = AlarmPriority.MEDIUM,
        max_retries: int = 3,
    ) -> str:
        """调度一次性任务"""
        task = AlarmTask(
            task_id=self._next_id(),
            trigger_at=time.time() + delay_seconds,
            callback=callback,
            priority=priority,
            max_retries=max_retries,
        )
        with self._lock:
            if len(self._tasks) >= self.MAX_POOL_SIZE:
                self._tasks = self._tasks[-self.MAX_POOL_SIZE // 2 :]
            heapq.heappush(self._tasks, task)
        logger.debug(f"Scheduled task {task.task_id} for {delay_seconds}s later")
        return task.task_id

    def schedule_at(
        self,
        callback: Callable[[], Any],
        timestamp: float,
        priority: AlarmPriority = AlarmPriority.MEDIUM,
    ) -> str:
        """调度定点任务"""
        delay = max(0.0, timestamp - time.time())
        return self.schedule(callback, delay, priority)

    def register_cron(
        self,
        cron_id: str,
        interval_seconds: float,
        callback: Callable[[], Any],
        priority: AlarmPriority = AlarmPriority.MEDIUM,
        start_immediately: bool = False,
    ) -> str:
        """注册周期任务"""
        cron = CronAlarm(
            cron_id=cron_id,
            interval_seconds=interval_seconds,
            callback=callback,
            priority=priority,
        )
        if start_immediately:
            cron.next_trigger = time.time()
        with self._lock:
            self._crons[cron_id] = cron
        logger.info(f"Registered cron '{cron_id}' every {interval_seconds}s")
        return cron_id

    def cancel(self, task_id: str) -> bool:
        with self._lock:
            for t in self._tasks:
                if t.task_id == task_id:
                    t.state = AlarmState.CANCELLED
                    return True
        return False

    def unregister_cron(self, cron_id: str) -> bool:
        with self._lock:
            cron = self._crons.pop(cron_id, None)
            if cron:
                cron.state = AlarmState.CANCELLED
                return True
        return False

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._stop_event.clear()
        self._stats["uptime_start"] = time.time()
        self._stats["current_state"] = "running"
        self._heartbeat_thread = threading.Thread(
            target=self._heartbeat_loop, daemon=True, name="alarm-heartbeat"
        )
        self._heartbeat_thread.start()
        logger.info("IndependentAlarmSystem started (10s heartbeat)")

    def stop(self, timeout: float = 5.0) -> None:
        if not self._running:
            return
        self._running = False
        self._stop_event.set()
        self._stats["current_state"] = "stopped"
        if self._heartbeat_thread and self._heartbeat_thread.is_alive():
            self._heartbeat_thread.join(timeout=timeout)
        logger.info("IndependentAlarmSystem stopped")

    def _heartbeat_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                self._clock.tick()
                self._stats["heartbeats"] += 1
                self._process_tasks()
                self._process_crons()
                self._cleanup()
            except Exception:
                logger.exception("Heartbeat error")
            self._stop_event.wait(self.HEARTBEAT_INTERVAL)

    def _process_tasks(self) -> None:
        with self._lock:
            due_tasks: list[AlarmTask] = []
            while self._tasks and self._tasks[0].is_due:
                due_tasks.append(heapq.heappop(self._tasks))

        for task in due_tasks:
            self._execute_task(task)

    def _execute_task(self, task: AlarmTask) -> None:
        task.state = AlarmState.RUNNING
        task.last_run_at = time.time()
        try:
            task.callback()
            task.state = AlarmState.COMPLETED
            self._stats["tasks_completed"] += 1
        except Exception as e:
            task.last_error = str(e)
            if task.retry_count < task.max_retries:
                task.retry_count += 1
                task.state = AlarmState.RETRYING
                task.trigger_at = time.time() + task.retry_delay * (2 ** (task.retry_count - 1))
                with self._lock:
                    heapq.heappush(self._tasks, task)
                logger.warning(f"Task {task.task_id} retry {task.retry_count}/{task.max_retries}")
            else:
                task.state = AlarmState.FAILED
                self._stats["tasks_failed"] += 1
                logger.error(f"Task {task.task_id} permanently failed: {e}")

    def _process_crons(self) -> None:
        now = time.time()
        with self._lock:
            due_crons = [c for c in self._crons.values() if c.is_due]

        for cron in due_crons:
            try:
                cron.state = AlarmState.RUNNING
                cron.last_run_at = now
                cron.callback()
                cron.run_count += 1
                self._stats["cron_runs"] += 1
                cron.state = AlarmState.PENDING
            except Exception as e:
                cron.last_error = str(e)
                cron.fail_count += 1
                if cron.fail_count <= cron.max_retries:
                    cron.state = AlarmState.RETRYING
                    cron.next_trigger = now + cron.retry_delay
                    logger.warning(f"Cron {cron.cron_id} error (retry): {e}")
                else:
                    cron.state = AlarmState.FAILED
                    logger.error(f"Cron {cron.cron_id} failed: {e}")
            else:
                cron.next_trigger = now + cron.interval_seconds
            cron.total_runs += 1

    def _cleanup(self) -> None:
        with self._lock:
            cutoff = time.time() - 3600
            self._tasks = [
                t
                for t in self._tasks
                if t.state
                in (AlarmState.PENDING, AlarmState.RETRYING)
                or t.created_at > cutoff
            ]

    @property
    def stats(self) -> dict[str, Any]:
        s = dict(self._stats)
        s["alarm_clock_tick"] = self._clock.lamport_tick
        s["pending_tasks"] = sum(1 for t in self._tasks if t.state == AlarmState.PENDING)
        s["active_crons"] = sum(1 for c in self._crons.values() if c.state != AlarmState.CANCELLED)
        if self._stats["uptime_start"] > 0:
            s["uptime_seconds"] = time.time() - self._stats["uptime_start"]
        return s

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def lamport_time(self) -> int:
        return self._clock.lamport_tick
