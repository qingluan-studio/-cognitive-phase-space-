"""
认知涌现引擎 — 实时数据追踪器
=============================
原子写入 + jsonl变更日志 + 每日快照
自动保存: 每100次assembly或每60秒
"""

from __future__ import annotations

import json
import os
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .dicts.character_dict import DICT_DIR

CHANGELOG_FILE = DICT_DIR / "_changelog.jsonl"
SNAPSHOT_DIR = DICT_DIR / "snapshots"
SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class ChangelogEntry:
    ts: str
    op: str
    dict_name: str
    key: str
    old_weight: Optional[float] = None
    new_weight: Optional[float] = None

    def to_line(self) -> str:
        return json.dumps({
            "ts": self.ts, "op": self.op, "dict": self.dict_name,
            "key": self.key, "old_w": self.old_weight, "new_w": self.new_weight,
        }, ensure_ascii=False)


class RealtimeDataTracker:
    """
    实时数据持久化追踪器

    特性:
    - 原子写入: write temp → os.rename
    - 变更日志: 每条 mutation 写入 _changelog.jsonl
    - 自动保存: 每100次assembly 或 每60秒
    - 每日快照: 保留7天

    用法:
        tracker = RealtimeDataTracker(composited_engine)
        tracker.record("add", "character", "中", new_weight=0.95)
        tracker.record_assembly()
        tracker.create_daily_snapshot()
    """

    MAX_BUFFER = 100
    AUTO_FLUSH_INTERVAL = 60

    def __init__(self, composited_engine=None):
        self._composited = composited_engine
        self._log_buffer: deque[ChangelogEntry] = deque()
        self._lock = threading.RLock()
        self._assembly_count = 0
        self._last_flush = time.time()
        self._stats = {"total_ops": 0, "total_saves": 0, "total_snapshots": 0}

    def record(self, op: str, dict_name: str, key: str,
               old_weight: Optional[float] = None,
               new_weight: Optional[float] = None) -> None:
        with self._lock:
            entry = ChangelogEntry(
                ts=datetime.now(timezone.utc).isoformat(),
                op=op, dict_name=dict_name, key=key,
                old_weight=old_weight, new_weight=new_weight,
            )
            self._log_buffer.append(entry)
            self._stats["total_ops"] += 1

            if len(self._log_buffer) >= self.MAX_BUFFER:
                self._flush()

    def record_assembly(self) -> None:
        with self._lock:
            self._assembly_count += 1
            if (self._assembly_count >= self.MAX_BUFFER or
                    time.time() - self._last_flush >= self.AUTO_FLUSH_INTERVAL):
                self._flush()

    def _flush(self) -> None:
        if not self._log_buffer:
            return

        try:
            temp_file = str(CHANGELOG_FILE) + ".tmp"
            with open(temp_file, "a", encoding="utf-8") as f:
                while self._log_buffer:
                    entry = self._log_buffer.popleft()
                    f.write(entry.to_line() + "\n")
            os.rename(temp_file, str(CHANGELOG_FILE))
        except Exception:
            pass

        self._assembly_count = 0
        self._last_flush = time.time()
        self._stats["total_saves"] += 1

    def force_save(self) -> None:
        with self._lock:
            self._flush()
            if self._composited:
                try:
                    self._composited._char._load_from_file()
                except Exception:
                    pass

    def create_daily_snapshot(self) -> Optional[str]:
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        snap_file = SNAPSHOT_DIR / f"snapshot_{date_str}.json"

        if snap_file.exists():
            return str(snap_file)

        snapshot = {
            "date": date_str,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "stats": dict(self._stats),
        }

        if self._composited:
            snapshot["engine_stats"] = self._composited.stats()

        try:
            temp_file = str(snap_file) + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, ensure_ascii=False, indent=2)
            os.rename(temp_file, str(snap_file))
            self._stats["total_snapshots"] += 1
            self._cleanup_old_snapshots()
            return str(snap_file)
        except Exception:
            return None

    def _cleanup_old_snapshots(self, keep_days: int = 7) -> None:
        cutoff = time.time() - (keep_days * 86400)
        for snap in SNAPSHOT_DIR.glob("snapshot_*.json"):
            try:
                if snap.stat().st_mtime < cutoff:
                    snap.unlink()
            except Exception:
                pass

    def stats(self) -> dict:
        with self._lock:
            return {
                **self._stats,
                "buffer_size": len(self._log_buffer),
                "assembly_count": self._assembly_count,
            }
