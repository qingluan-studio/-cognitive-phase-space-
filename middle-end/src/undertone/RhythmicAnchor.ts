export interface AnchorBeat {
  index: number;
  time: number;
  strength: number;
  locked: boolean;
}

export type AnchorSync = {
  bpm: number;
  drift: number;
  locked: boolean;
};

export interface RhythmAnchorConfig {
  bpm: number;
  tolerance: number;
  maxBeats: number;
}

export class RhythmicAnchor {
  private _config: RhythmAnchorConfig;
  private _beats: AnchorBeat[] = [];
  private _sync: AnchorSync | null = null;
  private _currentIndex: number = 0;
  private _meta: Record<string, unknown> = {};
  private _phaseError: number[] = [];
  private _loopFilterCoeff: number = 0.7;

  constructor(config: RhythmAnchorConfig) {
    this._config = config;
  }

  get beatCount(): number {
    return this._beats.length;
  }

  get bpm(): number {
    return this._config.bpm;
  }

  get currentBeat(): number {
    return this._currentIndex;
  }

  tick(time: number, strength: number): AnchorBeat {
    const expectedInterval = 60000 / this._config.bpm;
    const lastBeat = this._beats[this._beats.length - 1];
    const interval = lastBeat ? time - lastBeat.time : expectedInterval;
    const phaseError = interval - expectedInterval;
    this._phaseError.push(phaseError);
    if (this._phaseError.length > 20) this._phaseError.shift();
    const filteredError = this._phaseError.reduce((a, e) => a + e * this._loopFilterCoeff, 0) /
      this._phaseError.reduce((a) => a + this._loopFilterCoeff, 0);
    const locked = Math.abs(filteredError) < this._config.tolerance * expectedInterval;
    const beat: AnchorBeat = {
      index: this._currentIndex++,
      time,
      strength,
      locked,
    };
    this._beats.push(beat);
    if (this._beats.length > this._config.maxBeats) {
      this._beats.shift();
    }
    return beat;
  }

  computeSync(): AnchorSync {
    if (this._beats.length < 2) {
      this._sync = { bpm: this._config.bpm, drift: 0, locked: true };
      return this._sync;
    }
    const intervals: number[] = [];
    for (let i = 1; i < this._beats.length; i++) {
      intervals.push(this._beats[i].time - this._beats[i - 1].time);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) / intervals.length;
    const measuredBpm = 60000 / avgInterval;
    const drift = Math.abs(measuredBpm - this._config.bpm);
    this._sync = { bpm: measuredBpm, drift, locked: drift < this._config.tolerance && variance < 100 };
    return this._sync;
  }

  isLocked(): boolean {
    return this.computeSync().locked;
  }

  reAnchor(bpm: number): void {
    this._config.bpm = bpm;
    this._phaseError = [];
    this._meta.reanchoredAt = { bpm, time: Date.now() };
  }

  strongestBeat(): AnchorBeat | null {
    if (this._beats.length === 0) return null;
    return this._beats.reduce((best, b) => (b.strength > best.strength ? b : best));
  }

  lockedRatio(): number {
    if (this._beats.length === 0) return 0;
    return this._beats.filter((b) => b.locked).length / this._beats.length;
  }

  reset(): void {
    this._beats = [];
    this._currentIndex = 0;
    this._phaseError = [];
    this._meta.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      beatCount: this._beats.length,
      bpm: this._config.bpm,
      sync: this._sync,
      meta: this._meta,
    };
  }

  computeAutocorrelation(lag: number): number {
    if (this._beats.length < lag + 1) return 0;
    const strengths = this._beats.map(b => b.strength);
    const mean = strengths.reduce((a, b) => a + b, 0) / strengths.length;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < strengths.length - lag; i++) {
      numerator += (strengths[i] - mean) * (strengths[i + lag] - mean);
    }
    for (let i = 0; i < strengths.length; i++) {
      denominator += (strengths[i] - mean) ** 2;
    }
    return denominator > 0 ? numerator / denominator : 0;
  }

  computeTempoStability(): number {
    if (this._beats.length < 4) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < this._beats.length; i++) {
      intervals.push(this._beats[i].time - this._beats[i - 1].time);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
    return mean > 0 ? 1 - Math.min(1, Math.sqrt(variance) / mean) : 0;
  }

  setLoopFilterCoeff(coeff: number): void {
    this._loopFilterCoeff = Math.max(0.1, Math.min(0.99, coeff));
  }
}
