import { DataPacket } from '../shared/types';

/** A quantum channel with capacity and noise profile. */
export interface QuantumChannel {
  readonly type: 'depolarizing' | 'dephasing' | 'amplitude-damping' | 'bit-flip';
  readonly capacity: number;
  readonly noise: number;
  readonly fidelity: number;
}

/** A quantum state represented as a density matrix with purity. */
export interface QuantumState {
  readonly density: number[][];
  readonly purity: number;
  readonly dimension: number;
}

/** Information-theoretic measures over a state or channel. */
export interface InfoMeasure {
  readonly entropy: number;
  readonly mutualInfo: number;
  readonly coherent: number;
  readonly relativeEntropy: number;
}

/** Ensemble of quantum states for Holevo bound computation. */
export interface Ensemble {
  readonly states: { probability: number; state: number[] }[];
  readonly size: number;
}

export class QuantumInformation {
  private _channels: Map<string, QuantumChannel> = new Map();
  private _states: QuantumState[] = [];
  private _measures: InfoMeasure[] = [];
  private _history: string[] = [];
  private _counter = 0;

  constructor() {
    this._initializeChannels();
  }

  get channelCount(): number {
    return this._channels.size;
  }

  get stateCount(): number {
    return this._states.length;
  }

  get measureCount(): number {
    return this._measures.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  private _initializeChannels(): void {
    this._channels.set('depolarizing', { type: 'depolarizing', capacity: 0.5, noise: 0.1, fidelity: 0.9 });
    this._channels.set('dephasing', { type: 'dephasing', capacity: 0.7, noise: 0.05, fidelity: 0.95 });
    this._channels.set('amplitude-damping', { type: 'amplitude-damping', capacity: 0.3, noise: 0.2, fidelity: 0.8 });
    this._channels.set('bit-flip', { type: 'bit-flip', capacity: 0.6, noise: 0.08, fidelity: 0.92 });
  }

  public vonNeumannEntropy(density: number[][]): number {
    if (density.length === 0) return 0;
    let entropy = 0;
    for (let i = 0; i < density.length; i++) {
      const v = density[i][i] ?? 0;
      if (v > 0) entropy -= v * Math.log2(v);
    }
    this._recordHistory(`vonNeumannEntropy(H=${entropy.toFixed(3)})`);
    return entropy;
  }

  public quantumMutualInfo(stateAB: number[][]): number {
    const n = stateAB.length;
    const half = Math.floor(n / 2);
    const stateA: number[][] = [[0, 0], [0, 0]];
    const stateB: number[][] = [[0, 0], [0, 0]];
    for (let i = 0; i < half; i++) {
      stateA[0][0] += stateAB[i][i] ?? 0;
      stateA[1][1] += stateAB[i + half]?.[i + half] ?? 0;
    }
    for (let i = half; i < n; i++) {
      stateB[0][0] += stateAB[i][i] ?? 0;
    }
    const mi = this.vonNeumannEntropy(stateA) + this.vonNeumannEntropy(stateB) - this.vonNeumannEntropy(stateAB);
    this._recordHistory(`quantumMutualInfo(I=${mi.toFixed(3)})`);
    return mi;
  }

  public coherentInformation(state: number[][]): number {
    const entropy = this.vonNeumannEntropy(state);
    let condEntropy = entropy * 0.5;
    const coherent = condEntropy < entropy ? entropy - condEntropy : 0;
    this._recordHistory(`coherentInformation(Ic=${coherent.toFixed(3)})`);
    return coherent;
  }

  public holevoBound(ensemble: Ensemble): number {
    const avg: number[] = ensemble.states[0]?.state.map(() => 0) ?? [];
    let H = 0;
    for (const s of ensemble.states) {
      H -= s.probability * Math.log2(s.probability);
      for (let i = 0; i < s.state.length; i++) {
        avg[i] = (avg[i] ?? 0) + s.probability * s.state[i];
      }
    }
    let Havg = 0;
    for (const v of avg) {
      if (v > 0) Havg -= v * Math.log2(v);
    }
    const bound = H + Havg;
    this._recordHistory(`holevoBound(χ=${bound.toFixed(3)})`);
    return bound;
  }

  public quantumCapacity(channel: QuantumChannel): number {
    const capacity = Math.max(0, 1 - channel.noise * 2);
    this._recordHistory(`quantumCapacity(${channel.type}=${capacity.toFixed(3)})`);
    return capacity;
  }

  public classicalCapacity(channel: QuantumChannel): number {
    const capacity = Math.max(0, 1 - channel.noise);
    this._recordHistory(`classicalCapacity(${channel.type}=${capacity.toFixed(3)})`);
    return capacity;
  }

  public entanglementAssistedCapacity(channel: QuantumChannel): number {
    const capacity = 2 * this.classicalCapacity(channel);
    this._recordHistory(`entanglementAssistedCapacity(${channel.type}=${capacity.toFixed(3)})`);
    return capacity;
  }

  public degradable(channel: QuantumChannel): { degradable: boolean; conjugate: boolean } {
    const degradable = channel.noise < 0.5;
    this._recordHistory(`degradable(${channel.type}=${degradable})`);
    return { degradable, conjugate: !degradable };
  }

  public quantumDataProcessing(channel: QuantumChannel): { inputFidelity: number; outputFidelity: number; loss: number } {
    const inputFidelity = 1;
    const outputFidelity = channel.fidelity;
    this._recordHistory(`quantumDataProcessing(${channel.type})`);
    return { inputFidelity, outputFidelity, loss: inputFidelity - outputFidelity };
  }

  public noCloning(theorem: { state: number[] }): { cloned: boolean; reason: string } {
    this._recordHistory('noCloning()');
    return { cloned: false, reason: 'quantum no-cloning theorem forbids perfect cloning of arbitrary unknown states' };
  }

  public noSignaling(state: { entangled: boolean }): { signaling: boolean; speed: number } {
    this._recordHistory('noSignaling()');
    return { signaling: false, speed: 0 };
  }

  public quantumFidelity(state1: number[], state2: number[]): number {
    const n = Math.min(state1.length, state2.length);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Math.sqrt(Math.abs(state1[i] * state2[i]));
    const fid = sum * sum;
    this._recordHistory(`quantumFidelity(F=${fid.toFixed(3)})`);
    return fid;
  }

  public traceDistance(state1: number[], state2: number[]): number {
    const n = Math.min(state1.length, state2.length);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Math.abs(state1[i] - state2[i]);
    const td = sum / 2;
    this._recordHistory(`traceDistance(D=${td.toFixed(3)})`);
    return td;
  }

  public relativeEntropy(state1: number[], state2: number[]): number {
    const n = Math.min(state1.length, state2.length);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (state1[i] > 0 && state2[i] > 0) {
        sum += state1[i] * Math.log2(state1[i] / state2[i]);
      }
    }
    this._recordHistory(`relativeEntropy(D=${sum.toFixed(3)})`);
    return sum;
  }

  public teleportationCapacity(channel: QuantumChannel): number {
    const capacity = Math.max(0, 1 - channel.noise * 1.5);
    this._recordHistory(`teleportationCapacity(${channel.type}=${capacity.toFixed(3)})`);
    return capacity;
  }

  public registerState(density: number[][]): QuantumState {
    let purity = 0;
    for (let i = 0; i < density.length; i++) {
      for (let j = 0; j < density[i].length; j++) {
        const dji = density[j] ? density[j][i] : 0;
        purity += density[i][j] * dji;
      }
    }
    const state: QuantumState = { density: density.map(r => [...r]), purity, dimension: density.length };
    this._states.push(state);
    return state;
  }

  public storeMeasure(measure: InfoMeasure): void {
    this._measures.push({ ...measure });
    if (this._measures.length > 200) this._measures.shift();
  }

  public measures(): InfoMeasure[] {
    return this._measures.map(m => ({ ...m }));
  }

  public channels(): QuantumChannel[] {
    return Array.from(this._channels.values()).map(c => ({ ...c }));
  }

  public states(): QuantumState[] {
    return this._states.map(s => ({ ...s, density: s.density.map(r => [...r]) }));
  }

  public lastMeasure(): InfoMeasure | null {
    return this._measures.length > 0 ? { ...this._measures[this._measures.length - 1] } : null;
  }

  public lastState(): QuantumState | null {
    return this._states.length > 0 ? { ...this._states[this._states.length - 1], density: this._states[this._states.length - 1].density.map(r => [...r]) } : null;
  }

  public summary(): { channels: number; states: number; measures: number; historyLength: number; counter: number } {
    return {
      channels: this._channels.size,
      states: this._states.length,
      measures: this._measures.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      channels: this._channels.size,
      states: this._states.length,
      measures: this._measures.length,
      history: [...this._history],
      channelTypes: Array.from(this._channels.values()).map(c => c.type),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const c of this._channels.values()) {
      if (c.noise < 0 || c.noise > 1) issues.push(`channel ${c.type}: noise out of [0,1]`);
      if (c.fidelity < 0 || c.fidelity > 1) issues.push(`channel ${c.type}: fidelity out of [0,1]`);
      if (c.capacity < 0) issues.push(`channel ${c.type}: negative capacity`);
    }
    for (const s of this._states) {
      if (s.purity < 0 || s.purity > 1) issues.push('state: purity out of [0,1]');
      if (s.dimension !== s.density.length) issues.push('state: dimension mismatch with density matrix');
    }
    return { valid: issues.length === 0, issues };
  }

  public channelCapacityComparison(): {
    byType: { type: string; quantum: number; classical: number; assisted: number }[];
    bestClassical: string;
    bestQuantum: string;
  } {
    const rows = Array.from(this._channels.values()).map(c => ({
      type: c.type,
      quantum: this.quantumCapacity(c),
      classical: this.classicalCapacity(c),
      assisted: this.entanglementAssistedCapacity(c),
    }));
    const bestClassical = rows.reduce((max, r) => (r.classical > max.classical ? r : max), rows[0] ?? { type: 'none', quantum: 0, classical: 0, assisted: 0 }).type;
    const bestQuantum = rows.reduce((max, r) => (r.quantum > max.quantum ? r : max), rows[0] ?? { type: 'none', quantum: 0, classical: 0, assisted: 0 }).type;
    return { byType: rows, bestClassical, bestQuantum };
  }

  public entropyTradeoff(state: number[][]): {
    vonNeumann: number;
    coherent: number;
    mutual: number;
    purity: number;
  } {
    const vonNeumann = this.vonNeumannEntropy(state);
    const coherent = this.coherentInformation(state);
    const mutual = this.quantumMutualInfo(state);
    let purity = 0;
    for (let i = 0; i < state.length; i++) {
      for (let j = 0; j < state[i].length; j++) {
        const dji = state[j] ? state[j][i] : 0;
        purity += state[i][j] * dji;
      }
    }
    return { vonNeumann, coherent, mutual, purity };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    channels: number;
    states: number;
    measures: number;
    history: string[];
  }> {
    return {
      id: `qinfo-${Date.now()}-${this._counter}`,
      payload: {
        channels: this._channels.size,
        states: this._states.length,
        measures: this._measures.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['quantum_computing', 'information', 'result'],
        priority: 0.85,
        phase: 'analysis',
      },
    };
  }

  public reset(): void {
    this._channels.clear();
    this._initializeChannels();
    this._states = [];
    this._measures = [];
    this._history = [];
    this._counter = 0;
  }
}
