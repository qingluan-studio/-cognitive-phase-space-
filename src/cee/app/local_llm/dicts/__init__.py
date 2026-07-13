"""
全字符字典自学习引擎 — 字典子包
==============================
四本新字典，嵌入认知涌现引擎

字典:
1. CharacterDictionary — 全量CJK汉字 (27584字)
2. SymbolDictionary    — 中文符号标点
3. CodeDictionary      — 6语言编程符号/模式
4. EmotionDictionary   — 6种核心情感 × 3级强度
"""

from .character_dict import CharacterDictionary, DictEntry, DICT_DIR
from .symbol_dict import SymbolDictionary
from .code_dict import CodeDictionary
from .emotion_dict import EmotionDictionary

__all__ = [
    "CharacterDictionary",
    "SymbolDictionary",
    "CodeDictionary",
    "EmotionDictionary",
    "DictEntry",
    "DICT_DIR",
]
