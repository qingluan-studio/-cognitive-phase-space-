"""
认知融合引擎 (Cognitive Fusion Engine)

目标：提取多个模型的推理优点，合成一个全新模型。

核心思想：
1. 多模型并行采集 → 构建响应多样性池
2. 质量评估标注 → 识别每个响应的优点维度
3. 融合算法 → 从多个响应中合成最优输出
4. 数据合成 → 将融合结果转化为训练数据
5. 自举训练 → 用合成数据训练新一代模型

作者: Qingluan Studio
版本: 1.0.0
"""

from fusion_engine.core.fusion_engine import FusionEngine
from fusion_engine.core.model_collector import ModelCollector, ModelResponse
from fusion_engine.core.quality_assessor import QualityAssessor, QualityDimensions
from fusion_engine.fusion.majority_vote import MajorityVoteFusion
from fusion_engine.fusion.judge_fusion import LLMJudgeFusion
from fusion_engine.fusion.best_of_n import BestOfNFusion
from fusion_engine.fusion.evolutionary_fusion import EvolutionaryFusion
from fusion_engine.data.synthetic_generator import SyntheticDataGenerator
from fusion_engine.data.bootstrap_dataset import BootstrapDataset

__all__ = [
    "FusionEngine",
    "ModelCollector",
    "ModelResponse",
    "QualityAssessor",
    "QualityDimensions",
    "MajorityVoteFusion",
    "LLMJudgeFusion",
    "BestOfNFusion",
    "EvolutionaryFusion",
    "SyntheticDataGenerator",
    "BootstrapDataset",
]
