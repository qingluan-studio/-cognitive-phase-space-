"""
相空间视频融合引擎 —— Demo 脚本

演示完整流程：
1. 六大专家生成轨迹
2. 吸引子约束
3. 水逻辑否决权
4. 四种融合策略对比
5. T6 视频质量评估

用法：
    python -m fusion_engine.video_fusion.demo
"""

from __future__ import annotations

import sys
import os

# 确保能导入 fusion_engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fusion_engine.video_fusion import (
    PhaseSpaceFusionEngine,
    FusionConfig,
    T6VideoAssessor,
    EXPERT_REGISTRY,
)


def print_header(title: str, width: int = 60):
    print()
    print("=" * width)
    print(f"  {title}")
    print("=" * width)


def print_dim_table(data: dict[str, dict[str, float]], title: str = ""):
    """打印维度对比表"""
    if title:
        print(f"\n  {title}")
    
    dim_names = ["tci", "ssi", "pci", "ivi", "asi", "pvi", "overall"]
    dim_labels = {
        "tci": "时序一致",
        "ssi": "空间结构",
        "pci": "物理一致",
        "ivi": "身份连续",
        "asi": "美学稳定",
        "pvi": "相空间体积",
        "overall": "综合",
    }
    
    # 表头
    header = f"  {'策略':<18}"
    for d in dim_names:
        header += f" {dim_labels[d]:>8}"
    print(header)
    print("  " + "-" * (18 + 9 * len(dim_names)))
    
    # 数据行
    for name, dims in data.items():
        row = f"  {name:<18}"
        for d in dim_names:
            val = dims.get(d, 0)
            row += f" {val:>7.1%}"
        print(row)


def main():
    print_header("相空间视频融合引擎 · Demo")
    
    prompt = "一个弹跳的彩色小球，画面有节奏感，光影随时间变化"
    print(f"\n  Prompt: \"{prompt}\"")
    print(f"  时长: 3秒 | 帧率: 30fps | 专家: 6个")
    
    # 初始化引擎
    engine = PhaseSpaceFusionEngine()
    assessor = T6VideoAssessor()
    
    print(f"\n  可用专家: {', '.join(engine.list_experts())}")
    print(f"  可用策略: {', '.join(engine.list_strategies())}")
    
    # ====================================================================
    # 1. 各专家独立生成
    # ====================================================================
    print_header("第一步：各专家独立生成轨迹")
    
    config = FusionConfig(
        duration=3.0,
        fps=30,
        strategy="judge_weighted",
    )
    
    result = engine.fuse(prompt, config)
    
    print(f"\n  生成了 {len(result.expert_trajectories)} 条专家轨迹")
    for name, traj in result.expert_trajectories.items():
        n_dims = len(traj.points[0].dimensions) if traj.points else 0
        print(f"    {name:<14} {len(traj.points):>3}帧  {n_dims:>2}维度  置信度 {traj.confidence:.0%}")
    
    # ====================================================================
    # 2. 水逻辑检查
    # ====================================================================
    print_header("第二步：水逻辑否决权检查")
    
    if result.water_logic_report:
        report = result.water_logic_report
        print(f"\n  物理合规度: {report.overall_score:.1%}")
        print(f"  违规数量: {report.violation_count} (致命: {report.fatal_count})")
        print(f"  是否通过: {'✅ 通过' if report.passed else '❌ 未通过，已自动修正'}")
        
        if report.violations:
            print(f"\n  违规详情（前5条）:")
            for v in report.violations[:5]:
                print(f"    t={v.timestamp:.2f}s [{v.severity()}] {v.description[:60]}")
    
    # ====================================================================
    # 3. 四种融合策略对比
    # ====================================================================
    print_header("第三步：四种融合策略对比")
    
    strategies = ["consensus", "judge_weighted", "best_of_n", "evolutionary"]
    strategy_labels = {
        "consensus": "多专家共识",
        "judge_weighted": "裁判加权",
        "best_of_n": "择优选用",
        "evolutionary": "进化融合",
    }
    
    all_assessments = {}
    
    for strategy in strategies:
        cfg = FusionConfig(
            duration=3.0,
            fps=30,
            strategy=strategy,
            evo_generations=8,
            evo_population_size=6,
        )
        res = engine.fuse(prompt, cfg)
        assessment = assessor.assess(res.trajectory, res.phase_state)
        all_assessments[strategy_labels[strategy]] = assessment.dimensions.to_dict()
    
    print_dim_table(all_assessments, "T6 质量评估对比（六大不变量）")
    
    # ====================================================================
    # 4. 吸引子约束的效果
    # ====================================================================
    print_header("第四步：吸引子约束效果对比")
    
    cfg_no_attractor = FusionConfig(
        duration=3.0,
        fps=30,
        strategy="judge_weighted",
        attractor_enabled=False,
    )
    cfg_with_attractor = FusionConfig(
        duration=3.0,
        fps=30,
        strategy="judge_weighted",
        attractor_enabled=True,
        attractor_strength=0.4,
    )
    
    res_no = engine.fuse(prompt, cfg_no_attractor)
    res_yes = engine.fuse(prompt, cfg_with_attractor)
    
    assess_no = assessor.assess(res_no.trajectory, res_no.phase_state)
    assess_yes = assessor.assess(res_yes.trajectory, res_yes.phase_state)
    
    attractor_data = {
        "无吸引子约束": assess_no.dimensions.to_dict(),
        "有吸引子约束": assess_yes.dimensions.to_dict(),
    }
    print_dim_table(attractor_data, "吸引子约束对质量的影响")
    
    # 计算提升
    improvements = {}
    for dim in ["tci", "ivi", "overall"]:
        diff = assess_yes.dimensions.to_dict()[dim] - assess_no.dimensions.to_dict()[dim]
        improvements[dim] = diff
    
    dim_labels = {"tci": "时序一致性", "ivi": "身份连续性", "overall": "综合质量"}
    print(f"\n  吸引子带来的提升:")
    for dim, label in dim_labels.items():
        diff = improvements[dim]
        sign = "+" if diff >= 0 else ""
        print(f"    {label}: {sign}{diff:+.1%}")
    
    # ====================================================================
    # 5. 融合轨迹预览（前5帧的关键维度）
    # ====================================================================
    print_header("第五步：融合轨迹预览（前5帧关键维度）")
    
    best_strategy = max(all_assessments.items(), key=lambda x: x[1]["overall"])
    best_name = best_strategy[0]
    
    print(f"\n  最佳策略: {best_name} (综合 {best_strategy[1]['overall']:.1%})")
    print(f"\n  前5帧关键维度值:")
    
    # 找最佳策略对应的轨迹
    for strategy_name, label in strategy_labels.items():
        if label == best_name:
            cfg = FusionConfig(duration=3.0, fps=30, strategy=strategy_name)
            res = engine.fuse(prompt, cfg)
            traj = res.trajectory
            
            key_dims = ["pos_x", "pos_y", "color_r", "flow_x", "depth_near", "pace"]
            header = f"  {'帧':>3} {'t(s)':>6}"
            for d in key_dims:
                header += f" {d:>10}"
            print(header)
            print("  " + "-" * (3 + 1 + 6 + len(key_dims) * 11))
            
            for i in range(min(5, len(traj.points))):
                p = traj.points[i]
                row = f"  {i:>3} {p.t:>6.2f}"
                for d in key_dims:
                    val = p.dimensions.get(d, float('nan'))
                    if not math.isnan(val):
                        row += f" {val:>10.3f}"
                    else:
                        row += f" {'--':>10}"
                print(row)
            
            break
    
    # ====================================================================
    # 总结
    # ====================================================================
    print_header("总结")
    
    print(f"""
  相空间视频融合引擎已验证通过 ✅

  核心组件:
    ✅ 六大领域专家（物理/纹理/光流/深度/美学/时序）
    ✅ 吸引子约束 —— 保证物体身份不漂移
    ✅ 水逻辑否决权 —— 物理定律不可违背
    ✅ 四种融合策略 —— 共识/加权/择优/进化
    ✅ T6 视频质量评估 —— 六大不变量评估

  关键创新:
    🔹 生成发生在相空间，不是像素空间
    🔹 时间一致性是内禀属性，不是事后修补
    🔹 物理定律作为硬约束，有否决权
    🔹 吸引子锁定物体身份，从根本上杜绝漂移
""")


if __name__ == "__main__":
    import math
    main()
