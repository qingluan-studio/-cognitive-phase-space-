export interface PendingDecision {
  id: string;
  description: string;
  options: Record<string, unknown>[];
  infoMass: number;
  deferredAt: number;
  decided: boolean;
  resolution: Record<string, unknown> | null;
  optionWeights: number[];
  preferenceVector: number[];
  percolationProb: number;
}

export type ProcrastinationState = 'idle' | 'waiting' | 'critical' | 'forced';

export interface DecisionReport {
  id: string;
  resolved: boolean;
  finalInfoMass: number;
  waitedMs: number;
  entropyBefore: number;
  entropyAfter: number;
}

export class ProcrastinationCore {
  private _pending: Map<string, PendingDecision> = new Map();
  private _threshold: number = 1.0;
  private _state: ProcrastinationState = 'idle';
  private _totalDeferred: number = 0;
  private _totalResolved: number = 0;
  private _discountRate: number = 0.05;
  private _inhibitionStrength: number = 0.3;
  private _percolationThreshold: number = 0.59;

  defer(id: string, description: string, options: Record<string, unknown>[]): PendingDecision {
    const n = options.length;
    const decision: PendingDecision = {
      id,
      description,
      options,
      infoMass: 0,
      deferredAt: Date.now(),
      decided: false,
      resolution: null,
      optionWeights: new Array(n).fill(1 / Math.max(1, n)),
      preferenceVector: new Array(n).fill(0),
      percolationProb: 0,
    };
    this._pending.set(id, decision);
    this._totalDeferred++;
    this._state = this._pending.size > 0 ? 'waiting' : 'idle';
    return decision;
  }

  accumulate(decisionId: string, infoDelta: number): number {
    const decision = this._pending.get(decisionId);
    if (!decision) return 0;
    decision.infoMass += infoDelta;
    this._updatePreferenceVector(decision, infoDelta);
    this._updatePercolation(decision);
    const p = decision.percolationProb;
    if (p >= this._percolationThreshold) this._state = 'critical';
    return decision.infoMass;
  }

  evaluate(): string[] {
    const ready: string[] = [];
    for (const decision of this._pending.values()) {
      if (!decision.decided && decision.percolationProb >= this._percolationThreshold) {
        ready.push(decision.id);
      }
    }
    return ready;
  }

  decide(decisionId: string): DecisionReport {
    const decision = this._pending.get(decisionId);
    if (!decision) {
      return { id: decisionId, resolved: false, finalInfoMass: 0, waitedMs: 0, entropyBefore: 0, entropyAfter: 0 };
    }
    const entropyBefore = this._shannonEntropy(decision.optionWeights);
    decision.decided = true;
    const bestIdx = this._argmax(decision.preferenceVector);
    decision.resolution = decision.options[bestIdx] ?? { deferred: true, note: 'insufficient options' };
    const entropyAfter = this._shannonEntropy(decision.optionWeights);
    this._totalResolved++;
    if (this._pending.size === 0) this._state = 'idle';
    return {
      id: decisionId,
      resolved: true,
      finalInfoMass: decision.infoMass,
      waitedMs: Date.now() - decision.deferredAt,
      entropyBefore,
      entropyAfter,
    };
  }

  forceDecide(decisionId: string): DecisionReport {
    this._state = 'forced';
    const decision = this._pending.get(decisionId);
    if (!decision) {
      return { id: decisionId, resolved: false, finalInfoMass: 0, waitedMs: 0, entropyBefore: 0, entropyAfter: 0 };
    }
    decision.infoMass = this._threshold;
    decision.percolationProb = 1;
    return this.decide(decisionId);
  }

  get pendingCount(): number {
    return this._pending.size;
  }

  get state(): ProcrastinationState {
    return this._state;
  }

  getStats(): { deferred: number; resolved: number; threshold: number; percolationThreshold: number } {
    return {
      deferred: this._totalDeferred,
      resolved: this._totalResolved,
      threshold: this._threshold,
      percolationThreshold: this._percolationThreshold,
    };
  }

  private _updatePreferenceVector(decision: PendingDecision, infoDelta: number): void {
    const n = decision.options.length;
    if (n === 0) return;
    const noise = infoDelta * (Math.random() - 0.5) * 0.2;
    for (let i = 0; i < n; i++) {
      const drift = infoDelta * (Math.random() - 0.3) / n;
      decision.preferenceVector[i] += drift + noise;
      decision.preferenceVector[i] = Math.max(0, decision.preferenceVector[i]);
    }
    let inhibition = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) inhibition += decision.preferenceVector[j];
      }
      decision.preferenceVector[i] -= this._inhibitionStrength * inhibition / n;
      decision.preferenceVector[i] = Math.max(0, decision.preferenceVector[i]);
    }
    const total = decision.preferenceVector.reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (let i = 0; i < n; i++) decision.optionWeights[i] = decision.preferenceVector[i] / total;
    }
  }

  private _updatePercolation(decision: PendingDecision): void {
    const p = Math.min(1, decision.infoMass / this._threshold);
    const sites = decision.options.length;
    if (sites === 0) {
      decision.percolationProb = 0;
      return;
    }
    const pc = this._percolationThreshold;
    const beta = 0.4;
    if (p >= pc) {
      decision.percolationProb = Math.min(1, Math.pow((p - pc) / (1 - pc), beta));
    } else {
      decision.percolationProb = 0;
    }
  }

  private _shannonEntropy(weights: number[]): number {
    if (weights.length === 0) return 0;
    let entropy = 0;
    for (const w of weights) {
      if (w > 0) entropy -= w * Math.log2(w);
    }
    return entropy;
  }

  private _argmax(arr: number[]): number {
    if (arr.length === 0) return 0;
    let maxIdx = 0;
    let maxVal = arr[0];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > maxVal) {
        maxVal = arr[i];
        maxIdx = i;
      }
    }
    return maxIdx;
  }

  private _hyperbolicDiscount(decision: PendingDecision): number {
    const waitedSec = (Date.now() - decision.deferredAt) / 1000;
    return 1 / (1 + this._discountRate * waitedSec);
  }
}
