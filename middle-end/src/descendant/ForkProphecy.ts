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
  private _performanceHistory: Map<string, number[]> = new Map();
  private _bayesianPrior: Map<string, number> = new Map();
  private _monteCarloSamples = 1000;

  registerBranch(branch: ForkBranch): void {
    this._branches.set(branch.id, branch);
    if (!this._performanceHistory.has(branch.id)) {
      this._performanceHistory.set(branch.id, []);
    }
    this._performanceHistory.get(branch.id)!.push(branch.performance);
    if (this._performanceHistory.get(branch.id)!.length > 50) {
      this._performanceHistory.get(branch.id)!.shift();
    }
    if (!this._bayesianPrior.has(branch.id)) {
      this._bayesianPrior.set(branch.id, 1 / this._branches.size);
    }
  }

  private _score(branch: ForkBranch): number {
    const perfWeight = 1 - this._weightMutation;
    return branch.performance * perfWeight + branch.mutationRate * this._weightMutation;
  }

  prophesy(branchId: string): ProphecyResult | null {
    const branch = this._branches.get(branchId);
    if (!branch) {
      return null;
    }
    const allScores = Array.from(this._branches.values()).map((b) => this._score(b));
    const total = allScores.reduce((s, v) => s + v, 0);
    const score = this._score(branch);
    const winProbability = total > 0 ? score / total : 0;
    const history = this._performanceHistory.get(branchId) ?? [];
    const trend = this._computeTrend(history);
    const adjustedProb = this._applyBayesianUpdate(branchId, winProbability);
    const confidence = Math.min(1, branch.generation / this._horizon) * (1 - Math.abs(trend) * 0.1);
    const result: ProphecyResult = {
      branchId,
      winProbability: adjustedProb,
      confidence,
      forecastAt: Date.now(),
    };
    this._prophecies.push(result);
    if (this._prophecies.length > 200) {
      this._prophecies.shift();
    }
    return result;
  }

  prophesyAll(): ProphecyResult[] {
    return Array.from(this._branches.keys())
      .map((id) => this.prophesy(id))
      .filter((r): r is ProphecyResult => r !== null);
  }

  pickWinner(): ForkBranch | null {
    const results = this.prophesyAll();
    if (results.length === 0) {
      return null;
    }
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

  monteCarloSimulate(branchId: string): number {
    const branch = this._branches.get(branchId);
    if (!branch) {
      return 0;
    }
    let wins = 0;
    for (let i = 0; i < this._monteCarloSamples; i++) {
      const noise = (Math.random() - 0.5) * branch.mutationRate;
      const simScore = branch.performance + noise;
      let best = simScore;
      for (const other of this._branches.values()) {
        if (other.id !== branchId) {
          const otherNoise = (Math.random() - 0.5) * other.mutationRate;
          const otherScore = other.performance + otherNoise;
          if (otherScore > best) {
            best = otherScore;
          }
        }
      }
      if (best === simScore) {
        wins += 1;
      }
    }
    return wins / this._monteCarloSamples;
  }

  computeExpectedValue(branchId: string): number {
    const branch = this._branches.get(branchId);
    if (!branch) {
      return 0;
    }
    const history = this._performanceHistory.get(branchId) ?? [branch.performance];
    const mean = history.reduce((s, v) => s + v, 0) / history.length;
    const variance = history.reduce((s, v) => s + (v - mean) ** 2, 0) / history.length;
    return mean - variance * this._weightMutation;
  }

  private _computeTrend(history: number[]): number {
    if (history.length < 2) {
      return 0;
    }
    const n = history.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += history[i];
      sumXY += i * history[i];
      sumXX += i * i;
    }
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private _applyBayesianUpdate(branchId: string, likelihood: number): number {
    const prior = this._bayesianPrior.get(branchId) ?? 1 / this._branches.size;
    const posterior = prior * likelihood;
    let total = 0;
    for (const [id, p] of this._bayesianPrior) {
      const l = id === branchId ? likelihood : this._computeLikelihood(id);
      total += p * l;
    }
    const updated = total > 0 ? posterior / total : prior;
    this._bayesianPrior.set(branchId, updated);
    return updated;
  }

  private _computeLikelihood(branchId: string): number {
    const branch = this._branches.get(branchId);
    if (!branch) {
      return 0;
    }
    const allScores = Array.from(this._branches.values()).map((b) => this._score(b));
    const total = allScores.reduce((s, v) => s + v, 0);
    return total > 0 ? this._score(branch) / total : 0;
  }
}
