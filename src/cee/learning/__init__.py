"""CEE Learning — Auto-learning, feedback analysis, and hyper-parameter optimization.

Provides:
- FeedbackStore: User and system feedback collection with sentiment analysis
- AutoLearner: Pattern discovery and insight generation from historical data
- HyperOptimizer: Grid search and simulated annealing for parameter tuning
- ModelSnapshot: Parameter versioning for rollback
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

__all__ = [
    "AutoLearner",
    "FeedbackStore",
    "FeedbackRecord",
    "FeedbackSentiment",
    "FeedbackType",
    "HyperOptimizer",
    "LearningInsight",
    "ModelSnapshot",
]
