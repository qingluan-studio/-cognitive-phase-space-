# -*- coding: utf-8 -*-
"""
moe/weight_merging.py
=====================

权重合并算法实现。
用于从 13 个领域特定的微调模型中提取知识，
通过 TIES-Merging、SLERP 与 Task Vector 加法生成 MoE 专家的初始化权重。
"""

from typing import Dict, List, Optional
import copy

import torch
import torch.nn as nn


# --------------------------------------------------------------------------- #
# 工具函数
# --------------------------------------------------------------------------- #

def state_dict_to_vector(state_dict: Dict[str, torch.Tensor]) -> torch.Tensor:
    """
    将 state_dict 中所有参数展平并拼接为一个一维向量。

    Args:
        state_dict: 模型参数字典。

    Returns:
        拼接后的一维张量。
    """
    return torch.cat([v.reshape(-1) for v in state_dict.values()])


def vector_to_state_dict(vector: torch.Tensor, reference_state_dict: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
    """
    将一维向量按照参考 state_dict 的形状还原为参数字典。

    Args:
        vector: 一维参数向量。
        reference_state_dict: 参考形状的字典。

    Returns:
        还原后的参数字典。
    """
    new_state_dict = {}
    offset = 0
    for key, ref_tensor in reference_state_dict.items():
        numel = ref_tensor.numel()
        new_state_dict[key] = vector[offset : offset + numel].reshape(ref_tensor.shape)
        offset += numel
    return new_state_dict


def check_state_dicts_align(state_dicts: List[Dict[str, torch.Tensor]]) -> None:
    """
    检查多个 state_dict 的键和形状是否完全一致。

    Args:
        state_dicts: 参数字典列表。

    Raises:
        ValueError: 键或形状不一致时抛出。
    """
    if len(state_dicts) < 2:
        return
    first = state_dicts[0]
    for idx, sd in enumerate(state_dicts[1:], start=2):
        if set(first.keys()) != set(sd.keys()):
            raise ValueError(f"第 {idx} 个 state_dict 的键与第一个不一致")
        for k in first:
            if first[k].shape != sd[k].shape:
                raise ValueError(f"参数 '{k}' 的形状在第 {idx} 个 state_dict 中不一致")


# --------------------------------------------------------------------------- #
# Task Vector 加法
# --------------------------------------------------------------------------- #

def compute_task_vectors(
    pretrained_state_dict: Dict[str, torch.Tensor],
    finetuned_state_dicts: List[Dict[str, torch.Tensor]],
) -> List[Dict[str, torch.Tensor]]:
    """
    计算任务向量：tau_i = theta_i - theta_0。

    Args:
        pretrained_state_dict: 预训练基础模型参数。
        finetuned_state_dicts: 微调模型参数列表。

    Returns:
        任务向量列表。
    """
    check_state_dicts_align([pretrained_state_dict] + finetuned_state_dicts)
    task_vectors = []
    for ft_sd in finetuned_state_dicts:
        tv = {k: ft_sd[k] - pretrained_state_dict[k] for k in pretrained_state_dict}
        task_vectors.append(tv)
    return task_vectors


def task_vector_addition(
    pretrained_state_dict: Dict[str, torch.Tensor],
    finetuned_state_dicts: List[Dict[str, torch.Tensor]],
    weights: Optional[List[float]] = None,
) -> Dict[str, torch.Tensor]:
    """
    Task Vector 加法（Task Arithmetic）。

    将多个微调模型相对于预训练基座的任务向量进行加权求和，
    然后加回到预训练参数上，得到合并后的模型。

    公式:
        theta* = theta_0 + sum_i(lambda_i * (theta_i - theta_0))

    Args:
        pretrained_state_dict: 预训练模型参数。
        finetuned_state_dicts: 微调模型参数列表。
        weights: 每个微调模型的权重系数 lambda_i。若为 None，则取平均。

    Returns:
        合并后的参数字典。
    """
    task_vectors = compute_task_vectors(pretrained_state_dict, finetuned_state_dicts)
    n = len(task_vectors)

    if weights is None:
        weights = [1.0 / n] * n
    else:
        if len(weights) != n:
            raise ValueError("weights 长度必须与 finetuned_state_dicts 数量一致")
        # 归一化
        total = sum(weights)
        weights = [w / total for w in weights]

    merged = copy.deepcopy(pretrained_state_dict)
    for w, tv in zip(weights, task_vectors):
        for k in merged:
            merged[k] = merged[k] + w * tv[k]

    return merged


# --------------------------------------------------------------------------- #
# SLERP（Spherical Linear Interpolation）
# --------------------------------------------------------------------------- #

def slerp(
    tensor0: torch.Tensor,
    tensor1: torch.Tensor,
    t: float = 0.5,
    eps: float = 1e-7,
) -> torch.Tensor:
    """
    对两个张量执行球面线性插值（SLERP）。

    将展平后的张量视为高维向量，分别对方向（单位向量）和模长进行插值。

    公式:
        omega = arccos( <v0, v1> )
        direction = sin((1-t)*omega)/sin(omega) * v0 + sin(t*omega)/sin(omega) * v1
        magnitude = (1-t)*||w0|| + t*||w1||
        result = magnitude * direction

    Args:
        tensor0: 第一个张量。
        tensor1: 第二个张量。
        t: 插值系数，范围 [0, 1]。
        eps: 数值稳定常数。

    Returns:
        插值后的张量，形状与输入一致。
    """
    if not (0.0 <= t <= 1.0):
        raise ValueError("t 必须在 [0, 1] 区间内")

    original_shape = tensor0.shape
    v0 = tensor0.reshape(-1)
    v1 = tensor1.reshape(-1)

    # 模长
    norm0 = torch.norm(v0)
    norm1 = torch.norm(v1)

    # 方向（单位向量）
    if norm0 < eps or norm1 < eps:
        # 若其中一个接近零向量，退化为线性插值
        return ((1 - t) * tensor0 + t * tensor1).clone()

    u0 = v0 / norm0
    u1 = v1 / norm1

    dot = torch.sum(u0 * u1)
    dot = torch.clamp(dot, -1.0 + eps, 1.0 - eps)

    omega = torch.acos(dot)

    if omega.abs() < eps:
        # 若夹角接近 0，退化为线性插值
        interp = (1 - t) * v0 + t * v1
    else:
        sin_omega = torch.sin(omega)
        coeff0 = torch.sin((1 - t) * omega) / sin_omega
        coeff1 = torch.sin(t * omega) / sin_omega
        interp = coeff0 * v0 + coeff1 * v1

    # 模长插值
    magnitude = (1 - t) * norm0 + t * norm1
    # 归一化后重新缩放
    interp_norm = torch.norm(interp)
    if interp_norm > eps:
        interp = interp * (magnitude / interp_norm)

    return interp.reshape(original_shape)


def slerp_state_dicts(
    state_dict0: Dict[str, torch.Tensor],
    state_dict1: Dict[str, torch.Tensor],
    t: float = 0.5,
) -> Dict[str, torch.Tensor]:
    """
    对两个完整的 state_dict 逐参数执行 SLERP。

    Args:
        state_dict0: 第一个模型参数。
        state_dict1: 第二个模型参数。
        t: 插值系数。

    Returns:
        合并后的参数字典。
    """
    check_state_dicts_align([state_dict0, state_dict1])
    merged = {}
    for key in state_dict0:
        merged[key] = slerp(state_dict0[key], state_dict1[key], t=t)
    return merged


# --------------------------------------------------------------------------- #
# TIES-Merging（TrIm, Elect Sign & Merge）
# --------------------------------------------------------------------------- #

def ties_merging(
    pretrained_state_dict: Dict[str, torch.Tensor],
    finetuned_state_dicts: List[Dict[str, torch.Tensor]],
    reset_thresh: float = 0.2,
    merge_func: str = "dis-mean",
) -> Dict[str, torch.Tensor]:
    """
    TIES-Merging 算法实现。

    核心步骤：
        1. Trim（修剪）：对每个任务向量，只保留按绝对值排序后 top-reset_thresh 比例的参数，
           其余置零，减少参数干扰。
        2. Elect Sign（选举符号）：对每个参数位置，根据多数投票或平均符号确定统一符号。
        3. Merge（合并）：只保留与统一符号一致的任务向量参数，并求平均，
           最后加回到预训练基座上。

    Args:
        pretrained_state_dict: 预训练模型参数。
        finetuned_state_dicts: 微调模型参数列表（例如来自 13 个领域专家）。
        reset_thresh: 修剪阈值（保留比例），如 0.2 表示保留 top-20%。
        merge_func: 符号聚合方式，可选 "mean"（平均符号）或 "dis-mean"（ Disjoint Mean）。

    Returns:
        合并后的参数字典。
    """
    if not (0.0 < reset_thresh <= 1.0):
        raise ValueError("reset_thresh 必须在 (0, 1] 区间内")

    n = len(finetuned_state_dicts)
    if n == 0:
        return copy.deepcopy(pretrained_state_dict)

    # 1. 计算任务向量
    task_vectors = compute_task_vectors(pretrained_state_dict, finetuned_state_dicts)

    # 2. Trim：对每个任务向量进行稀疏化
    trimmed_vectors: List[Dict[str, torch.Tensor]] = []
    for tv in task_vectors:
        trimmed = {}
        for key, param in tv.items():
            flat = param.reshape(-1)
            k = max(1, int(reset_thresh * flat.numel()))
            # 计算绝对值阈值
            threshold = torch.topk(flat.abs(), k, largest=True, sorted=False).values.min()
            mask = (flat.abs() >= threshold).float()
            trimmed[key] = (flat * mask).reshape(param.shape)
        trimmed_vectors.append(trimmed)

    # 3. Elect Sign & 4. Merge
    merged_task_vector = {}
    keys = list(pretrained_state_dict.keys())

    for key in keys:
        # 收集所有模型在该参数上的修剪后任务向量
        deltas = torch.stack([tv[key] for tv in trimmed_vectors], dim=0)  # (n, *shape)

        # 符号选举：按位置计算多数符号或平均符号
        if merge_func == "mean":
            # 简单平均符号
            elected_sign = torch.sign(deltas.mean(dim=0))
        elif merge_func == "dis-mean":
            # Disjoint Mean：先计算各任务向量的平均，再取符号
            elected_sign = torch.sign(deltas.mean(dim=0))
        else:
            raise ValueError(f"不支持的 merge_func: {merge_func}")

        # 将 0 符号强制为 +1，避免丢弃
        elected_sign[elected_sign == 0] = 1.0

        # 创建符号一致掩码
        sign_masks = []
        for i in range(n):
            sign_mask = (torch.sign(deltas[i]) == elected_sign).float()
            sign_masks.append(sign_mask)
        sign_masks = torch.stack(sign_masks, dim=0)

        # 只保留符号一致的参数，并求平均
        aligned = deltas * sign_masks
        count = sign_masks.sum(dim=0).clamp(min=1.0)  # 避免除以 0
        merged_delta = aligned.sum(dim=0) / count

        merged_task_vector[key] = merged_delta

    # 5. 加回到预训练基座
    final_state_dict = copy.deepcopy(pretrained_state_dict)
    for key in keys:
        final_state_dict[key] = final_state_dict[key] + merged_task_vector[key]

    return final_state_dict


# --------------------------------------------------------------------------- #
# 高级合并接口
# --------------------------------------------------------------------------- #

def merge_multiple_models(
    pretrained_state_dict: Dict[str, torch.Tensor],
    finetuned_state_dicts: List[Dict[str, torch.Tensor]],
    method: str = "ties",
    method_kwargs: Optional[dict] = None,
) -> Dict[str, torch.Tensor]:
    """
    统一入口：根据指定方法合并多个微调模型。

    Args:
        pretrained_state_dict: 预训练基座参数。
        finetuned_state_dicts: 微调模型参数列表。
        method: 合并方法，可选 "ties", "task_vector", "slerp"。
                当 method="slerp" 时，目前仅支持两两插值，若列表长度 >2 则取前两个并告警。
        method_kwargs: 额外参数，传递给具体合并函数。

    Returns:
        合并后的参数字典。
    """
    if method_kwargs is None:
        method_kwargs = {}

    if method == "ties":
        return ties_merging(pretrained_state_dict, finetuned_state_dicts, **method_kwargs)
    elif method == "task_vector":
        return task_vector_addition(pretrained_state_dict, finetuned_state_dicts, **method_kwargs)
    elif method == "slerp":
        if len(finetuned_state_dicts) < 2:
            raise ValueError("SLERP 至少需要两个模型")
        if len(finetuned_state_dicts) > 2:
            # 简单处理：对前两个做 SLERP，忽略其余
            finetuned_state_dicts = finetuned_state_dicts[:2]
        return slerp_state_dicts(finetuned_state_dicts[0], finetuned_state_dicts[1], **method_kwargs)
    else:
        raise ValueError(f"未知合并方法: {method}")


def assign_merged_weights_to_expert(
    expert: nn.Module,
    merged_state_dict: Dict[str, torch.Tensor],
    strict: bool = True,
) -> None:
    """
    将合并后的权重加载到单个 Expert 实例中。

    Args:
        expert: Expert 模块实例。
        merged_state_dict: 合并后的参数字典。
        strict: 是否严格匹配。
    """
    missing, unexpected = expert.load_state_dict(merged_state_dict, strict=strict)
    if missing:
        print(f"[警告] 加载 Expert 时缺少键: {missing}")
    if unexpected:
        print(f"[警告] 加载 Expert 时存在未预期的键: {unexpected}")
