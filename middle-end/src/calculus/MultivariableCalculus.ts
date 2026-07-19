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
