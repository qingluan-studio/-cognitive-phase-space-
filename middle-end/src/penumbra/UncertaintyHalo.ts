/**
 * 不确定光晕模块：围绕确定性核心的模糊光环。
 * 用于刻画围绕明确信息分布的不确定性范围。
 */

export interface HaloRing {
  radius: number;
  intensity: number;
  uncertainty: number;
}

export type HaloSpread = {
  rings: number;
  coreIntensity: number;
  totalUncertainty: number;
  averageRadius: number;
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
      this._rings.push({ radius, intensity, uncertainty });
    }
  }

  computeSpread(): HaloSpread {
    const totalUncertainty = this._rings.reduce((acc, r) => acc + r.uncertainty, 0);
    const averageRadius =
      this._rings.length > 0
        ? this._rings.reduce((acc, r) => acc + r.radius, 0) / this._rings.length
        : 0;
    this._spread = {
      rings: this._rings.length,
      coreIntensity: this._config.coreIntensity,
      totalUncertainty,
      averageRadius,
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

  report(): Record<string, unknown> {
    return {
      ringCount: this._rings.length,
      spread: this._spread,
      state: this._state,
    };
  }
}
