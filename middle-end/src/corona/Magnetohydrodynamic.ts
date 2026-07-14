export interface MHDState {
  time: number;
  magneticField: number;
  fluidVelocity: number;
  pressure: number;
}

export type MHDStability = {
  stable: boolean;
  alfvenSpeed: number;
  machNumber: number;
};

export interface MagnetohydrodynamicConfig {
  density: number;
  permeability: number;
  baseField: number;
}

export class Magnetohydrodynamic {
  private _config: MagnetohydrodynamicConfig;
  private _states: MHDState[] = [];
  private _stability: MHDStability | null = null;
  private _time: number = 0;
  private _state: Record<string, unknown> = {};
  private _vectorPotential: number = 0;
  private _magneticReynolds: number = 0;
  private _turbulenceSpectrum: number[] = [];
  private _alfvenWaveAmplitude: number = 0;

  constructor(config: MagnetohydrodynamicConfig) {
    this._config = config;
  }

  get stateCount(): number {
    return this._states.length;
  }

  get time(): number {
    return this._time;
  }

  get magneticReynolds(): number {
    return this._magneticReynolds;
  }

  step(dt: number): MHDState {
    this._time += dt;
    const last = this._states[this._states.length - 1];
    const magneticField = last
      ? last.magneticField + Math.sin(this._time) * dt
      : this._config.baseField;
    const fluidVelocity = last ? last.fluidVelocity * 0.99 + Math.cos(this._time) * 0.1 : 0.1;
    const pressure = last ? last.pressure * 0.98 + magneticField * magneticField * 0.001 : 1;
    const entry: MHDState = {
      time: this._time,
      magneticField,
      fluidVelocity,
      pressure,
    };
    this._states.push(entry);
    if (this._states.length > 100) this._states.shift();
    this._updateDerived(magneticField, fluidVelocity, dt);
    return entry;
  }

  private _updateDerived(b: number, v: number, dt: number): void {
    this._vectorPotential += b * dt;
    const nu = 0.01;
    const L = 1;
    this._magneticReynolds = Math.abs(v) * L / nu;
    const alfven = this._config.baseField / Math.sqrt(this._config.permeability * this._config.density);
    this._alfvenWaveAmplitude = Math.sin(this._time * alfven);
    const kVals = [1, 2, 3, 4, 5];
    this._turbulenceSpectrum = kVals.map((k) => Math.exp(-k) * b * b / (k * k + 1));
  }

  computeStability(): MHDStability {
    const alfvenSpeed =
      this._config.density > 0
        ? this._config.baseField / Math.sqrt(this._config.permeability * this._config.density)
        : 0;
    const last = this._states[this._states.length - 1];
    const velocity = last ? last.fluidVelocity : 0;
    const machNumber = alfvenSpeed > 0 ? Math.abs(velocity) / alfvenSpeed : 0;
    const stable = machNumber < 1;
    this._stability = { stable, alfvenSpeed, machNumber };
    return this._stability;
  }

  isStable(): boolean {
    return this.computeStability().stable;
  }

  alfvenSpeed(): number {
    return this.computeStability().alfvenSpeed;
  }

  currentState(): MHDState | null {
    return this._states.length > 0 ? this._states[this._states.length - 1] : null;
  }

  averagePressure(): number {
    if (this._states.length === 0) return 0;
    return this._states.reduce((acc, s) => acc + s.pressure, 0) / this._states.length;
  }

  peakField(): number {
    if (this._states.length === 0) return 0;
    return Math.max(...this._states.map((s) => Math.abs(s.magneticField)));
  }

  computeOhmicHeating(): number {
    const eta = 0.001;
    const j = this._states.length > 0 ? this._states[this._states.length - 1].magneticField : 0;
    return eta * j * j;
  }

  computeForceFreeAlpha(): number {
    const last = this._states[this._states.length - 1];
    if (!last || Math.abs(last.magneticField) < 1e-9) return 0;
    return last.fluidVelocity / last.magneticField;
  }

  setDensity(density: number): void {
    this._config.density = density;
    this._state.densityUpdated = density;
  }

  report(): Record<string, unknown> {
    return {
      stateCount: this._states.length,
      time: this._time,
      stability: this._stability,
      state: this._state,
      vectorPotential: this._vectorPotential.toFixed(4),
      magneticReynolds: this._magneticReynolds.toFixed(3),
      alfvenWaveAmplitude: this._alfvenWaveAmplitude.toFixed(4),
      turbulenceSpectrum: this._turbulenceSpectrum,
      ohmicHeating: this.computeOhmicHeating().toFixed(4),
      forceFreeAlpha: this.computeForceFreeAlpha().toFixed(4),
    };
  }
}
