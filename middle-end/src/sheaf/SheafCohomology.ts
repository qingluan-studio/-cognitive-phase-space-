export interface SheafCohomologyData {
  degree: number;
  groups: number[];
  dimensions: number[];
  eulerCharacteristic: number;
  acyclic: boolean;
}

export class SheafCohomology {
  private _degree: number;
  private _groups: number[];
  private _dimensions: number[];
  private _eulerCharacteristic: number;
  private _acyclic: boolean;
  private _sheafRank: number;
  private _cochainComplex: number[][];
  private _coboundaryMaps: number[];

  constructor(degree: number = 2, rank: number = 1) {
    this._degree = degree;
    this._sheafRank = rank;
    this._groups = [];
    this._dimensions = [];
    this._cochainComplex = [];
    this._coboundaryMaps = [];
    for (let i = 0; i <= degree + 1; i++) {
      const dim = i === 0 ? rank : rank * (i + 1);
      this._groups.push(dim);
      this._dimensions.push(dim);
      const cochain = new Array(dim).fill(0);
      this._cochainComplex.push(cochain);
      this._coboundaryMaps.push(dim);
    }
    this._eulerCharacteristic = 0;
    this._acyclic = false;
    this._computeEulerCharacteristic();
  }

  get degree(): number {
    return this._degree;
  }

  get groups(): number[] {
    return [...this._groups];
  }

  get eulerCharacteristic(): number {
    return this._eulerCharacteristic;
  }

  get acyclic(): boolean {
    return this._acyclic;
  }

  private _computeEulerCharacteristic(): void {
    let chi = 0;
    for (let i = 0; i <= this._degree; i++) {
      chi += Math.pow(-1, i) * this._dimensions[i];
    }
    this._eulerCharacteristic = chi;
  }

  public coboundary(degree: number, cochain: number[]): number[] {
    if (degree < 0 || degree >= this._coboundaryMaps.length) return [];
    const result = [];
    const outDim = this._coboundaryMaps[degree] || cochain.length;
    for (let i = 0; i < outDim; i++) {
      result.push(cochain[i % cochain.length] || 0);
    }
    return result;
  }

  public computeCohomologyGroup(n: number): number {
    if (n < 0 || n >= this._groups.length) return 0;
    return this._groups[n];
  }

  public setCohomology(n: number, value: number): void {
    if (n >= 0 && n < this._groups.length) {
      this._groups[n] = value;
      this._dimensions[n] = value;
      this._computeEulerCharacteristic();
    }
  }

  public checkExactness(): boolean {
    this._acyclic = true;
    for (let i = 1; i < this._groups.length; i++) {
      if (this._groups[i] !== 0) {
        this._acyclic = false;
        break;
      }
    }
    return this._acyclic;
  }

  public longExactSequence(other: SheafCohomology): number[] {
    const les = [];
    const maxDeg = Math.max(this._degree, other._degree);
    for (let i = 0; i <= maxDeg; i++) {
      les.push(this.computeCohomologyGroup(i));
      les.push(other.computeCohomologyGroup(i));
    }
    return les;
  }

  public report(): SheafCohomologyData {
    return {
      degree: this._degree,
      groups: [...this._groups],
      dimensions: [...this._dimensions],
      eulerCharacteristic: this._eulerCharacteristic,
      acyclic: this._acyclic,
    };
  }

  public isAcyclic(): boolean {
    return this._acyclic;
  }

  public computeBettiNumber(n: number): number {
    return this.computeCohomologyGroup(n);
  }

  public setDegree(d: number): void {
    this._degree = d;
    this._groups = [];
    this._dimensions = [];
    for (let i = 0; i <= d + 1; i++) {
      const dim = i === 0 ? this._sheafRank : this._sheafRank * (i + 1);
      this._groups.push(dim);
      this._dimensions.push(dim);
    }
    this._computeEulerCharacteristic();
  }

  public reset(): void {
    this._acyclic = false;
  }
}
