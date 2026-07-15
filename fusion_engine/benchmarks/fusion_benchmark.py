"""
认知融合引擎基准测试

测试场景：
1. 简单任务（事实问答）
2. 复杂任务（代码生成）
3. 创意任务（诗歌创作）
4. 混合任务（综合分析）

对比不同融合策略的效果。
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from fusion_engine.core.fusion_engine import FusionConfig, FusionEngine


def main():
    print("=" * 100)
    print("认知融合引擎 (Cognitive Fusion Engine) - 基准测试")
    print("=" * 100)
    print()
    
    # 初始化引擎
    engine = FusionEngine(mode="simulation")
    print(f"✅ 引擎初始化完成")
    print(f"   可用模型: {len(engine.get_model_list())} 个")
    print(f"   可用策略: {', '.join(engine.get_available_strategies())}")
    print()
    
    # 测试用例
    test_cases = [
        {
            "name": "事实问答",
            "prompt": "什么是量子纠缠？请用简单的话解释。",
            "expected_type": "factual",
        },
        {
            "name": "代码生成",
            "prompt": "请写一个Python函数，用快速排序算法对数组排序。",
            "expected_type": "coding",
        },
        {
            "name": "数学推理",
            "prompt": "证明：对于任意正整数n，1+2+...+n = n(n+1)/2。",
            "expected_type": "math",
        },
        {
            "name": "创意写作",
            "prompt": "写一首关于人工智能觉醒的短诗，要有哲理深度。",
            "expected_type": "creative",
        },
        {
            "name": "综合分析",
            "prompt": "分析多模型协同推理的优缺点，并提出改进方案。",
            "expected_type": "reasoning",
        },
    ]
    
    # 策略列表
    strategies = engine.get_available_strategies()
    
    # 运行测试
    all_results = {}
    
    for case in test_cases:
        print(f"\n{'─' * 100}")
        print(f"测试用例: {case['name']}")
        print(f"提示词: {case['prompt'][:60]}...")
        print(f"{'─' * 100}")
        
        case_results = {}
        
        for strategy in strategies:
            config = FusionConfig(
                fusion_strategy=strategy,
                generate_training_data=True,
            )
            
            result = engine.fuse(case["prompt"], config)
            
            case_results[strategy] = {
                "latency_ms": round(result.total_latency_ms, 1),
                "cost": round(result.total_cost, 2),
                "model_count": result.model_count,
                "top_score": round(result.quality_report.get("top_score", 0), 3),
                "avg_score": round(result.quality_report.get("average_score", 0), 3),
                "top_model": result.quality_report.get("top_model", "N/A"),
            }
            
            print(f"  {strategy:<18} | "
                  f"延迟: {result.total_latency_ms:>7.0f}ms | "
                  f"成本: {result.total_cost:>5.2f} | "
                  f"模型数: {result.model_count} | "
                  f"最高分: {result.quality_report.get('top_score', 0):.2f} | "
                  f"最佳: {result.quality_report.get('top_model', 'N/A')}")
        
        all_results[case["name"]] = case_results
    
    # 汇总统计
    print(f"\n{'=' * 100}")
    print("汇总统计")
    print(f"{'=' * 100}")
    
    strategy_summary = {s: {"total_latency": 0, "total_cost": 0, "total_top_score": 0, "total_avg_score": 0, "count": 0} for s in strategies}
    
    for case_name, case_results in all_results.items():
        for strategy, metrics in case_results.items():
            strategy_summary[strategy]["total_latency"] += metrics["latency_ms"]
            strategy_summary[strategy]["total_cost"] += metrics["cost"]
            strategy_summary[strategy]["total_top_score"] += metrics["top_score"]
            strategy_summary[strategy]["total_avg_score"] += metrics["avg_score"]
            strategy_summary[strategy]["count"] += 1
    
    print(f"\n{'策略':<18} {'平均延迟(ms)':>14} {'平均成本':>10} {'平均最高分':>12} {'平均均分':>10}")
    print("-" * 100)
    
    for strategy, stats in strategy_summary.items():
        count = stats["count"]
        if count > 0:
            avg_latency = stats["total_latency"] / count
            avg_cost = stats["total_cost"] / count
            avg_top = stats["total_top_score"] / count
            avg_avg = stats["total_avg_score"] / count
            print(f"{strategy:<18} {avg_latency:>13.0f} {avg_cost:>9.2f} {avg_top:>11.3f} {avg_avg:>9.3f}")
    
    print("=" * 100)
    
    # 保存详细结果
    output_file = Path(__file__).parent / "benchmark_results.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 详细结果已保存到: {output_file}")
    
    # 关键发现
    print(f"\n{'=' * 100}")
    print("关键发现（基于模拟数据）")
    print(f"{'=' * 100}")
    
    best_latency = min(strategy_summary.items(), key=lambda x: x[1]["total_latency"] / x[1]["count"])
    best_quality = max(strategy_summary.items(), key=lambda x: x[1]["total_top_score"] / x[1]["count"])
    
    print(f"🏃 最快策略: {best_latency[0]}")
    print(f"🏆 最高质量策略: {best_quality[0]}")
    print(f"\n⚠️  注意：以上结果是基于模拟数据，真实API调用可能有显著差异")
    print(f"   建议下一步：接入真实API，在标准benchmark上验证")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
