import { DataPacket } from '../shared/types';

/** A sensor with noise and rate parameters. */
export interface Sensor {
  readonly type: 'imu' | 'gps' | 'lidar' | 'camera' | 'encoder';
  readonly noise: number;
  readonly rate: number;
  readonly data: number[];
  readonly id: string;
}

/** A fusion algorithm configuration. */
export interface FusionAlgorithm {
  readonly type: 'kalman' | 'ekf' | 'ukf' | 'particle' | 'complementary';
  readonly state: number[];
  readonly covariance: number[][];
  readonly initialized: boolean;
}

/** Kalman filter state. */
export interface KalmanState {
  readonly mean: number[];
  readonly covariance: number[][];
  readonly gain: number[][];
  readonly innovation: number[];
}

/** Result of a fusion step. */
export interface FusionResult {
  readonly estimate: number[];
  readonly covariance: number[][];
  readonly converged: boolean;
  readonly residual: number;
}

export class SensorFusion {
  private _sensors: Map<string, Sensor> = new Map();
  private _algorithms: FusionAlgorithm[] = [];
  private _states: KalmanState[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get sensorCount(): number {
    return this._sensors.size;
  }

  get algorithmCount(): number {
    return this._algorithms.length;
  }

  get stateCount(): number {
    return this._states.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public kalmanFilter(state: KalmanState, measurement: number[], noise: number): FusionResult {
    const H = [[1, 0], [0, 1]];
    const R = [[noise, 0], [0, noise]];
    const S = [
      [state.covariance[0][0] + R[0][0], state.covariance[0][1] + R[0][1]],
      [state.covariance[1][0] + R[1][0], state.covariance[1][1] + R[1][1]],
    ];
    const det = S[0][0] * S[1][1] - S[0][1] * S[1][0];
    const inv = det !== 0 ? [[S[1][1] / det, -S[0][1] / det], [-S[1][0] / det, S[0][0] / det]] : [[0, 0], [0, 0]];
    const K = [
      [state.covariance[0][0] * inv[0][0] + state.covariance[0][1] * inv[1][0], state.covariance[0][0] * inv[0][1] + state.covariance[0][1] * inv[1][1]],
      [state.covariance[1][0] * inv[0][0] + state.covariance[1][1] * inv[1][0], state.covariance[1][0] * inv[0][1] + state.covariance[1][1] * inv[1][1]],
    ];
    const innovation = [
      measurement[0] - (H[0][0] * state.mean[0] + H[0][1] * (state.mean[1] ?? 0)),
      measurement[1] - (H[1][0] * (state.mean[0] ?? 0) + H[1][1] * (state.mean[1] ?? 0)),
    ];
    const estimate = [
      (state.mean[0] ?? 0) + K[0][0] * innovation[0] + K[0][1] * innovation[1],
      (state.mean[1] ?? 0) + K[1][0] * innovation[0] + K[1][1] * innovation[1],
    ];
    const newCov = [
      [(1 - K[0][0]) * state.covariance[0][0], (1 - K[0][0]) * state.covariance[0][1]],
      [(1 - K[1][1]) * state.covariance[1][0], (1 - K[1][1]) * state.covariance[1][1]],
    ];
    const residual = Math.sqrt(innovation[0] * innovation[0] + innovation[1] * innovation[1]);
    this._recordHistory(`kalmanFilter(residual=${residual.toFixed(3)})`);
    return { estimate, covariance: newCov, converged: residual < 1, residual };
  }

  public extendedKalman(state: KalmanState, measurement: number[], nonlinearity: { jacobian: number[][] }): FusionResult {
    const estimate = state.mean.map((v, i) => v + (measurement[i] ?? 0) - v);
    const newCov = state.covariance.map(row => row.map(v => v * 0.9));
    const residual = Math.abs((measurement[0] ?? 0) - (state.mean[0] ?? 0));
    this._recordHistory(`extendedKalman(residual=${residual.toFixed(3)})`);
    return { estimate, covariance: newCov, converged: residual < 1, residual };
  }

  public unscentedKalman(state: KalmanState, measurement: number[], sigmaPoints: number[][]): FusionResult {
    const n = sigmaPoints.length;
    const estimate = state.mean.map((_, i) => sigmaPoints.reduce((s, sp) => s + (sp[i] ?? 0), 0) / n);
    const newCov = state.covariance.map(row => row.map(v => v * 0.85));
    const residual = Math.abs((measurement[0] ?? 0) - (estimate[0] ?? 0));
    this._recordHistory(`unscentedKalman(sigma=${n})`);
    return { estimate, covariance: newCov, converged: residual < 1, residual };
  }

  public particleFilter(particles: { weight: number; state: number[] }[], measurement: number[], weights: number[]): FusionResult {
    const n = particles.length;
    let estimate = new Array(particles[0]?.state.length ?? 0).fill(0);
    let totalW = 0;
    for (let i = 0; i < n; i++) {
      const w = weights[i] ?? 1 / n;
      totalW += w;
      for (let j = 0; j < estimate.length; j++) {
        estimate[j] += w * (particles[i].state[j] ?? 0);
      }
    }
    if (totalW > 0) estimate = estimate.map(v => v / totalW);
    const residual = Math.abs((measurement[0] ?? 0) - (estimate[0] ?? 0));
    this._recordHistory(`particleFilter(n=${n})`);
    return { estimate, covariance: [[0.1, 0], [0, 0.1]], converged: residual < 1, residual };
  }

  public complementaryFilter(high: number[], low: number[], alpha: number): number[] {
    const result = high.map((h, i) => alpha * h + (1 - alpha) * (low[i] ?? 0));
    this._recordHistory(`complementaryFilter(alpha=${alpha})`);
    return result;
  }

  public mahonyFilter(accel: number[], gyro: number[], mag: number[]): { orientation: number[]; bias: number[]; stable: boolean } {
    const orientation = [accel[0] ?? 0, accel[1] ?? 0, accel[2] ?? 0];
    const bias = gyro.map(g => g * 0.01);
    this._recordHistory('mahonyFilter()');
    return { orientation, bias, stable: Math.abs(accel[2] ?? 0) > 0.9 };
  }

  public madgwickFilter(accel: number[], gyro: number[], mag: number[], beta: number): { quaternion: number[]; beta: number; converged: boolean } {
    const q = [1, 0, 0, 0];
    this._recordHistory(`madgwickFilter(beta=${beta})`);
    return { quaternion: q, beta, converged: beta < 0.1 };
  }

  public weightedAverage(sensors: Sensor[], weights: number[]): number[] {
    const total = weights.reduce((s, w) => s + w, 0);
    const dim = sensors[0]?.data.length ?? 0;
    const result = new Array(dim).fill(0);
    for (let i = 0; i < sensors.length; i++) {
      const w = total > 0 ? (weights[i] ?? 0) / total : 1 / sensors.length;
      for (let j = 0; j < dim; j++) {
        result[j] += w * (sensors[i].data[j] ?? 0);
      }
    }
    this._recordHistory('weightedAverage()');
    return result;
  }

  public covarianceIntersection(estimate1: number[], estimate2: number[]): FusionResult {
    const omega = 0.5;
    const estimate = estimate1.map((e, i) => omega * e + (1 - omega) * (estimate2[i] ?? 0));
    this._recordHistory('covarianceIntersection()');
    return { estimate, covariance: [[0.1, 0], [0, 0.1]], converged: true, residual: 0 };
  }

  public consensus(sensors: Sensor[], iterations: number): { estimate: number[]; iterations: number; converged: boolean } {
    const dim = sensors[0]?.data.length ?? 0;
    let estimate = new Array(dim).fill(0);
    for (let iter = 0; iter < iterations; iter++) {
      const next = new Array(dim).fill(0);
      for (const s of sensors) {
        for (let j = 0; j < dim; j++) next[j] += (s.data[j] ?? 0) / sensors.length;
      }
      const delta = Math.sqrt(next.reduce((s, v, i) => s + Math.pow(v - (estimate[i] ?? 0), 2), 0));
      estimate = next;
      if (delta < 1e-3) break;
    }
    this._recordHistory(`consensus(iter=${iterations})`);
    return { estimate, iterations, converged: true };
  }

  public crossCovariance(sensors: Sensor[]): number[][] {
    const n = sensors.length;
    const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        cov[i][j] = sensors[i].noise * sensors[j].noise * 0.5;
      }
    }
    this._recordHistory('crossCovariance()');
    return cov;
  }

  public consistencyCheck(sensors: Sensor[], threshold: number): { consistent: boolean; deviations: number[]; threshold: number } {
    const deviations = sensors.map(s => s.noise);
    const max = Math.max(...deviations);
    const consistent = max < threshold;
    this._recordHistory(`consistencyCheck(consistent=${consistent})`);
    return { consistent, deviations, threshold };
  }

  public faultDetection(sensor: Sensor, estimate: number[]): { faulty: boolean; deviation: number; sensor: string } {
    const deviation = Math.sqrt(sensor.data.reduce((s, v, i) => s + Math.pow(v - (estimate[i] ?? 0), 2), 0));
    const faulty = deviation > sensor.noise * 3;
    this._recordHistory(`faultDetection(faulty=${faulty})`);
    return { faulty, deviation, sensor: sensor.id };
  }

  public registerSensor(sensor: Sensor): void {
    this._sensors.set(sensor.id, sensor);
  }

  public algorithms(): FusionAlgorithm[] {
    return this._algorithms.map(a => ({ ...a, state: [...a.state], covariance: a.covariance.map(r => [...r]) }));
  }

  public sensors(): Sensor[] {
    return Array.from(this._sensors.values()).map(s => ({ ...s, data: [...s.data] }));
  }

  public lastAlgorithm(): FusionAlgorithm | null {
    return this._algorithms.length > 0
      ? { ...this._algorithms[this._algorithms.length - 1], state: [...this._algorithms[this._algorithms.length - 1].state], covariance: this._algorithms[this._algorithms.length - 1].covariance.map(r => [...r]) }
      : null;
  }

  public summary(): { sensors: number; algorithms: number; states: number; historyLength: number; counter: number } {
    return {
      sensors: this._sensors.size,
      algorithms: this._algorithms.length,
      states: this._states.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      sensors: this._sensors.size,
      algorithms: this._algorithms.length,
      states: this._states.length,
      history: [...this._history],
      sensorTypes: Array.from(this._sensors.values()).map(s => s.type),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const s of this._sensors.values()) {
      if (s.noise < 0) issues.push(`sensor ${s.id}: negative noise`);
      if (s.rate <= 0) issues.push(`sensor ${s.id}: non-positive rate`);
    }
    for (const a of this._algorithms) {
      if (a.covariance.length !== a.state.length) {
        issues.push(`algorithm ${a.type}: covariance dimension mismatch`);
      }
    }
    return { valid: issues.length === 0, issues };
  }

  public sensorComparison(sensors: Sensor[]): {
    byNoise: { id: string; noise: number }[];
    byRate: { id: string; rate: number }[];
    bestSignalToNoise: string;
  } {
    const byNoise = sensors.map(s => ({ id: s.id, noise: s.noise })).sort((a, b) => a.noise - b.noise);
    const byRate = sensors.map(s => ({ id: s.id, rate: s.rate })).sort((a, b) => b.rate - a.rate);
    return { byNoise, byRate, bestSignalToNoise: byNoise[0]?.id ?? 'none' };
  }

  public fusionPerformance(truth: number[], estimates: number[][]): {
    mse: number;
    mae: number;
    rmse: number;
    bias: number;
  } {
    const n = estimates.length;
    if (n === 0) return { mse: 0, mae: 0, rmse: 0, bias: 0 };
    let se = 0;
    let ae = 0;
    let bias = 0;
    for (const est of estimates) {
      const dim = Math.min(truth.length, est.length);
      for (let i = 0; i < dim; i++) {
        const err = (est[i] ?? 0) - (truth[i] ?? 0);
        se += err * err;
        ae += Math.abs(err);
        bias += err;
      }
    }
    const total = n * truth.length;
    const mse = total > 0 ? se / total : 0;
    const mae = total > 0 ? ae / total : 0;
    const rmse = Math.sqrt(mse);
    return { mse, mae, rmse, bias: total > 0 ? bias / total : 0 };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    sensors: number;
    algorithms: number;
    states: number;
    history: string[];
  }> {
    return {
      id: `sensorfusion-${Date.now()}-${this._counter}`,
      payload: {
        sensors: this._sensors.size,
        algorithms: this._algorithms.length,
        states: this._states.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['robotics', 'sensor_fusion', 'result'],
        priority: 0.9,
        phase: 'estimation',
      },
    };
  }

  public reset(): void {
    this._sensors.clear();
    this._algorithms = [];
    this._states = [];
    this._history = [];
    this._counter = 0;
  }
}
