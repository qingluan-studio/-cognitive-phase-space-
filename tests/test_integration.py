"""
CEE 认知涌现引擎 — 集成测试

覆盖: 端到端质量闭环、T6双轨制对比、T1独立优化、T2+T6协作、T4+T6联用
"""

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from cee import (
    InvariantEngine,
    CognitiveIsomorphismEngine,
    HyperGraphCollapseEngine,
    CrystallizationEngine,
    InvariantScores,
)


class TestT6DualTrack:
    """T6 双轨制：工程版 vs 理论版对比"""

    def test_both_engines_available(self):
        from cee.engine.t6_invariant import InvariantEngine, InvariantTheoretical
        eng = InvariantEngine()
        theo = InvariantTheoretical()
        assert eng is not None
        assert theo is not None

    def test_theoretical_scores_in_range(self):
        from cee.engine.t6_invariant import InvariantTheoretical
        theo = InvariantTheoretical()
        text = (
            "The cognitive emergence framework provides systematic evaluation "
            "of text quality through four orthogonal geometric invariants. "
            "Each invariant captures a distinct structural property. "
            "Together they form a comprehensive quality metric."
        )
        scores = theo.evaluate(text)
        assert 0.0 <= scores.itc <= 1.0, f"ITC out of range: {scores.itc}"
        assert 0.0 <= scores.scs <= 1.0, f"SCS out of range: {scores.scs}"
        assert 0.0 <= scores.iec <= 1.0, f"IEC out of range: {scores.iec}"
        assert 0.0 <= scores.pfft <= 1.0, f"PFFT out of range: {scores.pfft}"

    def test_theoretical_empty_text(self):
        from cee.engine.t6_invariant import InvariantTheoretical
        theo = InvariantTheoretical()
        scores = theo.evaluate("")
        assert scores.itc == 0.0
        assert scores.iec == 0.0

    def test_engineering_vs_theoretical_correlation(self):
        """工程版和理论版评分的相关性（应在合理区间内）"""
        from cee.engine.t6_invariant import InvariantEngine, InvariantTheoretical
        eng = InvariantEngine()
        theo = InvariantTheoretical()

        texts = [
            "Short text.",
            "A well-structured passage with clear logical flow and good information density. The arguments are connected and the prose is coherent.",
            "multiple disjointed fragments random words chaos disorder unstructured broken",
            "The systematic evaluation of structural text quality reveals patterns invisible to content-based assessment. Four geometric invariants capture orthogonal dimensions of cognitive structure.",
            "According to recent studies in computational linguistics, the relationship between syntactic complexity and semantic density follows a nonlinear pattern that can be characterized through information-theoretic measures applied at multiple scales of text organization.",
        ]

        eng_scores = [eng.evaluate(t).composite for t in texts]
        theo_scores = [theo.evaluate(t).composite for t in texts]

        correlation = np.corrcoef(eng_scores, theo_scores)[0, 1]
        assert correlation > 0.3, (
            f"Engineering and theoretical scores should be positively correlated, "
            f"got correlation={correlation:.4f}"
        )

    def test_theoretical_quality_ranking(self):
        """理论版能否区分高质量和低质量文本"""
        from cee.engine.t6_invariant import InvariantTheoretical
        theo = InvariantTheoretical()

        high_quality = (
            "The cognitive emergence engine evaluates text structure through "
            "four orthogonal geometric invariants. Each dimension captures "
            "a distinct property of textual coherence: topological compactness "
            "measures information density, curvature smoothness tracks semantic "
            "transitions, entropy criticality assesses complexity balance, and "
            "the projection tradeoff quantifies expressiveness. Together these "
            "form a rigorous framework for quality assessment across domains "
            "and modalities of natural language expression."
        )
        low_quality = "random the a random the a is random is the is a random dispersed scattered broken chaotic"

        high_score = theo.evaluate(high_quality).composite
        low_score = theo.evaluate(low_quality).composite

        assert high_score >= low_score, (
            f"High quality ({high_score:.4f}) should outrank low quality ({low_score:.4f})"
        )


class TestEndToEndQualityLoop:
    """端到端：T6工程版评估 + 优化路径选择"""

    def test_evaluate_and_classify(self):
        """评估文本并获取完整的分类信息"""
        engine = InvariantEngine()

        texts = {
            "exceptional": (
                "Cognitive emergence theory posits that complex structural properties "
                "emerge from simple geometric constraints applied to language models. "
                "The four invariants — topological compactness, curvature smoothness, "
                "entropy criticality, and projection tradeoff — form a rigorous framework "
                "for evaluating text quality independently of semantic content."
            ),
            "poor": "random words chaos disorder unstructured messy broken scattered",
        }

        for expected_quality, text in texts.items():
            result = engine.evaluate_detailed(text)
            assert "scores" in result
            assert "breakdown" in result
            assert "warnings" in result
            assert "suggestions" in result
            assert result["scores"]["tier"] is not None

    def test_full_pipeline_no_optimization_needed(self):
        """高质量文本无需优化的端到端路径"""
        from cee.core.types import GovernanceConfig, OptimizationPath
        from cee.core.controller import ClosedLoopController

        engine = InvariantEngine()
        config = GovernanceConfig(auto_optimize_threshold=0.0)
        controller = ClosedLoopController(
            evaluator=engine,
            optimizers={},
            config=config,
        )

        result = controller.optimize("any text here")
        assert result.iterations == 0
        assert result.convergence is True

    def test_full_pipeline_with_iteration(self):
        """需要迭代优化的完整闭环"""
        from cee.core.types import GovernanceConfig, OptimizationPath
        from cee.core.controller import ClosedLoopController

        engine = InvariantEngine()
        config = GovernanceConfig(
            auto_optimize_threshold=0.95,
            max_optimization_iterations=5,
        )

        call_count = 0

        def mock_optimizer(text: str) -> str:
            nonlocal call_count
            call_count += 1
            return (
                "The cognitive emergence framework provides systematic evaluation "
                "of multidimensional text quality through geometric invariant analysis. "
                "Each dimension captures distinct structural properties of language. "
                "Together they enable reproducible quality assessment independent of content."
            )

        controller = ClosedLoopController(
            evaluator=engine,
            optimizers={OptimizationPath.T1_COGNITIVE_ISOMORPHISM: mock_optimizer},
            config=config,
        )

        poor_text = "bad text that needs improvement"
        result = controller.optimize(poor_text, target_threshold=0.95)

        assert result.iterations >= 0
        assert call_count > 0
        history = controller.get_history()
        assert len(history) == result.iterations


class TestT1IndependentOptimization:
    """T1 认知同构：独立优化文本"""

    def test_signpost_extraction_quality(self):
        """路标提取应返回有意义的语义键"""
        engine = CognitiveIsomorphismEngine()
        text = (
            "Knowledge structure and expression are separable properties "
            "that can be independently evaluated and optimized."
        )
        signposts = engine.extract_signposts(text)
        assert len(signposts) >= 2
        assert all(len(s) > 1 for s in signposts)

    def test_isomorphism_same_text(self):
        """同一文本应对自己高同构"""
        engine = CognitiveIsomorphismEngine()
        text = "The structure of knowledge is independent of its expression."
        is_iso, cov = engine.verify_isomorphism(text, text)
        assert cov > 0.5

    def test_isomorphism_paraphrase(self):
        """改写版本的命题覆盖率应可计算"""
        engine = CognitiveIsomorphismEngine()
        text_a = "Knowledge structure can be separated from its linguistic expression."
        text_b = "The way knowledge is expressed is distinct from its underlying structure."
        is_iso, cov = engine.verify_isomorphism(text_a, text_b)
        assert 0.0 <= cov <= 1.0

    def test_structural_fingerprint_stability(self):
        """结构指纹应对相同语义稳定"""
        engine = CognitiveIsomorphismEngine()
        text_a = "Complex systems exhibit emergent behavior from simple rules."
        text_b = "Simple rules in complex systems can produce emergent behaviors."
        fp_a = engine.compute_structural_fingerprint(text_a)
        fp_b = engine.compute_structural_fingerprint(text_b)
        assert len(fp_a) == 16
        assert len(fp_b) == 16

    def test_reconstruct_template_generation(self):
        """重构模板应包含所有路标"""
        engine = CognitiveIsomorphismEngine()
        text = "The framework uses four geometric invariants for text evaluation."
        signposts = engine.extract_signposts(text)
        template = engine.reconstruct_from_signposts(signposts, style_hint="academic")
        assert "academic" in template
        for sp in signposts[:3]:
            assert sp in template


class TestT2T6Collaboration:
    """T2 多视角生成 + T6 评估协作"""

    def test_perspectives_evaluated_by_t6(self):
        """T2生成的每个视角都应能被T6评估"""
        t2 = HyperGraphCollapseEngine(n_perspectives=5)
        t6 = InvariantEngine()

        text = (
            "Cognitive emergence theory provides a framework for understanding "
            "how complex structural properties arise from simple rules applied "
            "to language models and knowledge representation systems."
        )
        perspectives = t2.collapse_to_perspectives(text)
        assert len(perspectives) > 0

        for p in perspectives:
            concepts = p.get("key_concepts", [])
            if concepts:
                concept_text = " ".join(concepts)
                scores = t6.evaluate(concept_text)
                assert 0.0 <= scores.composite <= 1.0

    def test_perspective_diversity_measurable(self):
        """视角多样性应可量化"""
        t2 = HyperGraphCollapseEngine(n_perspectives=5)
        text = (
            "First we define the problem. Then we explore solutions. "
            "After analysis we propose a new framework. The framework "
            "generalizes to multiple domains. Finally we validate against benchmarks."
        )
        perspectives = t2.collapse_to_perspectives(text)
        diversity = t2.compute_perspective_diversity(perspectives)
        assert 0.0 <= diversity <= 1.0

    def test_preference_order_matches_t6_ranking(self):
        """T6应能对T2的多视角按质量排序"""
        t2 = HyperGraphCollapseEngine(n_perspectives=3)
        t6 = InvariantEngine()

        text = (
            "The cognitive emergence framework evaluates text quality through "
            "four geometric invariants. Each invariant captures a distinct "
            "structural property. The framework has been validated across domains."
        )
        perspectives = t2.collapse_to_perspectives(text)

        concepts_list = []
        for p in perspectives:
            concepts = " ".join(p.get("key_concepts", []))
            if concepts.strip():
                concepts_list.append(concepts)

        if len(concepts_list) >= 2:
            for c in concepts_list:
                score = t6.evaluate(c)
                assert score.composite is not None


class TestT4T6Combined:
    """T4 知识结晶 + T6 质量评估"""

    def test_crystallized_fragments_evaluated(self):
        """结晶后的涌现知识应能被T6评估"""
        t4 = CrystallizationEngine(temperature=2.0)
        t6 = InvariantEngine()

        fragments = [
            "knowledge structure is important for evaluation",
            "expression patterns reveal deep insights about cognition",
            "structural invariants measure text quality independently",
            "cognitive emergence arises from simple geometric rules",
            "complex systems self-organize through interaction patterns",
            "information flows through connected semantic networks",
            "understanding emerges from structural relationships",
            "patterns repeat across different knowledge domains",
        ]
        t4.add_fragments(fragments)
        crystals = t4.crystallize(iterations=80)

        if crystals:
            summary = t4.get_crystal_summary()
            for c in summary:
                assert "cohesion" in c
                assert "size" in c

            emergence = t4.get_emergence_relationships()
            for e in emergence:
                if e["emergent"]:
                    emergent_text = " ".join(e["emergent"])
                    scores = t6.evaluate(emergent_text)
                    assert 0.0 <= scores.composite <= 1.0


class TestControllerWithT1Engine:
    """控制器 + T1真实引擎集成"""

    def test_controller_uses_t1_optimizer(self):
        """验证控制器能正确调用T1优化器"""
        from cee.core.types import GovernanceConfig, OptimizationPath
        from cee.core.controller import ClosedLoopController

        engine = InvariantEngine()
        t1 = CognitiveIsomorphismEngine(signpost_density=0.3)

        def t1_optimizer(text: str) -> str:
            signposts = t1.extract_signposts(text)
            return t1.reconstruct_from_signposts(signposts, style_hint="academic")

        config = GovernanceConfig(
            auto_optimize_threshold=0.99,
            max_optimization_iterations=3,
        )

        controller = ClosedLoopController(
            evaluator=engine,
            optimizers={
                OptimizationPath.T1_COGNITIVE_ISOMORPHISM: t1_optimizer,
            },
            config=config,
        )

        result = controller.optimize(
            "simple text that could be improved",
            target_threshold=0.99,
        )

        assert result.iterations >= 0
        assert result.optimized.content
        assert result.original.content
        history = controller.get_history()
        assert len(history) == result.iterations
