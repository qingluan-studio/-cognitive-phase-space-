import { DataPacket, PacketMeta } from '../shared/types';

/** A computed limit. */
export interface Limit {
  expression: string;
  approaches: number;
  value: number;
  side: 'left' | 'right' | 'both';
}

/** Continuity assessment. */
export interface Continuity {
  function: string;
  at: number;
  continuous: boolean;
  reason: string;
}

/** Series classification. */
export type SeriesType = 'arithmetic' | 'geometric' | 'harmonic' | 'power';

/** Result of series evaluation. */
export interface Series {
  terms: number[];
  type: SeriesType;
  sum: number;
  converges: boolean;
}

export class PreCalculus {
  private _limits: Limit[] = [];
  private _continuities: Continuity[] = [];
  private _series: Map<string, Series> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  evaluateLimit(expr: string, approaches: number): Limit {
    // Symbolic placeholders for elementary forms
    let value: number;
    if (/sin\(x\)\/x/.test(expr)) {
      value = 1;
    } else if (/\(1\s*\+\s*x\)\s*\^\s*\(1\/x\)/.test(expr)) {
      value = Math.E;
    } else if (/\(tan\(x\)\s*\/\s*x\)/.test(expr)) {
      value = 1;
    } else if (/\(x\^2\s*-\s*1\)\s*\/\s*\(x\s*-\s*1\)/.test(expr)) {
      value = approaches + 1;
    } else {
      // Numerical fallback using small h
      const h = 1e-7;
      const fx = this._evalExpression(expr, approaches);
      const fxh = this._evalExpression(expr, approaches + h);
      const fxmh = this._evalExpression(expr, approaches - h);
      if (Number.isFinite(fx)) {
        value = fx;
      } else {
        value = (fxh + fxmh) / 2;
      }
    }
    const limit: Limit = { expression: expr, approaches, value, side: 'both' };
    this._limits.push(limit);
    this._history.push({ op: 'evaluateLimit', limit });
    return limit;
  }

  oneSidedLimit(expr: string, approaches: number, side: 'left' | 'right'): Limit {
    const h = 1e-7;
    const target = side === 'left' ? approaches - h : approaches + h;
    let value: number;
    if (/sin\(x\)\/x/.test(expr) && Math.abs(approaches) < 1e-12) value = 1;
    else if (expr.includes('1/x') && Math.abs(approaches) < 1e-12) value = side === 'left' ? -Infinity : Infinity;
    else value = this._evalExpression(expr, target);
    const limit: Limit = { expression: expr, approaches, value, side };
    this._limits.push(limit);
    this._history.push({ op: 'oneSidedLimit', limit });
    return limit;
  }

  limitAtInfinity(expr: string): Limit {
    let value: number;
    const m = expr.match(/\((\d*\.?\d*)x\^\s*2\s*\+\s*(\d*\.?\d*)x\s*\+\s*(\d*\.?\d*)\)\s*\/\s*\((\d*\.?\d*)x\^\s*2\s*\+\s*(\d*\.?\d*)x\s*\+\s*(\d*\.?\d*)\)/);
    if (m) {
      const a = parseFloat(m[1] || '1');
      const d = parseFloat(m[4] || '1');
      value = a / d;
    } else if (/\/x$/.test(expr) || /\/x\^/.test(expr)) {
      value = 0;
    } else if (/\^x/.test(expr)) {
      value = Infinity;
    } else {
      value = this._evalExpression(expr, 1e6);
    }
    const limit: Limit = { expression: expr, approaches: Infinity, value, side: 'both' };
    this._limits.push(limit);
    this._history.push({ op: 'limitAtInfinity', limit });
    return limit;
  }

  lHopitalRule(numerator: string, denominator: string, approaches: number): Limit {
    // Numerical l'Hôpital via small h differences
    const h = 1e-6;
    const nVal = this._evalExpression(numerator, approaches);
    const dVal = this._evalExpression(denominator, approaches);
    if (Number.isFinite(nVal) && Number.isFinite(dVal) && Math.abs(dVal) > 1e-9) {
      const limit: Limit = {
        expression: `${numerator} / ${denominator}`,
        approaches,
        value: nVal / dVal,
        side: 'both',
      };
      this._limits.push(limit);
      return limit;
    }
    const nPrime = (this._evalExpression(numerator, approaches + h) - this._evalExpression(numerator, approaches - h)) / (2 * h);
    const dPrime = (this._evalExpression(denominator, approaches + h) - this._evalExpression(denominator, approaches - h)) / (2 * h);
    const value = Math.abs(dPrime) < 1e-12 ? Infinity : nPrime / dPrime;
    const limit: Limit = {
      expression: `${numerator} / ${denominator}`,
      approaches,
      value,
      side: 'both',
    };
    this._limits.push(limit);
    this._history.push({ op: 'lHopitalRule', limit });
    return limit;
  }

  squeezeTheorem(lower: string, upper: string, expr: string, approaches: number): Limit {
    const h = 1e-7;
    const lo = this._evalExpression(lower, approaches + h);
    const up = this._evalExpression(upper, approaches + h);
    let value: number;
    if (Math.abs(lo - up) < 1e-4) {
      value = (lo + up) / 2;
    } else {
      value = this._evalExpression(expr, approaches + h);
    }
    const limit: Limit = { expression: expr, approaches, value, side: 'both' };
    this._limits.push(limit);
    this._history.push({ op: 'squeezeTheorem', limit });
    return limit;
  }

  checkContinuity(expr: string, at: number): Continuity {
    const h = 1e-7;
    const leftVal = this._evalExpression(expr, at - h);
    const rightVal = this._evalExpression(expr, at + h);
    const centerVal = this._evalExpression(expr, at);
    let continuous = false;
    let reason = '';
    if (!Number.isFinite(centerVal)) {
      reason = 'function undefined at point';
    } else if (Math.abs(leftVal - rightVal) > 1e-3) {
      reason = `left (${leftVal}) and right (${rightVal}) limits differ`;
    } else if (Math.abs(leftVal - centerVal) > 1e-3) {
      reason = `limit (${leftVal}) does not equal f(${at}) = ${centerVal}`;
    } else {
      continuous = true;
      reason = 'continuous at point';
    }
    const cont: Continuity = { function: expr, at, continuous, reason };
    this._continuities.push(cont);
    this._history.push({ op: 'checkContinuity', cont });
    return cont;
  }

  findDiscontinuities(expr: string): number[] {
    const points: number[] = [];
    // Scan [-10, 10] for jumps/disconnections
    const step = 0.05;
    let prev = this._evalExpression(expr, -10);
    for (let x = -10 + step; x <= 10; x += step) {
      const cur = this._evalExpression(expr, x);
      if (!Number.isFinite(cur)) {
        points.push(Math.round(x * 100) / 100);
      } else if (Number.isFinite(prev) && Math.abs(cur - prev) > 5) {
        points.push(Math.round(x * 100) / 100);
      }
      prev = cur;
    }
    const unique = Array.from(new Set(points));
    this._history.push({ op: 'findDiscontinuities', unique });
    return unique;
  }

  arithmeticSeries(a1: number, d: number, n: number): { sum: number; nthTerm: number; series: number[] } {
    const terms: number[] = [];
    for (let i = 0; i < n; i++) terms.push(a1 + d * i);
    const nthTerm = a1 + (n - 1) * d;
    const sum = n * (a1 + nthTerm) / 2;
    const id = `arith-${++this._counter}`;
    this._series.set(id, { terms, type: 'arithmetic', sum, converges: false });
    this._history.push({ op: 'arithmeticSeries', sum });
    return { sum, nthTerm, series: terms };
  }

  geometricSeries(a1: number, r: number, n: number): { sum: number; nthTerm: number; converges: boolean; infiniteSum: number } {
    const terms: number[] = [];
    for (let i = 0; i < n; i++) terms.push(a1 * Math.pow(r, i));
    const nthTerm = a1 * Math.pow(r, n - 1);
    const sum = Math.abs(r - 1) < 1e-12 ? a1 * n : a1 * (1 - Math.pow(r, n)) / (1 - r);
    const converges = Math.abs(r) < 1;
    const infiniteSum = converges ? a1 / (1 - r) : NaN;
    const id = `geom-${++this._counter}`;
    this._series.set(id, { terms, type: 'geometric', sum: infiniteSum, converges });
    this._history.push({ op: 'geometricSeries', sum });
    return { sum, nthTerm, converges, infiniteSum };
  }

  powerSeries(coefficients: number[], x: number): { sum: number; radius: number } {
    let sum = 0;
    for (let k = 0; k < coefficients.length; k++) {
      sum += coefficients[k] * Math.pow(x, k);
    }
    const radius = coefficients.length > 1 ? 1 / Math.max(...coefficients.slice(1).map(Math.abs)) : Infinity;
    const id = `power-${++this._counter}`;
    this._series.set(id, { terms: coefficients, type: 'power', sum, converges: Math.abs(x) < radius });
    this._history.push({ op: 'powerSeries', sum });
    return { sum, radius };
  }

  taylorSeries(expr: string, at: number, order: number): number[] {
    const coeffs: number[] = [];
    const h = 1e-4;
    for (let k = 0; k <= order; k++) {
      // k-th derivative via finite differences (low-order approximation)
      let deriv = 0;
      if (k === 0) {
        deriv = this._evalExpression(expr, at);
      } else if (k === 1) {
        deriv = (this._evalExpression(expr, at + h) - this._evalExpression(expr, at - h)) / (2 * h);
      } else if (k === 2) {
        deriv = (this._evalExpression(expr, at + h) - 2 * this._evalExpression(expr, at) + this._evalExpression(expr, at - h)) / (h * h);
      } else {
        deriv = (this._evalExpression(expr, at + h) - this._evalExpression(expr, at - h)) / (2 * h);
      }
      const fact = this._factorial(k);
      coeffs.push(deriv / fact);
    }
    this._history.push({ op: 'taylorSeries', coeffs });
    return coeffs;
  }

  binomialExpansion(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = (result * (n - i)) / (i + 1);
    }
    return Math.round(result);
  }

  pascalsTriangle(rows: number): number[][] {
    const triangle: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j <= i; j++) {
        row.push(this.binomialExpansion(i, j));
      }
      triangle.push(row);
    }
    this._history.push({ op: 'pascalsTriangle', rows });
    return triangle;
  }

  /** Compute the partial sum of a geometric series up to infinity if convergent. */
  infiniteGeometricSum(a1: number, r: number): number {
    if (Math.abs(r) >= 1) return NaN;
    return a1 / (1 - r);
  }

  /** Determine whether a series converges by the ratio test. */
  ratioTest(termN: number, termNPlus1: number): { converges: boolean; ratio: number } {
    if (Math.abs(termN) < 1e-12) return { converges: true, ratio: 0 };
    const ratio = Math.abs(termNPlus1 / termN);
    return { converges: ratio < 1, ratio };
  }

  /** Determine whether a series converges by the root test. */
  rootTest(nthRootOfNthTerm: number): { converges: boolean; root: number } {
    return { converges: nthRootOfNthTerm < 1, root: nthRootOfNthTerm };
  }

  /** Summation helper using a function evaluator. */
  sumSeries(expr: string, from: number, to: number): number {
    let sum = 0;
    for (let n = from; n <= to; n++) {
      const val = this._evalExpression(expr.replace(/n/g, `(${n})`), 0);
      if (Number.isFinite(val)) sum += val;
    }
    this._history.push({ op: 'sumSeries', sum });
    return sum;
  }

  /** Compute the partial fraction decomposition form (heuristic for two linear factors). */
  partialFractions(numerator: string, factors: [string, string]): string {
    return `${numerator}/((${factors[0]})(${factors[1]})) = A/(${factors[0]}) + B/(${factors[1]})`;
  }

  /** Approximate an integral using the trapezoidal rule with N panels. */
  trapezoidalRule(expr: string, a: number, b: number, n: number): number {
    if (n <= 0) return 0;
    const h = (b - a) / n;
    let sum = 0.5 * (this._evalExpression(expr, a) + this._evalExpression(expr, b));
    for (let i = 1; i < n; i++) {
      sum += this._evalExpression(expr, a + i * h);
    }
    return sum * h;
  }

  private _evalExpression(expr: string, x: number): number {
    try {
      const replaced = expr.replace(/x/g, `(${x})`).replace(/\^/g, '**').replace(/\bpi\b/g, String(Math.PI)).replace(/\be\b/g, String(Math.E));
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return ${replaced};`);
      const result = Number(fn());
      return Number.isFinite(result) ? result : NaN;
    } catch {
      return NaN;
    }
  }

  private _factorial(n: number): number {
    let f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    return f;
  }

  toPacket(): DataPacket<{
    limits: Limit[];
    continuities: Continuity[];
    series: Map<string, Series>;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['high_school_math', 'PreCalculus'],
      priority: 1,
      phase: 'pre_calculus',
    };
    return {
      id: `precalc-${Date.now().toString(36)}`,
      payload: {
        limits: this._limits,
        continuities: this._continuities,
        series: this._series,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._limits = [];
    this._continuities = [];
    this._series = new Map();
    this._history = [];
    this._counter = 0;
  }

  get limitCount(): number {
    return this._limits.length;
  }

  get continuityCount(): number {
    return this._continuities.length;
  }

  get seriesCount(): number {
    return this._series.size;
  }
}
