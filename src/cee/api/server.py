"""
CEE REST API Server — FastAPI

提供认知涌现引擎的 HTTP API 接口:
  POST /api/v1/evaluate     — 评估文本质量
  POST /api/v1/optimize     — 优化文本
  POST /api/v1/compare      — 比较两段文本
  POST /api/v1/crystallize  — 知识结晶
  POST /api/v1/evolve       — 反事实进化
  GET  /api/v1/health       — 健康检查
"""

from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ..core.types import GovernanceConfig, OptimizationPath
from ..core.controller import ClosedLoopController
from ..engine.t6_invariant import InvariantEngine, InvariantTheoretical
from ..engine.t1_mirror import CognitiveIsomorphismEngine
from ..engine.t2_prism import HyperGraphCollapseEngine
from ..engine.t3_geodesic import GeodesicNavigationEngine
from ..engine.t4_crystallization import CrystallizationEngine
from ..engine.t5_genesis import GenesisEngine

# ═══════════════════════════════════════════════════════════════════
# 全局引擎实例
# ═══════════════════════════════════════════════════════════════════

invariant_engine = InvariantEngine()
invariant_theoretical = InvariantTheoretical()
t1_engine = CognitiveIsomorphismEngine()
t2_engine = HyperGraphCollapseEngine()
t3_engine = GeodesicNavigationEngine()
t4_engine = CrystallizationEngine()
t5_engine = GenesisEngine()

governance_config = GovernanceConfig()


def _make_t1_optimizer():
    engine = CognitiveIsomorphismEngine()
    def optimize(text: str) -> str:
        return engine.mirror_generate(text, style_hint="academic")
    return optimize


controller = ClosedLoopController(
    evaluator=invariant_engine,
    optimizers={
        OptimizationPath.T1_COGNITIVE_ISOMORPHISM: _make_t1_optimizer(),
    },
    config=governance_config,
    t1_engine=t1_engine,
)

# ═══════════════════════════════════════════════════════════════════
# 请求/响应模型
# ═══════════════════════════════════════════════════════════════════


class EvaluateRequest(BaseModel):
    text: str = Field(..., min_length=1, description="待评估的文本")


class EvaluateResponse(BaseModel):
    scores: dict
    tier: str
    warnings: list[str]
    suggestions: list[str]
    breakdown: dict


class OptimizeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="待优化的文本")
    threshold: Optional[float] = Field(None, ge=0.0, le=1.0, description="目标质量阈值")
    paths: Optional[list[str]] = Field(None, description="启用的优化路径")


class OptimizeResponse(BaseModel):
    original_score: float
    optimized_score: float
    score_delta: float
    iterations: int
    convergence: bool
    path_used: str
    optimized_text: str


class CompareRequest(BaseModel):
    text_a: str = Field(..., min_length=1)
    text_b: str = Field(..., min_length=1)


class CompareResponse(BaseModel):
    scores_a: dict
    scores_b: dict
    winner: str
    delta: float


class CrystallizeRequest(BaseModel):
    fragments: list[str] = Field(..., min_length=2, description="知识碎片列表")
    temperature: float = Field(1.0, ge=0.1, le=10.0)
    iterations: int = Field(100, ge=10, le=1000)


class EvolveRequest(BaseModel):
    text: str = Field(..., min_length=1)
    generations: int = Field(3, ge=1, le=10)
    n_branches: int = Field(5, ge=2, le=20)


class HealthResponse(BaseModel):
    status: str
    version: str
    engines: dict[str, str]


# ═══════════════════════════════════════════════════════════════════
# FastAPI 应用
# ═══════════════════════════════════════════════════════════════════


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Cognitive Emergence Engine API",
    description="认知涌现引擎 — 质量评估与优化 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        version="1.0.0",
        engines={
            "t1_mirror": "ready",
            "t2_prism": "ready",
            "t3_geodesic": "ready",
            "t4_crystallization": "ready",
            "t5_genesis": "ready",
            "t6_invariant": "ready",
        },
    )


@app.post("/api/v1/evaluate", response_model=EvaluateResponse)
async def evaluate(req: EvaluateRequest):
    result = invariant_engine.evaluate_detailed(req.text)
    return EvaluateResponse(
        scores=result["scores"],
        tier=result["scores"]["tier"],
        warnings=result["warnings"],
        suggestions=result["suggestions"],
        breakdown=result["breakdown"],
    )


@app.post("/api/v1/optimize", response_model=OptimizeResponse)
async def optimize(req: OptimizeRequest):
    result = controller.optimize(req.text, target_threshold=req.threshold)

    return OptimizeResponse(
        original_score=result.original.scores.composite if result.original.scores else 0.0,
        optimized_score=result.optimized.scores.composite if result.optimized.scores else 0.0,
        score_delta=result.score_delta,
        iterations=result.iterations,
        convergence=result.convergence,
        path_used=result.path_used.value,
        optimized_text=result.optimized.content,
    )


@app.post("/api/v1/compare", response_model=CompareResponse)
async def compare(req: CompareRequest):
    result = invariant_engine.compare(req.text_a, req.text_b)
    return CompareResponse(
        scores_a=result["a"],
        scores_b=result["b"],
        winner=result["winner"],
        delta=result["delta"],
    )


@app.post("/api/v1/crystallize")
async def crystallize(req: CrystallizeRequest):
    engine = CrystallizationEngine(temperature=req.temperature)
    engine.add_fragments(req.fragments)
    crystals = engine.crystallize(iterations=req.iterations)
    return {
        "crystal_count": len(crystals),
        "crystals": engine.get_crystal_summary(),
        "emergence": engine.get_emergence_relationships(),
    }


@app.post("/api/v1/evolve")
async def evolve(req: EvolveRequest):
    engine = GenesisEngine(n_branches=req.n_branches)
    result = engine.evolve(req.text, generations=req.generations)
    return result


def main():
    uvicorn.run(
        "cee.api.server:app",
        host="0.0.0.0",
        port=8899,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
