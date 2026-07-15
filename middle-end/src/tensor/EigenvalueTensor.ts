/**
 * 张量特征值 —— 在多维线性变换的剧场中，寻找那些只被拉伸而不被扭转的方向。
 * 特征值是矩阵的灵魂，特征向量是其肉身；
 * 当张量作用于空间，不变的方向即是真理的印记。
 */

export interface TensorEigenData {
  /** 矩阵维度 */
  dimension: number;
  /** 特征值列表 */
  eigenvalues: number[];
  /** 是否对称 */
  symmetric: boolean;
  /** 特征多项式次数 */
  degree: number;
  /** 谱半径 */
  spectralRadius: number;
  /** 是否正定 */
  positiveDefinite: boolean;
}

export interface EigenPair {
  /** 特征值 */
  value: number;
  /** 特征向量 */
  vector: number[];
  /** 代数重数 */
  algebraicMultiplicity: number;
  /** 几何重数 */
  geometricMultiplicity: number;
}

export class EigenvalueTensor {
  private _dimension: number;
  private _matrix: number[][];
  private _eigenvalues: number[];
  private _eigenvectors: number[][];
  private _symmetric: boolean;
  private _spectralRadius: number;
  private _positiveDefinite: boolean;
  private _trace: number;
  private _determinant: number;
  private _characteristicPolynomial: number[];
  private _iterations: number;

  constructor(dimension: number = 3) {
    this._dimension = dimension;
    this._matrix = [];
    for (let i = 0; i < dimension; i++) {
      const row = new Array(dimension).fill(0);
      row[i] = 1.0 + Math.random();
      this._matrix.push(row);
    }
    this._eigenvalues = [];
    this._eigenvectors = [];
    this._symmetric = true;
    this._spectralRadius = 0;
    this._positiveDefinite = false;
    this._trace = 0;
    this._determinant = 0;
    this._characteristicPolynomial = [];
    this._iterations = 0;
  }

  get dimension(): number {
    return this._dimension;
  }

  get eigenvalues(): number[] {
    return [...this._eigenvalues];
  }

  get spectralRadius(): number {
    return this._spectralRadius;
  }

  get positiveDefinite(): boolean {
    return this._positiveDefinite;
  }

  get trace(): number {
    return this._trace;
  }

  get determinant(): number {
    return this._determinant;
  }

  /** 设置矩阵，如雕刻家将大理石雕成特定的曲面 */
  public setMatrix(matrix: number[][]): boolean {
    if (matrix.length !== this._dimension) return false;
    for (const row of matrix) {
      if (row.length !== this._dimension) return false;
    }
    this._matrix = matrix.map(r => [...r]);
    this._symmetric = this._checkSymmetric();
    this._trace = this._computeTrace();
    this._determinant = this._computeDeterminant();
    return true;
  }

  /** 幂迭代法： repeatedly applying the matrix to a vector, 
   * 如同在变换的迷宫中不断前行，直至方向收敛于主导特征向量 */
  public powerIteration(maxIter: number = 1000, tol: number = 1e-10): EigenPair | null {
    let vector = new Array(this._dimension).fill(0).map(() => Math.random());
    vector = this._normalize(vector);
    let eigenvalue = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      const newVector = this._matrixVectorMultiply(this._matrix, vector);
      const newEigenvalue = this._dotProduct(newVector, vector) / this._dotProduct(vector, vector);
      const normalized = this._normalize(newVector);

      if (Math.abs(newEigenvalue - eigenvalue) < tol) {
        eigenvalue = newEigenvalue;
        vector = normalized;
        this._iterations = iter + 1;
        break;
      }
      eigenvalue = newEigenvalue;
      vector = normalized;
      this._iterations = iter + 1;
    }

    return {
      value: eigenvalue,
      vector,
      algebraicMultiplicity: 1,
      geometricMultiplicity: 1,
    };
  }

  /** QR算法：通过正交三角分解的舞蹈，让矩阵逐步显现其对角线上的灵魂 */
  public qrAlgorithm(maxIter: number = 500, tol: number = 1e-10): number[] {
    let a = this._matrix.map(r => [...r]);
    const n = this._dimension;
    this._eigenvalues = new Array(n).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
      const { q, r } = this._qrDecomposition(a);
      a = this._multiplyMatrices(r, q);
      this._iterations = iter + 1;

      let offDiagonal = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) offDiagonal += Math.abs(a[i][j]);
        }
      }
      if (offDiagonal < tol) break;
    }

    for (let i = 0; i < n; i++) {
      this._eigenvalues[i] = a[i][i];
    }

    this._spectralRadius = Math.max(...this._eigenvalues.map(Math.abs));
    this._positiveDefinite = this._eigenvalues.every(v => v > 0);
    return [...this._eigenvalues];
  }

  /** Jacobi方法：通过对称矩阵的平面旋转，逐对角化非对角元素，
   * 如同用温柔的旋转将纠结的线团一一解开 */
  public jacobiMethod(maxIter: number = 100, tol: number = 1e-10): number[] {
    if (!this._symmetric) return this.qrAlgorithm(maxIter, tol);
    const n = this._dimension;
    let a = this._matrix.map(r => [...r]);
    let v = this._identityMatrix(n);

    for (let iter = 0; iter < maxIter; iter++) {
      let maxVal = 0;
      let p = 0, q = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(a[i][j]) > maxVal) {
            maxVal = Math.abs(a[i][j]);
            p = i;
            q = j;
          }
        }
      }
      if (maxVal < tol) break;

      const tau = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
      const c = 1 / Math.sqrt(1 + t * t);
      const s = t * c;

      const app = a[p][p];
      const aqq = a[q][q];
      a[p][p] = c * c * app - 2 * c * s * a[p][q] + s * s * aqq;
      a[q][q] = s * s * app + 2 * c * s * a[p][q] + c * c * aqq;
      a[p][q] = 0;
      a[q][p] = 0;

      for (let i = 0; i < n; i++) {
        if (i !== p && i !== q) {
          const aip = a[i][p];
          const aiq = a[i][q];
          a[i][p] = c * aip - s * aiq;
          a[p][i] = a[i][p];
          a[i][q] = s * aip + c * aiq;
          a[q][i] = a[i][q];
        }
      }

      for (let i = 0; i < n; i++) {
        const vip = v[i][p];
        const viq = v[i][q];
        v[i][p] = c * vip - s * viq;
        v[i][q] = s * vip + c * viq;
      }
      this._iterations = iter + 1;
    }

    this._eigenvalues = [];
    for (let i = 0; i < n; i++) {
      this._eigenvalues.push(a[i][i]);
    }
    this._eigenvectors = v;
    this._spectralRadius = Math.max(...this._eigenvalues.map(Math.abs));
    this._positiveDefinite = this._eigenvalues.every(val => val > 0);
    return [...this._eigenvalues];
  }

  /** 特征多项式的系数计算：det(A - λI) = 0 的展开式 */
  public computeCharacteristicPolynomial(): number[] {
    const n = this._dimension;
    const coeffs = new Array(n + 1).fill(0);
    coeffs[n] = 1;

    const subMatrices = this._matrix.map(r => [...r]);
    let sign = 1;
    for (let k = n - 1; k >= 0; k--) {
      let trace = 0;
      for (let i = 0; i < n; i++) trace += subMatrices[i][i];
      coeffs[k] = sign * trace / (n - k);
      sign = -sign;

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          subMatrices[i][j] = this._matrix[i][j] - (i === j ? coeffs[k] : 0);
        }
      }
    }
    this._characteristicPolynomial = coeffs;
    return [...coeffs];
  }

  /** 谱分解：将对称矩阵分解为特征值与投影算子的和，
   * A = Σ λ_i P_i，如同将一首交响乐拆分为各个乐器的独白 */
  public spectralDecomposition(): Array<{ eigenvalue: number; projector: number[][] }> {
    if (!this._symmetric) return [];
    this.jacobiMethod();
    const result: Array<{ eigenvalue: number; projector: number[][] }> = [];

    for (let i = 0; i < this._dimension; i++) {
      const v = this._eigenvectors[i];
      const projector: number[][] = [];
      for (let r = 0; r < this._dimension; r++) {
        const row: number[] = [];
        for (let c = 0; c < this._dimension; c++) {
          row.push(v[r] * v[c]);
        }
        projector.push(row);
      }
      result.push({ eigenvalue: this._eigenvalues[i], projector });
    }
    return result;
  }

  /** 广义特征值问题：Av = λBv，在两个二次型的交织中寻找不变的方向 */
  public generalizedEigenvalues(a: number[][], b: number[][]): number[] {
    const n = this._dimension;
    const bInv = this._invertMatrix(b);
    const prod = this._multiplyMatrices(bInv, a);
    const tempMatrix = this._matrix;
    this._matrix = prod;
    const values = this.qrAlgorithm();
    this._matrix = tempMatrix;
    return values;
  }

  /** 条件数：最大与最小特征值之比，矩阵数值稳定性的敏感度量 */
  public conditionNumber(): number {
    if (this._eigenvalues.length === 0) this.qrAlgorithm();
    const absVals = this._eigenvalues.map(Math.abs).filter(v => v > 1e-12);
    if (absVals.length === 0) return Infinity;
    return Math.max(...absVals) / Math.min(...absVals);
  }

  private _checkSymmetric(): boolean {
    for (let i = 0; i < this._dimension; i++) {
      for (let j = i + 1; j < this._dimension; j++) {
        if (Math.abs(this._matrix[i][j] - this._matrix[j][i]) > 1e-10) return false;
      }
    }
    return true;
  }

  private _computeTrace(): number {
    let sum = 0;
    for (let i = 0; i < this._dimension; i++) sum += this._matrix[i][i];
    return sum;
  }

  private _computeDeterminant(): number {
    const n = this._dimension;
    const mat = this._matrix.map(r => [...r]);
    let det = 1;
    for (let i = 0; i < n; i++) {
      let pivot = mat[i][i];
      if (Math.abs(pivot) < 1e-12) {
        let swapped = false;
        for (let k = i + 1; k < n; k++) {
          if (Math.abs(mat[k][i]) > 1e-12) {
            [mat[i], mat[k]] = [mat[k], mat[i]];
            det *= -1;
            swapped = true;
            break;
          }
        }
        if (!swapped) return 0;
        pivot = mat[i][i];
      }
      det *= pivot;
      for (let j = i + 1; j < n; j++) {
        const factor = mat[j][i] / pivot;
        for (let k = i; k < n; k++) {
          mat[j][k] -= factor * mat[i][k];
        }
      }
    }
    return det;
  }

  private _normalize(v: number[]): number[] {
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    if (norm < 1e-12) return v;
    return v.map(x => x / norm);
  }

  private _dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, x, i) => sum + x * (b[i] || 0), 0);
  }

  private _matrixVectorMultiply(m: number[][], v: number[]): number[] {
    return m.map(row => row.reduce((sum, x, i) => sum + x * (v[i] || 0), 0));
  }

  private _identityMatrix(n: number): number[][] {
    const mat: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      row[i] = 1;
      mat.push(row);
    }
    return mat;
  }

  private _qrDecomposition(a: number[][]): { q: number[][]; r: number[][] } {
    const n = a.length;
    const q = this._identityMatrix(n);
    let r = a.map(r => [...r]);

    for (let k = 0; k < n - 1; k++) {
      const x = r.slice(k).map(row => row[k]);
      const normX = Math.sqrt(x.reduce((s, v) => s + v * v, 0));
      if (normX < 1e-12) continue;
      const u = [...x];
      u[0] += Math.sign(u[0]) * normX;
      const normU = Math.sqrt(u.reduce((s, v) => s + v * v, 0));
      const vVec = u.map(val => val / normU);

      for (let j = k; j < n; j++) {
        let dot = 0;
        for (let i = 0; i < x.length; i++) dot += vVec[i] * r[k + i][j];
        for (let i = 0; i < x.length; i++) r[k + i][j] -= 2 * vVec[i] * dot;
      }

      for (let j = 0; j < n; j++) {
        let dot = 0;
        for (let i = 0; i < x.length; i++) dot += vVec[i] * q[j][k + i];
        for (let i = 0; i < x.length; i++) q[j][k + i] -= 2 * vVec[i] * dot;
      }
    }

    return { q: this._transpose(q), r };
  }

  private _multiplyMatrices(a: number[][], b: number[][]): number[][] {
    const rows = a.length;
    const cols = b[0]?.length || 0;
    const inner = a[0]?.length || 0;
    const result: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        let sum = 0;
        for (let k = 0; k < inner; k++) sum += a[i][k] * b[k][j];
        row.push(sum);
      }
      result.push(row);
    }
    return result;
  }

  private _transpose(m: number[][]): number[][] {
    const rows = m.length;
    const cols = m[0]?.length || 0;
    const t: number[][] = [];
    for (let j = 0; j < cols; j++) {
      const row: number[] = [];
      for (let i = 0; i < rows; i++) row.push(m[i][j]);
      t.push(row);
    }
    return t;
  }

  private _invertMatrix(m: number[][]): number[][] {
    const n = m.length;
    const aug: number[][] = [];
    for (let i = 0; i < n; i++) {
      aug.push([...m[i], ...this._identityMatrix(n)[i]]);
    }
    for (let i = 0; i < n; i++) {
      let pivot = aug[i][i];
      if (Math.abs(pivot) < 1e-12) pivot = 1e-12;
      for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        const factor = aug[k][i];
        for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
      }
    }
    return aug.map(row => row.slice(n));
  }

  public report(): TensorEigenData {
    return {
      dimension: this._dimension,
      eigenvalues: [...this._eigenvalues],
      symmetric: this._symmetric,
      degree: this._dimension,
      spectralRadius: this._spectralRadius,
      positiveDefinite: this._positiveDefinite,
    };
  }

  public reset(): void {
    this._eigenvalues = [];
    this._eigenvectors = [];
    this._spectralRadius = 0;
    this._positiveDefinite = false;
    this._iterations = 0;
    this._characteristicPolynomial = [];
  }
}
