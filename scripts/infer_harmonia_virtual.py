#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
infer_harmonia_virtual.py
=========================

虚拟合鸣（Harmonia-13）推理脚本——替代现实 PyTorch 版

加载虚拟训练的合鸣模型，进行推理生成。
不依赖 PyTorch，纯虚拟，走免费路 😂

用法：
    python scripts/infer_harmonia_virtual.py
    python scripts/infer_harmonia_virtual.py --prompt "什么是MoE？"
    python scripts/infer_harmonia_virtual.py --interactive
"""

import os
import sys
import json
import argparse

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)
_FUSION_DIR = os.path.join(_PROJECT_ROOT, "fusion_engine")
if _FUSION_DIR not in sys.path:
    sys.path.insert(0, _FUSION_DIR)

from moe.virtual_architecture import VirtualMoEModel, EXPERT_DOMAINS, MODEL_NAME, MODEL_NAME_CN


def load_model(ckpt_dir: str) -> VirtualMoEModel:
    """加载虚拟合鸣模型"""
    state_path = os.path.join(ckpt_dir, "virtual_moe_model.json")
    if not os.path.exists(state_path):
        raise FileNotFoundError(f"未找到虚拟模型: {state_path}")

    with open(state_path, "r", encoding="utf-8") as f:
        state = json.load(f)

    # 重建模型
    model = VirtualMoEModel(
        num_experts=state.get("num_experts", 13),
        top_k=state.get("top_k", 2),
    )
    model.training_progress = state.get("training_progress", 0.0)
    model.is_trained = state.get("is_trained", False)
    model.training_state = state.get("training_state", "UNTRAINED")
    model.owner = state.get("owner")

    # 加载专家 n-gram
    for expert in model.experts:
        ngram_path = os.path.join(ckpt_dir, f"expert_{expert.expert_id}", "ngram.json")
        if os.path.exists(ngram_path):
            with open(ngram_path, "r", encoding="utf-8") as f:
                expert.ngram_table = json.load(f)
            # 模拟知识库
            expert.knowledge_base = list(set(
                k for k in expert.ngram_table.keys() if len(k) > 0
            ))[:100]
            expert.training_progress = model.training_progress

    print(f"[Load] 加载虚拟{MODEL_NAME_CN}模型: {ckpt_dir}")
    print(f"  参数量: {model.total_params_str}")
    print(f"  训练进度: {model.training_progress*100:.1f}%")
    print(f"  状态: {model.training_state}")
    print(f"  专家知识量:")
    for e in model.experts:
        print(f"    [{e.expert_id}] {e.domain}: {len(e.ngram_table)} n-gram")

    return model


def generate(model: VirtualMoEModel, prompt: str, max_tokens: int = 64) -> str:
    """生成文本，显示路由信息"""
    # 路由
    expert_indices, gate_weights = model.gate.route(prompt)
    routed = [model.experts[i].domain for i in expert_indices]

    print(f"\n{'='*60}")
    print(f"输入: {prompt}")
    print(f"路由专家: {routed}")
    print(f"门控权重: {[f'{w:.3f}' for w in gate_weights]}")
    print(f"{'='*60}")

    output = model.generate(prompt, max_new_tokens=max_tokens)
    print(f"输出: {output}")
    return output


def interactive(model: VirtualMoEModel):
    """交互模式"""
    print(f"\n🎵 {MODEL_NAME_CN}（{MODEL_NAME}）虚拟模型 · 交互模式")
    print(f"   输入 exit 退出")
    print(f"{'='*60}")

    while True:
        try:
            prompt = input("\n你: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n再见！")
            break

        if prompt.lower() in ("exit", "quit", "退出", "q"):
            print("再见！")
            break
        if not prompt:
            continue

        generate(model, prompt, max_tokens=80)


def parse_args():
    parser = argparse.ArgumentParser(description=f"虚拟{MODEL_NAME_CN}推理")
    parser.add_argument("--prompt", type=str, help="输入提示")
    parser.add_argument("--ckpt", type=str,
                        default=os.path.join(_PROJECT_ROOT, "checkpoints",
                                             "harmonia_virtual", "final"),
                        help="模型目录")
    parser.add_argument("--interactive", "-i", action="store_true", help="交互模式")
    parser.add_argument("--max-tokens", type=int, default=64, help="最大生成长度")
    return parser.parse_args()


def main():
    args = parse_args()

    model = load_model(args.ckpt)

    if args.interactive:
        interactive(model)
    elif args.prompt:
        generate(model, args.prompt, max_tokens=args.max_tokens)
    else:
        # 默认演示
        test_prompts = [
            "什么是MoE？",
            "采样点能产出什么？",
            "零点能是什么？",
        ]
        for p in test_prompts:
            generate(model, p, max_tokens=50)


if __name__ == "__main__":
    main()
