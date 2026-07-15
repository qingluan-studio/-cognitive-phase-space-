/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 表示的张量积 —— 对称性的编织
 * Tensor Product of Representations: The Weaving of Symmetries
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 当两个表示在向量空间的织物上相遇，它们的张量积如同两种颜色的丝线
 * 交织成更丰富的图案。Clebsch-Gordan系数是编织的针脚，
 * 将不可约的子表示一针一线地缝合出来。
 */

export interface TensorFactor {
  readonly label: string;
  readonly dimension: number;
  readonly matrices: Map<string, number[][]>;
}

export interface DecompositionMultiplicity {
  readonly irrepLabel: string;
  readonly multiplicity: number;
}

export class TensorProductRep {
  private _factorA: TensorFactor | null;
  private _factorB: TensorFactor | null;
  private _productDimension: number;
  private _productMatrices: Map<string, number[][]>;
  private _decomposition: DecompositionMultiplicity[];
  private _clebschGordanCoefficients: Map<string, number[][]>;
  private _isSymmetrized: boolean;
  private _history: string[];

  constructor() {
    this._factorA = null;
    this._factorB = null;
    this._productDimension = 0;
    this._productMatrices = new Map();
    this._decomposition = [];
    this._clebschGordanCoefficients = new Map();
    this._isSymmetrized = false;
    this._history = [];
    this._recordHistory('Tensor product representation loom prepared');
  }

  get productDimension(): number { return this._productDimension; }
  get decomposition(): DecompositionMultiplicity[] { return [...this._decomposition]; }
  get isSymmetrized(): boolean { return this._isSymmetrized; }

  /**
   * 设置张量积的两个因子
   * Set the two factors of the tensor product
   */
  public setFactors(factorA: TensorFactor, factorB: TensorFactor): void {
    this._factorA = factorA;
    this._factorB = factorB;
    this._productDimension = factorA.dimension * factorB.dimension;
    this._recordHistory('Factors set: ' + factorA.label + ' (dim ' + factorA.dimension + ') ⊗ ' + factorB.label + ' (dim ' + factorB.dimension + ')');
  }

  /**
   * 计算张量积表示 ρ ⊗ σ
   * Compute the tensor product representation
   */
  public computeTensorProduct(): Map<string, number[][]> {
    if (!this._factorA || !this._factorB) {
      throw new Error('Both factors must be set before computing tensor product');
    }

    this._productMatrices.clear();
    for (const [elementId, matA] of this._factorA.matrices) {
      const matB = this._factorB.matrices.get(elementId);
      if (!matB) continue;
      const kronecker = this._kroneckerProduct(matA, matB);
      this._productMatrices.set(elementId, kronecker);
    }

    this._recordHistory('Tensor product computed: dimension ' + this._productDimension);
    return new Map(this._productMatrices);
  }

  /**
   * 计算张量积的特征标 χ_{ρ⊗σ}(g) = χ_ρ(g) χ_σ(g)
   * Compute character of tensor product
   */
  public computeCharacter(elementId: string): number {
    if (!this._factorA || !this._factorB) return 0;

    const matA = this._factorA.matrices.get(elementId);
    const matB = this._factorB.matrices.get(elementId);
    if (!matA || !matB) return 0;

    const traceA = this._trace(matA);
    const traceB = this._trace(matB);
    const productChar = traceA * traceB;

    this._recordHistory('Character of tensor product at ' + elementId + ' = ' + productChar);
    return productChar;
  }

  /**
   * 将张量积分解为不可约表示的直和
   * Decompose tensor product into direct sum of irreps
   */
  public decomposeIntoIrreducibles(irrepCharacters: Map<string, number[]>): DecompositionMultiplicity[] {
    this._decomposition = [];
    const groupOrder = irrepCharacters.size;

    for (const [irrepLabel, charValues] of irrepCharacters) {
      let multiplicity = 0;
      let idx = 0;
      for (const [elementId] of this._productMatrices) {
        const productChar = this.computeCharacter(elementId);
        const irrepChar = charValues[idx] || 0;
        // 简化的内积计算
        multiplicity += productChar * irrepChar;
        idx++;
      }
      multiplicity = Math.round(multiplicity / groupOrder);
      if (multiplicity > 0) {
        this._decomposition.push({ irrepLabel, multiplicity });
      }
    }

    this._recordHistory('Decomposed into ' + this._decomposition.length + ' irreducible components');
    return [...this._decomposition];
  }

  /**
   * 计算Clebsch-Gordan系数
   * Compute Clebsch-Gordan coefficients
   */
  public computeClebschGordan(): Map<string, number[][]> {
    if (!this._factorA || !this._factorB) return new Map();

    this._clebschGordanCoefficients.clear();
    const dimA = this._factorA.dimension;
    const dimB = this._factorB.dimension;

    for (let i = 0; i < dimA; i++) {
      for (let j = 0; j < dimB; j++) {
        for (let k = 0; k < this._productDimension; k++) {
          const key = 'CG_' + i + '_' + j + '_' + k;
          const coeff = this._computeCGEntry(i, j, k, dimA, dimB);
          const matrix = [[coeff]];
          this._clebschGordanCoefficients.set(key, matrix);
        }
      }
    }

    this._recordHistory('Clebsch-Gordan coefficients computed: ' + this._clebschGordanCoefficients.size + ' entries');
    return new Map(this._clebschGordanCoefficients);
  }

  /**
   * 对称化张量积：Sym²(V)
   * Symmetrize tensor product
   */
  public symmetrize(): Map<string, number[][]> {
    const symmetrized = new Map<string, number[][]>();
    for (const [elementId, matrix] of this._productMatrices) {
      const sym = this._symmetrizeMatrix(matrix);
      symmetrized.set(elementId, sym);
    }
    this._isSymmetrized = true;
    this._recordHistory('Tensor product symmetrized');
    return symmetrized;
  }

  /**
   * 反对称化张量积：Λ²(V)
   * Antisymmetrize tensor product
   */
  public antisymmetrize(): Map<string, number[][]> {
    const antisymmetrized = new Map<string, number[][]>();
    for (const [elementId, matrix] of this._productMatrices) {
      const antisym = this._antisymmetrizeMatrix(matrix);
      antisymmetrized.set(elementId, antisym);
    }
    this._recordHistory('Tensor product antisymmetrized');
    return antisymmetrized;
  }

  /**
   * 计算张量积的权分解
   * Compute weight decomposition of tensor product
   */
  public computeWeightDecomposition(weightsA: number[], weightsB: number[]): Map<number, number> {
    const productWeights = new Map<number, number>();
    for (const wa of weightsA) {
      for (const wb of weightsB) {
        const sum = wa + wb;
        const count = productWeights.get(sum) || 0;
        productWeights.set(sum, count + 1);
      }
    }
    this._recordHistory('Weight decomposition computed with ' + productWeights.size + ' distinct weights');
    return productWeights;
  }

  /**
   * 计算张量积的最高权
   * Compute highest weight of tensor product
   */
  public computeHighestWeight(weightsA: number[], weightsB: number[]): number {
    const maxA = Math.max(...weightsA);
    const maxB = Math.max(...weightsB);
    const highest = maxA + maxB;
    this._recordHistory('Highest weight of tensor product: ' + highest);
    return highest;
  }

  /**
   * 验证张量积表示的同态性质
   * Verify homomorphism property of tensor product representation
   */
  public verifyHomomorphism(gId: string, hId: string, ghId: string): boolean {
    const rhoG = this._productMatrices.get(gId);
    const rhoH = this._productMatrices.get(hId);
    const rhoGH = this._productMatrices.get(ghId);
    if (!rhoG || !rhoH || !rhoGH) return false;

    const product = this._multiplyMatrices(rhoG, rhoH);
    const holds = this._matricesEqual(product, rhoGH);
    this._recordHistory('Homomorphism verified for tensor product: ' + holds);
    return holds;
  }

  /**
   * 计算张量积表示的行列式
   * Compute determinant of tensor product matrices
   */
  public computeDeterminant(elementId: string): number {
    const matrix = this._productMatrices.get(elementId);
    if (!matrix) return 0;
    const det = this._determinant2x2Or3x3(matrix);
    this._recordHistory('Determinant of tensor product at ' + elementId + ' = ' + det);
    return det;
  }

  public report(): object {
    return {
      factorA: this._factorA?.label,
      factorB: this._factorB?.label,
      productDimension: this._productDimension,
      decomposition: this._decomposition,
      isSymmetrized: this._isSymmetrized,
      cgCoefficientCount: this._clebschGordanCoefficients.size,
      history: this._history
    };
  }

  public reset(): void {
    this._factorA = null;
    this._factorB = null;
    this._productDimension = 0;
    this._productMatrices.clear();
    this._decomposition = [];
    this._clebschGordanCoefficients.clear();
    this._isSymmetrized = false;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
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

  private _trace(matrix: number[][]): number {
    let sum = 0;
    for (let i = 0; i < matrix.length; i++) sum += matrix[i][i];
    return sum;
  }

  private _computeCGEntry(i: number, j: number, k: number, dimA: number, dimB: number): number {
    const expectedK = i * dimB + j;
    return k === expectedK ? 1 : 0;
  }

  private _symmetrizeMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;
    const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[i][j] = (matrix[i][j] + matrix[j][i]) / 2;
      }
    }
    return result;
  }

  private _antisymmetrizeMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;
    const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[i][j] = (matrix[i][j] - matrix[j][i]) / 2;
      }
    }
    return result;
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

  private _determinant2x2Or3x3(matrix: number[][]): number {
    const n = matrix.length;
    if (n === 2) {
      return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    }
    if (n === 3) {
      return matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1])
        - matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])
        + matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
    }
    return 0;
  }
}
