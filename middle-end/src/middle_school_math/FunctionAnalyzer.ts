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
