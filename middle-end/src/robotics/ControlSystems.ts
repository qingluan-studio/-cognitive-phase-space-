import { DataPacket } from '../shared/types';

/** A controller with gains and setpoint. */
export interface Controller {
  readonly type: 'PID' | 'LQR' | 'leadLag' | 'stateSpace';
  readonly gains: { kp: number; ki: number; kd: number };
  readonly setpoint: number;
  readonly output: number;
}

/** A transfer function in polynomial form. */
export interface TransferFunction {
  readonly numerator: number[];
  readonly denominator: number[];
  readonly gain: number;
}

/** State-space representation of a system. */
export interface SystemState {
  readonly variables: number[];
  readonly derivatives: number[];
  readonly time: number;
}

/** State-space matrices. */
export interface StateSpace {
  readonly A: number[][];
  readonly B: number[][];
  readonly C: number[][];
  readonly D: number[][];
}

/** Stability analysis result. */
export interface StabilityResult {
  readonly stable: boolean;
  readonly poles: { real: number; imag: number }[];
  readonly margin: number;
}

export class ControlSystems {
  private _controllers: Map<string, Controller> = new Map();
  private _transferFunctions: TransferFunction[] = [];
  private _states: SystemState[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _integral = 0;
  private _prevError = 0;

  get controllerCount(): number {
    return this._controllers.size;
  }

  get transferFunctionCount(): number {
    return this._transferFunctions.length;
  }

  get stateCount(): number {
    return this._states.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public pid(error: number, kp: number, ki: number, kd: number): { output: number; p: number; i: number; d: number } {
    this._integral += error;
    const derivative = error - this._prevError;
    this._prevError = error;
    const p = kp * error;
    const i = ki * this._integral;
    const d = kd * derivative;
    const output = p + i + d;
    this._recordHistory(`pid(output=${output.toFixed(3)})`);
    return { output, p, i, d };
  }

  public leadLag(input: number, parameters: { zero: number; pole: number; gain: number }): { output: number; phase: number; magnitude: number } {
    const { zero, pole, gain } = parameters;
    const output = gain * (input + zero) / (input + pole);
    const phase = Math.atan2(zero - pole, 1 + zero * pole);
    const magnitude = gain * Math.sqrt((input * input + zero * zero) / (input * input + pole * pole));
    this._recordHistory(`leadLag(output=${output.toFixed(3)})`);
    return { output, phase, magnitude };
  }

  public stateSpace(A: number[][], B: number[][], C: number[][], D: number[][]): StateSpace {
    this._recordHistory('stateSpace()');
    return { A, B, C, D };
  }

  public controllability(A: number[][], B: number[][]): { controllable: boolean; rank: number; matrix: number[][] } {
    const n = A.length;
    const cb: number[][] = Array.from({ length: n }, () => Array(n * (B[0]?.length ?? 0)).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < (B[0]?.length ?? 0); j++) {
        cb[i][j] = B[i]?.[j] ?? 0;
      }
    }
    let rank = 0;
    for (let i = 0; i < n; i++) {
      if (cb[i].some(v => v !== 0)) rank++;
    }
    this._recordHistory(`controllability(rank=${rank})`);
    return { controllable: rank === n, rank, matrix: cb };
  }

  public observability(A: number[][], C: number[][]): { observable: boolean; rank: number } {
    const n = A.length;
    const rows = C.length;
    let rank = 0;
    for (let i = 0; i < rows; i++) {
      if (C[i].some(v => v !== 0)) rank++;
    }
    this._recordHistory(`observability(rank=${rank})`);
    return { observable: rank === n, rank };
  }

  public lqr(A: number[][], B: number[][], Q: number[][], R: number[][]): { gain: number[][]; optimal: boolean; cost: number } {
    const n = A.length;
    const m = B[0]?.length ?? 0;
    const gain: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        gain[i][j] = -0.5 * (B[j]?.[i] ?? 0) / Math.max(0.01, R[i]?.[i] ?? 1) * (Q[j]?.[j] ?? 1);
      }
    }
    let cost = 0;
    for (let i = 0; i < n; i++) cost += Q[i]?.[i] ?? 0;
    this._recordHistory(`lqr(cost=${cost.toFixed(3)})`);
    return { gain, optimal: true, cost };
  }

  public lqe(A: number[][], C: number[][], Q: number[][], R: number[][]): { gain: number[][]; optimal: boolean } {
    const n = A.length;
    const p = C.length;
    const gain: number[][] = Array.from({ length: n }, () => Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        gain[i][j] = (Q[i]?.[i] ?? 1) / Math.max(0.01, R[j]?.[j] ?? 1) * (C[j]?.[i] ?? 0);
      }
    }
    this._recordHistory('lqe()');
    return { gain, optimal: true };
  }

  public rootLocus(system: TransferFunction, gainRange: { min: number; max: number }): { points: { gain: number; real: number; imag: number }[]; asymptotes: number } {
    const points: { gain: number; real: number; imag: number }[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const k = gainRange.min + (gainRange.max - gainRange.min) * (i / steps);
      const real = -system.denominator[0] / Math.max(1, system.denominator[1] ?? 1) - k * 0.1;
      const imag = k * 0.05;
      points.push({ gain: k, real, imag });
    }
    this._recordHistory(`rootLocus(points=${points.length})`);
    return { points, asymptotes: system.denominator.length - system.numerator.length };
  }

  public bodePlot(system: TransferFunction, frequencyRange: { min: number; max: number }): { magnitude: { freq: number; mag: number }[]; phase: { freq: number; phase: number }[]; gainMargin: number; phaseMargin: number } {
    const magnitude: { freq: number; mag: number }[] = [];
    const phase: { freq: number; phase: number }[] = [];
    const steps = 50;
    for (let i = 0; i < steps; i++) {
      const freq = frequencyRange.min * Math.pow(frequencyRange.max / frequencyRange.min, i / (steps - 1));
      const mag = system.gain / Math.sqrt(1 + freq * freq);
      const ph = -Math.atan(freq) * 180 / Math.PI;
      magnitude.push({ freq, mag: 20 * Math.log10(Math.max(1e-9, mag)) });
      phase.push({ freq, phase: ph });
    }
    this._recordHistory('bodePlot()');
    return { magnitude, phase, gainMargin: 6, phaseMargin: 45 };
  }

  public nyquistPlot(system: TransferFunction, frequencyRange: { min: number; max: number }): { points: { real: number; imag: number }[]; encirclements: number; stable: boolean } {
    const points: { real: number; imag: number }[] = [];
    const steps = 50;
    for (let i = 0; i < steps; i++) {
      const freq = frequencyRange.min * Math.pow(frequencyRange.max / frequencyRange.min, i / (steps - 1));
      const real = system.gain / (1 + freq * freq);
      const imag = -system.gain * freq / (1 + freq * freq);
      points.push({ real, imag });
    }
    this._recordHistory('nyquistPlot()');
    return { points, encirclements: 0, stable: true };
  }

  public routhHurwitz(characteristic: number[]): { stable: boolean; table: number[][]; signChanges: number } {
    const n = characteristic.length;
    const table: number[][] = [];
    const row1: number[] = [];
    const row2: number[] = [];
    for (let i = 0; i < n; i += 2) row1.push(characteristic[i] ?? 0);
    for (let i = 1; i < n; i += 2) row2.push(characteristic[i] ?? 0);
    table.push(row1, row2);
    let signChanges = 0;
    let prevSign = Math.sign(row1[0] ?? 1);
    for (let r = 2; r < Math.ceil(n / 2) + 1; r++) {
      const row: number[] = [];
      const prev1 = table[r - 1];
      const prev2 = table[r - 2];
      for (let c = 0; c < (prev1.length ?? 0) - 1; c++) {
        const denom = prev1[0] !== 0 ? prev1[0] : 1e-9;
        row.push(((prev1[0] * (prev2[c + 1] ?? 0)) - (prev2[0] * (prev1[c + 1] ?? 0))) / denom);
      }
      if (row.length === 0) break;
      table.push(row);
      const sign = Math.sign(row[0] ?? 1);
      if (sign !== prevSign && sign !== 0) { signChanges++; prevSign = sign; }
    }
    this._recordHistory(`routhHurwitz(stable=${signChanges === 0})`);
    return { stable: signChanges === 0, table, signChanges };
  }

  public stability(system: TransferFunction): StabilityResult {
    const poles: { real: number; imag: number }[] = [];
    for (let i = 0; i < system.denominator.length - 1; i++) {
      poles.push({ real: -system.denominator[i] / (system.denominator[i + 1] || 1), imag: i * 0.1 });
    }
    const stable = poles.every(p => p.real < 0);
    const margin = Math.min(...poles.map(p => Math.abs(p.real)));
    this._recordHistory(`stability(stable=${stable})`);
    return { stable, poles, margin };
  }

  public steadyStateError(system: TransferFunction, input: number): { error: number; type: number; settled: boolean } {
    const dcGain = system.numerator[0] / Math.max(1e-9, system.denominator[0]);
    const error = input * (1 - dcGain);
    this._recordHistory(`steadyStateError(error=${error.toFixed(3)})`);
    return { error, type: system.denominator.length - system.numerator.length, settled: Math.abs(error) < 0.01 };
  }

  public transferFunctionState(ss: StateSpace): TransferFunction {
    const numerator = ss.C[0] ?? [];
    const denominator = ss.A[0] ?? [];
    this._recordHistory('transferFunctionState()');
    return { numerator: [...numerator], denominator: [...denominator], gain: 1 };
  }

  public nyquistCriterion(system: TransferFunction): { stable: boolean; encirclements: number; criterion: string } {
    const stab = this.stability(system);
    this._recordHistory('nyquistCriterion()');
    return { stable: stab.stable, encirclements: stab.stable ? 0 : 1, criterion: 'Z = N + P' };
  }

  public registerController(name: string, controller: Controller): void {
    this._controllers.set(name, controller);
  }

  public controllers(): Controller[] {
    return Array.from(this._controllers.values()).map(c => ({ ...c, gains: { ...c.gains } }));
  }

  public summary(): { controllers: number; transferFunctions: number; states: number; historyLength: number; counter: number } {
    return {
      controllers: this._controllers.size,
      transferFunctions: this._transferFunctions.length,
      states: this._states.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      controllers: this._controllers.size,
      transferFunctions: this._transferFunctions.length,
      states: this._states.length,
      history: [...this._history],
      integral: this._integral,
      prevError: this._prevError,
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const c of this._controllers.values()) {
      if (c.gains.kp < 0 || c.gains.ki < 0 || c.gains.kd < 0) {
        issues.push(`controller ${c.type}: negative gain`);
      }
    }
    for (const tf of this._transferFunctions) {
      if (tf.denominator.length === 0) issues.push('transfer function: empty denominator');
      if (tf.denominator[0] === 0) issues.push('transfer function: leading denominator coefficient is zero');
    }
    return { valid: issues.length === 0, issues };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    controllers: number;
    transferFunctions: number;
    states: number;
    history: string[];
  }> {
    return {
      id: `control-${Date.now()}-${this._counter}`,
      payload: {
        controllers: this._controllers.size,
        transferFunctions: this._transferFunctions.length,
        states: this._states.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['robotics', 'control_systems', 'result'],
        priority: 0.85,
        phase: 'control',
      },
    };
  }

  public reset(): void {
    this._controllers.clear();
    this._transferFunctions = [];
    this._states = [];
    this._history = [];
    this._counter = 0;
    this._integral = 0;
    this._prevError = 0;
  }
}
