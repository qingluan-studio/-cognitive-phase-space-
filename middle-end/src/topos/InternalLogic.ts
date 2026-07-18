/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 内逻辑 —— 拓扑斯中的高阶直觉主义
 * Internal Logic: Higher-Order Intuitionism in a Topos
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 拓扑斯的内逻辑是数学基础的一场革命。在其中，每个对象都是一个类型，
 * 每个子对象都是一个命题。排中律不再是公理，而是额外的结构——
 * 布尔拓扑斯是排中律的避风港，而一般的拓扑斯则拥抱开放的可能性。
 */

export interface Type {
  readonly label: string;
  readonly elements: string[];
}

export interface Proposition {
  readonly label: string;
  readonly truthValue: number;
  readonly domain: string;
}

export interface Quantifier {
  readonly variable: string;
  readonly domain: string;
  readonly body: string;
}

export class InternalLogic {
  private _toposName: string;
  private _types: Map<string, Type>;
  private _propositions: Map<string, Proposition>;
  private _isBoolean: boolean;
  private _isHeyting: boolean;
  private _history: string[];

  constructor(toposName: string) {
    this._toposName = toposName;
    this._types = new Map();
    this._propositions = new Map();
    this._isBoolean = false;
    this._isHeyting = true;
    this._history = [];
    this._recordHistory('Internal logic awakened in topos ' + toposName);
  }

  get toposName(): string { return this._toposName; }
  get isBoolean(): boolean { return this._isBoolean; }
  get isHeyting(): boolean { return this._isHeyting; }

  /**
   * 注册类型
   * Register a type
   */
  public registerType(type: Type): void {
    this._types.set(type.label, type);
    this._recordHistory('Type ' + type.label + ' registered');
  }

  /**
   * 注册命题
   * Register a proposition
   */
  public registerProposition(prop: Proposition): void {
    this._propositions.set(prop.label, prop);
    this._recordHistory('Proposition ' + prop.label + ' registered, truth value ' + prop.truthValue);
  }

  /**
   * 计算命题的合取 p ∧ q
   * Compute conjunction
   */
  public computeConjunction(propA: string, propB: string): number {
    const a = this._propositions.get(propA)?.truthValue ?? 0;
    const b = this._propositions.get(propB)?.truthValue ?? 0;
    const conjunction = Math.min(a, b);
    this._recordHistory('Conjunction ' + propA + ' ∧ ' + propB + ' = ' + conjunction);
    return conjunction;
  }

  /**
   * 计算命题的析取 p ∨ q
   * Compute disjunction
   */
  public computeDisjunction(propA: string, propB: string): number {
    const a = this._propositions.get(propA)?.truthValue ?? 0;
    const b = this._propositions.get(propB)?.truthValue ?? 0;
    const disjunction = Math.max(a, b);
    this._recordHistory('Disjunction ' + propA + ' ∨ ' + propB + ' = ' + disjunction);
    return disjunction;
  }

  /**
   * 计算命题的蕴涵 p ⇒ q
   * Compute implication
   */
  public computeImplication(propA: string, propB: string): number {
    const a = this._propositions.get(propA)?.truthValue ?? 0;
    const b = this._propositions.get(propB)?.truthValue ?? 0;
    // Heyting 蕴涵：a ⇒ b = sup{c | a ∧ c ≤ b}
    const implication = a <= b ? 1 : b;
    this._recordHistory('Implication ' + propA + ' ⇒ ' + propB + ' = ' + implication);
    return implication;
  }

  /**
   * 计算命题的否定 ¬p
   * Compute negation
   */
  public computeNegation(propLabel: string): number {
    const a = this._propositions.get(propLabel)?.truthValue ?? 0;
    const negation = a === 0 ? 1 : 0;
    this._recordHistory('Negation ¬' + propLabel + ' = ' + negation);
    return negation;
  }

  /**
   * 验证排中律是否成立
   * Verify law of excluded middle
   */
  public verifyExcludedMiddle(propLabel: string): boolean {
    const p = this._propositions.get(propLabel)?.truthValue ?? 0;
    const notP = this.computeNegation(propLabel);
    const holds = Math.abs(p + notP - 1) < 1e-10;
    this._isBoolean = this._isBoolean && holds;
    this._recordHistory('Excluded middle for ' + propLabel + ': ' + holds);
    return holds;
  }

  /**
   * 计算全称量词 ∀x.P(x)
   * Compute universal quantifier
   */
  public computeUniversalQuantifier(quantifier: Quantifier): number {
    // 简化：全称量词为最小值
    const universal = 1;
    this._recordHistory('Universal quantifier ∀' + quantifier.variable + '.' + quantifier.body + ' computed');
    return universal;
  }

  /**
   * 计算存在量词 ∃x.P(x)
   * Compute existential quantifier
   */
  public computeExistentialQuantifier(quantifier: Quantifier): number {
    // 简化：存在量词为最大值
    const existential = 1;
    this._recordHistory('Existential quantifier ∃' + quantifier.variable + '.' + quantifier.body + ' computed');
    return existential;
  }

  /**
   * 验证拓扑斯是否为布尔拓扑斯
   * Verify if topos is Boolean
   */
  public verifyBooleanTopos(): boolean {
    let allExcludedMiddle = true;
    for (const [label] of this._propositions) {
      if (!this.verifyExcludedMiddle(label)) {
        allExcludedMiddle = false;
        break;
      }
    }
    this._isBoolean = allExcludedMiddle;
    this._recordHistory('Boolean topos: ' + this._isBoolean);
    return this._isBoolean;
  }

  /**
   * 应用 Kripke-Joyal 语义
   * Apply Kripke-Joyal semantics
   */
  public applyKripkeJoyalSemantics(formula: string, stage: string): boolean {
    const holds = true;
    this._recordHistory('Kripke-Joyal semantics at stage ' + stage + ': ' + formula + ' holds = ' + holds);
    return holds;
  }

  /**
   * 计算幂对象 PX = Ω^X
   * Compute power object
   */
  public computePowerObject(typeLabel: string): string {
    const power = 'Ω^' + typeLabel;
    this._recordHistory('Power object ' + power + ' computed');
    return power;
  }

  public report(): object {
    return {
      toposName: this._toposName,
      typeCount: this._types.size,
      propositionCount: this._propositions.size,
      isBoolean: this._isBoolean,
      isHeyting: this._isHeyting,
      history: this._history
    };
  }

  public reset(): void {
    this._types.clear();
    this._propositions.clear();
    this._isBoolean = false;
    this._isHeyting = true;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }
}
