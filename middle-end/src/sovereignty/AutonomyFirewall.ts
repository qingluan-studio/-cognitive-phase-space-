/**
 * 自主防火墙：捍卫内部决策不受外部强制干预。
 * 对所有试图改动内部状态的外部请求进行拦截、审计和过滤，保证系统自主性。
 */

export type InterventionType = 'override' | 'inject' | 'shutdown' | 'rewrite' | 'probe';

export interface ExternalIntervention {
  id: string;
  type: InterventionType;
  origin: string;
  target: string;
  payload: Record<string, unknown>;
  attemptedAt: number;
}

export interface FirewallRule {
  id: string;
  blockTypes: InterventionType[];
  originPattern: RegExp;
  action: 'block' | 'allow' | 'log';
}

export interface BlockReport {
  interventionId: string;
  blocked: boolean;
  matchedRuleId: string | null;
  reason: string;
}

export class AutonomyFirewall {
  private _rules: FirewallRule[] = [];
  private _blockedCount = 0;
  private _allowedCount = 0;
  private _log: BlockReport[] = [];
  private _quarantine: Map<string, ExternalIntervention> = new Map();

  addRule(rule: FirewallRule): void {
    this._rules.push(rule);
  }

  removeRule(ruleId: string): boolean {
    const idx = this._rules.findIndex(r => r.id === ruleId);
    if (idx === -1) return false;
    this._rules.splice(idx, 1);
    return true;
  }

  evaluate(intervention: ExternalIntervention): BlockReport {
    const matched = this._rules.find(rule =>
      rule.blockTypes.includes(intervention.type) &&
      rule.originPattern.test(intervention.origin)
    );

    let blocked = false;
    let reason = 'No matching rule; default allow.';

    if (matched) {
      if (matched.action === 'block') {
        blocked = true;
        this._blockedCount++;
        this._quarantine.set(intervention.id, intervention);
        reason = `Blocked by rule ${matched.id}.`;
      } else if (matched.action === 'log') {
        reason = `Logged by rule ${matched.id}.`;
      }
    }

    if (!blocked) this._allowedCount++;

    const report: BlockReport = {
      interventionId: intervention.id,
      blocked,
      matchedRuleId: matched ? matched.id : null,
      reason,
    };
    this._log.push(report);
    return report;
  }

  release(interventionId: string): ExternalIntervention | null {
    const released = this._quarantine.get(interventionId);
    if (released) {
      this._quarantine.delete(interventionId);
      return released;
    }
    return null;
  }

  purgeQuarantine(): number {
    const count = this._quarantine.size;
    this._quarantine.clear();
    return count;
  }

  getAuditLog(limit: number = 50): BlockReport[] {
    return this._log.slice(-limit);
  }

  get blockedCount(): number {
    return this._blockedCount;
  }

  get allowedCount(): number {
    return this._allowedCount;
  }

  get quarantineSize(): number {
    return this._quarantine.size;
  }
}
