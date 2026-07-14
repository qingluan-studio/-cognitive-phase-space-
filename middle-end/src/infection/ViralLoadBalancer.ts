/**
 * 病毒载量平衡器：控制感染扩散的R0值。
 * 动态调节感染的基本再生数 R0，使疫情保持在可控范围内，避免雪崩或消失。
 */

export interface LoadMeasurement {
  timestamp: number;
  r0: number;
  load: number;
  intervention: string;
}

export class ViralLoadBalancer {
  private _measurements: LoadMeasurement[] = [];
  private _r0 = 1.5;
  private _targetR0 = 1.0;
  private _load = 0;
  private _tolerance = 0.2;
  private _interventions: Map<string, number> = new Map();

  registerIntervention(name: string, r0Reduction: number): void {
    this._interventions.set(name, r0Reduction);
  }

  measure(currentLoad: number): LoadMeasurement {
    this._load = currentLoad;
    let totalReduction = 0;
    if (this._r0 > this._targetR0 + this._tolerance) {
      const sorted = Array.from(this._interventions.entries()).sort((a, b) => b[1] - a[1]);
      for (const [name, reduction] of sorted) {
        if (this._r0 - totalReduction <= this._targetR0 + this._tolerance) break;
        totalReduction += reduction;
      }
    }
    this._r0 = Math.max(0, this._r0 - totalReduction);
    const measurement: LoadMeasurement = {
      timestamp: Date.now(),
      r0: this._r0,
      load: currentLoad,
      intervention: totalReduction > 0 ? `reduction-${totalReduction.toFixed(2)}` : 'none',
    };
    this._measurements.push(measurement);
    if (this._measurements.length > 200) this._measurements.shift();
    return measurement;
  }

  adjustTarget(newTarget: number): void {
    this._targetR0 = Math.max(0, newTarget);
  }

  simulateStep(dt: number): number {
    const growth = Math.exp((this._r0 - 1) * dt);
    this._load = this._load * growth;
    return this._load;
  }

  forecast(horizon: number): number {
    let projectedLoad = this._load;
    for (let i = 0; i < horizon; i++) {
      projectedLoad *= Math.exp((this._r0 - 1) * 0.1);
    }
    return projectedLoad;
  }

  listInterventions(): string[] {
    return Array.from(this._interventions.keys());
  }

  isControlled(): boolean {
    return Math.abs(this._r0 - this._targetR0) <= this._tolerance;
  }

  setTolerance(value: number): void {
    this._tolerance = Math.max(0, value);
  }

  getMeasurements(limit: number = 50): LoadMeasurement[] {
    return this._measurements.slice(-limit);
  }

  get currentR0(): number {
    return this._r0;
  }

  get currentLoad(): number {
    return this._load;
  }
}
