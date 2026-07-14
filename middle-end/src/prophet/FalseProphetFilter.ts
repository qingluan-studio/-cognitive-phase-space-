/**
 * 假先知过滤器模块：排除不可靠的预测。
 * 通过历史命中率与一致性检验，把假先知从预言者池中剔除。
 */

export interface FalseProphetFilterData {
  candidates: number;
  trusted: string[];
  banned: string[];
}

export interface ProphetRecord {
  name: string;
  hits: number;
  misses: number;
  consistency: number;
}

export class FalseProphetFilter {
  private _records: Map<string, ProphetRecord>;
  private _banned: Set<string>;
  private _hitThreshold: number;
  private _consistencyThreshold: number;

  constructor(hitThreshold: number = 0.6, consistencyThreshold: number = 0.7) {
    this._records = new Map<string, ProphetRecord>();
    this._banned = new Set<string>();
    this._hitThreshold = hitThreshold;
    this._consistencyThreshold = consistencyThreshold;
  }

  get candidateCount(): number {
    return this._records.size;
  }

  get trusted(): string[] {
    return Array.from(this._records.values())
      .filter((r) => this._isTrusted(r))
      .map((r) => r.name);
  }

  get banned(): string[] {
    return Array.from(this._banned);
  }

  public register(name: string): void {
    if (!this._records.has(name)) {
      this._records.set(name, { name, hits: 0, misses: 0, consistency: 1 });
    }
  }

  public recordOutcome(name: string, hit: boolean): void {
    const r = this._records.get(name);
    if (!r) return;
    if (hit) r.hits += 1;
    else r.misses += 1;
    const total = r.hits + r.misses;
    r.consistency = total === 0 ? 1 : r.hits / total;
    if (!this._isTrusted(r)) this._banned.add(name);
  }

  public isTrusted(name: string): boolean {
    const r = this._records.get(name);
    return r !== undefined && this._isTrusted(r) && !this._banned.has(name);
  }

  public reinstate(name: string): void {
    this._banned.delete(name);
  }

  public calibrate(hit: number, consistency: number): void {
    this._hitThreshold = hit;
    this._consistencyThreshold = consistency;
  }

  public report(): FalseProphetFilterData {
    return {
      candidates: this._records.size,
      trusted: this.trusted,
      banned: this.banned,
    };
  }

  private _isTrusted(r: ProphetRecord): boolean {
    return r.consistency >= this._consistencyThreshold && r.consistency >= this._hitThreshold;
  }
}
