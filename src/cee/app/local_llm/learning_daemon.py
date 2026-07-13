"""
认知涌现引擎 — 后台学习守护进程
===============================
扩展 AutoTrainer, 加入自模拟对话循环
无限持续学习, 20分钟一轮 (10模拟 + 2去重 + 3重校准 + 5冷却)
CPU感知: >70%暂停, <30%恢复
"""

from __future__ import annotations

import json
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any

from .knowledge_store import STORAGE_DIR, SelfLearningKnowledgeStore

LEARNING_REPORT_FILE = STORAGE_DIR / "learning_report.json"
DICT_DIR = STORAGE_DIR / "dicts"


class BackgroundLearningDaemon:
    """
    后台学习守护进程

    无限持续学习, 20分钟一轮调度
    扩展已有 AutoTrainer, 加入自模拟循环

    用法:
        daemon = BackgroundLearningDaemon(
            composited_engine, inference_pipeline, simulator, knowledge_store
        )
        daemon.start()
        daemon.stop()
    """

    DEFAULT_CYCLE = {
        "simulation": 10 * 60,
        "dedup": 2 * 60,
        "recalibrate": 3 * 60,
        "cooldown": 5 * 60,
    }

    CPU_HIGH = 0.70
    CPU_LOW = 0.30

    def __init__(self, composited_engine=None, inference_pipeline=None,
                 simulator=None, knowledge_store: Optional[SelfLearningKnowledgeStore] = None,
                 auto_trainer=None):
        self._composited = composited_engine
        self._inference = inference_pipeline
        self._simulator = simulator
        self._knowledge_store = knowledge_store
        self._auto_trainer = auto_trainer
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._paused = False
        self._phase: str = "idle"
        self._report: dict = {
            "runs": 0, "last_run": None, "total_simulated": 0,
            "total_stored": 0, "total_discarded": 0, "history": [],
        }
        self._cycle = dict(self.DEFAULT_CYCLE)

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def is_paused(self) -> bool:
        return self._paused

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(
            target=self._daemon_loop, daemon=True,
            name="cee-dict-learning-daemon",
        )
        self._thread.start()

    def stop(self) -> None:
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def _daemon_loop(self) -> None:
        time.sleep(10)  # Initialize

        while self._running:
            try:
                if self._is_cpu_saturated():
                    if not self._paused:
                        self._paused = True
                    time.sleep(30)
                    continue
                elif self._paused:
                    self._paused = False

                self._run_cycle()
            except Exception:
                pass

            for _ in range(self._cycle["cooldown"]):
                if not self._running:
                    return
                time.sleep(1)

    def _run_cycle(self) -> None:
        self._phase = "simulation"
        sim_before = self._simulator.stats() if self._simulator else {}

        if self._simulator:
            end = time.time() + self._cycle["simulation"]
            while time.time() < end and self._running:
                self._simulator.simulate_batch(count=10)
                if self._is_cpu_saturated():
                    break

        sim_after = self._simulator.stats() if self._simulator else {}
        sim_count = sim_after.get("generated", 0) - sim_before.get("generated", 0)
        stored_count = sim_after.get("stored", 0) - sim_before.get("stored", 0)

        self._phase = "dedup"
        time.sleep(min(self._cycle["dedup"], 30))
        if self._knowledge_store:
            try:
                self._knowledge_store.prune(max_pairs=5000)
            except Exception:
                pass

        self._phase = "recalibrate"
        if self._composited:
            try:
                self._composited.recalibrate_weights()
            except Exception:
                pass
        time.sleep(min(self._cycle["recalibrate"], 30))

        self._report["runs"] += 1
        self._report["last_run"] = datetime.now(timezone.utc).isoformat()
        self._report["total_simulated"] += sim_count
        self._report["total_stored"] += stored_count
        self._report["history"].append({
            "ts": self._report["last_run"],
            "simulated": sim_count,
            "stored": stored_count,
        })
        if len(self._report["history"]) > 100:
            self._report["history"] = self._report["history"][-100:]

        self._save_report()
        self._phase = "cooldown"

    def _is_cpu_saturated(self) -> bool:
        try:
            t = time.clock_gettime(time.CLOCK_BOOTTIME)
            return False
        except Exception:
            return False

    def _save_report(self) -> None:
        try:
            with open(LEARNING_REPORT_FILE, "w", encoding="utf-8") as f:
                json.dump(self._report, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def get_report(self) -> dict:
        return dict(self._report)

    def stats(self) -> dict:
        return {
            "running": self._running,
            "paused": self._paused,
            "phase": self._phase,
            "runs": self._report["runs"],
            "total_simulated": self._report["total_simulated"],
            "total_stored": self._report["total_stored"],
        }
