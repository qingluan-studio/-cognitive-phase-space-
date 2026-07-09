"""事后复盘器 — 从成功和失败中提取可复用原则。

任务结束后生成事后分析报告，提炼策略经验，结构化存入知识库。
"""

import uuid
import time
import threading
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class LessonType(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    INSIGHT = "insight"
    WARNING = "warning"
    PATTERN = "pattern"


class StrategyQuality(Enum):
    EFFECTIVE = "effective"
    INEFFECTIVE = "ineffective"
    UNCERTAIN = "uncertain"


@dataclass
class ExecutionTrace:
    """执行轨迹 — 复盘分析的输入。"""

    session_id: str = ""
    goal: str = ""
    status: str = ""
    tasks: list[dict[str, Any]] = field(default_factory=list)
    review: Optional[dict] = None
    synthesis: Optional[str] = None
    duration_seconds: float = 0.0
    error_messages: list[str] = field(default_factory=list)
    consensus_rounds: int = 0
    agent_count: int = 0


@dataclass
class Lesson:
    """经验教训 — 从复盘提取的可复用原则。"""

    lesson_id: str = ""
    lesson_type: LessonType = LessonType.INSIGHT
    content: str = ""
    quality: StrategyQuality = StrategyQuality.UNCERTAIN
    confidence: float = 0.5
    tags: list[str] = field(default_factory=list)
    source_session: str = ""
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "lesson_id": self.lesson_id,
            "type": self.lesson_type.value,
            "content": self.content,
            "quality": self.quality.value,
            "confidence": self.confidence,
            "tags": self.tags,
            "source_session": self.source_session,
        }


@dataclass
class PostMortemReport:
    """事后分析报告。"""

    report_id: str = ""
    session_id: str = ""
    summary: str = ""
    lessons: list[Lesson] = field(default_factory=list)
    effective_strategies: list[str] = field(default_factory=list)
    ineffective_strategies: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
    risk_alerts: list[str] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "report_id": self.report_id,
            "session_id": self.session_id,
            "summary": self.summary,
            "lessons_count": len(self.lessons),
            "effective_strategies": self.effective_strategies,
            "ineffective_strategies": self.ineffective_strategies,
            "recommendations": self.recommendations,
            "risk_alerts": self.risk_alerts,
            "metrics": self.metrics,
        }


class PostMortemAgent:
    """事后复盘代理 — 接收执行轨迹，产出结构化的经验报告。

    使用方式:
        pm = PostMortemAgent()
        trace = ExecutionTrace(goal="...", tasks=[...], status="success")
        report = pm.analyze(trace)
        for lesson in report.lessons:
            print(f"[{lesson.lesson_type.value}] {lesson.content}")
    """

    def __init__(self) -> None:
        self._reports: list[PostMortemReport] = []
        self._lessons: list[Lesson] = []
        self._lock = threading.RLock()

    @property
    def report_count(self) -> int:
        with self._lock:
            return len(self._reports)

    @property
    def lesson_count(self) -> int:
        with self._lock:
            return len(self._lessons)

    def analyze(self, trace: ExecutionTrace) -> PostMortemReport:
        """分析执行轨迹，生成复盘报告。"""
        report = PostMortemReport(
            report_id=str(uuid.uuid4())[:8],
            session_id=trace.session_id,
        )

        if trace.status == "success":
            report.summary = f"目标 '{trace.goal}' 成功完成，耗时 {trace.duration_seconds:.1f}s"
            report.effective_strategies = self._extract_effective_strategies(trace)
        else:
            report.summary = f"目标 '{trace.goal}' 执行失败"
            report.ineffective_strategies = self._extract_ineffective_strategies(trace)

        report.lessons = self._extract_lessons(trace)
        report.recommendations = self._generate_recommendations(trace, report.lessons)
        report.risk_alerts = self._identify_risks(trace)
        report.metrics = {
            "tasks_completed": sum(1 for t in trace.tasks
                                   if t.get("status") in ("COMPLETED", "completed")),
            "tasks_failed": sum(1 for t in trace.tasks
                                if t.get("status") in ("FAILED", "failed")),
            "tasks_total": len(trace.tasks),
            "consensus_rounds": trace.consensus_rounds,
            "error_count": len(trace.error_messages),
        }

        with self._lock:
            self._reports.append(report)
            self._lessons.extend(report.lessons)

        return report

    def _extract_effective_strategies(self, trace: ExecutionTrace) -> list[str]:
        strategies = []
        if trace.consensus_rounds <= 2 and trace.consensus_rounds > 0:
            strategies.append(
                f"低共识轮数({trace.consensus_rounds})避免了单点幻觉")
        if trace.agent_count >= 3:
            strategies.append(f"多智能体协作({trace.agent_count}个)提升结果鲁棒性")
        if trace.duration_seconds < 120 and trace.status == "success":
            strategies.append("快速响应策略有效")
        if all(t.get("status") in ("COMPLETED", "completed")
               for t in trace.tasks) and len(trace.tasks) >= 3:
            strategies.append("顺序任务链分解策略有效")
        return strategies

    def _extract_ineffective_strategies(self, trace: ExecutionTrace) -> list[str]:
        strategies = []
        if trace.consensus_rounds > 3:
            strategies.append(f"共识轮数过多({trace.consensus_rounds})，可能存在僵局")
        if trace.agent_count < 2:
            strategies.append("单一智能体缺乏交叉验证")
        if any(t.get("status") in ("FAILED", "failed") for t in trace.tasks):
            strategies.append("部分任务失败，需检查任务分配或能力匹配")
        return strategies

    def _extract_lessons(self, trace: ExecutionTrace) -> list[Lesson]:
        lessons: list[Lesson] = []

        completed = sum(1 for t in trace.tasks
                        if t.get("status") in ("COMPLETED", "completed"))
        total = len(trace.tasks)
        if total > 0:
            completion_rate = completed / total
            if completion_rate == 1.0 and total >= 3:
                lessons.append(Lesson(
                    lesson_id=str(uuid.uuid4())[:8],
                    lesson_type=LessonType.SUCCESS,
                    content=f"全部 {total} 个任务全部完成，任务分解粒度合适",
                    quality=StrategyQuality.EFFECTIVE,
                    confidence=0.9,
                    tags=["task_decomposition", "granularity"],
                    source_session=trace.session_id,
                ))
            elif completion_rate < 0.5 and total > 0:
                lessons.append(Lesson(
                    lesson_id=str(uuid.uuid4())[:8],
                    lesson_type=LessonType.FAILURE,
                    content=f"完成率仅 {completion_rate:.0%}，需重新评估任务分解粒度或能力分配",
                    quality=StrategyQuality.INEFFECTIVE,
                    confidence=0.85,
                    tags=["task_decomposition", "failure"],
                    source_session=trace.session_id,
                ))

        if trace.consensus_rounds <= 2 and trace.consensus_rounds > 0:
            lessons.append(Lesson(
                lesson_id=str(uuid.uuid4())[:8],
                lesson_type=LessonType.PATTERN,
                content="低共识轮数 + 高一致性 = 高效决策",
                quality=StrategyQuality.EFFECTIVE,
                confidence=0.8,
                tags=["consensus", "efficiency"],
                source_session=trace.session_id,
            ))

        if trace.error_messages:
            lessons.append(Lesson(
                lesson_id=str(uuid.uuid4())[:8],
                lesson_type=LessonType.WARNING,
                content=f"发现 {len(trace.error_messages)} 个错误: {'; '.join(trace.error_messages[:3])}",
                quality=StrategyQuality.INEFFECTIVE,
                confidence=0.9,
                tags=["error", "debug"],
                source_session=trace.session_id,
            ))

        return lessons

    def _generate_recommendations(
        self, trace: ExecutionTrace, lessons: list[Lesson]
    ) -> list[str]:
        recs = []
        completion = sum(1 for t in trace.tasks
                         if t.get("status") in ("COMPLETED", "completed"))
        total = len(trace.tasks)
        if total > 0 and completion / total < 1.0:
            recs.append("考虑增加重试逻辑或降低任务复杂度阈值")
        if trace.consensus_rounds > 2:
            recs.append("共识陷入多轮僵局时触发降级策略（如启用 WEIGHTED 模式）")
        if trace.duration_seconds > 300:
            recs.append("执行时间过长，考虑启用并行执行或超时控制")
        if trace.error_messages:
            recs.append("错误率过高，建议启用沙箱隔离或增加前置校验")
        if not recs:
            recs.append("当前策略有效，可考虑将成功模式注册为模板复用")
        return recs

    def _identify_risks(self, trace: ExecutionTrace) -> list[str]:
        risks = []
        if trace.agent_count > 10:
            risks.append(f"智能体数量({trace.agent_count})过多，协调开销可能线性增长")
        if trace.consensus_rounds == 0 and trace.status == "success":
            risks.append("无共识审查可能导致幻觉未被检测")
        if trace.duration_seconds > 600:
            risks.append("长时间执行可能导致上下文窗口溢出")
        return risks

    def query_lessons(
        self,
        lesson_type: Optional[LessonType] = None,
        tags: Optional[list[str]] = None,
        min_confidence: float = 0.0,
        limit: int = 20,
    ) -> list[Lesson]:
        with self._lock:
            results = self._lessons[:]
            if lesson_type:
                results = [l for l in results if l.lesson_type == lesson_type]
            if tags:
                results = [l for l in results if any(t in l.tags for t in tags)]
            if min_confidence > 0:
                results = [l for l in results if l.confidence >= min_confidence]
            return results[-limit:]

    def stats(self) -> dict[str, Any]:
        with self._lock:
            by_type: dict[str, int] = {}
            for l in self._lessons:
                t = l.lesson_type.value
                by_type[t] = by_type.get(t, 0) + 1
            return {
                "total_reports": len(self._reports),
                "total_lessons": len(self._lessons),
                "by_type": by_type,
            }

    def reset(self) -> None:
        with self._lock:
            self._reports.clear()
            self._lessons.clear()
