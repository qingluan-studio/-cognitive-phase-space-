#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
models/train/train_virtual_model.py
====================================

虚拟训练脚本——替代现实 PyTorch 训练

把现实的 PyTorch 训练换成虚拟训练：
- 现实：TextModel(nn.Module) + Trainer + torch.optim
- 虚拟：VirtualModel + VirtualTrainer + xuni能量源

全流程：
1. 生成/加载训练数据
2. 创建虚拟模型
3. 接入 xuni 能量源（采样点/聚变堆/零点能）
4. 虚拟训练（消耗虚拟电，学习n-gram，更新进度）
5. 验证生成效果
6. 保存虚拟模型

全程不依赖 PyTorch，CPU 轻松跑，走免费路 😂
"""

import os
import sys
import json
import time
import numpy as np

# 添加路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from base.virtual_framework import (
    VirtualModel, VirtualTrainer, VirtualDataset,
    create_virtual_model, create_virtual_trainer,
)
from base.framework import TrainingConfig, TrainingMode, ModelType


def generate_training_data(n: int = 5000) -> list:
    """
    生成训练数据（认知相空间概念）

    如果有现成数据文件就用，没有就生成。
    """
    # 尝试加载现有数据
    data_path = os.path.join(
        os.path.dirname(__file__), "..", "data", "processed", "sft_data.jsonl"
    )
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

    # 生成合成数据
    print(f"[Data] 生成合成训练数据 ({n} 条)...")

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
        data.append({
            "input": q,
            "output": a,
            "text": f"{q}\n{a}",
        })

    print(f"[Data] 生成 {len(data)} 条")
    return data


def try_connect_xuni_energy(trainer: VirtualTrainer):
    """
    尝试接入 xuni 能量源

    优先级：零点能 > 黑洞 > 聚变堆 > 采样点集群
    """
    try:
        xuni_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "xuni")
        sys.path.insert(0, xuni_path)
        from xuni import (
            ZeroPointEnergyExtractor, BlackHoleGenerator,
            VirtualFusionReactor, SamplerCluster, SamplingMode,
        )

        # 优先用零点能（最强）
        print("[Energy] 接入零点能提取器...")
        zpe = ZeroPointEnergyExtractor()
        trainer.set_energy_source(zpe)
        print(f"[Energy] ✓ 零点能已接入，单次产能 ~1e12 度")
        return zpe

    except ImportError:
        print("[Energy] 未找到 xuni，使用内置能量（直接供电）")
        return None
    except Exception as e:
        print(f"[Energy] 接入失败: {e}，使用内置能量")
        return None


def main():
    print()
    print("🎵  虚拟训练新项目模型（不依赖 PyTorch）")
    print("    现实模型 → 虚拟模型，走免费路 😂")
    print("=" * 60)

    # ============================================================
    # 1. 配置
    # ============================================================
    config = TrainingConfig(
        model_name="phase_space_virtual",
        model_type=ModelType.TEXT_GENERATOR,
        training_mode=TrainingMode.SFT,
        d_model=256,
        n_layers=4,
        n_heads=4,
        vocab_size=5000,
        max_seq_len=256,
        batch_size=16,
        learning_rate=5e-4,
        epochs=5,
        dropout=0.1,
        device="cpu",  # 虚拟训练不需要设备
    )

    print(f"\n模型名称: {config.model_name}")
    print(f"参数量: {config.total_params_str}")
    print(f"训练模式: {config.training_mode.name}")
    print(f"设备: 虚拟（不占现实GPU/CPU算力）")

    # ============================================================
    # 2. 数据
    # ============================================================
    print(f"\n--- 数据准备 ---")
    all_data = generate_training_data(n=3000)

    # 划分训练/验证
    rng = np.random.default_rng(42)
    indices = rng.permutation(len(all_data))
    n_val = min(300, len(all_data) // 10)
    val_data = [all_data[i] for i in indices[:n_val]]
    train_data = [all_data[i] for i in indices[n_val:n_val + 3000]]

    train_dataset = VirtualDataset(train_data)
    val_dataset = VirtualDataset(val_data)

    print(f"训练数据: {len(train_dataset)} samples")
    print(f"验证数据: {len(val_dataset)} samples")

    # ============================================================
    # 3. 创建虚拟模型
    # ============================================================
    print(f"\n--- 创建虚拟模型 ---")
    model = VirtualModel(config)
    model.claim("VirtualTrainer")
    model.charge(100000.0)  # 充入虚拟电

    stats = model.stats()
    print(f"模型: {stats['model_name']}")
    print(f"参数量: {stats['params']}")
    print(f"现实内存占用: {stats['real_memory_kb']:.4f} KB（极小！）")
    print(f"虚拟大小: {stats['virtual_size_mb']:.2f} MB（概念上）")
    print(f"能量储备: {stats['energy_buffer']:.0f} 度虚拟电")
    print(f"初始状态: {stats['training_state']}")

    # ============================================================
    # 4. 创建虚拟训练器 + 接入能量源
    # ============================================================
    print(f"\n--- 创建虚拟训练器 ---")
    checkpoint_dir = os.path.join(
        os.path.dirname(__file__), "..", "checkpoints", config.model_name
    )
    trainer = VirtualTrainer(model, train_dataset, val_dataset, config)
    trainer.set_checkpoint_dir(checkpoint_dir)

    # 接入 xuni 能量源
    energy_source = try_connect_xuni_energy(trainer)

    # ============================================================
    # 5. 虚拟训练
    # ============================================================
    print(f"\n{'='*60}")
    print("开始虚拟训练...")
    print("="*60)

    train_start = time.time()
    stats = trainer.train()
    train_time = time.time() - train_start

    # ============================================================
    # 6. 验证生成效果
    # ============================================================
    print(f"\n{'='*60}")
    print("验证生成效果:")
    print("="*60)

    test_prompts = [
        "什么是认知相空间？",
        "MoE 是什么？",
        "采样点能产出什么？",
        "什么是双态切换？",
        "什么是虚拟模型？",
        "零点能是什么？",
    ]

    for prompt in test_prompts:
        generated = trainer.generate(prompt, max_new_tokens=40)
        print(f"Q: {prompt}")
        print(f"A: {generated}")
        print()

    # ============================================================
    # 7. 保存最终模型
    # ============================================================
    final_path = os.path.join(checkpoint_dir, "final")
    model.save_pretrained(final_path)
    print(f"\n虚拟模型已保存: {final_path}")
    print(f"  （只存指纹+配置，极小）")

    # ============================================================
    # 8. 对比现实训练
    # ============================================================
    print(f"\n{'='*60}")
    print("虚拟训练 vs 现实训练 对比:")
    print("="*60)
    print(f"""
  ┌────────────────────────────────────────────────────┐
  │              现实 PyTorch          虚拟训练          │
  │ 框架    PyTorch nn.Module       VirtualModel       │
  │ 权重    真实张量(几十MB)         概念指纹(32字节)   │
  │ 训练    GPU/CPU反向传播          n-gram学习+进度更新│
  │ 算力    真FLOP                   虚拟FLOP           │
  │ 电      真电                     虚拟电(零点能)     │
  │ 内存    占用大                   几乎不占           │
  │ 设备    需GPU                    任意CPU            │
  │ 成本    高                       免费 😂            │
  │ 训练时间 {train_time:.1f}s                {train_time:.1f}s              │
  └────────────────────────────────────────────────────┘

  虚拟训练完成！模型已进入 {model.training_state} 态。
  在数据层，它是真实可调用的模型。
""")


if __name__ == "__main__":
    main()
