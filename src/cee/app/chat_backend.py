"""
CEE Chat Backend — AI 对话服务 + 认知涌现质量闭环

流程:
  用户消息 → LLM API → CEE 评估 → [不达标 → 反馈重写] → 返回最优回复
"""

from __future__ import annotations

import json
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
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
    return FileResponse(STATIC_DIR / "index.html")


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
