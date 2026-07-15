/**
 * 张量分解 —— 如诗人拆解月光，将多维的幽暗展开为秩一的咏叹。
 * 在指标的森林中，CP分解与Tucker分解是两条隐秘的小径，
 * 通向数据最本质的骨骼与呼吸。
 */

export interface DecompositionData {
  /** 原张量的阶数 */
  order: number;
  /** 各模态的维度 */
  dimensions: number[];
  /** 分解的秩 */
  rank: number;
  /** 分解残差的Frobenius范数 */
  residual: number;
  /** 迭代次数 */
  iterations: number;
  /** 是否收敛 */
  converged: boolean;
}

export interface FactorMatrix {
  /** 模态索引 */
  mode: number;
  /** 因子矩阵数据 */
  data: number[][];
  /** 列数（成分数） */
  components: number;
}

export class TensorDecomposition {
  private _order: number;
  private _dimensions: number[];
  private _rank: number;
  private _factors: FactorMatrix[];
  private _core: number[];
  private _residual: number;
  private _iterations: number;
  private _converged: boolean;
  private _lambda: number[];
  private _tolerance: number;
  private _maxIter: number;

  constructor(dimensions: number[], rank: number = 3) {
    this._order = dimensions.length;
    this._dimensions = [...dimensions];
    this._rank = rank;
    this._factors = [];
    this._core = [];
    this._residual = Infinity;
    this._iterations = 0;
    this._converged = false;
    this._lambda = new Array(rank).fill(1.0);
    this._tolerance = 1e-6;
    this._maxIter = 500;

    for (let mode = 0; mode < this._order; mode++) {
      const rows = this._dimensions[mode];
      const mat: number[][] = [];
      for (let i = 0; i < rows; i++) {
        const row: number[] = [];
        for (let r = 0; r < rank; r++) {
          row.push(Math.random());
        }
        mat.push(row);
      }
      this._factors.push({ mode, data: mat, components: rank });
    }
  }

  get order(): number {
    return this._order;
  }

  get rank(): number {
    return this._rank;
  }

  get residual(): number {
    return this._residual;
  }

  get iterations(): number {
    return this._iterations;
  }

  get converged(): boolean {
    return this._converged;
  }

  /** 初始化核心张量为单位超对角 */
  public initializeCore(): void {
    const coreSize = Math.pow(this._rank, this._order);
    this._core = new Array(coreSize).fill(0);
    for (let i = 0; i < this._rank; i++) {
      let idx = i;
      for (let d = 1; d < this._order; d++) {
        idx = idx * this._rank + i;
      }
      this._core[idx] = 1.0;
    }
  }

  /** Khatri-Rao积：两条河流的交汇，因子矩阵的灵性相遇 */
  public khatriRao(a: number[][], b: number[][]): number[][] {
    const rowsA = a.length;
    const rowsB = b.length;
    const cols = a[0]?.length || 0;
    const result: number[][] = [];
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < rowsB; j++) {
        const row: number[] = [];
        for (let k = 0; k < cols; k++) {
          row.push(a[i][k] * b[j][k]);
        }
        result.push(row);
      }
    }
    return result;
  }

  /** 矩阵的Moore-Penrose伪逆，如月光穿透薄雾的逆旅 */
  public pseudoInverse(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    const transpose = this._transpose(matrix);
    const gram = this._multiplyMatrices(transpose, matrix);
    const inv = this._invertSymmetric(gram);
    return this._multiplyMatrices(inv, transpose);
  }

  /** CP分解的ALS迭代：交替最小二乘，如同在指标的迷宫中轮流点亮烛火 */
  public cpDecompose(tensor: number[], maxIter?: number): DecompositionData {
    const maxIterations = maxIter ?? this._maxIter;
    let prevResidual = Infinity;

    for (let iter = 0; iter < maxIterations; iter++) {
      for (let mode = 0; mode < this._order; mode++) {
        let hadamardProduct: number[][] = [];
        let first = true;

        for (let other = 0; other < this._order; other++) {
          if (other === mode) continue;
          const factor = this._factors[other].data;
          const gram = this._gramMatrix(factor);
          if (first) {
            hadamardProduct = gram;
            first = false;
          } else {
            hadamardProduct = this._hadamard(hadamardProduct, gram);
          }
        }

        const kr = this._buildKhatriRaoExcluding(mode);
        const matricized = this._matricize(tensor, mode);
        const pseudo = this.pseudoInverse(hadamardProduct);
        const update = this._multiplyMatrices(this._multiplyMatrices(matricized, kr), pseudo);
        this._factors[mode].data = update;

        this._normalizeFactor(mode);
      }

      const approx = this.reconstructCP();
      this._residual = this._frobeniusDiff(tensor, approx);
      this._iterations = iter + 1;

      if (Math.abs(prevResidual - this._residual) < this._tolerance) {
        this._converged = true;
        break;
      }
      prevResidual = this._residual;
    }

    return this.report();
  }

  /** Tucker分解：核心张量裹挟着各模态的旋转矩阵，如蛹中蜷缩的蝶翼 */
  public tuckerDecompose(tensor: number[], ranks: number[]): DecompositionData {
    this.initializeCore();
    let prevResidual = Infinity;

    for (let iter = 0; iter < this._maxIter; iter++) {
      for (let mode = 0; mode < this._order; mode++) {
        const unfolding = this._matricize(tensor, mode);
        const u = this._truncatedSVD(unfolding, ranks[mode]);
        this._factors[mode].data = u;
      }

      const approx = this.reconstructTucker();
      this._residual = this._frobeniusDiff(tensor, approx);
      this._iterations = iter + 1;

      if (Math.abs(prevResidual - this._residual) < this._tolerance) {
        this._converged = true;
        break;
      }
      prevResidual = this._residual;
    }

    return this.report();
  }

  /** 从CP因子重构张量：将散落的秩一向量重新编织为整体 */
  public reconstructCP(): number[] {
    const size = this._dimensions.reduce((a, b) => a * b, 1);
    const recon = new Array(size).fill(0);

    for (let r = 0; r < this._rank; r++) {
      const outer = this._outerProductForComponent(r);
      for (let i = 0; i < size; i++) {
        recon[i] += this._lambda[r] * outer[i];
      }
    }
    return recon;
  }

  /** 从Tucker因子与核心重构张量 */
  public reconstructTucker(): number[] {
    const size = this._dimensions.reduce((a, b) => a * b, 1);
    let result = [...this._core];
    for (let mode = 0; mode < this._order; mode++) {
      result = this._modeProduct(result, this._factors[mode].data, mode);
    }
    return result.length >= size ? result.slice(0, size) : result;
  }

  /** 计算张量的多线性秩 */
  public multilinearRank(): number[] {
    return this._dimensions.map(() => this._rank);
  }

  /** 归一化某一模态的因子矩阵 */
  private _normalizeFactor(mode: number): void {
    const mat = this._factors[mode].data;
    for (let r = 0; r < this._rank; r++) {
      let norm = 0;
      for (let i = 0; i < mat.length; i++) {
        norm += mat[i][r] * mat[i][r];
      }
      norm = Math.sqrt(norm);
      this._lambda[r] = norm;
      if (norm > 0) {
        for (let i = 0; i < mat.length; i++) {
          mat[i][r] /= norm;
        }
      }
    }
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

  private _invertSymmetric(m: number[][]): number[][] {
    const n = m.length;
    const inv: number[][] = [];
    for (let i = 0; i < n; i++) {
      inv.push(new Array(n).fill(0));
      inv[i][i] = 1;
    }
    for (let i = 0; i < n; i++) {
      let pivot = m[i][i];
      if (Math.abs(pivot) < 1e-12) pivot = 1e-12;
      for (let j = 0; j < n; j++) {
        m[i][j] /= pivot;
        inv[i][j] /= pivot;
      }
      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        const factor = m[k][i];
        for (let j = 0; j < n; j++) {
          m[k][j] -= factor * m[i][j];
          inv[k][j] -= factor * inv[i][j];
        }
      }
    }
    return inv;
  }

  private _gramMatrix(m: number[][]): number[][] {
    return this._multiplyMatrices(this._transpose(m), m);
  }

  private _hadamard(a: number[][], b: number[][]): number[][] {
    const rows = a.length;
    const cols = a[0]?.length || 0;
    const res: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push(a[i][j] * b[i][j]);
      }
      res.push(row);
    }
    return res;
  }

  private _buildKhatriRaoExcluding(exclude: number): number[][] {
    let result: number[][] | null = null;
    for (let mode = 0; mode < this._order; mode++) {
      if (mode === exclude) continue;
      const factor = this._factors[mode].data;
      if (result === null) {
        result = factor;
      } else {
        result = this.khatriRao(result, factor);
      }
    }
    return result || [[1]];
  }

  private _matricize(tensor: number[], mode: number): number[][] {
    const rows = this._dimensions[mode];
    const cols = tensor.length / rows;
    const result: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push(tensor[i * cols + j] || 0);
      }
      result.push(row);
    }
    return result;
  }

  private _outerProductForComponent(r: number): number[] {
    let result: number[] = [1];
    for (let mode = 0; mode < this._order; mode++) {
      const factor = this._factors[mode].data;
      const newResult: number[] = [];
      for (let i = 0; i < result.length; i++) {
        for (let j = 0; j < factor.length; j++) {
          newResult.push(result[i] * factor[j][r]);
        }
      }
      result = newResult;
    }
    return result;
  }

  private _frobeniusDiff(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private _truncatedSVD(matrix: number[][], rank: number): number[][] {
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    const result: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < rank; j++) {
        row.push(matrix[i][j % cols] || 0);
      }
      result.push(row);
    }
    return result;
  }

  private _modeProduct(tensor: number[], matrix: number[][], mode: number): number[] {
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    const result: number[] = new Array(tensor.length).fill(0);
    for (let i = 0; i < Math.min(rows, tensor.length); i++) {
      for (let j = 0; j < cols; j++) {
        const idx = (i * cols + j) % result.length;
        result[idx] += (tensor[i] || 0) * matrix[i][j];
      }
    }
    return result;
  }

  public report(): DecompositionData {
    return {
      order: this._order,
      dimensions: [...this._dimensions],
      rank: this._rank,
      residual: this._residual,
      iterations: this._iterations,
      converged: this._converged,
    };
  }

  public reset(): void {
    this._residual = Infinity;
    this._iterations = 0;
    this._converged = false;
    this._lambda = new Array(this._rank).fill(1.0);
    this._core = [];
  }
}
