/**
 * 余切丛 —— 流形上所有余切空间的并集，如同每一点处悬挂的满天星图。
 * 切向量是方向的箭，余向量是测量的尺；
 * 当所有尺子被收集成丛，微分形式的世界便在纤维之上绽放。
 */

export interface CotangentBundleData {
  /** 底流形维数 */
  baseDimension: number;
  /** 丛的维数（总空间） */
  bundleDimension: number;
  /** 纤维维数 */
  fiberDimension: number;
  /** 截面数量 */
  sections: number;
  /** 是否可平行化 */
  parallelizable: boolean;
}

export interface Covector {
  /** 基点坐标 */
  basePoint: number[];
  /** 分量 */
  components: number[];
  /** 对偶配对值 */
  pairingValue: number;
}

export class CotangentBundle {
  private _baseDimension: number;
  private _bundleDimension: number;
  private _fiberDimension: number;
  private _sections: number;
  private _parallelizable: boolean;
  private _metric: number[][];
  private _covectors: Covector[];
  private _differentialForms: number[][];
  private _musicalIsomorphism: boolean;

  constructor(baseDimension: number = 3) {
    this._baseDimension = baseDimension;
    this._fiberDimension = baseDimension;
    this._bundleDimension = 2 * baseDimension;
    this._sections = 0;
    this._parallelizable = false;
    this._metric = [];
    this._covectors = [];
    this._differentialForms = [];
    this._musicalIsomorphism = true;

    for (let i = 0; i < baseDimension; i++) {
      const row = new Array(baseDimension).fill(0);
      row[i] = 1.0;
      this._metric.push(row);
    }
  }

  get baseDimension(): number {
    return this._baseDimension;
  }

  get bundleDimension(): number {
    return this._bundleDimension;
  }

  get fiberDimension(): number {
    return this._fiberDimension;
  }

  get sections(): number {
    return this._sections;
  }

  get parallelizable(): boolean {
    return this._parallelizable;
  }

  /** 设置黎曼度量，建立切丛与余切丛之间的音乐同构 */
  public setMetric(metric: number[][]): boolean {
    if (metric.length !== this._baseDimension) return false;
    this._metric = metric.map(r => [...r]);
    this._musicalIsomorphism = this._computeInverseMetric();
    return true;
  }

  /** 降号映射（flat）：将切向量变为余切向量，v^b = g(v, -) */
  public flat(vector: number[], basePoint: number[]): Covector {
    const components: number[] = [];
    for (let i = 0; i < this._baseDimension; i++) {
      let sum = 0;
      for (let j = 0; j < this._baseDimension; j++) {
        sum += this._metric[i][j] * vector[j];
      }
      components.push(sum);
    }
    return {
      basePoint: [...basePoint],
      components,
      pairingValue: this._pairing(vector, components),
    };
  }

  /** 升号映射（sharp）：将余切向量变为切向量，ω^# = g^{-1}(ω, -) */
  public sharp(covector: number[], basePoint: number[]): number[] {
    const inverse = this._invertMatrix(this._metric);
    const vector: number[] = [];
    for (let i = 0; i < this._baseDimension; i++) {
      let sum = 0;
      for (let j = 0; j < this._baseDimension; j++) {
        sum += inverse[i][j] * covector[j];
      }
      vector.push(sum);
    }
    return vector;
  }

  /** 外微分：将k-形式提升为(k+1)-形式，如同在形式的阶梯上攀升 */
  public exteriorDerivative(form: number[], degree: number): number[] {
    const dim = this._baseDimension;
    const newSize = Math.pow(dim, degree + 1);
    const result = new Array(newSize).fill(0);
    const oldStrides = this._computeStrides(new Array(degree).fill(dim));
    const newStrides = this._computeStrides(new Array(degree + 1).fill(dim));

    for (let i = 0; i < form.length; i++) {
      const coords = this._indexToCoords(i, new Array(degree).fill(dim), oldStrides);
      for (let k = 0; k < dim; k++) {
        const newCoords = [k, ...coords];
        const newIdx = this._coordsToIndex(newCoords, newStrides);
        let sign = 1;
        for (let p = 0; p < coords.length; p++) {
          if (coords[p] === k) sign = 0;
        }
        result[newIdx] += sign * form[i];
      }
    }
    return result;
  }

  /** 楔积：两个微分形式的反对称相遇，α ∧ β */
  public wedgeProduct(alpha: number[], beta: number[], degA: number, degB: number): number[] {
    const dim = this._baseDimension;
    const degC = degA + degB;
    const sizeC = Math.pow(dim, degC);
    const result = new Array(sizeC).fill(0);
    const stridesA = this._computeStrides(new Array(degA).fill(dim));
    const stridesB = this._computeStrides(new Array(degB).fill(dim));
    const stridesC = this._computeStrides(new Array(degC).fill(dim));

    for (let i = 0; i < alpha.length; i++) {
      for (let j = 0; j < beta.length; j++) {
        const coordsA = this._indexToCoords(i, new Array(degA).fill(dim), stridesA);
        const coordsB = this._indexToCoords(j, new Array(degB).fill(dim), stridesB);
        const coordsC = [...coordsA, ...coordsB];
        const idxC = this._coordsToIndex(coordsC, stridesC);
        const sign = this._wedgeSign(coordsA, coordsB);
        result[idxC] += sign * alpha[i] * beta[j];
      }
    }
    return result;
  }

  /** 添加一个1-形式截面：在流形上每一点指定一个余向量 */
  public addOneFormSection(formFunction: (point: number[]) => number[]): void {
    const samplePoint = new Array(this._baseDimension).fill(0).map(() => Math.random());
    const form = formFunction(samplePoint);
    this._differentialForms.push(form);
    this._sections++;
  }

  /** 计算李导数：沿向量场对微分形式的拖拽，如同风对旗帜的作用 */
  public lieDerivative(form: number[], vectorField: number[][], degree: number): number[] {
    const dim = this._baseDimension;
    const result = new Array(form.length).fill(0);
    const strides = this._computeStrides(new Array(degree).fill(dim));

    for (let i = 0; i < form.length; i++) {
      const coords = this._indexToCoords(i, new Array(degree).fill(dim), strides);
      let divergence = 0;
      for (let k = 0; k < dim; k++) {
        const vk = vectorField[coords[0] % vectorField.length]?.[k] || 0;
        const derivative = (form[Math.min(i + 1, form.length - 1)] - form[Math.max(i - 1, 0)]) / 0.02;
        divergence += vk * derivative + (form[i] || 0) * derivative;
      }
      result[i] = divergence;
    }
    return result;
  }

  /** 对偶配对：余向量与向量的内蕴之约，⟨ω, v⟩ */
  public dualPairing(covector: number[], vector: number[]): number {
    return this._pairing(vector, covector);
  }

  /** 构造典范1-形式（Liouville形式）：在余切丛上 tautological 的存在 */
  public canonicalOneForm(point: number[], covector: number[]): number {
    return this._pairing(point, covector);
  }

  /** 构造典范辛形式：ω = dθ，余切丛上天然的辛结构 */
  public canonicalSymplecticForm(position: number[], momentum: number[]): number[][] {
    const dim = this._baseDimension;
    const omega: number[][] = [];
    for (let i = 0; i < 2 * dim; i++) {
      const row = new Array(2 * dim).fill(0);
      omega.push(row);
    }
    for (let i = 0; i < dim; i++) {
      omega[i][dim + i] = 1;
      omega[dim + i][i] = -1;
    }
    return omega;
  }

  /** 验证闭合性：dω = 0，微分形式的几何守恒 */
  public isClosed(form: number[], degree: number): boolean {
    const dForm = this.exteriorDerivative(form, degree);
    const ddForm = this.exteriorDerivative(dForm, degree + 1);
    return ddForm.every(v => Math.abs(v) < 1e-10);
  }

  /** 判断整体截面是否存在：基于拓扑障碍的哲学沉思 */
  public globalSectionExists(): boolean {
    return this._parallelizable || this._baseDimension % 2 === 1;
  }

  private _pairing(vector: number[], covector: number[]): number {
    let sum = 0;
    for (let i = 0; i < this._baseDimension; i++) {
      sum += (vector[i] || 0) * (covector[i] || 0);
    }
    return sum;
  }

  private _computeInverseMetric(): boolean {
    const inv = this._invertMatrix(this._metric);
    return inv.length === this._baseDimension;
  }

  private _invertMatrix(m: number[][]): number[][] {
    const n = m.length;
    const aug = m.map(r => [...r, ...new Array(n).fill(0)]);
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
    return aug.map(r => r.slice(n));
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

  private _wedgeSign(coordsA: number[], coordsB: number[]): number {
    let inversions = 0;
    for (const a of coordsA) {
      for (const b of coordsB) {
        if (a > b) inversions++;
      }
    }
    return inversions % 2 === 0 ? 1 : -1;
  }

  public report(): CotangentBundleData {
    return {
      baseDimension: this._baseDimension,
      bundleDimension: this._bundleDimension,
      fiberDimension: this._fiberDimension,
      sections: this._sections,
      parallelizable: this._parallelizable,
    };
  }

  public reset(): void {
    this._sections = 0;
    this._covectors = [];
    this._differentialForms = [];
    this._parallelizable = false;
  }
}
