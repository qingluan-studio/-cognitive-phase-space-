/**
 * 重复即变化模块：通过重复产生渐变，
 * 每次重复都引入微小变化，最终累积成显著的形态转变。
 */

export interface RepetitionCycle {
  id: string;
  baseValue: number;
  currentValue: number;
  repetitions: number;
  variationPerCycle: number;
  direction: 'ascending' | 'descending' | 'oscillating';
}

export interface VariationRecord {
  cycleId: string;
  iteration: number;
  delta: number;
  newValue: number;
  recordedAt: number;
}

export class RepetitionChange {
  private _cycles: Map<string, RepetitionCycle> = new Map();
  private _variations: VariationRecord[] = [];
  private _defaultVariation = 0.01;
  private _maxRepetitions = 1000;
  private _oscillationAmplitude = 0.05;

  startCycle(cycle: RepetitionCycle): void {
    if (cycle.variationPerCycle === 0) cycle.variationPerCycle = this._defaultVariation;
    this._cycles.set(cycle.id, cycle);
  }

  repeatOnce(cycleId: string): VariationRecord | null {
    const cycle = this._cycles.get(cycleId);
    if (!cycle) return null;
    if (cycle.repetitions >= this._maxRepetitions) return null;
    cycle.repetitions++;
    let delta: number;
    switch (cycle.direction) {
      case 'ascending':
        delta = cycle.variationPerCycle;
        break;
      case 'descending':
        delta = -cycle.variationPerCycle;
        break;
      case 'oscillating':
        delta = Math.sin(cycle.repetitions * 0.5) * this._oscillationAmplitude;
        break;
      default:
        delta = 0;
    }
    cycle.currentValue += delta;
    const record: VariationRecord = {
      cycleId,
      iteration: cycle.repetitions,
      delta,
      newValue: cycle.currentValue,
      recordedAt: Date.now(),
    };
    this._variations.push(record);
    if (this._variations.length > 500) this._variations.shift();
    return record;
  }

  repeatMany(cycleId: string, count: number): VariationRecord[] {
    const records: VariationRecord[] = [];
    for (let i = 0; i < count; i++) {
      const record = this.repeatOnce(cycleId);
      if (!record) break;
      records.push(record);
    }
    return records;
  }

  measureTotalChange(cycleId: string): number {
    const cycle = this._cycles.get(cycleId);
    if (!cycle) return 0;
    return cycle.currentValue - cycle.baseValue;
  }

  measureChangeRate(cycleId: string): number {
    const cycle = this._cycles.get(cycleId);
    if (!cycle || cycle.repetitions === 0) return 0;
    return this.measureTotalChange(cycleId) / cycle.repetitions;
  }

  detectEmergence(cycleId: string): boolean {
    const cycle = this._cycles.get(cycleId);
    if (!cycle) return false;
    const totalChange = Math.abs(this.measureTotalChange(cycleId));
    return totalChange > Math.abs(cycle.baseValue) * 0.5;
  }

  setDefaultVariation(value: number): void {
    this._defaultVariation = value;
  }

  setOscillationAmplitude(value: number): void {
    this._oscillationAmplitude = Math.max(0, value);
  }

  resetCycle(cycleId: string): boolean {
    const cycle = this._cycles.get(cycleId);
    if (!cycle) return false;
    cycle.currentValue = cycle.baseValue;
    cycle.repetitions = 0;
    return true;
  }

  getCycle(cycleId: string): RepetitionCycle | null {
    return this._cycles.get(cycleId) ?? null;
  }

  getVariationsByCycle(cycleId: string): VariationRecord[] {
    return this._variations.filter(v => v.cycleId === cycleId);
  }

  get cycleCount(): number {
    return this._cycles.size;
  }

  get totalRepetitions(): number {
    let total = 0;
    for (const cycle of this._cycles.values()) total += cycle.repetitions;
    return total;
  }
}
