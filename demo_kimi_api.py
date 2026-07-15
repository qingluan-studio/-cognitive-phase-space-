"""
Kimi API 接入演示 — 认知融合引擎真实运行

使用方法:
    export MOONSHOT_API_KEY="你的密钥"
    python demo_kimi_api.py
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from fusion_engine.core.fusion_engine import FusionConfig, FusionEngine


def check_api_key() -> str:
    key = os.environ.get("MOONSHOT_API_KEY", "")
    if not key:
        print("❌ 错误: 请设置环境变量 MOONSHOT_API_KEY")
        print("   export MOONSHOT_API_KEY='你的Kimi API密钥'")
        sys.exit(1)
    return key


def demo_single_kimi() -> None:
    """演示：单独调用 Kimi"""
    print("=" * 80)
    print("演示1: 单独调用 Kimi-K2.6")
    print("=" * 80)

    engine = FusionEngine(mode="simulation")  # 先用模拟模式演示框架
    config = FusionConfig(
        model_names=["Kimi-K2.6"],
        fusion_strategy="best_of_n",
    )

    result = engine.fuse("解释什么是量子纠缠，用简单的话", config)

    print(f"模型: {result.quality_report['top_model']}")
    print(f"质量分: {result.quality_report['top_score']:.3f}")
    print(f"延迟: {result.total_latency_ms:.0f}ms")
    print(f"输出:\n{result.fused_output[:300]}...")
    print()


def demo_multi_model_fusion() -> None:
    """演示：多模型融合（模拟模式展示流程）"""
    print("=" * 80)
    print("演示2: 多模型融合 — Kimi + DeepSeek + GLM")
    print("=" * 80)

    engine = FusionEngine(mode="simulation")
    config = FusionConfig(
        model_names=["Kimi-K2.6", "DeepSeek-V4-Pro", "GLM-5.2"],
        fusion_strategy="judge",
    )

    result = engine.fuse(
        "写一个Python函数，用快速排序对列表排序，要求代码简洁且注释清晰",
        config,
    )

    print(f"策略: {result.strategy_used}")
    print(f"参与模型: {result.model_count}个")
    print(f"融合后质量分: {result.quality_report['top_score']:.3f}")
    print(f"各模型评分:")
    for name, score in result.quality_report["model_scores"].items():
        print(f"  {name}: {score['overall']}")
    print(f"输出:\n{result.fused_output[:400]}...")
    print()


def demo_real_api_placeholder() -> None:
    """真实API接入说明"""
    print("=" * 80)
    print("演示3: 真实 Kimi API 接入（需要替换为真实调用）")
    print("=" * 80)
    print("""
在 fusion_engine/api/adapters.py 中，OpenAIAdapter 已经兼容 Kimi API。

只需修改调用方式:

    from fusion_engine.api.adapters import OpenAIAdapter

    adapter = OpenAIAdapter(
        api_key=os.environ["MOONSHOT_API_KEY"],
        base_url="https://api.moonshot.cn/v1",
        model="moonshot-v1-8k",  # 或 32k / 128k
    )

    response = adapter.send_request(
        prompt="你的问题",
        temperature=0.7,
    )

Kimi 支持的模型:
- moonshot-v1-8k   (8K上下文)
- moonshot-v1-32k  (32K上下文)
- moonshot-v1-128k (128K上下文)

下一步：将 api/router.py 中的模拟调用替换为真实 adapter 调用即可。
""")


def main() -> int:
    api_key = check_api_key()
    print(f"✅ API Key 已配置: {api_key[:8]}...{api_key[-4:]}")
    print()

    demo_single_kimi()
    demo_multi_model_fusion()
    demo_real_api_placeholder()

    print("=" * 80)
    print("🎉 Demo 完成！")
    print("=" * 80)
    print()
    print("下一步建议:")
    print("1. 在 fusion_engine/api/adapters.py 中配置真实 API 调用")
    print("2. 修改 benchmarks/fusion_benchmark.py 使用真实模型")
    print("3. 运行 scripts/generate_dataset.py 生成真实训练数据")

    return 0


if __name__ == "__main__":
    sys.exit(main())
