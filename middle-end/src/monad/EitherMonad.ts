export interface EitherMonadData {
  isRight: boolean;
  isLeft: boolean;
  rightValue: number;
  leftValue: string;
  mapped: number;
}

export class EitherMonad {
  private _isRight: boolean;
  private _isLeft: boolean;
  private _rightValue: number;
  private _leftValue: string;
  private _mapped: number;
  private _history: { right: boolean; value: number; error: string }[];
  private _errorCount: number;
  private _successCount: number;

  constructor() {
    this._isRight = false;
    this._isLeft = true;
    this._rightValue = 0;
    this._leftValue = '';
    this._mapped = 0;
    this._history = [];
    this._errorCount = 0;
    this._successCount = 0;
  }

  get isRight(): boolean {
    return this._isRight;
  }

  get isLeft(): boolean {
    return this._isLeft;
  }

  get rightValue(): number {
    return this._rightValue;
  }

  get leftValue(): string {
    return this._leftValue;
  }

  public right(value: number): EitherMonad {
    this._isRight = true;
    this._isLeft = false;
    this._rightValue = value;
    this._leftValue = '';
    this._successCount++;
    this._history.push({ right: true, value, error: '' });
    if (this._history.length > 50) this._history.shift();
    return this;
  }

  public left(error: string): EitherMonad {
    this._isRight = false;
    this._isLeft = true;
    this._rightValue = 0;
    this._leftValue = error;
    this._errorCount++;
    this._history.push({ right: false, value: 0, error });
    if (this._history.length > 50) this._history.shift();
    return this;
  }

  public map(f: (x: number) => number): number {
    if (this._isLeft) {
      this._mapped = 0;
      return 0;
    }
    this._mapped = f(this._rightValue);
    return this._mapped;
  }

  public flatMap(f: (x: number) => number): number {
    if (this._isLeft) return 0;
    return f(this._rightValue);
  }

  public bind(f: (x: number) => number): number {
    return this.flatMap(f);
  }

  public fold(leftFn: (e: string) => number, rightFn: (x: number) => number): number {
    return this._isRight ? rightFn(this._rightValue) : leftFn(this._leftValue);
  }

  public getOrElse(defaultValue: number): number {
    return this._isRight ? this._rightValue : defaultValue;
  }

  public orElse(other: EitherMonad): EitherMonad {
    return this._isRight ? this : other;
  }

  public report(): EitherMonadData {
    return {
      isRight: this._isRight,
      isLeft: this._isLeft,
      rightValue: this._rightValue,
      leftValue: this._leftValue,
      mapped: this._mapped,
    };
  }

  public swap(): void {
    if (this._isRight) {
      this.left(String(this._rightValue));
    } else {
      this.right(parseFloat(this._leftValue) || 0);
    }
  }

  public isLeft(): boolean {
    return this._isLeft;
  }

  public isRight(): boolean {
    return this._isRight;
  }

  public getErrorCount(): number {
    return this._errorCount;
  }

  public getSuccessCount(): number {
    return this._successCount;
  }

  public tryCatch(fn: () => number): EitherMonad {
    try {
      const result = fn();
      return this.right(result);
    } catch (e) {
      return this.left(String(e));
    }
  }

  public reset(): void {
    this._isRight = false;
    this._isLeft = true;
    this._rightValue = 0;
    this._leftValue = '';
    this._mapped = 0;
  }
}
