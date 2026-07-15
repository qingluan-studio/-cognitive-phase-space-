export interface ExpansionState {
  scaleFactor: number;
  hubbleParameter: number;
  deceleration: number;
  darkEnergyFraction: number;
  lookbackTime: number;
}

export interface DarkEnergyEquationOfState {
  w0: number;
  wa: number;
  wAtZ: (z: number) => number;
}

export class DarkEnergyDriver {
  private _scaleFactor: number;
  private _hubbleParameter: number;
  private _darkEnergyDensity: number;
  private _matterDensity: number;
  private _radiationDensity: number;
  private _curvatureDensity: number;
  private _w0: number;
  private _wa: number;
  private _decelerationParameter: number;
  private _lookbackTime: number;
  private _history: ExpansionState[];
  private _omegaLambda: number;
  private _omegaM: number;
  private _hubbleConstant: number;

  constructor() {
    this._scaleFactor = 1.0;
    this._hubbleConstant = 70;
    this._hubbleParameter = this._hubbleConstant;
    this._omegaLambda = 0.7;
    this._omegaM = 0.3;
    this._omegaM = 0.3;
    this._radiationDensity = 1e-4;
    this._curvatureDensity = 0;
    this._darkEnergyDensity = this._omegaLambda;
    this._matterDensity = this._omegaM;
    this._w0 = -1;
    this._wa = 0;
    this._decelerationParameter = 0;
    this._lookbackTime = 0;
    this._history = [];
  }

  get scaleFactor(): number {
    return this._scaleFactor;
  }

  get hubbleParameter(): number {
    return this._hubbleParameter;
  }

  get darkEnergyFraction(): number {
    return this._darkEnergyDensity;
  }

  get matterFraction(): number {
    return this._matterDensity;
  }

  get w0(): number {
    return this._w0;
  }

  get wa(): number {
    return this._wa;
  }

  public wAtZ(z: number): number {
    return this._w0 + this._wa * (z / (1 + z));
  }

  public computeHubbleParameterZ(z: number): number {
    const a = 1 / (1 + z);
    const omegaM = this._matterDensity;
    const omegaR = this._radiationDensity;
    const omegaK = this._curvatureDensity;
    const omegaL = this._darkEnergyDensity;
    const w = this.wAtZ(z);
    const H0 = this._hubbleConstant;
    const termM = omegaM * Math.pow(1 + z, 3);
    const termR = omegaR * Math.pow(1 + z, 4);
    const termK = omegaK * Math.pow(1 + z, 2);
    const termL = omegaL * Math.pow(1 + z, 3 * (1 + w));
    return H0 * Math.sqrt(termM + termR + termK + termL);
  }

  public evolveScaleFactor(dt: number): number {
    const a = this._scaleFactor;
    const H = this._hubbleParameter;
    const rhoTotal = this._matterDensity * Math.pow(a, -3) + this._radiationDensity * Math.pow(a, -4) + this._darkEnergyDensity * Math.pow(a, -3 * (1 + this._w0));
    const acceleration = -0.5 * H * H * a * (this._matterDensity * Math.pow(a, -3) + 2 * this._radiationDensity * Math.pow(a, -4) + 2 * this._darkEnergyDensity * Math.pow(a, -3 * (1 + this._w0)) * (1 + 3 * this._w0));
    const newA = a + H * a * dt + 0.5 * acceleration * dt * dt;
    this._scaleFactor = Math.max(1e-10, newA);
    this._updateDensities();
    this._hubbleParameter = this.computeHubbleParameterZ(1 / this._scaleFactor - 1);
    this._decelerationParameter = this._computeDeceleration();
    this._recordState();
    return this._scaleFactor;
  }

  private _updateDensities(): void {
    const a = this._scaleFactor;
    const total = this._matterDensity * Math.pow(a, -3) + this._radiationDensity * Math.pow(a, -4) + this._darkEnergyDensity * Math.pow(a, -3 * (1 + this._w0));
    this._matterDensity = (this._matterDensity * Math.pow(a, -3)) / total;
    this._radiationDensity = (this._radiationDensity * Math.pow(a, -4)) / total;
    this._darkEnergyDensity = (this._darkEnergyDensity * Math.pow(a, -3 * (1 + this._w0))) / total;
  }

  private _computeDeceleration(): number {
    const omegaM = this._matterDensity;
    const omegaR = this._radiationDensity;
    const omegaL = this._darkEnergyDensity;
    const w = this._w0;
    return 0.5 * omegaM + omegaR - omegaL * (1 + 3 * w);
  }

  public computeLookbackTime(z: number): number {
    const steps = 1000;
    let t = 0;
    for (let i = 0; i < steps; i++) {
      const zi = (i / steps) * z;
      const dz = z / steps;
      const Hz = this.computeHubbleParameterZ(zi);
      t += dz / ((1 + zi) * Hz);
    }
    return t;
  }

  public computeComovingDistance(z: number): number {
    const steps = 1000;
    let d = 0;
    for (let i = 0; i < steps; i++) {
      const zi = (i / steps) * z;
      const dz = z / steps;
      const Hz = this.computeHubbleParameterZ(zi);
      d += dz / Hz;
    }
    return d * this._speedOfLightKmS();
  }

  private _speedOfLightKmS(): number {
    return 299792.458;
  }

  public computeLuminosityDistance(z: number): number {
    const dC = this.computeComovingDistance(z);
    return dC * (1 + z);
  }

  public computeAngularDiameterDistance(z: number): number {
    const dC = this.computeComovingDistance(z);
    return dC / (1 + z);
  }

  public setEquationOfState(w0: number, wa: number): void {
    this._w0 = w0;
    this._wa = wa;
  }

  public setDensities(omegaM: number, omegaL: number, omegaR: number = 1e-4): void {
    this._matterDensity = omegaM;
    this._darkEnergyDensity = omegaL;
    this._radiationDensity = omegaR;
    this._curvatureDensity = 1 - omegaM - omegaL - omegaR;
  }

  public getExpansionState(): ExpansionState {
    return {
      scaleFactor: this._scaleFactor,
      hubbleParameter: this._hubbleParameter,
      deceleration: this._decelerationParameter,
      darkEnergyFraction: this._darkEnergyDensity,
      lookbackTime: this._lookbackTime,
    };
  }

  public getHistory(): ExpansionState[] {
    return this._history.map(h => ({ ...h }));
  }

  private _recordState(): void {
    this._history.push(this.getExpansionState());
    if (this._history.length > 200) this._history.shift();
  }

  public computeAgeOfUniverse(): number {
    return this.computeLookbackTime(1e6);
  }

  public isAccelerating(): boolean {
    return this._decelerationParameter < 0;
  }

  public computeJerkParameter(): number {
    const q = this._decelerationParameter;
    const j = 1 + 2 * q;
    return j;
  }

  public reset(): void {
    this._scaleFactor = 1.0;
    this._hubbleParameter = 70;
    this._omegaLambda = 0.7;
    this._omegaM = 0.3;
    this._darkEnergyDensity = 0.7;
    this._matterDensity = 0.3;
    this._radiationDensity = 1e-4;
    this._curvatureDensity = 0;
    this._w0 = -1;
    this._wa = 0;
    this._decelerationParameter = 0;
    this._lookbackTime = 0;
    this._history = [];
  }
}
