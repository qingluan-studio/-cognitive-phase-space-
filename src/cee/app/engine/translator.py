"""
翻译引擎。

提供多语言翻译能力，包括基于规则的中英互译预处理、
术语表管理、翻译风格控制、批量翻译、翻译记忆等功能。
"""

import hashlib
import json
import re
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Optional


class TranslationStyle(Enum):
    FORMAL = "formal"
    CASUAL = "casual"
    ACADEMIC = "academic"
    LEGAL = "legal"
    TECHNICAL = "technical"


class Language(Enum):
    CHINESE = "zh"
    ENGLISH = "en"
    JAPANESE = "ja"
    KOREAN = "ko"
    FRENCH = "fr"
    GERMAN = "de"
    SPANISH = "es"
    RUSSIAN = "ru"
    UNKNOWN = "unknown"


@dataclass
class GlossaryEntry:
    source: str = ""
    target: str = ""
    language_pair: str = "zh-en"
    domain: str = "general"
    notes: str = ""


@dataclass
class TranslationResult:
    source_text: str = ""
    translated_text: str = ""
    source_lang: str = "unknown"
    target_lang: str = "unknown"
    style: str = "formal"
    confidence: float = 0.0
    cached: bool = False
    alternatives: list[str] = field(default_factory=list)
    glossary_matches: list[dict] = field(default_factory=list)


@dataclass
class BatchTranslationResult:
    results: list[TranslationResult] = field(default_factory=list)
    total_chars: int = 0
    cached_count: int = 0
    processing_time: float = 0.0


class TranslatorEngine:
    """多语言翻译引擎。"""

    _chinese_pinyin_map = {
        "你": "ni", "好": "hao", "我": "wo", "是": "shi",
        "他": "ta", "她": "ta", "们": "men", "的": "de",
        "了": "le", "在": "zai", "不": "bu", "人": "ren",
        "有": "you", "和": "he", "就": "jiu", "都": "dou",
        "一": "yi", "上": "shang", "也": "ye", "很": "hen",
        "到": "dao", "说": "shuo", "要": "yao", "去": "qu",
        "会": "hui", "着": "zhe", "看": "kan", "爱": "ai",
        "天": "tian", "地": "di", "大": "da", "小": "xiao",
        "中": "zhong", "国": "guo", "家": "jia", "学": "xue",
        "生": "sheng", "工": "gong", "作": "zuo", "时": "shi",
        "年": "nian", "月": "yue", "日": "ri", "书": "shu",
        "水": "shui", "火": "huo", "山": "shan", "石": "shi",
        "风": "feng", "雨": "yu", "云": "yun", "花": "hua",
        "树": "shu", "鱼": "yu", "鸟": "niao", "马": "ma",
        "男": "nan", "女": "nv", "老": "lao", "少": "shao",
        "高": "gao", "低": "di", "长": "chang", "短": "duan",
        "多": "duo", "少": "shao", "快": "kuai", "慢": "man",
        "热": "re", "冷": "leng", "新": "xin", "旧": "jiu",
        "好": "hao", "坏": "huai", "对": "dui", "错": "cuo",
        "前": "qian", "后": "hou", "左": "zuo", "右": "you",
        "里": "li", "外": "wai", "上": "shang", "下": "xia",
        "东": "dong", "南": "nan", "西": "xi", "北": "bei",
        "春": "chun", "夏": "xia", "秋": "qiu", "冬": "dong",
        "红": "hong", "绿": "lv", "蓝": "lan", "白": "bai",
        "黑": "hei", "黄": "huang", "美": "mei", "丽": "li",
        "明": "ming", "亮": "liang", "暗": "an", "深": "shen",
        "浅": "qian", "重": "zhong", "轻": "qing", "厚": "hou",
        "薄": "bao", "胖": "pang", "瘦": "shou", "远": "yuan",
        "近": "jin", "真": "zhen", "假": "jia", "善": "shan",
        "恶": "e", "知": "zhi", "道": "dao", "想": "xiang",
        "能": "neng", "可": "ke", "以": "yi", "用": "yong",
        "做": "zuo", "吃": "chi", "喝": "he", "走": "zou",
        "跑": "pao", "飞": "fei", "写": "xie", "读": "du",
        "听": "ting", "唱": "chang", "笑": "xiao", "哭": "ku",
        "问": "wen", "答": "da", "买": "mai", "卖": "mai",
        "开": "kai", "关": "guan", "进": "jin", "出": "chu",
    }

    _zh_en_common = {
        "你好": "Hello",
        "谢谢": "Thank you",
        "再见": "Goodbye",
        "对不起": "Sorry",
        "没关系": "You're welcome",
        "请": "Please",
        "是的": "Yes",
        "不是": "No",
        "可能": "Maybe",
        "为什么": "Why",
        "什么": "What",
        "谁": "Who",
        "哪里": "Where",
        "什么时候": "When",
        "怎么": "How",
        "多少": "How much",
        "今天": "Today",
        "明天": "Tomorrow",
        "昨天": "Yesterday",
        "现在": "Now",
        "早上": "Morning",
        "下午": "Afternoon",
        "晚上": "Evening",
        "星期": "Week",
        "月": "Month",
        "年": "Year",
        "天气": "Weather",
        "朋友": "Friend",
        "家庭": "Family",
        "工作": "Work",
        "学校": "School",
        "医院": "Hospital",
        "餐厅": "Restaurant",
        "商店": "Store",
        "电话": "Phone",
        "电脑": "Computer",
        "网络": "Internet",
        "帮助": "Help",
        "问题": "Question",
        "答案": "Answer",
        "名字": "Name",
        "地址": "Address",
        "时间": "Time",
        "地点": "Place",
        "价格": "Price",
        "颜色": "Color",
        "大小": "Size",
        "数量": "Quantity",
        "质量": "Quality",
        "速度": "Speed",
        "温度": "Temperature",
    }

    _en_zh_common = {v.lower(): k for k, v in _zh_en_common.items()}

    def __init__(self, cache_size: int = 1000, default_style: TranslationStyle = TranslationStyle.FORMAL):
        self.cache_size = cache_size
        self.default_style = default_style
        self._translation_cache: dict[str, str] = {}
        self._glossary: dict[str, list[GlossaryEntry]] = {}
        self._style_rules = self._init_style_rules()

    def _init_style_rules(self) -> dict:
        return {
            TranslationStyle.FORMAL: {
                "zh-en": {
                    "的": "of",
                },
            },
            TranslationStyle.CASUAL: {
                "zh-en": {
                    "的": "'s",
                },
            },
            TranslationStyle.ACADEMIC: {
                "zh-en": {
                    "的": "of",
                },
            },
        }

    def translate(self, text: str, source_lang: str = "zh",
                  target_lang: str = "en",
                  style: TranslationStyle | None = None) -> TranslationResult:
        style = style or self.default_style
        source_lang = self._normalize_lang(source_lang)
        target_lang = self._normalize_lang(target_lang)

        if not text.strip():
            return TranslationResult(
                source_text=text, translated_text=text,
                source_lang=source_lang, target_lang=target_lang,
                confidence=1.0,
            )

        cache_key = self._cache_key(text, source_lang, target_lang, style)
        if cache_key in self._translation_cache:
            cached = self._translation_cache[cache_key]
            return TranslationResult(
                source_text=text, translated_text=cached,
                source_lang=source_lang, target_lang=target_lang,
                style=style.value, confidence=0.9, cached=True,
            )

        if source_lang == "zh" and target_lang == "en":
            result = self._translate_zh_to_en(text, style)
        elif source_lang == "en" and target_lang == "zh":
            result = self._translate_en_to_zh(text, style)
        elif source_lang == "ja" and target_lang == "zh":
            result = self._translate_ja_to_zh(text, style)
        else:
            result = self._translate_generic(text, source_lang, target_lang, style)

        self._cache_result(cache_key, result.translated_text)
        return result

    def _normalize_lang(self, lang: str) -> str:
        mapping = {
            "zh": "zh", "chinese": "zh", "中文": "zh", "cn": "zh",
            "en": "en", "english": "en", "英文": "en", "us": "en",
            "ja": "ja", "japanese": "ja", "日文": "ja", "jp": "ja",
            "ko": "ko", "korean": "ko", "韩文": "ko", "kr": "ko",
            "fr": "fr", "french": "fr", "法文": "fr",
            "de": "de", "german": "de", "德文": "de",
            "es": "es", "spanish": "es", "西班牙文": "es",
            "ru": "ru", "russian": "ru", "俄文": "ru",
        }
        return mapping.get(lang.lower(), lang.lower())

    def _cache_key(self, text: str, source: str, target: str,
                   style: TranslationStyle) -> str:
        raw = "{}|{}|{}|{}".format(text, source, target, style.value)
        return hashlib.md5(raw.encode()).hexdigest()

    def _cache_result(self, key: str, translated: str):
        if len(self._translation_cache) >= self.cache_size:
            oldest = next(iter(self._translation_cache))
            del self._translation_cache[oldest]
        self._translation_cache[key] = translated

    def _translate_zh_to_en(self, text: str,
                            style: TranslationStyle) -> TranslationResult:
        words = self._segment_chinese(text)
        translated_parts = []
        glossary_matches = []

        for word in words:
            if word in self._zh_en_common:
                translated_parts.append(self._zh_en_common[word])
            elif word in self._chinese_pinyin_map:
                translated_parts.append("[{}]".format(word))
            else:
                translated_parts.append("[{}]".format(word))

        g_matches = self._lookup_glossary(text, "zh", "en")
        glossary_matches = [asdict(g) for g in g_matches]

        result = " ".join(translated_parts)
        result = self._apply_style(result, style, "zh-en")

        return TranslationResult(
            source_text=text,
            translated_text=result,
            source_lang="zh",
            target_lang="en",
            style=style.value,
            confidence=0.6,
            glossary_matches=glossary_matches,
        )

    def _translate_en_to_zh(self, text: str,
                            style: TranslationStyle) -> TranslationResult:
        words = text.split()
        translated_parts = []
        glossary_matches = []

        for word in words:
            key = word.lower().strip(",.!?;:\"'")
            if key in self._en_zh_common:
                translated_parts.append(self._en_zh_common[key])
            elif re.match(r"^[A-Z][a-z]+$", word):
                translated_parts.append("[{}]".format(word))
            else:
                translated_parts.append("[{}]".format(word))

        g_matches = self._lookup_glossary(text, "en", "zh")
        glossary_matches = [asdict(g) for g in g_matches]

        result = "".join(translated_parts)
        result = self._apply_style(result, style, "en-zh")

        return TranslationResult(
            source_text=text,
            translated_text=result,
            source_lang="en",
            target_lang="zh",
            style=style.value,
            confidence=0.6,
            glossary_matches=glossary_matches,
        )

    def _translate_ja_to_zh(self, text: str,
                            style: TranslationStyle) -> TranslationResult:
        ja_zh_map = {
            "ありがとう": "谢谢",
            "すみません": "对不起",
            "こんにちは": "你好",
            "さようなら": "再见",
            "はい": "是的",
            "いいえ": "不是",
            "おはよう": "早上好",
            "こんばんは": "晚上好",
        }

        result_text = text
        for jp, zh in ja_zh_map.items():
            if jp in result_text:
                result_text = result_text.replace(jp, zh)

        return TranslationResult(
            source_text=text,
            translated_text=result_text,
            source_lang="ja",
            target_lang="zh",
            style=style.value,
            confidence=0.5,
        )

    def _translate_generic(self, text: str, source: str, target: str,
                           style: TranslationStyle) -> TranslationResult:
        return TranslationResult(
            source_text=text,
            translated_text="[{}->{} 翻译需要外部模型支持: {}]".format(source, target, text[:50]),
            source_lang=source,
            target_lang=target,
            style=style.value,
            confidence=0.1,
        )

    def _segment_chinese(self, text: str) -> list[str]:
        dict_words = sorted(self._zh_en_common.keys(), key=len, reverse=True)
        remaining = text
        result = []

        while remaining:
            matched = False
            for word in dict_words:
                if remaining.startswith(word):
                    result.append(word)
                    remaining = remaining[len(word):]
                    matched = True
                    break
            if not matched:
                result.append(remaining[0])
                remaining = remaining[1:]

        return result

    def _apply_style(self, text: str, style: TranslationStyle,
                     lang_pair: str) -> str:
        rules = self._style_rules.get(style, {}).get(lang_pair, {})
        for source, target in rules.items():
            text = text.replace(source, target)
        return text

    def batch_translate(self, texts: list[str], source_lang: str = "zh",
                        target_lang: str = "en",
                        style: TranslationStyle | None = None) -> BatchTranslationResult:
        import time
        start = time.time()
        results = []
        total_chars = 0
        cached_count = 0

        for text in texts:
            result = self.translate(text, source_lang, target_lang, style)
            results.append(result)
            total_chars += len(text)
            if result.cached:
                cached_count += 1

        return BatchTranslationResult(
            results=results,
            total_chars=total_chars,
            cached_count=cached_count,
            processing_time=time.time() - start,
        )

    def add_glossary_entry(self, source: str, target: str,
                           language_pair: str = "zh-en",
                           domain: str = "general",
                           notes: str = ""):
        entry = GlossaryEntry(
            source=source, target=target,
            language_pair=language_pair, domain=domain, notes=notes,
        )
        if language_pair not in self._glossary:
            self._glossary[language_pair] = []
        self._glossary[language_pair].append(entry)

    def _lookup_glossary(self, text: str, source_lang: str,
                         target_lang: str) -> list[GlossaryEntry]:
        pair = "{}-{}".format(source_lang, target_lang)
        entries = self._glossary.get(pair, [])
        matches = []
        for entry in entries:
            if entry.source.lower() in text.lower():
                matches.append(entry)
        return matches

    def get_glossary(self, language_pair: str = "zh-en") -> list[GlossaryEntry]:
        return self._glossary.get(language_pair, [])

    def clear_glossary(self, language_pair: str | None = None):
        if language_pair:
            self._glossary.pop(language_pair, None)
        else:
            self._glossary.clear()

    def detect_language(self, text: str) -> str:
        if not text.strip():
            return "unknown"

        chinese_chars = len(re.findall(r"[\u4e00-\u9fff]", text))
        japanese_chars = len(re.findall(r"[\u3040-\u309f\u30a0-\u30ff]", text))
        korean_chars = len(re.findall(r"[\uac00-\ud7af]", text))
        english_chars = len(re.findall(r"[a-zA-Z]", text))
        russian_chars = len(re.findall(r"[\u0400-\u04ff]", text))

        total = max(1, len(text))
        ch_ratio = chinese_chars / total
        jp_ratio = japanese_chars / total
        ko_ratio = korean_chars / total
        en_ratio = english_chars / total
        ru_ratio = russian_chars / total

        scores = {
            "zh": ch_ratio,
            "ja": jp_ratio + ch_ratio * 0.3,
            "ko": ko_ratio,
            "en": en_ratio,
            "ru": ru_ratio,
        }

        best = max(scores, key=scores.get)
        if scores[best] > 0.3:
            return best
        return "unknown"

    def to_pinyin(self, text: str, tone_marks: bool = False) -> str:
        result = []
        for char in text:
            pinyin = self._chinese_pinyin_map.get(char)
            if pinyin:
                if tone_marks:
                    pinyin = self._add_tone_mark(pinyin, char)
                result.append(pinyin)
            else:
                result.append(char)
        return " ".join(result)

    def _add_tone_mark(self, pinyin: str, char: str) -> str:
        return pinyin

    def clear_cache(self):
        self._translation_cache.clear()

    def get_cache_size(self) -> int:
        return len(self._translation_cache)

    def get_cache_info(self) -> dict:
        return {
            "size": len(self._translation_cache),
            "max_size": self.cache_size,
            "usage_ratio": len(self._translation_cache) / max(1, self.cache_size),
        }

    def get_supported_languages(self) -> list[str]:
        return ["zh", "en", "ja", "ko", "fr", "de", "es", "ru"]

    def get_supported_styles(self) -> list[str]:
        return [s.value for s in TranslationStyle]
