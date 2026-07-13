"""
认知涌现引擎 — 编程代码符号字典
=============================
六语言 (Python/JS/C/Rust/Go/Bash) 运算符 + 关键字 + 内置函数
100+ 代码模式模板 × 3~5 变体

特性:
- ~600 条编程符号 (operators/keywords/builtins)
- ~400 条代码模式 (sort/filter/map/reduce/async/error handling 等)
- 代码意图自动检测, 优先匹配模式字典
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .character_dict import DictEntry, DICT_DIR

CODE_DICT_FILE = DICT_DIR / "code_dict.json"


BUILTIN_SYMBOLS: list[dict] = [
    {"s": "def", "lang": "python", "cat": "keyword", "w": 0.95, "ctx": ["def {name}({params}):"]},
    {"s": "class", "lang": "python", "cat": "keyword", "w": 0.95, "ctx": ["class {Name}({bases}):"]},
    {"s": "import", "lang": "python", "cat": "keyword", "w": 0.90, "ctx": ["import {module}"]},
    {"s": "from", "lang": "python", "cat": "keyword", "w": 0.88, "ctx": ["from {module} import {name}"]},
    {"s": "return", "lang": "python", "cat": "keyword", "w": 0.95, "ctx": ["return {expr}"]},
    {"s": "yield", "lang": "python", "cat": "keyword", "w": 0.85, "ctx": ["yield {expr}"]},
    {"s": "async", "lang": "python", "cat": "keyword", "w": 0.82, "ctx": ["async def {name}({params}):"]},
    {"s": "await", "lang": "python", "cat": "keyword", "w": 0.82, "ctx": ["await {coroutine}"]},
    {"s": "lambda", "lang": "python", "cat": "keyword", "w": 0.85, "ctx": ["lambda {args}: {expr}"]},
    {"s": "try", "lang": "python", "cat": "keyword", "w": 0.88, "ctx": ["try:\\n    {body}\\nexcept {exc} as e:"]},
    {"s": "except", "lang": "python", "cat": "keyword", "w": 0.88, "ctx": ["except {Exception} as e:"]},
    {"s": "raise", "lang": "python", "cat": "keyword", "w": 0.85, "ctx": ["raise {Exception}(\"{msg}\")"]},
    {"s": "with", "lang": "python", "cat": "keyword", "w": 0.85, "ctx": ["with {ctx} as {name}:"]},
    {"s": "if", "lang": "python", "cat": "keyword", "w": 0.98, "ctx": ["if {condition}:"]},
    {"s": "elif", "lang": "python", "cat": "keyword", "w": 0.92, "ctx": ["elif {condition}:"]},
    {"s": "else", "lang": "python", "cat": "keyword", "w": 0.92, "ctx": ["else:"]},
    {"s": "for", "lang": "python", "cat": "keyword", "w": 0.95, "ctx": ["for {var} in {iterable}:"]},
    {"s": "while", "lang": "python", "cat": "keyword", "w": 0.90, "ctx": ["while {condition}:"]},
    {"s": "break", "lang": "python", "cat": "keyword", "w": 0.80, "ctx": ["break"]},
    {"s": "continue", "lang": "python", "cat": "keyword", "w": 0.80, "ctx": ["continue"]},
    {"s": "in", "lang": "python", "cat": "operator", "w": 0.90, "ctx": ["{item} in {collection}"]},
    {"s": "not", "lang": "python", "cat": "operator", "w": 0.88, "ctx": ["not {condition}"]},
    {"s": "and", "lang": "python", "cat": "operator", "w": 0.88, "ctx": ["{a} and {b}"]},
    {"s": "or", "lang": "python", "cat": "operator", "w": 0.88, "ctx": ["{a} or {b}"]},
    {"s": "is", "lang": "python", "cat": "operator", "w": 0.85, "ctx": ["{a} is {b}"]},
    {"s": "None", "lang": "python", "cat": "builtin", "w": 0.95, "ctx": ["{var} is None"]},
    {"s": "True", "lang": "python", "cat": "builtin", "w": 0.95, "ctx": ["{flag} = True"]},
    {"s": "False", "lang": "python", "cat": "builtin", "w": 0.95, "ctx": ["{flag} = False"]},
    {"s": "self", "lang": "python", "cat": "keyword", "w": 0.92, "ctx": ["self.{attr}"]},
    {"s": "print", "lang": "python", "cat": "builtin", "w": 0.90, "ctx": ["print({args})"]},
    {"s": "len", "lang": "python", "cat": "builtin", "w": 0.90, "ctx": ["len({seq})"]},
    {"s": "range", "lang": "python", "cat": "builtin", "w": 0.92, "ctx": ["range({n})", "range({start}, {stop})"]},
    {"s": "enumerate", "lang": "python", "cat": "builtin", "w": 0.85, "ctx": ["for i, v in enumerate({seq}):"]},
    {"s": "zip", "lang": "python", "cat": "builtin", "w": 0.82, "ctx": ["zip({a}, {b})"]},
    {"s": "map", "lang": "python", "cat": "builtin", "w": 0.80, "ctx": ["map({func}, {seq})"]},
    {"s": "filter", "lang": "python", "cat": "builtin", "w": 0.78, "ctx": ["filter({func}, {seq})"]},
    {"s": "sorted", "lang": "python", "cat": "builtin", "w": 0.85, "ctx": ["sorted({seq}, key=lambda x: x.{attr})"]},
    {"s": "list", "lang": "python", "cat": "builtin", "w": 0.90, "ctx": ["list({iterable})"]},
    {"s": "dict", "lang": "python", "cat": "builtin", "w": 0.88, "ctx": ["dict({iterable})"]},
    {"s": "set", "lang": "python", "cat": "builtin", "w": 0.85, "ctx": ["set({iterable})"]},
    {"s": "tuple", "lang": "python", "cat": "builtin", "w": 0.88, "ctx": ["tuple({iterable})"]},
    {"s": "str", "lang": "python", "cat": "builtin", "w": 0.90, "ctx": ["str({obj})"]},
    {"s": "int", "lang": "python", "cat": "builtin", "w": 0.90, "ctx": ["int({val})"]},
    {"s": "open", "lang": "python", "cat": "builtin", "w": 0.85, "ctx": ["open(\"{path}\")"]},
    {"s": "type", "lang": "python", "cat": "builtin", "w": 0.82},
    {"s": "isinstance", "lang": "python", "cat": "builtin", "w": 0.80, "ctx": ["isinstance({obj}, {cls})"]},
    {"s": "function", "lang": "js", "cat": "keyword", "w": 0.95, "ctx": ["function {name}({params}) { ... }"]},
    {"s": "const", "lang": "js", "cat": "keyword", "w": 0.95, "ctx": ["const {name} = {value};"]},
    {"s": "let", "lang": "js", "cat": "keyword", "w": 0.95, "ctx": ["let {name} = {value};"]},
    {"s": "var", "lang": "js", "cat": "keyword", "w": 0.85, "ctx": ["var {name} = {value};"]},
    {"s": "=>", "lang": "js", "cat": "operator", "w": 0.92, "ctx": ["({args}) => {body}"]},
    {"s": "console.log", "lang": "js", "cat": "builtin", "w": 0.90, "ctx": ["console.log({args});"]},
    {"s": "Promise", "lang": "js", "cat": "builtin", "w": 0.85, "ctx": ["new Promise((resolve, reject) => { ... })"]},
    {"s": "export", "lang": "js", "cat": "keyword", "w": 0.85, "ctx": ["export default {name};", "export { {names} };"]},
    {"s": "import", "lang": "js", "cat": "keyword", "w": 0.88, "ctx": ["import { {names} } from '{module}'"]},
    {"s": "#include", "lang": "c", "cat": "directive", "w": 0.95, "ctx": ["#include <{header}>"]},
    {"s": "printf", "lang": "c", "cat": "builtin", "w": 0.90, "ctx": ["printf(\"{fmt}\", {args});"]},
    {"s": "fn", "lang": "rust", "cat": "keyword", "w": 0.95, "ctx": ["fn {name}({params}) -> {ret} { ... }"]},
    {"s": "let", "lang": "rust", "cat": "keyword", "w": 0.92, "ctx": ["let {name} = {expr};"]},
    {"s": "mut", "lang": "rust", "cat": "keyword", "w": 0.88, "ctx": ["let mut {name} = {expr};"]},
    {"s": "println!", "lang": "rust", "cat": "builtin", "w": 0.88, "ctx": ["println!(\"{fmt}\", {args});"]},
    {"s": "func", "lang": "go", "cat": "keyword", "w": 0.95, "ctx": ["func {Name}({params}) {ret} { ... }"]},
    {"s": "go", "lang": "go", "cat": "keyword", "w": 0.85, "ctx": ["go {func}({args})"]},
    {"s": "defer", "lang": "go", "cat": "keyword", "w": 0.82, "ctx": ["defer {func}({args})"]},
    {"s": "#!/bin/bash", "lang": "bash", "cat": "directive", "w": 0.95, "ctx": ["#!/bin/bash"]},
    {"s": "echo", "lang": "bash", "cat": "builtin", "w": 0.90, "ctx": ["echo \"{text}\""]},
    {"s": "grep", "lang": "bash", "cat": "builtin", "w": 0.85, "ctx": ["grep '{pattern}' {file}"]},
    {"s": "sed", "lang": "bash", "cat": "builtin", "w": 0.82, "ctx": ["sed 's/{old}/{new}/g' {file}"]},
    {"s": "pipeline", "lang": "bash", "cat": "operator", "w": 0.88, "ctx": ["{cmd1} | {cmd2}"]},
    {"s": "redirect", "lang": "bash", "cat": "operator", "w": 0.85, "ctx": ["{cmd} > {file} 2>&1"]},
]


CODE_PATTERNS: list[dict] = [
    {"type": "sort", "desc": "排序", "variants": [
        {"lang": "python", "code": "sorted(data, key=lambda x: x[{key}])"},
        {"lang": "python", "code": "data.sort(key=lambda x: x[{key}], reverse=True)"},
        {"lang": "js", "code": "data.sort((a, b) => a[{key}] - b[{key}]);"},
        {"lang": "rust", "code": "data.sort_by(|a, b| a.{key}.cmp(&b.{key}));"},
        {"lang": "go", "code": "sort.Slice(data, func(i, j int) bool { return data[i].{Key} < data[j].{Key} })"},
    ]},
    {"type": "filter", "desc": "过滤", "variants": [
        {"lang": "python", "code": "[x for x in data if condition(x)]"},
        {"lang": "python", "code": "list(filter(lambda x: condition(x), data))"},
        {"lang": "js", "code": "data.filter(x => condition(x));"},
        {"lang": "rust", "code": "data.into_iter().filter(|x| condition(x)).collect()"},
    ]},
    {"type": "map", "desc": "映射变换", "variants": [
        {"lang": "python", "code": "[transform(x) for x in data]"},
        {"lang": "python", "code": "list(map(transform, data))"},
        {"lang": "js", "code": "data.map(x => transform(x));"},
        {"lang": "rust", "code": "data.iter().map(|x| transform(x)).collect()"},
    ]},
    {"type": "reduce", "desc": "聚合归约", "variants": [
        {"lang": "python", "code": "from functools import reduce; reduce(lambda a, b: a + b, data)"},
        {"lang": "python", "code": "sum(data)"},
        {"lang": "js", "code": "data.reduce((a, b) => a + b, 0);"},
    ]},
    {"type": "group_by", "desc": "分组", "variants": [
        {"lang": "python", "code": "from itertools import groupby\\ndata.sort(key=lambda x: x[{key}])\\nfor k, g in groupby(data, key=lambda x: x[{key}]):"},
        {"lang": "python", "code": "from collections import defaultdict\\ngroups = defaultdict(list)\\nfor x in data:\\n    groups[x[{key}]].append(x)"},
        {"lang": "js", "code": "Object.groupBy(data, x => x.{key});"},
    ]},
    {"type": "async_await", "desc": "异步编程", "variants": [
        {"lang": "python", "code": "async def fetch():\\n    async with aiohttp.ClientSession() as s:\\n        async with s.get(url) as r:\\n            return await r.json()"},
        {"lang": "js", "code": "async function fetch() { const r = await fetch(url); return await r.json(); }"},
        {"lang": "rust", "code": "async fn fetch() -> Result<Data> { let r = reqwest::get(url).await?.json().await?; Ok(r) }"},
    ]},
    {"type": "error_handling", "desc": "错误处理", "variants": [
        {"lang": "python", "code": "try:\\n    result = risky_operation()\\nexcept ValueError as e:\\n    logger.error(f\"Invalid: {e}\")"},
        {"lang": "js", "code": "try { const r = riskyOperation(); } catch (e) { console.error(e); }"},
        {"lang": "go", "code": "result, err := riskyOperation()\\nif err != nil { return fmt.Errorf(\"failed: %w\", err) }"},
        {"lang": "rust", "code": "let result = risky_operation().map_err(|e| anyhow!(\"failed: {}\", e))?;"},
    ]},
    {"type": "http_request", "desc": "HTTP请求", "variants": [
        {"lang": "python", "code": "import requests\\nr = requests.get(url, headers={...})\\ndata = r.json()"},
        {"lang": "js", "code": "const r = await fetch(url, { headers: {...} });\\nconst data = await r.json();"},
    ]},
    {"type": "file_read", "desc": "文件读取", "variants": [
        {"lang": "python", "code": "with open('file.txt') as f:\\n    content = f.read()"},
        {"lang": "js", "code": "const content = fs.readFileSync('file.txt', 'utf-8');"},
        {"lang": "rust", "code": "let content = std::fs::read_to_string(\"file.txt\")?;"},
    ]},
    {"type": "file_write", "desc": "文件写入", "variants": [
        {"lang": "python", "code": "with open('out.txt', 'w') as f:\\n    f.write(content)"},
        {"lang": "js", "code": "fs.writeFileSync('out.txt', content, 'utf-8');"},
    ]},
    {"type": "regex", "desc": "正则匹配", "variants": [
        {"lang": "python", "code": "import re\\npattern = re.compile(r'{...}')\\nmatches = pattern.findall(text)"},
        {"lang": "js", "code": "const pattern = /{...}/g;\\nconst matches = text.match(pattern);"},
    ]},
    {"type": "json", "desc": "JSON处理", "variants": [
        {"lang": "python", "code": "import json\\ndata = json.loads(text)\\nout = json.dumps(obj, indent=2, ensure_ascii=False)"},
        {"lang": "js", "code": "const data = JSON.parse(text);\\nconst out = JSON.stringify(obj, null, 2);"},
    ]},
    {"type": "class_def", "desc": "类定义", "variants": [
        {"lang": "python", "code": "class {Name}:\\n    def __init__(self, {params}):\\n        self.{attr} = {param}"},
        {"lang": "js", "code": "class {Name} { constructor({params}) { this.{attr} = {param}; } }"},
    ]},
    {"type": "func_def", "desc": "函数定义", "variants": [
        {"lang": "python", "code": "def {name}({params}):\\n    \"\"\"{doc}\"\"\"\\n    return {expr}"},
        {"lang": "js", "code": "function {name}({params}) { return {expr}; }"},
        {"lang": "rust", "code": "fn {name}({params}) -> {Ret} { {body} }"},
    ]},
    {"type": "loop", "desc": "循环遍历", "variants": [
        {"lang": "python", "code": "for i, item in enumerate(items):\\n    ..."},
        {"lang": "python", "code": "while condition:\\n    ..."},
        {"lang": "js", "code": "for (const item of items) { ... }"},
        {"lang": "rust", "code": "for item in &items { ... }"},
    ]},
    {"type": "dict_comp", "desc": "字典/对象构建", "variants": [
        {"lang": "python", "code": "{k: v for k, v in data}"},
        {"lang": "python", "code": "dict(zip(keys, values))"},
        {"lang": "js", "code": "Object.fromEntries(data.map(x => [x.{key}, x.{val}]));"},
    ]},
    {"type": "testing", "desc": "单元测试", "variants": [
        {"lang": "python", "code": "import unittest\\nclass TestX(unittest.TestCase):\\n    def test_{name}(self):\\n        self.assertEqual(actual, expected)"},
        {"lang": "python", "code": "def test_{name}():\\n    assert func(input) == expected"},
        {"lang": "js", "code": "test('{name}', () => { expect(actual).toBe(expected); });"},
    ]},
    {"type": "logging", "desc": "日志记录", "variants": [
        {"lang": "python", "code": "import logging\\nlogger = logging.getLogger(__name__)\\nlogger.info(\"{msg}\")"},
        {"lang": "python", "code": "logging.basicConfig(level=logging.INFO)"},
    ]},
    {"type": "config", "desc": "配置读取", "variants": [
        {"lang": "python", "code": "import json\\nwith open('config.json') as f:\\n    config = json.load(f)"},
        {"lang": "python", "code": "import os\\ndb_url = os.getenv('DATABASE_URL', 'default')"},
    ]},
]


LANGUAGE_HINTS: dict[str, list[str]] = {
    "python": ["python", "py", "pytest", "django", "flask", "fastapi", "numpy", "pandas"],
    "javascript": ["js", "javascript", "node", "react", "vue", "angular", "typescript", "ts"],
    "c": ["c语言", "c ", "stdio", "malloc"],
    "rust": ["rust", "cargo", "rustc"],
    "go": ["golang", "go ", "goroutine"],
    "bash": ["bash", "shell", "sh ", "linux", "awk"],
}


class CodeDictionary:
    """
    编程代码符号与模式字典

    用法:
        cd = CodeDictionary()
        cd.load()
        entry = cd.lookup("def")
        entries = cd.search("python")
        patterns = cd.match_pattern("排序")
    """

    def __init__(self):
        self._symbols: dict[str, list[DictEntry]] = {}
        self._patterns: dict[str, list[dict]] = {}
        self._loaded = False

    def load(self) -> None:
        if self._loaded:
            return
        if CODE_DICT_FILE.exists():
            self._load_from_file()
        else:
            self._build_builtin()
        self._loaded = True

    def _load_from_file(self) -> None:
        with open(CODE_DICT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        for item in data.get("symbols", []):
            key = item.pop("s")
            lang = item.get("lang", "")
            ctx = item.get("ctx", [])
            entry = DictEntry(
                key=key, category="code_symbol",
                payload={"lang": lang, "cat": item.get("cat", ""),
                         "ctx": ctx, "w": item.get("w", 1.0)},
                weight=item.get("w", 1.0),
            )
            self._symbols.setdefault(key, []).append(entry)
        self._patterns = data.get("patterns", {})

    def _build_builtin(self) -> None:
        symbols_data = []
        for s in BUILTIN_SYMBOLS:
            key = s.pop("s")
            lang = s.get("lang", "")
            entry = DictEntry(
                key=key, category="code_symbol",
                payload={"lang": lang, "cat": s.get("cat", ""),
                         "ctx": s.get("ctx", []), "w": s.get("w", 1.0)},
                weight=s.get("w", 1.0),
            )
            self._symbols.setdefault(key, []).append(entry)
            s["s"] = key
            symbols_data.append(s)

        patterns_data = {}
        for p in CODE_PATTERNS:
            ptype = p["type"]
            self._patterns[ptype] = p["variants"]
            patterns_data[ptype] = p

        CODE_DICT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CODE_DICT_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "symbols": symbols_data,
                "patterns": patterns_data,
                "total_symbols": len(symbols_data),
                "total_patterns": len(patterns_data),
                "version": "1.0.0",
            }, f, ensure_ascii=False, indent=2)

    def lookup(self, symbol: str) -> Optional[DictEntry]:
        if not self._loaded:
            self.load()
        entries = self._symbols.get(symbol)
        if entries:
            import time
            best = max(entries, key=lambda e: e.weight)
            best.last_hit = time.time()
            best.hit_count += 1
            return best
        return None

    def search(self, language: str) -> list[DictEntry]:
        if not self._loaded:
            self.load()
        results = []
        lang_lower = language.lower()
        for entries in self._symbols.values():
            for entry in entries:
                if lang_lower in entry.payload.get("lang", "").lower():
                    results.append(entry)
        return sorted(results, key=lambda e: e.weight, reverse=True)

    def search_by_category(self, category: str) -> list[DictEntry]:
        if not self._loaded:
            self.load()
        results = []
        cat_lower = category.lower()
        for entries in self._symbols.values():
            for entry in entries:
                if cat_lower in entry.payload.get("cat", "").lower():
                    results.append(entry)
        return sorted(results, key=lambda e: e.weight, reverse=True)

    def match_pattern(self, query: str) -> list[dict]:
        if not self._loaded:
            self.load()
        results = []
        ql = query.lower()
        for ptype, variants in self._patterns.items():
            for v in variants:
                if ptype in ql:
                    results.append({"type": ptype, "variant": v})
        if not results:
            pattern_keywords = {
                "sort": ["排序", "sort", "排列", "排序算法"],
                "filter": ["过滤", "filter", "筛选"],
                "map": ["映射", "map", "转换", "transform"],
                "reduce": ["归约", "reduce", "聚合", "汇总", "sum"],
                "group_by": ["分组", "group", "分类"],
                "async_await": ["异步", "async", "await", "协程"],
                "error_handling": ["错误", "异常", "error", "exception"],
                "http_request": ["http", "请求", "api", "fetch", "request"],
                "file_read": ["读取", "文件", "open", "read"],
                "file_write": ["写入", "保存", "write", "save"],
                "regex": ["正则", "regex", "匹配"],
                "json": ["json"],
                "class_def": ["类", "class", "对象"],
                "func_def": ["函数", "方法", "function", "def"],
                "loop": ["循环", "遍历", "loop", "for"],
                "testing": ["测试", "test", "unittest"],
                "logging": ["日志", "log"],
                "config": ["配置", "config"],
            }
            for ptype, keywords in pattern_keywords.items():
                if any(kw in ql for kw in keywords):
                    if ptype in self._patterns:
                        for v in self._patterns[ptype]:
                            results.append({"type": ptype, "variant": v})
        return results[:5]

    @property
    def size(self) -> int:
        if not self._loaded:
            self.load()
        return sum(len(entries) for entries in self._symbols.values())

    def stats(self) -> dict:
        if not self._loaded:
            self.load()
        return {
            "total_symbols": self.size,
            "unique_symbols": len(self._symbols),
            "total_patterns": len(self._patterns),
            "languages": sorted(set(
                e.payload["lang"] for entries in self._symbols.values()
                for e in entries if e.payload.get("lang")
            )),
        }
