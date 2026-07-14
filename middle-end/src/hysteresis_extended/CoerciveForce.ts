export interface CoerciveData {
  forwardField: number;
  reverseField: number;
  coercivity: number;
  remanenceAtReverse: number;
}

export type CoercionResult = {
  required: number;
  achieved: boolean;
  residual: number;
  energyCost: number;
};

export interface CoerciveProfile {
  maxCoercivity: number;
  sensitivity: number;
  temperatureFactor: number;
  demagnetizationFactor: number;
}

export class CoerciveForce {
  private _profile: CoerciveProfile;
  private _measurements: CoerciveData[] = [];
  private _appliedForce: number = 0;
  private _erasureLog: Record<string, unknown> = {};
  private _energyProduct: number = 0;

  constructor(profile: CoerciveProfile) {
    this._profile = profile;
  }

  get appliedForce(): number {
    return this._appliedForce;
  }

  get measurementCount(): number {
    return this._measurements.length;
  }

  get currentCoercivity(): number {
    if (this._measurements.length === 0) return 0;
    return this._measurements[this._measurements.length - 1].coercivity;
  }

  get energyProduct(): number {
    return this._energyProduct;
  }

  public measure(forward: number, reverse: number): CoerciveData {
    const coercivity = Math.abs(reverse) * this._profile.sensitivity * this._profile.temperatureFactor;
    const remanenceAtReverse = forward * (1 - Math.abs(reverse) / Math.max(forward, 1e-6));
    const data: CoerciveData = { forwardField: forward, reverseField: reverse, coercivity, remanenceAtReverse };
    this._measurements.push(data);
    if (this._measurements.length > 50) this._measurements.shift();
    const bh = Math.abs(remanenceAtReverse * reverse);
    if (bh > this._energyProduct) this._energyProduct = bh;
    return data;
  }

  public applyReverseForce(force: number): CoercionResult {
    this._appliedForce = force;
    const required = this.currentCoercivity * this._profile.temperatureFactor;
    const achieved = Math.abs(force) >= required;
    const residual = Math.max(0, required - Math.abs(force));
    const energyCost = Math.abs(force) * required * this._profile.demagnetizationFactor;
    this._erasureLog.lastAttempt = { force, required, achieved, residual };
    return { required, achieved, residual, energyCost };
  }

  public estimateErasureCost(): number {
    const base = this.currentCoercivity;
    return base * this._profile.maxCoercivity * this._profile.temperatureFactor * this._profile.demagnetizationFactor;
  }

  public computeDemagnetizationCurve(steps: number): { field: number; magnetization: number }[] {
    const curve: { field: number; magnetization: number }[] = [];
    const maxField = this._profile.maxCoercivity;
    for (let i = 0; i <= steps; i++) {
      const field = -maxField + (2 * maxField * i) / steps;
      const saturation = this._profile.maxCoercivity;
      const magnetization = saturation * Math.tanh(field * this._profile.sensitivity / saturation);
      curve.push({ field, magnetization });
    }
    return curve;
  }

  public tuneSensitivity(factor: number): void {
    this._profile = { ...this._profile, sensitivity: this._profile.sensitivity * factor };
  }

  public setTemperatureFactor(factor: number): void {
    this._profile.temperatureFactor = Math.max(0.1, Math.min(2, factor));
  }

  public averageCoercivity(): number {
    if (this._measurements.length === 0) return 0;
    return this._measurements.reduce((acc, m) => acc + m.coercivity, 0) / this._measurements.length;
  }

  public coercivityVariance(): number {
    if (this._measurements.length < 2) return 0;
    const mean = this.averageCoercivity();
    return this._measurements.reduce((s, m) => s + (m.coercivity - mean) ** 2, 0) / this._measurements.length;
  }

  public isHardMagnetic(): boolean {
    return this.averageCoercivity() > this._profile.maxCoercivity * 0.5;
  }

  public summary(): Record<string, unknown> {
    return {
      appliedForce: this._appliedForce,
      currentCoercivity: this.currentCoercivity,
      average: this.averageCoercivity(),
      variance: this.coercivityVariance(),
      energyProduct: this._energyProduct,
      erasureCost: this.estimateErasureCost(),
      isHardMagnetic: this.isHardMagnetic(),
      log: this._erasureLog,
    };
  }
}
