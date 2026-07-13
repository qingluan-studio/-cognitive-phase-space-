"""
认知涌现引擎 — 中文符号标点字典
=============================
CJK Symbols (U+3000-U+303F) + Fullwidth Forms (U+FF00-U+FFEF) + CJK Strokes (U+31C0-U+31EF)

特性:
- 符号名 + 分类 + ASCII等价映射
- 模糊匹配: 中英括号/引号互转
- 常用上下文示例
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .character_dict import DictEntry, DICT_DIR

SYMBOL_DICT_FILE = DICT_DIR / "symbol_dict.json"


SYMBOL_CATEGORIES = {
    "punctuation": "标点符号",
    "bracket": "括号",
    "connector": "连接符",
    "ordinal": "序号标记",
    "unit": "单位符号",
    "math": "数学符号",
    "stroke": "笔划",
    "other": "其他",
}


BUILTIN_SYMBOLS: list[dict] = [
    {"s": "\u3001", "name": "顿号", "cat": "punctuation", "desc": "列举项分隔"},
    {"s": "\u3002", "name": "句号", "cat": "punctuation", "desc": "句子结束"},
    {"s": "\u3003", "name": "Ditto Mark", "cat": "punctuation", "desc": "同上"},
    {"s": "\u3008", "name": "左单书名号", "cat": "bracket", "ascii": "<"},
    {"s": "\u3009", "name": "右单书名号", "cat": "bracket", "ascii": ">"},
    {"s": "\u300A", "name": "左双书名号", "cat": "bracket", "ascii": "<<"},
    {"s": "\u300B", "name": "右双书名号", "cat": "bracket", "ascii": ">>"},
    {"s": "\u300C", "name": "左引号", "cat": "bracket", "ascii": "\""},
    {"s": "\u300D", "name": "右引号", "cat": "bracket", "ascii": "\""},
    {"s": "\u300E", "name": "左双引号", "cat": "bracket", "ascii": "'"},
    {"s": "\u300F", "name": "右双引号", "cat": "bracket", "ascii": "'"},
    {"s": "\u3010", "name": "左黑括号", "cat": "bracket", "ascii": "["},
    {"s": "\u3011", "name": "右黑括号", "cat": "bracket", "ascii": "]"},
    {"s": "\u3014", "name": "左龟甲括号", "cat": "bracket", "ascii": "("},
    {"s": "\u3015", "name": "右龟甲括号", "cat": "bracket", "ascii": ")"},
    {"s": "\u3016", "name": "左白括号", "cat": "bracket", "ascii": "["},
    {"s": "\u3017", "name": "右白括号", "cat": "bracket", "ascii": "]"},
    {"s": "\u3018", "name": "左白龟甲括号", "cat": "bracket", "ascii": "{"},
    {"s": "\u3019", "name": "右白龟甲括号", "cat": "bracket", "ascii": "}"},
    {"s": "\u301C", "name": "波线符", "cat": "connector", "ascii": "~"},
    {"s": "\u301D", "name": "右向引用符", "cat": "bracket", "ascii": "\""},
    {"s": "\u301E", "name": "双右向引用符", "cat": "bracket", "ascii": "\""},
    {"s": "\u301F", "name": "低双右向引用符", "cat": "bracket", "ascii": "\""},
    {"s": "\u3020", "name": "Postal Mark Face", "cat": "other"},
    {"s": "\u3030", "name": "Wavy Dash", "cat": "connector", "ascii": "~"},
    {"s": "\u3036", "name": "Postal Mark", "cat": "other"},
    {"s": "\u303E", "name": "Ideographic Variation Indicator", "cat": "other"},
    {"s": "\uFE10", "name": "竖排逗号", "cat": "punctuation", "ascii": ","},
    {"s": "\uFE11", "name": "竖排顿号", "cat": "punctuation"},
    {"s": "\uFE12", "name": "竖排句号", "cat": "punctuation", "ascii": "."},
    {"s": "\uFE15", "name": "竖排叹号", "cat": "punctuation", "ascii": "!"},
    {"s": "\uFE16", "name": "竖提问号", "cat": "punctuation", "ascii": "?"},
    {"s": "\uFE17", "name": "竖排左书名号", "cat": "bracket", "ascii": "("},
    {"s": "\uFE18", "name": "竖排右书名号", "cat": "bracket", "ascii": ")"},
    {"s": "\uFF01", "name": "全角叹号", "cat": "punctuation", "ascii": "!"},
    {"s": "\uFF02", "name": "全角双引号", "cat": "bracket", "ascii": "\""},
    {"s": "\uFF03", "name": "全角井号", "cat": "punctuation", "ascii": "#"},
    {"s": "\uFF04", "name": "全角美元符", "cat": "unit", "ascii": "$"},
    {"s": "\uFF05", "name": "全角百分号", "cat": "unit", "ascii": "%"},
    {"s": "\uFF06", "name": "全角与号", "cat": "connector", "ascii": "&"},
    {"s": "\uFF07", "name": "全角单引号", "cat": "bracket", "ascii": "'"},
    {"s": "\uFF08", "name": "全角左括号", "cat": "bracket", "ascii": "("},
    {"s": "\uFF09", "name": "全角右括号", "cat": "bracket", "ascii": ")"},
    {"s": "\uFF0A", "name": "全角星号", "cat": "math", "ascii": "*"},
    {"s": "\uFF0B", "name": "全角加号", "cat": "math", "ascii": "+"},
    {"s": "\uFF0C", "name": "全角逗号", "cat": "punctuation", "ascii": ","},
    {"s": "\uFF0D", "name": "全角减号", "cat": "math", "ascii": "-"},
    {"s": "\uFF0E", "name": "全角句点", "cat": "punctuation", "ascii": "."},
    {"s": "\uFF0F", "name": "全角斜杠", "cat": "math", "ascii": "/"},
    {"s": "\uFF1A", "name": "全角冒号", "cat": "punctuation", "ascii": ":"},
    {"s": "\uFF1B", "name": "全角分号", "cat": "punctuation", "ascii": ";"},
    {"s": "\uFF1C", "name": "全角小于", "cat": "math", "ascii": "<"},
    {"s": "\uFF1D", "name": "全角等于", "cat": "math", "ascii": "="},
    {"s": "\uFF1E", "name": "全角大于", "cat": "math", "ascii": ">"},
    {"s": "\uFF1F", "name": "全角问号", "cat": "punctuation", "ascii": "?"},
    {"s": "\uFF20", "name": "全角at符", "cat": "punctuation", "ascii": "@"},
    {"s": "\uFF3B", "name": "全角左方括号", "cat": "bracket", "ascii": "["},
    {"s": "\uFF3C", "name": "全角反斜杠", "cat": "math", "ascii": "\\"},
    {"s": "\uFF3D", "name": "全角右方括号", "cat": "bracket", "ascii": "]"},
    {"s": "\uFF3E", "name": "全角脱字符", "cat": "math", "ascii": "^"},
    {"s": "\uFF3F", "name": "全角下划线", "cat": "connector", "ascii": "_"},
    {"s": "\uFF40", "name": "全角反引号", "cat": "bracket", "ascii": "`"},
    {"s": "\uFF5B", "name": "全角左花括号", "cat": "bracket", "ascii": "{"},
    {"s": "\uFF5C", "name": "全角竖线", "cat": "math", "ascii": "|"},
    {"s": "\uFF5D", "name": "全角右花括号", "cat": "bracket", "ascii": "}"},
    {"s": "\uFF5E", "name": "全角波浪号", "cat": "connector", "ascii": "~"},
]

FUZZY_MAP: dict[str, str] = {}
for sym in BUILTIN_SYMBOLS:
    if "ascii" in sym:
        FUZZY_MAP[sym["s"]] = sym["ascii"]


class SymbolDictionary:
    """
    中文符号标点字典

    用法:
        sd = SymbolDictionary()
        sd.load()
        entry = sd.lookup("，")
        ascii_equiv = sd.to_ascii("（")
    """

    def __init__(self):
        self._entries: dict[str, DictEntry] = {}
        self._loaded = False
        self._ascii_index: dict[str, list[str]] = {}

    def load(self) -> None:
        if self._loaded:
            return
        if SYMBOL_DICT_FILE.exists():
            self._load_from_file()
        else:
            self._build_builtin()
        self._loaded = True

    def _load_from_file(self) -> None:
        with open(SYMBOL_DICT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        for item in data["entries"]:
            key = item.pop("s")
            item.pop("cat_name", None)
            entry = DictEntry(
                key=key, category="symbol",
                payload=item, weight=item.get("w", 1.0),
            )
            self._entries[key] = entry
            ascii_eq = item.get("ascii")
            if ascii_eq:
                self._ascii_index.setdefault(ascii_eq, []).append(key)

    def _build_builtin(self) -> None:
        entries = []
        for sym_data in BUILTIN_SYMBOLS:
            key = sym_data.pop("s")
            sym_data["w"] = sym_data.get("w", 1.0)
            sym_data.pop("cat_name", None)
            entry = DictEntry(
                key=key, category="symbol",
                payload=sym_data, weight=sym_data.get("w", 1.0),
            )
            self._entries[key] = entry
            entries.append({"s": key, **sym_data})
            ascii_eq = sym_data.get("ascii")
            if ascii_eq:
                self._ascii_index.setdefault(ascii_eq, []).append(key)

        SYMBOL_DICT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SYMBOL_DICT_FILE, "w", encoding="utf-8") as f:
            json.dump({"entries": entries, "total": len(entries),
                        "version": "1.0.0"}, f, ensure_ascii=False, indent=2)

    def lookup(self, symbol: str) -> Optional[DictEntry]:
        if not self._loaded:
            self.load()
        entry = self._entries.get(symbol)
        if entry:
            import time
            entry.last_hit = time.time()
            entry.hit_count += 1
        return entry

    def to_ascii(self, symbol: str) -> str:
        if not self._loaded:
            self.load()
        entry = self._entries.get(symbol)
        if entry and "ascii" in entry.payload:
            return entry.payload["ascii"]
        return symbol

    def fuzzy_match(self, query: str) -> list[DictEntry]:
        if not self._loaded:
            self.load()
        results = []
        for key, entry in self._entries.items():
            name = entry.payload.get("name", "")
            desc = entry.payload.get("desc", "")
            cat_name = entry.payload.get("cat_name", "")
            if query in key or query in name or query in desc or query in cat_name:
                results.append(entry)
        return results

    @property
    def size(self) -> int:
        if not self._loaded:
            self.load()
        return len(self._entries)

    def stats(self) -> dict:
        if not self._loaded:
            self.load()
        return {
            "total": len(self._entries),
            "categories": len(set(e.payload.get("cat", "") for e in self._entries.values())),
        }
