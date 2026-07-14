export interface PrefetchTask {
  id: string;
  predictedIntent: string;
  payload: Record<string, unknown>;
  preparedAt: number;
  confidence: number;
  consumed: boolean;
  contextHash: string;
}

export interface BehaviorTrace {
  intent: string;
  timestamp: number;
  context: Record<string, unknown>;
}

interface NGramKey {
  key: string;
  counts: Map<string, number>;
  total: number;
}

export class AnticipatoryCache {
  private _tasks: Map<string, PrefetchTask> = new Map();
  private _traces: BehaviorTrace[] = [];
  private _transitions: Map<string, Map<string, number>> = new Map();
  private _nGramModels: Map<number, Map<string, NGramKey>> = new Map();
  private _hits = 0;
  private _misses = 0;
  private _maxTasks = 16;
  private _maxTraces = 64;
  private _maxNGram = 3;
  private _decayHalfLife = 30000;
  private _contextVectors: Map<string, number[]> = new Map();
  private _vectorDim = 16;
  private _bayesianPriors: Map<string, number> = new Map();

  constructor() {
    for (let n = 1; n <= this._maxNGram; n++) {
      this._nGramModels.set(n, new Map());
    }
  }

  recordBehavior(trace: BehaviorTrace): void {
    this._traces.push(trace);
    if (this._traces.length > this._maxTraces) this._traces.shift();
    this._updateContextVector(trace.intent, trace.context);

    const now = trace.timestamp;
    this._decayOldTransitions(now);

    if (this._traces.length >= 2) {
      const prev = this._traces[this._traces.length - 2].intent;
      const curr = trace.intent;
      this._updateTransition(prev, curr, now);
    }

    for (let n = 2; n <= this._maxNGram; n++) {
      if (this._traces.length > n) {
        const window = this._traces.slice(-n - 1, -1).map(t => t.intent);
        const next = this._traces[this._traces.length - 1].intent;
        this._updateNGram(window, next);
      }
    }

    const currentCount = this._bayesianPriors.get(trace.intent) ?? 0;
    this._bayesianPriors.set(trace.intent, currentCount + 1);
  }

  private _updateContextVector(intent: string, context: Record<string, unknown>): void {
    const vec = this._contextVectors.get(intent) ?? new Array(this._vectorDim).fill(0);
    const keys = Object.keys(context);
    const hash = this._hashKeys(keys);
    for (let i = 0; i < this._vectorDim; i++) {
      const feature = ((hash >> i) & 1) === 1 ? 1 : -1;
      vec[i] = vec[i] * 0.9 + feature * 0.1;
    }
    this._contextVectors.set(intent, vec);
  }

  private _hashKeys(keys: string[]): number {
    let h = 0;
    for (const k of keys.sort()) {
      for (let i = 0; i < k.length; i++) {
        h = ((h << 5) - h) + k.charCodeAt(i);
        h |= 0;
      }
    }
    return Math.abs(h);
  }

  private _decayOldTransitions(now: number): void {
    const factor = Math.exp(-Math.log(2) * 1000 / this._decayHalfLife);
    if (factor >= 0.99) return;
    for (const inner of this._transitions.values()) {
      for (const [k, v] of inner) {
        const decayed = v * factor;
        if (decayed < 0.01) inner.delete(k);
        else inner.set(k, decayed);
      }
    }
  }

  private _updateTransition(from: string, to: string, _now: number): void {
    if (!this._transitions.has(from)) this._transitions.set(from, new Map());
    const inner = this._transitions.get(from)!;
    inner.set(to, (inner.get(to) ?? 0) + 1);
  }

  private _updateNGram(window: string[], next: string): void {
    const n = window.length;
    const model = this._nGramModels.get(n);
    if (!model) return;
    const key = window.join('|');
    if (!model.has(key)) {
      model.set(key, { key, counts: new Map(), total: 0 });
    }
    const entry = model.get(key)!;
    entry.counts.set(next, (entry.counts.get(next) ?? 0) + 1);
    entry.total++;
  }

  predictNextIntent(currentIntent: string): string | undefined {
    const candidates = this._predictTopK(currentIntent, 1);
    return candidates.length > 0 ? candidates[0].intent : undefined;
  }

  private _predictTopK(currentIntent: string, k: number): Array<{ intent: string; score: number }> {
    const recent = this._traces.slice(-this._maxNGram).map(t => t.intent);
    const scores: Map<string, number> = new Map();

    for (let n = 1; n <= Math.min(recent.length, this._maxNGram); n++) {
      const window = recent.slice(-n);
      const weight = n / this._maxNGram;
      const model = this._nGramModels.get(n);
      if (!model) continue;
      const entry = model.get(window.join('|'));
      if (!entry || entry.total === 0) continue;
      for (const [next, count] of entry.counts) {
        const prob = count / entry.total;
        const prior = this._bayesianPrior(next);
        const bayesian = (prob * prior) / Math.max(0.001, this._bayesianTotal());
        scores.set(next, (scores.get(next) ?? 0) + weight * bayesian);
      }
    }

    const firstOrder = this._transitions.get(currentIntent);
    if (firstOrder) {
      const total = Array.from(firstOrder.values()).reduce((s, v) => s + v, 0);
      if (total > 0) {
        for (const [next, count] of firstOrder) {
          const prob = count / total;
          scores.set(next, (scores.get(next) ?? 0) + 0.3 * prob);
        }
      }
    }

    const sorted = Array.from(scores.entries())
      .map(([intent, score]) => ({ intent, score }))
      .sort((a, b) => b.score - a.score);
    return sorted.slice(0, k);
  }

  private _bayesianPrior(intent: string): number {
    const total = this._bayesianTotal();
    return total === 0 ? 0.5 : ((this._bayesianPriors.get(intent) ?? 0) + 1) / (total + this._bayesianPriors.size);
  }

  private _bayesianTotal(): number {
    let sum = 0;
    for (const v of this._bayesianPriors.values()) sum += v;
    return sum;
  }

  prefetch(intent: string, payload: Record<string, unknown>, confidence: number): PrefetchTask {
    const id = `${intent}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const contextHash = this._contextHash(payload);
    const task: PrefetchTask = {
      id,
      predictedIntent: intent,
      payload,
      preparedAt: Date.now(),
      confidence,
      consumed: false,
      contextHash,
    };
    this._tasks.set(id, task);
    this._evictLowestPriority();
    return task;
  }

  private _contextHash(payload: Record<string, unknown>): string {
    const keys = Object.keys(payload).sort();
    let h = 0;
    for (const k of keys) {
      h = ((h << 5) - h) + k.charCodeAt(0);
      h ^= this._hashString(String(payload[k]));
    }
    return h.toString(36);
  }

  private _hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return h;
  }

  private _evictLowestPriority(): void {
    if (this._tasks.size <= this._maxTasks) return;
    let lowestId = '';
    let lowestScore = Infinity;
    const now = Date.now();
    for (const [id, task] of this._tasks) {
      if (task.consumed) continue;
      const age = now - task.preparedAt;
      const decayed = task.confidence * Math.exp(-age / this._decayHalfLife);
      if (decayed < lowestScore) {
        lowestScore = decayed;
        lowestId = id;
      }
    }
    if (lowestId) this._tasks.delete(lowestId);
  }

  consume(intent: string): PrefetchTask | undefined {
    const candidates = Array.from(this._tasks.values())
      .filter(t => !t.consumed && t.predictedIntent === intent);

    let best: PrefetchTask | undefined;
    let bestScore = -1;
    const now = Date.now();
    for (const t of candidates) {
      const age = now - t.preparedAt;
      const recency = Math.exp(-age / this._decayHalfLife);
      const score = t.confidence * recency;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }

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
    const topK = this._predictTopK(currentIntent, 3);
    let count = 0;
    for (const candidate of topK) {
      if (candidate.score < 0.05) continue;
      this.prefetch(candidate.intent, payloadFactory(candidate.intent), candidate.score);
      count++;
    }
    return count;
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

  contextSimilarity(intentA: string, intentB: string): number {
    const vecA = this._contextVectors.get(intentA) ?? new Array(this._vectorDim).fill(0);
    const vecB = this._contextVectors.get(intentB) ?? new Array(this._vectorDim).fill(0);
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < this._vectorDim; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  getHitRate(): number {
    const total = this._hits + this._misses;
    return total === 0 ? 0 : this._hits / total;
  }

  clearTraces(): void {
    this._traces = [];
  }

  setMaxTasks(n: number): void {
    this._maxTasks = Math.max(1, n);
  }

  setDecayHalfLife(ms: number): void {
    this._decayHalfLife = Math.max(1000, ms);
  }

  get taskCount(): number { return this._tasks.size; }
  get traceCount(): number { return this._traces.length; }
  get hits(): number { return this._hits; }
  get misses(): number { return this._misses; }
  get maxNGram(): number { return this._maxNGram; }
  get decayHalfLife(): number { return this._decayHalfLife; }
}
