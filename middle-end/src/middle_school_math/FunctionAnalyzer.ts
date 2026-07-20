import { DataPacket, PacketMeta } from '../shared/types';

/** Categorisation of supported mathematical function families. */
export type FunctionType =
  | 'linear'
  | 'quadratic'
  | 'exponential'
  | 'logarithmic'
  | 'rational'
  | 'piecewise';

/** Mathematical function under analysis. */
export interface MathFunction {
  id: string;
  expression: string;
  type: FunctionType;
  domain: string;
  range: string;
}

/** A named property discovered about a function. */
export interface FunctionProperty {
  name: string;
  value: string;
  description: string;
}

/** A coordinate point on a function graph. */
export interface GraphPoint {
  x: number;
  y: number;
  label: string;
}

/** Monotonicity interval result. */
export interface Monotonicity {
  intervals: string[];
  type: 'increasing' | 'decreasing' | 'mixed';
}

export class FunctionAnalyzer {
  private _functions: Map<string, MathFunction> = new Map();
  private _properties: FunctionProperty[] = [];
  private _graphPoints: GraphPoint[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  analyze(expression: string): FunctionProperty[] {
    const type = this._classify(expression);
    const id = `fn-${++this._counter}`;
    const fn: MathFunction = {
      id,
      expression,
      type,
      domain: '',
      range: '',
    };
    fn.domain = this.findDomain(fn);
    fn.range = this.findRange(fn);
    this._functions.set(id, fn);
    const props: FunctionProperty[] = [
      { name: 'type', value: type, description: 'function family classification' },
      { name: 'domain', value: fn.domain, description: 'permitted input values' },
      { name: 'range', value: fn.range, description: 'achievable output values' },
      { name: 'intercepts', value: JSON.stringify(this.findIntercepts(fn)), description: 'x and y intercepts' },
      { name: 'extrema', value: JSON.stringify(this.findExtrema(fn)), description: 'local maxima and minima' },
      { name: 'parity', value: this._parityString(fn), description: 'odd/even/neither' },
      { name: 'periodic', value: String(this.isPeriodic(fn)), description: 'periodicity flag' },
    ];
    this._properties.push(...props);
    this._history.push({ op: 'analyze', id, props });
    return props;
  }

  findDomain(func: MathFunction): string {
    switch (func.type) {
      case 'linear': return '(-∞, +∞)';
      case 'quadratic': return '(-∞, +∞)';
      case 'exponential': return '(-∞, +∞)';
      case 'logarithmic': return '(0, +∞)';
      case 'rational': {
        const m = func.expression.match(/\/(.+)$/);
        if (m) return `(-∞, +∞) excluding zeros of ${m[1]}`;
        return '(-∞, +∞)';
      }
      case 'piecewise': return 'union of piece subdomains';
      default: return '(-∞, +∞)';
    }
  }

  findRange(func: MathFunction): string {
    switch (func.type) {
      case 'linear': return '(-∞, +∞)';
      case 'quadratic': {
        const c = this._parseQuadratic(func.expression);
        if (!c) return '(-∞, +∞)';
        const vertex = -c.b / (2 * c.a);
        const val = c.a * vertex * vertex + c.b * vertex + c.c;
        return c.a > 0 ? `[${val}, +∞)` : `(-∞, ${val}]`;
      }
      case 'exponential': return '(0, +∞)';
      case 'logarithmic': return '(-∞, +∞)';
      case 'rational': return '(-∞, +∞)';
      case 'piecewise': return 'union of piece subranges';
      default: return '(-∞, +∞)';
    }
  }

  findIntercepts(func: MathFunction): GraphPoint[] {
    const points: GraphPoint[] = [];
    if (func.type === 'linear' || func.type === 'quadratic') {
      const c = this._parsePolynomialCoef(func.expression);
      if (c.length >= 1) {
        points.push({ x: 0, y: c[0], label: 'y-intercept' });
      }
      if (c.length >= 2 && Math.abs(c[1]) > 1e-12) {
        points.push({ x: -c[0] / c[1], y: 0, label: 'x-intercept' });
      } else if (c.length >= 3) {
        const disc = c[1] * c[1] - 4 * c[2] * c[0];
        if (disc >= 0) {
          const s = Math.sqrt(disc);
          points.push({ x: (-c[1] + s) / (2 * c[2]), y: 0, label: 'x-intercept' });
          points.push({ x: (-c[1] - s) / (2 * c[2]), y: 0, label: 'x-intercept' });
        }
      }
    } else if (func.type === 'exponential') {
      const match = func.expression.match(/(\d*\.?\d*)\^\(?x\)?/);
      if (match) {
        const base = parseFloat(match[1]) || Math.E;
        points.push({ x: 0, y: 1, label: 'y-intercept (a^0=1)' });
        void base;
      }
    } else if (func.type === 'logarithmic') {
      points.push({ x: 1, y: 0, label: 'x-intercept (log(1)=0)' });
    }
    this._graphPoints.push(...points);
    return points;
  }

  findVertex(func: MathFunction): GraphPoint {
    if (func.type !== 'quadratic') {
      return { x: NaN, y: NaN, label: 'no vertex (not quadratic)' };
    }
    const c = this._parseQuadratic(func.expression);
    if (!c) return { x: NaN, y: NaN, label: 'unparseable' };
    const vx = -c.b / (2 * c.a);
    const vy = c.a * vx * vx + c.b * vx + c.c;
    const point: GraphPoint = { x: vx, y: vy, label: 'vertex' };
    this._graphPoints.push(point);
    return point;
  }

  findAsymptotes(func: MathFunction): string[] {
    const asymp: string[] = [];
    if (func.type === 'rational') {
      const m = func.expression.match(/^(\d*)x\s*\/\s*x\s*([+-]\s*\d+)/);
      if (m) asymp.push(`y = ${(parseInt(m[1]) || 1)}`);
      asymp.push('x = 0 (vertical asymptote)');
    } else if (func.type === 'exponential') {
      asymp.push('y = 0 (horizontal asymptote)');
    } else if (func.type === 'logarithmic') {
      asymp.push('x = 0 (vertical asymptote)');
    }
    return asymp;
  }

  findMonotonicity(func: MathFunction): Monotonicity {
    switch (func.type) {
      case 'linear': {
        const c = this._parsePolynomialCoef(func.expression);
        const slope = c.length >= 2 ? c[1] : 0;
        const type = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'increasing';
        return { intervals: ['(-∞, +∞)'], type };
      }
      case 'quadratic': {
        const v = this.findVertex(func);
        const c = this._parseQuadratic(func.expression);
        if (!c) return { intervals: ['unknown'], type: 'mixed' };
        if (c.a > 0) {
          return {
            intervals: [`(-∞, ${v.x}] decreasing`, `[${v.x}, +∞) increasing`],
            type: 'mixed',
          };
        }
        return {
          intervals: [`(-∞, ${v.x}] increasing`, `[${v.x}, +∞) decreasing`],
          type: 'mixed',
        };
      }
      case 'exponential':
        return { intervals: ['(-∞, +∞) increasing'], type: 'increasing' };
      case 'logarithmic':
        return { intervals: ['(0, +∞) increasing'], type: 'increasing' };
      default:
        return { intervals: ['unknown'], type: 'mixed' };
    }
  }

  findExtrema(func: MathFunction): GraphPoint[] {
    if (func.type === 'quadratic') {
      const v = this.findVertex(func);
      const c = this._parseQuadratic(func.expression);
      if (c) {
        return [{ ...v, label: c.a > 0 ? 'minimum' : 'maximum' }];
      }
    }
    if (func.type === 'linear' || func.type === 'exponential' || func.type === 'logarithmic') {
      return [];
    }
    return [];
  }

  findInflectionPoints(func: MathFunction): GraphPoint[] {
    if (func.type !== 'quadratic') return [];
    // Quadratics have no inflection points
    return [];
  }

  isOdd(func: MathFunction): boolean {
    if (func.type === 'linear') {
      const c = this._parsePolynomialCoef(func.expression);
      return c.length === 2 && Math.abs(c[0]) < 1e-12;
    }
    if (func.type === 'rational') {
      return /x\/x/.test(func.expression.replace(/\s+/g, ''));
    }
    return false;
  }

  isEven(func: MathFunction): boolean {
    if (func.type === 'quadratic') {
      const c = this._parseQuadratic(func.expression);
      return !!c && Math.abs(c.b) < 1e-12;
    }
    if (func.type === 'exponential') {
      return /x\^2/.test(func.expression);
    }
    return false;
  }

  isPeriodic(func: MathFunction): boolean {
    return false;
  }

  composeFunctions(f: MathFunction, g: MathFunction): string {
    return `(${f.expression}) ∘ (${g.expression}) = f(g(x)) where g(x) replaces x in f`;
  }

  inverseFunction(func: MathFunction): string {
    switch (func.type) {
      case 'linear': {
        const c = this._parsePolynomialCoef(func.expression);
        if (c.length < 2) return 'undefined';
        const slope = c[1];
        if (Math.abs(slope) < 1e-12) return 'undefined (constant)';
        const intercept = c[0];
        return `f^-1(x) = (x - ${intercept}) / ${slope}`;
      }
      case 'exponential':
        return `f^-1(x) = log_a(x)`;
      case 'logarithmic':
        return `f^-1(x) = a^x`;
      default:
        return 'inverse not expressible in closed form';
    }
  }

  plot(func: MathFunction, xRange: [number, number]): GraphPoint[] {
    const points: GraphPoint[] = [];
    const [lo, hi] = xRange;
    const samples = 50;
    for (let i = 0; i <= samples; i++) {
      const x = lo + ((hi - lo) * i) / samples;
      let y = NaN;
      if (func.type === 'linear' || func.type === 'quadratic') {
        const c = this._parsePolynomialCoef(func.expression);
        y = c.reduce((sum, val, idx) => sum + val * Math.pow(x, idx), 0);
      } else if (func.type === 'exponential') {
        const match = func.expression.match(/(\d*\.?\d*)\^/);
        const base = match ? parseFloat(match[1]) || Math.E : Math.E;
        y = Math.pow(base, x);
      } else if (func.type === 'logarithmic') {
        y = x > 0 ? Math.log(x) : NaN;
      }
      if (!Number.isNaN(y)) {
        points.push({ x, y, label: `f(${x.toFixed(3)})` });
      }
    }
    this._graphPoints.push(...points);
    this._history.push({ op: 'plot', count: points.length });
    return points;
  }

  private _classify(expr: string): FunctionType {
    if (/x\s*\/\s*\(?x\s*[+-]/.test(expr) || /\d+\/x/.test(expr)) return 'rational';
    if (/log/i.test(expr)) return 'logarithmic';
    if (/\^\s*\(?\s*x/.test(expr)) return 'exponential';
    if (/x\s*\^\s*2/.test(expr)) return 'quadratic';
    if (/x/.test(expr)) return 'linear';
    if (/piece/.test(expr.toLowerCase())) return 'piecewise';
    return 'linear';
  }

  private _parsePolynomialCoef(expr: string): number[] {
    const cleaned = expr.replace(/\s+/g, '').replace(/=.*$/, '');
    const m2 = cleaned.match(/(-?\d*\.?\d*)x\^2(?:([+-])(\d*\.?\d*))?x?(?:([+-])(\d*\.?\d*))?/);
    if (m2) {
      const a = m2[1] === '' || m2[1] === '+' ? 1 : m2[1] === '-' ? -1 : parseFloat(m2[1]);
      const b = m2[2] ? (m2[3] === '' ? (m2[2] === '+' ? 1 : -1) : parseFloat(`${m2[2]}${m2[3]}`)) : 0;
      const c = m2[4] ? parseFloat(`${m2[4]}${m2[5]}`) : 0;
      return [c, b, a];
    }
    const m1 = cleaned.match(/(-?\d*\.?\d*)x(?:([+-])(\d*\.?\d*))?/);
    if (m1) {
      const a = m1[1] === '' || m1[1] === '+' ? 1 : m1[1] === '-' ? -1 : parseFloat(m1[1]);
      const b = m1[2] ? parseFloat(`${m1[2]}${m1[3]}`) : 0;
      return [b, a];
    }
    const m0 = cleaned.match(/^(-?\d*\.?\d+)$/);
    return m0 ? [parseFloat(m0[1])] : [0];
  }

  private _parseQuadratic(expr: string): { a: number; b: number; c: number } | null {
    const c = this._parsePolynomialCoef(expr);
    if (c.length < 3) return null;
    return { a: c[2], b: c[1], c: c[0] };
  }

  findZeros(func: MathFunction): number[] {
    const zeros: number[] = [];
    if (func.type === 'linear') {
      const c = this._parsePolynomialCoef(func.expression);
      if (c.length >= 2 && Math.abs(c[1]) > 1e-12) {
        zeros.push(-c[0] / c[1]);
      }
    } else if (func.type === 'quadratic') {
      const c = this._parseQuadratic(func.expression);
      if (c) {
        const disc = c.b * c.b - 4 * c.a * c.c;
        if (disc >= 0) {
          const s = Math.sqrt(disc);
          zeros.push((-c.b + s) / (2 * c.a));
          zeros.push((-c.b - s) / (2 * c.a));
        }
      }
    }
    return zeros;
  }

  findCriticalPoints(func: MathFunction): GraphPoint[] {
    const points: GraphPoint[] = [];
    if (func.type === 'quadratic') {
      const v = this.findVertex(func);
      points.push({ ...v, label: 'critical point' });
    }
    return points;
  }

  findIntervalsOfIncrease(func: MathFunction): string[] {
    const mono = this.findMonotonicity(func);
    return mono.intervals.filter(i => i.includes('increasing'));
  }

  findIntervalsOfDecrease(func: MathFunction): string[] {
    const mono = this.findMonotonicity(func);
    return mono.intervals.filter(i => i.includes('decreasing'));
  }

  findConcavity(func: MathFunction): { intervals: string[]; type: 'concave_up' | 'concave_down' | 'mixed' } {
    if (func.type === 'quadratic') {
      const c = this._parseQuadratic(func.expression);
      if (c) {
        const type = c.a > 0 ? 'concave_up' : 'concave_down';
        return { intervals: ['(-∞, +∞)'], type };
      }
    }
    return { intervals: ['unknown'], type: 'mixed' };
  }

  findEndBehavior(func: MathFunction): { left: string; right: string } {
    switch (func.type) {
      case 'linear': {
        const c = this._parsePolynomialCoef(func.expression);
        const slope = c.length >= 2 ? c[1] : 0;
        if (slope > 0) return { left: '-∞', right: '+∞' };
        if (slope < 0) return { left: '+∞', right: '-∞' };
        return { left: String(c[0]), right: String(c[0]) };
      }
      case 'quadratic': {
        const c = this._parseQuadratic(func.expression);
        if (c) {
          if (c.a > 0) return { left: '+∞', right: '+∞' };
          return { left: '-∞', right: '-∞' };
        }
        return { left: 'unknown', right: 'unknown' };
      }
      case 'exponential':
        return { left: '0', right: '+∞' };
      case 'logarithmic':
        return { left: '-∞ (as x→0+)', right: '+∞' };
      default:
        return { left: 'unknown', right: 'unknown' };
    }
  }

  findHorizontalAsymptote(func: MathFunction): string | null {
    if (func.type === 'exponential') return 'y = 0';
    if (func.type === 'rational') {
      return 'y = ratio of leading coefficients';
    }
    return null;
  }

  findVerticalAsymptote(func: MathFunction): string[] {
    if (func.type === 'rational') return ['zeros of denominator'];
    if (func.type === 'logarithmic') return ['x = 0'];
    return [];
  }

  findHoles(func: MathFunction): GraphPoint[] {
    return [];
  }

  findSlope(func: MathFunction, x?: number): number {
    if (func.type === 'linear') {
      const c = this._parsePolynomialCoef(func.expression);
      return c.length >= 2 ? c[1] : 0;
    }
    if (func.type === 'quadratic' && x !== undefined) {
      const c = this._parseQuadratic(func.expression);
      if (c) return 2 * c.a * x + c.b;
    }
    return NaN;
  }

  averageRateOfChange(func: MathFunction, a: number, b: number): number {
    const fa = this.evaluateAt(func, a);
    const fb = this.evaluateAt(func, b);
    if (Math.abs(b - a) < 1e-12) return NaN;
    return (fb - fa) / (b - a);
  }

  evaluateAt(func: MathFunction, x: number): number {
    if (func.type === 'linear' || func.type === 'quadratic') {
      const c = this._parsePolynomialCoef(func.expression);
      return c.reduce((sum, val, idx) => sum + val * Math.pow(x, idx), 0);
    }
    if (func.type === 'exponential') {
      const match = func.expression.match(/(\d*\.?\d*)\^/);
      const base = match ? parseFloat(match[1]) || Math.E : Math.E;
      return Math.pow(base, x);
    }
    if (func.type === 'logarithmic') {
      return x > 0 ? Math.log(x) : NaN;
    }
    return NaN;
  }

  functionTable(func: MathFunction, start: number, end: number, step: number): GraphPoint[] {
    const points: GraphPoint[] = [];
    for (let x = start; x <= end + 1e-12; x += step) {
      const y = this.evaluateAt(func, x);
      if (Number.isFinite(y)) {
        points.push({ x, y, label: `f(${x})` });
      }
    }
    return points;
  }

  compareFunctions(f: MathFunction, g: MathFunction, xRange: [number, number]): {
    intersectionPoints: GraphPoint[];
    fGreater: string[];
    gGreater: string[];
  } {
    const intersections: GraphPoint[] = [];
    const fGreater: string[] = [];
    const gGreater: string[] = [];
    const samples = 100;
    const [lo, hi] = xRange;
    let prevDiff = this.evaluateAt(f, lo) - this.evaluateAt(g, lo);
    for (let i = 1; i <= samples; i++) {
      const x = lo + ((hi - lo) * i) / samples;
      const diff = this.evaluateAt(f, x) - this.evaluateAt(g, x);
      if (prevDiff * diff < 0) {
        intersections.push({ x, y: this.evaluateAt(f, x), label: 'intersection' });
      }
      prevDiff = diff;
    }
    return { intersectionPoints: intersections, fGreater, gGreater };
  }

  transformationAnalysis(func: MathFunction): {
    baseFunction: string;
    verticalShift: number;
    horizontalShift: number;
    verticalStretch: number;
    horizontalStretch: number;
    reflection: 'none' | 'x' | 'y' | 'both';
  } {
    let baseFunction = 'f(x)';
    let verticalShift = 0;
    let horizontalShift = 0;
    let verticalStretch = 1;
    let horizontalStretch = 1;
    let reflection: 'none' | 'x' | 'y' | 'both' = 'none';
    if (func.type === 'quadratic') {
      const c = this._parseQuadratic(func.expression);
      if (c) {
        baseFunction = 'x^2';
        verticalStretch = c.a;
        if (c.a < 0) reflection = 'x';
        const h = -c.b / (2 * c.a);
        const k = c.c - c.b * c.b / (4 * c.a);
        horizontalShift = -h;
        verticalShift = k;
      }
    } else if (func.type === 'linear') {
      const c = this._parsePolynomialCoef(func.expression);
      baseFunction = 'x';
      verticalStretch = c.length >= 2 ? c[1] : 1;
      verticalShift = c.length >= 1 ? c[0] : 0;
    }
    return { baseFunction, verticalShift, horizontalShift, verticalStretch, horizontalStretch, reflection };
  }

  piecewiseFunction(pieces: { expr: string; domain: string }[]): MathFunction {
    const id = `fn-${++this._counter}`;
    const fn: MathFunction = {
      id,
      expression: pieces.map(p => `${p.expr} for ${p.domain}`).join(', '),
      type: 'piecewise',
      domain: 'varies by piece',
      range: 'varies by piece',
    };
    this._functions.set(id, fn);
    return fn;
  }

  absoluteValueFunction(a: number, h: number, k: number): MathFunction {
    const id = `fn-${++this._counter}`;
    const expr = `${a}|x - ${h}| + ${k}`;
    const fn: MathFunction = {
      id,
      expression: expr,
      type: 'linear',
      domain: '(-∞, +∞)',
      range: a > 0 ? `[${k}, +∞)` : `(-∞, ${k}]`,
    };
    this._functions.set(id, fn);
    return fn;
  }

  squareRootFunction(a: number, h: number, k: number): MathFunction {
    const id = `fn-${++this._counter}`;
    const expr = `${a}√(x - ${h}) + ${k}`;
    const fn: MathFunction = {
      id,
      expression: expr,
      type: 'rational',
      domain: `[${h}, +∞)`,
      range: a > 0 ? `[${k}, +∞)` : `(-∞, ${k}]`,
    };
    this._functions.set(id, fn);
    return fn;
  }

  cubedRootFunction(a: number, h: number, k: number): MathFunction {
    const id = `fn-${++this._counter}`;
    const expr = `${a}∛(x - ${h}) + ${k}`;
    const fn: MathFunction = {
      id,
      expression: expr,
      type: 'rational',
      domain: '(-∞, +∞)',
      range: '(-∞, +∞)',
    };
    this._functions.set(id, fn);
    return fn;
  }

  recursiveFormula(type: 'arithmetic' | 'geometric', first: number, diff: number): { formula: string; firstFive: number[] } {
    const terms: number[] = [first];
    for (let i = 1; i < 5; i++) {
      if (type === 'arithmetic') {
        terms.push(terms[i - 1] + diff);
      } else {
        terms.push(terms[i - 1] * diff);
      }
    }
    const formula = type === 'arithmetic'
      ? `a₁ = ${first}, aₙ = aₙ₋₁ + ${diff}`
      : `a₁ = ${first}, aₙ = aₙ₋₁ × ${diff}`;
    return { formula, firstFive: terms };
  }

  explicitFormula(type: 'arithmetic' | 'geometric', first: number, diff: number): string {
    return type === 'arithmetic'
      ? `aₙ = ${first} + (n-1)×${diff}`
      : `aₙ = ${first} × ${diff}^(n-1)`;
  }

  fibonacci(n: number): number {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }

  arithmeticSequenceSum(a1: number, d: number, n: number): number {
    return n * (2 * a1 + (n - 1) * d) / 2;
  }

  geometricSequenceSum(a1: number, r: number, n: number): number {
    if (Math.abs(r - 1) < 1e-12) return a1 * n;
    return a1 * (1 - Math.pow(r, n)) / (1 - r);
  }

  functionComposition(f: (x: number) => number, g: (x: number) => number, x: number): number {
    return f(g(x));
  }

  inverseFunctionValue(func: MathFunction, y: number): number | null {
    if (func.type === 'linear') {
      const c = this._parsePolynomialCoef(func.expression);
      if (c.length >= 2 && Math.abs(c[1]) > 1e-12) {
        return (y - c[0]) / c[1];
      }
    }
    return null;
  }

  oneToOne(func: MathFunction): boolean {
    if (func.type === 'linear') {
      const c = this._parsePolynomialCoef(func.expression);
      return c.length >= 2 && Math.abs(c[1]) > 1e-12;
    }
    return false;
  }

  horizontalLineTest(func: MathFunction): boolean {
    return this.oneToOne(func);
  }

  functionArithmetic(f: MathFunction, g: MathFunction, operation: 'add' | 'subtract' | 'multiply' | 'divide'): string {
    switch (operation) {
      case 'add': return `(f + g)(x) = f(x) + g(x)`;
      case 'subtract': return `(f - g)(x) = f(x) - g(x)`;
      case 'multiply': return `(f × g)(x) = f(x) × g(x)`;
      case 'divide': return `(f / g)(x) = f(x) / g(x), g(x) ≠ 0`;
    }
  }

  domainOfOperation(f: MathFunction, g: MathFunction, operation: 'add' | 'subtract' | 'multiply' | 'divide'): string {
    const fDom = f.domain;
    const gDom = g.domain;
    if (operation === 'divide') {
      return `intersection of ${fDom} and ${gDom}, excluding zeros of g(x)`;
    }
    return `intersection of ${fDom} and ${gDom}`;
  }

  differenceQuotient(func: MathFunction, h: number = 0.001): string {
    return `(f(x + ${h}) - f(x)) / ${h}`;
  }

  secantLine(func: MathFunction, a: number, b: number): { slope: number; equation: string } {
    const slope = this.averageRateOfChange(func, a, b);
    const fa = this.evaluateAt(func, a);
    const equation = `y - ${fa} = ${slope}(x - ${a})`;
    return { slope, equation };
  }

  tangentLineApproximation(func: MathFunction, a: number): { slope: number; equation: string } {
    const slope = this.findSlope(func, a);
    const fa = this.evaluateAt(func, a);
    const equation = `y = ${fa} + ${slope}(x - ${a})`;
    return { slope, equation };
  }

  newtonsMethod(func: MathFunction, initialGuess: number, iterations: number = 10): number {
    let x = initialGuess;
    for (let i = 0; i < iterations; i++) {
      const fx = this.evaluateAt(func, x);
      const fpx = this.findSlope(func, x);
      if (Math.abs(fpx) < 1e-12) break;
      x = x - fx / fpx;
    }
    return x;
  }

  bisectionMethod(func: MathFunction, a: number, b: number, iterations: number = 50): number {
    let lo = a;
    let hi = b;
    for (let i = 0; i < iterations; i++) {
      const mid = (lo + hi) / 2;
      const fMid = this.evaluateAt(func, mid);
      const fLo = this.evaluateAt(func, lo);
      if (Math.abs(fMid) < 1e-12) return mid;
      if (fLo * fMid < 0) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    return (lo + hi) / 2;
  }

  riemannSum(func: MathFunction, a: number, b: number, n: number, type: 'left' | 'right' | 'midpoint' | 'trapezoidal'): number {
    const dx = (b - a) / n;
    let sum = 0;
    if (type === 'left') {
      for (let i = 0; i < n; i++) {
        sum += this.evaluateAt(func, a + i * dx) * dx;
      }
    } else if (type === 'right') {
      for (let i = 1; i <= n; i++) {
        sum += this.evaluateAt(func, a + i * dx) * dx;
      }
    } else if (type === 'midpoint') {
      for (let i = 0; i < n; i++) {
        sum += this.evaluateAt(func, a + (i + 0.5) * dx) * dx;
      }
    } else {
      for (let i = 0; i <= n; i++) {
        const weight = (i === 0 || i === n) ? 0.5 : 1;
        sum += weight * this.evaluateAt(func, a + i * dx) * dx;
      }
    }
    return sum;
  }

  limitDefinitionOfDerivative(func: MathFunction, x: number, h: number = 0.0001): number {
    const fxh = this.evaluateAt(func, x + h);
    const fx = this.evaluateAt(func, x);
    return (fxh - fx) / h;
  }

  powerRule(coefficient: number, exponent: number): { coefficient: number; exponent: number } {
    return { coefficient: coefficient * exponent, exponent: exponent - 1 };
  }

  integralPowerRule(coefficient: number, exponent: number): { coefficient: number; exponent: number; constant: string } {
    if (Math.abs(exponent + 1) < 1e-12) {
      return { coefficient, exponent: 0, constant: '+ C (ln|x|)' };
    }
    return { coefficient: coefficient / (exponent + 1), exponent: exponent + 1, constant: '+ C' };
  }

  fundamentalTheoremOfCalculus(): string {
    return '∫[a,b] f(x) dx = F(b) - F(a), where F\'(x) = f(x)';
  }

  private _parityString(fn: MathFunction): string {
    if (this.isEven(fn)) return 'even';
    if (this.isOdd(fn)) return 'odd';
    return 'neither';
  }

  toPacket(): DataPacket<{
    functions: Map<string, MathFunction>;
    properties: FunctionProperty[];
    graphPoints: GraphPoint[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['middle_school_math', 'FunctionAnalyzer'],
      priority: 1,
      phase: 'function_analysis',
    };
    return {
      id: `fnanalyzer-${Date.now().toString(36)}`,
      payload: {
        functions: this._functions,
        properties: this._properties,
        graphPoints: this._graphPoints,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._functions = new Map();
    this._properties = [];
    this._graphPoints = [];
    this._history = [];
    this._counter = 0;
  }

  get functionCount(): number {
    return this._functions.size;
  }

  get propertyCount(): number {
    return this._properties.length;
  }

  get graphPointCount(): number {
    return this._graphPoints.length;
  }
}
