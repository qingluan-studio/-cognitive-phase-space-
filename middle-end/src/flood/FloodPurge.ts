export interface FloodPurgeData {
  totalWashed: number;
  survivors: number;
  sediment: string[];
}

export class FloodPurge {
  private _totalWashed: number;
  private _survivors: unknown[];
  private _sediment: string[];
  private _waveStrength: number;
  private _durabilityDistribution: number[];
  private _entropyLog: number[];

  constructor(waveStrength: number = 50) {
    this._totalWashed = 0;
    this._survivors = [];
    this._sediment = [];
    this._waveStrength = waveStrength;
    this._durabilityDistribution = [];
    this._entropyLog = [];
  }

  get waveStrength(): number {
    return this._waveStrength;
  }

  get survivorCount(): number {
    return this._survivors.length;
  }

  public unleash(data: Array<{ item: unknown; durability: number }>): void {
    this._survivors = [];
    this._sediment = [];
    this._durabilityDistribution = [];
    for (const entry of data) {
      this._durabilityDistribution.push(entry.durability);
      if (entry.durability >= this._waveStrength) {
        this._survivors.push(entry.item);
      } else {
        this._totalWashed += 1;
        this._sediment.push(`washed:${typeof entry.item}`);
      }
    }
    this._entropyLog.push(this._computeEntropy());
    if (this._entropyLog.length > 50) this._entropyLog.shift();
  }

  public intensify(amount: number): void {
    this._waveStrength += amount;
  }

  public calm(amount: number): void {
    this._waveStrength = Math.max(0, this._waveStrength - amount);
  }

  public retreat(): void {
    this._waveStrength = Math.floor(this._waveStrength * 0.5);
  }

  public collectSurvivors(): unknown[] {
    return [...this._survivors];
  }

  public report(): FloodPurgeData {
    return {
      totalWashed: this._totalWashed,
      survivors: this._survivors.length,
      sediment: [...this._sediment],
    };
  }

  public computeSurvivalProbability(durability: number): number {
    return 1 / (1 + Math.exp(-(durability - this._waveStrength) / 10));
  }

  public computeDurabilityEntropy(): number {
    if (this._durabilityDistribution.length === 0) return 0;
    const mean = this._durabilityDistribution.reduce((a, b) => a + b, 0) / this._durabilityDistribution.length;
    const variance = this._durabilityDistribution.reduce((s, v) => s + (v - mean) ** 2, 0) / this._durabilityDistribution.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public fitPowerLaw(): { exponent: number; r2: number } {
    const sorted = [...this._durabilityDistribution].sort((a, b) => b - a);
    if (sorted.length < 2) return { exponent: 0, r2: 0 };
    const logX: number[] = [];
    const logY: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
      logX.push(Math.log(i + 1));
      logY.push(Math.log(sorted[i] + 1));
    }
    const n = logX.length;
    const meanX = logX.reduce((a, b) => a + b, 0) / n;
    const meanY = logY.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (logX[i] - meanX) * (logY[i] - meanY);
      den += (logX[i] - meanX) ** 2;
    }
    const slope = den > 0 ? num / den : 0;
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const pred = meanY + slope * (logX[i] - meanX);
      ssRes += (logY[i] - pred) ** 2;
      ssTot += (logY[i] - meanY) ** 2;
    }
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    return { exponent: -slope, r2 };
  }
}
