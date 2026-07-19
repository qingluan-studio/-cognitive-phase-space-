import { DataPacket } from '../shared/types';

export interface RankingFeature {
  name: string;
  value: number;
  weight: number;
  category: 'user' | 'item' | 'context' | 'interaction';
}

export interface RankedItem {
  itemId: string;
  score: number;
  rank: number;
  confidence: number;
  features: RankingFeature[];
  explanation: string;
}

export interface RankingResult {
  items: RankedItem[];
  model: string;
  totalItems: number;
  timestamp: number;
}

export interface LRModel {
  weights: Map<string, number>;
  bias: number;
  featureNames: string[];
  regularization: number;
  learningRate: number;
}

export interface GBDTConfig {
  trees: number;
  maxDepth: number;
  learningRate: number;
  minSamplesLeaf: number;
  subsample: number;
  lossFunction: 'mse' | 'logistic' | 'binary';
}

export interface DNNConfig {
  layers: number[];
  activation: 'relu' | 'sigmoid' | 'tanh' | 'leaky-relu';
  learningRate: number;
  dropout: number;
  epochs: number;
  batchSize: number;
  optimizer: 'sgd' | 'adam' | 'rmsprop';
}

export interface MultiObjectiveConfig {
  objectives: Array<{
    name: string;
    weight: number;
    target: number;
  }>;
  tradeoff: 'weighted-sum' | 'pareto' | 'epsilon-constraint';
}

export interface TrainingSample {
  features: Map<string, number>;
  label: number;
  weight?: number;
}

export class RankingModel {
  private _rankedItems: RankedItem[] = [];
  private _counter: number = 0;
  private _model: string = 'lr';
  private _lastResult: RankingResult | null = null;
  private _lrModel: LRModel = {
    weights: new Map(),
    bias: 0,
    featureNames: [],
    regularization: 0.01,
    learningRate: 0.01
  };
  private _gbdtConfig: GBDTConfig = {
    trees: 100,
    maxDepth: 6,
    learningRate: 0.1,
    minSamplesLeaf: 10,
    subsample: 0.8,
    lossFunction: 'mse'
  };
  private _dnnConfig: DNNConfig = {
    layers: [256, 128, 64],
    activation: 'relu',
    learningRate: 0.001,
    dropout: 0.2,
    epochs: 50,
    batchSize: 64,
    optimizer: 'adam'
  };
  private _multiObjConfig: MultiObjectiveConfig = {
    objectives: [
      { name: 'click', weight: 0.4, target: 0.5 },
      { name: 'conversion', weight: 0.3, target: 0.3 },
      { name: 'dwell-time', weight: 0.3, target: 0.4 }
    ],
    tradeoff: 'weighted-sum'
  };
  private _featureImportance: Map<string, number> = new Map();
  private _trainingSamples: TrainingSample[] = [];

  constructor() {
    this._initializeDefaultModel();
  }

  private _initializeDefaultModel(): void {
    const defaultFeatures = ['ctr', 'cvr', 'quality', 'popularity', 'recency', 'diversity'];
    this._lrModel.featureNames = defaultFeatures;
    for (const feature of defaultFeatures) {
      this._lrModel.weights.set(feature, 0.1);
    }
  }

  get rankedItems(): RankedItem[] {
    return this._rankedItems;
  }

  get model(): string {
    return this._model;
  }

  get lastResult(): RankingResult | null {
    return this._lastResult;
  }

  get lrModel(): LRModel {
    return {
      ...this._lrModel,
      weights: new Map(this._lrModel.weights)
    };
  }

  get gbdtConfig(): GBDTConfig {
    return { ...this._gbdtConfig };
  }

  get dnnConfig(): DNNConfig {
    return { ...this._dnnConfig };
  }

  get multiObjConfig(): MultiObjectiveConfig {
    return {
      ...this._multiObjConfig,
      objectives: [...this._multiObjConfig.objectives]
    };
  }

  get featureImportance(): Map<string, number> {
    return new Map(this._featureImportance);
  }

  get trainingSampleCount(): number {
    return this._trainingSamples.length;
  }

  setModel(model: string): void {
    this._model = model;
  }

  setLRWeights(weights: Record<string, number>): void {
    for (const [feature, weight] of Object.entries(weights)) {
      this._lrModel.weights.set(feature, weight);
      if (!this._lrModel.featureNames.includes(feature)) {
        this._lrModel.featureNames.push(feature);
      }
    }
  }

  setGBDTConfig(config: Partial<GBDTConfig>): void {
    this._gbdtConfig = { ...this._gbdtConfig, ...config };
  }

  setDNNConfig(config: Partial<DNNConfig>): void {
    this._dnnConfig = { ...this._dnnConfig, ...config };
  }

  setMultiObjConfig(config: Partial<MultiObjectiveConfig>): void {
    this._multiObjConfig = { ...this._multiObjConfig, ...config };
  }

  addTrainingSample(sample: TrainingSample): void {
    this._trainingSamples.push(sample);
  }

  lrRank(items: Array<{ itemId: string; features: Map<string, number> }>): RankedItem[] {
    const ranked: RankedItem[] = [];

    for (const item of items) {
      const { score, features } = this._lrPredict(item.itemId, item.features);
      ranked.push({
        itemId: item.itemId,
        score,
        rank: 0,
        confidence: Math.min(1, Math.abs(score - 0.5) * 2),
        features,
        explanation: this._generateExplanation(features, 'lr')
      });
    }

    ranked.sort((a, b) => b.score - a.score);
    ranked.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    this._rankedItems = ranked;
    this._model = 'lr';
    this._lastResult = {
      items: ranked,
      model: 'lr',
      totalItems: ranked.length,
      timestamp: Date.now()
    };
    this._counter++;

    return ranked;
  }

  private _lrPredict(
    itemId: string,
    features: Map<string, number>
  ): { score: number; features: RankingFeature[] } {
    let score = this._lrModel.bias;
    const rankingFeatures: RankingFeature[] = [];

    for (const [name, value] of features) {
      const weight = this._lrModel.weights.get(name) || 0;
      score += value * weight;
      rankingFeatures.push({
        name,
        value,
        weight,
        category: this._getFeatureCategory(name)
      });
    }

    const sigmoidScore = 1 / (1 + Math.exp(-score));

    return { score: sigmoidScore, features: rankingFeatures };
  }

  gbdtRank(items: Array<{ itemId: string; features: Map<string, number> }>): RankedItem[] {
    const ranked: RankedItem[] = [];

    for (const item of items) {
      const { score, features } = this._gbdtPredict(item.itemId, item.features);
      ranked.push({
        itemId: item.itemId,
        score,
        rank: 0,
        confidence: 0.7,
        features,
        explanation: this._generateExplanation(features, 'gbdt')
      });
    }

    ranked.sort((a, b) => b.score - a.score);
    ranked.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    this._rankedItems = ranked;
    this._model = 'gbdt';
    this._lastResult = {
      items: ranked,
      model: 'gbdt',
      totalItems: ranked.length,
      timestamp: Date.now()
    };
    this._counter++;

    return ranked;
  }

  private _gbdtPredict(
    itemId: string,
    features: Map<string, number>
  ): { score: number; features: RankingFeature[] } {
    let score = 0;
    const rankingFeatures: RankingFeature[] = [];
    const { trees, learningRate } = this._gbdtConfig;

    for (const [name, value] of features) {
      const importance = this._featureImportance.get(name) || 0.1;
      score += value * importance * learningRate;
      rankingFeatures.push({
        name,
        value,
        weight: importance,
        category: this._getFeatureCategory(name)
      });
    }

    const normalizedScore = 1 / (1 + Math.exp(-score));

    return { score: normalizedScore, features: rankingFeatures };
  }

  dnnRank(items: Array<{ itemId: string; features: Map<string, number> }>): RankedItem[] {
    const ranked: RankedItem[] = [];

    for (const item of items) {
      const { score, features } = this._dnnPredict(item.itemId, item.features);
      ranked.push({
        itemId: item.itemId,
        score,
        rank: 0,
        confidence: 0.75,
        features,
        explanation: this._generateExplanation(features, 'dnn')
      });
    }

    ranked.sort((a, b) => b.score - a.score);
    ranked.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    this._rankedItems = ranked;
    this._model = 'dnn';
    this._lastResult = {
      items: ranked,
      model: 'dnn',
      totalItems: ranked.length,
      timestamp: Date.now()
    };
    this._counter++;

    return ranked;
  }

  private _dnnPredict(
    itemId: string,
    features: Map<string, number>
  ): { score: number; features: RankingFeature[] } {
    const rankingFeatures: RankingFeature[] = [];
    const featureVec: number[] = [];
    const featureNames: string[] = [];

    for (const [name, value] of features) {
      featureVec.push(value);
      featureNames.push(name);
      rankingFeatures.push({
        name,
        value,
        weight: 0,
        category: this._getFeatureCategory(name)
      });
    }

    let score = this._forwardPass(featureVec);

    for (let i = 0; i < rankingFeatures.length; i++) {
      rankingFeatures[i].weight = Math.abs(featureVec[i] || 0) / (featureVec.length || 1);
    }

    return { score, features: rankingFeatures };
  }

  private _forwardPass(input: number[]): number {
    const layers = this._dnnConfig.layers;
    let current = [...input];

    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layerSize = layers[layerIdx];
      const next: number[] = [];

      for (let i = 0; i < layerSize; i++) {
        let sum = 0;
        for (let j = 0; j < current.length; j++) {
          sum += current[j] * (Math.random() * 0.1 - 0.05);
        }
        next.push(this._activate(sum, this._dnnConfig.activation));
      }

      current = next;
    }

    let finalScore = 0;
    for (let i = 0; i < current.length; i++) {
      finalScore += current[i] * (Math.random() * 0.1 + 0.05);
    }

    return 1 / (1 + Math.exp(-finalScore));
  }

  private _activate(x: number, activation: string): number {
    switch (activation) {
      case 'relu':
        return Math.max(0, x);
      case 'sigmoid':
        return 1 / (1 + Math.exp(-x));
      case 'tanh':
        return Math.tanh(x);
      case 'leaky-relu':
        return x > 0 ? x : 0.01 * x;
      default:
        return Math.max(0, x);
    }
  }

  multiObjectiveRank(
    items: Array<{
      itemId: string;
      objectiveScores: Record<string, number>;
      features: Map<string, number>;
    }>
  ): RankedItem[] {
    const ranked: RankedItem[] = [];

    for (const item of items) {
      const { score, weightedScores } = this._calculateMultiObjectiveScore(
        item.objectiveScores
      );

      const rankingFeatures: RankingFeature[] = [];
      for (const [name, value] of item.features) {
        rankingFeatures.push({
          name,
          value,
          weight: weightedScores[name] || 0,
          category: this._getFeatureCategory(name)
        });
      }

      ranked.push({
        itemId: item.itemId,
        score,
        rank: 0,
        confidence: 0.7,
        features: rankingFeatures,
        explanation: this._generateMultiObjectiveExplanation(item.objectiveScores)
      });
    }

    ranked.sort((a, b) => b.score - a.score);
    ranked.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    this._rankedItems = ranked;
    this._model = 'multi-objective';
    this._lastResult = {
      items: ranked,
      model: 'multi-objective',
      totalItems: ranked.length,
      timestamp: Date.now()
    };
    this._counter++;

    return ranked;
  }

  private _calculateMultiObjectiveScore(
    objectiveScores: Record<string, number>
  ): { score: number; weightedScores: Record<string, number> } {
    const { objectives, tradeoff } = this._multiObjConfig;
    const weightedScores: Record<string, number> = {};
    let totalScore = 0;

    if (tradeoff === 'weighted-sum') {
      for (const obj of objectives) {
        const objScore = objectiveScores[obj.name] || 0;
        const weighted = objScore * obj.weight;
        weightedScores[obj.name] = weighted;
        totalScore += weighted;
      }
    }

    return { score: totalScore, weightedScores };
  }

  private _generateMultiObjectiveExplanation(scores: Record<string, number>): string {
    const parts: string[] = [];
    for (const [name, score] of Object.entries(scores)) {
      parts.push(`${name}: ${(score * 100).toFixed(1)}%`);
    }
    return `多目标排序: ${parts.join(', ')}`;
  }

  trainLR(samples: TrainingSample[]): number {
    const { learningRate, regularization } = this._lrModel;
    let totalLoss = 0;

    for (const sample of samples) {
      const features = sample.features;
      const label = sample.label;
      const weight = sample.weight || 1;

      let prediction = this._lrModel.bias;
      for (const [name, value] of features) {
        prediction += (this._lrModel.weights.get(name) || 0) * value;
      }
      const sigmoidPred = 1 / (1 + Math.exp(-prediction));
      const error = label - sigmoidPred;
      const loss = -label * Math.log(sigmoidPred) - (1 - label) * Math.log(1 - sigmoidPred);
      totalLoss += loss * weight;

      this._lrModel.bias += learningRate * error * weight;
      for (const [name, value] of features) {
        const currentWeight = this._lrModel.weights.get(name) || 0;
        const grad = error * value * weight - regularization * currentWeight;
        this._lrModel.weights.set(name, currentWeight + learningRate * grad);

        if (!this._lrModel.featureNames.includes(name)) {
          this._lrModel.featureNames.push(name);
        }
      }
    }

    this._updateFeatureImportance();
    return totalLoss / samples.length;
  }

  private _updateFeatureImportance(): void {
    this._featureImportance.clear();
    for (const [name, weight] of this._lrModel.weights) {
      this._featureImportance.set(name, Math.abs(weight));
    }
  }

  rank(
    items: Array<{ itemId: string; features: Map<string, number> }>,
    topN: number = 10
  ): RankedItem[] {
    let result: RankedItem[];

    switch (this._model) {
      case 'lr':
        result = this.lrRank(items);
        break;
      case 'gbdt':
        result = this.gbdtRank(items);
        break;
      case 'dnn':
        result = this.dnnRank(items);
        break;
      default:
        result = this.lrRank(items);
    }

    return result.slice(0, topN);
  }

  rerank(
    items: RankedItem[],
    method: 'diversity' | 'freshness' | 'stability' = 'diversity',
    topN: number = 10
  ): RankedItem[] {
    if (method === 'diversity') {
      return this._diversityRerank(items, topN);
    } else if (method === 'freshness') {
      return this._freshnessRerank(items, topN);
    } else {
      return this._stabilityRerank(items, topN);
    }
  }

  private _diversityRerank(items: RankedItem[], topN: number): RankedItem[] {
    if (items.length <= topN) return items;

    const selected: RankedItem[] = [];
    const remaining = [...items];
    const selectedCategories = new Set<string>();

    while (selected.length < topN && remaining.length > 0) {
      let bestIdx = 0;
      let bestAdjustedScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        let diversityBonus = 0;

        for (const feat of item.features) {
          if (feat.category === 'item' && !selectedCategories.has(feat.name)) {
            diversityBonus += 0.05;
          }
        }

        const adjusted = item.score * 0.7 + diversityBonus * 0.3;
        if (adjusted > bestAdjustedScore) {
          bestAdjustedScore = adjusted;
          bestIdx = i;
        }
      }

      const bestItem = remaining.splice(bestIdx, 1)[0];
      selected.push(bestItem);

      for (const feat of bestItem.features) {
        if (feat.category === 'item') {
          selectedCategories.add(feat.name);
        }
      }
    }

    return selected.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }

  private _freshnessRerank(items: RankedItem[], topN: number): RankedItem[] {
    return items
      .map(item => {
        const recencyFeature = item.features.find(f => f.name === 'recency');
        const recency = recencyFeature ? recencyFeature.value : 0.5;
        return {
          ...item,
          score: item.score * 0.8 + recency * 0.2
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }

  private _stabilityRerank(items: RankedItem[], topN: number): RankedItem[] {
    return items.slice(0, topN).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }

  private _getFeatureCategory(name: string): RankingFeature['category'] {
    if (name.startsWith('user_') || ['age', 'gender', 'history'].includes(name)) {
      return 'user';
    } else if (name.startsWith('item_') || ['price', 'quality', 'popularity'].includes(name)) {
      return 'item';
    } else if (name.startsWith('context_') || ['time', 'location', 'device'].includes(name)) {
      return 'context';
    }
    return 'interaction';
  }

  private _generateExplanation(features: RankingFeature[], model: string): string {
    const topFeatures = features
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
      .slice(0, 3)
      .map(f => f.name);

    return `${model}模型排序，主要影响特征: ${topFeatures.join(', ')}`;
  }

  calculateFeatureImportance(): Map<string, number> {
    this._updateFeatureImportance();
    return new Map(this._featureImportance);
  }

  normalizeFeatures(features: Map<string, number>): Map<string, number> {
    const normalized = new Map<string, number>();
    const values = Array.from(features.values());

    if (values.length === 0) return normalized;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    for (const [name, value] of features) {
      normalized.set(name, range === 0 ? 0.5 : (value - min) / range);
    }

    return normalized;
  }

  toPacket(): DataPacket<RankingResult> {
    const result: RankingResult = this._lastResult || {
      items: this._rankedItems,
      model: this._model,
      totalItems: this._rankedItems.length,
      timestamp: Date.now()
    };
    this._counter++;
    return {
      id: `ranking-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'ranking'],
        priority: 1,
        phase: 'ranking'
      }
    };
  }

  reset(): void {
    this._rankedItems = [];
    this._counter = 0;
    this._model = 'lr';
    this._lastResult = null;
    this._featureImportance.clear();
    this._trainingSamples = [];
    this._lrModel = {
      weights: new Map(),
      bias: 0,
      featureNames: [],
      regularization: 0.01,
      learningRate: 0.01
    };
    this._gbdtConfig = {
      trees: 100,
      maxDepth: 6,
      learningRate: 0.1,
      minSamplesLeaf: 10,
      subsample: 0.8,
      lossFunction: 'mse'
    };
    this._dnnConfig = {
      layers: [256, 128, 64],
      activation: 'relu',
      learningRate: 0.001,
      dropout: 0.2,
      epochs: 50,
      batchSize: 64,
      optimizer: 'adam'
    };
    this._multiObjConfig = {
      objectives: [
        { name: 'click', weight: 0.4, target: 0.5 },
        { name: 'conversion', weight: 0.3, target: 0.3 },
        { name: 'dwell-time', weight: 0.3, target: 0.4 }
      ],
      tradeoff: 'weighted-sum'
    };
    this._initializeDefaultModel();
  }
}
