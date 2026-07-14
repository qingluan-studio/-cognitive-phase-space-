/**
 * 预动作缓存模块：在用户实际发起操作之前，
 * 基于行为序列预测下一步所需数据并提前加载、预处理。
 */

export interface PrefetchTask {
  id: string;
  predictedIntent: string;
  payload: Record<string, unknown>;
  preparedAt: number;
  confidence: number;
  consumed: boolean;
}

export interface BehaviorTrace {
  intent: string;
  timestamp: number;
  context: Record<string, unknown>;
}

export class AnticipatoryCache {
  private _tasks: Map<string, PrefetchTask> = new Map();
  private _traces: BehaviorTrace[] = [];
  private _transitions: Map<string, Map<string, number>> = new Map();
  private _hits = 0;
  private _misses = 0;
  private _maxTasks = 16;

  recordBehavior(trace: BehaviorTrace): void {
    this._traces.push(trace);
    if (this._traces.length > 64) this._traces.shift();
    if (this._traces.length >= 2) {
      const prev = this._traces[this._traces.length - 2].intent;
      const curr = trace.intent;
      if (!this._transitions.has(prev)) this._transitions.set(prev, new Map());
      const inner = this._transitions.get(prev)!;
      inner.set(curr, (inner.get(curr) ?? 0) + 1);
    }
  }

  predictNextIntent(currentIntent: string): string | undefined {
    const inner = this._transitions.get(currentIntent);
    if (!inner || inner.size === 0) return undefined;
    let best: string | undefined;
    let bestCount = 0;
    for (const [intent, count] of inner) {
      if (count > bestCount) {
        best = intent;
        bestCount = count;
      }
    }
    return best;
  }

  prefetch(intent: string, payload: Record<string, unknown>, confidence: number): PrefetchTask {
    const id = `${intent}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const task: PrefetchTask = {
      id,
      predictedIntent: intent,
      payload,
      preparedAt: Date.now(),
      confidence,
      consumed: false,
    };
    this._tasks.set(id, task);
    if (this._tasks.size > this._maxTasks) {
      const oldest = Array.from(this._tasks.values()).sort((a, b) => a.preparedAt - b.preparedAt)[0];
      if (oldest) this._tasks.delete(oldest.id);
    }
    return task;
  }

  consume(intent: string): PrefetchTask | undefined {
    const candidates = Array.from(this._tasks.values())
      .filter(t => !t.consumed && t.predictedIntent === intent)
      .sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];
    if (best) {
      best.consumed = true;
      this._hits++;
      this._tasks.delete(best.id);
    } else {
      this._misses++;
    }
    return best;
  }

  prewarm(currentIntent: string, payloadFactory: (intent: string) => Record<string, unknown>): number {
    const next = this.predictNextIntent(currentIntent);
    if (!next) return 0;
    const confidence = this._transitionConfidence(currentIntent, next);
    if (confidence < 0.2) return 0;
    this.prefetch(next, payloadFactory(next), confidence);
    return 1;
  }

  private _transitionConfidence(from: string, to: string): number {
    const inner = this._transitions.get(from);
    if (!inner) return 0;
    const total = Array.from(inner.values()).reduce((s, v) => s + v, 0);
    return total === 0 ? 0 : (inner.get(to) ?? 0) / total;
  }

  evictStale(maxAgeMs: number): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, task] of this._tasks) {
      if (now - task.preparedAt > maxAgeMs) {
        this._tasks.delete(id);
        removed++;
      }
    }
    return removed;
  }

  getHitRate(): number {
    const total = this._hits + this._misses;
    return total === 0 ? 0 : this._hits / total;
  }

  clearTraces(): void {
    this._traces = [];
  }

  get taskCount(): number {
    return this._tasks.size;
  }

  get traceCount(): number {
    return this._traces.length;
  }

  get hits(): number {
    return this._hits;
  }

  get misses(): number {
    return this._misses;
  }
}
