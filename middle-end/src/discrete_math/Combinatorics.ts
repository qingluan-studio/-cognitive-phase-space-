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
      let intersection: Set<number> | null = null;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          bits++;
          const setI = new Set<number>(sets[i]!);
          if (intersection === null) {
            intersection = setI;
          } else {
            intersection = new Set<number>([...intersection].filter((x: number) => setI.has(x)));
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

  /**
   * 第一类 Stirling 数（无符号）：c(n, k) — n 个元素的 k 个循环排列
   * Stirling number of the first kind (unsigned)
   */
  public stirlingNumberFirst(n: number, k: number): number {
    if (k === 0 || k > n) return 0;
    if (k === n) return 1;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0));
    dp[0]![0] = 1;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= Math.min(i, k); j++) {
        dp[i]![j] = (i - 1) * dp[i - 1]![j]! + dp[i - 1]![j - 1]!;
      }
    }
    return dp[n]![k]!;
  }

  /**
   * 划分数：p(n) — 将 n 拆分为正整数之和的方式数
   * Partition function p(n)
   */
  public partitionNumber(n: number): number {
    if (n < 0) return 0;
    if (n === 0) return 1;
    const dp: number[] = new Array(n + 1).fill(0);
    dp[0] = 1;
    for (let i = 1; i <= n; i++) {
      for (let j = i; j <= n; j++) {
        dp[j] = dp[j]! + dp[j - i]!;
      }
    }
    this._recordHistory(`partitionNumber p(${n}) = ${dp[n]}`);
    return dp[n]!;
  }

  /**
   * 整数分拆（生成所有分拆）
   * Generate all integer partitions
   */
  public integerPartitions(n: number): number[][] {
    const result: number[][] = [];
    const current: number[] = [];
    const backtrack = (remaining: number, start: number) => {
      if (remaining === 0) {
        result.push([...current]);
        return;
      }
      for (let i = start; i <= remaining; i++) {
        current.push(i);
        backtrack(remaining - i, i);
        current.pop();
      }
    };
    backtrack(n, 1);
    this._recordHistory(`integerPartitions: ${n} -> ${result.length} partitions`);
    return result;
  }

  /**
   * 斐波那契数列
   * Fibonacci sequence
   */
  public fibonacci(n: number): number {
    if (n < 0) return NaN;
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    this._recordHistory(`fibonacci F(${n}) = ${b}`);
    return b;
  }

  /**
   * Lucas 数
   * Lucas numbers
   */
  public lucasNumber(n: number): number {
    if (n < 0) return NaN;
    if (n === 0) return 2;
    if (n === 1) return 1;
    let a = 2, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    this._recordHistory(`lucasNumber L(${n}) = ${b}`);
    return b;
  }

  /**
   * 全排列生成
   * Generate all permutations
   */
  public generatePermutations(arr: number[]): number[][] {
    const result: number[][] = [];
    const n = arr.length;
    const used = new Array(n).fill(false);
    const current: number[] = [];
    const backtrack = () => {
      if (current.length === n) {
        result.push([...current]);
        return;
      }
      for (let i = 0; i < n; i++) {
        if (used[i]) continue;
        if (i > 0 && arr[i] === arr[i - 1] && !used[i - 1]) continue;
        used[i] = true;
        current.push(arr[i]!);
        backtrack();
        current.pop();
        used[i] = false;
      }
    };
    backtrack();
    this._recordHistory(`generatePermutations: ${result.length} permutations`);
    return result;
  }

  /**
   * 下一个排列（字典序）
   * Next permutation in lexicographic order
   */
  public nextPermutation(arr: number[]): number[] | null {
    const n = arr.length;
    const result = [...arr];
    let i = n - 2;
    while (i >= 0 && result[i]! >= result[i + 1]!) i--;
    if (i < 0) return null;
    let j = n - 1;
    while (result[j]! <= result[i]!) j--;
    [result[i], result[j]] = [result[j]!, result[i]!];
    let left = i + 1, right = n - 1;
    while (left < right) {
      [result[left], result[right]] = [result[right]!, result[left]!];
      left++;
      right--;
    }
    this._recordHistory('nextPermutation: generated');
    return result;
  }

  /**
   * 组合生成
   * Generate all combinations of size k
   */
  public generateCombinations(arr: number[], k: number): number[][] {
    const result: number[][] = [];
    const n = arr.length;
    const current: number[] = [];
    const backtrack = (start: number) => {
      if (current.length === k) {
        result.push([...current]);
        return;
      }
      for (let i = start; i < n; i++) {
        current.push(arr[i]!);
        backtrack(i + 1);
        current.pop();
      }
    };
    backtrack(0);
    this._recordHistory(`generateCombinations: C(${n},${k}) = ${result.length}`);
    return result;
  }

  /**
   * 二项式定理展开
   * Binomial theorem expansion
   */
  public binomialTheorem(n: number): number[] {
    const coeffs: number[] = [];
    for (let k = 0; k <= n; k++) {
      coeffs.push(this.combination(n, k));
    }
    this._recordHistory(`binomialTheorem: (a+b)^${n} has ${coeffs.length} terms`);
    return coeffs;
  }

  /**
   * 多项式系数
   * Multinomial coefficient: n! / (k1! * k2! * ... * km!)
   */
  public multinomialCoefficient(n: number, ks: number[]): number {
    const sum = ks.reduce((a, b) => a + b, 0);
    if (sum !== n) return 0;
    let result = this.factorial(n);
    for (const k of ks) {
      result = result / this.factorial(k);
    }
    this._recordHistory(`multinomialCoefficient: ${result}`);
    return Math.round(result);
  }

  /**
   * 卡特兰数应用：括号化方案
   * Catalan number application: parenthesization
   */
  public catalanParenthesization(n: number): string[] {
    const result: string[] = [];
    const backtrack = (current: string, open: number, close: number) => {
      if (open === n && close === n) {
        result.push(current);
        return;
      }
      if (open < n) backtrack(current + '(', open + 1, close);
      if (close < open) backtrack(current + ')', open, close + 1);
    };
    backtrack('', 0, 0);
    this._recordHistory(`catalanParenthesization: ${result.length} ways`);
    return result;
  }

  /**
   * 卡特兰数应用：二叉搜索树结构数
   * Catalan number application: unique BST structures
   */
  public catalanBSTCount(n: number): number {
    const result = this.catalanNumber(n);
    this._recordHistory(`catalanBSTCount: ${n} nodes -> ${result} BSTs`);
    return result;
  }

  /**
   * 拉姆齐数（下界）
   * Ramsey number lower bound
   */
  public ramseyLowerBound(s: number, t: number): number {
    if (s <= 1 || t <= 1) return 1;
    if (s === 2) return t;
    if (t === 2) return s;
    const result = this.combination(s + t - 2, s - 1);
    this._recordHistory(`ramseyLowerBound: R(${s},${t}) >= ${result}`);
    return result;
  }

  /**
   * 容斥原理：错位排列验证
   * Inclusion-exclusion: derangement verification
   */
  public derangementViaInclusionExclusion(n: number): number {
    let result = 0;
    for (let k = 0; k <= n; k++) {
      const sign = k % 2 === 0 ? 1 : -1;
      result += sign * this.combination(n, k) * this.factorial(n - k);
    }
    this._recordHistory(`derangementViaInclusionExclusion: D(${n}) = ${result}`);
    return result;
  }

  /**
   * 球与盒子问题
   * Balls and boxes problems
   */
  public ballsIntoBoxes(
    balls: number,
    boxes: number,
    options: {
      distinguishableBalls?: boolean;
      distinguishableBoxes?: boolean;
      emptyAllowed?: boolean;
    } = {}
  ): number {
    const distBalls = options.distinguishableBalls ?? true;
    const distBoxes = options.distinguishableBoxes ?? true;
    const emptyAllowed = options.emptyAllowed ?? true;

    let result: number;
    if (distBalls && distBoxes) {
      if (emptyAllowed) {
        result = Math.pow(boxes, balls);
      } else {
        result = this.stirlingNumberSecond(balls, boxes) * this.factorial(boxes);
      }
    } else if (!distBalls && distBoxes) {
      if (emptyAllowed) {
        result = this.combinationWithRepetition(boxes, balls);
      } else {
        result = this.combination(balls - 1, boxes - 1);
      }
    } else if (distBalls && !distBoxes) {
      if (emptyAllowed) {
        let sum = 0;
        for (let k = 1; k <= Math.min(boxes, balls); k++) {
          sum += this.stirlingNumberSecond(balls, k);
        }
        result = sum;
      } else {
        result = this.stirlingNumberSecond(balls, boxes);
      }
    } else {
      if (emptyAllowed) {
        result = this._restrictedPartitions(balls, boxes);
      } else {
        result = this._restrictedPartitions(balls - boxes, boxes);
      }
    }
    this._recordHistory(`ballsIntoBoxes: ${balls} balls, ${boxes} boxes -> ${result}`);
    return result;
  }

  private _restrictedPartitions(n: number, k: number): number {
    if (n < 0 || k < 0) return 0;
    if (n === 0) return 1;
    if (k === 0) return 0;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0));
    dp[0]![0] = 1;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= Math.min(k, i); j++) {
        dp[i]![j] = dp[i - 1]![j - 1]! + dp[i - j]![j]!;
      }
    }
    let sum = 0;
    for (let j = 0; j <= k; j++) sum += dp[n]![j]!;
    return sum;
  }

  /**
   * 递推关系：特征方程法（二阶）
   * Solve linear recurrence: characteristic equation (2nd order)
   */
  public solveLinearRecurrence2(
    a: number,
    b: number,
    initial: [number, number]
  ): (n: number) => number {
    const discriminant = a * a + 4 * b;
    let fn: (n: number) => number;
    if (Math.abs(discriminant) < 1e-10) {
      const r = a / 2;
      const c1 = initial[0];
      const c2 = initial[1] / r - initial[0];
      fn = (n: number) => (c1 + c2 * n) * Math.pow(r, n);
    } else if (discriminant > 0) {
      const r1 = (a + Math.sqrt(discriminant)) / 2;
      const r2 = (a - Math.sqrt(discriminant)) / 2;
      const c2 = (initial[1] - initial[0] * r1) / (r2 - r1);
      const c1 = initial[0] - c2;
      fn = (n: number) => c1 * Math.pow(r1, n) + c2 * Math.pow(r2, n);
    } else {
      const real = a / 2;
      const imag = Math.sqrt(-discriminant) / 2;
      const r = Math.sqrt(real * real + imag * imag);
      const theta = Math.atan2(imag, real);
      const c1 = initial[0];
      const c2 = (initial[1] - initial[0] * real) / imag;
      fn = (n: number) => Math.pow(r, n) * (c1 * Math.cos(n * theta) + c2 * Math.sin(n * theta));
    }
    this._recordHistory('solveLinearRecurrence2: solved');
    return fn;
  }

  /**
   * 生成函数乘法
   * Generating function multiplication (convolution)
   */
  public generatingFunctionMultiply(a: number[], b: number[]): number[] {
    const n = a.length;
    const m = b.length;
    const result: number[] = new Array(n + m - 1).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        result[i + j] = (result[i + j] ?? 0) + a[i]! * b[j]!;
      }
    }
    this._recordHistory(`generatingFunctionMultiply: ${n} * ${m} -> ${result.length} terms`);
    return result;
  }

  /**
   * 指数生成函数
   * Exponential generating function coefficients
   */
  public exponentialGeneratingFunction(sequence: number[]): number[] {
    const result = sequence.map((a, n) => a / this.factorial(n));
    this._recordHistory(`exponentialGeneratingFunction: ${result.length} terms`);
    return result;
  }

  /**
   * 欧拉数：<n, m> — n 个元素排列中恰有 m 个上升的排列数
   * Eulerian number A(n, m)
   */
  public eulerianNumber(n: number, m: number): number {
    if (m < 0 || m >= n) return 0;
    if (n === 1) return 1;
    let result = 0;
    for (let k = 0; k <= m + 1; k++) {
      const sign = k % 2 === 0 ? 1 : -1;
      result += sign * this.combination(n + 1, k) * Math.pow(m + 1 - k, n);
    }
    this._recordHistory(`eulerianNumber A(${n},${m}) = ${result}`);
    return result;
  }

  /**
   * 伯努利数
   * Bernoulli numbers
   */
  public bernoulliNumber(n: number): number {
    if (n < 0) return NaN;
    const B: number[] = new Array(n + 1).fill(0);
    B[0] = 1;
    for (let m = 1; m <= n; m++) {
      let sum = 0;
      for (let k = 0; k < m; k++) {
        sum += this.combination(m, k) * B[k]! / (m - k + 1);
      }
      B[m] = 1 - sum;
    }
    this._recordHistory(`bernoulliNumber B(${n}) = ${B[n]}`);
    return B[n]!;
  }

  /**
   * 调和数
   * Harmonic numbers
   */
  public harmonicNumber(n: number): number {
    if (n < 0) return NaN;
    let result = 0;
    for (let i = 1; i <= n; i++) {
      result += 1 / i;
    }
    this._recordHistory(`harmonicNumber H(${n}) ≈ ${result.toFixed(6)}`);
    return result;
  }

  /**
   * 范德蒙德卷积
   * Vandermonde's identity
   */
  public vandermondeIdentity(m: number, n: number, k: number): number {
    let result = 0;
    for (let i = 0; i <= k; i++) {
      result += this.combination(m, i) * this.combination(n, k - i);
    }
    this._recordHistory(`vandermondeIdentity: C(${m}+${n},${k}) = ${result}`);
    return result;
  }

  /**
   * 鸽巢原理应用：生日问题
   * Pigeonhole principle: birthday problem
   */
  public birthdayProblem(people: number, days: number = 365): number {
    if (people <= 1) return 0;
    let probability = 1;
    for (let i = 0; i < people; i++) {
      probability *= (days - i) / days;
    }
    const result = 1 - probability;
    this._recordHistory(`birthdayProblem: ${people} people, P(shared) ≈ ${result.toFixed(6)}`);
    return result;
  }

  /**
   * 鸽巢原理应用：至少需要多少人才能保证至少 k 个人同生日
   * Pigeonhole: minimum people for k shared birthdays
   */
  public birthdayProblemMinPeople(k: number, days: number = 365): number {
    const result = (k - 1) * days + 1;
    this._recordHistory(`birthdayProblemMinPeople: ${k} shared -> ${result} people`);
    return result;
  }

  /**
   * 容斥原理：欧拉函数 φ(n)
   * Inclusion-exclusion: Euler's totient function
   */
  public eulerTotient(n: number): number {
    let result = n;
    let temp = n;
    for (let p = 2; p * p <= temp; p++) {
      if (temp % p === 0) {
        while (temp % p === 0) temp = Math.floor(temp / p);
        result -= Math.floor(result / p);
      }
    }
    if (temp > 1) result -= Math.floor(result / temp);
    this._recordHistory(`eulerTotient φ(${n}) = ${result}`);
    return result;
  }

  /**
   *  Möbius 函数
   * Möbius function
   */
  public mobiusFunction(n: number): number {
    if (n < 1) return 0;
    if (n === 1) return 1;
    let result = 1;
    let temp = n;
    for (let p = 2; p * p <= temp; p++) {
      if (temp % p === 0) {
        temp = Math.floor(temp / p);
        if (temp % p === 0) return 0;
        result = -result;
      }
    }
    if (temp > 1) result = -result;
    this._recordHistory(`mobiusFunction μ(${n}) = ${result}`);
    return result;
  }

  /**
   * 组合恒等式：朱世杰恒等式
   * Zhu Shijie's identity (hockey-stick identity)
   */
  public hockeyStickIdentity(n: number, r: number): number {
    const result = this.combination(n + 1, r + 1);
    this._recordHistory(`hockeyStickIdentity: ΣC(i,${r}) from i=${r} to ${n} = ${result}`);
    return result;
  }

  /**
   * 多重集合排列
   * Permutations of a multiset
   */
  public multisetPermutation(elements: number[]): number {
    const counts = new Map<number, number>();
    for (const x of elements) {
      counts.set(x, (counts.get(x) ?? 0) + 1);
    }
    let result = this.factorial(elements.length);
    for (const count of counts.values()) {
      result = result / this.factorial(count);
    }
    this._recordHistory(`multisetPermutation: ${Math.round(result)}`);
    return Math.round(result);
  }

  /**
   * 集合划分（生成所有划分）
   * Generate all set partitions
   */
  public generateSetPartitions(arr: number[]): number[][][] {
    const result: number[][][] = [];
    const n = arr.length;
    const current: number[][] = [];
    const backtrack = (index: number) => {
      if (index === n) {
        result.push(current.map(block => [...block]));
        return;
      }
      for (let i = 0; i < current.length; i++) {
        current[i]!.push(arr[index]!);
        backtrack(index + 1);
        current[i]!.pop();
      }
      current.push([arr[index]!]);
      backtrack(index + 1);
      current.pop();
    };
    backtrack(0);
    this._recordHistory(`generateSetPartitions: ${result.length} partitions`);
    return result;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
    this._counter++;
  }
}
