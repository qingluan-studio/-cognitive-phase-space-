"""
training_monitor.py —— 训练后台监控

实时监控训练状态：
- Loss / PPL 曲线
- 训练进度
- 能量消耗
- 专家激活热力图
- 速度 / 剩余时间估计

全部用虚拟电，不花一分钱😂
"""

import os
import json
import time
import threading
from dataclasses import dataclass, field, asdict
from typing import Dict, Optional, Any, List, Callable
from collections import deque


@dataclass
class MonitorData:
    """监控数据"""
    model_name: str = ""
    model_type: str = ""
    total_params: str = ""
    status: str = "idle"  # idle / training / paused / completed
    start_time: float = 0.0
    elapsed_time: float = 0.0
    eta: float = 0.0

    current_epoch: int = 0
    total_epochs: int = 0
    current_step: int = 0
    total_steps: int = 0
    epoch_progress: float = 0.0
    overall_progress: float = 0.0

    train_loss: float = 0.0
    val_loss: float = 0.0
    perplexity: float = float("inf")
    best_val_loss: float = float("inf")
    best_epoch: int = 0

    learning_rate: float = 0.0
    gradient_norm: float = 0.0

    energy_consumed: float = 0.0
    energy_remaining: float = 0.0
    energy_rate: float = 0.0

    loss_history: List[float] = field(default_factory=list)
    val_loss_history: List[float] = field(default_factory=list)
    ppl_history: List[float] = field(default_factory=list)
    energy_history: List[float] = field(default_factory=list)

    expert_activation: List[Dict[str, Any]] = field(default_factory=list)
    gating_stats: Dict[str, float] = field(default_factory=dict)

    samples_per_second: float = 0.0
    tokens_per_second: float = 0.0

    logs: List[str] = field(default_factory=list)


class TrainingMonitor:
    """
    训练监控器。

    特性：
    - 实时收集训练指标
    - 计算速度和 ETA
    - 追踪能量消耗
    - 记录专家激活情况
    - 支持回调（用于 Web 推送）
    - 保存监控历史
    """

    def __init__(self, model_name: str = "", save_dir: str = ""):
        self.data = MonitorData(model_name=model_name)
        self._callbacks: List[Callable[[MonitorData], None]] = []
        self._lock = threading.Lock()
        self._save_dir = save_dir
        self._last_update = 0.0
        self._update_interval = 0.5  # 秒

        # 滑动窗口用于速度计算
        self._step_times = deque(maxlen=50)
        self._step_samples = deque(maxlen=50)

    # ------------------------------------------------------------------ #
    # 基础状态
    # ------------------------------------------------------------------ #

    def start_training(
        self,
        model_name: str = "",
        model_type: str = "",
        total_params: str = "",
        total_epochs: int = 0,
        total_steps: int = 0,
        learning_rate: float = 0.0,
        energy_initial: float = 0.0,
    ):
        """开始训练"""
        with self._lock:
            if model_name:
                self.data.model_name = model_name
            if model_type:
                self.data.model_type = model_type
            if total_params:
                self.data.total_params = total_params

            self.data.status = "training"
            self.data.start_time = time.time()
            self.data.total_epochs = total_epochs
            self.data.total_steps = total_steps
            self.data.learning_rate = learning_rate
            self.data.energy_remaining = energy_initial

            self.data.loss_history = []
            self.data.val_loss_history = []
            self.data.ppl_history = []
            self.data.energy_history = []
            self.data.logs = []

            self._step_times.clear()
            self._step_samples.clear()

            self._log(f"训练开始：{model_name} ({total_params})")
            self._log(f"总轮次：{total_epochs}，总步数：{total_steps}")

        self._notify()
        self._save()

    def end_training(self, status: str = "completed"):
        """结束训练"""
        with self._lock:
            self.data.status = status
            self.data.elapsed_time = time.time() - self.data.start_time
            self.data.overall_progress = 1.0
            self.data.eta = 0.0
            self._log(f"训练结束：{status}")
            self._log(f"总耗时：{self.data.elapsed_time:.2f}s")
            self._log(f"最佳 Val Loss：{self.data.best_val_loss:.4f} (Epoch {self.data.best_epoch})")
        self._notify()
        self._save()

    def pause_training(self):
        with self._lock:
            self.data.status = "paused"
            self._log("训练暂停")
        self._notify()

    def resume_training(self):
        with self._lock:
            self.data.status = "training"
            self._log("训练恢复")
        self._notify()

    # ------------------------------------------------------------------ #
    # 训练进度更新
    # ------------------------------------------------------------------ #

    def update_step(
        self,
        epoch: int,
        step: int,
        loss: float,
        batch_size: int = 1,
        learning_rate: Optional[float] = None,
        gradient_norm: Optional[float] = None,
        energy_cost: float = 0.0,
    ):
        """更新单步训练数据"""
        now = time.time()
        if now - self._last_update < self._update_interval:
            return
        self._last_update = now

        with self._lock:
            self.data.status = "training"
            self.data.current_epoch = epoch
            self.data.current_step = step
            self.data.train_loss = loss

            if learning_rate is not None:
                self.data.learning_rate = learning_rate
            if gradient_norm is not None:
                self.data.gradient_norm = gradient_norm

            # 进度
            if self.data.total_steps > 0:
                self.data.epoch_progress = min(1.0, step / self.data.total_steps)
            if self.data.total_epochs > 0:
                self.data.overall_progress = min(
                    1.0, (epoch - 1 + self.data.epoch_progress) / self.data.total_epochs
                )

            # 能量
            self.data.energy_consumed += energy_cost
            self.data.energy_remaining = max(0, self.data.energy_remaining - energy_cost)

            # 速度
            self._step_times.append(now)
            self._step_samples.append(batch_size)
            if len(self._step_times) >= 2:
                dt = self._step_times[-1] - self._step_times[0]
                total_samples = sum(self._step_samples)
                if dt > 0:
                    self.data.samples_per_second = total_samples / dt

            # ETA
            if self.data.overall_progress > 0 and self.data.samples_per_second > 0:
                elapsed = now - self.data.start_time
                self.data.elapsed_time = elapsed
                total_estimated = elapsed / self.data.overall_progress
                self.data.eta = max(0, total_estimated - elapsed)

            # 历史
            self.data.loss_history.append(loss)
            self.data.energy_history.append(self.data.energy_consumed)
            if len(self.data.loss_history) > 500:
                self.data.loss_history = self.data.loss_history[-500:]
                self.data.energy_history = self.data.energy_history[-500:]

        self._notify()

    def update_epoch_end(
        self,
        epoch: int,
        train_loss: float,
        val_loss: float,
        perplexity: float,
        energy_cost: float = 0.0,
    ):
        """epoch 结束更新"""
        with self._lock:
            self.data.current_epoch = epoch
            self.data.train_loss = train_loss
            self.data.val_loss = val_loss
            self.data.perplexity = perplexity
            self.data.epoch_progress = 1.0

            if val_loss < self.data.best_val_loss:
                self.data.best_val_loss = val_loss
                self.data.best_epoch = epoch
                self._log(f"Epoch {epoch}: 新最佳！Val Loss: {val_loss:.4f}, PPL: {perplexity:.2f}")
            else:
                self._log(f"Epoch {epoch}: Val Loss: {val_loss:.4f}, PPL: {perplexity:.2f}")

            self.data.val_loss_history.append(val_loss)
            self.data.ppl_history.append(perplexity)
            self.data.energy_consumed += energy_cost
            self.data.energy_remaining = max(0, self.data.energy_remaining - energy_cost)

            if self.data.total_epochs > 0:
                self.data.overall_progress = min(1.0, epoch / self.data.total_epochs)

            self.data.elapsed_time = time.time() - self.data.start_time
            if self.data.overall_progress > 0:
                total_estimated = self.data.elapsed_time / self.data.overall_progress
                self.data.eta = max(0, total_estimated - self.data.elapsed_time)

        self._notify()
        self._save()

    # ------------------------------------------------------------------ #
    # 专家激活监控（MoE 专用）
    # ------------------------------------------------------------------ #

    def update_expert_activation(self, expert_activations: List[Dict[str, Any]]):
        """更新专家激活情况（MoE 模型用）"""
        with self._lock:
            self.data.expert_activation = expert_activations
            # 统计每个专家的激活比例
            counts = {}
            for act in expert_activations:
                name = act.get("expert_name", f"expert_{act.get('expert_id', '?')}")
                weight = act.get("weight", 0.0)
                counts[name] = counts.get(name, 0) + weight
            self.data.gating_stats = counts
        self._notify()

    # ------------------------------------------------------------------ #
    # 日志
    # ------------------------------------------------------------------ #

    def log(self, message: str):
        """添加日志"""
        with self._lock:
            self._log(message)

    def _log(self, message: str):
        timestamp = time.strftime("%H:%M:%S")
        self.data.logs.append(f"[{timestamp}] {message}")
        if len(self.data.logs) > 200:
            self.data.logs = self.data.logs[-200:]

    # ------------------------------------------------------------------ #
    # 回调 / 通知
    # ------------------------------------------------------------------ #

    def add_callback(self, callback: Callable[[MonitorData], None]):
        """添加更新回调（用于 Web 推送等）"""
        self._callbacks.append(callback)

    def remove_callback(self, callback: Callable[[MonitorData], None]):
        self._callbacks.remove(callback)

    def _notify(self):
        """通知所有回调"""
        if not self._callbacks:
            return
        # 拷贝数据避免并发问题
        with self._lock:
            snapshot = MonitorData(**{k: v for k, v in asdict(self.data).items()})
        for cb in self._callbacks:
            try:
                cb(snapshot)
            except Exception:
                pass

    # ------------------------------------------------------------------ #
    # 持久化
    # ------------------------------------------------------------------ #

    def _save(self):
        """保存监控数据到 JSON"""
        if not self._save_dir:
            return
        try:
            os.makedirs(self._save_dir, exist_ok=True)
            path = os.path.join(self._save_dir, "monitor_data.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(asdict(self.data), f, indent=2, ensure_ascii=False, default=str)
        except Exception:
            pass

    def get_snapshot(self) -> Dict[str, Any]:
        """获取数据快照（字典形式）"""
        with self._lock:
            return asdict(self.data)

    def get_summary(self) -> Dict[str, Any]:
        """获取简洁摘要"""
        with self._lock:
            d = self.data
            return {
                "model_name": d.model_name,
                "status": d.status,
                "progress": round(d.overall_progress * 100, 1),
                "epoch": f"{d.current_epoch}/{d.total_epochs}",
                "step": f"{d.current_step}/{d.total_steps}",
                "train_loss": round(d.train_loss, 4),
                "val_loss": round(d.val_loss, 4),
                "perplexity": round(d.perplexity, 2),
                "best_val_loss": round(d.best_val_loss, 4) if d.best_val_loss != float("inf") else None,
                "energy_consumed": round(d.energy_consumed, 1),
                "energy_remaining": round(d.energy_remaining, 1),
                "eta": f"{int(d.eta // 60)}m {int(d.eta % 60)}s" if d.eta > 0 else "计算中...",
                "elapsed": f"{int(d.elapsed_time // 60)}m {int(d.elapsed_time % 60)}s",
                "samples_per_second": round(d.samples_per_second, 2),
                "total_params": d.total_params,
            }
