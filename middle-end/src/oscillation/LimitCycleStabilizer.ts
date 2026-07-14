/**
 * 极限环稳定器：将混沌稳定到周期轨道。
 * 通过反馈控制将混沌轨迹引导到稳定的极限环上，避免发散与塌缩。
 */

export interface ChaosTrajectory {
  id: string;
  points: number[][];
  entropy: number;
}

export interface LimitCycle {
  id: string;
  center: number[];
  radius: number;
  frequency: number;
  stabilized: boolean;
}

export class LimitCycleStabilizer {
  private _trajectories: Map<string, ChaosTrajectory> = new Map();
  private _cycles: Map<string, LimitCycle> = new Map();
  private _gain = 0.3;
  private _maxSteps = 1000;

  ingestTrajectory(t: ChaosTrajectory): void {
    this._trajectories.set(t.id, t);
  }

  deriveCycle(trajectoryId: string): LimitCycle | null {
    const t = this._trajectories.get(trajectoryId);
    if (!t || t.points.length < 3) return null;
    const dims = t.points[0].length;
    const center = Array.from({ length: dims }, () => 0);
    for (const p of t.points) for (let d = 0; d < dims; d++) center[d] += p[d];
    for (let d = 0; d < dims; d++) center[d] /= t.points.length;
    let radius = 0;
    for (const p of t.points) {
      let dist = 0;
      for (let d = 0; d < dims; d++) dist += (p[d] - center[d]) ** 2;
      radius += Math.sqrt(dist);
    }
    radius /= t.points.length;
    const cycle: LimitCycle = {
      id: `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      center,
      radius,
      frequency: 1 / (t.points.length || 1),
      stabilized: false,
    };
    this._cycles.set(cycle.id, cycle);
    return cycle;
  }

  stabilize(cycleId: string, steps: number = 100): LimitCycle | null {
    const cycle = this._cycles.get(cycleId);
    if (!cycle) return null;
    const runSteps = Math.min(steps, this._maxSteps);
    for (let i = 0; i < runSteps; i++) {
      const error = (Math.random() - 0.5) * cycle.radius;
      cycle.radius += -this._gain * error;
      cycle.radius = Math.max(0.01, cycle.radius);
    }
    cycle.stabilized = true;
    return cycle;
  }

  setGain(value: number): void {
    this._gain = Math.max(0, Math.min(1, value));
  }

  computeEntropy(trajectoryId: string): number {
    const t = this._trajectories.get(trajectoryId);
    if (!t) return 0;
    let entropy = 0;
    for (let i = 1; i < t.points.length; i++) {
      const prev = t.points[i - 1][0] ?? 0;
      const curr = t.points[i][0] ?? 0;
      const diff = curr - prev;
      if (diff !== 0) entropy -= Math.abs(diff) * Math.log(Math.abs(diff));
    }
    t.entropy = entropy;
    return entropy;
  }

  getCycle(id: string): LimitCycle | null {
    return this._cycles.get(id) ?? null;
  }

  getCycles(): LimitCycle[] {
    return Array.from(this._cycles.values());
  }
}
