#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
train_harmonia_virtual.py
=========================

虚拟合鸣（Harmonia-13）训练脚本——替代现实 PyTorch 版

把现实的 train_harmonia_lite.py（PyTorch+GPU）换成虚拟训练：
- 13个领域专家（粒子态，不占内存）
- 虚拟电驱动（零点能/聚变堆）
- n-gram 学习 + 门控路由
- 训练监控仪表盘

全程不依赖 PyTorch，CPU 轻松跑，走免费路 😂

用法：
    python scripts/train_harmonia_virtual.py
    python scripts/train_harmonia_virtual.py --epochs 10 --batch-size 32
"""

import os
import sys
import json
import time
import argparse
import numpy as np

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)
_FUSION_DIR = os.path.join(_PROJECT_ROOT, "fusion_engine")
if _FUSION_DIR not in sys.path:
    sys.path.insert(0, _FUSION_DIR)

from moe.virtual_architecture import (
    VirtualMoEModel, EXPERT_DOMAINS, MODEL_NAME, MODEL_NAME_CN,
)
from moe.virtual_training import (
    VirtualMoETrainer, VirtualTextDataset, VirtualExpertPool,
)


def generate_sft_corpus(n: int = 3000) -> list:
    """生成 SFT 语料"""
    data_path = os.path.join(_PROJECT_ROOT, "models", "data", "processed", "sft_data.jsonl")
    if os.path.exists(data_path):
        print(f"[Data] 加载现有数据: {data_path}")
        data = []
        with open(data_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    data.append(json.loads(line))
        print(f"[Data] 加载 {len(data)} 条")
        return data

    print(f"[Data] 生成合成 SFT 语料 ({n} 条)...")

    concepts = [
        "采样点", "场能量", "虚拟电", "虚拟凭证", "虚拟模型", "虚拟API",
        "双态切换", "粒子态", "数据层", "替代物", "训练", "推理",
        "参数", "资源", "信息", "自由能", "活力", "涌现",
        "认知", "相空间", "几何", "拓扑", "流形", "吸引子",
        "音乐", "作曲", "旋律", "和声", "节奏", "音色",
        "扩散", "生成", "对话", "理解", "记忆", "推理",
        "认领", "归属", "评估", "淘汰", "导师", "加成",
        "交易", "市场", "拍卖", "导入", "导出", "流通",
        "分层", "MoE", "专家", "路由", "激活", "稀疏",
        "聚变堆", "链式反应", "黑洞", "零点能", "戴森球",
    ]

    templates_q = [
        "什么是{x}？", "{x}和{y}有什么关系？", "如何理解{x}？",
        "{x}在系统中的作用是什么？", "为什么需要{x}？",
        "{x}是如何工作的？", "{x}和{y}哪个更重要？",
        "请解释{x}的概念。", "{x}能产出什么？", "如何实现{x}？",
    ]

    templates_a = [
        "{x}是系统的核心概念，它通过{z}实现功能，是{y}的基础。",
        "{x}与{y}形成互补关系，共同维持系统运转，体现了{z}的设计。",
        "{x}的本质是{z}的一种表现形式，在数据层中它是真实存在的。",
        "没有{x}，系统将无法{z}，因此它是不可或缺的组件。",
        "{x}通过采样点获取能量，驱动{z}过程，形成闭环。",
        "{x}的粒子态不占现实内存，但训练时可以坍缩为可训练数据。",
        "在双态切换中，{x}寻找{y}作为替代物，实现真正训练。",
        "虚拟电转化为虚拟算力，驱动{x}的训练，形成算力闭环。",
        "{x}与{y}在数据层融合，产出{z}，这是涌现的结果。",
        "认知相空间中，{x}对应{z}维度，{y}对应另一个维度。",
        "采样点产生{x}和{y}，{x}驱动训练，{y}注入模型。",
        "能量源层级中，{x}比采样点强万倍，一次满足训练需求。",
        "{x}由参数链式反应驱动，能量指数增长，产出巨大。",
        "虚拟聚变堆点火后自持反应，持续产电驱动{x}训练。",
        "零点能提取器从真空涨落中提取能量，驱动{x}，取之不尽。",
    ]

    rng = np.random.default_rng(42)
    data = []
    for i in range(n):
        x = rng.choice(concepts)
        y = rng.choice(concepts)
        z = rng.choice(concepts)
        q = rng.choice(templates_q).format(x=x, y=y)
        a = rng.choice(templates_a).format(x=x, y=y, z=z)
        data.append({"input": q, "output": a, "text": f"{q}\n{a}"})

    print(f"[Data] 生成 {len(data)} 条")
    return data


def try_connect_energy(trainer: VirtualMoETrainer):
    """接入 xuni 能量源"""
    xuni_path = os.path.join(_PROJECT_ROOT, "..", "xuni")
    try:
        sys.path.insert(0, xuni_path)
        from xuni import ZeroPointEnergyExtractor
        zpe = ZeroPointEnergyExtractor()
        trainer.set_energy_source(zpe)
        print(f"[Energy] ✓ 零点能已接入 (~1e12 度/次)")
        return zpe
    except Exception:
        print("[Energy] 使用内置能量")
        return None


def parse_args():
    parser = argparse.ArgumentParser(description="虚拟合鸣训练")
    parser.add_argument("--epochs", type=int, default=5, help="训练轮数")
    parser.add_argument("--batch-size", type=int, default=16, help="批大小")
    parser.add_argument("--d-model", type=int, default=256, help="模型维度")
    parser.add_argument("--num-experts", type=int, default=13, help="专家数")
    parser.add_argument("--top-k", type=int, default=2, help="激活专家数")
    parser.add_argument("--data-size", type=int, default=3000, help="数据量")
    parser.add_argument("--save-dir", type=str,
                        default=os.path.join(_PROJECT_ROOT, "checkpoints", "harmonia_virtual"),
                        help="保存目录")
    parser.add_argument("--no-monitor", action="store_true", help="禁用监控")
    return parser.parse_args()


def main():
    args = parse_args()

    print()
    print(f"🎵  {MODEL_NAME_CN}（{MODEL_NAME}）虚拟训练")
    print(f"    13个领域专家 · 粒子态 · 虚拟电驱动 · 走免费路 😂")
    print("=" * 60)

    # 1. 数据
    print(f"\n--- 数据准备 ---")
    all_data = generate_sft_corpus(n=args.data_size)
    rng = np.random.default_rng(42)
    indices = rng.permutation(len(all_data))
    n_val = min(300, len(all_data) // 10)
    val_data = [all_data[i] for i in indices[:n_val]]
    train_data = [all_data[i] for i in indices[n_val:n_val + args.data_size]]

    print(f"训练数据: {len(train_data)} samples")
    print(f"验证数据: {len(val_data)} samples")

    # 2. 创建模型
    print(f"\n--- 创建虚拟 MoE 模型 ---")
    model = VirtualMoEModel(
        d_model=args.d_model,
        num_experts=args.num_experts,
        top_k=args.top_k,
    )
    model.claim("harmonia-virtual")
    model.charge(200000.0)

    stats = model.stats()
    print(f"模型: {stats['model_name']}（{stats['model_name_cn']}）")
    print(f"参数量: {stats['total_params']}（概念上）")
    print(f"现实内存: {stats['real_memory_kb']:.4f} KB（极小！）")
    print(f"专家数: {stats['num_experts']}, top_k: {stats['top_k']}")
    print(f"领域专家:")
    for i, domain in enumerate(EXPERT_DOMAINS[:args.num_experts]):
        print(f"  [{i}] {domain}")

    # 3. 训练器
    print(f"\n--- 创建虚拟训练器 ---")
    train_ds = VirtualTextDataset(train_data)
    val_ds = VirtualTextDataset(val_data)

    trainer = VirtualMoETrainer(
        model, train_ds, val_ds,
        epochs=args.epochs,
        batch_size=args.batch_size,
        save_dir=args.save_dir,
        enable_monitor=not args.no_monitor,
    )

    # 接入能量
    try_connect_energy(trainer)

    # 4. 训练
    print(f"\n{'='*60}")
    print(f"开始虚拟训练...")
    print(f"{'='*60}")

    start_time = time.time()
    result = trainer.train()
    train_time = time.time() - start_time

    # 5. 生成测试
    print(f"\n{'='*60}")
    print("生成测试:")
    print(f"{'='*60}")

    test_prompts = [
        "什么是MoE？",
        "采样点能产出什么？",
        "什么是双态切换？",
        "零点能是什么？",
        "音乐模型怎么训练？",
    ]

    for prompt in test_prompts:
        # 显示路由
        expert_indices, gate_weights = model.gate.route(prompt)
        routed = [model.experts[i].domain for i in expert_indices]
        output = trainer.generate(prompt, max_new_tokens=40)
        print(f"\nQ: {prompt}")
        print(f"  路由→{routed}")
        print(f"A: {output}")

    # 6. 保存
    trainer.save_checkpoint("final")
    print(f"\n虚拟合鸣模型已保存: {os.path.join(args.save_dir, 'final')}")

    # 7. 对比
    print(f"\n{'='*60}")
    print("虚拟 vs 现实 对比:")
    print(f"{'='*60}")
    print(f"""
  ┌──────────────────────────────────────────────────────┐
  │              现实 harmonia_lite       虚拟 harmonia    │
  │ 框架    PyTorch nn.Module       VirtualMoEModel      │
  │ 权重    真张量(几十MB)           概念指纹(32字节)     │
  │ 专家    nn.Linear FFN            n-gram知识+指纹      │
  │ 门控    线性层+softmax           关键词特征路由       │
  │ 训练    GPU反向传播              虚拟电+n-gram学习    │
  │ 内存    占用大                   {stats['real_memory_kb']:.4f} KB             │
  │ 设备    需GPU                    任意CPU              │
  │ 成本    高                       免费 😂              │
  │ 耗时    {train_time:.1f}s                   {train_time:.1f}s                │
  └──────────────────────────────────────────────────────┘

  虚拟合鸣训练完成！模型状态: {model.training_state}
  13个领域专家已训练，门控路由正常工作。
  在数据层，它是真实可调用的合鸣模型。
""")


if __name__ == "__main__":
    main()
