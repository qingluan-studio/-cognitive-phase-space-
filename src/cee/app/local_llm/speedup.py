"""
认知涌现引擎 — 推理加速器
=========================
L1 哈希缓存 + L2 语义缓存 + 预计算索引 + 响应分块

策略:
1. L1: 精确哈希缓存 — 相同问题秒回
2. L2: 语义相似缓存 — 相似度>0.9直接复用
3. 预计算: 启动时预热 TF-IDF 索引
4. 分块流式: 长回复拆块输出，首字延迟 <50ms
"""

from __future__ import annotations

import hashlib
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Optional
import numpy as np


@dataclass
class CachedResponse:
    content: str
    cee_scores: dict
    cee_tier: str
    source: str
    intent: str
    hit_count: int = 0
    created_at: float = 0.0

    def __post_init__(self):
        if self.created_at == 0.0:
            self.created_at = time.time()


class InferenceSpeedup:
    """
    三层加速引擎

    用法:
        acc = InferenceSpeedup()
        cached = acc.l1_lookup("什么是认知涌现")
        if cached:
            return cached
        # ... 正常推理 ...
        acc.l1_store("什么是认知涌现", result)
    """

    def __init__(self, l1_size: int = 512, l2_size: int = 128):
        self._l1_cache: OrderedDict[str, CachedResponse] = OrderedDict()
        self._l1_max = l1_size

        self._l2_keys: list[str] = []
        self._l2_vectors: Optional[np.ndarray] = None
        self._l2_responses: list[CachedResponse] = []
        self._l2_max = l2_size

        self._stats = {"l1_hits": 0, "l2_hits": 0, "misses": 0}

    # ── L1: 精确哈希 ────────────────────────────────────────────

    def _hash(self, text: str) -> str:
        return hashlib.sha256(text.strip().lower().encode()).hexdigest()[:16]

    def l1_lookup(self, query: str) -> Optional[CachedResponse]:
        key = self._hash(query)
        cached = self._l1_cache.get(key)
        if cached:
            cached.hit_count += 1
            self._stats["l1_hits"] += 1
            self._l1_cache.move_to_end(key)
            return cached
        return None

    def l1_store(self, query: str, content: str, cee_scores: dict,
                 cee_tier: str, source: str, intent: str):
        key = self._hash(query)
        cached = CachedResponse(
            content=content, cee_scores=cee_scores,
            cee_tier=cee_tier, source=source, intent=intent,
        )
        if key in self._l1_cache:
            cached.hit_count = self._l1_cache[key].hit_count
        self._l1_cache[key] = cached
        self._l1_cache.move_to_end(key)
        if len(self._l1_cache) > self._l1_max:
            self._l1_cache.popitem(last=False)

    # ── L2: 语义相似缓存 ────────────────────────────────────────

    def l2_lookup(self, query: str, vectorizer, threshold: float = 0.90) -> Optional[CachedResponse]:
        if not self._l2_vectors or vectorizer is None:
            return None
        try:
            qv = vectorizer.transform([query]).toarray()
            from sklearn.metrics.pairwise import cosine_similarity
            sims = cosine_similarity(qv, self._l2_vectors)[0]
            best_idx = int(np.argmax(sims))
            if sims[best_idx] >= threshold:
                self._stats["l2_hits"] += 1
                self._l2_responses[best_idx].hit_count += 1
                return self._l2_responses[best_idx]
        except Exception:
            pass
        return None

    def l2_store(self, query: str, resp: CachedResponse, vectorizer):
        if vectorizer is None:
            return
        try:
            self._l2_keys.append(query)
            self._l2_responses.append(resp)
            all_queries = self._l2_keys + [q for q, _ in self._l1_cache.items()]
            all_queries = all_queries[-1000:]
            self._l2_vectors = vectorizer.transform(all_queries).toarray()
            if len(self._l2_responses) > self._l2_max:
                self._l2_responses = self._l2_responses[-self._l2_max:]
                self._l2_keys = self._l2_keys[-self._l2_max:]
        except Exception:
            pass

    # ── 快速路径：合并查找 ──────────────────────────────────────

    def lookup(self, query: str, vectorizer=None) -> Optional[CachedResponse]:
        """L1 + L2 两次查找"""
        self._stats["misses"] += 1
        hit = self.l1_lookup(query)
        if hit:
            self._stats["misses"] -= 1
            return hit
        if vectorizer:
            hit = self.l2_lookup(query, vectorizer)
            if hit:
                self._stats["misses"] -= 1
                return hit
        return None

    def store(self, query: str, content: str, cee_scores: dict,
              cee_tier: str, source: str, intent: str, vectorizer=None):
        self.l1_store(query, content, cee_scores, cee_tier, source, intent)
        resp = CachedResponse(
            content=content, cee_scores=cee_scores,
            cee_tier=cee_tier, source=source, intent=intent,
        )
        if vectorizer:
            self.l2_store(query, resp, vectorizer)

    # ── 响应分块 ────────────────────────────────────────────────

    @staticmethod
    def chunk_response(text: str, chunk_size: int = 120) -> list[str]:
        """将长回复切分为流式块，降低首字节延迟"""
        if len(text) <= chunk_size:
            return [text]
        chunks = []
        for i in range(0, len(text), chunk_size):
            chunk = text[i:i + chunk_size]
            if chunk.strip():
                chunks.append(chunk)
        return chunks

    # ── 统计 ────────────────────────────────────────────────────

    def stats(self) -> dict:
        total = max(1, self._stats["l1_hits"] + self._stats["l2_hits"] + self._stats["misses"])
        return {
            "l1_size": len(self._l1_cache),
            "l2_size": len(self._l2_responses),
            "l1_hits": self._stats["l1_hits"],
            "l2_hits": self._stats["l2_hits"],
            "misses": self._stats["misses"],
            "hit_rate": round((self._stats["l1_hits"] + self._stats["l2_hits"]) / total, 3),
        }

    def clear(self):
        self._l1_cache.clear()
        self._l2_keys.clear()
        self._l2_vectors = None
        self._l2_responses.clear()
        self._stats = {"l1_hits": 0, "l2_hits": 0, "misses": 0}
