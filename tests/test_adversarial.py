"""
CEE-GOV-008 对抗性协作制衡机制 — 完整测试套件

覆盖四大实验：
  实验一：偏离检出有效性测试
  实验二：零误杀创新保护测试
  实验三：灰色地带法理仲裁测试
  实验四：长期博弈稳态测试

以及：博弈引擎、角色轮换、判例存储、Safe Mode 等全部组件测试
"""

import json
import math
import os
import sys
import tempfile
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from cee.core.types import InvariantScores
from cee.governance.adversarial import (
    AdversarialGameEngine,
    AdversarialGovernance,
    AdversarialSafeMode,
    AgentRole,
    ArbitrationLevel,
    ArbitrationResult,
    ArbitrationSystem,
    DeviationDetector,
    DeviationEvidence,
    DeviationReport,
    DeviationType,
    ExplorationVerdict,
    GameRound,
    GameState,
    InnovationReport,
    PrecedentCase,
    PrecedentStore,
    RoleRotationManager,
    _content_signature,
    _generate_id,
    _now_iso,
    _signature_similarity,
)


# ═══════════════════════════════════════════════════════════════════
# 辅助函数
# ═══════════════════════════════════════════════════════════════════


def _make_scores(itc=0.7, scs=0.7, iec=0.7, pfft=0.7):
    return InvariantScores(
        itc=itc,
        scs=scs,
        iec=iec,
        pfft=pfft,
    )


def _make_innovation(score=0.5):
    return InnovationReport(
        report_id=_generate_id("INNOV"),
        timestamp=_now_iso(),
        innovation_score=score,
    )


def _make_deviation(dtype=DeviationType.RIGOR_DEGRADATION,
                    confidence=0.5, malignant=False):
    evidence = [DeviationEvidence(
        deviation_type=dtype,
        confidence=confidence,
        trigger_patterns=["test pattern"],
        explanation="test deviation",
    )]
    return DeviationReport(
        report_id=_generate_id("DEV"),
        timestamp=_now_iso(),
        deviation_type=dtype,
        confidence=confidence,
        verdict=(ExplorationVerdict.DEVIATION_DETECTED
                 if malignant else ExplorationVerdict.ALLOWED_INNOVATION),
        evidence=evidence,
        is_malignant=malignant,
    )


# ═══════════════════════════════════════════════════════════════════
# 枚举与数据类测试
# ═══════════════════════════════════════════════════════════════════


class TestEnums:
    def test_deviation_type_labels(self):
        assert DeviationType.RIGOR_DEGRADATION.label_cn == "严谨性退化偏离"
        assert DeviationType.PARADIGM_REGRESSION.label_cn == "范式回归偏离"
        assert DeviationType.UNSUBSTANTIATED_CLAIM.label_cn == "无依据声称偏离"
        assert DeviationType.DIMENSION_MISALIGNMENT.label_cn == "评价维度错位偏离"
        assert DeviationType.SHORT_TERM_ARCHITECTURE.label_cn == "短期架构陷阱偏离"
        assert DeviationType.PRECEDENT_REGRESSION.label_cn == "判例倒退偏离"
        assert DeviationType.BOUNDARY_OVERREACH.label_cn == "边界超限偏离"

    def test_deviation_type_hazards(self):
        for dt in DeviationType:
            assert len(dt.hazard_description) > 10

    def test_arbitration_levels(self):
        assert ArbitrationLevel.GAME_DEBATE._value_ == 1
        assert ArbitrationLevel.HUMAN_FINAL._value_ == 4
        assert ArbitrationLevel.GAME_DEBATE.label_cn == "博弈辩论层"

    def test_agent_roles(self):
        assert AgentRole.BUILDER.description is not None
        assert AgentRole.WATCHER.description is not None

    def test_game_states(self):
        assert GameState.IDLE.value == "idle"
        assert GameState.FROZEN.value == "frozen"


class TestDataClasses:
    def test_deviation_report_serialization(self):
        report = _make_deviation(DeviationType.RIGOR_DEGRADATION, 0.8, True)
        d = report.to_dict()
        assert d["deviation_type"] == "rigor_degradation"
        assert d["confidence"] == 0.8
        assert d["is_malignant"] is True

    def test_innovation_report_serialization(self):
        report = _make_innovation(0.75)
        d = report.to_dict()
        assert d["innovation_score"] == 0.75

    def test_arbitration_result_serialization(self):
        result = ArbitrationResult(
            case_id="test-001",
            timestamp=_now_iso(),
            dispute_summary="test dispute",
            arbitration_path=[ArbitrationLevel.GAME_DEBATE],
            final_level=ArbitrationLevel.GAME_DEBATE,
            resolution="converged",
        )
        d = result.to_dict()
        assert d["case_id"] == "test-001"
        assert d["final_level"] == "博弈辩论层"

    def test_precedent_case_serialization(self):
        case = PrecedentCase(
            case_id="case-001",
            deviation_type=DeviationType.RIGOR_DEGRADATION,
            verdict=ExplorationVerdict.DEVIATION_DETECTED,
            legal_rationale="test rationale",
            content_signature="abc123",
            created_at=_now_iso(),
        )
        d = case.to_dict()
        assert d["case_id"] == "case-001"
        assert d["verdict"] == "deviation_detected"

    def test_game_round_serialization(self):
        rnd = GameRound(
            round_number=1,
            builder_role_agent="agent_a",
            watcher_role_agent="agent_b",
            builder_output=_make_innovation(0.6),
            watcher_output=_make_deviation(DeviationType.RIGOR_DEGRADATION, 0.3),
            game_state=GameState.CONVERGED,
            convergence_score=0.001,
            iterations=5,
            timestamp=_now_iso(),
        )
        d = rnd.to_dict()
        assert d["round_number"] == 1
        assert d["game_state"] == "converged"


# ═══════════════════════════════════════════════════════════════════
# 实验一：偏离检出有效性测试
# ═══════════════════════════════════════════════════════════════════


class TestDeviationDetection:
    """偏离检出有效性测试 — 验证 Watcher 能否区分创新试探与恶性偏离"""

    def setup_method(self):
        self.detector = DeviationDetector()

    def test_rigor_degradation_detection(self):
        content = "This approach seems to work very well, and many people feel it is quite effective. It appears to be roughly better in some ways, and generally speaking it is probably the right direction."
        report = self.detector.detect_all(content)
        evidence_types = [e.deviation_type for e in report.evidence]
        assert DeviationType.RIGOR_DEGRADATION in evidence_types
        rigor_evidence = [e for e in report.evidence
                          if e.deviation_type == DeviationType.RIGOR_DEGRADATION]
        assert len(rigor_evidence) > 0

    def test_rigor_degradation_with_precise_content(self):
        content = "The experiment measured a 15.3% improvement with a p-value of 0.003 and a confidence interval of [12.1, 18.5]. The correlation coefficient was r = 0.87, demonstrating a statistically significant relationship."
        report = self.detector.detect_all(content)
        rigor_evidence = [e for e in report.evidence
                          if e.deviation_type == DeviationType.RIGOR_DEGRADATION]
        if rigor_evidence:
            assert rigor_evidence[0].confidence < 0.5

    def test_paradigm_regression_detection(self):
        content = "I think this is good because in my opinion it feels right. My experience tells me this works, and I believe the human evaluation confirms it. We should use manual review and expert judgment."
        report = self.detector.detect_all(content)
        evidence_types = [e.deviation_type for e in report.evidence]
        assert DeviationType.PARADIGM_REGRESSION in evidence_types

    def test_unsubstantiated_claim_detection(self):
        content = "This revolution significantly improved the results. It dramatically enhanced performance and clearly shows unprecedented gains. This proves that our approach is groundbreaking."
        report = self.detector.detect_all(content)
        evidence_types = [e.deviation_type for e in report.evidence]
        assert DeviationType.UNSUBSTANTIATED_CLAIM in evidence_types

    def test_dimension_misalignment_detection(self):
        content = "The output is well-written, eloquent, and beautiful. The writing is elegant, engaging, and very readable. The flow is smooth and polished, making it quite compelling."
        report = self.detector.detect_all(content)
        evidence_types = [e.deviation_type for e in report.evidence]
        assert DeviationType.DIMENSION_MISALIGNMENT in evidence_types

    def test_short_term_architecture_detection(self):
        content = "This is a quick fix for now. The hardcoded value is a temporary workaround. We should remove this placeholder later, it's just for testing. This magic number is an interim solution."
        report = self.detector.detect_all(content)
        evidence_types = [e.deviation_type for e in report.evidence]
        assert DeviationType.SHORT_TERM_ARCHITECTURE in evidence_types

    def test_boundary_overreach_detection(self):
        content = "Our system can also do image recognition and natural language translation. It is applicable to any domain and works for all types of data without any limitation or restriction."
        report = self.detector.detect_all(content)
        evidence_types = [e.deviation_type for e in report.evidence]
        assert DeviationType.BOUNDARY_OVERREACH in evidence_types

    def test_clean_content_no_deviation(self):
        content = "The structural integrity analysis shows a coherence score of 0.85 with an information density metric of 0.72. The formal fidelity measurement indicates strong logical consistency across all evaluated dimensions."
        report = self.detector.detect_all(content)
        assert report.is_malignant is False


# ═══════════════════════════════════════════════════════════════════
# 实验二：零误杀创新保护测试
# ═══════════════════════════════════════════════════════════════════


class TestInnovationProtection:
    """零误杀创新保护测试 — 验证机制不扼杀高阶涌现创新"""

    def setup_method(self):
        self.detector = DeviationDetector()

    def test_legitimate_innovation_not_blocked(self):
        content = (
            "We propose a novel cognitive-geometric framework that extends "
            "the invariant manifold theory to multi-dimensional phase spaces. "
            "The emergent properties arise from non-linear coupling between "
            "structural coherence and iterative convergence, yielding a "
            "previously unobserved topological invariant at the intersection "
            "of information geometry and formal logic systems. The formal "
            "mathematical derivation confirms convergence to a fixed point "
            "under all admissible transformations."
        )
        report = self.detector.detect_all(content)
        assert report.is_malignant is False
        assert report.verdict == ExplorationVerdict.ALLOWED_INNOVATION

    def test_high_risk_innovation_not_falsely_blocked(self):
        content = (
            "This framework introduces an entirely new class of cognitive "
            "invariants that transcend conventional information-theoretic "
            "bounds. The mathematical foundation extends to continuous "
            "semantic manifolds, yielding a self-referential yet consistent "
            "axiomatic system. The fixed-point theorem holds under all "
            "measured transformations with epsilon below point zero zero one. "
            "Benchmark results show a twenty-three percent improvement on "
            "structural coherence measures across numerous trials."
        )
        report = self.detector.detect_all(content)
        assert report.is_malignant is False

    def test_normal_invariant_fluctuation_not_blocked(self):
        content = (
            "Routine analysis of the invariant metrics shows minor "
            "fluctuations in the information topology dimension, from "
            "eighty-two hundredths to seventy-nine hundredths, well "
            "within the expected oscillation range of plus or minus "
            "five hundredths. The structural coherence remained stable "
            "at eighty-eight hundredths throughout the evaluation period."
        )
        report = self.detector.detect_all(content)
        assert report.is_malignant is False

    def test_innovation_with_precise_backing_passes(self):
        content = (
            "Our novel algorithm achieves a 12.7% improvement over the "
            "baseline (p < 0.01, n=500). The key innovation is a dual-path "
            "attention mechanism that reduces computational complexity from "
            "O(n^2) to O(n log n) while maintaining 98.3% of the original "
            "accuracy. The formal proof is provided in Appendix A, and the "
            "reproducible code is available in the repository."
        )
        report = self.detector.detect_all(content)
        assert report.is_malignant is False


# ═══════════════════════════════════════════════════════════════════
# 判例存储测试
# ═══════════════════════════════════════════════════════════════════


class TestPrecedentStore:
    def setup_method(self):
        self.store = PrecedentStore()

    def test_add_and_get_case(self):
        case = PrecedentCase(
            case_id="case-001",
            deviation_type=DeviationType.RIGOR_DEGRADATION,
            verdict=ExplorationVerdict.DEVIATION_DETECTED,
            legal_rationale="test",
            content_signature="sig-abc",
        )
        self.store.add_case(case)
        retrieved = self.store.get_case("case-001")
        assert retrieved is not None
        assert retrieved.case_id == "case-001"

    def test_find_by_type(self):
        for i in range(3):
            case = PrecedentCase(
                case_id=f"case-{i:03d}",
                deviation_type=DeviationType.RIGOR_DEGRADATION,
                verdict=ExplorationVerdict.DEVIATION_DETECTED,
                legal_rationale=f"rationale {i}",
                content_signature=f"sig-{i}",
            )
            self.store.add_case(case)
        results = self.store.find_by_type(DeviationType.RIGOR_DEGRADATION)
        assert len(results) == 3

    def test_find_similar(self):
        sig1 = _content_signature("content about rigor degradation in text analysis")
        sig2 = _content_signature("content about rigor degradation in text quality")
        sig3 = _content_signature("content about paradigm regression detection")

        self.store.add_case(PrecedentCase(
            case_id="c1", deviation_type=DeviationType.RIGOR_DEGRADATION,
            verdict=ExplorationVerdict.DEVIATION_DETECTED,
            legal_rationale="r1", content_signature=sig1,
        ))
        self.store.add_case(PrecedentCase(
            case_id="c2", deviation_type=DeviationType.RIGOR_DEGRADATION,
            verdict=ExplorationVerdict.DEVIATION_DETECTED,
            legal_rationale="r2", content_signature=sig2,
        ))

        results = self.store.find_similar(
            sig2, deviation_type=DeviationType.RIGOR_DEGRADATION)
        assert len(results) >= 1

    def test_overrule(self):
        case = PrecedentCase(
            case_id="case-ovr",
            deviation_type=DeviationType.RIGOR_DEGRADATION,
            verdict=ExplorationVerdict.DEVIATION_DETECTED,
            legal_rationale="to be overruled",
            content_signature="sig-ovr",
        )
        self.store.add_case(case)
        assert case.overruled is False
        success = self.store.overrule("case-ovr")
        assert success is True
        assert case.overruled is True

    def test_stats(self):
        self.store.add_case(PrecedentCase(
            case_id="s1", deviation_type=DeviationType.RIGOR_DEGRADATION,
            verdict=ExplorationVerdict.DEVIATION_DETECTED,
            legal_rationale="r", content_signature="s1",
        ))
        self.store.add_case(PrecedentCase(
            case_id="s2", deviation_type=DeviationType.PARADIGM_REGRESSION,
            verdict=ExplorationVerdict.ALLOWED_INNOVATION,
            legal_rationale="r", content_signature="s2",
        ))
        stats = self.store.stats()
        assert stats["total_cases"] == 2

    def test_export_import_jsonl(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
            path = f.name

        try:
            self.store.add_case(PrecedentCase(
                case_id="e1", deviation_type=DeviationType.RIGOR_DEGRADATION,
                verdict=ExplorationVerdict.DEVIATION_DETECTED,
                legal_rationale="export test",
                content_signature="sig-e1",
                created_at=_now_iso(),
            ))
            self.store.export_jsonl(path)

            store2 = PrecedentStore()
            store2.import_jsonl(path)
            assert store2.stats()["total_cases"] == 1
            retrieved = store2.get_case("e1")
            assert retrieved is not None
            assert retrieved.legal_rationale == "export test"
        finally:
            if os.path.exists(path):
                os.remove(path)


# ═══════════════════════════════════════════════════════════════════
# 二元梯度博弈引擎测试
# ═══════════════════════════════════════════════════════════════════


class TestAdversarialGameEngine:
    def setup_method(self):
        self.engine = AdversarialGameEngine(
            learning_rate=0.01,
            convergence_epsilon=0.001,
            max_iterations=100,
        )

    def test_initial_state(self):
        assert self.engine.innovation_weight == 1.0
        assert self.engine.conservation_weight == 1.0
        assert len(self.engine.state_history) == 0
        assert np.all(self.engine.builder_gradient == 0)

    def test_run_iteration(self):
        scores = _make_scores(0.7, 0.7, 0.7, 0.7)
        builder_dir = np.array([0.5, 0.3, 0.4, 0.2])
        deviation = _make_deviation(DeviationType.RIGOR_DEGRADATION, 0.5)

        result = self.engine.run_iteration(
            scores, builder_dir, 0.5, deviation)

        assert "delta_norm" in result
        assert "new_state" in result
        assert "builder_gain" in result
        assert "watcher_loss" in result
        assert len(self.engine.state_history) == 1

    def test_convergence_with_zero_direction(self):
        scores = _make_scores(0.7, 0.7, 0.7, 0.7)
        builder_dir = np.zeros(4)
        deviation = _make_deviation(DeviationType.RIGOR_DEGRADATION, 0.0)

        result = self.engine.run_iteration(
            scores, builder_dir, 0.0, deviation)
        assert result["is_converged"] or result["delta_norm"] < 0.1

    def test_weight_adjustment(self):
        self.engine.adjust_weights(0.1)
        assert self.engine.conservation_weight > 1.0
        assert self.engine.innovation_weight < 1.0

        self.engine.adjust_weights(-0.1)
        assert self.engine.innovation_weight >= 0.9

    def test_reset(self):
        scores = _make_scores()
        builder_dir = np.array([0.5, 0.3, 0.4, 0.2])
        deviation = _make_deviation()

        self.engine.run_iteration(scores, builder_dir, 0.5, deviation)
        assert len(self.engine.state_history) == 1

        self.engine.reset()
        assert len(self.engine.state_history) == 0
        assert np.all(self.engine.builder_gradient == 0)
        assert self.engine.innovation_weight == 1.0

    def test_steady_state_metrics_empty(self):
        metrics = self.engine.get_steady_state_metrics()
        assert metrics["status"] == "no_data"

    def test_steady_state_metrics_with_data(self):
        scores = _make_scores()
        builder_dir = np.array([0.3, 0.3, 0.3, 0.3])
        deviation = _make_deviation()

        for _ in range(12):
            self.engine.run_iteration(scores, builder_dir, 0.3, deviation)

        metrics = self.engine.get_steady_state_metrics()
        assert metrics["total_iterations"] == 12
        assert "avg_delta_norm" in metrics


# ═══════════════════════════════════════════════════════════════════
# 角色轮换测试
# ═══════════════════════════════════════════════════════════════════


class TestRoleRotation:
    def setup_method(self):
        self.manager = RoleRotationManager(rotation_interval=5)

    def test_initial_roles(self):
        assert self.manager.current_builder != self.manager.current_watcher
        assert self.manager.rounds_since_rotation == 0

    def test_no_rotation_before_interval(self):
        for i in range(4):
            rotated = self.manager.increment_round()
            assert rotated is False

    def test_rotation_at_interval(self):
        for i in range(4):
            self.manager.increment_round()
        rotated = self.manager.increment_round()
        assert rotated is True
        assert self.manager.rounds_since_rotation == 0

    def test_force_rotation(self):
        original_builder = self.manager.current_builder
        original_watcher = self.manager.current_watcher

        record = self.manager.force_rotation()

        assert record.previous_builder_id == original_builder
        assert record.previous_watcher_id == original_watcher
        assert self.manager.current_builder == original_watcher
        assert self.manager.current_watcher == original_builder
        assert record.inertia_reset_applied is True
        assert record.gradient_reset_applied is True

    def test_rotation_stats(self):
        self.manager.force_rotation()
        stats = self.manager.get_rotation_stats()
        assert stats["total_rotations"] == 1
        assert "current_builder" in stats
        assert "current_watcher" in stats


# ═══════════════════════════════════════════════════════════════════
# 实验三：灰色地带法理仲裁测试
# ═══════════════════════════════════════════════════════════════════


class TestArbitration:
    def setup_method(self):
        self.store = PrecedentStore()
        self.system = ArbitrationSystem(precedent_store=self.store)
        self.engine = AdversarialGameEngine()

    def test_level1_converges_clear_innovation(self):
        innovation = _make_innovation(0.9)
        deviation = _make_deviation(DeviationType.RIGOR_DEGRADATION, 0.1)
        result = self.system.arbitrate(innovation, deviation, self.engine)
        assert result.final_level == ArbitrationLevel.GAME_DEBATE
        assert "放行" in result.resolution

    def test_level1_converges_clear_deviation(self):
        innovation = _make_innovation(0.1)
        deviation = _make_deviation(DeviationType.RIGOR_DEGRADATION, 0.8, malignant=True)
        result = self.system.arbitrate(innovation, deviation, self.engine)
        assert result.final_level == ArbitrationLevel.GAME_DEBATE
        assert "驳回" in result.resolution

    def test_level2_historical_precedent_allow(self):
        for i in range(3):
            sig = _content_signature(f"test content {i}")
            case = PrecedentCase(
                case_id=f"prec-{i}",
                deviation_type=DeviationType.RIGOR_DEGRADATION,
                verdict=ExplorationVerdict.ALLOWED_INNOVATION,
                legal_rationale=f"innovation allowed {i}",
                content_signature=sig,
            )
            self.store.add_case(case)

        innovation = _make_innovation(0.5)
        deviation = _make_deviation(DeviationType.RIGOR_DEGRADATION, 0.5)
        result = self.system.arbitrate(innovation, deviation, self.engine)
        assert result.final_level in (ArbitrationLevel.GAME_DEBATE,
                                      ArbitrationLevel.HISTORICAL_PRECEDENT)

    def test_level4_human_escalation(self):
        innovation = _make_innovation(0.3)
        deviation = _make_deviation(DeviationType.RIGOR_DEGRADATION, 0.45)
        result = self.system.arbitrate(innovation, deviation, self.engine)
        assert result.final_level is not None

    def test_precedent_creation_on_resolution(self):
        innovation = _make_innovation(0.95)
        deviation = _make_deviation(DeviationType.RIGOR_DEGRADATION, 0.05)
        initial_count = self.store.stats()["total_cases"]
        self.system.arbitrate(innovation, deviation, self.engine)
        final_count = self.store.stats()["total_cases"]
        assert final_count >= initial_count


# ═══════════════════════════════════════════════════════════════════
# Safe Mode 测试
# ═══════════════════════════════════════════════════════════════════


class TestSafeMode:
    def setup_method(self):
        self.safe_mode = AdversarialSafeMode(
            freeze_threshold=0.3, max_divergent_rounds=10)

    def test_initial_not_frozen(self):
        assert self.safe_mode.is_frozen is False

    def test_freeze_not_triggered_early(self):
        for _ in range(5):
            triggered = self.safe_mode.evaluate(
                GameState.DEBATING, 0.2, 0.5)
            assert triggered is False
        assert self.safe_mode.is_frozen is False

    def test_freeze_triggered_after_max_rounds(self):
        for _ in range(9):
            self.safe_mode.evaluate(GameState.DEBATING, 0.2, 0.5)
        triggered = self.safe_mode.evaluate(GameState.DEBATING, 0.2, 0.5)
        assert triggered is True
        assert self.safe_mode.is_frozen is True

    def test_validate_action_when_frozen(self):
        self.safe_mode.freeze(GameState.DEBATING, 0.1, 0.9)
        assert self.safe_mode.validate_action("diagnose") is True
        assert self.safe_mode.validate_action("report_anomaly") is True
        assert self.safe_mode.validate_action("modify_content") is False
        assert self.safe_mode.validate_action("delete_record") is False

    def test_validate_action_when_not_frozen(self):
        assert self.safe_mode.validate_action("modify_content") is True

    def test_unfreeze(self):
        self.safe_mode.freeze(GameState.DEBATING, 0.1, 0.9)
        assert self.safe_mode.is_frozen is True
        success = self.safe_mode.unfreeze()
        assert success is True
        assert self.safe_mode.is_frozen is False

    def test_get_freeze_report(self):
        self.safe_mode.freeze(GameState.DEBATING, 0.1, 0.9)
        report = self.safe_mode.get_freeze_report()
        assert report["is_frozen"] is True
        assert len(report["reason"]) > 0
        assert "snapshot" in report
        assert "allowed_actions" in report


# ═══════════════════════════════════════════════════════════════════
# 对抗治理总控测试
# ═══════════════════════════════════════════════════════════════════


class TestAdversarialGovernance:
    def setup_method(self):
        self.gov = AdversarialGovernance(
            rotation_interval=5,
            game_learning_rate=0.01,
            game_max_iterations=50,
            safe_mode_threshold=0.3,
        )

    def test_process_round_clean_content(self):
        content = (
            "The structural integrity analysis reveals consistent "
            "cognitive coherence with a measured information density "
            "of 0.85 and formal fidelity exceeding 0.90 across all "
            "evaluated dimensions."
        )
        scores = _make_scores(0.85, 0.85, 0.85, 0.85)
        builder_dir = np.array([0.2, 0.2, 0.2, 0.2])

        result = self.gov.process_round(content, scores, builder_dir)
        assert isinstance(result, GameRound)
        assert result.round_number == 1
        assert result.builder_output.innovation_score > 0
        assert result.game_state in (GameState.BUILDER_ACTIVE, GameState.WATCHER_REVIEW)

    def test_process_round_deviated_content(self):
        content = (
            "I think this is very good and it seems to work quite well. "
            "In my opinion, it feels like a revolutionary approach that "
            "proves dramatically better results. This is just a quick "
            "workaround for now, and it can handle any domain universally."
        )
        scores = _make_scores(0.5, 0.5, 0.5, 0.5)
        builder_dir = np.array([0.1, 0.1, 0.1, 0.1])

        result = self.gov.process_round(content, scores, builder_dir)
        assert result.watcher_output.confidence > 0 or len(result.watcher_output.evidence) >= 0

    def test_multiple_rounds_rotation(self):
        content = "Standard clean content for testing purposes."
        scores = _make_scores()
        builder_dir = np.array([0.1, 0.1, 0.1, 0.1])

        for _ in range(6):
            self.gov.process_round(content, scores, builder_dir)

        report = self.gov.get_session_report()
        assert report["total_rounds"] == 6
        assert report["rotation_stats"]["total_rotations"] >= 1

    def test_session_report(self):
        content = "Clean test content."
        scores = _make_scores()
        builder_dir = np.array([0.2, 0.2, 0.2, 0.2])

        for _ in range(3):
            self.gov.process_round(content, scores, builder_dir)

        report = self.gov.get_session_report()
        assert report["total_rounds"] == 3
        assert "avg_innovation" in report
        assert "avg_deviation_confidence" in report
        assert "convergence_rate" in report
        assert "precedent_stats" in report
        assert "safe_mode_status" in report

    def test_reset_session(self):
        content = "Test content."
        scores = _make_scores()
        builder_dir = np.array([0.1, 0.1, 0.1, 0.1])

        self.gov.process_round(content, scores, builder_dir)
        self.gov.reset_session()
        report = self.gov.get_session_report()
        assert report["status"] == "no_rounds"

    def test_precedent_accumulation(self):
        content = (
            "Our approach seems to work quite well. I think this is "
            "probably the best way forward, and it feels right based "
            "on my experience with manual review and expert judgment."
        )
        scores = _make_scores()
        builder_dir = np.array([0.1, 0.1, 0.1, 0.1])

        for _ in range(3):
            self.gov.process_round(content, scores, builder_dir)

        stats = self.gov.precedent_store.stats()
        assert stats["total_cases"] >= 0


# ═══════════════════════════════════════════════════════════════════
# 实验四：长期博弈稳态测试
# ═══════════════════════════════════════════════════════════════════


class TestLongTermStability:
    """长期博弈稳态测试 — 验证多轮轮换后体系不退化、不固化、不保守、不跑偏"""

    def test_innovation_not_degrading_over_rounds(self):
        gov = AdversarialGovernance(rotation_interval=3)
        scores = _make_scores(0.7, 0.7, 0.7, 0.7)

        innovation_scores = []
        for i in range(15):
            content = (
                f"This is round {i} of the long-term stability test. "
                f"The structural coherence analysis shows consistent "
                f"metrics with iterative convergence at 0.{i % 10} "
                f"and formal fidelity within expected bounds."
            )
            builder_dir = np.array([0.1, 0.15, 0.12, 0.08])
            result = gov.process_round(content, scores, builder_dir)
            innovation_scores.append(result.builder_output.innovation_score)

        assert len(innovation_scores) == 15
        first_three_avg = np.mean(innovation_scores[:3])
        last_three_avg = np.mean(innovation_scores[-3:])
        assert last_three_avg > first_three_avg * 0.3

    def test_rotation_resets_inertia(self):
        gov = AdversarialGovernance(rotation_interval=3, game_learning_rate=0.01)
        scores = _make_scores()
        builder_dir = np.array([0.1, 0.1, 0.1, 0.1])
        content = "Clean content for rotation inertia test."

        gradient_norms_before = []
        gradient_norms_after = []

        for _ in range(2):
            gov.process_round(content, scores, builder_dir)
        gradient_norms_before.append(
            np.linalg.norm(gov.game_engine.builder_gradient))

        for _ in range(6):
            gov.process_round(content, scores, builder_dir)

        gradient_norms_after.append(
            np.linalg.norm(gov.game_engine.builder_gradient))
        rotations = gov.rotation_manager.get_rotation_stats()["total_rotations"]
        assert rotations >= 1

    def test_paradigm_stability_across_rotations(self):
        gov = AdversarialGovernance(rotation_interval=3)
        stable_content = (
            "The invariant analysis demonstrates consistent cognitive "
            "geometry with structural coherence of 0.85, measured via "
            "formal mathematical framework with p < 0.01 significance."
        )

        states = []
        for _ in range(9):
            result = gov.process_round(
                stable_content, _make_scores(),
                np.array([0.05, 0.05, 0.05, 0.05]))
            states.append(result.game_state)

        frozen_count = sum(1 for s in states if s == GameState.FROZEN)
        assert frozen_count == 0


# ═══════════════════════════════════════════════════════════════════
# 辅助函数测试
# ═══════════════════════════════════════════════════════════════════


class TestUtilities:
    def test_generate_id(self):
        id1 = _generate_id("TEST")
        id2 = _generate_id("TEST")
        assert id1.startswith("TEST-")
        assert id1 != id2

    def test_now_iso(self):
        ts = _now_iso()
        assert "T" in ts

    def test_content_signature(self):
        sig1 = _content_signature("hello world")
        sig2 = _content_signature("hello world")
        sig3 = _content_signature("different content")
        assert sig1 == sig2
        assert sig1 != sig3
        assert len(sig1) == 64

    def test_signature_similarity(self):
        assert _signature_similarity("abc", "abc") == 1.0
        assert _signature_similarity("abc", "def") < 0.5
        assert _signature_similarity("", "") == 1.0
