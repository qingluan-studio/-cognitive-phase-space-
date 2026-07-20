import { DataPacket, PacketMeta } from '../shared/types';

/** Matrix representation. */
export interface Matrix {
  data: number[][];
  rows: number;
  cols: number;
}

/** Type of matrix operation performed. */
export type MatrixOperationType =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'transpose'
  | 'inverse'
  | 'determinant';

/** Recorded matrix operation. */
export interface MatrixOperation {
  type: MatrixOperationType;
  result: Matrix | number;
}

/** Eigenvalue/eigenvector pair. */
export interface EigenPair {
  eigenvalue: number;
  eigenvector: number[];
}

/** Diagonalisation result. */
export interface Diagonalization {
  P: Matrix;
  D: Matrix;
}

/** LU decomposition pair. */
export interface LUDecomposition {
  L: Matrix;
  U: Matrix;
}

/** QR decomposition pair. */
export interface QRDecomposition {
  Q: Matrix;
  R: Matrix;
}

export class MatrixAlgebra {
  private _matrices: Map<string, Matrix> = new Map();
  private _operations: MatrixOperation[] = [];
  private _eigenPairs: EigenPair[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  create(data: number[][]): Matrix {
    const rows = data.length;
    const cols = rows > 0 ? data[0].length : 0;
    const matrix: Matrix = { data: data.map(row => [...row]), rows, cols };
    const id = `matrix-${++this._counter}`;
    this._matrices.set(id, matrix);
    this._history.push({ op: 'create', id, rows, cols });
    return matrix;
  }

  add(a: Matrix, b: Matrix): Matrix {
    return this._elementwise(a, b, (x, y) => x + y, 'add');
  }

  subtract(a: Matrix, b: Matrix): Matrix {
    return this._elementwise(a, b, (x, y) => x - y, 'subtract');
  }

  private _elementwise(a: Matrix, b: Matrix, op: (x: number, y: number) => number, name: 'add' | 'subtract'): Matrix {
    if (a.rows !== b.rows || a.cols !== b.cols) {
      throw new Error(`Matrix dimension mismatch for ${name}`);
    }
    const data: number[][] = [];
    for (let i = 0; i < a.rows; i++) {
      data.push([]);
      for (let j = 0; j < a.cols; j++) data[i].push(op(a.data[i][j], b.data[i][j]));
    }
    const result = this.create(data);
    this._operations.push({ type: name, result });
    return result;
  }

  multiply(a: Matrix, b: Matrix): Matrix {
    if (a.cols !== b.rows) {
      throw new Error('Matrix dimension mismatch for multiplication');
    }
    const data: number[][] = [];
    for (let i = 0; i < a.rows; i++) {
      data.push([]);
      for (let j = 0; j < b.cols; j++) {
        let sum = 0;
        for (let k = 0; k < a.cols; k++) {
          sum += a.data[i][k] * b.data[k][j];
        }
        data[i].push(sum);
      }
    }
    const result = this.create(data);
    this._operations.push({ type: 'multiply', result });
    return result;
  }

  scalarMultiply(matrix: Matrix, scalar: number): Matrix {
    const data = matrix.data.map(row => row.map(v => v * scalar));
    const result = this.create(data);
    this._history.push({ op: 'scalarMultiply', scalar });
    return result;
  }

  transpose(matrix: Matrix): Matrix {
    const data: number[][] = [];
    for (let j = 0; j < matrix.cols; j++) {
      data.push([]);
      for (let i = 0; i < matrix.rows; i++) {
        data[j].push(matrix.data[i][j]);
      }
    }
    const result = this.create(data);
    this._operations.push({ type: 'transpose', result });
    return result;
  }

  determinant(matrix: Matrix): number {
    if (matrix.rows !== matrix.cols) {
      throw new Error('Determinant requires a square matrix');
    }
    const det = this._detRecursive(matrix.data, matrix.rows);
    this._operations.push({ type: 'determinant', result: det });
    return det;
  }

  inverse(matrix: Matrix): Matrix | null {
    if (matrix.rows !== matrix.cols) {
      throw new Error('Inverse requires a square matrix');
    }
    const n = matrix.rows;
    const det = this.determinant(matrix);
    if (Math.abs(det) < 1e-12) return null;
    const adjugate = this.adjugate(matrix);
    const data = adjugate.data.map(row => row.map(v => v / det));
    const result = this.create(data);
    this._operations.push({ type: 'inverse', result });
    return result;
  }

  rank(matrix: Matrix): number {
    const m = matrix.data.map(row => [...row]);
    const rank = this._rref(m, matrix.rows, matrix.cols + 1);
    this._history.push({ op: 'rank', rank });
    return rank;
  }

  trace(matrix: Matrix): number {
    if (matrix.rows !== matrix.cols) {
      throw new Error('Trace requires a square matrix');
    }
    let trace = 0;
    for (let i = 0; i < matrix.rows; i++) trace += matrix.data[i][i];
    return trace;
  }

  cofactor(matrix: Matrix, row: number, col: number): number {
    const minor: number[][] = [];
    for (let i = 0; i < matrix.rows; i++) {
      if (i === row) continue;
      minor.push(matrix.data[i].filter((_, k) => k !== col));
    }
    const det = this._detRecursive(minor, minor.length);
    return ((row + col) % 2 === 0 ? 1 : -1) * det;
  }

  adjugate(matrix: Matrix): Matrix {
    if (matrix.rows !== matrix.cols) {
      throw new Error('Adjugate requires a square matrix');
    }
    const n = matrix.rows;
    const data: number[][] = [];
    for (let i = 0; i < n; i++) {
      data.push([]);
      for (let j = 0; j < n; j++) {
        // Adjugate is transpose of cofactor matrix
        data[i].push(this.cofactor(matrix, j, i));
      }
    }
    return this.create(data);
  }

  eigenvalues(matrix: Matrix): number[] {
    if (matrix.rows !== matrix.cols) {
      throw new Error('Eigenvalues require a square matrix');
    }
    // Use Jacobi eigenvalue algorithm
    const a = matrix.data.map(row => [...row]);
    const n = matrix.rows;
    for (let sweep = 0; sweep < 50; sweep++) {
      let max = 0;
      let p = 0;
      let q = 1;
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(a[i][j]) > max) {
            max = Math.abs(a[i][j]);
            p = i;
            q = j;
          }
        }
      }
      if (max < 1e-10) break;
      const theta = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      for (let k = 0; k < n; k++) {
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = a[p][k];
        const aqk = a[q][k];
        a[p][k] = c * apk - s * aqk;
        a[q][k] = s * apk + c * aqk;
      }
    }
    const eigs = Array.from({ length: n }, (_, i) => a[i][i]);
    eigs.sort((x, y) => y - x);
    this._history.push({ op: 'eigenvalues', eigs });
    return eigs;
  }

  eigenvectors(matrix: Matrix, eigenvalue: number): number[] {
    if (matrix.rows !== matrix.cols) {
      throw new Error('Eigenvectors require a square matrix');
    }
    const n = matrix.rows;
    // Solve (A - λI)v = 0 via Gaussian elimination
    const m = matrix.data.map((row, i) =>
      row.map((v, j) => (i === j ? v - eigenvalue : v)),
    );
    const r = this._rref(m, n, n);
    // Identify pivot columns and free column for null-space basis
    const pivots = new Set<number>();
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < n; j++) {
        if (Math.abs(m[i][j] - 1) < 1e-9) {
          pivots.add(j);
          break;
        }
      }
    }
    const freeCol = Array.from({ length: n }, (_, i) => i).find(i => !pivots.has(i)) ?? 0;
    const vec = new Array(n).fill(0);
    vec[freeCol] = 1;
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < n; j++) {
        if (Math.abs(m[i][j] - 1) < 1e-9 && j !== freeCol) {
          vec[j] = -m[i][freeCol];
        }
      }
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    const normalized = norm > 1e-12 ? vec.map(v => v / norm) : vec;
    const pair: EigenPair = { eigenvalue, eigenvector: normalized };
    this._eigenPairs.push(pair);
    this._history.push({ op: 'eigenvectors', pair });
    return normalized;
  }

  diagonalize(matrix: Matrix): Diagonalization {
    const eigs = this.eigenvalues(matrix);
    const n = matrix.rows;
    const uniqueEigs = Array.from(new Set(eigs.map(e => Math.round(e * 1e6) / 1e6)));
    const Pdata: number[][] = Array.from({ length: n }, () => []);
    const Ddata: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    uniqueEigs.slice(0, n).forEach((eig, idx) => {
      const vec = this.eigenvectors(matrix, eig);
      for (let i = 0; i < n; i++) Pdata[i].push(vec[i] || 0);
      Ddata[idx][idx] = eig;
    });
    while (Pdata[0] && Pdata[0].length < n) {
      for (let i = 0; i < n; i++) Pdata[i].push(0);
    }
    const P = this.create(Pdata);
    const D = this.create(Ddata);
    this._history.push({ op: 'diagonalize', P, D });
    return { P, D };
  }

  solve(matrix: Matrix, constants: number[]): number[] {
    if (matrix.rows !== matrix.cols || matrix.rows !== constants.length) {
      throw new Error('Matrix dimensions must match constants length');
    }
    const n = matrix.rows;
    const augmented = matrix.data.map((row, i) => [...row, constants[i]]);
    this._rref(augmented, n, n + 1);
    const solution = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const pivCol = augmented[i].findIndex((v, idx) => idx < n && Math.abs(v) > 1e-12);
      if (pivCol >= 0) solution[pivCol] = augmented[i][n];
    }
    this._history.push({ op: 'solve', solution });
    return solution;
  }

  luDecomposition(matrix: Matrix): LUDecomposition {
    if (matrix.rows !== matrix.cols) {
      throw new Error('LU decomposition requires a square matrix');
    }
    const n = matrix.rows;
    const Ldata: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const Udata: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      Ldata[i][i] = 1;
      for (let j = i; j < n; j++) {
        let sumU = 0;
        for (let k = 0; k < i; k++) sumU += Ldata[i][k] * Udata[k][j];
        Udata[i][j] = matrix.data[i][j] - sumU;
      }
      if (Math.abs(Udata[i][i]) < 1e-12) throw new Error('LU decomposition fails (zero pivot)');
      for (let j = i + 1; j < n; j++) {
        let sumL = 0;
        for (let k = 0; k < i; k++) sumL += Ldata[j][k] * Udata[k][i];
        Ldata[j][i] = (matrix.data[j][i] - sumL) / Udata[i][i];
      }
    }
    return { L: this.create(Ldata), U: this.create(Udata) };
  }

  qrDecomposition(matrix: Matrix): QRDecomposition {
    const n = matrix.rows;
    const m = matrix.cols;
    const Q: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
    const R: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
    for (let k = 0; k < m; k++) {
      for (let i = 0; i < n; i++) Q[i][k] = matrix.data[i][k];
      for (let j = 0; j < k; j++) {
        let dot = 0;
        for (let i = 0; i < n; i++) dot += Q[i][j] * matrix.data[i][k];
        R[j][k] = dot;
        for (let i = 0; i < n; i++) Q[i][k] -= dot * Q[i][j];
      }
      const norm = Math.sqrt(this._dotCol(Q, k, n)) || 1;
      R[k][k] = norm;
      for (let i = 0; i < n; i++) Q[i][k] /= norm;
    }
    const Qmat = this.create(Q);
    const Rmat = this.create(R);
    this._history.push({ op: 'qrDecomposition' });
    return { Q: Qmat, R: Rmat };
  }

  private _detRecursive(m: number[][], n: number): number {
    if (n === 1) return m[0][0];
    if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    let det = 0;
    for (let j = 0; j < n; j++) {
      const minor: number[][] = [];
      for (let i = 1; i < n; i++) {
        minor.push(m[i].filter((_, k) => k !== j));
      }
      det += (j % 2 === 0 ? 1 : -1) * m[0][j] * this._detRecursive(minor, n - 1);
    }
    return det;
  }

  /** In-place reduced row echelon form; returns the number of pivots. */
  private _rref(m: number[][], rows: number, cols: number): number {
    let r = 0;
    for (let c = 0; c < cols - 1 && r < rows; c++) {
      let pivot = r;
      for (let i = r + 1; i < rows; i++) {
        if (Math.abs(m[i][c]) > Math.abs(m[pivot][c])) pivot = i;
      }
      if (Math.abs(m[pivot][c]) < 1e-12) continue;
      [m[r], m[pivot]] = [m[pivot], m[r]];
      const pivVal = m[r][c];
      for (let j = c; j < cols; j++) m[r][j] /= pivVal;
      for (let i = 0; i < rows; i++) {
        if (i !== r) {
          const factor = m[i][c];
          for (let j = c; j < cols; j++) m[i][j] -= factor * m[r][j];
        }
      }
      r++;
    }
    return r;
  }

  /** Squared L2 norm of column k of matrix m with n rows. */
  private _dotCol(m: number[][], k: number, n: number): number {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += m[i][k] * m[i][k];
    return sum;
  }

  identity(n: number): Matrix {
    const data: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) data[i][i] = 1;
    return this.create(data);
  }

  zeros(rows: number, cols: number): Matrix {
    const data: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
    return this.create(data);
  }

  ones(rows: number, cols: number): Matrix {
    const data: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(1));
    return this.create(data);
  }

  diagonal(diagonal: number[]): Matrix {
    const n = diagonal.length;
    const data: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) data[i][i] = diagonal[i];
    return this.create(data);
  }

  randomMatrix(rows: number, cols: number, min: number = 0, max: number = 1): Matrix {
    const data: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push(min + Math.random() * (max - min));
      }
      data.push(row);
    }
    return this.create(data);
  }

  isSquare(matrix: Matrix): boolean {
    return matrix.rows === matrix.cols;
  }

  isSymmetric(matrix: Matrix): boolean {
    if (!this.isSquare(matrix)) return false;
    const n = matrix.rows;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(matrix.data[i][j] - matrix.data[j][i]) > 1e-9) return false;
      }
    }
    return true;
  }

  isSkewSymmetric(matrix: Matrix): boolean {
    if (!this.isSquare(matrix)) return false;
    const n = matrix.rows;
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        if (i === j && Math.abs(matrix.data[i][j]) > 1e-9) return false;
        if (i !== j && Math.abs(matrix.data[i][j] + matrix.data[j][i]) > 1e-9) return false;
      }
    }
    return true;
  }

  isDiagonal(matrix: Matrix): boolean {
    if (!this.isSquare(matrix)) return false;
    const n = matrix.rows;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && Math.abs(matrix.data[i][j]) > 1e-9) return false;
      }
    }
    return true;
  }

  isUpperTriangular(matrix: Matrix): boolean {
    for (let i = 1; i < matrix.rows; i++) {
      for (let j = 0; j < Math.min(i, matrix.cols); j++) {
        if (Math.abs(matrix.data[i][j]) > 1e-9) return false;
      }
    }
    return true;
  }

  isLowerTriangular(matrix: Matrix): boolean {
    for (let i = 0; i < matrix.rows; i++) {
      for (let j = i + 1; j < matrix.cols; j++) {
        if (Math.abs(matrix.data[i][j]) > 1e-9) return false;
      }
    }
    return true;
  }

  isTriangular(matrix: Matrix): boolean {
    return this.isUpperTriangular(matrix) || this.isLowerTriangular(matrix);
  }

  isOrthogonal(matrix: Matrix): boolean {
    if (!this.isSquare(matrix)) return false;
    const product = this.multiply(matrix, this.transpose(matrix));
    const id = this.identity(matrix.rows);
    for (let i = 0; i < matrix.rows; i++) {
      for (let j = 0; j < matrix.rows; j++) {
        const expected = i === j ? 1 : 0;
        if (Math.abs(product.data[i][j] - expected) > 1e-9) return false;
      }
    }
    return true;
  }

  isIdentity(matrix: Matrix): boolean {
    if (!this.isSquare(matrix)) return false;
    const n = matrix.rows;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const expected = i === j ? 1 : 0;
        if (Math.abs(matrix.data[i][j] - expected) > 1e-9) return false;
      }
    }
    return true;
  }

  isZero(matrix: Matrix): boolean {
    for (let i = 0; i < matrix.rows; i++) {
      for (let j = 0; j < matrix.cols; j++) {
        if (Math.abs(matrix.data[i][j]) > 1e-9) return false;
      }
    }
    return true;
  }

  isPositiveDefinite(matrix: Matrix): boolean {
    if (!this.isSymmetric(matrix)) return false;
    const eigs = this.eigenvalues(matrix);
    return eigs.every(e => e > 1e-9);
  }

  isPositiveSemiDefinite(matrix: Matrix): boolean {
    if (!this.isSymmetric(matrix)) return false;
    const eigs = this.eigenvalues(matrix);
    return eigs.every(e => e > -1e-9);
  }

  isNegativeDefinite(matrix: Matrix): boolean {
    if (!this.isSymmetric(matrix)) return false;
    const eigs = this.eigenvalues(matrix);
    return eigs.every(e => e < -1e-9);
  }

  isNegativeSemiDefinite(matrix: Matrix): boolean {
    if (!this.isSymmetric(matrix)) return false;
    const eigs = this.eigenvalues(matrix);
    return eigs.every(e => e < 1e-9);
  }

  isInvertible(matrix: Matrix): boolean {
    if (!this.isSquare(matrix)) return false;
    return Math.abs(this.determinant(matrix)) > 1e-9;
  }

  frobeniusNorm(matrix: Matrix): number {
    let sum = 0;
    for (let i = 0; i < matrix.rows; i++) {
      for (let j = 0; j < matrix.cols; j++) {
        sum += matrix.data[i][j] * matrix.data[i][j];
      }
    }
    return Math.sqrt(sum);
  }

  oneNorm(matrix: Matrix): number {
    let max = 0;
    for (let j = 0; j < matrix.cols; j++) {
      let sum = 0;
      for (let i = 0; i < matrix.rows; i++) {
        sum += Math.abs(matrix.data[i][j]);
      }
      if (sum > max) max = sum;
    }
    return max;
  }

  infinityNorm(matrix: Matrix): number {
    let max = 0;
    for (let i = 0; i < matrix.rows; i++) {
      let sum = 0;
      for (let j = 0; j < matrix.cols; j++) {
        sum += Math.abs(matrix.data[i][j]);
      }
      if (sum > max) max = sum;
    }
    return max;
  }

  twoNorm(matrix: Matrix): number {
    const ata = this.multiply(this.transpose(matrix), matrix);
    const eigs = this.eigenvalues(ata);
    return Math.sqrt(Math.max(...eigs.map(e => Math.abs(e))));
  }

  nuclearNorm(matrix: Matrix): number {
    const ata = this.multiply(this.transpose(matrix), matrix);
    const eigs = this.eigenvalues(ata);
    return eigs.reduce((s, e) => s + Math.sqrt(Math.abs(e)), 0);
  }

  hadamardProduct(a: Matrix, b: Matrix): Matrix {
    if (a.rows !== b.rows || a.cols !== b.cols) {
      throw new Error('Matrix dimension mismatch for Hadamard product');
    }
    const data: number[][] = [];
    for (let i = 0; i < a.rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < a.cols; j++) {
        row.push(a.data[i][j] * b.data[i][j]);
      }
      data.push(row);
    }
    return this.create(data);
  }

  kroneckerProduct(a: Matrix, b: Matrix): Matrix {
    const rows = a.rows * b.rows;
    const cols = a.cols * b.cols;
    const data: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (let i = 0; i < a.rows; i++) {
      for (let j = 0; j < a.cols; j++) {
        for (let k = 0; k < b.rows; k++) {
          for (let l = 0; l < b.cols; l++) {
            data[i * b.rows + k][j * b.cols + l] = a.data[i][j] * b.data[k][l];
          }
        }
      }
    }
    return this.create(data);
  }

  power(matrix: Matrix, n: number): Matrix {
    if (!this.isSquare(matrix)) {
      throw new Error('Matrix must be square for power');
    }
    if (n < 0) {
      const inv = this.inverse(matrix);
      if (!inv) throw new Error('Matrix is not invertible');
      return this.power(inv, -n);
    }
    if (n === 0) return this.identity(matrix.rows);
    if (n === 1) return this.create(matrix.data);
    if (n % 2 === 0) {
      const half = this.power(matrix, n / 2);
      return this.multiply(half, half);
    }
    return this.multiply(matrix, this.power(matrix, n - 1));
  }

  exponential(matrix: Matrix, terms: number = 20): Matrix {
    if (!this.isSquare(matrix)) {
      throw new Error('Matrix must be square for exponential');
    }
    const n = matrix.rows;
    let result = this.identity(n);
    let term = this.identity(n);
    for (let k = 1; k < terms; k++) {
      term = this.scalarMultiply(this.multiply(term, matrix), 1 / k);
      result = this.add(result, term);
    }
    this._history.push({ op: 'exponential', terms });
    return result;
  }

  choleskyDecomposition(matrix: Matrix): Matrix | null {
    if (!this.isSymmetric(matrix) || !this.isPositiveDefinite(matrix)) {
      return null;
    }
    const n = matrix.rows;
    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        if (i === j) {
          const val = matrix.data[i][i] - sum;
          if (val <= 0) return null;
          L[i][j] = Math.sqrt(val);
        } else {
          L[i][j] = (matrix.data[i][j] - sum) / L[j][j];
        }
      }
    }
    return this.create(L);
  }

  svd(matrix: Matrix): { U: Matrix; S: number[]; V: Matrix } {
    const m = matrix.rows;
    const n = matrix.cols;
    const ata = this.multiply(this.transpose(matrix), matrix);
    const eigs = this.eigenvalues(ata);
    const singularValues = eigs.map(e => Math.sqrt(Math.max(0, e))).sort((a, b) => b - a);
    const U = this.identity(m);
    const V = this.identity(n);
    this._history.push({ op: 'svd', singularValues });
    return { U, S: singularValues, V };
  }

  pseudoInverse(matrix: Matrix): Matrix {
    const { U, S, V } = this.svd(matrix);
    const n = S.length;
    const SPlus: number[][] = Array.from({ length: U.cols }, () => new Array(V.rows).fill(0));
    for (let i = 0; i < n; i++) {
      if (S[i] > 1e-9) {
        SPlus[i][i] = 1 / S[i];
      }
    }
    const SPlusMat = this.create(SPlus);
    const vt = this.transpose(V);
    const result = this.multiply(this.multiply(vt, SPlusMat), this.transpose(U));
    this._history.push({ op: 'pseudoInverse' });
    return result;
  }

  solveLeastSquares(A: Matrix, b: number[]): number[] {
    const at = this.transpose(A);
    const ata = this.multiply(at, A);
    const atb = new Array(A.cols).fill(0);
    for (let i = 0; i < A.cols; i++) {
      for (let j = 0; j < A.rows; j++) {
        atb[i] += A.data[j][i] * b[j];
      }
    }
    return this.solve(ata, atb);
  }

  luDecompositionWithPartialPivoting(matrix: Matrix): { L: Matrix; U: Matrix; P: Matrix } {
    if (matrix.rows !== matrix.cols) {
      throw new Error('LU decomposition requires a square matrix');
    }
    const n = matrix.rows;
    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const U: number[][] = matrix.data.map(row => [...row]);
    const P: number[][] = Array.from({ length: n }, (_, i) => {
      const row = new Array(n).fill(0);
      row[i] = 1;
      return row;
    });
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      let maxVal = Math.abs(U[i][i]);
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(U[k][i]) > maxVal) {
          maxVal = Math.abs(U[k][i]);
          maxRow = k;
        }
      }
      if (maxRow !== i) {
        [U[i], U[maxRow]] = [U[maxRow], U[i]];
        [P[i], P[maxRow]] = [P[maxRow], P[i]];
        if (i > 0) {
          for (let j = 0; j < i; j++) {
            [L[i][j], L[maxRow][j]] = [L[maxRow][j], L[i][j]];
          }
        }
      }
      L[i][i] = 1;
      for (let j = i + 1; j < n; j++) {
        const factor = U[j][i] / U[i][i];
        L[j][i] = factor;
        for (let k = i; k < n; k++) {
          U[j][k] -= factor * U[i][k];
        }
      }
    }
    this._history.push({ op: 'luDecompositionWithPartialPivoting' });
    return { L: this.create(L), U: this.create(U), P: this.create(P) };
  }

  determinantByLU(matrix: Matrix): number {
    try {
      const { U, P } = this.luDecompositionWithPartialPivoting(matrix);
      let det = 1;
      for (let i = 0; i < U.rows; i++) {
        det *= U.data[i][i];
      }
      let sign = 1;
      const pData = P.data;
      for (let i = 0; i < P.rows; i++) {
        if (pData[i][i] !== 1) {
          for (let j = i + 1; j < P.rows; j++) {
            if (pData[i][j] === 1) {
              sign = -sign;
              break;
            }
          }
        }
      }
      return sign * det;
    } catch {
      return this.determinant(matrix);
    }
  }

  tracePower(matrix: Matrix, k: number): number {
    const pow = this.power(matrix, k);
    return this.trace(pow);
  }

  characteristicPolynomial(matrix: Matrix): number[] {
    if (!this.isSquare(matrix)) {
      throw new Error('Characteristic polynomial requires a square matrix');
    }
    const n = matrix.rows;
    const coeffs: number[] = new Array(n + 1).fill(0);
    coeffs[0] = 1;
    const m = matrix.data.map(row => [...row]);
    for (let k = 1; k <= n; k++) {
      let trace = 0;
      for (let i = 0; i < n; i++) trace += m[i][i];
      coeffs[k] = -trace / k;
      const newM: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          newM[i][j] = matrix.data[i][j];
          if (i === j) newM[i][j] += coeffs[k];
        }
      }
      if (k < n) {
        const temp = this.multiply(this.create(m), this.create(newM));
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            m[i][j] = temp.data[i][j];
          }
        }
      }
    }
    return coeffs;
  }

  minPolynomial(matrix: Matrix): number[] {
    return this.characteristicPolynomial(matrix);
  }

  cayleyHamilton(matrix: Matrix): boolean {
    const coeffs = this.characteristicPolynomial(matrix);
    const n = matrix.rows;
    let result = this.zeros(n, n);
    for (let k = 0; k <= n; k++) {
      const pow = this.power(matrix, k);
      const term = this.scalarMultiply(pow, coeffs[k]);
      result = this.add(result, term);
    }
    return this.isZero(result);
  }

  gramSchmidt(matrix: Matrix): Matrix {
    const m = matrix.rows;
    const n = matrix.cols;
    const Q: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < m; i++) {
        Q[i][j] = matrix.data[i][j];
      }
      for (let k = 0; k < j; k++) {
        let dot = 0;
        for (let i = 0; i < m; i++) dot += Q[i][k] * matrix.data[i][j];
        for (let i = 0; i < m; i++) Q[i][j] -= dot * Q[i][k];
      }
      let norm = 0;
      for (let i = 0; i < m; i++) norm += Q[i][j] * Q[i][j];
      norm = Math.sqrt(norm);
      if (norm > 1e-12) {
        for (let i = 0; i < m; i++) Q[i][j] /= norm;
      }
    }
    return this.create(Q);
  }

  jordanForm(matrix: Matrix): { P: Matrix; J: Matrix } {
    const eigs = this.eigenvalues(matrix);
    const n = matrix.rows;
    const P = this.identity(n);
    const J = this.diagonal(eigs.slice(0, n));
    this._history.push({ op: 'jordanForm' });
    return { P, J };
  }

  schurDecomposition(matrix: Matrix): { Q: Matrix; T: Matrix } {
    const Q = this.identity(matrix.rows);
    const T = this.create(matrix.data);
    this._history.push({ op: 'schurDecomposition' });
    return { Q, T };
  }

  hessenbergForm(matrix: Matrix): { Q: Matrix; H: Matrix } {
    const n = matrix.rows;
    const H = matrix.data.map(row => [...row]);
    const Q = Array.from({ length: n }, (_, i) => {
      const row = new Array(n).fill(0);
      row[i] = 1;
      return row;
    });
    for (let k = 0; k < n - 2; k++) {
      let norm = 0;
      for (let i = k + 1; i < n; i++) {
        norm += H[i][k] * H[i][k];
      }
      norm = Math.sqrt(norm);
      if (norm > 1e-12) {
        const sign = H[k + 1][k] >= 0 ? 1 : -1;
        const v: number[] = new Array(n).fill(0);
        v[k + 1] = H[k + 1][k] + sign * norm;
        for (let i = k + 2; i < n; i++) v[i] = H[i][k];
        let vNorm = 0;
        for (let i = 0; i < n; i++) vNorm += v[i] * v[i];
        vNorm = Math.sqrt(vNorm);
        if (vNorm > 1e-12) {
          for (let i = 0; i < n; i++) v[i] /= vNorm;
        }
        const Hv = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
          for (let j = k; j < n; j++) {
            Hv[i] += H[i][j] * v[j];
          }
        }
        const vH = new Array(n).fill(0);
        for (let j = 0; j < n; j++) {
          for (let i = k; i < n; i++) {
            vH[j] += v[i] * H[i][j];
          }
        }
        const vHv = v.reduce((s, val, i) => s + val * Hv[i], 0);
        for (let i = 0; i < n; i++) {
          for (let j = k; j < n; j++) {
            H[i][j] -= 2 * v[i] * Hv[j] - 2 * vH[i] * v[j] + 4 * vHv * v[i] * v[j];
          }
        }
      }
    }
    this._history.push({ op: 'hessenbergForm' });
    return { Q: this.create(Q), H: this.create(H) };
  }

  matrixFunction(matrix: Matrix, f: (x: number) => number): Matrix {
    if (!this.isSquare(matrix)) {
      throw new Error('Matrix function requires square matrix');
    }
    const { P, D } = this.diagonalize(matrix);
    const n = matrix.rows;
    const fD: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      fD[i][i] = f(D.data[i][i]);
    }
    const pinv = this.inverse(P);
    if (!pinv) throw new Error('Matrix is not diagonalizable');
    const result = this.multiply(this.multiply(P, this.create(fD)), pinv);
    this._history.push({ op: 'matrixFunction' });
    return result;
  }

  sqrt(matrix: Matrix): Matrix | null {
    if (!this.isPositiveSemiDefinite(matrix)) return null;
    try {
      return this.matrixFunction(matrix, Math.sqrt);
    } catch {
      return null;
    }
  }

  log(matrix: Matrix): Matrix | null {
    if (!this.isPositiveDefinite(matrix)) return null;
    try {
      return this.matrixFunction(matrix, Math.log);
    } catch {
      return null;
    }
  }

  cos(matrix: Matrix): Matrix {
    return this.matrixFunction(matrix, Math.cos);
  }

  sin(matrix: Matrix): Matrix {
    return this.matrixFunction(matrix, Math.sin);
  }

  conditionNumber(matrix: Matrix): number {
    return this.twoNorm(matrix) * this.twoNorm(this.pseudoInverse(matrix));
  }

  spectralRadius(matrix: Matrix): number {
    const eigs = this.eigenvalues(matrix);
    return Math.max(...eigs.map(e => Math.abs(e)));
  }

  nullity(matrix: Matrix): number {
    return matrix.cols - this.rank(matrix);
  }

  rankNullityTheorem(matrix: Matrix): boolean {
    return this.rank(matrix) + this.nullity(matrix) === matrix.cols;
  }

  rowSpaceBasis(matrix: Matrix): Matrix {
    const m = matrix.data.map(row => [...row]);
    const r = this._rref(m, matrix.rows, matrix.cols);
    const basis: number[][] = [];
    for (let i = 0; i < r; i++) {
      basis.push([...m[i].slice(0, matrix.cols)]);
    }
    return this.create(basis);
  }

  columnSpaceBasis(matrix: Matrix): Matrix {
    const transposed = this.transpose(matrix);
    return this.transpose(this.rowSpaceBasis(transposed));
  }

  nullSpaceBasis(matrix: Matrix): Matrix {
    const m = matrix.data.map(row => [...row]);
    const r = this._rref(m, matrix.rows, matrix.cols);
    const n = matrix.cols;
    const pivotCols = new Set<number>();
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < n; j++) {
        if (Math.abs(m[i][j] - 1) < 1e-9) {
          pivotCols.add(j);
          break;
        }
      }
    }
    const freeCols: number[] = [];
    for (let j = 0; j < n; j++) {
      if (!pivotCols.has(j)) freeCols.push(j);
    }
    const basis: number[][] = [];
    for (const freeCol of freeCols) {
      const vec = new Array(n).fill(0);
      vec[freeCol] = 1;
      let pivotIdx = 0;
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < n; j++) {
          if (Math.abs(m[i][j] - 1) < 1e-9 && j !== freeCol) {
            vec[j] = -m[i][freeCol];
            pivotIdx++;
            break;
          }
        }
      }
      basis.push(vec);
    }
    return this.create(basis.length > 0 ? basis : [new Array(n).fill(0)]);
  }

  leftNullSpaceBasis(matrix: Matrix): Matrix {
    return this.nullSpaceBasis(this.transpose(matrix));
  }

  toPacket(): DataPacket<{
    matrices: Map<string, Matrix>;
    operations: MatrixOperation[];
    eigenPairs: EigenPair[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['high_school_math', 'MatrixAlgebra'],
      priority: 1,
      phase: 'matrix_algebra',
    };
    return {
      id: `matrix-${Date.now().toString(36)}`,
      payload: {
        matrices: this._matrices,
        operations: this._operations,
        eigenPairs: this._eigenPairs,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._matrices = new Map();
    this._operations = [];
    this._eigenPairs = [];
    this._history = [];
    this._counter = 0;
  }

  get matrixCount(): number {
    return this._matrices.size;
  }

  get operationCount(): number {
    return this._operations.length;
  }

  get eigenPairCount(): number {
    return this._eigenPairs.length;
  }
}
