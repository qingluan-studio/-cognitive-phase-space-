/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 组合数学 —— 计数的艺术
 * Combinatorics: The Art of Counting
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 组合数学是离散世界的微积分。从阶乘到 Catalan 数，从 Burnside 引理到
 * 生成函数，每一种计数都是对可能性的精确丈量。
 */

import { DataPacket } from '../shared/types';

export interface Permutation {
  readonly elements: number[];
  readonly count: number;
  readonly withRepetition: boolean;
}

export interface Combination {
  readonly elements: number[];
  readonly r: number;
  readonly count: number;
  readonly withRepetition: boolean;
}

export interface GeneratingFunction {
  readonly expression: string;
  readonly sequence: number[];
  readonly type: 'ordinary' | 'exponential';
}

type ComboCache = {
  readonly id: string;
  readonly kind: 'permutation' | 'combination' | 'generating';
  readonly data: Permutation | Combination | GeneratingFunction;
};

export class Combinatorics {
  private _permutations: Permutation[] = [];
  private _combinations: Combination[] = [];
  private _generatingFunctions: GeneratingFunction[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _cache: Map<string, ComboCache> = new Map();

  get permutationCount(): number { return this._permutations.length; }
  get combinationCount(): number { return this._combinations.length; }
  get generatingFunctionCount(): number { return this._generatingFunctions.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 阶乘：n!
   * Factorial
   */
  public factorial(n: number): number {
    if (n < 0) return NaN;
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  /**
   * 排列数：P(n, r) = n! / (n-r)!
   * Permutation
   */
  public permutation(n: number, r: number): number {
    if (r > n || r < 0) return 0;
    let result = 1;
    for (let i = 0; i < r; i++) result *= (n - i);
    this._recordHistory(`permutation P(${n},${r}) = ${result}`);
    return result;
  }

  /**
   * 可重复排列：n^r
   * Permutation with repetition
   */
  public permutationWithRepetition(n: number, r: number): number {
    if (n < 0 || r < 0) return 0;
    const result = Math.pow(n, r);
    this._recordHistory(`permutationWithRepetition ${n}^${r} = ${result}`);
    return result;
  }

  /**
   * 组合数：C(n, r) = n! / (r!(n-r)!)
   * Combination
   */
  public combination(n: number, r: number): number {
    if (r > n || r < 0) return 0;
    if (r === 0 || r === n) return 1;
    r = Math.min(r, n - r);
    let result = 1;
    for (let i = 0; i < r; i++) {
      result = result * (n - i) / (i + 1);
    }
    this._recordHistory(`combination C(${n},${r}) = ${result}`);
    return result;
  }

  /**
   * 可重复组合：C(n+r-1, r)
   * Combination with repetition
   */
  public combinationWithRepetition(n: number, r: number): number {
    return this.combination(n + r - 1, r);
  }

  /**
   * 圆排列：(n-1)!
   * Circular permutation
   */
  public circularPermutation(n: number): number {
    if (n < 1) return 0;
    return this.factorial(n - 1);
  }

  /**
   * 错排数：D(n) = (n-1)(D(n-1) + D(n-2))
   * Derangement
   */
  public derangement(n: number): number {
    if (n === 0) return 1;
    if (n === 1) return 0;
    let d0 = 1;
    let d1 = 0;
    let d = 0;
    for (let i = 2; i <= n; i++) {
      d = (i - 1) * (d0 + d1);
      d0 = d1;
      d1 = d;
    }
    this._recordHistory(`derangement D(${n}) = ${d}`);
    return d;
  }

  /**
   * 第二类 Stirling 数：S(n, k) — 将 n 划分为 k 个非空子集
   * Stirling number of the second kind
   */
  public stirlingNumberSecond(n: number, k: number): number {
    if (k === 0 || k > n) return 0;
    if (k === 1 || k === n) return 1;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0));
    dp[0]![0] = 1;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= k; j++) {
        dp[i]![j] = j * dp[i - 1]![j]! + dp[i - 1]![j - 1]!;
      }
    }
    return dp[n]![k]!;
  }

  /**
   * 贝尔数：B(n) = Σ S(n, k)
   * Bell number
   */
  public bellNumber(n: number): number {
    if (n === 0) return 1;
    let sum = 0;
    for (let k = 1; k <= n; k++) sum += this.stirlingNumberSecond(n, k);
    this._recordHistory(`bellNumber B(${n}) = ${sum}`);
    return sum;
  }

  /**
   * 卡塔兰数：C(n) = (2n)! / ((n+1)! n!)
   * Catalan number
   */
  public catalanNumber(n: number): number {
    if (n < 0) return 0;
    if (n === 0) return 1;
    let result = 1;
    for (let i = 0; i < n; i++) {
      result = result * 2 * (2 * i + 1) / (i + 2);
    }
    this._recordHistory(`catalanNumber C(${n}) = ${result}`);
    return Math.round(result);
  }

  /**
   * 帕斯卡三角形
   * Pascal's triangle
   */
  public pascalsTriangle(rows: number): number[][] {
    if (rows <= 0) return [];
    const triangle: number[][] = [[1]];
    for (let i = 1; i < rows; i++) {
      const prev = triangle[i - 1]!;
      const row: number[] = [1];
      for (let j = 1; j < i; j++) {
        row.push(prev[j - 1]! + prev[j]!);
      }
      row.push(1);
      triangle.push(row);
    }
    this._recordHistory(`pascalsTriangle: ${rows} rows`);
    return triangle;
  }

  /**
   * 容斥原理：|A₁ ∪ A₂ ∪ ... ∪ Aₙ|
   * Inclusion-exclusion principle
   */
  public inclusionExclusion(sets: number[][]): number {
    const n = sets.length;
    const union = new Set<number>();
    for (const s of sets) for (const x of s) union.add(x);
    let result = 0;
    for (let mask = 1; mask < (1 << n); mask++) {
      let bits = 0;
      let intersection = null;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          bits++;
          const setI = new Set(sets[i]!);
          if (intersection === null) {
            intersection = setI;
          } else {
            intersection = new Set([...intersection].filter(x => setI.has(x)));
          }
        }
      }
      const size = intersection ? intersection.size : 0;
      result += (bits % 2 === 1 ? 1 : -1) * size;
    }
    this._recordHistory(`inclusionExclusion: ${n} sets -> ${result}`);
    return result;
  }

  /**
   * 鸽巢原理（最小值）
   * Pigeonhole principle
   */
  public pigeonhole(items: number, boxes: number): number {
    if (boxes <= 0) return 0;
    const result = Math.ceil(items / boxes);
    this._recordHistory(`pigeonhole: ${items} in ${boxes} -> min ${result}`);
    return result;
  }

  /**
   * 生成函数
   * Generating function (symbolic)
   */
  public generatingFunction(sequence: number[], type: 'ordinary' | 'exponential'): string {
    const terms = sequence.map((c, i) => {
      if (c === 0) return '';
      if (type === 'ordinary') {
        if (i === 0) return `${c}`;
        if (i === 1) return `${c}*x`;
        return `${c}*x^${i}`;
      }
      const fact = this.factorial(i);
      if (i === 0) return `${c}`;
      if (i === 1) return `${c}*x`;
      return `${c / fact}*x^${i}`;
    }).filter(t => t !== '').join(' + ');
    const expr = type === 'ordinary' ? `G(x) = ${terms}` : `E(x) = ${terms}`;
    const gf: GeneratingFunction = { expression: expr, sequence: [...sequence], type };
    this._generatingFunctions.push(gf);
    this._recordHistory(`generatingFunction (${type}): ${sequence.length} terms`);
    return expr;
  }

  /**
   * 递推关系求解（线性齐次，简化）
   * Solve recurrence relation (symbolic, simplified)
   */
  public solveRecurrence(relation: string, initial: number[]): string {
    const n = initial.length;
    const parts: string[] = initial.map((v, i) => `a(${i}) = ${v}`);
    parts.push(`Recurrence: ${relation}`);
    parts.push('Solution form: a(n) = c1*r1^n + c2*r2^n + ... (characteristic roots)');
    const result = parts.join('; ');
    this._recordHistory(`solveRecurrence: ${n} initial values`);
    return result;
  }

  /**
   * Burnside 引理：轨道数 = (1/|G|) Σ |Fix(g)|
   * Burnside's lemma
   */
  public burnsideLemma(group: number[][], set: number[]): number {
    const groupSize = group.length;
    if (groupSize === 0) return 0;
    let total = 0;
    for (const g of group) {
      let fixed = 0;
      for (const x of set) {
        if (g[x] === x) fixed++;
      }
      total += fixed;
    }
    const result = total / groupSize;
    this._recordHistory(`burnsideLemma: ${result} orbits`);
    return result;
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    permutations: Permutation[];
    combinations: Combination[];
    generatingFunctions: GeneratingFunction[];
    history: string[];
  }> {
    return {
      id: `combinatorics-${Date.now()}-${this._counter}`,
      payload: {
        permutations: [...this._permutations],
        combinations: [...this._combinations],
        generatingFunctions: [...this._generatingFunctions],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['discrete_math', 'combinatorics', 'result'],
        priority: 0.8,
        phase: 'analysis'
      }
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._permutations = [];
    this._combinations = [];
    this._generatingFunctions = [];
    this._history = [];
    this._cache.clear();
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
    this._counter++;
  }
}
