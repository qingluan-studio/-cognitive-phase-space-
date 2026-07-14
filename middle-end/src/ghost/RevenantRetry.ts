export interface RetryAttempt {
  id: number;
  taskId: string;
  attemptNumber: number;
  success: boolean;
  delayMs: number;
  timestamp: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

export class RevenantRetry {
  private _policy: RetryPolicy;
  private _attempts: RetryAttempt[] = [];
  private _nextId: number = 0;
  private _state: Record<string, unknown> = {};
  private _markovState: number = 0;
  private _transitionMatrix: number[][] = [[0.6, 0.4], [0.3, 0.7]];
  private _delayEntropy: number = 0;
  private _intervalDistribution: Map<number, number> = new Map();

  constructor(policy: RetryPolicy) {
    this._policy = { ...policy };
  }

  get attemptCount(): number {
    return this._attempts.length;
  }

  get successRate(): number {
    const successes = this._attempts.filter(a => a.success).length;
    return this._attempts.length > 0 ? successes / this._attempts.length : 0;
  }

  get delayEntropy(): number {
    return this._delayEntropy;
  }

  private _advanceMarkov(): number {
    const row = this._transitionMatrix[this._markovState];
    const roll = Math.random();
    return roll < row[0] ? 0 : 1;
  }

  private _computeDelay(attemptNumber: number): number {
    const exponential = this._policy.baseDelayMs * Math.pow(this._policy.backoffMultiplier, attemptNumber - 1);
    const clamped = Math.min(exponential, this._policy.maxDelayMs);
    const jitter = clamped * this._policy.jitterFactor * (Math.random() - 0.5) * 2;
    return Math.max(0, Math.floor(clamped + jitter));
  }

  attempt(taskId: string, attemptNumber: number, success: boolean): RetryAttempt {
    const delay = this._computeDelay(attemptNumber);
    const attempt: RetryAttempt = {
      id: this._nextId++,
      taskId,
      attemptNumber,
      success,
      delayMs: delay,
      timestamp: Date.now(),
    };
    this._attempts.push(attempt);
    if (this._attempts.length > 200) this._attempts.shift();
    this._markovState = this._advanceMarkov();
    this._intervalDistribution.set(delay, (this._intervalDistribution.get(delay) ?? 0) + 1);
    this._updateDelayEntropy();
    return attempt;
  }

  private _updateDelayEntropy(): void {
    const total = Array.from(this._intervalDistribution.values()).reduce((a, b) => a + b, 0);
    if (total === 0) {
      this._delayEntropy = 0;
      return;
    }
    let entropy = 0;
    for (const count of this._intervalDistribution.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._delayEntropy = entropy;
  }

  shouldRetry(attemptNumber: number): boolean {
    return attemptNumber < this._policy.maxAttempts;
  }

  getAttemptsForTask(taskId: string): RetryAttempt[] {
    return this._attempts.filter(a => a.taskId === taskId);
  }

  averageDelay(): number {
    if (this._attempts.length === 0) return 0;
    return this._attempts.reduce((acc, a) => acc + a.delayMs, 0) / this._attempts.length;
  }

  maxDelayObserved(): number {
    if (this._attempts.length === 0) return 0;
    return Math.max(...this._attempts.map(a => a.delayMs));
  }

  getRecentAttempts(limit: number = 50): RetryAttempt[] {
    return this._attempts.slice(-limit);
  }

  setPolicy(policy: Partial<RetryPolicy>): void {
    this._policy = { ...this._policy, ...policy };
  }

  computeExpectedRetries(): number {
    const p = 1 - this.successRate;
    if (p >= 1) return this._policy.maxAttempts;
    return p / (1 - p);
  }

  resetAttempts(taskId: string): void {
    this._attempts = this._attempts.filter(a => a.taskId !== taskId);
    this._updateDelayEntropy();
  }

  retryReport(): Record<string, unknown> {
    return {
      attemptCount: this._attempts.length,
      successRate: this.successRate.toFixed(4),
      averageDelay: this.averageDelay().toFixed(2),
      maxDelayObserved: this.maxDelayObserved(),
      delayEntropy: this._delayEntropy.toFixed(4),
      expectedRetries: this.computeExpectedRetries().toFixed(3),
      policy: this._policy,
      state: this._state,
    };
  }
}
