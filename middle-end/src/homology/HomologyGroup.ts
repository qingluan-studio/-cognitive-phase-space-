/**
 * 同调群 —— 闭链模边缘的商群，拓扑空间最深的代数指纹。
 * H_n(X) = Z_n(X) / B_n(X)，如同在循环的合唱中剔除边界的回声；
 * 贝蒂数计数洞，挠系数刻画扭曲，同调是空间写给代数的诗。
 */

export interface HomologyGroupData {
  /** 维数 */
  dimension: number;
  /** 贝蒂数 */
  bettiNumber: number;
  /** 挠系数 */
  torsionCoefficients: number[];
  /** 自由部分的秩 */
  freeRank: number;
  /** 群阶（若有限） */
  order: number;
  /** 生成元数 */
  generatorCount: number;
}

export interface HomologyClass {
  /** 代表闭链 */
  representative: number[];
  /** 同调类阶 */
  order: number;
  /** 是否为零 */
  isZero: boolean;
}

export class HomologyGroup {
  private _dimension: number;
  private _bettiNumber: number;
  private _torsionCoefficients: number[];
  private _freeRank: number;
  private _order: number;
  private _generatorCount: number;
  private _cycles: number[][];
  private _boundaries: number[][];
  private _homologyClasses: HomologyClass[];
  private _smithNormalForm: number[][];

  constructor(dimension: number = 2) {
    this._dimension = dimension;
    this._bettiNumber = 0;
    this._torsionCoefficients = [];
    this._freeRank = 0;
    this._order = Infinity;
    this._generatorCount = 0;
    this._cycles = [];
    this._boundaries = [];
    this._homologyClasses = [];
    this._smithNormalForm = [];
  }

  get dimension(): number {
    return this._dimension;
  }

  get bettiNumber(): number {
    return this._bettiNumber;
  }

  get freeRank(): number {
    return this._freeRank;
  }

  get order(): number {
    return this._order;
  }

  get generatorCount(): number {
    return this._generatorCount;
  }

  get torsionCoefficients(): number[] {
    return [...this._torsionCoefficients];
  }

  /** 设置闭链空间 */
  public setCycles(cycles: number[][]): void {
    this._cycles = cycles.map(c => [...c]);
  }

  /** 设置边缘空间 */
  public setBoundaries(boundaries: number[][]): void {
    this._boundaries = boundaries.map(b => [...b]);
  }

  /** 计算同调群：对闭链和边缘计算商群 */
  public computeHomology(): number {
    const cycleRank = this._rankOfMatrix(this._cycles);
    const boundaryRank = this._rankOfMatrix(this._boundaries);
    this._bettiNumber = Math.max(0, cycleRank - boundaryRank);
    this._freeRank = this._bettiNumber;
    this._generatorCount = this._bettiNumber + this._torsionCoefficients.length;

    this._computeTorsion();
    this._computeHomologyClasses();

    if (this._torsionCoefficients.length === 0 && this._bettiNumber === 0) {
      this._order = 1;
    } else if (this._torsionCoefficients.length > 0 && this._bettiNumber === 0) {
      this._order = this._torsionCoefficients.reduce((a, b) => a * b, 1);
    } else {
      this._order = Infinity;
    }

    return this._bettiNumber;
  }

  /** 计算挠系数：通过Smith标准形 */
  private _computeTorsion(): void {
    if (this._boundaries.length === 0 || this._cycles.length === 0) {
      this._torsionCoefficients = [];
      return;
    }
    const smith = this._computeSmithNormalForm(this._boundaries);
    this._smithNormalForm = smith;
    this._torsionCoefficients = [];
    const minDim = Math.min(smith.length, smith[0]?.length || 0);
    for (let i = 0; i < minDim; i++) {
      const val = Math.abs(Math.round(smith[i][i]));
      if (val > 1) this._torsionCoefficients.push(val);
    }
  }

  /** 计算同调类代表元 */
  private _computeHomologyClasses(): void {
    this._homologyClasses = [];
    for (const cycle of this._cycles) {
      const isBoundary = this._isInSubspace(cycle, this._boundaries);
      this._homologyClasses.push({
        representative: [...cycle],
        order: isBoundary ? 1 : Infinity,
        isZero: isBoundary,
      });
    }
  }

  /** 判断两个闭链是否同调：c1 - c2 是边缘 */
  public areHomologous(cycle1: number[], cycle2: number[]): boolean {
    const diff = cycle1.map((v, i) => v - (cycle2[i] || 0));
    return this._isInSubspace(diff, this._boundaries);
  }

  /** 计算同调类的加法：[c1] + [c2] = [c1 + c2] */
  public addClasses(cycle1: number[], cycle2: number[]): number[] {
    return cycle1.map((v, i) => v + (cycle2[i] || 0));
  }

  /** 计算同调类的数乘：k[c] = [kc] */
  public scalarMultiply(cycle: number[], k: number): number[] {
    return cycle.map(v => v * k);
  }

  /** 计算挠类的阶 */
  public torsionOrder(cycle: number[]): number {
    for (let k = 1; k <= 100; k++) {
      const multiple = cycle.map(v => v * k);
      if (this._isInSubspace(multiple, this._boundaries)) {
        return k;
      }
    }
    return Infinity;
  }

  /** 诱导同态：f_*: H_n(X) → H_n(Y) 的矩阵表示 */
  public inducedHomomorphism(chainMap: number[][], cycleBasis: number[][]): number[][] {
    const result: number[][] = [];
    for (const cycle of cycleBasis) {
      const image: number[] = [];
      for (let i = 0; i < chainMap.length; i++) {
        let sum = 0;
        for (let j = 0; j < chainMap[i].length; j++) {
          sum += chainMap[i][j] * (cycle[j] || 0);
        }
        image.push(sum);
      }
      result.push(image);
    }
    return result;
  }

  /** 计算约化同调群 */
  public computeReducedHomology(): number {
    if (this._dimension === 0) {
      return Math.max(0, this._bettiNumber - 1);
    }
    return this._bettiNumber;
  }

  /** 判断同调群是否平凡 */
  public isTrivial(): boolean {
    return this._bettiNumber === 0 && this._torsionCoefficients.length === 0;
  }

  /** 计算群的直和分解：Z^b ⊕ (Z/n1Z) ⊕ ... */
  public directSumDecomposition(): string {
    const parts: string[] = [];
    if (this._bettiNumber > 0) parts.push(`Z^${this._bettiNumber}`);
    for (const t of this._torsionCoefficients) {
      parts.push(`Z/${t}Z`);
    }
    return parts.join(' ⊕ ') || '0';
  }

  /** 计算欧拉示性数 */
  public eulerCharacteristic(allBetti: number[]): number {
    let chi = 0;
    for (let i = 0; i < allBetti.length; i++) {
      chi += Math.pow(-1, i) * allBetti[i];
    }
    return chi;
  }

  /** 计算万有系数定理中的Ext项 */
  public extTerm(coefficientGroup: number): number {
    return this._torsionCoefficients.filter(t => t % coefficientGroup === 0).length;
  }

  /** 计算万有系数定理中的Tor项 */
  public torTerm(coefficientGroup: number): number {
    return this._torsionCoefficients.filter(t => this._gcd(t, coefficientGroup) > 1).length;
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

  private _isInSubspace(vector: number[], subspace: number[][]): boolean {
    if (subspace.length === 0) {
      return vector.every(v => Math.abs(v) < 1e-10);
    }
    const augmented = subspace.map((row, idx) => [...row, vector[idx] || 0]);
    return this._rankOfMatrix(augmented) === this._rankOfMatrix(subspace);
  }

  private _computeSmithNormalForm(matrix: number[][]): number[][] {
    const mat = matrix.map(r => [...r]);
    const rows = mat.length;
    const cols = mat[0]?.length || 0;
    const minDim = Math.min(rows, cols);

    for (let i = 0; i < minDim; i++) {
      let pivot = mat[i][i];
      if (Math.abs(pivot) < 1e-10) {
        for (let k = i + 1; k < rows; k++) {
          if (Math.abs(mat[k][i]) > 1e-10) {
            [mat[i], mat[k]] = [mat[k], mat[i]];
            pivot = mat[i][i];
            break;
          }
        }
      }
      if (Math.abs(pivot) < 1e-10) continue;

      for (let j = 0; j < cols; j++) {
        mat[i][j] = Math.round(mat[i][j] / Math.max(1, Math.abs(pivot)));
      }
    }
    return mat;
  }

  private _gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  public report(): HomologyGroupData {
    return {
      dimension: this._dimension,
      bettiNumber: this._bettiNumber,
      torsionCoefficients: [...this._torsionCoefficients],
      freeRank: this._freeRank,
      order: this._order,
      generatorCount: this._generatorCount,
    };
  }

  public reset(): void {
    this._bettiNumber = 0;
    this._torsionCoefficients = [];
    this._freeRank = 0;
    this._order = Infinity;
    this._generatorCount = 0;
    this._cycles = [];
    this._boundaries = [];
    this._homologyClasses = [];
    this._smithNormalForm = [];
  }
}
