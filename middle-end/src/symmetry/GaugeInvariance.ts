export interface GaugeInvarianceData {
  gaugeField: number;
  coupling: number;
  charge: number;
  transformationAngle: number;
  invariant: boolean;
}

export class GaugeInvariance {
  private _gaugeField: number;
  private _coupling: number;
  private _charge: number;
  private _transformationAngle: number;
  private _invariant: boolean;
  private _fieldStrength: number;
  private _covariantDerivative: number;
  private _lagrangian: number;

  constructor(coupling: number = 1) {
    this._gaugeField = 0;
    this._coupling = coupling;
    this._charge = 1;
    this._transformationAngle = 0;
    this._invariant = true;
    this._fieldStrength = 0;
    this._covariantDerivative = 0;
    this._lagrangian = 0;
  }

  get gaugeField(): number {
    return this._gaugeField;
  }

  get coupling(): number {
    return this._coupling;
  }

  get charge(): number {
    return this._charge;
  }

  get invariant(): boolean {
    return this._invariant;
  }

  public setGaugeField(value: number): void {
    this._gaugeField = value;
    this._updateFieldStrength();
  }

  private _updateFieldStrength(): void {
    this._fieldStrength = this._gaugeField * this._coupling;
  }

  public gaugeTransform(angle: number): void {
    this._transformationAngle = angle;
    this._gaugeField += angle / this._coupling;
    this._updateFieldStrength();
    this._checkInvariance();
  }

  public computeCovariantDerivative(psi: number, dPsi: number): number {
    this._covariantDerivative = dPsi - this._coupling * this._charge * this._gaugeField * psi;
    return this._covariantDerivative;
  }

  private _checkInvariance(): void {
    const transformedField = this._fieldStrength;
    const originalField = this._gaugeField * this._coupling;
    this._invariant = Math.abs(transformedField - originalField) < 0.001;
  }

  public computeFieldStrengthTensor(derivA: number, derivB: number): number {
    return derivA - derivB + this._coupling * (this._gaugeField * derivB - derivA * this._gaugeField);
  }

  public computeLagrangian(matterField: number, gaugeKinetic: number): number {
    const matterPart = matterField * this._covariantDerivative;
    const gaugePart = -0.25 * this._fieldStrength * this._fieldStrength;
    this._lagrangian = matterPart + gaugePart + gaugeKinetic;
    return this._lagrangian;
  }

  public report(): GaugeInvarianceData {
    return {
      gaugeField: this._gaugeField,
      coupling: this._coupling,
      charge: this._charge,
      transformationAngle: this._transformationAngle,
      invariant: this._invariant,
    };
  }

  public setCoupling(value: number): void {
    this._coupling = Math.max(0, value);
    this._updateFieldStrength();
  }

  public setCharge(value: number): void {
    this._charge = value;
  }

  public computeWilsonLoop(loop: number[]): number {
    let product = 1;
    for (const field of loop) {
      product *= Math.exp(this._coupling * field * this._charge);
    }
    return product;
  }

  public isLocalGaugeSymmetry(): boolean {
    return this._invariant && this._coupling > 0;
  }

  public reset(): void {
    this._gaugeField = 0;
    this._transformationAngle = 0;
    this._invariant = true;
    this._fieldStrength = 0;
    this._covariantDerivative = 0;
    this._lagrangian = 0;
  }
}
