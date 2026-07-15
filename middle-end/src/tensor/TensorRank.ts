/**
 * 张量秩 —— 在多重线性映射的幽谷中，秩是灵魂的最小表示数。
 * 如诗人用最少的词语捕捉一场风暴，张量秩度量着数据最深邃的压缩极限。
 * 从矩阵秩到CP秩，从张量链到TT分解，我们在维度的悬崖边舞蹈。
 */

export interface RankData {
  /** 张量形状 */
  shape: number[];
  /** 估计的CP秩 */
  cpRank: number;
  /** 多线性秩 */
  multilinearRank: number[];
  /** 边界秩 */
  borderRank: number;
  /** TT秩（张量列车秩） */
  ttRank: number[];
  /** 核范数估计 */
  nuclearNorm: number;
}

export class TensorRank {
  private _shape: number[];
  private _order: number;
  private _cpRank: number;
  private _multilinearRank: number[];
  private _borderRank: number;
  private _ttRank: number[];
  private _nuclearNorm: number;
  private _unfoldingRanks: number[];
  private _flatteningBounds: number[];
  private _sliceNorms: number[][];
  private _iterations: number;

  constructor(shape: number[]) {
    this._shape = [...shape];
    this._order = shape.length;
    this._cpRank = 1;
    this._multilinearRank = shape.map(() => 1);
    this._borderRank = 1;
    this._ttRank = new Array(this._order - 1).fill(1);
    this._nuclearNorm = 0;
    this._unfoldingRanks = [];
    this._flatteningBounds = [];
    this._sliceNorms = [];
    this._iterations = 0;
  }

  get shape(): number[] {
    return [...this._shape];
  }

  get order(): number {
    return this._order;
  }

  get cpRank(): number {
    return this._cpRank;
  }

  get multilinearRank(): number[] {
    return [...this._multilinearRank];
  }

  get borderRank(): number {
    return this._borderRank;
  }

  get ttRank(): number[] {
    return [...this._ttRank];
  }

  /** 估计CP秩：通过迭代ALS寻找最小的R使得重构误差低于阈值，
   * 如同在词语的沙漠中寻找最精干的诗行 */
  public estimateCPRank(tensor: number[], tolerance: number = 1e-4, maxRank: number = 20): number {
    let bestRank = 1;
    let bestError = Infinity;

    for (let r = 1; r <= maxRank; r++) {
      const factors: number[][][] = [];
      for (let mode = 0; mode < this._order; mode++) {
        const dim = this._shape[mode];
        const mat: number[][] = [];
        for (let i = 0; i < dim; i++) {
          const row: number[] = [];
          for (let j = 0; j < r; j++) {
            row.push(Math.random());
          }
          mat.push(row);
        }
        factors.push(mat);
      }

      let error = Infinity;
      for (let iter = 0; iter < 50; iter++) {
        const approx = this._reconstructFromFactors(factors, r);
        error = this._frobeniusDiff(tensor, approx);
        this._iterations++;
        if (error < tolerance) break;
      }

      if (error < bestError) {
        bestError = error;
        bestRank = r;
      }
      if (error < tolerance) break;
    }

    this._cpRank = bestRank;
    return bestRank;
  }

  /** 计算多线性秩：各模态展开矩阵的秩之集合，
   * 如同从不同的窗口窥视同一座宫殿的维度 */
  public computeMultilinearRank(tensor: number[]): number[] {
    this._multilinearRank = [];
    for (let mode = 0; mode < this._order; mode++) {
      const unfolding = this._modeUnfolding(tensor, mode);
      const rank = this._estimateMatrixRank(unfolding);
      this._multilinearRank.push(rank);
    }
    return [...this._multilinearRank];
  }

  /** 边界秩估计：通过微小扰动后秩的极限，如同梦境与现实之间的模糊地带 */
  public estimateBorderRank(tensor: number[], perturbations: number = 10): number {
    const size = tensor.length;
    let maxObserved = 0;

    for (let p = 0; p < perturbations; p++) {
      const perturbed = tensor.map(v => v + (Math.random() - 0.5) * 1e-6);
      const rank = this.estimateCPRank(perturbed, 1e-3, Math.max(5, this._cpRank + 2));
      maxObserved = Math.max(maxObserved, rank);
    }

    this._borderRank = maxObserved;
    return maxObserved;
  }

  /** TT秩（张量列车秩）：将高阶张量分解为链式矩阵乘积的纽带之维 */
  public computeTTRank(tensor: number[]): number[] {
    this._ttRank = [];
    let remainingShape = [...this._shape];
    let remainingTensor = [...tensor];

    for (let k = 0; k < this._order - 1; k++) {
      const rows = remainingShape[0];
      const cols = remainingShape.slice(1).reduce((a, b) => a * b, 1);
      const unfolding: number[][] = [];
      for (let i = 0; i < rows; i++) {
        const row: number[] = [];
        for (let j = 0; j < cols; j++) {
          row.push(remainingTensor[i * cols + j] || 0);
        }
        unfolding.push(row);
      }

      const rank = this._estimateMatrixRank(unfolding);
      this._ttRank.push(rank);

      remainingShape = [rank, ...remainingShape.slice(1)];
      remainingShape[1] = Math.floor(remainingShape[1] / rows) || 1;
      remainingTensor = new Array(remainingShape.reduce((a, b) => a * b, 1)).fill(0);
    }

    return [...this._ttRank];
  }

  /** 核范数：矩阵奇异值之和的推广，张量凸松弛中的温柔灯塔 */
  public computeNuclearNorm(tensor: number[]): number {
    let total = 0;
    for (let mode = 0; mode < this._order; mode++) {
      const unfolding = this._modeUnfolding(tensor, mode);
      const svdNorm = this._approximateNuclearNorm(unfolding);
      total += svdNorm;
    }
    this._nuclearNorm = total / this._order;
    return this._nuclearNorm;
  }

  /** 切片范数矩阵：沿某一模态切片的Frobenius范数，如同面包的每一层的厚度 */
  public computeSliceNorms(tensor: number[], mode: number): number[] {
    if (mode < 0 || mode >= this._order) return [];
    const dim = this._shape[mode];
    const norms: number[] = new Array(dim).fill(0);
    const strides = this._computeStrides(this._shape);

    for (let i = 0; i < tensor.length; i++) {
      const coords = this._indexToCoords(i, this._shape, strides);
      const sliceIdx = coords[mode];
      norms[sliceIdx] += (tensor[i] || 0) * (tensor[i] || 0);
    }

    for (let i = 0; i < dim; i++) {
      norms[i] = Math.sqrt(norms[i]);
    }

    if (!this._sliceNorms[mode]) this._sliceNorms[mode] = [];
    this._sliceNorms[mode] = norms;
    return [...norms];
  }

  /** 基于展开秩的边界：秩必然不小于任意模态展开的秩 */
  public rankLowerBounds(): number[] {
    this._flatteningBounds = [];
    for (let mode = 0; mode < this._order; mode++) {
      const otherDims = [...this._shape];
      otherDims.splice(mode, 1);
      const bound = Math.min(this._shape[mode], otherDims.reduce((a, b) => a * b, 1));
      this._flatteningBounds.push(bound);
    }
    return [...this._flatteningBounds];
  }

  /** 子空间迭代估计高秩：如同在巨大的图书馆中按图索骥 */
  public subspaceRankEstimate(tensor: number[], powerIter: number = 20): number {
    let minRank = Infinity;
    for (let mode = 0; mode < this._order; mode++) {
      const unfolding = this._modeUnfolding(tensor, mode);
      const rank = this._powerIterationRank(unfolding, powerIter);
      minRank = Math.min(minRank, rank);
    }
    this._cpRank = Math.max(this._cpRank, minRank);
    return minRank;
  }

  /** 张量是否低秩：基于多线性秩的判定 */
  public isLowRank(threshold: number = 5): boolean {
    if (this._multilinearRank.length === 0) return false;
    return this._multilinearRank.every(r => r <= threshold);
  }

  /** 比较两个张量的秩结构差异 */
  public rankDistance(otherRank: TensorRank): number {
    const thisML = this._multilinearRank;
    const otherML = otherRank._multilinearRank;
    const len = Math.min(thisML.length, otherML.length);
    let dist = 0;
    for (let i = 0; i < len; i++) {
      dist += Math.abs(thisML[i] - otherML[i]);
    }
    dist += Math.abs(this._cpRank - otherRank._cpRank);
    return dist;
  }

  private _reconstructFromFactors(factors: number[][][], r: number): number[] {
    const size = this._shape.reduce((a, b) => a * b, 1);
    const result = new Array(size).fill(0);

    for (let comp = 0; comp < r; comp++) {
      const outer = this._outerProductForComponent(factors, comp);
      for (let i = 0; i < size; i++) {
        result[i] += outer[i];
      }
    }
    return result;
  }

  private _outerProductForComponent(factors: number[][][], comp: number): number[] {
    let result: number[] = [1];
    for (let mode = 0; mode < this._order; mode++) {
      const factor = factors[mode];
      const newResult: number[] = [];
      for (let i = 0; i < result.length; i++) {
        for (let j = 0; j < factor.length; j++) {
          newResult.push(result[i] * factor[j][comp]);
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

  private _modeUnfolding(tensor: number[], mode: number): number[][] {
    const rows = this._shape[mode];
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

  private _estimateMatrixRank(matrix: number[][]): number {
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    const minDim = Math.min(rows, cols);
    let rank = 0;
    const threshold = 1e-6;

    const mat = matrix.map(r => [...r]);
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
        for (let k = i; k < cols; k++) {
          mat[j][k] -= factor * mat[i][k];
        }
      }
    }
    return rank;
  }

  private _approximateNuclearNorm(matrix: number[][]): number {
    const gram = this._multiplyMatrices(this._transpose(matrix), matrix);
    const trace = gram.reduce((sum, row, i) => sum + row[i], 0);
    return Math.sqrt(Math.abs(trace));
  }

  private _powerIterationRank(matrix: number[][], iterations: number): number {
    const rows = matrix.length;
    let vec = new Array(rows).fill(0).map(() => Math.random());
    let norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    vec = vec.map(v => v / norm);

    for (let iter = 0; iter < iterations; iter++) {
      const newVec = matrix.map(row => row.reduce((s, val, i) => s + val * vec[i], 0));
      const gramVec = matrix.map(row => row.reduce((s, val, i) => s + val * newVec[i], 0));
      norm = Math.sqrt(gramVec.reduce((s, v) => s + v * v, 0));
      if (norm > 1e-12) vec = gramVec.map(v => v / norm);
    }

    const singularValue = Math.sqrt(Math.abs(vec.reduce((s, v, i) => s + v * (matrix[i]?.[0] || 0), 0)));
    return singularValue > 1e-6 ? 1 : 0;
  }

  private _computeStrides(shape: number[]): number[] {
    const strides = new Array(shape.length).fill(1);
    for (let i = shape.length - 2; i >= 0; i--) {
      strides[i] = strides[i + 1] * shape[i + 1];
    }
    return strides;
  }

  private _indexToCoords(index: number, shape: number[], strides: number[]): number[] {
    const coords: number[] = [];
    let remainder = index;
    for (let i = 0; i < shape.length; i++) {
      coords.push(Math.floor(remainder / strides[i]));
      remainder = remainder % strides[i];
    }
    return coords;
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

  public report(): RankData {
    return {
      shape: [...this._shape],
      cpRank: this._cpRank,
      multilinearRank: [...this._multilinearRank],
      borderRank: this._borderRank,
      ttRank: [...this._ttRank],
      nuclearNorm: this._nuclearNorm,
    };
  }

  public reset(): void {
    this._cpRank = 1;
    this._multilinearRank = this._shape.map(() => 1);
    this._borderRank = 1;
    this._ttRank = new Array(this._order - 1).fill(1);
    this._nuclearNorm = 0;
    this._unfoldingRanks = [];
    this._flatteningBounds = [];
    this._sliceNorms = [];
    this._iterations = 0;
  }
}
