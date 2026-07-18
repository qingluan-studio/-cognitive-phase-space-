export interface MaybeMonadData {
  hasValue: boolean;
  value: number;
  nothing: boolean;
  just: boolean;
  mapped: number;
}

export class MaybeMonad {
  private _hasValue: boolean;
  private _value: number;
  private _nothing: boolean;
  private _just: boolean;
  private _mapped: number;
  private _history: { value: number; present: boolean }[];
  private _defaultValue: number;

  constructor(initialValue?: number) {
    if (initialValue !== undefined && initialValue !== null) {
      this._hasValue = true;
      this._value = initialValue;
      this._nothing = false;
      this._just = true;
    } else {
      this._hasValue = false;
      this._value = 0;
      this._nothing = true;
      this._just = false;
    }
    this._mapped = 0;
    this._history = [];
    this._defaultValue = 0;
  }

  get hasValue(): boolean {
    return this._hasValue;
  }

  get value(): number {
    return this._value;
  }

  public just(value: number): MaybeMonad {
    this._hasValue = true;
    this._value = value;
    this._nothing = false;
    this._just = true;
    this._history.push({ value, present: true });
    if (this._history.length > 50) this._history.shift();
    return this;
  }

  public nothing(): MaybeMonad {
    this._hasValue = false;
    this._value = 0;
    this._nothing = true;
    this._just = false;
    this._history.push({ value: 0, present: false });
    if (this._history.length > 50) this._history.shift();
    return this;
  }

  public map(f: (x: number) => number): number {
    if (!this._hasValue) {
      this._mapped = 0;
      return 0;
    }
    this._mapped = f(this._value);
    return this._mapped;
  }

  public flatMap(f: (x: number) => number): number {
    if (!this._hasValue) return 0;
    return f(this._value);
  }

  public bind(f: (x: number) => number): number {
    return this.flatMap(f);
  }

  public orElse(defaultValue: number): number {
    return this._hasValue ? this._value : defaultValue;
  }

  public filter(predicate: (x: number) => boolean): boolean {
    return this._hasValue && predicate(this._value);
  }

  public getOrElse(defaultValue: number): number {
    this._defaultValue = defaultValue;
    return this._hasValue ? this._value : defaultValue;
  }

  public report(): MaybeMonadData {
    return {
      hasValue: this._hasValue,
      value: this._value,
      nothing: this._nothing,
      just: this._just,
      mapped: this._mapped,
    };
  }

  public isJust(): boolean {
    return this._just;
  }

  public isNothing(): boolean {
    return this._nothing;
  }

  public fromNullable(value: number | null | undefined): MaybeMonad {
    if (value === null || value === undefined) {
      return this.nothing();
    }
    return this.just(value);
  }

  public match(justFn: (x: number) => number, nothingFn: () => number): number {
    return this._hasValue ? justFn(this._value) : nothingFn();
  }

  public reset(): void {
    this._hasValue = false;
    this._value = 0;
    this._nothing = true;
    this._just = false;
    this._mapped = 0;
  }
}
