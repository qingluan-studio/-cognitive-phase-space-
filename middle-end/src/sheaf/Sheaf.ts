export interface SheafData {
  baseSpace: number;
  stalks: number;
  sections: number;
  restrictionMaps: number;
  gluingAxiom: boolean;
}

export class Sheaf {
  private _baseSpace: number;
  private _stalks: number;
  private _sections: number;
  private _restrictionMaps: number;
  private _gluingAxiom: boolean;
  private _openSets: number[];
  private _stalkValues: number[];
  private _presheaf: boolean;

  constructor(baseSize: number = 10) {
    this._baseSpace = baseSize;
    this._stalks = baseSize;
    this._sections = 0;
    this._restrictionMaps = baseSize * (baseSize - 1) / 2;
    this._gluingAxiom = true;
    this._openSets = [];
    for (let i = 0; i < baseSize; i++) {
      this._openSets.push(i);
    }
    this._stalkValues = new Array(baseSize).fill(0);
    this._presheaf = true;
  }

  get baseSpace(): number {
    return this._baseSpace;
  }

  get stalks(): number {
    return this._stalks;
  }

  get sections(): number {
    return this._sections;
  }

  get gluingAxiom(): boolean {
    return this._gluingAxiom;
  }

  public restrict(section: number, openSetA: number, openSetB: number): number {
    const size = Math.min(openSetA, openSetB);
    return Math.floor(section * size / Math.max(openSetA, 1));
  }

  public setStalk(point: number, value: number): void {
    if (point >= 0 && point < this._stalks) {
      this._stalkValues[point] = value;
    }
  }

  public getStalk(point: number): number {
    if (point < 0 || point >= this._stalks) return 0;
    return this._stalkValues[point];
  }

  public addSection(openSet: number, value: number): void {
    this._sections++;
    if (openSet >= 0 && openSet < this._stalks) {
      this._stalkValues[openSet] = value;
    }
  }

  public glue(sections: number[], openSets: number[]): number {
    if (sections.length !== openSets.length) return -1;
    let glued = 0;
    for (let i = 0; i < sections.length; i++) {
      glued += sections[i];
    }
    this._gluingAxiom = true;
    return glued;
  }

  public checkIdentityAxiom(): boolean {
    return true;
  }

  public checkGluingAxiom(): boolean {
    return this._gluingAxiom;
  }

  public report(): SheafData {
    return {
      baseSpace: this._baseSpace,
      stalks: this._stalks,
      sections: this._sections,
      restrictionMaps: this._restrictionMaps,
      gluingAxiom: this._gluingAxiom,
    };
  }

  public computeCohomology(degree: number): number {
    if (degree === 0) return this._sections;
    if (degree === 1) return Math.floor(this._stalks / 2);
    return 0;
  }

  public isSheaf(): boolean {
    return this._presheaf && this._gluingAxiom;
  }

  public makeSheaf(): void {
    this._presheaf = true;
    this._gluingAxiom = true;
  }

  public reset(): void {
    this._sections = 0;
    this._stalkValues = new Array(this._stalks).fill(0);
  }
}
