export interface CrepuscularRayData {
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
  private _rays: CrepuscularRayData[] = [];
  private _nextId: number = 0;
  private _projection: RayProjection | null = null;
  private _state: Record<string, unknown> = {};
  private _radianceCache: Map<number, number> = new Map();
  private _miePhase: number = 0.76;

  constructor(config: CrepuscularRayConfig) {
    this._config = config;
  }

  get rayCount(): number {
    return this._rays.length;
  }

  get totalIntensity(): number {
    return this._rays.reduce((acc, r) => acc + r.intensity, 0);
  }

  private _computeMieScattering(theta: number): number {
    const g = this._miePhase;
    const cosT = Math.cos(theta);
    const numerator = 1 - g * g;
    const denominator = Math.pow(1 + g * g - 2 * g * cosT, 1.5);
    return (numerator / denominator) * 0.25 / Math.PI;
  }

  emit(azimuth: number, elevation: number, intensity: number, source: string): CrepuscularRayData {
    const scatteringFactor = this._computeMieScattering(elevation * Math.PI / 180);
    const effectiveIntensity = intensity * (1 + scatteringFactor);
    const ray: CrepuscularRayData = {
      id: this._nextId++,
      azimuth,
      elevation,
      intensity: effectiveIntensity,
      source,
    };
    this._rays.push(ray);
    if (this._rays.length > this._config.maxRays) {
      this._rays.shift();
    }
    this._radianceCache.set(ray.id, effectiveIntensity);
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
      this._radianceCache.set(r.id, r.intensity);
    }
    this._state.decayAppliedAt = Date.now();
  }

  filterBySource(source: string): CrepuscularRayData[] {
    return this._rays.filter((r) => r.source === source);
  }

  dominantRay(): CrepuscularRayData | null {
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
    this._radianceCache.clear();
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

  computeOpticalDepth(): number {
    const intensities = this._rays.map(r => r.intensity);
    if (intensities.length === 0) return 0;
    const sum = intensities.reduce((a, b) => a + b, 0);
    const mean = sum / intensities.length;
    return -Math.log(mean / (sum + 0.001));
  }

  angularVariance(): number {
    if (this._rays.length === 0) return 0;
    const meanAz = this._rays.reduce((a, r) => a + r.azimuth, 0) / this._rays.length;
    return this._rays.reduce((a, r) => a + Math.pow(r.azimuth - meanAz, 2), 0) / this._rays.length;
  }

  setMiePhase(g: number): void {
    this._miePhase = Math.max(-0.99, Math.min(0.99, g));
  }
}
