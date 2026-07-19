import { DataPacket } from '../shared/types';

export interface EvaluationResult {
  metrics: Map<string, number>;
  method: string;
}

export interface Metric {
  name: string;
  value: number;
  method: string;
}

export class EvaluationMetrics {
  private _metrics: Metric[] = [];
  private _method: string = 'default';
  private _counter: number = 0;
  private _lastResult: EvaluationResult | null = null;

  get metrics(): Metric[] {
    return this._metrics;
  }

  get method(): string {
    return this._method;
  }

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

  novelty(predictions: string[], popularity: Map<string, number>): number {
    let totalNovelty = 0;
    const maxPop = Math.max(...Array.from(popularity.values()), 1);
    for (const pred of predictions) {
      const pop = popularity.get(pred) || 0;
      totalNovelty += 1 - pop / maxPop;
    }
    return predictions.length > 0 ? totalNovelty / predictions.length : 0;
  }

  serendipity(predictions: string[], expected: string[]): number {
    const expectedSet = new Set(expected);
    let surprise = 0;
    for (const pred of predictions) {
      if (!expectedSet.has(pred)) {
        surprise++;
      }
    }
    return predictions.length > 0 ? surprise / predictions.length : 0;
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

  toPacket(): DataPacket<EvaluationResult> {
    const result = this._lastResult || { metrics: new Map(), method: '' };
    this._counter++;
    return {
      id: `eval-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'evaluation'],
        priority: 1,
        phase: 'evaluation'
      }
    };
  }

  reset(): void {
    this._metrics = [];
    this._method = 'default';
    this._counter = 0;
    this._lastResult = null;
  }
}
