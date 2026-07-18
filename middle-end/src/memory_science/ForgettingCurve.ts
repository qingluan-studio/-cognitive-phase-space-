import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface ForgettingPoint {
  id: string;
  traceId: string;
  hoursElapsed: number;
  retentionRate: number;
  measuredAt: number;
}

export interface MemoryDecay {
  id: string;
  traceId: string;
  initialStrength: number;
  currentStrength: number;
  decayRate: number;
  halfLife: number;
  lastReview: number;
}

export interface SpacedRepetition {
  id: string;
  traceId: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: number;
  lastQuality: number;
}

export class ForgettingCurve {
  private _decays: Map<string, MemoryDecay> = new Map();
  private _curves: Map<string, ForgettingPoint[]> = new Map();
  private _spacedRepetition: Map<string, SpacedRepetition> = new Map();
  private _totalRetention = 0.7;
  private _history: string[] = [];
  private _counter = 0;

  calculateDecay(traceId: string, hours: number): MemoryDecay | null {
    const existing = this._decays.get(traceId);
    if (!existing) {
      const decay: MemoryDecay = {
        id: `decay-${(++this._counter).toString(36)}`,
        traceId,
        initialStrength: 1.0,
        currentStrength: this.ebbinghausCurve(1.0, hours),
        decayRate: 0.05,
        halfLife: 24,
        lastReview: Date.now(),
      };
      this._decays.set(traceId, decay);
      this._addForgettingPoint(traceId, hours, decay.currentStrength);
      this._updateTotalRetention();
      this._recordHistory(`calculateDecay:${traceId}:${hours}h`);
      return decay;
    }

    const elapsedSinceReview = (Date.now() - existing.lastReview) / (1000 * 60 * 60);
    const totalHours = elapsedSinceReview + hours;
    existing.currentStrength = this.ebbinghausCurve(existing.currentStrength, totalHours);
    this._addForgettingPoint(traceId, totalHours, existing.currentStrength);
    this._updateTotalRetention();
    this._recordHistory(`calculateDecay:${traceId}:${hours}h`);
    return existing;
  }

  ebbinghausCurve(strength: number, time: number): number {
    const decayConstant = 0.1;
    return strength * Math.exp(-decayConstant * Math.sqrt(time));
  }

  scheduleReview(traceId: string): SpacedRepetition | null {
    const existing = this._spacedRepetition.get(traceId);
    if (!existing) {
      const sr: SpacedRepetition = {
        id: `sr-${(++this._counter).toString(36)}`,
        traceId,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReview: Date.now() + 24 * 60 * 60 * 1000,
        lastQuality: 0,
      };
      this._spacedRepetition.set(traceId, sr);
      this._recordHistory(`scheduleReview:${traceId}:initial`);
      return sr;
    }
    this._recordHistory(`scheduleReview:${traceId}`);
    return existing;
  }

  rehearse(traceId: string, quality: number): SpacedRepetition | null {
    const sr = this._spacedRepetition.get(traceId);
    const decay = this._decays.get(traceId);

    if (!sr) {
      this.scheduleReview(traceId);
      return this._spacedRepetition.get(traceId) || null;
    }

    sr.lastQuality = quality;

    if (quality < 3) {
      sr.repetitions = 0;
      sr.interval = 1;
    } else {
      if (sr.repetitions === 0) {
        sr.interval = 1;
      } else if (sr.repetitions === 1) {
        sr.interval = 6;
      } else {
        sr.interval = sr.interval * sr.easeFactor;
      }
      sr.repetitions++;
    }

    sr.easeFactor = Math.max(1.3, sr.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    sr.nextReview = Date.now() + sr.interval * 24 * 60 * 60 * 1000;

    if (decay) {
      decay.currentStrength = Math.min(1, decay.currentStrength + quality * 0.15);
      decay.lastReview = Date.now();
    }

    this._updateTotalRetention();
    this._recordHistory(`rehearse:${traceId}:q${quality}`);
    return sr;
  }

  superMemo2(traceId: string, quality: number): SpacedRepetition | null {
    return this.rehearse(traceId, quality);
  }

  memoryConsolidation(traceId: string): MemoryDecay | null {
    const decay = this._decays.get(traceId);
    if (!decay) return null;

    decay.decayRate *= 0.8;
    decay.halfLife *= 1.3;
    decay.currentStrength = Math.min(1, decay.currentStrength + 0.1);

    this._updateTotalRetention();
    this._recordHistory(`memoryConsolidation:${traceId}`);
    return decay;
  }

  proactiveInterference(oldMem: string, newMem: string): number {
    const oldDecay = this._decays.get(oldMem);
    const newDecay = this._decays.get(newMem);

    if (!oldDecay || !newDecay) return 0;

    const interference = oldDecay.currentStrength * 0.15;
    newDecay.currentStrength = Math.max(0, newDecay.currentStrength - interference);

    this._updateTotalRetention();
    this._recordHistory(`proactiveInterference:${oldMem}->${newMem}`);
    return interference;
  }

  retroactiveInterference(newMem: string, oldMem: string): number {
    const oldDecay = this._decays.get(oldMem);
    const newDecay = this._decays.get(newMem);

    if (!oldDecay || !newDecay) return 0;

    const interference = newDecay.currentStrength * 0.12;
    oldDecay.currentStrength = Math.max(0, oldDecay.currentStrength - interference);

    this._updateTotalRetention();
    this._recordHistory(`retroactiveInterference:${newMem}->${oldMem}`);
    return interference;
  }

  getRetentionRate(): number {
    return this._totalRetention;
  }

  optimalReviewSchedule(traceId: string): number[] {
    const sr = this._spacedRepetition.get(traceId);
    if (!sr) {
      return [1, 6, 14, 30, 60];
    }

    const schedule: number[] = [];
    let interval = sr.interval;
    let ease = sr.easeFactor;

    for (let i = 0; i < 5; i++) {
      schedule.push(Math.round(interval));
      interval *= ease;
    }

    return schedule;
  }

  memoryStrengthPrediction(traceId: string, days: number): number {
    const decay = this._decays.get(traceId);
    if (!decay) return 0;

    return this.ebbinghausCurve(decay.currentStrength, days * 24);
  }

  weakestMemories(n: number = 5): Array<{ traceId: string; strength: number }> {
    return Array.from(this._decays.values())
      .sort((a, b) => a.currentStrength - b.currentStrength)
      .slice(0, n)
      .map(d => ({ traceId: d.traceId, strength: d.currentStrength }));
  }

  strongestMemories(n: number = 5): Array<{ traceId: string; strength: number }> {
    return Array.from(this._decays.values())
      .sort((a, b) => b.currentStrength - a.currentStrength)
      .slice(0, n)
      .map(d => ({ traceId: d.traceId, strength: d.currentStrength }));
  }

  dueForReview(): string[] {
    const now = Date.now();
    const due: string[] = [];

    for (const sr of this._spacedRepetition.values()) {
      if (sr.nextReview <= now) {
        due.push(sr.traceId);
      }
    }

    return due;
  }

  reviewLoad(days: number = 7): {
    totalDue: number;
    dailyLoad: number[];
    peakDay: number;
  } {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const dailyLoad = Array(days).fill(0);

    for (const sr of this._spacedRepetition.values()) {
      const daysUntil = Math.ceil((sr.nextReview - now) / dayMs);
      if (daysUntil >= 0 && daysUntil < days) {
        dailyLoad[daysUntil]++;
      }
    }

    let peakDay = 0;
    let peakCount = 0;
    for (let i = 0; i < days; i++) {
      if (dailyLoad[i] > peakCount) {
        peakCount = dailyLoad[i];
        peakDay = i;
      }
    }

    return {
      totalDue: dailyLoad.reduce((a, b) => a + b, 0),
      dailyLoad,
      peakDay,
    };
  }

  memoryConsolidationSleep(traceId: string): MemoryDecay | null {
    const decay = this._decays.get(traceId);
    if (!decay) return null;

    decay.halfLife *= 1.5;
    decay.decayRate *= 0.7;
    decay.currentStrength = Math.min(1, decay.currentStrength + 0.1);

    this._updateTotalRetention();
    this._recordHistory(`memoryConsolidationSleep:${traceId}`);
    return decay;
  }

  relearningSavings(traceId: string): number {
    const decay = this._decays.get(traceId);
    if (!decay) return 0;

    const initialLearningEffort = 1;
    const currentStrength = decay.currentStrength;
    const relearningEffort = 1 - currentStrength;

    return currentStrength > 0 ? (initialLearningEffort - relearningEffort) / initialLearningEffort : 0;
  }

  toPacket(): DataPacket {
    return {
      id: `forgetting-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        decays: Array.from(this._decays.values()),
        curves: Object.fromEntries(this._curves),
        spacedRepetition: Array.from(this._spacedRepetition.values()),
        totalRetention: this._totalRetention,
        totalDecays: this._decays.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['memory_science', 'ForgettingCurve'],
        priority: Math.max(1, Math.floor(this._totalRetention * 10)),
        phase: 'decaying',
      },
    };
  }

  reset(): void {
    this._decays.clear();
    this._curves.clear();
    this._spacedRepetition.clear();
    this._totalRetention = 0.7;
    this._history = [];
    this._counter = 0;
  }

  get decayCount(): number {
    return this._decays.size;
  }

  get totalRetention(): number {
    return this._totalRetention;
  }

  get history(): string[] {
    return [...this._history];
  }

  addTrace(traceId: string, initialStrength: number = 1.0): MemoryDecay {
    const decay: MemoryDecay = {
      id: `decay-${(++this._counter).toString(36)}`,
      traceId,
      initialStrength,
      currentStrength: initialStrength,
      decayRate: 0.05,
      halfLife: 24,
      lastReview: Date.now(),
    };
    this._decays.set(traceId, decay);
    this._curves.set(traceId, []);
    this._updateTotalRetention();
    return decay;
  }

  private _addForgettingPoint(traceId: string, hours: number, retention: number): void {
    const id = `fp-${(++this._counter).toString(36)}`;
    const point: ForgettingPoint = {
      id,
      traceId,
      hoursElapsed: hours,
      retentionRate: retention,
      measuredAt: Date.now(),
    };

    if (!this._curves.has(traceId)) {
      this._curves.set(traceId, []);
    }
    this._curves.get(traceId)!.push(point);
  }

  private _updateTotalRetention(): void {
    if (this._decays.size === 0) {
      this._totalRetention = 0.7;
      return;
    }
    const total = Array.from(this._decays.values()).reduce((s, d) => s + d.currentStrength, 0);
    this._totalRetention = total / this._decays.size;
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
