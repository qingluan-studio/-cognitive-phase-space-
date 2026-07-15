export interface GaugeFieldData {
  fieldStrength: number;
  potential: number;
  coupling: number;
  charge: number;
  curvature: number;
}

export class GaugeField {
  private _fieldStrength: number;
  private _potential: number;
  private _coupling: number;
  private _charge: number;
  private _curvature: number;
  private _fieldComponents: number[];
  private _connection: number;
  private _holonomy: number;

  constructor(coupling: number = 1) {
    this._fieldStrength = 0;
    this._potential = 0;
    this._coupling = coupling;
    this._charge = 1;
    this._curvature = 0;
    this._fieldComponents = [0, 0, 0, 0];
    this._connection = 0;
    this._holonomy = 1;
  }

  get fieldStrength(): number {
    return this._fieldStrength;
  }

  get potential(): number {
    return this._potential;
  }

  get coupling(): number {
    return this._coupling;
  }

  get curvature(): number {
    return this._curvature;
  }

  public setPotential(value: number): void {
    this._potential = value;
    this._computeFieldStrength();
  }

  private _computeFieldStrength(): void {
    this._fieldStrength = this._coupling * this._potential;
    this._curvature = this._fieldStrength;
  }

  public gaugeTransform(angle: number): void {
    this._potential += angle / this._coupling;
    this._computeFieldStrength();
  }

  public computeConnection(index: number): number {
    this._connection = this._fieldComponents[index] || 0;
    return this._connection;
  }

  public computeCurvature(componentA: number, componentB: number): number {
    const F = this._fieldComponents[componentA] || 0;
    const G = this._fieldComponents[componentB] || 0;
    this._curvature = F * G - G * F + this._coupling * (F * G - G * F);
    return this._curvature;
  }

  public parallelTransport(vector: number, distance: number): number {
    const phase = this._coupling * this._potential * distance;
    return vector * Math.cos(phase);
  }

  public computeHolonomy(loopLength: number): number {
    const phase = this._coupling * this._potential * loopLength;
    this._holonomy = Math.exp(phase * this._charge);
    return this._holonomy;
  }

  public report(): GaugeFieldData {
    return {
      fieldStrength: this._fieldStrength,
      potential: this._potential,
      coupling: this._coupling,
      charge: this._charge,
      curvature: this._curvature,
    };
  }

  public setCoupling(value: number): void {
    this._coupling = Math.max(0, value);
    this._computeFieldStrength();
  }

  public setCharge(value: number): void {
    this._charge = value;
  }

  public computeYangMillsAction(volume: number): number {
    return -0.25 * this._fieldStrength * this._fieldStrength * volume;
  }

  public isAbelian(): boolean {
    return Math.abs(this._curvature) < 0.001;
  }

  public reset(): void {
    this._fieldStrength = 0;
    this._potential = 0;
    this._curvature = 0;
    this._connection = 0;
    this._holonomy = 1;
    this._fieldComponents = [0, 0, 0, 0];
  }
}
