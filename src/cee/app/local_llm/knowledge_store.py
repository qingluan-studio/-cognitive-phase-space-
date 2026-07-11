"""
认知涌现引擎 — 自学习知识库
=============================
TF-IDF 向量化 + 余弦检索 + 会话记忆持久化

设计目标: 零外部API依赖，仅靠 scikit-learn + numpy
每次对话自动学习，高分回复进入长期记忆
"""

from __future__ import annotations

import json
import hashlib
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

STORAGE_DIR = Path(__file__).parent.parent.parent.parent.parent / ".cee_storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

MEMORY_FILE = STORAGE_DIR / "conversation_memory.json"
TRAINING_DATA_FILE = STORAGE_DIR / "training_data.json"


@dataclass
class ConversationPair:
    """一对高质量的(用户提问, AI回复) 用于自学习"""
    id: str
    user_query: str
    ai_response: str
    itc: float = 0.0
    scs: float = 0.0
    iec: float = 0.0
    pfft: float = 0.0
    composite: float = 0.0
    tier: str = "B"
    tags: list[str] = field(default_factory=list)
    learned_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    usage_count: int = 0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_query": self.user_query,
            "ai_response": self.ai_response,
            "itc": self.itc,
            "scs": self.scs,
            "iec": self.iec,
            "pfft": self.pfft,
            "composite": self.composite,
            "tier": self.tier,
            "tags": self.tags,
            "learned_at": self.learned_at,
            "usage_count": self.usage_count,
        }

    @classmethod
    def from_dict(cls, d: dict) -> ConversationPair:
        return cls(**{k: d.get(k) for k in [
            "id", "user_query", "ai_response", "itc", "scs", "iec", "pfft",
            "composite", "tier", "tags", "learned_at", "usage_count"
        ] if k in d})


class SelfLearningKnowledgeStore:
    """
    自学习知识库: TF-IDF 向量检索 + 对话记忆持久化

    工作流:
    1. 用户提问 → TF-IDF 向量化
    2. 在已学对话中检索 top-k 最佳匹配
    3. 用最佳匹配的 AI 回复作为模板生成新回复
    4. CEE 引擎评估新回复质量
    5. 高质量(composite > 阈值)的新对话自动存入长期记忆
    """

    def __init__(self, quality_threshold: float = 0.70):
        self._pairs: list[ConversationPair] = []
        self._vectorizer: Optional[TfidfVectorizer] = None
        self._query_vectors: Optional[np.ndarray] = None
        self._quality_threshold = quality_threshold
        self._dirty = False
        self._load()

    def _load(self) -> None:
        if MEMORY_FILE.exists():
            try:
                with open(MEMORY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._pairs = [ConversationPair.from_dict(d) for d in data.get("pairs", [])]
                if self._pairs:
                    self._rebuild_index()
            except Exception:
                self._pairs = []

    def _save(self) -> None:
        if not self._dirty:
            return
        try:
            data = {"pairs": [p.to_dict() for p in self._pairs], "count": len(self._pairs),
                     "updated_at": datetime.now(timezone.utc).isoformat()}
            with open(MEMORY_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            self._dirty = False
        except Exception:
            pass

    def _rebuild_index(self) -> None:
        if not self._pairs:
            self._query_vectors = None
            return
        queries = [p.user_query for p in self._pairs]
        self._vectorizer = TfidfVectorizer(max_features=2000, ngram_range=(1, 2),
                                           analyzer="char_wb", lowercase=True)
        self._query_vectors = self._vectorizer.fit_transform(queries)
        self._query_vectors = self._query_vectors.toarray()

    def learn(self, user_query: str, ai_response: str,
              itc: float, scs: float, iec: float, pfft: float) -> bool:
        """学习一对新对话。只有CEE质量达标才存入"""
        composite = (itc + scs + iec + pfft) / 4
        tier = ("S" if composite >= 0.90 else "A" if composite >= 0.80
                else "B" if composite >= 0.70 else "C" if composite >= 0.50 else "D")

        if composite < self._quality_threshold:
            return False

        rid = hashlib.md5(user_query.encode()[:80]).hexdigest()[:12]
        for p in self._pairs:
            if p.id == rid:
                p.ai_response = ai_response
                p.composite = composite
                p.itc, p.scs, p.iec, p.pfft = itc, scs, iec, pfft
                p.tier = tier
                p.learned_at = datetime.now(timezone.utc).isoformat()
                self._dirty = True
                self._save()
                return True

        pair = ConversationPair(
            id=rid,
            user_query=user_query,
            ai_response=ai_response,
            itc=itc, scs=scs, iec=iec, pfft=pfft,
            composite=composite, tier=tier,
        )
        self._pairs.append(pair)
        self._dirty = True
        self._rebuild_index()
        self._save()
        return True

    def retrieve(self, query: str, top_k: int = 3,
                 min_similarity: float = 0.10) -> list[ConversationPair]:
        """检索与用户提问最相似的历史高质量对话"""
        if not self._pairs or self._vectorizer is None or self._query_vectors is None:
            return []

        try:
            qv = self._vectorizer.transform([query]).toarray()
            sims = cosine_similarity(qv, self._query_vectors)[0]
            sorted_idx = np.argsort(sims)[::-1]

            results = []
            for idx in sorted_idx[:top_k * 2]:
                if sims[idx] < min_similarity:
                    break
                pair = self._pairs[idx]
                pair.usage_count += 1
                results.append(pair)
                if len(results) >= top_k:
                    break
            return results
        except Exception:
            return []

    def search_by_keyword(self, query: str, top_k: int = 5) -> list[ConversationPair]:
        """关键字搜索，最简单的回退方式"""
        ql = query.lower()
        scored: list[tuple[float, ConversationPair]] = []
        for p in self._pairs:
            score = 0.0
            for w in ql.split():
                if w in p.user_query.lower():
                    score += 2.0
                if w in p.ai_response.lower():
                    score += 1.0
            if score > 0:
                scored.append((score, p))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [p for _, p in scored[:top_k]]

    def stats(self) -> dict:
        tiers = {"S": 0, "A": 0, "B": 0, "C": 0, "D": 0}
        for p in self._pairs:
            tiers[p.tier] = tiers.get(p.tier, 0) + 1
        return {
            "total_pairs": len(self._pairs),
            "by_tier": tiers,
            "avg_composite": round(np.mean([p.composite for p in self._pairs]), 3) if self._pairs else 0,
            "top_used": sorted([(p.user_query[:40], p.usage_count) for p in self._pairs],
                               key=lambda x: x[1], reverse=True)[:5],
        }

    def prune(self, max_pairs: int = 5000) -> int:
        """裁剪低分老旧记忆，防止无限膨胀"""
        if len(self._pairs) <= max_pairs:
            return 0
        self._pairs.sort(key=lambda p: (p.composite, p.usage_count), reverse=True)
        removed = len(self._pairs) - max_pairs
        self._pairs = self._pairs[:max_pairs]
        self._rebuild_index()
        self._dirty = True
        self._save()
        return removed

    def export_training_data(self) -> list[dict]:
        """导出高质量训练数据 (composite > 0.7)"""
        return [p.to_dict() for p in self._pairs if p.composite >= 0.70]
