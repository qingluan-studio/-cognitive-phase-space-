export type SaccadeType = 'fixation' | 'saccade' | 'microsaccade' | 'drift' | 'glissade';

export interface SaccadeSample {
  id: string;
  value: number;
  timestamp: number;
  isFixation: boolean;
  jumpMagnitude: number;
  velocity: number;
  acceleration: number;
  type: SaccadeType;
  filtered: number;
}

export interface SaccadeConfig {
  jumpThreshold: number;
  fixationWindowMs: number;
  maxSamples: number;
  velocityThreshold: number;
  accelerationThreshold: number;
  microsaccadeMin: number;
  kalmanQ: number;
  kalmanR: number;
}

interface KalmanState {
  x: number;
  p: number;
  v: number;
  pV: number;
}

export class SaccadeFilter {
  private _samples: SaccadeSample[] = [];
  private _config: SaccadeConfig;
  private _lastValue: number | null = null;
  private _lastTimestamp = 0;
  private _lastVelocity = 0;
  private _fixationCount = 0;
  private _saccadeCount = 0;
  private _microsaccadeCount = 0;
  private _driftCount = 0;
  private _suppressedCount = 0;
  private _kalman: KalmanState;
  private _runningMean = 0;
  private _runningVar = 1;
  private _sampleCount = 0;
  private _iqrWindow: number[] = [];
  private _adaptiveThreshold: number;
  private _fixationBuffer: Array<{ value: number; timestamp: number }> = [];

  constructor(config?: Partial<SaccadeConfig>) {
    this._config = {
      jumpThreshold: config?.jumpThreshold ?? 0.15,
      fixationWindowMs: config?.fixationWindowMs ?? 200,
      maxSamples: config?.maxSamples ?? 128,
      velocityThreshold: config?.velocityThreshold ?? 0.08,
      accelerationThreshold: config?.accelerationThreshold ?? 0.5,
      microsaccadeMin: config?.microsaccadeMin ?? 0.02,
      kalmanQ: config?.kalmanQ ?? 0.001,
      kalmanR: config?.kalmanR ?? 0.01,
    };
    this._kalman = { x: 0, p: 1, v: 0, pV: 1 };
    this._adaptiveThreshold = this._config.jumpThreshold;
  }

  observe(value: number): SaccadeSample | null {
    const now = Date.now();
    if (this._lastValue === null) {
      this._lastValue = value;
      this._lastTimestamp = now;
      this._kalman.x = value;
      this._runningMean = value;
      this._runningVar = 0.01;
      const sample = this._makeSample('init', value, now, true, 0, 0, 0, 'fixation', value);
      return sample;
    }

    const dt = Math.max(1, now - this._lastTimestamp) / 1000;
    const rawDelta = value - this._lastValue;
    const velocity = rawDelta / dt;
    const acceleration = (velocity - this._lastVelocity) / dt;

    const filtered = this._kalmanUpdate(value, velocity, dt);
    const filteredDelta = filtered - this._kalman.x;
    const jumpMagnitude = Math.abs(filteredDelta);

    this._updateIQR(value);
    this._updateAdaptiveThreshold();

    const detection = this._classifyEyeMovement(
      jumpMagnitude,
      Math.abs(velocity),
      Math.abs(acceleration),
      now
    );

    const isFixation = detection === 'fixation' || detection === 'drift';

    if (isFixation && now - this._lastTimestamp < this._config.fixationWindowMs && jumpMagnitude < this._adaptiveThreshold) {
      this._suppressedCount++;
      if (detection === 'fixation') this._fixationCount++;
      else this._driftCount++;
      this._fixationBuffer.push({ value, timestamp: now });
      return null;
    }

    const type = detection;
    const sample = this._makeSample(
      `s${this._samples.length}`,
      filtered,
      now,
      isFixation,
      jumpMagnitude,
      velocity,
      acceleration,
      type,
      value
    );

    this._lastValue = value;
    this._lastTimestamp = now;
    this._lastVelocity = velocity;
    this._kalman.x = filtered;

    if (detection === 'saccade') this._saccadeCount++;
    else if (detection === 'microsaccade') this._microsaccadeCount++;
    else if (detection === 'fixation') this._fixationCount++;
    else this._driftCount++;

    this._fixationBuffer = [{ value, timestamp: now }];
    return sample;
  }

  private _kalmanUpdate(measurement: number, velocity: number, dt: number): number {
    this._kalman.p += this._config.kalmanQ * dt;
    this._kalman.pV += this._config.kalmanQ * dt * 0.5;

    const kGain = this._kalman.p / (this._kalman.p + this._config.kalmanR);
    const kGainV = this._kalman.pV / (this._kalman.pV + this._config.kalmanR * 2);

    this._kalman.x = this._kalman.x + this._kalman.v * dt + kGain * (measurement - this._kalman.x - this._kalman.v * dt);
    this._kalman.v = this._kalman.v + kGainV * (velocity - this._kalman.v);

    this._kalman.p = (1 - kGain) * this._kalman.p;
    this._kalman.pV = (1 - kGainV) * this._kalman.pV;

    return this._kalman.x;
  }

  private _updateIQR(value: number): void {
    this._iqrWindow.push(value);
    if (this._iqrWindow.length > 50) this._iqrWindow.shift();
  }

  private _updateAdaptiveThreshold(): void {
    if (this._iqrWindow.length < 10) {
      this._adaptiveThreshold = this._config.jumpThreshold;
      return;
    }
    const sorted = [...this._iqrWindow].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    this._adaptiveThreshold = Math.max(0.01, iqr * 1.5);
  }

  private _classifyEyeMovement(
    jump: number,
    absVelocity: number,
    absAcceleration: number,
    now: number
  ): SaccadeType {
    const vThresh = this._config.velocityThreshold;
    const aThresh = this._config.accelerationThreshold;
    const microMin = this._config.microsaccadeMin;

    const highVelocity = absVelocity > vThresh;
    const highAcceleration = absAcceleration > aThresh;
    const largeJump = jump > this._adaptiveThreshold;
    const microJump = jump > microMin && jump <= this._adaptiveThreshold;

    if (largeJump && (highVelocity || highAcceleration)) {
      return 'saccade';
    }
    if (microJump && highVelocity) {
      return 'microsaccade';
    }
    if (!highVelocity && jump < microMin * 0.5) {
      return 'fixation';
    }
    if (absVelocity > vThresh * 0.3 && absVelocity <= vThresh) {
      return 'drift';
    }
    if (largeJump && !highAcceleration) {
      return 'glissade';
    }
    return 'fixation';
  }

  private _makeSample(
    id: string,
    value: number,
    timestamp: number,
    isFixation: boolean,
    jump: number,
    velocity: number,
    acceleration: number,
    type: SaccadeType,
    raw: number
  ): SaccadeSample {
    const sample: SaccadeSample = {
      id,
      value,
      timestamp,
      isFixation,
      jumpMagnitude: jump,
      velocity,
      acceleration,
      type,
      filtered: raw,
    };
    this._samples.push(sample);
    if (this._samples.length > this._config.maxSamples) this._samples.shift();
    return sample;
  }

  burstObserve(values: number[]): SaccadeSample[] {
    const captured: SaccadeSample[] = [];
    for (const v of values) {
      const s = this.observe(v);
      if (s) captured.push(s);
    }
    return captured;
  }

  fixationPoints(): SaccadeSample[] {
    return this._samples.filter(s => s.type === 'fixation');
  }

  saccadePoints(): SaccadeSample[] {
    return this._samples.filter(s => s.type === 'saccade' || s.type === 'microsaccade');
  }

  saccadeAmplitudes(): number[] {
    return this.saccadePoints().map(s => s.jumpMagnitude);
  }

  mainSequence(): number {
    const saccades = this.saccadePoints();
    if (saccades.length < 2) return 0;
    let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0;
    for (const s of saccades) {
      sumXY += s.jumpMagnitude * Math.abs(s.velocity);
      sumX += s.jumpMagnitude;
      sumY += Math.abs(s.velocity);
      sumX2 += s.jumpMagnitude * s.jumpMagnitude;
    }
    const n = saccades.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  averageJump(): number {
    if (this._samples.length === 0) return 0;
    return this._samples.reduce((s, x) => s + x.jumpMagnitude, 0) / this._samples.length;
  }

  averageVelocity(): number {
    if (this._samples.length === 0) return 0;
    return this._samples.reduce((s, x) => s + Math.abs(x.velocity), 0) / this._samples.length;
  }

  compressionRatio(): number {
    const total = this._samples.length + this._suppressedCount;
    return total === 0 ? 0 : this._samples.length / total;
  }

  fixationDurationStats(): { mean: number; std: number } {
    const fixations = this.fixationPoints();
    if (fixations.length < 2) return { mean: 0, std: 0 };
    const durations: number[] = [];
    for (let i = 1; i < fixations.length; i++) {
      durations.push(fixations[i].timestamp - fixations[i - 1].timestamp);
    }
    const mean = durations.reduce((s, d) => s + d, 0) / durations.length;
    const variance = durations.reduce((s, d) => s + (d - mean) ** 2, 0) / durations.length;
    return { mean, std: Math.sqrt(variance) };
  }

  tune(partial: Partial<SaccadeConfig>): void {
    this._config = { ...this._config, ...partial };
  }

  reset(): void {
    this._samples = [];
    this._lastValue = null;
    this._lastTimestamp = 0;
    this._lastVelocity = 0;
    this._fixationCount = 0;
    this._saccadeCount = 0;
    this._microsaccadeCount = 0;
    this._driftCount = 0;
    this._suppressedCount = 0;
    this._kalman = { x: 0, p: 1, v: 0, pV: 1 };
    this._runningMean = 0;
    this._runningVar = 1;
    this._sampleCount = 0;
    this._iqrWindow = [];
    this._adaptiveThreshold = this._config.jumpThreshold;
    this._fixationBuffer = [];
  }

  get sampleCount(): number { return this._samples.length; }
  get suppressedCount(): number { return this._suppressedCount; }
  get saccadeCount(): number { return this._saccadeCount; }
  get microsaccadeCount(): number { return this._microsaccadeCount; }
  get fixationCount(): number { return this._fixationCount; }
  get driftCount(): number { return this._driftCount; }
  get adaptiveThreshold(): number { return this._adaptiveThreshold; }
  get config(): SaccadeConfig { return { ...this._config }; }
}
