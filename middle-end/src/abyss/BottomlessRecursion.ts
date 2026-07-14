/**
 * 无底递归模块：永不到底的递归深渊。
 * 模拟一种受控的"无限"递归，通过迭代展开避免栈溢出，同时保留递归语义。
 */

export interface BottomlessRecursionData {
  depth: number;
  iterations: number;
  terminated: boolean;
  reason: string;
}

export class BottomlessRecursion {
  private _depth: number;
  private _iterations: number;
  private _maxIterations: number;
  private _memo: Map<number, number>;

  constructor(maxIterations: number = 100000) {
    this._depth = 0;
    this._iterations = 0;
    this._maxIterations = maxIterations;
    this._memo = new Map<number, number>();
  }

  get depth(): number {
    return this._depth;
  }

  get iterations(): number {
    return this._iterations;
  }

  public descend(seed: number): BottomlessRecursionData {
    let current = seed;
    let terminated = false;
    let reason = 'max-iterations-reached';
    this._iterations = 0;
    this._depth = 0;
    while (this._iterations < this._maxIterations) {
      this._iterations += 1;
      this._depth += 1;
      if (this._memo.has(current)) {
        terminated = true;
        reason = `cycle-detected@${current}`;
        break;
      }
      this._memo.set(current, this._depth);
      current = this._step(current);
      if (!Number.isFinite(current)) {
        terminated = true;
        reason = 'divergence';
        break;
      }
    }
    return { depth: this._depth, iterations: this._iterations, terminated, reason };
  }

  public reset(): void {
    this._depth = 0;
    this._iterations = 0;
    this._memo.clear();
  }

  public footprint(): number[] {
    return Array.from(this._memo.keys());
  }

  public summarize(): Record<string, unknown> {
    return {
      maxDepth: this._depth,
      totalIterations: this._iterations,
      uniqueStates: this._memo.size,
      capacity: this._maxIterations,
    };
  }

  public trampoline(initial: number, steps: number): number {
    let value = initial;
    for (let i = 0; i < steps; i += 1) {
      value = this._step(value);
    }
    return value;
  }

  private _step(n: number): number {
    if (n <= 1) return 1;
    return (n * 31 + 7) % 9973;
  }
}
