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

export class AlgebraEngine {
  private _polynomials: Map<string, Polynomial> = new Map();
  private _expressions: AlgebraicExpression[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

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
      },
      metadata,
    };
  }

  reset(): void {
    this._polynomials = new Map();
    this._expressions = [];
    this._history = [];
    this._counter = 0;
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
}
