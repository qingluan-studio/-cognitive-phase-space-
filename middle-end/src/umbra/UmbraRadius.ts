/**
 * 本影半径模块：完全阴影区域的覆盖范围。
 * 用于量化系统中完全遮蔽作用的影响半径。
 */

export interface UmbraGeometry {
  sourceRadius: number;
  occluderRadius: number;
  distance: number;
  umbraLength: number;
}

export type UmbraCoverage = {
  radius: number;
  area: number;
  coneAngle: number;
};

export interface UmbraRadiusConfig {
  lightSourceRadius: number;
  defaultDistance: number;
}

export class UmbraRadius {
  private _config: UmbraRadiusConfig;
  private _geometries: UmbraGeometry[] = [];
  private _coverage: UmbraCoverage | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: UmbraRadiusConfig) {
    this._config = config;
  }

  get geometryCount(): number {
    return this._geometries.length;
  }

  compute(occluderRadius: number, distance: number): UmbraGeometry {
    const sourceRadius = this._config.lightSourceRadius;
    const umbraLength =
      sourceRadius > occluderRadius
        ? (occluderRadius * distance) / (sourceRadius - occluderRadius)
        : Infinity;
    const geometry: UmbraGeometry = {
      sourceRadius,
      occluderRadius,
      distance,
      umbraLength,
    };
    this._geometries.push(geometry);
    if (this._geometries.length > 30) this._geometries.shift();
    return geometry;
  }

  computeCoverage(distance: number): UmbraCoverage {
    if (this._geometries.length === 0) {
      this._coverage = { radius: 0, area: 0, coneAngle: 0 };
      return this._coverage;
    }
    const g = this._geometries[this._geometries.length - 1];
    const radius = g.occluderRadius * (1 - distance / g.umbraLength);
    const area = Math.PI * radius * radius;
    const coneAngle = 2 * Math.atan2(g.occluderRadius, g.distance);
    this._coverage = { radius: Math.max(0, radius), area, coneAngle };
    return this._coverage;
  }

  currentRadius(): number {
    return this._coverage?.radius ?? 0;
  }

  isFiniteUmbra(): boolean {
    if (this._geometries.length === 0) return false;
    return Number.isFinite(this._geometries[this._geometries.length - 1].umbraLength);
  }

  largestGeometry(): UmbraGeometry | null {
    if (this._geometries.length === 0) return null;
    return this._geometries.reduce((best, g) => (g.umbraLength > best.umbraLength ? g : best));
  }

  averageUmbraLength(): number {
    if (this._geometries.length === 0) return 0;
    return this._geometries.reduce((acc, g) => acc + g.umbraLength, 0) / this._geometries.length;
  }

  setLightSource(radius: number): void {
    this._config.lightSourceRadius = radius;
    this._state.sourceUpdated = radius;
  }

  reset(): void {
    this._geometries = [];
    this._coverage = null;
    this._state.resetAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      geometryCount: this._geometries.length,
      coverage: this._coverage,
      state: this._state,
    };
  }
}
