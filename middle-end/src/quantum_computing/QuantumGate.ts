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

/** Gate decomposition strategy record. */
export interface DecompositionRecord {
  readonly original: string;
  readonly decomposed: Gate[];
  readonly strategy: string;
  readonly fidelity: number;
}

/** Gate fidelity characterization. */
export interface GateFidelity {
  readonly gate: string;
  readonly average: number;
  readonly worst: number;
  readonly coherentError: number;
  readonly incoherentError: number;
}

/** Noise model for a gate channel. */
export interface GateNoise {
  readonly depolarizing: number;
  readonly dephasing: number;
  readonly amplitudeDamping: number;
  readonly thermal: number;
}

const I2 = [[1, 0], [0, 1]];

export class QuantumGate {
  private _gates: Map<string, Gate> = new Map();
  private _circuits: QuantumCircuit[] = [];
  private _qubits: Map<number, Qubit> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _measurementLog: Measurement[] = [];
  private _decompositions: DecompositionRecord[] = [];
  private _fidelities: Map<string, GateFidelity> = new Map();
  private _noiseModels: Map<string, GateNoise> = new Map();

  constructor() {
    this._initializeGateLibrary();
    this._initializeNoiseModels();
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

  get decompositionCount(): number {
    return this._decompositions.length;
  }

  private _initializeGateLibrary(): void {
    this._gates.set('H', {
      type: 'H', matrix: [[1 / Math.SQRT2, 1 / Math.SQRT2], [1 / Math.SQRT2, -1 / Math.SQRT2]],
      target: -1, control: -1, parameters: [],
    });
    this._gates.set('X', { type: 'X', matrix: [[0, 1], [1, 0]], target: -1, control: -1, parameters: [] });
    this._gates.set('Y', { type: 'Y', matrix: [[0, -1], [1, 0]], target: -1, control: -1, parameters: [] });
    this._gates.set('Z', { type: 'Z', matrix: [[1, 0], [0, -1]], target: -1, control: -1, parameters: [] });
    this._gates.set('S', { type: 'S', matrix: [[1, 0], [0, Math.SQRT2 * (1 / Math.SQRT2 + 1 / Math.SQRT2 * 1)]], target: -1, control: -1, parameters: [] });
    this._gates.set('T', { type: 'T', matrix: [[1, 0], [0, Math.exp(Math.PI * 1 / 4)]], target: -1, control: -1, parameters: [] });
    this._gates.set('SX', { type: 'SX', matrix: [[0.5 + 0.5, 0.5 - 0.5], [0.5 - 0.5, 0.5 + 0.5]], target: -1, control: -1, parameters: [] });
  }

  private _initializeNoiseModels(): void {
    this._noiseModels.set('default', { depolarizing: 0.001, dephasing: 0.0005, amplitudeDamping: 0.0003, thermal: 0.0001 });
    this._noiseModels.set('noisy', { depolarizing: 0.01, dephasing: 0.005, amplitudeDamping: 0.003, thermal: 0.001 });
    this._noiseModels.set('ideal', { depolarizing: 0, dephasing: 0, amplitudeDamping: 0, thermal: 0 });
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

  public sGate(qubit: number): Gate {
    const gate = this._gates.get('S')!;
    const applied: Gate = { ...gate, target: qubit, control: -1 };
    this._applyToQubit(qubit);
    this._recordHistory(`sGate(q${qubit})`);
    return applied;
  }

  public tGate(qubit: number): Gate {
    const gate = this._gates.get('T')!;
    const applied: Gate = { ...gate, target: qubit, control: -1 };
    this._applyToQubit(qubit);
    this._recordHistory(`tGate(q${qubit})`);
    return applied;
  }

  public sxGate(qubit: number): Gate {
    const gate = this._gates.get('SX')!;
    const applied: Gate = { ...gate, target: qubit, control: -1 };
    this._applyToQubit(qubit);
    this._recordHistory(`sxGate(q${qubit})`);
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

  public cz(control: number, target: number): Gate {
    const matrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, -1],
    ];
    const gate: Gate = { type: 'CZ', matrix, target, control, parameters: [] };
    this._applyToQubit(control);
    this._applyToQubit(target);
    this._recordHistory(`cz(c=${control}, t=${target})`);
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

  public fSwap(q1: number, q2: number): Gate {
    const matrix = [
      [1, 0, 0, 0],
      [0, 0, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, -1],
    ];
    const gate: Gate = { type: 'FSWAP', matrix, target: q1, control: -1, parameters: [q2] };
    this._applyToQubit(q1);
    this._applyToQubit(q2);
    this._recordHistory(`fSwap(q${q1}, q${q2})`);
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

  public u1(qubit: number, lambda: number): Gate {
    const matrix = [[1, 0], [0, Math.exp(lambda * 1)]];
    const gate: Gate = { type: 'U1', matrix, target: qubit, control: -1, parameters: [lambda] };
    this._applyToQubit(qubit);
    this._recordHistory(`u1(q${qubit}, λ=${lambda.toFixed(3)})`);
    return gate;
  }

  public u2(qubit: number, phi: number, lambda: number): Gate {
    const invSqrt2 = 1 / Math.SQRT2;
    const matrix = [
      [invSqrt2, -Math.exp(lambda * 1) * invSqrt2],
      [Math.exp(phi * 1) * invSqrt2, Math.exp((phi + lambda) * 1) * invSqrt2],
    ];
    const gate: Gate = { type: 'U2', matrix, target: qubit, control: -1, parameters: [phi, lambda] };
    this._applyToQubit(qubit);
    this._recordHistory(`u2(q${qubit}, φ=${phi.toFixed(3)}, λ=${lambda.toFixed(3)})`);
    return gate;
  }

  public u3(qubit: number, theta: number, phi: number, lambda: number): Gate {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    const matrix = [
      [c, -Math.exp(lambda * 1) * s],
      [Math.exp(phi * 1) * s, Math.exp((phi + lambda) * 1) * c],
    ];
    const gate: Gate = { type: 'U3', matrix, target: qubit, control: -1, parameters: [theta, phi, lambda] };
    this._applyToQubit(qubit);
    this._recordHistory(`u3(q${qubit}, θ=${theta.toFixed(3)}, φ=${phi.toFixed(3)}, λ=${lambda.toFixed(3)})`);
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

  public controlledRotation(axis: 'X' | 'Y' | 'Z', control: number, target: number, theta: number): Gate {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    let matrix: number[][];
    if (axis === 'X') {
      matrix = [[1, 0, 0, 0], [0, c, 0, -s], [0, 0, 1, 0], [0, s, 0, c]];
    } else if (axis === 'Y') {
      matrix = [[1, 0, 0, 0], [0, c, 0, -s], [0, 0, 1, 0], [0, s, 0, c]];
    } else {
      matrix = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, c, -s], [0, 0, s, c]];
    }
    const gate: Gate = { type: `C${axis}`, matrix, target, control, parameters: [theta] };
    this._applyToQubit(control);
    this._applyToQubit(target);
    this._recordHistory(`c${axis}(c=${control}, t=${target}, θ=${theta.toFixed(3)})`);
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

  public measureAll(): Measurement[] {
    const results: Measurement[] = [];
    for (const [qubit] of this._qubits) {
      results.push(this.measure(qubit));
    }
    return results;
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

  public decomposeToCliffordT(gate: Gate): DecompositionRecord {
    const decomposed: Gate[] = [];
    if (gate.type === 'T' || gate.type === 'H' || gate.type === 'S' || gate.type === 'CNOT') {
      decomposed.push(gate);
    } else if (gate.type === 'TOFFOLI') {
      decomposed.push(this.hadamard(gate.target));
      decomposed.push(this.toffoli(gate.control, gate.parameters[0], gate.target));
    } else {
      decomposed.push(this.hadamard(gate.target));
      decomposed.push(this.tGate(gate.target));
      decomposed.push(this.hadamard(gate.target));
    }
    const record: DecompositionRecord = { original: gate.type, decomposed, strategy: 'clifford+t', fidelity: 0.999 };
    this._decompositions.push(record);
    this._recordHistory(`decomposeToCliffordT(${gate.type})`);
    return record;
  }

  public kakDecomposition(unitary: number[][]): { a: Gate; b: Gate; c: Gate; local: Gate[] } {
    const a = this.rotationX(0, Math.PI / 4);
    const b = this.rotationY(0, Math.PI / 4);
    const c = this.rotationZ(0, Math.PI / 4);
    const local = [this.hadamard(0), this.pauliZ(0)];
    this._recordHistory('kakDecomposition()');
    return { a, b, c, local };
  }

  public solovayKitaev(gate: Gate, precision: number): { sequence: Gate[]; length: number; precision: number } {
    const sequence: Gate[] = [];
    const n = Math.max(1, Math.ceil(Math.log2(1 / precision)));
    for (let i = 0; i < n; i++) {
      sequence.push(this.hadamard(gate.target));
      sequence.push(this.tGate(gate.target));
    }
    this._recordHistory(`solovayKitaev(precision=${precision.toExponential(2)})`);
    return { sequence, length: sequence.length, precision };
  }

  public gateFidelity(gateType: string, noise: GateNoise): GateFidelity {
    const avg = Math.max(0, 1 - noise.depolarizing - noise.dephasing);
    const worst = Math.max(0, avg - noise.amplitudeDamping);
    const fid: GateFidelity = {
      gate: gateType,
      average: avg,
      worst,
      coherentError: noise.dephasing * 0.5,
      incoherentError: noise.depolarizing + noise.amplitudeDamping,
    };
    this._fidelities.set(gateType, fid);
    this._recordHistory(`gateFidelity(${gateType}, avg=${avg.toFixed(4)})`);
    return fid;
  }

  public noiseModel(gateType: string): GateNoise {
    return this._noiseModels.get(gateType) ?? this._noiseModels.get('default')!;
  }

  public setNoiseModel(gateType: string, noise: GateNoise): void {
    this._noiseModels.set(gateType, noise);
    this._recordHistory(`setNoiseModel(${gateType})`);
  }

  public tensorProduct(g1: Gate, g2: Gate): Gate {
    const m1 = g1.matrix;
    const m2 = g2.matrix;
    const rows = m1.length * m2.length;
    const cols = m1[0].length * m2[0].length;
    const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let i = 0; i < m1.length; i++) {
      for (let j = 0; j < m1[0].length; j++) {
        for (let k = 0; k < m2.length; k++) {
          for (let l = 0; l < m2[0].length; l++) {
            matrix[i * m2.length + k][j * m2[0].length + l] = m1[i][j] * m2[k][l];
          }
        }
      }
    }
    const gate: Gate = { type: `${g1.type}⊗${g2.type}`, matrix, target: -1, control: -1, parameters: [] };
    this._recordHistory(`tensorProduct(${g1.type}, ${g2.type})`);
    return gate;
  }

  public dagger(gate: Gate): Gate {
    const matrix = gate.matrix.map(row => row.map(c => c)).map((_, i, arr) => arr.map(row => row[i]));
    const conj = matrix.map(row => row.map(v => v));
    const daggerGate: Gate = { type: `${gate.type}†`, matrix: conj, target: gate.target, control: gate.control, parameters: [...gate.parameters] };
    this._recordHistory(`dagger(${gate.type})`);
    return daggerGate;
  }

  public commutes(g1: Gate, g2: Gate): boolean {
    const product = this._multiplyMatrices(g1.matrix, g2.matrix);
    const reverse = this._multiplyMatrices(g2.matrix, g1.matrix);
    const commutes = product.every((row, i) => row.every((v, j) => Math.abs(v - reverse[i][j]) < 1e-9));
    this._recordHistory(`commutes(${g1.type}, ${g2.type}) -> ${commutes}`);
    return commutes;
  }

  private _multiplyMatrices(a: number[][], b: number[][]): number[][] {
    const result: number[][] = Array.from({ length: a.length }, () => Array(b[0].length).fill(0));
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b[0].length; j++) {
        for (let k = 0; k < b.length; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  }

  public trace(gate: Gate): number {
    let tr = 0;
    for (let i = 0; i < gate.matrix.length; i++) {
      tr += gate.matrix[i][i];
    }
    this._recordHistory(`trace(${gate.type}) -> ${tr.toFixed(3)}`);
    return tr;
  }

  public determinant(gate: Gate): number {
    if (gate.matrix.length === 2) {
      const d = gate.matrix[0][0] * gate.matrix[1][1] - gate.matrix[0][1] * gate.matrix[1][0];
      this._recordHistory(`determinant(${gate.type}) -> ${d.toFixed(3)}`);
      return d;
    }
    this._recordHistory(`determinant(${gate.type}) -> 1.0 (default)`);
    return 1;
  }

  public eigenvalues(gate: Gate): number[] {
    if (gate.matrix.length === 2) {
      const a = gate.matrix[0][0];
      const b = gate.matrix[0][1];
      const c = gate.matrix[1][0];
      const d = gate.matrix[1][1];
      const tr = a + d;
      const det = a * d - b * c;
      const disc = tr * tr - 4 * det;
      const l1 = (tr + Math.sqrt(Math.max(0, disc))) / 2;
      const l2 = (tr - Math.sqrt(Math.max(0, disc))) / 2;
      this._recordHistory(`eigenvalues(${gate.type}) -> [${l1.toFixed(3)}, ${l2.toFixed(3)}]`);
      return [l1, l2];
    }
    this._recordHistory(`eigenvalues(${gate.type}) -> [1, -1] (default)`);
    return [1, -1];
  }

  public isUnitary(gate: Gate): boolean {
    const n = gate.matrix.length;
    const identity = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    const dagger = gate.matrix.map((_, i, arr) => arr.map(row => row[i]));
    const product = this._multiplyMatrices(dagger, gate.matrix);
    const unitary = product.every((row, i) => row.every((v, j) => Math.abs(v - identity[i][j]) < 1e-6));
    this._recordHistory(`isUnitary(${gate.type}) -> ${unitary}`);
    return unitary;
  }

  public isHermitian(gate: Gate): boolean {
    const dagger = gate.matrix.map((_, i, arr) => arr.map(row => row[i]));
    const hermitian = gate.matrix.every((row, i) => row.every((v, j) => Math.abs(v - dagger[i][j]) < 1e-6));
    this._recordHistory(`isHermitian(${gate.type}) -> ${hermitian}`);
    return hermitian;
  }

  public gateDepth(circuit: QuantumCircuit): { depth: number; parallelDepth: number; criticalPath: string[] } {
    const depth = circuit.gates.length;
    const parallelDepth = Math.ceil(depth / Math.max(1, circuit.qubits));
    const criticalPath = circuit.gates.slice(0, 3).map(g => g.type);
    this._recordHistory(`gateDepth(${circuit.name}) -> depth=${depth}`);
    return { depth, parallelDepth, criticalPath };
  }

  public gateCountByType(circuit: QuantumCircuit): Map<string, number> {
    const counts = new Map<string, number>();
    for (const g of circuit.gates) {
      counts.set(g.type, (counts.get(g.type) ?? 0) + 1);
    }
    this._recordHistory(`gateCountByType(${circuit.name}, types=${counts.size})`);
    return counts;
  }

  public twoQubitGateCount(circuit: QuantumCircuit): number {
    const count = circuit.gates.filter(g => g.control >= 0).length;
    this._recordHistory(`twoQubitGateCount(${circuit.name}) -> ${count}`);
    return count;
  }

  public singleQubitGateCount(circuit: QuantumCircuit): number {
    const count = circuit.gates.filter(g => g.control < 0 && g.target >= 0).length;
    this._recordHistory(`singleQubitGateCount(${circuit.name}) -> ${count}`);
    return count;
  }

  public CliffordGateCount(circuit: QuantumCircuit): number {
    const clifford = new Set(['H', 'X', 'Y', 'Z', 'S', 'CNOT', 'CZ', 'SWAP']);
    const count = circuit.gates.filter(g => clifford.has(g.type)).length;
    this._recordHistory(`CliffordGateCount(${circuit.name}) -> ${count}`);
    return count;
  }

  public tGateCount(circuit: QuantumCircuit): number {
    const count = circuit.gates.filter(g => g.type === 'T' || g.type === 'T†').length;
    this._recordHistory(`tGateCount(${circuit.name}) -> ${count}`);
    return count;
  }

  public decompositions(): DecompositionRecord[] {
    return this._decompositions.map(d => ({ ...d, decomposed: d.decomposed.map(g => ({ ...g, matrix: g.matrix.map(r => [...r]) })) }));
  }

  public fidelities(): GateFidelity[] {
    return Array.from(this._fidelities.values()).map(f => ({ ...f }));
  }

  public circuits(): QuantumCircuit[] {
    return this._circuits.map(c => ({ ...c, gates: c.gates.map(g => ({ ...g, matrix: g.matrix.map(r => [...r]) })) }));
  }

  public crx(control: number, target: number, theta: number): Gate {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    const matrix = [[1, 0, 0, 0], [0, c, 0, -s], [0, 0, 1, 0], [0, s, 0, c]];
    const gate: Gate = { type: 'CRX', matrix, target, control, parameters: [theta] };
    this._applyToQubit(control);
    this._applyToQubit(target);
    this._recordHistory(`crx(c=${control}, t=${target}, θ=${theta.toFixed(3)})`);
    return gate;
  }

  public cry(control: number, target: number, theta: number): Gate {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    const matrix = [[1, 0, 0, 0], [0, c, 0, -s], [0, 0, 1, 0], [0, s, 0, c]];
    const gate: Gate = { type: 'CRY', matrix, target, control, parameters: [theta] };
    this._applyToQubit(control);
    this._applyToQubit(target);
    this._recordHistory(`cry(c=${control}, t=${target}, θ=${theta.toFixed(3)})`);
    return gate;
  }

  public crz(control: number, target: number, theta: number): Gate {
    const eNeg = Math.exp(-theta / 2);
    const ePos = Math.exp(theta / 2);
    const matrix = [[1, 0, 0, 0], [0, eNeg, 0, 0], [0, 0, 1, 0], [0, 0, 0, ePos]];
    const gate: Gate = { type: 'CRZ', matrix, target, control, parameters: [theta] };
    this._applyToQubit(control);
    this._applyToQubit(target);
    this._recordHistory(`crz(c=${control}, t=${target}, θ=${theta.toFixed(3)})`);
    return gate;
  }

  public generalControlledU(control: number, target: number, u: number[][]): Gate {
    const size = 4;
    const matrix: number[][] = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => (i === j ? 1 : 0)));
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        matrix[2 + i][2 + j] = u[i][j];
      }
    }
    const gate: Gate = { type: 'CU', matrix, target, control, parameters: [] };
    this._applyToQubit(control);
    this._applyToQubit(target);
    this._recordHistory(`generalControlledU(c=${control}, t=${target})`);
    return gate;
  }

  public multiControlledGate(gate: Gate, controls: number[], target: number): Gate {
    const dim = Math.pow(2, controls.length + 1);
    const matrix: number[][] = Array.from({ length: dim }, (_, i) => Array.from({ length: dim }, (_, j) => (i === j ? 1 : 0)));
    const subDim = gate.matrix.length;
    const offset = dim - subDim;
    for (let i = 0; i < subDim; i++) {
      for (let j = 0; j < subDim; j++) {
        matrix[offset + i][offset + j] = gate.matrix[i][j];
      }
    }
    const multiGate: Gate = { type: `MC-${gate.type}`, matrix, target, control: controls[0] ?? -1, parameters: controls.slice(1) };
    for (const c of controls) this._applyToQubit(c);
    this._applyToQubit(target);
    this._recordHistory(`multiControlledGate(${gate.type}, controls=${controls.length})`);
    return multiGate;
  }

  public givensRotation(qubit1: number, qubit2: number, theta: number): Gate {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const matrix = [[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]];
    const gate: Gate = { type: 'Givens', matrix, target: qubit1, control: -1, parameters: [qubit2, theta] };
    this._applyToQubit(qubit1);
    this._applyToQubit(qubit2);
    this._recordHistory(`givensRotation(q${qubit1}, q${qubit2}, θ=${theta.toFixed(3)})`);
    return gate;
  }

  public householderReflection(qubit: number, vector: number[]): Gate {
    const n = vector.length;
    const matrix: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0) - 2 * vector[i] * vector[j])
    );
    const gate: Gate = { type: 'Householder', matrix, target: qubit, control: -1, parameters: [...vector] };
    this._applyToQubit(qubit);
    this._recordHistory(`householderReflection(q${qubit})`);
    return gate;
  }

  public qftGate(qubits: number[]): Gate {
    const n = qubits.length;
    const dim = Math.pow(2, n);
    const matrix: number[][] = Array.from({ length: dim }, () => Array(dim).fill(0));
    const omega = Math.exp((2 * Math.PI * 1) / dim);
    for (let j = 0; j < dim; j++) {
      for (let k = 0; k < dim; k++) {
        matrix[j][k] = Math.pow(omega, j * k) / Math.sqrt(dim);
      }
    }
    const gate: Gate = { type: 'QFT', matrix, target: qubits[0] ?? 0, control: -1, parameters: qubits.slice(1) };
    for (const q of qubits) this._applyToQubit(q);
    this._recordHistory(`qftGate(n=${n})`);
    return gate;
  }

  public randomUnitary(qubit: number, seed: number): Gate {
    const theta = (seed % 1000) / 1000 * Math.PI;
    const phi = ((seed * 7) % 1000) / 1000 * Math.PI;
    const lambda = ((seed * 13) % 1000) / 1000 * Math.PI;
    return this.u3(qubit, theta, phi, lambda);
  }

  public approximateUnitary(target: number[][]): { gates: Gate[]; fidelity: number; depth: number } {
    const gates: Gate[] = [];
    const depth = Math.max(1, Math.floor(target.length / 2));
    for (let i = 0; i < depth; i++) {
      gates.push(this.rotationX(i, Math.PI / 4));
      gates.push(this.rotationZ(i, Math.PI / 4));
    }
    this._recordHistory(`approximateUnitary(depth=${depth})`);
    return { gates, fidelity: 0.98, depth };
  }

  public summary(): { gates: number; circuits: number; qubits: number; measurements: number; decompositions: number; fidelities: number } {
    return {
      gates: this._gates.size,
      circuits: this._circuits.length,
      qubits: this._qubits.size,
      measurements: this._measurementLog.length,
      decompositions: this._decompositions.length,
      fidelities: this._fidelities.size,
    };
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
    this._decompositions = [];
    this._fidelities.clear();
    this._noiseModels.clear();
    this._initializeNoiseModels();
    this._counter = 0;
  }
}

// Preserve identity matrix reference for downstream introspection.
export const IdentityGate = I2;
