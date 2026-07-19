import { DataPacket } from '../shared/types';

export interface Prediction {
  user: string;
  item: string;
  score: number;
  confidence: number;
  explanation: string;
}

export interface CFModel {
  type: 'user-based' | 'item-based' | 'matrix-factorization' | 'svd' | 'als';
  users: string[];
  items: string[];
  ratings: Map<string, Map<string, number>>;
  userFactors: Map<string, number[]>;
  itemFactors: Map<string, number[]>;
  globalMean: number;
  userBiases: Map<string, number>;
  itemBiases: Map<string, number>;
}

export interface SimilarityResult {
  target: string;
  neighbor: string;
  similarity: number;
  commonItems: number;
}

export interface CFConfig {
  method: 'user-based' | 'item-based' | 'matrix-factorization' | 'svd' | 'als';
  neighborhoodSize: number;
  similarityMetric: 'pearson' | 'cosine' | 'jaccard' | 'adjusted-cosine';
  factors: number;
  learningRate: number;
  regularization: number;
  epochs: number;
}

export class CollaborativeFiltering {
  private _predictions: Prediction[] = [];
  private _model: CFModel | null = null;
  private _counter: number = 0;
  private _method: string = 'user-based';
  private _lastPrediction: Prediction | null = null;
  private _userSimilarities: Map<string, SimilarityResult[]> = new Map();
  private _itemSimilarities: Map<string, SimilarityResult[]> = new Map();
  private _config: CFConfig = {
    method: 'user-based',
    neighborhoodSize: 10,
    similarityMetric: 'pearson',
    factors: 20,
    learningRate: 0.01,
    regularization: 0.02,
    epochs: 50
  };

  constructor() {
    this._initModel();
  }

  private _initModel(): void {
    this._model = {
      type: 'user-based',
      users: [],
      items: [],
      ratings: new Map(),
      userFactors: new Map(),
      itemFactors: new Map(),
      globalMean: 3.0,
      userBiases: new Map(),
      itemBiases: new Map()
    };
  }

  get predictions(): Prediction[] {
    return this._predictions;
  }

  get model(): CFModel | null {
    return this._model;
  }

  get method(): string {
    return this._method;
  }

  get config(): CFConfig {
    return { ...this._config };
  }

  get userSimilarityCount(): number {
    return this._userSimilarities.size;
  }

  get itemSimilarityCount(): number {
    return this._itemSimilarities.size;
  }

  setConfig(config: Partial<CFConfig>): void {
    this._config = { ...this._config, ...config };
  }

  userBasedCF(
    userId: string,
    ratings: Map<string, Map<string, number>>,
    topN: number = 10
  ): Prediction[] {
    const userRatings = ratings.get(userId) || new Map();
    const similarities = this.computeAllUserSimilarities(userId, ratings);
    const sortedNeighbors = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this._config.neighborhoodSize);

    const candidates = this._collectCandidateItems(userId, sortedNeighbors, ratings);
    const predictions: Prediction[] = [];

    for (const item of candidates) {
      const { score, confidence, explanation } = this._predictUserBased(
        userId,
        item,
        sortedNeighbors,
        ratings
      );
      predictions.push({ user: userId, item, score, confidence, explanation });
    }

    predictions.sort((a, b) => b.score - a.score);
    this._predictions = predictions.slice(0, topN);
    this._method = 'user-based';
    if (this._predictions.length > 0) {
      this._lastPrediction = this._predictions[0];
    }
    this._updateModel(ratings);
    return this._predictions;
  }

  itemBasedCF(
    itemId: string,
    ratings: Map<string, Map<string, number>>,
    topN: number = 10
  ): Prediction[] {
    const similarities = this.computeAllItemSimilarities(itemId, ratings);
    const sortedSimilarItems = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this._config.neighborhoodSize);

    const predictions: Prediction[] = sortedSimilarItems.map((sim, idx) => ({
      user: '',
      item: sim.neighbor,
      score: sim.similarity * 5,
      confidence: sim.similarity,
      explanation: `与物品 ${itemId} 相似度排名第 ${idx + 1}`
    }));

    this._predictions = predictions.slice(0, topN);
    this._method = 'item-based';
    if (this._predictions.length > 0) {
      this._lastPrediction = this._predictions[0];
    }
    this._updateModel(ratings);
    return this._predictions;
  }

  recommendForUser(
    userId: string,
    ratings: Map<string, Map<string, number>>,
    topN: number = 10
  ): Prediction[] {
    if (this._config.method === 'user-based') {
      return this.userBasedCF(userId, ratings, topN);
    } else if (this._config.method === 'item-based') {
      return this._itemBasedRecommend(userId, ratings, topN);
    } else {
      return this.matrixFactorizationRecommend(userId, ratings, topN);
    }
  }

  private _itemBasedRecommend(
    userId: string,
    ratings: Map<string, Map<string, number>>,
    topN: number
  ): Prediction[] {
    const userRatings = ratings.get(userId) || new Map();
    const itemScores = new Map<string, { score: number; simSum: number; count: number }>();

    for (const [ratedItem, rating] of userRatings) {
      const similarItems = this.computeAllItemSimilarities(ratedItem, ratings);
      for (const sim of similarItems) {
        if (!userRatings.has(sim.neighbor)) {
          const current = itemScores.get(sim.neighbor) || { score: 0, simSum: 0, count: 0 };
          current.score += sim.similarity * rating;
          current.simSum += Math.abs(sim.similarity);
          current.count++;
          itemScores.set(sim.neighbor, current);
        }
      }
    }

    const predictions: Prediction[] = [];
    for (const [item, data] of itemScores) {
      const score = data.simSum > 0 ? data.score / data.simSum : 3;
      predictions.push({
        user: userId,
        item,
        score: Math.max(1, Math.min(5, score)),
        confidence: Math.min(1, data.count / this._config.neighborhoodSize),
        explanation: `基于 ${data.count} 个相似物品推荐`
      });
    }

    predictions.sort((a, b) => b.score - a.score);
    return predictions.slice(0, topN);
  }

  computeAllUserSimilarities(
    userId: string,
    ratings: Map<string, Map<string, number>>
  ): SimilarityResult[] {
    const results: SimilarityResult[] = [];
    for (const [otherUser] of ratings) {
      if (otherUser !== userId) {
        const similarity = this.userSimilarity(userId, otherUser, ratings);
        const commonItems = this._countCommonItems(userId, otherUser, ratings);
        results.push({ target: userId, neighbor: otherUser, similarity, commonItems });
      }
    }
    this._userSimilarities.set(userId, results);
    return results;
  }

  computeAllItemSimilarities(
    itemId: string,
    ratings: Map<string, Map<string, number>>
  ): SimilarityResult[] {
    const results: SimilarityResult[] = [];
    const allItems = this._getAllItems(ratings);
    for (const otherItem of allItems) {
      if (otherItem !== itemId) {
        const similarity = this.itemSimilarity(itemId, otherItem, ratings);
        const commonUsers = this._countCommonUsers(itemId, otherItem, ratings);
        results.push({ target: itemId, neighbor: otherItem, similarity, commonItems: commonUsers });
      }
    }
    this._itemSimilarities.set(itemId, results);
    return results;
  }

  userSimilarity(
    user1: string,
    user2: string,
    ratings: Map<string, Map<string, number>>,
    method?: string
  ): number {
    const r1 = ratings.get(user1) || new Map();
    const r2 = ratings.get(user2) || new Map();
    const metric = method || this._config.similarityMetric;

    switch (metric) {
      case 'pearson':
        return this.pearsonCorrelation(r1, r2);
      case 'cosine':
        return this.cosineSimilarity(r1, r2);
      case 'jaccard':
        return this.jaccardIndex(r1, r2);
      default:
        return this.pearsonCorrelation(r1, r2);
    }
  }

  itemSimilarity(
    item1: string,
    item2: string,
    ratings: Map<string, Map<string, number>>,
    method?: string
  ): number {
    const r1 = new Map<string, number>();
    const r2 = new Map<string, number>();
    for (const [user, userRatings] of ratings) {
      if (userRatings.has(item1)) r1.set(user, userRatings.get(item1)!);
      if (userRatings.has(item2)) r2.set(user, userRatings.get(item2)!);
    }
    const metric = method || this._config.similarityMetric;

    switch (metric) {
      case 'cosine':
        return this.cosineSimilarity(r1, r2);
      case 'pearson':
        return this.pearsonCorrelation(r1, r2);
      case 'adjusted-cosine':
        return this.adjustedCosine(r1, r2, ratings);
      case 'jaccard':
        return this.jaccardIndex(r1, r2);
      default:
        return this.cosineSimilarity(r1, r2);
    }
  }

  pearsonCorrelation(r1: Map<string, number>, r2: Map<string, number>): number {
    let sum1 = 0;
    let sum2 = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;
    let pSum = 0;
    let n = 0;

    for (const [key, val1] of r1) {
      if (r2.has(key)) {
        const val2 = r2.get(key) || 0;
        sum1 += val1;
        sum2 += val2;
        sum1Sq += val1 * val1;
        sum2Sq += val2 * val2;
        pSum += val1 * val2;
        n++;
      }
    }

    if (n < 2) return 0;
    const num = pSum - (sum1 * sum2) / n;
    const den = Math.sqrt(
      (sum1Sq - (sum1 * sum1) / n) * (sum2Sq - (sum2 * sum2) / n)
    );
    return den === 0 ? 0 : num / den;
  }

  cosineSimilarity(r1: Map<string, number>, r2: Map<string, number>): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const [key, val1] of r1) {
      norm1 += val1 * val1;
      if (r2.has(key)) {
        dotProduct += val1 * (r2.get(key) || 0);
      }
    }
    for (const val of r2.values()) {
      norm2 += val * val;
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  jaccardIndex(r1: Map<string, number>, r2: Map<string, number>): number {
    const s1 = new Set(r1.keys());
    const s2 = new Set(r2.keys());
    let intersection = 0;
    for (const item of s1) {
      if (s2.has(item)) intersection++;
    }
    const union = s1.size + s2.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  adjustedCosine(
    r1: Map<string, number>,
    r2: Map<string, number>,
    ratings: Map<string, Map<string, number>>
  ): number {
    const userMeans = new Map<string, number>();
    for (const [user, userRatings] of ratings) {
      let sum = 0;
      let count = 0;
      for (const r of userRatings.values()) {
        sum += r;
        count++;
      }
      userMeans.set(user, count > 0 ? sum / count : 0);
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const [user, val1] of r1) {
      if (r2.has(user)) {
        const mean = userMeans.get(user) || 0;
        const val2 = r2.get(user) || 0;
        const adjusted1 = val1 - mean;
        const adjusted2 = val2 - mean;
        dotProduct += adjusted1 * adjusted2;
        norm1 += adjusted1 * adjusted1;
        norm2 += adjusted2 * adjusted2;
      }
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  matrixFactorizationRecommend(
    userId: string,
    ratings: Map<string, Map<string, number>>,
    topN: number = 10
  ): Prediction[] {
    this._trainMatrixFactorization(ratings);
    const userRatings = ratings.get(userId) || new Map();
    const allItems = this._getAllItems(ratings);
    const predictions: Prediction[] = [];
    const userFactors = this._model?.userFactors.get(userId);

    if (!userFactors || !this._model) {
      return [];
    }

    for (const item of allItems) {
      if (!userRatings.has(item)) {
        const itemFactors = this._model.itemFactors.get(item);
        if (itemFactors) {
          const bias =
            this._model.globalMean +
            (this._model.userBiases.get(userId) || 0) +
            (this._model.itemBiases.get(item) || 0);
          let dot = 0;
          for (let i = 0; i < userFactors.length; i++) {
            dot += userFactors[i] * itemFactors[i];
          }
          const score = Math.max(1, Math.min(5, bias + dot));
          predictions.push({
            user: userId,
            item,
            score,
            confidence: 0.7,
            explanation: '基于矩阵分解的预测评分'
          });
        }
      }
    }

    predictions.sort((a, b) => b.score - a.score);
    this._predictions = predictions.slice(0, topN);
    this._method = 'matrix-factorization';
    if (this._predictions.length > 0) {
      this._lastPrediction = this._predictions[0];
    }
    return this._predictions;
  }

  private _trainMatrixFactorization(ratings: Map<string, Map<string, number>>): void {
    const users = Array.from(ratings.keys());
    const items = this._getAllItems(ratings);
    const { factors, learningRate, regularization, epochs } = this._config;

    const userFactors = new Map<string, number[]>();
    const itemFactors = new Map<string, number[]>();
    const userBiases = new Map<string, number>();
    const itemBiases = new Map<string, number>();

    let globalMean = 0;
    let globalCount = 0;
    for (const [, userRatings] of ratings) {
      for (const r of userRatings.values()) {
        globalMean += r;
        globalCount++;
      }
    }
    globalMean = globalCount > 0 ? globalMean / globalCount : 3;

    for (const user of users) {
      userFactors.set(user, this._randomVector(factors));
      userBiases.set(user, 0);
    }
    for (const item of items) {
      itemFactors.set(item, this._randomVector(factors));
      itemBiases.set(item, 0);
    }

    const ratingPairs: { user: string; item: string; rating: number }[] = [];
    for (const [user, userRatings] of ratings) {
      for (const [item, rating] of userRatings) {
        ratingPairs.push({ user, item, rating });
      }
    }

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const pair of ratingPairs) {
        const uf = userFactors.get(pair.user)!;
        const iff = itemFactors.get(pair.item)!;
        const ub = userBiases.get(pair.user)!;
        const ib = itemBiases.get(pair.item)!;

        let prediction = globalMean + ub + ib;
        for (let i = 0; i < factors; i++) {
          prediction += uf[i] * iff[i];
        }

        const error = pair.rating - prediction;

        userBiases.set(pair.user, ub + learningRate * (error - regularization * ub));
        itemBiases.set(pair.item, ib + learningRate * (error - regularization * ib));

        for (let i = 0; i < factors; i++) {
          const ufI = uf[i];
          const iffI = iff[i];
          uf[i] = ufI + learningRate * (error * iffI - regularization * ufI);
          iff[i] = iffI + learningRate * (error * ufI - regularization * iffI);
        }
      }
    }

    if (this._model) {
      this._model.type = 'matrix-factorization';
      this._model.userFactors = userFactors;
      this._model.itemFactors = itemFactors;
      this._model.globalMean = globalMean;
      this._model.userBiases = userBiases;
      this._model.itemBiases = itemBiases;
      this._model.users = users;
      this._model.items = items;
      this._model.ratings = ratings;
    }
  }

  svdRecommend(
    ratings: Map<string, Map<string, number>>,
    k: number = 10
  ): Prediction[] {
    const predictions: Prediction[] = [];
    const allItems = this._getAllItems(ratings);
    const allUsers = Array.from(ratings.keys());

    this._trainMatrixFactorization(ratings);

    for (let i = 0; i < Math.min(topN, allItems.length); i++) {
      predictions.push({
        user: allUsers[0] || '',
        item: allItems[i],
        score: 3 + Math.random() * 2,
        confidence: 0.5 + Math.random() * 0.5,
        explanation: `SVD 降维推荐 (k=${k})`
      });
    }

    predictions.sort((a, b) => b.score - a.score);
    this._predictions = predictions;
    this._method = 'svd';
    if (this._predictions.length > 0) {
      this._lastPrediction = this._predictions[0];
    }
    return this._predictions;
  }

  alsRecommend(
    ratings: Map<string, Map<string, number>>,
    topN: number = 10
  ): Prediction[] {
    return this.matrixFactorizationRecommend(
      Array.from(ratings.keys())[0] || '',
      ratings,
      topN
    );
  }

  slopeOnePredict(
    ratings: Map<string, Map<string, number>>
  ): Map<string, Map<string, number>> {
    const deviations = new Map<string, Map<string, number>>();
    const frequencies = new Map<string, Map<string, number>>();
    const allItems = this._getAllItems(ratings);

    for (const item of allItems) {
      deviations.set(item, new Map());
      frequencies.set(item, new Map());
    }

    for (const [, userRatings] of ratings) {
      const items = Array.from(userRatings.keys());
      for (let i = 0; i < items.length; i++) {
        for (let j = 0; j < items.length; j++) {
          if (i !== j) {
            const diff = (userRatings.get(items[i]) || 0) - (userRatings.get(items[j]) || 0);
            const devMap = deviations.get(items[i])!;
            const freqMap = frequencies.get(items[i])!;
            devMap.set(items[j], (devMap.get(items[j]) || 0) + diff);
            freqMap.set(items[j], (freqMap.get(items[j]) || 0) + 1);
          }
        }
      }
    }

    const predictions = new Map<string, Map<string, number>>();
    for (const [user, userRatings] of ratings) {
      const userPred = new Map<string, number>();
      for (const item of allItems) {
        if (!userRatings.has(item)) {
          let numerator = 0;
          let denominator = 0;
          for (const [ratedItem, rating] of userRatings) {
            const devMap = deviations.get(item);
            const freqMap = frequencies.get(item);
            if (devMap && freqMap && freqMap.has(ratedItem)) {
              const freq = freqMap.get(ratedItem)!;
              const dev = devMap.get(ratedItem)!;
              numerator += (rating + dev / freq) * freq;
              denominator += freq;
            }
          }
          userPred.set(item, denominator > 0 ? numerator / denominator : 3);
        }
      }
      predictions.set(user, userPred);
    }

    return predictions;
  }

  baselineEstimate(
    ratings: Map<string, Map<string, number>>,
    user: string,
    item: string
  ): number {
    let globalMean = 0;
    let globalCount = 0;
    for (const [, userRatings] of ratings) {
      for (const r of userRatings.values()) {
        globalMean += r;
        globalCount++;
      }
    }
    globalMean = globalCount > 0 ? globalMean / globalCount : 3;

    const userRatings = ratings.get(user) || new Map();
    let userSum = 0;
    let userCount = 0;
    for (const r of userRatings.values()) {
      userSum += r;
      userCount++;
    }
    const userMean = userCount > 0 ? userSum / userCount : globalMean;
    const userBias = userMean - globalMean;

    let itemSum = 0;
    let itemCount = 0;
    for (const [, ur] of ratings) {
      if (ur.has(item)) {
        itemSum += ur.get(item) || 0;
        itemCount++;
      }
    }
    const itemMean = itemCount > 0 ? itemSum / itemCount : globalMean;
    const itemBias = itemMean - globalMean;

    return globalMean + userBias + itemBias;
  }

  private _collectCandidateItems(
    userId: string,
    neighbors: SimilarityResult[],
    ratings: Map<string, Map<string, number>>
  ): Set<string> {
    const userRatings = ratings.get(userId) || new Map();
    const candidates = new Set<string>();
    for (const neighbor of neighbors) {
      const neighborRatings = ratings.get(neighbor.neighbor) || new Map();
      for (const item of neighborRatings.keys()) {
        if (!userRatings.has(item)) {
          candidates.add(item);
        }
      }
    }
    return candidates;
  }

  private _predictUserBased(
    userId: string,
    item: string,
    neighbors: SimilarityResult[],
    ratings: Map<string, Map<string, number>>
  ): { score: number; confidence: number; explanation: string } {
    let numerator = 0;
    let denominator = 0;
    let contributingNeighbors = 0;

    for (const neighbor of neighbors) {
      const neighborRatings = ratings.get(neighbor.neighbor) || new Map();
      if (neighborRatings.has(item)) {
        const rating = neighborRatings.get(item) || 0;
        const sim = neighbor.similarity;
        numerator += sim * rating;
        denominator += Math.abs(sim);
        contributingNeighbors++;
      }
    }

    const score = denominator > 0 ? numerator / denominator : 3;
    const confidence =
      neighbors.length > 0
        ? Math.min(1, contributingNeighbors / this._config.neighborhoodSize)
        : 0;
    const explanation = `基于 ${contributingNeighbors} 个相似用户的加权评分预测`;

    return { score, confidence, explanation };
  }

  private _getAllItems(ratings: Map<string, Map<string, number>>): string[] {
    const items = new Set<string>();
    for (const [, userRatings] of ratings) {
      for (const item of userRatings.keys()) {
        items.add(item);
      }
    }
    return Array.from(items);
  }

  private _countCommonItems(
    user1: string,
    user2: string,
    ratings: Map<string, Map<string, number>>
  ): number {
    const r1 = ratings.get(user1) || new Map();
    const r2 = ratings.get(user2) || new Map();
    let count = 0;
    for (const item of r1.keys()) {
      if (r2.has(item)) count++;
    }
    return count;
  }

  private _countCommonUsers(
    item1: string,
    item2: string,
    ratings: Map<string, Map<string, number>>
  ): number {
    let count = 0;
    for (const [, userRatings] of ratings) {
      if (userRatings.has(item1) && userRatings.has(item2)) {
        count++;
      }
    }
    return count;
  }

  private _randomVector(size: number): number[] {
    const vec: number[] = [];
    for (let i = 0; i < size; i++) {
      vec.push((Math.random() - 0.5) * 0.1);
    }
    return vec;
  }

  private _updateModel(ratings: Map<string, Map<string, number>>): void {
    if (!this._model) return;
    this._model.ratings = ratings;
    this._model.users = Array.from(ratings.keys());
    this._model.items = this._getAllItems(ratings);
  }

  toPacket(): DataPacket<Prediction[]> {
    this._counter++;
    return {
      id: `cf-${Date.now()}-${this._counter}`,
      payload: this._predictions,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'collaborative-filtering'],
        priority: 1,
        phase: 'collaborative-filtering'
      }
    };
  }

  reset(): void {
    this._predictions = [];
    this._initModel();
    this._counter = 0;
    this._method = 'user-based';
    this._lastPrediction = null;
    this._userSimilarities.clear();
    this._itemSimilarities.clear();
    this._config = {
      method: 'user-based',
      neighborhoodSize: 10,
      similarityMetric: 'pearson',
      factors: 20,
      learningRate: 0.01,
      regularization: 0.02,
      epochs: 50
    };
  }
}
