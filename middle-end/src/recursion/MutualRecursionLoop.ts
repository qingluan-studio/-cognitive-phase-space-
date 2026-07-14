/**
 * 互递归环模块：两个函数互相调用的无限循环。
 * A 调 B，B 调 A，构成互递归，靠终止条件打破环。
 */

export interface MutualRecursionLoopData {
  calls: number;
  alternations: number;
  terminated: boolean;
  lastCaller: string;
}

export class MutualRecursionLoop {
  private _calls: number;
  private _alternations: number;
  private _terminated: boolean;
  private _lastCaller: string;
  private _maxCalls: number;
  private _log: string[];

  constructor(maxCalls: number = 1000) {
    this._calls = 0;
    this._alternations = 0;
    this._terminated = false;
    this._lastCaller = '';
    this._maxCalls = maxCalls;
    this._log = [];
  }

  get calls(): number {
    return this._calls;
  }

  get terminated(): boolean {
    return this._terminated;
  }

  public runA(value: number): number {
    this._track('A');
    if (this._terminated) return value;
    if (value <= 0 || this._calls >= this._maxCalls) {
      this._terminated = true;
      return value;
    }
    return this.runB(value - 1);
  }

  public runB(value: number): number {
    this._track('B');
    if (this._terminated) return value;
    if (value <= 0 || this._calls >= this._maxCalls) {
      this._terminated = true;
      return value;
    }
    return this.runA(value - 2);
  }

  public setMax(c: number): void {
    this._maxCalls = Math.max(1, c);
  }

  public reset(): void {
    this._calls = 0;
    this._alternations = 0;
    this._terminated = false;
    this._lastCaller = '';
    this._log = [];
  }

  public trace(): string[] {
    return [...this._log];
  }

  public report(): MutualRecursionLoopData {
    return {
      calls: this._calls,
      alternations: this._alternations,
      terminated: this._terminated,
      lastCaller: this._lastCaller,
    };
  }

  private _track(caller: string): void {
    this._calls += 1;
    if (this._lastCaller && this._lastCaller !== caller) this._alternations += 1;
    this._lastCaller = caller;
    this._log.push(`${caller}#${this._calls}`);
  }
}
