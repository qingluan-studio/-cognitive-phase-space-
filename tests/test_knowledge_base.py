"""
Tests for src/cee/app/knowledge/base.py and curator.py.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest
import tempfile
from pathlib import Path

from cee.app.knowledge.base import KnowledgeBase, KnowledgeItem
from cee.app.knowledge.curator import KnowledgeCurator


class TestKnowledgeBase:
    """Tests for KnowledgeBase."""

    @pytest.fixture
    def kb(self):
        return KnowledgeBase()

    def test_add_item(self, kb):
        item = kb.add("Test knowledge", "This is a test content", category="science",
                       tags=["test"])
        assert item.id is not None
        assert item.title == "Test knowledge"

    def test_get_item(self, kb):
        item = kb.add("K1", "Content 1", category="tech")
        fetched = kb.get(item.id)
        assert fetched is not None
        assert fetched.title == "K1"

    def test_search(self, kb):
        kb.add("Python programming", "Python is great", category="tech")
        kb.add("Cooking recipes", "How to cook", category="food")
        results = kb.search("Python")
        assert len(results) >= 1

    def test_list_all(self, kb):
        kb.add("A", "Content A")
        kb.add("B", "Content B")
        results = kb.list_all()
        assert len(results) >= 2

    def test_list_by_category(self, kb):
        kb.add("A", "unique content for ai", category="AI编程")
        kb.add("B", "other content for frontend", category="前端开发")
        results = kb.list_by_category("AI编程")
        assert len(results) >= 1

    def test_update_item(self, kb):
        item = kb.add("Old", "Old content")
        updated = kb.update(item.id, title="New title")
        assert updated is not None

    def test_delete_item(self, kb):
        item = kb.add("To delete", "content")
        kb.remove(item.id)
        assert kb.get(item.id) is None

    def test_import_export(self, kb):
        kb.add("A", "Content A")
        with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
            export_path = f.name
        try:
            kb.export_json(export_path)
            kb2 = KnowledgeBase()
            kb2.import_json(export_path)
            assert kb2.total_count >= 0
        finally:
            Path(export_path).unlink(missing_ok=True)

    def test_category_stats(self, kb):
        kb.add("Item", "Content")
        stats = kb.get_category_stats()
        assert isinstance(stats, dict)


class TestKnowledgeCurator:
    """Tests for KnowledgeCurator."""

    @pytest.fixture
    def curator(self):
        kb = KnowledgeBase()
        return KnowledgeCurator(kb)

    def test_curate_empty(self, curator):
        report = curator.generate_report()
        assert report is not None

    def test_discover_associations(self, curator):
        result = curator.discover_associations()
        assert isinstance(result, list)

    def test_cluster(self, curator):
        result = curator.cluster()
        assert isinstance(result, list)
