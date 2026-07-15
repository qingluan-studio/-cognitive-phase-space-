"""
自举数据集管理

管理多轮迭代中生成的合成数据，
支持数据去重、质量过滤、版本管理和增量更新。
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from typing import Any

from ..core.quality_assessor import AssessmentResult


@dataclass
class DatasetVersion:
    """数据集版本信息"""

    version_id: str
    timestamp: float
    sample_count: int
    description: str = ""
    parent_version: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "version_id": self.version_id,
            "timestamp": self.timestamp,
            "sample_count": self.sample_count,
            "description": self.description,
            "parent_version": self.parent_version,
        }


@dataclass
class DataRecord:
    """单条数据记录"""

    record_id: str
    data_type: str  # "sft" 或 "dpo"
    content: dict[str, Any]
    quality_score: float
    iteration: int
    source_models: list[str] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)

    def compute_hash(self) -> str:
        """计算内容哈希用于去重"""
        # 对关键字段进行哈希
        if self.data_type == "sft":
            key_fields = {
                "instruction": self.content.get("instruction", ""),
                "output": self.content.get("output", ""),
            }
        elif self.data_type == "dpo":
            key_fields = {
                "prompt": self.content.get("prompt", ""),
                "chosen": self.content.get("chosen", ""),
            }
        else:
            key_fields = self.content

        canonical = json.dumps(key_fields, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]


class BootstrapDataset:
    """
    自举数据集管理器

    功能：
    1. 多轮迭代数据的收集与存储
    2. 基于内容哈希的去重
    3. 按质量分数的过滤与保留
    4. 版本快照与回滚
    5. 增量导出与合并
    """

    def __init__(
        self,
        name: str = "bootstrap_dataset",
        min_quality_threshold: float = 0.65,
        dedup_enabled: bool = True,
    ):
        self.name = name
        self.min_quality_threshold = min_quality_threshold
        self.dedup_enabled = dedup_enabled

        self._records: list[DataRecord] = []
        self._hash_index: set[str] = set()
        self._versions: list[DatasetVersion] = []
        self._iteration_counter: int = 0

        # 质量分布统计
        self._quality_histogram: dict[str, list[float]] = {"sft": [], "dpo": []}

    def start_new_iteration(self, description: str = "") -> int:
        """开始新一轮数据收集"""
        self._iteration_counter += 1
        if description:
            self._create_version(
                f"iteration_{self._iteration_counter}_start", description
            )
        return self._iteration_counter

    def _create_version(self, version_id: str, description: str = "") -> DatasetVersion:
        """创建版本快照"""
        version = DatasetVersion(
            version_id=version_id,
            timestamp=time.time(),
            sample_count=len(self._records),
            description=description,
            parent_version=self._versions[-1].version_id if self._versions else None,
        )
        self._versions.append(version)
        return version

    def _compute_record_hash(self, record: DataRecord) -> str:
        """计算记录哈希"""
        return record.compute_hash()

    def add_record(self, record: DataRecord) -> bool:
        """
        添加单条数据记录

        Returns:
            True 表示添加成功，False 表示因重复或质量不足被过滤
        """
        # 质量过滤
        if record.quality_score < self.min_quality_threshold:
            return False

        # 去重检查
        if self.dedup_enabled:
            content_hash = self._compute_record_hash(record)
            if content_hash in self._hash_index:
                return False
            self._hash_index.add(content_hash)

        self._records.append(record)
        self._quality_histogram[record.data_type].append(record.quality_score)
        return True

    def add_batch(
        self,
        records: list[DataRecord],
    ) -> tuple[int, int]:
        """
        批量添加记录

        Returns:
            (成功数量, 被过滤数量)
        """
        accepted = 0
        rejected = 0

        for record in records:
            if self.add_record(record):
                accepted += 1
            else:
                rejected += 1

        return accepted, rejected

    def filter_by_quality(self, min_score: float | None = None) -> list[DataRecord]:
        """
        按质量分数过滤记录

        Args:
            min_score: 最低质量分数，None 则使用默认值

        Returns:
            满足条件的记录列表
        """
        threshold = min_score if min_score is not None else self.min_quality_threshold
        return [r for r in self._records if r.quality_score >= threshold]

    def filter_by_iteration(self, iteration: int) -> list[DataRecord]:
        """获取指定迭代轮次的记录"""
        return [r for r in self._records if r.iteration == iteration]

    def get_top_k(self, k: int, data_type: str | None = None) -> list[DataRecord]:
        """
        获取质量最高的 K 条记录

        Args:
            k: 返回数量
            data_type: 可选过滤数据类型

        Returns:
            排序后的记录列表
        """
        candidates = self._records
        if data_type:
            candidates = [r for r in candidates if r.data_type == data_type]

        sorted_records = sorted(
            candidates, key=lambda r: r.quality_score, reverse=True
        )
        return sorted_records[:k]

    def deduplicate(self) -> int:
        """
        显式执行全局去重

        Returns:
            移除的重复记录数量
        """
        if not self.dedup_enabled:
            return 0

        seen: set[str] = set()
        unique_records: list[DataRecord] = []
        removed = 0

        for record in self._records:
            h = self._compute_record_hash(record)
            if h in seen:
                removed += 1
                continue
            seen.add(h)
            unique_records.append(record)

        self._records = unique_records
        self._hash_index = seen
        return removed

    def merge_dataset(self, other: BootstrapDataset) -> tuple[int, int]:
        """
        合并另一个数据集

        Returns:
            (成功导入数量, 被过滤数量)
        """
        return self.add_batch(other._records)

    def create_version_snapshot(self, description: str = "") -> DatasetVersion:
        """创建当前状态的版本快照"""
        version_id = f"v{len(self._versions)}_{int(time.time())}"
        return self._create_version(version_id, description)

    def get_versions(self) -> list[DatasetVersion]:
        """获取所有版本历史"""
        return self._versions.copy()

    def get_statistics(self) -> dict[str, Any]:
        """获取数据集统计信息"""
        total_sft = sum(1 for r in self._records if r.data_type == "sft")
        total_dpo = sum(1 for r in self._records if r.data_type == "dpo")

        sft_scores = self._quality_histogram.get("sft", [])
        dpo_scores = self._quality_histogram.get("dpo", [])

        stats = {
            "dataset_name": self.name,
            "total_records": len(self._records),
            "total_sft": total_sft,
            "total_dpo": total_dpo,
            "current_iteration": self._iteration_counter,
            "version_count": len(self._versions),
            "min_quality_threshold": self.min_quality_threshold,
        }

        if sft_scores:
            stats["sft_quality"] = {
                "mean": sum(sft_scores) / len(sft_scores),
                "max": max(sft_scores),
                "min": min(sft_scores),
            }

        if dpo_scores:
            stats["dpo_quality"] = {
                "mean": sum(dpo_scores) / len(dpo_scores),
                "max": max(dpo_scores),
                "min": min(dpo_scores),
            }

        return stats

    def export_to_dict(self, data_type: str | None = None) -> list[dict[str, Any]]:
        """导出为字典列表"""
        records = self._records
        if data_type:
            records = [r for r in records if r.data_type == data_type]
        return [r.content for r in records]

    def export_jsonl(self, filepath: str, data_type: str | None = None) -> None:
        """导出为 JSONL 文件"""
        with open(filepath, "w", encoding="utf-8") as f:
            for record in self._records:
                if data_type and record.data_type != data_type:
                    continue
                f.write(json.dumps(record.content, ensure_ascii=False) + "\n")

    def reset(self) -> None:
        """重置数据集"""
        self._records.clear()
        self._hash_index.clear()
        self._versions.clear()
        self._iteration_counter = 0
        self._quality_histogram = {"sft": [], "dpo": []}
