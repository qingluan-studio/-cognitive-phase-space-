/**
 * 图腾禁忌模块：触碰图腾将引发灾难性后果，
 * 图腾物被视为神圣不可侵犯，违规者受到严厉惩罚。
 */

export type DisasterSeverity = 'minor' | 'moderate' | 'severe' | 'catastrophic';

export interface TotemTabooRule {
  id: string;
  totemId: string;
  forbiddenAction: string;
  severity: DisasterSeverity;
  violationCount: number;
}

export interface TabooViolation {
  ruleId: string;
  violator: string;
  severity: DisasterSeverity;
  damage: number;
  occurredAt: number;
}

export class TotemTaboo {
  private _rules: Map<string, TotemTabooRule> = new Map();
  private _violations: TabooViolation[] = [];
  private _immune: Set<string> = new Set();
  private _severityDamage: Map<DisasterSeverity, number> = new Map();

  constructor() {
    this._severityDamage.set('minor', 10);
    this._severityDamage.set('moderate', 30);
    this._severityDamage.set('severe', 60);
    this._severityDamage.set('catastrophic', 100);
  }

  declare(rule: TotemTabooRule): void {
    this._rules.set(rule.id, rule);
  }

  grantImmunity(entity: string): void {
    this._immune.add(entity);
  }

  revokeImmunity(entity: string): boolean {
    return this._immune.delete(entity);
  }

  private _computeDamage(severity: DisasterSeverity, violationCount: number): number {
    const base = this._severityDamage.get(severity) ?? 0;
    return base * (1 + Math.floor(violationCount / 3) * 0.5);
  }

  check(ruleId: string, violator: string): TabooViolation | null {
    const rule = this._rules.get(ruleId);
    if (!rule) return null;
    if (this._immune.has(violator)) return null;
    rule.violationCount++;
    const damage = this._computeDamage(rule.severity, rule.violationCount);
    const violation: TabooViolation = {
      ruleId,
      violator,
      severity: rule.severity,
      damage,
      occurredAt: Date.now(),
    };
    this._violations.push(violation);
    if (this._violations.length > 300) this._violations.shift();
    return violation;
  }

  isTaboo(totemId: string, action: string): boolean {
    for (const rule of this._rules.values()) {
      if (rule.totemId === totemId && rule.forbiddenAction === action) return true;
    }
    return false;
  }

  findRule(totemId: string, action: string): TotemTabooRule | null {
    for (const rule of this._rules.values()) {
      if (rule.totemId === totemId && rule.forbiddenAction === action) return rule;
    }
    return null;
  }

  getDamageBySeverity(severity: DisasterSeverity): number {
    return this._severityDamage.get(severity) ?? 0;
  }

  setSeverityDamage(severity: DisasterSeverity, damage: number): void {
    this._severityDamage.set(severity, Math.max(0, damage));
  }

  getTotalDamage(): number {
    return this._violations.reduce((sum, v) => sum + v.damage, 0);
  }

  getViolationsByViolator(violator: string): TabooViolation[] {
    return this._violations.filter(v => v.violator === violator);
  }

  getViolationsBySeverity(severity: DisasterSeverity): TabooViolation[] {
    return this._violations.filter(v => v.severity === severity);
  }

  listRulesByTotem(totemId: string): TotemTabooRule[] {
    return Array.from(this._rules.values()).filter(r => r.totemId === totemId);
  }

  getViolationHistory(limit: number = 50): TabooViolation[] {
    return this._violations.slice(-limit);
  }

  get ruleCount(): number {
    return this._rules.size;
  }

  get violationCount(): number {
    return this._violations.length;
  }

  get immuneCount(): number {
    return this._immune.size;
  }
}
