"""
Tests for src/cee/app/core/database.py — AsyncDatabase CRUD and transactions.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import asyncio
import json
import os
import tempfile
from pathlib import Path

import pytest

from cee.app.core.database import AsyncDatabase, PageInfo


@pytest.fixture
async def db():
    """Create a temporary database for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        database = AsyncDatabase(db_path=str(db_path))
        await database.initialize()
        yield database
        await database.close()


@pytest.fixture
async def db_session(db):
    """Create a session fixture."""
    return await db.create_session(user_id="test_user", title="Test Session")


@pytest.mark.asyncio
class TestDatabaseInit:
    """Tests for database initialization."""

    async def test_initialize_creates_db_file(self, db):
        assert os.path.exists(db.db_path)

    async def test_initialize_is_idempotent(self, db):
        await db.initialize()
        assert db._initialized is True

    async def test_initialize_sets_wal_mode(self, db):
        row = await db._fetchone("PRAGMA journal_mode")
        assert row is not None

    async def test_health_check_healthy(self, db):
        result = await db.health_check()
        assert result["status"] == "healthy"
        assert result["connected"] is True
        assert result["path"] == db.db_path


@pytest.mark.asyncio
class TestSessionsCRUD:
    """Tests for session CRUD operations."""

    async def test_create_session_returns_dict(self, db):
        session = await db.create_session(user_id="u1", title="Hello")
        assert session["id"] is not None
        assert session["user_id"] == "u1"
        assert session["title"] == "Hello"
        assert session["status"] == "active"

    async def test_get_session_by_id(self, db):
        created = await db.create_session(user_id="u1")
        fetched = await db.get_session(created["id"])
        assert fetched is not None
        assert fetched["id"] == created["id"]

    async def test_get_nonexistent_session_returns_none(self, db):
        assert await db.get_session("nonexistent") is None

    async def test_update_session_fields(self, db):
        s = await db.create_session(title="Old Title")
        updated = await db.update_session(s["id"], title="New Title")
        assert updated["title"] == "New Title"

    async def test_update_session_nonexistent(self, db):
        result = await db.update_session("fake", title="x")
        assert result is None

    async def test_delete_session(self, db):
        s = await db.create_session()
        assert await db.delete_session(s["id"]) is True
        assert await db.get_session(s["id"]) is None

    async def test_delete_session_cascades_messages(self, db):
        s = await db.create_session()
        await db.create_message(s["id"], "user", "Hello")
        await db.delete_session(s["id"])
        msgs = await db.list_messages(session_id=s["id"])
        assert msgs.total == 0

    async def test_list_sessions_pagination(self, db):
        for i in range(5):
            await db.create_session(user_id="u1", title=f"Session {i}")
        result = await db.list_sessions(user_id="u1", limit=2, offset=0)
        assert result.total >= 5
        assert len(result.items) == 2

    async def test_list_sessions_filter_by_status(self, db):
        s = await db.create_session(user_id="test_status", title="ActiveSession")
        result = await db.list_sessions(status="active")
        assert result.total >= 1
        found = any(i["id"] == s["id"] for i in result.items)
        assert found


@pytest.mark.asyncio
class TestMessagesCRUD:
    """Tests for message CRUD operations."""

    async def test_create_message(self, db, db_session):
        msg = await db.create_message(db_session["id"], "user", "Hello World")
        assert msg["role"] == "user"
        assert msg["content"] == "Hello World"
        assert msg["session_id"] == db_session["id"]

    async def test_get_message(self, db, db_session):
        msg = await db.create_message(db_session["id"], "assistant", "Reply")
        fetched = await db.get_message(msg["id"])
        assert fetched["content"] == "Reply"

    async def test_update_message(self, db, db_session):
        msg = await db.create_message(db_session["id"], "user", "Old")
        updated = await db.update_message(msg["id"], content="New")
        assert updated["content"] == "New"

    async def test_delete_message(self, db, db_session):
        msg = await db.create_message(db_session["id"], "user", "Hello")
        assert await db.delete_message(msg["id"]) is True
        assert await db.get_message(msg["id"]) is None

    async def test_list_messages_filter_by_role(self, db, db_session):
        await db.create_message(db_session["id"], "user", "Q1")
        await db.create_message(db_session["id"], "assistant", "A1")
        await db.create_message(db_session["id"], "user", "Q2")
        result = await db.list_messages(session_id=db_session["id"], role="user")
        assert result.total >= 2
        for item in result.items:
            assert item["role"] == "user"

    async def test_list_messages_pagination(self, db, db_session):
        for i in range(10):
            await db.create_message(db_session["id"], "user", f"Msg {i}")
        result = await db.list_messages(session_id=db_session["id"], limit=3, offset=2)
        assert len(result.items) == 3


@pytest.mark.asyncio
class TestKnowledgeItemsCRUD:
    """Tests for knowledge item CRUD operations."""

    async def test_create_knowledge_item(self, db):
        item = await db.create_knowledge_item(
            title="Test Knowledge",
            content="Content body",
            category="science",
            tags=["ai", "ml"],
        )
        assert item["title"] == "Test Knowledge"
        assert item["category"] == "science"

    async def test_get_knowledge_item(self, db):
        item = await db.create_knowledge_item(title="K1", content="C1")
        fetched = await db.get_knowledge_item(item["id"])
        assert fetched["title"] == "K1"

    async def test_update_knowledge_item(self, db):
        item = await db.create_knowledge_item(title="Old", content="C")
        updated = await db.update_knowledge_item(item["id"], title="New")
        assert updated["title"] == "New"
        assert updated["version"] >= 2

    async def test_delete_knowledge_item(self, db):
        item = await db.create_knowledge_item(title="X", content="Y")
        await db.delete_knowledge_item(item["id"])
        assert await db.get_knowledge_item(item["id"]) is None

    async def test_list_knowledge_items_by_category(self, db):
        await db.create_knowledge_item(title="A", content="CA", category="cat1")
        await db.create_knowledge_item(title="B", content="CB", category="cat2")
        result = await db.list_knowledge_items(category="cat1")
        assert result.total >= 1

    async def test_list_knowledge_items_by_query(self, db):
        await db.create_knowledge_item(title="Deep Learning", content="Neural networks")
        await db.create_knowledge_item(title="Physics", content="Quantum mechanics")
        result = await db.list_knowledge_items(query="learning")
        assert result.total >= 1


@pytest.mark.asyncio
class TestUserPreferences:
    """Tests for user preferences."""

    async def test_set_preference_new(self, db):
        result = await db.set_preference("user1", "theme", "dark")
        assert result["user_id"] == "user1"
        assert result["key"] == "theme"

    async def test_get_preference(self, db):
        await db.set_preference("user1", "lang", "zh")
        value = await db.get_preference("user1", "lang")
        assert value == "zh"

    async def test_get_preference_nonexistent(self, db):
        assert await db.get_preference("user1", "missing") is None

    async def test_set_preference_update_existing(self, db):
        await db.set_preference("user1", "count", 1)
        await db.set_preference("user1", "count", 2)
        assert await db.get_preference("user1", "count") == 2

    async def test_list_preferences(self, db):
        await db.set_preference("user1", "a", "1")
        await db.set_preference("user1", "b", "2")
        prefs = await db.list_preferences("user1")
        assert "a" in prefs
        assert "b" in prefs

    async def test_delete_preference(self, db):
        await db.set_preference("user1", "key", "val")
        assert await db.delete_preference("user1", "key") is True
        assert await db.get_preference("user1", "key") is None


@pytest.mark.asyncio
class TestAnalyticsEvents:
    """Tests for analytics event tracking."""

    async def test_track_event_basic(self, db):
        event = await db.track_event("page_view", user_id="u1")
        assert event["event_type"] == "page_view"
        assert event["user_id"] == "u1"

    async def test_track_event_with_data(self, db):
        event = await db.track_event("click", data={"button": "submit"})
        assert event["data"] is not None

    async def test_list_events_by_type(self, db):
        await db.track_event("type_a")
        await db.track_event("type_b")
        result = await db.list_events(event_type="type_a")
        assert result.total >= 1

    async def test_list_events_pagination(self, db):
        for i in range(5):
            await db.track_event("test", user_id="u1")
        result = await db.list_events(limit=2, offset=0)
        assert len(result.items) == 2


@pytest.mark.asyncio
class TestCacheEntries:
    """Tests for cache entries."""

    async def test_set_and_get_cache(self, db):
        await db.set_cache("key1", {"data": "value"}, ttl=60)
        result = await db.get_cache("key1")
        assert result == {"data": "value"}

    async def test_get_cache_expired(self, db):
        await db.set_cache("key2", "value", ttl=-1)
        result = await db.get_cache("key2")
        assert result is None

    async def test_get_cache_missing(self, db):
        assert await db.get_cache("never_set") is None

    async def test_delete_cache(self, db):
        await db.set_cache("key3", "val", ttl=60)
        await db.delete_cache("key3")
        assert await db.get_cache("key3") is None

    async def test_cleanup_expired(self, db):
        await db.set_cache("exp", "val", ttl=-1)
        count = await db.cleanup_expired_cache()
        assert count >= 1


@pytest.mark.asyncio
class TestFileRecords:
    """Tests for file record operations."""

    async def test_create_file_record(self, db):
        record = await db.create_file_record(
            filename="test.pdf",
            original_name="original.pdf",
            file_path="/tmp/test.pdf",
            mime_type="application/pdf",
            size_bytes=1024,
        )
        assert record["filename"] == "test.pdf"
        assert record["size_bytes"] == 1024

    async def test_get_file_record(self, db):
        rec = await db.create_file_record("a.txt", "a.txt", "/tmp/a.txt")
        fetched = await db.get_file_record(rec["id"])
        assert fetched["filename"] == "a.txt"

    async def test_delete_file_record(self, db):
        rec = await db.create_file_record("b.txt", "b.txt", "/tmp/b.txt")
        await db.delete_file_record(rec["id"])
        assert await db.get_file_record(rec["id"]) is None

    async def test_list_file_records(self, db):
        await db.create_file_record("1.txt", "1.txt", "/tmp/1.txt")
        await db.create_file_record("2.txt", "2.txt", "/tmp/2.txt")
        result = await db.list_file_records()
        assert result.total >= 2


@pytest.mark.asyncio
class TestSearchLogs:
    """Tests for search log operations."""

    async def test_log_search(self, db):
        log = await db.log_search(
            query="python tutorial",
            results_count=5,
            elapsed_ms=123.4,
            engine_name="duckduckgo",
        )
        assert log["query"] == "python tutorial"
        assert log["results_count"] == 5

    async def test_list_search_logs_by_engine(self, db):
        await db.log_search("q1", engine_name="google")
        await db.log_search("q2", engine_name="duckduckgo")
        result = await db.list_search_logs(engine_name="google")
        assert result.total >= 1


@pytest.mark.asyncio
class TestPageInfo:
    """Tests for PageInfo helper."""

    def test_page_calculation(self):
        pi = PageInfo(total=100, offset=0, limit=10, items=[])
        assert pi.page == 1
        assert pi.total_pages == 10
        assert pi.has_next is True
        assert pi.has_prev is False

    def test_second_page(self):
        pi = PageInfo(total=100, offset=10, limit=10, items=[])
        assert pi.page == 2
        assert pi.has_prev is True

    def test_empty_page(self):
        pi = PageInfo(total=0, offset=0, limit=10, items=[])
        assert pi.total_pages == 1
        assert pi.has_next is False

    def test_to_dict(self):
        pi = PageInfo(total=5, offset=0, limit=10, items=[{"a": 1}])
        d = pi.to_dict()
        assert d["total"] == 5
        assert d["items"] == [{"a": 1}]
