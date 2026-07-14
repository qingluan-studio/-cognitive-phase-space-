/**
 * 频谱包络模块：描述频谱中各频率分量的整体能量分布形状。
 * 用于塑造音色特征并控制频谱的宏观轮廓。
 */

export interface EnvelopePoint {
  frequency: number;
  level: number;
}

export type EnvelopeShape = {
  points: EnvelopePoint[];
  peak: EnvelopePoint | null;
  centroid: number;
};

export interface EnvelopeConfig {
  sampleCount: number;
  maxFrequency: number;
  smoothing: number;
}

export class SpectralEnvelope {
  private _config: EnvelopeConfig;
  private _points: EnvelopePoint[] = [];
  private _shape: EnvelopeShape | null = null;
  private _flags: Record<string, unknown> = {};

  constructor(config: EnvelopeConfig) {
    this._config = config;
    this._buildFlatEnvelope();
  }

  get pointCount(): number {
    return this._points.length;
  }

  get peak(): EnvelopePoint | null {
    if (this._points.length === 0) return null;
    return this._points.reduce((best, p) => (p.level > best.level ? p : best));
  }

  private _buildFlatEnvelope(): void {
    this._points = [];
    for (let i = 0; i < this._config.sampleCount; i++) {
      const freq = (i / this._config.sampleCount) * this._config.maxFrequency;
      this._points.push({ frequency: freq, level: 0.5 });
    }
  }

  applyFormant(center: number, width: number, gain: number): void {
    for (const p of this._points) {
      const distance = Math.abs(p.frequency - center);
      const contribution = gain * Math.exp(-(distance * distance) / (2 * width * width));
      p.level = Math.min(1, p.level + contribution);
    }
    this._flags.lastFormant = { center, width, gain };
  }

  smooth(): void {
    const factor = this._config.smoothing;
    for (let i = 1; i < this._points.length - 1; i++) {
      const avg =
        (this._points[i - 1].level + this._points[i].level + this._points[i + 1].level) / 3;
      this._points[i].level = this._points[i].level * (1 - factor) + avg * factor;
    }
  }

  computeShape(): EnvelopeShape {
    const peak = this.peak;
    let weighted = 0;
    let total = 0;
    for (const p of this._points) {
      weighted += p.frequency * p.level;
      total += p.level;
    }
    const centroid = total > 0 ? weighted / total : 0;
    this._shape = { points: [...this._points], peak, centroid };
    return this._shape;
  }

  spectralCentroid(): number {
    return this.computeShape().centroid;
  }

  levelAt(frequency: number): number {
    if (this._points.length === 0) return 0;
    const idx = Math.floor(
      (frequency / this._config.maxFrequency) * (this._points.length - 1)
    );
    const clamped = Math.max(0, Math.min(this._points.length - 1, idx));
    return this._points[clamped].level;
  }

  flatten(): void {
    this._buildFlatEnvelope();
    this._flags.flattenedAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      points: this._points.length,
      peak: this.peak,
      centroid: this.spectralCentroid(),
      flags: this._flags,
    };
  }
}
