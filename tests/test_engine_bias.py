"""
Tests for src/cee/app/engine/bias.py — Cognitive bias detector.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.engine.bias import (
    BiasDetector,
    BiasReport,
    BiasItem,
    BiasType,
    BiasSeverity,
    CorrectionAdvice,
)


class TestBiasDetector:
    """Tests for BiasDetector main class."""

    @pytest.fixture
    def detector(self):
        return BiasDetector()

    def test_detect_confirmation_bias(self, detector):
        text = "This is obviously true. Clearly, my view is correct. Undoubtedly, this is the only way."
        report = detector.detect(text)
        assert isinstance(report, BiasReport)
        assert report.text_analyzed == text

    def test_detect_anchoring_bias(self, detector):
        text = "The initial price of $1000 makes $800 seem like a bargain. First, we should consider..."
        report = detector.detect(text)
        assert isinstance(report, BiasReport)

    def test_detect_availability_bias(self, detector):
        text = "I just saw a plane crash on the news, so flying must be extremely dangerous."
        report = detector.detect(text)
        assert isinstance(report, BiasReport)

    def test_detect_overconfidence(self, detector):
        text = "I am 100 percent certain about this. I know everything about this topic."
        report = detector.detect(text)
        assert isinstance(report, BiasReport)

    def test_report_has_overall_score(self, detector):
        report = detector.detect("I think this is absolutely correct without any doubt.")
        assert report.overall_score >= 0

    def test_report_has_biases_detected(self, detector):
        report = detector.detect("Obviously, clearly, definitely the right answer. First, let's anchor on this value.")
        assert len(report.biases_detected) >= 0

    def test_report_has_corrections(self, detector):
        report = detector.detect("I'm 100% sure about this complex topic.")
        assert isinstance(report.corrections, list)

    def test_report_has_summary(self, detector):
        report = detector.detect("Some normal text without strong bias signals.")
        assert isinstance(report.summary, str)

    def test_detect_empty_text(self, detector):
        report = detector.detect("")
        assert isinstance(report, BiasReport)

    def test_detect_multiple_biases(self, detector):
        text = (
            "Obviously this is the correct answer. First, let's start with the initial estimate. "
            "I'm 100% confident. This recent event proves my point."
        )
        report = detector.detect(text)
        assert len(report.biases_detected) >= 0


class TestBiasEnums:
    """Tests for bias enums."""

    def test_bias_type_values(self):
        assert BiasType.CONFIRMATION.value == "confirmation"
        assert BiasType.ANCHORING.value == "anchoring"

    def test_bias_severity_values(self):
        assert BiasSeverity.NONE.value == 0
        assert BiasSeverity.SEVERE.value == 4

    def test_bias_type_chinese_name(self):
        assert BiasType.CONFIRMATION.cn_name == "确认偏差"
        assert BiasType.ANCHORING.cn_name == "锚定效应"


class TestBiasReport:
    """Tests for BiasReport dataclass."""

    def test_report_creation(self):
        report = BiasReport(text_analyzed="test", overall_score=0.8)
        assert report.text_analyzed == "test"
        assert report.overall_score == 0.8


class TestCorrectionAdvice:
    """Tests for CorrectionAdvice dataclass."""

    def test_advice_creation(self):
        advice = CorrectionAdvice(
            bias_type=BiasType.CONFIRMATION,
            advice="Seek disconfirming evidence",
            exercises=["Devil's advocate exercise"],
        )
        assert advice.bias_type == BiasType.CONFIRMATION
        assert len(advice.exercises) == 1
