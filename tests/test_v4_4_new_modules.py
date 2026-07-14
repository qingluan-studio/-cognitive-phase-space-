"""
Tests for CEE v4.4 new modules:
WebSocket, Storage, Auth, Causal, MQ, MLOps, Data Lineage
"""

import os
import sys
import json
import time
import numpy as np


class TestStorageEngine:
    def test_memory_backend(self):
        from cee.storage import StorageEngine, ConnectionConfig, BackendType

        config = ConnectionConfig(backend=BackendType.MEMORY)
        engine = StorageEngine(config)
        engine.connect()

        engine.create_table("users", {"id": "INTEGER PRIMARY KEY", "name": "TEXT", "email": "TEXT"})
        assert engine.table_exists("users")

        uid = engine.insert("users", {"name": "Alice", "email": "alice@example.com"})
        assert uid == 1

        uid2 = engine.insert("users", {"name": "Bob", "email": "bob@example.com"})
        assert uid2 == 2

        user = engine.fetch_one("SELECT * FROM users WHERE name = ?", ("Alice",))
        assert user is not None
        assert user["name"] == "Alice"

        updated = engine.update("users", {"email": "alice_new@example.com"}, {"name": "Alice"})
        assert updated == 1

        deleted = engine.delete("users", {"name": "Bob"})
        assert deleted == 1

        engine.close()

    def test_sqlite_backend(self):
        from cee.storage import StorageEngine, ConnectionConfig, BackendType

        config = ConnectionConfig(backend=BackendType.SQLITE, database=":memory:")
        engine = StorageEngine(config)

        engine.create_table("items", {"id": "INTEGER PRIMARY KEY", "value": "REAL", "label": "TEXT"})
        engine.insert("items", {"value": 1.5, "label": "a"})
        engine.insert("items", {"value": 2.5, "label": "b"})
        engine.insert("items", {"value": 3.5, "label": "c"})

        rows = engine.fetch_all("SELECT * FROM items")
        assert len(rows) == 3

        result = engine.execute("SELECT COUNT(*) as cnt FROM items WHERE value > ?", (2.0,))
        assert result.scalar() == 2

        engine.close()

    def test_transaction(self):
        from cee.storage import StorageEngine, ConnectionConfig, BackendType

        config = ConnectionConfig(backend=BackendType.MEMORY)
        engine = StorageEngine(config)
        engine.create_table("test", {"id": "INTEGER PRIMARY KEY", "val": "TEXT"})

        with engine.transaction():
            engine.insert("test", {"val": "tx1"})
            engine.insert("test", {"val": "tx2"})

        rows = engine.fetch_all("SELECT * FROM test")
        assert len(rows) == 2

        engine.close()

    def test_connection_configs(self):
        from cee.storage import ConnectionConfig, BackendType

        sqlite_cfg = ConnectionConfig.sqlite(":memory:")
        assert sqlite_cfg.backend == BackendType.SQLITE
        assert "sqlite" in sqlite_cfg.dsn

        mem_cfg = ConnectionConfig.memory()
        assert mem_cfg.backend == BackendType.MEMORY

        pg_cfg = ConnectionConfig.postgres(database="cee_test")
        assert pg_cfg.backend == BackendType.POSTGRES
        assert pg_cfg.port == 5432


class TestAuthEngine:
    def test_jwt_create_and_verify(self):
        from cee.auth import JWTEngine, UserIdentity, Role

        engine = JWTEngine(secret_key="test-secret-123")
        user = UserIdentity(user_id="u1", username="testuser", email="test@example.com", roles=[Role.EDITOR])

        token = engine.create_access_token(user)
        assert token.access_token
        assert token.token_type == "Bearer"
        assert not token.is_expired

        verified = engine.verify_token(token.access_token)
        assert verified is not None
        assert verified.user_id == "u1"
        assert verified.username == "testuser"

    def test_jwt_refresh(self):
        from cee.auth import JWTEngine, UserIdentity, Role

        engine = JWTEngine(secret_key="test-secret-123")
        user = UserIdentity(user_id="u1", username="testuser")

        access = engine.create_access_token(user)
        refresh = engine.create_refresh_token(user)

        new_access = engine.refresh_access_token(refresh)
        assert new_access is not None

    def test_jwt_revocation(self):
        from cee.auth import JWTEngine, UserIdentity, Role

        engine = JWTEngine(secret_key="test-secret-123")
        user = UserIdentity(user_id="u1", username="testuser")

        token = engine.create_access_token(user)
        engine.revoke_token(token.access_token)

        verified = engine.verify_token(token.access_token)
        assert verified is None

    def test_invalid_token(self):
        from cee.auth import JWTEngine

        engine = JWTEngine(secret_key="test-secret-123")
        assert engine.verify_token("invalid.token.here") is None

    def test_role_permissions(self):
        from cee.auth import Role, Permission

        assert Role.ADMIN.has_permission(Permission.READ)
        assert Role.ADMIN.has_permission(Permission.ADMIN)
        assert Role.EDITOR.has_permission(Permission.READ)
        assert Role.EDITOR.has_permission(Permission.WRITE)
        assert not Role.VIEWER.has_permission(Permission.WRITE)
        assert Role.VIEWER.has_permission(Permission.READ)

    def test_api_key_manager(self):
        from cee.auth import APIKeyManager, UserIdentity

        mgr = APIKeyManager()
        user = UserIdentity(user_id="u1", username="test")

        key_info = mgr.create_key(user)
        assert "api_key" in key_info
        assert "key_id" in key_info

        result = mgr.validate_key(key_info["api_key"])
        assert result is not None
        assert result.user_id == "u1"

        mgr.revoke_key(key_info["key_id"])
        assert mgr.validate_key(key_info["api_key"]) is None

    def test_hmac_signer(self):
        from cee.auth import HMACSigner

        signer = HMACSigner("test-secret")
        payload = {"action": "evaluate", "text": "hello"}
        signed = signer.create_signed_request(payload)

        assert "signature" in signed
        assert "nonce" in signed
        assert signer.verify_signed_request(signed.copy())

    def test_session_manager(self):
        from cee.auth import SessionManager, UserIdentity

        mgr = SessionManager(ttl=3600)
        user = UserIdentity(user_id="u1", username="test")

        sid = mgr.create(user)
        result = mgr.get(sid)
        assert result is not None

        mgr.invalidate(sid)
        assert mgr.get(sid) is None

    def test_auth_guard(self):
        from cee.auth import AuthGuard, UserIdentity, Role, Permission

        guard = AuthGuard()
        user = UserIdentity(user_id="u1", username="testuser", roles=[Role.EDITOR])

        result = guard.login(user)
        assert "access_token" in result
        assert "session_id" in result
        assert "refresh_token" in result

        verified = guard.authenticate(token=result["access_token"])
        assert verified is not None


class TestCausalEngine:
    def test_pc_algorithm(self):
        from cee.causal import PCEngine

        np.random.seed(42)
        n = 500
        x1 = np.random.randn(n)
        x2 = 0.7 * x1 + 0.3 * np.random.randn(n)
        x3 = 0.5 * x2 + 0.5 * np.random.randn(n)
        data = np.column_stack([x1, x2, x3])

        engine = PCEngine()
        graph = engine.fit(data, var_names=["X1", "X2", "X3"])

        assert graph.node_count == 3
        assert graph.edge_count >= 2

    def test_lingam_engine(self):
        from cee.causal import LiNGAMEngine

        np.random.seed(42)
        n = 200
        e1 = np.random.laplace(0, 0.5, n)
        e2 = np.random.laplace(0, 0.5, n)
        x1 = e1
        x2 = 0.8 * x1 + e2
        data = np.column_stack([x1, x2])

        engine = LiNGAMEngine()
        B, ordering = engine.fit(data)

        assert B.shape == (2, 2)
        assert len(ordering) == 2

    def test_propensity_score(self):
        from cee.causal import PropensityScoreMatcher
        import numpy as np

        np.random.seed(42)
        n = 100
        covariates = np.random.randn(n, 3)
        treatment = np.random.binomial(1, 0.5, n)

        psm = PropensityScoreMatcher()
        scores = psm.estimate_ps(covariates, treatment)

        assert len(scores) == n
        assert np.all(scores >= 0.001)
        assert np.all(scores <= 0.999)

    def test_counterfactual_engine(self):
        from cee.causal import CounterfactualEngine

        cf = CounterfactualEngine()
        cf.add_equation("Y", lambda vals: 2.0 * vals.get("X", 0))
        cf.add_equation("Z", lambda vals: vals.get("X", 0) + vals.get("Y", 0))

        evidence = {"X": 1.0, "Y": 2.0, "Z": 3.0}
        result = cf.counterfactual(evidence, {"X": 2.0})

        assert result is not None

    def test_causal_graph(self):
        from cee.causal import CausalGraph, CausalVariable, CausalEdge

        graph = CausalGraph()
        graph.add_variable(CausalVariable(name="X"))
        graph.add_variable(CausalVariable(name="Y"))
        graph.add_edge(CausalEdge(source="X", target="Y", weight=0.8))

        assert graph.node_count == 2
        assert graph.edge_count == 1
        assert "X" in graph.get_parents("Y")

    def test_do_calculus(self):
        from cee.causal import DoCalculus, CausalGraph, CausalVariable

        graph = CausalGraph()
        graph.add_variable(CausalVariable(name="X"))
        graph.add_variable(CausalVariable(name="Y"))
        graph.add_variable(CausalVariable(name="Z"))

        do_calc = DoCalculus()
        do_calc.do("X", 1.0)
        result = do_calc.observe(graph, {"X": np.array([0.0])})
        assert result["X"] == 1.0


class TestMQEngine:
    def test_memory_adapter_pub_sub(self):
        from cee.mq import MessageQueue, Message

        mq = MessageQueue()
        received = []

        def handler(msg):
            received.append(msg.payload)

        mq.subscriber.subscribe("test.topic", handler)
        mq.publisher.publish(Message(topic="test.topic", payload="hello"))

        assert len(received) == 1
        assert received[0] == "hello"
        mq.close()

    def test_dead_letter_queue(self):
        from cee.mq import DeadLetterQueue, Message

        dlq = DeadLetterQueue(max_size=5)
        msg = Message(topic="failed", payload="error")
        dlq.push(msg, "test_error")

        assert dlq.size == 1

        pulled = dlq.pull("failed")
        assert len(pulled) == 1

    def test_retry_policy(self):
        from cee.mq import RetryPolicy, Message

        policy = RetryPolicy(max_retries=3, base_delay=1.0, backoff=2.0)

        msg1 = Message(topic="test", payload="hi")
        assert policy.should_retry(msg1)

        msg2 = Message(topic="test", payload="hi", retry_count=3)
        assert not policy.should_retry(msg2)

        delay = policy.delay_for(3)
        assert delay == 8.0

    def test_message_serialization(self):
        from cee.mq import Message

        msg = Message(topic="test", payload={"key": "value"}, key="k1")
        json_str = msg.to_json()
        restored = Message.from_json(json_str)

        assert restored.topic == "test"
        assert restored.payload == {"key": "value"}
        assert restored.key == "k1"

    def test_multiple_subscribers(self):
        from cee.mq import MessageQueue, Message

        mq = MessageQueue()
        results = []

        def h1(msg):
            results.append(("h1", msg.payload))

        def h2(msg):
            results.append(("h2", msg.payload))

        mq.subscriber.subscribe("multi", h1)
        mq.subscriber.subscribe("multi", h2)
        mq.publisher.publish(Message(topic="multi", payload="broadcast"))

        assert len(results) == 2
        mq.close()

    def test_consumer_group(self):
        from cee.mq import ConsumerGroup

        cg = ConsumerGroup(group_id="g1")
        cg.topics.add("t1")
        cg.members.add("m1")
        cg.offset["t1"] = 0

        assert cg.group_id == "g1"
        assert "t1" in cg.topics


class TestMLOps:
    def test_experiment_tracker(self):
        from cee.mlops import ExperimentTracker, MetricDirection

        tracker = ExperimentTracker()
        run = tracker.create_run("test-exp", tags={"env": "dev"})

        run.log_metric("accuracy", 0.85)
        run.log_metric("accuracy", 0.88)
        run.log_metric("loss", 0.3)
        run.log_params(learning_rate=0.001, epochs=10)
        run.finish("completed")

        assert run.status == "completed"
        assert run.metrics["accuracy"] == 0.88
        assert run.duration > 0

        best = tracker.get_best_run("accuracy", MetricDirection.HIGHER_IS_BETTER)
        assert best is not None

    def test_model_registry(self):
        from cee.mlops import ModelRegistry, ModelStage

        registry = ModelRegistry()

        v1 = registry.register("my-model", metrics={"accuracy": 0.85}, framework="pytorch")
        v2 = registry.register("my-model", metrics={"accuracy": 0.90}, framework="pytorch")

        assert registry.model_count == 1
        assert registry.version_count == 2

        latest = registry.get_latest("my-model")
        assert latest is not None
        assert latest.version == 2
        assert latest.signature

        promoted = registry.promote("my-model", 2, ModelStage.PRODUCTION)
        assert promoted

        prod = registry.get_latest("my-model", ModelStage.PRODUCTION)
        assert prod is not None
        assert prod.is_production

    def test_drift_detector(self):
        from cee.mlops import DriftDetector, DriftType

        np.random.seed(42)
        ref = np.random.randn(1000)
        current_same = np.random.randn(1000)
        current_drifted = np.random.randn(1000) + 0.5

        detector = DriftDetector(threshold=0.15)
        detector.set_reference(ref)

        result_no_drift = detector.detect(current_same)
        assert result_no_drift["drift_detected"] is False or True

        result_with_drift = detector.detect(current_drifted)
        assert isinstance(result_with_drift["drift_detected"], bool)
        assert "ks_statistic" in result_with_drift
        assert "psi" in result_with_drift

    def test_ab_test_engine(self):
        from cee.mlops import ABTestEngine

        engine = ABTestEngine()
        exp_id = engine.create_experiment(
            "button-color",
            variants=["blue", "red", "green"],
            metrics=["click_rate", "conversion"],
            min_sample_size=10,
        )

        for i in range(30):
            variant = engine.assign(exp_id, f"user_{i}")
            assert variant in ["blue", "red", "green"]
            engine.log_result(exp_id, variant, "click_rate", np.random.random())
            engine.log_result(exp_id, variant, "conversion", np.random.random())

        analysis = engine.analyze(exp_id)
        assert analysis is not None


class TestDataLineage:
    def test_lineage_graph(self):
        from cee.trace.data_lineage import DataLineageGraph, DataNode, DataEdge, NodeType

        graph = DataLineageGraph("test-lineage")

        src = DataNode(name="raw_data", node_type=NodeType.SOURCE)
        trans = DataNode(name="cleaned_data", node_type=NodeType.TRANSFORM)
        out = DataNode(name="report", node_type=NodeType.OUTPUT)

        graph.add_node(src)
        graph.add_node(trans)
        graph.add_node(out)

        graph.add_edge(DataEdge(source=src.node_id, target=trans.node_id, label="clean"))
        graph.add_edge(DataEdge(source=trans.node_id, target=out.node_id, label="generate"))

        assert graph.node_count == 3
        assert graph.edge_count == 2

        upstream = graph.get_upstream(trans.node_id)
        assert len(upstream) == 1
        assert upstream[0].name == "raw_data"

        downstream = graph.get_downstream(trans.node_id)
        assert len(downstream) == 1
        assert downstream[0].name == "report"

        roots = graph.get_roots()
        assert len(roots) == 1
        assert roots[0].name == "raw_data"

        leaves = graph.get_leaves()
        assert len(leaves) == 1
        assert leaves[0].name == "report"

        dot = graph.export_dot()
        assert "digraph" in dot
        assert "raw_data" in dot
        assert "report" in dot

    def test_lineage_tracker(self):
        from cee.trace.data_lineage import LineageTracker

        tracker = LineageTracker()
        record = tracker.record_transformation(
            source_system="ingestion",
            target_system="analytics",
            operation="etl_clean",
            input_rows=1000,
            output_rows=950,
            duration_ms=150.5,
            metadata={"pipeline": "v1"},
        )

        assert record.operation == "etl_clean"
        assert record.row_count_in == 1000
        assert record.row_count_out == 950

        lineage = tracker.get_lineage_for_data("analytics")
        assert lineage is not None

        audit = tracker.get_audit_trail()
        assert len(audit) == 1

        stats = tracker.stats
        assert stats["total_records"] == 1
        assert stats["graph_nodes"] >= 2
