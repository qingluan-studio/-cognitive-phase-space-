/**
 * DissolvingBoundary - 溶解边界
 * 故意模糊边界以促进信息与资源的流动，通过降低分隔强度
 * 使两侧逐渐融合，最终形成统一的连续区域。
 */

export interface DissolvingBoundaryData {
  readonly boundaryId: string;
  solidity: number;
  dissolveRate: number;
  sideA: string;
  sideB: string;
}

export interface DissolveProgress {
  step: number;
  solidityBefore: number;
  solidityAfter: number;
  merged: boolean;
}

export class DissolvingBoundary {
  private _data: DissolvingBoundaryData;
  private _progressLog: DissolveProgress[] = [];
  private _flowVolume: number = 0;
  private _merged: boolean = false;
  private _dissolveSteps: number = 0;

  constructor(data: DissolvingBoundaryData) {
    this._data = { ...data };
  }

  get boundaryId(): string {
    return this._data.boundaryId;
  }

  get solidity(): number {
    return this._data.solidity;
  }

  get merged(): boolean {
    return this._merged;
  }

  get sides(): readonly [string, string] {
    return [this._data.sideA, this._data.sideB];
  }

  public dissolve(): DissolveProgress {
    const before = this._data.solidity;
    this._data.solidity = Math.max(0, this._data.solidity - this._data.dissolveRate);
    this._dissolveSteps++;
    if (this._data.solidity < 0.05) {
      this._merged = true;
      this._data.solidity = 0;
    }
    const progress: DissolveProgress = {
      step: this._dissolveSteps,
      solidityBefore: before,
      solidityAfter: this._data.solidity,
      merged: this._merged,
    };
    this._progressLog.push(progress);
    if (this._progressLog.length > 30) {
      this._progressLog.shift();
    }
    return progress;
  }

  public allowFlow(volume: number): number {
    const permeability = 1 - this._data.solidity;
    const flowed = volume * permeability;
    this._flowVolume += flowed;
    return flowed;
  }

  public accelerateDissolution(factor: number): void {
    this._data.dissolveRate = Math.min(1, this._data.dissolveRate * factor);
  }

  public reconstitute(amount: number): void {
    if (this._merged) {
      return;
    }
    this._data.solidity = Math.min(1, this._data.solidity + amount);
  }

  public measurePermeability(): number {
    return 1 - this._data.solidity;
  }

  public isFullyDissolved(): boolean {
    return this._merged && this._data.solidity === 0;
  }

  public reverse(): void {
    this._data.solidity = 1;
    this._merged = false;
    this._flowVolume = 0;
    this._dissolveSteps = 0;
    this._progressLog = [];
  }

  public dissolveReport(): Record<string, unknown> {
    return {
      boundaryId: this.boundaryId,
      sideA: this._data.sideA,
      sideB: this._data.sideB,
      solidity: this._data.solidity.toFixed(3),
      dissolveRate: this._data.dissolveRate.toFixed(3),
      permeability: this.measurePermeability().toFixed(3),
      merged: this._merged,
      dissolveSteps: this._dissolveSteps,
      flowVolume: this._flowVolume.toFixed(2),
      progressEntries: this._progressLog.length,
    };
  }
}
