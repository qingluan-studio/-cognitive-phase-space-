/**
 * 航海黄昏模块：太阳位于地平线下6-12度，地平线模糊需依靠星辰导航。
 * 用于刻画系统进入模糊状态、需依赖外部参照的阶段。
 */

export interface NauticalMarker {
  starId: string;
  azimuth: number;
  altitude: number;
  reliability: number;
}

export type NavigationFix = {
  markersUsed: number;
  confidence: number;
  fixQuality: 'poor' | 'fair' | 'good';
};

export interface NauticalDuskConfig {
  minReliability: number;
  maxMarkers: number;
  confidenceThreshold: number;
}

export class NauticalDusk {
  private _config: NauticalDuskConfig;
  private _markers: NauticalMarker[] = [];
  private _fix: NavigationFix | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: NauticalDuskConfig) {
    this._config = config;
  }

  get markerCount(): number {
    return this._markers.length;
  }

  get reliableCount(): number {
    return this._markers.filter((m) => m.reliability >= this._config.minReliability).length;
  }

  addMarker(marker: NauticalMarker): void {
    this._markers.push(marker);
    if (this._markers.length > this._config.maxMarkers) {
      this._markers.shift();
    }
  }

  computeFix(): NavigationFix {
    const usable = this._markers.filter((m) => m.reliability >= this._config.minReliability);
    const markersUsed = usable.length;
    const avgReliability =
      usable.length > 0
        ? usable.reduce((acc, m) => acc + m.reliability, 0) / usable.length
        : 0;
    const confidence = avgReliability * Math.min(1, markersUsed / 3);
    const fixQuality: NavigationFix['fixQuality'] =
      confidence >= this._config.confidenceThreshold
        ? 'good'
        : confidence >= this._config.confidenceThreshold * 0.6
        ? 'fair'
        : 'poor';
    this._fix = { markersUsed, confidence, fixQuality };
    return this._fix;
  }

  isNavigable(): boolean {
    return this.computeFix().fixQuality !== 'poor';
  }

  bestMarker(): NauticalMarker | null {
    if (this._markers.length === 0) return null;
    return this._markers.reduce((best, m) => (m.reliability > best.reliability ? m : best));
  }

  averageReliability(): number {
    if (this._markers.length === 0) return 0;
    return this._markers.reduce((acc, m) => acc + m.reliability, 0) / this._markers.length;
  }

  removeMarker(starId: string): boolean {
    const idx = this._markers.findIndex((m) => m.starId === starId);
    if (idx === -1) return false;
    this._markers.splice(idx, 1);
    return true;
  }

  decayReliability(factor: number): void {
    for (const m of this._markers) {
      m.reliability *= factor;
    }
    this._state.decayApplied = factor;
  }

  report(): Record<string, unknown> {
    return {
      markerCount: this._markers.length,
      reliableCount: this.reliableCount,
      fix: this._fix,
      state: this._state,
    };
  }
}
