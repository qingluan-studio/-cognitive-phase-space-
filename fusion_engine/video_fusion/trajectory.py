"""
相空间视频融合引擎 - 核心数据结构

将视频建模为高维相空间中的连续轨迹，而非离散帧序列。
每个物体是一个吸引子盆地，每个动作是一条极限环路径，
每次场景切换是一次分岔或相变。
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import Optional, Union
import uuid


@dataclass
class TrajectoryPoint:
    """
    相空间中的单个轨迹点
    
    对应视频中的一帧，但不是像素，而是高维特征空间中的一个点。
    每个维度代表一个视觉/语义特征（位置、颜色、纹理、深度...）
    """
    t: float                          # 时间戳（秒）
    dimensions: dict[str, float]      # 相空间坐标 {维度名: 值}
    velocity: dict[str, float] = field(default_factory=dict)   # 各维度速度
    acceleration: dict[str, float] = field(default_factory=dict)  # 各维度加速度
    confidence: float = 1.0           # 该点的置信度
    metadata: dict = field(default_factory=dict)
    
    def distance_to(self, other: "TrajectoryPoint", dims: Optional[list[str]] = None) -> float:
        """计算与另一个点的欧氏距离"""
        if dims is None:
            dims = list(set(self.dimensions.keys()) & set(other.dimensions.keys()))
        if not dims:
            return float('inf')
        sq_sum = sum((self.dimensions[d] - other.dimensions[d]) ** 2 for d in dims)
        return math.sqrt(sq_sum)
    
    def interpolate(self, other: "TrajectoryPoint", t: float) -> "TrajectoryPoint":
        """在两点间按时间比例插值"""
        alpha = (t - self.t) / (other.t - self.t) if other.t != self.t else 0.5
        dims = {}
        for key in set(self.dimensions.keys()) | set(other.dimensions.keys()):
            v1 = self.dimensions.get(key, 0)
            v2 = other.dimensions.get(key, 0)
            dims[key] = v1 * (1 - alpha) + v2 * alpha
        return TrajectoryPoint(
            t=t,
            dimensions=dims,
            confidence=self.confidence * (1 - alpha) + other.confidence * alpha,
        )


@dataclass
class ObjectIdentity:
    """
    物体身份 —— 相空间中的吸引子盆地
    
    每个物体对应相空间中的一个吸引子。只要系统状态处于这个盆地内，
    物体就"存在"且保持身份一致。这从根本上解决了"物体凭空消失"的问题。
    """
    object_id: str = field(default_factory=lambda: f"obj_{uuid.uuid4().hex[:8]}")
    name: str = ""
    center: dict[str, float] = field(default_factory=dict)   # 吸引子中心坐标
    radius: float = 1.0                                      # 吸引子盆地半径
    strength: float = 0.8                                    # 吸引力强度 (0-1)
    type: str = "point"                                      # point / limit_cycle / strange
    phase: float = 0.0                                       # 当前相位（周期运动用）
    angular_velocity: float = 0.0                            # 角速度（周期运动用）
    
    def contains(self, point: TrajectoryPoint) -> bool:
        """判断一个点是否在吸引子盆地内"""
        dist = 0.0
        count = 0
        for key in self.center:
            if key in point.dimensions:
                dist += (self.center[key] - point.dimensions[key]) ** 2
                count += 1
        if count == 0:
            return False
        return math.sqrt(dist / count) <= self.radius
    
    def attraction_force(self, point: TrajectoryPoint) -> dict[str, float]:
        """计算吸引子对一个点的吸引力向量"""
        force = {}
        for key in self.center:
            if key in point.dimensions:
                delta = self.center[key] - point.dimensions[key]
                dist = abs(delta)
                if dist < 0.001:
                    force[key] = 0.0
                else:
                    # 力与距离成正比，但受半径衰减（胡克定律变体）
                    magnitude = self.strength * delta * max(0, 1 - dist / (self.radius * 2))
                    force[key] = magnitude
        return force


@dataclass
class AttractorLandscape:
    """
    吸引子景观 —— 整个相空间的"地形图"
    
    多个吸引子构成的景观，系统状态像小球一样在上面滚动。
    场景切换 = 小球从一个盆地滚到另一个盆地（分岔/相变）
    """
    basins: list[ObjectIdentity] = field(default_factory=list)
    dimensionality: int = 0
    
    def add_basin(self, basin: ObjectIdentity) -> None:
        self.basins.append(basin)
    
    def find_nearest_basin(self, point: TrajectoryPoint) -> Optional[ObjectIdentity]:
        """找到离一个点最近的吸引子"""
        if not self.basins:
            return None
        best = None
        best_dist = float('inf')
        for basin in self.basins:
            # 粗略距离计算
            dist = 0.0
            count = 0
            for key in basin.center:
                if key in point.dimensions:
                    dist += (basin.center[key] - point.dimensions[key]) ** 2
                    count += 1
            if count > 0:
                avg_dist = math.sqrt(dist / count)
                if avg_dist < best_dist:
                    best_dist = avg_dist
                    best = basin
        return best
    
    def total_force(self, point: TrajectoryPoint) -> dict[str, float]:
        """计算所有吸引子对一个点的合力"""
        total = {}
        for basin in self.basins:
            force = basin.attraction_force(point)
            for key, val in force.items():
                total[key] = total.get(key, 0.0) + val
        return total


@dataclass
class VideoTrajectory:
    """
    视频轨迹 —— 相空间中的一条连续曲线
    
    这是视频的"相空间表示"。传统视频是 [帧 × 像素] 的二维数组，
    这里是 [时间 → 高维相空间点] 的连续函数。
    """
    trajectory_id: str = field(default_factory=lambda: f"traj_{uuid.uuid4().hex[:8]}")
    points: list[TrajectoryPoint] = field(default_factory=list)
    source_expert: str = ""              # 生成此轨迹的专家
    confidence: float = 1.0              # 整体置信度
    metadata: dict = field(default_factory=dict)
    
    def add_point(self, point: TrajectoryPoint) -> None:
        self.points.append(point)
        self.points.sort(key=lambda p: p.t)
    
    def at_time(self, t: float) -> TrajectoryPoint:
        """获取指定时间的轨迹点（自动插值）"""
        if not self.points:
            return TrajectoryPoint(t=t, dimensions={})
        if t <= self.points[0].t:
            return self.points[0]
        if t >= self.points[-1].t:
            return self.points[-1]
        # 二分查找
        lo, hi = 0, len(self.points) - 1
        while lo < hi - 1:
            mid = (lo + hi) // 2
            if self.points[mid].t <= t:
                lo = mid
            else:
                hi = mid
        return self.points[lo].interpolate(self.points[hi], t)
    
    def duration(self) -> float:
        if not self.points:
            return 0.0
        return self.points[-1].t - self.points[0].t
    
    def smoothness(self) -> float:
        """计算轨迹的平滑度（1.0 = 完美平滑，0 = 完全不连贯）"""
        if len(self.points) < 3:
            return 1.0
        total_jerk = 0.0
        count = 0
        for i in range(1, len(self.points) - 1):
            prev = self.points[i - 1]
            curr = self.points[i]
            nxt = self.points[i + 1]
            # 加速度变化量 = jerk 的近似
            for key in curr.dimensions:
                if key in prev.dimensions and key in nxt.dimensions:
                    dt1 = curr.t - prev.t
                    dt2 = nxt.t - curr.t
                    if dt1 > 0 and dt2 > 0:
                        v1 = (curr.dimensions[key] - prev.dimensions[key]) / dt1
                        v2 = (nxt.dimensions[key] - curr.dimensions[key]) / dt2
                        jerk = abs(v2 - v1) / ((dt1 + dt2) / 2)
                        total_jerk += jerk
                        count += 1
        if count == 0:
            return 1.0
        avg_jerk = total_jerk / count
        # 映射到 0-1：jerk 越小越平滑
        return max(0.0, min(1.0, 1.0 / (1.0 + avg_jerk * 0.1)))


@dataclass
class PhaseSpaceState:
    """
    相空间系统状态
    
    某一时刻整个系统的完整状态：所有物体的位置、速度，
    以及系统的"温度"（控制参数，决定处于有序还是混沌态）
    """
    t: float = 0.0
    objects: dict[str, ObjectIdentity] = field(default_factory=dict)
    temperature: float = 0.5            # 系统温度 (0=完全有序, 1=完全混沌)
    entropy: float = 0.0                # 当前熵值
    order_parameter: float = 1.0        # 序参量（同步程度/有序程度）
    regime: str = "laminar"             # laminar / critical / turbulent
    landscape: AttractorLandscape = field(default_factory=AttractorLandscape)
    
    def update_order_parameter(self) -> None:
        """更新序参量——基于温度的 Landau 型相变模型"""
        # 简化的朗道自由能极小化：T < Tc 时有序，T > Tc 时无序
        T_c = 0.5  # 临界温度
        if self.temperature < T_c:
            self.order_parameter = math.sqrt(1 - self.temperature / T_c)
            self.regime = "laminar"
        elif abs(self.temperature - T_c) < 0.05:
            self.order_parameter = 0.3
            self.regime = "critical"
        else:
            self.order_parameter = 0.0
            self.regime = "turbulent"
