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
  private _continuationStack: Array<(x: number) => number>;
  private _cpsAccumulator: Array<(k: (x: number) => number) => (x: number) => number>;
  private _stackTraceEntropy: number;
  private _tailCallRatio: number;

  constructor() {
    this._rewritten = 0;
    this._executed = 0;
    this._maxStackDepth = 1;
    this._tailOptimized = true;
    this._continuationStack = [];
    this._cpsAccumulator = [];
    this._stackTraceEntropy = 0;
    this._tailCallRatio = 1;
  }

  get tailOptimized(): boolean {
    return this._tailOptimized;
  }

  get rewrittenCount(): number {
    return this._rewritten;
  }

  get stackTraceEntropy(): number {
    return this._stackTraceEntropy;
  }

  get tailCallRatio(): number {
    return this._tailCallRatio;
  }

  public factorial(n: number): number {
    this._rewritten += 1;
    return this._factorialTail(n, 1);
  }

  private _factorialTail(n: number, acc: number): number {
    this._executed += 1;
    this._updateTailCallRatio(true);
    if (n <= 1) {
      return acc;
    }
    return this._factorialTail(n - 1, acc * n);
  }

  public fibonacci(n: number): number {
    this._rewritten += 1;
    return this._fibTail(n, 0, 1);
  }

  private _fibTail(n: number, a: number, b: number): number {
    this._executed += 1;
    this._updateTailCallRatio(true);
    if (n <= 0) {
      return a;
    }
    return this._fibTail(n - 1, b, a + b);
  }

  public sumRange(start: number, end: number): number {
    this._rewritten += 1;
    return this._sumTail(start, end, 0);
  }

  private _sumTail(start: number, end: number, acc: number): number {
    this._executed += 1;
    this._updateTailCallRatio(true);
    if (start > end) {
      return acc;
    }
    return this._sumTail(start + 1, end, acc + start);
  }

  public reset(): void {
    this._rewritten = 0;
    this._executed = 0;
    this._continuationStack = [];
    this._cpsAccumulator = [];
    this._stackTraceEntropy = 0;
    this._tailCallRatio = 1;
  }

  public report(): TailCallDreamerData {
    return {
      rewritten: this._rewritten,
      executed: this._executed,
      maxStackDepth: this._maxStackDepth,
      tailOptimized: this._tailOptimized,
    };
  }

  public trampoline(fn: () => number | (() => number)): number {
    let result: number | (() => number) = fn();
    while (typeof result === 'function') {
      result = (result as unknown as () => number | (() => number))();
    }
    return result;
  }

  public cpsFactorial(n: number, cont: (x: number) => number): number {
    this._rewritten += 1;
    this._cpsAccumulator.push((k) => (x) => k(x * n));
    if (n <= 1) {
      return cont(1);
    }
    return this.cpsFactorial(n - 1, (v) => cont(v * n));
  }

  public composeContinuations(): (x: number) => number {
    let composed: (x: number) => number = (x) => x;
    for (let i = this._cpsAccumulator.length - 1; i >= 0; i--) {
      const fn = this._cpsAccumulator[i];
      composed = fn(composed);
    }
    return composed;
  }

  public computeOptimalAccumulator(n: number, f: (acc: number, i: number) => number, seed: number): number {
    let acc = seed;
    for (let i = 1; i <= n; i++) {
      acc = f(acc, i);
      this._executed += 1;
    }
    this._rewritten += 1;
    this._updateTailCallRatio(true);
    return acc;
  }

  public verifyConstantStackDepth(trace: number[]): boolean {
    if (trace.length === 0) {
      return true;
    }
    const first = trace[0];
    return trace.every((d) => d === first);
  }

  public generateThunk(fn: () => number): () => number {
    return () => {
      this._executed += 1;
      return fn();
    };
  }

  private _updateTailCallRatio(isTail: boolean): void {
    const alpha = 0.95;
    this._tailCallRatio = alpha * this._tailCallRatio + (1 - alpha) * (isTail ? 1 : 0);
    this._updateStackTraceEntropy();
  }

  private _updateStackTraceEntropy(): void {
    const p = this._tailCallRatio;
    if (p <= 0 || p >= 1) {
      this._stackTraceEntropy = 0;
      return;
    }
    this._stackTraceEntropy = -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
  }
}
