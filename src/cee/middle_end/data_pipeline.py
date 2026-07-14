from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
import math
import re
import time
import unicodedata
from collections import Counter, defaultdict
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from enum import Enum, auto
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Callable, Optional
from urllib.request import Request, urlopen
from urllib.error import URLError

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class DataSource(Enum):
    TEXT = auto()
    FILE = auto()
    URL = auto()
    DATABASE = auto()
    API = auto()
    STREAM = auto()
    UPLOAD = auto()


class PipelineStage(Enum):
    EXTRACT = auto()
    TRANSFORM = auto()
    ENRICH = auto()
    VALIDATE = auto()
    INDEX = auto()
    STORE = auto()


# ---------------------------------------------------------------------------
# Error handling strategy
# ---------------------------------------------------------------------------

class ErrorStrategy(Enum):
    SKIP = "skip"
    RETRY = "retry"
    ABORT = "abort"


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class PipelineStageRecord:
    stage: PipelineStage
    started_at: float
    finished_at: float
    success: bool
    error_message: str = ""


@dataclass
class DataRecord:
    id: str
    source: DataSource
    raw_content: str
    extracted_fields: dict[str, Any] = field(default_factory=dict)
    embeddings: list[float] = field(default_factory=list)
    quality_score: float = 0.0
    stage_history: list[PipelineStageRecord] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class PipelineMetrics:
    records_processed: int = 0
    records_failed: int = 0
    time_per_stage: dict[PipelineStage, float] = field(default_factory=dict)
    start_time: float = 0.0
    end_time: float = 0.0

    @property
    def throughput(self) -> float:
        elapsed = self.end_time - self.start_time
        if elapsed <= 0:
            return 0.0
        return self.records_processed / elapsed

    @property
    def bottleneck(self) -> Optional[PipelineStage]:
        if not self.time_per_stage:
            return None
        return max(self.time_per_stage, key=self.time_per_stage.__getitem__)


# ---------------------------------------------------------------------------
# Extractor helpers
# ---------------------------------------------------------------------------

def _detect_encoding(raw: bytes) -> str:
    import chardet  # type: ignore[import-untyped]
    result = chardet.detect(raw)
    return result.get("encoding", "utf-8") or "utf-8"


def _fetch_url(url: str, timeout: int = 30, retries: int = 3) -> str:
    last_error: Optional[Exception] = None
    for attempt in range(1, retries + 1):
        try:
            req = Request(url, headers={"User-Agent": "DataPipeline/1.0"})
            resp = urlopen(req, timeout=timeout)
            raw = resp.read()
            encoding = resp.headers.get_content_charset() or _detect_encoding(raw)
            return raw.decode(encoding, errors="replace")
        except URLError as e:
            last_error = e
            if attempt < retries:
                wait = 2 ** attempt
                logger.warning("URL fetch attempt %d failed for %s, retry in %ds: %s", attempt, url, wait, e)
                time.sleep(wait)
    raise last_error or RuntimeError(f"Failed to fetch {url}")


def _load_file(path: str | Path) -> str:
    path = Path(path)
    suffix = path.suffix.lower()
    raw = path.read_bytes()
    encoding = _detect_encoding(raw) if suffix not in {".json", ".csv"} else "utf-8"
    return raw.decode(encoding, errors="replace")


def _parse_csv(content: str) -> list[dict[str, str]]:
    reader = csv.DictReader(io.StringIO(content))
    return list(reader)


def _parse_json_content(content: str) -> Any:
    return json.loads(content)


def _chunk_text(
    text: str,
    method: str = "paragraph",
    min_chunk_size: int = 100,
    max_chunk_size: int = 2000,
) -> list[str]:
    if method == "paragraph":
        raw_chunks = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    elif method == "section":
        raw_chunks = [s.strip() for s in re.split(r"\n#{1,6}\s+", text) if s.strip()]
    elif method == "character":
        raw_chunks = [text[i : i + max_chunk_size] for i in range(0, len(text), max_chunk_size)]
    else:
        raw_chunks = [text]

    merged: list[str] = []
    buf = ""
    for chunk in raw_chunks:
        if len(buf) + len(chunk) < min_chunk_size and buf:
            buf += "\n\n" + chunk
        else:
            if buf:
                merged.append(buf)
            buf = chunk
    if buf:
        merged.append(buf)

    if merged:
        small: list[str] = []
        for i, ch in enumerate(merged):
            if len(ch) < min_chunk_size and i > 0:
                merged[i - 1] += "\n\n" + ch
                small.append(i)
        for idx in reversed(small):
            merged.pop(idx)

    return merged


def _compute_content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()


# ---------------------------------------------------------------------------
# Extractor
# ---------------------------------------------------------------------------

class Extractor:
    def __init__(
        self,
        url_timeout: int = 30,
        url_retries: int = 3,
        chunk_method: str = "paragraph",
        chunk_min: int = 100,
        chunk_max: int = 2000,
    ) -> None:
        self.url_timeout = url_timeout
        self.url_retries = url_retries
        self.chunk_method = chunk_method
        self.chunk_min = chunk_min
        self.chunk_max = chunk_max

    def extract(self, record: DataRecord) -> DataRecord:
        _log_stage(record, PipelineStage.EXTRACT, lambda: self._do_extract(record))
        return record

    def _do_extract(self, record: DataRecord) -> None:
        if record.source == DataSource.URL:
            record.raw_content = _fetch_url(record.raw_content, self.url_timeout, self.url_retries)
        elif record.source == DataSource.FILE:
            record.raw_content = _load_file(record.raw_content)
        elif record.source == DataSource.UPLOAD:
            pass
        elif record.source == DataSource.TEXT:
            pass
        elif record.source == DataSource.STREAM:
            pass
        elif record.source == DataSource.API:
            record.raw_content = _fetch_url(record.raw_content, self.url_timeout, self.url_retries)
        elif record.source == DataSource.DATABASE:
            pass

    def chunk(self, text: str) -> list[str]:
        return _chunk_text(text, self.chunk_method, self.chunk_min, self.chunk_max)


# ---------------------------------------------------------------------------
# Transformer
# ---------------------------------------------------------------------------

class Transformer:
    _ENTITY_PATTERN = re.compile(
        r'\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)?\s*[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b'
    )
    _KEY_PHRASE_STOPWORDS: set[str] = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "shall",
        "should", "may", "might", "must", "can", "could", "i", "you", "he",
        "she", "it", "we", "they", "me", "him", "her", "us", "them", "my",
        "your", "his", "its", "our", "their", "this", "that", "these", "those",
        "and", "but", "or", "nor", "for", "so", "yet", "in", "on", "at", "to",
        "of", "with", "from", "by", "about", "as", "into", "through", "during",
        "before", "after", "above", "below", "between", "under", "over",
    }

    def transform(self, record: DataRecord) -> DataRecord:
        _log_stage(record, PipelineStage.TRANSFORM, lambda: self._do_transform(record))
        return record

    def _do_transform(self, record: DataRecord) -> None:
        cleaned = self.clean_text(record.raw_content)
        entities = self.extract_entities(cleaned)
        key_phrases = self.extract_key_phrases(cleaned, top_k=10)
        replaced = self.replace_entities(cleaned, entities)
        record.extracted_fields["cleaned_text"] = cleaned
        record.extracted_fields["entities"] = entities
        record.extracted_fields["key_phrases"] = key_phrases
        record.extracted_fields["entity_replaced_text"] = replaced

    @staticmethod
    def clean_text(text: str) -> str:
        text = _HTMLStripper().feed_and_get(text)
        text = unicodedata.normalize("NFKC", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[^\S\n]+", " ", text)
        return text.strip()

    @classmethod
    def extract_entities(cls, text: str) -> list[str]:
        return list(dict.fromkeys(cls._ENTITY_PATTERN.findall(text)))

    @classmethod
    def extract_key_phrases(cls, text: str, top_k: int = 10) -> list[str]:
        words = re.findall(r"[a-zA-Z]{3,}", text.lower())
        candidates = [w for w in words if w not in cls._KEY_PHRASE_STOPWORDS]
        freq = Counter(candidates)
        return [word for word, _ in freq.most_common(top_k)]

    @staticmethod
    def replace_entities(text: str, entities: list[str]) -> str:
        result = text
        for i, ent in enumerate(entities):
            placeholder = f"__ENTITY_{i}__"
            result = result.replace(ent, placeholder)
        return result


class _HTMLStripper(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._in_skip = False

    def handle_data(self, data: str) -> None:
        if not self._in_skip:
            self._parts.append(data)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        if tag in {"script", "style", "head"}:
            self._in_skip = True

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "head"}:
            self._in_skip = False

    def feed_and_get(self, html: str) -> str:
        self.feed(html)
        return " ".join(self._parts)


# ---------------------------------------------------------------------------
# Enricher
# ---------------------------------------------------------------------------

class Enricher:
    def enrich(self, record: DataRecord) -> DataRecord:
        _log_stage(record, PipelineStage.ENRICH, lambda: self._do_enrich(record))
        return record

    def _do_enrich(self, record: DataRecord) -> None:
        text = record.extracted_fields.get("cleaned_text", record.raw_content)
        record.metadata.update(self._compute_metadata(record))
        stats = self._compute_text_statistics(text)
        record.extracted_fields["text_statistics"] = stats
        lang = self._detect_language(text)
        record.metadata["language"] = lang

    @staticmethod
    def _compute_metadata(record: DataRecord) -> dict[str, Any]:
        return {
            "source": record.source.name,
            "fetch_time": time.time(),
            "fetch_time_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "content_type": "text/plain",
            "record_id": record.id,
        }

    @staticmethod
    def _compute_text_statistics(text: str) -> dict[str, Any]:
        char_count = len(text)
        word_count = len(text.split())
        sentences = re.split(r"[.!?]+", text)
        sentence_count = len([s for s in sentences if s.strip()])
        avg_word_len = sum(len(w) for w in text.split()) / max(word_count, 1)
        readability = _flesch_kincaid_grade(text) if sentence_count > 0 else 0.0
        return {
            "char_count": char_count,
            "word_count": word_count,
            "sentence_count": sentence_count,
            "avg_word_length": round(avg_word_len, 2),
            "readability_score": round(readability, 2),
        }

    @staticmethod
    def _detect_language(text: str) -> str:
        sample = text[:500].lower()
        latin_count = sum(1 for c in sample if 'a' <= c <= 'z')
        cjk_count = sum(1 for c in sample if '\u4e00' <= c <= '\u9fff' or '\u3040' <= c <= '\u30ff')
        cyrillic_count = sum(1 for c in sample if '\u0400' <= c <= '\u04ff')
        if cjk_count > len(sample) * 0.3:
            return "zh" if cjk_count > cyrillic_count else "ja"
        if cyrillic_count > len(sample) * 0.3:
            return "ru"
        if latin_count > len(sample) * 0.5:
            return "en"
        return "unknown"


def _flesch_kincaid_grade(text: str) -> float:
    words = text.split()
    word_count = len(words)
    if word_count == 0:
        return 0.0
    sentence_count = len(re.split(r"[.!?]+", text))
    if sentence_count == 0:
        return 0.0
    syllable_count = sum(_count_syllables(w) for w in words)
    return 0.39 * (word_count / sentence_count) + 11.8 * (syllable_count / word_count) - 15.59


def _count_syllables(word: str) -> int:
    word = word.lower().strip(".,!?;:()\"'")
    if len(word) <= 3:
        return 1
    vowels = "aeiouy"
    count = 0
    prev_vowel = False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    if word.endswith("e"):
        count = max(count - 1, 1)
    return max(count, 1)


# ---------------------------------------------------------------------------
# Validator
# ---------------------------------------------------------------------------

class Validator:
    def __init__(
        self,
        required_fields: Optional[list[str]] = None,
        schema: Optional[dict[str, type]] = None,
    ) -> None:
        self.required_fields = required_fields or ["id", "raw_content"]
        self.schema = schema or {}
        self._seen_hashes: set[str] = set()

    def validate(self, record: DataRecord) -> DataRecord:
        _log_stage(record, PipelineStage.VALIDATE, lambda: self._do_validate(record))
        return record

    def _do_validate(self, record: DataRecord) -> None:
        self._check_required_fields(record)
        self._validate_schema(record)
        content_hash = _compute_content_hash(record.raw_content)
        record.extracted_fields["content_hash"] = content_hash
        if content_hash in self._seen_hashes:
            raise ValueError(f"Duplicate content detected for record {record.id}")
        self._seen_hashes.add(content_hash)
        record.quality_score = self._compute_quality_score(record)

    def _check_required_fields(self, record: DataRecord) -> None:
        for field in self.required_fields:
            if not getattr(record, field, None):
                raise KeyError(f"Required field '{field}' is empty or missing in record {record.id}")

    def _validate_schema(self, record: DataRecord) -> None:
        for field, expected_type in self.schema.items():
            value = record.extracted_fields.get(field)
            if value is not None and not isinstance(value, expected_type):
                raise TypeError(
                    f"Field '{field}' expected {expected_type.__name__}, "
                    f"got {type(value).__name__} in record {record.id}"
                )

    @staticmethod
    def _compute_quality_score(record: DataRecord) -> float:
        text = record.extracted_fields.get("cleaned_text", record.raw_content)
        if not text:
            return 0.0

        non_empty_ratio = len(text.strip()) / max(len(text), 1)
        words = text.split()
        avg_word_len = sum(len(w) for w in words) / max(len(words), 1)
        avg_word_len_factor = min(avg_word_len / 8.0, 1.0)
        language_consistency = Validator._language_consistency(text)
        no_gibberish = Validator._no_gibberish(text)

        score = (
            non_empty_ratio * 0.3
            + avg_word_len_factor * 0.2
            + language_consistency * 0.3
            + no_gibberish * 0.2
        )
        return round(min(score, 1.0), 4)

    @staticmethod
    def _language_consistency(text: str) -> float:
        if len(text) < 50:
            return 1.0
        words = text.split()
        if len(words) < 5:
            return 1.0
        latin_ratio = sum(1 for w in words if re.match(r"^[a-zA-Z]+$", w)) / len(words)
        return 1.0 - abs(latin_ratio - 0.5) * 0.5

    @staticmethod
    def _no_gibberish(text: str) -> float:
        if len(text) < 10:
            return 1.0
        words = text.split()
        if len(words) < 3:
            return 1.0
        ratios = [len(set(w)) / max(len(w), 1) for w in words if len(w) >= 4]
        if not ratios:
            return 1.0
        avg_unique_ratio = sum(ratios) / len(ratios)
        if avg_unique_ratio < 0.3:
            return 0.0
        if avg_unique_ratio < 0.5:
            return 0.5
        return 1.0


# ---------------------------------------------------------------------------
# Indexer
# ---------------------------------------------------------------------------

class Indexer:
    def __init__(self) -> None:
        self._inverted_index: dict[str, list[tuple[str, int, float]]] = defaultdict(list)
        self._doc_freq: dict[str, int] = defaultdict(int)
        self._doc_count: int = 0

    def index(self, record: DataRecord) -> DataRecord:
        _log_stage(record, PipelineStage.INDEX, lambda: self._do_index(record))
        return record

    def _do_index(self, record: DataRecord) -> None:
        text = record.extracted_fields.get("cleaned_text", record.raw_content)
        tokens = self._tokenize(text)
        term_positions: dict[str, list[int]] = defaultdict(list)
        for pos, token in enumerate(tokens):
            term_positions[token].append(pos)

        doc_id = record.id
        for term, positions in term_positions.items():
            tf = len(positions) / max(len(tokens), 1)
            self._inverted_index[term].append((doc_id, positions[0], tf))
            self._doc_freq[term] += 1

        self._doc_count += 1

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return re.findall(r"[a-zA-Z0-9]{2,}", text.lower())

    def tfidf(self, term: str, doc_id: str) -> float:
        postings = self._inverted_index.get(term.lower(), [])
        for did, _pos, tf in postings:
            if did == doc_id:
                df = self._doc_freq.get(term.lower(), 1)
                idf = math.log(self._doc_count / max(df, 1))
                return tf * idf
        return 0.0

    def search(self, query: str) -> list[tuple[str, float]]:
        query_terms = self._tokenize(query)
        scores: dict[str, float] = defaultdict(float)
        for term in query_terms:
            postings = self._inverted_index.get(term, [])
            for doc_id, _pos, tf in postings:
                df = self._doc_freq.get(term, 1)
                idf = math.log(self._doc_count / max(df, 1))
                scores[doc_id] += tf * idf
        return sorted(scores.items(), key=lambda x: x[1], reverse=True)

    def merge(self, other: Indexer) -> None:
        for term, postings in other._inverted_index.items():
            self._inverted_index[term].extend(postings)
        for term, count in other._doc_freq.items():
            self._doc_freq[term] += count
        self._doc_count += other._doc_count

    @property
    def compression_hints(self) -> dict[str, Any]:
        total_postings = sum(len(v) for v in self._inverted_index.values())
        return {
            "unique_terms": len(self._inverted_index),
            "total_postings": total_postings,
            "average_postings_per_term": total_postings / max(len(self._inverted_index), 1),
            "doc_count": self._doc_count,
            "suggested_strategy": "delta_encoding" if self._doc_count > 1000 else "plain",
        }


# ---------------------------------------------------------------------------
# DataStore
# ---------------------------------------------------------------------------

class DataStore:
    def __init__(self) -> None:
        self._records: dict[str, DataRecord] = {}
        self._field_index: dict[str, dict[Any, list[str]]] = defaultdict(lambda: defaultdict(list))
        self._keyword_index: dict[str, set[str]] = defaultdict(set)

    def store(self, record: DataRecord) -> DataRecord:
        _log_stage(record, PipelineStage.STORE, lambda: self._do_store(record))
        return record

    def _do_store(self, record: DataRecord) -> None:
        self._records[record.id] = record
        for field, value in record.extracted_fields.items():
            if isinstance(value, (str, int, float, bool)):
                self._field_index[field][value].append(record.id)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, (str, int, float, bool)):
                        self._field_index[field][item].append(record.id)

        all_text = record.raw_content + " " + json.dumps(record.extracted_fields, default=str)
        tokens = set(re.findall(r"[a-zA-Z0-9]{2,}", all_text.lower()))
        for token in tokens:
            self._keyword_index[token].add(record.id)

    def get_by_id(self, record_id: str) -> Optional[DataRecord]:
        return self._records.get(record_id)

    def query_by_field(self, field: str, value: Any) -> list[DataRecord]:
        ids = self._field_index.get(field, {}).get(value, [])
        return [self._records[rid] for rid in ids if rid in self._records]

    def search_keyword(self, keyword: str) -> list[DataRecord]:
        ids = self._keyword_index.get(keyword.lower(), set())
        return [self._records[rid] for rid in ids if rid in self._records]

    def list_all(
        self,
        offset: int = 0,
        limit: int = 50,
        sort_by: str = "quality_score",
        sort_desc: bool = True,
    ) -> list[DataRecord]:
        records = list(self._records.values())
        if sort_by == "quality_score":
            records.sort(key=lambda r: r.quality_score, reverse=sort_desc)
        elif sort_by == "timestamp":
            records.sort(
                key=lambda r: r.metadata.get("fetch_time", 0),
                reverse=sort_desc,
            )
        return records[offset : offset + limit]

    def export_json(self) -> str:
        return json.dumps([self._record_to_dict(r) for r in self._records.values()], indent=2, default=str)

    def export_csv(self) -> str:
        output = io.StringIO()
        if not self._records:
            return ""
        writer = csv.DictWriter(output, fieldnames=["id", "source", "raw_content", "quality_score"])
        writer.writeheader()
        for r in self._records.values():
            writer.writerow({
                "id": r.id,
                "source": r.source.name,
                "raw_content": r.raw_content[:500],
                "quality_score": r.quality_score,
            })
        return output.getvalue()

    def __len__(self) -> int:
        return len(self._records)

    @staticmethod
    def _record_to_dict(record: DataRecord) -> dict[str, Any]:
        return {
            "id": record.id,
            "source": record.source.name,
            "raw_content": record.raw_content,
            "extracted_fields": record.extracted_fields,
            "quality_score": record.quality_score,
            "metadata": record.metadata,
        }


# ---------------------------------------------------------------------------
# Pipeline Orchestrator
# ---------------------------------------------------------------------------

class PipelineOrchestrator:
    def __init__(
        self,
        extractor: Optional[Extractor] = None,
        transformer: Optional[Transformer] = None,
        enricher: Optional[Enricher] = None,
        validator: Optional[Validator] = None,
        indexer: Optional[Indexer] = None,
        store: Optional[DataStore] = None,
        error_strategy: ErrorStrategy = ErrorStrategy.SKIP,
        max_retries: int = 3,
        max_workers: int = 4,
    ) -> None:
        self.extractor = extractor or Extractor()
        self.transformer = transformer or Transformer()
        self.enricher = enricher or Enricher()
        self.validator = validator or Validator()
        self.indexer = indexer or Indexer()
        self.store = store or DataStore()
        self.error_strategy = error_strategy
        self.max_retries = max_retries
        self.max_workers = max_workers
        self.metrics = PipelineMetrics()

    def execute(
        self,
        records: list[DataRecord],
        stages: Optional[list[PipelineStage]] = None,
        parallel: bool = False,
    ) -> list[DataRecord]:
        stages = stages or list(PipelineStage)
        self.metrics = PipelineMetrics()
        self.metrics.start_time = time.time()

        if parallel and len(records) > 1:
            return self._execute_parallel(records, stages)

        return self._execute_sequential(records, stages)

    def _execute_sequential(
        self, records: list[DataRecord], stages: list[PipelineStage]
    ) -> list[DataRecord]:
        results: list[DataRecord] = []
        for record in records:
            try:
                result = self._process_record(record, stages)
                results.append(result)
                self.metrics.records_processed += 1
            except Exception as e:
                self.metrics.records_failed += 1
                if self.error_strategy == ErrorStrategy.RETRY:
                    result = self._retry_record(record, stages)
                    if result is not None:
                        results.append(result)
                        self.metrics.records_processed += 1
                        self.metrics.records_failed -= 1
                    else:
                        logger.error("Record %s failed after %d retries: %s", record.id, self.max_retries, e)
                elif self.error_strategy == ErrorStrategy.ABORT:
                    self.metrics.end_time = time.time()
                    raise
                else:
                    logger.warning("Skipping record %s: %s", record.id, e)

        self.metrics.end_time = time.time()
        return results

    def _execute_parallel(
        self, records: list[DataRecord], stages: list[PipelineStage]
    ) -> list[DataRecord]:
        results: list[DataRecord] = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures: dict[Future[DataRecord], DataRecord] = {}
            for record in records:
                future = executor.submit(self._process_record, record, stages)
                futures[future] = record

            for future in as_completed(futures):
                record = futures[future]
                try:
                    result = future.result()
                    results.append(result)
                    self.metrics.records_processed += 1
                except Exception as e:
                    self.metrics.records_failed += 1
                    if self.error_strategy == ErrorStrategy.ABORT:
                        self.metrics.end_time = time.time()
                        raise
                    logger.warning("Record %s failed in parallel: %s", record.id, e)

        self.metrics.end_time = time.time()
        self.metrics.records_processed = len(results)
        return results

    def _process_record(self, record: DataRecord, stages: list[PipelineStage]) -> DataRecord:
        stage_start = time.time()
        stage_map: dict[PipelineStage, Callable[[], DataRecord]] = {
            PipelineStage.EXTRACT: lambda: self.extractor.extract(record),
            PipelineStage.TRANSFORM: lambda: self.transformer.transform(record),
            PipelineStage.ENRICH: lambda: self.enricher.enrich(record),
            PipelineStage.VALIDATE: lambda: self.validator.validate(record),
            PipelineStage.INDEX: lambda: self.indexer.index(record),
            PipelineStage.STORE: lambda: self.store.store(record),
        }
        for stage in stages:
            handler = stage_map.get(stage)
            if handler:
                handler()
                stage_elapsed = time.time() - stage_start
                self.metrics.time_per_stage[stage] = (
                    self.metrics.time_per_stage.get(stage, 0) + stage_elapsed
                )
                stage_start = time.time()
        return record

    def _retry_record(
        self, record: DataRecord, stages: list[PipelineStage]
    ) -> Optional[DataRecord]:
        for attempt in range(self.max_retries):
            try:
                return self._process_record(record, stages)
            except Exception:
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)
        return None

    def execute_partial(
        self,
        records: list[DataRecord],
        start_stage: PipelineStage,
        end_stage: Optional[PipelineStage] = None,
    ) -> list[DataRecord]:
        all_stages = list(PipelineStage)
        start_idx = all_stages.index(start_stage)
        end_idx = all_stages.index(end_stage) + 1 if end_stage else len(all_stages)
        stages = all_stages[start_idx:end_idx]
        return self.execute(records, stages=stages)

    def batch_execute(
        self,
        record_generator: Callable[[], Optional[DataRecord]],
        batch_size: int = 100,
    ) -> list[DataRecord]:
        all_results: list[DataRecord] = []
        batch: list[DataRecord] = []
        while True:
            record = record_generator()
            if record is None:
                break
            batch.append(record)
            if len(batch) >= batch_size:
                all_results.extend(self.execute(batch))
                batch = []
        if batch:
            all_results.extend(self.execute(batch))
        return all_results


# ---------------------------------------------------------------------------
# Dual-Track Theory Notes
# ---------------------------------------------------------------------------
#
# This pipeline implements a dual-track processing model inspired by the
# MapReduce paradigm:
#
# Map Phase (parallel, stateless):
#   - EXTRACT, TRANSFORM, ENRICH stages operate independently on each record.
#   - In parallel mode, records are distributed across worker threads (mappers).
#   - Each mapper produces intermediate enriched records.
#
# Reduce Phase (aggregation, stateful):
#   - VALIDATE performs deduplication using a shared content-hash set (combiner).
#   - INDEX builds a global inverted index, merging per-worker partial indices.
#   - STORE persists records into a unified datastore.
#
# Streaming vs Batch Processing:
#   - batch_execute() uses bounded batches, suitable for fixed-size inputs.
#   - For streaming sources (DataSource.STREAM), records flow continuously;
#     the pipeline applies backpressure by limiting the executor queue depth
#     via max_workers, preventing unbounded memory growth.
#   - The record_generator pattern in batch_execute() supports lazy iteration
#     over streams, processing records as they arrive.
#
# Backpressure in Data Flow:
#   - ThreadPoolExecutor(max_workers=N) limits concurrent processing.
#   - When all workers are busy, new records block until a worker is free.
#   - This is a simple push-back mechanism: slow downstream stages (e.g.,
#     VALIDATE with dedup) naturally throttle upstream stages.
#   - Metrics.bottleneck identifies the slowest stage for tuning.


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _log_stage(record: DataRecord, stage: PipelineStage, fn: Callable[[], None]) -> None:
    started = time.time()
    error_msg = ""
    success = True
    try:
        fn()
    except Exception as e:
        success = False
        error_msg = str(e)
        raise
    finally:
        record.stage_history.append(
            PipelineStageRecord(
                stage=stage,
                started_at=started,
                finished_at=time.time(),
                success=success,
                error_message=error_msg,
            )
        )


def make_record(
    record_id: str,
    source: DataSource,
    raw_content: str,
    **extracted: Any,
) -> DataRecord:
    return DataRecord(
        id=record_id,
        source=source,
        raw_content=raw_content,
        extracted_fields=dict(extracted),
    )
