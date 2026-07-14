/**
 * 性选择展示：炫耀性功能吸引组合。
 * 通过华丽展示吸引其他模块与之组合，展示越华丽被选中的概率越高，但消耗也更大。
 */

export interface DisplayAct {
  id: string;
  performerId: string;
  ornamentation: number;
  energyCost: number;
  audience: string[];
}

export interface MatingResult {
  performerId: string;
  partnerId: string;
  offspringTraits: Record<string, unknown>;
  matedAt: number;
}

export class SexualSelectionDisplay {
  private _displays: DisplayAct[] = [];
  private _attraction: Map<string, number> = new Map();
  private _matings: MatingResult[] = [];
  private _energyPool: Map<string, number> = new Map();

  setEnergy(performerId: string, energy: number): void {
    this._energyPool.set(performerId, energy);
  }

  perform(performerId: string, ornamentation: number, audience: string[]): DisplayAct | null {
    const energy = this._energyPool.get(performerId) ?? 0;
    const energyCost = ornamentation * 0.5;
    if (energy < energyCost) return null;
    this._energyPool.set(performerId, energy - energyCost);
    const display: DisplayAct = {
      id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      performerId,
      ornamentation,
      energyCost,
      audience,
    };
    this._displays.push(display);
    if (this._displays.length > 200) this._displays.shift();
    const current = this._attraction.get(performerId) ?? 0;
    this._attraction.set(performerId, current + ornamentation);
    return display;
  }

  choosePartner(chooserId: string, candidates: string[]): MatingResult | null {
    if (candidates.length === 0) return null;
    const weighted = candidates.map(id => ({
      id,
      weight: this._attraction.get(id) ?? 0,
    }));
    const total = weighted.reduce((s, w) => s + w.weight, 0);
    if (total === 0) return null;
    let roll = Math.random() * total;
    let partnerId = weighted[0].id;
    for (const w of weighted) {
      roll -= w.weight;
      if (roll <= 0) {
        partnerId = w.id;
        break;
      }
    }
    const result: MatingResult = {
      performerId: partnerId,
      partnerId: chooserId,
      offspringTraits: { display: 'inherited', attraction: (this._attraction.get(partnerId) ?? 0) * 0.5 },
      matedAt: Date.now(),
    };
    this._matings.push(result);
    if (this._matings.length > 100) this._matings.shift();
    return result;
  }

  refillEnergy(performerId: string, amount: number): number {
    const current = this._energyPool.get(performerId) ?? 0;
    const updated = current + amount;
    this._energyPool.set(performerId, updated);
    return updated;
  }

  getAttraction(performerId: string): number {
    return this._attraction.get(performerId) ?? 0;
  }

  getDisplays(limit: number = 50): DisplayAct[] {
    return this._displays.slice(-limit);
  }

  getMatings(limit: number = 50): MatingResult[] {
    return this._matings.slice(-limit);
  }

  get displayCount(): number {
    return this._displays.length;
  }
}
