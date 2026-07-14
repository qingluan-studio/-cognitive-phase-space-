/**
 * 黄金时刻模块：日出或日落前后短暂而珍贵的高质量状态。
 * 用于刻画系统中转瞬即逝的最佳运作区间。
 */

export interface GoldenMoment {
  timestamp: number;
  warmth: number;
  quality: number;
  remaining: number;
}

export type GoldenWindow = {
  duration: number;
  peakQuality: number;
  active: boolean;
};

export interface GoldenHourConfig {
  totalDuration: number;
  peakWarmth: number;
  qualityThreshold: number;
}

export class GoldenHour {
  private _config: GoldenHourConfig;
  private _moments: GoldenMoment[] = [];
  private _elapsed: number = 0;
  private _window: GoldenWindow | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: GoldenHourConfig) {
    this._config = config;
  }

  get momentCount(): number {
    return this._moments.length;
  }

  get elapsed(): number {
    return this._elapsed;
  }

  get remaining(): number {
    return Math.max(0, this._config.totalDuration - this._elapsed);
  }

  tick(dt: number): GoldenMoment {
    this._elapsed += dt;
    const progress = Math.min(1, this._elapsed / this._config.totalDuration);
    const bell = Math.sin(progress * Math.PI);
    const warmth = this._config.peakWarmth * bell;
    const quality = bell;
    const remaining = this.remaining;
    const moment: GoldenMoment = { timestamp: Date.now(), warmth, quality, remaining };
    this._moments.push(moment);
    if (this._moments.length > 100) this._moments.shift();
    return moment;
  }

  computeWindow(): GoldenWindow {
    const peakQuality =
      this._moments.length > 0
        ? Math.max(...this._moments.map((m) => m.quality))
        : 0;
    const active = this._elapsed < this._config.totalDuration && peakQuality > 0;
    this._window = {
      duration: this._config.totalDuration,
      peakQuality,
      active,
    };
    return this._window;
  }

  isActive(): boolean {
    return this.computeWindow().active;
  }

  isInPeak(): boolean {
    if (this._moments.length === 0) return false;
    const last = this._moments[this._moments.length - 1];
    return last.quality >= this._config.qualityThreshold;
  }

  currentQuality(): number {
    if (this._moments.length === 0) return 0;
    return this._moments[this._moments.length - 1].quality;
  }

  currentWarmth(): number {
    if (this._moments.length === 0) return 0;
    return this._moments[this._moments.length - 1].warmth;
  }

  averageQuality(): number {
    if (this._moments.length === 0) return 0;
    return this._moments.reduce((acc, m) => acc + m.quality, 0) / this._moments.length;
  }

  reset(): void {
    this._moments = [];
    this._elapsed = 0;
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      momentCount: this._moments.length,
      elapsed: this._elapsed,
      remaining: this.remaining,
      window: this._window,
      state: this._state,
    };
  }
}
