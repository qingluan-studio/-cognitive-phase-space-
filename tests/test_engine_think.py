"""
Tests for src/cee/app/engine/think.py — DeepThinkEngine.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.engine.think import (
    DeepThinkEngine,
    ThinkConfig,
    ThinkingResult,
    ThinkingChain,
    Hypothesis,
    MultiAngleAnalysis,
    ProblemDecomposer,
    ThinkingChainGenerator,
    HypothesisTester,
    MultiAngleAnalyzer,
    ThinkingPhase,
    Confidence,
    SubQuestion,
)


class TestProblemDecomposer:
    """Tests for ProblemDecomposer."""

    def test_decompose_simple_question(self):
        d = ProblemDecomposer(max_depth=2, max_questions=10)
        result = d.decompose("How can we achieve AGI safely?")
        assert len(result) > 1
        assert result[0].text == "How can we achieve AGI safely?"

    def test_decompose_empty_string(self):
        d = ProblemDecomposer()
        result = d.decompose("")
        assert result == []

    def test_decompose_whitespace_only(self):
        d = ProblemDecomposer()
        result = d.decompose("   ")
        assert result == []

    def test_decompose_max_questions_limit(self):
        d = ProblemDecomposer(max_depth=5, max_questions=5)
        result = d.decompose("Explain quantum computing")
        assert len(result) <= 5

    def test_decompose_creates_parent_child_structure(self):
        d = ProblemDecomposer(max_depth=2, max_questions=20)
        result = d.decompose("Compare Python and JavaScript")
        children = [sq for sq in result if sq.parent_id]
        assert len(children) > 0

    def test_subquestion_has_importance_difficulty(self):
        d = ProblemDecomposer()
        result = d.decompose("What is machine learning?")
        for sq in result:
            assert 0 <= sq.importance <= 1
            assert 0 <= sq.difficulty

    def test_detect_chinese_question(self):
        d = ProblemDecomposer()
        result = d.decompose("人工智能的伦理问题")
        assert len(result) > 0


class TestThinkingChainGenerator:
    """Tests for ThinkingChainGenerator."""

    def test_generate_returns_chain(self):
        gen = ThinkingChainGenerator()
        chain = gen.generate("What is the meaning of life?", max_steps=10)
        assert isinstance(chain, ThinkingChain)
        assert len(chain.steps) > 0
        assert chain.confidence > 0

    def test_generate_includes_question_and_conclusion(self):
        gen = ThinkingChainGenerator()
        chain = gen.generate("Solve x + 2 = 5", max_steps=5)
        assert any("Q:" in s for s in chain.steps)
        assert any("Conclusion" in s for s in chain.steps)

    def test_generate_respects_max_steps(self):
        gen = ThinkingChainGenerator()
        chain = gen.generate("Test question", max_steps=3)
        assert len(chain.steps) <= 3 + 2

    def test_chain_has_branching_points(self):
        gen = ThinkingChainGenerator()
        chain = gen.generate("Complex analysis question", max_steps=10)
        assert isinstance(chain.branching_points, list)


class TestHypothesisTester:
    """Tests for HypothesisTester."""

    def test_generate_hypotheses(self):
        tester = HypothesisTester()
        hyps = tester.generate_hypotheses("Why is the sky blue?", num=5)
        assert len(hyps) <= 5
        for h in hyps:
            assert h.statement != ""
            assert h.verdict in ("unverified", "supported", "refuted",
                                  "strongly_supported", "uncertain", "weakly_supported")

    def test_generate_hypotheses_empty_query(self):
        tester = HypothesisTester()
        hyps = tester.generate_hypotheses("", num=5)
        assert len(hyps) >= 1

    def test_test_hypothesis_with_evidence(self):
        tester = HypothesisTester()
        hyps = tester.generate_hypotheses("Test question", num=1)
        h = hyps[0]
        updated = tester.test_hypothesis(h, ["New supporting evidence"])
        assert updated is not None

    def test_quantify_confidence(self):
        tester = HypothesisTester()
        hyps = tester.generate_hypotheses("Test question", num=3)
        result = tester.quantify_confidence(hyps)
        assert "overall" in result
        assert "max" in result
        assert "min" in result

    def test_quantify_empty(self):
        tester = HypothesisTester()
        result = tester.quantify_confidence([])
        assert result["overall"] == 0.0

    def test_extract_keywords(self):
        tester = HypothesisTester()
        keywords = tester._extract_keywords("Python is a great programming language")
        assert len(keywords) > 0


class TestMultiAngleAnalyzer:
    """Tests for MultiAngleAnalyzer."""

    def test_analyze_returns_analysis(self):
        analyzer = MultiAngleAnalyzer()
        result = analyzer.analyze("Should AI be regulated?")
        assert isinstance(result, MultiAngleAnalysis)
        assert len(result.angles) > 0
        assert len(result.analyses) > 0

    def test_conflicts_and_consensus(self):
        analyzer = MultiAngleAnalyzer()
        result = analyzer.analyze("Test question")
        assert len(result.conflict_points) > 0
        assert len(result.consensus_points) > 0

    def test_synthesis_non_empty(self):
        analyzer = MultiAngleAnalyzer()
        result = analyzer.analyze("Test question")
        assert result.synthesis != ""


class TestDeepThinkEngine:
    """Tests for DeepThinkEngine main class."""

    @pytest.fixture
    def engine(self):
        config = ThinkConfig(
            max_sub_questions=5,
            max_chain_steps=8,
            max_hypotheses=3,
            enable_visualization=True,
        )
        return DeepThinkEngine(config=config)

    def test_think_returns_result(self, engine):
        result = engine.think("What is the best programming language?")
        assert isinstance(result, ThinkingResult)
        assert result.question == "What is the best programming language?"

    def test_think_has_sub_questions(self, engine):
        result = engine.think("How does blockchain work?")
        assert len(result.sub_questions) > 0

    def test_think_has_thinking_chain(self, engine):
        result = engine.think("Explain gravity")
        assert result.thinking_chain is not None
        assert isinstance(result.thinking_chain, ThinkingChain)

    def test_think_has_hypotheses(self, engine):
        result = engine.think("Why do we dream?")
        assert len(result.hypotheses) > 0

    def test_think_has_multi_angle(self, engine):
        result = engine.think("Is nuclear energy safe?")
        assert result.multi_angle is not None

    def test_think_has_uncertainty(self, engine):
        result = engine.think("What will happen in 2050?")
        assert "overall_confidence" in result.uncertainty
        assert 0 <= result.uncertainty["overall_confidence"] <= 1

    def test_think_has_visualization(self, engine):
        result = engine.think("Complex question about AI ethics")
        assert "nodes" in result.visualization
        assert "edges" in result.visualization

    def test_think_has_final_answer(self, engine):
        result = engine.think("Simple test question")
        assert result.final_answer != ""

    def test_quick_think(self, engine):
        answer = engine.quick_think("What is 2+2?")
        assert answer != ""

    def test_visualize_method(self, engine):
        result = engine.think("Test")
        viz = engine.visualize(result)
        assert "mermaid" in viz.lower() or "graph" in viz.lower() or "Metrics" in viz

    def test_generate_visualization(self, engine):
        result = engine.think("Test question")
        viz = engine.generate_visualization(result)
        assert viz["type"] == "thinking_flowchart"
        assert "metrics" in viz


class TestUncertaintyQuant:
    """Tests for uncertainty quantification."""

    def test_reasoning_gap_present(self):
        engine = DeepThinkEngine()
        result = engine.think("Uncertain question with many unknowns")
        assert "reasoning_gap" in result.uncertainty
        assert "model_epistemic" in result.uncertainty
        assert "data_uncertainty" in result.uncertainty
