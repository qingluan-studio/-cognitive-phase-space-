#!/usr/bin/env python3
"""向量存储模块
支持多种向量索引和混合检索策略。
"""

from __future__ import annotations

import logging
import os
import pickle
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

import numpy as np

logger = logging.getLogger(__name__)


class DistanceMetric(Enum):
    COSINE = "cosine"
    EUCLIDEAN = "euclidean"
    DOT_PRODUCT = "dot_product"
    MANHATTAN = "manhattan"


class IndexType(Enum):
    FLAT = "flat"
    HNSW = "hnsw"
    IVF = "ivf"
    LSH = "lsh"


@dataclass
class VectorRecord:
    id: str
    vector: np.ndarray
    text: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    score: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "text": self.text,
            "metadata": self.metadata,
            "score": self.score,
        }


@dataclass
class SearchResult:
    record: VectorRecord
    distance: float


class DistanceFunctions:
    @staticmethod
    def cosine(a: np.ndarray, b: np.ndarray) -> float:
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a < 1e-8 or norm_b < 1e-8:
            return 1.0
        return float(1.0 - np.dot(a, b) / (norm_a * norm_b))

    @staticmethod
    def euclidean(a: np.ndarray, b: np.ndarray) -> float:
        return float(np.linalg.norm(a - b))

    @staticmethod
    def dot_product(a: np.ndarray, b: np.ndarray) -> float:
        return float(-np.dot(a, b))

    @staticmethod
    def manhattan(a: np.ndarray, b: np.ndarray) -> float:
        return float(np.sum(np.abs(a - b)))


class FlatIndex:
    def __init__(self, dim: int, metric: DistanceMetric = DistanceMetric.COSINE):
        self.dim = dim
        self.metric = metric
        self._vectors: dict[str, np.ndarray] = {}
        self._records: dict[str, VectorRecord] = {}
        self._lock = threading.RLock()
        self._dist_fn = self._get_distance_fn()

    def _get_distance_fn(self):
        mapping = {
            DistanceMetric.COSINE: DistanceFunctions.cosine,
            DistanceMetric.EUCLIDEAN: DistanceFunctions.euclidean,
            DistanceMetric.DOT_PRODUCT: DistanceFunctions.dot_product,
            DistanceMetric.MANHATTAN: DistanceFunctions.manhattan,
        }
        return mapping[self.metric]

    def add(self, records: list[VectorRecord]) -> int:
        with self._lock:
            for r in records:
                if r.vector.shape[0] != self.dim:
                    raise ValueError(
                        f"向量维度不匹配: 期望 {self.dim}, 实际 {r.vector.shape[0]}"
                    )
                norm = np.linalg.norm(r.vector)
                if norm > 1e-8 and self.metric == DistanceMetric.COSINE:
                    r.vector = r.vector / norm
                r.vector = r.vector.astype(np.float32)
                self._vectors[r.id] = r.vector.astype(np.float32)
                self._records[r.id] = r
            return len(records)

    def search(self, query: np.ndarray, k: int = 10,
               filter_fn: Callable | None = None) -> list[SearchResult]:
        if query.shape[0] != self.dim:
            raise ValueError(f"查询向量维度不匹配: {self.dim} != {query.shape[0]}")

        query = query.astype(np.float32)
        if self.metric == DistanceMetric.COSINE:
            q_norm = np.linalg.norm(query)
            if q_norm > 1e-8:
                query = query / q_norm

        with self._lock:
            results = []
            for rid, vec in self._vectors.items():
                if filter_fn and not filter_fn(self._records[rid]):
                    continue
                dist = self._dist_fn(query, vec)
                results.append((dist, rid))
            results.sort(key=lambda x: x[0])
            top_k = results[:k]
            return [
                SearchResult(
                    record=self._records[rid],
                    distance=dist,
                )
                for dist, rid in top_k
            ]

    def remove(self, ids: list[str]) -> int:
        count = 0
        with self._lock:
            for rid in ids:
                if rid in self._vectors:
                    del self._vectors[rid]
                    del self._records[rid]
                    count += 1
        return count

    def __len__(self) -> int:
        return len(self._vectors)

    def count(self) -> int:
        return len(self._vectors)


class HNSWIndex:
    def __init__(self, dim: int, M: int = 16, ef_construction: int = 200,
                 ef_search: int = 50, metric: DistanceMetric = DistanceMetric.COSINE):
        self.dim = dim
        self.M = M
        self.ef_construction = ef_construction
        self.ef_search = ef_search
        self.metric = metric
        self._dist_fn = self._get_distance_fn()

        self._vectors: dict[str, np.ndarray] = {}
        self._records: dict[str, VectorRecord] = {}
        self._layers: dict[str, list[list[str]]] = {}
        self._graphs: dict[str, dict[int, dict[str, list[str]]]] = {}
        self._entry_point: str | None = None
        self._max_level: dict[str, int] = {}
        self._lock = threading.RLock()
        self._level_mult = 1.0 / np.log(self.M)

    def _get_distance_fn(self):
        mapping = {
            DistanceMetric.COSINE: DistanceFunctions.cosine,
            DistanceMetric.EUCLIDEAN: DistanceFunctions.euclidean,
            DistanceMetric.DOT_PRODUCT: DistanceFunctions.dot_product,
            DistanceMetric.MANHATTAN: DistanceFunctions.manhattan,
        }
        return mapping[self.metric]

    def _random_level(self) -> int:
        r = np.random.random()
        return int(-np.log(r) * self._level_mult)

    def add(self, records: list[VectorRecord]) -> int:
        with self._lock:
            for r in records:
                if r.vector.shape[0] != self.dim:
                    raise ValueError(f"向量维度不匹配: 期望 {self.dim}, 实际 {r.vector.shape[0]}")
                r.vector = r.vector.astype(np.float32)
                self._vectors[r.id] = r.vector
                self._records[r.id] = r

                level = self._random_level()
                self._max_level[r.id] = level

                if self._entry_point is None:
                    self._entry_point = r.id
                    self._max_level[r.id] = level
                    for level_ in range(level + 1):
                        if level_ not in self._graphs:
                            self._graphs[level_] = {}
                else:
                    curr = self._entry_point

                    for level_ in range(max(self._max_level.get(self._entry_point, 0)), level, -1):
                        curr = self._greedy_search_layer(r.vector, curr, 1, level_)[0][0]

                    for level_ in range(level, -1, -1):
                        candidates = self._greedy_search_layer(
                            r.vector, curr, self.ef_construction, level_
                        )
                        neighbors = self._select_neighbors(candidates, self.M)
                        if level_ not in self._graphs:
                            self._graphs[level_] = {}
                        self._graphs[level_][r.id] = [n[0] for n in neighbors]

                        for neighbor_id, _ in neighbors:
                            if neighbor_id not in self._graphs[level_]:
                                self._graphs[level_][neighbor_id] = []
                            if r.id not in self._graphs[level_][neighbor_id]:
                                self._graphs[level_][neighbor_id].append(r.id)
                                neigh_neighbors = self._graphs[level_][neighbor_id]
                                if len(neigh_neighbors) > self.M * 2:
                                    neigh_cands = [(nid, self._dist_fn(
                                        self._vectors[neighbor_id], self._vectors[nid]
                                    )) for nid in neigh_neighbors]
                                    self._graphs[level_][neighbor_id] = [
                                        n[0] for n in self._select_neighbors(neigh_cands, self.M)
                                    ]

                        if level > max(self._max_level.get(self._entry_point, 0)):
                            self._entry_point = r.id

            return len(records)

    def _greedy_search_layer(self, query: np.ndarray, entry: str,
                              ef: int, layer: int) -> list[tuple[str, float]]:
        visited = {entry}
        candidates = [(self._dist_fn(query, self._vectors[entry]), entry)]
        results = [(candidates[0][0], entry)]

        while candidates:
            dist, node = candidates.pop(0)
            worst_dist = results[-1][0] if results else float("inf")

            if dist > worst_dist and len(results) >= ef:
                break

            neighbors = self._graphs.get(layer, {}).get(node, [])
            for neighbor in neighbors:
                if neighbor in visited:
                    continue
                visited.add(neighbor)
                ndist = self._dist_fn(query, self._vectors[neighbor])
                if ndist < worst_dist or len(results) < ef:
                    candidates.append((ndist, neighbor))
                    results.append((ndist, neighbor))
                    results.sort(key=lambda x: x[0])
                    if len(results) > ef:
                        results = results[:ef]

        return results

    def _select_neighbors(self, candidates: list[tuple[str, float]], M: int) -> list[tuple[str, float]]:
        return sorted(candidates, key=lambda x: x[1])[:M]

    def search(self, query: np.ndarray, k: int = 10,
               filter_fn: Callable | None = None) -> list[SearchResult]:
        if query.shape[0] != self.dim:
            raise ValueError(f"查询向量维度不匹配: {self.dim} != {query.shape[0]}")

        query = query.astype(np.float32)
        if self._entry_point is None:
            return []

        with self._lock:
            curr = self._entry_point
            max_l = max(self._max_level.values())

            for level_ in range(max_l, 0, -1):
                results = self._greedy_search_layer(query, curr, 1, level_)
                curr = results[0][0] if results else curr

            final_results = self._greedy_search_layer(query, curr, self.ef_search, 0)

            search_results = []
            for rid, dist in final_results:
                if filter_fn and not filter_fn(self._records[rid]):
                    continue
                search_results.append(SearchResult(
                    record=self._records[rid],
                    distance=dist,
                ))
                if len(search_results) >= k:
                    break

            return search_results

    def remove(self, ids: list[str]) -> int:
        count = 0
        with self._lock:
            for rid in ids:
                if rid not in self._vectors:
                    continue
                del self._vectors[rid]
                del self._records[rid]
                for level_ in self._graphs:
                    if rid in self._graphs[level_]:
                        del self._graphs[level_][rid]
                if self._entry_point == rid:
                    remaining = list(self._vectors.keys())
                    self._entry_point = remaining[0] if remaining else None
                count += 1
        return count

    def __len__(self) -> int:
        return len(self._vectors)

    def count(self) -> int:
        return len(self._vectors)


class MemoryVectorStore:
    def __init__(self, dim: int = 768, index_type: IndexType = IndexType.FLAT,
                 metric: DistanceMetric = DistanceMetric.COSINE,
                 persist_path: str = ""):
        self.dim = dim
        self.index_type = index_type
        self.metric = metric
        self.persist_path = persist_path

        self._index = self._create_index()
        self._text_index: dict[str, list[str]] = defaultdict(list)
        self._idf: dict[str, float] = {}
        self._avg_doc_len: float = 0.0
        self._doc_count: int = 0

    def _create_index(self):
        if self.index_type == IndexType.HNSW:
            return HNSWIndex(self.dim, metric=self.metric)
        return FlatIndex(self.dim, metric=self.metric)

    def add(self, vectors: list[np.ndarray], texts: list[str] = None,
            metadatas: list[dict[str, Any]] = None,
            ids: list[str] = None) -> list[str]:
        n = len(vectors)
        if texts is None:
            texts = [""] * n
        if metadatas is None:
            metadatas = [{}] * n
        if ids is None:
            ids = [f"vec_{i}_{int(time.time() * 1e6)}" for i in range(n)]

        records = []
        for i in range(n):
            records.append(VectorRecord(
                id=ids[i],
                vector=vectors[i].astype(np.float32),
                text=texts[i] if i < len(texts) else "",
                metadata=metadatas[i] if i < len(metadatas) else {},
            ))

        self._index.add(records)

        for i in range(n):
            if texts[i]:
                words = texts[i].lower().split()
                for word in set(words):
                    self._text_index[word].append(ids[i])
                self._doc_count += 1

        self._compute_idf()
        return ids

    def search(self, query: np.ndarray, k: int = 10,
               metadata_filter: dict[str, Any] = None,
               text_filter: str = "") -> list[SearchResult]:
        def filter_fn(record: VectorRecord) -> bool:
            if metadata_filter:
                for key, val in metadata_filter.items():
                    if record.metadata.get(key) != val:
                        return False
            if text_filter and text_filter.lower() not in record.text.lower():
                return False
            return True

        return self._index.search(query, k, filter_fn=filter_fn)

    def hybrid_search(self, query_vector: np.ndarray, query_text: str,
                       k: int = 10, alpha: float = 0.5,
                       metadata_filter: dict[str, Any] = None) -> list[SearchResult]:
        sparse_results = self._bm25_search(query_text, k * 2)
        dense_results = self._index.search(query_vector, k * 2,
                                           filter_fn=lambda r: True)

        sparse_scores: dict[str, float] = {}
        for i, sr in enumerate(sparse_results):
            score = 1.0 / (1.0 + i)
            sparse_scores[sr.record.id] = score

        dense_scores: dict[str, float] = {}
        for sr in dense_results:
            dense_scores[sr.record.id] = 1.0 - sr.distance

        all_ids = set(sparse_scores.keys()) | set(dense_scores.keys())
        combined = []
        for rid in all_ids:
            sparse = sparse_scores.get(rid, 0.0)
            dense = dense_scores.get(rid, 0.0)
            score = alpha * sparse + (1.0 - alpha) * dense
            record = self._index._records.get(rid)
            if record:
                combined.append((score, record))

        combined.sort(key=lambda x: x[0], reverse=True)
        top_k = combined[:k]

        results = []
        for score, record in top_k:
            results.append(SearchResult(record=record, distance=1.0 - score))
        return results

    def _bm25_search(self, query_text: str, k: int = 10) -> list[SearchResult]:
        if not self._text_index:
            return []

        query_terms = [w.lower() for w in query_text.split() if len(w) > 1]
        if not query_terms:
            return []

        k1 = 1.5
        b = 0.75

        scored_docs: dict[str, float] = {}
        for term in query_terms:
            if term not in self._text_index:
                continue
            doc_ids = self._text_index[term]
            idf = self._idf.get(term, 0.0)
            qf = query_terms.count(term)
            term_weight = idf * (k1 + 1) * qf / (k1 + qf)

            for doc_id in doc_ids:
                doc = self._get_vector(doc_id)
                if doc is None:
                    continue
                doc_text = self._index._records.get(doc_id)
                if doc_text is None:
                    continue
                doc_words = doc_text.text.lower().split()
                doc_len = len(doc_words)
                tf = doc_words.count(term) / max(1, doc_len)
                doc_score = term_weight * tf * (k1 + 1) / (
                    tf + k1 * (1 - b + b * doc_len / max(1.0, self._avg_doc_len))
                )
                scored_docs[doc_id] = scored_docs.get(doc_id, 0.0) + doc_score

        sorted_docs = sorted(scored_docs.items(), key=lambda x: x[1], reverse=True)
        results = []
        for doc_id, score in sorted_docs[:k]:
            record = self._index._records.get(doc_id)
            if record:
                results.append(SearchResult(record=record, distance=1.0 - score))
        return results

    def _compute_idf(self):
        if self._doc_count == 0:
            return
        for term, docs in self._text_index.items():
            df = len(set(docs))
            self._idf[term] = np.log(1 + (self._doc_count - df + 0.5) / (df + 0.5))

        total_len = 0
        doc_count = 0
        for rid, rec in self._index._records.items():
            if rec.text:
                total_len += len(rec.text.split())
                doc_count += 1
        self._avg_doc_len = total_len / max(1, doc_count)

    def _get_vector(self, rec_id: str) -> np.ndarray:
        return self._index._vectors.get(rec_id)

    def remove(self, ids: list[str]) -> int:
        return self._index.remove(ids)

    def get(self, rec_id: str) -> dict[str, Any] | None:
        record = self._index._records.get(rec_id)
        if record:
            return record.to_dict()
        return None

    def count(self) -> int:
        return len(self._index)

    def stats(self) -> dict[str, Any]:
        return {
            "total_vectors": len(self._index),
            "index_type": self.index_type.value,
            "metric": self.metric.value,
            "vocab_size": len(self._text_index),
        }

    def _save(self) -> None:
        if not self.persist_path:
            return
        os.makedirs(self.persist_path, exist_ok=True)
        meta = {
            "dim": self.dim,
            "index_type": self.index_type.value,
            "metric": self.metric.value,
        }
        with open(os.path.join(self.persist_path, "meta.npy"), "wb") as f:
            pickle.dump(meta, f)

        records_data = {
            rid: {
                "id": rec.id,
                "text": rec.text,
                "metadata": rec.metadata,
                "vector": rec.vector,
            }
            for rid, rec in self._index._records.items()
        }
        with open(os.path.join(self.persist_path, "records.npy"), "wb") as f:
            pickle.dump(records_data, f)

    def _load(self) -> None:
        if not self.persist_path:
            return
        meta_path = os.path.join(self.persist_path, "meta.npy")
        if not os.path.exists(meta_path):
            return
        with open(meta_path, "rb") as f:
            meta = pickle.load(f)
        self.dim = meta["dim"]
        self.metric = DistanceMetric(meta["metric"]) if meta.get("metric") in [m.value for m in DistanceMetric] else DistanceMetric.COSINE
        self._index = self._create_index()

        rec_path = os.path.join(self.persist_path, "records.npy")
        if os.path.exists(rec_path):
            with open(rec_path, "rb") as f:
                records_data = pickle.load(f)
            records = []
            for rid, data in records_data.items():
                records.append(VectorRecord(
                    id=data["id"],
                    vector=data["vector"],
                    text=data.get("text", ""),
                    metadata=data.get("metadata", {}),
                ))
            self._index.add(records)


class VectorStore(MemoryVectorStore):
    """主向量存储接口 (兼容原 MemoryVectorStore API)"""

    def __init__(self, dim: int = 768, index_type: IndexType = IndexType.FLAT,
                 metric: DistanceMetric = DistanceMetric.COSINE,
                 persist_path: str = ""):
        super().__init__(dim=dim, index_type=index_type,
                         metric=metric, persist_path=persist_path)

    def add(self, vectors: list[np.ndarray], texts: list[str] = None,
            metadatas: list[dict[str, Any]] = None,
            ids: list[str] = None) -> list[str]:
        return super().add(vectors=vectors, texts=texts,
                           metadatas=metadatas, ids=ids)

    def search(self, query: np.ndarray, k: int = 10,
               metadata_filter: dict[str, Any] = None,
               text_filter: str = "") -> list[SearchResult]:
        return super().search(query=query, k=k,
                              metadata_filter=metadata_filter,
                              text_filter=text_filter)
