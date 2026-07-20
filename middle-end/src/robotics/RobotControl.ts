import { DataPacket, PacketMeta } from '../shared/types';

/** Controller type descriptor. */
export interface ControllerConfig {
  readonly type: 'pid' | 'lqr' | 'mpc' | 'impedance' | 'admittance' | 'computed-torque' | 'sliding-mode' | 'force';
  readonly gains: { [key: string]: number };
  readonly sampleTime: number;
  readonly saturation: { min: number; max: number };
}

/** Control signal descriptor. */
export interface ControlSignal {
  readonly timestamp: number;
  readonly jointCommands: number[];
  readonly torqueCommands: number[];
  readonly error: number[];
  readonly integral: number[];
  readonly derivative: number[];
}

/** Trajectory tracking error descriptor. */
export interface TrackingError {
  readonly positionError: number[];
  readonly velocityError: number[];
  readonly rmsError: number;
  readonly maxError: number;
  readonly convergenceTime: number;
}

/** Stability margins descriptor. */
export interface StabilityMargins {
  readonly gainMargin: number;
  readonly phaseMargin: number;
  readonly delayMargin: number;
  readonly bandwidth: number;
  readonly crossoverFrequency: number;
}

/** Impedance parameters descriptor. */
export interface ImpedanceParams {
  readonly mass: number[][];
  readonly damping: number[][];
  readonly stiffness: number[][];
}

/** Force control descriptor. */
export interface ForceControlResult {
  readonly commandedForce: number[];
  readonly actualForce: number[];
  readonly forceError: number[];
  readonly admittancePosition: number[];
  readonly contactDetected: boolean;
}

/** MPC prediction horizon descriptor. */
export interface MPCPrediction {
  readonly horizon: number;
  readonly statePredictions: number[][];
  readonly controlPredictions: number[][];
  readonly cost: number;
  readonly constraintsSatisfied: boolean;
}

/** Disturbance observer result. */
export interface DisturbanceObserverResult {
  readonly estimatedDisturbance: number[];
  readonly observerGain: number[];
  readonly convergenceRate: number;
  readonly residual: number[];
}

/** Feedforward compensation result. */
export interface FeedforwardResult {
  readonly accelerationFeedforward: number[];
  readonly frictionCompensation: number[];
  readonly gravityCompensation: number[];
  readonly coriolisCompensation: number[];
}

export class RobotControl {
  private _controllers: Map<string, ControllerConfig> = new Map();
  private _controlHistory: ControlSignal[] = [];
  private _errorHistory: TrackingError[] = [];
  private _stabilityHistory: StabilityMargins[] = [];
  private _impedanceParams: ImpedanceParams | null = null;
  private _forceHistory: ForceControlResult[] = [];
  private _mpcHistory: MPCPrediction[] = [];
  private _disturbanceHistory: DisturbanceObserverResult[] = [];
  private _integralError: number[] = [];
  private _previousError: number[] = [];
  private _counter = 0;

  constructor() {
    this._seedControllers();
  }

  private _seedControllers(): void {
    const configs: ControllerConfig[] = [
      { type: 'pid', gains: { kp: 100, ki: 10, kd: 20 }, sampleTime: 0.001, saturation: { min: -100, max: 100 } },
      { type: 'lqr', gains: { q1: 1000, q2: 100, r: 0.01 }, sampleTime: 0.001, saturation: { min: -80, max: 80 } },
      { type: 'computed-torque', gains: { kp: 200, kd: 50 }, sampleTime: 0.001, saturation: { min: -150, max: 150 } },
      { type: 'impedance', gains: { md: 1, bd: 50, kd: 500 }, sampleTime: 0.001, saturation: { min: -50, max: 50 } },
      { type: 'sliding-mode', gains: { lambda: 20, k: 50 }, sampleTime: 0.001, saturation: { min: -100, max: 100 } },
    ];
    for (const c of configs) {
      this._controllers.set(`${c.type}-${++this._counter}`, c);
    }
  }

  get controllerCount(): number { return this._controllers.size; }
  get controlHistoryCount(): number { return this._controlHistory.length; }
  get errorHistoryCount(): number { return this._errorHistory.length; }

  public addController(config: ControllerConfig): string {
    const id = `${config.type}-${++this._counter}`;
    this._controllers.set(id, config);
    return id;
  }

  public removeController(id: string): boolean {
    return this._controllers.delete(id);
  }

  public getController(id: string): ControllerConfig | undefined {
    return this._controllers.get(id);
  }

  /** Compute PID control output. */
  public pidControl(
    desiredPosition: number[],
    actualPosition: number[],
    actualVelocity: number[],
    kp: number[],
    ki: number[],
    kd: number[],
    dt: number
  ): ControlSignal {
    const n = desiredPosition.length;
    const error: number[] = [];
    const integral: number[] = [];
    const derivative: number[] = [];
    const jointCommands: number[] = [];
    const torqueCommands: number[] = [];
    if (this._integralError.length < n) this._integralError = new Array(n).fill(0);
    if (this._previousError.length < n) this._previousError = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const e = desiredPosition[i] - actualPosition[i];
      error.push(Number(e.toFixed(6)));
      this._integralError[i] += e * dt;
      this._integralError[i] = Math.max(-100, Math.min(100, this._integralError[i]));
      integral.push(Number(this._integralError[i].toFixed(6)));
      const d = (e - this._previousError[i]) / dt;
      derivative.push(Number(d.toFixed(6)));
      this._previousError[i] = e;
      const u = kp[i] * e + ki[i] * this._integralError[i] + kd[i] * d;
      jointCommands.push(Number(u.toFixed(6)));
      torqueCommands.push(Number((u - 0.1 * actualVelocity[i]).toFixed(6)));
    }
    const signal: ControlSignal = {
      timestamp: Date.now(),
      jointCommands,
      torqueCommands,
      error,
      integral,
      derivative,
    };
    this._controlHistory.push(signal);
    return signal;
  }

  /** Compute LQR control output. */
  public lqrControl(
    stateError: number[],
    K: number[][],
    saturation: { min: number; max: number }
  ): ControlSignal {
    const n = stateError.length;
    const u: number[] = [];
    for (let i = 0; i < K.length; i++) {
      let ui = 0;
      for (let j = 0; j < n; j++) {
        ui += K[i][j] * stateError[j];
      }
      ui = Math.max(saturation.min, Math.min(saturation.max, -ui));
      u.push(Number(ui.toFixed(6)));
    }
    const signal: ControlSignal = {
      timestamp: Date.now(),
      jointCommands: u,
      torqueCommands: u,
      error: stateError,
      integral: new Array(u.length).fill(0),
      derivative: new Array(u.length).fill(0),
    };
    this._controlHistory.push(signal);
    return signal;
  }

  /** Compute computed torque control. */
  public computedTorqueControl(
    desiredPosition: number[],
    desiredVelocity: number[],
    desiredAcceleration: number[],
    actualPosition: number[],
    actualVelocity: number[],
    massMatrix: number[][],
    coriolisVector: number[],
    gravityVector: number[],
    kp: number,
    kd: number
  ): ControlSignal {
    const n = desiredPosition.length;
    const posErr: number[] = [];
    const velErr: number[] = [];
    for (let i = 0; i < n; i++) {
      posErr.push(desiredPosition[i] - actualPosition[i]);
      velErr.push(desiredVelocity[i] - actualVelocity[i]);
    }
    const aux: number[] = [];
    for (let i = 0; i < n; i++) {
      aux.push(desiredAcceleration[i] + kp * posErr[i] + kd * velErr[i]);
    }
    const tau: number[] = [];
    for (let i = 0; i < n; i++) {
      let t = 0;
      for (let j = 0; j < n; j++) {
        t += massMatrix[i][j] * aux[j];
      }
      t += coriolisVector[i] + gravityVector[i];
      tau.push(Number(t.toFixed(6)));
    }
    const signal: ControlSignal = {
      timestamp: Date.now(),
      jointCommands: aux,
      torqueCommands: tau,
      error: posErr,
      integral: new Array(n).fill(0),
      derivative: velErr,
    };
    this._controlHistory.push(signal);
    return signal;
  }

  /** Compute impedance control output. */
  public impedanceControl(
    desiredPosition: number[],
    actualPosition: number[],
    actualVelocity: number[],
    externalForce: number[],
    Md: number[][],
    Bd: number[][],
    Kd: number[][]
  ): ControlSignal {
    const n = desiredPosition.length;
    const posErr: number[] = [];
    const velErr: number[] = [];
    for (let i = 0; i < n; i++) {
      posErr.push(desiredPosition[i] - actualPosition[i]);
      velErr.push(-actualVelocity[i]);
    }
    const tau: number[] = [];
    for (let i = 0; i < n; i++) {
      let t = externalForce[i];
      for (let j = 0; j < n; j++) {
        t += Md[i][j] * 0 + Bd[i][j] * velErr[j] + Kd[i][j] * posErr[j];
      }
      tau.push(Number(t.toFixed(6)));
    }
    const signal: ControlSignal = {
      timestamp: Date.now(),
      jointCommands: posErr,
      torqueCommands: tau,
      error: posErr,
      integral: new Array(n).fill(0),
      derivative: velErr,
    };
    this._controlHistory.push(signal);
    return signal;
  }

  /** Compute sliding mode control output. */
  public slidingModeControl(
    desiredPosition: number[],
    desiredVelocity: number[],
    actualPosition: number[],
    actualVelocity: number[],
    lambda: number,
    k: number,
    massMatrix: number[][],
    gravityVector: number[]
  ): ControlSignal {
    const n = desiredPosition.length;
    const s: number[] = [];
    const tau: number[] = [];
    for (let i = 0; i < n; i++) {
      const e = desiredPosition[i] - actualPosition[i];
      const ed = desiredVelocity[i] - actualVelocity[i];
      const si = ed + lambda * e;
      s.push(Number(si.toFixed(6)));
      const sat = si > 0.1 ? 1 : si < -0.1 ? -1 : si / 0.1;
      const t = massMatrix[i][i] * (lambda * ed + k * sat) + gravityVector[i];
      tau.push(Number(t.toFixed(6)));
    }
    const signal: ControlSignal = {
      timestamp: Date.now(),
      jointCommands: s,
      torqueCommands: tau,
      error: desiredPosition.map((d, i) => Number((d - actualPosition[i]).toFixed(6))),
      integral: new Array(n).fill(0),
      derivative: s,
    };
    this._controlHistory.push(signal);
    return signal;
  }

  /** Compute force control with admittance. */
  public forceControl(
    desiredForce: number[],
    actualForce: number[],
    currentPosition: number[],
    admittanceMass: number[],
    admittanceDamping: number[],
    admittanceStiffness: number[],
    dt: number
  ): ForceControlResult {
    const n = desiredForce.length;
    const forceError: number[] = [];
    const admittancePosition: number[] = [];
    for (let i = 0; i < n; i++) {
      const fe = desiredForce[i] - actualForce[i];
      forceError.push(Number(fe.toFixed(6)));
      const acc = fe / Math.max(admittanceMass[i], 0.001);
      const vel = acc * dt;
      const pos = currentPosition[i] + vel * dt;
      admittancePosition.push(Number(pos.toFixed(6)));
    }
    const contactDetected = actualForce.some(f => Math.abs(f) > 1.0);
    const result: ForceControlResult = {
      commandedForce: desiredForce,
      actualForce,
      forceError,
      admittancePosition,
      contactDetected,
    };
    this._forceHistory.push(result);
    return result;
  }

  /** Compute MPC prediction over a horizon. */
  public mpcPredict(
    initialState: number[],
    referenceTrajectory: number[][],
    A: number[][],
    B: number[][],
    Q: number[][],
    R: number[][],
    horizon: number
  ): MPCPrediction {
    const statePredictions: number[][] = [initialState];
    const controlPredictions: number[][] = [];
    let cost = 0;
    let currentState = [...initialState];
    for (let k = 0; k < horizon; k++) {
      const ref = referenceTrajectory[k] ?? referenceTrajectory[referenceTrajectory.length - 1];
      const u: number[] = [];
      for (let i = 0; i < B.length; i++) {
        let ui = 0;
        for (let j = 0; j < currentState.length; j++) {
          ui += Q[i][j] * (ref[j] - currentState[j]);
        }
        ui = Math.max(-100, Math.min(100, ui));
        u.push(Number(ui.toFixed(6)));
      }
      controlPredictions.push(u);
      const nextState: number[] = [];
      for (let i = 0; i < A.length; i++) {
        let xi = 0;
        for (let j = 0; j < currentState.length; j++) {
          xi += A[i][j] * currentState[j];
        }
        for (let j = 0; j < u.length; j++) {
          xi += B[i][j] * u[j];
        }
        nextState.push(Number(xi.toFixed(6)));
      }
      statePredictions.push(nextState);
      for (let i = 0; i < currentState.length; i++) {
        cost += Q[i][i] * Math.pow(ref[i] - currentState[i], 2);
      }
      for (let i = 0; i < u.length; i++) {
        cost += R[i][i] * u[i] * u[i];
      }
      currentState = nextState;
    }
    const prediction: MPCPrediction = {
      horizon,
      statePredictions,
      controlPredictions,
      cost: Number(cost.toFixed(4)),
      constraintsSatisfied: true,
    };
    this._mpcHistory.push(prediction);
    return prediction;
  }

  /** Compute disturbance observer output. */
  public disturbanceObserver(
    actualTorque: number[],
    actualPosition: number[],
    actualVelocity: number[],
    nominalInertia: number[],
    observerGain: number[]
  ): DisturbanceObserverResult {
    const n = actualTorque.length;
    const estimatedDisturbance: number[] = [];
    const residual: number[] = [];
    for (let i = 0; i < n; i++) {
      const nominal = nominalInertia[i] * actualVelocity[i];
      const estimated = observerGain[i] * (nominal - actualPosition[i]);
      const d = actualTorque[i] - nominal + estimated;
      estimatedDisturbance.push(Number(d.toFixed(6)));
      residual.push(Number((actualTorque[i] - d).toFixed(6)));
    }
    const result: DisturbanceObserverResult = {
      estimatedDisturbance,
      observerGain,
      convergenceRate: Math.min(...observerGain),
      residual,
    };
    this._disturbanceHistory.push(result);
    return result;
  }

  /** Compute feedforward compensation terms. */
  public feedforwardCompensation(
    desiredAcceleration: number[],
    desiredVelocity: number[],
    massMatrix: number[][],
    coriolisVector: number[],
    gravityVector: number[],
    frictionVector: number[]
  ): FeedforwardResult {
    const n = desiredAcceleration.length;
    const accelerationFeedforward: number[] = [];
    for (let i = 0; i < n; i++) {
      let t = 0;
      for (let j = 0; j < n; j++) {
        t += massMatrix[i][j] * desiredAcceleration[j];
      }
      accelerationFeedforward.push(Number(t.toFixed(6)));
    }
    const result: FeedforwardResult = {
      accelerationFeedforward,
      frictionCompensation: frictionVector,
      gravityCompensation: gravityVector,
      coriolisCompensation: coriolisVector,
    };
    return result;
  }

  /** Compute tracking error metrics. */
  public trackingError(desiredTrajectory: number[][], actualTrajectory: number[][]): TrackingError {
    let maxError = 0;
    let sumSq = 0;
    const n = Math.min(desiredTrajectory.length, actualTrajectory.length);
    const dim = desiredTrajectory[0]?.length ?? 0;
    const posErr: number[][] = [];
    const velErr: number[][] = [];
    for (let i = 0; i < n; i++) {
      const pe: number[] = [];
      for (let j = 0; j < dim; j++) {
        const e = Math.abs((desiredTrajectory[i][j] ?? 0) - (actualTrajectory[i][j] ?? 0));
        pe.push(e);
        maxError = Math.max(maxError, e);
        sumSq += e * e;
      }
      posErr.push(pe);
    }
    const rmsError = Math.sqrt(sumSq / Math.max(1, n * dim));
    let convergenceTime = 0;
    for (let i = n - 1; i >= 0; i--) {
      const err = posErr[i].reduce((s, e) => s + e, 0) / dim;
      if (err > 0.01) {
        convergenceTime = i * 0.001;
        break;
      }
    }
    const error: TrackingError = {
      positionError: posErr[posErr.length - 1] ?? new Array(dim).fill(0),
      velocityError: velErr[velErr.length - 1] ?? new Array(dim).fill(0),
      rmsError: Number(rmsError.toFixed(6)),
      maxError: Number(maxError.toFixed(6)),
      convergenceTime: Number(convergenceTime.toFixed(4)),
    };
    this._errorHistory.push(error);
    return error;
  }

  /** Compute stability margins for a SISO system. */
  public stabilityMargins(plantGain: number, controllerGain: number, phaseLag: number): StabilityMargins {
    const openLoopGain = plantGain * controllerGain;
    const crossoverFreq = openLoopGain > 0 ? Math.log(openLoopGain) : 0;
    const gm = openLoopGain > 0 ? 1 / openLoopGain : Infinity;
    const pm = 180 - Math.abs(phaseLag) - 90;
    const dm = pm > 0 ? (pm * Math.PI / 180) / Math.max(crossoverFreq, 0.001) : 0;
    const margins: StabilityMargins = {
      gainMargin: Number(gm.toFixed(4)),
      phaseMargin: Number(pm.toFixed(4)),
      delayMargin: Number(dm.toFixed(4)),
      bandwidth: Number(crossoverFreq.toFixed(4)),
      crossoverFrequency: Number(crossoverFreq.toFixed(4)),
    };
    this._stabilityHistory.push(margins);
    return margins;
  }

  /** Compute disturbance rejection ratio. */
  public disturbanceRejection(controllerGain: number, disturbanceGain: number): number {
    return Number((controllerGain / Math.max(disturbanceGain, 0.001)).toFixed(4));
  }

  /** Compute sensitivity function at a frequency. */
  public sensitivity(plantGain: number, controllerGain: number, frequency: number): number {
    const L = plantGain * controllerGain / (1 + frequency);
    return Number((1 / (1 + L)).toFixed(4));
  }

  /** Compute complementary sensitivity function. */
  public complementarySensitivity(plantGain: number, controllerGain: number, frequency: number): number {
    const S = this.sensitivity(plantGain, controllerGain, frequency);
    return Number((1 - S).toFixed(4));
  }

  /** Compute rise time for a second-order system. */
  public riseTime(naturalFrequency: number, dampingRatio: number): number {
    if (dampingRatio >= 1) return Number((1.8 / naturalFrequency).toFixed(4));
    const wd = naturalFrequency * Math.sqrt(1 - dampingRatio * dampingRatio);
    return Number(((Math.PI - Math.atan(Math.sqrt(1 - dampingRatio * dampingRatio) / dampingRatio)) / wd).toFixed(4));
  }

  /** Compute peak time for a second-order system. */
  public peakTime(naturalFrequency: number, dampingRatio: number): number {
    if (dampingRatio >= 1) return 0;
    const wd = naturalFrequency * Math.sqrt(1 - dampingRatio * dampingRatio);
    return Number((Math.PI / wd).toFixed(4));
  }

  /** Compute settling time for a second-order system. */
  public settlingTime(naturalFrequency: number, dampingRatio: number, tolerance: number = 0.02): number {
    const ts = dampingRatio > 0 ? -Math.log(tolerance) / (dampingRatio * naturalFrequency) : 0;
    return Number(ts.toFixed(4));
  }

  /** Compute overshoot for a second-order system. */
  public overshoot(dampingRatio: number): number {
    if (dampingRatio >= 1) return 0;
    const os = Math.exp(-dampingRatio * Math.PI / Math.sqrt(1 - dampingRatio * dampingRatio)) * 100;
    return Number(os.toFixed(4));
  }

  /** Tune PID gains using Ziegler-Nichols method. */
  public zieglerNichols(Ku: number, Tu: number): { kp: number; ki: number; kd: number } {
    const kp = 0.6 * Ku;
    const ki = kp / (0.5 * Tu);
    const kd = kp * 0.125 * Tu;
    return { kp: Number(kp.toFixed(4)), ki: Number(ki.toFixed(4)), kd: Number(kd.toFixed(4)) };
  }

  /** Tune PID gains using Cohen-Coon method. */
  public cohenCoon(K: number, tau: number, theta: number): { kp: number; ki: number; kd: number } {
    const kp = (1.35 / K) * (tau / theta + 0.185);
    const ti = (2.5 * theta * (tau + 0.185 * theta)) / (tau + 0.611 * theta);
    const td = (0.37 * theta * tau) / (tau + 0.2 * theta);
    return { kp: Number(kp.toFixed(4)), ki: Number((kp / ti).toFixed(4)), kd: Number((kp * td).toFixed(4)) };
  }

  /** Compute LQR gain matrix (simplified Riccati approximation). */
  public lqrGain(A: number[][], B: number[][], Q: number[][], R: number[][]): number[][] {
    const n = A.length;
    const m = B[0].length;
    const K: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        K[i][j] = Number((B[j][i] * Q[j][j] / Math.max(R[i][i], 0.001)).toFixed(6));
      }
    }
    return K;
  }

  /** Compute pole placement feedback gains. */
  public polePlacement(desiredPoles: number[], A: number[][], B: number[][]): number[][] {
    const n = A.length;
    const m = B[0].length;
    const K: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        K[i][j] = Number((desiredPoles[j] * B[j][i]).toFixed(6));
      }
    }
    return K;
  }

  /** Compute ackermann formula for SISO systems. */
  public ackermann(A: number[][], B: number[][], desiredPolynomial: number[]): number[] {
    const n = A.length;
    const k: number[] = [];
    for (let i = 0; i < n; i++) {
      k.push(Number((desiredPolynomial[i] * B[i][0]).toFixed(6)));
    }
    return k;
  }

  /** Compute controllability matrix. */
  public controllabilityMatrix(A: number[][], B: number[][]): number[][] {
    const n = A.length;
    const C: number[][] = [];
    let AkB = B;
    for (let i = 0; i < n; i++) {
      for (const row of AkB) {
        C.push([...row]);
      }
      const next: number[][] = [];
      for (let r = 0; r < A.length; r++) {
        const newRow: number[] = [];
        for (let c = 0; c < AkB[0].length; c++) {
          let sum = 0;
          for (let k = 0; k < A.length; k++) {
            sum += A[r][k] * AkB[k][c];
          }
          newRow.push(sum);
        }
        next.push(newRow);
      }
      AkB = next;
    }
    return C;
  }

  /** Check controllability rank condition. */
  public isControllable(A: number[][], B: number[][]): boolean {
    const C = this.controllabilityMatrix(A, B);
    return C.length >= A.length;
  }

  /** Compute observability matrix. */
  public observabilityMatrix(A: number[][], C: number[][]): number[][] {
    const n = A.length;
    const O: number[][] = [];
    let CAk = C;
    for (let i = 0; i < n; i++) {
      for (const row of CAk) {
        O.push([...row]);
      }
      const next: number[][] = [];
      for (let r = 0; r < C.length; r++) {
        const newRow: number[] = [];
        for (let c = 0; c < A.length; c++) {
          let sum = 0;
          for (let k = 0; k < A.length; k++) {
            sum += CAk[r][k] * A[k][c];
          }
          newRow.push(sum);
        }
        next.push(newRow);
      }
      CAk = next;
    }
    return O;
  }

  /** Check observability rank condition. */
  public isObservable(A: number[][], C: number[][]): boolean {
    const O = this.observabilityMatrix(A, C);
    return O.length >= A.length;
  }

  /** Compute Kalman filter gain (simplified steady-state). */
  public kalmanGain(A: number[][], C: number[][], Q: number[][], R: number[][]): number[][] {
    const n = A.length;
    const p = C.length;
    const K: number[][] = Array.from({ length: n }, () => Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        K[i][j] = Number((Q[i][i] * C[j][i] / Math.max(R[j][j], 0.001)).toFixed(6));
      }
    }
    return K;
  }

  /** Compute state estimator output. */
  public stateEstimator(
    predictedState: number[],
    measurement: number[],
    K: number[][],
    C: number[][]
  ): number[] {
    const n = predictedState.length;
    const estimated: number[] = [];
    for (let i = 0; i < n; i++) {
      let innovation = 0;
      for (let j = 0; j < measurement.length; j++) {
        let ypred = 0;
        for (let k = 0; k < n; k++) {
          ypred += C[j][k] * predictedState[k];
        }
        innovation += K[i][j] * (measurement[j] - ypred);
      }
      estimated.push(Number((predictedState[i] + innovation).toFixed(6)));
    }
    return estimated;
  }

  /** Compute adaptive control update (simplified gradient descent). */
  public adaptiveControl(
    referenceModel: number[],
    plantOutput: number[],
    adaptiveGain: number,
    parameterEstimate: number[]
  ): { controlSignal: number[]; updatedParameters: number[] } {
    const error = referenceModel.map((r, i) => r - (plantOutput[i] ?? 0));
    const updatedParameters = parameterEstimate.map((p, i) => {
      const grad = adaptiveGain * (error[i] ?? 0) * plantOutput[i];
      return Number((p + grad).toFixed(6));
    });
    const controlSignal = updatedParameters.map((p, i) => Number((p * referenceModel[i]).toFixed(6)));
    return { controlSignal, updatedParameters };
  }

  /** Compute bang-bang time-optimal control. */
  public bangBangControl(current: number, target: number, maxAccel: number, maxDecel: number): { acceleration: number; timeToTarget: number } {
    const distance = target - current;
    const accel = distance > 0 ? maxAccel : -maxAccel;
    const switchingDistance = (accel * accel) / (2 * Math.abs(maxDecel));
    const timeToTarget = distance > switchingDistance
      ? Math.sqrt(2 * distance / accel) + Math.sqrt(2 * switchingDistance / Math.abs(maxDecel))
      : Math.sqrt(2 * Math.abs(distance) / Math.abs(maxDecel));
    return { acceleration: Number(accel.toFixed(4)), timeToTarget: Number(timeToTarget.toFixed(4)) };
  }

  /** Compute cascade controller output (outer + inner loop). */
  public cascadeControl(
    outerError: number[],
    innerError: number[],
    outerKp: number[],
    outerKi: number[],
    innerKp: number[],
    innerKi: number[],
    dt: number
  ): { outerCommand: number[]; innerCommand: number[] } {
    const outerCommand = outerError.map((e, i) => {
      const kp = outerKp[i] ?? 1;
      const ki = outerKi[i] ?? 0;
      return Number((kp * e + ki * e * dt).toFixed(6));
    });
    const innerCommand = innerError.map((e, i) => {
      const kp = innerKp[i] ?? 1;
      const ki = innerKi[i] ?? 0;
      return Number((kp * e + ki * e * dt).toFixed(6));
    });
    return { outerCommand, innerCommand };
  }

  /** Compute anti-windup compensation for integral term. */
  public antiWindup(integral: number[], error: number[], output: number[], saturationMin: number, saturationMax: number, gain: number): number[] {
    return integral.map((int, i) => {
      const sat = Math.max(saturationMin, Math.min(saturationMax, output[i]));
      const diff = output[i] - sat;
      return Number((int + error[i] * gain - diff * gain).toFixed(6));
    });
  }

  /** Compute deadband compensation for stick-slip friction. */
  public deadbandCompensation(input: number[], deadband: number[], sign: number[]): number[] {
    return input.map((x, i) => {
      const db = deadband[i] ?? 0;
      if (Math.abs(x) <= db) return 0;
      return Number(((x - db * (sign[i] ?? Math.sign(x))) * 1.2).toFixed(6));
    });
  }

  /** Compute jitter suppression for noisy control signals. */
  public jitterSuppression(signal: number[], previous: number[], threshold: number): number[] {
    return signal.map((s, i) => {
      const prev = previous[i] ?? s;
      const diff = Math.abs(s - prev);
      return diff < threshold ? prev : s;
    });
  }

  /** Compute rate limiter for smooth command transitions. */
  public rateLimiter(current: number[], target: number[], maxRate: number, dt: number): number[] {
    return current.map((c, i) => {
      const t = target[i] ?? c;
      const maxDelta = maxRate * dt;
      const delta = Math.max(-maxDelta, Math.min(maxDelta, t - c));
      return Number((c + delta).toFixed(6));
    });
  }

  /** Compute notch filter for vibration suppression. */
  public notchFilter(input: number[], frequency: number, damping: number, dt: number): number[] {
    const omega = 2 * Math.PI * frequency;
    const alpha = omega * dt;
    const beta = damping * alpha;
    return input.map(x => {
      const filtered = x * (1 - beta) / (1 + alpha * alpha);
      return Number(filtered.toFixed(6));
    });
  }

  /** Compute lead-lag compensator. */
  public leadLagCompensator(input: number[], previous: number[], leadTime: number, lagTime: number, dt: number): number[] {
    return input.map((x, i) => {
      const prev = previous[i] ?? x;
      const lead = (x - prev) * leadTime / dt;
      const lag = prev * (1 - dt / lagTime);
      return Number((x + lead + lag).toFixed(6));
    });
  }

  /** Compute frequency response of a discrete-time system. */
  public frequencyResponse(z: number, numerator: number[], denominator: number[]): { magnitude: number; phase: number } {
    let num = 0;
    let den = 0;
    for (let i = 0; i < numerator.length; i++) {
      num += numerator[i] * Math.pow(z, -i);
    }
    for (let i = 0; i < denominator.length; i++) {
      den += denominator[i] * Math.pow(z, -i);
    }
    const h = den !== 0 ? num / den : 0;
    return { magnitude: Number(Math.abs(h).toFixed(6)), phase: Number((Math.atan2(h, 0) * 180 / Math.PI).toFixed(4)) };
  }

  /** Compute phase lead compensator design. */
  public phaseLeadDesign(maxPhaseLead: number, frequencyAtMax: number): { alpha: number; T: number } {
    const alpha = (1 - Math.sin(maxPhaseLead)) / (1 + Math.sin(maxPhaseLead));
    const T = 1 / (frequencyAtMax * Math.sqrt(alpha));
    return { alpha: Number(alpha.toFixed(6)), T: Number(T.toFixed(6)) };
  }

  /** Compute phase lag compensator design. */
  public phaseLagDesign(desiredAttenuation: number, frequencyAtAttenuation: number): { beta: number; T: number } {
    const beta = Math.pow(10, desiredAttenuation / 20);
    const T = 10 / frequencyAtAttenuation;
    return { beta: Number(beta.toFixed(6)), T: Number(T.toFixed(6)) };
  }

  /** Reset all control states. */
  public reset(): void {
    this._controllers.clear();
    this._controlHistory = [];
    this._errorHistory = [];
    this._stabilityHistory = [];
    this._impedanceParams = null;
    this._forceHistory = [];
    this._mpcHistory = [];
    this._disturbanceHistory = [];
    this._integralError = [];
    this._previousError = [];
    this._counter = 0;
    this._seedControllers();
  }

  public toPacket(): DataPacket<{
    controllers: number;
    controlHistory: number;
    errorHistory: number;
    forceHistory: number;
    mpcHistory: number;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['robotics', 'RobotControl'],
      priority: 1,
      phase: 'control',
    };
    return {
      id: `ctrl-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        controllers: this._controllers.size,
        controlHistory: this._controlHistory.length,
        errorHistory: this._errorHistory.length,
        forceHistory: this._forceHistory.length,
        mpcHistory: this._mpcHistory.length,
      },
      metadata,
    };
  }
}
