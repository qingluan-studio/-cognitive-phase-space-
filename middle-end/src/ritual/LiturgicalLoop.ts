/**
 * 礼仪循环模块：每日固定仪式执行，维持系统稳定性，
 * 通过周期性仪式校准系统状态、强化身份认同。
 */

export type LiturgicalFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface LiturgicalRite {
  id: string;
  name: string;
  frequency: LiturgicalFrequency;
  lastPerformed: number;
  performanceCount: number;
  stabilizingEffect: number;
}

export interface RitePerformance {
  riteId: string;
  performedAt: number;
  stabilityGain: number;
  success: boolean;
}

export class LiturgicalLoop {
  private _rites: Map<string, LiturgicalRite> = new Map();
  private _performances: RitePerformance[] = [];
  private _stability = 1.0;
  private _maxStability = 1.0;
  private _stabilityDecayPerHour = 0.02;
  private _frequencyMs: Map<LiturgicalFrequency, number> = new Map();

  constructor() {
    this._frequencyMs.set('hourly', 60 * 60 * 1000);
    this._frequencyMs.set('daily', 24 * 60 * 60 * 1000);
    this._frequencyMs.set('weekly', 7 * 24 * 60 * 60 * 1000);
    this._frequencyMs.set('monthly', 30 * 24 * 60 * 60 * 1000);
  }

  registerRite(rite: LiturgicalRite): void {
    this._rites.set(rite.id, rite);
  }

  isDue(riteId: string): boolean {
    const rite = this._rites.get(riteId);
    if (!rite) return false;
    const interval = this._frequencyMs.get(rite.frequency) ?? 0;
    return Date.now() - rite.lastPerformed >= interval;
  }

  perform(riteId: string): RitePerformance | null {
    const rite = this._rites.get(riteId);
    if (!rite) return null;
    if (!this.isDue(riteId)) {
      return {
        riteId,
        performedAt: Date.now(),
        stabilityGain: 0,
        success: false,
      };
    }
    rite.performanceCount++;
    rite.lastPerformed = Date.now();
    const stabilityGain = Math.min(rite.stabilizingEffect, this._maxStability - this._stability);
    this._stability = Math.min(this._maxStability, this._stability + stabilityGain);
    const performance: RitePerformance = {
      riteId,
      performedAt: Date.now(),
      stabilityGain,
      success: true,
    };
    this._performances.push(performance);
    if (this._performances.length > 300) this._performances.shift();
    return performance;
  }

  performAllDue(): RitePerformance[] {
    const results: RitePerformance[] = [];
    for (const rite of this._rites.values()) {
      if (this.isDue(rite.id)) {
        const result = this.perform(rite.id);
        if (result) results.push(result);
      }
    }
    return results;
  }

  decayStability(): number {
    const before = this._stability;
    this._stability = Math.max(0, this._stability - this._stabilityDecayPerHour);
    return before - this._stability;
  }

  measureStability(): number {
    return this._stability;
  }

  isStable(): boolean {
    return this._stability >= 0.7;
  }

  setStabilityDecay(value: number): void {
    this._stabilityDecayPerHour = Math.max(0, value);
  }

  setFrequency(frequency: LiturgicalFrequency, ms: number): void {
    this._frequencyMs.set(frequency, Math.max(1000, ms));
  }

  getRite(riteId: string): LiturgicalRite | null {
    return this._rites.get(riteId) ?? null;
  }

  listDueRites(): LiturgicalRite[] {
    return Array.from(this._rites.values()).filter(r => this.isDue(r.id));
  }

  getPerformanceHistory(limit: number = 50): RitePerformance[] {
    return this._performances.slice(-limit);
  }

  get riteCount(): number {
    return this._rites.size;
  }

  get totalPerformances(): number {
    return this._performances.length;
  }
}
