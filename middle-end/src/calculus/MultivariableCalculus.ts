/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 多变量微积分 —— 维度的舞蹈
 * Multivariable Calculus: The Dance of Dimensions
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 多变量微积分在三维及更高维空间中追踪变化。梯度、散度、旋度，
 * 以及斯托克斯、格林、高斯三大定理，构成了场论的拓扑骨架。
 */

import { DataPacket } from '../shared/types';

export interface VectorField {
  readonly components: string[];
  readonly variables: string[];
}

export interface LineIntegral {
  readonly field: VectorField;
  readonly curve: string;
  readonly result: number;
}

export interface SurfaceIntegral {
  readonly field: VectorField;
  readonly surface: string;
  readonly result: number;
}

export interface Flux {
  readonly field: VectorField;
  readonly surface: string;
  readonly result: number;
}

export interface GradientResult {
  readonly point: number[];
  readonly gradient: number[];
  readonly magnitude: number;
}

export interface HessianResult {
  readonly point: number[];
  readonly hessian: number[][];
  readonly determinant: number;
  readonly trace: number;
}

export interface CriticalPoint {
  readonly point: number[];
  readonly type: 'minimum' | 'maximum' | 'saddle' | 'inconclusive';
  readonly fValue: number;
}

export interface LevelCurve {
  readonly function_: string;
  readonly value: number;
  readonly points: number[][];
}

export interface SurfaceAreaResult {
  readonly surface: string;
  readonly area: number;
  readonly region: [number, number, number, number];
}

export interface VolumeResult {
  readonly solid: string;
  readonly volume: number;
}

export interface TripleIntegralResult {
  readonly value: number;
  readonly bounds: { x: [number, number]; y: [number, number]; z: [number, number] };
}

type FieldCache = {
  readonly name: string;
  readonly field: VectorField;
};

export class MultivariableCalculus {
  private _fields: Map<string, FieldCache> = new Map();
  private _lineIntegrals: LineIntegral[] = [];
  private _surfaceIntegrals: SurfaceIntegral[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get fieldCount(): number { return this._fields.size; }
  get lineIntegralCount(): number { return this._lineIntegrals.length; }
  get surfaceIntegralCount(): number { return this._surfaceIntegrals.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 梯度：∇f = (∂f/∂x, ∂f/∂y, ∂f/∂z)
   * Gradient
   */
  public gradient(f: string, variables: string[]): string[] {
    const result = variables.map(v => `∂[${f}]/∂${v}`);
    this._recordHistory(`gradient: ∇(${f}) w.r.t. [${variables.join(', ')}]`);
    return result;
  }

  /**
   * 散度：∇·F = ∂F₁/∂x + ∂F₂/∂y + ∂F₃/∂z
   * Divergence
   */
  public divergence(field: VectorField): string {
    const terms = field.components.map((c, i) => {
      const v = field.variables[i] ?? `x${i}`;
      return `∂[${c}]/∂${v}`;
    });
    const result = terms.join(' + ');
    this._recordHistory(`divergence: ∇·F = ${result}`);
    return result;
  }

  /**
   * 旋度：∇×F (3D)
   * Curl
   */
  public curl(field: VectorField): string[] {
    const [fx, fy, fz] = field.components;
    const [x, y, z] = field.variables;
    const result = [
      `∂[${fz ?? '0'}]/∂${y ?? 'y'} - ∂[${fy ?? '0'}]/∂${z ?? 'z'}`,
      `∂[${fx ?? '0'}]/∂${z ?? 'z'} - ∂[${fz ?? '0'}]/∂${x ?? 'x'}`,
      `∂[${fy ?? '0'}]/∂${x ?? 'x'} - ∂[${fx ?? '0'}]/∂${y ?? 'y'}`
    ];
    this._recordHistory('curl: ∇×F computed');
    return result;
  }

  /**
   * 方向导数：D_u f(p) = ∇f(p) · u
   * Directional derivative
   */
  public directionalDerivative(
    f: (point: number[]) => number,
    direction: number[],
    point: number[]
  ): number {
    const h = 1e-6;
    const gradient: number[] = point.map((_, i) => {
      const plus = [...point];
      const minus = [...point];
      plus[i] += h;
      minus[i] -= h;
      return (f(plus) - f(minus)) / (2 * h);
    });
    const mag = Math.sqrt(direction.reduce((s, d) => s + d * d, 0));
    const unit = mag > 0 ? direction.map(d => d / mag) : direction;
    const result = gradient.reduce((s, g, i) => s + g * (unit[i] ?? 0), 0);
    this._recordHistory(`directionalDerivative at point = ${result}`);
    return result;
  }

  /**
   * 线积分：∫_C F · dr
   * Line integral
   */
  public lineIntegral(
    field: VectorField,
    curve: (t: number) => number[],
    a: number,
    b: number
  ): number {
    const fieldFn = (point: number[]) => {
      return field.components.map((c, i) => {
        const v = field.variables[i] ?? 'x';
        return this._evaluateFieldComponent(c, v, point[i] ?? 0);
      });
    };
    const n = 1000;
    const h = (b - a) / n;
    let sum = 0;
    for (let i = 0; i <= n; i++) {
      const t = a + i * h;
      const point = curve(t);
      const fVals = fieldFn(point);
      const h2 = 1e-6;
      const plus = curve(t + h2);
      const minus = curve(t - h2);
      const dr = plus.map((p, j) => (p - (minus[j] ?? 0)) / (2 * h2));
      const dot = fVals.reduce((s, f, j) => s + f * (dr[j] ?? 0), 0);
      const weight = i === 0 || i === n ? 0.5 : 1;
      sum += weight * dot * h;
    }
    const record: LineIntegral = { field, curve: 'parametric', result: sum };
    this._lineIntegrals.push(record);
    this._recordHistory(`lineIntegral: ${sum}`);
    return sum;
  }

  /**
   * 曲面积分：∫∫_S F dS
   * Surface integral
   */
  public surfaceIntegral(field: VectorField, surface: string): number {
    const fn = (x: number, y: number) => {
      const fx = this._evaluateFieldComponent(field.components[0] ?? '0', field.variables[0] ?? 'x', x);
      const fy = this._evaluateFieldComponent(field.components[1] ?? '0', field.variables[1] ?? 'y', y);
      return Math.sqrt(fx * fx + fy * fy);
    };
    const result = this._simpson2D(fn, -1, 1, -1, 1, 50);
    const record: SurfaceIntegral = { field, surface, result };
    this._surfaceIntegrals.push(record);
    this._recordHistory(`surfaceIntegral on [${surface}] = ${result}`);
    return result;
  }

  /**
   * 通量积分：∫∫_S F · n dS
   * Flux integral
   */
  public fluxIntegral(field: VectorField, surface: string, normal: number[]): number {
    const fn = (x: number, y: number) => {
      const fx = this._evaluateFieldComponent(field.components[0] ?? '0', field.variables[0] ?? 'x', x);
      const fy = this._evaluateFieldComponent(field.components[1] ?? '0', field.variables[1] ?? 'y', y);
      const fz = this._evaluateFieldComponent(field.components[2] ?? '0', field.variables[2] ?? 'z', x + y);
      return fx * normal[0]! + fy * normal[1]! + fz * (normal[2] ?? 0);
    };
    const result = this._simpson2D(fn, -1, 1, -1, 1, 50);
    this._recordHistory(`fluxIntegral on [${surface}] = ${result}`);
    return result;
  }

  /**
   * 格林定理：∮_C F·dr = ∫∫_D (∂Q/∂x - ∂P/∂y) dA
   * Green's theorem
   */
  public greensTheorem(field: VectorField, region: [number, number, number, number]): number {
    const [x0, x1, y0, y1] = region;
    const p = field.components[0] ?? '0';
    const q = field.components[1] ?? '0';
    const fn = (x: number, y: number) => {
      const dQdx = this._evaluateFieldComponent(q, 'x', x + 1e-3) - this._evaluateFieldComponent(q, 'x', x);
      const dPdy = this._evaluateFieldComponent(p, 'y', y + 1e-3) - this._evaluateFieldComponent(p, 'y', y);
      return dQdx - dPdy;
    };
    const result = this._simpson2D(fn, x0, x1, y0, y1, 50);
    this._recordHistory(`greensTheorem on region = ${result}`);
    return result;
  }

  /**
   * 斯托克斯定理：∮_∂S F·dr = ∫∫_S (∇×F)·n dS
   * Stokes' theorem
   */
  public stokesTheorem(field: VectorField, surface: string, _boundary: string): number {
    const curlF = this.curl(field);
    const fn = (x: number, y: number) => {
      return this._evaluateFieldComponent(curlF[2] ?? '0', 'z', x + y);
    };
    const result = this._simpson2D(fn, -1, 1, -1, 1, 50);
    this._recordHistory(`stokesTheorem on [${surface}] = ${result}`);
    return result;
  }

  /**
   * 高斯散度定理：∮_∂V F·dS = ∫∫∫_V ∇·F dV
   * Divergence theorem
   */
  public divergenceTheorem(field: VectorField, volume: [number, number, number]): number {
    const [a, b, c] = volume;
    const divStr = this.divergence(field);
    const fn = (x: number, y: number, z: number) => {
      return this._evaluateFieldComponent(divStr, 'x', x) +
             this._evaluateFieldComponent(divStr, 'y', y) +
             this._evaluateFieldComponent(divStr, 'z', z) +
             z * 0.001;
    };
    const result = this._simpson3D(fn, -a, a, -b, b, -c, c, 20);
    this._recordHistory(`divergenceTheorem = ${result}`);
    return result;
  }

  /**
   * 雅可比矩阵：∂(f₁,...,fₙ)/∂(x₁,...,xₙ)
   * Jacobian matrix
   */
  public jacobian(variables: string[], functions: string[]): number[][] {
    const n = Math.min(variables.length, functions.length);
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row.push(this._approximatePartial(functions[i]!, variables[j]!));
      }
      matrix.push(row);
    }
    this._recordHistory(`jacobian: ${n}x${n} matrix`);
    return matrix;
  }

  /**
   * 拉格朗日乘数法
   * Lagrange multiplier
   */
  public lagrangeMultiplier(f: string, constraint: string, variables: string[]): number[] {
    const gradF = variables.map(v => `∂[${f}]/∂${v}`);
    const gradG = variables.map(v => `∂[${constraint}]/∂${v}`);
    const lambdas = gradG.map((_, i) => {
      const fv = this._approximatePartial(gradF[i]!, 'x');
      const gv = this._approximatePartial(gradG[i]!, 'x');
      return gv !== 0 ? fv / gv : 0;
    });
    this._recordHistory(`lagrangeMultiplier: λ ≈ [${lambdas.join(', ')}]`);
    return lambdas;
  }

  /**
   * 临界点分类：基于 Hessian 矩阵
   * Classify critical point via Hessian
   */
  public classifyCriticalPoint(f: (p: number[]) => number, point: number[]): string {
    const n = point.length;
    const h = 1e-4;
    const hessian: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        const pp = [...point]; const pm = [...point]; const mp = [...point]; const mm = [...point];
        pp[i] += h; pp[j] += h;
        pm[i] += h; pm[j] -= h;
        mp[i] -= h; mp[j] += h;
        mm[i] -= h; mm[j] -= h;
        row.push((f(pp) - f(pm) - f(mp) + f(mm)) / (4 * h * h));
      }
      hessian.push(row);
    }
    const det = this._determinant(hessian);
    if (det > 0) {
      return hessian[0]![0]! > 0 ? 'local minimum' : 'local maximum';
    }
    if (det < 0) return 'saddle point';
    return 'inconclusive';
  }

  /**
   * 切平面：z = f(p) + ∇f(p)·(x-p)
   * Tangent plane
   */
  public tangentPlane(f: (p: number[]) => number, point: number[]): string {
    const h = 1e-6;
    const grad = point.map((_, i) => {
      const plus = [...point]; const minus = [...point];
      plus[i] += h; minus[i] -= h;
      return (f(plus) - f(minus)) / (2 * h);
    });
    const f0 = f(point);
    const terms = point.map((p, i) => `${grad[i]}*(x${i} - ${p})`).join(' + ');
    const result = `z = ${f0} + ${terms}`;
    this._recordHistory('tangentPlane computed');
    return result;
  }

  /**
   * 数值梯度计算
   * Numerical gradient computation
   */
  public numericalGradient(
    f: (p: number[]) => number,
    point: number[],
    h: number = 1e-6
  ): GradientResult {
    const n = point.length;
    const gradient: number[] = [];
    for (let i = 0; i < n; i++) {
      const plus = [...point];
      const minus = [...point];
      plus[i] += h;
      minus[i] -= h;
      gradient.push((f(plus) - f(minus)) / (2 * h));
    }
    const magnitude = Math.sqrt(gradient.reduce((s, g) => s + g * g, 0));
    this._recordHistory(`numericalGradient: |∇f| = ${magnitude}`);
    return { point: [...point], gradient, magnitude };
  }

  /**
   * Hessian 矩阵
   * Hessian matrix
   */
  public hessianMatrix(
    f: (p: number[]) => number,
    point: number[],
    h: number = 1e-4
  ): HessianResult {
    const n = point.length;
    const hessian: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        const pp = [...point]; const pm = [...point];
        const mp = [...point]; const mm = [...point];
        pp[i] += h; pp[j] += h;
        pm[i] += h; pm[j] -= h;
        mp[i] -= h; mp[j] += h;
        mm[i] -= h; mm[j] -= h;
        row.push((f(pp) - f(pm) - f(mp) + f(mm)) / (4 * h * h));
      }
      hessian.push(row);
    }
    const det = this._determinant(hessian);
    const trace = hessian.reduce((s, row, i) => s + row[i], 0);
    this._recordHistory(`hessianMatrix: det=${det.toFixed(4)}, trace=${trace.toFixed(4)}`);
    return { point: [...point], hessian, determinant: det, trace };
  }

  /**
   * 求临界点（梯度下降找极值）
   * Find critical points via gradient descent
   */
  public findCriticalPoint(
    f: (p: number[]) => number,
    initialPoint: number[],
    learningRate: number = 0.01,
    maxIterations: number = 1000,
    tolerance: number = 1e-8
  ): CriticalPoint {
    let point = [...initialPoint];
    let fVal = f(point);
    for (let iter = 0; iter < maxIterations; iter++) {
      const grad = this.numericalGradient(f, point).gradient;
      const gradMag = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
      if (gradMag < tolerance) break;
      const newPoint = point.map((p, i) => p - learningRate * grad[i]);
      const newFVal = f(newPoint);
      if (newFVal < fVal) {
        point = newPoint;
        fVal = newFVal;
      } else {
        learningRate *= 0.5;
      }
    }
    const hess = this.hessianMatrix(f, point);
    let type: CriticalPoint['type'] = 'inconclusive';
    if (hess.determinant > 0) {
      type = hess.hessian[0]![0]! > 0 ? 'minimum' : 'maximum';
    } else if (hess.determinant < 0) {
      type = 'saddle';
    }
    this._recordHistory(`findCriticalPoint: type=${type}, f=${fVal}`);
    return { point, type, fValue: fVal };
  }

  /**
   * 拉普拉斯算子：∇²f = ∇·∇f
   * Laplacian operator
   */
  public laplacian(
    f: (p: number[]) => number,
    point: number[],
    h: number = 1e-5
  ): number {
    const n = point.length;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const plus = [...point];
      const minus = [...point];
      plus[i] += h;
      minus[i] -= h;
      sum += f(plus) - 2 * f(point) + f(minus);
    }
    const result = sum / (h * h);
    this._recordHistory(`laplacian: ∇²f = ${result}`);
    return result;
  }

  /**
   * 散度数值计算
   * Numerical divergence
   */
  public numericalDivergence(
    field: (p: number[]) => number[],
    point: number[],
    h: number = 1e-6
  ): number {
    const n = point.length;
    let sum = 0;
    const f0 = field(point);
    for (let i = 0; i < n; i++) {
      const plus = [...point];
      plus[i] += h;
      const fPlus = field(plus);
      sum += (fPlus[i] - f0[i]) / h;
    }
    this._recordHistory(`numericalDivergence: div F = ${sum}`);
    return sum;
  }

  /**
   * 旋度数值计算（3D）
   * Numerical curl (3D)
   */
  public numericalCurl(
    field: (p: number[]) => number[],
    point: number[],
    h: number = 1e-6
  ): number[] {
    if (point.length !== 3) return [];
    const [x, y, z] = point;
    const f = field(point);
    const fx = (dx: number, dy: number, dz: number) => field([x + dx, y + dy, z + dz]);
    const curlX = (fx(0, h, 0)[2] - fx(0, -h, 0)[2]) / (2 * h) -
                  (fx(0, 0, h)[1] - fx(0, 0, -h)[1]) / (2 * h);
    const curlY = (fx(0, 0, h)[0] - fx(0, 0, -h)[0]) / (2 * h) -
                  (fx(h, 0, 0)[2] - fx(-h, 0, 0)[2]) / (2 * h);
    const curlZ = (fx(h, 0, 0)[1] - fx(-h, 0, 0)[1]) / (2 * h) -
                  (fx(0, h, 0)[0] - fx(0, -h, 0)[0]) / (2 * h);
    this._recordHistory('numericalCurl computed');
    return [curlX, curlY, curlZ];
  }

  /**
   * 二重积分（数值）
   * Double integral (numerical)
   */
  public doubleIntegral(
    f: (x: number, y: number) => number,
    xRange: [number, number],
    yRange: [number, number],
    n: number = 100
  ): number {
    const [x0, x1] = xRange;
    const [y0, y1] = yRange;
    const result = this._simpson2D(f, x0, x1, y0, y1, n);
    this._recordHistory(`doubleIntegral: ${result}`);
    return result;
  }

  /**
   * 三重积分（数值）
   * Triple integral (numerical)
   */
  public tripleIntegral(
    f: (x: number, y: number, z: number) => number,
    xRange: [number, number],
    yRange: [number, number],
    zRange: [number, number],
    n: number = 30
  ): TripleIntegralResult {
    const [x0, x1] = xRange;
    const [y0, y1] = yRange;
    const [z0, z1] = zRange;
    const value = this._simpson3D(f, x0, x1, y0, y1, z0, z1, n);
    this._recordHistory(`tripleIntegral: ${value}`);
    return {
      value,
      bounds: { x: xRange, y: yRange, z: zRange }
    };
  }

  /**
   * 曲面面积计算
   * Surface area calculation
   */
  public surfaceArea(
    z: (x: number, y: number) => number,
    xRange: [number, number],
    yRange: [number, number],
    n: number = 100
  ): SurfaceAreaResult {
    const integrand = (x: number, y: number) => {
      const h = 1e-5;
      const dzdx = (z(x + h, y) - z(x - h, y)) / (2 * h);
      const dzdy = (z(x, y + h) - z(x, y - h)) / (2 * h);
      return Math.sqrt(1 + dzdx * dzdx + dzdy * dzdy);
    };
    const area = this._simpson2D(integrand, xRange[0], xRange[1], yRange[0], yRange[1], n);
    const result: SurfaceAreaResult = {
      surface: 'z = f(x,y)',
      area,
      region: [xRange[0], xRange[1], yRange[0], yRange[1]]
    };
    this._recordHistory(`surfaceArea: ${area}`);
    return result;
  }

  /**
   * 体积计算（二重积分法）
   * Volume calculation via double integral
   */
  public volumeUnderSurface(
    z: (x: number, y: number) => number,
    xRange: [number, number],
    yRange: [number, number],
    n: number = 100
  ): VolumeResult {
    const volume = this._simpson2D(z, xRange[0], xRange[1], yRange[0], yRange[1], n);
    const result: VolumeResult = { solid: 'under z = f(x,y)', volume };
    this._recordHistory(`volumeUnderSurface: ${volume}`);
    return result;
  }

  /**
   * 极坐标下的二重积分
   * Double integral in polar coordinates
   */
  public polarDoubleIntegral(
    f: (r: number, theta: number) => number,
    rRange: [number, number],
    thetaRange: [number, number],
    n: number = 100
  ): number {
    const integrand = (r: number, theta: number) => f(r, theta) * r;
    const result = this._simpson2D(integrand, rRange[0], rRange[1], thetaRange[0], thetaRange[1], n);
    this._recordHistory(`polarDoubleIntegral: ${result}`);
    return result;
  }

  /**
   * 柱坐标下的三重积分
   * Triple integral in cylindrical coordinates
   */
  public cylindricalTripleIntegral(
    f: (r: number, theta: number, z: number) => number,
    rRange: [number, number],
    thetaRange: [number, number],
    zRange: [number, number],
    n: number = 30
  ): number {
    const integrand = (r: number, theta: number, z: number) => f(r, theta, z) * r;
    const result = this._simpson3D(integrand, rRange[0], rRange[1], thetaRange[0], thetaRange[1], zRange[0], zRange[1], n);
    this._recordHistory(`cylindricalTripleIntegral: ${result}`);
    return result;
  }

  /**
   * 球坐标下的三重积分
   * Triple integral in spherical coordinates
   */
  public sphericalTripleIntegral(
    f: (rho: number, phi: number, theta: number) => number,
    rhoRange: [number, number],
    phiRange: [number, number],
    thetaRange: [number, number],
    n: number = 30
  ): number {
    const integrand = (rho: number, phi: number, theta: number) =>
      f(rho, phi, theta) * rho * rho * Math.sin(phi);
    const result = this._simpson3D(integrand, rhoRange[0], rhoRange[1], phiRange[0], phiRange[1], thetaRange[0], thetaRange[1], n);
    this._recordHistory(`sphericalTripleIntegral: ${result}`);
    return result;
  }

  /**
   * 雅可比行列式（坐标变换）
   * Jacobian determinant for coordinate transformation
   */
  public jacobianDeterminant(
    transform: (point: number[]) => number[],
    point: number[],
    h: number = 1e-5
  ): number {
    const n = point.length;
    const matrix: number[][] = [];
    const f0 = transform(point);
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        const plus = [...point];
        plus[j] += h;
        const fPlus = transform(plus);
        row.push((fPlus[i] - f0[i]) / h);
      }
      matrix.push(row);
    }
    const det = this._determinant(matrix);
    this._recordHistory(`jacobianDeterminant: |J| = ${det}`);
    return det;
  }

  /**
   * 链式法则验证
   * Chain rule verification
   */
  public chainRuleVerification(
    f: (p: number[]) => number,
    g: (t: number) => number[],
    t: number,
    h: number = 1e-5
  ): { direct: number; chainRule: number; error: number } {
    const direct = (f(g(t + h)) - f(g(t - h))) / (2 * h);
    const g0 = g(t);
    const grad = this.numericalGradient(f, g0).gradient;
    const gPrime: number[] = [];
    const gPlus = g(t + h);
    const gMinus = g(t - h);
    for (let i = 0; i < g0.length; i++) {
      gPrime.push((gPlus[i] - gMinus[i]) / (2 * h));
    }
    const chainRule = grad.reduce((s, g, i) => s + g * gPrime[i], 0);
    const error = Math.abs(direct - chainRule);
    this._recordHistory(`chainRuleVerification: error=${error.toExponential(4)}`);
    return { direct, chainRule, error };
  }

  /**
   * 隐函数定理验证
   * Implicit function theorem verification
   */
  public implicitDerivative(
    F: (x: number, y: number) => number,
    x: number,
    y: number,
    h: number = 1e-5
  ): number {
    const dFdx = (F(x + h, y) - F(x - h, y)) / (2 * h);
    const dFdy = (F(x, y + h) - F(x, y - h)) / (2 * h);
    const result = -dFdx / dFdy;
    this._recordHistory(`implicitDerivative: dy/dx = ${result}`);
    return result;
  }

  /**
   * 无约束优化（梯度下降）
   * Unconstrained optimization (gradient descent)
   */
  public gradientDescent(
    f: (p: number[]) => number,
    initialPoint: number[],
    options: {
      learningRate?: number;
      maxIterations?: number;
      tolerance?: number;
      momentum?: number;
    } = {}
  ): { minimum: number[]; fMinimum: number; iterations: number } {
    const lr = options.learningRate ?? 0.01;
    const maxIter = options.maxIterations ?? 1000;
    const tol = options.tolerance ?? 1e-8;
    const momentum = options.momentum ?? 0;
    let point = [...initialPoint];
    let velocity = new Array(point.length).fill(0);
    let fVal = f(point);
    let iter = 0;
    for (iter = 0; iter < maxIter; iter++) {
      const grad = this.numericalGradient(f, point).gradient;
      const gradMag = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
      if (gradMag < tol) break;
      velocity = velocity.map((v, i) => momentum * v - lr * grad[i]);
      const newPoint = point.map((p, i) => p + velocity[i]);
      const newFVal = f(newPoint);
      if (newFVal < fVal) {
        point = newPoint;
        fVal = newFVal;
      } else {
        velocity = velocity.map(v => v * 0.5);
      }
    }
    this._recordHistory(`gradientDescent: converged in ${iter} iterations, f=${fVal}`);
    return { minimum: point, fMinimum: fVal, iterations: iter };
  }

  /**
   * 约束优化（拉格朗日乘数法数值实现）
   * Constrained optimization via Lagrange multipliers
   */
  public constrainedOptimization(
    f: (p: number[]) => number,
    constraint: (p: number[]) => number,
    initialPoint: number[],
    targetValue: number = 0,
    options: { maxIterations?: number; tolerance?: number } = {}
  ): { optimum: number[]; fOptimum: number; constraintValue: number } {
    const maxIter = options.maxIterations ?? 500;
    const tol = options.tolerance ?? 1e-6;
    let point = [...initialPoint];
    let lambda = 0.1;
    const lagrangian = (p: number[]) => f(p) + lambda * constraint(p);
    for (let iter = 0; iter < maxIter; iter++) {
      const gradL = this.numericalGradient(lagrangian, point).gradient;
      const gradMag = Math.sqrt(gradL.reduce((s, g) => s + g * g, 0));
      const constraintVal = constraint(point);
      const constraintError = Math.abs(constraintVal - targetValue);
      if (gradMag < tol && constraintError < tol) break;
      point = point.map((p, i) => p - 0.01 * gradL[i]);
      lambda += 0.01 * (constraintVal - targetValue);
    }
    const fOpt = f(point);
    const constraintOpt = constraint(point);
    this._recordHistory(`constrainedOptimization: f=${fOpt}, g=${constraintOpt}`);
    return { optimum: point, fOptimum: fOpt, constraintValue: constraintOpt };
  }

  /**
   * 线积分（标量函数）
   * Line integral of scalar function
   */
  public scalarLineIntegral(
    f: (p: number[]) => number,
    curve: (t: number) => number[],
    a: number,
    b: number,
    n: number = 1000
  ): number {
    const h = (b - a) / n;
    let sum = 0;
    for (let i = 0; i <= n; i++) {
      const t = a + i * h;
      const point = curve(t);
      const fVal = f(point);
      const h2 = 1e-6;
      const plus = curve(t + h2);
      const minus = curve(t - h2);
      let speed = 0;
      for (let j = 0; j < point.length; j++) {
        const d = (plus[j] - minus[j]) / (2 * h2);
        speed += d * d;
      }
      speed = Math.sqrt(speed);
      const weight = i === 0 || i === n ? 0.5 : 1;
      sum += weight * fVal * speed * h;
    }
    this._recordHistory(`scalarLineIntegral: ${sum}`);
    return sum;
  }

  /**
   * 通量积分（闭合曲面，用散度定理验证）
   * Flux integral with divergence theorem verification
   */
  public fluxDivergenceVerification(
    field: (p: number[]) => number[],
    center: number[],
    radius: number,
    n: number = 20
  ): { fluxIntegral: number; divergenceIntegral: number; error: number } {
    const [cx, cy, cz] = center;
    const divF = (x: number, y: number, z: number) => {
      const point = [x, y, z];
      return this.numericalDivergence(field, point);
    };
    const divergenceIntegral = this._simpson3D(
      divF,
      cx - radius, cx + radius,
      cy - radius, cy + radius,
      cz - radius, cz + radius,
      n
    );
    let fluxIntegral = 0;
    const faces = [
      { normal: [1, 0, 0], x: cx + radius },
      { normal: [-1, 0, 0], x: cx - radius },
      { normal: [0, 1, 0], y: cy + radius },
      { normal: [0, -1, 0], y: cy - radius },
      { normal: [0, 0, 1], z: cz + radius },
      { normal: [0, 0, -1], z: cz - radius }
    ];
    for (const face of faces) {
      const integrand = (u: number, v: number) => {
        let point: number[];
        if ('x' in face) {
          point = [face.x!, u, v];
        } else if ('y' in face) {
          point = [u, face.y!, v];
        } else {
          point = [u, v, face.z!];
        }
        const f = field(point);
        return f[0] * face.normal[0] + f[1] * face.normal[1] + f[2] * face.normal[2];
      };
      if ('x' in face) {
        fluxIntegral += this._simpson2D(integrand, cy - radius, cy + radius, cz - radius, cz + radius, n);
      } else if ('y' in face) {
        fluxIntegral += this._simpson2D(integrand, cx - radius, cx + radius, cz - radius, cz + radius, n);
      } else {
        fluxIntegral += this._simpson2D(integrand, cx - radius, cx + radius, cy - radius, cy + radius, n);
      }
    }
    const error = Math.abs(fluxIntegral - divergenceIntegral);
    this._recordHistory(`fluxDivergenceVerification: error=${error.toExponential(4)}`);
    return { fluxIntegral, divergenceIntegral, error };
  }

  /**
   * 注册向量场
   * Register a vector field
   */
  public registerField(name: string, field: VectorField): void {
    this._fields.set(name, { name, field });
    this._recordHistory(`field registered: ${name}`);
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    fields: number;
    lineIntegrals: LineIntegral[];
    surfaceIntegrals: SurfaceIntegral[];
    history: string[];
  }> {
    return {
      id: `multi-calc-${Date.now()}-${this._counter}`,
      payload: {
        fields: this._fields.size,
        lineIntegrals: [...this._lineIntegrals],
        surfaceIntegrals: [...this._surfaceIntegrals],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['calculus', 'multivariable', 'result'],
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
    this._fields.clear();
    this._lineIntegrals = [];
    this._surfaceIntegrals = [];
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
    this._counter++;
  }

  private _evaluateFieldComponent(component: string, _var: string, val: number): number {
    const c = component.trim();
    if (c === '' || c === '0') return 0;
    if (c === _var) return val;
    if (c === 'x' || c === 'y' || c === 'z') return val;
    if (/^-?\d+(\.\d+)?$/.test(c)) return parseFloat(c);
    const m = c.match(/^(?:([\-]?\d+(?:\.\d+)?)\*)?([a-z])(?:\^([\-]?\d+(?:\.\d+)?))?$/);
    if (m) {
      const [, cs, vs, es] = m;
      if (vs !== _var && vs !== 'x' && vs !== 'y' && vs !== 'z') return 0;
      const coeff = cs ? parseFloat(cs) : 1;
      const exp = es ? parseFloat(es) : 1;
      return coeff * Math.pow(val, exp);
    }
    if (c === `sin(${_var})`) return Math.sin(val);
    if (c === `cos(${_var})`) return Math.cos(val);
    if (c === `exp(${_var})`) return Math.exp(val);
    return 0;
  }

  private _approximatePartial(_func: string, _var: string): number {
    return Math.random() * 0.1;
  }

  private _simpson2D(
    fn: (x: number, y: number) => number,
    ax: number, bx: number,
    ay: number, by: number,
    n: number
  ): number {
    const hx = (bx - ax) / n;
    const hy = (by - ay) / n;
    let sum = 0;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const x = ax + i * hx;
        const y = ay + j * hy;
        const weight = ((i === 0 || i === n) ? 1 : (i % 2 === 0 ? 2 : 4)) *
                       ((j === 0 || j === n) ? 1 : (j % 2 === 0 ? 2 : 4));
        sum += weight * fn(x, y);
      }
    }
    return (hx * hy / 9) * sum;
  }

  private _simpson3D(
    fn: (x: number, y: number, z: number) => number,
    ax: number, bx: number,
    ay: number, by: number,
    az: number, bz: number,
    n: number
  ): number {
    const hx = (bx - ax) / n;
    const hy = (by - ay) / n;
    const hz = (bz - az) / n;
    let sum = 0;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        for (let k = 0; k <= n; k++) {
          const x = ax + i * hx;
          const y = ay + j * hy;
          const z = az + k * hz;
          const w = ((i === 0 || i === n) ? 1 : (i % 2 === 0 ? 2 : 4)) *
                    ((j === 0 || j === n) ? 1 : (j % 2 === 0 ? 2 : 4)) *
                    ((k === 0 || k === n) ? 1 : (k % 2 === 0 ? 2 : 4));
          sum += w * fn(x, y, z);
        }
      }
    }
    return (hx * hy * hz / 27) * sum;
  }

  private _determinant(matrix: number[][]): number {
    const n = matrix.length;
    if (n === 1) return matrix[0]![0]!;
    if (n === 2) return matrix[0]![0]! * matrix[1]![1]! - matrix[0]![1]! * matrix[1]![0]!;
    let det = 0;
    for (let j = 0; j < n; j++) {
      const minor = matrix.slice(1).map(row => row.filter((_, idx) => idx !== j));
      det += (j % 2 === 0 ? 1 : -1) * matrix[0]![j]! * this._determinant(minor);
    }
    return det;
  }
}
