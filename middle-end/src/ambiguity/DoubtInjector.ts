export interface CertainConclusion {
  id: string;
  statement: string;
  confidence: number;
  injectedDoubt: number;
}

export interface DoubtInjection {
  conclusionId: string;
  doubtAmount: number;
  reason: string;
  injectedAt: number;
}

export class DoubtInjector {
  private _conclusions: Map<string, CertainConclusion> = new Map();
  private _injections: DoubtInjection[] = [];
  private _ceiling = 0.95;
  private _maxDoubtPerRound = 0.3;
  private _bayesianPriors: Map<string, number> = new Map();
  private _evidenceMatrix: Map<string, number[]> = new Map();

  register(conclusion: CertainConclusion): void {
    if (conclusion.confidence > this._ceiling) conclusion.confidence = this._ceiling;
    this._conclusions.set(conclusion.id, conclusion);
    this._bayesianPriors.set(conclusion.id, conclusion.confidence);
    this._evidenceMatrix.set(conclusion.id, []);
  }

  inject(conclusionId: string, reason: string): DoubtInjection | null {
    const c = this._conclusions.get(conclusionId);
    if (!c) return null;
    const evidence = this._evidenceMatrix.get(conclusionId) ?? [];
    const posterior = this._computePosterior(c.confidence, evidence);
    const amount = Math.min(this._maxDoubtPerRound, Math.abs(c.confidence - posterior));
    c.confidence = Math.max(0, c.confidence - amount);
    c.injectedDoubt += amount;
    const injection: DoubtInjection = {
      conclusionId,
      doubtAmount: amount,
      reason,
      injectedAt: Date.now(),
    };
    this._injections.push(injection);
    if (this._injections.length > 200) this._injections.shift();
    return injection;
  }

  sweep(): DoubtInjection[] {
    const results: DoubtInjection[] = [];
    for (const c of this._conclusions.values()) {
      if (c.confidence >= this._ceiling - 0.01) {
        const inj = this.inject(c.id, '自动扫荡高置信度结论');
        if (inj) results.push(inj);
      }
    }
    return results;
  }

  restoreConfidence(conclusionId: string, evidence: number): CertainConclusion | null {
    const c = this._conclusions.get(conclusionId);
    if (!c) return null;
    const evidences = this._evidenceMatrix.get(conclusionId) ?? [];
    evidences.push(evidence);
    this._evidenceMatrix.set(conclusionId, evidences);
    c.confidence = Math.min(this._ceiling, c.confidence + evidence);
    return c;
  }

  computeDoubtEntropy(): number {
    const doubts = Array.from(this._conclusions.values()).map(c => c.injectedDoubt);
    if (doubts.length === 0) return 0;
    const mean = doubts.reduce((a, b) => a + b, 0) / doubts.length;
    const variance = doubts.reduce((s, v) => s + (v - mean) ** 2, 0) / doubts.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  setCeiing(value: number): void {
    this._ceiling = Math.max(0.5, Math.min(1, value));
  }

  getConclusion(id: string): CertainConclusion | null {
    return this._conclusions.get(id) ?? null;
  }

  getInjections(limit: number = 50): DoubtInjection[] {
    return this._injections.slice(-limit);
  }

  get conclusionCount(): number {
    return this._conclusions.size;
  }

  private _computePosterior(prior: number, evidence: number[]): number {
    const logPrior = Math.log(prior + 1e-10);
    const logLikelihood = evidence.reduce((s, e) => s + Math.log(1 - e + 1e-10), 0);
    const logPosterior = logPrior + logLikelihood;
    return Math.max(0, Math.min(1, Math.exp(logPosterior)));
  }
}
