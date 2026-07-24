/**
 * 水逻辑否决权 (Water Logic Veto) — TypeScript 端
 *
 * 核心思想：像水一样，物理定律不可违背。
 * 检查轨迹是否违反动量、能量、角动量守恒，并自动修正违规轨迹。
 */

import type { TrajectoryPoint, VideoTrajectory } from './trajectory';

export type ConservationLaw = 'momentum' | 'energy' | 'angular_momentum' | 'mass' | 'charge';

export interface PhysicsViolation {
  law: ConservationLaw;
  timestamp: number;
  magnitude: number;
  description: string;
  frameIndex: number;
  corrected: boolean;
}

export interface VetoResult {
  passed: boolean;
  violations: PhysicsViolation[];
  correctedTrajectory: VideoTrajectory | null;
  overallScore: number;
}

function severity(magnitude: number): string {
  if (magnitude < 0.1) return '轻微';
  if (magnitude < 0.3) return '中等';
  if (magnitude < 0.6) return '严重';
  return '致命';
}

export class WaterLogicVeto {
  tolerance: number;
  autoCorrect: boolean;
  activeLaws: ConservationLaw[];

  constructor(tolerance = 0.15, autoCorrect = true) {
    this.tolerance = tolerance;
    this.autoCorrect = autoCorrect;
    this.activeLaws = ['momentum', 'energy', 'angular_momentum'];
  }

  check(trajectory: VideoTrajectory): VetoResult {
    const result: VetoResult = {
      passed: true,
      violations: [],
      correctedTrajectory: null,
      overallScore: 1.0,
    };

    if (trajectory.points.length < 2) return result;

    let violations: PhysicsViolation[] = [];
    for (const law of this.activeLaws) {
      violations = violations.concat(this._checkLaw(trajectory, law));
    }

    const significant = violations.filter(v => v.magnitude > this.tolerance);
    result.violations = significant;

    if (violations.length) {
      const avgMagnitude = violations.reduce((s, v) => s + v.magnitude, 0) / violations.length;
      result.overallScore = Math.max(0.0, 1.0 - avgMagnitude);
    }

    const fatalCount = significant.filter(v => severity(v.magnitude) === '致命').length;
    result.passed = fatalCount === 0;

    if (this.autoCorrect && !result.passed) {
      result.correctedTrajectory = this._correctTrajectory(trajectory, significant);
      for (const v of significant) v.corrected = true;
    }

    return result;
  }

  private _checkLaw(trajectory: VideoTrajectory, law: ConservationLaw): PhysicsViolation[] {
    switch (law) {
      case 'momentum':
        return this._checkMomentum(trajectory);
      case 'energy':
        return this._checkEnergy(trajectory);
      case 'angular_momentum':
        return this._checkAngularMomentum(trajectory);
      default:
        return [];
    }
  }

  private _checkMomentum(trajectory: VideoTrajectory): PhysicsViolation[] {
    const violations: PhysicsViolation[] = [];
    for (const dim of ['pos_x', 'pos_y', 'pos_z']) {
      const velocities: number[] = [];
      const times: number[] = [];
      for (let i = 0; i < trajectory.points.length; i++) {
        const p = trajectory.points[i];
        if (dim in p.velocity) {
          velocities.push(p.velocity[dim]);
          times.push(p.t);
        } else if (dim in p.dimensions && i > 0) {
          const prev = trajectory.points[i - 1];
          if (dim in prev.dimensions) {
            const dt = p.t - prev.t;
            if (dt > 0) {
              velocities.push((p.dimensions[dim] - prev.dimensions[dim]) / dt);
              times.push(p.t);
            }
          }
        }
      }
      if (velocities.length < 10) continue;

      const accels: number[] = [];
      for (let i = 1; i < velocities.length; i++) {
        const dt = times[i] - times[i - 1];
        if (dt > 0) accels.push((velocities[i] - velocities[i - 1]) / dt);
      }
      if (accels.length < 5) continue;

      const meanAccel = accels.reduce((a, b) => a + b, 0) / accels.length;
      const stdAccel = Math.sqrt(
        accels.reduce((s, a) => s + (a - meanAccel) ** 2, 0) / accels.length,
      );

      let directionChanges = 0;
      for (let i = 1; i < accels.length; i++) {
        if ((accels[i] > 0) !== (accels[i - 1] > 0)) directionChanges++;
      }
      const changeRate = directionChanges / accels.length;

      if (changeRate > 0.4 && stdAccel > 5.0) {
        const magnitude = Math.min(1.0, (changeRate - 0.4) * 2 + stdAccel / 20);
        violations.push({
          law: 'momentum',
          timestamp: times[Math.floor(times.length / 2)],
          magnitude,
          description: `维度 ${dim} 运动不规律: 加速度方向变化率=${(changeRate * 100).toFixed(1)}%, 标准差=${stdAccel.toFixed(2)}`,
          frameIndex: Math.floor(trajectory.points.length / 2),
          corrected: false,
        });
      }
    }
    return violations;
  }

  private _checkEnergy(trajectory: VideoTrajectory): PhysicsViolation[] {
    const violations: PhysicsViolation[] = [];
    const energies: number[] = [];
    for (let i = 0; i < trajectory.points.length; i++) {
      const p = trajectory.points[i];
      if (!('pos_x' in p.velocity) && i > 0) {
        const prev = trajectory.points[i - 1];
        const dt = p.t - prev.t;
        if (dt > 0) {
          p.velocity = { ...p.velocity };
          p.velocity.pos_x = (p.dimensions.pos_x - prev.dimensions.pos_x) / dt;
          p.velocity.pos_y = (p.dimensions.pos_y - prev.dimensions.pos_y) / dt;
          p.velocity.pos_z = (p.dimensions.pos_z - prev.dimensions.pos_z) / dt;
        }
      }
      const vx = p.velocity.pos_x ?? 0;
      const vy = p.velocity.pos_y ?? 0;
      const vz = p.velocity.pos_z ?? 0;
      const ke = 0.5 * (vx * vx + vy * vy + vz * vz);
      const pe = (p.dimensions.pos_y ?? 0) * 0.5;
      energies.push(ke + pe);
    }

    if (energies.length < 2) return violations;

    let baseline = energies[0];
    for (let i = 1; i < energies.length; i++) {
      if (baseline > 0.001) {
        const ratio = energies[i] / baseline;
        if (ratio > 1.5) {
          const magnitude = Math.min(1.0, (ratio - 1.0) / 2.0);
          violations.push({
            law: 'energy',
            timestamp: trajectory.points[i].t,
            magnitude,
            description: `能量异常增加: ${baseline.toFixed(4)} → ${energies[i].toFixed(4)} (×${ratio.toFixed(2)})`,
            frameIndex: i,
            corrected: false,
          });
        }
      }
      baseline = energies[i];
    }
    return violations;
  }

  private _checkAngularMomentum(trajectory: VideoTrajectory): PhysicsViolation[] {
    const violations: PhysicsViolation[] = [];
    const rotations = trajectory.points.map(p => p.velocity.rotation ?? 0);
    if (rotations.length < 2) return violations;

    for (let i = 1; i < rotations.length; i++) {
      if (Math.abs(rotations[i - 1]) > 0.01) {
        const ratio = Math.abs(rotations[i] / rotations[i - 1]);
        if (ratio < 0.7 || ratio > 1.3) {
          const magnitude = Math.min(1.0, Math.abs(1.0 - ratio));
          violations.push({
            law: 'angular_momentum',
            timestamp: trajectory.points[i].t,
            magnitude,
            description: `角速度突变: ${rotations[i - 1].toFixed(3)} → ${rotations[i].toFixed(3)}`,
            frameIndex: i,
            corrected: false,
          });
        }
      }
    }
    return violations;
  }

  private _correctTrajectory(
    trajectory: VideoTrajectory,
    violations: PhysicsViolation[],
  ): VideoTrajectory {
    const corrected: VideoTrajectory = {
      trajectoryId: `${trajectory.trajectoryId}-corrected`,
      sourceExpert: `${trajectory.sourceExpert}_corrected`,
      confidence: trajectory.confidence * 0.9,
      points: [],
    };

    if (trajectory.points.length < 2) return trajectory;

    let firstFatal = trajectory.points.length;
    for (const v of violations) {
      if (severity(v.magnitude) === '致命' && v.frameIndex >= 0) {
        firstFatal = Math.min(firstFatal, v.frameIndex);
      }
    }

    for (let i = 0; i < Math.min(firstFatal, trajectory.points.length); i++) {
      corrected.points.push(trajectory.points[i]);
    }

    if (firstFatal < trajectory.points.length) {
      const anchor = firstFatal > 0 ? trajectory.points[firstFatal - 1] : trajectory.points[0];
      let x = anchor.dimensions.pos_x ?? 0;
      let y = anchor.dimensions.pos_y ?? 0;
      let vx = anchor.velocity.pos_x ?? 0;
      let vy = anchor.velocity.pos_y ?? 0;
      let rot = anchor.dimensions.rotation ?? 0;
      let angV = anchor.velocity.rotation ?? 0;

      const gravity = 0.5;
      const bounce = 0.75;
      const startT = anchor.t;
      const remaining = trajectory.points.filter(p => p.t > startT);

      for (const target of remaining) {
        const dt = target.t - corrected.points[corrected.points.length - 1].t;
        if (dt <= 0) continue;

        vy += gravity * dt;
        x += vx * dt;
        y += vy * dt;
        rot += angV * dt;

        if (y < 0.1) {
          y = 0.1;
          vy = -vy * bounce;
          vx *= 0.95;
          angV *= 0.9;
        } else if (y > 0.95) {
          y = 0.95;
          vy = -vy * bounce;
        }
        if (x < 0.05) {
          x = 0.05;
          vx = -vx * bounce;
          angV = -angV * 0.9;
        } else if (x > 0.95) {
          x = 0.95;
          vx = -vx * bounce;
          angV = -angV * 0.9;
        }

        const newDims = { ...target.dimensions, pos_x: x, pos_y: y, rotation: rot % (2 * Math.PI) };
        const newPoint: TrajectoryPoint = {
          t: target.t,
          dimensions: newDims,
          velocity: { pos_x: vx, pos_y: vy, rotation: angV },
          confidence: (target.confidence ?? 1.0) * 0.85,
          metadata: { ...target.metadata, physics_corrected: true },
        };
        corrected.points.push(newPoint);
      }
    }

    return corrected;
  }

  vetoDecision(trajectory: VideoTrajectory): { passed: boolean; reason: string } {
    const result = this.check(trajectory);
    if (result.passed) {
      return { passed: true, reason: '物理合规，通过' };
    }
    const fatal = result.violations.filter(v => severity(v.magnitude) === '致命').length;
    const total = result.violations.length;
    return {
      passed: false,
      reason: `未通过：${fatal} 处致命违规，共 ${total} 处问题，合规度 ${(result.overallScore * 100).toFixed(1)}%`,
    };
  }
}
