/**
 * 预叙预加载器模块：基于对未来状态的预测，
 * 提前计算尚未产生的数据，使处理在数据到达前已就绪。
 */

export interface FutureProjection {
  id: string;
  predictedState: Record<string, unknown>;
  probability: number;
  timeHorizonMs: number;
  computedAt: number;
}

export interface PrecomputedPayload {
  projectionId: string;
  precomputed: Record<string, unknown>;
  matched: boolean;
  matchedAt: number | null;
}

export class ProlepsisPreloader {
  private _projections: Map<string, FutureProjection> = new Map();
  private _precomputed: Map<string, PrecomputedPayload> = new Map();
  private _hitCount = 0;
  private _missCount = 0;
  private _maxProjections = 16;

  project(state: Record<string, unknown>, probability: number, horizonMs: number): FutureProjection {
    const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const projection: FutureProjection = {
      id,
      predictedState: state,
      probability,
      timeHorizonMs: horizonMs,
      computedAt: Date.now(),
    };
    this._projections.set(id, projection);
    if (this._projections.size > this._maxProjections) {
      this._evictWeakest();
    }
    return projection;
  }

  private _evictWeakest(): void {
    let weakest: FutureProjection | undefined;
    for (const p of this._projections.values()) {
      if (!weakest || p.probability < weakest.probability) weakest = p;
    }
    if (weakest) this._projections.delete(weakest.id);
  }

  precompute(projectionId: string, computer: (state: Record<string, unknown>) => Record<string, unknown>): PrecomputedPayload | undefined {
    const projection = this._projections.get(projectionId);
    if (!projection) return undefined;

    const result = computer(projection.predictedState);
    const payload: PrecomputedPayload = {
      projectionId,
      precomputed: result,
      matched: false,
      matchedAt: null,
    };
    this._precomputed.set(projectionId, payload);
    return payload;
  }

  match(actualState: Record<string, unknown>): PrecomputedPayload | undefined {
    let bestMatch: PrecomputedPayload | undefined;
    let bestScore = 0;

    for (const [projId, payload] of this._precomputed) {
      if (payload.matched) continue;
      const projection = this._projections.get(projId);
      if (!projection) continue;
      const score = this._similarity(actualState, projection.predictedState);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = payload;
      }
    }

    if (bestMatch && bestScore > 0.7) {
      bestMatch.matched = true;
      bestMatch.matchedAt = Date.now();
      this._hitCount++;
      return bestMatch;
    }

    this._missCount++;
    return undefined;
  }

  private _similarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));
    const intersection = new Set([...keysA].filter(k => keysB.has(k)));
    const union = new Set([...keysA, ...keysB]);
    if (union.size === 0) return 0;
    let valueMatch = 0;
    for (const k of intersection) {
      if (String(a[k]) === String(b[k])) valueMatch++;
    }
    return (intersection.size / union.size) * 0.5 + (intersection.size === 0 ? 0 : valueMatch / intersection.size) * 0.5;
  }

  precomputeAll(computer: (state: Record<string, unknown>) => Record<string, unknown>): number {
    let count = 0;
    for (const projId of this._projections.keys()) {
      if (!this._precomputed.has(projId)) {
        if (this.precompute(projId, computer)) count++;
      }
    }
    return count;
  }

  hitRate(): number {
    const total = this._hitCount + this._missCount;
    return total === 0 ? 0 : this._hitCount / total;
  }

  purgeExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, projection] of this._projections) {
      if (now - projection.computedAt > projection.timeHorizonMs * 2) {
        this._projections.delete(id);
        this._precomputed.delete(id);
        removed++;
      }
    }
    return removed;
  }

  reset(): void {
    this._projections.clear();
    this._precomputed.clear();
    this._hitCount = 0;
    this._missCount = 0;
  }

  get projectionCount(): number {
    return this._projections.size;
  }

  get precomputedCount(): number {
    return this._precomputed.size;
  }

  get hits(): number {
    return this._hitCount;
  }

  get misses(): number {
    return this._missCount;
  }
}
