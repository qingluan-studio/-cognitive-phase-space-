/**
 * 维度折叠：将高维结构折叠进低维空间。
 * 通过投影、池化和压缩将高维数据折叠到低维表示，保留主要特征同时降低维度。
 */

export type FoldStrategy = 'pca' | 'average' | 'maxpool' | 'random';

export interface DimensionalMapping {
  originalDims: number;
  foldedDims: number;
  strategy: FoldStrategy;
  projectionMatrix: number[][];
  retainedVariance: number;
}

export interface FoldedTensor {
  id: string;
  data: number[];
  mapping: DimensionalMapping;
  createdAt: number;
}

export class DimensionalFold {
  private _tensors: FoldedTensor[] = [];
  private _defaultStrategy: FoldStrategy = 'average';

  fold(data: number[][], strategy: FoldStrategy = this._defaultStrategy): FoldedTensor {
    const originalDims = data.length > 0 ? data[0].length : 0;
    const projectionMatrix = this._buildProjection(originalDims, 1, strategy);
    const folded = data.map(row => this._project(row, projectionMatrix));
    const retainedVariance = this._estimateVariance(data, folded);

    const tensor: FoldedTensor = {
      id: `tensor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      data: folded.flat(),
      mapping: {
        originalDims,
        foldedDims: 1,
        strategy,
        projectionMatrix,
        retainedVariance,
      },
      createdAt: Date.now(),
    };
    this._tensors.push(tensor);
    if (this._tensors.length > 100) this._tensors.shift();
    return tensor;
  }

  private _buildProjection(fromDims: number, toDims: number, strategy: FoldStrategy): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < toDims; i++) {
      const row: number[] = [];
      for (let j = 0; j < fromDims; j++) {
        if (strategy === 'pca') row.push(1 / Math.sqrt(fromDims));
        else if (strategy === 'average') row.push(1 / fromDims);
        else if (strategy === 'maxpool') row.push(j === 0 ? 1 : 0);
        else row.push(Math.random());
      }
      matrix.push(row);
    }
    return matrix;
  }

  private _project(row: number[], matrix: number[][]): number[] {
    return matrix.map(m => m.reduce((sum, weight, i) => sum + weight * (row[i] ?? 0), 0));
  }

  private _estimateVariance(original: number[][], folded: number[][]): number {
    if (original.length === 0) return 0;
    const origMean = original[0].reduce((s, v) => s + v, 0) / original[0].length;
    const foldedMean = folded.reduce((s, v) => s + v[0], 0) / folded.length;
    const origVar = original[0].reduce((s, v) => s + (v - origMean) ** 2, 0) / original[0].length;
    const foldedVar = folded.reduce((s, v) => s + (v[0] - foldedMean) ** 2, 0) / folded.length;
    return origVar === 0 ? 0 : foldedVar / origVar;
  }

  setStrategy(strategy: FoldStrategy): void {
    this._defaultStrategy = strategy;
  }

  unfold(tensorId: string): number[] | null {
    const tensor = this._tensors.find(t => t.id === tensorId);
    if (!tensor) return null;
    const restored: number[] = [];
    for (let i = 0; i < tensor.data.length; i++) {
      for (const weight of tensor.mapping.projectionMatrix[0]) {
        restored.push(tensor.data[i] * weight * tensor.mapping.originalDims);
      }
    }
    return restored;
  }

  getTensors(): FoldedTensor[] {
    return [...this._tensors];
  }

  get tensorCount(): number {
    return this._tensors.length;
  }
}
