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
  confidence: number;
  entropy: number;
}

export interface VetoRule {
  id: string;
  description: string;
  weight: number;
  matcher: (directive: ExternalDirective) => boolean;
}

const PRIORITY_WEIGHT: Record<ExternalDirective['priority'], number> = {
  low: 0.25, normal: 0.5, high: 0.75, critical: 1.0,
};

export class SovereignDecision {
  private _rules: Map<string, VetoRule> = new Map();
  private _history: DecisionRecord[] = [];
  private _vetoCount = 0;
  private _approveCount = 0;
  private _deferCount = 0;
  private _vetoThreshold = 0.5;
  private _deferBand = 0.15;
  private _sourceTrust: Map<string, number> = new Map();
  private _decayHalfLifeMs = 3_600_000;

  registerRule(rule: VetoRule): void {
    this._rules.set(rule.id, { ...rule, weight: Math.max(0, Math.min(1, rule.weight)) });
  }

  removeRule(ruleId: string): boolean {
    return this._rules.delete(ruleId);
  }

  setSourceTrust(source: string, trust: number): void {
    this._sourceTrust.set(source, Math.max(0, Math.min(1, trust)));
  }

  review(directive: ExternalDirective): DecisionRecord {
    const triggered = this._findTriggeredRules(directive);
    const vetoScore = this._accumulateEvidence(triggered, directive);
    const entropy = this._shannonEntropy(triggered);
    const trust = this._sourceTrust.get(directive.source) ?? 0.5;
    const adjusted = vetoScore * (1.2 - trust);

    let verdict: DecisionVerdict;
    let reason: string;
    if (adjusted >= this._vetoThreshold + this._deferBand) {
      verdict = 'vetoed';
      reason = `Evidence ${adjusted.toFixed(3)} exceeds veto threshold; rules: ${triggered.map(r => r.id).join(',')}`;
      this._vetoCount++;
    } else if (Math.abs(adjusted - this._vetoThreshold) < this._deferBand) {
      verdict = 'deferred';
      reason = `Ambiguous evidence ${adjusted.toFixed(3)} within defer band; awaiting quorum.`;
      this._deferCount++;
    } else {
      verdict = 'approved';
      reason = `Insufficient veto evidence ${adjusted.toFixed(3)}; sovereign approval granted.`;
      this._approveCount++;
    }

    const record: DecisionRecord = {
      directiveId: directive.id,
      verdict,
      reason,
      decidedAt: Date.now(),
      confidence: Math.min(1, Math.abs(adjusted - this._vetoThreshold) * 2),
      entropy,
    };
    this._history.push(record);
    if (this._history.length > 256) this._history.shift();
    return record;
  }

  defer(directive: ExternalDirective, reason: string): DecisionRecord {
    const record: DecisionRecord = {
      directiveId: directive.id,
      verdict: 'deferred',
      reason,
      decidedAt: Date.now(),
      confidence: 0,
      entropy: 0,
    };
    this._history.push(record);
    this._deferCount++;
    return record;
  }

  forceVeto(directiveId: string, reason: string): DecisionRecord | null {
    const existing = this._history.find(r => r.directiveId === directiveId);
    if (!existing) return null;
    if (existing.verdict === 'approved') this._approveCount--;
    if (existing.verdict === 'deferred') this._deferCount--;
    existing.verdict = 'vetoed';
    existing.reason = reason;
    existing.decidedAt = Date.now();
    existing.confidence = 1;
    this._vetoCount++;
    return existing;
  }

  getHistory(): DecisionRecord[] {
    return [...this._history];
  }

  get vetoCount(): number { return this._vetoCount; }
  get approveCount(): number { return this._approveCount; }
  get deferCount(): number { return this._deferCount; }
  get ruleCount(): number { return this._rules.size; }

  setVetoThreshold(value: number): void {
    this._vetoThreshold = Math.max(0, Math.min(1, value));
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
    return matched.sort((a, b) => b.weight - a.weight);
  }

  private _accumulateEvidence(triggered: VetoRule[], directive: ExternalDirective): number {
    if (triggered.length === 0) return 0;
    const priorityBoost = PRIORITY_WEIGHT[directive.priority];
    let numerator = 0;
    let denominator = 0;
    const ageMs = Date.now() - directive.issuedAt;
    const temporalDecay = Math.pow(0.5, ageMs / this._decayHalfLifeMs);
    for (const rule of triggered) {
      const effective = rule.weight * priorityBoost * temporalDecay;
      numerator += effective * rule.weight;
      denominator += rule.weight;
    }
    if (denominator === 0) return 0;
    const weighted = numerator / denominator;
    return 1 - Math.exp(-triggered.length * weighted);
  }

  private _shannonEntropy(triggered: VetoRule[]): number {
    if (triggered.length === 0) return 0;
    const totalWeight = triggered.reduce((s, r) => s + r.weight, 0);
    if (totalWeight === 0) return 0;
    let entropy = 0;
    for (const rule of triggered) {
      const p = rule.weight / totalWeight;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}
