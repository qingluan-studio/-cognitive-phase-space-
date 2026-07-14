export interface ResourceScarcityData {
  pool: number;
  demand: number;
  pressure: number;
  allocation: Record<string, number>;
}

export class ResourceScarcity {
  private _pool: number;
  private _demand: number;
  private _allocation: Map<string, number>;
  private _pressureThreshold: number;
  private _elasticity: number;
  private _marginalUtility: Map<string, number>;
  private _priceVector: Map<string, number>;

  constructor(pool: number = 100, threshold: number = 0.3) {
    this._pool = pool;
    this._demand = 0;
    this._allocation = new Map<string, number>();
    this._pressureThreshold = threshold;
    this._elasticity = 1.0;
    this._marginalUtility = new Map();
    this._priceVector = new Map();
  }

  get pool(): number {
    return this._pool;
  }

  get pressure(): number {
    return this._pool === 0 ? 1 : Math.min(1, this._demand / this._pool);
  }

  get elasticity(): number {
    return this._elasticity;
  }

  public request(consumer: string, amount: number): number {
    this._demand += amount;
    const scarcity = 1 - this.pressure;
    const granted = Math.min(amount, this._pool) * (this.pressure > this._pressureThreshold ? scarcity : 1);
    this._pool = Math.max(0, this._pool - granted);
    this._allocation.set(consumer, (this._allocation.get(consumer) ?? 0) + granted);
    const mu = this._computeMarginalUtility(granted, amount);
    this._marginalUtility.set(consumer, mu);
    this._priceVector.set(consumer, this.pressure > this._pressureThreshold ? 1 / Math.max(scarcity, 1e-10) : 1);
    return granted;
  }

  public reclaim(consumer: string): number {
    const amount = this._allocation.get(consumer) ?? 0;
    this._pool += amount;
    this._demand = Math.max(0, this._demand - amount);
    this._allocation.delete(consumer);
    this._marginalUtility.delete(consumer);
    this._priceVector.delete(consumer);
    return amount;
  }

  public trim(fat: number): void {
    for (const [k, v] of this._allocation) {
      const reduced = Math.max(0, v - fat);
      this._allocation.set(k, reduced);
      this._pool += v - reduced;
    }
  }

  public inject(amount: number): void {
    this._pool += amount;
  }

  public report(): ResourceScarcityData {
    const allocation: Record<string, number> = {};
    for (const [k, v] of this._allocation) allocation[k] = v;
    return {
      pool: this._pool,
      demand: this._demand,
      pressure: this.pressure,
      allocation,
    };
  }

  public computeGiniCoefficient(): number {
    const values = Array.from(this._allocation.values()).sort((a, b) => a - b);
    const n = values.length;
    if (n === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    if (mean === 0) return 0;
    let sumAbsDiff = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumAbsDiff += Math.abs(values[i] - values[j]);
      }
    }
    return sumAbsDiff / (2 * n * n * mean);
  }

  public computeNashEquilibrium(): Record<string, number> {
    const equilibrium: Record<string, number> = {};
    const consumers = Array.from(this._allocation.keys());
    const totalUtility = consumers.reduce((s, c) => s + (this._marginalUtility.get(c) ?? 0), 0);
    for (const c of consumers) {
      const mu = this._marginalUtility.get(c) ?? 0;
      equilibrium[c] = totalUtility > 0 ? mu / totalUtility : 1 / consumers.length;
    }
    return equilibrium;
  }

  public setElasticity(value: number): void {
    this._elasticity = Math.max(0.1, value);
  }

  private _computeMarginalUtility(granted: number, requested: number): number {
    return Math.log(1 + granted) / Math.log(1 + Math.max(requested, 1));
  }
}
