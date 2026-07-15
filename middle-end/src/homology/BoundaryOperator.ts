/**
 * 边缘算子 —— 链复形中的微分，如同在时间中雕刻边界的无形之刃。
 * ∂: C_n → C_{n-1}，它将单形映为其面之和，符号交错以定向；
 * 在 ∂∂ = 0 的永恒誓言中，几何的拓扑被转译为代数的呼吸。
 */

export interface BoundaryData {
  /** 定义域维数 */
  domainDimension: number;
  /** 值域维数 */
  codomainDimension: number;
  /** 矩阵秩 */
  rank: number;
  /** 核维数 */
  nullity: number;
  /** 是否幂零（∂²=0） */
  nilpotent: boolean;
}

export interface Simplex {
  /** 顶点列表 */
  vertices: number[];
  /** 维数 */
  dimension: number;
  /** 定向 */
  orientation: number;
}

export class BoundaryOperator {
  private _domainDimension: number;
  private _codomainDimension: number;
  private _matrix: number[][];
  private _rank: number;
  private _nullity: number;
  private _nilpotent: boolean;
  private _simplices: Map<number, Simplex[]>;
  private _boundaryCache: Map<string, number[]>;
  private _signCache: Map<string, number>;

  constructor(domainDim: number = 3, codomainDim: number = 2) {
    this._domainDimension = domainDim;
    this._codomainDimension = codomainDim;
    this._matrix = [];
    this._rank = 0;
    this._nullity = 0;
    this._nilpotent = false;
    this._simplices = new Map();
    this._boundaryCache = new Map();
    this._signCache = new Map();

    this._initializeSimplices();
    this._buildMatrix();
  }

  get domainDimension(): number {
    return this._domainDimension;
  }

  get codomainDimension(): number {
    return this._codomainDimension;
  }

  get rank(): number {
    return this._rank;
  }

  get nullity(): number {
    return this._nullity;
  }

  get nilpotent(): boolean {
    return this._nilpotent;
  }

  /** 初始化标准单形集合 */
  private _initializeSimplices(): void {
    for (let d = 0; d <= this._domainDimension; d++) {
      const simplices: Simplex[] = [];
      const count = d + 1;
      for (let i = 0; i < count; i++) {
        simplices.push({
          vertices: Array.from({ length: d + 1 }, (_, j) => j),
          dimension: d,
          orientation: 1,
        });
      }
      this._simplices.set(d, simplices);
    }
  }

  /** 从单形数据构建边缘算子矩阵 */
  private _buildMatrix(): void {
    const rows = this._countSimplices(this._codomainDimension);
    const cols = this._countSimplices(this._domainDimension);
    this._matrix = [];
    for (let i = 0; i < rows; i++) {
      this._matrix.push(new Array(cols).fill(0));
    }

    const domainSimplices = this._simplices.get(this._domainDimension) || [];
    const codomainSimplices = this._simplices.get(this._codomainDimension) || [];

    for (let j = 0; j < domainSimplices.length; j++) {
      const simplex = domainSimplices[j];
      const boundary = this._computeSimplexBoundary(simplex);
      for (const [faceIdx, coeff] of boundary) {
        const row = faceIdx % rows;
        this._matrix[row][j] = coeff;
      }
    }

    this._computeRankAndNullity();
  }

  /** 计算单形的定向边界：Σ (-1)^i [v_0, ..., v̂_i, ..., v_n] */
  public computeSimplexBoundary(simplex: Simplex): Array<[number, number]> {
    const cacheKey = simplex.vertices.join(',');
    if (this._boundaryCache.has(cacheKey)) {
      const cached = this._boundaryCache.get(cacheKey)!;
      return cached.map((val, idx) => [idx, val]).filter(([_, v]) => v !== 0) as Array<[number, number]>;
    }

    const boundary: Array<[number, number]> = [];
    for (let i = 0; i < simplex.vertices.length; i++) {
      const sign = Math.pow(-1, i) * simplex.orientation;
      const faceVertices = [...simplex.vertices.slice(0, i), ...simplex.vertices.slice(i + 1)];
      const faceIdx = this._findSimplexIndex(faceVertices, simplex.dimension - 1);
      if (faceIdx >= 0) {
        boundary.push([faceIdx, sign]);
      }
    }

    const cached = new Array(this._countSimplices(simplex.dimension - 1)).fill(0);
    for (const [idx, coeff] of boundary) {
      cached[idx] = coeff;
    }
    this._boundaryCache.set(cacheKey, cached);
    return boundary;
  }

  /** 应用边缘算子于链 */
  public apply(chain: number[]): number[] {
    const result: number[] = new Array(this._matrix.length).fill(0);
    for (let i = 0; i < this._matrix.length; i++) {
      let sum = 0;
      for (let j = 0; j < this._matrix[i].length; j++) {
        sum += this._matrix[i][j] * (chain[j] || 0);
      }
      result[i] = sum;
    }
    return result;
  }

  /** 验证幂零性：∂ ∘ ∂ = 0 */
  public verifyNilpotent(nextBoundary: BoundaryOperator): boolean {
    const composed = this._multiplyMatrices(this._matrix, nextBoundary._matrix);
    for (const row of composed) {
      for (const val of row) {
        if (Math.abs(val) > 1e-10) {
          this._nilpotent = false;
          return false;
        }
      }
    }
    this._nilpotent = true;
    return true;
  }

  /** 计算单形的定向符号 */
  public orientationSign(permutation: number[]): number {
    const key = permutation.join(',');
    if (this._signCache.has(key)) return this._signCache.get(key)!;
    let inversions = 0;
    for (let i = 0; i < permutation.length; i++) {
      for (let j = i + 1; j < permutation.length; j++) {
        if (permutation[i] > permutation[j]) inversions++;
      }
    }
    const sign = inversions % 2 === 0 ? 1 : -1;
    this._signCache.set(key, sign);
    return sign;
  }

  /** 计算链的边界 */
  public boundaryOfChain(chain: number[], simplices: Simplex[]): number[] {
    const result: number[] = [];
    for (let i = 0; i < chain.length; i++) {
      const coeff = chain[i];
      if (Math.abs(coeff) < 1e-10) continue;
      const simplex = simplices[i];
      if (!simplex) continue;
      const faceBoundary = this.computeSimplexBoundary(simplex);
      for (const [faceIdx, faceCoeff] of faceBoundary) {
        while (result.length <= faceIdx) result.push(0);
        result[faceIdx] += coeff * faceCoeff;
      }
    }
    return result;
  }

  /** 判断链是否为闭链：∂(c) = 0 */
  public isCycle(chain: number[]): boolean {
    const result = this.apply(chain);
    return result.every(v => Math.abs(v) < 1e-10);
  }

  /** 判断链是否为边缘：c = ∂(d) */
  public isBoundary(chain: number[]): boolean {
    return this.isCycle(chain);
  }

  /** 计算边缘算子的转置：用于上同调 */
  public transpose(): number[][] {
    const rows = this._matrix[0]?.length || 0;
    const cols = this._matrix.length;
    const transposed: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push(this._matrix[j][i]);
      }
      transposed.push(row);
    }
    return transposed;
  }

  /** 将矩阵化为Smith标准形（简化版）：对角化以计算不变因子 */
  public smithNormalForm(): number[][] {
    const mat = this._matrix.map(r => [...r]);
    const rows = mat.length;
    const cols = mat[0]?.length || 0;
    const minDim = Math.min(rows, cols);

    for (let i = 0; i < minDim; i++) {
      let pivot = mat[i][i];
      if (Math.abs(pivot) < 1e-10) {
        for (let k = i + 1; k < rows; k++) {
          if (Math.abs(mat[k][i]) > 1e-10) {
            [mat[i], mat[k]] = [mat[k], mat[i]];
            pivot = mat[i][i];
            break;
          }
        }
      }
      if (Math.abs(pivot) < 1e-10) continue;

      for (let j = 0; j < cols; j++) {
        mat[i][j] = Math.round(mat[i][j] / pivot);
      }
      for (let k = 0; k < rows; k++) {
        if (k === i) continue;
        const factor = mat[k][i];
        for (let j = 0; j < cols; j++) {
          mat[k][j] -= factor * mat[i][j];
        }
      }
    }
    return mat;
  }

  /** 计算挠系数：Smith标准形对角线上的大于1的元素 */
  public torsionCoefficients(): number[] {
    const smith = this.smithNormalForm();
    const coeffs: number[] = [];
    const minDim = Math.min(smith.length, smith[0]?.length || 0);
    for (let i = 0; i < minDim; i++) {
      const val = Math.abs(Math.round(smith[i][i]));
      if (val > 1) coeffs.push(val);
    }
    return coeffs;
  }

  /** 计算边缘算子的迹 */
  public trace(): number {
    let tr = 0;
    const minDim = Math.min(this._matrix.length, this._matrix[0]?.length || 0);
    for (let i = 0; i < minDim; i++) {
      tr += this._matrix[i][i];
    }
    return tr;
  }

  private _countSimplices(dimension: number): number {
    return Math.max(1, dimension + 1);
  }

  private _findSimplexIndex(vertices: number[], dimension: number): number {
    const simplices = this._simplices.get(dimension) || [];
    for (let i = 0; i < simplices.length; i++) {
      if (this._arraysEqual(simplices[i].vertices, vertices)) return i;
    }
    return vertices.reduce((a, b) => a + b, 0) % Math.max(1, simplices.length);
  }

  private _arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
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

  private _computeRankAndNullity(): void {
    const mat = this._matrix.map(r => [...r]);
    const rows = mat.length;
    const cols = mat[0]?.length || 0;
    const minDim = Math.min(rows, cols);
    let rank = 0;
    const threshold = 1e-10;

    for (let i = 0; i < minDim; i++) {
      let pivot = mat[i][i];
      if (Math.abs(pivot) < threshold) {
        let swapped = false;
        for (let k = i + 1; k < rows; k++) {
          if (Math.abs(mat[k][i]) > threshold) {
            [mat[i], mat[k]] = [mat[k], mat[i]];
            swapped = true;
            break;
          }
        }
        if (!swapped) continue;
        pivot = mat[i][i];
      }
      rank++;
      for (let j = i + 1; j < rows; j++) {
        const factor = mat[j][i] / pivot;
        for (let k = i; k < cols; k++) mat[j][k] -= factor * mat[i][k];
      }
    }
    this._rank = rank;
    this._nullity = cols - rank;
  }

  public report(): BoundaryData {
    return {
      domainDimension: this._domainDimension,
      codomainDimension: this._codomainDimension,
      rank: this._rank,
      nullity: this._nullity,
      nilpotent: this._nilpotent,
    };
  }

  public reset(): void {
    this._matrix = [];
    this._rank = 0;
    this._nullity = 0;
    this._nilpotent = false;
    this._boundaryCache.clear();
    this._signCache.clear();
  }
}
