export interface SymmetryGroupData {
  order: number;
  dimension: number;
  generators: number;
  invariantCount: number;
  symmetryLevel: number;
}

export class SymmetryGroup {
  private _order: number;
  private _dimension: number;
  private _generators: number;
  private _invariantCount: number;
  private _symmetryLevel: number;
  private _elements: string[];
  private _groupType: string;
  private _identityIndex: number;

  constructor(order: number = 4, dimension: number = 2) {
    this._order = order;
    this._dimension = dimension;
    this._generators = Math.ceil(Math.log2(Math.max(order, 2)));
    this._invariantCount = 0;
    this._symmetryLevel = 1.0;
    this._elements = [];
    for (let i = 0; i < order; i++) {
      this._elements.push(`g_${i}`);
    }
    this._groupType = 'cyclic';
    this._identityIndex = 0;
  }

  get order(): number {
    return this._order;
  }

  get dimension(): number {
    return this._dimension;
  }

  get symmetryLevel(): number {
    return this._symmetryLevel;
  }

  get generators(): number {
    return this._generators;
  }

  public apply(element: number, state: number[]): number[] {
    const result = [...state];
    const n = result.length;
    if (this._groupType === 'cyclic') {
      const shift = element % n;
      for (let i = 0; i < n; i++) {
        result[i] = state[(i - shift + n) % n];
      }
    } else if (this._groupType === 'dihedral') {
      const rotation = element % n;
      const reflect = element >= n;
      for (let i = 0; i < n; i++) {
        const idx = reflect ? (n - i + rotation) % n : (i + rotation) % n;
        result[i] = state[idx];
      }
    }
    return result;
  }

  public checkInvariant(state: number[]): boolean {
    const transformed = this.apply(1, state);
    for (let i = 0; i < state.length; i++) {
      if (state[i] !== transformed[i]) return false;
    }
    return true;
  }

  public computeSymmetryMeasure(state: number[]): number {
    let symmetricCount = 0;
    for (let i = 0; i < this._order; i++) {
      const transformed = this.apply(i, state);
      let match = true;
      for (let j = 0; j < state.length; j++) {
        if (state[j] !== transformed[j]) {
          match = false;
          break;
        }
      }
      if (match) symmetricCount++;
    }
    this._symmetryLevel = symmetricCount / this._order;
    this._invariantCount = symmetricCount;
    return this._symmetryLevel;
  }

  public setGroupType(type: string): void {
    this._groupType = type;
    if (type === 'dihedral') {
      this._order = this._order * 2;
      this._elements = [];
      for (let i = 0; i < this._order; i++) {
        this._elements.push(`g_${i}`);
      }
    }
  }

  public report(): SymmetryGroupData {
    return {
      order: this._order,
      dimension: this._dimension,
      generators: this._generators,
      invariantCount: this._invariantCount,
      symmetryLevel: this._symmetryLevel,
    };
  }

  public compose(a: number, b: number): number {
    return (a + b) % this._order;
  }

  public inverse(element: number): number {
    return (this._order - element) % this._order;
  }

  public computeOrbit(point: number[]): number[][] {
    const orbit: number[][] = [];
    const seen = new Set<string>();
    for (let i = 0; i < this._order; i++) {
      const transformed = this.apply(i, point);
      const key = transformed.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        orbit.push(transformed);
      }
    }
    return orbit;
  }

  public isAbelian(): boolean {
    for (let i = 0; i < this._order; i++) {
      for (let j = 0; j < this._order; j++) {
        if (this.compose(i, j) !== this.compose(j, i)) {
          return false;
        }
      }
    }
    return true;
  }
}
