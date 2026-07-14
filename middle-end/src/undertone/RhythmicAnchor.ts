/**
 * 节奏锚模块：在最低频段提供稳定节拍，作为整体节奏的基准支撑。
 * 用于锁定系统的时间基准并同步上层节律。
 */

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
    const locked = Math.abs(strength - 1) < this._config.tolerance;
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
    const measuredBpm = 60000 / avgInterval;
    const drift = Math.abs(measuredBpm - this._config.bpm);
    this._sync = { bpm: measuredBpm, drift, locked: drift < this._config.tolerance };
    return this._sync;
  }

  isLocked(): boolean {
    return this.computeSync().locked;
  }

  reAnchor(bpm: number): void {
    this._config.bpm = bpm;
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
}
