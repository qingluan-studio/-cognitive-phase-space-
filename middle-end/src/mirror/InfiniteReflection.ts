export interface Reflection {
  depth: number;
  amplitude: number;
  phaseShift: number;
  sourceId: string;
}

export type ReflectionChain = {
  totalDepth: number;
  totalAmplitude: number;
  infiniteLimit: boolean;
};

export interface InfiniteConfig {
  reflectivity: number;
  absorption: number;
  maxDepth: number;
}

export class InfiniteReflection {
  private _config: InfiniteConfig;
  private _reflections: Reflection[] = [];
  private _chains: ReflectionChain[] = [];
  private _state: Record<string, unknown> = {};
  private _geometricSeriesSum: number = 0;
  private _fourierTransform: number[] = [];
  private _impulseResponse: number[] = [];

  constructor(config: InfiniteConfig) {
    this._config = config;
  }

  get reflectionCount(): number {
    return this._reflections.length;
  }

  get totalAmplitude(): number {
    return this._reflections.reduce((acc, r) => acc + r.amplitude, 0);
  }

  get geometricSeriesSum(): number {
    return this._geometricSeriesSum;
  }

  private _computeGeometricSum(): void {
    const r = this._config.reflectivity;
    if (r >= 1) {
      this._geometricSeriesSum = Infinity;
    } else {
      this._geometricSeriesSum = 1 / (1 - r);
    }
  }

  private _computeImpulseResponse(): void {
    this._impulseResponse = [];
    const N = 16;
    for (let n = 0; n < N; n++) {
      this._impulseResponse.push(Math.pow(this._config.reflectivity, n));
    }
  }

  private _computeFourier(): void {
    const N = this._impulseResponse.length;
    if (N === 0) return;
    this._fourierTransform = [];
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        real += this._impulseResponse[n] * Math.cos(angle);
        imag += this._impulseResponse[n] * Math.sin(angle);
      }
      this._fourierTransform.push(Math.sqrt(real * real + imag * imag) / N);
    }
  }

  emit(sourceId: string, amplitude: number): Reflection {
    const reflection: Reflection = {
      depth: 0,
      amplitude,
      phaseShift: 0,
      sourceId,
    };
    this._reflections.push(reflection);
    this._computeGeometricSum();
    this._computeImpulseResponse();
    this._computeFourier();
    return reflection;
  }

  step(): Reflection | null {
    const last = this._reflections[this._reflections.length - 1];
    if (!last || last.depth >= this._config.maxDepth) return null;
    const amplitude = last.amplitude * this._config.reflectivity * (1 - this._config.absorption);
    const phaseShift = last.phaseShift + Math.PI;
    const reflection: Reflection = {
      depth: last.depth + 1,
      amplitude,
      phaseShift,
      sourceId: last.sourceId,
    };
    this._reflections.push(reflection);
    if (this._reflections.length > this._config.maxDepth * 2) {
      this._reflections.shift();
    }
    return reflection;
  }

  trace(): ReflectionChain {
    const totalDepth = this._reflections[this._reflections.length - 1]?.depth || 0;
    const totalAmplitude = this.totalAmplitude;
    const infiniteLimit = this._config.reflectivity >= 1;
    const chain: ReflectionChain = { totalDepth, totalAmplitude, infiniteLimit };
    this._chains.push(chain);
    if (this._chains.length > 20) this._chains.shift();
    return chain;
  }

  converge(): number {
    if (this._config.reflectivity >= 1) return Infinity;
    return this._geometricSeriesSum;
  }

  isDivergent(): boolean {
    return this._config.reflectivity >= 1;
  }

  attenuationAt(depth: number): number {
    return Math.pow(this._config.reflectivity * (1 - this._config.absorption), depth);
  }

  dominantFrequency(): number {
    if (this._fourierTransform.length === 0) return 0;
    let peakIdx = 0;
    for (let i = 1; i < this._fourierTransform.length; i++) {
      if (this._fourierTransform[i] > this._fourierTransform[peakIdx]) {
        peakIdx = i;
      }
    }
    return peakIdx;
  }

  reset(): void {
    this._reflections = [];
    this._chains = [];
    this._geometricSeriesSum = 0;
    this._fourierTransform = [];
    this._impulseResponse = [];
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      reflections: this._reflections.length,
      totalAmplitude: this.totalAmplitude.toFixed(4),
      chains: this._chains.length,
      state: this._state,
      geometricSum: this._geometricSeriesSum === Infinity ? 'Infinity' : this._geometricSeriesSum.toFixed(4),
      divergent: this.isDivergent(),
    };
  }
}
