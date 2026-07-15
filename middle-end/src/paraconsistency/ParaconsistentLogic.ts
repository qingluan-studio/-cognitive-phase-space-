export interface ParaconsistentLogicData {
  theorems: number;
  contradictions: number;
  trivial: boolean;
  explosive: boolean;
  consistent: boolean;
}

export class ParaconsistentLogic {
  private _theorems: number;
  private _contradictions: number;
  private _trivial: boolean;
  private _explosive: boolean;
  private _consistent: boolean;
  private _formulas: string[];
  private _inferenceRules: number;
  private _consequenceRelation: number;

  constructor() {
    this._theorems = 0;
    this._contradictions = 0;
    this._trivial = false;
    this._explosive = false;
    this._consistent = true;
    this._formulas = [];
    this._inferenceRules = 8;
    this._consequenceRelation = 0;
  }

  get theorems(): number {
    return this._theorems;
  }

  get contradictions(): number {
    return this._contradictions;
  }

  get trivial(): boolean {
    return this._trivial;
  }

  get explosive(): boolean {
    return this._explosive;
  }

  public addTheorem(theorem: string): number {
    this._theorems++;
    this._formulas.push(theorem);
    return this._theorems - 1;
  }

  public addContradiction(contradiction: string): number {
    this._contradictions++;
    this._consistent = false;
    this._formulas.push(contradiction);
    return this._contradictions - 1;
  }

  public exFalso(): boolean {
    return this._explosive;
  }

  public disjunctiveSyllogism(): boolean {
    return false;
  }

  public modusPonens(): boolean {
    return true;
  }

  public andIntro(a: boolean, b: boolean): boolean {
    return a && b;
  }

  public andElimLeft(a: boolean, b: boolean): boolean {
    return a;
  }

  public andElimRight(a: boolean, b: boolean): boolean {
    return b;
  }

  public orIntroLeft(a: boolean): boolean {
    return true;
  }

  public orIntroRight(b: boolean): boolean {
    return true;
  }

  public reductioAdAbsurdum(): boolean {
    return false;
  }

  public contraposition(): boolean {
    return false;
  }

  public isConsistent(): boolean {
    return this._consistent;
  }

  public isTrivial(): boolean {
    return this._trivial;
  }

  public isNonTrivial(): boolean {
    return !this._trivial;
  }

  public isParaconsistent(): boolean {
    return !this._explosive;
  }

  public report(): ParaconsistentLogicData {
    return {
      theorems: this._theorems,
      contradictions: this._contradictions,
      trivial: this._trivial,
      explosive: this._explosive,
      consistent: this._consistent,
    };
  }

  public getFormulas(): string[] {
    return [...this._formulas];
  }

  public setExplosive(value: boolean): void {
    this._explosive = value;
  }

  public makeTrivial(): void {
    this._trivial = true;
  }

  public consequenceCount(): number {
    return this._consequenceRelation;
  }

  public reset(): void {
    this._theorems = 0;
    this._contradictions = 0;
    this._trivial = false;
    this._consistent = true;
    this._formulas = [];
    this._consequenceRelation = 0;
  }
}
