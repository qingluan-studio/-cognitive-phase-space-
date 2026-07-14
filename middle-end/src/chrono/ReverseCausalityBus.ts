export interface CausalResult {
  id: string;
  premiseId: string;
  payload: Record<string, unknown>;
  fetchedAt: number;
  matched: boolean;
  confidence: number;
  selfConsistency: number;
}

export interface CausalPremise {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  executedAt: number;
  entropy: number;
}

export type RollbackDelta = {
  premiseId: string;
  reason: string;
  timestamp: number;
  divergence: number;
  entropyIncrease: number;
};

export interface BusSubscriber {
  id: string;
  topic: string;
  onResult: (result: CausalResult) => void;
}

export class ReverseCausalityBus {
  private _results: Map<string, CausalResult> = new Map();
  private _premises: Map<string, CausalPremise> = new Map();
  private _subscribers: Map<string, BusSubscriber> = new Map();
  private _rollbackLog: RollbackDelta[] = [];
  private _paradoxCount: number = 0;
  private _consistencyIndex: number = 1;
  private _totalEntropy: number = 0;
  private _bayesianPrior: number = 0.5;
  private _maxRollbackLog: number = 1024;

  fetchResult(id: string, premiseId: string, payload: Record<string, unknown>): CausalResult {
    const prior = this._computePrior(premiseId);
    const result: CausalResult = {
      id,
      premiseId,
      payload,
      fetchedAt: Date.now(),
      matched: false,
      confidence: prior,
      selfConsistency: this._novikovConsistency(payload, premiseId),
    };
    this._results.set(id, result);
    this._notify(premiseId, result);
    return result;
  }

  executePremise(premise: CausalPremise): boolean {
    premise.entropy = this._shannonEntropy(premise.payload);
    this._premises.set(premise.id, premise);
    let result: CausalResult | undefined;
    for (const r of this._results.values()) {
      if (r.premiseId === premise.id) { result = r; break; }
    }
    if (!result) {
      this._paradoxCount++;
      const div = this._totalEntropy > 0 ? premise.entropy / this._totalEntropy : 1;
      this._pushRollback({ premiseId: premise.id, reason: 'no prefetched result', timestamp: Date.now(), divergence: div, entropyIncrease: premise.entropy });
      this._updateConsistency(0);
      return false;
    }
    const kl = this._kullbackLeiblerDivergence(result.payload, premise.payload);
    const consistency = Math.exp(-kl);
    result.confidence = this._bayesianUpdate(result.confidence, consistency);
    result.selfConsistency = this._novikovConsistency(premise.payload, premise.id);
    if (kl >= 0.05) {
      this._microRollback(result, 'payload mismatch', kl);
      this._updateConsistency(consistency);
      return false;
    }
    result.matched = true;
    this._updateConsistency(1);
    return true;
  }

  subscribe(subscriber: BusSubscriber): void {
    this._subscribers.set(subscriber.id, subscriber);
  }

  unsubscribe(id: string): boolean {
    return this._subscribers.delete(id);
  }

  reconcile(): number {
    let resolved = 0;
    for (const result of this._results.values()) {
      if (!result.matched) {
        const divergence = this._resultDivergence(result);
        this._microRollback(result, 'unresolved at reconcile', divergence);
      } else {
        resolved++;
      }
    }
    return resolved;
  }

  get paradoxCount(): number {
    return this._paradoxCount;
  }

  get consistencyIndex(): number {
    return this._consistencyIndex;
  }

  getRollbackLog(): RollbackDelta[] {
    return [...this._rollbackLog];
  }

  private _microRollback(result: CausalResult, reason: string, divergence: number): void {
    this._paradoxCount++;
    const entropyIncrease = divergence * this._shannonEntropy(result.payload);
    this._totalEntropy += entropyIncrease;
    this._pushRollback({ premiseId: result.premiseId, reason, timestamp: Date.now(), divergence, entropyIncrease });
    result.matched = false;
    result.confidence *= 0.5;
    this._bayesianPrior *= 0.95;
  }

  private _pushRollback(d: RollbackDelta): void {
    this._rollbackLog.unshift(d);
    if (this._rollbackLog.length > this._maxRollbackLog) this._rollbackLog.length = this._maxRollbackLog;
  }

  private _notify(premiseId: string, result: CausalResult): void {
    for (const sub of this._subscribers.values()) {
      if (sub.topic === premiseId) sub.onResult(result);
    }
  }

  private _shannonEntropy(payload: Record<string, unknown>): number {
    const values = Object.values(payload);
    if (values.length === 0) return 0;
    const numeric = values.map(v => typeof v === 'number' ? Math.abs(v) : String(v).length);
    const sum = numeric.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;
    let entropy = 0;
    for (const v of numeric) { const p = v / sum; if (p > 0) entropy -= p * Math.log2(p); }
    return entropy;
  }

  private _kullbackLeiblerDivergence(p: Record<string, unknown>, q: Record<string, unknown>): number {
    const keys = new Set([...Object.keys(p), ...Object.keys(q)]);
    if (keys.size === 0) return 0;
    let div = 0;
    const toN = (v: unknown) => typeof v === 'number' ? Math.abs(v) : typeof v === 'boolean' ? v ? 1 : 0 : String(v ?? '').length;
    for (const key of keys) {
      const pv = toN(p[key]) + 1e-10, qv = toN(q[key]) + 1e-10;
      const total = pv + qv, pp = pv / total, qp = qv / total;
      div += pp * Math.log2(pp / qp);
    }
    return Math.max(0, div / keys.size);
  }

  private _bayesianUpdate(prior: number, likelihood: number): number {
    const evidence = prior * likelihood + (1 - prior) * (1 - likelihood);
    return evidence === 0 ? prior : (prior * likelihood) / evidence;
  }

  private _computePrior(premiseId: string): number {
    let matched = 0, total = 0;
    for (const r of this._results.values()) {
      if (r.premiseId === premiseId) { total++; if (r.matched) matched++; }
    }
    return total === 0 ? this._bayesianPrior : (matched + 1) / (total + 2);
  }

  private _novikovConsistency(payload: Record<string, unknown>, premiseId: string): number {
    const related: CausalResult[] = [];
    for (const r of this._results.values()) {
      if (r.premiseId === premiseId && r.matched) related.push(r);
    }
    if (related.length === 0) return 1;
    let avgDiv = 0;
    for (const r of related) avgDiv += this._kullbackLeiblerDivergence(payload, r.payload);
    return Math.exp(-(avgDiv / related.length) * 2);
  }

  private _resultDivergence(result: CausalResult): number {
    const premise = this._premises.get(result.premiseId);
    return premise ? this._kullbackLeiblerDivergence(result.payload, premise.payload) : 1;
  }

  private _updateConsistency(mq: number): void {
    const a = 0.1;
    this._consistencyIndex = Math.max(0, Math.min(1, a * mq + (1 - a) * this._consistencyIndex));
  }
}
