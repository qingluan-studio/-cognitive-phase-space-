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
  coercivity: number;
};

export interface RemanenceConfig {
  saturation: number;
  decayRate: number;
  threshold: number;
  historySize: number;
  domainDensity: number;
}

export class RemanenceMemory {
  private _records: RemanenceRecord[] = [];
  private _config: RemanenceConfig;
  private _currentValue: number = 0;
  private _remanence: number = 0;
  private _metadata: Record<string, unknown> = {};
  private _lastDirection: number = 0;

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

  private _langevin(x: number): number {
    if (Math.abs(x) < 1e-6) return x / 3;
    return 1 / Math.tanh(x) - 1 / x;
  }

  private _anhysteretic(field: number): number {
    const arg = field / Math.max(this._config.saturation, 1e-6);
    return this._config.saturation * this._langevin(arg * 3);
  }

  applyField(field: number, tag: string = 'default'): void {
    const timestamp = Date.now();
    const delta = field - this._currentValue;
    const direction = Math.sign(delta);
    if (direction !== 0 && this._lastDirection !== 0 && direction !== this._lastDirection) {
      this._metadata.reversalAt = timestamp;
    }
    if (direction !== 0) this._lastDirection = direction;
    this._currentValue = field;
    const target = this._anhysteretic(field);
    const rate = this._config.domainDensity * (1 - this._remanence / Math.max(this._config.saturation, 1e-6));
    this._remanence = this._remanence * (1 - rate) + target * rate;
    this._remanence = Math.max(
      this._remanence * (1 - this._config.decayRate),
      Math.min(Math.abs(field), this._config.saturation) * Math.sign(field || 1)
    );
    this._records.push({ field, magnetization: this._remanence, timestamp, tag });
    if (this._records.length > this._config.historySize) this._records.shift();
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
      ascending.push(this._anhysteretic(f));
    }
    for (let i = steps; i >= 0; i--) {
      const f = (i / steps) * this._config.saturation;
      descending.push(this._anhysteretic(f) + this._remanence * 0.15);
    }
    let coercivity = 0;
    for (let i = 0; i < descending.length; i++) {
      if (Math.abs(descending[i]) < 0.01) {
        coercivity = (i / steps) * this._config.saturation;
        break;
      }
    }
    return { ascending, descending, remanence: this._remanence, coercivity };
  }

  computeEnergy(): number {
    let energy = 0;
    for (let i = 1; i < this._records.length; i++) {
      const dH = this._records[i].field - this._records[i - 1].field;
      const avgM = (this._records[i].magnetization + this._records[i - 1].magnetization) / 2;
      energy += avgM * dH;
    }
    return Math.abs(energy);
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
    this._lastDirection = 0;
  }

  exportState(): Record<string, unknown> {
    return {
      currentValue: this._currentValue,
      remanence: this._remanence,
      recordCount: this._records.length,
      config: this._config,
      loopEnergy: this.computeEnergy(),
      metadata: this._metadata,
    };
  }
}
