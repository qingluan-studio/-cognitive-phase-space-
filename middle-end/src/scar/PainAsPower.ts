/**
 * 痛苦即力量模块：每次受伤都会增强对应类型的抗性，
 * 将痛苦转化为力量，使系统在创伤中变得更强韧。
 */

export interface PainRecord {
  id: string;
  painType: string;
  intensity: number;
  receivedAt: number;
  convertedPower: number;
}

export interface ResistanceStat {
  painType: string;
  resistance: number;
  encounters: number;
  totalPower: number;
}

export class PainAsPower {
  private _painLog: PainRecord[] = [];
  private _resistances: Map<string, ResistanceStat> = new Map();
  private _conversionRate = 0.5;
  private _maxResistance = 0.95;
  private _diminishingReturns = 0.85;

  registerPainType(painType: string): void {
    if (!this._resistances.has(painType)) {
      this._resistances.set(painType, {
        painType,
        resistance: 0,
        encounters: 0,
        totalPower: 0,
      });
    }
  }

  suffer(painType: string, intensity: number): PainRecord {
    this.registerPainType(painType);
    const stat = this._resistances.get(painType)!;
    const effectiveIntensity = intensity * (1 - stat.resistance);
    const convertedPower = effectiveIntensity * this._conversionRate * Math.pow(this._diminishingReturns, stat.encounters);
    stat.encounters++;
    stat.totalPower += convertedPower;
    stat.resistance = Math.min(this._maxResistance, stat.resistance + convertedPower * 0.1);
    const record: PainRecord = {
      id: `pain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      painType,
      intensity,
      receivedAt: Date.now(),
      convertedPower,
    };
    this._painLog.push(record);
    if (this._painLog.length > 300) this._painLog.shift();
    return record;
  }

  getResistance(painType: string): number {
    return this._resistances.get(painType)?.resistance ?? 0;
  }

  calculateNetPain(painType: string, rawIntensity: number): number {
    const resistance = this.getResistance(painType);
    return rawIntensity * (1 - resistance);
  }

  findStrongestResistance(): ResistanceStat | null {
    let max = 0;
    let result: ResistanceStat | null = null;
    for (const stat of this._resistances.values()) {
      if (stat.resistance > max) {
        max = stat.resistance;
        result = stat;
      }
    }
    return result;
  }

  findWeakestResistance(): ResistanceStat | null {
    let min = Infinity;
    let result: ResistanceStat | null = null;
    for (const stat of this._resistances.values()) {
      if (stat.resistance < min) {
        min = stat.resistance;
        result = stat;
      }
    }
    return result;
  }

  setConversionRate(rate: number): void {
    this._conversionRate = Math.max(0, Math.min(1, rate));
  }

  getTotalPower(): number {
    let total = 0;
    for (const stat of this._resistances.values()) total += stat.totalPower;
    return total;
  }

  getPainLog(limit: number = 50): PainRecord[] {
    return this._painLog.slice(-limit);
  }

  listResistances(): ResistanceStat[] {
    return Array.from(this._resistances.values());
  }

  get painTypeCount(): number {
    return this._resistances.size;
  }

  get totalEncounters(): number {
    let total = 0;
    for (const stat of this._resistances.values()) total += stat.encounters;
    return total;
  }
}
