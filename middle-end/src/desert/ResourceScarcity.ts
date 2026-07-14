/**
 * 资源匮乏模块：故意制造匮乏锻炼效率。
 * 把可用资源压缩到极限，迫使系统在贫瘠中学会精打细算。
 */

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

  constructor(pool: number = 100, threshold: number = 0.3) {
    this._pool = pool;
    this._demand = 0;
    this._allocation = new Map<string, number>();
    this._pressureThreshold = threshold;
  }

  get pool(): number {
    return this._pool;
  }

  get pressure(): number {
    return this._pool === 0 ? 1 : Math.min(1, this._demand / this._pool);
  }

  public request(consumer: string, amount: number): number {
    this._demand += amount;
    const scarcity = 1 - this.pressure;
    const granted = Math.min(amount, this._pool) * (this.pressure > this._pressureThreshold ? scarcity : 1);
    this._pool = Math.max(0, this._pool - granted);
    this._allocation.set(consumer, (this._allocation.get(consumer) ?? 0) + granted);
    return granted;
  }

  public reclaim(consumer: string): number {
    const amount = this._allocation.get(consumer) ?? 0;
    this._pool += amount;
    this._demand = Math.max(0, this._demand - amount);
    this._allocation.delete(consumer);
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
}
