/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 量子力学 —— 叠加与纠缠的迷雾
 * Quantum Mechanics: The Mist of Superposition and Entanglement
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从薛定谔方程到贝尔不等式，量子力学颠覆了经典直觉。
 * 波函数在希尔伯特空间中演化，测量则令其不可逆地坍缩，而纠缠编织出非局域的关联。
 *
 * 覆盖范围：
 *  - 薛定谔方程（含时/不含时）、概率密度、期望值、不确定性原理
 *  - 自旋与泡利矩阵、阶梯算符、Clebsch-Gordan 系数
 *  - 氢原子（能级、玻尔半径、里德伯公式、轨道磁矩）
 *  - 量子谐振子（能级、波函数、Hermite 多项式、阶梯算符）
 *  - 势阱（无限深/有限深）、WKB 近似、隧穿、共振
 *  - 角动量、轨道角动量、球谐函数（简化）
 *  - 微扰理论（一阶/二阶）、变分法
 *  - 自旋耦合、Zeeman 效应、Stark 效应
 *  - 密度矩阵、布洛赫球、量子比特
 *  - 量子门（Hadamard、CNOT、Pauli、相位门）、量子电路
 *  - 贝尔不等式（CHSH）、量子隐形传态、超密编码
 *  - 路径积分（简化）、Feynman 传播子
 *  - 散射理论（玻恩近似、截面）
 *  - 全同性、Fermi-Dirac / Bose-Einstein 统计
 *  - Berry 相位、Aharonov-Bohm 效应
 *  - 量子热力学、von Neumann 熵、量子主方程（简化）
 */

import { DataPacket } from '../shared/types';

/** 波函数：振幅与概率。 */
export interface WaveFunction {
  readonly amplitude: number;
  readonly probability: number;
  readonly phase: number;
}

/** 量子态：右矢与基矢。 */
export interface QuantumState {
  readonly ket: number[];
  readonly basis: string[];
  readonly normalized: boolean;
}

/** 可观测量：算符与本征值。 */
export interface Observable {
  readonly operator: number[][];
  readonly eigenvalues: number[];
  readonly label: string;
}

/** 不确定性关系：ΔA * ΔB ≥ ... */
export interface Uncertainty {
  readonly deltaA: number;
  readonly deltaB: number;
  readonly lowerBound: number;
  readonly saturated: boolean;
}

/** 密度矩阵描述符。 */
export interface DensityMatrix {
  readonly matrix: number[][];
  readonly pure: boolean;
  readonly trace: number;
}

/** 自旋量子数描述符。 */
export interface SpinState {
  readonly s: number;
  readonly m: number;
  readonly mult: number;
  readonly degeneracy: number;
}

/** 量子门描述符。 */
export interface QuantumGate {
  readonly name: string;
  readonly matrix: number[][];
  readonly qubits: number;
  readonly reversible: boolean;
}

/** 量子比特在布洛赫球上的坐标。 */
export interface BlochVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly theta: number;
  readonly phi: number;
}

/** 角动量耦合结果。 */
export interface AngularMomentumCoupling {
  readonly totalJ: number[];
  readonly clebschGordan: Array<{ j1: number; m1: number; j2: number; m2: number; J: number; M: number; coeff: number }>;
}

/** CHSH 不等式结果。 */
export interface BellInequality {
  readonly chsh: number;
  readonly classical: number;
  readonly quantum: number;
  readonly violated: boolean;
}

/** 微扰论结果。 */
export interface PerturbationResult {
  readonly firstOrder: number;
  readonly secondOrder: number;
  readonly total: number;
}

type StateRecord = {
  readonly id: string;
  readonly state: QuantumState;
  readonly timestamp: number;
};

type ObservableRecord = {
  readonly id: string;
  readonly observable: Observable;
  readonly timestamp: number;
};

type MeasurementRecord = {
  readonly id: string;
  readonly state: QuantumState;
  readonly observable: Observable;
  readonly outcome: number;
  readonly timestamp: number;
};

type GateRecord = {
  readonly id: string;
  readonly gate: QuantumGate;
  readonly timestamp: number;
};

/** 约化普朗克常数 ℏ (J·s)。 */
const HBAR = 1.054571817e-34;
/** 普朗克常数 h (J·s)。 */
const H_PLANCK = 6.62607015e-34;
/** 玻尔半径 a_0 (m)。 */
const A0_BOHR = 5.29177210903e-11;
/** 电子伏特到焦耳换算。 */
const EV = 1.602176634e-19;
/** 电子静止质量 (kg)。 */
const M_E = 9.1093837015e-31;
/** 元电荷 (C)。 */
const E_CHARGE = 1.602176634e-19;
/** 真空介电常数 (F/m)。 */
const EPSILON_0 = 8.8541878128e-12;
/** 玻尔磁子 (J/T)。 */
const MU_B = 9.274009994e-24;
/** 玻尔兹曼常数 (J/K)。 */
const K_B = 1.380649e-23;
/** 真空光速 (m/s)。 */
const C_LIGHT = 299792458;

export class QuantumMechanics {
  private _states: Map<string, StateRecord> = new Map();
  private _observables: Map<string, ObservableRecord> = new Map();
  private _measurements: Map<string, MeasurementRecord> = new Map();
  private _gates: Map<string, GateRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get stateCount(): number { return this._states.size; }
  get observableCount(): number { return this._observables.size; }
  get measurementCount(): number { return this._measurements.size; }
  get gateCount(): number { return this._gates.size; }
  get history(): string[] { return [...this._history]; }

  // ─── 基础量子力学 ───

  /**
   * 薛定谔方程：iℏ ∂ψ/∂t = Ĥ ψ
   * Time-dependent Schrödinger equation (formal)
   */
  public schrodingerEquation(
    hamiltonian: number[][],
    psi: number[],
    t: number,
  ): { evolved: number[]; phaseFactor: number } {
    if (hamiltonian.length !== psi.length) {
      throw new Error('Hamiltonian dimension must match wavefunction');
    }
    const evolved: number[] = psi.map((c, i) => {
      const row = hamiltonian[i] ?? [];
      const energy = row.reduce((acc, val, j) => acc + val * (psi[j] ?? 0), 0);
      return c * Math.cos((-energy * t) / HBAR);
    });
    const phaseFactor = Math.cos((-1 * t) / HBAR);
    this._recordHistory(`schrodingerEquation: dim=${psi.length}, t=${t} -> evolved`);
    return { evolved, phaseFactor };
  }

  /**
   * 定态薛定谔方程：Ĥ ψ_n = E_n ψ_n
   * 时间无关薛定谔方程（本征值问题）
   */
  public stationarySchrodinger(
    hamiltonian: number[][],
  ): { eigenvalues: number[]; eigenvectors: number[][] } {
    const n = hamiltonian.length;
    if (n === 0) return { eigenvalues: [], eigenvectors: [] };
    // 简化的 Jacobi 本征值算法（适用于小型对称矩阵）
    const H = hamiltonian.map(row => [...row]);
    const V: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    );
    const maxIter = 100;
    for (let iter = 0; iter < maxIter; iter++) {
      // 找到最大的非对角元素
      let p = 0, q = 1, maxVal = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const v = Math.abs(H[i][j] ?? 0);
          if (v > maxVal) {
            maxVal = v;
            p = i;
            q = j;
          }
        }
      }
      if (maxVal < 1e-12) break;
      const hpp = H[p][p] ?? 0;
      const hqq = H[q][q] ?? 0;
      const hpq = H[p][q] ?? 0;
      const theta = (hqq - hpp) / (2 * hpq);
      const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      // 旋转
      for (let i = 0; i < n; i++) {
        const hip = H[i][p] ?? 0;
        const hiq = H[i][q] ?? 0;
        H[i][p] = c * hip - s * hiq;
        H[i][q] = s * hip + c * hiq;
      }
      for (let j = 0; j < n; j++) {
        const hpj = H[p][j] ?? 0;
        const hqj = H[q][j] ?? 0;
        H[p][j] = c * hpj - s * hqj;
        H[q][j] = s * hpj + c * hqj;
      }
      for (let i = 0; i < n; i++) {
        const vip = V[i][p] ?? 0;
        const viq = V[i][q] ?? 0;
        V[i][p] = c * vip - s * viq;
        V[i][q] = s * vip + c * viq;
      }
    }
    const eigenvalues = H.map((row, i) => row[i] ?? 0);
    eigenvalues.sort((a, b) => a - b);
    this._recordHistory(`stationarySchrodinger: dim=${n}, eigenvalues computed`);
    return { eigenvalues, eigenvectors: V };
  }

  /**
   * 概率密度：|ψ|^2
   * Probability density
   */
  public probabilityDensity(psi: number[]): { density: number[]; total: number } {
    const density = psi.map(c => c * c);
    const total = density.reduce((acc, p) => acc + p, 0);
    this._recordHistory(`probabilityDensity: dim=${psi.length}, total=${total}`);
    return { density, total };
  }

  /**
   * 归一化波函数：ψ/||ψ||
   * Normalize wavefunction
   */
  public normalize(psi: number[]): { normalized: number[]; norm: number; success: boolean } {
    const norm = Math.sqrt(psi.reduce((acc, c) => acc + c * c, 0));
    const success = norm > 1e-30;
    const normalized = success ? psi.map(c => c / norm) : psi.slice();
    this._recordHistory(`normalize: ||ψ||=${norm}, success=${success}`);
    return { normalized, norm, success };
  }

  /**
   * 内积：<φ|ψ>
   * Inner product of two states (real approximation)
   */
  public innerProduct(phi: number[], psi: number[]): number {
    if (phi.length !== psi.length) {
      throw new Error('States must have same dimension for inner product');
    }
    let result = 0;
    for (let i = 0; i < phi.length; i++) {
      result += (phi[i] ?? 0) * (psi[i] ?? 0);
    }
    this._recordHistory(`innerProduct: <φ|ψ>=${result}`);
    return result;
  }

  /**
   * 期望值：<ψ|A|ψ>
   * Expectation value of an observable
   */
  public expectationValue(observable: Observable, state: QuantumState): number {
    const { operator } = observable;
    const { ket } = state;
    if (operator.length !== ket.length) {
      throw new Error('Operator and state dimensions must match');
    }
    let expectation = 0;
    for (let i = 0; i < ket.length; i++) {
      const row = operator[i] ?? [];
      let rowSum = 0;
      for (let j = 0; j < ket.length; j++) {
        rowSum += (row[j] ?? 0) * (ket[j] ?? 0);
      }
      expectation += (ket[i] ?? 0) * rowSum;
    }
    this._recordHistory(`expectationValue: <${observable.label}> = ${expectation}`);
    return expectation;
  }

  /**
   * 方差：Var(A) = <A²> - <A>²
   * Variance of an observable
   */
  public variance(observable: Observable, state: QuantumState): {
    variance: number;
    stdDev: number;
    expectation: number;
  } {
    const expA = this.expectationValue(observable, state);
    const A2: Observable = {
      operator: this._matMul(observable.operator, observable.operator),
      eigenvalues: observable.eigenvalues,
      label: `${observable.label}²`,
    };
    const expA2 = this.expectationValue(A2, state);
    const variance = expA2 - expA * expA;
    this._recordHistory(`variance: <${observable.label}²>=${expA2}, σ=${Math.sqrt(Math.abs(variance))}`);
    return { variance, stdDev: Math.sqrt(Math.abs(variance)), expectation: expA };
  }

  /**
   * 不确定性原理：ΔA * ΔB ≥ |<AB>|/2
   * Heisenberg Uncertainty Principle
   */
  public uncertaintyPrinciple(A: Observable, B: Observable, state: QuantumState): Uncertainty {
    if (A.eigenvalues.length === 0 || B.eigenvalues.length === 0) {
      throw new Error('Observables must have eigenvalues');
    }
    const deltaA = Math.max(...A.eigenvalues) - Math.min(...A.eigenvalues);
    const deltaB = Math.max(...B.eigenvalues) - Math.min(...B.eigenvalues);
    const lowerBound = HBAR / 2;
    const saturated = Math.abs(deltaA * deltaB - lowerBound) < 1e-30;
    this._recordHistory(
      `uncertaintyPrinciple: ΔA=${deltaA}, ΔB=${deltaB}, bound=${lowerBound}`,
    );
    void state;
    return { deltaA, deltaB, lowerBound, saturated };
  }

  /**
   * 海森堡不确定性原理（位置-动量）：Δx Δp ≥ ℏ/2
   */
  public heisenbergPositionMomentum(dx: number): { dp: number; bound: number } {
    const bound = HBAR / 2;
    const dp = bound / Math.max(dx, 1e-30);
    this._recordHistory(`heisenbergPositionMomentum: Δx=${dx}, Δp≥${dp}`);
    return { dp, bound };
  }

  /**
   * 能量-时间不确定性：ΔE Δt ≥ ℏ/2
   */
  public energyTimeUncertainty(dt: number): { dE: number; bound: number } {
    const bound = HBAR / 2;
    const dE = bound / Math.max(dt, 1e-30);
    this._recordHistory(`energyTimeUncertainty: Δt=${dt}, ΔE≥${dE}`);
    return { dE, bound };
  }

  // ─── 自旋与泡利代数 ───

  /**
   * 泡利矩阵：σ_x, σ_y, σ_z
   * Pauli matrices
   */
  public pauliMatrices(): {
    sigmaX: number[][];
    sigmaY: number[][];
    sigmaZ: number[][];
  } {
    const sigmaX = [[0, 1], [1, 0]];
    const sigmaY = [[0, -1], [1, 0]];
    const sigmaZ = [[1, 0], [0, -1]];
    this._recordHistory('pauliMatrices: returned σ_x, σ_y, σ_z');
    return { sigmaX, sigmaY, sigmaZ };
  }

  /**
   * 自旋算符：S_i = (ℏ/2) σ_i
   * Spin operators for spin-1/2
   */
  public spinOperators(): {
    Sx: number[][];
    Sy: number[][];
    Sz: number[][];
  } {
    const { sigmaX, sigmaY, sigmaZ } = this.pauliMatrices();
    const Sx = sigmaX.map(row => row.map(v => (v * HBAR) / 2));
    const Sy = sigmaY.map(row => row.map(v => (v * HBAR) / 2));
    const Sz = sigmaZ.map(row => row.map(v => (v * HBAR) / 2));
    this._recordHistory('spinOperators: returned Sx, Sy, Sz');
    return { Sx, Sy, Sz };
  }

  /**
   * 自旋态描述：s, m, 多重度 2s+1, 简并度
   * Spin state descriptor
   */
  public spinState(s: number): SpinState {
    if (s < 0 || !Number.isInteger(2 * s)) {
      throw new Error('Spin s must be a non-negative half-integer');
    }
    const mult = 2 * s + 1;
    const ms: number[] = [];
    for (let m = -s; m <= s; m += 1) ms.push(m);
    void ms;
    this._recordHistory(`spinState: s=${s}, mult=${mult}`);
    return { s, m: 0, mult, degeneracy: mult };
  }

  /**
   * 阶梯算符：S_± |s,m> = ℏ√(s(s+1) - m(m±1)) |s,m±1>
   * Ladder operators
   */
  public ladderOperators(s: number, m: number): { up: number; down: number } {
    if (s < 0 || Math.abs(m) > s) throw new Error('Invalid s or m');
    const up = HBAR * Math.sqrt(Math.max(0, s * (s + 1) - m * (m + 1)));
    const down = HBAR * Math.sqrt(Math.max(0, s * (s + 1) - m * (m - 1)));
    this._recordHistory(`ladderOperators: s=${s}, m=${m} -> S+=${up}, S-=${down}`);
    return { up, down };
  }

  /**
   * 角动量平方本征值：L² = ℏ² l(l+1)
   */
  public angularMomentumSquared(l: number): number {
    if (l < 0 || !Number.isInteger(l)) throw new Error('l must be a non-negative integer');
    const L2 = HBAR * HBAR * l * (l + 1);
    this._recordHistory(`angularMomentumSquared: l=${l} -> L²=${L2}`);
    return L2;
  }

  /**
   * 角动量 z 分量：L_z = ℏ m
   */
  public angularMomentumZ(m: number): number {
    const Lz = HBAR * m;
    this._recordHistory(`angularMomentumZ: m=${m} -> Lz=${Lz}`);
    return Lz;
  }

  /**
   * Clebsch-Gordan 系数（简化版）
   * 仅处理 j1=1/2 与 j2=1/2 的情况
   */
  public clebschGordan(j1: number, j2: number): AngularMomentumCoupling {
    if (j1 < 0 || j2 < 0) throw new Error('j1 and j2 must be non-negative');
    const Jmin = Math.abs(j1 - j2);
    const Jmax = j1 + j2;
    const totalJ: number[] = [];
    for (let J = Jmin; J <= Jmax; J += 1) totalJ.push(J);
    // 简化：返回 1/2 + 1/2 -> 1 ⊕ 0 的标准 CG 表
    const cg: Array<{ j1: number; m1: number; j2: number; m2: number; J: number; M: number; coeff: number }> = [];
    if (j1 === 0.5 && j2 === 0.5) {
      const inv = 1 / Math.sqrt(2);
      cg.push({ j1: 0.5, m1: 0.5, j2: 0.5, m2: 0.5, J: 1, M: 1, coeff: 1 });
      cg.push({ j1: 0.5, m1: 0.5, j2: 0.5, m2: -0.5, J: 1, M: 0, coeff: inv });
      cg.push({ j1: 0.5, m1: -0.5, j2: 0.5, m2: 0.5, J: 1, M: 0, coeff: inv });
      cg.push({ j1: 0.5, m1: -0.5, j2: 0.5, m2: -0.5, J: 1, M: -1, coeff: 1 });
      cg.push({ j1: 0.5, m1: 0.5, j2: 0.5, m2: -0.5, J: 0, M: 0, coeff: inv });
      cg.push({ j1: 0.5, m1: -0.5, j2: 0.5, m2: 0.5, J: 0, M: 0, coeff: -inv });
    }
    this._recordHistory(`clebschGordan: j1=${j1}, j2=${j2} -> J=[${totalJ.join(',')}]`);
    return { totalJ, clebschGordan: cg };
  }

  // ─── 氢原子 ───

  /**
   * 氢原子能级：E_n = -13.6 eV / n^2
   * Hydrogen atom energy levels
   */
  public hydrogenAtom(n: number, l: number, m: number): {
    energy: number;
    angularMomentum: number;
    magnetic: number;
  } {
    if (n < 1) throw new Error('Principal quantum number n must be ≥ 1');
    if (l < 0 || l > n - 1) throw new Error('l must satisfy 0 ≤ l ≤ n-1');
    if (m < -l || m > l) throw new Error('m must satisfy -l ≤ m ≤ l');
    const energy = (-13.6 * EV) / (n * n);
    const angularMomentum = HBAR * Math.sqrt(l * (l + 1));
    const magnetic = HBAR * m;
    this._recordHistory(`hydrogenAtom: n=${n}, l=${l}, m=${m} -> E=${energy} J`);
    return { energy, angularMomentum, magnetic };
  }

  /**
   * 里德伯公式：1/λ = R (1/n1² - 1/n2²)
   * Rydberg formula for hydrogen spectral lines
   */
  public rydbergFormula(n1: number, n2: number): {
    wavelength: number;
    frequency: number;
    energy: number;
    series: string;
  } {
    if (n1 < 1 || n2 <= n1) throw new Error('n2 must be greater than n1, n1 ≥ 1');
    const R = 1.0973731568e7;
    const invLambda = R * (1 / (n1 * n1) - 1 / (n2 * n2));
    const wavelength = 1 / invLambda;
    const frequency = C_LIGHT / wavelength;
    const energy = H_PLANCK * frequency;
    let series: string;
    switch (n1) {
      case 1: series = 'Lyman (UV)'; break;
      case 2: series = 'Balmer (visible)'; break;
      case 3: series = 'Paschen (IR)'; break;
      case 4: series = 'Brackett (IR)'; break;
      case 5: series = 'Pfund (IR)'; break;
      default: series = 'far-IR';
    }
    this._recordHistory(`rydbergFormula: n1=${n1}, n2=${n2} -> λ=${wavelength} m (${series})`);
    return { wavelength, frequency, energy, series };
  }

  /**
   * 玻尔半径与轨道速度：v_n = α c / n
   */
  public bohrOrbit(n: number): { radius: number; velocity: number; period: number } {
    if (n < 1) throw new Error('n must be ≥ 1');
    const radius = A0_BOHR * n * n;
    const alpha = 1 / 137.036; // 精细结构常数
    const velocity = (alpha * C_LIGHT) / n;
    const period = (2 * Math.PI * radius) / velocity;
    this._recordHistory(`bohrOrbit: n=${n} -> r=${radius}, v=${velocity}`);
    return { radius, velocity, period };
  }

  /**
   * 轨道磁矩：μ_L = -μ_B √(l(l+1))
   * Orbital magnetic moment
   */
  public orbitalMagneticMoment(l: number): { magnitude: number; zComponent: number } {
    if (l < 0) throw new Error('l must be non-negative');
    const magnitude = MU_B * Math.sqrt(l * (l + 1));
    const zComponent = -MU_B * l;
    this._recordHistory(`orbitalMagneticMoment: l=${l} -> |μ|=${magnitude}`);
    return { magnitude, zComponent };
  }

  /**
   * 自旋磁矩：μ_S = -g_s μ_B S/ℏ
   */
  public spinMagneticMoment(s: number): { magnitude: number; zComponent: number } {
    if (s < 0) throw new Error('s must be non-negative');
    const g_s = 2.00231930436;
    const magnitude = g_s * MU_B * Math.sqrt(s * (s + 1));
    const zComponent = -g_s * MU_B * s;
    this._recordHistory(`spinMagneticMoment: s=${s} -> |μ|=${magnitude}`);
    return { magnitude, zComponent };
  }

  // ─── 量子谐振子 ───

  /**
   * 量子谐振子：E_n = ℏω(n + 1/2)
   * Quantum harmonic oscillator energy levels
   */
  public quantumHarmonicOscillator(n: number, omega: number): {
    energy: number;
    zeroPoint: number;
  } {
    if (n < 0 || !Number.isInteger(n)) throw new Error('n must be a non-negative integer');
    const zeroPoint = (HBAR * omega) / 2;
    const energy = HBAR * omega * (n + 0.5);
    this._recordHistory(`quantumHarmonicOscillator: n=${n}, ω=${omega} -> E=${energy}`);
    return { energy, zeroPoint };
  }

  /**
   * 谐振子波函数（n=0,1,2,...）
   * Harmonic oscillator wavefunction (simplified, dimensionless)
   */
  public harmonicOscillatorWavefunction(n: number, x: number): number {
    if (n < 0 || !Number.isInteger(n)) throw new Error('n must be a non-negative integer');
    const hermite = this._hermitePolynomial(n, x);
    const norm = 1 / Math.sqrt(Math.pow(2, n) * this._factorial(n) * Math.sqrt(Math.PI));
    const gaussian = Math.exp(-x * x / 2);
    const psi = norm * hermite * gaussian;
    this._recordHistory(`harmonicOscillatorWavefunction: n=${n}, x=${x} -> ψ=${psi}`);
    return psi;
  }

  /**
   * 阶梯算符应用于谐振子
   * a|n> = √n |n-1>, a†|n> = √(n+1) |n+1>
   */
  public harmonicOscillatorLadder(n: number): { lowering: number; raising: number } {
    if (n < 0 || !Number.isInteger(n)) throw new Error('n must be a non-negative integer');
    const lowering = Math.sqrt(n);
    const raising = Math.sqrt(n + 1);
    this._recordHistory(`harmonicOscillatorLadder: n=${n} -> a=${lowering}, a†=${raising}`);
    return { lowering, raising };
  }

  // ─── 势阱与隧穿 ───

  /**
   * 无限深方势阱：E_n = n²π²ℏ²/(2mL²)
   * Particle in a box (infinite well)
   */
  public particleInBox(n: number, L: number, mass: number): {
    energy: number;
    wavelength: number;
    nodes: number;
  } {
    if (n < 1 || !Number.isInteger(n)) throw new Error('n must be a positive integer');
    if (L <= 0 || mass <= 0) throw new Error('L and mass must be positive');
    const energy = (n * n * Math.PI * Math.PI * HBAR * HBAR) / (2 * mass * L * L);
    const wavelength = (2 * L) / n;
    const nodes = n - 1;
    this._recordHistory(`particleInBox: n=${n}, L=${L} -> E=${energy} J`);
    return { energy, wavelength, nodes };
  }

  /**
   * 有限深方势阱（简化估计）
   * Finite square well (approximate)
   */
  public finiteSquareWell(
    depth: number,
    width: number,
    mass: number,
  ): { boundStates: number; groundEnergy: number } {
    if (depth <= 0 || width <= 0 || mass <= 0) {
      throw new Error('Parameters must be positive');
    }
    const z0 = (width / HBAR) * Math.sqrt(2 * mass * depth);
    const boundStates = Math.max(1, Math.floor(z0 / Math.PI) + 1);
    // 简化的基态能量估计
    const groundEnergy = depth * 0.5;
    this._recordHistory(`finiteSquareWell: bound=${boundStates}`);
    return { boundStates, groundEnergy };
  }

  /**
   * 量子隧穿：T ≈ exp(-2 * √(2m(V-E)) * L / ℏ)
   * Quantum tunneling probability (WKB approximation)
   */
  public tunneling(barrier: { height: number; width: number }, energy: number): {
    probability: number;
    klassicallyForbidden: boolean;
  } {
    const { height: V, width: L } = barrier;
    const klassicallyForbidden = energy < V;
    if (!klassicallyForbidden) {
      this._recordHistory(`tunneling: E=${energy} ≥ V=${V} -> above barrier`);
      return { probability: 1, klassicallyForbidden: false };
    }
    const exponent = (-2 * L * Math.sqrt(2 * 9.1093837015e-31 * (V - energy))) / HBAR;
    const probability = Math.exp(exponent);
    this._recordHistory(`tunneling: V=${V}, L=${L}, E=${energy} -> T=${probability}`);
    return { probability, klassicallyForbidden: true };
  }

  /**
   * WKB 量子化条件：∫ √(2m(E-V)) dx = (n + 1/2) π ℏ
   * WKB quantization
   */
  public wkbQuantization(
    integral: number,
    n: number,
  ): { energy: number; valid: boolean } {
    if (n < 0 || !Number.isInteger(n)) throw new Error('n must be a non-negative integer');
    const energy = ((n + 0.5) * Math.PI * HBAR) / Math.max(integral, 1e-30);
    const valid = integral > 0;
    this._recordHistory(`wkbQuantization: n=${n} -> E~${energy}`);
    return { energy, valid };
  }

  // ─── 量子信息与量子门 ───

  /**
   * Bell 态：|Φ+>, |Φ->, |Ψ+>, |Ψ->
   * Bell states (maximally entangled two-qubit states)
   */
  public bellState(): {
    phiPlus: number[];
    phiMinus: number[];
    psiPlus: number[];
    psiMinus: number[];
  } {
    const inv = 1 / Math.sqrt(2);
    const phiPlus = [inv, 0, 0, inv];
    const phiMinus = [inv, 0, 0, -inv];
    const psiPlus = [0, inv, inv, 0];
    const psiMinus = [0, inv, -inv, 0];
    this._recordHistory('bellState: returned four Bell basis states');
    return { phiPlus, phiMinus, psiPlus, psiMinus };
  }

  /**
   * Hadamard 量子门
   * H = (1/√2) [[1,1],[1,-1]]
   */
  public hadamardGate(): QuantumGate {
    const inv = 1 / Math.sqrt(2);
    const matrix = [[inv, inv], [inv, -inv]];
    const gate: QuantumGate = { name: 'H', matrix, qubits: 1, reversible: true };
    this._registerGate(gate);
    return gate;
  }

  /**
   * CNOT 量子门（控制-非）
   */
  public cnotGate(): QuantumGate {
    const matrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 1, 0],
    ];
    const gate: QuantumGate = { name: 'CNOT', matrix, qubits: 2, reversible: true };
    this._registerGate(gate);
    return gate;
  }

  /**
   * Pauli-X 门（量子 NOT 门）
   */
  public pauliXGate(): QuantumGate {
    const matrix = [[0, 1], [1, 0]];
    const gate: QuantumGate = { name: 'X', matrix, qubits: 1, reversible: true };
    this._registerGate(gate);
    return gate;
  }

  /**
   * Pauli-Y 门
   */
  public pauliYGate(): QuantumGate {
    const matrix = [[0, -1], [1, 0]];
    const gate: QuantumGate = { name: 'Y', matrix, qubits: 1, reversible: true };
    this._registerGate(gate);
    return gate;
  }

  /**
   * Pauli-Z 门
   */
  public pauliZGate(): QuantumGate {
    const matrix = [[1, 0], [0, -1]];
    const gate: QuantumGate = { name: 'Z', matrix, qubits: 1, reversible: true };
    this._registerGate(gate);
    return gate;
  }

  /**
   * 相位门 S = diag(1, i)
   */
  public phaseGate(): QuantumGate {
    const matrix = [[1, 0], [0, 0]]; // 实数简化
    const gate: QuantumGate = { name: 'S', matrix, qubits: 1, reversible: true };
    this._registerGate(gate);
    return gate;
  }

  /**
   * T 门 = diag(1, e^(iπ/4))（实数简化）
   */
  public tGate(): QuantumGate {
    const matrix = [[1, 0], [0, Math.SQRT1_2]];
    const gate: QuantumGate = { name: 'T', matrix, qubits: 1, reversible: true };
    this._registerGate(gate);
    return gate;
  }

  /**
   * SWAP 门：交换两个量子比特
   */
  public swapGate(): QuantumGate {
    const matrix = [
      [1, 0, 0, 0],
      [0, 0, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 1],
    ];
    const gate: QuantumGate = { name: 'SWAP', matrix, qubits: 2, reversible: true };
    this._registerGate(gate);
    return gate;
  }

  /**
   * 应用一个量子门到状态
   */
  public applyGate(gate: QuantumGate, state: QuantumState): QuantumState {
    if (gate.matrix.length !== state.ket.length) {
      throw new Error('Gate dimension must match state dimension');
    }
    const newKet = this._matVec(gate.matrix, state.ket);
    const newState: QuantumState = {
      ket: newKet,
      basis: state.basis,
      normalized: state.normalized,
    };
    this._recordHistory(`applyGate: ${gate.name} applied to dim=${state.ket.length}`);
    return newState;
  }

  /**
   * 量子电路模拟：依次应用一系列门
   */
  public quantumCircuit(
    state: QuantumState,
    gates: QuantumGate[],
  ): { finalState: QuantumState; steps: number } {
    let current = state;
    for (const g of gates) {
      current = this.applyGate(g, current);
    }
    this._recordHistory(`quantumCircuit: ${gates.length} gates applied`);
    return { finalState: current, steps: gates.length };
  }

  /**
   * 布洛赫球坐标：从 θ, φ 到 (x, y, z)
   */
  public blochVector(theta: number, phi: number): BlochVector {
    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.sin(theta) * Math.sin(phi);
    const z = Math.cos(theta);
    this._recordHistory(`blochVector: θ=${theta}, φ=${phi}`);
    return { x, y, z, theta, phi };
  }

  /**
   * 密度矩阵：ρ = |ψ><ψ|
   * Density matrix for pure state
   */
  public densityMatrix(state: QuantumState): DensityMatrix {
    const ket = state.ket;
    const matrix: number[][] = [];
    for (let i = 0; i < ket.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < ket.length; j++) {
        row.push((ket[i] ?? 0) * (ket[j] ?? 0));
      }
      matrix.push(row);
    }
    const trace = ket.reduce((acc, c) => acc + c * c, 0);
    const pure = Math.abs(trace - 1) < 1e-9;
    this._recordHistory(`densityMatrix: dim=${ket.length}, pure=${pure}`);
    return { matrix, pure, trace };
  }

  /**
   * von Neumann 熵：S = -Tr(ρ log ρ)
   * (对纯态为 0，对混合态 > 0)
   */
  public vonNeumannEntropy(eigenvalues: number[]): number {
    let entropy = 0;
    for (const lambda of eigenvalues) {
      if (lambda > 1e-12) {
        entropy -= lambda * Math.log2(lambda);
      }
    }
    this._recordHistory(`vonNeumannEntropy: S=${entropy} bits`);
    return entropy;
  }

  /**
   * 量子比特纯度：Tr(ρ²)
   */
  public purity(matrix: number[][]): number {
    let p = 0;
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix.length; j++) {
        p += (matrix[i]?.[j] ?? 0) * (matrix[j]?.[i] ?? 0);
      }
    }
    this._recordHistory(`purity: Tr(ρ²)=${p}`);
    return p;
  }

  // ─── 纠缠与贝尔不等式 ───

  /**
   * 双缝实验：d * sin(θ) = m * λ
   * Double-slit interference
   */
  public doubleSlit(wavelength: number, slitDistance: number): {
    fringeSpacing: number;
    firstOrderAngle: number;
  } {
    if (wavelength <= 0 || slitDistance <= 0) {
      throw new Error('Wavelength and slit distance must be positive');
    }
    const firstOrderAngle = Math.asin(Math.min(1, wavelength / slitDistance));
    const fringeSpacing = wavelength / slitDistance;
    this._recordHistory(
      `doubleSlit: λ=${wavelength}, d=${slitDistance} -> θ_1=${firstOrderAngle}`,
    );
    return { fringeSpacing, firstOrderAngle };
  }

  /**
   * 斯特恩-盖拉赫实验：自旋在梯度磁场中分裂
   * Stern-Gerlach experiment
   */
  public sternGerlach(spin: number, fieldGradient: number): {
    deflection: number;
    split: number;
  } {
    const magneticMoment = (spin * 9.274009994e-24) / 2;
    const deflection = magneticMoment * fieldGradient;
    const split = 2 * Math.abs(deflection);
    this._recordHistory(`sternGerlach: spin=${spin}, ∂B/∂z=${fieldGradient} -> Δ=${split}`);
    return { deflection, split };
  }

  /**
   * 玻恩规则：P = |<ψ|φ>|^2
   * Born rule for measurement probability
   */
  public bornRule(amplitude: number): { probability: number; amplitude: number } {
    const probability = Math.abs(amplitude) * Math.abs(amplitude);
    this._recordHistory(`bornRule: amp=${amplitude} -> P=${probability}`);
    return { probability, amplitude };
  }

  /**
   * 叠加态：|ψ> = Σ c_i |φ_i>
   * Superposition of basis states
   */
  public superposition(states: number[][], coefficients: number[]): QuantumState {
    if (states.length !== coefficients.length) {
      throw new Error('Number of states and coefficients must match');
    }
    const dim = states[0]?.length ?? 0;
    const ket: number[] = new Array(dim).fill(0);
    for (let i = 0; i < states.length; i++) {
      const s = states[i] ?? [];
      for (let j = 0; j < dim; j++) {
        ket[j] = (ket[j] ?? 0) + (coefficients[i] ?? 0) * (s[j] ?? 0);
      }
    }
    const norm = Math.sqrt(ket.reduce((acc, c) => acc + c * c, 0));
    const normalized = norm > 0 ? ket.map(c => c / norm) : ket;
    const state: QuantumState = {
      ket: normalized,
      basis: states.map((_, i) => `|${i}>`),
      normalized: norm > 0,
    };
    const id = this._generateId();
    this._states.set(id, { id, state, timestamp: Date.now() });
    this._recordHistory(`superposition: combined ${states.length} states`);
    return state;
  }

  /**
   * 纠缠：|Ψ> = Σ c_ij |i>_A |j>_B
   * Entanglement of two quantum systems
   */
  public entanglement(stateA: QuantumState, stateB: QuantumState): {
    tensor: number[];
    dimension: number;
  } {
    const tensor: number[] = [];
    for (const a of stateA.ket) {
      for (const b of stateB.ket) {
        tensor.push(a * b);
      }
    }
    const dimension = stateA.ket.length * stateB.ket.length;
    this._recordHistory(`entanglement: dim_A=${stateA.ket.length}, dim_B=${stateB.ket.length}`);
    return { tensor, dimension };
  }

  /**
   * 纠缠度（简化 von Neumann 熵估计）
   * Entanglement entropy
   */
  public entanglementEntropy(stateA: QuantumState, stateB: QuantumState): number {
    void stateB;
    const probs = stateA.ket.map(c => c * c);
    let S = 0;
    for (const p of probs) {
      if (p > 1e-12) S -= p * Math.log2(p);
    }
    this._recordHistory(`entanglementEntropy: S=${S} bits`);
    return S;
  }

  /**
   * CHSH 不等式
   * Classical bound: |S| ≤ 2; Quantum bound: |S| ≤ 2√2
   */
  public chshInequality(
    a: number, aPrime: number,
    b: number, bPrime: number,
  ): BellInequality {
    // 简化：使用角度参数计算
    const E = (x: number, y: number) => Math.cos(2 * (x - y));
    const S = Math.abs(E(a, b) - E(a, bPrime) + E(aPrime, b) + E(aPrime, bPrime));
    const classical = 2;
    const quantum = 2 * Math.SQRT2;
    const violated = S > classical;
    this._recordHistory(`chshInequality: S=${S}, violated=${violated}`);
    return { chsh: S, classical, quantum, violated };
  }

  /**
   * 量子隐形传态（简化协议描述）
   * Quantum teleportation
   */
  public quantumTeleportation(state: QuantumState): {
    classicalBits: string[];
    recovered: number[];
    success: boolean;
  } {
    const classicalBits = ['00', '01', '10', '11'];
    const idx = Math.floor(Math.random() * 4);
    const recovered = state.ket.slice();
    this._recordHistory(`quantumTeleportation: bits=${classicalBits[idx]}`);
    return { classicalBits, recovered, success: true };
  }

  /**
   * 超密编码（简化）
   * Superdense coding: 1 qubit carries 2 classical bits
   */
  public superdenseCoding(): {
    bitsSent: number;
    qubitsTransmitted: number;
    efficiency: number;
  } {
    const bitsSent = 2;
    const qubitsTransmitted = 1;
    const efficiency = bitsSent / qubitsTransmitted;
    this._recordHistory(`superdenseCoding: ${bitsSent} bits via ${qubitsTransmitted} qubit`);
    return { bitsSent, qubitsTransmitted, efficiency };
  }

  // ─── 测量与演化 ───

  /**
   * 测量：观测可观测量导致波函数坍缩
   * Measurement collapses the wavefunction onto an eigenstate
   */
  public measurement(state: QuantumState, observable: Observable): {
    outcome: number;
    collapsedState: QuantumState;
  } {
    if (observable.eigenvalues.length === 0) {
      throw new Error('Observable must have eigenvalues');
    }
    const idx = Math.floor(Math.random() * observable.eigenvalues.length);
    const outcome = observable.eigenvalues[idx] ?? 0;
    const collapsedKet = new Array(state.ket.length).fill(0);
    collapsedKet[idx % state.ket.length] = 1;
    const collapsedState: QuantumState = {
      ket: collapsedKet,
      basis: state.basis,
      normalized: true,
    };
    const id = this._generateId();
    this._measurements.set(id, {
      id,
      state,
      observable,
      outcome,
      timestamp: Date.now(),
    });
    this._recordHistory(`measurement: outcome=${outcome} of ${observable.label}`);
    return { outcome, collapsedState };
  }

  /**
   * 投影测量：P(m) = <ψ_m|ψ>
   * Projective measurement
   */
  public projectiveMeasurement(state: QuantumState, basisIndex: number): {
    probability: number;
    outcome: QuantumState;
  } {
    if (basisIndex < 0 || basisIndex >= state.ket.length) {
      throw new Error('Invalid basis index');
    }
    const amplitude = state.ket[basisIndex] ?? 0;
    const probability = amplitude * amplitude;
    const ket = new Array(state.ket.length).fill(0);
    ket[basisIndex] = 1;
    const outcome: QuantumState = {
      ket,
      basis: state.basis,
      normalized: true,
    };
    this._recordHistory(`projectiveMeasurement: idx=${basisIndex}, P=${probability}`);
    return { probability, outcome };
  }

  /**
   * 幺正演化：|ψ'> = U |ψ>
   * Unitary evolution of a quantum state
   */
  public unitaryEvolution(U: number[][], state: QuantumState): QuantumState {
    if (U.length !== state.ket.length) {
      throw new Error('Unitary dimension must match state dimension');
    }
    const newKet: number[] = new Array(state.ket.length).fill(0);
    for (let i = 0; i < U.length; i++) {
      const row = U[i] ?? [];
      for (let j = 0; j < state.ket.length; j++) {
        newKet[i] = (newKet[i] ?? 0) + (row[j] ?? 0) * (state.ket[j] ?? 0);
      }
    }
    const evolved: QuantumState = {
      ket: newKet,
      basis: state.basis,
      normalized: state.normalized,
    };
    this._recordHistory(`unitaryEvolution: dim=${state.ket.length}`);
    return evolved;
  }

  /**
   * 时间演化算符：U(t) = exp(-iHt/ℏ)
   * Time evolution operator (formal)
   */
  public timeEvolutionOperator(
    hamiltonian: number[][],
    t: number,
  ): { matrix: number[][]; dim: number } {
    const n = hamiltonian.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      const e = hamiltonian[i]?.[i] ?? 0;
      matrix[i][i] = Math.cos((e * t) / HBAR);
    }
    this._recordHistory(`timeEvolutionOperator: dim=${n}, t=${t}`);
    return { matrix, dim: n };
  }

  // ─── 微扰与近似方法 ───

  /**
   * 一阶微扰能量修正：E_n^(1) = <n|H'|n>
   */
  public firstOrderPerturbation(
    unperturbedEnergy: number,
    perturbation: number,
  ): PerturbationResult {
    const firstOrder = perturbation;
    const secondOrder = 0;
    const total = unperturbedEnergy + firstOrder;
    this._recordHistory(`firstOrderPerturbation: E=${unperturbedEnergy}+${firstOrder}`);
    return { firstOrder, secondOrder, total };
  }

  /**
   * 二阶微扰能量修正：E_n^(2) = Σ |<k|H'|n>|² / (E_n - E_k)
   */
  public secondOrderPerturbation(
    unperturbedEnergy: number,
    firstOrder: number,
    matrixElements: Array<{ energy: number; element: number }>,
  ): PerturbationResult {
    let secondOrder = 0;
    for (const m of matrixElements) {
      const denom = unperturbedEnergy - m.energy;
      if (Math.abs(denom) > 1e-12) {
        secondOrder += (m.element * m.element) / denom;
      }
    }
    const total = unperturbedEnergy + firstOrder + secondOrder;
    this._recordHistory(`secondOrderPerturbation: E=${unperturbedEnergy}+${firstOrder}+${secondOrder}`);
    return { firstOrder, secondOrder, total };
  }

  /**
   * 变分法：E[ψ] = <ψ|H|ψ> / <ψ|ψ>
   * Variational method
   */
  public variationalMethod(
    trialState: number[],
    hamiltonian: number[][],
  ): { energy: number; normalized: boolean } {
    const dim = trialState.length;
    if (hamiltonian.length !== dim) {
      throw new Error('Hamiltonian dimension must match trial state');
    }
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < dim; i++) {
      denominator += (trialState[i] ?? 0) * (trialState[i] ?? 0);
      const row = hamiltonian[i] ?? [];
      let hPsi = 0;
      for (let j = 0; j < dim; j++) {
        hPsi += (row[j] ?? 0) * (trialState[j] ?? 0);
      }
      numerator += (trialState[i] ?? 0) * hPsi;
    }
    const energy = denominator > 1e-30 ? numerator / denominator : 0;
    this._recordHistory(`variationalMethod: E=${energy}`);
    return { energy, normalized: Math.abs(denominator - 1) < 1e-9 };
  }

  // ─── 散射理论 ───

  /**
   * 玻恩近似散射振幅
   * Born approximation scattering amplitude (simplified)
   */
  public bornApproximation(
    potentialStrength: number,
    k: number,
    mass: number,
  ): { amplitude: number; crossSection: number } {
    const amplitude = (-mass * potentialStrength) / (2 * Math.PI * HBAR * HBAR);
    const crossSection = 4 * Math.PI * amplitude * amplitude;
    void k;
    this._recordHistory(`bornApproximation: f=${amplitude}, σ=${crossSection}`);
    return { amplitude, crossSection };
  }

  /**
   * 卢瑟福散射截面：dσ/dΩ = (Z1 Z2 e² / (16π ε0 E))² * 1/sin⁴(θ/2)
   * Rutherford scattering
   */
  public rutherfordScattering(
    Z1: number,
    Z2: number,
    kineticEnergy: number,
    angle: number,
  ): { differentialCrossSection: number } {
    if (kineticEnergy <= 0) throw new Error('Kinetic energy must be positive');
    if (angle <= 0 || angle >= Math.PI) throw new Error('Angle must be in (0, π)');
    const factor = (Z1 * Z2 * E_CHARGE * E_CHARGE) / (16 * Math.PI * EPSILON_0 * kineticEnergy);
    const sinHalf = Math.sin(angle / 2);
    const differentialCrossSection = (factor * factor) / Math.pow(sinHalf, 4);
    this._recordHistory(`rutherfordScattering: Z1=${Z1}, Z2=${Z2} -> dσ/dΩ=${differentialCrossSection}`);
    return { differentialCrossSection };
  }

  // ─── 统计与全同性 ───

  /**
   * Fermi-Dirac 分布：f(E) = 1 / (exp((E-μ)/kT) + 1)
   */
  public fermiDiracDistribution(energy: number, mu: number, T: number): number {
    if (T <= 0) throw new Error('Temperature must be positive');
    const x = (energy - mu) / (K_B * T);
    const f = 1 / (Math.exp(x) + 1);
    this._recordHistory(`fermiDiracDistribution: E=${energy}, μ=${mu}, T=${T} -> f=${f}`);
    return f;
  }

  /**
   * Bose-Einstein 分布：n(E) = 1 / (exp((E-μ)/kT) - 1)
   */
  public boseEinsteinDistribution(energy: number, mu: number, T: number): number {
    if (T <= 0) throw new Error('Temperature must be positive');
    const x = (energy - mu) / (K_B * T);
    if (x < 1e-12) return Infinity;
    const n = 1 / (Math.exp(x) - 1);
    this._recordHistory(`boseEinsteinDistribution: E=${energy}, μ=${mu}, T=${T} -> n=${n}`);
    return n;
  }

  /**
   * 黑体辐射 Planck 谱（能量密度，简化）
   */
  public planckSpectralDensity(frequency: number, T: number): number {
    if (frequency <= 0 || T <= 0) return 0;
    const x = (H_PLANCK * frequency) / (K_B * T);
    const u = (8 * Math.PI * H_PLANCK * frequency * frequency * frequency) / (C_LIGHT ** 3);
    return u / (Math.exp(x) - 1);
  }

  // ─── 几何相位与拓扑 ───

  /**
   * Berry 相位：γ = ∮ A·dl
   * Berry phase (formal)
   */
  public berryPhase(loop: number[][]): number {
    // 简化：对路径积分的离散估计
    let gamma = 0;
    for (let i = 0; i < loop.length; i++) {
      const p1 = loop[i] ?? [0, 0];
      const p2 = loop[(i + 1) % loop.length] ?? [0, 0];
      gamma += (p1[0] ?? 0) * (p2[1] ?? 0) - (p2[0] ?? 0) * (p1[1] ?? 0);
    }
    gamma = 0.5 * gamma;
    this._recordHistory(`berryPhase: γ=${gamma}`);
    return gamma;
  }

  /**
   * Aharonov-Bohm 效应：相位偏移 = (e/ℏ) ∮ A·dl
   */
  public aharonovBohmPhase(
    magneticFlux: number,
    fluxQuantum: number = H_PLANCK / E_CHARGE,
  ): { phase: number; observable: boolean } {
    const phase = (2 * Math.PI * magneticFlux) / fluxQuantum;
    const observable = Math.abs(phase % (2 * Math.PI)) > 1e-6;
    this._recordHistory(`aharonovBohmPhase: φ=${phase}, observable=${observable}`);
    return { phase, observable };
  }

  // ─── 路径积分 ───

  /**
   * Feynman 路径积分（简化）
   * Path integral as sum over classical paths
   */
  public pathIntegral(
    paths: Array<{ action: number; weight: number }>,
  ): { amplitude: number; probability: number } {
    let re = 0;
    let im = 0;
    for (const p of paths) {
      const phase = p.action / HBAR;
      re += p.weight * Math.cos(phase);
      im += p.weight * Math.sin(phase);
    }
    const amplitude = Math.sqrt(re * re + im * im);
    const probability = amplitude * amplitude;
    this._recordHistory(`pathIntegral: ${paths.length} paths -> |A|=${amplitude}`);
    return { amplitude, probability };
  }

  /**
   * 自由粒子传播子（简化）：K = √(m/(2πiℏt)) exp(im(x-x')²/(2ℏt))
   */
  public freeParticlePropagator(
    mass: number,
    t: number,
    x: number,
    xPrime: number,
  ): number {
    if (t <= 0 || mass <= 0) throw new Error('t and mass must be positive');
    const dx = x - xPrime;
    const prefactor = Math.sqrt(mass / (2 * Math.PI * HBAR * t));
    const phase = (mass * dx * dx) / (2 * HBAR * t);
    const K = prefactor * Math.cos(phase); // 实部简化
    this._recordHistory(`freeParticlePropagator: K=${K}`);
    return K;
  }

  // ─── 量子热力学 ───

  /**
   * 量子配分函数：Z = Σ exp(-E_n / kT)
   */
  public quantumPartitionFunction(energies: number[], T: number): number {
    if (T <= 0) throw new Error('Temperature must be positive');
    let Z = 0;
    for (const E of energies) {
      Z += Math.exp(-E / (K_B * T));
    }
    this._recordHistory(`quantumPartitionFunction: Z=${Z}`);
    return Z;
  }

  /**
   * 量子平均能量：<E> = Σ E_n exp(-E_n/kT) / Z
   */
  public quantumAverageEnergy(energies: number[], T: number): number {
    if (T <= 0) throw new Error('Temperature must be positive');
    let num = 0;
    let den = 0;
    for (const E of energies) {
      const w = Math.exp(-E / (K_B * T));
      num += E * w;
      den += w;
    }
    const avg = den > 0 ? num / den : 0;
    this._recordHistory(`quantumAverageEnergy: <E>=${avg}`);
    return avg;
  }

  // ─── 序列化与重置 ───

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    states: number;
    observables: number;
    measurements: number;
    gates: number;
    history: string[];
  }> {
    return {
      id: `qm-${Date.now()}-${this._counter}`,
      payload: {
        states: this._states.size,
        observables: this._observables.size,
        measurements: this._measurements.size,
        gates: this._gates.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['physics', 'quantum'],
        priority: 0.95,
        phase: 'analysis',
      },
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._states.clear();
    this._observables.clear();
    this._measurements.clear();
    this._gates.clear();
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _generateId(): string {
    return `qm-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  private _registerGate(gate: QuantumGate): void {
    const id = this._generateId();
    this._gates.set(id, { id, gate, timestamp: Date.now() });
    if (this._gates.size > 200) {
      const firstKey = this._gates.keys().next().value;
      if (firstKey !== undefined) this._gates.delete(firstKey);
    }
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _matMul(A: number[][], B: number[][]): number[][] {
    const n = A.length;
    const m = B[0]?.length ?? 0;
    const p = B.length;
    const result: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        let sum = 0;
        for (let k = 0; k < p; k++) {
          sum += (A[i]?.[k] ?? 0) * (B[k]?.[j] ?? 0);
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  private _matVec(A: number[][], v: number[]): number[] {
    const n = A.length;
    const result: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const row = A[i] ?? [];
      let sum = 0;
      for (let j = 0; j < v.length; j++) {
        sum += (row[j] ?? 0) * (v[j] ?? 0);
      }
      result[i] = sum;
    }
    return result;
  }

  private _hermitePolynomial(n: number, x: number): number {
    if (n === 0) return 1;
    if (n === 1) return 2 * x;
    let h0 = 1;
    let h1 = 2 * x;
    let hn = 0;
    for (let k = 2; k <= n; k++) {
      hn = 2 * x * h1 - 2 * (k - 1) * h0;
      h0 = h1;
      h1 = hn;
    }
    return hn;
  }

  private _factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  /** 暴露约化普朗克常数。 */
  public static readonly HBAR = HBAR;
  /** 暴露普朗克常数。 */
  public static readonly H = H_PLANCK;
  /** 暴露玻尔半径。 */
  public static readonly BOHR_RADIUS = A0_BOHR;
  /** 暴露电子质量。 */
  public static readonly M_E = M_E;
  /** 暴露玻尔磁子。 */
  public static readonly MU_B = MU_B;
  /** 暴露玻尔兹曼常数。 */
  public static readonly K_B = K_B;
}
