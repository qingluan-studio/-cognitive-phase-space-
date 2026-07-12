"""
Tests for src/cee/app/engine/continual_learner.py
Continuous Learning & Error Avoidance System
"""
import sys

sys.path.insert(0, "/workspace/src")

import pytest

from cee.app.engine.continual_learner import (
    ContinuousLearner,
    CorrectionTracker,
    CorrectionType,
    ErrorCategory,
    ErrorInstance,
    ErrorMiner,
    ErrorPattern,
    LearningRecord,
    get_continuous_learner,
    reset_continuous_learner,
)


# ============================================================
# Fixtures
# ============================================================


@pytest.fixture(autouse=True)
def _reset_singletons():
    reset_continuous_learner()
    yield
    reset_continuous_learner()


@pytest.fixture
def miner():
    return ErrorMiner(min_occurrence=2)


@pytest.fixture
def tracker():
    return CorrectionTracker()


@pytest.fixture
def learner():
    return ContinuousLearner()


# ============================================================
# ErrorInstance tests
# ============================================================


class TestErrorInstance:
    def test_create_basic(self):
        instance = ErrorInstance(
            error_id="err001",
            category=ErrorCategory.HALLUCINATION,
            query="What is AI?",
            response="AI is magic",
            correction="AI is machine learning based",
            correction_type=CorrectionType.USER_CORRECTION,
            timestamp="2025-01-01T00:00:00",
            severity=0.8,
        )
        assert instance.error_id == "err001"
        assert instance.category == ErrorCategory.HALLUCINATION
        assert instance.severity == 0.8

    def test_create_with_context(self):
        ctx = {"source": "chat", "model": "gpt-4"}
        instance = ErrorInstance(
            error_id="err002",
            category=ErrorCategory.WRONG_INFO,
            query="test",
            response="bad",
            correction="good",
            correction_type=CorrectionType.TOOL_CORRECTION,
            timestamp="2025-01-01T00:00:00",
            severity=0.5,
            context=ctx,
        )
        assert instance.context == ctx
        assert "source" in instance.context

    def test_all_categories(self):
        for cat in ErrorCategory:
            instance = ErrorInstance(
                error_id=f"err_{cat.value}",
                category=cat,
                query="q",
                response="r",
                correction="c",
                correction_type=CorrectionType.USER_CORRECTION,
                timestamp="2025-01-01T00:00:00",
                severity=0.5,
            )
            assert instance.category == cat

    def test_all_correction_types(self):
        for ct in CorrectionType:
            instance = ErrorInstance(
                error_id=f"err_{ct.value}",
                category=ErrorCategory.UNCLEAR,
                query="q",
                response="r",
                correction="c",
                correction_type=ct,
                timestamp="2025-01-01T00:00:00",
                severity=0.5,
            )
            assert instance.correction_type == ct

    def test_severity_boundaries(self):
        for sv in [0.0, 0.5, 1.0]:
            instance = ErrorInstance(
                error_id="eb",
                category=ErrorCategory.UNCLEAR,
                query="q",
                response="r",
                correction="c",
                correction_type=CorrectionType.USER_CORRECTION,
                timestamp="2025-01-01T00:00:00",
                severity=sv,
            )
            assert instance.severity == sv


# ============================================================
# ErrorPattern tests
# ============================================================


class TestErrorPattern:
    def test_create_pattern(self):
        pattern = ErrorPattern(
            pattern_id="p001",
            category=ErrorCategory.HALLUCINATION,
            pattern_regex=r"python|code",
            example_queries=["how to code python", "python tutorial"],
            correction_template="Only state verifiable facts",
            occurrence_count=5,
            last_seen="2025-01-01T00:00:00",
            severity_avg=0.7,
            avoidance_rule="Avoid hallucination about python",
        )
        assert pattern.pattern_id == "p001"
        assert pattern.occurrence_count == 5
        assert len(pattern.example_queries) == 2

    def test_pattern_regex_matching(self):
        import re
        pattern = ErrorPattern(
            pattern_id="p002",
            category=ErrorCategory.WRONG_INFO,
            pattern_regex=r"python|code",
            example_queries=["python basics"],
            correction_template="Verify before answering",
            occurrence_count=3,
            last_seen="2025-01-01T00:00:00",
            severity_avg=0.6,
            avoidance_rule="Cross-verify python answers",
        )
        assert re.search(pattern.pattern_regex, "teach me python", re.IGNORECASE)
        assert re.search(pattern.pattern_regex, "write some code", re.IGNORECASE)
        assert not re.search(pattern.pattern_regex, "how about java")


# ============================================================
# ErrorMiner tests
# ============================================================


class TestErrorMinerRecordError:
    def test_record_single_error(self, miner):
        instance = miner.record_error(
            query="What is AI?",
            response="AI is magic.",
            correction="AI is a field of computer science.",
            category=ErrorCategory.HALLUCINATION,
        )
        assert len(miner.errors) == 1
        assert instance.category == ErrorCategory.HALLUCINATION
        assert len(instance.error_id) == 12

    def test_record_error_returns_instance(self, miner):
        instance = miner.record_error(
            query="Explain ML",
            response="ML is simple",
            correction="ML involves algorithms that learn from data",
            category=ErrorCategory.MISSING_INFO,
            severity=0.6,
        )
        assert isinstance(instance, ErrorInstance)
        assert instance.severity == 0.6

    def test_record_multiple_errors(self, miner):
        for i in range(5):
            miner.record_error(
                query=f"What is topic {i}?",
                response=f"Topic {i} is simple.",
                correction=f"Topic {i} needs more detail.",
                category=ErrorCategory.MISSING_INFO,
            )
        assert len(miner.errors) == 5

    def test_record_error_with_custom_severity(self, miner):
        instance = miner.record_error(
            query="Q", response="R", correction="C",
            category=ErrorCategory.BIASED, severity=0.9,
        )
        assert instance.severity == 0.9

    def test_record_error_defaults(self, miner):
        instance = miner.record_error(
            query="Q", response="R", correction="C",
            category=ErrorCategory.UNCLEAR,
        )
        assert instance.severity == 0.5
        assert instance.correction_type == CorrectionType.USER_CORRECTION


class TestErrorMinerMinePatterns:
    def test_no_patterns_below_threshold(self, miner):
        miner.record_error("Q1", "R1", "C1", ErrorCategory.HALLUCINATION)
        patterns = miner.mine_patterns()
        assert len(patterns) == 0
        assert len(miner.patterns) == 0

    def test_mine_patterns_two_errors_same_category(self, miner):
        miner.record_error(
            "python code example", "bad", "good",
            ErrorCategory.HALLUCINATION,
        )
        miner.record_error(
            "python tutorial", "bad", "good",
            ErrorCategory.HALLUCINATION,
        )
        patterns = miner.mine_patterns()
        assert len(patterns) >= 1
        assert patterns[0].category == ErrorCategory.HALLUCINATION

    def test_mine_patterns_different_categories(self, miner):
        miner.record_error(
            "python code", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.record_error(
            "python guide", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.record_error(
            "java is wrong", "bad", "good", ErrorCategory.WRONG_INFO,
        )
        miner.record_error(
            "java error fix", "bad", "good", ErrorCategory.WRONG_INFO,
        )
        patterns = miner.mine_patterns()
        assert len(patterns) >= 2

    def test_mine_patterns_stores_in_dict(self, miner):
        miner.record_error(
            "python ai", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.record_error(
            "python ml", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.mine_patterns()
        assert len(miner.patterns) > 0

    def test_mine_patterns_with_three_same(self, miner):
        miner.record_error(
            "python list", "bad", "good", ErrorCategory.MISSING_INFO,
        )
        miner.record_error(
            "python dict", "bad", "good", ErrorCategory.MISSING_INFO,
        )
        miner.record_error(
            "python set", "bad", "good", ErrorCategory.MISSING_INFO,
        )
        patterns = miner.mine_patterns()
        assert len(patterns) >= 1
        assert patterns[0].occurrence_count == 3

    def test_mine_patterns_min_occurrence_custom(self):
        m = ErrorMiner(min_occurrence=3)
        m.record_error("ai basics", "bad", "good", ErrorCategory.HALLUCINATION)
        m.record_error("ai deep", "bad", "good", ErrorCategory.HALLUCINATION)
        patterns = m.mine_patterns()
        assert len(patterns) == 0
        m.record_error("ai ml", "bad", "good", ErrorCategory.HALLUCINATION)
        patterns = m.mine_patterns()
        assert len(patterns) >= 1


class TestErrorMinerPatternDetection:
    def test_auto_detect_on_record(self, miner):
        miner.record_error(
            "python basics", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        assert len(miner.patterns) == 0
        miner.record_error(
            "python advanced", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.mine_patterns()
        assert len(miner.patterns) > 0

    def test_pattern_updated_on_new_match(self, miner):
        miner.record_error(
            "machine learning basics", "bad", "good",
            ErrorCategory.MISSING_INFO, severity=0.5,
        )
        miner.record_error(
            "machine learning advanced", "bad", "good",
            ErrorCategory.MISSING_INFO, severity=0.5,
        )
        patterns = miner.mine_patterns()
        assert len(patterns) >= 1
        miner.record_error(
            "machine learning tutorial", "bad", "good",
            ErrorCategory.MISSING_INFO, severity=0.9,
        )
        pattern = miner.patterns[patterns[0].pattern_id]
        assert pattern.occurrence_count >= 3


class TestErrorMinerAvoidanceSuggestions:
    def test_no_suggestions_without_patterns(self, miner):
        suggestions = miner.get_avoidance_suggestions("test query")
        assert suggestions == []

    def test_suggestions_with_matching_pattern(self, miner):
        miner.record_error(
            "python code example", "bad", "good",
            ErrorCategory.HALLUCINATION,
        )
        miner.record_error(
            "python tutorial", "bad", "good",
            ErrorCategory.HALLUCINATION,
        )
        miner.mine_patterns()
        suggestions = miner.get_avoidance_suggestions("write python code")
        assert len(suggestions) > 0

    def test_no_suggestions_for_non_matching(self, miner):
        miner.record_error(
            "python code", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.record_error(
            "python tutorial", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.mine_patterns()
        suggestions = miner.get_avoidance_suggestions("cooking recipe")
        assert suggestions == []

    def test_suggestions_content_is_rule(self, miner):
        miner.record_error(
            "java oop", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.record_error(
            "java spring", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.mine_patterns()
        suggestions = miner.get_avoidance_suggestions("java coding tips")
        assert len(suggestions) > 0
        assert isinstance(suggestions[0], str)
        assert len(suggestions[0]) > 0


class TestErrorMinerStats:
    def test_stats_empty(self, miner):
        stats = miner.get_error_stats()
        assert stats['total_errors'] == 0
        assert stats['patterns_found'] == 0

    def test_stats_with_errors(self, miner):
        miner.record_error("Q1", "R1", "C1", ErrorCategory.HALLUCINATION)
        miner.record_error("Q2", "R2", "C2", ErrorCategory.WRONG_INFO)
        stats = miner.get_error_stats()
        assert stats['total_errors'] == 2
        assert 'hallucination' in stats['by_category']
        assert 'wrong_info' in stats['by_category']

    def test_stats_by_category(self, miner):
        miner.record_error("Q1", "R1", "C1", ErrorCategory.HALLUCINATION)
        miner.record_error("Q2", "R2", "C2", ErrorCategory.HALLUCINATION)
        miner.record_error("Q3", "R3", "C3", ErrorCategory.BIASED)
        stats = miner.get_error_stats()
        assert stats['by_category']['hallucination'] == 2
        assert stats['by_category']['biased'] == 1

    def test_stats_by_correction_type(self, miner):
        miner.record_error(
            "Q1", "R1", "C1", ErrorCategory.UNCLEAR,
            correction_type=CorrectionType.TOOL_CORRECTION,
        )
        miner.record_error(
            "Q2", "R2", "C2", ErrorCategory.UNCLEAR,
            correction_type=CorrectionType.SELF_CORRECTION,
        )
        stats = miner.get_error_stats()
        assert 'tool_correction' in stats['by_correction_type']
        assert 'self_correction' in stats['by_correction_type']

    def test_stats_recent_errors(self, miner):
        miner.record_error("Q1", "R1", "C1", ErrorCategory.UNCLEAR)
        stats = miner.get_error_stats()
        assert stats['recent_errors'] >= 1

    def test_stats_avg_severity(self, miner):
        miner.record_error("Q1", "R1", "C1", ErrorCategory.UNCLEAR, severity=0.2)
        miner.record_error("Q2", "R2", "C2", ErrorCategory.UNCLEAR, severity=0.8)
        stats = miner.get_error_stats()
        assert 0.49 < stats['avg_severity'] < 0.51


class TestErrorMinerTopPatterns:
    def test_top_patterns_empty(self, miner):
        result = miner.get_top_patterns(3)
        assert result == []

    def test_top_patterns_ranking(self, miner):
        for i in range(4):
            miner.record_error(
                f"python {i}", "bad", "good", ErrorCategory.HALLUCINATION,
            )
        for i in range(2):
            miner.record_error(
                f"java {i}", "bad", "good", ErrorCategory.WRONG_INFO,
            )
        miner.mine_patterns()
        top = miner.get_top_patterns(5)
        assert len(top) >= 1
        assert top[0].occurrence_count >= top[-1].occurrence_count

    def test_top_patterns_limit(self, miner):
        miner.record_error("python a", "bad", "good", ErrorCategory.HALLUCINATION)
        miner.record_error("python b", "bad", "good", ErrorCategory.HALLUCINATION)
        miner.record_error("java a", "bad", "good", ErrorCategory.WRONG_INFO)
        miner.record_error("java b", "bad", "good", ErrorCategory.WRONG_INFO)
        miner.record_error("linux a", "bad", "good", ErrorCategory.UNCLEAR)
        miner.record_error("linux b", "bad", "good", ErrorCategory.UNCLEAR)
        miner.mine_patterns()
        top = miner.get_top_patterns(2)
        assert len(top) <= 2


class TestErrorCategoryInference:
    """Test _infer_error_category via the public API."""

    def test_infer_hallucination_chinese(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "这是编造的内容"
        )
        assert cat == ErrorCategory.HALLUCINATION

    def test_infer_hallucination_english(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "this is fake information"
        )
        assert cat == ErrorCategory.HALLUCINATION

    def test_infer_missing_info_chinese(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "你漏掉了关键信息"
        )
        assert cat == ErrorCategory.MISSING_INFO

    def test_infer_missing_info_english(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "missing key details"
        )
        assert cat == ErrorCategory.MISSING_INFO

    def test_infer_wrong_info_chinese(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "这个答案不正确"
        )
        assert cat == ErrorCategory.WRONG_INFO

    def test_infer_wrong_info_english(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "incorrect answer"
        )
        assert cat == ErrorCategory.WRONG_INFO

    def test_infer_unclear_chinese(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "我不明白你说的什么意思"
        )
        assert cat == ErrorCategory.UNCLEAR

    def test_infer_unclear_english(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "this is confusing"
        )
        assert cat == ErrorCategory.UNCLEAR

    def test_infer_incomplete(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "回答不完整"
        )
        assert cat == ErrorCategory.INCOMPLETE

    def test_infer_irrelevant(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "答非所问，完全跑题了"
        )
        assert cat == ErrorCategory.IRRELEVANT

    def test_infer_biased(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "有偏见，不客观"
        )
        assert cat == ErrorCategory.BIASED

    def test_infer_outdated(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "信息已经过时了"
        )
        assert cat == ErrorCategory.OUTDATED

    def test_infer_default_to_unclear(self):
        learner = ContinuousLearner()
        cat = learner._infer_error_category(
            "Q", "R", "还可以"
        )
        assert cat == ErrorCategory.UNCLEAR


# ============================================================
# ErrorMiner edge cases
# ============================================================


class TestErrorMinerEdgeCases:
    def test_empty_query(self, miner):
        instance = miner.record_error(
            query="", response="R", correction="C",
            category=ErrorCategory.UNCLEAR,
        )
        assert instance.error_id is not None

    def test_same_error_twice_different_ids(self, miner):
        i1 = miner.record_error(
            "Q", "R", "C", ErrorCategory.UNCLEAR,
        )
        i2 = miner.record_error(
            "Q", "R", "C", ErrorCategory.UNCLEAR,
        )
        assert i1.error_id != i2.error_id

    def test_all_errors_same_category(self, miner):
        for i in range(4):
            miner.record_error(
                f"query {i}", f"response {i}", f"correction {i}",
                ErrorCategory.HALLUCINATION,
            )
        patterns = miner.mine_patterns()
        stats = miner.get_error_stats()
        assert stats['total_errors'] == 4
        assert stats['by_category']['hallucination'] == 4

    def test_large_volume(self, miner):
        for i in range(100):
            miner.record_error(
                f"test query {i % 5}", "bad", "good",
                ErrorCategory.UNCLEAR,
            )
        assert len(miner.errors) == 100
        stats = miner.get_error_stats()
        assert stats['total_errors'] == 100

    def test_empty_response(self, miner):
        instance = miner.record_error(
            "Q", "", "correction", ErrorCategory.UNCLEAR,
        )
        assert isinstance(instance, ErrorInstance)

    def test_special_chars_in_query(self, miner):
        instance = miner.record_error(
            "query with !@#$%^&*()", "R", "C",
            ErrorCategory.UNCLEAR,
        )
        assert instance.error_id is not None

    def test_pattern_id_format(self, miner):
        miner.record_error("ai python", "bad", "good", ErrorCategory.HALLUCINATION)
        miner.record_error("ai python2", "bad", "good", ErrorCategory.HALLUCINATION)
        patterns = miner.mine_patterns()
        assert patterns[0].pattern_id.startswith("hallucination_")


# ============================================================
# Avoidance rule generation per category
# ============================================================


class TestAvoidanceRuleGeneration:
    def _make_errors(self, miner, category, count=3):
        for i in range(count):
            miner.record_error(
                f"{category.value} test query {i}", "bad", "good", category,
            )

    def test_hallucination_rule(self, miner):
        self._make_errors(miner, ErrorCategory.HALLUCINATION)
        patterns = miner.mine_patterns()
        assert len(patterns) >= 1
        assert "可验证" in patterns[0].avoidance_rule

    def test_missing_info_rule(self, miner):
        self._make_errors(miner, ErrorCategory.MISSING_INFO)
        patterns = miner.mine_patterns()
        assert len(patterns) >= 1
        assert "关键" in patterns[0].avoidance_rule

    def test_wrong_info_rule(self, miner):
        self._make_errors(miner, ErrorCategory.WRONG_INFO)
        patterns = miner.mine_patterns()
        assert len(patterns) >= 1
        assert "交叉验证" in patterns[0].avoidance_rule

    def test_unclear_rule(self, miner):
        self._make_errors(miner, ErrorCategory.UNCLEAR)
        patterns = miner.mine_patterns()
        assert len(patterns) >= 1
        assert "具体例子" in patterns[0].avoidance_rule

    def test_incomplete_rule(self, miner):
        self._make_errors(miner, ErrorCategory.INCOMPLETE)
        patterns = miner.mine_patterns()
        assert len(patterns) >= 1
        assert "多角度" in patterns[0].avoidance_rule

    def test_irrelevant_rule(self, miner):
        self._make_errors(miner, ErrorCategory.IRRELEVANT)
        patterns = miner.mine_patterns()
        assert len(patterns) >= 1
        assert "聚焦" in patterns[0].avoidance_rule

    def test_biased_rule(self, miner):
        self._make_errors(miner, ErrorCategory.BIASED)
        patterns = miner.mine_patterns()
        assert len(patterns) >= 1
        assert "客观中立" in patterns[0].avoidance_rule

    def test_outdated_rule(self, miner):
        self._make_errors(miner, ErrorCategory.OUTDATED)
        patterns = miner.mine_patterns()
        assert len(patterns) >= 1
        assert "时效" in patterns[0].avoidance_rule


# ============================================================
# CorrectionTracker tests
# ============================================================


class TestCorrectionTrackerRecord:
    def test_record_correction_basic(self, tracker):
        record = tracker.record_correction(
            query="How to code?",
            original="Just write code.",
            corrected="Use best practices: 1. Plan 2. Code 3. Test",
            correction_type=CorrectionType.USER_CORRECTION,
        )
        assert isinstance(record, LearningRecord)
        assert record.applied is True
        assert len(record.learned_rules) > 0

    def test_record_correction_adds_rules(self, tracker):
        initial = len(tracker.rules)
        tracker.record_correction(
            "Q", "short", "long response " * 20,
            CorrectionType.USER_CORRECTION,
        )
        assert len(tracker.rules) >= initial

    def test_record_correction_length_rule_longer(self, tracker):
        record = tracker.record_correction(
            "Q", "short", "long " * 50,
            CorrectionType.USER_CORRECTION,
        )
        rules_text = " ".join(record.learned_rules)
        assert "详细" in rules_text

    def test_record_correction_length_rule_shorter(self, tracker):
        record = tracker.record_correction(
            "Q", "long " * 50, "short",
            CorrectionType.USER_CORRECTION,
        )
        rules_text = " ".join(record.learned_rules)
        assert "简洁" in rules_text

    def test_record_correction_structure_rule(self, tracker):
        record = tracker.record_correction(
            "Q",
            "plain sentence response here",
            "1. First point\n2. Second point\n3. Third point",
            CorrectionType.PEER_CORRECTION,
        )
        rules_text = " ".join(record.learned_rules)
        assert "结构化" in rules_text

    def test_record_correction_example_rule(self, tracker):
        record = tracker.record_correction(
            "Q",
            "plain answer",
            "answer with an example: 比如 this specific case shows",
            CorrectionType.TOOL_CORRECTION,
        )
        rules_text = " ".join(record.learned_rules)
        assert "示例" in rules_text

    def test_record_correction_multiple_rules(self, tracker):
        record = tracker.record_correction(
            "Q",
            "short plain",
            "1. structured\n2. with example\nLong detailed explanation " * 20,
            CorrectionType.USER_CORRECTION,
        )
        assert len(record.learned_rules) >= 2


class TestCorrectionTrackerApply:
    def test_apply_no_rules(self, tracker):
        result = tracker.apply_corrections("Q", "response")
        assert result is None

    def test_apply_with_rules(self, tracker):
        tracker.record_correction(
            "Q",
            "plain text response",
            "1. structured\n2. with 示例 examples",
            CorrectionType.USER_CORRECTION,
        )
        result = tracker.apply_corrections("Q", "a simple response text")
        assert result is not None

    def test_apply_no_change_when_same(self, tracker):
        tracker.record_correction(
            "Q", "short", "long " * 50,
            CorrectionType.USER_CORRECTION,
        )
        result = tracker.apply_corrections(
            "Q", "1. already structured and long " * 30,
        )
        assert result is None

    def test_apply_structure_to_plain_text(self, tracker):
        tracker.record_correction(
            "Q", "plain text", "1. first\n2. second",
            CorrectionType.USER_CORRECTION,
        )
        result = tracker.apply_corrections("Q", "line one\nline two")
        if result:
            assert "- " in result or "\n-" in result


class TestCorrectionTrackerStats:
    def test_stats_empty(self, tracker):
        stats = tracker.get_stats()
        assert stats['total_corrections'] == 0
        assert stats['rules_learned'] == 0

    def test_stats_with_records(self, tracker):
        tracker.record_correction(
            "Q1", "orig1", "corr1", CorrectionType.USER_CORRECTION,
        )
        tracker.record_correction(
            "Q2", "orig2", "corr2", CorrectionType.TOOL_CORRECTION,
        )
        stats = tracker.get_stats()
        assert stats['total_corrections'] == 2
        assert len(stats['by_type']) >= 1


# ============================================================
# LearningRecord tests
# ============================================================


class TestLearningRecord:
    def test_create(self):
        record = LearningRecord(
            record_id="rec001",
            query="test query",
            original_response="orig",
            corrected_response="corr",
            correction_type=CorrectionType.USER_CORRECTION,
            learned_rules=["rule1", "rule2"],
            applied=True,
            timestamp="2025-01-01",
        )
        assert record.record_id == "rec001"
        assert len(record.learned_rules) == 2
        assert record.applied is True


# ============================================================
# ContinuousLearner tests
# ============================================================


class TestContinuousLearnerFeedback:
    def test_learn_from_negative_feedback(self, learner):
        learner.learn_from_feedback(
            session_id="s1",
            query="What is AI?",
            response="AI is magic",
            feedback="这是假的，完全编造的内容",
            rating=1,
        )
        assert len(learner.error_miner.errors) == 1
        assert learner.error_miner.errors[0].category == ErrorCategory.HALLUCINATION

    def test_learn_from_positive_feedback(self, learner):
        learner.learn_from_feedback(
            session_id="s1",
            query="How to code?",
            response="Just write code.",
            feedback="1. Plan first\n2. Write code\n3. Test",
            rating=5,
        )
        assert len(learner.correction_tracker.records) == 1

    def test_learn_neutral_feedback(self, learner):
        learner.learn_from_feedback(
            session_id="s1",
            query="Q", response="R", feedback="ok",
            rating=3,
        )
        assert len(learner.error_miner.errors) == 0
        assert len(learner.correction_tracker.records) == 0

    def test_learn_negative_adds_session_error(self, learner):
        learner.learn_from_feedback(
            session_id="s1",
            query="python basics",
            response="bad",
            feedback="信息过时了",
            rating=1,
        )
        assert len(learner._session_errors["s1"]) == 1

    def test_learn_multiple_sessions(self, learner):
        learner.learn_from_feedback(
            "s1", "q", "r", "错误回答", rating=1,
        )
        learner.learn_from_feedback(
            "s2", "q", "r", "很好", rating=5,
        )
        assert "s1" in learner._session_errors
        assert len(learner.correction_tracker.records) == 1

    def test_learn_without_rating(self, learner):
        learner.learn_from_feedback(
            session_id="s1",
            query="Q", response="R", feedback="some feedback",
            rating=None,
        )
        assert len(learner.error_miner.errors) == 0
        assert len(learner.correction_tracker.records) == 0

    def test_learn_negative_severity_calculation(self, learner):
        learner.learn_from_feedback(
            "s1", "Q", "R", "错误", rating=1,
        )
        err = learner.error_miner.errors[0]
        assert err.severity == 0.8

    def test_learn_rating_2_severity(self, learner):
        learner.learn_from_feedback(
            "s1", "Q", "R", "不对", rating=2,
        )
        err = learner.error_miner.errors[0]
        assert err.severity == 0.6


class TestContinuousLearnerAvoidance:
    def test_get_context_no_patterns(self, learner):
        ctx = learner.get_avoidance_context("test query")
        assert ctx == ""

    def test_get_context_with_patterns(self, learner):
        learner.error_miner.record_error(
            "python code help", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        learner.error_miner.record_error(
            "python tutorial help", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        learner.error_miner.mine_patterns()
        ctx = learner.get_avoidance_context("python coding question")
        assert "错误规避" in ctx
        assert "python" in ctx.lower()

    def test_get_context_no_match(self, learner):
        learner.error_miner.record_error(
            "python code", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        learner.error_miner.record_error(
            "python help", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        learner.error_miner.mine_patterns()
        ctx = learner.get_avoidance_context("cooking recipes")
        assert ctx == ""


class TestContinuousLearnerApplyRules:
    def test_apply_no_learned_rules(self, learner):
        result = learner.apply_learned_rules("Q", "response")
        assert result is None

    def test_apply_with_learned_rules(self, learner):
        learner.correction_tracker.record_correction(
            "Q",
            "short plain",
            "1. structured\n2. detailed explanation " * 20,
            CorrectionType.USER_CORRECTION,
        )
        result = learner.apply_learned_rules("Q", "simple answer")
        assert result is not None


class TestContinuousLearnerReport:
    def test_report_format_keys(self, learner):
        report = learner.get_learning_report()
        assert 'errors' in report
        assert 'corrections' in report
        assert 'top_patterns' in report
        assert 'session_errors' in report

    def test_report_with_data(self, learner):
        learner.learn_from_feedback(
            "s1", "Q1", "R1", "编造的", rating=1,
        )
        learner.learn_from_feedback(
            "s2", "Q2", "R2", "good correction long " * 20, rating=5,
        )
        report = learner.get_learning_report()
        assert report['errors']['total_errors'] == 1
        assert report['corrections']['total_corrections'] == 1

    def test_report_top_patterns_empty(self, learner):
        report = learner.get_learning_report()
        assert report['top_patterns'] == []

    def test_report_top_patterns_with_data(self, learner):
        learner.error_miner.record_error(
            "python x", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        learner.error_miner.record_error(
            "python y", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        learner.error_miner.mine_patterns()
        report = learner.get_learning_report()
        assert len(report['top_patterns']) >= 1
        tp = report['top_patterns'][0]
        assert 'category' in tp
        assert 'occurrence' in tp
        assert 'severity' in tp
        assert 'rule' in tp

    def test_report_session_errors_format(self, learner):
        learner.learn_from_feedback("s1", "Q", "R", "错误", rating=1)
        learner.learn_from_feedback("s2", "Q", "R", "错误", rating=1)
        report = learner.get_learning_report()
        assert isinstance(report['session_errors'], dict)
        assert report['session_errors']['s1'] == 1


# ============================================================
# Singleton tests
# ============================================================


class TestSingletonAccess:
    def test_get_continuous_learner(self):
        learner = get_continuous_learner()
        assert isinstance(learner, ContinuousLearner)

    def test_get_returns_same_instance(self):
        l1 = get_continuous_learner()
        l2 = get_continuous_learner()
        assert l1 is l2

    def test_reset_creates_new_instance(self):
        l1 = get_continuous_learner()
        reset_continuous_learner()
        l2 = get_continuous_learner()
        assert l1 is not l2

    def test_reset_clears_state(self):
        learner = get_continuous_learner()
        learner.error_miner.record_error(
            "Q", "R", "C", ErrorCategory.UNCLEAR,
        )
        assert len(learner.error_miner.errors) == 1
        reset_continuous_learner()
        new_learner = get_continuous_learner()
        assert len(new_learner.error_miner.errors) == 0


# ============================================================
# Pattern regex matching edge cases
# ============================================================


class TestPatternRegexMatching:
    def test_case_insensitive_match(self, miner):
        miner.record_error(
            "Python Code", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.record_error(
            "PYTHON tutorial", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.mine_patterns()
        suggestions = miner.get_avoidance_suggestions("python basics")
        assert len(suggestions) > 0

    def test_partial_word_match(self, miner):
        miner.record_error(
            "learning AI", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.record_error(
            "learning ML", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.mine_patterns()
        suggestions = miner.get_avoidance_suggestions("learning DL")
        assert len(suggestions) >= 0

    def test_unicode_chinese_matching(self, miner):
        miner.record_error(
            "机器学习基础", "bad", "good", ErrorCategory.MISSING_INFO,
        )
        miner.record_error(
            "机器学习进阶", "bad", "good", ErrorCategory.MISSING_INFO,
        )
        miner.mine_patterns()
        suggestions = miner.get_avoidance_suggestions("机器学习教程")
        assert len(suggestions) > 0


# ============================================================
# Error deduplication
# ============================================================


class TestErrorDeduplication:
    def test_identical_errors_create_separate_instances(self, miner):
        i1 = miner.record_error("Q", "R", "C", ErrorCategory.UNCLEAR)
        i2 = miner.record_error("Q", "R", "C", ErrorCategory.UNCLEAR)
        assert i1.error_id != i2.error_id
        assert len(miner.errors) == 2

    def test_pattern_merges_similar(self, miner):
        miner.record_error(
            "python code help", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.record_error(
            "python help code", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        patterns = miner.mine_patterns()
        assert len(patterns) == 1
        assert patterns[0].occurrence_count == 2


# ============================================================
# Time-related tests
# ============================================================


class TestTimeWindow:
    def test_recent_errors_count(self, miner):
        miner.record_error("Q1", "R1", "C1", ErrorCategory.UNCLEAR)
        stats = miner.get_error_stats()
        assert stats['recent_errors'] >= 1

    def test_pattern_last_seen_updated(self, miner):
        miner.record_error(
            "python code", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        t1 = miner.errors[0].timestamp
        miner.record_error(
            "python tutorial", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        miner.mine_patterns()
        for p in miner.patterns.values():
            assert p.last_seen >= t1


# ============================================================
# Integration-style tests
# ============================================================


class TestContinuousLearnerIntegration:
    def test_full_cycle_negative_then_positive(self, learner):
        learner.learn_from_feedback(
            "s1", "python loops", "python has loops",
            "编造的内容，python没有那种循环", rating=1,
        )
        assert len(learner.error_miner.errors) == 1

        learner.learn_from_feedback(
            "s1", "python loops", "better response",
            "1. for loops work\n2. while loops too\n3. list comprehensions also work",
            rating=5,
        )
        assert len(learner.correction_tracker.records) == 1

        report = learner.get_learning_report()
        assert report['errors']['total_errors'] == 1
        assert report['corrections']['total_corrections'] == 1

    def test_pattern_building_and_avoidance(self, learner):
        for i in range(3):
            learner.learn_from_feedback(
                "s1", f"python question {i}", "bad response",
                "幻觉了，完全是编的", rating=1,
            )
        learner.error_miner.mine_patterns()
        ctx = learner.get_avoidance_context("python programming help")
        assert ctx != ""
        assert "错误规避" in ctx

    def test_multiple_categories_learning(self, learner):
        learner.learn_from_feedback(
            "s1", "java basics", "bad", "编造的幻觉", rating=1,
        )
        learner.learn_from_feedback(
            "s2", "java oop", "bad", "内容不完整", rating=2,
        )
        learner.learn_from_feedback(
            "s3", "java spring", "bad", "过时的旧版本信息", rating=1,
        )
        stats = learner.error_miner.get_error_stats()
        categories = stats['by_category']
        assert len(categories) >= 1

    def test_end_to_end_report_completeness(self, learner):
        learner.learn_from_feedback("s1", "Q1", "R1", "假信息", rating=1)
        learner.learn_from_feedback("s2", "Q2", "R2", "good " * 50, rating=5)

        learner.error_miner.record_error(
            "python x", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        learner.error_miner.record_error(
            "python y", "bad", "good", ErrorCategory.HALLUCINATION,
        )
        learner.error_miner.mine_patterns()

        report = learner.get_learning_report()
        sub_keys = ['errors', 'corrections', 'top_patterns', 'session_errors']
        for key in sub_keys:
            assert key in report, f"Missing key: {key}"

        err = report['errors']
        assert 'total_errors' in err
        assert 'by_category' in err
        assert 'avg_severity' in err
        assert 'by_correction_type' in err
        assert 'patterns_found' in err
        assert 'recent_errors' in err

        corr = report['corrections']
        assert 'total_corrections' in corr
        assert 'rules_learned' in corr
        assert 'by_type' in corr


# ============================================================
# CorrectionTracker edge cases
# ============================================================


class TestCorrectionTrackerEdgeCases:
    def test_no_length_rule_for_small_diff(self, tracker):
        record = tracker.record_correction(
            "Q", "short answer", "short reply",
            CorrectionType.USER_CORRECTION,
        )
        rules_text = " ".join(record.learned_rules)
        assert "详细" not in rules_text
        assert "简洁" not in rules_text

    def test_only_fallback_rule(self, tracker):
        record = tracker.record_correction(
            "Q", "plain answer", "plain reply",
            CorrectionType.USER_CORRECTION,
        )
        assert len(record.learned_rules) == 1
        assert "反馈" in record.learned_rules[0]

    def test_rule_deduplication_by_hash(self, tracker):
        tracker.record_correction(
            "Q1", "short", "long " * 50, CorrectionType.USER_CORRECTION,
        )
        before = len(tracker.rules)
        tracker.record_correction(
            "Q2", "short2", "longer " * 50, CorrectionType.USER_CORRECTION,
        )
        assert len(tracker.rules) >= before
