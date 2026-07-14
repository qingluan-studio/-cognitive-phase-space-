/**
 * 剩磁记忆模块：模拟磁滞现象中移除外加影响后仍然保留痕迹的记忆机制。
 * 记录输入历史对当前状态造成的不可逆偏移，可用于状态持久化与轨迹分析。
 */

export interface RemanenceRecord {
  field: number;
  magnetization: number;
  timestamp: number;
  tag: string;
}

export type RemanenceCurve = {
  ascending: number[];
  descending: number[];
  remanence: number;
};

export interface RemanenceConfig {
  saturation: number;
  decayRate: number;
  threshold: number;
  historySize: number;
}

export class RemanenceMemory {
  private _records: RemanenceRecord[] = [];
  private _config: RemanenceConfig;
  private _currentValue: number = 0;
  private _remanence: number = 0;
  private _metadata: Record<string, unknown> = {};

  constructor(config: RemanenceConfig) {
    this._config = config;
  }

  get currentValue(): number {
    return this._currentValue;
  }

  get remanence(): number {
    return this._remanence;
  }

  get recordCount(): number {
    return this._records.length;
  }

  applyField(field: number, tag: string = 'default'): void {
    const timestamp = Date.now();
    const delta = field - this._currentValue;
    this._currentValue = field;
    this._remanence = Math.max(
      this._remanence * (1 - this._config.decayRate),
      Math.min(field, this._config.saturation)
    );
    this._records.push({ field, magnetization: this._remanence, timestamp, tag });
    if (this._records.length > this._config.historySize) {
      this._records.shift();
    }
    this._metadata.lastDelta = delta;
  }

  releaseField(): void {
    const peak = this._remanence;
    this._currentValue = 0;
    this._remanence = peak * (1 - this._config.decayRate);
    this._metadata.releasedAt = Date.now();
  }

  computeCurve(steps: number): RemanenceCurve {
    const ascending: number[] = [];
    const descending: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const f = (i / steps) * this._config.saturation;
      ascending.push(f * 0.85);
    }
    for (let i = steps; i >= 0; i--) {
      const f = (i / steps) * this._config.saturation;
      descending.push(f * 0.85 + this._remanence * 0.15);
    }
    return { ascending, descending, remanence: this._remanence };
  }

  filterByTag(tag: string): RemanenceRecord[] {
    return this._records.filter((r) => r.tag === tag);
  }

  isAboveThreshold(): boolean {
    return Math.abs(this._remanence) > this._config.threshold;
  }

  reset(): void {
    this._records = [];
    this._currentValue = 0;
    this._remanence = 0;
    this._metadata = {};
  }

  exportState(): Record<string, unknown> {
    return {
      currentValue: this._currentValue,
      remanence: this._remanence,
      recordCount: this._records.length,
      config: this._config,
      metadata: this._metadata,
    };
  }
}
