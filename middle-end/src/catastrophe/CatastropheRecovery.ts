/**
 * CatastropheRecovery - 突变恢复
 * 从突变后的新状态恢复，系统在经历剧变后寻找新的平衡，
 * 可能恢复到原态、稳定在新态或进入完全不同的状态。
 */

export interface CatastropheRecoveryData {
  readonly recoveryId: string;
  preCatastropheState: number;
  postCatastropheState: number;
  targetState: number;
  recoveryRate: number;
}

export interface RecoveryStep {
  currentState: number;
  distanceToTarget: number;
  progress: number;
  recovered: boolean;
}

export class CatastropheRecovery {
  private _data: CatastropheRecoveryData;
  private _current: number;
  private _steps: RecoveryStep[] = [];
  private _recovered: boolean = false;
  private _recoveryAttempts: number = 0;
  private _overshootCount: number = 0;

  constructor(data: CatastropheRecoveryData) {
    this._data = { ...data };
    this._current = data.postCatastropheState;
  }

  get recoveryId(): string {
    return this._data.recoveryId;
  }

  get current(): number {
    return this._current;
  }

  get recovered(): boolean {
    return this._recovered;
  }

  get progress(): number {
    const totalDist = Math.abs(this._data.postCatastropheState - this._data.targetState);
    if (totalDist === 0) {
      return 1;
    }
    const remaining = Math.abs(this._current - this._data.targetState);
    return Math.max(0, Math.min(1, 1 - remaining / totalDist));
  }

  public step(): RecoveryStep {
    if (this._recovered) {
      return this._steps[this._steps.length - 1];
    }
    this._recoveryAttempts++;
    const distance = this._data.targetState - this._current;
    const move = distance * this._data.recoveryRate;
    const previous = this._current;
    this._current += move;
    if ((previous < this._data.targetState && this._current > this._data.targetState) ||
        (previous > this._data.targetState && this._current < this._data.targetState)) this._overshootCount++;
    const newDistance = Math.abs(this._data.targetState - this._current);
    const recovered = newDistance < 0.01;
    if (recovered) {
      this._recovered = true;
      this._current = this._data.targetState;
    }
    const step: RecoveryStep = { currentState: this._current, distanceToTarget: newDistance, progress: this.progress, recovered };
    this._steps.push(step);
    if (this._steps.length > 80) {
      this._steps.shift();
    }
    return step;
  }

  public runRecovery(maxSteps: number): boolean {
    for (let i = 0; i < maxSteps; i++) {
      this.step();
      if (this._recovered) return true;
    }
    return false;
  }

  public setRecoveryRate(rate: number): void {
    this._data.recoveryRate = Math.max(0, Math.min(1, rate));
  }

  public setTarget(target: number): void {
    this._data.targetState = target;
    this._recovered = false;
  }

  public resetToPostCatastrophe(): void {
    this._current = this._data.postCatastropheState;
    this._recovered = false;
    this._steps = [];
    this._overshootCount = 0;
  }

  public acceptNewState(): void {
    this._data.targetState = this._current;
    this._recovered = true;
  }

  public measureRecoverySpeed(): number {
    if (this._steps.length < 2) {
      return 0;
    }
    const initial = Math.abs(this._data.postCatastropheState - this._data.targetState);
    const current = Math.abs(this._current - this._data.targetState);
    if (initial === 0) {
      return 0;
    }
    return (initial - current) / this._recoveryAttempts;
  }

  public isStagnating(): boolean {
    if (this._steps.length < 5) {
      return false;
    }
    const recent = this._steps.slice(-5);
    const progressChanges = recent.map((s) => s.progress);
    const variance = progressChanges.reduce((s, p) => s + (p - progressChanges[0]) ** 2, 0) / 5;
    return variance < 0.0001;
  }

  public recoveryReport(): Record<string, unknown> {
    return {
      recoveryId: this.recoveryId,
      preCatastropheState: this._data.preCatastropheState.toFixed(3),
      postCatastropheState: this._data.postCatastropheState.toFixed(3),
      targetState: this._data.targetState.toFixed(3),
      current: this._current.toFixed(3),
      progress: this.progress.toFixed(3),
      recovered: this._recovered,
      recoveryAttempts: this._recoveryAttempts,
      overshootCount: this._overshootCount,
      recoverySpeed: this.measureRecoverySpeed().toFixed(4),
      stagnating: this.isStagnating(),
      stepCount: this._steps.length,
    };
  }
}
