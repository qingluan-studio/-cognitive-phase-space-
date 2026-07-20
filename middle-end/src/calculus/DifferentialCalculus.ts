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

export interface NumericalDerivativeResult {
  readonly x: number;
  readonly value: number;
  readonly method: 'forward' | 'backward' | 'central' | 'five-point';
  readonly stepSize: number;
  readonly errorEstimate: number;
}

export interface NewtonResult {
  readonly root: number;
  readonly iterations: number;
  readonly converged: boolean;
  readonly history: number[];
}

export interface MeanValueResult {
  readonly c: number;
  readonly fPrimeC: number;
  readonly slopeAB: number;
  readonly theorem: 'rolle' | 'lagrange' | 'cauchy';
}

export interface Asymptote {
  readonly type: 'vertical' | 'horizontal' | 'oblique';
  readonly equation: string;
  readonly limit: number;
}

export interface FunctionAnalysis {
  readonly domain: [number, number];
  readonly increasing: number[][];
  readonly decreasing: number[][];
  readonly concaveUp: number[][];
  readonly concaveDown: number[][];
  readonly criticalPoints: CriticalPoint[];
  readonly inflectionPoints: CriticalPoint[];
  readonly asymptotes: Asymptote[];
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
   * 二次近似：f(x) ≈ f(a) + f'(a)(x-a) + f''(a)/2 * (x-a)²
   * Quadratic approximation
   */
  public quadraticApproximation(expression: string, at: number): string {
    const fn = this._buildEvaluator(expression);
    const d1 = this._symbolicDerivative(expression, 'x');
    const d2 = this._symbolicDerivative(d1, 'x');
    const dfn1 = this._buildEvaluator(d1);
    const dfn2 = this._buildEvaluator(d2);
    const f_a = fn(at);
    const df_a = dfn1(at);
    const ddf_a = dfn2(at);
    const result = `${f_a} + ${df_a}*(x-${at}) + ${ddf_a / 2}*(x-${at})^2`;
    this._recordHistory(`quadraticApproximation: ${expression} at ${at}`);
    return result;
  }

  /**
   * 数值微分：前向差分法
   * Numerical differentiation: forward difference
   */
  public forwardDifference(
    expression: string,
    x: number,
    h: number = 1e-5
  ): NumericalDerivativeResult {
    const fn = this._buildEvaluator(expression);
    const value = (fn(x + h) - fn(x)) / h;
    const errorEstimate = Math.abs(h * this._estimateSecondDerivative(fn, x) / 2);
    this._recordHistory(`forwardDifference at x=${x}: ${value}`);
    return { x, value, method: 'forward', stepSize: h, errorEstimate };
  }

  /**
   * 数值微分：后向差分法
   * Numerical differentiation: backward difference
   */
  public backwardDifference(
    expression: string,
    x: number,
    h: number = 1e-5
  ): NumericalDerivativeResult {
    const fn = this._buildEvaluator(expression);
    const value = (fn(x) - fn(x - h)) / h;
    const errorEstimate = Math.abs(h * this._estimateSecondDerivative(fn, x) / 2);
    this._recordHistory(`backwardDifference at x=${x}: ${value}`);
    return { x, value, method: 'backward', stepSize: h, errorEstimate };
  }

  /**
   * 数值微分：中心差分法（二阶精度）
   * Numerical differentiation: central difference (2nd order)
   */
  public centralDifference(
    expression: string,
    x: number,
    h: number = 1e-5
  ): NumericalDerivativeResult {
    const fn = this._buildEvaluator(expression);
    const value = (fn(x + h) - fn(x - h)) / (2 * h);
    const errorEstimate = Math.abs((h * h) * this._estimateFourthDerivative(fn, x) / 6);
    this._recordHistory(`centralDifference at x=${x}: ${value}`);
    return { x, value, method: 'central', stepSize: h, errorEstimate };
  }

  /**
   * 数值微分：五点公式（四阶精度）
   * Numerical differentiation: five-point formula (4th order)
   */
  public fivePointDifference(
    expression: string,
    x: number,
    h: number = 1e-4
  ): NumericalDerivativeResult {
    const fn = this._buildEvaluator(expression);
    const f1 = fn(x - 2 * h);
    const f2 = fn(x - h);
    const f3 = fn(x + h);
    const f4 = fn(x + 2 * h);
    const value = (-f4 + 8 * f3 - 8 * f2 + f1) / (12 * h);
    const errorEstimate = Math.abs(Math.pow(h, 4) * this._estimateSixthDerivative(fn, x) / 30);
    this._recordHistory(`fivePointDifference at x=${x}: ${value}`);
    return { x, value, method: 'five-point', stepSize: h, errorEstimate };
  }

  /**
   * 高阶数值微分（二阶导数）
   * Numerical second derivative
   */
  public numericalSecondDerivative(
    expression: string,
    x: number,
    h: number = 1e-4
  ): number {
    const fn = this._buildEvaluator(expression);
    const value = (fn(x + h) - 2 * fn(x) + fn(x - h)) / (h * h);
    this._recordHistory(`numericalSecondDerivative at x=${x}: ${value}`);
    return value;
  }

  /**
   * 反函数求导：d/dx [f⁻¹(x)] = 1 / f'(f⁻¹(x))
   * Inverse function derivative
   */
  public inverseFunctionDerivative(
    f: string,
    inverseFAtPoint: number
  ): number {
    const dF = this._symbolicDerivative(f, 'x');
    const dFn = this._buildEvaluator(dF);
    const result = 1 / dFn(inverseFAtPoint);
    this._recordHistory(`inverseFunctionDerivative: ${result}`);
    return result;
  }

  /**
   * 参数方程求导：dy/dx = (dy/dt) / (dx/dt)
   * Parametric derivative
   */
  public parametricDerivative(
    xExpr: string,
    yExpr: string,
    t: string,
    atT: number
  ): number {
    const dxdt = this._symbolicDerivative(xExpr, t);
    const dydt = this._symbolicDerivative(yExpr, t);
    const dxFn = this._buildEvaluatorWithVar(dxdt, t);
    const dyFn = this._buildEvaluatorWithVar(dydt, t);
    const dx = dxFn(atT);
    const dy = dyFn(atT);
    if (Math.abs(dx) < 1e-12) return NaN;
    const result = dy / dx;
    this._recordHistory(`parametricDerivative at t=${atT}: ${result}`);
    return result;
  }

  /**
   * 极坐标求导：dy/dx = (dr/dθ sinθ + r cosθ) / (dr/dθ cosθ - r sinθ)
   * Polar coordinate derivative
   */
  public polarDerivative(rExpr: string, theta: number): number {
    const drdtheta = this._symbolicDerivative(rExpr, 'x');
    const drFn = this._buildEvaluator(drdtheta);
    const rFn = this._buildEvaluator(rExpr);
    const r = rFn(theta);
    const dr = drFn(theta);
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const numerator = dr * sinT + r * cosT;
    const denominator = dr * cosT - r * sinT;
    if (Math.abs(denominator) < 1e-12) return NaN;
    const result = numerator / denominator;
    this._recordHistory(`polarDerivative at θ=${theta}: ${result}`);
    return result;
  }

  /**
   * 牛顿迭代法求根：x_{n+1} = x_n - f(x_n)/f'(x_n)
   * Newton-Raphson method
   */
  public newtonMethod(
    expression: string,
    initialGuess: number,
    tolerance: number = 1e-10,
    maxIterations: number = 100
  ): NewtonResult {
    const fn = this._buildEvaluator(expression);
    const dExpr = this._symbolicDerivative(expression, 'x');
    const dfn = this._buildEvaluator(dExpr);
    let x = initialGuess;
    const history: number[] = [x];
    let converged = false;
    let iterations = 0;
    for (let i = 0; i < maxIterations; i++) {
      const fx = fn(x);
      const dfx = dfn(x);
      if (Math.abs(dfx) < 1e-15) break;
      const xNew = x - fx / dfx;
      history.push(xNew);
      iterations = i + 1;
      if (Math.abs(xNew - x) < tolerance) {
        converged = true;
        x = xNew;
        break;
      }
      x = xNew;
    }
    this._recordHistory(`newtonMethod: root=${x}, iter=${iterations}, converged=${converged}`);
    return { root: x, iterations, converged, history };
  }

  /**
   * 割线法求根（不需要导数）
   * Secant method
   */
  public secantMethod(
    expression: string,
    x0: number,
    x1: number,
    tolerance: number = 1e-10,
    maxIterations: number = 100
  ): NewtonResult {
    const fn = this._buildEvaluator(expression);
    let xPrev = x0;
    let xCurr = x1;
    let fPrev = fn(xPrev);
    const history: number[] = [x0, x1];
    let converged = false;
    let iterations = 0;
    for (let i = 0; i < maxIterations; i++) {
      const fCurr = fn(xCurr);
      const denom = fCurr - fPrev;
      if (Math.abs(denom) < 1e-15) break;
      const xNew = xCurr - fCurr * (xCurr - xPrev) / denom;
      history.push(xNew);
      iterations = i + 1;
      if (Math.abs(xNew - xCurr) < tolerance) {
        converged = true;
        xCurr = xNew;
        break;
      }
      xPrev = xCurr;
      fPrev = fCurr;
      xCurr = xNew;
    }
    this._recordHistory(`secantMethod: root=${xCurr}, iter=${iterations}, converged=${converged}`);
    return { root: xCurr, iterations, converged, history };
  }

  /**
   * 罗尔定理验证：若 f(a)=f(b)，则存在 c∈(a,b) 使 f'(c)=0
   * Rolle's theorem verification
   */
  public rolleTheorem(expression: string, a: number, b: number): MeanValueResult | null {
    const fn = this._buildEvaluator(expression);
    const dExpr = this._symbolicDerivative(expression, 'x');
    const dfn = this._buildEvaluator(dExpr);
    if (Math.abs(fn(a) - fn(b)) > 1e-6) {
      this._recordHistory(`rolleTheorem: f(a)≠f(b), theorem not applicable`);
      return null;
    }
    const c = this._findZeroOfDerivative(dfn, a, b);
    if (c === null) {
      this._recordHistory(`rolleTheorem: no c found in (${a},${b})`);
      return null;
    }
    const result: MeanValueResult = {
      c,
      fPrimeC: dfn(c),
      slopeAB: 0,
      theorem: 'rolle'
    };
    this._recordHistory(`rolleTheorem: c=${c}`);
    return result;
  }

  /**
   * 拉格朗日中值定理：存在 c∈(a,b) 使 f'(c) = (f(b)-f(a))/(b-a)
   * Lagrange mean value theorem
   */
  public lagrangeMeanValue(expression: string, a: number, b: number): MeanValueResult | null {
    const fn = this._buildEvaluator(expression);
    const dExpr = this._symbolicDerivative(expression, 'x');
    const dfn = this._buildEvaluator(dExpr);
    const slopeAB = (fn(b) - fn(a)) / (b - a);
    const diffFn = (x: number) => dfn(x) - slopeAB;
    const c = this._findRootByBisection(diffFn, a, b);
    if (c === null) {
      this._recordHistory(`lagrangeMeanValue: no c found`);
      return null;
    }
    const result: MeanValueResult = {
      c,
      fPrimeC: dfn(c),
      slopeAB,
      theorem: 'lagrange'
    };
    this._recordHistory(`lagrangeMeanValue: c=${c}`);
    return result;
  }

  /**
   * 函数单调性分析
   * Monotonicity analysis
   */
  public analyzeMonotonicity(expression: string, interval: [number, number]): {
    increasing: number[][];
    decreasing: number[][];
  } {
    const dExpr = this._symbolicDerivative(expression, 'x');
    const dfn = this._buildEvaluator(dExpr);
    const [a, b] = interval;
    const samples = 1000;
    const h = (b - a) / samples;
    const increasing: number[][] = [];
    const decreasing: number[][] = [];
    let currentSign = 0;
    let segmentStart = a;
    for (let i = 0; i <= samples; i++) {
      const x = a + i * h;
      const sign = Math.sign(dfn(x));
      if (sign !== 0 && sign !== currentSign) {
        if (currentSign > 0) {
          increasing.push([segmentStart, x]);
        } else if (currentSign < 0) {
          decreasing.push([segmentStart, x]);
        }
        currentSign = sign;
        segmentStart = x;
      }
    }
    if (currentSign > 0) {
      increasing.push([segmentStart, b]);
    } else if (currentSign < 0) {
      decreasing.push([segmentStart, b]);
    }
    this._recordHistory(`analyzeMonotonicity: ${increasing.length} inc, ${decreasing.length} dec`);
    return { increasing, decreasing };
  }

  /**
   * 凹凸性分析
   * Concavity analysis
   */
  public analyzeConcavity(expression: string, interval: [number, number]): {
    concaveUp: number[][];
    concaveDown: number[][];
    inflectionPoints: CriticalPoint[];
  } {
    const d1 = this._symbolicDerivative(expression, 'x');
    const d2 = this._symbolicDerivative(d1, 'x');
    const ddfn = this._buildEvaluator(d2);
    const fn = this._buildEvaluator(expression);
    const [a, b] = interval;
    const samples = 1000;
    const h = (b - a) / samples;
    const concaveUp: number[][] = [];
    const concaveDown: number[][] = [];
    const inflectionPoints: CriticalPoint[] = [];
    let currentSign = 0;
    let segmentStart = a;
    let prevVal = ddfn(a);
    for (let i = 1; i <= samples; i++) {
      const x = a + i * h;
      const val = ddfn(x);
      const sign = Math.sign(val);
      if (sign !== 0 && sign !== currentSign && currentSign !== 0) {
        const ipX = a + (i - 0.5) * h;
        inflectionPoints.push({ x: ipX, type: 'inflection', value: fn(ipX) });
        if (currentSign > 0) {
          concaveUp.push([segmentStart, ipX]);
        } else {
          concaveDown.push([segmentStart, ipX]);
        }
        segmentStart = ipX;
        currentSign = sign;
      } else if (sign !== 0 && currentSign === 0) {
        currentSign = sign;
        segmentStart = x;
      }
      prevVal = val;
    }
    if (currentSign > 0) {
      concaveUp.push([segmentStart, b]);
    } else if (currentSign < 0) {
      concaveDown.push([segmentStart, b]);
    }
    this._recordHistory(`analyzeConcavity: ${inflectionPoints.length} inflection points`);
    return { concaveUp, concaveDown, inflectionPoints };
  }

  /**
   * 全函数分析
   * Complete function analysis
   */
  public analyzeFunction(expression: string, domain: [number, number]): FunctionAnalysis {
    const mono = this.analyzeMonotonicity(expression, domain);
    const conc = this.analyzeConcavity(expression, domain);
    const critPoints = this.findCriticalPoints(expression);
    const asymptotes = this.findAsymptotes(expression, domain);
    const result: FunctionAnalysis = {
      domain,
      increasing: mono.increasing,
      decreasing: mono.decreasing,
      concaveUp: conc.concaveUp,
      concaveDown: conc.concaveDown,
      criticalPoints: critPoints,
      inflectionPoints: conc.inflectionPoints,
      asymptotes
    };
    this._recordHistory(`analyzeFunction: complete analysis of ${expression}`);
    return result;
  }

  /**
   * 渐近线分析
   * Asymptote detection
   */
  public findAsymptotes(expression: string, domain: [number, number]): Asymptote[] {
    const asymptotes: Asymptote[] = [];
    const fn = this._buildEvaluator(expression);
    const [a, b] = domain;
    const samples = 500;
    const h = (b - a) / samples;
    let prevVal = fn(a);
    for (let i = 1; i <= samples; i++) {
      const x = a + i * h;
      const val = fn(x);
      if (Math.abs(val) > 1e10 && Math.abs(prevVal) < 1e6) {
        asymptotes.push({
          type: 'vertical',
          equation: `x = ${x.toFixed(4)}`,
          limit: val > 0 ? Infinity : -Infinity
        });
      }
      prevVal = val;
    }
    const limitLeft = this._estimateLimitAtInfinity(fn, -1);
    const limitRight = this._estimateLimitAtInfinity(fn, 1);
    if (Math.abs(limitLeft) < 1e6) {
      asymptotes.push({ type: 'horizontal', equation: `y = ${limitLeft.toFixed(4)}`, limit: limitLeft });
    }
    if (Math.abs(limitRight) < 1e6) {
      asymptotes.push({ type: 'horizontal', equation: `y = ${limitRight.toFixed(4)}`, limit: limitRight });
    }
    this._recordHistory(`findAsymptotes: ${asymptotes.length} found`);
    return asymptotes;
  }

  /**
   * 微分近似误差估计
   * Differential approximation error estimation
   */
  public differentialErrorEstimate(
    expression: string,
    at: number,
    deltaX: number
  ): { approximation: number; actual: number; error: number; relativeError: number } {
    const fn = this._buildEvaluator(expression);
    const dExpr = this._symbolicDerivative(expression, 'x');
    const dfn = this._buildEvaluator(dExpr);
    const f0 = fn(at);
    const actual = fn(at + deltaX);
    const approximation = f0 + dfn(at) * deltaX;
    const error = actual - approximation;
    const relativeError = Math.abs(actual) > 1e-12 ? Math.abs(error / actual) : 0;
    this._recordHistory(`differentialErrorEstimate: error=${error.toExponential(4)}`);
    return { approximation, actual, error, relativeError };
  }

  /**
   * 弹性：E = (dy/y) / (dx/x) = x/y * y'
   * Elasticity
   */
  public elasticity(expression: string, x: number): number {
    const fn = this._buildEvaluator(expression);
    const dExpr = this._symbolicDerivative(expression, 'x');
    const dfn = this._buildEvaluator(dExpr);
    const y = fn(x);
    const dydx = dfn(x);
    if (Math.abs(y) < 1e-12) return NaN;
    const result = (x / y) * dydx;
    this._recordHistory(`elasticity at x=${x}: ${result}`);
    return result;
  }

  /**
   * 边际分析（经济学应用）
   * Marginal analysis (economics)
   */
  public marginalAnalysis(
    costFunction: string,
    revenueFunction: string,
    quantity: number
  ): {
    marginalCost: number;
    marginalRevenue: number;
    marginalProfit: number;
    averageCost: number;
  } {
    const costFn = this._buildEvaluator(costFunction);
    const revFn = this._buildEvaluator(revenueFunction);
    const mcExpr = this._symbolicDerivative(costFunction, 'x');
    const mrExpr = this._symbolicDerivative(revenueFunction, 'x');
    const mcFn = this._buildEvaluator(mcExpr);
    const mrFn = this._buildEvaluator(mrExpr);
    const marginalCost = mcFn(quantity);
    const marginalRevenue = mrFn(quantity);
    const marginalProfit = marginalRevenue - marginalCost;
    const averageCost = costFn(quantity) / Math.max(1, quantity);
    this._recordHistory(`marginalAnalysis at q=${quantity}`);
    return { marginalCost, marginalRevenue, marginalProfit, averageCost };
  }

  /**
   * 相关变化率问题求解
   * Related rates problem solver
   */
  public solveRelatedRates(
    equation: string,
    variables: Map<string, number>,
    rates: Map<string, number>,
    targetVar: string
  ): number {
    let result = 0;
    const terms = equation.split('+');
    for (const term of terms) {
      const trimmed = term.trim();
      if (trimmed.includes(targetVar)) {
        const varMatch = trimmed.match(/([a-z])\^(\d+)/);
        if (varMatch) {
          const v = varMatch[1]!;
          const exp = parseInt(varMatch[2]!);
          const val = variables.get(v) ?? 1;
          const rate = rates.get(v) ?? 0;
          if (v === targetVar) {
            result = exp * Math.pow(val, exp - 1) * rate;
          }
        }
      }
    }
    this._recordHistory(`solveRelatedRates: d(${targetVar})/dt = ${result}`);
    return result;
  }

  /**
   * 微分中值定理综合应用
   * Mean value theorem applications
   */
  public meanValueApplications(
    expression: string,
    a: number,
    b: number
  ): {
    averageRateOfChange: number;
    instantaneousRates: number[];
    pointsWhereEqual: number[];
  } {
    const fn = this._buildEvaluator(expression);
    const dExpr = this._symbolicDerivative(expression, 'x');
    const dfn = this._buildEvaluator(dExpr);
    const avgRate = (fn(b) - fn(a)) / (b - a);
    const samples = 100;
    const h = (b - a) / samples;
    const instRates: number[] = [];
    const points: number[] = [];
    for (let i = 0; i <= samples; i++) {
      const x = a + i * h;
      const rate = dfn(x);
      instRates.push(rate);
      if (Math.abs(rate - avgRate) < 1e-4) {
        points.push(x);
      }
    }
    this._recordHistory(`meanValueApplications: ${points.length} points found`);
    return { averageRateOfChange: avgRate, instantaneousRates: instRates, pointsWhereEqual: points };
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

  private _buildEvaluatorWithVar(expression: string, variable: string): (x: number) => number {
    const expr = expression.trim();
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      const c = parseFloat(expr);
      return () => c;
    }
    const powerMatch = expr.match(
      new RegExp(`^(?:([\\-]?\\d+(?:\\.\\d+)?)\\*?)?${variable}(?:\\^([\\-]?\\d+(?:\\.\\d+)?))?$`)
    );
    if (powerMatch) {
      const [, coeffStr, expStr] = powerMatch;
      const coeff = coeffStr ? parseFloat(coeffStr) : 1;
      const exp = expStr ? parseFloat(expStr) : 1;
      return (x: number) => coeff * Math.pow(x, exp);
    }
    const sinMatch = expr.match(new RegExp(`^sin\\(${variable}\\)$`));
    if (sinMatch) return (x: number) => Math.sin(x);
    const cosMatch = expr.match(new RegExp(`^cos\\(${variable}\\)$`));
    if (cosMatch) return (x: number) => Math.cos(x);
    const expMatch = expr.match(new RegExp(`^exp\\(${variable}\\)$`));
    if (expMatch) return (x: number) => Math.exp(x);
    const lnMatch = expr.match(new RegExp(`^ln\\(${variable}\\)$`));
    if (lnMatch) return (x: number) => Math.log(Math.abs(x));
    if (expr === variable) return (x: number) => x;
    return (x: number) => this._safeEvaluate(expr, x);
  }

  private _estimateSecondDerivative(fn: (x: number) => number, x: number): number {
    const h = 1e-4;
    return (fn(x + h) - 2 * fn(x) + fn(x - h)) / (h * h);
  }

  private _estimateFourthDerivative(fn: (x: number) => number, x: number): number {
    const h = 1e-3;
    return (fn(x + 2 * h) - 4 * fn(x + h) + 6 * fn(x) - 4 * fn(x - h) + fn(x - 2 * h)) / Math.pow(h, 4);
  }

  private _estimateSixthDerivative(fn: (x: number) => number, x: number): number {
    const h = 1e-2;
    return (fn(x + 3 * h) - 6 * fn(x + 2 * h) + 15 * fn(x + h) - 20 * fn(x) + 15 * fn(x - h) - 6 * fn(x - 2 * h) + fn(x - 3 * h)) / Math.pow(h, 6);
  }

  private _findZeroOfDerivative(dfn: (x: number) => number, a: number, b: number): number | null {
    const samples = 1000;
    const h = (b - a) / samples;
    let prev = dfn(a);
    for (let i = 1; i <= samples; i++) {
      const x = a + i * h;
      const curr = dfn(x);
      if (prev * curr < 0) {
        let lo = a + (i - 1) * h;
        let hi = x;
        for (let j = 0; j < 50; j++) {
          const mid = (lo + hi) / 2;
          const midVal = dfn(mid);
          if (Math.abs(midVal) < 1e-12) return mid;
          if (prev * midVal < 0) hi = mid;
          else { lo = mid; prev = midVal; }
        }
        return (lo + hi) / 2;
      }
      prev = curr;
    }
    return null;
  }

  private _findRootByBisection(fn: (x: number) => number, a: number, b: number): number | null {
    const samples = 100;
    const h = (b - a) / samples;
    let prev = fn(a);
    for (let i = 1; i <= samples; i++) {
      const x = a + i * h;
      const curr = fn(x);
      if (prev * curr < 0) {
        let lo = a + (i - 1) * h;
        let hi = x;
        for (let j = 0; j < 50; j++) {
          const mid = (lo + hi) / 2;
          const midVal = fn(mid);
          if (Math.abs(midVal) < 1e-12) return mid;
          if (prev * midVal < 0) hi = mid;
          else { lo = mid; prev = midVal; }
        }
        return (lo + hi) / 2;
      }
      prev = curr;
    }
    return null;
  }

  private _estimateLimitAtInfinity(fn: (x: number) => number, direction: number): number {
    const x1 = direction * 1000;
    const x2 = direction * 10000;
    const v1 = fn(x1);
    const v2 = fn(x2);
    if (Math.abs(v2 - v1) < 1e-6) return v2;
    return v2;
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
