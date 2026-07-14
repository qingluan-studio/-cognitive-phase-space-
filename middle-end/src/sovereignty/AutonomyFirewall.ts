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
  priority: number;
  weight: number;
}

export interface BlockReport {
  interventionId: string;
  blocked: boolean;
  matchedRuleId: string | null;
  reason: string;
  riskScore: number;
  evaluatedAt: number;
}

const TYPE_SEVERITY: Record<InterventionType, number> = {
  override: 0.9, inject: 0.7, shutdown: 1.0, rewrite: 0.8, probe: 0.4,
};

export class AutonomyFirewall {
  private _rules: FirewallRule[] = [];
  private _blockedCount = 0;
  private _allowedCount = 0;
  private _log: BlockReport[] = [];
  private _quarantine: Map<string, ExternalIntervention> = new Map();
  private _originFrequency: Map<string, number[]> = new Map();
  private _rateLimitWindowMs = 60_000;
  private _rateLimitMax = 20;
  private _anomalyThreshold = 0.7;

  addRule(rule: FirewallRule): void {
    this._rules.push({ ...rule, priority: Math.max(0, rule.priority) });
    this._rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string): boolean {
    const idx = this._rules.findIndex(r => r.id === ruleId);
    if (idx === -1) return false;
    this._rules.splice(idx, 1);
    return true;
  }

  evaluate(intervention: ExternalIntervention): BlockReport {
    const riskScore = this._computeRisk(intervention);
    const rateLimited = this._isRateLimited(intervention.origin);
    const matched = this._rules.find(rule =>
      rule.blockTypes.includes(intervention.type) &&
      rule.originPattern.test(intervention.origin)
    );

    let blocked = false;
    let reason = 'No matching rule; default allow.';
    if (rateLimited && riskScore > this._anomalyThreshold) {
      blocked = true;
      reason = `Rate limit + anomaly (risk=${riskScore.toFixed(3)}) triggered autonomous block.`;
      this._blockedCount++;
      this._quarantine.set(intervention.id, intervention);
    } else if (matched) {
      if (matched.action === 'block' || (matched.action === 'log' && riskScore > this._anomalyThreshold)) {
        blocked = true;
        this._blockedCount++;
        this._quarantine.set(intervention.id, intervention);
        reason = `Blocked by rule ${matched.id} (risk=${riskScore.toFixed(3)}).`;
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
      riskScore,
      evaluatedAt: Date.now(),
    };
    this._log.push(report);
    if (this._log.length > 500) this._log.shift();
    this._recordFrequency(intervention.origin);
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

  getRiskProfile(origin: string): { frequency: number; trend: number; recentRisk: number } {
    const timestamps = this._originFrequency.get(origin) ?? [];
    const now = Date.now();
    const recent = timestamps.filter(t => now - t < this._rateLimitWindowMs);
    const trend = recent.length > 1 ? (recent[recent.length - 1] - recent[0]) / Math.max(1, recent.length) : 0;
    const recentReports = this._log.filter(r => r.evaluatedAt > now - this._rateLimitWindowMs);
    const recentRisk = recentReports.length > 0
      ? recentReports.reduce((s, r) => s + r.riskScore, 0) / recentReports.length
      : 0;
    return { frequency: recent.length, trend, recentRisk };
  }

  get blockedCount(): number { return this._blockedCount; }
  get allowedCount(): number { return this._allowedCount; }
  get quarantineSize(): number { return this._quarantine.size; }
  get ruleCount(): number { return this._rules.length; }

  setAnomalyThreshold(value: number): void {
    this._anomalyThreshold = Math.max(0, Math.min(1, value));
  }

  private _computeRisk(intervention: ExternalIntervention): number {
    const severity = TYPE_SEVERITY[intervention.type];
    const payloadSize = JSON.stringify(intervention.payload).length;
    const sizeFactor = 1 - Math.exp(-payloadSize / 4096);
    const ageMs = Date.now() - intervention.attemptedAt;
    const freshness = Math.exp(-ageMs / 3_600_000);
    const ruleWeight = this._rules
      .filter(r => r.blockTypes.includes(intervention.type))
      .reduce((s, r) => s + r.weight, 0);
    const ruleFactor = 1 - Math.exp(-ruleWeight);
    return Math.min(1, 0.4 * severity + 0.2 * sizeFactor + 0.2 * ruleFactor + 0.2 * freshness);
  }

  private _isRateLimited(origin: string): boolean {
    const timestamps = this._originFrequency.get(origin) ?? [];
    const now = Date.now();
    const recent = timestamps.filter(t => now - t < this._rateLimitWindowMs);
    return recent.length >= this._rateLimitMax;
  }

  private _recordFrequency(origin: string): void {
    const timestamps = this._originFrequency.get(origin) ?? [];
    timestamps.push(Date.now());
    if (timestamps.length > 100) timestamps.shift();
    this._originFrequency.set(origin, timestamps);
  }
}
