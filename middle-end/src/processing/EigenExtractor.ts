export interface EigenVector {
  id: string;
  values: number[];
  eigenvalue: number;
  varianceRatio: number;
  iterations: number;
}

export interface ExtractionResult {
  vectors: EigenVector[];
  totalVarianceCaptured: number;
  originalDim: number;
  reducedDim: number;
  converged: boolean;
}

export class EigenExtractor {
  private _matrix: number[][] = [];
  private _results: ExtractionResult[] = [];
  private _extractedVectors: Map<string, EigenVector> = new Map();
  private _maxIterations = 50;
  private _tolerance = 1e-6;
  private _shift = 0;

  setMatrix(matrix: number[][]): void {
    this._matrix = matrix.map(row => [...row]);
  }

  setMaxIterations(n: number): void { this._maxIterations = Math.max(1, n); }
  setTolerance(t: number): void { this._tolerance = Math.max(0, t); }
  setShift(s: number): void { this._shift = s; }

  extract(topK = 3): ExtractionResult {
    if (this._matrix.length === 0) {
      return { vectors: [], totalVarianceCaptured: 0, originalDim: 0, reducedDim: 0, converged: false };
    }
    const dim = this._matrix[0].length, k = Math.min(topK, dim);
    const covariance = this._covariance();
    const vectors: EigenVector[] = [];
    let remaining = covariance.map(row => [...row]);
    let totalVariance = 0, allConverged = true;
    for (let i = 0; i < dim; i++) totalVariance += covariance[i][i];

    for (let i = 0; i < k; i++) {
      const { vector, eigenvalue, iterations, converged } = this._shiftedPowerIteration(remaining);
      if (!converged) allConverged = false;
      vectors.push({
        id: `eigen-${i}`, values: vector, eigenvalue,
        varianceRatio: totalVariance === 0 ? 0 : eigenvalue / totalVariance, iterations,
      });
      remaining = this._hotellingDeflate(remaining, vector, eigenvalue);
    }

    const captured = vectors.reduce((s, v) => s + v.varianceRatio, 0);
    const result: ExtractionResult = {
      vectors, totalVarianceCaptured: captured, originalDim: dim, reducedDim: k, converged: allConverged,
    };
    this._results.push(result);
    vectors.forEach(v => this._extractedVectors.set(v.id, v));
    return result;
  }

  private _covariance(): number[][] {
    const n = this._matrix.length, dim = this._matrix[0]?.length ?? 0;
    const means = new Array(dim).fill(0);
    for (const row of this._matrix)
      for (let j = 0; j < dim; j++) means[j] += row[j] / n;
    const cov: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (const row of this._matrix)
      for (let i = 0; i < dim; i++)
        for (let j = 0; j < dim; j++)
          cov[i][j] += (row[i] - means[i]) * (row[j] - means[j]) / n;
    return cov;
  }

  private _shiftedPowerIteration(matrix: number[][]): {
    vector: number[]; eigenvalue: number; iterations: number; converged: boolean;
  } {
    const dim = matrix.length;
    const shifted = matrix.map((row, i) => row.map((val, j) => val + (i === j ? this._shift : 0)));
    let vector = this._normalize(new Array(dim).fill(0).map(() => Math.random() - 0.5));
    let eigenvalue = 0, iter = 0;
    let converged = false;

    for (; iter < this._maxIterations; iter++) {
      const newVector = this._matVecMul(shifted, vector);
      const norm = this._norm(newVector);
      if (norm < this._tolerance) break;
      const normalized = newVector.map(v => v / norm);
      const newEigenvalue = this._dot(vector, newVector);
      const diff = this._norm(normalized.map((v, i) => v - vector[i]));
      vector = normalized;
      eigenvalue = newEigenvalue - this._shift;
      if (diff < this._tolerance) { converged = true; break; }
    }
    return { vector, eigenvalue, iterations: iter + 1, converged };
  }

  private _hotellingDeflate(matrix: number[][], vector: number[], eigenvalue: number): number[][] {
    const dim = matrix.length;
    const result = matrix.map(row => [...row]);
    for (let i = 0; i < dim; i++)
      for (let j = 0; j < dim; j++)
        result[i][j] -= eigenvalue * vector[i] * vector[j];
    return result;
  }

  inverseIterate(targetEigenvalue: number, initialGuess?: number[]): {
    vector: number[]; eigenvalue: number; iterations: number;
  } | undefined {
    if (this._matrix.length === 0) return undefined;
    const covariance = this._covariance();
    const dim = covariance[0].length, mu = targetEigenvalue;
    let vector = this._normalize(initialGuess ?? new Array(dim).fill(0).map(() => Math.random()));
    let eigenvalue = 0, iter = 0;

    for (; iter < this._maxIterations; iter++) {
      const shifted = covariance.map((row, i) => row.map((val, j) => val - (i === j ? mu : 0)));
      const solved = this._solveJacobi(shifted, vector);
      if (!solved) break;
      const norm = this._norm(solved);
      if (norm < this._tolerance) break;
      const normalized = solved.map(v => v / norm);
      eigenvalue = this._dot(normalized, this._matVecMul(covariance, normalized));
      const diff = this._norm(normalized.map((v, i) => v - vector[i]));
      vector = normalized;
      if (diff < this._tolerance) break;
    }
    return { vector, eigenvalue, iterations: iter + 1 };
  }

  private _solveJacobi(A: number[][], b: number[]): number[] | undefined {
    const n = A.length;
    let x = new Array(n).fill(0);
    for (let iter = 0; iter < 100; iter++) {
      const newX = new Array(n).fill(0);
      let maxDiff = 0;
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) if (j !== i) sum += A[i][j] * x[j];
        if (Math.abs(A[i][i]) < 1e-12) return undefined;
        newX[i] = (b[i] - sum) / A[i][i];
        maxDiff = Math.max(maxDiff, Math.abs(newX[i] - x[i]));
      }
      x = newX;
      if (maxDiff < this._tolerance) break;
    }
    return x;
  }

  private _matVecMul(m: number[][], v: number[]): number[] {
    return m.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
  }

  private _normalize(v: number[]): number[] {
    const n = this._norm(v);
    return n === 0 ? v : v.map(x => x / n);
  }

  private _norm(v: number[]): number { return Math.sqrt(v.reduce((s, x) => s + x * x, 0)); }

  private _dot(a: number[], b: number[]): number { return a.reduce((s, x, i) => s + x * b[i], 0); }

  project(data: number[], vectorId: string): number | undefined {
    const vector = this._extractedVectors.get(vectorId);
    return vector ? this._dot(data, vector.values) : undefined;
  }

  projectAll(data: number[]): number[] {
    const result: number[] = [];
    for (let i = 0; ; i++) {
      const v = this._extractedVectors.get(`eigen-${i}`);
      if (!v) break;
      result.push(this._dot(data, v.values));
    }
    return result;
  }

  averageVarianceCaptured(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.totalVarianceCaptured, 0) / this._results.length;
  }

  reset(): void {
    this._matrix = [];
    this._results = [];
    this._extractedVectors.clear();
    this._shift = 0;
  }

  get matrixRows(): number { return this._matrix.length; }
  get extractedCount(): number { return this._extractedVectors.size; }
  get resultCount(): number { return this._results.length; }
  get shift(): number { return this._shift; }
}
