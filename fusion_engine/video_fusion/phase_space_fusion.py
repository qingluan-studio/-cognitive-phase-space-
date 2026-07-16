"""
相空间融合引擎核心 —— 多专家轨迹融合 + 吸引子约束

融合策略（4种，与 fusion_engine 对应）：
1. consensus     — 多专家共识（对应 majority_vote）
2. judge_weighted — 裁判加权（对应 judge）
3. best_of_n    — 择优选用（对应 best_of_n）
4. evolutionary  — 进化融合（对应 evolutionary）

关键创新：
- 融合发生在相空间，不是像素空间
- 吸引子作为硬约束，物体身份不会漂移
- 水逻辑（物理定律）拥有否决权
"""

from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass, field
from typing import Optional

from .trajectory import (
    TrajectoryPoint,
    VideoTrajectory,
    PhaseSpaceState,
    ObjectIdentity,
    AttractorLandscape,
)

from .experts import (
    BaseExpert,
    PhysicsExpert,
    TextureExpert,
    OpticalFlowExpert,
    DepthExpert,
    AestheticExpert,
    TemporalExpert,
    EXPERT_REGISTRY,
    ExpertConfig,
)

from .water_logic import WaterLogicVeto, VetoResult


@dataclass
class FusionConfig:
    """相空间融合配置"""
    # 专家选择
    expert_names: list[str] = field(default_factory=lambda: [
        "physics", "texture", "optical_flow", "depth", "aesthetic", "temporal"
    ])
    
    # 融合策略
    strategy: str = "judge_weighted"  # consensus / judge_weighted / best_of_n / evolutionary
    
    # 视频参数
    duration: float = 3.0             # 视频时长（秒）
    fps: int = 30                     # 帧率
    
    # 水逻辑
    water_logic_enabled: bool = True  # 是否启用物理否决权
    water_logic_tolerance: float = 0.15  # 物理容忍度
    
    # 吸引子约束
    attractor_enabled: bool = True    # 是否启用吸引子约束
    attractor_strength: float = 0.3   # 吸引子强度（0-1）
    
    # 质量阈值
    min_quality: float = 0.6
    
    # 进化融合参数
    evo_generations: int = 5
    evo_population_size: int = 6
    evo_mutation_rate: float = 0.2


@dataclass
class FusionResult:
    """融合结果"""
    prompt: str
    trajectory: VideoTrajectory
    strategy_used: str
    expert_trajectories: dict[str, VideoTrajectory]
    phase_state: PhaseSpaceState
    
    # 统计
    total_time_ms: float = 0.0
    fusion_quality: float = 0.0
    
    # 水逻辑
    water_logic_passed: bool = True
    water_logic_report: Optional[VetoResult] = None
    
    # 元数据
    metadata: dict = field(default_factory=dict)


class PhaseSpaceFusionEngine:
    """
    相空间视频融合引擎
    
    核心流程：
    1. 六大专家各自生成轨迹假设
    2. 吸引子景观约束 —— 保证物体身份一致
    3. 水逻辑否决 —— 物理违规被驳回
    4. 多专家融合 —— 按策略合成最终轨迹
    5. T6质量评估 —— 输出质量报告
    """
    
    def __init__(self):
        self.experts: dict[str, BaseExpert] = {}
        self.water_logic = WaterLogicVeto()
        self._init_experts()
    
    def _init_experts(self) -> None:
        """初始化所有专家"""
        for name, cls in EXPERT_REGISTRY.items():
            self.experts[name] = cls()
    
    def fuse(
        self,
        prompt: str,
        config: Optional[FusionConfig] = None,
    ) -> FusionResult:
        """
        执行完整的相空间融合流程
        
        Args:
            prompt: 文本描述
            config: 融合配置
            
        Returns:
            FusionResult 包含融合轨迹和所有元数据
        """
        if config is None:
            config = FusionConfig()
        
        start_time = time.time()
        
        # Phase 0: 初始化相空间状态
        phase_state = self._init_phase_space(prompt, config)
        
        # Phase 1: 各专家生成轨迹
        expert_trajectories = {}
        for name in config.expert_names:
            if name in self.experts:
                traj = self.experts[name].generate_trajectory(
                    prompt=prompt,
                    duration=config.duration,
                    fps=config.fps,
                    initial_state=phase_state,
                )
                expert_trajectories[name] = traj
        
        # Phase 2: 吸引子约束（让轨迹"落"到吸引子上）
        if config.attractor_enabled:
            for name, traj in expert_trajectories.items():
                self._apply_attractor_constraint(traj, phase_state.landscape, config.attractor_strength)
        
        # Phase 3: 水逻辑否决权（只对物理相关专家的轨迹做检查和修正）
        water_passed = True
        water_report = None
        if config.water_logic_enabled and "physics" in expert_trajectories:
            water_report = self.water_logic.check(expert_trajectories["physics"])
            water_passed = water_report.passed
            if water_report.corrected_trajectory is not None:
                expert_trajectories["physics"] = water_report.corrected_trajectory
        
        # Phase 4: 多专家轨迹融合
        fused_trajectory = self._fuse_trajectories(
            expert_trajectories=expert_trajectories,
            strategy=config.strategy,
            config=config,
        )
        
        # Phase 5: 最终水逻辑检查（融合后再检查一次）
        if config.water_logic_enabled:
            final_check = self.water_logic.check(fused_trajectory)
            if not final_check.passed and final_check.corrected_trajectory is not None:
                fused_trajectory = final_check.corrected_trajectory
                water_passed = False
        
        # 计算融合质量（简化版，完整版由 T6 评估器负责）
        quality = self._estimate_quality(fused_trajectory, expert_trajectories)
        
        elapsed = (time.time() - start_time) * 1000
        
        return FusionResult(
            prompt=prompt,
            trajectory=fused_trajectory,
            strategy_used=config.strategy,
            expert_trajectories=expert_trajectories,
            phase_state=phase_state,
            total_time_ms=elapsed,
            fusion_quality=quality,
            water_logic_passed=water_passed,
            water_logic_report=water_report,
        )
    
    def _init_phase_space(self, prompt: str, config: FusionConfig) -> PhaseSpaceState:
        """初始化相空间状态和吸引子景观"""
        state = PhaseSpaceState(t=0.0, temperature=0.4)
        
        # 从 prompt 中提取关键概念，创建吸引子（简化版）
        # 真实系统应由 NLP 模型提取实体
        landscape = AttractorLandscape()
        
        # 创建默认吸引子（主物体）
        main_object = ObjectIdentity(
            name="main_subject",
            center={"pos_x": 0.5, "pos_y": 0.5, "pos_z": 0.5},
            radius=0.3,
            strength=0.6,
            type="point",
        )
        landscape.add_basin(main_object)
        
        state.landscape = landscape
        state.update_order_parameter()
        
        return state
    
    def _apply_attractor_constraint(
        self,
        trajectory: VideoTrajectory,
        landscape: AttractorLandscape,
        strength: float,
    ) -> None:
        """
        对轨迹施加吸引子约束
        
        让轨迹"倾向于"靠近吸引子，就像重力让物体落向地面一样。
        这保证了物体不会"凭空消失"或"飘出画面"。
        """
        for point in trajectory.points:
            force = landscape.total_force(point)
            for dim, f in force.items():
                if dim in point.dimensions:
                    # 吸引力的影响 = strength × 力
                    point.dimensions[dim] += f * strength * 0.1
    
    def _fuse_trajectories(
        self,
        expert_trajectories: dict[str, VideoTrajectory],
        strategy: str,
        config: FusionConfig,
    ) -> VideoTrajectory:
        """根据策略融合多条轨迹"""
        if not expert_trajectories:
            return VideoTrajectory()
        
        if strategy == "consensus":
            return self._fuse_consensus(expert_trajectories, config)
        elif strategy == "judge_weighted":
            return self._fuse_judge_weighted(expert_trajectories, config)
        elif strategy == "best_of_n":
            return self._fuse_best_of_n(expert_trajectories, config)
        elif strategy == "evolutionary":
            return self._fuse_evolutionary(expert_trajectories, config)
        else:
            return self._fuse_judge_weighted(expert_trajectories, config)
    
    def _fuse_consensus(
        self,
        expert_trajectories: dict[str, VideoTrajectory],
        config: FusionConfig,
    ) -> VideoTrajectory:
        """
        多专家共识融合
        
        对每个时间点，每个维度取所有专家的中位数。
        中位数比均值更鲁棒——个别专家的离谱建议不会影响整体。
        """
        result = VideoTrajectory(source_expert="consensus_fusion", confidence=0.85)
        n_frames = int(config.duration * config.fps)
        dt = 1.0 / config.fps
        
        # 收集所有维度
        all_dims = set()
        for traj in expert_trajectories.values():
            if traj.points:
                all_dims.update(traj.points[0].dimensions.keys())
        
        for i in range(n_frames):
            t = i * dt
            fused_dims = {}
            total_conf = 0.0
            
            for dim in all_dims:
                values = []
                weights = []
                for name, traj in expert_trajectories.items():
                    point = traj.at_time(t)
                    if dim in point.dimensions:
                        weight = self.experts[name].config.weight if name in self.experts else 1.0
                        values.append(point.dimensions[dim])
                        weights.append(weight * point.confidence)
                
                if values:
                    # 加权中位数
                    sorted_pairs = sorted(zip(values, weights), key=lambda x: x[0])
                    total_w = sum(weights)
                    cumulative = 0
                    median_val = values[0]
                    for val, w in sorted_pairs:
                        cumulative += w
                        if cumulative >= total_w / 2:
                            median_val = val
                            break
                    fused_dims[dim] = median_val
                    total_conf += sum(w for _, w in sorted_pairs) / len(sorted_pairs)
            
            conf = total_conf / len(all_dims) if all_dims else 0.5
            result.add_point(TrajectoryPoint(t=t, dimensions=fused_dims, confidence=conf))
        
        return result
    
    def _fuse_judge_weighted(
        self,
        expert_trajectories: dict[str, VideoTrajectory],
        config: FusionConfig,
    ) -> VideoTrajectory:
        """
        裁判加权融合
        
        按专家权重加权平均。物理专家权重最高（有否决权），
        其他专家根据其在各自领域的置信度加权。
        """
        result = VideoTrajectory(source_expert="judge_weighted_fusion", confidence=0.88)
        n_frames = int(config.duration * config.fps)
        dt = 1.0 / config.fps
        
        # 计算每个专家的有效权重
        effective_weights = {}
        for name, traj in expert_trajectories.items():
            base_weight = self.experts[name].config.weight if name in self.experts else 1.0
            effective_weights[name] = base_weight * traj.confidence
        
        # 归一化
        total_weight = sum(effective_weights.values())
        if total_weight > 0:
            effective_weights = {k: v / total_weight for k, v in effective_weights.items()}
        
        # 收集所有维度
        all_dims = set()
        for traj in expert_trajectories.values():
            if traj.points:
                all_dims.update(traj.points[0].dimensions.keys())
        
        for i in range(n_frames):
            t = i * dt
            fused_dims = {}
            
            for dim in all_dims:
                weighted_sum = 0.0
                weight_sum = 0.0
                for name, traj in expert_trajectories.items():
                    point = traj.at_time(t)
                    if dim in point.dimensions:
                        w = effective_weights.get(name, 1.0) * point.confidence
                        weighted_sum += point.dimensions[dim] * w
                        weight_sum += w
                
                if weight_sum > 0:
                    fused_dims[dim] = weighted_sum / weight_sum
            
            result.add_point(TrajectoryPoint(
                t=t,
                dimensions=fused_dims,
                confidence=min(1.0, sum(effective_weights.values()) / len(effective_weights)),
            ))
        
        return result
    
    def _fuse_best_of_n(
        self,
        expert_trajectories: dict[str, VideoTrajectory],
        config: FusionConfig,
    ) -> VideoTrajectory:
        """
        择优选用
        
        从所有专家中选"最好的"那条轨迹。
        评分标准：平滑度 + 置信度 + 物理合规度
        """
        best_traj = None
        best_score = -1
        
        for name, traj in expert_trajectories.items():
            smoothness = traj.smoothness()
            confidence = traj.confidence
            physics_score = 1.0
            
            if name == "physics":
                physics_score = 1.0
            else:
                # 非物理专家的物理合规度近似用平滑度代替
                physics_score = smoothness * 0.8
            
            # 综合评分
            score = 0.4 * smoothness + 0.3 * confidence + 0.3 * physics_score
            
            if score > best_score:
                best_score = score
                best_traj = traj
        
        if best_traj is None:
            return VideoTrajectory()
        
        # 复制一份并标记
        result = VideoTrajectory(
            trajectory_id=best_traj.trajectory_id,
            source_expert=f"best_of_n_{best_traj.source_expert}",
            confidence=best_traj.confidence,
            metadata={**best_traj.metadata, "best_score": best_score},
        )
        for p in best_traj.points:
            result.add_point(p)
        
        return result
    
    def _fuse_evolutionary(
        self,
        expert_trajectories: dict[str, VideoTrajectory],
        config: FusionConfig,
    ) -> VideoTrajectory:
        """
        进化融合
        
        将每条轨迹视为一个"个体"，通过选择/交叉/变异
        迭代进化出最优轨迹。
        """
        # 初始种群 = 各专家轨迹
        population = list(expert_trajectories.values())
        
        # 如果专家不够，用变异补充
        while len(population) < config.evo_population_size:
            parent = random.choice(list(expert_trajectories.values()))
            mutated = self._mutate_trajectory(parent, config.evo_mutation_rate)
            population.append(mutated)
        
        # 进化迭代
        for gen in range(config.evo_generations):
            # 评估适应度
            scored = [(self._fitness(t), t) for t in population]
            scored.sort(key=lambda x: x[0], reverse=True)
            
            # 选择：保留 top 50%
            survivors = [t for _, t in scored[:len(scored) // 2]]
            
            # 交叉 + 变异补充
            new_pop = list(survivors)
            while len(new_pop) < config.evo_population_size:
                p1 = random.choice(survivors)
                p2 = random.choice(survivors)
                child = self._crossover_trajectories(p1, p2)
                child = self._mutate_trajectory(child, config.evo_mutation_rate)
                new_pop.append(child)
            
            population = new_pop
        
        # 返回适应度最高的
        best = max(population, key=self._fitness)
        best.source_expert = "evolutionary_fusion"
        return best
    
    def _fitness(self, traj: VideoTrajectory) -> float:
        """适应度函数：平滑度 + 置信度 + 覆盖维度数"""
        smooth = traj.smoothness()
        conf = traj.confidence
        dim_count = len(traj.points[0].dimensions) if traj.points else 0
        dim_score = min(1.0, dim_count / 20.0)
        return 0.4 * smooth + 0.3 * conf + 0.3 * dim_score
    
    def _crossover_trajectories(self, t1: VideoTrajectory, t2: VideoTrajectory) -> VideoTrajectory:
        """轨迹交叉：随机选择维度的来源"""
        result = VideoTrajectory(source_expert="evo_child", confidence=0.8)
        
        if not t1.points or not t2.points:
            return t1 if t1.points else t2
        
        all_dims = set()
        for p in t1.points:
            all_dims.update(p.dimensions.keys())
        for p in t2.points:
            all_dims.update(p.dimensions.keys())
        
        # 每个维度随机选一个父代
        dim_sources = {d: random.choice([t1, t2]) for d in all_dims}
        
        n_points = max(len(t1.points), len(t2.points))
        for i in range(n_points):
            t_val = i * (t1.duration() / n_points) if n_points > 0 else 0
            fused_dims = {}
            for dim, source in dim_sources.items():
                point = source.at_time(t_val)
                if dim in point.dimensions:
                    fused_dims[dim] = point.dimensions[dim]
            
            result.add_point(TrajectoryPoint(t=t_val, dimensions=fused_dims, confidence=0.8))
        
        return result
    
    def _mutate_trajectory(self, traj: VideoTrajectory, rate: float) -> VideoTrajectory:
        """轨迹变异：随机给某些维度加噪声"""
        result = VideoTrajectory(
            source_expert=traj.source_expert + "_mutated",
            confidence=traj.confidence * 0.9,
        )
        
        for point in traj.points:
            new_dims = dict(point.dimensions)
            for dim in new_dims:
                if random.random() < rate:
                    # 高斯噪声变异
                    noise = random.gauss(0, 0.05)
                    new_dims[dim] = max(0.0, min(1.0, new_dims[dim] + noise))
            
            result.add_point(TrajectoryPoint(
                t=point.t,
                dimensions=new_dims,
                confidence=point.confidence * 0.95,
            ))
        
        return result
    
    def _estimate_quality(
        self,
        fused: VideoTrajectory,
        expert_trajectories: dict[str, VideoTrajectory],
    ) -> float:
        """估计融合质量（简化版，完整评估用 T6VideoAssessor）"""
        if not fused.points:
            return 0.0
        
        smoothness = fused.smoothness()
        conf = fused.confidence
        dim_coverage = len(fused.points[0].dimensions) / 30.0  # 假设30个完整维度
        dim_coverage = min(1.0, dim_coverage)
        
        return 0.35 * smoothness + 0.35 * conf + 0.3 * dim_coverage
    
    def list_strategies(self) -> list[str]:
        """获取可用的融合策略"""
        return ["consensus", "judge_weighted", "best_of_n", "evolutionary"]
    
    def list_experts(self) -> list[str]:
        """获取可用专家列表"""
        return list(self.experts.keys())
