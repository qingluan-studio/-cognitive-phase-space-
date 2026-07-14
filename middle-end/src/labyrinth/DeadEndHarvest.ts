export interface DeadEndData {
  id: string;
  timestamp: number;
  wall: string;
}

export interface DeadEndHarvestData {
  totalHarvested: number;
  wallTypes: Record<string, number>;
  lastHarvestedAt: number;
}

export class DeadEndHarvest {
  private _harvested: DeadEndData[];
  private _wallTypes: Map<string, number>;
  private _harvestEntropy: number[];
  private _totalHarvested: number;
  private _powerLawExponent: number;

  constructor() {
    this._harvested = [];
    this._wallTypes = new Map();
    this._harvestEntropy = [];
    this._totalHarvested = 0;
    this._powerLawExponent = 0;
  }

  get totalHarvested(): number {
    return this._totalHarvested;
  }

  get powerLawExponent(): number {
    return this._powerLawExponent;
  }

  public harvest(wall: string): DeadEndData {
    const data: DeadEndData = {
      id: `deadend-${this._totalHarvested}`,
      timestamp: Date.now(),
      wall,
    };
    this._harvested.push(data);
    this._wallTypes.set(wall, (this._wallTypes.get(wall) ?? 0) + 1);
    this._totalHarvested++;
    this._harvestEntropy.push(this._computeWallEntropy());
    if (this._harvestEntropy.length > 50) this._harvestEntropy.shift();
    this._updatePowerLaw();
    return data;
  }

  public ruminate(): string[] {
    return this._harvested.map(d => d.wall);
  }

  public clear(): void {
    this._harvested = [];
    this._wallTypes.clear();
    this._totalHarvested = 0;
    this._powerLawExponent = 0;
  }

  public report(): DeadEndHarvestData {
    const wallTypes: Record<string, number> = {};
    for (const [k, v] of this._wallTypes) wallTypes[k] = v;
    return {
      totalHarvested: this._totalHarvested,
      wallTypes,
      lastHarvestedAt: this._harvested.length > 0 ? this._harvested[this._harvested.length - 1].timestamp : 0,
    };
  }

  public computeWallEntropy(): number {
    if (this._wallTypes.size === 0) return 0;
    const total = this._totalHarvested;
    let entropy = 0;
    for (const count of this._wallTypes.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  public computeHarvestEntropy(): number {
    if (this._harvestEntropy.length === 0) return 0;
    const mean = this._harvestEntropy.reduce((a, b) => a + b, 0) / this._harvestEntropy.length;
    const variance = this._harvestEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._harvestEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computeZipfRanking(): Array<{ wall: string; frequency: number; rank: number }> {
    const sorted = Array.from(this._wallTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry, i) => ({ wall: entry[0], frequency: entry[1], rank: i + 1 }));
    return sorted;
  }

  private _computeWallEntropy(): number {
    return this.computeWallEntropy();
  }

  private _updatePowerLaw(): void {
    const sorted = Array.from(this._wallTypes.values()).sort((a, b) => b - a);
    if (sorted.length < 2) {
      this._powerLawExponent = 0;
      return;
    }
    const logRanks = sorted.map((_, i) => Math.log(i + 1));
    const logFreqs = sorted.map(f => Math.log(f + 1));
    const n = logRanks.length;
    const meanX = logRanks.reduce((a, b) => a + b, 0) / n;
    const meanY = logFreqs.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (logRanks[i] - meanX) * (logFreqs[i] - meanY);
      den += (logRanks[i] - meanX) ** 2;
    }
    this._powerLawExponent = den > 0 ? -num / den : 0;
  }
}
