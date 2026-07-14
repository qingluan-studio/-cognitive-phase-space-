/**
 * 延迟回复模块：接收到输入后等待一段时间再给出回复。
 * 用于建模系统中具有显著延迟的响应路径。
 */

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

  receive(input: number): PendingReply {
    const jitter = (Math.random() - 0.5) * this._config.jitter;
    const scheduledTime = this._clock + this._config.baseDelay + jitter;
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

  report(): Record<string, unknown> {
    return {
      pending: this._pending.length,
      delivered: this._delivered.length,
      clock: this._clock,
      state: this._state,
    };
  }
}
