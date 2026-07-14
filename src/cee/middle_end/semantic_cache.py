from __future__ import annotations

import hashlib
import heapq
import json
import math
import os
import random
import re
import time
from collections import OrderedDict, defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Callable, Optional

# =============================================================================
# Enums & Dataclasses
# =============================================================================

class CacheStrategy(Enum):
    EXACT_MATCH = auto(); SEMANTIC_NEAR = auto(); EMBEDDING_DISTANCE = auto(); HYBRID = auto()

class CacheTier(Enum):
    L1 = "l1"; L2 = "l2"; L3 = "l3"

@dataclass(order=True)
class _LRUEntry:
    last_accessed: float
    key: str = field(compare=False)

@dataclass
class CacheEntry:
    key: str; response: str
    embedding: list[float] = field(default_factory=list)
    tokens_used: int = 0
    created_at: float = field(default_factory=time.time)
    ttl_seconds: float = 3600.0
    hit_count: int = 0
    last_accessed: float = field(default_factory=time.time)
    version_tag: str = ""
    def is_expired(self) -> bool: return (time.time() - self.created_at) > self.ttl_seconds
    def touch(self) -> None: self.hit_count += 1; self.last_accessed = time.time()

# =============================================================================
# EmbeddingEngine — word-frequency vectors, cosine, Jaccard
# =============================================================================

class EmbeddingEngine:
    _token_re = re.compile(r"\b[a-zA-Z0-9]+\b")

    def __init__(self, dimension: int = 256, max_vocab: int = 10000):
        self.dimension = dimension; self.max_vocab = max_vocab
        self._vocab: dict[str, int] = {}; self._idf: dict[str, float] = {}; self._doc_count = 0

    def tokenize(self, text: str) -> list[str]:
        return self._token_re.findall(text.lower())

    def fit_vocab(self, corpus: list[str]) -> None:
        df: dict[str, int] = {}
        for doc in corpus:
            for t in set(self.tokenize(doc)): df[t] = df.get(t, 0) + 1
        self._doc_count = len(corpus)
        self._vocab = {t: i for i, (t, _) in enumerate(
            sorted(df.items(), key=lambda x: (-x[1], x[0]))[:self.max_vocab])}
        self._idf = {t: math.log((self._doc_count + 1) / (c + 1)) + 1.0
                     for t, c in df.items() if t in self._vocab}

    def encode(self, text: str) -> list[float]:
        tokens = self.tokenize(text)
        if not self._vocab: return self._encode_fallback(tokens)
        dim = min(self.dimension, len(self._vocab)); vec = [0.0] * dim
        for token in tokens:
            idx = self._vocab.get(token)
            if idx is not None and idx < dim:
                tf = 1.0 + math.log(1.0 + tokens.count(token))
                vec[idx] += tf * self._idf.get(token, 1.0)
        return self._l2_normalize(vec)

    def _encode_fallback(self, tokens: list[str]) -> list[float]:
        if not tokens: return [0.0] * self.dimension
        h: dict[int, float] = {}
        for token in set(tokens):
            idx = int(hashlib.sha256(token.encode()).hexdigest(), 16) % self.dimension
            h[idx] = h.get(idx, 0.0) + float(tokens.count(token))
        vec = [h.get(i, 0.0) for i in range(self.dimension)]
        return self._l2_normalize(vec)

    @staticmethod
    def _l2_normalize(vec: list[float]) -> list[float]:
        n = math.sqrt(sum(v * v for v in vec))
        return [v / n for v in vec] if n > 0 else [0.0] * len(vec)

    @staticmethod
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        na = math.sqrt(sum(v * v for v in a)); nb = math.sqrt(sum(v * v for v in b))
        return sum(x * y for x, y in zip(a, b)) / (na * nb) if na > 0 and nb > 0 else 0.0

    @staticmethod
    def jaccard_similarity(a: str, b: str) -> float:
        p = re.compile(r"\b[a-zA-Z0-9]+\b")
        sa, sb = set(p.findall(a.lower())), set(p.findall(b.lower()))
        if not sa and not sb: return 1.0
        if not sa or not sb: return 0.0
        return len(sa & sb) / len(sa | sb)

# =============================================================================
# LSHIndex — random hyperplane projections for approximate NN
# =============================================================================

class LSHIndex:
    def __init__(self, dim: int = 256, num_tables: int = 8, planes_per_table: int = 16):
        self.dim = dim; self.num_tables = num_tables; self.planes_per_table = planes_per_table
        self._planes: list[list[list[float]]] = []
        self._tables: list[dict[str, list[str]]] = []
        self._init_planes()

    def _init_planes(self) -> None:
        self._planes = [[[random.gauss(0, 1) for _ in range(self.dim)]
                         for _ in range(self.planes_per_table)] for _ in range(self.num_tables)]
        self._tables = [defaultdict(list) for _ in range(self.num_tables)]

    def _hash(self, vec: list[float], planes: list[list[float]]) -> str:
        v = vec[:self.dim] if len(vec) >= self.dim else vec + [0.0] * (self.dim - len(vec))
        return "".join("1" if sum(x * p for x, p in zip(v, plane)) >= 0 else "0" for plane in planes)

    def insert(self, key: str, embedding: list[float]) -> None:
        for i, planes in enumerate(self._planes):
            self._tables[i][self._hash(embedding, planes)].append(key)

    def remove(self, key: str) -> None:
        for table in self._tables:
            for bucket in list(table.values()):
                if key in bucket: bucket.remove(key)

    def query(self, embedding: list[float], top_k: int = 10) -> list[str]:
        c: dict[str, int] = {}
        for i, planes in enumerate(self._planes):
            for key in self._tables[i].get(self._hash(embedding, planes), []):
                c[key] = c.get(key, 0) + 1
        return [k for k, _ in sorted(c.items(), key=lambda x: -x[1])[:top_k]]

    def collision_score(self, key_a: str, key_b: str,
                        emb_a: list[float], emb_b: list[float]) -> int:
        return sum(1 for i, planes in enumerate(self._planes)
                   if self._hash(emb_a, planes) == self._hash(emb_b, planes))

# =============================================================================
# SemanticCache — LRU eviction, TTL, stats
# =============================================================================

class SemanticCache:
    def __init__(self, strategy: CacheStrategy = CacheStrategy.HYBRID,
                 similarity_threshold: float = 0.85, jaccard_threshold: float = 0.60,
                 max_entries: int = 1000, default_ttl: float = 3600.0,
                 embedding_engine: Optional[EmbeddingEngine] = None,
                 lsh_index: Optional[LSHIndex] = None):
        self.strategy = strategy; self.similarity_threshold = similarity_threshold
        self.jaccard_threshold = jaccard_threshold; self.max_entries = max_entries
        self.default_ttl = default_ttl
        self._entries: OrderedDict[str, CacheEntry] = OrderedDict()
        self._emb = embedding_engine or EmbeddingEngine()
        self._lsh = lsh_index
        self.hits = self.misses = self.evictions = self.expirations = 0

    @property
    def size(self) -> int: return len(self._entries)

    @property
    def hit_rate(self) -> float:
        t = self.hits + self.misses; return self.hits / t if t > 0 else 0.0

    def _expire(self) -> None:
        for k in [k for k, e in self._entries.items() if e.is_expired()]:
            self._remove(k); self.expirations += 1

    def _evict_lru(self) -> None:
        if len(self._entries) <= self.max_entries: return
        heap = [_LRUEntry(e.last_accessed, k) for k, e in self._entries.items()]
        heapq.heapify(heap)
        while len(self._entries) > self.max_entries and heap:
            x = heapq.heappop(heap)
            if x.key in self._entries and self._entries[x.key].last_accessed == x.last_accessed:
                self._remove(x.key); self.evictions += 1

    def _remove(self, key: str) -> None:
        if key in self._entries:
            if self._lsh: self._lsh.remove(key)
            del self._entries[key]

    def put(self, key: str, response: str, tokens_used: int = 0,
            ttl_seconds: Optional[float] = None, version_tag: str = "") -> CacheEntry:
        self._expire()
        embedding = self._emb.encode(key)
        entry = CacheEntry(key=key, response=response, embedding=embedding,
                           tokens_used=tokens_used,
                           ttl_seconds=ttl_seconds or self.default_ttl,
                           version_tag=version_tag)
        if len(self._entries) >= self.max_entries: self._evict_lru()
        self._entries[key] = entry; self._entries.move_to_end(key)
        if self._lsh: self._lsh.insert(key, embedding)
        return entry

    def get(self, query: str, strategy: Optional[CacheStrategy] = None,
            threshold: Optional[float] = None) -> Optional[CacheEntry]:
        self._expire()
        s = strategy or self.strategy; t = threshold
        entry: Optional[CacheEntry]
        if s == CacheStrategy.EXACT_MATCH:
            entry = self._entries.get(query)
            entry = entry if (entry and not entry.is_expired()) else None
        elif s == CacheStrategy.SEMANTIC_NEAR:
            entry = self._semantic_near(query, t or self.jaccard_threshold)
        elif s == CacheStrategy.EMBEDDING_DISTANCE:
            entry = self._embedding_distance(query, t or self.similarity_threshold)
        else:  # HYBRID
            entry = self._hybrid(query, t or self.similarity_threshold)
        if entry: entry.touch(); self._entries.move_to_end(entry.key); self.hits += 1
        else: self.misses += 1
        return entry

    def _semantic_near(self, query: str, thr: float) -> Optional[CacheEntry]:
        best, bs = None, 0.0
        for e in self._entries.values():
            if e.is_expired(): continue
            s = self._emb.jaccard_similarity(query, e.key)
            if s > bs: bs, best = s, e
        return best if best and bs >= thr else None

    def _embedding_distance(self, query: str, thr: float) -> Optional[CacheEntry]:
        qv = self._emb.encode(query)
        if self._lsh:
            cands = {k for k in self._lsh.query(qv, top_k=20)
                     if k in self._entries and not self._entries[k].is_expired()}
            items = [(self._entries[k],) for k in cands]
        else:
            items = [(e,) for e in self._entries.values() if not e.is_expired()]
        best, bs = None, 0.0
        for (entry,) in items:
            if not entry.embedding: continue
            sim = self._emb.cosine_similarity(qv, entry.embedding)
            if sim > bs: bs, best = sim, entry
        return best if best and bs >= thr else None

    def _hybrid(self, query: str, thr: float) -> Optional[CacheEntry]:
        ql = query.lower()
        for e in self._entries.values():
            if e.is_expired(): continue
            if e.key.lower() == ql: return e
        return self._embedding_distance(query, thr) or \
            self._semantic_near(query, max(self.jaccard_threshold, thr * 0.7))

    def invalidate(self, key: str) -> bool:
        if key in self._entries: self._remove(key); return True
        return False

    def clear(self) -> None:
        if self._lsh: self._lsh._init_planes()
        self._entries.clear()
        self.hits = self.misses = self.evictions = self.expirations = 0

    def get_stats(self) -> dict[str, Any]:
        return {"size": self.size, "max_entries": self.max_entries,
                "hits": self.hits, "misses": self.misses, "hit_rate": self.hit_rate,
                "evictions": self.evictions, "expirations": self.expirations,
                "strategy": self.strategy.name, "threshold": self.similarity_threshold}

# =============================================================================
# CachePolicy — per-model TTL, per-user quota, warming, invalidation hooks
# =============================================================================

@dataclass
class ModelCacheConfig:
    model_name: str; ttl_seconds: float = 3600.0; quota_per_user: int = 100
    warm_on_start: bool = False; warm_queries: list[str] = field(default_factory=list)

class CachePolicy:
    def __init__(self):
        self._configs: dict[str, ModelCacheConfig] = {}
        self._quotas: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self._hooks: list[Callable[[str], None]] = []

    def register_model(self, cfg: ModelCacheConfig) -> None: self._configs[cfg.model_name] = cfg
    def get_ttl(self, model: str) -> float:
        return self._configs[model].ttl_seconds if model in self._configs else 3600.0

    def check_quota(self, model: str, user: str) -> bool:
        cfg = self._configs.get(model)
        return True if cfg is None else self._quotas[model][user] < cfg.quota_per_user

    def record_usage(self, model: str, user: str) -> None:
        self._quotas[model][user] += 1

    def reset_quota(self, model: str, user: Optional[str] = None) -> None:
        if user: self._quotas[model][user] = 0
        elif model in self._quotas: self._quotas[model].clear()

    def add_invalidation_hook(self, hook: Callable[[str], None]) -> None:
        self._hooks.append(hook)

    def trigger_invalidation(self, key: str) -> None:
        for h in self._hooks:
            try: h(key)
            except Exception: pass

    def get_warm_queries(self, model: str) -> list[str]:
        return self._configs[model].warm_queries if model in self._configs else []

    def should_warm(self, model: str) -> bool:
        return self._configs[model].warm_on_start if model in self._configs else False

# =============================================================================
# TieredCache — L1 (0ms/dict), L2 (5ms/file), L3 (50ms/disk)
# =============================================================================

@dataclass
class _TierStats:
    hits: int = 0; misses: int = 0; promotions: int = 0; evictions: int = 0

class TieredCache:
    L1_MAX, L2_MAX, L3_MAX = 100, 1000, 10000

    def __init__(self, l2_path: str = "/tmp/sc_l2.json", l3_path: str = "/tmp/sc_l3.json",
                 embedding_engine: Optional[EmbeddingEngine] = None):
        self._l1: OrderedDict[str, CacheEntry] = OrderedDict()
        self._l2: dict[str, CacheEntry] = {}; self._l3: dict[str, CacheEntry] = {}
        self._l2_path, self._l3_path = l2_path, l3_path
        self._emb = embedding_engine or EmbeddingEngine()
        self._stats = {t: _TierStats() for t in CacheTier}
        self._l2 = self._load(self._l2_path); self._l3 = self._load(self._l3_path)

    def _load(self, path: str) -> dict[str, CacheEntry]:
        try:
            if os.path.exists(path):
                with open(path) as f:
                    return {k: CacheEntry(**v) for k, v in json.load(f).items()}
        except (json.JSONDecodeError, IOError): pass
        return {}

    def _save(self, path: str, data: dict[str, CacheEntry]) -> None:
        try:
            with open(path, "w") as f:
                json.dump({k: vars(v).copy() for k, v in data.items()}, f)
        except IOError: pass

    def _evict_l1(self) -> None:
        while len(self._l1) > self.L1_MAX:
            self._l1.popitem(last=False); self._stats[CacheTier.L1].evictions += 1

    def _evict_l2(self) -> None:
        while len(self._l2) > self.L2_MAX:
            oldest = min(self._l2, key=lambda k: self._l2[k].last_accessed)
            self._l3[oldest] = self._l2.pop(oldest); self._stats[CacheTier.L2].evictions += 1

    def _evict_l3(self) -> None:
        while len(self._l3) > self.L3_MAX:
            oldest = min(self._l3, key=lambda k: self._l3[k].last_accessed)
            del self._l3[oldest]; self._stats[CacheTier.L3].evictions += 1

    def get(self, query: str) -> Optional[CacheEntry]:
        if query in self._l1:
            e = self._l1[query]
            if e.is_expired(): del self._l1[query]; self._stats[CacheTier.L1].misses += 1; return None
            e.touch(); self._l1.move_to_end(query); self._stats[CacheTier.L1].hits += 1; return e
        self._stats[CacheTier.L1].misses += 1

        if query in self._l2:
            e = self._l2[query]
            if e.is_expired():
                del self._l2[query]; self._save(self._l2_path, self._l2)
                self._stats[CacheTier.L2].misses += 1; return None
            e.touch(); self._stats[CacheTier.L2].hits += 1
            self._stats[CacheTier.L2].promotions += 1
            self._l1[query] = e; self._l1.move_to_end(query); self._evict_l1(); return e
        self._stats[CacheTier.L2].misses += 1

        if query in self._l3:
            e = self._l3[query]
            if e.is_expired():
                del self._l3[query]; self._save(self._l3_path, self._l3)
                self._stats[CacheTier.L3].misses += 1; return None
            e.touch(); self._stats[CacheTier.L3].hits += 1
            self._stats[CacheTier.L3].promotions += 1
            self._l2[query] = e; self._evict_l2(); self._save(self._l2_path, self._l2); return e
        self._stats[CacheTier.L3].misses += 1
        return None

    def put(self, entry: CacheEntry) -> None:
        self._l1[entry.key] = entry; self._l1.move_to_end(entry.key); self._evict_l1()

    def warm_l2(self, entries: list[CacheEntry]) -> None:
        for e in entries: self._l2[e.key] = e
        self._evict_l2(); self._save(self._l2_path, self._l2)

    def warm_l3(self, entries: list[CacheEntry]) -> None:
        for e in entries: self._l3[e.key] = e
        self._evict_l3(); self._save(self._l3_path, self._l3)

    def invalidate(self, key: str) -> bool:
        found = False
        for tier in [self._l1, self._l2, self._l3]:
            if key in tier: del tier[key]; found = True
        if found: self._save(self._l2_path, self._l2); self._save(self._l3_path, self._l3)
        return found

    def get_stats(self) -> dict[str, Any]:
        st = self._stats
        return {"l1": {"size": len(self._l1), "max": self.L1_MAX,
                       "hits": st[CacheTier.L1].hits, "misses": st[CacheTier.L1].misses},
                "l2": {"size": len(self._l2), "max": self.L2_MAX,
                       "hits": st[CacheTier.L2].hits, "misses": st[CacheTier.L2].misses,
                       "promotions": st[CacheTier.L2].promotions},
                "l3": {"size": len(self._l3), "max": self.L3_MAX,
                       "hits": st[CacheTier.L3].hits, "misses": st[CacheTier.L3].misses,
                       "promotions": st[CacheTier.L3].promotions},
                "total_hits": sum(s.hits for s in st.values()),
                "total_misses": sum(s.misses for s in st.values()),
                "total_entries": len(self._l1) + len(self._l2) + len(self._l3)}

    def clear(self) -> None:
        self._l1.clear(); self._l2.clear(); self._l3.clear()
        self._stats = {t: _TierStats() for t in CacheTier}
        self._save(self._l2_path, self._l2); self._save(self._l3_path, self._l3)

# =============================================================================
# PrefetchStrategy — Markov chain next-request prediction
# =============================================================================

class PrefetchStrategy:
    def __init__(self, order: int = 2):
        self.order = order; self._history: deque[str] = deque(maxlen=1000)
        self._trans: dict[tuple[str, ...], dict[str, int]] = defaultdict(lambda: defaultdict(int))

    def record(self, query: str) -> None:
        if len(self._history) >= self.order:
            self._trans[tuple(self._history)[-self.order:]][query] += 1
        self._history.append(query)

    def predict_next(self, top_k: int = 3) -> list[tuple[str, float]]:
        if len(self._history) < self.order: return []
        counts = self._trans.get(tuple(self._history)[-self.order:], {})
        if not counts: return []
        total = sum(counts.values())
        return [(q, c / total) for q, c in sorted(counts.items(), key=lambda x: -x[1])[:top_k]]

    def predict_sequence(self, steps: int = 5) -> list[str]:
        result: list[str] = []
        cur = tuple(self._history)[-self.order:] if len(self._history) >= self.order else ()
        for _ in range(steps):
            if not cur or cur not in self._trans: break
            counts = self._trans[cur]
            if not counts: break
            best = max(counts, key=counts.get)
            result.append(best); cur = (*cur[1:], best)
        return result

    def get_transition_matrix(self) -> dict[str, Any]:
        return {"|".join(s): dict(t) for s, t in self._trans.items()}

    def clear(self) -> None: self._history.clear(); self._trans.clear()

# =============================================================================
# CacheCoherence — version tagging, stale detection, optimistic locking
# =============================================================================

class CacheCoherence:
    def __init__(self): self._versions: dict[str, int] = {}; self._locks: dict[str, int] = {}

    def get_version(self, key: str) -> int: return self._versions.get(key, 1)

    def increment_version(self, key: str) -> int:
        self._versions[key] = self.get_version(key) + 1; return self._versions[key]

    def is_stale(self, key: str, entry_version: str) -> bool:
        try: return int(entry_version) < self._versions.get(key, 1)
        except (ValueError, TypeError): return False

    def acquire_lock(self, key: str) -> int:
        ts = int(time.time() * 1000); cur = self._locks.get(key, 0)
        self._locks[key] = ts if ts != cur else ts + 1; return self._locks[key]

    def check_lock(self, key: str, lock_version: int) -> bool:
        return self._locks.get(key, 0) == lock_version

    def release_lock(self, key: str, lock_version: int) -> bool:
        if self.check_lock(key, lock_version): self._locks[key] = 0; return True
        return False

    def optimistic_write(self, key: str, read_version: int,
                         write_func: Callable[[], Any]) -> tuple[bool, Any]:
        if not self.check_lock(key, read_version): return False, None
        self.increment_version(key)
        result = write_func(); self.release_lock(key, read_version)
        return True, result

    def clear(self) -> None: self._versions.clear(); self._locks.clear()

# =============================================================================
# Dual-track theory: Bloom filter & optimal cache size
# =============================================================================

class BloomFilter:
    def __init__(self, expected_items: int = 10000, false_positive_rate: float = 0.01):
        self._n = expected_items; self._p = false_positive_rate
        self._m = max(1, int(-expected_items * math.log(false_positive_rate) / (math.log(2) ** 2)))
        self._k = max(1, int(self._m / expected_items * math.log(2))); self._bits = 0

    def _hash(self, item: str, seed: int) -> int:
        return int.from_bytes(hashlib.sha256(f"{seed}:{item}".encode()).digest()[:8], "big") % self._m

    def add(self, item: str) -> None:
        for i in range(self._k): self._bits |= (1 << self._hash(item, i))

    def contains(self, item: str) -> bool:
        return all((self._bits & (1 << self._hash(item, i))) != 0 for i in range(self._k))

    def estimated_false_positive_rate(self) -> float:
        return (1 - math.exp(-self._k * self._n / self._m)) ** self._k

    def clear(self) -> None: self._bits = 0
    @property
    def bit_size(self) -> int: return self._m
    @property
    def hash_count(self) -> int: return self._k


def optimal_cache_size(request_rate: float, average_response_time_ms: float,
                       cache_hit_ratio_target: float = 0.80,
                       memory_budget_bytes: int = 256 * 1024 * 1024,
                       bytes_per_entry: int = 4096) -> dict[str, Any]:
    """Derive optimal cache size via Little's Law: L = lambda * W."""
    max_by_mem = memory_budget_bytes // bytes_per_entry
    min_by_little = int(request_rate * average_response_time_ms / 1000.0)
    recommended = min(int(min_by_little / cache_hit_ratio_target), max_by_mem)
    return {"request_rate_rps": request_rate, "avg_response_time_ms": average_response_time_ms,
            "target_hit_ratio": cache_hit_ratio_target, "memory_budget_bytes": memory_budget_bytes,
            "bytes_per_entry": bytes_per_entry, "max_by_memory": max_by_mem,
            "min_by_littles_law": min_by_little, "recommended_entries": recommended,
            "actual_memory_mb": round((recommended * bytes_per_entry) / (1024 * 1024), 2)}


def bloom_false_positive_analysis(n: int, p: float = 0.01) -> dict[str, Any]:
    """Bloom filter false positive rate and optimal parameters."""
    m = max(1, int(-n * math.log(p) / (math.log(2) ** 2)))
    k = max(1, int(m / n * math.log(2)))
    return {"expected_items": n, "target_fp_rate": p, "bit_array_size": m,
            "hash_functions": k, "actual_fp_rate": round((1 - math.exp(-k * n / m)) ** k, 6),
            "memory_kb": round(m / (8 * 1024), 2)}
