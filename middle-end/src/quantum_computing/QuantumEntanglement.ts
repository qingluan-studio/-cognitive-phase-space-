import { DataPacket } from '../shared/types';

/** Bell state types used as entanglement seeds. */
export interface BellState {
  readonly type: 'Phi+' | 'Phi-' | 'Psi+' | 'Psi-';
  readonly qubits: number[];
  readonly amplitudes: number[];
}

/** A Greenberger–Horne–Zeilinger multi-qubit entangled state. */
export interface GHZState {
  readonly n: number;
  readonly qubits: number[];
  readonly amplitude: number;
  readonly entangled: boolean;
}

/** Quantitative measures of entanglement for a bipartite state. */
export interface EntanglementMeasure {
  readonly concurrence: number;
  readonly entropy: number;
  readonly negativity: number;
  readonly tangle: number;
  readonly schmidtRank: number;
}

/** Teleportation protocol transcript. */
export interface TeleportationRecord {
  readonly success: boolean;
  readonly fidelity: number;
  readonly classicalBits: number;
  readonly bellMeasurement: string;
}

/** Reference to the static `_history` private state symbol. */
export interface EntanglementHistoryEntry {
  readonly timestamp: number;
  readonly operation: string;
  readonly measure: number;
}

export class QuantumEntanglement {
  private _states: Map<string, BellState | GHZState> = new Map();
  private _measures: EntanglementMeasure[] = [];
  private _history: EntanglementHistoryEntry[] = [];
  private _counter = 0;
  private _schmidtCoeffs: number[] = [];

  get stateCount(): number {
    return this._states.size;
  }

  get measureCount(): number {
    return this._measures.length;
  }

  get history(): EntanglementHistoryEntry[] {
    return this._history.map(h => ({ ...h }));
  }

  public bellState(type: BellState['type']): BellState {
    const qubits = [0, 1];
    let amplitudes: number[];
    const inv = 1 / Math.sqrt(2);
    switch (type) {
      case 'Phi+':
        amplitudes = [inv, 0, 0, inv];
        break;
      case 'Phi-':
        amplitudes = [inv, 0, 0, -inv];
        break;
      case 'Psi+':
        amplitudes = [0, inv, inv, 0];
        break;
      case 'Psi-':
        amplitudes = [0, inv, -inv, 0];
        break;
    }
    const state: BellState = { type, qubits, amplitudes };
    this._states.set(`bell-${type}-${this._counter++}`, state);
    this._recordHistory(`bellState(${type})`, inv);
    return state;
  }

  public ghzState(n: number): GHZState {
    const size = Math.max(2, n);
    const qubits = Array.from({ length: size }, (_, i) => i);
    const amplitude = 1 / Math.sqrt(2);
    const state: GHZState = { n: size, qubits, amplitude, entangled: true };
    this._states.set(`ghz-${size}-${this._counter++}`, state);
    this._recordHistory(`ghzState(n=${size})`, amplitude);
    return state;
  }

  public wState(n: number): { qubits: number[]; amplitudes: number[]; entangled: boolean } {
    const size = Math.max(3, n);
    const amp = 1 / Math.sqrt(size);
    const qubits = Array.from({ length: size }, (_, i) => i);
    const amplitudes = Array.from({ length: size }, () => amp);
    this._recordHistory(`wState(n=${size})`, amp);
    return { qubits, amplitudes, entangled: true };
  }

  public concurrence(state: { amplitudes?: number[] } | null): number {
    if (!state || !state.amplitudes) return 0;
    const a = state.amplitudes;
    if (a.length < 4) return 0;
    const c = 2 * Math.abs(a[0] * a[3] - a[1] * a[2]);
    this._recordHistory('concurrence', c);
    return Math.min(1, Math.max(0, c));
  }

  public entanglementEntropy(state: { amplitudes?: number[] } | null): number {
    if (!state || !state.amplitudes) return 0;
    let entropy = 0;
    for (const p of state.amplitudes) {
      const prob = p * p;
      if (prob > 0) entropy -= prob * Math.log2(prob);
    }
    this._recordHistory('entanglementEntropy', entropy);
    return entropy;
  }

  public schmidtDecomposition(state: { amplitudes?: number[] } | null): { coefficients: number[]; rank: number } {
    if (!state || !state.amplitudes) return { coefficients: [], rank: 0 };
    const coeffs = state.amplitudes.map(a => Math.abs(a)).sort((x, y) => y - x);
    this._schmidtCoeffs = coeffs;
    const rank = coeffs.filter(c => c > 1e-9).length;
    this._recordHistory('schmidtDecomposition', rank);
    return { coefficients: coeffs, rank };
  }

  public partialTrace(state: { amplitudes?: number[] } | null, qubit: number): number[][] {
    if (!state || !state.amplitudes) return [[1, 0], [0, 1]];
    const a = state.amplitudes;
    const reduced: number[][] = [[0, 0], [0, 0]];
    const half = Math.max(1, Math.floor(a.length / 2));
    for (let i = 0; i < half; i++) {
      reduced[0][0] += (a[i] ?? 0) * (a[i] ?? 0);
      reduced[1][1] += (a[i + half] ?? 0) * (a[i + half] ?? 0);
      reduced[0][1] += (a[i] ?? 0) * (a[i + half] ?? 0);
      reduced[1][0] += (a[i + half] ?? 0) * (a[i] ?? 0);
    }
    this._recordHistory(`partialTrace(q${qubit})`, reduced[0][0]);
    return reduced;
  }

  public entanglementWitness(state: { amplitudes?: number[] } | null): { entangled: boolean; witness: number } {
    const c = this.concurrence(state);
    const entangled = c > 0.01;
    const witness = entangled ? -1 : 1;
    this._recordHistory('entanglementWitness', witness);
    return { entangled, witness };
  }

  public bellInequality(measurements: number[][]): { chsh: number; violated: boolean } {
    if (measurements.length < 4) return { chsh: 0, violated: false };
    const [a1, a2, b1, b2] = measurements;
    const e = (m1: number[], m2: number[]) => {
      const n = Math.min(m1.length, m2.length);
      let sum = 0;
      for (let i = 0; i < n; i++) sum += m1[i] * m2[i];
      return n > 0 ? sum / n : 0;
    };
    const chsh = Math.abs(e(a1, b1) - e(a1, b2) + e(a2, b1) + e(a2, b2));
    const violated = chsh > 2;
    this._recordHistory('bellInequality', chsh);
    return { chsh, violated };
  }

  public teleportation(qubit: number, channel: BellState): TeleportationRecord {
    const success = Math.random() > 0.05;
    const fidelity = success ? 0.95 + Math.random() * 0.05 : 0.4 + Math.random() * 0.3;
    this._recordHistory(`teleportation(q${qubit}, ${channel.type})`, fidelity);
    return { success, fidelity, classicalBits: 2, bellMeasurement: channel.type };
  }

  public superdenseCoding(bits: [number, number], channel: BellState): { success: boolean; transmitted: number; message: string } {
    const [b1, b2] = bits;
    const message = `${b1}${b2}`;
    this._recordHistory(`superdenseCoding(${message}, ${channel.type})`, 1);
    return { success: true, transmitted: 2, message };
  }

  public entanglementSwapping(a: BellState, b: BellState): { result: BellState['type']; fidelity: number } {
    const types: BellState['type'][] = ['Phi+', 'Phi-', 'Psi+', 'Psi-'];
    const result = types[Math.floor(Math.random() * types.length)];
    const fidelity = 0.85 + Math.random() * 0.15;
    this._recordHistory(`entanglementSwapping(${a.type}, ${b.type})`, fidelity);
    return { result, fidelity };
  }

  public distillation(pairs: BellState[]): { pairs: number; fidelity: number; output: BellState['type'] } {
    const fidelity = Math.min(1, 0.7 + pairs.length * 0.05);
    this._recordHistory(`distillation(pairs=${pairs.length})`, fidelity);
    return { pairs: pairs.length, fidelity, output: 'Phi+' };
  }

  public vonNeumannEntropy(densityMatrix: number[][]): number {
    if (densityMatrix.length === 0) return 0;
    let trace = 0;
    for (let i = 0; i < densityMatrix.length; i++) {
      const v = densityMatrix[i][i] ?? 0;
      if (v > 0) trace -= v * Math.log2(v);
    }
    this._recordHistory('vonNeumannEntropy', trace);
    return trace;
  }

  public mutualInformation(stateA: number[][], stateB: number[][]): number {
    const sA = this.vonNeumannEntropy(stateA);
    const sB = this.vonNeumannEntropy(stateB);
    const sAB = this.vonNeumannEntropy(stateA.map((row, i) =>
      row.map((v, j) => v + (stateB[i]?.[j] ?? 0))
    ));
    const mi = sA + sB - sAB;
    this._recordHistory('mutualInformation', mi);
    return mi;
  }

  public storeMeasure(measure: EntanglementMeasure): void {
    this._measures.push({ ...measure });
    if (this._measures.length > 200) this._measures.shift();
  }

  public measures(): EntanglementMeasure[] {
    return this._measures.map(m => ({ ...m }));
  }

  public summary(): { states: number; measures: number; schmidtRank: number; historyLength: number } {
    return {
      states: this._states.size,
      measures: this._measures.length,
      schmidtRank: this._schmidtCoeffs.length,
      historyLength: this._history.length,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      states: this._states.size,
      measures: this._measures.length,
      schmidtCoeffs: [...this._schmidtCoeffs],
      history: this._history.map(h => ({ ...h })),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const c of this._schmidtCoeffs) {
      if (c < 0 || c > 1) issues.push('schmidt coefficient out of [0,1] range');
    }
    return { valid: issues.length === 0, issues };
  }

  public monogamy(state: { amplitudes?: number[] } | null, parties: number): { monogamous: boolean; coffmanKunduWoottler: number; parties: number } {
    const c = this.concurrence(state);
    const ckw = parties > 2 ? c * c * (parties - 1) : 0;
    const monogamous = ckw <= 1;
    this._recordHistory('monogamy()', ckw);
    return { monogamous, coffmanKunduWoottler: ckw, parties };
  }

  public entanglementSpectrum(state: { amplitudes?: number[] } | null): { eigenvalues: number[]; degeneracy: number } {
    const schmidt = this.schmidtDecomposition(state);
    const eigenvalues = schmidt.coefficients.map(c => c * c);
    const degeneracy = eigenvalues.filter((e, _, arr) => arr.filter(x => Math.abs(x - e) < 1e-6).length > 1).length;
    this._recordHistory('entanglementSpectrum()', eigenvalues.length);
    return { eigenvalues, degeneracy };
  }

  public topologicalEntanglement(regionA: number[], regionB: number[]): { entropy: number; topological: boolean; regions: number } {
    const entropy = Math.log(2) * Math.min(regionA.length, regionB.length);
    const topological = regionA.length !== regionB.length;
    this._recordHistory('topologicalEntanglement()', entropy);
    return { entropy, topological, regions: 2 };
  }

  public lastMeasure(): EntanglementMeasure | null {
    return this._measures.length > 0 ? { ...this._measures[this._measures.length - 1] } : null;
  }

  private _recordHistory(operation: string, measure: number): void {
    this._counter++;
    this._history.push({ timestamp: Date.now(), operation, measure });
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    states: number;
    measures: number;
    schmidtCoeffs: number[];
    history: EntanglementHistoryEntry[];
  }> {
    return {
      id: `qent-${Date.now()}-${this._counter}`,
      payload: {
        states: this._states.size,
        measures: this._measures.length,
        schmidtCoeffs: [...this._schmidtCoeffs],
        history: this._history.map(h => ({ ...h })),
      },
      metadata: {
        createdAt: Date.now(),
        route: ['quantum_computing', 'entanglement', 'result'],
        priority: 0.85,
        phase: 'computation',
      },
    };
  }

  public reset(): void {
    this._states.clear();
    this._measures = [];
    this._history = [];
    this._schmidtCoeffs = [];
    this._counter = 0;
  }
}
