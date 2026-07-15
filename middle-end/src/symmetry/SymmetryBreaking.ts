export interface SymmetryBreakingData {
  initialSymmetry: number;
  finalSymmetry: number;
  orderParameter: number;
  breakingStrength: number;
  phases: number;
}

export class SymmetryBreaking {
  private _initialSymmetry: number;
  private _finalSymmetry: number;
  private _orderParameter: number;
  private _breakingStrength: number;
  private _phases: number;
  private _symmetryHistory: number[];
  private _criticalPoint: number;
  private _temperature: number;

  constructor(initialSymmetry: number = 6) {
    this._initialSymmetry = initialSymmetry;
    this._finalSymmetry = initialSymmetry;
    this._orderParameter = 0;
    this._breakingStrength = 0;
    this._phases = 1;
    this._symmetryHistory = [];
    this._criticalPoint = 0.5;
    this._temperature = 1.0;
  }

  get initialSymmetry(): number {
    return this._initialSymmetry;
  }

  get finalSymmetry(): number {
    return this._finalSymmetry;
  }

  get orderParameter(): number {
    return this._orderParameter;
  }

  get breakingStrength(): number {
    return this._breakingStrength;
  }

  public break(strength: number): number {
    this._breakingStrength = strength;
    const ratio = Math.min(1, strength / this._criticalPoint);
    this._orderParameter = ratio;
    this._finalSymmetry = this._initialSymmetry * (1 - ratio * 0.8);
    this._phases = Math.floor(1 + ratio * this._initialSymmetry * 0.5);
    this._symmetryHistory.push(this._finalSymmetry);
    if (this._symmetryHistory.length > 50) this._symmetryHistory.shift();
    return this._finalSymmetry;
  }

  public restore(strength: number): number {
    this._breakingStrength = Math.max(0, this._breakingStrength - strength);
    const ratio = this._breakingStrength / this._criticalPoint;
    this._orderParameter = Math.max(0, ratio);
    this._finalSymmetry = this._initialSymmetry * (1 - ratio * 0.8);
    this._phases = Math.max(1, Math.floor(1 + ratio * this._initialSymmetry * 0.5));
    return this._finalSymmetry;
  }

  public computeGoldstoneModes(): number {
    const broken = this._initialSymmetry - this._finalSymmetry;
    return Math.floor(broken);
  }

  public computeHiggsMass(): number {
    if (this._orderParameter <= 0) return 0;
    return Math.sqrt(this._breakingStrength) * this._orderParameter;
  }

  public report(): SymmetryBreakingData {
    return {
      initialSymmetry: this._initialSymmetry,
      finalSymmetry: this._finalSymmetry,
      orderParameter: this._orderParameter,
      breakingStrength: this._breakingStrength,
      phases: this._phases,
    };
  }

  public reset(): void {
    this._finalSymmetry = this._initialSymmetry;
    this._orderParameter = 0;
    this._breakingStrength = 0;
    this._phases = 1;
    this._symmetryHistory = [];
  }

  public isBroken(): boolean {
    return this._finalSymmetry < this._initialSymmetry * 0.99;
  }

  public computePhaseTransitionFreeEnergy(): number {
    const t = this._temperature;
    const t_c = this._criticalPoint;
    if (t >= t_c) {
      return (t - t_c) * this._orderParameter ** 2;
    }
    return -(t_c - t) * this._orderParameter ** 2 + 0.25 * this._orderParameter ** 4;
  }

  public setCriticalPoint(value: number): void {
    this._criticalPoint = Math.max(0.01, value);
  }

  public getSymmetryLoss(): number {
    return this._initialSymmetry - this._finalSymmetry;
  }
}
