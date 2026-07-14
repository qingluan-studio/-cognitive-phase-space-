export interface FutureProjection {
  id: string;
  predictedState: Record<string, unknown>;
  probability: number;
  timeHorizonMs: number;
  computedAt: number;
  priorProbability: number;
}

export interface PrecomputedPayload {
  projectionId: string;
  precomputed: Record<string, unknown>;
  matched: boolean;
  matchedAt: number | null;
  bayesianScore: number;
}

export class ProlepsisPreloader {
  private _projections: Map<string, FutureProjection> = new Map();
  private _precomputed: Map<string, PrecomputedPayload> = new Map();
  private _hitCount = 0;
  private _missCount = 0;
  private _maxProjections = 16;
  private _transitionMatrix: Map<string, Map<string, number>> = new Map();
  private _stateHistory: string[] = [];
  private _maxHistory = 50;
  private _likelihoodAlpha = 0.7;

  project(state: Record<string, unknown>, probability: number, horizonMs: number): FutureProjection {
    const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const stateSig = this._stateSignature(state);
    const prior = this._computePrior(stateSig);
    const adjustedProb = this._bayesianUpdate(probability, prior);

    const projection: FutureProjection = {
      id, predictedState: state, probability: adjustedProb,
      timeHorizonMs: horizonMs, computedAt: Date.now(), priorProbability: prior,
    };

    this._projections.set(id, projection);
    if (this._projections.size > this._maxProjections) this._evictWeakest();
    return projection;
  }

  private _stateSignature(state: Record<string, unknown>): string {
    return Object.keys(state).sort().map(k => `${k}:${String(state[k]).slice(0, 20)}`).join('|');
  }

  private _computePrior(stateSig: string): number {
    if (this._stateHistory.length === 0) return 0.5;
    const occurrences = this._stateHistory.filter(s => s === stateSig).length;
    return Math.min(0.9, (occurrences + 1) / (this._stateHistory.length + 2));
  }

  private _bayesianUpdate(likelihood: number, prior: number): number {
    const marginal = likelihood * prior + (1 - this._likelihoodAlpha) * (1 - prior);
    return marginal === 0 ? prior : (likelihood * prior) / marginal;
  }

  private _evictWeakest(): void {
    let weakest: FutureProjection | undefined;
    for (const p of this._projections.values()) {
      if (!weakest || p.probability < weakest.probability) weakest = p;
    }
    if (weakest) {
      this._projections.delete(weakest.id);
      this._precomputed.delete(weakest.id);
    }
  }

  precompute(projectionId: string, computer: (state: Record<string, unknown>) => Record<string, unknown>): PrecomputedPayload | undefined {
    const projection = this._projections.get(projectionId);
    if (!projection) return undefined;

    const result = computer(projection.predictedState);
    const bayesianScore = projection.probability * this._timeDecay(projection);
    const payload: PrecomputedPayload = {
      projectionId, precomputed: result,
      matched: false, matchedAt: null, bayesianScore,
    };
    this._precomputed.set(projectionId, payload);
    return payload;
  }

  private _timeDecay(projection: FutureProjection): number {
    const elapsed = Date.now() - projection.computedAt;
    const halfLife = projection.timeHorizonMs / 2;
    return Math.exp(-elapsed * Math.log(2) / Math.max(1, halfLife));
  }

  match(actualState: Record<string, unknown>): PrecomputedPayload | undefined {
    let bestMatch: PrecomputedPayload | undefined;
    let bestScore = 0;

    const actualSig = this._stateSignature(actualState);
    this._updateTransitionMatrix(actualSig);

    for (const [projId, payload] of this._precomputed) {
      if (payload.matched) continue;
      const projection = this._projections.get(projId);
      if (!projection) continue;
      const score = this._similarity(actualState, projection.predictedState) * payload.bayesianScore;
      if (score > bestScore) { bestScore = score; bestMatch = payload; }
    }

    if (bestMatch && bestScore > 0.5) {
      bestMatch.matched = true;
      bestMatch.matchedAt = Date.now();
      this._hitCount++;
      this._updateStateHistory(actualSig);
      return bestMatch;
    }

    this._missCount++;
    this._updateStateHistory(actualSig);
    return undefined;
  }

  private _similarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));
    const intersection = new Set([...keysA].filter(k => keysB.has(k)));
    const union = new Set([...keysA, ...keysB]);
    if (union.size === 0) return 0;
    let valueMatch = 0;
    for (const k of intersection) if (String(a[k]) === String(b[k])) valueMatch++;
    const structSim = intersection.size / union.size;
    const valSim = intersection.size === 0 ? 0 : valueMatch / intersection.size;
    return structSim * 0.4 + valSim * 0.6;
  }

  private _updateTransitionMatrix(currentSig: string): void {
    if (this._stateHistory.length > 0) {
      const prevSig = this._stateHistory[this._stateHistory.length - 1];
      if (!this._transitionMatrix.has(prevSig)) this._transitionMatrix.set(prevSig, new Map());
      const transitions = this._transitionMatrix.get(prevSig)!;
      transitions.set(currentSig, (transitions.get(currentSig) ?? 0) + 1);
    }
  }

  private _updateStateHistory(sig: string): void {
    this._stateHistory.push(sig);
    if (this._stateHistory.length > this._maxHistory) this._stateHistory.shift();
  }

  precomputeAll(computer: (state: Record<string, unknown>) => Record<string, unknown>): number {
    let count = 0;
    for (const projId of this._projections.keys()) {
      if (!this._precomputed.has(projId) && this.precompute(projId, computer)) count++;
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

  markovPredict(state: Record<string, unknown>): { nextState: string; probability: number } | null {
    const sig = this._stateSignature(state);
    const transitions = this._transitionMatrix.get(sig);
    if (!transitions || transitions.size === 0) return null;
    let total = 0, bestNext = '', bestProb = 0;
    for (const [, count] of transitions) total += count;
    for (const [next, count] of transitions) {
      const prob = count / total;
      if (prob > bestProb) { bestProb = prob; bestNext = next; }
    }
    return { nextState: bestNext, probability: bestProb };
  }

  reset(): void {
    this._projections.clear();
    this._precomputed.clear();
    this._hitCount = 0;
    this._missCount = 0;
    this._transitionMatrix.clear();
    this._stateHistory = [];
  }

  get projectionCount(): number { return this._projections.size; }
  get precomputedCount(): number { return this._precomputed.size; }
  get hits(): number { return this._hitCount; }
  get misses(): number { return this._missCount; }
  get markovOrder(): number { return this._transitionMatrix.size; }
}
