"""
Tests for cee.app.engine.context_memory — ContextAwareMemory system.

Covers: init, config serialization, learn_from_conversation, get_context,
remember_instruction, recall, toggles, set/get_config, stats, mark_feedback,
get_session_summary, get_global_context singleton, thread safety,
auto-learning disabled, and edge cases.
"""
import sys
import os

sys.path.insert(0, '/tmp/cee_repo/src')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import json
import tempfile
import threading
import time
from pathlib import Path
from unittest.mock import MagicMock, patch, PropertyMock

import pytest

import cee.app.engine.context_memory as cm_module
from cee.app.engine.context_memory import (
    ContextAwareMemory,
    ContextMemoryConfig,
    get_global_context,
    STORAGE_DIR,
    CONTEXT_CONFIG_FILE,
)
from cee.app.engine.memory import MemoryType, MemoryEntry


# ============================================================
# Fixtures
# ============================================================

@pytest.fixture
def temp_storage():
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        mock_storage = tmp_path / "storage"
        mock_config = tmp_path / "context_memory_config.json"
        with patch.object(cm_module, 'STORAGE_DIR', mock_storage), \
             patch.object(cm_module, 'CONTEXT_CONFIG_FILE', mock_config):
            mock_storage.mkdir(parents=True, exist_ok=True)
            yield {"storage": mock_storage, "config": mock_config}


@pytest.fixture
def mock_components(temp_storage):
    with patch('cee.app.engine.context_memory.MemorySystem') as ms_cls, \
         patch('cee.app.engine.context_memory.AutoLearner') as al_cls, \
         patch('cee.app.engine.context_memory.KnowledgeGraph') as kg_cls, \
         patch('cee.app.engine.context_memory.UserProfile') as up_cls:

        ms = MagicMock()
        al = MagicMock()
        kg = MagicMock()
        up = MagicMock()

        ms_cls.return_value = ms
        al_cls.return_value = al
        kg_cls.return_value = kg
        up_cls.return_value = up

        fake_entry = MemoryEntry(id="mem_1", content="test", memory_type=MemoryType.FACT)

        ms.remember.return_value = fake_entry
        ms.remember_instruction.return_value = fake_entry
        ms.recall.return_value = []
        ms.stats.return_value = {
            "short_term_size": 0, "short_term_capacity": 200,
            "long_term_size": 0, "long_term_capacity": 20000,
            "persistent_path": "", "type_distribution": {},
        }
        ms.save.return_value = None

        al.learn_from.return_value = []
        al.query.return_value = []
        al.get_enrichment.return_value = ""
        al.stats.return_value = {"attempts": 0, "learned": 0, "consolidations": 0}

        kg.get_enrichment.return_value = ""
        kg.stats.return_value = {"nodes": 0, "edges": 0, "avg_degree": 0, "dynamic_nodes": 0}

        up.get_context.return_value = ""
        up.stats.return_value = {"query_count": 0}

        yield {
            'ms': ms, 'ms_cls': ms_cls,
            'al': al, 'al_cls': al_cls,
            'kg': kg, 'kg_cls': kg_cls,
            'up': up, 'up_cls': up_cls,
            'storage': temp_storage,
        }


@pytest.fixture
def cm(mock_components):
    return ContextAwareMemory(session_id="test_session")


def _make_fact(fact_text):
    f = MagicMock()
    f.fact = fact_text
    return f


# ============================================================
# 1. ContextMemoryConfig — Serialization
# ============================================================

class TestContextMemoryConfig:
    def test_default_values(self):
        cfg = ContextMemoryConfig()
        assert cfg.auto_learn_enabled is True
        assert cfg.auto_graph_enabled is True
        assert cfg.auto_profile_enabled is True
        assert cfg.max_context_facts == 5
        assert cfg.max_context_memories == 3
        assert cfg.max_graph_nodes == 5
        assert cfg.persist_interval == 60
        assert cfg.learn_from_user is True
        assert cfg.learn_from_ai is True
        assert cfg.learn_min_confidence == 0.3

    def test_custom_values(self):
        cfg = ContextMemoryConfig(
            auto_learn_enabled=False,
            max_context_facts=10,
            learn_min_confidence=0.5,
        )
        assert cfg.auto_learn_enabled is False
        assert cfg.max_context_facts == 10
        assert cfg.learn_min_confidence == 0.5

    def test_to_dict(self):
        cfg = ContextMemoryConfig(auto_learn_enabled=False, max_context_facts=8)
        d = cfg.to_dict()
        assert d["auto_learn_enabled"] is False
        assert d["max_context_facts"] == 8
        assert "persist_interval" in d

    def test_from_dict(self):
        d = {"auto_learn_enabled": False, "max_context_facts": 10, "learn_from_ai": False}
        cfg = ContextMemoryConfig.from_dict(d)
        assert cfg.auto_learn_enabled is False
        assert cfg.max_context_facts == 10
        assert cfg.learn_from_ai is False

    def test_from_dict_ignores_unknown_keys(self):
        d = {"auto_learn_enabled": True, "unknown_key": "ignored"}
        cfg = ContextMemoryConfig.from_dict(d)
        assert cfg.auto_learn_enabled is True


# ============================================================
# 2. ContextAwareMemory Initialization
# ============================================================

class TestContextAwareMemoryInit:
    def test_default_init(self, mock_components):
        cm = ContextAwareMemory()
        assert cm._session_id == "default"
        assert cm._config.auto_learn_enabled is True
        mock_components['ms_cls'].assert_called_once()
        mock_components['al_cls'].assert_called_once()
        mock_components['kg_cls'].assert_called_once()
        mock_components['up_cls'].assert_called_once()

    def test_init_with_session_id(self, mock_components):
        cm = ContextAwareMemory(session_id="user_42")
        assert cm._session_id == "user_42"

    def test_init_with_custom_config(self, mock_components):
        cfg = ContextMemoryConfig(
            auto_learn_enabled=False,
            auto_graph_enabled=False,
            max_context_facts=8,
        )
        cm = ContextAwareMemory(session_id="custom", config=cfg)
        assert cm._config.auto_learn_enabled is False
        assert cm._config.auto_graph_enabled is False
        assert cm._config.max_context_facts == 8

    def test_init_loads_config_from_file(self, mock_components, temp_storage):
        saved = {"auto_learn_enabled": False, "persist_interval": 30}
        temp_storage["config"].write_text(json.dumps(saved), encoding="utf-8")

        cm = ContextAwareMemory(session_id="loaded")
        assert cm._config.auto_learn_enabled is False
        assert cm._config.persist_interval == 30

    def test_init_handles_corrupted_config_file(self, mock_components, temp_storage):
        temp_storage["config"].write_text("{invalid json!!!", encoding="utf-8")
        cm = ContextAwareMemory(session_id="corrupt")
        assert cm._config.auto_learn_enabled is True


# ============================================================
# 3. learn_from_conversation
# ============================================================

class TestLearnFromConversation:
    def test_user_text_only(self, mock_components, cm):
        al = mock_components['al']
        ms = mock_components['ms']
        fact = _make_fact("Python supports decorators")
        al.learn_from.return_value = [fact]
        ms.recall.return_value = []

        result = cm.learn_from_conversation("Python supports decorators")

        assert al.learn_from.called
        assert ms.remember.called
        assert "facts" in result
        assert result["facts"] == ["Python supports decorators"]
        assert result["memories"] == 1
        assert cm._session_msg_count == 1

    def test_with_ai_response(self, mock_components, cm):
        al = mock_components['al']
        ms = mock_components['ms']
        f1 = _make_fact("user fact")
        f2 = _make_fact("ai fact")
        al.learn_from.side_effect = [[f1], [f2]]

        result = cm.learn_from_conversation("What is Python?", "Python is a language")

        assert al.learn_from.call_count == 2
        assert ms.remember.call_count == 2
        assert result["facts"] == ["user fact", "ai fact"]
        assert result["memories"] == 2

    def test_with_scores(self, mock_components, cm):
        al = mock_components['al']
        scores = {"composite": 0.9, "clarity": 0.8}
        cm.learn_from_conversation("text", "reply", scores=scores)

        call_args = al.learn_from.call_args_list[0]
        assert call_args[1]["composite"] == 0.9

    def test_graph_update(self, mock_components, cm):
        kg = mock_components['kg']
        fact = _make_fact("knowledge")
        mock_components['al'].learn_from.return_value = [fact]

        cm.learn_from_conversation("Python is great for AI", "Yes it is")

        assert kg.learn_cooccurrence.called
        assert kg.absorb_from.called

    def test_conversation_buffer_grows(self, mock_components, cm):
        for i in range(5):
            cm.learn_from_conversation(f"msg {i}", f"reply {i}")
        assert len(cm._conversation_buffer) == 5

    def test_conversation_buffer_truncation(self, mock_components, cm):
        for i in range(110):
            cm.learn_from_conversation(f"msg {i}", f"reply {i}")
        assert len(cm._conversation_buffer) == 100

    def test_persist_triggered(self, mock_components, cm):
        ms = mock_components['ms']
        cm._last_persist = 0
        cm._config.persist_interval = 0

        cm.learn_from_conversation("trigger persist")

        ms.save.assert_called_once()

    def test_persist_not_triggered_early(self, mock_components, cm):
        ms = mock_components['ms']
        cm._last_persist = time.time() + 3600
        cm._config.persist_interval = 60

        cm.learn_from_conversation("no persist yet")

        ms.save.assert_not_called()


# ============================================================
# 4. get_context
# ============================================================

class TestGetContext:
    def test_returns_empty_when_no_data(self, mock_components, cm):
        ctx = cm.get_context("some query")
        assert ctx == ""

    def test_returns_enrichment(self, mock_components, cm):
        al = mock_components['al']
        al.get_enrichment.return_value = "【已学知识】\n- Fact 1"

        ctx = cm.get_context("query")
        assert "【已学知识】" in ctx
        assert "Fact 1" in ctx

    def test_returns_memory_context(self, mock_components, cm):
        ms = mock_components['ms']
        ms.recall.return_value = [
            (MemoryEntry(id="m1", content="Memory content here", memory_type=MemoryType.FACT), 0.8)
        ]

        ctx = cm.get_context("query")
        assert "【相关记忆】" in ctx
        assert "Memory content here" in ctx

    def test_filters_low_score_memories(self, mock_components, cm):
        ms = mock_components['ms']
        ms.recall.return_value = [
            (MemoryEntry(id="m1", content="Good memory", memory_type=MemoryType.FACT), 0.8),
            (MemoryEntry(id="m2", content="Weak memory", memory_type=MemoryType.FACT), 0.05),
        ]

        ctx = cm.get_context("query")
        assert "Good memory" in ctx
        assert "Weak memory" not in ctx

    def test_returns_graph_enrichment(self, mock_components, cm):
        kg = mock_components['kg']
        kg.get_enrichment.return_value = "【关联知识 — Python】\n- AI: 关联 (关联度: 80%)"

        ctx = cm.get_context("Python AI")
        assert "【关联知识" in ctx

    def test_returns_profile_context(self, mock_components, cm):
        up = mock_components['up']
        up.get_context.return_value = "[用户画像]\n用户关注领域: Python开发(3次)"

        ctx = cm.get_context("query")
        assert "[用户画像]" in ctx

    def test_combined_context(self, mock_components, cm):
        mock_components['al'].get_enrichment.return_value = "【已学知识】\n- Fact"
        mock_components['ms'].recall.return_value = [
            (MemoryEntry(id="m1", content="Memory", memory_type=MemoryType.FACT), 0.8)
        ]
        mock_components['kg'].get_enrichment.return_value = "【关联知识】\n- Node"
        mock_components['up'].get_context.return_value = "[用户画像]\nProfile"

        ctx = cm.get_context("query")
        assert "【已学知识】" in ctx
        assert "【相关记忆】" in ctx
        assert "【关联知识" in ctx
        assert "[用户画像]" in ctx


# ============================================================
# 5. remember_instruction
# ============================================================

class TestRememberInstruction:
    def test_stores_instruction(self, mock_components, cm):
        ms = mock_components['ms']
        al = mock_components['al']

        cm.remember_instruction("Always use type hints")

        ms.remember_instruction.assert_called_once_with("Always use type hints", importance=0.85)
        al.learn_from.assert_called_once()
        call_kwargs = al.learn_from.call_args[1]
        assert call_kwargs["user_text"] == "Always use type hints"
        assert call_kwargs["composite"] == 0.85
        assert call_kwargs["source"] == "user_instruction"


# ============================================================
# 6. recall
# ============================================================

class TestRecall:
    def test_returns_combined_results(self, mock_components, cm):
        ms = mock_components['ms']
        al = mock_components['al']

        ms.recall.return_value = [
            (MemoryEntry(id="m1", content="Memory A", memory_type=MemoryType.FACT), 0.9)
        ]
        al.query.return_value = ["Fact B"]

        results = cm.recall("query", top_k=3)
        assert any("[记忆] Memory A" in r for r in results)
        assert any("[知识] Fact B" in r for r in results)

    def test_deduplicates_results(self, mock_components, cm):
        ms = mock_components['ms']
        ms.recall.return_value = [
            (MemoryEntry(id="m1", content="Same content", memory_type=MemoryType.FACT), 0.9)
        ]
        mock_components['al'].query.return_value = ["Same content"]

        results = cm.recall("query")
        assert len(results) == 1

    def test_respects_top_k(self, mock_components, cm):
        ms = mock_components['ms']
        ms.recall.return_value = [
            (MemoryEntry(id="m1", content=f"Memory {i}", memory_type=MemoryType.FACT), 0.9)
            for i in range(10)
        ]
        mock_components['al'].query.return_value = []

        results = cm.recall("query", top_k=3)
        assert len(results) == 3

    def test_default_top_k(self, mock_components, cm):
        ms = mock_components['ms']
        ms.recall.return_value = [
            (MemoryEntry(id="m1", content=f"M{i}", memory_type=MemoryType.FACT), 0.9)
            for i in range(10)
        ]
        mock_components['al'].query.return_value = []

        results = cm.recall("query")
        assert len(results) <= 5


# ============================================================
# 7. toggle_learning / toggle_graph / toggle_profile
# ============================================================

class TestToggles:
    def test_toggle_learning(self, mock_components, cm):
        assert cm._config.auto_learn_enabled is True
        cm.toggle_learning(False)
        assert cm._config.auto_learn_enabled is False
        cm.toggle_learning(True)
        assert cm._config.auto_learn_enabled is True

    def test_toggle_graph(self, mock_components, cm):
        assert cm._config.auto_graph_enabled is True
        cm.toggle_graph(False)
        assert cm._config.auto_graph_enabled is False
        cm.toggle_graph(True)
        assert cm._config.auto_graph_enabled is True

    def test_toggle_profile(self, mock_components, cm):
        assert cm._config.auto_profile_enabled is True
        cm.toggle_profile(False)
        assert cm._config.auto_profile_enabled is False
        cm.toggle_profile(True)
        assert cm._config.auto_profile_enabled is True

    def test_toggles_persist_config(self, mock_components, cm, temp_storage):
        cm.toggle_learning(False)
        assert temp_storage["config"].exists()
        saved = json.loads(temp_storage["config"].read_text(encoding="utf-8"))
        assert saved["auto_learn_enabled"] is False


# ============================================================
# 8. set_config / get_config
# ============================================================

class TestSetGetConfig:
    def test_get_config_returns_dict(self, mock_components, cm):
        cfg = cm.get_config()
        assert isinstance(cfg, dict)
        assert "auto_learn_enabled" in cfg
        assert cfg["auto_learn_enabled"] is True

    def test_set_config_single(self, mock_components, cm):
        cm.set_config(max_context_facts=10)
        assert cm._config.max_context_facts == 10

    def test_set_config_multiple(self, mock_components, cm):
        cm.set_config(
            max_context_facts=8,
            max_context_memories=5,
            learn_from_ai=False,
        )
        assert cm._config.max_context_facts == 8
        assert cm._config.max_context_memories == 5
        assert cm._config.learn_from_ai is False

    def test_set_config_ignores_unknown(self, mock_components, cm):
        cm.set_config(unknown_param=999)
        cfg = cm.get_config()
        assert "unknown_param" not in cfg

    def test_set_config_persists(self, mock_components, cm, temp_storage):
        cm.set_config(max_context_facts=15)
        saved = json.loads(temp_storage["config"].read_text(encoding="utf-8"))
        assert saved["max_context_facts"] == 15


# ============================================================
# 9. stats
# ============================================================

class TestStats:
    def test_returns_expected_structure(self, mock_components, cm):
        stats = cm.stats()
        assert "session_id" in stats
        assert stats["session_id"] == "test_session"
        assert "session_msg_count" in stats
        assert "auto_learn" in stats
        assert "memory" in stats
        assert "knowledge_graph" in stats
        assert "user_profile" in stats
        assert "conversation_buffer" in stats

    def test_session_msg_count_tracks(self, mock_components, cm):
        assert cm.stats()["session_msg_count"] == 0
        cm.learn_from_conversation("msg 1")
        assert cm.stats()["session_msg_count"] == 1
        cm.learn_from_conversation("msg 2")
        assert cm.stats()["session_msg_count"] == 2

    def test_conversation_buffer_count(self, mock_components, cm):
        cm.learn_from_conversation("a", "b")
        cm.learn_from_conversation("c", "d")
        assert cm.stats()["conversation_buffer"] == 2


# ============================================================
# 10. mark_feedback
# ============================================================

class TestMarkFeedback:
    def test_mark_feedback_like(self, mock_components, cm):
        ms = mock_components['ms']
        kg = mock_components['kg']

        cm.mark_feedback("Python programming language", "Python is great for AI", "like")

        ms.remember.assert_called_once()
        call_args = ms.remember.call_args
        assert call_args[1]["memory_type"] == MemoryType.PREFERENCE
        assert "positive" in call_args[1]["tags"]
        assert "用户喜欢的回复" in call_args[1]["content"]

    def test_mark_feedback_dislike(self, mock_components, cm):
        ms = mock_components['ms']

        cm.mark_feedback("bad query", "bad response", "dislike")

        ms.remember.assert_called_once()
        call_args = ms.remember.call_args
        assert call_args[1]["memory_type"] == MemoryType.PREFERENCE
        assert "negative" in call_args[1]["tags"]
        assert "用户不喜欢的回复" in call_args[1]["content"]

    def test_mark_feedback_like_strengthens_edges(self, mock_components, cm):
        kg = mock_components['kg']

        cm.mark_feedback(
            "Python is a programming language",
            "Python is popular for AI development",
            "like",
        )

        assert kg.strengthen_edge.called

    def test_mark_feedback_truncates_long_response(self, mock_components, cm):
        ms = mock_components['ms']
        long_response = "x" * 500

        cm.mark_feedback("query", long_response, "like")

        stored_content = ms.remember.call_args[1]["content"]
        assert len(stored_content) <= 159


# ============================================================
# 11. get_session_summary
# ============================================================

class TestGetSessionSummary:
    def test_empty_summary(self, mock_components, cm):
        summary = cm.get_session_summary()
        assert summary == ""

    def test_summary_with_conversations(self, mock_components, cm):
        cm.learn_from_conversation("Hello, how are you?", "I am fine, thank you!")
        cm.learn_from_conversation("What is Python?", "Python is a programming language.")

        summary = cm.get_session_summary()
        assert "【当前会话摘要】" in summary
        assert "Hello, how are you?" in summary
        assert "What is Python?" in summary

    def test_summary_respects_max_items(self, mock_components, cm):
        for i in range(15):
            cm.learn_from_conversation(f"Q{i}", f"A{i}")

        summary = cm.get_session_summary(max_items=5)
        assert len(summary.split("\n")) <= 11


# ============================================================
# 12. get_global_context — Singleton
# ============================================================

class TestGetGlobalContext:
    def setup_method(self):
        cm_module._global_context_memory = None

    def teardown_method(self):
        cm_module._global_context_memory = None

    def test_returns_instance(self, mock_components):
        instance = get_global_context("singleton_test")
        assert isinstance(instance, ContextAwareMemory)
        assert instance._session_id == "singleton_test"

    def test_same_session_returns_same_instance(self, mock_components):
        a = get_global_context("session_a")
        b = get_global_context("session_a")
        assert a is b

    def test_different_session_returns_new_instance(self, mock_components):
        a = get_global_context("session_a")
        b = get_global_context("session_b")
        assert a is not b
        assert b._session_id == "session_b"

    def test_thread_safe_singleton(self, mock_components):
        instances = []

        def get_instance():
            instances.append(get_global_context("thread_test"))

        threads = [threading.Thread(target=get_instance) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(instances) == 10
        first = instances[0]
        for inst in instances:
            assert inst is first


# ============================================================
# 13. Thread Safety
# ============================================================

class TestThreadSafety:
    def test_concurrent_learn(self, mock_components):
        cm = ContextAwareMemory(session_id="concurrent")
        errors = []

        def worker(worker_id):
            try:
                for i in range(50):
                    cm.learn_from_conversation(
                        f"worker_{worker_id}_msg_{i}",
                        f"worker_{worker_id}_reply_{i}",
                    )
            except Exception as e:
                errors.append(str(e))

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        assert cm._session_msg_count == 200
        assert len(cm._conversation_buffer) == 100

    @patch.object(cm_module.ContextAwareMemory, '_extract_keywords', return_value=[])
    def test_concurrent_operations_mix(self, mock_kw, mock_components):
        cm = ContextAwareMemory(session_id="mixed")
        errors = []

        def learner():
            try:
                for i in range(30):
                    cm.learn_from_conversation(f"msg {i}", f"reply {i}")
            except Exception as e:
                errors.append(f"learn: {e}")

        def reader():
            try:
                for i in range(30):
                    cm.get_context(f"query {i}")
            except Exception as e:
                errors.append(f"read: {e}")

        def recaller():
            try:
                for i in range(20):
                    cm.recall(f"recall {i}")
            except Exception as e:
                errors.append(f"recall: {e}")

        def toggler():
            try:
                for i in range(10):
                    cm.toggle_learning(i % 2 == 0)
                    cm.toggle_graph(i % 2 == 1)
            except Exception as e:
                errors.append(f"toggle: {e}")

        threads = [
            threading.Thread(target=learner),
            threading.Thread(target=reader),
            threading.Thread(target=recaller),
            threading.Thread(target=toggler),
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0


# ============================================================
# 14. Auto-learning Disabled
# ============================================================

class TestAutoLearningDisabled:
    def test_learn_from_conversation_no_learning(self, mock_components):
        cfg = ContextMemoryConfig(auto_learn_enabled=False)
        cm = ContextAwareMemory(session_id="no_learn", config=cfg)
        al = mock_components['al']

        result = cm.learn_from_conversation("some text", "some reply")

        al.learn_from.assert_not_called()
        assert result["facts"] == []

    def test_get_context_no_learning(self, mock_components):
        cfg = ContextMemoryConfig(auto_learn_enabled=False)
        cm = ContextAwareMemory(session_id="no_learn", config=cfg)
        al = mock_components['al']

        cm.get_context("query")
        al.get_enrichment.assert_not_called()

    def test_learn_from_user_disabled(self, mock_components):
        cfg = ContextMemoryConfig(auto_learn_enabled=True, learn_from_user=False)
        cm = ContextAwareMemory(session_id="no_user_learn", config=cfg)
        al = mock_components['al']

        result = cm.learn_from_conversation("user text", "ai reply")
        assert result["memories"] == 2

        calls = al.learn_from.call_args_list
        sources = [call[1].get("source", "") for call in calls]
        assert all(s != "user_input" for s in sources)

    def test_learn_from_ai_disabled(self, mock_components):
        cfg = ContextMemoryConfig(auto_learn_enabled=True, learn_from_ai=False)
        cm = ContextAwareMemory(session_id="no_ai_learn", config=cfg)
        al = mock_components['al']

        cm.learn_from_conversation("user text", "ai reply")
        calls = al.learn_from.call_args_list
        sources = [call[1].get("source", "") for call in calls]
        assert all(s != "ai_response" for s in sources)

    def test_graph_disabled(self, mock_components):
        cfg = ContextMemoryConfig(auto_graph_enabled=False)
        cm = ContextAwareMemory(session_id="no_graph", config=cfg)
        kg = mock_components['kg']

        cm.learn_from_conversation("text", "reply")
        kg.learn_cooccurrence.assert_not_called()
        kg.absorb_from.assert_not_called()

    def test_profile_disabled(self, mock_components):
        cfg = ContextMemoryConfig(auto_profile_enabled=False)
        cm = ContextAwareMemory(session_id="no_profile", config=cfg)
        up = mock_components['up']

        cm.learn_from_conversation("text")
        up.update_from_query.assert_not_called()


# ============================================================
# 15. Edge Cases
# ============================================================

class TestEdgeCases:
    def test_empty_text(self, mock_components, cm):
        result = cm.learn_from_conversation("", "")
        assert isinstance(result, dict)
        assert result["memories"] == 1
        assert cm._session_msg_count == 1

    def test_very_long_text(self, mock_components, cm):
        long_text = "x" * 5000
        long_reply = "y" * 5000

        result = cm.learn_from_conversation(long_text, long_reply)
        assert isinstance(result, dict)

    def test_special_characters(self, mock_components, cm):
        special = "Hello\n\t\r世界!@#$%^&*()_+-=[]{}|;':\",./<>?`~"
        result = cm.learn_from_conversation(special, special)
        assert isinstance(result, dict)
        assert cm._session_msg_count >= 1

    def test_unicode_emojis(self, mock_components, cm):
        text = "Python is great 🐍✨🚀 for AI development 💡"
        result = cm.learn_from_conversation(text, "Indeed!")
        assert isinstance(result, dict)

    def test_only_whitespace(self, mock_components, cm):
        result = cm.learn_from_conversation("   \n\t  ", "   ")
        assert isinstance(result, dict)

    def test_none_scores(self, mock_components, cm):
        result = cm.learn_from_conversation("text", scores=None)
        assert isinstance(result, dict)

    def test_get_context_with_empty_query(self, mock_components, cm):
        ctx = cm.get_context("")
        assert isinstance(ctx, str)

    def test_recall_with_empty_query(self, mock_components, cm):
        results = cm.recall("")
        assert isinstance(results, list)

    def test_get_session_summary_with_long_content(self, mock_components, cm):
        long_q = "Q" * 200
        long_a = "A" * 200
        cm.learn_from_conversation(long_q, long_a)
        summary = cm.get_session_summary()
        assert len(summary) > 0
        assert "Q" * 80 in summary

    def test_mark_feedback_with_unknown_rating(self, mock_components, cm):
        ms = mock_components['ms']
        cm.mark_feedback("q", "r", "neutral")
        ms.remember.assert_not_called()

    def test_multiple_sessions_independent(self, mock_components):
        cm1 = ContextAwareMemory(session_id="s1")
        cm2 = ContextAwareMemory(session_id="s2")

        cm1.learn_from_conversation("msg1", "reply1")
        cm1.learn_from_conversation("msg2", "reply2")

        assert cm1._session_msg_count == 2
        assert cm2._session_msg_count == 0
        assert len(cm1._conversation_buffer) == 2
        assert len(cm2._conversation_buffer) == 0
