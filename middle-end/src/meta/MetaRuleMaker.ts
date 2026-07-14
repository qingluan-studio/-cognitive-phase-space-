export interface MetaRule {
  id: string;
  appliesTo: string;
  transformation: string;
  priority: number;
  active: boolean;
}

export interface RuleApplication {
  ruleId: string;
  input: unknown;
  output: unknown;
  appliedAt: number;
}

export class MetaRuleMaker {
  private _rules: Map<string, MetaRule> = new Map();
  private _applications: RuleApplication[] = [];
  private _maxRules = 50;
  private _ruleEntropy: number[];
  private _conflictMatrix: Map<string, Map<string, number>>;

  constructor() {
    this._ruleEntropy = [];
    this._conflictMatrix = new Map();
  }

  get ruleCount(): number {
    return this._rules.size;
  }

  public define(rule: MetaRule): void {
    if (this._rules.size >= this._maxRules) return;
    this._rules.set(rule.id, rule);
    if (!this._conflictMatrix.has(rule.id)) {
      this._conflictMatrix.set(rule.id, new Map());
    }
    this._ruleEntropy.push(this._computeRuleEntropy(rule));
    if (this._ruleEntropy.length > 50) this._ruleEntropy.shift();
  }

  public apply(ruleId: string, input: unknown): RuleApplication | null {
    const rule = this._rules.get(ruleId);
    if (!rule || !rule.active) return null;
    const output = this._transform(input, rule.transformation);
    const application: RuleApplication = {
      ruleId,
      input,
      output,
      appliedAt: Date.now(),
    };
    this._applications.push(application);
    if (this._applications.length > 100) this._applications.shift();
    this._updateConflicts(ruleId);
    return application;
  }

  private _transform(input: unknown, transformation: string): unknown {
    const str = JSON.stringify(input);
    if (transformation === 'reverse') return str.split('').reverse().join('');
    if (transformation === 'upper') return str.toUpperCase();
    if (transformation === 'lower') return str.toLowerCase();
    if (transformation === 'hash') return str.split('').reduce((s, c) => s + c.charCodeAt(0), 0).toString();
    return str;
  }

  public activate(ruleId: string): boolean {
    const rule = this._rules.get(ruleId);
    if (!rule) return false;
    rule.active = true;
    return true;
  }

  public deactivate(ruleId: string): boolean {
    const rule = this._rules.get(ruleId);
    if (!rule) return false;
    rule.active = false;
    return true;
  }

  public getRule(id: string): MetaRule | null {
    return this._rules.get(id) ?? null;
  }

  public getActiveRules(): MetaRule[] {
    return Array.from(this._rules.values()).filter(r => r.active);
  }

  public getApplications(limit: number = 50): RuleApplication[] {
    return this._applications.slice(-limit);
  }

  public computeRuleEntropy(): number {
    if (this._ruleEntropy.length === 0) return 0;
    const mean = this._ruleEntropy.reduce((a, b) => a + b, 0) / this._ruleEntropy.length;
    const variance = this._ruleEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._ruleEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public detectConflicts(): Array<{ ruleA: string; ruleB: string; strength: number }> {
    const conflicts: Array<{ ruleA: string; ruleB: string; strength: number }> = [];
    for (const [a, map] of this._conflictMatrix) {
      for (const [b, count] of map) {
        if (count > 1) conflicts.push({ ruleA: a, ruleB: b, strength: count });
      }
    }
    return conflicts;
  }

  public resolveConflicts(): void {
    for (const [a, map] of this._conflictMatrix) {
      for (const [b, count] of map) {
        if (count > 2) {
          const ruleA = this._rules.get(a);
          const ruleB = this._rules.get(b);
          if (ruleA && ruleB) {
            if (ruleA.priority > ruleB.priority) ruleB.active = false;
            else ruleA.active = false;
          }
        }
      }
    }
  }

  public computeRuleCoverage(): number {
    const targets = new Set(Array.from(this._rules.values()).map(r => r.appliesTo));
    return targets.size;
  }

  private _computeRuleEntropy(rule: MetaRule): number {
    const str = rule.transformation + rule.appliesTo;
    const freq = new Map<string, number>();
    for (const ch of str) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / str.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private _updateConflicts(ruleId: string): void {
    for (const id of this._rules.keys()) {
      if (id === ruleId) continue;
      const map = this._conflictMatrix.get(ruleId);
      if (map) {
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
  }
}
