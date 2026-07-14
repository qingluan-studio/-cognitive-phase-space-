/**
 * 半影模块：光源被部分遮挡形成的不完全阴影地带。
 * 用于刻画系统中部分遮蔽、明暗渐变的中介区域。
 */

export interface PartialShadowPoint {
  position: number;
  illumination: number;
  shadowFraction: number;
}

export type PartialShadowProfile = {
  points: number;
  averageIllumination: number;
  width: number;
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
      this._points.push({ position, illumination, shadowFraction });
    }
  }

  computeProfile(): PartialShadowProfile {
    const averageIllumination =
      this._points.length > 0
        ? this._points.reduce((acc, p) => acc + p.illumination, 0) / this._points.length
        : 0;
    this._profile = {
      points: this._points.length,
      averageIllumination,
      width: this._config.totalWidth,
    };
    return this._profile;
  }

  illuminationAt(position: number): number {
    if (this._points.length === 0) return 1;
    const idx = Math.floor(
      ((position + this._config.totalWidth / 2) / this._config.totalWidth) *
        (this._points.length - 1)
    );
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

  report(): Record<string, unknown> {
    return {
      pointCount: this._points.length,
      profile: this._profile,
      state: this._state,
    };
  }
}
