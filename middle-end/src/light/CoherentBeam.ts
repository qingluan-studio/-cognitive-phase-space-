export interface BeamSegment {
  phase: number;
  amplitude: number;
  pathLength: number;
  coherent: boolean;
}

export type InterferencePattern = {
  maxima: number;
  minima: number;
  contrast: number;
};

export interface BeamConfig {
  wavelength: number;
  coherenceLength: number;
  splitRatio: number;
}

export class CoherentBeam {
  private _config: BeamConfig;
  private _segments: BeamSegment[] = [];
  private _pattern: InterferencePattern | null = null;
  private _state: Record<string, unknown> = {};
  private _fourierAmplitudes: number[] = [];
  private _visibility: number = 0;
  private _opticalPathDifference: number = 0;

  constructor(config: BeamConfig) {
    this._config = config;
  }

  get segmentCount(): number {
    return this._segments.length;
  }

  get visibility(): number {
    return this._visibility;
  }

  get opticalPathDifference(): number {
    return this._opticalPathDifference;
  }

  private _computeFourier(): void {
    const N = this._segments.length;
    if (N === 0) return;
    this._fourierAmplitudes = [];
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        real += this._segments[n].amplitude * Math.cos(this._segments[n].phase + angle);
        imag += this._segments[n].amplitude * Math.sin(this._segments[n].phase + angle);
      }
      this._fourierAmplitudes.push(Math.sqrt(real * real + imag * imag) / N);
    }
  }

  emit(phase: number, amplitude: number): BeamSegment {
    const segment: BeamSegment = {
      phase,
      amplitude,
      pathLength: 0,
      coherent: true,
    };
    this._segments.push(segment);
    if (this._segments.length > 40) this._segments.shift();
    this._computeFourier();
    return segment;
  }

  split(): [BeamSegment, BeamSegment] | null {
    if (this._segments.length === 0) return null;
    const last = this._segments[this._segments.length - 1];
    const a: BeamSegment = {
      phase: last.phase,
      amplitude: last.amplitude * this._config.splitRatio,
      pathLength: last.pathLength,
      coherent: last.coherent,
    };
    const b: BeamSegment = {
      phase: last.phase,
      amplitude: last.amplitude * (1 - this._config.splitRatio),
      pathLength: last.pathLength + this._config.wavelength * 0.25,
      coherent: last.coherent,
    };
    this._segments.push(a, b);
    this._opticalPathDifference = Math.abs(a.pathLength - b.pathLength);
    return [a, b];
  }

  interfere(): InterferencePattern {
    if (this._segments.length < 2) {
      return { maxima: 0, minima: 0, contrast: 0 };
    }
    const intensities: number[] = [];
    for (let i = 0; i < this._segments.length; i++) {
      for (let j = i + 1; j < this._segments.length; j++) {
        const delta = this._segments[j].phase - this._segments[i].phase;
        const pathDiff = this._segments[j].pathLength - this._segments[i].pathLength;
        const coherent = Math.abs(pathDiff) < this._config.coherenceLength;
        const interference = coherent
          ? this._segments[i].amplitude * this._segments[i].amplitude +
            this._segments[j].amplitude * this._segments[j].amplitude +
            2 * this._segments[i].amplitude * this._segments[j].amplitude * Math.cos(delta)
          : this._segments[i].amplitude * this._segments[i].amplitude +
            this._segments[j].amplitude * this._segments[j].amplitude;
        intensities.push(interference);
      }
    }
    const maxI = intensities.length > 0 ? Math.max(...intensities) : 0;
    const minI = intensities.length > 0 ? Math.min(...intensities) : 0;
    this._visibility = maxI + minI > 0 ? (maxI - minI) / (maxI + minI) : 0;
    const maxima = intensities.filter((i) => i > maxI * 0.9).length;
    const minima = intensities.filter((i) => i < minI * 1.1).length;
    this._pattern = { maxima, minima, contrast: this._visibility };
    return this._pattern;
  }

  propagate(distance: number): void {
    for (const seg of this._segments) {
      seg.pathLength += distance;
      seg.phase += (2 * Math.PI * distance) / this._config.wavelength;
      if (seg.pathLength > this._config.coherenceLength) {
        seg.coherent = false;
      }
    }
  }

  totalIntensity(): number {
    return this._segments.reduce((acc, s) => acc + s.amplitude * s.amplitude, 0);
  }

  isCoherent(): boolean {
    return this._segments.every((s) => s.coherent);
  }

  computeSpectralWidth(): number {
    if (this._fourierAmplitudes.length === 0) return 0;
    const peak = Math.max(...this._fourierAmplitudes);
    const halfMax = peak / 2;
    let width = 0;
    for (const amp of this._fourierAmplitudes) {
      if (amp >= halfMax) width++;
    }
    return width;
  }

  reset(): void {
    this._segments = [];
    this._pattern = null;
    this._fourierAmplitudes = [];
    this._visibility = 0;
    this._opticalPathDifference = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      segments: this._segments.length,
      totalIntensity: this.totalIntensity(),
      pattern: this._pattern,
      state: this._state,
      visibility: this._visibility.toFixed(4),
      spectralWidth: this.computeSpectralWidth(),
    };
  }
}
