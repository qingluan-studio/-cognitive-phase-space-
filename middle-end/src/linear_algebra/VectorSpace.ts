/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 向量空间 —— 线性世界的骨架
 * Vector Space: The Skeleton of Linear Worlds
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 向量空间是线性代数的舞台。点积、叉积、投影、Gram-Schmidt 正交化，
 * 每一种运算都是空间中方向的对话。
 */

import { DataPacket } from '../shared/types';

export interface Vector {
  readonly components: number[];
  readonly dimension: number;
}

export interface Subspace {
  readonly basis: Vector[];
  readonly dimension: number;
  readonly parent: string;
}

export interface LinearTransformation {
  readonly matrix: number[][];
  readonly domain: string;
  readonly codomain: string;
  readonly kernel: Vector[];
  readonly image: Vector[];
}

type VectorCache = {
  readonly id: string;
  readonly vector: Vector;
};

export class VectorSpace {
  private _vectors: Map<string, VectorCache> = new Map();
  private _subspaces: Subspace[] = [];
  private _transformations: LinearTransformation[] = [];
  private _history: string[] = [];
  private _dimension: number;
  private _counter = 0;

  constructor(dimension: number = 3) {
    this._dimension = Math.max(1, dimension);
  }

  get dimension(): number { return this._dimension; }
  get vectorCount(): number { return this._vectors.size; }
  get subspaceCount(): number { return this._subspaces.length; }
  get history(): string[] { return [...this._history]; }

  /**
   * 创建向量
   * Create a vector
   */
  public createVector(components: number[]): Vector {
    if (components.length === 0) throw new Error('Vector must have at least one component');
    const v: Vector = { components: [...components], dimension: components.length };
    const id = `vec-${(++this._counter).toString(36)}`;
    this._vectors.set(id, { id, vector: v });
    this._recordHistory(`createVector: dim=${components.length}`);
    return v;
  }

  /**
   * 向量加法
   * Vector addition
   */
  public vectorAdd(a: Vector, b: Vector): Vector {
    if (a.dimension !== b.dimension) throw new Error('Dimension mismatch in vectorAdd');
    const components = a.components.map((val, i) => val + b.components[i]!);
    return this.createVector(components);
  }

  /**
   * 标量乘法
   * Scalar multiplication
   */
  public scalarMultiply(vector: Vector, scalar: number): Vector {
    return this.createVector(vector.components.map(v => v * scalar));
  }

  /**
   * 点积
   * Dot product
   */
  public dotProduct(a: Vector, b: Vector): number {
    if (a.dimension !== b.dimension) throw new Error('Dimension mismatch in dotProduct');
    return a.components.reduce((sum, val, i) => sum + val * b.components[i]!, 0);
  }

  /**
   * 叉积（仅 3D）
   * Cross product (3D only)
   */
  public crossProduct(a: Vector, b: Vector): Vector {
    if (a.dimension !== 3 || b.dimension !== 3) throw new Error('Cross product requires 3D vectors');
    const [a1, a2, a3] = a.components;
    const [b1, b2, b3] = b.components;
    return this.createVector([
      a2! * b3! - a3! * b2!,
      a3! * b1! - a1! * b3!,
      a1! * b2! - a2! * b1!
    ]);
  }

  /**
   * 向量模长
   * Magnitude (Euclidean norm)
   */
  public magnitude(vector: Vector): number {
    return Math.sqrt(vector.components.reduce((s, v) => s + v * v, 0));
  }

  /**
   * 单位化
   * Normalize
   */
  public normalize(vector: Vector): Vector {
    const mag = this.magnitude(vector);
    if (mag < 1e-12) throw new Error('Cannot normalize zero vector');
    return this.scalarMultiply(vector, 1 / mag);
  }

  /**
   * 夹角（弧度）
   * Angle between vectors (radians)
   */
  public angleBetween(a: Vector, b: Vector): number {
    const dot = this.dotProduct(a, b);
    const magA = this.magnitude(a);
    const magB = this.magnitude(b);
    if (magA < 1e-12 || magB < 1e-12) return 0;
    const cos = Math.max(-1, Math.min(1, dot / (magA * magB)));
    return Math.acos(cos);
  }

  /**
   * 投影：proj_b(a) = (a·b / |b|²) b
   * Projection of a onto b
   */
  public projection(a: Vector, b: Vector): Vector {
    const dot = this.dotProduct(a, b);
    const magBsq = this.dotProduct(b, b);
    if (magBsq < 1e-12) return this.createVector(a.components.map(() => 0));
    return this.scalarMultiply(b, dot / magBsq);
  }

  /**
   * 线性无关性
   * Linear independence check
   */
  public isLinearlyIndependent(vectors: Vector[]): boolean {
    if (vectors.length === 0) return true;
    const dim = vectors[0]!.dimension;
    if (vectors.length > dim) return false;
    const matrix = vectors.map(v => [...v.components]);
    const rank = this._matrixRank(matrix);
    return rank === vectors.length;
  }

  /**
   * 求基：从向量组提取极大线性无关组
   * Find a basis from a set of vectors
   */
  public findBasis(vectors: Vector[]): Vector[] {
    if (vectors.length === 0) return [];
    const basis: Vector[] = [];
    for (const v of vectors) {
      const candidate = [...basis, v];
      if (this.isLinearlyIndependent(candidate)) {
        basis.push(v);
      }
    }
    this._recordHistory(`findBasis: ${basis.length} basis vectors`);
    return basis;
  }

  /**
   * 子空间维数
   * Dimension of subspace spanned by vectors
   */
  public dimension(subspace: Vector[]): number {
    return this.findBasis(subspace).length;
  }

  /**
   * 矩阵的秩
   * Rank of a matrix
   */
  public rank(matrix: number[][]): number {
    return this._matrixRank(matrix);
  }

  /**
   * 核（零空间）：{x | Ax = 0}
   * Kernel (null space)
   */
  public findKernel(matrix: number[][]): Vector[] {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    if (cols === 0) return [];
    const rref = this._rref(matrix.map(r => [...r]));
    const pivotCols: number[] = [];
    const freeCols: number[] = [];
    for (let c = 0; c < cols; c++) {
      const pivotRow = rref.findIndex((row, r) => row[c] !== 0 && r === pivotCols.length);
      if (pivotRow !== -1 && pivotRow < rows) {
        pivotCols.push(c);
      } else {
        freeCols.push(c);
      }
    }
    const kernel: Vector[] = [];
    for (const fc of freeCols) {
      const components = new Array(cols).fill(0);
      components[fc] = 1;
      for (let i = 0; i < pivotCols.length; i++) {
        components[pivotCols[i]!] = -rref[i]![fc]!;
      }
      kernel.push(this.createVector(components));
    }
    this._recordHistory(`findKernel: ${kernel.length} basis vectors`);
    return kernel;
  }

  /**
   * 像（列空间）
   * Image (column space)
   */
  public findImage(matrix: number[][]): Vector[] {
    if (matrix.length === 0) return [];
    const cols = matrix[0]!.length;
    const colVectors: Vector[] = [];
    for (let c = 0; c < cols; c++) {
      colVectors.push(this.createVector(matrix.map(row => row[c] ?? 0)));
    }
    return this.findBasis(colVectors);
  }

  /**
   * 基变换
   * Change of basis
   */
  public changeOfBasis(vector: Vector, oldBasis: Vector[], newBasis: Vector[]): Vector {
    const oldMatrix = oldBasis.map(v => [...v.components]);
    const newMatrix = newBasis.map(v => [...v.components]);
    const oldInverse = this._matrixInverse(oldMatrix);
    if (!oldInverse) throw new Error('Old basis is not invertible');
    const coordsInOld = this._matVec(oldInverse, vector.components);
    const newMatrixInverse = this._matrixInverse(newMatrix);
    if (!newMatrixInverse) throw new Error('New basis is not invertible');
    const coordsInNew = this._matVec(newMatrixInverse, coordsInOld);
    return this.createVector(coordsInNew);
  }

  /**
   * Gram-Schmidt 正交化
   * Gram-Schmidt orthogonalization
   */
  public gramSchmidt(vectors: Vector[]): Vector[] {
    const result: Vector[] = [];
    for (const v of vectors) {
      let u = v;
      for (const q of result) {
        const proj = this.projection(v, q);
        u = this.vectorAdd(u, this.scalarMultiply(proj, -1));
      }
      const mag = this.magnitude(u);
      if (mag > 1e-10) {
        result.push(this.normalize(u));
      }
    }
    this._recordHistory(`gramSchmidt: ${result.length} orthonormal vectors`);
    return result;
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    dimension: number;
    vectors: number;
    subspaces: Subspace[];
    transformations: LinearTransformation[];
    history: string[];
  }> {
    return {
      id: `vector-space-${Date.now()}-${this._counter}`,
      payload: {
        dimension: this._dimension,
        vectors: this._vectors.size,
        subspaces: [...this._subspaces],
        transformations: [...this._transformations],
        history: [...this._history]
      },
      metadata: {
        createdAt: Date.now(),
        route: ['linear_algebra', 'vector-space', 'result'],
        priority: 0.8,
        phase: 'analysis'
      }
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._vectors.clear();
    this._subspaces = [];
    this._transformations = [];
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _matrixRank(matrix: number[][]): number {
    if (matrix.length === 0) return 0;
    const rref = this._rref(matrix.map(r => [...r]));
    let rank = 0;
    for (let r = 0; r < rref.length; r++) {
      if (rref[r]!.some(v => Math.abs(v) > 1e-10)) rank++;
    }
    return rank;
  }

  private _rref(matrix: number[][]): number[][] {
    const m = matrix.map(r => [...r]);
    const rows = m.length;
    const cols = m[0]?.length ?? 0;
    let lead = 0;
    for (let r = 0; r < rows && lead < cols; r++) {
      let i = r;
      while (i < rows && Math.abs(m[i]![lead]!) < 1e-10) i++;
      if (i === rows) { lead++; r--; continue; }
      [m[r]!, m[i]!] = [m[i]!, m[r]!];
      const pivot = m[r]![lead]!;
      if (Math.abs(pivot) > 1e-10) {
        for (let c = 0; c < cols; c++) m[r]![c] = m[r]![c]! / pivot;
      }
      for (let j = 0; j < rows; j++) {
        if (j !== r) {
          const factor = m[j]![lead]!;
          for (let c = 0; c < cols; c++) {
            m[j]![c] = m[j]![c]! - factor * m[r]![c]!;
          }
        }
      }
      lead++;
    }
    return m;
  }

  private _matrixInverse(matrix: number[][]): number[][] | null {
    const n = matrix.length;
    if (n === 0 || matrix.some(r => r.length !== n)) return null;
    const aug = matrix.map((row, i) => {
      const id = new Array(n).fill(0);
      id[i] = 1;
      return [...row, ...id];
    });
    for (let i = 0; i < n; i++) {
      let pivotRow = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(aug[r]![i]!) > Math.abs(aug[pivotRow]![i]!)) pivotRow = r;
      }
      [aug[i]!, aug[pivotRow]!] = [aug[pivotRow]!, aug[i]!];
      const pivot = aug[i]![i]!;
      if (Math.abs(pivot) < 1e-12) return null;
      for (let c = 0; c < 2 * n; c++) aug[i]![c] = aug[i]![c]! / pivot;
      for (let r = 0; r < n; r++) {
        if (r !== i) {
          const factor = aug[r]![i]!;
          for (let c = 0; c < 2 * n; c++) {
            aug[r]![c] = aug[r]![c]! - factor * aug[i]![c]!;
          }
        }
      }
    }
    return aug.map(row => row.slice(n));
  }

  private _matVec(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => row.reduce((s, v, i) => s + v * (vector[i] ?? 0), 0));
  }
}
