/**
 * 隔离净化模块：将危险模块流放隔离净化。
 * 在沙箱中执行高风险代码，观察副作用，净化后再决定是否放回。
 */

export interface IsolationPurgeData {
  quarantined: string[];
  purged: number;
  released: string[];
  inIsolation: number;
}

export class IsolationPurge {
  private _quarantine: Map<string, { risk: number; cycles: number }>;
  private _purged: number;
  private _released: string[];
  private _purgeThreshold: number;

  constructor(purgeThreshold: number = 5) {
    this._quarantine = new Map<string, { risk: number; cycles: number }>();
    this._purged = 0;
    this._released = [];
    this._purgeThreshold = purgeThreshold;
  }

  get inIsolation(): number {
    return this._quarantine.size;
  }

  public isolate(moduleId: string, risk: number): void {
    this._quarantine.set(moduleId, { risk, cycles: 0 });
  }

  public tick(): void {
    for (const [id, entry] of this._quarantine) {
      entry.cycles += 1;
      entry.risk = Math.max(0, entry.risk - 1);
      if (entry.cycles >= this._purgeThreshold && entry.risk <= 1) {
        this._release(id);
      }
    }
  }

  public forcePurge(moduleId: string): boolean {
    if (!this._quarantine.has(moduleId)) return false;
    this._quarantine.delete(moduleId);
    this._purged += 1;
    return true;
  }

  public setThreshold(cycles: number): void {
    this._purgeThreshold = Math.max(1, cycles);
  }

  public riskOf(moduleId: string): number {
    return this._quarantine.get(moduleId)?.risk ?? 0;
  }

  public listQuarantined(): string[] {
    return Array.from(this._quarantine.keys());
  }

  public report(): IsolationPurgeData {
    return {
      quarantined: this.listQuarantined(),
      purged: this._purged,
      released: [...this._released],
      inIsolation: this.inIsolation,
    };
  }

  private _release(id: string): void {
    this._quarantine.delete(id);
    this._released.push(id);
  }
}
