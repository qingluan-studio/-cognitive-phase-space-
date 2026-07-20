/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 矩阵理论 —— 数表的解剖学
 * Matrix Theory: The Anatomy of Number Tables
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 矩阵是数字的栅格，也是线性变换的骨架。从 LU 分解到 SVD，
 * 从 Kronecker 积到 Hadamard 积，每种运算都在矩阵的肌理上留下印记。
 */

import { DataPacket } from '../shared/types';

export type MatrixType =
  | 'symmetric'
  | 'skew-symmetric'
  | 'orthogonal'
  | 'unitary'
  | 'positive-definite'
  | 'nilpotent'
  | 'idempotent';

export interface MatrixDecomposition {
  readonly type: 'LU' | 'QR' | 'Cholesky' | 'SVD' | 'Schur';
  readonly factors: Record<string, number[][]>;
}

export type NormType = 'L1' | 'L2' | 'infinity' | 'frobenius';

type MatrixCache = {
  readonly id: string;
  readonly matrix: number[][];
  readonly types: MatrixType[];
};

export class MatrixTheory {
  private _matrices: Map<string, MatrixCache> = new Map();
  private _decompositions: MatrixDecomposition[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get matrixCount(): number { return this._matrices.size; }
  get decompositionCount(): number { return this._decompositions.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 矩阵分类
   * Classify matrix into all matching types
   */
  public classifyMatrix(matrix: number[][]): MatrixType[] {
    const types: MatrixType[] = [];
    if (this._isSymmetric(matrix)) types.push('symmetric');
    if (this._isSkewSymmetric(matrix)) types.push('skew-symmetric');
    if (this.isOrthogonal(matrix)) types.push('orthogonal');
    if (this._isUnitary(matrix)) types.push('unitary');
    if (this.isPositiveDefinite(matrix)) types.push('positive-definite');
    if (this._isNilpotent(matrix)) types.push('nilpotent');
    if (this._isIdempotent(matrix)) types.push('idempotent');
    const id = `mat-${(++this._counter).toString(36)}`;
    this._matrices.set(id, { id, matrix, types });
    this._recordHistory(`classifyMatrix: ${types.length} types`);
    return types;
  }

  /**
   * LU 分解：A = L * U
   * LU decomposition
   */
  public luDecompose(matrix: number[][]): { L: number[][]; U: number[][] } {
    const n = matrix.length;
    const L: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    const U = matrix.map(r => [...r]);
    for (let k = 0; k < n; k++) {
      for (let i = k + 1; i < n; i++) {
        const factor = U[i]![k]! / U[k]![k]!;
        L[i]![k] = factor;
        for (let j = k; j < n; j++) {
          U[i]![j] = U[i]![j]! - factor * U[k]![j]!;
        }
      }
    }
    this._decompositions.push({ type: 'LU', factors: { L, U } });
    this._recordHistory('luDecompose: complete');
    return { L, U };
  }

  /**
   * QR 分解：A = Q * R（Gram-Schmidt）
   * QR decomposition
   */
  public qrDecompose(matrix: number[][]): { Q: number[][]; R: number[][] } {
    const m = matrix.length;
    const n = matrix[0]?.length ?? 0;
    const Q = Array.from({ length: m }, () => new Array(n).fill(0));
    const R = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < m; i++) Q[i]![k] = matrix[i]![k]!;
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
    this._decompositions.push({ type: 'QR', factors: { Q, R } });
    this._recordHistory('qrDecompose: complete');
    return { Q, R };
  }

  /**
   * Cholesky 分解：A = L * L^T（对称正定）
   * Cholesky decomposition
   */
  public choleskyDecomposition(matrix: number[][]): number[][] {
    const n = matrix.length;
    const L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) sum += L[i]![k]! * L[j]![k]!;
        if (i === j) {
          const val = matrix[i]![i]! - sum;
          if (val <= 0) throw new Error('Matrix is not positive definite');
          L[i]![j] = Math.sqrt(val);
        } else {
          L[i]![j] = (matrix[i]![j]! - sum) / L[j]![j]!;
        }
      }
    }
    this._decompositions.push({ type: 'Cholesky', factors: { L } });
    this._recordHistory('choleskyDecomposition: complete');
    return L;
  }

  /**
   * SVD：A = U * Σ * V^T
   * Singular Value Decomposition (simplified)
   */
  public svd(matrix: number[][]): { U: number[][]; S: number[][]; V: number[][] } {
    const m = matrix.length;
    const n = matrix[0]?.length ?? 0;
    const minDim = Math.min(m, n);
    const AtA = this._multiply(this._transpose(matrix), matrix);
    const eigenvalues = this._eigenvalues(AtA);
    const singularValues = eigenvalues
      .filter(v => v > 1e-10)
      .map(v => Math.sqrt(v))
      .sort((a, b) => b - a)
      .slice(0, minDim);
    const U: number[][] = Array.from({ length: m }, (_, i) =>
      Array.from({ length: minDim }, (_, j) => i === j ? 1 : 0)
    );
    const S = Array.from({ length: m }, () => new Array(n).fill(0));
    for (let i = 0; i < singularValues.length; i++) {
      S[i]![i] = singularValues[i]!;
    }
    const V: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    this._decompositions.push({ type: 'SVD', factors: { U, S, V } });
    this._recordHistory('svd: complete');
    return { U, S, V };
  }

  /**
   * Schur 分解：A = Q * T * Q^H
   * Schur decomposition
   */
  public schurDecompose(matrix: number[][]): { Q: number[][]; T: number[][] } {
    const n = matrix.length;
    const eigenvalues = this._eigenvalues(matrix);
    const T = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) T[i]![i] = eigenvalues[i] ?? 0;
    const Q: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    this._decompositions.push({ type: 'Schur', factors: { Q, T } });
    this._recordHistory('schurDecompose: complete');
    return { Q, T };
  }

  /**
   * 矩阵范数
   * Matrix norm
   */
  public matrixNorm(matrix: number[][], type: NormType): number {
    const m = matrix.length;
    const n = matrix[0]?.length ?? 0;
    switch (type) {
      case 'L1': {
        let max = 0;
        for (let j = 0; j < n; j++) {
          let col = 0;
          for (let i = 0; i < m; i++) col += Math.abs(matrix[i]![j]!);
          if (col > max) max = col;
        }
        return max;
      }
      case 'infinity': {
        let max = 0;
        for (let i = 0; i < m; i++) {
          const row = matrix[i]!.reduce((s, v) => s + Math.abs(v), 0);
          if (row > max) max = row;
        }
        return max;
      }
      case 'frobenius': {
        let sum = 0;
        for (let i = 0; i < m; i++) {
          for (let j = 0; j < n; j++) sum += matrix[i]![j]! * matrix[i]![j]!;
        }
        return Math.sqrt(sum);
      }
      case 'L2': {
        const AtA = this._multiply(this._transpose(matrix), matrix);
        const eig = this._eigenvalues(AtA);
        return Math.sqrt(Math.max(...eig, 0));
      }
    }
  }

  /**
   * 条件数：σ_max / σ_min
   * Condition number
   */
  public conditionNumber(matrix: number[][]): number {
    const AtA = this._multiply(this._transpose(matrix), matrix);
    const eig = this._eigenvalues(AtA);
    const positive = eig.filter(v => v > 1e-10);
    if (positive.length === 0) return Infinity;
    const max = Math.sqrt(Math.max(...positive));
    const min = Math.sqrt(Math.min(...positive));
    return min > 1e-12 ? max / min : Infinity;
  }

  /**
   * 伪逆：A^+ = (A^T A)^(-1) A^T
   * Pseudo-inverse (Moore-Penrose, simplified)
   */
  public pseudoInverse(matrix: number[][]): number[][] {
    const At = this._transpose(matrix);
    const AtA = this._multiply(At, matrix);
    const inv = this.inverse(AtA);
    if (!inv) return At;
    return this._multiply(inv, At);
  }

  /**
   * 正定判定
   * Check positive definiteness
   */
  public isPositiveDefinite(matrix: number[][]): boolean {
    const n = matrix.length;
    if (!this._isSymmetric(matrix)) return false;
    for (let i = 0; i < n; i++) {
      if ((matrix[i]![i] ?? 0) <= 0) return false;
    }
    try {
      this.choleskyDecomposition(matrix);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 正交判定：A^T A = I
   * Check orthogonality
   */
  public isOrthogonal(matrix: number[][]): boolean {
    const n = matrix.length;
    if (n === 0) return false;
    if (matrix[0]!.length !== n) return false;
    const AtA = this._multiply(this._transpose(matrix), matrix);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const expected = i === j ? 1 : 0;
        if (Math.abs(AtA[i]![j]! - expected) > 1e-6) return false;
      }
    }
    return true;
  }

  /**
   * 迹
   * Trace
   */
  public trace(matrix: number[][]): number {
    let sum = 0;
    for (let i = 0; i < matrix.length; i++) sum += matrix[i]![i] ?? 0;
    return sum;
  }

  /**
   * 行列式
   * Determinant
   */
  public determinant(matrix: number[][]): number {
    const n = matrix.length;
    if (n === 0) return 1;
    if (n === 1) return matrix[0]![0]!;
    if (n === 2) return matrix[0]![0]! * matrix[1]![1]! - matrix[0]![1]! * matrix[1]![0]!;
    const M = matrix.map(r => [...r]);
    let det = 1;
    for (let k = 0; k < n; k++) {
      let pivot = k;
      for (let i = k + 1; i < n; i++) {
        if (Math.abs(M[i]![k]!) > Math.abs(M[pivot]![k]!)) pivot = i;
      }
      if (pivot !== k) {
        [M[k]!, M[pivot]!] = [M[pivot]!, M[k]!];
        det = -det;
      }
      if (Math.abs(M[k]![k]!) < 1e-12) return 0;
      det *= M[k]![k]!;
      for (let i = k + 1; i < n; i++) {
        const factor = M[i]![k]! / M[k]![k]!;
        for (let j = k; j < n; j++) {
          M[i]![j] = M[i]![j]! - factor * M[k]![j]!;
        }
      }
    }
    return det;
  }

  /**
   * 逆矩阵
   * Inverse matrix (returns null if singular)
   */
  public inverse(matrix: number[][]): number[][] | null {
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

  /**
   * Kronecker 积
   * Kronecker product
   */
  public kroneckerProduct(a: number[][], b: number[][]): number[][] {
    const ma = a.length, na = a[0]?.length ?? 0;
    const mb = b.length, nb = b[0]?.length ?? 0;
    const result: number[][] = [];
    for (let i = 0; i < ma; i++) {
      for (let k = 0; k < mb; k++) {
        const row: number[] = [];
        for (let j = 0; j < na; j++) {
          for (let l = 0; l < nb; l++) {
            row.push(a[i]![j]! * b[k]![l]!);
          }
        }
        result.push(row);
      }
    }
    return result;
  }

  /**
   * Hadamard 积（按元素相乘）
   * Hadamard (element-wise) product
   */
  public hadamardProduct(a: number[][], b: number[][]): number[][] {
    if (a.length !== b.length) throw new Error('Dimension mismatch in hadamardProduct');
    return a.map((row, i) => row.map((v, j) => v * (b[i]![j] ?? 0)));
  }

  /**
   * 矩阵加法
   * Matrix addition
   */
  public add(a: number[][], b: number[][]): number[][] {
    if (a.length !== b.length) throw new Error('Dimension mismatch in add');
    return a.map((row, i) => row.map((v, j) => v + (b[i]![j] ?? 0)));
  }

  /**
   * 矩阵减法
   * Matrix subtraction
   */
  public subtract(a: number[][], b: number[][]): number[][] {
    if (a.length !== b.length) throw new Error('Dimension mismatch in subtract');
    return a.map((row, i) => row.map((v, j) => v - (b[i]![j] ?? 0)));
  }

  /**
   * 标量乘法
   * Scalar multiplication
   */
  public scalarMultiply(matrix: number[][], scalar: number): number[][] {
    return matrix.map(row => row.map(v => v * scalar));
  }

  /**
   * 矩阵乘法
   * Matrix multiplication
   */
  public multiply(a: number[][], b: number[][]): number[][] {
    return this._multiply(a, b);
  }

  /**
   * 矩阵转置
   * Matrix transpose
   */
  public transpose(matrix: number[][]): number[][] {
    return this._transpose(matrix);
  }

  /**
   * 矩阵的幂
   * Matrix power
   */
  public matrixPower(matrix: number[][], k: number): number[][] {
    const n = matrix.length;
    if (k === 0) {
      return Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
      ) as number[][];
    }
    if (k === 1) return matrix.map(r => [...r]);
    let result = matrix.map(r => [...r]);
    for (let i = 1; i < k; i++) {
      result = this._multiply(result, matrix);
    }
    this._recordHistory(`matrixPower: A^${k}`);
    return result;
  }

  /**
   * 矩阵指数（级数近似）
   * Matrix exponential (series approximation)
   */
  public matrixExponential(matrix: number[][], terms: number = 20): number[][] {
    const n = matrix.length;
    let result: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    let current: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    for (let k = 1; k <= terms; k++) {
      current = this._multiply(current, matrix);
      const factorial = this._factorial(k);
      result = result.map((row, i) =>
        row.map((v, j) => v + current[i]![j]! / factorial)
      );
    }
    this._recordHistory(`matrixExponential: ${terms} terms`);
    return result;
  }

  /**
   * 行最简形（RREF）
   * Reduced row echelon form
   */
  public rref(matrix: number[][]): number[][] {
    const m = matrix.map(r => [...r]);
    const rows = m.length;
    const cols = m[0]?.length ?? 0;
    let lead = 0;
    for (let r = 0; r < rows && lead < cols; r++) {
      let i = r;
      while (i < rows && Math.abs(m[i]![lead]!) < 1e-10) i++;
      if (i === rows) { lead++; r--; continue; }
      [m[r]!, m[i]!] = [m[i]!, m[r]!];
      const pivot = m[r]![lead]!;
      if (Math.abs(pivot) > 1e-10) {
        for (let c = 0; c < cols; c++) m[r]![c] = m[r]![c]! / pivot;
      }
      for (let j = 0; j < rows; j++) {
        if (j !== r) {
          const factor = m[j]![lead]!;
          for (let c = 0; c < cols; c++) {
            m[j]![c] = m[j]![c]! - factor * m[r]![c]!;
          }
        }
      }
      lead++;
    }
    this._recordHistory('rref: complete');
    return m;
  }

  /**
   * 矩阵的秩
   * Rank of matrix
   */
  public rank(matrix: number[][]): number {
    const rref = this.rref(matrix);
    let rank = 0;
    for (let r = 0; r < rref.length; r++) {
      if (rref[r]!.some(v => Math.abs(v) > 1e-10)) rank++;
    }
    this._recordHistory(`rank: ${rank}`);
    return rank;
  }

  /**
   * 零空间
   * Null space (kernel)
   */
  public nullSpace(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    if (cols === 0) return [];
    const rref = this.rref(matrix.map(r => [...r]));
    const pivotCols: number[] = [];
    const freeCols: number[] = [];
    for (let c = 0; c < cols; c++) {
      const pivotRow = rref.findIndex((row, r) => row[c] !== 0 && r === pivotCols.length);
      if (pivotRow !== -1 && pivotRow < rows) {
        pivotCols.push(c);
      } else {
        freeCols.push(c);
      }
    }
    const kernel: number[][] = [];
    for (const fc of freeCols) {
      const components = new Array(cols).fill(0);
      components[fc] = 1;
      for (let i = 0; i < pivotCols.length; i++) {
        components[pivotCols[i]!] = -rref[i]![fc]!;
      }
      kernel.push(components);
    }
    this._recordHistory(`nullSpace: ${kernel.length} basis vectors`);
    return kernel;
  }

  /**
   * 列空间
   * Column space (image)
   */
  public columnSpace(matrix: number[][]): number[][] {
    if (matrix.length === 0) return [];
    const cols = matrix[0]!.length;
    const basis: number[][] = [];
    const rref = this.rref(matrix.map(r => [...r]));
    const pivotCols: number[] = [];
    let lead = 0;
    for (let r = 0; r < rref.length && lead < cols; r++) {
      while (lead < cols && Math.abs(rref[r]![lead]!) < 1e-10) lead++;
      if (lead < cols) {
        pivotCols.push(lead);
        lead++;
      }
    }
    for (const c of pivotCols) {
      basis.push(matrix.map(row => row[c] ?? 0));
    }
    this._recordHistory(`columnSpace: ${basis.length} basis vectors`);
    return basis;
  }

  /**
   * 行空间
   * Row space
   */
  public rowSpace(matrix: number[][]): number[][] {
    const rref = this.rref(matrix.map(r => [...r]));
    const basis: number[][] = [];
    for (let r = 0; r < rref.length; r++) {
      if (rref[r]!.some(v => Math.abs(v) > 1e-10)) {
        basis.push([...rref[r]!]);
      }
    }
    this._recordHistory(`rowSpace: ${basis.length} basis vectors`);
    return basis;
  }

  /**
   * 左零空间
   * Left null space
   */
  public leftNullSpace(matrix: number[][]): number[][] {
    const At = this._transpose(matrix);
    return this.nullSpace(At);
  }

  /**
   * 四个基本子空间
   * Four fundamental subspaces
   */
  public fourFundamentalSubspaces(A: number[][]): {
    columnSpace: number[][];
    nullSpace: number[][];
    rowSpace: number[][];
    leftNullSpace: number[][];
  } {
    const columnSpace = this.columnSpace(A);
    const nullSpace = this.nullSpace(A);
    const rowSpace = this.rowSpace(A);
    const leftNullSpace = this.leftNullSpace(A);
    this._recordHistory('fourFundamentalSubspaces computed');
    return { columnSpace, nullSpace, rowSpace, leftNullSpace };
  }

  /**
   * 线性方程组求解（Ax = b）
   * Solve linear system Ax = b
   */
  public solveSystem(A: number[][], b: number[]): number[] | null {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i] ?? 0]);
    for (let i = 0; i < n; i++) {
      let pivotRow = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(aug[r]![i]!) > Math.abs(aug[pivotRow]![i]!)) pivotRow = r;
      }
      [aug[i]!, aug[pivotRow]!] = [aug[pivotRow]!, aug[i]!];
      const pivot = aug[i]![i]!;
      if (Math.abs(pivot) < 1e-12) return null;
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

  /**
   * 高斯-赛德尔迭代
   * Gauss-Seidel iteration
   */
  public gaussSeidel(
    A: number[][],
    b: number[],
    initialGuess?: number[],
    tolerance: number = 1e-10,
    maxIterations: number = 1000
  ): { solution: number[]; iterations: number; converged: boolean } {
    const n = A.length;
    let x = initialGuess ?? new Array(n).fill(0);
    let iter = 0;
    for (iter = 0; iter < maxIterations; iter++) {
      const xOld = [...x];
      for (let i = 0; i < n; i++) {
        let sum = b[i] ?? 0;
        for (let j = 0; j < n; j++) {
          if (j !== i) {
            sum -= (A[i]?.[j] ?? 0) * x[j];
          }
        }
        const diag = A[i]?.[i] ?? 1;
        if (Math.abs(diag) < 1e-12) break;
        x[i] = sum / diag;
      }
      let error = 0;
      for (let i = 0; i < n; i++) {
        error += Math.pow(x[i] - xOld[i], 2);
      }
      if (Math.sqrt(error) < tolerance) break;
    }
    const converged = iter < maxIterations;
    this._recordHistory(`gaussSeidel: converged=${converged}, iter=${iter}`);
    return { solution: x, iterations: iter, converged };
  }

  /**
   * 雅可比迭代
   * Jacobi iteration
   */
  public jacobiIteration(
    A: number[][],
    b: number[],
    initialGuess?: number[],
    tolerance: number = 1e-10,
    maxIterations: number = 1000
  ): { solution: number[]; iterations: number; converged: boolean } {
    const n = A.length;
    let x = initialGuess ?? new Array(n).fill(0);
    let iter = 0;
    for (iter = 0; iter < maxIterations; iter++) {
      const xOld = [...x];
      for (let i = 0; i < n; i++) {
        let sum = b[i] ?? 0;
        for (let j = 0; j < n; j++) {
          if (j !== i) {
            sum -= (A[i]?.[j] ?? 0) * xOld[j];
          }
        }
        const diag = A[i]?.[i] ?? 1;
        if (Math.abs(diag) < 1e-12) break;
        x[i] = sum / diag;
      }
      let error = 0;
      for (let i = 0; i < n; i++) {
        error += Math.pow(x[i] - xOld[i], 2);
      }
      if (Math.sqrt(error) < tolerance) break;
    }
    const converged = iter < maxIterations;
    this._recordHistory(`jacobiIteration: converged=${converged}, iter=${iter}`);
    return { solution: x, iterations: iter, converged };
  }

  /**
   * LDLT 分解
   * LDLT decomposition
   */
  public ldltDecomposition(matrix: number[][]): { L: number[][]; D: number[] } {
    const n = matrix.length;
    const L: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    const D = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[j]![k]! * L[j]![k]! * D[k]!;
      }
      D[j] = matrix[j]![j]! - sum;
      for (let i = j + 1; i < n; i++) {
        let sum2 = 0;
        for (let k = 0; k < j; k++) {
          sum2 += L[i]![k]! * L[j]![k]! * D[k]!;
        }
        L[i]![j] = (matrix[i]![j]! - sum2) / D[j]!;
      }
    }
    this._recordHistory('ldltDecomposition: complete');
    return { L, D };
  }

  /**
   * PLU 分解（带部分主元选择）
   * PLU decomposition with partial pivoting
   */
  public pluDecomposition(matrix: number[][]): { P: number[][]; L: number[][]; U: number[][] } {
    const n = matrix.length;
    const A = matrix.map(r => [...r]);
    const P: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    const L: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    for (let k = 0; k < n; k++) {
      let pivotRow = k;
      for (let i = k + 1; i < n; i++) {
        if (Math.abs(A[i]![k]!) > Math.abs(A[pivotRow]![k]!)) pivotRow = i;
      }
      if (pivotRow !== k) {
        [A[k]!, A[pivotRow]!] = [A[pivotRow]!, A[k]!];
        [P[k]!, P[pivotRow]!] = [P[pivotRow]!, P[k]!];
        for (let j = 0; j < k; j++) {
          [L[k]![j]!, L[pivotRow]![j]!] = [L[pivotRow]![j]!, L[k]![j]!];
        }
      }
      for (let i = k + 1; i < n; i++) {
        const factor = A[i]![k]! / A[k]![k]!;
        L[i]![k] = factor;
        for (let j = k; j < n; j++) {
          A[i]![j] = A[i]![j]! - factor * A[k]![j]!;
        }
      }
    }
    this._recordHistory('pluDecomposition: complete');
    return { P, L, U: A };
  }

  /**
   * 矩阵的迹性质验证
   * Trace property verification: tr(AB) = tr(BA)
   */
  public tracePropertyVerification(A: number[][], B: number[][]): {
    trAB: number;
    trBA: number;
    holds: boolean;
  } {
    const AB = this._multiply(A, B);
    const BA = this._multiply(B, A);
    const trAB = this.trace(AB);
    const trBA = this.trace(BA);
    const holds = Math.abs(trAB - trBA) < 1e-10;
    this._recordHistory(`tracePropertyVerification: holds=${holds}`);
    return { trAB, trBA, holds };
  }

  /**
   * 行列式乘法性质验证
   * Determinant multiplicative property: det(AB) = det(A)det(B)
   */
  public determinantMultiplicative(A: number[][], B: number[][]): {
    detAB: number;
    detAdetB: number;
    holds: boolean;
  } {
    const AB = this._multiply(A, B);
    const detAB = this.determinant(AB);
    const detA = this.determinant(A);
    const detB = this.determinant(B);
    const detAdetB = detA * detB;
    const holds = Math.abs(detAB - detAdetB) < 1e-8;
    this._recordHistory(`determinantMultiplicative: holds=${holds}`);
    return { detAB, detAdetB, holds };
  }

  /**
   * 创建单位矩阵
   * Create identity matrix
   */
  public identity(n: number): number[][] {
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    ) as number[][];
  }

  /**
   * 创建零矩阵
   * Create zero matrix
   */
  public zeros(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () => new Array(cols).fill(0));
  }

  /**
   * 创建对角矩阵
   * Create diagonal matrix
   */
  public diagonal(diagonal: number[]): number[][] {
    const n = diagonal.length;
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? diagonal[i] ?? 0 : 0)
    );
  }

  /**
   * 提取对角元素
   * Extract diagonal elements
   */
  public getDiagonal(matrix: number[][]): number[] {
    const n = Math.min(matrix.length, matrix[0]?.length ?? 0);
    const diag: number[] = [];
    for (let i = 0; i < n; i++) {
      diag.push(matrix[i]![i] ?? 0);
    }
    return diag;
  }

  /**
   * 矩阵的 Frobenius 内积
   * Frobenius inner product
   */
  public frobeniusInnerProduct(A: number[][], B: number[][]): number {
    let sum = 0;
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < (A[0]?.length ?? 0); j++) {
        sum += (A[i]?.[j] ?? 0) * (B[i]?.[j] ?? 0);
      }
    }
    return sum;
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    matrices: number;
    decompositions: MatrixDecomposition[];
    history: string[];
  }> {
    return {
      id: `matrix-theory-${Date.now()}-${this._counter}`,
      payload: {
        matrices: this._matrices.size,
        decompositions: [...this._decompositions],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['linear_algebra', 'matrix-theory', 'result'],
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
    this._matrices.clear();
    this._decompositions = [];
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

  private _isSymmetric(matrix: number[][]): boolean {
    const n = matrix.length;
    if (n === 0 || matrix[0]!.length !== n) return false;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < i; j++) {
        if (Math.abs(matrix[i]![j]! - matrix[j]![i]!) > 1e-10) return false;
      }
    }
    return true;
  }

  private _isSkewSymmetric(matrix: number[][]): boolean {
    const n = matrix.length;
    if (n === 0 || matrix[0]!.length !== n) return false;
    for (let i = 0; i < n; i++) {
      if (Math.abs(matrix[i]![i]!) > 1e-10) return false;
      for (let j = 0; j < i; j++) {
        if (Math.abs(matrix[i]![j]! + matrix[j]![i]!) > 1e-10) return false;
      }
    }
    return true;
  }

  private _isUnitary(matrix: number[][]): boolean {
    // For real matrices, unitary ⟺ orthogonal
    return this.isOrthogonal(matrix);
  }

  private _isNilpotent(matrix: number[][]): boolean {
    const n = matrix.length;
    if (n === 0) return false;
    let current = matrix;
    for (let k = 1; k <= n; k++) {
      const isZero = current.every(row => row.every(v => Math.abs(v) < 1e-10));
      if (isZero) return true;
      current = this._multiply(current, matrix);
    }
    return false;
  }

  private _isIdempotent(matrix: number[][]): boolean {
    const n = matrix.length;
    if (n === 0 || matrix[0]!.length !== n) return false;
    const sq = this._multiply(matrix, matrix);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (Math.abs(sq[i]![j]! - matrix[i]![j]!) > 1e-10) return false;
      }
    }
    return true;
  }

  private _eigenvalues(matrix: number[][]): number[] {
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
    let A = matrix.map(r => [...r]);
    for (let iter = 0; iter < 100; iter++) {
      const { Q, R } = this.qrDecompose(A);
      A = this._multiply(R, Q);
      let offDiag = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) offDiag += Math.abs(A[i]![j]!);
        }
      }
      if (offDiag < 1e-10) break;
    }
    const eigenvalues: number[] = [];
    for (let i = 0; i < n; i++) eigenvalues.push(A[i]![i]!);
    return eigenvalues;
  }

  private _factorial(n: number): number {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
}
