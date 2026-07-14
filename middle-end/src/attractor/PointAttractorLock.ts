/**
 * PointAttractorLock - 点吸引子锁定
 * 系统状态最终落入单一固定点，所有轨迹无论起点如何
 * 都会收敛到同一个稳定不动点。
 */

export interface PointAttractorLockData {
  readonly lockId: string;
  attractorPoint: number;
  pullStrength: number;
  dampingFactor: number;
}

export interface ConvergenceStep {
  position: number;
  distance: number;
  step: number;
  locked: boolean;
}

export class PointAttractorLock {
  private _data: PointAttractorLockData;
  private _currentPosition: number;
  private _steps: ConvergenceStep[] = [];
  private _locked: boolean = false;
  private _lockThreshold: number = 0.01;

  constructor(data: PointAttractorLockData, startPosition: number) {
    this._data = { ...data };
    this._currentPosition = startPosition;
  }

  get lockId(): string {
    return this._data.lockId;
  }

  get attractorPoint(): number {
    return this._data.attractorPoint;
  }

  get currentPosition(): number {
    return this._currentPosition;
  }

  get locked(): boolean {
    return this._locked;
  }

  public step(): ConvergenceStep {
    const distance = this._data.attractorPoint - this._currentPosition;
    const force = distance * this._data.pullStrength;
    const dampedForce = force * this._data.dampingFactor;
    this._currentPosition += dampedForce;
    const newDistance = Math.abs(this._data.attractorPoint - this._currentPosition);
    if (newDistance < this._lockThreshold) {
      this._locked = true;
      this._currentPosition = this._data.attractorPoint;
    }
    const step: ConvergenceStep = {
      position: this._currentPosition,
      distance: newDistance,
      step: this._steps.length,
      locked: this._locked,
    };
    this._steps.push(step);
    if (this._steps.length > 100) {
      this._steps.shift();
    }
    return step;
  }

  public converge(maxSteps: number): boolean {
    for (let i = 0; i < maxSteps; i++) {
      this.step();
      if (this._locked) {
        return true;
      }
    }
    return false;
  }

  public setPullStrength(strength: number): void {
    this._data.pullStrength = Math.max(0, Math.min(1, strength));
  }

  public setDamping(damping: number): void {
    this._data.dampingFactor = Math.max(0, Math.min(1, damping));
  }

  public moveAttractor(newPoint: number): void {
    this._data.attractorPoint = newPoint;
    this._locked = false;
  }

  public applyNoise(amount: number): void {
    if (this._locked) {
      this._currentPosition += amount * (Math.random() - 0.5);
      this._locked = Math.abs(this._data.attractorPoint - this._currentPosition) < this._lockThreshold;
    }
  }

  public setLockThreshold(threshold: number): void {
    this._lockThreshold = Math.max(0.0001, threshold);
  }

  public escape(velocity: number): boolean {
    if (!this._locked) {
      return false;
    }
    if (velocity > this._data.pullStrength * 10) {
      this._locked = false;
      this._currentPosition += velocity;
      return true;
    }
    return false;
  }

  public lockReport(): Record<string, unknown> {
    return {
      lockId: this.lockId,
      attractorPoint: this._data.attractorPoint.toFixed(4),
      currentPosition: this._currentPosition.toFixed(4),
      pullStrength: this._data.pullStrength.toFixed(3),
      dampingFactor: this._data.dampingFactor.toFixed(3),
      lockThreshold: this._lockThreshold,
      locked: this._locked,
      stepCount: this._steps.length,
      distanceToAttractor: Math.abs(this._data.attractorPoint - this._currentPosition).toFixed(6),
    };
  }
}
