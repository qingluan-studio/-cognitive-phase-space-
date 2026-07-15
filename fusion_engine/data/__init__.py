"""
数据合成与管理模块

提供合成数据生成、自举数据集管理等功能。
"""

from .bootstrap_dataset import BootstrapDataset, DataRecord, DatasetVersion
from .synthetic_generator import (
    DPOSample,
    GenerationConfig,
    SFTSample,
    SyntheticDataGenerator,
)

__all__ = [
    "BootstrapDataset",
    "DataRecord",
    "DatasetVersion",
    "DPOSample",
    "GenerationConfig",
    "SFTSample",
    "SyntheticDataGenerator",
]
