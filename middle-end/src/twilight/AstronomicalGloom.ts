/**
 * 天文薄暮模块：太阳位于地平线下12-18度，最暗的黄昏，接近全黑。
 * 用于刻画系统在接近完全黑暗前最后的可观测阶段。
 */

export interface GloomObservation {
  timestamp: number;
  skyBrightness: number;
  starVisibility: number;
  detectable: boolean;
}

export type GloomLevel = {
  level: 'deepening' | 'approaching-dark' | 'near-total';
  remainingLight: number;
};

export interface AstronomicalGloomConfig {
  initialBrightness: number;
  finalBrightness: number;
  detectionThreshold: number;
}

export class AstronomicalGloom {
  private _config: AstronomicalGloomConfig;
  private _observations: GloomObservation[] = [];
  private _progress: number = 0;
  private _level: GloomLevel | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: AstronomicalGloomConfig) {
    this._config = config;
  }

  get observationCount(): number {
    return this._observations.length;
  }

  get progress(): number {
    return this._progress;
  }

  observe(deltaProgress: number): GloomObservation {
    this._progress = Math.min(1, this._progress + deltaProgress);
    const skyBrightness =
      this._config.initialBrightness +
      (this._config.finalBrightness - this._config.initialBrightness) * this._progress;
    const starVisibility = Math.min(1, this._progress * 1.5);
    const detectable = skyBrightness > this._config.detectionThreshold;
    const observation: GloomObservation = {
      timestamp: Date.now(),
      skyBrightness,
      starVisibility,
      detectable,
    };
    this._observations.push(observation);
    if (this._observations.length > 50) this._observations.shift();
    return observation;
  }

  computeLevel(): GloomLevel {
    const remainingLight = 1 - this._progress;
    const level: GloomLevel['level'] =
      this._progress < 0.33
        ? 'deepening'
        : this._progress < 0.66
        ? 'approaching-dark'
        : 'near-total';
    this._level = { level, remainingLight };
    return this._level;
  }

  isNearTotal(): boolean {
    return this.computeLevel().level === 'near-total';
  }

  currentBrightness(): number {
    if (this._observations.length === 0) return this._config.initialBrightness;
    return this._observations[this._observations.length - 1].skyBrightness;
  }

  averageStarVisibility(): number {
    if (this._observations.length === 0) return 0;
    return this._observations.reduce((acc, o) => acc + o.starVisibility, 0) / this._observations.length;
  }

  detectableCount(): number {
    return this._observations.filter((o) => o.detectable).length;
  }

  reset(): void {
    this._observations = [];
    this._progress = 0;
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      observationCount: this._observations.length,
      progress: this._progress,
      level: this._level,
      state: this._state,
    };
  }
}
