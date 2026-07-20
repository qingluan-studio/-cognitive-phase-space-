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

  limitLaws(): string[] {
    return [
      'Sum Law: lim[f(x)+g(x)] = lim f(x) + lim g(x)',
      'Difference Law: lim[f(x)-g(x)] = lim f(x) - lim g(x)',
      'Product Law: lim[f(x)·g(x)] = lim f(x) · lim g(x)',
      'Quotient Law: lim[f(x)/g(x)] = lim f(x) / lim g(x), if lim g(x) ≠ 0',
      'Constant Multiple Law: lim[c·f(x)] = c · lim f(x)',
      'Power Law: lim[f(x)]ⁿ = [lim f(x)]ⁿ',
      'Root Law: limⁿ√f(x) = ⁿ√lim f(x)',
      'Squeeze Theorem: if f(x) ≤ g(x) ≤ h(x) and lim f(x) = lim h(x) = L, then lim g(x) = L',
    ];
  }

  continuityTheorems(): string[] {
    return [
      'If f and g are continuous at a, then f±g, f·g, f/g (if g(a)≠0) are continuous at a',
      'Polynomials are continuous everywhere',
      'Rational functions are continuous on their domain',
      'Root functions are continuous on their domain',
      'Trigonometric functions are continuous on their domain',
      'Inverse functions of continuous functions are continuous',
      'Composites of continuous functions are continuous',
      'Intermediate Value Theorem: if f is continuous on [a,b] and N is between f(a) and f(b), then there exists c in (a,b) with f(c)=N',
    ];
  }

  derivativeDefinition(func: string, at: number): { value: number; formula: string } {
    const h = 1e-7;
    const f = (x: number) => this._evalExpression(func, x);
    const value = (f(at + h) - f(at)) / h;
    return {
      value,
      formula: "f'(a) = lim[h→0] (f(a+h) - f(a)) / h",
    };
  }

  derivativePowerRule(coeff: number, exponent: number): { coeff: number; exponent: number } {
    return { coeff: coeff * exponent, exponent: exponent - 1 };
  }

  productRule(fPrime: number, g: number, f: number, gPrime: number): number {
    return fPrime * g + f * gPrime;
  }

  quotientRule(fPrime: number, g: number, f: number, gPrime: number): number {
    if (Math.abs(g) < 1e-12) return NaN;
    return (fPrime * g - f * gPrime) / (g * g);
  }

  chainRule(outerPrime: number, innerPrime: number): number {
    return outerPrime * innerPrime;
  }

  criticalPoints(func: string, a: number, b: number): number[] {
    const points: number[] = [];
    const steps = 200;
    const h = (b - a) / steps;
    let prevSlope: number | null = null;
    for (let i = 0; i <= steps; i++) {
      const x = a + i * h;
      const slope = (this._evalExpression(func, x + 1e-6) - this._evalExpression(func, x - 1e-6)) / 2e-6;
      if (prevSlope !== null && prevSlope * slope < 0) {
        points.push(x);
      }
      prevSlope = slope;
    }
    return points;
  }

  extremeValueTheorem(): string {
    return 'If f is continuous on [a,b], then f attains an absolute maximum f(c) and absolute minimum f(d) at some c,d in [a,b]';
  }

  firstDerivativeTest(func: string, critical: number): 'local_max' | 'local_min' | 'neither' {
    const h = 0.001;
    const left = (this._evalExpression(func, critical - h + 1e-6) - this._evalExpression(func, critical - h - 1e-6)) / 2e-6;
    const right = (this._evalExpression(func, critical + h + 1e-6) - this._evalExpression(func, critical + h - 1e-6)) / 2e-6;
    if (left > 0 && right < 0) return 'local_max';
    if (left < 0 && right > 0) return 'local_min';
    return 'neither';
  }

  secondDerivativeTest(func: string, critical: number): 'local_max' | 'local_min' | 'inconclusive' {
    const h = 0.001;
    const f1 = this._evalExpression(func, critical + h);
    const f2 = this._evalExpression(func, critical);
    const f3 = this._evalExpression(func, critical - h);
    const second = (f1 - 2 * f2 + f3) / (h * h);
    if (second < -1e-9) return 'local_max';
    if (second > 1e-9) return 'local_min';
    return 'inconclusive';
  }

  concavityTest(func: string, a: number, b: number): { concaveUp: string[]; concaveDown: string[]; inflectionPoints: number[] } {
    const concaveUp: string[] = [];
    const concaveDown: string[] = [];
    const inflectionPoints: number[] = [];
    const steps = 100;
    const h = (b - a) / steps;
    let prevConcave: boolean | null = null;
    for (let i = 0; i <= steps; i++) {
      const x = a + i * h;
      const f1 = this._evalExpression(func, x + h);
      const f2 = this._evalExpression(func, x);
      const f3 = this._evalExpression(func, x - h);
      const second = (f1 - 2 * f2 + f3) / (h * h);
      const isUp = second > 0;
      if (prevConcave !== null && isUp !== prevConcave) {
        inflectionPoints.push(x);
      }
      prevConcave = isUp;
    }
    if (inflectionPoints.length === 0) {
      if (prevConcave) concaveUp.push(`(${a}, ${b})`);
      else concaveDown.push(`(${a}, ${b})`);
    }
    return { concaveUp, concaveDown, inflectionPoints };
  }

  meanValueTheorem(func: string, a: number, b: number): { c: number; satisfied: boolean } {
    const fa = this._evalExpression(func, a);
    const fb = this._evalExpression(func, b);
    const avgRate = (fb - fa) / (b - a);
    let c = NaN;
    for (let i = 1; i < 100; i++) {
      const x = a + (b - a) * i / 100;
      const slope = (this._evalExpression(func, x + 1e-6) - this._evalExpression(func, x - 1e-6)) / 2e-6;
      if (Math.abs(slope - avgRate) < 0.01) {
        c = x;
        break;
      }
    }
    return { c, satisfied: Number.isFinite(c) };
  }

  rollesTheorem(func: string, a: number, b: number): { c: number; satisfiesHypothesis: boolean } {
    const fa = this._evalExpression(func, a);
    const fb = this._evalExpression(func, b);
    const satisfiesHypothesis = Math.abs(fa - fb) < 1e-9;
    const mvt = this.meanValueTheorem(func, a, b);
    return { c: mvt.c, satisfiesHypothesis };
  }

  integralDefinition(func: string, a: number, b: number, n: number = 1000): number {
    return this.trapezoidalRule(func, a, b, n);
  }

  riemannSumLeft(func: string, a: number, b: number, n: number): number {
    const dx = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += this._evalExpression(func, a + i * dx) * dx;
    }
    return sum;
  }

  riemannSumRight(func: string, a: number, b: number, n: number): number {
    const dx = (b - a) / n;
    let sum = 0;
    for (let i = 1; i <= n; i++) {
      sum += this._evalExpression(func, a + i * dx) * dx;
    }
    return sum;
  }

  riemannSumMidpoint(func: string, a: number, b: number, n: number): number {
    const dx = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += this._evalExpression(func, a + (i + 0.5) * dx) * dx;
    }
    return sum;
  }

  simpsonsRule(func: string, a: number, b: number, n: number): number {
    if (n % 2 !== 0) n++;
    const dx = (b - a) / n;
    let sum = this._evalExpression(func, a) + this._evalExpression(func, b);
    for (let i = 1; i < n; i++) {
      const x = a + i * dx;
      const weight = i % 2 === 0 ? 2 : 4;
      sum += weight * this._evalExpression(func, x);
    }
    return sum * dx / 3;
  }

  fundamentalTheoremPart1(): string {
    return 'd/dx ∫[a,x] f(t) dt = f(x)';
  }

  fundamentalTheoremPart2(): string {
    return '∫[a,b] f(x) dx = F(b) - F(a), where F is an antiderivative of f';
  }

  integrationByPartsFormula(): string {
    return '∫u dv = uv - ∫v du';
  }

  uSubstitutionFormula(): string {
    return '∫f(g(x))g\'(x) dx = ∫f(u) du where u = g(x)';
  }

  trigSubstitutionTypes(): string[] {
    return [
      '√(a²-x²) → x = a sin θ',
      '√(a²+x²) → x = a tan θ',
      '√(x²-a²) → x = a sec θ',
    ];
  }

  partialFractionTypes(): string[] {
    return [
      'Linear factor: A/(ax+b)',
      'Repeated linear: A₁/(ax+b) + A₂/(ax+b)² + ...',
      'Quadratic: (Ax+B)/(ax²+bx+c)',
      'Repeated quadratic: (A₁x+B₁)/(ax²+bx+c) + ...',
    ];
  }

  improperIntegralType1(): string {
    return '∫[a,∞) f(x) dx = lim[t→∞] ∫[a,t] f(x) dx';
  }

  improperIntegralType2(): string {
    return 'If f has discontinuity at a, ∫[a,b] f(x) dx = lim[t→a+] ∫[t,b] f(x) dx';
  }

  comparisonTestImproper(): string {
    return 'If 0 ≤ f(x) ≤ g(x) and ∫g converges, then ∫f converges; if ∫f diverges, then ∫g diverges';
  }

  convergenceTests(): string[] {
    return [
      'nth Term Test: if lim aₙ ≠ 0, series diverges',
      'Geometric Series: Σarⁿ converges iff |r|<1, sum = a/(1-r)',
      'p-Series: Σ1/nᵖ converges iff p>1',
      'Integral Test: if f positive, continuous, decreasing, then Σf(n) and ∫f both converge or both diverge',
      'Comparison Test: 0 ≤ aₙ ≤ bₙ, if Σbₙ converges then Σaₙ converges',
      'Limit Comparison Test: if lim aₙ/bₙ = L>0, both converge or both diverge',
      'Alternating Series Test: if bₙ positive, decreasing, lim bₙ=0, then Σ(-1)ⁿbₙ converges',
      'Ratio Test: if lim |aₙ₊₁/aₙ| = L, converges if L<1, diverges if L>1',
      'Root Test: if lim ⁿ√|aₙ| = L, converges if L<1, diverges if L>1',
    ];
  }

  taylorMaclaurinSeries(func: string, center: number, order: number): { coefficients: number[]; formula: string } {
    const coeffs = this.taylorSeries(func, center, order);
    return {
      coefficients: coeffs,
      formula: `Σ[f⁽ⁿ⁾(${center})/n!](x-${center})ⁿ`,
    };
  }

  maclaurinSeriesCommon(): { function: string; series: string }[] {
    return [
      { function: 'eˣ', series: 'Σxⁿ/n! = 1 + x + x²/2! + x³/3! + ...' },
      { function: 'sin x', series: 'Σ(-1)ⁿx²ⁿ⁺¹/(2n+1)! = x - x³/3! + x⁵/5! - ...' },
      { function: 'cos x', series: 'Σ(-1)ⁿx²ⁿ/(2n)! = 1 - x²/2! + x⁴/4! - ...' },
      { function: 'ln(1+x)', series: 'Σ(-1)ⁿ⁺¹xⁿ/n = x - x²/2 + x³/3 - ...' },
      { function: '1/(1-x)', series: 'Σxⁿ = 1 + x + x² + x³ + ..., |x|<1' },
      { function: 'tan⁻¹x', series: 'Σ(-1)ⁿx²ⁿ⁺¹/(2n+1) = x - x³/3 + x⁵/5 - ...' },
    ];
  }

  radiusOfConvergenceRatio(coeffs: number[]): number {
    let radius = Infinity;
    for (let i = 0; i < coeffs.length - 1; i++) {
      if (Math.abs(coeffs[i + 1]) > 1e-12) {
        const r = Math.abs(coeffs[i] / coeffs[i + 1]);
        if (r < radius) radius = r;
      }
    }
    return radius;
  }

  lagrangeRemainder(func: string, center: number, x: number, n: number): string {
    return `Rₙ(x) = f⁽ⁿ⁺¹⁾(c)/(n+1)! · (x-${center})ⁿ⁺¹ for some c between ${center} and ${x}`;
  }

  eulerNumberApproximation(n: number): number {
    return Math.pow(1 + 1 / n, n);
  }

  compoundInterest(p: number, r: number, t: number, n: number): number {
    return p * Math.pow(1 + r / n, n * t);
  }

  continuousCompoundInterest(p: number, r: number, t: number): number {
    return p * Math.exp(r * t);
  }

  exponentialGrowth(y0: number, k: number, t: number): number {
    return y0 * Math.exp(k * t);
  }

  exponentialDecay(y0: number, k: number, t: number): number {
    return y0 * Math.exp(-k * t);
  }

  halfLife(k: number): number {
    return Math.log(2) / k;
  }

  doublingTime(k: number): number {
    return Math.log(2) / k;
  }

  logisticGrowth(p0: number, k: number, M: number, t: number): number {
    return M / (1 + (M / p0 - 1) * Math.exp(-k * t));
  }

  newtonsCooling(T0: number, Ts: number, k: number, t: number): number {
    return Ts + (T0 - Ts) * Math.exp(-k * t);
  }

  parametricDerivative(xFunc: string, yFunc: string, t: number): number {
    const h = 1e-6;
    const dx = (this._evalParam(xFunc, t + h) - this._evalParam(xFunc, t - h)) / 2;
    const dy = (this._evalParam(yFunc, t + h) - this._evalParam(yFunc, t - h)) / 2;
    if (Math.abs(dx) < 1e-12) return NaN;
    return dy / dx;
  }

  private _evalParam(func: string, t: number): number {
    try {
      const replaced = func.replace(/t/g, `(${t})`).replace(/\^/g, '**').replace(/\bpi\b/g, String(Math.PI)).replace(/\be\b/g, String(Math.E));
      const fn = new Function(`return ${replaced};`);
      const result = Number(fn());
      return Number.isFinite(result) ? result : NaN;
    } catch {
      return NaN;
    }
  }

  polarArea(func: string, alpha: number, beta: number): number {
    const n = 1000;
    const dTheta = (beta - alpha) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const theta = alpha + i * dTheta;
      const r = this._evalPolar(func, theta);
      sum += 0.5 * r * r * dTheta;
    }
    return sum;
  }

  private _evalPolar(func: string, theta: number): number {
    try {
      const replaced = func.replace(/θ/g, `(${theta})`).replace(/\^/g, '**');
      const fn = new Function(`return ${replaced};`);
      const result = Number(fn());
      return Number.isFinite(result) ? result : 0;
    } catch {
      return 0;
    }
  }

  arcLengthFormula(): string {
    return 'L = ∫[a,b] √(1 + [f\'(x)]²) dx';
  }

  surfaceAreaFormula(): string {
    return 'S = 2π∫[a,b] f(x)√(1 + [f\'(x)]²) dx (revolved about x-axis)';
  }

  volumeDiskMethod(func: string, a: number, b: number): number {
    const n = 1000;
    const dx = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x = a + i * dx;
      const r = this._evalExpression(func, x);
      sum += Math.PI * r * r * dx;
    }
    return sum;
  }

  volumeWasherMethod(outer: string, inner: string, a: number, b: number): number {
    const n = 1000;
    const dx = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x = a + i * dx;
      const R = this._evalExpression(outer, x);
      const r = this._evalExpression(inner, x);
      sum += Math.PI * (R * R - r * r) * dx;
    }
    return sum;
  }

  volumeShellMethod(func: string, a: number, b: number): number {
    const n = 1000;
    const dx = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x = a + i * dx;
      const h = this._evalExpression(func, x);
      sum += 2 * Math.PI * x * h * dx;
    }
    return sum;
  }

  workDone(force: (x: number) => number, a: number, b: number): number {
    const n = 1000;
    const dx = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += force(a + i * dx) * dx;
    }
    return sum;
  }

  averageValueOfFunction(func: string, a: number, b: number): number {
    const integral = this.integralDefinition(func, a, b);
    return integral / (b - a);
  }

  meanValueTheoremForIntegrals(func: string, a: number, b: number): { c: number; avg: number } {
    const avg = this.averageValueOfFunction(func, a, b);
    let c = NaN;
    for (let i = 0; i < 100; i++) {
      const x = a + (b - a) * i / 100;
      if (Math.abs(this._evalExpression(func, x) - avg) < 0.01) {
        c = x;
        break;
      }
    }
    return { c, avg };
  }

  hyperbolicFunctions(): { name: string; definition: string }[] {
    return [
      { name: 'sinh x', definition: '(eˣ - e⁻ˣ)/2' },
      { name: 'cosh x', definition: '(eˣ + e⁻ˣ)/2' },
      { name: 'tanh x', definition: 'sinh x / cosh x' },
      { name: 'csch x', definition: '1/sinh x' },
      { name: 'sech x', definition: '1/cosh x' },
      { name: 'coth x', definition: 'cosh x / sinh x' },
    ];
  }

  hyperbolicIdentities(): string[] {
    return [
      'cosh²x - sinh²x = 1',
      '1 - tanh²x = sech²x',
      'sinh(x+y) = sinh x cosh y + cosh x sinh y',
      'cosh(x+y) = cosh x cosh y + sinh x sinh y',
    ];
  }

  differentialEquations(): string[] {
    return [
      'Separable: dy/dx = f(x)g(y) → ∫dy/g(y) = ∫f(x)dx',
      'Linear: dy/dx + P(x)y = Q(x) → use integrating factor μ(x) = e^∫P(x)dx',
      'Exact: M(x,y)dx + N(x,y)dy = 0 where ∂M/∂y = ∂N/∂x',
      'Homogeneous: use substitution y = vx',
      'Bernoulli: dy/dx + P(x)y = Q(x)yⁿ → substitute v = y¹⁻ⁿ',
    ];
  }

  eulersMethod(func: string, x0: number, y0: number, h: number, steps: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [{ x: x0, y: y0 }];
    let x = x0;
    let y = y0;
    for (let i = 0; i < steps; i++) {
      const slope = this._evalDyDx(func, x, y);
      y += h * slope;
      x += h;
      points.push({ x, y });
    }
    return points;
  }

  private _evalDyDx(func: string, x: number, y: number): number {
    try {
      const replaced = func
        .replace(/x/g, `(${x})`)
        .replace(/y/g, `(${y})`)
        .replace(/\^/g, '**');
      const fn = new Function(`return ${replaced};`);
      const result = Number(fn());
      return Number.isFinite(result) ? result : 0;
    } catch {
      return 0;
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
