import { DataPacket } from '../shared/types';

export interface HybridResult {
  recs: string[];
  method: string;
  scores: number[];
}

export interface HybridStrategy {
  type: string;
  weights: number[];
  components: string[];
}

export class HybridRecommender {
  private _results: HybridResult[] = [];
  private _strategy: HybridStrategy | null = null;
  private _counter: number = 0;
  private _method: string = 'weighted';
  private _lastResult: HybridResult | null = null;

  get results(): HybridResult[] {
    return this._results;
  }

  get strategy(): HybridStrategy | null {
    return this._strategy;
  }

  get method(): string {
    return this._method;
  }

  weightedHybrid(scores: Map<string, number>[], weights: number[]): string[] {
    const combined = new Map<string, number>();
    for (let i = 0; i < scores.length; i++) {
      const weight = weights[i] || 1;
      for (const [item, score] of scores[i]) {
        combined.set(item, (combined.get(item) || 0) + score * weight);
      }
    }
    const sorted = [...combined.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => item);
    this._lastResult = {
      recs: sorted,
      method: 'weighted',
      scores: [...combined.entries()].sort((a, b) => b[1] - a[1]).map(([, s]) => s)
    };
    this._results.push(this._lastResult);
    this._method = 'weighted';
    return sorted;
  }

  switchingHybrid(context: string, models: Map<string, string[]>): string[] {
    const recs = models.get(context) || [];
    this._lastResult = {
      recs,
      method: 'switching',
      scores: recs.map((_, i) => 1 - i * 0.1)
    };
    this._results.push(this._lastResult);
    this._method = 'switching';
    return recs;
  }

  mixedHybrid(candidates: string[][], methods: string[]): string[] {
    const allRecs = new Set<string>();
    for (const cands of candidates) {
      for (const c of cands) {
        allRecs.add(c);
      }
    }
    const result = Array.from(allRecs);
    this._lastResult = {
      recs: result,
      method: 'mixed',
      scores: result.map(() => 1)
    };
    this._results.push(this._lastResult);
    this._method = 'mixed';
    return result;
  }

  featureCombination(features: number[][], models: string[]): number[] {
    const combined = new Array(features[0]?.length || 0).fill(0);
    for (let i = 0; i < features.length; i++) {
      for (let j = 0; j < features[i].length; j++) {
        combined[j] += features[i][j];
      }
    }
    return combined.map(v => v / features.length);
  }

  cascadeHybrid(stages: string[][]): string[] {
    let result = [...stages[0]];
    for (let i = 1; i < stages.length; i++) {
      const stageSet = new Set(stages[i]);
      result = result.filter(r => stageSet.has(r));
    }
    this._lastResult = {
      recs: result,
      method: 'cascade',
      scores: result.map((_, i) => 1 - i * 0.1)
    };
    this._results.push(this._lastResult);
    this._method = 'cascade';
    return result;
  }

  metaLevelHybrid(candidates: string[], metaLearner: (features: number[]) => number): string[] {
    const scored = candidates.map(item => ({
      item,
      score: metaLearner([item.length, item.charCodeAt(0)])
    }));
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._lastResult = {
      recs: result,
      method: 'meta-level',
      scores: scored.map(s => s.score)
    };
    this._results.push(this._lastResult);
    this._method = 'meta-level';
    return result;
  }

  augmentedHybrid(baseRecs: string[], auxiliary: string[]): string[] {
    const result = [...baseRecs];
    for (const aux of auxiliary) {
      if (!result.includes(aux)) {
        result.push(aux);
      }
    }
    this._lastResult = {
      recs: result,
      method: 'augmented',
      scores: result.map((_, i) => Math.max(0, 1 - i * 0.1))
    };
    this._results.push(this._lastResult);
    this._method = 'augmented';
    return result;
  }

  recommendationEnsemble(recs: string[][], strategy: string = 'vote'): string[] {
    const votes = new Map<string, number>();
    for (const recList of recs) {
      for (let i = 0; i < recList.length; i++) {
        const score = strategy === 'vote' ? 1 : (1 / (i + 1));
        votes.set(recList[i], (votes.get(recList[i]) || 0) + score);
      }
    }
    const sorted = [...votes.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => item);
    this._lastResult = {
      recs: sorted,
      method: 'ensemble',
      scores: [...votes.values()].sort((a, b) => b - a)
    };
    this._results.push(this._lastResult);
    this._method = 'ensemble';
    return sorted;
  }

  rankAggregation(rankings: string[][], method: string = 'borda'): string[] {
    const scores = new Map<string, number>();
    for (const ranking of rankings) {
      for (let i = 0; i < ranking.length; i++) {
        const score = method === 'borda' ? (ranking.length - i) : 1 / (i + 1);
        scores.set(ranking[i], (scores.get(ranking[i]) || 0) + score);
      }
    }
    const sorted = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => item);
    this._lastResult = {
      recs: sorted,
      method: 'rank-aggregation',
      scores: [...scores.values()].sort((a, b) => b - a)
    };
    this._results.push(this._lastResult);
    return sorted;
  }

  scoreFusion(scores: Map<string, number>[], method: string = 'sum'): string[] {
    const fused = new Map<string, number>();
    for (const scoreMap of scores) {
      for (const [item, score] of scoreMap) {
        if (method === 'sum') {
          fused.set(item, (fused.get(item) || 0) + score);
        } else if (method === 'max') {
          fused.set(item, Math.max(fused.get(item) || 0, score));
        } else if (method === 'min') {
          const current = fused.get(item);
          fused.set(item, current === undefined ? score : Math.min(current, score));
        } else {
          fused.set(item, (fused.get(item) || 0) + score);
        }
      }
    }
    if (method === 'avg') {
      for (const [item] of fused) {
        fused.set(item, fused.get(item)! / scores.length);
      }
    }
    const sorted = [...fused.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => item);
    this._lastResult = {
      recs: sorted,
      method: `score-fusion-${method}`,
      scores: [...fused.values()].sort((a, b) => b - a)
    };
    this._results.push(this._lastResult);
    return sorted;
  }

  diversification(recs: string[], method: string = 'mmr'): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const rec of recs) {
      if (!seen.has(rec)) {
        result.push(rec);
        seen.add(rec);
      }
    }
    return result;
  }

  multiArmedBandit(arms: string[], rewards: number[], strategy: string = 'epsilon-greedy'): string {
    if (arms.length === 0) return '';
    if (strategy === 'epsilon-greedy') {
      const epsilon = 0.1;
      if (Math.random() < epsilon) {
        return arms[Math.floor(Math.random() * arms.length)];
      } else {
        let bestIdx = 0;
        let bestReward = -Infinity;
        for (let i = 0; i < rewards.length; i++) {
          if (rewards[i] > bestReward) {
            bestReward = rewards[i];
            bestIdx = i;
          }
        }
        return arms[bestIdx];
      }
    } else if (strategy === 'ucb') {
      const total = rewards.reduce((a, b) => a + b, 0);
      let bestIdx = 0;
      let bestUcb = -Infinity;
      for (let i = 0; i < arms.length; i++) {
        const ucb = rewards[i] + Math.sqrt(2 * Math.log(total + 1) / (rewards[i] + 1));
        if (ucb > bestUcb) {
          bestUcb = ucb;
          bestIdx = i;
        }
      }
      return arms[bestIdx];
    }
    return arms[0];
  }

  toPacket(): DataPacket<HybridResult> {
    const result = this._lastResult || { recs: [], method: '', scores: [] };
    this._counter++;
    return {
      id: `hybrid-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'hybrid'],
        priority: 1,
        phase: 'hybrid'
      }
    };
  }

  reset(): void {
    this._results = [];
    this._strategy = null;
    this._counter = 0;
    this._method = 'weighted';
    this._lastResult = null;
  }
}
