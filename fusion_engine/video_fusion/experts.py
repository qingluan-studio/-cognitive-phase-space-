"""
六大领域专家 —— 视频相空间生成的"专家委员会"

每个专家负责视频的一个维度，各自生成一条相空间轨迹假设。
融合引擎综合所有专家的轨迹，生成最终结果。

专家列表：
1. PhysicsExpert    — 物理专家（水逻辑核心，拥有否决权）
2. TextureExpert    — 纹理专家（像素细节、材质质感）
3. OpticalFlowExpert — 光流专家（帧间运动向量）
4. DepthExpert      — 深度专家（3D结构、空间关系）
5. AestheticExpert  — 美学专家（色调、构图、风格）
6. TemporalExpert   — 时序专家（节奏、剪辑、叙事结构）
"""

from __future__ import annotations

import math
import random
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

from .trajectory import (
    TrajectoryPoint,
    VideoTrajectory,
    PhaseSpaceState,
    ObjectIdentity,
    AttractorLandscape,
)


@dataclass
class ExpertConfig:
    """专家配置"""
    weight: float = 1.0              # 专家权重
    has_veto: bool = False           # 是否有否决权
    specialty: str = ""              # 专长领域
    confidence_base: float = 0.75    # 基础置信度


class BaseExpert(ABC):
    """专家基类"""
    
    name: str = "base"
    description: str = ""
    dimensions: list[str] = []       # 该专家负责的相空间维度
    
    def __init__(self, config: Optional[ExpertConfig] = None):
        self.config = config or ExpertConfig()
    
    @abstractmethod
    def generate_trajectory(
        self,
        prompt: str,
        duration: float,
        fps: int,
        initial_state: Optional[PhaseSpaceState] = None,
    ) -> VideoTrajectory:
        """生成一条轨迹假设"""
        ...
    
    def assess_point(self, point: TrajectoryPoint) -> float:
        """评估单个点的质量（0-1），默认返回 1.0"""
        return 1.0
    
    def _make_point(self, t: float, dims: dict[str, float], conf: float = 0.8) -> TrajectoryPoint:
        return TrajectoryPoint(t=t, dimensions=dims, confidence=conf)


# ============================================================================
# 1. 物理专家 —— 水逻辑核心
# ============================================================================

class PhysicsExpert(BaseExpert):
    """
    物理专家（水逻辑）
    
    负责：运动学、动力学、碰撞检测、守恒定律
    拥有否决权：任何违反物理定律的生成都会被驳回
    
    核心思想：像水一样，运动由物理定律决定，没有意外。
    """
    
    name = "physics"
    description = "物理运动与守恒定律"
    dimensions = ["pos_x", "pos_y", "pos_z", "vel_x", "vel_y", "vel_z", "rotation"]
    
    def __init__(self, config: Optional[ExpertConfig] = None):
        if config is None:
            config = ExpertConfig(weight=1.5, has_veto=True, specialty="physics")
        super().__init__(config)
    
    def generate_trajectory(
        self,
        prompt: str,
        duration: float,
        fps: int,
        initial_state: Optional[PhaseSpaceState] = None,
    ) -> VideoTrajectory:
        """
        基于物理定律生成轨迹
        
        简化模型：抛物线 + 弹性碰撞 + 角动量守恒
        真实场景应由物理引擎（如 Bullet/Box2D）驱动
        """
        traj = VideoTrajectory(source_expert=self.name, confidence=0.9)
        
        n_frames = int(duration * fps)
        dt = 1.0 / fps
        
        # 初始条件（简化：一个自由落体 + 弹跳的球）
        x, y = 0.3, 0.8
        vx, vy = 0.8, 0.0
        gravity = 0.5
        bounce = 0.75
        rotation = 0.0
        ang_vel = 2.0  # 角速度（守恒，除非碰撞）
        
        for i in range(n_frames):
            t = i * dt
            
            # 物理更新
            vy += gravity * dt
            x += vx * dt
            y += vy * dt
            rotation += ang_vel * dt
            
            # 边界碰撞（地面和墙壁）
            if y < 0.1:
                y = 0.1
                vy = -vy * bounce
                vx *= 0.95  # 摩擦
                ang_vel *= 0.9  # 碰撞损失一点角动量
            
            if y > 0.95:
                y = 0.95
                vy = -vy * bounce
            
            if x < 0.05 or x > 0.95:
                vx = -vx * bounce
                x = max(0.05, min(0.95, x))
                ang_vel = -ang_vel * 0.9  # 墙壁碰撞改变旋转方向
            
            point = self._make_point(t, {
                "pos_x": x,
                "pos_y": y,
                "pos_z": 0.5,
                "vel_x": vx,
                "vel_y": vy,
                "vel_z": 0.0,
                "rotation": rotation % (2 * math.pi),
            }, conf=0.92)
            
            point.velocity = {"pos_x": vx, "pos_y": vy, "rotation": ang_vel}
            traj.add_point(point)
        
        return traj
    
    def check_conservation(self, traj: VideoTrajectory) -> dict[str, float]:
        """检查守恒定律的满足程度"""
        if len(traj.points) < 2:
            return {"momentum": 1.0, "energy": 1.0, "angular_momentum": 1.0}
        
        scores = {}
        
        # 动量守恒（封闭系统）
        mom_start = traj.points[0].dimensions.get("vel_x", 0) + traj.points[0].dimensions.get("vel_y", 0)
        mom_end = traj.points[-1].dimensions.get("vel_x", 0) + traj.points[-1].dimensions.get("vel_y", 0)
        scores["momentum"] = max(0, 1 - abs(mom_start - mom_end))
        
        # 能量守恒（简化：动能 + 势能）
        def energy(p):
            vx = p.dimensions.get("vel_x", 0)
            vy = p.dimensions.get("vel_y", 0)
            ke = 0.5 * (vx**2 + vy**2)
            pe = 0.5 * p.dimensions.get("pos_y", 0)
            return ke + pe
        
        e_start = energy(traj.points[0])
        e_end = energy(traj.points[-1])
        if e_start > 0.001:
            scores["energy"] = max(0, 1 - abs(e_start - e_end) / e_start)
        else:
            scores["energy"] = 1.0
        
        # 角动量守恒
        ang_start = traj.points[0].velocity.get("rotation", 0)
        ang_end = traj.points[-1].velocity.get("rotation", 0)
        if abs(ang_start) > 0.001:
            scores["angular_momentum"] = max(0, 1 - abs(ang_start - ang_end) / abs(ang_start))
        else:
            scores["angular_momentum"] = 1.0
        
        return scores


# ============================================================================
# 2. 纹理专家
# ============================================================================

class TextureExpert(BaseExpert):
    """
    纹理专家
    
    负责：表面细节、材质、颜色、纹理模式
    生成纹理特征的时间演化轨迹
    """
    
    name = "texture"
    description = "表面纹理与材质细节"
    dimensions = ["color_r", "color_g", "color_b", "roughness", "glossiness", "pattern_freq"]
    
    def __init__(self, config: Optional[ExpertConfig] = None):
        if config is None:
            config = ExpertConfig(weight=1.0, has_veto=False, specialty="visual")
        super().__init__(config)
    
    def generate_trajectory(
        self,
        prompt: str,
        duration: float,
        fps: int,
        initial_state: Optional[PhaseSpaceState] = None,
    ) -> VideoTrajectory:
        """生成纹理演化轨迹（基于噪声的平滑变化）"""
        traj = VideoTrajectory(source_expert=self.name, confidence=0.78)
        
        n_frames = int(duration * fps)
        dt = 1.0 / fps
        
        # 基础颜色（随时间缓慢变化）
        base_r = 0.6 + 0.2 * math.sin(0.5)
        base_g = 0.4 + 0.3 * math.cos(0.3)
        base_b = 0.8
        
        for i in range(n_frames):
            t = i * dt
            
            # 颜色随时间做平滑的周期性变化
            r = base_r + 0.1 * math.sin(t * 0.8)
            g = base_g + 0.15 * math.cos(t * 0.6)
            b = base_b + 0.05 * math.sin(t * 1.2 + 1.0)
            
            # 粗糙度随时间变化（模拟光影移动）
            roughness = 0.3 + 0.2 * (1 + math.sin(t * 0.5)) / 2
            glossiness = 1.0 - roughness
            
            # 纹理模式频率
            pattern_freq = 2.0 + 0.5 * math.sin(t * 0.3)
            
            point = self._make_point(t, {
                "color_r": max(0, min(1, r)),
                "color_g": max(0, min(1, g)),
                "color_b": max(0, min(1, b)),
                "roughness": roughness,
                "glossiness": glossiness,
                "pattern_freq": pattern_freq,
            }, conf=0.78)
            
            traj.add_point(point)
        
        return traj


# ============================================================================
# 3. 光流专家
# ============================================================================

class OpticalFlowExpert(BaseExpert):
    """
    光流专家
    
    负责：帧间运动向量场、运动模糊、速度一致性
    保证帧与帧之间的运动是平滑且合理的
    """
    
    name = "optical_flow"
    description = "帧间运动向量与光流场"
    dimensions = ["flow_x", "flow_y", "motion_blur", "speed_mag", "flow_divergence"]
    
    def __init__(self, config: Optional[ExpertConfig] = None):
        if config is None:
            config = ExpertConfig(weight=1.2, has_veto=False, specialty="motion")
        super().__init__(config)
    
    def generate_trajectory(
        self,
        prompt: str,
        duration: float,
        fps: int,
        initial_state: Optional[PhaseSpaceState] = None,
    ) -> VideoTrajectory:
        """生成光流演化轨迹"""
        traj = VideoTrajectory(source_expert=self.name, confidence=0.82)
        
        n_frames = int(duration * fps)
        dt = 1.0 / fps
        
        for i in range(n_frames):
            t = i * dt
            
            # 整体流动方向（随时间旋转）
            angle = t * 0.5  # rad/s
            flow_x = math.cos(angle) * 0.3
            flow_y = math.sin(angle) * 0.2
            
            # 速度大小
            speed = 0.3 + 0.1 * math.sin(t * 0.7)
            
            # 运动模糊量（速度越快模糊越大）
            motion_blur = min(1.0, speed * 2.0)
            
            # 散度（膨胀/收缩）
            divergence = 0.1 * math.sin(t * 0.4)
            
            point = self._make_point(t, {
                "flow_x": flow_x,
                "flow_y": flow_y,
                "motion_blur": motion_blur,
                "speed_mag": speed,
                "flow_divergence": divergence,
            }, conf=0.82)
            
            traj.add_point(point)
        
        return traj


# ============================================================================
# 4. 深度专家
# ============================================================================

class DepthExpert(BaseExpert):
    """
    深度专家
    
    负责：3D空间结构、深度图、场景几何、遮挡关系
    保证空间关系的一致性
    """
    
    name = "depth"
    description = "3D深度与空间结构"
    dimensions = ["depth_near", "depth_far", "depth_range", "parallax", "occlusion", "scene_depth"]
    
    def __init__(self, config: Optional[ExpertConfig] = None):
        if config is None:
            config = ExpertConfig(weight=1.0, has_veto=False, specialty="spatial")
        super().__init__(config)
    
    def generate_trajectory(
        self,
        prompt: str,
        duration: float,
        fps: int,
        initial_state: Optional[PhaseSpaceState] = None,
    ) -> VideoTrajectory:
        """生成深度场演化轨迹"""
        traj = VideoTrajectory(source_expert=self.name, confidence=0.75)
        
        n_frames = int(duration * fps)
        dt = 1.0 / fps
        
        for i in range(n_frames):
            t = i * dt
            
            # 相机推进效果（深度范围随时间变化）
            depth_near = 0.1 + 0.05 * math.sin(t * 0.3)
            depth_far = 0.9 - 0.1 * (1 + math.sin(t * 0.2)) / 2
            depth_range = depth_far - depth_near
            
            # 视差（与深度成反比）
            parallax = 1.0 / max(0.1, depth_range) * 0.2
            
            # 遮挡程度（场景复杂度）
            occlusion = 0.3 + 0.2 * (1 + math.sin(t * 0.4)) / 2
            
            # 场景平均深度
            scene_depth = (depth_near + depth_far) / 2
            
            point = self._make_point(t, {
                "depth_near": depth_near,
                "depth_far": depth_far,
                "depth_range": depth_range,
                "parallax": parallax,
                "occlusion": occlusion,
                "scene_depth": scene_depth,
            }, conf=0.75)
            
            traj.add_point(point)
        
        return traj


# ============================================================================
# 5. 美学专家
# ============================================================================

class AestheticExpert(BaseExpert):
    """
    美学专家
    
    负责：色调、构图、镜头语言、风格一致性
    保证视频的视觉美感和风格统一
    """
    
    name = "aesthetic"
    description = "美学风格与视觉调性"
    dimensions = ["hue", "saturation", "brightness", "contrast", "composition_balance", "style_coherence"]
    
    def __init__(self, config: Optional[ExpertConfig] = None):
        if config is None:
            config = ExpertConfig(weight=0.8, has_veto=False, specialty="creative")
        super().__init__(config)
    
    def generate_trajectory(
        self,
        prompt: str,
        duration: float,
        fps: int,
        initial_state: Optional[PhaseSpaceState] = None,
    ) -> VideoTrajectory:
        """生成美学参数演化轨迹"""
        traj = VideoTrajectory(source_expert=self.name, confidence=0.7)
        
        n_frames = int(duration * fps)
        dt = 1.0 / fps
        
        for i in range(n_frames):
            t = i * dt
            progress = t / duration if duration > 0 else 0
            
            # 色相偏移（开场冷色调 → 结尾暖色调）
            hue = 0.6 - 0.4 * progress
            
            # 饱和度（中段最高，首尾略低）
            saturation = 0.5 + 0.3 * math.sin(progress * math.pi)
            
            # 亮度（呼吸感）
            brightness = 0.6 + 0.1 * math.sin(t * 1.0)
            
            # 对比度
            contrast = 0.55 + 0.1 * math.sin(t * 0.6 + 0.5)
            
            # 构图平衡（随时间轻微偏移）
            composition = 0.5 + 0.1 * math.sin(t * 0.4)
            
            # 风格一致性（整体较高，缓慢波动）
            style_coh = 0.85 + 0.05 * math.sin(t * 0.2)
            
            point = self._make_point(t, {
                "hue": max(0, min(1, hue)),
                "saturation": max(0, min(1, saturation)),
                "brightness": max(0, min(1, brightness)),
                "contrast": max(0, min(1, contrast)),
                "composition_balance": max(0, min(1, composition)),
                "style_coherence": max(0, min(1, style_coh)),
            }, conf=0.7)
            
            traj.add_point(point)
        
        return traj


# ============================================================================
# 6. 时序专家
# ============================================================================

class TemporalExpert(BaseExpert):
    """
    时序专家
    
    负责：节奏、剪辑点、叙事结构、时间晶体
    保证视频在时间维度上的节奏感和叙事性
    灵感来自：TimeCrystalCache, KairosSnatcher
    """
    
    name = "temporal"
    description = "时序节奏与叙事结构"
    dimensions = ["pace", "rhythm_strength", "kairos_intensity", "crystal_order", "narrative_arc", "tension"]
    
    def __init__(self, config: Optional[ExpertConfig] = None):
        if config is None:
            config = ExpertConfig(weight=1.0, has_veto=False, specialty="temporal")
        super().__init__(config)
    
    def generate_trajectory(
        self,
        prompt: str,
        duration: float,
        fps: int,
        initial_state: Optional[PhaseSpaceState] = None,
    ) -> VideoTrajectory:
        """生成时序节奏轨迹"""
        traj = VideoTrajectory(source_expert=self.name, confidence=0.72)
        
        n_frames = int(duration * fps)
        dt = 1.0 / fps
        
        for i in range(n_frames):
            t = i * dt
            progress = t / duration if duration > 0 else 0
            
            # 节奏速度（三段式：慢→快→慢）
            if progress < 0.3:
                pace = 0.3 + 0.4 * (progress / 0.3)  # 渐快
            elif progress < 0.7:
                pace = 0.7 + 0.2 * math.sin(t * 2.0)   # 快速波动
            else:
                pace = 0.9 - 0.6 * ((progress - 0.7) / 0.3)  # 渐慢
            
            # 节律强度（与节奏正相关）
            rhythm = pace * (0.8 + 0.2 * math.sin(t * 3.0))
            
            # Kairos 关键时刻（几个峰值点）
            kairos = max(0.0, math.sin(progress * math.pi * 3)) ** 2
            
            # 时间晶体序参量（同步程度）
            crystal_order = 0.6 + 0.3 * math.sin(t * 0.5)
            
            # 叙事弧（起承转合）
            narrative = math.sin(progress * math.pi)
            
            # 张力（叙事弧的导数近似）
            tension = 0.5 + 0.5 * math.cos(progress * math.pi - 0.5)
            
            point = self._make_point(t, {
                "pace": max(0, min(1, pace)),
                "rhythm_strength": max(0, min(1, rhythm)),
                "kairos_intensity": max(0, min(1, kairos)),
                "crystal_order": max(0, min(1, crystal_order)),
                "narrative_arc": max(0, min(1, narrative)),
                "tension": max(0, min(1, tension)),
            }, conf=0.72)
            
            traj.add_point(point)
        
        return traj


# ============================================================================
# 专家注册表
# ============================================================================

EXPERT_REGISTRY: dict[str, type[BaseExpert]] = {
    "physics": PhysicsExpert,
    "texture": TextureExpert,
    "optical_flow": OpticalFlowExpert,
    "depth": DepthExpert,
    "aesthetic": AestheticExpert,
    "temporal": TemporalExpert,
}


def create_expert(name: str, config: Optional[ExpertConfig] = None) -> BaseExpert:
    """工厂函数：创建专家实例"""
    if name not in EXPERT_REGISTRY:
        raise ValueError(f"未知专家: {name}，可用: {list(EXPERT_REGISTRY.keys())}")
    return EXPERT_REGISTRY[name](config)
