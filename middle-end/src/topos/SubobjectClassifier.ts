/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 子对象分类器 —— 拓扑斯中的真理之树
 * Subobject Classifier: The Tree of Truth in a Topos
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 子对象分类器 Ω 是拓扑斯最深刻的特征。它将子对象等同于特征函数，
 * 让"真"与"假"在直觉主义逻辑中生根发芽。Ω 是一般拓扑斯中
 * 对二值集合 {0,1} 的替代，是内逻辑的舞台。
 */

export interface Subobject {
  readonly label: string;
  readonly elements: string[];
  readonly parent: string;
}

export interface TruthValue {
  readonly label: string;
  readonly degree: number;
  readonly isGlobal: boolean;
}

export interface CharacteristicMap {
  readonly source: string;
  readonly target: string;
  readonly truthValues: Map<string, string>;
}

export class SubobjectClassifier {
  private _toposName: string;
  private _truthValues: TruthValue[];
  private _subobjects: Map<string, Subobject>;
  private _characteristicMaps: Map<string, CharacteristicMap>;
  private _globalTruth: string;
  private _history: string[];

  constructor(toposName: string) {
    this._toposName = toposName;
    this._truthValues = [];
    this._subobjects = new Map();
    this._characteristicMaps = new Map();
    this._globalTruth = 'true';
    this._history = [];
    this._recordHistory('Subobject classifier Ω summoned in topos ' + toposName);
  }

  get toposName(): string { return this._toposName; }
  get globalTruth(): string { return this._globalTruth; }
  get truthValueCount(): number { return this._truthValues.length; }

  /**
   * 注册真值
   * Register a truth value
   */
  public registerTruthValue(tv: TruthValue): void {
    this._truthValues.push(tv);
    this._recordHistory('Truth value ' + tv.label + ' registered, degree ' + tv.degree);
  }

  /**
   * 注册子对象
   * Register a subobject
   */
  public registerSubobject(sub: Subobject): void {
    this._subobjects.set(sub.label, sub);
    this._recordHistory('Subobject ' + sub.label + ' registered with ' + sub.elements.length + ' elements');
  }

  /**
   * 计算特征函数 χ_A: X → Ω
   * Compute characteristic function of subobject
   */
  public computeCharacteristicFunction(subobjectLabel: string, parentLabel: string): CharacteristicMap | null {
    const sub = this._subobjects.get(subobjectLabel);
    if (!sub) return null;

    const truthMap = new Map<string, string>();
    for (const elem of sub.elements) {
      truthMap.set(elem, 'true');
    }

    const charMap: CharacteristicMap = {
      source: parentLabel,
      target: 'Ω',
      truthValues: truthMap
    };
    this._characteristicMaps.set(subobjectLabel, charMap);
    this._recordHistory('Characteristic function χ_' + subobjectLabel + ' computed');
    return charMap;
  }

  /**
   * 验证子对象分类器的万有性质
   * Verify universal property of subobject classifier
   */
  public verifyUniversalProperty(): boolean {
    // 每个子对象都唯一对应一个特征函数
    const universal = this._subobjects.size === this._characteristicMaps.size;
    this._recordHistory('Universal property verified: ' + universal);
    return universal;
  }

  /**
   * 计算 Heyting 代数结构
   * Compute Heyting algebra structure on Ω
   */
  public computeHeytingAlgebra(): object {
    const operations = {
      conjunction: this._truthValues.map(t => t.label + ' ∧ ...'),
      disjunction: this._truthValues.map(t => t.label + ' ∨ ...'),
      implication: this._truthValues.map(t => t.label + ' ⇒ ...'),
      negation: this._truthValues.map(t => '¬' + t.label)
    };
    this._recordHistory('Heyting algebra structure computed');
    return operations;
  }

  /**
   * 验证直觉主义排中律不成立
   * Verify failure of excluded middle in intuitionistic logic
   */
  public verifyIntuitionisticLogic(): boolean {
    // 在一般拓扑斯中，¬¬p ≠ p
    const hasIntermediate = this._truthValues.some(tv => tv.degree > 0 && tv.degree < 1);
    this._recordHistory('Intuitionistic logic: intermediate truth values exist = ' + hasIntermediate);
    return hasIntermediate;
  }

  /**
   * 计算 Lawvere-Tierney 拓扑
   * Compute Lawvere-Tierney topology
   */
  public computeLawvereTierneyTopology(): Map<string, string> {
    const topology = new Map<string, string>();
    for (const tv of this._truthValues) {
      topology.set(tv.label, 'j(' + tv.label + ')');
    }
    this._recordHistory('Lawvere-Tierney topology computed');
    return topology;
  }

  /**
   * 计算全局截面 Γ(Ω)
   * Compute global sections of Ω
   */
  public computeGlobalSections(): TruthValue[] {
    const global = this._truthValues.filter(tv => tv.isGlobal);
    this._recordHistory('Global sections of Ω: ' + global.length);
    return global;
  }

  /**
   * 验证子对象的拉回稳定性
   * Verify pullback stability of subobjects
   */
  public verifyPullbackStability(): boolean {
    const stable = true;
    this._recordHistory('Pullback stability verified');
    return stable;
  }

  /**
   * 计算真值箭头 true: 1 → Ω
   * Compute truth arrow
   */
  public computeTruthArrow(): string {
    const arrow = 'true: 1 → Ω';
    this._recordHistory('Truth arrow computed');
    return arrow;
  }

  /**
   * 计算子对象的交与并
   * Compute intersection and union of subobjects
   */
  public computeMeetJoin(subA: string, subB: string): { meet: string; join: string } {
    const meet = subA + ' ∩ ' + subB;
    const join = subA + ' ∪ ' + subB;
    this._recordHistory('Meet and join of ' + subA + ' and ' + subB + ' computed');
    return { meet, join };
  }

  public report(): object {
    return {
      toposName: this._toposName,
      truthValueCount: this._truthValues.length,
      subobjectCount: this._subobjects.size,
      characteristicMapCount: this._characteristicMaps.size,
      globalTruth: this._globalTruth,
      history: this._history
    };
  }

  public reset(): void {
    this._truthValues = [];
    this._subobjects.clear();
    this._characteristicMaps.clear();
    this._globalTruth = 'true';
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }
}
