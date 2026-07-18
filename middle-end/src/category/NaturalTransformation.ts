/**
 * 自然变换 —— 函子之间的 morphism，范畴论中最温柔的舞蹈。
 * α: F ⇒ G，对每一对象A，赋予一个箭头α_A: F(A)→G(A)，
 * 使得所有的方框都交换，如同星辰在各自的轨道上保持和谐。
 */

import { CategoryObject, Morphism } from './Functor';

export interface NaturalTransformationData {
  /** 源函子名称 */
  sourceFunctor: string;
  /** 目标函子名称 */
  targetFunctor: string;
  /** 自然变换的组件数 */
  components: number;
  /** 是否自然 */
  isNatural: boolean;
  /** 是否为自然同构 */
  isNaturalIsomorphism: boolean;
}

export interface NaturalComponent {
  /** 对象标识 */
  objectId: string;
  /** 组件态射标识 */
  morphismId: string;
  /** 分量矩阵或数值表示 */
  matrix: number[][];
}

export class NaturalTransformation {
  private _sourceFunctor: string;
  private _targetFunctor: string;
  private _components: Map<string, NaturalComponent>;
  private _isNatural: boolean;
  private _isNaturalIsomorphism: boolean;
  private _sourceObjects: Map<string, CategoryObject>;
  private _sourceMorphisms: Map<string, Morphism>;
  private _targetMorphisms: Map<string, Morphism>;
  private _naturalityChecks: number;

  constructor(sourceFunctor: string, targetFunctor: string) {
    this._sourceFunctor = sourceFunctor;
    this._targetFunctor = targetFunctor;
    this._components = new Map();
    this._isNatural = true;
    this._isNaturalIsomorphism = false;
    this._sourceObjects = new Map();
    this._sourceMorphisms = new Map();
    this._targetMorphisms = new Map();
    this._naturalityChecks = 0;
  }

  get sourceFunctor(): string {
    return this._sourceFunctor;
  }

  get targetFunctor(): string {
    return this._targetFunctor;
  }

  get isNatural(): boolean {
    return this._isNatural;
  }

  get isNaturalIsomorphism(): boolean {
    return this._isNaturalIsomorphism;
  }

  get componentCount(): number {
    return this._components.size;
  }

  get naturalityChecks(): number {
    return this._naturalityChecks;
  }

  /** 注册源范畴的对象 */
  public registerObject(obj: CategoryObject): void {
    this._sourceObjects.set(obj.id, obj);
  }

  /** 注册源范畴的态射 */
  public registerMorphism(morph: Morphism): void {
    this._sourceMorphisms.set(morph.id, morph);
  }

  /** 注册目标范畴的态射 */
  public registerTargetMorphism(morph: Morphism): void {
    this._targetMorphisms.set(morph.id, morph);
  }

  /** 添加自然变换的分量：对对象A指定α_A */
  public addComponent(objectId: string, morphismId: string, matrix?: number[][]): boolean {
    if (!this._sourceObjects.has(objectId)) return false;
    this._components.set(objectId, {
      objectId,
      morphismId,
      matrix: matrix || [[1]],
    });
    return true;
  }

  /** 验证自然性方框：G(f) ∘ α_A = α_B ∘ F(f)，对每一态射f: A→B */
  public verifyNaturality(): boolean {
    this._isNatural = true;
    for (const morph of this._sourceMorphisms.values()) {
      const alphaA = this._components.get(morph.source);
      const alphaB = this._components.get(morph.target);
      if (!alphaA || !alphaB) continue;

      const leftPath = this._composeTargetMorphisms(morph.id, alphaA.morphismId);
      const rightPath = this._composeTargetMorphisms(alphaB.morphismId, morph.id);

      this._naturalityChecks++;
      if (!this._morphismsEqual(leftPath, rightPath)) {
        this._isNatural = false;
        return false;
      }
    }
    return true;
  }

  /** 水平复合：与另一自然变换的星号复合，如同两条平行旋律的交织 */
  public horizontalCompose(other: NaturalTransformation): NaturalTransformation | null {
    if (this._targetFunctor !== other._sourceFunctor) return null;
    const composed = new NaturalTransformation(this._sourceFunctor, other._targetFunctor);

    for (const [objId, compA] of this._components) {
      const compB = other._components.get(objId);
      if (compB) {
        composed.addComponent(objId, `${compA.morphismId}∘${compB.morphismId}`,
          this._multiplyMatrices(compA.matrix, compB.matrix));
      }
    }

    return composed;
  }

  /** 垂直复合：α ∘ β，在同一对函子之间的叠加 */
  public verticalCompose(other: NaturalTransformation): NaturalTransformation | null {
    if (this._sourceFunctor !== other._sourceFunctor || this._targetFunctor !== other._targetFunctor) {
      return null;
    }
    const composed = new NaturalTransformation(this._sourceFunctor, this._targetFunctor);

    for (const [objId, compA] of this._components) {
      const compB = other._components.get(objId);
      if (compB) {
        composed.addComponent(objId, `${compB.morphismId};${compA.morphismId}`,
          this._addMatrices(compA.matrix, compB.matrix));
      }
    }

    return composed;
  }

  /** 检查是否为自然同构：每个分量都是同构 */
  public checkNaturalIsomorphism(): boolean {
    for (const comp of this._components.values()) {
      if (!this._isInvertibleMatrix(comp.matrix)) {
        this._isNaturalIsomorphism = false;
        return false;
      }
    }
    this._isNaturalIsomorphism = this._isNatural;
    return this._isNaturalIsomorphism;
  }

  /** Whisker复合：与函子的左/右复合，如同在辫子的两端添加新的股 */
  public whiskerLeft(functor: string): NaturalTransformation {
    const whiskered = new NaturalTransformation(`${functor}∘${this._sourceFunctor}`, `${functor}∘${this._targetFunctor}`);
    for (const [objId, comp] of this._components) {
      whiskered.addComponent(objId, comp.morphismId, comp.matrix);
    }
    return whiskered;
  }

  public whiskerRight(functor: string): NaturalTransformation {
    const whiskered = new NaturalTransformation(`${this._sourceFunctor}∘${functor}`, `${this._targetFunctor}∘${functor}`);
    for (const [objId, comp] of this._components) {
      whiskered.addComponent(objId, comp.morphismId, comp.matrix);
    }
    return whiskered;
  }

  /** 计算自然变换的核：使分量为零的对象集合 */
  public computeKernel(): string[] {
    const kernel: string[] = [];
    for (const [objId, comp] of this._components) {
      if (this._isZeroMatrix(comp.matrix)) {
        kernel.push(objId);
      }
    }
    return kernel;
  }

  /** 计算自然变换的余核 */
  public computeCokernel(): string[] {
    const cokernel: string[] = [];
    for (const objId of this._sourceObjects.keys()) {
      if (!this._components.has(objId)) {
        cokernel.push(objId);
      }
    }
    return cokernel;
  }

  /** 提取特定对象的分量 */
  public getComponent(objectId: string): NaturalComponent | null {
    return this._components.get(objectId) || null;
  }

  /** 比较两个自然变换是否相等 */
  public equals(other: NaturalTransformation): boolean {
    if (this._sourceFunctor !== other._sourceFunctor || this._targetFunctor !== other._targetFunctor) {
      return false;
    }
    for (const [objId, compA] of this._components) {
      const compB = other._components.get(objId);
      if (!compB) return false;
      if (!this._matricesEqual(compA.matrix, compB.matrix)) return false;
    }
    return true;
  }

  private _composeTargetMorphisms(morphIdA: string, morphIdB: string): string | null {
    const a = this._targetMorphisms.get(morphIdA);
    const b = this._targetMorphisms.get(morphIdB);
    if (!a || !b) return null;
    const composed = a.compose(b);
    return composed ? composed.id : null;
  }

  private _morphismsEqual(idA: string | null, idB: string | null): boolean {
    return idA === idB;
  }

  private _multiplyMatrices(a: number[][], b: number[][]): number[][] {
    const rows = a.length;
    const cols = b[0]?.length || 0;
    const inner = a[0]?.length || 0;
    const result: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        let sum = 0;
        for (let k = 0; k < inner; k++) sum += a[i][k] * b[k][j];
        row.push(sum);
      }
      result.push(row);
    }
    return result;
  }

  private _addMatrices(a: number[][], b: number[][]): number[][] {
    const rows = Math.min(a.length, b.length);
    const cols = Math.min(a[0]?.length || 0, b[0]?.length || 0);
    const result: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push((a[i][j] || 0) + (b[i][j] || 0));
      }
      result.push(row);
    }
    return result;
  }

  private _isInvertibleMatrix(m: number[][]): boolean {
    const n = m.length;
    if (n === 0) return false;
    const det = n === 1 ? m[0][0] : n === 2 ? m[0][0] * m[1][1] - m[0][1] * m[1][0] : 1;
    return Math.abs(det) > 1e-10;
  }

  private _isZeroMatrix(m: number[][]): boolean {
    for (const row of m) {
      for (const val of row) {
        if (Math.abs(val) > 1e-10) return false;
      }
    }
    return true;
  }

  private _matricesEqual(a: number[][], b: number[][]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].length !== b[i].length) return false;
      for (let j = 0; j < a[i].length; j++) {
        if (Math.abs(a[i][j] - b[i][j]) > 1e-10) return false;
      }
    }
    return true;
  }

  public report(): NaturalTransformationData {
    return {
      sourceFunctor: this._sourceFunctor,
      targetFunctor: this._targetFunctor,
      components: this._components.size,
      isNatural: this._isNatural,
      isNaturalIsomorphism: this._isNaturalIsomorphism,
    };
  }

  public reset(): void {
    this._components.clear();
    this._isNatural = true;
    this._isNaturalIsomorphism = false;
    this._naturalityChecks = 0;
  }
}
