export interface ProjectedPoint {
  x: number;
  y: number;
  originalZ: number;
  distortion: number;
}

export type ProjectionBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export interface FlatlandConfig {
  focalLength: number;
  vanishingX: number;
  vanishingY: number;
  perspective: boolean;
}

export class FlatlandProjection {
  private _config: FlatlandConfig;
  private _points: ProjectedPoint[] = [];
  private _bounds: ProjectionBounds | null = null;
  private _state: Record<string, unknown> = {};
  private _homographyMatrix: number[][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  private _vanishingPoint: [number, number] = [0, 0];

  constructor(config: FlatlandConfig) {
    this._config = config;
  }

  get pointCount(): number {
    return this._points.length;
  }

  get averageDistortion(): number {
    if (this._points.length === 0) return 0;
    return this._points.reduce((acc, p) => acc + p.distortion, 0) / this._points.length;
  }

  private _applyHomography(x: number, y: number, z: number): [number, number] {
    const H = this._homographyMatrix;
    const w = H[2][0] * x + H[2][1] * y + H[2][2] * z + 0.001;
    const px = (H[0][0] * x + H[0][1] * y + H[0][2] * z) / w;
    const py = (H[1][0] * x + H[1][1] * y + H[1][2] * z) / w;
    return [px, py];
  }

  private _computeDistortion(z: number): number {
    return z / (this._config.focalLength + Math.abs(z));
  }

  project(x: number, y: number, z: number): ProjectedPoint {
    let px = x;
    let py = y;
    if (this._config.perspective) {
      const scale = this._config.focalLength / (this._config.focalLength + z);
      px = this._config.vanishingX + (x - this._config.vanishingX) * scale;
      py = this._config.vanishingY + (y - this._config.vanishingY) * scale;
    }
    const [hx, hy] = this._applyHomography(px, py, z);
    const distortion = this._computeDistortion(z);
    const point: ProjectedPoint = { x: hx, y: hy, originalZ: z, distortion };
    this._points.push(point);
    if (this._points.length > 100) this._points.shift();
    this._state.lastProjected = { x, y, z };
    return point;
  }

  computeBounds(): ProjectionBounds {
    if (this._points.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    const xs = this._points.map((p) => p.x);
    const ys = this._points.map((p) => p.y);
    this._bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
    return this._bounds;
  }

  setHomography(matrix: number[][]): void {
    if (matrix.length === 3 && matrix[0].length === 3) {
      this._homographyMatrix = matrix.map((row) => [...row]);
    }
  }

  vanishingLine(angle: number): ProjectedPoint[] {
    const result: ProjectedPoint[] = [];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let t = -10; t <= 10; t += 0.5) {
      const x = this._config.vanishingX + t * cos;
      const y = this._config.vanishingY + t * sin;
      result.push({ x, y, originalZ: 0, distortion: 0 });
    }
    return result;
  }

  depthSort(): ProjectedPoint[] {
    return [...this._points].sort((a, b) => b.originalZ - a.originalZ);
  }

  isDegenerate(): boolean {
    const bounds = this.computeBounds();
    return bounds.maxX - bounds.minX < 0.001 || bounds.maxY - bounds.minY < 0.001;
  }

  reset(): void {
    this._points = [];
    this._bounds = null;
    this._homographyMatrix = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      points: this._points.length,
      bounds: this._bounds,
      averageDistortion: this.averageDistortion.toFixed(4),
      state: this._state,
      degenerate: this.isDegenerate(),
    };
  }
}
