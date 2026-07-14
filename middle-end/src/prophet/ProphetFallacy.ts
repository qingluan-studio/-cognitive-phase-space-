export interface ProphetFallacyData {
  prophecies: number;
  selfDefeated: number;
  accuracy: number;
  paradoxCoefficient: number;
  interventionRate: number;
}

export interface Prophecy {
  id: string;
  forecast: string;
  intervened: boolean;
  materialized: boolean;
  baseProbability: number;
  postInterventionProbability: number;
}

interface _CausalChain {
  prophecyId: string;
  interventionId: string;
  effectMagnitude: number;
}

export class ProphetFallacy {
  private _prophecies: Map<string, Prophecy>;
  private _interventions: number;
  private _causalChains: _CausalChain[];
  private _observerEffect: number;

  constructor(observerEffect: number = 0.5) {
    this._prophecies = new Map<string, Prophecy>();
    this._interventions = 0;
    this._causalChains = [];
    this._observerEffect = observerEffect;
  }

  get prophecyCount(): number {
    return this._prophecies.size;
  }

  get accuracy(): number {
    if (this._prophecies.size === 0) return 0;
    let correct = 0;
    for (const p of this._prophecies.values()) {
      if (p.materialized) correct += 1;
    }
    return correct / this._prophecies.size;
  }

  get interventionRate(): number {
    if (this._prophecies.size === 0) return 0;
    return this._interventions / this._prophecies.size;
  }

  get paradoxCoefficient(): number {
    if (this._prophecies.size === 0) return 0;
    let acc = 0;
    let count = 0;
    for (const p of this._prophecies.values()) {
      if (p.intervened) {
        const delta = p.baseProbability - p.postInterventionProbability;
        acc += Math.abs(delta);
        count += 1;
      }
    }
    return count === 0 ? 0 : acc / count;
  }

  public prophesy(id: string, forecast: string, baseProbability: number = 0.7): Prophecy {
    const p: Prophecy = {
      id,
      forecast,
      intervened: false,
      materialized: false,
      baseProbability: Math.max(0, Math.min(1, baseProbability)),
      postInterventionProbability: baseProbability,
    };
    this._prophecies.set(id, p);
    return p;
  }

  public intervene(id: string, interventionId: string, effectMagnitude: number = 0.5): boolean {
    const p = this._prophecies.get(id);
    if (!p || p.intervened) return false;
    p.intervened = true;
    this._interventions += 1;
    p.postInterventionProbability = Math.max(0, Math.min(1, p.baseProbability * (1 - this._observerEffect * effectMagnitude)));
    p.materialized = false;
    this._causalChains.push({
      prophecyId: id,
      interventionId,
      effectMagnitude,
    });
    return true;
  }

  public fulfill(id: string): boolean {
    const p = this._prophecies.get(id);
    if (!p) return false;
    const effectiveProbability = p.intervened ? p.postInterventionProbability : p.baseProbability;
    p.materialized = Math.random() < effectiveProbability;
    return p.materialized;
  }

  public fulfillDeterministic(id: string, outcome: boolean): boolean {
    const p = this._prophecies.get(id);
    if (!p) return false;
    p.materialized = outcome;
    return true;
  }

  public selfDefeated(): number {
    let n = 0;
    for (const p of this._prophecies.values()) {
      if (p.intervened && !p.materialized) n += 1;
    }
    return n;
  }

  public selfFulfillingCount(): number {
    let n = 0;
    for (const p of this._prophecies.values()) {
      if (p.intervened && p.materialized) n += 1;
    }
    return n;
  }

  public cascadeImpact(interventionId: string): string[] {
    const affected: string[] = [];
    for (const chain of this._causalChains) {
      if (chain.interventionId === interventionId) affected.push(chain.prophecyId);
    }
    return affected;
  }

  public counterfactual(id: string): number {
    const p = this._prophecies.get(id);
    if (!p) return 0;
    if (!p.intervened) return p.baseProbability;
    return p.baseProbability - p.postInterventionProbability;
  }

  public archive(): Prophecy[] {
    return Array.from(this._prophecies.values());
  }

  public report(): ProphetFallacyData {
    return {
      prophecies: this._prophecies.size,
      selfDefeated: this.selfDefeated(),
      accuracy: this.accuracy,
      paradoxCoefficient: this.paradoxCoefficient,
      interventionRate: this.interventionRate,
    };
  }
}
