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
