export interface FalseProphetFilterData {
  candidates: number;
  trusted: string[];
  banned: string[];
  globalReliability: number;
  discriminationPower: number;
}

export interface ProphetRecord {
  name: string;
  hits: number;
  misses: number;
  consistency: number;
  temporalDecay: number;
  predictions: Array<{ ts: number; correct: boolean }>;
}

export class FalseProphetFilter {
  private _records: Map<string, ProphetRecord>;
  private _banned: Set<string>;
  private _hitThreshold: number;
  private _consistencyThreshold: number;
  private _decayRate: number;
  private _minSamples: number;

  constructor(hitThreshold: number = 0.6, consistencyThreshold: number = 0.7, decayRate: number = 0.99) {
    this._records = new Map<string, ProphetRecord>();
    this._banned = new Set<string>();
    this._hitThreshold = hitThreshold;
    this._consistencyThreshold = consistencyThreshold;
    this._decayRate = decayRate;
    this._minSamples = 3;
  }

  get candidateCount(): number {
    return this._records.size;
  }

  get trusted(): string[] {
    return Array.from(this._records.values())
      .filter((r) => this._isTrusted(r) && !this._banned.has(r.name))
      .map((r) => r.name);
  }

  get banned(): string[] {
    return Array.from(this._banned);
  }

  get globalReliability(): number {
    if (this._records.size === 0) return 0;
    let acc = 0;
    let count = 0;
    for (const r of this._records.values()) {
      if (r.predictions.length < this._minSamples) continue;
      acc += r.consistency;
      count += 1;
    }
    return count === 0 ? 0 : acc / count;
  }

  get discriminationPower(): number {
    if (this._records.size < 2) return 0;
    const consistencies = Array.from(this._records.values())
      .filter((r) => r.predictions.length >= this._minSamples)
      .map((r) => r.consistency);
    if (consistencies.length < 2) return 0;
    const mean = consistencies.reduce((s, c) => s + c, 0) / consistencies.length;
    const variance = consistencies.reduce((s, c) => s + (c - mean) ** 2, 0) / consistencies.length;
    return Math.min(1, Math.sqrt(variance));
  }

  public register(name: string): void {
    if (!this._records.has(name)) {
      this._records.set(name, {
        name,
        hits: 0,
        misses: 0,
        consistency: 1,
        temporalDecay: 1,
        predictions: [],
      });
    }
  }

  public recordOutcome(name: string, hit: boolean, ts: number = Date.now()): void {
    const r = this._records.get(name);
    if (!r) return;
    r.predictions.push({ ts, correct: hit });
    if (r.predictions.length > 100) r.predictions.shift();
    this._applyDecay(r);
    if (hit) r.hits += 1;
    else r.misses += 1;
    r.consistency = this._computeWeightedConsistency(r);
    if (!this._isTrusted(r)) this._banned.add(name);
    else this._banned.delete(name);
  }

  private _applyDecay(r: ProphetRecord): void {
    r.temporalDecay *= this._decayRate;
    if (r.predictions.length > 0) {
      const recent = r.predictions.slice(-20);
      const recentHits = recent.filter((p) => p.correct).length;
      const recentRate = recentHits / recent.length;
      r.consistency = r.consistency * r.temporalDecay + recentRate * (1 - r.temporalDecay);
    }
  }

  private _computeWeightedConsistency(r: ProphetRecord): number {
    const total = r.hits + r.misses;
    if (total === 0) return 1;
    const base = r.hits / total;
    const recentWindow = r.predictions.slice(-10);
    if (recentWindow.length === 0) return base;
    const recentHits = recentWindow.filter((p) => p.correct).length;
    const recentRate = recentHits / recentWindow.length;
    return base * 0.4 + recentRate * 0.6;
  }

  public isTrusted(name: string): boolean {
    const r = this._records.get(name);
    return r !== undefined && this._isTrusted(r) && !this._banned.has(name);
  }

  public reliabilityScore(name: string): number {
    const r = this._records.get(name);
    if (!r) return 0;
    const samplePenalty = Math.min(1, r.predictions.length / this._minSamples);
    return r.consistency * samplePenalty;
  }

  public reinstate(name: string): void {
    this._banned.delete(name);
  }

  public calibrate(hit: number, consistency: number): void {
    this._hitThreshold = hit;
    this._consistencyThreshold = consistency;
  }

  public ensembleForecast(predictions: Array<{ prophet: string; forecast: string }>): Map<string, number> {
    const weights = new Map<string, number>();
    for (const { prophet, forecast } of predictions) {
      const score = this.reliabilityScore(prophet);
      weights.set(forecast, (weights.get(forecast) ?? 0) + score);
    }
    const total = Array.from(weights.values()).reduce((s, w) => s + w, 0);
    if (total === 0) return weights;
    for (const [k, v] of weights) weights.set(k, v / total);
    return weights;
  }

  public report(): FalseProphetFilterData {
    return {
      candidates: this._records.size,
      trusted: this.trusted,
      banned: this.banned,
      globalReliability: this.globalReliability,
      discriminationPower: this.discriminationPower,
    };
  }

  private _isTrusted(r: ProphetRecord): boolean {
    if (r.predictions.length < this._minSamples) return true;
    return r.consistency >= this._consistencyThreshold && r.consistency >= this._hitThreshold;
  }
}
