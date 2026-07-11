from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"
CYAN = "\033[36m"
WHITE = "\033[37m"

LOGO = rf"""{CYAN}
   ██████╗███████╗███████╗
  ██╔════╝██╔════╝██╔════╝
  ██║     █████╗  █████╗
  ██║     ██╔══╝  ██╔══╝
  ╚██████╗███████╗███████╗
   ╚═════╝╚══════╝╚══════╝
{RESET}"""


def _green(s: str) -> str:
    return f"{GREEN}{s}{RESET}"

def _red(s: str) -> str:
    return f"{RED}{s}{RESET}"

def _yellow(s: str) -> str:
    return f"{YELLOW}{s}{RESET}"

def _cyan(s: str) -> str:
    return f"{CYAN}{s}{RESET}"

def _bold(s: str) -> str:
    return f"{BOLD}{s}{RESET}"

def _dim(s: str) -> str:
    return f"{DIM}{s}{RESET}"

class CLIContext:
    def __init__(self) -> None:
        self.kb = None
        self.metrics = None
        self.health = None
        self.plugins = None

    def _ensure_kb(self) -> None:
        if self.kb is None:
            from cee.app.knowledge import KnowledgeBase
            self.kb = KnowledgeBase()

    def _ensure_metrics(self) -> None:
        if self.metrics is None:
            from cee.app.monitor import MetricsCollector
            self.metrics = MetricsCollector()

    def _ensure_health(self) -> None:
        if self.health is None:
            from cee.app.monitor import HealthChecker
            self.health = HealthChecker()

    def _ensure_plugins(self) -> None:
        if self.plugins is None:
            from cee.app.plugins import PluginManager
            self.plugins = PluginManager()


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cee",
        description="认知涌现引擎 CLI 工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", help="子命令")

    serve = sub.add_parser("serve", help="启动 HTTP 服务器")
    serve.add_argument("--host", default="0.0.0.0", help="绑定地址 (默认 0.0.0.0)")
    serve.add_argument("--port", type=int, default=8897, help="端口 (默认 8897)")
    serve.add_argument("--workers", type=int, default=1, help="Worker 数量")
    serve.add_argument("--reload", action="store_true", help="热重载模式")

    chat = sub.add_parser("chat", help="命令行聊天")
    chat.add_argument("--message", "-m", help="单次消息 (非交互模式)")
    chat.add_argument("--session", default="default", help="会话标识")
    chat.add_argument("--stream", action="store_true", help="流式输出")
    chat.add_argument("--deep-think", action="store_true", help="深度思考模式")

    search = sub.add_parser("search", help="搜索")
    search.add_argument("--query", "-q", required=True, help="搜索关键词")
    search.add_argument("--provider", default="builtin", help="搜索提供者")
    search.add_argument("--count", type=int, default=5, help="返回结果数")

    kb = sub.add_parser("knowledge", help="知识库管理")
    kb_subs = kb.add_subparsers(dest="kb_action", help="知识库操作")

    kb_add = kb_subs.add_parser("add", help="添加知识条目")
    kb_add.add_argument("--title", required=True, help="标题")
    kb_add.add_argument("--content", required=True, help="内容")
    kb_add.add_argument("--category", default="其他", help="分类")
    kb_add.add_argument("--tags", nargs="*", default=[], help="标签")
    kb_add.add_argument("--source", default="", help="来源")

    kb_subs.add_parser("list", help="列出所有知识条目")
    kb_subs.add_parser("categories", help="查看知识分类")

    kb_rm = kb_subs.add_parser("remove", help="删除知识条目")
    kb_rm.add_argument("--id", required=True, help="条目ID")

    kb_search = kb_subs.add_parser("search", help="搜索知识库")
    kb_search.add_argument("--keyword", default="", help="搜索关键词")
    kb_search.add_argument("--category", default=None, help="按分类过滤")
    kb_search.add_argument("--tags", nargs="*", default=None, help="按标签过滤")

    kb_import = kb_subs.add_parser("import", help="导入知识库")
    kb_import.add_argument("--file", required=True, help="JSON 文件路径")

    kb_export = kb_subs.add_parser("export", help="导出知识库")
    kb_export.add_argument("--file", required=True, help="输出 JSON 文件路径")

    stats = sub.add_parser("stats", help="统计信息")
    stats.add_argument("--format", choices=["json", "text"], default="text", help="输出格式")

    return parser


def cmd_serve(args: argparse.Namespace, _ctx: CLIContext) -> int:
    print(f"{_green('[serve]')} 启动服务器 {args.host}:{args.port} workers={args.workers} reload={args.reload}")
    try:
        import uvicorn
        uvicorn.run(
            "cee.app.mobile_server:app",
            host=args.host,
            port=args.port,
            workers=args.workers,
            reload=args.reload,
        )
    except ImportError:
        print(_red("[error] uvicorn 未安装"))
        return 1
    return 0


def cmd_chat(args: argparse.Namespace, _ctx: CLIContext) -> int:
    if args.message:
        print(f"{_cyan('[chat]')} {args.message}")
        print(f"{_dim('[info]')} session={args.session} stream={args.stream} deep_think={args.deep_think}")
        print(f"{_yellow('[response]')} 引擎已就绪，请使用 --message 发送消息。")
        return 0
    print(LOGO)
    print(f"{_bold('CEE 交互式聊天模式')} — session: {args.session}")
    print(f"{_dim('输入消息后回车，输入 /quit 退出，/help 查看帮助')}\n")
    msg_count = 0
    while True:
        try:
            user_input = input(f"{_green('>>>')} ").strip()
        except (EOFError, KeyboardInterrupt):
            print(f"\n{_dim('[info]')} 退出聊天")
            break
        if not user_input:
            continue
        if user_input == "/quit":
            print(f"{_dim('[info]')} 退出聊天")
            break
        if user_input == "/help":
            print(f"  /quit    退出聊天")
            print(f"  /help    显示帮助")
            print(f"  /stats   显示会话统计")
            continue
        if user_input == "/stats":
            print(f"  session: {args.session}, messages: {msg_count}")
            continue
        msg_count += 1
        if args.deep_think:
            print(f"{_magenta('[deep-think]')} 正在深度思考...")
        print(f"{_yellow(f'[#{msg_count}]')} 收到: {user_input[:80]}{'...' if len(user_input) > 80 else ''}")
    return 0


def cmd_search(args: argparse.Namespace, _ctx: CLIContext) -> int:
    print(f"{_cyan('[search]')} 查询: {args.query}")
    print(f"{_dim('[info]')} provider={args.provider} count={args.count}")
    print(f"{_yellow('[result]')} 搜索完成 (provider={args.provider})")
    return 0


def cmd_knowledge_add(args: argparse.Namespace, ctx: CLIContext) -> int:
    ctx._ensure_kb()
    assert ctx.kb is not None
    item = ctx.kb.add(
        title=args.title,
        content=args.content,
        category=args.category,
        tags=args.tags,
        source=args.source,
    )
    print(f"{_green('[ok]')} 条目已添加: {item.id} - {item.title} (分类: {item.category})")
    return 0


def cmd_knowledge_list(_args: argparse.Namespace, ctx: CLIContext) -> int:
    ctx._ensure_kb()
    assert ctx.kb is not None
    items = ctx.kb.list_all()
    print(f"{_bold('知识库条目')} — 共 {len(items)} 条\n")
    for item in items:
        tags_str = ", ".join(item.tags) if item.tags else "-"
        print(f"  {_cyan(item.id)} {_bold(item.title)}")
        print(f"    {_dim(f'分类: {item.category} | 评分: {item.quality_score:.2f} | 标签: {tags_str}')}")
    return 0


def cmd_knowledge_categories(_args: argparse.Namespace, ctx: CLIContext) -> int:
    ctx._ensure_kb()
    assert ctx.kb is not None
    stats = ctx.kb.get_category_stats()
    print(f"{_bold('知识分类')}\n")
    for cat_name, count in stats.items():
        bar = "█" * min(count, 20)
        print(f"  {_cyan(cat_name):<10s} {bar} {count}")
    return 0


def cmd_knowledge_remove(args: argparse.Namespace, ctx: CLIContext) -> int:
    ctx._ensure_kb()
    assert ctx.kb is not None
    ok = ctx.kb.remove(args.id)
    if ok:
        print(f"{_green('[ok]')} 条目已删除: {args.id}")
    else:
        print(f"{_red('[error]')} 条目不存在: {args.id}")
        return 1
    return 0


def cmd_knowledge_search(args: argparse.Namespace, ctx: CLIContext) -> int:
    ctx._ensure_kb()
    assert ctx.kb is not None
    results = ctx.kb.search(keyword=args.keyword, category=args.category, tags=args.tags)
    print(f"{_bold('搜索结果')} — {len(results)} 条匹配\n")
    for item in results:
        print(f"  {_cyan(item.id)} {_bold(item.title)} [{item.category}]")
        preview = item.content[:120].replace("\n", " ")
        print(f"    {_dim(preview)}...")
    return 0


def cmd_knowledge_import(args: argparse.Namespace, ctx: CLIContext) -> int:
    ctx._ensure_kb()
    assert ctx.kb is not None
    count = ctx.kb.import_json(args.file)
    print(f"{_green('[ok]')} 导入完成: {count} 条")
    return 0


def cmd_knowledge_export(args: argparse.Namespace, ctx: CLIContext) -> int:
    ctx._ensure_kb()
    assert ctx.kb is not None
    ctx.kb.export_json(args.file)
    print(f"{_green('[ok]')} 导出完成: {args.file}")
    return 0


def cmd_stats(args: argparse.Namespace, ctx: CLIContext) -> int:
    ctx._ensure_kb()
    ctx._ensure_health()
    ctx._ensure_metrics()
    ctx._ensure_plugins()
    assert ctx.kb is not None
    assert ctx.health is not None
    assert ctx.metrics is not None
    assert ctx.plugins is not None

    data = {
        "knowledge": {
            "total": ctx.kb.total_count,
            "avg_quality": round(ctx.kb.avg_quality, 3),
            "categories": ctx.kb.get_category_stats(),
        },
        "plugins": {
            "total": len(ctx.plugins.list_plugins()),
            "loaded": len(ctx.plugins.list_loaded()),
        },
        "health": {
            "status": ctx.health.check().to_dict(),
        },
        "metrics": ctx.metrics.snapshot().to_dict(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    if args.format == "json":
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print(f"\n{_bold('=== CEE 系统统计 ===')}\n")
        print(f"{_cyan('知识库')}: {ctx.kb.total_count} 条, 平均质量 {ctx.kb.avg_quality:.3f}")
        print(f"{_cyan('插件')}: {len(ctx.plugins.list_plugins())} 个注册, {len(ctx.plugins.list_loaded())} 个已加载")
        print(f"{_cyan('健康状态')}: {ctx.health.check().status}")
        print(f"{_cyan('指标')}: {ctx.metrics.snapshot().total_requests} 请求, "
              f"avg={ctx.metrics.snapshot().avg_response_ms:.1f}ms")
    return 0


COMMAND_MAP: dict[str, str] = {
    "serve": "cmd_serve",
    "chat": "cmd_chat",
    "search": "cmd_search",
}


def main(argv: Optional[list[str]] = None) -> int:
    parser = create_parser()
    args = parser.parse_args(argv)
    ctx = CLIContext()

    if not args.command:
        parser.print_help()
        return 1

    if args.command == "knowledge":
        action = getattr(args, "kb_action", None)
        if action == "add":
            return cmd_knowledge_add(args, ctx)
        elif action == "list":
            return cmd_knowledge_list(args, ctx)
        elif action == "categories":
            return cmd_knowledge_categories(args, ctx)
        elif action == "remove":
            return cmd_knowledge_remove(args, ctx)
        elif action == "search":
            return cmd_knowledge_search(args, ctx)
        elif action == "import":
            return cmd_knowledge_import(args, ctx)
        elif action == "export":
            return cmd_knowledge_export(args, ctx)
        else:
            subparser = [a for a in parser._subparsers._actions if hasattr(a, "choices")]
            if subparser and "knowledge" in subparser[0].choices:
                subparser[0].choices["knowledge"].print_help()
            return 1

    cmd_name = COMMAND_MAP.get(args.command, f"cmd_{args.command}")
    func = globals().get(cmd_name)
    if func is None:
        print(_red(f"[error] 未知命令: {args.command}"))
        return 1
    return func(args, ctx)


if __name__ == "__main__":
    sys.exit(main())
