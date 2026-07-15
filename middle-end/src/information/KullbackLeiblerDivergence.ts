export interface DistributionPair {
  p: number[];
  q: number[];
  divergence: number;
}

export interface KLRecord {
  timestamp: number;
  forwardKL: number;
  reverseKL: number;
  jensenShannon: number;
}

export class KullbackLeiblerDivergence {
  private _pDistribution: number[];
  private _qDistribution: number[];
  private _forwardKL: number;
  private _reverseKL: number;
  private _jensenShannon: number;
  private _history: KLRecord[];
  private _alphaDivergence: number;
  private _hellingerDistance: number;
  private _totalVariation: number;

  constructor() {
    this._pDistribution = [0.5, 0.5];
    this._qDistribution = [0.5, 0.5];
    this._forwardKL = 0;
    this._reverseKL = 0;
    this._jensenShannon = 0;
    this._history = [];
    this._alphaDivergence = 0;
    this._hellingerDistance = 0;
    this._totalVariation = 0;
  }

  get forwardKL(): number {
    return this._forwardKL;
  }

  get reverseKL(): number {
    return this._reverseKL;
  }

  get jensenShannon(): number {
    return this._jensenShannon;
  }

  get totalVariation(): number {
    return this._totalVariation;
  }

  public setDistributions(p: number[], q: number[]): void {
    if (p.length !== q.length) return;
    const sumP = p.reduce((a, b) => a + b, 0);
    const sumQ = q.reduce((a, b) => a + b, 0);
    if (Math.abs(sumP - 1) > 0.01 || Math.abs(sumQ - 1) > 0.01) return;
    this._pDistribution = [...p];
    this._qDistribution = [...q];
    this._computeAll();
  }

  private _computeAll(): void {
    this._forwardKL = this._computeKL(this._pDistribution, this._qDistribution);
    this._reverseKL = this._computeKL(this._qDistribution, this._pDistribution);
    this._jensenShannon = this._computeJensenShannon();
    this._alphaDivergence = this._computeAlphaDivergence(0.5);
    this._hellingerDistance = this._computeHellingerDistance();
    this._totalVariation = this._computeTotalVariation();
  }

  private _computeKL(p: number[], q: number[]): number {
    let D = 0;
    for (let i = 0; i < p.length; i++) {
      if (p[i] > 0 && q[i] > 0) {
        D += p[i] * Math.log2(p[i] / q[i]);
      }
    }
    return D;
  }

  private _computeJensenShannon(): number {
    const m = this._pDistribution.map((pi, i) => 0.5 * (pi + this._qDistribution[i]));
    return 0.5 * this._computeKL(this._pDistribution, m) + 0.5 * this._computeKL(this._qDistribution, m);
  }

  private _computeAlphaDivergence(alpha: number): number {
    let D = 0;
    for (let i = 0; i < this._pDistribution.length; i++) {
      const pi = this._pDistribution[i];
      const qi = this._qDistribution[i];
      if (alpha === 1) {
        D += pi * Math.log(pi / qi);
      } else if (alpha === 0) {
        D += qi * Math.log(qi / pi);
      } else {
        D += (4 / (1 - alpha * alpha)) * (1 - Math.pow(pi, (1 - alpha) / 2) * Math.pow(qi, (1 + alpha) / 2));
      }
    }
    return D;
  }

  private _computeHellingerDistance(): number {
    let sum = 0;
    for (let i = 0; i < this._pDistribution.length; i++) {
      sum += Math.pow(Math.sqrt(this._pDistribution[i]) - Math.sqrt(this._qDistribution[i]), 2);
    }
    return Math.sqrt(sum) / Math.sqrt(2);
  }

  private _computeTotalVariation(): number {
    let sum = 0;
    for (let i = 0; i < this._pDistribution.length; i++) {
      sum += Math.abs(this._pDistribution[i] - this._qDistribution[i]);
    }
    return 0.5 * sum;
  }

  public computeBhattacharyyaDistance(): number {
    let sum = 0;
    for (let i = 0; i < this._pDistribution.length; i++) {
      sum += Math.sqrt(this._pDistribution[i] * this._qDistribution[i]);
    }
    return -Math.log(sum);
  }

  public computeChernoffInformation(): number {
    let max = 0;
    for (let s = 0; s <= 1; s += 0.01) {
      let sum = 0;
      for (let i = 0; i < this._pDistribution.length; i++) {
        sum += Math.pow(this._pDistribution[i], s) * Math.pow(this._qDistribution[i], 1 - s);
      }
      const info = -Math.log(sum);
      if (info > max) max = info;
    }
    return max;
  }

  public computeFisherInformation(metric: number[][]): number {
    let I = 0;
    for (let i = 0; i < this._pDistribution.length; i++) {
      for (let j = 0; j < this._pDistribution.length; j++) {
        I += metric[i][j] * (this._pDistribution[i] - this._qDistribution[i]) * (this._pDistribution[j] - this._qDistribution[j]);
      }
    }
    return I;
  }

  public computeRenyiDivergence(alpha: number): number {
    let sum = 0;
    for (let i = 0; i < this._pDistribution.length; i++) {
      sum += Math.pow(this._pDistribution[i], alpha) * Math.pow(this._qDistribution[i], 1 - alpha);
    }
    return Math.log(sum) / (alpha - 1);
  }

  public computeVariationalRepresentation(): number {
    return this._forwardKL + this._reverseKL;
  }

  public recordDivergence(): void {
    this._history.push({
      timestamp: Date.now(),
      forwardKL: this._forwardKL,
      reverseKL: this._reverseKL,
      jensenShannon: this._jensenShannon,
    });
    if (this._history.length > 200) this._history.shift();
  }

  public getHistory(): KLRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public getDistributions(): DistributionPair {
    return {
      p: [...this._pDistribution],
      q: [...this._qDistribution],
      divergence: this._forwardKL,
    };
  }

  public computeWassersteinDistance(costMatrix: number[][]): number {
    let dist = 0;
    for (let i = 0; i < this._pDistribution.length; i++) {
      for (let j = 0; j < this._qDistribution.length; j++) {
        dist += costMatrix[i][j] * Math.abs(this._pDistribution[i] - this._qDistribution[j]);
      }
    }
    return dist;
  }

  public computeKLDivergenceRate(markovChainP: number[][], markovChainQ: number[][]): number {
    let rate = 0;
    for (let i = 0; i < markovChainP.length; i++) {
      for (let j = 0; j < markovChainP[0].length; j++) {
        const p = markovChainP[i][j];
        const q = markovChainQ[i][j];
        if (p > 0 && q > 0) {
          rate += this._pDistribution[i] * p * Math.log2(p / q);
        }
      }
    }
    return rate;
  }

  public isPinskerInequalitySatisfied(): boolean {
    return this._totalVariation * this._totalVariation <= 0.5 * this._forwardKL;
  }

  public reset(): void {
    this._pDistribution = [0.5, 0.5];
    this._qDistribution = [0.5, 0.5];
    this._forwardKL = 0;
    this._reverseKL = 0;
    this._jensenShannon = 0;
    this._history = [];
    this._alphaDivergence = 0;
    this._hellingerDistance = 0;
    this._totalVariation = 0;
  }
}
