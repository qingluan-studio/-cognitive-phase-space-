"""
融合策略模块

提供多种认知融合算法实现。
"""

from .best_of_n import BestOfNFusion, SelectionStrategy
from .evolutionary_fusion import EvolutionaryFusion
from .judge_fusion import JudgeWeights, LLMJudgeFusion
from .majority_vote import MajorityVoteFusion

__all__ = [
    "BestOfNFusion",
    "EvolutionaryFusion",
    "JudgeWeights",
    "LLMJudgeFusion",
    "MajorityVoteFusion",
    "SelectionStrategy",
]
