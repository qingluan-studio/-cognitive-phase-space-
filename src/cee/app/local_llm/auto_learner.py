"""
认知涌现引擎 — 自学习管道
=========================
真正让系统"记住"用户教的知识，而非仅做权重调整

三层学习:
1. 模式检测 → 识别用户是否在"教"系统
2. 事实提取 → 从对话中剥离出可存储的知识片段
3. 巩固融合 → 合并重复知识，淘汰低质事实

用法:
    from cee.app.local_llm import AutoLearner
    al = AutoLearner(engine.store)
    al.learn_from("认知涌现由混沌边缘产生", "用户解释", 0.85)
    facts = al.query("涌现")
"""

from __future__ import annotations

import json
import hashlib
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from .knowledge_store import STORAGE_DIR

if TYPE_CHECKING:
    from .knowledge_store import SelfLearningKnowledgeStore

LEARNER_FILE = STORAGE_DIR / "auto_learner.json"

TEACHING_PATTERNS = [
    r"(记住|记一下|记着)(.{3,80})",
    r"(注意|值得注意的是|关键在于|重点是)(.{3,80})",
    r"(你.*需要.*知道)(.{3,80})",
]

DEFINITION_PATTERNS = [
    r"([\u4e00-\u9fa5a-zA-Z]+)[是指]([^，。；\n]{4,80})",
    r"所谓[的]?([\u4e00-\u9fa5a-zA-Z]+)[，,]*([^，。；\n]{4,80})",
    r"([\u4e00-\u9fa5a-zA-Z]{2,16})[—\u2014\u2015]([^，。；\n]{4,80})",
]

CAUSAL_PATTERNS = [
    r"(因为|由于)(.{3,40})(所以|因此|导致|产生)(.{3,40})",
    r"(.{2,20})(来源于|产生于|由.+生成)(.{2,30})",
]

COMPARISON_PATTERNS = [
    r"(.{2,20})(不同于|与.+不同|区别于|优于|强于|比.+好)(.{2,30})",
    r"(.{2,20})(的核心是|的本质是|最重要的是)(.{2,30})",
]

TRIVIAL_FACTS = {
    "OK", "好的", "我知道了", "明白了", "嗯", "行", "可以", "没问题",
    "是的", "对的", "不对", "不错", "还行", "一般", "试试看",
}


@dataclass
class LearnerFact:
    id: str
    fact: str
    topic: str
    confidence: float
    source_text: str
    source_type: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    recalled_count: int = 0
    feedback_score: float = 0.0
    feedback_count: int = 0

    def to_dict(self) -> dict:
        return {
            "id": self.id, "fact": self.fact, "topic": self.topic,
            "confidence": self.confidence, "source_text": self.source_text,
            "source_type": self.source_type, "created_at": self.created_at,
            "recalled_count": self.recalled_count,
            "feedback_score": self.feedback_score,
            "feedback_count": self.feedback_count,
        }

    @classmethod
    def from_dict(cls, d: dict) -> LearnerFact:
        return cls(**{k: d[k] for k in [
            "id", "fact", "topic", "confidence", "source_text",
            "source_type", "created_at", "recalled_count",
            "feedback_score", "feedback_count",
        ] if k in d})


class AutoLearner:
    """
    知识自学习管道

    用法:
        al = AutoLearner(engine.store)
        al.learn_from("认知涌现由混沌边缘自发产生", "user_teaching", 0.8)
        facts = al.query("涌现")
        al.consolidate()  # 定期巩固
    """

    def __init__(self, store: SelfLearningKnowledgeStore | None = None):
        self._store = store
        self._facts: list[LearnerFact] = []
        self._stats = {"attempts": 0, "learned": 0, "consolidations": 0}
        self._load()

    def learn_from(self, user_text: str, ai_response: str = "",
                   composite: float = 0.7, source: str = "conversation") -> list[LearnerFact]:
        """
        从一轮对话中尝试学习新知识
        返回新学到的事实列表
        """
        self._stats["attempts"] += 1

        if self._is_trivial(user_text):
            return []

        new_facts: list[LearnerFact] = []

        for fact_text, fact_type in self._extract_facts(user_text):
            if self._is_trivial(fact_text):
                continue

            fid = hashlib.md5(fact_text.encode()).hexdigest()[:12]

            existing = next((f for f in self._facts if f.id == fid), None)
            if existing:
                existing.confidence = min(1.0, existing.confidence + 0.05)
                existing.recalled_count += 1
                continue

            topic = self._classify_topic(fact_text)
            confidence = 0.5 + composite * 0.3

            lf = LearnerFact(
                id=fid, fact=fact_text, topic=topic,
                confidence=confidence, source_text=user_text[:200],
                source_type=fact_type,
            )
            self._facts.append(lf)
            new_facts.append(lf)
            self._stats["learned"] += 1

        if new_facts:
            self._save()

        if len(self._facts) > 500:
            self.consolidate()

        return new_facts

    def query(self, text: str, top_k: int = 5) -> list[str]:
        """语义查询 — 返回相关事实"""
        ql = text.lower()
        scored: list[tuple[float, LearnerFact]] = []

        for lf in self._facts:
            score = 0.0
            fl = lf.fact.lower()

            for word in ql.split():
                if word in fl:
                    score += 2.0 * lf.confidence * (1.0 + lf.feedback_score * 0.5)

            if lf.topic and lf.topic in ql:
                score += 3.0

            if score > 0:
                scored.append((score, lf))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for _, lf in scored[:top_k]:
            lf.recalled_count += 1
            results.append(lf.fact)

        return results

    def consolidate(self) -> int:
        """巩固优化: 合并重复事实，淘汰低质"""
        self._stats["consolidations"] += 1
        removed = 0

        merged: dict[str, LearnerFact] = {}
        for lf in self._facts:
            key = lf.fact[:20]
            if key in merged:
                existing = merged[key]
                existing.confidence = max(existing.confidence, lf.confidence)
                existing.recalled_count += lf.recalled_count
                existing.feedback_score = max(existing.feedback_score, lf.feedback_score)
                removed += 1
            else:
                merged[key] = lf

        self._facts = [f for f in merged.values()
                       if f.confidence >= 0.3 or f.recalled_count >= 1]
        removed += len(merged) - len(self._facts)

        # 最多保留300条
        if len(self._facts) > 300:
            self._facts.sort(key=lambda x: (
                x.feedback_score * 0.4 + x.confidence * 0.3 + x.recalled_count * 0.3
            ), reverse=True)
            removed += len(self._facts) - 300
            self._facts = self._facts[:300]

        self._save()
        return removed

    def feedback(self, fact_id: str, rating: str):
        """用户对某条事实的反馈"""
        lf = next((f for f in self._facts if f.id == fact_id), None)
        if not lf:
            return
        lf.feedback_count += 1
        if rating == "like":
            lf.feedback_score += 0.2
        elif rating == "dislike":
            lf.feedback_score -= 0.15
        lf.feedback_score = max(-1.0, min(1.0, lf.feedback_score))
        lf.confidence *= (1.0 + lf.feedback_score * 0.2)
        lf.confidence = max(0.1, min(1.0, lf.confidence))
        self._save()

    def get_enrichment(self, query: str, max_facts: int = 3) -> str:
        """生成扩充上下文"""
        facts = self.query(query, top_k=max_facts)
        if not facts:
            return ""
        lines = ["【已学知识】"]
        for f in facts:
            lines.append(f"- {f}")
        return "\n".join(lines)

    def _extract_facts(self, text: str) -> list[tuple[str, str]]:
        """从文本中提取可存储的事实"""
        results: list[tuple[str, str]] = []

        for pattern in TEACHING_PATTERNS:
            for m in re.findall(pattern, text):
                fact = (m[1] if len(m) > 1 else m[0]).strip("，。；的得了吗呢啊吧")
                if 3 < len(fact) < 80:
                    results.append((fact, "teaching"))

        for pattern in DEFINITION_PATTERNS:
            for m in re.findall(pattern, text):
                subject = m[0].strip()
                body = m[1].strip("，。；")
                if len(subject) > 1 and len(body) > 3:
                    results.append((f"{subject}指的是{body}", "definition"))

        for pattern in CAUSAL_PATTERNS:
            for m in re.findall(pattern, text):
                parts = [p.strip() for p in m if p.strip()]
                if len(parts) >= 2:
                    results.append(("→".join(parts[:3]), "causal"))

        for pattern in COMPARISON_PATTERNS:
            for m in re.findall(pattern, text):
                parts = [p.strip("，。；") for p in m if p.strip()]
                if len(parts) >= 2:
                    results.append((" vs ".join(parts[:3]), "comparison"))

        return results

    def _classify_topic(self, text: str) -> str:
        tl = text.lower()
        topic_kw = {
            "认知": ["认知", "涌现", "思维", "意识", "学习", "记忆", "智能", "推理"],
            "编程": ["代码", "编程", "算法", "函数", "类", "接口", "bug", "python",
                     "javascript", "java", "go", "rust"],
            "AI": ["AI", "LLM", "大模型", "深度学习", "机器学习", "transformer",
                   "注意力", "嵌入", "向量", "token"],
            "工具": ["软件", "工具", "平台", "框架", "库", "编辑器", "替代", "免费"],
            "数学": ["数学", "几何", "微分", "积分", "概率", "统计", "线性"],
            "哲学": ["哲学", "原理", "本质", "本体", "认识", "方法"],
            "项目": ["项目", "架构", "部署", "数据库", "API", "服务器", "管道"],
        }
        for topic, keywords in topic_kw.items():
            for kw in keywords:
                if kw.lower() in tl:
                    return topic
        return "通用"

    def _is_trivial(self, text: str) -> bool:
        cleaned = text.strip().lower().replace(" ", "")
        if cleaned in TRIVIAL_FACTS or len(cleaned) < 4:
            return True
        return False

    def stats(self) -> dict:
        return {
            "total_facts": len(self._facts),
            "by_topic": {k: sum(1 for f in self._facts if f.topic == k)
                         for k in set(f.topic for f in self._facts)},
            "avg_confidence": round(
                sum(f.confidence for f in self._facts) / max(1, len(self._facts)), 3),
            "total_recalls": sum(f.recalled_count for f in self._facts),
            **self._stats,
        }

    def _load(self):
        if LEARNER_FILE.exists():
            try:
                with open(LEARNER_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._facts = [LearnerFact.from_dict(d) for d in data.get("facts", [])]
                self._stats = data.get("stats", {"attempts": 0, "learned": 0, "consolidations": 0})
            except Exception:
                pass

    def _save(self):
        try:
            data = {
                "facts": [f.to_dict() for f in self._facts],
                "stats": self._stats,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(LEARNER_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
