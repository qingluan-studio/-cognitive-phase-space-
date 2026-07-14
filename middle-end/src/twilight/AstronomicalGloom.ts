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
  private _extinctionCoefficient: number = 0.12;
  private _rayleighPhase: number = 0;

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
    const airMass = 1 / Math.cos((this._progress * Math.PI) / 2.1 + 0.1);
    const molecularScatter = Math.exp(-this._extinctionCoefficient * airMass);
    const aerosolScatter = Math.exp(-0.04 * Math.pow(airMass, 0.8));
    const skyBrightness = this._config.finalBrightness +
      (this._config.initialBrightness - this._config.finalBrightness) * molecularScatter * aerosolScatter;
    const starVisibility = Math.min(1, this._progress * 1.5 * (1 + 0.2 * Math.sin(this._rayleighPhase)));
    const detectable = skyBrightness > this._config.detectionThreshold;
    const observation: GloomObservation = {
      timestamp: Date.now(),
      skyBrightness,
      starVisibility,
      detectable,
    };
    this._observations.push(observation);
    if (this._observations.length > 50) this._observations.shift();
    this._rayleighPhase += 0.1;
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
    this._rayleighPhase = 0;
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

  setExtinctionCoefficient(k: number): void {
    this._extinctionCoefficient = Math.max(0.01, Math.min(1, k));
  }

  computeMagnitudeLimit(): number {
    const avgVis = this.averageStarVisibility();
    return 6 + 1.5 * Math.log10(avgVis + 0.001);
  }

  atmosphericQualityIndex(): number {
    const brightnessValues = this._observations.map(o => o.skyBrightness);
    if (brightnessValues.length < 2) return 0;
    const mean = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
    const variance = brightnessValues.reduce((a, b) => a + (b - mean) ** 2, 0) / brightnessValues.length;
    return mean > 0 ? variance / mean : 0;
  }
}
