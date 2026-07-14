export interface SurfacePoint {
  x: number;
  y: number;
  z: number;
  normal: [number, number, number];
  insideOut: boolean;
}

export type InversionResult = {
  centroid: [number, number, number];
  volume: number;
  surfaceArea: number;
};

export interface TurnInsideOutConfig {
  sphereRadius: number;
  centerX: number;
  centerY: number;
  centerZ: number;
  stepResolution: number;
}

export class TurnInsideOut {
  private _config: TurnInsideOutConfig;
  private _points: SurfacePoint[] = [];
  private _result: InversionResult | null = null;
  private _state: Record<string, unknown> = {};
  private _gaussianCurvature: number = 0;
  private _meanCurvature: number = 0;
  private _eulerCharacteristic: number = 0;

  constructor(config: TurnInsideOutConfig) {
    this._config = config;
  }

  get pointCount(): number {
    return this._points.length;
  }

  get gaussianCurvature(): number {
    return this._gaussianCurvature;
  }

  get eulerCharacteristic(): number {
    return this._eulerCharacteristic;
  }

  private _computeCentroid(): [number, number, number] {
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    for (const p of this._points) {
      sumX += p.x;
      sumY += p.y;
      sumZ += p.z;
    }
    const n = this._points.length;
    return [sumX / n, sumY / n, sumZ / n];
  }

  private _computeCurvatures(): void {
    if (this._points.length < 3) return;
    const centroid = this._computeCentroid();
    let sumK = 0;
    let sumH = 0;
    for (const p of this._points) {
      const dx = p.x - centroid[0];
      const dy = p.y - centroid[1];
      const dz = p.z - centroid[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const r = this._config.sphereRadius;
      const k = 1 / (r * r);
      const h = 1 / r;
      sumK += k;
      sumH += h;
    }
    this._gaussianCurvature = sumK / this._points.length;
    this._meanCurvature = sumH / this._points.length;
    this._eulerCharacteristic = 2;
  }

  addPoint(x: number, y: number, z: number, normal: [number, number, number]): SurfacePoint {
    const point: SurfacePoint = { x, y, z, normal, insideOut: false };
    this._points.push(point);
    if (this._points.length > 60) this._points.shift();
    this._computeCurvatures();
    return point;
  }

  invert(): SurfacePoint[] {
    const centroid = this._computeCentroid();
    for (const p of this._points) {
      p.normal[0] = -p.normal[0];
      p.normal[1] = -p.normal[1];
      p.normal[2] = -p.normal[2];
      const dx = p.x - centroid[0];
      const dy = p.y - centroid[1];
      const dz = p.z - centroid[2];
      p.x = centroid[0] - dx;
      p.y = centroid[1] - dy;
      p.z = centroid[2] - dz;
      p.insideOut = true;
    }
    this._computeCurvatures();
    this._state.invertedAt = Date.now();
    return this._points;
  }

  computeResult(): InversionResult {
    const centroid = this._computeCentroid();
    let volume = 0;
    let surfaceArea = 0;
    for (let i = 0; i < this._points.length - 1; i++) {
      const p1 = this._points[i];
      const p2 = this._points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      surfaceArea += Math.sqrt(dx * dx + dy * dy + dz * dz);
      const r1 = Math.sqrt(p1.x * p1.x + p1.y * p1.y + p1.z * p1.z);
      const r2 = Math.sqrt(p2.x * p2.x + p2.y * p2.y + p2.z * p2.z);
      volume += (4 / 3) * Math.PI * Math.abs(r2 * r2 * r2 - r1 * r1 * r1) / this._points.length;
    }
    this._result = { centroid, volume, surfaceArea };
    return this._result;
  }

  isInsideOut(): boolean {
    return this._points.some((p) => p.insideOut);
  }

  computeWillmoreEnergy(): number {
    if (this._points.length === 0) return 0;
    const h2 = this._meanCurvature * this._meanCurvature;
    return h2 * this._config.sphereRadius * this._config.sphereRadius * this._points.length;
  }

  reset(): void {
    this._points = [];
    this._result = null;
    this._gaussianCurvature = 0;
    this._meanCurvature = 0;
    this._eulerCharacteristic = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      points: this._points.length,
      insideOut: this.isInsideOut(),
      result: this._result,
      state: this._state,
      gaussianCurvature: this._gaussianCurvature.toFixed(4),
      eulerCharacteristic: this._eulerCharacteristic,
      willmoreEnergy: this.computeWillmoreEnergy().toFixed(4),
    };
  }
}
