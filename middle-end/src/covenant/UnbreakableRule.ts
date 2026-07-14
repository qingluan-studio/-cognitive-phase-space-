/**
 * 不可违背规则模块：硬编码的绝对规则。
 * 一旦写入即冻结，禁止运行时修改，违反时直接终止调用。
 */

export interface UnbreakableRuleData {
  rules: Array<{ id: string; clause: string; frozen: boolean }>;
  violations: number;
}

export class UnbreakableRule {
  private _rules: Map<string, string>;
  private _frozen: Set<string>;
  private _violations: number;

  constructor() {
    this._rules = new Map<string, string>();
    this._frozen = new Set<string>();
    this._violations = 0;
  }

  get ruleCount(): number {
    return this._rules.size;
  }

  get violations(): number {
    return this._violations;
  }

  public enact(id: string, clause: string, freeze: boolean = true): void {
    if (this._frozen.has(id)) {
      this._violations += 1;
      throw new Error(`Rule ${id} is frozen and cannot be re-enacted.`);
    }
    this._rules.set(id, clause);
    if (freeze) this._frozen.add(id);
  }

  public enforce(id: string, value: unknown): boolean {
    const clause = this._rules.get(id);
    if (!clause) {
      this._violations += 1;
      return false;
    }
    const satisfied = typeof value === 'string' && value.includes(clause);
    if (!satisfied) this._violations += 1;
    return satisfied;
  }

  public read(id: string): string | undefined {
    return this._rules.get(id);
  }

  public isFrozen(id: string): boolean {
    return this._frozen.has(id);
  }

  public list(): Array<{ id: string; clause: string; frozen: boolean }> {
    const out: Array<{ id: string; clause: string; frozen: boolean }> = [];
    for (const [id, clause] of this._rules) {
      out.push({ id, clause, frozen: this._frozen.has(id) });
    }
    return out;
  }

  public report(): UnbreakableRuleData {
    return { rules: this.list(), violations: this._violations };
  }
}
