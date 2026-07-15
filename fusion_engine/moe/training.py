# -*- coding: utf-8 -*-
"""
moe/training.py
===============

MoE 训练框架。
负责从 13 个微调检查点中提取专家、初始化门控网络，
并实现端到端的训练循环（含负载均衡辅助损失）。
"""

import os
import math
import logging
from typing import Dict, List, Optional

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

# 假设与本项目同目录
from moe.architecture import MoEModel, compute_total_aux_loss
from moe.weight_merging import (
    merge_multiple_models,
    task_vector_addition,
    slerp_state_dicts,
    ties_merging,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# 数据与工具
# --------------------------------------------------------------------------- #

class DummyTextDataset(Dataset):
    """
    用于演示的伪文本数据集。
    实际场景中应替换为真实语料（如从 13 个领域收集的混合数据）。
    """

    def __init__(self, vocab_size: int, seq_len: int, num_samples: int = 10000):
        self.vocab_size = vocab_size
        self.seq_len = seq_len
        self.num_samples = num_samples

    def __len__(self) -> int:
        return self.num_samples

    def __getitem__(self, idx: int):
        # 随机生成 input_ids 与 labels（自回归预测下一个 token）
        tokens = torch.randint(0, self.vocab_size, (self.seq_len,))
        return {"input_ids": tokens, "labels": tokens}


def get_dataloader(
    vocab_size: int,
    seq_len: int,
    batch_size: int,
    num_workers: int = 0,
    num_samples: int = 10000,
) -> DataLoader:
    """
    构建 DataLoader。
    """
    dataset = DummyTextDataset(vocab_size, seq_len, num_samples)
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        drop_last=True,
    )


# --------------------------------------------------------------------------- #
# 专家加载与初始化
# --------------------------------------------------------------------------- #

class ExpertPool:
    """
    专家池。

    管理从 13 个领域特定模型中加载的检查点，
    提供基于权重合并算法生成专家初始化参数的能力。
    """

    def __init__(
        self,
        checkpoint_dir: str,
        pretrained_path: Optional[str] = None,
        num_experts: int = 13,
    ):
        self.checkpoint_dir = checkpoint_dir
        self.pretrained_path = pretrained_path
        self.num_experts = num_experts
        self.finetuned_state_dicts: List[Dict[str, torch.Tensor]] = []
        self.pretrained_state_dict: Optional[Dict[str, torch.Tensor]] = None

    def load_checkpoints(self) -> None:
        """
        加载预训练基座与 13 个微调模型检查点。
        实际路径需根据本地环境调整。
        """
        if self.pretrained_path and os.path.exists(self.pretrained_path):
            logger.info(f"加载预训练基座: {self.pretrained_path}")
            self.pretrained_state_dict = torch.load(
                self.pretrained_path, map_location="cpu"
            )
        else:
            logger.warning("未找到预训练基座，将使用随机初始化作为基座。")

        for i in range(1, self.num_experts + 1):
            ckpt_path = os.path.join(self.checkpoint_dir, f"expert_{i}.pt")
            if os.path.exists(ckpt_path):
                logger.info(f"加载微调检查点: {ckpt_path}")
                sd = torch.load(ckpt_path, map_location="cpu")
                self.finetuned_state_dicts.append(sd)
            else:
                logger.warning(f"检查点不存在，已跳过: {ckpt_path}")

    def generate_expert_state_dict(
        self,
        expert_index: int,
        method: str = "task_vector",
    ) -> Optional[Dict[str, torch.Tensor]]:
        """
        为第 expert_index 个专家生成初始化权重。

        策略示例：
            - task_vector: 将该索引对应的微调模型直接作为专家。
            - ties: 使用 TIES-Merging 合并全部 13 个模型后，所有专家共享同一初始化
                    （后续在训练中分化）。
            - slerp: 对相邻两个检查点做 SLERP 插值，生成过渡型专家。

        Args:
            expert_index: 专家序号（从 0 开始）。
            method: 生成方法。

        Returns:
            参数字典或 None。
        """
        if not self.finetuned_state_dicts:
            logger.error("未加载任何微调检查点")
            return None

        if method == "task_vector":
            # 直接将对应序号的微调模型作为专家初始化
            idx = expert_index % len(self.finetuned_state_dicts)
            return self.finetuned_state_dicts[idx]

        elif method == "ties":
            if self.pretrained_state_dict is None:
                logger.error("TIES-Merging 需要预训练基座")
                return None
            # 所有专家使用同一套 TIES 合并权重（训练后自然分化）
            merged = ties_merging(
                self.pretrained_state_dict,
                self.finetuned_state_dicts,
                reset_thresh=0.2,
                merge_func="dis-mean",
            )
            return merged

        elif method == "slerp":
            # 在相邻两个检查点之间插值，索引循环
            n = len(self.finetuned_state_dicts)
            idx0 = expert_index % n
            idx1 = (expert_index + 1) % n
            t = 0.5
            merged = slerp_state_dicts(
                self.finetuned_state_dicts[idx0],
                self.finetuned_state_dicts[idx1],
                t=t,
            )
            return merged

        else:
            logger.error(f"未知的专家生成方法: {method}")
            return None

    def initialize_moe_model(
        self,
        model: MoEModel,
        method: str = "task_vector",
    ) -> None:
        """
        将生成的专家权重注入到 MoE 模型的对应专家层中。

        由于每个 Expert 仅为轻量 FFN，我们提取完整 state_dict 中
        与 Expert 结构匹配的部分进行加载。
        """
        # 获取参考形状：提取第一个专家的 state_dict 键
        ref_expert_sd = model.layers[0].moe.experts[0].state_dict()

        for layer_idx, layer in enumerate(model.layers):
            for expert_idx, expert in enumerate(layer.moe.experts):
                generated_sd = self.generate_expert_state_dict(expert_idx, method=method)
                if generated_sd is None:
                    continue

                # 筛选出与 Expert 结构匹配的参数
                # 假设完整模型参数键中包含 "experts.{expert_idx}" 等字样
                # 这里做简化映射：直接取生成的 state_dict 中键名与 expert state_dict 一致的参数
                matched = {}
                for k in ref_expert_sd:
                    if k in generated_sd:
                        matched[k] = generated_sd[k]
                    else:
                        # 若键名不同但形状一致，也尝试加载（实际项目中需更精细映射）
                        if any(sub in k for sub in ["fc1", "fc2", "norm"]):
                            # 兜底：使用随机初始化
                            matched[k] = ref_expert_sd[k]

                missing, unexpected = expert.load_state_dict(matched, strict=False)
                if missing:
                    logger.debug(f"Layer {layer_idx} Expert {expert_idx} 缺少键: {missing}")
                if unexpected:
                    logger.debug(f"Layer {layer_idx} Expert {expert_idx} 未预期键: {unexpected}")

        logger.info(f"已完成 MoE 模型专家初始化，方法: {method}")


# --------------------------------------------------------------------------- #
# 训练器
# --------------------------------------------------------------------------- #

class MoETrainer:
    """
    MoE 端到端训练器。

    负责监督训练循环、辅助损失计算、梯度裁剪、学习率调度与检查点保存。
    """

    def __init__(
        self,
        model: MoEModel,
        train_loader: DataLoader,
        val_loader: Optional[DataLoader] = None,
        optimizer: Optional[optim.Optimizer] = None,
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        aux_loss_weight: float = 0.01,
        max_grad_norm: float = 1.0,
        save_dir: str = "./checkpoints",
    ):
        self.model = model.to(device)
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.device = device
        self.aux_loss_weight = aux_loss_weight
        self.max_grad_norm = max_grad_norm
        self.save_dir = save_dir

        if optimizer is None:
            self.optimizer = optim.AdamW(self.model.parameters(), lr=1e-4, weight_decay=0.01)
        else:
            self.optimizer = optimizer

        self.scheduler = optim.lr_scheduler.CosineAnnealingLR(
            self.optimizer, T_max=len(train_loader), eta_min=1e-6
        )

        os.makedirs(self.save_dir, exist_ok=True)
        self.global_step = 0

    def _run_step(self, batch: Dict[str, torch.Tensor]) -> Dict[str, float]:
        """
        单步训练。

        Returns:
            包含损失值的字典。
        """
        input_ids = batch["input_ids"].to(self.device)
        labels = batch["labels"].to(self.device)

        # 因果掩码（下三角矩阵）
        seq_len = input_ids.size(1)
        causal_mask = torch.tril(torch.ones(seq_len, seq_len, device=self.device)).unsqueeze(0).unsqueeze(0)
        causal_mask = causal_mask.masked_fill(causal_mask == 0, float("-inf")).masked_fill(causal_mask == 1, 0.0)

        logits, all_topk_gates, all_topk_indices, all_aux_losses = self.model(input_ids, mask=causal_mask)

        # 计算语言建模损失（CrossEntropy，预测下一个 token）
        # logits: (B, S, V); labels: (B, S)
        loss_fct = nn.CrossEntropyLoss(ignore_index=-100)
        shift_logits = logits[..., :-1, :].contiguous()
        shift_labels = labels[..., 1:].contiguous()
        lm_loss = loss_fct(shift_logits.view(-1, shift_logits.size(-1)), shift_labels.view(-1))

        # 负载均衡辅助损失
        aux_loss = compute_total_aux_loss(all_aux_losses, alpha=self.aux_loss_weight)

        total_loss = lm_loss + aux_loss

        self.optimizer.zero_grad()
        total_loss.backward()

        # 梯度裁剪
        torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.max_grad_norm)

        self.optimizer.step()
        self.scheduler.step()

        return {
            "lm_loss": lm_loss.item(),
            "aux_loss": aux_loss.item(),
            "total_loss": total_loss.item(),
        }

    def train_epoch(self, epoch: int) -> Dict[str, float]:
        """
        训练一个 epoch。
        """
        self.model.train()
        total_lm_loss = 0.0
        total_aux_loss = 0.0
        total_total_loss = 0.0
        num_batches = 0

        for batch in self.train_loader:
            metrics = self._run_step(batch)
            total_lm_loss += metrics["lm_loss"]
            total_aux_loss += metrics["aux_loss"]
            total_total_loss += metrics["total_loss"]
            num_batches += 1
            self.global_step += 1

            if self.global_step % 100 == 0:
                logger.info(
                    f"Epoch {epoch} | Step {self.global_step} | "
                    f"LM Loss: {metrics['lm_loss']:.4f} | Aux Loss: {metrics['aux_loss']:.6f}"
                )

        return {
            "lm_loss": total_lm_loss / max(num_batches, 1),
            "aux_loss": total_aux_loss / max(num_batches, 1),
            "total_loss": total_total_loss / max(num_batches, 1),
        }

    def evaluate(self) -> Dict[str, float]:
        """
        在验证集上评估。
        """
        if self.val_loader is None:
            return {}
        self.model.eval()
        total_lm_loss = 0.0
        num_batches = 0

        with torch.no_grad():
            for batch in self.val_loader:
                input_ids = batch["input_ids"].to(self.device)
                labels = batch["labels"].to(self.device)

                seq_len = input_ids.size(1)
                causal_mask = torch.tril(torch.ones(seq_len, seq_len, device=self.device)).unsqueeze(0).unsqueeze(0)
                causal_mask = causal_mask.masked_fill(causal_mask == 0, float("-inf")).masked_fill(causal_mask == 1, 0.0)

                logits, _, _, _ = self.model(input_ids, mask=causal_mask)

                loss_fct = nn.CrossEntropyLoss(ignore_index=-100)
                shift_logits = logits[..., :-1, :].contiguous()
                shift_labels = labels[..., 1:].contiguous()
                lm_loss = loss_fct(shift_logits.view(-1, shift_logits.size(-1)), shift_labels.view(-1))

                total_lm_loss += lm_loss.item()
                num_batches += 1

        avg_lm_loss = total_lm_loss / max(num_batches, 1)
        perplexity = math.exp(avg_lm_loss)
        return {"lm_loss": avg_lm_loss, "perplexity": perplexity}

    def save_checkpoint(self, epoch: int, filename: Optional[str] = None) -> None:
        """
        保存模型检查点。
        """
        if filename is None:
            filename = f"moe_epoch_{epoch}.pt"
        path = os.path.join(self.save_dir, filename)
        torch.save(
            {
                "epoch": epoch,
                "global_step": self.global_step,
                "model_state_dict": self.model.state_dict(),
                "optimizer_state_dict": self.optimizer.state_dict(),
                "scheduler_state_dict": self.scheduler.state_dict(),
            },
            path,
        )
        logger.info(f"检查点已保存: {path}")

    def fit(self, num_epochs: int, eval_every: int = 1) -> None:
        """
        端到端训练入口。
        """
        logger.info("开始 MoE 训练...")
        for epoch in range(1, num_epochs + 1):
            train_metrics = self.train_epoch(epoch)
            logger.info(
                f"Epoch {epoch} 完成 | 平均 LM Loss: {train_metrics['lm_loss']:.4f} | "
                f"平均 Aux Loss: {train_metrics['aux_loss']:.6f}"
            )

            if epoch % eval_every == 0:
                eval_metrics = self.evaluate()
                if eval_metrics:
                    logger.info(
                        f"验证结果 | Loss: {eval_metrics['lm_loss']:.4f} | PPL: {eval_metrics['perplexity']:.2f}"
                    )
                self.save_checkpoint(epoch)

        logger.info("MoE 训练结束。")


# --------------------------------------------------------------------------- #
# 快捷入口
# --------------------------------------------------------------------------- #

def train_moe(
    model: MoEModel,
    expert_pool: ExpertPool,
    num_epochs: int = 3,
    batch_size: int = 8,
    seq_len: int = 512,
    **kwargs,
) -> MoETrainer:
    """
    一键训练入口：初始化专家、构建数据、启动训练。
    """
    # 1. 初始化专家权重
    expert_pool.initialize_moe_model(model, method="task_vector")

    # 2. 构建数据加载器
    train_loader = get_dataloader(
        vocab_size=model.lm_head.out_features,
        seq_len=seq_len,
        batch_size=batch_size,
        num_samples=50000,
    )
    val_loader = get_dataloader(
        vocab_size=model.lm_head.out_features,
        seq_len=seq_len,
        batch_size=batch_size,
        num_samples=5000,
    )

    # 3. 创建训练器并启动
    trainer = MoETrainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        **kwargs,
    )
    trainer.fit(num_epochs=num_epochs)
    return trainer
