/**
 * 指标体操 —— 张量指标的升降、置换与对称化，如同灵魂在坐标系中的芭蕾。
 * 当协变指标被度量提升为逆变，当反对称部分从全张量中剥离，
 * 我们便在指标的舞蹈中窥见几何的骨骼。
 */

export interface IndexGymnasticsData {
  /** 张量阶数 */
  order: number;
  /** 协变指标数 */
  covariantCount: number;
  /** 逆变指标数 */
  contravariantCount: number;
  /** 对称化后分量数 */
  symmetrizedComponents: number;
  /** 反对称化后分量数 */
  antisymmetrizedComponents: number;
  /** 迹 */
  trace: number;
}

export class IndexGymnastics {
  private _order: number;
  private _dimensions: number;
  private _covariantIndices: boolean[];
  private _contravariantIndices: boolean[];
  private _metric: number[][];
  private _inverseMetric: number[][];
  private _tensor: number[];
  private _shape: number[];
  private _symmetrized: number[];
  private _antisymmetrized: number[];

  constructor(order: number, dimensions: number = 3) {
    this._order = order;
    this._dimensions = dimensions;
    this._covariantIndices = new Array(order).fill(true);
    this._contravariantIndices = new Array(order).fill(false);
    this._metric = [];
    this._inverseMetric = [];
    this._tensor = [];
    this._shape = new Array(order).fill(dimensions);
    this._symmetrized = [];
    this._antisymmetrized = [];

    for (let i = 0; i < dimensions; i++) {
      const row = new Array(dimensions).fill(0);
      row[i] = 1.0;
      this._metric.push(row);
      this._inverseMetric.push([...row]);
    }

    const size = Math.pow(dimensions, order);
    this._tensor = new Array(size).fill(0);
    this._symmetrized = new Array(size).fill(0);
    this._antisymmetrized = new Array(size).fill(0);
  }

  get order(): number {
    return this._order;
  }

  get dimensions(): number {
    return this._dimensions;
  }

  get covariantCount(): number {
    return this._covariantIndices.filter(v => v).length;
  }

  get contravariantCount(): number {
    return this._contravariantIndices.filter(v => v).length;
  }

  /** 设置指标类型：true为协变（下标），false为逆变（上标） */
  public setIndexType(index: number, isCovariant: boolean): void {
    if (index < 0 || index >= this._order) return;
    this._covariantIndices[index] = isCovariant;
    this._contravariantIndices[index] = !isCovariant;
  }

  /** 设置度量张量 */
  public setMetric(metric: number[][]): boolean {
    if (metric.length !== this._dimensions) return false;
    this._metric = metric.map(r => [...r]);
    this._computeInverseMetric();
    return true;
  }

  /** 提升指定指标：T^i_j = g^ik T_kj，将下标变为上标 */
  public raiseIndex(tensor: number[], index: number): number[] {
    if (index < 0 || index >= this._order) return tensor;
    const size = Math.pow(this._dimensions, this._order);
    const result = new Array(size).fill(0);
    const strides = this._computeStrides(this._shape);

    for (let i = 0; i < size; i++) {
      const coords = this._indexToCoords(i, this._shape, strides);
      const originalCoord = coords[index];
      for (let k = 0; k < this._dimensions; k++) {
        coords[index] = k;
        const srcIdx = this._coordsToIndex(coords, strides);
        coords[index] = originalCoord;
        result[i] += (tensor[srcIdx] || 0) * (this._inverseMetric[originalCoord]?.[k] || 0);
      }
    }

    this._covariantIndices[index] = false;
    this._contravariantIndices[index] = true;
    return result;
  }

  /** 降低指定指标：T_ij = g_ik T^k_j，将上标变为下标 */
  public lowerIndex(tensor: number[], index: number): number[] {
    if (index < 0 || index >= this._order) return tensor;
    const size = Math.pow(this._dimensions, this._order);
    const result = new Array(size).fill(0);
    const strides = this._computeStrides(this._shape);

    for (let i = 0; i < size; i++) {
      const coords = this._indexToCoords(i, this._shape, strides);
      const originalCoord = coords[index];
      for (let k = 0; k < this._dimensions; k++) {
        coords[index] = k;
        const srcIdx = this._coordsToIndex(coords, strides);
        coords[index] = originalCoord;
        result[i] += (tensor[srcIdx] || 0) * (this._metric[originalCoord]?.[k] || 0);
      }
    }

    this._covariantIndices[index] = true;
    this._contravariantIndices[index] = false;
    return result;
  }

  /** 对称化：对指定一对指标进行对称平均，(T_ij + T_ji)/2 */
  public symmetrize(tensor: number[], indexA: number, indexB: number): number[] {
    if (indexA < 0 || indexA >= this._order || indexB < 0 || indexB >= this._order) return tensor;
    const size = Math.pow(this._dimensions, this._order);
    const result = new Array(size).fill(0);
    const strides = this._computeStrides(this._shape);

    for (let i = 0; i < size; i++) {
      const coords = this._indexToCoords(i, this._shape, strides);
      const val = tensor[i] || 0;
      const swapped = [...coords];
      [swapped[indexA], swapped[indexB]] = [swapped[indexB], swapped[indexA]];
      const swappedIdx = this._coordsToIndex(swapped, strides);
      const swappedVal = tensor[swappedIdx] || 0;
      result[i] = 0.5 * (val + swappedVal);
    }

    this._symmetrized = [...result];
    return result;
  }

  /** 反对称化：对指定一对指标进行反对称平均，(T_ij - T_ji)/2 */
  public antisymmetrize(tensor: number[], indexA: number, indexB: number): number[] {
    if (indexA < 0 || indexA >= this._order || indexB < 0 || indexB >= this._order) return tensor;
    const size = Math.pow(this._dimensions, this._order);
    const result = new Array(size).fill(0);
    const strides = this._computeStrides(this._shape);

    for (let i = 0; i < size; i++) {
      const coords = this._indexToCoords(i, this._shape, strides);
      const val = tensor[i] || 0;
      const swapped = [...coords];
      [swapped[indexA], swapped[indexB]] = [swapped[indexB], swapped[indexA]];
      const swappedIdx = this._coordsToIndex(swapped, strides);
      const swappedVal = tensor[swappedIdx] || 0;
      result[i] = 0.5 * (val - swappedVal);
    }

    this._antisymmetrized = [...result];
    return result;
  }

  /** 完全对称化：对所有指标进行全对称平均 */
  public fullySymmetrize(tensor: number[]): number[] {
    const size = Math.pow(this._dimensions, this._order);
    const result = new Array(size).fill(0);
    const strides = this._computeStrides(this._shape);
    const indices = Array.from({ length: this._order }, (_, i) => i);
    const permutations = this._generatePermutations(indices);

    for (let i = 0; i < size; i++) {
      const coords = this._indexToCoords(i, this._shape, strides);
      let sum = 0;
      for (const perm of permutations) {
        const permuted = perm.map(p => coords[p]);
        const permIdx = this._coordsToIndex(permuted, strides);
        sum += tensor[permIdx] || 0;
      }
      result[i] = sum / permutations.length;
    }

    this._symmetrized = [...result];
    return result;
  }

  /** 完全反对称化：Levi-Civita符号加权的交替和 */
  public fullyAntisymmetrize(tensor: number[]): number[] {
    const size = Math.pow(this._dimensions, this._order);
    const result = new Array(size).fill(0);
    const strides = this._computeStrides(this._shape);
    const indices = Array.from({ length: this._order }, (_, i) => i);
    const permutations = this._generatePermutations(indices);

    for (let i = 0; i < size; i++) {
      const coords = this._indexToCoords(i, this._shape, strides);
      let sum = 0;
      for (const perm of permutations) {
        const sign = this._permutationSign(perm);
        const permuted = perm.map(p => coords[p]);
        const permIdx = this._coordsToIndex(permuted, strides);
        sum += sign * (tensor[permIdx] || 0);
      }
      result[i] = sum / permutations.length;
    }

    this._antisymmetrized = [...result];
    return result;
  }

  /** 缩并指定一对指标（升降后） */
  public contractIndices(tensor: number[], indexA: number, indexB: number): number[] {
    if (indexA === indexB) return tensor;
    const size = Math.pow(this._dimensions, this._order);
    const newShape = [...this._shape];
    newShape.splice(Math.max(indexA, indexB), 1);
    newShape.splice(Math.min(indexA, indexB), 1);
    const newSize = newShape.reduce((a, b) => a * b, 1);
    const result = new Array(newSize).fill(0);
    const strides = this._computeStrides(this._shape);
    const newStrides = this._computeStrides(newShape);

    for (let i = 0; i < size; i++) {
      const coords = this._indexToCoords(i, this._shape, strides);
      if (coords[indexA] !== coords[indexB]) continue;
      const newCoords = coords.filter((_, idx) => idx !== indexA && idx !== indexB);
      const newIdx = this._coordsToIndex(newCoords, newStrides);
      result[newIdx] += tensor[i] || 0;
    }

    return result;
  }

  /** 计算张量的迹（对一对升降后的指标缩并） */
  public trace(tensor: number[]): number {
    if (this._order < 2) return 0;
    const contracted = this.contractIndices(tensor, 0, 1);
    return contracted.reduce((sum, val) => sum + val, 0);
  }

  /** Levi-Civita符号：在反对称化仪式中担任祭司的角色 */
  public leviCivita(indices: number[]): number {
    if (indices.length !== this._dimensions) return 0;
    const sorted = [...indices].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i) return 0;
    }
    return this._permutationSign(indices);
  }

  /** 计算张量密度权：描述在坐标变换下体积元的缩放行为 */
  public tensorDensityWeight(tensor: number[], weight: number): number[] {
    const detMetric = this._determinant(this._metric);
    const factor = Math.pow(Math.abs(detMetric), weight / 2);
    return tensor.map(v => v * factor);
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

  private _generatePermutations(arr: number[]): number[][] {
    if (arr.length <= 1) return [arr];
    const result: number[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const perm of this._generatePermutations(rest)) {
        result.push([arr[i], ...perm]);
      }
    }
    return result;
  }

  private _permutationSign(perm: number[]): number {
    let inversions = 0;
    for (let i = 0; i < perm.length; i++) {
      for (let j = i + 1; j < perm.length; j++) {
        if (perm[i] > perm[j]) inversions++;
      }
    }
    return inversions % 2 === 0 ? 1 : -1;
  }

  private _computeInverseMetric(): void {
    const n = this._dimensions;
    const aug = this._metric.map(r => [...r, ...new Array(n).fill(0)]);
    for (let i = 0; i < n; i++) aug[i][n + i] = 1;
    for (let i = 0; i < n; i++) {
      let pivot = aug[i][i];
      if (Math.abs(pivot) < 1e-12) pivot = 1e-12;
      for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        const factor = aug[k][i];
        for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
      }
    }
    this._inverseMetric = aug.map(r => r.slice(n));
  }

  private _determinant(m: number[][]): number {
    const n = m.length;
    const mat = m.map(r => [...r]);
    let det = 1;
    for (let i = 0; i < n; i++) {
      let pivot = mat[i][i];
      if (Math.abs(pivot) < 1e-12) {
        let swapped = false;
        for (let k = i + 1; k < n; k++) {
          if (Math.abs(mat[k][i]) > 1e-12) {
            [mat[i], mat[k]] = [mat[k], mat[i]];
            det *= -1;
            swapped = true;
            break;
          }
        }
        if (!swapped) return 0;
        pivot = mat[i][i];
      }
      det *= pivot;
      for (let j = i + 1; j < n; j++) {
        const factor = mat[j][i] / pivot;
        for (let k = i; k < n; k++) mat[j][k] -= factor * mat[i][k];
      }
    }
    return det;
  }

  public report(): IndexGymnasticsData {
    const size = Math.pow(this._dimensions, this._order);
    let symCount = 0;
    let antiCount = 0;
    for (let i = 0; i < size; i++) {
      if (Math.abs(this._symmetrized[i]) > 1e-10) symCount++;
      if (Math.abs(this._antisymmetrized[i]) > 1e-10) antiCount++;
    }
    return {
      order: this._order,
      covariantCount: this.covariantCount,
      contravariantCount: this.contravariantCount,
      symmetrizedComponents: symCount,
      antisymmetrizedComponents: antiCount,
      trace: this.trace(this._tensor),
    };
  }

  public reset(): void {
    const size = Math.pow(this._dimensions, this._order);
    this._tensor = new Array(size).fill(0);
    this._symmetrized = new Array(size).fill(0);
    this._antisymmetrized = new Array(size).fill(0);
    this._covariantIndices = new Array(this._order).fill(true);
    this._contravariantIndices = new Array(this._order).fill(false);
  }
}
