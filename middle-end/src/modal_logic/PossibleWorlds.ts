export interface PossibleWorldsData {
  worlds: number;
  actualWorld: number;
  accessibility: number;
  possibilities: number;
  necessities: number;
}

export class PossibleWorlds {
  private _worlds: number;
  private _actualWorld: number;
  private _accessibility: number[][];
  private _possibilities: number;
  private _necessities: number;
  private _worldNames: string[];
  private _propositions: Map<string, boolean[]>;
  private _counterfactuals: number;

  constructor(worlds: number = 5) {
    this._worlds = worlds;
    this._actualWorld = 0;
    this._possibilities = 0;
    this._necessities = 0;
    this._counterfactuals = 0;
    this._worldNames = [];
    this._propositions = new Map();
    this._accessibility = [];
    for (let i = 0; i < worlds; i++) {
      this._worldNames.push(`w${i}`);
      this._accessibility.push([]);
      for (let j = 0; j < worlds; j++) {
        this._accessibility[i].push(1);
      }
    }
  }

  get worlds(): number {
    return this._worlds;
  }

  get actualWorld(): number {
    return this._actualWorld;
  }

  get possibilities(): number {
    return this._possibilities;
  }

  get necessities(): number {
    return this._necessities;
  }

  public setActualWorld(world: number): void {
    if (world >= 0 && world < this._worlds) {
      this._actualWorld = world;
    }
  }

  public addAccessibility(from: number, to: number): void {
    if (from >= 0 && from < this._worlds && to >= 0 && to < this._worlds) {
      this._accessibility[from][to] = 1;
    }
  }

  public removeAccessibility(from: number, to: number): void {
    if (from >= 0 && from < this._worlds && to >= 0 && to < this._worlds) {
      this._accessibility[from][to] = 0;
    }
  }

  public isAccessible(from: number, to: number): boolean {
    if (from < 0 || from >= this._worlds) return false;
    if (to < 0 || to >= this._worlds) return false;
    return this._accessibility[from][to] === 1;
  }

  public addProposition(name: string, truthValues: boolean[]): void {
    this._propositions.set(name, [...truthValues]);
  }

  public isTrueAt(world: number, proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    if (world < 0 || world >= this._worlds) return false;
    return values[world];
  }

  public necessarily(proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    for (let w = 0; w < this._worlds; w++) {
      if (this.isAccessible(this._actualWorld, w) && !values[w]) {
        return false;
      }
    }
    this._necessities++;
    return true;
  }

  public possibly(proposition: string): boolean {
    const values = this._propositions.get(proposition);
    if (!values) return false;
    for (let w = 0; w < this._worlds; w++) {
      if (this.isAccessible(this._actualWorld, w) && values[w]) {
        this._possibilities++;
        return true;
      }
    }
    return false;
  }

  public counterfactual(antecedent: string, consequent: string): boolean {
    this._counterfactuals++;
    let closestWorld = -1;
    let minDistance = Infinity;
    for (let w = 0; w < this._worlds; w++) {
      if (this.isTrueAt(w, antecedent)) {
        const distance = Math.abs(w - this._actualWorld);
        if (distance < minDistance) {
          minDistance = distance;
          closestWorld = w;
        }
      }
    }
    if (closestWorld === -1) return true;
    return this.isTrueAt(closestWorld, consequent);
  }

  public report(): PossibleWorldsData {
    let accessCount = 0;
    for (let i = 0; i < this._worlds; i++) {
      for (let j = 0; j < this._worlds; j++) {
        accessCount += this._accessibility[i][j];
      }
    }
    return {
      worlds: this._worlds,
      actualWorld: this._actualWorld,
      accessibility: accessCount,
      possibilities: this._possibilities,
      necessities: this._necessities,
    };
  }

  public getWorldNames(): string[] {
    return [...this._worldNames];
  }

  public addWorld(name: string): number {
    this._worlds++;
    this._worldNames.push(name);
    const newRow: number[] = new Array(this._worlds).fill(0);
    this._accessibility.push(newRow);
    for (let i = 0; i < this._worlds - 1; i++) {
      this._accessibility[i].push(0);
    }
    return this._worlds - 1;
  }

  public getCounterfactualCount(): number {
    return this._counterfactuals;
  }

  public reset(): void {
    this._possibilities = 0;
    this._necessities = 0;
    this._counterfactuals = 0;
  }
}
