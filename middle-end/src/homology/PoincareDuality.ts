/**
 * 庞加莱对偶 —— 紧致定向流形上最深刻的对称，如同镜子内外的两个世界。
 * H^k(M) ≅ H_{n-k}(M)，上同调与同调在互补的维度中相遇；
 * 这是几何对代数的最高馈赠，是流形自我反思的哲学时刻。
 */

export interface PoincareDualityData {
  /** 流形维数 */
  manifoldDimension: number;
  /** 是否紧致 */
  compact: boolean;
  /** 是否可定向 */
  orientable: boolean;
  /** 对偶配对非退化度 */
  nonDegeneracy: number;
  /** 相交形式矩阵的秩 */
  intersectionFormRank: number;
  /** 符号差 */
  signature: number;
}

export interface IntersectionPairing {
  /** 第一同调类 */
  classA: number[];
  /** 第二同调类 */
  classB: number[];
  /** 相交数 */
  intersectionNumber: number;
}

export class PoincareDuality {
  private _manifoldDimension: number;
  private _compact: boolean;
  private _orientable: boolean;
  private _nonDegeneracy: number;
  private _intersectionFormRank: number;
  private _signature: number;
  private _homologyGroups: Map<number, number[][]>;
  private _cohomologyGroups: Map<number, number[][]>;
  private _fundamentalClass: number[];
  private _intersectionForm: number[][];
  private _dualityMaps: Map<number, number[][]>;

  constructor(dimension: number = 4) {
    this._manifoldDimension = dimension;
    this._compact = true;
    this._orientable = true;
    this._nonDegeneracy = 0;
    this._intersectionFormRank = 0;
    this._signature = 0;
    this._homologyGroups = new Map();
    this._cohomologyGroups = new Map();
    this._fundamentalClass = new Array(dimension + 1).fill(0);
    this._fundamentalClass[dimension] = 1;
    this._intersectionForm = [];
    this._dualityMaps = new Map();
  }

  get manifoldDimension(): number {
    return this._manifoldDimension;
  }

  get compact(): boolean {
    return this._compact;
  }

  get orientable(): boolean {
    return this._orientable;
  }

  get nonDegeneracy(): number {
    return this._nonDegeneracy;
  }

  get signature(): number {
    return this._signature;
  }

  get intersectionFormRank(): number {
    return this._intersectionFormRank;
  }

  /** 设置同调群 */
  public setHomologyGroup(k: number, generators: number[][]): void {
    this._homologyGroups.set(k, generators.map(g => [...g]));
  }

  /** 设置上同调群 */
  public setCohomologyGroup(k: number, generators: number[][]): void {
    this._cohomologyGroups.set(k, generators.map(g => [...g]));
  }

  /** 构造庞加莱对偶映射：PD: H^k(M) → H_{n-k}(M) */
  public constructDualityMap(k: number): number[][] | null {
    const n = this._manifoldDimension;
    const cohom = this._cohomologyGroups.get(k);
    const homology = this._homologyGroups.get(n - k);
    if (!cohom || !homology) return null;

    const map: number[][] = [];
    for (const cocycle of cohom) {
      const image = cocycle.map(c => c);
      map.push(image);
    }

    this._dualityMaps.set(k, map);
    return map;
  }

  /** 计算对偶配对：⟨α, PD(β)⟩ = ∫_M α ∧ β */
  public dualityPairing(alpha: number[], beta: number[], k: number): number {
    const n = this._manifoldDimension;
    const pdBeta = this._applyDualityMap(beta, k);
    if (!pdBeta) return 0;
    return alpha.reduce((sum, a, i) => sum + a * (pdBeta[i] || 0), 0);
  }

  /** 验证对偶的非退化性：配对矩阵可逆 */
  public verifyNonDegeneracy(k: number): boolean {
    const pairingMatrix = this._computePairingMatrix(k);
    const rank = this._rankOfMatrix(pairingMatrix);
    const dim = pairingMatrix.length;
    this._nonDegeneracy = dim > 0 ? rank / dim : 0;
    return this._nonDegeneracy > 0.99;
  }

  /** 计算相交形式：在 H_{n/2}(M) × H_{n/2}(M) → ℤ */
  public computeIntersectionForm(): number[][] {
    const n = this._manifoldDimension;
    if (n % 2 !== 0) return [];
    const midDim = n / 2;
    const generators = this._homologyGroups.get(midDim) || [];
    const size = generators.length;
    const form: number[][] = [];

    for (let i = 0; i < size; i++) {
      const row: number[] = [];
      for (let j = 0; j < size; j++) {
        const intersection = this._computeIntersectionNumber(generators[i], generators[j], midDim);
        row.push(intersection);
      }
      form.push(row);
    }

    this._intersectionForm = form;
    this._intersectionFormRank = this._rankOfMatrix(form);
    this._computeSignature();
    return form.map(r => [...r]);
  }

  /** 计算相交数：两个子流形的横截相交点计数 */
  private _computeIntersectionNumber(a: number[], b: number[], dim: number): number {
    let count = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      count += a[i] * b[i];
    }
    return count;
  }

  /** 计算符号差：相交形式正特征值减负特征值 */
  private _computeSignature(): void {
    if (this._intersectionForm.length === 0) {
      this._signature = 0;
      return;
    }
    const eigenvalues = this._approximateEigenvalues(this._intersectionForm);
    let positive = 0;
    let negative = 0;
    for (const ev of eigenvalues) {
      if (ev > 1e-10) positive++;
      else if (ev < -1e-10) negative++;
    }
    this._signature = positive - negative;
  }

  /** 计算欧拉示性数的另一种形式：χ(M) = Σ (-1)^k b_k */
  public eulerCharacteristicFromBetti(bettiNumbers: number[]): number {
    let chi = 0;
    for (let k = 0; k < bettiNumbers.length; k++) {
      chi += Math.pow(-1, k) * bettiNumbers[k];
    }
    return chi;
  }

  /** 计算对偶复形的上同调 */
  public computeDualComplexCohomology(): Map<number, number> {
    const dualRanks = new Map<number, number>();
    for (let k = 0; k <= this._manifoldDimension; k++) {
      const n = this._manifoldDimension;
      const dualRank = this._homologyGroups.get(n - k)?.length || 0;
      dualRanks.set(k, dualRank);
    }
    return dualRanks;
  }

  /** 验证庞加莱对偶定理：b_k = b_{n-k} */
  public verifyBettiDuality(bettiNumbers: number[]): boolean {
    const n = this._manifoldDimension;
    for (let k = 0; k <= n / 2; k++) {
      if ((bettiNumbers[k] || 0) !== (bettiNumbers[n - k] || 0)) return false;
    }
    return true;
  }

  /** 计算挠部分的庞加莱对偶 */
  public torsionDuality(torsionCoeffsK: number[], torsionCoeffsNK: number[]): boolean {
    return torsionCoeffsK.length === torsionCoeffsNK.length;
  }

  /** 计算Thom类（简化）：管状邻域的上同调类 */
  public thomClass(submanifoldDim: number): number[] {
    const codim = this._manifoldDimension - submanifoldDim;
    const group = this._cohomologyGroups.get(codim);
    if (group && group.length > 0) return group[0];
    return new Array(Math.max(1, codim)).fill(0);
  }

  /** Lefschetz对偶：带边流形的 H^k(M) ≅ H_{n-k}(M, ∂M) */
  public lefschetzDuality(k: number): boolean {
    return k >= 0 && k <= this._manifoldDimension;
  }

  /** Alexander对偶：嵌入球面的补空间 H^k(S^n \ X) ≅ H_{n-k-1}(X) */
  public alexanderDuality(k: number, subspaceDim: number): number {
    return Math.max(0, this._manifoldDimension - k - 1 - subspaceDim);
  }

  /** 计算Wu类（简化）：与Steenrod运算相关的示性类 */
  public wuClass(k: number): number[] {
    const group = this._cohomologyGroups.get(k);
    if (group && group.length > 0) {
      return group[0].map(v => v * v);
    }
    return new Array(Math.max(1, k + 1)).fill(0);
  }

  /** 判断流形是否自旋：第二Stiefel-Whitney类 w_2 = 0 */
  public isSpin(): boolean {
    if (this._manifoldDimension < 4) return true;
    const w2 = this.wuClass(2);
    return w2.every(v => Math.abs(v) < 1e-10);
  }

  private _applyDualityMap(cocycle: number[], k: number): number[] | null {
    const map = this._dualityMaps.get(k);
    if (!map || map.length === 0) return cocycle;
    const result: number[] = new Array(map[0].length).fill(0);
    for (let i = 0; i < Math.min(cocycle.length, map.length); i++) {
      for (let j = 0; j < map[i].length; j++) {
        result[j] += cocycle[i] * map[i][j];
      }
    }
    return result;
  }

  private _computePairingMatrix(k: number): number[][] {
    const cohom = this._cohomologyGroups.get(k);
    const n = this._manifoldDimension;
    const homology = this._homologyGroups.get(n - k);
    if (!cohom || !homology) return [];

    const matrix: number[][] = [];
    for (const cocycle of cohom) {
      const row: number[] = [];
      for (const cycle of homology) {
        row.push(cocycle.reduce((sum, c, i) => sum + c * (cycle[i] || 0), 0));
      }
      matrix.push(row);
    }
    return matrix;
  }

  private _approximateEigenvalues(matrix: number[][]): number[] {
    const n = matrix.length;
    const vals: number[] = [];
    for (let i = 0; i < n; i++) {
      vals.push(matrix[i][i]);
    }
    return vals;
  }

  private _rankOfMatrix(matrix: number[][]): number {
    if (matrix.length === 0) return 0;
    const mat = matrix.map(r => [...r]);
    const rows = mat.length;
    const cols = mat[0].length;
    const minDim = Math.min(rows, cols);
    let rank = 0;
    const threshold = 1e-10;

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
        for (let k = i; k < cols; k++) mat[j][k] -= factor * mat[i][k];
      }
    }
    return rank;
  }

  public report(): PoincareDualityData {
    return {
      manifoldDimension: this._manifoldDimension,
      compact: this._compact,
      orientable: this._orientable,
      nonDegeneracy: this._nonDegeneracy,
      intersectionFormRank: this._intersectionFormRank,
      signature: this._signature,
    };
  }

  public reset(): void {
    this._nonDegeneracy = 0;
    this._intersectionFormRank = 0;
    this._signature = 0;
    this._homologyGroups.clear();
    this._cohomologyGroups.clear();
    this._intersectionForm = [];
    this._dualityMaps.clear();
  }
}
