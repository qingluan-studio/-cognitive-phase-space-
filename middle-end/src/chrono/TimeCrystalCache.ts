/**
 * 时间晶体缓存：周期性自刷新而不消耗额外能量。
 * 利用时间晶体的基态振荡特性，缓存条目在稳态下自动循环刷新，
 * 因此维持新鲜度所需的能量预算趋近于零。
 */

export interface CrystalEntry {
  key: string;
  value: Record<string, unknown>;
  crystallizedAt: number;
  oscillationPhase: number;
  refreshCount: number;
}

export type CrystalState = 'liquid' | 'crystallizing' | 'crystal' | 'shattered';

export interface CrystalStats {
  totalEntries: number;
  totalRefreshes: number;
  energyBudget: number;
  state: CrystalState;
}

export class TimeCrystalCache {
  private _store: Map<string, CrystalEntry> = new Map();
  private _phase: number = 0;
  private _energyBudget: number = 100;
  private _state: CrystalState = 'liquid';
  private _refreshCount: number = 0;

  set(key: string, value: Record<string, unknown>): CrystalEntry {
    const entry: CrystalEntry = {
      key,
      value,
      crystallizedAt: Date.now(),
      oscillationPhase: this._phase,
      refreshCount: 0,
    };
    this._store.set(key, entry);
    this._crystallize();
    return entry;
  }

  get(key: string): Record<string, unknown> | null {
    const entry = this._store.get(key);
    if (!entry) return null;
    this._syncPhase(entry);
    return entry.value;
  }

  /** 自刷新：时间晶体的核心特性，刷新不消耗能量预算。 */
  selfRefresh(): number {
    let refreshed = 0;
    for (const entry of this._store.values()) {
      entry.oscillationPhase = (entry.oscillationPhase + 1) % 360;
      entry.refreshCount++;
      refreshed++;
    }
    this._refreshCount += refreshed;
    this._phase = (this._phase + 1) % 360;
    return refreshed;
  }

  synchronize(): void {
    this._phase = 0;
    for (const entry of this._store.values()) {
      entry.oscillationPhase = 0;
    }
    this._state = 'crystal';
  }

  evict(key: string): boolean {
    return this._store.delete(key);
  }

  shatter(): void {
    this._store.clear();
    this._state = 'shattered';
    this._phase = 0;
  }

  get state(): CrystalState {
    return this._state;
  }

  get energyBudget(): number {
    return this._energyBudget;
  }

  getStats(): CrystalStats {
    return {
      totalEntries: this._store.size,
      totalRefreshes: this._refreshCount,
      energyBudget: this._energyBudget,
      state: this._state,
    };
  }

  private _crystallize(): void {
    if (this._store.size >= 8 && this._state === 'liquid') {
      this._state = 'crystallizing';
    }
    if (this._store.size >= 16) {
      this._state = 'crystal';
    }
  }

  private _syncPhase(entry: CrystalEntry): void {
    const drift = (this._phase - entry.oscillationPhase + 360) % 360;
    if (drift > 180) {
      entry.oscillationPhase = this._phase;
      entry.refreshCount++;
    }
  }
}
