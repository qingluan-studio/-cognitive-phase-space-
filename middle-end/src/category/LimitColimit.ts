/**
 * 极限与余极限 —— 范畴论中的万有构造，如同在箭头的海洋中寻找唯一的锚点。
 * 极限是锥的顶点，余极限是余锥的底部；
 * 它们是积、等化子、拉回的上位概念，是范畴的灵魂之眼。
 */

export interface LimitData {
  /** 图表形状 */
  diagramShape: string;
  /** 顶点对象数 */
  vertexCount: number;
  /** 极限对象标识 */
  limitObject: string;
  /** 是否为有限极限 */
  finite: boolean;
  /** 泛性质满足度 */
  universality: number;
}

export interface Cone {
  /** 顶点 */
  apex: string;
  /** 到图表各对象的态射 */
  legs: Map<string, string>;
  /** 是否交换 */
  commutative: boolean;
}

export class LimitColimit {
  private _diagramShape: string;
  private _vertices: Map<string, CategoryObject>;
  private _edges: Map<string, Morphism>;
  private _limitObject: string;
  private _colimitObject: string;
  private _cones: Cone[];
  private _cocones: Cone[];
  private _finite: boolean;
  private _universality: number;
  private _hasLimit: boolean;
  private _hasColimit: boolean;

  constructor(diagramShape: string = 'discrete', finite: boolean = true) {
    this._diagramShape = diagramShape;
    this._vertices = new Map();
    this._edges = new Map();
    this._limitObject = '';
    this._colimitObject = '';
    this._cones = [];
    this._cocones = [];
    this._finite = finite;
    this._universality = 0;
    this._hasLimit = false;
    this._hasColimit = false;
  }

  get diagramShape(): string {
    return this._diagramShape;
  }

  get finite(): boolean {
    return this._finite;
  }

  get limitObject(): string {
    return this._limitObject;
  }

  get colimitObject(): string {
    return this._colimitObject;
  }

  get hasLimit(): boolean {
    return this._hasLimit;
  }

  get hasColimit(): boolean {
    return this._hasColimit;
  }

  get universality(): number {
    return this._universality;
  }

  /** 添加图表顶点 */
  public addVertex(obj: CategoryObject): void {
    this._vertices.set(obj.id, obj);
  }

  /** 添加图表边（态射） */
  public addEdge(morph: Morphism): void {
    this._edges.set(morph.id, morph);
  }

  /** 构造锥：从顶点对象到图表中每个对象的兼容态射族 */
  public constructCone(apexId: string, legs: Map<string, string>): Cone | null {
    const apex = this._vertices.get(apexId);
    if (!apex) return null;

    const cone: Cone = { apex: apexId, legs: new Map(legs), commutative: true };

    for (const edge of this._edges.values()) {
      const legSource = legs.get(edge.source);
      const legTarget = legs.get(edge.target);
      if (legSource && legTarget) {
        const sourceMorph = this._findMorphism(legSource);
        const targetMorph = this._findMorphism(legTarget);
        const edgeMorph = this._findMorphism(edge.id);
        if (sourceMorph && targetMorph && edgeMorph) {
          const composed = edgeMorph.compose(targetMorph);
          if (!composed || composed.id !== sourceMorph.id) {
            cone.commutative = false;
            break;
          }
        }
      }
    }

    this._cones.push(cone);
    return cone;
  }

  /** 构造余锥：从图表中每个对象到底部对象的兼容态射族 */
  public constructCocone(baseId: string, legs: Map<string, string>): Cone | null {
    const base = this._vertices.get(baseId);
    if (!base) return null;

    const cocone: Cone = { apex: baseId, legs: new Map(legs), commutative: true };

    for (const edge of this._edges.values()) {
      const legSource = legs.get(edge.source);
      const legTarget = legs.get(edge.target);
      if (legSource && legTarget) {
        const sourceMorph = this._findMorphism(legSource);
        const targetMorph = this._findMorphism(legTarget);
        const edgeMorph = this._findMorphism(edge.id);
        if (sourceMorph && targetMorph && edgeMorph) {
          const composed = sourceMorph.compose(edgeMorph);
          if (!composed || composed.id !== targetMorph.id) {
            cocone.commutative = false;
            break;
          }
        }
      }
    }

    this._cocones.push(cocone);
    return cocone;
  }

  /** 计算极限：在所有锥中寻找具有泛性质的顶点 */
  public computeLimit(): string | null {
    if (this._cones.length === 0) return null;

    let bestCone = this._cones[0];
    let bestUniversality = this._evaluateUniversality(bestCone);

    for (const cone of this._cones) {
      const u = this._evaluateUniversality(cone);
      if (u > bestUniversality) {
        bestUniversality = u;
        bestCone = cone;
      }
    }

    this._limitObject = bestCone.apex;
    this._universality = bestUniversality;
    this._hasLimit = bestCone.commutative;
    return this._limitObject;
  }

  /** 计算余极限：在所有余锥中寻找具有泛性质的底部 */
  public computeColimit(): string | null {
    if (this._cocones.length === 0) return null;

    let bestCocone = this._cocones[0];
    let bestUniversality = this._evaluateUniversality(bestCocone);

    for (const cocone of this._cocones) {
      const u = this._evaluateUniversality(cocone);
      if (u > bestUniversality) {
        bestUniversality = u;
        bestCocone = cocone;
      }
    }

    this._colimitObject = bestCocone.apex;
    this._universality = bestUniversality;
    this._hasColimit = bestCocone.commutative;
    return this._colimitObject;
  }

  /** 积构造：离散图表的极限 */
  public constructProduct(objectIds: string[]): string | null {
    const apexId = `product-${objectIds.join('-')}`;
    const legs = new Map<string, string>();
    for (const objId of objectIds) {
      legs.set(objId, `projection-${objId}`);
    }
    this.addVertex({ id: apexId, label: 'product', properties: {} });
    const cone = this.constructCone(apexId, legs);
    if (cone) {
      this._limitObject = apexId;
      this._hasLimit = true;
    }
    return apexId;
  }

  /** 余积构造：离散图表的余极限 */
  public constructCoproduct(objectIds: string[]): string | null {
    const baseId = `coproduct-${objectIds.join('-')}`;
    const legs = new Map<string, string>();
    for (const objId of objectIds) {
      legs.set(objId, `injection-${objId}`);
    }
    this.addVertex({ id: baseId, label: 'coproduct', properties: {} });
    const cocone = this.constructCocone(baseId, legs);
    if (cocone) {
      this._colimitObject = baseId;
      this._hasColimit = true;
    }
    return baseId;
  }

  /** 等化子：并行态射对的极限 */
  public constructEqualizer(morphA: string, morphB: string): string | null {
    const eqId = `equalizer-${morphA}-${morphB}`;
    this.addVertex({ id: eqId, label: 'equalizer', properties: {} });
    const legs = new Map<string, string>();
    const ma = this._edges.get(morphA);
    if (ma) legs.set(ma.source, `equalizing-${morphA}`);
    this.constructCone(eqId, legs);
    this._limitObject = eqId;
    this._hasLimit = true;
    return eqId;
  }

  /** 余等化子：并行态射对的余极限 */
  public constructCoequalizer(morphA: string, morphB: string): string | null {
    const coeqId = `coequalizer-${morphA}-${morphB}`;
    this.addVertex({ id: coeqId, label: 'coequalizer', properties: {} });
    const legs = new Map<string, string>();
    const ma = this._edges.get(morphA);
    if (ma) legs.set(ma.target, `coequalizing-${morphA}`);
    this.constructCocone(coeqId, legs);
    this._colimitObject = coeqId;
    this._hasColimit = true;
    return coeqId;
  }

  /** 拉回：cospan的极限 */
  public constructPullback(f: string, g: string): string | null {
    const pbId = `pullback-${f}-${g}`;
    this.addVertex({ id: pbId, label: 'pullback', properties: {} });
    const legs = new Map<string, string>();
    const mf = this._edges.get(f);
    const mg = this._edges.get(g);
    if (mf) legs.set(mf.source, `pullback-leg-${f}`);
    if (mg) legs.set(mg.source, `pullback-leg-${g}`);
    this.constructCone(pbId, legs);
    this._limitObject = pbId;
    this._hasLimit = true;
    return pbId;
  }

  /** 推出：span的余极限 */
  public constructPushout(f: string, g: string): string | null {
    const poId = `pushout-${f}-${g}`;
    this.addVertex({ id: poId, label: 'pushout', properties: {} });
    const legs = new Map<string, string>();
    const mf = this._edges.get(f);
    const mg = this._edges.get(g);
    if (mf) legs.set(mf.target, `pushout-leg-${f}`);
    if (mg) legs.set(mg.target, `pushout-leg-${g}`);
    this.constructCocone(poId, legs);
    this._colimitObject = poId;
    this._hasColimit = true;
    return poId;
  }

  /** 检查范畴是否完备（所有小极限存在） */
  public isComplete(): boolean {
    return this._hasLimit && this._finite;
  }

  /** 检查范畴是否余完备 */
  public isCocomplete(): boolean {
    return this._hasColimit && this._finite;
  }

  private _evaluateUniversality(cone: Cone): number {
    let score = cone.commutative ? 1.0 : 0.0;
    score += cone.legs.size / Math.max(this._vertices.size, 1);
    return Math.min(score, 1.0);
  }

  private _findMorphism(id: string): Morphism | null {
    return this._edges.get(id) || null;
  }

  public report(): LimitData {
    return {
      diagramShape: this._diagramShape,
      vertexCount: this._vertices.size,
      limitObject: this._limitObject,
      finite: this._finite,
      universality: this._universality,
    };
  }

  public reset(): void {
    this._cones = [];
    this._cocones = [];
    this._limitObject = '';
    this._colimitObject = '';
    this._universality = 0;
    this._hasLimit = false;
    this._hasColimit = false;
  }
}
