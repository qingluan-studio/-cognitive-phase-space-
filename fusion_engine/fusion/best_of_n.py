"""
Best-of-N 融合算法

从 N 个候选响应中根据指定策略选出最优的一个。
支持最高质量、最快响应、成本最优等多种选择策略。
"""

from __future__ import annotations

from enum import Enum, auto
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..core.model_collector import ModelResponse
    from ..core.quality_assessor import AssessmentResult


class SelectionStrategy(Enum):
    """选择策略枚举"""

    HIGHEST_QUALITY = auto()  # 最高质量（默认）
    FASTEST_RESPONSE = auto()  # 最快响应
    COST_OPTIMAL = auto()  # 成本最优
    BALANCED = auto()  # 质量-速度平衡
    MOST_COMPACT = auto()  # 最简洁（token最少）


class BestOfNFusion:
    """
    Best-of-N 融合器

    工作原理：
    1. 接收 N 个模型响应
    2. 根据用户指定的策略计算每个响应的适配分数
    3. 选择分数最高的单一响应作为输出
    4. 支持动态策略切换和组合策略
    """

    def __init__(
        self,
        strategy: SelectionStrategy = SelectionStrategy.HIGHEST_QUALITY,
        cost_factors: dict[str, float] | None = None,
    ):
        self.strategy = strategy
        self.cost_factors = cost_factors or {}
        self._last_selection_stats: dict | None = None

    def set_strategy(self, strategy: SelectionStrategy) -> None:
        """设置选择策略"""
        self.strategy = strategy

    def _score_by_quality(self, assessment: AssessmentResult) -> float:
        """按质量评分"""
        return assessment.dimensions.overall

    def _score_by_speed(self, response: ModelResponse) -> float:
        """按速度评分（延迟越低越好，因此取倒数）"""
        # 避免除零，假设最小延迟为 50ms
        latency = max(response.latency_ms, 50.0)
        return 1000.0 / latency

    def _score_by_cost(self, response: ModelResponse) -> float:
        """按成本评分（成本越低越好）"""
        cost = self.cost_factors.get(response.model_name, 1.0)
        # 成本越低，分数越高
        return 1.0 / max(cost, 0.01)

    def _score_balanced(
        self,
        response: ModelResponse,
        assessment: AssessmentResult,
        quality_weight: float = 0.5,
        speed_weight: float = 0.3,
        cost_weight: float = 0.2,
    ) -> float:
        """平衡策略：综合考虑质量、速度和成本"""
        quality_score = assessment.dimensions.overall * quality_weight
        speed_score = (
            (1000.0 / max(response.latency_ms, 50.0))
            / 20.0
            * speed_weight
        )  # 归一化到约0-1
        cost_score = (
            (1.0 / max(self.cost_factors.get(response.model_name, 1.0), 0.01))
            / 5.0
            * cost_weight
        )

        return quality_score + speed_score + cost_score

    def _score_compact(
        self, response: ModelResponse, assessment: AssessmentResult
    ) -> float:
        """最简洁策略：偏好 token 少但质量不差的响应"""
        token_count = max(response.token_count, 1)
        efficiency = assessment.dimensions.efficiency
        # 效率越高、token 越少，分数越高
        compact_score = efficiency * (1000.0 / token_count)
        # 但质量不能太差，低于阈值则惩罚
        if assessment.dimensions.overall < 0.6:
            compact_score *= 0.5
        return compact_score

    def fuse(
        self,
        responses: list[ModelResponse],
        assessments: list[AssessmentResult] | None = None,
    ) -> str:
        """
        执行 Best-of-N 融合

        Args:
            responses: 模型响应列表
            assessments: 质量评估结果，某些策略需要

        Returns:
            选中的最佳响应文本（含元数据注释）
        """
        if not responses:
            return ""

        if len(responses) == 1:
            return responses[0].output

        if assessments is None and self.strategy in {
            SelectionStrategy.HIGHEST_QUALITY,
            SelectionStrategy.BALANCED,
            SelectionStrategy.MOST_COMPACT,
        }:
            raise ValueError(f"策略 {self.strategy.name} 需要提供 assessments")

        assessments = assessments or []

        # 计算每个响应的得分
        scores: list[tuple[int, float]] = []
        for i, response in enumerate(responses):
            if self.strategy == SelectionStrategy.HIGHEST_QUALITY:
                if i >= len(assessments):
                    continue
                score = self._score_by_quality(assessments[i])
            elif self.strategy == SelectionStrategy.FASTEST_RESPONSE:
                score = self._score_by_speed(response)
            elif self.strategy == SelectionStrategy.COST_OPTIMAL:
                score = self._score_by_cost(response)
            elif self.strategy == SelectionStrategy.BALANCED:
                if i >= len(assessments):
                    continue
                score = self._score_balanced(response, assessments[i])
            elif self.strategy == SelectionStrategy.MOST_COMPACT:
                if i >= len(assessments):
                    continue
                score = self._score_compact(response, assessments[i])
            else:
                score = 0.0

            scores.append((i, score))

        if not scores:
            return responses[0].output

        # 选择最高分
        winner_index, winner_score = max(scores, key=lambda x: x[1])
        winner = responses[winner_index]

        # 记录统计
        self._last_selection_stats = {
            "strategy": self.strategy.name,
            "winner_index": winner_index,
            "winner_model": winner.model_name,
            "winner_score": winner_score,
            "all_scores": {
                responses[idx].model_name: round(sc, 4) for idx, sc in scores
            },
        }

        metadata = f"""
<!-- 融合信息: Best-of-N -->
<!-- 策略: {self.strategy.name} -->
<!-- 总响应数: {len(responses)} -->
<!-- 获胜模型: {winner.model_name} -->
<!-- 获胜得分: {winner_score:.4f} -->
<!-- 各模型得分: {self._last_selection_stats["all_scores"]} -->
"""

        return winner.output + metadata

    def get_last_stats(self) -> dict | None:
        """获取上次选择的统计信息"""
        return self._last_selection_stats
