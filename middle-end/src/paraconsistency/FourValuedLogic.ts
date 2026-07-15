export interface FourValuedLogicData {
  truthValues: number;
  sentences: number;
  trueCount: number;
  falseCount: number;
  bothCount: number;
  noneCount: number;
}

export class FourValuedLogic {
  private _truthValues: number;
  private _sentences: number;
  private _trueCount: number;
  private _falseCount: number;
  private _bothCount: number;
  private _noneCount: number;
  private _values: number[];
  private _designated: number[];
  private _bilattice: boolean;

  constructor() {
    this._truthValues = 4;
    this._sentences = 0;
    this._trueCount = 0;
    this._falseCount = 0;
    this._bothCount = 0;
    this._noneCount = 0;
    this._values = [];
    this._designated = [1, 2];
    this._bilattice = true;
  }

  get truthValues(): number {
    return this._truthValues;
  }

  get sentences(): number {
    return this._sentences;
  }

  get bothCount(): number {
    return this._bothCount;
  }

  get noneCount(): number {
    return this._noneCount;
  }

  public addSentence(value: number): number {
    this._sentences++;
    this._values.push(value);
    switch (value) {
      case 0: this._noneCount++; break;
      case 1: this._trueCount++; break;
      case 2: this._bothCount++; break;
      case 3: this._falseCount++; break;
    }
    return this._sentences - 1;
  }

  public getValue(index: number): number {
    if (index < 0 || index >= this._sentences) return -1;
    return this._values[index];
  }

  public not(value: number): number {
    switch (value) {
      case 0: return 0;
      case 1: return 3;
      case 2: return 2;
      case 3: return 1;
      default: return value;
    }
  }

  public and(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    if (a === 2 && b === 2) return 2;
    if (a === 2 || b === 2) return 1;
    if (a === 3 || b === 3) return 3;
    return Math.min(a, b);
  }

  public or(a: number, b: number): number {
    if (a === 0 && b === 0) return 0;
    if (a === 2 || b === 2) return 2;
    if (a === 1 || b === 1) return 1;
    return 3;
  }

  public isDesignated(value: number): boolean {
    return this._designated.includes(value);
  }

  public isTrue(value: number): boolean {
    return value === 1 || value === 2;
  }

  public isFalse(value: number): boolean {
    return value === 3 || value === 2;
  }

  public isBoth(value: number): boolean {
    return value === 2;
  }

  public isNone(value: number): boolean {
    return value === 0;
  }

  public truthOrder(a: number, b: number): boolean {
    if (a === 0) return true;
    if (b === 0) return false;
    if (a === 2) return true;
    if (b === 2) return false;
    return a === 1 && b === 1;
  }

  public knowledgeOrder(a: number, b: number): boolean {
    if (a === 0 && b !== 0) return true;
    if (b === 0 && a !== 0) return false;
    if (a === 2 && b !== 2) return false;
    if (b === 2 && a !== 2) return true;
    return a === b;
  }

  public isBilattice(): boolean {
    return this._bilattice;
  }

  public report(): FourValuedLogicData {
    return {
      truthValues: this._truthValues,
      sentences: this._sentences,
      trueCount: this._trueCount,
      falseCount: this._falseCount,
      bothCount: this._bothCount,
      noneCount: this._noneCount,
    };
  }

  public setDesignated(values: number[]): void {
    this._designated = [...values];
  }

  public getDesignated(): number[] {
    return [...this._designated];
  }

  public reset(): void {
    this._sentences = 0;
    this._trueCount = 0;
    this._falseCount = 0;
    this._bothCount = 0;
    this._noneCount = 0;
    this._values = [];
  }
}
