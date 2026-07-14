/**
 * 谐波系列模块：以基频为基础，叠加整数倍频率的谐波成分。
 * 用于构造复杂周期信号并分析其频谱结构。
 */

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

  constructor(config: HarmonicConfig) {
    this._config = config;
    this._buildSeries();
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

  sample(time: number): number {
    let value = 0;
    for (const c of this._components) {
      value += c.amplitude * Math.sin(2 * Math.PI * c.frequency * time + c.phase);
    }
    return value;
  }

  computeSpectrum(): HarmonicSpectrum {
    this._spectrum = {
      fundamental: this._config.fundamental,
      components: [...this._components],
      totalEnergy: this.totalEnergy,
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

  report(): Record<string, unknown> {
    return {
      fundamental: this._config.fundamental,
      components: this._components.length,
      totalEnergy: this.totalEnergy,
      meta: this._meta,
    };
  }
}
