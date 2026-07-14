export interface EntangledPair {
  id: string;
  particleA: string;
  particleB: string;
  correlation: number;
  measured: boolean;
}

export type BellViolation = {
  sValue: number;
  violated: boolean;
  confidence: number;
};

export interface NonLocalConfig {
  correlationStrength: number;
  noiseLevel: number;
  sampleCount: number;
}

export class NonLocalEffect {
  private _config: NonLocalConfig;
  private _pairs: EntangledPair[] = [];
  private _bellResults: BellViolation[] = [];
  private _meta: Record<string, unknown> = {};
  private _correlationMatrix: number[][] = [];
  private _tsirelsonBound: number = 2 * Math.sqrt(2);

  constructor(config: NonLocalConfig) {
    this._config = config;
  }

  get pairCount(): number {
    return this._pairs.length;
  }

  get averageCorrelation(): number {
    if (this._pairs.length === 0) return 0;
    return this._pairs.reduce((acc, p) => acc + p.correlation, 0) / this._pairs.length;
  }

  get tsirelsonBound(): number {
    return this._tsirelsonBound;
  }

  private _updateCorrelationMatrix(): void {
    const n = this._pairs.length;
    this._correlationMatrix = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          row.push(1);
        } else {
          const avg = (this._pairs[i].correlation + this._pairs[j].correlation) / 2;
          row.push(avg);
        }
      }
      this._correlationMatrix.push(row);
    }
  }

  createPair(particleA: string, particleB: string): EntangledPair {
    const pair: EntangledPair = {
      id: `pair-${this._pairs.length}`,
      particleA,
      particleB,
      correlation: this._config.correlationStrength,
      measured: false,
    };
    this._pairs.push(pair);
    if (this._pairs.length > 40) this._pairs.shift();
    this._updateCorrelationMatrix();
    return pair;
  }

  measureBell(): BellViolation {
    const a0 = [];
    const a1 = [];
    const b0 = [];
    const b1 = [];
    for (let i = 0; i < this._config.sampleCount; i++) {
      const noise = (Math.random() - 0.5) * this._config.noiseLevel;
      a0.push(Math.random() < 0.5 + noise ? 1 : -1);
      a1.push(Math.random() < 0.5 + noise * 0.8 ? 1 : -1);
      b0.push(Math.random() < 0.5 + noise * 0.9 ? 1 : -1);
      b1.push(Math.random() < 0.5 + noise * 0.7 ? 1 : -1);
    }
    const eAB = (arrA: number[], arrB: number[]) => {
      let sum = 0;
      for (let i = 0; i < arrA.length; i++) {
        sum += arrA[i] * arrB[i];
      }
      return sum / arrA.length;
    };
    const sValue = Math.abs(eAB(a0, b0) + eAB(a0, b1) + eAB(a1, b0) - eAB(a1, b1));
    const violated = sValue > 2;
    const confidence = violated ? sValue / this._tsirelsonBound : 0;
    const result: BellViolation = { sValue, violated, confidence };
    this._bellResults.push(result);
    if (this._bellResults.length > 20) this._bellResults.shift();
    this._meta.lastBellTest = sValue;
    return result;
  }

  propagateMeasurement(particle: string, outcome: number): string | null {
    const pair = this._pairs.find((p) => p.particleA === particle || p.particleB === particle);
    if (!pair || pair.measured) return null;
    pair.measured = true;
    pair.correlation = outcome;
    const partner = pair.particleA === particle ? pair.particleB : pair.particleA;
    return partner;
  }

  averageSValue(): number {
    if (this._bellResults.length === 0) return 0;
    return this._bellResults.reduce((acc, b) => acc + b.sValue, 0) / this._bellResults.length;
  }

  isNonLocal(): boolean {
    return this.averageSValue() > 2;
  }

  reset(): void {
    this._pairs = [];
    this._bellResults = [];
    this._correlationMatrix = [];
    this._meta = {};
  }

  report(): Record<string, unknown> {
    return {
      pairs: this._pairs.length,
      averageCorrelation: this.averageCorrelation.toFixed(4),
      averageSValue: this.averageSValue().toFixed(4),
      bellTests: this._bellResults.length,
      meta: this._meta,
      tsirelsonBound: this._tsirelsonBound.toFixed(4),
    };
  }
}
