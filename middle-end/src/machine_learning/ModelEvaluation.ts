import { DataPacket, PacketMeta } from '../shared/types';

/** Classification metrics. */
export interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
  confusion: number[][];
}

/** Cross-validation result. */
export interface CVResult {
  folds: number;
  mean: number;
  std: number;
  scores: number[];
}

/** ROC curve point. */
export interface ROC {
  fpr: number[];
  tpr: number[];
  thresholds: number[];
  auc: number;
}

/** A model that can be fit and predicted. */
export interface ModelLike {
  fit(X: number[][], y: number[]): void;
  predict(X: number[][]): number[];
}

/** History record for evaluation. */
interface EvalRecord {
  metric: string;
  value: number;
  timestamp: number;
}

/** Averaging strategy for multiclass metrics. */
export type AverageStrategy = 'micro' | 'macro' | 'weighted';

export class ModelEvaluation {
  private _metrics: Metrics[] = [];
  private _cvResults: CVResult[] = [];
  private _rocCurves: ROC[] = [];
  private _history: EvalRecord[] = [];

  accuracy(yTrue: number[], yPred: number[]): number {
    if (yTrue.length === 0) return 0;
    const correct = yTrue.reduce((s, t, i) => s + (t === yPred[i] ? 1 : 0), 0);
    return correct / yTrue.length;
  }

  precision(yTrue: number[], yPred: number[], average: AverageStrategy = 'macro'): number {
    const labels = [...new Set([...yTrue, ...yPred])];
    if (average === 'micro') {
      let tp = 0, fp = 0;
      for (const l of labels) {
        for (let i = 0; i < yTrue.length; i++) {
          if (yPred[i] === l && yTrue[i] === l) tp++;
          else if (yPred[i] === l && yTrue[i] !== l) fp++;
        }
      }
      return tp / (tp + fp + 1e-12);
    }
    const precisions = labels.map(l => {
      let tp = 0, fp = 0;
      for (let i = 0; i < yTrue.length; i++) {
        if (yPred[i] === l && yTrue[i] === l) tp++;
        else if (yPred[i] === l && yTrue[i] !== l) fp++;
      }
      return tp / (tp + fp + 1e-12);
    });
    if (average === 'weighted') {
      const weights = labels.map(l => yTrue.filter(t => t === l).length);
      const wSum = weights.reduce((s, v) => s + v, 0);
      return precisions.reduce((s, p, i) => s + p * weights[i], 0) / (wSum + 1e-12);
    }
    return precisions.reduce((s, p) => s + p, 0) / Math.max(1, precisions.length);
  }

  recall(yTrue: number[], yPred: number[], average: AverageStrategy = 'macro'): number {
    const labels = [...new Set([...yTrue, ...yPred])];
    if (average === 'micro') {
      let tp = 0, fn = 0;
      for (const l of labels) {
        for (let i = 0; i < yTrue.length; i++) {
          if (yPred[i] === l && yTrue[i] === l) tp++;
          else if (yPred[i] !== l && yTrue[i] === l) fn++;
        }
      }
      return tp / (tp + fn + 1e-12);
    }
    const recalls = labels.map(l => {
      let tp = 0, fn = 0;
      for (let i = 0; i < yTrue.length; i++) {
        if (yPred[i] === l && yTrue[i] === l) tp++;
        else if (yPred[i] !== l && yTrue[i] === l) fn++;
      }
      return tp / (tp + fn + 1e-12);
    });
    if (average === 'weighted') {
      const weights = labels.map(l => yTrue.filter(t => t === l).length);
      const wSum = weights.reduce((s, v) => s + v, 0);
      return recalls.reduce((s, r, i) => s + r * weights[i], 0) / (wSum + 1e-12);
    }
    return recalls.reduce((s, r) => s + r, 0) / Math.max(1, recalls.length);
  }

  f1Score(yTrue: number[], yPred: number[], average: AverageStrategy = 'macro'): number {
    const p = this.precision(yTrue, yPred, average);
    const r = this.recall(yTrue, yPred, average);
    return p + r === 0 ? 0 : 2 * p * r / (p + r);
  }

  confusionMatrix(yTrue: number[], yPred: number[], labels: number[]): number[][] {
    const n = labels.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < yTrue.length; i++) {
      const ti = labels.indexOf(yTrue[i]);
      const pi = labels.indexOf(yPred[i]);
      if (ti >= 0 && pi >= 0) matrix[ti][pi]++;
    }
    return matrix;
  }

  rocCurve(yTrue: number[], yScore: number[]): ROC {
    const pairs = yScore.map((s, i) => ({ score: s, label: yTrue[i] })).sort((a, b) => b.score - a.score);
    const P = pairs.filter(p => p.label === 1).length;
    const N = pairs.filter(p => p.label === 0).length;
    const fpr: number[] = [0];
    const tpr: number[] = [0];
    const thresholds: number[] = [pairs[0]?.score ?? 1];
    let tp = 0, fp = 0;
    for (const p of pairs) {
      if (p.label === 1) tp++;
      else fp++;
      fpr.push(fp / (N + 1e-12));
      tpr.push(tp / (P + 1e-12));
      thresholds.push(p.score);
    }
    fpr.push(1); tpr.push(1);
    const auc = this.auc({ fpr, tpr, thresholds, auc: 0 });
    const roc: ROC = { fpr, tpr, thresholds, auc };
    this._rocCurves.push(roc);
    return roc;
  }

  auc(score: ROC | number[]): number {
    if (Array.isArray(score)) {
      const roc = this.rocCurve(score.map((_, i) => 0), score);
      return roc.auc;
    }
    const { fpr, tpr } = score;
    let area = 0;
    for (let i = 1; i < fpr.length; i++) {
      area += (fpr[i] - fpr[i - 1]) * (tpr[i] + tpr[i - 1]) / 2;
    }
    return area;
  }

  prCurve(yTrue: number[], yScore: number[]): { precision: number[]; recall: number[]; thresholds: number[] } {
    const pairs = yScore.map((s, i) => ({ score: s, label: yTrue[i] })).sort((a, b) => b.score - a.score);
    const precision: number[] = [];
    const recall: number[] = [];
    const thresholds: number[] = [];
    let tp = 0, fp = 0;
    const P = pairs.filter(p => p.label === 1).length;
    for (const p of pairs) {
      if (p.label === 1) tp++;
      else fp++;
      precision.push(tp / (tp + fp + 1e-12));
      recall.push(tp / (P + 1e-12));
      thresholds.push(p.score);
    }
    return { precision, recall, thresholds };
  }

  logLoss(yTrue: number[], yProb: number[]): number {
    return yTrue.reduce((s, t, i) => s - (t * Math.log(yProb[i] + 1e-12) + (1 - t) * Math.log(1 - yProb[i] + 1e-12)), 0) / yTrue.length;
  }

  mse(yTrue: number[], yPred: number[]): number {
    return yTrue.reduce((s, t, i) => s + Math.pow(t - yPred[i], 2), 0) / Math.max(1, yTrue.length);
  }

  mae(yTrue: number[], yPred: number[]): number {
    return yTrue.reduce((s, t, i) => s + Math.abs(t - yPred[i]), 0) / Math.max(1, yTrue.length);
  }

  rmse(yTrue: number[], yPred: number[]): number {
    return Math.sqrt(this.mse(yTrue, yPred));
  }

  r2(yTrue: number[], yPred: number[]): number {
    const mean = yTrue.reduce((s, v) => s + v, 0) / Math.max(1, yTrue.length);
    const ssTot = yTrue.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
    const ssRes = yTrue.reduce((s, v, i) => s + Math.pow(v - yPred[i], 2), 0);
    return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  }

  crossValidate(model: ModelLike, X: number[][], y: number[], k: number = 5, metric: 'accuracy' | 'mse' | 'r2' = 'accuracy'): CVResult {
    const indices = X.map((_, i) => i);
    const foldSize = Math.floor(indices.length / k);
    const scores: number[] = [];
    for (let i = 0; i < k; i++) {
      const start = i * foldSize;
      const end = start + foldSize;
      const valIdx = indices.slice(start, end);
      const trainIdx = indices.filter(idx => idx < start || idx >= end);
      const Xtrain = trainIdx.map(idx => X[idx]);
      const ytrain = trainIdx.map(idx => y[idx]);
      const Xval = valIdx.map(idx => X[idx]);
      const yval = valIdx.map(idx => y[idx]);
      model.fit(Xtrain, ytrain);
      const preds = model.predict(Xval);
      let score = 0;
      if (metric === 'accuracy') score = this.accuracy(yval, preds);
      else if (metric === 'mse') score = -this.mse(yval, preds);
      else score = this.r2(yval, preds);
      scores.push(score);
    }
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const std = Math.sqrt(scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length);
    const cv: CVResult = { folds: k, mean, std, scores };
    this._cvResults.push(cv);
    return cv;
  }

  gridSearch(model: ModelLike, X: number[][], y: number[], params: Record<string, number[]>, cv: number = 5): { bestParams: Record<string, number>; bestScore: number } {
    const paramKeys = Object.keys(params);
    let bestParams: Record<string, number> = {};
    let bestScore = -Infinity;
    const combinations = this._combinations(params);
    for (const combo of combinations) {
      const result = this.crossValidate(model, X, y, cv);
      if (result.mean > bestScore) {
        bestScore = result.mean;
        paramKeys.forEach((k, i) => bestParams[k] = combo[i]);
      }
    }
    return { bestParams, bestScore };
  }

  learningCurve(model: ModelLike, X: number[][], y: number[], trainSizes: number[], cv: number = 5): { trainSizes: number[]; trainScores: number[]; valScores: number[] } {
    const trainScores: number[] = [];
    const valScores: number[] = [];
    for (const size of trainSizes) {
      const Xsub = X.slice(0, Math.min(size, X.length));
      const ysub = y.slice(0, Math.min(size, y.length));
      const result = this.crossValidate(model, Xsub, ysub, cv);
      trainScores.push(result.mean);
      valScores.push(result.mean);
    }
    return { trainSizes, trainScores, valScores };
  }

  validationCurve(model: ModelLike, X: number[][], y: number[], param: string, range: number[], cv: number = 5): { range: number[]; trainScores: number[]; valScores: number[] } {
    const trainScores: number[] = [];
    const valScores: number[] = [];
    for (const _ of range) {
      const result = this.crossValidate(model, X, y, cv);
      trainScores.push(result.mean);
      valScores.push(result.mean);
    }
    return { range, trainScores, valScores };
  }

  biasVarianceDecomposition(model: ModelLike, X: number[][], y: number[]): { bias: number; variance: number; error: number } {
    const preds: number[] = [];
    for (let i = 0; i < 5; i++) {
      const sampleIdx = X.map((_, idx) => Math.random() < 0.8 ? idx : -1).filter(idx => idx >= 0);
      const Xs = sampleIdx.map(idx => X[idx]);
      const ys = sampleIdx.map(idx => y[idx]);
      model.fit(Xs, ys);
      const pred = model.predict(X)[0];
      preds.push(pred);
    }
    const meanPred = preds.reduce((s, v) => s + v, 0) / preds.length;
    const bias = Math.pow(meanPred - y[0], 2);
    const variance = preds.reduce((s, v) => s + Math.pow(v - meanPred, 2), 0) / preds.length;
    return { bias, variance, error: bias + variance };
  }

  toPacket(): DataPacket<{ metrics: Metrics[]; cvResults: CVResult[]; rocCurves: ROC[]; history: EvalRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['machine_learning', 'ModelEvaluation'],
      priority: 1,
      phase: 'model_evaluation',
    };
    return {
      id: `model-eval-${Date.now().toString(36)}`,
      payload: { metrics: this._metrics, cvResults: this._cvResults, rocCurves: this._rocCurves, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._metrics = [];
    this._cvResults = [];
    this._rocCurves = [];
    this._history = [];
  }

  get metricsCount(): number { return this._metrics.length; }
  get cvResultCount(): number { return this._cvResults.length; }
  get rocCurveCount(): number { return this._rocCurves.length; }

  private _combinations(params: Record<string, number[]>): number[][] {
    const keys = Object.keys(params);
    const result: number[][] = [[]];
    for (const key of keys) {
      const newResult: number[][] = [];
      for (const existing of result) {
        for (const value of params[key]) {
          newResult.push([...existing, value]);
        }
      }
      result.length = 0;
      result.push(...newResult);
    }
    return result;
  }
}
