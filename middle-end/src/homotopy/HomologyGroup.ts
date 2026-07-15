export interface HomologyGroupData {
  dimension: number;
  rank: number;
  torsion: number[];
  bettiNumber: number;
  eulerCharacteristic: number;
}

export class HomologyGroup {
  private _dimension: number;
  private _rank: number;
  private _torsion: number[];
  private _bettiNumber: number;
  private _eulerCharacteristic: number;
  private _cycles: number;
  private _boundaries: number;
  private _chains: number;

  constructor(dimension: number = 2) {
    this._dimension = dimension;
    this._rank = 0;
    this._torsion = [];
    this._bettiNumber = 0;
    this._eulerCharacteristic = 0;
    this._cycles = 0;
    this._boundaries = 0;
    this._chains = 0;
    this._computeHomology();
  }

  get dimension(): number {
    return this._dimension;
  }

  get rank(): number {
    return this._rank;
  }

  get bettiNumber(): number {
    return this._bettiNumber;
  }

  get eulerCharacteristic(): number {
    return this._eulerCharacteristic;
  }

  private _computeHomology(): void {
    this._chains = this._dimension + 1;
    this._cycles = this._dimension;
    this._boundaries = this._dimension - 1;
    this._rank = this._cycles - this._boundaries;
    this._bettiNumber = this._rank;
    this._eulerCharacteristic = Math.pow(-1, this._dimension) * this._bettiNumber;
  }

  public boundaryOperator(chain: number[]): number[] {
    const result = [];
    for (let i = 0; i < chain.length - 1; i++) {
      result.push(chain[i + 1] - chain[i]);
    }
    return result;
  }

  public isCycle(chain: number[]): boolean {
    const boundary = this.boundaryOperator(chain);
    for (const b of boundary) {
      if (Math.abs(b) > 0.001) return false;
    }
    return true;
  }

  public isBoundary(chain: number[]): boolean {
    return this.isCycle(chain) && chain.length > 1;
  }

  public computeBettiNumber(k: number): number {
    if (k < 0 || k > this._dimension) return 0;
    if (k === 0) return 1;
    if (k === this._dimension) return 1;
    return 0;
  }

  public computeEulerCharacteristic(): number {
    let chi = 0;
    for (let k = 0; k <= this._dimension; k++) {
      chi += Math.pow(-1, k) * this.computeBettiNumber(k);
    }
    this._eulerCharacteristic = chi;
    return chi;
  }

  public addTorsion(order: number): void {
    this._torsion.push(order);
  }

  public report(): HomologyGroupData {
    return {
      dimension: this._dimension,
      rank: this._rank,
      torsion: [...this._torsion],
      bettiNumber: this._bettiNumber,
      eulerCharacteristic: this._eulerCharacteristic,
    };
  }

  public computeHurewicz(homotopyGroup: number): number {
    if (this._dimension === 1) {
      return homotopyGroup;
    }
    return this._rank;
  }

  public isTorsionFree(): boolean {
    return this._torsion.length === 0;
  }

  public setDimension(dim: number): void {
    this._dimension = dim;
    this._computeHomology();
  }

  public reset(): void {
    this._torsion = [];
    this._cycles = 0;
    this._boundaries = 0;
  }
}
