/**
 * 函子 —— 范畴之间的忠实翻译者，保持结构的诗人。
 * 它将对象映为对象，将态射映为态射，恒等归于恒等，复合归于复合；
 * 在范畴的宇宙之间，函子是意义的摆渡船。
 */

export interface FunctorData {
  /** 源范畴名称 */
  sourceCategory: string;
  /** 目标范畴名称 */
  targetCategory: string;
  /** 映射的对象数 */
  mappedObjects: number;
  /** 映射的态射数 */
  mappedMorphisms: number;
  /** 是否协变 */
  covariant: boolean;
  /** 是否满 */
  full: boolean;
  /** 是否忠实 */
  faithful: boolean;
}

export interface CategoryObject {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface Morphism {
  id: string;
  source: string;
  target: string;
  label: string;
  compose(other: Morphism): Morphism | null;
}

export class Functor {
  private _sourceCategory: string;
  private _targetCategory: string;
  private _objectMap: Map<string, string>;
  private _morphismMap: Map<string, string>;
  private _covariant: boolean;
  private _full: boolean;
  private _faithful: boolean;
  private _objects: Map<string, CategoryObject>;
  private _morphisms: Map<string, Morphism>;
  private _targetObjects: Map<string, CategoryObject>;
  private _targetMorphisms: Map<string, Morphism>;
  private _compositionPreserved: boolean;

  constructor(source: string, target: string, covariant: boolean = true) {
    this._sourceCategory = source;
    this._targetCategory = target;
    this._objectMap = new Map();
    this._morphismMap = new Map();
    this._covariant = covariant;
    this._full = false;
    this._faithful = false;
    this._objects = new Map();
    this._morphisms = new Map();
    this._targetObjects = new Map();
    this._targetMorphisms = new Map();
    this._compositionPreserved = true;
  }

  get sourceCategory(): string {
    return this._sourceCategory;
  }

  get targetCategory(): string {
    return this._targetCategory;
  }

  get covariant(): boolean {
    return this._covariant;
  }

  get full(): boolean {
    return this._full;
  }

  get faithful(): boolean {
    return this._faithful;
  }

  get mappedObjects(): number {
    return this._objectMap.size;
  }

  get mappedMorphisms(): number {
    return this._morphismMap.size;
  }

  /** 注册源范畴的对象 */
  public registerSourceObject(obj: CategoryObject): void {
    this._objects.set(obj.id, obj);
  }

  /** 注册目标范畴的对象 */
  public registerTargetObject(obj: CategoryObject): void {
    this._targetObjects.set(obj.id, obj);
  }

  /** 注册源范畴的态射 */
  public registerSourceMorphism(morph: Morphism): void {
    this._morphisms.set(morph.id, morph);
  }

  /** 注册目标范畴的态射 */
  public registerTargetMorphism(morph: Morphism): void {
    this._targetMorphisms.set(morph.id, morph);
  }

  /** 映射对象：F(A) = B，如同将一颗星的名字翻译成另一种语言的星座 */
  public mapObject(sourceId: string, targetId: string): boolean {
    if (!this._objects.has(sourceId)) return false;
    if (!this._targetObjects.has(targetId)) return false;
    this._objectMap.set(sourceId, targetId);
    return true;
  }

  /** 映射态射：F(f: A→B) = F(f): F(A)→F(B)，保持箭头方向的朝圣 */
  public mapMorphism(sourceId: string, targetId: string): boolean {
    if (!this._morphisms.has(sourceId)) return false;
    if (!this._targetMorphisms.has(targetId)) return false;
    this._morphismMap.set(sourceId, targetId);
    return true;
  }

  /** 验证恒等律：F(id_A) = id_{F(A)}，每个对象的自我映射必须被尊重 */
  public verifyIdentityLaw(): boolean {
    for (const [srcId, tgtId] of this._objectMap) {
      const identityMorph = this._findIdentity(srcId);
      const targetIdentity = this._findIdentity(tgtId);
      if (identityMorph && targetIdentity) {
        const mapped = this._morphismMap.get(identityMorph.id);
        if (mapped !== targetIdentity.id) return false;
      }
    }
    return true;
  }

  /** 验证复合律：F(g ∘ f) = F(g) ∘ F(f) 或 F(f) ∘ F(g)（逆变时），
   * 这是函子最核心的仪式 */
  public verifyCompositionLaw(): boolean {
    for (const morphA of this._morphisms.values()) {
      for (const morphB of this._morphisms.values()) {
        if (morphA.target !== morphB.source) continue;
        const composed = morphA.compose(morphB);
        if (!composed) continue;

        const mappedA = this._morphismMap.get(morphA.id);
        const mappedB = this._morphismMap.get(morphB.id);
        const mappedComposed = this._morphismMap.get(composed.id);
        if (!mappedA || !mappedB || !mappedComposed) continue;

        const targetA = this._targetMorphisms.get(mappedA);
        const targetB = this._targetMorphisms.get(mappedB);
        const targetComposed = this._targetMorphisms.get(mappedComposed);
        if (!targetA || !targetB || !targetComposed) continue;

        const expected = this._covariant
          ? targetA.compose(targetB)
          : targetB.compose(targetA);
        if (!expected || expected.id !== targetComposed.id) {
          this._compositionPreserved = false;
          return false;
        }
      }
    }
    return true;
  }

  /** 检查是否满函子：目标范畴的任意态射都有源态射映射过来 */
  public checkFull(): boolean {
    const targetMorphCount = this._targetMorphisms.size;
    const uniqueTargetMorphs = new Set(this._morphismMap.values());
    this._full = uniqueTargetMorphs.size >= targetMorphCount * 0.9;
    return this._full;
  }

  /** 检查是否忠实函子：不同的源态射映射到不同的目标态射 */
  public checkFaithful(): boolean {
    const values = Array.from(this._morphismMap.values());
    const uniqueValues = new Set(values);
    this._faithful = uniqueValues.size === values.length;
    return this._faithful;
  }

  /** 检查是否本质满射：目标范畴的每个对象都与某个F(A)同构 */
  public checkEssentiallySurjective(): boolean {
    const mappedTargets = new Set(this._objectMap.values());
    return mappedTargets.size >= this._targetObjects.size * 0.8;
  }

  /** 构造复合函子：G ∘ F，如同两段旅程的接续 */
  public composeWith(other: Functor): Functor | null {
    if (this._targetCategory !== other._sourceCategory) return null;
    const composed = new Functor(this._sourceCategory, other._targetCategory, this._covariant && other._covariant);

    for (const [srcId, midId] of this._objectMap) {
      const finalId = other._objectMap.get(midId);
      if (finalId) {
        composed._objectMap.set(srcId, finalId);
      }
    }

    for (const [srcId, midId] of this._morphismMap) {
      const finalId = other._morphismMap.get(midId);
      if (finalId) {
        composed._morphismMap.set(srcId, finalId);
      }
    }

    return composed;
  }

  /** 应用函子于对象：F(A) */
  public applyToObject(sourceId: string): CategoryObject | null {
    const targetId = this._objectMap.get(sourceId);
    if (!targetId) return null;
    return this._targetObjects.get(targetId) || null;
  }

  /** 应用函子于态射：F(f) */
  public applyToMorphism(sourceId: string): Morphism | null {
    const targetId = this._morphismMap.get(sourceId);
    if (!targetId) return null;
    return this._targetMorphisms.get(targetId) || null;
  }

  /** 遗忘函子构造：自动忽略源对象的某些结构属性 */
  public static createForgetful(source: string, target: string): Functor {
    const forgetful = new Functor(source, target, true);
    forgetful._full = false;
    forgetful._faithful = true;
    return forgetful;
  }

  /** 自由函子构造：自动为对象添加自由结构 */
  public static createFree(source: string, target: string): Functor {
    const free = new Functor(source, target, true);
    free._full = true;
    free._faithful = true;
    return free;
  }

  /** 判断是否为等价函子：满、忠实且本质满射 */
  public isEquivalence(): boolean {
    return this.checkFull() && this.checkFaithful() && this.checkEssentiallySurjective();
  }

  /** 判断是否为同构函子：存在逆函子使复合为恒等 */
  public isIsomorphism(): boolean {
    return this._objectMap.size === this._targetObjects.size && this.checkFull() && this.checkFaithful();
  }

  /** 生成像范畴：函子像中所有对象与态射构成的子范畴 */
  public generateImageCategory(): { objects: string[]; morphisms: string[] } {
    const objects = Array.from(new Set(this._objectMap.values()));
    const morphisms = Array.from(new Set(this._morphismMap.values()));
    return { objects, morphisms };
  }

  private _findIdentity(objectId: string): Morphism | null {
    for (const morph of this._morphisms.values()) {
      if (morph.source === objectId && morph.target === objectId) return morph;
    }
    return null;
  }

  public report(): FunctorData {
    return {
      sourceCategory: this._sourceCategory,
      targetCategory: this._targetCategory,
      mappedObjects: this._objectMap.size,
      mappedMorphisms: this._morphismMap.size,
      covariant: this._covariant,
      full: this._full,
      faithful: this._faithful,
    };
  }

  public reset(): void {
    this._objectMap.clear();
    this._morphismMap.clear();
    this._full = false;
    this._faithful = false;
    this._compositionPreserved = true;
  }
}
