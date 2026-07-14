export interface IsolationPurgeData {
  quarantined: string[];
  purged: number;
  released: string[];
  inIsolation: number;
  averageRisk: number;
  purgeRatio: number;
}

interface _QuarantineEntry {
  risk: number;
  cycles: number;
  initialRisk: number;
  sideEffects: string[];
  decayRate: number;
}

export class IsolationPurge {
  private _quarantine: Map<string, _QuarantineEntry>;
  private _purged: number;
  private _released: string[];
  private _purgeThreshold: number;
  private _riskThreshold: number;
  private _contagionMap: Map<string, Set<string>>;

  constructor(purgeThreshold: number = 5, riskThreshold: number = 1) {
    this._quarantine = new Map<string, _QuarantineEntry>();
    this._purged = 0;
    this._released = [];
    this._purgeThreshold = purgeThreshold;
    this._riskThreshold = riskThreshold;
    this._contagionMap = new Map<string, Set<string>>();
  }

  get inIsolation(): number {
    return this._quarantine.size;
  }

  get averageRisk(): number {
    if (this._quarantine.size === 0) return 0;
    let acc = 0;
    for (const entry of this._quarantine.values()) acc += entry.risk;
    return acc / this._quarantine.size;
  }

  get purgeRatio(): number {
    const total = this._purged + this._released.length;
    return total === 0 ? 0 : this._purged / total;
  }

  public isolate(moduleId: string, risk: number, sideEffects: string[] = []): void {
    this._quarantine.set(moduleId, {
      risk: Math.max(0, risk),
      cycles: 0,
      initialRisk: risk,
      sideEffects,
      decayRate: this._computeDecay(risk),
    });
    if (!this._contagionMap.has(moduleId)) this._contagionMap.set(moduleId, new Set<string>());
  }

  private _computeDecay(risk: number): number {
    if (risk <= 0) return 1;
    return Math.max(0.5, 1 - 1 / (1 + risk));
  }

  public linkContagion(sourceId: string, targetId: string): boolean {
    if (!this._quarantine.has(sourceId) || !this._quarantine.has(targetId)) return false;
    this._contagionMap.get(sourceId)!.add(targetId);
    return true;
  }

  public tick(): void {
    const toRelease: string[] = [];
    for (const [id, entry] of this._quarantine) {
      entry.cycles += 1;
      entry.risk = Math.max(0, entry.risk * entry.decayRate);
      if (entry.cycles >= this._purgeThreshold && entry.risk <= this._riskThreshold) {
        toRelease.push(id);
      }
    }
    for (const id of toRelease) this._release(id);
  }

  public forcePurge(moduleId: string): boolean {
    if (!this._quarantine.has(moduleId)) return false;
    const entry = this._quarantine.get(moduleId)!;
    this._propagatePurge(moduleId, entry.risk * 0.5);
    this._quarantine.delete(moduleId);
    this._purged += 1;
    return true;
  }

  private _propagatePurge(origin: string, residualRisk: number): void {
    const contacts = this._contagionMap.get(origin);
    if (!contacts) return;
    for (const contact of contacts) {
      const entry = this._quarantine.get(contact);
      if (entry) {
        entry.risk = Math.min(entry.initialRisk, entry.risk + residualRisk);
        entry.cycles = Math.max(0, entry.cycles - 1);
      }
    }
  }

  public injectRisk(moduleId: string, delta: number): boolean {
    const entry = this._quarantine.get(moduleId);
    if (!entry) return false;
    entry.risk = Math.max(0, entry.risk + delta);
    entry.initialRisk = Math.max(entry.initialRisk, entry.risk);
    return true;
  }

  public setThreshold(cycles: number): void {
    this._purgeThreshold = Math.max(1, cycles);
  }

  public riskOf(moduleId: string): number {
    return this._quarantine.get(moduleId)?.risk ?? 0;
  }

  public purificationProgress(moduleId: string): number {
    const entry = this._quarantine.get(moduleId);
    if (!entry || entry.initialRisk === 0) return 1;
    return Math.max(0, Math.min(1, 1 - entry.risk / entry.initialRisk));
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
      averageRisk: this.averageRisk,
      purgeRatio: this.purgeRatio,
    };
  }

  private _release(id: string): void {
    this._quarantine.delete(id);
    this._released.push(id);
  }
}
