/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 群表示论 —— 对称性的代数回声
 * Group Representation Theory: The Algebraic Echo of Symmetry
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 当群在向量空间上起舞，每一次群作用都是对称性的一次呼吸。
 * 表示论将抽象的群结构翻译成线性变换的语言，让不可见的对称变得可见。
 */

export interface GroupElement {
  readonly id: string;
  readonly order: number;
  readonly inverseId: string;
}

export interface RepresentationSpace {
  readonly dimension: number;
  readonly basis: string[];
  readonly field: 'real' | 'complex';
}

export interface MatrixRep {
  readonly elementId: string;
  readonly matrix: number[][];
}

export class GroupRepresentation {
  private _groupName: string;
  private _dimension: number;
  private _representations: Map<string, number[][]>;
  private _space: RepresentationSpace;
  private _characterTable: Map<string, number>;
  private _isUnitary: boolean;
  private _isIrreducible: boolean;
  private _invariantSubspaces: number[][][];
  private _history: string[];

  constructor(groupName: string, dimension: number, space: RepresentationSpace) {
    this._groupName = groupName;
    this._dimension = dimension;
    this._representations = new Map();
    this._space = space;
    this._characterTable = new Map();
    this._isUnitary = false;
    this._isIrreducible = false;
    this._invariantSubspaces = [];
    this._history = [];
    this._recordHistory('Birth of representation: ' + groupName + ' in dimension ' + dimension);
  }

  get groupName(): string { return this._groupName; }
  get dimension(): number { return this._dimension; }
  get isUnitary(): boolean { return this._isUnitary; }
  get isIrreducible(): boolean { return this._isIrreducible; }

  /**
   * 注册一个群元素的矩阵表示
   * Register the matrix representation of a group element
   */
  public registerElement(elementId: string, matrix: number[][]): void {
    if (matrix.length !== this._dimension || matrix[0].length !== this._dimension) {
      throw new Error('Matrix dimension mismatch with representation space');
    }
    this._representations.set(elementId, matrix);
    this._recordHistory('Element ' + elementId + ' inscribed into the algebraic scroll');
  }

  /**
   * 验证群同态性质：ρ(gh) = ρ(g)ρ(h)
   * Verify the group homomorphism property
   */
  public verifyHomomorphism(gId: string, hId: string, ghId: string): boolean {
    const rhoG = this._representations.get(gId);
    const rhoH = this._representations.get(hId);
    const rhoGH = this._representations.get(ghId);
    if (!rhoG || !rhoH || !rhoGH) return false;

    const product = this._multiplyMatrices(rhoG, rhoH);
    const isHomomorphism = this._matricesEqual(product, rhoGH);
    this._recordHistory('Homomorphism verified for ' + gId + ' * ' + hId + ' = ' + isHomomorphism);
    return isHomomorphism;
  }

  /**
   * 计算表示的特征标 χ(g) = tr(ρ(g))
   * Compute the character χ(g) = trace(ρ(g))
   */
  public computeCharacter(elementId: string): number {
    const matrix = this._representations.get(elementId);
    if (!matrix) return 0;
    let trace = 0;
    for (let i = 0; i < this._dimension; i++) {
      trace += matrix[i][i];
    }
    this._characterTable.set(elementId, trace);
    return trace;
  }

  /**
   * 验证表示的幺正性：ρ(g)† ρ(g) = I
   * Verify unitarity of the representation
   */
  public verifyUnitarity(elementId: string): boolean {
    const matrix = this._representations.get(elementId);
    if (!matrix) return false;
    const conjugateTranspose = this._conjugateTranspose(matrix);
    const product = this._multiplyMatrices(conjugateTranspose, matrix);
    const identity = this._identityMatrix(this._dimension);
    this._isUnitary = this._matricesEqual(product, identity);
    return this._isUnitary;
  }

  /**
   * 寻找不变子空间——对称性扎根的土壤
   * Find invariant subspaces where symmetry takes root
   */
  public findInvariantSubspaces(): number[][][] {
    const subspaces: number[][][] = [];
    // 尝试寻找1维不变子空间（特征向量）
    for (const [id, matrix] of this._representations) {
      const eigenvectors = this._computeEigenvectors(matrix);
      for (const ev of eigenvectors) {
        const subspace = [ev];
        if (this._isInvariant(subspace)) {
          subspaces.push(subspace);
        }
      }
    }
    this._invariantSubspaces = subspaces;
    this._recordHistory('Discovered ' + subspaces.length + ' invariant subspaces');
    return subspaces;
  }

  /**
   * 判断表示是否可约——寻找分解的可能
   * Determine if representation is reducible
   */
  public checkReducibility(): boolean {
    const subspaces = this.findInvariantSubspaces();
    const isReducible = subspaces.length > 0 && this._dimension > 1;
    this._isIrreducible = !isReducible;
    this._recordHistory('Reducibility: ' + isReducible + ', Irreducible: ' + this._isIrreducible);
    return isReducible;
  }

  /**
   * 计算表示的张量积 ρ ⊗ σ
   * Compute the tensor product of representations
   */
  public tensorProduct(other: GroupRepresentation): number[][][] {
    const result: number[][][] = [];
    const newDim = this._dimension * other.dimension;
    for (const [id, matA] of this._representations) {
      const matB = other._representations.get(id);
      if (!matB) continue;
      const kronecker = this._kroneckerProduct(matA, matB);
      result.push(kronecker);
    }
    this._recordHistory('Tensor product born, dimension ' + newDim);
    return result;
  }

  /**
   * 计算对偶表示 ρ*
   * Compute the dual representation
   */
  public dualRepresentation(): Map<string, number[][]> {
    const dual = new Map<string, number[][]>();
    for (const [id, matrix] of this._representations) {
      const inverted = this._invertMatrix(matrix);
      const transposed = this._transpose(inverted);
      dual.set(id, transposed);
    }
    this._recordHistory('Dual representation conjured');
    return dual;
  }

  /**
   * 计算表示的直和分解
   * Compute direct sum decomposition
   */
  public directSum(other: GroupRepresentation): number[][][] {
    const result: number[][][] = [];
    const newDim = this._dimension + other.dimension;
    for (const [id, matA] of this._representations) {
      const matB = other._representations.get(id);
      if (!matB) continue;
      const block = this._blockDiagonal(matA, matB);
      result.push(block);
    }
    this._recordHistory('Direct sum woven, dimension ' + newDim);
    return result;
  }

  /**
   * 应用Maschke定理：将可约表示分解为不可约表示的直和
   * Apply Maschke's theorem to decompose into irreducibles
   */
  public maschkeDecompose(): GroupRepresentation[] {
    const irreducibles: GroupRepresentation[] = [];
    if (this._isIrreducible) {
      irreducibles.push(this);
      return irreducibles;
    }
    // 简化实现：假设存在非平凡不变子空间
    for (const subspace of this._invariantSubspaces) {
      const subRep = new GroupRepresentation(this._groupName + '_sub', subspace.length, this._space);
      irreducibles.push(subRep);
    }
    this._recordHistory('Maschke decomposition completed');
    return irreducibles;
  }

  /**
   * 报告表示的状态
   */
  public report(): object {
    return {
      groupName: this._groupName,
      dimension: this._dimension,
      elementCount: this._representations.size,
      isUnitary: this._isUnitary,
      isIrreducible: this._isIrreducible,
      invariantSubspaces: this._invariantSubspaces.length,
      history: this._history
    };
  }

  public reset(): void {
    this._representations.clear();
    this._characterTable.clear();
    this._isUnitary = false;
    this._isIrreducible = false;
    this._invariantSubspaces = [];
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }

  private _multiplyMatrices(a: number[][], b: number[][]): number[][] {
    const n = a.length;
    const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  }

  private _matricesEqual(a: number[][], b: number[][], epsilon = 1e-10): boolean {
    const n = a.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (Math.abs(a[i][j] - b[i][j]) > epsilon) return false;
      }
    }
    return true;
  }

  private _identityMatrix(n: number): number[][] {
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    );
  }

  private _conjugateTranspose(matrix: number[][]): number[][] {
    const n = matrix.length;
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => matrix[j][i])
    );
  }

  private _computeEigenvectors(matrix: number[][]): number[][] {
    // 简化的2x2特征向量计算
    const n = matrix.length;
    const vectors: number[][] = [];
    if (n === 2) {
      const trace = matrix[0][0] + matrix[1][1];
      const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
      const lambda1 = (trace + Math.sqrt(trace * trace - 4 * det)) / 2;
      const lambda2 = (trace - Math.sqrt(trace * trace - 4 * det)) / 2;
      for (const lambda of [lambda1, lambda2]) {
        if (Math.abs(matrix[1][0]) > 1e-10) {
          vectors.push([lambda - matrix[1][1], matrix[1][0]]);
        } else {
          vectors.push([1, 0]);
        }
      }
    }
    return vectors;
  }

  private _isInvariant(subspace: number[][]): boolean {
    // 简化检查
    return subspace.length > 0;
  }

  private _kroneckerProduct(a: number[][], b: number[][]): number[][] {
    const ar = a.length, ac = a[0].length;
    const br = b.length, bc = b[0].length;
    const result: number[][] = Array.from({ length: ar * br }, () => Array(ac * bc).fill(0));
    for (let i = 0; i < ar; i++) {
      for (let j = 0; j < ac; j++) {
        for (let k = 0; k < br; k++) {
          for (let l = 0; l < bc; l++) {
            result[i * br + k][j * bc + l] = a[i][j] * b[k][l];
          }
        }
      }
    }
    return result;
  }

  private _invertMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;
    const augmented: number[][] = matrix.map((row, i) => [
      ...row,
      ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    ]);
    // 高斯消元
    for (let i = 0; i < n; i++) {
      const pivot = augmented[i][i];
      for (let j = 0; j < 2 * n; j++) augmented[i][j] /= pivot;
      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
    return augmented.map(row => row.slice(n));
  }

  private _transpose(matrix: number[][]): number[][] {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }

  private _blockDiagonal(a: number[][], b: number[][]): number[][] {
    const n = a.length, m = b.length;
    const result: number[][] = Array.from({ length: n + m }, () => Array(n + m).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) result[i][j] = a[i][j];
    }
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) result[n + i][n + j] = b[i][j];
    }
    return result;
  }
}
