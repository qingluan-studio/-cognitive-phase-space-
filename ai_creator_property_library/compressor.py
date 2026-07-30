"""
极致压缩器 v2：哈希编码 + 符号压缩 + 结构抽取

在原 absorber 基础上实现更极致的压缩：
1. 函数/类名 → 短 ID 映射（符号压缩）
2. 关键词 → 哈希编码（哈希压缩）
3. 路径 → 目录树结构（结构压缩）
4. 文档 → 核心摘要（内容压缩）

目标：把 480KB 压缩到 < 5KB，同时保持代码完整性
"""

import os
import re
import json
import hashlib
import zlib
from collections import Counter
from typing import Dict, List, Tuple


class ExtremeCompressor:
    """极致压缩器"""

    def __init__(self):
        self.symbol_table: Dict[str, int] = {}  # 符号→ID 映射
        self.symbol_reverse: Dict[int, str] = {}  # ID→符号 映射
        self.symbol_counter = 0
        self.hash_table: Dict[str, str] = {}  # 长串→短哈希

    def _get_symbol_id(self, name: str) -> int:
        """给函数/类名分配短 ID"""
        if name not in self.symbol_table:
            self.symbol_counter += 1
            self.symbol_table[name] = self.symbol_counter
            self.symbol_reverse[self.symbol_counter] = name
        return self.symbol_table[name]

    def _compress_string(self, s: str) -> str:
        """长字符串压缩为短哈希"""
        if len(s) <= 16:
            return s
        if s not in self.hash_table:
            h = hashlib.md5(s.encode()).hexdigest()[:8]
            self.hash_table[s] = h
        return self.hash_table[s]

    def compress(self, kb_data: dict) -> dict:
        """
        压缩知识库

        输入：absorber.py 输出的 kb 字典
        输出：极致压缩后的字典
        """
        # 1. 收集所有符号，建立映射表
        all_symbols = set()
        for f in kb_data.get('files', []):
            for fn in f.get('functions', []):
                all_symbols.add(fn)
            for cls in f.get('classes', []):
                all_symbols.add(cls)
            for kw in f.get('keywords', [])[:3]:
                all_symbols.add(kw)

        # 为每个符号分配 ID
        for sym in sorted(all_symbols):
            self._get_symbol_id(sym)

        # 2. 压缩每个文件
        compressed_files = []
        for f in kb_data.get('files', []):
            func_ids = [self.symbol_table.get(fn, 0) for fn in f.get('functions', [])]
            class_ids = [self.symbol_table.get(cls, 0) for cls in f.get('classes', [])]
            path_compressed = self._compress_path(f.get('path', ''))
            kw_ids = [self.symbol_table.get(kw, 0) for kw in f.get('keywords', [])[:3]]
            doc = f.get('docstring', '')
            doc_compressed = self._compress_doc(doc) if doc else None

            compressed_files.append({
                'p': path_compressed,
                'l': f.get('language', '')[:3],
                'f': func_ids,
                'c': class_ids,
                'd': doc_compressed,
                'k': kw_ids,
                'r': 1 if f.get('redacted', False) else 0,
            })

        # 3. 构建压缩结果 —— 符号表 key 用字符串（JSON 兼容）
        # 反转表：id → name，key 必须是字符串
        reverse_map = {str(k): v for k, v in self.symbol_reverse.items()}

        result = {
            'v': 2,
            'src': self._compress_string(kb_data.get('source', '')),
            'st': {
                'f': kb_data.get('stats', {}).get('total_files', 0),
                'l': kb_data.get('stats', {}).get('total_lines', 0),
                's': kb_data.get('stats', {}).get('total_size', 0),
                'r': kb_data.get('stats', {}).get('redacted_count', 0),
                'lg': {k[:3]: v for k, v in kb_data.get('stats', {}).get('languages', {}).items()},
            },
            'sym': reverse_map,  # {"1": "get", "2": "post", ...}
            'files': compressed_files,
            'tkw': [(self.symbol_table.get(w, 0), c) for w, c in kb_data.get('top_keywords', [])[:10]],
        }

        return result

    def _compress_path(self, path: str) -> str:
        """压缩文件路径：只保留文件名 + 一级目录"""
        parts = path.replace('\\', '/').split('/')
        if len(parts) <= 2:
            return path
        # 只保留最后两级
        return '/'.join(parts[-2:])

    def _compress_doc(self, doc: str) -> str:
        """压缩文档字符串：只保留首句 + 核心信息"""
        if not doc:
            return None
        # 取第一句（到句号/换行）
        first_sentence = re.split(r'[。.\n]', doc)[0]
        if len(first_sentence) > 40:
            first_sentence = first_sentence[:40] + '…'
        return first_sentence.strip()

    def decompress(self, compressed: dict) -> dict:
        """解压缩：恢复为可查询的格式"""
        symbols = compressed.get('sym', {})

        def _sym(id_list: list) -> list:
            result = []
            for i in id_list:
                name = symbols.get(str(i), None)
                if name:
                    result.append(name)
            return result

        files = []
        for f in compressed.get('files', []):
            files.append({
                'path': f.get('p', ''),
                'language': f.get('l', ''),
                'lines': 0,
                'functions': _sym(f.get('f', [])),
                'classes': _sym(f.get('c', [])),
                'docstring': f.get('d'),
                'keywords': _sym(f.get('k', [])),
                'redacted': f.get('r', 0) == 1,
            })

        st = compressed.get('st', {})
        return {
            'source': compressed.get('src', ''),
            'total_files': st.get('f', 0),
            'total_lines': st.get('l', 0),
            'total_size': st.get('s', 0),
            'redacted_count': st.get('r', 0),
            'languages': {k: v for k, v in st.get('lg', {}).items()},
            'files': files,
            'all_functions': [fn for f in files for fn in f['functions']],
            'all_classes': [cls for f in files for cls in f['classes']],
            'top_keywords': [(symbols.get(str(k), '?'), c) for k, c in compressed.get('tkw', [])],
        }

    def get_compression_ratio(self, original_size: int, compressed: dict) -> float:
        """计算压缩率"""
        compressed_size = len(json.dumps(compressed, ensure_ascii=False))
        return (1 - compressed_size / max(original_size, 1)) * 100
