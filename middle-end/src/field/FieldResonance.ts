export interface ResonantMode {
  frequency: number;
  amplitude: number;
  phase: number;
  damping: number;
}

export type ResonanceSnapshot = {
  totalEnergy: number;
  dominantFreq: number;
  beatFrequency: number;
};

export interface ResonanceConfig {
  sampleRate: number;
  modeCount: number;
  couplingStrength: number;
}

export class FieldResonance {
  private _config: ResonanceConfig;
  private _modes: ResonantMode[] = [];
  private _snapshots: ResonanceSnapshot[] = [];
  private _energyEnvelope: number[] = [];
  private _beatSpectrum: number[] = [];
  private _meta: Record<string, unknown> = {};

  constructor(config: ResonanceConfig) {
    this._config = config;
    this._initModes();
  }

  get modeCount(): number {
    return this._modes.length;
  }

  get totalEnergy(): number {
    let sum = 0;
    for (const m of this._modes) {
      sum += m.amplitude * m.amplitude;
    }
    return sum;
  }

  get spectralFlatness(): number {
    return this._computeSpectralFlatness();
  }

  private _initModes(): void {
    this._modes = [];
    for (let i = 0; i < this._config.modeCount; i++) {
      this._modes.push({
        frequency: 100 + i * 50,
        amplitude: 1,
        phase: 0,
        damping: 0.01 + i * 0.005,
      });
    }
  }

  private _computeSpectralFlatness(): number {
    if (this._modes.length === 0) return 0;
    const amplitudes = this._modes.map((m) => m.amplitude);
    const geometricMean = Math.exp(amplitudes.reduce((a, v) => a + Math.log(v + 0.001), 0) / amplitudes.length);
    const arithmeticMean = amplitudes.reduce((a, v) => a + v, 0) / amplitudes.length;
    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
  }

  private _updateBeatSpectrum(): void {
    this._beatSpectrum = [];
    for (let i = 0; i < this._modes.length; i++) {
      for (let j = i + 1; j < this._modes.length; j++) {
        this._beatSpectrum.push(Math.abs(this._modes[i].frequency - this._modes[j].frequency));
      }
    }
  }

  excite(frequency: number, amplitude: number): void {
    let closest: ResonantMode | null = null;
    let bestDiff = Infinity;
    for (const m of this._modes) {
      const diff = Math.abs(m.frequency - frequency);
      if (diff < bestDiff) {
        bestDiff = diff;
        closest = m;
      }
    }
    if (closest) {
      closest.amplitude += amplitude / (1 + bestDiff * 0.1);
      closest.phase += Math.atan2(amplitude, closest.amplitude);
    }
    this._energyEnvelope.push(this.totalEnergy);
    if (this._energyEnvelope.length > 50) this._energyEnvelope.shift();
    this._meta.lastExcite = frequency;
  }

  damp(dt: number): void {
    for (const m of this._modes) {
      m.amplitude *= Math.exp(-m.damping * dt);
      m.phase += 2 * Math.PI * m.frequency * dt;
    }
    this._updateBeatSpectrum();
  }

  couple(): void {
    const n = this._modes.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const diff = Math.abs(this._modes[i].frequency - this._modes[j].frequency);
        const coupling = this._config.couplingStrength / (1 + diff);
        this._modes[i].amplitude += coupling * this._modes[j].amplitude * 0.01;
        this._modes[j].amplitude += coupling * this._modes[i].amplitude * 0.01;
      }
    }
  }

  snapshot(): ResonanceSnapshot {
    const dominant = this._modes.reduce((best, m) => (m.amplitude > best.amplitude ? m : best));
    let beat = 0;
    if (this._beatSpectrum.length > 0) {
      beat = this._beatSpectrum.reduce((a, b) => a + b, 0) / this._beatSpectrum.length;
    }
    const snap: ResonanceSnapshot = {
      totalEnergy: this.totalEnergy,
      dominantFreq: dominant.frequency,
      beatFrequency: beat,
    };
    this._snapshots.push(snap);
    if (this._snapshots.length > 30) this._snapshots.shift();
    return snap;
  }

  dominantMode(): ResonantMode | null {
    if (this._modes.length === 0) return null;
    return this._modes.reduce((best, m) => (m.amplitude > best.amplitude ? m : best));
  }

  isResonantAt(frequency: number, tolerance: number): boolean {
    return this._modes.some((m) => Math.abs(m.frequency - frequency) <= tolerance);
  }

  averageFrequency(): number {
    if (this._modes.length === 0) return 0;
    return this._modes.reduce((acc, m) => acc + m.frequency, 0) / this._modes.length;
  }

  reset(): void {
    this._initModes();
    this._snapshots = [];
    this._energyEnvelope = [];
    this._beatSpectrum = [];
    this._meta = {};
  }

  report(): Record<string, unknown> {
    return {
      modes: this._modes.length,
      totalEnergy: this.totalEnergy,
      snapshots: this._snapshots.length,
      meta: this._meta,
      spectralFlatness: this.spectralFlatness.toFixed(4),
    };
  }
}
