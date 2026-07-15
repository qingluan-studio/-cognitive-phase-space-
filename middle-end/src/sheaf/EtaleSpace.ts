export interface EtaleSpaceData {
  baseSpace: number;
  totalSpace: number;
  fibers: number;
  localHomeomorphism: boolean;
  discreteFibers: boolean;
}

export class EtaleSpace {
  private _baseSpace: number;
  private _totalSpace: number;
  private _fibers: number;
  private _localHomeomorphism: boolean;
  private _discreteFibers: boolean;
  private _projection: number;
  private _stalks: number[][];
  private _openSetsTotal: number;

  constructor(baseSize: number = 10, fiberSize: number = 5) {
    this._baseSpace = baseSize;
    this._totalSpace = baseSize * fiberSize;
    this._fibers = fiberSize;
    this._localHomeomorphism = true;
    this._discreteFibers = true;
    this._projection = fiberSize;
    this._stalks = [];
    for (let i = 0; i < baseSize; i++) {
      const stalk = [];
      for (let j = 0; j < fiberSize; j++) {
        stalk.push(i * fiberSize + j);
      }
      this._stalks.push(stalk);
    }
    this._openSetsTotal = baseSize * fiberSize;
  }

  get baseSpace(): number {
    return this._baseSpace;
  }

  get totalSpace(): number {
    return this._totalSpace;
  }

  get fibers(): number {
    return this._fibers;
  }

  get localHomeomorphism(): boolean {
    return this._localHomeomorphism;
  }

  public project(point: number): number {
    return Math.floor(point / this._projection);
  }

  public lift(basePoint: number, fiberIndex: number): number {
    if (basePoint < 0 || basePoint >= this._baseSpace) return -1;
    if (fiberIndex < 0 || fiberIndex >= this._fibers) return -1;
    return basePoint * this._projection + fiberIndex;
  }

  public getStalk(point: number): number[] {
    const base = this.project(point);
    if (base < 0 || base >= this._baseSpace) return [];
    return [...this._stalks[base]];
  }

  public isLocalHomeomorphism(): boolean {
    return this._localHomeomorphism;
  }

  public section(value: number): number[] {
    const result = [];
    for (let i = 0; i < this._baseSpace; i++) {
      result.push(value);
    }
    return result;
  }

  public computeSheafSections(): number {
    return this._fibers;
  }

  public report(): EtaleSpaceData {
    return {
      baseSpace: this._baseSpace,
      totalSpace: this._totalSpace,
      fibers: this._fibers,
      localHomeomorphism: this._localHomeomorphism,
      discreteFibers: this._discreteFibers,
    };
  }

  public setFiberSize(size: number): void {
    this._fibers = Math.max(1, size);
    this._totalSpace = this._baseSpace * this._fibers;
    this._projection = this._fibers;
    this._stalks = [];
    for (let i = 0; i < this._baseSpace; i++) {
      const stalk = [];
      for (let j = 0; j < this._fibers; j++) {
        stalk.push(i * this._fibers + j);
      }
      this._stalks.push(stalk);
    }
  }

  public areFibersDiscrete(): boolean {
    return this._discreteFibers;
  }

  public isEtaleMorphism(): boolean {
    return this._localHomeomorphism;
  }

  public reset(): void {
    this._openSetsTotal = this._baseSpace * this._fibers;
  }
}
