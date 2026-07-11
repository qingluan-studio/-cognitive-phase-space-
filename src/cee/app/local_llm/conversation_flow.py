"""
认知涌现引擎 — 对话流追踪引擎
===========================
多轮对话深度追踪：话题迁移检测、深度计数、跟进建议生成

功能:
1. 话题追踪: 检测每次对话的话题线性/跳转
2. 深度计数: 同一话题的连续轮数
3. 跟进建议: 自动生成深层追问
4. 话题链: 记录话题转换历史

用法:
    cf = ConversationFlow()
    cf.push_query("什么是Python")
    cf.push_query("Python的装饰器怎么用")
    depth = cf.get_depth()  # -> 2, 仍在编程话题上
    followup = cf.suggest_followup()  # -> "想了解装饰器与闭包的关系吗？"
"""

from __future__ import annotations

import json
import re
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .knowledge_store import STORAGE_DIR

FLOW_FILE = STORAGE_DIR / "conversation_flow.json"


@dataclass
class TopicNode:
    topic: str
    depth: int = 1
    started_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
    subtopics: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "topic": self.topic, "depth": self.depth,
            "started_at": self.started_at, "last_active": self.last_active,
            "subtopics": self.subtopics,
        }

    @classmethod
    def from_dict(cls, d: dict) -> TopicNode:
        return cls(**d)


TOPIC_KW = {
    "编程语言": ["python", "javascript", "java", "go", "rust", "c++", "typescript",
               "语法", "函数", "类", "对象", "接口", "模块", "包", "库", "框架",
               "装饰器", "生成器", "异步", "多线程", "协程"],
    "AI与ML": ["ai", "llm", "大模型", "深度学习", "机器学习", "transformer",
               "注意力机制", "嵌入", "向量", "token", "微调", "预训练",
               "推理", "训练", "模型", "神经网络"],
    "认知科学": ["认知", "涌现", "混沌", "思维", "意识", "知识", "推理",
                "学习", "记忆", "理解", "不变量", "几何"],
    "工具生态": ["软件", "工具", "ide", "编辑器", "vscode", "终端", "命令行",
                "部署", "docker", "git", "linux", "服务器"],
    "项目工程": ["项目", "架构", "设计", "模式", "开发", "测试", "部署",
                "框架", "构建", "打包"],
    "日常闲聊": ["你好", "谢谢", "再见", "天气", "吃饭", "休息"],
}


class ConversationFlow:
    """
    对话流追踪引擎

    用法:
        cf = ConversationFlow()
        cf.push_query("什么是认知涌现")
        cf.push_query("它和混沌边缘有什么关系")
        cf.push_query("还有呢")  # depth=3, 仍在认知科学话题
    """

    def __init__(self, session_id: str = "default"):
        self._session_id = session_id
        self._topic_stack: list[TopicNode] = []
        self._topic_chain: list[dict] = []
        self._query_log: list[str] = []
        self._current_topic: str | None = None
        self._topic_depth: int = 0
        self._followup_pool: dict[str, list[str]] = {}
        self._load()

    def push_query(self, text: str) -> dict:
        """
        处理一条用户查询，追踪话题演变
        返回: {当前话题, 深度, 是否新话题, 是否持续}
        """
        self._query_log.append(text)
        detected = self._detect_topic(text)

        if detected == self._current_topic:
            self._topic_depth += 1
            if self._topic_stack:
                self._topic_stack[-1].depth = self._topic_depth
                self._topic_stack[-1].last_active = time.time()
                self._topic_stack[-1].subtopics.append(text[:80])
            is_new = False
            continued = True
        else:
            old_topic = self._current_topic
            self._current_topic = detected
            self._topic_depth = 1
            is_new = True
            continued = False

            if old_topic and old_topic != "日常闲聊":
                self._topic_chain.append({
                    "from": old_topic, "to": detected, "ts": time.time(),
                })

            node = TopicNode(topic=detected, depth=1)
            self._topic_stack.append(node)

            if len(self._topic_stack) > 10:
                self._topic_stack = self._topic_stack[-10:]

        self._save()
        return {
            "topic": detected,
            "depth": self._topic_depth,
            "is_new": is_new,
            "continued": continued,
        }

    def get_depth(self) -> int:
        """当前话题深度 (同一话题已讨论几轮)"""
        return self._topic_depth

    def suggest_followup(self, topic: str | None = None) -> str:
        """
        生成跟进问题
        topic=None 时用当前话题
        """
        topic = topic or self._current_topic or "通用"
        depth = self._topic_depth

        followups = {
            "编程语言": [
                "想了解它的底层实现原理吗？",
                "要不要看一个具体的代码示例？",
                "你遇到的具体场景是什么？",
                "要不要对比一下其他语言的类似实现？",
            ],
            "AI与ML": [
                "你用的是哪个模型？我可以帮你分析具体参数。",
                "想深入了解它的训练过程吗？",
                "需要我帮你解释它的数学原理吗？",
                "在什么应用场景下使用？",
            ],
            "认知科学": [
                "想了解相关的数学框架(认知几何)吗？",
                "要不要看看T1-T6引擎如何量化分析？",
                "这个概念在实际中怎么应用？",
                "和其他认知理论有什么关联？",
            ],
            "工具生态": [
                "需要推荐免费的开源替代方案吗？",
                "要不要帮你配置开发环境？",
                "你现在的需求和场景是什么？",
            ],
            "项目工程": [
                "你的项目规模和团队情况？",
                "需要架构设计方面的建议吗？",
                "要不要我帮你规划实现步骤？",
            ],
        }

        options = followups.get(topic, followups["AI与ML"])
        import random
        idx = min(depth - 1, len(options) - 1)
        return random.choice(options[max(0, idx - 1):])

    def enrich_context(self) -> str:
        """生成对话流上下文，用于注入推理"""
        if not self._topic_stack:
            return ""

        lines = ["[对话流]"]
        recent = self._topic_stack[-3:]
        for node in recent:
            lines.append(f"- {node.topic}: 深度{node.depth}轮")
        if self._topic_chain:
            last = self._topic_chain[-1]
            lines.append(f"- 话题从 {last['from']} 跳转到 {last['to']}")

        return "\n".join(lines)

    def get_topic_summary(self) -> str:
        """话题分布摘要"""
        topic_counts: dict[str, int] = {}
        for node in self._topic_stack:
            topic_counts[node.topic] = topic_counts.get(node.topic, 0) + node.depth

        sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        parts = [f"{t}({c}轮)" for t, c in sorted_topics]
        return " → ".join(parts) if parts else "无话题"

    def _detect_topic(self, text: str) -> str:
        tl = text.lower()
        scores = {}
        for topic, keywords in TOPIC_KW.items():
            score = sum(1 for kw in keywords if kw.lower() in tl)
            if score > 0:
                scores[topic] = score
        if not scores:
            return "日常闲聊"
        return max(scores, key=scores.get)

    def stats(self) -> dict:
        return {
            "session_id": self._session_id,
            "depth": self._topic_depth,
            "current_topic": self._current_topic or "none",
            "topic_stack_len": len(self._topic_stack),
            "chain_len": len(self._topic_chain),
            "summary": self.get_topic_summary(),
        }

    def _load(self):
        if FLOW_FILE.exists():
            try:
                with open(FLOW_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                sess_data = data.get(self._session_id, {})
                self._topic_chain = sess_data.get("chain", [])
                self._current_topic = sess_data.get("current_topic")
                self._topic_depth = sess_data.get("depth", 0)
            except Exception:
                pass

    def _save(self):
        try:
            data = {}
            if FLOW_FILE.exists():
                with open(FLOW_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            data[self._session_id] = {
                "chain": self._topic_chain[-20:],
                "current_topic": self._current_topic,
                "depth": self._topic_depth,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(FLOW_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
