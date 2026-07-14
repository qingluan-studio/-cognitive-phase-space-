/** 渐近收敛器 - 永远逼近目标但永不抵达，保持永恒优化张力 */

export interface ConvergenceTarget {
  id: string;
  targetValue: number;
  currentValue: number;
  decayRate: number;
  createdAt: number;
  iterations: number;
}

export interface ConvergenceStep {
  targetId: string;
  iteration: number;
  previous: number;
  next: number;
  delta: number;
  distance: number;
  tension: number;
}

export class AsymptoticConverger {
  private _targets: Map<string, ConvergenceTarget> = new Map();
  private _steps: ConvergenceStep[] = [];
  private _idCounter = 0;
  private _maxIterationsPerStep = 1;
  private _epsilon = 1e-9;

  addTarget(targetValue: number, initialValue: number = 0, decayRate: number = 0.5): ConvergenceTarget {
    if (decayRate <= 0 || decayRate >= 1) {
      throw new Error('Decay rate must be in (0, 1)');
    }
    const id = `target-${++this._idCounter}-${Date.now()}`;
    const target: ConvergenceTarget = {
      id,
      targetValue,
      currentValue: initialValue,
      decayRate,
      createdAt: Date.now(),
      iterations: 0,
    };
    this._targets.set(id, target);
    return target;
  }

  step(targetId: string): ConvergenceStep {
    const target = this._targets.get(targetId);
    if (!target) throw new Error(`Target not found: ${targetId}`);
    const previous = target.currentValue;
    const gap = target.targetValue - previous;
    const delta = gap * target.decayRate;
    const next = previous + delta;
    target.currentValue = next;
    target.iterations++;
    const distance = Math.abs(target.targetValue - next);
    const tension = this._computeTension(distance, target.decayRate);
    const stepRecord: ConvergenceStep = {
      targetId,
      iteration: target.iterations,
      previous,
      next,
      delta,
      distance,
      tension,
    };
    this._steps.push(stepRecord);
    return stepRecord;
  }

  stepAll(): ConvergenceStep[] {
    const results: ConvergenceStep[] = [];
    for (const targetId of this._targets.keys()) {
      for (let i = 0; i < this._maxIterationsPerStep; i++) {
        results.push(this.step(targetId));
      }
    }
    return results;
  }

  forceArrival(targetId: string): boolean {
    const target = this._targets.get(targetId);
    if (!target) return false;
    target.currentValue = target.targetValue;
    return true;
  }

  resetTarget(targetId: string, initialValue: number): boolean {
    const target = this._targets.get(targetId);
    if (!target) return false;
    target.currentValue = initialValue;
    target.iterations = 0;
    return true;
  }

  setMaxIterationsPerStep(n: number): void {
    if (n < 1) throw new Error('Must be at least 1');
    this._maxIterationsPerStep = n;
  }

  getTarget(targetId: string): ConvergenceTarget | undefined {
    return this._targets.get(targetId);
  }

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
    const distance = Math.abs(target.targetValue - target.currentValue);
    return this._computeTension(distance, target.decayRate);
  }

  get steps(): ConvergenceStep[] {
    return [...this._steps];
  }

  get targetCount(): number {
    return this._targets.size;
  }

  get maxIterationsPerStep(): number {
    return this._maxIterationsPerStep;
  }

  private _computeTension(distance: number, decayRate: number): number {
    return Math.tanh(distance) * (1 / decayRate);
  }
}
