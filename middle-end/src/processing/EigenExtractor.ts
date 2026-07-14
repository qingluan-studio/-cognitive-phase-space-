/**
 * 特征提取器模块：从数据矩阵中提取最本质的特征向量，
 * 通过幂迭代法求解主特征向量，实现维度约简与本质捕获。
 */

export interface EigenVector {
  id: string;
  values: number[];
  eigenvalue: number;
  varianceRatio: number;
}

export interface ExtractionResult {
  vectors: EigenVector[];
  totalVarianceCaptured: number;
  originalDim: number;
  reducedDim: number;
}

export class EigenExtractor {
  private _matrix: number[][] = [];
  private _results: ExtractionResult[] = [];
  private _extractedVectors: Map<string, EigenVector> = new Map();
  private _maxIterations = 50;
  private _tolerance = 1e-4;

  setMatrix(matrix: number[][]): void {
    this._matrix = matrix.map(row => [...row]);
  }

  setMaxIterations(n: number): void {
    this._maxIterations = Math.max(1, n);
  }

  setTolerance(t: number): void {
    this._tolerance = Math.max(0, t);
  }

  extract(topK = 3): ExtractionResult {
    if (this._matrix.length === 0) {
      return { vectors: [], totalVarianceCaptured: 0, originalDim: 0, reducedDim: 0 };
    }

    const dim = this._matrix[0].length;
    const k = Math.min(topK, dim);
    const covariance = this._covariance();
    const vectors: EigenVector[] = [];
    let remainingMatrix = covariance.map(row => [...row]);
    let totalVariance = 0;
    for (let i = 0; i < dim; i++) totalVariance += covariance[i][i];

    for (let i = 0; i < k; i++) {
      const { vector, eigenvalue } = this._powerIteration(remainingMatrix);
      const varianceRatio = totalVariance === 0 ? 0 : eigenvalue / totalVariance;
      vectors.push({
        id: `eigen-${i}`,
        values: vector,
        eigenvalue,
        varianceRatio,
      });
      remainingMatrix = this._deflate(remainingMatrix, vector, eigenvalue);
    }

    const captured = vectors.reduce((s, v) => s + v.varianceRatio, 0);
    const result: ExtractionResult = {
      vectors,
      totalVarianceCaptured: captured,
      originalDim: dim,
      reducedDim: k,
    };
    this._results.push(result);
    vectors.forEach(v => this._extractedVectors.set(v.id, v));
    return result;
  }

  private _covariance(): number[][] {
    const n = this._matrix.length;
    const dim = this._matrix[0]?.length ?? 0;
    const means = new Array(dim).fill(0);
    for (const row of this._matrix) {
      for (let j = 0; j < dim; j++) means[j] += row[j] / n;
    }
    const cov: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (const row of this._matrix) {
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
          cov[i][j] += (row[i] - means[i]) * (row[j] - means[j]) / n;
        }
      }
    }
    return cov;
  }

  private _powerIteration(matrix: number[][]): { vector: number[]; eigenvalue: number } {
    const dim = matrix.length;
    let vector = new Array(dim).fill(0).map(() => Math.random());
    vector = this._normalize(vector);
    let eigenvalue = 0;

    for (let iter = 0; iter < this._maxIterations; iter++) {
      const newVector = this._multiply(matrix, vector);
      const norm = this._norm(newVector);
      if (norm < this._tolerance) break;
      eigenvalue = this._dot(vector, newVector);
      const normalized = this._normalize(newVector);
      const diff = this._norm(normalized.map((v, i) => v - vector[i]));
      vector = normalized;
      if (diff < this._tolerance) break;
    }
    return { vector, eigenvalue };
  }

  private _deflate(matrix: number[][], vector: number[], eigenvalue: number): number[][] {
    const dim = matrix.length;
    return matrix.map((row, i) =>
      row.map((val, j) => val - eigenvalue * vector[i] * vector[j])
    );
  }

  private _multiply(m: number[][], v: number[]): number[] {
    return m.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
  }

  private _normalize(v: number[]): number[] {
    const n = this._norm(v);
    return n === 0 ? v : v.map(x => x / n);
  }

  private _norm(v: number[]): number {
    return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  }

  private _dot(a: number[], b: number[]): number {
    return a.reduce((s, x, i) => s + x * b[i], 0);
  }

  project(data: number[], vectorId: string): number | undefined {
    const vector = this._extractedVectors.get(vectorId);
    if (!vector) return undefined;
    return this._dot(data, vector.values);
  }

  averageVarianceCaptured(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.totalVarianceCaptured, 0) / this._results.length;
  }

  reset(): void {
    this._matrix = [];
    this._results = [];
    this._extractedVectors.clear();
  }

  get matrixRows(): number {
    return this._matrix.length;
  }

  get extractedCount(): number {
    return this._extractedVectors.size;
  }

  get resultCount(): number {
    return this._results.length;
  }
}
