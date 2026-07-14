export type ParadoxType = 'self_fulfilling' | 'self_defeating' | 'oscillating' | 'invariant';

export interface ParadoxProphecy {
  id: string;
  content: string;
  paradoxType: ParadoxType;
  baseAccuracy: number;
  adjustedAccuracy: number;
  influenceFactor: number;
  emittedAt: number;
}

export interface BehaviorShift {
  prophecyId: string;
  actor: string;
  shiftDirection: number;
  shiftMagnitude: number;
  recordedAt: number;
}

export class OracleParadox {
  private _prophecies: Map<string, ParadoxProphecy> = new Map();
  private _shifts: BehaviorShift[] = [];
  private _maxInfluence = 0.5;
  private _oscillationPeriod = 4;
  private _entropyHistory: number[] = [];
  private _fixedPointTolerance = 0.001;

  emit(content: string, paradoxType: ParadoxType, baseAccuracy: number): ParadoxProphecy {
    const prophecy: ParadoxProphecy = {
      id: `paradox-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content,
      paradoxType,
      baseAccuracy: Math.max(0, Math.min(1, baseAccuracy)),
      adjustedAccuracy: baseAccuracy,
      influenceFactor: 0,
      emittedAt: Date.now(),
    };
    this._prophecies.set(prophecy.id, prophecy);
    return prophecy;
  }

  recordBehaviorShift(prophecyId: string, actor: string, direction: number, magnitude: number): BehaviorShift | null {
    const prophecy = this._prophecies.get(prophecyId);
    if (!prophecy) return null;
    const shift: BehaviorShift = {
      prophecyId,
      actor,
      shiftDirection: direction,
      shiftMagnitude: Math.min(magnitude, this._maxInfluence),
      recordedAt: Date.now(),
    };
    this._shifts.push(shift);
    if (this._shifts.length > 300) this._shifts.shift();
    prophecy.influenceFactor += shift.shiftMagnitude * direction;
    this._recalculate(prophecy);
    this._updateEntropy();
    return shift;
  }

  private _recalculate(prophecy: ParadoxProphecy): void {
    switch (prophecy.paradoxType) {
      case 'self_fulfilling':
        prophecy.adjustedAccuracy = Math.min(1, prophecy.baseAccuracy + prophecy.influenceFactor);
        break;
      case 'self_defeating':
        prophecy.adjustedAccuracy = Math.max(0, prophecy.baseAccuracy - Math.abs(prophecy.influenceFactor));
        break;
      case 'oscillating':
        prophecy.adjustedAccuracy = prophecy.baseAccuracy + Math.sin(prophecy.influenceFactor * this._oscillationPeriod) * 0.2;
        break;
      case 'invariant':
        prophecy.adjustedAccuracy = prophecy.baseAccuracy;
        break;
    }
    prophecy.adjustedAccuracy = Math.max(0, Math.min(1, prophecy.adjustedAccuracy));
  }

  getAccuracy(prophecyId: string): number {
    return this._prophecies.get(prophecyId)?.adjustedAccuracy ?? 0;
  }

  measureParadoxGap(prophecyId: string): number {
    const prophecy = this._prophecies.get(prophecyId);
    if (!prophecy) return 0;
    return Math.abs(prophecy.adjustedAccuracy - prophecy.baseAccuracy);
  }

  findMostParadoxical(): ParadoxProphecy | null {
    let max = 0;
    let result: ParadoxProphecy | null = null;
    for (const p of this._prophecies.values()) {
      const gap = this.measureParadoxGap(p.id);
      if (gap > max) {
        max = gap;
        result = p;
      }
    }
    return result;
  }

  computeSystemEntropy(): number {
    const values = Array.from(this._prophecies.values()).map((p) => p.adjustedAccuracy);
    if (values.length === 0) return 0;
    const bins = 10;
    const histogram = new Array(bins).fill(0);
    for (const v of values) {
      const idx = Math.min(bins - 1, Math.floor(v * bins));
      histogram[idx]++;
    }
    const total = values.length;
    let entropy = 0;
    for (const count of histogram) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  computeLyapunovExponent(prophecyId: string, perturbation: number = 1e-6): number {
    const prophecy = this._prophecies.get(prophecyId);
    if (!prophecy) return 0;
    const original = prophecy.adjustedAccuracy;
    prophecy.influenceFactor += perturbation;
    this._recalculate(prophecy);
    const diverged = prophecy.adjustedAccuracy;
    prophecy.influenceFactor -= perturbation;
    this._recalculate(prophecy);
    return Math.log(Math.abs(diverged - original) / perturbation + 1e-12);
  }

  findFixedPoints(): string[] {
    const fixed: string[] = [];
    for (const [id, p] of this._prophecies) {
      if (Math.abs(p.adjustedAccuracy - p.baseAccuracy) < this._fixedPointTolerance) {
        fixed.push(id);
      }
    }
    return fixed;
  }

  resetInfluence(prophecyId: string): boolean {
    const prophecy = this._prophecies.get(prophecyId);
    if (!prophecy) return false;
    prophecy.influenceFactor = 0;
    prophecy.adjustedAccuracy = prophecy.baseAccuracy;
    return true;
  }

  setMaxInfluence(value: number): void {
    this._maxInfluence = Math.max(0, Math.min(1, value));
  }

  getShiftsByProphecy(prophecyId: string): BehaviorShift[] {
    return this._shifts.filter((s) => s.prophecyId === prophecyId);
  }

  listProphecies(): ParadoxProphecy[] {
    return Array.from(this._prophecies.values());
  }

  get prophecyCount(): number {
    return this._prophecies.size;
  }

  get shiftCount(): number {
    return this._shifts.length;
  }

  get entropyTrend(): number[] {
    return [...this._entropyHistory];
  }

  private _updateEntropy(): void {
    this._entropyHistory.push(this.computeSystemEntropy());
    if (this._entropyHistory.length > 100) this._entropyHistory.shift();
  }
}
