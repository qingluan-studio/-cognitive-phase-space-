export interface LogicOfParadoxData {
  values: number;
  designated: number[];
  theorems: number;
  inconsistencies: number;
  paraconsistent: boolean;
}

export class LogicOfParadox {
  private _values: number;
  private _designated: number[];
  private _theorems: number;
  private _inconsistencies: number;
  private _paraconsistent: boolean;
  private _propositions: { statement: string; value: number }[];
  private _truth: number;
  private _false: number;
  private _both: number;

  constructor() {
    this._values = 3;
    this._designated = [1, 2];
    this._theorems = 0;
    this._inconsistencies = 0;
    this._paraconsistent = true;
    this._propositions = [];
    this._truth = 1;
    this._false = 0;
    this._both = 2;
  }

  get values(): number {
    return this._values;
  }

  get theorems(): number {
    return this._theorems;
  }

  get inconsistencies(): number {
    return this._inconsistencies;
  }

  get paraconsistent(): boolean {
    return this._paraconsistent;
  }

  public addProposition(statement: string, value: number): number {
    this._propositions.push({ statement, value });
    if (value === this._both) {
      this._inconsistencies++;
    }
    return this._propositions.length - 1;
  }

  public true(): number {
    return this._truth;
  }

  public false(): number {
    return this._false;
  }

  public both(): number {
    return this._both;
  }

  public isTrue(value: number): boolean {
    return value === this._truth || value === this._both;
  }

  public isFalse(value: number): boolean {
    return value === this._false || value === this._both;
  }

  public isBoth(value: number): boolean {
    return value === this._both;
  }

  public not(value: number): number {
    switch (value) {
      case 0: return 1;
      case 1: return 0;
      case 2: return 2;
      default: return value;
    }
  }

  public and(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    if (a === 2 || b === 2) return 2;
    return 1;
  }

  public or(a: number, b: number): number {
    if (a === 1 || b === 1) return 1;
    if (a === 2 || b === 2) return 2;
    return 0;
  }

  public implies(a: number, b: number): number {
    return this.or(this.not(a), b);
  }

  public equivalent(a: number, b: number): number {
    return this.and(this.implies(a, b), this.implies(b, a));
  }

  public isDesignated(value: number): boolean {
    return this._designated.includes(value);
  }

  public isTheorem(value: number): boolean {
    if (this.isDesignated(value)) {
      this._theorems++;
      return true;
    }
    return false;
  }

  public exContradictioneQuodlibet(): boolean {
    return false;
  }

  public disjunctiveSyllogismValid(): boolean {
    return false;
  }

  public report(): LogicOfParadoxData {
    return {
      values: this._values,
      designated: [...this._designated],
      theorems: this._theorems,
      inconsistencies: this._inconsistencies,
      paraconsistent: this._paraconsistent,
    };
  }

  public getPropositions(): string[] {
    return this._propositions.map(p => p.statement);
  }

  public getValue(index: number): number {
    if (index < 0 || index >= this._propositions.length) return -1;
    return this._propositions[index].value;
  }

  public setDesignated(values: number[]): void {
    this._designated = [...values];
  }

  public reset(): void {
    this._theorems = 0;
    this._inconsistencies = 0;
    this._propositions = [];
  }
}
