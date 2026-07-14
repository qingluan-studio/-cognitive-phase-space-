export interface Belief {
  id: string;
  proposition: string;
  truth: number;
  falsity: number;
  evidence: number;
  contradictionIds: string[];
  stability: number;
}

export interface InferredAction {
  fromBeliefIds: string[];
  action: string;
  confidence: number;
  handlesConflict: boolean;
  dialecticalLevel: number;
  tension: number;
}

export class ParaconsistentReasoner {
  private _beliefs: Map<string, Belief> = new Map();
  private _actions: InferredAction[] = [];
  private _tolerance = 0.5;
  private _maxActions = 128;
  private _tensionField: Map<string, number> = new Map();
  private _revisionRate = 0.12;

  addBelief(belief: Belief): void {
    const enriched: Belief = { ...belief, falsity: belief.falsity ?? 1 - belief.truth, stability: belief.stability ?? 1 };
    this._beliefs.set(belief.id, enriched);
    this._propagateTension(belief.id);
  }

  setTolerance(t: number): void { this._tolerance = Math.max(0, Math.min(1, t)); }

  detectContradictions(): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];
    const seen = new Set<string>();
    for (const belief of this._beliefs.values()) {
      for (const contraId of belief.contradictionIds) {
        const pairKey = [belief.id, contraId].sort().join('|');
        if (seen.has(pairKey)) continue;
        const contra = this._beliefs.get(contraId);
        if (!contra) continue;
        if (this._dialetheiaDegree(belief, contra) > this._tolerance) { pairs.push([belief.id, contraId]); seen.add(pairKey); }
      }
    }
    return pairs;
  }

  private _dialetheiaDegree(a: Belief, b: Belief): number {
    const truthOverlap = Math.min(a.truth, b.truth);
    const falsityOverlap = Math.min(a.falsity, b.falsity);
    const evidenceBalance = 1 - Math.abs(a.evidence - b.evidence);
    const explicit = a.contradictionIds.includes(b.id) ? 0.3 : 0;
    return Math.min(1, truthOverlap * 0.3 + falsityOverlap * 0.3 + evidenceBalance * 0.2 + explicit + 0.1);
  }

  infer(): InferredAction[] {
    const contradictions = this.detectContradictions();
    const newActions: InferredAction[] = [];
    const processed = new Set<string>();
    for (const [idA, idB] of contradictions) {
      const pairKey = [idA, idB].sort().join('|');
      if (processed.has(pairKey)) continue;
      processed.add(pairKey);
      const a = this._beliefs.get(idA)!, b = this._beliefs.get(idB)!;
      const tension = this._tensionBetween(a, b);
      const { thesis, antithesis, synthesis, confidence, level } = this._dialecticalSynthesis(a, b);
      newActions.push({
        fromBeliefIds: [idA, idB],
        action: `synthesis_${thesis.slice(0, 8)}_vs_${antithesis.slice(0, 8)}→${synthesis}`,
        confidence, handlesConflict: true, dialecticalLevel: level, tension,
      });
      this._reviseBeliefs(a, b, tension);
    }
    for (const belief of this._beliefs.values()) {
      if (belief.contradictionIds.length > 0 || belief.truth <= 0.6) continue;
      const plausibility = this._plausibility(belief);
      if (plausibility > 0.5) {
        newActions.push({ fromBeliefIds: [belief.id], action: `act_on_${belief.proposition}`, confidence: plausibility, handlesConflict: false, dialecticalLevel: 0, tension: 0 });
      }
    }
    newActions.sort((x, y) => y.confidence - x.confidence);
    this._actions.push(...newActions);
    if (this._actions.length > this._maxActions) this._actions = this._actions.slice(-this._maxActions);
    for (const b of this._beliefs.values()) b.stability = Math.min(1, b.stability + 0.02);
    return newActions;
  }

  private _tensionBetween(a: Belief, b: Belief): number {
    const truthConflict = Math.abs(a.truth - b.truth);
    const evidenceConflict = Math.abs(a.evidence - b.evidence);
    const structural = a.contradictionIds.includes(b.id) ? 0.4 : 0.1;
    const stabilityFactor = 2 - a.stability - b.stability;
    return Math.min(1, (truthConflict * 0.4 + evidenceConflict * 0.3 + structural) * (0.5 + stabilityFactor * 0.5));
  }

  private _dialecticalSynthesis(a: Belief, b: Belief): { thesis: string; antithesis: string; synthesis: string; confidence: number; level: number } {
    const commonGround = this._commonGround(a, b);
    const level = commonGround > 0.7 ? 3 : commonGround > 0.4 ? 2 : 1;
    const baseConfidence = Math.min(a.evidence, b.evidence);
    const tension = this._tensionBetween(a, b);
    const confidence = baseConfidence * (1 - tension * 0.5) * (commonGround * 0.3 + 0.7);
    return { thesis: a.proposition, antithesis: b.proposition, synthesis: `integrated_L${level}`, confidence, level };
  }

  private _commonGround(a: Belief, b: Belief): number {
    const sharedTruth = Math.min(a.truth, b.truth);
    const evidenceOverlap = Math.min(a.evidence, b.evidence) / Math.max(a.evidence, b.evidence, 0.01);
    return sharedTruth * 0.5 + evidenceOverlap * 0.5;
  }

  private _plausibility(belief: Belief): number {
    const truthComponent = belief.truth * (1 - belief.falsity * 0.5);
    return Math.min(1, truthComponent * 0.5 + belief.evidence * 0.35 + belief.stability * 0.15);
  }

  private _reviseBeliefs(a: Belief, b: Belief, tension: number): void {
    const revision = this._revisionRate * tension;
    const convergence = this._commonGround(a, b) * revision * 0.5;
    a.truth = a.truth * (1 - revision) + b.truth * convergence;
    a.falsity = a.falsity * (1 - revision) + b.falsity * convergence;
    b.truth = b.truth * (1 - revision) + a.truth * convergence;
    b.falsity = b.falsity * (1 - revision) + a.falsity * convergence;
    a.stability = Math.min(1, a.stability + revision * 0.3);
    b.stability = Math.min(1, b.stability + revision * 0.3);
    this._beliefs.set(a.id, a);
    this._beliefs.set(b.id, b);
  }

  private _propagateTension(originId: string): void {
    const origin = this._beliefs.get(originId);
    if (!origin) return;
    let currentTension = 0;
    for (const cid of origin.contradictionIds) {
      const contra = this._beliefs.get(cid);
      if (contra) currentTension = Math.max(currentTension, this._tensionBetween(origin, contra));
    }
    this._tensionField.set(originId, currentTension);
  }

  topActions(limit = 5): InferredAction[] { return [...this._actions].sort((a, b) => b.confidence - a.confidence).slice(0, limit); }

  conflictResolutionRate(): number {
    const conflictActions = this._actions.filter(a => a.handlesConflict);
    const totalConflicts = this.detectContradictions().length;
    return totalConflicts === 0 ? 1 : Math.min(1, conflictActions.length / totalConflicts);
  }

  averageConfidence(): number { return this._actions.length === 0 ? 0 : this._actions.reduce((s, a) => s + a.confidence, 0) / this._actions.length; }

  averageTension(): number {
    const values = Array.from(this._tensionField.values());
    return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
  }

  pruneWeakBeliefs(threshold = 0.2): number {
    let removed = 0;
    for (const [id, belief] of this._beliefs) {
      if (this._plausibility(belief) < threshold) {
        this._beliefs.delete(id);
        this._tensionField.delete(id);
        for (const b of this._beliefs.values()) b.contradictionIds = b.contradictionIds.filter(cid => cid !== id);
        removed++;
      }
    }
    return removed;
  }

  reset(): void {
    this._beliefs.clear();
    this._actions = [];
    this._tensionField.clear();
  }

  get beliefCount(): number { return this._beliefs.size; }
  get actionCount(): number { return this._actions.length; }
  get tolerance(): number { return this._tolerance; }
  get systemTension(): number { return this.averageTension(); }
}
