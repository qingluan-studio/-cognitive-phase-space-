/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 量子力学 —— 叠加与纠缠的迷雾
 * Quantum Mechanics: The Mist of Superposition and Entanglement
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从薛定谔方程到贝尔不等式，量子力学颠覆了经典直觉。
 * 波函数在希尔伯特空间中演化，测量则令其不可逆地坍缩，而纠缠编织出非局域的关联。
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

/** 约化普朗克常数 ℏ (J·s)。 */
const HBAR = 1.054571817e-34;
/** 普朗克常数 h (J·s)。 */
const H_PLANCK = 6.62607015e-34;
/** 玻尔半径 a_0 (m)。 */
const A0_BOHR = 5.29177210903e-11;
/** 电子伏特到焦耳换算。 */
const EV = 1.602176634e-19;

export class QuantumMechanics {
  private _states: Map<string, StateRecord> = new Map();
  private _observables: Map<string, ObservableRecord> = new Map();
  private _measurements: Map<string, MeasurementRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get stateCount(): number { return this._states.size; }
  get observableCount(): number { return this._observables.size; }
  get measurementCount(): number { return this._measurements.size; }
  get history(): string[] { return [...this._history]; }

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
   * 贝尔态：|Φ+>, |Φ->, |Ψ+>, |Ψ->
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
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    states: number;
    observables: number;
    measurements: number;
    history: string[];
  }> {
    return {
      id: `qm-${Date.now()}-${this._counter}`,
      payload: {
        states: this._states.size,
        observables: this._observables.size,
        measurements: this._measurements.size,
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
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _generateId(): string {
    return `qm-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  /** 暴露约化普朗克常数。 */
  public static readonly HBAR = HBAR;
  /** 暴露普朗克常数。 */
  public static readonly H = H_PLANCK;
  /** 暴露玻尔半径。 */
  public static readonly BOHR_RADIUS = A0_BOHR;
}
