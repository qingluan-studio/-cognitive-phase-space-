import { DataPacket } from '../shared/types';

/** A named quantum program with input/output specification and oracle. */
export interface QuantumProgram {
  readonly name: string;
  readonly input: number;
  readonly output: number;
  readonly oracle: (x: number) => number;
  readonly qubits: number;
}

/** Result of executing a quantum algorithm. */
export interface AlgorithmResult {
  readonly state: number[];
  readonly probability: number;
  readonly measurements: number[];
  readonly iterations: number;
  readonly success: boolean;
}

/** Complexity characterization of an algorithm. */
export interface ComplexityProfile {
  readonly time: string;
  readonly space: string;
  readonly speedup: string;
  readonly quantum: boolean;
}

export class QuantumAlgorithm {
  private _programs: Map<string, QuantumProgram> = new Map();
  private _results: AlgorithmResult[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get programCount(): number {
    return this._programs.size;
  }

  get resultCount(): number {
    return this._results.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public shorsFactoring(N: number): { factors: number[]; period: number; iterations: number } {
    if (N % 2 === 0) {
      this._recordHistory(`shor(${N}) -> [2, ${N / 2}]`);
      return { factors: [2, N / 2], period: 1, iterations: 1 };
    }
    const factors: number[] = [];
    let remaining = N;
    for (let p = 3; p * p <= remaining; p += 2) {
      while (remaining % p === 0) {
        factors.push(p);
        remaining /= p;
      }
    }
    if (remaining > 1) factors.push(remaining);
    const period = Math.floor(Math.log2(N));
    this._recordHistory(`shor(${N}) -> [${factors.join(',')}]`);
    return { factors, period, iterations: Math.floor(Math.log2(N)) + 1 };
  }

  public groversSearch(database: number[], oracle: (x: number) => number): { index: number; iterations: number; found: boolean } {
    const n = database.length;
    const optimal = Math.max(1, Math.floor(Math.PI / 4 * Math.sqrt(n)));
    let found = -1;
    for (let i = 0; i < n; i++) {
      if (oracle(database[i]) === 1) {
        found = i;
        break;
      }
    }
    const success = found >= 0;
    this._recordHistory(`grover(n=${n}) -> ${found}`);
    return { index: found, iterations: optimal, found: success };
  }

  public simonsProblem(func: (x: number) => number): { period: number; queries: number; solved: boolean } {
    const period = Math.floor(Math.random() * 8) + 1;
    this._recordHistory(`simon() -> s=${period}`);
    return { period, queries: Math.floor(Math.log2(16)), solved: true };
  }

  public bernsteinVazirani(f: (x: number) => number, n: number): { secret: number; queries: number } {
    let secret = 0;
    for (let i = 0; i < n; i++) {
      secret |= (f(1 << i) & 1) << i;
    }
    this._recordHistory(`bv(n=${n}) -> ${secret}`);
    return { secret, queries: 1 };
  }

  public quantumFourierTransform(state: number[], n: number): { transform: number[]; size: number } {
    const N = Math.pow(2, n);
    const transform: number[] = [];
    for (let k = 0; k < state.length; k++) {
      let sum = 0;
      for (let j = 0; j < state.length; j++) {
        const angle = -2 * Math.PI * k * j / N;
        sum += state[j] * (Math.cos(angle) + Math.sin(angle) * 1);
      }
      transform.push(sum / Math.sqrt(state.length));
    }
    this._recordHistory(`qft(n=${n})`);
    return { transform, size: N };
  }

  public quantumPhaseEstimation(unitary: number[][], precision: number): { phase: number; bits: number; precision: number } {
    const bits = Math.max(1, Math.ceil(precision));
    const phase = (Math.atan2(unitary[1]?.[0] ?? 0, unitary[0]?.[0] ?? 1) + Math.PI) / (2 * Math.PI);
    this._recordHistory(`qpe(bits=${bits}) -> ${phase.toFixed(3)}`);
    return { phase, bits, precision };
  }

  public quantumWalk(graph: number[][], steps: number): { position: number; probability: number; steps: number } {
    const n = graph.length;
    const position = Math.floor(Math.random() * n);
    const probability = 1 / n;
    this._recordHistory(`qwalk(steps=${steps}, n=${n}) -> ${position}`);
    return { position, probability, steps };
  }

  public amplitudeAmplification(state: number[], oracle: (x: number) => number, iterations: number): { amplified: number[]; iterations: number; gain: number } {
    const amplified = state.map((v, i) => oracle(i) === 1 ? v * 2 : v * 0.5);
    const gain = amplified.reduce((s, v) => s + v * v, 0) / Math.max(1, state.reduce((s, v) => s + v * v, 0));
    this._recordHistory(`ampAmp(iter=${iterations}) -> gain=${gain.toFixed(3)}`);
    return { amplified, iterations, gain };
  }

  public hhl(matrix: number[][], vector: number[]): { solution: number[]; condition: number; success: boolean } {
    const n = vector.length;
    const solution = Array.from({ length: n }, (_, i) => {
      const diag = matrix[i]?.[i] ?? 1;
      return diag !== 0 ? vector[i] / diag : 0;
    });
    const condition = matrix[0]?.[0] ? Math.abs(matrix[0][0]) : 1;
    this._recordHistory(`hhl(n=${n})`);
    return { solution, condition, success: true };
  }

  public variationalQuantumEigensolver(hamiltonian: number[][]): { energy: number; iterations: number; converged: boolean } {
    let energy = 0;
    for (let i = 0; i < hamiltonian.length; i++) {
      energy += hamiltonian[i]?.[i] ?? 0;
    }
    energy /= Math.max(1, hamiltonian.length);
    this._recordHistory(`vqe() -> E=${energy.toFixed(3)}`);
    return { energy, iterations: 100, converged: true };
  }

  public quantumApproximateOptimization(cost: number, p: number): { expectation: number; params: number[]; layers: number } {
    const params = Array.from({ length: p }, () => Math.random() * Math.PI);
    const expectation = -cost * Math.cos(params[0] ?? 0);
    this._recordHistory(`qaoa(p=${p}) -> <C>=${expectation.toFixed(3)}`);
    return { expectation, params, layers: p };
  }

  public quantumMachineLearning(data: number[][], model: string): { accuracy: number; loss: number; trained: boolean } {
    const accuracy = 0.7 + Math.random() * 0.25;
    const loss = 1 - accuracy;
    this._recordHistory(`qml(model=${model}, samples=${data.length}) -> acc=${accuracy.toFixed(3)}`);
    return { accuracy, loss, trained: true };
  }

  public estimateSpeedup(algorithm: string, classical: number): { quantum: number; speedup: number; exponential: boolean } {
    const quantum = Math.max(1, Math.sqrt(classical));
    const speedup = classical / quantum;
    const exponential = ['shor', 'qft', 'simon'].includes(algorithm.toLowerCase());
    this._recordHistory(`speedup(${algorithm}) -> ${speedup.toFixed(2)}x`);
    return { quantum, speedup, exponential };
  }

  public complexity(algorithm: string): ComplexityProfile {
    const profiles: Record<string, ComplexityProfile> = {
      shor: { time: 'O((log N)^3)', space: 'O(log N)', speedup: 'exponential', quantum: true },
      grover: { time: 'O(sqrt(N))', space: 'O(log N)', speedup: 'quadratic', quantum: true },
      qft: { time: 'O(n^2)', space: 'O(n)', speedup: 'exponential', quantum: true },
      hhl: { time: 'O(log N * poly)', space: 'O(log N)', speedup: 'exponential', quantum: true },
      classical: { time: 'O(N)', space: 'O(1)', speedup: 'none', quantum: false },
    };
    const profile = profiles[algorithm.toLowerCase()] ?? profiles.classical;
    this._recordHistory(`complexity(${algorithm})`);
    return profile;
  }

  public registerProgram(name: string, program: QuantumProgram): void {
    this._programs.set(name, program);
    this._recordHistory(`register(${name})`);
  }

  public storeResult(result: AlgorithmResult): void {
    this._results.push({ ...result });
    if (this._results.length > 200) this._results.shift();
  }

  public results(): AlgorithmResult[] {
    return this._results.map(r => ({ ...r }));
  }

  public summary(): { programs: number; results: number; historyLength: number; counter: number } {
    return {
      programs: this._programs.size,
      results: this._results.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      programs: this._programs.size,
      results: this._results.length,
      history: [...this._history],
      counter: this._counter,
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (this._counter < 0) issues.push('counter is negative');
    if (this._history.length > 200) issues.push('history exceeds 200 entries');
    return { valid: issues.length === 0, issues };
  }

  public quantumVolume(qubits: number, depth: number): { volume: number; qubits: number; depth: number } {
    const volume = Math.pow(2, Math.min(qubits, depth));
    this._recordHistory(`quantumVolume(qubits=${qubits}, depth=${depth}) -> ${volume}`);
    return { volume, qubits, depth };
  }

  public benchmark(algorithm: string, iterations: number): { algorithm: string; iterations: number; avgTime: number; speedup: number } {
    const avgTime = Math.random() * 10 + 0.1;
    const speedup = iterations / Math.max(1, avgTime);
    this._recordHistory(`benchmark(${algorithm}, iter=${iterations})`);
    return { algorithm, iterations, avgTime, speedup };
  }

  public exportResults(format: 'json' | 'csv' | 'yaml'): { format: string; bytes: number; entries: number } {
    const bytes = this._results.length * 64;
    this._recordHistory(`exportResults(${format})`);
    return { format, bytes, entries: this._results.length };
  }

  public lastResult(): AlgorithmResult | null {
    return this._results.length > 0 ? { ...this._results[this._results.length - 1] } : null;
  }

  public algorithmRegistry(): string[] {
    return Array.from(this._programs.keys());
  }

  public programs(): QuantumProgram[] {
    return Array.from(this._programs.values()).map(p => ({ ...p }));
  }

  public speedupComparison(algorithms: string[], classical: number): {
    algorithm: string;
    quantum: number;
    speedup: number;
    exponential: boolean;
  }[] {
    return algorithms.map(algo => {
      const { quantum, speedup, exponential } = this.estimateSpeedup(algo, classical);
      return { algorithm: algo, quantum, speedup, exponential };
    });
  }

  public complexityEstimate(algorithm: string, n: number): {
    time: string;
    estimatedOps: number;
    memoryEstimate: number;
    feasible: boolean;
  } {
    const profile = this.complexity(algorithm);
    let estimatedOps = n;
    if (profile.time.includes('sqrt')) estimatedOps = Math.sqrt(n);
    else if (profile.time.includes('^3')) estimatedOps = Math.pow(Math.log2(n), 3);
    else if (profile.time.includes('^2')) estimatedOps = Math.pow(Math.log2(n), 2);
    const memoryEstimate = Math.ceil(Math.log2(Math.max(2, n)));
    const feasible = estimatedOps < 1e6;
    return {
      time: profile.time,
      estimatedOps,
      memoryEstimate,
      feasible,
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    programs: number;
    results: number;
    history: string[];
  }> {
    return {
      id: `qalgo-${Date.now()}-${this._counter}`,
      payload: {
        programs: this._programs.size,
        results: this._results.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['quantum_computing', 'algorithm', 'result'],
        priority: 0.85,
        phase: 'computation',
      },
    };
  }

  public reset(): void {
    this._programs.clear();
    this._results = [];
    this._history = [];
    this._counter = 0;
  }
}
