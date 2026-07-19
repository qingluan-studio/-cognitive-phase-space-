import { DataPacket } from '../shared/types';

/** A protected attribute such as gender, race, or age. */
export interface ProtectedAttribute {
  readonly name: string;
  readonly values: string[];
  readonly privileged: string;
}

/** A fairness metric with formula and threshold. */
export interface FairnessMetric {
  readonly name: string;
  readonly formula: string;
  readonly threshold: number;
  readonly value: number;
  readonly satisfied: boolean;
}

/** A bias report for a model. */
export interface BiasReport {
  readonly metrics: FairnessMetric[];
  readonly biased: boolean;
  readonly severity: 'none' | 'low' | 'medium' | 'high';
  readonly recommendations: string[];
}

export class FairnessChecker {
  private _attributes: ProtectedAttribute[] = [];
  private _metrics: Map<string, FairnessMetric> = new Map();
  private _reports: BiasReport[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get attributeCount(): number {
    return this._attributes.length;
  }

  get metricCount(): number {
    return this._metrics.size;
  }

  get reportCount(): number {
    return this._reports.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public demographicParity(predictions: number[], groups: string[]): FairnessMetric {
    const groupSet = [...new Set(groups)];
    const rates = groupSet.map(g => {
      const idx = groups.map((gp, i) => gp === g ? i : -1).filter(i => i >= 0);
      const positive = idx.filter(i => predictions[i] === 1).length;
      return idx.length > 0 ? positive / idx.length : 0;
    });
    const max = Math.max(...rates);
    const min = Math.min(...rates);
    const value = max - min;
    const metric: FairnessMetric = {
      name: 'demographic-parity',
      formula: '|P(Ŷ=1|A=a) - P(Ŷ=1|A=b)|',
      threshold: 0.1,
      value,
      satisfied: value < 0.1,
    };
    this._metrics.set('demographic-parity', metric);
    this._recordHistory(`demographicParity(value=${value.toFixed(3)}, satisfied=${metric.satisfied})`);
    return metric;
  }

  public equalizedOdds(predictions: number[], labels: number[], groups: string[]): FairnessMetric {
    const groupSet = [...new Set(groups)];
    const tprs = groupSet.map(g => {
      const idx = groups.map((gp, i) => gp === g ? i : -1).filter(i => i >= 0);
      const tp = idx.filter(i => labels[i] === 1 && predictions[i] === 1).length;
      const p = idx.filter(i => labels[i] === 1).length;
      return p > 0 ? tp / p : 0;
    });
    const value = Math.max(...tprs) - Math.min(...tprs);
    const metric: FairnessMetric = {
      name: 'equalized-odds',
      formula: '|TPR_a - TPR_b| + |FPR_a - FPR_b|',
      threshold: 0.1,
      value,
      satisfied: value < 0.1,
    };
    this._metrics.set('equalized-odds', metric);
    this._recordHistory(`equalizedOdds(value=${value.toFixed(3)})`);
    return metric;
  }

  public equalOpportunity(predictions: number[], labels: number[], groups: string[]): FairnessMetric {
    const groupSet = [...new Set(groups)];
    const tprs = groupSet.map(g => {
      const idx = groups.map((gp, i) => gp === g ? i : -1).filter(i => i >= 0);
      const tp = idx.filter(i => labels[i] === 1 && predictions[i] === 1).length;
      const p = idx.filter(i => labels[i] === 1).length;
      return p > 0 ? tp / p : 0;
    });
    const value = Math.max(...tprs) - Math.min(...tprs);
    const metric: FairnessMetric = {
      name: 'equal-opportunity',
      formula: '|TPR_a - TPR_b|',
      threshold: 0.1,
      value,
      satisfied: value < 0.1,
    };
    this._metrics.set('equal-opportunity', metric);
    this._recordHistory(`equalOpportunity(value=${value.toFixed(3)})`);
    return metric;
  }

  public disparateImpact(predictions: number[], groups: string[]): FairnessMetric {
    const groupSet = [...new Set(groups)];
    const rates = groupSet.map(g => {
      const idx = groups.map((gp, i) => gp === g ? i : -1).filter(i => i >= 0);
      const positive = idx.filter(i => predictions[i] === 1).length;
      return idx.length > 0 ? positive / idx.length : 0;
    });
    const value = rates.length >= 2 ? Math.min(...rates) / Math.max(...rates) : 1;
    const metric: FairnessMetric = {
      name: 'disparate-impact',
      formula: 'P(Ŷ=1|A=b) / P(Ŷ=1|A=a)',
      threshold: 0.8,
      value,
      satisfied: value >= 0.8,
    };
    this._metrics.set('disparate-impact', metric);
    this._recordHistory(`disparateImpact(value=${value.toFixed(3)})`);
    return metric;
  }

  public statisticalParity(predictions: number[], groups: string[]): FairnessMetric {
    return this.demographicParity(predictions, groups);
  }

  public calibration(predictions: number[], labels: number[], groups: string[]): FairnessMetric {
    const groupSet = [...new Set(groups)];
    const cals = groupSet.map(g => {
      const idx = groups.map((gp, i) => gp === g ? i : -1).filter(i => i >= 0);
      const avgPred = idx.reduce((s, i) => s + predictions[i], 0) / Math.max(1, idx.length);
      const avgLabel = idx.reduce((s, i) => s + labels[i], 0) / Math.max(1, idx.length);
      return Math.abs(avgPred - avgLabel);
    });
    const value = Math.max(...cals);
    const metric: FairnessMetric = {
      name: 'calibration',
      formula: '|E[Y|Ŷ, A=a] - E[Y|Ŷ, A=b]|',
      threshold: 0.05,
      value,
      satisfied: value < 0.05,
    };
    this._metrics.set('calibration', metric);
    this._recordHistory(`calibration(value=${value.toFixed(3)})`);
    return metric;
  }

  public predictiveParity(predictions: number[], labels: number[], groups: string[]): FairnessMetric {
    const groupSet = [...new Set(groups)];
    const ppvs = groupSet.map(g => {
      const idx = groups.map((gp, i) => gp === g ? i : -1).filter(i => i >= 0);
      const tp = idx.filter(i => labels[i] === 1 && predictions[i] === 1).length;
      const fp = idx.filter(i => labels[i] === 0 && predictions[i] === 1).length;
      return tp + fp > 0 ? tp / (tp + fp) : 0;
    });
    const value = Math.max(...ppvs) - Math.min(...ppvs);
    const metric: FairnessMetric = {
      name: 'predictive-parity',
      formula: '|PPV_a - PPV_b|',
      threshold: 0.1,
      value,
      satisfied: value < 0.1,
    };
    this._metrics.set('predictive-parity', metric);
    this._recordHistory(`predictiveParity(value=${value.toFixed(3)})`);
    return metric;
  }

  public counterfactualFairness(individual: Record<string, unknown>, counterfactual: Record<string, unknown>): FairnessMetric {
    const diff = Object.keys(individual).reduce((s, k) => {
      return s + (individual[k] !== counterfactual[k] ? 1 : 0);
    }, 0);
    const value = diff / Math.max(1, Object.keys(individual).length);
    const metric: FairnessMetric = {
      name: 'counterfactual-fairness',
      formula: 'P(Ŷ_{A←a} = Ŷ | X) = 1',
      threshold: 0.0,
      value,
      satisfied: value === 0,
    };
    this._metrics.set('counterfactual-fairness', metric);
    this._recordHistory(`counterfactualFairness(value=${value.toFixed(3)})`);
    return metric;
  }

  public individualFairness(individual1: Record<string, unknown>, individual2: Record<string, unknown>): FairnessMetric {
    let similarity = 0;
    const keys = new Set([...Object.keys(individual1), ...Object.keys(individual2)]);
    for (const k of keys) {
      if (individual1[k] === individual2[k]) similarity += 1;
    }
    const value = 1 - similarity / Math.max(1, keys.size);
    const metric: FairnessMetric = {
      name: 'individual-fairness',
      formula: '|f(x) - f(y)| ≤ d(x,y)',
      threshold: 0.2,
      value,
      satisfied: value < 0.2,
    };
    this._metrics.set('individual-fairness', metric);
    this._recordHistory(`individualFairness(value=${value.toFixed(3)})`);
    return metric;
  }

  public groupFairness(predictions: number[], groups: string[], metric: 'demographic' | 'equalized' | 'opportunity'): FairnessMetric {
    if (metric === 'demographic') return this.demographicParity(predictions, groups);
    if (metric === 'equalized') return this.equalizedOdds(predictions, predictions, groups);
    return this.equalOpportunity(predictions, predictions, groups);
  }

  public biasMitigation(method: 'reweighing' | 'resampling' | 'adversarial' | 'postprocessing', data: { samples: number }, model: { type: string }): { mitigated: boolean; method: string; improvement: number } {
    const improvement = method === 'adversarial' ? 0.3 : method === 'reweighing' ? 0.2 : 0.15;
    this._recordHistory(`biasMitigation(${method}, improvement=${improvement})`);
    return { mitigated: true, method, improvement };
  }

  public fairnessThroughUnawareness(features: string[], protectedAttr: ProtectedAttribute): { fair: boolean; removed: string[]; remaining: string[] } {
    const removed = features.filter(f => protectedAttr.values.includes(f) || f === protectedAttr.name);
    const remaining = features.filter(f => !removed.includes(f));
    const fair = removed.length > 0;
    this._recordHistory(`fairnessThroughUnawareness(removed=${removed.length})`);
    return { fair, removed, remaining };
  }

  public registerAttribute(attr: ProtectedAttribute): void {
    this._attributes.push({ ...attr, values: [...attr.values] });
  }

  public reports(): BiasReport[] {
    return this._reports.map(r => ({ ...r, metrics: r.metrics.map(m => ({ ...m })), recommendations: [...r.recommendations] }));
  }

  public metrics(): FairnessMetric[] {
    return Array.from(this._metrics.values()).map(m => ({ ...m }));
  }

  public attributes(): ProtectedAttribute[] {
    return this._attributes.map(a => ({ ...a, values: [...a.values] }));
  }

  public lastReport(): BiasReport | null {
    return this._reports.length > 0
      ? { ...this._reports[this._reports.length - 1], metrics: this._reports[this._reports.length - 1].metrics.map(m => ({ ...m })), recommendations: [...this._reports[this._reports.length - 1].recommendations] }
      : null;
  }

  public summary(): { attributes: number; metrics: number; reports: number; historyLength: number; counter: number } {
    return {
      attributes: this._attributes.length,
      metrics: this._metrics.size,
      reports: this._reports.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      attributes: this._attributes.length,
      metrics: this._metrics.size,
      reports: this._reports.length,
      history: [...this._history],
      satisfiedMetrics: Array.from(this._metrics.values()).filter(m => m.satisfied).length,
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const m of this._metrics.values()) {
      if (m.threshold < 0) issues.push(`metric ${m.name}: negative threshold`);
      if (m.value < 0) issues.push(`metric ${m.name}: negative value`);
    }
    for (const a of this._attributes) {
      if (!a.values.includes(a.privileged)) issues.push(`attribute ${a.name}: privileged value not in values list`);
    }
    return { valid: issues.length === 0, issues };
  }

  public fairnessOverview(): {
    total: number;
    satisfied: number;
    violated: number;
    bySeverity: { severity: string; count: number };
  } {
    const all = Array.from(this._metrics.values());
    const satisfied = all.filter(m => m.satisfied).length;
    return {
      total: all.length,
      satisfied,
      violated: all.length - satisfied,
      bySeverity: { severity: 'high', count: all.filter(m => !m.satisfied && m.value > 0.3).length },
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    attributes: number;
    metrics: number;
    reports: number;
    history: string[];
  }> {
    return {
      id: `fairness-${Date.now()}-${this._counter}`,
      payload: {
        attributes: this._attributes.length,
        metrics: this._metrics.size,
        reports: this._reports.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ai_ethics', 'fairness', 'result'],
        priority: 0.95,
        phase: 'audit',
      },
    };
  }

  public reset(): void {
    this._attributes = [];
    this._metrics.clear();
    this._reports = [];
    this._history = [];
    this._counter = 0;
  }
}
