/**
 * 次协调推理器模块：容忍并接受矛盾命题的同时存在，
 * 从矛盾中直接推导出可行动作，而非陷入逻辑爆炸。
 */

export interface Belief {
  id: string;
  proposition: string;
  truth: number;
  evidence: number;
  contradictionIds: string[];
}

export interface InferredAction {
  fromBeliefIds: string[];
  action: string;
  confidence: number;
  handlesConflict: boolean;
}

export class ParaconsistentReasoner {
  private _beliefs: Map<string, Belief> = new Map();
  private _actions: InferredAction[] = [];
  private _tolerance = 0.5;

  addBelief(belief: Belief): void {
    this._beliefs.set(belief.id, belief);
  }

  setTolerance(t: number): void {
    this._tolerance = Math.max(0, Math.min(1, t));
  }

  detectContradictions(): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];
    for (const belief of this._beliefs.values()) {
      for (const contraId of belief.contradictionIds) {
        const contra = this._beliefs.get(contraId);
        if (contra && Math.abs(belief.truth - contra.truth) < this._tolerance) {
          pairs.push([belief.id, contraId]);
        }
      }
    }
    return pairs;
  }

  infer(): InferredAction[] {
    const contradictions = this.detectContradictions();
    const newActions: InferredAction[] = [];

    for (const [idA, idB] of contradictions) {
      const a = this._beliefs.get(idA)!;
      const b = this._beliefs.get(idB)!;
      const confidence = Math.min(a.evidence, b.evidence) * (1 - Math.abs(a.truth - b.truth));
      newActions.push({
        fromBeliefIds: [idA, idB],
        action: `reconcile_${a.proposition}_vs_${b.proposition}`,
        confidence,
        handlesConflict: true,
      });
    }

    const nonConflicting = Array.from(this._beliefs.values())
      .filter(b => b.contradictionIds.length === 0 && b.truth > 0.6);
    for (const belief of nonConflicting) {
      newActions.push({
        fromBeliefIds: [belief.id],
        action: `act_on_${belief.proposition}`,
        confidence: belief.truth * belief.evidence,
        handlesConflict: false,
      });
    }

    this._actions.push(...newActions);
    return newActions;
  }

  topActions(limit = 5): InferredAction[] {
    return [...this._actions]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  conflictResolutionRate(): number {
    const conflictActions = this._actions.filter(a => a.handlesConflict);
    const totalConflicts = this.detectContradictions().length;
    return totalConflicts === 0 ? 1 : conflictActions.length / totalConflicts;
  }

  averageConfidence(): number {
    if (this._actions.length === 0) return 0;
    return this._actions.reduce((s, a) => s + a.confidence, 0) / this._actions.length;
  }

  pruneWeakBeliefs(threshold = 0.2): number {
    let removed = 0;
    for (const [id, belief] of this._beliefs) {
      if (belief.evidence < threshold) {
        this._beliefs.delete(id);
        removed++;
      }
    }
    return removed;
  }

  reset(): void {
    this._beliefs.clear();
    this._actions = [];
  }

  get beliefCount(): number {
    return this._beliefs.size;
  }

  get actionCount(): number {
    return this._actions.length;
  }

  get tolerance(): number {
    return this._tolerance;
  }
}
