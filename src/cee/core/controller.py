"""
Closed-Loop Controller: 生成→评估→优化→迭代

核心循环:
  1. T6 评估当前内容(四大不变量)
  2. 综合评分低于阈值 → 触发优化
  3. 选择最优优化路径(T1-T5)
  4. 优化后重新评估
  5. 评分提升则替换，未提升则换路径
  6. 收敛或达到最大迭代次数时停止
"""

from dataclasses import dataclass, field
from typing import Any, Callable

from ..core.types import (
    InvariantScores, OptimizationPath, OptimizationResult,
    TextArtifact, GovernanceConfig,
)

# ═══════════════════════════════════════════════════════════════════


class ClosedLoopController:
    """质量闭环控制器"""

    def __init__(
        self,
        evaluator,          # T6 InvariantEngine
        optimizers: dict[OptimizationPath, Callable],
        config: GovernanceConfig | None = None,
    ):
        self.evaluator = evaluator
        self.optimizers = optimizers
        self.config = config or GovernanceConfig()
        self.history: list[dict[str, Any]] = []

    def evaluate(self, text: str) -> tuple[TextArtifact, InvariantScores]:
        """评估文本质量."""
        artifact = TextArtifact(content=text)
        scores = self.evaluator.evaluate(text)
        artifact.scores = scores
        return artifact, scores

    def optimize(self, text: str,
                 target_threshold: float | None = None) -> OptimizationResult:
        """
        质量闭环优化: 评估→选择路径→优化→重评估→迭代。

        Returns:
            OptimizationResult 包含优化前后的文本和评分变化。
        """
        threshold = target_threshold or self.config.auto_optimize_threshold
        max_iter = self.config.max_optimization_iterations
        epsilon = self.config.convergence_epsilon

        original = TextArtifact(content=text)
        original.scores = self.evaluator.evaluate(text)
        original_score = original.scores.composite

        if original_score >= threshold:
            return OptimizationResult(
                original=original,
                optimized=original,
                path_used=OptimizationPath.T1_COGNITIVE_ISOMORPHISM,
                score_delta=0.0,
                iterations=0,
                convergence=True,
            )

        best_artifact = text
        best_scores = self.evaluator.evaluate(text)
        best_score = best_scores.composite
        path_used = None

        prev_score = best_score
        converged = False

        for iteration in range(max_iter):
            improved = False

            for path in self.config.optimization_paths_enabled:
                if path not in self.optimizers:
                    continue

                try:
                    candidate = self.optimizers[path](best_artifact)
                    candidate_scores = self.evaluator.evaluate(candidate)
                    candidate_score = candidate_scores.composite

                    if candidate_score > best_score + epsilon:
                        best_artifact = candidate
                        best_scores = candidate_scores
                        best_score = candidate_score
                        path_used = path
                        improved = True

                except Exception:
                    continue

            score_delta_iter = best_score - prev_score
            self.history.append({
                "iteration": iteration,
                "score": round(best_score, 4),
                "delta": round(score_delta_iter, 4),
                "path": path_used.value if path_used else "none",
            })

            if not improved:
                converged = True
                break

            if best_score >= threshold:
                converged = True
                break

            prev_score = best_score

        optimized = TextArtifact(content=best_artifact)
        optimized.scores = best_scores

        return OptimizationResult(
            original=original,
            optimized=optimized,
            path_used=path_used or OptimizationPath.T1_COGNITIVE_ISOMORPHISM,
            score_delta=best_score - original_score,
            iterations=len(self.history),
            convergence=converged,
        )

    def get_history(self) -> list[dict[str, Any]]:
        return self.history

    def clear_history(self):
        self.history.clear()
