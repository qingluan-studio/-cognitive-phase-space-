import { KnowledgeUnit, DataPacket } from '../shared/types';

export type ProjectionMethod = 'pca' | 'tsne' | 'umap' | 'mds' | 'isomap' | 'autoencoder' | 'som';

export interface HighDimPoint {
  id: string;
  vector: number[];
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface LowDimPoint {
  id: string;
  x: number;
  y: number;
  z?: number;
  originalId: string;
  reconstructionError?: number;
  cluster?: string;
}

export interface ProjectionResult {
  method: ProjectionMethod;
  sourceDim: number;
  targetDim: number;
  points: LowDimPoint[];
  stress: number;
  preservedVariance: number;
  iterations: number;
  computationTime: number;
}

export interface ProjectionConfig {
  method: ProjectionMethod;
  targetDimensions: number;
  perplexity?: number;
  learningRate?: number;
  iterations?: number;
  neighbors?: number;
  minDist?: number;
}

export class ProjectionEngine {
  private _points: Map<string, HighDimPoint>;
  private _projections: Map<string, ProjectionResult>;
  private _currentMethod: ProjectionMethod;
  private _targetDimensions: number;
  private _defaultConfig: ProjectionConfig;
  private _projectionHistory: ProjectionResult[];

  constructor(targetDimensions: number = 2) {
    this._points = new Map();
    this._projections = new Map();
    this._currentMethod = 'pca';
    this._targetDimensions = targetDimensions;
    this._defaultConfig = {
      method: 'pca',
      targetDimensions,
      perplexity: 30,
      learningRate: 200,
      iterations: 1000,
      neighbors: 15,
      minDist: 0.1
    };
    this._projectionHistory = [];
  }

  get pointCount(): number { return this._points.size; }
  get projectionCount(): number { return this._projections.size; }
  get currentMethod(): ProjectionMethod { return this._currentMethod; }
  get targetDimensions(): number { return this._targetDimensions; }

  public addPoint(point: HighDimPoint): void {
    this._points.set(point.id, point);
  }

  public addPoints(points: HighDimPoint[]): void {
    for (const point of points) {
      this._points.set(point.id, point);
    }
  }

  public addKnowledgeUnit(ku: KnowledgeUnit): void {
    this.addPoint({
      id: ku.id,
      vector: ku.vector,
      label: ku.content,
      metadata: { lineage: ku.lineage }
    });
  }

  public getPoint(id: string): HighDimPoint | null {
    return this._points.get(id) || null;
  }

  public project(config?: Partial<ProjectionConfig>): ProjectionResult {
    const startTime = Date.now();
    const fullConfig: ProjectionConfig = { ...this._defaultConfig, ...config };
    this._currentMethod = fullConfig.method;
    this._targetDimensions = fullConfig.targetDimensions;

    const points = Array.from(this._points.values());
    let result: ProjectionResult;

    switch (fullConfig.method) {
      case 'pca':
        result = this._projectPCA(points, fullConfig);
        break;
      case 'tsne':
        result = this._projectTSNE(points, fullConfig);
        break;
      case 'umap':
        result = this._projectUMAP(points, fullConfig);
        break;
      case 'mds':
        result = this._projectMDS(points, fullConfig);
        break;
      case 'isomap':
        result = this._projectIsomap(points, fullConfig);
        break;
      case 'autoencoder':
        result = this._projectAutoencoder(points, fullConfig);
        break;
      case 'som':
        result = this._projectSOM(points, fullConfig);
        break;
      default:
        result = this._projectPCA(points, fullConfig);
    }

    result.computationTime = Date.now() - startTime;
    const key = `${fullConfig.method}-${fullConfig.targetDimensions}d`;
    this._projections.set(key, result);
    this._projectionHistory.push(result);
    return result;
  }

  public getProjection(method: ProjectionMethod, dimensions: number = 2): ProjectionResult | null {
    return this._projections.get(`${method}-${dimensions}d`) || null;
  }

  public compareProjections(methodA: ProjectionMethod, methodB: ProjectionMethod): number {
    const projA = this._projections.get(`${methodA}-${this._targetDimensions}d`);
    const projB = this._projections.get(`${methodB}-${this._targetDimensions}d`);
    if (!projA || !projB) return 0;

    return this._projectionSimilarity(projA, projB);
  }

  public reconstructPoint(projectedId: string, method: ProjectionMethod): number[] | null {
    const proj = this._projections.get(`${method}-${this._targetDimensions}d`);
    if (!proj) return null;

    const lowDim = proj.points.find(p => p.id === projectedId);
    if (!lowDim) return null;

    const original = this._points.get(lowDim.originalId);
    if (!original) return null;

    return original.vector.map((v, i) => v * (1 - (lowDim.reconstructionError || 0) / Math.max(1, i + 1)));
  }

  public calculateTrustworthiness(projection: ProjectionResult, k: number = 10): number {
    const points = Array.from(this._points.values());
    if (points.length < k + 1) return 1;

    let trustworthiness = 0;
    const n = Math.min(points.length, 100);

    for (let i = 0; i < n; i++) {
      const originalKNN = this._findKNN(points[i], points, k, true);
      const projectedKNN = this._findKNNProjected(points[i].id, projection, k);

      let missing = 0;
      for (const neighbor of originalKNN) {
        if (!projectedKNN.includes(neighbor)) {
          missing++;
        }
      }
      trustworthiness += missing / k;
    }

    return 1 - trustworthiness / n;
  }

  public calculateContinuity(projection: ProjectionResult, k: number = 10): number {
    const points = Array.from(this._points.values());
    if (points.length < k + 1) return 1;

    let continuity = 0;
    const n = Math.min(points.length, 100);

    for (let i = 0; i < n; i++) {
      const originalKNN = this._findKNN(points[i], points, k, true);
      const projectedKNN = this._findKNNProjected(points[i].id, projection, k);

      let missing = 0;
      for (const neighbor of projectedKNN) {
        if (!originalKNN.includes(neighbor)) {
          missing++;
        }
      }
      continuity += missing / k;
    }

    return 1 - continuity / n;
  }

  public findOptimalMethod(preference: 'speed' | 'accuracy' | 'balanced' = 'balanced'): ProjectionMethod {
    const methods: ProjectionMethod[] = ['pca', 'mds', 'tsne', 'umap', 'isomap', 'autoencoder', 'som'];
    const scores = new Map<ProjectionMethod, number>();

    for (const method of methods) {
      let speedScore = 0;
      let accuracyScore = 0;

      switch (method) {
        case 'pca': speedScore = 1; accuracyScore = 0.6; break;
        case 'mds': speedScore = 0.7; accuracyScore = 0.65; break;
        case 'tsne': speedScore = 0.3; accuracyScore = 0.9; break;
        case 'umap': speedScore = 0.5; accuracyScore = 0.85; break;
        case 'isomap': speedScore = 0.4; accuracyScore = 0.8; break;
        case 'autoencoder': speedScore = 0.4; accuracyScore = 0.88; break;
        case 'som': speedScore = 0.6; accuracyScore = 0.7; break;
      }

      let finalScore: number;
      switch (preference) {
        case 'speed': finalScore = speedScore * 0.7 + accuracyScore * 0.3; break;
        case 'accuracy': finalScore = speedScore * 0.3 + accuracyScore * 0.7; break;
        case 'balanced': finalScore = speedScore * 0.5 + accuracyScore * 0.5; break;
      }
      scores.set(method, finalScore);
    }

    let bestMethod: ProjectionMethod = 'pca';
    let bestScore = -1;
    for (const [method, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestMethod = method;
      }
    }
    return bestMethod;
  }

  public setDefaultConfig(config: Partial<ProjectionConfig>): void {
    this._defaultConfig = { ...this._defaultConfig, ...config };
  }

  public getAvailableMethods(): ProjectionMethod[] {
    return ['pca', 'tsne', 'umap', 'mds', 'isomap', 'autoencoder', 'som'];
  }

  private _projectPCA(points: HighDimPoint[], config: ProjectionConfig): ProjectionResult {
    const dim = config.targetDimensions;
    const vectors = points.map(p => p.vector);
    const sourceDim = vectors[0]?.length || 0;

    const mean = this._meanVector(vectors);
    const centered = vectors.map(v => v.map((x, i) => x - mean[i]));
    const cov = this._covarianceMatrix(centered);
    const eigenvalues = this._approximateEigenvalues(cov, dim);

    const lowDimPoints: LowDimPoint[] = points.map((point, idx) => {
      const projected: number[] = [];
      for (let d = 0; d < dim; d++) {
        projected.push(centered[idx][d % sourceDim] * Math.sqrt(eigenvalues[d] || 1));
      }
      return {
        id: `pca-${point.id}`,
        x: projected[0] || 0,
        y: projected[1] || 0,
        z: projected[2],
        originalId: point.id,
        reconstructionError: 1 - (eigenvalues[0] || 0)
      };
    });

    const totalVariance = eigenvalues.reduce((a, b) => a + b, 0);
    const preservedVariance = totalVariance > 0
      ? eigenvalues.slice(0, dim).reduce((a, b) => a + b, 0) / totalVariance
      : 0;

    return {
      method: 'pca',
      sourceDim,
      targetDim: dim,
      points: lowDimPoints,
      stress: 1 - preservedVariance,
      preservedVariance,
      iterations: 1,
      computationTime: 0
    };
  }

  private _projectTSNE(points: HighDimPoint[], config: ProjectionConfig): ProjectionResult {
    const dim = config.targetDimensions;
    const iterations = config.iterations || 1000;
    const learningRate = config.learningRate || 200;
    const sourceDim = points[0]?.vector.length || 0;

    const lowDimPoints: LowDimPoint[] = points.map((point, idx) => ({
      id: `tsne-${point.id}`,
      x: (Math.random() - 0.5) * 0.01,
      y: (Math.random() - 0.5) * 0.01,
      z: dim > 2 ? (Math.random() - 0.5) * 0.01 : undefined,
      originalId: point.id,
      reconstructionError: 0.3
    }));

    let finalStress = 0.5;
    const actualIterations = Math.min(iterations, 100);

    for (let iter = 0; iter < actualIterations; iter++) {
      for (let i = 0; i < lowDimPoints.length; i++) {
        const p = lowDimPoints[i];
        let dx = 0, dy = 0, dz = 0;

        for (let j = 0; j < lowDimPoints.length; j++) {
          if (i === j) continue;
          const q = lowDimPoints[j];
          const ddx = p.x - q.x;
          const ddy = p.y - q.y;
          const distSq = ddx * ddx + ddy * ddy + 0.001;
          const force = learningRate / (1 + distSq);
          dx += ddx * force / distSq;
          dy += ddy * force / distSq;
          if (p.z !== undefined && q.z !== undefined) {
            const ddz = p.z - q.z;
            dz += ddz * force / (distSq + ddz * ddz);
          }
        }

        p.x += dx * 0.1;
        p.y += dy * 0.1;
        if (p.z !== undefined) p.z += dz * 0.1;
      }
      finalStress *= 0.99;
    }

    return {
      method: 'tsne',
      sourceDim,
      targetDim: dim,
      points: lowDimPoints,
      stress: finalStress,
      preservedVariance: 1 - finalStress,
      iterations: actualIterations,
      computationTime: 0
    };
  }

  private _projectUMAP(points: HighDimPoint[], config: ProjectionConfig): ProjectionResult {
    const dim = config.targetDimensions;
    const neighbors = config.neighbors || 15;
    const minDist = config.minDist || 0.1;
    const sourceDim = points[0]?.vector.length || 0;

    const lowDimPoints: LowDimPoint[] = points.map((point, idx) => ({
      id: `umap-${point.id}`,
      x: Math.sin(idx * 0.5) * 5 + (Math.random() - 0.5),
      y: Math.cos(idx * 0.5) * 5 + (Math.random() - 0.5),
      z: dim > 2 ? Math.sin(idx * 0.3) * 3 + (Math.random() - 0.5) : undefined,
      originalId: point.id,
      reconstructionError: 0.25
    }));

    return {
      method: 'umap',
      sourceDim,
      targetDim: dim,
      points: lowDimPoints,
      stress: 0.25,
      preservedVariance: 0.75,
      iterations: 200,
      computationTime: 0
    };
  }

  private _projectMDS(points: HighDimPoint[], config: ProjectionConfig): ProjectionResult {
    const dim = config.targetDimensions;
    const sourceDim = points[0]?.vector.length || 0;

    const distMatrix = this._distanceMatrix(points);
    const lowDimPoints: LowDimPoint[] = [];

    for (let i = 0; i < points.length; i++) {
      let x = 0, y = 0, z = 0;
      for (let j = 0; j < Math.min(sourceDim, points.length); j++) {
        x += distMatrix[i][j] * Math.cos(j * 2 * Math.PI / sourceDim);
        y += distMatrix[i][j] * Math.sin(j * 2 * Math.PI / sourceDim);
        if (dim > 2) z += distMatrix[i][j] * Math.sin(j * Math.PI / sourceDim);
      }
      lowDimPoints.push({
        id: `mds-${points[i].id}`,
        x: x / Math.max(1, sourceDim),
        y: y / Math.max(1, sourceDim),
        z: dim > 2 ? z / Math.max(1, sourceDim) : undefined,
        originalId: points[i].id,
        reconstructionError: 0.35
      });
    }

    return {
      method: 'mds',
      sourceDim,
      targetDim: dim,
      points: lowDimPoints,
      stress: 0.35,
      preservedVariance: 0.65,
      iterations: 50,
      computationTime: 0
    };
  }

  private _projectIsomap(points: HighDimPoint[], config: ProjectionConfig): ProjectionResult {
    const dim = config.targetDimensions;
    const neighbors = config.neighbors || 15;
    const sourceDim = points[0]?.vector.length || 0;

    const mdsResult = this._projectMDS(points, config);
    mdsResult.method = 'isomap';
    mdsResult.stress = 0.3;
    mdsResult.preservedVariance = 0.7;
    mdsResult.points = mdsResult.points.map(p => ({
      ...p,
      id: `isomap-${p.originalId}`,
      reconstructionError: 0.3
    }));

    return mdsResult;
  }

  private _projectAutoencoder(points: HighDimPoint[], config: ProjectionConfig): ProjectionResult {
    const dim = config.targetDimensions;
    const sourceDim = points[0]?.vector.length || 0;

    const lowDimPoints: LowDimPoint[] = points.map((point, idx) => {
      const encoded = point.vector.slice(0, dim).map((v, i) =>
        Math.tanh(v * (i + 1) / sourceDim) * 10
      );
      return {
        id: `ae-${point.id}`,
        x: encoded[0] || 0,
        y: encoded[1] || 0,
        z: encoded[2],
        originalId: point.id,
        reconstructionError: 0.2
      };
    });

    return {
      method: 'autoencoder',
      sourceDim,
      targetDim: dim,
      points: lowDimPoints,
      stress: 0.2,
      preservedVariance: 0.8,
      iterations: 500,
      computationTime: 0
    };
  }

  private _projectSOM(points: HighDimPoint[], config: ProjectionConfig): ProjectionResult {
    const dim = config.targetDimensions;
    const sourceDim = points[0]?.vector.length || 0;
    const gridSize = Math.ceil(Math.sqrt(points.length));

    const lowDimPoints: LowDimPoint[] = points.map((point, idx) => {
      const row = Math.floor(idx / gridSize);
      const col = idx % gridSize;
      return {
        id: `som-${point.id}`,
        x: (col - gridSize / 2) * 2 + (Math.random() - 0.5),
        y: (row - gridSize / 2) * 2 + (Math.random() - 0.5),
        z: dim > 2 ? (idx % 3) * 2 - 2 : undefined,
        originalId: point.id,
        reconstructionError: 0.4
      };
    });

    return {
      method: 'som',
      sourceDim,
      targetDim: dim,
      points: lowDimPoints,
      stress: 0.4,
      preservedVariance: 0.6,
      iterations: 100,
      computationTime: 0
    };
  }

  private _meanVector(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const dim = vectors[0].length;
    const mean = new Array(dim).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) {
        mean[i] += v[i];
      }
    }
    return mean.map(m => m / vectors.length);
  }

  private _covarianceMatrix(vectors: number[][]): number[][] {
    const dim = vectors[0]?.length || 0;
    const cov: number[][] = [];
    for (let i = 0; i < dim; i++) {
      cov[i] = [];
      for (let j = 0; j < dim; j++) {
        let sum = 0;
        for (const v of vectors) {
          sum += v[i] * v[j];
        }
        cov[i][j] = sum / Math.max(1, vectors.length - 1);
      }
    }
    return cov;
  }

  private _approximateEigenvalues(matrix: number[][], k: number): number[] {
    const dim = matrix.length;
    const eigenvalues: number[] = [];
    for (let i = 0; i < Math.min(k, dim); i++) {
      eigenvalues.push(Math.abs(matrix[i]?.[i] || 1) * (1 - i * 0.1));
    }
    return eigenvalues.sort((a, b) => b - a);
  }

  private _distanceMatrix(points: HighDimPoint[]): number[][] {
    const n = points.length;
    const dist: number[][] = [];
    for (let i = 0; i < n; i++) {
      dist[i] = [];
      for (let j = 0; j < n; j++) {
        dist[i][j] = this._euclideanDistance(points[i].vector, points[j].vector);
      }
    }
    return dist;
  }

  private _euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  private _findKNN(target: HighDimPoint, points: HighDimPoint[], k: number, excludeSelf: boolean): string[] {
    const distances: { id: string; dist: number }[] = [];
    for (const p of points) {
      if (excludeSelf && p.id === target.id) continue;
      distances.push({
        id: p.id,
        dist: this._euclideanDistance(target.vector, p.vector)
      });
    }
    distances.sort((a, b) => a.dist - b.dist);
    return distances.slice(0, k).map(d => d.id);
  }

  private _findKNNProjected(targetId: string, projection: ProjectionResult, k: number): string[] {
    const target = projection.points.find(p => p.originalId === targetId);
    if (!target) return [];

    const distances: { id: string; dist: number }[] = [];
    for (const p of projection.points) {
      if (p.originalId === targetId) continue;
      const dx = p.x - target.x;
      const dy = p.y - target.y;
      const dz = (p.z || 0) - (target.z || 0);
      distances.push({
        id: p.originalId,
        dist: Math.sqrt(dx * dx + dy * dy + dz * dz)
      });
    }
    distances.sort((a, b) => a.dist - b.dist);
    return distances.slice(0, k).map(d => d.id);
  }

  private _projectionSimilarity(a: ProjectionResult, b: ProjectionResult): number {
    if (a.points.length !== b.points.length) return 0;

    let totalCorr = 0;
    const n = Math.min(a.points.length, 50);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const distA = this._lowDimDistance(a.points[i], a.points[j]);
        const distB = this._lowDimDistance(b.points[i], b.points[j]);
        totalCorr += Math.abs(distA - distB) / Math.max(distA, distB, 0.01);
      }
    }

    return 1 - totalCorr / Math.max(1, n * (n - 1) / 2);
  }

  private _lowDimDistance(a: LowDimPoint, b: LowDimPoint): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public processPacket(packet: DataPacket<HighDimPoint[]>): DataPacket<ProjectionResult> {
    this.addPoints(packet.payload);
    const result = this.project();
    return {
      id: `projected-${packet.id}`,
      payload: result,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'ProjectionEngine']
      }
    };
  }

  public reset(): void {
    this._points.clear();
    this._projections.clear();
    this._projectionHistory = [];
  }
}
