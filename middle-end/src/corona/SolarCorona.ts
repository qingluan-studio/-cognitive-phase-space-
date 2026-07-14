/**
 * 日冕模块：太阳外层大气，温度远高于表面。
 * 用于刻画系统中外围温度高于内核的反直觉结构。
 */

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

  private _build(): void {
    this._layers = [];
    const n = this._config.layerCount;
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
    };
  }
}
