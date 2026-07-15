export interface HyperrealNumberData {
  value: number;
  infinitesimal: boolean;
  infinite: boolean;
  finite: boolean;
  standardPart: number;
}

export class HyperrealNumber {
  private _value: number;
  private _infinitesimal: boolean;
  private _infinite: boolean;
  private _finite: boolean;
  private _standardPart: number;
  private _epsilon: number;
  private _omega: number;
  private _ultrafilter: boolean;

  constructor(value: number = 0) {
    this._value = value;
    this._infinitesimal = Math.abs(value) < 1e-10 && value !== 0;
    this._infinite = !isFinite(value);
    this._finite = isFinite(value);
    this._standardPart = isFinite(value) ? value : 0;
    this._epsilon = 1e-10;
    this._omega = 1 / this._epsilon;
    this._ultrafilter = true;
  }

  get value(): number {
    return this._value;
  }

  get infinitesimal(): boolean {
    return this._infinitesimal;
  }

  get infinite(): boolean {
    return this._infinite;
  }

  get standardPart(): number {
    return this._standardPart;
  }

  public add(other: HyperrealNumber): HyperrealNumber {
    const result = new HyperrealNumber(this._value + other._value);
    return result;
  }

  public subtract(other: HyperrealNumber): HyperrealNumber {
    const result = new HyperrealNumber(this._value - other._value);
    return result;
  }

  public multiply(other: HyperrealNumber): HyperrealNumber {
    const result = new HyperrealNumber(this._value * other._value);
    return result;
  }

  public divide(other: HyperrealNumber): HyperrealNumber {
    if (other._value === 0) {
      return new HyperrealNumber(Infinity);
    }
    const result = new HyperrealNumber(this._value / other._value);
    return result;
  }

  public st(): number {
    if (!isFinite(this._value)) return 0;
    if (Math.abs(this._value) < 1e-10) return 0;
    this._standardPart = Math.round(this._value * 1e10) / 1e10;
    return this._standardPart;
  }

  public isInfinitesimal(): boolean {
    this._infinitesimal = Math.abs(this._value) < 1e-10 && this._value !== 0;
    return this._infinitesimal;
  }

  public isInfinite(): boolean {
    this._infinite = !isFinite(this._value);
    return this._infinite;
  }

  public isFinite(): boolean {
    this._finite = isFinite(this._value);
    return this._finite;
  }

  public reciprocal(): HyperrealNumber {
    if (this._value === 0) {
      return new HyperrealNumber(Infinity);
    }
    return new HyperrealNumber(1 / this._value);
  }

  public epsilon(): number {
    return this._epsilon;
  }

  public omega(): number {
    return this._omega;
  }

  public report(): HyperrealNumberData {
    return {
      value: this._value,
      infinitesimal: this._infinitesimal,
      infinite: this._infinite,
      finite: this._finite,
      standardPart: this._standardPart,
    };
  }

  public setValue(value: number): void {
    this._value = value;
    this._infinitesimal = Math.abs(value) < 1e-10 && value !== 0;
    this._infinite = !isFinite(value);
    this._finite = isFinite(value);
    this._standardPart = isFinite(value) ? value : 0;
  }

  public transfer(realFunction: (x: number) => number): HyperrealNumber {
    return new HyperrealNumber(realFunction(this._value));
  }

  public isAppreciable(): boolean {
    return this._finite && !this._infinitesimal;
  }

  public compare(other: HyperrealNumber): number {
    const diff = this._value - other._value;
    if (Math.abs(diff) < 1e-10) return 0;
    return diff > 0 ? 1 : -1;
  }

  public reset(): void {
    this._value = 0;
    this._infinitesimal = false;
    this._infinite = false;
    this._finite = true;
    this._standardPart = 0;
  }
}
