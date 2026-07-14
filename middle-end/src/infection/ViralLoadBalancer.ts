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
  private _integralError = 0;
  private _previousError = 0;
  private _kp = 0.3;
  private _ki = 0.05;
  private _kd = 0.1;

  registerIntervention(name: string, r0Reduction: number): void {
    this._interventions.set(name, r0Reduction);
  }

  measure(currentLoad: number): LoadMeasurement {
    this._load = currentLoad;
    const error = this._r0 - this._targetR0;
    this._integralError += error;
    const derivative = error - this._previousError;
    this._previousError = error;
    let totalReduction = 0;
    if (Math.abs(error) > this._tolerance) {
      const pidOutput = this._kp * error + this._ki * this._integralError + this._kd * derivative;
      totalReduction = this._selectInterventions(Math.max(0, pidOutput));
    }
    this._r0 = Math.max(0, this._r0 - totalReduction);
    if (this._r0 < this._targetR0 - this._tolerance) {
      this._r0 = this._targetR0 + this._tolerance * 0.5;
      this._integralError *= 0.5;
    }
    const measurement: LoadMeasurement = {
      timestamp: Date.now(),
      r0: this._r0,
      load: currentLoad,
      intervention: totalReduction > 0 ? `reduction-${totalReduction.toFixed(3)}` : 'none',
    };
    this._measurements.push(measurement);
    if (this._measurements.length > 200) this._measurements.shift();
    return measurement;
  }

  private _selectInterventions(requiredReduction: number): number {
    const sorted = Array.from(this._interventions.entries()).sort((a, b) => b[1] - a[1]);
    let accumulated = 0;
    for (const [, reduction] of sorted) {
      if (accumulated >= requiredReduction) break;
      accumulated += reduction;
    }
    return Math.min(accumulated, requiredReduction * 1.2);
  }

  adjustTarget(newTarget: number): void {
    this._targetR0 = Math.max(0, newTarget);
    this._integralError = 0;
  }

  simulateStep(dt: number): number {
    const growth = Math.exp((this._r0 - 1) * dt);
    this._load = this._load * growth;
    return this._load;
  }

  forecast(horizon: number): number {
    let projectedLoad = this._load;
    let projectedR0 = this._r0;
    for (let i = 0; i < horizon; i++) {
      const error = projectedR0 - this._targetR0;
      if (Math.abs(error) > this._tolerance) {
        projectedR0 = Math.max(0, projectedR0 - error * 0.15);
      }
      projectedLoad *= Math.exp((projectedR0 - 1) * 0.1);
    }
    return projectedLoad;
  }

  computeConfidenceInterval(horizon: number): { lower: number; upper: number } {
    const projected = this.forecast(horizon);
    const variance = Math.abs(this._r0 - this._targetR0) * projected * 0.2;
    return {
      lower: Math.max(0, projected - 1.96 * Math.sqrt(variance)),
      upper: projected + 1.96 * Math.sqrt(variance),
    };
  }

  listInterventions(): string[] {
    return Array.from(this._interventions.keys());
  }

  isControlled(): boolean {
    return Math.abs(this._r0 - this._targetR0) <= this._tolerance;
  }

  computeControlEffort(): number {
    return Math.abs(this._kp * this._previousError)
      + Math.abs(this._ki * this._integralError)
      + Math.abs(this._kd * this._previousError);
  }

  setTolerance(value: number): void {
    this._tolerance = Math.max(0, value);
  }

  tuneGains(kp: number, ki: number, kd: number): void {
    this._kp = Math.max(0, kp);
    this._ki = Math.max(0, ki);
    this._kd = Math.max(0, kd);
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

  get integralError(): number {
    return this._integralError;
  }
}
