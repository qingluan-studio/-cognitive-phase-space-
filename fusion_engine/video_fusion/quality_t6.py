"""
T6 视频版质量评估器

将 CEE 的 T6 认知不变量评估体系移植到视频领域。
原 T6 评估文本的四个不变量（ITC/SCS/IEC/PFFT），
视频版扩展为六个维度的一致性评估：

1. TCI - Temporal Coherence Invariant  时序一致性不变量
2. SSI - Spatial Structure Invariant   空间结构不变量
3. PCI - Physical Consistency Invariant 物理一致性不变量
4. IVI - Identity Continuity Invariant 身份连续性不变量
5. ASI - Aesthetic Stability Invariant 美学稳定性不变量
6. PVI - Phase Volume Invariant        相空间体积不变量
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

from .trajectory import VideoTrajectory, PhaseSpaceState
from .water_logic import WaterLogicVeto


@dataclass
class VideoQualityDimensions:
    """视频质量六维度评分"""
    # 六大不变量
    tci: float = 0.0    # Temporal Coherence Invariant - 时序一致性
    ssi: float = 0.0    # Spatial Structure Invariant - 空间结构
    pci: float = 0.0    # Physical Consistency Invariant - 物理一致性
    ivi: float = 0.0    # Identity Continuity Invariant - 身份连续性
    asi: float = 0.0    # Aesthetic Stability Invariant - 美学稳定性
    pvi: float = 0.0    # Phase Volume Invariant - 相空间体积不变量
    
    overall: float = 0.0  # 综合评分
    
    def to_dict(self) -> dict[str, float]:
        return {
            "tci": round(self.tci, 4),
            "ssi": round(self.ssi, 4),
            "pci": round(self.pci, 4),
            "ivi": round(self.ivi, 4),
            "asi": round(self.asi, 4),
            "pvi": round(self.pvi, 4),
            "overall": round(self.overall, 4),
        }
    
    def dimension_names(self) -> dict[str, str]:
        """维度中文名"""
        return {
            "tci": "时序一致性",
            "ssi": "空间结构",
            "pci": "物理一致性",
            "ivi": "身份连续性",
            "asi": "美学稳定性",
            "pvi": "相空间体积",
            "overall": "综合质量",
        }


@dataclass
class VideoAssessmentResult:
    """视频评估结果"""
    trajectory_id: str
    dimensions: VideoQualityDimensions
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    phase_state: Optional[PhaseSpaceState] = None
    details: dict = field(default_factory=dict)


class T6VideoAssessor:
    """
    T6 视频版质量评估器
    
    六大不变量评估体系：
    - TCI: 时序一致性 —— 帧间是否平滑，有无跳变
    - SSI: 空间结构 —— 深度、构图是否稳定
    - PCI: 物理一致性 —— 运动是否符合物理定律
    - IVI: 身份连续性 —— 物体/角色是否保持同一身份
    - ASI: 美学稳定性 —— 色调、风格是否统一
    - PVI: 相空间体积不变量 —— 信息密度是否稳定（刘维尔定理类比）
    """
    
    def __init__(self):
        self.water_logic = WaterLogicVeto(tolerance=0.2)
        # 各维度权重
        self.weights = {
            "tci": 0.20,   # 时序一致性最重要
            "pci": 0.20,   # 物理一致性是硬指标
            "ivi": 0.20,   # 身份连续性是视频的核心
            "ssi": 0.15,   # 空间结构
            "asi": 0.15,   # 美学稳定
            "pvi": 0.10,   # 相空间体积
        }
    
    def assess(
        self,
        trajectory: VideoTrajectory,
        phase_state: Optional[PhaseSpaceState] = None,
    ) -> VideoAssessmentResult:
        """评估一条视频轨迹的质量"""
        dims = VideoQualityDimensions()
        
        if not trajectory.points or len(trajectory.points) < 2:
            return VideoAssessmentResult(
                trajectory_id=trajectory.trajectory_id,
                dimensions=dims,
                phase_state=phase_state,
            )
        
        # 计算六个维度
        dims.tci = self._assess_tci(trajectory)
        dims.ssi = self._assess_ssi(trajectory)
        dims.pci = self._assess_pci(trajectory)
        dims.ivi = self._assess_ivi(trajectory, phase_state)
        dims.asi = self._assess_asi(trajectory)
        dims.pvi = self._assess_pvi(trajectory)
        
        # 综合评分 = 加权平均
        dims.overall = (
            dims.tci * self.weights["tci"] +
            dims.ssi * self.weights["ssi"] +
            dims.pci * self.weights["pci"] +
            dims.ivi * self.weights["ivi"] +
            dims.asi * self.weights["asi"] +
            dims.pvi * self.weights["pvi"]
        )
        
        # 生成优缺点
        strengths = self._generate_strengths(dims)
        weaknesses = self._generate_weaknesses(dims)
        
        return VideoAssessmentResult(
            trajectory_id=trajectory.trajectory_id,
            dimensions=dims,
            strengths=strengths,
            weaknesses=weaknesses,
            phase_state=phase_state,
            details={
                "point_count": len(trajectory.points),
                "duration": trajectory.duration(),
                "smoothness": trajectory.smoothness(),
                "dimension_count": len(trajectory.points[0].dimensions) if trajectory.points else 0,
            },
        )
    
    # ====================================================================
    # 六大不变量评估
    # ====================================================================
    
    def _assess_tci(self, traj: VideoTrajectory) -> float:
        """
        TCI - 时序一致性不变量
        
        衡量帧间变化是否平滑。高 TCI = 没有跳变、闪烁、抖动。
        计算方式：轨迹平滑度的直接映射。
        """
        smoothness = traj.smoothness()
        
        # 额外检查速度的连续性
        velocity_jumps = 0
        total_checks = 0
        for i in range(1, len(traj.points) - 1):
            prev = traj.points[i - 1]
            curr = traj.points[i]
            nxt = traj.points[i + 1]
            dt = curr.t - prev.t
            if dt <= 0:
                continue
            for dim in curr.dimensions:
                if dim in prev.dimensions and dim in nxt.dimensions:
                    v1 = (curr.dimensions[dim] - prev.dimensions[dim]) / dt
                    v2 = (nxt.dimensions[dim] - curr.dimensions[dim]) / dt
                    if abs(v2 - v1) > 0.5:
                        velocity_jumps += 1
                    total_checks += 1
        
        jump_rate = velocity_jumps / total_checks if total_checks > 0 else 0
        jump_score = max(0.0, 1.0 - jump_rate * 2)
        
        # 综合：平滑度 60% + 速度连续 40%
        return 0.6 * smoothness + 0.4 * jump_score
    
    def _assess_ssi(self, traj: VideoTrajectory) -> float:
        """
        SSI - 空间结构不变量
        
        衡量空间结构是否稳定：深度关系、构图比例、物体相对位置。
        高 SSI = 空间关系前后一致，没有透视跳变。
        """
        # 检查深度相关维度的稳定性
        depth_dims = ["depth_near", "depth_far", "depth_range", "scene_depth", "pos_z"]
        present_dims = [d for d in depth_dims if d in traj.points[0].dimensions]
        
        if not present_dims:
            # 如果没有深度维度，用位置维度的稳定性近似
            present_dims = [d for d in ["pos_x", "pos_y"] if d in traj.points[0].dimensions]
        
        if not present_dims:
            return 0.5  # 无法评估，给中等分数
        
        # 计算每个深度维度的变异系数（CV = std/mean）
        stability_scores = []
        for dim in present_dims:
            values = [p.dimensions.get(dim, 0) for p in traj.points]
            mean_val = sum(values) / len(values) if values else 0
            if abs(mean_val) < 0.001:
                stability_scores.append(1.0)
                continue
            variance = sum((v - mean_val) ** 2 for v in values) / len(values)
            std_val = math.sqrt(variance)
            cv = std_val / abs(mean_val)
            # CV 越小越稳定，映射到 0-1
            stability = max(0.0, 1.0 - min(1.0, cv * 2))
            stability_scores.append(stability)
        
        return sum(stability_scores) / len(stability_scores) if stability_scores else 0.5
    
    def _assess_pci(self, traj: VideoTrajectory) -> float:
        """
        PCI - 物理一致性不变量
        
        衡量运动是否符合物理定律。
        直接使用水逻辑否决权的评分。
        """
        result = self.water_logic.check(traj)
        return result.overall_score
    
    def _assess_ivi(self, traj: VideoTrajectory, phase_state: Optional[PhaseSpaceState]) -> float:
        """
        IVI - 身份连续性不变量
        
        衡量物体/角色是否保持同一身份。
        高 IVI = 物体不会凭空出现/消失，特征保持稳定。
        
        用吸引子盆地的驻留比例来衡量：
        轨迹在吸引子内的时间比例越高，身份越稳定。
        """
        if phase_state is None or not phase_state.landscape.basins:
            # 没有吸引子景观时，用维度稳定性近似
            return self._dimension_stability(traj)
        
        in_basin_count = 0
        total = 0
        for point in traj.points:
            nearest = phase_state.landscape.find_nearest_basin(point)
            if nearest and nearest.contains(point):
                in_basin_count += 1
            total += 1
        
        return in_basin_count / total if total > 0 else 0.5
    
    def _assess_asi(self, traj: VideoTrajectory) -> float:
        """
        ASI - 美学稳定性不变量
        
        衡量色调、风格、构图的一致性。
        高 ASI = 没有风格跳变，整体视觉统一。
        """
        aesthetic_dims = [
            "hue", "saturation", "brightness", "contrast",
            "composition_balance", "style_coherence",
            "color_r", "color_g", "color_b",
        ]
        present = [d for d in aesthetic_dims if d in traj.points[0].dimensions]
        
        if not present:
            return 0.6  # 无法评估，但默认假设还行
        
        # 计算美学维度的时间稳定性
        stabilities = []
        for dim in present:
            values = [p.dimensions.get(dim, 0) for p in traj.points]
            # 差分绝对值之和（变化越小越稳定）
            total_change = 0.0
            for i in range(1, len(values)):
                total_change += abs(values[i] - values[i - 1])
            avg_change = total_change / (len(values) - 1) if len(values) > 1 else 0
            # 映射：变化越小，分数越高
            stability = max(0.0, 1.0 - avg_change * 10)
            stabilities.append(stability)
        
        return sum(stabilities) / len(stabilities) if stabilities else 0.5
    
    def _assess_pvi(self, traj: VideoTrajectory) -> float:
        """
        PVI - 相空间体积不变量（刘维尔定理类比）
        
        在哈密顿系统中，相空间体积随时间守恒。
        这里用来衡量信息密度的稳定性：
        高 PVI = 视频的信息密度前后一致，不会突然变空或变乱。
        
        计算方式：轨迹各维度的方差在时间窗口内的稳定性。
        """
        if len(traj.points) < 10:
            return 0.7  # 数据太少，给中等偏上
        
        # 将轨迹分成前后两半，比较两半的"相空间体积"（维度方差和）
        mid = len(traj.points) // 2
        first_half = traj.points[:mid]
        second_half = traj.points[mid:]
        
        def phase_volume(points):
            """计算一组点的相空间体积（用各维度方差的几何平均）"""
            if not points:
                return 0.0
            dims = points[0].dimensions.keys()
            var_sum = 0.0
            count = 0
            for dim in dims:
                values = [p.dimensions.get(dim, 0) for p in points]
                mean = sum(values) / len(values)
                var = sum((v - mean) ** 2 for v in values) / len(values)
                var_sum += math.log(1 + var)  # 用对数避免量纲差异
                count += 1
            return var_sum / count if count > 0 else 0
        
        v1 = phase_volume(first_half)
        v2 = phase_volume(second_half)
        
        if v1 < 0.001 and v2 < 0.001:
            return 1.0  # 都很小，也算稳定
        
        # 体积变化率
        ratio = min(v1, v2) / max(v1, v2) if max(v1, v2) > 0 else 1.0
        return max(0.0, min(1.0, ratio))
    
    # ====================================================================
    # 辅助方法
    # ====================================================================
    
    def _dimension_stability(self, traj: VideoTrajectory) -> float:
        """所有维度的平均稳定性"""
        if not traj.points:
            return 0.0
        
        stabilities = []
        for dim in traj.points[0].dimensions:
            values = [p.dimensions.get(dim, 0) for p in traj.points]
            mean_val = sum(values) / len(values)
            if abs(mean_val) < 0.001:
                stabilities.append(0.8)
                continue
            variance = sum((v - mean_val) ** 2 for v in values) / len(values)
            std_val = math.sqrt(variance)
            cv = std_val / abs(mean_val)
            stab = max(0.0, 1.0 - min(1.0, cv))
            stabilities.append(stab)
        
        return sum(stabilities) / len(stabilities) if stabilities else 0.5
    
    def _generate_strengths(self, dims: VideoQualityDimensions) -> list[str]:
        """生成优点列表"""
        strengths = []
        names = dims.dimension_names()
        
        for dim_key in ["tci", "pci", "ivi", "ssi", "asi", "pvi"]:
            val = getattr(dims, dim_key)
            if val > 0.85:
                strengths.append(f"{names[dim_key]}优秀 ({val:.0%})")
        
        if dims.overall > 0.8:
            strengths.append(f"综合质量优异 ({dims.overall:.0%})")
        
        if not strengths and dims.overall > 0.7:
            strengths.append("整体表现均衡")
        
        return strengths
    
    def _generate_weaknesses(self, dims: VideoQualityDimensions) -> list[str]:
        """生成缺点列表"""
        weaknesses = []
        names = dims.dimension_names()
        
        for dim_key in ["tci", "pci", "ivi", "ssi", "asi", "pvi"]:
            val = getattr(dims, dim_key)
            if val < 0.6:
                weaknesses.append(f"{names[dim_key]}不足 ({val:.0%})")
        
        if dims.overall < 0.5:
            weaknesses.append(f"整体质量偏低 ({dims.overall:.0%})")
        
        return weaknesses
    
    def compare(self, results: list[VideoAssessmentResult]) -> dict[str, str]:
        """比较多个评估结果，找出各维度的领先者"""
        leaders = {}
        dim_names = ["tci", "ssi", "pci", "ivi", "asi", "pvi", "overall"]
        
        for dim in dim_names:
            best = max(results, key=lambda r: getattr(r.dimensions, dim))
            leaders[dim] = best.trajectory_id
        
        return leaders
    
    def rank(self, results: list[VideoAssessmentResult]) -> list[VideoAssessmentResult]:
        """按综合质量排序"""
        return sorted(results, key=lambda r: r.dimensions.overall, reverse=True)
