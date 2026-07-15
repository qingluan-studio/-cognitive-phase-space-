export interface HeytingAlgebraData {
  elements: number;
  operations: number;
  join: number;
  meet: number;
  pseudocomplement: number;
}

export class HeytingAlgebra {
  private _elements: number;
  private _operations: number;
  private _join: number;
  private _meet: number;
  private _pseudocomplement: number;
  private _values: number[];
  private _top: number;
  private _bottom: number;
  private _distributive: boolean;

  constructor(size: number = 3) {
    this._elements = size;
    this._operations = 0;
    this._join = 0;
    this._meet = 0;
    this._pseudocomplement = 0;
    this._values = [];
    for (let i = 0; i < size; i++) {
      this._values.push(i);
    }
    this._top = size - 1;
    this._bottom = 0;
    this._distributive = true;
  }

  get elements(): number {
    return this._elements;
  }

  get operations(): number {
    return this._operations;
  }

  get top(): number {
    return this._top;
  }

  get bottom(): number {
    return this._bottom;
  }

  public join(a: number, b: number): number {
    this._operations++;
    this._join++;
    return Math.max(a, b);
  }

  public meet(a: number, b: number): number {
    this._operations++;
    this._meet++;
    return Math.min(a, b);
  }

  public implies(a: number, b: number): number {
    this._operations++;
    return a <= b ? this._top : b;
  }

  public pseudocomplement(a: number): number {
    this._operations++;
    this._pseudocomplement++;
    return this.implies(a, this._bottom);
  }

  public negation(a: number): number {
    return this.pseudocomplement(a);
  }

  public isTop(a: number): boolean {
    return a === this._top;
  }

  public isBottom(a: number): boolean {
    return a === this._bottom;
  }

  public compare(a: number, b: number): number {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }

  public isLessOrEqual(a: number, b: number): boolean {
    return a <= b;
  }

  public isBoolean(): boolean {
    for (let i = 0; i < this._elements; i++) {
      const neg = this.pseudocomplement(i);
      if (this.join(i, neg) !== this._top) {
        return false;
      }
    }
    return true;
  }

  public isHeyting(): boolean {
    return this._distributive && this._elements >= 2;
  }

  public isDistributive(): boolean {
    return this._distributive;
  }

  public checkDistributivity(): boolean {
    for (let a = 0; a < this._elements; a++) {
      for (let b = 0; b < this._elements; b++) {
        for (let c = 0; c < this._elements; c++) {
          const left = this.meet(a, this.join(b, c));
          const right = this.join(this.meet(a, b), this.meet(a, c));
          if (left !== right) {
            this._distributive = false;
            return false;
          }
        }
      }
    }
    this._distributive = true;
    return true;
  }

  public report(): HeytingAlgebraData {
    return {
      elements: this._elements,
      operations: this._operations,
      join: this._join,
      meet: this._meet,
      pseudocomplement: this._pseudocomplement,
    };
  }

  public addElement(): number {
    this._elements++;
    this._values.push(this._elements - 1);
    this._top = this._elements - 1;
    return this._elements - 1;
  }

  public equivalence(a: number, b: number): number {
    return this.meet(this.implies(a, b), this.implies(b, a));
  }

  public getValues(): number[] {
    return [...this._values];
  }

  public reset(): void {
    this._operations = 0;
    this._join = 0;
    this._meet = 0;
    this._pseudocomplement = 0;
  }
}
