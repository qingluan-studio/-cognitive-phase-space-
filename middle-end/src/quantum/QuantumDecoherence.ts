export interface DensityMatrix {
  real: number[][];
  imag: number[][];
}

export interface DecoherenceRecord {
  timestamp: number;
  offDiagonalDecay: number;
  pointerStateIndex: number;
  environmentEntropy: number;
}

export class QuantumDecoherence {
  private _densityMatrix: DensityMatrix;
  private _dimension: number;
  private _environmentCoupling: number;
  private _pointerStates: number[][];
  private _decoherenceTime: number;
  private _elapsedTime: number;
  private _history: DecoherenceRecord[];
  private _environmentStates: number;
  private _thermalEnergy: number;
  private _cutoffFrequency: number;

  constructor(dimension: number = 2) {
    this._dimension = Math.max(2, dimension);
    this._densityMatrix = this._initializePureState();
    this._environmentCoupling = 0.01;
    this._pointerStates = this._initializePointerStates();
    this._decoherenceTime = 100;
    this._elapsedTime = 0;
    this._history = [];
    this._environmentStates = 1000;
    this._thermalEnergy = 0.025;
    this._cutoffFrequency = 1.0;
  }

  get dimension(): number {
    return this._dimension;
  }

  get environmentCoupling(): number {
    return this._environmentCoupling;
  }

  get decoherenceTime(): number {
    return this._decoherenceTime;
  }

  get elapsedTime(): number {
    return this._elapsedTime;
  }

  private _initializePureState(): DensityMatrix {
    const real: number[][] = [];
    const imag: number[][] = [];
    for (let i = 0; i < this._dimension; i++) {
      const rowR: number[] = [];
      const rowI: number[] = [];
      for (let j = 0; j < this._dimension; j++) {
        if (i === 0 && j === 0) {
          rowR.push(0.5);
          rowI.push(0);
        } else if (i === 1 && j === 1) {
          rowR.push(0.5);
          rowI.push(0);
        } else if ((i === 0 && j === 1) || (i === 1 && j === 0)) {
          rowR.push(0.5);
          rowI.push(0);
        } else {
          rowR.push(i === j ? 1 / this._dimension : 0);
          rowI.push(0);
        }
      }
      real.push(rowR);
      imag.push(rowI);
    }
    return { real, imag };
  }

  private _initializePointerStates(): number[][] {
    const states: number[][] = [];
    for (let i = 0; i < this._dimension; i++) {
      const state = new Array(this._dimension).fill(0);
      state[i] = 1;
      states.push(state);
    }
    return states;
  }

  public setDensityMatrix(matrix: DensityMatrix): void {
    if (matrix.real.length !== this._dimension || matrix.imag.length !== this._dimension) return;
    this._densityMatrix = {
      real: matrix.real.map(row => [...row]),
      imag: matrix.imag.map(row => [...row]),
    };
    this._ensureTraceOne();
  }

  private _ensureTraceOne(): void {
    let trace = 0;
    for (let i = 0; i < this._dimension; i++) {
      trace += this._densityMatrix.real[i][i];
    }
    if (trace === 0) return;
    const scale = 1 / trace;
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        this._densityMatrix.real[i][j] *= scale;
        this._densityMatrix.imag[i][j] *= scale;
      }
    }
  }

  public computePurity(): number {
    let purity = 0;
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        const rho_ij = this._densityMatrix.real[i][j];
        const rho_ji = this._densityMatrix.real[j][i];
        const im_ij = this._densityMatrix.imag[i][j];
        const im_ji = this._densityMatrix.imag[j][i];
        purity += rho_ij * rho_ji - im_ij * im_ji;
      }
    }
    return Math.min(1, Math.max(0, purity));
  }

  public computeVonNeumannEntropy(): number {
    const eigenvalues = this._approximateEigenvalues();
    let entropy = 0;
    for (const lambda of eigenvalues) {
      if (lambda > 1e-10) {
        entropy -= lambda * Math.log2(lambda);
      }
    }
    return entropy;
  }

  private _approximateEigenvalues(): number[] {
    const vals: number[] = [];
    for (let i = 0; i < this._dimension; i++) {
      vals.push(Math.max(0, this._densityMatrix.real[i][i]));
    }
    const sum = vals.reduce((a, b) => a + b, 0);
    if (sum === 0) return vals.map(() => 1 / this._dimension);
    return vals.map(v => v / sum);
  }

  public computeOffDiagonalNorm(): number {
    let norm = 0;
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        if (i !== j) {
          const re = this._densityMatrix.real[i][j];
          const im = this._densityMatrix.imag[i][j];
          norm += re * re + im * im;
        }
      }
    }
    return Math.sqrt(norm);
  }

  public tick(dt: number): void {
    this._elapsedTime += dt;
    const decayFactor = Math.exp(-this._environmentCoupling * dt);
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        if (i !== j) {
          this._densityMatrix.real[i][j] *= decayFactor;
          this._densityMatrix.imag[i][j] *= decayFactor;
        }
      }
    }
    this._ensureTraceOne();
    const offDiag = this.computeOffDiagonalNorm();
    const pointer = this._findDominantPointerState();
    const envEntropy = this.computeVonNeumannEntropy();
    const record: DecoherenceRecord = {
      timestamp: Date.now(),
      offDiagonalDecay: offDiag,
      pointerStateIndex: pointer,
      environmentEntropy: envEntropy,
    };
    this._history.push(record);
    if (this._history.length > 200) this._history.shift();
  }

  private _findDominantPointerState(): number {
    let maxProb = -1;
    let index = 0;
    for (let i = 0; i < this._dimension; i++) {
      const prob = this._densityMatrix.real[i][i];
      if (prob > maxProb) {
        maxProb = prob;
        index = i;
      }
    }
    return index;
  }

  public getPointerStates(): number[][] {
    return this._pointerStates.map(s => [...s]);
  }

  public setPointerState(index: number, state: number[]): void {
    if (index < 0 || index >= this._dimension) return;
    if (state.length !== this._dimension) return;
    let norm = 0;
    for (const a of state) norm += a * a;
    if (norm === 0) return;
    const scale = 1 / Math.sqrt(norm);
    this._pointerStates[index] = state.map(a => a * scale);
  }

  public getReducedDensityMatrix(subsystemIndices: number[]): DensityMatrix {
    const subDim = subsystemIndices.length;
    const real: number[][] = [];
    const imag: number[][] = [];
    for (let i = 0; i < subDim; i++) {
      const rowR: number[] = [];
      const rowI: number[] = [];
      for (let j = 0; j < subDim; j++) {
        const gi = subsystemIndices[i];
        const gj = subsystemIndices[j];
        rowR.push(this._densityMatrix.real[gi][gj]);
        rowI.push(this._densityMatrix.imag[gi][gj]);
      }
      real.push(rowR);
      imag.push(rowI);
    }
    return { real, imag };
  }

  public computeDecoherenceRate(): number {
    const gamma = this._environmentCoupling;
    const kT = this._thermalEnergy;
    const omega_c = this._cutoffFrequency;
    const rate = gamma * kT * omega_c / (Math.PI * this._dimension);
    return rate;
  }

  public setEnvironmentParameters(coupling: number, temperature: number, states: number): void {
    this._environmentCoupling = Math.max(0, coupling);
    this._thermalEnergy = Math.max(1e-6, temperature);
    this._environmentStates = Math.max(1, states);
    this._decoherenceTime = this._environmentCoupling > 0 ? 1 / (this._environmentCoupling * Math.log(states + 1)) : Infinity;
  }

  public isDecohered(threshold: number = 0.01): boolean {
    return this.computeOffDiagonalNorm() < threshold;
  }

  public getHistory(): DecoherenceRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public reset(): void {
    this._densityMatrix = this._initializePureState();
    this._elapsedTime = 0;
    this._history = [];
    this._environmentCoupling = 0.01;
    this._decoherenceTime = 100;
  }
}
