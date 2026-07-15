export interface TransfiniteNumberData {
  ordinal: number;
  cardinality: number;
  isLimit: boolean;
  isSuccessor: boolean;
  aleph: number;
}

export class TransfiniteNumber {
  private _ordinal: number;
  private _cardinality: number;
  private _isLimit: boolean;
  private _isSuccessor: boolean;
  private _aleph: number;
  private _omega: number;
  private _beth: number;
  private _cofinality: number;

  constructor(ordinal: number = 0) {
    this._ordinal = ordinal;
    this._cardinality = ordinal;
    this._isLimit = ordinal === 0 || ordinal === Infinity;
    this._isSuccessor = ordinal > 0 && ordinal !== Infinity;
    this._aleph = Math.floor(Math.log2(Math.max(ordinal, 1)));
    this._omega = Infinity;
    this._beth = 0;
    this._cofinality = ordinal === 0 ? 0 : 1;
  }

  get ordinal(): number {
    return this._ordinal;
  }

  get cardinality(): number {
    return this._cardinality;
  }

  get isLimit(): boolean {
    return this._isLimit;
  }

  get aleph(): number {
    return this._aleph;
  }

  public successor(): number {
    this._ordinal++;
    this._cardinality = this._ordinal;
    this._isSuccessor = true;
    this._isLimit = false;
    this._cofinality = 1;
    return this._ordinal;
  }

  public add(n: number): number {
    this._ordinal += n;
    this._cardinality = Math.max(this._cardinality, this._ordinal);
    this._isSuccessor = n > 0;
    this._isLimit = false;
    return this._ordinal;
  }

  public multiply(n: number): number {
    this._ordinal *= n;
    this._cardinality = Math.max(this._cardinality, this._ordinal);
    return this._ordinal;
  }

  public power(n: number): number {
    this._ordinal = Math.pow(this._ordinal, n);
    this._cardinality = Math.max(this._cardinality, this._ordinal);
    return this._ordinal;
  }

  public isSuccessorOrdinal(): boolean {
    return this._isSuccessor;
  }

  public isLimitOrdinal(): boolean {
    return this._isLimit;
  }

  public alephNumber(n: number): number {
    this._aleph = n;
    this._cardinality = Math.pow(2, n);
    return this._cardinality;
  }

  public bethNumber(n: number): number {
    this._beth = n;
    let result = 1;
    for (let i = 0; i < n; i++) {
      result = Math.pow(2, result);
    }
    this._cardinality = result;
    return result;
  }

  public cofinality(): number {
    return this._cofinality;
  }

  public isRegular(): boolean {
    return this._cofinality === this._cardinality;
  }

  public isAccessible(): boolean {
    return this._cofinality < this._cardinality;
  }

  public report(): TransfiniteNumberData {
    return {
      ordinal: this._ordinal,
      cardinality: this._cardinality,
      isLimit: this._isLimit,
      isSuccessor: this._isSuccessor,
      aleph: this._aleph,
    };
  }

  public omega(): number {
    return this._omega;
  }

  public setOrdinal(n: number): void {
    this._ordinal = n;
    this._cardinality = n;
    this._isLimit = n === 0 || n === Infinity;
    this._isSuccessor = n > 0 && n !== Infinity;
    this._cofinality = n === 0 ? 0 : 1;
  }

  public cantorNormalForm(): number[] {
    const form: number[] = [];
    let n = this._ordinal;
    let exp = 0;
    while (n > 0) {
      if (n % 2 === 1) {
        form.push(exp);
      }
      n = Math.floor(n / 2);
      exp++;
    }
    return form.reverse();
  }

  public reset(): void {
    this._ordinal = 0;
    this._cardinality = 0;
    this._isLimit = true;
    this._isSuccessor = false;
    this._aleph = 0;
    this._beth = 0;
  }
}
