/**
 * 生物发光模块：模块自身发出可见信息光，无需外部光源。
 * 用于刻画系统主动产生可感知信号的能力。
 */

export interface BioluminescentEmission {
  wavelength: number;
  intensity: number;
  source: string;
  timestamp: number;
}

export type EmissionSpectrum = {
  emissions: number;
  peakWavelength: number;
  totalIntensity: number;
};

export interface BioluminescenceConfig {
  substrateLevel: number;
  enzymeEfficiency: number;
  maxEmissions: number;
}

export class Bioluminescence {
  private _config: BioluminescenceConfig;
  private _emissions: BioluminescentEmission[] = [];
  private _spectrum: EmissionSpectrum | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: BioluminescenceConfig) {
    this._config = config;
  }

  get emissionCount(): number {
    return this._emissions.length;
  }

  get substrateLevel(): number {
    return this._config.substrateLevel;
  }

  glow(source: string, wavelength: number): BioluminescentEmission | null {
    if (this._config.substrateLevel <= 0) return null;
    const intensity =
      this._config.substrateLevel * this._config.enzymeEfficiency * (1 / (wavelength / 500));
    const emission: BioluminescentEmission = {
      wavelength,
      intensity,
      source,
      timestamp: Date.now(),
    };
    this._emissions.push(emission);
    if (this._emissions.length > this._config.maxEmissions) {
      this._emissions.shift();
    }
    this._config.substrateLevel *= 0.95;
    this._state.lastGlow = source;
    return emission;
  }

  computeSpectrum(): EmissionSpectrum {
    if (this._emissions.length === 0) {
      this._spectrum = { emissions: 0, peakWavelength: 0, totalIntensity: 0 };
      return this._spectrum;
    }
    const totalIntensity = this._emissions.reduce((acc, e) => acc + e.intensity, 0);
    const peak = this._emissions.reduce((best, e) =>
      e.intensity > best.intensity ? e : best
    );
    this._spectrum = {
      emissions: this._emissions.length,
      peakWavelength: peak.wavelength,
      totalIntensity,
    };
    return this._spectrum;
  }

  replenishSubstrate(amount: number): void {
    this._config.substrateLevel += amount;
    this._state.replenishedAt = Date.now();
  }

  tuneEnzyme(efficiency: number): void {
    this._config.enzymeEfficiency = Math.max(0, Math.min(1, efficiency));
  }

  brightestEmission(): BioluminescentEmission | null {
    if (this._emissions.length === 0) return null;
    return this._emissions.reduce((best, e) => (e.intensity > best.intensity ? e : best));
  }

  isIlluminated(): boolean {
    return this.computeSpectrum().totalIntensity > 0.5;
  }

  filterBySource(source: string): BioluminescentEmission[] {
    return this._emissions.filter((e) => e.source === source);
  }

  report(): Record<string, unknown> {
    return {
      emissionCount: this._emissions.length,
      substrateLevel: this._config.substrateLevel,
      spectrum: this._spectrum,
      state: this._state,
    };
  }
}
