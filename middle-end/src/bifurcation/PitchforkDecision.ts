/**
 * PitchforkDecision - 叉形分岔
 * 对称地分裂为两种未来，系统从单一稳定状态对称地
 * 分裂为两个等价的新稳定状态，原状态变得不稳定。
 */

export interface PitchforkDecisionData {
  readonly decisionId: string;
  controlParameter: number;
  criticalPoint: number;
  symmetryAxis: number;
}

export interface BifurcationState {
  controlValue: number;
  stableStates: number[];
  unstable: boolean;
}

export class PitchforkDecision {
  private _data: PitchforkDecisionData;
  private _states: BifurcationState[] = [];
  private _currentStableStates: number[] = [];
  private _symmetryBroken: boolean = false;
  private _chosenBranch: number | null = null;

  constructor(data: PitchforkDecisionData) {
    this._data = { ...data };
    this._recomputeStates();
  }

  get decisionId(): string {
    return this._data.decisionId;
  }

  get controlParameter(): number {
    return this._data.controlParameter;
  }

  get stableStates(): readonly number[] {
    return this._currentStableStates;
  }

  get symmetryBroken(): boolean {
    return this._symmetryBroken;
  }

  private _recomputeStates(): void {
    const r = this._data.controlParameter;
    const rc = this._data.criticalPoint;
    if (r < rc) {
      this._currentStableStates = [this._data.symmetryAxis];
      this._symmetryBroken = false;
    } else {
      const offset = Math.sqrt(r - rc);
      this._currentStableStates = [
        this._data.symmetryAxis - offset,
        this._data.symmetryAxis + offset,
      ];
      this._symmetryBroken = true;
    }
  }

  public setControlParameter(value: number): BifurcationState {
    this._data.controlParameter = value;
    this._recomputeStates();
    const state: BifurcationState = {
      controlValue: value,
      stableStates: [...this._currentStableStates],
      unstable: this._symmetryBroken,
    };
    this._states.push(state);
    if (this._states.length > 50) {
      this._states.shift();
    }
    if (this._symmetryBroken && this._chosenBranch !== null) {
      this._chosenBranch = null;
    }
    return state;
  }

  public chooseBranch(branch: 'lower' | 'upper'): number {
    if (!this._symmetryBroken) {
      return this._data.symmetryAxis;
    }
    this._chosenBranch = branch === 'lower' ? this._currentStableStates[0] : this._currentStableStates[1];
    return this._chosenBranch;
  }

  public setCriticalPoint(point: number): void {
    this._data.criticalPoint = point;
    this._recomputeStates();
  }

  public restoreSymmetry(): void {
    this._data.controlParameter = this._data.criticalPoint - 0.1;
    this._recomputeStates();
    this._chosenBranch = null;
  }

  public breakSymmetry(amount: number): void {
    this._data.controlParameter = this._data.criticalPoint + amount;
    this._recomputeStates();
  }

  public isAtCriticalPoint(): boolean {
    return Math.abs(this._data.controlParameter - this._data.criticalPoint) < 0.01;
  }

  public computeBranchSeparation(): number {
    if (this._currentStableStates.length < 2) {
      return 0;
    }
    return Math.abs(this._currentStableStates[1] - this._currentStableStates[0]);
  }

  public decisionReport(): Record<string, unknown> {
    return {
      decisionId: this.decisionId,
      controlParameter: this._data.controlParameter.toFixed(3),
      criticalPoint: this._data.criticalPoint.toFixed(3),
      symmetryAxis: this._data.symmetryAxis,
      symmetryBroken: this._symmetryBroken,
      stableStates: this._currentStableStates.map((s) => s.toFixed(3)),
      chosenBranch: this._chosenBranch !== null ? this._chosenBranch.toFixed(3) : null,
      atCritical: this.isAtCriticalPoint(),
      branchSeparation: this.computeBranchSeparation().toFixed(3),
      historyLength: this._states.length,
    };
  }
}
