/**
 * 主动黑暗模块：有目的地隐藏和遮蔽信息的机制。
 * 用于在系统中实施选择性信息封锁与策略性遮蔽。
 */

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

  constructor(config: ActiveDarknessConfig) {
    this._config = config;
  }

  get zoneCount(): number {
    return this._zones.length;
  }

  get activeCount(): number {
    return this._zones.filter((z) => z.active).length;
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
    this._state.lastOccluded = target;
    return zone;
  }

  setOpacity(id: string, opacity: number): boolean {
    const zone = this._zones.find((z) => z.id === id);
    if (!zone) return false;
    zone.opacity = Math.max(0, Math.min(1, opacity));
    return true;
  }

  decay(dt: number): void {
    for (const zone of this._zones) {
      zone.duration -= dt;
      if (zone.duration <= 0) zone.active = false;
      zone.opacity *= 1 - this._config.decayRate * dt;
    }
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
  }

  report(): Record<string, unknown> {
    return {
      zoneCount: this._zones.length,
      active: this.activeCount,
      report: this._report,
      state: this._state,
    };
  }
}
