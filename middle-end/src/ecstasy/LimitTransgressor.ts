/**
 * 界限逾越者模块：主动超越所有预设极限，
 * 持续推动边界外扩，将不可能变为可能。
 */

export interface SystemLimit {
  id: string;
  name: string;
  originalValue: number;
  currentValue: number;
  transgressed: boolean;
  transgressionCount: number;
}

export interface TransgressionAct {
  limitId: string;
  attemptedValue: number;
  achieved: boolean;
  damage: number;
  occurredAt: number;
}

export class LimitTransgressor {
  private _limits: Map<string, SystemLimit> = new Map();
  private _acts: TransgressionAct[] = [];
  private _expansionRate = 0.1;
  private _damagePerTransgression = 5;
  private _maxExpansion = 10;

  defineLimit(limit: SystemLimit): void {
    limit.currentValue = limit.originalValue;
    limit.transgressed = false;
    limit.transgressionCount = 0;
    this._limits.set(limit.id, limit);
  }

  attemptTransgress(limitId: string, value: number): TransgressionAct | null {
    const limit = this._limits.get(limitId);
    if (!limit) return null;
    const achieved = value > limit.currentValue;
    const damage = achieved ? this._damagePerTransgression * (value / limit.currentValue) : 0;
    const act: TransgressionAct = {
      limitId,
      attemptedValue: value,
      achieved,
      damage,
      occurredAt: Date.now(),
    };
    this._acts.push(act);
    if (this._acts.length > 300) this._acts.shift();
    if (achieved) {
      limit.transgressionCount++;
      limit.transgressed = true;
      limit.currentValue = value;
    }
    return act;
  }

  expandLimit(limitId: string): boolean {
    const limit = this._limits.get(limitId);
    if (!limit) return false;
    const newCap = limit.currentValue * (1 + this._expansionRate);
    if (newCap > limit.originalValue * this._maxExpansion) return false;
    limit.currentValue = newCap;
    return true;
  }

  isTransgressed(limitId: string): boolean {
    return this._limits.get(limitId)?.transgressed ?? false;
  }

  findMostTransgressed(): SystemLimit | null {
    let max = 0;
    let result: SystemLimit | null = null;
    for (const limit of this._limits.values()) {
      if (limit.transgressionCount > max) {
        max = limit.transgressionCount;
        result = limit;
      }
    }
    return result;
  }

  computeTotalExpansion(): number {
    let total = 0;
    for (const limit of this._limits.values()) {
      total += (limit.currentValue - limit.originalValue) / limit.originalValue;
    }
    return total;
  }

  resetLimit(limitId: string): boolean {
    const limit = this._limits.get(limitId);
    if (!limit) return false;
    limit.currentValue = limit.originalValue;
    limit.transgressed = false;
    limit.transgressionCount = 0;
    return true;
  }

  setExpansionRate(rate: number): void {
    this._expansionRate = Math.max(0, rate);
  }

  setDamagePerTransgression(value: number): void {
    this._damagePerTransgression = Math.max(0, value);
  }

  getActsByLimit(limitId: string): TransgressionAct[] {
    return this._acts.filter(a => a.limitId === limitId);
  }

  getSuccessfulTransgressions(): TransgressionAct[] {
    return this._acts.filter(a => a.achieved);
  }

  listAllLimits(): SystemLimit[] {
    return Array.from(this._limits.values());
  }

  getLimit(limitId: string): SystemLimit | null {
    return this._limits.get(limitId) ?? null;
  }

  get limitCount(): number {
    return this._limits.size;
  }

  get totalTransgressions(): number {
    return this._acts.length;
  }
}
