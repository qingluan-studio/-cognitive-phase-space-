/**
 * 回声消除模块：在回声产生前预测并抵消反射成分。
 * 用于主动消除系统中不需要的重复信号。
 */

export interface CancellationFilter {
  frequency: number;
  attenuation: number;
  phase: number;
}

export type CancellationResult = {
  input: number;
  output: number;
  cancelled: number;
  efficiency: number;
};

export interface CancellationConfig {
  sampleRate: number;
  filterCount: number;
  adaptationRate: number;
}

export class EchoCancellation {
  private _config: CancellationConfig;
  private _filters: CancellationFilter[] = [];
  private _history: CancellationResult[] = [];
  private _buffer: number[] = [];
  private _state: Record<string, unknown> = {};

  constructor(config: CancellationConfig) {
    this._config = config;
    this._initFilters();
  }

  get filterCount(): number {
    return this._filters.length;
  }

  get bufferSize(): number {
    return this._buffer.length;
  }

  private _initFilters(): void {
    this._filters = [];
    for (let i = 0; i < this._config.filterCount; i++) {
      this._filters.push({
        frequency: (i + 1) * 100,
        attenuation: 0.5,
        phase: 0,
      });
    }
  }

  process(input: number): CancellationResult {
    this._buffer.push(input);
    if (this._buffer.length > 64) this._buffer.shift();
    let cancelled = 0;
    for (const filter of this._filters) {
      const echoEstimate = input * filter.attenuation * Math.cos(filter.phase);
      cancelled += echoEstimate;
      filter.phase += 0.1 * this._config.adaptationRate;
    }
    const output = input - cancelled * 0.5;
    const efficiency = input !== 0 ? Math.abs(cancelled) / Math.abs(input) : 0;
    const result: CancellationResult = { input, output, cancelled, efficiency };
    this._history.push(result);
    if (this._history.length > 50) this._history.shift();
    return result;
  }

  adapt(target: number): void {
    for (const filter of this._filters) {
      filter.attenuation =
        filter.attenuation * (1 - this._config.adaptationRate) +
        target * this._config.adaptationRate;
    }
    this._state.adaptedTo = target;
  }

  averageEfficiency(): number {
    if (this._history.length === 0) return 0;
    return this._history.reduce((acc, r) => acc + r.efficiency, 0) / this._history.length;
  }

  isEffective(): boolean {
    return this.averageEfficiency() > 0.6;
  }

  tuneFilter(index: number, attenuation: number): boolean {
    const filter = this._filters[index];
    if (!filter) return false;
    filter.attenuation = attenuation;
    return true;
  }

  resetFilters(): void {
    this._initFilters();
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      filterCount: this._filters.length,
      bufferSize: this._buffer.length,
      averageEfficiency: this.averageEfficiency(),
      state: this._state,
    };
  }
}
