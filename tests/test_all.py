"""
CEE 认知涌现引擎 — 综合测试

覆盖: T1-T6 引擎功能、闭环控制器、SDK、治理系统
"""

import json
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from cee import (
    InvariantEngine,
    CognitiveIsomorphismEngine,
    HyperGraphCollapseEngine,
    GeodesicNavigationEngine,
    CrystallizationEngine,
    GenesisEngine,
    ClosedLoopController,
    CEEClient,
    CEEConfig,
    GovernanceConfig,
    OptimizationPath,
)


# ═══════════════════════════════════════════════════════════════════
# T6: Invariant Engine
# ═══════════════════════════════════════════════════════════════════


class TestT6InvariantEngine:
    """T6 认知几何不变量引擎测试"""

    def setup_method(self):
        self.engine = InvariantEngine()

    def test_empty_text(self):
        scores = self.engine.evaluate("")
        assert scores.itc == 0.0
        assert scores.iec == 0.0
        assert scores.pfft == 0.0

    def test_high_quality_english(self):
        text = (
            "The cognitive emergence engine provides a framework for evaluating "
            "structural quality of text independently of content bias. Four "
            "invariants capture different aspects of text structure: topological "
            "compactness, curvature smoothness, entropy criticality, and the "
            "projection fidelity-flexibility tradeoff. Together they form a "
            "comprehensive quality metric."
        )
        scores = self.engine.evaluate(text)
        assert 0.1 <= scores.composite <= 1.0
        assert 0.0 <= scores.itc <= 1.0
        assert 0.0 <= scores.scs <= 1.0
        assert 0.0 <= scores.iec <= 1.0
        assert 0.0 <= scores.pfft <= 1.0

    def test_all_scores_in_range(self):
        """所有评分应在 [0, 1] 区间内."""
        texts = [
            "Short.",
            "A slightly longer sentence with more words in it.",
            "Multiple sentences. With various structures. Some short. Some much longer and more complex in their construction and meaning.",
            "knowledge structure expression separable properties structural invariants topological compactness curvature smoothness entropy criticality projection fidelity",
            "this is a test of the system it should handle various inputs correctly",
        ]
        for text in texts:
            scores = self.engine.evaluate(text)
            assert 0.0 <= scores.itc <= 1.0, f"ITC out of range: {scores.itc}"
            assert 0.0 <= scores.scs <= 1.0, f"SCS out of range: {scores.scs}"
            assert 0.0 <= scores.iec <= 1.0, f"IEC out of range: {scores.iec}"
            assert 0.0 <= scores.pfft <= 1.0, f"PFFT out of range: {scores.pfft}"

    def test_composite_average(self):
        scores = self.engine.evaluate("test content for composite score")
        expected = (scores.itc + scores.scs + scores.iec + scores.pfft) / 4.0
        assert abs(scores.composite - expected) < 0.001

    def test_tier_classification(self):
        """测试质量等级分类."""
        text = "A very basic text."
        scores = self.engine.evaluate(text)
        tier = scores.tier
        assert tier.value in ("critical", "poor", "fair", "good", "excellent", "exceptional")

    def test_quality_improvement(self):
        """高质量文本结构化更好."""
        good = (
            "The cognitive emergence framework provides systematic evaluation "
            "of text quality through orthogonal invariant dimensions."
        )
        bad = "stuff things random scattered messy broken chaotic chaos disorder"
        scores_good = self.engine.evaluate(good)
        scores_bad = self.engine.evaluate(bad)
        assert scores_good.iec > scores_bad.iec, (
            f"IEC Good={scores_good.iec:.4f} should exceed Bad={scores_bad.iec:.4f}"
        )

    def test_compare(self):
        text_a = "A well-structured and coherent exposition of the central thesis."
        text_b = "random words chaos disorder unstructured messy"
        result = self.engine.compare(text_a, text_b)
        assert result["delta"] != 0.0

    def test_detailed_evaluation(self):
        result = self.engine.evaluate_detailed("Test content for detailed analysis.")
        assert "scores" in result
        assert "breakdown" in result
        assert "warnings" in result
        assert "suggestions" in result

    def test_threshold_check(self):
        text = "A well-structured passage with good information density and flow."
        assert self.engine.is_above_threshold(text, threshold=0.1)
        assert not self.engine.is_above_threshold(text, threshold=0.99)

    def test_batch_evaluate(self):
        texts = ["text one", "text two", "text three"]
        results = self.engine.batch_evaluate(texts)
        assert len(results) == 3
        for r in results:
            assert 0.0 <= r.composite <= 1.0


# ═══════════════════════════════════════════════════════════════════
# T1: Mirror Engine
# ═══════════════════════════════════════════════════════════════════


class TestT1MirrorEngine:
    """T1 认知同构引擎测试"""

    def setup_method(self):
        self.engine = CognitiveIsomorphismEngine()

    def test_extract_signposts(self):
        text = "Knowledge structure and expression are separable properties."
        signposts = self.engine.extract_signposts(text)
        assert len(signposts) > 0
        assert all(isinstance(s, str) for s in signposts)

    def test_empty_text_signposts(self):
        assert self.engine.extract_signposts("") == []

    def test_isomorphism_detection(self):
        text_a = "The structure of knowledge can be separated from its expression."
        text_b = "Knowledge expression is separable from its underlying structure."
        is_iso, cov = self.engine.verify_isomorphism(text_a, text_b)
        assert 0.0 <= cov <= 1.0

    def test_structural_fingerprint(self):
        fp = self.engine.compute_structural_fingerprint("some test text")
        assert len(fp) == 16
        assert all(c in "0123456789abcdef" for c in fp)

    def test_signpost_map(self):
        sigmap = self.engine.generate_signpost_map("The cat sat on the mat. The cat was happy.")
        assert isinstance(sigmap, dict)


# ═══════════════════════════════════════════════════════════════════
# T2: Prism Engine
# ═══════════════════════════════════════════════════════════════════


class TestT2PrismEngine:
    """T2 超图坍缩引擎测试"""

    def setup_method(self):
        self.engine = HyperGraphCollapseEngine(n_perspectives=5)

    def test_build_hypergraph(self):
        text = "Knowledge structure is separable. Expression patterns vary."
        graph = self.engine.build_hypergraph(text)
        assert len(graph.nodes) > 0

    def test_collapse_perspectives(self):
        text = (
            "The cognitive engine evaluates text quality. It uses invariants for "
            "assessment. The framework is comprehensive and robust. Each component "
            "works together in harmony. The results are reproducible and reliable."
        )
        perspectives = self.engine.collapse_to_perspectives(text)
        assert len(perspectives) > 0
        for p in perspectives:
            assert "perspective" in p
            assert "key_concepts" in p
            assert 0.0 <= p["traceability"] <= 1.0

    def test_perspective_diversity(self):
        text = (
            "First we examine the structure. Then we analyze the content. "
            "After that we evaluate the quality. Finally we report the results. "
            "Each step builds on the previous one in a logical progression."
        )
        perspectives = self.engine.collapse_to_perspectives(text)
        diversity = self.engine.compute_perspective_diversity(perspectives)
        assert 0.0 <= diversity <= 1.0


# ═══════════════════════════════════════════════════════════════════
# T3: Geodesic Engine
# ═══════════════════════════════════════════════════════════════════


class TestT3GeodesicEngine:
    """T3 测地线导航引擎测试"""

    def setup_method(self):
        self.engine = GeodesicNavigationEngine(n_paths=3)

    def test_extract_landmarks_from_python(self):
        code = """
def calculate(x, y):
    return x + y

def process(data):
    result = []
    for item in data:
        result.append(calculate(item, 2))
    return result

class Processor:
    def __init__(self):
        self.data = []

    def run(self):
        return process(self.data)
"""
        landmarks = self.engine.extract_landmarks(code)
        assert len(landmarks) > 0

    def test_find_geodesic_paths(self):
        code = """
def add(a, b): return a + b
def subtract(a, b): return a - b
def multiply(a, b): return a * b
def divide(a, b): return a / b
"""
        paths = self.engine.find_geodesic_paths(code)
        assert len(paths) > 0
        for path in paths:
            assert len(path.landmarks) > 0
            assert 0.0 <= path.smoothness <= 1.0
            assert 0.0 <= path.novelty_score <= 1.0

    def test_recommend_path(self):
        code = """
def foo(x): return x * 2
def bar(y): return y + 1
"""
        paths = self.engine.find_geodesic_paths(code)
        recommended = self.engine.recommend_path(paths)
        assert recommended is not None


# ═══════════════════════════════════════════════════════════════════
# T4: Crystallization Engine
# ═══════════════════════════════════════════════════════════════════


class TestT4CrystallizationEngine:
    """T4 知识结晶引擎测试"""

    def setup_method(self):
        self.engine = CrystallizationEngine()

    def test_crystallize_fragments(self):
        fragments = [
            "knowledge structure is important",
            "expression patterns reveal deep insights",
            "structural invariants measure quality",
            "cognitive emergence from simple rules",
            "complex systems self-organize over time",
            "information flows through connected networks",
            "understanding emerges from relationships",
            "patterns repeat across different domains",
        ]
        self.engine.add_fragments(fragments)
        crystals = self.engine.crystallize(iterations=50)
        assert len(crystals) > 0

    def test_crystal_summary(self):
        fragments = ["a simple idea", "another simple concept", "yet another thought"]
        self.engine.add_fragments(fragments)
        self.engine.crystallize(iterations=30)
        summary = self.engine.get_crystal_summary()
        assert len(summary) > 0
        for c in summary:
            assert "id" in c
            assert "size" in c
            assert "cohesion" in c

    def test_single_fragment_no_crystallization(self):
        self.engine.add_fragments(["only one fragment"])
        crystals = self.engine.crystallize()
        assert len(crystals) == 0


# ═══════════════════════════════════════════════════════════════════
# T5: Genesis Engine
# ═══════════════════════════════════════════════════════════════════


class TestT5GenesisEngine:
    """T5 反事实生长引擎测试"""

    def setup_method(self):
        self.engine = GenesisEngine(n_branches=5)

    def test_extract_seeds(self):
        text = (
            "The structure of knowledge is independent of its expression. "
            "We can measure quality through geometric invariants."
        )
        seeds = self.engine.extract_seeds(text)
        assert len(seeds) > 0
        for seed in seeds:
            assert seed.id
            assert seed.content
            assert len(seed.key_terms) > 0

    def test_grow_branches(self):
        text = "Knowledge emerges from structural relationships between concepts."
        branches = self.engine.grow(text)
        assert len(branches) > 0
        for b in branches:
            assert b.fitness >= self.engine.survival_threshold
            assert 0.0 <= b.survival_prob <= 1.0

    def test_hybridize(self):
        text = "Complex systems exhibit emergent behavior from simple rules."
        branches = self.engine.grow(text)
        if len(branches) >= 2:
            hybrid = self.engine.hybridize(branches[0], branches[1])
            assert hybrid.hybrid_fitness >= 0.0

    def test_evolve(self):
        text = "Knowledge structure is separable from expression."
        result = self.engine.evolve(text, generations=2)
        assert "total_branches" in result
        assert "top_branches" in result


# ═══════════════════════════════════════════════════════════════════
# Closed-Loop Controller
# ═══════════════════════════════════════════════════════════════════


class TestClosedLoopController:
    """闭环控制器测试"""

    def test_no_optimization_needed(self):
        from cee.engine.t6_invariant import InvariantEngine

        evaluator = InvariantEngine()
        config = GovernanceConfig(auto_optimize_threshold=0.1)
        controller = ClosedLoopController(
            evaluator=evaluator,
            optimizers={},
            config=config,
        )
        result = controller.optimize("some text")
        assert result.iterations == 0
        assert result.convergence is True

    def test_optimize_at_high_threshold(self):
        from cee.engine.t6_invariant import InvariantEngine

        evaluator = InvariantEngine()
        config = GovernanceConfig(
            auto_optimize_threshold=0.99,
            max_optimization_iterations=3,
        )
        controller = ClosedLoopController(
            evaluator=evaluator,
            optimizers={
                OptimizationPath.T1_COGNITIVE_ISOMORPHISM: lambda t: t,
            },
            config=config,
        )
        result = controller.optimize("text", target_threshold=0.99)
        assert result.iterations >= 0


# ═══════════════════════════════════════════════════════════════════
# 治理系统
# ═══════════════════════════════════════════════════════════════════


class TestGovernance:
    """治理系统测试"""

    def test_constitution(self):
        from cee.governance.system import Constitution
        text = Constitution.get_text()
        assert "五大铁律" in text
        assert "Safe Mode" in text
        assert Constitution.validate_action("diagnose", 0.2)
        assert not Constitution.validate_action("generate", 0.2)

    def test_decision_logger(self):
        from cee.governance.system import DecisionLogger
        with tempfile.NamedTemporaryFile(suffix=".jsonl", delete=False) as f:
            log_path = f.name
        try:
            logger = DecisionLogger(storage_path=log_path)
            record = logger.log(
                context="test decision",
                options=["A", "B"],
                chosen="A",
                rationale="Testing",
            )
            assert record.id.startswith("DEC-")
            assert len(logger.list_all()) == 1
            assert len(logger.query("test")) == 1
        finally:
            Path(log_path).unlink(missing_ok=True)

    def test_knowledge_legacy(self):
        from cee.governance.system import KnowledgeLegacy
        with tempfile.TemporaryDirectory() as tmpdir:
            legacy = KnowledgeLegacy(storage_path=tmpdir)
            legacy.record_origin("idea-1", "chief_architect", "Test idea")
            legacy.record_deprecation("idea-1", "obsolete", "idea-2")
            records = legacy.query("idea-1")
            assert len(records) == 2

    def test_safe_mode(self):
        from cee.governance.system import SafeMode
        sm = SafeMode(freeze_threshold=0.3)
        result = sm.check_and_freeze(0.5)
        assert result["action"] == "normal"
        assert not sm.is_frozen

        result = sm.check_and_freeze(0.2)
        assert result["action"] == "freeze"
        assert sm.is_frozen
        assert sm.can_execute("diagnose")
        assert not sm.can_execute("generate")

        sm.unfreeze()
        assert not sm.is_frozen

    def test_governance_model(self):
        from cee.governance.system import GovernanceModel
        roles = GovernanceModel.get_roles()
        assert "chief_architect" in roles
        rules = GovernanceModel.get_succession_rules()
        assert "chief_architect" in rules

    def test_solo_guardian(self):
        from cee.governance.system import SoloGuardian
        with tempfile.TemporaryDirectory() as tmpdir:
            guardian = SoloGuardian(workspace_path=tmpdir)
            snapshot_id = guardian.memory_snapshot({"key": "value"})
            assert snapshot_id.startswith("snapshot_")
            result = guardian.one_click_backup(source_dirs=[])
            assert result["backup_id"].startswith("backup_")
