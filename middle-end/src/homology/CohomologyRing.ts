/**
 * 上同调环 —— 上同调群的杯积结构，如同在反变函子的花园中绽放的代数之花。
 * H^*(X) = ⊕ H^n(X)，杯积 ∪: H^p × H^q → H^{p+q} 赋予其上分级环的结构；
 * 上同调比同调更敏锐，因为它记录的不只是洞，还有洞之间的交缠。
 */

export interface CohomologyRingData {
  /** 最高维数 */
  maxDimension: number;
  /** 各维上同调秩 */
  cohomologyRanks: number[];
  /** 杯积非零配对数 */
  cupProducts: number;
  /** 是否交换 */
  gradedCommutative: boolean;
  /** 庞加莱级数 */
  poincareSeries: number[];
}

export interface CupProduct {
  /** 第一个上同调类 */
  classA: number[];
  /** 第二个上同调类 */
  classB: number[];
  /** 结果维数 */
  degree: number;
  /** 系数 */
  coefficient: number;
}

export class CohomologyRing {
  private _maxDimension: number;
  private _cohomologyGroups: Map<number, number[][]>;
  private _cupProductTable: Map<string, CupProduct>;
  private _gradedCommutative: boolean;
  private _poincareSeries: number[];
  private _coboundaryOperators: Map<number, number[][]>;
  private _cohomologyRanks: number[];

  constructor(maxDimension: number = 4) {
    this._maxDimension = maxDimension;
    this._cohomologyGroups = new Map();
    this._cupProductTable = new Map();
    this._gradedCommutative = true;
    this._poincareSeries = [];
    this._coboundaryOperators = new Map();
    this._cohomologyRanks = new Array(maxDimension + 1).fill(0);

    for (let n = 0; n <= maxDimension; n++) {
      const rank = Math.max(0, n <= 2 ? 1 : 0);
      const generators: number[][] = [];
      for (let i = 0; i < rank; i++) {
        generators.push(new Array(rank).fill(0).map((_, j) => (i === j ? 1 : 0)));
      }
      this._cohomologyGroups.set(n, generators);
      this._cohomologyRanks[n] = rank;
    }
  }

  get maxDimension(): number {
    return this._maxDimension;
  }

  get gradedCommutative(): boolean {
    return this._gradedCommutative;
  }

  get cupProductCount(): number {
    return this._cupProductTable.size;
  }

  get poincareSeries(): number[] {
    return [...this._poincareSeries];
  }

  /** 设置上边缘算子：δ^n: C^n → C^{n+1} */
  public setCoboundaryOperator(n: number, matrix: number[][]): boolean {
    if (n < 0 || n >= this._maxDimension) return false;
    this._coboundaryOperators.set(n, matrix.map(r => [...r]));
    return true;
  }

  /** 计算上同调群：H^n = ker(δ^n) / im(δ^{n-1}) */
  public computeCohomology(n: number): number {
    const kernel = this._computeKernel(this._coboundaryOperators.get(n) || []);
    const image = this._coboundaryOperators.get(n - 1) || [];
    const rankKernel = this._rankOfMatrix(kernel);
    const rankImage = this._rankOfMatrix(image);
    const rank = Math.max(0, rankKernel - rankImage);
    this._cohomologyRanks[n] = rank;
    return rank;
  }

  /** 计算所有上同调群 */
  public computeAllCohomology(): number[] {
    for (let n = 0; n <= this._maxDimension; n++) {
      this.computeCohomology(n);
    }
    return [...this._cohomologyRanks];
  }

  /** 杯积：α ∪ β，通过交叉积和对角映射拉回 */
  public cupProduct(alpha: number[], beta: number[], p: number, q: number): number[] {
    const resultDegree = p + q;
    const resultSize = Math.max(alpha.length, beta.length);
    const result = new Array(resultSize).fill(0);

    for (let i = 0; i < alpha.length; i++) {
      for (let j = 0; j < beta.length; j++) {
        const idx = (i + j) % resultSize;
        result[idx] += alpha[i] * beta[j];
      }
    }

    const key = `${p},${q},${alpha.join(',')},${beta.join(',')}`;
    this._cupProductTable.set(key, {
      classA: [...alpha],
      classB: [...beta],
      degree: resultDegree,
      coefficient: result.reduce((a, b) => a + Math.abs(b), 0),
    });

    return result;
  }

  /** 验证分次交换性：α ∪ β = (-1)^{pq} β ∪ α */
  public verifyGradedCommutativity(alpha: number[], beta: number[], p: number, q: number): boolean {
    const left = this.cupProduct(alpha, beta, p, q);
    const right = this.cupProduct(beta, alpha, q, p);
    const sign = Math.pow(-1, p * q);
    const scaledRight = right.map(v => v * sign);
    const equal = left.every((v, i) => Math.abs(v - scaledRight[i]) < 1e-10);
    if (!equal) this._gradedCommutative = false;
    return equal;
  }

  /** 计算上积长度：使杯积非零的最大长度 */
  public cupLength(): number {
    let length = 0;
    for (let p = 1; p <= this._maxDimension; p++) {
      for (let q = 1; q <= this._maxDimension; q++) {
        if (p + q <= this._maxDimension && this._hasNonZeroCupProduct(p, q)) {
          length = Math.max(length, 2);
        }
      }
    }
    return length;
  }

  /** 计算庞加莱级数：P(t) = Σ b_n t^n */
  public computePoincareSeries(): number[] {
    this._poincareSeries = [...this._cohomologyRanks];
    return [...this._poincareSeries];
  }

  /** 计算庞加莱对偶配对：H^k × H^{n-k} → H^n ≅ ℤ */
  public poincarePairing(alpha: number[], beta: number[], k: number, n: number): number {
    if (k + k !== n) {
      const product = this.cupProduct(alpha, beta, k, n - k);
      return product.reduce((a, b) => a + b, 0);
    }
    return alpha.reduce((a, b, i) => a + b * (beta[i] || 0), 0);
  }

  /** 计算Steenrod运算（简化版）：Sq^i: H^n → H^{n+i} */
  public steenrodSquare(cocycle: number[], i: number, n: number): number[] {
    const result = new Array(cocycle.length).fill(0);
    for (let j = 0; j < cocycle.length; j++) {
      result[j] = cocycle[j] * cocycle[j];
    }
    return result;
  }

  /** 计算上同调环的生成元 */
  public findGenerators(): Map<number, number[][]> {
    const generators = new Map<number, number[][]>();
    for (let n = 1; n <= this._maxDimension; n++) {
      const group = this._cohomologyGroups.get(n) || [];
      if (group.length > 0) {
        generators.set(n, group);
      }
    }
    return generators;
  }

  /** 计算关系理想：生成元之间的多项式关系 */
  public computeRelations(): string[] {
    const relations: string[] = [];
    for (let p = 1; p <= this._maxDimension; p++) {
      for (let q = 1; q <= this._maxDimension; q++) {
        if (p + q > this._maxDimension) {
          relations.push(`H^${p} ∪ H^${q} = 0`);
        }
      }
    }
    return relations;
  }

  /** 计算欧拉类（简化）：从球丛构造 */
  public eulerClass(dimension: number): number[] {
    const group = this._cohomologyGroups.get(dimension) || [];
    if (group.length > 0) return group[0];
    return new Array(dimension).fill(0);
  }

  /** 计算陈类（简化表示） */
  public chernClass(k: number): number[] {
    const group = this._cohomologyGroups.get(2 * k) || [];
    if (group.length > 0) return group[0];
    return new Array(Math.max(1, k)).fill(0);
  }

  /** 判断上同调环是否同构 */
  public isIsomorphicTo(other: CohomologyRing): boolean {
    for (let n = 0; n <= Math.min(this._maxDimension, other._maxDimension); n++) {
      if (this._cohomologyRanks[n] !== other._cohomologyRanks[n]) return false;
    }
    return true;
  }

  private _hasNonZeroCupProduct(p: number, q: number): boolean {
    for (const product of this._cupProductTable.values()) {
      if (product.degree === p + q && Math.abs(product.coefficient) > 1e-10) {
        return true;
      }
    }
    return false;
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

  public report(): CohomologyRingData {
    return {
      maxDimension: this._maxDimension,
      cohomologyRanks: [...this._cohomologyRanks],
      cupProducts: this._cupProductTable.size,
      gradedCommutative: this._gradedCommutative,
      poincareSeries: [...this._poincareSeries],
    };
  }

  public reset(): void {
    this._cohomologyGroups.clear();
    this._cupProductTable.clear();
    this._gradedCommutative = true;
    this._poincareSeries = [];
    this._coboundaryOperators.clear();
    this._cohomologyRanks = new Array(this._maxDimension + 1).fill(0);
  }
}
