export interface PhaseBoundary {
  temperature: number;
  pressure: number;
  phaseA: string;
  phaseB: string;
  latentHeat: number;
}

export interface PhaseState {
  currentPhase: string;
  orderParameter: number;
  freeEnergy: number;
  susceptibility: number;
}

export class PhaseTransition {
  private _currentPhase: string;
  private _temperature: number;
  private _pressure: number;
  private _latentHeat: number;
  private _orderParameter: number;
  private _criticalTemperature: number;
  private _criticalPressure: number;
  private _history: PhaseBoundary[];
  private _phaseStates: PhaseState[];
  private _coexistenceCurve: PhaseBoundary[];
  private _gasConstant: number;
  private _betaExponent: number;

  constructor(criticalTemp: number = 647) {
    this._criticalTemperature = criticalTemp;
    this._criticalPressure = 22.06e6;
    this._currentPhase = 'gas';
    this._temperature = 400;
    this._pressure = 1e5;
    this._latentHeat = 2260;
    this._orderParameter = 0;
    this._history = [];
    this._phaseStates = [];
    this._coexistenceCurve = [];
    this._gasConstant = 8.314;
    this._betaExponent = 0.326;
  }

  get currentPhase(): string {
    return this._currentPhase;
  }

  get criticalTemperature(): number {
    return this._criticalTemperature;
  }

  get criticalPressure(): number {
    return this._criticalPressure;
  }

  get orderParameter(): number {
    return this._orderParameter;
  }

  get latentHeat(): number {
    return this._latentHeat;
  }

  public computeClausiusClapeyron(T: number): number {
    const dT = T - this._criticalTemperature;
    if (Math.abs(dT) < 1) return 0;
    return this._latentHeat / (T * (1 / this._gasConstant - 1 / this._gasConstant));
  }

  public computeLatentHeat(T: number): number {
    return this._latentHeat * Math.pow(1 - T / this._criticalTemperature, 0.38);
  }

  public computeOrderParameter(): number {
    const t = Math.abs(1 - this._temperature / this._criticalTemperature);
    if (this._temperature < this._criticalTemperature) {
      this._orderParameter = Math.pow(t, this._betaExponent);
    } else {
      this._orderParameter = 0;
    }
    return this._orderParameter;
  }

  public determinePhase(): string {
    if (this._temperature > this._criticalTemperature) {
      this._currentPhase = 'supercritical';
    } else if (this._pressure > this._computeVaporPressure(this._temperature)) {
      this._currentPhase = 'liquid';
    } else {
      this._currentPhase = 'gas';
    }
    return this._currentPhase;
  }

  private _computeVaporPressure(T: number): number {
    if (T >= this._criticalTemperature) return this._criticalPressure;
    const A = 8.07131;
    const B = 1730.63;
    const C = 233.426;
    return Math.pow(10, A - B / (C + T - 273.15)) * 133.322;
  }

  public computeSusceptibility(): number {
    const t = Math.abs(1 - this._temperature / this._criticalTemperature);
    const gamma = 1.237;
    return Math.pow(t, -gamma);
  }

  public computeSpecificHeat(): number {
    const t = Math.abs(1 - this._temperature / this._criticalTemperature);
    const alpha = 0.11;
    return Math.pow(t, -alpha);
  }

  public computeCorrelationLength(): number {
    const t = Math.abs(1 - this._temperature / this._criticalTemperature);
    const nu = 0.63;
    return Math.pow(t, -nu);
  }

  public generateCoexistenceCurve(points: number = 100): PhaseBoundary[] {
    const curve: PhaseBoundary[] = [];
    for (let i = 1; i < points; i++) {
      const T = (i / points) * this._criticalTemperature;
      const P = this._computeVaporPressure(T);
      curve.push({
        temperature: T,
        pressure: P,
        phaseA: 'liquid',
        phaseB: 'gas',
        latentHeat: this.computeLatentHeat(T),
      });
    }
    this._coexistenceCurve = curve;
    return curve;
  }

  public addPhaseBoundary(boundary: PhaseBoundary): void {
    this._history.push(boundary);
    if (this._history.length > 200) this._history.shift();
  }

  public computeLandauFreeEnergy(orderParam: number): number {
    const a = this._temperature - this._criticalTemperature;
    const b = 1;
    const c = 1;
    return a * orderParam * orderParam + b * Math.pow(orderParam, 4) + c * Math.pow(orderParam, 6);
  }

  public findMinimaOfLandauPotential(): number[] {
    const minima: number[] = [];
    const a = this._temperature - this._criticalTemperature;
    if (a < 0) {
      const phi0 = Math.sqrt(-a / 2);
      minima.push(-phi0, phi0);
    } else {
      minima.push(0);
    }
    return minima;
  }

  public computeSurfaceTension(): number {
    const t = 1 - this._temperature / this._criticalTemperature;
    const mu = 1.26;
    return Math.pow(t, mu);
  }

  public setTemperature(temp: number): void {
    this._temperature = temp;
    this.determinePhase();
    this.computeOrderParameter();
  }

  public setPressure(pressure: number): void {
    this._pressure = pressure;
    this.determinePhase();
  }

  public getPhaseState(): PhaseState {
    return {
      currentPhase: this._currentPhase,
      orderParameter: this._orderParameter,
      freeEnergy: this.computeLandauFreeEnergy(this._orderParameter),
      susceptibility: this.computeSusceptibility(),
    };
  }

  public getHistory(): PhaseBoundary[] {
    return this._history.map(h => ({ ...h }));
  }

  public getCoexistenceCurve(): PhaseBoundary[] {
    return this._coexistenceCurve.map(c => ({ ...c }));
  }

  public computeSpinodalCurve(): PhaseBoundary[] {
    const spinodal: PhaseBoundary[] = [];
    for (let i = 1; i < 100; i++) {
      const T = (i / 100) * this._criticalTemperature;
      spinodal.push({
        temperature: T,
        pressure: this._computeVaporPressure(T) * 0.9,
        phaseA: 'metastable',
        phaseB: 'unstable',
        latentHeat: 0,
      });
    }
    return spinodal;
  }

  public computeNucleationRate(supercooling: number): number {
    const barrier = this.computeSurfaceTension() * Math.pow(supercooling, -2);
    return Math.exp(-barrier);
  }

  public reset(): void {
    this._currentPhase = 'gas';
    this._temperature = 400;
    this._pressure = 1e5;
    this._latentHeat = 2260;
    this._orderParameter = 0;
    this._history = [];
    this._phaseStates = [];
    this._coexistenceCurve = [];
  }
}
