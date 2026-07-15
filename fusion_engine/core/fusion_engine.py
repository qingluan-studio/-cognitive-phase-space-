"""
认知融合引擎主控制器

协调所有组件，完成"多模型采集 → 质量评估 → 融合输出 → 数据合成"的完整流程。
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from typing import Any

from .model_collector import ModelCapability, ModelCollector, ModelResponse
from .quality_assessor import AssessmentResult, QualityAssessor


@dataclass
class FusionConfig:
    """融合引擎配置"""
    # 模型选择
    model_names: list[str] | None = None  # None = 所有模型
    
    # 融合策略
    fusion_strategy: str = "judge"  # "majority_vote", "judge", "best_of_n", "evolutionary"
    
    # 质量阈值
    min_quality_threshold: float = 0.6
    
    # 成本限制
    max_cost: float = 10.0  # 相对成本单位
    
    # 超时设置
    timeout_ms: float = 10000.0
    
    # 数据合成
    generate_training_data: bool = False
    
    # 元数据
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class FusionResult:
    """融合结果"""
    prompt: str
    fused_output: str
    strategy_used: str
    responses: list[ModelResponse]
    assessments: list[AssessmentResult]
    
    # 统计信息
    total_latency_ms: float
    total_cost: float
    model_count: int
    
    # 质量报告
    quality_report: dict[str, Any] = field(default_factory=dict)
    
    # 训练数据（如果生成）
    training_data: dict[str, Any] | None = None
    
    # 时间戳
    timestamp: float = field(default_factory=time.time)
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "prompt": self.prompt,
            "fused_output": self.fused_output,
            "strategy_used": self.strategy_used,
            "total_latency_ms": self.total_latency_ms,
            "total_cost": self.total_cost,
            "model_count": self.model_count,
            "quality_report": self.quality_report,
            "timestamp": self.timestamp,
        }
    
    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)


class FusionEngine:
    """
    认知融合引擎
    
    使用示例：
        engine = FusionEngine()
        config = FusionConfig(
            fusion_strategy="judge",
            model_names=["DeepSeek-V4-Pro", "GLM-5.2", "Kimi-K2.6"],
        )
        result = engine.fuse("写一首关于量子纠缠的诗", config)
        print(result.fused_output)
    """
    
    def __init__(self, mode: str = "simulation"):
        self.mode = mode
        self.collector = ModelCollector(mode=mode)
        self.assessor = QualityAssessor(mode=mode)
        self._fusion_strategies: dict[str, Any] = {}
        self._init_strategies()
    
    def _init_strategies(self) -> None:
        """初始化融合策略"""
        from ..fusion.majority_vote import MajorityVoteFusion
        from ..fusion.judge_fusion import LLMJudgeFusion
        from ..fusion.best_of_n import BestOfNFusion
        from ..fusion.evolutionary_fusion import EvolutionaryFusion
        
        self._fusion_strategies = {
            "majority_vote": MajorityVoteFusion(),
            "judge": LLMJudgeFusion(self.assessor),
            "best_of_n": BestOfNFusion(),
            "evolutionary": EvolutionaryFusion(),
        }
    
    def fuse(self, prompt: str, config: FusionConfig | None = None) -> FusionResult:
        """
        执行完整的融合流程
        
        Args:
            prompt: 用户输入
            config: 融合配置
            
        Returns:
            FusionResult 包含融合结果和元数据
        """
        if config is None:
            config = FusionConfig()
        
        start_time = time.time()
        
        # Phase 1: 收集响应
        responses = self.collector.collect(prompt, config.model_names)
        
        # Phase 2: 质量评估
        assessments = self.assessor.assess(responses)
        
        # Phase 3: 融合输出
        strategy = self._fusion_strategies.get(config.fusion_strategy)
        if strategy is None:
            raise ValueError(f"未知的融合策略: {config.fusion_strategy}")
        
        fused_output = strategy.fuse(responses, assessments)
        
        # 计算统计信息
        total_latency = max(r.latency_ms for r in responses)
        total_cost = sum(
            self.collector.profiles[r.model_name].cost_factor if r.model_name in self.collector.profiles else 1.0
            for r in responses
        )
        
        # 生成质量报告
        quality_report = self._generate_quality_report(responses, assessments)
        
        # Phase 4: 数据合成（可选）
        training_data = None
        if config.generate_training_data:
            training_data = self._generate_training_data(prompt, fused_output, responses, assessments)
        
        return FusionResult(
            prompt=prompt,
            fused_output=fused_output,
            strategy_used=config.fusion_strategy,
            responses=responses,
            assessments=assessments,
            total_latency_ms=total_latency,
            total_cost=total_cost,
            model_count=len(responses),
            quality_report=quality_report,
            training_data=training_data,
        )
    
    def _generate_quality_report(self, responses: list[ModelResponse], assessments: list[AssessmentResult]) -> dict:
        """生成质量报告"""
        ranked = self.assessor.rank_responses(assessments)
        dim_leaders = self.assessor.get_dimension_leaders(assessments)
        
        return {
            "top_model": ranked[0].model_name if ranked else None,
            "top_score": ranked[0].dimensions.overall if ranked else 0.0,
            "average_score": sum(a.dimensions.overall for a in assessments) / len(assessments) if assessments else 0.0,
            "dimension_leaders": dim_leaders,
            "model_scores": {
                a.model_name: {
                    "overall": round(a.dimensions.overall, 3),
                    "strengths": a.strengths,
                    "weaknesses": a.weaknesses,
                }
                for a in assessments
            },
        }
    
    def _generate_training_data(self, prompt: str, fused_output: str, responses: list[ModelResponse], assessments: list[AssessmentResult]) -> dict:
        """生成训练数据"""
        # SFT 格式
        sft_data = {
            "instruction": prompt,
            "input": "",
            "output": fused_output,
            "metadata": {
                "source": "cognitive_fusion_engine",
                "fusion_strategy": "judge",
                "model_count": len(assessments),
            },
        }
        
        # DPO 格式 (选择最佳和最差的作为偏好对)
        ranked = self.assessor.rank_responses(assessments)
        if len(ranked) >= 2:
            best = ranked[0]
            worst = ranked[-1]
            dpo_data = {
                "prompt": prompt,
                "chosen": next(r.output for r in responses if r.model_name == best.model_name),
                "rejected": next(r.output for r in responses if r.model_name == worst.model_name),
                "metadata": {
                    "chosen_model": best.model_name,
                    "rejected_model": worst.model_name,
                    "score_diff": best.dimensions.overall - worst.dimensions.overall,
                },
            }
        else:
            dpo_data = None
        
        return {
            "sft": sft_data,
            "dpo": dpo_data,
        }
    
    def get_available_strategies(self) -> list[str]:
        """获取可用的融合策略列表"""
        return list(self._fusion_strategies.keys())
    
    def get_model_list(self) -> list[str]:
        """获取可用的模型列表"""
        return list(self.collector.profiles.keys())
    
    def benchmark_strategies(self, test_prompts: list[str]) -> dict[str, Any]:
        """
        基准测试：对比不同融合策略的效果
        
        Returns:
            各策略的统计数据
        """
        results = {name: [] for name in self._fusion_strategies.keys()}
        
        for prompt in test_prompts:
            for strategy_name in self._fusion_strategies:
                config = FusionConfig(fusion_strategy=strategy_name)
                result = self.fuse(prompt, config)
                results[strategy_name].append({
                    "latency": result.total_latency_ms,
                    "cost": result.total_cost,
                    "top_score": result.quality_report.get("top_score", 0),
                    "avg_score": result.quality_report.get("average_score", 0),
                })
        
        # 汇总统计
        summary = {}
        for strategy_name, data in results.items():
            if not data:
                continue
            summary[strategy_name] = {
                "avg_latency": sum(d["latency"] for d in data) / len(data),
                "avg_cost": sum(d["cost"] for d in data) / len(data),
                "avg_top_score": sum(d["top_score"] for d in data) / len(data),
                "avg_avg_score": sum(d["avg_score"] for d in data) / len(data),
            }
        
        return summary
