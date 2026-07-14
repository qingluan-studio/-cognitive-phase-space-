/**
 * 眼跳过滤器模块：模仿人眼快速跳动采样机制，
 * 仅捕获信号突变瞬间而忽略连续冗余区间，大幅降低冗余采样。
 */

export interface SaccadeSample {
  id: string;
  value: number;
  timestamp: number;
  isFixation: boolean;
  jumpMagnitude: number;
}

export interface SaccadeConfig {
  jumpThreshold: number;
  fixationWindowMs: number;
  maxSamples: number;
}

export class SaccadeFilter {
  private _samples: SaccadeSample[] = [];
  private _config: SaccadeConfig;
  private _lastValue: number | null = null;
  private _lastTimestamp = 0;
  private _fixationCount = 0;
  private _saccadeCount = 0;
  private _suppressedCount = 0;

  constructor(config?: Partial<SaccadeConfig>) {
    this._config = {
      jumpThreshold: config?.jumpThreshold ?? 0.15,
      fixationWindowMs: config?.fixationWindowMs ?? 200,
      maxSamples: config?.maxSamples ?? 128,
    };
  }

  observe(value: number): SaccadeSample | null {
    const now = Date.now();
    if (this._lastValue === null) {
      this._lastValue = value;
      this._lastTimestamp = now;
      const sample = this._makeSample('init', value, now, false, 0);
      return sample;
    }

    const delta = Math.abs(value - this._lastValue);
    const elapsed = now - this._lastTimestamp;

    if (delta < this._config.jumpThreshold && elapsed < this._config.fixationWindowMs) {
      this._suppressedCount++;
      this._fixationCount++;
      return null;
    }

    const isFixation = delta < this._config.jumpThreshold;
    const sample = this._makeSample(`s${this._samples.length}`, value, now, isFixation, delta);
    this._lastValue = value;
    this._lastTimestamp = now;
    if (!isFixation) this._saccadeCount++;
    return sample;
  }

  private _makeSample(id: string, value: number, timestamp: number, isFixation: boolean, jump: number): SaccadeSample {
    const sample: SaccadeSample = { id, value, timestamp, isFixation, jumpMagnitude: jump };
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
    return this._samples.filter(s => s.isFixation);
  }

  saccadePoints(): SaccadeSample[] {
    return this._samples.filter(s => !s.isFixation);
  }

  averageJump(): number {
    if (this._samples.length === 0) return 0;
    return this._samples.reduce((s, x) => s + x.jumpMagnitude, 0) / this._samples.length;
  }

  compressionRatio(): number {
    const total = this._samples.length + this._suppressedCount;
    return total === 0 ? 0 : this._samples.length / total;
  }

  tune(partial: Partial<SaccadeConfig>): void {
    this._config = { ...this._config, ...partial };
  }

  reset(): void {
    this._samples = [];
    this._lastValue = null;
    this._lastTimestamp = 0;
    this._fixationCount = 0;
    this._saccadeCount = 0;
    this._suppressedCount = 0;
  }

  get sampleCount(): number {
    return this._samples.length;
  }

  get suppressedCount(): number {
    return this._suppressedCount;
  }

  get config(): SaccadeConfig {
    return { ...this._config };
  }
}
