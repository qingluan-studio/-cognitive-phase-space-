export interface PolarExtremes {
  id: string;
  positive: { value: number; payload: Record<string, unknown> };
  negative: { value: number; payload: Record<string, unknown> };
  threshold: number;
}

export interface SynthesizedUnity {
  fromId: string;
  mergedPayload: Record<string, unknown>;
  synthesisLevel: number;
  resolved: boolean;
}

interface TensionField {
  magnitude: number;
  phase: number;
  harmonics: number[];
  coherence: number;
}

export class EnantiodromiaMerger {
  private _extremes: Map<string, PolarExtremes> = new Map();
  private _syntheses: SynthesizedUnity[] = [];
  private _defaultThreshold = 0.9;
  private _autoTrigger = true;
  private _history: Array<{ id: string; tension: number; timestamp: number }> = [];
  private _maxHistory = 64;

  register(extremes: PolarExtremes): void {
    this._extremes.set(extremes.id, extremes);
    this._recordHistory(extremes.id);
    if (this._autoTrigger) this.tryMerge(extremes.id);
  }

  setThreshold(id: string, threshold: number): void {
    const ex = this._extremes.get(id);
    if (ex) ex.threshold = Math.max(0, Math.min(1, threshold));
  }

  setAutoTrigger(enabled: boolean): void {
    this._autoTrigger = enabled;
  }

  tryMerge(id: string): SynthesizedUnity | undefined {
    const ex = this._extremes.get(id);
    if (!ex) return undefined;

    const field = this._computeTensionField(ex);
    if (field.magnitude < ex.threshold) return undefined;

    const mergedPayload = this._synthesize(ex, field);
    const synthesisLevel = this._computeSynthesisLevel(field);
    const unity: SynthesizedUnity = {
      fromId: id,
      mergedPayload,
      synthesisLevel,
      resolved: true,
    };
    this._syntheses.push(unity);
    return unity;
  }

  private _computeTensionField(ex: PolarExtremes): TensionField {
    const posNorm = Math.tanh(ex.positive.value);
    const negNorm = Math.tanh(ex.negative.value);
    const magnitude = Math.sqrt(posNorm * posNorm + negNorm * negNorm);
    const phase = Math.atan2(negNorm, posNorm);
    
    const harmonics: number[] = [];
    for (let n = 1; n <= 4; n++) {
      harmonics.push(Math.sin(n * phase) / n);
    }
    
    const history = this._history.filter(h => h.id === ex.id).map(h => h.tension);
    const coherence = history.length < 2 ? 1 : 
      1 - this._stdDev(history) / (Math.max(...history, 0.001));
    
    return { magnitude, phase, harmonics, coherence: Math.max(0, Math.min(1, coherence)) };
  }

  private _synthesize(ex: PolarExtremes, field: TensionField): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    const posKeys = Object.keys(ex.positive.payload);
    const negKeys = Object.keys(ex.negative.payload);
    const allKeys = new Set([...posKeys, ...negKeys]);

    const mix = (field.magnitude - 0.5) * 2;
    const phaseShift = field.phase / Math.PI;

    for (const key of allKeys) {
      const posVal = ex.positive.payload[key];
      const negVal = ex.negative.payload[key];
      merged[key] = this._interpolateValue(posVal, negVal, mix, phaseShift, key);
    }

    merged._synthesis = true;
    merged._tension = field.magnitude;
    merged._phase = field.phase;
    merged._coherence = field.coherence;
    merged._harmonicSignature = field.harmonics;
    return merged;
  }

  private _interpolateValue(
    pos: unknown,
    neg: unknown,
    mix: number,
    phase: number,
    key: string
  ): unknown {
    if (typeof pos === 'number' && typeof neg === 'number') {
      const harmonicInfluence = Math.sin(phase * Math.PI * 2 + key.length) * 0.1;
      const weightedMix = mix + harmonicInfluence;
      const t = (Math.tanh(weightedMix * 3) + 1) / 2;
      return pos * (1 - t) + neg * t;
    }
    if (typeof pos === 'string' && typeof neg === 'string') {
      const splitPos = pos.split('');
      const splitNeg = neg.split('');
      const maxLen = Math.max(splitPos.length, splitNeg.length);
      const result: string[] = [];
      for (let i = 0; i < maxLen; i++) {
        const t = Math.sin((i / maxLen) * Math.PI + phase) * 0.5 + 0.5;
        if (i < splitPos.length && i < splitNeg.length) {
          result.push(t < 0.5 ? splitPos[i] : splitNeg[i]);
        } else if (i < splitPos.length) {
          result.push(splitPos[i]);
        } else {
          result.push(splitNeg[i]);
        }
      }
      return result.join('');
    }
    if (pos !== undefined && neg !== undefined) {
      return { positive: pos, negative: neg, phase };
    }
    return pos ?? neg;
  }

  private _computeSynthesisLevel(field: TensionField): number {
    const harmonicEnergy = field.harmonics.reduce((s, h) => s + h * h, 0);
    const baseLevel = Math.min(1, field.magnitude);
    const coherenceBoost = field.coherence * 0.2;
    const harmonicBoost = Math.min(0.1, harmonicEnergy * 0.5);
    return Math.min(1, baseLevel + coherenceBoost + harmonicBoost);
  }

  private _recordHistory(id: string): void {
    const ex = this._extremes.get(id);
    if (!ex) return;
    const tension = Math.abs(ex.positive.value - ex.negative.value);
    this._history.push({ id, tension, timestamp: Date.now() });
    if (this._history.length > this._maxHistory) {
      this._history = this._history.slice(-this._maxHistory);
    }
  }

  private _stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  mergeAll(): SynthesizedUnity[] {
    const results: SynthesizedUnity[] = [];
    for (const id of this._extremes.keys()) {
      const unity = this.tryMerge(id);
      if (unity) results.push(unity);
    }
    return results;
  }

  pendingExtremes(): PolarExtremes[] {
    return Array.from(this._extremes.values()).filter(
      e => !this._syntheses.some(s => s.fromId === e.id)
    );
  }

  tensionLevel(id: string): number {
    const ex = this._extremes.get(id);
    if (!ex) return 0;
    return Math.abs(ex.positive.value - ex.negative.value);
  }

  averageSynthesisLevel(): number {
    if (this._syntheses.length === 0) return 0;
    return this._syntheses.reduce((s, u) => s + u.synthesisLevel, 0) / this._syntheses.length;
  }

  tensionTrend(id: string): 'rising' | 'falling' | 'stable' {
    const history = this._history.filter(h => h.id === id);
    if (history.length < 4) return 'stable';
    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));
    const firstAvg = firstHalf.reduce((s, h) => s + h.tension, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, h) => s + h.tension, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    const threshold = Math.abs(firstAvg) * 0.05;
    if (diff > threshold) return 'rising';
    if (diff < -threshold) return 'falling';
    return 'stable';
  }

  reset(): void {
    this._extremes.clear();
    this._syntheses = [];
    this._history = [];
  }

  get extremesCount(): number {
    return this._extremes.size;
  }

  get synthesisCount(): number {
    return this._syntheses.length;
  }

  get defaultThreshold(): number {
    return this._defaultThreshold;
  }

  get historySize(): number {
    return this._history.length;
  }
}
