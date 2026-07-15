"""
LLM-as-a-Judge 融合算法

利用 QualityAssessor 的评估结果，通过加权评分选择最佳响应。
支持多维度加权、置信度校准和混合策略。
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..core.model_collector import ModelResponse
    from ..core.quality_assessor import AssessmentResult, QualityAssessor


@dataclass
class JudgeWeights:
    """评判权重配置"""

    correctness: float = 0.20
    coherence: float = 0.10
    completeness: float = 0.15
    creativity: float = 0.10
    efficiency: float = 0.10
    depth: float = 0.15
    factuality: float = 0.10
    reasoning: float = 0.10

    # 额外惩罚与奖励系数
    weakness_penalty: float = 0.05
    strength_bonus: float = 0.03

    def to_dict(self) -> dict[str, float]:
        return {
            "correctness": self.correctness,
            "coherence": self.coherence,
            "completeness": self.completeness,
            "creativity": self.creativity,
            "efficiency": self.efficiency,
            "depth": self.depth,
            "factuality": self.factuality,
            "reasoning": self.reasoning,
        }


class LLMJudgeFusion:
    """
    LLM-as-a-Judge 融合器

    工作原理：
    1. 获取 QualityAssessor 的多维度评分
    2. 根据任务类型动态调整权重
    3. 计算加权综合得分
    4. 选择得分最高的响应作为输出
    5. 可选：将亚军响应的优点片段补充进冠军响应
    """

    def __init__(
        self,
        assessor: QualityAssessor | None = None,
        weights: JudgeWeights | None = None,
        adaptive_weights: bool = True,
    ):
        self.assessor = assessor
        self.weights = weights or JudgeWeights()
        self.adaptive_weights = adaptive_weights
        self._calibration_history: list[dict] = []

    def _get_task_type_weights(self, responses: list[ModelResponse]) -> dict[str, float]:
        """根据任务类型返回动态权重"""
        from ..core.model_collector import ModelCapability

        # 检测任务类型
        task_types = set()
        for resp in responses:
            task_types.update(resp.capabilities)

        weights = self.weights.to_dict().copy()

        if ModelCapability.CODING in task_types or ModelCapability.MATH in task_types:
            weights["correctness"] += 0.05
            weights["reasoning"] += 0.05
            weights["creativity"] -= 0.05
            weights["efficiency"] += 0.02

        if ModelCapability.CREATIVITY in task_types:
            weights["creativity"] += 0.10
            weights["depth"] += 0.03
            weights["correctness"] -= 0.05

        if ModelCapability.FACTUAL in task_types:
            weights["factuality"] += 0.10
            weights["correctness"] += 0.03
            weights["creativity"] -= 0.05

        # 归一化
        total = sum(weights.values())
        return {k: v / total for k, v in weights.items()}

    def _compute_weighted_score(
        self,
        assessment: AssessmentResult,
        weights: dict[str, float],
    ) -> float:
        """计算单个评估结果的加权得分"""
        dims = assessment.dimensions

        base_score = (
            dims.correctness * weights.get("correctness", 0.0)
            + dims.coherence * weights.get("coherence", 0.0)
            + dims.completeness * weights.get("completeness", 0.0)
            + dims.creativity * weights.get("creativity", 0.0)
            + dims.efficiency * weights.get("efficiency", 0.0)
            + dims.depth * weights.get("depth", 0.0)
            + dims.factuality * weights.get("factuality", 0.0)
            + dims.reasoning * weights.get("reasoning", 0.0)
        )

        # 奖励优点
        strength_bonus = len(assessment.strengths) * self.weights.strength_bonus
        # 惩罚缺点
        weakness_penalty = len(assessment.weaknesses) * self.weights.weakness_penalty

        final_score = base_score + strength_bonus - weakness_penalty
        return max(0.0, min(1.0, final_score))

    def _calibrate_scores(
        self,
        scores: dict[str, float],
        assessments: list[AssessmentResult],
    ) -> dict[str, float]:
        """分数校准：根据评估器间一致性调整"""
        if len(assessments) < 2:
            return scores

        # 计算分数离散度
        values = list(scores.values())
        mean_score = sum(values) / len(values)
        variance = sum((s - mean_score) ** 2 for s in values) / len(values)
        std = variance**0.5

        # 如果分数过于接近，引入微小扰动以打破平局
        if std < 0.02:
            calibrated = {}
            for resp_id, score in scores.items():
                noise = random.gauss(0, 0.01)
                calibrated[resp_id] = max(0.0, min(1.0, score + noise))
            return calibrated

        return scores

    def _build_fusion_metadata(
        self,
        winner: AssessmentResult,
        all_assessments: list[AssessmentResult],
        scores: dict[str, float],
    ) -> str:
        """构建融合元数据注释"""
        total = len(all_assessments)
        ranked = sorted(
            all_assessments,
            key=lambda a: scores.get(a.response_id, 0.0),
            reverse=True,
        )

        metadata = f"""
<!-- 融合信息: LLM-as-a-Judge -->
<!-- 总响应数: {total} -->
<!-- 获胜模型: {winner.model_name} -->
<!-- 获胜加权得分: {scores.get(winner.response_id, 0.0):.4f} -->
<!-- 参与模型得分: {", ".join(f"{a.model_name}={scores.get(a.response_id, 0.0):.3f}" for a in ranked)} -->
<!-- 获胜模型优点: {", ".join(winner.strengths) if winner.strengths else "无"} -->
"""
        return metadata

    def fuse(
        self,
        responses: list[ModelResponse],
        assessments: list[AssessmentResult] | None = None,
    ) -> str:
        """
        执行 LLM-as-a-Judge 融合

        Args:
            responses: 多个模型的原始响应
            assessments: 预计算的评估结果，若为 None 则使用内置 assessor 评估

        Returns:
            融合后的最佳响应文本（含元数据注释）
        """
        if not responses:
            return ""

        if len(responses) == 1:
            return responses[0].output

        # 获取评估结果
        if assessments is None:
            if self.assessor is None:
                raise ValueError("未提供 assessments 且未初始化 assessor")
            assessments = self.assessor.assess(responses)

        # 确保 assessment 和 response 一一对应
        if len(assessments) != len(responses):
            raise ValueError("assessments 和 responses 数量不匹配")

        # 确定权重
        weights = (
            self._get_task_type_weights(responses)
            if self.adaptive_weights
            else self.weights.to_dict()
        )

        # 计算加权得分
        scores: dict[str, float] = {}
        for assessment in assessments:
            scores[assessment.response_id] = self._compute_weighted_score(
                assessment, weights
            )

        # 分数校准
        scores = self._calibrate_scores(scores, assessments)

        # 记录历史
        self._calibration_history.append({
            "weights": weights.copy(),
            "scores": scores.copy(),
        })

        # 选择冠军（按索引对齐）
        winner_index = max(
            range(len(assessments)),
            key=lambda i: scores.get(assessments[i].response_id, 0.0),
        )
        winner = assessments[winner_index]
        winner_output = responses[winner_index].output

        # 构建元数据
        metadata = self._build_fusion_metadata(winner, assessments, scores)

        return winner_output + metadata

    def get_score_history(self) -> list[dict]:
        """获取历史评分记录"""
        return self._calibration_history.copy()

    def set_weights(self, weights: JudgeWeights) -> None:
        """手动设置评判权重"""
        self.weights = weights
