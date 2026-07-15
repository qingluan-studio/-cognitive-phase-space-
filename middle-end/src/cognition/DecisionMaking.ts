export interface Option {
  id: string;
  values: number[];
  probabilities: number[];
}

export interface DecisionRecord {
  time: number;
  chosenOption: string;
  expectedUtility: number;
  regret: number;
}

export class DecisionMaking {
  private _options: Map<string, Option>;
  private _utilityFunction: (value: number) => number;
  private _riskAversion: number;
  private _history: DecisionRecord[];
  private _time: number;
  private _banditCounts: Map<string, number>;
  private _banditRewards: Map<string, number>;

  constructor(riskAversion: number = 1.0) {
    this._options = new Map();
    this._utilityFunction = (v) => v;
    this._riskAversion = riskAversion;
    this._history = [];
    this._time = 0;
    this._banditCounts = new Map();
    this._banditRewards = new Map();
  }

  get optionCount(): number { return this._options.size; }
  get riskAversion(): number { return this._riskAversion; }
  get time(): number { return this._time; }
  get history(): DecisionRecord[] { return this._history; }

  public setUtilityFunction(fn: (value: number) => number): void {
    this._utilityFunction = fn;
  }

  public setRiskAversion(ra: number): void {
    this._riskAversion = ra;
  }

  public addOption(id: string, values: number[], probabilities: number[]): void {
    const totalProb = probabilities.reduce((a, b) => a + b, 0);
    const normalized = probabilities.map(p => p / totalProb);
    this._options.set(id, { id, values, probabilities: normalized });
    this._banditCounts.set(id, 0);
    this._banditRewards.set(id, 0);
  }

  public computeExpectedUtility(optionId: string): number {
    const option = this._options.get(optionId);
    if (!option) return 0;
    let eu = 0;
    for (let i = 0; i < option.values.length; i++) {
      eu += option.probabilities[i] * this._utilityFunction(option.values[i]);
    }
    return eu;
  }

  public computeExpectedValue(optionId: string): number {
    const option = this._options.get(optionId);
    if (!option) return 0;
    return option.values.reduce((sum, v, i) => sum + v * option.probabilities[i], 0);
  }

  public computeVariance(optionId: string): number {
    const option = this._options.get(optionId);
    if (!option) return 0;
    const ev = this.computeExpectedValue(optionId);
    return option.values.reduce((sum, v, i) => sum + option.probabilities[i] * (v - ev) ** 2, 0);
  }

  public computeCertaintyEquivalent(optionId: string): number {
    const eu = this.computeExpectedUtility(optionId);
    let low = -1000;
    let high = 1000;
    for (let iter = 0; iter < 50; iter++) {
      const mid = (low + high) / 2;
      if (this._utilityFunction(mid) < eu) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  }

  public chooseMaxExpectedUtility(): string | null {
    let bestId: string | null = null;
    let maxEU = -Infinity;
    for (const [id] of this._options) {
      const eu = this.computeExpectedUtility(id);
      if (eu > maxEU) {
        maxEU = eu;
        bestId = id;
      }
    }
    if (bestId) {
      this._recordDecision(bestId, maxEU);
    }
    return bestId;
  }

  public chooseProspectTheory(): string | null {
    let bestId: string | null = null;
    let maxV = -Infinity;
    for (const [id, option] of this._options) {
      let v = 0;
      const reference = 0;
      for (let i = 0; i < option.values.length; i++) {
        const gain = option.values[i] - reference;
        const weightedProb = this._probabilityWeight(option.probabilities[i], gain >= 0);
        v += weightedProb * this._valueFunction(gain);
      }
      if (v > maxV) {
        maxV = v;
        bestId = id;
      }
    }
    if (bestId) {
      this._recordDecision(bestId, maxV);
    }
    return bestId;
  }

  private _probabilityWeight(p: number, isGain: boolean): number {
    const gamma = 0.61;
    return Math.pow(p, gamma) / Math.pow(Math.pow(p, gamma) + Math.pow(1 - p, gamma), 1 / gamma);
  }

  private _valueFunction(gain: number): number {
    const alpha = 0.88;
    const lambda = 2.25;
    if (gain >= 0) {
      return Math.pow(gain, alpha);
    } else {
      return -lambda * Math.pow(-gain, alpha);
    }
  }

  public ucbChoose(explorationConstant: number = 2.0): string | null {
    let bestId: string | null = null;
    let maxUCB = -Infinity;
    const totalPulls = Array.from(this._banditCounts.values()).reduce((a, b) => a + b, 0);
    for (const [id] of this._options) {
      const count = this._banditCounts.get(id) || 0;
      const reward = this._banditRewards.get(id) || 0;
      const avgReward = count > 0 ? reward / count : 0;
      const exploration = count > 0 ? Math.sqrt(Math.log(totalPulls + 1) / count) : Infinity;
      const ucb = avgReward + explorationConstant * exploration;
      if (ucb > maxUCB) {
        maxUCB = ucb;
        bestId = id;
      }
    }
    return bestId;
  }

  public ucbUpdate(optionId: string, reward: number): void {
    this._banditCounts.set(optionId, (this._banditCounts.get(optionId) || 0) + 1);
    this._banditRewards.set(optionId, (this._banditRewards.get(optionId) || 0) + reward);
  }

  public thompsonSampling(): string | null {
    let bestId: string | null = null;
    let maxSample = -Infinity;
    for (const [id] of this._options) {
      const successes = (this._banditRewards.get(id) || 0) + 1;
      const failures = (this._banditCounts.get(id) || 0) - successes + 2;
      const sample = this._betaSample(successes, Math.max(failures, 1));
      if (sample > maxSample) {
        maxSample = sample;
        bestId = id;
      }
    }
    return bestId;
  }

  private _betaSample(alpha: number, beta: number): number {
    let sum = 0;
    for (let i = 0; i < alpha; i++) sum -= Math.log(Math.random());
    let sum2 = 0;
    for (let i = 0; i < beta; i++) sum2 -= Math.log(Math.random());
    return sum / (sum + sum2);
  }

  public computeRegret(chosenId: string): number {
    const chosenEU = this.computeExpectedUtility(chosenId);
    let maxEU = -Infinity;
    for (const [id] of this._options) {
      const eu = this.computeExpectedUtility(id);
      if (eu > maxEU) maxEU = eu;
    }
    return maxEU - chosenEU;
  }

  public simulateBandit(trials: number, trueRewards: Map<string, number>): { id: string; cumulativeRegret: number }[] {
    const results: { id: string; cumulativeRegret: number }[] = [];
    let cumulativeRegret = 0;
    for (let t = 0; t < trials; t++) {
      const chosen = this.ucbChoose();
      if (!chosen) break;
      const reward = Math.random() < (trueRewards.get(chosen) || 0.5) ? 1 : 0;
      this.ucbUpdate(chosen, reward);
      const regret = this.computeRegret(chosen);
      cumulativeRegret += regret;
      results.push({ id: chosen, cumulativeRegret });
    }
    return results;
  }

  private _recordDecision(chosenId: string, eu: number): void {
    this._time++;
    this._history.push({
      time: this._time,
      chosenOption: chosenId,
      expectedUtility: eu,
      regret: this.computeRegret(chosenId)
    });
  }

  public getOptionDistribution(): Map<string, number> {
    const dist = new Map<string, number>();
    for (const [id, option] of this._options) {
      dist.set(id, this.computeExpectedUtility(id));
    }
    return dist;
  }

  public reset(): void {
    this._options.clear();
    this._history = [];
    this._time = 0;
    this._banditCounts.clear();
    this._banditRewards.clear();
  }

  public exportOptions(): Option[] {
    return Array.from(this._options.values()).map(o => ({ ...o, values: [...o.values], probabilities: [...o.probabilities] }));
  }
}
