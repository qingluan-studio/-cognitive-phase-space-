/**
 * 分叉预言：预测哪个分支会最终胜出。
 * 对多个并行的演化分支进行预测，结合历史表现与变异速度给出胜出概率。
 */

export interface ForkBranch {
  id: string;
  name: string;
  performance: number;
  mutationRate: number;
  generation: number;
}

export interface ProphecyResult {
  branchId: string;
  winProbability: number;
  confidence: number;
  forecastAt: number;
}

export class ForkProphecy {
  private _branches: Map<string, ForkBranch> = new Map();
  private _prophecies: ProphecyResult[] = [];
  private _horizon = 10;
  private _weightMutation = 0.4;

  registerBranch(branch: ForkBranch): void {
    this._branches.set(branch.id, branch);
  }

  private _score(branch: ForkBranch): number {
    const perfWeight = 1 - this._weightMutation;
    return branch.performance * perfWeight + branch.mutationRate * this._weightMutation;
  }

  prophesy(branchId: string): ProphecyResult | null {
    const branch = this._branches.get(branchId);
    if (!branch) return null;
    const allScores = Array.from(this._branches.values()).map(b => this._score(b));
    const total = allScores.reduce((s, v) => s + v, 0);
    const score = this._score(branch);
    const winProbability = total > 0 ? score / total : 0;
    const confidence = Math.min(1, branch.generation / this._horizon);
    const result: ProphecyResult = {
      branchId,
      winProbability,
      confidence,
      forecastAt: Date.now(),
    };
    this._prophecies.push(result);
    if (this._prophecies.length > 200) this._prophecies.shift();
    return result;
  }

  prophesyAll(): ProphecyResult[] {
    return Array.from(this._branches.keys())
      .map(id => this.prophesy(id))
      .filter((r): r is ProphecyResult => r !== null);
  }

  pickWinner(): ForkBranch | null {
    const results = this.prophesyAll();
    if (results.length === 0) return null;
    const top = results.sort((a, b) => b.winProbability - a.winProbability)[0];
    return this._branches.get(top.branchId) ?? null;
  }

  setHorizon(generations: number): void {
    this._horizon = Math.max(1, generations);
  }

  setMutationWeight(value: number): void {
    this._weightMutation = Math.max(0, Math.min(1, value));
  }

  getBranch(id: string): ForkBranch | null {
    return this._branches.get(id) ?? null;
  }

  getProphecies(limit: number = 50): ProphecyResult[] {
    return this._prophecies.slice(-limit);
  }

  get branchCount(): number {
    return this._branches.size;
  }
}
