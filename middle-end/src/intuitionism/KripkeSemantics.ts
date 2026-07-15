export interface KripkeSemanticsData {
  worlds: number;
  accessibility: number;
  forcing: number;
  intuitionistic: boolean;
  modal: boolean;
}

export class KripkeSemantics {
  private _worlds: number;
  private _accessibility: number[][];
  private _forcing: boolean[][];
  private _intuitionistic: boolean;
  private _modal: boolean;
  private _worldNames: string[];
  private _propositions: string[];
  private _reflexive: boolean;
  private _transitive: boolean;

  constructor(worlds: number = 3, propositions: number = 2) {
    this._worlds = worlds;
    this._intuitionistic = true;
    this._modal = false;
    this._reflexive = true;
    this._transitive = true;
    this._worldNames = [];
    for (let i = 0; i < worlds; i++) {
      this._worldNames.push(`w_${i}`);
    }
    this._propositions = [];
    for (let i = 0; i < propositions; i++) {
      this._propositions.push(`p_${i}`);
    }
    this._accessibility = [];
    this._forcing = [];
    for (let i = 0; i < worlds; i++) {
      this._accessibility.push([]);
      this._forcing.push([]);
      for (let j = 0; j < worlds; j++) {
        this._accessibility[i].push(i <= j ? 1 : 0);
      }
      for (let j = 0; j < propositions; j++) {
        this._forcing[i].push(false);
      }
    }
  }

  get worlds(): number {
    return this._worlds;
  }

  get accessibility(): number {
    let count = 0;
    for (let i = 0; i < this._worlds; i++) {
      for (let j = 0; j < this._worlds; j++) {
        count += this._accessibility[i][j];
      }
    }
    return count;
  }

  get intuitionistic(): boolean {
    return this._intuitionistic;
  }

  public setForcing(world: number, prop: number, value: boolean): void {
    if (world >= 0 && world < this._worlds && prop >= 0 && prop < this._propositions.length) {
      this._forcing[world][prop] = value;
    }
  }

  public isForced(world: number, prop: number): boolean {
    if (world < 0 || world >= this._worlds) return false;
    if (prop < 0 || prop >= this._propositions.length) return false;
    return this._forcing[world][prop];
  }

  public isAccessible(from: number, to: number): boolean {
    if (from < 0 || from >= this._worlds) return false;
    if (to < 0 || to >= this._worlds) return false;
    return this._accessibility[from][to] === 1;
  }

  public addAccessibility(from: number, to: number): void {
    if (from >= 0 && from < this._worlds && to >= 0 && to < this._worlds) {
      this._accessibility[from][to] = 1;
    }
  }

  public forcesImplication(world: number, propA: number, propB: number): boolean {
    for (let w = 0; w < this._worlds; w++) {
      if (this.isAccessible(world, w)) {
        if (this.isForced(w, propA) && !this.isForced(w, propB)) {
          return false;
        }
      }
    }
    return true;
  }

  public forcesNegation(world: number, prop: number): boolean {
    for (let w = 0; w < this._worlds; w++) {
      if (this.isAccessible(world, w)) {
        if (this.isForced(w, prop)) {
          return false;
        }
      }
    }
    return true;
  }

  public isReflexive(): boolean {
    for (let i = 0; i < this._worlds; i++) {
      if (!this.isAccessible(i, i)) return false;
    }
    this._reflexive = true;
    return true;
  }

  public isTransitive(): boolean {
    for (let i = 0; i < this._worlds; i++) {
      for (let j = 0; j < this._worlds; j++) {
        if (this.isAccessible(i, j)) {
          for (let k = 0; k < this._worlds; k++) {
            if (this.isAccessible(j, k) && !this.isAccessible(i, k)) {
              return false;
            }
          }
        }
      }
    }
    this._transitive = true;
    return true;
  }

  public report(): KripkeSemanticsData {
    return {
      worlds: this._worlds,
      accessibility: this.accessibility,
      forcing: this._worlds * this._propositions.length,
      intuitionistic: this._intuitionistic,
      modal: this._modal,
    };
  }

  public addWorld(name: string): number {
    this._worlds++;
    this._worldNames.push(name);
    const newRow: number[] = new Array(this._worlds).fill(0);
    const newForcing: boolean[] = new Array(this._propositions.length).fill(false);
    this._accessibility.push(newRow);
    this._forcing.push(newForcing);
    for (let i = 0; i < this._worlds - 1; i++) {
      this._accessibility[i].push(0);
    }
    return this._worlds - 1;
  }

  public setModal(value: boolean): void {
    this._modal = value;
  }

  public reset(): void {
    this._reflexive = true;
    this._transitive = true;
  }
}
