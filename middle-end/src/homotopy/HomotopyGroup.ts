export interface HomotopyGroupData {
  dimension: number;
  order: number;
  generators: number;
  abelian: boolean;
  trivial: boolean;
}

export class HomotopyGroup {
  private _dimension: number;
  private _order: number;
  private _generators: number;
  private _abelian: boolean;
  private _trivial: boolean;
  private _spaceType: string;
  private _homotopyClasses: number;
  private _basepoint: number[];

  constructor(spaceType: string = 'sphere', dimension: number = 1) {
    this._spaceType = spaceType;
    this._dimension = dimension;
    this._order = 0;
    this._generators = 0;
    this._abelian = true;
    this._trivial = false;
    this._homotopyClasses = 0;
    this._basepoint = [0];
    this._computeGroup();
  }

  get dimension(): number {
    return this._dimension;
  }

  get order(): number {
    return this._order;
  }

  get generators(): number {
    return this._generators;
  }

  get trivial(): boolean {
    return this._trivial;
  }

  private _computeGroup(): void {
    if (this._spaceType === 'sphere') {
      if (this._dimension === 0) {
        this._order = 2;
        this._generators = 1;
        this._trivial = false;
      } else if (this._dimension === 1) {
        this._order = 0;
        this._generators = 1;
        this._trivial = false;
      } else {
        this._trivial = false;
        this._generators = 1;
      }
      this._abelian = true;
      this._homotopyClasses = this._order || Infinity;
    } else if (this._spaceType === 'torus') {
      this._order = 0;
      this._generators = this._dimension;
      this._abelian = true;
      this._trivial = false;
    } else if (this._spaceType === 'contractible') {
      this._trivial = true;
      this._order = 1;
      this._generators = 0;
      this._abelian = true;
    }
  }

  public isHomotopic(loopA: number[], loopB: number[]): boolean {
    const windingA = this._computeWindingNumber(loopA);
    const windingB = this._computeWindingNumber(loopB);
    return windingA === windingB;
  }

  private _computeWindingNumber(loop: number[]): number {
    if (loop.length < 2) return 0;
    let winding = 0;
    for (let i = 0; i < loop.length - 1; i++) {
      const diff = loop[i + 1] - loop[i];
      if (diff > Math.PI) winding--;
      else if (diff < -Math.PI) winding++;
    }
    return winding;
  }

  public compose(homotopyClassA: number, homotopyClassB: number): number {
    return homotopyClassA + homotopyClassB;
  }

  public inverse(homotopyClass: number): number {
    return -homotopyClass;
  }

  public setSpace(type: string, dim: number): void {
    this._spaceType = type;
    this._dimension = dim;
    this._computeGroup();
  }

  public report(): HomotopyGroupData {
    return {
      dimension: this._dimension,
      order: this._order,
      generators: this._generators,
      abelian: this._abelian,
      trivial: this._trivial,
    };
  }

  public pi_n(n: number): number {
    if (this._spaceType === 'sphere') {
      if (n < this._dimension) return 0;
      if (n === this._dimension) return 1;
      if (n === this._dimension + 1 && this._dimension >= 2) return 2;
    }
    return 0;
  }

  public isSimplyConnected(): boolean {
    return this.pi_n(1) === 0;
  }

  public computeFundamentalGroup(): number {
    return this.pi_n(1);
  }

  public reset(): void {
    this._homotopyClasses = 0;
  }
}
