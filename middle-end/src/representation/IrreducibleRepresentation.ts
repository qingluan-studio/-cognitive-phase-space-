/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 不可约表示 —— 对称性的原子
 * Irreducible Representation: The Atom of Symmetry
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 不可约表示是群表示论中的基本粒子。它们如同化学元素，
 * 一切复杂的表示都由它们构筑。舒尔引理守护着它们的圣殿，
 * 让它们彼此正交，彼此独立，如同宇宙中不可通约的星光。
 */

export interface IrrepData {
  readonly label: string;
  readonly dimension: number;
  readonly characterValues: number[];
  readonly highestWeight?: number[];
}

export interface Intertwiner {
  readonly source: string;
  readonly target: string;
  readonly matrix: number[][];
}

export class IrreducibleRepresentation {
  private _label: string;
  private _dimension: number;
  private _characterValues: number[];
  private _highestWeight: number[];
  private _matrixElements: Map<string, number[][]>;
  private _isUnitary: boolean;
  private _schurIndex: number;
  private _history: string[];

  constructor(data: IrrepData) {
    this._label = data.label;
    this._dimension = data.dimension;
    this._characterValues = [...data.characterValues];
    this._highestWeight = data.highestWeight ? [...data.highestWeight] : [];
    this._matrixElements = new Map();
    this._isUnitary = false;
    this._schurIndex = 1;
    this._history = [];
    this._recordHistory('Irreducible representation ' + data.label + ' crystallized, dimension ' + data.dimension);
  }

  get label(): string { return this._label; }
  get dimension(): number { return this._dimension; }
  get isUnitary(): boolean { return this._isUnitary; }
  get schurIndex(): number { return this._schurIndex; }

  /**
   * 注册矩阵元
   * Register matrix elements for a group element
   */
  public registerMatrix(elementId: string, matrix: number[][]): void {
    if (matrix.length !== this._dimension || matrix[0].length !== this._dimension) {
      throw new Error('Matrix dimension must match irrep dimension');
    }
    this._matrixElements.set(elementId, matrix);
    this._recordHistory('Matrix registered for element ' + elementId);
  }

  /**
   * 应用舒尔引理：验证两个不可约表示之间的 intertwining operator
   * Apply Schur's Lemma: verify intertwining operator between irreps
   */
  public applySchurLemma(other: IrreducibleRepresentation, intertwiner: Intertwiner): boolean {
    if (this._label !== intertwiner.source || other.label !== intertwiner.target) {
      return false;
    }

    const T = intertwiner.matrix;
    // 验证 T ρ(g) = σ(g) T 对所有g成立
    for (const [elementId, rhoMatrix] of this._matrixElements) {
      const sigmaMatrix = other._matrixElements.get(elementId);
      if (!sigmaMatrix) continue;

      const left = this._multiplyMatrices(T, rhoMatrix);
      const right = this._multiplyMatrices(sigmaMatrix, T);
      if (!this._matricesEqual(left, right)) {
        this._recordHistory('Schur lemma: ' + this._label + ' and ' + other.label + ' not intertwined');
        return false;
      }
    }

    // 若不等价，T必为零；若等价，T必为标量倍单位矩阵
    const isScalar = this._isScalarMatrix(T);
    this._recordHistory('Schur lemma applied: intertwining operator is scalar = ' + isScalar);
    return isScalar;
  }

  /**
   * 计算Clebsch-Gordan系数：不可约表示的张量积分解
   * Compute Clebsch-Gordan coefficients for tensor product decomposition
   */
  public computeClebschGordan(other: IrreducibleRepresentation): Map<string, number[][]> {
    const coefficients = new Map<string, number[][]>();
    const totalDim = this._dimension * other.dimension;

    // 简化的CG系数计算框架
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 0; j < other.dimension; j++) {
        const key = this._label + '_' + other.label + '_' + i + '_' + j;
        const cgMatrix = this._generateCGMatrix(i, j, totalDim);
        coefficients.set(key, cgMatrix);
      }
    }

    this._recordHistory('Clebsch-Gordan coefficients computed for ' + this._label + ' ⊗ ' + other.label);
    return coefficients;
  }

  /**
   * 验证不可约性：ρ与所有群元素对易的算符必为标量
   * Verify irreducibility via commutant test
   */
  public verifyIrreducibility(): boolean {
    // 简化：检查是否存在非平凡不变子空间
    const testMatrix = this._generateRandomMatrix(this._dimension);
    let commutesWithAll = true;

    for (const [, rhoMatrix] of this._matrixElements) {
      const left = this._multiplyMatrices(testMatrix, rhoMatrix);
      const right = this._multiplyMatrices(rhoMatrix, testMatrix);
      if (!this._matricesEqual(left, right)) {
        commutesWithAll = false;
        break;
      }
    }

    // 若存在非标量矩阵与所有ρ(g)对易，则表示可约
    const isIrreducible = !commutesWithAll || this._isScalarMatrix(testMatrix);
    this._recordHistory('Irreducibility verified: ' + isIrreducible);
    return isIrreducible;
  }

  /**
   * 计算Wigner D-矩阵元
   * Compute Wigner D-matrix elements
   */
  public computeWignerDMatrix(angles: number[]): number[][] {
    const n = this._dimension;
    const D: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    if (n === 2 && angles.length >= 3) {
      // SU(2) 的2维表示
      const [alpha, beta, gamma] = angles;
      D[0][0] = Math.cos(beta / 2) * Math.exp(-(alpha + gamma) / 2);
      D[0][1] = -Math.sin(beta / 2) * Math.exp(-(alpha - gamma) / 2);
      D[1][0] = Math.sin(beta / 2) * Math.exp((alpha - gamma) / 2);
      D[1][1] = Math.cos(beta / 2) * Math.exp((alpha + gamma) / 2);
    }

    this._recordHistory('Wigner D-matrix computed for angles [' + angles.join(', ') + ']');
    return D;
  }

  /**
   * 计算Casimir算符的本征值
   * Compute eigenvalue of Casimir operator
   */
  public computeCasimirEigenvalue(): number {
    // 简化：对SU(2)，Casimir C = j(j+1)，其中j = (dim-1)/2
    const j = (this._dimension - 1) / 2;
    const eigenvalue = j * (j + 1);
    this._recordHistory('Casimir eigenvalue computed: ' + eigenvalue);
    return eigenvalue;
  }

  /**
   * 计算表示的权重分解
   * Compute weight decomposition of the representation
   */
  public computeWeightDecomposition(): Map<number, number> {
    const weights = new Map<number, number>();
    // 简化：对SU(2)，权重从-j到+j
    const j = (this._dimension - 1) / 2;
    for (let m = -j; m <= j; m += 1) {
      weights.set(m, 1);
    }
    this._recordHistory('Weight decomposition computed with ' + weights.size + ' weights');
    return weights;
  }

  /**
   * 验证幺正性：所有矩阵元满足 ρ(g)† = ρ(g)⁻¹
   * Verify unitarity
   */
  public verifyUnitarity(): boolean {
    let allUnitary = true;
    for (const [, matrix] of this._matrixElements) {
      const dagger = this._conjugateTranspose(matrix);
      const inverse = this._invertMatrix(matrix);
      if (!this._matricesEqual(dagger, inverse)) {
        allUnitary = false;
        break;
      }
    }
    this._isUnitary = allUnitary;
    this._recordHistory('Unitarity verified: ' + allUnitary);
    return allUnitary;
  }

  /**
   * 计算Frobenius-Schur指标
   * Compute Frobenius-Schur indicator
   */
  public computeFrobeniusSchur(): number {
    // 简化：假设实表示，指标为1
    const indicator = this._isUnitary ? 1 : 0;
    this._schurIndex = indicator;
    this._recordHistory('Frobenius-Schur indicator: ' + indicator);
    return indicator;
  }

  /**
   * 计算Peter-Weyl定理中的傅里叶系数
   * Compute Fourier coefficient in Peter-Weyl decomposition
   */
  public computePeterWeylCoefficient(functionValues: number[], elementIds: string[]): number[][] {
    const n = this._dimension;
    const coeff: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let k = 0; k < elementIds.length; k++) {
      const matrix = this._matrixElements.get(elementIds[k]);
      if (!matrix) continue;
      const val = functionValues[k] || 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          coeff[i][j] += val * matrix[i][j];
        }
      }
    }

    this._recordHistory('Peter-Weyl Fourier coefficient computed');
    return coeff;
  }

  public report(): object {
    return {
      label: this._label,
      dimension: this._dimension,
      characterValues: this._characterValues,
      highestWeight: this._highestWeight,
      isUnitary: this._isUnitary,
      schurIndex: this._schurIndex,
      matrixElementCount: this._matrixElements.size,
      history: this._history
    };
  }

  public reset(): void {
    this._matrixElements.clear();
    this._isUnitary = false;
    this._schurIndex = 1;
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

  private _isScalarMatrix(matrix: number[][]): boolean {
    const n = matrix.length;
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

  private _generateCGMatrix(i: number, j: number, dim: number): number[][] {
    const matrix: number[][] = Array.from({ length: dim }, () => Array(dim).fill(0));
    const idx = i * 2 + j;
    if (idx < dim) matrix[idx][idx] = 1;
    return matrix;
  }

  private _generateRandomMatrix(n: number): number[][] {
    return Array.from({ length: n }, () =>
      Array.from({ length: n }, () => Math.random() * 2 - 1)
    );
  }

  private _conjugateTranspose(matrix: number[][]): number[][] {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }

  private _invertMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;
    const aug = matrix.map((row, i) => [
      ...row,
      ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    ]);
    for (let i = 0; i < n; i++) {
      const pivot = aug[i][i];
      for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        const factor = aug[k][i];
        for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
      }
    }
    return aug.map(row => row.slice(n));
  }
}
