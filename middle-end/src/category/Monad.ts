/**
 * 单子 —— 自函子范畴上的幺半群，计算结构的哲学化身。
 * (T, η, μ)，T是内函子，η是单位，μ是乘法；
 * 单子封装了上下文、副作用与计算的序列，是范畴论对程序的温柔诠释。
 */

export interface MonadData {
  /** 函子名称 */
  functor: string;
  /** 单位变换组件数 */
  unitComponents: number;
  /** 乘法变换组件数 */
  multiplicationComponents: number;
  /** 结合律满足度 */
  associativity: number;
  /** 单位律满足度 */
  unitLaw: number;
}

export class Monad {
  private _functor: string;
  private _unit: Map<string, string>;
  private _multiplication: Map<string, string>;
  private _associativity: number;
  private _unitLaw: number;
  private _objects: Map<string, CategoryObject>;
  private _morphisms: Map<string, Morphism>;
  private _kleisliMorphisms: Map<string, string>;
  private _bindOperations: number;

  constructor(functor: string) {
    this._functor = functor;
    this._unit = new Map();
    this._multiplication = new Map();
    this._associativity = 0;
    this._unitLaw = 0;
    this._objects = new Map();
    this._morphisms = new Map();
    this._kleisliMorphisms = new Map();
    this._bindOperations = 0;
  }

  get functor(): string {
    return this._functor;
  }

  get associativity(): number {
    return this._associativity;
  }

  get unitLaw(): number {
    return this._unitLaw;
  }

  get bindOperations(): number {
    return this._bindOperations;
  }

  get kleisliCount(): number {
    return this._kleisliMorphisms.size;
  }

  /** 注册范畴中的对象 */
  public registerObject(obj: CategoryObject): void {
    this._objects.set(obj.id, obj);
  }

  /** 注册范畴中的态射 */
  public registerMorphism(morph: Morphism): void {
    this._morphisms.set(morph.id, morph);
  }

  /** 构造单位自然变换：η_A: A → T(A) */
  public constructUnit(objectId: string, morphismId: string): boolean {
    if (!this._objects.has(objectId)) return false;
    this._unit.set(objectId, morphismId);
    return true;
  }

  /** 构造乘法自然变换：μ_A: T(T(A)) → T(A) */
  public constructMultiplication(objectId: string, morphismId: string): boolean {
    if (!this._objects.has(objectId)) return false;
    this._multiplication.set(objectId, morphismId);
    return true;
  }

  /** 验证结合律：μ ∘ Tμ = μ ∘ μT，如同在嵌套的语境中保持顺序 */
  public verifyAssociativity(): boolean {
    let valid = 0;
    let total = 0;
    for (const [objId, mu] of this._multiplication) {
      total++;
      const tta = `T(T(${objId}))`;
      const tmu = this._multiplication.get(tta);
      const tmuComposed = tmu ? this._composeMorphisms(mu, `T(${tmu})`) : null;
      const muT = this._multiplication.get(`T(${objId})`);
      const muTComposed = muT ? this._composeMorphisms(mu, muT) : null;
      if (tmuComposed && muTComposed && tmuComposed === muTComposed) {
        valid++;
      }
    }
    this._associativity = total > 0 ? valid / total : 0;
    return valid === total;
  }

  /** 验证单位律：μ ∘ ηT = id_T = μ ∘ Tη */
  public verifyUnitLaw(): boolean {
    let valid = 0;
    let total = 0;
    for (const [objId, mu] of this._multiplication) {
      total++;
      const eta = this._unit.get(objId);
      const tEta = eta ? `T(${eta})` : null;
      const etaT = eta ? `${eta}T` : null;
      const left = tEta ? this._composeMorphisms(mu, tEta) : null;
      const right = etaT ? this._composeMorphisms(mu, etaT) : null;
      const id = `id_T(${objId})`;
      if (left === id && right === id) {
        valid++;
      }
    }
    this._unitLaw = total > 0 ? valid / total : 0;
    return valid === total;
  }

  /** Kleisli合成：f: A → T(B), g: B → T(C) 的 Kleisli 复合 g ⋆ f = μ_C ∘ T(g) ∘ f */
  public kleisliCompose(f: string, g: string): string | null {
    const morphF = this._morphisms.get(f);
    const morphG = this._morphisms.get(g);
    if (!morphF || !morphG) return null;

    const tg = `T(${g})`;
    const intermediate = this._composeMorphisms(tg, f);
    if (!intermediate) return null;

    const targetC = morphG.target;
    const muC = this._multiplication.get(targetC);
    if (!muC) return null;

    const result = this._composeMorphisms(muC, intermediate);
    this._bindOperations++;
    return result;
  }

  /** bind操作：flatMap，将 T(A) 上的计算通过 A → T(B) 延续到 T(B) */
  public bind(ta: string, f: string): string | null {
    const mu = this._multiplication.get(ta);
    if (!mu) return null;
    const tf = `T(${f})`;
    const composed = this._composeMorphisms(mu, tf);
    this._bindOperations++;
    return composed;
  }

  /** join操作：flatten，T(T(A)) → T(A) */
  public join(tta: string): string | null {
    return this._multiplication.get(tta) || null;
  }

  /** fmap操作：T(f): T(A) → T(B) */
  public fmap(f: string): string | null {
    return `T(${f})`;
  }

  /** 从伴随构造单子：T = G ∘ F，η是单位，μ = GεF */
  public static fromAdjunction(adjunction: Adjunction): Monad | null {
    const functor = `G∘F`;
    const monad = new Monad(functor);
    monad._unitLaw = adjunction.triangleIdentity;
    monad._associativity = adjunction.triangleIdentity;
    return monad;
  }

  /** Eilenberg-Moore代数：T-代数 (A, a: T(A) → A) */
  public constructAlgebra(objectId: string, structureMap: string): boolean {
    if (!this._objects.has(objectId)) return false;
    return true;
  }

  /** 检查T-代数的兼容性：a ∘ η_A = id_A */
  public verifyAlgebraUnit(objectId: string, structureMap: string): boolean {
    const eta = this._unit.get(objectId);
    if (!eta) return false;
    const composed = this._composeMorphisms(structureMap, eta);
    return composed === `id_${objectId}`;
  }

  /** 检查T-代数的兼容性：a ∘ μ_A = a ∘ T(a) */
  public verifyAlgebraMultiplication(objectId: string, structureMap: string): boolean {
    const mu = this._multiplication.get(objectId);
    if (!mu) return false;
    const left = this._composeMorphisms(structureMap, mu);
    const ta = `T(${structureMap})`;
    const right = this._composeMorphisms(structureMap, ta);
    return left === right;
  }

  /** Kleisli范畴中的态射提升 */
  public liftKleisli(morphId: string): string {
    return `kleisli(${morphId})`;
  }

  /** 计算单子的迭代：T^n(A) */
  public iterate(n: number, objectId: string): string {
    let result = objectId;
    for (let i = 0; i < n; i++) {
      result = `T(${result})`;
    }
    return result;
  }

  private _composeMorphisms(a: string, b: string): string | null {
    const morphA = this._morphisms.get(a);
    const morphB = this._morphisms.get(b);
    if (morphA && morphB) {
      const composed = morphA.compose(morphB);
      return composed ? composed.id : `${a}∘${b}`;
    }
    return `${a}∘${b}`;
  }

  public report(): MonadData {
    return {
      functor: this._functor,
      unitComponents: this._unit.size,
      multiplicationComponents: this._multiplication.size,
      associativity: this._associativity,
      unitLaw: this._unitLaw,
    };
  }

  public reset(): void {
    this._unit.clear();
    this._multiplication.clear();
    this._associativity = 0;
    this._unitLaw = 0;
    this._kleisliMorphisms.clear();
    this._bindOperations = 0;
  }
}
