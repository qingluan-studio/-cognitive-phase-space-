export interface ModalLogicData {
  worlds: number;
  accessibility: number;
  necessary: number;
  possible: number;
  axiomSystem: string;
}

export class ModalLogic {
  private _worlds: number;
  private _accessibility: number[][];
  private _necessary: number;
  private _possible: number;
  private _axiomSystem: string;
  private _propositions: { prop: string; worlds: boolean[] }[];
  private _reflexive: boolean;
  private _transitive: boolean;
  private _symmetric: boolean;

  constructor(worlds: number = 3) {
    this._worlds = worlds;
    this._necessary = 0;
    this._possible = 0;
    this._axiomSystem = 'K';
    this._propositions = [];
    this._reflexive = false;
    this._transitive = false;
    this._symmetric = false;
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

  get necessary(): number {
    return this._necessary;
  }

  get possible(): number {
    return this._possible;
  }

  get axiomSystem(): string {
    return this._axiomSystem;
  }

  public addAccessibility(from: number, to: number): void {
    if (from >= 0 && from < this._worlds && to >= 0 && to < this._worlds) {
      this._accessibility[from][to] = 1;
    }
  }

  public isAccessible(from: number, to: number): boolean {
    if (from < 0 || from >= this._worlds) return false;
    if (to < 0 || to >= this._worlds) return false;
    return this._accessibility[from][to] === 1;
  }

  public addProposition(prop: string, truthWorlds: boolean[]): number {
    this._propositions.push({ prop, worlds: [...truthWorlds] });
    return this._propositions.length - 1;
  }

  public necessary(world: number, propIndex: number): boolean {
    if (propIndex < 0 || propIndex >= this._propositions.length) return false;
    const prop = this._propositions[propIndex];
    for (let w = 0; w < this._worlds; w++) {
      if (this.isAccessible(world, w) && !prop.worlds[w]) {
        return false;
      }
    }
    this._necessary++;
    return true;
  }

  public possible(world: number, propIndex: number): boolean {
    if (propIndex < 0 || propIndex >= this._propositions.length) return false;
    const prop = this._propositions[propIndex];
    for (let w = 0; w < this._worlds; w++) {
      if (this.isAccessible(world, w) && prop.worlds[w]) {
        this._possible++;
        return true;
      }
    }
    return false;
  }

  public setAxiomSystem(system: string): void {
    this._axiomSystem = system;
    switch (system) {
      case 'T':
        this._reflexive = true;
        this._makeReflexive();
        break;
      case 'S4':
        this._reflexive = true;
        this._transitive = true;
        this._makeReflexive();
        this._makeTransitive();
        break;
      case 'S5':
        this._reflexive = true;
        this._transitive = true;
        this._symmetric = true;
        this._makeReflexive();
        this._makeTransitive();
        this._makeSymmetric();
        break;
      case 'B':
        this._reflexive = true;
        this._symmetric = true;
        this._makeReflexive();
        this._makeSymmetric();
        break;
    }
  }

  private _makeReflexive(): void {
    for (let i = 0; i < this._worlds; i++) {
      this._accessibility[i][i] = 1;
    }
  }

  private _makeTransitive(): void {
    for (let i = 0; i < this._worlds; i++) {
      for (let j = 0; j < this._worlds; j++) {
        for (let k = 0; k < this._worlds; k++) {
          if (this._accessibility[i][j] && this._accessibility[j][k]) {
            this._accessibility[i][k] = 1;
          }
        }
      }
    }
  }

  private _makeSymmetric(): void {
    for (let i = 0; i < this._worlds; i++) {
      for (let j = 0; j < this._worlds; j++) {
        if (this._accessibility[i][j]) {
          this._accessibility[j][i] = 1;
        }
      }
    }
  }

  public isReflexive(): boolean {
    return this._reflexive;
  }

  public isTransitive(): boolean {
    return this._transitive;
  }

  public isSymmetric(): boolean {
    return this._symmetric;
  }

  public report(): ModalLogicData {
    let accessCount = 0;
    for (let i = 0; i < this._worlds; i++) {
      for (let j = 0; j < this._worlds; j++) {
        accessCount += this._accessibility[i][j];
      }
    }
    return {
      worlds: this._worlds,
      accessibility: accessCount,
      necessary: this._necessary,
      possible: this._possible,
      axiomSystem: this._axiomSystem,
    };
  }

  public getPropositions(): string[] {
    return this._propositions.map(p => p.prop);
  }

  public addWorld(): number {
    this._worlds++;
    const newRow: number[] = new Array(this._worlds).fill(0);
    this._accessibility.push(newRow);
    for (let i = 0; i < this._worlds - 1; i++) {
      this._accessibility[i].push(0);
    }
    return this._worlds - 1;
  }

  public reset(): void {
    this._necessary = 0;
    this._possible = 0;
    this._propositions = [];
  }
}
