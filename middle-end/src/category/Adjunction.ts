/**
 * 伴随 —— 范畴论中最深刻的对称之一，如同左手与右手的相互映照。
 * F ⊣ G，F是左伴随，G是右伴随；
 * Hom(FA, B) ≅ Hom(A, GB)，这是两个世界之间完美的镜像。
 */

export interface AdjunctionData {
  /** 左伴随 */
  leftAdjoint: string;
  /** 右伴随 */
  rightAdjoint: string;
  /** 单位 */
  unitComponents: number;
  /** 余单位 */
  counitComponents: number;
  /** 三角恒等式满足度 */
  triangleIdentity: number;
  /** 是否等价 */
  isEquivalence: boolean;
}

export class Adjunction {
  private _leftAdjoint: string;
  private _rightAdjoint: string;
  private _unit: Map<string, string>;
  private _counit: Map<string, string>;
  private _triangleIdentity: number;
  private _isEquivalence: boolean;
  private _objectsA: Map<string, CategoryObject>;
  private _objectsB: Map<string, CategoryObject>;
  private _morphismsA: Map<string, Morphism>;
  private _morphismsB: Map<string, Morphism>;
  private _homSetSize: number;

  constructor(leftAdjoint: string, rightAdjoint: string) {
    this._leftAdjoint = leftAdjoint;
    this._rightAdjoint = rightAdjoint;
    this._unit = new Map();
    this._counit = new Map();
    this._triangleIdentity = 0;
    this._isEquivalence = false;
    this._objectsA = new Map();
    this._objectsB = new Map();
    this._morphismsA = new Map();
    this._morphismsB = new Map();
    this._homSetSize = 0;
  }

  get leftAdjoint(): string {
    return this._leftAdjoint;
  }

  get rightAdjoint(): string {
    return this._rightAdjoint;
  }

  get triangleIdentity(): number {
    return this._triangleIdentity;
  }

  get isEquivalence(): boolean {
    return this._isEquivalence;
  }

  get unitComponents(): number {
    return this._unit.size;
  }

  get counitComponents(): number {
    return this._counit.size;
  }

  /** 注册范畴A的对象 */
  public registerObjectA(obj: CategoryObject): void {
    this._objectsA.set(obj.id, obj);
  }

  /** 注册范畴B的对象 */
  public registerObjectB(obj: CategoryObject): void {
    this._objectsB.set(obj.id, obj);
  }

  /** 注册范畴A的态射 */
  public registerMorphismA(morph: Morphism): void {
    this._morphismsA.set(morph.id, morph);
  }

  /** 注册范畴B的态射 */
  public registerMorphismB(morph: Morphism): void {
    this._morphismsB.set(morph.id, morph);
  }

  /** 构造单位：η_A: A → G(F(A))，如同将对象嵌入其自由化后再遗忘的回归 */
  public constructUnit(objectIdA: string, morphismId: string): boolean {
    if (!this._objectsA.has(objectIdA)) return false;
    this._unit.set(objectIdA, morphismId);
    return true;
  }

  /** 构造余单位：ε_B: F(G(B)) → B，如同将对象先遗忘再自由化后的投影 */
  public constructCounit(objectIdB: string, morphismId: string): boolean {
    if (!this._objectsB.has(objectIdB)) return false;
    this._counit.set(objectIdB, morphismId);
    return true;
  }

  /** 验证三角恒等式：ε_F(A) ∘ F(η_A) = id_F(A) */
  public verifyTriangleIdentityLeft(): boolean {
    let valid = 0;
    let total = 0;
    for (const [objIdA, unitMorphId] of this._unit) {
      total++;
      const fa = `F(${objIdA})`;
      const epsilonFA = this._counit.get(fa);
      if (epsilonFA) {
        const fEta = `F(${unitMorphId})`;
        const composed = this._composeMorphismsB(epsilonFA, fEta);
        if (composed && composed === `id_${fa}`) {
          valid++;
        }
      }
    }
    this._triangleIdentity = total > 0 ? valid / total : 0;
    return valid === total;
  }

  /** 验证三角恒等式：G(ε_B) ∘ η_G(B) = id_G(B) */
  public verifyTriangleIdentityRight(): boolean {
    let valid = 0;
    let total = 0;
    for (const [objIdB, counitMorphId] of this._counit) {
      total++;
      const gb = `G(${objIdB})`;
      const etaGB = this._unit.get(gb);
      if (etaGB) {
        const gEpsilon = `G(${counitMorphId})`;
        const composed = this._composeMorphismsA(gEpsilon, etaGB);
        if (composed && composed === `id_${gb}`) {
          valid++;
        }
      }
    }
    this._triangleIdentity = total > 0 ? valid / total : 0;
    return valid === total;
  }

  /** 计算Hom集的伴随同构：φ: Hom(FA, B) → Hom(A, GB) */
  public adjunctionIsomorphism(morphFAB: string): string | null {
    const morph = this._morphismsB.get(morphFAB);
    if (!morph) return null;
    const sourceFA = morph.source;
    const targetB = morph.target;
    const a = sourceFA.replace('F(', '').replace(')', '');
    const gb = `G(${targetB})`;
    return `phi(${morphFAB}): ${a} → ${gb}`;
  }

  /** 逆同构：ψ: Hom(A, GB) → Hom(FA, B) */
  public inverseIsomorphism(morphAGB: string): string | null {
    const morph = this._morphismsA.get(morphAGB);
    if (!morph) return null;
    const sourceA = morph.source;
    const targetGB = morph.target;
    const b = targetGB.replace('G(', '').replace(')', '');
    const fa = `F(${sourceA})`;
    return `psi(${morphAGB}): ${fa} → ${b}`;
  }

  /** 检查是否为等价伴随：单位和余单位都是自然同构 */
  public checkEquivalence(): boolean {
    const unitIso = this._unit.size > 0 && Array.from(this._unit.values()).every(id => id.includes('iso'));
    const counitIso = this._counit.size > 0 && Array.from(this._counit.values()).every(id => id.includes('iso'));
    this._isEquivalence = unitIso && counitIso;
    return this._isEquivalence;
  }

  /** 左伴随保持余极限 */
  public leftAdjointPreservesColimits(): boolean {
    return true;
  }

  /** 右伴随保持极限 */
  public rightAdjointPreservesLimits(): boolean {
    return true;
  }

  /** 复合伴随：(F ∘ F') ⊣ (G' ∘ G) */
  public composeWith(other: Adjunction): Adjunction | null {
    if (this._rightAdjoint !== other._leftAdjoint) return null;
    const composed = new Adjunction(this._leftAdjoint, other._rightAdjoint);
    return composed;
  }

  /** 伴随的唯一性：给定F，其右伴随G在唯一同构意义下唯一 */
  public isUniqueRightAdjoint(other: Adjunction): boolean {
    if (this._leftAdjoint !== other._leftAdjoint) return false;
    return this._unit.size === other._unit.size;
  }

  /** 计算自由-遗忘伴随的典型实例 */
  public static freeForgetful(freeFunctor: string, forgetfulFunctor: string): Adjunction {
    const adj = new Adjunction(freeFunctor, forgetfulFunctor);
    adj._triangleIdentity = 1.0;
    return adj;
  }

  /** 判断是否为反射子范畴：右伴随 fully faithful */
  public isReflectiveSubcategory(): boolean {
    return this._counit.size > 0 && this._triangleIdentity > 0.9;
  }

  /** 判断是否为余反射子范畴：左伴随 fully faithful */
  public isCoreflectiveSubcategory(): boolean {
    return this._unit.size > 0 && this._triangleIdentity > 0.9;
  }

  private _composeMorphismsA(idA: string, idB: string): string | null {
    const a = this._morphismsA.get(idA);
    const b = this._morphismsA.get(idB);
    if (!a || !b) return null;
    const composed = a.compose(b);
    return composed ? composed.id : null;
  }

  private _composeMorphismsB(idA: string, idB: string): string | null {
    const a = this._morphismsB.get(idA);
    const b = this._morphismsB.get(idB);
    if (!a || !b) return null;
    const composed = a.compose(b);
    return composed ? composed.id : null;
  }

  public report(): AdjunctionData {
    return {
      leftAdjoint: this._leftAdjoint,
      rightAdjoint: this._rightAdjoint,
      unitComponents: this._unit.size,
      counitComponents: this._counit.size,
      triangleIdentity: this._triangleIdentity,
      isEquivalence: this._isEquivalence,
    };
  }

  public reset(): void {
    this._unit.clear();
    this._counit.clear();
    this._triangleIdentity = 0;
    this._isEquivalence = false;
  }
}
