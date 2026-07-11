"""
认知涌现引擎 — 后台自学习管道
=============================
独立线程运行，即使关闭浏览器也在持续学习

功能:
1. 定期扫描对话记忆，重新索引和优化知识库
2. 筛选高质量对话对，导出训练数据
3. 裁剪低质量老旧条目
4. 生成学习报告

运行方式:
    trainer = AutoTrainer(local_engine)
    trainer.start()   # 启动后台线程
    trainer.stop()    # 停止
"""

from __future__ import annotations

import json
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .knowledge_store import STORAGE_DIR, TRAINING_DATA_FILE

TRAINING_REPORT_FILE = STORAGE_DIR / "training_report.json"


class AutoTrainer:
    """
    后台自学习训练器

    参数:
        engine: LocalInferenceEngine 实例
        interval_minutes: 训练间隔(分)，默认 30
    """

    def __init__(self, local_engine=None, interval_minutes: int = 30):
        self._engine = local_engine
        self._interval = max(interval_minutes, 5)
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._report: dict = {"runs": 0, "last_run": None, "history": []}

    @property
    def is_running(self) -> bool:
        return self._running

    def start(self) -> None:
        """启动后台训练线程"""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._train_loop, daemon=True, name="cee-auto-trainer")
        self._thread.start()

    def stop(self) -> None:
        """停止后台训练"""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def _train_loop(self) -> None:
        """训练主循环"""
        time.sleep(10)  # 首次等待 10 秒让系统初始化

        while self._running:
            try:
                self._run_training_cycle()
            except Exception:
                pass

            for _ in range(self._interval * 60):
                if not self._running:
                    return
                time.sleep(1)

    def _run_training_cycle(self) -> None:
        """一个训练周期"""
        if not self._engine:
            return

        start = time.perf_counter()
        before = self._engine.stats()

        # 1. 裁剪冗余
        pruned = self._engine.store.prune(max_pairs=3000)

        # 2. 导出高质量训练数据
        training_data = self._engine.export_training_data()
        if training_data:
            self._export_training_data(training_data)

        # 3. 知识库去重优化
        deduped = self._deduplicate()

        after = self._engine.stats()
        elapsed = round(time.perf_counter() - start, 2)

        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "pairs_before": before.get("total_pairs", 0),
            "pairs_after": after.get("total_pairs", 0),
            "pruned": pruned,
            "deduplicated": deduped,
            "training_exported": len(training_data),
            "elapsed_s": elapsed,
        }

        self._report["runs"] += 1
        self._report["last_run"] = record["timestamp"]
        self._report["history"].append(record)
        if len(self._report["history"]) > 100:
            self._report["history"] = self._report["history"][-100:]

        self._save_report()

    def _deduplicate(self) -> int:
        """去重相似对话对"""
        if not self._engine:
            return 0

        seen: set[str] = set()
        unique: list = []
        removed = 0

        for pair in self._engine.store._pairs:
            key = pair.user_query.strip().lower()[:60]
            if key in seen:
                removed += 1
                continue
            seen.add(key)
            unique.append(pair)

        if removed > 0:
            self._engine.store._pairs = unique
            self._engine.store._rebuild_index()
            self._engine.store._dirty = True
            self._engine.store._save()

        return removed

    def _export_training_data(self, data: list[dict]) -> None:
        try:
            with open(TRAINING_DATA_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "version": "4.0",
                    "exported_at": datetime.now(timezone.utc).isoformat(),
                    "count": len(data),
                    "pairs": data,
                }, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def _save_report(self) -> None:
        try:
            with open(TRAINING_REPORT_FILE, "w", encoding="utf-8") as f:
                json.dump(self._report, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def get_report(self) -> dict:
        return dict(self._report)
