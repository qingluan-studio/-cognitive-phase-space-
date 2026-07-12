"""
Continuous Learning & Error Avoidance System
- ErrorPattern mining from conversation history
- Correction tracking and application
- Proactive avoidance suggestions
- Incremental model improvement without retraining
- Integration with AutoLearner and KnowledgeGraph
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any, Set
from enum import Enum
import re
import hashlib
from datetime import datetime, timedelta
from collections import defaultdict, Counter


class ErrorCategory(str, Enum):
    HALLUCINATION = "hallucination"
    MISSING_INFO = "missing_info"
    WRONG_INFO = "wrong_info"
    UNCLEAR = "unclear"
    INCOMPLETE = "incomplete"
    IRRELEVANT = "irrelevant"
    BIASED = "biased"
    OUTDATED = "outdated"


class CorrectionType(str, Enum):
    USER_CORRECTION = "user_correction"
    SELF_CORRECTION = "self_correction"
    TOOL_CORRECTION = "tool_correction"
    PEER_CORRECTION = "peer_correction"


@dataclass
class ErrorInstance:
    error_id: str
    category: ErrorCategory
    query: str
    response: str
    correction: str
    correction_type: CorrectionType
    timestamp: str
    severity: float
    context: Optional[Dict] = None


@dataclass
class ErrorPattern:
    pattern_id: str
    category: ErrorCategory
    pattern_regex: str
    example_queries: List[str]
    correction_template: str
    occurrence_count: int
    last_seen: str
    severity_avg: float
    avoidance_rule: str


@dataclass
class LearningRecord:
    record_id: str
    query: str
    original_response: str
    corrected_response: str
    correction_type: CorrectionType
    learned_rules: List[str]
    applied: bool
    timestamp: str


class ErrorMiner:
    """Mine error patterns from conversation data."""

    def __init__(self, min_occurrence: int = 2, pattern_similarity: float = 0.7):
        self.min_occurrence = min_occurrence
        self.pattern_similarity = pattern_similarity
        self.errors: List[ErrorInstance] = []
        self.patterns: Dict[str, ErrorPattern] = {}

    def record_error(
        self,
        query: str,
        response: str,
        correction: str,
        category: ErrorCategory,
        correction_type: CorrectionType = CorrectionType.USER_CORRECTION,
        severity: float = 0.5,
    ) -> ErrorInstance:
        """Record an error instance and detect pattern matches."""
        ts = datetime.now().isoformat()
        error_id = hashlib.md5(
            f"{query}{response}{correction}{ts}".encode()
        ).hexdigest()[:12]

        instance = ErrorInstance(
            error_id=error_id,
            category=category,
            query=query,
            response=response,
            correction=correction,
            correction_type=correction_type,
            timestamp=datetime.now().isoformat(),
            severity=severity,
        )
        self.errors.append(instance)
        self._detect_new_pattern(instance)
        return instance

    def mine_patterns(self) -> List[ErrorPattern]:
        """Mine all error patterns from recorded errors."""
        patterns = []
        by_category = defaultdict(list)
        for err in self.errors:
            by_category[err.category].append(err)

        for category, errors in by_category.items():
            if len(errors) >= self.min_occurrence:
                pattern = self._extract_pattern(category, errors)
                if pattern:
                    patterns.append(pattern)
                    self.patterns[pattern.pattern_id] = pattern

        return patterns

    def _extract_pattern(
        self, category: ErrorCategory, errors: List[ErrorInstance]
    ) -> Optional[ErrorPattern]:
        """Extract common pattern from repeated errors."""
        if len(errors) < self.min_occurrence:
            return None

        query_words = []
        for e in errors:
            words = set(re.findall(r'[\w\u4e00-\u9fff]+', e.query.lower()))
            # n-gram extraction only for Chinese text (substring matching)
            has_chinese = bool(re.search(r'[\u4e00-\u9fff]', e.query))
            if has_chinese:
                text_clean = re.sub(r'\s+', '', e.query)
                for n in (2, 3):
                    for i in range(len(text_clean) - n + 1):
                        words.add(text_clean[i:i + n])
            query_words.extend(words)

        word_counts = Counter(query_words)
        common_words = [
            w for w, c in word_counts.most_common(5) if c >= len(errors) * 0.5
        ]

        if not common_words:
            common_words = errors[0].query.lower().split()[:3]

        pattern_regex = '|'.join(re.escape(w) for w in common_words)

        pattern_id = f"{category.value}_{len(self.patterns):04d}"

        return ErrorPattern(
            pattern_id=pattern_id,
            category=category,
            pattern_regex=pattern_regex,
            example_queries=[e.query[:100] for e in errors[:3]],
            correction_template=errors[0].correction,
            occurrence_count=len(errors),
            last_seen=max(e.timestamp for e in errors),
            severity_avg=sum(e.severity for e in errors) / len(errors),
            avoidance_rule=self._generate_avoidance_rule(
                category, common_words, errors
            ),
        )

    def _generate_avoidance_rule(
        self, category: ErrorCategory, common_words: List[str],
        errors: List[ErrorInstance]
    ) -> str:
        """Generate an avoidance rule from error patterns."""
        rules = {
            ErrorCategory.HALLUCINATION:
                f'当涉及"{",".join(common_words[:3])}"时，仅陈述可验证的事实，标注信息来源',
            ErrorCategory.MISSING_INFO:
                f'当回答关于"{",".join(common_words[:3])}"的问题时，确保覆盖所有关键方面',
            ErrorCategory.WRONG_INFO:
                f'在涉及"{",".join(common_words[:3])}"时，交叉验证信息后再回答',
            ErrorCategory.UNCLEAR:
                f'解释"{",".join(common_words[:3])}"时使用具体例子和结构化表达',
            ErrorCategory.INCOMPLETE:
                f'回答"{",".join(common_words[:3])}"问题时，确保从多角度给出完整答案',
            ErrorCategory.IRRELEVANT:
                f'当询问"{",".join(common_words[:3])}"时，聚焦核心问题，避免偏离',
            ErrorCategory.BIASED:
                f'讨论"{",".join(common_words[:3])}"时保持客观中立，呈现多方观点',
            ErrorCategory.OUTDATED:
                f'回答"{",".join(common_words[:3])}"时注明信息的时效性',
        }
        return rules.get(
            category,
            f'注意关于"{",".join(common_words[:3])}"的回答质量',
        )

    def _detect_new_pattern(self, instance: ErrorInstance):
        """Detect if this error matches an existing pattern or creates a new one."""
        for pattern_id, pattern in self.patterns.items():
            if re.search(pattern.pattern_regex, instance.query, re.IGNORECASE):
                pattern.occurrence_count += 1
                pattern.last_seen = instance.timestamp
                pattern.severity_avg = (
                    pattern.severity_avg * (pattern.occurrence_count - 1)
                    + instance.severity
                ) / pattern.occurrence_count
                if instance.query[:100] not in pattern.example_queries:
                    pattern.example_queries.append(instance.query[:100])
                return

    def get_avoidance_suggestions(self, query: str) -> List[str]:
        """Get proactive avoidance suggestions for a query."""
        suggestions = []
        for pattern in self.patterns.values():
            if re.search(pattern.pattern_regex, query, re.IGNORECASE):
                suggestions.append(pattern.avoidance_rule)
        return suggestions

    def get_error_stats(self) -> Dict:
        """Get error statistics."""
        by_category = Counter(e.category.value for e in self.errors)
        avg_severity = sum(e.severity for e in self.errors) / max(
            1, len(self.errors)
        )
        by_type = Counter(e.correction_type.value for e in self.errors)
        return {
            'total_errors': len(self.errors),
            'by_category': dict(by_category),
            'avg_severity': avg_severity,
            'by_correction_type': dict(by_type),
            'patterns_found': len(self.patterns),
            'recent_errors': len([
                e for e in self.errors
                if (
                    datetime.now() - datetime.fromisoformat(e.timestamp)
                ) < timedelta(hours=24)
            ]),
        }

    def get_top_patterns(self, n: int = 5) -> List[ErrorPattern]:
        """Get top N most frequent error patterns."""
        return sorted(
            self.patterns.values(),
            key=lambda p: p.occurrence_count, reverse=True,
        )[:n]


class CorrectionTracker:
    """Track and apply corrections."""

    def __init__(self):
        self.records: List[LearningRecord] = []
        self.rules: Dict[str, str] = {}

    def record_correction(
        self, query: str, original: str, corrected: str,
        correction_type: CorrectionType,
    ) -> LearningRecord:
        """Record a correction for future learning."""
        record_id = hashlib.md5(
            f"{query}{original}{corrected}".encode()
        ).hexdigest()[:8]

        learned_rules = self._extract_learning_rules(original, corrected)

        record = LearningRecord(
            record_id=record_id,
            query=query,
            original_response=original,
            corrected_response=corrected,
            correction_type=correction_type,
            learned_rules=learned_rules,
            applied=True,
            timestamp=datetime.now().isoformat(),
        )
        self.records.append(record)

        for rule in learned_rules:
            rule_id = hashlib.md5(rule.encode()).hexdigest()[:6]
            self.rules[rule_id] = rule

        return record

    def _extract_learning_rules(
        self, original: str, corrected: str
    ) -> List[str]:
        """Extract learning rules from a correction."""
        rules = []

        if abs(len(corrected) - len(original)) > 100:
            if len(corrected) > len(original):
                rules.append("提供更详细的内容")
            else:
                rules.append("回答应更简洁，突出重点")

        orig_structured = bool(re.search(
            r'(\d+\.|[-*]|首先|然后|最后|first|then|finally)',
            original, re.IGNORECASE,
        ))
        corr_structured = bool(re.search(
            r'(\d+\.|[-*]|首先|然后|最后|first|then|finally)',
            corrected, re.IGNORECASE,
        ))
        if corr_structured and not orig_structured:
            rules.append("使用结构化格式（列表、步骤）组织回答")

        orig_has_example = bool(re.search(
            r'(例如|比如|示例|example|e\.g\.)',
            original, re.IGNORECASE,
        ))
        corr_has_example = bool(re.search(
            r'(例如|比如|示例|example|e\.g\.)',
            corrected, re.IGNORECASE,
        ))
        if corr_has_example and not orig_has_example:
            rules.append("添加具体示例说明")

        return rules if rules else ["根据用户反馈改进回答"]

    def apply_corrections(
        self, query: str, response: str
    ) -> Optional[str]:
        """Apply learned corrections to a new response."""
        applicable_rules = []
        for rule_id, rule in self.rules.items():
            if self._is_rule_applicable(rule, query):
                applicable_rules.append(rule)

        if not applicable_rules:
            return None

        modified = response
        for rule in applicable_rules:
            if "结构化" in rule:
                if not re.search(r'\d+\.', modified):
                    modified = self._add_structure(modified)
            if "示例" in rule and "例如" not in modified and len(modified) < 300:
                modified += "\n\n例如：..."
            if "简洁" in rule and len(modified) > 500:
                sentences = re.split(r'(?<=[.!?。！？])\s+', modified)
                modified = ' '.join(
                    sentences[:max(3, len(sentences) // 2)]
                )

        return modified if modified != response else None

    def _is_rule_applicable(self, rule: str, query: str) -> bool:
        return True

    def _add_structure(self, text: str) -> str:
        """Add bullet-point structure to text."""
        lines = text.strip().split('\n')
        if len(lines) <= 1:
            return f"- {text.strip()}"
        return "\n".join(
            f"- {line.strip()}" if not line.startswith('-') else line
            for line in lines
        )

    def get_stats(self) -> Dict:
        return {
            'total_corrections': len(self.records),
            'rules_learned': len(self.rules),
            'by_type': dict(
                Counter(r.correction_type.value for r in self.records)
            ),
        }


class ContinuousLearner:
    """Orchestrator for continuous learning."""

    def __init__(self):
        self.error_miner = ErrorMiner()
        self.correction_tracker = CorrectionTracker()
        self._session_errors: Dict[str, List[str]] = defaultdict(list)

    def learn_from_feedback(
        self, session_id: str, query: str,
        response: str, feedback: str,
        rating: Optional[int] = None,
    ):
        """Learn from user feedback."""
        if rating is not None and rating <= 2:
            severity = 1.0 - (rating / 5.0)
            category = self._infer_error_category(query, response, feedback)
            self.error_miner.record_error(
                query=query,
                response=response,
                correction=feedback,
                category=category,
                correction_type=CorrectionType.USER_CORRECTION,
                severity=severity,
            )
            self._session_errors[session_id].append(
                f"{category.value}: {query[:50]}"
            )
        elif feedback and rating is not None and rating >= 4:
            self.correction_tracker.record_correction(
                query=query,
                original=response,
                corrected=feedback,
                correction_type=CorrectionType.USER_CORRECTION,
            )

    def get_avoidance_context(self, query: str) -> str:
        """Get avoidance suggestions as a context string."""
        suggestions = self.error_miner.get_avoidance_suggestions(query)
        if not suggestions:
            return ""
        return "错误规避提醒:\n" + "\n".join(f"- {s}" for s in suggestions)

    def apply_learned_rules(
        self, query: str, response: str
    ) -> Optional[str]:
        """Apply all learned correction rules to improve a response."""
        return self.correction_tracker.apply_corrections(query, response)

    def get_learning_report(self) -> Dict:
        """Get comprehensive learning report."""
        return {
            'errors': self.error_miner.get_error_stats(),
            'corrections': self.correction_tracker.get_stats(),
            'top_patterns': [
                {
                    'category': p.category.value,
                    'occurrence': p.occurrence_count,
                    'severity': p.severity_avg,
                    'rule': p.avoidance_rule,
                }
                for p in self.error_miner.get_top_patterns(5)
            ],
            'session_errors': {
                k: len(v) for k, v in self._session_errors.items()
            },
        }

    def _infer_error_category(
        self, query: str, response: str, feedback: str
    ) -> ErrorCategory:
        """Infer error category from feedback text."""
        feedback_lower = feedback.lower()

        category_keywords = {
            ErrorCategory.HALLUCINATION: [
                '假的', '不存在', '编造', '幻觉', 'hallucination', 'fake',
            ],
            ErrorCategory.MISSING_INFO: [
                '缺少', '没有提到', '漏掉', 'missing', '遗漏',
            ],
            ErrorCategory.WRONG_INFO: [
                '不对', '错误', '不正确', '错了', 'wrong', 'incorrect',
            ],
            ErrorCategory.UNCLEAR: [
                '不懂', '不清楚', '不明白', '模糊', 'unclear', 'confusing',
            ],
            ErrorCategory.INCOMPLETE: [
                '不完整', '不全', 'incomplete', '不够',
            ],
            ErrorCategory.IRRELEVANT: [
                '无关', '跑题', '不相关', 'irrelevant', '答非所问',
            ],
            ErrorCategory.BIASED: [
                '偏见', '偏向', 'biased', '片面', '不客观',
            ],
            ErrorCategory.OUTDATED: [
                '过时', '过期', 'outdated', '不是最新的', '旧',
            ],
        }

        for category, keywords in category_keywords.items():
            if any(kw in feedback_lower for kw in keywords):
                return category

        return ErrorCategory.UNCLEAR


_learner: Optional[ContinuousLearner] = None


def get_continuous_learner() -> ContinuousLearner:
    global _learner
    if _learner is None:
        _learner = ContinuousLearner()
    return _learner


def reset_continuous_learner() -> None:
    global _learner
    _learner = None
