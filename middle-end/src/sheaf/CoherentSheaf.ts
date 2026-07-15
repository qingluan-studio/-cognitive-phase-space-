export interface CoherentSheafData {
  rank: number;
  torsion: boolean;
  support: number;
  locallyFree: boolean;
  syzygies: number;
}

export class CoherentSheaf {
  private _rank: number;
  private _torsion: boolean;
  private _support: number;
  private _locallyFree: boolean;
  private _syzygies: number;
  private _modules: number[];
  private _globalSections: number;
  private _projectiveDimension: number;

  constructor(rank: number = 1) {
    this._rank = rank;
    this._torsion = false;
    this._support = rank;
    this._locallyFree = true;
    this._syzygies = 0;
    this._modules = [];
    for (let i = 0; i < rank; i++) {
      this._modules.push(1);
    }
    this._globalSections = rank;
    this._projectiveDimension = 0;
  }

  get rank(): number {
    return this._rank;
  }

  get torsion(): boolean {
    return this._torsion;
  }

  get support(): number {
    return this._support;
  }

  get locallyFree(): boolean {
    return this._locallyFree;
  }

  public computeGlobalSections(): number {
    this._globalSections = this._rank * this._support;
    return this._globalSections;
  }

  public tensorProduct(other: CoherentSheaf): CoherentSheaf {
    const result = new CoherentSheaf(this._rank * other._rank);
    result._support = Math.min(this._support, other._support);
    result._torsion = this._torsion || other._torsion;
    result._locallyFree = this._locallyFree && other._locallyFree;
    return result;
  }

  public dual(): CoherentSheaf {
    const result = new CoherentSheaf(this._rank);
    result._locallyFree = this._locallyFree;
    result._support = this._support;
    return result;
  }

  public computeCohomology(degree: number): number {
    if (degree === 0) return this._globalSections;
    if (degree === 1) return Math.floor(this._rank / 2);
    return 0;
  }

  public eulerCharacteristic(): number {
    let chi = 0;
    for (let i = 0; i < 3; i++) {
      chi += Math.pow(-1, i) * this.computeCohomology(i);
    }
    return chi;
  }

  public report(): CoherentSheafData {
    return {
      rank: this._rank,
      torsion: this._torsion,
      support: this._support,
      locallyFree: this._locallyFree,
      syzygies: this._syzygies,
    };
  }

  public setRank(r: number): void {
    this._rank = Math.max(0, r);
    this._locallyFree = this._rank > 0;
    this._modules = new Array(this._rank).fill(1);
  }

  public addTorsion(): void {
    this._torsion = true;
    this._locallyFree = false;
  }

  public isVectorBundle(): boolean {
    return this._locallyFree && !this._torsion;
  }

  public computeSyzygies(): number {
    this._syzygies = Math.max(0, this._projectiveDimension);
    return this._syzygies;
  }

  public setProjectiveDimension(dim: number): void {
    this._projectiveDimension = dim;
    this._syzygies = dim;
  }

  public reset(): void {
    this._torsion = false;
    this._globalSections = this._rank;
    this._projectiveDimension = 0;
    this._syzygies = 0;
  }
}
