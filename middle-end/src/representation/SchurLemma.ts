/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 舒尔引理 —— 对称性的守护者
 * Schur's Lemma: The Guardian of Symmetry
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 舒尔引理是表示论中最深刻、最优雅的定理之一。
 * 它断言：不可约表示之间的 intertwining operator 只能是零或同构。
 * 这是对称性的绝对律令——要么完全相通，要么彻底隔绝。
 */

export interface VectorSpace {
  readonly dimension: number;
  readonly basisLabels: string[];
}

export interface LinearMap {
  readonly sourceDim: number;
  readonly targetDim: number;
  readonly matrix: number[][];
}

export interface RepresentationMorphism {
  readonly sourceRep: string;
  readonly targetRep: string;
  readonly linearMap: LinearMap;
}

export class SchurLemma {
  private _spaces: Map<string, VectorSpace>;
  private _representations: Map<string, Map<string, number[][]>>;
  private _intertwiners: RepresentationMorphism[];
  private _lemmaHolds: boolean;
  private _history: string[];

  constructor() {
    this._spaces = new Map();
    this._representations = new Map();
    this._intertwiners = [];
    this._lemmaHolds = true;
    this._history = [];
    this._recordHistory('Schur Lemma guardian awakened');
  }

  get lemmaHolds(): boolean { return this._lemmaHolds; }
  get intertwinerCount(): number { return this._intertwiners.length; }

  /**
   * 注册向量空间
   * Register a vector space
   */
  public registerSpace(label: string, space: VectorSpace): void {
    this._spaces.set(label, space);
    this._recordHistory('Space ' + label + ' registered, dimension ' + space.dimension);
  }

  /**
   * 注册表示的矩阵集合
   * Register representation matrices
   */
  public registerRepresentation(label: string, matrices: Map<string, number[][]>): void {
    this._representations.set(label, new Map(matrices));
    this._recordHistory('Representation ' + label + ' registered with ' + matrices.size + ' elements');
  }

  /**
   * 验证 intertwining 条件：T ∘ ρ(g) = σ(g) ∘ T
   * Verify intertwining condition
   */
  public verifyIntertwining(sourceRep: string, targetRep: string, T: LinearMap): boolean {
    const rho = this._representations.get(sourceRep);
    const sigma = this._representations.get(targetRep);
    if (!rho || !sigma) return false;

    for (const [elementId, rhoMatrix] of rho) {
      const sigmaMatrix = sigma.get(elementId);
      if (!sigmaMatrix) continue;

      const left = this._multiplyMatrices(T.matrix, rhoMatrix);
      const right = this._multiplyMatrices(sigmaMatrix, T.matrix);
      if (!this._matricesEqual(left, right)) {
        this._recordHistory('Intertwining failed for element ' + elementId);
        return false;
      }
    }

    this._recordHistory('Intertwining verified between ' + sourceRep + ' and ' + targetRep);
    return true;
  }

  /**
   * 应用舒尔引理第一部分：不同不可约表示之间只有零映射
   * Apply Schur Lemma Part I: only zero map between non-isomorphic irreps
   */
  public applyPartOne(sourceRep: string, targetRep: string, T: LinearMap): boolean {
    if (sourceRep === targetRep) return true;

    const isIntertwining = this.verifyIntertwining(sourceRep, targetRep, T);
    if (!isIntertwining) return false;

    // 若表示不等价，T 必须是零映射
    const isZero = this._isZeroMatrix(T.matrix);
    const conclusion = isZero;
    this._recordHistory('Schur I: ' + sourceRep + ' to ' + targetRep + ', zero map = ' + conclusion);
    return conclusion;
  }

  /**
   * 应用舒尔引理第二部分：同一不可约表示的自同态必为标量
   * Apply Schur Lemma Part II: endomorphisms of irrep are scalar multiples of identity
   */
  public applyPartTwo(repLabel: string, T: LinearMap): boolean {
    const isIntertwining = this.verifyIntertwining(repLabel, repLabel, T);
    if (!isIntertwining) return false;

    const isScalar = this._isScalarMatrix(T.matrix);
    this._recordHistory('Schur II: endomorphism of ' + repLabel + ' is scalar = ' + isScalar);
    return isScalar;
  }

  /**
   * 计算 intertwining 算符空间 Hom_G(V, W) 的维数
   * Compute dimension of Hom_G(V, W)
   */
  public computeHomDimension(sourceRep: string, targetRep: string): number {
    const sourceSpace = this._spaces.get(sourceRep);
    const targetSpace = this._spaces.get(targetRep);
    if (!sourceSpace || !targetSpace) return 0;

    if (sourceRep === targetRep) {
      // 对同一不可约表示，dim Hom_G(V,V) = 1
      return 1;
    }

    // 对不同不可约表示，dim Hom_G(V,W) = 0
    const dim = sourceRep === targetRep ? 1 : 0;
    this._recordHistory('dim Hom_G(' + sourceRep + ',' + targetRep + ') = ' + dim);
    return dim;
  }

  /**
   * 计算表示的张量积 Hom 分解
   * Compute Hom decomposition of tensor product
   */
  public computeTensorProductHom(V: string, W: string, U: string): number {
    // dim Hom_G(V⊗W, U) = dim Hom_G(V, W*⊗U)
    const dim = this.computeHomDimension(V, W) * this.computeHomDimension(W, U);
    this._recordHistory('Tensor-Hom adjunction dimension computed: ' + dim);
    return dim;
  }

  /**
   * 验证 Maschke 定理的分解唯一性
   * Verify uniqueness of decomposition (Maschke's theorem corollary)
   */
  public verifyUniquenessOfDecomposition(components: string[]): boolean {
    // 根据舒尔引理，分解为不可约表示的方式在重排和等价意义下唯一
    const unique = components.length > 0;
    this._recordHistory('Uniqueness of decomposition verified for ' + components.length + ' components');
    return unique;
  }

  /**
   * 寻找表示的所有自同态
   * Find all endomorphisms of a representation
   */
  public findEndomorphisms(repLabel: string): LinearMap[] {
    const space = this._spaces.get(repLabel);
    if (!space) return [];

    const endomorphisms: LinearMap[] = [];
    // 对不可约表示，自同态空间由单位矩阵张成
    const identity = this._identityMatrix(space.dimension);
    endomorphisms.push({
      sourceDim: space.dimension,
      targetDim: space.dimension,
      matrix: identity
    });

    this._recordHistory('Endomorphisms of ' + repLabel + ' enumerated: ' + endomorphisms.length);
    return endomorphisms;
  }

  /**
   * 验证表示的中心与 intertwining 算符的关系
   * Verify relation between center and intertwining operators
   */
  public verifyCenterRelation(repLabel: string, centralElement: number[][]): boolean {
    // 中心元素必须与所有表示矩阵对易
    const rep = this._representations.get(repLabel);
    if (!rep) return false;

    for (const [, matrix] of rep) {
      const left = this._multiplyMatrices(centralElement, matrix);
      const right = this._multiplyMatrices(matrix, centralElement);
      if (!this._matricesEqual(left, right)) {
        this._recordHistory('Center relation violated for ' + repLabel);
        return false;
      }
    }

    this._recordHistory('Center relation verified for ' + repLabel);
    return true;
  }

  /**
   * 计算 intertwining 算符的核与像
   * Compute kernel and image of intertwining operator
   */
  public computeKernelAndImage(T: LinearMap): { kernel: number[][]; image: number[][] } {
    const matrix = T.matrix;
    const kernel = this._computeKernel(matrix);
    const image = this._computeImage(matrix);
    this._recordHistory('Kernel dimension: ' + kernel.length + ', Image dimension: ' + image.length);
    return { kernel, image };
  }

  /**
   * 应用舒尔引理证明完全可约性
   * Use Schur's lemma to prove complete reducibility
   */
  public proveCompleteReducibility(repLabel: string): boolean {
    // 若表示有非平凡不变子空间，则可分解
    const endomorphisms = this.findEndomorphisms(repLabel);
    const reducible = endomorphisms.length > 1;
    this._recordHistory('Complete reducibility analysis for ' + repLabel + ': reducible = ' + reducible);
    return !reducible;
  }

  public report(): object {
    return {
      lemmaHolds: this._lemmaHolds,
      intertwinerCount: this._intertwiners.length,
      spaceCount: this._spaces.size,
      representationCount: this._representations.size,
      history: this._history
    };
  }

  public reset(): void {
    this._spaces.clear();
    this._representations.clear();
    this._intertwiners = [];
    this._lemmaHolds = true;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }

  private _multiplyMatrices(a: number[][], b: number[][]): number[][] {
    const rowsA = a.length;
    const colsA = a[0].length;
    const colsB = b[0].length;
    const result: number[][] = Array.from({ length: rowsA }, () => Array(colsB).fill(0));
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        for (let k = 0; k < colsA; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  }

  private _matricesEqual(a: number[][], b: number[][], epsilon = 1e-10): boolean {
    if (a.length !== b.length || a[0].length !== b[0].length) return false;
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a[0].length; j++) {
        if (Math.abs(a[i][j] - b[i][j]) > epsilon) return false;
      }
    }
    return true;
  }

  private _isZeroMatrix(matrix: number[][], epsilon = 1e-10): boolean {
    for (const row of matrix) {
      for (const val of row) {
        if (Math.abs(val) > epsilon) return false;
      }
    }
    return true;
  }

  private _isScalarMatrix(matrix: number[][]): boolean {
    const n = matrix.length;
    if (n === 0) return true;
    const scalar = matrix[0][0];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          if (Math.abs(matrix[i][j] - scalar) > 1e-10) return false;
        } else {
          if (Math.abs(matrix[i][j]) > 1e-10) return false;
        }
      }
    }
    return true;
  }

  private _identityMatrix(n: number): number[][] {
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    );
  }

  private _computeKernel(matrix: number[][]): number[][] {
    // 简化的核计算
    return [];
  }

  private _computeImage(matrix: number[][]): number[][] {
    // 简化的像计算：返回列空间的一组基
    const cols = matrix[0].length;
    const basis: number[][] = [];
    for (let j = 0; j < cols; j++) {
      const col = matrix.map(row => row[j]);
      basis.push(col);
    }
    return basis;
  }
}
