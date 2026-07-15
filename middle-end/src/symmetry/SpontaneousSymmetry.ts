export interface SpontaneousSymmetryData {
  groundState: number;
  degenerateStates: number;
  potentialWell: number;
  expectation: number;
  broken: boolean;
}

export class SpontaneousSymmetry {
  private _groundState: number;
  private _degenerateStates: number;
  private _potentialWell: number;
  private _expectation: number;
  private _broken: boolean;
  private _states: number[];
  private _massSquared: number;
  private _selfCoupling: number;

  constructor(degenerateStates: number = 2) {
    this._groundState = 0;
    this._degenerateStates = degenerateStates;
    this._potentialWell = 0;
    this._expectation = 0;
    this._broken = false;
    this._states = [];
    for (let i = 0; i < degenerateStates; i++) {
      this._states.push(i);
    }
    this._massSquared = 1;
    this._selfCoupling = 1;
  }

  get groundState(): number {
    return this._groundState;
  }

  get degenerateStates(): number {
    return this._degenerateStates;
  }

  get expectation(): number {
    return this._expectation;
  }

  get broken(): boolean {
    return this._broken;
  }

  public computePotential(phi: number): number {
    return 0.5 * this._massSquared * phi * phi + 0.25 * this._selfCoupling * phi ** 4;
  }

  public findGroundState(): number {
    if (this._massSquared >= 0) {
      this._groundState = 0;
      this._expectation = 0;
      this._broken = false;
      return 0;
    }
    const v = Math.sqrt(-this._massSquared / this._selfCoupling);
    this._groundState = v;
    this._expectation = v;
    this._potentialWell = this.computePotential(v);
    this._broken = true;
    return v;
  }

  public setMassSquared(value: number): void {
    this._massSquared = value;
    this.findGroundState();
  }

  public setSelfCoupling(value: number): void {
    this._selfCoupling = Math.max(0.01, value);
    this.findGroundState();
  }

  public computeGoldstoneBosons(): number {
    if (!this._broken) return 0;
    return this._degenerateStates - 1;
  }

  public computeHiggsBosonMass(): number {
    if (!this._broken) return 0;
    return Math.sqrt(2 * Math.abs(this._massSquared));
  }

  public report(): SpontaneousSymmetryData {
    return {
      groundState: this._groundState,
      degenerateStates: this._degenerateStates,
      potentialWell: this._potentialWell,
      expectation: this._expectation,
      broken: this._broken,
    };
  }

  public tunnelToState(target: number): number {
    if (target < 0 || target >= this._degenerateStates) return -1;
    const barrier = this._potentialWell;
    const probability = Math.exp(-barrier);
    if (Math.random() < probability) {
      this._groundState = target;
      return target;
    }
    return -1;
  }

  public computeEffectivePotential(temperature: number): number {
    const thermalCorrection = temperature * temperature / 24;
    const effMass = this._massSquared + this._selfCoupling * thermalCorrection;
    if (effMass >= 0) return 0;
    return 0.5 * effMass * this._expectation ** 2 + 0.25 * this._selfCoupling * this._expectation ** 4;
  }

  public criticalTemperature(): number {
    if (this._massSquared >= 0) return 0;
    return Math.sqrt(24 * Math.abs(this._massSquared) / this._selfCoupling);
  }

  public reset(): void {
    this._massSquared = 1;
    this._selfCoupling = 1;
    this.findGroundState();
  }
}
