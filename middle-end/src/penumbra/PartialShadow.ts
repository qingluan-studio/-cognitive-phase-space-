export interface PartialShadowPoint {
  position: number;
  illumination: number;
  shadowFraction: number;
  angularOcclusion: number;
}

export type PartialShadowProfile = {
  points: number;
  averageIllumination: number;
  width: number;
  penumbraRatio: number;
  umbraFraction: number;
};

export interface PartialShadowConfig {
  resolution: number;
  totalWidth: number;
  sourceAngle: number;
}

export class PartialShadow {
  private _config: PartialShadowConfig;
  private _points: PartialShadowPoint[] = [];
  private _profile: PartialShadowProfile | null = null;
  private _state: Record<string, unknown> = {};
  private _angularIntegration: number = 0;

  constructor(config: PartialShadowConfig) {
    this._config = config;
    this._build();
  }

  get pointCount(): number {
    return this._points.length;
  }

  get totalWidth(): number {
    return this._config.totalWidth;
  }

  private _build(): void {
    this._points = [];
    const n = this._config.resolution;
    for (let i = 0; i < n; i++) {
      const position = (i / (n - 1)) * this._config.totalWidth - this._config.totalWidth / 2;
      const normalized = position / (this._config.totalWidth / 2);
      const shadowFraction = Math.max(0, Math.min(1, (normalized + 1) / 2));
      const illumination = 1 - shadowFraction;
      const angularOcclusion = this._computeAngularOcclusion(position);
      this._points.push({ position, illumination, shadowFraction, angularOcclusion });
    }
    this._angularIntegration = this._points.reduce((s, p) => s + p.angularOcclusion, 0) / (n || 1);
  }

  private _computeAngularOcclusion(position: number): number {
    const sourceRadius = this._config.sourceAngle / 2;
    const center = 0;
    const dist = Math.abs(position - center);
    if (dist > sourceRadius) return 0;
    return Math.cos((dist / sourceRadius) * (Math.PI / 2));
  }

  computeProfile(): PartialShadowProfile {
    const averageIllumination = this._points.length > 0 ? this._points.reduce((acc, p) => acc + p.illumination, 0) / this._points.length : 0;
    const umbraCount = this._points.filter((p) => p.shadowFraction > 0.9).length;
    const umbraFraction = this._points.length > 0 ? umbraCount / this._points.length : 0;
    const penumbraCount = this._points.filter((p) => p.shadowFraction > 0.1 && p.shadowFraction < 0.9).length;
    const penumbraRatio = this._points.length > 0 ? penumbraCount / this._points.length : 0;
    this._profile = { points: this._points.length, averageIllumination, width: this._config.totalWidth, penumbraRatio, umbraFraction };
    return this._profile;
  }

  illuminationAt(position: number): number {
    if (this._points.length === 0) return 1;
    const idx = Math.floor(((position + this._config.totalWidth / 2) / this._config.totalWidth) * (this._points.length - 1));
    const clamped = Math.max(0, Math.min(this._points.length - 1, idx));
    return this._points[clamped].illumination;
  }

  shadowCenter(): number {
    if (this._points.length === 0) return 0;
    return this._points[Math.floor(this._points.length / 2)].position;
  }

  darkestPoint(): PartialShadowPoint | null {
    if (this._points.length === 0) return null;
    return this._points.reduce((best, p) => (p.illumination < best.illumination ? p : best));
  }

  brightEdge(): PartialShadowPoint | null {
    if (this._points.length === 0) return null;
    return this._points.reduce((best, p) => (p.illumination > best.illumination ? p : best));
  }

  resize(width: number): void {
    this._config.totalWidth = width;
    this._build();
    this._state.resizedAt = Date.now();
  }

  monteCarloOcclusion(samples: number): number {
    let occluded = 0;
    for (let i = 0; i < samples; i++) {
      const pos = (Math.random() - 0.5) * this._config.totalWidth;
      const illum = this.illuminationAt(pos);
      if (illum < 0.5) occluded++;
    }
    return occluded / (samples || 1);
  }

  penumbraGeometry(): { umbraWidth: number; penumbraWidth: number; antumbraWidth: number } {
    const half = this._config.totalWidth / 2;
    return {
      umbraWidth: half * 0.2,
      penumbraWidth: half * 0.6,
      antumbraWidth: half * 0.2,
    };
  }

  report(): Record<string, unknown> {
    return {
      pointCount: this._points.length,
      profile: this._profile,
      state: this._state,
      angularIntegration: this._angularIntegration,
    };
  }
}
