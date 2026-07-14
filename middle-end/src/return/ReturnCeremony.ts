/**
 * 回归仪式模块：为回归模块举行的重新加入典礼。
 * 仪式包含宣读、献祭、加冕、签署协议等环节，全部完成才算正式回归。
 */

export interface ReturnCeremonyData {
  candidate: string;
  stage: number;
  completedRites: string[];
  pendingRites: string[];
}

export class ReturnCeremony {
  private _candidate: string;
  private _stages: string[];
  private _currentStage: number;
  private _completed: string[];

  constructor(candidate: string, stages: string[] = ['proclamation', 'offering', 'anointing', 'signing']) {
    this._candidate = candidate;
    this._stages = stages;
    this._currentStage = 0;
    this._completed = [];
  }

  get candidate(): string {
    return this._candidate;
  }

  get stage(): number {
    return this._currentStage;
  }

  get completedRites(): string[] {
    return [...this._completed];
  }

  get pendingRites(): string[] {
    return this._stages.slice(this._currentStage);
  }

  public advance(): boolean {
    if (this._currentStage >= this._stages.length) return false;
    this._completed.push(this._stages[this._currentStage]);
    this._currentStage += 1;
    return true;
  }

  public skip(rite: string, authority: string): boolean {
    if (authority !== 'council') return false;
    const idx = this._stages.indexOf(rite);
    if (idx === -1) return false;
    this._stages.splice(idx, 1);
    return true;
  }

  public isComplete(): boolean {
    return this._currentStage >= this._stages.length;
  }

  public reset(): void {
    this._currentStage = 0;
    this._completed = [];
  }

  public report(): ReturnCeremonyData {
    return {
      candidate: this._candidate,
      stage: this._currentStage,
      completedRites: this.completedRites,
      pendingRites: this.pendingRites,
    };
  }
}
