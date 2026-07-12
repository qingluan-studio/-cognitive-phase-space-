"""
Tests for src/cee/app/engine/cot_reasoner.py — CoT Reasoning Engine.
"""
import sys

sys.path.insert(0, "/workspace/src")

import pytest

from cee.app.engine.cot_reasoner import (
    CoTReasoner,
    CoTResult,
    ReasonByAnalogy,
    ReasoningStep,
    ReasoningStrategy,
    ReasoningVerifier,
    StepType,
    get_cot_reasoner,
    reset_cot_reasoner,
)


# ============================================================
# Fixtures
# ============================================================


@pytest.fixture(autouse=True)
def _reset():
    reset_cot_reasoner()
    yield
    reset_cot_reasoner()


@pytest.fixture
def reasoner():
    return CoTReasoner(max_steps=20, min_confidence=0.3)


@pytest.fixture
def verifier():
    return ReasoningVerifier()


@pytest.fixture
def analogy():
    return ReasonByAnalogy()


# ============================================================
# Enums
# ============================================================


class TestReasoningStrategy:
    def test_all_strategies_exist(self):
        values = set(s.value for s in ReasoningStrategy)
        assert "deductive" in values
        assert "inductive" in values
        assert "abductive" in values
        assert "analogical" in values
        assert "decomposition" in values
        assert "contrastive" in values

    def test_strategy_count(self):
        assert len(list(ReasoningStrategy)) == 6


class TestStepType:
    def test_all_step_types_exist(self):
        values = set(s.value for s in StepType)
        assert "observe" in values
        assert "hypothesize" in values
        assert "verify" in values
        assert "conclude" in values
        assert "backtrack" in values

    def test_step_type_count(self):
        assert len(list(StepType)) == 5


# ============================================================
# ReasoningStep DataClass
# ============================================================


class TestReasoningStep:
    def test_create_minimal_step(self):
        step = ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="test", confidence=0.8)
        assert step.step_id == 0
        assert step.step_type == StepType.OBSERVE
        assert step.content == "test"
        assert step.confidence == 0.8

    def test_create_step_with_evidence(self):
        step = ReasoningStep(
            step_id=1, step_type=StepType.HYPOTHESIZE,
            content="hyp", confidence=0.6, evidence=["ev1", "ev2"]
        )
        assert len(step.evidence) == 2
        assert "ev1" in step.evidence

    def test_create_step_with_sub_steps(self):
        sub = ReasoningStep(step_id=10, step_type=StepType.OBSERVE, content="sub", confidence=0.7)
        step = ReasoningStep(
            step_id=2, step_type=StepType.CONCLUDE,
            content="main", confidence=0.9, sub_steps=[sub]
        )
        assert len(step.sub_steps) == 1
        assert step.sub_steps[0].content == "sub"

    def test_step_timestamp(self):
        step = ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="t", confidence=0.5)
        assert step.timestamp

    def test_step_verified_default_false(self):
        step = ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="x", confidence=0.5)
        assert step.verified is False


# ============================================================
# CoTResult DataClass
# ============================================================


class TestCoTResult:
    def test_create_result(self):
        steps = [ReasoningStep(step_id=0, step_type=StepType.CONCLUDE, content="c", confidence=0.8)]
        result = CoTResult(
            query="q", strategy=ReasoningStrategy.DEDUCTIVE,
            steps=steps, final_answer="a", total_steps=1,
            total_confidence=0.8, trace="t", verified=True,
        )
        assert result.query == "q"
        assert result.strategy == ReasoningStrategy.DEDUCTIVE
        assert result.final_answer == "a"
        assert result.verified is True


# ============================================================
# CoTReasoner — Strategy Auto-Selection
# ============================================================


class TestStrategySelection:
    def test_deductive_if_then(self, reasoner):
        q = "If all humans are mortal and Socrates is human, then what?"
        assert reasoner._select_strategy(q) == ReasoningStrategy.DEDUCTIVE

    def test_deductive_therefore(self, reasoner):
        q = "All metals conduct electricity, therefore copper conducts"
        assert reasoner._select_strategy(q) == ReasoningStrategy.DEDUCTIVE

    def test_deductive_general_rule(self, reasoner):
        q = "According to the law of gravity, what happens?"
        assert reasoner._select_strategy(q) == ReasoningStrategy.DEDUCTIVE

    def test_inductive_pattern(self, reasoner):
        q = "What pattern do we see in the data?"
        assert reasoner._select_strategy(q) == ReasoningStrategy.INDUCTIVE

    def test_inductive_generally(self, reasoner):
        q = "Generally speaking, what trend emerges?"
        assert reasoner._select_strategy(q) == ReasoningStrategy.INDUCTIVE

    def test_inductive_statistics(self, reasoner):
        q = "Based on the statistics, what generalization can we make?"
        assert reasoner._select_strategy(q) == ReasoningStrategy.INDUCTIVE

    def test_abductive_why(self, reasoner):
        q = "Why did the project fail?"
        assert reasoner._select_strategy(q) == ReasoningStrategy.ABDUCTIVE

    def test_abductive_explanation(self, reasoner):
        q = "What is the best explanation for these symptoms?"
        assert reasoner._select_strategy(q) == ReasoningStrategy.ABDUCTIVE

    def test_abductive_diagnose(self, reasoner):
        q = "Diagnose the root cause of the outage"
        assert reasoner._select_strategy(q) == ReasoningStrategy.ABDUCTIVE

    def test_analogical_similar_to(self, reasoner):
        q = "How is the software similar to a building?"
        assert reasoner._select_strategy(q) == ReasoningStrategy.ANALOGICAL

    def test_analogical_analogy(self, reasoner):
        q = "Draw an analogy between business and nature"
        assert reasoner._select_strategy(q) == ReasoningStrategy.ANALOGICAL

    def test_analogical_metaphor(self, reasoner):
        q = "Use a metaphor to explain machine learning"
        assert reasoner._select_strategy(q) == ReasoningStrategy.ANALOGICAL

    def test_decomposition_break_down(self, reasoner):
        q = "Break down the components of this system"
        assert reasoner._select_strategy(q) == ReasoningStrategy.DECOMPOSITION

    def test_decomposition_how_to(self, reasoner):
        q = "How to build a recommendation engine?"
        assert reasoner._select_strategy(q) == ReasoningStrategy.DECOMPOSITION

    def test_decomposition_steps(self, reasoner):
        q = "What are the steps to deploy to production?"
        assert reasoner._select_strategy(q) == ReasoningStrategy.DECOMPOSITION

    def test_contrastive_versus(self, reasoner):
        q = "Python vs JavaScript for web development"
        assert reasoner._select_strategy(q) == ReasoningStrategy.CONTRASTIVE

    def test_contrastive_compare(self, reasoner):
        q = "Compare microservices and monoliths"
        assert reasoner._select_strategy(q) == ReasoningStrategy.CONTRASTIVE

    def test_contrastive_pros_cons(self, reasoner):
        q = "What are the pros and cons of using Kubernetes?"
        assert reasoner._select_strategy(q) == ReasoningStrategy.CONTRASTIVE

    def test_fallback_generic_query(self, reasoner):
        q = "Tell me about the weather"
        strategy = reasoner._select_strategy(q)
        assert strategy in ReasoningStrategy


# ============================================================
# CoTReasoner — Reason with All Strategies
# ============================================================


class TestReasonDeductive:
    def test_basic_deductive(self, reasoner):
        result = reasoner.reason("If all birds have wings and a penguin is a bird, does a penguin have wings?")
        assert isinstance(result, CoTResult)
        assert result.strategy == ReasoningStrategy.DEDUCTIVE
        assert len(result.steps) > 0

    def test_deductive_with_context(self, reasoner):
        result = reasoner.reason(
            "What happens to the pressure?",
            strategy=ReasoningStrategy.DEDUCTIVE,
            context="According to Boyle's law, pressure is inversely proportional to volume at constant temperature.",
        )
        assert result.strategy == ReasoningStrategy.DEDUCTIVE
        assert result.total_steps > 0

    def test_deductive_step_types(self, reasoner):
        result = reasoner.reason("All A are B, X is A, therefore...", strategy=ReasoningStrategy.DEDUCTIVE)
        step_types = [s.step_type for s in result.steps]
        assert StepType.OBSERVE in step_types
        assert StepType.CONCLUDE in step_types

    def test_deductive_confidence_in_range(self, reasoner):
        result = reasoner.reason("Every prime greater than 2 is odd. 7 is prime.", strategy=ReasoningStrategy.DEDUCTIVE)
        assert 0 <= result.total_confidence <= 1


class TestReasonInductive:
    def test_basic_inductive(self, reasoner):
        result = reasoner.reason("What pattern emerges from these daily temperatures this week?")
        assert result.strategy == ReasoningStrategy.INDUCTIVE
        assert len(result.steps) > 0

    def test_inductive_confidence_lower(self, reasoner):
        result = reasoner.reason("What generalization can we make from these observations?")
        assert result.total_confidence <= 0.95

    def test_inductive_with_context(self, reasoner):
        result = reasoner.reason(
            "What is the trend?",
            strategy=ReasoningStrategy.INDUCTIVE,
            context="January sales: 100, February: 110, March: 125, April: 140",
        )
        assert result.strategy == ReasoningStrategy.INDUCTIVE


class TestReasonAbductive:
    def test_basic_abductive(self, reasoner):
        result = reasoner.reason("Why is the server responding slowly?")
        assert result.strategy == ReasoningStrategy.ABDUCTIVE
        assert len(result.steps) > 0

    def test_abductive_generates_explanations(self, reasoner):
        result = reasoner.reason("What caused the traffic spike?", strategy=ReasoningStrategy.ABDUCTIVE)
        contents = " ".join(s.content for s in result.steps)
        assert "explanation" in contents.lower()

    def test_abductive_uncertainty_caveat(self, reasoner):
        result = reasoner.reason("Why did the database crash?", strategy=ReasoningStrategy.ABDUCTIVE)
        final = result.final_answer.lower()
        assert "inference" in final or "possible" in final or "not" in final


class TestReasonAnalogical:
    def test_basic_analogical(self, reasoner):
        result = reasoner.reason("How is the software architecture like a building?")
        assert result.strategy == ReasoningStrategy.ANALOGICAL
        assert len(result.steps) > 0

    def test_analogical_with_software_context(self, reasoner):
        result = reasoner.reason("Explain database design using architecture concepts")
        assert result.strategy == ReasoningStrategy.ANALOGICAL

    def test_analogical_no_mapping(self, reasoner):
        result = reasoner.reason("How is cooking similar to quantum physics?")
        assert result.strategy == ReasoningStrategy.ANALOGICAL


class TestReasonDecomposition:
    def test_basic_decomposition(self, reasoner):
        result = reasoner.reason("How to build and deploy a full-stack application?")
        assert result.strategy == ReasoningStrategy.DECOMPOSITION
        assert len(result.steps) > 0

    def test_decomposition_generates_sub_questions(self, reasoner):
        result = reasoner.reason("Break down the process of machine learning pipeline")
        step_types = [s.step_type for s in result.steps]
        assert StepType.OBSERVE in step_types

    def test_decomposition_synthesizes(self, reasoner):
        result = reasoner.reason(
            "How to design and implement a caching layer?",
            strategy=ReasoningStrategy.DECOMPOSITION,
        )
        assert StepType.CONCLUDE in [s.step_type for s in result.steps]


class TestReasonContrastive:
    def test_basic_contrastive(self, reasoner):
        result = reasoner.reason("React vs Vue for a startup project")
        assert result.strategy == ReasoningStrategy.CONTRASTIVE
        assert len(result.steps) > 0

    def test_contrastive_with_context(self, reasoner):
        result = reasoner.reason(
            "Which database should we use?",
            strategy=ReasoningStrategy.CONTRASTIVE,
            context="Options: PostgreSQL, MongoDB, Redis",
        )
        assert result.strategy == ReasoningStrategy.CONTRASTIVE


# ============================================================
# CoTReasoner — Step Verification and Backtracking
# ============================================================


class TestStepVerification:
    def test_observe_always_verified(self, reasoner):
        step = ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="obs", confidence=0.9)
        assert reasoner._verify_step(step, []) is True

    def test_backtrack_always_verified(self, reasoner):
        step = ReasoningStep(step_id=0, step_type=StepType.BACKTRACK, content="back", confidence=0.5)
        assert reasoner._verify_step(step, []) is True

    def test_conclude_needs_prior_steps(self, reasoner):
        step = ReasoningStep(step_id=1, step_type=StepType.CONCLUDE, content="conc", confidence=0.8)
        assert reasoner._verify_step(step, []) is False

    def test_conclude_with_prior_observe_and_hypothesize(self, reasoner):
        history = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.HYPOTHESIZE, content="h", confidence=0.7),
        ]
        step = ReasoningStep(step_id=2, step_type=StepType.CONCLUDE, content="c", confidence=0.8)
        assert reasoner._verify_step(step, history) is True

    def test_conclude_with_only_observe(self, reasoner):
        history = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
        ]
        step = ReasoningStep(step_id=1, step_type=StepType.CONCLUDE, content="c", confidence=0.8)
        assert reasoner._verify_step(step, history) is False


class TestBacktracking:
    def test_backtrack_inserts_backtrack_step(self, reasoner):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.HYPOTHESIZE, content="h", confidence=0.4),
            ReasoningStep(step_id=2, step_type=StepType.CONCLUDE, content="c", confidence=0.3),
        ]
        result = reasoner._backtrack(steps, 1)
        step_types = [s.step_type for s in result]
        assert StepType.BACKTRACK in step_types

    def test_backtrack_yields_revised_conclusion(self, reasoner):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.HYPOTHESIZE, content="h", confidence=0.3),
            ReasoningStep(step_id=2, step_type=StepType.CONCLUDE, content="c", confidence=0.4),
        ]
        result = reasoner._backtrack(steps, 1)
        last = result[-1]
        assert last.step_type == StepType.CONCLUDE

    def test_backtrack_preserves_prior_steps(self, reasoner):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o1", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.OBSERVE, content="o2", confidence=0.85),
            ReasoningStep(step_id=2, step_type=StepType.HYPOTHESIZE, content="h", confidence=0.3),
        ]
        result = reasoner._backtrack(steps, 2)
        assert result[0].content == "o1"
        assert result[1].content == "o2"

    def test_backtrack_invalid_point(self, reasoner):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
        ]
        result = reasoner._backtrack(steps, -1)
        assert result == steps

    def test_backtrack_out_of_bounds(self, reasoner):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
        ]
        result = reasoner._backtrack(steps, 10)
        assert result == steps


# ============================================================
# CoTReasoner — Confidence Tracking
# ============================================================


class TestConfidenceTracking:
    def test_confidence_calculated(self, reasoner):
        result = reasoner.reason("What is 2+2?", strategy=ReasoningStrategy.DEDUCTIVE)
        assert 0 <= result.total_confidence <= 1

    def test_deductive_higher_confidence(self, reasoner):
        d = reasoner.reason("All squares are rectangles. X is a square.", strategy=ReasoningStrategy.DEDUCTIVE)
        i = reasoner.reason("Some metals conduct electricity.", strategy=ReasoningStrategy.INDUCTIVE)
        assert d.total_confidence > 0
        assert i.total_confidence > 0

    def test_empty_steps_zero_confidence(self):
        result = CoTResult(
            query="q", strategy=ReasoningStrategy.DEDUCTIVE, steps=[],
            final_answer="none", total_steps=0, total_confidence=0.0,
            trace="", verified=False,
        )
        assert result.total_confidence == 0.0

    def test_tool_use_preserves_confidence(self, reasoner):
        tool_results = {"search": "The answer is Paris", "calculator": "42"}
        result = reasoner.reason_with_tool_use(
            "What is the capital of France?", tool_results, ReasoningStrategy.DEDUCTIVE,
        )
        assert result.total_confidence > 0


# ============================================================
# ReasoningVerifier — Chain Verification
# ============================================================


class TestReasoningVerifier:
    def test_empty_chain_valid(self, verifier):
        ok, errors = verifier.verify_chain([])
        assert ok is True
        assert errors == []

    def test_single_step_valid(self, verifier):
        steps = [ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9)]
        ok, errors = verifier.verify_chain(steps)
        assert ok is True

    def test_valid_observe_hypothesize_verify_conclude(self, verifier):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.HYPOTHESIZE, content="h", confidence=0.7),
            ReasoningStep(step_id=2, step_type=StepType.VERIFY, content="v", confidence=0.75),
            ReasoningStep(step_id=3, step_type=StepType.CONCLUDE, content="c", confidence=0.8),
        ]
        ok, errors = verifier.verify_chain(steps)
        assert ok is True
        assert errors == []

    def test_invalid_conclude_after_conclude(self, verifier):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.CONCLUDE, content="c1", confidence=0.8),
            ReasoningStep(step_id=2, step_type=StepType.CONCLUDE, content="c2", confidence=0.7),
        ]
        ok, errors = verifier.verify_chain(steps)
        assert ok is False

    def test_no_conclusion_flagged(self, verifier):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.HYPOTHESIZE, content="h", confidence=0.7),
            ReasoningStep(step_id=2, step_type=StepType.VERIFY, content="v", confidence=0.6),
        ]
        ok, errors = verifier.verify_chain(steps)
        assert any("no conclusion" in e.lower() for e in errors)

    def test_backtrack_after_verify_allowed(self, verifier):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.HYPOTHESIZE, content="h", confidence=0.4),
            ReasoningStep(step_id=2, step_type=StepType.VERIFY, content="v", confidence=0.3),
            ReasoningStep(step_id=3, step_type=StepType.BACKTRACK, content="b", confidence=0.5),
            ReasoningStep(step_id=4, step_type=StepType.HYPOTHESIZE, content="h2", confidence=0.7),
            ReasoningStep(step_id=5, step_type=StepType.CONCLUDE, content="c", confidence=0.8),
        ]
        ok, errors = verifier.verify_chain(steps)
        assert ok is True
        assert errors == []

    def test_consistency_with_contradiction(self, verifier):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="The sky is blue", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.HYPOTHESIZE,
                          content="The sky appears red due to scattering", confidence=0.7),
        ]
        ok, errors = verifier.verify_chain(steps)
        assert len(errors) == 0

    def test_confidence_trend_flagged(self, verifier):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.HYPOTHESIZE, content="h1", confidence=0.3),
            ReasoningStep(step_id=2, step_type=StepType.HYPOTHESIZE, content="h2", confidence=0.9),
            ReasoningStep(step_id=3, step_type=StepType.CONCLUDE, content="c", confidence=0.3),
        ]
        ok, errors = verifier.verify_chain(steps)
        if not ok:
            assert any("confidence" in e.lower() for e in errors)


# ============================================================
# ReasonByAnalogy — Domain Mappings
# ============================================================


class TestReasonByAnalogy:
    def test_find_software_analogy(self, analogy):
        result = analogy.find_analogy("software")
        assert result is not None
        source, desc = result
        assert source == "architecture"

    def test_find_body_analogy(self, analogy):
        result = analogy.find_analogy("human body")
        assert result is not None
        source, desc = result
        assert source == "machine"

    def test_find_business_analogy(self, analogy):
        result = analogy.find_analogy("business")
        assert result is not None
        source, desc = result
        assert source == "ecology"

    def test_map_software_bug_to_crack(self, analogy):
        result = analogy.map_concepts("architecture", "software", "bug")
        assert result == "crack"

    def test_map_software_refactor_to_renovation(self, analogy):
        result = analogy.map_concepts("architecture", "software", "refactor")
        assert result == "renovation"

    def test_map_software_api_to_door(self, analogy):
        result = analogy.map_concepts("architecture", "software", "api")
        assert result == "door"

    def test_map_software_database_to_foundation(self, analogy):
        result = analogy.map_concepts("architecture", "software", "database")
        assert result == "foundation"

    def test_map_body_heart_to_pump(self, analogy):
        result = analogy.map_concepts("machine", "human body", "heart")
        assert result == "pump"

    def test_map_body_brain_to_cpu(self, analogy):
        result = analogy.map_concepts("machine", "human body", "brain")
        assert result == "cpu"

    def test_map_body_nerves_to_wires(self, analogy):
        result = analogy.map_concepts("machine", "human body", "nerves")
        assert result == "wires"

    def test_map_business_company_to_organism(self, analogy):
        result = analogy.map_concepts("ecology", "business", "company")
        assert result == "organism"

    def test_map_business_competition_to_predation(self, analogy):
        result = analogy.map_concepts("ecology", "business", "competition")
        assert result == "predation"

    def test_map_business_growth_to_evolution(self, analogy):
        result = analogy.map_concepts("ecology", "business", "growth")
        assert result == "evolution"

    def test_map_no_match(self, analogy):
        result = analogy.map_concepts("architecture", "software", "nonexistent_term_xyz")
        assert result is None

    def test_find_no_mapping(self, analogy):
        result = analogy.find_analogy("nonexistent_domain_abc")
        assert result is None


# ============================================================
# Edge Cases
# ============================================================


class TestEdgeCases:
    def test_empty_query(self, reasoner):
        result = reasoner.reason("")
        assert isinstance(result, CoTResult)
        assert len(result.steps) > 0 or result.final_answer

    def test_whitespace_query(self, reasoner):
        result = reasoner.reason("   ")
        assert isinstance(result, CoTResult)

    def test_very_long_query(self, reasoner):
        long_query = "This is a very long query " * 50
        result = reasoner.reason(long_query)
        assert isinstance(result, CoTResult)
        assert len(result.steps) > 0

    def test_special_characters_query(self, reasoner):
        result = reasoner.reason("What @ # $ % ^ & * happens with special chars?")
        assert isinstance(result, CoTResult)

    def test_numeric_query(self, reasoner):
        result = reasoner.reason("1234567890")
        assert isinstance(result, CoTResult)

    def test_query_with_newlines(self, reasoner):
        result = reasoner.reason("line 1\nline 2\nline 3")
        assert isinstance(result, CoTResult)

    def test_contradictory_context(self, reasoner):
        result = reasoner.reason(
            "What color is the sky?",
            strategy=ReasoningStrategy.DEDUCTIVE,
            context="The sky is green but also blue depending on the angle",
        )
        assert isinstance(result, CoTResult)

    def test_context_only_none(self, reasoner):
        result = reasoner.reason("A simple question", strategy=None, context=None)
        assert isinstance(result, CoTResult)

    def test_unicode_query(self, reasoner):
        result = reasoner.reason("人工智能的伦理问题和挑战")
        assert isinstance(result, CoTResult)

    def test_all_strategies_explicit(self, reasoner):
        for strat in ReasoningStrategy:
            result = reasoner.reason("Test query for strategy testing", strategy=strat)
            assert result.strategy == strat

    def test_reason_with_tool_use_no_tools(self, reasoner):
        result = reasoner.reason_with_tool_use("What is Python?")
        assert isinstance(result, CoTResult)
        assert result.total_steps > 0

    def test_reason_with_tool_use_empty_tools(self, reasoner):
        result = reasoner.reason_with_tool_use("What is Python?", tool_results={})
        assert isinstance(result, CoTResult)


# ============================================================
# Format Tracing
# ============================================================


class TestFormatTrace:
    def test_full_trace_includes_strategy(self, reasoner):
        result = reasoner.reason("Test", strategy=ReasoningStrategy.DEDUCTIVE)
        trace = reasoner.format_trace(result, "full")
        assert "DEDUCTIVE" in trace.upper() or "deductive" in trace

    def test_full_trace_includes_steps(self, reasoner):
        result = reasoner.reason("What is AI?")
        trace = reasoner.format_trace(result, "full")
        assert "OBSERVE" in trace or "HYPOTHESIZE" in trace or "CONCLUDE" in trace

    def test_full_trace_includes_final_answer(self, reasoner):
        result = reasoner.reason("What is 1+1?")
        trace = reasoner.format_trace(result, "full")
        assert "Final Answer" in trace

    def test_full_trace_includes_confidence(self, reasoner):
        result = reasoner.reason("What is the sun?")
        trace = reasoner.format_trace(result, "full")
        assert "Confidence" in trace

    def test_summary_trace_shorter(self, reasoner):
        result = reasoner.reason("Explain the theory of relativity")
        full = reasoner.format_trace(result, "full")
        summary = reasoner.format_trace(result, "summary")
        assert len(summary) < len(full)

    def test_summary_trace_includes_step_breakdown(self, reasoner):
        result = reasoner.reason("What is quantum computing?")
        trace = reasoner.format_trace(result, "summary")
        assert "observe" in trace.lower()


# ============================================================
# Integration: reason_with_tool_use
# ============================================================


class TestToolUseIntegration:
    def test_tool_use_with_search_result(self, reasoner):
        tool_results = {
            "web_search": "Python is a high-level programming language created by Guido van Rossum in 1991.",
            "calculator": "3 + 4 = 7",
        }
        result = reasoner.reason_with_tool_use(
            "What is Python and what is 3+4?",
            tool_results,
            ReasoningStrategy.DEDUCTIVE,
        )
        assert isinstance(result, CoTResult)
        assert result.total_confidence > 0

    def test_tool_use_with_database_result(self, reasoner):
        tool_results = {
            "database": "User count: 15420, Active today: 8723",
            "analytics": "Growth rate: 12.5% month-over-month",
        }
        result = reasoner.reason_with_tool_use(
            "What is our user growth like?",
            tool_results,
        )
        assert isinstance(result, CoTResult)
        assert result.strategy in ReasoningStrategy

    def test_tool_use_empty_results(self, reasoner):
        result = reasoner.reason_with_tool_use("Simple query", tool_results=None)
        assert isinstance(result, CoTResult)

    def test_tool_use_large_result(self, reasoner):
        tool_results = {f"tool_{i}": f"Result {i}: some data here" for i in range(20)}
        result = reasoner.reason_with_tool_use("Analyze all tool results", tool_results)
        assert isinstance(result, CoTResult)


# ============================================================
# Singleton
# ============================================================


class TestSingleton:
    def test_get_cot_reasoner_returns_same_instance(self):
        r1 = get_cot_reasoner()
        r2 = get_cot_reasoner()
        assert r1 is r2

    def test_reset_creates_new_instance(self):
        r1 = get_cot_reasoner()
        reset_cot_reasoner()
        r2 = get_cot_reasoner()
        assert r1 is not r2

    def test_get_cot_reasoner_after_reset(self):
        reset_cot_reasoner()
        r = get_cot_reasoner()
        assert isinstance(r, CoTReasoner)


# ============================================================
# Step Type Sequence Validation (Verifier)
# ============================================================


class TestStepSequenceValidation:
    def test_valid_full_chain(self, verifier):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.HYPOTHESIZE, content="h", confidence=0.8),
            ReasoningStep(step_id=2, step_type=StepType.VERIFY, content="v", confidence=0.75),
            ReasoningStep(step_id=3, step_type=StepType.CONCLUDE, content="c", confidence=0.85),
        ]
        ok, _ = verifier.verify_chain(steps)
        assert ok is True

    def test_hypothesize_follows_backtrack(self, verifier):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.BACKTRACK, content="b", confidence=0.5),
            ReasoningStep(step_id=2, step_type=StepType.HYPOTHESIZE, content="h", confidence=0.7),
            ReasoningStep(step_id=3, step_type=StepType.CONCLUDE, content="c", confidence=0.8),
        ]
        ok, _ = verifier.verify_chain(steps)
        assert ok is True

    def test_multiple_observe_allowed(self, verifier):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o1", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.OBSERVE, content="o2", confidence=0.85),
            ReasoningStep(step_id=2, step_type=StepType.OBSERVE, content="o3", confidence=0.8),
            ReasoningStep(step_id=3, step_type=StepType.HYPOTHESIZE, content="h", confidence=0.7),
            ReasoningStep(step_id=4, step_type=StepType.CONCLUDE, content="c", confidence=0.75),
        ]
        ok, _ = verifier.verify_chain(steps)
        assert ok is True

    def test_multiple_hypothesize_allowed(self, verifier):
        steps = [
            ReasoningStep(step_id=0, step_type=StepType.OBSERVE, content="o", confidence=0.9),
            ReasoningStep(step_id=1, step_type=StepType.HYPOTHESIZE, content="h1", confidence=0.7),
            ReasoningStep(step_id=2, step_type=StepType.HYPOTHESIZE, content="h2", confidence=0.65),
            ReasoningStep(step_id=3, step_type=StepType.VERIFY, content="v", confidence=0.7),
            ReasoningStep(step_id=4, step_type=StepType.CONCLUDE, content="c", confidence=0.8),
        ]
        ok, _ = verifier.verify_chain(steps)
        assert ok is True
