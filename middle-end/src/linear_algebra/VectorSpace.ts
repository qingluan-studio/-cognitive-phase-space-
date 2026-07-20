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

export interface VectorDecomposition {
  readonly parallel: Vector;
  readonly perpendicular: Vector;
}

export interface LeastSquaresResult {
  readonly solution: Vector;
  readonly residual: number;
  readonly projected: Vector;
}

export interface GramMatrix {
  readonly matrix: number[][];
  readonly determinant: number;
  readonly positiveDefinite: boolean;
}

export interface DualVector {
  readonly functional: (v: Vector) => number;
  readonly representation: Vector;
}

export interface InnerProductResult {
  readonly value: number;
  readonly type: 'euclidean' | 'weighted' | 'custom';
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
  public subspaceDimension(subspace: Vector[]): number {
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
   * 向量分解为平行+垂直分量
   * Vector decomposition into parallel and perpendicular components
   */
  public decompose(vector: Vector, direction: Vector): VectorDecomposition {
    const parallel = this.projection(vector, direction);
    const perpendicular = this.vectorAdd(vector, this.scalarMultiply(parallel, -1));
    this._recordHistory('decompose: parallel + perpendicular');
    return { parallel, perpendicular };
  }

  /**
   * 向量三角不等式验证
   * Triangle inequality verification
   */
  public triangleInequality(a: Vector, b: Vector): {
    leftSide: number;
    rightSide: number;
    holds: boolean;
  } {
    const sum = this.vectorAdd(a, b);
    const leftSide = this.magnitude(sum);
    const rightSide = this.magnitude(a) + this.magnitude(b);
    const holds = leftSide <= rightSide + 1e-10;
    this._recordHistory(`triangleInequality: holds=${holds}`);
    return { leftSide, rightSide, holds };
  }

  /**
   * 柯西-施瓦茨不等式验证
   * Cauchy-Schwarz inequality verification
   */
  public cauchySchwarz(a: Vector, b: Vector): {
    leftSide: number;
    rightSide: number;
    holds: boolean;
  } {
    const leftSide = Math.abs(this.dotProduct(a, b));
    const rightSide = this.magnitude(a) * this.magnitude(b);
    const holds = leftSide <= rightSide + 1e-10;
    this._recordHistory(`cauchySchwarz: holds=${holds}`);
    return { leftSide, rightSide, holds };
  }

  /**
   * 格拉姆矩阵
   * Gram matrix
   */
  public gramMatrix(vectors: Vector[]): GramMatrix {
    const n = vectors.length;
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row.push(this.dotProduct(vectors[i]!, vectors[j]!));
      }
      matrix.push(row);
    }
    const det = this._determinant(matrix);
    const positiveDefinite = det > 0;
    this._recordHistory(`gramMatrix: det=${det}, positiveDefinite=${positiveDefinite}`);
    return { matrix, determinant: det, positiveDefinite };
  }

  /**
   * 最小二乘解
   * Least squares solution
   */
  public leastSquares(
    A: number[][],
    b: number[]
  ): LeastSquaresResult {
    const m = A.length;
    const n = A[0]?.length ?? 0;
    const AtA: number[][] = [];
    const Atb: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < m; k++) {
          sum += (A[k]?.[i] ?? 0) * (A[k]?.[j] ?? 0);
        }
        row.push(sum);
      }
      AtA.push(row);
    }
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let k = 0; k < m; k++) {
        sum += (A[k]?.[i] ?? 0) * (b[k] ?? 0);
      }
      Atb[i] = sum;
    }
    const x = this._solveSystem(AtA, Atb);
    const projected = this._matVec(A, x);
    let residual = 0;
    for (let i = 0; i < m; i++) {
      const diff = (b[i] ?? 0) - (projected[i] ?? 0);
      residual += diff * diff;
    }
    residual = Math.sqrt(residual);
    this._recordHistory(`leastSquares: residual=${residual}`);
    return {
      solution: this.createVector(x),
      residual,
      projected: this.createVector(projected)
    };
  }

  /**
   * 正交补
   * Orthogonal complement
   */
  public orthogonalComplement(subspace: Vector[], ambientDim: number): Vector[] {
    const n = subspace.length;
    if (n === 0) {
      const basis: Vector[] = [];
      for (let i = 0; i < ambientDim; i++) {
        const components = new Array(ambientDim).fill(0);
        components[i] = 1;
        basis.push(this.createVector(components));
      }
      return basis;
    }
    const A = subspace.map(v => [...v.components]);
    const kernel = this.findKernel(A);
    this._recordHistory(`orthogonalComplement: ${kernel.length} basis vectors`);
    return kernel;
  }

  /**
   * 四个基本子空间
   * Four fundamental subspaces
   */
  public fourFundamentalSubspaces(A: number[][]): {
    columnSpace: Vector[];
    nullSpace: Vector[];
    rowSpace: Vector[];
    leftNullSpace: Vector[];
  } {
    const At = this._transpose(A);
    const columnSpace = this.findImage(A);
    const nullSpace = this.findKernel(A);
    const rowSpace = this.findImage(At);
    const leftNullSpace = this.findKernel(At);
    this._recordHistory('fourFundamentalSubspaces computed');
    return { columnSpace, nullSpace, rowSpace, leftNullSpace };
  }

  /**
   * 内积（加权）
   * Weighted inner product
   */
  public weightedInnerProduct(a: Vector, b: Vector, weights: number[]): InnerProductResult {
    if (a.dimension !== b.dimension) throw new Error('Dimension mismatch');
    let sum = 0;
    for (let i = 0; i < a.dimension; i++) {
      sum += (weights[i] ?? 1) * a.components[i]! * b.components[i]!;
    }
    return { value: sum, type: 'weighted' };
  }

  /**
   * Lp 范数
   * Lp norm
   */
  public lpNorm(vector: Vector, p: number): number {
    if (p === Infinity) {
      return Math.max(...vector.components.map(v => Math.abs(v)));
    }
    if (p === 0) {
      return vector.components.filter(v => Math.abs(v) > 1e-10).length;
    }
    const sum = vector.components.reduce((s, v) => s + Math.pow(Math.abs(v), p), 0);
    return Math.pow(sum, 1 / p);
  }

  /**
   * 曼哈顿距离
   * Manhattan distance (L1)
   */
  public manhattanDistance(a: Vector, b: Vector): number {
    if (a.dimension !== b.dimension) throw new Error('Dimension mismatch');
    let sum = 0;
    for (let i = 0; i < a.dimension; i++) {
      sum += Math.abs(a.components[i]! - b.components[i]!);
    }
    return sum;
  }

  /**
   * 切比雪夫距离
   * Chebyshev distance (L∞)
   */
  public chebyshevDistance(a: Vector, b: Vector): number {
    if (a.dimension !== b.dimension) throw new Error('Dimension mismatch');
    let max = 0;
    for (let i = 0; i < a.dimension; i++) {
      max = Math.max(max, Math.abs(a.components[i]! - b.components[i]!));
    }
    return max;
  }

  /**
   * 向量外积（张量积）
   * Outer product (tensor product)
   */
  public outerProduct(a: Vector, b: Vector): number[][] {
    const m = a.dimension;
    const n = b.dimension;
    const result: number[][] = [];
    for (let i = 0; i < m; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row.push(a.components[i]! * b.components[j]!);
      }
      result.push(row);
    }
    this._recordHistory(`outerProduct: ${m}x${n} matrix`);
    return result;
  }

  /**
   * 标量三重积（3D）
   * Scalar triple product (3D)
   */
  public scalarTripleProduct(a: Vector, b: Vector, c: Vector): number {
    if (a.dimension !== 3 || b.dimension !== 3 || c.dimension !== 3) {
      throw new Error('Scalar triple product requires 3D vectors');
    }
    const cross = this.crossProduct(b, c);
    return this.dotProduct(a, cross);
  }

  /**
   * 向量三重积（3D）
   * Vector triple product (3D)
   */
  public vectorTripleProduct(a: Vector, b: Vector, c: Vector): Vector {
    if (a.dimension !== 3 || b.dimension !== 3 || c.dimension !== 3) {
      throw new Error('Vector triple product requires 3D vectors');
    }
    const bc = this.dotProduct(b, c);
    const ac = this.dotProduct(a, c);
    return this.vectorAdd(
      this.scalarMultiply(b, ac),
      this.scalarMultiply(c, -bc)
    );
  }

  /**
   * BAC-CAB 恒等式验证
   * BAC-CAB identity verification
   */
  public bacCabIdentity(a: Vector, b: Vector, c: Vector): {
    leftSide: Vector;
    rightSide: Vector;
    error: number;
  } {
    const leftSide = this.crossProduct(a, this.crossProduct(b, c));
    const rightSide = this.vectorTripleProduct(a, b, c);
    let error = 0;
    for (let i = 0; i < 3; i++) {
      error += Math.pow(leftSide.components[i]! - rightSide.components[i]!, 2);
    }
    error = Math.sqrt(error);
    this._recordHistory(`bacCabIdentity: error=${error.toExponential(4)}`);
    return { leftSide, rightSide, error };
  }

  /**
   * 向量组张成子空间
   * Span of a set of vectors
   */
  public span(vectors: Vector[]): Subspace {
    const basis = this.findBasis(vectors);
    const subspace: Subspace = {
      basis,
      dimension: basis.length,
      parent: `R^${vectors[0]?.dimension ?? 0}`
    };
    this._subspaces.push(subspace);
    this._recordHistory(`span: dim=${basis.length}`);
    return subspace;
  }

  /**
   * 子空间和
   * Sum of subspaces
   */
  public subspaceSum(s1: Subspace, s2: Subspace): Subspace {
    const combined = [...s1.basis, ...s2.basis];
    const basis = this.findBasis(combined);
    const result: Subspace = {
      basis,
      dimension: basis.length,
      parent: s1.parent
    };
    this._recordHistory(`subspaceSum: dim=${basis.length}`);
    return result;
  }

  /**
   * 子空间交
   * Intersection of subspaces
   */
  public subspaceIntersection(s1: Subspace, s2: Subspace): Subspace {
    const complementS2 = this.orthogonalComplement(s2.basis, s1.basis[0]?.dimension ?? 0);
    const combined = [...s1.basis, ...complementS2];
    const A = combined.map(v => [...v.components]);
    const intersection = this.findKernel(this._transpose(A));
    const result: Subspace = {
      basis: intersection,
      dimension: intersection.length,
      parent: s1.parent
    };
    this._recordHistory(`subspaceIntersection: dim=${intersection.length}`);
    return result;
  }

  /**
   * 维数公式验证
   * Dimension formula verification
   */
  public dimensionFormula(s1: Subspace, s2: Subspace): {
    dimSum: number;
    dimIntersection: number;
    dimS1: number;
    dimS2: number;
    holds: boolean;
  } {
    const sum = this.subspaceSum(s1, s2);
    const intersection = this.subspaceIntersection(s1, s2);
    const leftSide = sum.dimension + intersection.dimension;
    const rightSide = s1.dimension + s2.dimension;
    const holds = leftSide === rightSide;
    this._recordHistory(`dimensionFormula: holds=${holds}`);
    return {
      dimSum: sum.dimension,
      dimIntersection: intersection.dimension,
      dimS1: s1.dimension,
      dimS2: s2.dimension,
      holds
    };
  }

  /**
   * 对偶向量（里斯表示定理）
   * Dual vector (Riesz representation theorem)
   */
  public dualVector(rep: Vector): DualVector {
    const functional = (v: Vector) => this.dotProduct(rep, v);
    this._recordHistory('dualVector created');
    return { functional, representation: rep };
  }

  /**
   * 线性变换的核与像
   * Kernel and image of a linear transformation
   */
  public linearTransformationInfo(matrix: number[][]): LinearTransformation {
    const kernel = this.findKernel(matrix);
    const image = this.findImage(matrix);
    const result: LinearTransformation = {
      matrix,
      domain: `R^${matrix[0]?.length ?? 0}`,
      codomain: `R^${matrix.length}`,
      kernel,
      image
    };
    this._transformations.push(result);
    this._recordHistory(`linearTransformationInfo: rank=${image.length}, nullity=${kernel.length}`);
    return result;
  }

  /**
   * 秩-零度定理验证
   * Rank-nullity theorem verification
   */
  public rankNullityTheorem(matrix: number[][]): {
    rank: number;
    nullity: number;
    domainDim: number;
    holds: boolean;
  } {
    const info = this.linearTransformationInfo(matrix);
    const rank = info.image.length;
    const nullity = info.kernel.length;
    const domainDim = matrix[0]?.length ?? 0;
    const holds = rank + nullity === domainDim;
    this._recordHistory(`rankNullityTheorem: holds=${holds}`);
    return { rank, nullity, domainDim, holds };
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

  private _transpose(matrix: number[][]): number[][] {
    if (matrix.length === 0) return [];
    const rows = matrix.length;
    const cols = matrix[0]!.length;
    const result: number[][] = [];
    for (let j = 0; j < cols; j++) {
      const row: number[] = [];
      for (let i = 0; i < rows; i++) {
        row.push(matrix[i]![j] ?? 0);
      }
      result.push(row);
    }
    return result;
  }

  private _determinant(matrix: number[][]): number {
    const n = matrix.length;
    if (n === 0) return 1;
    if (n === 1) return matrix[0]![0]!;
    if (n === 2) return matrix[0]![0]! * matrix[1]![1]! - matrix[0]![1]! * matrix[1]![0]!;
    let det = 0;
    for (let j = 0; j < n; j++) {
      const minor = matrix.slice(1).map(row => row.filter((_, idx) => idx !== j));
      det += (j % 2 === 0 ? 1 : -1) * matrix[0]![j]! * this._determinant(minor);
    }
    return det;
  }

  private _solveSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i] ?? 0]);
    for (let i = 0; i < n; i++) {
      let pivotRow = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(aug[r]![i]!) > Math.abs(aug[pivotRow]![i]!)) pivotRow = r;
      }
      [aug[i]!, aug[pivotRow]!] = [aug[pivotRow]!, aug[i]!];
      const pivot = aug[i]![i]!;
      if (Math.abs(pivot) < 1e-12) continue;
      for (let c = i; c <= n; c++) aug[i]![c] = aug[i]![c]! / pivot;
      for (let r = 0; r < n; r++) {
        if (r !== i) {
          const factor = aug[r]![i]!;
          for (let c = i; c <= n; c++) {
            aug[r]![c] = aug[r]![c]! - factor * aug[i]![c]!;
          }
        }
      }
    }
    return aug.map(row => row[n] ?? 0);
  }
}
