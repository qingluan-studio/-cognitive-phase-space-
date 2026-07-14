/**
 * BoundaryCondition - 边界条件
 * 定义系统终止的极限条件，包括上下界、奇点与渐近行为，
 * 当状态触及边界时触发终止或重置逻辑。
 */

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
    const next = current + Math.sign(remaining) * Math.min(Math.abs(step), Math.abs(remaining) * 0.5);
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
  }

  public relaxBounds(factor: number): void {
    const range = this._data.upperBound - this._data.lowerBound;
    const expansion = range * (factor - 1) / 2;
    this._data.lowerBound -= expansion;
    this._data.upperBound += expansion;
  }

  public reset(): void {
    this._terminated = false;
    this._violationCount = 0;
  }

  public executeTermination(): string {
    if (!this._terminated) {
      return 'no_action';
    }
    return this._data.terminationAction;
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
    };
  }
}
