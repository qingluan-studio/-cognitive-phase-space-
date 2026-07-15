"""
compression.py — 压缩算法引擎

实现霍夫曼编码、算术编码、游程编码与 Burrows-Wheeler 变换，
支持熵编码与字典编码方法。
"""

from __future__ import annotations

import math
import heapq
from typing import List, Tuple, Dict, Optional
from collections import Counter


class HuffmanNode:
    """霍夫曼树节点。"""

    def __init__(self, symbol: Optional[str] = None, freq: float = 0.0,
                 left: Optional[HuffmanNode] = None, right: Optional[HuffmanNode] = None):
        self.symbol = symbol
        self.freq = freq
        self.left = left
        self.right = right
        self.code = ""

    def __lt__(self, other: HuffmanNode) -> bool:
        return self.freq < other.freq


class HuffmanCoder:
    """霍夫曼编码器。"""

    def __init__(self):
        self.codes: Dict[str, str] = {}
        self.tree: Optional[HuffmanNode] = None

    def build_tree(self, frequencies: Dict[str, float]) -> None:
        """构建霍夫曼树。"""
        heap = [HuffmanNode(sym, freq) for sym, freq in frequencies.items()]
        heapq.heapify(heap)
        while len(heap) > 1:
            left = heapq.heappop(heap)
            right = heapq.heappop(heap)
            merged = HuffmanNode(None, left.freq + right.freq, left, right)
            heapq.heappush(heap, merged)
        self.tree = heap[0] if heap else None
        self.codes = {}
        if self.tree:
            self._assign_codes(self.tree, "")

    def _assign_codes(self, node: HuffmanNode, code: str) -> None:
        """递归分配编码。"""
        node.code = code
        if node.symbol is not None:
            self.codes[node.symbol] = code
        if node.left:
            self._assign_codes(node.left, code + "0")
        if node.right:
            self._assign_codes(node.right, code + "1")

    def encode(self, data: str) -> str:
        """编码字符串。"""
        return "".join(self.codes.get(c, "") for c in data)

    def decode(self, encoded: str) -> str:
        """解码比特串。"""
        if not self.tree:
            return ""
        result = []
        node = self.tree
        for bit in encoded:
            if bit == "0" and node.left:
                node = node.left
            elif node.right:
                node = node.right
            if node.symbol is not None:
                result.append(node.symbol)
                node = self.tree
        return "".join(result)

    def average_code_length(self, frequencies: Dict[str, float]) -> float:
        """计算平均码长。"""
        total = sum(frequencies.values())
        if total == 0:
            return 0.0
        return sum(len(self.codes[s]) * f for s, f in frequencies.items()) / total

    def efficiency(self, frequencies: Dict[str, float]) -> float:
        """计算编码效率。"""
        from .shannon_entropy import ShannonEntropy
        entropy = ShannonEntropy(base=2.0).discrete_entropy(list(frequencies.values()))
        avg_len = self.average_code_length(frequencies)
        return entropy / avg_len if avg_len > 0 else 0.0

    def redundancy(self, frequencies: Dict[str, float]) -> float:
        """计算编码冗余。"""
        avg_len = self.average_code_length(frequencies)
        from .shannon_entropy import ShannonEntropy
        entropy = ShannonEntropy(base=2.0).discrete_entropy(list(frequencies.values()))
        return avg_len - entropy


class ArithmeticCoder:
    """简易算术编码器。"""

    def __init__(self, precision: int = 32):
        self.precision = precision
        self.full = 1 << precision
        self.half = self.full >> 1
        self.quarter = self.half >> 1

    def encode(self, data: str, frequencies: Dict[str, float]) -> Tuple[int, int]:
        """算术编码，返回 (value, length)。"""
        total = sum(frequencies.values())
        cumul = {}
        cum = 0.0
        for sym in sorted(frequencies.keys()):
            cumul[sym] = cum
            cum += frequencies[sym] / total

        low, high = 0.0, 1.0
        for sym in data:
            range_ = high - low
            high = low + range_ * (cumul[sym] + frequencies[sym] / total)
            low = low + range_ * cumul[sym]

        value = (low + high) / 2.0
        length = math.ceil(-math.log(high - low, 2)) if high > low else 0
        return int(value * (1 << length)), length

    def decode(self, value: int, length: int, data_len: int,
               frequencies: Dict[str, float]) -> str:
        """算术解码。"""
        total = sum(frequencies.values())
        cumul = {}
        cum = 0.0
        for sym in sorted(frequencies.keys()):
            cumul[sym] = cum
            cum += frequencies[sym] / total

        code = value / (1 << length)
        result = []
        for _ in range(data_len):
            for sym in sorted(frequencies.keys()):
                sym_low = cumul[sym]
                sym_high = sym_low + frequencies[sym] / total
                if sym_low <= code < sym_high:
                    result.append(sym)
                    code = (code - sym_low) / (sym_high - sym_low)
                    break
        return "".join(result)

    def compression_ratio(self, original_bits: int, encoded_bits: int) -> float:
        """计算压缩比。"""
        return encoded_bits / original_bits if original_bits > 0 else 1.0


class BurrowsWheelerTransform:
    """Burrows-Wheeler 变换。"""

    def transform(self, data: str) -> Tuple[str, int]:
        """执行 BWT，返回变换后的字符串与原字符串索引。"""
        if not data:
            return "", 0
        n = len(data)
        rotations = [data[i:] + data[:i] for i in range(n)]
        sorted_rotations = sorted(rotations)
        transformed = "".join(r[-1] for r in sorted_rotations)
        original_index = sorted_rotations.index(data)
        return transformed, original_index

    def inverse(self, transformed: str, original_index: int) -> str:
        """逆 BWT。"""
        n = len(transformed)
        table = [""] * n
        for _ in range(n):
            table = sorted(transformed[i] + table[i] for i in range(n))
        return table[original_index]

    def move_to_front(self, data: str) -> List[int]:
        """Move-to-Front 变换。"""
        alphabet = sorted(set(data))
        result = []
        for c in data:
            idx = alphabet.index(c)
            result.append(idx)
            alphabet.pop(idx)
            alphabet.insert(0, c)
        return result

    def inverse_mtf(self, indices: List[int], alphabet: List[str]) -> str:
        """逆 MTF。"""
        result = []
        alpha = list(alphabet)
        for idx in indices:
            result.append(alpha[idx])
            c = alpha.pop(idx)
            alpha.insert(0, c)
        return "".join(result)

    def rle_encode(self, data: str) -> List[Tuple[str, int]]:
        """游程编码。"""
        if not data:
            return []
        result = []
        current = data[0]
        count = 1
        for c in data[1:]:
            if c == current:
                count += 1
            else:
                result.append((current, count))
                current = c
                count = 1
        result.append((current, count))
        return result

    def rle_decode(self, encoded: List[Tuple[str, int]]) -> str:
        """逆游程编码。"""
        return "".join(c * count for c, count in encoded)

    def bwt_compress_pipeline(self, data: str) -> Tuple[List[int], int, List[str]]:
        """完整的 BWT + MTF + RLE 压缩流水线。"""
        transformed, idx = self.transform(data)
        mtf = self.move_to_front(transformed)
        alphabet = sorted(set(data))
        return mtf, idx, alphabet

    def bwt_decompress_pipeline(self, mtf: List[int], idx: int, alphabet: List[str]) -> str:
        """完整的解压流水线。"""
        transformed = self.inverse_mtf(mtf, alphabet)
        return self.inverse(transformed, idx)
