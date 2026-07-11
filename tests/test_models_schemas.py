"""
Tests for src/cee/app/models/schemas.py -- dataclass models.
"""
import sys
sys.path.insert(0, '/tmp/cee_repo/src')

import pytest
from dataclasses import asdict

from cee.app.models.schemas import (
    ChatRequest,
    ChatResponse,
    Message,
    MessageRole,
    SearchRequest,
    SearchResult,
    SearchResponse,
    SearchType,
    ThinkRequest,
    ThinkResponse,
    ThinkStep,
    ThinkMode,
    BiasRequest,
    BiasResponse,
    BiasFinding,
    BiasType,
    CreativeRequest,
    CreativeResponse,
    CreativeIdea,
    SessionCreateRequest,
    SessionInfo,
    SessionDetail,
    SessionList,
    SessionStatus,
    KnowledgeCreateRequest,
    KnowledgeItem,
    KnowledgeListResponse,
    KnowledgeType,
    FileUploadResponse,
    FileInfo,
    FileStatus,
    FileContent,
    ChatSource,
    ChatStreamChunk,
    ErrorResponse,
    ErrorDetail,
    HealthStatus,
    MemoryItem,
    MemoryResponse,
    MemoryCategory,
    StatsResponse,
)


class TestChatModels:
    """Tests for chat-related models."""

    def test_chat_request_creation(self):
        req = ChatRequest(
            messages=[Message(role=MessageRole.USER, content="Hello")],
            session_id="s1",
        )
        assert req.messages[0].content == "Hello"
        assert req.session_id == "s1"

    def test_chat_request_defaults(self):
        req = ChatRequest()
        assert req.messages == []
        assert req.model == "gpt-4o"
        assert req.temperature == 0.7

    def test_chat_response_creation(self):
        resp = ChatResponse(
            id="r1", session_id="s1", role="assistant", content="Hello!"
        )
        assert resp.id == "r1"
        assert resp.role == "assistant"

    def test_message_creation(self):
        msg = Message(role=MessageRole.USER, content="Hello")
        assert msg.role == MessageRole.USER

    def test_message_role_values(self):
        assert MessageRole.USER.value == "user"
        assert MessageRole.ASSISTANT.value == "assistant"
        assert MessageRole.SYSTEM.value == "system"

    def test_chat_source(self):
        source = ChatSource(name="Example", url="http://example.com", relevance=0.9)
        assert source.name == "Example"

    def test_chat_stream_chunk(self):
        chunk = ChatStreamChunk(content="partial", done=False)
        assert chunk.done is False


class TestSearchModels:
    """Tests for search models."""

    def test_search_request_defaults(self):
        req = SearchRequest(query="test")
        assert req.query == "test"

    def test_search_type_values(self):
        assert SearchType.WEB.value == "web"
        assert SearchType.KNOWLEDGE.value == "knowledge"

    def test_search_result(self):
        result = SearchResult(url="http://a.com", title="A", snippet="s")
        assert result.title == "A"

    def test_search_response(self):
        resp = SearchResponse(query="test", results=[], total_results=0)
        assert resp.total_results == 0


class TestThinkModels:
    """Tests for think models."""

    def test_think_request(self):
        req = ThinkRequest(question="What is AI?")
        assert req.question == "What is AI?"

    def test_think_mode(self):
        assert ThinkMode.QUICK.value == "quick"
        assert ThinkMode.DEEP.value == "deep"

    def test_think_step(self):
        step = ThinkStep(step=1, thought="Step one", reasoning="analysis")
        assert step.step == 1

    def test_think_response(self):
        resp = ThinkResponse(
            task_id="t1", question="Q?", answer="Answer",
            confidence=0.8, time_taken_ms=1000.0
        )
        assert resp.answer == "Answer"


class TestBiasModels:
    """Tests for bias models."""

    def test_bias_request(self):
        req = BiasRequest(text="Test text")
        assert req.text == "Test text"

    def test_bias_type_enum(self):
        assert BiasType.CONFIRMATION.value == "confirmation"

    def test_bias_finding(self):
        finding = BiasFinding(
            bias_type=BiasType.CONFIRMATION, severity=0.8,
            description="Test bias description",
        )
        assert finding.bias_type == BiasType.CONFIRMATION

    def test_bias_response(self):
        resp = BiasResponse(text="test", findings=[], overall_bias_score=0.9)
        assert resp.overall_bias_score == 0.9


class TestCreativeModels:
    """Tests for creative models."""

    def test_creative_request(self):
        req = CreativeRequest(prompt="Design something")
        assert req.prompt == "Design something"

    def test_creative_idea(self):
        idea = CreativeIdea(
            id=1, title="Idea", description="Desc",
            novelty_score=0.9, feasibility_score=0.7, tags=["tech"],
        )
        assert idea.title == "Idea"

    def test_creative_response(self):
        resp = CreativeResponse(prompt="P", ideas=[], synthesis="S")
        assert resp.prompt == "P"


class TestSessionModels:
    """Tests for session models."""

    def test_create_request(self):
        req = SessionCreateRequest(title="Test")
        assert req.title == "Test"

    def test_session_info(self):
        info = SessionInfo(id="s1", title="Test",
                           message_count=5, updated_at="2024-01-01T00:00:00")
        assert info.id == "s1"

    def test_session_detail(self):
        detail = SessionDetail(id="s1", title="Test",
                               message_count=0, created_at="2024-01-01T00:00:00",
                               updated_at="2024-01-01T00:00:00",
                               messages=[])
        assert detail.messages == []

    def test_session_list(self):
        sl = SessionList(sessions=[], total=0, active_count=0)
        assert sl.total == 0

    def test_session_status(self):
        assert SessionStatus.ACTIVE.value == "active"
        assert SessionStatus.ARCHIVED.value == "archived"


class TestKnowledgeModels:
    """Tests for knowledge models."""

    def test_create_request(self):
        req = KnowledgeCreateRequest(title="K1", content="Content")
        assert req.title == "K1"

    def test_knowledge_item(self):
        item = KnowledgeItem(
            id="k1", title="K1", content="Content",
            created_at="2024-01-01T00:00:00", updated_at="2024-01-01T00:00:00"
        )
        assert item.id == "k1"

    def test_knowledge_list_response(self):
        resp = KnowledgeListResponse(items=[], total=0)
        assert resp.total == 0

    def test_knowledge_type(self):
        assert KnowledgeType.DOCUMENT.value == "document"


class TestFileModels:
    """Tests for file models."""

    def test_file_info(self):
        info = FileInfo(
            id="f1", filename="test.pdf", size_bytes=1024,
            content_type="application/pdf",
            status=FileStatus.READY,
            created_at="2024-01-01T00:00:00"
        )
        assert info.filename == "test.pdf"

    def test_file_upload_response(self):
        resp = FileUploadResponse(id="f1", filename="test.pdf")
        assert resp.id == "f1"

    def test_file_status(self):
        assert FileStatus.READY.value == "ready"

    def test_file_content(self):
        fc = FileContent(
            id="f1", filename="test.pdf", content="text content"
        )
        assert fc.id == "f1"


class TestMemoryModels:
    """Tests for memory models."""

    def test_memory_item(self):
        item = MemoryItem(
            id="m1", content="Remember this", category=MemoryCategory.FACT,
            importance=0.8, created_at="2024-01-01T00:00:00"
        )
        assert item.content == "Remember this"

    def test_memory_response(self):
        resp = MemoryResponse(items=[], total=0)
        assert resp.total == 0

    def test_memory_category(self):
        assert MemoryCategory.FACT.value == "fact"


class TestErrorModels:
    """Tests for error models."""

    def test_error_detail(self):
        detail = ErrorDetail(code="NOT_FOUND", message="Resource not found")
        assert detail.code == "NOT_FOUND"

    def test_error_response(self):
        resp = ErrorResponse(
            error=True, code="ERR", message="Error occurred",
        )
        assert resp.code == "ERR"


class TestHealthStatus:
    """Tests for HealthStatus model."""

    def test_health_status(self):
        status = HealthStatus(status="ok", version="1.0.0", uptime_seconds=3600.0)
        assert status.status == "ok"


class TestStatsResponse:
    """Tests for StatsResponse."""

    def test_stats(self):
        stats = StatsResponse(
            total_sessions=10, total_messages=100, api_calls_today=1000,
            uptime_seconds=3600,
        )
        assert stats.total_sessions == 10


class TestSerialization:
    """Tests for model serialization."""

    def test_chat_request_serialization(self):
        req = ChatRequest(
            messages=[Message(role=MessageRole.USER, content="Hello")],
            session_id="s1",
        )
        data = asdict(req)
        assert data["session_id"] == "s1"

    def test_chat_response_serialization(self):
        resp = ChatResponse(id="r1", session_id="s1", role="assistant", content="Hi")
        data = asdict(resp)
        assert data["id"] == "r1"

    def test_deserialization(self):
        resp = ChatResponse(
            id="r1", session_id="s1", role="assistant", content="Hi"
        )
        assert resp.content == "Hi"
