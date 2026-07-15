export interface OperadHomologyData {
  degree: number;
  rank: number;
  torsion: number[];
  eulerCharacteristic: number;
  generators: number;
}

export class OperadHomology {
  private _degree: number;
  private _rank: number;
  private _torsion: number[];
  private _eulerCharacteristic: number;
  private _generators: number;
  private _chainComplex: number[];
  private _boundaryMaps: number[];
  private _operadArity: number;

  constructor(arity: number = 3, maxDegree: number = 5) {
    this._operadArity = arity;
    this._degree = maxDegree;
    this._rank = 0;
    this._torsion = [];
    this._eulerCharacteristic = 0;
    this._generators = arity;
    this._chainComplex = [];
    this._boundaryMaps = [];
    for (let i = 0; i <= maxDegree; i++) {
      const dim = i === 0 ? 1 : Math.pow(arity, i);
      this._chainComplex.push(dim);
      this._boundaryMaps.push(dim);
    }
    this._computeEulerCharacteristic();
  }

  get degree(): number {
    return this._degree;
  }

  get rank(): number {
    return this._rank;
  }

  get eulerCharacteristic(): number {
    return this._eulerCharacteristic;
  }

  get generators(): number {
    return this._generators;
  }

  private _computeEulerCharacteristic(): void {
    let chi = 0;
    for (let i = 0; i <= this._degree; i++) {
      chi += Math.pow(-1, i) * this._chainComplex[i];
    }
    this._eulerCharacteristic = chi;
  }

  public boundary(degree: number, chain: number): number {
    if (degree < 0 || degree >= this._boundaryMaps.length) return 0;
    return Math.floor(chain * (degree / (degree + 1)));
  }

  public computeHomology(n: number): number {
    if (n < 0 || n > this._degree) return 0;
    if (n === 0) return 1;
    return this._chainComplex[n] - this._chainComplex[n - 1];
  }

  public setArity(arity: number): void {
    this._operadArity = arity;
    this._generators = arity;
    for (let i = 0; i <= this._degree; i++) {
      this._chainComplex[i] = i === 0 ? 1 : Math.pow(arity, i);
    }
    this._computeEulerCharacteristic();
  }

  public addTorsion(order: number): void {
    this._torsion.push(order);
  }

  public checkExactness(): boolean {
    for (let i = 1; i <= this._degree; i++) {
      const h = this.computeHomology(i);
      if (h !== 0) return false;
    }
    return true;
  }

  public computeBettiNumber(n: number): number {
    return this.computeHomology(n);
  }

  public report(): OperadHomologyData {
    return {
      degree: this._degree,
      rank: this._rank,
      torsion: [...this._torsion],
      eulerCharacteristic: this._eulerCharacteristic,
      generators: this._generators,
    };
  }

  public hochschildHomology(degree: number): number {
    return this.computeHomology(degree);
  }

  public cyclicHomology(degree: number): number {
    return Math.floor(this.computeHomology(degree) / (degree + 1));
  }

  public isTorsionFree(): boolean {
    return this._torsion.length === 0;
  }

  public setMaxDegree(d: number): void {
    this._degree = d;
    this._chainComplex = [];
    this._boundaryMaps = [];
    for (let i = 0; i <= d; i++) {
      const dim = i === 0 ? 1 : Math.pow(this._operadArity, i);
      this._chainComplex.push(dim);
      this._boundaryMaps.push(dim);
    }
    this._computeEulerCharacteristic();
  }

  public reset(): void {
    this._rank = 0;
    this._torsion = [];
  }
}
