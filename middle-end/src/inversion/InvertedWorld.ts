export interface WorldCoordinate {
  x: number;
  y: number;
  z: number;
  inverted: boolean;
}

export type InversionMap = {
  origin: [number, number, number];
  radius: number;
  mappedPoints: WorldCoordinate[];
};

export interface InvertedWorldConfig {
  inversionRadius: number;
  originX: number;
  originY: number;
  originZ: number;
}

export class InvertedWorld {
  private _config: InvertedWorldConfig;
  private _coordinates: WorldCoordinate[] = [];
  private _map: InversionMap | null = null;
  private _state: Record<string, unknown> = {};
  private _jacobianDeterminant: number = 1;
  private _conformalFactor: number = 1;
  private _riemannSphereRadius: number = 1;

  constructor(config: InvertedWorldConfig) {
    this._config = config;
  }

  get pointCount(): number {
    return this._coordinates.length;
  }

  get conformalFactor(): number {
    return this._conformalFactor;
  }

  get jacobianDeterminant(): number {
    return this._jacobianDeterminant;
  }

  private _computeConformalFactor(distance: number): number {
    const r = this._config.inversionRadius;
    return (r * r) / ((distance * distance) + 0.001);
  }

  private _computeJacobian(distance: number): number {
    const r = this._config.inversionRadius;
    const denom = Math.pow(distance, 4) + 0.001;
    return (r * r * r * r) / denom;
  }

  addPoint(x: number, y: number, z: number): WorldCoordinate {
    const dx = x - this._config.originX;
    const dy = y - this._config.originY;
    const dz = z - this._config.originZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const coord: WorldCoordinate = { x, y, z, inverted: false };
    this._coordinates.push(coord);
    this._conformalFactor = this._computeConformalFactor(dist);
    this._jacobianDeterminant = this._computeJacobian(dist);
    if (this._coordinates.length > 50) this._coordinates.shift();
    return coord;
  }

  invertAll(): WorldCoordinate[] {
    const result: WorldCoordinate[] = [];
    for (const c of this._coordinates) {
      const dx = c.x - this._config.originX;
      const dy = c.y - this._config.originY;
      const dz = c.z - this._config.originZ;
      const dist2 = dx * dx + dy * dy + dz * dz;
      const r2 = this._config.inversionRadius * this._config.inversionRadius;
      const factor = r2 / (dist2 + 0.001);
      const nx = this._config.originX + dx * factor;
      const ny = this._config.originY + dy * factor;
      const nz = this._config.originZ + dz * factor;
      const inverted: WorldCoordinate = { x: nx, y: ny, z: nz, inverted: true };
      result.push(inverted);
    }
    this._map = {
      origin: [this._config.originX, this._config.originY, this._config.originZ],
      radius: this._config.inversionRadius,
      mappedPoints: result,
    };
    this._state.invertedAt = Date.now();
    return result;
  }

  mapToRiemannSphere(x: number, y: number): [number, number, number] {
    const r2 = x * x + y * y;
    const denom = 1 + r2;
    const X = (2 * x) / denom;
    const Y = (2 * y) / denom;
    const Z = (r2 - 1) / denom;
    return [X * this._riemannSphereRadius, Y * this._riemannSphereRadius, Z * this._riemannSphereRadius];
  }

  computeMap(): InversionMap {
    return this._map ?? { origin: [0, 0, 0], radius: 0, mappedPoints: [] };
  }

  distanceFromOrigin(point: WorldCoordinate): number {
    const dx = point.x - this._config.originX;
    const dy = point.y - this._config.originY;
    const dz = point.z - this._config.originZ;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  preserveCircle(centerX: number, centerY: number, radius: number): { x: number; y: number; r: number } {
    const dx = centerX - this._config.originX;
    const dy = centerY - this._config.originY;
    const d = Math.sqrt(dx * dx + dy * dy);
    const r2 = this._config.inversionRadius * this._config.inversionRadius;
    const newR = (r2 * radius) / Math.abs(d * d - radius * radius + 0.001);
    const k = r2 / (d * d - radius * radius + 0.001);
    const newX = this._config.originX + dx * k;
    const newY = this._config.originY + dy * k;
    return { x: newX, y: newY, r: newR };
  }

  isInvariant(point: WorldCoordinate): boolean {
    return Math.abs(this.distanceFromOrigin(point) - this._config.inversionRadius) < 0.001;
  }

  reset(): void {
    this._coordinates = [];
    this._map = null;
    this._jacobianDeterminant = 1;
    this._conformalFactor = 1;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      points: this._coordinates.length,
      map: this._map,
      state: this._state,
      conformalFactor: this._conformalFactor.toFixed(4),
      jacobian: this._jacobianDeterminant.toFixed(4),
    };
  }
}
