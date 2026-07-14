/**
 * 怀疑注入器：向确定性结论注入合理怀疑。
 * 对高置信度的结论有计划地注入怀疑因子，迫使系统保持开放与可证伪性。
 */

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

  register(conclusion: CertainConclusion): void {
    if (conclusion.confidence > this._ceiling) conclusion.confidence = this._ceiling;
    this._conclusions.set(conclusion.id, conclusion);
  }

  inject(conclusionId: string, reason: string): DoubtInjection | null {
    const c = this._conclusions.get(conclusionId);
    if (!c) return null;
    const amount = Math.min(this._maxDoubtPerRound, c.confidence * 0.2);
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
    c.confidence = Math.min(this._ceiling, c.confidence + evidence);
    return c;
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
}
