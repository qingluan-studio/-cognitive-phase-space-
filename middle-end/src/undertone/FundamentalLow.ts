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
  private _cepstrum: number[] = [];
  private _nyquist: number;

  constructor(config: FundamentalLowConfig) {
    this._config = config;
    this._nyquist = config.sampleRate / 2;
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
    this._updateCepstrum();
  }

  private _updateCepstrum(): void {
    this._cepstrum = [];
    for (let i = 0; i < this._bins.length; i++) {
      let sum = 0;
      for (let j = 0; j < this._bins.length; j++) {
        sum += this._bins[j].energy * Math.cos(2 * Math.PI * i * j / this._bins.length);
      }
      this._cepstrum.push(Math.abs(sum));
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
    this._updateCepstrum();
  }

  isApproachingZero(): boolean {
    const dom = this.dominantBin();
    return dom !== null && dom.frequency < this._config.minFrequency * 2;
  }

  reset(): void {
    for (const bin of this._bins) bin.energy = 0;
    this._cepstrum = [];
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

  computeCepstralPeak(): number {
    if (this._cepstrum.length === 0) return 0;
    const maxVal = Math.max(...this._cepstrum);
    const maxIdx = this._cepstrum.indexOf(maxVal);
    return maxIdx > 0 ? this._config.sampleRate / maxIdx : 0;
  }

  computeSpectralCentroid(): number {
    const totalEnergy = this._bins.reduce((a, b) => a + b.energy, 0);
    if (totalEnergy === 0) return 0;
    const weightedSum = this._bins.reduce((a, b) => a + b.frequency * b.energy, 0);
    return weightedSum / totalEnergy;
  }

  computeSpectralFlatness(): number {
    const energies = this._bins.map(b => b.energy).filter(e => e > 0);
    if (energies.length === 0) return 0;
    const geometricMean = Math.exp(energies.reduce((a, e) => a + Math.log(e), 0) / energies.length);
    const arithmeticMean = energies.reduce((a, e) => a + e, 0) / energies.length;
    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
  }
}
