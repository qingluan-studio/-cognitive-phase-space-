"""CEE Learning — Auto-learning, feedback analysis, and hyper-parameter optimization.

Provides:
- FeedbackStore: User and system feedback collection with sentiment analysis
- AutoLearner: Pattern discovery and insight generation from historical data
- HyperOptimizer: Grid search and simulated annealing for parameter tuning
- ModelSnapshot: Parameter versioning for rollback
- MetaLearner: Learning-to-learn strategy optimization
- ReinforcementTuner: RL-based parameter tuning
- AnomalyDetector: Statistical anomaly detection
- KnowledgeDistiller: Teacher-to-student knowledge compression
- TransferAdapter: Domain adaptation for knowledge transfer
"""

from .auto_learner import (
    AutoLearner,
    FeedbackRecord,
    FeedbackSentiment,
    FeedbackStore,
    FeedbackType,
    HyperOptimizer,
    LearningInsight,
    ModelSnapshot,
)

from .advanced import (
    AnomalyDetector,
    KnowledgeDistiller,
    LearningStrategy,
    MetaLearner,
    MetaLearningProfile,
    ReinforcementTuner,
    TransferAdapter,
)

__all__ = [
    "AutoLearner",
    "FeedbackStore",
    "FeedbackRecord",
    "FeedbackSentiment",
    "FeedbackType",
    "HyperOptimizer",
    "LearningInsight",
    "ModelSnapshot",
    "MetaLearner",
    "MetaLearningProfile",
    "LearningStrategy",
    "ReinforcementTuner",
    "AnomalyDetector",
    "KnowledgeDistiller",
    "TransferAdapter",
]
