"""
认知涌现引擎 — 长期记忆引擎
=============================
三层记忆: 会话记忆 + 情景记忆 + 语义记忆

层级:
1. 会话记忆: 当前对话窗口(最近 N 轮)
2. 情景记忆: 重要事件和关键事实提取(如"用户是Python新手")
3. 语义记忆: 压缩总结旧对话为知识摘要
"""

from __future__ import annotations

import json
import hashlib
import re
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .knowledge_store import STORAGE_DIR

MEMORY_DIR = STORAGE_DIR / "memory"
MEMORY_DIR.mkdir(parents=True, exist_ok=True)

EPISODIC_FILE = MEMORY_DIR / "episodic.json"
SEMANTIC_FILE = MEMORY_DIR / "semantic.json"


@dataclass
class EpisodicMemory:
    """情景记忆: 一条关键事实"""
    id: str
    fact: str
    topic: str
    confidence: float
    source_text: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    recalled_count: int = 0

    def to_dict(self) -> dict:
        return {
            "id": self.id, "fact": self.fact, "topic": self.topic,
            "confidence": self.confidence, "source_text": self.source_text,
            "created_at": self.created_at, "recalled_count": self.recalled_count,
        }

    @classmethod
    def from_dict(cls, d: dict) -> EpisodicMemory:
        return cls(**{k: d.get(k) for k in [
            "id", "fact", "topic", "confidence", "source_text",
            "created_at", "recalled_count",
        ] if k in d})


class MemoryEngine:
    """
    三层记忆引擎

    用法:
        mem = MemoryEngine(session_id="user_abc")
        mem.add_exchange("什么是认知涌现", "认知涌现是指...")
        facts = mem.recall("涌现")  # -> ["用户关注涌现概念", ...]
        summary = mem.summarize_recent()  # -> "最近在聊认知科学..."
    """

    def __init__(self, session_id: str = "default", window_size: int = 20):
        self._session_id = session_id
        self._window_size = window_size

        # 会话记忆: 最近 N 轮对话原文
        self._conversation_buffer: list[dict] = []

        # 情景记忆: 提取的关键事实
        self._episodic: list[EpisodicMemory] = []
        self._load_episodic()

        # 语义记忆: 压缩总结
        self._semantic: dict[str, str] = {}
        self._load_semantic()

        # 摘要缓存
        self._summary: str = ""
        self._summary_dirty = True

    # ── 会话记忆 ────────────────────────────────────────────

    def add_exchange(self, user_text: str, ai_response: str):
        entry = {
            "role": "user", "content": user_text,
            "ts": time.time(),
        }
        self._conversation_buffer.append(entry)
        entry = {
            "role": "assistant", "content": ai_response[:500],
            "ts": time.time(),
        }
        self._conversation_buffer.append(entry)

        if len(self._conversation_buffer) > self._window_size * 2:
            old = self._conversation_buffer[:2]
            self._compress_to_semantic(old)
            self._conversation_buffer = self._conversation_buffer[2:]

        # 提取情景记忆
        self._extract_episodic(user_text, ai_response)
        self._summary_dirty = True

    def get_recent(self, n: int = 6) -> list[dict]:
        """获取最近 N 条对话"""
        return self._conversation_buffer[-n * 2:]

    def get_context_for_inference(self) -> str:
        """为推理提供上下文"""
        if not self._conversation_buffer:
            return ""
        recent = self._conversation_buffer[-8:]
        lines = ["[近期对话]"]
        for msg in recent:
            role = "用户" if msg["role"] == "user" else "AI"
            content = msg["content"][:200]
            lines.append(f"{role}: {content}")
        return "\n".join(lines)

    # ── 情景记忆 ────────────────────────────────────────────

    FACT_PATTERNS = [
        r"(我是|我学|我用|我在做|我从事|我喜欢|我擅长|我关注|我刚|我最近)(.{2,30})",
        r"(用户|我).*(新手|入门|初学|刚开始|不会|不懂)",
        r"(我想|我要|我希望|我计划|我打算).*(学|做|搞|了解|掌握|实现|开发)(.{2,30})",
        r"(我之前|我以前|我过去|我曾经)(.{2,30})",
        r"(我需要|我必须|我不得不)(.{2,30})",
    ]

    def _extract_episodic(self, user_text: str, ai_response: str):
        for pattern in self.FACT_PATTERNS:
            matches = re.findall(pattern, user_text)
            for m in matches:
                fact = "".join(m) if isinstance(m, tuple) else m
                fact = fact.strip()
                if len(fact) < 3 or len(fact) > 80:
                    continue
                if self._is_trivial_fact(fact):
                    continue

                topic = self._classify_topic(fact)
                fid = hashlib.md5(fact.encode()).hexdigest()[:12]

                existing = next((e for e in self._episodic if e.id == fid), None)
                if existing:
                    existing.confidence = min(1.0, existing.confidence + 0.1)
                    existing.recalled_count += 1
                else:
                    self._episodic.append(EpisodicMemory(
                        id=fid, fact=fact, topic=topic,
                        confidence=0.6, source_text=user_text,
                    ))

        if len(self._episodic) > 200:
            self._episodic.sort(key=lambda e: (e.recalled_count, e.confidence), reverse=True)
            self._episodic = self._episodic[:200]

        self._save_episodic()

    def recall(self, query: str, top_k: int = 3) -> list[str]:
        """根据查询词召回相关情景记忆"""
        ql = query.lower()
        scored: list[tuple[float, EpisodicMemory]] = []
        for em in self._episodic:
            score = 0.0
            fl = em.fact.lower()
            for word in ql.split():
                if word in fl:
                    score += 2.0 * em.confidence
            if em.topic and em.topic in ql:
                score += 3.0
            if score > 0:
                scored.append((score, em))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for _, em in scored[:top_k]:
            results.append(em.fact)
            em.recalled_count += 1
        return results

    def get_all_episodic(self) -> list[dict]:
        return [e.to_dict() for e in self._episodic]

    # ── 语义记忆 ────────────────────────────────────────────

    def _compress_to_semantic(self, exchanges: list[dict]):
        """将旧对话压缩为语义摘要"""
        user_msgs = [m["content"] for m in exchanges if m["role"] == "user"]
        if not user_msgs:
            return
        combined = " | ".join(user_msgs)
        topic = self._classify_topic(combined)
        if topic not in self._semantic:
            self._semantic[topic] = ""
        self._semantic[topic] = f"{self._semantic[topic]} {combined[:200]}".strip()
        self._save_semantic()

    def summarize(self) -> str:
        """生成综合摘要"""
        if not self._summary_dirty and self._summary:
            return self._summary

        parts = []
        # 会话摘要
        if self._conversation_buffer:
            topics = set()
            for msg in self._conversation_buffer:
                if msg["role"] == "user":
                    topic = self._classify_topic(msg["content"])
                    topics.add(topic)
            parts.append(f"本次对话涉及: {', '.join(list(topics)[:5])}")

        # 情景摘要
        if self._episodic:
            top_facts = sorted(self._episodic,
                               key=lambda e: (e.recalled_count, e.confidence), reverse=True)[:5]
            parts.append("已知信息: " + "; ".join(e.fact for e in top_facts))

        # 语义摘要
        if self._semantic:
            for topic, summary in list(self._semantic.items())[:3]:
                parts.append(f"[历史] {topic}: {summary[:100]}")

        self._summary = "\n".join(parts)
        self._summary_dirty = False
        return self._summary

    # ── 持久化 ──────────────────────────────────────────────

    def _load_episodic(self):
        if EPISODIC_FILE.exists():
            try:
                with open(EPISODIC_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._episodic = [EpisodicMemory.from_dict(d) for d in data.get("memories", [])]
            except Exception:
                self._episodic = []

    def _save_episodic(self):
        try:
            data = {"memories": [e.to_dict() for e in self._episodic],
                     "updated_at": datetime.now(timezone.utc).isoformat()}
            with open(EPISODIC_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def _load_semantic(self):
        if SEMANTIC_FILE.exists():
            try:
                with open(SEMANTIC_FILE, "r", encoding="utf-8") as f:
                    self._semantic = json.load(f)
            except Exception:
                self._semantic = {}

    def _save_semantic(self):
        try:
            data = {k: v[:500] for k, v in self._semantic.items()}
            with open(SEMANTIC_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    # ── 辅助 ────────────────────────────────────────────────

    TOPIC_KEYWORDS = {
        "编程": ["代码", "编程", "开发", "算法", "bug", "python", "javascript", "java", "go"],
        "认知": ["认知", "涌现", "思维", "学习", "记忆", "理解"],
        "工具": ["软件", "工具", "推荐", "替代", "免费", "vs code", "编辑器"],
        "设计": ["设计", "UI", "前端", "css", "布局", "样式", "组件"],
        "AI": ["AI", "人工智能", "大模型", "LLM", "深度学习", "机器学习", "agent", "推理"],
        "项目": ["项目", "架构", "部署", "上线", "服务器", "数据库", "API"],
    }

    def _classify_topic(self, text: str) -> str:
        tl = text.lower()
        for topic, keywords in self.TOPIC_KEYWORDS.items():
            for kw in keywords:
                if kw.lower() in tl:
                    return topic
        return "其他"

    def _is_trivial_fact(self, fact: str) -> bool:
        trivial = {"我是人", "我不知道", "我不懂", "我不会", "我在看", "我在听", "我在想", "我在做"}
        return fact.strip() in trivial

    def stats(self) -> dict:
        return {
            "session_id": self._session_id,
            "conversation_turns": len(self._conversation_buffer) // 2,
            "episodic_count": len(self._episodic),
            "semantic_topics": len(self._semantic),
        }

    def clear(self):
        self._conversation_buffer.clear()
        self._episodic.clear()
        self._semantic.clear()
        self._summary = ""
        self._summary_dirty = True
