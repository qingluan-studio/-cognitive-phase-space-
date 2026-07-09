"""
Closed-Loop Controller: 生成→评估→优化→迭代

核心循环:
  1. T6 评估当前内容(四大不变量)
  2. 综合评分低于阈值 → 触发优化
  3. 按弱项选择最优优化路径(T1-T5)
  4. 优化后重新评估
  5. 评分提升则替换，未提升则换路径
  6. 收敛或达到最大迭代次数时停止

T1 真实集成: 路标提取→镜像生成→n-gram差异纯化
"""

from dataclasses import dataclass, field
from typing import Any, Callable

from ..core.types import (
    InvariantScores, OptimizationPath, OptimizationResult,
    TextArtifact, GovernanceConfig,
)


class ClosedLoopController:
    """质量闭环控制器"""

    def __init__(
        self,
        evaluator,
        optimizers: dict[OptimizationPath, Callable],
        config: GovernanceConfig | None = None,
        t1_engine=None,
    ):
        self.evaluator = evaluator
        self.optimizers = optimizers
        self.config = config or GovernanceConfig()
        self.history: list[dict[str, Any]] = []
        self._t1_engine = t1_engine

    def evaluate(self, text: str) -> tuple[TextArtifact, InvariantScores]:
        artifact = TextArtifact(content=text)
        scores = self.evaluator.evaluate(text)
        artifact.scores = scores
        return artifact, scores

    def optimize(self, text: str,
                  target_threshold: float | None = None) -> OptimizationResult:
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

            weakness = self._identify_weakness(best_scores)
            ordered_paths = self._order_paths_by_weakness(weakness)

            for path in ordered_paths:
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
                        break

                except Exception:
                    continue

            score_delta_iter = best_score - prev_score
            self.history.append({
                "iteration": iteration,
                "score": round(best_score, 4),
                "delta": round(score_delta_iter, 4),
                "path": path_used.value if path_used else "none",
                "weakness": weakness if improvement_failed(improved) else "none",
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

    def _identify_weakness(self, scores: InvariantScores) -> str:
        dims = {
            "ITC": scores.itc,
            "SCS": scores.scs,
            "IEC": scores.iec,
            "PFFT": scores.pfft,
        }
        return min(dims, key=dims.get)

    def _order_paths_by_weakness(self, weakness: str) -> list[OptimizationPath]:
        mapping = {
            "ITC": [
                OptimizationPath.T2_HYPERGRAPH_COLLAPSE,
                OptimizationPath.T4_CRYSTALLIZATION,
            ],
            "SCS": [
                OptimizationPath.T3_GEODESIC_NAVIGATION,
                OptimizationPath.T1_COGNITIVE_ISOMORPHISM,
            ],
            "IEC": [
                OptimizationPath.T5_COUNTERFACTUAL_GROWTH,
                OptimizationPath.T1_COGNITIVE_ISOMORPHISM,
            ],
            "PFFT": [
                OptimizationPath.T1_COGNITIVE_ISOMORPHISM,
                OptimizationPath.T2_HYPERGRAPH_COLLAPSE,
            ],
        }
        ordered = mapping.get(weakness, list(OptimizationPath))
        remaining = [p for p in OptimizationPath if p not in ordered]
        return ordered + remaining

    def get_history(self) -> list[dict[str, Any]]:
        return self.history

    def clear_history(self):
        self.history.clear()


def improvement_failed(improved: bool) -> bool:
    return not improved
