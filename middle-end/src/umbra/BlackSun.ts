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
  private _planckCache: Map<number, number> = new Map();
  private _hawkingTemperature: number = 0.001;

  constructor(config: BlackSunConfig) {
    this._config = config;
  }

  get emissionCount(): number {
    return this._emissions.length;
  }

  get coreAbsorption(): number {
    return this._config.coreAbsorption;
  }

  private _planckFunction(lambda: number, T: number): number {
    const h = 6.626e-34;
    const c = 3e8;
    const k = 1.381e-23;
    const exponent = (h * c) / (lambda * 1e-9 * k * T);
    if (exponent > 50) return 0;
    return (2 * h * c * c) / Math.pow(lambda * 1e-9, 5) / (Math.exp(exponent) - 1);
  }

  emitDark(wavelength: number): DarkEmission {
    const gaussian = -Math.exp(-Math.pow(wavelength - 500, 2) / (2 * this._config.spectralWidth ** 2));
    const planckFactor = this._planckFunction(wavelength, this._hawkingTemperature);
    const negativeLuminance = -this._config.coreAbsorption * gaussian - planckFactor * 1e40;
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
    this._planckCache.set(emission.id, planckFactor);
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
    this._planckCache.clear();
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      emissionCount: this._emissions.length,
      spectrum: this._spectrum,
      state: this._state,
    };
  }

  computeWienDisplacement(): number {
    const b = 2.898e6;
    return this._hawkingTemperature > 0 ? b / this._hawkingTemperature : 0;
  }

  setHawkingTemperature(T: number): void {
    this._hawkingTemperature = Math.max(1e-6, T);
  }

  computeSpectralEntropy(): number {
    const total = this.totalAbsorbed();
    if (total === 0) return 0;
    let entropy = 0;
    for (const e of this._emissions) {
      const p = e.absorbed / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}
