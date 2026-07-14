export type CensorAction = 'pass' | 'redact' | 'mask' | 'block' | 'translate';

export interface FilterRule {
  id: string;
  pattern: string;
  action: CensorAction;
  severity: number;
  weight: number;
}

export interface CensorshipResult {
  original: string;
  filtered: string;
  actions: { rule: string; action: CensorAction; matches: number }[];
  blocked: boolean;
  riskScore: number;
}

export class SelfCensorship {
  private _rules: FilterRule[] = [];
  private _results: CensorshipResult[] = [];
  private _blockThreshold = 0.8;
  private _maskChar = '*';
  private _contextCache: Map<string, number> = new Map();
  private _adaptiveThreshold = 0.5;

  addRule(rule: FilterRule): void {
    const normalized: FilterRule = {
      ...rule,
      severity: Math.max(0, Math.min(1, rule.severity)),
      weight: rule.weight ?? 1,
    };
    this._rules.push(normalized);
    this._rules.sort((a, b) => (b.severity * b.weight) - (a.severity * a.weight));
  }

  removeRule(ruleId: string): boolean {
    const before = this._rules.length;
    this._rules = this._rules.filter(r => r.id !== ruleId);
    return this._rules.length < before;
  }

  private _applyAction(text: string, action: CensorAction, pattern: string): { text: string; matches: number } {
    let matches = 0;
    try {
      const regex = new RegExp(pattern, 'g');
      switch (action) {
        case 'pass':
          matches = (text.match(regex) ?? []).length;
          return { text, matches };
        case 'redact': {
          const replaced = text.replace(regex, () => { matches++; return '[REDACTED]'; });
          return { text: replaced, matches };
        }
        case 'mask': {
          const replaced = text.replace(regex, m => { matches++; return this._maskChar.repeat(m.length); });
          return { text: replaced, matches };
        }
        case 'block':
          matches = (text.match(regex) ?? []).length;
          return { text, matches };
        case 'translate': {
          const replaced = text.replace(regex, () => { matches++; return '[safe-equiv]'; });
          return { text: replaced, matches };
        }
        default:
          return { text, matches };
      }
    } catch {
      return { text, matches };
    }
  }

  filter(content: string): CensorshipResult {
    let filtered = content;
    const actions: { rule: string; action: CensorAction; matches: number }[] = [];
    let weightedSeverity = 0;
    let totalWeight = 0;
    let blocked = false;
    for (const rule of this._rules) {
      const result = this._applyAction(filtered, rule.action, rule.pattern);
      if (result.matches > 0) {
        filtered = result.text;
        actions.push({ rule: rule.id, action: rule.action, matches: result.matches });
        weightedSeverity += rule.severity * rule.weight * Math.min(1, result.matches / 3);
        totalWeight += rule.weight;
        if (rule.action === 'block') blocked = true;
      }
    }
    const riskScore = totalWeight === 0 ? 0 : Math.min(1, weightedSeverity / totalWeight);
    if (riskScore >= this._blockThreshold) blocked = true;
    this._updateContext(content, riskScore);
    const adaptiveBoost = this._contextBoost(content);
    if (adaptiveBoost > 0 && riskScore + adaptiveBoost >= this._blockThreshold) blocked = true;
    const censoredResult: CensorshipResult = {
      original: content,
      filtered: blocked ? '[BLOCKED]' : filtered,
      actions,
      blocked,
      riskScore,
    };
    this._results.push(censoredResult);
    if (this._results.length > 200) this._results.shift();
    return censoredResult;
  }

  private _updateContext(content: string, risk: number): void {
    const key = content.slice(0, 32);
    const cur = this._contextCache.get(key) ?? 0;
    this._contextCache.set(key, cur * 0.7 + risk * 0.3);
    if (this._contextCache.size > 100) {
      const oldest = this._contextCache.keys().next().value;
      if (oldest) this._contextCache.delete(oldest);
    }
  }

  private _contextBoost(content: string): number {
    const key = content.slice(0, 32);
    const ctx = this._contextCache.get(key) ?? 0;
    return ctx > this._adaptiveThreshold ? ctx * 0.2 : 0;
  }

  setBlockThreshold(value: number): void {
    this._blockThreshold = Math.max(0, Math.min(1, value));
  }

  setAdaptiveThreshold(value: number): void {
    this._adaptiveThreshold = Math.max(0, Math.min(1, value));
  }

  batchFilter(contents: string[]): CensorshipResult[] {
    return contents.map(c => this.filter(c));
  }

  getBlockedCount(): number {
    return this._results.filter(r => r.blocked).length;
  }

  computeAverageRisk(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.riskScore, 0) / this._results.length;
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
