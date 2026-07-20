import { DataPacket, PacketMeta } from '../shared/types';

export interface EvaluationResult {
  metrics: Map<string, number>;
  method: string;
  timestamp: number;
}

export interface Metric {
  name: string;
  value: number;
  method: string;
  confidenceInterval?: [number, number];
  significance?: 'significant' | 'not-significant';
}

export interface RankingMetric {
  k: number;
  precision: number;
  recall: number;
  f1: number;
  ndcg: number;
  mrr: number;
}

export interface BiasMetric {
  type: 'popularity' | 'position' | 'exposure' | 'demographic';
  score: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';
}

export class EvaluationMetrics {
  private _metrics: Metric[] = [];
  private _method: string = 'default';
  private _counter: number = 0;
  private _lastResult: EvaluationResult | null = null;
  private _rankingMetrics: RankingMetric[] = [];
  private _biasMetrics: BiasMetric[] = [];
  private _history: unknown[] = [];

  get metrics(): Metric[] { return this._metrics; }
  get method(): string { return this._method; }
  get rankingMetricCount(): number { return this._rankingMetrics.length; }
  get biasMetricCount(): number { return this._biasMetrics.length; }

  precisionAtK(predictions: string[], groundTruth: string[], k: number): number {
    const topK = predictions.slice(0, k);
    const gtSet = new Set(groundTruth);
    let tp = 0;
    for (const p of topK) {
      if (gtSet.has(p)) tp++;
    }
    return k > 0 ? tp / k : 0;
  }

  recallAtK(predictions: string[], groundTruth: string[], k: number): number {
    const topK = predictions.slice(0, k);
    const gtSet = new Set(groundTruth);
    let tp = 0;
    for (const p of topK) {
      if (gtSet.has(p)) tp++;
    }
    return groundTruth.length > 0 ? tp / groundTruth.length : 0;
  }

  f1ScoreAtK(predictions: string[], groundTruth: string[], k: number): number {
    const precision = this.precisionAtK(predictions, groundTruth, k);
    const recall = this.recallAtK(predictions, groundTruth, k);
    if (precision + recall === 0) return 0;
    return 2 * precision * recall / (precision + recall);
  }

  ndcg(predictions: string[], groundTruth: string[], k: number): number {
    const topK = predictions.slice(0, k);
    const gtSet = new Set(groundTruth);
    let dcg = 0;
    let idcg = 0;
    for (let i = 0; i < topK.length; i++) {
      const rel = gtSet.has(topK[i]) ? 1 : 0;
      dcg += rel / Math.log2(i + 2);
    }
    const idealRel = Math.min(k, groundTruth.length);
    for (let i = 0; i < idealRel; i++) {
      idcg += 1 / Math.log2(i + 2);
    }
    return idcg > 0 ? dcg / idcg : 0;
  }

  mapScore(predictions: string[], groundTruth: string[]): number {
    const gtSet = new Set(groundTruth);
    let averagePrecision = 0;
    let relevantCount = 0;
    for (let i = 0; i < predictions.length; i++) {
      if (gtSet.has(predictions[i])) {
        relevantCount++;
        averagePrecision += relevantCount / (i + 1);
      }
    }
    return groundTruth.length > 0 ? averagePrecision / groundTruth.length : 0;
  }

  mrr(predictions: string[], groundTruth: string[]): number {
    const gtSet = new Set(groundTruth);
    for (let i = 0; i < predictions.length; i++) {
      if (gtSet.has(predictions[i])) {
        return 1 / (i + 1);
      }
    }
    return 0;
  }

  coverage(predictions: string[], allItems: string[]): number {
    const predicted = new Set(predictions);
    return allItems.length > 0 ? predicted.size / allItems.length : 0;
  }

  diversity(predictions: string[], features: Map<string, string[]>): number {
    const allFeatures = new Set<string>();
    let totalFeatures = 0;
    for (const pred of predictions) {
      const f = features.get(pred) || [];
      f.forEach(feat => allFeatures.add(feat));
      totalFeatures += f.length;
    }
    return totalFeatures > 0 ? allFeatures.size / totalFeatures : 0;
  }

  intraListDiversity(predictions: string[], similarityMatrix: Map<string, Map<string, number>>): number {
    let totalDiversity = 0;
    let pairCount = 0;
    for (let i = 0; i < predictions.length; i++) {
      for (let j = i + 1; j < predictions.length; j++) {
        const sim = similarityMatrix.get(predictions[i])?.get(predictions[j]) || 0;
        totalDiversity += 1 - sim;
        pairCount++;
      }
    }
    return pairCount > 0 ? totalDiversity / pairCount : 0;
  }

  novelty(predictions: string[], popularity: Map<string, number>): number {
    let totalNovelty = 0;
    const maxPop = Math.max(...Array.from(popularity.values()), 1);
    for (const pred of predictions) {
      const pop = popularity.get(pred) || 0;
      totalNovelty += 1 - pop / maxPop;
    }
    return predictions.length > 0 ? totalNovelty / predictions.length : 0;
  }

  serendipity(predictions: string[], expected: string[], groundTruth: string[]): number {
    const expectedSet = new Set(expected);
    const gtSet = new Set(groundTruth);
    let surprise = 0;
    for (const pred of predictions) {
      if (!expectedSet.has(pred) && gtSet.has(pred)) {
        surprise++;
      }
    }
    return predictions.length > 0 ? surprise / predictions.length : 0;
  }

  unexpectedness(predictions: string[], baselinePredictions: string[]): number {
    const baselineSet = new Set(baselinePredictions);
    let unexpected = 0;
    for (const pred of predictions) {
      if (!baselineSet.has(pred)) unexpected++;
    }
    return predictions.length > 0 ? unexpected / predictions.length : 0;
  }

  mae(predicted: number[], actual: number[]): number {
    if (predicted.length === 0) return 0;
    let sum = 0;
    const n = Math.min(predicted.length, actual.length);
    for (let i = 0; i < n; i++) {
      sum += Math.abs(predicted[i] - actual[i]);
    }
    return sum / n;
  }

  rmse(predicted: number[], actual: number[]): number {
    if (predicted.length === 0) return 0;
    let sum = 0;
    const n = Math.min(predicted.length, actual.length);
    for (let i = 0; i < n; i++) {
      const diff = predicted[i] - actual[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum / n);
  }

  mse(predicted: number[], actual: number[]): number {
    if (predicted.length === 0) return 0;
    let sum = 0;
    const n = Math.min(predicted.length, actual.length);
    for (let i = 0; i < n; i++) {
      const diff = predicted[i] - actual[i];
      sum += diff * diff;
    }
    return sum / n;
  }

  rSquared(predicted: number[], actual: number[]): number {
    if (actual.length === 0) return 0;
    const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
    const ssTot = actual.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
    const ssRes = predicted.slice(0, actual.length).reduce((sum, p, i) => sum + Math.pow(p - actual[i], 2), 0);
    return ssTot > 0 ? 1 - ssRes / ssTot : 0;
  }

  userCoverage(users: string[], predictions: Map<string, string[]>): number {
    let covered = 0;
    for (const user of users) {
      if (predictions.has(user) && predictions.get(user)!.length > 0) {
        covered++;
      }
    }
    return users.length > 0 ? covered / users.length : 0;
  }

  itemCoverage(items: string[], predictions: string[]): number {
    return this.coverage(predictions, items);
  }

  catalogCoverage(predictions: string[][], catalogSize: number): number {
    const allPredicted = new Set<string>();
    for (const pred of predictions) {
      for (const item of pred) allPredicted.add(item);
    }
    return catalogSize > 0 ? allPredicted.size / catalogSize : 0;
  }

  hitRate(predictions: string[], groundTruth: string[]): number {
    const gtSet = new Set(groundTruth);
    for (const pred of predictions) {
      if (gtSet.has(pred)) return 1;
    }
    return 0;
  }

  averageReciprocalHitRank(predictions: string[], groundTruth: string[]): number {
    const gtSet = new Set(groundTruth);
    let sum = 0;
    let hitCount = 0;
    for (let i = 0; i < predictions.length; i++) {
      if (gtSet.has(predictions[i])) {
        sum += 1 / (i + 1);
        hitCount++;
      }
    }
    return hitCount > 0 ? sum / hitCount : 0;
  }

  personalization(userPredictions: Map<string, string[]>): number {
    const users = Array.from(userPredictions.keys());
    let totalHamming = 0;
    let pairCount = 0;
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const pred1 = new Set(userPredictions.get(users[i]) || []);
        const pred2 = new Set(userPredictions.get(users[j]) || []);
        const union = new Set([...pred1, ...pred2]);
        const intersection = new Set([...pred1].filter(x => pred2.has(x)));
        const hamming = union.size > 0 ? 1 - intersection.size / union.size : 0;
        totalHamming += hamming;
        pairCount++;
      }
    }
    return pairCount > 0 ? totalHamming / pairCount : 0;
  }

  popularityBias(predictions: string[], itemPopularity: Map<string, number>): BiasMetric {
    let totalPop = 0;
    for (const pred of predictions) {
      totalPop += itemPopularity.get(pred) || 0;
    }
    const avgPop = predictions.length > 0 ? totalPop / predictions.length : 0;
    const maxPop = Math.max(...Array.from(itemPopularity.values()), 1);
    const score = avgPop / maxPop;
    const severity: BiasMetric['severity'] = score > 0.7 ? 'critical' : score > 0.5 ? 'high' : score > 0.3 ? 'moderate' : 'low';
    const metric: BiasMetric = { type: 'popularity', score: Number(score.toFixed(2)), severity };
    this._biasMetrics.push(metric);
    return metric;
  }

  positionBias(clicks: string[], impressions: string[], positions: number[]): BiasMetric {
    const positionCtr = new Map<number, number>();
    const positionCount = new Map<number, number>();
    for (let i = 0; i < Math.min(impressions.length, positions.length); i++) {
      const pos = positions[i];
      positionCount.set(pos, (positionCount.get(pos) || 0) + 1);
      if (clicks.includes(impressions[i])) {
        positionCtr.set(pos, (positionCtr.get(pos) || 0) + 1);
      }
    }
    let maxCtr = 0;
    let minCtr = Infinity;
    for (const [pos, count] of positionCount) {
      const ctr = (positionCtr.get(pos) || 0) / count;
      maxCtr = Math.max(maxCtr, ctr);
      minCtr = Math.min(minCtr, ctr);
    }
    const score = maxCtr > 0 ? 1 - minCtr / maxCtr : 0;
    const severity: BiasMetric['severity'] = score > 0.7 ? 'critical' : score > 0.5 ? 'high' : score > 0.3 ? 'moderate' : 'low';
    const metric: BiasMetric = { type: 'position', score: Number(score.toFixed(2)), severity };
    this._biasMetrics.push(metric);
    return metric;
  }

  exposureFairness(itemExposures: Map<string, number>, itemMerits: Map<string, number>): BiasMetric {
    let totalDeviation = 0;
    let count = 0;
    for (const [item, exposure] of itemExposures) {
      const merit = itemMerits.get(item) || 0;
      const expectedExposure = merit * Array.from(itemExposures.values()).reduce((a, b) => a + b, 0);
      totalDeviation += Math.abs(exposure - expectedExposure);
      count++;
    }
    const score = count > 0 ? totalDeviation / count : 0;
    const severity: BiasMetric['severity'] = score > 0.7 ? 'critical' : score > 0.5 ? 'high' : score > 0.3 ? 'moderate' : 'low';
    const metric: BiasMetric = { type: 'exposure', score: Number(score.toFixed(2)), severity };
    this._biasMetrics.push(metric);
    return metric;
  }

  statisticalSignificanceTest(metricA: number[], metricB: number[], testType: 't-test' | 'wilcoxon' = 't-test'): { pValue: number; significant: boolean; effectSize: number } {
    const meanA = metricA.reduce((a, b) => a + b, 0) / metricA.length;
    const meanB = metricB.reduce((a, b) => a + b, 0) / metricB.length;
    const pooledStd = Math.sqrt((this._variance(metricA) + this._variance(metricB)) / 2);
    const se = pooledStd * Math.sqrt(1 / metricA.length + 1 / metricB.length);
    const tStat = se > 0 ? (meanA - meanB) / se : 0;
    const df = metricA.length + metricB.length - 2;
    const pValue = this._approximatePValue(tStat, df);
    const cohensD = pooledStd > 0 ? Math.abs(meanA - meanB) / pooledStd : 0;
    return { pValue: Number(pValue.toFixed(4)), significant: pValue < 0.05, effectSize: Number(cohensD.toFixed(2)) };
  }

  confidenceInterval(values: number[], confidence: number = 0.95): [number, number] {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(this._variance(values));
    const z = confidence === 0.99 ? 2.576 : confidence === 0.95 ? 1.96 : 1.645;
    const margin = z * std / Math.sqrt(values.length);
    return [Number((mean - margin).toFixed(4)), Number((mean + margin).toFixed(4))];
  }

  bootstrapMetric(values: number[], metricFn: (vals: number[]) => number, iterations: number = 1000): { mean: number; std: number; ci95: [number, number] } {
    const estimates: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const sample = this._bootstrapSample(values);
      estimates.push(metricFn(sample));
    }
    estimates.sort((a, b) => a - b);
    const mean = estimates.reduce((a, b) => a + b, 0) / estimates.length;
    const std = Math.sqrt(this._variance(estimates));
    const lowerIdx = Math.floor(0.025 * estimates.length);
    const upperIdx = Math.ceil(0.975 * estimates.length);
    return { mean: Number(mean.toFixed(4)), std: Number(std.toFixed(4)), ci95: [Number(estimates[lowerIdx].toFixed(4)), Number(estimates[upperIdx].toFixed(4))] };
  }

  rocAuc(scores: { score: number; label: boolean }[]): number {
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    let tp = 0;
    let fp = 0;
    let tpPrev = 0;
    let fpPrev = 0;
    let auc = 0;
    const posCount = sorted.filter(s => s.label).length;
    const negCount = sorted.length - posCount;
    if (posCount === 0 || negCount === 0) return 0.5;
    for (const s of sorted) {
      if (s.label) {
        tp++;
      } else {
        fp++;
        auc += (tp + tpPrev) / 2;
        tpPrev = tp;
        fpPrev = fp;
      }
    }
    return Number((auc / (posCount * negCount)).toFixed(4));
  }

  logLoss(predicted: number[], actual: boolean[]): number {
    let sum = 0;
    const n = Math.min(predicted.length, actual.length);
    for (let i = 0; i < n; i++) {
      const p = Math.max(0.0001, Math.min(0.9999, predicted[i]));
      sum += actual[i] ? -Math.log(p) : -Math.log(1 - p);
    }
    return sum / n;
  }

  calibrationError(predicted: number[], actual: boolean[], bins: number = 10): number {
    const binPreds: number[][] = Array.from({ length: bins }, () => []);
    const binActuals: boolean[][] = Array.from({ length: bins }, () => []);
    for (let i = 0; i < predicted.length; i++) {
      const binIdx = Math.min(bins - 1, Math.floor(predicted[i] * bins));
      binPreds[binIdx].push(predicted[i]);
      binActuals[binIdx].push(actual[i]);
    }
    let ece = 0;
    for (let i = 0; i < bins; i++) {
      if (binPreds[i].length > 0) {
        const avgPred = binPreds[i].reduce((a, b) => a + b, 0) / binPreds[i].length;
        const avgActual = binActuals[i].filter(a => a).length / binActuals[i].length;
        ece += binPreds[i].length * Math.abs(avgPred - avgActual);
      }
    }
    return predicted.length > 0 ? Number((ece / predicted.length).toFixed(4)) : 0;
  }

  throughputLatencyTradeoff(throughputs: number[], latencies: number[]): number {
    if (throughputs.length === 0 || latencies.length === 0) return 0;
    const totalThroughput = throughputs.reduce((a, b) => a + b, 0);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    return Number((totalThroughput / Math.max(1, avgLatency)).toFixed(2));
  }

  private _variance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private _bootstrapSample(values: number[]): number[] {
    const sample: number[] = [];
    for (let i = 0; i < values.length; i++) {
      sample.push(values[Math.floor(Math.random() * values.length)]);
    }
    return sample;
  }

  private _approximatePValue(tStat: number, df: number): number {
    const absT = Math.abs(tStat);
    return Math.exp(-0.717 * absT - 0.416 * absT * absT);
  }

  /** Compute the Gini index for recommendation concentration. */
  giniIndex(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    let sum = 0;
    for (let i = 0; i < sorted.length; i++) {
      sum += (2 * (i + 1) - sorted.length - 1) * sorted[i];
    }
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    return mean === 0 ? 0 : Number((sum / (sorted.length * sorted.length * mean)).toFixed(2));
  }

  /** Compute the Shannon entropy for recommendation diversity. */
  shannonEntropy(probabilities: number[]): number {
    let entropy = 0;
    for (const p of probabilities) {
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return Number(entropy.toFixed(2));
  }

  /** Compute the KL divergence between two distributions. */
  klDivergence(p: number[], q: number[]): number {
    let kl = 0;
    for (let i = 0; i < Math.min(p.length, q.length); i++) {
      if (p[i] > 0 && q[i] > 0) kl += p[i] * Math.log(p[i] / q[i]);
    }
    return Number(kl.toFixed(4));
  }

  /** Compute the Jensen-Shannon divergence. */
  jensenShannonDivergence(p: number[], q: number[]): number {
    const m = p.map((pi, i) => (pi + (q[i] || 0)) / 2);
    return Number(((this.klDivergence(p, m) + this.klDivergence(q, m)) / 2).toFixed(4));
  }

  /** Compute the recommendation list conciseness. */
  conciseness(predictions: string[], groundTruth: string[]): number {
    const gtSet = new Set(groundTruth);
    const relevant = predictions.filter(p => gtSet.has(p)).length;
    return predictions.length > 0 ? Number((relevant / predictions.length).toFixed(2)) : 0;
  }

  /** Compute the recommendation persistence across time. */
  persistence(predictions_t1: string[], predictions_t2: string[]): number {
    const set1 = new Set(predictions_t1);
    const overlap = predictions_t2.filter(p => set1.has(p)).length;
    return predictions_t1.length > 0 ? Number((overlap / predictions_t1.length).toFixed(2)) : 0;
  }

  /** Compute the recommendation churn rate. */
  churnRate(predictions_t1: string[], predictions_t2: string[]): number {
    return Number((1 - this.persistence(predictions_t1, predictions_t2)).toFixed(2));
  }

  toPacket(): DataPacket<{
    metrics: number;
    method: string;
    rankingMetrics: number;
    biasMetrics: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['recommendation', 'EvaluationMetrics'],
      priority: 1,
      phase: 'evaluation-metrics',
    };
    return {
      id: `evaluation-metrics-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        metrics: this._metrics.length,
        method: this._method,
        rankingMetrics: this._rankingMetrics.length,
        biasMetrics: this._biasMetrics.length,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._metrics = [];
    this._method = 'default';
    this._counter = 0;
    this._lastResult = null;
    this._rankingMetrics = [];
    this._biasMetrics = [];
    this._history = [];
  }
}
