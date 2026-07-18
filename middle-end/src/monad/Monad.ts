export interface MonadData {
  unit: number;
  bind: number;
  functorValue: number;
  monadicValue: number;
  associative: boolean;
}

export class Monad {
  private _unit: number;
  private _bind: number;
  private _functorValue: number;
  private _monadicValue: number;
  private _associative: boolean;
  private _type: string;
  private _values: number[];
  private _join: number;

  constructor(type: string = 'maybe') {
    this._type = type;
    this._unit = 1;
    this._bind = 1;
    this._functorValue = 0;
    this._monadicValue = 0;
    this._associative = true;
    this._values = [];
    this._join = 1;
  }

  get monadicValue(): number {
    return this._monadicValue;
  }

  get associative(): boolean {
    return this._associative;
  }

  public unit(value: number): number {
    this._monadicValue = value;
    this._values.push(value);
    if (this._values.length > 50) this._values.shift();
    return value;
  }

  public bind(value: number, f: (x: number) => number): number {
    const result = f(value);
    this._monadicValue = result;
    return result;
  }

  public map(value: number, f: (x: number) => number): number {
    return f(value);
  }

  public join(nested: number): number {
    this._join = nested;
    return nested;
  }

  public flatMap(value: number, f: (x: number) => number): number {
    return this.join(this.map(value, f));
  }

  public checkLeftIdentity(value: number, f: (x: number) => number): boolean {
    const left = this.bind(this.unit(value), f);
    const right = f(value);
    return Math.abs(left - right) < 0.001;
  }

  public checkRightIdentity(value: number): boolean {
    const result = this.bind(value, x => this.unit(x));
    return Math.abs(result - value) < 0.001;
  }

  public checkAssociativity(value: number, f: (x: number) => number, g: (x: number) => number): boolean {
    const left = this.bind(this.bind(value, f), g);
    const right = this.bind(value, x => this.bind(f(x), g));
    this._associative = Math.abs(left - right) < 0.001;
    return this._associative;
  }

  public report(): MonadData {
    return {
      unit: this._unit,
      bind: this._bind,
      functorValue: this._functorValue,
      monadicValue: this._monadicValue,
      associative: this._associative,
    };
  }

  public getType(): string {
    return this._type;
  }

  public setType(type: string): void {
    this._type = type;
  }

  public pure(value: number): number {
    return this.unit(value);
  }

  public ap(func: (x: number) => number, value: number): number {
    return func(value);
  }

  public liftM2(f: (a: number, b: number) => number, a: number, b: number): number {
    return this.bind(a, x => this.map(b, y => f(x, y)));
  }

  public filter(predicate: (x: number) => boolean, value: number): number {
    return predicate(value) ? value : 0;
  }

  public reset(): void {
    this._monadicValue = 0;
    this._values = [];
    this._associative = true;
  }
}
