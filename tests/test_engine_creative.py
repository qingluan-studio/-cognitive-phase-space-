"""
Tests for src/cee/app/engine/creative.py — Creative synthesis engine.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

from cee.app.engine.creative import (
    CreativeSynthesisEngine,
    CreativeConfig,
    CreativeIdea,
    SynthesisResult,
    ConceptGraph,
    ConceptNode,
    AnalogyResult,
    SCAMPERResult,
    ConceptGraphBuilder,
    AnalogyReasoner,
    ReverseThinkingGenerator,
    RandomCombinator,
    SCAMPEREngine,
    CreativityEvaluator,
)


class TestConceptGraph:
    """Tests for ConceptGraph."""

    def test_add_node(self):
        graph = ConceptGraph()
        node = ConceptNode(id="n1", name="Python")
        graph.add_node(node)
        assert "n1" in graph.nodes

    def test_add_edge(self):
        graph = ConceptGraph()
        graph.add_node(ConceptNode(id="a", name="A"))
        graph.add_node(ConceptNode(id="b", name="B"))
        graph.add_edge("a", "b", weight=0.8)
        assert len(graph.edges) == 1
        assert "b" in graph.nodes["a"].neighbors

    def test_get_neighbors_depth_1(self):
        graph = ConceptGraph()
        graph.add_node(ConceptNode(id="a", name="A"))
        graph.add_node(ConceptNode(id="b", name="B"))
        graph.add_node(ConceptNode(id="c", name="C"))
        graph.add_edge("a", "b")
        graph.add_edge("b", "c")
        neighbors = graph.get_neighbors("a", depth=1)
        assert neighbors == {"b"}

    def test_get_neighbors_invalid_node(self):
        graph = ConceptGraph()
        assert graph.get_neighbors("nonexistent") == set()


class TestConceptGraphBuilder:
    """Tests for ConceptGraphBuilder."""

    def test_build_basic_concepts(self):
        builder = ConceptGraphBuilder()
        concepts = ["AI", "Machine Learning", "Deep Learning", "Neural Networks"]
        graph = builder.build(concepts)
        assert len(graph.nodes) > 0

    def test_build_empty_concepts(self):
        builder = ConceptGraphBuilder()
        graph = builder.build([])
        assert len(graph.nodes) == 0


class TestAnalogyReasoner:
    """Tests for AnalogyReasoner."""

    def test_generate_analogies(self):
        reasoner = AnalogyReasoner()
        results = reasoner.generate_analogies("water flow", target_domains=["electricity"])
        assert isinstance(results, list)
        assert len(results) > 0
        assert isinstance(results[0], AnalogyResult)


class TestReverseThinkingGenerator:
    """Tests for ReverseThinkingGenerator."""

    def test_generate_paths(self):
        gen = ReverseThinkingGenerator()
        results = gen.generate_paths("How to increase productivity?")
        assert len(results) > 0
        assert all(isinstance(r, dict) for r in results)


class TestRandomCombinator:
    """Tests for RandomCombinator."""

    def test_generate_combinations(self):
        combinator = RandomCombinator()
        combos = combinator.generate_combinations(["AI", "healthcare", "education"])
        assert len(combos) > 0

    def test_generate_ideas_from_combinations(self):
        combinator = RandomCombinator()
        combos = combinator.generate_combinations(["AI", "healthcare", "education"], num=5)
        ideas = combinator.generate_ideas_from_combinations(combos)
        assert len(ideas) > 0
        assert all(isinstance(i, CreativeIdea) for i in ideas)


class TestSCAMPEREngine:
    """Tests for SCAMPEREngine."""

    def test_apply_scamper(self):
        engine = SCAMPEREngine()
        results = engine.apply("car")
        assert len(results) > 0
        assert all(isinstance(r, SCAMPERResult) for r in results)

    def test_scamper_techniques_present(self):
        engine = SCAMPEREngine()
        results = engine.apply("smartphone")
        techniques = {r.technique for r in results}
        assert len(techniques) > 0


class TestCreativityEvaluator:
    """Tests for CreativityEvaluator."""

    def test_evaluate_idea(self):
        evaluator = CreativityEvaluator()
        idea = CreativeIdea(
            id="i1",
            title="Flying car",
            description="A car that can fly",
            method="scamper",
            source_concepts=["car", "airplane"],
            scores={},
        )
        scores = evaluator.evaluate(idea)
        assert isinstance(scores, dict)
        assert len(scores) > 0

    def test_evaluate_batch(self):
        evaluator = CreativityEvaluator()
        ideas = [
            CreativeIdea(id="i1", title="A", description="d1", method="random",
                         source_concepts=["a"], scores={}),
            CreativeIdea(id="i2", title="B", description="d2", method="random",
                         source_concepts=["b"], scores={}),
        ]
        results = evaluator.evaluate_batch(ideas)
        assert len(results) == 2


class TestCreativeSynthesisEngine:
    """Tests for CreativeSynthesisEngine main class."""

    def test_synthesize_returns_synthesis_result(self):
        engine = CreativeSynthesisEngine(CreativeConfig(max_ideas=5))
        result = engine.synthesize("How to improve education with technology?",
                                    concepts=["AI", "education", "technology"])
        assert isinstance(result, SynthesisResult)
        assert len(result.ideas) > 0

    def test_evaluate_idea(self):
        engine = CreativeSynthesisEngine(CreativeConfig(max_ideas=5))
        idea = CreativeIdea(id="i1", title="Test", description="Test idea",
                            method="manual", source_concepts=["AI"], scores={})
        scores = engine.evaluate_idea(idea)
        assert isinstance(scores, dict)

    def test_format_ideas(self):
        engine = CreativeSynthesisEngine(CreativeConfig(max_ideas=5))
        result = engine.synthesize("Design a better coffee cup",
                                    concepts=["coffee", "design", "materials"])
        text = engine.format_ideas(result)
        assert text != ""


class TestCreativeIdea:
    """Tests for CreativeIdea."""

    def test_creation(self):
        idea = CreativeIdea(id="i1", title="Test", description="Test idea",
                            method="manual", source_concepts=["concept"], scores={})
        assert idea.id == "i1"
        assert idea.title == "Test"


class TestSynthesisResult:
    """Tests for SynthesisResult."""

    def test_creation(self):
        result = SynthesisResult(title="Test", ideas=[], overall_score=0.5, summary="summary")
        assert result.title == "Test"
        assert result.summary == "summary"
