"""
主题分析引擎。

提供主题建模和分析能力，包括关键词聚类、主题提取、
主题演变追踪、文档主题分布、主题可视化数据生成等功能。
"""

import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field, asdict
from typing import Any, Optional

import numpy as np


@dataclass
class Topic:
    id: str = ""
    label: str = ""
    keywords: list[tuple[str, float]] = field(default_factory=list)
    weight: float = 0.0
    coherence_score: float = 0.0
    description: str = ""
    parent_topic: str = ""
    document_count: int = 0


@dataclass
class DocumentTopic:
    doc_id: str = ""
    topic_distribution: dict[str, float] = field(default_factory=dict)
    primary_topic: str = ""
    secondary_topics: list[str] = field(default_factory=list)
    confidence: float = 0.0


@dataclass
class TopicEvolution:
    timestamps: list[str] = field(default_factory=list)
    topic_weights: dict[str, list[float]] = field(default_factory=dict)
    emerging_topics: list[str] = field(default_factory=list)
    declining_topics: list[str] = field(default_factory=list)
    stable_topics: list[str] = field(default_factory=list)


@dataclass
class TopicAnalysisResult:
    topics: list[Topic] = field(default_factory=list)
    document_topics: list[DocumentTopic] = field(default_factory=list)
    topic_graph: dict[str, list[tuple[str, float]]] = field(default_factory=dict)
    evolution: Optional[TopicEvolution] = None
    hot_topics: list[dict] = field(default_factory=list)
    topic_number: int = 0


@dataclass
class VisualizationData:
    nodes: list[dict] = field(default_factory=list)
    edges: list[dict] = field(default_factory=list)
    heatmap_data: list[list[float]] = field(default_factory=list)
    topic_labels: list[str] = field(default_factory=list)
    doc_labels: list[str] = field(default_factory=list)


class TopicAnalyzer:
    """主题建模和分析引擎。"""

    _default_stop_words = {
        "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一",
        "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着",
        "没有", "看", "好", "自己", "这", "他", "她", "它", "们", "那", "些",
        "什么", "哪", "怎么", "吗", "吧", "呢", "啊", "哦", "嗯", "哈",
        "可以", "这个", "那个", "如果", "因为", "所以", "但是", "虽然",
        "还是", "已经", "可能", "应该", "需要", "能够", "通过", "以及",
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "could", "should", "may", "might", "shall", "to",
        "of", "in", "for", "on", "with", "at", "by", "from", "as",
        "it", "its", "this", "that", "these", "those", "and", "but",
        "or", "not", "so", "if", "then", "than", "too", "very",
    }

    def __init__(self, num_topics: int = 5, min_cooccurrence: int = 2,
                 max_keywords_per_topic: int = 10):
        self.num_topics = num_topics
        self.min_cooccurrence = min_cooccurrence
        self.max_keywords_per_topic = max_keywords_per_topic
        self._stop_words = set(self._default_stop_words)
        self._custom_stop_words: set[str] = set()

    def fit_transform(self, documents: list[str],
                      doc_ids: list[str] | None = None) -> TopicAnalysisResult:
        if not documents:
            return TopicAnalysisResult()

        if doc_ids is None:
            doc_ids = ["doc_{}".format(i) for i in range(len(documents))]
        elif len(doc_ids) != len(documents):
            doc_ids = ["doc_{}".format(i) if i >= len(doc_ids) else doc_ids[i]
                       for i in range(len(documents))]

        all_stop = self._stop_words | self._custom_stop_words

        tokenized_docs = []
        for doc in documents:
            tokens = [t for t in self._tokenize(doc) if t not in all_stop and len(t) > 1]
            tokenized_docs.append(tokens)

        keywords = self._extract_keywords(tokenized_docs)
        keyword_clusters = self._cluster_keywords(keywords)

        topics = []
        topic_id = 0
        for cluster_label, cluster_keywords in keyword_clusters.items():
            topic_id += 1
            tid = "topic_{}".format(topic_id)
            kw_with_scores = self._score_keywords(cluster_keywords, tokenized_docs)

            topic = Topic(
                id=tid,
                label=cluster_label,
                keywords=kw_with_scores[:self.max_keywords_per_topic],
                weight=sum(s for _, s in kw_with_scores) / max(1, len(kw_with_scores)),
                coherence_score=self._compute_coherence(cluster_keywords, tokenized_docs),
                description=self._generate_topic_description(cluster_label, kw_with_scores),
                document_count=0,
            )
            topics.append(topic)

        doc_topics = self._assign_documents_to_topics(documents, tokenized_docs,
                                                       doc_ids, topics)
        topic_graph = self._build_topic_graph(topics, tokenized_docs)
        hot = self._compute_hot_topics(topics, tokenized_docs)

        return TopicAnalysisResult(
            topics=topics,
            document_topics=doc_topics,
            topic_graph=topic_graph,
            hot_topics=hot,
            topic_number=len(topics),
        )

    def _tokenize(self, text: str) -> list[str]:
        tokens = []
        for match in re.finditer(r"[\u4e00-\u9fff]+|[a-zA-Z]+|\d+", text.lower()):
            tokens.append(match.group())
        return tokens

    def _extract_keywords(self, tokenized_docs: list[list[str]]) -> Counter:
        counter = Counter()
        for doc in tokenized_docs:
            counter.update(doc)
        return counter

    def _cluster_keywords(self, keywords: Counter) -> dict[str, list[str]]:
        clusters = {}
        pairs = self._compute_cooccurrence(keywords)

        top_words = [w for w, _ in keywords.most_common(min(30, len(keywords)))]

        assigned = set()
        cluster_id = 0

        for word in top_words:
            if word in assigned:
                continue

            cluster_id += 1
            cluster_name = word
            cluster_words = [word]
            assigned.add(word)

            neighbors = []
            for (w1, w2), count in pairs.items():
                if w1 == word and w2 not in assigned and count >= self.min_cooccurrence:
                    neighbors.append((w2, count))
                elif w2 == word and w1 not in assigned and count >= self.min_cooccurrence:
                    neighbors.append((w1, count))

            neighbors.sort(key=lambda x: x[1], reverse=True)
            for neighbor, _ in neighbors[:10]:
                if neighbor not in assigned and neighbor in top_words:
                    cluster_words.append(neighbor)
                    assigned.add(neighbor)

            clusters[cluster_name] = cluster_words

        unassigned = [w for w in top_words if w not in assigned]
        if unassigned:
            cluster_id += 1
            clusters["其他主题"] = unassigned

        return clusters

    def _compute_cooccurrence(self, keywords: Counter) -> dict[tuple[str, str], int]:
        words = [w for w, _ in keywords.most_common(50)]
        return {}

    def _score_keywords(self, cluster_keywords: list[str],
                        tokenized_docs: list[list[str]]) -> list[tuple[str, float]]:
        scores = []
        total_docs = max(1, len(tokenized_docs))

        for kw in cluster_keywords:
            doc_count = sum(1 for doc in tokenized_docs if kw in doc)
            score = doc_count / total_docs
            scores.append((kw, round(score, 4)))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores

    def _compute_coherence(self, cluster_words: list[str],
                           tokenized_docs: list[list[str]]) -> float:
        if len(cluster_words) < 2:
            return 1.0

        scores = []
        for i in range(len(cluster_words)):
            for j in range(i + 1, len(cluster_words)):
                w1, w2 = cluster_words[i], cluster_words[j]
                co_docs = sum(1 for doc in tokenized_docs if w1 in doc and w2 in doc)
                w1_docs = max(1, sum(1 for doc in tokenized_docs if w1 in doc))
                scores.append(co_docs / w1_docs)

        return round(np.mean(scores) if scores else 0.0, 4)

    def _generate_topic_description(self, label: str,
                                    keywords: list[tuple[str, float]]) -> str:
        top_kw = [kw for kw, _ in keywords[:5]]
        if top_kw:
            return "主题「{}」涉及: {}".format(label, "、".join(top_kw))
        return "主题「{}」".format(label)

    def _assign_documents_to_topics(self, documents: list[str],
                                    tokenized_docs: list[list[str]],
                                    doc_ids: list[str],
                                    topics: list[Topic]) -> list[DocumentTopic]:
        doc_topics = []

        for doc_idx, (doc, tokens) in enumerate(zip(documents, tokenized_docs)):
            topic_scores = {}
            for topic in topics:
                score = 0.0
                for kw, kw_score in topic.keywords:
                    if kw in tokens:
                        score += kw_score
                if score > 0:
                    topic_scores[topic.id] = score

            if not topic_scores:
                doc_topics.append(DocumentTopic(
                    doc_id=doc_ids[doc_idx],
                    primary_topic="unclassified",
                ))
                continue

            total = sum(topic_scores.values())
            distribution = {tid: round(s / total, 4) for tid, s in topic_scores.items()}
            sorted_topics = sorted(distribution.items(), key=lambda x: x[1], reverse=True)
            primary = sorted_topics[0][0]
            secondary = [t for t, _ in sorted_topics[1:3]]

            confidence = sorted_topics[0][1] if sorted_topics else 0.0

            doc_topics.append(DocumentTopic(
                doc_id=doc_ids[doc_idx],
                topic_distribution=distribution,
                primary_topic=primary,
                secondary_topics=secondary,
                confidence=confidence,
            ))

        for doc_topic in doc_topics:
            for topic in topics:
                if topic.id == doc_topic.primary_topic:
                    topic.document_count += 1

        return doc_topics

    def _build_topic_graph(self, topics: list[Topic],
                           tokenized_docs: list[list[str]]) -> dict[str, list[tuple[str, float]]]:
        graph = {}

        for t1 in topics:
            connections = []
            kws1 = set(kw for kw, _ in t1.keywords)
            for t2 in topics:
                if t1.id == t2.id:
                    continue
                kws2 = set(kw for kw, _ in t2.keywords)
                overlap = len(kws1 & kws2)
                if overlap > 0:
                    weight = overlap / max(1, len(kws1 | kws2))
                    connections.append((t2.id, round(weight, 4)))
            graph[t1.id] = connections

        return graph

    def _compute_hot_topics(self, topics: list[Topic],
                            tokenized_docs: list[list[str]]) -> list[dict]:
        hot = []
        total_docs = max(1, len(tokenized_docs))

        for topic in topics:
            heat = topic.document_count / total_docs * topic.coherence_score

            momentum = 0.0
            if topic.keywords:
                top_kw = topic.keywords[0][0]
                momentum = topic.keywords[0][1]

            hot.append({
                "topic_id": topic.id,
                "label": topic.label,
                "document_count": topic.document_count,
                "heat_score": round(heat, 4),
                "momentum": round(momentum, 4),
                "coverage": round(topic.document_count / total_docs * 100, 2),
            })

        hot.sort(key=lambda x: x["heat_score"], reverse=True)
        return hot

    def track_evolution(self, documents_by_time: dict[str, list[str]],
                        doc_ids_by_time: dict[str, list[str]] | None = None) -> TopicEvolution:
        timestamps = sorted(documents_by_time.keys())
        topic_weights: dict[str, list[float]] = defaultdict(list)

        all_results = []
        for ts in timestamps:
            docs = documents_by_time[ts]
            ids = doc_ids_by_time.get(ts) if doc_ids_by_time else None
            result = self.fit_transform(docs, ids)
            all_results.append((ts, result))

            for topic in result.topics:
                topic_weights[topic.label].append(topic.weight)

        if all_results:
            first_topics = {t.label for t in all_results[0][1].topics}
            last_topics = {t.label for t in all_results[-1][1].topics}

            emerging = sorted(last_topics - first_topics)
            declining = sorted(first_topics - last_topics)
            stable = sorted(first_topics & last_topics)
        else:
            emerging, declining, stable = [], [], []

        return TopicEvolution(
            timestamps=timestamps,
            topic_weights=dict(topic_weights),
            emerging_topics=emerging,
            declining_topics=declining,
            stable_topics=stable,
        )

    def generate_visualization_data(self,
                                    result: TopicAnalysisResult) -> VisualizationData:
        vis = VisualizationData()

        for topic in result.topics:
            node = {
                "id": topic.id,
                "label": topic.label,
                "weight": topic.weight,
                "document_count": topic.document_count,
                "coherence": topic.coherence_score,
            }
            vis.nodes.append(node)

        seen = set()
        for tid, connections in result.topic_graph.items():
            for target_id, weight in connections:
                edge_key = tuple(sorted([tid, target_id]))
                if edge_key not in seen:
                    seen.add(edge_key)
                    vis.edges.append({
                        "source": tid,
                        "target": target_id,
                        "weight": weight,
                    })

        if result.document_topics and result.topics:
            heatmap = []
            for dt in result.document_topics:
                row = []
                for topic in result.topics:
                    row.append(dt.topic_distribution.get(topic.id, 0.0))
                heatmap.append(row)
            vis.heatmap_data = heatmap

        vis.topic_labels = [t.label for t in result.topics]
        vis.doc_labels = [dt.doc_id for dt in result.document_topics]

        return vis

    def extract_topics_from_single_doc(self, text: str,
                                       num_keywords: int = 10) -> list[tuple[str, float]]:
        all_stop = self._stop_words | self._custom_stop_words
        tokens = [t for t in self._tokenize(text) if t not in all_stop and len(t) > 1]
        counter = Counter(tokens)
        total = max(1, sum(counter.values()))
        return [(w, round(c / total, 4)) for w, c in counter.most_common(num_keywords)]

    def add_stop_words(self, words: set[str]):
        self._custom_stop_words.update(words)

    def clear_custom_stop_words(self):
        self._custom_stop_words.clear()

    def set_num_topics(self, n: int):
        self.num_topics = max(1, n)

    def get_stop_words(self) -> set[str]:
        return self._stop_words | self._custom_stop_words
