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
  private _covarianceMatrix: number[][] = [[0, 0], [0, 0]];
  private _astronomicalVariance: number = 0.02;

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
    this._updateCovariance();
  }

  private _updateCovariance(): void {
    const usable = this._markers.filter(m => m.reliability >= this._config.minReliability);
    if (usable.length < 2) return;
    const meanAz = usable.reduce((a, m) => a + m.azimuth, 0) / usable.length;
    const meanAlt = usable.reduce((a, m) => a + m.altitude, 0) / usable.length;
    let c11 = 0, c12 = 0, c22 = 0;
    for (const m of usable) {
      const da = m.azimuth - meanAz;
      const dh = m.altitude - meanAlt;
      c11 += da * da;
      c12 += da * dh;
      c22 += dh * dh;
    }
    const n = usable.length;
    this._covarianceMatrix = [[c11 / n + this._astronomicalVariance, c12 / n], [c12 / n, c22 / n + this._astronomicalVariance]];
  }

  computeFix(): NavigationFix {
    const usable = this._markers.filter((m) => m.reliability >= this._config.minReliability);
    const markersUsed = usable.length;
    const avgReliability =
      usable.length > 0
        ? usable.reduce((acc, m) => acc + m.reliability, 0) / usable.length
        : 0;
    const det = this._covarianceMatrix[0][0] * this._covarianceMatrix[1][1] -
      this._covarianceMatrix[0][1] * this._covarianceMatrix[1][0];
    const confidence = avgReliability * Math.min(1, markersUsed / 3) * (1 / (1 + Math.sqrt(Math.abs(det))));
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
    this._updateCovariance();
    return true;
  }

  decayReliability(factor: number): void {
    for (const m of this._markers) {
      m.reliability *= factor;
    }
    this._state.decayApplied = factor;
    this._updateCovariance();
  }

  report(): Record<string, unknown> {
    return {
      markerCount: this._markers.length,
      reliableCount: this.reliableCount,
      fix: this._fix,
      state: this._state,
    };
  }

  computeDilutionOfPrecision(): number {
    const det = this._covarianceMatrix[0][0] * this._covarianceMatrix[1][1] -
      this._covarianceMatrix[0][1] * this._covarianceMatrix[1][0];
    return det > 0 ? Math.sqrt(det) : 0;
  }

  sphericalSeparation(a: NauticalMarker, b: NauticalMarker): number {
    const dAz = (b.azimuth - a.azimuth) * Math.PI / 180;
    const dAlt = (b.altitude - a.altitude) * Math.PI / 180;
    const haversine = Math.pow(Math.sin(dAlt / 2), 2) +
      Math.cos(a.altitude * Math.PI / 180) * Math.cos(b.altitude * Math.PI / 180) * Math.pow(Math.sin(dAz / 2), 2);
    return 2 * Math.asin(Math.sqrt(Math.min(1, haversine))) * 180 / Math.PI;
  }

  setAstronomicalVariance(v: number): void {
    this._astronomicalVariance = Math.max(0.001, v);
    this._updateCovariance();
  }
}
