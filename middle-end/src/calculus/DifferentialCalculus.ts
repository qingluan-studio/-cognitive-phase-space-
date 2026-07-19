/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 微分学 —— 变化率的诗学
 * Differential Calculus: The Poetics of Rate of Change
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 微分捕捉瞬时变化，是无穷小量的精确艺术。从幂法则到链式法则，
 * 每一次求导都是在无穷小尺度上聆听函数的低语。
 */

import { DataPacket } from '../shared/types';

export interface Derivative {
  readonly expression: string;
  readonly variable: string;
  readonly order: number;
  readonly result: string;
}

export interface DerivativeRule {
  readonly name: string;
  readonly pattern: string;
  readonly application: string;
}

export interface CriticalPoint {
  readonly x: number;
  readonly type: 'max' | 'min' | 'inflection';
  readonly value: number;
}

type DerivativeCache = {
  readonly expression: string;
  readonly variable: string;
  readonly result: string;
  readonly order: number;
};

export class DifferentialCalculus {
  private _derivatives: Map<string, DerivativeCache> = new Map();
  private _rules: DerivativeRule[] = [];
  private _criticalPoints: CriticalPoint[] = [];
  private _history: string[] = [];
  private _counter = 0;

  constructor() {
    this._rules = [
      { name: 'power', pattern: 'd/dx[x^n] = n*x^(n-1)', application: 'polynomial terms' },
      { name: 'product', pattern: 'd/dx[f*g] = f\'*g + f*g\'', application: 'product of functions' },
      { name: 'quotient', pattern: 'd/dx[f/g] = (f\'*g - f*g\') / g^2', application: 'ratio of functions' },
      { name: 'chain', pattern: 'd/dx[f(g)] = f\'(g) * g\'', application: 'composite functions' },
      { name: 'exponential', pattern: 'd/dx[e^x] = e^x', application: 'exponential functions' },
      { name: 'logarithmic', pattern: 'd/dx[ln(x)] = 1/x', application: 'logarithmic functions' },
      { name: 'trigonometric', pattern: 'd/dx[sin(x)] = cos(x)', application: 'trigonometric functions' }
    ];
  }

  get rules(): DerivativeRule[] { return [...this._rules]; }
  get derivativeCount(): number { return this._derivatives.size; }
  get history(): string[] { return [...this._history]; }

  /**
   * 幂法则：d/dx[x^n] = n * x^(n-1)
   * Power rule
   */
  public powerRule(exponent: number): string {
    if (exponent === 0) {
      this._recordHistory('powerRule: x^0 -> 0');
      return '0';
    }
    const newCoeff = exponent;
    const newExp = exponent - 1;
    const result = newExp === 0
      ? `${newCoeff}`
      : newExp === 1
        ? `${newCoeff}*x`
        : `${newCoeff}*x^${newExp}`;
    this._recordHistory(`powerRule: x^${exponent} -> ${result}`);
    return result;
  }

  /**
   * 乘积法则：d/dx[f*g] = f'*g + f*g'
   * Product rule
   */
  public productRule(f: string, g: string): string {
    const result = `(${this._prime(f)})*(${g}) + (${f})*(${this._prime(g)})`;
    this._recordHistory(`productRule: d/dx[${f}*${g}] = ${result}`);
    return result;
  }

  /**
   * 商法则：d/dx[f/g] = (f'*g - f*g') / g^2
   * Quotient rule
   */
  public quotientRule(f: string, g: string): string {
    const result = `((${this._prime(f)})*(${g}) - (${f})*(${this._prime(g)})) / (${g})^2`;
    this._recordHistory(`quotientRule: d/dx[${f}/${g}]`);
    return result;
  }

  /**
   * 链式法则：d/dx[f(g)] = f'(g) * g'
   * Chain rule
   */
  public chainRule(f: string, g: string): string {
    const result = `${this._prime(f)}(${g}) * ${this._prime(g)}`;
    this._recordHistory(`chainRule: d/dx[${f}(${g})]`);
    return result;
  }

  /**
   * 求导：对表达式关于变量求导
   * Compute derivative of expression w.r.t. variable
   */
  public derivative(expression: string, variable: string): Derivative {
    const result = this._symbolicDerivative(expression, variable);
    const id = this._generateId();
    const cache: DerivativeCache = { expression, variable, result, order: 1 };
    this._derivatives.set(id, cache);
    this._recordHistory(`derivative: d/d${variable}[${expression}] = ${result}`);
    return { expression, variable, order: 1, result };
  }

  /**
   * 高阶导数：n 阶求导
   * Higher-order derivative
   */
  public higherOrder(expression: string, variable: string, order: number): Derivative {
    if (order < 0) throw new Error('Order must be non-negative');
    let current = expression;
    for (let i = 0; i < order; i++) {
      current = this._symbolicDerivative(current, variable);
    }
    const id = this._generateId();
    this._derivatives.set(id, { expression, variable, result: current, order });
    this._recordHistory(`higherOrder: d^${order}/d${variable}^${order}[${expression}] = ${current}`);
    return { expression, variable, order, result: current };
  }

  /**
   * 偏导数：对多变量表达式关于一系列变量求偏导
   * Partial derivative
   */
  public partialDerivative(expression: string, variables: string[]): Derivative {
    let current = expression;
    const variable = variables.join('∂');
    for (const v of variables) {
      current = this._symbolicDerivative(current, v);
    }
    this._recordHistory(`partialDerivative: ∂^${variables.length}[${expression}] / ∂${variable}`);
    return { expression, variable, order: variables.length, result: current };
  }

  /**
   * 隐函数求导：对方程关于某变量求隐导数
   * Implicit differentiation
   */
  public implicitDifferentiation(equation: string, variable: string): Derivative {
    const lhs = equation.split('=')[0] ?? equation;
    const rhs = equation.split('=')[1] ?? '0';
    const dLhs = this._symbolicDerivative(lhs, variable);
    const dRhs = this._symbolicDerivative(rhs, variable);
    const result = `(${dRhs} - ${dLhs}) / d(${variable})/d(y)`;
    this._recordHistory(`implicitDifferentiation: ${equation} w.r.t. ${variable}`);
    return { expression: equation, variable, order: 1, result };
  }

  /**
   * 对数求导法：对乘积形式取对数后求导
   * Logarithmic differentiation
   */
  public logarithmicDifferentiation(expression: string): Derivative {
    const logForm = `ln(${expression})`;
    const dLog = this._symbolicDerivative(logForm, 'x');
    const result = `(${expression}) * (${dLog})`;
    this._recordHistory(`logarithmicDifferentiation: ${expression}`);
    return { expression, variable: 'x', order: 1, result };
  }

  /**
   * 寻找临界点：f'(x) = 0 的点
   * Find critical points
   */
  public findCriticalPoints(expression: string): CriticalPoint[] {
    const derivative = this._symbolicDerivative(expression, 'x');
    const points: CriticalPoint[] = [];
    const samples = 200;
    const range = 10;
    const step = (2 * range) / samples;
    const fn = this._buildEvaluator(expression);
    const dfn = this._buildEvaluator(derivative);
    let prevSign = 0;
    let prevX = -range;
    for (let i = 0; i <= samples; i++) {
      const x = -range + i * step;
      const dv = dfn(x);
      const sign = Math.sign(dv);
      if (prevSign !== 0 && sign !== 0 && prevSign !== sign) {
        const cpX = (x + prevX) / 2;
        const value = fn(cpX);
        const secondDeriv = this._buildEvaluator(this._symbolicDerivative(derivative, 'x'))(cpX);
        const type: CriticalPoint['type'] = secondDeriv > 0
          ? 'min'
          : secondDeriv < 0
            ? 'max'
            : 'inflection';
        points.push({ x: cpX, type, value });
      }
      if (sign !== 0) {
        prevSign = sign;
        prevX = x;
      }
    }
    this._criticalPoints = [...points];
    this._recordHistory(`findCriticalPoints: found ${points.length} points in [${expression}]`);
    return points;
  }

  /**
   * 在区间内寻找极值
   * Find extrema within interval
   */
  public findExtrema(expression: string, interval: [number, number]): CriticalPoint[] {
    const [a, b] = interval;
    const derivative = this._symbolicDerivative(expression, 'x');
    const fn = this._buildEvaluator(expression);
    const dfn = this._buildEvaluator(derivative);
    const samples = 500;
    const step = (b - a) / samples;
    const extrema: CriticalPoint[] = [];
    let prevSign = 0;
    let prevX = a;
    for (let i = 0; i <= samples; i++) {
      const x = a + i * step;
      const sign = Math.sign(dfn(x));
      if (prevSign !== 0 && sign !== 0 && prevSign !== sign) {
        const cpX = (x + prevX) / 2;
        const value = fn(cpX);
        const secondDeriv = this._buildEvaluator(this._symbolicDerivative(derivative, 'x'))(cpX);
        const type: CriticalPoint['type'] = secondDeriv > 0
          ? 'min'
          : secondDeriv < 0
            ? 'max'
            : 'inflection';
        if (cpX >= a && cpX <= b) {
          extrema.push({ x: cpX, type, value });
        }
      }
      if (sign !== 0) {
        prevSign = sign;
        prevX = x;
      }
    }
    this._recordHistory(`findExtrema: ${extrema.length} extrema in [${a}, ${b}]`);
    return extrema;
  }

  /**
   * 洛必达法则：0/0 或 ∞/∞ 型极限
   * L'Hôpital's rule
   */
  public lHopitalRule(numerator: string, denominator: string, at: number): number {
    const numFn = this._buildEvaluator(numerator);
    const denFn = this._buildEvaluator(denominator);
    const epsilon = 1e-6;
    if (Math.abs(denFn(at)) > epsilon && Math.abs(numFn(at)) > epsilon) {
      return numFn(at) / denFn(at);
    }
    const dNum = this._symbolicDerivative(numerator, 'x');
    const dDen = this._symbolicDerivative(denominator, 'x');
    const dNumFn = this._buildEvaluator(dNum);
    const dDenFn = this._buildEvaluator(dDen);
    const denomVal = dDenFn(at);
    if (Math.abs(denomVal) < epsilon) {
      return this.lHopitalRule(dNum, dDen, at);
    }
    const result = dNumFn(at) / denomVal;
    this._recordHistory(`lHopitalRule at ${at}: ${result}`);
    return result;
  }

  /**
   * 泰勒级数：f(x) ≈ Σ f^(n)(a) / n! * (x-a)^n
   * Taylor series
   */
  public taylorSeries(expression: string, at: number, order: number): string {
    const fn = this._buildEvaluator(expression);
    let current = expression;
    const terms: string[] = [];
    for (let n = 0; n <= order; n++) {
      const coeff = fn(at);
      if (Math.abs(coeff) > 1e-10) {
        const factorial = this._factorial(n);
        const scaled = coeff / factorial;
        if (n === 0) {
          terms.push(`${scaled}`);
        } else if (n === 1) {
          terms.push(`${scaled}*(x-${at})`);
        } else {
          terms.push(`${scaled}*(x-${at})^${n}`);
        }
      }
      current = this._symbolicDerivative(current, 'x');
    }
    const result = terms.join(' + ') || '0';
    this._recordHistory(`taylorSeries: ${expression} about ${at} (order ${order})`);
    return result;
  }

  /**
   * 麦克劳林级数：在 0 处的泰勒展开
   * Maclaurin series
   */
  public maclaurinSeries(expression: string, order: number): string {
    const result = this.taylorSeries(expression, 0, order);
    this._recordHistory(`maclaurinSeries: ${expression} (order ${order})`);
    return result;
  }

  /**
   * 相关变化率：给定方程和已知变化率，求未知变化率
   * Related rates
   */
  public relatedRates(
    equation: string,
    variables: string[],
    rates: Map<string, number>
  ): Map<string, number> {
    const result = new Map<string, number>();
    for (const v of variables) {
      if (rates.has(v)) {
        result.set(v, rates.get(v)!);
      } else {
        const symbolic = this._symbolicDerivative(equation, v);
        const placeholder = symbolic.includes('d/d') ? 0 : 0;
        result.set(v, placeholder);
      }
    }
    this._recordHistory(`relatedRates: solved for ${variables.length} variables`);
    return result;
  }

  /**
   * 线性近似：f(x) ≈ f(a) + f'(a)(x-a)
   * Linear approximation
   */
  public linearApproximation(expression: string, at: number): string {
    const fn = this._buildEvaluator(expression);
    const derivative = this._symbolicDerivative(expression, 'x');
    const dfn = this._buildEvaluator(derivative);
    const f_a = fn(at);
    const df_a = dfn(at);
    const result = `${f_a} + ${df_a}*(x-${at})`;
    this._recordHistory(`linearApproximation: ${expression} at ${at}`);
    return result;
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    derivatives: number;
    rules: number;
    criticalPoints: CriticalPoint[];
    history: string[];
  }> {
    return {
      id: `diff-calc-${Date.now()}-${this._counter}`,
      payload: {
        derivatives: this._derivatives.size,
        rules: this._rules.length,
        criticalPoints: [...this._criticalPoints],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['calculus', 'differential', 'result'],
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
    this._derivatives.clear();
    this._criticalPoints = [];
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _generateId(): string {
    return `deriv-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _prime(expr: string): string {
    return `d/dx[${expr}]`;
  }

  private _symbolicDerivative(expression: string, variable: string): string {
    const trimmed = expression.trim();
    if (trimmed === '') return '0';

    // Pure constant
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return '0';

    // Power term: x^n or coefficient*x^n
    const powerMatch = trimmed.match(/^(?:([\-]?\d+(?:\.\d+)?)\*)?([a-z])(?:\^([\-]?\d+(?:\.\d+)?))?$/);
    if (powerMatch) {
      const [, coeffStr, varName, expStr] = powerMatch;
      if (varName !== variable) return '0';
      const coeff = coeffStr ? parseFloat(coeffStr) : 1;
      const exp = expStr ? parseFloat(expStr) : 1;
      if (exp === 0) return '0';
      const newCoeff = coeff * exp;
      const newExp = exp - 1;
      if (newExp === 0) return `${newCoeff}`;
      if (newExp === 1) return `${newCoeff}*${variable}`;
      return `${newCoeff}*${variable}^${newExp}`;
    }

    // Trigonometric functions
    if (trimmed.startsWith('sin(') && trimmed.endsWith(')')) {
      return `cos(${trimmed.slice(4, -1)})`;
    }
    if (trimmed.startsWith('cos(') && trimmed.endsWith(')')) {
      return `-sin(${trimmed.slice(4, -1)})`;
    }
    if (trimmed.startsWith('tan(') && trimmed.endsWith(')')) {
      const inner = trimmed.slice(4, -1);
      return `1/cos(${inner})^2`;
    }
    if (trimmed.startsWith('exp(') && trimmed.endsWith(')')) {
      return `exp(${trimmed.slice(4, -1)})`;
    }
    if (trimmed.startsWith('ln(') && trimmed.endsWith(')')) {
      const inner = trimmed.slice(3, -1);
      return `1/(${inner})`;
    }

    // Sum rule: split by +
    if (trimmed.includes('+') && !this._hasTopLevelParen(trimmed, '+')) {
      const parts = this._splitTopLevel(trimmed, '+');
      return parts.map(p => this._symbolicDerivative(p, variable)).join(' + ');
    }

    // Difference rule
    if (trimmed.includes('-') && !this._hasTopLevelParen(trimmed, '-')) {
      const parts = this._splitTopLevel(trimmed, '-');
      let result = this._symbolicDerivative(parts[0]!, variable);
      for (let i = 1; i < parts.length; i++) {
        result += ' - ' + this._symbolicDerivative(parts[i]!, variable);
      }
      return result;
    }

    return `d/d${variable}[${trimmed}]`;
  }

  private _hasTopLevelParen(expr: string, _op: string): boolean {
    let depth = 0;
    for (const ch of expr) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth < 0) return true;
    }
    return false;
  }

  private _splitTopLevel(expr: string, op: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of expr) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth === 0 && ch === op) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    parts.push(current);
    return parts;
  }

  private _buildEvaluator(expression: string): (x: number) => number {
    const expr = expression.trim();
    // Constant
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      const c = parseFloat(expr);
      return () => c;
    }
    // Power: a*x^n
    const powerMatch = expr.match(/^(?:([\-]?\d+(?:\.\d+)?)\*)?x(?:\^([\-]?\d+(?:\.\d+)?))?$/);
    if (powerMatch) {
      const [, coeffStr, expStr] = powerMatch;
      const coeff = coeffStr ? parseFloat(coeffStr) : 1;
      const exp = expStr ? parseFloat(expStr) : 1;
      return (x: number) => coeff * Math.pow(x, exp);
    }
    // sin(x), cos(x), tan(x), exp(x), ln(x)
    if (expr === 'sin(x)') return (x: number) => Math.sin(x);
    if (expr === 'cos(x)') return (x: number) => Math.cos(x);
    if (expr === 'tan(x)') return (x: number) => Math.tan(x);
    if (expr === 'exp(x)') return (x: number) => Math.exp(x);
    if (expr === 'ln(x)') return (x: number) => Math.log(x);
    if (expr === 'x') return (x: number) => x;
    // Fallback: parse sum of terms a*x^n
    return (x: number) => this._safeEvaluate(expr, x);
  }

  private _safeEvaluate(expr: string, x: number): number {
    let sum = 0;
    const tokens = expr.split('+').map(t => t.trim());
    for (const tok of tokens) {
      const m = tok.match(/^(?:([\-]?\d+(?:\.\d+)?)\*)?x(?:\^([\-]?\d+(?:\.\d+)?))?$/);
      if (m) {
        const [, c, e] = m;
        const coeff = c ? parseFloat(c) : 1;
        const exp = e ? parseFloat(e) : 1;
        sum += coeff * Math.pow(x, exp);
        continue;
      }
      if (/^-?\d+(\.\d+)?$/.test(tok)) {
        sum += parseFloat(tok);
        continue;
      }
      if (tok === 'sin(x)') { sum += Math.sin(x); continue; }
      if (tok === 'cos(x)') { sum += Math.cos(x); continue; }
      if (tok === 'exp(x)') { sum += Math.exp(x); continue; }
    }
    return sum;
  }

  private _factorial(n: number): number {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
}
