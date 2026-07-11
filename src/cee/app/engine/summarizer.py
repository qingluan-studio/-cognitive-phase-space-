"""
文本摘要引擎。

提供多策略文本摘要能力，包括抽取式摘要、关键词引导摘要、
多文档摘要、分层摘要、长度可控摘要等功能。
"""

import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field, asdict
from typing import Any, Optional

import numpy as np


@dataclass
class SentenceInfo:
    text: str = ""
    index: int = 0
    score: float = 0.0
    word_count: int = 0
    position_score: float = 0.0
    tfidf_score: float = 0.0
    keyword_score: float = 0.0
    selected: bool = False


@dataclass
class SummaryResult:
    summary: str = ""
    sentences: list[SentenceInfo] = field(default_factory=list)
    original_length: int = 0
    summary_length: int = 0
    compression_ratio: float = 0.0
    method: str = "extractive"
    quality_score: float = 0.0
    key_sentences: list[int] = field(default_factory=list)


@dataclass
class BatchSummaryResult:
    results: list[SummaryResult] = field(default_factory=list)
    total_original_chars: int = 0
    total_summary_chars: int = 0
    average_compression: float = 0.0
    processing_time: float = 0.0


class TextSummarizer:
    """多策略文本摘要引擎。"""

    _stop_words = {
        "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一",
        "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着",
        "没有", "看", "好", "自己", "这", "他", "她", "它", "们", "那", "些",
        "什么", "哪", "怎么", "吗", "吧", "呢", "啊", "哦", "嗯", "哈", "嘛",
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "could", "should", "may", "might", "shall", "to",
        "of", "in", "for", "on", "with", "at", "by", "from", "as",
        "it", "its", "this", "that", "these", "those", "and", "but",
        "or", "not", "so", "if", "then", "than", "too", "very",
    }

    _position_keywords = {
        "综上所述", "总之", "因此", "所以", "由此", "结论",
        "值得注意的是", "重要的是", "关键在于", "核心", "重点",
        "首先", "其次", "最后", "第一", "第二", "第三",
    }

    def __init__(self, default_method: str = "extractive",
                 default_ratio: float = 0.3, min_sentences: int = 2):
        self.default_method = default_method
        self.default_ratio = default_ratio
        self.min_sentences = min_sentences

    def summarize(self, text: str, ratio: float | None = None,
                  method: str | None = None, max_sentences: int | None = None,
                  keywords: list[str] | None = None,
                  min_sentences: int | None = None) -> SummaryResult:
        ratio = ratio or self.default_ratio
        method = method or self.default_method
        max_s = max_sentences
        min_s = min_sentences or self.min_sentences

        sentences = self._split_sentences(text)

        if not sentences:
            return SummaryResult(summary="", original_length=len(text))

        if method == "keyword_guided" and keywords:
            result = self._keyword_guided_summary(text, sentences, keywords, ratio, max_s, min_s)
        elif method == "hierarchical":
            result = self._hierarchical_summary(text, sentences, ratio, max_s, min_s)
        else:
            result = self._extractive_summary(text, sentences, ratio, max_s, min_s)

        return result

    def _split_sentences(self, text: str) -> list[str]:
        raw = re.split(r"(?<=[。！？.!?\n])\s*", text)
        result = []
        for s in raw:
            s = s.strip()
            if s and len(s) > 2:
                result.append(s)
        if not result and text.strip():
            result = [text.strip()]
        return result

    def _tokenize(self, text: str) -> list[str]:
        tokens = []
        for match in re.finditer(r"[\u4e00-\u9fff]+|[a-zA-Z]+|\d+", text.lower()):
            token = match.group()
            if token not in self._stop_words and len(token) > 1:
                tokens.append(token)
        return tokens

    def _extractive_summary(self, text: str, sentences: list[str],
                            ratio: float, max_s: int | None,
                            min_s: int) -> SummaryResult:
        sentence_infos = []
        all_tokens = []
        sent_tokens_list = []

        for i, sent in enumerate(sentences):
            tokens = self._tokenize(sent)
            sent_tokens_list.append(tokens)
            all_tokens.extend(tokens)
            sentence_infos.append(SentenceInfo(
                text=sent, index=i, word_count=len(tokens),
            ))

        if not all_tokens:
            return SummaryResult(summary=text, original_length=len(text))

        tf_scores = self._compute_tfidf(sent_tokens_list, all_tokens)
        total = len(sentences)

        for i, info in enumerate(sentence_infos):
            info.position_score = 1.0 - (i / total) if total > 0 else 0.0
            info.tfidf_score = tf_scores[i] if i < len(tf_scores) else 0.0
            info.keyword_score = self._compute_keyword_density(info.text)

            weight_pos = 0.3
            weight_tfidf = 0.4
            weight_kw = 0.3

            info.score = (
                weight_pos * info.position_score
                + weight_tfidf * min(1.0, info.tfidf_score)
                + weight_kw * info.keyword_score
            )

        count = max(min_s, int(len(sentences) * ratio))
        if max_s is not None:
            count = min(count, max_s)

        sorted_by_score = sorted(sentence_infos, key=lambda x: x.score, reverse=True)
        for info in sorted_by_score[:count]:
            info.selected = True

        selected = sorted(
            [info for info in sentence_infos if info.selected],
            key=lambda x: x.index,
        )

        summary_text = "".join(info.text for info in selected)
        key_indices = [info.index for info in selected]

        quality = self._evaluate_summary(text, summary_text, sentence_infos)

        return SummaryResult(
            summary=summary_text,
            sentences=sentence_infos,
            original_length=len(text),
            summary_length=len(summary_text),
            compression_ratio=len(summary_text) / max(1, len(text)),
            method="extractive",
            quality_score=quality,
            key_sentences=key_indices,
        )

    def _compute_tfidf(self, sent_tokens_list: list[list[str]],
                       all_tokens: list[str]) -> list[float]:
        num_sentences = len(sent_tokens_list)
        if num_sentences == 0 or not all_tokens:
            return [0.0] * num_sentences

        token_counter = Counter(all_tokens)
        total_tokens = sum(token_counter.values())

        df = defaultdict(int)
        for tokens in sent_tokens_list:
            unique = set(tokens)
            for t in unique:
                df[t] += 1

        scores = []
        for tokens in sent_tokens_list:
            if not tokens:
                scores.append(0.0)
                continue
            sent_score = 0.0
            for t in tokens:
                if t in token_counter and total_tokens > 0:
                    tf = token_counter[t] / total_tokens
                    idf = math.log((num_sentences + 1) / (df.get(t, 0) + 1)) + 1
                    sent_score += tf * idf
            scores.append(sent_score / len(tokens) if tokens else 0.0)

        return scores

    def _compute_keyword_density(self, text: str) -> float:
        score = 0.0
        for kw in self._position_keywords:
            if kw in text:
                score += 0.15
        proper_nouns = len(re.findall(r"[A-Z][a-z]+|[A-Z]{2,}", text))
        score += proper_nouns * 0.05
        numbers = len(re.findall(r"\d+(?:\.\d+)?%?", text))
        score += numbers * 0.03
        return min(1.0, score)

    def _keyword_guided_summary(self, text: str, sentences: list[str],
                                keywords: list[str], ratio: float,
                                max_s: int | None, min_s: int) -> SummaryResult:
        sentence_infos = []
        for i, sent in enumerate(sentences):
            info = SentenceInfo(text=sent, index=i, word_count=len(sent))
            kw_score = 0.0
            for kw in keywords:
                if kw.lower() in sent.lower():
                    kw_score += 1.0
            info.keyword_score = kw_score / max(1, len(keywords))
            info.score = info.keyword_score
            sentence_infos.append(info)

        count = max(min_s, int(len(sentences) * ratio))
        if max_s is not None:
            count = min(count, max_s)

        sorted_by_score = sorted(sentence_infos, key=lambda x: x.score, reverse=True)
        for info in sorted_by_score[:count]:
            info.selected = True

        selected = sorted(
            [info for info in sentence_infos if info.selected],
            key=lambda x: x.index,
        )
        summary_text = "".join(info.text for info in selected)

        return SummaryResult(
            summary=summary_text,
            sentences=sentence_infos,
            original_length=len(text),
            summary_length=len(summary_text),
            compression_ratio=len(summary_text) / max(1, len(text)),
            method="keyword_guided",
            quality_score=self._evaluate_summary(text, summary_text, sentence_infos),
            key_sentences=[info.index for info in selected],
        )

    def _hierarchical_summary(self, text: str, sentences: list[str],
                              ratio: float, max_s: int | None,
                              min_s: int) -> SummaryResult:
        if len(sentences) <= 3:
            return self._extractive_summary(text, sentences, ratio, max_s, min_s)

        paragraphs = text.split("\n\n")
        if len(paragraphs) <= 1:
            paragraphs = text.split("\n")

        para_summaries = []
        for para in paragraphs:
            para_sents = self._split_sentences(para)
            if para_sents:
                result = self._extractive_summary(
                    para, para_sents, max(0.3, ratio), None, max(1, len(para_sents) // 2)
                )
                para_summaries.append(result.summary)

        combined = "\n".join(para_summaries)
        combined_sents = self._split_sentences(combined)
        return self._extractive_summary(combined, combined_sents, ratio, max_s, min_s)

    def summarize_multi_document(self, documents: list[str],
                                 ratio: float | None = None,
                                 max_sentences: int | None = None) -> SummaryResult:
        ratio = ratio or self.default_ratio
        all_sentences = []
        doc_boundaries = []

        for doc in documents:
            sents = self._split_sentences(doc)
            start = len(all_sentences)
            all_sentences.extend(sents)
            doc_boundaries.append((start, len(all_sentences)))

        text = "\n".join(all_sentences)
        result = self._extractive_summary(text, all_sentences, ratio, max_sentences, self.min_sentences)
        result.method = "multi_document"

        coverage = []
        for start, end in doc_boundaries:
            doc_sents = set(all_sentences[start:end])
            selected = set(result.summary.split("\n"))
            overlap = doc_sents & selected
            coverage.append(len(overlap) / max(1, end - start))

        return result

    def batch_summarize(self, texts: list[str], ratio: float | None = None,
                        method: str | None = None) -> BatchSummaryResult:
        import time
        start = time.time()
        results = []
        total_orig = 0
        total_summ = 0

        for text in texts:
            result = self.summarize(text, ratio=ratio, method=method)
            results.append(result)
            total_orig += result.original_length
            total_summ += result.summary_length

        avg_comp = total_summ / max(1, total_orig) if results else 0.0

        return BatchSummaryResult(
            results=results,
            total_original_chars=total_orig,
            total_summary_chars=total_summ,
            average_compression=round(avg_comp, 4),
            processing_time=time.time() - start,
        )

    def _evaluate_summary(self, original: str, summary: str,
                          sentence_infos: list[SentenceInfo]) -> float:
        if not original or not summary:
            return 0.0

        orig_tokens = set(self._tokenize(original))
        summ_tokens = set(self._tokenize(summary))
        if not orig_tokens:
            return 0.0
        coverage = len(summ_tokens & orig_tokens) / len(orig_tokens)

        compression = len(summary) / max(1, len(original))
        comp_score = 1.0 - abs(compression - 0.3)

        selected = [info for info in sentence_infos if info.selected]
        avg_score = np.mean([info.score for info in selected]) if selected else 0.0

        return 0.4 * coverage + 0.3 * comp_score + 0.3 * avg_score

    def set_stop_words(self, words: set[str]):
        self._stop_words.update(words)

    def add_stop_words(self, words: set[str]):
        self._stop_words.update(words)

    def get_default_ratio(self) -> float:
        return self.default_ratio

    def get_supported_methods(self) -> list[str]:
        return ["extractive", "keyword_guided", "hierarchical", "multi_document"]
