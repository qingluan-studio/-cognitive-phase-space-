export interface OcclusionZone {
  id: string;
  target: string;
  opacity: number;
  duration: number;
  active: boolean;
}

export type OcclusionReport = {
  zones: number;
  active: number;
  averageOpacity: number;
};

export interface ActiveDarknessConfig {
  defaultOpacity: number;
  maxZones: number;
  decayRate: number;
}

export class ActiveDarkness {
  private _config: ActiveDarknessConfig;
  private _zones: OcclusionZone[] = [];
  private _report: OcclusionReport | null = null;
  private _state: Record<string, unknown> = {};
  private _opacityField: number[][] = [];
  private _gridResolution: number = 16;
  private _laplacianMask: number[][] = [[0, 1, 0], [1, -4, 1], [0, 1, 0]];

  constructor(config: ActiveDarknessConfig) {
    this._config = config;
    this._initField();
  }

  get zoneCount(): number {
    return this._zones.length;
  }

  get activeCount(): number {
    return this._zones.filter((z) => z.active).length;
  }

  get fieldSmoothness(): number {
    return this._computeLaplacianEnergy();
  }

  private _initField(): void {
    this._opacityField = [];
    for (let i = 0; i < this._gridResolution; i++) {
      const row: number[] = [];
      for (let j = 0; j < this._gridResolution; j++) {
        row.push(0);
      }
      this._opacityField.push(row);
    }
  }

  private _mapZoneToField(zone: OcclusionZone): void {
    const cx = Math.floor(this._gridResolution / 2);
    const cy = Math.floor(this._gridResolution / 2);
    const radius = Math.floor(zone.opacity * this._gridResolution * 0.5);
    for (let i = 0; i < this._gridResolution; i++) {
      for (let j = 0; j < this._gridResolution; j++) {
        const dx = i - cx;
        const dy = j - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          this._opacityField[i][j] = Math.min(1, this._opacityField[i][j] + zone.opacity);
        }
      }
    }
  }

  private _computeLaplacianEnergy(): number {
    let energy = 0;
    const n = this._gridResolution;
    for (let i = 1; i < n - 1; i++) {
      for (let j = 1; j < n - 1; j++) {
        let conv = 0;
        for (let ki = -1; ki <= 1; ki++) {
          for (let kj = -1; kj <= 1; kj++) {
            conv += this._opacityField[i + ki][j + kj] * this._laplacianMask[ki + 1][kj + 1];
          }
        }
        energy += conv * conv;
      }
    }
    return energy / ((n - 2) * (n - 2));
  }

  private _diffuseOpacity(dt: number): void {
    const next: number[][] = [];
    const n = this._gridResolution;
    for (let i = 0; i < n; i++) {
      next.push([...this._opacityField[i]]);
    }
    const diffusionCoeff = this._config.decayRate * 0.1;
    for (let i = 1; i < n - 1; i++) {
      for (let j = 1; j < n - 1; j++) {
        let laplacian = 0;
        for (let ki = -1; ki <= 1; ki++) {
          for (let kj = -1; kj <= 1; kj++) {
            laplacian += this._opacityField[i + ki][j + kj] * this._laplacianMask[ki + 1][kj + 1];
          }
        }
        next[i][j] = Math.max(0, Math.min(1, this._opacityField[i][j] + diffusionCoeff * laplacian * dt));
      }
    }
    this._opacityField = next;
  }

  occlude(target: string, duration: number): OcclusionZone {
    const zone: OcclusionZone = {
      id: `zone-${this._zones.length}`,
      target,
      opacity: this._config.defaultOpacity,
      duration,
      active: true,
    };
    this._zones.push(zone);
    if (this._zones.length > this._config.maxZones) {
      this._zones.shift();
    }
    this._mapZoneToField(zone);
    this._state.lastOccluded = target;
    return zone;
  }

  setOpacity(id: string, opacity: number): boolean {
    const zone = this._zones.find((z) => z.id === id);
    if (!zone) return false;
    zone.opacity = Math.max(0, Math.min(1, opacity));
    this._initField();
    for (const z of this._zones) {
      if (z.active) {
        this._mapZoneToField(z);
      }
    }
    return true;
  }

  decay(dt: number): void {
    for (const zone of this._zones) {
      zone.duration -= dt;
      if (zone.duration <= 0) zone.active = false;
      zone.opacity *= 1 - this._config.decayRate * dt;
    }
    this._diffuseOpacity(dt);
    this._state.decayApplied = dt;
  }

  computeReport(): OcclusionReport {
    const active = this.activeCount;
    const averageOpacity =
      this._zones.length > 0
        ? this._zones.reduce((acc, z) => acc + z.opacity, 0) / this._zones.length
        : 0;
    this._report = { zones: this._zones.length, active, averageOpacity };
    return this._report;
  }

  isOccluded(target: string): boolean {
    return this._zones.some((z) => z.target === target && z.active);
  }

  reveal(id: string): boolean {
    const zone = this._zones.find((z) => z.id === id);
    if (!zone) return false;
    zone.active = false;
    zone.opacity = 0;
    return true;
  }

  dominantZone(): OcclusionZone | null {
    const active = this._zones.filter((z) => z.active);
    if (active.length === 0) return null;
    return active.reduce((best, z) => (z.opacity > best.opacity ? z : best));
  }

  purge(): void {
    this._zones = [];
    this._state.purgedAt = Date.now();
    this._initField();
  }

  report(): Record<string, unknown> {
    return {
      zoneCount: this._zones.length,
      active: this.activeCount,
      report: this._report,
      state: this._state,
      fieldSmoothness: this.fieldSmoothness.toFixed(4),
    };
  }
}
