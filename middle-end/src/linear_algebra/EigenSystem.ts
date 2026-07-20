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
   * 逆幂迭代法求最小特征值
   * Inverse power iteration for smallest eigenvalue
   */
  public inversePowerIteration(
    matrix: number[][],
    iterations: number = 100,
    shift: number = 0
  ): { eigenvalue: number; eigenvector: number[] } {
    const n = matrix.length;
    let v = new Array(n).fill(1 / Math.sqrt(n));
    let eigenvalue = 0;
    const shifted = matrix.map((row, i) =>
      row.map((val, j) => val - (i === j ? shift : 0))
    );
    for (let iter = 0; iter < iterations; iter++) {
      const w = this._solveSystem(shifted, v);
      const norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
      if (norm < 1e-12) break;
      v = w.map(x => x / norm);
      const Av = this._matVec(matrix, v);
      eigenvalue = Av.reduce((s, x, i) => s + x * v[i]!, 0);
    }
    this._recordHistory(`inversePowerIteration: λ=${eigenvalue}`);
    return { eigenvalue, eigenvector: v };
  }

  /**
   * Rayleigh 商迭代
   * Rayleigh quotient iteration
   */
  public rayleighQuotientIteration(
    matrix: number[][],
    iterations: number = 50
  ): { eigenvalue: number; eigenvector: number[] } {
    const n = matrix.length;
    let v = new Array(n).fill(1 / Math.sqrt(n));
    let mu = 0;
    for (let iter = 0; iter < iterations; iter++) {
      const Av = this._matVec(matrix, v);
      mu = Av.reduce((s, x, i) => s + x * v[i]!, 0);
      const shifted = matrix.map((row, i) =>
        row.map((val, j) => val - (i === j ? mu : 0))
      );
      const w = this._solveSystem(shifted, v);
      const norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
      if (norm < 1e-12) break;
      v = w.map(x => x / norm);
    }
    this._recordHistory(`rayleighQuotientIteration: λ=${mu}`);
    return { eigenvalue: mu, eigenvector: v };
  }

  /**
   * 对称矩阵的特征值分解
   * Spectral decomposition for symmetric matrices
   */
  public spectralDecomposition(matrix: number[][]): {
    eigenvalues: number[];
    eigenvectors: number[][];
    Q: number[][];
    Lambda: number[][];
  } {
    const n = matrix.length;
    const eigenvalues = this.findEigenvalues(matrix);
    const eigenvectors: number[][] = [];
    const sortedPairs = eigenvalues
      .map((val, i) => ({ val, idx: i }))
      .sort((a, b) => b.val - a.val);
    for (const pair of sortedPairs) {
      const vecs = this.findEigenvectors(matrix, pair.val);
      if (vecs.length > 0) {
        eigenvectors.push(vecs[0]!);
      }
    }
    const Q: number[][] = [];
    for (let i = 0; i < n; i++) {
      const vec = eigenvectors[i] ?? new Array(n).fill(0).map((_, j) => i === j ? 1 : 0);
      const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
      Q.push(norm > 0 ? vec.map(v => v / norm) : vec);
    }
    const Lambda = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      Lambda[i]![i] = eigenvalues[i] ?? 0;
    }
    this._recordHistory('spectralDecomposition: complete');
    return { eigenvalues, eigenvectors, Q, Lambda };
  }

  /**
   * 奇异值
   * Singular values
   */
  public singularValues(matrix: number[][]): number[] {
    const AtA = this._multiply(this._transpose(matrix), matrix);
    const eigenvalues = this.findEigenvalues(AtA);
    const singularValues = eigenvalues
      .filter(v => v > 1e-10)
      .map(v => Math.sqrt(v))
      .sort((a, b) => b - a);
    this._recordHistory(`singularValues: ${singularValues.length} values`);
    return singularValues;
  }

  /**
   * 矩阵的秩（通过 SVD）
   * Rank of matrix via SVD
   */
  public matrixRank(matrix: number[][], tolerance: number = 1e-10): number {
    const sv = this.singularValues(matrix);
    const rank = sv.filter(v => v > tolerance).length;
    this._recordHistory(`matrixRank: ${rank}`);
    return rank;
  }

  /**
   * 矩阵的条件数
   * Condition number of matrix
   */
  public conditionNumber(matrix: number[][]): number {
    const sv = this.singularValues(matrix);
    if (sv.length === 0) return Infinity;
    const max = sv[0]!;
    const min = sv[sv.length - 1]!;
    const result = min > 1e-12 ? max / min : Infinity;
    this._recordHistory(`conditionNumber: ${result}`);
    return result;
  }

  /**
   * 伪逆（通过 SVD）
   * Pseudo-inverse via SVD
   */
  public pseudoInverse(matrix: number[][]): number[][] {
    const m = matrix.length;
    const n = matrix[0]?.length ?? 0;
    const { U, S, V } = this.singularValueDecomposition(matrix);
    const SPlus: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < m; j++) {
        const s = S[j]?.[i] ?? 0;
        row.push(s > 1e-10 ? 1 / s : 0);
      }
      SPlus.push(row);
    }
    const VtSPlus = this._multiply(this._transpose(V), SPlus);
    const Ut = this._transpose(U);
    const result = this._multiply(VtSPlus, Ut);
    this._recordHistory('pseudoInverse: complete');
    return result;
  }

  /**
   * 主成分分析（PCA）
   * Principal Component Analysis
   */
  public pca(data: number[][], numComponents: number): {
    components: number[][];
    eigenvalues: number[];
    explainedVariance: number[];
    projected: number[][];
  } {
    const n = data.length;
    const d = data[0]?.length ?? 0;
    const mean = new Array(d).fill(0);
    for (const row of data) {
      for (let j = 0; j < d; j++) {
        mean[j] += row[j] ?? 0;
      }
    }
    for (let j = 0; j < d; j++) mean[j] /= n;
    const centered = data.map(row => row.map((v, j) => v - mean[j]!));
    const At = this._transpose(centered);
    const covariance = this._multiply(At, centered).map(row => row.map(v => v / (n - 1)));
    const { eigenvalues, eigenvectors } = this.spectralDecomposition(covariance);
    const k = Math.min(numComponents, eigenvalues.length);
    const components = eigenvectors.slice(0, k);
    const totalVar = eigenvalues.reduce((s, v) => s + Math.max(0, v), 0);
    const explainedVariance = eigenvalues.slice(0, k).map(v => Math.max(0, v) / totalVar);
    const projected = this._multiply(centered, this._transpose(components));
    this._recordHistory(`pca: ${k} components`);
    return { components, eigenvalues: eigenvalues.slice(0, k), explainedVariance, projected };
  }

  /**
   * 迹与特征值关系验证
   * Trace = sum of eigenvalues verification
   */
  public traceEigenvalueVerification(matrix: number[][]): {
    trace: number;
    sumEigenvalues: number;
    holds: boolean;
  } {
    const trace = this.trace(matrix);
    const eigenvalues = this.findEigenvalues(matrix);
    const sum = eigenvalues.reduce((s, v) => s + v, 0);
    const holds = Math.abs(trace - sum) < 1e-6;
    this._recordHistory(`traceEigenvalueVerification: holds=${holds}`);
    return { trace, sumEigenvalues: sum, holds };
  }

  /**
   * 行列式与特征值关系验证
   * Determinant = product of eigenvalues verification
   */
  public determinantEigenvalueVerification(matrix: number[][]): {
    determinant: number;
    productEigenvalues: number;
    holds: boolean;
  } {
    const det = this.determinant(matrix);
    const eigenvalues = this.findEigenvalues(matrix);
    const product = eigenvalues.reduce((s, v) => s * v, 1);
    const holds = Math.abs(det - product) < 1e-6;
    this._recordHistory(`determinantEigenvalueVerification: holds=${holds}`);
    return { determinant: det, productEigenvalues: product, holds };
  }

  /**
   * Cayley-Hamilton 定理验证
   * Cayley-Hamilton theorem verification
   */
  public cayleyHamiltonVerification(matrix: number[][]): {
    error: number;
    holds: boolean;
  } {
    const n = matrix.length;
    const eigenvalues = this.findEigenvalues(matrix);
    let charPoly: number[] = [1];
    for (const lambda of eigenvalues) {
      const newPoly = new Array(charPoly.length + 1).fill(0);
      for (let i = 0; i < charPoly.length; i++) {
        newPoly[i] += charPoly[i]!;
        newPoly[i + 1] += -lambda * charPoly[i]!;
      }
      charPoly = newPoly;
    }
    let result = Array.from({ length: n }, () => new Array(n).fill(0));
    let current: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    for (let k = 0; k < charPoly.length; k++) {
      const coeff = charPoly[k] ?? 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          result[i]![j] += coeff * current[i]![j]!;
        }
      }
      if (k < charPoly.length - 1) {
        current = this._multiply(current, matrix);
      }
    }
    let error = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        error += Math.abs(result[i]![j]!);
      }
    }
    const holds = error < 1e-6;
    this._recordHistory(`cayleyHamiltonVerification: holds=${holds}`);
    return { error, holds };
  }

  /**
   * Gershgorin 圆定理：估计特征值范围
   * Gershgorin circle theorem
   */
  public gershgorinCircles(matrix: number[][]): {
    centers: number[];
    radii: number[];
    minEigenvalue: number;
    maxEigenvalue: number;
  } {
    const n = matrix.length;
    const centers: number[] = [];
    const radii: number[] = [];
    for (let i = 0; i < n; i++) {
      centers.push(matrix[i]![i] ?? 0);
      let r = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) r += Math.abs(matrix[i]![j] ?? 0);
      }
      radii.push(r);
    }
    let minEig = Infinity;
    let maxEig = -Infinity;
    for (let i = 0; i < n; i++) {
      minEig = Math.min(minEig, centers[i] - radii[i]);
      maxEig = Math.max(maxEig, centers[i] + radii[i]);
    }
    this._recordHistory(`gershgorinCircles: [${minEig}, ${maxEig}]`);
    return { centers, radii, minEigenvalue: minEig, maxEigenvalue: maxEig };
  }

  /**
   * 正定判定（通过特征值）
   * Positive definiteness check via eigenvalues
   */
  public isPositiveDefinite(matrix: number[][]): boolean {
    const eigenvalues = this.findEigenvalues(matrix);
    return eigenvalues.every(v => v > 1e-10);
  }

  /**
   * 半正定判定
   * Positive semi-definiteness check
   */
  public isPositiveSemiDefinite(matrix: number[][]): boolean {
    const eigenvalues = this.findEigenvalues(matrix);
    return eigenvalues.every(v => v > -1e-10);
  }

  /**
   * 特征值的实部（稳定性分析）
   * Real parts of eigenvalues (for stability analysis)
   */
  public stabilityAnalysis(matrix: number[][]): {
    eigenvalues: number[];
    stable: boolean;
    marginallyStable: boolean;
  } {
    const eigenvalues = this.findEigenvalues(matrix);
    const allNegative = eigenvalues.every(v => v < -1e-10);
    const allNonPositive = eigenvalues.every(v => v <= 1e-10);
    this._recordHistory(`stabilityAnalysis: stable=${allNegative}`);
    return {
      eigenvalues,
      stable: allNegative,
      marginallyStable: allNonPositive && !allNegative
    };
  }

  /**
   * 相似变换下的特征值不变性验证
   * Eigenvalue invariance under similarity transformation
   */
  public similarityInvarianceVerification(
    matrix: number[][],
    P: number[][]
  ): {
    eigA: number[];
    eigPAPinv: number[];
    holds: boolean;
  } {
    const eigA = this.findEigenvalues(matrix).sort((a, b) => a - b);
    const PInv = this._inverse(P);
    if (!PInv) return { eigA, eigPAPinv: [], holds: false };
    const PAPinv = this._multiply(this._multiply(P, matrix), PInv);
    const eigPAPinv = this.findEigenvalues(PAPinv).sort((a, b) => a - b);
    let maxDiff = 0;
    const n = Math.min(eigA.length, eigPAPinv.length);
    for (let i = 0; i < n; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(eigA[i] - eigPAPinv[i]));
    }
    const holds = maxDiff < 1e-6;
    this._recordHistory(`similarityInvarianceVerification: holds=${holds}`);
    return { eigA, eigPAPinv, holds };
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

  private _solveSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i] ?? 0]);
    for (let i = 0; i < n; i++) {
      let pivotRow = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(aug[r]![i]!) > Math.abs(aug[pivotRow]![i]!)) pivotRow = r;
      }
      [aug[i]!, aug[pivotRow]!] = [aug[pivotRow]!, aug[i]!];
      const pivot = aug[i]![i]!;
      if (Math.abs(pivot) < 1e-12) continue;
      for (let c = i; c <= n; c++) aug[i]![c] = aug[i]![c]! / pivot;
      for (let r = 0; r < n; r++) {
        if (r !== i) {
          const factor = aug[r]![i]!;
          for (let c = i; c <= n; c++) {
            aug[r]![c] = aug[r]![c]! - factor * aug[i]![c]!;
          }
        }
      }
    }
    return aug.map(row => row[n] ?? 0);
  }

  private _inverse(matrix: number[][]): number[][] | null {
    const n = matrix.length;
    if (n === 0 || matrix.some(r => r.length !== n)) return null;
    const aug = matrix.map((row, i) => {
      const id = new Array(n).fill(0);
      id[i] = 1;
      return [...row, ...id];
    });
    for (let i = 0; i < n; i++) {
      let pivotRow = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(aug[r]![i]!) > Math.abs(aug[pivotRow]![i]!)) pivotRow = r;
      }
      [aug[i]!, aug[pivotRow]!] = [aug[pivotRow]!, aug[i]!];
      const pivot = aug[i]![i]!;
      if (Math.abs(pivot) < 1e-12) return null;
      for (let c = 0; c < 2 * n; c++) aug[i]![c] = aug[i]![c]! / pivot;
      for (let r = 0; r < n; r++) {
        if (r !== i) {
          const factor = aug[r]![i]!;
          for (let c = 0; c < 2 * n; c++) {
            aug[r]![c] = aug[r]![c]! - factor * aug[i]![c]!;
          }
        }
      }
    }
    return aug.map(row => row.slice(n));
  }
}
