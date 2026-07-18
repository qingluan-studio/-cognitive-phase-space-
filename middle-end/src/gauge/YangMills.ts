export interface YangMillsData {
  fieldStrength: number;
  action: number;
  coupling: number;
  betaFunction: number;
  asymptoticFreedom: boolean;
}

export class YangMills {
  private _fieldStrength: number;
  private _action: number;
  private _coupling: number;
  private _betaFunction: number;
  private _asymptoticFreedom: boolean;
  private _gaugeGroupRank: number;
  private _flavors: number;
  private _renormalizationScale: number;

  constructor(coupling: number = 0.1, rank: number = 3) {
    this._fieldStrength = 0;
    this._action = 0;
    this._coupling = coupling;
    this._betaFunction = 0;
    this._gaugeGroupRank = rank;
    this._flavors = 0;
    this._renormalizationScale = 1;
    this._asymptoticFreedom = this._computeAsymptoticFreedom();
  }

  get fieldStrength(): number {
    return this._fieldStrength;
  }

  get action(): number {
    return this._action;
  }

  get coupling(): number {
    return this._coupling;
  }

  get asymptoticFreedom(): boolean {
    return this._asymptoticFreedom;
  }

  private _computeAsymptoticFreedom(): boolean {
    const n_c = this._gaugeGroupRank;
    const n_f = this._flavors;
    const beta0 = (11 * n_c - 2 * n_f) / 3;
    this._betaFunction = -beta0 * (this._coupling ** 3) / (16 * Math.PI * Math.PI);
    return beta0 > 0;
  }

  public setFieldStrength(value: number): void {
    this._fieldStrength = value;
    this._computeAction();
  }

  private _computeAction(): void {
    this._action = -0.25 * this._fieldStrength * this._fieldStrength;
  }

  public runCoupling(energyScale: number): number {
    const beta0 = (11 * this._gaugeGroupRank - 2 * this._flavors) / 3;
    const logScale = Math.log(energyScale / this._renormalizationScale);
    const denominator = 1 + 2 * beta0 * this._coupling * this._coupling * logScale / (16 * Math.PI * Math.PI);
    if (denominator <= 0) return this._coupling;
    const newCoupling = this._coupling / Math.sqrt(denominator);
    this._coupling = newCoupling;
    this._renormalizationScale = energyScale;
    this._asymptoticFreedom = this._computeAsymptoticFreedom();
    return this._coupling;
  }

  public computeBetaFunction(): number {
    const beta0 = (11 * this._gaugeGroupRank - 2 * this._flavors) / 3;
    this._betaFunction = -beta0 * (this._coupling ** 3) / (16 * Math.PI * Math.PI);
    return this._betaFunction;
  }

  public setFlavors(n: number): void {
    this._flavors = n;
    this._asymptoticFreedom = this._computeAsymptoticFreedom();
  }

  public report(): YangMillsData {
    return {
      fieldStrength: this._fieldStrength,
      action: this._action,
      coupling: this._coupling,
      betaFunction: this._betaFunction,
      asymptoticFreedom: this._asymptoticFreedom,
    };
  }

  public computeGluonPropagator(momentum: number): number {
    if (momentum <= 0) return 0;
    return 1 / (momentum * momentum);
  }

  public computeConfinementScale(): number {
    const beta0 = (11 * this._gaugeGroupRank - 2 * this._flavors) / 3;
    if (beta0 <= 0) return 0;
    return this._renormalizationScale * Math.exp(-8 * Math.PI * Math.PI / (beta0 * this._coupling * this._coupling));
  }

  public setGaugeGroupRank(rank: number): void {
    this._gaugeGroupRank = Math.max(1, rank);
    this._asymptoticFreedom = this._computeAsymptoticFreedom();
  }

  public reset(): void {
    this._fieldStrength = 0;
    this._action = 0;
    this._renormalizationScale = 1;
  }
}
