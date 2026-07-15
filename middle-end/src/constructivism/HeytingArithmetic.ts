export interface HeytingArithmeticData {
  axioms: number;
  theorems: number;
  proofs: number;
  intuitionistic: boolean;
  naturalNumbers: number;
}

export class HeytingArithmetic {
  private _axioms: number;
  private _theorems: number;
  private _proofs: number;
  private _intuitionistic: boolean;
  private _naturalNumbers: number;
  private _provenTheorems: string[];
  private _inductionSchema: boolean;
  private _peanoLike: boolean;

  constructor() {
    this._axioms = 7;
    this._theorems = 0;
    this._proofs = 0;
    this._intuitionistic = true;
    this._naturalNumbers = 0;
    this._provenTheorems = [];
    this._inductionSchema = true;
    this._peanoLike = true;
  }

  get axioms(): number {
    return this._axioms;
  }

  get theorems(): number {
    return this._theorems;
  }

  get proofs(): number {
    return this._proofs;
  }

  get intuitionistic(): boolean {
    return this._intuitionistic;
  }

  public zero(): number {
    return 0;
  }

  public successor(n: number): number {
    return n + 1;
  }

  public add(a: number, b: number): number {
    return a + b;
  }

  public multiply(a: number, b: number): number {
    return a * b;
  }

  public isZero(n: number): boolean {
    return n === 0;
  }

  public eq(a: number, b: number): boolean {
    return a === b;
  }

  public induction(base: number, step: (n: number) => number, maxN: number): number {
    let result = base;
    for (let i = 0; i < maxN; i++) {
      result = step(i);
    }
    this._proofs++;
    return result;
  }

  public proveTheorem(theorem: string): number {
    this._theorems++;
    this._provenTheorems.push(theorem);
    return this._theorems - 1;
  }

  public isIntuitionistic(): boolean {
    return this._intuitionistic;
  }

  public excludesMiddle(): boolean {
    return false;
  }

  public markovPrinciple(predicate: (n: number) => boolean, n: number): boolean {
    return !predicate(n);
  }

  public report(): HeytingArithmeticData {
    return {
      axioms: this._axioms,
      theorems: this._theorems,
      proofs: this._proofs,
      intuitionistic: this._intuitionistic,
      naturalNumbers: this._naturalNumbers,
    };
  }

  public getProvenTheorems(): string[] {
    return [...this._provenTheorems];
  }

  public hasInduction(): boolean {
    return this._inductionSchema;
  }

  public peanoAxioms(): number {
    return this._axioms;
  }

  public setAxioms(n: number): void {
    this._axioms = n;
  }

  public reset(): void {
    this._theorems = 0;
    this._proofs = 0;
    this._naturalNumbers = 0;
    this._provenTheorems = [];
  }
}
