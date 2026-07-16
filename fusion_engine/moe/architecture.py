# -*- coding: utf-8 -*-
"""
moe/architecture.py
===================

MoE（混合专家）架构核心设计。
包含 Expert、Gate、MoELayer 以及完整的 MoE Transformer 模型。

该架构对应的融合模型名称为 **合鸣（Harmonia-13）**：
13 个领域专家共享基座，通过 Gate 动态路由、稀疏激活，
协同完成文本、代码、推理、创作等多领域任务。

设计目标：
    1. 每个 Expert 为轻量级子网络（两层 MLP）。
    2. Gate 根据输入动态选择 top-k 专家。
    3. MoELayer 实现稀疏激活：每次只激活 2~4 个专家。
    4. 支持容量因子（capacity factor）限制每个专家处理的 token 数量，
       从而保证计算稀疏性。
"""

# 合鸣：由 13 个领域专家融合而成的稀疏激活统一模型
MODEL_NAME = "Harmonia-13"
MODEL_NAME_CN = "合鸣"

import math
from typing import List, Tuple, Optional

import torch
import torch.nn as nn
import torch.nn.functional as F


class Expert(nn.Module):
    """
    单个专家模块。

    采用轻量化的两层前馈网络（FFN）结构，配合 LayerNorm、
    GELU 激活与 Dropout，保证表达能力的同时控制参数量。

    Args:
        d_model: 模型隐藏维度。
        d_ff: 专家中间层维度（通常为 4*d_model）。
        dropout: Dropout 概率。
    """

    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.fc1 = nn.Linear(d_model, d_ff, bias=True)
        self.fc2 = nn.Linear(d_ff, d_model, bias=True)
        self.act = nn.GELU()
        self.norm = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(p=dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        前向传播。

        Args:
            x: 输入张量，形状 (..., d_model)。

        Returns:
            输出张量，形状与输入相同。
        """
        residual = x
        hidden = self.fc1(x)
        hidden = self.act(hidden)
        hidden = self.dropout(hidden)
        hidden = self.fc2(hidden)
        hidden = self.dropout(hidden)
        return self.norm(residual + hidden)


class Gate(nn.Module):
    """
    门控网络（Gating Network）。

    根据输入特征为每个 token 计算到所有专家的 routing 分数，
    并从中选择 top-k 个专家。训练时可加入高斯噪声以促进探索。

    Args:
        d_model: 输入特征维度。
        num_experts: 专家总数。
        top_k: 每个 token 激活的专家数量（稀疏度）。
        noise_std: 训练时添加的探索噪声标准差。
    """

    def __init__(self, d_model: int, num_experts: int, top_k: int = 2, noise_std: float = 1.0):
        super().__init__()
        self.num_experts = num_experts
        self.top_k = top_k
        self.noise_std = noise_std
        self.gate_proj = nn.Linear(d_model, num_experts, bias=False)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        计算门控输出。

        Args:
            x: 输入张量，形状 (batch_size, seq_len, d_model)。

        Returns:
            topk_gates: 每个 token 对应 top-k 专家的归一化权重，
                        形状 (batch_size, seq_len, top_k)。
            topk_indices: 选中的专家索引，
                          形状 (batch_size, seq_len, top_k)。
            gates_full: 到所有专家的 softmax 概率，
                        形状 (batch_size, seq_len, num_experts)。
        """
        logits = self.gate_proj(x)  # (B, S, E)

        if self.training:
            # 加入探索噪声，避免门控过早收敛到局部最优
            noise = torch.randn_like(logits) * self.noise_std
            logits = logits + noise

        gates_full = F.softmax(logits, dim=-1)
        topk_gates, topk_indices = torch.topk(gates_full, self.top_k, dim=-1)

        # 对 top-k 门控值重新归一化，使得所选专家权重之和为 1
        topk_gates = topk_gates / (topk_gates.sum(dim=-1, keepdim=True) + 1e-9)

        return topk_gates, topk_indices, gates_full


class MoELayer(nn.Module):
    """
    混合专家层（Mixture-of-Experts Layer）。

    管理一组 Expert 实例，并通过 Gate 实现动态路由。
    引入容量因子（capacity factor）实现稀疏激活：
    每个专家每轮前向传播最多处理 (num_tokens / num_experts) * capacity_factor 个 token。

    Args:
        d_model: 隐藏维度。
        num_experts: 专家数量。
        top_k: 每个 token 激活的专家数。
        d_ff: 专家中间层维度。
        capacity_factor: 容量因子，>0。
        dropout: Dropout 概率。
    """

    def __init__(
        self,
        d_model: int,
        num_experts: int,
        top_k: int = 2,
        d_ff: int = 2048,
        capacity_factor: float = 1.25,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.d_model = d_model
        self.num_experts = num_experts
        self.top_k = top_k
        self.capacity_factor = capacity_factor

        self.experts = nn.ModuleList(
            [Expert(d_model, d_ff, dropout) for _ in range(num_experts)]
        )
        self.gate = Gate(d_model, num_experts, top_k)

    def _compute_capacity(self, num_tokens: int) -> int:
        """
        计算每个专家在当前批次下的最大处理 token 数。

        公式: capacity = (num_tokens / num_experts) * capacity_factor
        """
        return max(1, int((num_tokens / self.num_experts) * self.capacity_factor))

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        前向传播。

        Args:
            x: 输入张量，形状 (batch_size, seq_len, d_model)。

        Returns:
            output: MoE 层输出，形状与输入相同。
            topk_gates: top-k 门控权重。
            topk_indices: 选中的专家索引。
            aux_loss: 负载均衡辅助损失（用于训练 Gate）。
        """
        batch_size, seq_len, d_model = x.shape
        num_tokens = batch_size * seq_len

        # 将输入展平为 (num_tokens, d_model)
        x_flat = x.reshape(-1, d_model)

        # 获取路由决策
        topk_gates, topk_indices, gates_full = self.gate(x)
        topk_gates = topk_gates.reshape(num_tokens, self.top_k)
        topk_indices = topk_indices.reshape(num_tokens, self.top_k)

        # 初始化输出
        output = torch.zeros_like(x_flat)

        capacity = self._compute_capacity(num_tokens)

        # 统计每个专家被分配的 token 数量（用于辅助损失）
        expert_counts = torch.zeros(self.num_experts, device=x.device)

        for expert_idx in range(self.num_experts):
            # 找出被路由到当前专家的所有 token 位置
            mask = topk_indices == expert_idx
            token_positions, gate_rank = mask.nonzero(as_tuple=True)

            num_assigned = token_positions.numel()
            if num_assigned == 0:
                continue

            expert_counts[expert_idx] = min(num_assigned, capacity)

            # 容量截断：如果超出容量，只保留权重最高的 capacity 个 token
            if num_assigned > capacity:
                selected_gates = topk_gates[token_positions, gate_rank]
                _, sorted_idx = torch.sort(selected_gates, descending=True)
                keep = sorted_idx[:capacity]
                token_positions = token_positions[keep]
                gate_rank = gate_rank[keep]

            # 提取输入并送入对应专家
            expert_input = x_flat[token_positions]
            expert_out = self.experts[expert_idx](expert_input)

            # 按门控权重加权后累加到输出
            gate_vals = topk_gates[token_positions, gate_rank].unsqueeze(-1)
            output.index_add_(0, token_positions, gate_vals * expert_out)

        # 恢复形状
        output = output.reshape(batch_size, seq_len, d_model)

        # 计算负载均衡辅助损失（Switch Transformer 风格）
        # aux_loss = num_experts * sum_i(f_i * P_i)
        # f_i: 实际分配给专家 i 的 token 比例
        # P_i: 路由概率对专家 i 的均值
        f = expert_counts / (expert_counts.sum() + 1e-10)
        P = gates_full.mean(dim=[0, 1])  # (num_experts,)
        aux_loss = self.num_experts * (f * P).sum()

        return output, topk_gates, topk_indices, aux_loss


class MultiHeadSelfAttention(nn.Module):
    """
    标准多头自注意力模块。

    Args:
        d_model: 模型维度。
        n_heads: 注意力头数。
        dropout: 注意力 dropout。
    """

    def __init__(self, d_model: int, n_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % n_heads == 0, "d_model 必须能被 n_heads 整除"
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        self.scale = math.sqrt(self.d_head)

        self.qkv_proj = nn.Linear(d_model, d_model * 3, bias=False)
        self.out_proj = nn.Linear(d_model, d_model, bias=False)
        self.attn_dropout = nn.Dropout(p=dropout)
        self.resid_dropout = nn.Dropout(p=dropout)

    def forward(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        B, S, D = x.shape
        qkv = self.qkv_proj(x)
        qkv = qkv.reshape(B, S, 3, self.n_heads, self.d_head).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        scores = torch.matmul(q, k.transpose(-2, -1)) / self.scale
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float("-inf"))
        attn = F.softmax(scores, dim=-1)
        attn = self.attn_dropout(attn)

        out = torch.matmul(attn, v).transpose(1, 2).reshape(B, S, D)
        out = self.out_proj(out)
        return self.resid_dropout(out)


class MoETransformerBlock(nn.Module):
    """
    MoE Transformer 块。

    结构：Self-Attention -> Residual -> MoELayer -> Residual。
    其中 FFN 部分被替换为 MoELayer，以实现稀疏激活。

    Args:
        d_model: 模型维度。
        n_heads: 注意力头数。
        num_experts: 专家数量。
        top_k: 每个 token 激活的专家数。
        d_ff: 专家中间层维度。
        capacity_factor: 容量因子。
        dropout: Dropout 概率。
    """

    def __init__(
        self,
        d_model: int,
        n_heads: int,
        num_experts: int,
        top_k: int = 2,
        d_ff: int = 2048,
        capacity_factor: float = 1.25,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.attn = MultiHeadSelfAttention(d_model, n_heads, dropout)
        self.attn_norm = nn.LayerNorm(d_model)

        self.moe = MoELayer(d_model, num_experts, top_k, d_ff, capacity_factor, dropout)
        self.moe_norm = nn.LayerNorm(d_model)

        self.dropout = nn.Dropout(p=dropout)

    def forward(
        self, x: torch.Tensor, mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        前向传播。

        Returns:
            x: 输出特征。
            topk_gates: top-k 门控权重。
            topk_indices: 选中的专家索引。
            aux_loss: 当前层的负载均衡损失。
        """
        # 1) Self-Attention + Residual
        attn_out = self.attn(self.attn_norm(x), mask=mask)
        x = x + self.dropout(attn_out)

        # 2) MoE + Residual
        moe_out, topk_gates, topk_indices, aux_loss = self.moe(self.moe_norm(x))
        x = x + self.dropout(moe_out)

        return x, topk_gates, topk_indices, aux_loss


class MoEModel(nn.Module):
    """
    完整的 MoE Transformer 模型。

    由嵌入层、多个 MoETransformerBlock 堆叠而成，
    最后接 LayerNorm 与语言模型头（LM Head）。

    Args:
        vocab_size: 词表大小。
        d_model: 模型隐藏维度。
        n_layers: Transformer 层数。
        n_heads: 注意力头数。
        num_experts: 每层专家数量。
        top_k: 每层激活专家数。
        d_ff: 专家中间层维度。
        max_seq_len: 最大序列长度。
        capacity_factor: 容量因子。
        dropout: Dropout 概率。
    """

    def __init__(
        self,
        vocab_size: int,
        d_model: int = 768,
        n_layers: int = 12,
        n_heads: int = 12,
        num_experts: int = 13,
        top_k: int = 2,
        d_ff: int = 2048,
        max_seq_len: int = 2048,
        capacity_factor: float = 1.25,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.d_model = d_model
        self.max_seq_len = max_seq_len

        self.token_embedding = nn.Embedding(vocab_size, d_model)
        self.position_embedding = nn.Embedding(max_seq_len, d_model)
        self.emb_dropout = nn.Dropout(p=dropout)

        self.layers = nn.ModuleList(
            [
                MoETransformerBlock(
                    d_model, n_heads, num_experts, top_k, d_ff, capacity_factor, dropout
                )
                for _ in range(n_layers)
            ]
        )

        self.final_norm = nn.LayerNorm(d_model)
        self.lm_head = nn.Linear(d_model, vocab_size, bias=False)

        # 权重绑定：LM Head 与 Token Embedding 共享权重（可选）
        self.lm_head.weight = self.token_embedding.weight

        self._init_weights()

    def _init_weights(self):
        """
        初始化模型参数。
        """
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.normal_(module.weight, mean=0.0, std=0.02)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
            elif isinstance(module, nn.Embedding):
                nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(
        self, input_ids: torch.Tensor, mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, List[torch.Tensor], List[torch.Tensor], List[torch.Tensor]]:
        """
        前向传播。

        Args:
            input_ids: 输入 token ID，形状 (batch_size, seq_len)。
            mask: 可选的注意力掩码。

        Returns:
            logits: 输出 logits，形状 (batch_size, seq_len, vocab_size)。
            all_topk_gates: 每层 top-k 门控权重列表。
            all_topk_indices: 每层选中专家索引列表。
            all_aux_losses: 每层负载均衡损失列表。
        """
        B, S = input_ids.shape
        device = input_ids.device

        positions = torch.arange(S, dtype=torch.long, device=device).unsqueeze(0).expand(B, S)

        x = self.token_embedding(input_ids) + self.position_embedding(positions)
        x = self.emb_dropout(x)

        all_topk_gates: List[torch.Tensor] = []
        all_topk_indices: List[torch.Tensor] = []
        all_aux_losses: List[torch.Tensor] = []

        for layer in self.layers:
            x, topk_gates, topk_indices, aux_loss = layer(x, mask=mask)
            all_topk_gates.append(topk_gates)
            all_topk_indices.append(topk_indices)
            all_aux_losses.append(aux_loss)

        x = self.final_norm(x)
        logits = self.lm_head(x)

        return logits, all_topk_gates, all_topk_indices, all_aux_losses


def compute_total_aux_loss(aux_losses: List[torch.Tensor], alpha: float = 0.01) -> torch.Tensor:
    """
    汇总所有层的负载均衡辅助损失。

    Args:
        aux_losses: 各层 aux_loss 列表。
        alpha: 辅助损失系数。

    Returns:
        总辅助损失。
    """
    total = sum(aux_losses)
    return alpha * total
