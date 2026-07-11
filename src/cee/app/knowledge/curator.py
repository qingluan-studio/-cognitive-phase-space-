from __future__ import annotations

import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

from .base import KnowledgeBase, KnowledgeItem, CATEGORIES, _jaccard


@dataclass
class CuratorReport:
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_items: int = 0
    avg_quality: float = 0.0
    aging_items: list[str] = field(default_factory=list)
    update_suggestions: list[str] = field(default_factory=list)
    discovered_associations: list[dict] = field(default_factory=list)
    gap_analysis: dict[str, str] = field(default_factory=dict)
    clusters: list[dict] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "generated_at": self.generated_at,
            "total_items": self.total_items,
            "avg_quality": round(self.avg_quality, 3),
            "aging_items": self.aging_items,
            "update_suggestions": self.update_suggestions,
            "discovered_associations": self.discovered_associations,
            "gap_analysis": self.gap_analysis,
            "clusters": self.clusters,
            "recommendations": self.recommendations,
        }


class KnowledgeCurator:
    AGING_THRESHOLD_DAYS = 180
    ASSOCIATION_SIMILARITY_THRESHOLD = 0.25
    CLUSTER_COUNT = 6

    def __init__(self, knowledge_base: KnowledgeBase) -> None:
        self._kb = knowledge_base

    def detect_aging(self) -> list[KnowledgeItem]:
        threshold = datetime.now(timezone.utc) - timedelta(days=self.AGING_THRESHOLD_DAYS)
        aging: list[KnowledgeItem] = []
        for item in self._kb.list_all():
            try:
                created = datetime.fromisoformat(item.created_at)
                if created < threshold:
                    aging.append(item)
            except (ValueError, TypeError):
                pass
        return aging

    def suggest_updates(self) -> list[str]:
        suggestions: list[str] = []
        aging = self.detect_aging()
        for item in aging:
            suggestions.append(
                f"[{item.category}] '{item.title}' 创建于{item.created_at[:10]}，已超过"
                f"{self.AGING_THRESHOLD_DAYS}天，建议检查内容时效性"
            )
        low_quality = [i for i in self._kb.list_all() if i.quality_score < 0.3]
        for item in low_quality[:5]:
            suggestions.append(
                f"[{item.category}] '{item.title}' 质量评分偏低({item.quality_score:.2f})，"
                "建议补充内容和标签"
            )
        stats = self._kb.get_category_stats()
        for cat_name, count in stats.items():
            if count == 0:
                suggestions.append(f"分类'{cat_name}'暂无内容，建议补充")
        return suggestions

    def discover_associations(self) -> list[dict]:
        items = list(self._kb._items.values())
        associations: list[dict] = []
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                sim = _jaccard(items[i].content, items[j].content)
                if sim > self.ASSOCIATION_SIMILARITY_THRESHOLD:
                    shared_tags = set(items[i].tags) & set(items[j].tags)
                    if items[i].category == items[j].category or shared_tags:
                        associations.append({
                            "source": items[i].title,
                            "target": items[j].title,
                            "similarity": round(sim, 3),
                            "shared_tags": list(shared_tags),
                            "categories": [items[i].category, items[j].category],
                        })
        associations.sort(key=lambda x: x["similarity"], reverse=True)
        return associations[:30]

    def analyze_gaps(self) -> dict[str, str]:
        stats = self._kb.get_category_stats()
        total = max(self._kb.total_count, 1)
        gaps: dict[str, str] = {}
        expected = {
            "AI编程": 0.15, "前端开发": 0.12, "后端开发": 0.15,
            "数据科学": 0.10, "DevOps": 0.10, "产品设计": 0.08,
            "认知科学": 0.10, "学习方法": 0.08, "工具推荐": 0.08, "其他": 0.04,
        }
        for cat_name, expected_ratio in expected.items():
            actual_ratio = stats.get(cat_name, 0) / total
            if actual_ratio < expected_ratio * 0.5:
                gaps[cat_name] = f"覆盖率{actual_ratio:.1%}，低于期望{expected_ratio:.1%}，建议补充内容"
            elif actual_ratio < expected_ratio * 0.75:
                gaps[cat_name] = f"覆盖率{actual_ratio:.1%}，接近但未达期望{expected_ratio:.1%}"
        low_tags = [(t, c) for t, c in self._kb.get_tag_stats().items() if c == 1]
        for tag, count in low_tags[:5]:
            gaps[f"标签: {tag}"] = f"仅{count}条知识使用此标签，建议扩展相关主题"
        return gaps

    def cluster(self) -> list[dict]:
        items = list(self._kb._items.values())
        if len(items) < 3:
            return [{"cluster_id": 0, "label": "all", "items": [i.title for i in items]}]
        categ = list(set(i.category for i in items))
        k = min(self.CLUSTER_COUNT, max(1, len(categ)))
        centroids = categ[:k]
        clusters: dict[str, list[str]] = {c: [] for c in centroids}
        for item in items:
            best_cat, best_sim = None, 0.0
            for cent in centroids:
                sim = 1.0 if item.category == cent else _jaccard(item.content, cent) * 0.3
                if sim > best_sim:
                    best_cat, best_sim = cent, sim
            if best_cat:
                clusters[best_cat].append(item.title)
        result = []
        for idx, (cent, titles) in enumerate(clusters.items()):
            result.append({"cluster_id": idx, "label": cent, "items": titles})
        return result

    def recommend(self, interests: Optional[list[str]] = None, top_n: int = 5) -> list[KnowledgeItem]:
        interests = interests or []
        scored: list[tuple[KnowledgeItem, float]] = []
        for item in self._kb.list_all():
            s = item.quality_score * 0.4
            if interests:
                interest_score = sum(
                    1.0 for kw in interests if kw.lower() in item.title.lower() or kw.lower() in " ".join(item.tags).lower()
                ) / max(len(interests), 1)
                s += interest_score * 0.6
            scored.append((item, s))
        scored.sort(key=lambda x: x[1], reverse=True)
        return [it for it, _ in scored[:top_n]]

    def generate_report(self, interests: Optional[list[str]] = None) -> CuratorReport:
        report = CuratorReport()
        report.total_items = self._kb.total_count
        report.avg_quality = self._kb.avg_quality
        report.aging_items = [i.title for i in self.detect_aging()[:10]]
        report.update_suggestions = self.suggest_updates()[:10]
        report.discovered_associations = self.discover_associations()[:15]
        report.gap_analysis = self.analyze_gaps()
        report.clusters = self.cluster()
        report.recommendations = [i.title for i in self.recommend(interests)]
        return report
