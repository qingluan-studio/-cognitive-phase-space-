export interface ChaosTrajectory {
  id: string;
  points: number[][];
  entropy: number;
  lyapunovExponent: number;
}

export interface LimitCycle {
  id: string;
  center: number[];
  radius: number;
  frequency: number;
  stabilized: boolean;
  floquetMultiplier: number;
}

export class LimitCycleStabilizer {
  private _trajectories: Map<string, ChaosTrajectory> = new Map();
  private _cycles: Map<string, LimitCycle> = new Map();
  private _gain = 0.3;
  private _maxSteps = 1000;
  private _vanDerPolMu = 1.0;
  private _poincareSection: number[][] = [];

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
      floquetMultiplier: 0,
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
    cycle.floquetMultiplier = this._computeFloquetMultiplier(cycle);
    cycle.stabilized = cycle.floquetMultiplier < 1;
    return cycle;
  }

  vanDerPolStep(x: number, y: number, dt: number): [number, number] {
    const dx = y * dt;
    const dy = (this._vanDerPolMu * (1 - x * x) * y - x) * dt;
    return [x + dx, y + dy];
  }

  integrateVanDerPol(initialX: number, initialY: number, steps: number): number[][] {
    const points: number[][] = [[initialX, initialY]];
    let [x, y] = [initialX, initialY];
    const dt = 0.01;
    for (let i = 0; i < steps; i++) {
      [x, y] = this.vanDerPolStep(x, y, dt);
      points.push([x, y]);
    }
    return points;
  }

  computeHopfBifurcation(mu: number): { stable: boolean; radius: number } {
    if (mu <= 0) return { stable: true, radius: 0 };
    return { stable: false, radius: Math.sqrt(mu) };
  }

  computePoincareMap(cycleId: string): number[][] {
    const cycle = this._cycles.get(cycleId);
    if (!cycle) return [];
    const section: number[][] = [];
    for (let i = 0; i < 50; i++) {
      const theta = (i / 50) * Math.PI * 2;
      const r = cycle.radius + 0.1 * (Math.random() - 0.5);
      const x = cycle.center[0] + r * Math.cos(theta);
      const y = cycle.center[1] + r * Math.sin(theta);
      section.push([x, y]);
    }
    this._poincareSection = section;
    return section;
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

  computeLyapunovExponent(trajectoryId: string): number {
    const t = this._trajectories.get(trajectoryId);
    if (!t || t.points.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < t.points.length; i++) {
      const d0 = this._distance(t.points[i - 1], [0, 0]);
      const d1 = this._distance(t.points[i], [0, 0]);
      if (d0 > 0) sum += Math.log(d1 / d0);
    }
    t.lyapunovExponent = sum / t.points.length;
    return t.lyapunovExponent;
  }

  getCycle(id: string): LimitCycle | null {
    return this._cycles.get(id) ?? null;
  }

  getCycles(): LimitCycle[] {
    return Array.from(this._cycles.values());
  }

  get poincareSection(): number[][] {
    return this._poincareSection.map((p) => [...p]);
  }

  private _computeFloquetMultiplier(cycle: LimitCycle): number {
    const mu = this._vanDerPolMu;
    const r = cycle.radius;
    return Math.exp(-mu * (r * r - 1) * 2 * Math.PI);
  }

  private _distance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }
}
