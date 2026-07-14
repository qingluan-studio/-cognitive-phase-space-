/**
 * 模糊边缘模块：清晰与模糊之间的过渡区域。
 * 用于刻画系统中边界从清晰逐渐过渡到模糊的过程。
 */

export interface EdgeSample {
  distance: number;
  sharpness: number;
  gradient: number;
}

export type EdgeProfile = {
  samples: number;
  edgeWidth: number;
  averageSharpness: number;
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

  constructor(config: BlurredEdgeConfig) {
    this._config = config;
    this._sample();
  }

  get sampleCount(): number {
    return this._samples.length;
  }

  get edgeWidth(): number {
    return this._config.edgeWidth;
  }

  private _sample(): void {
    this._samples = [];
    const n = this._config.sampleCount;
    for (let i = 0; i < n; i++) {
      const distance = (i / (n - 1)) * this._config.edgeWidth - this._config.edgeWidth / 2;
      const normalized = distance / (this._config.edgeWidth / 2);
      const sharpness = this._config.baseSharpness * Math.exp(-normalized * normalized);
      const gradient = -2 * normalized * sharpness;
      this._samples.push({ distance, sharpness, gradient });
    }
  }

  computeProfile(): EdgeProfile {
    const averageSharpness =
      this._samples.length > 0
        ? this._samples.reduce((acc, s) => acc + s.sharpness, 0) / this._samples.length
        : 0;
    this._profile = {
      samples: this._samples.length,
      edgeWidth: this._config.edgeWidth,
      averageSharpness,
    };
    return this._profile;
  }

  sharpnessAt(distance: number): number {
    if (this._samples.length === 0) return 0;
    const idx = Math.floor(
      ((distance + this._config.edgeWidth / 2) / this._config.edgeWidth) *
        (this._samples.length - 1)
    );
    const clamped = Math.max(0, Math.min(this._samples.length - 1, idx));
    return this._samples[clamped].sharpness;
  }

  peakSharpness(): number {
    if (this._samples.length === 0) return 0;
    return Math.max(...this._samples.map((s) => s.sharpness));
  }

  steepestGradient(): EdgeSample | null {
    if (this._samples.length === 0) return null;
    return this._samples.reduce((best, s) =>
      Math.abs(s.gradient) > Math.abs(best.gradient) ? s : best
    );
  }

  isBlurred(): boolean {
    return this.computeProfile().averageSharpness < this._config.baseSharpness * 0.5;
  }

  setEdgeWidth(width: number): void {
    this._config.edgeWidth = width;
    this._sample();
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
    };
  }
}
