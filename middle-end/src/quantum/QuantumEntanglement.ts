export interface EntanglementPair {
  particleA: ComplexVector;
  particleB: ComplexVector;
  correlation: number;
}

export interface ComplexVector {
  real: number[];
  imag: number[];
}

export interface BellState {
  name: string;
  amplitudes: ComplexVector;
  fidelity: number;
}

export class QuantumEntanglement {
  private _alpha: number;
  private _beta: number;
  private _gamma: number;
  private _delta: number;
  private _entanglementEntropy: number;
  private _concurrence: number;
  private _history: EntanglementPair[];
  private _bellStates: BellState[];
  private _dimension: number;
  private _measurementBasis: string;

  constructor(dimension: number = 2) {
    this._alpha = 1 / Math.sqrt(2);
    this._beta = 0;
    this._gamma = 0;
    this._delta = 1 / Math.sqrt(2);
    this._entanglementEntropy = 0;
    this._concurrence = 0;
    this._history = [];
    this._dimension = dimension;
    this._measurementBasis = 'computational';
    this._bellStates = this._initializeBellStates();
  }

  get alpha(): number {
    return this._alpha;
  }

  get beta(): number {
    return this._beta;
  }

  get gamma(): number {
    return this._gamma;
  }

  get delta(): number {
    return this._delta;
  }

  get entanglementEntropy(): number {
    return this._entanglementEntropy;
  }

  get concurrence(): number {
    return this._concurrence;
  }

  private _initializeBellStates(): BellState[] {
    const invSqrt2 = 1 / Math.sqrt(2);
    return [
      {
        name: 'PhiPlus',
        amplitudes: { real: [invSqrt2, 0, 0, invSqrt2], imag: [0, 0, 0, 0] },
        fidelity: 1,
      },
      {
        name: 'PhiMinus',
        amplitudes: { real: [invSqrt2, 0, 0, -invSqrt2], imag: [0, 0, 0, 0] },
        fidelity: 1,
      },
      {
        name: 'PsiPlus',
        amplitudes: { real: [0, invSqrt2, invSqrt2, 0], imag: [0, 0, 0, 0] },
        fidelity: 1,
      },
      {
        name: 'PsiMinus',
        amplitudes: { real: [0, invSqrt2, -invSqrt2, 0], imag: [0, 0, 0, 0] },
        fidelity: 1,
      },
    ];
  }

  public setState(alpha: number, beta: number, gamma: number, delta: number): void {
    const norm = Math.sqrt(alpha * alpha + beta * beta + gamma * gamma + delta * delta);
    if (norm === 0) return;
    this._alpha = alpha / norm;
    this._beta = beta / norm;
    this._gamma = gamma / norm;
    this._delta = delta / norm;
    this._computeEntanglementEntropy();
    this._computeConcurrence();
  }

  private _computeEntanglementEntropy(): void {
    const a = this._alpha;
    const b = this._beta;
    const c = this._gamma;
    const d = this._delta;
    const rho11 = a * a + b * b;
    const rho22 = c * c + d * d;
    const s1 = rho11 > 0 ? -rho11 * Math.log2(rho11) : 0;
    const s2 = rho22 > 0 ? -rho22 * Math.log2(rho22) : 0;
    this._entanglementEntropy = s1 + s2;
  }

  private _computeConcurrence(): void {
    const a = this._alpha;
    const b = this._beta;
    const c = this._gamma;
    const d = this._delta;
    const R1 = a * d - b * c;
    const R2 = a * d - b * c;
    const R3 = a * d - b * c;
    const R4 = a * d - b * c;
    const R = Math.sqrt(Math.abs(R1 * R2 * R3 * R4));
    this._concurrence = 2 * Math.abs(R);
  }

  public generateBellState(stateName: string): ComplexVector {
    const state = this._bellStates.find(s => s.name === stateName);
    if (!state) {
      return { real: [1, 0, 0, 0], imag: [0, 0, 0, 0] };
    }
    this.setState(
      state.amplitudes.real[0],
      state.amplitudes.real[1],
      state.amplitudes.real[2],
      state.amplitudes.real[3]
    );
    return { ...state.amplitudes };
  }

  public measureParticleA(outcome: number): ComplexVector {
    if (outcome !== 0 && outcome !== 1) return { real: [0, 0, 0, 0], imag: [0, 0, 0, 0] };
    const projected: ComplexVector = { real: [0, 0, 0, 0], imag: [0, 0, 0, 0] };
    if (outcome === 0) {
      projected.real[0] = this._alpha;
      projected.real[1] = this._beta;
      projected.imag[0] = 0;
      projected.imag[1] = 0;
    } else {
      projected.real[2] = this._gamma;
      projected.real[3] = this._delta;
      projected.imag[2] = 0;
      projected.imag[3] = 0;
    }
    const norm = Math.sqrt(
      projected.real.reduce((sum, v) => sum + v * v, 0) +
      projected.imag.reduce((sum, v) => sum + v * v, 0)
    );
    if (norm > 0) {
      projected.real = projected.real.map(v => v / norm);
      projected.imag = projected.imag.map(v => v / norm);
    }
    return projected;
  }

  public measureParticleB(outcome: number): ComplexVector {
    if (outcome !== 0 && outcome !== 1) return { real: [0, 0, 0, 0], imag: [0, 0, 0, 0] };
    const projected: ComplexVector = { real: [0, 0, 0, 0], imag: [0, 0, 0, 0] };
    if (outcome === 0) {
      projected.real[0] = this._alpha;
      projected.real[2] = this._gamma;
    } else {
      projected.real[1] = this._beta;
      projected.real[3] = this._delta;
    }
    const norm = Math.sqrt(projected.real.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      projected.real = projected.real.map(v => v / norm);
    }
    return projected;
  }

  public computeSchmidtCoefficients(): number[] {
    const a = this._alpha;
    const b = this._beta;
    const c = this._gamma;
    const d = this._delta;
    const M11 = a * a + b * b;
    const M12 = a * c + b * d;
    const M21 = a * c + b * d;
    const M22 = c * c + d * d;
    const trace = M11 + M22;
    const det = M11 * M22 - M12 * M21;
    const discriminant = trace * trace - 4 * det;
    if (discriminant < 0) return [Math.sqrt(trace / 2), Math.sqrt(trace / 2)];
    const lambda1 = (trace + Math.sqrt(discriminant)) / 2;
    const lambda2 = (trace - Math.sqrt(discriminant)) / 2;
    return [Math.sqrt(Math.max(0, lambda1)), Math.sqrt(Math.max(0, lambda2))];
  }

  public computeCorrelationFunction(thetaA: number, thetaB: number): number {
    const cosA = Math.cos(thetaA);
    const sinA = Math.sin(thetaA);
    const cosB = Math.cos(thetaB);
    const sinB = Math.sin(thetaB);
    const a = this._alpha;
    const b = this._beta;
    const c = this._gamma;
    const d = this._delta;
    const expPlus = a * d + b * c;
    const expMinus = a * d - b * c;
    const classical = cosA * cosB;
    const quantum = classical + sinA * sinB * (expPlus + expMinus);
    return quantum;
  }

  public recordEntanglementPair(): EntanglementPair {
    const pair: EntanglementPair = {
      particleA: { real: [this._alpha, this._beta], imag: [0, 0] },
      particleB: { real: [this._gamma, this._delta], imag: [0, 0] },
      correlation: this._concurrence,
    };
    this._history.push(pair);
    if (this._history.length > 200) this._history.shift();
    return pair;
  }

  public getEntanglementHistory(): EntanglementPair[] {
    return this._history.map(h => ({
      particleA: { ...h.particleA },
      particleB: { ...h.particleB },
      correlation: h.correlation,
    }));
  }

  public isEntangled(threshold: number = 0.01): boolean {
    return this._concurrence > threshold;
  }

  public performUnitaryTransform(matrix: number[][]): void {
    if (matrix.length !== 4 || matrix.some(row => row.length !== 4)) return;
    const vec = [this._alpha, this._beta, this._gamma, this._delta];
    const newVec = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        newVec[i] += matrix[i][j] * vec[j];
      }
    }
    this.setState(newVec[0], newVec[1], newVec[2], newVec[3]);
  }

  public reset(): void {
    this._alpha = 1 / Math.sqrt(2);
    this._beta = 0;
    this._gamma = 0;
    this._delta = 1 / Math.sqrt(2);
    this._entanglementEntropy = 0;
    this._concurrence = 0;
    this._history = [];
    this._measurementBasis = 'computational';
  }
}
