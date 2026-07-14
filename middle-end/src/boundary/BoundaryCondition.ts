export interface BoundaryConditionData {
  readonly conditionId: string;
  lowerBound: number;
  upperBound: number;
  hardLimit: boolean;
  terminationAction: string;
}

export interface BoundaryCheck {
  value: number;
  boundary: 'lower' | 'upper' | 'none';
  violated: boolean;
  timestamp: number;
}

export class BoundaryCondition {
  private _data: BoundaryConditionData;
  private _checkLog: BoundaryCheck[] = [];
  private _violationCount: number = 0;
  private _asymptotePoint: number | null = null;
  private _terminated: boolean = false;
  private _lyapunovExponent: number = 0;
  private _fractalDimension: number = 1;
  private _criticalExponent: number = 0.5;
  private _phaseAccum: number = 0;

  constructor(data: BoundaryConditionData) {
    this._data = { ...data };
  }

  get conditionId(): string {
    return this._data.conditionId;
  }

  get bounds(): readonly [number, number] {
    return [this._data.lowerBound, this._data.upperBound];
  }

  get terminated(): boolean {
    return this._terminated;
  }

  get violationCount(): number {
    return this._violationCount;
  }

  get lyapunovExponent(): number {
    return this._lyapunovExponent;
  }

  get fractalDimension(): number {
    return this._fractalDimension;
  }

  private _computeLyapunov(sequence: number[]): number {
    if (sequence.length < 2) {
      return 0;
    }
    let sum = 0;
    for (let i = 1; i < sequence.length; i++) {
      const delta = Math.abs(sequence[i] - sequence[i - 1]);
      const prev = Math.abs(sequence[i - 1]);
      if (prev > 0 && delta > 0) {
        sum += Math.log(delta / prev);
      }
    }
    return sum / Math.max(1, sequence.length - 1);
  }

  private _boxCountDimension(values: number[]): number {
    if (values.length === 0) {
      return 1;
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    if (range === 0) {
      return 1;
    }
    let boxes = 0;
    const epsilon = range / 10;
    for (let b = min; b <= max; b += epsilon) {
      const occupied = values.some((v) => v >= b && v < b + epsilon);
      if (occupied) {
        boxes++;
      }
    }
    return boxes > 0 ? Math.log(boxes) / Math.log(1 / epsilon * range) : 1;
  }

  public checkValue(value: number, timestamp: number): BoundaryCheck {
    let boundary: 'lower' | 'upper' | 'none' = 'none';
    let violated = false;
    if (value <= this._data.lowerBound) {
      boundary = 'lower';
      violated = value < this._data.lowerBound;
    } else if (value >= this._data.upperBound) {
      boundary = 'upper';
      violated = value > this._data.upperBound;
    }
    if (violated) {
      this._violationCount++;
      if (this._data.hardLimit) {
        this._terminated = true;
      }
    }
    const check: BoundaryCheck = { value, boundary, violated, timestamp };
    this._checkLog.push(check);
    if (this._checkLog.length > 50) {
      this._checkLog.shift();
    }
    const recentValues = this._checkLog.slice(-20).map((c) => c.value);
    this._lyapunovExponent = this._computeLyapunov(recentValues);
    this._fractalDimension = this._boxCountDimension(recentValues);
    return check;
  }

  public setAsymptote(point: number): void {
    this._asymptotePoint = point;
  }

  public approachAsymptote(current: number, step: number): number {
    if (this._asymptotePoint === null) {
      return current + step;
    }
    const remaining = this._asymptotePoint - current;
    const dampedStep = step * Math.exp(-this._phaseAccum * 0.1);
    const next = current + Math.sign(remaining) * Math.min(Math.abs(dampedStep), Math.abs(remaining) * 0.5);
    this._phaseAccum += Math.abs(remaining);
    if (Math.abs(this._asymptotePoint - next) < 0.001) {
      this._terminated = true;
    }
    return next;
  }

  public tightenBounds(factor: number): void {
    const range = this._data.upperBound - this._data.lowerBound;
    const reduction = range * (1 - factor) / 2;
    this._data.lowerBound += reduction;
    this._data.upperBound -= reduction;
    this._criticalExponent *= factor;
  }

  public relaxBounds(factor: number): void {
    const range = this._data.upperBound - this._data.lowerBound;
    const expansion = range * (factor - 1) / 2;
    this._data.lowerBound -= expansion;
    this._data.upperBound += expansion;
    this._criticalExponent = Math.min(1, this._criticalExponent * factor);
  }

  public reset(): void {
    this._terminated = false;
    this._violationCount = 0;
    this._lyapunovExponent = 0;
    this._fractalDimension = 1;
    this._phaseAccum = 0;
  }

  public executeTermination(): string {
    if (!this._terminated) {
      return 'no_action';
    }
    return this._data.terminationAction;
  }

  public computeCriticalScaling(distanceFromBound: number): number {
    if (distanceFromBound <= 0) {
      return 0;
    }
    return Math.pow(distanceFromBound, -this._criticalExponent);
  }

  public boundaryReport(): Record<string, unknown> {
    return {
      conditionId: this.conditionId,
      lowerBound: this._data.lowerBound,
      upperBound: this._data.upperBound,
      hardLimit: this._data.hardLimit,
      terminated: this._terminated,
      violationCount: this._violationCount,
      checkCount: this._checkLog.length,
      asymptote: this._asymptotePoint,
      terminationAction: this._data.terminationAction,
      lyapunovExponent: this._lyapunovExponent.toFixed(4),
      fractalDimension: this._fractalDimension.toFixed(4),
      criticalExponent: this._criticalExponent.toFixed(4),
    };
  }
}
