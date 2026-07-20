import { DataPacket, PacketMeta } from '../shared/types';

export interface HybridResult {
  recs: string[];
  method: string;
  scores: number[];
  confidence: number;
  diversity: number;
  coverage: number;
  timestamp: number;
}

export interface HybridStrategy {
  type: string;
  weights: number[];
  components: string[];
  description: string;
  adaptive: boolean;
}

export interface HybridComponent {
  name: string;
  type: 'collaborative' | 'content' | 'knowledge' | 'demographic' | 'contextual' | 'deep';
  weight: number;
  confidence: number;
  latency: number;
}

export interface EnsembleConfig {
  method: 'vote' | 'average' | 'stacking' | 'boosting' | 'bayesian';
  baseModels: string[];
  metaModel?: string;
  diversityThreshold: number;
}

export interface CrossDomainTransfer {
  sourceDomain: string;
  targetDomain: string;
  mappingType: 'cluster-level' | 'rating-pattern' | 'tag-based' | 'meta-path';
  transferWeight: number;
  overlapItems: number;
}

export interface DeepHybridConfig {
  neuralLayers: number[];
  embeddingDim: number;
  attentionHeads: number;
  fusionType: 'early' | 'late' | 'intermediate';
  dropout: number;
}

export class HybridRecommender {
  private _results: HybridResult[] = [];
  private _strategy: HybridStrategy | null = null;
  private _counter: number = 0;
  private _method: string = 'weighted';
  private _lastResult: HybridResult | null = null;
  private _components: Map<string, HybridComponent> = new Map();
  private _ensembleConfigs: EnsembleConfig[] = [];
  private _crossDomainMappings: CrossDomainTransfer[] = [];
  private _deepConfigs: DeepHybridConfig[] = [];
  private _history: unknown[] = [];

  get results(): HybridResult[] { return this._results; }
  get strategy(): HybridStrategy | null { return this._strategy; }
  get method(): string { return this._method; }
  get componentCount(): number { return this._components.size; }
  get ensembleConfigCount(): number { return this._ensembleConfigs.length; }
  get crossDomainMappingCount(): number { return this._crossDomainMappings.length; }

  constructor() {
    this._seedComponents();
  }

  weightedHybrid(scores: Map<string, number>[], weights: number[], normalize: boolean = true): string[] {
    const combined = new Map<string, number>();
    for (let i = 0; i < scores.length; i++) {
      const weight = weights[i] || 1;
      for (const [item, score] of scores[i]) {
        const normalizedScore = normalize ? Math.min(1, Math.max(0, score)) : score;
        combined.set(item, (combined.get(item) || 0) + normalizedScore * weight);
      }
    }
    const sorted = [...combined.entries()].sort((a, b) => b[1] - a[1]).map(([item]) => item);
    this._lastResult = {
      recs: sorted,
      method: 'weighted',
      scores: [...combined.entries()].sort((a, b) => b[1] - a[1]).map(([, s]) => s),
      confidence: 0.75,
      diversity: this._computeDiversity(sorted),
      coverage: Math.min(1, sorted.length / 100),
      timestamp: Date.now(),
    };
    this._results.push(this._lastResult);
    this._method = 'weighted';
    this._history.push({ op: 'weightedHybrid', itemCount: sorted.length });
    return sorted;
  }

  switchingHybrid(context: string, models: Map<string, string[]>, contextThresholds: Record<string, number> = {}): string[] {
    const threshold = contextThresholds[context] ?? 0.5;
    const recs = models.get(context) || [];
    const fallback = models.get('default') || [];
    const finalRecs = recs.length >= threshold * 10 ? recs : [...recs, ...fallback].slice(0, 20);
    this._lastResult = {
      recs: finalRecs,
      method: 'switching',
      scores: finalRecs.map((_, i) => Math.max(0, 1 - i * 0.05)),
      confidence: recs.length >= threshold * 10 ? 0.85 : 0.6,
      diversity: this._computeDiversity(finalRecs),
      coverage: Math.min(1, finalRecs.length / 100),
      timestamp: Date.now(),
    };
    this._results.push(this._lastResult);
    this._method = 'switching';
    this._history.push({ op: 'switchingHybrid', context, threshold });
    return finalRecs;
  }

  mixedHybrid(candidates: string[][], methods: string[], interleaveRatio: number = 0.5): string[] {
    const allRecs = new Set<string>();
    const interleaved: string[] = [];
    let idx = 0;
    while (interleaved.length < 50) {
      let added = false;
      for (let i = 0; i < candidates.length; i++) {
        if (idx < candidates[i].length) {
          const item = candidates[i][idx];
          if (!allRecs.has(item)) {
            interleaved.push(item);
            allRecs.add(item);
            added = true;
          }
        }
      }
      idx++;
      if (!added) break;
    }
    this._lastResult = {
      recs: interleaved,
      method: 'mixed',
      scores: interleaved.map((_, i) => Math.max(0, 1 - i * 0.02)),
      confidence: 0.8,
      diversity: this._computeDiversity(interleaved),
      coverage: Math.min(1, interleaved.length / 100),
      timestamp: Date.now(),
    };
    this._results.push(this._lastResult);
    this._method = 'mixed';
    this._history.push({ op: 'mixedHybrid', methodCount: methods.length });
    return interleaved;
  }

  featureCombination(features: number[][], models: string[], combinationType: 'concat' | 'sum' | 'attention' = 'concat'): number[] {
    if (combinationType === 'concat') {
      return features.flat();
    } else if (combinationType === 'sum') {
      const maxLen = Math.max(...features.map(f => f.length));
      const result = new Array(maxLen).fill(0);
      for (const feat of features) {
        for (let i = 0; i < feat.length; i++) result[i] += feat[i];
      }
      return result.map(v => v / features.length);
    } else {
      const attentionWeights = features.map(f => Math.exp(f.reduce((a, b) => a + b, 0) / f.length));
      const sumWeights = attentionWeights.reduce((a, b) => a + b, 0);
      const normalized = attentionWeights.map(w => w / sumWeights);
      const maxLen = Math.max(...features.map(f => f.length));
      const result = new Array(maxLen).fill(0);
      for (let i = 0; i < features.length; i++) {
        for (let j = 0; j < features[i].length; j++) {
          result[j] += features[i][j] * normalized[i];
        }
      }
      return result;
    }
  }

  cascadeHybrid(stages: string[][], stageConfigs: { minItems: number; filterRatio: number }[] = []): string[] {
    let result = [...stages[0]];
    for (let i = 1; i < stages.length; i++) {
      const stageSet = new Set(stages[i]);
      result = result.filter(r => stageSet.has(r));
      const config = stageConfigs[i - 1] || { minItems: 5, filterRatio: 0.5 };
      if (result.length < config.minItems) {
        const fallback = stages[i].filter(s => !result.includes(s)).slice(0, config.minItems - result.length);
        result.push(...fallback);
      }
    }
    this._lastResult = {
      recs: result,
      method: 'cascade',
      scores: result.map((_, i) => Math.max(0, 1 - i * 0.05)),
      confidence: 0.82,
      diversity: this._computeDiversity(result),
      coverage: Math.min(1, result.length / 100),
      timestamp: Date.now(),
    };
    this._results.push(this._lastResult);
    this._method = 'cascade';
    this._history.push({ op: 'cascadeHybrid', stageCount: stages.length });
    return result;
  }

  metaLevelHybrid(candidates: string[], metaFeatures: number[][], metaLearner: (features: number[]) => number): string[] {
    const scored = candidates.map((item, idx) => ({
      item,
      score: metaLearner(metaFeatures[idx] || [item.length, item.charCodeAt(0)]),
    }));
    scored.sort((a, b) => b.score - a.score);
    const result = scored.map(s => s.item);
    this._lastResult = {
      recs: result,
      method: 'meta-level',
      scores: scored.map(s => s.score),
      confidence: 0.78,
      diversity: this._computeDiversity(result),
      coverage: Math.min(1, result.length / 100),
      timestamp: Date.now(),
    };
    this._results.push(this._lastResult);
    this._method = 'meta-level';
    this._history.push({ op: 'metaLevelHybrid', candidateCount: candidates.length });
    return result;
  }

  augmentedHybrid(baseRecs: string[], auxiliary: string[], augmentationWeight: number = 0.3): string[] {
    const result = [...baseRecs];
    const baseSet = new Set(baseRecs);
    let auxIdx = 0;
    for (let i = 0; i < baseRecs.length && auxIdx < auxiliary.length; i++) {
      if (Math.random() < augmentationWeight && !baseSet.has(auxiliary[auxIdx])) {
        result.splice(i * 2 + 1, 0, auxiliary[auxIdx]);
        baseSet.add(auxiliary[auxIdx]);
        auxIdx++;
      }
    }
    this._lastResult = {
      recs: result,
      method: 'augmented',
      scores: result.map((_, i) => Math.max(0, 1 - i * 0.03)),
      confidence: 0.73,
      diversity: this._computeDiversity(result),
      coverage: Math.min(1, result.length / 100),
      timestamp: Date.now(),
    };
    this._results.push(this._lastResult);
    this._method = 'augmented';
    this._history.push({ op: 'augmentedHybrid', baseCount: baseRecs.length, auxCount: auxiliary.length });
    return result;
  }

  recommendationEnsemble(recs: string[][], strategy: 'vote' | 'borda' | 'copeland' | 'dowdall' = 'vote'): string[] {
    const votes = new Map<string, number>();
    for (const recList of recs) {
      for (let i = 0; i < recList.length; i++) {
        let score: number;
        if (strategy === 'vote') score = 1;
        else if (strategy === 'borda') score = recList.length - i;
        else if (strategy === 'copeland') score = recList.length - i;
        else if (strategy === 'dowdall') score = 1 / (i + 1);
        else score = 1 / (i + 1);
        votes.set(recList[i], (votes.get(recList[i]) || 0) + score);
      }
    }
    const sorted = [...votes.entries()].sort((a, b) => b[1] - a[1]).map(([item]) => item);
    this._lastResult = {
      recs: sorted,
      method: 'ensemble',
      scores: [...votes.entries()].sort((a, b) => b[1] - a[1]).map(([, s]) => s),
      confidence: 0.8,
      diversity: this._computeDiversity(sorted),
      coverage: Math.min(1, sorted.length / 100),
      timestamp: Date.now(),
    };
    this._results.push(this._lastResult);
    this._method = 'ensemble';
    this._history.push({ op: 'recommendationEnsemble', strategy, listCount: recs.length });
    return sorted;
  }

  rankAggregation(rankings: string[][], method: 'borda' | 'kemeny' | 'footrule' = 'borda'): string[] {
    const scores = new Map<string, number>();
    for (const ranking of rankings) {
      for (let i = 0; i < ranking.length; i++) {
        const score = method === 'borda' ? (ranking.length - i) : method === 'footrule' ? Math.abs(ranking.length - 2 * i) : ranking.length - i;
        scores.set(ranking[i], (scores.get(ranking[i]) || 0) + score);
      }
    }
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([item]) => item);
    this._lastResult = {
      recs: sorted,
      method: 'rank-aggregation',
      scores: [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([, s]) => s),
      confidence: 0.76,
      diversity: this._computeDiversity(sorted),
      coverage: Math.min(1, sorted.length / 100),
      timestamp: Date.now(),
    };
    this._results.push(this._lastResult);
    this._history.push({ op: 'rankAggregation', method, rankingCount: rankings.length });
    return sorted;
  }

  scoreFusion(scores: Map<string, number>[], method: 'sum' | 'max' | 'min' | 'avg' | 'product' | 'harmonic' = 'sum'): string[] {
    const fused = new Map<string, number>();
    for (const scoreMap of scores) {
      for (const [item, score] of scoreMap) {
        if (method === 'sum') fused.set(item, (fused.get(item) || 0) + score);
        else if (method === 'max') fused.set(item, Math.max(fused.get(item) || 0, score));
        else if (method === 'min') {
          const current = fused.get(item);
          fused.set(item, current === undefined ? score : Math.min(current, score));
        } else if (method === 'product') fused.set(item, (fused.get(item) || 1) * score);
        else if (method === 'harmonic') {
          const current = fused.get(item);
          fused.set(item, current === undefined ? score : 2 / (1 / current + 1 / score));
        } else fused.set(item, (fused.get(item) || 0) + score);
      }
    }
    if (method === 'avg') {
      for (const [item] of fused) fused.set(item, fused.get(item)! / scores.length);
    }
    const sorted = [...fused.entries()].sort((a, b) => b[1] - a[1]).map(([item]) => item);
    this._lastResult = {
      recs: sorted,
      method: `score-fusion-${method}`,
      scores: [...fused.entries()].sort((a, b) => b[1] - a[1]).map(([, s]) => s),
      confidence: 0.74,
      diversity: this._computeDiversity(sorted),
      coverage: Math.min(1, sorted.length / 100),
      timestamp: Date.now(),
    };
    this._results.push(this._lastResult);
    this._history.push({ op: 'scoreFusion', method });
    return sorted;
  }

  diversification(recs: string[], method: 'mmr' | 'mrd' | 'bc' = 'mmr', lambda: number = 0.5): string[] {
    const result: string[] = [];
    const remaining = [...recs];
    while (remaining.length > 0 && result.length < 20) {
      let bestIdx = 0;
      let bestScore = -Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const relevance = Math.max(0, 1 - recs.indexOf(remaining[i]) * 0.05);
        let maxSim = 0;
        for (const selected of result) {
          maxSim = Math.max(maxSim, this._itemSimilarity(remaining[i], selected));
        }
        const score = method === 'mmr' ? lambda * relevance - (1 - lambda) * maxSim : relevance;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }
      result.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }
    return result;
  }

  multiArmedBandit(arms: string[], rewards: number[], strategy: 'epsilon-greedy' | 'ucb' | 'thompson' = 'epsilon-greedy'): string {
    if (arms.length === 0) return '';
    if (strategy === 'epsilon-greedy') {
      const epsilon = 0.1;
      if (Math.random() < epsilon) return arms[Math.floor(Math.random() * arms.length)];
      let bestIdx = 0;
      let bestReward = -Infinity;
      for (let i = 0; i < rewards.length; i++) {
        if (rewards[i] > bestReward) { bestReward = rewards[i]; bestIdx = i; }
      }
      return arms[bestIdx];
    } else if (strategy === 'ucb') {
      const total = rewards.reduce((a, b) => a + b, 0);
      let bestIdx = 0;
      let bestUcb = -Infinity;
      for (let i = 0; i < arms.length; i++) {
        const ucb = rewards[i] + Math.sqrt(2 * Math.log(total + 1) / (rewards[i] + 1));
        if (ucb > bestUcb) { bestUcb = ucb; bestIdx = i; }
      }
      return arms[bestIdx];
    } else {
      const sampled = rewards.map(r => Math.max(0.01, r) * Math.random());
      let bestIdx = 0;
      let bestSample = -Infinity;
      for (let i = 0; i < sampled.length; i++) {
        if (sampled[i] > bestSample) { bestSample = sampled[i]; bestIdx = i; }
      }
      return arms[bestIdx];
    }
  }

  crossDomainHybrid(sourceRecs: string[], targetDomain: string, mapping: CrossDomainTransfer): string[] {
    const transferred = sourceRecs.map(item => `${targetDomain}:${item}`);
    const weighted = transferred.map((item, i) => ({ item, score: Math.max(0, 1 - i * 0.05) * mapping.transferWeight }));
    weighted.sort((a, b) => b.score - a.score);
    const result = weighted.map(w => w.item);
    this._crossDomainMappings.push(mapping);
    this._lastResult = {
      recs: result,
      method: 'cross-domain',
      scores: weighted.map(w => w.score),
      confidence: mapping.transferWeight * 0.8,
      diversity: this._computeDiversity(result),
      coverage: Math.min(1, result.length / 100),
      timestamp: Date.now(),
    };
    this._results.push(this._lastResult);
    this._history.push({ op: 'crossDomainHybrid', sourceDomain: mapping.sourceDomain, targetDomain });
    return result;
  }

  deepHybrid(userFeatures: number[], itemFeatures: number[], config: DeepHybridConfig): number {
    let combined: number[] = [];
    if (config.fusionType === 'early') {
      combined = [...userFeatures, ...itemFeatures];
    } else if (config.fusionType === 'late') {
      const userScore = userFeatures.reduce((a, b) => a + b, 0) / userFeatures.length;
      const itemScore = itemFeatures.reduce((a, b) => a + b, 0) / itemFeatures.length;
      combined = [userScore, itemScore];
    } else {
      const minLen = Math.min(userFeatures.length, itemFeatures.length);
      combined = Array.from({ length: minLen }, (_, i) => userFeatures[i] * itemFeatures[i]);
    }
    let output = combined.reduce((a, b) => a + b, 0) / combined.length;
    for (const layerSize of config.neuralLayers) {
      output = Math.tanh(output * layerSize * 0.01);
    }
    this._deepConfigs.push(config);
    this._history.push({ op: 'deepHybrid', fusionType: config.fusionType });
    return Number(output.toFixed(4));
  }

  adaptiveWeightUpdate(componentErrors: Record<string, number>, learningRate: number = 0.01): Record<string, number> {
    const totalError = Object.values(componentErrors).reduce((a, b) => a + b, 0);
    const updated: Record<string, number> = {};
    for (const [comp, error] of Object.entries(componentErrors)) {
      const current = this._components.get(comp)?.weight || 0.5;
      const newWeight = Math.max(0.05, Math.min(0.95, current - learningRate * (error / Math.max(0.0001, totalError))));
      updated[comp] = Number(newWeight.toFixed(4));
      const existing = this._components.get(comp);
      if (existing) this._components.set(comp, { ...existing, weight: newWeight });
    }
    this._history.push({ op: 'adaptiveWeightUpdate', componentCount: Object.keys(componentErrors).length });
    return updated;
  }

  ensembleDiversity(recs: string[][]): number {
    const allPairs = new Map<string, number>();
    for (const recList of recs) {
      for (let i = 0; i < recList.length; i++) {
        for (let j = i + 1; j < recList.length; j++) {
          const key = [recList[i], recList[j]].sort().join('|');
          allPairs.set(key, (allPairs.get(key) || 0) + 1);
        }
      }
    }
    const totalPairs = (recs.length * (recs.length - 1)) / 2;
    const commonPairs = Array.from(allPairs.values()).filter(v => v > 1).length;
    return totalPairs > 0 ? Number((1 - commonPairs / totalPairs).toFixed(2)) : 0;
  }

  componentAccuracy(groundTruth: string[], componentRecs: string[]): number {
    const gtSet = new Set(groundTruth);
    let hits = 0;
    for (const rec of componentRecs) {
      if (gtSet.has(rec)) hits++;
    }
    return componentRecs.length > 0 ? Number((hits / componentRecs.length).toFixed(2)) : 0;
  }

  hybridExploitExplore(exploitRecs: string[], exploreRecs: string[], ratio: number = 0.8): string[] {
    const exploitCount = Math.round(exploitRecs.length * ratio);
    const exploreCount = Math.round(exploreRecs.length * (1 - ratio));
    const result = [...exploitRecs.slice(0, exploitCount), ...exploreRecs.slice(0, exploreCount)];
    this._history.push({ op: 'hybridExploitExplore', ratio });
    return result;
  }

  contextualBanditHybrid(context: string, arms: string[], rewards: number[], contextFeatures: number[]): string {
    const contextWeight = contextFeatures.reduce((a, b) => a + b, 0) / contextFeatures.length;
    const adjustedRewards = rewards.map(r => r * contextWeight);
    return this.multiArmedBandit(arms, adjustedRewards, 'ucb');
  }

  bayesianEnsembleFusion(predictions: { item: string; mean: number; variance: number }[]): { item: string; score: number; uncertainty: number }[] {
    const grouped = new Map<string, { means: number[]; variances: number[] }>();
    for (const p of predictions) {
      const existing = grouped.get(p.item) || { means: [], variances: [] };
      existing.means.push(p.mean);
      existing.variances.push(p.variance);
      grouped.set(p.item, existing);
    }
    const result: { item: string; score: number; uncertainty: number }[] = [];
    for (const [item, data] of grouped) {
      const precisionWeights = data.variances.map(v => 1 / Math.max(0.0001, v));
      const totalPrecision = precisionWeights.reduce((a, b) => a + b, 0);
      const fusedMean = data.means.reduce((sum, m, i) => sum + m * precisionWeights[i], 0) / totalPrecision;
      const fusedVariance = 1 / totalPrecision;
      result.push({ item, score: Number(fusedMean.toFixed(4)), uncertainty: Number(fusedVariance.toFixed(4)) });
    }
    result.sort((a, b) => b.score - a.score);
    this._history.push({ op: 'bayesianEnsembleFusion', predictionCount: predictions.length });
    return result;
  }

  knowledgeGraphHybrid(entityEmbeddings: Map<string, number[]>, relationEmbeddings: Map<string, number[]>, query: string): { entity: string; score: number; path: string[] }[] {
    const results: { entity: string; score: number; path: string[] }[] = [];
    const queryEmb = entityEmbeddings.get(query) || new Array(64).fill(0).map(() => Math.random() - 0.5);
    for (const [entity, emb] of entityEmbeddings) {
      if (entity === query) continue;
      const score = this._cosineSimilarity(queryEmb, emb);
      results.push({ entity, score: Number(score.toFixed(4)), path: [query, entity] });
    }
    results.sort((a, b) => b.score - a.score);
    this._history.push({ op: 'knowledgeGraphHybrid', resultCount: results.length });
    return results.slice(0, 20);
  }

  private _computeDiversity(recs: string[]): number {
    const unique = new Set(recs);
    return recs.length > 0 ? unique.size / recs.length : 0;
  }

  private _itemSimilarity(a: string, b: string): number {
    const common = new Set([...a].filter(c => b.includes(c)));
    return common.size / Math.max(a.length, b.length, 1);
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private _seedComponents(): void {
    const components: HybridComponent[] = [
      { name: 'collaborative-filtering', type: 'collaborative', weight: 0.4, confidence: 0.8, latency: 50 },
      { name: 'content-based', type: 'content', weight: 0.3, confidence: 0.75, latency: 30 },
      { name: 'knowledge-graph', type: 'knowledge', weight: 0.15, confidence: 0.7, latency: 80 },
      { name: 'demographic', type: 'demographic', weight: 0.1, confidence: 0.6, latency: 10 },
      { name: 'contextual', type: 'contextual', weight: 0.05, confidence: 0.65, latency: 20 },
    ];
    for (const c of components) this._components.set(c.name, c);
  }

  /** Compute the weighted hybrid score for a single item. */
  weightedItemScore(item: string, scores: Record<string, number>, weights: Record<string, number>): number {
    let total = 0;
    let weightSum = 0;
    for (const [source, score] of Object.entries(scores)) {
      const w = weights[source] || 0;
      total += score * w;
      weightSum += w;
    }
    return weightSum > 0 ? Number((total / weightSum).toFixed(4)) : 0;
  }

  /** Compute the hybrid recommendation confidence. */
  hybridConfidence(componentConfidences: number[], weights: number[]): number {
    const weighted = componentConfidences.reduce((sum, c, i) => sum + c * (weights[i] || 0), 0);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    return weightSum > 0 ? Number((weighted / weightSum).toFixed(2)) : 0;
  }

  /** Compute the hybrid cold-start coverage. */
  hybridColdStartCoverage(coldStartItems: string[], hybridRecs: string[]): number {
    const recSet = new Set(hybridRecs);
    const covered = coldStartItems.filter(item => recSet.has(item)).length;
    return coldStartItems.length > 0 ? Number((covered / coldStartItems.length).toFixed(2)) : 0;
  }

  /** Compute the ensemble variance reduction. */
  ensembleVarianceReduction(individualVariances: number[], ensembleVariance: number): number {
    const avgVariance = individualVariances.reduce((a, b) => a + b, 0) / individualVariances.length;
    return avgVariance > 0 ? Number(((avgVariance - ensembleVariance) / avgVariance).toFixed(2)) : 0;
  }

  /** Compute the stacked generalization meta-feature. */
  stackedMetaFeature(basePredictions: number[]): number[] {
    const mean = basePredictions.reduce((a, b) => a + b, 0) / basePredictions.length;
    const variance = basePredictions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / basePredictions.length;
    const min = Math.min(...basePredictions);
    const max = Math.max(...basePredictions);
    return [mean, variance, min, max, max - min];
  }

  /** Compute the blending optimization objective. */
  blendingObjective(weights: number[], errors: number[]): number {
    let obj = 0;
    for (let i = 0; i < weights.length; i++) {
      obj += weights[i] * errors[i];
    }
    return Number(obj.toFixed(4));
  }

  /** Compute the hybrid latency estimate. */
  hybridLatencyEstimate(componentLatencies: number[], parallel: boolean = false): number {
    if (parallel) return Number(Math.max(...componentLatencies).toFixed(2));
    return Number(componentLatencies.reduce((a, b) => a + b, 0).toFixed(2));
  }

  /** Compute the dynamic weight based on user feedback. */
  dynamicWeightFeedback(currentWeight: number, feedback: number, alpha: number = 0.1): number {
    return Number(Math.max(0, Math.min(1, currentWeight + alpha * feedback)).toFixed(4));
  }

  /** Compute the recommendation freshness score. */
  freshnessScore(recTimestamps: number[], currentTime: number, decayRate: number = 0.001): number {
    const ages = recTimestamps.map(t => currentTime - t);
    const freshScore = ages.reduce((sum, age) => sum + Math.exp(-decayRate * age), 0) / ages.length;
    return Number(freshScore.toFixed(2));
  }

  /** Compute the hybrid serendipity score. */
  hybridSerendipity(hybridRecs: string[], userProfile: string[], popularItems: string[]): number {
    const popSet = new Set(popularItems);
    const profileSet = new Set(userProfile);
    let serendipity = 0;
    for (const rec of hybridRecs) {
      if (!profileSet.has(rec) && !popSet.has(rec)) serendipity++;
    }
    return hybridRecs.length > 0 ? Number((serendipity / hybridRecs.length).toFixed(2)) : 0;
  }

  /** Compute the hybrid novelty score. */
  hybridNovelty(hybridRecs: string[], userHistory: string[]): number {
    const histSet = new Set(userHistory);
    const novel = hybridRecs.filter(r => !histSet.has(r)).length;
    return hybridRecs.length > 0 ? Number((novel / hybridRecs.length).toFixed(2)) : 0;
  }

  /** Compute the hybrid trust score. */
  hybridTrust(explanationQuality: number, transparency: number, userControl: number): number {
    return Number(((explanationQuality + transparency + userControl) / 3).toFixed(2));
  }

  /** Compute the multi-objective hybrid score. */
  multiObjectiveHybrid(accuracy: number, diversity: number, novelty: number, coverage: number, weights: number[] = [0.4, 0.2, 0.2, 0.2]): number {
    const objectives = [accuracy, diversity, novelty, coverage];
    let score = 0;
    for (let i = 0; i < objectives.length; i++) {
      score += objectives[i] * (weights[i] ?? 0.25);
    }
    return Number(score.toFixed(2));
  }

  /** Compute the Pareto frontier for hybrid objectives. */
  paretoFrontier(solutions: { accuracy: number; diversity: number }[]): { accuracy: number; diversity: number }[] {
    const sorted = [...solutions].sort((a, b) => b.accuracy - a.accuracy);
    const frontier: { accuracy: number; diversity: number }[] = [];
    let maxDiversity = -Infinity;
    for (const sol of sorted) {
      if (sol.diversity >= maxDiversity) {
        frontier.push(sol);
        maxDiversity = sol.diversity;
      }
    }
    return frontier;
  }

  /** Compute the Nash equilibrium for multi-stakeholder recommendation. */
  nashEquilibrium(stakeholderUtilities: number[][]): number[] {
    const n = stakeholderUtilities.length;
    const strategies = stakeholderUtilities.map(u => u.indexOf(Math.max(...u)));
    return strategies;
  }

  /** Compute the social welfare of a hybrid recommendation. */
  socialWelfare(utilities: number[], fairnessWeight: number = 0.5): number {
    const sum = utilities.reduce((a, b) => a + b, 0);
    const min = Math.min(...utilities);
    return Number(((1 - fairnessWeight) * sum / utilities.length + fairnessWeight * min).toFixed(2));
  }

  /** Compute the Gini coefficient for recommendation exposure fairness. */
  giniCoefficient(exposures: number[]): number {
    const sorted = [...exposures].sort((a, b) => a - b);
    let sum = 0;
    for (let i = 0; i < sorted.length; i++) {
      sum += (2 * (i + 1) - sorted.length - 1) * sorted[i];
    }
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    return mean === 0 ? 0 : Number((sum / (sorted.length * sorted.length * mean)).toFixed(2));
  }

  /** Compute the hybrid recommendation calibration. */
  calibration(userPreferences: Record<string, number>, recDistribution: Record<string, number>): number {
    let divergence = 0;
    for (const [genre, pref] of Object.entries(userPreferences)) {
      const rec = recDistribution[genre] || 0;
      divergence += Math.abs(pref - rec);
    }
    return Number((1 - divergence / 2).toFixed(2));
  }

  /** Compute the filter bubble index. */
  filterBubbleIndex(recDiversity: number, userDiversity: number): number {
    return Number((1 - recDiversity / Math.max(0.0001, userDiversity)).toFixed(2));
  }

  /** Compute the echo chamber strength. */
  echoChamberStrength(userHistory: string[], recs: string[], similarityFn: (a: string, b: string) => number): number {
    let totalSim = 0;
    let count = 0;
    for (const rec of recs) {
      for (const hist of userHistory) {
        totalSim += similarityFn(rec, hist);
        count++;
      }
    }
    return count > 0 ? Number((totalSim / count).toFixed(2)) : 0;
  }

  /** Compute the recommendation surprise score. */
  surpriseScore(expectedProbability: number, actualProbability: number): number {
    return Number((-Math.log(Math.max(0.0001, expectedProbability)) * actualProbability).toFixed(2));
  }

  /** Compute the hybrid recommendation consistency across sessions. */
  sessionConsistency(sessionRecs: string[][]): number {
    if (sessionRecs.length < 2) return 1;
    let totalOverlap = 0;
    for (let i = 1; i < sessionRecs.length; i++) {
      const prevSet = new Set(sessionRecs[i - 1]);
      const overlap = sessionRecs[i].filter(r => prevSet.has(r)).length;
      totalOverlap += overlap / Math.max(sessionRecs[i].length, sessionRecs[i - 1].length);
    }
    return Number((totalOverlap / (sessionRecs.length - 1)).toFixed(2));
  }

  /** Compute the long-term user satisfaction prediction. */
  longTermSatisfaction(shortTermClicks: number, diversity: number, novelty: number, fatigue: number): number {
    return Number((shortTermClicks * 0.3 + diversity * 0.3 + novelty * 0.3 - fatigue * 0.1).toFixed(2));
  }

  toPacket(): DataPacket<{
    results: number;
    strategy: string | null;
    method: string;
    components: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['recommendation', 'HybridRecommender'],
      priority: 1,
      phase: 'hybrid-recommender',
    };
    return {
      id: `hybrid-recommender-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        results: this._results.length,
        strategy: this._strategy?.type ?? null,
        method: this._method,
        components: this._components.size,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._results = [];
    this._strategy = null;
    this._counter = 0;
    this._method = 'weighted';
    this._lastResult = null;
    this._components.clear();
    this._ensembleConfigs = [];
    this._crossDomainMappings = [];
    this._deepConfigs = [];
    this._history = [];
    this._seedComponents();
  }
}
