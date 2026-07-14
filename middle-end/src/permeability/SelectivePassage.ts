export interface PassageCriteria {
  weight: number;
  threshold: number;
  priority: number;
  invert: boolean;
}

export interface PassageRecord {
  id: string;
  payload: Record<string, unknown>;
  score: number;
  allowed: boolean;
  informationGain: number;
}

export class SelectivePassage {
  private _criteria: Map<string, PassageCriteria> = new Map();
  private _records: PassageRecord[] = [];
  private _state: Record<string, unknown> = {};
  private _bayesianPrior: number = 0.5;

  constructor() {}

  get criteriaCount(): number {
    return this._criteria.size;
  }

  get recordCount(): number {
    return this._records.length;
  }

  addCriterion(name: string, weight: number, threshold: number, priority: number = 1, invert: boolean = false): void {
    this._criteria.set(name, { weight, threshold, priority, invert });
  }

  evaluate(id: string, payload: Record<string, unknown>): PassageRecord {
    let score = 0;
    let totalWeight = 0;
    let allowedCount = 0;
    let totalCriteria = 0;
    for (const [name, criterion] of this._criteria) {
      const value = payload[name] as number ?? 0;
      const passes = criterion.invert ? value < criterion.threshold : value >= criterion.threshold;
      const weighted = passes ? criterion.weight * criterion.priority : 0;
      score += weighted;
      totalWeight += criterion.weight * criterion.priority;
      if (passes) allowedCount++;
      totalCriteria++;
    }
    const normalizedScore = totalWeight > 0 ? score / totalWeight : 0;
    const likelihood = allowedCount / (totalCriteria || 1);
    const posterior = (likelihood * this._bayesianPrior) / ((likelihood * this._bayesianPrior) + (1 - likelihood) * (1 - this._bayesianPrior) + 1e-10);
    const allowed = posterior > 0.6;
    const informationGain = -Math.log2(posterior + 1e-10);
    const record: PassageRecord = { id, payload: { ...payload }, score: normalizedScore, allowed, informationGain };
    this._records.push(record);
    if (this._records.length > 50) this._records.shift();
    this._bayesianPrior = 0.9 * this._bayesianPrior + 0.1 * posterior;
    return record;
  }

  filterPayloads(payloads: Record<string, unknown>[]): PassageRecord[] {
    return payloads.map((p, i) => this.evaluate(`auto_${i}`, p));
  }

  topPassages(limit: number): PassageRecord[] {
    return [...this._records].sort((a, b) => b.score - a.score).slice(0, limit);
  }

  bottomPassages(limit: number): PassageRecord[] {
    return [...this._records].sort((a, b) => a.score - b.score).slice(0, limit);
  }

  averageScore(): number {
    if (this._records.length === 0) return 0;
    return this._records.reduce((s, r) => s + r.score, 0) / this._records.length;
  }

  passageEntropy(): number {
    const allowed = this._records.filter((r) => r.allowed).length;
    const p = allowed / (this._records.length || 1);
    if (p === 0 || p === 1) return 0;
    return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
  }

  anpWeights(): Record<string, number> {
    const result: Record<string, number> = {};
    let total = 0;
    for (const [name, criterion] of this._criteria) {
      const w = criterion.weight * criterion.priority;
      result[name] = w;
      total += w;
    }
    for (const name of Object.keys(result)) {
      result[name] = total > 0 ? result[name] / total : 0;
    }
    return result;
  }

  updateCriterion(name: string, delta: number): void {
    const c = this._criteria.get(name);
    if (c) c.weight = Math.max(0, Math.min(1, c.weight + delta));
  }

  clearCriteria(): void {
    this._criteria.clear();
    this._bayesianPrior = 0.5;
  }

  criteriaRedundancy(): number {
    return Array.from(this._criteria.values()).filter((c) => c.weight < 0.1).length;
  }

  report(): Record<string, unknown> {
    return {
      criteria: this._criteria.size,
      records: this._records.length,
      averageScore: this.averageScore(),
      passageEntropy: this.passageEntropy(),
      state: this._state,
    };
  }
}
