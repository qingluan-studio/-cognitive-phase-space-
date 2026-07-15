export interface PriestLogicData {
  truthValues: number;
  designatedValues: number[];
  contradictions: number;
  sentences: number;
  paraconsistent: boolean;
}

export class PriestLogic {
  private _truthValues: number;
  private _designatedValues: number[];
  private _contradictions: number;
  private _sentences: number;
  private _paraconsistent: boolean;
  private _formulas: { formula: string; value: number }[];
  private _lp: boolean;
  private _glutLogic: boolean;

  constructor() {
    this._truthValues = 3;
    this._designatedValues = [1, 2];
    this._contradictions = 0;
    this._sentences = 0;
    this._paraconsistent = true;
    this._formulas = [];
    this._lp = true;
    this._glutLogic = true;
  }

  get truthValues(): number {
    return this._truthValues;
  }

  get contradictions(): number {
    return this._contradictions;
  }

  get sentences(): number {
    return this._sentences;
  }

  get paraconsistent(): boolean {
    return this._paraconsistent;
  }

  public addFormula(formula: string, value: number): number {
    this._sentences++;
    this._formulas.push({ formula, value });
    if (value === 2) {
      this._contradictions++;
    }
    return this._sentences - 1;
  }

  public isDesignated(value: number): boolean {
    return this._designatedValues.includes(value);
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

  public isTrue(value: number): boolean {
    return value === 1 || value === 2;
  }

  public isFalse(value: number): boolean {
    return value === 0 || value === 2;
  }

  public isBoth(value: number): boolean {
    return value === 2;
  }

  public isLP(): boolean {
    return this._lp;
  }

  public isGlutLogic(): boolean {
    return this._glutLogic;
  }

  public exFalsoQuodlibet(): boolean {
    return false;
  }

  public disjunctiveSyllogism(): boolean {
    return false;
  }

  public report(): PriestLogicData {
    return {
      truthValues: this._truthValues,
      designatedValues: [...this._designatedValues],
      contradictions: this._contradictions,
      sentences: this._sentences,
      paraconsistent: this._paraconsistent,
    };
  }

  public getFormulas(): string[] {
    return this._formulas.map(f => f.formula);
  }

  public getValue(index: number): number {
    if (index < 0 || index >= this._sentences) return -1;
    return this._formulas[index].value;
  }

  public setDesignated(values: number[]): void {
    this._designatedValues = [...values];
  }

  public reset(): void {
    this._contradictions = 0;
    this._sentences = 0;
    this._formulas = [];
  }
}
