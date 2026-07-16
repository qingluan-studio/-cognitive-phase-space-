"""
水逻辑否决权 (Water Logic Veto)

核心思想：像水一样，物理定律不可违背。
任何违反守恒定律的轨迹都会被物理专家否决并修正。

这是整个相空间视频融合引擎的"硬约束"层——
其他专家可以自由发挥创意，但物理定律是底线。
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .trajectory import TrajectoryPoint, VideoTrajectory


class ConservationLaw(Enum):
    """守恒定律枚举"""
    MOMENTUM = "momentum"              # 动量守恒
    ENERGY = "energy"                  # 能量守恒
    ANGULAR_MOMENTUM = "angular_momentum"  # 角动量守恒
    MASS = "mass"                      # 质量守恒
    CHARGE = "charge"                  # 电荷守恒（扩展用）


@dataclass
class PhysicsViolation:
    """物理违规记录"""
    law: ConservationLaw
    timestamp: float              # 违规发生的时间点
    magnitude: float              # 违规程度（0-1，1=完全违反）
    description: str              # 描述
    frame_index: int = -1         # 对应的帧索引
    corrected: bool = False       # 是否已修正
    
    def severity(self) -> str:
        if self.magnitude < 0.1:
            return "轻微"
        elif self.magnitude < 0.3:
            return "中等"
        elif self.magnitude < 0.6:
            return "严重"
        else:
            return "致命"


@dataclass
class VetoResult:
    """否决检查结果"""
    passed: bool = True                      # 是否通过
    violations: list[PhysicsViolation] = field(default_factory=list)
    corrected_trajectory: Optional[VideoTrajectory] = None  # 修正后的轨迹
    overall_score: float = 1.0               # 整体物理合规度（0-1）
    
    @property
    def violation_count(self) -> int:
        return len(self.violations)
    
    @property
    def fatal_count(self) -> int:
        return sum(1 for v in self.violations if v.severity() == "致命")


class WaterLogicVeto:
    """
    水逻辑否决权 —— 物理定律的守护者
    
    就像水永远往低处流一样，物理定律不可违背。
    这个类检查轨迹是否违反守恒定律，
    如果违反，要么否决整个轨迹，要么修正它。
    """
    
    def __init__(self, tolerance: float = 0.15, auto_correct: bool = True):
        """
        Args:
            tolerance: 容忍度（0-1），低于此阈值的轻微违规会被放过
            auto_correct: 是否自动修正违规轨迹
        """
        self.tolerance = tolerance
        self.auto_correct = auto_correct
        self.active_laws = [
            ConservationLaw.MOMENTUM,
            ConservationLaw.ENERGY,
            ConservationLaw.ANGULAR_MOMENTUM,
        ]
    
    def check(self, trajectory: VideoTrajectory) -> VetoResult:
        """
        检查轨迹是否符合物理定律
        
        Returns:
            VetoResult 包含违规列表、修正轨迹、整体评分
        """
        result = VetoResult()
        
        if len(trajectory.points) < 2:
            return result
        
        violations = []
        
        # 检查每条守恒定律
        for law in self.active_laws:
            law_violations = self._check_law(trajectory, law)
            violations.extend(law_violations)
        
        # 过滤掉轻微违规
        significant = [v for v in violations if v.magnitude > self.tolerance]
        result.violations = significant
        
        # 计算整体合规度
        if violations:
            avg_magnitude = sum(v.magnitude for v in violations) / len(violations)
            result.overall_score = max(0.0, 1.0 - avg_magnitude)
        else:
            result.overall_score = 1.0
        
        # 判断是否通过
        fatal_count = sum(1 for v in significant if v.severity() == "致命")
        result.passed = fatal_count == 0
        
        # 自动修正
        if self.auto_correct and not result.passed:
            result.corrected_trajectory = self._correct_trajectory(trajectory, significant)
            for v in significant:
                v.corrected = True
        
        return result
    
    def _check_law(self, trajectory: VideoTrajectory, law: ConservationLaw) -> list[PhysicsViolation]:
        """检查特定守恒定律"""
        violations = []
        
        if law == ConservationLaw.MOMENTUM:
            violations = self._check_momentum(trajectory)
        elif law == ConservationLaw.ENERGY:
            violations = self._check_energy(trajectory)
        elif law == ConservationLaw.ANGULAR_MOMENTUM:
            violations = self._check_angular_momentum(trajectory)
        
        return violations
    
    def _check_momentum(self, trajectory: VideoTrajectory) -> list[PhysicsViolation]:
        """
        检查动量守恒
        
        注意：碰撞时的速度反转是合法的（有外力/冲量），不算违规。
        真正的违规是：速度随机跳变、没有原因的加速/减速。
        检测方法：看速度序列是否"有规律"——碰撞是有节奏的（弹地、弹墙），
        随机抖动是无规律的。
        """
        violations = []
        
        # 用速度自相关来检测：真实物理运动的速度是自相关的（下一刻速度与此刻相关）
        # 随机抖动的自相关系数很低
        for dim in ["pos_x", "pos_y", "pos_z"]:
            velocities = []
            times = []
            for i, p in enumerate(trajectory.points):
                if dim in p.velocity:
                    velocities.append(p.velocity[dim])
                    times.append(p.t)
                elif dim in p.dimensions and i > 0:
                    prev = trajectory.points[i - 1]
                    if dim in prev.dimensions:
                        dt = p.t - prev.t
                        if dt > 0:
                            v = (p.dimensions[dim] - prev.dimensions[dim]) / dt
                            velocities.append(v)
                            times.append(p.t)
            
            if len(velocities) < 10:
                continue
            
            # 计算一阶差分的方差（加速度的变化量）
            # 真实物理中加速度应该相对平滑（除非碰撞）
            accels = []
            for i in range(1, len(velocities)):
                dt = times[i] - times[i - 1]
                if dt > 0:
                    accels.append((velocities[i] - velocities[i - 1]) / dt)
            
            if len(accels) < 5:
                continue
            
            # 加速度的变异系数：如果加速度变化极大且无规律，就是不物理的
            mean_accel = sum(accels) / len(accels)
            var_accel = sum((a - mean_accel) ** 2 for a in accels) / len(accels)
            std_accel = var_accel ** 0.5
            
            # 正常物理：重力加速度恒定（变化小），碰撞时有周期性尖峰
            # 不正常：加速度完全随机
            # 用加速度的"连续性"来判断：连续几帧同方向才算正常
            direction_changes = 0
            for i in range(1, len(accels)):
                if (accels[i] > 0) != (accels[i-1] > 0):
                    direction_changes += 1
            
            change_rate = direction_changes / len(accels) if accels else 0
            
            # 如果方向变化率 > 0.4 且加速度方差大，说明是随机抖动
            if change_rate > 0.4 and std_accel > 5.0:
                magnitude = min(1.0, (change_rate - 0.4) * 2 + std_accel / 20)
                violations.append(PhysicsViolation(
                    law=ConservationLaw.MOMENTUM,
                    timestamp=times[len(times)//2],
                    magnitude=magnitude,
                    description=f"维度 {dim} 运动不规律: 加速度方向变化率={change_rate:.1%}, 标准差={std_accel:.2f}",
                    frame_index=len(trajectory.points) // 2,
                ))
        
        return violations
    
    def _check_energy(self, trajectory: VideoTrajectory) -> list[PhysicsViolation]:
        """检查能量守恒（动能 + 势能）"""
        violations = []
        
        def total_energy(point: TrajectoryPoint) -> float:
            # 简化的能量计算
            vx = point.velocity.get("pos_x", 0)
            vy = point.velocity.get("pos_y", 0)
            vz = point.velocity.get("pos_z", 0)
            ke = 0.5 * (vx**2 + vy**2 + vz**2)  # 动能
            pe = point.dimensions.get("pos_y", 0) * 0.5  # 势能（高度）
            return ke + pe
        
        energies = []
        for i, p in enumerate(trajectory.points):
            # 如果没有速度信息，从位置差分计算
            if "pos_x" not in p.velocity and i > 0:
                prev = trajectory.points[i - 1]
                dt = p.t - prev.t
                if dt > 0:
                    p.velocity["pos_x"] = (p.dimensions.get("pos_x", 0) - prev.dimensions.get("pos_x", 0)) / dt
                    p.velocity["pos_y"] = (p.dimensions.get("pos_y", 0) - prev.dimensions.get("pos_y", 0)) / dt
                    p.velocity["pos_z"] = (p.dimensions.get("pos_z", 0) - prev.dimensions.get("pos_z", 0)) / dt
            
            energies.append(total_energy(p))
        
        if len(energies) < 2:
            return violations
        
        # 能量应该单调递减（有耗散）或在碰撞时突变但有规律
        # 检查异常的能量激增
        baseline = energies[0]
        for i in range(1, len(energies)):
            if baseline > 0.001:
                ratio = energies[i] / baseline
                if ratio > 1.5:  # 能量增加超过50%（无外力情况下不正常）
                    magnitude = min(1.0, (ratio - 1.0) / 2.0)
                    violations.append(PhysicsViolation(
                        law=ConservationLaw.ENERGY,
                        timestamp=trajectory.points[i].t,
                        magnitude=magnitude,
                        description=f"能量异常增加: {baseline:.4f} → {energies[i]:.4f} (×{ratio:.2f})",
                        frame_index=i,
                    ))
            baseline = energies[i]
        
        return violations
    
    def _check_angular_momentum(self, trajectory: VideoTrajectory) -> list[PhysicsViolation]:
        """检查角动量守恒"""
        violations = []
        
        rotations = []
        for p in trajectory.points:
            rot = p.velocity.get("rotation", 0)
            rotations.append(rot)
        
        if len(rotations) < 2:
            return violations
        
        # 角速度应该守恒（除非有碰撞/外力矩）
        for i in range(1, len(rotations)):
            if abs(rotations[i - 1]) > 0.01:
                ratio = abs(rotations[i] / rotations[i - 1])
                # 正常情况下角速度应该缓慢变化（空气阻力等）
                if ratio < 0.7 or ratio > 1.3:
                    magnitude = min(1.0, abs(1.0 - ratio))
                    violations.append(PhysicsViolation(
                        law=ConservationLaw.ANGULAR_MOMENTUM,
                        timestamp=trajectory.points[i].t,
                        magnitude=magnitude,
                        description=f"角速度突变: {rotations[i-1]:.3f} → {rotations[i]:.3f}",
                        frame_index=i,
                    ))
        
        return violations
    
    def _correct_trajectory(
        self,
        trajectory: VideoTrajectory,
        violations: list[PhysicsViolation],
    ) -> VideoTrajectory:
        """
        修正违规轨迹 —— 将轨迹"拉回"物理正确的轨道
        
        修正策略：
        1. 找到物理正确的锚点（违规发生前的最后一帧）
        2. 从锚点重新开始，用物理约束重新推演
        3. 尽量保留原始轨迹的意图，但使其符合物理定律
        """
        corrected = VideoTrajectory(
            source_expert=trajectory.source_expert + "_corrected",
            confidence=trajectory.confidence * 0.9,
        )
        
        if len(trajectory.points) < 2:
            return trajectory
        
        # 找到第一个致命违规的位置
        first_fatal = len(trajectory.points)
        for v in violations:
            if v.severity() == "致命" and v.frame_index >= 0:
                first_fatal = min(first_fatal, v.frame_index)
        
        # 复制违规前的所有点
        for i in range(min(first_fatal, len(trajectory.points))):
            corrected.add_point(trajectory.points[i])
        
        # 从最后一个正确点开始，用物理约束重新生成后续轨迹
        if first_fatal < len(trajectory.points):
            anchor = trajectory.points[first_fatal - 1] if first_fatal > 0 else trajectory.points[0]
            
            # 简化的物理修正：保持动量守恒
            x = anchor.dimensions.get("pos_x", 0)
            y = anchor.dimensions.get("pos_y", 0)
            vx = anchor.velocity.get("pos_x", 0)
            vy = anchor.velocity.get("pos_y", 0)
            rot = anchor.dimensions.get("rotation", 0)
            ang_v = anchor.velocity.get("rotation", 0)
            
            gravity = 0.5
            bounce = 0.75
            
            start_t = anchor.t
            remaining = [p for p in trajectory.points if p.t > start_t]
            
            for target_point in remaining:
                dt = target_point.t - corrected.points[-1].t
                if dt <= 0:
                    continue
                
                # 物理正确的更新
                vy += gravity * dt
                x += vx * dt
                y += vy * dt
                rot += ang_v * dt
                
                # 边界碰撞
                if y < 0.1:
                    y = 0.1
                    vy = -vy * bounce
                    vx *= 0.95
                    ang_v *= 0.9
                if y > 0.95:
                    y = 0.95
                    vy = -vy * bounce
                if x < 0.05:
                    x = 0.05
                    vx = -vx * bounce
                    ang_v = -ang_v * 0.9
                if x > 0.95:
                    x = 0.95
                    vx = -vx * bounce
                    ang_v = -ang_v * 0.9
                
                # 保留原始轨迹中与物理不冲突的维度（颜色、纹理等）
                new_dims = dict(target_point.dimensions)
                new_dims["pos_x"] = x
                new_dims["pos_y"] = y
                new_dims["rotation"] = rot % (2 * math.pi)
                
                new_point = TrajectoryPoint(
                    t=target_point.t,
                    dimensions=new_dims,
                    velocity={
                        "pos_x": vx,
                        "pos_y": vy,
                        "rotation": ang_v,
                    },
                    confidence=target_point.confidence * 0.85,
                    metadata={**target_point.metadata, "physics_corrected": True},
                )
                corrected.add_point(new_point)
        
        return corrected
    
    def veto_decision(self, trajectory: VideoTrajectory) -> tuple[bool, str]:
        """
        简化的否决决策接口
        
        Returns:
            (是否通过, 理由)
        """
        result = self.check(trajectory)
        
        if result.passed:
            return True, "物理合规，通过"
        
        fatal = result.fatal_count
        total = result.violation_count
        reason = f"未通过：{fatal} 处致命违规，共 {total} 处问题，合规度 {result.overall_score:.1%}"
        return False, reason
