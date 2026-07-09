"""决策轨迹日志 — 所有决策关键点注入结构化元数据。

让每个最终结论都能回溯到源头的推理链。
"""

import copy
import json
import os
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class DecisionType(Enum):
    TASK_DECOMPOSITION = "task_decomposition"
    CONSENSUS_SELECTION = "consensus_selection"
    AGENT_ASSIGNMENT = "agent_assignment"
    STRATEGY_CHOICE = "strategy_choice"
    PARAMETER_SELECTION = "parameter_selection"
    ROUTE_SELECTION = "route_selection"
    APPROVAL_DECISION = "approval_decision"
    RESULT_EVALUATION = "result_evaluation"


class DecisionMethod(Enum):
    MAJORITY = "majority"
    WEIGHTED = "weighted"
    HEURISTIC = "heuristic"
    ML_MODEL = "ml_model"
    RULE_BASED = "rule_based"
    HUMAN = "human"
    RANDOM = "random"
    ORCHESTRATOR = "orchestrator"


@dataclass
class DecisionContext:
    """决策时的上下文快照。"""

    session_id: str = ""
    task_id: str = ""
    agent_id: str = ""
    goal: str = ""
    phase: str = ""


@dataclass
class DecisionEvidence:
    """支持决策的证据片段。"""

    source: str
    content: str
    relevance: float = 1.0
    type: str = "fact"


@dataclass
class DecisionAlternatives:
    """决策时的备选方案。"""

    options: list[dict[str, Any]]
    scores: list[float] = field(default_factory=list)
    rationale: list[str] = field(default_factory=list)


@dataclass
class DecisionPoint:
    """单次决策的完整元数据。"""

    decision_id: str
    decision_type: DecisionType
    method: DecisionMethod
    timestamp: float = field(default_factory=time.time)
    context: DecisionContext = field(default_factory=DecisionContext)
    question: str = ""
    alternatives: DecisionAlternatives = field(default_factory=lambda: DecisionAlternatives(options=[]))
    chosen: Any = None
    confidence: float = 0.0
    evidence: list[DecisionEvidence] = field(default_factory=list)
    reasoning: str = ""
    outcome: Optional[Any] = None
    parent_decision_id: str = ""
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "decision_id": self.decision_id,
            "decision_type": self.decision_type.value,
            "method": self.method.value,
            "timestamp": self.timestamp,
            "context": {
                "session_id": self.context.session_id,
                "task_id": self.context.task_id,
                "agent_id": self.context.agent_id,
                "goal": self.context.goal,
                "phase": self.context.phase,
            },
            "question": self.question,
            "alternatives": self.alternatives.options,
            "chosen": self.chosen,
            "confidence": self.confidence,
            "evidence_count": len(self.evidence),
            "reasoning": self.reasoning,
            "outcome": self.outcome,
            "parent_decision_id": self.parent_decision_id,
            "tags": self.tags,
        }


class TraceLog:
    """结构化决策轨迹日志。

    记录所有关键决策点，支持追溯查询：
        tracelog = TraceLog()
        tracelog.record(decision_type, method, question=..., chosen=..., reasoning=...)
        chain = tracelog.trace(decision_id)
    """

    def __init__(self, storage_path: str = "") -> None:
        self._decisions: list[DecisionPoint] = []
        self._index: dict[str, int] = {}
        self._lock = threading.RLock()
        self._id_counter = 0
        self._storage_path = storage_path

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._decisions)

    def _next_id(self) -> str:
        with self._lock:
            self._id_counter += 1
            return f"dp-{int(time.time() * 1000)}-{self._id_counter:06d}"

    def record(
        self,
        decision_type: DecisionType,
        method: DecisionMethod = DecisionMethod.ORCHESTRATOR,
        context: Optional[DecisionContext] = None,
        question: str = "",
        alternatives: Optional[DecisionAlternatives] = None,
        chosen: Any = None,
        confidence: float = 0.0,
        evidence: Optional[list[DecisionEvidence]] = None,
        reasoning: str = "",
        parent_decision_id: str = "",
        tags: Optional[list[str]] = None,
    ) -> DecisionPoint:
        dp = DecisionPoint(
            decision_id=self._next_id(),
            decision_type=decision_type,
            method=method,
            context=context or DecisionContext(),
            question=question,
            alternatives=alternatives or DecisionAlternatives(options=[]),
            chosen=chosen,
            confidence=confidence,
            evidence=evidence or [],
            reasoning=reasoning,
            parent_decision_id=parent_decision_id,
            tags=tags or [],
        )
        with self._lock:
            self._decisions.append(dp)
            self._index[dp.decision_id] = len(self._decisions) - 1
        self._flush()
        return dp

    def get(self, decision_id: str) -> Optional[DecisionPoint]:
        with self._lock:
            idx = self._index.get(decision_id)
            if idx is not None:
                return self._decisions[idx]
        return None

    def trace(self, decision_id: str) -> list[DecisionPoint]:
        """从起始决策反向追踪到当前决策。"""
        chain: list[DecisionPoint] = []
        current = self.get(decision_id)
        visited: set[str] = set()
        while current:
            if current.decision_id in visited:
                break
            visited.add(current.decision_id)
            chain.append(current)
            if current.parent_decision_id:
                current = self.get(current.parent_decision_id)
            else:
                break
        chain.reverse()
        return chain

    def trace_to_root(self, decision_id: str) -> list[DecisionPoint]:
        """从当前决策追踪到根决策（递归向上）。"""
        root_chain = self.trace(decision_id)
        return root_chain

    def query(
        self,
        decision_type: Optional[DecisionType] = None,
        session_id: str = "",
        task_id: str = "",
        tags: Optional[list[str]] = None,
        min_confidence: float = 0.0,
        limit: int = 50,
    ) -> list[DecisionPoint]:
        with self._lock:
            results = self._decisions[:]
            if decision_type:
                results = [d for d in results if d.decision_type == decision_type]
            if session_id:
                results = [d for d in results if d.context.session_id == session_id]
            if task_id:
                results = [d for d in results if d.context.task_id == task_id]
            if tags:
                results = [d for d in results if any(t in d.tags for t in tags)]
            if min_confidence > 0:
                results = [d for d in results if d.confidence >= min_confidence]
            return results[-limit:]

    def get_reasoning_chain(
        self, decision_id: str
    ) -> list[dict[str, Any]]:
        chain = self.trace(decision_id)
        return [
            {
                "step": i + 1,
                "decision_id": d.decision_id,
                "type": d.decision_type.value,
                "question": d.question,
                "chosen": d.chosen,
                "reasoning": d.reasoning,
            }
            for i, d in enumerate(chain)
        ]

    def export(self) -> list[dict[str, Any]]:
        with self._lock:
            return [d.to_dict() for d in self._decisions]

    def stats(self) -> dict[str, Any]:
        with self._lock:
            type_counts: dict[str, int] = {}
            for d in self._decisions:
                t = d.decision_type.value
                type_counts[t] = type_counts.get(t, 0) + 1
            avg_confidence = (
                sum(d.confidence for d in self._decisions) / max(len(self._decisions), 1)
            )
            return {
                "total_decisions": len(self._decisions),
                "by_type": type_counts,
                "avg_confidence": round(avg_confidence, 4),
            }

    def clear(self) -> None:
        with self._lock:
            self._decisions.clear()
            self._index.clear()

    def _flush(self) -> None:
        if not self._storage_path:
            return
        try:
            os.makedirs(os.path.dirname(self._storage_path), exist_ok=True)
            with open(self._storage_path, "w") as f:
                json.dump(self.export(), f, ensure_ascii=False, indent=2, default=str)
        except (OSError, IOError):
            pass
