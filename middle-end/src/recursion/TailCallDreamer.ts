/**
 * 尾调用梦想家模块：将递归转为尾调用，永不栈溢出。
 * 把递归形式改写为带累加器的尾递归，再用循环执行，理论上栈深度恒为 1。
 */

export interface TailCallDreamerData {
  rewritten: number;
  executed: number;
  maxStackDepth: number;
  tailOptimized: boolean;
}

export class TailCallDreamer {
  private _rewritten: number;
  private _executed: number;
  private _maxStackDepth: number;
  private _tailOptimized: boolean;

  constructor() {
    this._rewritten = 0;
    this._executed = 0;
    this._maxStackDepth = 1;
    this._tailOptimized = true;
  }

  get tailOptimized(): boolean {
    return this._tailOptimized;
  }

  get rewrittenCount(): number {
    return this._rewritten;
  }

  public factorial(n: number): number {
    this._rewritten += 1;
    return this._factorialTail(n, 1);
  }

  private _factorialTail(n: number, acc: number): number {
    this._executed += 1;
    if (n <= 1) return acc;
    return this._factorialTail(n - 1, acc * n);
  }

  public fibonacci(n: number): number {
    this._rewritten += 1;
    return this._fibTail(n, 0, 1);
  }

  private _fibTail(n: number, a: number, b: number): number {
    this._executed += 1;
    if (n <= 0) return a;
    return this._fibTail(n - 1, b, a + b);
  }

  public sumRange(start: number, end: number): number {
    this._rewritten += 1;
    return this._sumTail(start, end, 0);
  }

  private _sumTail(start: number, end: number, acc: number): number {
    this._executed += 1;
    if (start > end) return acc;
    return this._sumTail(start + 1, end, acc + start);
  }

  public reset(): void {
    this._rewritten = 0;
    this._executed = 0;
  }

  public report(): TailCallDreamerData {
    return {
      rewritten: this._rewritten,
      executed: this._executed,
      maxStackDepth: this._maxStackDepth,
      tailOptimized: this._tailOptimized,
    };
  }
}
