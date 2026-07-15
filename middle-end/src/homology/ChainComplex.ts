/**
 * 链复形 —— 同调论的基石，如同在维度的阶梯上排列的代数宫殿。
 * ... → C_{n+1} → C_n → C_{n-1} → ...，边界算子 ∂ 的两次作用为零；
 * 在 ∂∂ = 0 的静默誓言中，闭链与边缘链的舞蹈展开了同调群。
 */

export interface ChainComplexData {
  /** 最高维数 */
  maxDimension: number;
  /** 链群维数列表 */
  chainRanks: number[];
  /** 边界矩阵的秩 */
  boundaryRanks: number[];
  /** 同调群维数 */
  homologyRanks: number[];
  /** 是否正合 */
  exact: boolean;
}

export interface ChainGroup {
  dimension: number;
  rank: number;
  generators: number[][];
}

export class ChainComplex {
  private _maxDimension: number;
  private _chainGroups: Map<number, ChainGroup>;
  private _boundaryOperators: Map<number, number[][]>;
  private _homologyRanks: Map<number, number>;
  private _exact: boolean;
  private _cycles: Map<number, number[][]>;
  private _boundaries: Map<number, number[][]>;
  private _augmentation: number[];

  constructor(maxDimension: number = 3) {
    this._maxDimension = maxDimension;
    this._chainGroups = new Map();
    this._boundaryOperators = new Map();
    this._homologyRanks = new Map();
    this._exact = false;
    this._cycles = new Map();
    this._boundaries = new Map();
    this._augmentation = [];

    for (let n = 0; n <= maxDimension; n++) {
      const rank = Math.pow(2, n);
      const generators: number[][] = [];
      for (let i = 0; i < rank; i++) {
        generators.push(new Array(rank).fill(0).map((_, j) => (i === j ? 1 : 0)));
      }
      this._chainGroups.set(n, { dimension: n, rank, generators });

      if (n > 0) {
        const boundaryMat = this._initializeBoundaryMatrix(rank, this._chainGroups.get(n - 1)!.rank);
        this._boundaryOperators.set(n, boundaryMat);
      }
    }
  }

  get maxDimension(): number {
    return this._maxDimension;
  }

  get exact(): boolean {
    return this._exact;
  }

  get chainGroupCount(): number {
    return this._chainGroups.size;
  }

  /** 设置链群的秩 */
  public setChainRank(n: number, rank: number): boolean {
    if (n < 0 || n > this._maxDimension) return false;
    const generators: number[][] = [];
    for (let i = 0; i < rank; i++) {
      generators.push(new Array(rank).fill(0).map((_, j) => (i === j ? 1 : 0)));
    }
    this._chainGroups.set(n, { dimension: n, rank, generators });
    return true;
  }

  /** 设置边界算子矩阵：∂_n: C_n → C_{n-1} */
  public setBoundaryOperator(n: number, matrix: number[][]): boolean {
    if (n <= 0 || n > this._maxDimension) return false;
    const prevRank = this._chainGroups.get(n - 1)?.rank || 0;
    if (matrix.length !== prevRank) return false;
    this._boundaryOperators.set(n, matrix.map(r => [...r]));
    return true;
  }

  /** 计算边界：∂_n(c)，对链 c 应用边界算子 */
  public boundary(n: number, chain: number[]): number[] {
    const mat = this._boundaryOperators.get(n);
    if (!mat) return [];
    const result: number[] = [];
    for (let i = 0; i < mat.length; i++) {
      let sum = 0;
      for (let j = 0; j < mat[i].length; j++) {
        sum += mat[i][j] * (chain[j] || 0);
      }
      result.push(sum);
    }
    return result;
  }

  /** 验证 ∂∂ = 0：边界算子的平方为零 */
  public verifyBoundarySquared(): boolean {
    for (let n = 2; n <= this._maxDimension; n++) {
      const d1 = this._boundaryOperators.get(n);
      const d0 = this._boundaryOperators.get(n - 1);
      if (!d1 || !d0) continue;
      const composed = this._multiplyMatrices(d0, d1);
      for (const row of composed) {
        for (const val of row) {
          if (Math.abs(val) > 1e-10) return false;
        }
      }
    }
    return true;
  }

  /** 计算 n-闭链空间：Z_n = ker(∂_n) */
  public computeCycles(n: number): number[][] {
    const mat = this._boundaryOperators.get(n);
    if (!mat) {
      const rank = this._chainGroups.get(n)?.rank || 0;
      const identity: number[][] = [];
      for (let i = 0; i < rank; i++) {
        identity.push(new Array(rank).fill(0).map((_, j) => (i === j ? 1 : 0)));
      }
      this._cycles.set(n, identity);
      return identity;
    }
    const kernel = this._computeKernel(mat);
    this._cycles.set(n, kernel);
    return kernel;
  }

  /** 计算 n-边缘空间：B_n = im(∂_{n+1}) */
  public computeBoundaries(n: number): number[][] {
    const mat = this._boundaryOperators.get(n + 1);
    if (!mat) {
      this._boundaries.set(n, []);
      return [];
    }
    const image = this._computeImage(mat);
    this._boundaries.set(n, image);
    return image;
  }

  /** 计算 n-同调群：H_n = Z_n / B_n */
  public computeHomology(n: number): number {
    const cycles = this.computeCycles(n);
    const boundaries = this.computeBoundaries(n);
    const rankZ = this._rankOfMatrix(cycles);
    const rankB = this._rankOfMatrix(boundaries);
    const rankH = rankZ - rankB;
    this._homologyRanks.set(n, Math.max(0, rankH));
    return Math.max(0, rankH);
  }

  /** 计算所有同调群 */
  public computeAllHomology(): number[] {
    const result: number[] = [];
    for (let n = 0; n <= this._maxDimension; n++) {
      result.push(this.computeHomology(n));
    }
    return result;
  }

  /** 检查在维数 n 是否正合：im(∂_{n+1}) = ker(∂_n) */
  public isExactAt(n: number): boolean {
    const boundaries = this.computeBoundaries(n);
    const cycles = this.computeCycles(n);
    const rankB = this._rankOfMatrix(boundaries);
    const rankZ = this._rankOfMatrix(cycles);
    return Math.abs(rankB - rankZ) < 1e-10;
  }

  /** 计算增广映射 ε: C_0 → ℤ 的核 */
  public computeAugmentedHomology(): number {
    const c0 = this._chainGroups.get(0);
    if (!c0) return 0;
    const reduced = Math.max(0, this.computeHomology(0) - 1);
    this._homologyRanks.set(0, reduced);
    return reduced;
  }

  /** 构造锥复形：对复形 C 构造锥 CC，使 H_n(CC) = 0 */
  public coneComplex(): ChainComplex {
    const cone = new ChainComplex(this._maxDimension + 1);
    for (let n = 0; n <= this._maxDimension + 1; n++) {
      const cRank = this._chainGroups.get(n)?.rank || 0;
      const cPrevRank = this._chainGroups.get(n - 1)?.rank || 0;
      cone.setChainRank(n, cRank + cPrevRank);
    }
    return cone;
  }

  /** 构造悬挂：ΣC，将复形向上提升一维 */
  public suspension(): ChainComplex {
    const susp = new ChainComplex(this._maxDimension + 1);
    for (let n = 1; n <= this._maxDimension + 1; n++) {
      const cRank = this._chainGroups.get(n - 1)?.rank || 0;
      susp.setChainRank(n, cRank);
    }
    return susp;
  }

  /** 张量积复形：(C ⊗ D)_n = ⊕_{i+j=n} C_i ⊗ D_j */
  public tensorProduct(other: ChainComplex): ChainComplex {
    const maxDim = this._maxDimension + other._maxDimension;
    const product = new ChainComplex(maxDim);
    for (let n = 0; n <= maxDim; n++) {
      let rank = 0;
      for (let i = 0; i <= n; i++) {
        const j = n - i;
        const rankI = this._chainGroups.get(i)?.rank || 0;
        const rankJ = other._chainGroups.get(j)?.rank || 0;
        rank += rankI * rankJ;
      }
      product.setChainRank(n, rank);
    }
    return product;
  }

  /** 计算欧拉示性数：χ = Σ (-1)^n rank(C_n) */
  public eulerCharacteristic(): number {
    let chi = 0;
    for (let n = 0; n <= this._maxDimension; n++) {
      const rank = this._chainGroups.get(n)?.rank || 0;
      chi += Math.pow(-1, n) * rank;
    }
    return chi;
  }

  /** 计算贝蒂数：b_n = rank(H_n) */
  public bettiNumber(n: number): number {
    if (!this._homologyRanks.has(n)) {
      this.computeHomology(n);
    }
    return this._homologyRanks.get(n) || 0;
  }

  private _initializeBoundaryMatrix(rows: number, cols: number): number[][] {
    const mat: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row = new Array(cols).fill(0);
      for (let j = 0; j < cols; j++) {
        row[j] = (i + j) % 2 === 0 ? 1 : 0;
      }
      mat.push(row);
    }
    return mat;
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

  private _computeKernel(matrix: number[][]): number[][] {
    const cols = matrix[0]?.length || 0;
    const kernel: number[][] = [];
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let i = 0; i < matrix.length; i++) sum += matrix[i][j] * matrix[i][j];
      if (sum < 1e-10) {
        const vec = new Array(cols).fill(0);
        vec[j] = 1;
        kernel.push(vec);
      }
    }
    return kernel.length > 0 ? kernel : [new Array(cols).fill(0)];
  }

  private _computeImage(matrix: number[][]): number[][] {
    return matrix.map(r => [...r]);
  }

  private _rankOfMatrix(matrix: number[][]): number {
    if (matrix.length === 0) return 0;
    const mat = matrix.map(r => [...r]);
    const rows = mat.length;
    const cols = mat[0].length;
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
    return rank;
  }

  public report(): ChainComplexData {
    const chainRanks: number[] = [];
    const boundaryRanks: number[] = [];
    const homologyRanks: number[] = [];
    for (let n = 0; n <= this._maxDimension; n++) {
      chainRanks.push(this._chainGroups.get(n)?.rank || 0);
      boundaryRanks.push(this._rankOfMatrix(this._boundaryOperators.get(n) || []));
      homologyRanks.push(this._homologyRanks.get(n) || 0);
    }
    return {
      maxDimension: this._maxDimension,
      chainRanks,
      boundaryRanks,
      homologyRanks,
      exact: this._exact,
    };
  }

  public reset(): void {
    this._boundaryOperators.clear();
    this._homologyRanks.clear();
    this._exact = false;
    this._cycles.clear();
    this._boundaries.clear();
  }
}
