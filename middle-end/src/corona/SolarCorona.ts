export interface CoronaLayer {
  altitude: number;
  temperature: number;
  density: number;
  emissivity: number;
}

export type CoronaProfile = {
  layers: number;
  peakTemperature: number;
  totalEmissivity: number;
  thickness: number;
};

export interface SolarCoronaConfig {
  layerCount: number;
  baseTemperature: number;
  peakTemperature: number;
  thickness: number;
}

export class SolarCorona {
  private _config: SolarCoronaConfig;
  private _layers: CoronaLayer[] = [];
  private _profile: CoronaProfile | null = null;
  private _state: Record<string, unknown> = {};
  private _scaleHeight: number = 0;
  private _conductiveFlux: number = 0;
  private _emissionMeasure: number = 0;
  private _hydrostaticPressure: number[] = [];

  constructor(config: SolarCoronaConfig) {
    this._config = config;
    this._build();
  }

  get layerCount(): number {
    return this._layers.length;
  }

  get thickness(): number {
    return this._config.thickness;
  }

  get scaleHeight(): number {
    return this._scaleHeight;
  }

  get emissionMeasure(): number {
    return this._emissionMeasure;
  }

  private _build(): void {
    this._layers = [];
    const n = this._config.layerCount;
    const g = 274;
    const kB = 1.38e-23;
    const mp = 1.67e-27;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const altitude = t * this._config.thickness;
      const temperature =
        this._config.baseTemperature +
        (this._config.peakTemperature - this._config.baseTemperature) * Math.sin(t * Math.PI);
      const density = Math.exp(-altitude * 0.01);
      const emissivity = density * temperature * 1e-6;
      this._layers.push({ altitude, temperature, density, emissivity });
    }
    this._computeScaleHeight(g, kB, mp);
    this._computeConductiveFlux();
    this._computeEmissionMeasure();
    this._computeHydrostaticPressure();
  }

  private _computeScaleHeight(g: number, kB: number, mp: number): void {
    const avgT = this._layers.reduce((s, l) => s + l.temperature, 0) / this._layers.length;
    this._scaleHeight = (2 * kB * avgT) / (mp * g);
  }

  private _computeConductiveFlux(): void {
    const kappa = 1e-11;
    if (this._layers.length < 2) return;
    const dt = this._layers[1].temperature - this._layers[0].temperature;
    const dz = this._layers[1].altitude - this._layers[0].altitude;
    this._conductiveFlux = kappa * Math.pow(this._layers[0].temperature, 2.5) * (dt / dz);
  }

  private _computeEmissionMeasure(): void {
    let em = 0;
    for (const l of this._layers) {
      em += l.density * l.density;
    }
    this._emissionMeasure = em / this._layers.length;
  }

  private _computeHydrostaticPressure(): void {
    this._hydrostaticPressure = [];
    const g = 274;
    for (const l of this._layers) {
      this._hydrostaticPressure.push(l.density * g * l.altitude);
    }
  }

  computeProfile(): CoronaProfile {
    const peakTemperature =
      this._layers.length > 0 ? Math.max(...this._layers.map((l) => l.temperature)) : 0;
    const totalEmissivity = this._layers.reduce((acc, l) => acc + l.emissivity, 0);
    this._profile = {
      layers: this._layers.length,
      peakTemperature,
      totalEmissivity,
      thickness: this._config.thickness,
    };
    return this._profile;
  }

  temperatureAt(altitude: number): number {
    if (this._layers.length === 0) return 0;
    const t = altitude / this._config.thickness;
    return (
      this._config.baseTemperature +
      (this._config.peakTemperature - this._config.baseTemperature) * Math.sin(t * Math.PI)
    );
  }

  peakLayer(): CoronaLayer | null {
    if (this._layers.length === 0) return null;
    return this._layers.reduce((best, l) => (l.temperature > best.temperature ? l : best));
  }

  isHot(): boolean {
    return this.computeProfile().peakTemperature > this._config.baseTemperature * 100;
  }

  averageTemperature(): number {
    if (this._layers.length === 0) return 0;
    return this._layers.reduce((acc, l) => acc + l.temperature, 0) / this._layers.length;
  }

  computeDensityGradient(): number {
    if (this._layers.length < 2) return 0;
    const first = this._layers[0];
    const last = this._layers[this._layers.length - 1];
    return (last.density - first.density) / (last.altitude - first.altitude + 1e-9);
  }

  computeThermalConductivityAt(index: number): number {
    if (index < 0 || index >= this._layers.length) return 0;
    return 1e-11 * Math.pow(this._layers[index].temperature, 2.5);
  }

  setPeak(temperature: number): void {
    this._config.peakTemperature = temperature;
    this._build();
    this._state.peakUpdated = temperature;
  }

  reset(): void {
    this._layers = [];
    this._profile = null;
    this._build();
  }

  report(): Record<string, unknown> {
    return {
      layerCount: this._layers.length,
      profile: this._profile,
      state: this._state,
      scaleHeight: this._scaleHeight.toFixed(6),
      conductiveFlux: this._conductiveFlux.toFixed(6),
      emissionMeasure: this._emissionMeasure.toFixed(6),
      hydrostaticPressure: this._hydrostaticPressure.map((p) => p.toFixed(3)),
      densityGradient: this.computeDensityGradient().toFixed(6),
    };
  }
}
