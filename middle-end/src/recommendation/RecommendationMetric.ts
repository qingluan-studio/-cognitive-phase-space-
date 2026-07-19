import { DataPacket } from '../shared/types';

export interface MetricResult {
  name: string;
  value: number;
  description: string;
  unit?: string;
  benchmark?: number;
}

export interface RecommendationEvaluation {
  accuracy: MetricResult[];
  ranking: MetricResult[];
  coverage: MetricResult[];
  diversity: MetricResult[];
  novelty: MetricResult[];
  serendipity: MetricResult[];
  overallScore: number;
  timestamp: number;
}

export interface PredictionFeedback {
  userId: string;
  itemId: string;
  predictedScore: number;
  actualScore: number;
  timestamp: number;
}

export interface UserFeedback {
  userId: string;
  recommendedItems: string[];
  clickedItems: string[];
  purchasedItems: string[];
  likedItems: string[];
  dislikedItems: string[];
}

export interface DCGConfig {
  k: number;
  method: 'standard' | 'industry';
}

export interface DiversityConfig {
  method: 'intra-list' | 'inter-list' | 'coverage';
  similarityMetric: 'cosine' | 'jaccard' | 'euclidean';
  featureType: 'category' | 'tag' | 'embedding';
}

export interface NoveltyConfig {
  method: 'popularity-based' | 'history-based' | 'temporal';
  timeWindowDays: number;
}

export interface CoverageConfig {
  type: 'user-coverage' | 'item-coverage' | 'catalog-coverage';
  threshold: number;
}

export interface ABTestResult {
  groupA: RecommendationEvaluation;
  groupB: RecommendationEvaluation;
  winner: 'A' | 'B' | 'tie';
  confidence: number;
  improvements: Record<string, number>;
}

export class RecommendationMetric {
  private _evaluation: RecommendationEvaluation | null = null;
  private _counter: number = 0;
  private _lastMetrics: Map<string, number> = new Map();
  private _history: Array<{ timestamp: number; metrics: Record<string, number> }> = [];
  private _dcgConfig: DCGConfig = {
    k: 10,
    method: 'standard'
  };
  private _diversityConfig: DiversityConfig = {
    method: 'intra-list',
    similarityMetric: 'cosine',
    featureType: 'category'
  };
  private _noveltyConfig: NoveltyConfig = {
    method: 'popularity-based',
    timeWindowDays: 30
  };
  private _coverageConfig: CoverageConfig = {
    type: 'catalog-coverage',
    threshold: 1
  };
  private _feedbacks: UserFeedback[] = [];
  private _predictions: PredictionFeedback[] = [];

  constructor() {
    this._initializeDefaults();
  }

  private _initializeDefaults(): void {
    this._lastMetrics.clear();
    this._history = [];
  }

  get evaluation(): RecommendationEvaluation | null {
    return this._evaluation;
  }

  get lastMetrics(): Map<string, number> {
    return new Map(this._lastMetrics);
  }

  get history(): Array<{ timestamp: number; metrics: Record<string, number> }> {
    return [...this._history];
  }

  get dcgConfig(): DCGConfig {
    return { ...this._dcgConfig };
  }

  get diversityConfig(): DiversityConfig {
    return { ...this._diversityConfig };
  }

  get noveltyConfig(): NoveltyConfig {
    return { ...this._noveltyConfig };
  }

  get coverageConfig(): CoverageConfig {
    return { ...this._coverageConfig };
  }

  get feedbackCount(): number {
    return this._feedbacks.length;
  }

  get predictionCount(): number {
    return this._predictions.length;
  }

  setDCGConfig(config: Partial<DCGConfig>): void {
    this._dcgConfig = { ...this._dcgConfig, ...config };
  }

  setDiversityConfig(config: Partial<DiversityConfig>): void {
    this._diversityConfig = { ...this._diversityConfig, ...config };
  }

  setNoveltyConfig(config: Partial<NoveltyConfig>): void {
    this._noveltyConfig = { ...this._noveltyConfig, ...config };
  }

  setCoverageConfig(config: Partial<CoverageConfig>): void {
    this._coverageConfig = { ...this._coverageConfig, ...config };
  }

  addFeedback(feedback: UserFeedback): void {
    this._feedbacks.push(feedback);
  }

  addPrediction(prediction: PredictionFeedback): void {
    this._predictions.push(prediction);
  }

  precision(
    recommended: string[],
    relevant: string[],
    k?: number
  ): number {
    const recs = k ? recommended.slice(0, k) : recommended;
    if (recs.length === 0) return 0;

    const relevantSet = new Set(relevant);
    let hit = 0;
    for (const item of recs) {
      if (relevantSet.has(item)) hit++;
    }

    return hit / recs.length;
  }

  recall(
    recommended: string[],
    relevant: string[],
    k?: number
  ): number {
    const recs = k ? recommended.slice(0, k) : recommended;
    if (relevant.length === 0) return 0;

    const relevantSet = new Set(relevant);
    let hit = 0;
    for (const item of recs) {
      if (relevantSet.has(item)) hit++;
    }

    return hit / relevant.length;
  }

  f1Score(
    recommended: string[],
    relevant: string[],
    k?: number
  ): number {
    const p = this.precision(recommended, relevant, k);
    const r = this.recall(recommended, relevant, k);
    if (p + r === 0) return 0;
    return (2 * p * r) / (p + r);
  }

  accuracy(predictions: PredictionFeedback[], threshold: number = 3.5): number {
    if (predictions.length === 0) return 0;

    let correct = 0;
    for (const pred of predictions) {
      const predPositive = pred.predictedScore >= threshold;
      const actualPositive = pred.actualScore >= threshold;
      if (predPositive === actualPositive) {
        correct++;
      }
    }

    return correct / predictions.length;
  }

  mae(predictions: PredictionFeedback[]): number {
    if (predictions.length === 0) return 0;

    let sum = 0;
    for (const pred of predictions) {
      sum += Math.abs(pred.predictedScore - pred.actualScore);
    }

    return sum / predictions.length;
  }

  rmse(predictions: PredictionFeedback[]): number {
    if (predictions.length === 0) return 0;

    let sumSq = 0;
    for (const pred of predictions) {
      const diff = pred.predictedScore - pred.actualScore;
      sumSq += diff * diff;
    }

    return Math.sqrt(sumSq / predictions.length);
  }

  mse(predictions: PredictionFeedback[]): number {
    if (predictions.length === 0) return 0;

    let sumSq = 0;
    for (const pred of predictions) {
      const diff = pred.predictedScore - pred.actualScore;
      sumSq += diff * diff;
    }

    return sumSq / predictions.length;
  }

  ndcg(
    recommended: string[],
    relevanceScores: Map<string, number>,
    k?: number
  ): number {
    const topK = k || this._dcgConfig.k;
    const recs = recommended.slice(0, topK);

    const dcg = this._dcg(recs, relevanceScores);

    const idealRecs = [...recommended]
      .sort((a, b) => (relevanceScores.get(b) || 0) - (relevanceScores.get(a) || 0))
      .slice(0, topK);
    const idcg = this._dcg(idealRecs, relevanceScores);

    return idcg === 0 ? 0 : dcg / idcg;
  }

  private _dcg(items: string[], relevanceScores: Map<string, number>): number {
    let dcg = 0;
    for (let i = 0; i < items.length; i++) {
      const rel = relevanceScores.get(items[i]) || 0;
      if (this._dcgConfig.method === 'industry') {
        dcg += (Math.pow(2, rel) - 1) / Math.log2(i + 2);
      } else {
        dcg += rel / Math.log2(i + 2);
      }
    }
    return dcg;
  }

  mapScore(
    usersRecommendations: Array<{ userId: string; recommended: string[]; relevant: string[] }>,
    k?: number
  ): number {
    if (usersRecommendations.length === 0) return 0;

    let sumAP = 0;
    for (const userRecs of usersRecommendations) {
      sumAP += this._averagePrecision(userRecs.recommended, userRecs.relevant, k);
    }

    return sumAP / usersRecommendations.length;
  }

  private _averagePrecision(
    recommended: string[],
    relevant: string[],
    k?: number
  ): number {
    const recs = k ? recommended.slice(0, k) : recommended;
    const relevantSet = new Set(relevant);
    let sumPrecision = 0;
    let relevantCount = 0;

    for (let i = 0; i < recs.length; i++) {
      if (relevantSet.has(recs[i])) {
        relevantCount++;
        sumPrecision += relevantCount / (i + 1);
      }
    }

    return relevant.length > 0 ? sumPrecision / relevant.length : 0;
  }

  mrr(
    usersRecommendations: Array<{ userId: string; recommended: string[]; relevant: string[] }>,
    k?: number
  ): number {
    if (usersRecommendations.length === 0) return 0;

    let sumRR = 0;
    for (const userRecs of usersRecommendations) {
      sumRR += this._reciprocalRank(userRecs.recommended, userRecs.relevant, k);
    }

    return sumRR / usersRecommendations.length;
  }

  private _reciprocalRank(
    recommended: string[],
    relevant: string[],
    k?: number
  ): number {
    const recs = k ? recommended.slice(0, k) : recommended;
    const relevantSet = new Set(relevant);

    for (let i = 0; i < recs.length; i++) {
      if (relevantSet.has(recs[i])) {
        return 1 / (i + 1);
      }
    }
    return 0;
  }

  hitRate(
    usersRecommendations: Array<{ userId: string; recommended: string[]; relevant: string[] }>,
    k?: number
  ): number {
    if (usersRecommendations.length === 0) return 0;

    let hits = 0;
    for (const userRecs of usersRecommendations) {
      const recs = k ? userRecs.recommended.slice(0, k) : userRecs.recommended;
      const relevantSet = new Set(userRecs.relevant);
      for (const item of recs) {
        if (relevantSet.has(item)) {
          hits++;
          break;
        }
      }
    }

    return hits / usersRecommendations.length;
  }

  catalogCoverage(
    allRecommendations: string[][],
    totalItems: number
  ): number {
    if (totalItems === 0) return 0;

    const coveredItems = new Set<string>();
    for (const recs of allRecommendations) {
      for (const item of recs) {
        coveredItems.add(item);
      }
    }

    return coveredItems.size / totalItems;
  }

  userCoverage(
    usersRecommendations: string[][],
    totalUsers: number,
    threshold: number = 1
  ): number {
    if (totalUsers === 0) return 0;

    let activeUsers = 0;
    for (const recs of usersRecommendations) {
      if (recs.length >= threshold) {
        activeUsers++;
      }
    }

    return activeUsers / totalUsers;
  }

  diversity(
    recommended: string[],
    itemFeatures: Map<string, string[]>
  ): number {
    if (recommended.length <= 1) return 0;

    let totalPairwiseSim = 0;
    let pairCount = 0;

    for (let i = 0; i < recommended.length; i++) {
      for (let j = i + 1; j < recommended.length; j++) {
        const sim = this._itemPairSimilarity(
          recommended[i],
          recommended[j],
          itemFeatures
        );
        totalPairwiseSim += sim;
        pairCount++;
      }
    }

    const avgSimilarity = pairCount > 0 ? totalPairwiseSim / pairCount : 0;
    return 1 - avgSimilarity;
  }

  private _itemPairSimilarity(
    item1: string,
    item2: string,
    itemFeatures: Map<string, string[]>
  ): number {
    const features1 = new Set(itemFeatures.get(item1) || []);
    const features2 = new Set(itemFeatures.get(item2) || []);

    let intersection = 0;
    for (const f of features1) {
      if (features2.has(f)) intersection++;
    }

    const union = features1.size + features2.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  intraListDiversity(
    recommended: string[],
    itemCategories: Map<string, string>
  ): number {
    if (recommended.length === 0) return 0;

    const categories = new Set<string>();
    for (const item of recommended) {
      const cat = itemCategories.get(item);
      if (cat) categories.add(cat);
    }

    return categories.size / recommended.length;
  }

  giniCoefficient(
    allRecommendations: string[][]
  ): number {
    const itemCounts = new Map<string, number>();
    let totalRecs = 0;

    for (const recs of allRecommendations) {
      for (const item of recs) {
        itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
        totalRecs++;
      }
    }

    if (totalRecs === 0 || itemCounts.size <= 1) return 0;

    const counts = Array.from(itemCounts.values()).sort((a, b) => a - b);
    const n = counts.length;

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += (2 * (i + 1) - n - 1) * counts[i];
    }

    return Math.abs(sum) / (n * totalRecs);
  }

  novelty(
    recommended: string[],
    itemPopularity: Map<string, number>,
    totalUsers: number
  ): number {
    if (recommended.length === 0 || totalUsers === 0) return 0;

    let totalNovelty = 0;
    for (const item of recommended) {
      const popularity = itemPopularity.get(item) || 0;
      const prob = popularity / totalUsers;
      const selfInfo = prob > 0 ? -Math.log2(prob) : 0;
      totalNovelty += selfInfo;
    }

    return totalNovelty / recommended.length;
  }

  temporalNovelty(
    recommended: string[],
    itemLaunchDates: Map<string, number>,
    referenceDate?: number
  ): number {
    if (recommended.length === 0) return 0;

    const now = referenceDate || Date.now();
    let totalNovelty = 0;

    for (const item of recommended) {
      const launchDate = itemLaunchDates.get(item) || now;
      const daysSinceLaunch = (now - launchDate) / (1000 * 60 * 60 * 24);
      const noveltyScore = Math.max(0, 1 - daysSinceLaunch / this._noveltyConfig.timeWindowDays);
      totalNovelty += noveltyScore;
    }

    return totalNovelty / recommended.length;
  }

  unexpectedness(
    recommended: string[],
    expectedItems: string[],
    userHistory: string[]
  ): number {
    if (recommended.length === 0) return 0;

    const expectedSet = new Set(expectedItems);
    const historySet = new Set(userHistory);
    let unexpected = 0;

    for (const item of recommended) {
      if (!expectedSet.has(item) && !historySet.has(item)) {
        unexpected++;
      }
    }

    return unexpected / recommended.length;
  }

  serendipity(
    recommended: string[],
    userHistory: string[],
    expectedItems: string[],
    relevantItems: string[]
  ): number {
    if (recommended.length === 0) return 0;

    const historySet = new Set(userHistory);
    const expectedSet = new Set(expectedItems);
    const relevantSet = new Set(relevantItems);
    let serendipitous = 0;

    for (const item of recommended) {
      if (!historySet.has(item) && !expectedSet.has(item) && relevantSet.has(item)) {
        serendipitous++;
      }
    }

    return serendipitous / recommended.length;
  }

  clickThroughRate(feedbacks: UserFeedback[]): number {
    if (feedbacks.length === 0) return 0;

    let totalImpressions = 0;
    let totalClicks = 0;

    for (const fb of feedbacks) {
      totalImpressions += fb.recommendedItems.length;
      totalClicks += fb.clickedItems.length;
    }

    return totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  }

  conversionRate(feedbacks: UserFeedback[]): number {
    if (feedbacks.length === 0) return 0;

    let totalImpressions = 0;
    let totalPurchases = 0;

    for (const fb of feedbacks) {
      totalImpressions += fb.recommendedItems.length;
      totalPurchases += fb.purchasedItems.length;
    }

    return totalImpressions > 0 ? totalPurchases / totalImpressions : 0;
  }

  averageRating(feedbacks: UserFeedback[]): number {
    if (feedbacks.length === 0) return 0;

    let totalLikes = 0;
    let totalDislikes = 0;

    for (const fb of feedbacks) {
      totalLikes += fb.likedItems.length;
      totalDislikes += fb.dislikedItems.length;
    }

    const total = totalLikes + totalDislikes;
    return total > 0 ? totalLikes / total : 0;
  }

  evaluateAll(
    usersRecommendations: Array<{
      userId: string;
      recommended: string[];
      relevant: string[];
      history: string[];
      expected: string[];
    }>,
    itemFeatures: Map<string, string[]>,
    itemCategories: Map<string, string>,
    itemPopularity: Map<string, number>,
    totalItems: number,
    totalUsers: number,
    predictions?: PredictionFeedback[]
  ): RecommendationEvaluation {
    const accuracyMetrics: MetricResult[] = [];
    const rankingMetrics: MetricResult[] = [];
    const coverageMetrics: MetricResult[] = [];
    const diversityMetrics: MetricResult[] = [];
    const noveltyMetrics: MetricResult[] = [];
    const serendipityMetrics: MetricResult[] = [];

    const allRecs = usersRecommendations.map(u => u.recommended);
    const allRelevant = usersRecommendations.map(u => ({
      userId: u.userId,
      recommended: u.recommended,
      relevant: u.relevant
    }));

    const precisionAt10 = this.mapScore(allRelevant, 10);
    accuracyMetrics.push({
      name: 'precision@10',
      value: precisionAt10,
      description: '前10个推荐的平均准确率',
      unit: '%'
    });

    const recallAt10 = usersRecommendations.reduce((sum, u) => {
      return sum + this.recall(u.recommended, u.relevant, 10);
    }, 0) / usersRecommendations.length;
    accuracyMetrics.push({
      name: 'recall@10',
      value: recallAt10,
      description: '前10个推荐的平均召回率',
      unit: '%'
    });

    const f1 = this._weightedHarmonicMean(precisionAt10, recallAt10);
    accuracyMetrics.push({
      name: 'f1@10',
      value: f1,
      description: 'F1分数（精确率和召回率的调和平均）',
      unit: '%'
    });

    if (predictions && predictions.length > 0) {
      accuracyMetrics.push({
        name: 'mae',
        value: this.mae(predictions),
        description: '平均绝对误差',
        unit: '分'
      });
      accuracyMetrics.push({
        name: 'rmse',
        value: this.rmse(predictions),
        description: '均方根误差',
        unit: '分'
      });
    }

    const ndcgAt10 = usersRecommendations.reduce((sum, u) => {
      const relScores = new Map<string, number>();
      for (const item of u.relevant) {
        relScores.set(item, 5);
      }
      return sum + this.ndcg(u.recommended, relScores, 10);
    }, 0) / usersRecommendations.length;
    rankingMetrics.push({
      name: 'ndcg@10',
      value: ndcgAt10,
      description: '归一化折损累计增益@10',
      unit: '分'
    });

    const mapAt10 = this.mapScore(allRelevant, 10);
    rankingMetrics.push({
      name: 'map@10',
      value: mapAt10,
      description: '平均准确率均值@10',
      unit: '分'
    });

    const mrrScore = this.mrr(allRelevant, 10);
    rankingMetrics.push({
      name: 'mrr@10',
      value: mrrScore,
      description: '平均倒数排名@10',
      unit: '分'
    });

    const hitRateScore = this.hitRate(allRelevant, 10);
    rankingMetrics.push({
      name: 'hit-rate@10',
      value: hitRateScore,
      description: '命中率@10',
      unit: '%'
    });

    const catalogCoverageScore = this.catalogCoverage(allRecs, totalItems);
    coverageMetrics.push({
      name: 'catalog-coverage',
      value: catalogCoverageScore,
      description: '目录覆盖率',
      unit: '%'
    });

    const userCoverageScore = this.userCoverage(allRecs, totalUsers);
    coverageMetrics.push({
      name: 'user-coverage',
      value: userCoverageScore,
      description: '用户覆盖率',
      unit: '%'
    });

    const avgDiversity = usersRecommendations.reduce((sum, u) => {
      return sum + this.diversity(u.recommended, itemFeatures);
    }, 0) / usersRecommendations.length;
    diversityMetrics.push({
      name: 'intra-list-diversity',
      value: avgDiversity,
      description: '列表内多样性',
      unit: '分'
    });

    const gini = this.giniCoefficient(allRecs);
    diversityMetrics.push({
      name: 'gini-coefficient',
      value: gini,
      description: '基尼系数（推荐公平性）',
      unit: '分'
    });

    const avgNovelty = usersRecommendations.reduce((sum, u) => {
      return sum + this.novelty(u.recommended, itemPopularity, totalUsers);
    }, 0) / usersRecommendations.length;
    noveltyMetrics.push({
      name: 'popularity-novelty',
      value: avgNovelty,
      description: '基于流行度的新颖度',
      unit: '分'
    });

    const avgSerendipity = usersRecommendations.reduce((sum, u) => {
      return sum + this.serendipity(u.recommended, u.history, u.expected, u.relevant);
    }, 0) / usersRecommendations.length;
    serendipityMetrics.push({
      name: 'serendipity',
      value: avgSerendipity,
      description: '惊喜度',
      unit: '分'
    });

    const overallScore = this._calculateOverallScore(
      accuracyMetrics,
      rankingMetrics,
      coverageMetrics,
      diversityMetrics,
      noveltyMetrics,
      serendipityMetrics
    );

    const evaluation: RecommendationEvaluation = {
      accuracy: accuracyMetrics,
      ranking: rankingMetrics,
      coverage: coverageMetrics,
      diversity: diversityMetrics,
      novelty: noveltyMetrics,
      serendipity: serendipityMetrics,
      overallScore,
      timestamp: Date.now()
    };

    this._evaluation = evaluation;
    this._lastMetrics = new Map([
      ['precision@10', precisionAt10],
      ['recall@10', recallAt10],
      ['ndcg@10', ndcgAt10],
      ['map@10', mapAt10],
      ['coverage', catalogCoverageScore],
      ['diversity', avgDiversity],
      ['novelty', avgNovelty],
      ['overall', overallScore]
    ]);

    this._history.push({
      timestamp: evaluation.timestamp,
      metrics: Object.fromEntries(this._lastMetrics)
    });

    this._counter++;
    return evaluation;
  }

  private _calculateOverallScore(
    accuracy: MetricResult[],
    ranking: MetricResult[],
    coverage: MetricResult[],
    diversity: MetricResult[],
    novelty: MetricResult[],
    serendipity: MetricResult[]
  ): number {
    const weights = {
      accuracy: 0.3,
      ranking: 0.25,
      coverage: 0.15,
      diversity: 0.15,
      novelty: 0.1,
      serendipity: 0.05
    };

    const avgAccuracy = accuracy.length > 0
      ? accuracy.reduce((s, m) => s + m.value, 0) / accuracy.length
      : 0;
    const avgRanking = ranking.length > 0
      ? ranking.reduce((s, m) => s + m.value, 0) / ranking.length
      : 0;
    const avgCoverage = coverage.length > 0
      ? coverage.reduce((s, m) => s + m.value, 0) / coverage.length
      : 0;
    const avgDiversity = diversity.length > 0
      ? diversity.reduce((s, m) => s + m.value, 0) / diversity.length
      : 0;
    const avgNovelty = novelty.length > 0
      ? novelty.reduce((s, m) => s + m.value, 0) / novelty.length
      : 0;
    const avgSerendipity = serendipity.length > 0
      ? serendipity.reduce((s, m) => s + m.value, 0) / serendipity.length
      : 0;

    return (
      avgAccuracy * weights.accuracy +
      avgRanking * weights.ranking +
      avgCoverage * weights.coverage +
      avgDiversity * weights.diversity +
      avgNovelty * weights.novelty +
      avgSerendipity * weights.serendipity
    );
  }

  private _weightedHarmonicMean(p: number, r: number): number {
    if (p + r === 0) return 0;
    return (2 * p * r) / (p + r);
  }

  compareAB(
    groupA: RecommendationEvaluation,
    groupB: RecommendationEvaluation
  ): ABTestResult {
    const improvements: Record<string, number> = {};

    const allMetrics = [
      ...groupA.accuracy.map(m => ({ ...m, category: 'accuracy' })),
      ...groupA.ranking.map(m => ({ ...m, category: 'ranking' })),
      ...groupA.coverage.map(m => ({ ...m, category: 'coverage' })),
      ...groupA.diversity.map(m => ({ ...m, category: 'diversity' })),
      ...groupA.novelty.map(m => ({ ...m, category: 'novelty' })),
      ...groupA.serendipity.map(m => ({ ...m, category: 'serendipity' }))
    ];

    for (const metricA of allMetrics) {
      const metricB = this._findMetric(metricA.name, groupB);
      if (metricB && metricA.value > 0) {
        improvements[metricA.name] = (metricB.value - metricA.value) / metricA.value;
      }
    }

    const aScore = groupA.overallScore;
    const bScore = groupB.overallScore;
    const diff = bScore - aScore;
    const confidence = Math.min(0.95, Math.abs(diff) * 10);

    let winner: 'A' | 'B' | 'tie' = 'tie';
    if (diff > 0.01) {
      winner = 'B';
    } else if (diff < -0.01) {
      winner = 'A';
    }

    return {
      groupA,
      groupB,
      winner,
      confidence,
      improvements
    };
  }

  private _findMetric(name: string, evaluation: RecommendationEvaluation): MetricResult | undefined {
    const all = [
      ...evaluation.accuracy,
      ...evaluation.ranking,
      ...evaluation.coverage,
      ...evaluation.diversity,
      ...evaluation.novelty,
      ...evaluation.serendipity
    ];
    return all.find(m => m.name === name);
  }

  getTrend(metricName: string, periods: number = 10): Array<{ timestamp: number; value: number }> {
    return this._history
      .slice(-periods)
      .map(h => ({
        timestamp: h.timestamp,
        value: h.metrics[metricName] || 0
      }));
  }

  toPacket(): DataPacket<RecommendationEvaluation | null> {
    this._counter++;
    return {
      id: `metric-${Date.now()}-${this._counter}`,
      payload: this._evaluation,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'metrics'],
        priority: 1,
        phase: 'evaluation'
      }
    };
  }

  reset(): void {
    this._evaluation = null;
    this._counter = 0;
    this._lastMetrics.clear();
    this._history = [];
    this._feedbacks = [];
    this._predictions = [];
    this._dcgConfig = {
      k: 10,
      method: 'standard'
    };
    this._diversityConfig = {
      method: 'intra-list',
      similarityMetric: 'cosine',
      featureType: 'category'
    };
    this._noveltyConfig = {
      method: 'popularity-based',
      timeWindowDays: 30
    };
    this._coverageConfig = {
      type: 'catalog-coverage',
      threshold: 1
    };
  }
}
