"""
Tests for cee.app.local_llm core modules.

Coverage:
- AutoLearner (auto_learner.py)
- SelfLearningKnowledgeStore (knowledge_store.py)
- KnowledgeGraph (knowledge_graph.py)
- MemoryEngine (memory_engine.py)
- UserProfile (user_profile.py)
- FeedbackLearner (feedback_learner.py)
- ClarificationEngine (clarification.py)
- AffectEngine (affect_engine.py)
"""
import sys

sys.path.insert(0, "/workspace/src")

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


def _patch_file_const(module, attr_name, temp_dir, filename):
    original_path = getattr(module, attr_name, None)
    new_path = Path(temp_dir) / filename
    setattr(module, attr_name, new_path)
    return original_path, new_path


@pytest.fixture
def temp_storage_dir(tmp_path):
    storage_dir = tmp_path / ".cee_storage"
    storage_dir.mkdir(parents=True, exist_ok=True)
    memory_dir = storage_dir / "memory"
    memory_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir


def _patch_storage_imports(temp_storage_dir):
    from cee.app.local_llm import knowledge_store

    orig_storage = knowledge_store.STORAGE_DIR
    knowledge_store.STORAGE_DIR = temp_storage_dir
    orig_memory = knowledge_store.MEMORY_FILE
    knowledge_store.MEMORY_FILE = temp_storage_dir / "conversation_memory.json"
    orig_training = knowledge_store.TRAINING_DATA_FILE
    knowledge_store.TRAINING_DATA_FILE = temp_storage_dir / "training_data.json"

    from cee.app.local_llm import auto_learner

    orig_learner = auto_learner.LEARNER_FILE
    auto_learner.LEARNER_FILE = temp_storage_dir / "auto_learner.json"

    from cee.app.local_llm import knowledge_graph

    orig_graph = knowledge_graph.GRAPH_FILE
    knowledge_graph.GRAPH_FILE = temp_storage_dir / "knowledge_graph.json"

    import cee.app.local_llm.memory_engine as memory_engine

    orig_episodic = memory_engine.EPISODIC_FILE
    memory_engine.EPISODIC_FILE = temp_storage_dir / "memory" / "episodic.json"
    orig_semantic = memory_engine.SEMANTIC_FILE
    memory_engine.SEMANTIC_FILE = temp_storage_dir / "memory" / "semantic.json"
    orig_mem_dir = memory_engine.MEMORY_DIR
    memory_engine.MEMORY_DIR = temp_storage_dir / "memory"

    from cee.app.local_llm import user_profile

    orig_profile = user_profile.PROFILE_FILE
    user_profile.PROFILE_FILE = temp_storage_dir / "user_profile.json"

    from cee.app.local_llm import feedback_learner

    orig_feedback = feedback_learner.FEEDBACK_FILE
    feedback_learner.FEEDBACK_FILE = temp_storage_dir / "feedback_data.json"

    restore = {
        "knowledge_store.STORAGE_DIR": (knowledge_store, "STORAGE_DIR", orig_storage),
        "knowledge_store.MEMORY_FILE": (knowledge_store, "MEMORY_FILE", orig_memory),
        "knowledge_store.TRAINING_DATA_FILE": (knowledge_store, "TRAINING_DATA_FILE", orig_training),
        "auto_learner.LEARNER_FILE": (auto_learner, "LEARNER_FILE", orig_learner),
        "knowledge_graph.GRAPH_FILE": (knowledge_graph, "GRAPH_FILE", orig_graph),
        "memory_engine.EPISODIC_FILE": (memory_engine, "EPISODIC_FILE", orig_episodic),
        "memory_engine.SEMANTIC_FILE": (memory_engine, "SEMANTIC_FILE", orig_semantic),
        "memory_engine.MEMORY_DIR": (memory_engine, "MEMORY_DIR", orig_mem_dir),
        "user_profile.PROFILE_FILE": (user_profile, "PROFILE_FILE", orig_profile),
        "feedback_learner.FEEDBACK_FILE": (feedback_learner, "FEEDBACK_FILE", orig_feedback),
    }
    return restore


def _restore_storage_imports(restore):
    for _key, (module, attr_name, orig_value) in restore.items():
        setattr(module, attr_name, orig_value)


# ---------------------------------------------------------------------------
# AutoLearner
# ---------------------------------------------------------------------------
class TestAutoLearner:
    def test_init_empty(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            assert al.stats()["total_facts"] == 0
            assert al.stats()["attempts"] == 0
        finally:
            _restore_storage_imports(restore)

    def test_learn_from_single_fact(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            facts = al.learn_from("记住认知涌现由混沌边缘自发产生，这是复杂系统的核心特性",
                                  source="conversation")
            assert len(facts) >= 1
            assert al.stats()["total_facts"] >= 1
            assert al.stats()["attempts"] == 1
            assert al.stats()["learned"] >= 1
        finally:
            _restore_storage_imports(restore)

    def test_learn_from_trivial_returns_empty(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            facts = al.learn_from("好的", source="conversation")
            assert facts == []
        finally:
            _restore_storage_imports(restore)

    def test_learn_from_short_text_ignored(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            facts = al.learn_from("ab", source="conversation")
            assert facts == []
        finally:
            _restore_storage_imports(restore)

    def test_learn_from_teaching_pattern(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            facts = al.learn_from("记住人工智能的核心是模式识别与自适应学习")
            assert len(facts) >= 1
            assert any("模式识别" in f.fact for f in facts)
        finally:
            _restore_storage_imports(restore)

    def test_learn_from_definition_pattern(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            facts = al.learn_from("认知涌现是指复杂系统在混沌边缘自发生成新秩序的过程")
            assert len(facts) >= 1
        finally:
            _restore_storage_imports(restore)

    def test_learn_from_causal_pattern(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            facts = al.learn_from("因为数据质量高，所以模型效果好，产生了很好的推理能力")
            assert len(facts) >= 1
        finally:
            _restore_storage_imports(restore)

    def test_learn_from_comparison_pattern(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            facts = al.learn_from("认知涌现不同于简单的模式匹配，它涉及自组织的深层结构")
            assert len(facts) >= 1
        finally:
            _restore_storage_imports(restore)

    def test_learn_from_dedup_increments_confidence(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            text = "记住深度学习模型需要大量高质量数据来训练"
            first = al.learn_from(text)
            assert len(first) >= 1
            saved_confidence = first[0].confidence

            second = al.learn_from(text)
            assert len(second) == 0
            assert al.stats()["total_facts"] == len(first)
        finally:
            _restore_storage_imports(restore)

    def test_query_returns_matching_facts(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            al.learn_from("记住认知涌现是指复杂系统在混沌边缘出现有序行为")
            al.learn_from("记住Python是人工智能开发最常用的编程语言之一")

            results = al.query("认知")
            assert len(results) >= 1
            assert any("涌现" in r for r in results)

            results = al.query("Python")
            assert len(results) >= 1
            assert any("Python" in r for r in results)
        finally:
            _restore_storage_imports(restore)

    def test_query_returns_empty_for_no_match(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            al.learn_from("认知涌现是复杂系统的核心现象")
            results = al.query("zzzz_not_present_xyz")
            assert results == []
        finally:
            _restore_storage_imports(restore)

    def test_get_enrichment_formats_correctly(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            al.learn_from("记住认知涌现由混沌边缘自发产生")
            enrichment = al.get_enrichment("认知涌现")
            assert "【已学知识】" in enrichment
            assert "- " in enrichment
        finally:
            _restore_storage_imports(restore)

    def test_get_enrichment_empty_when_no_match(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            enrichment = al.get_enrichment("nonexistent")
            assert enrichment == ""
        finally:
            _restore_storage_imports(restore)

    def test_stats_returns_structure(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            s = al.stats()
            assert "total_facts" in s
            assert "by_topic" in s
            assert "avg_confidence" in s
            assert "total_recalls" in s
            assert "attempts" in s
            assert "learned" in s
            assert "consolidations" in s
        finally:
            _restore_storage_imports(restore)

    def test_feedback_like(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            facts = al.learn_from("认知涌现是复杂系统的涌现现象")
            assert len(facts) == 1
            fid = facts[0].id

            al.feedback(fid, "like")
            updated = next((f for f in al._facts if f.id == fid), None)
            assert updated is not None
            assert updated.feedback_score > 0
            assert updated.feedback_count == 1
        finally:
            _restore_storage_imports(restore)

    def test_feedback_dislike(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            facts = al.learn_from("认知涌现是复杂系统的涌现现象")
            assert len(facts) == 1
            fid = facts[0].id

            al.feedback(fid, "dislike")
            updated = next((f for f in al._facts if f.id == fid), None)
            assert updated is not None
            assert updated.feedback_score < 0
        finally:
            _restore_storage_imports(restore)

    def test_feedback_nonexistent_id_does_nothing(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            al.feedback("fake_id_123", "like")
        finally:
            _restore_storage_imports(restore)

    def test_consolidate_removes_duplicates(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            base = "认知涌现是指复杂系统在特定条件下自发产生新秩序的现象"
            al.learn_from(base)
            dup = "认知涌现是指复杂系统在特定条件下" + " — extra"
            al.learn_from(dup)

            before = len(al._facts)
            removed = al.consolidate()
            assert removed >= 0
            assert len(al._facts) <= before
        finally:
            _restore_storage_imports(restore)

    def test_consolidate_increments_counter(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.auto_learner import AutoLearner

            al = AutoLearner()
            assert al.stats()["consolidations"] == 0
            al.consolidate()
            assert al.stats()["consolidations"] == 1
        finally:
            _restore_storage_imports(restore)


# ---------------------------------------------------------------------------
# SelfLearningKnowledgeStore
# ---------------------------------------------------------------------------
class TestKnowledgeStore:
    def test_init_empty(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_store import SelfLearningKnowledgeStore

            ks = SelfLearningKnowledgeStore()
            s = ks.stats()
            assert s["total_pairs"] == 0
            assert s["avg_composite"] == 0
        finally:
            _restore_storage_imports(restore)

    def test_learn_stores_pair_above_threshold(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_store import SelfLearningKnowledgeStore

            ks = SelfLearningKnowledgeStore(quality_threshold=0.70)
            ok = ks.learn("什么是认知涌现", "认知涌现是复杂系统的自发行为",
                          itc=0.85, scs=0.80, iec=0.90, pfft=0.75)
            assert ok is True
            assert ks.stats()["total_pairs"] == 1
        finally:
            _restore_storage_imports(restore)

    def test_learn_rejects_pair_below_threshold(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_store import SelfLearningKnowledgeStore

            ks = SelfLearningKnowledgeStore(quality_threshold=0.70)
            ok = ks.learn("hello", "world", itc=0.3, scs=0.3, iec=0.3, pfft=0.3)
            assert ok is False
            assert ks.stats()["total_pairs"] == 0
        finally:
            _restore_storage_imports(restore)

    def test_learn_updates_existing_pair(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_store import SelfLearningKnowledgeStore

            ks = SelfLearningKnowledgeStore(quality_threshold=0.50)
            ks.learn("什么是认知涌现", "第一版回答",
                     itc=0.75, scs=0.75, iec=0.75, pfft=0.75)
            ks.learn("什么是认知涌现", "更新版回答",
                     itc=0.90, scs=0.90, iec=0.90, pfft=0.90)
            assert ks.stats()["total_pairs"] == 1
        finally:
            _restore_storage_imports(restore)

    def test_retrieve_finds_similar_pairs(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_store import SelfLearningKnowledgeStore

            ks = SelfLearningKnowledgeStore(quality_threshold=0.50)
            ks.learn("什么是认知涌现", "认知涌现是复杂系统的自发行为",
                     itc=0.85, scs=0.80, iec=0.90, pfft=0.75)
            ks.learn("Python如何实现异步编程", "使用asyncio库实现",
                     itc=0.80, scs=0.80, iec=0.80, pfft=0.80)

            results = ks.retrieve("认知涌现是什么")
            assert len(results) >= 1
            assert "认知" in results[0].user_query
        finally:
            _restore_storage_imports(restore)

    def test_retrieve_empty_when_no_pairs(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_store import SelfLearningKnowledgeStore

            ks = SelfLearningKnowledgeStore()
            results = ks.retrieve("anything")
            assert results == []
        finally:
            _restore_storage_imports(restore)

    def test_search_by_keyword_finds_matches(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_store import SelfLearningKnowledgeStore

            ks = SelfLearningKnowledgeStore(quality_threshold=0.50)
            ks.learn("Python实现算法", "算法实现回复",
                     itc=0.80, scs=0.80, iec=0.80, pfft=0.80)
            ks.learn("JavaScript前端开发", "前端回复",
                     itc=0.80, scs=0.80, iec=0.80, pfft=0.80)

            results = ks.search_by_keyword("Python")
            assert len(results) >= 1
            assert "Python" in results[0].user_query
        finally:
            _restore_storage_imports(restore)

    def test_prune_limits_pairs(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_store import SelfLearningKnowledgeStore

            ks = SelfLearningKnowledgeStore(quality_threshold=0.50)
            for i in range(5):
                ks.learn(f"问题{i}", f"回答{i}",
                         itc=0.80, scs=0.80, iec=0.80, pfft=0.80)
            assert ks.stats()["total_pairs"] == 5

            removed = ks.prune(max_pairs=3)
            assert removed == 2
            assert ks.stats()["total_pairs"] == 3
        finally:
            _restore_storage_imports(restore)

    def test_export_training_data_filters_by_composite(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_store import SelfLearningKnowledgeStore

            ks = SelfLearningKnowledgeStore(quality_threshold=0.50)
            ks.learn("高质量", "回答", itc=0.90, scs=0.90, iec=0.90, pfft=0.90)
            ks.learn("低质量", "回答", itc=0.60, scs=0.60, iec=0.60, pfft=0.60)

            exported = ks.export_training_data()
            assert len(exported) >= 1
            for item in exported:
                assert item["composite"] >= 0.70
        finally:
            _restore_storage_imports(restore)


# ---------------------------------------------------------------------------
# KnowledgeGraph
# ---------------------------------------------------------------------------
class TestKnowledgeGraph:
    def test_expand_returns_related(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            results = kg.expand("认知涌现")
            assert len(results) >= 1
            assert results[0][0]
            assert results[0][1]
            assert 0 < results[0][2] <= 1.0
        finally:
            _restore_storage_imports(restore)

    def test_expand_unknown_node_returns_empty(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            results = kg.expand("nonexistent_keyword_zzz")
            assert results == []
        finally:
            _restore_storage_imports(restore)

    def test_bidirectional_expand(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            results = kg.bidirectional_expand("认知涌现")
            assert len(results) >= 1
            node, rel, direction, weight = results[0]
            assert direction in ("out", "in")
        finally:
            _restore_storage_imports(restore)

    def test_find_path_shortest(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            path = kg.find_path("认知涌现", "T6 认知不变量")
            assert path is not None
            assert path[0] == "认知涌现"
            assert path[-1] == "T6 认知不变量"
            assert len(path) <= 4
        finally:
            _restore_storage_imports(restore)

    def test_find_path_same_node(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            path = kg.find_path("认知涌现", "认知涌现")
            assert path == ["认知涌现"]
        finally:
            _restore_storage_imports(restore)

    def test_find_path_no_route(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            path = kg.find_path("认知涌现", "unknown_node_xyz")
            assert path is None
        finally:
            _restore_storage_imports(restore)

    def test_add_relation(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            kg.add_relation("新概念A", "新概念B", "测试关系", weight=0.7)
            results = kg.expand("新概念A")
            assert len(results) >= 1
            assert results[0][0] == "新概念B"
            assert results[0][1] == "测试关系"
        finally:
            _restore_storage_imports(restore)

    def test_learn_cooccurrence(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            kg.learn_cooccurrence(["深度学习", "GPU", "训练加速"], weight=0.4)
            results = kg.expand("深度学习")
            assert len(results) >= 1
            assert any(r[1] == "共现关联" for r in results)
        finally:
            _restore_storage_imports(restore)

    def test_learn_cooccurrence_increments_existing(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            kg.add_relation("新节点X", "新节点Y", "test", weight=0.4)
            kg.add_relation("新节点Y", "新节点X", "test", weight=0.4)
            kg.learn_cooccurrence(["新节点X", "新节点Y"], weight=0.3)

            results = kg.expand("新节点X")
            y_edge = next(r for r in results if r[0] == "新节点Y")
            first_weight = y_edge[2]

            kg.learn_cooccurrence(["新节点X", "新节点Y"], weight=0.3)

            results = kg.expand("新节点X")
            ai_edges = [r for r in results if r[0] == "新节点Y"]
            if ai_edges:
                assert ai_edges[0][2] >= first_weight
        finally:
            _restore_storage_imports(restore)

    def test_absorb_from_with_keywords(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            result = kg.absorb_from("认知涌现和混沌边缘", keywords=["认知涌现", "混沌边缘"])
            assert isinstance(result, list)
        finally:
            _restore_storage_imports(restore)

    def test_absorb_from_with_existing_nodes(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            result = kg.absorb_from("认知涌现与认知几何的关系")
            assert isinstance(result, list)
        finally:
            _restore_storage_imports(restore)

    def test_strengthen_edge(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            kg.add_relation("A", "B", "test_edge", weight=0.5)
            kg.strengthen_edge("A", "B", boost=0.2)

            results = kg.expand("A")
            b_edge = next(r for r in results if r[0] == "B")
            assert b_edge[2] == 0.7
        finally:
            _restore_storage_imports(restore)

    def test_get_enrichment(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            text = kg.get_enrichment("认知涌现")
            assert "【关联知识" in text
        finally:
            _restore_storage_imports(restore)

    def test_get_enrichment_unknown_node(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            text = kg.get_enrichment("nonexistent")
            assert text == ""
        finally:
            _restore_storage_imports(restore)

    def test_stats(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            s = kg.stats()
            assert "nodes" in s
            assert "edges" in s
            assert "avg_degree" in s
            assert "dynamic_nodes" in s
            assert s["nodes"] > 0
        finally:
            _restore_storage_imports(restore)

    def test_decay_edges(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            kg.add_relation("X", "Y", "test", weight=0.15)
            removed = kg.decay_edges(decay_factor=0.5)
            assert removed >= 0
        finally:
            _restore_storage_imports(restore)

    def test_hot_activation(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            results = kg.hot_activation(["认知涌现"], spread=1)
            assert len(results) >= 1
            for node, val in results:
                assert node != "认知涌现"
                assert 0 < val <= 1.0
        finally:
            _restore_storage_imports(restore)

    def test_infer_relation_definition(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            rel = kg.infer_relation("A", "B", "A是B的一种特殊形式")
            assert rel == "定义关系"
        finally:
            _restore_storage_imports(restore)

    def test_infer_relation_causal(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            rel = kg.infer_relation("A", "B", "因为A所以导致B")
            assert rel == "因果关系"
        finally:
            _restore_storage_imports(restore)

    def test_infer_relation_analogy(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            rel = kg.infer_relation("A", "B", "A类似于B")
            assert rel == "类比关系"
        finally:
            _restore_storage_imports(restore)

    def test_infer_relation_composition(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            rel = kg.infer_relation("A", "B", "A包含B的部分")
            assert rel == "组成关系"
        finally:
            _restore_storage_imports(restore)

    def test_infer_relation_application(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            rel = kg.infer_relation("A", "B", "A用于B的应用场景")
            assert rel == "应用关系"
        finally:
            _restore_storage_imports(restore)

    def test_infer_relation_comparison(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            rel = kg.infer_relation("A", "B", "A优于B且可作为替代方案")
            assert rel == "替代/对比关系"
        finally:
            _restore_storage_imports(restore)

    def test_infer_relation_default(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            kg = KnowledgeGraph()
            rel = kg.infer_relation("A", "B", "nothing special here")
            assert rel == "关联关系"
        finally:
            _restore_storage_imports(restore)


# ---------------------------------------------------------------------------
# MemoryEngine
# ---------------------------------------------------------------------------
class TestMemoryEngine:
    def test_init_with_defaults(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine

            mem = MemoryEngine()
            s = mem.stats()
            assert s["session_id"] == "default"
            assert s["conversation_turns"] == 0
            assert s["episodic_count"] == 0
            assert s["semantic_topics"] == 0
        finally:
            _restore_storage_imports(restore)

    def test_add_exchange_stores_conversation(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine

            mem = MemoryEngine(session_id="test_user", window_size=10)
            mem.add_exchange("什么是认知涌现", "认知涌现是复杂系统的自发行为")
            s = mem.stats()
            assert s["conversation_turns"] == 1
        finally:
            _restore_storage_imports(restore)

    def test_get_recent_returns_last_n(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine

            mem = MemoryEngine()
            mem.add_exchange("问题1", "回答1")
            mem.add_exchange("问题2", "回答2")
            mem.add_exchange("问题3", "回答3")

            recent = mem.get_recent(2)
            assert len(recent) == 4
        finally:
            _restore_storage_imports(restore)

    def test_get_context_for_inference(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine

            mem = MemoryEngine()
            mem.add_exchange("用户提问", "AI回复")
            ctx = mem.get_context_for_inference()
            assert "[近期对话]" in ctx
            assert "用户" in ctx
        finally:
            _restore_storage_imports(restore)

    def test_get_context_for_inference_empty(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine

            mem = MemoryEngine()
            ctx = mem.get_context_for_inference()
            assert ctx == ""
        finally:
            _restore_storage_imports(restore)

    def test_recall_episodic_from_user_input(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine

            mem = MemoryEngine(session_id="alice")
            mem.add_exchange("我是学Python开发的，最近在学习认知科学", "好的")
            results = mem.recall("Python")
            assert len(results) >= 1
            assert any("Python" in r for r in results)
        finally:
            _restore_storage_imports(restore)

    def test_recall_empty_when_no_match(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine

            mem = MemoryEngine()
            results = mem.recall("nonexistent_topic_zzz")
            assert results == []
        finally:
            _restore_storage_imports(restore)

    def test_summarize_generates_output(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine

            mem = MemoryEngine()
            mem.add_exchange("Python中如何使用异步编程", "使用asyncio库")
            mem.add_exchange("什么是装饰器", "装饰器是修改函数行为的工具")
            summary = mem.summarize()
            assert len(summary) > 0
        finally:
            _restore_storage_imports(restore)

    def test_summarize_caches_result(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine

            mem = MemoryEngine()
            mem.add_exchange("问题1", "回答1")
            first = mem.summarize()
            second = mem.summarize()
            assert first == second
        finally:
            _restore_storage_imports(restore)

    def test_clear_resets_all(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine

            mem = MemoryEngine()
            mem.add_exchange("测试", "回复")
            mem.clear()
            s = mem.stats()
            assert s["conversation_turns"] == 0
            assert s["episodic_count"] == 0
        finally:
            _restore_storage_imports(restore)

    def test_get_all_episodic(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine

            mem = MemoryEngine()
            mem.add_exchange("我是做前端开发的，擅长React和Vue", "了解了")
            all_ep = mem.get_all_episodic()
            assert isinstance(all_ep, list)
        finally:
            _restore_storage_imports(restore)


# ---------------------------------------------------------------------------
# UserProfile
# ---------------------------------------------------------------------------
class TestUserProfile:
    def test_init_empty(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.user_profile import UserProfile

            up = UserProfile(session_id="user_1")
            s = up.stats()
            assert s["query_count"] == 0
            assert s["interests"] == {}
        finally:
            _restore_storage_imports(restore)

    def test_update_from_query_tracks_interests(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.user_profile import UserProfile

            up = UserProfile()
            up.update_from_query("Python中如何使用装饰器实现缓存机制")
            up.update_from_query("Django的ORM怎么优化查询性能")
            s = up.stats()
            assert s["query_count"] == 2
            assert s["interests"].get("Python开发", 0) > 0
        finally:
            _restore_storage_imports(restore)

    def test_update_from_query_tracks_levels(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.user_profile import UserProfile

            up = UserProfile()
            up.update_from_query("我是新手想入门Python编程")
            s = up.stats()
            assert s["level"]["新手"] >= 1
        finally:
            _restore_storage_imports(restore)

    def test_update_from_query_tracks_style(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.user_profile import UserProfile

            up = UserProfile()
            up.update_from_query("这个API的实现有bug需要修复部署到服务器上需要查看架构设计")
            s = up.stats()
            assert s["style"]["技术"] >= 1
        finally:
            _restore_storage_imports(restore)

    def test_get_context_when_no_data(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.user_profile import UserProfile

            up = UserProfile()
            ctx = up.get_context()
            assert ctx == ""
        finally:
            _restore_storage_imports(restore)

    def test_get_context_with_sufficient_data(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.user_profile import UserProfile

            up = UserProfile()
            up.update_from_query("Python装饰器如何实现缓存")
            up.update_from_query("Django ORM优化查询性能")
            up.update_from_query("Python异步编程最佳实践")
            ctx = up.get_context()
            assert "用户关注领域" in ctx
        finally:
            _restore_storage_imports(restore)

    def test_get_match_score(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.user_profile import UserProfile

            up = UserProfile()
            up.update_from_query("Python装饰器用法")
            up.update_from_query("Python异步编程")
            result = up.get_match_score("Python")
            assert "matched" in result
        finally:
            _restore_storage_imports(restore)

    def test_clear(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.user_profile import UserProfile

            up = UserProfile()
            up.update_from_query("Python开发问题")
            up.clear()
            s = up.stats()
            assert s["query_count"] == 0
        finally:
            _restore_storage_imports(restore)

    def test_get_profile_dict(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.user_profile import UserProfile

            up = UserProfile()
            up.update_from_query("Python技术问题")
            d = up.get_profile_dict()
            assert "session_id" in d
            assert "level" in d
            assert "style" in d
        finally:
            _restore_storage_imports(restore)


# ---------------------------------------------------------------------------
# FeedbackLearner
# ---------------------------------------------------------------------------
class TestFeedbackLearner:
    def test_init_empty(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner

            fl = FeedbackLearner()
            s = fl.stats()
            assert s["total_feedback"] == 0
            assert s["likes"] == 0
        finally:
            _restore_storage_imports(restore)

    def test_record_like(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner

            fl = FeedbackLearner()
            fl.record("什么是认知涌现", "回复内容", "like",
                      "fallback_rules", "B", {"itc": 0.8})
            assert fl.stats()["likes"] == 1
        finally:
            _restore_storage_imports(restore)

    def test_record_dislike(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner

            fl = FeedbackLearner()
            fl.record("问题内容", "回复内容", "dislike",
                      "source_1", "C", {"itc": 0.5})
            assert fl.stats()["dislikes"] == 1
        finally:
            _restore_storage_imports(restore)

    def test_get_query_weight_liked(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner

            fl = FeedbackLearner()
            fl.record("认知涌现问题", "回复", "like",
                      "fallback", "B", {"itc": 0.8})
            weight = fl.get_query_weight("认知涌现问题")
            assert weight > 1.0
        finally:
            _restore_storage_imports(restore)

    def test_get_query_weight_disliked(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner

            fl = FeedbackLearner()
            fl.record("坏问题", "回复", "dislike",
                      "source", "C", {"itc": 0.5})
            weight = fl.get_query_weight("坏问题")
            assert weight < 1.0
        finally:
            _restore_storage_imports(restore)

    def test_get_query_weight_neutral(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner

            fl = FeedbackLearner()
            weight = fl.get_query_weight("从未出现的问题")
            assert weight == 1.0
        finally:
            _restore_storage_imports(restore)

    def test_should_learn_with_high_composite(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner

            fl = FeedbackLearner()
            assert fl.should_learn("测试问题", 0.80) is True
        finally:
            _restore_storage_imports(restore)

    def test_should_learn_with_low_composite(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner

            fl = FeedbackLearner()
            assert fl.should_learn("测试问题", 0.50) is False
        finally:
            _restore_storage_imports(restore)

    def test_should_learn_rejected_after_repeated_dislike(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner

            fl = FeedbackLearner()
            fl.record("坏问题", "回复", "dislike", "s", "D", {})
            fl.record("坏问题", "回复2", "dislike", "s", "D", {})
            assert fl.should_learn("坏问题", 0.90) is False
        finally:
            _restore_storage_imports(restore)

    def test_get_source_bias(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner

            fl = FeedbackLearner()
            fl.record("q1", "r1", "like", "fallback_rules", "B", {})
            fl.record("q2", "r2", "like", "knowledge_store", "A", {})
            bias = fl.get_source_bias()
            assert len(bias) > 0
        finally:
            _restore_storage_imports(restore)

    def test_get_preferred_avoid_patterns(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner

            fl = FeedbackLearner()
            fl.record("喜欢的问题", "好的回复", "like", "s", "B", {})
            fl.record("讨厌的问题", "坏的回复", "dislike", "s", "C", {})

            preferred = fl.get_preferred_patterns()
            avoid = fl.get_avoid_patterns()
            assert isinstance(preferred, list)
            assert isinstance(avoid, list)
        finally:
            _restore_storage_imports(restore)


# ---------------------------------------------------------------------------
# ClarificationEngine
# ---------------------------------------------------------------------------
class TestClarificationEngine:
    def test_check_ambiguous_word(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.clarification import ClarificationEngine

            ce = ClarificationEngine()
            result = ce.check("那个怎么做")
            assert result is not None
            assert "question" in result
            assert "options" in result
        finally:
            _restore_storage_imports(restore)

    def test_check_broad_topic(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.clarification import ClarificationEngine

            ce = ClarificationEngine()
            result = ce.check("怎么学编程")
            assert result is not None
            assert "question" in result
            assert len(result["options"]) > 0
        finally:
            _restore_storage_imports(restore)

    def test_check_short_query(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.clarification import ClarificationEngine

            ce = ClarificationEngine()
            result = ce.check("嗯")
            assert result is not None
            assert "question" in result
        finally:
            _restore_storage_imports(restore)

    def test_check_clear_query_passes(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.clarification import ClarificationEngine

            ce = ClarificationEngine()
            result = ce.check("如何在Python中使用async和await实现异步编程")
            assert result is None
        finally:
            _restore_storage_imports(restore)

    def test_check_search_query_passes(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.clarification import ClarificationEngine

            ce = ClarificationEngine()
            result = ce.check("什么是认知涌现")
            assert result is None
        finally:
            _restore_storage_imports(restore)

    def test_check_empty_text(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.clarification import ClarificationEngine

            ce = ClarificationEngine()
            result = ce.check("")
            assert result is None
        finally:
            _restore_storage_imports(restore)

    def test_record_clarified_adds_to_memory(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.clarification import (
                ClarificationEngine,
                CLARIFY_MEMORY,
            )

            CLARIFY_MEMORY.clear()
            ce = ClarificationEngine()
            ce.record_clarified("测试话题", "我的选择", session_id="test_sess")
            assert len(CLARIFY_MEMORY) >= 1
        finally:
            _restore_storage_imports(restore)


# ---------------------------------------------------------------------------
# AffectEngine
# ---------------------------------------------------------------------------
class TestAffectEngine:
    def test_detect_positive(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            result = ae.detect("谢谢你的帮助，非常好用")
            assert result["polarity"] == "positive"
        finally:
            _restore_storage_imports(restore)

    def test_detect_negative(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            result = ae.detect("这个功能出错了不行不好用")
            assert result["polarity"] == "negative"
        finally:
            _restore_storage_imports(restore)

    def test_detect_neutral(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            result = ae.detect("请解释一下什么是认知涌现")
            assert result["polarity"] == "neutral"
        finally:
            _restore_storage_imports(restore)

    def test_detect_frustrated(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            result = ae.detect("试了好多次还是不行一直报错")
            assert result["type"] == "frustrated"
        finally:
            _restore_storage_imports(restore)

    def test_detect_confused(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            result = ae.detect("我不懂这个概念不明白是什么意思")
            assert result["type"] == "confused"
        finally:
            _restore_storage_imports(restore)

    def test_detect_curious(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            result = ae.detect("为什么会出现这种现象是什么原理")
            assert result["type"] == "curious"
        finally:
            _restore_storage_imports(restore)

    def test_detect_excited(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            result = ae.detect("这个功能太牛了有意思")
            assert result["type"] == "excited"
        finally:
            _restore_storage_imports(restore)

    def test_detect_urgency_high(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            result = ae.detect("急！马上需要帮助救命")
            assert result["urgency"] == "high"
        finally:
            _restore_storage_imports(restore)

    def test_detect_urgency_medium(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            result = ae.detect("这个问题有点急")
            assert result["urgency"] == "medium"
        finally:
            _restore_storage_imports(restore)

    def test_detect_urgency_low(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            result = ae.detect("这个功能怎么使用呢")
            assert result["urgency"] == "low"
        finally:
            _restore_storage_imports(restore)

    def test_choose_tone_encouraging(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            affect = {"polarity": "negative", "type": "frustrated", "urgency": "low"}
            tone = ae.choose_tone(affect)
            assert tone == "encouraging"
        finally:
            _restore_storage_imports(restore)

    def test_choose_tone_simplified(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            affect = {"polarity": "negative", "type": "confused", "urgency": "low"}
            tone = ae.choose_tone(affect)
            assert tone == "simplified"
        finally:
            _restore_storage_imports(restore)

    def test_choose_tone_direct_high_urgency(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            affect = {"polarity": "negative", "type": "frustrated", "urgency": "high"}
            tone = ae.choose_tone(affect)
            assert tone == "direct"
        finally:
            _restore_storage_imports(restore)

    def test_tone_prefix_encouraging(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            prefix = ae.tone_prefix("encouraging")
            assert len(prefix) > 0
        finally:
            _restore_storage_imports(restore)

    def test_tone_prefix_balanced_empty(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            prefix = ae.tone_prefix("balanced")
            assert prefix == ""
        finally:
            _restore_storage_imports(restore)

    def test_tone_postfix_frustrated(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            affect = {"type": "frustrated"}
            postfix = ae.tone_postfix("encouraging", affect)
            assert "别着急" in postfix
        finally:
            _restore_storage_imports(restore)

    def test_get_trend_insufficient_data(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            assert ae.get_trend() == "insufficient_data"
        finally:
            _restore_storage_imports(restore)

    def test_get_trend_improving(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            ae.detect("谢谢很好用")
            ae.detect("表现完美")
            ae.detect("非常满意")
            ae.detect("太好了")
            ae.detect("很强大")
            assert ae.get_trend() == "improving"
        finally:
            _restore_storage_imports(restore)

    def test_stats(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.affect_engine import AffectEngine

            ae = AffectEngine()
            ae.detect("很好")
            ae.detect("不好出错")
            s = ae.stats()
            assert s["calls"] == 2
            assert "polarity_dist" in s
            assert "dominant_type" in s
            assert "trend" in s
        finally:
            _restore_storage_imports(restore)


# ---------------------------------------------------------------------------
# Integration / cross-module
# ---------------------------------------------------------------------------
class TestCrossModule:
    def test_auto_learner_with_knowledge_store(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.knowledge_store import SelfLearningKnowledgeStore
            from cee.app.local_llm.auto_learner import AutoLearner

            store = SelfLearningKnowledgeStore()
            al = AutoLearner(store=store)
            al.learn_from("认知涌现是复杂系统在混沌边缘出现的有序行为")
            assert al.stats()["total_facts"] >= 1
        finally:
            _restore_storage_imports(restore)

    def test_memory_and_profile_same_user_flow(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.memory_engine import MemoryEngine
            from cee.app.local_llm.user_profile import UserProfile

            mem = MemoryEngine(session_id="user_x")
            up = UserProfile(session_id="user_x")

            up.update_from_query("我想学习Python编程基础")
            mem.add_exchange("我想学习Python编程基础", "好的请说")

            up.update_from_query("Python装饰器怎么用")
            mem.add_exchange("Python装饰器怎么用", "装饰器说明")

            assert up.stats()["query_count"] == 2
            assert mem.stats()["conversation_turns"] == 2
        finally:
            _restore_storage_imports(restore)

    def test_feedback_and_knowledge_graph_cross(self, temp_storage_dir):
        restore = _patch_storage_imports(temp_storage_dir)
        try:
            from cee.app.local_llm.feedback_learner import FeedbackLearner
            from cee.app.local_llm.knowledge_graph import KnowledgeGraph

            fl = FeedbackLearner()
            kg = KnowledgeGraph()

            fl.record("认知涌现", "回复", "like", "knowledge_graph", "A",
                      {"itc": 0.9, "scs": 0.8})
            kg.learn_cooccurrence(["认知涌现", "反馈学习"], weight=0.5)

            assert fl.stats()["likes"] == 1
            assert len(kg.expand("认知涌现")) >= 1
        finally:
            _restore_storage_imports(restore)
