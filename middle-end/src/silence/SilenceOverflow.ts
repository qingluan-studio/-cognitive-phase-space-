export interface OverflowThreshold {
  id: string;
  limit: number;
  current: number;
  breached: boolean;
}

export class SilenceOverflow {
  private _thresholds: Map<string, OverflowThreshold> = new Map();
  private _overflowHistory: Array<{ id: string; amount: number; timestamp: number }> = [];
  private _totalOverflow: number;
  private _entropyLog: number[];
  private _cascadeProbability: number;

  constructor() {
    this._totalOverflow = 0;
    this._entropyLog = [];
    this._cascadeProbability = 0;
  }

  get totalOverflow(): number {
    return this._totalOverflow;
  }

  get cascadeProbability(): number {
    return this._cascadeProbability;
  }

  public registerThreshold(id: string, limit: number): void {
    this._thresholds.set(id, { id, limit, current: 0, breached: false });
  }

  public accumulate(id: string, amount: number): OverflowThreshold | null {
    const threshold = this._thresholds.get(id);
    if (!threshold) return null;
    threshold.current += amount;
    if (threshold.current > threshold.limit) {
      threshold.breached = true;
      const overflow = threshold.current - threshold.limit;
      this._totalOverflow += overflow;
      this._overflowHistory.push({ id, amount: overflow, timestamp: Date.now() });
      if (this._overflowHistory.length > 50) this._overflowHistory.shift();
      this._updateEntropy();
      this._updateCascadeProbability();
    }
    return threshold;
  }

  public drain(id: string, amount: number): void {
    const threshold = this._thresholds.get(id);
    if (!threshold) return;
    threshold.current = Math.max(0, threshold.current - amount);
    threshold.breached = threshold.current > threshold.limit;
  }

  public reset(id: string): void {
    const threshold = this._thresholds.get(id);
    if (!threshold) return;
    threshold.current = 0;
    threshold.breached = false;
  }

  public getThreshold(id: string): OverflowThreshold | null {
    return this._thresholds.get(id) ?? null;
  }

  public getBreached(): OverflowThreshold[] {
    return Array.from(this._thresholds.values()).filter(t => t.breached);
  }

  public computeOverflowEntropy(): number {
    if (this._entropyLog.length === 0) return 0;
    const mean = this._entropyLog.reduce((a, b) => a + b, 0) / this._entropyLog.length;
    const variance = this._entropyLog.reduce((s, v) => s + (v - mean) ** 2, 0) / this._entropyLog.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public simulatePercolation(): Array<{ threshold: string; probability: number }> {
    const results: Array<{ threshold: string; probability: number }> = [];
    for (const [id, t] of this._thresholds) {
      const p = t.limit > 0 ? t.current / t.limit : 0;
      results.push({ threshold: id, probability: p > 0.592746 ? 1 : 0 });
    }
    return results;
  }

  public computeCriticalExponent(): number {
    const breached = this.getBreached().length;
    const total = this._thresholds.size;
    if (total === 0) return 0;
    const p = breached / total;
    return p > 0 ? Math.log(p) / Math.log(Math.abs(p - 0.592746) + 1e-10) : 0;
  }

  private _updateEntropy(): void {
    const amounts = this._overflowHistory.map(h => h.amount);
    const total = amounts.reduce((a, b) => a + b, 0);
    if (total === 0) return;
    let entropy = 0;
    for (const a of amounts) {
      const p = a / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    this._entropyLog.push(entropy);
    if (this._entropyLog.length > 50) this._entropyLog.shift();
  }

  private _updateCascadeProbability(): void {
    const breached = this.getBreached().length;
    const total = this._thresholds.size;
    this._cascadeProbability = total > 0 ? 1 - Math.exp(-breached / total) : 0;
  }
}
