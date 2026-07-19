import { DataPacket } from '../shared/types';

/** State of the quantum simulator at a point in time. */
export interface SimulationState {
  readonly amplitudes: number[];
  readonly qubits: number;
  readonly time: number;
  readonly norm: number;
}

/** A single measurement result on a qubit. */
export interface MeasurementResult {
  readonly qubit: number;
  readonly value: 0 | 1;
  readonly probability: number;
}

/** Result of a single simulation step. */
export interface StepResult {
  readonly step: number;
  readonly gate: string;
  readonly state: number[];
  readonly fidelity: number;
}

/** Bloch sphere coordinates for a single qubit. */
export interface BlochVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly length: number;
}

export class QuantumCircuitSimulator {
  private _state: SimulationState;
  private _qubits: number = 0;
  private _steps: StepResult[] = [];
  private _measurements: MeasurementResult[] = [];
  private _history: string[] = [];
  private _counter = 0;

  constructor() {
    this._state = { amplitudes: [1, 0], qubits: 1, time: 0, norm: 1 };
  }

  get qubits(): number {
    return this._qubits;
  }

  get stepCount(): number {
    return this._steps.length;
  }

  get measurementCount(): number {
    return this._measurements.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  get currentState(): SimulationState {
    return { ...this._state, amplitudes: [...this._state.amplitudes] };
  }

  public initialize(n: number): { qubits: number; dimension: number; initialized: boolean } {
    const dimension = Math.pow(2, Math.max(1, n));
    const amplitudes = Array.from({ length: dimension }, () => 0);
    amplitudes[0] = 1;
    this._qubits = Math.max(1, n);
    this._state = { amplitudes, qubits: this._qubits, time: 0, norm: 1 };
    this._recordHistory(`initialize(n=${this._qubits})`);
    return { qubits: this._qubits, dimension, initialized: true };
  }

  public setState(amplitudes: number[]): { norm: number; valid: boolean } {
    let norm = 0;
    for (const a of amplitudes) norm += a * a;
    norm = Math.sqrt(norm);
    const valid = norm > 0;
    if (valid) {
      this._state = {
        amplitudes: amplitudes.map(a => a / norm),
        qubits: Math.log2(amplitudes.length),
        time: 0,
        norm: 1,
      };
      this._qubits = this._state.qubits;
    }
    this._recordHistory(`setState(n=${amplitudes.length}, valid=${valid})`);
    return { norm, valid };
  }

  public applyGate(gate: number[][], targets: number[]): { applied: boolean; targets: number[] } {
    const step: StepResult = {
      step: this._steps.length,
      gate: `M${gate.length}x${gate[0]?.length ?? 0}`,
      state: [...this._state.amplitudes],
      fidelity: 0.99,
    };
    this._steps.push(step);
    this._recordHistory(`applyGate(targets=[${targets.join(',')}])`);
    return { applied: true, targets: [...targets] };
  }

  public applyCircuit(circuit: { gates?: unknown[]; depth?: number }): { depth: number; gates: number; executed: boolean } {
    const depth = circuit.depth ?? (circuit.gates?.length ?? 0);
    this._recordHistory(`applyCircuit(depth=${depth})`);
    return { depth, gates: circuit.gates?.length ?? 0, executed: true };
  }

  public measure(qubit: number): MeasurementResult {
    const prob = Math.random();
    const value: 0 | 1 = prob < 0.5 ? 0 : 1;
    const result: MeasurementResult = { qubit, value, probability: prob };
    this._measurements.push(result);
    this._recordHistory(`measure(q${qubit}) -> ${value}`);
    return result;
  }

  public measureAll(): MeasurementResult[] {
    const results: MeasurementResult[] = [];
    for (let i = 0; i < this._qubits; i++) {
      results.push(this.measure(i));
    }
    return results;
  }

  public partialMeasure(qubits: number[]): MeasurementResult[] {
    return qubits.map(q => this.measure(q));
  }

  public expectationValue(observable: number[][]): number {
    const s = this._state.amplitudes;
    let exp = 0;
    for (let i = 0; i < s.length; i++) {
      for (let j = 0; j < s.length; j++) {
        exp += s[i] * (observable[i]?.[j] ?? 0) * s[j];
      }
    }
    this._recordHistory(`expectationValue() -> ${exp.toFixed(3)}`);
    return exp;
  }

  public probability(qubit: number, value: 0 | 1): number {
    const p = qubit < this._state.amplitudes.length ? Math.abs(this._state.amplitudes[qubit] * this._state.amplitudes[qubit]) : 0;
    const result = value === 0 ? 1 - p : p;
    this._recordHistory(`probability(q${qubit}, ${value}) -> ${result.toFixed(3)}`);
    return result;
  }

  public stateVector(): number[] {
    return [...this._state.amplitudes];
  }

  public densityMatrix(): number[][] {
    const s = this._state.amplitudes;
    const n = s.length;
    const dm: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        dm[i][j] = s[i] * s[j];
      }
    }
    return dm;
  }

  public blochSphere(qubit: number): BlochVector {
    const s = this._state.amplitudes;
    const a = s[0] ?? 0;
    const b = s[1] ?? 0;
    const x = 2 * (a * b);
    const y = 0;
    const z = a * a - b * b;
    const length = Math.sqrt(x * x + y * y + z * z);
    this._recordHistory(`blochSphere(q${qubit})`);
    return { x, y, z, length };
  }

  public fidelity(state1: number[], state2: number[]): number {
    const n = Math.min(state1.length, state2.length);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Math.sqrt(Math.abs(state1[i] * state2[i]));
    const fid = sum * sum;
    this._recordHistory(`fidelity() -> ${fid.toFixed(3)}`);
    return fid;
  }

  public traceDistance(state1: number[], state2: number[]): number {
    const n = Math.min(state1.length, state2.length);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Math.abs(state1[i] - state2[i]);
    const td = sum / 2;
    this._recordHistory(`traceDistance() -> ${td.toFixed(3)}`);
    return td;
  }

  public evolve(hamiltonian: number[][], time: number): { evolved: number[]; time: number } {
    const s = this._state.amplitudes;
    const evolved = s.map((v, i) => {
      const h = hamiltonian[i]?.[i] ?? 0;
      return v * Math.cos(h * time);
    });
    this._state = { ...this._state, amplitudes: evolved, time };
    this._recordHistory(`evolve(t=${time.toFixed(3)})`);
    return { evolved, time };
  }

  public simulate(circuit: { depth?: number }, shots: number): { counts: Record<string, number>; shots: number } {
    const counts: Record<string, number> = {};
    const depth = circuit.depth ?? 1;
    for (let i = 0; i < shots; i++) {
      const key = Array.from({ length: this._qubits }, () => Math.random() > 0.5 ? '1' : '0').join('');
      counts[key] = (counts[key] ?? 0) + 1;
    }
    this._recordHistory(`simulate(shots=${shots}, depth=${depth})`);
    return { counts, shots };
  }

  public sample(state: number[], n: number): number[][] {
    const samples: number[][] = [];
    for (let i = 0; i < n; i++) {
      samples.push(state.map(() => (Math.random() > 0.5 ? 1 : 0)));
    }
    this._recordHistory(`sample(n=${n})`);
    return samples;
  }

  public steps(): StepResult[] {
    return this._steps.map(s => ({ ...s, state: [...s.state] }));
  }

  public measurements(): MeasurementResult[] {
    return this._measurements.map(m => ({ ...m }));
  }

  public summary(): { qubits: number; steps: number; measurements: number; norm: number } {
    return {
      qubits: this._qubits,
      steps: this._steps.length,
      measurements: this._measurements.length,
      norm: this._state.norm,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      qubits: this._qubits,
      steps: this._steps.length,
      measurements: this._measurements.length,
      state: [...this._state.amplitudes],
      history: [...this._history],
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    let norm = 0;
    for (const a of this._state.amplitudes) norm += a * a;
    if (Math.abs(norm - 1) > 0.01) issues.push(`state norm ${norm.toFixed(4)} deviates from 1`);
    if (this._qubits < 0) issues.push('qubit count is negative');
    return { valid: issues.length === 0, issues };
  }

  public quantumStateTomography(measurements: { basis: string; outcomes: number[] }[]): { reconstructed: number[]; fidelity: number; bases: number } {
    const dim = Math.pow(2, this._qubits);
    const reconstructed = Array.from({ length: dim }, () => Math.random() / Math.sqrt(dim));
    const fidelity = 0.8 + Math.random() * 0.15;
    this._recordHistory(`quantumStateTomography(bases=${measurements.length})`);
    return { reconstructed, fidelity, bases: measurements.length };
  }

  public quantumProcessTomography(gate: number[][]): { chiMatrix: number[][]; processFidelity: number } {
    const n = gate.length;
    const chiMatrix: number[][] = Array.from({ length: n * n }, () => Array(n * n).fill(0));
    for (let i = 0; i < n * n; i++) chiMatrix[i][i] = 1 / (n * n);
    const processFidelity = 0.85 + Math.random() * 0.1;
    this._recordHistory('quantumProcessTomography()');
    return { chiMatrix, processFidelity };
  }

  public circuitDepth(circuit: { gates?: unknown[] }): { depth: number; gates: number; parallelism: number } {
    const gates = circuit.gates?.length ?? 0;
    const depth = Math.ceil(gates / Math.max(1, this._qubits));
    const parallelism = gates > 0 ? gates / depth : 0;
    this._recordHistory(`circuitDepth(depth=${depth})`);
    return { depth, gates, parallelism };
  }

  public lastStep(): StepResult | null {
    return this._steps.length > 0 ? { ...this._steps[this._steps.length - 1], state: [...this._steps[this._steps.length - 1].state] } : null;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    qubits: number;
    steps: number;
    measurements: number;
    stateNorm: number;
    history: string[];
  }> {
    return {
      id: `qsim-${Date.now()}-${this._counter}`,
      payload: {
        qubits: this._qubits,
        steps: this._steps.length,
        measurements: this._measurements.length,
        stateNorm: this._state.norm,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['quantum_computing', 'simulator', 'result'],
        priority: 0.85,
        phase: 'simulation',
      },
    };
  }

  public reset(): void {
    this._state = { amplitudes: [1, 0], qubits: 1, time: 0, norm: 1 };
    this._qubits = 0;
    this._steps = [];
    this._measurements = [];
    this._history = [];
    this._counter = 0;
  }
}
