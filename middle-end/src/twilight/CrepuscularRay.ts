/**
 * 曙暮辉模块：从云隙中射出的光柱，形成可见的光线路径。
 * 用于刻画系统中局部穿透遮蔽的显式信号通路。
 */

export interface CrepuscularRay {
  id: number;
  azimuth: number;
  elevation: number;
  intensity: number;
  source: string;
}

export type RayProjection = {
  rays: number;
  totalIntensity: number;
  dominantAzimuth: number;
};

export interface CrepuscularRayConfig {
  maxRays: number;
  intensityDecay: number;
  angularSpread: number;
}

export class CrepuscularRay {
  private _config: CrepuscularRayConfig;
  private _rays: CrepuscularRay[] = [];
  private _nextId: number = 0;
  private _projection: RayProjection | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: CrepuscularRayConfig) {
    this._config = config;
  }

  get rayCount(): number {
    return this._rays.length;
  }

  get totalIntensity(): number {
    return this._rays.reduce((acc, r) => acc + r.intensity, 0);
  }

  emit(azimuth: number, elevation: number, intensity: number, source: string): CrepuscularRay {
    const ray: CrepuscularRay = {
      id: this._nextId++,
      azimuth,
      elevation,
      intensity,
      source,
    };
    this._rays.push(ray);
    if (this._rays.length > this._config.maxRays) {
      this._rays.shift();
    }
    return ray;
  }

  computeProjection(): RayProjection {
    const totalIntensity = this.totalIntensity;
    const dominantAzimuth =
      this._rays.length > 0
        ? this._rays.reduce((acc, r) => acc + r.azimuth * r.intensity, 0) / totalIntensity
        : 0;
    this._projection = {
      rays: this._rays.length,
      totalIntensity,
      dominantAzimuth,
    };
    return this._projection;
  }

  decay(): void {
    for (const r of this._rays) {
      r.intensity *= 1 - this._config.intensityDecay;
    }
    this._state.decayAppliedAt = Date.now();
  }

  filterBySource(source: string): CrepuscularRay[] {
    return this._rays.filter((r) => r.source === source);
  }

  dominantRay(): CrepuscularRay | null {
    if (this._rays.length === 0) return null;
    return this._rays.reduce((best, r) => (r.intensity > best.intensity ? r : best));
  }

  averageElevation(): number {
    if (this._rays.length === 0) return 0;
    return this._rays.reduce((acc, r) => acc + r.elevation, 0) / this._rays.length;
  }

  isRadiating(): boolean {
    return this.totalIntensity > 0.5;
  }

  clear(): void {
    this._rays = [];
    this._state.clearedAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      rayCount: this._rays.length,
      totalIntensity: this.totalIntensity,
      projection: this._projection,
      state: this._state,
    };
  }
}
