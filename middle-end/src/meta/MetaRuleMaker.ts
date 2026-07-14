/**
 * 元规则制定者模块：制定如何制定规则的规则。
 * 在规则层之上提供约束：哪些规则可被新规则改写、改写需满足什么条件。
 */

export interface MetaRuleMakerData {
  metaRules: Array<{ id: string; governs: string; constraint: string }>;
  ruleEdits: number;
  vetoes: number;
}

export class MetaRuleMaker {
  private _metaRules: Map<string, { governs: string; constraint: string }>;
  private _ruleEdits: number;
  private _vetoes: number;
  private _immutable: Set<string>;

  constructor() {
    this._metaRules = new Map<string, { governs: string; constraint: string }>();
    this._ruleEdits = 0;
    this._vetoes = 0;
    this._immutable = new Set<string>();
  }

  get metaRuleCount(): number {
    return this._metaRules.size;
  }

  public enact(id: string, governs: string, constraint: string, immutable: boolean = false): void {
    if (this._immutable.has(id)) {
      this._vetoes += 1;
      return;
    }
    this._metaRules.set(id, { governs, constraint });
    if (immutable) this._immutable.add(id);
  }

  public permitsEdit(ruleId: string, newConstraint: string): boolean {
    if (this._immutable.has(ruleId)) {
      this._vetoes += 1;
      return false;
    }
    const existing = this._metaRules.get(ruleId);
    if (!existing) return false;
    existing.constraint = newConstraint;
    this._ruleEdits += 1;
    return true;
  }

  public governs(id: string): string | undefined {
    return this._metaRules.get(id)?.governs;
  }

  public isImmutable(id: string): boolean {
    return this._immutable.has(id);
  }

  public listMetaRules(): Array<{ id: string; governs: string; constraint: string }> {
    const out: Array<{ id: string; governs: string; constraint: string }> = [];
    for (const [id, v] of this._metaRules) {
      out.push({ id, governs: v.governs, constraint: v.constraint });
    }
    return out;
  }

  public report(): MetaRuleMakerData {
    return {
      metaRules: this.listMetaRules(),
      ruleEdits: this._ruleEdits,
      vetoes: this._vetoes,
    };
  }
}
