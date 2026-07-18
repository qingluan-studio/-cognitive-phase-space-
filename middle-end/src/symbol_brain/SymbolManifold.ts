import { KnowledgeUnit, DataPacket } from '../shared/types';

export interface SymbolPoint {
  id: string;
  symbol: string;
  coordinates: number[];
  density: number;
  curvature: number;
  neighbors: string[];
}

export interface ManifoldChart {
  id: string;
  centerPoint: string;
  basisVectors: number[][];
  localDimension: number;
  radius: number;
  coveredPoints: string[];
}

export interface GeodesicPath {
  start: string;
  end: string;
  points: string[];
  length: number;
  curvatureIntegral: number;
}

export interface TopologicalFeature {
  type: 'hole' | 'bridge' | 'peak' | 'valley' | 'fold';
  center: string;
  size: number;
  persistence: number;
  boundary: string[];
}

export interface ISymbolManifold {
  dimension: number;
  pointCount: number;
  addSymbol(symbolId: string, symbol: string, coordinates?: number[]): void;
  getSymbolPoint(symbolId: string): SymbolPoint | undefined;
  computeGeodesic(startId: string, endId: string): GeodesicPath | null;
  computeLocalDimension(pointId: string, k: number): number;
  findTopologicalFeatures(minPersistence: number): TopologicalFeature[];
  chartManifold(chartRadius: number): ManifoldChart[];
  projectTo2D(pointIds: string[]): { id: string; x: number; y: number }[];
}

export class SymbolManifold implements ISymbolManifold {
  private _points: Map<string, SymbolPoint>;
  private _dimension: number;
  private _adjacency: Map<string, { neighbor: string; distance: number }[]>;
  private _charts: ManifoldChart[];
  private _featureCache: TopologicalFeature[];
  private _geodesicCache: Map<string, GeodesicPath>;
  private _dirty: boolean;
  private _maxCacheSize: number;

  constructor(dimension: number = 64) {
    this._points = new Map();
    this._dimension = dimension;
    this._adjacency = new Map();
    this._charts = [];
    this._featureCache = [];
    this._geodesicCache = new Map();
    this._dirty = true;
    this._maxCacheSize = 500;
  }

  get dimension(): number { return this._dimension; }
  get pointCount(): number { return this._points.size; }
  get chartCount(): number { return this._charts.length; }
  get featureCount(): number { return this._featureCache.length; }

  public addSymbol(symbolId: string, symbol: string, coordinates?: number[]): void {
    const coords = coordinates || Array.from({ length: this._dimension }, () => Math.random() * 2 - 1);
    const norm = Math.sqrt(coords.reduce((s, v) => s + v * v, 0));
    const normalized = norm > 0 ? coords.map(v => v / norm) : coords;
    this._points.set(symbolId, {
      id: symbolId,
      symbol,
      coordinates: normalized,
      density: 0,
      curvature: 0,
      neighbors: []
    });
    this._adjacency.set(symbolId, []);
    this._dirty = true;
  }

  public getSymbolPoint(symbolId: string): SymbolPoint | undefined {
    const p = this._points.get(symbolId);
    return p ? { ...p, coordinates: [...p.coordinates], neighbors: [...p.neighbors] } : undefined;
  }

  private _euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length && i < b.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  private _computeAllDistances(): void {
    const ids = Array.from(this._points.keys());
    for (let i = 0; i < ids.length; i++) {
      this._adjacency.get(ids[i])!.length = 0;
    }
    for (let i = 0; i < ids.length; i++) {
      const pi = this._points.get(ids[i])!;
      let distSum = 0;
      for (let j = 0; j < ids.length; j++) {
        if (i === j) continue;
        const pj = this._points.get(ids[j])!;
        const dist = this._euclideanDistance(pi.coordinates, pj.coordinates);
        distSum += dist;
        this._adjacency.get(ids[i])!.push({ neighbor: ids[j], distance: dist });
      }
      const adj = this._adjacency.get(ids[i])!;
      adj.sort((a, b) => a.distance - b.distance);
      const k = Math.min(10, adj.length);
      pi.neighbors = adj.slice(0, k).map(a => a.neighbor);
      pi.density = adj.length > 0 ? 1 / (1 + distSum / adj.length) : 0;
      this._computeCurvature(ids[i]);
    }
    this._dirty = false;
    this._geodesicCache.clear();
  }

  private _computeCurvature(pointId: string): void {
    const p = this._points.get(pointId);
    if (!p) return;
    const neighbors = p.neighbors.slice(0, 5);
    if (neighbors.length < 3) {
      p.curvature = 0;
      return;
    }
    let angleSum = 0;
    const center = p.coordinates;
    for (let i = 0; i < neighbors.length; i++) {
      const ni = this._points.get(neighbors[i])!.coordinates;
      const nj = this._points.get(neighbors[(i + 1) % neighbors.length])!.coordinates;
      const vi = ni.map((v, idx) => v - center[idx]);
      const vj = nj.map((v, idx) => v - center[idx]);
      let dot = 0;
      let normI = 0;
      let normJ = 0;
      for (let d = 0; d < this._dimension; d++) {
        dot += vi[d] * vj[d];
        normI += vi[d] * vi[d];
        normJ += vj[d] * vj[d];
      }
      const cosAngle = Math.max(-1, Math.min(1, dot / (Math.sqrt(normI) * Math.sqrt(normJ))));
      angleSum += Math.acos(cosAngle);
    }
    const expectedAngle = 2 * Math.PI;
    p.curvature = (angleSum - expectedAngle) / expectedAngle;
  }

  public computeGeodesic(startId: string, endId: string): GeodesicPath | null {
    const cacheKey = `${startId}:${endId}`;
    const cached = this._geodesicCache.get(cacheKey);
    if (cached) return { ...cached, points: [...cached.points] };
    if (this._dirty) this._computeAllDistances();
    if (!this._points.has(startId) || !this._points.has(endId)) return null;
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const visited = new Set<string>();
    for (const [id] of this._points) {
      distances.set(id, Infinity);
      previous.set(id, null);
    }
    distances.set(startId, 0);
    const queue: { id: string; dist: number }[] = [{ id: startId, dist: 0 }];
    while (queue.length > 0) {
      queue.sort((a, b) => a.dist - b.dist);
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      if (current.id === endId) break;
      const adj = this._adjacency.get(current.id) || [];
      for (const { neighbor, distance } of adj) {
        if (visited.has(neighbor)) continue;
        const newDist = current.dist + distance;
        const oldDist = distances.get(neighbor) || Infinity;
        if (newDist < oldDist) {
          distances.set(neighbor, newDist);
          previous.set(neighbor, current.id);
          queue.push({ id: neighbor, dist: newDist });
        }
      }
    }
    const endDist = distances.get(endId);
    if (endDist === undefined || endDist === Infinity) return null;
    const path: string[] = [];
    let cur: string | null = endId;
    let curvatureSum = 0;
    while (cur !== null) {
      path.unshift(cur);
      const p = this._points.get(cur);
      if (p) curvatureSum += Math.abs(p.curvature);
      cur = previous.get(cur) ?? null;
    }
    const geodesic: GeodesicPath = {
      start: startId,
      end: endId,
      points: path,
      length: endDist,
      curvatureIntegral: curvatureSum
    };
    if (this._geodesicCache.size >= this._maxCacheSize) {
      const firstKey = this._geodesicCache.keys().next().value;
      if (firstKey !== undefined) this._geodesicCache.delete(firstKey);
    }
    this._geodesicCache.set(cacheKey, geodesic);
    return { ...geodesic, points: [...geodesic.points] };
  }

  public computeLocalDimension(pointId: string, k: number = 10): number {
    if (this._dirty) this._computeAllDistances();
    const p = this._points.get(pointId);
    if (!p) return 0;
    const adj = this._adjacency.get(pointId) || [];
    const distances = adj.slice(0, k).map(a => a.distance);
    if (distances.length < 2) return 1;
    const logs = distances.map(d => Math.log(Math.max(d, 1e-10)));
    const meanLog = logs.reduce((a, b) => a + b, 0) / logs.length;
    const sortedLogs = [...logs].sort((a, b) => a - b);
    let slopeSum = 0;
    let count = 0;
    for (let i = 0; i < sortedLogs.length - 1; i++) {
      for (let j = i + 1; j < sortedLogs.length; j++) {
        const dx = (j - i) / sortedLogs.length;
        const dy = sortedLogs[j] - sortedLogs[i];
        if (dx > 0) {
          slopeSum += dy / dx;
          count++;
        }
      }
    }
    return count > 0 ? Math.max(1, Math.min(this._dimension, Math.abs(slopeSum / count))) : 1;
  }

  public findTopologicalFeatures(minPersistence: number = 0.3): TopologicalFeature[] {
    if (this._dirty) this._computeAllDistances();
    const features: TopologicalFeature[] = [];
    const points = Array.from(this._points.values());
    points.sort((a, b) => b.density - a.density);
    const visited = new Set<string>();
    for (const p of points) {
      if (visited.has(p.id)) continue;
      if (p.density < minPersistence) continue;
      const cluster: string[] = [];
      const queue = [p.id];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        cluster.push(current);
        const cp = this._points.get(current)!;
        for (const n of cp.neighbors) {
          const np = this._points.get(n);
          if (np && !visited.has(n) && np.density > minPersistence * 0.5) {
            queue.push(n);
          }
        }
      }
      if (cluster.length >= 5) {
        let type: 'peak' | 'valley' = 'peak';
        let center = p.id;
        const avgDensity = cluster.reduce((s, id) => s + (this._points.get(id)?.density || 0), 0) / cluster.length;
        const persistence = Math.abs(p.density - avgDensity);
        if (p.density < avgDensity) type = 'valley';
        features.push({
          type,
          center,
          size: cluster.length,
          persistence,
          boundary: cluster.slice(0, 10)
        });
      }
    }
    features.sort((a, b) => b.persistence - a.persistence);
    this._featureCache = features;
    return features.map(f => ({ ...f, boundary: [...f.boundary] }));
  }

  public chartManifold(chartRadius: number = 0.5): ManifoldChart[] {
    if (this._dirty) this._computeAllDistances();
    const charts: ManifoldChart[] = [];
    const covered = new Set<string>();
    const points = Array.from(this._points.keys());
    let chartId = 0;
    for (const seedId of points) {
      if (covered.has(seedId)) continue;
      const coveredPoints: string[] = [];
      const queue = [{ id: seedId, dist: 0 }];
      const localDists = new Map<string, number>();
      localDists.set(seedId, 0);
      while (queue.length > 0) {
        queue.sort((a, b) => a.dist - b.dist);
        const current = queue.shift()!;
        if (current.dist > chartRadius) continue;
        if (coveredPoints.includes(current.id)) continue;
        coveredPoints.push(current.id);
        const adj = this._adjacency.get(current.id) || [];
        for (const { neighbor, distance } of adj) {
          const newDist = current.dist + distance;
          const oldDist = localDists.get(neighbor) ?? Infinity;
          if (newDist < oldDist && newDist <= chartRadius) {
            localDists.set(neighbor, newDist);
            queue.push({ id: neighbor, dist: newDist });
          }
        }
      }
      if (coveredPoints.length >= 3) {
        const basis = this._computeLocalBasis(coveredPoints);
        charts.push({
          id: `chart-${chartId++}`,
          centerPoint: seedId,
          basisVectors: basis,
          localDimension: basis.length,
          radius: chartRadius,
          coveredPoints
        });
        for (const cp of coveredPoints) covered.add(cp);
      }
    }
    this._charts = charts;
    return charts.map(c => ({ ...c, coveredPoints: [...c.coveredPoints], basisVectors: c.basisVectors.map(b => [...b]) }));
  }

  private _computeLocalBasis(pointIds: string[]): number[][] {
    if (pointIds.length < 2) return [];
    const center = this._points.get(pointIds[0])!.coordinates;
    const vectors: number[][] = [];
    for (let i = 1; i < Math.min(pointIds.length, this._dimension); i++) {
      const p = this._points.get(pointIds[i])!.coordinates;
      const diff = p.map((v, idx) => v - center[idx]);
      let ortho = [...diff];
      for (const basis of vectors) {
        let dot = 0;
        let basisNorm = 0;
        for (let d = 0; d < this._dimension; d++) {
          dot += ortho[d] * basis[d];
          basisNorm += basis[d] * basis[d];
        }
        if (basisNorm > 0) {
          for (let d = 0; d < this._dimension; d++) {
            ortho[d] -= (dot / basisNorm) * basis[d];
          }
        }
      }
      const norm = Math.sqrt(ortho.reduce((s, v) => s + v * v, 0));
      if (norm > 0.01) {
        vectors.push(ortho.map(v => v / norm));
      }
    }
    return vectors;
  }

  public projectTo2D(pointIds: string[]): { id: string; x: number; y: number }[] {
    if (this._dirty) this._computeAllDistances();
    const ids = pointIds.length > 0 ? pointIds : Array.from(this._points.keys());
    const results: { id: string; x: number; y: number }[] = [];
    if (ids.length < 3) {
      for (let i = 0; i < ids.length; i++) {
        results.push({ id: ids[i], x: i, y: 0 });
      }
      return results;
    }
    let xBasis: number[] = [];
    let yBasis: number[] = [];
    const first = this._points.get(ids[0])!.coordinates;
    const second = this._points.get(ids[1])!.coordinates;
    xBasis = second.map((v, i) => v - first[i]);
    let xNorm = Math.sqrt(xBasis.reduce((s, v) => s + v * v, 0));
    if (xNorm > 0) xBasis = xBasis.map(v => v / xNorm);
    const third = this._points.get(ids[2])!.coordinates;
    let yRaw = third.map((v, i) => v - first[i]);
    let dot = 0;
    for (let d = 0; d < this._dimension; d++) {
      dot += yRaw[d] * xBasis[d];
    }
    yBasis = yRaw.map((v, i) => v - dot * xBasis[i]);
    let yNorm = Math.sqrt(yBasis.reduce((s, v) => s + v * v, 0));
    if (yNorm > 0) yBasis = yBasis.map(v => v / yNorm);
    for (const id of ids) {
      const p = this._points.get(id);
      if (!p) continue;
      let x = 0;
      let y = 0;
      for (let d = 0; d < this._dimension; d++) {
        x += p.coordinates[d] * xBasis[d];
        y += p.coordinates[d] * yBasis[d];
      }
      results.push({ id, x, y });
    }
    return results;
  }

  public toKnowledgeUnit(symbolId: string): KnowledgeUnit | null {
    const p = this._points.get(symbolId);
    if (!p) return null;
    return {
      id: `manifold-${symbolId}`,
      content: p.symbol,
      vector: p.coordinates,
      lineage: [`dim-${this._dimension}`, `density-${Math.round(p.density * 100)}`]
    };
  }

  public reset(): void {
    this._points.clear();
    this._adjacency.clear();
    this._charts = [];
    this._featureCache = [];
    this._geodesicCache.clear();
    this._dirty = true;
  }
}
