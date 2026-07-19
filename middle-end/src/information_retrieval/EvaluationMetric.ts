import { DataPacket } from '../shared/types';

export interface RelevanceJudgment {
  docId: string;
  relevance: number;
  queryId: string;
}

export interface SearchResult {
  docId: string;
  rank: number;
  score: number;
}

export interface PrecisionRecallPoint {
  precision: number;
  recall: number;
  threshold: number;
}

export interface EvaluationResult {
  queryId: string;
  precision: number;
  recall: number;
  f1: number;
  f05: number;
  f2: number;
  averagePrecision: number;
  reciprocalRank: number;
  ndcg: number;
  ndcgAtK: Map<number, number>;
  precisionAtK: Map<number, number>;
  recallAtK: Map<number, number>;
  prCurve: PrecisionRecallPoint[];
  totalRelevant: number;
  totalRetrieved: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}

export interface AggregateEvaluation {
  queries: string[];
  map: number;
  mrr: number;
  meanNdcg: number;
  meanPrecision: number;
  meanRecall: number;
  meanF1: number;
  perQuery: Map<string, EvaluationResult>;
  totalQueries: number;
}

export type RelevanceLevel = 'binary' | 'graded';

export class EvaluationMetric {
  private _judgments: Map<string, RelevanceJudgment[]> = new Map();
  private _results: Map<string, SearchResult[]> = new Map();
  private _evaluationResults: Map<string, EvaluationResult> = new Map();
  private _aggregateResult: AggregateEvaluation | null = null;
  private _relevanceThreshold: number = 1;
  private _defaultKValues: number[] = [1, 5, 10, 20, 50];
  private _counter: number = 0;
  private _lastResult: EvaluationResult | AggregateEvaluation | null = null;
  private _relevanceLevel: RelevanceLevel = 'binary';

  get judgments(): Map<string, RelevanceJudgment[]> {
    return new Map(this._judgments);
  }

  get results(): Map<string, SearchResult[]> {
    return new Map(this._results);
  }

  get evaluationResults(): Map<string, EvaluationResult> {
    return new Map(this._evaluationResults);
  }

  get aggregateResult(): AggregateEvaluation | null {
    return this._aggregateResult;
  }

  get relevanceThreshold(): number {
    return this._relevanceThreshold;
  }

  get lastResult(): EvaluationResult | AggregateEvaluation | null {
    return this._lastResult;
  }

  get relevanceLevel(): RelevanceLevel {
    return this._relevanceLevel;
  }

  setRelevanceThreshold(threshold: number): void {
    this._relevanceThreshold = threshold;
  }

  setDefaultKValues(kValues: number[]): void {
    this._defaultKValues = [...kValues];
  }

  setRelevanceLevel(level: RelevanceLevel): void {
    this._relevanceLevel = level;
  }

  addJudgment(queryId: string, docId: string, relevance: number): void {
    if (!this._judgments.has(queryId)) {
      this._judgments.set(queryId, []);
    }
    const judgments = this._judgments.get(queryId)!;
    const existing = judgments.findIndex(j => j.docId === docId);
    if (existing >= 0) {
      judgments[existing].relevance = relevance;
    } else {
      judgments.push({ docId, relevance, queryId });
    }
  }

  addJudgments(queryId: string, judgments: { docId: string; relevance: number }[]): void {
    for (const j of judgments) {
      this.addJudgment(queryId, j.docId, j.relevance);
    }
  }

  addSearchResult(queryId: string, results: SearchResult[]): void {
    const sortedResults = [...results].sort((a, b) => a.rank - b.rank);
    this._results.set(queryId, sortedResults);
  }

  evaluate(queryId: string): EvaluationResult {
    const judgments = this._judgments.get(queryId) || [];
    const results = this._results.get(queryId) || [];

    const relevantDocs = new Set(
      judgments
        .filter(j => j.relevance >= this._relevanceThreshold)
        .map(j => j.docId)
    );

    const totalRelevant = relevantDocs.size;
    const totalRetrieved = results.length;

    let truePositives = 0;
    let falsePositives = 0;
    let cumulativePrecision = 0;
    let relevantCount = 0;
    let reciprocalRank = 0;
    let dcg = 0;
    let idcg = 0;

    const precisionAtK = new Map<number, number>();
    const recallAtK = new Map<number, number>();
    const ndcgAtK = new Map<number, number>();
    const prCurve: PrecisionRecallPoint[] = [];

    const relevanceMap = new Map(judgments.map(j => [j.docId, j.relevance]));
    const sortedJudgments = [...judgments]
      .sort((a, b) => b.relevance - a.relevance)
      .map(j => j.relevance);

    for (let i = 0; i < results.length; i++) {
      const rank = i + 1;
      const isRelevant = relevantDocs.has(results[i].docId);
      const relevance = relevanceMap.get(results[i].docId) || 0;

      if (isRelevant) {
        truePositives++;
        relevantCount++;
        cumulativePrecision += relevantCount / rank;

        if (reciprocalRank === 0) {
          reciprocalRank = 1 / rank;
        }
      } else {
        falsePositives++;
      }

      if (this._relevanceLevel === 'graded') {
        dcg += (Math.pow(2, relevance) - 1) / Math.log2(rank + 1);
      } else {
        dcg += isRelevant ? 1 / Math.log2(rank + 1) : 0;
      }

      const k = rank;
      const precisionAtRank = relevantCount / rank;
      const recallAtRank = totalRelevant > 0 ? relevantCount / totalRelevant : 0;

      if (this._defaultKValues.includes(k)) {
        precisionAtK.set(k, precisionAtRank);
        recallAtK.set(k, recallAtRank);
      }

      if (isRelevant) {
        prCurve.push({
          precision: precisionAtRank,
          recall: recallAtRank,
          threshold: results[i].score
        });
      }
    }

    for (let i = 0; i < Math.min(totalRelevant, sortedJudgments.length); i++) {
      const rank = i + 1;
      if (this._relevanceLevel === 'graded') {
        idcg += (Math.pow(2, sortedJudgments[i]) - 1) / Math.log2(rank + 1);
      } else {
        idcg += 1 / Math.log2(rank + 1);
      }
    }

    const ndcg = idcg > 0 ? dcg / idcg : 0;

    for (const k of this._defaultKValues) {
      if (k <= results.length) {
        let dcgK = 0;
        let idcgK = 0;
        for (let i = 0; i < Math.min(k, results.length); i++) {
          const rank = i + 1;
          const relevance = relevanceMap.get(results[i].docId) || 0;
          const isRelevant = relevantDocs.has(results[i].docId);
          if (this._relevanceLevel === 'graded') {
            dcgK += (Math.pow(2, relevance) - 1) / Math.log2(rank + 1);
          } else {
            dcgK += isRelevant ? 1 / Math.log2(rank + 1) : 0;
          }
        }
        for (let i = 0; i < Math.min(k, sortedJudgments.length); i++) {
          const rank = i + 1;
          if (this._relevanceLevel === 'graded') {
            idcgK += (Math.pow(2, sortedJudgments[i]) - 1) / Math.log2(rank + 1);
          } else {
            idcgK += 1 / Math.log2(rank + 1);
          }
        }
        ndcgAtK.set(k, idcgK > 0 ? dcgK / idcgK : 0);
      } else {
        ndcgAtK.set(k, 0);
      }
    }

    const falseNegatives = totalRelevant - truePositives;
    const precision = totalRetrieved > 0 ? truePositives / totalRetrieved : 0;
    const recall = totalRelevant > 0 ? truePositives / totalRelevant : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const f05 = precision + recall > 0 
      ? ((1 + 0.25) * precision * recall) / (0.25 * precision + recall) 
      : 0;
    const f2 = precision + recall > 0 
      ? ((1 + 4) * precision * recall) / (4 * precision + recall) 
      : 0;
    const averagePrecision = totalRelevant > 0 ? cumulativePrecision / totalRelevant : 0;

    const interpolatedPR = this._interpolatePRCurve(prCurve);

    const result: EvaluationResult = {
      queryId,
      precision,
      recall,
      f1,
      f05,
      f2,
      averagePrecision,
      reciprocalRank,
      ndcg,
      ndcgAtK,
      precisionAtK,
      recallAtK,
      prCurve: interpolatedPR,
      totalRelevant,
      totalRetrieved,
      truePositives,
      falsePositives,
      falseNegatives
    };

    this._evaluationResults.set(queryId, result);
    this._lastResult = result;
    return result;
  }

  private _interpolatePRCurve(prCurve: PrecisionRecallPoint[]): PrecisionRecallPoint[] {
    if (prCurve.length === 0) return [];

    const sorted = [...prCurve].sort((a, b) => b.recall - a.recall);
    const interpolated: PrecisionRecallPoint[] = [];
    let maxPrecision = 0;

    for (let i = sorted.length - 1; i >= 0; i--) {
      maxPrecision = Math.max(maxPrecision, sorted[i].precision);
      interpolated.push({
        precision: maxPrecision,
        recall: sorted[i].recall,
        threshold: sorted[i].threshold
      });
    }

    return interpolated.reverse();
  }

  evaluateAll(): AggregateEvaluation {
    const queryIds = new Set([
      ...this._judgments.keys(),
      ...this._results.keys()
    ]);

    const perQuery = new Map<string, EvaluationResult>();
    let totalAP = 0;
    let totalRR = 0;
    let totalNdcg = 0;
    let totalPrecision = 0;
    let totalRecall = 0;
    let totalF1 = 0;
    let count = 0;

    for (const queryId of queryIds) {
      const result = this.evaluate(queryId);
      perQuery.set(queryId, result);
      totalAP += result.averagePrecision;
      totalRR += result.reciprocalRank;
      totalNdcg += result.ndcg;
      totalPrecision += result.precision;
      totalRecall += result.recall;
      totalF1 += result.f1;
      count++;
    }

    const aggregate: AggregateEvaluation = {
      queries: Array.from(queryIds),
      map: count > 0 ? totalAP / count : 0,
      mrr: count > 0 ? totalRR / count : 0,
      meanNdcg: count > 0 ? totalNdcg / count : 0,
      meanPrecision: count > 0 ? totalPrecision / count : 0,
      meanRecall: count > 0 ? totalRecall / count : 0,
      meanF1: count > 0 ? totalF1 / count : 0,
      perQuery,
      totalQueries: count
    };

    this._aggregateResult = aggregate;
    this._lastResult = aggregate;
    return aggregate;
  }

  precisionAtK(results: SearchResult[], relevantDocs: Set<string>, k: number): number {
    let relevant = 0;
    const topK = results.slice(0, k);
    for (const result of topK) {
      if (relevantDocs.has(result.docId)) {
        relevant++;
      }
    }
    return k > 0 ? relevant / k : 0;
  }

  recallAtK(results: SearchResult[], relevantDocs: Set<string>, k: number): number {
    let relevant = 0;
    const topK = results.slice(0, k);
    for (const result of topK) {
      if (relevantDocs.has(result.docId)) {
        relevant++;
      }
    }
    return relevantDocs.size > 0 ? relevant / relevantDocs.size : 0;
  }

  fMeasure(precision: number, recall: number, beta: number = 1): number {
    if (precision + recall === 0) return 0;
    return ((1 + beta * beta) * precision * recall) / (beta * beta * precision + recall);
  }

  averagePrecision(results: SearchResult[], relevantDocs: Set<string>): number {
    let cumulativePrecision = 0;
    let relevantCount = 0;

    for (let i = 0; i < results.length; i++) {
      if (relevantDocs.has(results[i].docId)) {
        relevantCount++;
        cumulativePrecision += relevantCount / (i + 1);
      }
    }

    return relevantDocs.size > 0 ? cumulativePrecision / relevantDocs.size : 0;
  }

  reciprocalRank(results: SearchResult[], relevantDocs: Set<string>): number {
    for (let i = 0; i < results.length; i++) {
      if (relevantDocs.has(results[i].docId)) {
        return 1 / (i + 1);
      }
    }
    return 0;
  }

  ndcg(results: SearchResult[], relevanceMap: Map<string, number>, k?: number): number {
    const limit = k || results.length;
    let dcg = 0;
    let idcg = 0;

    for (let i = 0; i < Math.min(limit, results.length); i++) {
      const rank = i + 1;
      const relevance = relevanceMap.get(results[i].docId) || 0;
      dcg += (Math.pow(2, relevance) - 1) / Math.log2(rank + 1);
    }

    const sortedRelevance = [...relevanceMap.values()]
      .sort((a, b) => b - a)
      .slice(0, limit);

    for (let i = 0; i < sortedRelevance.length; i++) {
      const rank = i + 1;
      idcg += (Math.pow(2, sortedRelevance[i]) - 1) / Math.log2(rank + 1);
    }

    return idcg > 0 ? dcg / idcg : 0;
  }

  ndcgBinary(results: SearchResult[], relevantDocs: Set<string>, k?: number): number {
    const limit = k || results.length;
    let dcg = 0;
    let idcg = 0;

    for (let i = 0; i < Math.min(limit, results.length); i++) {
      const rank = i + 1;
      const isRelevant = relevantDocs.has(results[i].docId);
      dcg += isRelevant ? 1 / Math.log2(rank + 1) : 0;
    }

    const idealCount = Math.min(limit, relevantDocs.size);
    for (let i = 0; i < idealCount; i++) {
      const rank = i + 1;
      idcg += 1 / Math.log2(rank + 1);
    }

    return idcg > 0 ? dcg / idcg : 0;
  }

  meanAveragePrecision(queries: { results: SearchResult[]; relevant: Set<string> }[]): number {
    if (queries.length === 0) return 0;
    let total = 0;
    for (const q of queries) {
      total += this.averagePrecision(q.results, q.relevant);
    }
    return total / queries.length;
  }

  meanReciprocalRank(queries: { results: SearchResult[]; relevant: Set<string> }[]): number {
    if (queries.length === 0) return 0;
    let total = 0;
    for (const q of queries) {
      total += this.reciprocalRank(q.results, q.relevant);
    }
    return total / queries.length;
  }

  confusionMatrix(
    results: SearchResult[],
    relevantDocs: Set<string>
  ): { tp: number; fp: number; tn: number; fn: number } {
    let tp = 0;
    let fp = 0;

    for (const result of results) {
      if (relevantDocs.has(result.docId)) {
        tp++;
      } else {
        fp++;
      }
    }

    const fn = relevantDocs.size - tp;
    const tn = 0;

    return { tp, fp, tn, fn };
  }

  precision(confusion: { tp: number; fp: number; tn: number; fn: number }): number {
    return confusion.tp + confusion.fp > 0 
      ? confusion.tp / (confusion.tp + confusion.fp) 
      : 0;
  }

  recall(confusion: { tp: number; fp: number; tn: number; fn: number }): number {
    return confusion.tp + confusion.fn > 0 
      ? confusion.tp / (confusion.tp + confusion.fn) 
      : 0;
  }

  fallout(confusion: { tp: number; fp: number; tn: number; fn: number }): number {
    return confusion.fp + confusion.tn > 0 
      ? confusion.fp / (confusion.fp + confusion.tn) 
      : 0;
  }

  missRate(confusion: { tp: number; fp: number; tn: number; fn: number }): number {
    return confusion.fn + confusion.tp > 0 
      ? confusion.fn / (confusion.fn + confusion.tp) 
      : 0;
  }

  accuracy(confusion: { tp: number; fp: number; tn: number; fn: number }): number {
    const total = confusion.tp + confusion.fp + confusion.tn + confusion.fn;
    return total > 0 ? (confusion.tp + confusion.tn) / total : 0;
  }

  rocPoint(
    results: SearchResult[],
    relevantDocs: Set<string>,
    threshold: number
  ): { tpr: number; fpr: number } {
    const filtered = results.filter(r => r.score >= threshold);
    const confusion = this.confusionMatrix(filtered, relevantDocs);
    const tpr = this.recall(confusion);
    const fpr = this.fallout(confusion);
    return { tpr, fpr };
  }

  auc(prCurve: PrecisionRecallPoint[]): number {
    if (prCurve.length < 2) return 0;
    
    let area = 0;
    const sorted = [...prCurve].sort((a, b) => a.recall - b.recall);
    
    for (let i = 1; i < sorted.length; i++) {
      const width = sorted[i].recall - sorted[i - 1].recall;
      const height = (sorted[i].precision + sorted[i - 1].precision) / 2;
      area += width * height;
    }
    
    return area;
  }

  rPrecision(results: SearchResult[], relevantDocs: Set<string>): number {
    const R = relevantDocs.size;
    if (R === 0) return 0;
    const topR = results.slice(0, R);
    let relevant = 0;
    for (const result of topR) {
      if (relevantDocs.has(result.docId)) {
        relevant++;
      }
    }
    return relevant / R;
  }

  bpref(results: SearchResult[], relevantDocs: Set<string>): number {
    let relevantCount = 0;
    let nonRelevantBefore = 0;
    let score = 0;

    for (const result of results) {
      if (relevantDocs.has(result.docId)) {
        relevantCount++;
        score += Math.max(0, 1 - nonRelevantBefore / relevantCount);
      } else {
        if (relevantCount > 0) {
          nonRelevantBefore++;
        }
      }
    }

    return relevantCount > 0 ? score / relevantCount : 0;
  }

  expectedReciprocalRank(
    results: SearchResult[],
    relevanceMap: Map<string, number>,
    maxRelevance: number = 4
  ): number {
    let pFirst = 1;
    let err = 0;

    for (let i = 0; i < results.length; i++) {
      const rank = i + 1;
      const relevance = relevanceMap.get(results[i].docId) || 0;
      const r = (Math.pow(2, relevance) - 1) / Math.pow(2, maxRelevance);
      err += pFirst * r / rank;
      pFirst *= (1 - r);
    }

    return err;
  }

  toPacket(): DataPacket<EvaluationResult | AggregateEvaluation> {
    const result = this._lastResult || {
      queryId: '',
      precision: 0,
      recall: 0,
      f1: 0,
      f05: 0,
      f2: 0,
      averagePrecision: 0,
      reciprocalRank: 0,
      ndcg: 0,
      ndcgAtK: new Map(),
      precisionAtK: new Map(),
      recallAtK: new Map(),
      prCurve: [],
      totalRelevant: 0,
      totalRetrieved: 0,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0
    };
    this._counter++;
    return {
      id: `evaluation-metric-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'evaluation'],
        priority: 1,
        phase: 'evaluation'
      }
    };
  }

  reset(): void {
    this._judgments.clear();
    this._results.clear();
    this._evaluationResults.clear();
    this._aggregateResult = null;
    this._counter = 0;
    this._lastResult = null;
    this._relevanceThreshold = 1;
    this._defaultKValues = [1, 5, 10, 20, 50];
    this._relevanceLevel = 'binary';
  }
}
