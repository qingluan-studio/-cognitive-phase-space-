import { DataPacket } from '../shared/types';

/** Annealing schedule from initial to final Hamiltonian over time. */
export interface AnnealSchedule {
  readonly initial: number;
  readonly final: number;
  readonly time: number;
  readonly points: { time: number; value: number }[];
}

/** Ising model with variables and couplings. */
export interface IsingModel {
  readonly variables: number;
  readonly couplings: { i: number; j: number; strength: number }[];
  readonly fields: number[];
}

/** Result of an annealing run. */
export interface AnnealResult {
  readonly energy: number;
  readonly state: number[];
  readonly success: boolean;
  readonly iterations: number;
  readonly annealTime: number;
}

/** QUBO problem matrix. */
export interface QUBO {
  readonly matrix: number[][];
  readonly variables: number;
}

export class QuantumAnnealing {
  private _schedules: Map<string, AnnealSchedule> = new Map();
  private _models: IsingModel[] = [];
  private _results: AnnealResult[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get scheduleCount(): number {
    return this._schedules.size;
  }

  get modelCount(): number {
    return this._models.length;
  }

  get resultCount(): number {
    return this._results.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public hamiltonian(initial: number, final: number): { HInitial: number; HFinal: number; gap: number } {
    const gap = Math.abs(final - initial);
    this._recordHistory(`hamiltonian(init=${initial}, final=${final})`);
    return { HInitial: initial, HFinal: final, gap };
  }

  public anneal(model: IsingModel, schedule: AnnealSchedule, time: number): AnnealResult {
    const state = Array.from({ length: model.variables }, () => (Math.random() > 0.5 ? 1 : -1));
    let energy = 0;
    for (const c of model.couplings) {
      energy += c.strength * (state[c.i] ?? 0) * (state[c.j] ?? 0);
    }
    for (let i = 0; i < model.fields.length; i++) {
      energy += model.fields[i] * (state[i] ?? 0);
    }
    const result: AnnealResult = {
      energy,
      state: [...state],
      success: energy < 0,
      iterations: 1000,
      annealTime: time,
    };
    this._results.push(result);
    this._recordHistory(`anneal(vars=${model.variables}, t=${time})`);
    return result;
  }

  public qubo(matrix: number[][]): QUBO {
    const variables = matrix.length;
    this._recordHistory(`qubo(vars=${variables})`);
    return { matrix: matrix.map(r => [...r]), variables };
  }

  public ising(h: number[], J: { i: number; j: number; strength: number }[]): IsingModel {
    const model: IsingModel = {
      variables: h.length,
      couplings: J.map(c => ({ ...c })),
      fields: [...h],
    };
    this._models.push(model);
    this._recordHistory(`ising(vars=${h.length})`);
    return model;
  }

  public isingToQubo(ising: IsingModel): QUBO {
    const n = ising.variables;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) matrix[i][i] = -2 * ising.fields[i];
    for (const c of ising.couplings) {
      matrix[c.i][c.j] = 4 * c.strength;
      matrix[c.i][c.i] -= 2 * c.strength;
      matrix[c.j][c.j] -= 2 * c.strength;
    }
    this._recordHistory('isingToQubo()');
    return { matrix, variables: n };
  }

  public quboToIsing(qubo: QUBO): IsingModel {
    const n = qubo.variables;
    const h: number[] = Array(n).fill(0);
    const J: { i: number; j: number; strength: number }[] = [];
    for (let i = 0; i < n; i++) {
      h[i] = qubo.matrix[i][i] / 2;
      for (let j = i + 1; j < n; j++) {
        if (qubo.matrix[i][j] !== 0) {
          J.push({ i, j, strength: qubo.matrix[i][j] / 4 });
        }
      }
    }
    const model: IsingModel = { variables: n, couplings: J, fields: h };
    this._models.push(model);
    this._recordHistory('quboToIsing()');
    return model;
  }

  public embedding(problem: { variables: number }, hardware: { qubits: number; couplers: number }): { embedded: boolean; chainLength: number; qubitsUsed: number } {
    const chainLength = Math.ceil(problem.variables / Math.max(1, Math.sqrt(hardware.qubits)));
    const qubitsUsed = problem.variables * chainLength;
    const embedded = qubitsUsed <= hardware.qubits;
    this._recordHistory(`embedding(used=${qubitsUsed})`);
    return { embedded, chainLength, qubitsUsed };
  }

  public chainLength(couplers: { i: number; j: number }[]): { length: number; couplers: number; maxChain: number } {
    const counts: Record<number, number> = {};
    for (const c of couplers) {
      counts[c.i] = (counts[c.i] ?? 0) + 1;
      counts[c.j] = (counts[c.j] ?? 0) + 1;
    }
    const maxChain = Object.values(counts).reduce((m, v) => Math.max(m, v), 0);
    this._recordHistory(`chainLength(max=${maxChain})`);
    return { length: couplers.length, couplers: couplers.length, maxChain };
  }

  public minGap(hamiltonian: { gap: number }, schedule: AnnealSchedule): { gap: number; position: number; critical: boolean } {
    const position = schedule.time / 2;
    const critical = hamiltonian.gap < 0.1;
    this._recordHistory(`minGap(gap=${hamiltonian.gap.toFixed(3)})`);
    return { gap: hamiltonian.gap, position, critical };
  }

  public successProbability(model: IsingModel, schedule: AnnealSchedule): { probability: number; gap: number } {
    const probability = Math.exp(-model.variables / Math.max(1, schedule.time));
    this._recordHistory(`successProbability(p=${probability.toFixed(3)})`);
    return { probability, gap: schedule.final - schedule.initial };
  }

  public spinGlass(variables: number, couplings: { i: number; j: number; strength: number }[]): { model: IsingModel; groundState: number[]; energy: number } {
    const fields = Array(variables).fill(0);
    const model: IsingModel = { variables, couplings, fields };
    this._models.push(model);
    const groundState = Array.from({ length: variables }, () => (Math.random() > 0.5 ? 1 : -1));
    let energy = 0;
    for (const c of couplings) energy += c.strength * (groundState[c.i] ?? 0) * (groundState[c.j] ?? 0);
    this._recordHistory(`spinGlass(vars=${variables})`);
    return { model, groundState, energy };
  }

  public maxCut(graph: { edges: { from: number; to: number; weight: number }[] }): { cut: number; partition: number[]; size: number } {
    const nodes = graph.edges.reduce((m, e) => Math.max(m, e.from, e.to), 0) + 1;
    const partition = Array.from({ length: nodes }, () => (Math.random() > 0.5 ? 0 : 1));
    let cut = 0;
    for (const e of graph.edges) {
      if (partition[e.from] !== partition[e.to]) cut += e.weight;
    }
    this._recordHistory(`maxCut(nodes=${nodes}, cut=${cut})`);
    return { cut, partition, size: nodes };
  }

  public createSchedule(initial: number, final: number, time: number, points: number = 10): AnnealSchedule {
    const schedulePoints = Array.from({ length: points }, (_, i) => {
      const t = (i / (points - 1)) * time;
      const s = i / (points - 1);
      return { time: t, value: initial * (1 - s) + final * s };
    });
    const schedule: AnnealSchedule = { initial, final, time, points: schedulePoints };
    this._schedules.set(`schedule-${this._counter++}`, schedule);
    return schedule;
  }

  public results(): AnnealResult[] {
    return this._results.map(r => ({ ...r, state: [...r.state] }));
  }

  public summary(): { schedules: number; models: number; results: number; historyLength: number } {
    return {
      schedules: this._schedules.size,
      models: this._models.length,
      results: this._results.length,
      historyLength: this._history.length,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      schedules: this._schedules.size,
      models: this._models.length,
      results: this._results.length,
      history: [...this._history],
      counter: this._counter,
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (this._results.length > 0 && this._models.length === 0) {
      issues.push('results exist without models');
    }
    return { valid: issues.length === 0, issues };
  }

  public energyLandscape(model: IsingModel, samples: number): { min: number; max: number; mean: number; samples: number } {
    const energies: number[] = [];
    for (let s = 0; s < samples; s++) {
      const state = Array.from({ length: model.variables }, () => (Math.random() > 0.5 ? 1 : -1));
      let e = 0;
      for (const c of model.couplings) e += c.strength * (state[c.i] ?? 0) * (state[c.j] ?? 0);
      energies.push(e);
    }
    const min = Math.min(...energies);
    const max = Math.max(...energies);
    const mean = energies.reduce((s, e) => s + e, 0) / Math.max(1, energies.length);
    this._recordHistory(`energyLandscape(samples=${samples})`);
    return { min, max, mean, samples };
  }

  public thermalization(model: IsingModel, temperature: number): { magnetization: number; energy: number; temperature: number } {
    const mag = Math.tanh(1 / Math.max(0.01, temperature));
    let energy = 0;
    for (const c of model.couplings) energy -= c.strength * mag * mag;
    this._recordHistory(`thermalization(T=${temperature})`);
    return { magnetization: mag, energy, temperature };
  }

  public annealingTime(model: IsingModel, schedule: AnnealSchedule): { estimated: number; optimal: boolean } {
    const estimated = model.variables * schedule.time * 0.1;
    const optimal = estimated < 1000;
    this._recordHistory(`annealingTime(estimated=${estimated.toFixed(2)})`);
    return { estimated, optimal };
  }

  public bestResult(): AnnealResult | null {
    if (this._results.length === 0) return null;
    return [...this._results].sort((a, b) => a.energy - b.energy)[0];
  }

  public lastResult(): AnnealResult | null {
    return this._results.length > 0 ? { ...this._results[this._results.length - 1], state: [...this._results[this._results.length - 1].state] } : null;
  }

  public schedules(): AnnealSchedule[] {
    return Array.from(this._schedules.values()).map(s => ({ ...s, points: s.points.map(p => ({ ...p })) }));
  }

  public models(): IsingModel[] {
    return this._models.map(m => ({ ...m, couplings: m.couplings.map(c => ({ ...c })), fields: [...m.fields] }));
  }

  public resultStatistics(): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    avgEnergy: number;
    bestEnergy: number;
    avgAnnealTime: number;
  } {
    const total = this._results.length;
    const successful = this._results.filter(r => r.success).length;
    const energies = this._results.map(r => r.energy);
    const times = this._results.map(r => r.annealTime);
    return {
      total,
      successful,
      failed: total - successful,
      successRate: total > 0 ? successful / total : 0,
      avgEnergy: total > 0 ? energies.reduce((s, e) => s + e, 0) / total : 0,
      bestEnergy: total > 0 ? Math.min(...energies) : 0,
      avgAnnealTime: total > 0 ? times.reduce((s, t) => s + t, 0) / total : 0,
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    schedules: number;
    models: number;
    results: number;
    history: string[];
  }> {
    return {
      id: `qanneal-${Date.now()}-${this._counter}`,
      payload: {
        schedules: this._schedules.size,
        models: this._models.length,
        results: this._results.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['quantum_computing', 'annealing', 'result'],
        priority: 0.8,
        phase: 'optimization',
      },
    };
  }

  public reset(): void {
    this._schedules.clear();
    this._models = [];
    this._results = [];
    this._history = [];
    this._counter = 0;
  }
}
