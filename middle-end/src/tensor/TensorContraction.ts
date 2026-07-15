/**
 * 张量缩并 —— Einstein求和约定的诗性实现。
 * 当两个指标相遇、相消，如同两条河流汇入大海，
 * 维度在静默中坍缩，而本质在坍缩中显影。
 */

export interface ContractionData {
  /** 输入张量的形状 */
  shapeA: number[];
  shapeB: number[];
  /** 缩并的指标对 */
  contractedIndices: Array<[number, number]>;
  /** 输出形状 */
  outputShape: number[];
  /** 运算步数 */
  steps: number;
}

export interface IndexPair {
  /** 张量A中的指标索引 */
  indexA: number;
  /** 张量B中的指标索引 */
  indexB: number;
  /** 该维度的长度 */
  dimension: number;
}

export class TensorContraction {
  private _shapeA: number[];
  private _shapeB: number[];
  private _contractedPairs: IndexPair[];
  private _outputShape: number[];
  private _steps: number;
  private _freeIndicesA: number[];
  private _freeIndicesB: number[];
  private _cache: Map<string, number>;

  constructor(shapeA: number[], shapeB: number[]) {
    this._shapeA = [...shapeA];
    this._shapeB = [...shapeB];
    this._contractedPairs = [];
    this._outputShape = [];
    this._steps = 0;
    this._freeIndicesA = [];
    this._freeIndicesB = [];
    this._cache = new Map();
  }

  get shapeA(): number[] {
    return [...this._shapeA];
  }

  get shapeB(): number[] {
    return [...this._shapeB];
  }

  get outputShape(): number[] {
    return [...this._outputShape];
  }

  get steps(): number {
    return this._steps;
  }

  /** 注册一对需要缩并的指标，如同月老系紧两根看不见的红线 */
  public registerContraction(indexA: number, indexB: number): boolean {
    if (indexA < 0 || indexA >= this._shapeA.length) return false;
    if (indexB < 0 || indexB >= this._shapeB.length) return false;
    const dimA = this._shapeA[indexA];
    const dimB = this._shapeB[indexB];
    if (dimA !== dimB) return false;

    this._contractedPairs.push({ indexA, indexB, dimension: dimA });
    this._recomputeFreeIndices();
    this._recomputeOutputShape();
    return true;
  }

  /** 批量注册缩并指标 */
  public registerContractionBatch(pairs: Array<[number, number]>): number {
    let success = 0;
    for (const [ia, ib] of pairs) {
      if (this.registerContraction(ia, ib)) success++;
    }
    return success;
  }

  /** Einstein求和：在指标的庙宇中，重复的下标即祷词，自动求和即仪式 */
  public einsteinContract(dataA: number[], dataB: number[]): number[] {
    const freeA = this._freeIndicesA;
    const freeB = this._freeIndicesB;
    const totalOutputSize = this._outputShape.reduce((a, b) => a * b, 1);
    const result: number[] = new Array(totalOutputSize).fill(0);

    const strideA = this._computeStrides(this._shapeA);
    const strideB = this._computeStrides(this._shapeB);
    const strideOut = this._computeStrides(this._outputShape);

    const contractDim = this._contractedPairs.length > 0 ? this._contractedPairs[0].dimension : 1;

    for (let outIdx = 0; outIdx < totalOutputSize; outIdx++) {
      let sum = 0;
      const outCoords = this._indexToCoords(outIdx, this._outputShape, strideOut);

      for (let k = 0; k < contractDim; k++) {
        const coordsA = new Array(this._shapeA.length).fill(0);
        const coordsB = new Array(this._shapeB.length).fill(0);

        for (let i = 0; i < freeA.length; i++) {
          coordsA[freeA[i]] = outCoords[i];
        }
        for (let i = 0; i < this._contractedPairs.length; i++) {
          coordsA[this._contractedPairs[i].indexA] = k;
        }

        const freeBOffset = freeA.length;
        for (let i = 0; i < freeB.length; i++) {
          coordsB[freeB[i]] = outCoords[freeBOffset + i];
        }
        for (let i = 0; i < this._contractedPairs.length; i++) {
          coordsB[this._contractedPairs[i].indexB] = k;
        }

        const idxA = this._coordsToIndex(coordsA, strideA);
        const idxB = this._coordsToIndex(coordsB, strideB);
        sum += (dataA[idxA] || 0) * (dataB[idxB] || 0);
        this._steps++;
      }
      result[outIdx] = sum;
    }

    return result;
  }

  /** 单张量的迹（对角缩并），如同在方阵的镜面中凝视自己的倒影 */
  public trace(tensor: number[], shape: number[]): number {
    if (shape.length < 2 || shape[0] !== shape[1]) return 0;
    const dim = shape[0];
    const strides = this._computeStrides(shape);
    let sum = 0;
    for (let i = 0; i < dim; i++) {
      const coords = new Array(shape.length).fill(0);
      coords[0] = i;
      coords[1] = i;
      const idx = this._coordsToIndex(coords, strides);
      sum += tensor[idx] || 0;
      this._steps++;
    }
    return sum;
  }

  /** 外积：两个张量的天真相遇，维度相加而非相消 */
  public outerProduct(dataA: number[], dataB: number[]): number[] {
    const result: number[] = [];
    for (let i = 0; i < dataA.length; i++) {
      for (let j = 0; j < dataB.length; j++) {
        result.push(dataA[i] * dataB[j]);
        this._steps++;
      }
    }
    const newShape = [...this._shapeA, ...this._shapeB];
    this._outputShape = newShape;
    return result;
  }

  /** Kronecker积：矩阵的外积之一种庄严变奏 */
  public kroneckerProduct(a: number[][], b: number[][]): number[][] {
    const rowsA = a.length;
    const colsA = a[0]?.length || 0;
    const rowsB = b.length;
    const colsB = b[0]?.length || 0;
    const result: number[][] = [];
    for (let i = 0; i < rowsA; i++) {
      for (let k = 0; k < rowsB; k++) {
        const row: number[] = [];
        for (let j = 0; j < colsA; j++) {
          for (let l = 0; l < colsB; l++) {
            row.push(a[i][j] * b[k][l]);
            this._steps++;
          }
        }
        result.push(row);
      }
    }
    return result;
  }

  /** 张量积空间的维数 */
  public tensorProductDimension(): number {
    const dimA = this._shapeA.reduce((x, y) => x * y, 1);
    const dimB = this._shapeB.reduce((x, y) => x * y, 1);
    return dimA * dimB;
  }

  /** 验证缩并的合法性 */
  public validateContraction(): boolean {
    if (this._contractedPairs.length === 0) return false;
    for (const pair of this._contractedPairs) {
      if (this._shapeA[pair.indexA] !== this._shapeB[pair.indexB]) return false;
    }
    return true;
  }

  /** 提升指标的维度：将协变指标提升为逆变，如同将深渊仰望为星空 */
  public raiseIndex(tensor: number[], metricInverse: number[][], index: number): number[] {
    const shape = [...this._shapeA];
    const result = new Array(tensor.length).fill(0);
    const strides = this._computeStrides(shape);
    const dim = shape[index];

    for (let i = 0; i < tensor.length; i++) {
      const coords = this._indexToCoords(i, shape, strides);
      const k = coords[index];
      for (let j = 0; j < dim; j++) {
        coords[index] = j;
        const srcIdx = this._coordsToIndex(coords, strides);
        result[i] += (tensor[srcIdx] || 0) * (metricInverse[k]?.[j] || 0);
        this._steps++;
      }
    }
    return result;
  }

  /** 降低指标的维度：将逆变指标沉降为协变，如同星光坠入深渊 */
  public lowerIndex(tensor: number[], metric: number[][], index: number): number[] {
    return this.raiseIndex(tensor, metric, index);
  }

  /** 完全缩并：将所有可能配对的指标都缩并，直至张量化为标量 */
  public totalContraction(dataA: number[], dataB: number[]): number {
    this._contractedPairs = [];
    const minOrder = Math.min(this._shapeA.length, this._shapeB.length);
    for (let i = 0; i < minOrder; i++) {
      if (this._shapeA[i] === this._shapeB[i]) {
        this.registerContraction(i, i);
      }
    }
    const result = this.einsteinContract(dataA, dataB);
    return result[0] || 0;
  }

  /** 指标的置换：重新排列张量的指标顺序，如同重新排列星辰的叙事 */
  public permuteIndices(tensor: number[], shape: number[], permutation: number[]): number[] {
    if (permutation.length !== shape.length) return tensor;
    const newShape = permutation.map(p => shape[p]);
    const oldStrides = this._computeStrides(shape);
    const newStrides = this._computeStrides(newShape);
    const result = new Array(tensor.length).fill(0);

    for (let i = 0; i < tensor.length; i++) {
      const oldCoords = this._indexToCoords(i, shape, oldStrides);
      const newCoords = permutation.map(p => oldCoords[p]);
      const newIdx = this._coordsToIndex(newCoords, newStrides);
      result[newIdx] = tensor[i];
      this._steps++;
    }

    this._outputShape = newShape;
    return result;
  }

  private _recomputeFreeIndices(): void {
    const contractedA = new Set(this._contractedPairs.map(p => p.indexA));
    const contractedB = new Set(this._contractedPairs.map(p => p.indexB));
    this._freeIndicesA = [];
    this._freeIndicesB = [];
    for (let i = 0; i < this._shapeA.length; i++) {
      if (!contractedA.has(i)) this._freeIndicesA.push(i);
    }
    for (let i = 0; i < this._shapeB.length; i++) {
      if (!contractedB.has(i)) this._freeIndicesB.push(i);
    }
  }

  private _recomputeOutputShape(): void {
    this._outputShape = [
      ...this._freeIndicesA.map(i => this._shapeA[i]),
      ...this._freeIndicesB.map(i => this._shapeB[i]),
    ];
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

  private _coordsToIndex(coords: number[], strides: number[]): number {
    let index = 0;
    for (let i = 0; i < coords.length; i++) {
      index += coords[i] * (strides[i] || 0);
    }
    return index;
  }

  public report(): ContractionData {
    return {
      shapeA: [...this._shapeA],
      shapeB: [...this._shapeB],
      contractedIndices: this._contractedPairs.map(p => [p.indexA, p.indexB] as [number, number]),
      outputShape: [...this._outputShape],
      steps: this._steps,
    };
  }

  public reset(): void {
    this._contractedPairs = [];
    this._outputShape = [];
    this._steps = 0;
    this._freeIndicesA = [];
    this._freeIndicesB = [];
    this._cache.clear();
  }
}
