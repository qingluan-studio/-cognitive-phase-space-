"""
相空间视频融合引擎 (Phase Space Video Fusion Engine)

核心思想：
1. 不在像素空间生成视频，而在相空间中生成连续轨迹
2. 六大领域专家各自提出轨迹假设
3. 物理专家（水逻辑）拥有否决权——违反守恒定律的轨迹被驳回
4. 吸引子锁定物体身份，保证时序一致性
5. T6-Video 评估器从6个维度检查融合轨迹的质量

作者: Qingluan Studio
灵感来源: 认知相空间中端 + 融合引擎 + 水逻辑
"""

from .trajectory import (
    TrajectoryPoint,
    VideoTrajectory,
    AttractorLandscape,
    PhaseSpaceState,
    ObjectIdentity,
)

from .experts import (
    BaseExpert,
    PhysicsExpert,
    TextureExpert,
    OpticalFlowExpert,
    DepthExpert,
    AestheticExpert,
    TemporalExpert,
    EXPERT_REGISTRY,
)

from .phase_space_fusion import (
    PhaseSpaceFusionEngine,
    FusionConfig,
    FusionResult,
)

from .water_logic import (
    WaterLogicVeto,
    ConservationLaw,
    PhysicsViolation,
)

from .quality_t6 import (
    T6VideoAssessor,
    VideoQualityDimensions,
    VideoAssessmentResult,
)

__all__ = [
    # Data structures
    "TrajectoryPoint",
    "VideoTrajectory",
    "AttractorBasin",
    "PhaseSpaceState",
    "ObjectIdentity",
    # Experts
    "BaseExpert",
    "PhysicsExpert",
    "TextureExpert",
    "OpticalFlowExpert",
    "DepthExpert",
    "AestheticExpert",
    "TemporalExpert",
    "EXPERT_REGISTRY",
    # Fusion engine
    "PhaseSpaceFusionEngine",
    "FusionConfig",
    "FusionResult",
    # Water logic
    "WaterLogicVeto",
    "ConservationLaw",
    "PhysicsViolation",
    # Quality assessment
    "T6VideoAssessor",
    "VideoQualityDimensions",
    "VideoAssessmentResult",
]
