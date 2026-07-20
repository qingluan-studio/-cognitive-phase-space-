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

  // ---------------------------------------------------------------------------
  // Additional classification metrics
  // ---------------------------------------------------------------------------

  /** Specificity (true negative rate). */
  specificity(yTrue: number[], yPred: number[], positiveLabel: number = 1): number {
    let tn = 0, fp = 0;
    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i] !== positiveLabel) {
        if (yPred[i] === yTrue[i]) tn++;
        else fp++;
      }
    }
    return tn / (tn + fp + 1e-12);
  }

  /** Negative predictive value. */
  negativePredictiveValue(yTrue: number[], yPred: number[], positiveLabel: number = 1): number {
    let tn = 0, fn = 0;
    for (let i = 0; i < yTrue.length; i++) {
      if (yPred[i] !== positiveLabel) {
        if (yPred[i] === yTrue[i]) tn++;
        else fn++;
      }
    }
    return tn / (tn + fn + 1e-12);
  }

  /** False positive rate. */
  falsePositiveRate(yTrue: number[], yPred: number[], positiveLabel: number = 1): number {
    return 1 - this.specificity(yTrue, yPred, positiveLabel);
  }

  /** False negative rate. */
  falseNegativeRate(yTrue: number[], yPred: number[], positiveLabel: number = 1): number {
    return 1 - this.recall(yTrue, yPred, 'micro');
  }

  /** F-beta score (generalized F1 with recall weight beta). */
  fBetaScore(yTrue: number[], yPred: number[], beta: number, average: AverageStrategy = 'macro'): number {
    const p = this.precision(yTrue, yPred, average);
    const r = this.recall(yTrue, yPred, average);
    const beta2 = beta * beta;
    return p + r === 0 ? 0 : (1 + beta2) * p * r / (beta2 * p + r);
  }

  /** Matthews Correlation Coefficient (MCC). */
  matthewsCorrCoef(yTrue: number[], yPred: number[], positiveLabel: number = 1): number {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i] === positiveLabel && yPred[i] === positiveLabel) tp++;
      else if (yTrue[i] !== positiveLabel && yPred[i] === positiveLabel) fp++;
      else if (yTrue[i] !== positiveLabel && yPred[i] !== positiveLabel) tn++;
      else fn++;
    }
    const num = tp * tn - fp * fn;
    const den = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
    return den === 0 ? 0 : num / den;
  }

  /** Balanced accuracy (average of recall per class). */
  balancedAccuracy(yTrue: number[], yPred: number[]): number {
    const labels = [...new Set(yTrue)];
    const recalls = labels.map(l => {
      let tp = 0, fn = 0;
      for (let i = 0; i < yTrue.length; i++) {
        if (yTrue[i] === l) {
          if (yPred[i] === l) tp++;
          else fn++;
        }
      }
      return tp / (tp + fn + 1e-12);
    });
    return recalls.reduce((s, r) => s + r, 0) / Math.max(1, recalls.length);
  }

  /** Cohen's Kappa (agreement accounting for chance). */
  cohensKappa(yTrue: number[], yPred: number[]): number {
    const labels = [...new Set([...yTrue, ...yPred])];
    const n = yTrue.length;
    const matrix = this.confusionMatrix(yTrue, yPred, labels);
    let po = 0;
    for (let i = 0; i < labels.length; i++) po += matrix[i][i];
    po /= n;
    let pe = 0;
    for (let i = 0; i < labels.length; i++) {
      const rowSum = matrix[i].reduce((s, v) => s + v, 0);
      const colSum = matrix.reduce((s, row) => s + row[i], 0);
      pe += rowSum * colSum / (n * n);
    }
    return pe === 1 ? 0 : (po - pe) / (1 - pe);
  }

  /** Hamming loss (fraction of misclassified labels). */
  hammingLoss(yTrue: number[], yPred: number[]): number {
    if (yTrue.length === 0) return 0;
    let wrong = 0;
    for (let i = 0; i < yTrue.length; i++) if (yTrue[i] !== yPred[i]) wrong++;
    return wrong / yTrue.length;
  }

  /** Jaccard score (intersection over union per class). */
  jaccardScore(yTrue: number[], yPred: number[], average: AverageStrategy = 'macro'): number {
    const labels = [...new Set([...yTrue, ...yPred])];
    const scores = labels.map(l => {
      let tp = 0, fp = 0, fn = 0;
      for (let i = 0; i < yTrue.length; i++) {
        if (yPred[i] === l && yTrue[i] === l) tp++;
        else if (yPred[i] === l && yTrue[i] !== l) fp++;
        else if (yPred[i] !== l && yTrue[i] === l) fn++;
      }
      return tp / (tp + fp + fn + 1e-12);
    });
    if (average === 'weighted') {
      const weights = labels.map(l => yTrue.filter(t => t === l).length);
      const wSum = weights.reduce((s, v) => s + v, 0);
      return scores.reduce((s, sc, i) => s + sc * weights[i], 0) / (wSum + 1e-12);
    }
    return scores.reduce((s, sc) => s + sc, 0) / Math.max(1, scores.length);
  }

  /** Zero-one loss (number of misclassifications). */
  zeroOneLoss(yTrue: number[], yPred: number[]): number {
    let loss = 0;
    for (let i = 0; i < yTrue.length; i++) if (yTrue[i] !== yPred[i]) loss++;
    return loss;
  }

  /** Brier score (mean squared error of probabilities for binary classification). */
  brierScore(yTrue: number[], yProb: number[]): number {
    return yTrue.reduce((s, t, i) => s + Math.pow(t - yProb[i], 2), 0) / Math.max(1, yTrue.length);
  }

  /** Hinge loss (for SVM-style evaluation). */
  hingeLoss(yTrue: number[], yDecision: number[]): number {
    return yTrue.reduce((s, t, i) => s + Math.max(0, 1 - t * yDecision[i]), 0) / Math.max(1, yTrue.length);
  }

  /** Top-k accuracy (predicts correctly if true label is in top-k predictions). */
  topKAccuracy(yTrue: number[][], yProb: number[][], k: number): number {
    let correct = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const trueLabel = yTrue[i].indexOf(1);
      const topK = yProb[i].map((p, idx) => ({ p, idx })).sort((a, b) => b.p - a.p).slice(0, k).map(o => o.idx);
      if (topK.includes(trueLabel)) correct++;
    }
    return correct / Math.max(1, yTrue.length);
  }

  // ---------------------------------------------------------------------------
  // Regression metrics
  // ---------------------------------------------------------------------------

  /** Median absolute error (robust to outliers). */
  medianAbsoluteError(yTrue: number[], yPred: number[]): number {
    const errors = yTrue.map((t, i) => Math.abs(t - yPred[i])).sort((a, b) => a - b);
    const mid = Math.floor(errors.length / 2);
    return errors.length % 2 === 0 ? (errors[mid - 1] + errors[mid]) / 2 : errors[mid];
  }

  /** Mean squared logarithmic error. */
  msle(yTrue: number[], yPred: number[]): number {
    return yTrue.reduce((s, t, i) => s + Math.pow(Math.log(t + 1) - Math.log(yPred[i] + 1), 2), 0) / Math.max(1, yTrue.length);
  }

  /** Root mean squared logarithmic error. */
  rmsle(yTrue: number[], yPred: number[]): number {
    return Math.sqrt(this.msle(yTrue, yPred));
  }

  /** Mean absolute percentage error. */
  mape(yTrue: number[], yPred: number[]): number {
    return yTrue.reduce((s, t, i) => s + Math.abs((t - yPred[i]) / (Math.abs(t) + 1e-12)), 0) / Math.max(1, yTrue.length) * 100;
  }

  /** Symmetric mean absolute percentage error. */
  smape(yTrue: number[], yPred: number[]): number {
    return yTrue.reduce((s, t, i) => s + Math.abs(t - yPred[i]) / ((Math.abs(t) + Math.abs(yPred[i])) / 2 + 1e-12), 0) / Math.max(1, yTrue.length) * 100;
  }

  /** Explained variance score. */
  explainedVariance(yTrue: number[], yPred: number[]): number {
    const mean = this._mean(yTrue);
    const varY = yTrue.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, yTrue.length);
    const residuals = yTrue.map((t, i) => t - yPred[i]);
    const meanR = this._mean(residuals);
    const varRes = residuals.reduce((s, v) => s + Math.pow(v - meanR, 2), 0) / Math.max(1, residuals.length);
    return 1 - varRes / (varY + 1e-12);
  }

  /** Max error (worst-case absolute error). */
  maxError(yTrue: number[], yPred: number[]): number {
    return Math.max(...yTrue.map((t, i) => Math.abs(t - yPred[i])));
  }

  /** Mean Poisson deviance. */
  meanPoissonDeviance(yTrue: number[], yPred: number[]): number {
    return yTrue.reduce((s, t, i) => {
      const p = Math.max(1e-12, yPred[i]);
      return s + 2 * (t * Math.log(t / p + 1e-12) - (t - p));
    }, 0) / Math.max(1, yTrue.length);
  }

  /** Mean Gamma deviance. */
  meanGammaDeviance(yTrue: number[], yPred: number[]): number {
    return yTrue.reduce((s, t, i) => {
      const p = Math.max(1e-12, yPred[i]);
      return s + 2 * (Math.log(p / t + 1e-12) - (p - t) / t);
    }, 0) / Math.max(1, yTrue.length);
  }

  /** D² absolute error score. */
  d2AbsoluteError(yTrue: number[], yPred: number[]): number {
    const median = this._median(yTrue);
    const baseline = yTrue.reduce((s, t) => s + Math.abs(t - median), 0);
    const residuals = yTrue.reduce((s, t, i) => s + Math.abs(t - yPred[i]), 0);
    return baseline === 0 ? 0 : 1 - residuals / baseline;
  }

  /** D² pinball loss score. */
  d2PinballScore(yTrue: number[], yPred: number[], alpha: number = 0.5): number {
    const median = this._quantile(yTrue, alpha);
    const baseline = yTrue.reduce((s, t) => {
      const err = t - median;
      return s + (err >= 0 ? alpha * err : (alpha - 1) * err);
    }, 0);
    const residuals = yTrue.reduce((s, t, i) => {
      const err = t - yPred[i];
      return s + (err >= 0 ? alpha * err : (alpha - 1) * err);
    }, 0);
    return baseline === 0 ? 0 : 1 - residuals / baseline;
  }

  // ---------------------------------------------------------------------------
  // Ranking metrics
  // ---------------------------------------------------------------------------

  /** Average precision at k. */
  averagePrecisionAtK(yTrue: number[], yScore: number[], k: number): number {
    const pairs = yScore.map((s, i) => ({ score: s, label: yTrue[i] })).sort((a, b) => b.score - a.score);
    let precisionSum = 0;
    let numRelevant = 0;
    let totalRelevant = pairs.filter(p => p.label === 1).length;
    for (let i = 0; i < Math.min(k, pairs.length); i++) {
      if (pairs[i].label === 1) {
        numRelevant++;
        precisionSum += numRelevant / (i + 1);
      }
    }
    return totalRelevant === 0 ? 0 : precisionSum / totalRelevant;
  }

  /** Normalized Discounted Cumulative Gain at k. */
  ndcgAtK(yTrue: number[], yScore: number[], k: number): number {
    const pairs = yScore.map((s, i) => ({ score: s, label: yTrue[i] })).sort((a, b) => b.score - a.score);
    const dcg = pairs.slice(0, k).reduce((s, p, i) => s + (Math.pow(2, p.label) - 1) / Math.log2(i + 2), 0);
    const ideal = [...pairs].sort((a, b) => b.label - a.label).slice(0, k).reduce((s, p, i) => s + (Math.pow(2, p.label) - 1) / Math.log2(i + 2), 0);
    return ideal === 0 ? 0 : dcg / ideal;
  }

  /** Mean Reciprocal Rank. */
  mrr(yTrue: number[], yScore: number[]): number {
    const pairs = yScore.map((s, i) => ({ score: s, label: yTrue[i] })).sort((a, b) => b.score - a.score);
    for (let i = 0; i < pairs.length; i++) {
      if (pairs[i].label === 1) return 1 / (i + 1);
    }
    return 0;
  }

  /** Coverage error (how far down the ranked list we go to cover all relevant labels). */
  coverageError(yTrue: number[][], yScore: number[][]): number {
    let total = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const labels = yTrue[i];
      const scores = yScore[i].map((s, idx) => ({ s, idx })).sort((a, b) => b.s - a.s);
      const relevantCount = labels.filter(l => l === 1).length;
      let rank = 0;
      let found = 0;
      for (let r = 0; r < scores.length; r++) {
        if (labels[scores[r].idx] === 1) found++;
        if (found === relevantCount) { rank = r + 1; break; }
      }
      total += rank;
    }
    return total / Math.max(1, yTrue.length);
  }

  /** Label ranking average precision. */
  labelRankingAveragePrecision(yTrue: number[][], yScore: number[][]): number {
    let total = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const scores = yScore[i];
      const labels = yTrue[i];
      const ranked = scores.map((s, idx) => ({ s, idx })).sort((a, b) => b.s - a.s);
      const relevant = ranked.filter(r => labels[r.idx] === 1);
      if (relevant.length === 0) continue;
      let precisionSum = 0;
      for (const r of relevant) {
        const rank = ranked.indexOf(r) + 1;
        const betterOrEqual = ranked.slice(0, rank).filter(rr => labels[rr.idx] === 1).length;
        precisionSum += betterOrEqual / rank;
      }
      total += precisionSum / relevant.length;
    }
    return total / Math.max(1, yTrue.length);
  }

  // ---------------------------------------------------------------------------
  // Clustering metrics
  // ---------------------------------------------------------------------------

  /** Adjusted Rand Index (between two clusterings). */
  adjustedRandIndex(labels1: number[], labels2: number[]): number {
    const n = labels1.length;
    const contingency = new Map<string, number>();
    const count1 = new Map<number, number>();
    const count2 = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const key = `${labels1[i]}-${labels2[i]}`;
      contingency.set(key, (contingency.get(key) ?? 0) + 1);
      count1.set(labels1[i], (count1.get(labels1[i]) ?? 0) + 1);
      count2.set(labels2[i], (count2.get(labels2[i]) ?? 0) + 1);
    }
    const comb2 = (x: number) => x * (x - 1) / 2;
    let sumComb = 0;
    for (const c of contingency.values()) sumComb += comb2(c);
    const sumComb1 = [...count1.values()].reduce((s, c) => s + comb2(c), 0);
    const sumComb2 = [...count2.values()].reduce((s, c) => s + comb2(c), 0);
    const expected = sumComb1 * sumComb2 / (comb2(n) || 1);
    const max = (sumComb1 + sumComb2) / 2;
    return max === expected ? 0 : (sumComb - expected) / (max - expected);
  }

  /** Mutual Information between two clusterings. */
  mutualInformation(labels1: number[], labels2: number[]): number {
    const n = labels1.length;
    const contingency = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const key = `${labels1[i]}-${labels2[i]}`;
      contingency.set(key, (contingency.get(key) ?? 0) + 1);
    }
    const count1 = new Map<number, number>();
    const count2 = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      count1.set(labels1[i], (count1.get(labels1[i]) ?? 0) + 1);
      count2.set(labels2[i], (count2.get(labels2[i]) ?? 0) + 1);
    }
    let mi = 0;
    for (const [key, c] of contingency) {
      const [l1, l2] = key.split('-').map(Number);
      const pxy = c / n;
      const px = (count1.get(l1) ?? 0) / n;
      const py = (count2.get(l2) ?? 0) / n;
      mi += pxy * Math.log(pxy / (px * py + 1e-12) + 1e-12);
    }
    return mi;
  }

  /** V-measure (harmonic mean of homogeneity and completeness). */
  vMeasure(labelsTrue: number[], labelsPred: number[], beta: number = 1): number {
    const h = this.homogeneity(labelsTrue, labelsPred);
    const c = this.completeness(labelsTrue, labelsPred);
    return h + c === 0 ? 0 : (1 + beta) * h * c / (beta * h + c + 1e-12);
  }

  /** Homogeneity score (each cluster contains only members of a single class). */
  homogeneity(labelsTrue: number[], labelsPred: number[]): number {
    const hCT = this._conditionalEntropy(labelsPred, labelsTrue);
    const hC = this._entropy(labelsPred);
    return hC === 0 ? 1 : 1 - hCT / hC;
  }

  /** Completeness score (all members of a given class are assigned to the same cluster). */
  completeness(labelsTrue: number[], labelsPred: number[]): number {
    const hTC = this._conditionalEntropy(labelsTrue, labelsPred);
    const hT = this._entropy(labelsTrue);
    return hT === 0 ? 1 : 1 - hTC / hT;
  }

  // ---------------------------------------------------------------------------
  // Calibration metrics
  // ---------------------------------------------------------------------------

  /** Expected Calibration Error (ECE). */
  expectedCalibrationError(yTrue: number[], yProb: number[], nBins: number = 10): number {
    const bins: { sumConf: number; sumAcc: number; count: number }[] = Array.from({ length: nBins }, () => ({ sumConf: 0, sumAcc: 0, count: 0 }));
    for (let i = 0; i < yTrue.length; i++) {
      const binIdx = Math.min(nBins - 1, Math.floor(yProb[i] * nBins));
      bins[binIdx].sumConf += yProb[i];
      bins[binIdx].sumAcc += yTrue[i];
      bins[binIdx].count++;
    }
    let ece = 0;
    const n = yTrue.length;
    for (const bin of bins) {
      if (bin.count === 0) continue;
      const avgConf = bin.sumConf / bin.count;
      const avgAcc = bin.sumAcc / bin.count;
      ece += (bin.count / n) * Math.abs(avgAcc - avgConf);
    }
    return ece;
  }

  /** Maximum Calibration Error (MCE). */
  maximumCalibrationError(yTrue: number[], yProb: number[], nBins: number = 10): number {
    const bins: { sumConf: number; sumAcc: number; count: number }[] = Array.from({ length: nBins }, () => ({ sumConf: 0, sumAcc: 0, count: 0 }));
    for (let i = 0; i < yTrue.length; i++) {
      const binIdx = Math.min(nBins - 1, Math.floor(yProb[i] * nBins));
      bins[binIdx].sumConf += yProb[i];
      bins[binIdx].sumAcc += yTrue[i];
      bins[binIdx].count++;
    }
    let mce = 0;
    for (const bin of bins) {
      if (bin.count === 0) continue;
      const avgConf = bin.sumConf / bin.count;
      const avgAcc = bin.sumAcc / bin.count;
      mce = Math.max(mce, Math.abs(avgAcc - avgConf));
    }
    return mce;
  }

  // ---------------------------------------------------------------------------
  // Statistical tests
  // ---------------------------------------------------------------------------

  /** McNemar's test for paired binary classifications. */
  mcnemarTest(yTrue: number[], yPred1: number[], yPred2: number[]): { statistic: number; pValue: number } {
    let b = 0, c = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const correct1 = yPred1[i] === yTrue[i];
      const correct2 = yPred2[i] === yTrue[i];
      if (correct1 && !correct2) b++;
      else if (!correct1 && correct2) c++;
    }
    const statistic = Math.pow(Math.abs(b - c) - 1, 2) / (b + c + 1e-12);
    const pValue = 1 - this._chiSquareCDF(statistic, 1);
    return { statistic, pValue };
  }

  /** Wilcoxon signed-rank test (for paired samples). */
  wilcoxonTest(scores1: number[], scores2: number[]): { statistic: number; pValue: number } {
    const diffs = scores1.map((s, i) => s - scores2[i]).filter(d => d !== 0);
    const ranks = diffs.map(Math.abs).sort((a, b) => a - b).map((v, i) => ({ v, r: i + 1 }));
    let wPlus = 0, wMinus = 0;
    for (const d of diffs) {
      const rank = ranks.find(r => r.v === Math.abs(d))?.r ?? 0;
      if (d > 0) wPlus += rank;
      else wMinus += rank;
    }
    const statistic = Math.min(wPlus, wMinus);
    const n = diffs.length;
    const mean = n * (n + 1) / 4;
    const std = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
    const z = (statistic - mean) / (std + 1e-12);
    const pValue = 2 * (1 - this._normalCDF(Math.abs(z)));
    return { statistic, pValue };
  }

  /** Kolmogorov-Smirnov test (compares two distributions). */
  ksTest(sample1: number[], sample2: number[]): { statistic: number; pValue: number } {
    const sorted1 = [...sample1].sort((a, b) => a - b);
    const sorted2 = [...sample2].sort((a, b) => a - b);
    const all = [...new Set([...sorted1, ...sorted2])].sort((a, b) => a - b);
    let maxDiff = 0;
    for (const v of all) {
      const cdf1 = sorted1.filter(x => x <= v).length / sorted1.length;
      const cdf2 = sorted2.filter(x => x <= v).length / sorted2.length;
      maxDiff = Math.max(maxDiff, Math.abs(cdf1 - cdf2));
    }
    const n1 = sorted1.length, n2 = sorted2.length;
    const en = Math.sqrt(n1 * n2 / (n1 + n2));
    const pValue = 2 * Math.exp(-2 * en * maxDiff * en * maxDiff);
    return { statistic: maxDiff, pValue: Math.min(1, pValue) };
  }

  /** Permutation test (test if two samples come from the same distribution). */
  permutationTest(sample1: number[], sample2: number[], nPermutations: number = 1000): { statistic: number; pValue: number } {
    const obsDiff = Math.abs(this._mean(sample1) - this._mean(sample2));
    const combined = [...sample1, ...sample2];
    let count = 0;
    for (let i = 0; i < nPermutations; i++) {
      const shuffled = this._shuffle(combined);
      const newS1 = shuffled.slice(0, sample1.length);
      const newS2 = shuffled.slice(sample1.length);
      const diff = Math.abs(this._mean(newS1) - this._mean(newS2));
      if (diff >= obsDiff) count++;
    }
    return { statistic: obsDiff, pValue: count / nPermutations };
  }

  // ---------------------------------------------------------------------------
  // Multi-label / hierarchical classification metrics
  // ---------------------------------------------------------------------------

  /** Subset accuracy (exact match for multi-label). */
  subsetAccuracy(yTrue: number[][], yPred: number[][]): number {
    let correct = 0;
    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i].every((v, j) => v === yPred[i][j])) correct++;
    }
    return correct / Math.max(1, yTrue.length);
  }

  /** Hierarchical precision (for hierarchical classification). */
  hierarchicalPrecision(yTrue: number[][], yPred: number[][]): number {
    let sumPrecision = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const intersection = yTrue[i].filter((v, j) => v === 1 && yPred[i][j] === 1).length;
      const predicted = yPred[i].filter(v => v === 1).length;
      sumPrecision += predicted === 0 ? 0 : intersection / predicted;
    }
    return sumPrecision / Math.max(1, yTrue.length);
  }

  /** Hierarchical recall. */
  hierarchicalRecall(yTrue: number[][], yPred: number[][]): number {
    let sumRecall = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const intersection = yTrue[i].filter((v, j) => v === 1 && yPred[i][j] === 1).length;
      const actual = yTrue[i].filter(v => v === 1).length;
      sumRecall += actual === 0 ? 0 : intersection / actual;
    }
    return sumRecall / Math.max(1, yTrue.length);
  }

  /** Hierarchical F1. */
  hierarchicalF1(yTrue: number[][], yPred: number[][]): number {
    const p = this.hierarchicalPrecision(yTrue, yPred);
    const r = this.hierarchicalRecall(yTrue, yPred);
    return p + r === 0 ? 0 : 2 * p * r / (p + r);
  }

  // ---------------------------------------------------------------------------
  // Cost-sensitive metrics
  // ---------------------------------------------------------------------------

  /** Cost-sensitive accuracy (penalizes different types of errors differently). */
  costSensitiveAccuracy(yTrue: number[], yPred: number[], costMatrix: number[][]): number {
    const labels = [...new Set([...yTrue, ...yPred])];
    let totalCost = 0;
    let maxCost = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const ti = labels.indexOf(yTrue[i]);
      const pi = labels.indexOf(yPred[i]);
      if (ti !== pi) totalCost += costMatrix[ti]?.[pi] ?? 1;
      maxCost += Math.max(...costMatrix[ti] ?? [1]);
    }
    return maxCost === 0 ? 0 : 1 - totalCost / maxCost;
  }

  /** Expected cost (for cost-sensitive classification). */
  expectedCost(yTrue: number[], yProb: number[][], costMatrix: number[][]): number {
    let total = 0;
    for (let i = 0; i < yTrue.length; i++) {
      for (let j = 0; j < costMatrix[yTrue[i]].length; j++) {
        total += yProb[i][j] * costMatrix[yTrue[i]][j];
      }
    }
    return total / Math.max(1, yTrue.length);
  }

  // ---------------------------------------------------------------------------
  // Time-series specific metrics
  // ---------------------------------------------------------------------------

  /** Mean Absolute Scaled Error (MASE) for time series. */
  mase(yTrue: number[], yPred: number[], yTrain: number[], seasonality: number = 1): number {
    const n = yTrain.length;
    let naiveError = 0;
    for (let i = seasonality; i < n; i++) {
      naiveError += Math.abs(yTrain[i] - yTrain[i - seasonality]);
    }
    naiveError /= (n - seasonality);
    const errors = yTrue.map((t, i) => Math.abs(t - yPred[i]));
    return errors.reduce((s, e) => s + e, 0) / Math.max(1, errors.length) / (naiveError + 1e-12);
  }

  /** Mean Absolute Scaled Error for stationary series. */
  maseStationary(yTrue: number[], yPred: number[], yTrain: number[]): number {
    return this.mase(yTrue, yPred, yTrain, 1);
  }

  /** Theil's U statistic (inequality of forecasting). */
  theilsU(yTrue: number[], yPred: number[]): number {
    let num = 0, den = 0;
    for (let i = 0; i < yTrue.length; i++) {
      num += Math.pow(yTrue[i] - yPred[i], 2);
      den += Math.pow(yTrue[i], 2);
    }
    return Math.sqrt(num / (den + 1e-12));
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  /** Stratified K-fold cross-validation (preserves class balance). */
  stratifiedKFold(model: ModelLike, X: number[][], y: number[], k: number = 5, metric: 'accuracy' | 'mse' | 'r2' = 'accuracy'): CVResult {
    const classes = [...new Set(y)];
    const classIndices = new Map<number, number[]>();
    for (const c of classes) classIndices.set(c, []);
    y.forEach((yi, i) => classIndices.get(yi)!.push(i));
    const folds: number[][] = Array.from({ length: k }, () => []);
    for (const indices of classIndices.values()) {
      const shuffled = this._shuffle(indices);
      shuffled.forEach((idx, i) => folds[i % k].push(idx));
    }
    const scores: number[] = [];
    for (let f = 0; f < k; f++) {
      const valIdx = folds[f];
      const trainIdx = folds.filter((_, i) => i !== f).flat();
      const Xtrain = trainIdx.map(i => X[i]);
      const ytrain = trainIdx.map(i => y[i]);
      const Xval = valIdx.map(i => X[i]);
      const yval = valIdx.map(i => y[i]);
      model.fit(Xtrain, ytrain);
      const preds = model.predict(Xval);
      let score = 0;
      if (metric === 'accuracy') score = this.accuracy(yval, preds);
      else if (metric === 'mse') score = -this.mse(yval, preds);
      else score = this.r2(yval, preds);
      scores.push(score);
    }
    const mean = this._mean(scores);
    const std = Math.sqrt(scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length);
    const cv: CVResult = { folds: k, mean, std, scores };
    this._cvResults.push(cv);
    return cv;
  }

  /** Leave-One-Out cross-validation. */
  leaveOneOut(model: ModelLike, X: number[][], y: number[], metric: 'accuracy' | 'mse' | 'r2' = 'accuracy'): CVResult {
    const n = X.length;
    const scores: number[] = [];
    for (let i = 0; i < n; i++) {
      const trainIdx = Array.from({ length: n }, (_, j) => j).filter(j => j !== i);
      const Xtrain = trainIdx.map(j => X[j]);
      const ytrain = trainIdx.map(j => y[j]);
      model.fit(Xtrain, ytrain);
      const preds = model.predict([X[i]]);
      let score = 0;
      if (metric === 'accuracy') score = preds[0] === y[i] ? 1 : 0;
      else if (metric === 'mse') score = -Math.pow(y[i] - preds[0], 2);
      else {
        const mean = this._mean(ytrain);
        const ssTot = Math.pow(y[i] - mean, 2);
        const ssRes = Math.pow(y[i] - preds[0], 2);
        score = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
      }
      scores.push(score);
    }
    const mean = this._mean(scores);
    const std = Math.sqrt(scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length);
    const cv: CVResult = { folds: n, mean, std, scores };
    this._cvResults.push(cv);
    return cv;
  }

  /** Group K-fold cross-validation (groups all samples from same group together). */
  groupKFold(model: ModelLike, X: number[][], y: number[], groups: number[], k: number = 5, metric: 'accuracy' | 'mse' | 'r2' = 'accuracy'): CVResult {
    const uniqueGroups = [...new Set(groups)];
    const shuffledGroups = this._shuffle(uniqueGroups);
    const groupFolds: number[][][] = Array.from({ length: k }, () => []);
    shuffledGroups.forEach((g, i) => {
      const indices = groups.map((grp, idx) => grp === g ? idx : -1).filter(idx => idx >= 0);
      groupFolds[i % k].push(indices);
    });
    const scores: number[] = [];
    for (let f = 0; f < k; f++) {
      const valIdx: number[] = groupFolds[f].flat();
      const trainIdx: number[] = groupFolds.filter((_, i) => i !== f).flat(2);
      if (trainIdx.length === 0 || valIdx.length === 0) continue;
      const Xtrain = trainIdx.map(i => X[i]);
      const ytrain = trainIdx.map(i => y[i]);
      const Xval = valIdx.map(i => X[i]);
      const yval = valIdx.map(i => y[i]);
      model.fit(Xtrain, ytrain);
      const preds = model.predict(Xval);
      let score = 0;
      if (metric === 'accuracy') score = this.accuracy(yval, preds);
      else if (metric === 'mse') score = -this.mse(yval, preds);
      else score = this.r2(yval, preds);
      scores.push(score);
    }
    const mean = this._mean(scores);
    const std = Math.sqrt(scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length);
    const cv: CVResult = { folds: k, mean, std, scores };
    this._cvResults.push(cv);
    return cv;
  }

  /** Time-series split cross-validation (forward chaining). */
  timeSeriesSplit(model: ModelLike, X: number[][], y: number[], nSplits: number = 5, metric: 'accuracy' | 'mse' | 'r2' = 'accuracy'): CVResult {
    const n = X.length;
    const testSize = Math.floor(n / (nSplits + 1));
    const scores: number[] = [];
    for (let i = 0; i < nSplits; i++) {
      const trainEnd = (i + 1) * testSize;
      const testEnd = Math.min(n, trainEnd + testSize);
      const trainIdx = Array.from({ length: trainEnd }, (_, j) => j);
      const testIdx = Array.from({ length: testEnd - trainEnd }, (_, j) => j + trainEnd);
      const Xtrain = trainIdx.map(j => X[j]);
      const ytrain = trainIdx.map(j => y[j]);
      const Xval = testIdx.map(j => X[j]);
      const yval = testIdx.map(j => y[j]);
      model.fit(Xtrain, ytrain);
      const preds = model.predict(Xval);
      let score = 0;
      if (metric === 'accuracy') score = this.accuracy(yval, preds);
      else if (metric === 'mse') score = -this.mse(yval, preds);
      else score = this.r2(yval, preds);
      scores.push(score);
    }
    const mean = this._mean(scores);
    const std = Math.sqrt(scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length);
    const cv: CVResult = { folds: nSplits, mean, std, scores };
    this._cvResults.push(cv);
    return cv;
  }

  /** Repeated K-fold cross-validation (reduces variance). */
  repeatedKFold(model: ModelLike, X: number[][], y: number[], k: number = 5, nRepeats: number = 3, metric: 'accuracy' | 'mse' | 'r2' = 'accuracy'): CVResult {
    const allScores: number[] = [];
    for (let r = 0; r < nRepeats; r++) {
      const cv = this.crossValidate(model, X, y, k, metric);
      allScores.push(...cv.scores);
    }
    const mean = this._mean(allScores);
    const std = Math.sqrt(allScores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / allScores.length);
    const cv: CVResult = { folds: k * nRepeats, mean, std, scores: allScores };
    this._cvResults.push(cv);
    return cv;
  }

  /** Nested cross-validation (inner CV for hyperparameter tuning, outer for evaluation). */
  nestedCrossValidate(model: ModelLike, X: number[][], y: number[], outerK: number = 5, innerK: number = 3, params?: Record<string, number[]>): { outerScore: number; outerStd: number; innerScores: number[] } {
    const indices = this._shuffle(X.map((_, i) => i));
    const foldSize = Math.floor(indices.length / outerK);
    const outerScores: number[] = [];
    const innerScores: number[] = [];
    for (let i = 0; i < outerK; i++) {
      const start = i * foldSize;
      const end = start + foldSize;
      const testIdx = indices.slice(start, end);
      const trainIdx = indices.filter(idx => idx < start || idx >= end);
      const Xtrain = trainIdx.map(idx => X[idx]);
      const ytrain = trainIdx.map(idx => y[idx]);
      const Xtest = testIdx.map(idx => X[idx]);
      const ytest = testIdx.map(idx => y[idx]);
      if (params) {
        const inner = this.crossValidate(model, Xtrain, ytrain, innerK);
        innerScores.push(inner.mean);
      }
      model.fit(Xtrain, ytrain);
      const preds = model.predict(Xtest);
      outerScores.push(this.accuracy(ytest, preds));
    }
    const mean = this._mean(outerScores);
    const std = Math.sqrt(outerScores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / outerScores.length);
    return { outerScore: mean, outerStd: std, innerScores };
  }

  /** Bootstrap evaluation (resamples with replacement). */
  bootstrap(model: ModelLike, X: number[][], y: number[], nBootstraps: number = 100): { mean: number; std: number; confidence: [number, number] } {
    const n = X.length;
    const scores: number[] = [];
    for (let b = 0; b < nBootstraps; b++) {
      const indices = Array.from({ length: n }, () => Math.floor(Math.random() * n));
      const Xb = indices.map(i => X[i]);
      const yb = indices.map(i => y[i]);
      const oobIndices = Array.from({ length: n }, (_, i) => i).filter(i => !indices.includes(i));
      if (oobIndices.length === 0) continue;
      const Xoob = oobIndices.map(i => X[i]);
      const yoob = oobIndices.map(i => y[i]);
      model.fit(Xb, yb);
      const preds = model.predict(Xoob);
      scores.push(this.accuracy(yoob, preds));
    }
    const mean = this._mean(scores);
    const std = Math.sqrt(scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, scores.length));
    const sorted = [...scores].sort((a, b) => a - b);
    const lower = sorted[Math.floor(0.025 * sorted.length)] ?? 0;
    const upper = sorted[Math.floor(0.975 * sorted.length)] ?? 0;
    return { mean, std, confidence: [lower, upper] };
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

  private _mean(v: number[]): number {
    return v.length === 0 ? 0 : v.reduce((s, x) => s + x, 0) / v.length;
  }

  private _median(v: number[]): number {
    if (v.length === 0) return 0;
    const sorted = [...v].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private _quantile(v: number[], q: number): number {
    if (v.length === 0) return 0;
    const sorted = [...v].sort((a, b) => a - b);
    const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(q * sorted.length)));
    return sorted[idx];
  }

  private _entropy(values: number[]): number {
    if (values.length === 0) return 0;
    const counts = new Map<number, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    let entropy = 0;
    for (const c of counts.values()) {
      const p = c / values.length;
      entropy -= p * Math.log2(p + 1e-12);
    }
    return entropy;
  }

  private _conditionalEntropy(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    const groups = new Map<number, number[]>();
    y.forEach((yi, i) => {
      if (!groups.has(yi)) groups.set(yi, []);
      groups.get(yi)!.push(x[i]);
    });
    let ce = 0;
    for (const [yi, group] of groups) {
      const p = group.length / y.length;
      ce += p * this._entropy(group);
      void yi;
    }
    return ce;
  }

  private _shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private _chiSquareCDF(x: number, _df: number): number {
    // Lower incomplete gamma function for chi-square CDF (df=1: standard approximation).
    return this._lowerIncompleteGamma(_df / 2, x / 2);
  }

  private _lowerIncompleteGamma(s: number, x: number): number {
    if (x < 0) return 0;
    if (x < s + 1) {
      // Series expansion
      let term = 1 / s;
      let sum = term;
      for (let n = 1; n < 100; n++) {
        term *= x / (s + n);
        sum += term;
        if (Math.abs(term) < 1e-10) break;
      }
      return Math.pow(x, s) * Math.exp(-x) * sum / this._gamma(s);
    } else {
      // Continued fraction
      let b = x + 1 - s;
      let c = 1e30;
      let d = 1 / b;
      let h = d;
      for (let i = 1; i < 100; i++) {
        const an = -i * (i - s);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < 1e-30) d = 1e-30;
        c = b + an / c;
        if (Math.abs(c) < 1e-30) c = 1e-30;
        d = 1 / d;
        const delta = d * c;
        h *= delta;
        if (Math.abs(delta - 1) < 1e-10) break;
      }
      return 1 - Math.pow(x, s) * Math.exp(-x) * h / this._gamma(s);
    }
  }

  private _gamma(s: number): number {
    // Lanczos approximation
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (s < 0.5) {
      return Math.PI / (Math.sin(Math.PI * s) * this._gamma(1 - s));
    }
    s -= 1;
    let x = c[0];
    for (let i = 1; i < g + 2; i++) {
      x += c[i] / (s + i);
    }
    const t = s + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, s + 0.5) * Math.exp(-t) * x;
  }

  private _normalCDF(x: number): number {
    return 0.5 * (1 + this._erf(x / Math.SQRT2));
  }

  private _erf(x: number): number {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return x >= 0 ? y : -y;
  }
}
