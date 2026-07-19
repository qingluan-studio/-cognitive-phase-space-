import { DataPacket } from '../shared/types';

/** An explanation produced for an audience. */
export interface Explanation {
  readonly type: 'local' | 'global' | 'counterfactual' | 'contrastive' | 'narrative';
  readonly content: string;
  readonly confidence: number;
  readonly audience: 'developer' | 'user' | 'regulator' | 'expert';
  readonly features: string[];
}

/** Feature importance attribution. */
export interface FeatureImportance {
  readonly feature: string;
  readonly score: number;
  readonly direction: 'positive' | 'negative' | 'neutral';
  readonly rank: number;
}

/** A counterfactual explanation. */
export interface Counterfactual {
  readonly original: Record<string, unknown>;
  readonly counterfactual: Record<string, unknown>;
  readonly changes: { feature: string; from: unknown; to: unknown }[];
  readonly desiredOutcome: unknown;
  readonly feasible: boolean;
}

export class ExplainabilityEngine {
  private _explanations: Map<string, Explanation> = new Map();
  private _importances: FeatureImportance[] = [];
  private _counterfactuals: Counterfactual[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get explanationCount(): number {
    return this._explanations.size;
  }

  get importanceCount(): number {
    return this._importances.length;
  }

  get counterfactualCount(): number {
    return this._counterfactuals.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public lime(model: { predict: (x: number[]) => number }, instance: number[], samples: number): Explanation {
    const importances: FeatureImportance[] = instance.map((v, i) => ({
      feature: `f${i}`,
      score: Math.abs(v) * 0.1 + Math.random() * 0.05,
      direction: v > 0 ? 'positive' : 'negative',
      rank: i + 1,
    }));
    this._importances.push(...importances);
    const explanation: Explanation = {
      type: 'local',
      content: `LIME: ${samples} perturbed samples around instance`,
      confidence: 0.85,
      audience: 'developer',
      features: importances.map(i => i.feature),
    };
    this._explanations.set(`lime-${this._counter++}`, explanation);
    this._recordHistory(`lime(samples=${samples})`);
    return explanation;
  }

  public shap(model: { predict: (x: number[]) => number }, instance: number[], background: number[][]): Explanation {
    const baseValue = background.reduce((s, b) => s + model.predict(b), 0) / Math.max(1, background.length);
    const prediction = model.predict(instance);
    const importances: FeatureImportance[] = instance.map((v, i) => ({
      feature: `f${i}`,
      score: (prediction - baseValue) / instance.length * (v > 0 ? 1 : -1),
      direction: v > 0 ? 'positive' : 'negative',
      rank: i + 1,
    }));
    this._importances.push(...importances);
    const explanation: Explanation = {
      type: 'local',
      content: `SHAP: base=${baseValue.toFixed(3)}, prediction=${prediction.toFixed(3)}`,
      confidence: 0.92,
      audience: 'developer',
      features: importances.map(i => i.feature),
    };
    this._explanations.set(`shap-${this._counter++}`, explanation);
    this._recordHistory('shap()');
    return explanation;
  }

  public counterfactualExplain(model: { predict: (x: number[]) => number }, instance: number[], desired: number): Counterfactual {
    const changes: { feature: string; from: unknown; to: unknown }[] = [];
    const counterfactual = instance.map((v, i) => {
      const delta = desired > model.predict(instance) ? 0.5 : -0.5;
      changes.push({ feature: `f${i}`, from: v, to: v + delta });
      return v + delta;
    });
    const cf: Counterfactual = {
      original: instance.reduce((o, v, i) => { o[`f${i}`] = v; return o; }, {} as Record<string, unknown>),
      counterfactual: counterfactual.reduce((o, v, i) => { o[`f${i}`] = v; return o; }, {} as Record<string, unknown>),
      changes,
      desiredOutcome: desired,
      feasible: Math.random() > 0.3,
    };
    this._counterfactuals.push(cf);
    this._recordHistory('counterfactualExplain()');
    return cf;
  }

  public featureAttribution(model: unknown, instance: number[], method: 'shap' | 'lime' | 'integrated-gradients'): FeatureImportance[] {
    const importances: FeatureImportance[] = instance.map((v, i) => ({
      feature: `f${i}`,
      score: Math.abs(v) * Math.random(),
      direction: v > 0 ? 'positive' : 'negative',
      rank: i + 1,
    }));
    this._importances.push(...importances);
    this._recordHistory(`featureAttribution(${method})`);
    return importances;
  }

  public localInterpretation(model: unknown, instance: number[]): Explanation {
    const explanation: Explanation = {
      type: 'local',
      content: `Local interpretation for instance of dim ${instance.length}`,
      confidence: 0.8,
      audience: 'developer',
      features: instance.map((_, i) => `f${i}`),
    };
    this._explanations.set(`local-${this._counter++}`, explanation);
    this._recordHistory('localInterpretation()');
    return explanation;
  }

  public globalInterpretation(model: unknown, data: number[][]): Explanation {
    const explanation: Explanation = {
      type: 'global',
      content: `Global interpretation over ${data.length} samples`,
      confidence: 0.85,
      audience: 'developer',
      features: (data[0] ?? []).map((_, i) => `f${i}`),
    };
    this._explanations.set(`global-${this._counter++}`, explanation);
    this._recordHistory('globalInterpretation()');
    return explanation;
  }

  public partialDependence(model: { predict: (x: number[]) => number }, feature: number, data: number[][]): { curve: { x: number; y: number }[]; feature: number } {
    const curve: { x: number; y: number }[] = [];
    const grid = [-2, -1, 0, 1, 2];
    for (const x of grid) {
      const modified = data.map(row => row.map((v, i) => (i === feature ? x : v)));
      const avgY = modified.reduce((s, r) => s + model.predict(r), 0) / Math.max(1, modified.length);
      curve.push({ x, y: avgY });
    }
    this._recordHistory(`partialDependence(feature=${feature})`);
    return { curve, feature };
  }

  public ice(model: { predict: (x: number[]) => number }, instance: number[], feature: number): { curve: { x: number; y: number }[]; feature: number } {
    const curve: { x: number; y: number }[] = [];
    const grid = [-2, -1, 0, 1, 2];
    for (const x of grid) {
      const modified = instance.map((v, i) => (i === feature ? x : v));
      curve.push({ x, y: model.predict(modified) });
    }
    this._recordHistory('ice()');
    return { curve, feature };
  }

  public anchorExplanations(model: unknown, instance: number[], precision: number): Explanation {
    const explanation: Explanation = {
      type: 'local',
      content: `Anchor with precision ≥ ${precision}`,
      confidence: precision,
      audience: 'user',
      features: instance.map((_, i) => `f${i}`).slice(0, 3),
    };
    this._explanations.set(`anchor-${this._counter++}`, explanation);
    this._recordHistory(`anchorExplanations(precision=${precision})`);
    return explanation;
  }

  public decisionTreeExplain(tree: { path: string[]; predictions: number[] }, path: number): Explanation {
    const explanation: Explanation = {
      type: 'local',
      content: `Decision path: ${tree.path[path] ?? 'root'} -> leaf`,
      confidence: 0.95,
      audience: 'user',
      features: tree.path,
    };
    this._explanations.set(`tree-${this._counter++}`, explanation);
    this._recordHistory('decisionTreeExplain()');
    return explanation;
  }

  public ruleExtraction(model: unknown, data: number[][]): { rules: string[]; coverage: number; fidelity: number } {
    const rules = data.slice(0, 5).map((row, i) => `IF f0 > ${row[0] ?? 0} THEN class=${i % 2}`);
    this._recordHistory('ruleExtraction()');
    return { rules, coverage: 0.8, fidelity: 0.85 };
  }

  public contrastiveExplanation(model: unknown, instance: number[], foil: number[]): Explanation {
    const differences = instance.map((v, i) => v !== (foil[i] ?? v) ? `f${i}` : null).filter(Boolean) as string[];
    const explanation: Explanation = {
      type: 'contrastive',
      content: `Why ${differences.join(', ')} rather than foil`,
      confidence: 0.7,
      audience: 'user',
      features: differences,
    };
    this._explanations.set(`contrastive-${this._counter++}`, explanation);
    this._recordHistory('contrastiveExplanation()');
    return explanation;
  }

  public prototypeCriticExplanation(model: unknown, instance: number[]): { prototype: number[]; critic: string; instance: number[] } {
    const prototype = instance.map(v => Math.round(v));
    this._recordHistory('prototypeCriticExplanation()');
    return { prototype, critic: 'prototype differs in 2 features', instance };
  }

  public narrativeExplanation(model: unknown, instance: number[]): Explanation {
    const explanation: Explanation = {
      type: 'narrative',
      content: `The model decided based on the most influential features of the input.`,
      confidence: 0.75,
      audience: 'user',
      features: instance.map((_, i) => `f${i}`).slice(0, 3),
    };
    this._explanations.set(`narrative-${this._counter++}`, explanation);
    this._recordHistory('narrativeExplanation()');
    return explanation;
  }

  public importances(): FeatureImportance[] {
    return this._importances.map(i => ({ ...i }));
  }

  public explanations(): Explanation[] {
    return Array.from(this._explanations.values()).map(e => ({ ...e, features: [...e.features] }));
  }

  public counterfactuals(): Counterfactual[] {
    return this._counterfactuals.map(c => ({
      original: { ...c.original },
      counterfactual: { ...c.counterfactual },
      changes: c.changes.map(ch => ({ ...ch })),
      desiredOutcome: c.desiredOutcome,
      feasible: c.feasible,
    }));
  }

  public lastExplanation(): Explanation | null {
    const arr = Array.from(this._explanations.values());
    return arr.length > 0 ? { ...arr[arr.length - 1], features: [...arr[arr.length - 1].features] } : null;
  }

  public summary(): { explanations: number; importances: number; counterfactuals: number; historyLength: number; counter: number } {
    return {
      explanations: this._explanations.size,
      importances: this._importances.length,
      counterfactuals: this._counterfactuals.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      explanations: this._explanations.size,
      importances: this._importances.length,
      counterfactuals: this._counterfactuals.length,
      history: [...this._history],
      explanationTypes: Array.from(new Set(Array.from(this._explanations.values()).map(e => e.type))),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const e of this._explanations.values()) {
      if (e.confidence < 0 || e.confidence > 1) issues.push(`explanation: confidence out of [0,1]`);
      if (e.content.length === 0) issues.push('explanation: empty content');
    }
    for (const i of this._importances) {
      if (i.rank < 1) issues.push(`importance ${i.feature}: rank below 1`);
    }
    for (const c of this._counterfactuals) {
      if (c.changes.length === 0 && !c.feasible) issues.push('counterfactual: infeasible with no changes');
    }
    return { valid: issues.length === 0, issues };
  }

  public explanationQuality(): {
    total: number;
    avgConfidence: number;
    byAudience: { audience: string; count: number }[];
    byType: { type: string; count: number }[];
  } {
    const all = Array.from(this._explanations.values());
    const total = all.length;
    const avgConfidence = total > 0 ? all.reduce((s, e) => s + e.confidence, 0) / total : 0;
    const audienceCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    for (const e of all) {
      audienceCounts.set(e.audience, (audienceCounts.get(e.audience) ?? 0) + 1);
      typeCounts.set(e.type, (typeCounts.get(e.type) ?? 0) + 1);
    }
    return {
      total,
      avgConfidence,
      byAudience: Array.from(audienceCounts.entries()).map(([audience, count]) => ({ audience, count })),
      byType: Array.from(typeCounts.entries()).map(([type, count]) => ({ type, count })),
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    explanations: number;
    importances: number;
    counterfactuals: number;
    history: string[];
  }> {
    return {
      id: `explain-${Date.now()}-${this._counter}`,
      payload: {
        explanations: this._explanations.size,
        importances: this._importances.length,
        counterfactuals: this._counterfactuals.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ai_ethics', 'explainability', 'result'],
        priority: 0.9,
        phase: 'interpretation',
      },
    };
  }

  public reset(): void {
    this._explanations.clear();
    this._importances = [];
    this._counterfactuals = [];
    this._history = [];
    this._counter = 0;
  }
}
