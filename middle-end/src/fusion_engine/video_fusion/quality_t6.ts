/**
 * T6 视频版质量评估器 — TypeScript 端
 *
 * 六大不变量评估体系：
 *   TCI - Temporal Coherence Invariant   时序一致性
 *   SSI - Spatial Structure Invariant    空间结构
 *   PCI - Physical Consistency Invariant 物理一致性（水逻辑）
 *   IVI - Identity Continuity Invariant  身份连续性
 *   ASI - Aesthetic Stability Invariant  美学稳定性
 *   PVI - Phase Volume Invariant         相空间体积
 */

import type { VideoTrajectory } from './trajectory';
import { WaterLogicVeto } from './water_logic';

export interface VideoQualityDimensions {
  tci: number;
  ssi: number;
  pci: number;
  ivi: number;
  asi: number;
  pvi: number;
  overall: number;
}

export interface VideoAssessmentResult {
  trajectoryId: string;
  dimensions: VideoQualityDimensions;
  strengths: string[];
  weaknesses: string[];
  details: Record<string, unknown>;
}

const DIMENSION_NAMES: Record<string, string> = {
  tci: '时序一致性',
  ssi: '空间结构',
  pci: '物理一致性',
  ivi: '身份连续性',
  asi: '美学稳定性',
  pvi: '相空间体积',
  overall: '综合质量',
};

const WEIGHTS: Record<string, number> = {
  tci: 0.20,
  pci: 0.20,
  ivi: 0.20,
  ssi: 0.15,
  asi: 0.15,
  pvi: 0.10,
};

export class T6VideoAssessor {
  waterLogic: WaterLogicVeto;

  constructor() {
    this.waterLogic = new WaterLogicVeto(0.2, true);
  }

  assess(trajectory: VideoTrajectory): VideoAssessmentResult {
    const dims: VideoQualityDimensions = {
      tci: 0,
      ssi: 0,
      pci: 0,
      ivi: 0,
      asi: 0,
      pvi: 0,
      overall: 0,
    };

    if (!trajectory.points || trajectory.points.length < 2) {
      return {
        trajectoryId: trajectory.trajectoryId,
        dimensions: dims,
        strengths: [],
        weaknesses: ['轨迹点不足，无法评估'],
        details: { point_count: trajectory.points.length },
      };
    }

    dims.tci = this._assessTci(trajectory);
    dims.ssi = this._assessSsi(trajectory);
    dims.pci = this._assessPci(trajectory);
    dims.ivi = this._assessIvi(trajectory);
    dims.asi = this._assessAsi(trajectory);
    dims.pvi = this._assessPvi(trajectory);

    dims.overall =
      dims.tci * WEIGHTS.tci +
      dims.ssi * WEIGHTS.ssi +
      dims.pci * WEIGHTS.pci +
      dims.ivi * WEIGHTS.ivi +
      dims.asi * WEIGHTS.asi +
      dims.pvi * WEIGHTS.pvi;

    return {
      trajectoryId: trajectory.trajectoryId,
      dimensions: dims,
      strengths: this._generateStrengths(dims),
      weaknesses: this._generateWeaknesses(dims),
      details: {
        point_count: trajectory.points.length,
        duration: this._duration(trajectory),
        smoothness: this._smoothness(trajectory),
      },
    };
  }

  private _assessTci(traj: VideoTrajectory): number {
    const smoothness = this._smoothness(traj);
    let velocityJumps = 0;
    let totalChecks = 0;
    for (let i = 1; i < traj.points.length - 1; i++) {
      const prev = traj.points[i - 1];
      const curr = traj.points[i];
      const next = traj.points[i + 1];
      const dt = curr.t - prev.t;
      if (dt <= 0) continue;
      for (const dim of Object.keys(curr.dimensions)) {
        if (dim in prev.dimensions && dim in next.dimensions) {
          const v1 = (curr.dimensions[dim] - prev.dimensions[dim]) / dt;
          const v2 = (next.dimensions[dim] - curr.dimensions[dim]) / dt;
          if (Math.abs(v2 - v1) > 0.5) velocityJumps++;
          totalChecks++;
        }
      }
    }
    const jumpRate = totalChecks > 0 ? velocityJumps / totalChecks : 0;
    const jumpScore = Math.max(0.0, 1.0 - jumpRate * 2);
    return 0.6 * smoothness + 0.4 * jumpScore;
  }

  private _assessSsi(traj: VideoTrajectory): number {
    const depthDims = ['depth_near', 'depth_far', 'depth_range', 'scene_depth', 'pos_z'];
    const first = traj.points[0];
    let presentDims = depthDims.filter(d => d in first.dimensions);
    if (!presentDims.length) {
      presentDims = ['pos_x', 'pos_y'].filter(d => d in first.dimensions);
    }
    if (!presentDims.length) return 0.5;

    const scores = presentDims.map(dim => {
      const values = traj.points.map(p => p.dimensions[dim] ?? 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      if (Math.abs(mean) < 0.001) return 1.0;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const cv = Math.sqrt(variance) / Math.abs(mean);
      return Math.max(0.0, 1.0 - Math.min(1.0, cv * 2));
    });
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private _assessPci(traj: VideoTrajectory): number {
    return this.waterLogic.check(traj).overallScore;
  }

  private _assessIvi(traj: VideoTrajectory): number {
    return this._dimensionStability(traj);
  }

  private _assessAsi(traj: VideoTrajectory): number {
    const aestheticDims = [
      'hue', 'saturation', 'brightness', 'contrast',
      'composition_balance', 'style_coherence',
      'color_r', 'color_g', 'color_b',
    ];
    const first = traj.points[0];
    const present = aestheticDims.filter(d => d in first.dimensions);
    if (!present.length) return 0.6;

    const stabilities = present.map(dim => {
      const values = traj.points.map(p => p.dimensions[dim] ?? 0);
      let totalChange = 0;
      for (let i = 1; i < values.length; i++) {
        totalChange += Math.abs(values[i] - values[i - 1]);
      }
      const avgChange = values.length > 1 ? totalChange / (values.length - 1) : 0;
      return Math.max(0.0, 1.0 - avgChange * 10);
    });
    return stabilities.reduce((a, b) => a + b, 0) / stabilities.length;
  }

  private _assessPvi(traj: VideoTrajectory): number {
    if (traj.points.length < 10) return 0.7;
    const mid = Math.floor(traj.points.length / 2);
    const firstHalf = traj.points.slice(0, mid);
    const secondHalf = traj.points.slice(mid);

    const phaseVolume = (points: typeof traj.points): number => {
      if (!points.length) return 0;
      const dims = Object.keys(points[0].dimensions);
      let sum = 0;
      let count = 0;
      for (const dim of dims) {
        const values = points.map(p => p.dimensions[dim] ?? 0);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
        sum += Math.log(1 + variance);
        count++;
      }
      return count > 0 ? sum / count : 0;
    };

    const v1 = phaseVolume(firstHalf);
    const v2 = phaseVolume(secondHalf);
    if (v1 < 0.001 && v2 < 0.001) return 1.0;
    const ratio = Math.min(v1, v2) / Math.max(v1, v2);
    return Math.max(0.0, Math.min(1.0, ratio));
  }

  private _dimensionStability(traj: VideoTrajectory): number {
    if (!traj.points.length) return 0;
    const dims = Object.keys(traj.points[0].dimensions);
    const stabilities = dims.map(dim => {
      const values = traj.points.map(p => p.dimensions[dim] ?? 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      if (Math.abs(mean) < 0.001) return 0.8;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const cv = Math.sqrt(variance) / Math.abs(mean);
      return Math.max(0.0, 1.0 - Math.min(1.0, cv));
    });
    return stabilities.reduce((a, b) => a + b, 0) / stabilities.length;
  }

  private _generateStrengths(dims: VideoQualityDimensions): string[] {
    const strengths: string[] = [];
    for (const key of ['tci', 'pci', 'ivi', 'ssi', 'asi', 'pvi']) {
      const val = dims[key as keyof VideoQualityDimensions] as number;
      if (val > 0.85) strengths.push(`${DIMENSION_NAMES[key]}优秀 (${(val * 100).toFixed(0)}%)`);
    }
    if (dims.overall > 0.8) strengths.push(`综合质量优异 (${(dims.overall * 100).toFixed(0)}%)`);
    if (!strengths.length && dims.overall > 0.7) strengths.push('整体表现均衡');
    return strengths;
  }

  private _generateWeaknesses(dims: VideoQualityDimensions): string[] {
    const weaknesses: string[] = [];
    for (const key of ['tci', 'pci', 'ivi', 'ssi', 'asi', 'pvi']) {
      const val = dims[key as keyof VideoQualityDimensions] as number;
      if (val < 0.6) weaknesses.push(`${DIMENSION_NAMES[key]}不足 (${(val * 100).toFixed(0)}%)`);
    }
    if (dims.overall < 0.5) weaknesses.push(`整体质量偏低 (${(dims.overall * 100).toFixed(0)}%)`);
    return weaknesses;
  }

  private _duration(traj: VideoTrajectory): number {
    if (traj.points.length < 2) return 0;
    return traj.points[traj.points.length - 1].t - traj.points[0].t;
  }

  private _smoothness(traj: VideoTrajectory): number {
    if (traj.points.length < 3) return 1.0;
    let jumps = 0;
    let total = 0;
    for (let i = 1; i < traj.points.length - 1; i++) {
      const prev = traj.points[i - 1];
      const curr = traj.points[i];
      const next = traj.points[i + 1];
      const dt = curr.t - prev.t;
      if (dt <= 0) continue;
      for (const dim of Object.keys(curr.dimensions)) {
        if (dim in prev.dimensions && dim in next.dimensions) {
          const v1 = (curr.dimensions[dim] - prev.dimensions[dim]) / dt;
          const v2 = (next.dimensions[dim] - curr.dimensions[dim]) / dt;
          if (Math.abs(v2 - v1) > 0.5) jumps++;
          total++;
        }
      }
    }
    const jumpRate = total > 0 ? jumps / total : 0;
    return Math.max(0.0, 1.0 - jumpRate * 2);
  }
}
