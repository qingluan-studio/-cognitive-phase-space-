"""
认知闹钟 (Cognitive Alarm)

为认知融合引擎的本地学习系统提供定时唤醒功能。
连接现实世界时间，到点自动启动学习守护进程。

用法:
    # 单次唤醒：3小时后启动学习
    python scripts/cognitive_alarm.py --mode once --hours 3
    
    # 每日唤醒：每天晚上10点自动学习
    python scripts/cognitive_alarm.py --mode daily --time "22:00"
    
    # 周期性唤醒：每2小时学习一次
    python scripts/cognitive_alarm.py --mode interval --hours 2
    
    # 交互式设置
    python scripts/cognitive_alarm.py --interactive
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# 配置文件路径
CONFIG_FILE = Path(__file__).parent.parent / ".cee_storage" / "alarm_config.json"
LOG_FILE = Path(__file__).parent.parent / ".cee_storage" / "alarm_log.json"


@dataclass
class AlarmConfig:
    """闹钟配置"""
    mode: str = "once"           # once / daily / interval
    target_time: str = ""        # 目标时间 (HH:MM 格式)
    hours: float = 3.0           # 多少小时后唤醒
    action: str = "learn"        # 唤醒后执行的动作
    enabled: bool = True         # 是否启用
    last_triggered: str = ""     # 上次触发时间
    next_trigger: str = ""       # 下次触发时间
    repeat: bool = False         # 是否重复
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "AlarmConfig":
        return cls(**data)


class CognitiveAlarm:
    """
    认知闹钟
    
    功能:
    1. 定时唤醒学习守护进程
    2. 支持单次/每日/周期性唤醒
    3. 保存唤醒日志
    4. 支持交互式设置
    """
    
    def __init__(self):
        self.config = self._load_config()
        self._timer: threading.Timer | None = None
        self._running = False
        self._thread: threading.Thread | None = None
    
    def _load_config(self) -> AlarmConfig:
        """加载配置"""
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return AlarmConfig.from_dict(data)
            except Exception:
                pass
        return AlarmConfig()
    
    def _save_config(self) -> None:
        """保存配置"""
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(self.config.to_dict(), f, ensure_ascii=False, indent=2)
    
    def _log_trigger(self, message: str) -> None:
        """记录触发日志"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "config": self.config.to_dict(),
        }
        
        logs = []
        if LOG_FILE.exists():
            try:
                with open(LOG_FILE, "r", encoding="utf-8") as f:
                    logs = json.load(f)
            except Exception:
                pass
        
        logs.append(log_entry)
        
        # 只保留最近100条
        logs = logs[-100:]
        
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)
    
    def _calculate_next_trigger(self) -> datetime | None:
        """计算下次触发时间"""
        now = datetime.now()
        
        if self.config.mode == "once":
            # 单次：当前时间 + hours
            return now + timedelta(hours=self.config.hours)
        
        elif self.config.mode == "daily":
            # 每日：今天的目标时间
            if not self.config.target_time:
                return None
            
            hour, minute = map(int, self.config.target_time.split(":"))
            target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            if target <= now:
                # 如果今天的时间已过，设到明天
                target += timedelta(days=1)
            
            return target
        
        elif self.config.mode == "interval":
            # 周期性：上次触发 + hours
            if self.config.last_triggered:
                last = datetime.fromisoformat(self.config.last_triggered)
                return last + timedelta(hours=self.config.hours)
            else:
                return now + timedelta(hours=self.config.hours)
        
        return None
    
    def _time_until_trigger(self) -> float:
        """计算距离下次触发还有多少秒"""
        next_trigger = self._calculate_next_trigger()
        if next_trigger is None:
            return -1
        
        delta = (next_trigger - datetime.now()).total_seconds()
        return max(0, delta)
    
    def _on_trigger(self) -> None:
        """触发回调"""
        now = datetime.now()
        self.config.last_triggered = now.isoformat()
        
        print(f"\n{'='*60}")
        print(f"⏰ 认知闹钟唤醒！")
        print(f"   时间: {now.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   动作: {self.config.action}")
        print(f"{'='*60}\n")
        
        # 执行动作
        if self.config.action == "learn":
            self._start_learning()
        elif self.config.action == "train":
            self._start_training()
        elif self.config.action == "dream":
            self._start_dreaming()
        else:
            print(f"   未知动作: {self.config.action}")
        
        self._log_trigger(f"闹钟触发: {self.config.action}")
        
        # 如果是重复模式，重新调度
        if self.config.repeat or self.config.mode in ["daily", "interval"]:
            self._schedule_next()
        else:
            self.config.enabled = False
            self._save_config()
    
    def _start_learning(self) -> None:
        """启动学习"""
        try:
            from src.cee.app.local_llm.local_inference import LocalInferenceEngine
            
            print("   🧠 启动认知学习引擎...")
            engine = LocalInferenceEngine()
            
            # 启动后台组件
            if hasattr(engine, '_auto_learner') and engine._auto_learner:
                engine._auto_learner.start()
                print("   ✅ 自动学习器已启动")
            
            if hasattr(engine, '_learning_daemon') and engine._learning_daemon:
                engine._learning_daemon.start()
                print("   ✅ 学习守护进程已启动")
            
            if hasattr(engine, '_auto_trainer') and engine._auto_trainer:
                engine._auto_trainer.start()
                print("   ✅ 后台训练器已启动")
            
            print("   🚀 学习系统全速运行中！即使关闭浏览器也会持续学习。")
            
        except Exception as e:
            print(f"   ❌ 启动学习引擎失败: {e}")
    
    def _start_training(self) -> None:
        """启动训练"""
        print("   🏋️ 启动训练任务...")
        print("   (训练功能需要配置GPU环境)")
    
    def _start_dreaming(self) -> None:
        """启动梦境巩固"""
        try:
            from src.cee.app.local_llm.dream_consolidator import DreamConsolidator
            
            print("   🌙 启动梦境巩固...")
            consolidator = DreamConsolidator()
            consolidator.consolidate()
            print("   ✅ 梦境巩固完成")
            
        except Exception as e:
            print(f"   ❌ 梦境巩固失败: {e}")
    
    def _schedule_next(self) -> None:
        """调度下次触发"""
        if not self.config.enabled:
            return
        
        seconds = self._time_until_trigger()
        if seconds < 0:
            print("   ⚠️ 无法计算下次触发时间")
            return
        
        next_trigger = self._calculate_next_trigger()
        if next_trigger:
            self.config.next_trigger = next_trigger.isoformat()
            self._save_config()
        
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        
        print(f"   ⏳ 下次唤醒: {next_trigger.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   ⏳ 还有: {hours}小时{minutes}分钟")
        print(f"   ⏳ 等待中... (按Ctrl+C取消)\n")
        
        self._timer = threading.Timer(seconds, self._on_trigger)
        self._timer.daemon = True
        self._timer.start()
    
    def start(self) -> None:
        """启动闹钟"""
        if not self.config.enabled:
            print("闹钟已禁用，请先启用")
            return
        
        if self._running:
            print("闹钟已在运行中")
            return
        
        self._running = True
        
        print("=" * 60)
        print("⏰ 认知闹钟已启动")
        print("=" * 60)
        print(f"   模式: {self.config.mode}")
        print(f"   动作: {self.config.action}")
        
        if self.config.mode == "once":
            print(f"   将在 {self.config.hours} 小时后唤醒")
        elif self.config.mode == "daily":
            print(f"   每日 {self.config.target_time} 唤醒")
        elif self.config.mode == "interval":
            print(f"   每 {self.config.hours} 小时唤醒一次")
        
        print("=" * 60)
        
        self._schedule_next()
        
        # 保持主线程运行
        try:
            while self._running and self._timer and self._timer.is_alive():
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n   🛑 用户取消")
            self.stop()
    
    def stop(self) -> None:
        """停止闹钟"""
        self._running = False
        if self._timer:
            self._timer.cancel()
        print("   ⏹️ 闹钟已停止")
    
    def set_once(self, hours: float, action: str = "learn") -> None:
        """设置单次唤醒"""
        self.config = AlarmConfig(
            mode="once",
            hours=hours,
            action=action,
            enabled=True,
            repeat=False,
        )
        self._save_config()
        print(f"✅ 已设置: {hours}小时后执行 '{action}'")
    
    def set_daily(self, time_str: str, action: str = "learn") -> None:
        """设置每日唤醒"""
        self.config = AlarmConfig(
            mode="daily",
            target_time=time_str,
            action=action,
            enabled=True,
            repeat=True,
        )
        self._save_config()
        print(f"✅ 已设置: 每日 {time_str} 执行 '{action}'")
    
    def set_interval(self, hours: float, action: str = "learn") -> None:
        """设置周期性唤醒"""
        self.config = AlarmConfig(
            mode="interval",
            hours=hours,
            action=action,
            enabled=True,
            repeat=True,
        )
        self._save_config()
        print(f"✅ 已设置: 每 {hours} 小时执行 '{action}'")
    
    def interactive_setup(self) -> None:
        """交互式设置"""
        print("=" * 60)
        print("⏰ 认知闹钟 - 交互式设置")
        print("=" * 60)
        
        print("\n选择模式:")
        print("  1. 单次唤醒")
        print("  2. 每日唤醒")
        print("  3. 周期性唤醒")
        
        choice = input("\n请输入 (1/2/3): ").strip()
        
        if choice == "1":
            hours = float(input("多少小时后唤醒? ").strip())
            action = input("执行什么动作? (learn/train/dream) [默认: learn]: ").strip() or "learn"
            self.set_once(hours, action)
            
        elif choice == "2":
            time_str = input("每日几点唤醒? (HH:MM, 例如 22:00): ").strip()
            action = input("执行什么动作? (learn/train/dream) [默认: learn]: ").strip() or "learn"
            self.set_daily(time_str, action)
            
        elif choice == "3":
            hours = float(input("每隔多少小时唤醒? ").strip())
            action = input("执行什么动作? (learn/train/dream) [默认: learn]: ").strip() or "learn"
            self.set_interval(hours, action)
        
        else:
            print("无效选择")
            return
        
        # 询问是否立即启动
        start_now = input("\n是否立即启动闹钟? (y/n) [默认: y]: ").strip().lower()
        if start_now in ["", "y", "yes"]:
            self.start()
    
    def status(self) -> None:
        """显示当前状态"""
        print("=" * 60)
        print("⏰ 认知闹钟状态")
        print("=" * 60)
        print(f"   模式: {self.config.mode}")
        print(f"   动作: {self.config.action}")
        print(f"   启用: {'是' if self.config.enabled else '否'}")
        print(f"   重复: {'是' if self.config.repeat else '否'}")
        
        if self.config.target_time:
            print(f"   目标时间: {self.config.target_time}")
        if self.config.hours:
            print(f"   间隔: {self.config.hours}小时")
        
        if self.config.last_triggered:
            print(f"   上次触发: {self.config.last_triggered}")
        if self.config.next_trigger:
            print(f"   下次触发: {self.config.next_trigger}")
        
        # 显示日志
        if LOG_FILE.exists():
            try:
                with open(LOG_FILE, "r", encoding="utf-8") as f:
                    logs = json.load(f)
                print(f"\n   历史触发: {len(logs)} 次")
                if logs:
                    print(f"   最近触发: {logs[-1]['timestamp']}")
            except Exception:
                pass
        
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="认知闹钟 - 定时唤醒学习系统")
    parser.add_argument("--mode", choices=["once", "daily", "interval"], help="闹钟模式")
    parser.add_argument("--hours", type=float, help="小时数 (用于once/interval模式)")
    parser.add_argument("--time", dest="time_str", help="时间点 HH:MM (用于daily模式)")
    parser.add_argument("--action", default="learn", choices=["learn", "train", "dream"], help="触发后执行的动作")
    parser.add_argument("--interactive", action="store_true", help="交互式设置")
    parser.add_argument("--status", action="store_true", help="显示状态")
    parser.add_argument("--stop", action="store_true", help="停止闹钟")
    
    args = parser.parse_args()
    
    alarm = CognitiveAlarm()
    
    if args.status:
        alarm.status()
        return 0
    
    if args.stop:
        alarm.stop()
        return 0
    
    if args.interactive:
        alarm.interactive_setup()
        return 0
    
    if args.mode == "once" and args.hours:
        alarm.set_once(args.hours, args.action)
        alarm.start()
    
    elif args.mode == "daily" and args.time_str:
        alarm.set_daily(args.time_str, args.action)
        alarm.start()
    
    elif args.mode == "interval" and args.hours:
        alarm.set_interval(args.hours, args.action)
        alarm.start()
    
    else:
        # 默认：显示帮助
        print("=" * 60)
        print("⏰ 认知闹钟")
        print("=" * 60)
        print()
        print("用法示例:")
        print("  # 3小时后启动学习")
        print("  python scripts/cognitive_alarm.py --mode once --hours 3")
        print()
        print("  # 每天晚上10点自动学习")
        print("  python scripts/cognitive_alarm.py --mode daily --time 22:00")
        print()
        print("  # 每2小时学习一次")
        print("  python scripts/cognitive_alarm.py --mode interval --hours 2")
        print()
        print("  # 交互式设置")
        print("  python scripts/cognitive_alarm.py --interactive")
        print()
        print("  # 查看状态")
        print("  python scripts/cognitive_alarm.py --status")
        print()
        print("=" * 60)
        
        # 提示当前时间
        now = datetime.now()
        print(f"\n当前系统时间: {now.strftime('%Y-%m-%d %H:%M:%S')}")
        print("你可以用 --interactive 进入交互设置，或告诉我你想几点唤醒。")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
