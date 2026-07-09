"""
Cognitive Emergence Engine (CEE)
================================

认知涌现引擎 — 自我宪法、可追溯决策、可传承思想、可更替治理、可永续迭代

六大引擎:
  T1 - Project Mirror:     认知同构
  T2 - Project Prism:      超图坍缩
  T3 - Project Geodesic:   测地线导航
  T4 - Project Crystallization: 知识结晶
  T5 - Project Genesis:    反事实生长
  T6 - Project Invariant:  认知几何不变量

Usage:
  from cee import InvariantEngine
  engine = InvariantEngine()
  scores = engine.evaluate("your text here")
  print(scores.composite)  # 综合评分
"""

from cee.core.types import (
    InvariantScores,
    QualityTier,
    OptimizationPath,
    TextArtifact,
    OptimizationResult,
    EvaluationReport,
    DecisionRecord,
    GovernanceConfig,
    EngineStatus,
)

from cee.engine.t6_invariant import InvariantEngine, InvariantTheoretical
from cee.engine.t1_mirror import CognitiveIsomorphismEngine
from cee.engine.t2_prism import HyperGraphCollapseEngine
from cee.engine.t3_geodesic import GeodesicNavigationEngine
from cee.engine.t4_crystallization import CrystallizationEngine
from cee.engine.t5_genesis import GenesisEngine
from cee.core.controller import ClosedLoopController
from cee.sdk.client import CEEClient, CEEConfig

from cee.governance.adversarial import (
    AdversarialGovernance,
    DeviationDetector,
    AdversarialGameEngine,
    RoleRotationManager,
    ArbitrationSystem,
    AdversarialSafeMode,
    PrecedentStore,
    AgentRole,
    DeviationType,
    ArbitrationLevel,
    GameState,
    ExplorationVerdict,
    DeviationReport,
    InnovationReport,
    ArbitrationResult,
    GameRound,
)

__version__ = "1.1.0"
__all__ = [
    "InvariantEngine",
    "InvariantTheoretical",
    "CognitiveIsomorphismEngine",
    "HyperGraphCollapseEngine",
    "GeodesicNavigationEngine",
    "CrystallizationEngine",
    "GenesisEngine",
    "ClosedLoopController",
    "CEEClient",
    "CEEConfig",
    "InvariantScores",
    "QualityTier",
    "OptimizationPath",
    "TextArtifact",
    "OptimizationResult",
    "EvaluationReport",
    "DecisionRecord",
    "GovernanceConfig",
    "EngineStatus",
    "AdversarialGovernance",
    "DeviationDetector",
    "AdversarialGameEngine",
    "RoleRotationManager",
    "ArbitrationSystem",
    "AdversarialSafeMode",
    "PrecedentStore",
    "AgentRole",
    "DeviationType",
    "ArbitrationLevel",
    "GameState",
    "ExplorationVerdict",
    "DeviationReport",
    "InnovationReport",
    "ArbitrationResult",
    "GameRound",
]
