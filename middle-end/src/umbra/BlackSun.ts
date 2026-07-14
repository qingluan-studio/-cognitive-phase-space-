/**
 * 黑太阳模块：发出暗光的悖论天体，反向于常规发光体。
 * 用于刻画系统中以吸收/反向方式产生信号的悖论实体。
 */

export interface DarkEmission {
  id: number;
  negativeLuminance: number;
  wavelength: number;
  absorbed: number;
}

export type DarkSpectrum = {
  emissions: number;
  totalDarkness: number;
  peakWavelength: number;
};

export interface BlackSunConfig {
  coreAbsorption: number;
  maxEmissions: number;
  spectralWidth: number;
}

export class BlackSun {
  private _config: BlackSunConfig;
  private _emissions: DarkEmission[] = [];
  private _nextId: number = 0;
  private _spectrum: DarkSpectrum | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: BlackSunConfig) {
    this._config = config;
  }

  get emissionCount(): number {
    return this._emissions.length;
  }

  get coreAbsorption(): number {
    return this._config.coreAbsorption;
  }

  emitDark(wavelength: number): DarkEmission {
    const negativeLuminance =
      -this._config.coreAbsorption * Math.exp(-Math.pow(wavelength - 500, 2) / (2 * this._config.spectralWidth ** 2));
    const emission: DarkEmission = {
      id: this._nextId++,
      negativeLuminance,
      wavelength,
      absorbed: -negativeLuminance,
    };
    this._emissions.push(emission);
    if (this._emissions.length > this._config.maxEmissions) {
      this._emissions.shift();
    }
    return emission;
  }

  computeSpectrum(): DarkSpectrum {
    if (this._emissions.length === 0) {
      this._spectrum = { emissions: 0, totalDarkness: 0, peakWavelength: 0 };
      return this._spectrum;
    }
    const totalDarkness = this._emissions.reduce((acc, e) => acc + e.absorbed, 0);
    const peak = this._emissions.reduce((best, e) => (e.absorbed > best.absorbed ? e : best));
    this._spectrum = {
      emissions: this._emissions.length,
      totalDarkness,
      peakWavelength: peak.wavelength,
    };
    return this._spectrum;
  }

  isAbsorbing(): boolean {
    return this.computeSpectrum().totalDarkness > 0;
  }

  strongestEmission(): DarkEmission | null {
    if (this._emissions.length === 0) return null;
    return this._emissions.reduce((best, e) => (e.absorbed > best.absorbed ? e : best));
  }

  totalAbsorbed(): number {
    return this._emissions.reduce((acc, e) => acc + e.absorbed, 0);
  }

  tuneCore(absorption: number): void {
    this._config.coreAbsorption = absorption;
    this._state.coreTuned = absorption;
  }

  filterByWavelength(min: number, max: number): DarkEmission[] {
    return this._emissions.filter((e) => e.wavelength >= min && e.wavelength <= max);
  }

  reset(): void {
    this._emissions = [];
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      emissionCount: this._emissions.length,
      spectrum: this._spectrum,
      state: this._state,
    };
  }
}
