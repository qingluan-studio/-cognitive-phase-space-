export interface LittleDisksOperadData {
  dimension: number;
  arity: number;
  configurations: number;
  contractible: boolean;
  framed: boolean;
}

export class LittleDisksOperad {
  private _dimension: number;
  private _arity: number;
  private _configurations: number;
  private _contractible: boolean;
  private _framed: boolean;
  private _disks: { x: number; y: number; r: number }[];
  private _configurationSpace: number;
  private _homotopyGroups: number[];

  constructor(dimension: number = 2, arity: number = 3) {
    this._dimension = dimension;
    this._arity = arity;
    this._configurations = 0;
    this._contractible = dimension > 2;
    this._framed = false;
    this._disks = [];
    for (let i = 0; i < arity; i++) {
      const angle = (2 * Math.PI * i) / arity;
      this._disks.push({
        x: 0.5 * Math.cos(angle),
        y: 0.5 * Math.sin(angle),
        r: 0.2,
      });
    }
    this._configurationSpace = this._computeConfigurationSpace();
    this._homotopyGroups = [];
    for (let i = 0; i < 5; i++) {
      this._homotopyGroups.push(dimension > i + 1 ? 0 : 1);
    }
  }

  get dimension(): number {
    return this._dimension;
  }

  get arity(): number {
    return this._arity;
  }

  get configurations(): number {
    return this._configurations;
  }

  get contractible(): boolean {
    return this._contractible;
  }

  private _computeConfigurationSpace(): number {
    let space = 1;
    for (let i = 0; i < this._arity; i++) {
      space *= this._dimension;
    }
    return space;
  }

  public addDisk(x: number, y: number, r: number): number {
    this._disks.push({ x, y, r });
    this._arity++;
    this._configurations++;
    this._configurationSpace = this._computeConfigurationSpace();
    return this._arity - 1;
  }

  public removeDisk(index: number): boolean {
    if (index < 0 || index >= this._disks.length) return false;
    this._disks.splice(index, 1);
    this._arity--;
    this._configurationSpace = this._computeConfigurationSpace();
    return true;
  }

  public compose(operadA: number, operadB: number, position: number): number {
    this._configurations++;
    return Math.min(operadA + operadB - 1, this._arity);
  }

  public checkContractibility(): boolean {
    this._contractible = this._dimension > 2;
    return this._contractible;
  }

  public setFramed(framed: boolean): void {
    this._framed = framed;
  }

  public isFramed(): boolean {
    return this._framed;
  }

  public getDisk(index: number): { x: number; y: number; r: number } | null {
    if (index < 0 || index >= this._disks.length) return null;
    return { ...this._disks[index] };
  }

  public report(): LittleDisksOperadData {
    return {
      dimension: this._dimension,
      arity: this._arity,
      configurations: this._configurations,
      contractible: this._contractible,
      framed: this._framed,
    };
  }

  public computeHomology(degree: number): number {
    if (degree === 0) return 1;
    if (this._dimension === 2) {
      return this._arity;
    }
    return degree < this._dimension - 1 ? 0 : 1;
  }

  public getHomotopyGroup(n: number): number {
    if (n < 0 || n >= this._homotopyGroups.length) return 0;
    return this._homotopyGroups[n];
  }

  public configurationSpaceDimension(): number {
    return this._configurationSpace;
  }

  public reset(): void {
    this._configurations = 0;
  }
}
