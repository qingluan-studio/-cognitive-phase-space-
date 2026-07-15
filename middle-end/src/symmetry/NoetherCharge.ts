export interface NoetherChargeData {
  charge: number;
  symmetry: string;
  conservationLaw: string;
  current: number;
  conserved: boolean;
}

export class NoetherCharge {
  private _charge: number;
  private _symmetry: string;
  private _conservationLaw: string;
  private _current: number;
  private _conserved: boolean;
  private _chargeHistory: number[];
  private _symmetryGenerator: number;
  private _flux: number;

  constructor(symmetry: string = 'time') {
    this._charge = 0;
    this._symmetry = symmetry;
    this._conservationLaw = this._deriveConservationLaw(symmetry);
    this._current = 0;
    this._conserved = true;
    this._chargeHistory = [];
    this._symmetryGenerator = 1;
    this._flux = 0;
  }

  get charge(): number {
    return this._charge;
  }

  get symmetry(): string {
    return this._symmetry;
  }

  get current(): number {
    return this._current;
  }

  get conserved(): boolean {
    return this._conserved;
  }

  private _deriveConservationLaw(symmetry: string): string {
    const map: Record<string, string> = {
      'time': 'energy',
      'space': 'momentum',
      'rotation': 'angular_momentum',
      'phase': 'electric_charge',
      'translation': 'momentum',
      'gauge': 'charge',
    };
    return map[symmetry] || 'general_charge';
  }

  public addCharge(amount: number): void {
    this._charge += amount;
    this._chargeHistory.push(this._charge);
    if (this._chargeHistory.length > 100) this._chargeHistory.shift();
    this._checkConservation();
  }

  public removeCharge(amount: number): number {
    const actual = Math.min(this._charge, amount);
    this._charge -= actual;
    this._chargeHistory.push(this._charge);
    if (this._chargeHistory.length > 100) this._chargeHistory.shift();
    this._checkConservation();
    return actual;
  }

  public setCurrent(value: number): void {
    this._current = value;
    this._flux = value;
  }

  private _checkConservation(): void {
    if (this._chargeHistory.length < 2) {
      this._conserved = true;
      return;
    }
    const recent = this._chargeHistory.slice(-10);
    let totalChange = 0;
    for (let i = 1; i < recent.length; i++) {
      totalChange += Math.abs(recent[i] - recent[i - 1]);
    }
    this._conserved = totalChange < 0.01;
  }

  public computeContinuityEquation(density: number, velocity: number): number {
    return -velocity * density + this._current;
  }

  public report(): NoetherChargeData {
    return {
      charge: this._charge,
      symmetry: this._symmetry,
      conservationLaw: this._conservationLaw,
      current: this._current,
      conserved: this._conserved,
    };
  }

  public reset(): void {
    this._charge = 0;
    this._current = 0;
    this._conserved = true;
    this._chargeHistory = [];
  }

  public computeChargeDensity(volume: number): number {
    if (volume <= 0) return 0;
    return this._charge / volume;
  }

  public gaugeTransform(phase: number): number {
    return this._charge * Math.exp(phase);
  }

  public isLocallyConserved(fluxIn: number, fluxOut: number): boolean {
    const netFlux = fluxIn - fluxOut;
    const change = this._charge - (this._chargeHistory[this._chargeHistory.length - 2] || 0);
    return Math.abs(netFlux - change) < 0.001;
  }
}
