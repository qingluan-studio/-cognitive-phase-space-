export interface SeanceCall {
  id: string;
  target: string;
  latency: number;
  success: boolean;
  retryCount: number;
  timestamp: number;
}

export interface SeanceEndpoint {
  id: string;
  failureRate: number;
  baseLatency: number;
  loadFactor: number;
}

export class SeanceCaller {
  private _calls: SeanceCall[] = [];
  private _endpoints: Map<string, SeanceEndpoint> = new Map();
  private _state: Record<string, unknown> = {};
  private _latencyDistribution: number[] = [];
  private _arrivalTimes: number[] = [];
  private _poissonLambda: number = 5;
  private _backoffMultiplier: number = 2;

  registerEndpoint(id: string, failureRate: number, baseLatency: number): SeanceEndpoint {
    const endpoint: SeanceEndpoint = { id, failureRate, baseLatency, loadFactor: 1 };
    this._endpoints.set(id, endpoint);
    return endpoint;
  }

  call(target: string, retryCount: number = 0): SeanceCall {
    const endpoint = this._endpoints.get(target);
    const now = Date.now();
    this._arrivalTimes.push(now);
    if (this._arrivalTimes.length > 100) this._arrivalTimes.shift();
    let latency = endpoint ? endpoint.baseLatency * endpoint.loadFactor : 100;
    latency += Math.random() * latency * 0.2;
    const success = endpoint ? Math.random() > endpoint.failureRate : Math.random() > 0.1;
    const call: SeanceCall = {
      id: `call-${now}-${Math.random().toString(36).slice(2, 6)}`,
      target,
      latency: Math.floor(latency),
      success,
      retryCount,
      timestamp: now,
    };
    this._calls.push(call);
    if (this._calls.length > 200) this._calls.shift();
    this._latencyDistribution.push(latency);
    if (this._latencyDistribution.length > 100) this._latencyDistribution.shift();
    if (endpoint) endpoint.loadFactor = Math.max(1, endpoint.loadFactor * (success ? 0.99 : 1.01));
    return call;
  }

  retry(callId: string): SeanceCall | null {
    const original = this._calls.find(c => c.id === callId);
    if (!original || original.success) return null;
    const newRetry = original.retryCount + 1;
    const backoffDelay = Math.pow(this._backoffMultiplier, newRetry) * 100;
    const endpoint = this._endpoints.get(original.target);
    if (endpoint) endpoint.loadFactor = Math.max(1, endpoint.loadFactor * 0.95);
    const retried = this.call(original.target, newRetry);
    retried.latency += backoffDelay;
    return retried;
  }

  getCallsForTarget(target: string): SeanceCall[] {
    return this._calls.filter(c => c.target === target);
  }

  averageLatency(): number {
    if (this._calls.length === 0) return 0;
    return this._calls.reduce((acc, c) => acc + c.latency, 0) / this._calls.length;
  }

  latencyPercentile(p: number): number {
    if (this._latencyDistribution.length === 0) return 0;
    const sorted = [...this._latencyDistribution].sort((a, b) => a - b);
    const idx = Math.floor((p / 100) * (sorted.length - 1));
    return sorted[idx];
  }

  successRate(): number {
    if (this._calls.length === 0) return 0;
    return this._calls.filter(c => c.success).length / this._calls.length;
  }

  estimatePoissonLambda(): number {
    if (this._arrivalTimes.length < 2) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < this._arrivalTimes.length; i++) {
      intervals.push(this._arrivalTimes[i] - this._arrivalTimes[i - 1]);
    }
    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return meanInterval > 0 ? 1000 / meanInterval : 0;
  }

  getRecentCalls(limit: number = 50): SeanceCall[] {
    return this._calls.slice(-limit);
  }

  setBackoffMultiplier(multiplier: number): void {
    this._backoffMultiplier = Math.max(1, multiplier);
  }

  get endpointCount(): number {
    return this._endpoints.size;
  }

  get callCount(): number {
    return this._calls.length;
  }

  callerReport(): Record<string, unknown> {
    return {
      callCount: this._calls.length,
      endpointCount: this._endpoints.size,
      averageLatency: this.averageLatency().toFixed(2),
      latencyP95: this.latencyPercentile(95).toFixed(2),
      latencyP99: this.latencyPercentile(99).toFixed(2),
      successRate: this.successRate().toFixed(4),
      estimatedLambda: this.estimatePoissonLambda().toFixed(4),
      state: this._state,
    };
  }
}
