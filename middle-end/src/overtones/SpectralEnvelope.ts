export interface EnvelopePoint {
  frequency: number;
  level: number;
}

export type EnvelopeShape = {
  points: EnvelopePoint[];
  peak: EnvelopePoint | null;
  centroid: number;
  spread: number;
  skewness: number;
  kurtosis: number;
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
  private _gaussianMixture: { mean: number; sigma: number; weight: number }[] = [];

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
    this._fitGaussianMixture();
  }

  private _fitGaussianMixture(): void {
    const peaks: { mean: number; sigma: number; weight: number }[] = [];
    for (let i = 1; i < this._points.length - 1; i++) {
      if (this._points[i].level > this._points[i - 1].level && this._points[i].level > this._points[i + 1].level) {
        const mean = this._points[i].frequency;
        let sigma = 0;
        let weight = this._points[i].level;
        for (const p of this._points) {
          sigma += p.level * Math.pow(p.frequency - mean, 2);
        }
        sigma = Math.sqrt(sigma / this._points.reduce((s, p) => s + p.level, 0));
        peaks.push({ mean, sigma: sigma || 100, weight });
      }
    }
    this._gaussianMixture = peaks.slice(0, 3);
  }

  smooth(): void {
    const factor = this._config.smoothing;
    for (let i = 1; i < this._points.length - 1; i++) {
      const avg = (this._points[i - 1].level + this._points[i].level + this._points[i + 1].level) / 3;
      this._points[i].level = this._points[i].level * (1 - factor) + avg * factor;
    }
  }

  computeShape(): EnvelopeShape {
    const peak = this.peak;
    let weighted = 0;
    let total = 0;
    let weightedSq = 0;
    let weightedCube = 0;
    let weightedFourth = 0;
    for (const p of this._points) {
      weighted += p.frequency * p.level;
      total += p.level;
      weightedSq += Math.pow(p.frequency, 2) * p.level;
      weightedCube += Math.pow(p.frequency, 3) * p.level;
      weightedFourth += Math.pow(p.frequency, 4) * p.level;
    }
    const centroid = total > 0 ? weighted / total : 0;
    const variance = total > 0 ? weightedSq / total - centroid * centroid : 0;
    const spread = Math.sqrt(Math.max(0, variance));
    const skewness = spread > 0 && total > 0 ? (weightedCube / total - 3 * centroid * spread * spread - Math.pow(centroid, 3)) / Math.pow(spread, 3) : 0;
    const kurtosis = spread > 0 && total > 0 ? (weightedFourth / total - 4 * centroid * weightedCube / total + 6 * centroid * centroid * weightedSq / total - 3 * Math.pow(centroid, 4)) / Math.pow(spread, 4) : 0;
    this._shape = { points: [...this._points], peak, centroid, spread, skewness, kurtosis };
    return this._shape;
  }

  spectralCentroid(): number {
    return this.computeShape().centroid;
  }

  spectralSpread(): number {
    return this.computeShape().spread;
  }

  spectralSkewness(): number {
    return this.computeShape().skewness;
  }

  spectralKurtosis(): number {
    return this.computeShape().kurtosis;
  }

  levelAt(frequency: number): number {
    if (this._points.length === 0) return 0;
    const idx = Math.floor((frequency / this._config.maxFrequency) * (this._points.length - 1));
    const clamped = Math.max(0, Math.min(this._points.length - 1, idx));
    return this._points[clamped].level;
  }

  flatten(): void {
    this._buildFlatEnvelope();
    this._flags.flattenedAt = Date.now();
    this._gaussianMixture = [];
  }

  gaussianMixtureLogLikelihood(): number {
    let ll = 0;
    for (const p of this._points) {
      let prob = 0;
      for (const g of this._gaussianMixture) {
        prob += g.weight * Math.exp(-Math.pow(p.frequency - g.mean, 2) / (2 * g.sigma * g.sigma)) / (g.sigma * Math.sqrt(2 * Math.PI));
      }
      ll += Math.log(prob + 1e-10);
    }
    return ll;
  }

  report(): Record<string, unknown> {
    return {
      points: this._points.length,
      peak: this.peak,
      centroid: this.spectralCentroid(),
      flags: this._flags,
      gaussianMixture: this._gaussianMixture,
    };
  }
}
