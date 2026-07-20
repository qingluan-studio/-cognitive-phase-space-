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

export interface NumericalIntegrationResult {
  readonly value: number;
  readonly method: string;
  readonly intervals: number;
  readonly errorEstimate: number;
}

export interface ImproperIntegralResult {
  readonly value: number;
  readonly convergent: boolean;
  readonly limit: number;
  readonly type: 'infinite-limit' | 'discontinuity';
}

export interface SolidOfRevolution {
  readonly volume: number;
  readonly method: 'disk' | 'washer' | 'shell';
  readonly axis: string;
  readonly innerRadius?: string;
  readonly outerRadius?: string;
}

export interface WorkResult {
  readonly work: number;
  readonly force: string;
  readonly displacement: [number, number];
}

export interface CenterOfMassResult {
  readonly x: number;
  readonly y: number;
  readonly area: number;
  readonly mass: number;
}

export interface ProbabilityResult {
  readonly probability: number;
  readonly distribution: string;
  readonly interval: [number, number];
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
   * 龙贝格积分（Romberg integration）
   * Romberg integration - highly accurate numerical method
   */
  public rombergIntegration(
    f: string,
    a: number,
    b: number,
    maxIterations: number = 10,
    tolerance: number = 1e-10
  ): NumericalIntegrationResult {
    const fn = this._buildEvaluator(f);
    const R: number[][] = [];
    R[0] = [this._trapezoidal(fn, a, b, 1)];
    let result = R[0]![0]!;
    let intervals = 1;
    for (let i = 1; i < maxIterations; i++) {
      intervals = 1 << i;
      R[i] = [];
      R[i]![0] = this._trapezoidal(fn, a, b, intervals);
      for (let j = 1; j <= i; j++) {
        R[i]![j] = (Math.pow(4, j) * R[i]![j - 1]! - R[i - 1]![j - 1]!) / (Math.pow(4, j) - 1);
      }
      if (Math.abs(R[i]![i]! - R[i - 1]![i - 1]!) < tolerance) {
        result = R[i]![i]!;
        break;
      }
      result = R[i]![i]!;
    }
    this._recordHistory(`rombergIntegration: ${result} with ${intervals} intervals`);
    return { value: result, method: 'romberg', intervals, errorEstimate: Math.abs(R[maxIterations - 1]?.[maxIterations - 1] ?? result - R[0]![0]!) };
  }

  /**
   * 高斯求积（Gaussian quadrature）
   * Gaussian quadrature with Legendre polynomials
   */
  public gaussianQuadrature(
    f: string,
    a: number,
    b: number,
    n: number = 5
  ): NumericalIntegrationResult {
    const fn = this._buildEvaluator(f);
    const nodes = this._gaussLegendreNodes(n);
    const weights = this._gaussLegendreWeights(n);
    const mid = (a + b) / 2;
    const half = (b - a) / 2;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x = mid + half * nodes[i]!;
      sum += weights[i]! * fn(x);
    }
    const result = half * sum;
    this._recordHistory(`gaussianQuadrature (n=${n}): ${result}`);
    return { value: result, method: 'gaussian', intervals: n, errorEstimate: Math.pow((b - a) / 2, 2 * n + 1) / 1000 };
  }

  /**
   * 蒙特卡洛积分
   * Monte Carlo integration
   */
  public monteCarloIntegration(
    f: string,
    a: number,
    b: number,
    samples: number = 10000
  ): NumericalIntegrationResult {
    const fn = this._buildEvaluator(f);
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      const x = a + Math.random() * (b - a);
      sum += fn(x);
    }
    const result = (b - a) * sum / samples;
    const errorEstimate = (b - a) / Math.sqrt(samples);
    this._recordHistory(`monteCarloIntegration (${samples} samples): ${result}`);
    return { value: result, method: 'monte-carlo', intervals: samples, errorEstimate };
  }

  /**
   * 自适应辛普森积分
   * Adaptive Simpson's rule
   */
  public adaptiveSimpson(
    f: string,
    a: number,
    b: number,
    tolerance: number = 1e-8,
    maxDepth: number = 20
  ): NumericalIntegrationResult {
    const fn = this._buildEvaluator(f);
    let totalIntervals = 0;
    const adaptive = (a: number, b: number, eps: number, depth: number): number => {
      totalIntervals++;
      const c = (a + b) / 2;
      const fa = fn(a), fb = fn(b), fc = fn(c);
      const s = (b - a) * (fa + 4 * fc + fb) / 6;
      const d = (a + c) / 2, e = (c + b) / 2;
      const fd = fn(d), fe = fn(e);
      const s2 = (b - a) * (fa + 4 * fd + 2 * fc + 4 * fe + fb) / 12;
      if (depth <= 0 || Math.abs(s2 - s) <= 15 * eps) {
        return s2 + (s2 - s) / 15;
      }
      return adaptive(a, c, eps / 2, depth - 1) + adaptive(c, b, eps / 2, depth - 1);
    };
    const result = adaptive(a, b, tolerance, maxDepth);
    this._recordHistory(`adaptiveSimpson: ${result} with ${totalIntervals} intervals`);
    return { value: result, method: 'adaptive-simpson', intervals: totalIntervals, errorEstimate: tolerance };
  }

  /**
   * 广义积分判敛：无穷限积分
   * Improper integral: infinite limit
   */
  public improperInfinite(
    f: string,
    a: number,
    direction: 1 | -1,
    tolerance: number = 1e-8
  ): ImproperIntegralResult {
    const fn = this._buildEvaluator(f);
    let upper = a + direction * 100;
    let prev = 0;
    let result = 0;
    let convergent = false;
    for (let iter = 0; iter < 20; iter++) {
      const b = a + direction * Math.pow(10, iter + 2);
      const integral = direction > 0
        ? this._simpson(fn, a, b, 1000)
        : this._simpson(fn, b, a, 1000);
      if (Math.abs(integral - prev) < tolerance) {
        convergent = true;
        result = integral;
        break;
      }
      prev = integral;
      result = integral;
      upper = b;
    }
    this._recordHistory(`improperInfinite: ${convergent ? 'convergent' : 'divergent'}, value=${result}`);
    return { value: result, convergent, limit: upper, type: 'infinite-limit' };
  }

  /**
   * 瑕积分：含间断点的积分
   * Improper integral: discontinuity
   */
  public improperDiscontinuous(
    f: string,
    a: number,
    b: number,
    discontinuity: number,
    tolerance: number = 1e-8
  ): ImproperIntegralResult {
    const fn = this._buildEvaluator(f);
    const eps = 1e-6;
    let leftResult = 0;
    let rightResult = 0;
    let convergent = true;
    if (discontinuity > a) {
      const left = this._simpson(fn, a, discontinuity - eps, 500);
      leftResult = left;
    }
    if (discontinuity < b) {
      const right = this._simpson(fn, discontinuity + eps, b, 500);
      rightResult = right;
    }
    const total = leftResult + rightResult;
    if (!isFinite(total)) convergent = false;
    this._recordHistory(`improperDiscontinuous at ${discontinuity}: ${convergent ? 'convergent' : 'divergent'}`);
    return { value: total, convergent, limit: discontinuity, type: 'discontinuity' };
  }

  /**
   * 旋转体体积：圆盘法
   * Volume of revolution: disk method
   */
  public diskMethod(
    f: string,
    a: number,
    b: number,
    axis: 'x' | 'y' = 'x'
  ): SolidOfRevolution {
    const fn = this._buildEvaluator(f);
    const integrand = (x: number) => Math.PI * fn(x) * fn(x);
    const volume = this._simpson(integrand, a, b, 1000);
    this._recordHistory(`diskMethod: V=${volume}`);
    return { volume, method: 'disk', axis, outerRadius: f };
  }

  /**
   * 旋转体体积： washer 法
   * Volume of revolution: washer method
   */
  public washerMethod(
    outerF: string,
    innerF: string,
    a: number,
    b: number
  ): SolidOfRevolution {
    const outerFn = this._buildEvaluator(outerF);
    const innerFn = this._buildEvaluator(innerF);
    const integrand = (x: number) => Math.PI * (outerFn(x) * outerFn(x) - innerFn(x) * innerFn(x));
    const volume = this._simpson(integrand, a, b, 1000);
    this._recordHistory(`washerMethod: V=${volume}`);
    return { volume, method: 'washer', axis: 'x', innerRadius: innerF, outerRadius: outerF };
  }

  /**
   * 旋转体体积：柱壳法
   * Volume of revolution: shell method
   */
  public shellMethod(
    f: string,
    a: number,
    b: number
  ): SolidOfRevolution {
    const fn = this._buildEvaluator(f);
    const integrand = (x: number) => 2 * Math.PI * x * fn(x);
    const volume = this._simpson(integrand, a, b, 1000);
    this._recordHistory(`shellMethod: V=${volume}`);
    return { volume, method: 'shell', axis: 'y' };
  }

  /**
   * 变力做功
   * Work done by a variable force
   */
  public workDone(
    forceFunction: string,
    a: number,
    b: number
  ): WorkResult {
    const fn = this._buildEvaluator(forceFunction);
    const work = this._simpson(fn, a, b, 1000);
    this._recordHistory(`workDone: W=${work}`);
    return { work, force: forceFunction, displacement: [a, b] };
  }

  /**
   * 抽水做功
   * Work to pump water out of a tank
   */
  public pumpWork(
    tankHeight: number,
    radiusFunction: string,
    waterHeight: number,
    density: number = 1000,
    g: number = 9.8
  ): number {
    const rFn = this._buildEvaluator(radiusFunction);
    const integrand = (y: number) => {
      const r = rFn(y);
      return density * g * Math.PI * r * r * (tankHeight - y);
    };
    const work = this._simpson(integrand, 0, waterHeight, 500);
    this._recordHistory(`pumpWork: W=${work}`);
    return work;
  }

  /**
   * 平面区域质心
   * Centroid of a planar region
   */
  public planarCentroid(
    f: string,
    g: string,
    a: number,
    b: number
  ): CenterOfMassResult {
    const fFn = this._buildEvaluator(f);
    const gFn = this._buildEvaluator(g);
    const areaFn = (x: number) => fFn(x) - gFn(x);
    const momentXFn = (x: number) => x * (fFn(x) - gFn(x));
    const momentYFn = (x: number) => 0.5 * (fFn(x) * fFn(x) - gFn(x) * gFn(x));
    const area = this._simpson(areaFn, a, b, 1000);
    const mx = this._simpson(momentXFn, a, b, 1000);
    const my = this._simpson(momentYFn, a, b, 1000);
    const cx = area > 1e-12 ? mx / area : 0;
    const cy = area > 1e-12 ? my / area : 0;
    this._recordHistory(`planarCentroid: (${cx}, ${cy})`);
    return { x: cx, y: cy, area, mass: area };
  }

  /**
   * 转动惯量
   * Moment of inertia
   */
  public momentOfInertia(
    f: string,
    a: number,
    b: number,
    density: number = 1
  ): { Ix: number; Iy: number } {
    const fn = this._buildEvaluator(f);
    const ixFn = (x: number) => density * (1 / 3) * Math.pow(fn(x), 3);
    const iyFn = (x: number) => density * x * x * fn(x);
    const Ix = this._simpson(ixFn, a, b, 500);
    const Iy = this._simpson(iyFn, a, b, 500);
    this._recordHistory(`momentOfInertia: Ix=${Ix}, Iy=${Iy}`);
    return { Ix, Iy };
  }

  /**
   * 变限积分求导（Leibniz 法则）
   * Leibniz integral rule: d/dx ∫[a(x),b(x)] f(t) dt
   */
  public leibnizRule(
    integrand: string,
    lowerExpr: string,
    upperExpr: string,
    atX: number
  ): number {
    const fn = this._buildEvaluator(integrand);
    const lowerFn = this._buildEvaluator(lowerExpr);
    const upperFn = this._buildEvaluator(upperExpr);
    const lowerVal = lowerFn(atX);
    const upperVal = upperFn(atX);
    const dLower = this._numericalDerivative(lowerFn, atX);
    const dUpper = this._numericalDerivative(upperFn, atX);
    const result = fn(upperVal) * dUpper - fn(lowerVal) * dLower;
    this._recordHistory(`leibnizRule at x=${atX}: ${result}`);
    return result;
  }

  /**
   * 概率密度函数积分
   * Probability from PDF
   */
  public probabilityFromPDF(
    pdf: string,
    a: number,
    b: number
  ): ProbabilityResult {
    const fn = this._buildEvaluator(pdf);
    const probability = this._simpson(fn, a, b, 1000);
    this._recordHistory(`probabilityFromPDF: P(${a} < X < ${b}) = ${probability}`);
    return { probability, distribution: pdf, interval: [a, b] };
  }

  /**
   * 累积分布函数
   * Cumulative distribution function
   */
  public cdfFromPDF(pdf: string, x: number): number {
    const fn = this._buildEvaluator(pdf);
    const result = this._simpson(fn, -100, x, 2000);
    this._recordHistory(`cdfFromPDF: F(${x}) = ${result}`);
    return result;
  }

  /**
   * 期望值（连续型）
   * Expected value (continuous)
   */
  public expectedValueContinuous(pdf: string, lower: number, upper: number): number {
    const fn = this._buildEvaluator(pdf);
    const integrand = (x: number) => x * fn(x);
    const result = this._simpson(integrand, lower, upper, 1000);
    this._recordHistory(`expectedValueContinuous: E[X] = ${result}`);
    return result;
  }

  /**
   * 积分中值定理验证
   * Mean value theorem for integrals
   */
  public integralMeanValue(
    f: string,
    a: number,
    b: number
  ): { c: number; fC: number; averageValue: number } | null {
    const fn = this._buildEvaluator(f);
    const avg = this.averageValue(f, a, b);
    const targetFn = (x: number) => fn(x) - avg;
    const samples = 100;
    const h = (b - a) / samples;
    let prev = targetFn(a);
    for (let i = 1; i <= samples; i++) {
      const x = a + i * h;
      const curr = targetFn(x);
      if (prev * curr < 0) {
        let lo = a + (i - 1) * h;
        let hi = x;
        for (let j = 0; j < 50; j++) {
          const mid = (lo + hi) / 2;
          const midVal = targetFn(mid);
          if (Math.abs(midVal) < 1e-10) {
            this._recordHistory(`integralMeanValue: c=${mid}`);
            return { c: mid, fC: fn(mid), averageValue: avg };
          }
          if (prev * midVal < 0) hi = mid;
          else { lo = mid; prev = midVal; }
        }
        const c = (lo + hi) / 2;
        this._recordHistory(`integralMeanValue: c=${c}`);
        return { c, fC: fn(c), averageValue: avg };
      }
      prev = curr;
    }
    return null;
  }

  /**
   * 弧长函数
   * Arc length function s(x)
   */
  public arcLengthFunction(
    f: string,
    a: number,
    x: number
  ): number {
    const fn = this._buildEvaluator(f);
    const h = 1e-5;
    const integrand = (t: number) => {
      const df = (fn(t + h) - fn(t - h)) / (2 * h);
      return Math.sqrt(1 + df * df);
    };
    const result = this._simpson(integrand, a, x, 500);
    this._recordHistory(`arcLengthFunction: s(${x}) = ${result}`);
    return result;
  }

  /**
   * 表面积：y=f(x) 绕 x 轴旋转
   * Surface area: y=f(x) rotated about x-axis
   */
  public surfaceAreaOfRevolution(
    f: string,
    a: number,
    b: number
  ): number {
    const fn = this._buildEvaluator(f);
    const h = 1e-5;
    const integrand = (x: number) => {
      const df = (fn(x + h) - fn(x - h)) / (2 * h);
      return 2 * Math.PI * Math.abs(fn(x)) * Math.sqrt(1 + df * df);
    };
    const result = this._simpson(integrand, a, b, 500);
    this._recordHistory(`surfaceAreaOfRevolution: S=${result}`);
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

  private _trapezoidal(fn: (x: number) => number, a: number, b: number, n: number): number {
    const h = (b - a) / n;
    let sum = (fn(a) + fn(b)) / 2;
    for (let i = 1; i < n; i++) {
      sum += fn(a + i * h);
    }
    return h * sum;
  }

  private _numericalDerivative(fn: (x: number) => number, x: number): number {
    const h = 1e-5;
    return (fn(x + h) - fn(x - h)) / (2 * h);
  }

  private _gaussLegendreNodes(n: number): number[] {
    const nodes: number[][] = [
      [],
      [0],
      [-1 / Math.sqrt(3), 1 / Math.sqrt(3)],
      [-Math.sqrt(3 / 5), 0, Math.sqrt(3 / 5)],
      [-0.8611363116, -0.3399810436, 0.3399810436, 0.8611363116],
      [-0.9061798459, -0.5384693101, 0, 0.5384693101, 0.9061798459]
    ];
    if (n < 1 || n >= nodes.length) {
      const result: number[] = [];
      for (let i = 0; i < n; i++) {
        result.push(Math.cos(Math.PI * (2 * i + 1) / (2 * n)));
      }
      return result;
    }
    return [...nodes[n]!];
  }

  private _gaussLegendreWeights(n: number): number[] {
    const weights: number[][] = [
      [],
      [2],
      [1, 1],
      [5 / 9, 8 / 9, 5 / 9],
      [0.3478548451, 0.6521451549, 0.6521451549, 0.3478548451],
      [0.2369268850, 0.4786286705, 0.5688888889, 0.4786286705, 0.2369268850]
    ];
    if (n < 1 || n >= weights.length) {
      return new Array(n).fill(2 / n);
    }
    return [...weights[n]!];
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
