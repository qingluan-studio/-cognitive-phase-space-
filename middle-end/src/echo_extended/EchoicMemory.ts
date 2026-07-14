export interface EchoicTrace {
  id: number;
  stimulus: number;
  strength: number;
  timestamp: number;
}

export type MemoryDecay = {
  halfLife: number;
  currentStrength: number;
  remaining: number;
};

export interface EchoicMemoryConfig {
  capacity: number;
  decayRate: number;
  halfLife: number;
}

export class EchoicMemory {
  private _config: EchoicMemoryConfig;
  private _traces: EchoicTrace[] = [];
  private _nextId: number = 0;
  private _clock: number = 0;
  private _meta: Record<string, unknown> = {};
  private _autocorrelation: number[] = [];
  private _powerSpectrum: number[] = [];
  private _fftSize: number = 16;

  constructor(config: EchoicMemoryConfig) {
    this._config = config;
  }

  get traceCount(): number {
    return this._traces.length;
  }

  get clock(): number {
    return this._clock;
  }

  get spectralCentroid(): number {
    return this._computeSpectralCentroid();
  }

  private _computeDFT(signal: number[]): { real: number[]; imag: number[] } {
    const N = signal.length;
    const real: number[] = [];
    const imag: number[] = [];
    for (let k = 0; k < N; k++) {
      let r = 0;
      let i = 0;
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        r += signal[n] * Math.cos(angle);
        i += signal[n] * Math.sin(angle);
      }
      real.push(r / N);
      imag.push(i / N);
    }
    return { real, imag };
  }

  private _updateSpectrum(): void {
    const strengths = this._traces.map((t) => t.strength);
    while (strengths.length < this._fftSize) strengths.unshift(0);
    const sliced = strengths.slice(-this._fftSize);
    const dft = this._computeDFT(sliced);
    this._powerSpectrum = [];
    for (let i = 0; i < dft.real.length; i++) {
      this._powerSpectrum.push(dft.real[i] * dft.real[i] + dft.imag[i] * dft.imag[i]);
    }
  }

  private _computeSpectralCentroid(): number {
    if (this._powerSpectrum.length === 0) return 0;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < this._powerSpectrum.length; i++) {
      numerator += i * this._powerSpectrum[i];
      denominator += this._powerSpectrum[i];
    }
    return denominator > 0 ? numerator / denominator : 0;
  }

  private _computeAutocorrelation(): void {
    const strengths = this._traces.map((t) => t.strength);
    if (strengths.length < 2) {
      this._autocorrelation = [];
      return;
    }
    const mean = strengths.reduce((a, b) => a + b, 0) / strengths.length;
    const N = strengths.length;
    this._autocorrelation = [];
    for (let lag = 0; lag < Math.min(N, 8); lag++) {
      let num = 0;
      let den = 0;
      for (let i = 0; i < N - lag; i++) {
        num += (strengths[i] - mean) * (strengths[i + lag] - mean);
      }
      for (let i = 0; i < N; i++) {
        den += (strengths[i] - mean) * (strengths[i] - mean);
      }
      this._autocorrelation.push(den > 0 ? num / den : 0);
    }
  }

  receive(stimulus: number): EchoicTrace {
    const trace: EchoicTrace = {
      id: this._nextId++,
      stimulus,
      strength: 1,
      timestamp: this._clock,
    };
    this._traces.push(trace);
    if (this._traces.length > this._config.capacity) {
      this._traces.shift();
    }
    this._meta.lastReceived = trace.id;
    this._updateSpectrum();
    this._computeAutocorrelation();
    return trace;
  }

  advance(dt: number): void {
    this._clock += dt;
    for (const trace of this._traces) {
      const age = this._clock - trace.timestamp;
      trace.strength = Math.pow(0.5, age / this._config.halfLife);
    }
    this._traces = this._traces.filter((t) => t.strength > 0.05);
    this._updateSpectrum();
    this._computeAutocorrelation();
  }

  computeDecay(): MemoryDecay {
    if (this._traces.length === 0) {
      return { halfLife: this._config.halfLife, currentStrength: 0, remaining: 0 };
    }
    const totalStrength = this._traces.reduce((acc, t) => acc + t.strength, 0);
    const current = totalStrength / this._traces.length;
    return {
      halfLife: this._config.halfLife,
      currentStrength: current,
      remaining: this._traces.length,
    };
  }

  retrieve(id: number): EchoicTrace | null {
    return this._traces.find((t) => t.id === id) ?? null;
  }

  strongestTrace(): EchoicTrace | null {
    if (this._traces.length === 0) return null;
    return this._traces.reduce((best, t) => (t.strength > best.strength ? t : best));
  }

  averageStrength(): number {
    if (this._traces.length === 0) return 0;
    return this._traces.reduce((acc, t) => acc + t.strength, 0) / this._traces.length;
  }

  isFading(): boolean {
    return this.averageStrength() < 0.3;
  }

  flush(): void {
    this._traces = [];
    this._meta.flushedAt = this._clock;
    this._powerSpectrum = [];
    this._autocorrelation = [];
  }

  report(): Record<string, unknown> {
    return {
      traceCount: this._traces.length,
      clock: this._clock,
      averageStrength: this.averageStrength(),
      meta: this._meta,
      spectralCentroid: this.spectralCentroid.toFixed(4),
      autocorrelation: this._autocorrelation,
    };
  }
}
