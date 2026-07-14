/**
 * ForkInReality - 现实分岔
 * 一个决策产生两个平行世界，系统在分岔点分裂为两条
 * 独立演化的现实路径，各自拥有不同的未来。
 */

export interface ForkInRealityData {
  readonly forkId: string;
  decisionPoint: number;
  branchA: string;
  branchB: string;
  divergenceRate: number;
}

export interface RealityBranch {
  branchId: string;
  state: number;
  history: number[];
  probability: number;
}

export class ForkInReality {
  private _data: ForkInRealityData;
  private _branchA: RealityBranch;
  private _branchB: RealityBranch;
  private _forkTriggered: boolean = false;
  private _stepCount: number = 0;

  constructor(data: ForkInRealityData) {
    this._data = { ...data };
    this._branchA = {
      branchId: data.branchA,
      state: data.decisionPoint,
      history: [data.decisionPoint],
      probability: 0.5,
    };
    this._branchB = {
      branchId: data.branchB,
      state: data.decisionPoint,
      history: [data.decisionPoint],
      probability: 0.5,
    };
  }

  get forkId(): string {
    return this._data.forkId;
  }

  get forkTriggered(): boolean {
    return this._forkTriggered;
  }

  get branches(): readonly [RealityBranch, RealityBranch] {
    return [this._branchA, this._branchB];
  }

  public triggerFork(bias: number): void {
    if (this._forkTriggered) {
      return;
    }
    this._forkTriggered = true;
    this._branchA.probability = Math.max(0, Math.min(1, 0.5 + bias));
    this._branchB.probability = 1 - this._branchA.probability;
    this._branchA.state += this._data.divergenceRate;
    this._branchB.state -= this._data.divergenceRate;
    this._branchA.history.push(this._branchA.state);
    this._branchB.history.push(this._branchB.state);
  }

  public evolveBranch(branchId: string, delta: number): void {
    const branch = branchId === this._data.branchA ? this._branchA : this._branchB;
    branch.state += delta;
    branch.history.push(branch.state);
    if (branch.history.length > 100) {
      branch.history.shift();
    }
    this._stepCount++;
  }

  public setDivergenceRate(rate: number): void {
    this._data.divergenceRate = rate;
  }

  public adjustProbability(branchId: string, delta: number): void {
    const branch = branchId === this._data.branchA ? this._branchA : this._branchB;
    const other = branchId === this._data.branchA ? this._branchB : this._branchA;
    branch.probability = Math.max(0, Math.min(1, branch.probability + delta));
    other.probability = 1 - branch.probability;
  }

  public computeDivergence(): number {
    return Math.abs(this._branchA.state - this._branchB.state);
  }

  public remerge(): boolean {
    const divergence = this.computeDivergence();
    if (divergence > this._data.divergenceRate * 10) {
      return false;
    }
    const avg = (this._branchA.state + this._branchB.state) / 2;
    this._branchA.state = avg;
    this._branchB.state = avg;
    return true;
  }

  public selectBranch(): string {
    const roll = Math.random();
    return roll < this._branchA.probability ? this._branchA.branchId : this._branchB.branchId;
  }

  public forkReport(): Record<string, unknown> {
    return {
      forkId: this.forkId,
      decisionPoint: this._data.decisionPoint,
      divergenceRate: this._data.divergenceRate,
      forkTriggered: this._forkTriggered,
      stepCount: this._stepCount,
      branchA: {
        id: this._branchA.branchId,
        state: this._branchA.state.toFixed(3),
        probability: this._branchA.probability.toFixed(3),
        historyLength: this._branchA.history.length,
      },
      branchB: {
        id: this._branchB.branchId,
        state: this._branchB.state.toFixed(3),
        probability: this._branchB.probability.toFixed(3),
        historyLength: this._branchB.history.length,
      },
      currentDivergence: this.computeDivergence().toFixed(3),
    };
  }
}
