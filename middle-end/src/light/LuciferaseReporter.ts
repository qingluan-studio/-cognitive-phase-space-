export interface ReporterReading {
  time: number;
  luminescence: number;
  substrate: number;
  enzymeActive: boolean;
}

export type KineticsResult = {
  vmax: number;
  km: number;
  reactionRate: number;
};

export interface ReporterConfig {
  enzymeConcentration: number;
  substrateInitial: number;
  temperature: number;
}

export class LuciferaseReporter {
  private _config: ReporterConfig;
  private _readings: ReporterReading[] = [];
  private _kinetics: KineticsResult | null = null;
  private _state: Record<string, unknown> = {};
  private _michaelisMentenParams: [number, number] = [1, 0.5];
  private _activationEnergy: number = 50;
  private _arrheniusFactor: number = 1;

  constructor(config: ReporterConfig) {
    this._config = config;
    this._updateArrhenius();
  }

  get readingCount(): number {
    return this._readings.length;
  }

  get totalLuminescence(): number {
    return this._readings.reduce((acc, r) => acc + r.luminescence, 0);
  }

  get arrheniusFactor(): number {
    return this._arrheniusFactor;
  }

  private _updateArrhenius(): void {
    const R = 8.314;
    const T = this._config.temperature + 273.15;
    this._arrheniusFactor = Math.exp(-this._activationEnergy / (R * T * 0.001));
  }

  private _michaelisMenten(substrate: number): number {
    const [vmax, km] = this._michaelisMentenParams;
    return (vmax * substrate) / (km + substrate + 0.001);
  }

  private _hillEquation(substrate: number, n: number): number {
    const [vmax, km] = this._michaelisMentenParams;
    return (vmax * Math.pow(substrate, n)) / (Math.pow(km, n) + Math.pow(substrate, n));
  }

  record(luminescence: number, substrate: number): ReporterReading {
    const enzymeActive = substrate > 0.01;
    const reading: ReporterReading = {
      time: Date.now(),
      luminescence,
      substrate,
      enzymeActive,
    };
    this._readings.push(reading);
    if (this._readings.length > 40) this._readings.shift();
    const rate = this._michaelisMenten(substrate) * this._arrheniusFactor;
    this._state.lastRate = rate;
    return reading;
  }

  computeKinetics(): KineticsResult {
    const active = this._readings.filter((r) => r.enzymeActive);
    const vmax = active.length > 0 ? Math.max(...active.map((r) => r.luminescence)) : 0;
    const halfVmax = vmax / 2;
    let km = 0;
    for (const r of active) {
      if (r.luminescence >= halfVmax) {
        km = r.substrate;
        break;
      }
    }
    const reactionRate = vmax * this._arrheniusFactor;
    this._kinetics = { vmax, km, reactionRate };
    this._michaelisMentenParams = [vmax, km];
    return this._kinetics;
  }

  isSaturated(): boolean {
    const last = this._readings[this._readings.length - 1];
    if (!last) return false;
    const rate = this._michaelisMenten(last.substrate);
    return rate > this._michaelisMentenParams[0] * 0.95;
  }

  estimateSubstrateRemaining(): number {
    const consumed = this._readings.reduce((acc, r) => acc + r.luminescence * 0.01, 0);
    return Math.max(0, this._config.substrateInitial - consumed);
  }

  setTemperature(temperature: number): void {
    this._config.temperature = temperature;
    this._updateArrhenius();
  }

  averageRate(): number {
    if (this._readings.length < 2) return 0;
    const rates: number[] = [];
    for (let i = 1; i < this._readings.length; i++) {
      const dt = (this._readings[i].time - this._readings[i - 1].time) / 1000;
      const dl = this._readings[i].luminescence - this._readings[i - 1].luminescence;
      if (dt > 0) rates.push(dl / dt);
    }
    return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  }

  reset(): void {
    this._readings = [];
    this._kinetics = null;
    this._arrheniusFactor = 1;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      readings: this._readings.length,
      totalLuminescence: this.totalLuminescence.toFixed(3),
      kinetics: this._kinetics,
      state: this._state,
      arrheniusFactor: this._arrheniusFactor.toFixed(4),
      averageRate: this.averageRate().toFixed(4),
    };
  }
}
