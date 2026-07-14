export interface DampedSample {
  id: string;
  raw: number;
  damped: number;
  velocity: number;
  timestamp: number;
  kalmanEstimate: number;
}

export interface DampingConfig {
  smoothingFactor: number;
  momentum: number;
  maxAcceleration: number;
}

export class InertialDamper {
  private _samples: Map<string, DampedSample> = new Map();
  private _config: DampingConfig;
  private _lastValue: number | null = null;
  private _lastVelocity = 0;
  private _oscillations = 0;
  private _smoothed = 0;
  private _kalmanGain = 0.5;
  private _estimateError = 1;
  private _measurementError = 1;
  private _integral = 0;
  private _prevError = 0;
  private _kp = 0.5;
  private _ki = 0.1;
  private _kd = 0.2;

  constructor(config?: Partial<DampingConfig>) {
    this._config = {
      smoothingFactor: config?.smoothingFactor ?? 0.3,
      momentum: config?.momentum ?? 0.8,
      maxAcceleration: config?.maxAcceleration ?? 0.5,
    };
  }

  feed(id: string, raw: number): DampedSample {
    const now = Date.now();

    if (this._lastValue === null) {
      this._lastValue = raw;
      this._smoothed = raw;
      const sample: DampedSample = {
        id, raw, damped: raw, velocity: 0, timestamp: now, kalmanEstimate: raw,
      };
      this._samples.set(id, sample);
      return sample;
    }

    const delta = raw - this._lastValue;
    const acceleration = delta - this._lastVelocity;
    const clampedAccel = Math.max(
      -this._config.maxAcceleration,
      Math.min(this._config.maxAcceleration, acceleration)
    );

    const newVelocity = this._lastVelocity * this._config.momentum + clampedAccel;
    const pidAdjusted = this._pidControl(raw, this._smoothed);
    const damped = this._smoothed * (1 - this._config.smoothingFactor) +
                   (this._lastValue + newVelocity + pidAdjusted) * this._config.smoothingFactor / 1.5;

    const kalmanEstimate = this._kalmanFilter(raw, damped);

    if (Math.sign(this._lastVelocity) !== Math.sign(newVelocity) && Math.abs(this._lastVelocity) > 0.1) {
      this._oscillations++;
    }

    this._lastValue = raw;
    this._lastVelocity = newVelocity;
    this._smoothed = damped;

    const sample: DampedSample = {
      id, raw, damped, velocity: newVelocity, timestamp: now, kalmanEstimate,
    };
    this._samples.set(id, sample);
    return sample;
  }

  private _pidControl(target: number, current: number): number {
    const error = target - current;
    this._integral += error;
    const derivative = error - this._prevError;
    this._prevError = error;
    return this._kp * error + this._ki * this._integral + this._kd * derivative;
  }

  private _kalmanFilter(measurement: number, prediction: number): number {
    const predictionError = this._estimateError + this._measurementError;
    this._kalmanGain = predictionError / (predictionError + this._measurementError);
    const estimate = prediction + this._kalmanGain * (measurement - prediction);
    this._estimateError = (1 - this._kalmanGain) * predictionError;
    return estimate;
  }

  burstFeed(items: Array<{ id: string; raw: number }>): DampedSample[] {
    return items.map(item => this.feed(item.id, item.raw));
  }

  stabilityIndex(): number {
    if (this._samples.size < 2) return 1;
    return Math.max(0, 1 - this._oscillations / this._samples.size);
  }

  averageVelocity(): number {
    if (this._samples.size === 0) return 0;
    return Array.from(this._samples.values()).reduce((s, x) => s + Math.abs(x.velocity), 0) / this._samples.size;
  }

  peakOvershoot(): number {
    if (this._samples.size === 0) return 0;
    return Array.from(this._samples.values()).reduce((max, s) => Math.max(max, Math.abs(s.raw - s.damped)), 0);
  }

  kalmanAccuracy(): number {
    if (this._samples.size < 2) return 0;
    let totalError = 0;
    const values = Array.from(this._samples.values());
    for (let i = 1; i < values.length; i++) {
      totalError += Math.abs(values[i].kalmanEstimate - values[i].raw);
    }
    return Math.max(0, 1 - totalError / (values.length - 1));
  }

  tune(partial: Partial<DampingConfig>): void {
    this._config = { ...this._config, ...partial };
  }

  setPIDParams(kp: number, ki: number, kd: number): void {
    this._kp = Math.max(0, kp);
    this._ki = Math.max(0, ki);
    this._kd = Math.max(0, kd);
  }

  setKalmanParams(estimateErr: number, measurementErr: number): void {
    this._estimateError = Math.max(0.001, estimateErr);
    this._measurementError = Math.max(0.001, measurementErr);
  }

  recentSamples(limit = 5): DampedSample[] {
    return Array.from(this._samples.values()).slice(-limit);
  }

  reset(): void {
    this._samples.clear();
    this._lastValue = null;
    this._lastVelocity = 0;
    this._smoothed = 0;
    this._oscillations = 0;
    this._integral = 0;
    this._prevError = 0;
    this._kalmanGain = 0.5;
    this._estimateError = 1;
  }

  get sampleCount(): number { return this._samples.size; }
  get oscillationCount(): number { return this._oscillations; }
  get currentDamped(): number { return this._smoothed; }
  get config(): DampingConfig { return { ...this._config }; }
  get kalmanGain(): number { return this._kalmanGain; }
}
