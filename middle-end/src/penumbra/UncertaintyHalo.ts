export interface HaloRing {
  radius: number;
  intensity: number;
  uncertainty: number;
  gaussianWeight: number;
}

export type HaloSpread = {
  rings: number;
  coreIntensity: number;
  totalUncertainty: number;
  averageRadius: number;
  kernelEntropy: number;
};

export interface UncertaintyHaloConfig {
  ringCount: number;
  coreIntensity: number;
  spreadFactor: number;
}

export class UncertaintyHalo {
  private _config: UncertaintyHaloConfig;
  private _rings: HaloRing[] = [];
  private _spread: HaloSpread | null = null;
  private _state: Record<string, unknown> = {};
  private _kernelSigma: number = 1;

  constructor(config: UncertaintyHaloConfig) {
    this._config = config;
    this._build();
  }

  get ringCount(): number {
    return this._rings.length;
  }

  get coreIntensity(): number {
    return this._config.coreIntensity;
  }

  private _build(): void {
    this._rings = [];
    for (let i = 0; i < this._config.ringCount; i++) {
      const radius = (i + 1) * this._config.spreadFactor;
      const intensity = this._config.coreIntensity * Math.exp(-radius * 0.3);
      const uncertainty = 1 - intensity / this._config.coreIntensity;
      const gaussianWeight = Math.exp(-(radius * radius) / (2 * this._kernelSigma * this._kernelSigma));
      this._rings.push({ radius, intensity, uncertainty, gaussianWeight });
    }
  }

  computeSpread(): HaloSpread {
    const totalUncertainty = this._rings.reduce((acc, r) => acc + r.uncertainty, 0);
    const averageRadius = this._rings.length > 0 ? this._rings.reduce((acc, r) => acc + r.radius, 0) / this._rings.length : 0;
    const kernelEntropy = -this._rings.reduce((s, r) => {
      const p = r.gaussianWeight;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
    this._spread = {
      rings: this._rings.length,
      coreIntensity: this._config.coreIntensity,
      totalUncertainty,
      averageRadius,
      kernelEntropy,
    };
    return this._spread;
  }

  intensityAt(radius: number): number {
    return this._config.coreIntensity * Math.exp(-radius * 0.3);
  }

  uncertaintyAt(radius: number): number {
    return 1 - this.intensityAt(radius) / this._config.coreIntensity;
  }

  isDiffuse(): boolean {
    return this.computeSpread().totalUncertainty > this._rings.length * 0.7;
  }

  innermostRing(): HaloRing | null {
    if (this._rings.length === 0) return null;
    return this._rings.reduce((best, r) => (r.radius < best.radius ? r : best));
  }

  outermostRing(): HaloRing | null {
    if (this._rings.length === 0) return null;
    return this._rings.reduce((best, r) => (r.radius > best.radius ? r : best));
  }

  setCore(intensity: number): void {
    this._config.coreIntensity = intensity;
    this._build();
    this._state.coreUpdated = intensity;
  }

  convolutionAt(x: number): number {
    let sum = 0;
    for (const r of this._rings) {
      sum += r.gaussianWeight * Math.exp(-Math.pow(x - r.radius, 2) / (2 * this._kernelSigma * this._kernelSigma));
    }
    return sum;
  }

  radialBasisFunction(center: number, x: number): number {
    return Math.exp(-Math.pow(x - center, 2) / (2 * this._kernelSigma * this._kernelSigma));
  }

  kernelBandwidth(): number {
    const variances = this._rings.map((r) => Math.pow(r.radius - this.computeSpread().averageRadius, 2));
    return Math.sqrt(variances.reduce((s, v) => s + v, 0) / (variances.length || 1));
  }

  report(): Record<string, unknown> {
    return {
      ringCount: this._rings.length,
      spread: this._spread,
      state: this._state,
      kernelSigma: this._kernelSigma,
    };
  }
}
