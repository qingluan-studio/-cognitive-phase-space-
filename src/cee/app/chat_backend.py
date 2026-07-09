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
from ..engine.t6_invariant import InvariantEngine

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


class ChatResponse(BaseModel):
    content: str
    model: str
    cee_scores: dict | None = None
    cee_tier: str | None = None
    retries: int = 0
    optimized: bool = False
    history: list[dict] | None = None


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


def build_optimization_prompt(scores: InvariantScores) -> str:
    """根据 CEE 评分构建优化提示."""
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
        return ""

    return (
        "Please rewrite your response to address these structural issues:\n"
        + "\n".join(prompts)
        + "\n\nKeep the same core content and meaning, only improve the structure and clarity."
    )


# ── 主聊天端点 ───────────────────────────────────────────────────


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    messages_dict = [{"role": m.role, "content": m.content} for m in req.messages]
    enable_cee = req.enable_cee and bool(req.api_key)
    history = []

    best_content = ""
    best_scores = InvariantScores(itc=0, scs=0, iec=0, pfft=0)
    best_score = 0.0
    retries = 0
    optimized = False

    system_prompt = ""

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
            return ChatResponse(
                content=content,
                model=req.model,
                cee_scores=None,
                cee_tier=None,
                retries=0,
                optimized=False,
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
            system_prompt = build_optimization_prompt(scores)
            if not system_prompt:
                break

    return ChatResponse(
        content=best_content,
        model=req.model,
        cee_scores=best_scores.to_dict(),
        cee_tier=best_scores.tier.value,
        retries=retries,
        optimized=optimized,
        history=history,
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "cee-chat"}


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
