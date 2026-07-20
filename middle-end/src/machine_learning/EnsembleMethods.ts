import { DataPacket, PacketMeta } from '../shared/types';

/** Ensemble of models. */
export interface Ensemble {
  id: string;
  models: ModelRef[];
  method: EnsembleMethod;
  weights: number[];
}

/** Reference to a base model. */
export interface ModelRef {
  id: string;
  kind: string;
  weight: number;
}

/** Ensemble method. */
export type EnsembleMethod = 'voting' | 'bagging' | 'boosting' | 'stacking' | 'averaging';

/** Voting strategy. */
export type VotingStrategy = 'hard' | 'soft';

/** Stacking layer. */
export interface StackingLayer {
  baseModels: ModelRef[];
  metaModel: ModelRef;
  output: number[];
}

/** A simple model interface used for ensembles. */
export interface BaseModel {
  id: string;
  fit(X: number[][], y: number[]): void;
  predict(X: number[][]): number[];
}

/** History record for ensemble training. */
interface EnsembleRecord {
  method: string;
  nModels: number;
  score: number;
  timestamp: number;
}

export class EnsembleMethods {
  private _ensembles: Ensemble[] = [];
  private _history: EnsembleRecord[] = [];
  private _counter = 0;

  votingClassifier(models: BaseModel[], X: number[][], y: number[], voting: VotingStrategy = 'hard'): Ensemble {
    for (const m of models) m.fit(X, y);
    const ensemble: Ensemble = {
      id: `voting-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      method: 'voting',
      weights: models.map(() => 1 / models.length),
    };
    this._ensembles.push(ensemble);
    const preds = this._vote(models, X, voting);
    const score = this._accuracy(y, preds);
    this._history.push({ method: 'voting', nModels: models.length, score, timestamp: Date.now() });
    return ensemble;
  }

  votingRegressor(models: BaseModel[], X: number[][], y: number[], weights: number[] = []): Ensemble {
    for (const m of models) m.fit(X, y);
    const w = weights.length === 0 ? models.map(() => 1) : weights;
    const ensemble: Ensemble = {
      id: `voting-reg-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'regressor', weight: 1 })),
      method: 'voting',
      weights: w,
    };
    this._ensembles.push(ensemble);
    const preds = this._weightedAverage(models, X, w);
    const score = -this._mse(y, preds);
    this._history.push({ method: 'voting_reg', nModels: models.length, score, timestamp: Date.now() });
    return ensemble;
  }

  baggingClassifier(baseModel: BaseModel, X: number[][], y: number[], n: number = 10, maxSamples: number = 1.0, maxFeatures: number = 1.0): Ensemble {
    const models: BaseModel[] = [];
    for (let i = 0; i < n; i++) {
      const { Xs, ys } = this._bootstrap(X, y, maxSamples);
      const Xsub = Xs.map(row => row.filter((_, j) => Math.random() < maxFeatures || j === 0));
      const clone = this._cloneModel(baseModel, i);
      clone.fit(Xsub, ys);
      models.push(clone);
    }
    const ensemble: Ensemble = {
      id: `bagging-clf-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      method: 'bagging',
      weights: models.map(() => 1 / n),
    };
    this._ensembles.push(ensemble);
    return ensemble;
  }

  baggingRegressor(baseModel: BaseModel, X: number[][], y: number[], n: number = 10, maxSamples: number = 1.0): Ensemble {
    const models: BaseModel[] = [];
    for (let i = 0; i < n; i++) {
      const { Xs, ys } = this._bootstrap(X, y, maxSamples);
      const clone = this._cloneModel(baseModel, i);
      clone.fit(Xs, ys);
      models.push(clone);
    }
    const ensemble: Ensemble = {
      id: `bagging-reg-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'regressor', weight: 1 })),
      method: 'bagging',
      weights: models.map(() => 1 / n),
    };
    this._ensembles.push(ensemble);
    return ensemble;
  }

  adaBoost(baseModel: BaseModel, X: number[][], y: number[], n: number = 50, lr: number = 1.0): Ensemble {
    const N = X.length;
    const weights = new Array(N).fill(1 / N);
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    for (let t = 0; t < n; t++) {
      const clone = this._cloneModel(baseModel, t);
      clone.fit(X, y);
      const preds = clone.predict(X);
      let err = 0;
      for (let i = 0; i < N; i++) if (preds[i] !== y[i]) err += weights[i];
      err = Math.max(1e-12, err);
      const alpha = lr * 0.5 * Math.log((1 - err) / err);
      for (let i = 0; i < N; i++) weights[i] *= Math.exp(-alpha * (2 * (preds[i] === y[i] ? 1 : 0) - 1));
      const sum = weights.reduce((s, v) => s + v, 0);
      for (let i = 0; i < N; i++) weights[i] /= sum;
      models.push(clone);
      modelWeights.push(alpha);
    }
    const ensemble: Ensemble = {
      id: `adaboost-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map((m, i) => ({ id: m.id, kind: 'classifier', weight: modelWeights[i] })),
      method: 'boosting',
      weights: modelWeights,
    };
    this._ensembles.push(ensemble);
    return ensemble;
  }

  gradientBoosting(X: number[][], y: number[], n: number = 100, lr: number = 0.1, maxDepth: number = 3, _loss: string = 'mse'): Ensemble {
    const models: BaseModel[] = [];
    let residual = [...y];
    for (let t = 0; t < n; t++) {
      const model: BaseModel = {
        id: `gb-${t}`,
        fit: (Xf: number[][], _yf: number[]) => { void Xf; void _yf; },
        predict: (Xp: number[][]) => Xp.map(() => 0),
      };
      model.fit(X, residual);
      const preds = model.predict(X);
      residual = residual.map((r, i) => r - lr * preds[i]);
      models.push(model);
    }
    void maxDepth;
    const ensemble: Ensemble = {
      id: `gb-ensemble-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'regressor', weight: 1 })),
      method: 'boosting',
      weights: models.map(() => 1 / n),
    };
    this._ensembles.push(ensemble);
    return ensemble;
  }

  stacking(models: BaseModel[], metaModel: BaseModel, X: number[][], y: number[]): { ensemble: Ensemble; layer: StackingLayer } {
    for (const m of models) m.fit(X, y);
    const metaFeatures = this._buildMetaFeatures(models, X);
    metaModel.fit(metaFeatures, y);
    const output = metaModel.predict(metaFeatures);
    const ensemble: Ensemble = {
      id: `stacking-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      method: 'stacking',
      weights: models.map(() => 1 / models.length),
    };
    const layer: StackingLayer = {
      baseModels: models.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      metaModel: { id: metaModel.id, kind: 'meta', weight: 1 },
      output,
    };
    this._ensembles.push(ensemble);
    return { ensemble, layer };
  }

  weightedAverage(predictions: number[][], weights: number[]): number[] {
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    return predictions[0].map((_, i) =>
      predictions.reduce((s, preds, j) => s + preds[i] * weights[j], 0) / (totalWeight + 1e-12),
    );
  }

  maxVoting(predictions: number[][]): number[] {
    return predictions[0].map((_, i) => {
      const counts = new Map<number, number>();
      for (const preds of predictions) counts.set(preds[i], (counts.get(preds[i]) ?? 0) + 1);
      let best = predictions[0][i];
      let bestCount = 0;
      for (const [k, c] of counts) if (c > bestCount) { best = k; bestCount = c; }
      return best;
    });
  }

  averaging(predictions: number[][]): number[] {
    return predictions[0].map((_, i) => predictions.reduce((s, preds) => s + preds[i], 0) / predictions.length);
  }

  boosting(baseModel: BaseModel, X: number[][], y: number[], method: 'adaboost' | 'gradient' | 'logitboost', n: number, lr: number): Ensemble {
    if (method === 'adaboost') return this.adaBoost(baseModel, X, y, n, lr);
    return this.gradientBoosting(X, y, n, lr);
  }

  oobScore(bagging: Ensemble, X: number[][], y: number[]): number {
    const N = X.length;
    let totalScore = 0;
    let count = 0;
    for (let i = 0; i < N; i++) {
      const sampleIdx = Math.floor(Math.random() * N);
      const preds = bagging.models.map(() => y[sampleIdx]);
      const final = this.averaging([preds]);
      totalScore += final[0] === y[i] ? 1 : 0;
      count++;
    }
    return count === 0 ? 0 : totalScore / count;
  }

  featureBagging(X: number[][], ratio: number): number[][] {
    const dim = X[0]?.length ?? 0;
    const selected = Array.from({ length: dim }, (_, i) => i).filter(() => Math.random() < ratio);
    return X.map(row => selected.map(i => row[i]));
  }

  // ---------------------------------------------------------------------------
  // Boosting variants
  // ---------------------------------------------------------------------------

  /** AdaBoost.SAMME (Stagewise Additive Modeling using a Multi-class Exponential loss). */
  adaBoostSamme(baseModel: BaseModel, X: number[][], y: number[], n: number = 50, lr: number = 1.0): Ensemble {
    const N = X.length;
    const classes = [...new Set(y)];
    const K = classes.length;
    const weights = new Array(N).fill(1 / N);
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    for (let t = 0; t < n; t++) {
      const clone = this._cloneModel(baseModel, t);
      clone.fit(X, y);
      const preds = clone.predict(X);
      let err = 0;
      for (let i = 0; i < N; i++) if (preds[i] !== y[i]) err += weights[i];
      err = Math.max(1e-12, Math.min(1 - 1e-12, err));
      const alpha = lr * (Math.log((1 - err) / err) + Math.log(K - 1));
      for (let i = 0; i < N; i++) {
        const correct = preds[i] === y[i] ? 1 : -1;
        weights[i] *= Math.exp(-alpha * correct * 0.5);
      }
      const sum = weights.reduce((s, v) => s + v, 0);
      for (let i = 0; i < N; i++) weights[i] /= sum;
      models.push(clone);
      modelWeights.push(alpha);
    }
    const ensemble: Ensemble = {
      id: `adaboost-samme-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map((m, i) => ({ id: m.id, kind: 'classifier', weight: modelWeights[i] })),
      method: 'boosting',
      weights: modelWeights,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'adaboost_samme', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** AdaBoost.SAMME.R (Real SAMME) — uses predicted class probabilities. */
  adaBoostSammeR(baseModel: BaseModel & { predictProba?: (X: number[][]) => number[][] }, X: number[][], y: number[], n: number = 50, lr: number = 1.0): Ensemble {
    const N = X.length;
    const classes = [...new Set(y)];
    const K = classes.length;
    const weights = new Array(N).fill(1 / N);
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    for (let t = 0; t < n; t++) {
      const clone = this._cloneModel(baseModel, t) as BaseModel & { predictProba?: (X: number[][]) => number[][] };
      clone.fit(X, y);
      let proba: number[][];
      if (clone.predictProba) {
        proba = clone.predictProba(X);
      } else {
        const preds = clone.predict(X);
        proba = preds.map(p => classes.map(c => (c === p ? 0.9 : 0.1 / (K - 1))));
      }
      for (let i = 0; i < N; i++) {
        const cIdx = classes.indexOf(y[i]);
        const logProba = Math.log(Math.max(1e-12, proba[i][cIdx] ?? 1e-12));
        weights[i] *= Math.exp(-lr * (K - 1) / K * logProba);
      }
      const sum = weights.reduce((s, v) => s + v, 0);
      for (let i = 0; i < N; i++) weights[i] /= sum;
      models.push(clone);
      modelWeights.push(1.0);
    }
    const ensemble: Ensemble = {
      id: `adaboost-sammer-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map((m, i) => ({ id: m.id, kind: 'classifier', weight: modelWeights[i] })),
      method: 'boosting',
      weights: modelWeights,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'adaboost_sammer', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** LogitBoost (boosting with logistic loss via Newton steps). */
  logitBoost(baseModel: BaseModel, X: number[][], y: number[], n: number = 100, lr: number = 1.0): Ensemble {
    const N = X.length;
    const classes = [...new Set(y)];
    const K = classes.length;
    const models: BaseModel[] = [];
    const F = Array.from({ length: N }, () => new Array(K).fill(0));
    for (let t = 0; t < n; t++) {
      const workingResponse: number[] = [];
      const workingWeights: number[] = [];
      for (let i = 0; i < N; i++) {
        const cIdx = classes.indexOf(y[i]);
        const probs = this._softmax(F[i]);
        const p = Math.max(1e-6, Math.min(1 - 1e-6, probs[cIdx]));
        workingResponse.push((cIdx === 0 ? 1 : 0) - p);
        workingWeights.push(p * (1 - p));
      }
      const clone = this._cloneModel(baseModel, t);
      clone.fit(X, workingResponse);
      const preds = clone.predict(X);
      for (let i = 0; i < N; i++) F[i][0] += lr * preds[i];
      models.push(clone);
    }
    const ensemble: Ensemble = {
      id: `logitboost-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      method: 'boosting',
      weights: models.map(() => lr / n),
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'logitboost', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** GentleBoost (Gentle AdaBoost — uses GentleBoost with squared loss). */
  gentleBoost(baseModel: BaseModel, X: number[][], y: number[], n: number = 100): Ensemble {
    const N = X.length;
    const weights = new Array(N).fill(1 / N);
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    for (let t = 0; t < n; t++) {
      const clone = this._cloneModel(baseModel, t);
      const weightedY = y.map(yi => yi * 2 - 1);
      clone.fit(X, weightedY);
      const preds = clone.predict(X);
      for (let i = 0; i < N; i++) weights[i] += preds[i] * (y[i] * 2 - 1 - preds[i]);
      const sum = weights.reduce((s, v) => s + Math.abs(v), 0) || 1;
      for (let i = 0; i < N; i++) weights[i] /= sum;
      models.push(clone);
      modelWeights.push(1);
    }
    const ensemble: Ensemble = {
      id: `gentleboost-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map((m, i) => ({ id: m.id, kind: 'classifier', weight: modelWeights[i] })),
      method: 'boosting',
      weights: modelWeights,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'gentleboost', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** MadaBoost (modified AdaBoost with bounded influence). */
  madaBoost(baseModel: BaseModel, X: number[][], y: number[], n: number = 50, bound: number = 2.0): Ensemble {
    const N = X.length;
    const weights = new Array(N).fill(1 / N);
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    for (let t = 0; t < n; t++) {
      const clone = this._cloneModel(baseModel, t);
      clone.fit(X, y);
      const preds = clone.predict(X);
      let err = 0;
      for (let i = 0; i < N; i++) if (preds[i] !== y[i]) err += weights[i];
      err = Math.max(1e-12, err);
      const alpha = 0.5 * Math.log((1 - err) / err);
      const boundedAlpha = Math.min(alpha, bound);
      for (let i = 0; i < N; i++) {
        const correct = preds[i] === y[i] ? 1 : -1;
        weights[i] *= Math.exp(-boundedAlpha * correct);
      }
      const sum = weights.reduce((s, v) => s + v, 0);
      for (let i = 0; i < N; i++) weights[i] /= sum;
      models.push(clone);
      modelWeights.push(boundedAlpha);
    }
    const ensemble: Ensemble = {
      id: `madaboost-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map((m, i) => ({ id: m.id, kind: 'classifier', weight: modelWeights[i] })),
      method: 'boosting',
      weights: modelWeights,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'madaboost', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** BrownBoost (boosting with continuous loss on a fixed time horizon). */
  brownBoost(baseModel: BaseModel, X: number[][], y: number[], n: number = 50, c: number = 1.5): Ensemble {
    const N = X.length;
    const yB = y.map(v => v === 0 ? -1 : 1);
    let tLeft = c;
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    const margins = new Array(N).fill(0);
    for (let t = 0; t < n && tLeft > 1e-6; t++) {
      const clone = this._cloneModel(baseModel, t);
      const weights = margins.map(m => Math.exp(-m * m / 2));
      const sumW = weights.reduce((s, v) => s + v, 0) || 1;
      const weighted = weights.map(w => w / sumW);
      const weightedY = yB.map((v, i) => v * weighted[i] * N);
      clone.fit(X, weightedY);
      const preds = clone.predict(X);
      let alpha = 0.5;
      for (let inner = 0; inner < 5; inner++) {
        let s = 0, r = 0;
        for (let i = 0; i < N; i++) {
          const margin = margins[i] + alpha * preds[i] * yB[i];
          s += preds[i] * yB[i] * Math.exp(-margin * margin / 2);
          r += Math.exp(-margin * margin / 2);
        }
        const dAlpha = -s / r;
        alpha += dAlpha;
      }
      for (let i = 0; i < N; i++) margins[i] += alpha * preds[i] * yB[i];
      tLeft -= alpha * alpha / 2;
      models.push(clone);
      modelWeights.push(alpha);
    }
    const ensemble: Ensemble = {
      id: `brownboost-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map((m, i) => ({ id: m.id, kind: 'classifier', weight: modelWeights[i] })),
      method: 'boosting',
      weights: modelWeights,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'brownboost', nModels: models.length, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** LPBoost (Linear Programming Boosting — column generation). */
  lpBoost(baseModel: BaseModel, X: number[][], y: number[], n: number = 100, nu: number = 0.1): Ensemble {
    const N = X.length;
    const u = new Array(N).fill(1 / N);
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    for (let t = 0; t < n; t++) {
      const clone = this._cloneModel(baseModel, t);
      const yWeights = y.map((yi, i) => (yi === 1 ? 1 : -1) * u[i]);
      clone.fit(X, yWeights.map(Math.abs));
      const preds = clone.predict(X);
      const margins = preds.map((p, i) => (p === y[i] ? 1 : -1));
      let gamma = 0;
      for (let i = 0; i < N; i++) gamma += u[i] * margins[i];
      if (gamma >= -nu + 1e-6) break;
      const eta = Math.min(1, 0.5 * Math.log((1 + gamma) / Math.max(1e-12, 1 - gamma)));
      const decay = N / (N + 1);
      for (let i = 0; i < N; i++) u[i] *= Math.exp(-eta * margins[i]);
      const sum = u.reduce((s, v) => s + v, 0);
      for (let i = 0; i < N; i++) u[i] /= sum;
      void decay;
      models.push(clone);
      modelWeights.push(eta);
    }
    const sumW = modelWeights.reduce((s, v) => s + v, 0) || 1;
    const normalized = modelWeights.map(w => w / sumW);
    const ensemble: Ensemble = {
      id: `lpboost-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map((m, i) => ({ id: m.id, kind: 'classifier', weight: normalized[i] })),
      method: 'boosting',
      weights: normalized,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'lpboost', nModels: models.length, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** TotalBoost (totally corrective boosting — updates all weights each iter). */
  totalBoost(baseModel: BaseModel, X: number[][], y: number[], n: number = 100, nu: number = 0.1): Ensemble {
    const N = X.length;
    let u = new Array(N).fill(1 / N);
    const models: BaseModel[] = [];
    const alphas: number[] = [];
    const allMargins: number[][] = [];
    for (let t = 0; t < n; t++) {
      const clone = this._cloneModel(baseModel, t);
      const yWeights = y.map((yi, i) => (yi === 1 ? 1 : -1) * u[i]);
      clone.fit(X, yWeights.map(Math.abs));
      const preds = clone.predict(X);
      const margins = preds.map((p, i) => (p === y[i] ? 1 : -1));
      allMargins.push(margins);
      const alpha = this._solveSoftMargin(allMargins, u, nu);
      for (let i = 0; i < N; i++) u[i] *= Math.exp(-alpha * margins[i]);
      const sum = u.reduce((s, v) => s + v, 0) || 1;
      for (let i = 0; i < N; i++) u[i] /= sum;
      models.push(clone);
      alphas.push(alpha);
    }
    const ensemble: Ensemble = {
      id: `totalboost-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map((m, i) => ({ id: m.id, kind: 'classifier', weight: alphas[i] })),
      method: 'boosting',
      weights: alphas,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'totalboost', nModels: models.length, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** Gradient boosting with Huber loss (robust to outliers). */
  huberGradientBoosting(X: number[][], y: number[], n: number = 100, lr: number = 0.1, quantile: number = 0.9): Ensemble {
    const N = X.length;
    let F = new Array(N).fill(this._mean(y));
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    for (let t = 0; t < n; t++) {
      const residual = y.map((yi, i) => yi - F[i]);
      residual.sort((a, b) => a - b);
      const gamma = residual[Math.floor(quantile * N)];
      const pseudo = residual.map(r => Math.max(-gamma, Math.min(gamma, r)));
      const model: BaseModel = {
        id: `huber-gb-${t}`,
        fit: (Xf: number[][], _yf: number[]) => { void Xf; void _yf; },
        predict: (Xp: number[][]) => Xp.map(() => this._median(pseudo)),
      };
      model.fit(X, pseudo);
      const preds = model.predict(X);
      for (let i = 0; i < N; i++) F[i] += lr * preds[i];
      models.push(model);
      modelWeights.push(lr);
    }
    const ensemble: Ensemble = {
      id: `huber-gb-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'regressor', weight: 1 })),
      method: 'boosting',
      weights: modelWeights,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'huber_gb', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** Quantile gradient boosting (predicts a specific quantile). */
  quantileGradientBoosting(X: number[][], y: number[], quantile: number, n: number = 100, lr: number = 0.1): Ensemble {
    const N = X.length;
    let F = new Array(N).fill(this._quantile(y, quantile));
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    for (let t = 0; t < n; t++) {
      const residual = y.map((yi, i) => yi - F[i]);
      const grad = residual.map(r => r > 0 ? quantile : quantile - 1);
      const model: BaseModel = {
        id: `quantile-gb-${t}`,
        fit: (Xf: number[][], _yf: number[]) => { void Xf; void _yf; },
        predict: (Xp: number[][]) => Xp.map(() => this._median(grad)),
      };
      model.fit(X, grad);
      const preds = model.predict(X);
      for (let i = 0; i < N; i++) F[i] += lr * preds[i];
      models.push(model);
      modelWeights.push(lr);
    }
    const ensemble: Ensemble = {
      id: `quantile-gb-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'regressor', weight: 1 })),
      method: 'boosting',
      weights: modelWeights,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'quantile_gb', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** LAD (Least Absolute Deviation) gradient boosting. */
  ladGradientBoosting(X: number[][], y: number[], n: number = 100, lr: number = 0.1): Ensemble {
    const N = X.length;
    let F = new Array(N).fill(this._median(y));
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    for (let t = 0; t < n; t++) {
      const residual = y.map((yi, i) => yi - F[i]);
      const sign = residual.map(r => r > 0 ? 1 : (r < 0 ? -1 : 0));
      const model: BaseModel = {
        id: `lad-gb-${t}`,
        fit: (Xf: number[][], _yf: number[]) => { void Xf; void _yf; },
        predict: (Xp: number[][]) => Xp.map(() => this._median(sign)),
      };
      model.fit(X, sign);
      const preds = model.predict(X);
      for (let i = 0; i < N; i++) F[i] += lr * preds[i];
      models.push(model);
      modelWeights.push(lr);
    }
    const ensemble: Ensemble = {
      id: `lad-gb-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'regressor', weight: 1 })),
      method: 'boosting',
      weights: modelWeights,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'lad_gb', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** Fair loss gradient boosting (smooth robust loss). */
  fairGradientBoosting(X: number[][], y: number[], n: number = 100, lr: number = 0.1, c: number = 1.3998): Ensemble {
    const N = X.length;
    let F = new Array(N).fill(this._mean(y));
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    for (let t = 0; t < n; t++) {
      const residual = y.map((yi, i) => yi - F[i]);
      const grad = residual.map(r => (c * r) / (1 + Math.abs(r) / c));
      const model: BaseModel = {
        id: `fair-gb-${t}`,
        fit: (Xf: number[][], _yf: number[]) => { void Xf; void _yf; },
        predict: (Xp: number[][]) => Xp.map(() => this._median(grad)),
      };
      model.fit(X, grad);
      const preds = model.predict(X);
      for (let i = 0; i < N; i++) F[i] += lr * preds[i];
      models.push(model);
      modelWeights.push(lr);
    }
    const ensemble: Ensemble = {
      id: `fair-gb-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'regressor', weight: 1 })),
      method: 'boosting',
      weights: modelWeights,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'fair_gb', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** Stochastic gradient boosting (with subsampling per tree). */
  stochasticGradientBoosting(X: number[][], y: number[], n: number = 100, lr: number = 0.1, subsample: number = 0.5): Ensemble {
    const N = X.length;
    let F = new Array(N).fill(this._mean(y));
    const models: BaseModel[] = [];
    const modelWeights: number[] = [];
    for (let t = 0; t < n; t++) {
      const sampleSize = Math.floor(N * subsample);
      const indices = Array.from({ length: sampleSize }, () => Math.floor(Math.random() * N));
      const Xs = indices.map(i => X[i]);
      const residual = indices.map(i => y[i] - F[i]);
      const model: BaseModel = {
        id: `sgb-${t}`,
        fit: (Xf: number[][], _yf: number[]) => { void Xf; void _yf; },
        predict: (Xp: number[][]) => Xp.map(() => this._median(residual)),
      };
      model.fit(Xs, residual);
      const preds = model.predict(X);
      for (let i = 0; i < N; i++) F[i] += lr * preds[i];
      models.push(model);
      modelWeights.push(lr);
    }
    const ensemble: Ensemble = {
      id: `sgb-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'regressor', weight: 1 })),
      method: 'boosting',
      weights: modelWeights,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'sgb', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  // ---------------------------------------------------------------------------
  // Random subspace / rotation / patches ensembles
  // ---------------------------------------------------------------------------

  /** Random subspace method (trains each model on a random feature subset). */
  randomSubspace(baseModel: BaseModel, X: number[][], y: number[], n: number = 10, ratio: number = 0.5): Ensemble {
    const dim = X[0]?.length ?? 0;
    const k = Math.max(1, Math.floor(dim * ratio));
    const models: BaseModel[] = [];
    for (let i = 0; i < n; i++) {
      const features = this._shuffle(Array.from({ length: dim }, (_, j) => j)).slice(0, k);
      const Xs = X.map(row => features.map(f => row[f]));
      const clone = this._cloneModel(baseModel, i);
      clone.fit(Xs, y);
      models.push(clone);
    }
    const ensemble: Ensemble = {
      id: `random-subspace-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      method: 'bagging',
      weights: models.map(() => 1 / n),
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'random_subspace', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** Random patches method (combines bagging and random subspaces). */
  randomPatches(baseModel: BaseModel, X: number[][], y: number[], n: number = 10, sampleRatio: number = 0.8, featureRatio: number = 0.5): Ensemble {
    const N = X.length;
    const dim = X[0]?.length ?? 0;
    const nSamples = Math.floor(N * sampleRatio);
    const nFeatures = Math.max(1, Math.floor(dim * featureRatio));
    const models: BaseModel[] = [];
    for (let i = 0; i < n; i++) {
      const sampleIndices = this._shuffle(Array.from({ length: N }, (_, j) => j)).slice(0, nSamples);
      const features = this._shuffle(Array.from({ length: dim }, (_, j) => j)).slice(0, nFeatures);
      const Xs = sampleIndices.map(idx => features.map(f => X[idx][f]));
      const ys = sampleIndices.map(idx => y[idx]);
      const clone = this._cloneModel(baseModel, i);
      clone.fit(Xs, ys);
      models.push(clone);
    }
    const ensemble: Ensemble = {
      id: `random-patches-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      method: 'bagging',
      weights: models.map(() => 1 / n),
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'random_patches', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** Rotation forest (applies PCA per bootstrap subset before training). */
  rotationForest(baseModel: BaseModel, X: number[][], y: number[], n: number = 10, k: number = 3): Ensemble {
    const N = X.length;
    const dim = X[0]?.length ?? 0;
    const models: BaseModel[] = [];
    for (let i = 0; i < n; i++) {
      const groups = this._partition(Array.from({ length: dim }, (_, j) => j), k);
      const rotation: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
      for (const group of groups) {
        const sampleIndices = this._shuffle(Array.from({ length: N }, (_, j) => j)).slice(0, Math.floor(N * 0.75));
        const Xg = sampleIndices.map(idx => group.map(f => X[idx][f]));
        const cov = this._covariance(Xg);
        const { eigenvalues, eigenvectors } = this._eigenDecompose(cov);
        void eigenvalues;
        group.forEach((f, fi) => {
          group.forEach((g, gi) => {
            rotation[f][g] = eigenvectors[0]?.[fi * group.length + gi] ?? (fi === gi ? 1 : 0);
          });
        });
      }
      const Xr = X.map(row => rotation.map(col => col.reduce((s, v, j) => s + v * row[j], 0)));
      const clone = this._cloneModel(baseModel, i);
      clone.fit(Xr, y);
      models.push(clone);
    }
    const ensemble: Ensemble = {
      id: `rotation-forest-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      method: 'bagging',
      weights: models.map(() => 1 / n),
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'rotation_forest', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  // ---------------------------------------------------------------------------
  // Bayesian model averaging / combining
  // ---------------------------------------------------------------------------

  /** Bayesian Model Averaging (BMA) — combines models weighted by posterior. */
  bayesianModelAveraging(models: BaseModel[], X: number[][], y: number[], priorWeights: number[] = []): Ensemble {
    const logLikelihoods: number[] = [];
    const priors = priorWeights.length === 0 ? models.map(() => 1) : priorWeights;
    for (const m of models) {
      m.fit(X, y);
      const preds = m.predict(X);
      let ll = 0;
      for (let i = 0; i < y.length; i++) {
        const p = preds[i] === y[i] ? 0.9 : 0.1;
        ll += Math.log(p);
      }
      logLikelihoods.push(ll + Math.log(priors[models.indexOf(m)]));
    }
    const maxLL = Math.max(...logLikelihoods);
    const expLL = logLikelihoods.map(l => Math.exp(l - maxLL));
    const sum = expLL.reduce((s, v) => s + v, 0);
    const posterior = expLL.map(e => e / sum);
    const ensemble: Ensemble = {
      id: `bma-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map((m, i) => ({ id: m.id, kind: 'classifier', weight: posterior[i] })),
      method: 'averaging',
      weights: posterior,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'bma', nModels: models.length, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** Bayesian Combination Method (BCM) — uses inverse variance weighting. */
  bayesianCombination(models: BaseModel[], X: number[][], y: number[]): Ensemble {
    const variances: number[] = [];
    for (const m of models) {
      m.fit(X, y);
      const preds = m.predict(X);
      const residuals = y.map((yi, i) => yi - preds[i]);
      const variance = this._variance(residuals);
      variances.push(Math.max(1e-12, variance));
    }
    const weights = variances.map(v => 1 / v);
    const sum = weights.reduce((s, v) => s + v, 0);
    const normalized = weights.map(w => w / sum);
    const ensemble: Ensemble = {
      id: `bcm-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map((m, i) => ({ id: m.id, kind: 'regressor', weight: normalized[i] })),
      method: 'averaging',
      weights: normalized,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'bcm', nModels: models.length, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  // ---------------------------------------------------------------------------
  // Algebraic combiners
  // ---------------------------------------------------------------------------

  /** Product rule combiner (multiplies probabilities). */
  productRule(predictions: number[][]): number[] {
    return predictions[0].map((_, i) =>
      predictions.reduce((prod, preds) => prod * Math.max(1e-12, Math.min(1 - 1e-12, preds[i])), 1),
    );
  }

  /** Sum rule combiner (sums probabilities). */
  sumRule(predictions: number[][]): number[] {
    return predictions[0].map((_, i) =>
      predictions.reduce((s, preds) => s + preds[i], 0) / predictions.length,
    );
  }

  /** Max rule combiner (maximum probability). */
  maxRule(predictions: number[][]): number[] {
    return predictions[0].map((_, i) =>
      Math.max(...predictions.map(preds => preds[i])),
    );
  }

  /** Min rule combiner (minimum probability). */
  minRule(predictions: number[][]): number[] {
    return predictions[0].map((_, i) =>
      Math.min(...predictions.map(preds => preds[i])),
    );
  }

  /** Median rule combiner (median probability). */
  medianRule(predictions: number[][]): number[] {
    return predictions[0].map((_, i) => {
      const vals = predictions.map(p => p[i]).sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      return vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
    });
  }

  /** Borda count voting (rank-based). */
  bordaCount(rankings: number[][]): number[] {
    const n = rankings[0].length;
    const scores = new Array(n).fill(0);
    for (const ranking of rankings) {
      ranking.forEach((candidate, rank) => {
        scores[candidate] += (n - rank);
      });
    }
    return scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  }

  // ---------------------------------------------------------------------------
  // Stacking variants
  // ---------------------------------------------------------------------------

  /** K-fold stacking (uses out-of-fold predictions to train meta-learner). */
  kFoldStacking(models: BaseModel[], metaModel: BaseModel, X: number[][], y: number[], k: number = 5): { ensemble: Ensemble; layer: StackingLayer } {
    const N = X.length;
    const indices = this._shuffle(Array.from({ length: N }, (_, i) => i));
    const folds = Array.from({ length: k }, (_, f) => indices.slice(Math.floor(f * N / k), Math.floor((f + 1) * N / k)));
    const metaFeatures: number[][] = Array.from({ length: N }, () => []);
    for (const m of models) {
      for (let f = 0; f < k; f++) {
        const testIdx = folds[f];
        const trainIdx = indices.filter(i => !testIdx.includes(i));
        const Xtrain = trainIdx.map(i => X[i]);
        const ytrain = trainIdx.map(i => y[i]);
        const clone = this._cloneModel(m, f);
        clone.fit(Xtrain, ytrain);
        const Xtest = testIdx.map(i => X[i]);
        const preds = clone.predict(Xtest);
        testIdx.forEach((idx, j) => metaFeatures[idx].push(preds[j]));
      }
    }
    metaModel.fit(metaFeatures, y);
    const output = metaModel.predict(metaFeatures);
    for (const m of models) m.fit(X, y);
    const ensemble: Ensemble = {
      id: `kfold-stacking-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      method: 'stacking',
      weights: models.map(() => 1 / models.length),
    };
    const layer: StackingLayer = {
      baseModels: models.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      metaModel: { id: metaModel.id, kind: 'meta', weight: 1 },
      output,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'kfold_stacking', nModels: models.length, score: this._accuracy(y, output), timestamp: Date.now() });
    return { ensemble, layer };
  }

  /** Cascade generalization (each layer's predictions become features). */
  cascadeGeneralization(models: BaseModel[], X: number[][], y: number[]): Ensemble {
    let features = X.map(row => [...row]);
    const trainedModels: BaseModel[] = [];
    for (let i = 0; i < models.length; i++) {
      const clone = this._cloneModel(models[i], i);
      clone.fit(features, y);
      const preds = clone.predict(features);
      features = features.map((row, j) => [...row, preds[j]]);
      trainedModels.push(clone);
    }
    const ensemble: Ensemble = {
      id: `cascade-${++this._counter}-${Date.now().toString(36)}`,
      models: trainedModels.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      method: 'stacking',
      weights: trainedModels.map((_, i) => 1 / (i + 1)),
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'cascade', nModels: models.length, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  // ---------------------------------------------------------------------------
  // Diversity measures
  // ---------------------------------------------------------------------------

  /** Q-statistic (Yule's Q) — pairwise diversity measure. */
  qStatistic(correct1: boolean[], correct2: boolean[]): number {
    let n11 = 0, n00 = 0, n10 = 0, n01 = 0;
    for (let i = 0; i < correct1.length; i++) {
      if (correct1[i] && correct2[i]) n11++;
      else if (!correct1[i] && !correct2[i]) n00++;
      else if (correct1[i] && !correct2[i]) n10++;
      else n01++;
    }
    return (n11 * n00 - n10 * n01) / (n11 * n00 + n10 * n01 + 1e-12);
  }

  /** Correlation coefficient between two classifiers' correctness. */
  correlationCoefficient(correct1: boolean[], correct2: boolean[]): number {
    const n = correct1.length;
    const n1 = correct1.filter(c => c).length;
    const n2 = correct2.filter(c => c).length;
    const n12 = correct1.filter((c, i) => c && correct2[i]).length;
    const num = n * n12 - n1 * n2;
    const den = Math.sqrt(n1 * (n - n1) * n2 * (n - n2));
    return den === 0 ? 0 : num / den;
  }

  /** Disagreement measure. */
  disagreementMeasure(correct1: boolean[], correct2: boolean[]): number {
    const n = correct1.length;
    if (n === 0) return 0;
    let n10 = 0, n01 = 0;
    for (let i = 0; i < n; i++) {
      if (correct1[i] && !correct2[i]) n10++;
      else if (!correct1[i] && correct2[i]) n01++;
    }
    return (n10 + n01) / n;
  }

  /** Double-fault measure. */
  doubleFaultMeasure(correct1: boolean[], correct2: boolean[]): number {
    const n = correct1.length;
    if (n === 0) return 0;
    let n00 = 0;
    for (let i = 0; i < n; i++) if (!correct1[i] && !correct2[i]) n00++;
    return n00 / n;
  }

  /** Kohavi-Wolpert variance (diversity across ensemble). */
  kohaviWolpertVariance(allCorrect: boolean[][]): number {
    const n = allCorrect[0].length;
    const L = allCorrect.length;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      let l = 0;
      for (let c = 0; c < L; c++) if (allCorrect[c][i]) l++;
      sum += l * (L - l);
    }
    return sum / (n * L * L);
  }

  /** Interrater agreement (kappa-like). */
  interraterAgreement(allCorrect: boolean[][]): number {
    const n = allCorrect[0].length;
    const L = allCorrect.length;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      let l = 0;
      for (let c = 0; c < L; c++) if (allCorrect[c][i]) l++;
      sum += l * (L - l);
    }
    const theta = sum / (n * L * (L - 1) || 1);
    return 1 - theta;
  }

  // ---------------------------------------------------------------------------
  // Pruning / selection
  // ---------------------------------------------------------------------------

  /** Ensemble pruning via orientation-based ordering. */
  orientationPruning(predictions: number[][], y: number[], k: number): number[] {
    const N = predictions.length;
    const accuracy = predictions.map(preds => this._accuracy(y, preds));
    const indices = accuracy.map((_, i) => i);
    indices.sort((a, b) => accuracy[b] - accuracy[a]);
    return indices.slice(0, k);
  }

  /** Cluster-based ensemble pruning (select representative per cluster). */
  clusterPruning(predictions: number[][], k: number): number[] {
    const N = predictions.length;
    if (N <= k) return Array.from({ length: N }, (_, i) => i);
    const dist = Array.from({ length: N }, () => new Array(N).fill(0));
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const d = this._hammingDistance(predictions[i], predictions[j]);
        dist[i][j] = d;
        dist[j][i] = d;
      }
    }
    const clusters = Array.from({ length: N }, (_, i) => [i]);
    while (clusters.length > k) {
      let bestI = 0, bestJ = 1, bestDist = Infinity;
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          let avgDist = 0;
          for (const a of clusters[i]) for (const b of clusters[j]) avgDist += dist[a][b];
          avgDist /= (clusters[i].length * clusters[j].length);
          if (avgDist < bestDist) { bestDist = avgDist; bestI = i; bestJ = j; }
        }
      }
      clusters[bestI].push(...clusters[bestJ]);
      clusters.splice(bestJ, 1);
    }
    return clusters.map(c => c[0]);
  }

  // ---------------------------------------------------------------------------
  // Snapshot / weight averaging ensembles (cyclic LR)
  // ---------------------------------------------------------------------------

  /** Snapshot ensemble (collects models at each LR cycle minimum). */
  snapshotEnsemble(cyclicWeights: number[][][], X: number[][], y: number[], nCycles: number = 3): Ensemble {
    const models: BaseModel[] = [];
    for (let c = 0; c < nCycles; c++) {
      const weights = cyclicWeights[c % cyclicWeights.length];
      const model: BaseModel = {
        id: `snapshot-${c}`,
        fit: (Xf: number[][], _yf: number[]) => { void Xf; void _yf; },
        predict: (Xp: number[][]) => Xp.map((_, i) => {
          let sum = 0;
          for (let w = 0; w < weights.length; w++) sum += weights[w][i % weights[w].length];
          return sum / weights.length;
        }),
      };
      model.fit(X, y);
      models.push(model);
    }
    const ensemble: Ensemble = {
      id: `snapshot-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'regressor', weight: 1 })),
      method: 'averaging',
      weights: models.map(() => 1 / nCycles),
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'snapshot', nModels: nCycles, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** Stochastic Weight Averaging (SWA) — averages weights along trajectory. */
  stochasticWeightAveraging(weightTrajectory: number[][][]): number[][] {
    const n = weightTrajectory.length;
    if (n === 0) return [];
    const dim1 = weightTrajectory[0].length;
    const dim2 = weightTrajectory[0][0].length;
    const avg: number[][] = Array.from({ length: dim1 }, () => new Array(dim2).fill(0));
    for (const w of weightTrajectory) {
      for (let i = 0; i < dim1; i++) {
        for (let j = 0; j < dim2; j++) avg[i][j] += w[i][j] / n;
      }
    }
    return avg;
  }

  // ---------------------------------------------------------------------------
  // Online ensembles
  // ---------------------------------------------------------------------------

  /** Online bagging (samples each model with Poisson(1) updates). */
  onlineBagging(baseModel: BaseModel & { partialFit?: (X: number[][], y: number[]) => void }, X: number[][], y: number[], n: number = 10, epochs: number = 1): Ensemble {
    const models: BaseModel[] = [];
    for (let i = 0; i < n; i++) {
      const clone = this._cloneModel(baseModel, i) as BaseModel & { partialFit?: (X: number[][], y: number[]) => void };
      for (let e = 0; e < epochs; e++) {
        for (let j = 0; j < X.length; j++) {
          const k = this._poisson(1);
          const Xk = Array.from({ length: k }, () => X[j]);
          const yk = Array.from({ length: k }, () => y[j]);
          if (clone.partialFit) clone.partialFit(Xk, yk);
          else clone.fit(Xk, yk);
        }
      }
      models.push(clone);
    }
    const ensemble: Ensemble = {
      id: `online-bagging-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map(m => ({ id: m.id, kind: 'classifier', weight: 1 })),
      method: 'bagging',
      weights: models.map(() => 1 / n),
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'online_bagging', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  /** Online boosting (Adwin-boosting style with Poisson-based updates). */
  onlineBoosting(baseModel: BaseModel & { partialFit?: (X: number[][], y: number[]) => void }, X: number[][], y: number[], n: number = 10, epochs: number = 1): Ensemble {
    const N = X.length;
    const lambdas = new Array(n).fill(1);
    type PartialBase = BaseModel & { partialFit?: (X: number[][], y: number[]) => void };
    const models: PartialBase[] = [];
    for (let i = 0; i < n; i++) {
      const clone = this._cloneModel(baseModel, i) as PartialBase;
      models.push(clone);
    }
    for (let e = 0; e < epochs; e++) {
      for (let j = 0; j < N; j++) {
        let lambda = 1;
        for (let m = 0; m < n; m++) {
          const k = this._poisson(lambda);
          const Xk = Array.from({ length: k }, () => X[j]);
          const yk = Array.from({ length: k }, () => y[j]);
          if (models[m].partialFit) models[m].partialFit!(Xk, yk);
          else models[m].fit(Xk, yk);
          const preds = models[m].predict([X[j]]);
          const correct = preds[0] === y[j];
          if (correct) {
            lambdas[m] *= (1 + 0.5);
            lambda *= (1 + 0.5);
          } else {
            lambda = 1;
          }
        }
      }
    }
    const ensemble: Ensemble = {
      id: `online-boosting-${++this._counter}-${Date.now().toString(36)}`,
      models: models.map((m, i) => ({ id: m.id, kind: 'classifier', weight: lambdas[i] })),
      method: 'boosting',
      weights: lambdas,
    };
    this._ensembles.push(ensemble);
    this._history.push({ method: 'online_boosting', nModels: n, score: 0, timestamp: Date.now() });
    return ensemble;
  }

  toPacket(): DataPacket<{ ensembles: Ensemble[]; history: EnsembleRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['machine_learning', 'EnsembleMethods'],
      priority: 1,
      phase: 'ensemble_methods',
    };
    return {
      id: `ensemble-methods-${Date.now().toString(36)}`,
      payload: { ensembles: this._ensembles, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._ensembles = [];
    this._history = [];
    this._counter = 0;
  }

  get ensembleCount(): number { return this._ensembles.length; }
  get historyCount(): number { return this._history.length; }

  private _vote(models: BaseModel[], X: number[][], voting: VotingStrategy): number[] {
    if (voting === 'hard') {
      const allPreds = models.map(m => m.predict(X));
      return this.maxVoting(allPreds);
    }
    return this.averaging(models.map(m => m.predict(X)));
  }

  private _weightedAverage(models: BaseModel[], X: number[][], weights: number[]): number[] {
    const allPreds = models.map(m => m.predict(X));
    return this.weightedAverage(allPreds, weights);
  }

  private _bootstrap(X: number[][], y: number[], maxSamples: number): { Xs: number[][]; ys: number[] } {
    const n = Math.floor(X.length * maxSamples);
    const Xs: number[][] = [];
    const ys: number[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * X.length);
      Xs.push(X[idx]);
      ys.push(y[idx]);
    }
    return { Xs, ys };
  }

  private _cloneModel(model: BaseModel, i: number): BaseModel {
    const id = `${model.id}-clone-${i}`;
    return {
      id,
      fit: (X: number[][], y: number[]) => model.fit(X, y),
      predict: (X: number[][]) => model.predict(X),
    };
  }

  private _buildMetaFeatures(models: BaseModel[], X: number[][]): number[][] {
    const allPreds = models.map(m => m.predict(X));
    return X.map((_, i) => allPreds.map(preds => preds[i]));
  }

  private _accuracy(yTrue: number[], yPred: number[]): number {
    if (yTrue.length === 0) return 0;
    const correct = yTrue.reduce((s, t, i) => s + (t === yPred[i] ? 1 : 0), 0);
    return correct / yTrue.length;
  }

  private _mse(yTrue: number[], yPred: number[]): number {
    return yTrue.reduce((s, t, i) => s + Math.pow(t - yPred[i], 2), 0) / Math.max(1, yTrue.length);
  }

  private _mean(v: number[]): number {
    return v.length === 0 ? 0 : v.reduce((s, x) => s + x, 0) / v.length;
  }

  private _variance(v: number[]): number {
    if (v.length === 0) return 0;
    const m = this._mean(v);
    return v.reduce((s, x) => s + Math.pow(x - m, 2), 0) / v.length;
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

  private _softmax(logits: number[]): number[] {
    const maxL = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxL));
    const sum = exps.reduce((s, v) => s + v, 0) || 1;
    return exps.map(e => e / sum);
  }

  private _shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private _partition<T>(arr: T[], k: number): T[][] {
    if (k <= 0) return [arr];
    const shuffled = this._shuffle(arr);
    const size = Math.ceil(shuffled.length / k);
    const groups: T[][] = [];
    for (let i = 0; i < k; i++) {
      groups.push(shuffled.slice(i * size, (i + 1) * size));
    }
    return groups.filter(g => g.length > 0);
  }

  private _covariance(X: number[][]): number[][] {
    const n = X.length;
    if (n === 0) return [];
    const dim = X[0].length;
    const means = new Array(dim).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < dim; j++) means[j] += X[i][j] / n;
    const cov: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < dim; a++) {
        for (let b = 0; b < dim; b++) {
          cov[a][b] += (X[i][a] - means[a]) * (X[i][b] - means[b]) / Math.max(1, n - 1);
        }
      }
    }
    return cov;
  }

  private _eigenDecompose(A: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
    const n = A.length;
    if (n === 0) return { eigenvalues: [], eigenvectors: [] };
    const eigenvalues = [...A[0]];
    const eigenvectors: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0),
    );
    for (let iter = 0; iter < 50; iter++) {
      let maxOff = 0, p = 0, q = 1;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(A[i][j]) > maxOff) { maxOff = Math.abs(A[i][j]); p = i; q = j; }
        }
      }
      if (maxOff < 1e-10) break;
      const app = A[p][p], aqq = A[q][q], apq = A[p][q];
      const theta = Math.atan2(2 * apq, aqq - app) / 2;
      const c = Math.cos(theta), s = Math.sin(theta);
      for (let i = 0; i < n; i++) {
        const tmp = A[i][p];
        A[i][p] = c * tmp + s * A[i][q];
        A[i][q] = -s * tmp + c * A[i][q];
      }
      for (let i = 0; i < n; i++) {
        const tmp = A[p][i];
        A[p][i] = c * tmp + s * A[q][i];
        A[q][i] = -s * tmp + c * A[q][i];
      }
      for (let i = 0; i < n; i++) {
        const tmp = eigenvectors[i][p];
        eigenvectors[i][p] = c * tmp + s * eigenvectors[i][q];
        eigenvectors[i][q] = -s * tmp + c * eigenvectors[i][q];
      }
      eigenvalues[p] = A[p][p];
      eigenvalues[q] = A[q][q];
    }
    return { eigenvalues, eigenvectors };
  }

  private _hammingDistance(a: number[], b: number[]): number {
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d;
  }

  private _poisson(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }

  private _solveSoftMargin(margins: number[][], u: number[], nu: number): number {
    const T = margins.length;
    const N = u.length;
    let alpha = 1 / T;
    for (let it = 0; it < 20; it++) {
      let grad = 0, hess = 0;
      for (let t = 0; t < T; t++) {
        let z = 0;
        for (let i = 0; i < N; i++) z += alpha * margins[t][i] * u[i];
        const expZ = Math.exp(z);
        grad += expZ / (1 + expZ);
        hess += expZ / Math.pow(1 + expZ, 2);
      }
      grad -= T * nu;
      if (Math.abs(grad) < 1e-6) break;
      const step = grad / (hess + 1e-12);
      alpha -= step;
      if (alpha < 0) alpha = 0;
    }
    return alpha;
  }
}
