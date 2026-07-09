"""元认知路由器 — 根据意图自动选择工作流模板。

在 task_decomposer 前插入路由层：
- 轻量意图分类（关键词 + 启发式）
- 预定义 DAG 骨架模板
- 低开销，高用户体验提升
"""

import re
import threading
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class WorkflowCategory(Enum):
    """工作流类型 — 每种对应一套预定义 DAG 骨架。"""

    CODE_GENERATION = "code_generation"
    CODE_REVIEW = "code_review"
    DATA_ANALYSIS = "data_analysis"
    DOCUMENT_WRITING = "document_writing"
    RESEARCH = "research"
    DEVOPS = "devops"
    TRANSLATION = "translation"
    CREATIVE_WRITING = "creative_writing"
    Q_A = "q_a"
    GENERAL = "general"
    DEBATE = "debate"
    SELF_IMPROVEMENT = "self_improvement"


@dataclass
class WorkflowTemplate:
    """工作流模板 — 预定义 Agent 角色序列和 DAG。"""

    name: str
    category: WorkflowCategory
    roles: list[str]
    phases: list[str]
    description: str = ""
    dag: dict[str, list[str]] = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "category": self.category.value,
            "roles": self.roles,
            "phases": self.phases,
            "description": self.description,
            "dag": self.dag,
            "tags": self.tags,
        }


@dataclass
class RouteResult:
    """路由结果。"""

    category: WorkflowCategory
    template: WorkflowTemplate
    confidence: float
    matched_keywords: list[str] = field(default_factory=list)
    reasoning: str = ""


DEFAULT_TEMPLATES: dict[WorkflowCategory, WorkflowTemplate] = {
    WorkflowCategory.CODE_GENERATION: WorkflowTemplate(
        name="Code Generation Pipeline",
        category=WorkflowCategory.CODE_GENERATION,
        roles=["researcher", "architect", "coder", "reviewer", "synthesizer"],
        phases=["research requirements", "design architecture",
                "implement code", "review code", "synthesize documentation"],
        description="完整代码生成流水线：研究→设计→编码→审查→综合",
    ),
    WorkflowCategory.CODE_REVIEW: WorkflowTemplate(
        name="Code Review Pipeline",
        category=WorkflowCategory.CODE_REVIEW,
        roles=["reviewer", "critic", "synthesizer"],
        phases=["review code", "critique findings", "synthesize report"],
        description="专注代码审查：审查→质疑→综合报告",
    ),
    WorkflowCategory.DATA_ANALYSIS: WorkflowTemplate(
        name="Data Analysis Pipeline",
        category=WorkflowCategory.DATA_ANALYSIS,
        roles=["data_analyst", "researcher", "synthesizer"],
        phases=["process data", "analyze patterns", "synthesize insights"],
        description="数据分析流水线：处理→分析→洞察综合",
    ),
    WorkflowCategory.DOCUMENT_WRITING: WorkflowTemplate(
        name="Document Writing Pipeline",
        category=WorkflowCategory.DOCUMENT_WRITING,
        roles=["researcher", "writer", "reviewer", "synthesizer"],
        phases=["research topic", "draft document", "review draft", "finalize"],
        description="文档撰写流水线：研究→起草→审查→定稿",
    ),
    WorkflowCategory.RESEARCH: WorkflowTemplate(
        name="Research Pipeline",
        category=WorkflowCategory.RESEARCH,
        roles=["researcher", "data_analyst", "synthesizer", "critic"],
        phases=["gather information", "analyze data",
                "synthesize findings", "critique conclusions"],
        description="深度研究流水线：收集→分析→综合→质疑",
    ),
    WorkflowCategory.DEVOPS: WorkflowTemplate(
        name="DevOps Pipeline",
        category=WorkflowCategory.DEVOPS,
        roles=["architect", "devops", "tester", "reviewer"],
        phases=["assess infrastructure", "configure deployment",
                "run tests", "verify deployment"],
        description="DevOps 部署流水线：评估→配置→测试→验证",
    ),
    WorkflowCategory.TRANSLATION: WorkflowTemplate(
        name="Translation Pipeline",
        category=WorkflowCategory.TRANSLATION,
        roles=["translator", "reviewer", "synthesizer"],
        phases=["translate", "review translation", "finalize"],
        description="翻译流水线：翻译→审校→定稿",
    ),
    WorkflowCategory.CREATIVE_WRITING: WorkflowTemplate(
        name="Creative Writing Pipeline",
        category=WorkflowCategory.CREATIVE_WRITING,
        roles=["writer", "critic", "synthesizer"],
        phases=["draft creative", "critique", "polish"],
        description="创意写作流水线：起草→批评→润色",
    ),
    WorkflowCategory.DEBATE: WorkflowTemplate(
        name="Debate Pipeline",
        category=WorkflowCategory.DEBATE,
        roles=["researcher", "critic", "critic", "synthesizer"],
        phases=["research positions", "debate pro vs con",
                "evaluate arguments", "synthesize resolution"],
        description="辩论流水线：研究立场→正反辩论→评估→决议",
    ),
    WorkflowCategory.SELF_IMPROVEMENT: WorkflowTemplate(
        name="Self-Improvement Pipeline",
        category=WorkflowCategory.SELF_IMPROVEMENT,
        roles=["critic", "architect", "synthesizer"],
        phases=["analyze performance", "identify improvements",
                "synthesize strategy"],
        description="自我改进流水线：分析性能→识别改进→综合策略",
    ),
    WorkflowCategory.GENERAL: WorkflowTemplate(
        name="General Pipeline",
        category=WorkflowCategory.GENERAL,
        roles=["researcher", "architect", "synthesizer"],
        phases=["analyze goal", "design approach", "synthesize result"],
        description="通用流水线：分析→设计→综合",
    ),
    WorkflowCategory.Q_A: WorkflowTemplate(
        name="Q&A Pipeline",
        category=WorkflowCategory.Q_A,
        roles=["researcher", "synthesizer"],
        phases=["research answer", "synthesize response"],
        description="问答流水线：研究→综合回答",
    ),
}

KEYWORD_MAP: list[tuple[re.Pattern, WorkflowCategory, float]] = [
    (re.compile(r"(写|生成|开发|编写|implement|generate|create).*(代码|程序|函数|类|模块|API|接口|code|function|class|module|api)", re.I),
     WorkflowCategory.CODE_GENERATION, 0.9),
    (re.compile(r"(审查|review|代码审查|code review|检查.*代码)", re.I),
     WorkflowCategory.CODE_REVIEW, 0.9),
    (re.compile(r"(分析|analyze|analysis).*(数据|data|统计|statistics|图表|chart|指标|metric)", re.I),
     WorkflowCategory.DATA_ANALYSIS, 0.85),
    (re.compile(r"(写|撰写|编写|起草|draft|write|create).*(文档|报告|文章|白皮书|readme|doc|paper|report|article)", re.I),
     WorkflowCategory.DOCUMENT_WRITING, 0.85),
    (re.compile(r"(研究|research|调研|调查|investigate|study).*(课题|主题|话题|方向|领域)", re.I),
     WorkflowCategory.RESEARCH, 0.85),
    (re.compile(r"(部署|deploy|发布|release|上线|运维|基础设施|infra|docker|k8s|kubernetes|CI|CD)", re.I),
     WorkflowCategory.DEVOPS, 0.85),
    (re.compile(r"(翻译|translate|翻译成|译为|translation)", re.I),
     WorkflowCategory.TRANSLATION, 0.9),
    (re.compile(r"(创作|写.*故事|写.*诗歌|虚构|creative|小说|故事|诗歌|文案)", re.I),
     WorkflowCategory.CREATIVE_WRITING, 0.85),
    (re.compile(r"(辩论|debate|正方|反方|争论|辩题)", re.I),
     WorkflowCategory.DEBATE, 0.9),
    (re.compile(r"(自我改进|自我优化|提升|improve|optimize|性能优化|调优|refactor|重构)", re.I),
     WorkflowCategory.SELF_IMPROVEMENT, 0.8),
    (re.compile(r"^(什么是|解释|如何|怎么|为什么|what\b|how\b|why\b|explain)", re.I),
     WorkflowCategory.Q_A, 0.75),
]


class MetaRouter:
    """元认知路由器 — 意图分类 → 工作流模板。

    使用方式:
        router = MetaRouter()
        result = router.route("写一个 Python 排序算法")
        print(result.template.name)  # "Code Generation Pipeline"
        print(result.template.roles)  # ["researcher", "architect", ...]
    """

    def __init__(self, templates: Optional[dict[WorkflowCategory, WorkflowTemplate]] = None) -> None:
        self._templates = templates or dict(DEFAULT_TEMPLATES)
        self._route_log: list[RouteResult] = []
        self._lock = threading.RLock()

    def register_template(self, template: WorkflowTemplate) -> None:
        with self._lock:
            self._templates[template.category] = template

    def get_template(self, category: WorkflowCategory) -> WorkflowTemplate:
        with self._lock:
            return self._templates.get(category, DEFAULT_TEMPLATES[WorkflowCategory.GENERAL])

    def route(self, intent: str) -> RouteResult:
        """路由：输入意图文本 → 输出最佳工作流模板。"""
        matched_keywords: list[str] = []
        best_category = WorkflowCategory.GENERAL
        best_confidence = 0.3

        for pattern, category, confidence in KEYWORD_MAP:
            if pattern.search(intent):
                matched_keywords.append(pattern.pattern)
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_category = category

        template = self._templates.get(best_category, self._templates[WorkflowCategory.GENERAL])

        result = RouteResult(
            category=best_category,
            template=template,
            confidence=best_confidence,
            matched_keywords=matched_keywords,
            reasoning=f"Matched {len(matched_keywords)} keyword patterns, "
                       f"highest confidence={best_confidence:.2f} → {best_category.value}",
        )
        with self._lock:
            self._route_log.append(result)
        return result

    def list_templates(self) -> list[dict]:
        with self._lock:
            return [t.to_dict() for t in self._templates.values()]

    def stats(self) -> dict[str, Any]:
        with self._lock:
            cat_counts: dict[str, int] = {}
            for r in self._route_log[-100:]:
                c = r.category.value
                cat_counts[c] = cat_counts.get(c, 0) + 1
            return {
                "total_routes": len(self._route_log),
                "templates_available": len(self._templates),
                "recent_route_distribution": cat_counts,
            }

    def reset(self) -> None:
        with self._lock:
            self._route_log.clear()
            self._templates = dict(DEFAULT_TEMPLATES)
