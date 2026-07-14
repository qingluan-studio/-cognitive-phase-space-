export interface ConvergenceTarget {
  id: string;
  targetValue: number;
  currentValue: number;
  decayRate: number;
  createdAt: number;
  iterations: number;
  convergenceMode: 'exponential' | 'logarithmic' | 'power' | 'oscillating';
  trajectory: number[];
}

export interface ConvergenceStep {
  targetId: string;
  iteration: number;
  previous: number;
  next: number;
  delta: number;
  distance: number;
  tension: number;
  lyapunovEstimate: number;
  phase: number;
}

export class AsymptoticConverger {
  private _targets: Map<string, ConvergenceTarget> = new Map();
  private _steps: ConvergenceStep[] = [];
  private _idCounter = 0;
  private _maxIterationsPerStep = 1;
  private _epsilon = 1e-9;
  private _logisticR = 3.9;
  private _logisticX = 0.3;
  private _embeddingDim = 3;
  private _delay = 1;

  addTarget(targetValue: number, initialValue: number = 0, decayRate: number = 0.5, mode?: ConvergenceTarget['convergenceMode']): ConvergenceTarget {
    if (decayRate <= 0 || decayRate >= 1) throw new Error('Decay rate must be in (0, 1)');
    const id = `target-${++this._idCounter}-${Date.now()}`;
    const target: ConvergenceTarget = {
      id, targetValue, currentValue: initialValue, decayRate,
      createdAt: Date.now(), iterations: 0,
      convergenceMode: mode || 'exponential', trajectory: [initialValue],
    };
    this._targets.set(id, target);
    return target;
  }

  step(targetId: string): ConvergenceStep {
    const target = this._targets.get(targetId);
    if (!target) throw new Error(`Target not found: ${targetId}`);
    const previous = target.currentValue;
    const gap = target.targetValue - previous;
    const chaos = this._nextLogistic();
    const delta = this._computeDelta(gap, target.decayRate, target.convergenceMode, target.iterations, chaos);
    const next = previous + delta;
    target.currentValue = next;
    target.iterations++;
    target.trajectory.push(next);
    if (target.trajectory.length > 200) target.trajectory.shift();
    const distance = Math.abs(target.targetValue - next);
    const stepRecord: ConvergenceStep = {
      targetId, iteration: target.iterations, previous, next, delta, distance,
      tension: this._computeTension(distance, target.decayRate),
      lyapunovEstimate: this._estimateLyapunov(target.trajectory),
      phase: this._computePhase(target),
    };
    this._steps.push(stepRecord);
    return stepRecord;
  }

  stepAll(): ConvergenceStep[] {
    const results: ConvergenceStep[] = [];
    for (const targetId of this._targets.keys()) {
      for (let i = 0; i < this._maxIterationsPerStep; i++) results.push(this.step(targetId));
    }
    return results;
  }

  forceArrival(targetId: string): boolean {
    const target = this._targets.get(targetId);
    if (!target) return false;
    target.currentValue = target.targetValue;
    target.trajectory.push(target.targetValue);
    if (target.trajectory.length > 200) target.trajectory.shift();
    return true;
  }

  resetTarget(targetId: string, initialValue: number): boolean {
    const target = this._targets.get(targetId);
    if (!target) return false;
    target.currentValue = initialValue;
    target.iterations = 0;
    target.trajectory = [initialValue];
    return true;
  }

  setMaxIterationsPerStep(n: number): void {
    if (n < 1) throw new Error('Must be at least 1');
    this._maxIterationsPerStep = n;
  }

  setLogisticR(r: number): void {
    if (r < 3.5 || r > 4.0) throw new Error('Logistic R must be in [3.5, 4.0] for chaotic regime');
    this._logisticR = r;
  }

  getTarget(targetId: string): ConvergenceTarget | undefined { return this._targets.get(targetId); }

  getProgress(targetId: string): number {
    const target = this._targets.get(targetId);
    if (!target) return 0;
    const totalGap = Math.abs(target.targetValue) + Math.abs(target.currentValue);
    if (totalGap === 0) return 1;
    return 1 - Math.abs(target.targetValue - target.currentValue) / Math.max(totalGap, this._epsilon);
  }

  getTension(targetId: string): number {
    const target = this._targets.get(targetId);
    if (!target) return 0;
    return this._computeTension(Math.abs(target.targetValue - target.currentValue), target.decayRate);
  }

  getFractalDimension(targetId: string): number {
    const target = this._targets.get(targetId);
    if (!target || target.trajectory.length < 20) return 1.0;
    return this._boxCountingDimension(target.trajectory);
  }

  getLyapunovExponent(targetId: string): number {
    const target = this._targets.get(targetId);
    if (!target) return 0;
    return this._estimateLyapunov(target.trajectory);
  }

  get steps(): ConvergenceStep[] { return [...this._steps]; }
  get targetCount(): number { return this._targets.size; }
  get maxIterationsPerStep(): number { return this._maxIterationsPerStep; }

  _computeDelta(gap: number, decayRate: number, mode: ConvergenceTarget['convergenceMode'], iteration: number, chaos: number): number {
    switch (mode) {
      case 'exponential': return gap * decayRate * (0.95 + 0.1 * chaos);
      case 'logarithmic': {
        const f = 1 / Math.log2(iteration + 2);
        return gap * Math.min(decayRate, f) * (0.9 + 0.2 * chaos);
      }
      case 'power': {
        const f = 1 / Math.pow(iteration + 1, 0.75);
        return gap * Math.min(decayRate, f) * (0.85 + 0.3 * chaos);
      }
      case 'oscillating': {
        const osc = Math.sin(iteration * 0.1 * decayRate * 10) * 0.3;
        return gap * decayRate * (0.7 + osc + 0.2 * chaos);
      }
      default: return gap * decayRate;
    }
  }

  _computeTension(distance: number, decayRate: number): number {
    return Math.tanh(distance) * (1 / decayRate);
  }

  _nextLogistic(): number {
    this._logisticX = this._logisticR * this._logisticX * (1 - this._logisticX);
    return this._logisticX;
  }

  _estimateLyapunov(trajectory: number[]): number {
    if (trajectory.length < 10) return 0;
    let total = 0, count = 0;
    for (let i = 1; i < trajectory.length; i++) {
      const diff = Math.abs(trajectory[i] - trajectory[i - 1]);
      if (diff > this._epsilon) { total += Math.log(diff); count++; }
    }
    return count > 0 ? total / count : 0;
  }

  _computePhase(target: ConvergenceTarget): number {
    const traj = target.trajectory;
    const n = traj.length;
    const needed = this._embeddingDim * this._delay;
    if (n < needed || target.iterations < 2) return 0;
    const recent = traj.slice(-needed);
    const v1: number[] = [], v2: number[] = [];
    for (let i = 0; i < this._embeddingDim; i++) {
      v1.push(recent[i * this._delay]);
      if (i * this._delay + 1 < recent.length) v2.push(recent[i * this._delay + 1]);
    }
    if (v1.length < 2 || v2.length < 2) return 0;
    const dot = v1.reduce((s, v, i) => s + v * (v2[i] || 0), 0);
    const m1 = Math.sqrt(v1.reduce((s, v) => s + v * v, 0));
    const m2 = Math.sqrt(v2.reduce((s, v) => s + v * v, 0));
    if (m1 === 0 || m2 === 0) return 0;
    return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2))));
  }

  _boxCountingDimension(trajectory: number[]): number {
    const min = Math.min(...trajectory);
    const max = Math.max(...trajectory);
    const range = max - min;
    if (range === 0) return 1.0;
    const ratios = [0.5, 0.25, 0.125, 0.0625];
    const counts: number[] = [];
    for (const r of ratios) {
      const size = r * range;
      const boxes = new Set<number>();
      for (const v of trajectory) boxes.add(Math.floor((v - min) / size));
      counts.push(boxes.size);
    }
    let sumLs = 0, sumLc = 0, sumProd = 0, sumSq = 0;
    const m = ratios.length;
    for (let i = 0; i < m; i++) {
      const ls = Math.log(1 / (ratios[i] * range));
      const lc = Math.log(Math.max(1, counts[i]));
      sumLs += ls; sumLc += lc; sumProd += ls * lc; sumSq += ls * ls;
    }
    const slope = (m * sumProd - sumLs * sumLc) / (m * sumSq - sumLs * sumLs);
    return isNaN(slope) ? 1.0 : Math.max(0.5, Math.min(2.0, slope));
  }
}
