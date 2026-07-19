/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 微分方程 —— 时间演化的语法
 * Differential Equations: The Grammar of Time Evolution
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 微分方程是物理世界用导数书写的诗。从可分离变量到 Bernoulli，
 * 从欧拉法到 Runge-Kutta，每一阶方程都展开为时间的图景。
 */

import { DataPacket } from '../shared/types';

export interface ODE {
  readonly type: string;
  readonly equation: string;
  readonly variables: string[];
  readonly initialConditions: Map<string, number>;
}

export interface ODESolution {
  readonly equation: string;
  readonly method: string;
  readonly steps: string[];
  readonly general: string;
  readonly particular: string;
}

export interface PDE {
  readonly equation: string;
  readonly variables: string[];
  readonly boundaryConditions: string[];
}

type ODECache = {
  readonly id: string;
  readonly type: string;
  readonly equation: string;
};

export class DifferentialEquations {
  private _odes: Map<string, ODECache> = new Map();
  private _solutions: ODESolution[] = [];
  private _pdes: PDE[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get odeCount(): number { return this._odes.size; }
  get solutionCount(): number { return this._solutions.length; }
  get pdeCount(): number { return this._pdes.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 一阶线性 ODE：y' + P(x)y = Q(x)
   * 求解通过积分因子 μ(x) = e^∫P dx
   * First-order linear ODE
   */
  public solveFirstOrderLinear(ode: ODE): ODESolution {
    const steps = [
      'Identify P(x) and Q(x) from y\' + P(x)y = Q(x)',
      'Compute integrating factor μ(x) = e^(∫P(x) dx)',
      'Multiply both sides by μ(x)',
      'Apply product rule: d/dx[μ·y] = μ·Q(x)',
      'Integrate both sides: μ·y = ∫μ·Q(x) dx + C',
      'Solve for y: y = (1/μ) · [∫μ·Q(x) dx + C]'
    ];
    const general = 'y = e^(-∫P dx) · [∫Q·e^(∫P dx) dx + C]';
    const particular = 'y(x₀) = y₀ determines C';
    const solution: ODESolution = { equation: ode.equation, method: 'first-order-linear', steps, general, particular };
    this._solutions.push(solution);
    this._cacheODE(ode);
    this._recordHistory('solveFirstOrderLinear');
    return solution;
  }

  /**
   * 可分离变量方程：dy/dx = f(x)g(y)
   * Separable ODE
   */
  public solveSeparable(ode: ODE): ODESolution {
    const steps = [
      'Rearrange as dy/g(y) = f(x) dx',
      'Integrate both sides: ∫(1/g(y)) dy = ∫f(x) dx',
      'Apply initial conditions to find constant C',
      'Solve for y explicitly if possible'
    ];
    const general = '∫(1/g(y)) dy = ∫f(x) dx + C';
    const particular = 'Apply y(x₀) = y₀';
    const solution: ODESolution = { equation: ode.equation, method: 'separable', steps, general, particular };
    this._solutions.push(solution);
    this._cacheODE(ode);
    this._recordHistory('solveSeparable');
    return solution;
  }

  /**
   * 恰当方程：M dx + N dy = 0, ∂M/∂y = ∂N/∂x
   * Exact ODE
   */
  public solveExact(ode: ODE): ODESolution {
    const steps = [
      'Verify ∂M/∂y = ∂N/∂x (exactness condition)',
      'Find F(x,y) such that ∂F/∂x = M and ∂F/∂y = N',
      'Integrate M w.r.t. x: F = ∫M dx + φ(y)',
      'Differentiate F w.r.t. y and equate to N to find φ\'(y)',
      'Integrate to find φ(y)',
      'Solution: F(x,y) = C'
    ];
    const general = 'F(x, y) = C, where ∂F/∂x = M, ∂F/∂y = N';
    const particular = 'F(x₀, y₀) = C';
    const solution: ODESolution = { equation: ode.equation, method: 'exact', steps, general, particular };
    this._solutions.push(solution);
    this._cacheODE(ode);
    this._recordHistory('solveExact');
    return solution;
  }

  /**
   * 齐次方程：dy/dx = F(y/x)
   * Homogeneous ODE
   */
  public solveHomogeneous(ode: ODE): ODESolution {
    const steps = [
      'Verify dy/dx = F(y/x) form',
      'Substitute v = y/x, so y = vx and dy/dx = v + x·dv/dx',
      'Rewrite as separable: x·dv/dx = F(v) - v',
      'Separate: dv/(F(v)-v) = dx/x',
      'Integrate both sides',
      'Back-substitute v = y/x'
    ];
    const general = '∫dv/(F(v)-v) = ln|x| + C, v = y/x';
    const particular = 'Apply y(x₀) = y₀';
    const solution: ODESolution = { equation: ode.equation, method: 'homogeneous', steps, general, particular };
    this._solutions.push(solution);
    this._cacheODE(ode);
    this._recordHistory('solveHomogeneous');
    return solution;
  }

  /**
   * 伯努利方程：y' + P(x)y = Q(x)y^n
   * Bernoulli ODE
   */
  public solveBernoulli(ode: ODE): ODESolution {
    const steps = [
      'Identify Bernoulli form: y\' + P(x)y = Q(x)y^n',
      'Substitute v = y^(1-n)',
      'Compute dv/dx = (1-n)y^(-n) · dy/dx',
      'Transform to linear ODE in v: v\' + (1-n)P(x)v = (1-n)Q(x)',
      'Solve linear ODE using integrating factor',
      'Back-substitute v = y^(1-n)'
    ];
    const general = 'v = e^(-(1-n)∫P dx) · [∫(1-n)Q·e^((1-n)∫P dx) dx + C]';
    const particular = 'y^(1-n) = v, apply y(x₀) = y₀';
    const solution: ODESolution = { equation: ode.equation, method: 'bernoulli', steps, general, particular };
    this._solutions.push(solution);
    this._cacheODE(ode);
    this._recordHistory('solveBernoulli');
    return solution;
  }

  /**
   * 二阶常系数线性 ODE：ay'' + by' + cy = 0
   * Second-order constant-coefficient ODE
   */
  public solveSecondOrderConstant(ode: ODE): ODESolution {
    const steps = [
      'Write characteristic equation: ar² + br + c = 0',
      'Find roots r₁, r₂ = (-b ± √(b²-4ac)) / 2a',
      'Case 1 (real distinct): y = C₁e^(r₁x) + C₂e^(r₂x)',
      'Case 2 (real repeated): y = (C₁ + C₂x)e^(rx)',
      'Case 3 (complex α±βi): y = e^(αx)(C₁cos(βx) + C₂sin(βx))',
      'Apply initial conditions y(0), y\'(0) to find C₁, C₂'
    ];
    const general = 'y = C₁e^(r₁x) + C₂e^(r₂x) (real distinct roots)';
    const particular = 'Determined by y(x₀) = y₀, y\'(x₀) = y\'₀';
    const solution: ODESolution = { equation: ode.equation, method: 'second-order-constant', steps, general, particular };
    this._solutions.push(solution);
    this._cacheODE(ode);
    this._recordHistory('solveSecondOrderConstant');
    return solution;
  }

  /**
   * 欧拉方法：y_{n+1} = y_n + h·f(x_n, y_n)
   * Euler's method
   */
  public eulerMethod(
    f: (x: number, y: number) => number,
    x0: number,
    y0: number,
    h: number,
    steps: number
  ): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [{ x: x0, y: y0 }];
    let x = x0;
    let y = y0;
    for (let i = 0; i < steps; i++) {
      y = y + h * f(x, y);
      x = x + h;
      result.push({ x, y });
    }
    this._recordHistory(`eulerMethod: ${steps} steps`);
    return result;
  }

  /**
   * 四阶 Runge-Kutta：经典 RK4
   * Runge-Kutta 4th order
   */
  public rungeKutta4(
    f: (x: number, y: number) => number,
    x0: number,
    y0: number,
    h: number,
    steps: number
  ): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [{ x: x0, y: y0 }];
    let x = x0;
    let y = y0;
    for (let i = 0; i < steps; i++) {
      const k1 = f(x, y);
      const k2 = f(x + h / 2, y + h * k1 / 2);
      const k3 = f(x + h / 2, y + h * k2 / 2);
      const k4 = f(x + h, y + h * k3);
      y = y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      x = x + h;
      result.push({ x, y });
    }
    this._recordHistory(`rungeKutta4: ${steps} steps`);
    return result;
  }

  /**
   * 拉普拉斯变换：L{f(t)} = ∫₀^∞ e^(-st) f(t) dt
   * Laplace transform
   */
  public laplaceTransform(f: string): string {
    const table: Record<string, string> = {
      '1': '1/s',
      't': '1/s^2',
      't^2': '2/s^3',
      'exp(at)': '1/(s-a)',
      'sin(at)': 'a/(s^2+a^2)',
      'cos(at)': 's/(s^2+a^2)',
      'sinh(at)': 'a/(s^2-a^2)',
      'cosh(at)': 's/(s^2-a^2)'
    };
    const result = table[f.trim()] ?? `L{${f}} = ∫₀^∞ e^(-st) · ${f} dt`;
    this._recordHistory(`laplaceTransform: ${f} -> ${result}`);
    return result;
  }

  /**
   * 逆拉普拉斯变换
   * Inverse Laplace transform
   */
  public inverseLaplace(F: string): string {
    const table: Record<string, string> = {
      '1/s': '1',
      '1/s^2': 't',
      '2/s^3': 't^2',
      '1/(s-a)': 'exp(at)',
      'a/(s^2+a^2)': 'sin(at)',
      's/(s^2+a^2)': 'cos(at)'
    };
    const result = table[F.trim()] ?? `L^-1{${F}}`;
    this._recordHistory(`inverseLaplace: ${F} -> ${result}`);
    return result;
  }

  /**
   * 傅里叶级数：f(t) = a₀/2 + Σ[aₙcos(nπt/L) + bₙsin(nπt/L)]
   * Fourier series coefficients
   */
  public fourierSeries(
    f: (t: number) => number,
    period: number
  ): { a0: number; an: number[]; bn: number[] } {
    const L = period / 2;
    const n = 10;
    const samples = 1000;
    const dt = period / samples;
    let a0 = 0;
    for (let i = 0; i < samples; i++) {
      a0 += f(i * dt) * dt;
    }
    a0 = (2 / period) * a0;
    const an: number[] = [];
    const bn: number[] = [];
    for (let k = 1; k <= n; k++) {
      let a = 0;
      let b = 0;
      for (let i = 0; i < samples; i++) {
        const t = i * dt;
        a += f(t) * Math.cos(k * Math.PI * t / L) * dt;
        b += f(t) * Math.sin(k * Math.PI * t / L) * dt;
      }
      an.push((2 / period) * a);
      bn.push((2 / period) * b);
    }
    this._recordHistory(`fourierSeries: ${n} harmonics, period=${period}`);
    return { a0, an, bn };
  }

  /**
   * 波动方程：∂²u/∂t² = c² ∂²u/∂x²
   * Wave equation
   */
  public solveWaveEquation(pde: PDE): string {
    this._pdes.push(pde);
    const result = 'u(x,t) = Σ [Aₙcos(nπct/L) + Bₙsin(nπct/L)] · sin(nπx/L)';
    this._recordHistory('solveWaveEquation: separation of variables');
    return result;
  }

  /**
   * 热传导方程：∂u/∂t = α ∂²u/∂x²
   * Heat equation
   */
  public solveHeatEquation(pde: PDE): string {
    this._pdes.push(pde);
    const result = 'u(x,t) = Σ Bₙ · exp(-α(nπ/L)²t) · sin(nπx/L)';
    this._recordHistory('solveHeatEquation: separation of variables');
    return result;
  }

  /**
   * 拉普拉斯方程：∇²u = 0
   * Laplace equation
   */
  public solveLaplaceEquation(pde: PDE): string {
    this._pdes.push(pde);
    const result = 'u(x,y) = Σ [Aₙcosh(nπy/L) + Bₙsinh(nπy/L)] · sin(nπx/L)';
    this._recordHistory('solveLaplaceEquation: separation of variables');
    return result;
  }

  /**
   * PDE 分类：椭圆/抛物/双曲
   * Classify PDE
   */
  public classifyPDE(pde: PDE): string {
    const eq = pde.equation;
    if (eq.includes('∂²u/∂t²') && eq.includes('∂²u/∂x²')) {
      return 'hyperbolic (wave-like)';
    }
    if (eq.includes('∂u/∂t') && eq.includes('∂²u/∂x²')) {
      return 'parabolic (diffusion-like)';
    }
    if (eq.includes('∇²') || (eq.includes('∂²u/∂x²') && eq.includes('∂²u/∂y²'))) {
      return 'elliptic (potential-like)';
    }
    return 'unclassified';
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    odes: number;
    solutions: ODESolution[];
    pdes: PDE[];
    history: string[];
  }> {
    return {
      id: `ode-solver-${Date.now()}-${this._counter}`,
      payload: {
        odes: this._odes.size,
        solutions: [...this._solutions],
        pdes: [...this._pdes],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['calculus', 'differential-equations', 'result'],
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
    this._odes.clear();
    this._solutions = [];
    this._pdes = [];
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _cacheODE(ode: ODE): void {
    const id = `ode-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._odes.set(id, { id, type: ode.type, equation: ode.equation });
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
