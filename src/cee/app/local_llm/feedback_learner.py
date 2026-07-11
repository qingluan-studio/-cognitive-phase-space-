"""
认知涌现引擎 — 反馈即时学习
=============================
用户点赞/点踩后立即调整知识库权重和参数

机制:
1. 点赞 → 对应知识条目权重+20%，提升检索优先级
2. 点踩 → 降低相似回复被再次使用的概率
3. 反馈标记 → 不将低分回复存入知识库
4. 反馈统计 → 跟踪用户偏好趋势
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .knowledge_store import STORAGE_DIR

FEEDBACK_FILE = STORAGE_DIR / "feedback_data.json"


@dataclass
class FeedbackEntry:
    query: str
    response_snippet: str
    rating: str  # "like" | "dislike"
    source: str
    cee_tier: str
    cee_scores: dict
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "query": self.query, "response_snippet": self.response_snippet,
            "rating": self.rating, "source": self.source, "cee_tier": self.cee_tier,
            "cee_scores": self.cee_scores, "timestamp": self.timestamp,
        }


class FeedbackLearner:
    """
    反馈即时学习

    用法:
        fl = FeedbackLearner()
        fl.record("认知涌现是什么", reply_content, "like", "fallback_rules", "B", scores)

        weight = fl.get_query_weight("认知涌现是什么")
        # -> 1.2 (被点赞过，提升权重)
    """

    def __init__(self):
        self._feedback: list[FeedbackEntry] = []
        self._liked_queries: dict[str, int] = {}
        self._disliked_queries: dict[str, int] = {}
        self._liked_sources: dict[str, int] = {}
        self._load()

    def record(self, query: str, response: str, rating: str,
               source: str, cee_tier: str, cee_scores: dict):
        entry = FeedbackEntry(
            query=query,
            response_snippet=response[:200],
            rating=rating,
            source=source,
            cee_tier=cee_tier,
            cee_scores=cee_scores,
        )
        self._feedback.append(entry)

        qk = self._query_key(query)
        if rating == "like":
            self._liked_queries[qk] = self._liked_queries.get(qk, 0) + 1
            self._liked_sources[source] = self._liked_sources.get(source, 0) + 1
            if qk in self._disliked_queries:
                del self._disliked_queries[qk]
        else:
            self._disliked_queries[qk] = self._disliked_queries.get(qk, 0) + 1
            if qk in self._liked_queries:
                del self._liked_queries[qk]

        if len(self._feedback) > 200:
            self._feedback = self._feedback[-200:]

        self._save()

    def get_query_weight(self, query: str) -> float:
        """
        获取查询的反馈权重 (1.0 = 中性, >1.0 = 受偏爱, <1.0 = 需弱化)
        """
        qk = self._query_key(query)
        likes = self._liked_queries.get(qk, 0)
        dislikes = self._disliked_queries.get(qk, 0)

        if likes > 0:
            return min(2.0, 1.0 + likes * 0.2)
        if dislikes > 0:
            return max(0.3, 1.0 - dislikes * 0.15)
        return 1.0

    def get_source_bias(self) -> dict[str, float]:
        """返回各来源的反馈偏好"""
        total = sum(self._liked_sources.values()) or 1
        return {k: round(v / total, 2) for k, v in self._liked_sources.items()}

    def should_learn(self, query: str, composite: float) -> bool:
        """
        判断是否应将本次回复存入知识库。
        被踩过的查询即使分数高也不学。
        """
        qk = self._query_key(query)
        if self._disliked_queries.get(qk, 0) >= 2:
            return False
        return composite >= 0.65

    def get_preferred_patterns(self) -> list[str]:
        """获取用户最喜欢的回复模式"""
        liked_snippets = [e.response_snippet for e in self._feedback[-20:]
                          if e.rating == "like"]
        return liked_snippets[:3]

    def get_avoid_patterns(self) -> list[str]:
        """获取用户排斥的回复模式"""
        disliked_queries = [e.query for e in self._feedback[-20:]
                            if e.rating == "dislike"]
        return disliked_queries[:3]

    def _query_key(self, query: str) -> str:
        return "".join(c for c in query.lower() if c.isalnum())[:30]

    def _load(self):
        if FEEDBACK_FILE.exists():
            try:
                with open(FEEDBACK_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._liked_queries = data.get("liked_queries", {})
                self._disliked_queries = data.get("disliked_queries", {})
                self._liked_sources = data.get("liked_sources", {})
                self._feedback = [FeedbackEntry(**e) for e in data.get("entries", [])]
            except Exception:
                pass

    def _save(self):
        try:
            data = {
                "liked_queries": dict(list(self._liked_queries.items())[-100:]),
                "disliked_queries": dict(list(self._disliked_queries.items())[-100:]),
                "liked_sources": dict(self._liked_sources),
                "entries": [e.to_dict() for e in self._feedback[-50:]],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(FEEDBACK_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def stats(self) -> dict:
        return {
            "total_feedback": len(self._feedback),
            "likes": sum(1 for e in self._feedback if e.rating == "like"),
            "dislikes": sum(1 for e in self._feedback if e.rating == "dislike"),
            "liked_queries": len(self._liked_queries),
            "source_bias": self.get_source_bias(),
        }
