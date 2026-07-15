"""
循环学习计划配置器

每天20:00唤醒学习 → 次日16:00停止 → 晚上20:00再唤醒

用法:
    python scripts/setup_learning_cycle.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

CONFIG_DIR = Path(__file__).parent.parent / ".cee_storage"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def setup_cycle():
    """配置循环学习计划"""
    
    config = {
        "version": "1.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "schedule": {
            "wake_up_time": "20:00",      # 每天晚上8点唤醒
            "sleep_time": "16:00",        # 每天下午4点停止
            "timezone": "local",          # 使用本地时区
        },
        "learning": {
            "target_model": "DeepSeek-V4-Pro",  # 先消化这个大模型
            "action": "learn",                   # 学习模式
            "auto_stop_after_hours": 20,         # 20小时后自动停止
            "enable_dreaming": True,             # 闲置时启用梦境巩固
        },
        "cycle": {
            "enabled": True,
            "repeat_forever": True,
            "current_cycle": 1,
        },
    }
    
    config_file = CONFIG_DIR / "learning_cycle.json"
    with open(config_file, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    
    print("=" * 60)
    print("🔄 循环学习计划已配置")
    print("=" * 60)
    print()
    print("📅 日程安排:")
    print("   每天 20:00 → 唤醒，启动学习守护进程")
    print("   次日 16:00 → 自动停止，进入休息")
    print("   每天循环，永不停歇")
    print()
    print("🎯 当前目标:")
    print(f"   先消化模型: {config['learning']['target_model']}")
    print(f"   学习时长: {config['learning']['auto_stop_after_hours']}小时/轮")
    print()
    print("📁 配置保存:", config_file)
    print()
    print("🚀 启动命令:")
    print("   python scripts/cognitive_alarm.py --mode daily --time 20:00 --action learn")
    print()
    print("⚠️  注意: 需要保持终端运行，或使用 nohup 后台运行")
    print("   nohup python scripts/cognitive_alarm.py --mode daily --time 20:00 --action learn > alarm.log 2>&1 &")
    print()


if __name__ == "__main__":
    setup_cycle()
