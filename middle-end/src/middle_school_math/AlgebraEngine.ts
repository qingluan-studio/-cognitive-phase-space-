import { DataPacket, PacketMeta } from '../shared/types';

/** Polynomial representation with coefficients ordered by ascending degree. */
export interface Polynomial {
  coefficients: number[];
  variable: string;
  degree: number;
}

/** A single term of an algebraic expression. */
export interface Term {
  coefficient: number;
  variable: string;
  exponent: number;
}

/** Aggregated algebraic expression consisting of multiple terms. */
export interface AlgebraicExpression {
  terms: Term[];
  simplified: boolean;
}

/** Result of factoring a polynomial. */
export interface FactorResult {
  original: string;
  factors: string[];
  method: string;
}

/** Result of polynomial GCD computation. */
export interface GCDResult {
  gcd: Polynomial;
  steps: string[];
}

/** Result of partial fraction decomposition. */
export interface PartialFractionResult {
  original: string;
  terms: string[];
  constants: Map<string, number>;
}

/** Complex number representation. */
export interface ComplexNumber {
  real: number;
  imaginary: number;
}

/** Interpolation result for polynomial fitting. */
export interface InterpolationResult {
  polynomial: Polynomial;
  points: { x: number; y: number }[];
  method: string;
}

/** Binomial expansion term. */
export interface BinomialTerm {
  coefficient: number;
  aExponent: number;
  bExponent: number;
  term: string;
}

/** Radical simplification result. */
export interface RadicalResult {
  original: string;
  simplified: string;
  coefficient: number;
  radicand: number;
  index: number;
}

/** Rational expression representation. */
export interface RationalExpression {
  numerator: Polynomial;
  denominator: Polynomial;
  simplified: boolean;
}

/** Exponential expression result. */
export interface ExponentialResult {
  base: number;
  exponent: number;
  value: number;
  simplified: string;
}

export class AlgebraEngine {
  private _polynomials: Map<string, Polynomial> = new Map();
  private _expressions: AlgebraicExpression[] = [];
  private _history: unknown[] = [];
  private _counter = 0;
  private _complexNumbers: ComplexNumber[] = [];
  private _interpolationResults: InterpolationResult[] = [];

  parsePolynomial(expr: string): Polynomial {
    const cleaned = expr.replace(/\s+/g, '').replace(/\*/g, '');
    const variableMatch = cleaned.match(/[a-zA-Z]/);
    const variable = variableMatch ? variableMatch[0] : 'x';
    const terms = this._splitTerms(cleaned);
    const coeffs: number[] = [];
    for (const t of terms) {
      const parsed = this._parseTerm(t, variable);
      while (coeffs.length <= parsed.exponent) coeffs.push(0);
      coeffs[parsed.exponent] += parsed.coefficient;
    }
    const poly: Polynomial = {
      coefficients: coeffs,
      variable,
      degree: coeffs.length - 1,
    };
    const id = `poly-${++this._counter}`;
    this._polynomials.set(id, poly);
    this._history.push({ op: 'parsePolynomial', expr, poly });
    return poly;
  }

  addPoly(a: Polynomial, b: Polynomial): Polynomial {
    const len = Math.max(a.coefficients.length, b.coefficients.length);
    const coefficients: number[] = [];
    for (let i = 0; i < len; i++) {
      coefficients[i] = (a.coefficients[i] || 0) + (b.coefficients[i] || 0);
    }
    const result: Polynomial = { coefficients, variable: a.variable, degree: len - 1 };
    this._history.push({ op: 'addPoly', result });
    return result;
  }

  subtractPoly(a: Polynomial, b: Polynomial): Polynomial {
    const len = Math.max(a.coefficients.length, b.coefficients.length);
    const coefficients: number[] = [];
    for (let i = 0; i < len; i++) {
      coefficients[i] = (a.coefficients[i] || 0) - (b.coefficients[i] || 0);
    }
    const result: Polynomial = { coefficients, variable: a.variable, degree: len - 1 };
    this._history.push({ op: 'subtractPoly', result });
    return result;
  }

  multiplyPoly(a: Polynomial, b: Polynomial): Polynomial {
    const size = a.coefficients.length + b.coefficients.length - 1;
    const coefficients = new Array(size).fill(0);
    for (let i = 0; i < a.coefficients.length; i++) {
      for (let j = 0; j < b.coefficients.length; j++) {
        coefficients[i + j] += a.coefficients[i] * b.coefficients[j];
      }
    }
    const result: Polynomial = { coefficients, variable: a.variable, degree: size - 1 };
    this._history.push({ op: 'multiplyPoly', result });
    return result;
  }

  dividePoly(a: Polynomial, b: Polynomial): { quotient: Polynomial; remainder: Polynomial } {
    const quotientCoeffs: number[] = [];
    let work = [...a.coefficients];
    while (work.length > 0 && Math.abs(work[work.length - 1]) < 1e-12) work.pop();
    let bTrimmed = [...b.coefficients];
    while (bTrimmed.length > 0 && Math.abs(bTrimmed[bTrimmed.length - 1]) < 1e-12) bTrimmed.pop();
    if (bTrimmed.length === 0) {
      throw new Error('Division by zero polynomial');
    }
    while (work.length >= bTrimmed.length) {
      const factor = work[work.length - 1] / bTrimmed[bTrimmed.length - 1];
      const offset = work.length - bTrimmed.length;
      quotientCoeffs[offset] = (quotientCoeffs[offset] || 0) + factor;
      for (let i = 0; i < bTrimmed.length; i++) {
        work[offset + i] -= factor * bTrimmed[i];
      }
      work.pop();
    }
    while (quotientCoeffs.length > 0 && Math.abs(quotientCoeffs[quotientCoeffs.length - 1]) < 1e-12) {
      quotientCoeffs.pop();
    }
    const quotient: Polynomial = {
      coefficients: quotientCoeffs.length ? quotientCoeffs : [0],
      variable: a.variable,
      degree: Math.max(0, quotientCoeffs.length - 1),
    };
    const remainder: Polynomial = {
      coefficients: work.length ? work : [0],
      variable: a.variable,
      degree: Math.max(0, work.length - 1),
    };
    this._history.push({ op: 'dividePoly', quotient, remainder });
    return { quotient, remainder };
  }

  factor(poly: Polynomial): FactorResult {
    if (poly.coefficients.length === 3) {
      return this.factorQuadratic(poly.coefficients[2], poly.coefficients[1], poly.coefficients[0]);
    }
    if (poly.coefficients.length === 2) {
      return this.factorDifferenceOfSquares(poly);
    }
    const grouped = this.factorByGrouping(poly);
    if (grouped.factors.length > 1) return grouped;
    return {
      original: this._formatPolynomial(poly),
      factors: [this._formatPolynomial(poly)],
      method: 'irreducible',
    };
  }

  factorByGrouping(poly: Polynomial): FactorResult {
    const c = poly.coefficients;
    if (c.length !== 4) {
      return { original: this._formatPolynomial(poly), factors: [this._formatPolynomial(poly)], method: 'grouping_failed' };
    }
    const [a, b, e, d] = c;
    const ratio = a === 0 ? 0 : e / a;
    if (Math.abs(ratio - (d === 0 ? 0 : d / b)) < 1e-6 && Math.abs(a) > 1e-12) {
      const f1 = this._formatLinear(a, e);
      const f2 = this._formatLinear(b, d / a * a);
      return { original: this._formatPolynomial(poly), factors: [f1, f2], method: 'grouping' };
    }
    return { original: this._formatPolynomial(poly), factors: [this._formatPolynomial(poly)], method: 'grouping_failed' };
  }

  factorDifferenceOfSquares(poly: Polynomial): FactorResult {
    const c = poly.coefficients;
    if (c.length === 3 && Math.abs(c[1]) < 1e-12) {
      const a = c[2];
      const b = c[0];
      if (a * b < 0) {
        const ra = Math.sqrt(Math.abs(a));
        const rb = Math.sqrt(Math.abs(b));
        const f1 = this._formatLinear(ra, rb);
        const f2 = this._formatLinear(ra, -rb);
        return { original: this._formatPolynomial(poly), factors: [f1, f2], method: 'difference_of_squares' };
      }
    }
    return { original: this._formatPolynomial(poly), factors: [this._formatPolynomial(poly)], method: 'not_diff_of_squares' };
  }

  factorPerfectSquare(poly: Polynomial): FactorResult {
    const c = poly.coefficients;
    if (c.length === 3) {
      const a = c[2];
      const b = c[1];
      const d = c[0];
      if (Math.abs(b * b - 4 * a * d) < 1e-6 && a > 0 && d > 0) {
        const ra = Math.sqrt(a);
        const rd = Math.sqrt(d);
        const sign = b > 0 ? '+' : '-';
        const factor = `${this._fmtCoef(ra)}${poly.variable}${sign}${this._fmtCoef(rd)}`;
        return {
          original: this._formatPolynomial(poly),
          factors: [factor, factor],
          method: 'perfect_square',
        };
      }
    }
    return { original: this._formatPolynomial(poly), factors: [this._formatPolynomial(poly)], method: 'not_perfect_square' };
  }

  factorQuadratic(a: number, b: number, c: number): FactorResult {
    const discriminant = b * b - 4 * a * c;
    const original = `${this._fmtCoef(a)}x^2${b >= 0 ? '+' : ''}${this._fmtCoef(b)}x${c >= 0 ? '+' : ''}${c}`;
    if (discriminant < -1e-9) {
      return { original, factors: [original], method: 'irreducible_real' };
    }
    if (Math.abs(discriminant) < 1e-9) {
      const root = -b / (2 * a);
      const factor = `${this._fmtCoef(a)}x${root >= 0 ? '-' : '+'}${this._fmtCoef(Math.abs(root))}`;
      return { original, factors: [factor, factor], method: 'perfect_square_trinomial' };
    }
    const sqrtD = Math.sqrt(discriminant);
    const r1 = (-b + sqrtD) / (2 * a);
    const r2 = (-b - sqrtD) / (2 * a);
    const f1 = `${this._fmtCoef(a)}x${r1 >= 0 ? '-' : '+'}${this._fmtCoef(Math.abs(r1))}`;
    const f2 = `x${r2 >= 0 ? '-' : '+'}${this._fmtCoef(Math.abs(r2))}`;
    return { original, factors: [f1, f2], method: 'quadratic_formula' };
  }

  factorSumOfCubes(a: number, b: number): FactorResult {
    const original = `${a}x^3 + ${b}`;
    const cbA = Math.cbrt(a);
    const cbB = Math.cbrt(b);
    const f1 = `${this._fmtCoef(cbA)}x + ${cbB}`;
    const f2 = `${this._fmtCoef(cbA * cbA)}x^2 - ${cbA * cbB}x + ${cbB * cbB}`;
    return { original, factors: [f1, f2], method: 'sum_of_cubes' };
  }

  factorDifferenceOfCubes(a: number, b: number): FactorResult {
    const original = `${a}x^3 - ${b}`;
    const cbA = Math.cbrt(a);
    const cbB = Math.cbrt(b);
    const f1 = `${this._fmtCoef(cbA)}x - ${cbB}`;
    const f2 = `${this._fmtCoef(cbA * cbA)}x^2 + ${cbA * cbB}x + ${cbB * cbB}`;
    return { original, factors: [f1, f2], method: 'difference_of_cubes' };
  }

  factorGreatestCommonMonomial(poly: Polynomial): { gcf: number; factored: Polynomial } {
    const coeffs = poly.coefficients.filter(c => Math.abs(c) > 1e-12);
    if (coeffs.length === 0) return { gcf: 0, factored: poly };
    let gcf = Math.abs(coeffs[0]);
    for (let i = 1; i < coeffs.length; i++) {
      gcf = this._gcd(gcf, Math.abs(coeffs[i]));
    }
    const factoredCoeffs = poly.coefficients.map(c => c / gcf);
    const factored: Polynomial = {
      coefficients: factoredCoeffs,
      variable: poly.variable,
      degree: poly.degree,
    };
    this._history.push({ op: 'factorGreatestCommonMonomial', gcf });
    return { gcf, factored };
  }

  rationalRootTheorem(poly: Polynomial): number[] {
    const coeffs = poly.coefficients;
    const leading = coeffs[coeffs.length - 1];
    const constant = coeffs[0];
    if (Math.abs(leading) < 1e-12 || Math.abs(constant) < 1e-12) return [];
    const factorsOf = (n: number): number[] => {
      const factors: number[] = [];
      const abs = Math.abs(Math.round(n));
      for (let i = 1; i <= abs; i++) {
        if (abs % i === 0) {
          factors.push(i, -i);
        }
      }
      return factors;
    };
    const pFactors = factorsOf(constant);
    const qFactors = factorsOf(leading);
    const roots: number[] = [];
    const tested = new Set<string>();
    for (const p of pFactors) {
      for (const q of qFactors) {
        const root = p / q;
        const key = root.toFixed(10);
        if (tested.has(key)) continue;
        tested.add(key);
        const val = this.evaluate(poly, root);
        if (Math.abs(val) < 1e-9) {
          roots.push(root);
        }
      }
    }
    this._history.push({ op: 'rationalRootTheorem', roots });
    return roots;
  }

  expand(factors: string[]): Polynomial {
    let result: Polynomial = { coefficients: [1], variable: 'x', degree: 0 };
    for (const f of factors) {
      const poly = this.parsePolynomial(f);
      result = this.multiplyPoly(result, poly);
    }
    this._history.push({ op: 'expand', result });
    return result;
  }

  simplify(expr: string): string {
    const poly = this.parsePolynomial(expr);
    const simplified = this._formatPolynomial(poly);
    this._history.push({ op: 'simplify', original: expr, simplified });
    return simplified;
  }

  syntheticDivide(poly: Polynomial, root: number): Polynomial {
    const coeffs = [...poly.coefficients];
    const result: number[] = [];
    let carry = 0;
    for (let i = coeffs.length - 1; i >= 0; i--) {
      const val = coeffs[i] + carry * root;
      result.unshift(val);
      carry = val;
    }
    result.pop();
    const quotient: Polynomial = {
      coefficients: result.length ? result : [0],
      variable: poly.variable,
      degree: Math.max(0, result.length - 1),
    };
    this._history.push({ op: 'syntheticDivide', root, quotient });
    return quotient;
  }

  getDegree(poly: Polynomial): number {
    let deg = 0;
    for (let i = 0; i < poly.coefficients.length; i++) {
      if (Math.abs(poly.coefficients[i]) > 1e-12) deg = i;
    }
    return deg;
  }

  evaluate(poly: Polynomial, x: number): number {
    let result = 0;
    for (let i = 0; i < poly.coefficients.length; i++) {
      result += poly.coefficients[i] * Math.pow(x, i);
    }
    return result;
  }

  hornerEvaluate(poly: Polynomial, x: number): number {
    const n = poly.coefficients.length;
    if (n === 0) return 0;
    let result = poly.coefficients[n - 1];
    for (let i = n - 2; i >= 0; i--) {
      result = result * x + poly.coefficients[i];
    }
    this._history.push({ op: 'hornerEvaluate', x, result });
    return result;
  }

  polynomialGCD(a: Polynomial, b: Polynomial): GCDResult {
    const steps: string[] = [];
    let remA = { ...a, coefficients: [...a.coefficients] };
    let remB = { ...b, coefficients: [...b.coefficients] };
    while (this.getDegree(remB) >= 0 && Math.abs(remB.coefficients[remB.coefficients.length - 1]) > 1e-12) {
      const { remainder } = this.dividePoly(remA, remB);
      steps.push(`deg(${this._formatPolynomial(remA)}) / deg(${this._formatPolynomial(remB)}) → rem = ${this._formatPolynomial(remainder)}`);
      remA = remB;
      remB = remainder;
    }
    const { gcf, factored } = this.factorGreatestCommonMonomial(remA);
    this._history.push({ op: 'polynomialGCD', gcd: factored });
    return { gcd: factored, steps };
  }

  polynomialLCM(a: Polynomial, b: Polynomial): Polynomial {
    const { gcd } = this.polynomialGCD(a, b);
    const product = this.multiplyPoly(a, b);
    const { quotient } = this.dividePoly(product, gcd);
    this._history.push({ op: 'polynomialLCM', lcm: quotient });
    return quotient;
  }

  lagrangeInterpolation(points: { x: number; y: number }[]): InterpolationResult {
    const n = points.length;
    if (n === 0) {
      return { polynomial: { coefficients: [0], variable: 'x', degree: 0 }, points, method: 'lagrange' };
    }
    let resultPoly: Polynomial = { coefficients: [0], variable: 'x', degree: 0 };
    for (let i = 0; i < n; i++) {
      let termPoly: Polynomial = { coefficients: [points[i].y], variable: 'x', degree: 0 };
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const denom = points[i].x - points[j].x;
        const linearPoly: Polynomial = {
          coefficients: [-points[j].x / denom, 1 / denom],
          variable: 'x',
          degree: 1,
        };
        termPoly = this.multiplyPoly(termPoly, linearPoly);
      }
      resultPoly = this.addPoly(resultPoly, termPoly);
    }
    const result: InterpolationResult = { polynomial: resultPoly, points, method: 'lagrange' };
    this._interpolationResults.push(result);
    this._history.push({ op: 'lagrangeInterpolation', result });
    return result;
  }

  binomialExpansion(n: number): BinomialTerm[] {
    const terms: BinomialTerm[] = [];
    for (let k = 0; k <= n; k++) {
      const coefficient = this._binomialCoefficient(n, k);
      const term: BinomialTerm = {
        coefficient,
        aExponent: n - k,
        bExponent: k,
        term: `${coefficient}a^${n - k}b^${k}`,
      };
      terms.push(term);
    }
    this._history.push({ op: 'binomialExpansion', n, terms });
    return terms;
  }

  binomialTheorem(a: number, b: number, n: number): number {
    let result = 0;
    for (let k = 0; k <= n; k++) {
      const c = this._binomialCoefficient(n, k);
      result += c * Math.pow(a, n - k) * Math.pow(b, k);
    }
    this._history.push({ op: 'binomialTheorem', a, b, n, result });
    return result;
  }

  perfectSquareTrinomial(a: number, b: number): { expanded: string; factored: string } {
    const expanded = `${a * a}x^2 + ${2 * a * b}x + ${b * b}`;
    const factored = `(${a}x + ${b})^2`;
    this._history.push({ op: 'perfectSquareTrinomial', expanded, factored });
    return { expanded, factored };
  }

  differenceOfSquaresFormula(a: number, b: number): { expanded: string; factored: string } {
    const expanded = `${a * a}x^2 - ${b * b}`;
    const factored = `(${a}x + ${b})(${a}x - ${b})`;
    return { expanded, factored };
  }

  simplifyRadical(radicand: number, index: number = 2): RadicalResult {
    let coefficient = 1;
    let remaining = Math.abs(radicand);
    for (let i = 2; i <= Math.pow(remaining, 1 / index); i++) {
      const power = Math.pow(i, index);
      while (remaining % power === 0) {
        coefficient *= i;
        remaining /= power;
      }
    }
    const sign = radicand < 0 ? '-' : '';
    let simplified = '';
    if (coefficient === 1) {
      simplified = index === 2 ? `${sign}√${remaining}` : `${sign}${index}√${remaining}`;
    } else {
      simplified = index === 2 ? `${sign}${coefficient}√${remaining}` : `${sign}${coefficient}${index}√${remaining}`;
    }
    const result: RadicalResult = {
      original: `√${radicand}`,
      simplified: remaining === 1 ? `${sign}${coefficient}` : simplified,
      coefficient,
      radicand: remaining,
      index,
    };
    this._history.push({ op: 'simplifyRadical', result });
    return result;
  }

  simplifyRationalExpression(num: Polynomial, den: Polynomial): RationalExpression {
    const { gcd } = this.polynomialGCD(num, den);
    const { quotient: simplifiedNum } = this.dividePoly(num, gcd);
    const { quotient: simplifiedDen } = this.dividePoly(den, gcd);
    const result: RationalExpression = {
      numerator: simplifiedNum,
      denominator: simplifiedDen,
      simplified: true,
    };
    this._history.push({ op: 'simplifyRationalExpression', result });
    return result;
  }

  addRationalExpressions(
    r1: RationalExpression,
    r2: RationalExpression,
  ): RationalExpression {
    const commonDenom = this.polynomialLCM(r1.denominator, r2.denominator);
    const { quotient: factor1 } = this.dividePoly(commonDenom, r1.denominator);
    const { quotient: factor2 } = this.dividePoly(commonDenom, r2.denominator);
    const newNum1 = this.multiplyPoly(r1.numerator, factor1);
    const newNum2 = this.multiplyPoly(r2.numerator, factor2);
    const totalNum = this.addPoly(newNum1, newNum2);
    return this.simplifyRationalExpression(totalNum, commonDenom);
  }

  multiplyRationalExpressions(
    r1: RationalExpression,
    r2: RationalExpression,
  ): RationalExpression {
    const num = this.multiplyPoly(r1.numerator, r2.numerator);
    const den = this.multiplyPoly(r1.denominator, r2.denominator);
    return this.simplifyRationalExpression(num, den);
  }

  complexAdd(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    const result: ComplexNumber = {
      real: a.real + b.real,
      imaginary: a.imaginary + b.imaginary,
    };
    this._complexNumbers.push(result);
    return result;
  }

  complexSubtract(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    const result: ComplexNumber = {
      real: a.real - b.real,
      imaginary: a.imaginary - b.imaginary,
    };
    this._complexNumbers.push(result);
    return result;
  }

  complexMultiply(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    const result: ComplexNumber = {
      real: a.real * b.real - a.imaginary * b.imaginary,
      imaginary: a.real * b.imaginary + a.imaginary * b.real,
    };
    this._complexNumbers.push(result);
    return result;
  }

  complexDivide(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    const denom = b.real * b.real + b.imaginary * b.imaginary;
    if (Math.abs(denom) < 1e-12) return { real: NaN, imaginary: NaN };
    const conjugate: ComplexNumber = { real: b.real, imaginary: -b.imaginary };
    const num = this.complexMultiply(a, conjugate);
    const result: ComplexNumber = {
      real: num.real / denom,
      imaginary: num.imaginary / denom,
    };
    return result;
  }

  complexMagnitude(c: ComplexNumber): number {
    return Math.sqrt(c.real * c.real + c.imaginary * c.imaginary);
  }

  complexConjugate(c: ComplexNumber): ComplexNumber {
    return { real: c.real, imaginary: -c.imaginary };
  }

  quadraticFormulaComplex(a: number, b: number, c: number): { roots: ComplexNumber[]; discriminant: number } {
    const disc = b * b - 4 * a * c;
    const roots: ComplexNumber[] = [];
    if (Math.abs(disc) < 1e-12) {
      roots.push({ real: -b / (2 * a), imaginary: 0 });
    } else if (disc > 0) {
      const sqrtD = Math.sqrt(disc);
      roots.push({ real: (-b + sqrtD) / (2 * a), imaginary: 0 });
      roots.push({ real: (-b - sqrtD) / (2 * a), imaginary: 0 });
    } else {
      const sqrtD = Math.sqrt(-disc);
      roots.push({ real: -b / (2 * a), imaginary: sqrtD / (2 * a) });
      roots.push({ real: -b / (2 * a), imaginary: -sqrtD / (2 * a) });
    }
    this._history.push({ op: 'quadraticFormulaComplex', roots, discriminant: disc });
    return { roots, discriminant: disc };
  }

  exponentProductRule(base: number, exp1: number, exp2: number): ExponentialResult {
    const value = Math.pow(base, exp1 + exp2);
    return {
      base,
      exponent: exp1 + exp2,
      value,
      simplified: `${base}^(${exp1} + ${exp2}) = ${base}^${exp1 + exp2} = ${value}`,
    };
  }

  exponentQuotientRule(base: number, exp1: number, exp2: number): ExponentialResult {
    const value = Math.pow(base, exp1 - exp2);
    return {
      base,
      exponent: exp1 - exp2,
      value,
      simplified: `${base}^${exp1} / ${base}^${exp2} = ${base}^${exp1 - exp2} = ${value}`,
    };
  }

  exponentPowerRule(base: number, exp1: number, exp2: number): ExponentialResult {
    const value = Math.pow(base, exp1 * exp2);
    return {
      base,
      exponent: exp1 * exp2,
      value,
      simplified: `(${base}^${exp1})^${exp2} = ${base}^${exp1 * exp2} = ${value}`,
    };
  }

  zeroExponent(base: number): ExponentialResult {
    return {
      base,
      exponent: 0,
      value: 1,
      simplified: `${base}^0 = 1`,
    };
  }

  negativeExponent(base: number, exp: number): ExponentialResult {
    const value = Math.pow(base, -exp);
    return {
      base,
      exponent: -exp,
      value: 1 / value,
      simplified: `${base}^(-${exp}) = 1 / ${base}^${exp} = ${1 / value}`,
    };
  }

  derivativePolynomial(poly: Polynomial): Polynomial {
    const coeffs: number[] = [];
    for (let i = 1; i < poly.coefficients.length; i++) {
      coeffs[i - 1] = poly.coefficients[i] * i;
    }
    const result: Polynomial = {
      coefficients: coeffs.length ? coeffs : [0],
      variable: poly.variable,
      degree: Math.max(0, coeffs.length - 1),
    };
    this._history.push({ op: 'derivativePolynomial', result });
    return result;
  }

  integralPolynomial(poly: Polynomial, constant: number = 0): Polynomial {
    const coeffs: number[] = [constant];
    for (let i = 0; i < poly.coefficients.length; i++) {
      coeffs[i + 1] = poly.coefficients[i] / (i + 1);
    }
    const result: Polynomial = {
      coefficients: coeffs,
      variable: poly.variable,
      degree: coeffs.length - 1,
    };
    this._history.push({ op: 'integralPolynomial', result });
    return result;
  }

  newtonRaphson(poly: Polynomial, initial: number, tolerance: number = 1e-10, maxIter: number = 100): number {
    let x = initial;
    const derivative = this.derivativePolynomial(poly);
    for (let i = 0; i < maxIter; i++) {
      const fx = this.hornerEvaluate(poly, x);
      const fpx = this.hornerEvaluate(derivative, x);
      if (Math.abs(fpx) < 1e-12) break;
      const next = x - fx / fpx;
      if (Math.abs(next - x) < tolerance) return next;
      x = next;
    }
    this._history.push({ op: 'newtonRaphson', root: x });
    return x;
  }

  descartesSignRule(poly: Polynomial): { positiveRoots: number; negativeRoots: number } {
    const countSignChanges = (coeffs: number[]): number => {
      let count = 0;
      let prevSign = 0;
      for (let i = coeffs.length - 1; i >= 0; i--) {
        const c = coeffs[i];
        if (Math.abs(c) < 1e-12) continue;
        const sign = c > 0 ? 1 : -1;
        if (prevSign !== 0 && sign !== prevSign) count++;
        prevSign = sign;
      }
      return count;
    };
    const positiveChanges = countSignChanges(poly.coefficients);
    const negCoeffs = poly.coefficients.map((c, i) => (i % 2 === 0 ? c : -c));
    const negativeChanges = countSignChanges(negCoeffs);
    return { positiveRoots: positiveChanges, negativeRoots: negativeChanges };
  }

  intermediateValueTheorem(poly: Polynomial, a: number, b: number): boolean {
    const fa = this.evaluate(poly, a);
    const fb = this.evaluate(poly, b);
    return fa * fb < 0;
  }

  bisectionMethod(poly: Polynomial, a: number, b: number, tolerance: number = 1e-10, maxIter: number = 100): number {
    if (this.evaluate(poly, a) * this.evaluate(poly, b) >= 0) {
      throw new Error('Function values at endpoints must have opposite signs');
    }
    let left = a;
    let right = b;
    for (let i = 0; i < maxIter; i++) {
      const mid = (left + right) / 2;
      const fmid = this.evaluate(poly, mid);
      if (Math.abs(fmid) < tolerance || (right - left) / 2 < tolerance) {
        return mid;
      }
      if (this.evaluate(poly, left) * fmid < 0) {
        right = mid;
      } else {
        left = mid;
      }
    }
    return (left + right) / 2;
  }

  partialFractionDecomposition(
    numerator: Polynomial,
    denominator: Polynomial,
  ): PartialFractionResult {
    const result: PartialFractionResult = {
      original: `${this._formatPolynomial(numerator)} / ${this._formatPolynomial(denominator)}`,
      terms: [],
      constants: new Map(),
    };
    if (denominator.coefficients.length === 3) {
      const a = denominator.coefficients[2];
      const b = denominator.coefficients[1];
      const c = denominator.coefficients[0];
      const disc = b * b - 4 * a * c;
      if (disc > 1e-9) {
        const r1 = (-b + Math.sqrt(disc)) / (2 * a);
        const r2 = (-b - Math.sqrt(disc)) / (2 * a);
        const numConst = numerator.coefficients.length > 0 ? numerator.coefficients[0] : 0;
        const A = numConst / (r1 - r2);
        const B = numConst / (r2 - r1);
        result.terms = [`A/(x - ${r1.toFixed(4)})`, `B/(x - ${r2.toFixed(4)})`];
        result.constants.set('A', A);
        result.constants.set('B', -B);
      }
    }
    this._history.push({ op: 'partialFractionDecomposition', result });
    return result;
  }

  factorial(n: number): number {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  arithmeticSequence(a1: number, d: number, n: number): { nthTerm: number; sum: number; terms: number[] } {
    const terms: number[] = [];
    for (let i = 0; i < n; i++) {
      terms.push(a1 + d * i);
    }
    const nthTerm = a1 + (n - 1) * d;
    const sum = (n * (a1 + nthTerm)) / 2;
    return { nthTerm, sum, terms };
  }

  geometricSequence(a1: number, r: number, n: number): { nthTerm: number; sum: number; terms: number[]; infiniteSum: number } {
    const terms: number[] = [];
    for (let i = 0; i < n; i++) {
      terms.push(a1 * Math.pow(r, i));
    }
    const nthTerm = a1 * Math.pow(r, n - 1);
    const sum = Math.abs(r - 1) < 1e-12 ? a1 * n : a1 * (1 - Math.pow(r, n)) / (1 - r);
    const infiniteSum = Math.abs(r) < 1 ? a1 / (1 - r) : NaN;
    return { nthTerm, sum, terms, infiniteSum };
  }

  sigmaNotation(start: number, end: number, fn: (k: number) => number): number {
    let sum = 0;
    for (let k = start; k <= end; k++) {
      sum += fn(k);
    }
    return sum;
  }

  private _binomialCoefficient(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = (result * (n - i)) / (i + 1);
    }
    return Math.round(result);
  }

  private _gcd(a: number, b: number): number {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b > 0) {
      [a, b] = [b, a % b];
    }
    return a;
  }

  private _splitTerms(expr: string): string[] {
    const terms: string[] = [];
    let buffer = '';
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if ((ch === '+' || ch === '-') && i > 0 && expr[i - 1] !== '^' && expr[i - 1] !== 'e') {
        if (buffer) terms.push(buffer);
        buffer = ch;
      } else {
        buffer += ch;
      }
    }
    if (buffer) terms.push(buffer);
    return terms;
  }

  private _parseTerm(term: string, variable: string): Term {
    const cleaned = term.replace(/\s+/g, '');
    if (!cleaned) return { coefficient: 0, variable, exponent: 0 };
    if (!cleaned.includes(variable)) {
      return { coefficient: parseFloat(cleaned) || 0, variable, exponent: 0 };
    }
    const match = cleaned.match(/^([+-]?\d*\.?\d*)\*?([a-zA-Z])(?:\^(-?\d+))?$/);
    if (!match) return { coefficient: 0, variable, exponent: 0 };
    let coefStr = match[1];
    let coef: number;
    if (coefStr === '' || coefStr === '+') coef = 1;
    else if (coefStr === '-') coef = -1;
    else coef = parseFloat(coefStr);
    const exponent = match[3] ? parseInt(match[3], 10) : 1;
    return { coefficient: coef, variable: match[2], exponent };
  }

  private _formatPolynomial(poly: Polynomial): string {
    const parts: string[] = [];
    for (let i = poly.coefficients.length - 1; i >= 0; i--) {
      const c = poly.coefficients[i];
      if (Math.abs(c) < 1e-12) continue;
      const sign = c < 0 ? '-' : parts.length === 0 ? '' : '+';
      const abs = Math.abs(c);
      let term = '';
      if (i === 0) term = `${abs}`;
      else if (i === 1) term = `${abs === 1 ? '' : abs}${poly.variable}`;
      else term = `${abs === 1 ? '' : abs}${poly.variable}^${i}`;
      parts.push(`${sign}${parts.length === 0 && c > 0 ? '' : sign}${term}`);
    }
    return parts.length ? parts.join('') : '0';
  }

  private _formatLinear(a: number, b: number): string {
    const aPart = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
    if (Math.abs(b) < 1e-12) return aPart;
    const sign = b >= 0 ? '+' : '-';
    return `${aPart}${sign}${Math.abs(b)}`;
  }

  private _fmtCoef(n: number): string {
    if (Math.abs(n - 1) < 1e-12) return '';
    if (Math.abs(n + 1) < 1e-12) return '-';
    return `${n}`;
  }

  toPacket(): DataPacket<{
    polynomials: Map<string, Polynomial>;
    expressions: AlgebraicExpression[];
    history: unknown[];
    complexNumbers: ComplexNumber[];
    interpolationResults: InterpolationResult[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['middle_school_math', 'AlgebraEngine'],
      priority: 1,
      phase: 'algebra',
    };
    return {
      id: `algebra-${Date.now().toString(36)}`,
      payload: {
        polynomials: this._polynomials,
        expressions: this._expressions,
        history: this._history,
        complexNumbers: this._complexNumbers,
        interpolationResults: this._interpolationResults,
      },
      metadata,
    };
  }

  reset(): void {
    this._polynomials = new Map();
    this._expressions = [];
    this._history = [];
    this._counter = 0;
    this._complexNumbers = [];
    this._interpolationResults = [];
  }

  get polynomialCount(): number {
    return this._polynomials.size;
  }

  get expressionCount(): number {
    return this._expressions.length;
  }

  get historyLength(): number {
    return this._history.length;
  }

  get complexNumberCount(): number {
    return this._complexNumbers.length;
  }

  get interpolationCount(): number {
    return this._interpolationResults.length;
  }
}
