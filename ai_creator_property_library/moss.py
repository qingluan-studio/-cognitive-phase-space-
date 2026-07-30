"""
小 MOSS —— 基于吸收的开源仓库知识的简易智能体

不是大模型，而是一个"检索增强"的小智能体：
- 加载 Absorber 吸收的知识库
- 用关键词匹配 + 检索的方式回答问题
- 体现"吸收训练 + 免下载运行"的造物能力

用法：
    from ai_creator.moss import MiniMoss
    moss = MiniMoss()
    moss.absorb_repo("/path/to/repo")
    print(moss.chat("这个项目有哪些函数？"))
"""

import os
import re
import json
from typing import Optional, List
from collections import Counter

from .absorber import Absorber, KnowledgeBase


class MiniMoss:
    """
    小 MOSS 智能体

    能力：
    - absorb_repo(): 吸收一个开源仓库（大规模吸收 + 数据脱敏）
    - chat(): 基于吸收的知识回答问题（检索式，无需联网）
    - save()/load(): 知识持久化（免下载运行 —— 知识存在本地就能用）
    """

    # 问答模板：识别问题意图
    INTENT_PATTERNS = [
        (re.compile(r'(有哪些|列出|所有|一共).*(函数|function)', re.IGNORECASE), "list_functions"),
        (re.compile(r'(有哪些|列出|所有|一共).*(类|class)', re.IGNORECASE), "list_classes"),
        (re.compile(r'(有哪些|列出|所有|一共).*(文件|file)', re.IGNORECASE), "list_files"),
        (re.compile(r'(有哪些|什么).*(语言|language)', re.IGNORECASE), "list_languages"),
        # stats: 放宽 —— 含"统计/规模/多大/多少"或"几+量词"都算
        (re.compile(r'(统计|规模|多大|多少|几[个条项]|一共|总共|吸收了)', re.IGNORECASE), "stats"),
        (re.compile(r'(关键词|keyword|高频|主要)', re.IGNORECASE), "keywords"),
        (re.compile(r'(脱敏|敏感|security|redact|隐私)', re.IGNORECASE), "security"),
        (re.compile(r'(介绍|是什么|about|说明|描述|讲讲)', re.IGNORECASE), "intro"),
        # locate: 支持两种语序「X 在哪里」和「在哪里 X」
        (re.compile(r'(在哪里|哪个文件|在哪个|哪里有|where|定位|找一下|查找|搜)', re.IGNORECASE), "locate"),
        (re.compile(r'(帮助|help|用法|能做什么|功能|怎么用)', re.IGNORECASE), "help"),
    ]

    def __init__(self, name: str = "小MOSS"):
        self.name = name
        self.kb: Optional[KnowledgeBase] = None
        self.absorber = Absorber()
        self.conversation_history: List[tuple] = []

    # ==================== 吸收 ====================

    def absorb_repo(self, repo_path: str, verbose: bool = True) -> KnowledgeBase:
        """吸收一个开源仓库"""
        if verbose:
            print(f"🕳️  {self.name} 正在大规模吸收: {repo_path}")
        self.kb = self.absorber.absorb(repo_path)
        if verbose:
            print(f"✅ 吸收完成！")
            print(self.kb.summary())
        return self.kb

    def save(self, path: str = "moss_knowledge.json"):
        """把吸收的知识保存到本地（免下载运行的基础）"""
        if self.kb:
            self.absorber.save_kb(self.kb, path)
            return path
        return None

    def load(self, path: str):
        """从本地加载知识（无需重新吸收，免下载运行）"""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        # 重建知识库对象
        self.kb = KnowledgeBase(
            source=data["source"],
            absorbed_at=data["absorbed_at"],
            total_files=data["stats"]["total_files"],
            total_lines=data["stats"]["total_lines"],
            total_size=data["stats"]["total_size"],
            redacted_count=data["stats"]["redacted_count"],
            languages=data["stats"]["languages"],
            all_functions=data["all_functions"],
            all_classes=data["all_classes"],
            top_keywords=[tuple(kw) for kw in data["top_keywords"]],
        )
        # 简化的文件列表
        from .absorber import FileKnowledge
        self.kb.files = [
            FileKnowledge(
                path=f["path"], language=f["language"], lines=f["lines"],
                size=0, sha="", functions=f["functions"], classes=f["classes"],
                docstring=f["docstring"], keywords=f["keywords"], redacted=f["redacted"],
            )
            for f in data["files"]
        ]
        return self.kb

    # ==================== 对话 ====================

    def chat(self, question: str) -> str:
        """和小 MOSS 对话"""
        self.conversation_history.append(("user", question))

        if not self.kb:
            answer = ("我还没吸收任何仓库呢。\n"
                      "请先让我吸收一个：moss.absorb_repo('/path/to/repo')")
        else:
            intent = self._detect_intent(question)
            answer = self._answer(intent, question)

        self.conversation_history.append(("moss", answer))
        return answer

    def _detect_intent(self, question: str) -> str:
        for pattern, intent in self.INTENT_PATTERNS:
            if pattern.search(question):
                return intent
        return "default"

    def _answer(self, intent: str, question: str) -> str:
        kb = self.kb

        if intent == "list_functions":
            funcs = kb.all_functions[:30]
            return (f"📦 吸收到的函数（共 {len(kb.all_functions)} 个，展示前 30）：\n  "
                    + "\n  ".join(funcs))

        if intent == "list_classes":
            classes = kb.all_classes[:30]
            return (f"🏛️ 吸收到的类（共 {len(kb.all_classes)} 个，展示前 30）：\n  "
                    + "\n  ".join(classes))

        if intent == "list_files":
            files = [f.path for f in kb.files[:30]]
            return (f"📁 吸收到的文件（共 {kb.total_files} 个，展示前 30）：\n  "
                    + "\n  ".join(files))

        if intent == "list_languages":
            return (f"🌐 语言分布：\n  "
                    + "\n  ".join(f"{lang}: {cnt} 文件" for lang, cnt in kb.languages.items()))

        if intent == "stats":
            return (f"📊 吸收统计：\n"
                    f"  文件: {kb.total_files}\n"
                    f"  代码行: {kb.total_lines}\n"
                    f"  大小: {kb.total_size:,} 字节\n"
                    f"  函数: {len(kb.all_functions)}\n"
                    f"  类: {len(kb.all_classes)}\n"
                    f"  脱敏文件: {kb.redacted_count}")

        if intent == "keywords":
            kws = kb.top_keywords[:15]
            return (f"🔑 高频关键词 Top 15：\n  "
                    + "\n  ".join(f"{w} ({c})" for w, c in kws))

        if intent == "security":
            redacted = [f.path for f in kb.files if f.redacted]
            if redacted:
                return (f"🔐 检测到 {len(redacted)} 个含敏感信息的文件，已自动脱敏：\n  "
                        + "\n  ".join(redacted))
            return "🔐 本次吸收未检测到明显敏感信息（已脱敏检查通过）"

        if intent == "intro":
            # 找有 docstring 的文件作为项目介绍
            for f in kb.files:
                if f.docstring:
                    return (f"📝 项目介绍（来自 {f.path}）：\n{f.docstring}")
            return f"📝 这是一个包含 {kb.total_files} 个文件、{kb.total_lines} 行代码的项目。"

        if intent == "locate":
            # 从问题里提取目标关键词（去掉疑问词/量词/方位词等噪音）
            noise = ['在哪里', '哪个文件', '在哪个', '哪里有', '定位',
                     '找一下', '查找', '搜', 'where', '的', '是', '在',
                     '函数', 'function', '类', 'class', '文件', 'file',
                     '一下', '吗', '？', '?', '那个', '这个', '有']
            target = question
            for n in noise:
                target = target.replace(n, ' ')
            target = target.strip()
            # 取剩余的最长 token
            tokens = [t for t in re.split(r'[\s,，。]+', target) if len(t) >= 2]
            if tokens:
                # 用所有非空 token 作为搜索目标，命中任意一个就算
                hits = []
                for f in kb.files:
                    matched_targets = []
                    for tok in tokens:
                        tok_low = tok.lower()
                        if (tok_low in f.path.lower()
                                or tok_low in [fn.lower() for fn in f.functions]
                                or tok_low in [c.lower() for c in f.classes]
                                or tok_low in [k.lower() for k in f.keywords]):
                            matched_targets.append(tok)
                    if matched_targets:
                        hits.append((f, matched_targets))
                if hits:
                    lines = []
                    for f, toks in hits[:10]:
                        toks_str = '/'.join(set(toks))
                        extras = []
                        if f.functions:
                            extras.append(f"函数: {', '.join(f.functions[:5])}")
                        if f.classes:
                            extras.append(f"类: {', '.join(f.classes[:3])}")
                        extra_str = f" ({'; '.join(extras)})" if extras else ""
                        lines.append(f"  {f.path}  ← 命中「{toks_str}」{extra_str}")
                    return f"🔍 找到 {len(hits)} 处：\n" + "\n".join(lines)
                return f"🔍 没找到「{'/'.join(tokens)}」，换个关键词试试？"
            return "请告诉我你要找什么？比如：create 在哪里？"

        if intent == "help":
            return (f"👋 我是 {self.name}，能做的事：\n"
                    f"  - 列出所有函数 / 类 / 文件\n"
                    f"  - 统计代码规模\n"
                    f"  - 查看语言分布\n"
                    f"  - 查看高频关键词\n"
                    f"  - 查看脱敏情况\n"
                    f"  - 定位某个函数/类在哪个文件\n"
                    f"  - 介绍这个项目\n\n"
                    f"直接问就行，比如：「有哪些函数？」「create 在哪里？」")

        # 默认：用关键词检索相关文件
        words = re.findall(r'[\u4e00-\u9fa5]{2,}|[A-Za-z_]{3,}', question.lower())
        hits = []
        for f in kb.files:
            score = sum(1 for w in words if w in [k.lower() for k in f.keywords]
                        or w in f.path.lower())
            if score > 0:
                hits.append((score, f))
        hits.sort(key=lambda x: -x[0])
        if hits:
            top = hits[0][1]
            return (f"🤔 我猜你想问的和这个有关：\n"
                    f"  文件: {top.path}\n"
                    f"  语言: {top.language}\n"
                    f"  函数: {', '.join(top.functions[:5]) if top.functions else '无'}\n"
                    f"  类: {', '.join(top.classes[:5]) if top.classes else '无'}")
        return ("🤔 我没完全理解，可以试试问：\n"
                "  「有哪些函数？」「统计」「create 在哪里？」「介绍这个项目」")
