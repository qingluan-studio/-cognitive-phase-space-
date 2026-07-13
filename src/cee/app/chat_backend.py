"""
CEE Chat Backend — AI 对话服务 + 认知涌现质量闭环

流程:
  用户消息 → LLM API → CEE 评估 → [不达标 → 反馈重写] → 返回最优回复
"""

from __future__ import annotations

import json
import time
import uuid
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ..core.types import InvariantScores
from ..engine.t1_mirror import CognitiveIsomorphismEngine as MirrorEngine
from ..engine.t2_prism import HyperGraphCollapseEngine as PrismEngine
from ..engine.t3_geodesic import GeodesicNavigationEngine as GeodesicEngine
from ..engine.t4_crystallization import CrystallizationEngine
from ..engine.t5_genesis import GenesisEngine
from ..engine.t6_invariant import InvariantEngine
from .engine.context_memory import get_global_context

STATIC_DIR = Path(__file__).parent / "frontend"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    api_key: str = ""
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 2048
    enable_cee: bool = True
    cee_threshold: float = 0.7
    max_retries: int = 3
    session_id: str = "default"
    enable_context_memory: bool = True


class ChatResponse(BaseModel):
    content: str
    model: str
    cee_scores: dict | None = None
    cee_tier: str | None = None
    retries: int = 0
    optimized: bool = False
    history: list[dict] | None = None
    context_memory: dict | None = None
    learned_facts: list[str] | None = None


invariant_engine = InvariantEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="CEE Chat", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/", response_class=HTMLResponse)
async def index():
    return FileResponse(STATIC_DIR / "mobile.html")


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ── LLM 调用 ──────────────────────────────────────────────────────


async def call_llm(messages: list[dict], api_key: str, base_url: str,
                    model: str, temperature: float, max_tokens: int,
                    system_prompt: str = "") -> str:
    """调用 OpenAI 兼容 API."""
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload_messages = []
    if system_prompt:
        payload_messages.append({"role": "system", "content": system_prompt})
    payload_messages.extend(messages)

    payload = {
        "model": model,
        "messages": payload_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            detail = resp.text[:500]
            raise HTTPException(
                status_code=502,
                detail=f"LLM API error [{resp.status_code}]: {detail}",
            )
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def call_llm_stream(messages: list[dict], api_key: str, base_url: str,
                          model: str, temperature: float, max_tokens: int,
                          system_prompt: str = ""):
    """调用 OpenAI 兼容 API (流式)."""
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload_messages = []
    if system_prompt:
        payload_messages.append({"role": "system", "content": system_prompt})
    payload_messages.extend(messages)

    payload = {
        "model": model,
        "messages": payload_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as resp:
            if resp.status_code != 200:
                detail = (await resp.aread()).decode()[:500]
                raise HTTPException(
                    status_code=502,
                    detail=f"LLM API error [{resp.status_code}]: {detail}",
                )
            async for line in resp.aiter_lines():
                line = line.strip()
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        obj = json.loads(data)
                        delta = obj.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        pass


# ── 质量评估反馈 ──────────────────────────────────────────────────


def build_optimization_content(scores: InvariantScores, content: str) -> tuple[str, str | None]:
    """Return (optimization_prompt, improved_variant_or_none)."""
    prompts = []

    if scores.itc < 0.5:
        prompts.append(
            "- Make the content more information-dense. "
            "Remove redundancy and tighten the logical structure."
        )
    if scores.scs < 0.5:
        prompts.append(
            "- Smooth the transitions between ideas. "
            "Ensure the flow is coherent from one point to the next."
        )
    if scores.iec < 0.5:
        prompts.append(
            "- Adjust the complexity level. "
            "The information entropy is outside the optimal range. "
            "Either elaborate under-developed ideas or simplify over-complex ones."
        )
    if scores.pfft < 0.5:
        prompts.append(
            "- Balance precision with expressiveness. "
            "Use varied sentence structures while maintaining clarity."
        )

    if not prompts:
        return "", None

    optimization_prompt = (
        "Please rewrite your response to address these structural issues:\n"
        + "\n".join(prompts)
        + "\n\nKeep the same core content and meaning, only improve the structure and clarity."
    )

    improved_variant: str | None = None

    try:
        mirror = MirrorEngine()
        improved_variant = mirror.mirror_generate(content)
    except Exception:
        pass

    try:
        prism = PrismEngine()
        perspectives = prism.collapse_to_perspectives(content)
        if perspectives:
            best = max(perspectives, key=lambda p: p.get("traceability", 0))
            if best.get("traceability", 0) > 0.5:
                alt = prism.reconstruct_from_perspective(best)
                if not improved_variant:
                    improved_variant = alt
    except Exception:
        pass

    return optimization_prompt, improved_variant


# ── 主聊天端点 ───────────────────────────────────────────────────


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    messages_dict = [{"role": m.role, "content": m.content} for m in req.messages]
    enable_cee = req.enable_cee and bool(req.api_key)
    history = []

    cm = get_global_context(req.session_id)

    user_text = messages_dict[-1]["content"] if messages_dict else ""

    best_content = ""
    best_scores = InvariantScores(itc=0, scs=0, iec=0, pfft=0)
    best_score = 0.0
    retries = 0
    optimized = False
    learned_facts: list[str] = []

    system_prompt = ""
    if req.enable_context_memory:
        ctx = cm.get_context(user_text)
        if ctx:
            system_prompt = ctx

    for attempt in range(req.max_retries + 1):
        content = await call_llm(
            messages=messages_dict,
            api_key=req.api_key,
            base_url=req.base_url,
            model=req.model,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            system_prompt=system_prompt,
        )

        if not enable_cee:
            if req.enable_context_memory:
                result = cm.learn_from_conversation(
                    user_text=user_text,
                    ai_response=content,
                )
                learned_facts = result.get("facts", [])
            return ChatResponse(
                content=content,
                model=req.model,
                cee_scores=None,
                cee_tier=None,
                retries=0,
                optimized=False,
                context_memory=cm.stats() if req.enable_context_memory else None,
                learned_facts=learned_facts if req.enable_context_memory else None,
            )

        scores = invariant_engine.evaluate(content)
        composite = scores.composite
        tier = scores.tier.value

        history.append({
            "attempt": attempt,
            "scores": scores.to_dict(),
            "content_preview": content[:100],
        })

        if composite > best_score:
            best_content = content
            best_scores = scores
            best_score = composite

        if composite >= req.cee_threshold:
            break

        if attempt < req.max_retries:
            retries += 1
            optimized = True
            cee_prompt, improved_variant = build_optimization_content(scores, content)
            if improved_variant:
                content = improved_variant
                history.append({
                    "attempt": attempt,
                    "scores": scores.to_dict(),
                    "content_preview": content[:100],
                    "t_engine_optimized": True,
                })
            elif cee_prompt:
                system_prompt = system_prompt + "\n" + cee_prompt if system_prompt else cee_prompt
            else:
                break

    if req.enable_context_memory and best_content:
        result = cm.learn_from_conversation(
            user_text=user_text,
            ai_response=best_content,
            scores=best_scores.to_dict(),
        )
        learned_facts = result.get("facts", [])

    return ChatResponse(
        content=best_content,
        model=req.model,
        cee_scores=best_scores.to_dict(),
        cee_tier=best_scores.tier.value,
        retries=retries,
        optimized=optimized,
        history=history,
        context_memory=cm.stats() if req.enable_context_memory else None,
        learned_facts=learned_facts if req.enable_context_memory else None,
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "cee-chat"}


# ── 会话管理 ──────────────────────────────────────────────────────

_sessions: dict[str, dict] = {}


def _sess_summary(sid: str, s: dict) -> dict:
    msgs = s.get("messages", [])
    title = "新对话"
    for m in msgs:
        if m["role"] == "user":
            title = m["content"][:30]
            break
    return {
        "session_id": sid,
        "title": title,
        "created_at": s["created_at"],
        "updated_at": s["updated_at"],
        "message_count": len(msgs),
    }


@app.get("/api/sessions")
async def list_sessions():
    items = [_sess_summary(sid, s) for sid, s in _sessions.items()]
    items.sort(key=lambda x: x["updated_at"], reverse=True)
    return {"sessions": items}


@app.post("/api/sessions/new")
async def new_session():
    sid = uuid.uuid4().hex[:12]
    t = time.time()
    _sessions[sid] = {"created_at": t, "updated_at": t, "messages": []}
    return {"session_id": sid}


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    s = _sessions.get(session_id)
    if not s:
        raise HTTPException(404, "会话不存在")
    return {"session_id": session_id, "history": s["messages"]}


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    _sessions.pop(session_id, None)
    return {"ok": True}


# ── 流式聊天 ──────────────────────────────────────────────────────

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    async def generate():
        try:
            user_text = ""
            for m in req.messages:
                if m.role == "user":
                    user_text = m.content

            yield f"data: {json.dumps({'type': 'step', 'step': '推理', 'status': 'thinking'})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'type': 'step', 'step': '推理', 'status': 'running'})}\n\n"

            full = ""
            async for chunk in call_llm_stream(
                messages=[{"role": m.role, "content": m.content} for m in req.messages],
                api_key=req.api_key,
                base_url=req.base_url,
                model=req.model,
                temperature=req.temperature,
                max_tokens=req.max_tokens,
            ):
                full += chunk
                yield f"data: {json.dumps({'type': 'delta', 'content': chunk})}\n\n"

            yield f"data: {json.dumps({'type': 'step', 'step': '推理', 'status': 'done'})}\n\n"

            if user_text:
                yield f"data: {json.dumps({'type': 'step', 'step': 'T6评估', 'status': 'running'})}\n\n"
                await asyncio.sleep(0.1)
                scores = invariant_engine.evaluate(full)
                yield f"data: {json.dumps({'type': 'step', 'step': 'T6评估', 'status': 'done'})}\n\n"
                yield f"data: {json.dumps({'type': 'cee', 'scores': scores.to_dict(), 'tier': scores.tier.value})}\n\n"

            yield "data: [DONE]\n\n"
            _save_session_message(req.session_id, user_text, full)

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


def _save_session_message(session_id: str, user_text: str, ai_content: str):
    if not user_text:
        return
    now = time.time()
    s = _sessions.get(session_id)
    if not s:
        s = {"created_at": now, "updated_at": now, "messages": []}
        _sessions[session_id] = s
    s["messages"].append({"role": "user", "content": user_text})
    s["messages"].append({"role": "assistant", "content": ai_content})
    s["updated_at"] = now


# ── 自动学习控制端点 ──────────────────────────────────────────────

class LearnToggleRequest(BaseModel):
    session_id: str = "default"
    enabled: bool = True


class LearnConfigRequest(BaseModel):
    session_id: str = "default"
    auto_learn: bool | None = None
    auto_graph: bool | None = None
    auto_profile: bool | None = None
    learn_from_user: bool | None = None
    learn_from_ai: bool | None = None


class FeedbackRequest(BaseModel):
    session_id: str = "default"
    query: str
    response: str
    rating: str  # "like" or "dislike"


@app.post("/api/learn/toggle")
async def toggle_learning(req: LearnToggleRequest):
    cm = get_global_context(req.session_id)
    cm.toggle_learning(req.enabled)
    return {"auto_learn_enabled": req.enabled, "session_id": req.session_id}


@app.post("/api/learn/config")
async def set_learn_config(req: LearnConfigRequest):
    cm = get_global_context(req.session_id)
    updates = {}
    if req.auto_learn is not None:
        cm.toggle_learning(req.auto_learn)
    if req.auto_graph is not None:
        cm.toggle_graph(req.auto_graph)
    if req.auto_profile is not None:
        cm.toggle_profile(req.auto_profile)
    if req.learn_from_user is not None or req.learn_from_ai is not None:
        kwargs = {}
        if req.learn_from_user is not None:
            kwargs["learn_from_user"] = req.learn_from_user
        if req.learn_from_ai is not None:
            kwargs["learn_from_ai"] = req.learn_from_ai
        cm.set_config(**kwargs)
    return {"config": cm.get_config(), "session_id": req.session_id}


@app.get("/api/learn/stats")
async def learn_stats(session_id: str = "default"):
    cm = get_global_context(session_id)
    return cm.stats()


@app.post("/api/learn/feedback")
async def learn_feedback(req: FeedbackRequest):
    cm = get_global_context(req.session_id)
    cm.mark_feedback(req.query, req.response, req.rating)
    return {"status": "ok", "rating": req.rating}


@app.post("/api/learn/recall")
async def learn_recall(query: str = "", session_id: str = "default", top_k: int = 5):
    cm = get_global_context(session_id)
    results = cm.recall(query, top_k=top_k)
    return {"query": query, "results": results, "session_id": session_id}


@app.post("/api/learn/crystallize")
async def crystallize_knowledge(session_id: str = "default"):
    cm = get_global_context(session_id)
    result = cm.crystallize_knowledge()
    return {"status": "ok", "session_id": session_id, "result": result}


@app.post("/api/learn/crystallize/schedule")
async def schedule_crystallization(session_id: str = "default", interval: int = 3600):
    cm = get_global_context(session_id)
    cm.schedule_crystallization(interval)
    return {"status": "ok", "session_id": session_id, "interval": interval}


# ── 持续学习 / 错误规避 端点 ────────────────────────────────────────


class ContinualFeedbackRequest(BaseModel):
    session_id: str = "default"
    query: str
    response: str
    feedback: str
    rating: Optional[int] = None


class ApplyRulesRequest(BaseModel):
    query: str
    response: str


class ErrorPatternRequest(BaseModel):
    query: str
    response: str
    correction: str
    category: str = "unclear"


@app.post("/api/learn/continual/feedback")
async def record_continual_feedback(req: ContinualFeedbackRequest):
    from .engine.continual_learner import get_continuous_learner
    learner = get_continuous_learner()
    learner.learn_from_feedback(
        req.session_id, req.query, req.response, req.feedback, req.rating,
    )
    return {"status": "ok"}


@app.get("/api/learn/continual/avoidance")
async def get_avoidance(query: str):
    from .engine.continual_learner import get_continuous_learner
    learner = get_continuous_learner()
    ctx = learner.get_avoidance_context(query)
    return {"context": ctx, "has_suggestions": bool(ctx)}


@app.post("/api/learn/continual/apply-rules")
async def apply_learned_rules(req: ApplyRulesRequest):
    from .engine.continual_learner import get_continuous_learner
    learner = get_continuous_learner()
    improved = learner.apply_learned_rules(req.query, req.response)
    return {"improved": improved is not None, "response": improved or req.response}


@app.get("/api/learn/continual/report")
async def learning_report():
    from .engine.continual_learner import get_continuous_learner
    return get_continuous_learner().get_learning_report()


@app.post("/api/learn/continual/error-pattern")
async def record_error_pattern(req: ErrorPatternRequest):
    from .engine.continual_learner import get_continuous_learner, ErrorCategory
    learner = get_continuous_learner()
    valid_categories = [e.value for e in ErrorCategory]
    cat = (
        ErrorCategory(req.category)
        if req.category in valid_categories
        else ErrorCategory.UNCLEAR
    )
    instance = learner.error_miner.record_error(
        req.query, req.response, req.correction, cat,
    )
    return {"error_id": instance.error_id, "category": instance.category.value}


# ── Self-Reflection Metacognition 端点 ──────────────────────────────


class ReflectEvaluateRequest(BaseModel):
    query: str
    response: str
    context: Optional[str] = None


class ReflectImproveRequest(BaseModel):
    query: str
    response: str
    context: Optional[str] = None


@app.post("/api/reflect/evaluate")
async def evaluate_response(req: ReflectEvaluateRequest):
    from .engine.reflect import get_reflect_engine

    engine = get_reflect_engine()
    result = engine.critic.evaluate(req.query, req.response, req.context)
    return {
        "overall_score": result.overall_score,
        "confidence": result.confidence.value,
        "dimension_scores": result.dimension_scores,
        "issues": result.issues,
        "suggestions": result.suggestions,
    }


@app.post("/api/reflect/improve")
async def improve_response(req: ReflectImproveRequest):
    from .engine.reflect import get_reflect_engine, get_metacognitive_monitor

    engine = get_reflect_engine()
    result = engine.reflect_and_improve(req.query, req.response, req.context)
    get_metacognitive_monitor().record_reflection("default", result)
    return {
        "original_score": result.overall_score,
        "confidence": result.confidence.value,
        "dimension_scores": result.dimension_scores,
        "improved_version": result.improved_version,
        "issues": result.issues,
        "suggestions": result.suggestions,
        "iteration_count": result.iteration_count,
    }


@app.get("/api/reflect/report")
async def reflection_report(session_id: str = "default"):
    from .engine.reflect import get_metacognitive_monitor

    monitor = get_metacognitive_monitor()
    return monitor.get_session_report(session_id)


@app.get("/api/reflect/stats")
async def reflection_stats():
    from .engine.reflect import get_metacognitive_monitor

    return get_metacognitive_monitor().get_global_stats()


class PlanCreateRequest(BaseModel):
    goal: str
    context: Optional[str] = None


class PlanExecuteRequest(BaseModel):
    goal: str
    executor_fn: Optional[str] = None


class PlanTreeRequest(BaseModel):
    goal: str


@app.post("/api/plan/create")
async def create_plan(req: PlanCreateRequest):
    from .engine.planner import get_planner

    planner = get_planner()
    tasks = planner.plan(req.goal, req.context)
    tree = planner.get_task_tree(req.goal)
    return {
        "goal": req.goal,
        "task_count": len(tasks),
        "tasks": [
            {
                "id": t.task_id,
                "name": t.name,
                "status": t.status.value,
                "priority": t.priority.value,
                "dependencies": t.dependencies,
            }
            for t in tasks
        ],
        "tree": tree,
    }


@app.post("/api/plan/execute")
async def execute_plan(req: PlanExecuteRequest):
    from .engine.planner import get_planner

    planner = get_planner()
    result = planner.execute_plan(req.goal)
    return {
        "plan_id": result.plan_id,
        "goal": result.goal,
        "progress": result.progress,
        "completed": len(result.completed),
        "failed": len(result.failed),
        "pending": len(result.pending),
        "summary": result.summary,
        "execution_time_ms": result.execution_time_ms,
    }


@app.get("/api/plan/list")
async def list_plans():
    from .engine.planner import get_planner

    return {"plans": get_planner().list_plans()}


@app.get("/api/plan/{plan_id}")
async def get_plan(plan_id: str):
    from .engine.planner import get_planner

    plan = get_planner().get_plan(plan_id)
    if not plan:
        return {"error": "Plan not found"}
    return {
        "plan_id": plan.plan_id,
        "goal": plan.goal,
        "progress": plan.progress,
        "summary": plan.summary,
    }


@app.post("/api/plan/tree")
async def task_tree(req: PlanTreeRequest):
    from .engine.planner import get_planner

    return get_planner().get_task_tree(req.goal)


# ── CoT Reasoning 端点 ──────────────────────────────────────────


class CoTReasonRequest(BaseModel):
    query: str
    strategy: Optional[str] = None
    context: Optional[str] = None


class CoTAnalogyRequest(BaseModel):
    domain: str
    concept: Optional[str] = None


class CoTReasonToolRequest(BaseModel):
    query: str
    tool_results: Optional[dict] = None


@app.post("/api/cot/reason")
async def cot_reason(req: CoTReasonRequest):
    from .engine.cot_reasoner import get_cot_reasoner, ReasoningStrategy

    reasoner = get_cot_reasoner()
    strat = ReasoningStrategy(req.strategy) if req.strategy else None
    result = reasoner.reason(req.query, strat, req.context)
    return {
        "query": result.query,
        "strategy": result.strategy.value,
        "steps": [
            {
                "id": s.step_id,
                "type": s.step_type.value,
                "content": s.content,
                "confidence": s.confidence,
            }
            for s in result.steps
        ],
        "final_answer": result.final_answer,
        "total_confidence": result.total_confidence,
        "trace": result.trace,
        "verified": result.verified,
    }


@app.post("/api/cot/reason-tool")
async def cot_reason_with_tools(req: CoTReasonToolRequest):
    from .engine.cot_reasoner import get_cot_reasoner

    reasoner = get_cot_reasoner()
    result = reasoner.reason_with_tool_use(req.query, req.tool_results)
    return {
        "query": result.query,
        "strategy": result.strategy.value,
        "steps": [
            {
                "id": s.step_id,
                "type": s.step_type.value,
                "content": s.content,
                "confidence": s.confidence,
            }
            for s in result.steps
        ],
        "final_answer": result.final_answer,
        "total_confidence": result.total_confidence,
        "trace": result.trace,
        "verified": result.verified,
    }


@app.get("/api/cot/strategies")
async def list_strategies():
    from .engine.cot_reasoner import ReasoningStrategy

    return {"strategies": [s.value for s in ReasoningStrategy]}


@app.post("/api/cot/analogy")
async def find_analogy(req: CoTAnalogyRequest):
    from .engine.cot_reasoner import ReasonByAnalogy

    rba = ReasonByAnalogy()
    source_info = rba.find_analogy(req.domain)
    source_domain = source_info[0] if source_info else None
    mapped_concept = None
    if req.concept and source_domain:
        mapped_concept = rba.map_concepts(source_domain, req.domain, req.concept)
    return {
        "domain": req.domain,
        "source_domain": source_domain,
        "mapped_concept": mapped_concept,
    }


# ── 启动入口 ──────────────────────────────────────────────────────

def main():
    uvicorn.run(
        "cee.app.chat_backend:app",
        host="0.0.0.0",
        port=8898,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
