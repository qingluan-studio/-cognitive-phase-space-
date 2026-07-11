from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4


class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class SearchType(str, Enum):
    WEB = "web"
    KNOWLEDGE = "knowledge"


class ThinkMode(str, Enum):
    DEEP = "deep"
    QUICK = "quick"
    REFLECTIVE = "reflective"


class CreativeMode(str, Enum):
    SYNTHESIZE = "synthesize"
    BRAINSTORM = "brainstorm"
    DIVERGE = "diverge"


class BiasType(str, Enum):
    CONFIRMATION = "confirmation"
    ANCHORING = "anchoring"
    AVAILABILITY = "availability"
    FRAMING = "framing"
    OVERCONFIDENCE = "overconfidence"
    SELECTION = "selection"


class FileStatus(str, Enum):
    UPLOADING = "uploading"
    READY = "ready"
    PROCESSING = "processing"
    FAILED = "failed"


class MemoryCategory(str, Enum):
    FACT = "fact"
    PREFERENCE = "preference"
    EXPERIENCE = "experience"
    SKILL = "skill"


class KnowledgeType(str, Enum):
    DOCUMENT = "document"
    ARTICLE = "article"
    CODE = "code"
    NOTE = "note"
    LINK = "link"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    EXPIRED = "expired"


@dataclass
class Message:
    role: MessageRole = MessageRole.USER
    content: str = ""

    def to_dict(self) -> dict:
        return {"role": self.role.value, "content": self.content}

    @classmethod
    def from_dict(cls, data: dict) -> Message:
        return cls(
            role=MessageRole(data.get("role", "user")),
            content=data.get("content", ""),
        )


@dataclass
class ChatRequest:
    messages: list[Message] = field(default_factory=list)
    session_id: Optional[str] = None
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 4096
    stream: bool = False
    system_prompt: Optional[str] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class ChatSource:
    name: str = ""
    url: str = ""
    relevance: float = 0.0


@dataclass
class ChatResponse:
    id: str = field(default_factory=lambda: str(uuid4()))
    content: str = ""
    role: str = "assistant"
    model: str = ""
    session_id: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    tokens_used: int = 0
    sources: list[ChatSource] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


@dataclass
class ChatStreamChunk:
    content: str = ""
    done: bool = False
    metadata: dict = field(default_factory=dict)


@dataclass
class SearchRequest:
    query: str = ""
    search_type: SearchType = SearchType.WEB
    max_results: int = 10
    filters: dict = field(default_factory=dict)
    include_sources: bool = True
    language: str = "zh"


@dataclass
class SearchResult:
    title: str = ""
    url: str = ""
    snippet: str = ""
    score: float = 0.0
    source: str = ""
    relevance: float = 0.0
    metadata: dict = field(default_factory=dict)


@dataclass
class SearchResponse:
    query: str = ""
    total_results: int = 0
    results: list[SearchResult] = field(default_factory=list)
    search_type: str = ""
    took_ms: float = 0.0
    metadata: dict = field(default_factory=dict)


@dataclass
class FileUploadResponse:
    id: str = field(default_factory=lambda: str(uuid4()))
    filename: str = ""
    size_bytes: int = 0
    content_type: str = ""
    status: FileStatus = FileStatus.UPLOADING
    uploaded_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    url: Optional[str] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class FileInfo:
    id: str = ""
    filename: str = ""
    size_bytes: int = 0
    content_type: str = ""
    status: FileStatus = FileStatus.READY
    created_at: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass
class FileContent:
    id: str = ""
    filename: str = ""
    content_type: str = ""
    content: str = ""
    encoding: str = "utf-8"
    size_bytes: int = 0
    lines: list[str] = field(default_factory=list)


@dataclass
class ThinkRequest:
    question: str = ""
    mode: ThinkMode = ThinkMode.DEEP
    max_depth: int = 5
    context: Optional[str] = None
    constraints: list[str] = field(default_factory=list)
    temperature: float = 0.5
    timeout_seconds: int = 300


@dataclass
class ThinkStep:
    step: int = 0
    thought: str = ""
    reasoning: str = ""
    confidence: float = 0.0
    timestamp: str = ""


@dataclass
class ThinkResponse:
    task_id: str = field(default_factory=lambda: str(uuid4()))
    question: str = ""
    answer: str = ""
    confidence: float = 0.0
    steps: list[ThinkStep] = field(default_factory=list)
    depth_reached: int = 0
    time_taken_ms: float = 0.0
    model: str = ""
    status: str = "completed"


@dataclass
class CreativeRequest:
    prompt: str = ""
    mode: CreativeMode = CreativeMode.SYNTHESIZE
    domains: list[str] = field(default_factory=list)
    num_ideas: int = 5
    temperature: float = 0.9
    style: str = "exploratory"
    constraints: list[str] = field(default_factory=list)


@dataclass
class CreativeIdea:
    id: int = 0
    title: str = ""
    description: str = ""
    novelty_score: float = 0.0
    feasibility_score: float = 0.0
    tags: list[str] = field(default_factory=list)


@dataclass
class CreativeResponse:
    id: str = field(default_factory=lambda: str(uuid4()))
    prompt: str = ""
    mode: str = ""
    ideas: list[CreativeIdea] = field(default_factory=list)
    synthesis: Optional[str] = None
    domain_connections: list[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class BiasRequest:
    text: str = ""
    bias_types: list[BiasType] = field(default_factory=list)
    sensitivity: float = 0.5
    context: Optional[str] = None


@dataclass
class BiasFinding:
    bias_type: BiasType = BiasType.CONFIRMATION
    severity: float = 0.0
    description: str = ""
    excerpt: str = ""
    suggestion: str = ""


@dataclass
class BiasResponse:
    id: str = field(default_factory=lambda: str(uuid4()))
    text: str = ""
    overall_bias_score: float = 0.0
    findings: list[BiasFinding] = field(default_factory=list)
    summary: str = ""
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class MemoryItem:
    id: str = field(default_factory=lambda: str(uuid4()))
    category: MemoryCategory = MemoryCategory.FACT
    content: str = ""
    importance: float = 0.5
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    access_count: int = 0
    tags: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


@dataclass
class MemoryResponse:
    items: list[MemoryItem] = field(default_factory=list)
    total: int = 0
    categories: dict = field(default_factory=dict)


@dataclass
class KnowledgeItem:
    id: str = field(default_factory=lambda: str(uuid4()))
    title: str = ""
    content: str = ""
    knowledge_type: KnowledgeType = KnowledgeType.NOTE
    source: str = ""
    tags: list[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    version: int = 1
    metadata: dict = field(default_factory=dict)


@dataclass
class KnowledgeCreateRequest:
    title: str = ""
    content: str = ""
    knowledge_type: KnowledgeType = KnowledgeType.NOTE
    source: str = ""
    tags: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


@dataclass
class KnowledgeListResponse:
    items: list[KnowledgeItem] = field(default_factory=list)
    total: int = 0
    offset: int = 0
    limit: int = 20


@dataclass
class SessionInfo:
    id: str = field(default_factory=lambda: str(uuid4()))
    title: str = ""
    status: SessionStatus = SessionStatus.ACTIVE
    message_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: dict = field(default_factory=dict)


@dataclass
class SessionList:
    sessions: list[SessionInfo] = field(default_factory=list)
    total: int = 0
    active_count: int = 0


@dataclass
class SessionDetail(SessionInfo):
    messages: list[Message] = field(default_factory=list)


@dataclass
class SessionCreateRequest:
    title: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass
class EngineStatus:
    name: str = ""
    status: str = "healthy"
    version: str = ""


@dataclass
class HealthStatus:
    status: str = "ok"
    version: str = "1.0.0"
    uptime_seconds: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    engines: list[EngineStatus] = field(default_factory=list)
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0


@dataclass
class StatsResponse:
    total_sessions: int = 0
    active_sessions: int = 0
    total_messages: int = 0
    total_memory_items: int = 0
    total_knowledge_items: int = 0
    total_files: int = 0
    api_calls_today: int = 0
    api_calls_total: int = 0
    average_response_time_ms: float = 0.0
    uptime_seconds: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class ErrorDetail:
    code: str = ""
    message: str = ""
    field: Optional[str] = None
    detail: Optional[str] = None


@dataclass
class ErrorResponse:
    error: bool = True
    code: str = "internal_error"
    message: str = ""
    status_code: int = 500
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    path: Optional[str] = None
    details: list[ErrorDetail] = field(default_factory=list)
