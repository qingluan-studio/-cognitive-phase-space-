import { DataPacket } from '../shared/types';

/** A privacy-preserving technique. */
export interface PrivacyTechnique {
  readonly type: 'differential-privacy' | 'k-anonymity' | 'l-diversity' | 'homomorphic' | 'federated' | 'synthetic';
  readonly guarantee: string;
  readonly parameters: Record<string, number>;
}

/** A privacy budget for differential privacy. */
export interface PrivacyBudget {
  readonly epsilon: number;
  readonly delta: number;
  readonly spent: number;
  readonly remaining: number;
}

/** A data sanitizer configuration. */
export interface DataSanitizer {
  readonly method: string;
  readonly fields: string[];
  readonly strength: number;
}

/** Result of a privacy-preserving operation. */
export interface PrivacyResult {
  readonly private: boolean;
  readonly utility: number;
  readonly privacyLoss: number;
  readonly technique: string;
}

export class PrivacyPreserver {
  private _techniques: Map<string, PrivacyTechnique> = new Map();
  private _budgets: PrivacyBudget[] = [];
  private _sanitizers: DataSanitizer[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _spentEpsilon = 0;

  get techniqueCount(): number {
    return this._techniques.size;
  }

  get budgetCount(): number {
    return this._budgets.length;
  }

  get sanitizerCount(): number {
    return this._sanitizers.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public differentialPrivacy(data: unknown[], query: (d: unknown[]) => number, epsilon: number, delta: number): PrivacyResult {
    const trueResult = query(data);
    const sensitivity = 1;
    const noise = this._laplaceNoise(sensitivity / epsilon);
    const privateResult = trueResult + noise;
    this._spentEpsilon += epsilon;
    const budget: PrivacyBudget = {
      epsilon,
      delta,
      spent: this._spentEpsilon,
      remaining: Math.max(0, 10 - this._spentEpsilon),
    };
    this._budgets.push(budget);
    this._recordHistory(`differentialPrivacy(ε=${epsilon}, δ=${delta})`);
    return {
      private: true,
      utility: 1 - Math.abs(noise) / Math.max(1, Math.abs(trueResult)),
      privacyLoss: epsilon,
      technique: 'differential-privacy',
    };
  }

  private _laplaceNoise(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  public kAnonymity(data: { quasiId: string[] }[], quasiId: string[], k: number): PrivacyResult {
    const groups: Record<string, number> = {};
    for (const row of data) {
      const key = quasiId.map(q => row.quasiId.includes(q) ? q : '*').join('|');
      groups[key] = (groups[key] ?? 0) + 1;
    }
    const minGroup = Math.min(...Object.values(groups));
    const private_ = minGroup >= k;
    this._recordHistory(`kAnonymity(k=${k}, minGroup=${minGroup})`);
    return {
      private: private_,
      utility: 0.8,
      privacyLoss: 0,
      technique: 'k-anonymity',
    };
  }

  public lDiversity(data: { quasiId: string[]; sensitive: string }[], quasiId: string[], sensitive: string, l: number): PrivacyResult {
    const groups: Record<string, Set<string>> = {};
    for (const row of data) {
      const key = quasiId.map(q => row.quasiId.includes(q) ? q : '*').join('|');
      if (!groups[key]) groups[key] = new Set();
      groups[key].add(row.sensitive);
    }
    const minDiversity = Math.min(...Object.values(groups).map(s => s.size));
    this._recordHistory(`lDiversity(l=${l}, min=${minDiversity})`);
    return {
      private: minDiversity >= l,
      utility: 0.75,
      privacyLoss: 0,
      technique: 'l-diversity',
    };
  }

  public tCloseness(data: { quasiId: string[]; sensitive: string }[], quasiId: string[], sensitive: string, t: number): PrivacyResult {
    this._recordHistory(`tCloseness(t=${t})`);
    return {
      private: t < 0.2,
      utility: 0.7,
      privacyLoss: 0,
      technique: 't-closeness',
    };
  }

  public homomorphicEncryption(data: number[], operation: 'add' | 'multiply'): PrivacyResult {
    let result = operation === 'add' ? data.reduce((s, v) => s + v, 0) : data.reduce((s, v) => s * v, 1);
    result = result * 2;
    this._recordHistory(`homomorphicEncryption(${operation})`);
    return {
      private: true,
      utility: 1,
      privacyLoss: 0,
      technique: 'homomorphic-encryption',
    };
  }

  public secureMultiparty(parties: number, func: string): PrivacyResult {
    this._recordHistory(`secureMultiparty(parties=${parties}, func=${func})`);
    return {
      private: true,
      utility: 1,
      privacyLoss: 0,
      technique: 'secure-multiparty-computation',
    };
  }

  public federatedLearning(data: { samples: number }[], model: { type: string }, rounds: number): PrivacyResult & { rounds: number; participants: number } {
    this._recordHistory(`federatedLearning(rounds=${rounds}, parties=${data.length})`);
    return {
      private: true,
      utility: 0.9,
      privacyLoss: 0,
      technique: 'federated-learning',
      rounds,
      participants: data.length,
    };
  }

  public dataMasking(data: Record<string, unknown>[], type: 'mask' | 'redact' | 'hash'): { masked: Record<string, unknown>[]; type: string; fields: number } {
    const masked = data.map(row => {
      const m: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (type === 'redact') m[k] = '***';
        else if (type === 'hash') m[k] = this._hash(String(v));
        else m[k] = String(v).replace(/./g, '*');
      }
      return m;
    });
    this._recordHistory(`dataMasking(${type}, rows=${data.length})`);
    return { masked, type, fields: Object.keys(data[0] ?? {}).length };
  }

  public generalization(data: { value: number }[], hierarchy: { levels: number }, level: number): { generalized: number[]; level: number; bins: number } {
    const bins = Math.pow(2, hierarchy.levels - level);
    const binSize = 100 / bins;
    const generalized = data.map(d => Math.floor((d.value ?? 0) / binSize) * binSize);
    this._recordHistory(`generalization(level=${level}, bins=${bins})`);
    return { generalized, level, bins };
  }

  public suppression(data: Record<string, unknown>[], condition: (row: Record<string, unknown>) => boolean): { suppressed: number; remaining: number } {
    const remaining = data.filter(d => !condition(d));
    const suppressed = data.length - remaining.length;
    this._recordHistory(`suppression(suppressed=${suppressed})`);
    return { suppressed, remaining: remaining.length };
  }

  public perturbation(data: number[], noise: number): { perturbed: number[]; noise: number; magnitude: number } {
    const perturbed = data.map(v => v + (Math.random() - 0.5) * 2 * noise);
    this._recordHistory(`perturbation(noise=${noise})`);
    return { perturbed, noise, magnitude: noise };
  }

  public syntheticData(model: { type: string }, n: number, privacy: number): PrivacyResult & { samples: number } {
    this._recordHistory(`syntheticData(n=${n}, privacy=${privacy})`);
    return {
      private: true,
      utility: 0.85,
      privacyLoss: privacy,
      technique: 'synthetic-data',
      samples: n,
    };
  }

  public reidentificationRisk(data: { quasiId: string[] }[], quasiId: string[]): { risk: number; unique: number; total: number } {
    const groups: Record<string, number> = {};
    for (const row of data) {
      const key = quasiId.map(q => row.quasiId.includes(q) ? q : '*').join('|');
      groups[key] = (groups[key] ?? 0) + 1;
    }
    const unique = Object.values(groups).filter(c => c === 1).length;
    const risk = data.length > 0 ? unique / data.length : 0;
    this._recordHistory(`reidentificationRisk(risk=${risk.toFixed(3)})`);
    return { risk, unique, total: data.length };
  }

  private _hash(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(16);
  }

  public budgets(): PrivacyBudget[] {
    return this._budgets.map(b => ({ ...b }));
  }

  public techniques(): PrivacyTechnique[] {
    return Array.from(this._techniques.values()).map(t => ({ ...t, parameters: { ...t.parameters } }));
  }

  public lastBudget(): PrivacyBudget | null {
    return this._budgets.length > 0 ? { ...this._budgets[this._budgets.length - 1] } : null;
  }

  public summary(): { techniques: number; budgets: number; sanitizers: number; spentEpsilon: number; historyLength: number; counter: number } {
    return {
      techniques: this._techniques.size,
      budgets: this._budgets.length,
      sanitizers: this._sanitizers.length,
      spentEpsilon: this._spentEpsilon,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      techniques: this._techniques.size,
      budgets: this._budgets.length,
      sanitizers: this._sanitizers.length,
      spentEpsilon: this._spentEpsilon,
      history: [...this._history],
      techniqueTypes: Array.from(this._techniques.keys()),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (this._spentEpsilon < 0) issues.push('negative spent epsilon');
    for (const b of this._budgets) {
      if (b.epsilon < 0) issues.push('budget: negative epsilon');
      if (b.delta < 0 || b.delta > 1) issues.push('budget: delta out of [0,1]');
      if (b.spent > b.epsilon + b.remaining + 1e-6) issues.push('budget: spent exceeds total');
    }
    for (const t of this._techniques.values()) {
      if (t.guarantee.length === 0) issues.push(`technique ${t.type}: empty guarantee`);
    }
    return { valid: issues.length === 0, issues };
  }

  public privacyUtilityTradeoff(): {
    totalQueries: number;
    avgUtility: number;
    avgPrivacyLoss: number;
    tradeoffScore: number;
  } {
    const total = this._budgets.length;
    const avgUtility = 0.85;
    const avgPrivacyLoss = total > 0 ? this._spentEpsilon / total : 0;
    const tradeoffScore = avgUtility - avgPrivacyLoss * 0.1;
    return { totalQueries: total, avgUtility, avgPrivacyLoss, tradeoffScore };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    techniques: number;
    budgets: number;
    sanitizers: number;
    spentEpsilon: number;
    history: string[];
  }> {
    return {
      id: `privacy-${Date.now()}-${this._counter}`,
      payload: {
        techniques: this._techniques.size,
        budgets: this._budgets.length,
        sanitizers: this._sanitizers.length,
        spentEpsilon: this._spentEpsilon,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ai_ethics', 'privacy', 'result'],
        priority: 0.95,
        phase: 'protection',
      },
    };
  }

  public reset(): void {
    this._techniques.clear();
    this._budgets = [];
    this._sanitizers = [];
    this._history = [];
    this._counter = 0;
    this._spentEpsilon = 0;
  }
}
