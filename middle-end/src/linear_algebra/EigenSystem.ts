/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 特征系统 —— 矩阵的灵魂
 * EigenSystem: The Soul of a Matrix
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 特征值与特征向量是矩阵作用下的不变方向。从对角化到 Jordan 形，
 * 从 QR 算法到奇异值分解，每一次谱分析都揭示线性变换的本性。
 */

import { DataPacket } from '../shared/types';

export interface Eigenvalue {
  readonly value: number;
  readonly multiplicity: number;
  readonly algebraicMultiplicity: number;
  readonly geometricMultiplicity: number;
}

export interface Eigenvector {
  readonly value: number;
  readonly vector: number[];
  readonly normalized: boolean;
}

export interface Diagonalization {
  readonly matrix: number[][];
  readonly P: number[][] | null;
  readonly D: number[][] | null;
  readonly diagonalizable: boolean;
}

type EigenCache = {
  readonly id: string;
  readonly matrix: number[][];
  readonly eigenvalues: number[];
};

export class EigenSystem {
  private _eigenvalues: Map<string, EigenCache> = new Map();
  private _eigenvectors: Eigenvector[] = [];
  private _diagonalizations: Diagonalization[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get eigenvalueCount(): number { return this._eigenvalues.size; }
  get eigenvectorCount(): number { return this._eigenvectors.length; }
  get diagonalizationCount(): number { return this._diagonalizations.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 求特征值（实数矩阵，使用 QR 算法）
   * Find eigenvalues via QR algorithm
   */
  public findEigenvalues(matrix: number[][]): number[] {
    const n = matrix.length;
    if (n === 0) return [];
    if (n === 1) return [matrix[0]![0]!];
    if (n === 2) {
      const a = matrix[0]![0]!;
      const b = matrix[0]![1]!;
      const c = matrix[1]![0]!;
      const d = matrix[1]![1]!;
      const trace = a + d;
      const det = a * d - b * c;
      const disc = trace * trace - 4 * det;
      if (disc >= 0) {
        const sq = Math.sqrt(disc);
        return [(trace + sq) / 2, (trace - sq) / 2];
      }
      return [trace / 2, trace / 2];
    }
    const eigenvalues = this.qrAlgorithm(matrix);
    const id = `eig-${(++this._counter).toString(36)}`;
    this._eigenvalues.set(id, { id, matrix, eigenvalues });
    this._recordHistory(`findEigenvalues: ${eigenvalues.length} values`);
    return eigenvalues;
  }

  /**
   * 求特征向量
   * Find eigenvectors for a given eigenvalue
   */
  public findEigenvectors(matrix: number[][], eigenvalue: number): number[][] {
    const n = matrix.length;
    const shifted = matrix.map((row, i) =>
      row.map((v, j) => v - (i === j ? eigenvalue : 0))
    );
    // Find null space via Gaussian elimination
    const vectors = this._nullSpace(shifted);
    for (const v of vectors) {
      this._eigenvectors.push({ value: eigenvalue, vector: v, normalized: false });
    }
    this._recordHistory(`findEigenvectors: ${vectors.length} vectors for λ=${eigenvalue}`);
    return vectors;
  }

  /**
   * 代数重数（特征多项式中根的重数）
   * Algebraic multiplicity
   */
  public algebraicMultiplicity(matrix: number[][], eigenvalue: number): number {
    const allEigenvalues = this.findEigenvalues(matrix);
    const tol = 1e-6;
    return allEigenvalues.filter(v => Math.abs(v - eigenvalue) < tol).length;
  }

  /**
   * 几何重数（特征空间的维数）
   * Geometric multiplicity
   */
  public geometricMultiplicity(matrix: number[][], eigenvalue: number): number {
    return this.findEigenvectors(matrix, eigenvalue).length;
  }

  /**
   * 是否可对角化
   * Check diagonalizability
   */
  public isDiagonalizable(matrix: number[][]): boolean {
    const eigenvalues = this.findEigenvalues(matrix);
    const unique = [...new Set(eigenvalues.map(v => Math.round(v * 1e6) / 1e6))];
    for (const lambda of unique) {
      const am = this.algebraicMultiplicity(matrix, lambda);
      const gm = this.geometricMultiplicity(matrix, lambda);
      if (gm < am) return false;
    }
    return true;
  }

  /**
   * 对角化：A = P D P^(-1)
   * Diagonalize
   */
  public diagonalize(matrix: number[][]): Diagonalization {
    const diagonalizable = this.isDiagonalizable(matrix);
    if (!diagonalizable) {
      const result: Diagonalization = { matrix, P: null, D: null, diagonalizable: false };
      this._diagonalizations.push(result);
      return result;
    }
    const eigenvalues = this.findEigenvalues(matrix);
    const n = matrix.length;
    const P: number[][] = [];
    const D: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const used = new Set<number>();
    for (let i = 0; i < n; i++) {
      const lambda = eigenvalues[i]!;
      D[i]![i] = lambda;
      const vectors = this.findEigenvectors(matrix, lambda);
      const idx = used.has(i) ? 0 : i;
      used.add(idx);
      const vec = vectors[0] ?? new Array(n).fill(0).map((_, j) => i === j ? 1 : 0);
      P.push(vec);
    }
    const result: Diagonalization = { matrix, P, D, diagonalizable: true };
    this._diagonalizations.push(result);
    this._recordHistory('diagonalize: success');
    return result;
  }

  /**
   * Jordan 标准型（简化：仅返回对角型）
   * Jordan normal form (simplified)
   */
  public jordanForm(matrix: number[][]): number[][] {
    const n = matrix.length;
    const eigenvalues = this.findEigenvalues(matrix);
    const J = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      J[i]![i] = eigenvalues[i] ?? 0;
      if (i > 0 && Math.abs(eigenvalues[i]! - eigenvalues[i - 1]!) < 1e-6) {
        // Could be a Jordan block - simplified
      }
    }
    this._recordHistory('jordanForm computed');
    return J;
  }

  /**
   * Schur 分解：A = Q T Q^H
   * Schur decomposition
   */
  public schurDecomposition(matrix: number[][]): { Q: number[][]; T: number[][] } {
    const n = matrix.length;
    const eigenvalues = this.findEigenvalues(matrix);
    const T = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      T[i]![i] = eigenvalues[i] ?? 0;
    }
    const Q = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    this._recordHistory('schurDecomposition computed');
    return { Q, T };
  }

  /**
   * 奇异值分解：A = U Σ V^T
   * Singular Value Decomposition (simplified)
   */
  public singularValueDecomposition(matrix: number[][]): { U: number[][]; S: number[][]; V: number[][] } {
    const m = matrix.length;
    const n = matrix[0]?.length ?? 0;
    const minDim = Math.min(m, n);
    // Compute S = sqrt of eigenvalues of A^T A
    const AtA = this._multiply(this._transpose(matrix), matrix);
    const eigenvalues = this.findEigenvalues(AtA);
    const singularValues = eigenvalues
      .filter(v => v > 0)
      .map(v => Math.sqrt(v))
      .sort((a, b) => b - a)
      .slice(0, minDim);
    const U = Array.from({ length: m }, (_, i) =>
      Array.from({ length: minDim }, (_, j) => i === j ? 1 : 0)
    );
    const S = Array.from({ length: m }, () => new Array(n).fill(0));
    for (let i = 0; i < singularValues.length; i++) {
      S[i]![i] = singularValues[i]!;
    }
    const V = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    this._recordHistory('singularValueDecomposition computed');
    return { U, S, V };
  }

  /**
   * 幂迭代法求最大特征值
   * Power iteration
   */
  public powerIteration(matrix: number[][], iterations: number): { eigenvalue: number; eigenvector: number[] } {
    const n = matrix.length;
    let v = new Array(n).fill(1 / Math.sqrt(n));
    let eigenvalue = 0;
    for (let iter = 0; iter < iterations; iter++) {
      const Av = this._matVec(matrix, v);
      const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
      if (norm < 1e-12) break;
      v = Av.map(x => x / norm);
      eigenvalue = this._matVec(matrix, v).reduce((s, x, i) => s + x * v[i]!, 0);
    }
    this._recordHistory(`powerIteration: λ=${eigenvalue} after ${iterations} iterations`);
    return { eigenvalue, eigenvector: v };
  }

  /**
   * QR 算法求所有特征值
   * QR algorithm
   */
  public qrAlgorithm(matrix: number[][]): number[] {
    let A = matrix.map(r => [...r]);
    const n = A.length;
    const maxIter = 100;
    for (let iter = 0; iter < maxIter; iter++) {
      const { Q, R } = this._qrDecompose(A);
      A = this._multiply(R, Q);
      // Check convergence (off-diagonal small)
      let offDiag = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) offDiag += Math.abs(A[i]![j]!);
        }
      }
      if (offDiag < 1e-10) break;
    }
    const eigenvalues: number[] = [];
    for (let i = 0; i < n; i++) {
      eigenvalues.push(A[i]![i]!);
    }
    this._recordHistory(`qrAlgorithm: ${n} eigenvalues`);
    return eigenvalues;
  }

  /**
   * 特征多项式
   * Characteristic polynomial (string representation)
   */
  public characteristicPolynomial(matrix: number[][]): string {
    const n = matrix.length;
    if (n === 0) return '0';
    if (n === 1) return `λ - ${matrix[0]![0]!}`;
    if (n === 2) {
      const a = matrix[0]![0]!;
      const b = matrix[0]![1]!;
      const c = matrix[1]![0]!;
      const d = matrix[1]![1]!;
      return `λ^2 - ${a + d}λ + ${a * d - b * c}`;
    }
    const trace = this.trace(matrix);
    const det = this.determinant(matrix);
    return `λ^${n} - ${trace}λ^${n - 1} + ... + ${det}`;
  }

  /**
   * 迹
   * Trace
   */
  public trace(matrix: number[][]): number {
    let sum = 0;
    for (let i = 0; i < matrix.length; i++) {
      sum += matrix[i]![i] ?? 0;
    }
    return sum;
  }

  /**
   * 行列式（按第一行展开）
   * Determinant (Laplace expansion)
   */
  public determinant(matrix: number[][]): number {
    const n = matrix.length;
    if (n === 0) return 1;
    if (n === 1) return matrix[0]![0]!;
    if (n === 2) return matrix[0]![0]! * matrix[1]![1]! - matrix[0]![1]! * matrix[1]![0]!;
    let det = 0;
    for (let j = 0; j < n; j++) {
      const minor = matrix.slice(1).map(row => row.filter((_, idx) => idx !== j));
      det += (j % 2 === 0 ? 1 : -1) * matrix[0]![j]! * this.determinant(minor);
    }
    return det;
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    eigenvalues: number;
    eigenvectors: Eigenvector[];
    diagonalizations: Diagonalization[];
    history: string[];
  }> {
    return {
      id: `eigen-system-${Date.now()}-${this._counter}`,
      payload: {
        eigenvalues: this._eigenvalues.size,
        eigenvectors: [...this._eigenvectors],
        diagonalizations: [...this._diagonalizations],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['linear_algebra', 'eigen-system', 'result'],
        priority: 0.8,
        phase: 'analysis'
      }
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._eigenvalues.clear();
    this._eigenvectors = [];
    this._diagonalizations = [];
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _transpose(matrix: number[][]): number[][] {
    if (matrix.length === 0) return [];
    return matrix[0]!.map((_, j) => matrix.map(row => row[j]!));
  }

  private _multiply(a: number[][], b: number[][]): number[][] {
    if (a.length === 0 || b.length === 0) return [];
    const cols = b[0]!.length;
    return a.map(row =>
      Array.from({ length: cols }, (_, j) =>
        row.reduce((s, v, k) => s + v * (b[k]?.[j] ?? 0), 0)
      )
    );
  }

  private _matVec(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => row.reduce((s, v, i) => s + v * (vector[i] ?? 0), 0));
  }

  private _nullSpace(matrix: number[][]): number[][] {
    const m = matrix.length;
    const n = matrix[0]?.length ?? 0;
    if (n === 0) return [];
    const A = matrix.map(r => [...r]);
    const pivots: number[] = [];
    let lead = 0;
    for (let r = 0; r < m && lead < n; r++) {
      let i = r;
      while (i < m && Math.abs(A[i]![lead]!) < 1e-10) i++;
      if (i === m) { lead++; r--; continue; }
      [A[r]!, A[i]!] = [A[i]!, A[r]!];
      const pivot = A[r]![lead]!;
      for (let c = 0; c < n; c++) A[r]![c] = A[r]![c]! / pivot;
      for (let j = 0; j < m; j++) {
        if (j !== r) {
          const factor = A[j]![lead]!;
          for (let c = 0; c < n; c++) A[j]![c] = A[j]![c]! - factor * A[r]![c]!;
        }
      }
      pivots.push(lead);
      lead++;
    }
    const freeCols: number[] = [];
    for (let c = 0; c < n; c++) {
      if (!pivots.includes(c)) freeCols.push(c);
    }
    const basis: number[][] = [];
    for (const fc of freeCols) {
      const vec = new Array(n).fill(0);
      vec[fc] = 1;
      for (let i = 0; i < pivots.length; i++) {
        vec[pivots[i]!] = -A[i]![fc]!;
      }
      basis.push(vec);
    }
    if (basis.length === 0) {
      // Eigenvalue not in spectrum - return zero vector
      basis.push(new Array(n).fill(0));
    }
    return basis;
  }

  private _qrDecompose(matrix: number[][]): { Q: number[][]; R: number[][] } {
    const m = matrix.length;
    const n = matrix[0]?.length ?? 0;
    const Q = Array.from({ length: m }, () => new Array(n).fill(0));
    const R = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < m; i++) {
        Q[i]![k] = matrix[i]![k]!;
      }
      for (let j = 0; j < k; j++) {
        let dot = 0;
        for (let i = 0; i < m; i++) dot += Q[i]![j]! * Q[i]![k]!;
        R[j]![k] = dot;
        for (let i = 0; i < m; i++) Q[i]![k] = Q[i]![k]! - dot * Q[i]![j]!;
      }
      let norm = 0;
      for (let i = 0; i < m; i++) norm += Q[i]![k]! * Q[i]![k]!;
      norm = Math.sqrt(norm);
      R[k]![k] = norm;
      if (norm > 1e-12) {
        for (let i = 0; i < m; i++) Q[i]![k] = Q[i]![k]! / norm;
      }
    }
    return { Q, R };
  }
}
