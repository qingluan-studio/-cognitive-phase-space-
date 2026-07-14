export type RaptureLevel = 'minor' | 'moderate' | 'major' | 'absolute';

export interface RaptureBurst {
  id: number;
  level: RaptureLevel;
  coordinates: { x: number; y: number };
  intensity: number;
  triggeredAt: number;
}

export interface TriggerThreshold {
  minor: number;
  moderate: number;
  major: number;
  absolute: number;
}

export class RaptureTrigger {
  private _bursts: RaptureBurst[] = [];
  private _nextId: number = 0;
  private _thresholds: TriggerThreshold;
  private _cooldownMs: number = 500;
  private _lastTriggered: number = 0;
  private _state: Record<string, unknown> = {};
  private _falsePositiveRate: number = 0.05;
  private _falseNegativeRate: number = 0.02;
  private _beliefNetwork: Map<string, number> = new Map();
  private _rocCurve: { tpr: number; fpr: number }[] = [];

  constructor(thresholds: TriggerThreshold) {
    this._thresholds = { ...thresholds };
    this._state.initializedAt = Date.now();
  }

  get burstCount(): number {
    return this._bursts.length;
  }

  get lastTriggered(): number {
    return this._lastTriggered;
  }

  get falsePositiveRate(): number {
    return this._falsePositiveRate;
  }

  evaluate(intensity: number, coordinates: { x: number; y: number }): RaptureBurst | null {
    const now = Date.now();
    if (now - this._lastTriggered < this._cooldownMs) return null;
    const priorMajor = this._beliefNetwork.get('major') ?? 0.1;
    const likelihood = intensity / this._thresholds.absolute;
    const posterior = (likelihood * priorMajor) / (likelihood * priorMajor + (1 - likelihood) * (1 - priorMajor));
    this._beliefNetwork.set('major', posterior);
    if (Math.random() < this._falseNegativeRate && intensity >= this._thresholds.minor) {
      return null;
    }
    if (Math.random() < this._falsePositiveRate && intensity < this._thresholds.minor) {
      const burst = this._createBurst('minor', coordinates, intensity);
      this._bursts.push(burst);
      this._lastTriggered = now;
      return burst;
    }
    let level: RaptureLevel | null = null;
    if (intensity >= this._thresholds.absolute) level = 'absolute';
    else if (intensity >= this._thresholds.major) level = 'major';
    else if (intensity >= this._thresholds.moderate) level = 'moderate';
    else if (intensity >= this._thresholds.minor) level = 'minor';
    if (!level) return null;
    const burst = this._createBurst(level, coordinates, intensity);
    this._bursts.push(burst);
    this._lastTriggered = now;
    this._updateROC(intensity);
    return burst;
  }

  private _createBurst(level: RaptureLevel, coordinates: { x: number; y: number }, intensity: number): RaptureBurst {
    return {
      id: this._nextId++,
      level,
      coordinates: { ...coordinates },
      intensity,
      triggeredAt: Date.now(),
    };
  }

  private _updateROC(intensity: number): void {
    const tpr = Math.min(1, intensity / this._thresholds.major);
    const fpr = this._falsePositiveRate * (1 + intensity * 0.01);
    this._rocCurve.push({ tpr, fpr });
    if (this._rocCurve.length > 50) this._rocCurve.shift();
  }

  getBurstsForLevel(level: RaptureLevel): RaptureBurst[] {
    return this._bursts.filter(b => b.level === level);
  }

  getRecentBursts(limit: number = 50): RaptureBurst[] {
    return this._bursts.slice(-limit);
  }

  strongestBurst(): RaptureBurst | null {
    if (this._bursts.length === 0) return null;
    return this._bursts.reduce((best, b) => (b.intensity > best.intensity ? b : best));
  }

  averageIntensity(): number {
    if (this._bursts.length === 0) return 0;
    return this._bursts.reduce((acc, b) => acc + b.intensity, 0) / this._bursts.length;
  }

  totalTriggered(): number {
    return this._bursts.length;
  }

  setThresholds(thresholds: Partial<TriggerThreshold>): void {
    this._thresholds = { ...this._thresholds, ...thresholds };
  }

  setCooldown(ms: number): void {
    this._cooldownMs = Math.max(0, ms);
  }

  setDetectionRates(fpr: number, fnr: number): void {
    this._falsePositiveRate = Math.max(0, Math.min(1, fpr));
    this._falseNegativeRate = Math.max(0, Math.min(1, fnr));
  }

  computeAUROC(): number {
    if (this._rocCurve.length < 2) return 0;
    let area = 0;
    for (let i = 1; i < this._rocCurve.length; i++) {
      const dx = this._rocCurve[i].fpr - this._rocCurve[i - 1].fpr;
      const avgY = (this._rocCurve[i].tpr + this._rocCurve[i - 1].tpr) / 2;
      area += dx * avgY;
    }
    return Math.abs(area);
  }

  getBurstMap(): Map<string, RaptureBurst[]> {
    const map = new Map<string, RaptureBurst[]>();
    for (const b of this._bursts) {
      const list = map.get(b.level) ?? [];
      list.push(b);
      map.set(b.level, list);
    }
    return map;
  }

  clearHistory(): void {
    this._bursts = [];
    this._nextId = 0;
    this._rocCurve = [];
    this._beliefNetwork.clear();
  }

  triggerReport(): Record<string, unknown> {
    return {
      burstCount: this._bursts.length,
      thresholds: this._thresholds,
      lastTriggered: this._lastTriggered,
      cooldownMs: this._cooldownMs,
      state: this._state,
      falsePositiveRate: this._falsePositiveRate.toFixed(4),
      falseNegativeRate: this._falseNegativeRate.toFixed(4),
      auroc: this.computeAUROC().toFixed(4),
      beliefNetwork: Object.fromEntries(this._beliefNetwork),
    };
  }
}
