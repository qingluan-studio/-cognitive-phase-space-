"""
Tests for src/cee/app/api/router.py -- API router endpoints.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest

from cee.app.api.router import (
    router,
    _generate_id,
    _sessions,
    _memory_store,
    _knowledge_store,
    _files_store,
)
from cee.app.models.schemas import (
    ChatRequest,
    ChatResponse,
    Message,
    MessageRole,
    SearchRequest,
    SearchResponse,
    ThinkRequest,
    ThinkResponse,
    BiasRequest,
    BiasResponse,
    CreativeRequest,
    CreativeResponse,
    SessionCreateRequest,
    SessionDetail,
    KnowledgeCreateRequest,
    KnowledgeItem,
    HealthStatus,
)


class TestRouterImports:
    """Tests that router and models import correctly."""

    def test_router_exists(self):
        assert router is not None

    def test_generate_id_returns_string(self):
        result = _generate_id()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_generate_id_unique(self):
        ids = {_generate_id() for _ in range(10)}
        assert len(ids) == 10


class TestSessionCreation:
    """Tests for session management logic."""

    def test_create_session_request(self):
        req = SessionCreateRequest(title="Test Session")
        assert req.title == "Test Session"

    def test_session_detail(self):
        detail = SessionDetail(
            id="s1",
            title="Test",
            message_count=0,
            created_at="2024-01-01T00:00:00",
            updated_at="2024-01-01T00:00:00",
        )
        assert detail.id == "s1"


class TestChatRequest:
    """Tests for ChatRequest model."""

    def test_basic_request(self):
        req = ChatRequest(
            messages=[Message(role=MessageRole.USER, content="Hello")],
            session_id="s1",
        )
        assert req.messages[0].content == "Hello"

    def test_with_system_prompt(self):
        req = ChatRequest(system_prompt="You are helpful")
        assert req.system_prompt == "You are helpful"


class TestSearchRequest:
    """Tests for SearchRequest model."""

    def test_basic(self):
        req = SearchRequest(query="test query")
        assert req.query == "test query"

    def test_with_options(self):
        req = SearchRequest(query="test", max_results=5)
        assert req.max_results == 5


class TestThinkRequest:
    """Tests for ThinkRequest model."""

    def test_basic(self):
        req = ThinkRequest(question="What is AI?")
        assert req.question == "What is AI?"


class TestBiasRequest:
    """Tests for BiasRequest model."""

    def test_basic(self):
        req = BiasRequest(text="Some text to analyze for bias")
        assert req.text == "Some text to analyze for bias"


class TestCreativeRequest:
    """Tests for CreativeRequest model."""

    def test_basic(self):
        req = CreativeRequest(prompt="Design a flying car")
        assert req.prompt == "Design a flying car"


class TestModels:
    """Tests for model schemas."""

    def test_health_status(self):
        status = HealthStatus(status="ok", version="1.0", uptime_seconds=123)
        assert status.status == "ok"

    def test_chat_response(self):
        resp = ChatResponse(
            id="r1",
            session_id="s1",
            role="assistant",
            content="Hello!",
        )
        assert resp.content == "Hello!"


class TestStoreManagement:
    """Tests for in-memory stores."""

    def test_sessions_store(self):
        assert isinstance(_sessions, dict)

    def test_memory_store(self):
        assert isinstance(_memory_store, dict)

    def test_knowledge_store(self):
        assert isinstance(_knowledge_store, dict)

    def test_files_store(self):
        assert isinstance(_files_store, dict)
