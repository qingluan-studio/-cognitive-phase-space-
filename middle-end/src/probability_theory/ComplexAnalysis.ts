/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 复分析 —— 虚数的几何
 * Complex Analysis: The Geometry of Imaginary Numbers
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 复分析是 z = x + iy 平面上的微积分。从柯西-黎曼方程到留数定理，
 * 从洛朗级数到围道积分，每一步都沿着解析延拓的轨迹。
 */

import { DataPacket } from '../shared/types';

export interface ComplexNumber {
  readonly real: number;
  readonly imaginary: number;
  readonly modulus: number;
  readonly argument: number;
}

export interface ComplexFunction {
  readonly expression: string;
  readonly variable: string;
  readonly analytic: boolean;
  readonly singularities: string[];
}

export interface ContourIntegral {
  readonly function: string;
  readonly contour: string;
  readonly result: number;
}

type ComplexCache = {
  readonly id: string;
  readonly number: ComplexNumber;
};

export class ComplexAnalysis {
  private _numbers: Map<string, ComplexCache> = new Map();
  private _functions: ComplexFunction[] = [];
  private _integrals: ContourIntegral[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get numberCount(): number { return this._numbers.size; }
  get functionCount(): number { return this._functions.length; }
  get integralCount(): number { return this._integrals.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 创建复数
   * Create a complex number from real and imaginary parts
   */
  public createComplex(real: number, imag: number): ComplexNumber {
    const modulus = Math.sqrt(real * real + imag * imag);
    const argument = Math.atan2(imag, real);
    const number: ComplexNumber = { real, imaginary: imag, modulus, argument };
    const id = `c-${(++this._counter).toString(36)}`;
    this._numbers.set(id, { id, number });
    return number;
  }

  /**
   * 复数加法：(a+bi) + (c+di) = (a+c) + (b+d)i
   * Complex addition
   */
  public complexAdd(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    return this.createComplex(a.real + b.real, a.imaginary + b.imaginary);
  }

  /**
   * 复数乘法：(a+bi)(c+di) = (ac-bd) + (ad+bc)i
   * Complex multiplication
   */
  public complexMultiply(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    const real = a.real * b.real - a.imaginary * b.imaginary;
    const imag = a.real * b.imaginary + a.imaginary * b.real;
    return this.createComplex(real, imag);
  }

  /**
   * 复数除法：(a+bi)/(c+di) = ((ac+bd) + (bc-ad)i) / (c² + d²)
   * Complex division
   */
  public complexDivide(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
    const denom = b.real * b.real + b.imaginary * b.imaginary;
    if (denom < 1e-15) throw new Error('Division by zero in complexDivide');
    const real = (a.real * b.real + a.imaginary * b.imaginary) / denom;
    const imag = (a.imaginary * b.real - a.real * b.imaginary) / denom;
    return this.createComplex(real, imag);
  }

  /**
   * 共轭：a + bi -> a - bi
   * Complex conjugate
   */
  public complexConjugate(a: ComplexNumber): ComplexNumber {
    return this.createComplex(a.real, -a.imaginary);
  }

  /**
   * 复数幂：z^n
   * Complex power (integer exponent)
   */
  public complexPower(a: ComplexNumber, n: number): ComplexNumber {
    if (n === 0) return this.createComplex(1, 0);
    let result = this.createComplex(1, 0);
    const absN = Math.abs(n);
    for (let i = 0; i < absN; i++) {
      result = this.complexMultiply(result, a);
    }
    if (n < 0) {
      return this.complexDivide(this.createComplex(1, 0), result);
    }
    return result;
  }

  /**
   * 复数 n 次根（返回所有 n 个根）
   * Complex n-th roots (returns all n roots)
   */
  public complexRoot(a: ComplexNumber, n: number): ComplexNumber[] {
    if (n <= 0) return [];
    const r = a.modulus;
    const theta = a.argument;
    const roots: ComplexNumber[] = [];
    const rootR = Math.pow(r, 1 / n);
    for (let k = 0; k < n; k++) {
      const angle = (theta + 2 * Math.PI * k) / n;
      roots.push(this.createComplex(rootR * Math.cos(angle), rootR * Math.sin(angle)));
    }
    this._recordHistory(`complexRoot: ${n} roots computed`);
    return roots;
  }

  /**
   * 复指数：e^(a+bi) = e^a (cos b + i sin b)
   * Complex exponential
   */
  public complexExponential(a: ComplexNumber): ComplexNumber {
    const ea = Math.exp(a.real);
    return this.createComplex(ea * Math.cos(a.imaginary), ea * Math.sin(a.imaginary));
  }

  /**
   * 复对数（主值）：Log(z) = ln|z| + i arg(z)
   * Complex logarithm (principal value)
   */
  public complexLog(a: ComplexNumber): ComplexNumber {
    if (a.modulus < 1e-15) throw new Error('Log of zero is undefined');
    return this.createComplex(Math.log(a.modulus), a.argument);
  }

  /**
   * 复正弦：sin(a+bi) = sin a cosh b + i cos a sinh b
   * Complex sine
   */
  public complexSin(a: ComplexNumber): ComplexNumber {
    return this.createComplex(
      Math.sin(a.real) * Math.cosh(a.imaginary),
      Math.cos(a.real) * Math.sinh(a.imaginary)
    );
  }

  /**
   * 复余弦：cos(a+bi) = cos a cosh b - i sin a sinh b
   * Complex cosine
   */
  public complexCos(a: ComplexNumber): ComplexNumber {
    return this.createComplex(
      Math.cos(a.real) * Math.cosh(a.imaginary),
      -Math.sin(a.real) * Math.sinh(a.imaginary)
    );
  }

  /**
   * 复正切：tan(z) = sin(z) / cos(z)
   * Complex tangent
   */
  public complexTan(a: ComplexNumber): ComplexNumber {
    return this.complexDivide(this.complexSin(a), this.complexCos(a));
  }

  /**
   * 模长：|z|
   * Modulus
   */
  public modulus(a: ComplexNumber): number {
    return a.modulus;
  }

  /**
   * 辐角：arg(z)
   * Argument
   */
  public argument(a: ComplexNumber): number {
    return a.argument;
  }

  /**
   * 极坐标形式：{r, θ}
   * Polar form
   */
  public polarForm(a: ComplexNumber): { r: number; theta: number } {
    return { r: a.modulus, theta: a.argument };
  }

  /**
   * 指数形式：r · e^(iθ)
   * Exponential form (string)
   */
  public exponentialForm(a: ComplexNumber): string {
    return `${a.modulus.toFixed(6)} * e^(i * ${a.argument.toFixed(6)})`;
  }

  /**
   * 解析性判定（基于 Cauchy-Riemann 方程）
   * Check analyticity at a point
   */
  public checkAnalytic(
    u: (x: number, y: number) => number,
    v: (x: number, y: number) => number,
    point: [number, number]
  ): boolean {
    const [x, y] = point;
    const h = 1e-6;
    const dudx = (u(x + h, y) - u(x - h, y)) / (2 * h);
    const dudy = (u(x, y + h) - u(x, y - h)) / (2 * h);
    const dvdx = (v(x + h, y) - v(x - h, y)) / (2 * h);
    const dvdy = (v(x, y + h) - v(x, y - h)) / (2 * h);
    const cr1 = Math.abs(dudx - dvdy) < 1e-4;
    const cr2 = Math.abs(dudy + dvdx) < 1e-4;
    const result = cr1 && cr2;
    this._recordHistory(`checkAnalytic at (${x},${y}): ${result}`);
    return result;
  }

  /**
   * 柯西-黎曼方程验证
   * Verify Cauchy-Riemann equations
   */
  public cauchyRiemann(
    u: (x: number, y: number) => number,
    v: (x: number, y: number) => number,
    x: number = 0,
    y: number = 0
  ): boolean {
    return this.checkAnalytic(u, v, [x, y]);
  }

  /**
   * 围道积分：∫_C f(z) dz
   * Contour integral (numerical)
   */
  public contourIntegral(
    f: (z: ComplexNumber) => ComplexNumber,
    contour: (t: number) => ComplexNumber,
    a: number = 0,
    b: number = 2 * Math.PI
  ): number {
    const n = 1000;
    const h = (b - a) / n;
    let sum = this.createComplex(0, 0);
    for (let i = 0; i <= n; i++) {
      const t = a + i * h;
      const z = contour(t);
      const h2 = 1e-6;
      const dzPlus = contour(t + h2);
      const dzMinus = contour(t - h2);
      const dz = this.createComplex(
        (dzPlus.real - dzMinus.real) / (2 * h2),
        (dzPlus.imaginary - dzMinus.imaginary) / (2 * h2)
      );
      const fz = f(z);
      const product = this.complexMultiply(fz, dz);
      sum = this.complexAdd(sum, this.complexMultiply(product, this.createComplex(h * (i === 0 || i === n ? 0.5 : 1), 0)));
    }
    const result = sum.real;
    this._integrals.push({ function: 'f(z)', contour: 'parametric', result });
    this._recordHistory(`contourIntegral: ${result.toFixed(6)}`);
    return result;
  }

  /**
   * 柯西积分公式：f(z₀) = (1/2πi) ∮ f(z)/(z-z₀) dz
   * Cauchy integral formula
   */
  public cauchyIntegralFormula(
    f: (z: ComplexNumber) => ComplexNumber,
    z0: ComplexNumber,
    radius: number = 1
  ): number {
    const contour = (t: number) => this.createComplex(
      z0.real + radius * Math.cos(t),
      z0.imaginary + radius * Math.sin(t)
    );
    const integrand = (z: ComplexNumber) => {
      const diff = this.complexAdd(z, this.createComplex(-z0.real, -z0.imaginary));
      return this.complexDivide(f(z), diff);
    };
    const result = this.contourIntegral(integrand, contour, 0, 2 * Math.PI);
    const value = result / (2 * Math.PI);
    this._recordHistory(`cauchyIntegralFormula: ≈ ${value.toFixed(6)}`);
    return value;
  }

  /**
   * 留数定理：∮ f(z) dz = 2πi Σ Res(f, z_k)
   * Residue theorem
   */
  public residueTheorem(
    f: (z: ComplexNumber) => ComplexNumber,
    singularities: ComplexNumber[],
    radius: number = 1
  ): number {
    let totalResidue = 0;
    for (const singularity of singularities) {
      // Compute residue via small contour integral around singularity
      const contour = (t: number) => this.createComplex(
        singularity.real + radius * 0.01 * Math.cos(t),
        singularity.imaginary + radius * 0.01 * Math.sin(t)
      );
      const result = this.contourIntegral(f, contour, 0, 2 * Math.PI);
      totalResidue += result / (2 * Math.PI);
    }
    const finalResult = totalResidue;
    this._recordHistory(`residueTheorem: ${singularities.length} singularities -> ${finalResult.toFixed(6)}`);
    return finalResult;
  }

  /**
   * 洛朗级数（符号）
   * Laurent series (symbolic representation)
   */
  public laurentSeries(f: string, z0: ComplexNumber): string {
    const result = `f(z) = Σ a_n (z - (${z0.real.toFixed(3)} + ${z0.imaginary.toFixed(3)}i))^n, n ∈ ℤ`;
    this._functions.push({
      expression: f,
      variable: 'z',
      analytic: false,
      singularities: [`${z0.real.toFixed(3)} + ${z0.imaginary.toFixed(3)}i`]
    });
    this._recordHistory(`laurentSeries: ${f} about ${z0.real.toFixed(3)}+${z0.imaginary.toFixed(3)}i`);
    return result;
  }

  /**
   * 泰勒级数（复）
   * Taylor series (complex)
   */
  public taylorSeriesComplex(
    f: (z: ComplexNumber) => ComplexNumber,
    z0: ComplexNumber,
    order: number
  ): string {
    const h = 1e-4;
    const terms: string[] = [];
    for (let n = 0; n <= order; n++) {
      const derivative = this._complexDerivative(f, z0, n, h);
      const factorial = this._factorial(n);
      const coeff = this.complexDivide(derivative, this.createComplex(factorial, 0));
      const cStr = `${coeff.real.toFixed(4)}${coeff.imaginary >= 0 ? '+' : ''}${coeff.imaginary.toFixed(4)}i`;
      if (n === 0) {
        terms.push(cStr);
      } else if (n === 1) {
        terms.push(`${cStr}*(z - z0)`);
      } else {
        terms.push(`${cStr}*(z - z0)^${n}`);
      }
    }
    const result = `f(z) = ${terms.join(' + ')}`;
    this._recordHistory(`taylorSeriesComplex: ${order} terms about z0`);
    return result;
  }

  /**
   * 注册复函数
   * Register a complex function (symbolic)
   */
  public registerFunction(
    expression: string,
    variable: string,
    analytic: boolean,
    singularities: string[]
  ): void {
    this._functions.push({ expression, variable, analytic, singularities: [...singularities] });
    this._recordHistory(`registerFunction: ${expression}`);
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    numbers: number;
    functions: ComplexFunction[];
    integrals: ContourIntegral[];
    history: string[];
  }> {
    return {
      id: `complex-analysis-${Date.now()}-${this._counter}`,
      payload: {
        numbers: this._numbers.size,
        functions: [...this._functions],
        integrals: [...this._integrals],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['probability_theory', 'complex-analysis', 'result'],
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
    this._numbers.clear();
    this._functions = [];
    this._integrals = [];
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
    this._counter++;
  }

  private _factorial(n: number): number {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  private _complexDerivative(
    f: (z: ComplexNumber) => ComplexNumber,
    z0: ComplexNumber,
    order: number,
    h: number
  ): ComplexNumber {
    if (order === 0) return f(z0);
    // Recursive numerical differentiation (simplified)
    const d1 = this._complexDerivative(f, this.createComplex(z0.real + h, z0.imaginary), order - 1, h);
    const d2 = this._complexDerivative(f, this.createComplex(z0.real - h, z0.imaginary), order - 1, h);
    const factor = this.createComplex(1 / (2 * h), 0);
    const diff = this.complexAdd(d1, this.complexMultiply(d2, this.createComplex(-1, 0)));
    return this.complexMultiply(factor, diff);
  }
}
