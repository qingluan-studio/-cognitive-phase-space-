import html
import math
import re
import unicodedata
from collections import Counter
from typing import Optional

_SENSITIVE_WORDS: set[str] = set()
_COMMON_WORDS: set[str] = {
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一",
    "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着",
    "没有", "看", "好", "自己", "这", "他", "她", "它", "们", "那", "些",
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "about", "this",
    "that", "it", "its", "and", "or", "but", "if", "so", "no", "not",
    "he", "she", "we", "they", "you", "me", "him", "her", "us", "them",
}

_CN_NUM_MAP: dict[str, int] = {
    "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
}
_CN_UNIT_MAP: dict[str, int] = {
    "十": 10, "百": 100, "千": 1000, "万": 10000, "亿": 100000000,
}

_CN_DICT: set[str] = set()
_DICT_INITIALIZED: bool = False


def _init_dict() -> None:
    global _DICT_INITIALIZED, _CN_DICT
    if _DICT_INITIALIZED:
        return
    _CN_DICT = {
        "认知", "引擎", "涌现", "人工智能", "机器学习", "深度学习",
        "自然语言", "处理", "知识", "图谱", "推理", "决策", "优化",
        "系统", "架构", "模型", "算法", "数据", "分析", "理解",
        "生成", "搜索", "对话", "记忆", "学习", "思维", "创造",
        "偏差", "检测", "校正", "会话", "管理", "健康", "状态",
        "性能", "监控", "路由", "中间件", "认证", "授权",
        "文本", "图像", "音频", "视频", "多模态", "语义",
        "计算", "编程", "开发", "测试", "部署", "运维",
        "接口", "服务", "网络", "安全", "加密", "协议",
        "社区", "文明", "治理", "宪法", "监督", "执行",
        "创新", "探索", "链接", "文档", "存储", "索引",
        "数据库", "缓存", "队列", "调度", "编排", "流程",
    }
    _DICT_INITIALIZED = True


def clean_text(text: str, remove_html: bool = True,
               remove_special: bool = True,
               normalize_whitespace: bool = True) -> str:
    if not text:
        return ""
    if remove_html:
        text = re.sub(r"<[^>]+>", "", text)
        text = html.unescape(text)
    if remove_special:
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    if normalize_whitespace:
        text = re.sub(r"\s+", " ", text)
        text = text.strip()
    return text


def normalize_unicode(text: str) -> str:
    return unicodedata.normalize("NFKC", text)


def is_chinese_char(ch: str) -> bool:
    return "\u4e00" <= ch <= "\u9fff" or "\u3400" <= ch <= "\u4dbf"


def tokenize_zh(text: str) -> list[str]:
    _init_dict()
    cleaned = clean_text(text)
    result: list[str] = []
    i = 0
    n = len(cleaned)
    while i < n:
        if is_chinese_char(cleaned[i]):
            longest = cleaned[i]
            j = i + 1
            while j <= n:
                cand = cleaned[i:j]
                if cand in _CN_DICT:
                    longest = cand
                j += 1
            result.append(longest)
            i += len(longest)
        elif cleaned[i].isalpha():
            start = i
            while i < n and cleaned[i].isalpha():
                i += 1
            result.append(cleaned[start:i].lower())
        elif cleaned[i].isdigit():
            start = i
            while i < n and cleaned[i].isdigit():
                i += 1
            result.append(cleaned[start:i])
        else:
            if not cleaned[i].isspace():
                result.append(cleaned[i])
            i += 1
    return result


def tokenize_en(text: str) -> list[str]:
    cleaned = clean_text(text)
    tokens: list[str] = []
    for word in cleaned.lower().split():
        word = re.sub(r"^[^a-z0-9]+|[^a-z0-9]+$", "", word)
        if word:
            tokens.append(word)
    return tokens


def _compute_tf(tokens: list[str]) -> dict[str, float]:
    total = len(tokens)
    if total == 0:
        return {}
    counter = Counter(tokens)
    return {word: count / total for word, count in counter.items()}


def _compute_idf(documents: list[list[str]]) -> dict[str, float]:
    doc_count = len(documents)
    if doc_count == 0:
        return {}
    df: dict[str, int] = {}
    for doc_tokens in documents:
        for word in set(doc_tokens):
            df[word] = df.get(word, 0) + 1
    return {word: math.log((doc_count + 1) / (count + 1)) + 1
            for word, count in df.items()}


def extract_keywords(text: str, top_k: int = 10,
                     lang: str = "zh") -> list[tuple[str, float]]:
    segments = text.split("\n") if lang == "zh" else [text]
    tokenize_fn = tokenize_zh if lang == "zh" else tokenize_en

    words: list[list[str]] = []
    for seg in segments:
        tokens = tokenize_fn(seg)
        words.append(tokens)

    all_tokens = []
    for t in words:
        all_tokens.extend(t)

    idf = _compute_idf(words)
    tf = _compute_tf(all_tokens)
    tfidf = {}
    for word in set(all_tokens):
        if word in _COMMON_WORDS:
            continue
        if len(word) < 2:
            continue
        tfidf[word] = tf.get(word, 0) * idf.get(word, 1.0)

    sorted_words = sorted(tfidf.items(), key=lambda x: x[1], reverse=True)
    return sorted_words[:top_k]


def cosine_similarity(vec_a: dict[str, float],
                      vec_b: dict[str, float]) -> float:
    keys = set(vec_a) | set(vec_b)
    dot = sum(vec_a.get(k, 0) * vec_b.get(k, 0) for k in keys)
    norm_a = math.sqrt(sum(v ** 2 for v in vec_a.values()))
    norm_b = math.sqrt(sum(v ** 2 for v in vec_b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def jaccard_similarity(text_a: str, text_b: str,
                       lang: str = "zh") -> float:
    tokenize_fn = tokenize_zh if lang == "zh" else tokenize_en
    set_a = set(tokenize_fn(text_a))
    set_b = set(tokenize_fn(text_b))
    if not set_a and not set_b:
        return 1.0
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)


def edit_distance(s1: str, s2: str) -> int:
    m, n = len(s1), len(s2)
    if m == 0:
        return n
    if n == 0:
        return m
    prev = list(range(n + 1))
    curr = [0] * (n + 1)
    for i in range(1, m + 1):
        curr[0] = i
        for j in range(1, n + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            curr[j] = min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost,
            )
        prev, curr = curr, prev
    return prev[n]


def text_similarity(text_a: str, text_b: str,
                    method: str = "jaccard",
                    lang: str = "zh") -> float:
    if method == "cosine":
        tokenize_fn = tokenize_zh if lang == "zh" else tokenize_en
        tokens_a = tokenize_fn(text_a)
        tokens_b = tokenize_fn(text_b)
        tf_a = _compute_tf(tokens_a)
        tf_b = _compute_tf(tokens_b)
        return cosine_similarity(tf_a, tf_b)
    elif method == "edit":
        max_len = max(len(text_a), len(text_b))
        if max_len == 0:
            return 1.0
        return 1.0 - edit_distance(text_a, text_b) / max_len
    else:
        return jaccard_similarity(text_a, text_b, lang)


def extractive_summary(text: str, sentence_count: int = 3,
                       lang: str = "zh") -> str:
    if not text:
        return ""
    delim = r"[。！？\n]+" if lang == "zh" else r"[.!?\n]+"
    raw = re.split(delim, text)
    sentences = [s.strip() for s in raw if len(s.strip()) > 5]
    if not sentences:
        return text[:200]

    tokenize_fn = tokenize_zh if lang == "zh" else tokenize_en
    tokenized = [tokenize_fn(s) for s in sentences]
    tf_all = [dict(Counter(t)) for t in tokenized]
    idf = _compute_idf(tokenized)

    scores: list[float] = []
    for i, tf in enumerate(tf_all):
        score = 0.0
        for word, count in tf.items():
            score += count * idf.get(word, 0)
        scores.append(score / max(1, len(tf)))

    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    top_indices = sorted(i for i, _ in ranked[:sentence_count])
    return "。".join(sentences[i] for i in top_indices) + "。"


def markdown_to_text(md: str) -> str:
    if not md:
        return ""
    text = re.sub(r"```[\s\S]*?```", "", md)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"#{1,6}\s+", "", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"_([^_]+)_", r"\1", text)
    text = re.sub(r"~~([^~]+)~~", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", text)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\|.*\|$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[-=|]+$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*>\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    return clean_text(text)


def cn_to_arabic(cn_str: str) -> Optional[int]:
    if not cn_str:
        return None
    result = 0
    unit_val = 1
    section = 0
    for ch in reversed(cn_str):
        if ch in _CN_UNIT_MAP:
            unit = _CN_UNIT_MAP[ch]
            if unit >= 10000:
                result += section * unit
                section = 0
            else:
                unit_val = unit
        elif ch in _CN_NUM_MAP:
            section += _CN_NUM_MAP[ch] * unit_val
        else:
            return None
    result += section
    return result


def load_sensitive_words(words: list[str]) -> None:
    _SENSITIVE_WORDS.update(words)


def filter_sensitive(text: str, replacement: str = "***") -> str:
    if not _SENSITIVE_WORDS:
        return text
    result = text
    for word in sorted(_SENSITIVE_WORDS, key=len, reverse=True):
        if word in result:
            result = result.replace(word, replacement)
    return result


def extract_chinese(text: str) -> str:
    return "".join(ch for ch in text if is_chinese_char(ch))


def extract_english(text: str) -> str:
    return "".join(ch for ch in text if ch.isascii() and ch.isalpha())


def segment_paragraph(text: str, max_length: int = 500) -> list[str]:
    if len(text) <= max_length:
        return [text]
    paragraphs = text.split("\n")
    result: list[str] = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) <= max_length:
            current += para + "\n"
        else:
            if current:
                result.append(current.strip())
            current = para + "\n"
    if current:
        result.append(current.strip())
    return result or [text]


def word_count(text: str, lang: str = "zh") -> int:
    if lang == "zh":
        return len(extract_chinese(text)) + len(tokenize_en(text))
    return len(tokenize_en(text))
