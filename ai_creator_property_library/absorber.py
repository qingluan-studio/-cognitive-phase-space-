"""
吸收器：让"造物"能够吸收一个开源仓库

能力：
- 扫描目录，读取所有代码/文本文件
- 提取函数、类、文档字符串
- 统计语言分布、代码规模
- 数据脱敏：屏蔽明显的密钥/token/密码
- 生成结构化"知识库"，供小 moss 检索问答
"""

import os
import re
import ast
import json
import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional


# 支持的代码文件后缀 → 语言
LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".php": "php",
    ".sh": "shell",
    ".md": "markdown",
    ".txt": "text",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
}

# 跳过的目录
SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv", "venv",
             "dist", "build", ".idea", ".vscode", "egg-info"}

# 数据脱敏：匹配密钥/token 的正则
SENSITIVE_PATTERNS = [
    # API key 类（sk-xxx, api_key=xxx 等）
    (re.compile(r'(api[_-]?key|secret|token|password|passwd|pwd)\s*[=:]\s*["\']?([A-Za-z0-9_\-/+=]{8,})["\']?', re.IGNORECASE),
     r'\1=***REDACTED***'),
    # AWS key
    (re.compile(r'AKIA[0-9A-Z]{16}'), 'AKIA***REDACTED***'),
    # 私钥头
    (re.compile(r'-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----'),
     '***PRIVATE KEY REDACTED***'),
    # 长 hex token（>=32）
    (re.compile(r'\b[0-9a-f]{40,}\b'), '***HASH REDACTED***'),
]


@dataclass
class FileKnowledge:
    """单个文件的知识"""
    path: str
    language: str
    lines: int
    size: int
    sha: str  # 内容指纹
    functions: List[str] = field(default_factory=list)
    classes: List[str] = field(default_factory=list)
    docstring: Optional[str] = None
    keywords: List[str] = field(default_factory=list)
    # 脱敏标记：是否包含敏感信息（已脱敏）
    redacted: bool = False


@dataclass
class KnowledgeBase:
    """吸收后的完整知识库"""
    source: str  # 仓库路径
    absorbed_at: str
    total_files: int = 0
    total_lines: int = 0
    total_size: int = 0
    languages: Dict[str, int] = field(default_factory=dict)
    files: List[FileKnowledge] = field(default_factory=list)
    redacted_count: int = 0  # 脱敏的文件数
    all_functions: List[str] = field(default_factory=list)
    all_classes: List[str] = field(default_factory=list)
    top_keywords: List[tuple] = field(default_factory=list)

    def summary(self) -> str:
        return (
            f"📦 仓库: {self.source}\n"
            f"🕒 吸收时间: {self.absorbed_at}\n"
            f"📁 文件数: {self.total_files}\n"
            f"📏 总行数: {self.total_lines}\n"
            f"💾 总大小: {self.total_size:,} 字节\n"
            f"🔐 脱敏文件: {self.redacted_count}\n"
            f"🌐 语言分布: {dict(self.languages)}\n"
            f"⚙️  函数总数: {len(self.all_functions)}\n"
            f"🏛️ 类总数: {len(self.all_classes)}\n"
            f"🔑 高频关键词: {self.top_keywords[:10]}"
        )


class Absorber:
    """
    吸收器：把一个目录/仓库"吸收"成结构化知识库

    对应造物属性：
    - 大规模吸收：扫描整个目录树
    - 数据脱敏：自动屏蔽敏感信息
    - 自我训练：生成可检索的知识库
    """

    def __init__(self, max_file_size: int = 500_000):
        self.max_file_size = max_file_size  # 单文件上限 500KB

    def absorb(self, repo_path: str) -> KnowledgeBase:
        """吸收一个仓库目录"""
        if not os.path.isdir(repo_path):
            raise FileNotFoundError(f"目录不存在: {repo_path}")

        kb = KnowledgeBase(
            source=os.path.abspath(repo_path),
            absorbed_at=datetime.now().isoformat(),
        )

        for root, dirs, files in os.walk(repo_path):
            # 跳过无关目录
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]

            for fname in files:
                fpath = os.path.join(root, fname)
                ext = os.path.splitext(fname)[1].lower()
                if ext not in LANGUAGE_MAP:
                    continue
                try:
                    fk = self._absorb_file(fpath, ext)
                    if fk:
                        kb.files.append(fk)
                        kb.total_files += 1
                        kb.total_lines += fk.lines
                        kb.total_size += fk.size
                        kb.languages[fk.language] = kb.languages.get(fk.language, 0) + 1
                        kb.all_functions.extend(fk.functions)
                        kb.all_classes.extend(fk.classes)
                        if fk.redacted:
                            kb.redacted_count += 1
                except Exception as e:
                    # 跳过无法解析的文件，不中断吸收
                    continue

        # 关键词统计
        kb.top_keywords = self._compute_top_keywords(kb.files)

        return kb

    def _absorb_file(self, fpath: str, ext: str) -> Optional[FileKnowledge]:
        """吸收单个文件"""
        size = os.path.getsize(fpath)
        if size > self.max_file_size:
            return None

        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # 数据脱敏
        redacted = False
        for pattern, replacement in SENSITIVE_PATTERNS:
            if pattern.search(content):
                content = pattern.sub(replacement, content)
                redacted = True

        lines = content.count('\n') + (1 if content and not content.endswith('\n') else 0)
        sha = hashlib.sha256(content.encode('utf-8')).hexdigest()[:12]

        fk = FileKnowledge(
            path=os.path.relpath(fpath, start=os.path.dirname(fpath)),
            language=LANGUAGE_MAP[ext],
            lines=lines,
            size=size,
            sha=sha,
            redacted=redacted,
        )

        # Python：用 AST 提取函数/类/文档
        if ext == '.py':
            self._extract_python(content, fk)
        else:
            # 其他语言：正则粗提取
            fk.functions = re.findall(r'(?:function|def|func)\s+(\w+)', content)
            fk.classes = re.findall(r'(?:class)\s+(\w+)', content)

        # 关键词（去停用词）
        fk.keywords = self._extract_keywords(content)

        return fk

    def _extract_python(self, content: str, fk: FileKnowledge):
        """用 AST 提取 Python 的函数/类/文档字符串"""
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return

        # 模块文档字符串
        if (tree.body and isinstance(tree.body[0], ast.Expr)
                and isinstance(tree.body[0].value, ast.Constant)
                and isinstance(tree.body[0].value.value, str)):
            fk.docstring = tree.body[0].value.value.strip()[:200]

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                fk.functions.append(node.name)
            elif isinstance(node, ast.ClassDef):
                fk.classes.append(node.name)

    # 中文 + 英文停用词（精简版）
    STOPWORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'for',
        'while', 'return', 'def', 'class', 'import', 'from', 'self', 'none',
        'true', 'false', 'with', 'as', 'try', 'except', 'raise', 'in', 'not',
        'is', 'of', 'to', 'this', 'that', 'it', 'be', 'are', 'was', 'were',
        '的', '了', '是', '在', '和', '与', '或', '但', '如果', '则', '返回',
        '一个', '一种', '可以', '用于', '通过', '使用', '这个', '那个',
    }

    def _extract_keywords(self, content: str) -> List[str]:
        """提取关键词（简单分词 + 去停用词）"""
        # 英文单词
        words = re.findall(r'[A-Za-z_][A-Za-z0-9_]{2,}', content.lower())
        # 中文词（粗提取 2-4 字）
        words += re.findall(r'[\u4e00-\u9fa5]{2,4}', content)
        # 过滤停用词 + 去重
        keywords = [w for w in words if w not in self.STOPWORDS and len(w) > 2]
        return list(set(keywords))[:20]

    def _compute_top_keywords(self, files: List[FileKnowledge]) -> List[tuple]:
        """统计全局高频关键词"""
        freq = {}
        for fk in files:
            for kw in fk.keywords:
                freq[kw] = freq.get(kw, 0) + 1
        return sorted(freq.items(), key=lambda x: -x[1])[:20]

    def save_kb(self, kb: KnowledgeBase, output_path: str):
        """把知识库保存为 JSON（供小 moss 加载）"""
        data = {
            "source": kb.source,
            "absorbed_at": kb.absorbed_at,
            "stats": {
                "total_files": kb.total_files,
                "total_lines": kb.total_lines,
                "total_size": kb.total_size,
                "redacted_count": kb.redacted_count,
                "languages": kb.languages,
            },
            "files": [
                {
                    "path": f.path,
                    "language": f.language,
                    "lines": f.lines,
                    "functions": f.functions,
                    "classes": f.classes,
                    "docstring": f.docstring,
                    "keywords": f.keywords,
                    "redacted": f.redacted,
                }
                for f in kb.files
            ],
            "all_functions": kb.all_functions,
            "all_classes": kb.all_classes,
            "top_keywords": kb.top_keywords,
        }
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
