/**
 * CrisisEvent - 危机事件
 * 吸引子突然消失或发生剧变，系统状态被抛出原有的
 * 吸引域，进入完全不同的状态空间区域。
 */

export interface CrisisEventData {
  readonly crisisId: string;
  attractorSize: number;
  stabilityMargin: number;
  crisisThreshold: number;
}

export interface CrisisOccurrence {
  type: 'boundary' | 'attractor' | 'interior';
  severity: number;
  stateBefore: number;
  stateAfter: number;
  timestamp: number;
}

export class CrisisEvent {
  private _data: CrisisEventData;
  private _occurrences: CrisisOccurrence[] = [];
  private _inCrisis: boolean = false;
  private _currentState: number = 0;
  private _recoveryProgress: number = 0;

  constructor(data: CrisisEventData) {
    this._data = { ...data };
  }

  get crisisId(): string {
    return this._data.crisisId;
  }

  get inCrisis(): boolean {
    return this._inCrisis;
  }

  get currentState(): number {
    return this._currentState;
  }

  public applyPerturbation(magnitude: number, timestamp: number): CrisisOccurrence | null {
    this._currentState += magnitude;
    const exceeded = Math.abs(this._currentState) > this._data.crisisThreshold;
    if (!exceeded) {
      return null;
    }
    const margin = Math.abs(this._currentState) - this._data.crisisThreshold;
    const severity = Math.min(1, margin / this._data.crisisThreshold);
    let type: 'boundary' | 'attractor' | 'interior';
    if (severity > 0.8) {
      type = 'attractor';
    } else if (severity > 0.4) {
      type = 'boundary';
    } else {
      type = 'interior';
    }
    this._inCrisis = true;
    this._recoveryProgress = 0;
    const stateBefore = this._currentState - magnitude;
    const stateAfter = this._currentState;
    const occurrence: CrisisOccurrence = {
      type,
      severity,
      stateBefore,
      stateAfter,
      timestamp,
    };
    this._occurrences.push(occurrence);
    if (this._occurrences.length > 20) {
      this._occurrences.shift();
    }
    return occurrence;
  }

  public recover(amount: number): number {
    if (!this._inCrisis) {
      return 0;
    }
    this._recoveryProgress += amount;
    this._currentState *= (1 - amount * 0.5);
    if (this._recoveryProgress >= 1 || Math.abs(this._currentState) < this._data.stabilityMargin) {
      this._inCrisis = false;
      this._recoveryProgress = 0;
    }
    return this._recoveryProgress;
  }

  public setThreshold(threshold: number): void {
    this._data.crisisThreshold = Math.max(0.001, threshold);
  }

  public resizeAttractor(delta: number): void {
    this._data.attractorSize = Math.max(0.01, this._data.attractorSize + delta);
  }

  public setState(state: number): void {
    this._currentState = state;
    this._inCrisis = Math.abs(state) > this._data.crisisThreshold;
  }

  public measureVulnerability(): number {
    const margin = this._data.crisisThreshold - Math.abs(this._currentState);
    return Math.max(0, Math.min(1, 1 - margin / this._data.crisisThreshold));
  }

  public computeStabilityIndex(): number {
    if (this._inCrisis) {
      return 0;
    }
    const margin = this._data.crisisThreshold - Math.abs(this._currentState);
    return margin / this._data.crisisThreshold;
  }

  public lastCrisis(): CrisisOccurrence | null {
    return this._occurrences.length > 0 ? this._occurrences[this._occurrences.length - 1] : null;
  }

  public crisisReport(): Record<string, unknown> {
    return {
      crisisId: this.crisisId,
      attractorSize: this._data.attractorSize.toFixed(3),
      stabilityMargin: this._data.stabilityMargin.toFixed(3),
      crisisThreshold: this._data.crisisThreshold.toFixed(3),
      currentState: this._currentState.toFixed(3),
      inCrisis: this._inCrisis,
      recoveryProgress: this._recoveryProgress.toFixed(3),
      vulnerability: this.measureVulnerability().toFixed(3),
      stabilityIndex: this.computeStabilityIndex().toFixed(3),
      occurrenceCount: this._occurrences.length,
    };
  }
}
