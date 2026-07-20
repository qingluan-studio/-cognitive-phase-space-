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

  // ---------------------------------------------------------------------------
  // Robust & generalized linear models
  // ---------------------------------------------------------------------------

  /** Huber regression with iterative reweighted least squares. */
  huberRegression(X: number[][], y: number[], delta: number = 1.35, maxIter: number = 50): Model {
    const model = this._initModel('linear', X, y);
    const n = X.length;
    const weights = new Array(n).fill(1);
    for (let iter = 0; iter < maxIter; iter++) {
      const Xt = this._transpose(X);
      const WtX = Xt.map(row => row.map((v, i) => v * weights[i]));
      const XtWX = this._matrixMultiply(WtX, X);
      const XtWy = WtX.map(row => row.reduce((s, v, i) => s + v * y[i], 0));
      const w = this._solveLinear(XtWX, XtWy);
      model.weights = w;
      model.bias = this._mean(y) - this._dot(w, this._columnMeans(X));
      const residuals = X.map((row, i) => y[i] - this._dot(w, row) - model.bias);
      const med = this._median(residuals.map(Math.abs));
      const mad = med === 0 ? 1 : med;
      let changed = false;
      for (let i = 0; i < n; i++) {
        const r = Math.abs(residuals[i]) / Math.max(1, delta * mad);
        const newW = r > 1 ? delta * mad / Math.max(1e-9, Math.abs(residuals[i])) : 1;
        if (Math.abs(newW - weights[i]) > 1e-6) changed = true;
        weights[i] = newW;
      }
      if (!changed) break;
    }
    model.loss = this._huberLoss(X, y, model.weights, model.bias, delta);
    model.accuracy = this._r2Score(X, y, model);
    this._models.set(model.id, model);
    return model;
  }

  /** Quantile regression via interior point (simplified). */
  quantileRegression(X: number[][], y: number[], tau: number = 0.5, alpha: number = 0.01, epochs: number = 300): Model {
    const model = this._initModel('linear', X, y);
    for (let iter = 0; iter < epochs; iter++) {
      const grad = new Array(model.weights.length).fill(0);
      let gradB = 0;
      for (let i = 0; i < X.length; i++) {
        const r = y[i] - this._dot(model.weights, X[i]) - model.bias;
        const sign = r >= 0 ? tau : tau - 1;
        for (let j = 0; j < model.weights.length; j++) grad[j] -= sign * X[i][j];
        gradB -= sign;
      }
      for (let j = 0; j < model.weights.length; j++) model.weights[j] -= alpha * grad[j] / X.length;
      model.bias -= alpha * gradB / X.length;
    }
    let pinball = 0;
    for (let i = 0; i < X.length; i++) {
      const r = y[i] - this._dot(model.weights, X[i]) - model.bias;
      pinball += r >= 0 ? tau * r : (tau - 1) * r;
    }
    model.loss = pinball / Math.max(1, X.length);
    model.accuracy = this._r2Score(X, y, model);
    this._models.set(model.id, model);
    return model;
  }

  /** Weighted least squares. */
  weightedLeastSquares(X: number[][], y: number[], weights: number[]): Model {
    const model = this._initModel('linear', X, y);
    const Xt = this._transpose(X);
    const WtX = Xt.map(row => row.map((v, i) => v * weights[i]));
    const XtWX = this._matrixMultiply(WtX, X);
    const XtWy = WtX.map(row => row.reduce((s, v, i) => s + v * y[i], 0));
    const w = this._solveLinear(XtWX, XtWy);
    model.weights = w;
    model.bias = this._mean(y) - this._dot(w, this._columnMeans(X));
    model.loss = this._mse(X, y, w, model.bias);
    model.accuracy = this._r2Score(X, y, model);
    this._models.set(model.id, model);
    return model;
  }

  /** Generalized linear model with canonical link. */
  glm(X: number[][], y: number[], family: 'poisson' | 'gamma' | 'binomial', maxIter: number = 100): Model {
    const model = this._initModel('logistic', X, y);
    const link = (mu: number) => family === 'binomial' ? Math.log(mu / (1 - mu + 1e-12) + 1e-12) : Math.log(mu + 1e-12);
    const invLink = (eta: number) => family === 'binomial' ? 1 / (1 + Math.exp(-eta)) : Math.exp(eta);
    for (let iter = 0; iter < maxIter; iter++) {
      const eta = X.map(row => this._dot(model.weights, row) + model.bias);
      const mu = eta.map(invLink);
      const gradMu = eta.map((_, i) => family === 'binomial' ? mu[i] * (1 - mu[i]) : mu[i]);
      const workingY = eta.map((e, i) => e + (y[i] - mu[i]) / Math.max(1e-9, gradMu[i]));
      const w = gradMu.map(g => Math.max(1e-9, g));
      const Xt = this._transpose(X);
      const WtX = Xt.map(row => row.map((v, i) => v * w[i]));
      const XtWX = this._matrixMultiply(WtX, X);
      const XtWy = WtX.map(row => row.reduce((s, v, i) => s + v * workingY[i], 0));
      const sol = this._solveLinear(XtWX, XtWy);
      const oldW = [...model.weights];
      model.weights = sol;
      model.bias = this._mean(workingY) - this._dot(sol, this._columnMeans(X));
      let conv = 0;
      for (let j = 0; j < model.weights.length; j++) conv += Math.abs(model.weights[j] - oldW[j]);
      if (conv < 1e-6) break;
    }
    void link;
    let dev = 0;
    for (let i = 0; i < X.length; i++) {
      const mu = invLink(this._dot(model.weights, X[i]) + model.bias);
      dev += family === 'poisson' ? 2 * (y[i] * Math.log(y[i] / Math.max(1e-12, mu)) - (y[i] - mu))
        : family === 'gamma' ? -2 * (Math.log(y[i] / Math.max(1e-12, mu)) - (y[i] - mu) / Math.max(1e-12, mu))
          : -2 * (y[i] * Math.log(Math.max(1e-12, mu)) + (1 - y[i]) * Math.log(Math.max(1e-12, 1 - mu)));
    }
    model.loss = dev;
    model.accuracy = this._r2Score(X, y, model);
    this._models.set(model.id, model);
    return model;
  }

  /** Bayesian linear regression with Gaussian prior. */
  bayesianLinearRegression(X: number[][], y: number[], alpha: number = 1, beta: number = 1): {
    model: Model;
    posteriorMean: number[];
    posteriorCov: number[][];
    logMarginal: number;
  } {
    const d = X[0]?.length ?? 0;
    const Xt = this._transpose(X);
    const XtX = this._matrixMultiply(Xt, X);
    const A = XtX.map((row, i) => row.map((v, j) => v + (i === j ? alpha / beta : 0)));
    const invA = this._matrixInverse(A);
    const XtY = this._matVec(Xt, y);
    const mean = this._matVec(invA, XtY);
    const model = this._initModel('ridge', X, y);
    model.weights = mean;
    model.bias = this._mean(y) - this._dot(mean, this._columnMeans(X));
    model.loss = this._mse(X, y, mean, model.bias);
    model.accuracy = this._r2Score(X, y, model);
    const n = X.length;
    const residualSq = y.reduce((s, v, i) => s + Math.pow(v - this._dot(mean, X[i]) - model.bias, 2), 0);
    const logMarginal = -0.5 * (n * Math.log(2 * Math.PI / beta) + beta * residualSq + alpha * this._dot(mean, mean) + Math.log(this._det(A)));
    this._models.set(model.id, model);
    return { model, posteriorMean: mean, posteriorCov: invA.map(row => row.map(v => v / beta)), logMarginal };
  }

  /** Theil–Sen estimator (median of pairwise slopes). */
  theilSenRegression(X: number[][], y: number[]): Model {
    const model = this._initModel('linear', X, y);
    const slopes: number[] = [];
    const x1d = X.map(row => row[0] ?? 0);
    for (let i = 0; i < X.length; i++) {
      for (let j = i + 1; j < X.length; j++) {
        const dx = x1d[j] - x1d[i];
        if (Math.abs(dx) > 1e-9) slopes.push((y[j] - y[i]) / dx);
      }
    }
    slopes.sort((a, b) => a - b);
    const slope = slopes.length > 0 ? slopes[Math.floor(slopes.length / 2)] : 0;
    const intercepts = y.map((v, i) => v - slope * x1d[i]).sort((a, b) => a - b);
    model.weights = [slope];
    model.bias = intercepts.length > 0 ? intercepts[Math.floor(intercepts.length / 2)] : 0;
    model.loss = this._mse(X, y, model.weights, model.bias);
    model.accuracy = this._r2Score(X, y, model);
    this._models.set(model.id, model);
    return model;
  }

  /** RANSAC robust regression. */
  ransac(X: number[][], y: number[], threshold: number = 1.5, maxIter: number = 100, sampleSize: number = 2): Model {
    const model = this._initModel('linear', X, y);
    let bestInliers: number[] = [];
    for (let iter = 0; iter < maxIter; iter++) {
      const indices: number[] = [];
      while (indices.length < sampleSize) {
        const idx = Math.floor(Math.random() * X.length);
        if (!indices.includes(idx)) indices.push(idx);
      }
      const Xs = indices.map(i => X[i]);
      const ys = indices.map(i => y[i]);
      const tmpModel = this._fitClosedForm('linear', Xs, ys);
      const inliers: number[] = [];
      for (let i = 0; i < X.length; i++) {
        const r = Math.abs(y[i] - this._dot(tmpModel.weights, X[i]) - tmpModel.bias);
        if (r < threshold) inliers.push(i);
      }
      if (inliers.length > bestInliers.length) bestInliers = inliers;
    }
    if (bestInliers.length >= 2) {
      const Xr = bestInliers.map(i => X[i]);
      const yr = bestInliers.map(i => y[i]);
      const fit = this._fitClosedForm('linear', Xr, yr);
      model.weights = fit.weights;
      model.bias = fit.bias;
    }
    model.loss = this._mse(X, y, model.weights, model.bias);
    model.accuracy = this._r2Score(X, y, model);
    this._models.set(model.id, model);
    return model;
  }

  // ---------------------------------------------------------------------------
  // Advanced optimizers
  // ---------------------------------------------------------------------------

  /** Coordinate descent for L1-regularized loss. */
  coordinateDescent(X: number[][], y: number[], lambda: number, iterations: number = 100): number[] {
    const n = X.length;
    const d = X[0]?.length ?? 0;
    const w = new Array(d).fill(0);
    const residuals = [...y];
    for (let iter = 0; iter < iterations; iter++) {
      for (let j = 0; j < d; j++) {
        let partial = 0;
        for (let i = 0; i < n; i++) partial += residuals[i] + w[j] * X[i][j] * X[i][j] - X[i][j] * (this._dot(w, X[i]) + residuals[i] - y[i]);
        const rho = partial / n;
        w[j] = rho > lambda ? rho - lambda : rho < -lambda ? rho + lambda : 0;
        for (let i = 0; i < n; i++) residuals[i] = y[i] - this._dot(w, X[i]);
      }
    }
    return w;
  }

  /** Adam optimizer training step. */
  adam(model: Model, X: number[][], y: number[], cost: CostType, lr: number = 0.01, beta1: number = 0.9, beta2: number = 0.999, eps: number = 1e-8, iterations: number = 100): Model {
    const d = model.weights.length;
    const m = new Array(d).fill(0);
    const v = new Array(d).fill(0);
    let mb = 0, vb = 0;
    for (let t = 1; t <= iterations; t++) {
      const grad = this.gradient(X, y, model.weights, cost);
      const gradB = grad.reduce((s, g) => s + g, 0) / Math.max(1, grad.length);
      for (let j = 0; j < d; j++) {
        m[j] = beta1 * m[j] + (1 - beta1) * grad[j];
        v[j] = beta2 * v[j] + (1 - beta2) * grad[j] * grad[j];
        const mh = m[j] / (1 - Math.pow(beta1, t));
        const vh = v[j] / (1 - Math.pow(beta2, t));
        model.weights[j] -= lr * mh / (Math.sqrt(vh) + eps);
      }
      mb = beta1 * mb + (1 - beta1) * gradB;
      vb = beta2 * vb + (1 - beta2) * gradB * gradB;
      const mbh = mb / (1 - Math.pow(beta1, t));
      const vbh = vb / (1 - Math.pow(beta2, t));
      model.bias -= lr * mbh / (Math.sqrt(vbh) + eps);
    }
    model.loss = this.costFunction(X, y, model.weights, cost);
    return model;
  }

  /** RMSProp optimizer training step. */
  rmsprop(model: Model, X: number[][], y: number[], cost: CostType, lr: number = 0.01, decay: number = 0.9, eps: number = 1e-8, iterations: number = 100): Model {
    const d = model.weights.length;
    const sq = new Array(d).fill(0);
    let sqB = 0;
    for (let t = 0; t < iterations; t++) {
      const grad = this.gradient(X, y, model.weights, cost);
      const gradB = grad.reduce((s, g) => s + g, 0) / Math.max(1, grad.length);
      for (let j = 0; j < d; j++) {
        sq[j] = decay * sq[j] + (1 - decay) * grad[j] * grad[j];
        model.weights[j] -= lr * grad[j] / (Math.sqrt(sq[j]) + eps);
      }
      sqB = decay * sqB + (1 - decay) * gradB * gradB;
      model.bias -= lr * gradB / (Math.sqrt(sqB) + eps);
    }
    model.loss = this.costFunction(X, y, model.weights, cost);
    return model;
  }

  /** Momentum / Nesterov accelerated gradient. */
  momentum(model: Model, X: number[][], y: number[], cost: CostType, lr: number = 0.01, gamma: number = 0.9, nesterov: boolean = false, iterations: number = 100): Model {
    const d = model.weights.length;
    const v = new Array(d).fill(0);
    let vb = 0;
    for (let t = 0; t < iterations; t++) {
      const lookAhead = nesterov ? v.map(x => gamma * x) : v;
      const tmpW = model.weights.map((w, j) => w - (nesterov ? lookAhead[j] : 0));
      const grad = this.gradient(X, y, tmpW, cost);
      const gradB = grad.reduce((s, g) => s + g, 0) / Math.max(1, grad.length);
      for (let j = 0; j < d; j++) {
        v[j] = gamma * v[j] + lr * grad[j];
        model.weights[j] -= v[j];
      }
      vb = gamma * vb + lr * gradB;
      model.bias -= vb;
    }
    model.loss = this.costFunction(X, y, model.weights, cost);
    return model;
  }

  /** Adagrad optimizer. */
  adagrad(model: Model, X: number[][], y: number[], cost: CostType, lr: number = 0.1, eps: number = 1e-8, iterations: number = 100): Model {
    const d = model.weights.length;
    const sq = new Array(d).fill(0);
    let sqB = 0;
    for (let t = 0; t < iterations; t++) {
      const grad = this.gradient(X, y, model.weights, cost);
      const gradB = grad.reduce((s, g) => s + g, 0) / Math.max(1, grad.length);
      for (let j = 0; j < d; j++) {
        sq[j] += grad[j] * grad[j];
        model.weights[j] -= lr * grad[j] / (Math.sqrt(sq[j]) + eps);
      }
      sqB += gradB * gradB;
      model.bias -= lr * gradB / (Math.sqrt(sqB) + eps);
    }
    model.loss = this.costFunction(X, y, model.weights, cost);
    return model;
  }

  /** L-BFGS quasi-Newton optimizer (simplified, m=5). */
  lbfgs(model: Model, X: number[][], y: number[], cost: CostType, iterations: number = 50): Model {
    const d = model.weights.length;
    const history: { s: number[]; y: number[]; rho: number }[] = [];
    let prevGrad = this.gradient(X, y, model.weights, cost);
    for (let iter = 0; iter < iterations; iter++) {
      const q = [...prevGrad];
      const alphas = new Array(history.length).fill(0);
      for (let i = history.length - 1; i >= 0; i--) {
        alphas[i] = history[i].rho * this._dot(history[i].s, q);
        for (let j = 0; j < d; j++) q[j] -= alphas[i] * history[i].y[j];
      }
      const gamma = history.length > 0
        ? this._dot(history[history.length - 1].y, history[history.length - 1].s) / Math.max(1e-12, this._dot(history[history.length - 1].y, history[history.length - 1].y))
        : 1;
      for (let j = 0; j < d; j++) q[j] *= gamma;
      for (let i = 0; i < history.length; i++) {
        const beta = history[i].rho * this._dot(history[i].y, q);
        for (let j = 0; j < d; j++) q[j] += (alphas[i] - beta) * history[i].s[j];
      }
      const lr = 0.01;
      const oldW = [...model.weights];
      for (let j = 0; j < d; j++) model.weights[j] -= lr * q[j];
      const newGrad = this.gradient(X, y, model.weights, cost);
      const s = model.weights.map((w, j) => w - oldW[j]);
      const yv = newGrad.map((g, j) => g - prevGrad[j]);
      const sy = this._dot(s, yv);
      if (Math.abs(sy) > 1e-12) {
        history.push({ s, y: yv, rho: 1 / sy });
        if (history.length > 5) history.shift();
      }
      prevGrad = newGrad;
    }
    model.loss = this.costFunction(X, y, model.weights, cost);
    return model;
  }

  // ---------------------------------------------------------------------------
  // Online learning algorithms
  // ---------------------------------------------------------------------------

  /** Passive-Aggressive (PA-I) online classifier. */
  passiveAggressive(model: Model, x: number[], y: number, C: number = 1): Model {
    const loss = Math.max(0, 1 - y * (this._dot(model.weights, x) + model.bias));
    if (loss === 0) return model;
    const tau = Math.min(C, loss / (this._dot(x, x) + 1));
    for (let j = 0; j < model.weights.length; j++) model.weights[j] += tau * y * x[j];
    model.bias += tau * y;
    return model;
  }

  /** Confidence-Weighted (CW) online learner (simplified). */
  confidenceWeighted(model: Model, x: number[], y: number, phi: number = 0.5): Model {
    const margin = y * (this._dot(model.weights, x) + model.bias);
    const v = 0.25 * this._dot(x, x);
    if (margin >= phi * Math.sqrt(v)) return model;
    const alpha = (1 / (2 * v)) * Math.max(0, 1 - phi * Math.sqrt(v) - margin);
    for (let j = 0; j < model.weights.length; j++) model.weights[j] += alpha * y * x[j];
    model.bias += alpha * y;
    return model;
  }

  /** AROW (Adaptive Regularization of Weight vectors). */
  arow(model: Model, sigma: number[], x: number[], y: number, r: number = 1): { model: Model; sigma: number[] } {
    const margin = y * (this._dot(model.weights, x) + model.bias);
    const beta = 1 / (this._dot(x.map((v, i) => v * sigma[i]), x) + r);
    const loss = Math.max(0, 1 - margin);
    if (loss === 0) return { model, sigma };
    const alpha = loss * beta;
    for (let j = 0; j < model.weights.length; j++) {
      model.weights[j] += alpha * y * sigma[j] * x[j];
      sigma[j] = 1 / (1 / sigma[j] + 2 * r * x[j] * x[j]);
    }
    model.bias += alpha * y;
    return { model, sigma };
  }

  /** Perceptron with decay. */
  averagedPerceptron(X: number[][], y: number[], epochs: number = 10, lr: number = 1): Model {
    const model = this._initModel('perceptron', X, y);
    const cached = new Array(model.weights.length).fill(0);
    let cachedB = 0;
    let count = 1;
    for (let e = 0; e < epochs; e++) {
      for (let i = 0; i < X.length; i++) {
        const pred = this._sign(this._dot(model.weights, X[i]) + model.bias);
        if (pred !== y[i]) {
          for (let j = 0; j < model.weights.length; j++) {
            model.weights[j] += lr * y[i] * X[i][j];
            cached[j] += count * lr * y[i] * X[i][j];
          }
          model.bias += lr * y[i];
          cachedB += count * lr * y[i];
        }
        count++;
      }
    }
    for (let j = 0; j < model.weights.length; j++) model.weights[j] -= cached[j] / count;
    model.bias -= cachedB / count;
    model.loss = this._hingeLoss(X, y, model.weights, model.bias);
    model.accuracy = this._classificationAccuracy(model, X, y, 2);
    this._models.set(model.id, model);
    return model;
  }

  // ---------------------------------------------------------------------------
  // Feature engineering helpers
  // ---------------------------------------------------------------------------

  /** Generate polynomial features up to specified degree. */
  polynomialFeatures(X: number[][], degree: number = 2, includeBias: boolean = true): number[][] {
    const out: number[][] = [];
    for (const row of X) {
      const feats: number[] = includeBias ? [1] : [];
      for (let d = 1; d <= degree; d++) {
        for (let i = 0; i < row.length; i++) feats.push(Math.pow(row[i], d));
      }
      out.push(feats);
    }
    return out;
  }

  /** Generate interaction features only. */
  interactionFeatures(X: number[][]): number[][] {
    const out: number[][] = [];
    for (const row of X) {
      const feats: number[] = [...row];
      for (let i = 0; i < row.length; i++) {
        for (let j = i + 1; j < row.length; j++) feats.push(row[i] * row[j]);
      }
      out.push(feats);
    }
    return out;
  }

  /** Standardize features to zero mean and unit variance. */
  standardize(X: number[][]): { scaled: number[][]; mean: number[]; std: number[] } {
    const d = X[0]?.length ?? 0;
    const mean = this._columnMeans(X);
    const std = new Array(d).fill(0);
    for (const row of X) for (let j = 0; j < d; j++) std[j] += Math.pow(row[j] - mean[j], 2);
    for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j] / Math.max(1, X.length)) || 1;
    const scaled = X.map(row => row.map((v, j) => (v - mean[j]) / std[j]));
    return { scaled, mean, std };
  }

  /** Min-max scale features to [0, 1] range. */
  minMaxScale(X: number[][]): { scaled: number[][]; min: number[]; max: number[] } {
    const d = X[0]?.length ?? 0;
    const min = new Array(d).fill(Infinity);
    const max = new Array(d).fill(-Infinity);
    for (const row of X) for (let j = 0; j < d; j++) {
      if (row[j] < min[j]) min[j] = row[j];
      if (row[j] > max[j]) max[j] = row[j];
    }
    const scaled = X.map(row => row.map((v, j) => max[j] === min[j] ? 0 : (v - min[j]) / (max[j] - min[j])));
    return { scaled, min, max };
  }

  /** Robust scaling using median and IQR. */
  robustScale(X: number[][]): { scaled: number[][]; median: number[]; iqr: number[] } {
    const d = X[0]?.length ?? 0;
    const median: number[] = [];
    const iqr: number[] = [];
    for (let j = 0; j < d; j++) {
      const col = X.map(row => row[j]).sort((a, b) => a - b);
      median.push(col.length > 0 ? col[Math.floor(col.length / 2)] : 0);
      const q1 = col.length > 0 ? col[Math.floor(col.length / 4)] : 0;
      const q3 = col.length > 0 ? col[Math.floor(3 * col.length / 4)] : 0;
      iqr.push(Math.max(1e-9, q3 - q1));
    }
    const scaled = X.map(row => row.map((v, j) => (v - median[j]) / iqr[j]));
    return { scaled, median, iqr };
  }

  /** Apply power transform (Box-Cox, Yeo-Johnson simplified). */
  powerTransform(X: number[][], lambda: number = 0): number[][] {
    if (lambda === 0) return X.map(row => row.map(v => v > 0 ? Math.log(v) : 0));
    return X.map(row => row.map(v => v > 0 ? (Math.pow(v, lambda) - 1) / lambda : 0));
  }

  // ---------------------------------------------------------------------------
  // Learning rate schedulers
  // ---------------------------------------------------------------------------

  /** Step learning rate scheduler. */
  stepDecay(initialLr: number, epoch: number, drop: number = 0.5, every: number = 10): number {
    return initialLr * Math.pow(drop, Math.floor(epoch / every));
  }

  /** Exponential learning rate scheduler. */
  exponentialDecay(initialLr: number, epoch: number, decayRate: number = 0.95): number {
    return initialLr * Math.pow(decayRate, epoch);
  }

  /** Cosine annealing scheduler. */
  cosineAnnealing(initialLr: number, epoch: number, maxEpochs: number, minLr: number = 0): number {
    return minLr + 0.5 * (initialLr - minLr) * (1 + Math.cos(Math.PI * epoch / Math.max(1, maxEpochs)));
  }

  /** Warmup + decay scheduler. */
  warmupDecay(initialLr: number, epoch: number, warmupSteps: number, maxEpochs: number): number {
    if (epoch < warmupSteps) return initialLr * epoch / Math.max(1, warmupSteps);
    return initialLr * (1 - (epoch - warmupSteps) / Math.max(1, maxEpochs - warmupSteps));
  }

  // ---------------------------------------------------------------------------
  // Regularization paths & feature selection
  // ---------------------------------------------------------------------------

  /** LARS (Least Angle Regression) path. */
  larsPath(X: number[][], y: number[], maxSteps: number = 10): { coefs: number[][]; steps: number } {
    const n = X.length;
    const d = X[0]?.length ?? 0;
    let residual = [...y];
    const active = new Set<number>();
    const coefs: number[][] = [new Array(d).fill(0)];
    for (let step = 0; step < maxSteps; step++) {
      const correlations = this._transpose(X).map(col => this._dot(col, residual) / n);
      let bestIdx = -1;
      let bestAbs = 0;
      for (let j = 0; j < d; j++) {
        if (active.has(j)) continue;
        if (Math.abs(correlations[j]) > bestAbs) {
          bestAbs = Math.abs(correlations[j]);
          bestIdx = j;
        }
      }
      if (bestIdx < 0) break;
      active.add(bestIdx);
      const sign = correlations[bestIdx] >= 0 ? 1 : -1;
      const gamma = 0.1;
      const coef = [...coefs[coefs.length - 1]];
      coef[bestIdx] += gamma * sign;
      coefs.push(coef);
      for (let i = 0; i < n; i++) residual[i] -= gamma * sign * X[i][bestIdx];
    }
    return { coefs, steps: coefs.length };
  }

  /** Orthogonal Matching Pursuit (OMP). */
  omp(X: number[][], y: number[], k: number = 5): number[] {
    const n = X.length;
    const d = X[0]?.length ?? 0;
    const selected: number[] = [];
    const w = new Array(d).fill(0);
    let residual = [...y];
    for (let step = 0; step < k; step++) {
      let bestIdx = -1, bestCorr = 0;
      for (let j = 0; j < d; j++) {
        if (selected.includes(j)) continue;
        const corr = Math.abs(this._dot(X.map(row => row[j]), residual));
        if (corr > bestCorr) {
          bestCorr = corr;
          bestIdx = j;
        }
      }
      if (bestIdx < 0) break;
      selected.push(bestIdx);
      const Xs = X.map(row => selected.map(idx => row[idx]));
      const Xst = this._transpose(Xs);
      const sol = this._solveLinear(this._matrixMultiply(Xst, Xs), this._matVec(Xst, y));
      for (let i = 0; i < selected.length; i++) w[selected[i]] = sol[i];
      for (let i = 0; i < n; i++) residual[i] = y[i] - this._dot(w, X[i]);
    }
    return w;
  }

  /** Recursive Feature Elimination (RFE). */
  rfe(X: number[][], y: number[], k: number = 5): { selected: number[]; coefs: number[] } {
    const d = X[0]?.length ?? 0;
    const remaining = Array.from({ length: d }, (_, i) => i);
    const coefs = new Array(d).fill(0);
    while (remaining.length > k) {
      const Xs = X.map(row => remaining.map(idx => row[idx]));
      const fit = this._fitClosedForm('linear', Xs, y);
      let worstIdx = 0;
      let worstAbs = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        if (Math.abs(fit.weights[i]) < worstAbs) {
          worstAbs = Math.abs(fit.weights[i]);
          worstIdx = i;
        }
      }
      remaining.splice(worstIdx, 1);
    }
    const Xs = X.map(row => remaining.map(idx => row[idx]));
    const fit = this._fitClosedForm('linear', Xs, y);
    for (let i = 0; i < remaining.length; i++) coefs[remaining[i]] = fit.weights[i];
    return { selected: remaining, coefs };
  }

  /** Forward stepwise selection. */
  forwardSelection(X: number[][], y: number[], maxFeatures: number = 5): { selected: number[]; scores: number[] } {
    const d = X[0]?.length ?? 0;
    const selected: number[] = [];
    const scores: number[] = [];
    while (selected.length < Math.min(maxFeatures, d)) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      for (let j = 0; j < d; j++) {
        if (selected.includes(j)) continue;
        const trial = [...selected, j];
        const Xs = X.map(row => trial.map(idx => row[idx]));
        const fit = this._fitClosedForm('linear', Xs, y);
        const score = this._r2Score(Xs, y, fit);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = j;
        }
      }
      if (bestIdx < 0) break;
      selected.push(bestIdx);
      scores.push(bestScore);
    }
    return { selected, scores };
  }

  /** Variance Inflation Factor (VIF) for multicollinearity detection. */
  varianceInflationFactor(X: number[][]): number[] {
    const d = X[0]?.length ?? 0;
    const vifs: number[] = [];
    for (let j = 0; j < d; j++) {
      const other = X.map(row => row.filter((_, k) => k !== j));
      const target = X.map(row => row[j]);
      const fit = this._fitClosedForm('linear', other, target);
      const r2 = this._r2Score(other, target, fit);
      vifs.push(r2 >= 1 ? Infinity : 1 / (1 - r2));
    }
    return vifs;
  }

  // ---------------------------------------------------------------------------
  // Model diagnostics
  // ---------------------------------------------------------------------------

  /** Akaike Information Criterion (AIC). */
  aic(model: Model, X: number[][], y: number[][]): number {
    const n = X.length;
    const k = model.weights.length + 1;
    return n * Math.log(Math.max(1e-12, model.loss)) + 2 * k;
  }

  /** Bayesian Information Criterion (BIC). */
  bic(model: Model, X: number[][], y: number[][]): number {
    const n = X.length;
    const k = model.weights.length + 1;
    return n * Math.log(Math.max(1e-12, model.loss)) + k * Math.log(n);
  }

  /** Cook's distance for outlier detection. */
  cooksDistance(model: Model, X: number[][], y: number[]): number[] {
    const n = X.length;
    const d = model.weights.length;
    const preds = this.predict(model, X);
    const residuals = y.map((v, i) => v - preds[i]);
    const mse = model.loss;
    const distances: number[] = [];
    for (let i = 0; i < n; i++) {
      const Xred = X.filter((_, k) => k !== i);
      const yred = y.filter((_, k) => k !== i);
      const fit = this._fitClosedForm('linear', Xred, yred);
      const predWithout = X[i] ? this._dot(fit.weights, X[i]) + fit.bias : 0;
      const dist = Math.pow(predWithout - preds[i], 2) / Math.max(1e-12, (d + 1) * mse);
      distances.push(dist);
    }
    return distances;
  }

  /** Leverage (hat values) for each observation. */
  leverage(X: number[][]): number[] {
    const Xt = this._transpose(X);
    const XtX = this._matrixMultiply(Xt, X);
    const inv = this._matrixInverse(XtX);
    const leverages: number[] = [];
    for (let i = 0; i < X.length; i++) {
      const x = X[i];
      let lev = 0;
      for (let j = 0; j < x.length; j++) {
        for (let k = 0; k < x.length; k++) lev += x[j] * inv[j][k] * x[k];
      }
      leverages.push(lev);
    }
    return leverages;
  }

  /** Durbin-Watson statistic for autocorrelation. */
  durbinWatson(residuals: number[]): number {
    let num = 0;
    for (let i = 1; i < residuals.length; i++) num += Math.pow(residuals[i] - residuals[i - 1], 2);
    let den = 0;
    for (const r of residuals) den += r * r;
    return den === 0 ? 0 : num / den;
  }

  /** Breusch-Pagan test for heteroscedasticity. */
  breuschPagan(model: Model, X: number[][], y: number[]): { lm: number; p: number } {
    const preds = this.predict(model, X);
    const residuals = y.map((v, i) => v - preds[i]);
    const sq = residuals.map(r => r * r);
    const fit = this._fitClosedForm('linear', X, sq);
    const r2 = this._r2Score(X, sq, fit);
    const n = X.length;
    const lm = n * r2;
    const p = Math.exp(-lm / 2);
    return { lm, p };
  }

  /** Confidence interval for prediction. */
  predictionInterval(model: Model, x: number[], X: number[][], y: number[], alpha: number = 0.05): { lower: number; upper: number } {
    const preds = this.predict(model, X);
    const residuals = y.map((v, i) => v - preds[i]);
    const sigma2 = residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length - model.weights.length - 1);
    const sigma = Math.sqrt(sigma2);
    const Xt = this._transpose(X);
    const XtX = this._matrixMultiply(Xt, X);
    const inv = this._matrixInverse(XtX);
    let lev = 0;
    for (let j = 0; j < x.length; j++) for (let k = 0; k < x.length; k++) lev += x[j] * inv[j][k] * x[k];
    const tCrit = 1.96;
    const pred = this._dot(model.weights, x) + model.bias;
    const margin = tCrit * sigma * Math.sqrt(1 + lev);
    return { lower: pred - margin, upper: pred + margin };
  }

  /** Shapiro-Wilk style normality test (simplified). */
  normalityTest(samples: number[]): { statistic: number; isNormal: boolean } {
    const n = samples.length;
    if (n < 3) return { statistic: 1, isNormal: true };
    const sorted = [...samples].sort((a, b) => a - b);
    const mean = this._mean(sorted);
    const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const skew = sorted.reduce((s, v) => s + ((v - mean) / Math.sqrt(variance + 1e-12)) ** 3, 0) / n;
    const kurt = sorted.reduce((s, v) => s + ((v - mean) / Math.sqrt(variance + 1e-12)) ** 4, 0) / n - 3;
    const statistic = Math.abs(skew) + Math.abs(kurt) / 2;
    return { statistic, isNormal: statistic < 1 };
  }

  /** Mean Absolute Error. */
  mae(yTrue: number[], yPred: number[]): number {
    return yTrue.reduce((s, y, i) => s + Math.abs(y - yPred[i]), 0) / Math.max(1, yTrue.length);
  }

  /** Root Mean Squared Error. */
  rmse(yTrue: number[], yPred: number[]): number {
    return Math.sqrt(yTrue.reduce((s, y, i) => s + Math.pow(y - yPred[i], 2), 0) / Math.max(1, yTrue.length));
  }

  /** Mean Absolute Percentage Error. */
  mape(yTrue: number[], yPred: number[]): number {
    return yTrue.reduce((s, y, i) => s + Math.abs((y - yPred[i]) / Math.max(1e-9, y)), 0) / Math.max(1, yTrue.length) * 100;
  }

  /** R² (coefficient of determination). */
  r2(yTrue: number[], yPred: number[]): number {
    const mean = this._mean(yTrue);
    const ssTot = yTrue.reduce((s, y) => s + (y - mean) ** 2, 0);
    const ssRes = yTrue.reduce((s, y, i) => s + (y - yPred[i]) ** 2, 0);
    return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  }

  /** Adjusted R². */
  adjustedR2(r2: number, n: number, p: number): number {
    if (n - p - 1 === 0) return r2;
    return 1 - (1 - r2) * (n - 1) / (n - p - 1);
  }

  /** Predict probability (for logistic models). */
  predictProba(model: Model, X: number[][]): number[] {
    return X.map(row => this._sigmoid(this._dot(model.weights, row) + model.bias));
  }

  /** Log-likelihood of a fitted model. */
  logLikelihood(model: Model, X: number[][], y: number[]): number {
    if (model.kind === 'logistic') {
      const probs = this.predictProba(model, X);
      return y.reduce((s, y, i) => s + (y * Math.log(probs[i] + 1e-12) + (1 - y) * Math.log(1 - probs[i] + 1e-12)), 0);
    }
    const sigma2 = model.loss;
    const n = X.length;
    return -n / 2 * Math.log(2 * Math.PI * Math.max(1e-12, sigma2)) - y.reduce((s, y, i) => s + Math.pow(y - this._dot(model.weights, X[i]) - model.bias, 2), 0) / (2 * Math.max(1e-12, sigma2));
  }

  /** Get a model by id. */
  getModel(id: string): Model | undefined {
    return this._models.get(id);
  }

  /** List all trained models. */
  listModels(): Model[] {
    return Array.from(this._models.values());
  }

  /** Get training history. */
  getHistory(): TrainingRecord[] {
    return [...this._history];
  }

  /** Clear training history. */
  clearHistory(): void {
    this._history = [];
  }

  private _median(v: number[]): number {
    if (v.length === 0) return 0;
    const s = [...v].sort((a, b) => a - b);
    return s.length % 2 === 0 ? (s[s.length / 2 - 1] + s[s.length / 2]) / 2 : s[Math.floor(s.length / 2)];
  }

  private _matrixInverse(A: number[][]): number[][] {
    const n = A.length;
    const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
      [M[i], M[pivot]] = [M[pivot], M[i]];
      if (Math.abs(M[i][i]) < 1e-12) continue;
      const f = M[i][i];
      for (let c = 0; c < 2 * n; c++) M[i][c] /= f;
      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const factor = M[r][i];
        for (let c = 0; c < 2 * n; c++) M[r][c] -= factor * M[i][c];
      }
    }
    return M.map(row => row.slice(n));
  }

  private _det(A: number[][]): number {
    const n = A.length;
    const M = A.map(row => [...row]);
    let det = 1;
    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
      if (pivot !== i) { [M[i], M[pivot]] = [M[pivot], M[i]]; det = -det; }
      if (Math.abs(M[i][i]) < 1e-12) return 0;
      det *= M[i][i];
      for (let r = i + 1; r < n; r++) {
        const f = M[r][i] / M[i][i];
        for (let c = i; c < n; c++) M[r][c] -= f * M[i][c];
      }
    }
    return det;
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
