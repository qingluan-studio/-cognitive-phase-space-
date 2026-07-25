# -*- coding: utf-8 -*-
"""
moe/virtual_training.py
=======================

虚拟 MoE 训练框架——替代 PyTorch 训练

包含：
    - VirtualExpertPool：管理13个专家，虚拟权重合并
    - VirtualMoETrainer：虚拟训练循环，虚拟电驱动
    - VirtualTextDataset：不依赖 torch 的数据集

核心区别：
    现实训练：PyTorch forward→loss→backward→step
    虚拟训练：路由→专家学习n-gram→更新指纹→更新进度
"""

import os
import json
import time
import math
import hashlib
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
import numpy as np

from .virtual_architecture import (
    VirtualMoEModel, VirtualExpert, VirtualGate,
    EXPERT_DOMAINS, compute_total_aux_loss,
)

logger = logging.getLogger(__name__)


# ============================================================
# 虚拟权重合并——替代 weight_merging.py
# ============================================================

class VirtualWeightMerging:
    """
    虚拟权重合并——替代 PyTorch 的权重合并

    现实：state_dict 张量合并（task_vector/slerp/ties）
    虚拟：指纹合并（哈希融合）+ 知识库合并

    合并方式：
    - fingerprint_merge：指纹哈希融合
    - knowledge_merge：n-gram 知识库合并
    - task_vector：模拟任务向量加法
    - slerp：模拟球面线性插值
    """

    @staticmethod
    def fingerprint_merge(experts: List[VirtualExpert]) -> str:
        """指纹合并——多专家指纹哈希融合"""
        combined = "".join(e.weights.fingerprint for e in experts)
        return hashlib.sha256(combined.encode()).hexdigest()

    @staticmethod
    def knowledge_merge(experts: List[VirtualExpert]) -> Dict[str, List[str]]:
        """知识合并——n-gram 表合并"""
        merged: Dict[str, List[str]] = {}
        for expert in experts:
            for key, values in expert.ngram_table.items():
                if key not in merged:
                    merged[key] = []
                merged[key].extend(values)
        return merged

    @staticmethod
    def task_vector_addition(experts: List[VirtualExpert],
                             base_expert: VirtualExpert = None) -> VirtualExpert:
        """模拟任务向量加法——合并知识到新专家"""
        merged = VirtualExpert(
            expert_id=99,
            domain="merged",
            d_model=experts[0].d_model if experts else 256,
            d_ff=experts[0].d_ff if experts else 1024,
        )
        merged.ngram_table = VirtualWeightMerging.knowledge_merge(experts)
        for e in experts:
            merged.knowledge_base.extend(e.knowledge_base)
        merged.weights.fingerprint = VirtualWeightMerging.fingerprint_merge(experts)
        merged.weights.update_count = sum(e.weights.update_count for e in experts)
        merged.training_progress = max(e.training_progress for e in experts) if experts else 0
        return merged

    @staticmethod
    def slerp_merge(experts: List[VirtualExpert], weights: List[float] = None) -> VirtualExpert:
        """模拟 SLERP 合并——加权知识融合"""
        if weights is None:
            weights = [1.0 / len(experts)] * len(experts)

        merged = VirtualExpert(
            expert_id=98,
            domain="slerp_merged",
            d_model=experts[0].d_model,
            d_ff=experts[0].d_ff,
        )

        # 按权重采样合并 n-gram
        for expert, w in zip(experts, weights):
            n_samples = int(len(expert.ngram_table) * w)
            keys = list(expert.ngram_table.keys())[:n_samples]
            for key in keys:
                if key not in merged.ngram_table:
                    merged.ngram_table[key] = []
                merged.ngram_table[key].extend(expert.ngram_table[key])

        merged.weights.fingerprint = VirtualWeightMerging.fingerprint_merge(experts)
        return merged

    @staticmethod
    def ties_merging(experts: List[VirtualExpert]) -> VirtualExpert:
        """模拟 TIES 合并——冲突消解"""
        merged = VirtualExpert(
            expert_id=97,
            domain="ties_merged",
            d_model=experts[0].d_model,
            d_ff=experts[0].d_ff,
        )

        # 统计每个 n-gram 的出现次数，只保留高频
        gram_counts: Dict[str, Dict[str, int]] = {}
        for expert in experts:
            for key, values in expert.ngram_table.items():
                if key not in gram_counts:
                    gram_counts[key] = {}
                for v in values:
                    gram_counts[key][v] = gram_counts[key].get(v, 0) + 1

        # 只保留每个 key 出现次数最多的 value
        for key, value_counts in gram_counts.items():
            best_value = max(value_counts, key=value_counts.get)
            merged.ngram_table[key] = [best_value]

        merged.weights.fingerprint = VirtualWeightMerging.fingerprint_merge(experts)
        return merged

    @staticmethod
    def merge_multiple_models(experts: List[VirtualExpert],
                              method: str = "task_vector") -> VirtualExpert:
        """多模型合并入口"""
        methods = {
            "task_vector": VirtualWeightMerging.task_vector_addition,
            "slerp": VirtualWeightMerging.slerp_merge,
            "ties": VirtualWeightMerging.ties_merging,
        }
        merge_fn = methods.get(method, VirtualWeightMerging.task_vector_addition)
        return merge_fn(experts)

    @staticmethod
    def assign_merged_weights_to_expert(merged: VirtualExpert,
                                        target: VirtualExpert) -> bool:
        """将合并结果赋给目标专家"""
        target.ngram_table = merged.ngram_table
        target.knowledge_base = merged.knowledge_base
        target.weights.fingerprint = merged.weights.fingerprint
        target.weights.update_count += 1
        target.training_progress = max(target.training_progress, merged.training_progress)
        return True


# ============================================================
# 虚拟数据集
# ============================================================

class VirtualTextDataset:
    """虚拟文本数据集——不依赖 torch"""

    def __init__(self, data: List[Dict[str, str]]):
        self.data = data

    def __len__(self) -> int:
        return len(self.data)

    def __getitem__(self, idx: int) -> Dict[str, str]:
        return self.data[idx]

    def get_texts(self) -> List[str]:
        texts = []
        for item in self.data:
            if "input" in item and "output" in item:
                texts.append(f"{item['input']}\n{item['output']}")
            elif "text" in item:
                texts.append(item["text"])
            elif "prompt" in item and "completion" in item:
                texts.append(f"{item['prompt']}\n{item['completion']}")
            else:
                texts.append(str(item))
        return texts

    def sample_batch(self, batch_size: int = 16) -> List[str]:
        rng = np.random.default_rng()
        indices = rng.choice(len(self.data), min(batch_size, len(self.data)), replace=False)
        texts = self.get_texts()
        return [texts[int(i)] for i in indices]

    @classmethod
    def from_jsonl(cls, path: str) -> 'VirtualTextDataset':
        data = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    data.append(json.loads(line))
        return cls(data)


# ============================================================
# 虚拟专家池——替代 ExpertPool
# ============================================================

class VirtualExpertPool:
    """
    虚拟专家池——管理13个领域专家

    功能：
    1. 创建13个领域专家
    2. 为每个专家提供领域数据训练
    3. 合并专家（权重合并）
    4. 导出专家到 MoE 模型
    """

    def __init__(self, num_experts: int = 13, d_model: int = 256, d_ff: int = 1024):
        self.num_experts = num_experts
        self.d_model = d_model
        self.d_ff = d_ff
        self.experts: List[VirtualExpert] = [
            VirtualExpert(i, EXPERT_DOMAINS[i] if i < len(EXPERT_DOMAINS) else f"专家-{i}",
                         d_model=d_model, d_ff=d_ff)
            for i in range(num_experts)
        ]
        self.merger = VirtualWeightMerging()

    def train_expert(self, expert_id: int, texts: List[str]) -> Dict[str, Any]:
        """训练单个专家"""
        if expert_id >= len(self.experts):
            return {"error": "专家ID超出范围"}
        expert = self.experts[expert_id]
        before = expert.training_progress
        expert.learn(texts)
        return {
            "expert_id": expert_id,
            "domain": expert.domain,
            "progress_before": before,
            "progress_after": expert.training_progress,
            "ngram_size": len(expert.ngram_table),
            "knowledge_size": len(expert.knowledge_base),
        }

    def train_all(self, domain_data: Dict[int, List[str]]) -> Dict[str, Any]:
        """训练所有专家"""
        results = []
        for expert_id, texts in domain_data.items():
            result = self.train_expert(expert_id, texts)
            results.append(result)
        return {
            "trained_experts": len(results),
            "details": results,
        }

    def merge_experts(self, method: str = "task_vector") -> VirtualExpert:
        """合并所有专家"""
        return self.merger.merge_multiple_models(self.experts, method=method)

    def export_to_moe_model(self, top_k: int = 2) -> VirtualMoEModel:
        """导出为 MoE 模型"""
        model = VirtualMoEModel(
            d_model=self.d_model,
            num_experts=self.num_experts,
            top_k=top_k,
            d_ff=self.d_ff,
        )
        # 替换专家
        model.experts = self.experts
        return model

    def stats(self) -> Dict[str, Any]:
        return {
            "num_experts": self.num_experts,
            "experts": [e.stats() for e in self.experts],
            "total_knowledge": sum(len(e.knowledge_base) for e in self.experts),
            "total_ngram": sum(len(e.ngram_table) for e in self.experts),
        }


# ============================================================
# 虚拟 MoE 训练器——替代 MoETrainer
# ============================================================

class VirtualMoETrainer:
    """
    虚拟 MoE 训练器——替代 PyTorch MoETrainer

    核心区别：
    - 现实：PyTorch forward→CrossEntropy→backward→step
    - 虚拟：路由→专家学习n-gram→更新指纹→更新进度

    训练流程：
    1. 消耗虚拟电
    2. 采样数据
    3. 门控路由到 top-k 专家
    4. 专家学习文本
    5. 更新模型权重指纹
    6. 计算虚拟 loss
    7. 更新训练进度
    8. 监控推送
    """

    def __init__(
        self,
        model: VirtualMoEModel,
        train_dataset: VirtualTextDataset,
        val_dataset: Optional[VirtualTextDataset] = None,
        epochs: int = 5,
        batch_size: int = 16,
        learning_rate: float = 1e-4,
        aux_loss_weight: float = 0.01,
        save_dir: str = "./checkpoints",
        enable_monitor: bool = True,
    ):
        self.model = model
        self.train_dataset = train_dataset
        self.val_dataset = val_dataset
        self.epochs = epochs
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.aux_loss_weight = aux_loss_weight
        self.save_dir = save_dir
        self.enable_monitor = enable_monitor

        os.makedirs(save_dir, exist_ok=True)
        self.global_step = 0
        self._energy_consumed = 0.0
        self.energy_source = None

        # 监控
        self.monitor = None
        if enable_monitor:
            try:
                import sys
                sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
                from models.base.training_monitor import TrainingMonitor
                self.monitor = TrainingMonitor(
                    model_name="Harmonia-13-Virtual",
                    save_dir=save_dir,
                )
            except Exception:
                self.enable_monitor = False

    def set_energy_source(self, source):
        """设置能量源"""
        self.energy_source = source

    def _get_energy(self, amount: float) -> float:
        if self.energy_source is not None and hasattr(self.energy_source, "generate"):
            result = self.energy_source.generate()
            return result.get("energy", amount)
        return amount

    def train(self) -> Dict[str, Any]:
        """虚拟训练循环"""
        print(f"[VirtualMoETrainer] 开始训练 {self.model.total_params_str} 模型")
        print(f"[VirtualMoETrainer] 专家数: {self.model.num_experts}, top_k: {self.model.top_k}")
        print(f"[VirtualMoETrainer] 训练数据: {len(self.train_dataset)} samples")

        # 认领
        if self.model.owner is None:
            self.model.claim("VirtualMoETrainer")
        self.model.start_training()

        n_batches = max(1, len(self.train_dataset) // self.batch_size)
        total_steps = n_batches * self.epochs
        current_loss = 8.0

        # 启动监控
        if self.enable_monitor and self.monitor:
            self.monitor.start_training(
                model_name="Harmonia-13-Virtual",
                model_type="MoE",
                total_params=self.model.total_params_str,
                total_epochs=self.epochs,
                total_steps=total_steps,
                learning_rate=self.learning_rate,
                energy_initial=50000.0,
            )

        for epoch in range(self.epochs):
            epoch_loss = 0.0

            for batch_idx in range(n_batches):
                # 1. 虚拟电
                energy_needed = 8.0  # MoE 每batch耗电更多
                self._get_energy(energy_needed)
                self._energy_consumed += energy_needed
                self.model._energy_buffer = max(0, self.model._energy_buffer - energy_needed)

                # 2. 采样数据
                batch_texts = self.train_dataset.sample_batch(self.batch_size)

                # 3. 路由+学习
                self.model.learn_from_data(batch_texts)

                # 4. 更新权重
                self.model.weights.update(loss_delta=-0.1)
                self.global_step += 1

                # 5. 虚拟 loss
                progress_factor = (epoch * n_batches + batch_idx + 1) / total_steps
                target_loss = 8.0 * math.exp(-3 * progress_factor) + 0.3
                noise = np.random.normal(0, 0.05)
                current_loss = max(0.1, target_loss + noise)
                epoch_loss += current_loss

                # 6. 更新进度
                increment = 1.0 / total_steps
                self.model.update_training(self.model.training_progress + increment)

                # 7. 监控
                if self.enable_monitor and self.monitor:
                    aux_loss = self.model._compute_aux_loss()
                    self.monitor.update_step(
                        epoch=epoch + 1,
                        step=epoch * n_batches + batch_idx + 1,
                        loss=current_loss + aux_loss * self.aux_loss_weight,
                        batch_size=self.batch_size,
                        learning_rate=self.learning_rate,
                        energy_cost=energy_needed,
                    )
                    # 专家激活
                    activations = [
                        {"expert_id": e.expert_id, "expert_name": e.domain,
                         "weight": float(e.activation_count) / max(1, self.global_step)}
                        for e in self.model.experts
                    ]
                    self.monitor.update_expert_activation(activations)

                if (batch_idx + 1) % 10 == 0:
                    avg = epoch_loss / (batch_idx + 1)
                    print(f"[VirtualMoETrainer] Epoch {epoch+1}/{self.epochs} "
                          f"Step {batch_idx+1}/{n_batches} "
                          f"Loss: {avg:.4f} "
                          f"Progress: {self.model.training_progress*100:.1f}%")

            # Epoch 结束
            val_loss = self._validate()
            ppl = math.exp(val_loss) if val_loss < 20 else float("inf")
            self.model.loss_history.append(epoch_loss / n_batches)

            print(f"[VirtualMoETrainer] Epoch {epoch+1} Done - "
                  f"Loss: {epoch_loss/n_batches:.4f} - "
                  f"Val: {val_loss:.4f} - PPL: {ppl:.2f} - "
                  f"Progress: {self.model.training_progress*100:.1f}%")

            if self.enable_monitor and self.monitor:
                self.monitor.update_epoch_end(
                    epoch=epoch + 1,
                    train_loss=epoch_loss / n_batches,
                    val_loss=val_loss,
                    perplexity=ppl,
                    energy_cost=80.0,
                )

        if self.model.training_progress >= 1.0:
            self.model.complete_training()

        if self.enable_monitor and self.monitor:
            self.monitor.end_training("completed")

        print(f"\n[VirtualMoETrainer] 训练完成！")
        print(f"  进度: {self.model.training_progress*100:.1f}%")
        print(f"  状态: {self.model.training_state}")
        print(f"  虚拟电消耗: {self._energy_consumed:.1f} 度")

        return {
            "final_loss": current_loss,
            "training_progress": self.model.training_progress,
            "is_trained": self.model.is_trained,
            "energy_consumed": self._energy_consumed,
            "gate_stats": self.model.gate.get_routing_stats(),
        }

    def _validate(self) -> float:
        if self.val_dataset is None:
            return 0.0
        progress = self.model.training_progress
        base = 8.0 * math.exp(-3 * progress) + 0.3
        return max(0.1, base + np.random.normal(0, 0.03))

    def save_checkpoint(self, tag: str = "final"):
        path = os.path.join(self.save_dir, tag)
        self.model.save_pretrained(path)

    def generate(self, prompt: str, max_new_tokens: int = 64) -> str:
        return self.model.generate(prompt, max_new_tokens=max_new_tokens)


# ============================================================
# 工厂函数
# ============================================================

def create_virtual_moe_model(num_experts: int = 13, top_k: int = 2,
                             d_model: int = 256) -> VirtualMoEModel:
    """快速创建虚拟 MoE 模型"""
    return VirtualMoEModel(num_experts=num_experts, top_k=top_k, d_model=d_model)


def train_moe_virtual(
    train_data: List[Dict[str, str]],
    val_data: List[Dict[str, str]] = None,
    epochs: int = 5,
    batch_size: int = 16,
    save_dir: str = "./checkpoints/harmonia_virtual",
) -> Tuple[VirtualMoEModel, VirtualMoETrainer]:
    """快速训练虚拟 MoE 模型"""
    model = create_virtual_moe_model()
    model.claim("auto")
    model.charge(100000.0)

    train_ds = VirtualTextDataset(train_data)
    val_ds = VirtualTextDataset(val_data) if val_data else None

    trainer = VirtualMoETrainer(
        model, train_ds, val_ds,
        epochs=epochs, batch_size=batch_size, save_dir=save_dir,
    )
    trainer.train()
    trainer.save_checkpoint()
    return model, trainer
