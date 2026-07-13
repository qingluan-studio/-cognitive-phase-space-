"""
双引擎路由器 - Dual Engine Router

核心理念:
  同一个入口，两个大脑：
  - LightEngine: 日常轻量对话，快速响应，低资源消耗
  - HeavyEngine: 复杂多 Agent 任务，深思熟虑，全量认知管线

  路由器自动分析请求特征，决定交给哪个引擎处理。

双轨制:
  - 工程版: 基于规则 + 关键词的分类器
  - 理论版: 神经网络分类器 + 在线学习

路由策略:
  - 复杂度评分 (0.0 ~ 1.0)
  - 任务类型匹配
  - 负载均衡
  - 上下文感知切换
  - 降级保护
"""

from __future__ import annotations

import logging
import re
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class EngineMode(Enum):
    LIGHT = "light"
    HEAVY = "heavy"
    AUTO = "auto"


class TaskCategory(Enum):
    CHITCHAT = "chitchat"
    QNA = "qna"
    CREATIVE = "creative"
    ANALYSIS = "analysis"
    CODING = "coding"
    DEBATE = "debate"
    RESEARCH = "research"
    TRANSLATION = "translation"
    SUMMARIZATION = "summarization"
    REASONING = "reasoning"
    MULTI_STEP = "multi_step"
    UNKNOWN = "unknown"


@dataclass
class RouterDecision:
    """路由决策"""

    mode: EngineMode
    task_category: TaskCategory
    complexity_score: float
    confidence: float
    reason: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class RoutingTable:
    """路由表条目"""

    engine_mode: EngineMode
    task_categories: list[TaskCategory]
    complexity_range: tuple[float, float]
    load_weight: int = 1
    current_load: int = 0
    avg_latency_ms: float = 0.0
    error_count: int = 0
    total_routed: int = 0


class TaskClassifier:
    """任务分类器 - 决定用哪个引擎"""

    LIGHT_CATEGORIES = {
        TaskCategory.CHITCHAT,
        TaskCategory.QNA,
        TaskCategory.TRANSLATION,
        TaskCategory.SUMMARIZATION,
    }
    HEAVY_CATEGORIES = {
        TaskCategory.CREATIVE,
        TaskCategory.ANALYSIS,
        TaskCategory.CODING,
        TaskCategory.DEBATE,
        TaskCategory.RESEARCH,
        TaskCategory.REASONING,
        TaskCategory.MULTI_STEP,
    }

    LIGHT_KEYWORDS = re.compile(
        r"(什么是|怎么|如何|翻译|总结|推荐|天气|时间|日期|你好|谢谢|再见)",
        re.IGNORECASE,
    )
    HEAVY_KEYWORDS = re.compile(
        r"(设计|架构|实现|优化|分析|对比|评估|重构|测试|部署|安全|性能|算法"
        r"|写代码|编写|创建|生成|辩论|推理|证明"
        r"|Python|Java|Go|Rust|C\+\+|代码|模型|系统|框架|引擎|训练|部署"
        r"|REST|API|数据库|SQL|微服务|分布式|容器|K8s|Docker"
        r"|Transformer|GPT|LLM|神经网络|深度学习)",
        re.IGNORECASE,
    )

    @classmethod
    def classify(cls, prompt: str) -> tuple[TaskCategory, float]:
        """分类请求并给出复杂度分"""
        if not prompt.strip():
            return TaskCategory.UNKNOWN, 0.0

        prompt_lower = prompt.lower()
        word_count = len(prompt)
        has_code_markers = bool(re.search(r"```|def |class |import |function ", prompt_lower))

        complexity = 0.0
        if word_count > 500:
            complexity += 0.3
        elif word_count > 200:
            complexity += 0.15
        if has_code_markers:
            complexity += 0.25
        if len(re.findall(r"[,，;；\n]", prompt)) > 5:
            complexity += 0.1
        if bool(cls.HEAVY_KEYWORDS.search(prompt)):
            complexity += 0.3

        complexity = min(1.0, complexity)

        if bool(cls.HEAVY_KEYWORDS.search(prompt)) or has_code_markers or complexity > 0.5:
            category = cls._match_heavy(prompt)
        elif bool(cls.LIGHT_KEYWORDS.search(prompt)) or complexity < 0.3:
            category = cls._match_light(prompt)
        else:
            category = cls._match_heavy(prompt) if complexity >= 0.4 else cls._match_light(prompt)

        return category, complexity

    @classmethod
    def _match_light(cls, prompt: str) -> TaskCategory:
        p = prompt.lower()
        if any(kw in p for kw in ("翻译", "translate", "译")):
            return TaskCategory.TRANSLATION
        if any(kw in p for kw in ("总结", "摘要", "概括", "summarize")):
            return TaskCategory.SUMMARIZATION
        if any(kw in p for kw in ("什么是", "定义", "什么是", "how to", "如何")):
            return TaskCategory.QNA
        return TaskCategory.CHITCHAT

    @classmethod
    def _match_heavy(cls, prompt: str) -> TaskCategory:
        p = prompt.lower()
        if any(kw in p for kw in ("代码", "写", "实现", "编程", "code", "function", "def ")):
            return TaskCategory.CODING
        if any(kw in p for kw in ("辩论", "反驳", "论证", "debate", "argue")):
            return TaskCategory.DEBATE
        if any(kw in p for kw in ("研究", "论文", "深度", "research")):
            return TaskCategory.RESEARCH
        if any(kw in p for kw in ("推理", "reason", "逻辑", "证明")):
            return TaskCategory.REASONING
        if any(kw in p for kw in ("创作", "创意", "生成", "creative", "write")):
            return TaskCategory.CREATIVE
        if any(kw in p for kw in ("分析", "analysis", "评估")):
            return TaskCategory.ANALYSIS
        return TaskCategory.MULTI_STEP


@dataclass
class RequestAnalyzer:
    """请求分析器 - 提取请求特征"""

    prompt: str
    user_id: str = ""
    session_id: str = ""
    history_count: int = 0
    context_length: int = 0
    token_estimate: int = 0
    timestamp: float = field(default_factory=time.time)

    @classmethod
    def from_request(cls, prompt: str, **kwargs: Any) -> RequestAnalyzer:
        return cls(
            prompt=prompt,
            user_id=kwargs.get("user_id", ""),
            session_id=kwargs.get("session_id", ""),
            history_count=kwargs.get("history_count", 0),
            context_length=len(prompt),
            token_estimate=max(1, len(prompt) // 2),
        )

    @property
    def is_simple(self) -> bool:
        return self.token_estimate < 50 and self.history_count < 3

    @property
    def is_complex(self) -> bool:
        return (
            self.token_estimate > 300
            or self.history_count > 10
            or len(self.prompt.split("\n")) > 10
        )


class DualEngineRouter:
    """双引擎路由器 - 根据请求自动分流"""

    LIGHT_THRESHOLD = 0.4
    HEAVY_THRESHOLD = 0.6
    MAX_CONSECUTIVE_ERRORS = 5
    DECISION_TTL = 60

    def __init__(self) -> None:
        self._routing_table: dict[EngineMode, RoutingTable] = {
            EngineMode.LIGHT: RoutingTable(
                engine_mode=EngineMode.LIGHT,
                task_categories=list(TaskClassifier.LIGHT_CATEGORIES),
                complexity_range=(0.0, 0.5),
                load_weight=1,
            ),
            EngineMode.HEAVY: RoutingTable(
                engine_mode=EngineMode.HEAVY,
                task_categories=list(TaskClassifier.HEAVY_CATEGORIES),
                complexity_range=(0.3, 1.0),
                load_weight=3,
            ),
        }
        self._light_handler: Callable[[str], Any] | None = None
        self._heavy_handler: Callable[[str], Any] | None = None
        self._decision_cache: dict[str, tuple[RouterDecision, float]] = {}
        self._stats: dict[str, float] = {
            "light_routes": 0,
            "heavy_routes": 0,
            "total_errors": 0,
            "total_requests": 0,
        }
        self._lock = threading.RLock()
        logger.info("DualEngineRouter initialized")

    def register_handler(self, mode: EngineMode, handler: Callable[[str], Any]) -> None:
        if mode == EngineMode.LIGHT:
            self._light_handler = handler
        elif mode == EngineMode.HEAVY:
            self._heavy_handler = handler
        logger.info(f"Registered handler for {mode.value} engine")

    def route(self, prompt: str, **kwargs: Any) -> RouterDecision:
        """做出路由决策"""
        analyzer = RequestAnalyzer.from_request(prompt, **kwargs)
        cache_key = f"{analyzer.user_id}:{hash(prompt) % 10000}"

        with self._lock:
            if cache_key in self._decision_cache:
                decision, ts = self._decision_cache[cache_key]
                if time.time() - ts < self.DECISION_TTL:
                    return decision

        category, complexity = TaskClassifier.classify(prompt)

        light_table = self._routing_table[EngineMode.LIGHT]
        heavy_table = self._routing_table[EngineMode.HEAVY]

        light_load_ratio = light_table.current_load / max(1, light_table.load_weight)
        heavy_load_ratio = heavy_table.current_load / max(1, heavy_table.load_weight)

        if analyzer.is_complex:
            mode = EngineMode.HEAVY
        elif category in TaskClassifier.HEAVY_CATEGORIES:
            mode = EngineMode.HEAVY
        elif analyzer.is_simple and category in TaskClassifier.LIGHT_CATEGORIES:
            mode = EngineMode.LIGHT
        elif category in TaskClassifier.LIGHT_CATEGORIES:
            mode = EngineMode.LIGHT
        elif complexity >= self.HEAVY_THRESHOLD:
            mode = EngineMode.HEAVY
        else:
            mode = EngineMode.LIGHT

        if heavy_table.error_count >= self.MAX_CONSECUTIVE_ERRORS and mode == EngineMode.HEAVY:
            mode = EngineMode.LIGHT
            logger.warning("Heavy engine degraded to LIGHT due to consecutive errors")

        decision = RouterDecision(
            mode=mode,
            task_category=category,
            complexity_score=complexity,
            confidence=0.85 if abs(complexity - 0.5) > 0.2 else 0.6,
            reason=(
                f"Complexity={complexity:.2f}, Category={category.value}, "
                f"L_load={light_load_ratio:.1f}, H_load={heavy_load_ratio:.1f}"
            ),
        )

        with self._lock:
            self._decision_cache[cache_key] = (decision, time.time())
            if mode == EngineMode.LIGHT:
                self._stats["light_routes"] += 1
            else:
                self._stats["heavy_routes"] += 1
            self._stats["total_requests"] += 1
            self._routing_table[mode].total_routed += 1

        return decision

    def execute(self, prompt: str, **kwargs: Any) -> Any:
        """路由并执行"""
        decision = self.route(prompt, **kwargs)
        table = self._routing_table[decision.mode]
        table.current_load += 1

        try:
            start = time.time()
            if decision.mode == EngineMode.LIGHT and self._light_handler:
                result = self._light_handler(prompt)
            elif decision.mode == EngineMode.HEAVY and self._heavy_handler:
                result = self._heavy_handler(prompt)
            else:
                result = f"[{decision.mode.value}] No handler registered"
            elapsed = (time.time() - start) * 1000

            table.avg_latency_ms = (
                table.avg_latency_ms * 0.9 + elapsed * 0.1
            )
            table.error_count = 0
            return result
        except Exception as e:
            table.error_count += 1
            self._stats["total_errors"] += 1
            logger.error(f"Engine {decision.mode.value} error: {e}")
            if self._light_handler and decision.mode == EngineMode.HEAVY:
                logger.warning("Falling back to LIGHT engine")
                return self._light_handler(prompt)
            raise
        finally:
            table.current_load = max(0, table.current_load - 1)

    def reset_errors(self) -> None:
        for table in self._routing_table.values():
            table.error_count = 0

    @property
    def stats(self) -> dict[str, Any]:
        return {
            **self._stats,
            "light_latency_ms": round(self._routing_table[EngineMode.LIGHT].avg_latency_ms, 2),
            "heavy_latency_ms": round(self._routing_table[EngineMode.HEAVY].avg_latency_ms, 2),
            "light_load": self._routing_table[EngineMode.LIGHT].current_load,
            "heavy_load": self._routing_table[EngineMode.HEAVY].current_load,
            "light_errors": self._routing_table[EngineMode.LIGHT].error_count,
            "heavy_errors": self._routing_table[EngineMode.HEAVY].error_count,
            "cache_size": len(self._decision_cache),
        }
