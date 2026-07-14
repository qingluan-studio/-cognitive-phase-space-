/**
 * 惯性阻尼器模块：防止处理管道因突发波动而震荡，
 * 通过低通滤波与动量缓冲实现平滑过渡。
 */

export interface DampedSample {
  id: string;
  raw: number;
  damped: number;
  velocity: number;
  timestamp: number;
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
      const sample: DampedSample = { id, raw, damped: raw, velocity: 0, timestamp: now };
      this._samples.set(id, sample);
      return sample;
    }

    const delta = raw - this._lastValue;
    const acceleration = delta - this._lastVelocity;
    const clampedAccel = Math.max(-this._config.maxAcceleration, Math.min(this._config.maxAcceleration, acceleration));

    const newVelocity = this._lastVelocity * this._config.momentum + clampedAccel;
    const damped = this._smoothed * (1 - this._config.smoothingFactor) + (this._lastValue + newVelocity) * this._config.smoothingFactor;

    if (Math.sign(this._lastVelocity) !== Math.sign(newVelocity) && Math.abs(this._lastVelocity) > 0.1) {
      this._oscillations++;
    }

    this._lastValue = raw;
    this._lastVelocity = newVelocity;
    this._smoothed = damped;

    const sample: DampedSample = { id, raw, damped, velocity: newVelocity, timestamp: now };
    this._samples.set(id, sample);
    return sample;
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

  tune(partial: Partial<DampingConfig>): void {
    this._config = { ...this._config, ...partial };
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
  }

  get sampleCount(): number {
    return this._samples.size;
  }

  get oscillationCount(): number {
    return this._oscillations;
  }

  get currentDamped(): number {
    return this._smoothed;
  }

  get config(): DampingConfig {
    return { ...this._config };
  }
}
