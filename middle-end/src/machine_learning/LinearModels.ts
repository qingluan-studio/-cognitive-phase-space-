import { DataPacket, PacketMeta } from '../shared/types';

/** Trained linear model with weights, bias and quality indicators. */
export interface Model {
  id: string;
  weights: number[];
  bias: number;
  loss: number;
  accuracy: number;
  kind: LinearModelKind;
  createdAt: number;
}

/** Supported linear model kinds. */
export type LinearModelKind =
  | 'linear'
  | 'logistic'
  | 'ridge'
  | 'lasso'
  | 'elastic'
  | 'perceptron'
  | 'sgd';

/** Supervised training data: feature matrix X and labels y. */
export interface TrainingData {
  X: number[][];
  y: number[];
  samples: number;
  features: number;
}

/** Gradient descent hyper-parameters. */
export interface GradientDescent {
  lr: number;
  iterations: number;
  batch: number;
  tolerance: number;
}

/** Cost function identifier. */
export type CostType = 'mse' | 'logloss' | 'hinge' | 'huber';

/** Internal training record. */
interface TrainingRecord {
  modelId: string;
  epoch: number;
  loss: number;
  weights: number[];
  timestamp: number;
}

export class LinearModels {
  private _models: Map<string, Model> = new Map();
  private _trainingData: TrainingData | null = null;
  private _gradients: number[] = [];
  private _history: TrainingRecord[] = [];
  private _counter = 0;

  linearRegression(X: number[][], y: number[]): Model {
    return this._fitClosedForm('linear', X, y);
  }

  logisticRegression(X: number[][], y: number[], classes: number = 2): Model {
    const model = this._initModel('logistic', X, y);
    const gd: GradientDescent = { lr: 0.01, iterations: 200, batch: 32, tolerance: 1e-4 };
    this._gradientDescentFit(model, X, y, gd, 'logloss');
    model.accuracy = this._classificationAccuracy(model, X, y, classes);
    this._models.set(model.id, model);
    return model;
  }

  ridgeRegression(X: number[][], y: number[], alpha: number): Model {
    const model = this._initModel('ridge', X, y);
    const n = X.length;
    const d = X[0]?.length ?? 0;
    const XtX = this._matrixMultiply(this._transpose(X), X);
    const reg = alpha * Math.max(1, n);
    for (let i = 0; i < d; i++) XtX[i][i] += reg;
    const XtY = this._matVec(this._transpose(X), y);
    const w = this._solveLinear(XtX, XtY);
    model.weights = w;
    model.bias = this._mean(y) - this._dot(w, this._columnMeans(X));
    model.loss = this._mse(X, y, w, model.bias) + alpha * this._dot(w, w);
    this._models.set(model.id, model);
    return model;
  }

  lassoRegression(X: number[][], y: number[], alpha: number): Model {
    const model = this._initModel('lasso', X, y);
    const gd: GradientDescent = { lr: 0.005, iterations: 500, batch: 32, tolerance: 1e-4 };
    this._gradientDescentFit(model, X, y, gd, 'mse');
    this._softThreshold(model.weights, alpha * 0.01);
    model.loss = this._mse(X, y, model.weights, model.bias) + alpha * model.weights.reduce((s, v) => s + Math.abs(v), 0);
    this._models.set(model.id, model);
    return model;
  }

  elasticNet(X: number[][], y: number[], alpha: number, l1Ratio: number): Model {
    const model = this._initModel('elastic', X, y);
    const gd: GradientDescent = { lr: 0.005, iterations: 500, batch: 32, tolerance: 1e-4 };
    this._gradientDescentFit(model, X, y, gd, 'mse');
    const l1 = alpha * l1Ratio;
    const l2 = alpha * (1 - l1Ratio);
    this._softThreshold(model.weights, l1 * 0.01);
    const penalty = l1 * model.weights.reduce((s, v) => s + Math.abs(v), 0) + l2 * this._dot(model.weights, model.weights);
    model.loss = this._mse(X, y, model.weights, model.bias) + penalty;
    this._models.set(model.id, model);
    return model;
  }

  perceptron(X: number[][], y: number[], lr: number = 0.01, epochs: number = 100): Model {
    const model = this._initModel('perceptron', X, y);
    for (let e = 0; e < epochs; e++) {
      for (let i = 0; i < X.length; i++) {
        const pred = this._sign(this._dot(model.weights, X[i]) + model.bias);
        const err = y[i] - pred;
        if (err !== 0) {
          for (let j = 0; j < model.weights.length; j++) model.weights[j] += lr * err * X[i][j];
          model.bias += lr * err;
        }
      }
    }
    model.loss = this._hingeLoss(X, y, model.weights, model.bias);
    model.accuracy = this._classificationAccuracy(model, X, y, 2);
    this._models.set(model.id, model);
    return model;
  }

  sgd(X: number[][], y: number[], loss: CostType = 'mse', lr: number = 0.01, epochs: number = 100, batchSize: number = 32): Model {
    const model = this._initModel('sgd', X, y);
    const gd: GradientDescent = { lr, iterations: epochs, batch: batchSize, tolerance: 1e-4 };
    this._gradientDescentFit(model, X, y, gd, loss);
    model.accuracy = loss === 'mse' ? this._r2Score(X, y, model) : this._classificationAccuracy(model, X, y, 2);
    this._models.set(model.id, model);
    return model;
  }

  fit(model: Model, X: number[][], y: number[], params: Partial<GradientDescent> = {}): Model {
    const gd: GradientDescent = { lr: params.lr ?? 0.01, iterations: params.iterations ?? 200, batch: params.batch ?? 32, tolerance: params.tolerance ?? 1e-4 };
    this._gradientDescentFit(model, X, y, gd, 'mse');
    model.loss = this._mse(X, y, model.weights, model.bias);
    this._trainingData = { X, y, samples: X.length, features: X[0]?.length ?? 0 };
    return model;
  }

  predict(model: Model, X: number[][]): number[] {
    return X.map(row => {
      const z = this._dot(model.weights, row) + model.bias;
      return model.kind === 'logistic' || model.kind === 'perceptron' ? this._sign(z) : z;
    });
  }

  score(model: Model, X: number[][], y: number[]): number {
    const preds = this.predict(model, X);
    const ssTot = y.reduce((s, v) => s + Math.pow(v - this._mean(y), 2), 0);
    const ssRes = y.reduce((s, v, i) => s + Math.pow(v - preds[i], 2), 0);
    return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  }

  crossValidate(model: Model, X: number[][], y: number[], k: number = 5): { mean: number; std: number; folds: number[] } {
    const folds: number[] = [];
    const foldSize = Math.floor(X.length / k);
    for (let i = 0; i < k; i++) {
      const start = i * foldSize;
      const end = start + foldSize;
      const Xval = X.slice(start, end);
      const yval = y.slice(start, end);
      const Xtrain = [...X.slice(0, start), ...X.slice(end)];
      const ytrain = [...y.slice(0, start), ...y.slice(end)];
      const clone: Model = { ...model, weights: [...model.weights], id: `cv-${i}-${model.id}` };
      this.fit(clone, Xtrain, ytrain);
      folds.push(this.score(clone, Xval, yval));
    }
    const mean = folds.reduce((s, v) => s + v, 0) / folds.length;
    const variance = folds.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / folds.length;
    return { mean, std: Math.sqrt(variance), folds };
  }

  costFunction(X: number[][], y: number[], weights: number[], type: CostType): number {
    const bias = 0;
    switch (type) {
      case 'mse': return this._mse(X, y, weights, bias);
      case 'logloss': return this._logLoss(X, y, weights, bias);
      case 'hinge': return this._hingeLoss(X, y, weights, bias);
      case 'huber': return this._huberLoss(X, y, weights, bias, 1.0);
    }
  }

  gradient(X: number[][], y: number[], weights: number[], type: CostType): number[] {
    const n = X.length;
    const d = weights.length;
    const grad = new Array(d).fill(0);
    for (let i = 0; i < n; i++) {
      const z = this._dot(weights, X[i]);
      let err = 0;
      if (type === 'mse') err = z - y[i];
      else if (type === 'logloss') err = this._sigmoid(z) - y[i];
      else if (type === 'hinge') err = y[i] * z < 1 ? -y[i] : 0;
      else err = Math.tanh(z - y[i]);
      for (let j = 0; j < d; j++) grad[j] += err * X[i][j];
    }
    return grad.map(g => g / n);
  }

  normalEquation(X: number[][], y: number[]): number[] {
    const Xt = this._transpose(X);
    const XtX = this._matrixMultiply(Xt, X);
    const XtY = this._matVec(Xt, y);
    return this._solveLinear(XtX, XtY);
  }

  toPacket(): DataPacket<{
    models: Map<string, Model>;
    trainingData: TrainingData | null;
    gradients: number[];
    history: TrainingRecord[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['machine_learning', 'LinearModels'],
      priority: 1,
      phase: 'linear_models',
    };
    return {
      id: `linear-models-${Date.now().toString(36)}`,
      payload: {
        models: this._models,
        trainingData: this._trainingData,
        gradients: this._gradients,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._models = new Map();
    this._trainingData = null;
    this._gradients = [];
    this._history = [];
    this._counter = 0;
  }

  get modelCount(): number { return this._models.size; }
  get historyCount(): number { return this._history.length; }
  get gradientNorm(): number { return Math.sqrt(this._gradients.reduce((s, g) => s + g * g, 0)); }

  private _fitClosedForm(kind: LinearModelKind, X: number[][], y: number[]): Model {
    const model = this._initModel(kind, X, y);
    const Xt = this._transpose(X);
    const XtX = this._matrixMultiply(Xt, X);
    const XtY = this._matVec(Xt, y);
    const w = this._solveLinear(XtX, XtY);
    model.weights = w;
    model.bias = this._mean(y) - this._dot(w, this._columnMeans(X));
    model.loss = this._mse(X, y, w, model.bias);
    model.accuracy = this._r2Score(X, y, model);
    this._models.set(model.id, model);
    this._trainingData = { X, y, samples: X.length, features: X[0]?.length ?? 0 };
    return model;
  }

  private _initModel(kind: LinearModelKind, X: number[][], y: number[]): Model {
    const features = X[0]?.length ?? 0;
    return {
      id: `${kind}-${++this._counter}-${Date.now().toString(36)}`,
      weights: new Array(features).fill(0),
      bias: 0,
      loss: Infinity,
      accuracy: 0,
      kind,
      createdAt: Date.now(),
    };
  }

  private _gradientDescentFit(model: Model, X: number[][], y: number[], gd: GradientDescent, cost: CostType): void {
    for (let iter = 0; iter < gd.iterations; iter++) {
      for (let b = 0; b < X.length; b += gd.batch) {
        const Xb = X.slice(b, b + gd.batch);
        const yb = y.slice(b, b + gd.batch);
        const grad = this.gradient(Xb, yb, model.weights, cost);
        for (let j = 0; j < model.weights.length; j++) model.weights[j] -= gd.lr * grad[j];
        model.bias -= gd.lr * grad.reduce((s, g) => s + g, 0) / Math.max(1, grad.length);
        this._gradients = grad;
      }
      const loss = this.costFunction(X, y, model.weights, cost);
      this._history.push({ modelId: model.id, epoch: iter, loss, weights: [...model.weights], timestamp: Date.now() });
      if (loss < gd.tolerance) break;
    }
    model.loss = this.costFunction(X, y, model.weights, cost);
  }

  private _mse(X: number[][], y: number[], w: number[], b: number): number {
    const n = X.length;
    if (n === 0) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const pred = this._dot(w, X[i]) + b;
      sum += Math.pow(pred - y[i], 2);
    }
    return sum / n;
  }

  private _logLoss(X: number[][], y: number[], w: number[], b: number): number {
    const n = X.length;
    if (n === 0) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const p = this._sigmoid(this._dot(w, X[i]) + b);
      sum += -y[i] * Math.log(p + 1e-12) - (1 - y[i]) * Math.log(1 - p + 1e-12);
    }
    return sum / n;
  }

  private _hingeLoss(X: number[][], y: number[], w: number[], b: number): number {
    const n = X.length;
    if (n === 0) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const m = 1 - y[i] * (this._dot(w, X[i]) + b);
      sum += Math.max(0, m);
    }
    return sum / n;
  }

  private _huberLoss(X: number[][], y: number[], w: number[], b: number, delta: number): number {
    const n = X.length;
    if (n === 0) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const r = this._dot(w, X[i]) + b - y[i];
      sum += Math.abs(r) <= delta ? 0.5 * r * r : delta * (Math.abs(r) - 0.5 * delta);
    }
    return sum / n;
  }

  private _r2Score(X: number[][], y: number[], model: Model): number {
    const preds = this.predict(model, X);
    const ssTot = y.reduce((s, v) => s + Math.pow(v - this._mean(y), 2), 0);
    const ssRes = y.reduce((s, v, i) => s + Math.pow(v - preds[i], 2), 0);
    return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  }

  private _classificationAccuracy(model: Model, X: number[][], y: number[], _classes: number): number {
    const preds = this.predict(model, X);
    if (preds.length === 0) return 0;
    const correct = preds.reduce((s, p, i) => s + (p === y[i] ? 1 : 0), 0);
    return correct / preds.length;
  }

  private _softThreshold(w: number[], lambda: number): void {
    for (let i = 0; i < w.length; i++) {
      if (w[i] > lambda) w[i] -= lambda;
      else if (w[i] < -lambda) w[i] += lambda;
      else w[i] = 0;
    }
  }

  private _sigmoid(x: number): number { return 1 / (1 + Math.exp(-x)); }
  private _sign(x: number): number { return x >= 0 ? 1 : 0; }
  private _mean(v: number[]): number { return v.length === 0 ? 0 : v.reduce((s, x) => s + x, 0) / v.length; }
  private _dot(a: number[], b: number[]): number { return a.reduce((s, x, i) => s + x * b[i], 0); }

  private _transpose(m: number[][]): number[][] {
    const r = m.length, c = m[0]?.length ?? 0;
    const t: number[][] = Array.from({ length: c }, () => new Array(r).fill(0));
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) t[j][i] = m[i][j];
    return t;
  }

  private _matrixMultiply(a: number[][], b: number[][]): number[][] {
    const n = a.length, k = b.length, m = b[0]?.length ?? 0;
    const out: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      let s = 0;
      for (let p = 0; p < k; p++) s += a[i][p] * b[p][j];
      out[i][j] = s;
    }
    return out;
  }

  private _matVec(m: number[][], v: number[]): number[] {
    return m.map(row => this._dot(row, v));
  }

  private _columnMeans(X: number[][]): number[] {
    const d = X[0]?.length ?? 0;
    const means = new Array(d).fill(0);
    for (const row of X) for (let j = 0; j < d; j++) means[j] += row[j];
    return means.map(v => v / Math.max(1, X.length));
  }

  private _solveLinear(A: number[][], b: number[]): number[] {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
      [M[i], M[pivot]] = [M[pivot], M[i]];
      if (Math.abs(M[i][i]) < 1e-12) continue;
      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const f = M[r][i] / M[i][i];
        for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
      }
    }
    return M.map((row, i) => Math.abs(M[i][i]) < 1e-12 ? 0 : row[n] / M[i][i]);
  }
}
