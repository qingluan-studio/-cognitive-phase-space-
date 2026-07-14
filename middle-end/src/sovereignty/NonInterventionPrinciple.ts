export type InterventionTrigger = 'explicit_request' | 'emergency' | 'consent_given' | 'none';

export interface InterventionRequest {
  id: string;
  requester: string;
  scope: string;
  urgency: 'low' | 'medium' | 'high';
  receivedAt: number;
  metadata: Record<string, unknown>;
}

export interface InterventionDecision {
  requestId: string;
  trigger: InterventionTrigger;
  shouldIntervene: boolean;
  rationale: string;
  decidedAt: number;
  triggerScore: number;
}

const URGENCY_WEIGHT: Record<InterventionRequest['urgency'], number> = {
  low: 0.2, medium: 0.5, high: 0.9,
};

export class NonInterventionPrinciple {
  private _pendingRequests: Map<string, InterventionRequest> = new Map();
  private _decisions: InterventionDecision[] = [];
  private _emergencyKeywords: Map<string, number> = new Map([
    ['crash', 1.0], ['critical', 0.95], ['panic', 0.9], ['fatal', 1.0], ['emergency', 0.85],
  ]);
  private _passiveMode = true;
  private _interventionCount = 0;
  private _requesterTrust: Map<string, number> = new Map();
  private _interventionThreshold = 0.5;
  private _cooldownMs = 5_000;
  private _lastInterventionAt = 0;

  submitRequest(request: InterventionRequest): void {
    this._pendingRequests.set(request.id, request);
  }

  setRequesterTrust(requester: string, trust: number): void {
    this._requesterTrust.set(requester, Math.max(0, Math.min(1, trust)));
  }

  evaluate(requestId: string): InterventionDecision {
    const request = this._pendingRequests.get(requestId);
    if (!request) {
      return this._buildDecision(requestId, 'none', false, 'Request not found.', 0);
    }

    const triggerScore = this._computeTriggerScore(request);
    const trigger = this._determineTrigger(request, triggerScore);
    const inCooldown = Date.now() - this._lastInterventionAt < this._cooldownMs;
    const shouldIntervene = trigger !== 'none' && triggerScore >= this._interventionThreshold && !inCooldown;

    const decision = this._buildDecision(
      requestId,
      trigger,
      shouldIntervene,
      shouldIntervene
        ? `Intervention authorized (score=${triggerScore.toFixed(3)}, trigger=${trigger}).`
        : `Non-intervention upheld (score=${triggerScore.toFixed(3)}, cooldown=${inCooldown}).`,
      triggerScore
    );

    if (shouldIntervene) {
      this._interventionCount++;
      this._lastInterventionAt = Date.now();
    }
    this._decisions.push(decision);
    this._pendingRequests.delete(requestId);
    return decision;
  }

  setPassiveMode(enabled: boolean): void {
    this._passiveMode = enabled;
  }

  addEmergencyKeyword(keyword: string, weight: number = 0.8): void {
    this._emergencyKeywords.set(keyword.toLowerCase(), Math.max(0, Math.min(1, weight)));
  }

  setInterventionThreshold(value: number): void {
    this._interventionThreshold = Math.max(0, Math.min(1, value));
  }

  getDecisions(): InterventionDecision[] {
    return [...this._decisions];
  }

  get pendingCount(): number { return this._pendingRequests.size; }
  get interventionCount(): number { return this._interventionCount; }
  get isPassive(): boolean { return this._passiveMode; }

  private _computeTriggerScore(request: InterventionRequest): number {
    const urgencyScore = URGENCY_WEIGHT[request.urgency];
    const scopeLower = request.scope.toLowerCase();
    let keywordScore = 0;
    for (const [keyword, weight] of this._emergencyKeywords) {
      if (scopeLower.includes(keyword)) {
        keywordScore = Math.max(keywordScore, weight);
      }
    }
    const trust = this._requesterTrust.get(request.requester) ?? 0.5;
    const ageMs = Date.now() - request.receivedAt;
    const staleness = Math.exp(-ageMs / 60_000);
    const passiveModifier = this._passiveMode ? 0.7 : 1.0;
    const composite = (urgencyScore * 0.4 + keywordScore * 0.4 + staleness * 0.2) * passiveModifier;
    return composite * (0.5 + 0.5 * trust);
  }

  private _determineTrigger(request: InterventionRequest, score: number): InterventionTrigger {
    if (request.urgency === 'high' && score >= 0.7) return 'emergency';
    const scopeLower = request.scope.toLowerCase();
    for (const keyword of this._emergencyKeywords.keys()) {
      if (scopeLower.includes(keyword)) return 'emergency';
    }
    if (!this._passiveMode && score >= 0.6) return 'consent_given';
    if (score >= this._interventionThreshold) return 'explicit_request';
    return 'none';
  }

  private _buildDecision(
    requestId: string,
    trigger: InterventionTrigger,
    shouldIntervene: boolean,
    rationale: string,
    triggerScore: number
  ): InterventionDecision {
    return {
      requestId,
      trigger,
      shouldIntervene,
      rationale,
      decidedAt: Date.now(),
      triggerScore,
    };
  }
}
