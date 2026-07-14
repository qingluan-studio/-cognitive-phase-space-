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
  private _violationFrequency: Map<string, number[]> = new Map();
  private _entropyLog: number[] = [];

  constructor() {
    this._severityDamage.set('minor', 10);
    this._severityDamage.set('moderate', 30);
    this._severityDamage.set('severe', 60);
    this._severityDamage.set('catastrophic', 100);
  }

  declare(rule: TotemTabooRule): void {
    this._rules.set(rule.id, rule);
    if (!this._violationFrequency.has(rule.id)) {
      this._violationFrequency.set(rule.id, []);
    }
  }

  grantImmunity(entity: string): void {
    this._immune.add(entity);
  }

  revokeImmunity(entity: string): boolean {
    return this._immune.delete(entity);
  }

  private _computeDamage(severity: DisasterSeverity, violationCount: number): number {
    const base = this._severityDamage.get(severity) ?? 0;
    const escalation = 1 + Math.floor(violationCount / 3) * 0.5;
    const chaos = Math.abs(Math.sin(violationCount * 1.618)) * 0.2 + 0.9;
    return base * escalation * chaos;
  }

  private _poissonProbability(lambda: number, k: number): number {
    return Math.exp(-lambda) * Math.pow(lambda, k) / this._factorial(k);
  }

  private _factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  check(ruleId: string, violator: string): TabooViolation | null {
    const rule = this._rules.get(ruleId);
    if (!rule) return null;
    if (this._immune.has(violator)) return null;
    rule.violationCount++;
    const freq = this._violationFrequency.get(ruleId) ?? [];
    freq.push(Date.now());
    if (freq.length > 20) freq.shift();
    this._violationFrequency.set(ruleId, freq);
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
    this._updateEntropy();
    return violation;
  }

  private _updateEntropy(): void {
    const counts = new Map<DisasterSeverity, number>();
    for (const v of this._violations) {
      counts.set(v.severity, (counts.get(v.severity) ?? 0) + 1);
    }
    const total = this._violations.length;
    let entropy = 0;
    for (const count of counts.values()) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    this._entropyLog.push(entropy);
    if (this._entropyLog.length > 50) this._entropyLog.shift();
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

  predictNextViolation(ruleId: string): number {
    const freq = this._violationFrequency.get(ruleId) ?? [];
    if (freq.length < 2) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < freq.length; i++) {
      intervals.push((freq[i] - freq[i - 1]) / 1000);
    }
    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const lambda = 1 / (meanInterval + 0.001);
    return this._poissonProbability(lambda, 1);
  }

  getEntropyTrend(): number[] {
    return [...this._entropyLog];
  }
}
