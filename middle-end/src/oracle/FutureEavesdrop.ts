export interface FutureSnapshot {
  targetTime: number;
  capturedAt: number;
  content: Record<string, unknown>;
  confidence: number;
  corrupted: boolean;
  kalmanGain: number;
}

export interface EavesdropAttempt {
  id: string;
  requestedTime: number;
  attemptedAt: number;
  success: boolean;
  corruptionLevel: number;
  channelCapacity: number;
}

export class FutureEavesdrop {
  private _snapshots: FutureSnapshot[] = [];
  private _attempts: EavesdropAttempt[] = [];
  private _cache: Map<number, Record<string, unknown>> = new Map();
  private _maxDriftMs = 5000;
  private _corruptionRisk = 0.15;
  private _kalmanState: Record<string, { estimate: number; error: number }> = {};
  private _processNoise = 0.01;
  private _measurementNoise = 0.1;

  prepopulateCache(time: number, content: Record<string, unknown>): void {
    this._cache.set(time, content);
    if (this._cache.size > 100) {
      const oldest = Math.min(...this._cache.keys());
      this._cache.delete(oldest);
    }
  }

  attemptEavesdrop(targetTime: number): EavesdropAttempt {
    const now = Date.now();
    const drift = targetTime - now;
    const success = drift > 0 && drift <= this._maxDriftMs && this._cache.has(targetTime);
    const corruptionLevel = success ? Math.random() * this._corruptionRisk : Math.random();
    const capacity = success ? this._shannonCapacity(1 - corruptionLevel, corruptionLevel) : 0;
    const attempt: EavesdropAttempt = {
      id: `eavesdrop-${now}-${Math.random().toString(36).slice(2, 6)}`,
      requestedTime: targetTime,
      attemptedAt: now,
      success,
      corruptionLevel,
      channelCapacity: capacity,
    };
    this._attempts.push(attempt);
    if (this._attempts.length > 200) this._attempts.shift();
    if (success) {
      const content = this._cache.get(targetTime)!;
      const filtered = this._kalmanFilter(content);
      const snapshot: FutureSnapshot = {
        targetTime,
        capturedAt: now,
        content: filtered,
        confidence: 1 - corruptionLevel,
        corrupted: corruptionLevel > 0.5,
        kalmanGain: this._computeKalmanGain(),
      };
      this._snapshots.push(snapshot);
      if (this._snapshots.length > 100) this._snapshots.shift();
    }
    return attempt;
  }

  readSnapshot(targetTime: number): FutureSnapshot | null {
    return this._snapshots.find((s) => s.targetTime === targetTime) ?? null;
  }

  private _decontaminate(content: Record<string, unknown>, level: number): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(content)) {
      if (Math.random() > level) cleaned[key] = value;
      else cleaned[key] = '[corrupted]';
    }
    return cleaned;
  }

  readCleanedSnapshot(targetTime: number): Record<string, unknown> | null {
    const snapshot = this.readSnapshot(targetTime);
    if (!snapshot) return null;
    return this._decontaminate(snapshot.content, snapshot.corruptionLevel);
  }

  predictFutureValue(key: string, steps: number = 1): number {
    const state = this._kalmanState[key];
    if (!state) return 0;
    let estimate = state.estimate;
    for (let i = 0; i < steps; i++) {
      estimate += this._processNoise * (Math.random() - 0.5);
    }
    return estimate;
  }

  computeMutualInformation(snapshotA: FutureSnapshot, snapshotB: FutureSnapshot): number {
    const keysA = Object.keys(snapshotA.content);
    const keysB = Object.keys(snapshotB.content);
    const shared = keysA.filter((k) => keysB.includes(k)).length;
    const total = new Set([...keysA, ...keysB]).size;
    if (total === 0) return 0;
    const pShared = shared / total;
    const pAOnly = (keysA.length - shared) / total;
    const pBOnly = (keysB.length - shared) / total;
    let mi = 0;
    if (pShared > 0) mi += pShared * Math.log2(pShared / ((keysA.length / total) * (keysB.length / total)));
    if (pAOnly > 0) mi += pAOnly * Math.log2(pAOnly / ((keysA.length / total) * (1 - keysB.length / total)));
    if (pBOnly > 0) mi += pBOnly * Math.log2(pBOnly / ((1 - keysA.length / total) * (keysB.length / total)));
    return mi;
  }

  setMaxDrift(ms: number): void {
    this._maxDriftMs = Math.max(100, ms);
  }

  increaseCorruptionRisk(delta: number): void {
    this._corruptionRisk = Math.max(0, Math.min(1, this._corruptionRisk + delta));
  }

  getSuccessfulEavesdrops(): FutureSnapshot[] {
    return [...this._snapshots];
  }

  getAttemptLog(limit: number = 50): EavesdropAttempt[] {
    return this._attempts.slice(-limit);
  }

  clearCache(): void {
    this._cache.clear();
  }

  get cacheSize(): number {
    return this._cache.size;
  }

  get snapshotCount(): number {
    return this._snapshots.length;
  }

  get averageChannelCapacity(): number {
    const successes = this._attempts.filter((a) => a.success);
    if (successes.length === 0) return 0;
    return successes.reduce((s, a) => s + a.channelCapacity, 0) / successes.length;
  }

  private _kalmanFilter(content: Record<string, unknown>): Record<string, unknown> {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(content)) {
      if (typeof value === 'number') {
        if (!this._kalmanState[key]) {
          this._kalmanState[key] = { estimate: value, error: 1 };
        }
        const state = this._kalmanState[key];
        const predictionError = state.error + this._processNoise;
        const gain = predictionError / (predictionError + this._measurementNoise);
        state.estimate = state.estimate + gain * (value - state.estimate);
        state.error = (1 - gain) * predictionError;
        filtered[key] = state.estimate;
      } else {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  private _computeKalmanGain(): number {
    const states = Object.values(this._kalmanState);
    if (states.length === 0) return 0;
    return states.reduce((s, st) => s + st.error, 0) / states.length;
  }

  private _shannonCapacity(signalProb: number, noiseProb: number): number {
    if (signalProb <= 0 || noiseProb <= 0) return 0;
    const hY = -(signalProb * Math.log2(signalProb) + noiseProb * Math.log2(noiseProb));
    const hYX = noiseProb;
    return Math.max(0, hY - hYX);
  }
}
