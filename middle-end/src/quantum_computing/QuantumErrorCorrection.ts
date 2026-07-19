import { DataPacket } from '../shared/types';

/** A quantum error-correcting code specification. */
export interface ErrorCorrectionCode {
  readonly name: string;
  readonly logicalQubits: number;
  readonly physicalQubits: number;
  readonly distance: number;
  readonly stabilizers: string[];
}

/** A syndrome measurement identifying a potential error. */
export interface Syndrome {
  readonly measurement: number[];
  readonly error: string;
  readonly qubit: number;
  readonly severity: number;
}

/** Stabilizer generator description. */
export interface Stabilizer {
  readonly generators: string[];
  readonly pauliGroup: string[];
  readonly codespace: number;
}

/** Magic state distillation record. */
export interface MagicState {
  readonly type: 'T' | 'A' | 'H';
  readonly fidelity: number;
  readonly resources: number;
  readonly distillationRounds: number;
}

export class QuantumErrorCorrection {
  private _codes: Map<string, ErrorCorrectionCode> = new Map();
  private _syndromes: Syndrome[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _threshold = 1e-3;

  get codeCount(): number {
    return this._codes.size;
  }

  get syndromeCount(): number {
    return this._syndromes.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  get thresholdValue(): number {
    return this._threshold;
  }

  public shorCode(qubit: number): ErrorCorrectionCode {
    const code: ErrorCorrectionCode = {
      name: 'Shor',
      logicalQubits: 1,
      physicalQubits: 9,
      distance: 3,
      stabilizers: ['Z1Z2', 'Z2Z3', 'Z4Z5', 'Z5Z6', 'X1X2X3X4X5X6', 'X4X5X6X7X8X9'],
    };
    this._codes.set(`shor-${qubit}`, code);
    this._recordHistory(`shorCode(q${qubit})`);
    return code;
  }

  public steaneCode(qubit: number): ErrorCorrectionCode {
    const code: ErrorCorrectionCode = {
      name: 'Steane',
      logicalQubits: 1,
      physicalQubits: 7,
      distance: 3,
      stabilizers: ['XXXXIII', 'IXXIXXI', 'IIXXIXX', 'ZZZZIII', 'IZZIZZI', 'IIZZIZZ'],
    };
    this._codes.set(`steane-${qubit}`, code);
    this._recordHistory(`steaneCode(q${qubit})`);
    return code;
  }

  public surfaceCode(distance: number): ErrorCorrectionCode {
    const d = Math.max(2, distance);
    const physical = d * d + (d - 1) * (d - 1);
    const code: ErrorCorrectionCode = {
      name: 'Surface',
      logicalQubits: 1,
      physicalQubits: physical,
      distance: d,
      stabilizers: ['X-plaquette', 'Z-plaquette'],
    };
    this._codes.set(`surface-${d}`, code);
    this._recordHistory(`surfaceCode(d=${d})`);
    return code;
  }

  public repetitionCode(qubit: number, repetitions: number): ErrorCorrectionCode {
    const rep = Math.max(3, repetitions);
    const stabilizers = Array.from({ length: rep - 1 }, (_, i) => `Z${i}Z${i + 1}`);
    const code: ErrorCorrectionCode = {
      name: 'Repetition',
      logicalQubits: 1,
      physicalQubits: rep,
      distance: Math.floor(rep / 2),
      stabilizers,
    };
    this._codes.set(`rep-${qubit}`, code);
    this._recordHistory(`repetitionCode(q${qubit}, n=${rep})`);
    return code;
  }

  public fiveQubitCode(qubit: number): ErrorCorrectionCode {
    const code: ErrorCorrectionCode = {
      name: 'FiveQubit',
      logicalQubits: 1,
      physicalQubits: 5,
      distance: 3,
      stabilizers: ['XZZXI', 'IXZZX', 'XIXZZ', 'ZXIXZ'],
    };
    this._codes.set(`five-${qubit}`, code);
    this._recordHistory(`fiveQubitCode(q${qubit})`);
    return code;
  }

  public stabilizerCode(stabilizers: Stabilizer): ErrorCorrectionCode {
    const code: ErrorCorrectionCode = {
      name: 'Stabilizer',
      logicalQubits: Math.max(1, stabilizers.codespace - stabilizers.generators.length),
      physicalQubits: stabilizers.codespace,
      distance: Math.max(1, Math.floor(stabilizers.generators.length / 2)),
      stabilizers: [...stabilizers.generators],
    };
    this._codes.set(`stab-${this._counter++}`, code);
    this._recordHistory(`stabilizerCode(gens=${stabilizers.generators.length})`);
    return code;
  }

  public syndromeMeasurement(circuit: { gates?: unknown[] }, code: ErrorCorrectionCode): Syndrome {
    const measurement = code.stabilizers.map((_, i) => Math.random() > 0.9 ? 1 : 0);
    const errorIdx = measurement.findIndex(m => m === 1);
    const syndrome: Syndrome = {
      measurement,
      error: errorIdx >= 0 ? `bit-flip on q${errorIdx}` : 'none',
      qubit: errorIdx >= 0 ? errorIdx : -1,
      severity: errorIdx >= 0 ? 0.5 : 0,
    };
    this._syndromes.push(syndrome);
    this._recordHistory(`syndromeMeasurement(${code.name})`);
    return syndrome;
  }

  public errorCorrection(syndrome: Syndrome, code: ErrorCorrectionCode): { corrected: boolean; operations: string[]; code: string } {
    const corrected = syndrome.error !== 'none';
    const operations = corrected ? [`X(q${syndrome.qubit})`, `recover(${code.name})`] : [];
    this._recordHistory(`errorCorrection(${code.name}, ${syndrome.error})`);
    return { corrected, operations, code: code.name };
  }

  public faultTolerantGate(gate: string, code: ErrorCorrectionCode): { gate: string; code: string; transversal: boolean; overhead: number } {
    const transversalGates = ['CNOT', 'H', 'S', 'X', 'Z'];
    const transversal = transversalGates.includes(gate.toUpperCase());
    const overhead = code.physicalQubits / Math.max(1, code.logicalQubits);
    this._recordHistory(`faultTolerantGate(${gate}, ${code.name})`);
    return { gate, code: code.name, transversal, overhead };
  }

  public magicState(type: MagicState['type'], distillation: boolean): MagicState {
    const fidelity = distillation ? 0.999 : 0.9;
    const resources = distillation ? 15 : 1;
    const state: MagicState = { type, fidelity, resources, distillationRounds: distillation ? 5 : 0 };
    this._recordHistory(`magicState(${type}, distill=${distillation})`);
    return state;
  }

  public threshold(errorRate: number, code: ErrorCorrectionCode): { threshold: number; below: boolean; sustainable: boolean } {
    const threshold = 1e-2 / Math.sqrt(code.distance);
    const below = errorRate < threshold;
    this._threshold = threshold;
    this._recordHistory(`threshold(${code.name}) -> ${threshold.toExponential(2)}`);
    return { threshold, below, sustainable: below };
  }

  public codeDistance(logicalError: number, physicalError: number): { distance: number; scaling: number } {
    const ratio = Math.max(1, physicalError / Math.max(1e-12, logicalError));
    const distance = Math.max(1, Math.ceil(Math.log(ratio) / Math.log(10)));
    const scaling = Math.pow(physicalError, (distance + 1) / 2);
    this._recordHistory(`codeDistance(d=${distance})`);
    return { distance, scaling };
  }

  public encodingCircuit(code: ErrorCorrectionCode): { gates: string[]; depth: number; qubits: number } {
    const gates = code.stabilizers.map(s => `measure(${s})`);
    this._recordHistory(`encodingCircuit(${code.name})`);
    return { gates, depth: gates.length, qubits: code.physicalQubits };
  }

  public decodingCircuit(syndrome: Syndrome, code: ErrorCorrectionCode): { gates: string[]; corrections: number; code: string } {
    const gates = syndrome.measurement.map((m, i) => m === 1 ? `X(q${i})` : 'I');
    const corrections = gates.filter(g => g.startsWith('X')).length;
    this._recordHistory(`decodingCircuit(${code.name})`);
    return { gates, corrections, code: code.name };
  }

  public syndromes(): Syndrome[] {
    return this._syndromes.map(s => ({ ...s }));
  }

  public codes(): ErrorCorrectionCode[] {
    return Array.from(this._codes.values()).map(c => ({ ...c, stabilizers: [...c.stabilizers] }));
  }

  public lastSyndrome(): Syndrome | null {
    return this._syndromes.length > 0 ? { ...this._syndromes[this._syndromes.length - 1] } : null;
  }

  public summary(): { codes: number; syndromes: number; threshold: number; historyLength: number; counter: number } {
    return {
      codes: this._codes.size,
      syndromes: this._syndromes.length,
      threshold: this._threshold,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      codes: this._codes.size,
      syndromes: this._syndromes.length,
      threshold: this._threshold,
      history: [...this._history],
      codeNames: Array.from(this._codes.values()).map(c => c.name),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (this._threshold <= 0) issues.push('threshold must be positive');
    if (this._threshold > 1) issues.push('threshold above physical error ceiling');
    for (const code of this._codes.values()) {
      if (code.physicalQubits < code.logicalQubits) {
        issues.push(`${code.name}: physical qubits less than logical`);
      }
      if (code.distance < 1) issues.push(`${code.name}: distance below 1`);
    }
    for (const s of this._syndromes) {
      if (s.severity < 0 || s.severity > 1) issues.push('syndrome severity out of [0,1]');
    }
    return { valid: issues.length === 0, issues };
  }

  public codeComparison(codes: ErrorCorrectionCode[]): {
    best: string;
    worst: string;
    byDistance: { name: string; distance: number }[];
    byOverhead: { name: string; overhead: number }[];
  } {
    const byDistance = codes.map(c => ({ name: c.name, distance: c.distance })).sort((a, b) => b.distance - a.distance);
    const byOverhead = codes
      .map(c => ({ name: c.name, overhead: c.physicalQubits / Math.max(1, c.logicalQubits) }))
      .sort((a, b) => a.overhead - b.overhead);
    return {
      best: byDistance[0]?.name ?? 'none',
      worst: byDistance[byDistance.length - 1]?.name ?? 'none',
      byDistance,
      byOverhead,
    };
  }

  public errorRateAnalysis(physicalError: number, distances: number[]): { distance: number; logicalError: number; crossing: number }[] {
    return distances.map(d => {
      const logicalError = physicalError * Math.pow(physicalError / this._threshold, (d + 1) / 2);
      return { distance: d, logicalError, crossing: logicalError < physicalError ? 1 : 0 };
    });
  }

  public logicalErrorRate(physicalError: number, code: ErrorCorrectionCode): number {
    const ratio = physicalError / Math.max(1e-12, this._threshold);
    return Math.min(1, physicalError * Math.pow(ratio, (code.distance + 1) / 2));
  }

  public codeCapacity(code: ErrorCorrectionCode): { correctable: number; detectable: number; overhead: number } {
    return {
      correctable: Math.floor((code.distance - 1) / 2),
      detectable: code.distance - 1,
      overhead: code.physicalQubits / Math.max(1, code.logicalQubits),
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    codes: number;
    syndromes: number;
    threshold: number;
    history: string[];
  }> {
    return {
      id: `qec-${Date.now()}-${this._counter}`,
      payload: {
        codes: this._codes.size,
        syndromes: this._syndromes.length,
        threshold: this._threshold,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['quantum_computing', 'error_correction', 'result'],
        priority: 0.9,
        phase: 'computation',
      },
    };
  }

  public reset(): void {
    this._codes.clear();
    this._syndromes = [];
    this._history = [];
    this._counter = 0;
    this._threshold = 1e-3;
  }
}
