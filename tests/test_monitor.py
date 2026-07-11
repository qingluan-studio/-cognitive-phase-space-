"""
Tests for src/cee/app/monitor/health.py and metrics.py.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.monitor.health import HealthChecker, HealthStatus, HealthCheckResult, HealthSummary
from cee.app.monitor.metrics import MetricsCollector, MetricsSnapshot


class TestHealthChecker:
    """Tests for HealthChecker."""

    @pytest.fixture
    def checker(self):
        return HealthChecker()

    def test_check_all(self, checker):
        summary = checker.check()
        assert isinstance(summary, HealthSummary)
        assert summary.status is not None

    def test_check_specific(self, checker):
        summary = checker.check(names=["memory_usage"])
        assert isinstance(summary, HealthSummary)

    def test_list_checks(self, checker):
        checks = checker.list_checks()
        assert isinstance(checks, list)
        assert len(checks) > 0

    def test_get_history(self, checker):
        checker.check()
        history = checker.get_history(limit=5)
        assert isinstance(history, list)


class TestHealthStatus:
    """Tests for HealthStatus enum."""

    def test_create_healthy(self):
        assert HealthStatus.OK.value == "OK"

    def test_create_unhealthy(self):
        assert HealthStatus.CRITICAL.value == "CRITICAL"

    def test_enum_values(self):
        assert HealthStatus.OK == "OK"
        assert HealthStatus.WARNING == "WARNING"


class TestHealthCheckResult:
    """Tests for HealthCheckResult."""

    def test_creation(self):
        result = HealthCheckResult(name="db", status=HealthStatus.OK)
        assert result.name == "db"
        assert result.status == HealthStatus.OK

    def test_to_dict(self):
        result = HealthCheckResult(name="db", status=HealthStatus.OK, message="OK")
        d = result.to_dict()
        assert d["name"] == "db"
        assert d["status"] == "OK"


class TestHealthSummary:
    """Tests for HealthSummary."""

    def test_creation(self):
        summary = HealthSummary(status=HealthStatus.OK)
        assert summary.status == HealthStatus.OK

    def test_to_dict(self):
        summary = HealthSummary(status=HealthStatus.OK)
        d = summary.to_dict()
        assert d["status"] == "OK"


class TestMetricsCollector:
    """Tests for MetricsCollector."""

    @pytest.fixture
    def collector(self):
        return MetricsCollector()

    def test_record_request(self, collector):
        collector.record_request(100.0, success=True)
        snap = collector.snapshot()
        assert snap.total_requests >= 1

    def test_record_tokens(self, collector):
        collector.record_tokens(500)
        snap = collector.snapshot()
        assert snap.total_tokens >= 500

    def test_snapshot(self, collector):
        collector.record_request(150.0)
        snapshot = collector.snapshot()
        assert isinstance(snapshot, MetricsSnapshot)

    def test_reset(self, collector):
        collector.record_request(100.0)
        collector.reset()
        snap = collector.snapshot()
        assert snap.total_requests == 0

    def test_export_prometheus(self, collector):
        collector.record_request(50.0)
        exported = collector.to_prometheus()
        assert isinstance(exported, str)

    def test_cache_hit_rate(self, collector):
        collector.record_cache_hit()
        collector.record_cache_miss()
        rate = collector.cache_hit_rate
        assert 0.0 <= rate <= 1.0


class TestMetricsSnapshot:
    """Tests for MetricsSnapshot."""

    def test_creation(self):
        snapshot = MetricsSnapshot(
            total_requests=1,
            total_errors=0,
            cache_hits=1,
        )
        assert snapshot.total_requests == 1

    def test_to_dict(self):
        snapshot = MetricsSnapshot(total_requests=10)
        d = snapshot.to_dict()
        assert d["total_requests"] == 10
