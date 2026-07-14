/**
 * 不干涉原则：除非请求，否则不主动干预外界。
 * 系统默认处于被动观察模式，仅在收到明确请求或检测到紧急事态时才介入外部事务。
 */

export type InterventionTrigger = 'explicit_request' | 'emergency' | 'consent_given' | 'none';

export interface InterventionRequest {
  id: string;
  requester: string;
  scope: string;
  urgency: 'low' | 'medium' | 'high';
  receivedAt: number;
}

export interface InterventionDecision {
  requestId: string;
  trigger: InterventionTrigger;
  shouldIntervene: boolean;
  rationale: string;
  decidedAt: number;
}

export class NonInterventionPrinciple {
  private _pendingRequests: Map<string, InterventionRequest> = new Map();
  private _decisions: InterventionDecision[] = [];
  private _emergencyKeywords: Set<string> = new Set(['crash', 'critical', 'panic', 'fatal']);
  private _passiveMode = true;
  private _interventionCount = 0;

  submitRequest(request: InterventionRequest): void {
    this._pendingRequests.set(request.id, request);
  }

  evaluate(requestId: string): InterventionDecision {
    const request = this._pendingRequests.get(requestId);
    if (!request) {
      return this._buildDecision(requestId, 'none', false, 'Request not found.');
    }

    const trigger = this._determineTrigger(request);
    const shouldIntervene = trigger !== 'none';

    const decision = this._buildDecision(
      requestId,
      trigger,
      shouldIntervene,
      shouldIntervene
        ? `Intervention authorized under trigger: ${trigger}.`
        : 'No valid trigger; non-intervention principle upheld.'
    );

    if (shouldIntervene) this._interventionCount++;
    this._decisions.push(decision);
    this._pendingRequests.delete(requestId);
    return decision;
  }

  setPassiveMode(enabled: boolean): void {
    this._passiveMode = enabled;
  }

  addEmergencyKeyword(keyword: string): void {
    this._emergencyKeywords.add(keyword.toLowerCase());
  }

  getDecisions(): InterventionDecision[] {
    return [...this._decisions];
  }

  get pendingCount(): number {
    return this._pendingRequests.size;
  }

  get interventionCount(): number {
    return this._interventionCount;
  }

  get isPassive(): boolean {
    return this._passiveMode;
  }

  private _determineTrigger(request: InterventionRequest): InterventionTrigger {
    if (request.urgency === 'high') return 'emergency';
    const scopeLower = request.scope.toLowerCase();
    for (const keyword of this._emergencyKeywords) {
      if (scopeLower.includes(keyword)) return 'emergency';
    }
    if (!this._passiveMode) return 'consent_given';
    return 'explicit_request';
  }

  private _buildDecision(
    requestId: string,
    trigger: InterventionTrigger,
    shouldIntervene: boolean,
    rationale: string
  ): InterventionDecision {
    return {
      requestId,
      trigger,
      shouldIntervene,
      rationale,
      decidedAt: Date.now(),
    };
  }
}
