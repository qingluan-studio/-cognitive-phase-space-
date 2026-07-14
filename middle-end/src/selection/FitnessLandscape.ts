export interface LandscapePoint {
  id: string;
  coordinates: number[];
  fitness: number;
}

export interface PeakInfo {
  pointId: string;
  coordinates: number[];
  fitness: number;
  prominence: number;
}

export class FitnessLandscape {
  private _points: Map<string, LandscapePoint> = new Map();
  private _peaks: PeakInfo[] = [];
  private _dimensions: number;
  private _peakThreshold: number = 0.8;
  private _neighborRadius: number = 5;

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
      const dist = this._euclideanDistance(point.coordinates, coordinates);
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    }
    return nearest;
  }

  estimateGradient(pointId: string): number[] | null {
    const point = this._points.get(pointId);
    if (!point) return null;
    const gradient: number[] = new Array(this._dimensions).fill(0);
    let totalWeight = 0;
    for (const other of this._points.values()) {
      if (other.id === pointId) continue;
      const dist = this._euclideanDistance(point.coordinates, other.coordinates);
      if (dist === 0 || dist > this._neighborRadius) continue;
      const weight = 1 / (dist * dist);
      const diff = other.fitness - point.fitness;
      for (let d = 0; d < this._dimensions; d++) {
        gradient[d] += (diff * (other.coordinates[d] - point.coordinates[d])) * weight;
      }
      totalWeight += weight;
    }
    if (totalWeight > 0) {
      for (let d = 0; d < this._dimensions; d++) gradient[d] /= totalWeight;
    }
    return gradient;
  }

  gradientAscent(startId: string, stepSize: number, iterations: number): string | null {
    let currentId = startId;
    for (let i = 0; i < iterations; i++) {
      const current = this._points.get(currentId);
      if (!current) return null;
      const gradient = this.estimateGradient(currentId);
      if (!gradient) return null;
      const nextCoords = current.coordinates.map((c, d) => c + stepSize * gradient[d]);
      const nearest = this.queryNearest(nextCoords);
      if (!nearest || nearest.id === currentId) return currentId;
      if (nearest.fitness < current.fitness) return currentId;
      currentId = nearest.id;
    }
    return currentId;
  }

  identifyPeaks(): PeakInfo[] {
    const peaks: PeakInfo[] = [];
    for (const point of this._points.values()) {
      if (point.fitness < this._peakThreshold) continue;
      const neighbors = Array.from(this._points.values()).filter(
        (p) => p.id !== point.id && this._euclideanDistance(point.coordinates, p.coordinates) <= this._neighborRadius
      );
      if (neighbors.length === 0) continue;
      const isPeak = neighbors.every((n) => point.fitness >= n.fitness);
      if (isPeak) {
        const prominence = point.fitness - Math.max(...neighbors.map((n) => n.fitness));
        peaks.push({ pointId: point.id, coordinates: point.coordinates, fitness: point.fitness, prominence });
      }
    }
    this._peaks = peaks;
    return peaks;
  }

  computeRuggedness(): number {
    if (this._points.size < 2) return 0;
    const points = Array.from(this._points.values());
    let totalChange = 0;
    let pairCount = 0;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dist = this._euclideanDistance(points[i].coordinates, points[j].coordinates);
        if (dist > this._neighborRadius) continue;
        totalChange += Math.abs(points[i].fitness - points[j].fitness) / (dist + 1e-9);
        pairCount++;
      }
    }
    return pairCount > 0 ? totalChange / pairCount : 0;
  }

  computeAutocorrelation(lag: number): number {
    const points = Array.from(this._points.values());
    if (points.length < lag + 1) return 0;
    const fitnesses = points.map((p) => p.fitness);
    const mean = fitnesses.reduce((s, f) => s + f, 0) / fitnesses.length;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < fitnesses.length - lag; i++) {
      numerator += (fitnesses[i] - mean) * (fitnesses[i + lag] - mean);
    }
    for (let i = 0; i < fitnesses.length; i++) {
      denominator += (fitnesses[i] - mean) ** 2;
    }
    return denominator === 0 ? 0 : numerator / denominator;
  }

  setPeakThreshold(value: number): void {
    this._peakThreshold = Math.max(0, Math.min(1, value));
  }

  setNeighborRadius(radius: number): void {
    this._neighborRadius = Math.max(0.001, radius);
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

  private _euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }
}
