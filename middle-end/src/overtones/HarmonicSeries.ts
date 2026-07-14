export interface HarmonicComponent {
  order: number;
  frequency: number;
  amplitude: number;
  phase: number;
}

export type HarmonicSpectrum = {
  fundamental: number;
  components: HarmonicComponent[];
  totalEnergy: number;
  thd: number;
  inharmonicity: number;
  spectralSlope: number;
};

export interface HarmonicConfig {
  fundamental: number;
  harmonicCount: number;
  decayRate: number;
}

export class HarmonicSeries {
  private _config: HarmonicConfig;
  private _components: HarmonicComponent[] = [];
  private _spectrum: HarmonicSpectrum | null = null;
  private _meta: Record<string, unknown> = {};
  private _window: number[] = [];

  constructor(config: HarmonicConfig) {
    this._config = config;
    this._buildSeries();
    this._buildHannWindow();
  }

  get fundamental(): number {
    return this._config.fundamental;
  }

  get componentCount(): number {
    return this._components.length;
  }

  get totalEnergy(): number {
    return this._components.reduce((acc, c) => acc + c.amplitude * c.amplitude, 0);
  }

  private _buildSeries(): void {
    this._components = [];
    for (let n = 1; n <= this._config.harmonicCount; n++) {
      this._components.push({
        order: n,
        frequency: this._config.fundamental * n,
        amplitude: 1 / Math.pow(n, this._config.decayRate),
        phase: 0,
      });
    }
  }

  private _buildHannWindow(): void {
    const N = this._config.harmonicCount;
    this._window = Array.from({ length: N }, (_, i) => 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1))));
  }

  sample(time: number): number {
    let value = 0;
    for (let i = 0; i < this._components.length; i++) {
      const c = this._components[i];
      const w = this._window[i] || 1;
      value += c.amplitude * w * Math.sin(2 * Math.PI * c.frequency * time + c.phase);
    }
    return value;
  }

  computeSpectrum(): HarmonicSpectrum {
    const totalEnergy = this.totalEnergy;
    const fundamentalAmp = this._components.find((c) => c.order === 1)?.amplitude ?? 0;
    let distortionEnergy = 0;
    for (const c of this._components) {
      if (c.order !== 1) distortionEnergy += c.amplitude * c.amplitude;
    }
    const thd = fundamentalAmp > 0 ? Math.sqrt(distortionEnergy) / fundamentalAmp : 0;
    let inharmonicity = 0;
    for (const c of this._components) {
      const ideal = this._config.fundamental * c.order;
      inharmonicity += Math.pow(c.frequency - ideal, 2) * c.amplitude;
    }
    inharmonicity = inharmonicity / (totalEnergy || 1);
    let sumXY = 0;
    let sumX = 0;
    let sumY = 0;
    let sumX2 = 0;
    for (const c of this._components) {
      const x = Math.log2(c.order);
      const y = Math.log2(c.amplitude + 1e-10);
      sumXY += x * y;
      sumX += x;
      sumY += y;
      sumX2 += x * x;
    }
    const n = this._components.length;
    const spectralSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    this._spectrum = {
      fundamental: this._config.fundamental,
      components: [...this._components],
      totalEnergy,
      thd,
      inharmonicity,
      spectralSlope,
    };
    return this._spectrum;
  }

  setAmplitude(order: number, amplitude: number): void {
    const c = this._components.find((x) => x.order === order);
    if (c) c.amplitude = amplitude;
    this._meta.modifiedOrder = order;
  }

  setPhase(order: number, phase: number): void {
    const c = this._components.find((x) => x.order === order);
    if (c) c.phase = phase;
  }

  dominantHarmonic(): HarmonicComponent | null {
    if (this._components.length === 0) return null;
    return this._components.reduce((best, c) => (c.amplitude > best.amplitude ? c : best));
  }

  adjustDecay(rate: number): void {
    this._config.decayRate = rate;
    this._buildSeries();
  }

  energyRatio(order: number): number {
    const c = this._components.find((x) => x.order === order);
    if (!c) return 0;
    const total = this.totalEnergy;
    return total > 0 ? (c.amplitude * c.amplitude) / total : 0;
  }

  crestFactor(): number {
    if (this._components.length === 0) return 0;
    const peak = Math.max(...this._components.map((c) => c.amplitude));
    const rms = Math.sqrt(this.totalEnergy / this._components.length);
    return rms > 0 ? peak / rms : 0;
  }

  report(): Record<string, unknown> {
    return {
      fundamental: this._config.fundamental,
      components: this._components.length,
      totalEnergy: this.totalEnergy,
      meta: this._meta,
      crestFactor: this.crestFactor(),
    };
  }
}
