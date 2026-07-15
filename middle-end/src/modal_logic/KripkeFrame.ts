export interface KripkeFrameData {
  worlds: number;
  accessibility: number;
  valuation: number;
  reflexive: boolean;
  transitive: boolean;
}

export class KripkeFrame {
  private _worlds: number;
  private _accessibility: number[][];
  private _valuation: Map<string, Set<number>>;
  private _reflexive: boolean;
  private _transitive: boolean;
  private _symmetric: boolean;
  private _serial: boolean;
  private _euclidean: boolean;

  constructor(worlds: number = 4) {
    this._worlds = worlds;
    this._valuation = new Map();
    this._reflexive = false;
    this._transitive = false;
    this._symmetric = false;
    this._serial = false;
    this._euclidean = false;
    this._accessibility = [];
    for (let i = 0; i < worlds; i++) {
      this._accessibility.push([]);
      for (let j = 0; j < worlds; j++) {
        this._accessibility[i].push(0);
      }
    }
  }

  get worlds(): number {
    return this._worlds;
  }

  get reflexive(): boolean {
    return this._reflexive;
  }

  get transitive(): boolean {
    return this._transitive;
  }

  get symmetric(): boolean {
    return this._symmetric;
  }

  public addAccessibility(from: number, to: number): void {
    if (from >= 0 && from < this._worlds && to >= 0 && to < this._worlds) {
      this._accessibility[from][to] = 1;
      this._checkProperties();
    }
  }

  public removeAccessibility(from: number, to: number): void {
    if (from >= 0 && from < this._worlds && to >= 0 && to < this._worlds) {
      this._accessibility[from][to] = 0;
      this._checkProperties();
    }
  }

  public isAccessible(from: number, to: number): boolean {
    if (from < 0 || from >= this._worlds) return false;
    if (to < 0 || to >= this._worlds) return false;
    return this._accessibility[from][to] === 1;
  }

  private _checkProperties(): void {
    this._reflexive = this._checkReflexive();
    this._transitive = this._checkTransitive();
    this._symmetric = this._checkSymmetric();
    this._serial = this._checkSerial();
    this._euclidean = this._checkEuclidean();
  }

  private _checkReflexive(): boolean {
    for (let i = 0; i < this._worlds; i++) {
      if (!this.isAccessible(i, i)) return false;
    }
    return true;
  }

  private _checkTransitive(): boolean {
    for (let i = 0; i < this._worlds; i++) {
      for (let j = 0; j < this._worlds; j++) {
        for (let k = 0; k < this._worlds; k++) {
          if (this.isAccessible(i, j) && this.isAccessible(j, k) && !this.isAccessible(i, k)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private _checkSymmetric(): boolean {
    for (let i = 0; i < this._worlds; i++) {
      for (let j = 0; j < this._worlds; j++) {
        if (this.isAccessible(i, j) && !this.isAccessible(j, i)) {
          return false;
        }
      }
    }
    return true;
  }

  private _checkSerial(): boolean {
    for (let i = 0; i < this._worlds; i++) {
      let hasSuccessor = false;
      for (let j = 0; j < this._worlds; j++) {
        if (this.isAccessible(i, j)) {
          hasSuccessor = true;
          break;
        }
      }
      if (!hasSuccessor) return false;
    }
    return true;
  }

  private _checkEuclidean(): boolean {
    for (let i = 0; i < this._worlds; i++) {
      for (let j = 0; j < this._worlds; j++) {
        for (let k = 0; k < this._worlds; k++) {
          if (this.isAccessible(i, j) && this.isAccessible(i, k) && !this.isAccessible(j, k)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  public setValuation(prop: string, worlds: number[]): void {
    this._valuation.set(prop, new Set(worlds));
  }

  public satisfies(world: number, prop: string): boolean {
    const worlds = this._valuation.get(prop);
    if (!worlds) return false;
    return worlds.has(world);
  }

  public box(world: number, prop: string): boolean {
    for (let w = 0; w < this._worlds; w++) {
      if (this.isAccessible(world, w) && !this.satisfies(w, prop)) {
        return false;
      }
    }
    return true;
  }

  public diamond(world: number, prop: string): boolean {
    for (let w = 0; w < this._worlds; w++) {
      if (this.isAccessible(world, w) && this.satisfies(w, prop)) {
        return true;
      }
    }
    return false;
  }

  public report(): KripkeFrameData {
    let accessCount = 0;
    for (let i = 0; i < this._worlds; i++) {
      for (let j = 0; j < this._worlds; j++) {
        accessCount += this._accessibility[i][j];
      }
    }
    return {
      worlds: this._worlds,
      accessibility: accessCount,
      valuation: this._valuation.size,
      reflexive: this._reflexive,
      transitive: this._transitive,
    };
  }

  public isSerial(): boolean {
    return this._serial;
  }

  public isEuclidean(): boolean {
    return this._euclidean;
  }

  public getModalSystem(): string {
    if (this._reflexive && this._transitive && this._symmetric) return 'S5';
    if (this._reflexive && this._transitive) return 'S4';
    if (this._reflexive) return 'T';
    if (this._serial) return 'D';
    if (this._transitive && this._euclidean) return 'K45';
    return 'K';
  }

  public reset(): void {
    this._valuation.clear();
  }
}
