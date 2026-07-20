/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 级数 —— 无穷和的诗学
 * Series Calculus: The Poetics of Infinite Sums
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 级数是无穷项的有序求和，是连接离散与连续的桥梁。从调和级数到 p 级数，
 * 从泰勒级数到傅里叶级数，每一次收敛都是无穷向有限的优雅投降。
 */

import { DataPacket } from '../shared/types';

export interface SeriesResult {
  readonly expression: string;
  readonly terms: number[];
  readonly partialSums: number[];
  readonly convergent: boolean;
  readonly sum: number;
  readonly test: string;
}

export interface PowerSeries {
  readonly coefficients: number[];
  readonly center: number;
  readonly radiusOfConvergence: number;
  readonly intervalOfConvergence: [number, number];
}

export interface FourierSeries {
  readonly function_: string;
  readonly period: number;
  readonly a0: number;
  readonly an: number[];
  readonly bn: number[];
  readonly order: number;
}

export interface ConvergenceTestResult {
  readonly testName: string;
  readonly convergent: boolean;
  readonly conditionallyConvergent?: boolean;
  readonly details: string;
  readonly limit?: number;
}

type SeriesCache = {
  readonly id: string;
  readonly type: 'number' | 'power' | 'taylor' | 'fourier';
  readonly data: unknown;
};

export class SeriesCalculus {
  private _series: Map<string, SeriesCache> = new Map();
  private _results: SeriesResult[] = [];
  private _powerSeries: PowerSeries[] = [];
  private _fourierSeries: FourierSeries[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get seriesCount(): number { return this._series.size; }
  get resultCount(): number { return this._results.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 等比级数：Σ arⁿ = a / (1-r), |r| < 1
   * Geometric series
   */
  public geometricSeries(a: number, r: number, n: number = 50): SeriesResult {
    const terms: number[] = [];
    const partialSums: number[] = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const term = a * Math.pow(r, i);
      terms.push(term);
      sum += term;
      partialSums.push(sum);
    }
    const convergent = Math.abs(r) < 1;
    const exactSum = convergent ? a / (1 - r) : Infinity;
    const result: SeriesResult = {
      expression: `${a} * ${r}^n`,
      terms,
      partialSums,
      convergent,
      sum: exactSum,
      test: 'ratio-test'
    };
    this._results.push(result);
    this._recordHistory(`geometricSeries: r=${r}, convergent=${convergent}`);
    return result;
  }

  /**
   * 调和级数：Σ 1/n（发散）
   * Harmonic series
   */
  public harmonicSeries(n: number = 100): SeriesResult {
    const terms: number[] = [];
    const partialSums: number[] = [];
    let sum = 0;
    for (let i = 1; i <= n; i++) {
      const term = 1 / i;
      terms.push(term);
      sum += term;
      partialSums.push(sum);
    }
    const result: SeriesResult = {
      expression: '1/n',
      terms,
      partialSums,
      convergent: false,
      sum: Infinity,
      test: 'integral-test'
    };
    this._results.push(result);
    this._recordHistory('harmonicSeries: divergent');
    return result;
  }

  /**
   * p 级数：Σ 1/nᵖ, p > 1 收敛
   * p-series
   */
  public pSeries(p: number, n: number = 1000): SeriesResult {
    const terms: number[] = [];
    const partialSums: number[] = [];
    let sum = 0;
    for (let i = 1; i <= n; i++) {
      const term = 1 / Math.pow(i, p);
      terms.push(term);
      sum += term;
      partialSums.push(sum);
    }
    const convergent = p > 1;
    const zetaApprox = convergent ? sum : Infinity;
    const result: SeriesResult = {
      expression: `1/n^${p}`,
      terms,
      partialSums,
      convergent,
      sum: zetaApprox,
      test: 'integral-test'
    };
    this._results.push(result);
    this._recordHistory(`pSeries: p=${p}, convergent=${convergent}`);
    return result;
  }

  /**
   * 交错 p 级数：Σ (-1)ⁿ⁺¹ / nᵖ
   * Alternating p-series
   */
  public alternatingPSeries(p: number, n: number = 1000): SeriesResult {
    const terms: number[] = [];
    const partialSums: number[] = [];
    let sum = 0;
    for (let i = 1; i <= n; i++) {
      const sign = i % 2 === 1 ? 1 : -1;
      const term = sign / Math.pow(i, p);
      terms.push(term);
      sum += term;
      partialSums.push(sum);
    }
    const convergent = p > 0;
    const absolutelyConvergent = p > 1;
    const result: SeriesResult = {
      expression: `(-1)^(n+1)/n^${p}`,
      terms,
      partialSums,
      convergent,
      sum: sum,
      test: absolutelyConvergent ? 'absolute-convergence' : 'leibniz-test'
    };
    this._results.push(result);
    this._recordHistory(`alternatingPSeries: p=${p}, convergent=${convergent}`);
    return result;
  }

  /**
   * 比值判别法
   * Ratio test
   */
  public ratioTest(terms: number[]): ConvergenceTestResult {
    const n = terms.length;
    if (n < 2) {
      return { testName: 'ratio', convergent: false, details: 'insufficient terms' };
    }
    const ratios: number[] = [];
    for (let i = 1; i < n; i++) {
      if (Math.abs(terms[i - 1]) < 1e-15) continue;
      ratios.push(Math.abs(terms[i] / terms[i - 1]));
    }
    const limit = ratios.length > 0 ? ratios[ratios.length - 1]! : 1;
    const convergent = limit < 1;
    const details = limit < 1 ? 'converges absolutely' : limit > 1 ? 'diverges' : 'inconclusive';
    this._recordHistory(`ratioTest: L=${limit.toFixed(4)}, ${details}`);
    return { testName: 'ratio', convergent, details, limit };
  }

  /**
   * 根值判别法
   * Root test
   */
  public rootTest(terms: number[]): ConvergenceTestResult {
    const n = terms.length;
    if (n === 0) {
      return { testName: 'root', convergent: false, details: 'insufficient terms' };
    }
    const limits: number[] = [];
    for (let i = 0; i < n; i++) {
      limits.push(Math.pow(Math.abs(terms[i]), 1 / (i + 1)));
    }
    const limit = limits[limits.length - 1]!;
    const convergent = limit < 1;
    const details = limit < 1 ? 'converges absolutely' : limit > 1 ? 'diverges' : 'inconclusive';
    this._recordHistory(`rootTest: L=${limit.toFixed(4)}, ${details}`);
    return { testName: 'root', convergent, details, limit };
  }

  /**
   * 积分判别法
   * Integral test
   */
  public integralTest(
    fn: (n: number) => number,
    maxN: number = 10000
  ): ConvergenceTestResult {
    let integralApprox = 0;
    for (let i = 1; i <= maxN; i++) {
      integralApprox += fn(i);
    }
    const partialSums: number[] = [];
    let sum = 0;
    for (let i = 1; i <= Math.min(100, maxN); i++) {
      sum += fn(i);
      partialSums.push(sum);
    }
    const lastDiff = partialSums.length >= 2
      ? Math.abs(partialSums[partialSums.length - 1] - partialSums[partialSums.length - 2])
      : 1;
    const convergent = lastDiff < 0.001 && partialSums.length > 10;
    this._recordHistory(`integralTest: ${convergent ? 'convergent' : 'divergent'}`);
    return { testName: 'integral', convergent, details: convergent ? 'series converges' : 'series diverges' };
  }

  /**
   * 交错级数判别法（Leibniz test）
   * Alternating series test
   */
  public alternatingSeriesTest(
    positiveTerms: number[],
    signs: number[]
  ): ConvergenceTestResult {
    const n = positiveTerms.length;
    if (n < 2) {
      return { testName: 'leibniz', convergent: false, details: 'insufficient terms' };
    }
    let decreasing = true;
    for (let i = 1; i < n; i++) {
      if (positiveTerms[i]! > positiveTerms[i - 1]!) {
        decreasing = false;
        break;
      }
    }
    const limitZero = positiveTerms[n - 1]! < 1e-6;
    const convergent = decreasing && limitZero;
    this._recordHistory(`alternatingSeriesTest: decreasing=${decreasing}, limit→0=${limitZero}`);
    return {
      testName: 'leibniz',
      convergent,
      conditionallyConvergent: convergent,
      details: convergent ? 'conditionally convergent' : 'test fails'
    };
  }

  /**
   * 比较判别法
   * Comparison test
   */
  public comparisonTest(
    termsA: number[],
    termsB: number[],
    bConvergent: boolean
  ): ConvergenceTestResult {
    const n = Math.min(termsA.length, termsB.length);
    let aLessThanB = true;
    for (let i = 0; i < n; i++) {
      if (Math.abs(termsA[i]) > Math.abs(termsB[i])) {
        aLessThanB = false;
        break;
      }
    }
    let convergent = false;
    let details = '';
    if (aLessThanB && bConvergent) {
      convergent = true;
      details = 'converges by comparison test';
    } else if (!aLessThanB && !bConvergent) {
      convergent = false;
      details = 'diverges by comparison test';
    } else {
      details = 'inconclusive';
    }
    this._recordHistory(`comparisonTest: ${details}`);
    return { testName: 'comparison', convergent, details };
  }

  /**
   * 极限比较判别法
   * Limit comparison test
   */
  public limitComparisonTest(
    termsA: number[],
    termsB: number[]
  ): ConvergenceTestResult {
    const n = Math.min(termsA.length, termsB.length);
    const ratios: number[] = [];
    for (let i = 0; i < n; i++) {
      if (Math.abs(termsB[i]) > 1e-15) {
        ratios.push(Math.abs(termsA[i] / termsB[i]));
      }
    }
    const limit = ratios.length > 0 ? ratios[ratios.length - 1]! : 0;
    const details = limit > 0 && limit < Infinity
      ? 'both series converge or both diverge'
      : 'inconclusive';
    this._recordHistory(`limitComparisonTest: L=${limit.toFixed(4)}`);
    return { testName: 'limit-comparison', convergent: false, details, limit };
  }

  /**
   * 绝对收敛判定
   * Absolute convergence test
   */
  public absoluteConvergenceTest(terms: number[]): ConvergenceTestResult {
    const absTerms = terms.map(t => Math.abs(t));
    const ratioResult = this.ratioTest(absTerms);
    if (ratioResult.convergent) {
      return { testName: 'absolute-convergence', convergent: true, details: 'absolutely convergent' };
    }
    return { testName: 'absolute-convergence', convergent: false, details: 'not absolutely convergent' };
  }

  /**
   * 幂级数收敛半径
   * Radius of convergence for power series
   */
  public radiusOfConvergence(coefficients: number[]): number {
    const n = coefficients.length;
    if (n < 2) return Infinity;
    const ratios: number[] = [];
    for (let i = 1; i < n; i++) {
      if (Math.abs(coefficients[i]) > 1e-15) {
        const ratio = Math.abs(coefficients[i - 1] / coefficients[i]);
        ratios.push(ratio);
      }
    }
    if (ratios.length === 0) return Infinity;
    const R = ratios[ratios.length - 1]!;
    this._recordHistory(`radiusOfConvergence: R=${R.toFixed(4)}`);
    return isFinite(R) ? R : Infinity;
  }

  /**
   * 泰勒级数展开
   * Taylor series expansion
   */
  public taylorSeries(
    f: (x: number) => number,
    a: number,
    order: number = 10,
    h: number = 1e-4
  ): PowerSeries {
    const coefficients: number[] = [];
    for (let n = 0; n <= order; n++) {
      const derivative = this._nthDerivative(f, a, n, h);
      const factorial = this._factorial(n);
      coefficients.push(derivative / factorial);
    }
    const R = this.radiusOfConvergence(coefficients);
    const series: PowerSeries = {
      coefficients,
      center: a,
      radiusOfConvergence: R,
      intervalOfConvergence: [a - R, a + R]
    };
    this._powerSeries.push(series);
    this._recordHistory(`taylorSeries: order=${order}, center=${a}`);
    return series;
  }

  /**
   * 麦克劳林级数
   * Maclaurin series (Taylor at 0)
   */
  public maclaurinSeries(
    f: (x: number) => number,
    order: number = 10
  ): PowerSeries {
    const result = this.taylorSeries(f, 0, order);
    this._recordHistory(`maclaurinSeries: order=${order}`);
    return result;
  }

  /**
   * 幂级数求值
   * Evaluate power series at a point
   */
  public evaluatePowerSeries(series: PowerSeries, x: number): number {
    let sum = 0;
    for (let n = 0; n < series.coefficients.length; n++) {
      sum += series.coefficients[n]! * Math.pow(x - series.center, n);
    }
    this._recordHistory(`evaluatePowerSeries at x=${x}: ${sum}`);
    return sum;
  }

  /**
   * 傅里叶级数（实函数，周期 2L）
   * Fourier series for a real function with period 2L
   */
  public fourierSeries(
    f: (x: number) => number,
    L: number,
    order: number = 10
  ): FourierSeries {
    const period = 2 * L;
    let a0 = 0;
    const an: number[] = [];
    const bn: number[] = [];
    const samples = 2000;
    const dx = period / samples;
    a0 = (1 / L) * this._integrate(f, -L, L, samples);
    for (let n = 1; n <= order; n++) {
      const cosFn = (x: number) => f(x) * Math.cos(n * Math.PI * x / L);
      const sinFn = (x: number) => f(x) * Math.sin(n * Math.PI * x / L);
      an.push((1 / L) * this._integrate(cosFn, -L, L, samples));
      bn.push((1 / L) * this._integrate(sinFn, -L, L, samples));
    }
    const result: FourierSeries = {
      function_: 'f(x)',
      period,
      a0,
      an,
      bn,
      order
    };
    this._fourierSeries.push(result);
    this._recordHistory(`fourierSeries: order=${order}, period=${period}`);
    return result;
  }

  /**
   * 傅里叶级数求值
   * Evaluate Fourier series at a point
   */
  public evaluateFourierSeries(fs: FourierSeries, x: number): number {
    let sum = fs.a0 / 2;
    const L = fs.period / 2;
    for (let n = 1; n <= fs.order; n++) {
      sum += fs.an[n - 1]! * Math.cos(n * Math.PI * x / L);
      sum += fs.bn[n - 1]! * Math.sin(n * Math.PI * x / L);
    }
    return sum;
  }

  /**
   * 傅里叶正弦级数
   * Fourier sine series (odd extension)
   */
  public fourierSineSeries(
    f: (x: number) => number,
    L: number,
    order: number = 10
  ): FourierSeries {
    const samples = 1000;
    const bn: number[] = [];
    for (let n = 1; n <= order; n++) {
      const sinFn = (x: number) => f(x) * Math.sin(n * Math.PI * x / L);
      bn.push((2 / L) * this._integrate(sinFn, 0, L, samples));
    }
    const result: FourierSeries = {
      function_: 'f(x) (odd extension)',
      period: 2 * L,
      a0: 0,
      an: new Array(order).fill(0),
      bn,
      order
    };
    this._fourierSeries.push(result);
    this._recordHistory(`fourierSineSeries: order=${order}`);
    return result;
  }

  /**
   * 傅里叶余弦级数
   * Fourier cosine series (even extension)
   */
  public fourierCosineSeries(
    f: (x: number) => number,
    L: number,
    order: number = 10
  ): FourierSeries {
    const samples = 1000;
    const an: number[] = [];
    const a0 = (2 / L) * this._integrate(f, 0, L, samples);
    for (let n = 1; n <= order; n++) {
      const cosFn = (x: number) => f(x) * Math.cos(n * Math.PI * x / L);
      an.push((2 / L) * this._integrate(cosFn, 0, L, samples));
    }
    const result: FourierSeries = {
      function_: 'f(x) (even extension)',
      period: 2 * L,
      a0,
      an,
      bn: new Array(order).fill(0),
      order
    };
    this._fourierSeries.push(result);
    this._recordHistory(`fourierCosineSeries: order=${order}`);
    return result;
  }

  /**
   * 部分和序列
   * Compute partial sums
   */
  public partialSums(terms: number[]): number[] {
    const sums: number[] = [];
    let sum = 0;
    for (const t of terms) {
      sum += t;
      sums.push(sum);
    }
    this._recordHistory(`partialSums: ${terms.length} terms`);
    return sums;
  }

  /**
   * 级数余项估计
   * Estimate remainder of series
   */
  public remainderEstimate(
    terms: number[],
    currentIndex: number,
    type: 'alternating' | 'integral' | 'geometric'
  ): number {
    switch (type) {
      case 'alternating':
        return Math.abs(terms[currentIndex + 1] ?? 0);
      case 'integral':
        if (currentIndex + 2 >= terms.length) return 1;
        return Math.abs(terms[currentIndex + 1] / Math.log(currentIndex + 2));
      case 'geometric':
        if (currentIndex + 1 >= terms.length || Math.abs(terms[0]) < 1e-10) return 0;
        const r = Math.abs(terms[1] / terms[0]);
        return Math.abs(terms[currentIndex + 1] / (1 - r));
      default:
        return Math.abs(terms[terms.length - 1] ?? 0);
    }
  }

  /**
   * 阿贝尔求和
   * Abel's summation formula
   */
  public abelSummation(terms: number[]): number {
    const n = terms.length;
    if (n === 0) return 0;
    const partial: number[] = [];
    let sum = 0;
    for (const t of terms) {
      sum += t;
      partial.push(sum);
    }
    let result = 0;
    for (let i = 0; i < n - 1; i++) {
      const weight = 1 / (i + 1);
      result += partial[i] * weight;
    }
    this._recordHistory(`abelSummation: ${result}`);
    return result;
  }

  /**
   * 欧拉变换（加速收敛）
   * Euler transform for convergence acceleration
   */
  public eulerTransform(alternatingTerms: number[]): number {
    const n = alternatingTerms.length;
    if (n === 0) return 0;
    let sum = alternatingTerms[0] / 2;
    const diffs: number[] = [...alternatingTerms];
    for (let k = 1; k < n; k++) {
      const newDiffs: number[] = [];
      for (let i = 0; i < diffs.length - 1; i++) {
        newDiffs.push((diffs[i] + diffs[i + 1]) / 2);
      }
      if (newDiffs.length > 0) {
        sum += newDiffs[0] / Math.pow(2, k + 1);
      }
      diffs.splice(0, diffs.length, ...newDiffs);
    }
    this._recordHistory(`eulerTransform: ${sum}`);
    return sum;
  }

  /**
   * 黎曼 ζ 函数近似
   * Riemann zeta function approximation
   */
  public zetaFunction(s: number, terms: number = 10000): number {
    if (s <= 1) return Infinity;
    let sum = 0;
    for (let n = 1; n <= terms; n++) {
      sum += 1 / Math.pow(n, s);
    }
    this._recordHistory(`zetaFunction(${s}) ≈ ${sum}`);
    return sum;
  }

  /**
   * 狄利克雷 η 函数
   * Dirichlet eta function
   */
  public etaFunction(s: number, terms: number = 1000): number {
    let sum = 0;
    for (let n = 1; n <= terms; n++) {
      sum += (n % 2 === 1 ? 1 : -1) / Math.pow(n, s);
    }
    this._recordHistory(`etaFunction(${s}) ≈ ${sum}`);
    return sum;
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    series: number;
    results: SeriesResult[];
    powerSeries: PowerSeries[];
    fourierSeries: FourierSeries[];
    history: string[];
  }> {
    return {
      id: `series-calc-${Date.now()}-${this._counter}`,
      payload: {
        series: this._series.size,
        results: [...this._results],
        powerSeries: [...this._powerSeries],
        fourierSeries: [...this._fourierSeries],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['calculus', 'series', 'result'],
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
    this._series.clear();
    this._results = [];
    this._powerSeries = [];
    this._fourierSeries = [];
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
    this._counter++;
  }

  private _factorial(n: number): number {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  private _nthDerivative(
    f: (x: number) => number,
    a: number,
    n: number,
    h: number
  ): number {
    if (n === 0) return f(a);
    if (n === 1) return (f(a + h) - f(a - h)) / (2 * h);
    const coeffs = this._binomialCoefficients(n);
    let sum = 0;
    for (let k = 0; k <= n; k++) {
      const sign = k % 2 === 0 ? 1 : -1;
      const x = a + (n / 2 - k) * h;
      sum += sign * coeffs[k] * f(x);
    }
    return sum / Math.pow(h, n);
  }

  private _binomialCoefficients(n: number): number[] {
    const coeffs: number[] = [1];
    for (let i = 1; i <= n; i++) {
      const newCoeffs: number[] = [1];
      for (let j = 1; j < i; j++) {
        newCoeffs.push(coeffs[j - 1] + coeffs[j]);
      }
      newCoeffs.push(1);
      coeffs.splice(0, coeffs.length, ...newCoeffs);
    }
    return coeffs;
  }

  private _integrate(fn: (x: number) => number, a: number, b: number, n: number): number {
    if (n % 2 !== 0) n++;
    const h = (b - a) / n;
    let sum = fn(a) + fn(b);
    for (let i = 1; i < n; i++) {
      sum += (i % 2 === 0 ? 2 : 4) * fn(a + i * h);
    }
    return (h / 3) * sum;
  }

  /**
   * 泰勒多项式余项（拉格朗日形式）
   * Lagrange remainder of Taylor polynomial
   */
  public lagrangeRemainder(
    f: (x: number) => number,
    a: number,
    n: number,
    x: number
  ): number {
    const xi = (a + x) / 2;
    const h = 1e-4;
    const nextDeriv = this._nthDerivative(f, xi, n + 1, h);
    const factorial = this._factorial(n + 1);
    return nextDeriv / factorial * Math.pow(x - a, n + 1);
  }

  /**
   * 二项式级数
   * Binomial series
   */
  public binomialSeries(alpha: number, order: number = 10): PowerSeries {
    const coefficients: number[] = [1];
    for (let n = 1; n <= order; n++) {
      let coeff = 1;
      for (let k = 0; k < n; k++) {
        coeff *= (alpha - k);
      }
      coeff /= this._factorial(n);
      coefficients.push(coeff);
    }
    const series: PowerSeries = {
      coefficients,
      center: 0,
      radiusOfConvergence: 1,
      intervalOfConvergence: [-1, 1]
    };
    this._powerSeries.push(series);
    this._recordHistory(`binomialSeries: alpha=${alpha}, order=${order}`);
    return series;
  }

  /**
   * 幂级数逐项微分
   * Term-by-term differentiation of power series
   */
  public differentiatePowerSeries(series: PowerSeries): PowerSeries {
    const newCoeffs: number[] = [];
    for (let n = 1; n < series.coefficients.length; n++) {
      newCoeffs.push(n * series.coefficients[n]!);
    }
    const result: PowerSeries = {
      coefficients: newCoeffs,
      center: series.center,
      radiusOfConvergence: series.radiusOfConvergence,
      intervalOfConvergence: [...series.intervalOfConvergence] as [number, number]
    };
    this._recordHistory('differentiatePowerSeries');
    return result;
  }

  /**
   * 幂级数逐项积分
   * Term-by-term integration of power series
   */
  public integratePowerSeries(series: PowerSeries): PowerSeries {
    const newCoeffs: number[] = [0];
    for (let n = 0; n < series.coefficients.length; n++) {
      newCoeffs.push(series.coefficients[n] / (n + 1));
    }
    const result: PowerSeries = {
      coefficients: newCoeffs,
      center: series.center,
      radiusOfConvergence: series.radiusOfConvergence,
      intervalOfConvergence: [...series.intervalOfConvergence] as [number, number]
    };
    this._recordHistory('integratePowerSeries');
    return result;
  }

  /**
   * 柯西乘积
   * Cauchy product of two series
   */
  public cauchyProduct(coeffsA: number[], coeffsB: number[]): number[] {
    const n = Math.min(coeffsA.length, coeffsB.length);
    const result: number[] = [];
    for (let k = 0; k < n; k++) {
      let sum = 0;
      for (let i = 0; i <= k; i++) {
        const j = k - i;
        if (i < coeffsA.length && j < coeffsB.length) {
          sum += coeffsA[i] * coeffsB[j];
        }
      }
      result.push(sum);
    }
    this._recordHistory(`cauchyProduct: ${n} terms`);
    return result;
  }

  /**
   * 傅里叶级数复数形式
   * Complex form of Fourier series
   */
  public complexFourierCoefficients(
    f: (x: number) => number,
    L: number,
    order: number = 10
  ): { cn: { real: number; imag: number }[]; period: number } {
    const period = 2 * L;
    const cn: { real: number; imag: number }[] = [];
    const samples = 2000;
    for (let n = -order; n <= order; n++) {
      const cosFn = (x: number) => f(x) * Math.cos(n * Math.PI * x / L);
      const sinFn = (x: number) => f(x) * Math.sin(n * Math.PI * x / L);
      const real = (1 / period) * this._integrate(cosFn, -L, L, samples);
      const imag = -(1 / period) * this._integrate(sinFn, -L, L, samples);
      cn.push({ real, imag });
    }
    this._recordHistory(`complexFourierCoefficients: order=${order}`);
    return { cn, period };
  }

  /**
   * 帕塞瓦尔恒等式验证
   * Parseval's identity verification
   */
  public parsevalIdentity(
    f: (x: number) => number,
    fs: FourierSeries
  ): { leftSide: number; rightSide: number; error: number } {
    const L = fs.period / 2;
    const samples = 2000;
    const sqFn = (x: number) => f(x) * f(x);
    const leftSide = (1 / L) * this._integrate(sqFn, -L, L, samples);
    let rightSide = (fs.a0 * fs.a0) / 2;
    for (let n = 0; n < fs.order; n++) {
      rightSide += fs.an[n] * fs.an[n] + fs.bn[n] * fs.bn[n];
    }
    const error = Math.abs(leftSide - rightSide);
    this._recordHistory(`parsevalIdentity: error=${error.toExponential(4)}`);
    return { leftSide, rightSide, error };
  }

  /**
   * 狄利克雷核
   * Dirichlet kernel
   */
  public dirichletKernel(x: number, N: number): number {
    if (Math.abs(x) < 1e-10) return 2 * N + 1;
    return Math.sin((N + 0.5) * x) / Math.sin(x / 2);
  }

  /**
   * 费耶核
   * Fejér kernel
   */
  public fejerKernel(x: number, N: number): number {
    if (Math.abs(x) < 1e-10) return N;
    const sinHalf = Math.sin(x / 2);
    const sinNHalf = Math.sin(N * x / 2);
    return (1 / N) * (sinNHalf * sinNHalf) / (sinHalf * sinHalf);
  }
}
