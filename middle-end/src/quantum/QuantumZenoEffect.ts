export interface ZenoRecord {
  measurementCount: number;
  survivalProbability: number;
  expectedDecay: number;
  zenoRatio: number;
}

export interface MeasurementEvent {
  time: number;
  outcome: boolean;
  projection: number[][];
}

export class QuantumZenoEffect {
  private _initialState: number[];
  private _hamiltonian: number[][];
  private _decayRate: number;
  private _measurementCount: number;
  private _survivalProbability: number;
  private _history: ZenoRecord[];
  private _events: MeasurementEvent[];
  private _dimension: number;
  private _timeInterval: number;
  private _totalTime: number;
  private _projectionOperator: number[][];

  constructor(dimension: number = 2) {
    this._dimension = Math.max(2, dimension);
    this._initialState = this._initializeState();
    this._hamiltonian = this._initializeHamiltonian();
    this._decayRate = 0.1;
    this._measurementCount = 0;
    this._survivalProbability = 1.0;
    this._history = [];
    this._events = [];
    this._timeInterval = 1.0;
    this._totalTime = 10.0;
    this._projectionOperator = this._initializeProjection();
  }

  get dimension(): number {
    return this._dimension;
  }

  get survivalProbability(): number {
    return this._survivalProbability;
  }

  get measurementCount(): number {
    return this._measurementCount;
  }

  get decayRate(): number {
    return this._decayRate;
  }

  private _initializeState(): number[] {
    const state = new Array(this._dimension).fill(0);
    state[0] = 1;
    return state;
  }

  private _initializeHamiltonian(): number[][] {
    const H: number[][] = [];
    for (let i = 0; i < this._dimension; i++) {
      const row = new Array(this._dimension).fill(0);
      row[i] = i * 0.5;
      if (i < this._dimension - 1) {
        row[i + 1] = 0.1;
        row[i] = 0.1;
      }
      H.push(row);
    }
    return H;
  }

  private _initializeProjection(): number[][] {
    const P: number[][] = [];
    for (let i = 0; i < this._dimension; i++) {
      const row = new Array(this._dimension).fill(0);
      row[0] = i === 0 ? 1 : 0;
      P.push(row);
    }
    return P;
  }

  public setInitialState(state: number[]): void {
    if (state.length !== this._dimension) return;
    let norm = 0;
    for (const a of state) norm += a * a;
    if (norm === 0) return;
    const scale = 1 / Math.sqrt(norm);
    this._initialState = state.map(a => a * scale);
    this._survivalProbability = 1.0;
    this._measurementCount = 0;
  }

  public setHamiltonian(H: number[][]): void {
    if (H.length !== this._dimension || H.some(row => row.length !== this._dimension)) return;
    this._hamiltonian = H.map(row => [...row]);
    this._decayRate = this._computeDecayRate();
  }

  private _computeDecayRate(): number {
    const H = this._hamiltonian;
    const psi = this._initialState;
    let expectation = 0;
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        expectation += psi[i] * H[i][j] * psi[j];
      }
    }
    let expectationSquared = 0;
    for (let i = 0; i < this._dimension; i++) {
      let Hpsi = 0;
      for (let j = 0; j < this._dimension; j++) {
        Hpsi += H[i][j] * psi[j];
      }
      expectationSquared += Hpsi * Hpsi;
    }
    const variance = expectationSquared - expectation * expectation;
    return variance > 0 ? Math.sqrt(variance) : 0;
  }

  public setProjectionOperator(P: number[][]): void {
    if (P.length !== this._dimension || P.some(row => row.length !== this._dimension)) return;
    this._projectionOperator = P.map(row => [...row]);
  }

  public applyProjection(state: number[]): number[] {
    const projected = new Array(this._dimension).fill(0);
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        projected[i] += this._projectionOperator[i][j] * state[j];
      }
    }
    let norm = 0;
    for (const a of projected) norm += a * a;
    if (norm === 0) return [...this._initialState];
    const scale = 1 / Math.sqrt(norm);
    return projected.map(a => a * scale);
  }

  private _evolveUnitary(state: number[], dt: number): number[] {
    const newState = new Array(this._dimension).fill(0);
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < this._dimension; j++) {
        const H_ij = this._hamiltonian[i][j];
        if (i === j) {
          newState[i] += state[j] * Math.cos(H_ij * dt);
        } else {
          newState[i] -= state[j] * Math.sin(H_ij * dt) * 0.1;
        }
      }
    }
    let norm = 0;
    for (const a of newState) norm += a * a;
    if (norm === 0) return [...state];
    const scale = 1 / Math.sqrt(norm);
    return newState.map(a => a * scale);
  }

  public simulateZenoProtocol(nMeasurements: number, totalTime: number): ZenoRecord {
    const dt = totalTime / Math.max(1, nMeasurements);
    let state = [...this._initialState];
    let survival = 1.0;
    for (let m = 0; m < nMeasurements; m++) {
      state = this._evolveUnitary(state, dt);
      const projected = this.applyProjection(state);
      let prob = 0;
      for (let i = 0; i < this._dimension; i++) {
        prob += projected[i] * projected[i];
      }
      survival *= prob;
      state = projected;
      const event: MeasurementEvent = {
        time: (m + 1) * dt,
        outcome: prob > 0.5,
        projection: this._projectionOperator.map(row => [...row]),
      };
      this._events.push(event);
    }
    const expectedDecay = Math.exp(-this._decayRate * totalTime);
    const zenoRatio = expectedDecay > 0 ? survival / expectedDecay : survival;
    this._survivalProbability = survival;
    this._measurementCount = nMeasurements;
    const record: ZenoRecord = {
      measurementCount: nMeasurements,
      survivalProbability: survival,
      expectedDecay,
      zenoRatio,
    };
    this._history.push(record);
    if (this._history.length > 200) this._history.shift();
    return record;
  }

  public computeSurvivalWithoutMeasurement(time: number): number {
    return Math.exp(-this._decayRate * time);
  }

  public computeZenoLimit(totalTime: number): number {
    const quadraticTerm = this._decayRate * this._decayRate * totalTime * totalTime;
    return Math.exp(-quadraticTerm / 2);
  }

  public sweepMeasurementFrequency(frequencies: number[], totalTime: number): ZenoRecord[] {
    const results: ZenoRecord[] = [];
    for (const freq of frequencies) {
      const n = Math.max(1, Math.floor(freq * totalTime));
      results.push(this.simulateZenoProtocol(n, totalTime));
    }
    return results;
  }

  public getHistory(): ZenoRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public getEvents(): MeasurementEvent[] {
    return this._events.map(e => ({ ...e, projection: e.projection.map(row => [...row]) }));
  }

  public setTimeParameters(interval: number, total: number): void {
    this._timeInterval = Math.max(1e-6, interval);
    this._totalTime = Math.max(this._timeInterval, total);
  }

  public computeAntiZenoEffect(nMeasurements: number, totalTime: number): number {
    const dt = totalTime / Math.max(1, nMeasurements);
    let state = [...this._initialState];
    let decay = 1.0;
    for (let m = 0; m < nMeasurements; m++) {
      state = this._evolveUnitary(state, dt);
      const antiProjected = this._applyAntiProjection(state);
      let prob = 0;
      for (let i = 0; i < this._dimension; i++) {
        prob += antiProjected[i] * antiProjected[i];
      }
      decay *= (1 - prob);
      state = antiProjected;
    }
    return decay;
  }

  private _applyAntiProjection(state: number[]): number[] {
    const projected = this.applyProjection(state);
    const anti = new Array(this._dimension).fill(0);
    for (let i = 0; i < this._dimension; i++) {
      anti[i] = state[i] - projected[i];
    }
    let norm = 0;
    for (const a of anti) norm += a * a;
    if (norm === 0) return [...state];
    const scale = 1 / Math.sqrt(norm);
    return anti.map(a => a * scale);
  }

  public reset(): void {
    this._initialState = this._initializeState();
    this._hamiltonian = this._initializeHamiltonian();
    this._decayRate = 0.1;
    this._measurementCount = 0;
    this._survivalProbability = 1.0;
    this._history = [];
    this._events = [];
    this._projectionOperator = this._initializeProjection();
  }
}
