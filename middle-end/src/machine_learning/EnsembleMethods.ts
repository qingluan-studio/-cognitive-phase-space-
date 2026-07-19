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
}
