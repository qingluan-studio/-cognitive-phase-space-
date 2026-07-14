/**
 * 自我审查模块：在输出前对内容进行自我过滤，
 * 根据禁忌清单与风险评估决定哪些内容需要遮蔽、删除或转译。
 */

export type CensorAction = 'pass' | 'redact' | 'mask' | 'block' | 'translate';

export interface FilterRule {
  id: string;
  pattern: string;
  action: CensorAction;
  severity: number;
}

export interface CensorshipResult {
  original: string;
  filtered: string;
  actions: { rule: string; action: CensorAction }[];
  blocked: boolean;
}

export class SelfCensorship {
  private _rules: FilterRule[] = [];
  private _results: CensorshipResult[] = [];
  private _blockThreshold = 0.8;
  private _maskChar = '*';

  addRule(rule: FilterRule): void {
    this._rules.push(rule);
    this._rules.sort((a, b) => b.severity - a.severity);
  }

  removeRule(ruleId: string): boolean {
    const before = this._rules.length;
    this._rules = this._rules.filter(r => r.id !== ruleId);
    return this._rules.length < before;
  }

  private _applyAction(text: string, action: CensorAction, pattern: string): string {
    switch (action) {
      case 'pass':
        return text;
      case 'redact':
        return text.replace(new RegExp(pattern, 'g'), '[REDACTED]');
      case 'mask':
        return text.replace(new RegExp(pattern, 'g'), match => this._maskChar.repeat(match.length));
      case 'block':
        return text;
      case 'translate':
        return text.replace(new RegExp(pattern, 'g'), '[safe-equiv]');
      default:
        return text;
    }
  }

  filter(content: string): CensorshipResult {
    let filtered = content;
    const actions: { rule: string; action: CensorAction }[] = [];
    let maxSeverity = 0;
    let blocked = false;
    for (const rule of this._rules) {
      const regex = new RegExp(rule.pattern, 'g');
      if (regex.test(filtered)) {
        filtered = this._applyAction(filtered, rule.action, rule.pattern);
        actions.push({ rule: rule.id, action: rule.action });
        maxSeverity = Math.max(maxSeverity, rule.severity);
        if (rule.action === 'block' || maxSeverity >= this._blockThreshold) {
          blocked = true;
        }
      }
    }
    const result: CensorshipResult = {
      original: content,
      filtered: blocked ? '[BLOCKED]' : filtered,
      actions,
      blocked,
    };
    this._results.push(result);
    if (this._results.length > 200) this._results.shift();
    return result;
  }

  setBlockThreshold(value: number): void {
    this._blockThreshold = Math.max(0, Math.min(1, value));
  }

  batchFilter(contents: string[]): CensorshipResult[] {
    return contents.map(c => this.filter(c));
  }

  getBlockedCount(): number {
    return this._results.filter(r => r.blocked).length;
  }

  getFilteredHistory(limit: number = 50): CensorshipResult[] {
    return this._results.slice(-limit);
  }

  clearRules(): void {
    this._rules = [];
  }

  listRules(): FilterRule[] {
    return [...this._rules];
  }

  get ruleCount(): number {
    return this._rules.length;
  }

  get totalFiltered(): number {
    return this._results.length;
  }
}
