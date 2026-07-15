export interface InfinityGroupoidData {
  objects: number;
  morphisms: number;
  equivalences: number;
  homotopies: number;
  contractible: boolean;
}

export class InfinityGroupoid {
  private _objects: number;
  private _morphisms: number;
  private _equivalences: number;
  private _homotopies: number;
  private _contractible: boolean;
  private _higherEquivalences: number[][];
  private _homotopyGroups: number[];
  private _piZero: number;

  constructor(objects: number = 5) {
    this._objects = objects;
    this._morphisms = objects * objects;
    this._equivalences = objects;
    this._homotopies = 0;
    this._contractible = objects === 1;
    this._higherEquivalences = [];
    for (let i = 0; i < 5; i++) {
      const level = [];
      for (let j = 0; j < Math.pow(objects, i + 1); j++) {
        level.push(j);
      }
      this._higherEquivalences.push(level);
    }
    this._homotopyGroups = [];
    for (let i = 0; i < 5; i++) {
      this._homotopyGroups.push(i === 0 ? objects : 0);
    }
    this._piZero = objects;
  }

  get objects(): number {
    return this._objects;
  }

  get morphisms(): number {
    return this._morphisms;
  }

  get equivalences(): number {
    return this._equivalences;
  }

  get contractible(): boolean {
    return this._contractible;
  }

  public pi_n(n: number): number {
    if (n < 0 || n >= this._homotopyGroups.length) return 0;
    return this._homotopyGroups[n];
  }

  public setPi_n(n: number, value: number): void {
    if (n >= 0 && n < this._homotopyGroups.length) {
      this._homotopyGroups[n] = value;
      if (n === 0) this._piZero = value;
    }
  }

  public isEquivalence(morphism: number): boolean {
    return true;
  }

  public inverse(morphism: number): number {
    return morphism;
  }

  public homotopy(f: number, g: number): number {
    this._homotopies++;
    return Math.min(f, g);
  }

  public higherHomotopy(n: number): number {
    if (n < 0 || n >= this._higherEquivalences.length) return 0;
    return this._higherEquivalences[n].length;
  }

  public pathSpace(X: number): number {
    return X * X;
  }

  public loopSpace(X: number): number {
    return X;
  }

  public suspension(X: number): number {
    return X + 1;
  }

  public isContractible(): boolean {
    this._contractible = this._objects === 1;
    for (let i = 1; i < this._homotopyGroups.length; i++) {
      if (this._homotopyGroups[i] !== 0) {
        this._contractible = false;
        break;
      }
    }
    return this._contractible;
  }

  public report(): InfinityGroupoidData {
    return {
      objects: this._objects,
      morphisms: this._morphisms,
      equivalences: this._equivalences,
      homotopies: this._homotopies,
      contractible: this._contractible,
    };
  }

  public setObjects(n: number): void {
    this._objects = n;
    this._morphisms = n * n;
    this._equivalences = n;
    this._piZero = n;
    this._homotopyGroups[0] = n;
    this._contractible = n === 1;
  }

  public fundamentalInfinityGroupoid(space: number): number {
    return space;
  }

  public whiteheadTheorem(f: number): boolean {
    return true;
  }

  public reset(): void {
    this._homotopies = 0;
  }
}
