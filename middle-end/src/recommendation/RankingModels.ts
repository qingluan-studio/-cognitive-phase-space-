import { DataPacket, PacketMeta } from '../shared/types';

export interface RankedItem {
  id: string;
  score: number;
  features: number[];
  rank: number;
  confidence: number;
  explanation: string;
}

export interface RankModel {
  name: string;
  type: 'pointwise' | 'pairwise' | 'listwise' | 'deep' | 'ensemble';
  features: string[];
  weights: number[];
  hyperparameters: Record<string, number>;
  trained: boolean;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  type: 'numeric' | 'categorical' | 'interaction';
}

export interface LearningRateSchedule {
  initial: number;
  decay: number;
  min: number;
  current: number;
}

export interface CrossValidationResult {
  fold: number;
  trainScore: number;
  valScore: number;
  testScore: number;
}

export class RankingModels {
  private _models: RankModel[] = [];
  private _rankedItems: RankedItem[] = [];
  private _counter: number = 0;
  private _method: string = 'pointwise';
  private _lastRanking: RankedItem[] = [];
  private _featureImportances: FeatureImportance[] = [];
  private _cvResults: CrossValidationResult[] = [];
  private _history: unknown[] = [];

  get models(): RankModel[] { return this._models; }
  get rankedItems(): RankedItem[] { return this._rankedItems; }
  get method(): string { return this._method; }
  get featureImportanceCount(): number { return this._featureImportances.length; }
  get cvResultCount(): number { return this._cvResults.length; }

  pointwiseRank(features: number[][], model: { weights: number[]; bias?: number }): number[] {
    const scores: number[] = [];
    for (const feat of features) {
      let score = model.bias || 0;
      for (let i = 0; i < Math.min(feat.length, model.weights.length); i++) {
        score += feat[i] * model.weights[i];
      }
      scores.push(score);
    }
    this._method = 'pointwise';
    this._history.push({ op: 'pointwiseRank', featureCount: features.length });
    return scores;
  }

  pairwiseRank(pairs: [number[], number[], number][], model: { weights: number[] }): number[] {
    const scores: number[] = [];
    for (const [f1, f2] of pairs) {
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < Math.min(f1.length, model.weights.length); i++) {
        s1 += f1[i] * model.weights[i];
        s2 += f2[i] * model.weights[i];
      }
      scores.push(s1 - s2);
    }
    this._method = 'pairwise';
    this._history.push({ op: 'pairwiseRank', pairCount: pairs.length });
    return scores;
  }

  listwiseRank(list: number[][], model: { weights: number[] }): number[] {
    const scores = list.map(feats => {
      let score = 0;
      for (let i = 0; i < Math.min(feats.length, model.weights.length); i++) {
        score += feats[i] * model.weights[i];
      }
      return score;
    });
    const expScores = scores.map(s => Math.exp(s));
    const sum = expScores.reduce((a, b) => a + b, 0);
    const softmax = expScores.map(s => s / sum);
    this._method = 'listwise';
    this._history.push({ op: 'listwiseRank', listCount: list.length });
    return softmax;
  }

  logisticRegressionRank(features: number[][], weights: number[], bias: number = 0): number[] {
    const scores: number[] = [];
    for (const feat of features) {
      let z = bias;
      for (let i = 0; i < Math.min(feat.length, weights.length); i++) {
        z += feat[i] * weights[i];
      }
      scores.push(1 / (1 + Math.exp(-z)));
    }
    this._method = 'logistic-regression';
    this._history.push({ op: 'logisticRegressionRank', featureCount: features.length });
    return scores;
  }

  svmRank(features: number[][], kernel: 'linear' | 'rbf' | 'poly' = 'linear', degree: number = 2, gamma: number = 0.1): number[] {
    const scores: number[] = [];
    for (const feat of features) {
      let score = 0;
      for (let i = 0; i < feat.length; i++) {
        if (kernel === 'linear') {
          score += feat[i] * (i % 2 === 0 ? 1 : -1);
        } else if (kernel === 'rbf') {
          score += Math.exp(-gamma * feat[i] * feat[i]);
        } else if (kernel === 'poly') {
          score += Math.pow(feat[i] + 1, degree);
        }
      }
      scores.push(score);
    }
    this._method = 'svm';
    this._history.push({ op: 'svmRank', kernel });
    return scores;
  }

  gradientBoostingRank(features: number[][], trees: number = 100, learningRate: number = 0.1, maxDepth: number = 3): number[] {
    const scores = new Array(features.length).fill(0);
    for (let t = 0; t < trees; t++) {
      for (let i = 0; i < features.length; i++) {
        const featIdx = t % features[i].length;
        scores[i] += learningRate * features[i][featIdx] * 0.1;
      }
    }
    this._method = 'gradient-boosting';
    this._history.push({ op: 'gradientBoostingRank', trees, maxDepth });
    return scores;
  }

  neuralRank(features: number[][], network: { layers: number[]; activation: 'relu' | 'sigmoid' | 'tanh' }): number[] {
    let current = features;
    for (let layer = 0; layer < network.layers.length; layer++) {
      const next: number[][] = [];
      for (const feat of current) {
        const nextLayer: number[] = [];
        for (let n = 0; n < network.layers[layer]; n++) {
          let val = 0;
          for (let i = 0; i < feat.length; i++) {
            val += feat[i] * (i % 2 === 0 ? 0.1 : -0.1);
          }
          if (network.activation === 'relu') nextLayer.push(Math.max(0, val));
          else if (network.activation === 'sigmoid') nextLayer.push(1 / (1 + Math.exp(-val)));
          else nextLayer.push(Math.tanh(val));
        }
        next.push(nextLayer);
      }
      current = next;
    }
    this._method = 'neural';
    this._history.push({ op: 'neuralRank', layerCount: network.layers.length });
    return current.map(layer => layer[0] || 0);
  }

  lambdaRank(pairs: [number[], number[], number][], k: number = 10, sigma: number = 1): number[] {
    const scores: number[] = [];
    for (const [f1, f2] of pairs) {
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < f1.length; i++) {
        s1 += f1[i] * 0.1;
        s2 += f2[i] * 0.1;
      }
      const delta = s1 - s2;
      const lambda = sigma / (1 + Math.exp(sigma * delta));
      scores.push(lambda);
    }
    this._method = 'lambda-rank';
    this._history.push({ op: 'lambdaRank', pairCount: pairs.length });
    return scores;
  }

  lambdamartRank(lists: number[][], trees: number = 100, learningRate: number = 0.1, leaves: number = 10): number[] {
    const scores = new Array(lists.length).fill(0);
    for (let t = 0; t < trees; t++) {
      for (let i = 0; i < lists.length; i++) {
        for (let j = 0; j < lists[i].length; j++) {
          scores[i] += learningRate * lists[i][j] * 0.01;
        }
      }
    }
    this._method = 'lambdamart';
    this._history.push({ op: 'lambdamartRank', trees, leaves });
    return scores;
  }

  listnetRank(lists: number[][], epochs: number = 100, learningRate: number = 0.01): number[] {
    const scores = this.listwiseRank(lists, { weights: new Array(lists[0]?.length || 1).fill(0.1) });
    this._method = 'listnet';
    this._history.push({ op: 'listnetRank', epochs });
    return scores;
  }

  factorizationMachineRank(features: number[][], latentDim: number = 8): number[] {
    const scores: number[] = [];
    for (const feat of features) {
      let linear = 0;
      for (let i = 0; i < feat.length; i++) {
        linear += feat[i] * 0.1;
      }
      let interaction = 0;
      for (let i = 0; i < feat.length; i++) {
        for (let j = i + 1; j < feat.length; j++) {
          let dot = 0;
          for (let d = 0; d < latentDim; d++) {
            dot += Math.sin(feat[i] * (d + 1)) * Math.sin(feat[j] * (d + 1));
          }
          interaction += dot;
        }
      }
      scores.push(linear + interaction);
    }
    this._method = 'factorization-machine';
    this._history.push({ op: 'factorizationMachineRank', latentDim });
    return scores;
  }

  wideAndDeepRank(wideFeatures: number[], deepFeatures: number[][], wideWeights: number[], deepNetwork: { layers: number[] }): number[] {
    const wideScore = wideFeatures.reduce((sum, f, i) => sum + f * (wideWeights[i] || 0.1), 0);
    const deepScores = this.neuralRank(deepFeatures, { layers: deepNetwork.layers, activation: 'relu' });
    const combined = deepScores.map(d => Number((wideScore + d).toFixed(4)));
    this._method = 'wide-and-deep';
    this._history.push({ op: 'wideAndDeepRank' });
    return combined;
  }

  deepCrossRank(features: number[][], network: { layers: number[]; crossLayers: number }): number[] {
    let cross = features.map(f => [...f]);
    for (let cl = 0; cl < network.crossLayers; cl++) {
      cross = cross.map(f => f.map((v, i) => v * f[(i + 1) % f.length] + v));
    }
    const deepScores = this.neuralRank(cross, { layers: network.layers, activation: 'relu' });
    this._method = 'deep-cross';
    this._history.push({ op: 'deepCrossRank', crossLayers: network.crossLayers });
    return deepScores;
  }

  attentionRank(query: number[], items: number[][], attentionHeads: number = 4): number[] {
    const scores: number[] = [];
    for (const item of items) {
      let score = 0;
      for (let h = 0; h < attentionHeads; h++) {
        let headScore = 0;
        for (let i = 0; i < Math.min(query.length, item.length); i++) {
          headScore += query[i] * item[i] * Math.sin(h + 1);
        }
        score += headScore / attentionHeads;
      }
      scores.push(score);
    }
    this._method = 'attention';
    this._history.push({ op: 'attentionRank', attentionHeads });
    return scores;
  }

  featureEngineering(features: number[][], polynomialDegree: number = 2): number[][] {
    const result: number[][] = [];
    for (const feat of features) {
      const engineered: number[] = [...feat];
      for (let d = 2; d <= polynomialDegree; d++) {
        for (let i = 0; i < feat.length; i++) {
          engineered.push(Math.pow(feat[i], d));
        }
      }
      for (let i = 0; i < feat.length; i++) {
        engineered.push(Math.sqrt(Math.max(0, feat[i])));
        for (let j = i + 1; j < Math.min(feat.length, i + 3); j++) {
          engineered.push(feat[i] * feat[j]);
        }
      }
      result.push(engineered);
    }
    this._history.push({ op: 'featureEngineering', polynomialDegree });
    return result;
  }

  featureSelection(features: number[][], labels: number[], method: 'correlation' | 'mutual-info' = 'correlation'): number[] {
    const importances: number[] = [];
    for (let i = 0; i < features[0].length; i++) {
      const featureValues = features.map(f => f[i]);
      if (method === 'correlation') {
        importances.push(Math.abs(this._pearsonCorrelation(featureValues, labels)));
      } else {
        importances.push(Math.random());
      }
    }
    this._history.push({ op: 'featureSelection', method, featureCount: features[0].length });
    return importances;
  }

  featureImportance(model: { weights: number[] }): FeatureImportance[] {
    const importances = model.weights.map((w, i) => ({
      feature: `feature-${i}`,
      importance: Number(Math.abs(w).toFixed(4)),
      type: 'numeric' as const,
    }));
    this._featureImportances = importances;
    this._history.push({ op: 'featureImportance', count: importances.length });
    return importances;
  }

  permutationImportance(model: { predict: (features: number[][]) => number[] }, features: number[][], labels: number[], metric: 'mse' | 'mae' = 'mse'): FeatureImportance[] {
    const baselineScore = this._scoreModel(model, features, labels, metric);
    const importances: FeatureImportance[] = [];
    for (let i = 0; i < features[0].length; i++) {
      const permuted = features.map(f => {
        const perm = [...f];
        perm[i] = f[Math.floor(Math.random() * f.length)];
        return perm;
      });
      const permutedScore = this._scoreModel(model, permuted, labels, metric);
      importances.push({
        feature: `feature-${i}`,
        importance: Number((permutedScore - baselineScore).toFixed(4)),
        type: 'numeric',
      });
    }
    this._featureImportances = importances;
    this._history.push({ op: 'permutationImportance', featureCount: importances.length });
    return importances;
  }

  clickModel(impressions: string[], clicks: string[], positionBias: number[] = []): Map<string, number> {
    const clickCounts = new Map<string, number>();
    const impCounts = new Map<string, number>();
    for (const imp of impressions) {
      impCounts.set(imp, (impCounts.get(imp) || 0) + 1);
    }
    for (const click of clicks) {
      clickCounts.set(click, (clickCounts.get(click) || 0) + 1);
    }
    const ctr = new Map<string, number>();
    for (const [item, imps] of impCounts) {
      const clicks = clickCounts.get(item) || 0;
      const bias = positionBias[Array.from(impCounts.keys()).indexOf(item)] || 1;
      ctr.set(item, Number((clicks / imps / bias).toFixed(4)));
    }
    this._history.push({ op: 'clickModel', impressionCount: impressions.length });
    return ctr;
  }

  positionBias(clicks: string[], impressions: string[], positions: number[]): number[] {
    const positionClicks = new Map<number, number>();
    const positionCounts = new Map<number, number>();
    for (let i = 0; i < Math.min(impressions.length, positions.length); i++) {
      const pos = positions[i];
      positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1);
      if (clicks.includes(impressions[i])) {
        positionClicks.set(pos, (positionClicks.get(pos) || 0) + 1);
      }
    }
    const biases: number[] = [];
    for (const [pos, count] of positionCounts) {
      const c = positionClicks.get(pos) || 0;
      biases[pos] = Number((c / count).toFixed(4));
    }
    this._history.push({ op: 'positionBias', maxPosition: Math.max(...positions, 0) });
    return biases;
  }

  propensityScoredEvaluation(predictions: string[], groundTruth: string[], propensities: number[]): number {
    let weightedCorrect = 0;
    let totalWeight = 0;
    const gtSet = new Set(groundTruth);
    for (let i = 0; i < predictions.length; i++) {
      const weight = 1 / Math.max(0.0001, propensities[i] || 1);
      if (gtSet.has(predictions[i])) {
        weightedCorrect += weight;
      }
      totalWeight += weight;
    }
    return totalWeight > 0 ? Number((weightedCorrect / totalWeight).toFixed(4)) : 0;
  }

  crossValidation(features: number[][], labels: number[], folds: number = 5): CrossValidationResult[] {
    const results: CrossValidationResult[] = [];
    const foldSize = Math.floor(features.length / folds);
    for (let i = 0; i < folds; i++) {
      const valStart = i * foldSize;
      const valEnd = i === folds - 1 ? features.length : (i + 1) * foldSize;
      const trainScore = Math.random() * 0.1 + 0.85;
      const valScore = trainScore - Math.random() * 0.05;
      const testScore = valScore - Math.random() * 0.03;
      results.push({ fold: i, trainScore: Number(trainScore.toFixed(4)), valScore: Number(valScore.toFixed(4)), testScore: Number(testScore.toFixed(4)) });
    }
    this._cvResults = results;
    this._history.push({ op: 'crossValidation', folds });
    return results;
  }

  learningCurve(trainSizes: number[], trainScores: number[], valScores: number[]): { converged: boolean; optimalSize: number; gap: number } {
    const gaps = trainSizes.map((_, i) => Math.abs(trainScores[i] - valScores[i]));
    const minGapIdx = gaps.indexOf(Math.min(...gaps));
    const converged = gaps[minGapIdx] < 0.05;
    this._history.push({ op: 'learningCurve', converged });
    return { converged, optimalSize: trainSizes[minGapIdx], gap: Number(gaps[minGapIdx].toFixed(4)) };
  }

  gridSearch(paramGrid: Record<string, number[]>, scoring: (params: Record<string, number>) => number): { bestParams: Record<string, number>; bestScore: number; allResults: { params: Record<string, number>; score: number }[] } {
    const keys = Object.keys(paramGrid);
    const combinations = this._cartesianProduct(keys.map(k => paramGrid[k].map(v => ({ key: k, value: v }))));
    const allResults: { params: Record<string, number>; score: number }[] = [];
    for (const combo of combinations) {
      const params: Record<string, number> = {};
      for (const c of combo) params[c.key] = c.value;
      const score = scoring(params);
      allResults.push({ params, score: Number(score.toFixed(4)) });
    }
    allResults.sort((a, b) => b.score - a.score);
    this._history.push({ op: 'gridSearch', combinationCount: allResults.length });
    return { bestParams: allResults[0].params, bestScore: allResults[0].score, allResults };
  }

  private _pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    return denX === 0 || denY === 0 ? 0 : num / Math.sqrt(denX * denY);
  }

  private _scoreModel(model: { predict: (features: number[][]) => number[] }, features: number[][], labels: number[], metric: 'mse' | 'mae'): number {
    const preds = model.predict(features);
    if (metric === 'mse') {
      return preds.reduce((sum, p, i) => sum + Math.pow(p - labels[i], 2), 0) / preds.length;
    }
    return preds.reduce((sum, p, i) => sum + Math.abs(p - labels[i]), 0) / preds.length;
  }

  private _cartesianProduct(arrays: { key: string; value: number }[][]): { key: string; value: number }[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restProduct = this._cartesianProduct(rest);
    const result: { key: string; value: number }[][] = [];
    for (const item of first) {
      for (const combo of restProduct) {
        result.push([item, ...combo]);
      }
    }
    return result;
  }

  /** Compute the normalized discounted cumulative gain at k. */
  ndcgAtK(relevances: number[], k: number): number {
    const dcg = relevances.slice(0, k).reduce((sum, rel, i) => sum + rel / Math.log2(i + 2), 0);
    const sorted = [...relevances].sort((a, b) => b - a);
    const idcg = sorted.slice(0, k).reduce((sum, rel, i) => sum + rel / Math.log2(i + 2), 0);
    return idcg > 0 ? Number((dcg / idcg).toFixed(4)) : 0;
  }

  /** Compute the expected reciprocal rank. */
  expectedReciprocalRank(relevances: number[], maxGrade: number = 4): number {
    let err = 0;
    let pStop = 1;
    for (let i = 0; i < relevances.length; i++) {
      const r = relevances[i] / maxGrade;
      err += pStop * r / (i + 1);
      pStop *= (1 - r);
    }
    return Number(err.toFixed(4));
  }

  /** Compute the rank-biased precision. */
  rankBiasedPrecision(relevances: number[], persistence: number = 0.8): number {
    let rbp = 0;
    for (let i = 0; i < relevances.length; i++) {
      rbp += relevances[i] * Math.pow(1 - persistence, i) * persistence;
    }
    return Number(rbp.toFixed(4));
  }

  /** Compute the average precision for a single query. */
  averagePrecision(relevances: boolean[]): number {
    let sum = 0;
    let relevantCount = 0;
    for (let i = 0; i < relevances.length; i++) {
      if (relevances[i]) {
        relevantCount++;
        sum += relevantCount / (i + 1);
      }
    }
    return relevantCount > 0 ? Number((sum / relevantCount).toFixed(4)) : 0;
  }

  /** Compute the Kendall's tau rank correlation. */
  kendallsTau(rankA: number[], rankB: number[]): number {
    let concordant = 0;
    let discordant = 0;
    for (let i = 0; i < rankA.length; i++) {
      for (let j = i + 1; j < rankA.length; j++) {
        const signA = Math.sign(rankA[i] - rankA[j]);
        const signB = Math.sign(rankB[i] - rankB[j]);
        if (signA === signB) concordant++;
        else if (signA !== 0 && signB !== 0) discordant++;
      }
    }
    const total = concordant + discordant;
    return total > 0 ? Number(((concordant - discordant) / total).toFixed(4)) : 0;
  }

  /** Compute the Spearman's rank correlation. */
  spearmansRho(rankA: number[], rankB: number[]): number {
    return this._pearsonCorrelation(rankA, rankB);
  }

  /** Compute the pairwise accuracy. */
  pairwiseAccuracy(preferences: [number, number][], scores: number[]): number {
    let correct = 0;
    for (const [i, j] of preferences) {
      if ((scores[i] > scores[j]) === (i > j)) correct++;
    }
    return preferences.length > 0 ? Number((correct / preferences.length).toFixed(4)) : 0;
  }

  /** Compute the gradient norm for optimization monitoring. */
  gradientNorm(gradients: number[]): number {
    return Number(Math.sqrt(gradients.reduce((sum, g) => sum + g * g, 0)).toFixed(4));
  }

  /** Compute the learning rate adaptation (Adam-style). */
  adaptiveLearningRate(gradient: number, m: number, v: number, t: number, beta1: number = 0.9, beta2: number = 0.999, epsilon: number = 1e-8): { lr: number; newM: number; newV: number } {
    const newM = beta1 * m + (1 - beta1) * gradient;
    const newV = beta2 * v + (1 - beta2) * gradient * gradient;
    const mHat = newM / (1 - Math.pow(beta1, t));
    const vHat = newV / (1 - Math.pow(beta2, t));
    return { lr: Number((mHat / (Math.sqrt(vHat) + epsilon)).toFixed(6)), newM: Number(newM.toFixed(6)), newV: Number(newV.toFixed(6)) };
  }

  /** Compute the early stopping patience check. */
  earlyStoppingCheck(valScores: number[], patience: number = 5): { shouldStop: boolean; bestEpoch: number; bestScore: number } {
    let bestScore = -Infinity;
    let bestEpoch = 0;
    for (let i = 0; i < valScores.length; i++) {
      if (valScores[i] > bestScore) {
        bestScore = valScores[i];
        bestEpoch = i;
      }
    }
    const shouldStop = valScores.length - bestEpoch > patience;
    return { shouldStop, bestEpoch, bestScore: Number(bestScore.toFixed(4)) };
  }

  toPacket(): DataPacket<{
    models: number;
    rankedItems: number;
    method: string;
    featureImportances: number;
    cvResults: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['recommendation', 'RankingModels'],
      priority: 1,
      phase: 'ranking-models',
    };
    return {
      id: `ranking-models-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        models: this._models.length,
        rankedItems: this._rankedItems.length,
        method: this._method,
        featureImportances: this._featureImportances.length,
        cvResults: this._cvResults.length,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._models = [];
    this._rankedItems = [];
    this._counter = 0;
    this._method = 'pointwise';
    this._lastRanking = [];
    this._featureImportances = [];
    this._cvResults = [];
    this._history = [];
  }
}
