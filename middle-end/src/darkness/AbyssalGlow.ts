/**
 * 深渊微光模块：在最深处仍存在的微弱自发光。
 * 用于刻画系统极限深度下仍可被探测的最低限度信号。
 */

export interface AbyssalGlowPoint {
  depth: number;
  luminance: number;
  source: string;
  stable: boolean;
}

export type AbyssalProfile = {
  points: number;
  totalLuminance: number;
  deepestGlow: number;
};

export interface AbyssalGlowConfig {
  maxDepth: number;
  baseLuminance: number;
  attenuation: number;
}

export class AbyssalGlow {
  private _config: AbyssalGlowConfig;
  private _points: AbyssalGlowPoint[] = [];
  private _profile: AbyssalProfile | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: AbyssalGlowConfig) {
    this._config = config;
  }

  get pointCount(): number {
    return this._points.length;
  }

  get maxDepth(): number {
    return this._config.maxDepth;
  }

  register(source: string, depth: number): AbyssalGlowPoint {
    const attenuation = Math.exp(-depth * this._config.attenuation);
    const luminance = this._config.baseLuminance * attenuation;
    const stable = luminance > 0.001;
    const point: AbyssalGlowPoint = { depth, luminance, source, stable };
    this._points.push(point);
    if (this._points.length > 60) this._points.shift();
    return point;
  }

  computeProfile(): AbyssalProfile {
    const totalLuminance = this._points.reduce((acc, p) => acc + p.luminance, 0);
    const deepestGlow =
      this._points.length > 0 ? Math.max(...this._points.map((p) => p.depth)) : 0;
    this._profile = {
      points: this._points.length,
      totalLuminance,
      deepestGlow,
    };
    return this._profile;
  }

  isDetectable(): boolean {
    return this.computeProfile().totalLuminance > 0.01;
  }

  deepestPoint(): AbyssalGlowPoint | null {
    if (this._points.length === 0) return null;
    return this._points.reduce((best, p) => (p.depth > best.depth ? p : best));
  }

  brightestPoint(): AbyssalGlowPoint | null {
    if (this._points.length === 0) return null;
    return this._points.reduce((best, p) => (p.luminance > best.luminance ? p : best));
  }

  filterByDepth(minDepth: number, maxDepth: number): AbyssalGlowPoint[] {
    return this._points.filter((p) => p.depth >= minDepth && p.depth <= maxDepth);
  }

  tuneAttenuation(factor: number): void {
    this._config.attenuation *= factor;
    this._state.attenuationTuned = factor;
  }

  reset(): void {
    this._points = [];
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      pointCount: this._points.length,
      profile: this._profile,
      state: this._state,
    };
  }
}
