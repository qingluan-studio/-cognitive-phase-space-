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
  private _lmsWeights: number[] = [];
  private _convolutionKernel: number[] = [];
  private _kernelSize: number = 8;

  constructor(config: CancellationConfig) {
    this._config = config;
    this._initFilters();
    this._initLMS();
  }

  get filterCount(): number {
    return this._filters.length;
  }

  get bufferSize(): number {
    return this._buffer.length;
  }

  get lmsError(): number {
    return this._computeLMSError();
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

  private _initLMS(): void {
    this._lmsWeights = new Array(this._kernelSize).fill(0);
    this._convolutionKernel = [];
    for (let i = 0; i < this._kernelSize; i++) {
      this._convolutionKernel.push(Math.exp(-i * 0.5));
    }
  }

  private _convolve(signal: number[]): number {
    let result = 0;
    for (let i = 0; i < this._kernelSize && i < signal.length; i++) {
      result += signal[signal.length - 1 - i] * this._convolutionKernel[i];
    }
    return result;
  }

  private _lmsUpdate(error: number): void {
    for (let i = 0; i < this._kernelSize; i++) {
      const input = this._buffer[this._buffer.length - 1 - i] || 0;
      this._lmsWeights[i] += this._config.adaptationRate * error * input;
    }
  }

  private _computeLMSError(): number {
    if (this._history.length === 0) return 0;
    const last = this._history[this._history.length - 1];
    return Math.abs(last.input - last.output);
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
    const convolved = this._convolve(this._buffer);
    const lmsEstimate = this._lmsWeights.reduce((sum, w, i) => sum + w * (this._buffer[this._buffer.length - 1 - i] || 0), 0);
    const totalEstimate = cancelled * 0.5 + convolved * 0.1 + lmsEstimate * 0.1;
    const output = input - totalEstimate;
    const efficiency = input !== 0 ? Math.abs(totalEstimate) / Math.abs(input) : 0;
    const result: CancellationResult = { input, output, cancelled: totalEstimate, efficiency };
    this._history.push(result);
    if (this._history.length > 50) this._history.shift();
    this._lmsUpdate(input - output);
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
    this._initLMS();
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      filterCount: this._filters.length,
      bufferSize: this._buffer.length,
      averageEfficiency: this.averageEfficiency(),
      state: this._state,
      lmsError: this.lmsError.toFixed(4),
    };
  }
}
