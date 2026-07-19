import { DataPacket } from '../shared/types';

/** A single qubit state with amplitude representation. */
export interface Qubit {
  readonly state: string;
  readonly amplitude: number;
  readonly phase: number;
  readonly measured: boolean;
}

/** A quantum gate applied to target qubits with optional control. */
export interface Gate {
  readonly type: string;
  readonly matrix: number[][];
  readonly target: number;
  readonly control: number;
  readonly parameters: number[];
}

/** A composed quantum circuit. */
export interface QuantumCircuit {
  readonly gates: Gate[];
  readonly qubits: number;
  readonly depth: number;
  readonly name: string;
}

/** Measurement outcome for a qubit. */
export interface Measurement {
  readonly qubit: number;
  readonly value: 0 | 1;
  readonly probability: number;
  readonly basis: string;
}

const I2 = [[1, 0], [0, 1]];

export class QuantumGate {
  private _gates: Map<string, Gate> = new Map();
  private _circuits: QuantumCircuit[] = [];
  private _qubits: Map<number, Qubit> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _measurementLog: Measurement[] = [];

  constructor() {
    this._initializeGateLibrary();
  }

  get gateCount(): number {
    return this._gates.size;
  }

  get circuitCount(): number {
    return this._circuits.length;
  }

  get qubitCount(): number {
    return this._qubits.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  private _initializeGateLibrary(): void {
    this._gates.set('H', {
      type: 'H', matrix: [[1 / Math.SQRT2, 1 / Math.SQRT2], [1 / Math.SQRT2, -1 / Math.SQRT2]],
      target: -1, control: -1, parameters: [],
    });
    this._gates.set('X', { type: 'X', matrix: [[0, 1], [1, 0]], target: -1, control: -1, parameters: [] });
    this._gates.set('Y', { type: 'Y', matrix: [[0, -1], [1, 0]], target: -1, control: -1, parameters: [] });
    this._gates.set('Z', { type: 'Z', matrix: [[1, 0], [0, -1]], target: -1, control: -1, parameters: [] });
  }

  public hadamard(qubit: number): Gate {
    const gate = this._gates.get('H')!;
    const applied: Gate = { ...gate, target: qubit, control: -1 };
    this._applyToQubit(qubit);
    this._recordHistory(`hadamard(q${qubit})`);
    return applied;
  }

  public pauliX(qubit: number): Gate {
    const gate = this._gates.get('X')!;
    const applied: Gate = { ...gate, target: qubit, control: -1 };
    this._applyToQubit(qubit);
    this._recordHistory(`pauliX(q${qubit})`);
    return applied;
  }

  public pauliY(qubit: number): Gate {
    const gate = this._gates.get('Y')!;
    const applied: Gate = { ...gate, target: qubit, control: -1 };
    this._applyToQubit(qubit);
    this._recordHistory(`pauliY(q${qubit})`);
    return applied;
  }

  public pauliZ(qubit: number): Gate {
    const gate = this._gates.get('Z')!;
    const applied: Gate = { ...gate, target: qubit, control: -1 };
    this._applyToQubit(qubit);
    this._recordHistory(`pauliZ(q${qubit})`);
    return applied;
  }

  public cnot(control: number, target: number): Gate {
    const matrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 1, 0],
    ];
    const gate: Gate = { type: 'CNOT', matrix, target, control, parameters: [] };
    this._applyToQubit(control);
    this._applyToQubit(target);
    this._recordHistory(`cnot(c=${control}, t=${target})`);
    return gate;
  }

  public toffoli(c1: number, c2: number, target: number): Gate {
    const size = 8;
    const matrix: number[][] = Array.from({ length: size }, (_, i) =>
      Array.from({ length: size }, (_, j) => (i === j ? 1 : 0))
    );
    matrix[6][6] = 0; matrix[6][7] = 1;
    matrix[7][7] = 0; matrix[7][6] = 1;
    const gate: Gate = { type: 'TOFFOLI', matrix, target, control: c1, parameters: [c2] };
    this._applyToQubit(c1);
    this._applyToQubit(c2);
    this._applyToQubit(target);
    this._recordHistory(`toffoli(c1=${c1}, c2=${c2}, t=${target})`);
    return gate;
  }

  public fredkin(c: number, t1: number, t2: number): Gate {
    const size = 8;
    const matrix: number[][] = Array.from({ length: size }, (_, i) =>
      Array.from({ length: size }, (_, j) => (i === j ? 1 : 0))
    );
    matrix[5][5] = 0; matrix[5][6] = 1;
    matrix[6][6] = 0; matrix[6][5] = 1;
    const gate: Gate = { type: 'FREDKIN', matrix, target: t1, control: c, parameters: [t2] };
    this._applyToQubit(c);
    this._applyToQubit(t1);
    this._applyToQubit(t2);
    this._recordHistory(`fredkin(c=${c}, t1=${t1}, t2=${t2})`);
    return gate;
  }

  public phase(qubit: number, theta: number): Gate {
    const matrix = [[1, 0], [0, Math.cos(theta) + Math.sin(theta) * 1]];
    const gate: Gate = { type: 'PHASE', matrix, target: qubit, control: -1, parameters: [theta] };
    this._applyToQubit(qubit);
    this._recordHistory(`phase(q${qubit}, θ=${theta.toFixed(3)})`);
    return gate;
  }

  public swap(q1: number, q2: number): Gate {
    const matrix = [
      [1, 0, 0, 0],
      [0, 0, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 1],
    ];
    const gate: Gate = { type: 'SWAP', matrix, target: q1, control: -1, parameters: [q2] };
    this._applyToQubit(q1);
    this._applyToQubit(q2);
    this._recordHistory(`swap(q${q1}, q${q2})`);
    return gate;
  }

  public iswap(q1: number, q2: number): Gate {
    const matrix = [
      [1, 0, 0, 0],
      [0, 0, 1, 0],
      [0, -1, 0, 0],
      [0, 0, 0, 1],
    ];
    const gate: Gate = { type: 'ISWAP', matrix, target: q1, control: -1, parameters: [q2] };
    this._applyToQubit(q1);
    this._applyToQubit(q2);
    this._recordHistory(`iswap(q${q1}, q${q2})`);
    return gate;
  }

  public rotationX(qubit: number, theta: number): Gate {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    const matrix = [[c, -s], [s, c]];
    const gate: Gate = { type: 'RX', matrix, target: qubit, control: -1, parameters: [theta] };
    this._applyToQubit(qubit);
    this._recordHistory(`rx(q${qubit}, θ=${theta.toFixed(3)})`);
    return gate;
  }

  public rotationY(qubit: number, theta: number): Gate {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    const matrix = [[c, -s], [s, c]];
    const gate: Gate = { type: 'RY', matrix, target: qubit, control: -1, parameters: [theta] };
    this._applyToQubit(qubit);
    this._recordHistory(`ry(q${qubit}, θ=${theta.toFixed(3)})`);
    return gate;
  }

  public rotationZ(qubit: number, theta: number): Gate {
    const eNeg = Math.exp(-theta / 2);
    const ePos = Math.exp(theta / 2);
    const matrix = [[eNeg, 0], [0, ePos]];
    const gate: Gate = { type: 'RZ', matrix, target: qubit, control: -1, parameters: [theta] };
    this._applyToQubit(qubit);
    this._recordHistory(`rz(q${qubit}, θ=${theta.toFixed(3)})`);
    return gate;
  }

  public deutsch(func: (x: number) => number, n: number): { result: string; constant: boolean } {
    const outcomes: number[] = [];
    for (let x = 0; x < Math.pow(2, n); x++) {
      outcomes.push(func(x));
    }
    const constant = outcomes.every(o => o === outcomes[0]);
    const result = constant ? 'constant' : 'balanced';
    this._recordHistory(`deutsch(n=${n}) -> ${result}`);
    return { result, constant };
  }

  public deutschJozsa(func: (x: number) => number, n: number): { result: string; constant: boolean; evaluations: number } {
    const sampleSize = Math.min(Math.pow(2, n), 16);
    const outcomes: number[] = [];
    for (let x = 0; x < sampleSize; x++) {
      outcomes.push(func(x));
    }
    const constant = outcomes.every(o => o === outcomes[0]);
    const result = constant ? 'constant' : 'balanced';
    this._recordHistory(`deutschJozsa(n=${n}) -> ${result}`);
    return { result, constant, evaluations: sampleSize };
  }

  public applyGate(gate: Gate, qubits: number[]): { applied: boolean; targets: number[] } {
    for (const q of qubits) {
      this._applyToQubit(q);
    }
    this._recordHistory(`applyGate(${gate.type}, qubits=[${qubits.join(',')}])`);
    return { applied: true, targets: [...qubits] };
  }

  public applyCircuit(circuit: QuantumCircuit, qubits: number[]): { depth: number; gates: number; executed: boolean } {
    for (let i = 0; i < circuit.qubits; i++) {
      this._applyToQubit(qubits[i] ?? i);
    }
    this._circuits.push(circuit);
    this._recordHistory(`applyCircuit(${circuit.name}, depth=${circuit.depth})`);
    return { depth: circuit.depth, gates: circuit.gates.length, executed: true };
  }

  public measure(qubit: number, basis: 'Z' | 'X' | 'Y' = 'Z'): Measurement {
    const prob = Math.random();
    const value: 0 | 1 = prob < 0.5 ? 0 : 1;
    const measurement: Measurement = { qubit, value, probability: prob, basis };
    this._measurementLog.push(measurement);
    this._recordHistory(`measure(q${qubit}, ${basis}) -> ${value}`);
    return measurement;
  }

  public composeCircuit(name: string, gates: Gate[]): QuantumCircuit {
    const qubits = gates.reduce((max, g) => Math.max(max, g.target, g.control, ...g.parameters), 0) + 1;
    const circuit: QuantumCircuit = { gates: [...gates], qubits, depth: gates.length, name };
    this._circuits.push(circuit);
    this._recordHistory(`composeCircuit(${name}, gates=${gates.length})`);
    return circuit;
  }

  public gateMatrix(type: string): number[][] | null {
    const gate = this._gates.get(type.toUpperCase());
    return gate ? gate.matrix.map(row => [...row]) : null;
  }

  public measurements(): Measurement[] {
    return this._measurementLog.map(m => ({ ...m }));
  }

  private _applyToQubit(qubit: number): void {
    if (!this._qubits.has(qubit)) {
      this._qubits.set(qubit, {
        state: '|0>',
        amplitude: 1,
        phase: 0,
        measured: false,
      });
    }
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    gates: number;
    circuits: number;
    qubits: number;
    measurements: number;
    history: string[];
  }> {
    return {
      id: `qgate-${Date.now()}-${this._counter}`,
      payload: {
        gates: this._gates.size,
        circuits: this._circuits.length,
        qubits: this._qubits.size,
        measurements: this._measurementLog.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['quantum_computing', 'gate', 'result'],
        priority: 0.8,
        phase: 'computation',
      },
    };
  }

  public reset(): void {
    this._gates.clear();
    this._initializeGateLibrary();
    this._circuits = [];
    this._qubits.clear();
    this._history = [];
    this._measurementLog = [];
    this._counter = 0;
  }
}

// Preserve identity matrix reference for downstream introspection.
export const IdentityGate = I2;
