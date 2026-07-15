"""
合成数据生成器

将融合后的高质量响应转化为训练数据，
支持生成 SFT (监督微调) 和 DPO (直接偏好优化) 格式的数据集。
"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from ..core.model_collector import ModelResponse
from ..core.quality_assessor import AssessmentResult


@dataclass
class SFTSample:
    """SFT 训练样本"""

    id: str
    instruction: str
    input: str
    output: str
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "instruction": self.instruction,
            "input": self.input,
            "output": self.output,
            "metadata": self.metadata,
        }


@dataclass
class DPOSample:
    """DPO 训练样本"""

    id: str
    prompt: str
    chosen: str
    rejected: str
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "prompt": self.prompt,
            "chosen": self.chosen,
            "rejected": self.rejected,
            "metadata": self.metadata,
        }


@dataclass
class GenerationConfig:
    """生成配置"""

    min_quality_threshold: float = 0.70
    max_output_length: int = 8000
    include_system_prompt: bool = True
    system_prompt: str = "You are a helpful assistant."
    add_rejection_sampling_note: bool = True
    dpo_score_gap_threshold: float = 0.15  # 生成 DPO 对所需的最小质量差距


class SyntheticDataGenerator:
    """
    合成数据生成器

    功能：
    1. 将融合结果转换为标准 SFT 格式（instruction + input + output）
    2. 基于评估结果构造 DPO 偏好对（chosen vs rejected）
    3. 支持多轮对话格式转换（可选）
    4. 自动添加数据指纹和质量标签
    5. 批量导出为 JSONL / HuggingFace datasets 兼容格式
    """

    def __init__(self, config: GenerationConfig | None = None):
        self.config = config or GenerationConfig()
        self._generated_sft: list[SFTSample] = []
        self._generated_dpo: list[DPOSample] = []
        self._generation_log: list[dict] = []

    def _generate_id(self) -> str:
        """生成唯一样本 ID"""
        return f"cfs-{uuid.uuid4().hex[:12]}"

    def _filter_by_quality(
        self,
        fused_output: str,
        assessments: list[AssessmentResult],
    ) -> bool:
        """检查融合结果是否满足质量阈值"""
        if not assessments:
            return False

        best_score = max(a.dimensions.overall for a in assessments)
        return best_score >= self.config.min_quality_threshold

    def _truncate_if_needed(self, text: str) -> str:
        """截断超长输出"""
        if len(text) > self.config.max_output_length:
            # 尝试在句子边界截断
            truncated = text[: self.config.max_output_length]
            last_period = truncated.rfind("。")
            if last_period == -1:
                last_period = truncated.rfind(".")
            if last_period > 0:
                truncated = truncated[: last_period + 1]
            return truncated
        return text

    def generate_sft(
        self,
        prompt: str,
        fused_output: str,
        assessments: list[AssessmentResult],
        extra_metadata: dict[str, Any] | None = None,
    ) -> SFTSample | None:
        """
        生成 SFT 样本

        Args:
            prompt: 原始用户指令
            fused_output: 融合后的高质量输出
            assessments: 质量评估结果
            extra_metadata: 额外的元数据

        Returns:
            SFTSample 或 None（质量不达标时）
        """
        if not self._filter_by_quality(fused_output, assessments):
            return None

        output = self._truncate_if_needed(fused_output)

        metadata: dict[str, Any] = {
            "source": "cognitive_fusion_engine",
            "generation_timestamp": time.time(),
            "quality_score": max(a.dimensions.overall for a in assessments),
            "model_count": len(assessments),
            "fusion_strategy": "unknown",
        }

        if extra_metadata:
            metadata.update(extra_metadata)

        # 如果启用了 system prompt，以对话格式包装
        if self.config.include_system_prompt:
            messages = [
                {"role": "system", "content": self.config.system_prompt},
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": output},
            ]
            # 同时保留标准字段，并附加对话格式
            metadata["conversation_format"] = messages

        sample = SFTSample(
            id=self._generate_id(),
            instruction=prompt,
            input="",
            output=output,
            metadata=metadata,
        )

        self._generated_sft.append(sample)
        self._generation_log.append({
            "type": "sft",
            "sample_id": sample.id,
            "quality_score": metadata["quality_score"],
            "timestamp": metadata["generation_timestamp"],
        })

        return sample

    def generate_dpo(
        self,
        prompt: str,
        responses: list[ModelResponse],
        assessments: list[AssessmentResult],
        extra_metadata: dict[str, Any] | None = None,
    ) -> DPOSample | None:
        """
        生成 DPO 偏好对

        选择评估得分最高和最低的响应作为 chosen / rejected。

        Args:
            prompt: 原始用户指令
            responses: 模型原始响应列表
            assessments: 质量评估结果
            extra_metadata: 额外元数据

        Returns:
            DPOSample 或 None（样本不足或差距不够时）
        """
        if len(responses) < 2 or len(assessments) < 2:
            return None

        # 排序
        ranked = sorted(
            zip(responses, assessments),
            key=lambda ra: ra[1].dimensions.overall,
            reverse=True,
        )

        best_resp, best_assess = ranked[0]
        worst_resp, worst_assess = ranked[-1]

        score_gap = (
            best_assess.dimensions.overall - worst_assess.dimensions.overall
        )
        if score_gap < self.config.dpo_score_gap_threshold:
            # 差距不够大，不生成 DPO 对以避免噪声
            return None

        chosen = self._truncate_if_needed(best_resp.output)
        rejected = self._truncate_if_needed(worst_resp.output)

        metadata: dict[str, Any] = {
            "source": "cognitive_fusion_engine",
            "generation_timestamp": time.time(),
            "chosen_model": best_resp.model_name,
            "rejected_model": worst_resp.model_name,
            "chosen_score": best_assess.dimensions.overall,
            "rejected_score": worst_assess.dimensions.overall,
            "score_gap": score_gap,
            "chosen_strengths": best_assess.strengths,
            "rejected_weaknesses": worst_assess.weaknesses,
        }

        if extra_metadata:
            metadata.update(extra_metadata)

        # 可选：在 rejected 样本中添加拒采样注释，帮助模型理解为何被拒绝
        if self.config.add_rejection_sampling_note and worst_assess.weaknesses:
            note = (
                "\n\n<!-- 拒采样说明: 该响应因以下原因被标记为 rejected -->\n"
                + "\n".join(f"<!-- - {w} -->" for w in worst_assess.weaknesses)
            )
            rejected = rejected + note

        sample = DPOSample(
            id=self._generate_id(),
            prompt=prompt,
            chosen=chosen,
            rejected=rejected,
            metadata=metadata,
        )

        self._generated_dpo.append(sample)
        self._generation_log.append({
            "type": "dpo",
            "sample_id": sample.id,
            "score_gap": score_gap,
            "timestamp": metadata["generation_timestamp"],
        })

        return sample

    def generate_both(
        self,
        prompt: str,
        fused_output: str,
        responses: list[ModelResponse],
        assessments: list[AssessmentResult],
        fusion_strategy: str = "unknown",
    ) -> dict[str, Any]:
        """
        同时生成 SFT 和 DPO 样本

        Returns:
            包含 sft 和 dpo 的字典
        """
        extra_meta = {"fusion_strategy": fusion_strategy}

        sft = self.generate_sft(prompt, fused_output, assessments, extra_meta)
        dpo = self.generate_dpo(prompt, responses, assessments, extra_meta)

        return {
            "sft": sft.to_dict() if sft else None,
            "dpo": dpo.to_dict() if dpo else None,
        }

    def export_jsonl(self, filepath: str, data_type: str = "sft") -> None:
        """
        导出为 JSONL 格式

        Args:
            filepath: 输出文件路径
            data_type: "sft" 或 "dpo"
        """
        samples = self._generated_sft if data_type == "sft" else self._generated_dpo
        with open(filepath, "w", encoding="utf-8") as f:
            for sample in samples:
                f.write(json.dumps(sample.to_dict(), ensure_ascii=False) + "\n")

    def get_statistics(self) -> dict[str, Any]:
        """获取生成统计信息"""
        sft_scores = [
            s.metadata.get("quality_score", 0.0) for s in self._generated_sft
        ]
        dpo_gaps = [s.metadata.get("score_gap", 0.0) for s in self._generated_dpo]

        return {
            "total_sft_samples": len(self._generated_sft),
            "total_dpo_samples": len(self._generated_dpo),
            "avg_sft_quality": (
                sum(sft_scores) / len(sft_scores) if sft_scores else 0.0
            ),
            "avg_dpo_gap": sum(dpo_gaps) / len(dpo_gaps) if dpo_gaps else 0.0,
            "generation_log_count": len(self._generation_log),
        }

    def clear_cache(self) -> None:
        """清空已生成的样本缓存"""
        self._generated_sft.clear()
        self._generated_dpo.clear()
        self._generation_log.clear()
