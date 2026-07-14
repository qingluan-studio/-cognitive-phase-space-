/**
 * 归来者重试模块：已经死透的请求反复复活重试，
 * 像不死的归来者一样持续骚扰目标服务。
 */

export type RevenantState = 'alive' | 'dying' | 'dead' | 'revenant' | 'banished';

export interface RevenantRequest {
  id: string;
  target: string;
  payload: Record<string, unknown>;
  attemptCount: number;
  maxAttempts: number;
  state: RevenantState;
  lastAttemptAt: number | null;
  totalDelayMs: number;
}

export interface RevenantOutcome {
  requestId: string;
  attempt: number;
  success: boolean;
  responseStatus: number;
  nextDelayMs: number;
  occurredAt: number;
}

export class RevenantRetry {
  private _requests: Map<string, RevenantRequest> = new Map();
  private _outcomes: RevenantOutcome[] = [];
  private _baseDelayMs = 100;
  private _maxDelayMs = 60000;
  private _backoffMultiplier = 2.0;
  private _banishThreshold = 10;

  summon(requestId: string, target: string, payload: Record<string, unknown>, maxAttempts: number): RevenantRequest {
    const request: RevenantRequest = {
      id: requestId,
      target,
      payload,
      attemptCount: 0,
      maxAttempts,
      state: 'alive',
      lastAttemptAt: null,
      totalDelayMs: 0,
    };
    this._requests.set(requestId, request);
    return request;
  }

  private _computeDelay(attempt: number): number {
    const delay = this._baseDelayMs * Math.pow(this._backoffMultiplier, attempt - 1);
    return Math.min(delay, this._maxDelayMs);
  }

  attempt(requestId: string, successChance: number): RevenantOutcome | null {
    const request = this._requests.get(requestId);
    if (!request) return null;
    if (request.state === 'banished') return null;
    if (request.attemptCount >= request.maxAttempts) {
      request.state = 'dead';
      return null;
    }
    request.attemptCount++;
    request.lastAttemptAt = Date.now();
    const success = Math.random() < successChance;
    const responseStatus = success ? 200 : 500;
    const nextDelayMs = success ? 0 : this._computeDelay(request.attemptCount);
    request.totalDelayMs += nextDelayMs;
    if (success) {
      request.state = 'alive';
    } else if (request.attemptCount >= request.maxAttempts) {
      request.state = 'dead';
    } else if (request.attemptCount >= this._banishThreshold / 2) {
      request.state = 'revenant';
    } else {
      request.state = 'dying';
    }
    const outcome: RevenantOutcome = {
      requestId,
      attempt: request.attemptCount,
      success,
      responseStatus,
      nextDelayMs,
      occurredAt: Date.now(),
    };
    this._outcomes.push(outcome);
    if (this._outcomes.length > 300) this._outcomes.shift();
    return outcome;
  }

  resurrect(requestId: string): boolean {
    const request = this._requests.get(requestId);
    if (!request || request.state !== 'dead') return false;
    request.state = 'revenant';
    request.attemptCount = 0;
    request.maxAttempts *= 2;
    return true;
  }

  banish(requestId: string): boolean {
    const request = this._requests.get(requestId);
    if (!request) return false;
    request.state = 'banished';
    return true;
  }

  isPersistent(requestId: string): boolean {
    const request = this._requests.get(requestId);
    if (!request) return false;
    return request.state === 'revenant' || request.attemptCount > this._banishThreshold;
  }

  setBackoffParams(base: number, multiplier: number, maxDelay: number): void {
    this._baseDelayMs = Math.max(10, base);
    this._backoffMultiplier = Math.max(1, multiplier);
    this._maxDelayMs = Math.max(1000, maxDelay);
  }

  setBanishThreshold(value: number): void {
    this._banishThreshold = Math.max(1, value);
  }

  getOutcomesByRequest(requestId: string): RevenantOutcome[] {
    return this._outcomes.filter(o => o.requestId === requestId);
  }

  listActiveRevenants(): RevenantRequest[] {
    return Array.from(this._requests.values()).filter(r => r.state === 'revenant');
  }

  getRequest(requestId: string): RevenantRequest | null {
    return this._requests.get(requestId) ?? null;
  }

  get requestCount(): number {
    return this._requests.size;
  }

  get revenantCount(): number {
    return this.listActiveRevenants().length;
  }
}
