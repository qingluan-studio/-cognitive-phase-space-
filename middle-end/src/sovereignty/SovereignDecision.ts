/**
 * 主权决策模块：系统拥有否决外部指令的最终决定权。
 * 任何外部指令必须经过本模块审议，系统可基于自身主权原则予以批准或否决。
 */

export interface ExternalDirective {
  id: string;
  source: string;
  payload: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  issuedAt: number;
}

export type DecisionVerdict = 'approved' | 'vetoed' | 'deferred';

export interface DecisionRecord {
  directiveId: string;
  verdict: DecisionVerdict;
  reason: string;
  decidedAt: number;
}

export interface VetoRule {
  id: string;
  description: string;
  matcher: (directive: ExternalDirective) => boolean;
}

export class SovereignDecision {
  private _rules: Map<string, VetoRule> = new Map();
  private _history: DecisionRecord[] = [];
  private _vetoCount = 0;
  private _approveCount = 0;

  registerRule(rule: VetoRule): void {
    this._rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): boolean {
    return this._rules.delete(ruleId);
  }

  review(directive: ExternalDirective): DecisionRecord {
    const triggered = this._findTriggeredRules(directive);
    const verdict: DecisionVerdict = triggered.length > 0 ? 'vetoed' : 'approved';
    const reason = verdict === 'vetoed'
      ? `Matched veto rules: ${triggered.map(r => r.id).join(', ')}`
      : 'No veto rule matched; sovereign approval granted.';

    if (verdict === 'vetoed') this._vetoCount++;
    else this._approveCount++;

    const record: DecisionRecord = {
      directiveId: directive.id,
      verdict,
      reason,
      decidedAt: Date.now(),
    };
    this._history.push(record);
    return record;
  }

  defer(directive: ExternalDirective, reason: string): DecisionRecord {
    const record: DecisionRecord = {
      directiveId: directive.id,
      verdict: 'deferred',
      reason,
      decidedAt: Date.now(),
    };
    this._history.push(record);
    return record;
  }

  forceVeto(directiveId: string, reason: string): DecisionRecord | null {
    const existing = this._history.find(r => r.directiveId === directiveId);
    if (existing) {
      if (existing.verdict === 'approved') this._approveCount--;
      existing.verdict = 'vetoed';
      existing.reason = reason;
      existing.decidedAt = Date.now();
      this._vetoCount++;
      return existing;
    }
    return null;
  }

  getHistory(): DecisionRecord[] {
    return [...this._history];
  }

  get vetoCount(): number {
    return this._vetoCount;
  }

  get approveCount(): number {
    return this._approveCount;
  }

  private _findTriggeredRules(directive: ExternalDirective): VetoRule[] {
    const matched: VetoRule[] = [];
    for (const rule of this._rules.values()) {
      try {
        if (rule.matcher(directive)) matched.push(rule);
      } catch {
        continue;
      }
    }
    return matched;
  }
}
