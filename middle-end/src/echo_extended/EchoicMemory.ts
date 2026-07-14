/**
 * 回声记忆模块：刚发生的事件立即在记忆中产生短暂回响。
 * 用于建模感知缓冲区中的瞬时残留信号。
 */

export interface EchoicTrace {
  id: number;
  stimulus: number;
  strength: number;
  timestamp: number;
}

export type MemoryDecay = {
  halfLife: number;
  currentStrength: number;
  remaining: number;
};

export interface EchoicMemoryConfig {
  capacity: number;
  decayRate: number;
  halfLife: number;
}

export class EchoicMemory {
  private _config: EchoicMemoryConfig;
  private _traces: EchoicTrace[] = [];
  private _nextId: number = 0;
  private _clock: number = 0;
  private _meta: Record<string, unknown> = {};

  constructor(config: EchoicMemoryConfig) {
    this._config = config;
  }

  get traceCount(): number {
    return this._traces.length;
  }

  get clock(): number {
    return this._clock;
  }

  receive(stimulus: number): EchoicTrace {
    const trace: EchoicTrace = {
      id: this._nextId++,
      stimulus,
      strength: 1,
      timestamp: this._clock,
    };
    this._traces.push(trace);
    if (this._traces.length > this._config.capacity) {
      this._traces.shift();
    }
    this._meta.lastReceived = trace.id;
    return trace;
  }

  advance(dt: number): void {
    this._clock += dt;
    for (const trace of this._traces) {
      const age = this._clock - trace.timestamp;
      trace.strength = Math.pow(0.5, age / this._config.halfLife);
    }
    this._traces = this._traces.filter((t) => t.strength > 0.05);
  }

  computeDecay(): MemoryDecay {
    if (this._traces.length === 0) {
      return { halfLife: this._config.halfLife, currentStrength: 0, remaining: 0 };
    }
    const totalStrength = this._traces.reduce((acc, t) => acc + t.strength, 0);
    const current = totalStrength / this._traces.length;
    return {
      halfLife: this._config.halfLife,
      currentStrength: current,
      remaining: this._traces.length,
    };
  }

  retrieve(id: number): EchoicTrace | null {
    return this._traces.find((t) => t.id === id) ?? null;
  }

  strongestTrace(): EchoicTrace | null {
    if (this._traces.length === 0) return null;
    return this._traces.reduce((best, t) => (t.strength > best.strength ? t : best));
  }

  averageStrength(): number {
    if (this._traces.length === 0) return 0;
    return this._traces.reduce((acc, t) => acc + t.strength, 0) / this._traces.length;
  }

  isFading(): boolean {
    return this.averageStrength() < 0.3;
  }

  flush(): void {
    this._traces = [];
    this._meta.flushedAt = this._clock;
  }

  report(): Record<string, unknown> {
    return {
      traceCount: this._traces.length,
      clock: this._clock,
      averageStrength: this.averageStrength(),
      meta: this._meta,
    };
  }
}
