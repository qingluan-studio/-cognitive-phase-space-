"""
矛盾检测引擎。

提供文本矛盾检测能力，包括语义矛盾检测、事实一致性检查、
逻辑矛盾检测、时间线矛盾检测、数值矛盾检测等功能。
"""

import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime
from typing import Any, Optional

import numpy as np


class ContradictionType(Enum):
    SEMANTIC = "semantic"
    FACTUAL = "factual"
    LOGICAL = "logical"
    TEMPORAL = "temporal"
    NUMERICAL = "numerical"
    ENTITY = "entity"


class ContradictionSeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class ContradictionItem:
    type: ContradictionType = ContradictionType.SEMANTIC
    severity: ContradictionSeverity = ContradictionSeverity.MEDIUM
    statement_a: str = ""
    statement_b: str = ""
    description: str = ""
    evidence: list[str] = field(default_factory=list)
    resolution_hint: str = ""
    confidence: float = 0.0


@dataclass
class ContradictionReport:
    has_contradictions: bool = False
    items: list[ContradictionItem] = field(default_factory=list)
    overall_severity: ContradictionSeverity = ContradictionSeverity.LOW
    contradiction_count: int = 0
    resolved_count: int = 0
    unresolved_count: int = 0
    text_segments: list[str] = field(default_factory=list)
    summary: str = ""


@dataclass
class FactItem:
    subject: str = ""
    predicate: str = ""
    value: str = ""
    timestamp: str = ""
    source: str = ""
    confidence: float = 1.0


class ContradictionDetector:
    """文本矛盾检测引擎。"""

    _antonym_pairs = {
        ("是", "不是"), ("有", "没有"), ("能", "不能"),
        ("会", "不会"), ("可以", "不可以"), ("可能", "不可能"),
        ("存在", "不存在"), ("正确", "错误"), ("真", "假"),
        ("对", "错"), ("同意", "反对"), ("支持", "反对"),
        ("增加", "减少"), ("上升", "下降"), ("提高", "降低"),
        ("扩大", "缩小"), ("增长", "衰退"), ("进步", "退步"),
        ("快", "慢"), ("高", "低"), ("大", "小"),
        ("多", "少"), ("强", "弱"), ("好", "坏"),
        ("新", "旧"), ("前", "后"), ("左", "右"),
        ("上", "下"), ("里", "外"), ("开", "关"),
        ("热", "冷"), ("明", "暗"), ("轻", "重"),
        ("厚", "薄"), ("宽", "窄"), ("深", "浅"),
        ("远", "近"), ("长", "短"), ("早", "晚"),
        ("is", "is not"), ("can", "cannot"),
        ("true", "false"), ("yes", "no"),
        ("always", "never"), ("all", "none"),
        ("positive", "negative"), ("good", "bad"),
        ("increase", "decrease"), ("rise", "fall"),
    }

    _temporal_patterns = [
        (r"(\d{4})年(\d{1,2})月(\d{1,2})日", "date"),
        (r"(\d{4})-(\d{2})-(\d{2})", "date"),
        (r"(\d{4})年", "year"),
        (r"(\d{1,2})月(\d{1,2})日", "month_day"),
        (r"周([一二三四五六日])", "weekday"),
        (r"星期([一二三四五六日])", "weekday"),
    ]

    _contradiction_markers = {
        "但是", "然而", "不过", "可是", "却", "反而", "相反",
        "与此同时", "另一方面", "矛盾的是", "奇怪的是",
        "but", "however", "although", "yet", "while",
        "whereas", "nevertheless", "nonetheless",
        "on the contrary", "paradoxically",
    }

    def __init__(self, sensitivity: float = 0.5):
        self.sensitivity = sensitivity

    def detect(self, text: str, reference_text: str | None = None) -> ContradictionReport:
        report = ContradictionReport()

        segments = self._split_segments(text)
        report.text_segments = segments

        semantic_items = self._detect_semantic_contradictions(segments)
        factual_items = self._detect_factual_contradictions(segments)
        logical_items = self._detect_logical_contradictions(segments)
        temporal_items = self._detect_temporal_contradictions(segments)
        numerical_items = self._detect_numerical_contradictions(segments)

        all_items = semantic_items + factual_items + logical_items + temporal_items + numerical_items

        if reference_text:
            ref_contradictions = self._cross_check(text, reference_text)
            all_items.extend(ref_contradictions)

        all_items = self._filter_and_rank(all_items)

        if all_items:
            report.has_contradictions = True
            report.items = all_items
            report.contradiction_count = len(all_items)
            report.unresolved_count = sum(
                1 for item in all_items if not item.resolution_hint
            )
            report.resolved_count = report.contradiction_count - report.unresolved_count

            sevs = [item.severity for item in all_items]
            if ContradictionSeverity.CRITICAL in sevs:
                report.overall_severity = ContradictionSeverity.CRITICAL
            elif ContradictionSeverity.HIGH in sevs:
                report.overall_severity = ContradictionSeverity.HIGH
            elif ContradictionSeverity.MEDIUM in sevs:
                report.overall_severity = ContradictionSeverity.MEDIUM
            else:
                report.overall_severity = ContradictionSeverity.LOW

            report.summary = self._generate_summary(all_items)
        else:
            report.summary = "未检测到明显的文本矛盾"

        return report

    def _split_segments(self, text: str) -> list[str]:
        segments = []
        for segment in re.split(r"(?<=[。！？.!?\n])\s*", text):
            segment = segment.strip()
            if segment and len(segment) > 3:
                segments.append(segment)
        if not segments and text.strip():
            segments = [text.strip()]
        return segments

    def _detect_semantic_contradictions(self, segments: list[str]) -> list[ContradictionItem]:
        items = []

        for i in range(len(segments)):
            for j in range(i + 1, len(segments)):
                sent_a = segments[i]
                sent_b = segments[j]

                for ant1, ant2 in self._antonym_pairs:
                    if (ant1 in sent_a and ant2 in sent_b) or \
                       (ant2 in sent_a and ant1 in sent_b):
                        common_chars = set(re.findall(r"[\u4e00-\u9fff]+", sent_a)) & \
                                       set(re.findall(r"[\u4e00-\u9fff]+", sent_b))
                        if len(common_chars) >= 2:
                            items.append(ContradictionItem(
                                type=ContradictionType.SEMANTIC,
                                severity=ContradictionSeverity.MEDIUM,
                                statement_a=sent_a[:80],
                                statement_b=sent_b[:80],
                                description="语义矛盾：共同上下文「{}」中同时出现「{}」和「{}」".format(
                                    "、".join(sorted(common_chars)[:3]),
                                    ant1,
                                    ant2,
                                ),
                                evidence=list(common_chars)[:5],
                                resolution_hint=self._suggest_resolution(ContradictionType.SEMANTIC),
                                confidence=min(0.9, len(common_chars) * 0.15),
                            ))

                for marker in self._contradiction_markers:
                    if (marker in sent_a or marker in sent_b) and \
                       len(set(re.findall(r"[\u4e00-\u9fff]+", sent_a)) &
                           set(re.findall(r"[\u4e00-\u9fff]+", sent_b))) >= 3:
                        items.append(ContradictionItem(
                            type=ContradictionType.SEMANTIC,
                            severity=ContradictionSeverity.LOW,
                            statement_a=sent_a[:80],
                            statement_b=sent_b[:80],
                            description="转折词「{}」暗示前后文可能存在语义矛盾".format(marker),
                            evidence=["转折词: {}".format(marker)],
                            confidence=0.3,
                        ))

        return items

    def _detect_factual_contradictions(self, segments: list[str]) -> list[ContradictionItem]:
        items = []
        facts = []

        for segment in segments:
            extracted = self._extract_facts(segment)
            facts.extend(extracted)

        for i in range(len(facts)):
            for j in range(i + 1, len(facts)):
                f1, f2 = facts[i], facts[j]
                if f1.subject == f2.subject and f1.predicate == f2.predicate:
                    if f1.value != f2.value:
                        items.append(ContradictionItem(
                            type=ContradictionType.FACTUAL,
                            severity=ContradictionSeverity.HIGH,
                            statement_a="{} {} {}".format(f1.subject, f1.predicate, f1.value),
                            statement_b="{} {} {}".format(f2.subject, f2.predicate, f2.value),
                            description="事实矛盾：同一主体「{}」的属性「{}」存在矛盾值「{}」vs「{}」".format(
                                f1.subject, f1.predicate, f1.value, f2.value,
                            ),
                            evidence=[f1.source[:50], f2.source[:50]],
                            resolution_hint=self._suggest_resolution(ContradictionType.FACTUAL),
                            confidence=0.8,
                        ))

        return items

    def _extract_facts(self, text: str) -> list[FactItem]:
        facts = []
        patterns = [
            r"(.{2,10})是(.{1,20})",
            r"(.{2,10})为(.{1,20})",
            r"(.{2,10})等于(.{1,20})",
            r"(.{2,10})属于(.{1,20})",
            r"(.{2,10})位于(.{1,20})",
        ]

        for pattern in patterns:
            for match in re.finditer(pattern, text):
                facts.append(FactItem(
                    subject=match.group(1),
                    predicate="是",
                    value=match.group(2),
                    source=text[:50],
                ))

        return facts

    def _detect_logical_contradictions(self, segments: list[str]) -> list[ContradictionItem]:
        items = []

        for i in range(len(segments)):
            for j in range(i + 1, len(segments)):
                a, b = segments[i], segments[j]

                if self._check_logical_conflict(a, b):
                    items.append(ContradictionItem(
                        type=ContradictionType.LOGICAL,
                        severity=ContradictionSeverity.HIGH,
                        statement_a=a[:80],
                        statement_b=b[:80],
                        description="逻辑矛盾：两段陈述在逻辑上不可同时为真",
                        resolution_hint=self._suggest_resolution(ContradictionType.LOGICAL),
                        confidence=0.7,
                    ))

        return items

    def _check_logical_conflict(self, a: str, b: str) -> bool:
        exclusive_pairs = [
            (r"所有.*都", r"有些.*不"),
            (r"必然", r"可能不"),
            (r"一定", r"不一定"),
            (r"必须", r"可以不"),
            (r"总是", r"有时不"),
        ]

        for pos_pattern, neg_pattern in exclusive_pairs:
            pos_a = re.search(pos_pattern, a)
            neg_b = re.search(neg_pattern, b)
            pos_b = re.search(pos_pattern, b)
            neg_a = re.search(neg_pattern, a)

            if (pos_a and neg_b) or (pos_b and neg_a):
                return True

        return False

    def _detect_temporal_contradictions(self, segments: list[str]) -> list[ContradictionItem]:
        items = []
        extracted_dates = []

        for idx, segment in enumerate(segments):
            for pattern, date_type in self._temporal_patterns:
                for match in re.finditer(pattern, segment):
                    try:
                        if date_type == "date":
                            y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
                            dt = datetime(y, m, d)
                        elif date_type == "year":
                            dt = datetime(int(match.group(1)), 1, 1)
                        else:
                            continue
                        extracted_dates.append((dt, idx, segment[:50]))
                    except (ValueError, IndexError):
                        pass

        if len(extracted_dates) >= 2:
            sorted_dates = sorted(extracted_dates, key=lambda x: x[0])
            event_before_after = {
                "前": -1, "之前": -1, "以前": -1,
                "后": 1, "之后": 1, "以后": 1, "随后": 1,
                "before": -1, "after": 1, "earlier": -1, "later": 1,
            }

            for i in range(len(sorted_dates)):
                for j in range(i + 1, len(sorted_dates)):
                    dt1, idx1, seg1 = sorted_dates[i]
                    dt2, idx2, seg2 = sorted_dates[j]

                    for marker, expected_order in event_before_after.items():
                        if marker in seg1 and marker in seg2:
                            if expected_order == -1 and dt1 > dt2:
                                items.append(ContradictionItem(
                                    type=ContradictionType.TEMPORAL,
                                    severity=ContradictionSeverity.MEDIUM,
                                    statement_a=seg1,
                                    statement_b=seg2,
                                    description="时间线矛盾：「{}」声称在「{}」之前发生，但前者时间戳（{}）晚于后者（{}）".format(
                                        seg1[:20], seg2[:20],
                                        dt1.strftime("%Y-%m-%d"),
                                        dt2.strftime("%Y-%m-%d"),
                                    ),
                                    resolution_hint="检查时间表述是否有误，或确认事件发生的实际顺序",
                                    confidence=0.75,
                                ))

        return items

    def _detect_numerical_contradictions(self, segments: list[str]) -> list[ContradictionItem]:
        items = []

        for i in range(len(segments)):
            for j in range(i + 1, len(segments)):
                nums_a = re.findall(r"(\d+(?:\.\d+)?)\s*(个|人|元|万|亿|%|倍|次|米|公里)", segments[i])
                nums_b = re.findall(r"(\d+(?:\.\d+)?)\s*(个|人|元|万|亿|%|倍|次|米|公里)", segments[j])

                for (val_a, unit_a) in nums_a:
                    for (val_b, unit_b) in nums_b:
                        if unit_a == unit_b:
                            try:
                                na = float(val_a)
                                nb = float(val_b)

                                common_context = set(
                                    re.findall(r"[\u4e00-\u9fff]+", segments[i])
                                ) & set(
                                    re.findall(r"[\u4e00-\u9fff]+", segments[j])
                                )

                                if len(common_context) >= 2 and abs(na - nb) / max(1, abs(na)) > 0.3:
                                    items.append(ContradictionItem(
                                        type=ContradictionType.NUMERICAL,
                                        severity=ContradictionSeverity.HIGH,
                                        statement_a=segments[i][:80],
                                        statement_b=segments[j][:80],
                                        description="数值矛盾：相同上下文中的数值矛盾（{} {} vs {} {}），差异 {:.1%}".format(
                                            na, unit_a, nb, unit_b,
                                            abs(na - nb) / max(1, abs(na)),
                                        ),
                                        evidence=["数值差异: {} vs {}".format(na, nb)],
                                        resolution_hint=self._suggest_resolution(
                                            ContradictionType.NUMERICAL,
                                        ),
                                        confidence=0.7,
                                    ))
                            except (ValueError, ZeroDivisionError):
                                pass

        return items

    def _cross_check(self, text: str, reference: str) -> list[ContradictionItem]:
        items = []
        text_segs = self._split_segments(text)
        ref_segs = self._split_segments(reference)

        text_facts = []
        for seg in text_segs:
            text_facts.extend(self._extract_facts(seg))

        ref_facts = []
        for seg in ref_segs:
            ref_facts.extend(self._extract_facts(seg))

        for tf in text_facts:
            for rf in ref_facts:
                if tf.subject == rf.subject and tf.predicate == rf.predicate:
                    if tf.value != rf.value:
                        items.append(ContradictionItem(
                            type=ContradictionType.FACTUAL,
                            severity=ContradictionSeverity.HIGH,
                            statement_a="{} {} {}".format(tf.subject, tf.predicate, tf.value),
                            statement_b="{} {} {}".format(rf.subject, rf.predicate, rf.value),
                            description="交叉检测：当前文本与参考文本在「{}」的「{}」属性上存在矛盾".format(
                                tf.subject, tf.predicate,
                            ),
                            confidence=0.85,
                        ))

        return items

    def _filter_and_rank(self, items: list[ContradictionItem]) -> list[ContradictionItem]:
        filtered = [item for item in items if item.confidence >= self.sensitivity]
        severity_order = {
            ContradictionSeverity.CRITICAL: 0,
            ContradictionSeverity.HIGH: 1,
            ContradictionSeverity.MEDIUM: 2,
            ContradictionSeverity.LOW: 3,
        }
        filtered.sort(key=lambda x: (severity_order.get(x.severity, 99), -x.confidence))
        return filtered

    def _suggest_resolution(self, cont_type: ContradictionType) -> str:
        suggestions = {
            ContradictionType.SEMANTIC: "确认两个陈述的上下文是否一致，排除一词多义导致的误判",
            ContradictionType.FACTUAL: "核实信息来源的权威性，以更可靠的来源为准",
            ContradictionType.LOGICAL: "检查是否存在隐藏的前提条件或例外情况，使两个陈述可以共存",
            ContradictionType.TEMPORAL: "确认时间信息的准确性，检查是否混淆了不同时间的事件",
            ContradictionType.NUMERICAL: "检查计量单位和统计口径是否一致，确认数据的时间范围",
            ContradictionType.ENTITY: "确认所指实体是否确实是同一个，检查是否存在实体消歧问题",
        }
        return suggestions.get(cont_type, "建议进一步核实相关信息的准确性")

    def _generate_summary(self, items: list[ContradictionItem]) -> str:
        type_counts = Counter(item.type for item in items)
        severe_count = sum(
            1 for item in items
            if item.severity in (ContradictionSeverity.CRITICAL, ContradictionSeverity.HIGH)
        )

        parts = []
        parts.append("检测到 {} 处矛盾".format(len(items)))
        parts.append("其中 {} 处为高危矛盾".format(severe_count))

        type_names = {
            ContradictionType.SEMANTIC: "语义矛盾",
            ContradictionType.FACTUAL: "事实矛盾",
            ContradictionType.LOGICAL: "逻辑矛盾",
            ContradictionType.TEMPORAL: "时间线矛盾",
            ContradictionType.NUMERICAL: "数值矛盾",
            ContradictionType.ENTITY: "实体矛盾",
        }

        for ct, count in type_counts.most_common():
            parts.append("{}: {} 处".format(type_names.get(ct, ct.value), count))

        return "；".join(parts)

    def check_fact_consistency(self, statement: str,
                               known_facts: list[dict]) -> dict:
        extracted = self._extract_facts(statement)

        conflicts = []
        for fact in extracted:
            for known in known_facts:
                if fact.subject == known.get("subject", "") and \
                   fact.predicate == known.get("predicate", ""):
                    if fact.value != known.get("value", ""):
                        conflicts.append({
                            "source": statement[:50],
                            "extracted": "{} {} {}".format(fact.subject, fact.predicate, fact.value),
                            "known": "{} {} {}".format(
                                known["subject"], known["predicate"], known["value"],
                            ),
                            "conflict": True,
                        })

        consistent = len(conflicts) == 0
        return {
            "consistent": consistent,
            "conflicts": conflicts,
            "total_extracted": len(extracted),
            "total_checked": len(known_facts),
        }

    def check_logical_consistency(self, statements: list[str]) -> dict:
        issues = []
        for i in range(len(statements)):
            for j in range(i + 1, len(statements)):
                if self._check_logical_conflict(statements[i], statements[j]):
                    issues.append({
                        "statement_a": statements[i][:80],
                        "statement_b": statements[j][:80],
                        "type": "logical_conflict",
                    })

        return {
            "consistent": len(issues) == 0,
            "issues": issues,
            "total_statements": len(statements),
            "conflict_count": len(issues),
        }

    def get_contradiction_types(self) -> list[str]:
        return [ct.value for ct in ContradictionType]

    def get_severity_levels(self) -> list[str]:
        return [s.value for s in ContradictionSeverity]
