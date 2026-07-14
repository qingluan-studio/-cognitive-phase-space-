export interface PendingReply {
  id: number;
  input: number;
  scheduledTime: number;
  delivered: boolean;
}

export type DeliveryResult = {
  delivered: number;
  remaining: number;
  avgDelay: number;
};

export interface DelayedReplyConfig {
  baseDelay: number;
  jitter: number;
  maxPending: number;
}

export class DelayedReply {
  private _config: DelayedReplyConfig;
  private _pending: PendingReply[] = [];
  private _delivered: PendingReply[] = [];
  private _clock: number = 0;
  private _nextId: number = 0;
  private _state: Record<string, unknown> = {};
  private _arrivalProcess: number[] = [];
  private _serviceRate: number = 1;
  private _queueLengthHistory: number[] = [];

  constructor(config: DelayedReplyConfig) {
    this._config = config;
  }

  get pendingCount(): number {
    return this._pending.length;
  }

  get deliveredCount(): number {
    return this._delivered.length;
  }

  get clock(): number {
    return this._clock;
  }

  get averageQueueLength(): number {
    if (this._queueLengthHistory.length === 0) return 0;
    return this._queueLengthHistory.reduce((a, b) => a + b, 0) / this._queueLengthHistory.length;
  }

  private _poissonArrival(lambda: number): boolean {
    return Math.random() < 1 - Math.exp(-lambda);
  }

  private _exponentialService(): number {
    return -Math.log(1 - Math.random()) / this._serviceRate;
  }

  receive(input: number): PendingReply {
    const jitter = (Math.random() - 0.5) * this._config.jitter;
    const serviceTime = this._exponentialService();
    const scheduledTime = this._clock + this._config.baseDelay + jitter + serviceTime;
    const reply: PendingReply = {
      id: this._nextId++,
      input,
      scheduledTime,
      delivered: false,
    };
    this._pending.push(reply);
    if (this._pending.length > this._config.maxPending) {
      this._pending.shift();
    }
    this._arrivalProcess.push(this._clock);
    if (this._arrivalProcess.length > 50) this._arrivalProcess.shift();
    return reply;
  }

  tick(dt: number): DeliveryResult {
    this._clock += dt;
    const ready = this._pending.filter((p) => p.scheduledTime <= this._clock);
    for (const r of ready) {
      r.delivered = true;
      this._delivered.push(r);
    }
    this._pending = this._pending.filter((p) => !p.delivered);
    if (this._delivered.length > 100) this._delivered.splice(0, this._delivered.length - 100);
    const delivered = ready.length;
    const delays = ready.map((r) => r.scheduledTime - (this._clock - dt));
    const avgDelay = delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;
    this._queueLengthHistory.push(this._pending.length);
    if (this._queueLengthHistory.length > 50) this._queueLengthHistory.shift();
    this._state.lastTick = { delivered, remaining: this._pending.length };
    return { delivered, remaining: this._pending.length, avgDelay };
  }

  cancel(id: number): boolean {
    const idx = this._pending.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this._pending.splice(idx, 1);
    return true;
  }

  flushAll(): number {
    const count = this._pending.length;
    for (const p of this._pending) {
      p.delivered = true;
      p.scheduledTime = this._clock;
      this._delivered.push(p);
    }
    this._pending = [];
    return count;
  }

  averageDelay(): number {
    if (this._delivered.length === 0) return 0;
    const sum = this._delivered.reduce((acc, p) => acc + this._config.baseDelay, 0);
    return sum / this._delivered.length;
  }

  isBacklogged(): boolean {
    return this._pending.length >= this._config.maxPending * 0.8;
  }

  computeTrafficIntensity(): number {
    if (this._arrivalProcess.length < 2) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < this._arrivalProcess.length; i++) {
      intervals.push(this._arrivalProcess[i] - this._arrivalProcess[i - 1]);
    }
    const avgInterArrival = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return avgInterArrival > 0 ? (1 / this._serviceRate) / avgInterArrival : 0;
  }

  report(): Record<string, unknown> {
    return {
      pending: this._pending.length,
      delivered: this._delivered.length,
      clock: this._clock,
      state: this._state,
      averageQueueLength: this.averageQueueLength.toFixed(3),
      trafficIntensity: this.computeTrafficIntensity().toFixed(4),
    };
  }
}
