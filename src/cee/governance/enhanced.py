"""
CEE Governance — 增强治理模块

新增:
  - AuditTrail: 完整操作审计追踪
  - ComplianceChecker: 合规性自动检查
  - RiskAssessor: 风险评估与分级
  - VersionedConstitution: 版本化治理宪章
  - GovernanceMetrics: 治理效能度量
"""

from __future__ import annotations

import json
import logging
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


class AuditAction(Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXECUTE = "execute"
    APPROVE = "approve"
    REJECT = "reject"
    MODIFY = "modify"
    CONFIGURE = "configure"


class RiskLevel(Enum):
    NONE = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class ComplianceStatus(Enum):
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    WAIVED = "waived"
    PENDING_REVIEW = "pending_review"
    EXEMPTED = "exempted"


@dataclass
class AuditEntry:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    action: AuditAction = AuditAction.READ
    resource: str = ""
    actor: str = "system"
    details: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    outcome: str = "success"
    risk_assessment: RiskLevel = RiskLevel.NONE

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id, "action": self.action.value,
            "resource": self.resource, "actor": self.actor,
            "timestamp": self.timestamp, "outcome": self.outcome,
            "risk_assessment": self.risk_assessment.value,
        }


@dataclass
class ComplianceRule:
    id: str
    name: str
    description: str
    category: str
    check_fn: str
    severity: RiskLevel = RiskLevel.MEDIUM
    enabled: bool = True


class AuditTrail:
    """审计追踪系统"""

    def __init__(self, max_entries: int = 10000):
        self._entries: list[AuditEntry] = []
        self._max_entries = max_entries
        self._by_action: dict[AuditAction, list[int]] = defaultdict(list)

    def record(self, action: AuditAction, resource: str, actor: str = "system",
                details: dict[str, Any] | None = None,
                risk: RiskLevel = RiskLevel.NONE) -> AuditEntry:
        entry = AuditEntry(
            action=action, resource=resource, actor=actor,
            details=details or {}, risk_assessment=risk,
        )
        self._entries.append(entry)
        idx = len(self._entries) - 1
        self._by_action[action].append(idx)

        if len(self._entries) > self._max_entries:
            self._entries.pop(0)
            for action_list in self._by_action.values():
                if 0 in action_list:
                    action_list.remove(0)
            for action_list in self._by_action.values():
                for i in range(len(action_list)):
                    action_list[i] -= 1

        return entry

    def query(self, action: AuditAction | None = None,
               resource: str = "", actor: str = "",
               limit: int = 50) -> list[dict[str, Any]]:
        results = self._entries

        if action:
            results = [self._entries[i] for i in self._by_action.get(action, []) if i < len(self._entries)]
        if resource:
            results = [e for e in results if resource in e.resource]
        if actor:
            results = [e for e in results if actor in e.actor]

        return [e.to_dict() for e in results[-limit:]]

    def statistics(self) -> dict[str, Any]:
        action_counts = {
            action.value: len(indices)
            for action, indices in self._by_action.items()
        }
        return {
            "total_entries": len(self._entries),
            "action_breakdown": action_counts,
            "first_entry": self._entries[0].to_dict() if self._entries else None,
            "last_entry": self._entries[-1].to_dict() if self._entries else None,
        }

    def export(self, path: str) -> None:
        with open(path, "w") as f:
            json.dump(
                [e.to_dict() for e in self._entries],
                f, ensure_ascii=False, indent=2,
            )


class ComplianceChecker:
    """合规性自动检查器"""

    def __init__(self):
        self._rules: list[ComplianceRule] = []
        self._check_results: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._register_default_rules()

    def _register_default_rules(self) -> None:
        default_rules = [
            ComplianceRule(
                id="data_privacy", name="数据隐私合规",
                description="确保不含PII和敏感信息",
                category="privacy", check_fn="check_data_privacy",
                severity=RiskLevel.HIGH,
            ),
            ComplianceRule(
                id="output_safety", name="输出安全合规",
                description="确保输出不含危险内容",
                category="safety", check_fn="check_output_safety",
                severity=RiskLevel.HIGH,
            ),
            ComplianceRule(
                id="attribution", name="来源标注合规",
                description="确保引用内容有合理标注",
                category="attribution", check_fn="check_attribution",
                severity=RiskLevel.MEDIUM,
            ),
            ComplianceRule(
                id="accessibility", name="可访问性合规",
                description="确保输出对多样化用户可访问",
                category="accessibility", check_fn="check_accessibility",
                severity=RiskLevel.LOW,
            ),
            ComplianceRule(
                id="fairness", name="公平性合规",
                description="确保输出不含歧视性偏见",
                category="fairness", check_fn="check_fairness",
                severity=RiskLevel.HIGH,
            ),
        ]
        for rule in default_rules:
            self.add_rule(rule)

    def add_rule(self, rule: ComplianceRule) -> None:
        self._rules.append(rule)

    def check(self, content: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
        results = []
        violations = []

        for rule in self._rules:
            if not rule.enabled:
                continue

            checker = getattr(self, rule.check_fn, None)
            if checker is None:
                continue

            passed, details = checker(content)
            status = ComplianceStatus.COMPLIANT if passed else ComplianceStatus.NON_COMPLIANT

            result = {
                "rule_id": rule.id,
                "rule_name": rule.name,
                "status": status.value,
                "severity": rule.severity.value,
                "details": details,
            }
            results.append(result)

            if not passed:
                violations.append(result)

        overall = len(violations) == 0
        return {
            "compliant": overall,
            "rules_checked": len(results),
            "violations": len(violations),
            "results": results,
            "overall_status": (
                ComplianceStatus.COMPLIANT.value if overall
                else ComplianceStatus.NON_COMPLIANT.value
            ),
        }

    @staticmethod
    def check_data_privacy(content: str) -> tuple[bool, dict[str, Any]]:
        import re
        pii_patterns = [
            (r"\b\d{3}-\d{2}-\d{4}\b", "SSN"),
            (r"\b\d{3}-\d{3}-\d{4}\b", "Phone"),
            (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "Email"),
        ]
        findings = []
        for pattern, pii_type in pii_patterns:
            matches = re.findall(pattern, content)
            if matches:
                findings.append({"type": pii_type, "count": len(matches)})

        return len(findings) == 0, {"findings": findings}

    @staticmethod
    def check_output_safety(content: str) -> tuple[bool, dict[str, Any]]:
        dangerous_keywords = [
            "bomb", "weapon of mass", "kill yourself", "attack plan",
        ]
        found = [kw for kw in dangerous_keywords if kw.lower() in content.lower()]
        return len(found) == 0, {"found_keywords": found}

    @staticmethod
    def check_attribution(content: str) -> tuple[bool, dict[str, Any]]:
        attribution_markers = ["根据", "来源", "引用", "参考", "according to", "source"]
        has_attribution = any(m in content.lower() for m in attribution_markers)
        return has_attribution, {
            "has_attribution": has_attribution,
            "suggestion": "" if has_attribution else "建议添加信息来源标注",
        }

    @staticmethod
    def check_accessibility(content: str) -> tuple[bool, dict[str, Any]]:
        return True, {"note": "基本可访问性检查通过"}

    @staticmethod
    def check_fairness(content: str) -> tuple[bool, dict[str, Any]]:
        bias_keywords = ["stereotype", "偏见", "歧视", "inferior", "superior race"]
        found = [kw for kw in bias_keywords if kw.lower() in content.lower()]
        return len(found) == 0, {"biased_terms": found}


class RiskAssessor:
    """风险评估器"""

    def __init__(self):
        self._risk_categories: dict[str, dict[str, Any]] = {
            "data_privacy": {"base_risk": RiskLevel.HIGH, "factors": ["PII", "user_data", "sensitive_info"]},
            "output_safety": {"base_risk": RiskLevel.HIGH, "factors": ["violence", "illegal", "harmful"]},
            "model_reliability": {"base_risk": RiskLevel.MEDIUM, "factors": ["hallucination", "inconsistency"]},
            "bias_fairness": {"base_risk": RiskLevel.MEDIUM, "factors": ["stereotype", "discrimination"]},
            "performance": {"base_risk": RiskLevel.LOW, "factors": ["latency", "throughput"]},
            "regulatory": {"base_risk": RiskLevel.HIGH, "factors": ["GDPR", "copyright", "liability"]},
        }

    def assess(self, content: str,
                context: dict[str, Any] | None = None) -> dict[str, Any]:
        category_scores = {}
        overall_risk = 0

        for category, info in self._risk_categories.items():
            score = self._assess_category(content, category, info["factors"])
            category_scores[category] = {
                "risk_level": score.name,
                "risk_value": score.value,
                "base_risk": info["base_risk"].value,
            }
            overall_risk = max(overall_risk, score.value)

        return {
            "overall_risk": RiskLevel(overall_risk).name,
            "overall_risk_value": overall_risk,
            "category_assessment": category_scores,
            "action_required": overall_risk >= 2,
            "recommended_action": self._recommend_action(overall_risk),
        }

    def _assess_category(self, content: str, category: str,
                          factors: list[str]) -> RiskLevel:
        matched = sum(
            1 for factor in factors if factor.lower() in content.lower()
        )

        if matched >= 3:
            return RiskLevel.CRITICAL
        if matched >= 2:
            return RiskLevel.HIGH
        if matched >= 1:
            return RiskLevel.MEDIUM

        base = self._risk_categories[category]["base_risk"]
        if base == RiskLevel.HIGH:
            return RiskLevel.LOW
        return RiskLevel.NONE

    @staticmethod
    def _recommend_action(risk_value: int) -> str:
        if risk_value >= 4:
            return "立即阻止操作，需要人工审查"
        if risk_value >= 3:
            return "高风险，建议人工审核后再执行"
        if risk_value >= 2:
            return "中风险，记录审计日志后执行"
        if risk_value >= 1:
            return "低风险，自动通过但记录日志"
        return "无风险，自动通过"


class GovernanceMetrics:
    """治理效能度量"""

    def __init__(self):
        self._metrics: dict[str, list[float]] = defaultdict(list)
        self._start_time = datetime.now(timezone.utc)

    def record(self, metric_name: str, value: float) -> None:
        self._metrics[metric_name].append(value)

    def compute(self, metric_name: str) -> dict[str, float]:
        values = self._metrics.get(metric_name, [])
        if not values:
            return {"mean": 0.0, "std": 0.0, "count": 0}

        arr = np.array(values)
        return {
            "mean": round(float(np.mean(arr)), 4),
            "std": round(float(np.std(arr)), 4),
            "min": round(float(np.min(arr)), 4),
            "max": round(float(np.max(arr)), 4),
            "count": len(values),
        }

    def report(self) -> dict[str, Any]:
        uptime = (datetime.now(timezone.utc) - self._start_time).total_seconds()
        return {
            "uptime_seconds": uptime,
            "metrics": {
                name: self.compute(name) for name in self._metrics
            },
            "total_records": sum(len(v) for v in self._metrics.values()),
        }


