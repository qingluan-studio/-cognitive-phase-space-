/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 积分学 —— 累积的几何
 * Integral Calculus: The Geometry of Accumulation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 积分是微分的逆运算，将无穷小片段缝合为整体。从黎曼和到广义积分，
 * 每一次积分都是在面积的海洋中勾勒函数的轮廓。
 */

import { DataPacket } from '../shared/types';

export interface Integral {
  readonly expression: string;
  readonly variable: string;
  readonly lower: number | null;
  readonly upper: number | null;
  readonly result: string;
  readonly definite: boolean;
}

export interface IntegrationMethod {
  readonly name: string;
  readonly applicable: (expression: string) => boolean;
  readonly steps: string[];
}

export interface IntegralResult {
  readonly expression: string;
  readonly method: string;
  readonly steps: string[];
  readonly result: string;
}

type IntegralCache = {
  readonly expression: string;
  readonly variable: string;
  readonly result: string;
};

export class IntegralCalculus {
  private _integrals: Map<string, IntegralCache> = new Map();
  private _methods: IntegrationMethod[] = [];
  private _results: IntegralResult[] = [];
  private _history: string[] = [];
  private _counter = 0;

  constructor() {
    this._methods = [
      {
        name: 'power',
        applicable: (e) => /^[a-z](\^\d+(\.\d+)?)?$/.test(e.trim()) || /^-?\d+(\.\d+)?$/.test(e.trim()),
        steps: ['Identify exponent n', 'Apply ∫x^n dx = x^(n+1)/(n+1) + C']
      },
      {
        name: 'substitution',
        applicable: (e) => e.includes('(') && e.includes(')'),
        steps: ['Choose u = inner expression', 'Compute du', 'Substitute and integrate', 'Back-substitute']
      },
      {
        name: 'integration-by-parts',
        applicable: (e) => e.includes('*') || (e.includes('sin') && e.includes('x')),
        steps: ['Choose u and dv', 'Compute du and v', 'Apply ∫u dv = uv - ∫v du']
      },
      {
        name: 'partial-fractions',
        applicable: (e) => e.includes('/') && e.includes('('),
        steps: ['Factor denominator', 'Decompose into A/(...) + B/(...)', 'Integrate each term']
      },
      {
        name: 'trigonometric-substitution',
        applicable: (e) => e.includes('sqrt(') || e.includes('^2'),
        steps: ['Choose trig substitution', 'Compute dx', 'Substitute and simplify', 'Integrate', 'Back-substitute']
      }
    ];
  }

  get methods(): IntegrationMethod[] { return [...this._methods]; }
  get integralCount(): number { return this._integrals.size; }
  get history(): string[] { return [...this._history]; }

  /**
   * 幂法则积分：∫x^n dx = x^(n+1)/(n+1) + C
   * Power rule for integration
   */
  public powerRuleInt(exponent: number): string {
    if (exponent === -1) {
      this._recordHistory('powerRuleInt: x^-1 -> ln|x| + C');
      return 'ln|x| + C';
    }
    const newExp = exponent + 1;
    const result = `x^${newExp}/${newExp} + C`;
    this._recordHistory(`powerRuleInt: x^${exponent} -> ${result}`);
    return result;
  }

  /**
   * 换元积分法
   * Substitution method
   */
  public substitution(expression: string, u: string): IntegralResult {
    const steps = [
      `Let u = ${u}`,
      `Compute du = d(${u})`,
      `Substitute ${expression} in terms of u`,
      'Integrate with respect to u',
      'Back-substitute u = original expression'
    ];
    const result = `∫[${expression}] d(${u}) = F(${u}) + C`;
    const intResult: IntegralResult = { expression, method: 'substitution', steps, result };
    this._results.push(intResult);
    this._recordHistory(`substitution: u=${u} on [${expression}]`);
    return intResult;
  }

  /**
   * 分部积分：∫u dv = uv - ∫v du
   * Integration by parts
   */
  public integrationByParts(u: string, dv: string): IntegralResult {
    const steps = [
      `Choose u = ${u}, dv = ${dv}`,
      `Compute du = d(${u})`,
      `Compute v = ∫${dv} dx`,
      'Apply formula: uv - ∫v du',
      'Simplify remaining integral'
    ];
    const result = `${u}*v - ∫v*d(${u}) + C`;
    const intResult: IntegralResult = { expression: `∫${u}*${dv} dx`, method: 'integration-by-parts', steps, result };
    this._results.push(intResult);
    this._recordHistory(`integrationByParts: u=${u}, dv=${dv}`);
    return intResult;
  }

  /**
   * 部分分式分解
   * Partial fractions
   */
  public partialFractions(expression: string): IntegralResult {
    const steps = [
      'Factor denominator completely',
      'Set up partial fraction decomposition',
      'Solve for coefficients A, B, C, ...',
      'Integrate each fraction separately',
      'Combine and add constant of integration'
    ];
    const result = `A*ln|factor1| + B*ln|factor2| + C`;
    const intResult: IntegralResult = { expression, method: 'partial-fractions', steps, result };
    this._results.push(intResult);
    this._recordHistory(`partialFractions: ${expression}`);
    return intResult;
  }

  /**
   * 三角换元
   * Trigonometric substitution
   */
  public trigonometricSubstitution(expression: string, type: 'sin' | 'tan' | 'sec'): IntegralResult {
    const substMap = {
      sin: 'x = a*sin(θ)',
      tan: 'x = a*tan(θ)',
      sec: 'x = a*sec(θ)'
    } as const;
    const steps = [
      `Substitute ${substMap[type]}`,
      'Compute dx in terms of dθ',
      'Simplify using trig identity',
      'Integrate with respect to θ',
      'Back-substitute using inverse trig'
    ];
    const result = `∫[${expression}] dx = ∫[simplified] dθ + C`;
    const intResult: IntegralResult = { expression, method: 'trigonometric-substitution', steps, result };
    this._results.push(intResult);
    this._recordHistory(`trigonometricSubstitution (${type}): ${expression}`);
    return intResult;
  }

  /**
   * 定积分：数值计算
   * Definite integral via Simpson's rule
   */
  public definiteIntegral(expression: string, a: number, b: number): number {
    const fn = this._buildEvaluator(expression);
    const n = 1000;
    const h = (b - a) / n;
    let sum = fn(a) + fn(b);
    for (let i = 1; i < n; i++) {
      const x = a + i * h;
      sum += (i % 2 === 0 ? 2 : 4) * fn(x);
    }
    const result = (h / 3) * sum;
    this._integrals.set(`def-${this._counter++}`, { expression, variable: 'x', result: `${result}` });
    this._recordHistory(`definiteIntegral: ∫[${expression}] from ${a} to ${b} = ${result}`);
    return result;
  }

  /**
   * 不定积分：符号计算
   * Indefinite integral
   */
  public indefiniteIntegral(expression: string): string {
    const result = this._symbolicIntegrate(expression);
    this._integrals.set(`indef-${this._counter++}`, { expression, variable: 'x', result });
    this._recordHistory(`indefiniteIntegral: ∫[${expression}] dx = ${result}`);
    return result;
  }

  /**
   * 广义积分
   * Improper integral
   */
  public improperIntegral(expression: string, limit: number): number {
    const fn = this._buildEvaluator(expression);
    const upper = Math.min(limit, 1e6);
    const lower = Math.max(limit, -1e6);
    if (limit > 0) {
      const result = this._simpson(fn, 0, upper, 2000);
      this._recordHistory(`improperIntegral: ∫[${expression}] from 0 to ∞ ≈ ${result}`);
      return result;
    }
    const result = this._simpson(fn, lower, 0, 2000);
    this._recordHistory(`improperIntegral: ∫[${expression}] from -∞ to 0 ≈ ${result}`);
    return result;
  }

  /**
   * 数值积分：Simpson 或梯形法则
   * Numerical integration
   */
  public numericalIntegration(
    expression: string,
    a: number,
    b: number,
    method: 'simpson' | 'trapezoidal'
  ): number {
    const fn = this._buildEvaluator(expression);
    const n = 1000;
    if (method === 'simpson') {
      const result = this._simpson(fn, a, b, n);
      this._recordHistory(`numericalIntegration (simpson): ${result}`);
      return result;
    }
    const h = (b - a) / n;
    let sum = (fn(a) + fn(b)) / 2;
    for (let i = 1; i < n; i++) {
      sum += fn(a + i * h);
    }
    const result = h * sum;
    this._recordHistory(`numericalIntegration (trapezoidal): ${result}`);
    return result;
  }

  /**
   * 两曲线间面积：∫(f - g) dx
   * Area between curves
   */
  public areaBetweenCurves(f: string, g: string, a: number, b: number): number {
    const fnF = this._buildEvaluator(f);
    const fnG = this._buildEvaluator(g);
    const integrand = (x: number) => Math.abs(fnF(x) - fnG(x));
    const result = this._simpson(integrand, a, b, 1000);
    this._recordHistory(`areaBetweenCurves: ${f} vs ${g} on [${a}, ${b}] = ${result}`);
    return result;
  }

  /**
   * 旋转体体积：圆盘法 V = π ∫f^2 dx
   * Volume of revolution
   */
  public volumeOfRevolution(f: string, a: number, b: number, _axis: string): number {
    const fn = this._buildEvaluator(f);
    const integrand = (x: number) => Math.PI * fn(x) * fn(x);
    const result = this._simpson(integrand, a, b, 1000);
    this._recordHistory(`volumeOfRevolution: ${f} on [${a}, ${b}] about ${_axis} = ${result}`);
    return result;
  }

  /**
   * 弧长：∫sqrt(1 + f'^2) dx
   * Arc length
   */
  public arcLength(f: string, a: number, b: number): number {
    const fn = this._buildEvaluator(f);
    const h = 1e-5;
    const integrand = (x: number) => {
      const dfx = (fn(x + h) - fn(x - h)) / (2 * h);
      return Math.sqrt(1 + dfx * dfx);
    };
    const result = this._simpson(integrand, a, b, 1000);
    this._recordHistory(`arcLength: ${f} on [${a}, ${b}] = ${result}`);
    return result;
  }

  /**
   * 旋转曲面面积：2π ∫|f| * sqrt(1 + f'^2) dx
   * Surface area of revolution
   */
  public surfaceArea(f: string, a: number, b: number): number {
    const fn = this._buildEvaluator(f);
    const h = 1e-5;
    const integrand = (x: number) => {
      const dfx = (fn(x + h) - fn(x - h)) / (2 * h);
      return 2 * Math.PI * Math.abs(fn(x)) * Math.sqrt(1 + dfx * dfx);
    };
    const result = this._simpson(integrand, a, b, 1000);
    this._recordHistory(`surfaceArea: ${f} on [${a}, ${b}] = ${result}`);
    return result;
  }

  /**
   * 形心：x̄ = ∫x·f / ∫f, ȳ = ∫f²/2 / ∫f
   * Centroid
   */
  public centroid(f: string, a: number, b: number): { x: number; y: number } {
    const fn = this._buildEvaluator(f);
    const area = this._simpson(fn, a, b, 1000);
    if (Math.abs(area) < 1e-12) {
      return { x: 0, y: 0 };
    }
    const momentX = this._simpson((x: number) => x * fn(x), a, b, 1000);
    const momentY = this._simpson((x: number) => 0.5 * fn(x) * fn(x), a, b, 1000);
    this._recordHistory(`centroid: x̄=${momentX / area}, ȳ=${momentY / area}`);
    return { x: momentX / area, y: momentY / area };
  }

  /**
   * 函数平均值：1/(b-a) ∫f dx
   * Average value of a function
   */
  public averageValue(f: string, a: number, b: number): number {
    const fn = this._buildEvaluator(f);
    const integral = this._simpson(fn, a, b, 1000);
    const result = integral / (b - a);
    this._recordHistory(`averageValue: ${f} on [${a}, ${b}] = ${result}`);
    return result;
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    integrals: number;
    methods: number;
    results: IntegralResult[];
    history: string[];
  }> {
    return {
      id: `int-calc-${Date.now()}-${this._counter}`,
      payload: {
        integrals: this._integrals.size,
        methods: this._methods.length,
        results: [...this._results],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['calculus', 'integral', 'result'],
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
    this._integrals.clear();
    this._results = [];
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _simpson(fn: (x: number) => number, a: number, b: number, n: number): number {
    if (n % 2 !== 0) n++;
    const h = (b - a) / n;
    let sum = fn(a) + fn(b);
    for (let i = 1; i < n; i++) {
      const x = a + i * h;
      sum += (i % 2 === 0 ? 2 : 4) * fn(x);
    }
    return (h / 3) * sum;
  }

  private _symbolicIntegrate(expression: string): string {
    const trimmed = expression.trim();
    if (trimmed === '') return 'C';

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const c = parseFloat(trimmed);
      return `${c}*x + C`;
    }

    const powerMatch = trimmed.match(/^(?:([\-]?\d+(?:\.\d+)?)\*)?x(?:\^([\-]?\d+(?:\.\d+)?))?$/);
    if (powerMatch) {
      const [, coeffStr, expStr] = powerMatch;
      const coeff = coeffStr ? parseFloat(coeffStr) : 1;
      const exp = expStr ? parseFloat(expStr) : 1;
      if (exp === -1) return `${coeff}*ln|x| + C`;
      const newExp = exp + 1;
      const newCoeff = coeff / newExp;
      if (newExp === 1) return `${newCoeff}*x + C`;
      return `${newCoeff}*x^${newExp} + C`;
    }

    if (trimmed === 'sin(x)') return '-cos(x) + C';
    if (trimmed === 'cos(x)') return 'sin(x) + C';
    if (trimmed === 'exp(x)') return 'exp(x) + C';
    if (trimmed === '1/x') return 'ln|x| + C';
    if (trimmed === 'sec(x)^2') return 'tan(x) + C';
    if (trimmed === '1/(1+x^2)') return 'atan(x) + C';

    return `∫[${trimmed}] dx + C`;
  }

  private _buildEvaluator(expression: string): (x: number) => number {
    const expr = expression.trim();
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      const c = parseFloat(expr);
      return () => c;
    }
    const powerMatch = expr.match(/^(?:([\-]?\d+(?:\.\d+)?)\*)?x(?:\^([\-]?\d+(?:\.\d+)?))?$/);
    if (powerMatch) {
      const [, coeffStr, expStr] = powerMatch;
      const coeff = coeffStr ? parseFloat(coeffStr) : 1;
      const exp = expStr ? parseFloat(expStr) : 1;
      return (x: number) => coeff * Math.pow(x, exp);
    }
    if (expr === 'sin(x)') return (x: number) => Math.sin(x);
    if (expr === 'cos(x)') return (x: number) => Math.cos(x);
    if (expr === 'tan(x)') return (x: number) => Math.tan(x);
    if (expr === 'exp(x)') return (x: number) => Math.exp(x);
    if (expr === 'ln(x)') return (x: number) => Math.log(Math.abs(x));
    if (expr === 'x') return (x: number) => x;
    if (expr === '1/x') return (x: number) => 1 / x;
    if (expr === '1/(1+x^2)') return (x: number) => 1 / (1 + x * x);
    if (expr === 'sec(x)^2') return (x: number) => 1 / (Math.cos(x) * Math.cos(x));
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
      if (/^-?\d+(\.\d+)?$/.test(tok)) { sum += parseFloat(tok); continue; }
      if (tok === 'sin(x)') { sum += Math.sin(x); continue; }
      if (tok === 'cos(x)') { sum += Math.cos(x); continue; }
      if (tok === 'exp(x)') { sum += Math.exp(x); continue; }
    }
    return sum;
  }
}
