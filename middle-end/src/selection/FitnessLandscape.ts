/**
 * 适应度景观：可视化功能优劣的地形。
 * 维护一个由位置坐标到适应度值映射的景观，支持查询、梯度估计与峰值定位。
 */

export interface LandscapePoint {
  id: string;
  coordinates: number[];
  fitness: number;
}

export interface PeakInfo {
  pointId: string;
  coordinates: number[];
  fitness: number;
}

export class FitnessLandscape {
  private _points: Map<string, LandscapePoint> = new Map();
  private _peaks: PeakInfo[] = [];
  private _dimensions: number;
  private _peakThreshold = 0.8;

  constructor(dimensions: number = 2) {
    this._dimensions = dimensions;
  }

  addPoint(point: LandscapePoint): void {
    if (point.coordinates.length !== this._dimensions) return;
    this._points.set(point.id, point);
  }

  queryNearest(coordinates: number[]): LandscapePoint | null {
    let nearest: LandscapePoint | null = null;
    let minDist = Infinity;
    for (const point of this._points.values()) {
      const dist = this._distance(point.coordinates, coordinates);
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    }
    return nearest;
  }

  private _distance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  estimateGradient(pointId: string): number[] | null {
    const point = this._points.get(pointId);
    if (!point) return null;
    const gradient: number[] = new Array(this._dimensions).fill(0);
    for (const other of this._points.values()) {
      if (other.id === pointId) continue;
      const dist = this._distance(point.coordinates, other.coordinates);
      if (dist === 0) continue;
      const diff = other.fitness - point.fitness;
      for (let d = 0; d < this._dimensions; d++) {
        gradient[d] += (diff * (other.coordinates[d] - point.coordinates[d])) / (dist ** 2);
      }
    }
    return gradient;
  }

  identifyPeaks(): PeakInfo[] {
    const peaks: PeakInfo[] = [];
    for (const point of this._points.values()) {
      if (point.fitness < this._peakThreshold) continue;
      const neighbors = Array.from(this._points.values()).filter(p => p.id !== point.id);
      const isPeak = neighbors.every(n => point.fitness >= n.fitness || this._distance(point.coordinates, n.coordinates) > 5);
      if (isPeak) {
        peaks.push({ pointId: point.id, coordinates: point.coordinates, fitness: point.fitness });
      }
    }
    this._peaks = peaks;
    return peaks;
  }

  setPeakThreshold(value: number): void {
    this._peakThreshold = Math.max(0, Math.min(1, value));
  }

  getPoint(id: string): LandscapePoint | null {
    return this._points.get(id) ?? null;
  }

  getAllPoints(): LandscapePoint[] {
    return Array.from(this._points.values());
  }

  get pointCount(): number {
    return this._points.size;
  }
}
