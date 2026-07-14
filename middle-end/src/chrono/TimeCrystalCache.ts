export interface CrystalEntry {
  key: string;
  value: Record<string, unknown>;
  crystallizedAt: number;
  oscillationPhase: number;
  naturalFrequency: number;
  refreshCount: number;
  coherenceWeight: number;
}

export type CrystalState = 'liquid' | 'crystallizing' | 'crystal' | 'shattered';

export interface CrystalStats {
  totalEntries: number;
  totalRefreshes: number;
  energyBudget: number;
  state: CrystalState;
  orderParameter: number;
  freeEnergy: number;
}

export class TimeCrystalCache {
  private _store: Map<string, CrystalEntry> = new Map();
  private _globalPhase: number = 0;
  private _energyBudget: number = 100;
  private _state: CrystalState = 'liquid';
  private _refreshCount: number = 0;
  private _couplingStrength: number = 0.6;
  private _orderParameter: number = 0;
  private _criticalSize: number = 8;
  private _temperature: number = 0.3;

  set(key: string, value: Record<string, unknown>): CrystalEntry {
    const entry: CrystalEntry = {
      key,
      value,
      crystallizedAt: Date.now(),
      oscillationPhase: Math.random() * Math.PI * 2,
      naturalFrequency: 0.8 + Math.random() * 0.4,
      refreshCount: 0,
      coherenceWeight: 0,
    };
    this._store.set(key, entry);
    this._updateCrystallization();
    return entry;
  }

  get(key: string): Record<string, unknown> | null {
    const entry = this._store.get(key);
    if (!entry) return null;
    this._quantumZenoTouch(entry);
    return entry.value;
  }

  selfRefresh(): number {
    if (this._store.size === 0) return 0;
    const entries = Array.from(this._store.values());
    let refreshed = 0;
    const prevOrder = this._orderParameter;
    for (const entry of entries) {
      const coupling = this._couplingStrength * prevOrder;
      const phaseDrift = Math.sin(this._globalPhase - entry.oscillationPhase);
      entry.oscillationPhase += entry.naturalFrequency + coupling * phaseDrift;
      entry.oscillationPhase = this._normalizePhase(entry.oscillationPhase);
      entry.refreshCount++;
      refreshed++;
    }
    this._refreshCount += refreshed;
    this._globalPhase = this._normalizePhase(this._globalPhase + 1);
    this._computeOrderParameter();
    const energyCost = this._computeEnergyCost(prevOrder);
    this._energyBudget = Math.max(0, this._energyBudget - energyCost);
    return refreshed;
  }

  synchronize(): void {
    this._globalPhase = 0;
    for (const entry of this._store.values()) {
      entry.oscillationPhase = 0;
      entry.coherenceWeight = 1;
    }
    this._orderParameter = 1;
    this._state = 'crystal';
  }

  evict(key: string): boolean {
    const existed = this._store.delete(key);
    if (existed) this._updateCrystallization();
    return existed;
  }

  shatter(): void {
    this._store.clear();
    this._state = 'shattered';
    this._globalPhase = 0;
    this._orderParameter = 0;
  }

  get state(): CrystalState {
    return this._state;
  }

  get energyBudget(): number {
    return this._energyBudget;
  }

  get orderParameter(): number {
    return this._orderParameter;
  }

  getStats(): CrystalStats {
    return {
      totalEntries: this._store.size,
      totalRefreshes: this._refreshCount,
      energyBudget: this._energyBudget,
      state: this._state,
      orderParameter: this._orderParameter,
      freeEnergy: this._landauFreeEnergy(),
    };
  }

  private _normalizePhase(phase: number): number {
    const twoPi = Math.PI * 2;
    return ((phase % twoPi) + twoPi) % twoPi;
  }

  private _computeOrderParameter(): void {
    if (this._store.size === 0) {
      this._orderParameter = 0;
      return;
    }
    let sumSin = 0, sumCos = 0;
    for (const entry of this._store.values()) {
      sumSin += Math.sin(entry.oscillationPhase);
      sumCos += Math.cos(entry.oscillationPhase);
    }
    const n = this._store.size;
    this._orderParameter = Math.sqrt(sumSin * sumSin + sumCos * sumCos) / n;
    this._globalPhase = Math.atan2(sumSin, sumCos);
  }

  private _computeEnergyCost(prevOrder: number): number {
    const coherenceGain = this._orderParameter - prevOrder;
    const baseCost = 0.1 * this._store.size;
    const coherenceDiscount = 1 - this._orderParameter * 0.8;
    const quantumZenoBonus = coherenceGain > 0 ? coherenceGain * 2 : 0;
    return Math.max(0, baseCost * coherenceDiscount - quantumZenoBonus);
  }

  private _landauFreeEnergy(): number {
    const r = this._criticalSize - this._store.size;
    const order = this._orderParameter;
    const t = this._temperature;
    return t * r * order * order + order * order * order * order - this._couplingStrength * order * order;
  }

  private _updateCrystallization(): void {
    const size = this._store.size;
    const freeEnergy = this._landauFreeEnergy();
    if (size === 0) {
      this._state = 'liquid';
    } else if (size >= this._criticalSize * 2 && this._orderParameter > 0.7) {
      this._state = 'crystal';
    } else if (size >= this._criticalSize || freeEnergy < 0) {
      this._state = 'crystallizing';
    } else {
      this._state = 'liquid';
    }
  }

  private _quantumZenoTouch(entry: CrystalEntry): void {
    const observationStrength = 0.15;
    entry.oscillationPhase += observationStrength * (this._globalPhase - entry.oscillationPhase);
    entry.oscillationPhase = this._normalizePhase(entry.oscillationPhase);
    entry.coherenceWeight = Math.min(1, entry.coherenceWeight + observationStrength);
    entry.refreshCount++;
    this._refreshCount++;
  }
}
