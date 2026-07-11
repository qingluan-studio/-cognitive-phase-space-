import time
import uuid
from typing import Optional

from fastapi import APIRouter, Body, HTTPException, Path, Query, Request, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

from ..models.schemas import (
    BiasRequest,
    BiasResponse,
    BiasFinding,
    BiasType,
    ChatRequest,
    ChatResponse,
    ChatSource,
    ChatStreamChunk,
    CreativeIdea,
    CreativeRequest,
    CreativeResponse,
    ErrorDetail,
    ErrorResponse,
    FileContent,
    FileInfo,
    FileStatus,
    FileUploadResponse,
    HealthStatus,
    KnowledgeCreateRequest,
    KnowledgeItem,
    KnowledgeListResponse,
    KnowledgeType,
    MemoryCategory,
    MemoryItem,
    MemoryResponse,
    Message,
    MessageRole,
    SearchRequest,
    SearchResponse,
    SearchResult,
    SearchType,
    SessionCreateRequest,
    SessionDetail,
    SessionInfo,
    SessionList,
    SessionStatus,
    StatsResponse,
    ThinkMode,
    ThinkRequest,
    ThinkResponse,
    ThinkStep,
)

router = APIRouter(prefix="/api", tags=["cee"])

_sessions: dict[str, SessionDetail] = {}
_memory_store: dict[str, MemoryItem] = {}
_knowledge_store: dict[str, KnowledgeItem] = {}
_files_store: dict[str, FileInfo] = {}

_start_time = time.time()
_total_api_calls = 0
_total_messages = 0

_think_tasks: dict[str, ThinkResponse] = {}


def _generate_id() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    from datetime import datetime
    return datetime.utcnow().isoformat()


@router.get("/health", response_model=HealthStatus)
async def health():
    now = time.time()
    uptime = now - _start_time
    return HealthStatus(
        status="ok",
        version="1.0.0",
        uptime_seconds=uptime,
        engines=[
            {"name": "t1_mirror", "status": "healthy", "version": "1.0"},
            {"name": "t2_prism", "status": "healthy", "version": "1.0"},
            {"name": "t3_geodesic", "status": "healthy", "version": "1.0"},
            {"name": "t4_crystallization", "status": "healthy", "version": "1.0"},
            {"name": "t5_genesis", "status": "healthy", "version": "1.0"},
            {"name": "t6_invariant", "status": "healthy", "version": "1.0"},
        ],
    )


@router.get("/stats", response_model=StatsResponse)
async def stats():
    global _total_api_calls, _total_messages
    now = time.time()
    uptime = now - _start_time
    return StatsResponse(
        total_sessions=len(_sessions),
        active_sessions=sum(
            1 for s in _sessions.values() if s.status == SessionStatus.ACTIVE
        ),
        total_messages=_total_messages,
        total_memory_items=len(_memory_store),
        total_knowledge_items=len(_knowledge_store),
        total_files=len(_files_store),
        api_calls_today=_total_api_calls,
        api_calls_total=_total_api_calls,
        average_response_time_ms=0.0,
        uptime_seconds=uptime,
    )


@router.post("/sessions", response_model=SessionDetail)
async def create_session(req: SessionCreateRequest = Body(
    default_factory=lambda: SessionCreateRequest()
)):
    sid = _generate_id()
    now = _now_iso()
    session = SessionDetail(
        id=sid,
        title=req.title or f"Session {sid[:8]}",
        status=SessionStatus.ACTIVE,
        message_count=0,
        created_at=now,
        updated_at=now,
        metadata=req.metadata,
    )
    _sessions[sid] = session
    return session


@router.get("/sessions", response_model=SessionList)
async def list_sessions(
    status: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    items = list(_sessions.values())
    if status:
        try:
            s = SessionStatus(status)
            items = [i for i in items if i.status == s]
        except ValueError:
            pass
    items.sort(key=lambda x: x.updated_at, reverse=True)
    total = len(items)
    paged = items[offset:offset + limit]
    return SessionList(
        sessions=[
            SessionInfo(
                id=s.id, title=s.title, status=s.status,
                message_count=s.message_count,
                created_at=s.created_at, updated_at=s.updated_at,
                metadata=s.metadata,
            )
            for s in paged
        ],
        total=total,
        active_count=sum(
            1 for s in items if s.status == SessionStatus.ACTIVE
        ),
    )


@router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session(session_id: str = Path(...)):
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return _sessions[session_id]


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str = Path(...)):
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    _sessions[session_id].status = SessionStatus.ARCHIVED
    return {"deleted": True, "session_id": session_id}


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest = Body(...)):
    global _total_messages
    msg_id = _generate_id()
    now = _now_iso()

    user_content = (
        req.messages[-1].content if req.messages else ""
    )
    response_content = (
        f"[CEE Response] 已收到您的问题: "
        f"\"{user_content[:200]}\"。正在使用 {req.model} 模型生成回复..."
    )

    _total_messages += 1

    if req.session_id and req.session_id in _sessions:
        sess = _sessions[req.session_id]
        sess.message_count += 1
        sess.updated_at = now

    return ChatResponse(
        id=msg_id,
        content=response_content,
        role="assistant",
        model=req.model,
        session_id=req.session_id,
        created_at=now,
        tokens_used=len(user_content) // 4,
        sources=[
            ChatSource(name="CEE 认知引擎", url="", relevance=0.95),
        ],
    )


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest = Body(...)):
    async def _stream():
        user_content = (
            req.messages[-1].content if req.messages else ""
        )
        words = user_content.split()[:10] if user_content else ["思考中..."]
        for i, word in enumerate(words):
            chunk = ChatStreamChunk(
                content=word + " ",
                done=(i == len(words) - 1),
            )
            import json
            yield f"data: {json.dumps(chunk.__dict__, ensure_ascii=False, default=str)}\n\n"
            import asyncio
            await asyncio.sleep(0.05)
        yield "data: [DONE]\n\n"

    return StreamingResponse(_stream(), media_type="text/event-stream")


@router.post("/search/web", response_model=SearchResponse)
async def search_web(req: SearchRequest = Body(...)):
    results = [
        SearchResult(
            title=f"搜索结果: {req.query}",
            url=f"https://example.com/search?q={req.query}",
            snippet=f"关于 \"{req.query}\" 的搜索结果摘要。",
            score=0.9,
            source="web",
            relevance=0.85,
        ),
    ]
    return SearchResponse(
        query=req.query,
        total_results=len(results),
        results=results,
        search_type="web",
        took_ms=12.5,
    )


@router.post("/search/knowledge", response_model=SearchResponse)
async def search_knowledge(req: SearchRequest = Body(...)):
    results = [
        SearchResult(
            title=item.title,
            url="",
            snippet=item.content[:200],
            score=0.85,
            source="knowledge_base",
            relevance=0.8,
        )
        for item in _knowledge_store.values()
    ]
    if req.query:
        results = [
            r for r in results
            if req.query.lower() in r.title.lower()
            or req.query.lower() in r.snippet.lower()
        ]
    return SearchResponse(
        query=req.query,
        total_results=len(results),
        results=results[:req.max_results],
        search_type="knowledge",
        took_ms=8.3,
    )


@router.post("/files/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile):
    fid = _generate_id()
    now = _now_iso()
    content_type = file.content_type or "application/octet-stream"
    file_info = FileInfo(
        id=fid,
        filename=file.filename or "unknown",
        size_bytes=0,
        content_type=content_type,
        status=FileStatus.READY,
        created_at=now,
    )
    _files_store[fid] = file_info
    return FileUploadResponse(
        id=fid,
        filename=file_info.filename,
        size_bytes=file_info.size_bytes,
        content_type=file_info.content_type,
        status=FileStatus.READY,
        uploaded_at=now,
    )


@router.get("/files/{file_id}", response_model=FileInfo)
async def get_file(file_id: str = Path(...)):
    if file_id not in _files_store:
        raise HTTPException(status_code=404, detail="File not found")
    return _files_store[file_id]


@router.get("/files/{file_id}/content", response_model=FileContent)
async def get_file_content(file_id: str = Path(...)):
    if file_id not in _files_store:
        raise HTTPException(status_code=404, detail="File not found")
    info = _files_store[file_id]
    return FileContent(
        id=info.id,
        filename=info.filename,
        content_type=info.content_type,
        content=f"[{info.filename} content]",
        size_bytes=info.size_bytes,
    )


@router.post("/think/deep", response_model=ThinkResponse)
async def think_deep(req: ThinkRequest = Body(...)):
    task_id = _generate_id()
    now = _now_iso()
    steps = []
    for i in range(min(req.max_depth, 5)):
        steps.append(ThinkStep(
            step=i + 1,
            thought=f"分析层次 {i + 1}: {req.question[:50]}...",
            reasoning=f"推理步骤 {i + 1}",
            confidence=0.9 - i * 0.15,
            timestamp=now,
        ))
    response = ThinkResponse(
        task_id=task_id,
        question=req.question,
        answer=f"深度思考结果: 已对问题进行了 {len(steps)} 层分析。",
        confidence=steps[-1].confidence if steps else 0.5,
        steps=steps,
        depth_reached=len(steps),
        time_taken_ms=len(steps) * 155.0,
        model="cee-deep-think-v1",
    )
    _think_tasks[task_id] = response
    return response


@router.get("/think/{task_id}", response_model=ThinkResponse)
async def get_think_task(task_id: str = Path(...)):
    if task_id not in _think_tasks:
        raise HTTPException(status_code=404, detail="Think task not found")
    return _think_tasks[task_id]


@router.post("/creative/synthesize", response_model=CreativeResponse)
async def creative_synthesize(req: CreativeRequest = Body(...)):
    ideas = []
    for i in range(req.num_ideas):
        ideas.append(CreativeIdea(
            id=i + 1,
            title=f"创意 {i + 1}: {req.prompt[:30]}...",
            description=f"基于 \"{req.prompt[:60]}\" 生成的创意想法 #{i + 1}",
            novelty_score=0.7 + i * 0.05,
            feasibility_score=0.8 - i * 0.05,
            tags=req.domains[:3],
        ))
    return CreativeResponse(
        id=_generate_id(),
        prompt=req.prompt,
        mode=req.mode.value,
        ideas=ideas,
        synthesis=f"综合 {len(ideas)} 个创意，核心方向围绕 \"{req.prompt[:40]}\" 展开。",
        domain_connections=[
            f"{req.domains[i]} ↔ {req.domains[j]}"
            for i in range(len(req.domains))
            for j in range(i + 1, len(req.domains))
        ],
    )


@router.post("/bias/detect", response_model=BiasResponse)
async def detect_bias(req: BiasRequest = Body(...)):
    target_types = req.bias_types or list(BiasType)
    findings = []
    score_factor = req.sensitivity * 0.5
    for bias_type in target_types:
        findings.append(BiasFinding(
            bias_type=bias_type,
            severity=min(1.0, score_factor + 0.1),
            description=f"检测到潜在的 {bias_type.value} 偏差。",
            excerpt=req.text[:100] if req.text else "",
            suggestion=f"建议对 {bias_type.value} 相关模式进行人工审查。",
        ))
    overall = sum(f.severity for f in findings) / max(1, len(findings))
    return BiasResponse(
        text=req.text,
        overall_bias_score=overall,
        findings=findings,
        summary=f"共检测到 {len(findings)} 类潜在偏差，综合偏差评分 {overall:.2f}。",
    )


@router.get("/memory", response_model=MemoryResponse)
async def list_memory(
    category: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    items = list(_memory_store.values())
    if category:
        try:
            cat = MemoryCategory(category)
            items = [i for i in items if i.category == cat]
        except ValueError:
            pass
    items.sort(key=lambda x: x.updated_at, reverse=True)
    paged = items[offset:offset + limit]
    cats: dict[str, int] = {}
    for item in _memory_store.values():
        cats[item.category.value] = cats.get(item.category.value, 0) + 1
    return MemoryResponse(
        items=paged,
        total=len(items),
        categories=cats,
    )


@router.post("/memory", response_model=MemoryItem)
async def create_memory(
    content: str = Body(..., embed=True),
    category: str = Body("fact", embed=True),
    importance: float = Body(0.5, embed=True),
    tags: list[str] = Body(default_factory=list, embed=True),
):
    mid = _generate_id()
    now = _now_iso()
    item = MemoryItem(
        id=mid,
        category=MemoryCategory(category),
        content=content,
        importance=importance,
        created_at=now,
        updated_at=now,
        access_count=0,
        tags=tags,
    )
    _memory_store[mid] = item
    return item


@router.get("/knowledge", response_model=KnowledgeListResponse)
async def list_knowledge(
    knowledge_type: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    items = list(_knowledge_store.values())
    if knowledge_type:
        try:
            kt = KnowledgeType(knowledge_type)
            items = [i for i in items if i.knowledge_type == kt]
        except ValueError:
            pass
    items.sort(key=lambda x: x.updated_at, reverse=True)
    total = len(items)
    paged = items[offset:offset + limit]
    return KnowledgeListResponse(
        items=paged,
        total=total,
        offset=offset,
        limit=limit,
    )


@router.post("/knowledge", response_model=KnowledgeItem)
async def create_knowledge(req: KnowledgeCreateRequest = Body(...)):
    kid = _generate_id()
    now = _now_iso()
    item = KnowledgeItem(
        id=kid,
        title=req.title,
        content=req.content,
        knowledge_type=req.knowledge_type,
        source=req.source,
        tags=req.tags,
        created_at=now,
        updated_at=now,
        version=1,
        metadata=req.metadata,
    )
    _knowledge_store[kid] = item
    return item


@router.delete("/knowledge/{knowledge_id}")
async def delete_knowledge(knowledge_id: str = Path(...)):
    if knowledge_id not in _knowledge_store:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    del _knowledge_store[knowledge_id]
    return {"deleted": True, "knowledge_id": knowledge_id}


def _record_api_call(request: Request, response_time_ms: float = 0):
    global _total_api_calls
    _total_api_calls += 1
