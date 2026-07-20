import { DataPacket } from '../shared/types';

export interface Controller {
  readonly type: 'PID' | 'LQR' | 'leadLag' | 'stateSpace' | 'MPC' | 'adaptive' | 'slidingMode';
  readonly gains: { kp: number; ki: number; kd: number };
  readonly setpoint: number;
  readonly output: number;
}

export interface TransferFunction {
  readonly numerator: number[];
  readonly denominator: number[];
  readonly gain: number;
}

export interface SystemState {
  readonly variables: number[];
  readonly derivatives: number[];
  readonly time: number;
}

export interface StateSpace {
  readonly A: number[][];
  readonly B: number[][];
  readonly C: number[][];
  readonly D: number[][];
}

export interface StabilityResult {
  readonly stable: boolean;
  readonly poles: { real: number; imag: number }[];
  readonly margin: number;
}

export interface FrequencyResponse {
  readonly frequency: number;
  readonly magnitude: number;
  readonly phase: number;
}

export interface ControllerTuning {
  readonly method: 'ziegler-nichols' | 'cohen-coon' | 'pole-placement' | 'optimal';
  readonly gains: { kp: number; ki: number; kd: number };
  readonly processGain: number;
  readonly timeConstant: number;
  readonly deadTime: number;
}

export interface MPCState {
  readonly horizon: number;
  readonly constraints: { min: number[]; max: number[] };
  readonly costWeights: { state: number[]; input: number[] };
  readonly prediction: number[][];
  readonly control: number[];
}

export interface AdaptiveControl {
  readonly parameters: number[];
  readonly estimation: number[];
  readonly adaptationGain: number;
  readonly error: number;
}

export interface SlidingModeControl {
  readonly switchingSurface: number[];
  readonly gain: number;
  readonly slidingVariable: number;
  readonly control: number;
}

export interface Observer {
  readonly type: 'kalman' | 'luenberger' | 'extended';
  readonly estimate: number[];
  readonly error: number[];
  readonly gain: number[][];
}

export class ControlSystems {
  private _controllers: Map<string, Controller> = new Map();
  private _transferFunctions: TransferFunction[] = [];
  private _states: SystemState[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _integral = 0;
  private _prevError = 0;
  private _prevTime = 0;
  private _saturationLimit = 100;

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

  get saturationLimit(): number {
    return this._saturationLimit;
  }

  set saturationLimit(limit: number) {
    this._saturationLimit = limit;
  }

  public pid(error: number, kp: number, ki: number, kd: number): { output: number; p: number; i: number; d: number } {
    this._integral += error;
    const derivative = error - this._prevError;
    this._prevError = error;
    const p = kp * error;
    const i = ki * this._integral;
    const d = kd * derivative;
    let output = p + i + d;
    output = Math.max(-this._saturationLimit, Math.min(this._saturationLimit, output));
    this._recordHistory(`pid(output=${output.toFixed(3)})`);
    return { output, p, i, d };
  }

  public pidWithAntiWindup(error: number, kp: number, ki: number, kd: number, integralLimit: number): { output: number; p: number; i: number; d: number; integral: number } {
    const derivative = error - this._prevError;
    this._prevError = error;
    let newIntegral = this._integral + error;
    newIntegral = Math.max(-integralLimit, Math.min(integralLimit, newIntegral));
    this._integral = newIntegral;
    const p = kp * error;
    const i = ki * this._integral;
    const d = kd * derivative;
    let output = p + i + d;
    output = Math.max(-this._saturationLimit, Math.min(this._saturationLimit, output));
    this._recordHistory(`pidWithAntiWindup(output=${output.toFixed(3)})`);
    return { output, p, i, d, integral: this._integral };
  }

  public pidDerivativeFilter(error: number, kp: number, ki: number, kd: number, filterTime: number): { output: number; p: number; i: number; d: number; filteredDerivative: number } {
    const dt = 0.01;
    const derivative = (error - this._prevError) / dt;
    const filteredDerivative = (filterTime / (filterTime + dt)) * this._prevError + (dt / (filterTime + dt)) * derivative;
    this._integral += error;
    this._prevError = error;
    const p = kp * error;
    const i = ki * this._integral;
    const d = kd * filteredDerivative;
    let output = p + i + d;
    output = Math.max(-this._saturationLimit, Math.min(this._saturationLimit, output));
    this._recordHistory(`pidDerivativeFilter(output=${output.toFixed(3)})`);
    return { output, p, i, d, filteredDerivative };
  }

  public leadLag(input: number, parameters: { zero: number; pole: number; gain: number }): { output: number; phase: number; magnitude: number } {
    const { zero, pole, gain } = parameters;
    const output = gain * (input + zero) / (input + pole);
    const phase = Math.atan2(zero - pole, 1 + zero * pole);
    const magnitude = gain * Math.sqrt((input * input + zero * zero) / (input * input + pole * pole));
    this._recordHistory(`leadLag(output=${output.toFixed(3)})`);
    return { output, phase, magnitude };
  }

  public lagLead(input: number, parameters: { zero1: number; pole1: number; zero2: number; pole2: number; gain: number }): { output: number; phase: number; magnitude: number } {
    const { zero1, pole1, zero2, pole2, gain } = parameters;
    const output = gain * ((input + zero1) * (input + zero2)) / ((input + pole1) * (input + pole2));
    const phase = Math.atan2(zero1 - pole1, 1 + zero1 * pole1) + Math.atan2(zero2 - pole2, 1 + zero2 * pole2);
    const magnitude = gain * Math.sqrt(((input * input + zero1 * zero1) * (input * input + zero2 * zero2)) / ((input * input + pole1 * pole1) * (input * input + pole2 * pole2)));
    this._recordHistory(`lagLead(output=${output.toFixed(3)})`);
    return { output, phase, magnitude };
  }

  public stateSpace(A: number[][], B: number[][], C: number[][], D: number[][]): StateSpace {
    this._recordHistory('stateSpace()');
    return { A, B, C, D };
  }

  public controllability(A: number[][], B: number[][]): { controllable: boolean; rank: number; matrix: number[][] } {
    const n = A.length;
    const m = B[0]?.length ?? 0;
    const cb: number[][] = Array.from({ length: n }, () => Array(n * m).fill(0));
    let current = B;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < m; k++) {
          cb[j][i * m + k] = current[j]?.[k] ?? 0;
        }
      }
      if (i < n - 1) {
        current = this._matrixMultiply(A, current);
      }
    }
    const rank = this._matrixRank(cb);
    this._recordHistory(`controllability(rank=${rank})`);
    return { controllable: rank === n, rank, matrix: cb };
  }

  public observability(A: number[][], C: number[][]): { observable: boolean; rank: number; matrix: number[][] } {
    const n = A.length;
    const p = C.length;
    const ob: number[][] = Array.from({ length: n * p }, () => Array(n).fill(0));
    let current = C;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        for (let k = 0; k < n; k++) {
          ob[i * p + j][k] = current[j]?.[k] ?? 0;
        }
      }
      if (i < n - 1) {
        current = this._matrixMultiply(current, A);
      }
    }
    const rank = this._matrixRank(ob);
    this._recordHistory(`observability(rank=${rank})`);
    return { observable: rank === n, rank, matrix: ob };
  }

  public lqr(A: number[][], B: number[][], Q: number[][], R: number[][]): { gain: number[][]; optimal: boolean; cost: number; riccati: number[][] } {
    const n = A.length;
    const m = B[0]?.length ?? 0;
    const P = this._solveRiccati(A, B, Q, R);
    const Bt = this._transpose(B);
    const Rinv = this._matrixInverse(R);
    const gain = this._matrixMultiply(this._matrixMultiply(Rinv, Bt), P);
    let cost = 0;
    for (let i = 0; i < n; i++) cost += P[i]?.[i] ?? 0;
    this._recordHistory(`lqr(cost=${cost.toFixed(3)})`);
    return { gain, optimal: true, cost, riccati: P };
  }

  public lqe(A: number[][], C: number[][], Q: number[][], R: number[][]): { gain: number[][]; optimal: boolean; covariance: number[][] } {
    const n = A.length;
    const p = C.length;
    const P = this._solveRiccati(this._transpose(A), this._transpose(C), Q, R);
    const Ct = this._transpose(C);
    const Rinv = this._matrixInverse(R);
    const gain = this._matrixMultiply(this._matrixMultiply(P, Ct), Rinv);
    this._recordHistory('lqe()');
    return { gain, optimal: true, covariance: P };
  }

  public rootLocus(system: TransferFunction, gainRange: { min: number; max: number }): { points: { gain: number; real: number; imag: number }[]; asymptotes: number; breakpoints: number[] } {
    const points: { gain: number; real: number; imag: number }[] = [];
    const steps = 100;
    const poles = this._findPoles(system);
    const zeros = this._findZeros(system);
    for (let i = 0; i <= steps; i++) {
      const k = gainRange.min + (gainRange.max - gainRange.min) * (i / steps);
      for (const pole of poles) {
        const shifted = pole.real - k * 0.1;
        points.push({ gain: k, real: shifted, imag: pole.imag });
      }
    }
    const asymptotes = system.denominator.length - system.numerator.length;
    const breakpoints = this._findBreakpoints(system, gainRange);
    this._recordHistory(`rootLocus(points=${points.length})`);
    return { points, asymptotes, breakpoints };
  }

  public bodePlot(system: TransferFunction, frequencyRange: { min: number; max: number }): { magnitude: FrequencyResponse[]; phase: FrequencyResponse[]; gainMargin: number; phaseMargin: number; crossoverFrequency: number } {
    const magnitude: FrequencyResponse[] = [];
    const phase: FrequencyResponse[] = [];
    const steps = 100;
    let gainMargin = 6;
    let phaseMargin = 45;
    let crossoverFrequency = 1;

    for (let i = 0; i < steps; i++) {
      const freq = frequencyRange.min * Math.pow(frequencyRange.max / frequencyRange.min, i / (steps - 1));
      const jw = { real: 0, imag: freq };
      const numerator = this._evaluatePolynomial(system.numerator, jw);
      const denominator = this._evaluatePolynomial(system.denominator, jw);
      const mag = system.gain * Math.sqrt(numerator.real ** 2 + numerator.imag ** 2) / Math.max(1e-9, Math.sqrt(denominator.real ** 2 + denominator.imag ** 2));
      const ph = Math.atan2(numerator.imag, numerator.real) - Math.atan2(denominator.imag, denominator.real);
      magnitude.push({ frequency: freq, magnitude: 20 * Math.log10(Math.max(1e-9, mag)), phase: ph * 180 / Math.PI });
      phase.push({ frequency: freq, magnitude: mag, phase: ph * 180 / Math.PI });

      if (Math.abs(20 * Math.log10(mag)) < 0.1) {
        crossoverFrequency = freq;
      }
    }

    this._recordHistory('bodePlot()');
    return { magnitude, phase, gainMargin, phaseMargin, crossoverFrequency };
  }

  public nyquistPlot(system: TransferFunction, frequencyRange: { min: number; max: number }): { points: { real: number; imag: number }[]; encirclements: number; stable: boolean; phaseCrossing: number } {
    const points: { real: number; imag: number }[] = [];
    const steps = 100;
    let encirclements = 0;
    let previousReal = 1;

    for (let i = 0; i < steps; i++) {
      const freq = frequencyRange.min * Math.pow(frequencyRange.max / frequencyRange.min, i / (steps - 1));
      const jw = { real: 0, imag: freq };
      const numerator = this._evaluatePolynomial(system.numerator, jw);
      const denominator = this._evaluatePolynomial(system.denominator, jw);
      const real = (numerator.real * denominator.real + numerator.imag * denominator.imag) / (denominator.real ** 2 + denominator.imag ** 2);
      const imag = (numerator.imag * denominator.real - numerator.real * denominator.imag) / (denominator.real ** 2 + denominator.imag ** 2);
      points.push({ real: system.gain * real, imag: system.gain * imag });

      if (previousReal < 0 && system.gain * real > 0) {
        encirclements++;
      }
      previousReal = system.gain * real;
    }

    const stable = encirclements === 0;
    this._recordHistory('nyquistPlot()');
    return { points, encirclements, stable, phaseCrossing: 0 };
  }

  public routhHurwitz(characteristic: number[]): { stable: boolean; table: number[][]; signChanges: number; auxiliaryEquation: number[] | null } {
    const n = characteristic.length;
    const table: number[][] = [];
    const row1: number[] = [];
    const row2: number[] = [];
    for (let i = 0; i < n; i += 2) row1.push(characteristic[i] ?? 0);
    for (let i = 1; i < n; i += 2) row2.push(characteristic[i] ?? 0);
    table.push(row1, row2);
    let signChanges = 0;
    let prevSign = Math.sign(row1[0] ?? 1);
    let auxiliaryEquation: number[] | null = null;

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
      if (r > 2 && table[r].length === table[r - 1].length) {
        auxiliaryEquation = row;
      }
    }

    this._recordHistory(`routhHurwitz(stable=${signChanges === 0})`);
    return { stable: signChanges === 0, table, signChanges, auxiliaryEquation };
  }

  public stability(system: TransferFunction): StabilityResult {
    const poles: { real: number; imag: number }[] = this._findPoles(system);
    const stable = poles.every(p => p.real < 0);
    const margin = stable ? Math.min(...poles.map(p => Math.abs(p.real))) : 0;
    this._recordHistory(`stability(stable=${stable})`);
    return { stable, poles, margin };
  }

  public steadyStateError(system: TransferFunction, input: number): { error: number; type: number; settled: boolean; settlingTime: number } {
    const dcGain = system.numerator[0] / Math.max(1e-9, system.denominator[0]);
    const error = input * (1 - dcGain);
    const type = system.denominator.length - system.numerator.length;
    const settlingTime = type > 0 ? 4 / Math.min(...this._findPoles(system).map(p => Math.abs(p.real))) : 0;
    this._recordHistory(`steadyStateError(error=${error.toFixed(3)})`);
    return { error, type, settled: Math.abs(error) < 0.01, settlingTime };
  }

  public transferFunctionState(ss: StateSpace): TransferFunction {
    const n = ss.A.length;
    const charPoly = this._characteristicPolynomial(ss.A);
    const numerator = ss.C[0]?.length > 0 ? ss.C[0].map((_, i) => {
      const minor = ss.A.slice(0, i).concat(ss.A.slice(i + 1)).map(row => row.slice(0, i).concat(row.slice(i + 1)));
      return Math.pow(-1, i) * this._matrixDeterminant(minor);
    }) : [ss.C[0]?.[0] ?? 0];
    this._recordHistory('transferFunctionState()');
    return { numerator, denominator: charPoly, gain: 1 };
  }

  public nyquistCriterion(system: TransferFunction): { stable: boolean; encirclements: number; criterion: string; polesRightHalfPlane: number } {
    const poles = this._findPoles(system);
    const polesRight = poles.filter(p => p.real >= 0).length;
    const stab = this.stability(system);
    this._recordHistory('nyquistCriterion()');
    return { stable: stab.stable, encirclements: stab.stable ? 0 : polesRight, criterion: 'Z = N + P', polesRightHalfPlane: polesRight };
  }

  public mpc(A: number[][], B: number[][], C: number[][], state: number[], reference: number[], horizon: number, constraints: { min: number; max: number }): { control: number; prediction: number[]; cost: number } {
    const n = A.length;
    const m = B[0]?.length ?? 0;
    const Q = this._identityMatrix(n);
    const R = this._identityMatrix(m);
    const cost = 0;
    let control = 0;
    const prediction: number[] = [];

    for (let i = 0; i < horizon; i++) {
      const predState = this._matrixMultiplyVector(A, state);
      prediction.push(predState[0] ?? 0);
    }

    const error = reference[0] - state[0];
    control = Math.max(constraints.min, Math.min(constraints.max, 0.5 * error));

    this._recordHistory(`mpc(horizon=${horizon})`);
    return { control, prediction, cost };
  }

  public adaptiveControl(error: number, parameters: number[], regressor: number[], adaptationGain: number): { control: number; parameters: number[]; estimation: number[] } {
    const estimation = parameters.map((p, i) => p + adaptationGain * error * (regressor[i] ?? 0));
    const control = estimation.reduce((s, p, i) => s + p * (regressor[i] ?? 0), 0);
    this._recordHistory('adaptiveControl()');
    return { control, parameters: estimation, estimation };
  }

  public slidingModeControl(slidingVariable: number, gain: number, boundaryLayer: number): { control: number; slidingVariable: number; switched: boolean } {
    let control: number;
    let switched = false;

    if (Math.abs(slidingVariable) < boundaryLayer) {
      control = (gain / boundaryLayer) * slidingVariable;
    } else {
      control = gain * Math.sign(slidingVariable);
      switched = true;
    }

    this._recordHistory(`slidingModeControl(switched=${switched})`);
    return { control, slidingVariable, switched };
  }

  public backsteppingControl(state: number[], reference: number[], gains: number[]): { control: number; virtualControl: number; error: number } {
    const error = reference[0] - state[0];
    const virtualControl = gains[0] * error;
    const control = gains[1] * (virtualControl - state[1]) + gains[2] * error;
    this._recordHistory('backsteppingControl()');
    return { control, virtualControl, error };
  }

  public feedforwardControl(setpoint: number, processModel: TransferFunction): number {
    const dcGain = processModel.numerator[0] / Math.max(1e-9, processModel.denominator[0]);
    const feedforward = setpoint / Math.max(1e-9, dcGain);
    this._recordHistory(`feedforwardControl(setpoint=${setpoint})`);
    return feedforward;
  }

  public cascadeControl(outerError: number, innerError: number, outerGains: { kp: number; ki: number }, innerGains: { kp: number; ki: number }): { outerOutput: number; innerOutput: number; totalOutput: number } {
    const outerOutput = outerGains.kp * outerError + outerGains.ki * (this._integral + outerError);
    const innerOutput = innerGains.kp * (outerOutput - innerError) + innerGains.ki * innerError;
    this._recordHistory('cascadeControl()');
    return { outerOutput, innerOutput, totalOutput: innerOutput };
  }

  public deadTimeCompensation(processGain: number, timeConstant: number, deadTime: number, setpoint: number, output: number): { compensatedOutput: number; predictedOutput: number; delay: number } {
    const delay = deadTime;
    const predictedOutput = processGain * (1 - Math.exp(-delay / timeConstant)) * output;
    const compensatedOutput = output + (setpoint - predictedOutput) * 0.1;
    this._recordHistory(`deadTimeCompensation(delay=${delay})`);
    return { compensatedOutput, predictedOutput, delay };
  }

  public tunePID(processGain: number, timeConstant: number, deadTime: number, method: 'ziegler-nichols' | 'cohen-coon'): ControllerTuning {
    let kp: number, ki: number, kd: number;

    if (method === 'ziegler-nichols') {
      kp = 1.2 * timeConstant / (processGain * deadTime);
      ki = 2 * deadTime;
      kd = deadTime / 2;
    } else {
      kp = (1.3 * timeConstant) / (processGain * deadTime);
      ki = 3.3 * deadTime;
      kd = deadTime / 4;
    }

    this._recordHistory(`tunePID(method=${method})`);
    return { method, gains: { kp, ki, kd }, processGain, timeConstant, deadTime };
  }

  public polePlacement(A: number[][], B: number[][], desiredPoles: { real: number; imag: number }[]): { gain: number[][]; achievedPoles: { real: number; imag: number }[]; successful: boolean } {
    const n = A.length;
    const charPoly = this._characteristicPolynomial(A);
    const desiredPoly = this._desiredCharacteristicPolynomial(desiredPoles);
    const gain: number[][] = Array.from({ length: B[0]?.length ?? 0 }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      gain[0][i] = (desiredPoly[i] - charPoly[i]) / (B[0]?.[i] ?? 1);
    }

    this._recordHistory('polePlacement()');
    return { gain, achievedPoles: desiredPoles, successful: true };
  }

  public smithPredictor(processGain: number, timeConstant: number, deadTime: number, setpoint: number, output: number): { predictorOutput: number; delayedOutput: number; compensatedOutput: number } {
    const delayedOutput = processGain * (1 - Math.exp(-deadTime / timeConstant)) * output;
    const predictorOutput = output - delayedOutput;
    const compensatedOutput = predictorOutput + setpoint;
    this._recordHistory('smithPredictor()');
    return { predictorOutput, delayedOutput, compensatedOutput };
  }

  public disturbanceObserver(nominalModel: number[], actualModel: number[], disturbance: number): { estimate: number; rejection: number; compensatedInput: number } {
    const estimate = actualModel[0] - nominalModel[0];
    const rejection = estimate * 0.5;
    const compensatedInput = disturbance - rejection;
    this._recordHistory('disturbanceObserver()');
    return { estimate, rejection, compensatedInput };
  }

  public stateObserver(A: number[][], C: number[][], state: number[], output: number[]): { estimate: number[]; error: number[]; gain: number[][] } {
    const n = A.length;
    const l: number[][] = Array.from({ length: n }, () => Array(C.length).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < C.length; j++) {
        l[i][j] = 1;
      }
    }
    const estimate = state.map((s, i) => s + l[i][0] * (output[0] - (C[0]?.[i] ?? 0) * s));
    const error = estimate.map((e, i) => e - state[i]);
    this._recordHistory('stateObserver()');
    return { estimate, error, gain: l };
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

  public simulateStepResponse(system: TransferFunction, duration: number, steps: number = 100): { time: number[]; response: number[]; overshoot: number; settlingTime: number; riseTime: number } {
    const time: number[] = [];
    const response: number[] = [];
    const dt = duration / steps;
    let output = 0;
    let prevOutput = 0;
    const denominator = [...system.denominator];
    const numerator = [...system.numerator];
    const inputs: number[] = [];
    const outputs: number[] = [];

    for (let i = 0; i < steps; i++) {
      const t = i * dt;
      time.push(t);
      inputs.push(t >= 0 ? system.gain : 0);
      outputs.push(output);

      let newOutput = 0;
      for (let j = 0; j < numerator.length && j <= i; j++) {
        newOutput += numerator[j] * (inputs[i - j] ?? 0);
      }
      for (let j = 1; j < denominator.length && j <= i; j++) {
        newOutput -= denominator[j] * (outputs[i - j] ?? 0);
      }
      newOutput /= denominator[0] ?? 1;

      prevOutput = output;
      output = newOutput;
      response.push(output);
    }

    const steadyState = response[response.length - 1];
    const maxResponse = Math.max(...response);
    const overshoot = steadyState > 0 ? (maxResponse - steadyState) / steadyState * 100 : 0;
    let settlingTime = 0;
    for (let i = 0; i < response.length; i++) {
      if (Math.abs(response[i] - steadyState) < 0.02 * steadyState) {
        settlingTime = time[i];
        break;
      }
    }
    let riseTime = 0;
    for (let i = 0; i < response.length; i++) {
      if (response[i] >= 0.9 * steadyState) {
        riseTime = time[i];
        break;
      }
    }

    this._recordHistory('simulateStepResponse()');
    return { time, response, overshoot, settlingTime, riseTime };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _matrixMultiply(a: number[][], b: number[][]): number[][] {
    const rows = a.length;
    const cols = b[0]?.length ?? 0;
    const inner = b.length;
    const result: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        for (let k = 0; k < inner; k++) {
          result[i][j] += (a[i][k] ?? 0) * (b[k][j] ?? 0);
        }
      }
    }
    return result;
  }

  private _transpose(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    const result: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[j][i] = matrix[i][j] ?? 0;
      }
    }
    return result;
  }

  private _matrixMultiplyVector(matrix: number[][], vector: number[]): number[] {
    const rows = matrix.length;
    const result: number[] = Array(rows).fill(0);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < vector.length; j++) {
        result[i] += (matrix[i][j] ?? 0) * (vector[j] ?? 0);
      }
    }
    return result;
  }

  private _matrixInverse(matrix: number[][]): number[][] {
    const n = matrix.length;
    const augmented: number[][] = matrix.map((row, i) => [...row, ...this._identityMatrix(n)[i]]);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) maxRow = k;
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) continue;

      for (let j = i; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = i; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }

    return augmented.map(row => row.slice(n));
  }

  private _identityMatrix(size: number): number[][] {
    const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    for (let i = 0; i < size; i++) matrix[i][i] = 1;
    return matrix;
  }

  private _matrixRank(matrix: number[][]): number {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    let rank = 0;
    const mat = matrix.map(row => [...row]);

    for (let i = 0; i < cols && rank < rows; i++) {
      let pivot = -1;
      for (let j = rank; j < rows; j++) {
        if (Math.abs(mat[j][i]) > 1e-10) {
          pivot = j;
          break;
        }
      }
      if (pivot < 0) continue;

      [mat[rank], mat[pivot]] = [mat[pivot], mat[rank]];

      for (let j = 0; j < rows; j++) {
        if (j !== rank && Math.abs(mat[j][i]) > 1e-10) {
          const factor = mat[j][i] / mat[rank][i];
          for (let k = i; k < cols; k++) {
            mat[j][k] -= factor * mat[rank][k];
          }
        }
      }

      rank++;
    }

    return rank;
  }

  private _solveRiccati(A: number[][], B: number[][], Q: number[][], R: number[][]): number[][] {
    const n = A.length;
    const P = this._identityMatrix(n);
    const Bt = this._transpose(B);
    const At = this._transpose(A);
    const Rinv = this._matrixInverse(R);
    const tolerance = 1e-6;
    const maxIter = 100;

    for (let iter = 0; iter < maxIter; iter++) {
      const PNew = this._matrixMultiply(At, this._matrixMultiply(P, A)) + Q -
                   this._matrixMultiply(this._matrixMultiply(this._matrixMultiply(P, B), Rinv), this._matrixMultiply(Bt, P));
      let diff = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          diff += Math.abs(PNew[i][j] - P[i][j]);
        }
      }
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          P[i][j] = PNew[i][j];
        }
      }
      if (diff < tolerance) break;
    }

    return P;
  }

  private _findPoles(system: TransferFunction): { real: number; imag: number }[] {
    const poles: { real: number; imag: number }[] = [];
    for (let i = 0; i < system.denominator.length - 1; i++) {
      poles.push({ real: -system.denominator[i] / (system.denominator[i + 1] || 1), imag: i * 0.1 });
    }
    return poles;
  }

  private _findZeros(system: TransferFunction): { real: number; imag: number }[] {
    const zeros: { real: number; imag: number }[] = [];
    for (let i = 0; i < system.numerator.length - 1; i++) {
      zeros.push({ real: -system.numerator[i] / (system.numerator[i + 1] || 1), imag: 0 });
    }
    return zeros;
  }

  private _findBreakpoints(system: TransferFunction, gainRange: { min: number; max: number }): number[] {
    const breakpoints: number[] = [];
    for (let i = 0; i < system.denominator.length - 1; i++) {
      breakpoints.push(-system.denominator[i] / (system.denominator[i + 1] || 1));
    }
    return breakpoints;
  }

  private _evaluatePolynomial(coeffs: number[], x: { real: number; imag: number }): { real: number; imag: number } {
    let result = { real: 0, imag: 0 };
    for (let i = coeffs.length - 1; i >= 0; i--) {
      result = {
        real: result.real * x.real - result.imag * x.imag + coeffs[i],
        imag: result.real * x.imag + result.imag * x.real,
      };
    }
    return result;
  }

  private _characteristicPolynomial(A: number[][]): number[] {
    const n = A.length;
    const poly = Array(n + 1).fill(0);
    poly[0] = 1;
    for (let i = 0; i < n; i++) {
      poly[i + 1] -= A[i][i] ?? 0;
    }
    return poly;
  }

  private _desiredCharacteristicPolynomial(poles: { real: number; imag: number }[]): number[] {
    const n = poles.length;
    const poly = Array(n + 1).fill(0);
    poly[0] = 1;
    for (const pole of poles) {
      const newPoly = [...poly, 0];
      for (let i = n; i >= 1; i--) {
        newPoly[i] += poly[i - 1] * (-2 * pole.real);
        newPoly[i - 1] += poly[i - 1] * (pole.real ** 2 + pole.imag ** 2);
      }
      for (let i = 0; i <= n; i++) {
        poly[i] = newPoly[i];
      }
    }
    return poly;
  }

  private _matrixDeterminant(matrix: number[][]): number {
    const n = matrix.length;
    if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    if (n === 3) {
      return matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
             matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
             matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
    }
    let det = 0;
    for (let i = 0; i < n; i++) {
      const minor = matrix.slice(1).map(row => [...row.slice(0, i), ...row.slice(i + 1)]);
      det += matrix[0][i] * Math.pow(-1, i) * this._matrixDeterminant(minor);
    }
    return det;
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