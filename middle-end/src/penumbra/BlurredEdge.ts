export interface EdgeSample {
  distance: number;
  sharpness: number;
  gradient: number;
  sobelMagnitude: number;
}

export type EdgeProfile = {
  samples: number;
  edgeWidth: number;
  averageSharpness: number;
  gradientVariance: number;
};

export interface BlurredEdgeConfig {
  sampleCount: number;
  edgeWidth: number;
  baseSharpness: number;
}

export class BlurredEdge {
  private _config: BlurredEdgeConfig;
  private _samples: EdgeSample[] = [];
  private _profile: EdgeProfile | null = null;
  private _state: Record<string, unknown> = {};
  private _convolutionKernel: number[] = [];

  constructor(config: BlurredEdgeConfig) {
    this._config = config;
    this._sample();
    this._buildKernel();
  }

  get sampleCount(): number {
    return this._samples.length;
  }

  get edgeWidth(): number {
    return this._config.edgeWidth;
  }

  private _buildKernel(): void {
    const sigma = this._config.edgeWidth / 4;
    const size = Math.min(this._samples.length, 7);
    this._convolutionKernel = Array.from({ length: size }, (_, i) => {
      const x = i - Math.floor(size / 2);
      return Math.exp(-(x * x) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
    });
    const sum = this._convolutionKernel.reduce((s, v) => s + v, 0);
    this._convolutionKernel = this._convolutionKernel.map((v) => v / sum);
  }

  private _sample(): void {
    this._samples = [];
    const n = this._config.sampleCount;
    for (let i = 0; i < n; i++) {
      const distance = (i / (n - 1)) * this._config.edgeWidth - this._config.edgeWidth / 2;
      const normalized = distance / (this._config.edgeWidth / 2);
      const sharpness = this._config.baseSharpness * Math.exp(-normalized * normalized);
      const gradient = -2 * normalized * sharpness;
      const sobelMagnitude = Math.abs(gradient) * Math.sqrt(2);
      this._samples.push({ distance, sharpness, gradient, sobelMagnitude });
    }
  }

  computeProfile(): EdgeProfile {
    const averageSharpness = this._samples.length > 0 ? this._samples.reduce((acc, s) => acc + s.sharpness, 0) / this._samples.length : 0;
    const meanGradient = this._samples.reduce((acc, s) => acc + s.gradient, 0) / (this._samples.length || 1);
    const gradientVariance = this._samples.reduce((acc, s) => acc + Math.pow(s.gradient - meanGradient, 2), 0) / (this._samples.length || 1);
    this._profile = { samples: this._samples.length, edgeWidth: this._config.edgeWidth, averageSharpness, gradientVariance };
    return this._profile;
  }

  sharpnessAt(distance: number): number {
    if (this._samples.length === 0) return 0;
    const idx = Math.floor(((distance + this._config.edgeWidth / 2) / this._config.edgeWidth) * (this._samples.length - 1));
    const clamped = Math.max(0, Math.min(this._samples.length - 1, idx));
    return this._samples[clamped].sharpness;
  }

  peakSharpness(): number {
    if (this._samples.length === 0) return 0;
    return Math.max(...this._samples.map((s) => s.sharpness));
  }

  steepestGradient(): EdgeSample | null {
    if (this._samples.length === 0) return null;
    return this._samples.reduce((best, s) => Math.abs(s.gradient) > Math.abs(best.gradient) ? s : best);
  }

  isBlurred(): boolean {
    return this.computeProfile().averageSharpness < this._config.baseSharpness * 0.5;
  }

  convolvedSharpnessAt(index: number): number {
    const half = Math.floor(this._convolutionKernel.length / 2);
    let sum = 0;
    for (let k = 0; k < this._convolutionKernel.length; k++) {
      const srcIdx = index + k - half;
      const clamped = Math.max(0, Math.min(this._samples.length - 1, srcIdx));
      sum += this._samples[clamped].sharpness * this._convolutionKernel[k];
    }
    return sum;
  }

  gradientHistogram(): Record<number, number> {
    const bins: Record<number, number> = {};
    for (const s of this._samples) {
      const bin = Math.floor(s.gradient * 10) / 10;
      bins[bin] = (bins[bin] ?? 0) + 1;
    }
    return bins;
  }

  setEdgeWidth(width: number): void {
    this._config.edgeWidth = width;
    this._sample();
    this._buildKernel();
    this._state.widthUpdated = width;
  }

  setSharpness(sharpness: number): void {
    this._config.baseSharpness = sharpness;
    this._sample();
  }

  report(): Record<string, unknown> {
    return {
      sampleCount: this._samples.length,
      profile: this._profile,
      state: this._state,
      kernelSize: this._convolutionKernel.length,
    };
  }
}
