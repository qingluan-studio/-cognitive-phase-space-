/**
 * 极低基频模块：逼近零频率的振动，代表系统最底层的缓慢波动。
 * 用于建模超长时间尺度的基底变化。
 */

export interface LowFrequencyBin {
  frequency: number;
  energy: number;
  period: number;
}

export type LowFrequencySpectrum = {
  bins: LowFrequencyBin[];
  averagePeriod: number;
  totalEnergy: number;
};

export interface FundamentalLowConfig {
  minFrequency: number;
  binCount: number;
  sampleRate: number;
}

export class FundamentalLow {
  private _config: FundamentalLowConfig;
  private _bins: LowFrequencyBin[] = [];
  private _spectrum: LowFrequencySpectrum | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: FundamentalLowConfig) {
    this._config = config;
    this._buildBins();
  }

  get binCount(): number {
    return this._bins.length;
  }

  get minFrequency(): number {
    return this._config.minFrequency;
  }

  private _buildBins(): void {
    this._bins = [];
    for (let i = 0; i < this._config.binCount; i++) {
      const frequency = this._config.minFrequency * Math.pow(2, i / 12);
      this._bins.push({
        frequency,
        energy: 0,
        period: 1 / frequency,
      });
    }
  }

  injectEnergy(frequency: number, energy: number): void {
    let nearest = this._bins[0];
    let bestDist = Infinity;
    for (const bin of this._bins) {
      const dist = Math.abs(bin.frequency - frequency);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = bin;
      }
    }
    if (nearest) {
      nearest.energy += energy;
      this._state.lastInjection = { frequency, energy };
    }
  }

  computeSpectrum(): LowFrequencySpectrum {
    const totalEnergy = this._bins.reduce((acc, b) => acc + b.energy, 0);
    const avgPeriod =
      this._bins.length > 0
        ? this._bins.reduce((acc, b) => acc + b.period, 0) / this._bins.length
        : 0;
    this._spectrum = {
      bins: [...this._bins],
      averagePeriod: avgPeriod,
      totalEnergy,
    };
    return this._spectrum;
  }

  dominantBin(): LowFrequencyBin | null {
    if (this._bins.length === 0) return null;
    return this._bins.reduce((best, b) => (b.energy > best.energy ? b : best));
  }

  longestPeriod(): number {
    if (this._bins.length === 0) return 0;
    return Math.max(...this._bins.map((b) => b.period));
  }

  decay(factor: number): void {
    for (const bin of this._bins) {
      bin.energy *= factor;
    }
  }

  isApproachingZero(): boolean {
    const dom = this.dominantBin();
    return dom !== null && dom.frequency < this._config.minFrequency * 2;
  }

  reset(): void {
    for (const bin of this._bins) bin.energy = 0;
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      binCount: this._bins.length,
      minFrequency: this._config.minFrequency,
      spectrum: this._spectrum,
      state: this._state,
    };
  }
}
