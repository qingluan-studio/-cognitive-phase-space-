"""
CEE — Cognitive Emergence Engine
=================================

认知涌现引擎核心类型系统

四大不变量:
  ITC  - Information Topological Compactness   (信息拓扑紧致性)
  SCS  - Surface Curvature Smoothness          (曲率平滑度)
  IEC  - Information Entropy Criticality       (信息熵临界性)
  PFFT - Projection Fidelity-Flexibility Tradeoff (投影权衡)
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any

# ═══════════════════════════════════════════════════════════════════
# 枚举
# ═══════════════════════════════════════════════════════════════════


class OptimizationPath(Enum):
    """优化路径选择"""
    T1_COGNITIVE_ISOMORPHISM = "t1_mirror"
    T2_HYPERGRAPH_COLLAPSE = "t2_prism"
    T3_GEODESIC_NAVIGATION = "t3_geodesic"
    T4_CRYSTALLIZATION = "t4_crystal"
    T5_COUNTERFACTUAL_GROWTH = "t5_genesis"


class QualityTier(Enum):
    """质量等级"""
    CRITICAL = "critical"   # < 0.3
    POOR = "poor"           # 0.3 - 0.5
    FAIR = "fair"           # 0.5 - 0.7
    GOOD = "good"           # 0.7 - 0.85
    EXCELLENT = "excellent" # 0.85 - 0.95
    EXCEPTIONAL = "exceptional"  # > 0.95


class EngineStatus(Enum):
    READY = "ready"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ═══════════════════════════════════════════════════════════════════
# 数据结构
# ═══════════════════════════════════════════════════════════════════


@dataclass
class InvariantScores:
    """四大不变量评分"""
    itc: float   # 信息拓扑紧致性 [0, 1]
    scs: float   # 曲率平滑度 [0, 1]
    iec: float   # 信息熵临界性 [0, 1]
    pfft: float  # 投影权衡 [0, 1]

    @property
    def composite(self) -> float:
        """综合评分: 四维等权平均"""
        return (self.itc + self.scs + self.iec + self.pfft) / 4.0

    @property
    def tier(self) -> QualityTier:
        s = self.composite
        if s < 0.3:
            return QualityTier.CRITICAL
        if s < 0.5:
            return QualityTier.POOR
        if s < 0.7:
            return QualityTier.FAIR
        if s < 0.85:
            return QualityTier.GOOD
        if s < 0.95:
            return QualityTier.EXCELLENT
        return QualityTier.EXCEPTIONAL

    def to_dict(self) -> dict[str, float]:
        return {
            "itc": round(self.itc, 4),
            "scs": round(self.scs, 4),
            "iec": round(self.iec, 4),
            "pfft": round(self.pfft, 4),
            "composite": round(self.composite, 4),
            "tier": self.tier.value,
        }


@dataclass
class TextArtifact:
    """文本认知产物"""
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)
    scores: InvariantScores | None = None


@dataclass
class OptimizationResult:
    """优化结果"""
    original: TextArtifact
    optimized: TextArtifact
    path_used: OptimizationPath
    score_delta: float       # 优化前后综合评分差值
    iterations: int          # 迭代次数
    convergence: bool        # 是否收敛


@dataclass
class EvaluationReport:
    """评估报告"""
    artifact: TextArtifact
    scores: InvariantScores
    breakdown: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)


@dataclass
class DecisionRecord:
    """决策日志"""
    id: str
    timestamp: str
    context: str
    options: list[str]
    chosen: str
    rationale: str
    vetoed: list[str] = field(default_factory=list)


@dataclass
class GovernanceConfig:
    """治理配置"""
    constitution_version: str = "1.0.0"
    safe_mode_threshold: float = 0.3
    auto_optimize_threshold: float = 0.7
    max_optimization_iterations: int = 5
    convergence_epsilon: float = 0.01
    optimization_paths_enabled: list[OptimizationPath] = field(
        default_factory=lambda: list(OptimizationPath)
    )
