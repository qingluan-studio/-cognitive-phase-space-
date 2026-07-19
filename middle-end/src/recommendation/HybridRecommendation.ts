import { DataPacket } from '../shared/types';

export interface RecommendedItem {
  itemId: string;
  score: number;
  confidence: number;
  source: string;
  rank: number;
  explanation: string;
}

export interface HybridResult {
  recommendations: RecommendedItem[];
  method: string;
  totalItems: number;
  timestamp: number;
}

export interface WeightedConfig {
  collaborativeWeight: number;
  contentWeight: number;
  popularityWeight: number;
  diversityWeight: number;
}

export interface SwitchingConfig {
  coldStartThreshold: number;
  dataSparsityThreshold: number;
  diversityThreshold: number;
}

export interface CascadeConfig {
  firstStageSize: number;
  secondStageSize: number;
  stages: string[];
}

export interface FeatureWeight {
  feature: string;
  weight: number;
  source: string;
}

export interface HybridStrategy {
  type: 'weighted' | 'switching' | 'cascade' | 'mixed' | 'feature-combination' | 'meta-level';
  config: WeightedConfig | SwitchingConfig | CascadeConfig;
}

export interface RecommendationSource {
  name: string;
  recommendations: RecommendedItem[];
  weight: number;
  quality: number;
}

export class HybridRecommendation {
  private _results: HybridResult | null = null;
  private _counter: number = 0;
  private _method: string = 'weighted';
  private _lastRecommendations: RecommendedItem[] = [];
  private _sources: RecommendationSource[] = [];
  private _weightedConfig: WeightedConfig = {
    collaborativeWeight: 0.4,
    contentWeight: 0.3,
    popularityWeight: 0.15,
    diversityWeight: 0.15
  };
  private _switchingConfig: SwitchingConfig = {
    coldStartThreshold: 5,
    dataSparsityThreshold: 0.5,
    diversityThreshold: 0.3
  };
  private _cascadeConfig: CascadeConfig = {
    firstStageSize: 100,
    secondStageSize: 10,
    stages: ['collaborative', 'content']
  };
  private _strategy: HybridStrategy = {
    type: 'weighted',
    config: {
      collaborativeWeight: 0.4,
      contentWeight: 0.3,
      popularityWeight: 0.15,
      diversityWeight: 0.15
    }
  };
  private _normalizationMethod: 'min-max' | 'z-score' | 'rank' = 'min-max';
  private _diversityPenalty: number = 0.1;
  private _popularityCache: Map<string, number> = new Map();
  private _itemCategories: Map<string, string[]> = new Map();

  constructor() {
    this._initializeDefaults();
  }

  private _initializeDefaults(): void {
    this._sources = [];
    this._popularityCache.clear();
    this._itemCategories.clear();
  }

  get results(): HybridResult | null {
    return this._results;
  }

  get method(): string {
    return this._method;
  }

  get strategy(): HybridStrategy {
    return { ...this._strategy };
  }

  get weightedConfig(): WeightedConfig {
    return { ...this._weightedConfig };
  }

  get switchingConfig(): SwitchingConfig {
    return { ...this._switchingConfig };
  }

  get cascadeConfig(): CascadeConfig {
    return { ...this._cascadeConfig };
  }

  get lastRecommendations(): RecommendedItem[] {
    return this._lastRecommendations;
  }

  get sourceCount(): number {
    return this._sources.length;
  }

  setStrategy(strategy: Partial<HybridStrategy>): void {
    this._strategy = { ...this._strategy, ...strategy };
  }

  setWeightedConfig(config: Partial<WeightedConfig>): void {
    this._weightedConfig = { ...this._weightedConfig, ...config };
  }

  setSwitchingConfig(config: Partial<SwitchingConfig>): void {
    this._switchingConfig = { ...this._switchingConfig, ...config };
  }

  setCascadeConfig(config: Partial<CascadeConfig>): void {
    this._cascadeConfig = { ...this._cascadeConfig, ...config };
  }

  setNormalizationMethod(method: 'min-max' | 'z-score' | 'rank'): void {
    this._normalizationMethod = method;
  }

  setPopularity(itemId: string, popularity: number): void {
    this._popularityCache.set(itemId, popularity);
  }

  setItemCategories(itemId: string, categories: string[]): void {
    this._itemCategories.set(itemId, categories);
  }

  addSource(source: RecommendationSource): void {
    this._sources.push(source);
  }

  clearSources(): void {
    this._sources = [];
  }

  weightedHybrid(
    sources: RecommendationSource[],
    topN: number = 10
  ): RecommendedItem[] {
    const normalizedSources = sources.map(source => ({
      ...source,
      recommendations: this._normalizeScores(source.recommendations)
    }));

    const itemScores = new Map<string, { score: number; confidence: number; sources: string[]; explanations: string[] }>();

    for (const source of normalizedSources) {
      for (const item of source.recommendations) {
        const weightedScore = item.score * source.weight;
        const current = itemScores.get(item.itemId) || {
          score: 0,
          confidence: 0,
          sources: [],
          explanations: []
        };
        current.score += weightedScore;
        current.confidence = Math.max(current.confidence, item.confidence * source.weight);
        current.sources.push(source.name);
        current.explanations.push(item.explanation);
        itemScores.set(item.itemId, current);
      }
    }

    let recommendations: RecommendedItem[] = [];
    for (const [itemId, data] of itemScores) {
      const popularity = this._popularityCache.get(itemId) || 0;
      const popularityBonus = popularity * this._weightedConfig.popularityWeight;
      const finalScore = data.score + popularityBonus;

      recommendations.push({
        itemId,
        score: finalScore,
        confidence: data.confidence,
        source: data.sources.join(', '),
        rank: 0,
        explanation: `综合推荐来源: ${data.sources.join(', ')}`
      });
    }

    recommendations = this._applyDiversityEnhancement(recommendations);
    recommendations.sort((a, b) => b.score - a.score);
    recommendations = recommendations.map((item, idx) => ({ ...item, rank: idx + 1 }));

    this._lastRecommendations = recommendations.slice(0, topN);
    this._method = 'weighted';
    this._method = 'weighted-hybrid';
    this._counter++;
    this._results = {
      recommendations: this._lastRecommendations,
      method: 'weighted',
      totalItems: recommendations.length,
      timestamp: Date.now()
    };

    return this._lastRecommendations;
  }

  switchingHybrid(
    userId: string,
    userHistory: string[],
    sources: Map<string, RecommendationSource>,
    topN: number = 10
  ): RecommendedItem[] {
    const selectedMethod = this._selectStrategy(userId, userHistory, sources);
    const source = sources.get(selectedMethod);

    if (!source) {
      return [];
    }

    const recommendations = source.recommendations
      .map((item, idx) => ({
      ...item,
      rank: idx + 1,
      explanation: `切换策略选择: ${selectedMethod} - ${item.explanation}`
    }))
      .slice(0, topN);

    this._lastRecommendations = recommendations;
    this._method = `switching-${selectedMethod}`;
    this._counter++;
    this._results = {
      recommendations: this._lastRecommendations,
      method: `switching:${selectedMethod}`,
      totalItems: source.recommendations.length,
      timestamp: Date.now()
    };

    return this._lastRecommendations;
  }

  private _selectStrategy(
    userId: string,
    userHistory: string[],
    sources: Map<string, RecommendationSource>
  ): string {
    const historyLength = userHistory.length;

    if (historyLength < this._switchingConfig.coldStartThreshold) {
      if (sources.has('content')) return 'content';
      if (sources.has('popularity')) return 'popularity';
    }

    const sparsity = this._calculateDataSparsity(userHistory);
    if (sparsity > this._switchingConfig.dataSparsityThreshold) {
      if (sources.has('content')) return 'content';
    }

    if (sources.has('collaborative')) return 'collaborative';
    if (sources.has('content')) return 'content';

    return sources.keys().next().value || 'popularity';
  }

  private _calculateDataSparsity(history: string[]): number {
    if (history.length === 0) return 1;
    const totalPossible = 1000;
    return 1 - history.length / totalPossible;
  }

  cascadeHybrid(
    stages: { name: string; recommendations: RecommendedItem[] }[],
    topN: number = 10
  ): RecommendedItem[] {
    if (stages.length === 0) return [];

    let currentCandidates = stages[0].recommendations;

    for (let i = 1; i < stages.length; i++) {
      const stage = stages[i];
      const stageItems = new Map(stage.recommendations.map(r => [r.itemId, r]));

      const reranked: RecommendedItem[] = [];
      for (const candidate of currentCandidates) {
        const stageItem = stageItems.get(candidate.itemId);
        if (stageItem) {
          const combinedScore = candidate.score * 0.6 + stageItem.score * 0.4;
          reranked.push({
            ...candidate,
            score: combinedScore,
            source: `${candidate.source} -> ${stage.name}`,
            explanation: `级联过滤: ${candidate.explanation} | ${stageItem.explanation}`
          });
        } else {
          reranked.push(candidate);
        }
      }

      reranked.sort((a, b) => b.score - a.score);
      currentCandidates = reranked.slice(0, this._cascadeConfig.secondStageSize * 2);
    }

    const recommendations = currentCandidates
      .map((item, idx) => ({ ...item, rank: idx + 1 }))
      .slice(0, topN);

    this._lastRecommendations = recommendations;
    this._method = 'cascade-hybrid';
    this._counter++;
    this._results = {
      recommendations: this._lastRecommendations,
      method: 'cascade',
      totalItems: currentCandidates.length,
      timestamp: Date.now()
    };

    return this._lastRecommendations;
  }

  mixedHybrid(
    sources: RecommendationSource[],
    topN: number = 10
  ): RecommendedItem[] {
    const allItems = new Set<string>();
    for (const source of sources) {
      for (const item of source.recommendations) {
        allItems.add(item.itemId);
      }
    }

    const itemRankScores = new Map<string, number>();
    const itemSources = new Map<string, string[]>();
    const itemExplanations = new Map<string, string[]>();
    const itemConfidences = new Map<string, number>();

    for (const source of sources) {
      for (let i = 0; i < source.recommendations.length; i++) {
        const item = source.recommendations[i];
        const rankScore = 1 / (i + 1);
        const weightedRank = rankScore * source.weight;

        itemRankScores.set(
          item.itemId,
          (itemRankScores.get(item.itemId) || 0) + weightedRank
        );

        const sourcesList = itemSources.get(item.itemId) || [];
        sourcesList.push(source.name);
        itemSources.set(item.itemId, sourcesList);

        const explanations = itemExplanations.get(item.itemId) || [];
        explanations.push(item.explanation);
        itemExplanations.set(item.itemId, explanations);

        itemConfidences.set(
          item.itemId,
          Math.max(itemConfidences.get(item.itemId) || 0, item.confidence)
        );
      }
    }

    let recommendations: RecommendedItem[] = [];
    for (const itemId of allItems) {
      recommendations.push({
        itemId,
        score: itemRankScores.get(itemId) || 0,
        confidence: itemConfidences.get(itemId) || 0,
        source: (itemSources.get(itemId) || []).join(', '),
        rank: 0,
        explanation: `混合推荐: 来自 ${(itemSources.get(itemId) || []).length} 个来源`
      });
    }

    recommendations.sort((a, b) => b.score - a.score);
    recommendations = recommendations.map((item, idx) => ({ ...item, rank: idx + 1 }));

    this._lastRecommendations = recommendations.slice(0, topN);
    this._method = 'mixed-hybrid';
    this._counter++;
    this._results = {
      recommendations: this._lastRecommendations,
      method: 'mixed',
      totalItems: recommendations.length,
      timestamp: Date.now()
    };

    return this._lastRecommendations;
  }

  featureCombinationHybrid(
    featureWeights: FeatureWeight[][],
    topN: number = 10
  ): RecommendedItem[] {
    const itemScores = new Map<string, { score: number; features: string[] }>();

    for (const featureSet of featureWeights) {
      for (const fw of featureSet) {
        const current = itemScores.get(fw.feature) || { score: 0, features: [] };
        current.score += fw.weight;
        current.features.push(fw.source);
        itemScores.set(fw.feature, current);
      }
    }

    const recommendations: RecommendedItem[] = [];
    for (const [itemId, data] of itemScores) {
      recommendations.push({
        itemId,
        score: data.score,
        confidence: Math.min(1, data.features.length / featureWeights.length),
        source: data.features.join(', '),
        rank: 0,
        explanation: `特征组合: 融合 ${data.features.length} 个特征维度`
      });
    }

    recommendations.sort((a, b) => b.score - a.score);
    const finalRecs = recommendations.map((item, idx) => ({ ...item, rank: idx + 1 })).slice(0, topN);

    this._lastRecommendations = finalRecs;
    this._method = 'feature-combination';
    this._counter++;
    this._results = {
      recommendations: this._lastRecommendations,
      method: 'feature-combination',
      totalItems: recommendations.length,
      timestamp: Date.now()
    };

    return this._lastRecommendations;
  }

  metaLevelHybrid(
    baseRecommendations: RecommendedItem[],
    metaFeatures: Map<string, number[]>,
    metaWeights: number[],
    topN: number = 10
  ): RecommendedItem[] {
    const recommendations = baseRecommendations.map(item => {
      const features = metaFeatures.get(item.itemId) || [];
      let metaScore = 0;
      for (let i = 0; i < Math.min(features.length, metaWeights.length); i++) {
        metaScore += features[i] * metaWeights[i];
      }
      const finalScore = item.score * 0.7 + metaScore * 0.3;
      return {
        ...item,
        score: finalScore,
        explanation: `${item.explanation} (元学习调整)`
      };
    });

    recommendations.sort((a, b) => b.score - a.score);
    const finalRecs = recommendations.map((item, idx) => ({ ...item, rank: idx + 1 })).slice(0, topN);

    this._lastRecommendations = finalRecs;
    this._method = 'meta-level';
    this._counter++;
    this._results = {
      recommendations: this._lastRecommendations,
      method: 'meta-level',
      totalItems: baseRecommendations.length,
      timestamp: Date.now()
    };

    return this._lastRecommendations;
  }

  private _normalizeScores(recommendations: RecommendedItem[]): RecommendedItem[] {
    if (recommendations.length === 0) return recommendations;

    const method = this._normalizationMethod;

    if (method === 'min-max') {
      return this._minMaxNormalize(recommendations);
    } else if (method === 'z-score') {
      return this._zScoreNormalize(recommendations);
    } else {
      return this._rankNormalize(recommendations);
    }
  }

  private _minMaxNormalize(recommendations: RecommendedItem[]): RecommendedItem[] {
    const scores = recommendations.map(r => r.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min;

    if (range === 0) {
      return recommendations.map(r => ({ ...r, score: 0.5 }));
    }

    return recommendations.map(r => ({
      ...r,
      score: (r.score - min) / range
    }));
  }

  private _zScoreNormalize(recommendations: RecommendedItem[]): RecommendedItem[] {
    const scores = recommendations.map(r => r.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
    const std = Math.sqrt(variance);

    if (std === 0) {
      return recommendations.map(r => ({ ...r, score: 0.5 }));
    }

    return recommendations.map(r => ({
      ...r,
      score: 0.5 + (r.score - mean) / (std * 4)
    }));
  }

  private _rankNormalize(recommendations: RecommendedItem[]): RecommendedItem[] {
    const n = recommendations.length;
    return recommendations
      .sort((a, b) => b.score - a.score)
      .map((r, idx) => ({
        ...r,
        score: 1 - idx / n
      }));
  }

  private _applyDiversityEnhancement(recommendations: RecommendedItem[]): RecommendedItem[] {
    if (this._diversityPenalty === 0) return recommendations;

    const seenCategories = new Set<string>();
    const penalized: RecommendedItem[] = [];

    for (const item of recommendations) {
      const categories = this._itemCategories.get(item.itemId) || [];
      let penalty = 0;

      for (const cat of categories) {
        if (seenCategories.has(cat)) {
          penalty += this._diversityPenalty;
        }
      }

      const newScore = Math.max(0, item.score - penalty);
      penalized.push({ ...item, score: newScore });

      for (const cat of categories) {
        seenCategories.add(cat);
      }
    }

    return penalized;
  }

  calculateDiversity(recommendations: RecommendedItem[]): number {
    const categories = new Set<string>();
    let totalCategories = 0;

    for (const item of recommendations) {
      const cats = this._itemCategories.get(item.itemId) || [];
      cats.forEach(c => categories.add(c));
      totalCategories += cats.length;
    }

    return totalCategories > 0 ? categories.size / totalCategories : 0;
  }

  calculateCoverage(recommendations: RecommendedItem[], totalItems: number): number {
    return totalItems > 0 ? recommendations.length / totalItems : 0;
  }

  calculateNovelty(
    recommendations: RecommendedItem[],
    userHistory: string[]
  ): number {
    const historySet = new Set(userHistory);
    let novelCount = 0;

    for (const item of recommendations) {
      if (!historySet.has(item.itemId)) {
        novelCount++;
      }
    }

    return recommendations.length > 0 ? novelCount / recommendations.length : 0;
  }

  calculateSerendipity(
    recommendations: RecommendedItem[],
    userHistory: string[],
    expectedItems: string[]
  ): number {
    const historySet = new Set(userHistory);
    const expectedSet = new Set(expectedItems);
    let serendipitous = 0;

    for (const item of recommendations) {
      if (!historySet.has(item.itemId) && !expectedSet.has(item.itemId)) {
        serendipitous++;
      }
    }

    return recommendations.length > 0 ? serendipitous / recommendations.length : 0;
  }

  blendRecommendations(
    recA: RecommendedItem[],
    recB: RecommendedItem[],
    ratioA: number = 0.5,
    topN: number = 10
  ): RecommendedItem[] {
    const normA = this._normalizeScores(recA);
    const normB = this._normalizeScores(recB);

    const itemMap = new Map<string, RecommendedItem>();

    for (const item of normA) {
      itemMap.set(item.itemId, {
        ...item,
        score: item.score * ratioA,
        source: item.source
      });
    }

    for (const item of normB) {
      const existing = itemMap.get(item.itemId);
      if (existing) {
        existing.score += item.score * (1 - ratioA);
        existing.source = `${existing.source}, ${item.source}`;
        existing.explanation = `${existing.explanation}; ${item.explanation}`;
      } else {
        itemMap.set(item.itemId, {
          ...item,
          score: item.score * (1 - ratioA),
          source: item.source
        });
      }
    }

    const result = Array.from(itemMap.values())
      .sort((a, b) => b.score - a.score)
      .map((item, idx) => ({ ...item, rank: idx + 1 }))
      .slice(0, topN);

    this._lastRecommendations = result;
    this._method = 'blend';
    this._counter++;

    return result;
  }

  rerankWithDiversity(
    recommendations: RecommendedItem[],
    topN: number = 10,
    lambda: number = 0.5
  ): RecommendedItem[] {
    if (recommendations.length <= topN) return recommendations;

    const selected: RecommendedItem[] = [];
    const remaining = [...recommendations];
    const selectedCategories = new Set<string>();

    while (selected.length < topN && remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        const categories = this._itemCategories.get(item.itemId) || [];
        let diversityBonus = 0;

        for (const cat of categories) {
          if (!selectedCategories.has(cat)) {
            diversityBonus += 0.1;
          }
        }

        const adjustedScore = item.score * (1 - lambda) + diversityBonus * lambda;
        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestIndex = i;
        }
      }

      const bestItem = remaining.splice(bestIndex, 1)[0];
      selected.push(bestItem);
      const cats = this._itemCategories.get(bestItem.itemId) || [];
      cats.forEach(c => selectedCategories.add(c));
    }

    return selected.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }

  toPacket(): DataPacket<HybridResult> {
    const result: HybridResult = this._results || {
      recommendations: this._lastRecommendations,
      method: this._method,
      totalItems: this._lastRecommendations.length,
      timestamp: Date.now()
    };
    this._counter++;
    return {
      id: `hybrid-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'hybrid'],
        priority: 1,
        phase: 'hybrid-recommendation'
      }
    };
  }

  reset(): void {
    this._results = null;
    this._counter = 0;
    this._method = 'weighted';
    this._lastRecommendations = [];
    this._sources = [];
    this._weightedConfig = {
      collaborativeWeight: 0.4,
      contentWeight: 0.3,
      popularityWeight: 0.15,
      diversityWeight: 0.15
    };
    this._switchingConfig = {
      coldStartThreshold: 5,
      dataSparsityThreshold: 0.5,
      diversityThreshold: 0.3
    };
    this._cascadeConfig = {
      firstStageSize: 100,
      secondStageSize: 10,
      stages: ['collaborative', 'content']
    };
    this._strategy = {
      type: 'weighted',
      config: this._weightedConfig
    };
    this._normalizationMethod = 'min-max';
    this._diversityPenalty = 0.1;
    this._popularityCache.clear();
    this._itemCategories.clear();
  }
}
