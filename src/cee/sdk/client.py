"""
CEE Python SDK — 认知涌现引擎客户端

面向 Python 应用的轻量级集成接口。
"""

from dataclasses import dataclass
from typing import Optional

import httpx


@dataclass
class CEEConfig:
    """SDK 配置"""
    endpoint: str = "http://localhost:8899"
    timeout: float = 30.0
    api_prefix: str = "/api/v1"


class CEEClient:
    """CEE 客户端"""

    def __init__(self, config: CEEConfig | None = None):
        self.config = config or CEEConfig()
        self._client = httpx.Client(
            base_url=self.config.endpoint,
            timeout=self.config.timeout,
        )

    @property
    def prefix(self) -> str:
        return self.config.api_prefix

    # ── 健康检查 ──────────────────────────────────────────────────

    def health(self) -> dict:
        r = self._client.get(f"{self.prefix}/health")
        r.raise_for_status()
        return r.json()

    # ── 评估 ──────────────────────────────────────────────────────

    def evaluate(self, text: str) -> dict:
        """
        评估文本质量，返回四大不变量评分和详细分析。

        Returns:
            {
                "scores": {"itc": ..., "scs": ..., "iec": ..., "pfft": ..., "composite": ..., "tier": ...},
                "tier": "good" | "fair" | ...,
                "warnings": [...],
                "suggestions": [...],
                "breakdown": {...}
            }
        """
        r = self._client.post(
            f"{self.prefix}/evaluate",
            json={"text": text},
        )
        r.raise_for_status()
        return r.json()

    def is_quality_ok(self, text: str, threshold: float = 0.7) -> bool:
        result = self.evaluate(text)
        return result["scores"]["composite"] >= threshold

    def get_score(self, text: str) -> float:
        result = self.evaluate(text)
        return result["scores"]["composite"]

    # ── 比较 ──────────────────────────────────────────────────────

    def compare(self, text_a: str, text_b: str) -> dict:
        """比较两段文本，返回评分对比和胜者."""
        r = self._client.post(
            f"{self.prefix}/compare",
            json={"text_a": text_a, "text_b": text_b},
        )
        r.raise_for_status()
        return r.json()

    # ── 优化 ──────────────────────────────────────────────────────

    def optimize(self, text: str, threshold: float = 0.7) -> dict:
        """
        优化文本质量至目标阈值。

        Returns:
            {
                "original_score": ...,
                "optimized_score": ...,
                "score_delta": ...,
                "iterations": ...,
                "convergence": ...,
                "path_used": ...,
                "optimized_text": ...
            }
        """
        r = self._client.post(
            f"{self.prefix}/optimize",
            json={"text": text, "threshold": threshold},
        )
        r.raise_for_status()
        return r.json()

    # ── 结晶 ──────────────────────────────────────────────────────

    def crystallize(self, fragments: list[str], temperature: float = 1.0,
                    iterations: int = 100) -> dict:
        """从知识碎片中结晶结构化知识."""
        r = self._client.post(
            f"{self.prefix}/crystallize",
            json={
                "fragments": fragments,
                "temperature": temperature,
                "iterations": iterations,
            },
        )
        r.raise_for_status()
        return r.json()

    # ── 进化 ──────────────────────────────────────────────────────

    def evolve(self, text: str, generations: int = 3,
               n_branches: int = 5) -> dict:
        """反事实进化: 生长→选择→杂交→迭代."""
        r = self._client.post(
            f"{self.prefix}/evolve",
            json={
                "text": text,
                "generations": generations,
                "n_branches": n_branches,
            },
        )
        r.raise_for_status()
        return r.json()

    # ── 质量闭环 ──────────────────────────────────────────────────

    def quality_loop(self, text: str, threshold: float = 0.8) -> dict:
        """
        一键质量闭环: 评估→优化→再评估→重写。

        接入现有AI项目时的主要入口:
          - AI生成内容后调用此方法
          - 自动评估并优化到目标阈值
        """
        eval_result = self.evaluate(text)
        current_score = eval_result["scores"]["composite"]

        if current_score >= threshold:
            return {
                "action": "no_optimization_needed",
                "evaluation": eval_result,
                "text": text,
            }

        opt_result = self.optimize(text, threshold=threshold)
        return {
            "action": "optimized",
            "original_evaluation": eval_result,
            "optimization": opt_result,
            "text": opt_result["optimized_text"],
        }

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
