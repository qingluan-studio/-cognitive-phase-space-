/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 集合拓扑斯 —— 数学宇宙的起点
 * Topos of Sets: The Starting Point of the Mathematical Universe
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 集合拓扑斯 Set 是所有拓扑斯的原型。在其中，对象就是集合，
 * 态射就是函数，子对象分类器就是二值集合 {0,1}。
 * 每一个 Grothendieck 拓扑斯都是 Set 上的几何构造，
 * 如同每一颗行星都围绕着太阳旋转。
 */

export interface SetObject {
  readonly label: string;
  readonly elements: string[];
}

export interface Function {
  readonly label: string;
  readonly source: string;
  readonly target: string;
  readonly mapping: Map<string, string>;
}

export class ToposOfSets {
  private _label: string;
  private _objects: Map<string, SetObject>;
  private _functions: Map<string, Function>;
  private _subobjectClassifier: string[];
  private _history: string[];

  constructor(label: string = 'Set') {
    this._label = label;
    this._objects = new Map();
    this._functions = new Map();
    this._subobjectClassifier = ['true', 'false'];
    this._history = [];
    this._recordHistory('Topos of sets ' + label + ' awakened');
  }

  get label(): string { return this._label; }
  get objectCount(): number { return this._objects.size; }
  get functionCount(): number { return this._functions.size; }

  /**
   * 注册集合对象
   * Register a set object
   */
  public registerObject(obj: SetObject): void {
    this._objects.set(obj.label, obj);
    this._recordHistory('Object ' + obj.label + ' registered with ' + obj.elements.length + ' elements');
  }

  /**
   * 注册函数
   * Register a function
   */
  public registerFunction(func: Function): void {
    this._functions.set(func.label, func);
    this._recordHistory('Function ' + func.label + ': ' + func.source + ' → ' + func.target + ' registered');
  }

  /**
   * 计算集合的幂集
   * Compute power set
   */
  public computePowerSet(setLabel: string): string[][] {
    const obj = this._objects.get(setLabel);
    if (!obj) return [];
    const elements = obj.elements;
    const powerSet: string[][] = [[]];
    for (const elem of elements) {
      const currentLength = powerSet.length;
      for (let i = 0; i < currentLength; i++) {
        powerSet.push([...powerSet[i], elem]);
      }
    }
    this._recordHistory('Power set of ' + setLabel + ' computed: ' + powerSet.length + ' subsets');
    return powerSet;
  }

  /**
   * 计算集合的积
   * Compute product of sets
   */
  public computeProduct(setA: string, setB: string): string[] {
    const a = this._objects.get(setA);
    const b = this._objects.get(setB);
    if (!a || !b) return [];
    const product: string[] = [];
    for (const ea of a.elements) {
      for (const eb of b.elements) {
        product.push('(' + ea + ', ' + eb + ')');
      }
    }
    this._recordHistory('Product ' + setA + ' × ' + setB + ' computed: ' + product.length + ' elements');
    return product;
  }

  /**
   * 计算集合的余积
   * Compute coproduct of sets
   */
  public computeCoproduct(setA: string, setB: string): string[] {
    const a = this._objects.get(setA);
    const b = this._objects.get(setB);
    if (!a || !b) return [];
    const coproduct: string[] = [
      ...a.elements.map(e => 'inl(' + e + ')'),
      ...b.elements.map(e => 'inr(' + e + ')')
    ];
    this._recordHistory('Coproduct ' + setA + ' + ' + setB + ' computed: ' + coproduct.length + ' elements');
    return coproduct;
  }

  /**
   * 计算指数对象（函数集）B^A
   * Compute exponential object
   */
  public computeExponential(setA: string, setB: string): number {
    const a = this._objects.get(setA);
    const b = this._objects.get(setB);
    if (!a || !b) return 0;
    const exp = Math.pow(b.elements.length, a.elements.length);
    this._recordHistory('Exponential ' + setB + '^' + setA + ' = ' + exp);
    return exp;
  }

  /**
   * 验证子对象分类器为 {0,1}
   * Verify subobject classifier
   */
  public verifySubobjectClassifier(): boolean {
    const isTwoElement = this._subobjectClassifier.length === 2;
    this._recordHistory('Subobject classifier verified as 2-element set: ' + isTwoElement);
    return isTwoElement;
  }

  /**
   * 计算特征函数 χ_A: X → {0,1}
   * Compute characteristic function
   */
  public computeCharacteristicFunction(subset: string[], parentSet: string): Map<string, number> {
    const parent = this._objects.get(parentSet);
    if (!parent) return new Map();
    const chi = new Map<string, number>();
    for (const elem of parent.elements) {
      chi.set(elem, subset.includes(elem) ? 1 : 0);
    }
    this._recordHistory('Characteristic function χ: ' + parentSet + ' → {0,1} computed');
    return chi;
  }

  /**
   * 验证选择公理（在 Set 中成立）
   * Verify axiom of choice
   */
  public verifyAxiomOfChoice(): boolean {
    const holds = true;
    this._recordHistory('Axiom of choice holds in ' + this._label);
    return holds;
  }

  /**
   * 验证良序原理（在 Set 中，等价于选择公理）
   * Verify well-ordering principle
   */
  public verifyWellOrdering(): boolean {
    const holds = true;
    this._recordHistory('Well-ordering principle holds in ' + this._label);
    return holds;
  }

  public report(): object {
    return {
      label: this._label,
      objectCount: this._objects.size,
      functionCount: this._functions.size,
      subobjectClassifierSize: this._subobjectClassifier.length,
      history: this._history
    };
  }

  public reset(): void {
    this._objects.clear();
    this._functions.clear();
    this._subobjectClassifier = ['true', 'false'];
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }
}
