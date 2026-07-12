"""
Tests for src/cee/app/engine/reflect.py — Self-Reflection Metacognition Engine.
"""
import sys

sys.path.insert(0, "/workspace/src")

import pytest

from cee.app.engine.reflect import (
    ConfidenceLevel,
    MetacognitiveMonitor,
    MetacognitiveState,
    ReflectionDimension,
    ReflectionLoop,
    ReflectionResult,
    SelfCritic,
    get_metacognitive_monitor,
    get_reflect_engine,
    reset_singletons,
)


# ============================================================
# Fixtures
# ============================================================


@pytest.fixture(autouse=True)
def _reset_singletons():
    reset_singletons()
    yield
    reset_singletons()


@pytest.fixture
def critic():
    return SelfCritic()


@pytest.fixture
def loop():
    return ReflectionLoop(max_iterations=3, improvement_threshold=0.7)


@pytest.fixture
def monitor():
    return MetacognitiveMonitor()


# ============================================================
# ReflectionDimension Enum
# ============================================================


class TestReflectionDimension:
    def test_all_dimensions_exist(self):
        dims = set(d.value for d in ReflectionDimension)
        assert "accuracy" in dims
        assert "completeness" in dims
        assert "clarity" in dims
        assert "relevance" in dims
        assert "conciseness" in dims
        assert "consistency" in dims
        assert "helpfulness" in dims

    def test_dimension_count(self):
        assert len(list(ReflectionDimension)) == 7


# ============================================================
# ConfidenceLevel Enum
# ============================================================


class TestConfidenceLevel:
    def test_high_from_score(self):
        assert ConfidenceLevel.from_score(0.9) == ConfidenceLevel.HIGH
        assert ConfidenceLevel.from_score(0.81) == ConfidenceLevel.HIGH

    def test_medium_from_score(self):
        assert ConfidenceLevel.from_score(0.6) == ConfidenceLevel.MEDIUM
        assert ConfidenceLevel.from_score(0.51) == ConfidenceLevel.MEDIUM
        assert ConfidenceLevel.from_score(0.8) == ConfidenceLevel.MEDIUM

    def test_low_from_score(self):
        assert ConfidenceLevel.from_score(0.4) == ConfidenceLevel.LOW
        assert ConfidenceLevel.from_score(0.31) == ConfidenceLevel.LOW
        assert ConfidenceLevel.from_score(0.5) == ConfidenceLevel.LOW

    def test_unsure_from_score(self):
        assert ConfidenceLevel.from_score(0.1) == ConfidenceLevel.UNSURE
        assert ConfidenceLevel.from_score(0.0) == ConfidenceLevel.UNSURE
        assert ConfidenceLevel.from_score(0.3) == ConfidenceLevel.UNSURE

    def test_all_levels_have_value(self):
        for level in ConfidenceLevel:
            assert isinstance(level.value, str)
            assert len(level.value) > 0


# ============================================================
# ReflectionResult Dataclass
# ============================================================


class TestReflectionResult:
    def test_default_values(self):
        r = ReflectionResult(
            dimension_scores={"accuracy": 0.8},
            overall_score=0.8,
            confidence=ConfidenceLevel.HIGH,
            issues=[],
            suggestions=[],
        )
        assert r.improved_version is None
        assert r.iteration_count == 0

    def test_with_improved_version(self):
        r = ReflectionResult(
            dimension_scores={"accuracy": 0.9},
            overall_score=0.9,
            confidence=ConfidenceLevel.HIGH,
            issues=[],
            suggestions=[],
            improved_version="improved text",
            iteration_count=2,
        )
        assert r.improved_version == "improved text"
        assert r.iteration_count == 2

    def test_dimension_scores_mutable(self):
        scores = {"accuracy": 0.5, "clarity": 0.6}
        r = ReflectionResult(
            dimension_scores=scores,
            overall_score=0.55,
            confidence=ConfidenceLevel.MEDIUM,
            issues=[],
            suggestions=[],
        )
        r.dimension_scores["accuracy"] = 0.9
        assert r.dimension_scores["accuracy"] == 0.9


# ============================================================
# MetacognitiveState Dataclass
# ============================================================


class TestMetacognitiveState:
    def test_default_initialization(self):
        state = MetacognitiveState(session_id="test")
        assert state.session_id == "test"
        assert state.total_reflections == 0
        assert state.avg_scores == {}
        assert state.improvement_trend == []
        assert state.patterns == {}

    def test_custom_initialization(self):
        state = MetacognitiveState(
            session_id="s1",
            total_reflections=5,
            avg_scores={"accuracy": 0.8},
            improvement_trend=[0.5, 0.6, 0.7],
            patterns={"clarity: issue": 3},
        )
        assert state.total_reflections == 5
        assert state.avg_scores["accuracy"] == 0.8
        assert len(state.improvement_trend) == 3
        assert state.patterns["clarity: issue"] == 3


# ============================================================
# SelfCritic — Core Evaluation
# ============================================================


class TestSelfCriticEvaluate:
    def test_returns_reflection_result(self, critic):
        result = critic.evaluate("test query", "test response")
        assert isinstance(result, ReflectionResult)

    def test_all_dimensions_present(self, critic):
        result = critic.evaluate("test", "response")
        for dim in ReflectionDimension:
            assert dim.value in result.dimension_scores

    def test_scores_between_zero_and_one(self, critic):
        result = critic.evaluate("query", "response" * 20)
        for score in result.dimension_scores.values():
            assert 0.0 <= score <= 1.0

    def test_overall_score_is_composite(self, critic):
        result = critic.evaluate("query", "short response")
        assert 0.0 <= result.overall_score <= 1.0

    def test_issues_and_suggestions_are_lists(self, critic):
        result = critic.evaluate("query", "r")
        assert isinstance(result.issues, list)
        assert isinstance(result.suggestions, list)
        assert len(result.issues) == len(result.suggestions)

    def test_confidence_is_confidence_level(self, critic):
        result = critic.evaluate("query", "meaningful response " * 10)
        assert isinstance(result.confidence, ConfidenceLevel)


class TestSelfCriticAccuracy:
    def test_short_response_low_accuracy(self, critic):
        score = critic._check_accuracy("query", "short")
        assert score == 0.4

    def test_normal_response_moderate_accuracy(self, critic):
        score = critic._check_accuracy(
            "query",
            "This is a normal response with enough text to pass the length check for accuracy evaluation in the system.",
        )
        assert 0.4 <= score <= 1.0

    def test_hedging_reduces_score(self, critic):
        base = critic._check_accuracy(
            "q",
            "This is a solid response with numbers 1 2 3 4 5. "
            "It provides specific details about the topic. "
            "The answer is clear and well-structured. " * 3,
        )
        hedged = critic._check_accuracy(
            "q",
            "可能这个答案大概也许 maybe perhaps 不确定了 maybe "
            "可能 maybe perhaps 不确定了 maybe "
            "This is a solid response with numbers 1 2 3 4 5. "
            "It provides specific details. " * 3,
        )
        assert hedged < base

    def test_concrete_patterns_improve_score(self, critic):
        score = critic._check_accuracy(
            "q",
            "The data shows 150 users, 23 errors, 99% uptime, "
            "4 servers responding in 200ms. "
            "The data shows values. " * 3,
        )
        assert score >= 0.7

    def test_accuracy_bound_between_point_one_and_one(self, critic):
        score = critic._check_accuracy("q", "x")
        assert 0.1 <= score <= 1.0


class TestSelfCriticCompleteness:
    def test_very_short_is_low(self, critic):
        score = critic._check_completeness("q", "short")
        assert score == 0.3

    def test_below_300_medium_low(self, critic):
        score = critic._check_completeness("q", "x" * 150)
        assert score == 0.5

    def test_below_500_medium_high(self, critic):
        score = critic._check_completeness("q", "x" * 350)
        assert score == 0.7

    def test_above_500_high(self, critic):
        score = critic._check_completeness("q", "x" * 600)
        assert score == 0.85


class TestSelfCriticClarity:
    def test_empty_returns_minimum(self, critic):
        score = critic._check_clarity("")
        assert score == 0.3

    def test_short_sentences_high_score(self, critic):
        score = critic._check_clarity(
            "This is short. Another short sentence. One more."
        )
        assert score == 0.9

    def test_long_sentences_reduce_score(self, critic):
        long_sentence = (
            "This is an extremely long sentence that goes on and on "
            "without any punctuation to break it up into manageable "
            "chunks for the reader to parse efficiently. " * 3
        )
        score = critic._check_clarity(long_sentence)
        assert score <= 0.7

    def test_medium_sentences_moderate_score(self, critic):
        medium = (
            "Here is a medium length sentence about something interesting. "
            "Another medium length sentence about something else." * 2
        )
        score = critic._check_clarity(medium)
        assert score >= 0.7


class TestSelfCriticRelevance:
    def test_exact_match_high_relevance(self, critic):
        score = critic._check_relevance(
            "python programming language",
            "python is a programming language used widely",
        )
        assert score > 0.5

    def test_no_overlap_low_relevance(self, critic):
        score = critic._check_relevance(
            "quantum physics theory",
            "baking chocolate cake recipe kitchen",
        )
        assert score < 0.5

    def test_empty_query_full_relevance(self, critic):
        score = critic._check_relevance("", "some response text")
        assert score == 1.0

    def test_caps_at_one(self, critic):
        score = critic._check_relevance("test", "test test test test test")
        assert 0.0 <= score <= 1.0


class TestSelfCriticConciseness:
    def test_very_short_high(self, critic):
        score = critic._check_conciseness("x" * 50)
        assert score == 0.9

    def test_medium_high(self, critic):
        score = critic._check_conciseness("x" * 200)
        assert score == 0.8

    def test_medium_low(self, critic):
        score = critic._check_conciseness("x" * 400)
        assert score == 0.6

    def test_long_low(self, critic):
        score = critic._check_conciseness("x" * 600)
        assert score == 0.4


class TestSelfCriticHelpfulness:
    def test_no_actionable_no_explanation_moderate(self, critic):
        score = critic._check_helpfulness("q", "just a plain response")
        assert score == 0.5

    def test_with_actionable_higher(self, critic):
        score = critic._check_helpfulness(
            "q", "我建议你可以试试这个步骤 first example here"
        )
        assert score >= 0.7

    def test_with_explanation_higher(self, critic):
        score = critic._check_helpfulness(
            "q", "这个结果的原因是 because therefore 所以 this happened"
        )
        assert score >= 0.6

    def test_many_actionable_max(self, critic):
        score = critic._check_helpfulness(
            "q",
            "建议你试试这个 推荐 步骤 example step try because therefore",
        )
        assert score == pytest.approx(0.9)


class TestSelfCriticConsistency:
    def test_no_context_default(self, critic):
        score = critic._check_consistency("response", None)
        assert score == 0.8

    def test_with_context_no_contradiction(self, critic):
        score = critic._check_consistency(
            "the sky is blue", "the ocean is deep"
        )
        assert score == 0.9

    def test_contradiction_detected(self, critic):
        score = critic._check_consistency(
            "这是可以做到的 yes this works",
            "这是不可以做到的",
        )
        assert score < 0.9


# ============================================================
# SelfCritic — Edge Cases
# ============================================================


class TestSelfCriticEdgeCases:
    def test_empty_response(self, critic):
        result = critic.evaluate("query", "")
        assert isinstance(result, ReflectionResult)
        assert result.overall_score >= 0.0

    def test_empty_query(self, critic):
        result = critic.evaluate("", "some response here that is long enough")
        assert isinstance(result, ReflectionResult)

    def test_very_long_text(self, critic):
        long_text = "The quick brown fox jumps over the lazy dog. " * 500
        result = critic.evaluate("fox dog", long_text)
        assert isinstance(result, ReflectionResult)
        assert result.dimension_scores["conciseness"] <= 0.5

    def test_mixed_language(self, critic):
        result = critic.evaluate(
            "how to learn python",
            "学习 Python 最好的方式是 practice 并且 build projects。"
            "你可以从 small scripts 开始然后逐渐 move to larger ones。"
            "建议每天坚持 coding 至少一小时。because 实践 practice是最重要的。"
            "这个步骤 example 建议 you try step 1 2 3。"
            "因此所以 because therefore 需要多练习。" * 3,
        )
        assert isinstance(result, ReflectionResult)

    def test_pure_chinese(self, critic):
        result = critic.evaluate(
            "如何学好编程",
            "学好编程的最好方法就是多写代码。"
            "你需要从简单的项目开始，逐步增加难度。"
            "建议你每天至少花一小时来练习。"
            "例如，你可以尝试写一个简单的计算器程序。"
            "因为实践是检验真理的唯一标准，所以多练习一定会有收获。"
            "推荐你参考一些在线教程和开源项目。" * 3,
        )
        assert isinstance(result, ReflectionResult)
        assert result.dimension_scores["helpfulness"] >= 0.7

    def test_response_with_newlines_and_special_chars(self, critic):
        result = critic.evaluate(
            "code review",
            "def foo():\n    return 42\n\n"
            "This function is simple and works well. "
            "It has a clear purpose and returns an integer. "
            "The naming could be improved but it's functional. "
            "I suggest renaming it to get_answer(). "
            "For example, you can call it like foo() to get 42. "
            "This is a good example of simple code. "
            "Therefore, because it works, it's acceptable. " * 2,
        )
        assert isinstance(result, ReflectionResult)


# ============================================================
# ReflectionLoop
# ============================================================


class TestReflectionLoopBasic:
    def test_returns_reflection_result(self, loop):
        result = loop.reflect_and_improve(
            "query", "a substantial response with enough content " * 10
        )
        assert isinstance(result, ReflectionResult)

    def test_history_populated(self, loop):
        loop.reflect_and_improve("q", "response " * 20)
        assert len(loop.history) >= 1

    def test_good_response_above_threshold_no_iteration(self, loop):
        loop.improvement_threshold = 0.0
        result = loop.reflect_and_improve(
            "python programming guide",
            "Python is a versatile language. "
            "建议 you learn it with practice. "
            "推荐 starting with basic 123 examples. "
            "步骤 1 2 3 will guide you. "
            "因为 practice is key therefore 所以 do it daily. " * 5,
        )
        assert "improved_version" in result.__dict__
        assert result.iteration_count == 0

    def test_get_trend_returns_scores(self, loop):
        loop.reflect_and_improve("q", "a" * 200)
        loop.reflect_and_improve("q", "b" * 200)
        trend = loop.get_trend()
        assert len(trend) >= 1
        assert all(isinstance(s, float) for s in trend)

    def test_reset_clears_history(self, loop):
        loop.reflect_and_improve("q", "x" * 200)
        assert len(loop.history) > 0
        loop.reset()
        assert len(loop.history) == 0

    def test_custom_critic(self):
        custom = SelfCritic()
        loop = ReflectionLoop(critic=custom)
        assert loop.critic is custom

    def test_custom_max_iterations(self):
        loop = ReflectionLoop(max_iterations=5)
        assert loop.max_iterations == 5

    def test_custom_threshold(self):
        loop = ReflectionLoop(improvement_threshold=0.9)
        assert loop.improvement_threshold == 0.9


class TestReflectionLoopImprovement:
    def test_improvement_generated_for_low_score(self, loop):
        loop.improvement_threshold = 0.95
        result = loop.reflect_and_improve(
            "test query for improvement",
            "short",
        )
        result2 = loop.history[-1]
        assert result2.overall_score < loop.improvement_threshold

    def test_improvement_adds_example(self, loop):
        result = loop._generate_improvement(
            "how to learn fast",
            "just practice a lot and you will get better",
            ReflectionResult(
                dimension_scores={"accuracy": 0.3},
                overall_score=0.3,
                confidence=ConfidenceLevel.UNSURE,
                issues=["accuracy: Response lacks concrete claims"],
                suggestions=["Add facts"],
            ),
        )
        assert result is not None
        assert "例如" in result

    def test_improvement_truncates_for_clarity(self, loop):
        long_resp = (
            "Sentence one about the topic. "
            "Sentence two about the topic. "
            "Sentence three about the topic. "
            "Sentence four about the topic. "
            "Sentence five about the topic. "
            "Sentence six about the topic. "
            "Sentence seven about the topic. "
            "Sentence eight about the topic. "
            "Sentence nine about the topic. "
            "Sentence ten about the topic."
        ) * 5
        result = loop._generate_improvement(
            "query",
            long_resp,
            ReflectionResult(
                dimension_scores={"clarity": 0.4},
                overall_score=0.4,
                confidence=ConfidenceLevel.LOW,
                issues=["clarity: Sentences too long"],
                suggestions=["Break sentences"],
            ),
        )
        assert result is not None
        assert len(result) < len(long_resp)

    def test_no_improvement_without_issues(self, loop):
        result = loop._generate_improvement(
            "q",
            "response",
            ReflectionResult(
                dimension_scores={"accuracy": 0.9},
                overall_score=0.9,
                confidence=ConfidenceLevel.HIGH,
                issues=[],
                suggestions=[],
            ),
        )
        assert result is None


class TestReflectionLoopIterations:
    def test_iterations_up_to_max(self, loop):
        loop.max_iterations = 2
        loop.improvement_threshold = 1.0
        result = loop.reflect_and_improve("q", "very short response")
        assert result.iteration_count <= 2

    def test_stops_when_no_improvement_possible(self, loop):
        loop.max_iterations = 5
        loop.improvement_threshold = 1.0
        result = loop.reflect_and_improve("q", "short")
        assert result.iteration_count < 5


# ============================================================
# MetacognitiveMonitor
# ============================================================


class TestMetacognitiveMonitorRecord:
    def test_record_creates_session(self, monitor):
        result = ReflectionResult(
            dimension_scores={"accuracy": 0.8, "clarity": 0.7},
            overall_score=0.75,
            confidence=ConfidenceLevel.MEDIUM,
            issues=["clarity: issue"],
            suggestions=["fix it"],
        )
        monitor.record_reflection("s1", result)
        assert "s1" in monitor.sessions
        assert monitor.sessions["s1"].total_reflections == 1

    def test_record_accumulates(self, monitor):
        r1 = ReflectionResult(
            dimension_scores={"accuracy": 0.8},
            overall_score=0.8,
            confidence=ConfidenceLevel.HIGH,
            issues=["acc: problem"],
            suggestions=["fix"],
        )
        r2 = ReflectionResult(
            dimension_scores={"accuracy": 0.9},
            overall_score=0.9,
            confidence=ConfidenceLevel.HIGH,
            issues=["acc: problem"],
            suggestions=["fix"],
        )
        monitor.record_reflection("s1", r1)
        monitor.record_reflection("s1", r2)
        assert monitor.sessions["s1"].total_reflections == 2
        assert len(monitor.sessions["s1"].improvement_trend) == 2

    def test_avg_scores_update_correctly(self, monitor):
        r1 = ReflectionResult(
            dimension_scores={"accuracy": 0.5, "clarity": 1.0},
            overall_score=0.75,
            confidence=ConfidenceLevel.MEDIUM,
            issues=[],
            suggestions=[],
        )
        r2 = ReflectionResult(
            dimension_scores={"accuracy": 0.9, "clarity": 0.6},
            overall_score=0.75,
            confidence=ConfidenceLevel.MEDIUM,
            issues=[],
            suggestions=[],
        )
        monitor.record_reflection("s1", r1)
        monitor.record_reflection("s1", r2)
        state = monitor.sessions["s1"]
        assert state.avg_scores["accuracy"] == pytest.approx(0.7)
        assert state.avg_scores["clarity"] == pytest.approx(0.8)

    def test_patterns_track_issues(self, monitor):
        r = ReflectionResult(
            dimension_scores={"accuracy": 0.3},
            overall_score=0.3,
            confidence=ConfidenceLevel.UNSURE,
            issues=["accuracy: Response contains hedging"],
            suggestions=["fix hedging"],
        )
        monitor.record_reflection("s1", r)
        monitor.record_reflection("s1", r)
        state = monitor.sessions["s1"]
        assert (
            state.patterns["accuracy: Response contains hedging"] == 2
        )


class TestMetacognitiveMonitorReports:
    def test_session_report_empty_for_unknown(self, monitor):
        report = monitor.get_session_report("nonexistent")
        assert report == {}

    def test_session_report_has_all_keys(self, monitor):
        r = ReflectionResult(
            dimension_scores={"accuracy": 0.8},
            overall_score=0.8,
            confidence=ConfidenceLevel.HIGH,
            issues=["issue one"],
            suggestions=["sug one"],
        )
        monitor.record_reflection("s1", r)
        report = monitor.get_session_report("s1")
        assert "session_id" in report
        assert "total_reflections" in report
        assert "average_scores" in report
        assert "trend" in report
        assert "top_issues" in report
        assert "trend_direction" in report

    def test_trend_direction_initial(self, monitor):
        r = ReflectionResult(
            dimension_scores={"accuracy": 0.8},
            overall_score=0.8,
            confidence=ConfidenceLevel.HIGH,
            issues=[],
            suggestions=[],
        )
        monitor.record_reflection("s1", r)
        report = monitor.get_session_report("s1")
        assert report["trend_direction"] == "initial"

    def test_trend_direction_improving(self, monitor):
        r1 = ReflectionResult(
            dimension_scores={"accuracy": 0.6},
            overall_score=0.6,
            confidence=ConfidenceLevel.MEDIUM,
            issues=[],
            suggestions=[],
        )
        r2 = ReflectionResult(
            dimension_scores={"accuracy": 0.85},
            overall_score=0.85,
            confidence=ConfidenceLevel.HIGH,
            issues=[],
            suggestions=[],
        )
        monitor.record_reflection("s1", r1)
        monitor.record_reflection("s1", r2)
        report = monitor.get_session_report("s1")
        assert report["trend_direction"] == "improving"

    def test_trend_direction_degrading(self, monitor):
        r1 = ReflectionResult(
            dimension_scores={"accuracy": 0.85},
            overall_score=0.85,
            confidence=ConfidenceLevel.HIGH,
            issues=[],
            suggestions=[],
        )
        r2 = ReflectionResult(
            dimension_scores={"accuracy": 0.55},
            overall_score=0.55,
            confidence=ConfidenceLevel.MEDIUM,
            issues=[],
            suggestions=[],
        )
        monitor.record_reflection("s1", r1)
        monitor.record_reflection("s1", r2)
        report = monitor.get_session_report("s1")
        assert report["trend_direction"] == "degrading"

    def test_trend_direction_stable(self, monitor):
        r1 = ReflectionResult(
            dimension_scores={"accuracy": 0.8},
            overall_score=0.8,
            confidence=ConfidenceLevel.HIGH,
            issues=[],
            suggestions=[],
        )
        r2 = ReflectionResult(
            dimension_scores={"accuracy": 0.8},
            overall_score=0.8,
            confidence=ConfidenceLevel.HIGH,
            issues=[],
            suggestions=[],
        )
        monitor.record_reflection("s1", r1)
        monitor.record_reflection("s1", r2)
        report = monitor.get_session_report("s1")
        assert report["trend_direction"] == "stable"

    def test_top_issues_sorted(self, monitor):
        for _ in range(3):
            monitor.record_reflection(
                "s1",
                ReflectionResult(
                    dimension_scores={"accuracy": 0.3},
                    overall_score=0.3,
                    confidence=ConfidenceLevel.UNSURE,
                    issues=["frequent issue"],
                    suggestions=["fix"],
                ),
            )
        for _ in range(1):
            monitor.record_reflection(
                "s1",
                ReflectionResult(
                    dimension_scores={"accuracy": 0.5},
                    overall_score=0.5,
                    confidence=ConfidenceLevel.LOW,
                    issues=["rare issue"],
                    suggestions=["fix"],
                ),
            )
        report = monitor.get_session_report("s1")
        assert report["top_issues"][0][1] == 3
        assert report["top_issues"][1][1] == 1

    def test_trend_returned_last_ten(self, monitor):
        for i in range(15):
            monitor.record_reflection(
                "s1",
                ReflectionResult(
                    dimension_scores={"accuracy": 0.5 + i * 0.01},
                    overall_score=0.5 + i * 0.01,
                    confidence=ConfidenceLevel.MEDIUM if i < 5 else ConfidenceLevel.HIGH,
                    issues=[],
                    suggestions=[],
                ),
            )
        report = monitor.get_session_report("s1")
        assert len(report["trend"]) <= 10


class TestMetacognitiveMonitorGlobal:
    def test_global_stats_empty(self, monitor):
        stats = monitor.get_global_stats()
        assert stats["total_sessions"] == 0
        assert stats["total_reflections"] == 0

    def test_global_stats_with_data(self, monitor):
        r = ReflectionResult(
            dimension_scores={"accuracy": 0.9, "clarity": 0.7},
            overall_score=0.8,
            confidence=ConfidenceLevel.HIGH,
            issues=[],
            suggestions=[],
        )
        monitor.record_reflection("s1", r)
        monitor.record_reflection("s2", r)
        stats = monitor.get_global_stats()
        assert stats["total_sessions"] == 2
        assert stats["total_reflections"] == 2
        assert "accuracy" in stats["average_scores"]

    def test_global_average_scores_correct(self, monitor):
        r1 = ReflectionResult(
            dimension_scores={"accuracy": 0.5},
            overall_score=0.5,
            confidence=ConfidenceLevel.LOW,
            issues=[],
            suggestions=[],
        )
        r2 = ReflectionResult(
            dimension_scores={"accuracy": 0.9},
            overall_score=0.9,
            confidence=ConfidenceLevel.HIGH,
            issues=[],
            suggestions=[],
        )
        monitor.record_reflection("s1", r1)
        monitor.record_reflection("s2", r2)
        stats = monitor.get_global_stats()
        assert stats["average_scores"]["accuracy"] == pytest.approx(0.7)

    def test_reset_clears_sessions(self, monitor):
        r = ReflectionResult(
            dimension_scores={"accuracy": 0.8},
            overall_score=0.8,
            confidence=ConfidenceLevel.HIGH,
            issues=[],
            suggestions=[],
        )
        monitor.record_reflection("s1", r)
        assert len(monitor.sessions) > 0
        monitor.reset()
        assert len(monitor.sessions) == 0


# ============================================================
# Singleton Access
# ============================================================


class TestSingletonAccess:
    def test_get_reflect_engine_returns_loop(self):
        engine = get_reflect_engine()
        assert isinstance(engine, ReflectionLoop)

    def test_get_reflect_engine_same_instance(self):
        e1 = get_reflect_engine()
        e2 = get_reflect_engine()
        assert e1 is e2

    def test_get_monitor_returns_monitor(self):
        m = get_metacognitive_monitor()
        assert isinstance(m, MetacognitiveMonitor)

    def test_get_monitor_same_instance(self):
        m1 = get_metacognitive_monitor()
        m2 = get_metacognitive_monitor()
        assert m1 is m2

    def test_reset_changes_engine_instance(self):
        e1 = get_reflect_engine()
        reset_singletons()
        e2 = get_reflect_engine()
        assert e1 is not e2

    def test_reset_changes_monitor_instance(self):
        m1 = get_metacognitive_monitor()
        reset_singletons()
        m2 = get_metacognitive_monitor()
        assert m1 is not m2


# ============================================================
# Integration Tests
# ============================================================


class TestIntegration:
    def test_full_flow_evaluate_improve_monitor(self):
        reset_singletons()
        engine = get_reflect_engine()
        monitor = get_metacognitive_monitor()

        result = engine.reflect_and_improve(
            "how does python work",
            "short",
        )
        monitor.record_reflection("test_session", result)

        report = monitor.get_session_report("test_session")
        assert report["total_reflections"] == 1

    def test_multiple_sessions_independent(self):
        reset_singletons()
        monitor = get_metacognitive_monitor()

        r1 = ReflectionResult(
            dimension_scores={"accuracy": 0.9},
            overall_score=0.9,
            confidence=ConfidenceLevel.HIGH,
            issues=[],
            suggestions=[],
        )
        r2 = ReflectionResult(
            dimension_scores={"accuracy": 0.3},
            overall_score=0.3,
            confidence=ConfidenceLevel.UNSURE,
            issues=["big problem"],
            suggestions=["fix"],
        )
        monitor.record_reflection("good", r1)
        monitor.record_reflection("bad", r2)

        good_report = monitor.get_session_report("good")
        bad_report = monitor.get_session_report("bad")
        assert good_report["total_reflections"] == 1
        assert bad_report["total_reflections"] == 1
        assert good_report["trend_direction"] == "initial"

    def test_conciseness_improvement(self):
        loop = ReflectionLoop(max_iterations=2, improvement_threshold=0.95)
        long_resp = (
            "Sentence number one here. "
            "Sentence number two here. "
            "Sentence number three here. "
            "Sentence number four here. "
            "Sentence number five here. "
            "Sentence number six here. "
            "Sentence number seven here. "
            "Sentence number eight here."
        ) * 3
        result = loop._generate_improvement(
            "query",
            long_resp,
            ReflectionResult(
                dimension_scores={"conciseness": 0.3},
                overall_score=0.3,
                confidence=ConfidenceLevel.UNSURE,
                issues=["conciseness: Response is unnecessarily long"],
                suggestions=["tighten"],
            ),
        )
        assert result is not None
        assert len(result) < len(long_resp)

    def test_significant_improvement_returns_new_result(self, loop):
        loop.improvement_threshold = 0.95
        result = loop.reflect_and_improve(
            "comprehensive python learning guide",
            "short",
        )
        assert isinstance(result, ReflectionResult)


# ============================================================
# Regression / Smoke
# ============================================================


class TestRegression:
    def test_no_exception_on_unicode(self, critic):
        result = critic.evaluate(
            "测试",
            "\U0001f600 " + "test " * 50,
        )
        assert isinstance(result, ReflectionResult)

    def test_no_exception_on_numbers_only_query(self, critic):
        result = critic.evaluate("12345", "just a normal response" * 10)
        assert isinstance(result, ReflectionResult)

    def test_no_exception_on_whitespace_only(self, critic):
        result = critic.evaluate("   ", "   \n\t " + "content " * 20)
        assert isinstance(result, ReflectionResult)

    def test_process_single_character_response(self, critic):
        result = critic.evaluate("query", "x")
        assert isinstance(result, ReflectionResult)
        assert result.overall_score <= 1.0

    def test_loop_with_zero_max_iterations(self):
        loop = ReflectionLoop(max_iterations=0, improvement_threshold=0.0)
        result = loop.reflect_and_improve("q", "bad")
        assert result.iteration_count == 0
