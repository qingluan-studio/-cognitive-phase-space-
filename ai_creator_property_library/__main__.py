#!/usr/bin/env python3
"""
AI 造物引擎 — 交互式命令行界面

核心理念：创造而非融合
- 你提供 N 条属性（如：不可伪造、远程连接、身份验证）
- AI 创造一种全新的物质/实体，至少包含这些属性
- 可能涌现额外的、不可控的属性

用法：
    python -m ai_creator                    # 启动交互模式
    python -m ai_creator create "不可伪造,远程连接,身份验证"  # 直接创造
    python -m ai_creator list                # 查看历史
"""

import sys
import json
import argparse
from datetime import datetime

from .creator import Creator, SimulatedAI
from .config import PROPERTY_LIBRARY


def print_banner():
    banner = """
╔══════════════════════════════════════════════════╗
║          ✨  AI 造物引擎  ✨                      ║
║     创造而非融合 · 涌现而非叠加                  ║
║                                                  ║
║  输入属性 → AI创造全新造物 → 至少含指定属性      ║
║  可能涌现不可控的额外属性                        ║
╚══════════════════════════════════════════════════╝
"""
    print(banner)


def show_library():
    """显示可用的预设属性"""
    print("\n📚 可用属性库（可直接使用）：")
    print("-" * 40)
    categories = {}
    for name, info in PROPERTY_LIBRARY.items():
        cat = info.get("category", "other")
        categories.setdefault(cat, []).append(name)

    cat_names = {
        "security": "🔒 安全类",
        "network": "🌐 网络类",
        "structure": "🏗️ 结构类",
        "physical": "⚛️ 物理类",
        "mental": "🧠 精神类",
        "spatial": "🌌 空间类",
        "temporal": "⏳ 时间类",
        "biological": "🧬 生物类",
        "information": "💾 信息类",
    }

    for cat, names in sorted(categories.items()):
        label = cat_names.get(cat, f"📦 {cat}")
        print(f"\n  {label}：")
        for name in names:
            print(f"    • {name}")

    print(f"\n  💡 提示：也可以输入自定义属性，如：'可穿越结界'、'读取记忆'")
    print(f"  💡 提示：输入 'list' 查看历史造物，输入 'quit' 退出\n")


def cmd_create(args):
    """处理创造命令"""
    properties = [p.strip() for p in args.split(",") if p.strip()]
    if len(properties) < 1:
        print("❌ 至少需要指定 1 个属性")
        return

    creator = Creator()
    print(f"\n🎲 正在创造造物... 要求属性：{', '.join(properties)}")
    print(f"   （温度 {creator.ai.rng.random():.1f} × 创造性...）\n")

    result = creator.create(properties)

    # 输出造物
    print(result["description"])

    # 输出涌现报告
    print(creator.get_emergent_report(result))

    # 输出验证结果
    v = result["validation"]
    if v["all_core_satisfied"]:
        print("✅ 验证通过：所有核心属性均已满足")
    else:
        print(f"⚠️  部分属性可能未被充分体现：{', '.join(v['missing'])}")

    return result


def cmd_list_history(creator: Creator):
    """列出历史造物"""
    history = creator.list_history()
    if not history:
        print("\n📜 尚无造物记录。开始创造吧！\n")
        return

    print(f"\n📜 造物历史（共 {len(history)} 件）：")
    print("-" * 50)
    for h in history:
        core = " + ".join(h["core"][:2])
        if len(h["core"]) > 2:
            core += f" 等{len(h['core'])}项"
        emergent = f"，涌现 {len(h['emergent'])} 项" if h["emergent"] else ""
        print(f"  [{h['index']}] {h['name']}")
        print(f"      核心: {core}{emergent}")
        print(f"      时间: {h['time']}")
        print()


def interactive_mode():
    """交互式模式"""
    creator = Creator()
    show_help = True

    while True:
        try:
            user_input = input("\n🔮 请输入属性（用逗号分隔），或命令 > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\n👋 造物引擎关闭。愿你的造物在混沌中闪耀。")
            break

        if not user_input:
            continue

        cmd = user_input.lower().split()[0] if user_input else ""

        if cmd in ("quit", "exit", "q", "退出"):
            print("👋 造物引擎关闭。愿你的造物在混沌中闪耀。")
            break
        elif cmd in ("help", "h", "帮助"):
            show_help_menu()
        elif cmd in ("library", "lib", "属性库"):
            show_library()
        elif cmd in ("list", "history", "历史"):
            cmd_list_history(creator)
        elif cmd in ("clear", "清空"):
            creator.history.clear()
            print("🗑️  历史已清空")
        elif cmd in ("save", "保存"):
            save_history(creator)
        elif cmd in ("load", "加载"):
            load_history(creator)
        elif cmd in ("repeat", "重做"):
            repeat_last(creator)
        else:
            # 当作属性输入处理
            cmd_create(user_input)


def show_help_menu():
    """显示帮助菜单"""
    print("""
📖 造物引擎命令：

  直接输入属性     用逗号分隔，如: 不可伪造,远程连接,身份验证
  help / h         显示此帮助
  library / lib    查看可用属性库
  list / history   查看造物历史
  repeat / 重做    重新创造上一件造物
  save / 保存      保存造物历史到文件
  load / 加载      从文件加载造物历史
  clear / 清空     清空造物历史
  quit / q         退出

💡 核心哲学：
  不是融合(A+B+C)，而是创造一种全新的存在
  产出至少包含指定属性，可能涌现额外属性
""")


def repeat_last(creator: Creator):
    """重新创造上一件造物"""
    if not creator.history:
        print("⚠️  尚无造物可重做")
        return
    last = creator.history[-1]
    print(f"\n🔄 重新创造：{last['name']} 的核心属性...")
    cmd_create(",".join(last["core_properties"]))


def save_history(creator: Creator):
    """保存历史到文件"""
    if not creator.history:
        print("⚠️  无历史可保存")
        return
    filename = f"creations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(creator.history, f, ensure_ascii=False, indent=2, default=str)
    print(f"💾  已保存 {len(creator.history)} 件造物到: {filename}")


def load_history(creator: Creator):
    """从文件加载历史"""
    import glob
    files = sorted(glob.glob("creations_*.json"), reverse=True)
    if not files:
        print("⚠️  未找到保存的造物文件")
        return
    print("\n📂 可用的造物文件：")
    for i, f in enumerate(files, 1):
        print(f"  [{i}] {f}")
    try:
        choice = int(input("选择文件编号 > ").strip())
        if 1 <= choice <= len(files):
            with open(files[choice - 1], "r", encoding="utf-8") as f:
                data = json.load(f)
            creator.history.extend(data)
            print(f"📥 已加载 {len(data)} 件造物")
        else:
            print("❌ 编号无效")
    except (ValueError, EOFError):
        print("❌ 输入无效")


def main():
    parser = argparse.ArgumentParser(
        description="AI 造物引擎 — 创造而非融合",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  %(prog)s                  启动交互模式
  %(prog)s "不可伪造,远程连接,身份验证"    直接创造
  %(prog)s create "自我复制,能量转化,永不消逝"
        """,
    )
    parser.add_argument(
        "create",
        nargs="?",
        help="指定属性进行创造（逗号分隔）",
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="查看历史造物（需要交互模式）",
    )

    args = parser.parse_args()

    if args.list:
        creator = Creator()
        cmd_list_history(creator)
        return

    if args.create:
        cmd_create(args.create)
        return

    # 默认进入交互模式
    print_banner()
    interactive_mode()


if __name__ == "__main__":
    main()
