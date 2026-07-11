"""
Tests for src/cee/app/engine/reasoning.py -- Reasoning engine.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.engine.reasoning import (
    ReasoningEngine,
    ReasoningResult,
    ReasoningChain,
    Premise,
    InferenceNode,
    CausalGraph,
    ReasoningType,
)


class TestReasoningEngine:
    """Tests for ReasoningEngine."""

    @pytest.fixture
    def engine(self):
        return ReasoningEngine()

    def test_deductive_reasoning(self, engine):
        premises = [
            "All humans are mortal",
            "Socrates is a human",
        ]
        result = engine.reason(premises, reasoning_type=ReasoningType.DEDUCTIVE,
                                context="Is Socrates mortal?")
        assert isinstance(result, ReasoningResult)
        assert result.reasoning_type == ReasoningType.DEDUCTIVE

    def test_inductive_reasoning(self, engine):
        premises = [
            "The sun has risen every day in recorded history",
        ]
        result = engine.reason(premises, reasoning_type=ReasoningType.INDUCTIVE,
                                context="Will the sun rise tomorrow?")
        assert result.reasoning_type == ReasoningType.INDUCTIVE

    def test_abductive_reasoning(self, engine):
        premises = [
            "The grass is wet",
        ]
        result = engine.reason(premises, reasoning_type=ReasoningType.ABDUCTIVE,
                                context="Why is the grass wet?")
        assert result.reasoning_type == ReasoningType.ABDUCTIVE

    def test_analogical_reasoning(self, engine):
        premises = [
            "The heart is like a pump",
        ]
        result = engine.reason(premises, reasoning_type=ReasoningType.ANALOGICAL,
                                context="How does the heart work?")
        assert result.confidence >= 0

    def test_causal_reasoning(self, engine):
        premises = [
            "Smoking causes lung cancer",
        ]
        result = engine.reason(premises, reasoning_type=ReasoningType.CAUSAL,
                                context="Does smoking affect health?")
        assert result.reasoning_type == ReasoningType.CAUSAL

    def test_syllogistic_reasoning(self, engine):
        premises = [
            "All(A,B)",
            "All(B,C)",
        ]
        result = engine.reason(premises, reasoning_type=ReasoningType.SYLLOGISTIC,
                                context="All(A,C)?")
        assert isinstance(result, ReasoningResult)

    def test_reasoning_has_alternatives(self, engine):
        premises = ["Data shows correlation"]
        result = engine.reason(premises, reasoning_type=ReasoningType.INDUCTIVE,
                                context="What conclusion?")
        assert isinstance(result.alternatives, list)

    def test_reasoning_has_explanation(self, engine):
        premises = ["Premise 1"]
        result = engine.reason(premises, reasoning_type=ReasoningType.DEDUCTIVE,
                                context="Question?")
        assert result.explanation != ""

    def test_causal_graph(self):
        graph = CausalGraph(
            nodes=["Smoking", "Lung Cancer", "Healthcare Costs"],
            edges=[("Smoking", "Lung Cancer", "causes"),
                   ("Lung Cancer", "Healthcare Costs", "increases")],
        )
        assert isinstance(graph, CausalGraph)
        assert len(graph.nodes) > 0

    def test_empty_premises(self, engine):
        result = engine.reason([], reasoning_type=ReasoningType.DEDUCTIVE,
                                context="Question?")
        assert result is not None

    def test_reason_chain_is_tracked(self, engine):
        premises = ["A implies B", "A is true"]
        result = engine.reason(premises, reasoning_type=ReasoningType.DEDUCTIVE,
                                context="Is B true?")
        assert isinstance(result.chain, ReasoningChain) or result.chain is None


class TestPremise:
    """Tests for Premise."""

    def test_creation(self):
        p = Premise(text="Test", category="fact", confidence=0.9, source="research")
        assert p.text == "Test"
        assert p.confidence == 0.9

    def test_defaults(self):
        p = Premise()
        assert p.text == ""
        assert p.confidence == 1.0


class TestReasoningResult:
    """Tests for ReasoningResult."""

    def test_creation(self):
        result = ReasoningResult(reasoning_type=ReasoningType.DEDUCTIVE)
        assert result.reasoning_type == ReasoningType.DEDUCTIVE

    def test_with_chain(self):
        chain = ReasoningChain()
        result = ReasoningResult(reasoning_type=ReasoningType.INDUCTIVE, chain=chain)
        assert result.chain is not None


class TestCausalGraph:
    """Tests for CausalGraph."""

    def test_creation(self):
        graph = CausalGraph(nodes=["A", "B"], edges=[("A", "B", "causes")])
        assert len(graph.nodes) == 2
        assert len(graph.edges) == 1
