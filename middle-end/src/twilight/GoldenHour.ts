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
  private _spectralAbsorption: number = 0.35;
  private _chromaticTrajectory: number[] = [];

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
    const airMass = 1 / Math.cos((progress * Math.PI) / 3 + 0.2);
    const rayleighAtten = Math.exp(-this._spectralAbsorption * airMass);
    const mieEnhancement = 1 + 0.15 * Math.pow(Math.sin(progress * Math.PI), 2);
    const warmth = this._config.peakWarmth * bell * rayleighAtten * mieEnhancement;
    const quality = bell * rayleighAtten;
    const remaining = this.remaining;
    const moment: GoldenMoment = { timestamp: Date.now(), warmth, quality, remaining };
    this._moments.push(moment);
    if (this._moments.length > 100) this._moments.shift();
    this._chromaticTrajectory.push(warmth);
    if (this._chromaticTrajectory.length > 50) this._chromaticTrajectory.shift();
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
    this._chromaticTrajectory = [];
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

  computeColorTemperatureTrajectory(): number[] {
    return this._chromaticTrajectory.map(w => 6500 - w * 3000);
  }

  computeSpectralPurity(): number {
    if (this._moments.length < 2) return 0;
    const qualities = this._moments.map(m => m.quality);
    const mean = qualities.reduce((a, b) => a + b, 0) / qualities.length;
    const variance = qualities.reduce((a, b) => a + (b - mean) ** 2, 0) / qualities.length;
    return mean > 0 ? 1 - Math.sqrt(variance) / mean : 0;
  }

  setSpectralAbsorption(alpha: number): void {
    this._spectralAbsorption = Math.max(0.05, Math.min(1, alpha));
  }
}
