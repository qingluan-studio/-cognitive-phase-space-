"""
质量评估器 (LLM-as-a-Judge)

对多个模型的响应进行多维度质量评估，
识别每个响应的优点和缺点。
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .model_collector import ModelResponse


@dataclass
class QualityDimensions:
    """质量维度评分"""
    correctness: float = 0.0      # 正确性
    coherence: float = 0.0        # 连贯性
    completeness: float = 0.0     # 完整性
    creativity: float = 0.0       # 创造性
    efficiency: float = 0.0       # 效率（是否简洁）
    depth: float = 0.0            # 深度
    factuality: float = 0.0       # 事实准确性
    reasoning: float = 0.0        # 推理质量
    overall: float = 0.0          # 综合评分
    
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
            "overall": self.overall,
        }


@dataclass
class AssessmentResult:
    """评估结果"""
    response_id: str
    model_name: str
    dimensions: QualityDimensions
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    comparison_notes: str = ""


class QualityAssessor:
    """
    质量评估器
    
    模拟 LLM-as-a-Judge 的工作流程：
    1. 接收多个模型的响应
    2. 从多个维度评估每个响应
    3. 识别每个响应的独特优点
    4. 输出结构化评估结果
    """
    
    def __init__(self, mode: str = "simulation"):
        self.mode = mode
        self._judge_profiles = {
            "primary_judge": {
                "reasoning_bias": 0.85,
                "coding_bias": 0.82,
                "math_bias": 0.88,
                "creative_bias": 0.80,
                "factual_bias": 0.86,
            },
            "secondary_judge": {
                "reasoning_bias": 0.83,
                "coding_bias": 0.85,
                "math_bias": 0.85,
                "creative_bias": 0.82,
                "factual_bias": 0.84,
            },
        }
    
    def _simulate_assessment(self, response: "ModelResponse") -> QualityDimensions:
        """模拟质量评估"""
        base_quality = response.metadata.get("quality_score", 0.75)
        is_specialty = response.metadata.get("specialty_match", False)
        
        # 特长加成
        specialty_boost = 0.08 if is_specialty else 0.0
        
        # 基础分数（围绕 base_quality 波动）
        def dim_score(base: float, variance: float = 0.06) -> float:
            return max(0.0, min(1.0, base + random.gauss(0, variance)))
        
        # 根据任务类型调整维度权重
        from .model_collector import ModelCapability
        task_types = response.capabilities
        
        dims = QualityDimensions()
        
        # 通用维度
        dims.correctness = dim_score(base_quality + specialty_boost)
        dims.coherence = dim_score(base_quality + 0.02)
        dims.completeness = dim_score(base_quality + specialty_boost * 0.5)
        
        # 任务特定维度
        if ModelCapability.CREATIVITY in task_types:
            dims.creativity = dim_score(base_quality + specialty_boost + 0.05)
        else:
            dims.creativity = dim_score(base_quality - 0.05)
        
        if ModelCapability.CODING in task_types or ModelCapability.MATH in task_types:
            dims.efficiency = dim_score(base_quality + 0.03)
            dims.depth = dim_score(base_quality + specialty_boost)
            dims.reasoning = dim_score(base_quality + specialty_boost + 0.03)
        else:
            dims.efficiency = dim_score(base_quality)
            dims.depth = dim_score(base_quality + specialty_boost * 0.5)
            dims.reasoning = dim_score(base_quality)
        
        if ModelCapability.FACTUAL in task_types:
            dims.factuality = dim_score(base_quality + specialty_boost + 0.05)
        else:
            dims.factuality = dim_score(base_quality)
        
        # 综合评分 = 加权平均
        weights = {
            "correctness": 0.20,
            "coherence": 0.10,
            "completeness": 0.15,
            "creativity": 0.10,
            "efficiency": 0.10,
            "depth": 0.15,
            "factuality": 0.10,
            "reasoning": 0.10,
        }
        
        dims.overall = (
            dims.correctness * weights["correctness"] +
            dims.coherence * weights["coherence"] +
            dims.completeness * weights["completeness"] +
            dims.creativity * weights["creativity"] +
            dims.efficiency * weights["efficiency"] +
            dims.depth * weights["depth"] +
            dims.factuality * weights["factuality"] +
            dims.reasoning * weights["reasoning"]
        )
        
        return dims
    
    def _generate_strengths(self, response: "ModelResponse", dims: QualityDimensions) -> list[str]:
        """生成优点列表"""
        strengths = []
        
        if dims.correctness > 0.85:
            strengths.append("答案高度准确，逻辑严密")
        if dims.creativity > 0.85:
            strengths.append("创意独特，视角新颖")
        if dims.depth > 0.85:
            strengths.append("分析深入，触及本质")
        if dims.efficiency > 0.85:
            strengths.append("表达简洁，直击要点")
        if dims.factuality > 0.85:
            strengths.append("事实准确，引用可靠")
        if dims.reasoning > 0.85:
            strengths.append("推理链条完整，论证有力")
        if dims.completeness > 0.85:
            strengths.append("覆盖全面，没有遗漏")
        
        if not strengths and dims.overall > 0.75:
            strengths.append("整体表现均衡，无明显短板")
        
        return strengths
    
    def _generate_weaknesses(self, response: "ModelResponse", dims: QualityDimensions) -> list[str]:
        """生成缺点列表"""
        weaknesses = []
        
        if dims.correctness < 0.70:
            weaknesses.append("存在事实或逻辑错误")
        if dims.creativity < 0.60:
            weaknesses.append("缺乏创新，过于常规")
        if dims.depth < 0.65:
            weaknesses.append("分析表面，未触及深层")
        if dims.efficiency < 0.60:
            weaknesses.append("冗长啰嗦，重点不突出")
        if dims.factuality < 0.70:
            weaknesses.append("事实依据不足")
        if dims.reasoning < 0.70:
            weaknesses.append("推理有跳跃，不够严谨")
        if dims.completeness < 0.65:
            weaknesses.append("遗漏重要方面")
        
        return weaknesses
    
    def assess(self, responses: list["ModelResponse"]) -> list[AssessmentResult]:
        """
        评估多个响应
        
        Returns:
            每个响应的评估结果列表
        """
        results = []
        
        for i, response in enumerate(responses):
            dims = self._simulate_assessment(response)
            strengths = self._generate_strengths(response, dims)
            weaknesses = self._generate_weaknesses(response, dims)
            
            result = AssessmentResult(
                response_id=f"resp_{i}",
                model_name=response.model_name,
                dimensions=dims,
                strengths=strengths,
                weaknesses=weaknesses,
            )
            results.append(result)
        
        # 生成对比注释
        if len(results) > 1:
            self._generate_comparison(results)
        
        return results
    
    def _generate_comparison(self, results: list[AssessmentResult]) -> None:
        """生成模型间对比注释"""
        # 找出每个维度的最佳模型
        best_by_dim = {}
        for dim_name in ["correctness", "coherence", "completeness", "creativity", 
                         "efficiency", "depth", "factuality", "reasoning", "overall"]:
            best = max(results, key=lambda r: getattr(r.dimensions, dim_name))
            best_by_dim[dim_name] = best.model_name
        
        # 为每个结果添加对比注释
        for result in results:
            notes = []
            for dim, best_model in best_by_dim.items():
                if best_model == result.model_name:
                    notes.append(f"在'{dim}'维度表现最佳")
            if notes:
                result.comparison_notes = "; ".join(notes[:3])
    
    def rank_responses(self, results: list[AssessmentResult]) -> list[AssessmentResult]:
        """按综合质量排序"""
        return sorted(results, key=lambda r: r.dimensions.overall, reverse=True)
    
    def select_best(self, results: list[AssessmentResult]) -> AssessmentResult | None:
        """选择最佳响应"""
        if not results:
            return None
        return max(results, key=lambda r: r.dimensions.overall)
    
    def get_dimension_leaders(self, results: list[AssessmentResult]) -> dict[str, str]:
        """获取每个维度的领先模型"""
        leaders = {}
        for dim_name in ["correctness", "coherence", "completeness", "creativity",
                         "efficiency", "depth", "factuality", "reasoning", "overall"]:
            best = max(results, key=lambda r: getattr(r.dimensions, dim_name))
            leaders[dim_name] = best.model_name
        return leaders
